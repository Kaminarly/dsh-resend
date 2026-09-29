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