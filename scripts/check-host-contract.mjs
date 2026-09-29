#!/usr/bin/env node
/**
 * Gate 3/3 — host contract. **Skeleton** (ticket 01); ticket 09 completes
 * §12's member table and the slot-catalog entries. The declaration-form matrix
 * below is the six shapes §12 names, with the two directions keeping their own
 * acceptance (see MEMBER_FORMS); ticket 09 owns broadening it further.
 *
 * It reads the *installed* app — an unpacked `resources/app` or a packed
 * `app.asar` — directly: no network, no profile mutation. It asserts both
 * directions, because a member that quietly disappears upstream is the failure
 * this gate exists for:
 *
 *   PRESENT  a member the plugin reads must still be declared;
 *   ABSENT   a member removed upstream (resurrection alarm) must stay gone.
 *
 * Two rules for the gate itself:
 *   - missing scope markers and missing entries are drift, never a pass: a
 *     vacuously green gate is worse than no gate;
 *   - a reverse (ABSENT) assertion over-matches rather than under-matches: a
 *     false red is the safe direction.
 *
 * With no installed app the gate prints an explicit SKIP and exits zero — it is
 * Desktop-optional (spec §12).
 *
 * Usage: node scripts/check-host-contract.mjs [--plugin-root <dir>]
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveHostApp } from './host-app.mjs'
import { optionValue } from './args.mjs'
import { walkJavaScript, relativePath } from './walk-javascript.mjs'

const rootDir = fileURLToPath(new URL('..', import.meta.url))

const argv = process.argv.slice(2)
/** The tree the plugin-side invariant scans; overridable so the scan is testable. */
const pluginRoot = path.resolve(rootDir, optionValue(argv, '--plugin-root', { bin: 'check-host-contract', fallback: rootDir }))

/** The scope marker: this file must exist and parse, or the gate is drift. */
const SCOPE = { file: 'node_modules/@deepseek-ai/dsh-session/package.json', field: 'version' }

const APP_MANIFEST = 'package.json'

/**
 * Members the plugin reads, as `{ file, member }`. Ticket 09 grows this to the
 * full §12 list; each entry is asserted through every declaration form below,
 * so a member cannot hide as a getter, a class field, a bolt-on, and so on.
 */
const PRESENT = [
  { file: 'node_modules/@deepseek-ai/dsh-session/lib/index.js', member: 'snapshotEvents' },
  { file: 'node_modules/@deepseek-ai/dsh-session/lib/index.js', member: 'eventAt' },
]

/**
 * Members that must stay removed (resurrection alarms). `Session.events` was
 * removed upstream; every read goes through the snapshot/`eventAt` accessors.
 */
const ABSENT = [{ file: 'node_modules/@deepseek-ai/dsh-session/lib/index.js', member: 'events' }]

/**
 * How a member may be spelled on the host, and which direction accepts each
 * spelling.
 *
 * §12's rule is that a reverse (ABSENT) assertion over-matches rather than
 * under-matches, and that every declaration shape counts — class field with
 * initializer, getter/setter, method, constructor assignment, object-literal
 * property, and bolt-on (`Object.assign(X.prototype, …)`,
 * `Object.defineProperty`, computed members). The two directions still differ,
 * deliberately:
 *
 *  - PRESENT must not accept a bare call (`x.snapshotEvents(`) or a computed
 *    access (`['snapshotEvents']`): those are usage, and accepting them would
 *    let a removed member pass on a leftover call site.
 *  - ABSENT must not accept a plain local (`const events = …`) or prose inside a
 *    string (`"… earlier events: …"`): neither is a member, and matching them
 *    would leave the alarm permanently red, which is the one way this gate
 *    becomes useless.
 */
const MEMBER_FORMS = [
  { form: 'getter/setter', spell: (name) => new RegExp(`(?:get|set)\\s+${name}\\s*\\(`), present: true, absent: true },
  { form: 'method declaration', spell: (name) => new RegExp(`^\\s*(?:async\\s+)?(?:static\\s+)?${name}\\s*\\(`, 'm'), present: true, absent: true },
  { form: 'class field', spell: (name) => new RegExp(`^\\s*(?:static\\s+)?${name}\\s*=[^=]`, 'm'), present: true, absent: false },
  { form: 'instance assignment', spell: (name) => new RegExp(`this\\.${name}\\s*=[^=]`), present: true, absent: false },
  { form: 'instance access', spell: (name) => new RegExp(`this\\.${name}\\s*[=(]`), present: false, absent: true },
  { form: 'computed member', spell: (name) => new RegExp(`\\[\\s*["'\`]${name}["'\`]\\s*\\]`), present: false, absent: true },
  { form: 'quoted object key', spell: (name) => new RegExp(`["'\`]${name}["'\`]\\s*:`), present: true, absent: true },
  { form: 'object-literal key', spell: (name) => new RegExp(`[{,]\\s*${name}\\s*:`), present: false, absent: true },
  { form: 'key at line start', spell: (name) => new RegExp(`^\\s*${name}\\s*:`, 'm'), present: false, absent: true },
  { form: 'prototype bolt-on', spell: (name) => new RegExp(`Object\\.(?:assign|definePropert(?:y|ies))[^\\n]*["'\`]${name}["'\`]`), present: true, absent: true },
]

