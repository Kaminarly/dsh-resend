/**
 * Locate the *installed* DSH Desktop application for the gates that read it.
 *
 * The gates never install anything, never touch a profile, and never use the
 * network: they read the shipped app — either its unpacked `resources/app`
 * directory or its packed `resources/app.asar` — and nothing else.
 *
 * Resolution:
 *   1. an explicit override (`$DSH_APP_ROOT` / `$DSH_APP_ASAR`) — a value that
 *      is not a DSH app is a hard failure, never a silent skip, because a
 *      mistyped override must not read as "no app installed";
 *   2. well-known install locations for this platform, then this project's
 *      development-machine location.
 *
 * A candidate is only accepted once it *validates as a DSH app* (its manifest
 * names the desktop plugin, or it ships `@deepseek-ai/dsh-session`). That
 * matters twice over: an unrelated directory on the same path can never shadow
 * a real installation found later in the list, and a candidate that is an app
 * but has drifted (no session package, unreadable manifest) is still returned
 * so the gate reports concrete drift instead of skipping vacuously.
 *
 * `process.noAsar = true` is set before any path is opened, because DSH Desktop
 * runs package scripts under Electron's Node, whose asar wrapper intercepts
 * every path ending in `.asar`.
 */
import { createRequire } from 'node:module'
import { existsSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { openAsar } from './asar.mjs'

// ESM hoists the imports above this statement, so this runs before any path is
// *read* (never before the imports themselves, none of which open a file).
// It must be set before the first asar path is touched: under Electron's Node
// the asar wrapper intercepts every fs call whose path ends in `.asar`.
process.noAsar = true

/** The session package every DSH app ships; its presence is what identifies one. */
const APP_MARKER = 'node_modules/@deepseek-ai/dsh-session/package.json'
/** The desktop app's own manifest name. */
const DESKTOP_PACKAGE_NAME = 'dsh-plugin-desktop'
/** App-relative path of the headless launcher (`dsh`) inside an installation. */
export const LAUNCHER_RELATIVE = 'node_modules/@deepseek-ai/dsh/lib/bin.js'

/**
 * Absolute launcher path for an app reader.
 * @param app - reader from {@link resolveHostApp}.
 * @returns the path, or `undefined` when this installation has none (a packed
 *   app never does).
 */
export function launcherFor(app) {
  if (app === undefined) return undefined
  const launcher = path.join(app.root, ...LAUNCHER_RELATIVE.split('/'))
  return existsSync(launcher) ? launcher : undefined
}

/**
 * Candidate `resources` paths, most trustworthy first. The last entry is this
 * project's development machine, kept so the gates work here without an
 * environment override; because candidates are validated, it can never shadow a
 * real installation found earlier.
 */
function installCandidates() {
  const homes = [
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Programs', 'DSH Desktop', 'resources'),
    process.env.ProgramFiles && path.join(process.env.ProgramFiles, 'DSH Desktop', 'resources'),
    '/Applications/DSH Desktop.app/Contents/Resources',
    '/opt/DSH Desktop/resources',
    '/usr/lib/dsh-desktop/resources',
    'D:\\DSH Desktop\\resources',
  ]
  const candidates = []
  for (const home of homes.filter(Boolean)) {
    candidates.push(path.join(home, 'app'), path.join(home, 'app.asar'))
  }
  return candidates
}

/** Classify a candidate path without opening it. */
function shapeOf(candidate) {
  if (!existsSync(candidate)) return undefined
  if (statSync(candidate).isDirectory()) return 'dir'
  return candidate.endsWith('.asar') ? 'asar' : undefined
}

/** Readers over one app root: unpacked directory or packed archive. */
function readerFor(shape, root) {
  if (shape === 'dir') {
    return {
      kind: 'dir',
      root,
      modulesDir: path.join(root, 'node_modules'),
      read: (relativePath) => {
        try {
          return readFileSync(path.join(root, ...relativePath.split('/')), 'utf8')
        } catch {
          return undefined
        }
      },
      /**
       * Resolve a package's entry file from inside the app, so a gate imports
       * the exact code the host runs.
       */
      resolveFrom(relativePath, specifier) {
        return createRequire(path.join(root, ...relativePath.split('/'))).resolve(specifier)
      },
      describe: () => `unpacked app ${root}`,
    }
  }

  const archive = openAsar(root)
  return {
    kind: 'asar',
    root,
    modulesDir: undefined,
    read: (relativePath) => archive.readFile(relativePath)?.toString('utf8'),
    // No `resolveFrom`: nothing can be imported out of a packed archive, and a
    // stub that throws would only move that fact into every caller. Callers ask
    // for the capability (`typeof app.resolveFrom === 'function'`).
    close: () => archive.close(),
    describe: () => `packed app ${root}`,
  }
}

/** Whether this app root is really a DSH installation (or close enough to diagnose). */
function looksLikeDshApp(app) {
  if (app.read(APP_MARKER) !== undefined) return true
  const manifest = app.read('package.json')
  if (manifest === undefined) return false
  try {
    return JSON.parse(manifest).name === DESKTOP_PACKAGE_NAME
  } catch {
    return false
  }
}

/**
 * Resolve the installed app.
 * @param options - `candidates` overrides the install-location list (used by the
 *   tests, which cannot rely on a machine having an installation).
 * @returns an app reader, or `undefined` when nothing that looks like an
 *   installation is present at all.
 * @throws when an explicit override names something that is not a DSH app.
 */
export function resolveHostApp({ candidates = installCandidates() } = {}) {
  const explicit = [
    ['DSH_APP_ROOT', process.env.DSH_APP_ROOT],
    ['DSH_APP_ASAR', process.env.DSH_APP_ASAR],
  ].filter(([, value]) => value !== undefined && value !== '')

  for (const [name, value] of explicit) {
    const shape = shapeOf(value)
    if (shape === undefined) throw new Error(`${name}=${value} is not a DSH Desktop app (expected a resources/app directory or an app.asar file)`)
    const app = readerFor(shape, value)
    if (!looksLikeDshApp(app)) {
      app.close?.()
      throw new Error(`${name}=${value} is not a DSH Desktop app (no ${APP_MARKER}, and its manifest is not ${DESKTOP_PACKAGE_NAME})`)
    }
    return app
  }

  // A candidate that is an app-shaped path but has drifted is remembered, so
  // the gate reports the drift rather than skipping.
  let provisional

  for (const candidate of candidates) {
    const shape = shapeOf(candidate)
    if (shape === undefined) continue
    const app = readerFor(shape, candidate)
    if (looksLikeDshApp(app)) {
      provisional?.close?.()
      return app
    }
    if (provisional === undefined) provisional = app
    else app.close?.()
  }

  return provisional
}