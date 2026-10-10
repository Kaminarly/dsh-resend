/**
 * Seam ⑤b — the host-contract gate (spec §12, ticket 09).
 *
 * The gate asserts, in both directions, every host member this plugin reads,
 * against the INSTALLED app. A gate nobody has seen go red is not a gate, so every
 * "must fail" case here is proved against a fixture built from the contract table
 * itself (`test/helpers/host-contract.mjs`), while the table's CONTENT is proved
 * against the real installation on machines that have one — that is the only case
 * which can say the table matches the host rather than matching its own generator.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { resolveHostApp } from '../scripts/host-app.mjs'
import { APP_MANIFEST, ENTITIES, EXPORTS, MEMBER_FORMS, SLOT_CATALOG, contractFiles, emptyTableGroups, packageNameOf, packageOf, scopeMarkers } from '../scripts/host-contract.mjs'
import { RESURRECTION_SHAPES, hostFixture, splice, writeTree } from './helpers/host-contract.mjs'
import { writeAsar } from './helpers/asar.mjs'
import { rootDir, tmpDir } from './helpers/dsh.mjs'

const fixtureRoot = path.join(tmpDir, 'host-contract-fixtures')

/** Run the gate over an installation and capture its exit status and streams. */
function runGate(args = [], env = {}) {
  const result = spawnSync(process.execPath, ['scripts/check-host-contract.mjs', ...args], {
    cwd: rootDir,
    encoding: 'utf8',
    env: { ...withoutAppOverrides(process.env), ...env },
    timeout: 60_000,
  })
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' }
}

/** Drop any installation override the calling shell happens to carry. */
function withoutAppOverrides(env) {
  const copy = { ...env }
  delete copy.DSH_APP_ROOT
  delete copy.DSH_APP_ASAR
  return copy
}

/** The streams together, so a failure message says what the gate actually said. */
function output({ stdout, stderr }) {
  return `${stderr}\n${stdout}`
}

/**
 * Materialise a fixture installation under `name` and point the gate at it.
 * @param name - the fixture directory, unique per case.
 * @param files - app-relative path to text, from {@link hostFixture}.
 * @param args - extra gate arguments (e.g. `--plugin-root`).
 * @returns the gate's `{ status, stdout, stderr }`.
 */
function gateAgainst(name, files, args = []) {
  const dir = path.join(fixtureRoot, name)
  rmSync(dir, { recursive: true, force: true })
  writeTree(dir, files)
  return runGate(args, { DSH_APP_ROOT: dir })
}

/** The same installation packed into an `app.asar`, as a shipped Desktop has it. */
function gateAgainstPacked(name, files) {
  const archive = path.join(fixtureRoot, `${name}.asar`)
  rmSync(archive, { force: true })
  writeAsar(archive, files)
  return runGate([], { DSH_APP_ASAR: archive })
}

/** Every `"Entity.member"` the table asserts, in either direction. */
const PRESENT_MEMBERS = ENTITIES.flatMap((entry) => entry.present.map((member) => ({ entry, member })))
const ABSENT_MEMBERS = ENTITIES.flatMap((entry) => entry.absent.map((member) => ({ entry, member })))
const EXPORT_NAMES = EXPORTS.flatMap((entry) => entry.names.map((name) => ({ entry, name })))

/** Write a plugin-tree fixture inside `name/` and return that directory. */
function writePluginTree(name, files) {
  const root = path.join(fixtureRoot, name)
  rmSync(root, { recursive: true, force: true })
  return writeTree(root, files)
}

/** One file of the real plugin tree, for fixtures that must mirror it. */
const realFile = (relative) => readFileSync(path.join(rootDir, relative), 'utf8')

beforeAll(() => {
  rmSync(fixtureRoot, { recursive: true, force: true })
  mkdirSync(fixtureRoot, { recursive: true })
})

