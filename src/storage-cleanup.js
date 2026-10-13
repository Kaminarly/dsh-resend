/** Preview-bound deletion of known private rollback files. */
import { randomUUID } from 'node:crypto'
import { lstatSync, readFileSync, readdirSync, unlinkSync } from 'node:fs'
import path from 'node:path'
import { digest } from './file-snapshots.js'
import { safePrivatePath } from './private-storage.js'
import { hostService, logWarning, describeError } from './host.js'
import { readCoveringLog } from './log-read.js'
import { hasMarkerPrefix } from './marker.js'

const fail = code => ({ ok: false, error: { code } })
const refPattern = /^(cas:[a-f0-9]{64}|git:[a-f0-9]{40,64})$/
export const filesInRecord = record => Array.isArray(record) ? record : record?.files

export function createStorageCleanup(ctx, storage) {
  const { home } = storage
  const plans = new Map()
  ctx.effect(() => () => plans.clear())
  function list(directory) {
    try {
      const target = safePrivatePath(home, directory)
      if (!lstatSync(target).isDirectory()) throw new Error('unsafe-storage')
      return readdirSync(target)
    } catch (error) { if (error.code === 'ENOENT') return []; throw error }
  }
  function item(relative, kind, ref) {
    const target = safePrivatePath(home, relative)
    const stat = lstatSync(target)
    if (!stat.isFile() || stat.nlink !== 1) throw new Error('unsafe-storage')
    const bytes = readFileSync(target)
    return { relative, kind, ref, bytes: bytes.length, fingerprint: digest(bytes),
      identity: `${stat.dev}:${stat.ino}:${stat.birthtimeMs}:${stat.mtimeMs}` }
  }
  function refs(entry) {
    const record = JSON.parse(readFileSync(safePrivatePath(home, entry.relative), 'utf8'))
    const files = filesInRecord(record)
    if (!Array.isArray(files)) throw new Error('invalid-record')
    const found = new Set()
    for (const file of files) {
      if (!file || typeof file.path !== 'string') throw new Error('invalid-record')
      if (file.reason !== undefined) {
        if (typeof file.reason !== 'string') throw new Error('invalid-record')
        // Unexpected content references are still dependencies.
      } else if (!Object.hasOwn(file, 'before') || !Object.hasOwn(file, 'after')) throw new Error('invalid-record')
      for (const key of ['before', 'after']) {
        const ref = file[key]
        if (ref === null || (ref === undefined && file.reason !== undefined)) continue
        if (typeof ref !== 'string' || !refPattern.test(ref)) throw new Error('invalid-record')
        found.add(ref)
      }
    }
    return { record, found }
  }

  async function scan() {
    safePrivatePath(home)
    const query = hostService(ctx, 'sessionQuery')
    const corpus = await query.listSessions()
    if (!Array.isArray(corpus) || corpus.some(entry => typeof entry?.header?.id !== 'string')) throw new Error('scan-failed')
    const sessions = new Map(corpus.map(({ header }) => [header.id, {
      sessionId: header.id, title: header.id, projectPath: header.cwd ?? '', records: 0, bytes: 0, noSnapshots: true,
    }]))
    const owners = new Map()
    let readable = 0
    let unreadable = 0
    for (const { header } of corpus) {
      const read = await readCoveringLog(ctx, header.id)
      if (read.status !== 'ok' || read.log.some((event, index) => event.seq !== index)) { unreadable++; continue }
      readable++
      for (const event of read.log) {
        if (event.type === 'session/title' && typeof event.data?.title === 'string') sessions.get(header.id).title = event.data.title || header.id
        if (event.type === 'user/message' && hasMarkerPrefix(event.data?.id) && event.surfaceOp?.op === 'replace') {
          owners.set(digest(JSON.stringify([header.id, event.data.id])), header.id)
        }
      }
    }
    if (corpus.length > 0 && readable === 0) throw new Error('scan-failed')
    const entries = []
    for (const directory of ['records', 'outcomes', 'observations']) for (const name of list(directory)) {
      if (/^[a-f0-9]{64}\.json$/.test(name)) {
        const entry = item(`${directory}/${name}`, directory === 'observations' ? 'records' : directory)
        if (directory !== 'observations') entry.sessionId = owners.get(name.slice(0, 64))
        if (entry.kind === 'records') {
          try {
            const { record, found } = refs(entry)
            // New records carry their identity, including empty manifests and
            // the short interval before their carrier is appended to the log.
            if (!Array.isArray(record) && sessions.has(record.sessionId) && typeof record.carrierId === 'string' &&
                digest(JSON.stringify([record.sessionId, record.carrierId])) === name.slice(0, 64)) entry.sessionId = record.sessionId
            if (directory === 'observations' && record.kind === 'file-observation' && record.version === 1 &&
                sessions.has(record.sessionId) && typeof record.callId === 'string' &&
                digest(JSON.stringify([record.sessionId, record.callId])) === name.slice(0, 64)) entry.sessionId = record.sessionId
            entry.refs = found
          } catch { entry.refs = null }
        }
        entries.push(entry)
      } else if (/^[a-f0-9]{64}\.json\.[a-f0-9-]{36}\.pending$/.test(name)) entries.push(item(`${directory}/${name}`, 'temporary'))
    }
    // An outcome has the same identity as its manifest, including new-format
    // records whose log cannot currently be read.
    const recordOwners = new Map(entries.filter(e => e.relative.startsWith('records/')).map(e => [path.basename(e.relative), e.sessionId]))
    for (const entry of entries) if (entry.kind === 'outcomes') entry.sessionId ??= recordOwners.get(path.basename(entry.relative))
    for (const name of list('objects')) if (/^[a-f0-9]{64}$/.test(name)) entries.push(item(`objects/${name}`, 'objects', `cas:${name}`))
    for (const prefix of list('objects.git/objects')) {
      if (!/^[a-f0-9]{2}$/.test(prefix)) continue
      for (const suffix of list(`objects.git/objects/${prefix}`)) if (/^[a-f0-9]{38}$/.test(suffix) || /^[a-f0-9]{62}$/.test(suffix)) {
        entries.push(item(`objects.git/objects/${prefix}/${suffix}`, 'objects', `git:${prefix}${suffix}`))
      }
    }
    for (const session of sessions.values()) {
      const owned = entries.filter(e => e.sessionId === session.sessionId)
      session.records = owned.filter(e => e.kind === 'records').length
      const referenced = new Set(owned.flatMap(e => [...(e.refs ?? [])]))
      session.noSnapshots = referenced.size === 0 && owned.every(e => e.kind !== 'records' || e.refs !== null)
      session.bytes = owned.reduce((sum, e) => sum + e.bytes, 0) + entries.filter(e => referenced.has(e.ref)).reduce((sum, e) => sum + e.bytes, 0)
    }
    return { entries, sessions: [...sessions.values()].filter(s => entries.some(e => e.sessionId === s.sessionId)), unreadable }
  }

  function candidates(scan, mode, ids) {
    const selected = new Set(ids)
    const metadata = scan.entries.filter(e => ['records', 'outcomes'].includes(e.kind) &&
      (mode === 'residue' ? e.sessionId === undefined : selected.has(e.sessionId)))
    const removed = new Set(metadata.map(e => e.relative))
    const retained = scan.entries.filter(e => e.kind === 'records' && !removed.has(e.relative))
    const protectedObjects = retained.some(e => e.refs === null)
    const references = new Set(retained.flatMap(e => [...(e.refs ?? [])]))
    // Session cleanup only collects contents referenced by selected records;
    // it cannot silently grow into a residue cleanup.
    const selectedRefs = new Set(metadata.flatMap(e => [...(e.refs ?? [])]))
    return { protectedObjects, entries: [...metadata, ...scan.entries.filter(e =>
      (e.kind === 'objects' && !protectedObjects && !references.has(e.ref) && (mode === 'residue' || selectedRefs.has(e.ref))) ||
      (mode === 'residue' && e.kind === 'temporary'))] }
  }
  const categories = entries => ['records', 'outcomes', 'objects', 'temporary'].map(kind => ({ kind,
    count: entries.filter(e => e.kind === kind).length, bytes: entries.filter(e => e.kind === kind).reduce((sum, e) => sum + e.bytes, 0),
  }))

  async function handle(request) {
    if (!request || !['list', 'preview', 'execute', 'cancel'].includes(request.phase) || !['residue', 'sessions'].includes(request.mode)) return fail('bad-request')
    if (request.phase === 'cancel') { plans.delete(request.planId); return { ok: true, value: { phase: 'cancel' } } }
    if (request.phase === 'execute') {
      const plan = plans.get(request.planId)
      if (!plan || plan.mode !== request.mode || Date.now() - plan.created > 15 * 60_000) return fail('plan-not-found')
      plans.delete(request.planId)
      const current = await scan()
      const results = []
      const eligible = []
      const skipped = new Set()
      for (const session of plan.sessions) {
        const reason = storage.busy(session.sessionId)
        if (reason) { skipped.add(session.sessionId); results.push({ sessionId: session.sessionId, title: session.title, status: 'skipped', reason, bytes: 0 }) }
        else eligible.push(session.sessionId)
      }
      const fresh = candidates(current, plan.mode, eligible)
      const allowed = new Map(fresh.entries.map(e => [e.relative, e]))
      const confirmed = plan.entries.filter(e => allowed.get(e.relative)?.fingerprint === e.fingerprint && allowed.get(e.relative)?.identity === e.identity)
      // A changed or added manifest in a selected session requires a fresh
      // preview; no half-cleared session is presented as fully cleaned.
      const changed = new Set()
      for (const id of eligible) {
        const before = plan.entries.filter(e => e.sessionId === id)
        const now = current.entries.filter(e => e.sessionId === id)
        if (before.length !== now.length || before.some(e => !confirmed.includes(e))) changed.add(id)
      }
      for (const id of changed) results.push({ sessionId: id, title: plan.sessions.find(s => s.sessionId === id).title, status: 'skipped', reason: 'preview-stale', bytes: 0 })
      const deleting = confirmed.filter(e => !changed.has(e.sessionId))
      let released = 0
      const failures = []
      const deletedRecords = new Set()
      const failedSessions = new Set()
      const invalidated = new Set()
      const noteFailure = entry => {
        failures.push({ item: entry.relative, reason: 'delete-failed' })
        if (entry.sessionId) failedSessions.add(entry.sessionId)
        if (entry.ref) for (const record of plan.entries) {
          if (record.sessionId && record.refs?.has(entry.ref)) failedSessions.add(record.sessionId)
        }
      }
      // Manifests first. If their removal fails, all their content dependencies
      // stay protected and their completion results must remain intact.
      for (const entry of deleting.filter(e => e.kind === 'records')) {
        if (skipped.has(entry.sessionId)) continue
        const reason = entry.sessionId && storage.busy(entry.sessionId)
        if (reason) {
          skipped.add(entry.sessionId)
          failedSessions.add(entry.sessionId)
          results.push({ sessionId: entry.sessionId, title: plan.sessions.find(s => s.sessionId === entry.sessionId)?.title ?? entry.sessionId, status: 'skipped', reason, bytes: 0 })
          continue
        }
        try {
          if (entry.sessionId && !invalidated.has(entry.sessionId)) { storage.invalidate(entry.sessionId); invalidated.add(entry.sessionId) }
          unlinkSync(safePrivatePath(home, entry.relative)); released += entry.bytes; deletedRecords.add(entry.relative)
        } catch { noteFailure(entry) }
      }
      const remaining = current.entries.filter(e => e.kind === 'records' && !deletedRecords.has(e.relative))
      const protectAll = remaining.some(e => e.refs === null)
      const keepRefs = new Set(remaining.flatMap(e => [...(e.refs ?? [])]))
      for (const entry of deleting.filter(e => e.kind !== 'records')) {
        if (entry.kind === 'outcomes' && (failedSessions.has(entry.sessionId) || remaining.some(e => path.basename(e.relative) === path.basename(entry.relative)))) continue
        if (entry.kind === 'objects' && (protectAll || keepRefs.has(entry.ref))) continue
        try {
          const reason = entry.sessionId && storage.busy(entry.sessionId)
          if (reason) {
            skipped.add(entry.sessionId)
            failedSessions.add(entry.sessionId)
            results.push({ sessionId: entry.sessionId, title: plan.sessions.find(s => s.sessionId === entry.sessionId)?.title ?? entry.sessionId,
              status: 'skipped', reason, bytes: 0 })
            continue
          }
          if (entry.sessionId && !invalidated.has(entry.sessionId)) { storage.invalidate(entry.sessionId); invalidated.add(entry.sessionId) }
          unlinkSync(safePrivatePath(home, entry.relative)); released += entry.bytes
        } catch { noteFailure(entry) }
      }
      for (const id of eligible.filter(id => !changed.has(id))) {
        if (results.some(r => r.sessionId === id && r.status === 'skipped')) continue
        results.push({ sessionId: id, title: plan.sessions.find(s => s.sessionId === id).title,
          status: failedSessions.has(id) ? 'failed' : 'cleaned', reason: failedSessions.has(id) ? 'delete-failed' : '', bytes: 0 })
      }
      return { ok: true, value: { phase: 'execute', releasedBytes: released, results, failures,
        changedCount: plan.entries.length - confirmed.length, protectedObjects: protectAll } }
    }
    const current = await scan()
    if (request.phase === 'list') return { ok: true, value: { phase: 'list', sessions: current.sessions, unreadableSessions: current.unreadable } }
    const ids = [...new Set(request.sessionIds ?? [])]
    if (request.mode === 'sessions' && (ids.length === 0 || ids.some(id => !current.sessions.some(s => s.sessionId === id)))) return fail('bad-request')
    const selection = candidates(current, request.mode, ids)
    const planId = randomUUID()
    const sessions = current.sessions.filter(s => ids.includes(s.sessionId))
    // Bound abandoned previews in long-lived hosts.
    for (const [id, plan] of plans) if (Date.now() - plan.created > 15 * 60_000) plans.delete(id)
    if (plans.size >= 32) plans.delete(plans.keys().next().value)
    plans.set(planId, { mode: request.mode, created: Date.now(), entries: selection.entries, sessions })
    return { ok: true, value: { phase: 'preview', planId, sessions, categories: categories(selection.entries),
      estimatedBytes: selection.entries.reduce((sum, e) => sum + e.bytes, 0), itemCount: selection.entries.length,
      protectedObjects: selection.protectedObjects, unreadableSessions: current.unreadable } }
  }
  return async request => {
    try { return await storage.exclusive(() => handle(request)) }
    catch (error) {
      logWarning(ctx, `storage cleanup failed: ${describeError(error)}`)
      return fail(['storage-busy', 'unsafe-storage'].includes(error.message) ? error.message : 'scan-failed')
    }
  }
}
