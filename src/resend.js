/**
 * The `resend` service — the receiver the API Gateway dispatches `resend/apply`
 * to (spec §6.1, §6.5).
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
 * failure carrying one of the closed vocabulary's codes — and it writes nothing
 * in this build: the resolution is complete, the write is ticket 04's.
 */
import { Service } from '@deepseek-ai/cordis'
import { assertCode } from './error-codes.js'
import { describeError, hostService, logWarning } from './host.js'
import { resolveTarget } from './resolve.js'
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

/** The unary Remote method surface (spec §4.1). */
export class ResendService extends Service {
  /** @param ctx - the Host plugin's context, which owns this Service's lifetime. */
  constructor(ctx) {
    super(ctx, SERVICE)
    this.typertRemote = Object.freeze({ service: this, serviceKey: SERVICE, namespace: NAMESPACE })
  }

  /**
   * One edit-and-resend or regenerate: resolve the target, the range and the
   * resend text — and write nothing (spec §4.3–§4.5; ticket 03).
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
    const fiber = this.ctx.fiber

    // §4.4 step 1 — teardown in progress. This host has no session-level pause
    // state (nothing in `dsh-session` or `dsh-agent` carries one), so the
    // observable half of this precondition is this row's own fiber no longer
    // being ACTIVE. A service call that arrives that late must not write.
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

    const sessions = hostService(this.ctx, 'sessions')
    if (sessions === undefined) return failure('internal')
    const sessionRead = guarded(() => sessions.get(sessionId))
    if (sessionRead.code !== undefined) {
      logWarning(this.ctx, `resend.apply could not read sessions.get(${JSON.stringify(sessionId)}): ${sessionRead.detail}`)
      return failure(sessionRead.code)
    }
    const session = sessionRead.value
    if (session === undefined) return failure('session-not-found')

    // §4.4 steps 3–4 — the agent, and `agent-busy` as user-visible behaviour:
    // the user stops a streaming reply themselves, and this plugin never
    // cancels an in-flight turn on their behalf.
    const agents = hostService(this.ctx, 'agents')
    if (agents === undefined) return failure('internal')
    const agentRead = guarded(() => agents.get(sessionId))
    if (agentRead.code !== undefined) {
      logWarning(this.ctx, `resend.apply could not read agents.get(${JSON.stringify(sessionId)}): ${agentRead.detail}`)
      return failure(agentRead.code)
    }
    const agent = agentRead.value
    if (agent === undefined) return failure('agent-unavailable')
    if (agent.status !== 'idle') return failure('agent-busy')

    // §4.4 step 5 — target resolution, on the covering log, plus the live
    // surface it is checked against. Both facts come from live host state; the
    // client supplies no span and no shadowed-seq list (§4.3).
    const surfaceRead = guarded(() => session.surface.nodes)
    if (surfaceRead.code !== undefined) {
      logWarning(this.ctx, `resend.apply could not read the live surface of ${JSON.stringify(sessionId)}: ${surfaceRead.detail}`)
      return failure(surfaceRead.code)
    }
    const resolution = await resolveTarget(this.ctx, request, surfaceRead.value)
    if (!resolution.ok) {
      if (resolution.error.code === 'internal') logWarning(this.ctx, `resend.apply could not resolve the request: ${resolution.error.detail ?? 'no detail'}`)
      return failure(resolution.error.code)
    }

    // §5.1–§5.5 — the write (the audit claim and the carrier, then the resend).
    // NOT this ticket: ticket 04 lands the pair and ticket 05 the resend, so a
    // fully resolved plan stops here. `internal` is the vocabulary's only bucket
    // for "this build cannot serve the request"; fabricating a success envelope
    // would name a `carrierSeq` that does not exist. The result code cannot say
    // "resolved but unwritable", so the host log does — the state is
    // diagnosable even though the envelope is not (§02's handover note).
    logWarning(this.ctx, `a fully resolved ${op} plan for ${JSON.stringify(sessionId)} stopped at the write boundary (the rewind pair is ticket 04)`)
    return failure('internal')
  }
}
