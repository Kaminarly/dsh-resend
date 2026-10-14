/**
 * The `resend` service — the receiver the API Gateway dispatches `resend/apply`
 * to (spec §6.1, §6.5), and the one operation that rewinds a conversation.
 *
 * Two facts make this class dispatchable, and the Gateway checks both on every
 * call:
 *
 *  - it is a Cordis Service registered under exactly the descriptor's `service`
 *    key, because `prepareInvocation` resolves the receiver with
 *    `ctx.get(descriptor.service)`;
 *  - it carries a `typertRemote` binding whose `serviceKey` and `namespace` match
 *    the descriptor, because `validateBinding` refuses a receiver whose binding
 *    is absent or inconsistent (`gateway/binding-invalid`).
 *
 * Both identities are imported from the descriptor table rather than restated, so
 * the binding cannot drift from the descriptor it serves.
 *
 * `apply` is the whole operation in the order spec §4.4 fixes: lifecycle,
 * input, session, agent, target resolution, op-specific text. It NEVER rejects
 * for a business outcome (§4.5) — every refusal resolves a `RemoteResult`
 * failure carrying one of the closed vocabulary's codes — and what it writes is
 * one pair of events: the audit claim and its carrier (§5.2–§5.4).
 *
 * From ticket 05 it also RESENDS: the carrier renders nothing, so the `followup`
 * that queues the prompt is the only new row the user sees (§5.5). Two failure
 * outcomes are deliberately separated (§9.4): a prompt the agent did not take
 * leaves the rewind standing and is reported by the client's own error row, and
 * a turn that was accepted and then failed is the agent's own reporting — this
 * service makes no claim about it and invents no row for it.
 */
import { Service } from '@deepseek-ai/cordis'
import { randomUUID } from '@deepseek-ai/dsh-util-crypto'
import { assertCode } from './error-codes.js'
import { describeError, hostService, logWarning } from './host.js'
import { carrierIdFor, resendIdFor } from './marker.js'
import { editPromptDigest, effectiveConversationEligibility, resolveTarget } from './resolve.js'
import { withSessionLock } from './session-lock.js'
import { traceTextNow } from './trace-text.js'
import { writeRewindPair } from './write.js'
import { NAMESPACE, SERVICE } from './typert.js'
import { createFileVersions } from './file-versions.js'

const fileVersions = new WeakMap()
// Acceptance precedes the agent's inbox append. Keep that observed fact for the
// live Session so another page cannot mistake the append gap for an owed prompt.
const acceptedPrompts = new WeakMap()
const replayPlans = new WeakMap()
const replayFailure = code => ({ ok: false, error: { code } })
const replayPreview = saved => ({ ok: true, value: { preflight: true, preflightId: saved.id,
  userSeq: saved.plan.rangeStartSeq, op: saved.request.op, ...saved.preview.value } })
const stoppedAfterRestore = (saved, code) => ({ ok: false, error: { code,
  files: saved.preview.value.files.map(file => file.action === 'restore'
    ? { path: file.path, action: 'restored' } : file) } })

/**
 * Cordis's fiber states, from its own enum (`src/fiber.ts`: PENDING 0,
 * LOADING 1, ACTIVE 2, FAILED 3, DISPOSED 4, UNLOADING 5). It is a `const
 * enum`, erased at runtime, so the one state this file needs is spelled here
 * with that provenance instead of imported.
 */
const FIBER_ACTIVE = 2

/**
 * Build the `ok: false` branch of the result envelope (spec §4.5).
 *
 * The code is checked against the closed vocabulary by the same guard the
 * resolver's own refusal uses, so both shapes refuse a typo in the same words:
 * nothing decodes a result at runtime (§16.5), so the producer is the only place
 * such a typo can be caught.
 * @param code - one of `ERROR_CODES`.
 * @returns a frozen `RemoteResult` failure.
 */
