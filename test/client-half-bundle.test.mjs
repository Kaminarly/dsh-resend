/**
 * Seam ③: lib/client.bundle.js is the client half's entry artifact — a classic
 * script that self-registers exactly one factory with the Web client module
 * loader (`window.__ModuleLoader__.load({ id, factory })`).
 *
 * The loader protocol itself, and the `vm` that stands in for a page, live in
 * `scripts/client-bundle.mjs` — shared with the descriptor gate, which reads the
 * same artifact back — where a bundle that registers under the wrong id, or that
 * needs a module-table entry the host would not have, goes red.
 *
 * What the face *does* once it activates — mount the Remote contribution — is
 * asserted here only against a recording `remote` service, so nothing in this
 * file depends on the Gateway. The real Gateway is the subject of
 * `remote-contract.test.mjs`.
 */
import { describe, expect, it } from 'vitest'
import { Context, Service } from '@deepseek-ai/cordis'
import { FIBER_ACTIVE, FIBER_PENDING, pkg } from './helpers/dsh.mjs'
import { clientHalf, evaluateBundle, materialize, MODULE_TABLE } from '../scripts/client-bundle.mjs'

/** A `remote` service that records the contributions the half asks it to mount. */
function recordingRemote() {
  const mounted = []
  class RecordingRemote extends Service {
    constructor(ctx) {
      super(ctx, 'remote')
    }

    $mount(contribution) {
      mounted.push(contribution)
      return async () => {}
    }
  }
  return { RecordingRemote, mounted }
}

describe('self-registration', () => {
  it('registers exactly one factory under the package name', () => {
    const queue = evaluateBundle()
    expect(queue).toHaveLength(1)
    expect(queue[0].id).toBe(pkg.name)
    expect(typeof queue[0].factory).toBe('function')
  })

  it('does not touch the DOM or create the module system while the script runs', () => {
    // The sandbox has nothing but `window.__ModuleLoader__`: any DOM access
    // (document, Element, style) or a `create()` call would throw here.
    expect(() => evaluateBundle()).not.toThrow()
  })
})

/** A module table that records every entry the bundle asks it for. */
function recordingTable(asked) {
  return new Proxy(MODULE_TABLE, {
    has: (table, specifier) => specifier in table,
    get: (table, specifier) => {
      asked.push(String(specifier))
      return table[specifier]
    },
  })
}

describe('materialized exports', () => {
  const { registration } = clientHalf()

  it('needs exactly the two module-table entries a page provides, and no inlined copy of either', () => {
    // The table the browser hands the factory has `react` (one instance for the
    // whole page — an inlined copy would give these rows a different React from
    // the host tree they render into) and the host's own UI primitives. Anything
    // else the bundle asked for would be a real miss at load time, so the list is
    // pinned here rather than discovered in a browser.
    const asked = []
    const exports = materialize(registration, recordingTable(asked))

    expect(typeof exports.apply).toBe('function')
    expect([...new Set(asked)].sort()).toEqual(['@deepseek-ai/dsh-client-ui-primitives', 'react', 'react-dom'])
  })

  it('the module-table double has teeth: a lookup outside that list is refused by name', () => {
    const needsCordis = { id: 'needs-cordis', factory: (require) => ({ cordis: require('@deepseek-ai/cordis') }) }
    expect(() => materialize(needsCordis)).toThrow(/module table miss: @deepseek-ai\/cordis/)
  })

  it('exports the Cordis plugin face: name, inject, apply', () => {
    const exports = materialize(registration)
    expect(exports.name).toBe(pkg.name)
    expect(exports.inject).toEqual(['remote'])
    expect(typeof exports.apply).toBe('function')
  })

  it('tags its exports as a module, as the shipped bundle shape does', () => {
    const exports = materialize(registration)
    expect(Object.prototype.toString.call(exports)).toBe('[object Module]')
  })

  it('re-materializes to the same face (the factory is pure)', () => {
    const first = materialize(registration)
    const second = materialize(registration)
    expect(second.name).toBe(first.name)
    expect(second.inject).toEqual(first.inject)
  })
})

describe('the Remote mount', () => {
  it('mounts the contribution this half owns, once, and activates', async () => {
    const { exports: face } = clientHalf()
    expect(face.remoteMountState().status).toBe('pending')

    const { RecordingRemote, mounted } = recordingRemote()
    const ctx = new Context()
    await ctx.plugin(RecordingRemote)
    const fiber = ctx.plugin(face)
    await fiber

    expect(fiber.state).toBe(FIBER_ACTIVE)
    expect(mounted).toHaveLength(1)
    // Spelled out rather than derived from lib/: a test that builds both sides
    // with one helper cannot notice a format change. This bundle is also a
    // separate artifact from lib/typert.client.js, so it pins what the browser
    // half actually publishes.
    expect(mounted[0].package).toBe('dsh-resend')
    expect(mounted[0].descriptors.map((descriptor) => `${descriptor.service} ${descriptor.namespace}/${descriptor.method}`)).toEqual([
      'resend resend/apply',
      'resend resend/rollback',
      'resend resend/conversation',
      'resend resend/cleanup',
      'resend resend/replay',
    ])
    expect(face.remoteMountState().status).toBe('mounted')
  })

  it('stays PENDING while ctx.remote is absent, so no mount can be attempted early', async () => {
    const { exports: face } = clientHalf()
    const ctx = new Context()
    const fiber = ctx.plugin(face)
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(fiber.state).toBe(FIBER_PENDING)
    expect(face.remoteMountState().status).toBe('pending')
    await fiber.dispose()
  })
})