describe('check-host-contract: the table is §12’s table', () => {
  it('asserts every member §12 names, in the direction §12 names', () => {
    // Transcribed from §12 rather than read off the table, so this case fails when
    // the table drifts from the spec in either direction.
    const wants = [
      'Session.snapshotEvents present',
      'Session.eventAt present',
      'Session.append present',
      'Session.seq present',
      'Session.surface present',
      'SurfaceManager.nodes present',
      'SessionStore.get present',
      'SessionStore.flush present',
      'AgentRegistry.get present',
      'ReactLoopAgent.status present',
      'ReactLoopAgent.followup present',
      'TokenMeter.measure present',
      'TokenMeter.estimateMessage present',
      'SessionQueryEngine.readSession present',
      'JsonlSessionPersistence.open present',
      'JsonlSessionPersistence.stat present',
      'SessionProjectionRegistry.stateOf present',
      'SlotRegistry.inject present',
      'LocaleRuntime.register present',
      'UiConversation.events present',
      'ClientRemoteService.$mount present',
      'Session.events absent',
    ]
    const actual = new Set([
      ...PRESENT_MEMBERS.map(({ entry, member }) => `${entry.entity}.${member} present`),
      ...ABSENT_MEMBERS.map(({ entry, member }) => `${entry.entity}.${member} absent`),
    ])
    for (const want of wants) expect(actual, want).toContain(want)

    // The client services §12 names are asserted by the injection name the plugin
    // uses, not only by a member; and the two catalog entries are in the table.
    for (const service of ['slots', 'locale', 'uiConversation', 'remote']) {
      expect(ENTITIES.filter((entry) => entry.service === service).length, `ctx.${service} is injected by name`).toBeGreaterThan(0)
    }
    expect(SLOT_CATALOG.entries.map((entry) => entry.slot)).toEqual(['conversation.chat.node', 'conversation.chat.assistant-actions', 'settings.section'])
  })

  it('names only app-relative files, and opens nothing outside the installation', () => {
    const files = contractFiles()
    expect(files.length).toBeGreaterThan(20)
    for (const file of files) {
      expect(path.isAbsolute(file), file).toBe(false)
      expect(file.startsWith('..'), file).toBe(false)
      expect(file.includes('\\'), file).toBe(false)
    }
    // No network, no profile, no writes: §12's gate reads only.
    const gate = realFile('scripts/check-host-contract.mjs')
    for (const forbidden of ['fetch(', 'http.request', 'writeFileSync', 'appendFileSync', 'mkdirSync', 'DSH_HOME', 'rmSync']) {
      expect(gate, `the gate must not use ${forbidden}`).not.toContain(forbidden)
    }
  })

  it('covers every declaration shape §12 names, under the name the gate reports', () => {
    // The cases are data in the fixture helper and the spelling names are data in
    // the contract table, so the coupling is asserted rather than hoped: the two
    // sets must be EQUAL. A renamed form in `MEMBER_FORMS` would otherwise make
    // every resurrection case pass by asking for a string the gate can no longer
    // produce — and a new spelling with no case would be silently unexercised.
    const exercised = new Set(RESURRECTION_SHAPES.map(({ reportedAs }) => reportedAs))
    const everyAbsentForm = new Set(MEMBER_FORMS.filter(({ absent }) => absent).map(({ form }) => form))
    expect([...exercised].sort()).toEqual([...everyAbsentForm].sort())
    expect(exercised.size, 'no two cases report the same spelling').toBe(RESURRECTION_SHAPES.length)
  })

  it('refuses an emptied table instead of asserting nothing', () => {
    // The table is data, so a group that never got filled would erase every
    // assertion built from it — and the OK line would still print. §12: a
    // vacuously green gate is worse than no gate.
    expect(emptyTableGroups()).toEqual([])
    expect(emptyTableGroups({ entities: [], importedBindings: EXPORTS, catalogEntries: SLOT_CATALOG.entries, scopeMarkers: scopeMarkers() })).toEqual(['entities'])
    expect(emptyTableGroups({ entities: ENTITIES, importedBindings: [], catalogEntries: [], scopeMarkers: [] })).toEqual(['importedBindings', 'catalogEntries', 'scopeMarkers'])
    // One level down, where a table entry nobody finished is just as quiet.
    const nested = emptyTableGroups({
      entities: [{ entity: 'Session', present: [], absent: [] }],
      importedBindings: [{ file: 'f.js', names: [] }],
      catalogEntries: [{ slot: 's', standardProps: [] }],
      scopeMarkers: ['m'],
    })
    expect(nested).toEqual([
      'entities[0] (Session: no member and no service)',
      'importedBindings[0] (f.js: no binding name)',
      'catalogEntries[0] (s: no standardProp)',
    ])
    // A service-only entity declares no member on purpose (it is the shape of the
    // service, and its registration is the assertion), so it must not read empty.
    const serviceOnly = emptyTableGroups({ entities: [{ entity: 'SessionPersistence', service: 'sessionPersistence', present: [], absent: [] }], importedBindings: EXPORTS, catalogEntries: SLOT_CATALOG.entries, scopeMarkers: scopeMarkers() })
    expect(serviceOnly).toEqual([])
    // The gate is wired to the guard, not merely able to call it.
    expect(realFile('scripts/check-host-contract.mjs')).toContain('emptyTableGroups()')
  })
})