function failure(code) {
  assertCode(code)
  return Object.freeze({ ok: false, error: Object.freeze({ code }) })
}

/**
 * Run one host read, mapping an unexpected throw to `internal` (spec §4.5).
 *
 * This is not the bare `try`/`catch` §4.5 forbids: it never invents a business
 * conclusion from a fault (it will not read "the session is gone" into a throw),
 * it maps an unexpected fault to the vocabulary's own bucket for one — and that
 * is what keeps `apply`'s "never rejects" promise true even when a host service
 * throws instead of answering. A read that answers is returned as-is.
 * @param read - the host read to perform.
 * @returns `{ value }` for an answer, `{ code, detail }` for a fault.
 */
function guarded(read) {
  try {
    return { value: read() }
  } catch (error) {
    return { code: 'internal', detail: describeError(error) }
  }
}

/**
 * Hand the prompt to the agent, and report whether it was taken (spec §5.5,
 * §9.4).
 *
 * `followup` is fire-and-forget: it returns `undefined` — not a thenable — so
 * there is nothing to `await` and nothing to catch, and it does not even throw
 * for a missing or disposed agent (§16.2). The ONE inference the call site has
 * is `agent.status`, read immediately after the call: `running` means the turn
 * was accepted, anything else means it was not.
 *
 * The input is the plain four-member message, passed through VERBATIM. The agent
 * loop appends the claimed inbox input as the event's data
 * (`@dsh-agent-loop/lib/index.js:1061`), which is what makes the id minted at
 * write time the id of the row the user sees — and `createUserMessage` must NOT
 * be used for it: the `createMessage` helper behind it does
 * `{ ...input, id: brandString(randomUUID()) }`, which would silently disconnect
 * `resendMessageId` from the message it names.
 *
 * Nothing here waits for the turn, and nothing here claims anything about how it
 * ends. A turn that was accepted and then failed reports itself, in the
 * transcript, at the same turn; this plugin owning that case would report one
 * failure twice (§9.4).
 * @param ctx - the host context.
 * @param handoff - `{ agent, sessionId, resendMessageId, text }`.
 * @returns true when the agent took the prompt.
 */
function handOffPrompt(ctx, { agent, session, sessionId, resendMessageId, text }) {
  try {
    agent.followup({ role: 'user', id: resendMessageId, content: [{ type: 'text', text }], source: { kind: 'user' } })
    if (agent.status === 'running') {
      const accepted = acceptedPrompts.get(session) ?? new Set()
      accepted.add(resendMessageId)
      acceptedPrompts.set(session, accepted)
      return true
    }
    logWarning(
      ctx,
      `the rewind of ${JSON.stringify(sessionId)} stands, but the agent did not take the prompt (status ${JSON.stringify(agent.status)}): ` +
        `the re-send is owed and the client offers it (spec §9.4)`,
    )
  } catch (error) {
    // §16.2 measured no throw here at all — this branch exists so that IF one
    // ever appears it cannot do the one thing §9.4 forbids: turn a rewind that
    // already landed and was flushed into a reported failure. A call that threw
    // queued nothing, and "not queued" is the state "Send again" can act on.
    logWarning(ctx, `the re-send for ${JSON.stringify(sessionId)} could not be handed to the agent: ${describeError(error)}`)
  }
  return false
}

/**
 * Build the `ok: true` branch of the result envelope (spec §4.1, §9.4).
 *
 * `resendMessageId` is present exactly when the prompt was queued: it is
 * literally "the id of the message queued to the agent", so a rewind whose
 * prompt was not taken has no such id to report — and the client renders its
 * error row for the absence. Reporting a FAILURE here instead would report
 * failure over a surface this plugin has already changed, which §9.4 forbids,
 * and it would withhold the `carrierSeq`/`shadowedSeqs` the client needs.
 * @param value - `{ carrierSeq, shadowedSeqs, resendMessageId }`; the last is
 *   `undefined` when the agent did not take the prompt.
 * @returns a frozen `RemoteResult` success.
 */
