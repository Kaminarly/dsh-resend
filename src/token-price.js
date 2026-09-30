/**
 * The official shadow price of the range being rewound (spec §5.3, §13.2 #18).
 *
 * The number this module produces ends up in the audit claim's
 * `shadowedTokenCount`, and the host's own fold consumes it: the metering event
 * immediately before a surface `replace` states the price of the exact replaced
 * range, and the fold subtracts that price from `surfaceTokens`. Get it wrong
 * and the user's context pressure is silently wrong in one of two directions —
 * a node count overestimates (compaction fires early), and arithmetic that does
 * not match the host's estimator drifts forever.
 *
 * So the price is never computed here. `estimateMessage` comes from the meter
 * SERVICE — the same function the host's own `foldSurfaceProjection` calls
 * (`@dsh-token-meter/lib/index.js`: the instance method delegates to the module
 * export the fold itself uses) — and `deriveEventMessage` comes from
 * `@deepseek-ai/dsh-session`, which owns what an event derives to. A copied
 * formula would turn "agrees with the host" into a claim that can never fail,
 * which is the opposite of a check (spec §5.3).
 *
 * **If the meter is unavailable, the write is refused** and reported `internal`
 * (spec §5.3, §11): a node count or a skipped claim both corrupt a number the
 * user cannot see.
 */
import { deriveEventMessage } from '@deepseek-ai/dsh-session'
import { hostService } from './host.js'

/**
 * Resolve the official meter, exactly as spec §5.3 says to.
 *
 * `hostService` is `ctx.get('tokenMeter') ?? ctx.tokenMeter` — the accessor and
 * the inject-guarded property read — and it resolves only because the host half
 * declares `tokenMeter` in its own `inject` list (spec §3.1, §16.6).
 * @param ctx - the host context.
 * @returns `{ meter }` when the service exists and carries the estimator, or
 *   `{ detail }` naming what is missing — never a substitute for the price.
 */
export function shadowPriceSource(ctx) {
  const meter = hostService(ctx, 'tokenMeter')
  if (meter === undefined) {
    return { detail: 'the tokenMeter service is not in this composition; refusing to write an audit claim without the official shadow price (spec §5.3)' }
  }
  if (typeof meter.estimateMessage !== 'function') {
    return { detail: 'the tokenMeter service carries no estimateMessage(); refusing to write an audit claim without the official shadow price (spec §5.3)' }
  }
  return { meter }
}

/**
 * The official price of ONE node (spec §5.3):
 *
 * ```
 * deriveEventMessage(event) === null ? 0 : estimateMessage(deriveEventMessage(event))
 * ```
 *
 * A node that derives to no message — an empty-content system, developer or
 * assistant message — is worth zero, which is the host's own rule for a
 * non-producing event. A node whose derivation is neither `null` nor a message
 * is a host shape this plugin does not understand, and it throws rather than
 * guessing a price.
 * @param meter - the resolved `tokenMeter` service.
 * @param event - one shadowed surface node.
 * @returns a non-negative integer.
 * @throws when the event derives to something that is not a message.
 */
function officialNodePrice(meter, event) {
  const message = deriveEventMessage(event)
  if (message === null) return 0
  if (message === undefined) {
    throw new TypeError(`dsh-resend: the event at seq ${String(event?.seq)} (${String(event?.type)}) derives no message, so its official price is undefined (spec §5.3)`)
  }
  return meter.estimateMessage(message)
}

/**
 * The price the audit claim states: the sum over every shadowed node.
 * @param meter - the resolved `tokenMeter` service.
 * @param events - the shadowed surface nodes, in surface order.
 * @returns a non-negative safe integer.
 * @throws when a price is not a non-negative integer, or the sum leaves the
 *   safe range — the host's own claim schema is a non-negative integer, so a
 *   value outside that is refused here rather than written.
 */
export function shadowedTokenCount(meter, events) {
  let total = 0
  for (const event of events) {
    const price = officialNodePrice(meter, event)
    if (!Number.isSafeInteger(price) || price < 0) {
      throw new TypeError(`dsh-resend: the official price of the node at seq ${String(event?.seq)} is ${String(price)}, not a non-negative integer (spec §5.3)`)
    }
    total += price
  }
  if (!Number.isSafeInteger(total)) {
    throw new RangeError(`dsh-resend: the shadowed-token sum ${String(total)} is outside the safe integer range (spec §5.3)`)
  }
  return total
}
