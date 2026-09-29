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
 */
import { Service } from '@deepseek-ai/cordis'
import { ERROR_CODES, NAMESPACE, SERVICE } from './typert.js'

/**
 * Build the `ok: false` branch of the result envelope (spec §4.5).
 *
 * A code outside the closed vocabulary is refused at the producer rather than
 * shipped: nothing decodes a result at runtime (§16.5), so this is the only
 * place such a typo can be caught.
 * @param code - one of `ERROR_CODES`.
 * @returns a frozen `RemoteResult` failure.
 */
function failure(code) {
  if (!ERROR_CODES.includes(code)) {
    throw new TypeError(`dsh-resend: ${JSON.stringify(code)} is not one of the ${ERROR_CODES.length} result codes (spec §4.5)`)
  }
  return Object.freeze({ ok: false, error: Object.freeze({ code }) })
}

/** The unary Remote method surface (spec §4.1). */
export class ResendService extends Service {
  /** @param ctx - the Host plugin's context, which owns this Service's lifetime. */
  constructor(ctx) {
    super(ctx, SERVICE)
    this.typertRemote = Object.freeze({ service: this, serviceKey: SERVICE, namespace: NAMESPACE })
  }

  /**
   * One edit-and-resend or regenerate: rewind, then resend (spec §1, §4.1).
   *
   * The contract is in place; the semantics are not. Target resolution, the
   * rewind pair (§5.1–§5.4) and the resend (§5.5) land in tickets 03–05. Until
   * they do, every call refuses rather than pretending: a fabricated success
   * would tell the client a message was queued that never was. `internal` is the
   * closed vocabulary's only code for "this build cannot serve the request", and
   * the row logs that state once at startup.
   * @param request - `ResendApplyRequest`, already boundary-validated by the
   *   Gateway through this descriptor's strict codec (spec §6.3 rule 5).
   * @returns `RemoteResult<ResendApplyResult>`; never a rejection for a business
   *   outcome (spec §4.5).
   */
  apply(request) {
    return failure('internal')
  }
}
