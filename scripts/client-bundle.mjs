/**
 * Read the client half's shipped artifact the way a browser does.
 *
 * `lib/client.bundle.js` is a classic script: the Web client instantiates it as
 * `window.__ModuleLoader__.load({ id, factory })`, then materializes the factory
 * with the module-table `require` and uses its return value. This module is that
 * protocol in one place, because two kinds of caller need it from two directions:
 *
 *  - `scripts/check-typert.mjs` reads the contribution the bundle publishes, to
 *    prove the copy that ships is the face the gate validated;
 *  - the bundle specs evaluate and materialize it, to prove that a bundle which
 *    registers under the wrong id, or that needs a module-table entry the host
 *    would not have, goes red.
 *
 * Protocol sources of truth (dsh-client-modules, the shipped node half):
 *  - the registration queue is installed as `window.__ModuleLoader__` with
 *    `mode: "queue"` and a `pendingQueue` the bundles push into;
 *  - the row `id` is the package name, and `arrive()` fails with
 *    `loaded without registering "<id>"` when a bundle does not register it;
 *  - the factory receives the module-table `require` and returns the module
 *    exports (the boot queue calls `registration.factory(specifier => ...)` and
 *    uses its return value).
 *
 * The browser implementation cannot be imported here — it *is* the module system
 * this stands in for — so restating the protocol is what makes a drifted bundle
 * fail loudly instead of silently.
 */
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/** The committed bundle, for callers that are not handed another one. */
export const CLIENT_BUNDLE = fileURLToPath(new URL('../lib/client.bundle.js', import.meta.url))

/**
 * Evaluate a bundle the way the browser does: a classic script in a page.
 * @param source - bundle text; defaults to the committed artifact.
 * @returns the queue of registrations the script pushed.
 */
export function evaluateBundle(source = readFileSync(CLIENT_BUNDLE, 'utf8')) {
  const pendingQueue = []
  const moduleLoader = {
    mode: 'queue',
    pendingQueue,
    load(registration) {
      pendingQueue.push(registration)
    },
    create() {
      throw new Error('client-modules: a plugin bundle must never create the module system')
    },
  }
  vm.runInNewContext(source, { window: { __ModuleLoader__: moduleLoader } }, { filename: 'client.bundle.js' })
  return pendingQueue
}

/**
 * Materialize a registration with the module-table `require`.
 *
 * The `require` refuses every specifier, and names the one it was asked for: this
 * plugin's bundle imports nothing from the client module table (spec §6.6 — the
 * descriptor table and its schemas are bundled), so any lookup is exactly the
 * drift this double exists to catch, and it must not be swallowed into a
 * half-materialized face.
 * @param registration - one queue entry from {@link evaluateBundle}.
 * @returns the module exports.
 * @throws when the bundle asks the module table for any specifier.
 */
export function materialize(registration) {
  return registration.factory((specifier) => {
    throw new Error(`module table miss: ${specifier}`)
  })
}

/**
 * The bundle's one registration, evaluated and materialized.
 *
 * Every materialization is a fresh module instance, so `exports` is this
 * bundle's plugin face and nothing of the previous page survives.
 * @param source - bundle text, or `undefined` for the committed artifact.
 * @returns `{ registration, exports }`.
 * @throws when the bundle does not register exactly one factory, or asks the
 *   module table for a specifier.
 */
export function clientHalf(source) {
  const queue = evaluateBundle(source)
  if (queue.length !== 1) throw new Error(`the client bundle registered ${queue.length} factories; the loader expects exactly one`)
  return { registration: queue[0], exports: materialize(queue[0]) }
}

/** One error as a line a caller can report: `TypeError: something gone`. */
export function describeError(error) {
  return `${error?.name ?? 'Error'}: ${error?.message ?? error}`
}

/**
 * The contribution the bundle publishes, or the reason it could not be read.
 *
 * Never throws: a caller reporting on a *broken* artifact needs a diagnostic, not
 * a stack, and a bundle that fails to evaluate — or that needs a module-table
 * entry the host would not have — is exactly the case worth reporting.
 * @param bundlePath - path to a client bundle; defaults to the committed artifact.
 * @returns `{ contribution }`, or `{ error }` naming what went wrong.
 */
export function readClientContribution(bundlePath = CLIENT_BUNDLE) {
  let queue
  try {
    queue = evaluateBundle(readFileSync(bundlePath, 'utf8'))
  } catch (error) {
    return { error: describeError(error) }
  }
  if (queue.length !== 1) return { error: `the bundle registered ${queue.length} factories; the loader expects exactly one` }

  let exports
  try {
    exports = materialize(queue[0])
  } catch (error) {
    return { error: describeError(error) }
  }
  const contribution = exports.TYPERT_REMOTE
  if (contribution === undefined) return { error: 'the bundle does not publish the contribution it mounts (TYPERT_REMOTE)' }
  return { contribution }
}
