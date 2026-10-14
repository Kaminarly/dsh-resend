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
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

/** The committed bundle, for callers that are not handed another one. */
export const CLIENT_BUNDLE = fileURLToPath(new URL('../lib/client.bundle.js', import.meta.url))

const require_ = createRequire(new URL('../package.json', import.meta.url))
// Exercise the host's actual pure ranking algorithm; no browser CSS import needed.
const primitivesSource = readFileSync(require_.resolve('@deepseek-ai/dsh-client-ui-primitives'), 'utf8')
const rankByName = vm.runInNewContext(primitivesSource.slice(primitivesSource.indexOf('function boundaryBonus('),
  primitivesSource.indexOf('//#endregion', primitivesSource.indexOf('function rankByName('))) + '\nrankByName')

// Exercise the installed Modal's actual focus/layer code, leaving only CSS
// class names out of the Node harness. Browser acceptance uses its real CSS.
const modalStart = primitivesSource.indexOf('function Modal(')
const modalCode = primitivesSource.slice(primitivesSource.indexOf('function observeComposition('),
  primitivesSource.indexOf('//#endregion', primitivesSource.indexOf('function useModalLayer('))) +
  primitivesSource.slice(modalStart, primitivesSource.indexOf('//#endregion', modalStart))
const HostModal = vm.runInNewContext(`${modalCode}\nModal`, {
  ...require_('react'), ...require_('react/jsx-runtime'), createPortal: require_('react-dom').createPortal,
  clsx: (...values) => values.filter(Boolean).join(' '),
  css$18: { root: 'host-modal-root', mask: 'host-modal-mask', dialog: 'host-modal-dialog' },
  get document() { return globalThis.document },
  get HTMLElement() { return globalThis.window?.HTMLElement },
})

const checkboxStart = primitivesSource.indexOf('function Checkbox(')
const HostCheckbox = vm.runInNewContext(primitivesSource.slice(checkboxStart,
  primitivesSource.indexOf('//#endregion',checkboxStart)) + '\nCheckbox', {
  ...require_('react/jsx-runtime'),clsx:(...values)=>values.filter(Boolean).join(' '),css$10:{checkbox:'host-checkbox'},
})

/**
 * The module-table entries the bundle legitimately asks for, and NOTHING else.
 *
 * Two entries, and both are the ones a real page provides:
 *
 *  - `react` — the plugin's own peer, taken from this package's installation
 *    exactly as the browser takes it from the module table. One React instance is
 *    the point: an inlined copy would give the plugin's boundaries and rows a
 *    different React from the host's tree they render into.
 *  - `@deepseek-ai/dsh-client-ui-primitives` — the host's own atoms. The shipped
 *    package is browser-only (its ESM imports `.module.css` and a workspace
 *    package this repo does not install), so no Node spec can load it; this
 *    stand-in is the smallest thing that preserves what a spec here needs to
 *    observe — the icons are React components reached through the module table,
 *    and the component a surface imported under a name is the very identity that
 *    surface renders. `test/rewind-row.test.mjs` holds the names to the installed
 *    package by reading it, which is what the stand-in cannot prove.
 *
 * Every other specifier still fails, by name: a bundle that reaches for something
 * the host's table does not have is the drift this double exists to catch.
 */
export const MODULE_TABLE = Object.freeze({
  react: require_('react'),
  'react-dom': Object.freeze({ createPortal: (...args) => require_('react-dom').createPortal(...args) }),
  '@deepseek-ai/dsh-client-ui-primitives': Object.freeze({
    Modal: HostModal,
    Checkbox: HostCheckbox,
    Button: require_('react').forwardRef(({ variant, size, icon, children, ...props }, ref) => require_('react').createElement('button', { ...props, ref, 'data-variant': variant }, icon, children)),
    Tooltip: ({ children }) => children,
    Switch: ({ checked, onChange, label, className, disabled }) => require_('react').createElement('button', {
      type: 'button', role: 'switch', className, disabled, 'aria-label': label, 'aria-checked': checked, onClick: () => { if (!disabled) onChange(!checked) },
    }),
    IconCloseOutlineRegular: (props) => require_('react').createElement('svg', { 'data-icon': 'close-outline', ...props }),
    IconEditOutlineRegular: (props) => require_('react').createElement('svg', { 'data-icon': 'edit-outline', ...props }),
    IconPaperPlaneOutlineRegular: (props) => require_('react').createElement('svg', { 'data-icon': 'paper-plane-outline', ...props }),
    IconRefreshOutlineRegular: (props) => require_('react').createElement('svg', { 'data-icon': 'refresh-outline', ...props }),
    IconWarningOutlineRegular: (props) => require_('react').createElement('svg', { 'data-icon': 'warning-outline', ...props }),
    IconCheckOutlineRegular: (props) => require_('react').createElement('svg', { 'data-icon': 'check-outline', ...props }),
    IconShieldOutlineRegular: (props) => require_('react').createElement('svg', { 'data-icon': 'shield-outline', ...props }),
    FileTypeIcon: ({ path, size }) => require_('react').createElement('svg', { 'data-file-icon': path, width: size, height: size }),
    MenuSurface: require_('react').forwardRef(({ children, ...props }, ref) => require_('react').createElement('div', { ...props, ref }, children)),
    ReferenceIconRegular: ({ kind }) => require_('react').createElement('svg', { 'data-reference-icon': kind }),
    IconChevronRightOutlineRegular: () => require_('react').createElement('svg', { 'data-icon': 'chevron-right' }),
    useAnchoredMaxHeight: () => 400,
    rankByName,
  }),
})

/**
 * Materialize a registration with the module-table `require`.
 * @param registration - one queue entry from {@link evaluateBundle}.
 * @param table - the module table; defaults to {@link MODULE_TABLE}.
 * @returns the module exports.
 * @throws when the bundle asks the module table for any other specifier.
 */
export function materialize(registration, table = MODULE_TABLE) {
  return registration.factory((specifier) => {
    if (specifier in table) return table[specifier]
    throw new Error(`module table miss: ${specifier}`)
  })
}

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
  const browser = {
    console,
    setTimeout, clearTimeout,
    get window() { return Object.assign(globalThis.window ?? {}, { __ModuleLoader__: moduleLoader }) },
    get document() { return globalThis.document },
    get navigator() { return globalThis.window?.navigator },
    get innerHeight() { return globalThis.window?.innerHeight },
    get innerWidth() { return globalThis.window?.innerWidth },
    get MutationObserver() { return globalThis.window?.MutationObserver },
    get getComputedStyle() { return globalThis.window?.getComputedStyle },
    get requestAnimationFrame() { return globalThis.window?.requestAnimationFrame ?? (callback => setTimeout(callback, 0)) },
    get cancelAnimationFrame() { return globalThis.window?.cancelAnimationFrame ?? clearTimeout },
    get ResizeObserver() { return globalThis.ResizeObserver ?? globalThis.window?.ResizeObserver },
  }
  vm.runInNewContext(source, browser, { filename: 'client.bundle.js' })
  return pendingQueue
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