function rewindResult({ carrierSeq, shadowedSeqs, resendMessageId }) {
  const value = resendMessageId === undefined ? { carrierSeq, shadowedSeqs } : { carrierSeq, shadowedSeqs, resendMessageId }
  return Object.freeze({ ok: true, value: Object.freeze(value) })
}

/**
 * The locked body: resolve, write the pair, resend, and answer.
 *
 * A module-level function rather than a private method on the Service: the
 * Gateway reaches this class through Cordis's service proxy, so `this` inside
 * `apply` is the proxy — and a `#private` member read on a proxy fails its brand
 * check (`Receiver must be an instance of class …`), which would fail every call
 * at the boundary. `ctx` is passed explicitly instead.
 *
 * Never rejects. A host fault is logged and answered `internal` — the closed
 * vocabulary's bucket for one — because a rejection here would be an assembly
 * fault dressed as a business outcome (spec §4.5).
 * @param ctx - the host context.
 * @param context - `{ session, agent, sessions, sessionId, request }`, all
 *   resolved by the service's own `apply`.
 * @returns a frozen `RemoteResult`.
 */
async function rewind(ctx, { session, agent, sessions, sessionId, request, replay }) {
  try {
    if (replay?.saved && replayPlans.get(ctx).get(replay.saved.id) !== replay.saved) return replayFailure('plan-not-found')
    const { op } = request

    const surfaceRead = guarded(() => session.surface.nodes)
    if (surfaceRead.code !== undefined) {
      logWarning(ctx, `resend.apply could not read the live surface of ${JSON.stringify(sessionId)}: ${surfaceRead.detail}`)
      return failure(surfaceRead.code)
    }

    // §4.4 step 5 — target resolution, on the covering log, plus the live
    // surface it is checked against. Both facts come from live host state; the
    // client supplies no span and no shadowed-seq list (§4.3).
    const resolution = await resolveTarget(ctx, request, surfaceRead.value)
    if (!resolution.ok) {
      if (resolution.error.code === 'internal') {
        logWarning(ctx, `resend.apply could not resolve the request: ${resolution.error.detail ?? 'no detail'}`)
      }
      return failure(resolution.error.code)
    }
    const plan = resolution.value
    const pending = replay?.saved
    if (pending && (pending.session !== session || pending.generation !== fileVersions.get(ctx).generation(sessionId) ||
        pending.plan.endSeq !== plan.endSeq || pending.plan.resendText !== plan.resendText ||
        JSON.stringify(pending.plan.shadowedSeqs) !== JSON.stringify(plan.shadowedSeqs))) return replayFailure('preview-stale')

    // §9.4's "Send again": this target's rewind already landed and its prompt
    // never reached the agent, so the re-send is the whole operation. No second
    // audit claim, no second carrier, no flush — the log is already correct, and
    // running the write path again would rewrite a surface the user still wants.
    if (plan.kind === 'resend-only') {
      // §4.4 rule 4, re-read here because this call may have waited behind
      // another operation inside the lock: neither operation happens while a
      // reply is streaming (§9.2). The re-send only queues a prompt and writes
      // nothing, so it refuses — it never cancels the user's own turn, which is
      // what the write boundary below may do for a turn that raced it.
      if (agent.status !== 'idle') {
        logWarning(ctx, `the re-send for ${JSON.stringify(sessionId)} was asked for while a turn was open on it (spec §4.4 rule 4)`)
        return failure('agent-busy')
      }
      if (acceptedPrompts.get(session)?.has(plan.resendMessageId)) return failure('target-shadowed')
      const taken = handOffPrompt(ctx, { agent, session, sessionId, resendMessageId: plan.resendMessageId, text: plan.resendText })
      return rewindResult({
        carrierSeq: plan.carrierSeq,
        shadowedSeqs: plan.shadowedSeqs,
        resendMessageId: taken ? plan.resendMessageId : undefined,
      })
    }

    // A new click after page reload replaces an abandoned preflight. Otherwise
    // its unknown id could leave the session blocked until the Host restarts.
    if (replay?.phase === 'start') {
      for (const [id, saved] of replayPlans.get(ctx)) {
        if (saved.session.id !== sessionId) continue
        if (saved.generation === fileVersions.get(ctx).generation(sessionId)) {
          await saved.versions.rollback({ phase: 'cancel', planId: saved.preview.value.planId })
        }
        await saved.versions.discardUnlessWritten()
        replayPlans.get(ctx).delete(id)
      }
    }

    // §4.4's defensive precondition, in the one place it can still matter: a
    // turn that opened between the rule-4 check and this write. The plugin never
    // cancels the user's streaming reply (that is rule 4, and §9.2 has the user
    // stop it); this covers only the race, and its cancellation is the user's
    // own cause — `{ kind: 'user' }` — so nothing downstream reads it as a
    // plugin-initiated stop.
    if (agent.status !== 'idle') {
      if (replay) return replayFailure('agent-busy')
      agent.cancel?.({ kind: 'user' })
      await agent.whenIdle?.()
      if (agent.status !== 'idle') {
        logWarning(ctx, `resend.apply found a turn open on ${JSON.stringify(sessionId)} at the write boundary and it did not reach idle`)
        return failure('agent-busy')
      }
    }

    // §5.2–§5.4 — the pair. The carrier's id is minted here, once per operation,
    // and the resend message's id is DERIVED from it (`./marker.js`): that
    // derivation is what makes "was this carrier's prompt ever queued?"
    // answerable from the log alone, which is the question §9.4's re-send rests
    // on. The trace text is chosen here, once, and is immutable in the log from
    // then on (§10).
    const carrierId = pending?.id ?? carrierIdFor(op, randomUUID() + (op === 'regenerate'
      ? '-target-' + request.targetSeq : '-prompt-sha256-' + editPromptDigest(plan.resendText)))
    const resendMessageId = resendIdFor(carrierId)
    const versions = pending?.versions ?? await fileVersions.get(ctx).prepare(session, plan, carrierId)
    if (replay?.phase === 'start') {
      const preview = await versions.preview()
      if (!preview.ok) { await versions.discardUnlessWritten(); return preview }
      if (preview.value.files.length > 0) {
        const saved = { id: carrierId, session, request: { ...request }, plan, versions, preview,
          generation: fileVersions.get(ctx).generation(sessionId) }
        replayPlans.get(ctx).set(carrierId, saved)
        return replayPreview(saved)
      }
      await versions.rollback({ phase: 'cancel', planId: preview.value.planId })
    } else if (pending) {
      if (replay.phase === 'preview') {
        const preview = await versions.preview()
        if (!preview.ok) return preview
        pending.preview = preview
        return replayPreview(pending)
      }
      if (replay.phase === 'restore' && !pending.restored) {
        // Only the confirmed subset is processed; an omitted selection is the
        // legacy full-restore call (spec §10).
        const restored = await versions.rollback({ phase: 'execute', planId: pending.preview.value.planId,
          ...(replay.selected === undefined ? {} : { selected: replay.selected }) })
        if (!restored.ok) return restored
        pending.restored = true
        // The real per-member result — restored and kept alike — is what every
        // later failure report must keep using (spec §8): never re-derive it.
        pending.preview = { ok: true, value: { ...pending.preview.value, ...restored.value } }
      } else if (replay.phase === 'keep' && !pending.restored) {
        // 保留当前文件并继续 / 保留剩余文件并继续 (spec §7, §8): files stay as
        // they are, a processed run finalizes from its journal with the real
        // results, and a save that fails stops here — generation cannot outrun
        // the truth. An expired plan is the unprocessed keep the cancel already
        // described, so it keeps following the normal retention flow.
        const kept = await versions.rollback({ phase: 'keep', planId: pending.preview.value.planId })
        if (!kept.ok && kept.error.code !== 'plan-not-found') return kept
      }
      if (agent.status !== 'idle') return pending.restored ? stoppedAfterRestore(pending, 'agent-busy') : replayFailure('agent-busy')
      // File I/O may have yielded to another window's normal send.
      const current = await resolveTarget(ctx, request, session.surface.nodes)
      if (!current.ok || current.value.endSeq !== plan.endSeq ||
          JSON.stringify(current.value.shadowedSeqs) !== JSON.stringify(plan.shadowedSeqs)) return pending.restored
        ? stoppedAfterRestore(pending, 'preview-stale') : replayFailure('preview-stale')
    }
    if (replay && agent.status !== 'idle') return replayFailure('agent-busy')
    let write
    try { write = await writeRewindPair(ctx, {
      sessions,
      session,
      sessionId,
      plan,
      carrierId,
      traceText: traceTextNow(ctx),
      request,
    }) } catch (error) { if (!pending) await versions.discardUnlessWritten(); throw error }
    if (!write.ok) {
      if (!pending) await versions.discardUnlessWritten()
      if (write.error.code === 'internal') {
        logWarning(ctx, `resend.apply could not write the rewind pair for ${JSON.stringify(sessionId)}: ${write.error.detail ?? 'no detail'}`)
      }
      // A write that did not land stays a FAILURE, and §11's own row for the carrier
      // refused after the audit claim landed says "report failure, and show
      // §9.4" — which cannot both be obeyed: §9.4's row describes a rewind that
      // HAPPENED and a re-send that did not, and here no carrier landed, so there
      // is no rewind point for such a row to sit at and claiming a rewound
      // history would be the mirror image of the lie §9.4 forbids. §9.4 is the
      // normative text on what that row may say, so the failure is reported as a
      // failure, and the orphan claim is made diagnosable in the host log
      // instead (`./write.js`, §11).
      return pending?.restored ? stoppedAfterRestore(pending, 'rewind-failed') : failure(write.error.code)
    }
    if (pending) replayPlans.get(ctx).delete(pending.id)

    // §5.5 — the resend, inside the same lock and after the flush: the carrier
    // renders nothing, so the message queued to the agent is the only new row
    // the user sees. The flush has already made the rewind durable, which is why
    // a failure here can only ever be reported as "the re-send did not happen",
    // never as a failure of the rewind itself (§9.4).
    const taken = handOffPrompt(ctx, { agent, session, sessionId, resendMessageId, text: plan.resendText })
    return rewindResult({
      carrierSeq: write.value.carrierSeq,
      shadowedSeqs: write.value.shadowedSeqs,
      resendMessageId: taken ? resendMessageId : undefined,
    })
  } catch (error) {
    logWarning(ctx, `resend.apply failed unexpectedly while rewinding ${JSON.stringify(sessionId)}: ${describeError(error)}`)
    return replay?.saved?.restored ? stoppedAfterRestore(replay.saved, 'rewind-failed') : failure('internal')
  }
}

