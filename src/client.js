/**
 * dsh-resend — Client plugin (`exports["./client"]` → lib/client.bundle.js).
 *
 * The Client plugin is the half that owns every rendered element. It is built
 * into a classic script that self-registers one factory with the Web client
 * module loader — `window.__ModuleLoader__.load({ id: 'dsh-resend', factory })`.
 * The factory runs at materialization time and its `require` is the client
 * module table, so every bare specifier it asks for must be either a platform
 * seed word or another registered package; anything else throws a module-table
 * miss at load time. That is why a client-side dependency is declared in
 * `dsh.client.inject` (arrival order) rather than imported freely.
 *
 * Skeleton (ticket 01): registers nothing, so the fiber activates immediately.
 */
export const name = 'dsh-resend'

/**
 * The client services this half reads. Empty in the skeleton, for the same
 * reason as the host half's list: a client plugin that waits on a service the
 * Web composition does not provide never activates, and the client boot audit
 * fails.
 *
 * Ticket 02 adds `remote` (the API Gateway client service) when `$mount`
 * lands; the UI tickets add `slots` and `locale`.
 */
export const inject = []

export function apply(ctx) {
  // Skeleton: no slot registrations and no Remote mount yet. The half reads
  // nothing, which is what keeps its fiber active on any composition.
}