#!/usr/bin/env node
/**
 * Gate 1/3 — source syntax.
 *
 * Parses EVERY file under the target directory with the bundler's own parser.
 * The reason this is a walk and not `node --check lib/*.js`: `node --check`
 * silently validates only its **first** argument, so a syntax error in any
 * later file would ship. Every failure is reported, not just the first.
 *
 * A directory with no JavaScript at all fails too: a vacuously green gate is
 * worse than no gate.
 *
 * Usage: node scripts/check-syntax.mjs [dir]   (default: src and lib)
 */
import { transformSync } from 'esbuild'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { walkJavaScript, relativePath } from './walk-javascript.mjs'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const targets = process.argv[2] === undefined ? ['src', 'lib'] : [process.argv[2]]

function checkTarget(target) {
  if (!existsSync(target)) {
    console.error(`check-syntax: FAIL — ${relativePath(rootDir, target) || target} does not exist`)
    return false
  }

  const files = walkJavaScript(target)

  if (files.length === 0) {
    console.error(`check-syntax: FAIL — no JavaScript files under ${relativePath(rootDir, target) || target}`)
    return false
  }

  const failures = []
  for (const file of files.sort()) {
    const label = relativePath(rootDir, file)
    try {
      transformSync(readFileSync(file, 'utf8'), { loader: 'js', sourcefile: label })
    } catch (error) {
      const errors = error?.errors?.length ? error.errors : [{ text: error?.message ?? String(error), location: undefined }]
      for (const detail of errors) {
        const location = detail.location
        failures.push(`${label}${location ? `:${location.line}:${location.column}` : ''} — ${detail.text}`)
      }
    }
  }

  if (failures.length > 0) {
    for (const failure of failures) console.error(`check-syntax: FAIL ${failure}`)
    console.error(`check-syntax: ${failures.length} failure(s) across ${files.length} parsed file(s)`)
    return false
  }

  console.log(`check-syntax: OK — parsed ${files.length} file(s) under ${relativePath(rootDir, target) || target} with the esbuild parser`)
  return true
}

const results = targets.map((target) => checkTarget(path.resolve(rootDir, target)))
if (results.some((passed) => !passed)) process.exitCode = 1
