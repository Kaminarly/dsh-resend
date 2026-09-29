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
import { ResendService } from './resend.js'
import { ENDPOINT, endpointOf, SERVICE } from './typert.js'
import { TYPERT } from './typert.host.js'

export const name = 'dsh-resend'

/**
 * The services this half reads.
 *
 * `typert` is required, not optional: Cordis refuses **any** service property
 * read on a fiber that does not inject that service (`cannot get property
 * "<name>" without inject`), so `ctx.typert.register` is unreachable without it
 * (spec §3.1, §16.6 — where the empty-`inject` probe that "proved" the registry
 * absent is recorded as a trap, not evidence).
 *
 * The operation tickets add `sessions`, `agents`, `sessionQuery`,
 * `sessionPersistence` and `tokenMeter` as they are first read. Anything
 * optional and uncertain belongs in a child fiber (`ctx.inject([...], …)`),
 * whose absence disables one feature instead of leaving this fiber — and with
 * it the whole renderer — permanently PENDING.
 */
export const inject = ['typert']

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
      `Operation semantics are not implemented in this build: every ${ENDPOINT} call refuses with "internal".`,
  )
}
