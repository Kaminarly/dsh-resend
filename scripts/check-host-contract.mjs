#!/usr/bin/env node
/**
 * Gate 3/3 — host contract (spec §12).
 *
 * Reads the *installed* application — an unpacked `resources/app` or a packed
 * `app.asar` — directly: no network, no profile mutation. Asserts, in both
 * directions, every host member this plugin reads, through the table in
 * `scripts/host-contract.mjs`:
 *
 *   PRESENT  a member the plugin reads must still be declared;
 *   ABSENT   a member removed upstream (resurrection alarm) must stay gone.
 *
 * Two rules for the gate itself, both of which the table's shape exists to serve:
 *   - missing scope markers and missing entries are drift, never a pass: a
 *     vacuously green gate is worse than no gate;
 *   - a reverse (ABSENT) assertion over-matches rather than under-matches: a
 *     false red is the safe direction.
 *
 * With no installed app the gate prints an explicit SKIP and exits zero — it is
 * Desktop-optional (spec §12). `process.noAsar` is set by both modules that open
 * a path — `scripts/host-app.mjs`, before this file reads anything, and
 * `scripts/asar.mjs`, which owns the archive reads — because DSH Desktop runs
 * package scripts under Electron's Node, whose asar wrapper intercepts every path
 * ending in `.asar`.
 *
 * Usage: node scripts/check-host-contract.mjs [--plugin-root <dir>] [--report]
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveHostApp } from './host-app.mjs'
import { optionValue, rejectUnknownOptions } from './args.mjs'
import { walkJavaScript, relativePath } from './walk-javascript.mjs'
import { APP_MANIFEST, ENTITIES, EXPORTS, SLOT_CATALOG, catalogEntries, emptyTableGroups, entityRegion, escapeRegex, exportTarget, locateMember, memberForms, packageNameOf, packageOf, scopeMarkers } from './host-contract.mjs'

const rootDir = fileURLToPath(new URL('..', import.meta.url))

const argv = process.argv.slice(2)
/** The tree the plugin-side invariant scans; overridable so the scan is testable. */
const pluginRoot = path.resolve(rootDir, optionValue(argv, '--plugin-root', { bin: 'check-host-contract', fallback: rootDir }))
/** Print the resolved scope of every assertion, for a human reading a drift report. */
const reporting = argv.includes('--report')

rejectUnknownOptions(argv, {
  bin: 'check-host-contract',
  known: ['--plugin-root', '--report'],
  valued: ['--plugin-root'],
  usage: 'usage: check-host-contract [--plugin-root <dir>] [--report]',
})

const failures = []
const fail = (message) => failures.push(message)
const report = (message) => {
  if (reporting) console.log(`  ${message}`)
}

const app = (() => {
  try {
    return resolveHostApp()
  } catch (error) {
    console.error(`check-host-contract: FAIL — ${error.message}`)
    process.exit(1)
  }
})()

if (app === undefined) {
  console.log('check-host-contract: SKIP — no installed DSH Desktop app found (set DSH_APP_ROOT to point at one); this gate is Desktop-optional')
  process.exit(0)
}

const sources = new Map()
/** Read one app-relative file once, reporting absence rather than throwing. */
function sourceOf(file) {
  if (!sources.has(file)) sources.set(file, app.read(file))
  return sources.get(file)
}
/** The same file split for line-addressed assertions. */
function linesOf(file) {
  const text = sourceOf(file)
  return text === undefined ? undefined : text.split('\n')
}

/** 1-based line number of a whole-file match, for a pointer a human can open. */
function lineOf(text, index) {
  return text.slice(0, index).split('\n').length
}

// --- the table must be able to assert something at all ----------------------

// §12's rule reaches the gate's own inputs: an emptied group would erase every
// assertion built from it and still print OK.
for (const group of emptyTableGroups()) {
  fail(`contract table is empty: no ${group} to assert against — every assertion built from that group would vanish, and a gate that asserts nothing is not a gate (§12)`)
}

// --- scope markers: missing means drift, never a pass -----------------------

for (const marker of scopeMarkers()) {
  const text = sourceOf(marker)
  if (text === undefined) {
    fail(`scope marker missing: ${marker} — the contract reads members out of that package, so its absence is drift`)
    continue
  }
  let manifest
  try {
    manifest = JSON.parse(text)
  } catch (error) {
    fail(`scope marker ${marker} is not valid JSON: ${error.message}`)
    continue
  }
  for (const field of ['name', 'version']) {
    if (typeof manifest[field] !== 'string' || manifest[field] === '') fail(`scope marker ${marker} has no ${field}`)
  }
  if (typeof manifest.name === 'string' && !marker.endsWith(`/${manifest.name}/package.json`)) {
    fail(`scope marker ${marker} names ${manifest.name}, not the package the contract reads from`)
  }
  report(`scope marker ${marker} — ${manifest.name}@${manifest.version}`)
}

