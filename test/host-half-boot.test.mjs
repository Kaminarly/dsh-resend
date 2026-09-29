/**
 * Seam ②: the host half is a Loader row. This suite boots the *shipped patch
 * layer* (cordis.patch.yml) through the real Cordis Loader — the same
 * `EntryTree.import` → `internal.import` path a profile boot takes — and
 * asserts the row activates instead of parking the fiber in PENDING.
 *
 * Why PENDING matters (ticket 01): a fiber waiting on a service that never
 * resolves fails the startup audit (`auditStartupEntries` in the host) and the
 * whole renderer refuses to boot. The negative control below (a fixture that
 * injects an absent service) proves this suite can see that state.
 *
 * Ticket 02 gives the row its one required service (`typert`, spec §3.1/§16.6),
 * so the composition under test provides the real Typert registry — the row's
 * inject edge is exactly what the PENDING negative control is about.
 */
import { afterAll, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import Loader from '@deepseek-ai/cordis-plugin-loader'
import { TypertRegistry } from '@deepseek-ai/dsh-typert-registry'
import { mkdir, rm, symlink } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { FIBER_ACTIVE, FIBER_PENDING, patchRows, pkg, rootDir, tmpDir } from './helpers/dsh.mjs'

const roots = []

/**
 * Reproduce the one thing a profile provides that this repo does not: the
 * bundle sitting in a `node_modules` directory under the loader's base URL.
 * A profile resolves the bundle by its package name exactly this way.
 */
async function profileLikeRoot() {
  const dir = path.join(tmpDir, `boot-${randomUUID().slice(0, 8)}`)
  const modules = path.join(dir, 'node_modules')
  await mkdir(modules, { recursive: true })
  await symlink(rootDir, path.join(modules, pkg.name), 'junction')
  roots.push(dir)
  return dir
}

async function settle(entry, { expectState, timeoutMs = 5000 } = {}) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (expectState === undefined || entry.fiber?.state === expectState) return entry.fiber?.state
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  return entry.fiber?.state
}

/** Boot a Loader over `baseUrl` and mount `rows` through the loader's own API. */
async function bootComposition(rows, baseUrl) {
  const ctx = new Context()
  ctx.baseUrl = pathToFileURL(baseUrl).href + '/'
  const logs = []
  ctx.logger.exporter({ levels: { default: 2 }, export: (message) => logs.push(message) })
  await ctx.plugin(Loader)
  // The composition's own services, in the order a real profile provides them:
  // the registry exists before the row that injects it.
  await ctx.plugin(TypertRegistry)
  const loader = ctx.get('loader')
  expect(loader.internal, 'loader internals unavailable — profile-style bare specifier resolution cannot be exercised').toBeDefined()
  for (const row of rows) await loader.create(row)
  await loader.await()
  return { ctx, loader, logs }
}

/**
 * Ticket 01's `assertEntriesActive()`: the startup audit reads every loader
 * entry's fiber, and any entry that is not ACTIVE is a failed startup.
 */
function inactiveEntries(loader) {
  return [...loader.entries()].filter((entry) => entry.fiber?.state !== FIBER_ACTIVE)
}

afterAll(async () => {
  for (const dir of roots) await rm(dir, { recursive: true, force: true })
})

describe('the Host plugin mounts as one Loader row from the shipped patch layer', () => {
  it('resolves the package by name and activates the fiber (no permanent PENDING)', async () => {
    const dir = await profileLikeRoot()
    const { loader } = await bootComposition(patchRows, dir)

    const entries = [...loader.entries()]
    expect(entries.map((entry) => ({ id: entry.id, name: entry.options.name }))).toEqual([
      { id: pkg.name, name: pkg.name },
    ])

    const entry = entries[0]
    expect(await settle(entry, { expectState: FIBER_ACTIVE })).toBe(FIBER_ACTIVE)
    expect(inactiveEntries(loader)).toEqual([])
  })

  it('runs apply: the row announces itself on the host log, naming what it registered', async () => {
    const dir = await profileLikeRoot()
    const { logs, ctx } = await bootComposition(patchRows, dir)

    const announcement = logs.find((message) => message.name === pkg.name && message.type === 'info')
    expect(announcement, `no ${pkg.name} info log; captured: ${JSON.stringify(logs)}`).toBeDefined()
    expect(announcement.args.join(' ')).toContain('resend/apply')
    // The descriptor is in the registry the row injected, not merely in a log line.
    expect(ctx.typert.local.get('resend/apply')).toBeDefined()
  })

  it('boots without an error or warning on the host log', async () => {
    const dir = await profileLikeRoot()
    const { logs } = await bootComposition(patchRows, dir)

    const noisy = logs.filter((message) => message.type === 'error' || message.type === 'warn')
    expect(noisy).toEqual([])
  })

  it('injects exactly `typert`, the one service it reads (spec §3.1, §16.6)', async () => {
    const hostPlugin = await import('../lib/index.js')
    expect(hostPlugin.inject).toEqual(['typert'])
    expect(hostPlugin.name).toBe(pkg.name)
    expect(typeof hostPlugin.apply).toBe('function')
  })

  it('a composition without the registry leaves the row PENDING — the inject edge is real', async () => {
    const dir = await profileLikeRoot()
    const ctx = new Context()
    ctx.baseUrl = pathToFileURL(dir).href + '/'
    await ctx.plugin(Loader)
    const loader = ctx.get('loader')
    for (const row of patchRows) await loader.create(row)

    const entry = [...loader.entries()][0]
    expect(await settle(entry, { timeoutMs: 300 })).toBe(FIBER_PENDING)
    expect(inactiveEntries(loader).map((inactive) => inactive.options.id)).toEqual([pkg.name])
  })
})

describe('negative control: the active-entry check has teeth', () => {
  it('a plugin injecting an absent service stays PENDING forever and is reported inactive', async () => {
    const dir = await profileLikeRoot()
    const fixture = pathToFileURL(path.join(rootDir, 'test/fixtures/forever-pending-plugin.js')).href
    const { loader } = await bootComposition([{ id: 'forever-pending', name: fixture }], dir)

    const entry = [...loader.entries()][0]
    expect(entry.options.id).toBe('forever-pending')

    // Give activation every chance to finish before calling it pending.
    expect(await settle(entry, { timeoutMs: 300 })).toBe(FIBER_PENDING)
    expect(inactiveEntries(loader).map((inactive) => inactive.options.id)).toEqual(['forever-pending'])
  })
})