/** The unary Remote method surface (spec §4.1). */
export class ResendService extends Service {
  /**
   * @param ctx - the context this row was activated with. Captured rather than
   *   read back later: `ctx` is a property Cordis TRACES, so a read of it inside
   *   a method resolves to the CALLER's context, not this row's — and the
   *   caller's fiber is the root fiber, which is ACTIVE forever. §4.4 step 1 is
   *   only observable through the row's own fiber, and service resolution is
   *   only honest through the context the plugin was loaded with.
   */
  constructor(ctx) {
    super(ctx, SERVICE)
    this.hostCtx = ctx
    this.ownerFiber = ctx.fiber
    fileVersions.set(ctx, createFileVersions(ctx))
    const pending = new Map()
    replayPlans.set(ctx, pending)
    ctx.on('session/disposed', session => {
      for (const [id, saved] of pending) if (saved.session.id === session.id) pending.delete(id)
    })
    ctx.effect(() => () => { pending.clear() })
    this.typertRemote = Object.freeze({ service: this, serviceKey: SERVICE, namespace: NAMESPACE })
  }

  /**
   * One edit-and-resend or regenerate: rewind the range, then resend the prompt
   * — or, when the rewind already landed and its prompt never reached the agent,
   * only the resend (spec §5.5, §9.4).
   *
   * Every diagnosable line for an unexpected fault goes through `logWarning`
   * (spec §11, §12); every business refusal is legible to the user as one of the
   * closed codes and is never logged.
   * @param request - `ResendApplyRequest`, already boundary-validated by the
   *   Gateway through this descriptor's strict codec (spec §6.3 rule 5).
   * @returns `RemoteResult<ResendApplyResult>`; never a rejection for a business
   *   outcome (spec §4.5).
   */
  async apply(request, replay) {
    const ctx = this.hostCtx
    const fiber = this.ownerFiber

    // §4.4 step 1 — teardown in progress. This host has no session-level pause
    // state (nothing in `dsh-session` or `dsh-agent` carries one), so the
    // observable half of this precondition is this row's own fiber no longer
    // being ACTIVE. A service call that arrives that late must not write — and a
    // caller that captured this reference before the row was disposed is exactly
    // how such a call happens.
    if (fiber !== undefined && fiber.state !== FIBER_ACTIVE) return failure('internal')

    // §4.4 step 2 — malformed input, then the session.
    const sessionId = request?.sessionId
    const targetSeq = request?.targetSeq
    const op = request?.op
    if (typeof sessionId !== 'string' || sessionId === '') return failure('bad-request')
    if (op !== 'edit' && op !== 'regenerate') return failure('bad-request')
    if (op === 'edit' && typeof request.text !== 'string') return failure('bad-request')
    // The codec validates the wire shape (`z.number()`), not seq addressability:
    // a seq is a non-negative safe integer, and anything else is malformed input
    // rather than a message that never existed (§4.5).
    if (!Number.isSafeInteger(targetSeq) || targetSeq < 0) return failure('bad-request')

    const sessions = hostService(ctx, 'sessions')
    if (sessions === undefined) return failure('internal')
    const sessionRead = guarded(() => sessions.get(sessionId))
    if (sessionRead.code !== undefined) {
      logWarning(ctx, `resend.apply could not read sessions.get(${JSON.stringify(sessionId)}): ${sessionRead.detail}`)
      return failure(sessionRead.code)
    }
    const session = sessionRead.value
    if (session === undefined) return failure('session-not-found')

    // §4.4 steps 3–4 — the agent, and `agent-busy` as user-visible behaviour:
    // the user stops a streaming reply themselves, and this plugin never
    // cancels an in-flight turn on their behalf.
    const agents = hostService(ctx, 'agents')
    if (agents === undefined) return failure('internal')
    const agentRead = guarded(() => agents.get(sessionId))
    if (agentRead.code !== undefined) {
      logWarning(ctx, `resend.apply could not read agents.get(${JSON.stringify(sessionId)}): ${agentRead.detail}`)
      return failure(agentRead.code)
    }
    const agent = agentRead.value
    if (agent === undefined) return failure('agent-unavailable')
    if (agent.status !== 'idle') return failure('agent-busy')

    // §4.6 — one per-session lock, held across target resolution, both appends,
    // the flush and (ticket 05) the resend: two clicks must not interleave into
    // two rewinds of the same session. The live surface is read INSIDE the lock,
    // because a call that waited behind another rewind has to plan against the
    // surface that rewind left behind — never against what it saw before
    // queueing.
    return fileVersions.get(ctx).withOperation(sessionId, 'editing', () =>
      withSessionLock(sessionId, () => rewind(ctx, { session, agent, sessions, sessionId, request, replay })))
  }

