/**
 * One recursive JavaScript-file walk, shared by the gates that parse or scan a
 * tree (`check-syntax` over `lib/`, `check-host-contract` over the plugin's own
 * source). Keeping one implementation means "which files count" cannot drift
 * between them.
 */
import { readdirSync } from 'node:fs'
import path from 'node:path'

/** Extensions the gates treat as JavaScript. */
const JAVASCRIPT_FILE = /\.(?:m?js|cjs)$/

/**
 * Path relative to `from`, always with forward slashes: a gate's `file:line`
 * pointer must read the same on every platform.
 * @param from - base directory.
 * @param to - path to report.
 */
export function relativePath(from, to) {
  return path.relative(from, to).split(path.sep).join('/')
}

/**
 * Every JavaScript file under `dir`, recursively, in directory order.
 * @param dir - absolute directory to walk.
 * @returns absolute file paths.
 * @throws when `dir` does not exist — callers guard with `existsSync` and turn
 *   the absence into a diagnostic, so a missing tree is never a silent `[]`.
 */
export function walkJavaScript(dir) {
  const files = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...walkJavaScript(full))
    else if (entry.isFile() && JAVASCRIPT_FILE.test(entry.name)) files.push(full)
  }
  return files
}