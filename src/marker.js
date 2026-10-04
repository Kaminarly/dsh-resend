/**
 * The plugin's own event identities, in one place (spec §5.4).
 *
 * Two events this plugin writes carry an id a later reader has to recognize:
 *
 *  - the **carrier** — `dsh-resend-<op>-<uuid>` — the invisible `user/message`
 *    that performs the rewind. Its id is the only place marker identity can
 *    live, because `MessageSourceMap` is a closed union of 17 kinds and a plugin
 *    cannot invent a `source.kind` (spec §5.4).
 *  - the **resend message** — `<carrier id>-resend` — the real user turn the
 *    `followup` queues. §4.1's `resendMessageId` is literally "the id of the
 *    message queued to the agent", so this is the identity that ends up on that
 *    message.
 *
 * The second is DERIVED from the first, and that is the whole point of this
 * module: the pair has to be inferable from the log alone. Ticket 05's
 * "Send again" is a re-send without a second rewind, and the only honest way to
 * know whether a carrier's prompt was ever queued is to look for the message
 * that would carry the derived id. Two independently minted UUIDs (the shape
 * this module replaces) made that unanswerable, and the answer must survive a
 * host restart — in-memory bookkeeping would not.
 *
 * Pure on purpose, and no imports: the client bundle inlines this module to
 * recognize the carrier it renders a row for, so anything host-bound (the uuid
 * source, a session type) is passed IN rather than reached for here.
 */

/** The stable prefix every identity this plugin mints carries (spec §5.4). */
export const MARKER_PREFIX = 'dsh-resend-'

/**
 * The carrier id for one operation.
 *
 * `uuid` is injected rather than imported so this module stays free of host
 * packages: the one caller that mints (`./resend.js`) gets it from
 * `@deepseek-ai/dsh-util-crypto`.
 * @param op - the operation (`'edit'` or `'regenerate'`).
 * @param uuid - a fresh unique string.
 * @returns `dsh-resend-<op>-<uuid>`.
 */
export function carrierIdFor(op, uuid) {
  return `${MARKER_PREFIX}${op}-${uuid}`
}

/**
 * The resend message's id for one carrier — the message §4.1's
 * `resendMessageId` names.
 * @param carrierId - the carrier's own id.
 * @returns `<carrier id>-resend`.
 */
export function resendIdFor(carrierId) {
  return `${carrierId}-resend`
}

/**
 * Whether an id is one this plugin minted, whatever the operation.
 *
 * The op-agnostic form, for the readers that only care about "is this ours" —
 * the write's own prefix contract, and the client's row, which renders a rewind
 * point for either operation.
 * @param id - a candidate id, from anywhere.
 * @returns true when it is a string carrying the plugin's prefix.
 */
export function hasMarkerPrefix(id) {
  return typeof id === 'string' && id.startsWith(MARKER_PREFIX)
}

/**
 * Whether an id names a carrier of THIS plugin's, for this operation.
 *
 * The prefix alone is not enough: a regenerate must not be answered by an edit
 * carrier's prompt (the text is derived per operation), and a carrier another
 * plugin wrote must never be mistaken for one of ours.
 * @param op - the operation the caller is resolving for.
 * @param id - the id found on a surface-replacement `user/message`.
 * @returns true when the id is one of ours for that operation.
 */
export function isCarrierIdFor(op, id) {
  return hasMarkerPrefix(id) && id.startsWith(`${MARKER_PREFIX}${op}-`)
}