describe('check-host-contract: a well-formed host passes', () => {
  it('passes against a healthy installation, and counts what it asserted', () => {
    const result = gateAgainst('healthy', hostFixture())
    expect(result.status, output(result)).toBe(0)
    // Each count is reported separately, so a group that silently stops being
    // asserted cannot hide inside a total that still looks right.
    const standardProps = SLOT_CATALOG.entries.reduce((total, entry) => total + entry.standardProps.length, 0)
    const ownerProps = SLOT_CATALOG.entries.reduce((total, entry) => total + entry.ownerProps.length, 0)
    expect(result.stdout).toContain(`${PRESENT_MEMBERS.length} present and ${ABSENT_MEMBERS.length} absent member(s)`)
    expect(result.stdout).toContain(`${EXPORT_NAMES.length} imported binding(s)`)
    expect(result.stdout).toContain(`${SLOT_CATALOG.entries.length} catalog entry(ies) (${standardProps} standard, ${ownerProps} owner prop(s))`)
    // The imported-binding count is separate from the member count, so a package
    // whose names stopped being listed cannot be read as a member that passed.
    expect(result.stdout).not.toContain(`${PRESENT_MEMBERS.length + EXPORT_NAMES.length} present`)
  })

  it('passes against the same installation packed into an app.asar', () => {
    const result = gateAgainstPacked('packed-healthy', hostFixture())
    expect(result.status, output(result)).toBe(0)
    expect(result.stdout).toContain('packed app')
  })

  it('says which shape and which line satisfied each assertion, under --report', () => {
    const result = gateAgainst('reported', hostFixture(), ['--report'])
    expect(result.status, output(result)).toBe(0)
    expect(result.stdout).toMatch(/present snapshotEvents ….*\(method declaration\)/)
    expect(result.stdout).toMatch(/present seq ….*\(getter\)/)
    expect(result.stdout).toMatch(/present events ….*\(constructor assignment\)/)
    expect(result.stdout).toMatch(/present register ….*prototype bolt-on/)
    expect(result.stdout).toMatch(/scope marker .*dsh-session\/package\.json — @deepseek-ai\/dsh-session@/)
  })

  it('treats an unknown option as a usage error rather than an ignored flag', () => {
    const { status, stderr } = runGate(['--allow-missing-members'])
    expect(status, stderr).toBe(2)
    expect(stderr).toContain('unknown option --allow-missing-members')
  })
})

describe('check-host-contract: a member the plugin reads cannot disappear quietly', () => {
  for (const { entry, member } of PRESENT_MEMBERS) {
    it(`goes red when ${entry.entity}.${member} is undeclared`, () => {
      const result = gateAgainst(`present-${entry.entity}-${member}`, hostFixture({ omitMembers: [`${entry.entity}.${member}`] }))
      expect(result.status, output(result)).toBe(1)
      expect(result.stderr).toContain(`PRESENT ${member} (${entry.file})`)
      expect(result.stderr).toContain(entry.entity)
      // Only that one assertion broke: a scoping bug would fail its neighbours too.
      expect(result.stderr.match(/FAIL PRESENT /g) ?? [], output(result)).toHaveLength(1)
    })
  }

  for (const { entry, name } of EXPORT_NAMES) {
    it(`goes red when ${entry.file.split('/')[2]} stops exporting ${name}`, () => {
      const result = gateAgainst(`export-${name}`, hostFixture({ omitExports: [`${entry.file}#${name}`] }))
      expect(result.status, output(result)).toBe(1)
      expect(result.stderr).toContain(`PRESENT export ${name} (${entry.file})`)
      expect(result.stderr).toContain('imports it by that name')
    })
  }

  it('goes red when the exports map stops resolving the specifier to the file the table reads', () => {
    // The plugin imports the SPECIFIER, not the file: a package that repoints a
    // subpath leaves this table reading a module nothing loads, and the name
    // assertion above would stay green over a host half that cannot import.
    const entry = EXPORTS.find((candidate) => candidate.specifier.includes('/') && candidate.specifier !== packageNameOf(candidate.file))
    const pkg = packageOf(entry.file)
    const packageName = packageNameOf(entry.file)
    const subpath = `.${entry.specifier.slice(packageName.length)}`
    const result = gateAgainst('repointed-exports', hostFixture({ repointExports: { [pkg]: { [subpath]: './lib/somewhere-else.js' } } }))
    expect(result.status, output(result)).toBe(1)
    expect(result.stderr).toContain(`import path moved: ${entry.specifier} resolves to lib/somewhere-else.js`)
    expect(result.stderr).toContain('the plugin imports the specifier, not the file')
  })
})

