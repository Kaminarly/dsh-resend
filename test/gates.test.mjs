/**
 * Seam ⑤: the three gates are programs, and a gate nobody has seen go red is
 * not a gate. Every "must fail" case here is proved against a fixture built at
 * run time, and every "must pass" case is proved against the real tree.
 *
 * The one case that cannot be forced on every machine is the host-contract
 * SKIP: this suite asserts it whenever no installed app is discoverable (which
 * is the CI situation), and asserts the OK path when one is (this machine).
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { resolveHostApp } from '../scripts/host-app.mjs'
import { rootDir, tmpDir as scratchDir } from './helpers/dsh.mjs'

const tmpDir = path.join(scratchDir, 'gate-fixtures')

/** Run a gate and capture its exit status and streams. */
function runGate(script, args = [], env = {}, timeout = 60_000) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: rootDir,
    encoding: 'utf8',
    env: { ...process.env, ...env },
    timeout,
  })
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' }
}

function writeFixture(files) {
  for (const [relative, content] of Object.entries(files)) {
    const target = path.join(tmpDir, relative)
    mkdirSync(path.dirname(target), { recursive: true })
    writeFileSync(target, content)
  }
  return tmpDir
}

beforeAll(() => {
  rmSync(tmpDir, { recursive: true, force: true })
  mkdirSync(tmpDir, { recursive: true })
})

describe('check-syntax', () => {
  it('parses the real lib/ and passes', () => {
    const { status, stdout } = runGate('scripts/check-syntax.mjs')
    expect(status).toBe(0)
    expect(stdout).toContain('check-syntax: OK')
  })

  it('fails on a broken file that is NOT the first one, and names it', () => {
    const dir = writeFixture({
      'syntax/a-valid.js': 'export const a = 1\n',
      'syntax/b-valid.js': 'export const b = 2\n',
      'syntax/c-broken.js': 'export const c = (\n',
      'syntax/d-broken.js': 'function () {\n',
    })
    const { status, stderr } = runGate('scripts/check-syntax.mjs', [path.join(dir, 'syntax')])

    expect(status).toBe(1)
    // The whole point: `node --check` would have validated only the first file.
    expect(stderr).toContain('c-broken.js')
    expect(stderr).toContain('d-broken.js')
    expect(stderr).toMatch(/c-broken\.js:\d+:\d+/)
    expect(stderr).toContain('2 failure(s)')
  })

  it('fails on a directory with no JavaScript at all (vacuous-green guard)', () => {
    const dir = writeFixture({ 'empty-syntax/readme.txt': 'nothing to parse\n' })
    const { status, stderr } = runGate('scripts/check-syntax.mjs', [path.join(dir, 'empty-syntax')])

    expect(status).toBe(1)
    expect(stderr).toContain('no JavaScript files')
  })

  it('fails on a missing directory', () => {
    const { status, stderr } = runGate('scripts/check-syntax.mjs', [path.join(tmpDir, 'does-not-exist')])
    expect(status).toBe(1)
    expect(stderr).toContain('does not exist')
  })
})

