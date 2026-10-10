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
import Schema from '@deepseek-ai/schemastery'

/** Live fields update in place through the Loader; the chat client never remounts. */
export const Config = Schema.object({
  inlineEditorBeneathMessage: Schema.boolean().default(true).volatile(),
  regenerateLastReply: Schema.boolean().default(true).volatile(),
  restrictRegenerateToLastReply: Schema.boolean().default(true).volatile(),
})
// Repair each legacy field independently before standard validation. Keep the
// boolean form schema intact for SettingsForms and the Loader's volatile paths.
const validateConfig = Config['~standard'].validate
Object.defineProperty(Config, '~standard', { value: {
  ...Config['~standard'],
  validate(raw) {
    const values = raw !== null && typeof raw === 'object' && !Array.isArray(raw) ? { ...raw } : {}
    for (const field of Object.keys(Config.dict)) {
      if (typeof values[field] !== 'boolean') values[field] = true
    }
    return validateConfig(values)
  },
} })

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
 * The other five are what the operation reads: the live session, the agent
 * whose idle state is a precondition, the two log routes §4.2 builds on
 * (`sessionQuery` for the covering read, `sessionPersistence` for
 * `fileMaxSeq`), and `tokenMeter` — the write's own dependency (§5.3). §3.1 puts
 * them here rather than in a child fiber because they certainly exist in this
 * composition; a service that never resolves would leave this row permanently
 * PENDING, which fails `assertEntriesActive()` and the whole renderer will not
 * boot. For the meter that boot-level failure is the point: the audit claim's
 * price must be the OFFICIAL one, and the write is refused with `internal`
 * rather than substituting a node count when the estimator is missing (a
 * composition that lacks the whole service fails the boot audit loudly instead
 * of silently degrading a number the user cannot see).
 */
export const inject = ['sessions', 'agents', 'sessionQuery', 'sessionPersistence', 'tokenMeter', 'typert']

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
  ctx.inject(['settings'], (scope) => {
    scope.effect(() => scope.settings.configure({ auto: false }, ctx.fiber))
  })
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
      `${ENDPOINT} resolves its target, its range and its resend text from a covering log read, then writes the rewind as one ` +
      `pair — the audit claim (compaction/prune) and its carrier (user/message) — validated together before either append and ` +
      `flushed once. The resend itself is ticket 05.`,
  )
}