if (sourceOf(APP_MANIFEST) === undefined) fail(`scope marker missing: ${APP_MANIFEST} — without it the gate cannot tell a DSH app from a directory`)

// --- both directions, scoped to the entity that owns each member ------------

let presentCount = 0
let exportCount = 0
let absentCount = 0

for (const { entity, file, service, usedBy, present, absent } of ENTITIES) {
  const text = sourceOf(file)
  if (text === undefined) {
    fail(`contract file missing: ${file} — ${entity} declares members this plugin reads (${usedBy}), so its absence is drift`)
    continue
  }
  const lines = linesOf(file)
  const region = entityRegion(lines, entity)
  if (region === undefined) {
    for (const member of present) {
      presentCount += 1
      fail(`PRESENT ${member} (${file}): no ${entity} declaration was found to scope it to, so this member cannot be asserted at all`)
    }
    absentCount += absent.length
    fail(`scope marker missing: no declaration of ${entity} was found in ${file} — the assertions below it cannot be scoped, which is drift, not a pass`)
    continue
  }
  report(`${entity} — ${file}:${region.start}..${region.end}`)

  if (service !== undefined) {
    // Scanned across the whole file, not just the region, because the host
    // registers several of these services outside their class body — the locale
    // service is provided at module scope, well past the end of `LocaleRuntime`
    // — so a region-only check would be red on a healthy host. The claim is
    // therefore narrow and is the one §3.1 needs: the file that declares the
    // entity still registers this name, and `ctx.inject` will still resolve.
    const registered = new RegExp(`super\\([^)]*,\\s*["']${service}["']\\s*\\)|\\bprovide\\(\\s*["']${service}["']\\s*,`)
    const hit = lines.findIndex((line) => registered.test(line))
    if (hit === -1) fail(`scope marker missing: ${file} no longer registers the service "${service}" that ${entity} is reached through (§3.1; ${usedBy})`)
    else report(`  service ${service} — ${file}:${hit + 1}`)
  }

  for (const member of present) {
    presentCount += 1
    const { index, shape, boltOnForm } = locateMember(memberForms(entity, member, 'present'), region, text)
    if (index === undefined && boltOnForm === undefined) {
      fail(`PRESENT ${member} (${file}): ${entity} no longer declares it in any known form — ${usedBy} reads it and would fail at runtime`)
      continue
    }
    if (index === undefined) {
      report(`  present ${member} … ${file}:${lineOf(text, text.search(boltOnForm.pattern))} (${entity}.${boltOnForm.form})`)
      continue
    }
    report(`  present ${member} … ${file}:${region.start + index} (${shape.form})`)
  }

  for (const member of absent) {
    absentCount += 1
    const { index, shape, boltOnForm } = locateMember(memberForms(entity, member, 'absent'), region, text)
    const resurrection = index !== undefined ? { where: `${file}:${region.start + index}`, form: shape.form } : { where: `${file}:${lineOf(text, text.search(boltOnForm?.pattern))}`, form: boltOnForm?.form }
    if (resurrection.form === undefined) report(`  absent ${member} — ${entity} stays without it`)
    else fail(`ABSENT ${member} (${resurrection.where}): ${entity} has it again as a ${resurrection.form} — this member was removed upstream and must not come back silently (${usedBy})`)
  }
}

// --- the slot catalog -------------------------------------------------------

let catalogEntryCount = 0
let standardPropCount = 0
let ownerPropCount = 0
const catalogLines = linesOf(SLOT_CATALOG.file)