describe('check-typert', () => {
  it('validates the real faces through the installed validator', () => {
    const { status, stdout } = runGate('scripts/check-typert.mjs')
    expect(status).toBe(0)
    expect(stdout).toContain('host and client faces deep-equal')
    expect(stdout).toMatch(/driven against (installed app|devDependency)/)
    expect(stdout).toContain('rejection,')
    expect(stdout).toContain('acceptance probes')
    expect(stdout).toContain('refuse the rest')
    expect(stdout).not.toContain('VACUOUS')
  })

  it('fails when a face file is missing — never a vacuous pass', () => {
    const dir = writeFixture({ 'typert-missing/typert.host.js': 'export const TYPERT = {}\n' })
    const { status, stderr } = runGate('scripts/check-typert.mjs', ['--faces', path.join(dir, 'typert-missing')])

    expect(status).toBe(1)
    expect(stderr).toContain('descriptor face file is missing')
  })

  it('drives the installed validator: a namespace the registry refuses fails the gate and names the field', () => {
    const descriptor = `{
      id: 'dsh-resend#bad#ns/apply',
      service: 'resend',
      namespace: 'bad#ns',
      method: 'apply',
      invocation: { kind: 'direct' },
      parameters: [],
      result: { mode: 'strict', typeSymbol: 'x#y', create: () => ({ safeParse: () => ({ success: true }) }) },
    }`
    const dir = writeFixture({
      'typert-bad-namespace/typert.host.js': `export const TYPERT = { package: 'dsh-resend', face: 'host', schemas: [], invocations: [${descriptor}] }\n`,
      'typert-bad-namespace/typert.client.js': `export const TYPERT_REMOTE = { package: 'dsh-resend', descriptors: [${descriptor}] }\n`,
    })
    const { status, stderr } = runGate('scripts/check-typert.mjs', ['--faces', path.join(dir, 'typert-bad-namespace')])

    expect(status).toBe(1)
    expect(stderr).toContain('namespace')
    expect(stderr).toMatch(/installed validator|devDependency|rejected the contribution/)
  })

  it('fails when the two faces drift apart', () => {
    const descriptor = `{ id: 'dsh-resend#resend/apply', service: 'resend', namespace: 'resend', method: 'apply', invocation: { kind: 'direct' }, parameters: [], result: { mode: 'src-json' } }`
    const dir = writeFixture({
      'typert-drift/typert.host.js': `export const TYPERT = { package: 'dsh-resend', face: 'host', schemas: [], invocations: [${descriptor}] }\n`,
      'typert-drift/typert.client.js': `export const TYPERT_REMOTE = { package: 'dsh-resend', descriptors: [] }\n`,
    })
    const { status, stderr } = runGate('scripts/check-typert.mjs', ['--faces', path.join(dir, 'typert-drift')])

    expect(status).toBe(1)
    expect(stderr).toContain('do not carry the same descriptor list')
  })

  it('rejects a non-unary descriptor: mode, scope, cancellation and lookup are all refused', () => {
    const descriptor = `{
      id: 'dsh-resend#resend/apply',
      service: 'resend',
      namespace: 'resend',
      method: 'apply',
      invocation: { kind: 'direct' },
      mode: 'stream',
      scope: { context: 'session', wire: 'sessionId' },
      cancellation: { parameter: 'signal' },
      parameters: [{ name: 'request', wire: 'sessionId', source: 'lookup', lookup: 'session', codec: { mode: 'src-json' } }],
      result: { mode: 'src-json' },
      sourceLocation: 'src/x.ts:1',
    }`
    const dir = writeFixture({
      'typert-not-unary/typert.host.js': `export const TYPERT = { package: 'dsh-resend', face: 'host', schemas: [], invocations: [${descriptor}] }\n`,
      'typert-not-unary/typert.client.js': `export const TYPERT_REMOTE = { package: 'dsh-resend', descriptors: [${descriptor}] }\n`,
    })
    const { status, stderr } = runGate('scripts/check-typert.mjs', ['--faces', path.join(dir, 'typert-not-unary')])

    expect(status).toBe(1)
    for (const field of ['mode', 'scope', 'cancellation', 'lookup', 'sourceLocation']) {
      expect(stderr, `expected the gate to refuse ${field}`).toContain(field)
    }
  })

  it('refuses an empty descriptor table: §6.3 cannot be asserted against nothing', () => {
    const dir = writeFixture({
      'typert-empty/typert.host.js': `export const TYPERT = { package: 'dsh-resend', face: 'host', schemas: [], invocations: [] }\n`,
      'typert-empty/typert.client.js': `export const TYPERT_REMOTE = { package: 'dsh-resend', descriptors: [] }\n`,
    })
    const { status, stderr } = runGate('scripts/check-typert.mjs', ['--faces', path.join(dir, 'typert-empty')])

    expect(status).toBe(1)
    expect(stderr).toContain('the descriptor table is empty')
  })

  it('the skeleton\'s empty-table concession is gone: the flag is a usage error, not a silent pass', () => {
    const { status, stderr } = runGate('scripts/check-typert.mjs', ['--allow-empty-descriptors'])

    expect(status).toBe(2)
    expect(stderr).toContain('unknown option --allow-empty-descriptors')
  })
})

/**
 * Apply one verbatim patch to shipped source, or fail loudly.
 *
 * Every mutation fixture is built this way, and a patch that no longer matches
 * must never quietly yield a healthy fixture — that would turn the test's own
 * teeth into a vacuous green.
 */
function patched(source, replacement, what) {
  if (replacement === undefined) return source
  const [from, to] = replacement
  if (!source.includes(from)) throw new Error(`cannot patch ${what}: ${JSON.stringify(from)} is not in it any more`)
  return source.replace(from, to)
}