describe('check-host-contract: the resurrection alarms', () => {
  it('is green only because the member is really gone', () => {
    expect(ABSENT_MEMBERS.map(({ entry, member }) => `${entry.entity}.${member} absent`)).toContain('Session.events absent')
    expect(gateAgainst('alarm-healthy', hostFixture()).status).toBe(0)
  })

  for (const shape of RESURRECTION_SHAPES) {
    it(`goes red when Session.events returns as a ${shape.label}`, () => {
      const result = gateAgainst(`resurrect-${shape.label.replace(/\s+/g, '-')}`, hostFixture({ resurrect: { 'Session.events': shape.label } }))
      expect(result.status, output(result)).toBe(1)
      expect(result.stderr).toContain('ABSENT events')
      expect(result.stderr, output(result)).toContain(`as a ${shape.reportedAs}`)
      expect(result.stderr).toMatch(/dsh-session\/lib\/index\.js:\d+/)
    })
  }

  it('goes red when the client session controller grows a host write member', () => {
    const result = gateAgainst('resurrect-controller-write', hostFixture({ resurrect: { 'ClientSessions.append': 'method' } }))
    expect(result.status, output(result)).toBe(1)
    expect(result.stderr).toContain('ABSENT append (node_modules/@deepseek-ai/dsh-api-session-controller/lib/client.js')
    expect(result.stderr).toContain('ClientSessions')
  })

  it('does not fire on the client controller’s own event stream', () => {
    // The reverse assertion is entity-scoped: the client session object carries a
    // wire-event stream named `events`, which is not the host's legacy event view.
    // An alarm that can never be green is not an alarm.
    const controller = 'node_modules/@deepseek-ai/dsh-api-session-controller/lib/client.js'
    const files = hostFixture()
    files[controller] = splice(files[controller], '\tscope(id) {', '\tevents = new WireEventStream()\n\n\tscope(id) {', 'the client scope member')
    const result = gateAgainst('controller-events-ok', files)
    expect(result.status, output(result)).toBe(0)
  })

  it('does not confuse two entities that share a member name', () => {
    // `events` is asserted ABSENT on the host's `Session` and PRESENT on the
    // client's `uiConversation`: the same word, two owners, and the scoping is
    // what lets both assertions be true at once.
    const result = gateAgainst('events-two-owners', hostFixture({ omitMembers: ['UiConversation.events'] }))
    expect(result.status, output(result)).toBe(1)
    expect(result.stderr).toContain('PRESENT events')
    expect(result.stderr).not.toContain('ABSENT events')
  })

  it('is not fooled by a switch case that merely spells like a property', () => {
    // `case "append":` is a wire-event kind, not a member. Matching it would leave
    // the client-controller alarm permanently red on a healthy host.
    const controller = 'node_modules/@deepseek-ai/dsh-api-session-controller/lib/client.js'
    const files = hostFixture()
    files[controller] = splice(files[controller], '\tscope(id) {', '\tproject(change) {\n\t\tswitch (change.kind) {\n\t\t\tcase "append":\n\t\t\t\treturn change\n\t\t}\n\t}\n\n\tscope(id) {', 'a switch over wire kinds')
    expect(gateAgainst('switch-case-ok', files).status).toBe(0)
  })

  it('reads the entity by its whole name, not its suffix in a longer class', () => {
    // `ClientSession` ends with the name of the `Session` entity in the same file,
    // and the two are asserted in opposite directions for `append`. Without the
    // word boundary, the longer class would make the shorter entity's alarm red on
    // a host that is perfectly healthy.
    const controller = 'node_modules/@deepseek-ai/dsh-api-session-controller/lib/client.js'
    const nearMiss = `${hostFixture()[controller]}\nClientSession.prototype.append = function append() {}\n`
    const files = hostFixture()
    files[controller] = nearMiss
    expect(gateAgainst('suffix-near-miss', files).status).toBe(0)

    // The positive control: the entity's own prototype assignment is exactly what
    // the alarm is for.
    const real = hostFixture()
    real[controller] = `${hostFixture()[controller]}\nSession.prototype.append = function append() {}\n`
    const result = gateAgainst('suffix-real', real)
    expect(result.status, output(result)).toBe(1)
    expect(result.stderr).toContain('ABSENT append')
    expect(result.stderr).toContain('as a prototype bolt-on')
  })
})