if (catalogLines === undefined) {
  // Reported once, outside the loop: the loop's own assertions cannot be read off
  // a file that is not there, and skipping them silently is the vacuous green §12
  // rules out.
  fail(`catalog file missing: ${SLOT_CATALOG.file} — the slot entries this plugin registers against are declared there, so its absence is drift`)
} else {
  for (const { slot, kind, standardProps, ownerProps } of SLOT_CATALOG.entries) {
    const found = catalogEntries(catalogLines, slot)
    if (found.length !== 1) {
      // Zero is the ordinary drift. More than one is the quieter failure: the
      // assertions below would be read off whichever entry came first, so a stale
      // duplicate could keep the gate green while the live entry changed.
      fail(
        found.length === 0
          ? `catalog entry missing: ${slot} in ${SLOT_CATALOG.file} — a slot the host stopped declaring means the row never mounts, which is drift, not a pass`
          : `catalog entry ambiguous: ${slot} is declared ${found.length} times in ${SLOT_CATALOG.file} — which entry governs the registration is undecided, and reading the first would be a guess`,
      )
      continue
    }
    const [entry] = found
    catalogEntryCount += 1
    report(`slot ${slot} — ${SLOT_CATALOG.file}:${entry.start}..${entry.end}`)

    // CONTEXT.md's vocabulary, because the two registrations differ in exactly this
    // way: `keyed` addresses one cell by `key`, `list` contributes one entry by
    // `id`. Getting the wrong one is what makes a registration silently not mount.
    const cell = kind === 'keyed' ? 'a keyed cell' : kind === 'list' ? 'a list entry' : `a ${kind} registration`
    const at = `${SLOT_CATALOG.file}:${entry.start}`
    const kindLine = entry.body.find((line) => /^\s*kind: /.test(line))
    if (kindLine === undefined) fail(`catalog entry ${slot} (${at}): declares no kind — whether this plugin registers a keyed cell or a list entry is undecided`)
    else if (!kindLine.includes(`"${kind}"`)) fail(`catalog entry ${slot} (${at}): declared as ${kindLine.trim()}, but this plugin registers ${cell} there`)

    const body = entry.body.join('\n')
    if (!/^\s*standardProps: \[/m.test(body)) fail(`catalog entry ${slot} (${at}): declares no standardProps — this plugin's renderers destructure its props and would draw undefined`)
    for (const prop of standardProps) {
      standardPropCount += 1
      if (!new RegExp(`["']${escapeRegex(prop)}: [^"']*["']`).test(body)) fail(`catalog entry ${slot} (${at}): standardProps no longer delivers ${prop}`)
    }
    for (const prop of ownerProps) {
      ownerPropCount += 1
      const owner = entry.body.find((line) => /^\s*ownerProps: /.test(line)) ?? ''
      if (!owner.includes(`${prop}:`)) fail(`catalog entry ${slot} (${at}): ownerProps no longer carries ${prop} — the entry cannot find the message it belongs to`)
    }
  }
}

// --- the bindings this plugin imports by name -------------------------------

for (const { file, specifier, names, usedBy } of EXPORTS) {
  const text = sourceOf(file)
  const pkg = packageOf(file)
  const packageName = packageNameOf(file)
  const manifestText = sourceOf(`${pkg}/package.json`)

  // Where the specifier actually lands, before anything is claimed about the
  // file: asserting a name in a module the plugin no longer resolves to would be
  // a green gate over a half that cannot load.
  if (manifestText === undefined) {
    fail(`import source missing: ${pkg}/package.json — ${usedBy} imports ${specifier}, and without the manifest nothing says that resolves to ${file}`)
  } else {
    let manifest
    try {
      manifest = JSON.parse(manifestText)
    } catch (error) {
      fail(`import source ${pkg}/package.json is not valid JSON: ${error.message} — ${usedBy} imports ${specifier}`)
    }
    if (manifest !== undefined) {
      const landed = exportTarget(manifest, specifier, packageName)
      const expected = file.slice(pkg.length + 1)
      if (landed !== expected) {
        fail(`import path moved: ${specifier} resolves to ${landed ?? '(nothing)'}, but this table and the fixtures read ${expected} — the plugin imports the specifier, not the file (${usedBy})`)
      } else {
        report(`import ${specifier} → ${file}`)
      }
    }
  }

  if (text === undefined) {
    fail(`import source missing: ${file} — ${usedBy} imports from it, so its absence is drift`)
    continue
  }
  for (const name of names) {
    exportCount += 1
    const escaped = escapeRegex(name)
    const listed = new RegExp(`export\\s*\\{[^}]*\\b${escaped}\\b`, 's').test(text) || new RegExp(`export\\s+(?:const|function|class|let|var)\\s+${escaped}\\b`).test(text)
    // No `file:line` here: the failure is that the name is absent, so there is no
    // line to point at. The other diagnostics cite one because they have a hit.
    if (!listed) fail(`PRESENT export ${name} (${file}): ${packageName} no longer exports it, and ${usedBy} imports it by that name`)
    else report(`export ${name} — ${file}`)
  }
}

// --- plugin-side invariant: no legacy event-view read outside the log module -

const LEGACY_EVENT_VIEW_READ = /\.\s*events\b|\[\s*["'`]events["'`]\s*\]|\{\s*events\b/

/**
 * The one read spelled `events` that is NOT the legacy event view.
 *
 * The CLIENT half registers its conversation Definitions through
 * `ctx.uiConversation.events.register(definition)` — the official entry point on
 * the current host, and the only way this plugin's rows can exist at all
 * (spec §7). That member is a *registry*, not an event list, and the only thing a
 * caller may take from it is its `register` method; the legacy member the
 * invariant protects is read for its CONTENTS, and an event array has no
 * `register` to take.
 *
 * So the exemption is an expression, not a file or a list: every occurrence of
 * this spelling is struck out of the line before the line is judged, so a line
 * that takes `register` off the registry AND reads the member for its contents
 * still fails. Exempting the whole line would hand back exactly the hole the
 * invariant exists to close.
 */
const CONVERSATION_REGISTRY_READ = /\.\s*events\s*\??\.\s*register\b/g

/**
 * One line with every registry-registration read removed.
 * @param line - a source line.
 * @returns the line as the legacy scan should judge it.
 */
function withoutRegistryReads(line) {
  return line.replace(CONVERSATION_REGISTRY_READ, '')
}

/**
 * §12 exempts *the log-reading module* from this invariant: that one module is
 * allowed to reach for the host's raw event-list member, because the covering
 * log has to be read through the host's own API before anything else in the
 * plugin may look at it.
 *
 * The exemption is DERIVED, not listed, so it cannot be widened by editing a
 * list here. A file is the log reader when it is `LOG_READER_SOURCE`, or when it
 * is a generated artifact whose own `GENERATED FILE` banner names that source —
 * and the banner is not something a hand edit can add to the shipped tree
 * without failing `git diff --exit-code -- lib/`, which is why `lib/log-read.js`
 * is emitted as its own artifact and kept external in `lib/index.js`
 * (`scripts/build.mjs`). The exempt source must exist in each scanned directory:
 * a stale exemption is drift, not a pass (§12's own rule).
 *
 * The pattern over-matches on purpose (§12: a false red is the safe direction):
 * it catches any `.events` member read and any `{ events }` destructuring, not
 * only reads through an identifier that happens to contain "session".
 */
const LOG_READER_SOURCE = 'src/log-read.js'
const GENERATED_BANNER = /GENERATED FILE[^\n]*built from ([^\s]+) by scripts\/build\.mjs/

/**
 * Whether one scanned file is the log-reading module.
 * @param relative - the file's path relative to the plugin root.
 * @param source - the file's text.
 * @returns true when the file is the log-reader source, or an artifact built from it.
 */
function isLogReader(relative, source) {
  if (relative === LOG_READER_SOURCE) return true
  return source.slice(0, 400).match(GENERATED_BANNER)?.[1] === LOG_READER_SOURCE
}

let scannedFiles = 0

for (const dir of ['src', 'lib']) {
  if (!existsSync(path.join(pluginRoot, dir))) {
    fail(`plugin tree missing: ${dir}/ under ${relativePath(rootDir, pluginRoot) || '.'} — the legacy-read scan has nothing to scan, which is drift rather than a pass`)
    continue
  }
  const files = walkJavaScript(path.join(pluginRoot, dir))
  let logReaders = 0
  for (const file of files) {
    scannedFiles += 1
    const relative = relativePath(pluginRoot, file)
    const source = readFileSync(file, 'utf8')
    if (isLogReader(relative, source)) {
      logReaders += 1
      continue
    }
    source.split('\n').forEach((line, index) => {
      if (!LEGACY_EVENT_VIEW_READ.test(withoutRegistryReads(line))) return
      fail(
        `plugin-side legacy read ${relative}:${index + 1} — reads a legacy event-view member; only the log-reading module ${LOG_READER_SOURCE} may, and it is not this file`,
      )
    })
  }
  if (logReaders !== 1) {
    fail(
      `${dir}/ holds ${logReaders} log-reading module(s) — the exemption is for exactly the one module built from ${LOG_READER_SOURCE}, and a missing one is drift rather than a pass`,
    )
  }
}

if (scannedFiles === 0) {
  fail('plugin-side scan found no JavaScript under src/ or lib/ — a vacuously green invariant is worse than no invariant')
}

app.close?.()

if (failures.length > 0) {
  for (const failure of failures) console.error(`check-host-contract: FAIL ${failure}`)
  console.error(`check-host-contract: ${failures.length} failure(s) against ${app.describe()}`)
  process.exit(1)
}

console.log(
  `check-host-contract: OK — ${presentCount} present and ${absentCount} absent member(s) asserted across ${ENTITIES.length} scoped entities, plus ${exportCount} imported binding(s) and ${catalogEntryCount} catalog entry(ies) (${standardPropCount} standard, ${ownerPropCount} owner prop(s)), asserted against ${app.describe()}`,
)
