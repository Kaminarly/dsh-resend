/**
 * Seam ⑤: the three gates are programs, and a gate nobody has seen go red is
 * not a gate. Every "must fail" case here is proved against a fixture built at
 * run time, and every "must pass" case is proved against the real tree.
 *
 * Gate 3 has its own suite — `test/host-contract.test.mjs` — because its subject
 * is the contract table rather than this file's wiring, and because its
 * "must fail" cases are generated from that table. What stays here is the one
 * claim that spans all three gates: `npm run check` runs them.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { rootDir, libArtifacts, tmpDir as scratchDir } from './helpers/dsh.mjs'

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
 * A faces directory that also holds the artifacts which inline their own copy
 * of the table — the real ones, optionally patched — so the gate's "the copies
 * that run match the faces" check can be seen failing.
 *
 * Every committed artifact comes along, sibling imports included: without them
 * the host artifact would not even load, and this suite would be measuring a
 * load failure instead of the drift it injected.
 */
function facesWithArtifacts(name, patches = {}) {
  const files = {}
  for (const { file } of libArtifacts) {
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