/**
 * A DSH-app-shaped fixture whose Typert registry has been crippled.
 *
 * This is how the mutation probes' teeth are proved: a gate that can only ever
 * report "the validator rejected it" cannot tell an enforced rule from a broken
 * harness, so the fixture drives the gate against a host that has *stopped*
 * enforcing a rule — or that rejects for an unrelated reason. The patch is
 * applied to the installed validator's own source.
 */
function crippledRegistryApp(name, replacements) {
  const registryDir = 'node_modules/@deepseek-ai/dsh-typert-registry'
  const installed = path.join(rootDir, registryDir)
  let source = readFileSync(path.join(installed, 'lib/index.js'), 'utf8')
  for (const replacement of replacements) source = patched(source, replacement, 'the installed registry')
  writeFixture({
    [`${name}/package.json`]: JSON.stringify({ name: 'dsh-plugin-desktop', version: '9.9.9' }),
    [`${name}/${registryDir}/package.json`]: readFileSync(path.join(installed, 'package.json'), 'utf8'),
    [`${name}/${registryDir}/lib/index.js`]: source,
  })
  return path.join(tmpDir, name)
}

describe('check-typert > the mutation probes have teeth', () => {
  it('goes red naming the field and the rule when the host stops enforcing a codec rule', () => {
    const app = crippledRegistryApp('crippled-codec', [
      ['function validateCodec(codec, subject) {', 'function validateCodec(codec, subject) {\n\treturn'],
    ])
    const { status, stderr } = runGate('scripts/check-typert.mjs', [], { DSH_APP_ROOT: app })

    expect(status).toBe(1)
    expect(stderr).toContain('§6.3 rule 5')
    expect(stderr).toContain('typeSymbol')
    expect(stderr).toContain('ACCEPTED the mutation')
    // A gate-2 failure carries a `file:line` in the hand-written source, not just
    // a bare path (§6.4).
    expect(stderr).toMatch(/src\/typert\.js:\d+/)
    // Both faces are driven, and the positive control still passes.
    expect(stderr).toContain('host face')
    expect(stderr).toContain('client face')
  })

  it('goes red naming the rule when the host stops enforcing the wire-name grammar', () => {
    const app = crippledRegistryApp('crippled-wirename', [
      ['function validateWireName(subject, value) {', 'function validateWireName(subject, value) {\n\treturn'],
    ])
    const { status, stderr } = runGate('scripts/check-typert.mjs', [], { DSH_APP_ROOT: app })

    expect(status).toBe(1)
    expect(stderr).toContain('§6.3 rule 3')
    expect(stderr).toContain('namespace')
  })

  it('refuses a rejection that comes from some other rule — the expected rule is named', () => {
    // The unmutated contribution must still be accepted, so this crippling only
    // swaps the *reason* for the one mutation class rule 5 covers.
    const app = crippledRegistryApp('crippled-wrongrule', [
      [
        'validateNonempty(`${subject} type symbol`, codec.typeSymbol);',
        'if (codec.typeSymbol === "") throw new Error("typert: something else entirely");',
      ],
    ])
    const { status, stderr } = runGate('scripts/check-typert.mjs', [], { DSH_APP_ROOT: app })

    expect(status).toBe(1)
    expect(stderr).toContain('but not by §6.3 rule 5')
    expect(stderr).toContain('type symbol')
  })
})

/**
 * A faces directory that also holds the two artifacts which inline their own copy
 * of the table — the real ones, optionally patched — so the gate's "the copies
 * that run match the faces" check can be seen failing.
 */
function facesWithArtifacts(name, patches = {}) {
  const files = {}
  for (const file of ['typert.host.js', 'typert.client.js', 'index.js', 'client.bundle.js']) {
    const source = readFileSync(path.join(rootDir, 'lib', file), 'utf8')
    files[`${name}/${file}`] = patched(source, patches[file], `lib/${file}`)
  }
  return writeFixture(files)
}

