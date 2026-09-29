/**
 * Seam ③: lib/client.bundle.js is the client half's entry artifact — a classic
 * script that self-registers exactly one factory with the Web client module
 * loader (`window.__ModuleLoader__.load({ id, factory })`).
 *
 * Protocol sources of truth (dsh-client-modules, the shipped node half):
 *  - the registration queue is installed as `window.__ModuleLoader__` with
 *    `mode: "queue"` and a `pendingQueue` the bundles push into;
 *  - the row `id` is the package name, and `arrive()` fails with
 *    `loaded without registering "<id>"` when a bundle does not register it;
 *  - the factory receives the module-table `require` and returns the module
 *    exports (the boot queue calls `registration.factory(specifier => ...)` and
 *    uses its return value).
 */
import { describe, expect, it } from 'vitest'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import { Context } from '@deepseek-ai/cordis'
import { FIBER_ACTIVE, pkg } from './helpers/dsh.mjs'

const bundleSource = readFileSync(new URL('../lib/client.bundle.js', import.meta.url), 'utf8')

/** Evaluate the bundle the way the browser does: a classic script in a page.
 *
 * The `__ModuleLoader__` queue below is a deliberate test double of the host's
 * own boot protocol (`bootInjections` in dsh-client-modules) — the browser
 * implementation cannot be imported here, and re-stating the protocol is what
 * makes a drifted bundle fail: a bundle that registers under the wrong id, or
 * that needs a module-table entry the host would not have, goes red here.
 */
function evaluateBundle(source) {
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
  vm.runInNewContext(source, { window: { __ModuleLoader__: moduleLoader } }, { filename: 'lib/client.bundle.js' })
  return pendingQueue
}

/** Materialize a registration with a require that records every module-table lookup. */
function materialize(registration) {
  const misses = []
  const exports = registration.factory((specifier) => {
    misses.push(specifier)
    throw new Error(`module table miss: ${specifier}`)
  })
  return { exports, misses }
}

describe('self-registration', () => {
  it('registers exactly one factory under the package name', () => {
    const queue = evaluateBundle(bundleSource)
    expect(queue).toHaveLength(1)
    expect(queue[0].id).toBe(pkg.name)
    expect(typeof queue[0].factory).toBe('function')
  })

  it('does not touch the DOM or create the module system while the script runs', () => {
    // The sandbox has nothing but `window.__ModuleLoader__`: any DOM access
    // (document, Element, style) or a `create()` call would throw here.
    expect(() => evaluateBundle(bundleSource)).not.toThrow()
  })
})

describe('materialized exports', () => {
  const [registration] = evaluateBundle(bundleSource)

  it('needs no module-table entry (the skeleton imports nothing)', () => {
    const { misses } = materialize(registration)
    expect(misses).toEqual([])
  })

  it('exports the Cordis plugin face: name, inject, apply', () => {
    const { exports } = materialize(registration)
    expect(exports.name).toBe(pkg.name)
    expect(exports.inject).toEqual([])
    expect(typeof exports.apply).toBe('function')
  })

  it('tags its exports as a module, as the shipped bundle shape does', () => {
    const { exports } = materialize(registration)
    expect(Object.prototype.toString.call(exports)).toBe('[object Module]')
  })

  it('activates as a Cordis plugin without a pending fiber', async () => {
    const { exports } = materialize(registration)
    const ctx = new Context()
    const fiber = ctx.plugin(exports)
    await fiber
    expect(fiber.state).toBe(FIBER_ACTIVE)
  })

  it('re-materializes to the same face (the factory is pure)', () => {
    const first = materialize(registration).exports
    const second = materialize(registration).exports
    expect(second.name).toBe(first.name)
    expect(second.inject).toEqual(first.inject)
  })
})