  /** Preflight choices are host-owned; clients cannot replace their prompt or range. */
  async replay(request) {
    if (this.ownerFiber !== undefined && this.ownerFiber.state !== FIBER_ACTIVE) return replayFailure('internal')
    if (request?.phase === 'start') return this.apply(request.request, { phase: 'start' })
    if (!['preview', 'restore', 'keep', 'cancel'].includes(request?.phase)) return replayFailure('bad-request')
    const ctx = this.hostCtx
    const saved = replayPlans.get(ctx).get(request.preflightId)
    if (!saved || saved.session.id !== request.sessionId) return replayFailure('plan-not-found')
    if (request.phase === 'cancel') return fileVersions.get(ctx).withOperation(request.sessionId, 'editing', () =>
      withSessionLock(request.sessionId, async () => {
        if (replayPlans.get(ctx).get(saved.id) !== saved) return replayFailure('plan-not-found')
        replayPlans.get(ctx).delete(saved.id)
        if (saved.generation === fileVersions.get(ctx).generation(request.sessionId)) {
          await saved.versions.rollback({ phase: 'cancel', planId: saved.preview.value.planId })
        }
        await saved.versions.discardUnlessWritten()
        return { ok: true, value: { canceled: true } }
      }))
    return this.apply(saved.request, { phase: request.phase, saved, selected: request.selected })
  }

