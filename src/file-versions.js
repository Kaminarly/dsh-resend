/** Private Phase 2 substrate. No service field or Remote method exposes records. */
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createSnapshotStore, digest } from './file-snapshots.js'
import { readCoveringLog, eventAtSeq } from './log-read.js'
import { describeError, hostService, logWarning } from './host.js'
import { createPrivateStorage, safePrivatePath } from './private-storage.js'
import { createStorageCleanup } from './storage-cleanup.js'
import { contents, fileTarget, sameContents as equal } from './rollback-files.js'
import { createFileRollback } from './file-rollback.js'

const refused = (code) => ({ ok: false, error: { code } })
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

// Native results carry toolCallId/source.callId. callId is legacy-only.
function resultCallIds(event) {
  const message = event.data?.message
  return [...new Set([message?.toolCallId, message?.source?.callId, message?.callId]
    .filter(id => typeof id === 'string' && id !== ''))]
}

export function createFileVersions(ctx) {
  const storage = createPrivateStorage(ctx)
  const { home } = storage
  const snapshots = createSnapshotStore(home)
  // Observations are not versions: they stay private in memory until a rewind.
  const observations = new Map()
  const rollback = createFileRollback(ctx, { home, snapshots })
  const generations = new Map()
  const recordPath = (sessionId, id) => safePrivatePath(home, `records/${digest(JSON.stringify([sessionId, id]))}.json`)
  const observationKey = (sessionId, callId) => JSON.stringify([sessionId, callId])

  function synchronizeGeneration(sessionId) {
    const generation = storage.generation(sessionId)
    if (generations.get(sessionId) === generation) return
    generations.set(sessionId, generation)
    rollback.invalidate(sessionId)
    for (const key of observations.keys()) if (JSON.parse(key)[0] === sessionId) observations.delete(key)
  }

  ctx.on('tools/execute', async (exec, next) => {
    const session = exec.agent?.session
    const name = mutationPath(exec.name, exec.arguments)
    if (session === undefined || name === undefined) return next()
    return storage.activity(session.id, 'generating', async () => {
    synchronizeGeneration(session.id)
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
  })
  ctx.on('session/disposed', (session) => {
    for (const key of observations.keys()) if (JSON.parse(key)[0] === session.id) observations.delete(key)
  })
  ctx.effect(() => () => { observations.clear() })

  async function prepare(session, plan, carrierId) {
    synchronizeGeneration(session.id)
    const covering = await readCoveringLog(ctx, session.id)
    if (covering.status !== 'ok') throw new Error(covering.detail)
    const files = new Map()
    const shadowed = new Set(plan.shadowedSeqs)
    const results = new Map()
    const referencedResults = new Map()
    const rootCalls = new Map()
    for (const event of covering.log) {
      if (event.type === 'tool/call') rootCalls.set(event.data.callId, event.seq)
      if (event.type !== 'tool/result') continue
      for (const id of resultCallIds(event)) results.set(id, [...(results.get(id) ?? []), event])
      for (const seq of event.sourceEventSeqs ?? []) referencedResults.set(seq, [...(referencedResults.get(seq) ?? []), event])
    }
    for (const seq of shadowed) if (eventAtSeq(covering.log, seq) === undefined) throw new Error(`file version read does not cover seq ${seq}`)
    let userSeq
    for (const event of covering.log) {
      if (event.type === 'user/message' && event.surfaceOp === 'append' && event.data.source?.kind === 'user') userSeq = event.seq
      if (event.type !== 'tool/call' && event.type !== 'tool/ptc-dispatch') continue
      const callId = event.type === 'tool/call' ? event.data.callId : event.data.subCallId
      const rootCallId = event.type === 'tool/call' ? callId : event.data.rootCallId
      const candidates = [...new Set([...(results.get(rootCallId) ?? []), ...(referencedResults.get(rootCalls.get(rootCallId)) ?? [])])]
      // Result membership is authoritative, even for numerically descending rewinds.
      // When it is absent, the owning user message keeps incomplete work visible.
      if (candidates.length ? !candidates.some(result => shadowed.has(result.seq)) : !shadowed.has(userSeq)) continue
      let args
      try { args = event.type === 'tool/call' ? JSON.parse(event.data.arguments) : event.data.arguments }
      catch {
        if (['write', 'edit', 'str_replace_editor'].includes(event.data.name)) throw new Error('file mutation arguments unavailable')
        continue
      }
      const name = mutationPath(event.data.name, args)
      if (name === undefined) {
        if (['write', 'edit'].includes(event.data.name) ||
            event.data.name === 'str_replace_editor' && ['create', 'str_replace', 'insert'].includes(args?.command)) throw new Error('file mutation path unavailable')
        continue
      }
      const associationReason = candidates.length === 0 ? 'tool-result-unavailable'
        : candidates.length !== 1 || resultCallIds(candidates[0]).some(id => id !== rootCallId) ? 'tool-result-ambiguous' : undefined
      const observed = observations.get(observationKey(session.id, callId))
      let normalized = observed?.path ?? name
      let pathReason
      if (!observed) {
        try { normalized = path.relative(session.header.cwd, await fileTarget(session.header.cwd, name)).split(path.sep).join('/') }
        catch { pathReason = 'unsafe-path' }
      }
      const change = { ...(observed ?? { path: normalized, reason: pathReason ?? 'prior-state-unavailable' }),
        ...(associationReason ? { reason: associationReason } : {}) }
      // Failed calls with no mutations are not part of the file set.
      if (change.reason === undefined && equal(change.before, change.after)) continue
      // Windows names with different casing still refer to the same file.
      const key = process.platform === 'win32' ? change.path.toLowerCase() : change.path
      const previous = files.get(key)
      if (previous === undefined) files.set(key, { ...change })
      else {
        if (previous.reason === undefined && change.reason === undefined && !equal(previous.after, change.before)) previous.reason = 'diverged-between-writes'
        previous.reason ??= change.reason
        previous.after = change.after
      }
    }
    const backend = [...files.values()].some((file) => file.reason === undefined) ? await snapshots.backend(session.header.cwd) : 'cas'
    const records = []
    for (const file of files.values()) {
      if (file.reason === undefined && equal(file.before, file.after)) continue
      if (file.reason !== undefined) records.push({ path: file.path, reason: file.reason })
      else records.push({ path: file.path, before: await snapshots.put(file.before, backend), after: await snapshots.put(file.after, backend) })
    }
    const target = recordPath(session.id, carrierId)
    await mkdir(path.dirname(target), { recursive: true })
    const staging = `${target}.${randomUUID()}.pending`
    await writeFile(staging, JSON.stringify({ sessionId: session.id, carrierId, files: records }), { flag: 'wx', mode: 0o600 })
    await rename(staging, target)
    return {
      preview: () => rollback.prepared({ sessionId: session.id, carrierSeq: plan.rangeStartSeq, phase: 'preview' }, carrierId),
      rollback: request => rollback.prepared({ sessionId: session.id, carrierSeq: plan.rangeStartSeq, ...request }, carrierId),
      async discardUnlessWritten() {
        const read = await readCoveringLog(ctx, session.id)
        if (read.status === 'ok' && !read.log.some((event) => event.type === 'user/message' && event.data.id === carrierId)) {
          await unlink(target).catch(error => { if (error.code !== 'ENOENT') throw error })
        }
      },
    }
  }


  return {
    generation: sessionId => storage.generation(sessionId),
    prepare: (...args) => storage.exclusive(() => prepare(...args)),
    cleanup: createStorageCleanup(ctx, storage),
    async withOperation(sessionId, reason, task) {
      try { return await storage.operation(sessionId, reason, task) }
      catch (error) {
        logWarning(ctx, `private storage operation failed: ${describeError(error)}`)
        return refused(['storage-busy', 'storage-recovery-required'].includes(error.message) ? error.message : 'internal')
      }
    },
    async rollback(request) {
      synchronizeGeneration(request.sessionId)
      return rollback.rollback(request)
    },
  }
}
