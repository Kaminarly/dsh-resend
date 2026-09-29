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
 * `dsh.client.inject` (arrival order) rather than imported freely — and why the
 * descriptor table and its zod schemas are *bundled* rather than imported
 * (spec §6.6).
 *
 * Spec §6.5: this half mounts the same contribution the Host half registers.
 */
import { TYPERT_REMOTE } from './typert.client.js'

/**
 * The contribution this half mounts, re-exported.
 *
 * The browser bundle inlines its own copy of the shared table, so the copy that
 * actually reaches `ctx.remote.$mount` is not the one `lib/typert.client.js`
 * exports. Publishing it is what lets `scripts/check-typert.mjs` read the copy
 * back out of the built bundle and prove the two are the same contract.
 */
export { TYPERT_REMOTE }

export const name = 'dsh-resend'

/**
 * The client services this half reads.
 *
 * `remote` is the API Gateway's Client service: `$mount` is the only way a
 * plugin's client half publishes a Remote contribution. The UI tickets add
 * `slots` and `locale`.
 */
export const inject = ['remote']

/** This page's one mount state, replaced (never mutated in place) as the attempt settles. */
let mount = { status: 'pending', error: undefined }

/**
 * The outcome of this page's one mount attempt.
 *
 * A feature switch, not a diagnostic: the UI registrations land in tickets 06–08
 * and must not mount half a feature when the Remote contribution did not, and
 * this is the switch they will read. Until they land, it is what makes the
 * containment below observable at all — the mount's failure has to be *recordable*
 * somewhere other than a log line. The failure is also logged loudly at the call
 * site.
 *
 * One page load materializes this factory once, so this is that page's answer.
 * If a later activation is refused while an earlier mount is still live, the
 * switch still reads `failed` while calls keep working: spec §6.5 asks for the
 * feature to be disabled on a refused mount rather than for a half-mounted
 * namespace, and this half cannot inspect the namespaces an earlier activation
 * installed. Tickets 06–08 read the switch knowing that.
 * @returns `{ status, error }` for the current page.
 */
export function remoteMountState() {
  return Object.freeze({ ...mount })
}

export async function apply(ctx) {
  try {
    await ctx.remote.$mount(TYPERT_REMOTE)
  } catch (error) {
    // The refusal has to be contained, never turned into a silent no-op: a
    // half-mounted namespace is worse than a loud failure, and a second attempt
    // must not damage the mount that already exists. Nothing is left half-mounted
    // by the time this runs either way — the Gateway validates a contribution
    // before installing anything, and unwinds whatever it did install when a later
    // step fails. So: record it, log it, disable the feature.
    mount = { status: 'failed', error }
    ctx.root.logger?.('dsh-resend')?.warn(
      `dsh-resend: the Remote contribution did not mount (${error?.message ?? error}); edit-and-resend and regenerate stay disabled for this page`,
    )
    return
  }
  mount = { status: 'mounted', error: undefined }
}
