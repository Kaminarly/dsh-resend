import { Context, Service } from '@deepseek-ai/cordis'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { resolveHostApp } from '../../scripts/host-app.mjs'
import { provideStandInServices } from '../../scripts/host-services.mjs'
import * as host from '../../lib/index.js'
import { rootDir } from './dsh.mjs'
import vm from 'node:vm'

/** Actual installed SettingsForms, ConfigEditor, Loader and root Include, over disposable Profiles. */
export async function settingsHost(home, name, state) {
  const app = resolveHostApp()
  if (!app || app.kind !== 'dir') throw new Error('An unpacked DSH host is required for the durable settings test')
  const load = (pkg) => import(pathToFileURL(path.join(app.root, 'node_modules', pkg, 'lib/index.js')).href)
  const [{ default: Loader }, { mountRootInclude, readProfilePatches }, { default: ConfigEditor }, { default: SettingsForms }, { TypertRegistry }] = await Promise.all([
    load('@deepseek-ai/cordis-plugin-loader'), load('@deepseek-ai/dsh-app-boot'), load('@deepseek-ai/dsh-config-editor'), load('@deepseek-ai/dsh-settings'), load('@deepseek-ai/dsh-typert-registry'),
  ])
  const dir = path.join(home, 'profiles', name)
  await mkdir(dir, { recursive: true })
  const manifest = path.join(dir, 'package.json')
  try { await readFile(manifest) } catch { await writeFile(manifest, '{"dsh":{"profile":{"bundles":[]}}}\n') }
  const base = path.join(home, 'base.yml')
  await writeFile(base, '[]\n')
  const ctx = new Context()
  ctx.baseUrl = pathToFileURL(rootDir).href + '/'
  ctx.logger.exporter({ levels: { default: 0 }, export() {} })
  await ctx.plugin(Loader)
  await ctx.plugin(TypertRegistry)
  if (state) {
    const { plugHostDoubles } = await import('./host.mjs')
    await plugHostDoubles(ctx, state)
  }
  await provideStandInServices(ctx, host, host.inject.filter(name => ctx.get(name) !== undefined))
  const profile = { name, home, dir, patchPath: path.join(dir, 'cordis.patch.yml'), installAnchor: path.join(app.root, 'package.json'), overlays: [] }
  // Keep the standard native YAML reader for the user's layer and the real
  // root Include for reconciliation; only the base bundle list is minimal.
  const yaml = (await import('js-yaml')).default
  profile.readPatches = (pending) => [
    { insert: [{ id: 'dsh-resend', name: pathToFileURL(path.join(rootDir, 'lib/index.js')).href }] },
    ...(pending ?? (() => { try { return yaml.load(requireRead(profile.patchPath)) ?? [] } catch (e) { if (e.code === 'ENOENT') return []; throw e } })()),
  ]
  await ctx.plugin(class extends Service {
    constructor(scope) { super(scope, 'profileContext'); Object.assign(this, profile) }
  })
  const previousHome = process.env.DSH_HOME
  process.env.DSH_HOME = home
  try {
    await mountRootInclude(ctx, base, readProfilePatches('dsh', profile))
    await ctx.get('loader').await()
  } finally {
    if (previousHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = previousHome
  }
  await ctx.plugin(ConfigEditor)
  await ctx.plugin(SettingsForms)
  await ctx.get('loader').await()
  const settings = ctx.get('settings')
  const entry = ctx.get('loader').resolve('include:dsh-resend') ?? [...ctx.get('loader').entries()].find(e => e.options.id === 'dsh-resend')
  if (entry?.fiber?.state !== 2) throw new Error('Preferences host did not activate: ' + entry?.fiber?.state)
  return { ctx, settings, entry, profile, app, async close() { await ctx.fiber.dispose() } }
}

import { readFileSync as requireRead } from 'node:fs'

/** Materialize the installed client provider with this test's one React/store runtime. */
export async function settingsClientProvider(host, { failRead, write } = {}) {
  // Store runtime boundary: immutable snapshots, with the installed provider
  // itself owning reads, revisions, queues, recovery and invalidation handling.
  const createSnapshotStore = (initial) => {
    let snapshot = initial
    const listeners = new Set()
    const set = (next) => { snapshot = next; listeners.forEach(fn => fn()) }
    return { getSnapshot: () => snapshot, set,
      update(fn) { const next = structuredClone(snapshot); fn(next); set(next) },
      subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn) },
    }
  }
  const source = host.app.read('node_modules/@deepseek-ai/dsh-client-ui-settings/lib/client.js')
  let registration
  vm.runInNewContext(source, { window: { __ModuleLoader__: { load: value => { registration = value } } }, structuredClone, Promise })
  const schema = (await import('@deepseek-ai/schemastery')).default
  const provider = registration.factory(name => {
    if (name === '@deepseek-ai/cordis') return { Service }
    if (name === '@deepseek-ai/dsh-client-store') return { createSnapshotStore }
    if (name === '@deepseek-ai/schemastery') return { default: schema }
    throw new Error('Unexpected settings provider dependency ' + name)
  })
  const ctx = new Context()
  await ctx.plugin(class extends Service {
    constructor(scope) {
      super(scope, 'remote')
      this.$host = { isLoopback: true }
      this.$on = (name, fn) => host.ctx.on(name, fn)
      new class extends Service {
        constructor(scope) { super(scope, 'remote.settings') }
        async describe() {
          if (failRead?.()) throw new Error('simulated disconnect')
          return { ok: true, value: { writable: true, namespaces: host.settings.describe() } }
        }
        async mutate(ns, ops, revision) {
          const run = async () => {
            await host.settings.mutate(ns, ops, revision)
            return { ok: true, value: host.settings.describe().find(row => row.ns === ns) }
          }
          return write ? write(run) : run()
        }
      }(scope)
    }
  })
  await ctx.plugin(provider)
  const forms = ctx.get('configForms')
  if (!forms) throw new Error('Installed ConfigForms provider did not activate')
  await forms.describe().ensure()
  return { ctx, forms, async close() { await ctx.fiber.dispose() } }
}
