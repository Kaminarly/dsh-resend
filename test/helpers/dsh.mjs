/**
 * Shared fixtures for the suite: the package root, the shipped patch layer's
 * rows, and Cordis's fiber states.
 *
 * Fiber states come from cordis's own enum (src/fiber.ts): PENDING 0,
 * LOADING 1, ACTIVE 2, FAILED 3, DISPOSED 4, UNLOADING 5. It is a `const enum`,
 * erased at runtime, so the numbers live here once with that provenance rather
 * than being re-stated per test file.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import yaml from 'js-yaml'

export const rootDir = fileURLToPath(new URL('../..', import.meta.url))

/** Scratch space for fixtures and probe homes; gitignored. */
export const tmpDir = path.join(rootDir, '.tmp')

export const pkg = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8'))

export const FIBER_PENDING = 0
export const FIBER_ACTIVE = 2

/** The rows the shipped patch layer inserts — the composition under test. */
export const patchRows = (() => {
  const patches = yaml.load(readFileSync(path.join(rootDir, 'cordis.patch.yml'), 'utf8'))
  return patches.flatMap((patch) => patch.insert ?? [])
})()

/**
 * Every artifact a build produces under `lib/`, and the source it is built from.
 *
 * This is the one manifest the artifact-reading suites share, because a new
 * artifact otherwise forces the same list to be edited in four places in
 * lockstep (and one of them silently keeps passing when it is not).
 *
 * `host.js`, `log-read.js`, `marker.js`, `resolve.js`, `shape-probe.js` and
 * `write.js` are internal siblings rather than export faces: `lib/index.js`
 * imports `host.js`, `marker.js`, `resolve.js` and `write.js`, `resolve.js`,
 * `write.js` and `log-read.js` import `host.js`, `write.js` imports
 * `shape-probe.js` and `marker.js` as well, and
 * `scripts/check-host-contract.mjs` exempts exactly `log-read.js` from §12's
 * legacy-event-view invariant (see `scripts/build.mjs`).
 */
export const libArtifacts = Object.freeze([
  { file: 'client.bundle.js', source: 'src/client.js' },
  { file: 'host.js', source: 'src/host.js' },
  { file: 'index.js', source: 'src/index.js' },
  { file: 'log-read.js', source: 'src/log-read.js' },
  { file: 'marker.js', source: 'src/marker.js' },
  { file: 'resolve.js', source: 'src/resolve.js' },
  { file: 'shape-probe.js', source: 'src/shape-probe.js' },
  { file: 'write.js', source: 'src/write.js' },
  { file: 'typert.client.js', source: 'src/typert.client.js' },
  { file: 'typert.host.js', source: 'src/typert.host.js' },
])

/**
 * The host-side artifacts that are plain Node ESM, i.e. every artifact except
 * the browser bundle (whose face is a classic script by design). These are the
 * ones whose imports must be declared packages or shipped siblings.
 */
export const esmArtifacts = libArtifacts.filter((artifact) => artifact.file !== 'client.bundle.js')