describe('check-typert > the copies that run are held to the same contract', () => {
  it('fails when the copy the host half registers is not the face the gate validated', () => {
    const dir = facesWithArtifacts('typert-artifact-host', {
      'index.js': ['typeSymbol: `${PACKAGE}/types#ResendApplyResult`', 'typeSymbol: `${PACKAGE}/types#SomethingElse`'],
    })
    const { status, stderr } = runGate('scripts/check-typert.mjs', ['--faces', path.join(dir, 'typert-artifact-host')])

    expect(status).toBe(1)
    expect(stderr).toContain('index.js')
    expect(stderr).toContain('is not the face')
  })

  it('fails when the copy the browser bundle mounts is not the face the gate validated', () => {
    const dir = facesWithArtifacts('typert-artifact-bundle', { 'client.bundle.js': ['var METHOD = "apply"', 'var METHOD = "apply-twice"'] })
    const { status, stderr } = runGate('scripts/check-typert.mjs', ['--faces', path.join(dir, 'typert-artifact-bundle')])

    expect(status).toBe(1)
    expect(stderr).toContain('client.bundle.js')
    expect(stderr).toContain('is not the face')
  })

  it('passes on the real tree, and says the copies were read back', () => {
    const { status, stdout } = runGate('scripts/check-typert.mjs')

    expect(status).toBe(0)
    expect(stdout).toContain('the copies that run match the faces (2 artifact(s) read back)')
  })
})

/** A minimal installed-app fixture: manifest + session package + a session class. */
const sessionManifest = JSON.stringify({ name: '@deepseek-ai/dsh-session', version: '0.2.0-rc.1' })
const sessionLib = `
	export class Session {
		constructor(log) { this.log = log }
		eventAt(seq) { return this.log[seq] }
		snapshotEvents() { return [...this.log] }
	}
	`

/** Files that make a directory look like a healthy DSH app (with a replaceable session lib). */
const fakeApp = (libSource = sessionLib) => ({
  'fake-app/package.json': JSON.stringify({ name: 'fake-app', version: '0.0.0' }),
  'fake-app/node_modules/@deepseek-ai/dsh-session/package.json': sessionManifest,
  'fake-app/node_modules/@deepseek-ai/dsh-session/lib/index.js': libSource,
})

describe('check-host-contract', () => {
  it('passes against a well-formed app fixture, asserting both directions', () => {
    const dir = writeFixture(fakeApp())
    const { status, stdout } = runGate('scripts/check-host-contract.mjs', [], { DSH_APP_ROOT: path.join(dir, 'fake-app') })

    expect(status).toBe(0)
    expect(stdout).toContain('2 present and 1 absent member(s) asserted')
  })

  it('fails when a member it reads disappears, and names the member', () => {
    const dir = writeFixture(fakeApp('export class Session {\n\tsnapshotEvents() { return [] }\n}\n'))
    const { status, stderr } = runGate('scripts/check-host-contract.mjs', [], { DSH_APP_ROOT: path.join(dir, 'fake-app') })

    expect(status).toBe(1)
    expect(stderr).toContain('PRESENT eventAt')
  })

  it('fails when the scope marker is missing — drift is never a pass', () => {
    const dir = writeFixture({
      // App-shaped (the desktop manifest), but its session package is gone:
      // that is drift the gate must diagnose rather than skip over.
      'scope-missing/package.json': JSON.stringify({ name: 'dsh-plugin-desktop', version: '9.9.9' }),
    })
    const { status, stderr } = runGate('scripts/check-host-contract.mjs', [], { DSH_APP_ROOT: path.join(dir, 'scope-missing') })

    expect(status).toBe(1)
    expect(stderr).toContain('scope marker missing')
  })

  it('fires the resurrection alarm when Session.events comes back', () => {
    const dir = writeFixture(fakeApp(`${sessionLib}\n\tObject.defineProperty(Session.prototype, 'events', {})\n`))
    const { status, stderr } = runGate('scripts/check-host-contract.mjs', [], { DSH_APP_ROOT: path.join(dir, 'fake-app') })

    expect(status).toBe(1)
    expect(stderr).toContain('ABSENT events')
  })

  it('treats a mistyped override as a hard failure, not as "no app installed"', () => {
    const { status, stderr } = runGate('scripts/check-host-contract.mjs', [], { DSH_APP_ROOT: path.join(tmpDir, 'not-an-app') })

    expect(status).toBe(1)
    expect(stderr).toContain('is not a DSH Desktop app')
  })

  it('treats an existing but unrelated directory as a hard failure too', () => {
    const dir = writeFixture({ 'not-an-app/readme.txt': 'not an app\n' })
    const { status, stderr } = runGate('scripts/check-host-contract.mjs', [], { DSH_APP_ROOT: path.join(dir, 'not-an-app') })

    expect(status).toBe(1)
    expect(stderr).toContain('is not a DSH Desktop app')
  })

  it('fails loudly when the app has drifted, instead of reporting OK', () => {
    const dir = writeFixture({
      'drifted/package.json': JSON.stringify({ name: 'dsh-plugin-desktop', version: '9.9.9' }),
      'drifted/node_modules/@deepseek-ai/dsh-session/package.json': sessionManifest,
      'drifted/node_modules/@deepseek-ai/dsh-session/lib/index.js': 'export class Session {}\n',
    })
    const { status, stderr } = runGate('scripts/check-host-contract.mjs', [], { DSH_APP_ROOT: path.join(dir, 'drifted') })

    expect(status).toBe(1)
    expect(stderr).toContain('PRESENT snapshotEvents')
    expect(stderr).toContain('PRESENT eventAt')
  })

  it('prints an explicit SKIP and exits zero when no app is installed at all', () => {
    const installed = resolveHostApp()
    const { status, stdout } = runGate('scripts/check-host-contract.mjs')

    expect(status).toBe(0)
    if (installed === undefined) {
      expect(stdout).toContain('SKIP')
    } else {
      // This machine has an installation, so the SKIP branch is covered by CI
      // (which has none) rather than here.
      expect(stdout).toContain('check-host-contract: OK')
    }
  })
})

