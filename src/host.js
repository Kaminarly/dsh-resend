/**
 * Host access, in one place: how this plugin resolves a host service and how it
 * renders a thrown value into a log-safe line.
 *
 * Small on purpose. The host half reads four services, but every read goes
 * through the same accessor, and the reason it is an accessor rather than a
 * property read is a measured host fact: Cordis refuses ANY service property
 * read on a fiber that does not inject that service (`cannot get property
 * "<name>" without inject`), so `ctx.get(name)` — the documented inject-free
 * accessor — is the honest presence test (spec §3.1, §16.6). The property read
 * behind it is legal because this plugin declares these services in its `inject`
 * list, and it is the idiom the spec itself uses for `tokenMeter` (§5.3).
 */

/**
 * Resolve one host service by the key the host registers it under.
 * @param ctx - the host context.
 * @param name - the service key (`super(ctx, "<name>")` in the host package).
 * @returns the service, or `undefined` when this composition has none.
 */
export function hostService(ctx, name) {
  return ctx.get(name) ?? ctx[name]
}

/**
 * Render a thrown value as a short, log-safe line.
 * @param error - whatever was caught.
 * @returns its message when it has one, else its string form.
 */
export function describeError(error) {
  if (error === null || error === undefined) return String(error)
  return typeof error.message === 'string' && error.message !== '' ? error.message : String(error)
}

/**
 * An array answer, or an empty one.
 *
 * The host's read results are `unknown`-shaped as far as this plugin is
 * concerned: a field it expected to be a list may be absent on a shape it has
 * never seen. Coercing once, by name, keeps every reader from re-inventing the
 * guard.
 * @param value - whatever the host returned for a list field.
 * @returns the value when it is an array, else `[]`.
 */
export function asArray(value) {
  return Array.isArray(value) ? value : []
}

/**
 * Write one diagnosable line to the host log, under this plugin's name.
 *
 * Only unexpected states reach here — every business refusal is already legible
 * to the user as one of the closed codes — so this never fires on a normal
 * refusal, and never at boot (spec §11, §12).
 * @param ctx - the host context.
 * @param detail - what happened, in the host's own words.
 */
export function logWarning(ctx, detail) {
  ctx.root.logger?.('dsh-resend')?.warn(`dsh-resend: ${detail}`)
}
