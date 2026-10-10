/** Private Phase 2 substrate. No service field or Remote method exposes records. */
import { randomUUID } from 'node:crypto'
import { lstat, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'
import { createSnapshotStore, digest } from './file-snapshots.js'
import { readCoveringLog, eventAtSeq } from './log-read.js'
import { describeError, hostService, logWarning } from './host.js'
import { hasMarkerPrefix } from './marker.js'

const refused = (code) => ({ ok: false, error: { code } })
const equal = (a, b) => a === null || b === null ? a === b : a.equals(b)
const normalizedText = (bytes, keepBom = false) => bytes === null ? null : new TextDecoder('utf-8', { fatal: true, ignoreBOM: keepBom }).decode(bytes).replaceAll('\r\n', '\n')

/** The legacy editor returns only a status; verify its deterministic change. */
function editorPostState(args, before) {
  if (args.command === 'create') return before === null ? args.file_text : undefined
  if (before === null) return undefined
  if (args.command === 'str_replace') {
    const old = args.old_str
    if (typeof old !== 'string' || old === '') return undefined
    const offset = before.indexOf(old)
    // The shipped editor counts non-overlapping matches and inserts literally.
    if (offset < 0 || before.indexOf(old, offset + old.length) >= 0) return undefined
    return before.slice(0, offset) + (args.new_str ?? '') + before.slice(offset + old.length)
  }
  if (args.command === 'insert') {
    const lines = before.split('\n')
    const index = args.insert_line
    if (!Number.isInteger(index) || index < 0 || index > lines.length || typeof args.new_str !== 'string') return undefined
    return [...lines.slice(0, index), ...args.new_str.split('\n'), ...lines.slice(index)].join('\n')
  }
}

/** Only known file mutations have a trustworthy declared path. */
function mutationPath(name, args) {
  if (name === 'write' || name === 'edit') return args?.file_path
  if (name === 'str_replace_editor' && ['create', 'str_replace', 'insert'].includes(args?.command)) return args.path
}

/** Refuse links and metadata paths, including links in parent directories. */
async function fileTarget(cwd, name) {
  if (typeof cwd !== 'string' || !path.isAbsolute(cwd) || typeof name !== 'string' || name === '') throw new Error('unsafe-path')
  const absolute = path.resolve(cwd, name)
  const relative = path.relative(cwd, absolute)
  const parts = relative.split(path.sep)
  if (relative === '' || relative.startsWith(`..${path.sep}`) || relative === '..' || path.isAbsolute(relative) || parts.some((part) => part.toLowerCase() === '.git')) throw new Error('unsafe-path')
  let current = path.parse(absolute).root
  for (const part of absolute.slice(current.length).split(path.sep)) {
    current = path.join(current, part)
    try {
      if ((await lstat(current)).isSymbolicLink()) throw new Error('unsafe-path')
    } catch (error) { if (error.code !== 'ENOENT') throw error }
  }
  return absolute
}

async function contents(cwd, name) {
  const absolute = await fileTarget(cwd, name)
  try {
    if (!(await lstat(absolute)).isFile()) throw new Error('not-regular-file')
    return await readFile(absolute)
  } catch (error) { if (error.code === 'ENOENT') return null; throw error }
}

export function createFileVersions(ctx) {
  const home = path.join(path.resolve(process.env.DSH_HOME?.trim() || path.join(homedir(), '.dsh')), 'plugins', 'dsh-resend')
  const snapshots = createSnapshotStore(home)
  // Observations are not versions: they stay private in memory until a rewind.
  const observations = new Map()
  const plans = new Map()
  const recordPath = (sessionId, id) => path.join(home, 'records', `${digest(JSON.stringify([sessionId, id]))}.json`)
  const observationKey = (sessionId, callId) => JSON.stringify([sessionId, callId])

  ctx.on('tools/execute', async (exec, next) => {
    const session = exec.agent?.session
    const name = mutationPath(exec.name, exec.arguments)
    if (session === undefined || name === undefined) return next()
    const cwd = session.header.cwd
    let before
    let reason
    let normalized = name
    try {
      normalized = path.relative(cwd, await fileTarget(cwd, name)).split(path.sep).join('/')
      before = await contents(cwd, normalized)
    } catch (error) { reason = error.message === 'unsafe-path' ? 'unsafe-path' : 'unreadable-file' }
    const result = await next()
    let after
    try {
      after = await contents(cwd, normalized)
      if (result.isError && reason === undefined && !equal(before, after)) reason = 'write-outcome-unavailable'
      if (!result.isError && reason === undefined) {
        const prior = normalizedText(before)
        const post = normalizedText(after, true)
        if (exec.name === 'str_replace_editor') {
          const rawPrior = before === null ? null : new TextDecoder('utf-8', { fatal: true }).decode(before)
          const expected = editorPostState(exec.arguments, rawPrior)
          if (typeof expected !== 'string' || post !== expected.replaceAll('\r\n', '\n')) reason = 'content-diverged'
        } else {
          const value = result.value
          if (!Object.hasOwn(value ?? {}, 'before') || typeof value.after !== 'string') reason = 'prior-state-unavailable'
          else if (prior !== value.before || post !== value.after.replaceAll('\r\n', '\n')) reason = 'content-diverged'
        }
      }
    } catch { reason ??= 'unreadable-file' }
    observations.set(observationKey(session.id, exec.callId), { path: normalized, before, after, reason })
    return result
  })
  ctx.on('session/disposed', (session) => {
    for (const key of observations.keys()) if (JSON.parse(key)[0] === session.id) observations.delete(key)
    for (const [key, plan] of plans) if (plan.sessionId === session.id) plans.delete(key)
  })
  ctx.effect(() => () => { observations.clear(); plans.clear() })

  async function prepare(session, plan, carrierId) {
    const covering = await readCoveringLog(ctx, session.id)
    if (covering.status !== 'ok') throw new Error(covering.detail)
    const files = new Map()
    const shadowed = new Set(plan.shadowedSeqs)
    const results = new Map(covering.log.filter((event) => event.type === 'tool/result').map((event) => [event.data.message.callId, event]))
    for (const seq of shadowed) if (eventAtSeq(covering.log, seq) === undefined) throw new Error(`file version read does not cover seq ${seq}`)
    for (const event of covering.log) {
      if (event.type !== 'tool/call' && event.type !== 'tool/ptc-dispatch') continue
      const callId = event.type === 'tool/call' ? event.data.callId : event.data.subCallId
      const rootCallId = event.type === 'tool/call' ? callId : event.data.rootCallId
      let args
      try { args = event.type === 'tool/call' ? JSON.parse(event.data.arguments) : event.data.arguments } catch { continue }
      const name = mutationPath(event.data.name, args)
      if (name === undefined) continue
      const result = results.get(rootCallId)
      // A call is log-only; its surface result identifies the live work being undone.
      if (result === undefined || !shadowed.has(result.seq)) continue
      const observed = observations.get(observationKey(session.id, callId))
      const change = observed ?? { path: name, reason: 'prior-state-unavailable' }
      // Failed calls with no mutations are not part of the file set.
      if (observed !== undefined && observed.reason === undefined && equal(observed.before, observed.after)) continue
      const previous = files.get(change.path)
      if (previous === undefined) files.set(change.path, { ...change })
      else {
        if (previous.reason === undefined && change.reason === undefined && !equal(previous.after, change.before)) previous.reason = 'diverged-between-writes'
        previous.reason ??= change.reason
        previous.after = change.after
      }
    }
    const backend = [...files.values()].some((file) => file.reason === undefined) ? await snapshots.backend(session.header.cwd) : 'cas'
    const records = []
    for (const file of files.values()) {
      if (file.reason !== undefined) records.push({ path: file.path, reason: file.reason })
      else records.push({ path: file.path, before: await snapshots.put(file.before, backend), after: await snapshots.put(file.after, backend) })
    }
    const target = recordPath(session.id, carrierId)
    await mkdir(path.dirname(target), { recursive: true })
    const staging = `${target}.${randomUUID()}.pending`
    await writeFile(staging, JSON.stringify(records), { flag: 'wx', mode: 0o600 })
    await rename(staging, target)
    return {
      async discardUnlessWritten() {
        const read = await readCoveringLog(ctx, session.id)
        if (read.status === 'ok' && !read.log.some((event) => event.type === 'user/message' && event.data.id === carrierId)) await unlink(target)
      },
    }
  }

  async function rollback(request) {
    const { sessionId, carrierSeq, phase, planId } = request
    if (typeof sessionId !== 'string' || sessionId === '' || !Number.isSafeInteger(carrierSeq) || carrierSeq < 0) return refused('bad-request')
    const session = hostService(ctx, 'sessions')?.get(sessionId)
    if (session === undefined) return refused('session-not-found')
    const agent = hostService(ctx, 'agents')?.get(sessionId)
    if (agent?.status !== 'idle') return refused('agent-busy')
    const covering = await readCoveringLog(ctx, sessionId)
    if (covering.status !== 'ok') return refused('internal')
    const carrier = eventAtSeq(covering.log, carrierSeq)
    if (carrier?.type !== 'user/message' || !hasMarkerPrefix(carrier.data?.id) || carrier.surfaceOp?.op !== 'replace') return refused('no-target-state')
    if (phase !== 'preview') {
      const plan = plans.get(planId)
      if (plan === undefined || plan.sessionId !== sessionId || plan.carrierSeq !== carrierSeq) return refused('plan-not-found')
      plans.delete(planId)
      if (phase === 'cancel') return { ok: true, value: plan.preview }
      if (phase !== 'execute') return refused('bad-request')
      // Revalidate the SAME plan, never silently calculate a new one.
      for (const file of plan.files) {
        if (file.action === 'refuse') continue
        try { if (!equal(await contents(session.header.cwd, file.path), file.after)) return refused('preview-stale') }
        catch { return refused('preview-stale') }
      }
      const processed = []
      for (const file of plan.files) {
        if (file.action === 'refuse') continue
        try {
          const absolute = await fileTarget(session.header.cwd, file.path)
          if (!equal(await contents(session.header.cwd, file.path), file.after)) throw new Error('content-diverged')
          if (file.before === null) await unlink(absolute)
          else await writeFile(absolute, file.before)
          processed.push(file.path)
        } catch (error) {
          const reason = error.message === 'content-diverged' || error.message === 'unsafe-path' ? error.message : 'restore-failed'
          return { ok: false, error: { code: 'execution-stopped', files: plan.files.map((entry) => processed.includes(entry.path)
            ? { path: entry.path, action: 'restored' }
            : { path: entry.path, action: 'refuse', reason: entry.reason ?? (entry.path === file.path ? reason : 'execution-stopped') }) } }
        }
      }
      return { ok: true, value: plan.preview }
    }
    let record
    try { record = JSON.parse(await readFile(recordPath(sessionId, carrier.data.id), 'utf8')) }
    catch (error) { if (error.code === 'ENOENT') return refused('no-target-state'); throw error }
    const files = []
    for (const file of record) {
      let reason = file.reason
      let before
      let after
      if (reason === undefined) {
        try {
          before = await snapshots.get(file.before)
          after = await snapshots.get(file.after)
          if (!equal(await contents(session.header.cwd, file.path), after)) reason = 'content-diverged'
        } catch (error) { reason = error.message === 'unsafe-path' ? 'unsafe-path' : 'snapshot-unavailable' }
      }
      files.push({ path: file.path, action: reason === undefined ? 'restore' : 'refuse', ...(reason === undefined ? { before, after } : { reason }) })
    }
    for (const [id, plan] of plans) if (plan.sessionId === sessionId && plan.carrierSeq === carrierSeq) plans.delete(id)
    const id = randomUUID()
    const preview = { planId: id, files: files.map(({ path, action, reason }) => ({ path, action, ...(reason === undefined ? {} : { reason }) })) }
    plans.set(id, { sessionId, carrierSeq, files, preview })
    return { ok: true, value: preview }
  }
  return {
    prepare,
    async rollback(request) {
      try { return await rollback(request) }
      catch (error) { logWarning(ctx, `file rollback failed: ${describeError(error)}`); return refused('internal') }
    },
  }
}