describe('check-host-contract: drift is never a pass', () => {
  it('goes red when a package manifest — a scope marker — is gone', () => {
    const marker = 'node_modules/@deepseek-ai/dsh-token-meter/package.json'
    const result = gateAgainst('marker-gone', hostFixture({ omitMarkers: [marker] }))
    expect(result.status, output(result)).toBe(1)
    expect(result.stderr).toContain(`scope marker missing: ${marker}`)
  })

  it('goes red when the installed app has no manifest at all', () => {
    const files = hostFixture()
    delete files[APP_MANIFEST]
    const result = gateAgainst('app-manifest-gone', files)
    expect(result.status, output(result)).toBe(1)
    expect(result.stderr).toContain(`scope marker missing: ${APP_MANIFEST}`)
  })

  it('goes red when a scope marker names a different package than its path', () => {
    const files = hostFixture()
    files['node_modules/@deepseek-ai/dsh-session/package.json'] = JSON.stringify({ name: 'some-other-package', version: '1.0.0' })
    const result = gateAgainst('marker-mismatch', files)
    expect(result.status, output(result)).toBe(1)
    expect(result.stderr).toContain('names some-other-package, not the package the contract reads from')
  })

  it('goes red when a scope marker carries no version', () => {
    const files = hostFixture()
    files['node_modules/@deepseek-ai/dsh-session/package.json'] = JSON.stringify({ name: '@deepseek-ai/dsh-session' })
    const result = gateAgainst('marker-no-version', files)
    expect(result.status, output(result)).toBe(1)
    expect(result.stderr).toContain('has no version')
  })

  it('goes red when the class a member was scoped to is renamed away', () => {
    const file = 'node_modules/@deepseek-ai/dsh-token-meter/lib/index.js'
    const files = hostFixture()
    files[file] = files[file].replace('var TokenMeter = class TokenMeter extends Service {', 'var MeterRack = class MeterRack extends Service {')
    const result = gateAgainst('entity-renamed', files)
    expect(result.status, output(result)).toBe(1)
    expect(result.stderr).toContain(`scope marker missing: no declaration of TokenMeter was found in ${file}`)
  })

  it('goes red when the service name the plugin injects is renamed away', () => {
    const result = gateAgainst('service-renamed', hostFixture({ omitServices: ['tokenMeter'] }))
    expect(result.status, output(result)).toBe(1)
    expect(result.stderr).toContain('no longer registers the service "tokenMeter"')
  })

  it('goes red when a contract file is missing, naming the entity it declares', () => {
    const file = 'node_modules/@deepseek-ai/dsh-session-query/lib/index.js'
    const result = gateAgainst('file-gone', hostFixture({ omitFiles: [file] }))
    expect(result.status, output(result)).toBe(1)
    expect(result.stderr).toContain(`contract file missing: ${file}`)
    expect(result.stderr).toContain('SessionQueryEngine')
  })

  it('goes red on a mistyped override instead of reading "no app installed"', () => {
    const { status, stderr } = runGate([], { DSH_APP_ROOT: path.join(fixtureRoot, 'definitely-not-an-app') })
    expect(status, stderr).toBe(1)
    expect(stderr).toContain('is not a DSH Desktop app')
  })

  it('goes red on an existing but unrelated directory', () => {
    const dir = writePluginTree('unrelated-app', { 'readme.txt': 'not an app\n' })
    const { status, stderr } = runGate([], { DSH_APP_ROOT: dir })
    expect(status, stderr).toBe(1)
    expect(stderr).toContain('is not a DSH Desktop app')
  })

  it('prints an explicit SKIP and exits zero when no app is installed at all', () => {
    // On a machine with an installation the SKIP branch cannot be reached by
    // inference, so the well-known candidates are not in play here: the override
    // is simply absent, which is what CI sees.
    const discovered = resolveHostApp()
    const { status, stdout } = runGate([])
    expect(status, stdout).toBe(0)
    if (discovered === undefined) expect(stdout).toContain('SKIP')
    else expect(stdout).toContain('check-host-contract: OK')
  })
})

