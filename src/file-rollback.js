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
import { contentDiff } from './content-diff.js'

const refused = code => ({ ok: false, error: { code } })
const refusedFiles = (files, reasons = new Map()) => files.map(file => ({
  path: file.path, action: 'refuse', reason: file.reason ?? reasons.get(file.path) ?? 'execution-stopped',
}))

/**
 * Per-member outcomes of one run, as the client sees them.
 *
 * `kept` is always the user's own confirmed choice; every other non-restored
 * member is `refuse` with the reason the run actually observed (spec §9: the
 * two are never guessed into each other).
 * @param files - the plan's file list, in plan order.
 * @param states - member path → its journal state record.
 */
const selectionReport = (files, states) => files.map(file => {
  const state = states.get(file.path)
  if (state === undefined) return { path: file.path, action: 'refuse', reason: file.reason ?? 'execution-stopped' }
  if (state.state === 'restored') return { path: file.path, action: 'restored' }
  if (state.state === 'kept') return { path: file.path, action: 'kept' }
  return { path: file.path, action: 'refuse',
    reason: state.state === 'uncertain' ? 'restore-outcome-unavailable' : state.reason ?? file.reason ?? 'execution-stopped' }
})

export function createFileRollback(ctx, { home, snapshots }) {
  const plans = new Map()
  const completed = new Map()
  const progress = new Map()
  const owners = new Map()
  const persisted = new Set()
  // Completions whose disk record uses the versioned shape (spec §9). A legacy
  // full-restore keeps writing the legacy record so old readers stay honest.
  const versioned = new Set()
  const resultSchema = rollbackResultSchema()
  const recordPath = (sessionId, id) => safePrivatePath(home, `records/${digest(JSON.stringify([sessionId, id]))}.json`)
  const outcomePath = (sessionId, id) => safePrivatePath(home, `outcomes/${digest(JSON.stringify([sessionId, id]))}.json`)

  function invalidate(sessionId) {
    for (const [id, plan] of plans) if (plan.sessionId === sessionId) plans.delete(id)
    for (const [target, owner] of owners) if (owner === sessionId) {
      completed.delete(target); progress.delete(target); persisted.delete(target); versioned.delete(target); owners.delete(target)
    }
  }
  ctx.on('session/disposed', session => {
    for (const [id, plan] of plans) if (plan.sessionId === session.id) plans.delete(id)
  })
  ctx.effect(() => () => { plans.clear(); completed.clear(); progress.clear(); owners.clear(); persisted.clear(); versioned.clear() })

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

  async function saveCompletion(target, answer, record = answer) {
    try {
      await save(target, record)
      persisted.add(target); progress.delete(target)
      return answer
    } catch (error) {
      logWarning(ctx, `file rollback result could not be saved: ${describeError(error)}`)
      return { ok: false, error: { code: 'result-save-failed', files: answer.value.files.map(file => file.action === 'restore'
        ? { path: file.path, action: 'restored' } : file.action === 'refuse'
          ? { path: file.path, action: 'refuse', reason: file.reason } : { path: file.path, action: file.action }) } }
    }
  }

  /** Whether one journal state entry is a legal member of a progress record. */
  const legalState = (entry) => ['pending', 'kept', 'refused', 'uncertain', 'restored'].includes(entry.state) &&
      (entry.reason === undefined || typeof entry.reason === 'string')

  async function loadOutcome(target, sessionId) {
    // Progress changes in other Host plugins under the same session lock.
    // Only a terminal outcome can be cached permanently until cleanup.
    if (completed.has(target)) return
    try {
      const saved = JSON.parse(await readFile(target, 'utf8'))
      if (saved.kind === 'file-rollback-progress' && (saved.version === 1 || saved.version === 2)) {
        const { value } = resultSchema.parse({ ok: true, value: saved.value })
        if (!Array.isArray(saved.states) || saved.states.length !== value.files.length || saved.states.some((entry, index) =>
          entry.path !== value.files[index].path || !legalState(entry))) throw new Error('invalid rollback progress')
        if (saved.version === 2 && (!Array.isArray(saved.selected) || new Set(saved.selected).size !== saved.selected.length ||
            saved.selected.some(member => typeof member !== 'string' || !value.files.some(file => file.path === member)))) throw new Error('invalid rollback progress')
        // v1 semantics stand: an uncertain member is never promoted to a
        // completion, and the derived answer keeps the LEGACY file spelling so
        // a re-save stays a record old readers can parse. v2 ends with kept
        // members, but an uncertain member is still a partial failure — the
        // point stays open with its uncertain result, never a success
        // (docs/adr/0002-selective-rollback-finalizes-point.md).
        const terminal = saved.version === 2 ? ['restored', 'kept', 'refused'] : ['restored', 'refused']
        if (saved.states.every(file => terminal.includes(file.state))) {
          // The last checkpoint landed; only the final result was interrupted.
          if (saved.version === 2) {
            completed.set(target, { ok: true, value: { ...value, completed: true,
              files: selectionReport(value.files, new Map(saved.states.map(entry => [entry.path, entry]))) } })
            versioned.add(target)
          } else completed.set(target, { ok: true, value: { ...value, completed: true } })
          progress.delete(target)
        } else progress.set(target, { ...saved, value })
      } else if (saved.kind === 'file-rollback-result' && saved.version === 2) {
        const answer = resultSchema.parse(saved.value)
        if (!answer.ok || answer.value.completed !== true) throw new Error('invalid completion record')
        completed.set(target, answer); persisted.add(target); versioned.add(target); progress.delete(target)
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
    // 'keep' is the preflight-only 保留当前文件并继续／保留剩余文件并继续 choice:
    // the gateway's rollback descriptor never exposes it, only the replay flow
    // calls it internally.
    if ((request.scope !== undefined && request.scope !== 'artifacts') || !['status', 'preview', 'execute', 'cancel', 'keep'].includes(phase)) return refused('bad-request')
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
    if (completed.has(outcome)) {
      const answer = completed.get(outcome)
      return persisted.has(outcome) ? answer : saveCompletion(outcome, answer,
        versioned.has(outcome) ? { kind: 'file-rollback-result', version: 2, value: answer } : answer)
    }
    if (phase === 'status') {
      const interrupted = progress.get(outcome)
      if (interrupted) return { ok: false, error: { code: 'execution-stopped', files: selectionReport(interrupted.value.files,
        new Map((interrupted.states ?? []).map(entry => [entry.path, entry]))) } }
      let empty = false
      try { empty = filesInRecord(JSON.parse(await readFile(recordPath(sessionId, carrier.data.id), 'utf8'))).length === 0 }
      catch (error) { if (error.code !== 'ENOENT') throw error }
      return { ok: true, value: { planId: '', completed: false, files: [], ...(empty ? { empty: true } : {}) } }
    }
    if (phase !== 'preview') {
      const plan = plans.get(planId)
      // The keep wrap-up of a run that has already landed something (spec §8):
      // finalize from the journal, not from a plan. Still-unprocessed members
      // become the user's own kept decision; a landed change stands; an
      // uncertain member keeps the point open — never promoted, never re-run.
      if (phase === 'keep' && progress.get(outcome)?.states.some((entry) =>
          entry.state === 'restored' || entry.state === 'uncertain')) {
        const interrupted = progress.get(outcome)
        if (plan !== undefined && plan.sessionId === sessionId && plan.carrierSeq === carrierSeq) plans.delete(planId)
        for (const entry of interrupted.states) if (entry.state === 'pending') { entry.state = 'kept'; delete entry.reason }
        const states = new Map(interrupted.states.map((entry) => [entry.path, entry]))
        const files = selectionReport(interrupted.value.files, states)
        if (interrupted.states.some((entry) => entry.state === 'uncertain')) {
          try { await save(outcome, interrupted) } catch (error) {
            logWarning(ctx, `file rollback progress could not be saved: ${describeError(error)}`)
            return { ok: false, error: { code: 'progress-save-failed', files } }
          }
          progress.set(outcome, structuredClone(interrupted))
          return { ok: false, error: { code: 'execution-stopped', files } }
        }
        const answer = { ok: true, value: { ...interrupted.value, completed: true, files } }
        completed.set(outcome, answer)
        owners.set(outcome, sessionId)
        versioned.add(outcome)
        return await saveCompletion(outcome, answer, { kind: 'file-rollback-result', version: 2, value: answer })
      }
      if (plan === undefined || plan.sessionId !== sessionId || plan.carrierSeq !== carrierSeq) return refused('plan-not-found')
      // An explicit selection is validated BEFORE the plan is consumed, so a
      // forged, duplicate, cross-plan, disabled or empty set writes nothing and
      // leaves the valid plan usable (spec §10).
      if (request.selected !== undefined && phase === 'execute') {
        const restorable = new Set(plan.files.filter(file => file.action === 'restore').map(file => file.path))
        if (request.selected.length === 0 || new Set(request.selected).size !== request.selected.length ||
            request.selected.some(member => !restorable.has(member))) return refused('invalid-selection')
      }
      plans.delete(planId)
      // A keep before anything processed is the normal keep flow: consume the
      // plan, write nothing, claim no restore happened (spec §9).
      if (phase === 'cancel' || phase === 'keep') return { ok: true, value: plan.preview }
      if (phase !== 'execute') return refused('bad-request')
      if (request.selected !== undefined) {
        // Revalidate the SAME plan, never silently calculate a new one. Only the
        // confirmed subset is revalidated: an unselected file changing does not
        // block the members the user chose (spec §8).
        const selected = new Set(request.selected)
        const previous = new Map((progress.get(outcome)?.states ?? []).map(entry => [entry.path, entry]))
        const stateOf = (file) => {
          const state = previous.get(file.path)?.state
          // A member whose earlier attempt already landed — or whose outcome is
          // unknown — is never written again, whatever the plan still claims.
          if (state === 'restored' || state === 'uncertain') return { state }
          if (file.action === 'refuse') return { state: 'refused' }
          return selected.has(file.path) ? { state: 'pending' } : { state: 'kept' }
        }
        // The journal's own entries are the loop's state records, so every
        // checkpoint writes the progress the run has actually reached.
        const stateEntries = plan.files.map(file => ({ path: file.path, ...stateOf(file) }))
        const states = new Map(stateEntries.map(entry => [entry.path, entry]))
        const divergences = new Map()
        for (const file of plan.files) {
          if (states.get(file.path).state !== 'pending') continue
          try { if (!equal(await contents(session.header.cwd, file.path), file.after)) divergences.set(file.path, 'content-diverged') }
          catch (error) { divergences.set(file.path, error.message === 'unsafe-path' ? 'unsafe-path' : 'unreadable-file') }
        }
        if (divergences.size > 0) return { ok: false, error: { code: 'preview-stale', files: plan.files.map(file =>
          file.action === 'restore' && !selected.has(file.path) ? { path: file.path, action: 'kept' }
          : { path: file.path, action: 'refuse', reason: file.reason ?? divergences.get(file.path) ?? 'execution-stopped' }) } }
        if (agent.status !== 'idle') return { ok: false, error: { code: 'agent-busy', files: selectionReport(plan.files, states) } }
        // The durable intent — the confirmed selection identity and every
        // member's real progress — survives a crash between mutation and result.
        const journal = { kind: 'file-rollback-progress', version: 2, selected: [...request.selected], value: plan.preview,
          states: stateEntries }
        const checkpoint = async () => { await save(outcome, journal); progress.set(outcome, structuredClone(journal)); owners.set(outcome, sessionId) }
        /** One checkpoint, or the progress-save failure to report instead. */
        const savedProgress = async () => {
          try { await checkpoint() } catch (error) {
            logWarning(ctx, `file rollback progress could not be saved: ${describeError(error)}`)
            return { ok: false, error: { code: 'progress-save-failed', files: selectionReport(plan.files, states) } }
          }
        }
        let failed = await savedProgress()
        if (failed) return failed
        for (const file of plan.files) {
          if (states.get(file.path).state !== 'pending') continue
          const state = states.get(file.path)
          state.state = 'uncertain'; delete state.reason
          failed = await savedProgress()
          if (failed) return failed
          try {
            await restoreFile(session.header.cwd, file, () => agent.status === 'idle')
          } catch (error) {
            // A committed replacement whose verification failed is uncertain;
            // do not promote it to successful completion on the next read.
            state.state = error.restored ? 'uncertain' : 'pending'
            state.reason = ['content-diverged', 'unsafe-path', 'agent-busy'].includes(error.message) ? error.message : 'restore-failed'
            try { await checkpoint() } catch (saving) { logWarning(ctx, `file rollback progress could not be saved: ${describeError(saving)}`) }
            return { ok: false, error: { code: 'execution-stopped', files: selectionReport(plan.files, states) } }
          }
          state.state = 'restored'; delete state.reason
          failed = await savedProgress()
          if (failed) return failed
        }
        // The confirmed subset succeeded, so the whole point is finalized: the
        // unselected members are recorded as the user's own kept choice
        // (docs/adr/0002-selective-rollback-finalizes-point.md).
        const answer = { ok: true, value: { ...plan.preview, completed: true, files: selectionReport(plan.files, states) } }
        completed.set(outcome, answer)
        owners.set(outcome, sessionId)
        versioned.add(outcome)
        return await saveCompletion(outcome, answer, { kind: 'file-rollback-result', version: 2, value: answer })
      }
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
      files: files.map(({ path, action, reason, before }) => ({ path, action, ...(reason === undefined ? {} : { reason }),
        ...(action === 'restore' && before === null ? { operation: 'delete' } : {}) })) }
    plans.set(id, { sessionId, carrierSeq, files, preview, preparedId, outcome })
    // A recorded selection identity travels with the preview, so a re-check
    // after an interruption reuses it instead of defaulting to everything.
    const recorded = progress.get(outcome)
    return { ok: true, value: { ...preview, ...(recorded?.version === 2 ? { selected: recorded.selected } : {}) } }
  }
  async function guardedRollback(request, preparedId) {
    try { return await rollback(request, preparedId) }
    catch (error) { logWarning(ctx, `file rollback failed: ${describeError(error)}`); return refused('internal') }
  }
  async function content(request, preparedId) {
    try {
      const plan = plans.get(request.planId)
      if (!plan || plan.sessionId !== request.sessionId || plan.preparedId !== preparedId ||
          (preparedId === undefined && plan.carrierSeq !== request.carrierSeq)) return refused('plan-not-found')
      const file = plan.files.find(file => file.path === request.path && file.action === 'restore')
      if (!file) return refused('invalid-member')
      const session = hostService(ctx, 'sessions')?.get(request.sessionId)
      if (!session) return refused('plan-not-found')
      if (hostService(ctx, 'agents')?.get(request.sessionId)?.status !== 'idle') return refused('agent-busy')
      await loadOutcome(plan.outcome, request.sessionId)
      const state = progress.get(plan.outcome)?.states.find(entry => entry.path === file.path)?.state
      if (completed.has(plan.outcome) || ['restored', 'uncertain'].includes(state)) return refused('plan-not-found')
      const current = await contents(session.header.cwd, file.path)
      if (!equal(current, file.after)) return refused('preview-stale')
      // A dispose/cleanup/cancel during a read must retire the answer as well.
      if (plans.get(request.planId) !== plan) return refused('plan-not-found')
      return { ok: true, value: contentDiff(current, file.before) }
    } catch (error) {
      return refused(error.message === 'unsafe-path' || error.message === 'content-diverged' ? 'preview-stale' : 'read-failed')
    }
  }
  return { invalidate, rollback: guardedRollback, prepared: guardedRollback, content }
}
