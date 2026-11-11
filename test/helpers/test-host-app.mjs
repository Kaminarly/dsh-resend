import { readFileSync } from 'node:fs'
import path from 'node:path'
import { resolveHostApp } from '../../scripts/host-app.mjs'
import { ensureUnpackedHostApp, unpackedHostReader } from './host-unpack.mjs'

/** Read an installed DSH Desktop or the locked package tree used by CI. */
export function resolveTestHostApp() {
  const configuredRoot = process.env.DSH_SETTINGS_HOST_ROOT
  if (configuredRoot === undefined || configuredRoot === '') return resolveHostApp()
  const root = path.resolve(configuredRoot)
  return {
    kind: 'dir',
    root,
    read(relativePath) {
      try { return readFileSync(path.join(root, ...relativePath.split('/')), 'utf8') } catch { return undefined }
    },
    describe: () => 'locked DSH host packages in ' + root,
  }
}

/**
 * The installed host as an importable directory: an unpacked installation is
 * used as is, and a packed one is unpacked into the host cache first.
 * `undefined` when no DSH installation is present at all (the durable
 * settings tests report that; the reading-only helpers tolerate it).
 */
export async function resolveTestHostAppDir() {
  const app = resolveTestHostApp()
  if (app?.kind !== 'asar') return app
  const unpackedRoot = ensureUnpackedHostApp(app.root)
  app.close?.()
  return unpackedHostReader(app.root, unpackedRoot)
}