describe('check-host-contract > the plugin-side invariant', () => {
  /** A plugin tree with one clean file in each scanned directory. */
  const tree = (name) => ({
    [`${name}/src/index.js`]: 'export const apply = () => {}\n',
    [`${name}/lib/index.js`]: 'export const apply = () => {}\n',
  })

  it('passes a tree that reads the log through the accessors', () => {
    const dir = writeFixture({ ...fakeApp(), ...tree('plugin-clean') })
    const { status, stdout } = runGate('scripts/check-host-contract.mjs', ['--plugin-root', path.join(dir, 'plugin-clean')], {
      DSH_APP_ROOT: path.join(dir, 'fake-app'),
    })

    expect(status).toBe(0)
    expect(stdout).toContain('check-host-contract: OK')
  })

  it('fails with file:line when any file reads a legacy event-view member', () => {
    const dir = writeFixture({
      ...fakeApp(),
      ...tree('plugin-legacy'),
      'plugin-legacy/src/reads-log.js': 'export function rows(session) {\n  return session.events\n}\n',
    })
    const { status, stderr } = runGate('scripts/check-host-contract.mjs', ['--plugin-root', path.join(dir, 'plugin-legacy')], {
      DSH_APP_ROOT: path.join(dir, 'fake-app'),
    })

    expect(status).toBe(1)
    expect(stderr).toContain('plugin-side legacy read src/reads-log.js:2')
    expect(stderr).toContain('legacy event-view member')
  })

  it('over-matches on purpose: a receiver that is not named "session" still trips it', () => {
    const dir = writeFixture({
      ...fakeApp(),
      ...tree('plugin-legacy'),
      'plugin-legacy/src/reads-log.js': 'const { events } = handle\n',
    })
    const { status, stderr } = runGate('scripts/check-host-contract.mjs', ['--plugin-root', path.join(dir, 'plugin-legacy')], {
      DSH_APP_ROOT: path.join(dir, 'fake-app'),
    })

    expect(status).toBe(1)
    expect(stderr).toContain('src/reads-log.js:1')
  })

  it('fails when the scanned tree has no JavaScript at all — a vacuously green invariant', () => {
    const dir = writeFixture({ ...fakeApp(), 'plugin-empty/src/.keep': '', 'plugin-empty/lib/.keep': '' })
    const { status, stderr } = runGate('scripts/check-host-contract.mjs', ['--plugin-root', path.join(dir, 'plugin-empty')], {
      DSH_APP_ROOT: path.join(dir, 'fake-app'),
    })

    expect(status).toBe(1)
    expect(stderr).toContain('vacuously green invariant')
  })
})

describe('the gates are wired as one `check` command', () => {
  it('`npm run check` runs all three gates and succeeds', () => {
    const stdout = execFileSync('npm', ['run', 'check'], {
      cwd: rootDir,
      encoding: 'utf8',
      // A .cmd shim cannot be spawned directly on Windows.
      shell: process.platform === 'win32',
    })
    expect(stdout).toContain('check-syntax: OK')
    expect(stdout).toContain('check-typert: OK')
    expect(stdout).toContain('§6.3')
    expect(stdout).toMatch(/check-host-contract: (OK|SKIP)/)
  }, 120_000)
})