describe('check-host-contract: the slot catalog', () => {
  it('goes red when a slot entry the plugin registers against is gone', () => {
    const result = gateAgainst('catalog-entry-gone', hostFixture({ omitSlots: ['conversation.chat.node'] }))
    expect(result.status, output(result)).toBe(1)
    expect(result.stderr).toContain('catalog entry missing: conversation.chat.node')
  })

  it('goes red when the catalog file itself is gone, without skipping the entry assertions', () => {
    const result = gateAgainst('catalog-file-gone', hostFixture({ omitFiles: [SLOT_CATALOG.file] }))
    expect(result.status, output(result)).toBe(1)
    expect(result.stderr).toContain(`catalog file missing: ${SLOT_CATALOG.file}`)
    // Reported once and outside the entry loop: a missing file must not read as
    // "there were no entries to check".
    expect(result.stderr.match(/catalog file missing/g) ?? []).toHaveLength(1)
  })

  it('goes red when an entry stops declaring standardProps', () => {
    const result = gateAgainst('catalog-props-gone', hostFixture({ omitProps: ['conversation.chat.node#standardProps'] }))
    expect(result.status, output(result)).toBe(1)
    expect(result.stderr).toContain('declares no standardProps')
  })

  for (const prop of SLOT_CATALOG.entries[0].standardProps) {
    it(`goes red when chat.node stops delivering ${prop}`, () => {
      const result = gateAgainst(`catalog-prop-${prop}`, hostFixture({ omitProps: [`conversation.chat.node#${prop}`] }))
      expect(result.status, output(result)).toBe(1)
      expect(result.stderr).toContain(`standardProps no longer delivers ${prop}`)
    })
  }

  it('goes red when assistant-actions stops declaring its owner props', () => {
    const result = gateAgainst('catalog-owner-props', hostFixture({ omitProps: ['conversation.chat.assistant-actions#ownerProps'] }))
    expect(result.status, output(result)).toBe(1)
    expect(result.stderr).toContain('ownerProps no longer carries messageId')
  })

  it('goes red when a slot changes kind under a registration that cannot follow it', () => {
    // The plugin registers a keyed cell in `conversation.chat.node` and a list
    // entry in `conversation.chat.assistant-actions`; a flip in either changes what
    // `{ key }` versus `{ id }` means at the call site.
    const files = hostFixture()
    files[SLOT_CATALOG.file] = files[SLOT_CATALOG.file].replace('\t\tkey: "conversation.chat.node",\n\t\tkind: "keyed",', '\t\tkey: "conversation.chat.node",\n\t\tkind: "list",')
    const result = gateAgainst('catalog-kind-flip', files)
    expect(result.status, output(result)).toBe(1)
    expect(result.stderr).toContain('catalog entry conversation.chat.node')
    expect(result.stderr).toContain('declared as kind: "list"')
    // The catalog diagnostics carry the same `file:line` pointer as the rest.
    expect(result.stderr).toMatch(/dsh-cordis-client-runner\/lib\/client\.js:\d+/)
    // CONTEXT.md's vocabulary: one keyed cell by `key`, one list entry by `id`.
    expect(result.stderr).toContain('this plugin registers a keyed cell there')
  })

  it('goes red when a slot is declared twice, rather than reading whichever came first', () => {
    const files = hostFixture()
    const entry = '\t{\n\t\tkey: "conversation.chat.node",\n\t\tkind: "keyed",'
    expect(files[SLOT_CATALOG.file]).toContain(entry)
    files[SLOT_CATALOG.file] = files[SLOT_CATALOG.file].replace(entry, `${entry}\n\t{\n\t\tkey: "conversation.chat.node",\n\t\tkind: "single",`)
    const result = gateAgainst('catalog-duplicate', files)
    expect(result.status, output(result)).toBe(1)
    expect(result.stderr).toContain('catalog entry ambiguous: conversation.chat.node is declared 2 times')
  })
})

