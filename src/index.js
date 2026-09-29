/**
 * dsh-resend — Host plugin (`main` → lib/index.js).
 *
 * The Host plugin is the half that owns everything that writes: the rewind, the
 * descriptor, and the policy. It is loaded as one ordinary Loader row by
 * cordis.patch.yml; the Client plugin (`exports["./client"]`) owns every
 * rendered element.
 *
 * Skeleton (ticket 01): the row activates and contributes no behavior yet.
 */
export const name = 'dsh-resend'

/**
 * The services this half reads.
 *
 * Deliberately empty in the skeleton. Cordis refuses any service property read
 * on a fiber that does not inject that service, but the reverse mistake is the
 * expensive one: a name listed here that never resolves in the composition
 * leaves this fiber PENDING forever, which fails the startup audit and keeps
 * the whole renderer from booting (spec §3.1). Anything uncertain belongs in a
 * child fiber (`ctx.inject([...], ...)`), whose absence disables one feature
 * instead of the app.
 *
 * Ticket 02 adds `typert`; the operation tickets add `sessions`, `agents`,
 * `sessionQuery`, `sessionPersistence`, and `tokenMeter` as they are imported.
 */
export const inject = []

export function apply(ctx) {
  // The skeleton reads no service. It announces itself so a boot log — or the
  // probe profile that installs this bundle — shows the row actually activated.
  ctx.root.logger?.('dsh-resend').info('dsh-resend host half loaded (skeleton: no operations yet)')
}