/**
 * The forms a member may take in one direction.
 * @param member - member name as it appears in the host source.
 * @param direction - `present` (a declaration that must still exist) or
 *   `absent` (a spelling a removed member could return through).
 */
function memberForms(member, direction) {
  const name = member.replace(/\$/g, '\\$&')
  return MEMBER_FORMS.filter((candidate) => candidate[direction]).map(({ form, spell }) => ({ form, pattern: spell(name) }))
}

const failures = []
const fail = (message) => failures.push(message)

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

// --- scope markers: missing means drift, never a pass -----------------------

const scopeSource = app.read(SCOPE.file)
if (scopeSource === undefined) {
  fail(`scope marker missing: ${SCOPE.file} (installed app: ${app.describe()})`)
} else {
  try {
    const manifest = JSON.parse(scopeSource)
    if (typeof manifest[SCOPE.field] !== 'string' || manifest[SCOPE.field] === '') fail(`scope marker ${SCOPE.file} has no ${SCOPE.field}`)
  } catch (error) {
    fail(`scope marker ${SCOPE.file} is not valid JSON: ${error.message}`)
  }
}

const appManifestSource = app.read(APP_MANIFEST)
if (appManifestSource === undefined) fail(`scope marker missing: ${APP_MANIFEST}`)

// --- both directions -------------------------------------------------------

/** Read a contract file once, recording its absence as drift. */
function sourceOf(file) {
  const source = app.read(file)
  if (source === undefined) fail(`contract file missing: ${file} — the plugin reads members from it, so its absence is drift`)
  return source
}

for (const { file, member } of PRESENT) {
  const source = sourceOf(file)
  if (source === undefined) continue
  const hit = memberForms(member, 'present').find(({ pattern }) => pattern.test(source))
  if (hit === undefined) fail(`PRESENT ${member} (${file}): no declaration found in any known form`)
}

for (const { file, member } of ABSENT) {
  const source = sourceOf(file)
  if (source === undefined) continue
  const forms = memberForms(member, 'absent')
  source.split('\n').forEach((line, index) => {
    const hit = forms.find(({ pattern }) => pattern.test(line))
    if (hit !== undefined) {
      fail(`ABSENT ${member} (${file}:${index + 1}): resurrected as a ${hit.form} — this member was removed upstream and must not come back silently`)
    }
  })
}

// --- plugin-side invariant: no legacy event-view read outside the log module -

const LEGACY_EVENT_VIEW_READ = /\.\s*events\b|\{\s*events\b/

/**
 * §12 exempts *the log-reading module* from this invariant: that one module is
 * allowed to reach for the legacy view. The list is empty because the module
 * does not exist yet — the seam is here so ticket 03 adds its path here instead
 * of weakening the scan for the whole tree.
 *
 * The pattern over-matches on purpose (§12: a false red is the safe direction):
 * it catches any `.events` member read and any `{ events }` destructuring, not
 * only reads through an identifier that happens to contain "session".
 */
const LEGACY_READ_EXEMPT = []

let scannedFiles = 0

for (const dir of ['src', 'lib']) {
  if (!existsSync(path.join(pluginRoot, dir))) {
    fail(`plugin tree missing: ${dir}/ under ${relativePath(rootDir, pluginRoot) || '.'} — the legacy-read scan has nothing to scan, which is drift rather than a pass`)
    continue
  }
  for (const file of walkJavaScript(path.join(pluginRoot, dir))) {
    scannedFiles += 1
    const relative = relativePath(pluginRoot, file)
    if (LEGACY_READ_EXEMPT.includes(relative)) continue
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, index) => {
        if (LEGACY_EVENT_VIEW_READ.test(line)) {
          fail(`plugin-side legacy read ${relative}:${index + 1} — reads a legacy event-view member; only ${LEGACY_READ_EXEMPT.join(', ') || 'the log-reading module'} may, and it is not this file`)
        }
      })
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
  `check-host-contract: OK — SKELETON: ${PRESENT.length} present and ${ABSENT.length} absent member(s) asserted against ${app.describe()}; ticket 09 completes §12's member table and the catalog entries`,
)