describe('check-host-contract: the plugin-side invariant', () => {
  /**
   * The real log-reading module: its source, and the artifact whose generated
   * banner names it. A fixture tree mirrors the tree the exemption is scoped to,
   * so the failing cases below measure the exemption's behaviour rather than the
   * absence of the module.
   */
  const logReader = () => ({ 'src/log-read.js': realFile('src/log-read.js'), 'lib/log-read.js': realFile('lib/log-read.js') })

  /** A plugin tree with one clean file in each scanned directory, plus the log reader. */
  const tree = (files = {}) => ({ 'src/index.js': 'export const apply = () => {}\n', 'lib/index.js': 'export const apply = () => {}\n', ...logReader(), ...files })

  beforeAll(() => {
    writeTree(path.join(fixtureRoot, 'healthy-app-host'), hostFixture())
  })

  const against = (name, files, extra = {}) => runGate(['--plugin-root', writePluginTree(name, files)], { DSH_APP_ROOT: path.join(fixtureRoot, 'healthy-app-host'), ...extra })

  it('passes the real plugin tree, with its real log reader', () => {
    const result = runGate([], { DSH_APP_ROOT: path.join(fixtureRoot, 'healthy-app-host') })
    expect(result.status, output(result)).toBe(0)
    expect(result.stdout).toContain('check-host-contract: OK')
  })

  it('fails with file:line when a src/ file reads a legacy event-view member', () => {
    const result = against('plugin-legacy-src', tree({ 'src/reads-log.js': 'export function rows(session) {\n  return session.events\n}\n' }))
    expect(result.status, output(result)).toBe(1)
    expect(result.stderr).toContain('plugin-side legacy read src/reads-log.js:2')
    expect(result.stderr).toContain('legacy event-view member')
  })

  it('fails with file:line when a lib/ artifact reads one', () => {
    const result = against('plugin-legacy-lib', tree({ 'lib/reads-log.js': 'export const rows = (log) => log.events\n' }))
    expect(result.status, output(result)).toBe(1)
    expect(result.stderr).toContain('plugin-side legacy read lib/reads-log.js:1')
  })

  it('over-matches on purpose: a receiver that is not named "session" still trips it', () => {
    const result = against('plugin-destructure', tree({ 'src/reads-log.js': 'const { events } = handle\n' }))
    expect(result.status, output(result)).toBe(1)
    expect(result.stderr).toContain('src/reads-log.js:1')
  })

  it('over-matches the computed spelling too', () => {
    // `session["events"]` reads the same member through a different spelling; the
    // invariant protects the member, not the punctuation.
    const result = against('plugin-computed', tree({ 'src/reads-log.js': 'export const rows = (session) => session["events"]\n' }))
    expect(result.status, output(result)).toBe(1)
    expect(result.stderr).toContain('plugin-side legacy read src/reads-log.js:1')
  })

  it('exempts the conversation-definition REGISTRY read, and only that expression', () => {
    const registry = against('plugin-registry', tree({ 'src/client.js': 'export const apply = (ctx) => ctx.uiConversation.events.register(definition)\n' }))
    expect(registry.status, output(registry)).toBe(0)

    const contents = against('plugin-registry-contents', tree({ 'src/client.js': 'export const rows = (service) => service.events.map((event) => event.seq)\n' }))
    expect(contents.status, output(contents)).toBe(1)
    expect(contents.stderr).toContain('plugin-side legacy read src/client.js:1')
  })

  it('exempts the registration on a line, not the whole line', () => {
    // The exemption is an expression: a line that registers a definition AND reads
    // the member for its contents is still a legacy read.
    const mixed = 'export const apply = (ctx) => { ctx.uiConversation.events.register(definition); return ctx.uiConversation.events.map((event) => event.seq) }\n'
    const result = against('plugin-registry-mixed', tree({ 'src/client.js': mixed }))
    expect(result.status, output(result)).toBe(1)
    expect(result.stderr).toContain('plugin-side legacy read src/client.js:1')
  })

  it('scopes the exemption to the module that declares it: a byte-identical copy is not the log reader', () => {
    const result = against('plugin-scoped', tree({ 'src/reads-log.js': realFile('src/log-read.js') }))
    expect(result.status, output(result)).toBe(1)
    expect(result.stderr).toContain('src/reads-log.js:')
  })

  it('treats a tree with no log-reading module as drift', () => {
    const result = against('plugin-stale', { 'src/index.js': 'export const apply = () => {}\n', 'lib/index.js': 'export const apply = () => {}\n' })
    expect(result.status, output(result)).toBe(1)
    expect(result.stderr).toContain('0 log-reading module(s)')
  })

  it('refuses a second claimant of the exemption inside one directory', () => {
    const result = against('plugin-second', tree({ 'lib/second-reader.js': '/* GENERATED FILE — do not edit by hand; built from src/log-read.js by scripts/build.mjs */\nexport const rows = (log) => log.events\n' }))
    expect(result.status, output(result)).toBe(1)
    expect(result.stderr).toContain('2 log-reading module(s)')
  })

  it('fails when the scanned tree has no JavaScript at all — a vacuously green invariant', () => {
    const result = against('plugin-empty', { 'src/.keep': '', 'lib/.keep': '' })
    expect(result.status, output(result)).toBe(1)
    expect(result.stderr).toContain('vacuously green invariant')
  })
})

