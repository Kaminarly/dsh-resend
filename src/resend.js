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
 * one pair of events: the audit claim and its carrier (§5.2–§5.4). The resend
 * itself is ticket 05's.
 */
import { Service } from '@deepseek-ai/cordis'
import { assertCode } from './error-codes.js'
import { describeError, hostService, logWarning } from './host.js'
import { resolveTarget } from './resolve.js'
import { withSessionLock } from './session-lock.js'
import { traceTextNow } from './trace-text.js'
import { markerId, writeRewindPair } from './write.js'
import { NAMESPACE, SERVICE } from './typert.js'

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
 * Build the `ok: true` branch of the result envelope (spec §4.1).
 * @param value - `{ carrierSeq, shadowedSeqs, resendMessageId }`.
 * @returns a frozen `RemoteResult` success.
 */
function success(value) {
  return Object.freeze({ ok: true, value: Object.freeze(value) })
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
 * The locked body: resolve, write the pair, and answer.
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
async function rewind(ctx, { session, agent, sessions, sessionId, request }) {
  try {
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

    // §4.4's defensive precondition, in the one place it can still matter: a
    // turn that opened between the rule-4 check and this write. The plugin never
    // cancels the user's streaming reply (that is rule 4, and §9.2 has the user
    // stop it); this covers only the race, and its cancellation is the user's
    // own cause — `{ kind: 'user' }` — so nothing downstream reads it as a
    // plugin-initiated stop.
    if (agent.status !== 'idle') {
      agent.cancel?.({ kind: 'user' })
      await agent.whenIdle?.()
      if (agent.status !== 'idle') {
        logWarning(ctx, `resend.apply found a turn open on ${JSON.stringify(sessionId)} at the write boundary and it did not reach idle`)
        return failure('agent-busy')
      }
    }

    // §5.2–§5.4 — the pair. The identity the carrier and the resend message are
    // marked with is minted here, once per operation; the trace text is chosen
    // here, once, and is immutable in the log from then on (§10).
    const carrierMarker = markerId(op)
    const resendMessageId = markerId(`${op}-resend`)
    const write = await writeRewindPair(ctx, {
      sessions,
      session,
      sessionId,
      plan,
      carrierId: carrierMarker,
      traceText: traceTextNow(ctx),
    })
    if (!write.ok) {
      if (write.error.code === 'internal') {
        logWarning(ctx, `resend.apply could not write the rewind pair for ${JSON.stringify(sessionId)}: ${write.error.detail ?? 'no detail'}`)
      }
      return failure(write.error.code)
    }

    // The resend is ticket 05's: the carrier renders nothing, so the message
    // queued to the agent is the only new row the user sees. Until it lands,
    // `resendMessageId` is the identity this operation reserved for it — and
    // §4.1's field is literally "id of the message queued to the agent", so
    // ticket 05 must hand THIS id to `followup` as the input's own `id` member:
    // the agent loop appends the claimed inbox input verbatim
    // (`@dsh-agent-loop/lib/index.js:1061`), so that member is what the queued
    // `user/message` ends up carrying. Two traps for that ticket: the input must
    // be the plain four-member message (`{ role, id, content, source }`), and it
    // must NOT be routed through `createUserMessage` — the `createMessage`
    // helper behind it overwrites `id` with a fresh UUID
    // (`@deepseek-ai/dsh-llm`: `lib/index.js:37-42` on the pinned 0.2.0-rc.1,
    // `lib/types/message.js` on 0.2.0-rc.2), which would disconnect the envelope
    // from the row it names. Without both, ticket 05's own checklist and this
    // field are mutually unsatisfiable.
    return success({ carrierSeq: write.value.carrierSeq, shadowedSeqs: write.value.shadowedSeqs, resendMessageId })
  } catch (error) {
    logWarning(ctx, `resend.apply failed unexpectedly while rewinding ${JSON.stringify(sessionId)}: ${describeError(error)}`)
    return failure('internal')
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
    this.typertRemote = Object.freeze({ service: this, serviceKey: SERVICE, namespace: NAMESPACE })
  }

  /**
   * One edit-and-resend or regenerate: rewind the range, then (ticket 05)
   * resend the prompt.
   *
   * Every diagnosable line for an unexpected fault goes through `logWarning`
   * (spec §11, §12); every business refusal is legible to the user as one of the
   * closed codes and is never logged.
   * @param request - `ResendApplyRequest`, already boundary-validated by the
   *   Gateway through this descriptor's strict codec (spec §6.3 rule 5).
   * @returns `RemoteResult<ResendApplyResult>`; never a rejection for a business
   *   outcome (spec §4.5).
   */
  async apply(request) {
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
    return withSessionLock(sessionId, () => rewind(ctx, { session, agent, sessions, sessionId, request }))
  }
}
