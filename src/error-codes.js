/**
 * The closed business-error vocabulary (spec §4.5), in the spec's table order.
 *
 * Its own module because two unrelated readers need exactly this list and
 * nothing else: the descriptor table, which turns it into the result codec's
 * discriminated union, and the resolver, which checks every code it produces
 * against it. Keeping it out of the descriptor table is also what lets the
 * resolver be a small artifact instead of dragging zod's schemas along with it.
 *
 * Closed means closed: a code invented downstream fails the descriptor gate
 * instead of reaching a user who cannot act on it.
 */
export const ERROR_CODES = Object.freeze([
  'bad-request',
  'session-not-found',
  'agent-unavailable',
  'agent-busy',
  'message-not-found',
  'message-pending',
  'target-shadowed',
  'not-user-message',
  'not-last-reply',
  'not-assistant-message',
  'blank-text',
  'no-text',
  'internal',
])

/**
 * Refuse a code outside the vocabulary at its producer.
 *
 * Two shapes carry a code out of this plugin — the internal refusal below and the
 * frozen wire envelope `failure()` builds — and both must refuse a typo in the
 * same words. Nothing decodes a result at runtime (spec §16.5), so this is the
 * only place such a typo can be caught.
 * @param code - the code about to leave the plugin.
 * @throws a `TypeError` naming the vocabulary when `code` is not one of them.
 */
export function assertCode(code) {
  if (!ERROR_CODES.includes(code)) {
    throw new TypeError(`dsh-resend: ${JSON.stringify(code)} is not one of the ${ERROR_CODES.length} result codes (spec §4.5)`)
  }
}

/**
 * One business refusal, in the shape every internal stage of this plugin
 * returns (spec §4.5).
 *
 * Not the wire envelope: `apply` freezes a code into `RemoteResult` at the
 * boundary, and the optional `detail` here is a diagnostic for the host log
 * that must not travel to the client. Two stages refuse — resolution and the
 * write — and they share this one constructor so a code cannot enter the
 * vocabulary through a second, unvalidated path.
 * @param code - one of `ERROR_CODES`.
 * @param detail - an optional diagnostic for the host log.
 * @returns `{ ok: false, error: { code } }`, or the same with `detail`.
 */
export function refuse(code, detail) {
  assertCode(code)
  return { ok: false, error: detail === undefined ? { code } : { code, detail } }
}