const installed = resolveHostApp()

describe.runIf(installed !== undefined && installed.kind === 'dir')('check-host-contract against the installed app', () => {
  /** The contract's real files, copied into a temp tree so they can be mutated. */
  function copyOfInstalledContract(name) {
    const files = {}
    for (const file of contractFiles()) {
      const text = installed.read(file)
      if (text === undefined) throw new Error(`the installed app has no ${file}: the contract table is out of date`)
      files[file] = text
    }
    return writePluginTree(name, files)
  }

  it('is green on this machine’s installation', () => {
    const result = runGate([], { DSH_APP_ROOT: installed.root })
    expect(result.status, output(result)).toBe(0)
    expect(result.stdout).toContain(installed.describe())
  })

  it('goes red when a member is deleted from real host source', () => {
    const dir = copyOfInstalledContract('installed-copy')
    const file = path.join(dir, 'node_modules/@deepseek-ai/dsh-session-query/lib/index.js')
    writeFileSync(file, splice(readFileSync(file, 'utf8'), '\tasync readSession(sessionId) {', '\tasync readSessionRenamed(sessionId) {', 'readSession'))
    const result = runGate([], { DSH_APP_ROOT: dir })
    expect(result.status, output(result)).toBe(1)
    expect(result.stderr).toContain('PRESENT readSession')
  })

  it('goes red when a member bolted onto real host source is removed', () => {
    // The bolt-on path is the one the region scan cannot see, so it is proved
    // against the host's own spelling rather than only against a fixture.
    const dir = copyOfInstalledContract('installed-bolted')
    const file = path.join(dir, 'node_modules/@deepseek-ai/dsh-client-ui-renderer/lib/client.js')
    const source = readFileSync(file, 'utf8')
    expect(source).toContain('SlotRegistry.prototype.register = ')
    writeFileSync(file, source.replace('SlotRegistry.prototype.register = ', 'SlotRegistry.prototype.registerAway = '))
    const result = runGate([], { DSH_APP_ROOT: dir })
    expect(result.status, output(result)).toBe(1)
    expect(result.stderr).toContain('PRESENT register')
    expect(result.stderr).toContain('would fail at runtime')
  })

  it('goes red when Session.events is bolted back onto real host source', () => {
    const dir = copyOfInstalledContract('installed-resurrect')
    const file = path.join(dir, 'node_modules/@deepseek-ai/dsh-session/lib/index.js')
    writeFileSync(file, `${readFileSync(file, 'utf8')}\nObject.defineProperty(Session.prototype, "events", {\n\tget() {\n\t\treturn []\n\t},\n});\n`)
    const result = runGate([], { DSH_APP_ROOT: dir })
    expect(result.status, output(result)).toBe(1)
    expect(result.stderr).toContain('ABSENT events')
    expect(result.stderr).toContain('Object.defineProperty(X.prototype, …')
  })

  it('resolves every contract path out of an archive of the installed app', () => {
    // Same files, one archive: the built-in reader is what makes this gate work on
    // a shipped installation, so it must reach every path the table names.
    const archive = path.join(fixtureRoot, 'installed-packed.asar')
    const files = {}
    for (const file of contractFiles()) files[file] = installed.read(file)
    rmSync(archive, { force: true })
    writeAsar(archive, files)

    const app = resolveHostApp({ candidates: [archive] })
    expect(app.kind).toBe('asar')
    for (const file of contractFiles()) expect(app.read(file), `${file} inside the archive`).toBeDefined()

    const gate = runGate([], { DSH_APP_ASAR: archive })
    expect(gate.status, output(gate)).toBe(0)
    expect(gate.stdout).toContain('packed app')
    app.close?.()
  })
})
