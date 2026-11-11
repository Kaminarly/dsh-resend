/**
 * Unpack an installed *packed* DSH host so the durable settings tests can
 * `import()` its exact host packages.
 *
 * `resolveHostApp()` finds the installed app as a packed `resources/app.asar`
 * when only the shipped archive is present, and nothing can be imported out
 * of a packed archive. This helper extracts the archive's `node_modules` tree
 * (plus the app manifest, which the loader anchors on) into a cache under
 * `node_modules/.cache/dsh-host-unpacked/`, keyed by the archive's identity,
 * so a host update yields a fresh cache instead of a stale one.
 *
 * Concurrent vitest forks race the same extraction: the winner claims a
 * per-archive lock, extracts into a private partial directory and renames it
 * into place atomically; losers wait on the result marker instead of
 * extracting a second copy.
 */
import { createHash } from 'node:crypto'
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { openAsar } from '../../scripts/asar.mjs'
import { rootDir } from './dsh.mjs'

/** The marker that a cache directory is complete and usable. */
const MARKER = '.unpacked'
/** How long a fork waits for a racing extraction before it retries itself. */
const WAIT_MS = 10 * 60 * 1000

function cacheRoot() {
  return path.join(rootDir, 'node_modules', '.cache', 'dsh-host-unpacked')
}

/**
 * Make the packed host importable: return the unpacked cache root whose
 * `node_modules` mirrors the archive's package tree.
 * @param archivePath - absolute path of the installed `app.asar`.
 * @returns the unpacked directory root.
 * @throws when the archive cannot be unpacked and the wait for a racing
 *   extraction times out.
 */
export function ensureUnpackedHostApp(archivePath) {
  const identity = statSync(archivePath)
  const key = createHash('sha1').update(`${archivePath}\n${identity.mtimeMs}\n${identity.size}\n`).digest('hex').slice(0, 16)
  const cache = cacheRoot()
  const finalDir = path.join(cache, key)
  if (existsSync(path.join(finalDir, MARKER))) return finalDir
  mkdirSync(cache, { recursive: true })

  // Claim the extraction for this archive identity; one fork extracts while
  // the rest wait. A stale lock (a crashed extractor) is claimed again.
  const lockPath = path.join(cache, `${key}.lock`)
  let lockFd = null
  try {
    lockFd = openSync(lockPath, 'wx')
    writeFileSync(lockFd, String(process.pid))
  } catch {
    if (Date.now() - statSync(lockPath).mtimeMs > WAIT_MS) {
      rmSync(lockPath, { force: true })
      lockFd = openSync(lockPath, 'wx')
      writeFileSync(lockFd, String(process.pid))
    }
  }

  if (lockFd !== null) {
    const partialDir = path.join(cache, `${key}.partial-${process.pid}-${Date.now()}`)
    const archive = openAsar(archivePath)
    try {
      const tree = archive.header.files
      const writeEntry = (relativePath) => {
        const data = archive.readFile(relativePath)
        if (data === undefined) return
        const destination = path.join(partialDir, ...relativePath.split('/'))
        mkdirSync(path.dirname(destination), { recursive: true })
        writeFileSync(destination, data)
      }
      const walk = (node, prefix) => {
        for (const [name, entry] of Object.entries(node.files ?? {})) {
          const relativePath = prefix ? `${prefix}/${name}` : name
          if (entry.files !== undefined) walk(entry, relativePath)
          else writeEntry(relativePath)
        }
      }
      // The app manifest (the loader's install anchor) and the whole package
      // tree; the rest of the archive is UI and launcher code nothing
      // `import`s out of this cache. Header keys are the literal file names.
      if (tree['package.json'] !== undefined) writeEntry('package.json')
      if (tree['node_modules'] !== undefined) walk(tree['node_modules'], 'node_modules')
      writeFileSync(path.join(partialDir, MARKER), key)
      try {
        renameSync(partialDir, finalDir)
      } catch {
        // A racing fork claimed the name first; its tree stands.
      }
    } finally {
      archive.close()
      closeSync(lockFd)
      rmSync(lockPath, { force: true })
      if (existsSync(partialDir)) rmSync(partialDir, { recursive: true, force: true })
    }
  }

  // Loser path: wait for the winner's marker (or its timeout, after which
  // the lock is gone and the next call extracts itself).
  if (!existsSync(path.join(finalDir, MARKER))) {
    const buffer = new Int32Array(new SharedArrayBuffer(4))
    const deadline = Date.now() + WAIT_MS
    while (!existsSync(path.join(finalDir, MARKER))) {
      if (Date.now() > deadline) {
        // The winner died mid-extraction; claim the lock and extract ourselves.
        return ensureUnpackedHostApp(archivePath)
      }
      Atomics.wait(buffer, 0, 0, 100)
    }
  }
  return finalDir
}

/**
 * A directory reader over an unpacked host cache, shaped like the readers
 * `resolveHostApp` returns so the durable settings tests treat it the same.
 * @param archivePath - absolute path of the installed `app.asar`.
 * @param unpackedRoot - the unpacked directory (from {@link ensureUnpackedHostApp}).
 */
export function unpackedHostReader(archivePath, unpackedRoot) {
  return {
    kind: 'dir',
    root: unpackedRoot,
    read(relativePath) {
      try {
        return readFileSync(path.join(unpackedRoot, ...relativePath.split('/')), 'utf8')
      } catch {
        return undefined
      }
    },
    describe: () => `unpacked DSH host ${archivePath} in ${unpackedRoot}`,
  }
}
