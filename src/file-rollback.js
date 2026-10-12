/** Owns the preview, execution progress and terminal outcome of file rollback. */
import { randomUUID } from 'node:crypto'
import { mkdir, open, readFile, rename, unlink } from 'node:fs/promises'
import path from 'node:path'
import { digest } from './file-snapshots.js'
import { contents, restoreFile, sameContents as equal } from './rollback-files.js'
import { readCoveringLog, eventAtSeq } from './log-read.js'
import { describeError, hostService, logWarning } from './host.js'
import { hasMarkerPrefix } from './marker.js'
import { rollbackResultSchema } from './typert.js'
import { safePrivatePath } from './private-storage.js'
import { filesInRecord } from './storage-cleanup.js'

const refused = code => ({ ok: false, error: { code } })
const refusedFiles = (files, reasons = new Map()) => files.map(file => ({
  path: file.path, action: 'refuse', reason: file.reason ?? reasons.get(file.path) ?? 'execution-stopped',
}))

export function createFileRollback(ctx, { home, snapshots }) {
  const plans = new Map()
  const completed = new Map()
  const progress = new Map()
  const owners = new Map()
  const persisted = new Set()
  const resultSchema = rollbackResultSchema()
  const recordPath = (sessionId, id) => safePrivatePath(home, `records/${digest(JSON.stringify([sessionId, id]))}.json`)
  const outcomePath = (sessionId, id) => safePrivatePath(home, `outcomes/${digest(JSON.stringify([sessionId, id]))}.json`)

  function invalidate(sessionId) {
    for (const [id, plan] of plans) if (plan.sessionId === sessionId) plans.delete(id)
    for (const [target, owner] of owners) if (owner === sessionId) {
      completed.delete(target); progress.delete(target); persisted.delete(target); owners.delete(target)
    }
  }
  ctx.on('session/disposed', session => {
    for (const [id, plan] of plans) if (plan.sessionId === session.id) plans.delete(id)
  })
  ctx.effect(() => () => { plans.clear(); completed.clear(); progress.clear(); owners.clear(); persisted.clear() })

  async function save(target, value) {
    const staging = `${target}.${randomUUID()}.pending`
    let handle
    try {
      await mkdir(path.dirname(target), { recursive: true })
      safePrivatePath(home, path.relative(home, staging))
      handle = await open(staging, 'wx', 0o600)
      await handle.writeFile(JSON.stringify(value))
      await handle.sync()
      await handle.close(); handle = undefined
      safePrivatePath(home, path.relative(home, target))
      await rename(staging, target)
    } finally {
      await handle?.close()
      await unlink(staging).catch(() => {})
    }
  }

  const executionFiles = (files, processed, failedPath, reason) => files.map(file => processed.has(file.path)
    ? { path: file.path, action: 'restored' }
    : { path: file.path, action: 'refuse', reason: file.reason ?? (file.path === failedPath ? reason : 'execution-stopped') })

  async function saveCompletion(target, answer) {
    try {
      await save(target, answer)
      persisted.add(target); progress.delete(target)
      return answer
    } catch (error) {
      logWarning(ctx, `file rollback result could not be saved: ${describeError(error)}`)
      return { ok: false, error: { code: 'result-save-failed', files: answer.value.files.map(file => file.action === 'restore'
        ? { path: file.path, action: 'restored' } : { path: file.path, action: 'refuse', reason: file.reason }) } }
    }
  }

  async function loadOutcome(target, sessionId) {
    // Progress changes in other Host plugins under the same session lock.
    // Only a terminal outcome can be cached permanently until cleanup.
    if (completed.has(target)) return
    try {
      const saved = JSON.parse(await readFile(target, 'utf8'))
      if (saved.kind === 'file-rollback-progress' && saved.version === 1) {
        const { value } = resultSchema.parse({ ok: true, value: saved.value })
        if (!Array.isArray(saved.states) || saved.states.length !== value.files.length || saved.states.some((entry, index) =>
          entry.path !== value.files[index].path || !['pending', 'refused', 'uncertain', 'restored'].includes(entry.state))) throw new Error('invalid rollback progress')
        if (saved.states.every(file => ['restored', 'refused'].includes(file.state))) {
          // The last checkpoint landed; only the final result was interrupted.
          completed.set(target, { ok: true, value: { ...value, completed: true } }); progress.delete(target)
        } else progress.set(target, { ...saved, value })
      } else {
        const answer = resultSchema.parse(saved)
        if (!answer.ok || answer.value.completed !== true) throw new Error('invalid completion record')
        completed.set(target, answer); persisted.add(target); progress.delete(target)
      }
      owners.set(target, sessionId)
    } catch (error) { if (error.code !== 'ENOENT') throw error }
  }
  async function rollback(request, preparedId) {
    const { sessionId, carrierSeq, phase, planId } = request
    // Keep omitted/artifacts requests compatible; removed scopes cannot write.
    if ((request.scope !== undefined && request.scope !== 'artifacts') || !['status', 'preview', 'execute', 'cancel'].includes(phase)) return refused('bad-request')
    if (typeof sessionId !== 'string' || sessionId === '' || !Number.isSafeInteger(carrierSeq) || carrierSeq < 0) return refused('bad-request')
    const session = hostService(ctx, 'sessions')?.get(sessionId)
    if (session === undefined) return refused('session-not-found')
    const agent = hostService(ctx, 'agents')?.get(sessionId)
    if (phase !== 'status' && agent?.status !== 'idle') {
      const pending = plans.get(planId)
      return phase === 'execute' && pending?.sessionId === sessionId && pending.carrierSeq === carrierSeq
        ? { ok: false, error: { code: 'agent-busy', files: refusedFiles(pending.files) } } : refused('agent-busy')
    }
    let carrier
    if (preparedId !== undefined) carrier = { data: { id: preparedId } }
    else {
      const covering = await readCoveringLog(ctx, sessionId)
      if (covering.status !== 'ok') return refused('internal')
      carrier = eventAtSeq(covering.log, carrierSeq)
      if (carrier?.type !== 'user/message' || !hasMarkerPrefix(carrier.data?.id) || carrier.surfaceOp?.op !== 'replace') return refused('no-target-state')
    }
    const outcome = outcomePath(sessionId, carrier.data.id)
    await loadOutcome(outcome, sessionId)
    // Completion is permanent for this point. Return its historical result;
    // never create a second restore plan, even if current files match again.
    if (completed.has(outcome)) return persisted.has(outcome) ? completed.get(outcome) : saveCompletion(outcome, completed.get(outcome))
    if (phase === 'status') {
      const interrupted = progress.get(outcome)
      if (interrupted) return { ok: false, error: { code: 'execution-stopped', files: interrupted.states.map(file =>
        file.state === 'restored' ? { path: file.path, action: 'restored' }
          : { path: file.path, action: 'refuse', reason: file.state === 'uncertain' ? 'restore-outcome-unavailable' :
            interrupted.value.files.find(entry => entry.path === file.path)?.reason ?? 'execution-stopped' }) } }
      let empty = false
      try { empty = filesInRecord(JSON.parse(await readFile(recordPath(sessionId, carrier.data.id), 'utf8'))).length === 0 }
      catch (error) { if (error.code !== 'ENOENT') throw error }
      return { ok: true, value: { planId: '', completed: false, files: [], ...(empty ? { empty: true } : {}) } }
    }
    if (phase !== 'preview') {
      const plan = plans.get(planId)
      if (plan === undefined || plan.sessionId !== sessionId || plan.carrierSeq !== carrierSeq) return refused('plan-not-found')
      plans.delete(planId)
      if (phase === 'cancel') return { ok: true, value: plan.preview }
      if (phase !== 'execute') return refused('bad-request')
      // Revalidate the SAME plan, never silently calculate a new one.
      const divergences = new Map()
      for (const file of plan.files) {
        if (file.action === 'refuse') continue
        try { if (!equal(await contents(session.header.cwd, file.path), file.after)) divergences.set(file.path, 'content-diverged') }
        catch (error) { divergences.set(file.path, error.message === 'unsafe-path' ? 'unsafe-path' : 'unreadable-file') }
      }
      if (divergences.size > 0) return { ok: false, error: { code: 'preview-stale', files: refusedFiles(plan.files, divergences) } }
      if (agent.status !== 'idle') return { ok: false, error: { code: 'agent-busy', files: refusedFiles(plan.files) } }
      const processed = new Set()
      const previousStates = new Map(progress.get(outcome)?.states.map(file => [file.path, file.state]))
      const journal = { kind: 'file-rollback-progress', version: 1, value: plan.preview,
        states: plan.files.map(file => ({ path: file.path, state: file.action === 'restore' ? 'pending' :
          ['restored', 'uncertain'].includes(previousStates.get(file.path)) ? previousStates.get(file.path) : 'refused' })) }
      const checkpoint = async () => { await save(outcome, journal); progress.set(outcome, structuredClone(journal)); owners.set(outcome, sessionId) }
      try { await checkpoint() }
      catch (error) {
        logWarning(ctx, `file rollback progress could not be saved: ${describeError(error)}`)
        return { ok: false, error: { code: 'progress-save-failed', files: refusedFiles(plan.files) } }
      }
      for (const file of plan.files) {
        if (file.action === 'refuse') continue
        const state = journal.states.find(entry => entry.path === file.path)
        // The durable intent survives a crash between mutation and its result.
        state.state = 'uncertain'
        try { await checkpoint() }
        catch (error) {
          logWarning(ctx, `file rollback progress could not be saved: ${describeError(error)}`)
          return { ok: false, error: { code: 'progress-save-failed', files: executionFiles(plan.files, processed) } }
        }
        try {
          await restoreFile(session.header.cwd, file, () => agent.status === 'idle')
          processed.add(file.path)
        } catch (error) {
          if (error.restored) processed.add(file.path)
          // A committed replacement whose verification failed is uncertain;
          // do not promote it to successful completion on the next read.
          state.state = error.restored ? 'uncertain' : 'pending'
          try { await checkpoint() } catch (saving) { logWarning(ctx, `file rollback progress could not be saved: ${describeError(saving)}`) }
          const reason = ['content-diverged', 'unsafe-path', 'agent-busy'].includes(error.message) ? error.message : 'restore-failed'
          return { ok: false, error: { code: 'execution-stopped', files: executionFiles(plan.files, processed, file.path, reason) } }
        }
        state.state = 'restored'
        try { await checkpoint() }
        catch (error) {
          logWarning(ctx, `file rollback progress could not be saved: ${describeError(error)}`)
          return { ok: false, error: { code: 'progress-save-failed', files: executionFiles(plan.files, processed) } }
        }
      }
      const answer = { ok: true, value: { ...plan.preview, completed: true } }
      completed.set(outcome, answer)
      owners.set(outcome, sessionId)
      const saved = await saveCompletion(outcome, answer)
      if (!saved.ok) return saved
      // Preserve the existing execution envelope for file-only callers.
      return { ok: true, value: plan.preview }
    }
    let record
    try { record = filesInRecord(JSON.parse(await readFile(recordPath(sessionId, carrier.data.id), 'utf8'))) }
    catch (error) { if (error.code === 'ENOENT') return refused('no-target-state'); throw error }
    if (!Array.isArray(record) || record.some(file => typeof file?.path !== 'string' ||
      (file.reason !== undefined && typeof file.reason !== 'string')) || new Set(record.map(file =>
        process.platform === 'win32' ? file.path.toLowerCase() : file.path)).size !== record.length) throw new Error('invalid file record')
    const previousStates = new Map(progress.get(outcome)?.states.map(file => [file.path, file.state]))
    const files = []
    for (const file of record) {
      const previous = previousStates.get(file.path)
      let reason = previous === 'restored' ? 'already-restored' : previous === 'uncertain' ? 'restore-outcome-unavailable' : file.reason
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
    const preview = { planId: id, ...(request.scope === undefined ? {} : { scope: 'artifacts' }),
      files: files.map(({ path, action, reason }) => ({ path, action, ...(reason === undefined ? {} : { reason }) })) }
    plans.set(id, { sessionId, carrierSeq, files, preview })
    return { ok: true, value: preview }
  }
  async function guardedRollback(request, preparedId) {
    try { return await rollback(request, preparedId) }
    catch (error) { logWarning(ctx, `file rollback failed: ${describeError(error)}`); return refused('internal') }
  }
  return { invalidate, rollback: guardedRollback, prepared: guardedRollback }
}