  async rollback(request) {
    if (this.ownerFiber !== undefined && this.ownerFiber.state !== FIBER_ACTIVE) return failure('internal')
    return fileVersions.get(this.hostCtx).withOperation(request.sessionId, 'rolling-back', () =>
      withSessionLock(request.sessionId, () => fileVersions.get(this.hostCtx).rollback(request)))
  }

  async content(request) {
    if (this.ownerFiber !== undefined && this.ownerFiber.state !== FIBER_ACTIVE) return replayFailure('plan-not-found')
    const ctx = this.hostCtx
    return fileVersions.get(ctx).withOperation(request.sessionId, 'rolling-back', () =>
      withSessionLock(request.sessionId, async () => {
        if (request.source === 'history') return fileVersions.get(ctx).content(request)
        const saved = replayPlans.get(ctx).get(request.preflightId)
        if (!saved || saved.session.id !== request.sessionId || saved.preview.value.planId !== request.planId ||
            saved.generation !== fileVersions.get(ctx).generation(request.sessionId)) return replayFailure('plan-not-found')
        const resolution = await resolveTarget(ctx, saved.request, saved.session.surface.nodes)
        if (!resolution.ok || resolution.value.endSeq !== saved.plan.endSeq ||
            JSON.stringify(resolution.value.shadowedSeqs) !== JSON.stringify(saved.plan.shadowedSeqs)) return replayFailure('preview-stale')
        return saved.versions.content(request)
      }))
  }

  async cleanup(request) {
    if (this.ownerFiber !== undefined && this.ownerFiber.state !== FIBER_ACTIVE) return failure('internal')
    return fileVersions.get(this.hostCtx).cleanup(request)
  }

  /** Read-only eligibility shared by every reply control on the client. */
  async conversation(request) {
    if (this.ownerFiber !== undefined && this.ownerFiber.state !== FIBER_ACTIVE) return failure('internal')
    if (typeof request?.sessionId !== 'string' || request.sessionId === '') return failure('bad-request')
    const ctx = this.hostCtx
    try {
      const session = hostService(ctx, 'sessions')?.get(request.sessionId)
      if (session === undefined) return failure('session-not-found')
      return await withSessionLock(request.sessionId, async () => {
        const result = await effectiveConversationEligibility(ctx, session)
        return result.ok ? result : failure(result.error.code)
      })
    } catch (error) {
      logWarning(ctx, `resend.conversation failed: ${describeError(error)}`)
      return failure('internal')
    }
  }
}
