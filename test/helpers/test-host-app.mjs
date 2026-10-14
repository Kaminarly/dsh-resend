import { readFileSync } from 'node:fs'
import path from 'node:path'
import { resolveHostApp } from '../../scripts/host-app.mjs'

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
