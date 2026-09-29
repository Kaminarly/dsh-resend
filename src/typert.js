/**
 * The ONE descriptor table both faces of the bundle derive from (spec §6.1).
 *
 * Two hand-written faces exist because the Host plugin registers a contribution
 * and the Client plugin mounts one; they are generated from this single table so
 * they cannot drift. `scripts/check-typert.mjs` proves that by deep-comparing
 * the two faces it imports from `lib/`.
 *
 * Skeleton (ticket 01): empty. Ticket 02 adds the unary `resend/apply`
 * invocation — `invocation: { kind: 'direct' }`, no `mode`, no `scope`, no
 * lookup parameter, no `cancellation` — together with its strict request and
 * result schemas.
 */

/** Package name as it appears on the wire and in every key. */
export const PACKAGE = 'dsh-resend'

/** Schema records: `{ name, create }`, each `create` a schema factory. */
export const schemas = []

/** Invocation descriptors, shared verbatim by both faces. */
export const descriptors = []