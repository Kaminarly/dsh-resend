/**
 * dsh-resend — Host plugin (`main` → lib/index.js).
 *
 * The Host plugin is the half that owns everything that writes: the rewind, the
 * descriptor, and the policy. It is loaded as one ordinary Loader row by
 * cordis.patch.yml; the Client plugin (`exports["./client"]`) owns every
 * rendered element.
 *
 * Spec §6.5: this half registers the descriptor table and creates the service
 * the Gateway dispatches to. The registration is owned by this row's fiber for
 * its whole life — `ctx.typert.register()`'s effect disposer is the only thing
 * that removes it — which is what keeps the withdrawal latch (an endpoint once
 * seen as strict can never fall back to the reflection path) from ever firing
 * while calls can still arrive.
 */
import { ENDPOINT, endpointOf, SERVICE } from './typert.js'
import { ResendService } from './resend.js'
import { TYPERT } from './typert.host.js'

export const name = 'dsh-resend'

/**
 * The services this half reads (spec §3.1).
 *
 * `typert` is required, not optional: Cordis refuses **any** service property
 * read on a fiber that does not inject that service (`cannot get property
 * "<name>" without inject`), so `ctx.typert.register` is unreachable without it
 * (spec §3.1, §16.6 — where the empty-`inject` probe that "proved" the registry
 * absent is recorded as a trap, not evidence).
 *
 * The other four are what the operation reads: the live session, the agent
 * whose idle state is a precondition, and the two log routes §4.2 builds on
 * (`sessionQuery` for the covering read, `sessionPersistence` for
 * `fileMaxSeq`). §3.1 puts them here rather than in a child fiber because they
 * certainly exist in this composition; a service that never resolves would
 * leave this row permanently PENDING, which fails `assertEntriesActive()` and
 * the whole renderer will not boot. `tokenMeter` joins this list in ticket 04,
 * where the write first reads it.
 */
export const inject = ['sessions', 'agents', 'sessionQuery', 'sessionPersistence', 'typert']

/**
 * Activate the Host half: create the service the Gateway dispatches to, register
 * the descriptor table, and report what the registry actually committed.
 *
 * The registration is owned by this row's fiber — `ctx.typert.register()`'s
 * effect disposer is the only thing that removes it — which is what keeps the
 * Gateway's "seen strict, then withdrawn" latch from ever firing while calls can
 * still arrive (spec §6.5).
 * @param ctx - the fiber's context, which provides the services in {@link inject}.
 */
export function apply(ctx) {
  // The receiver exists before the descriptor that names it is committed: the
  // registry emits its change synchronously inside `register()`, and a listener
  // that reacts by calling the endpoint must not find the service missing.
  new ResendService(ctx)
  ctx.typert.register(TYPERT)

  // Read the registration back out of the registry rather than off the table:
  // the boot log then reports what the host actually committed, not what this
  // file intended to commit.
  const endpoints = ctx.typert.local
    .list()
    .filter((descriptor) => descriptor.service === SERVICE)
    .map(endpointOf)

  ctx.root.logger?.('dsh-resend')?.info(
    `dsh-resend host half loaded — Remote endpoints registered: ${endpoints.join(', ') || 'none'}. ` +
      `${ENDPOINT} resolves its target, its range and its resend text from a covering log read; this build ` +
      `stops at the write boundary, so a fully resolved plan refuses with "internal" until ticket 04 lands the pair.`,
  )
}
