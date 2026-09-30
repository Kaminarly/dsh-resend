/**
 * Seam ①: the package manifest and the profile patch declaration are the
 * bundle's public contract with the DSH Loader, the client-modules scan, and
 * the plugin-manager compatibility gate. Everything ticket 01 promises about
 * packaging is asserted here from the files as shipped.
 *
 * Independent sources of truth: spec §3 (package shape, peer rules),
 * ticket 01 (inject/peer/no-typert-export clauses), and the host's own
 * compatibility evaluation (@deepseek-ai/dsh-app-boot evaluatePluginCompatibility:
 * dsh-* peers are checked against the DSH runtime version with
 * includePrerelease: true).
 *
 * The target constants below are not free-floating: the last test in this file
 * compares them with the *installed* app the two app-reading gates already
 * target, so a DSH upgrade that would make the loader skip this bundle fails
 * here instead of only at `npm run probe`.
 */
import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import semver from 'semver'
import yaml from 'js-yaml'
import { resolveHostApp } from '../scripts/host-app.mjs'
import { patchRows, esmArtifacts, pkg } from './helpers/dsh.mjs'

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8')

/** Versions the spec pins ("Verified on DSH Desktop 2.0.16, dsh-* 0.2.0-rc.1"). */
const TARGET_DSH_VERSION = '0.2.0-rc.1'
const TARGET_CORDIS_VERSION = '4.0.4'
const TARGET_DESKTOP_VERSION = '2.0.16'
/** App-relative path of the package whose version *is* the DSH runtime version. */
const RUNTIME_PACKAGE = 'node_modules/@deepseek-ai/dsh-app-boot/package.json'

describe('bundle identity and export faces', () => {
  it('is one npm package, ESM, named dsh-resend', () => {
    expect(pkg.name).toBe('dsh-resend')
    expect(pkg.type).toBe('module')
  })

  it('main points at the host half', () => {
    expect(pkg.main).toBe('lib/index.js')
    expect(pkg.exports['.']).toEqual({ default: './lib/index.js' })
  })

  it('exports the client half as the self-registering loader entry', () => {
    expect(pkg.exports['./client']).toEqual({ default: './lib/client.bundle.js' })
  })

  it('exports both descriptor faces', () => {
    expect(pkg.exports['./typert-host']).toEqual({ default: './lib/typert.host.js' })
    expect(pkg.exports['./typert-client']).toEqual({ default: './lib/typert.client.js' })
  })

  it('takes the direct-registration route only: no ./typert export (spec §6.6)', () => {
    expect(Object.keys(pkg.exports)).not.toContain('./typert')
  })

  it('declares the profile patch layer and the web client platform', () => {
    expect(pkg.dsh.bundle.patch).toBe('./cordis.patch.yml')
    expect(pkg.dsh.client.platform).toBe('web')
    expect(existsSync(new URL('../cordis.patch.yml', import.meta.url))).toBe(true)
  })

  it('publishes every runtime file the loader and client scan need', () => {
    expect(pkg.files).toContain('lib/**/*.js')
    expect(pkg.files).toContain('cordis.patch.yml')
  })
})

describe('dsh.client.inject', () => {
  const inject = pkg.dsh.client.inject

  it('includes the API Gateway so the client half never activates before ctx.remote exists', () => {
    expect(inject).toContain('@deepseek-ai/dsh-api-gateway')
  })

  it('does NOT include the typert registry — the gateway client half declares it, a second declaration hits a module-table miss (spec §6.6)', () => {
    expect(inject).not.toContain('@deepseek-ai/dsh-typert-registry')
  })

  it('is a string array', () => {
    expect(Array.isArray(inject)).toBe(true)
    expect(inject.every((entry) => typeof entry === 'string')).toBe(true)
  })
})

describe('peerDependencies are the enforced compatibility mechanism (spec §3)', () => {
  const peers = pkg.peerDependencies

  const REQUIRED = [
    '@deepseek-ai/cordis',
    '@deepseek-ai/dsh-session',
    '@deepseek-ai/dsh-session-format-catalog',
    '@deepseek-ai/dsh-client-ui-primitives',
    '@deepseek-ai/dsh-client-ui-slots',
    'react',
  ]

  it('declares every host package the ticket names', () => {
    for (const name of REQUIRED) expect(peers, `missing peer ${name}`).toHaveProperty(name)
  })

  it('every range is bounded above and below', () => {
    for (const [name, range] of Object.entries(peers)) {
      const parsed = new semver.Range(range)
      const bounded = parsed.set.every((comparators) => {
        const ops = comparators.map((c) => c.operator)
        const hasUpper = ops.some((op) => op === '<' || op === '<=')
        const hasLower = ops.some((op) => op === '>' || op === '>=')
        return hasUpper && hasLower
      })
      expect(bounded, `peer ${name}: "${range}" is not a bounded range`).toBe(true)
    }
  })

  it('every dsh-* peer admits the pinned target exactly the way the host checks it (includePrerelease against the runtime version)', () => {
    // Mirrors @deepseek-ai/dsh-app-boot evaluatePluginCompatibility: each
    // @deepseek-ai/dsh-* peer must satisfy the DSH runtime version with
    // includePrerelease, or the plugin manager reports incompatible-version.
    for (const [name, range] of Object.entries(peers)) {
      if (name !== '@deepseek-ai/dsh' && !name.startsWith('@deepseek-ai/dsh-')) continue
      expect(
        semver.satisfies(TARGET_DSH_VERSION, range, { includePrerelease: true }),
        `peer ${name}: "${range}" rejects the target dsh runtime ${TARGET_DSH_VERSION}`,
      ).toBe(true)
    }
  })

  it('the cordis peer admits the targeted cordis', () => {
    expect(semver.satisfies(TARGET_CORDIS_VERSION, peers['@deepseek-ai/cordis'], { includePrerelease: true })).toBe(true)
  })

  it('the react peer admits React 18', () => {
    expect(semver.satisfies('18.3.1', peers['react'])).toBe(true)
  })
})

describe('no third-party contract package anywhere (spec §3)', () => {
  const CONTRACT_PACKAGES = ['dsh-log-contract']

  it('the only runtime dependency is the schema library the codecs are written in', () => {
    expect(pkg.dependencies).toEqual({ zod: '^4.4.3' })
  })

  it('no dependency field names a contract package', () => {
    for (const field of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
      for (const banned of CONTRACT_PACKAGES) {
        expect(Object.keys(pkg[field] ?? {}), `${field} must not contain ${banned}`).not.toContain(banned)
      }
    }
  })

  it('every bare specifier the shipped ESM artifacts import is declared, and every sibling import ships', () => {
    // The Node-side artifacts are ESM bundles with their host packages left
    // external; a profile installs `dependencies` and expects `peerDependencies`
    // to come from the host, so an undeclared specifier is a load failure in the
    // field and nowhere else. Relative specifiers are the other half of the same
    // contract: `lib/index.js` imports its log-reading module as a sibling
    // artifact (so §12's invariant can exempt one small file rather than the
    // whole host half), and that file has to be in `lib/` to ship.
    const declared = new Set([...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.peerDependencies ?? {})])
    const imported = new Set()
    const siblings = new Set()
    for (const { file } of esmArtifacts) {
      const source = read(`lib/${file}`)
      for (const match of source.matchAll(/(?:from|require\()\s*"([^"]+)"/g)) {
        const specifier = match[1]
        if (specifier.startsWith('.')) {
          siblings.add(specifier)
          continue
        }
        // `zod/mini` is the `zod` package; a subpath never changes which package must be declared.
        imported.add(specifier.startsWith('@') ? specifier.split('/').slice(0, 2).join('/') : specifier.split('/')[0])
      }
    }
    // Assert the scan itself found the imports, not only that whatever it found
    // is declared: a quoting change would otherwise make this test scan nothing
    // and pass.
    expect([...imported].sort()).toEqual([
      '@deepseek-ai/cordis',
      '@deepseek-ai/dsh-session',
      '@deepseek-ai/dsh-session-format-catalog',
      'zod',
    ])
    for (const packageName of imported) {
      expect(declared, `the shipped ESM artifacts import undeclared package ${packageName}`).toContain(packageName)
    }
    expect([...siblings].sort()).toEqual(['./host.js', './log-read.js', './resolve.js'])
    for (const specifier of siblings) {
      expect(existsSync(new URL(`../lib/${specifier.slice(2)}`, import.meta.url)), `${specifier} does not ship beside the artifact that imports it`).toBe(true)
    }
  })
})

describe('the three gates are wired into check, in order (ticket 01)', () => {
  it('check runs syntax, then descriptor validation, then host contract', () => {
    const parts = pkg.scripts.check.split('&&').map((part) => part.trim())
    expect(parts).toEqual([
      'node scripts/check-syntax.mjs',
      'node scripts/check-typert.mjs',
      'node scripts/check-host-contract.mjs',
    ])
  })

  it('the skeleton\'s empty-table concession is gone: the table is filled and no flag exempts it', () => {
    // Ticket 01 passed `--allow-empty-descriptors` because the table was empty,
    // and the gate printed VACUOUS. Ticket 02 fills the table, so an empty table
    // — or a leftover concession on the command line — is a failure now.
    expect(pkg.scripts.check).not.toContain('--allow-empty-descriptors')
    expect(read('README.md')).toContain('--allow-empty-descriptors')
  })

  it('build and test scripts exist', () => {
    expect(pkg.scripts.build).toContain('scripts/build.mjs')
    expect(pkg.scripts.test).toContain('vitest')
  })

  it('the probe is a first-class script, since it is the only Desktop-required check', () => {
    expect(pkg.scripts.probe).toContain('scripts/probe-profile.mjs')
    expect(read('README.md')).toContain('npm run probe')
  })
})

describe('cordis.patch.yml mounts the bundle as one normal Loader row', () => {
  it('is a top-level YAML array of loader patch entries', () => {
    const patches = yaml.load(read('cordis.patch.yml'))
    expect(Array.isArray(patches)).toBe(true)
    expect(patches.length).toBeGreaterThan(0)
  })

  it('inserts exactly one row: id dsh-resend, module dsh-resend', () => {
    expect(patchRows).toEqual([{ id: pkg.name, name: pkg.name }])
  })
})

describe('README pins the targeted upstream versions exactly (spec §3)', () => {
  const readme = read('README.md')

  it('names the Desktop version, the dsh package version, and the host-surface rule', () => {
    expect(readme).toContain(TARGET_DESKTOP_VERSION)
    expect(readme).toContain(TARGET_DSH_VERSION)
    expect(readme).toMatch(/host surface/i)
  })
})

describe('the pinned target is the runtime this machine actually runs', () => {
  const app = resolveHostApp()
  const installed = app?.read(RUNTIME_PACKAGE)

  it.skipIf(installed === undefined)('the peer target equals the installed dsh runtime version', () => {
    // The gate scripts resolve the app through this same helper, so the suite and
    // the gates cannot disagree about what "the host" means. Without this check,
    // a DSH upgrade only shows up as a silent `skipped` bundle at probe time —
    // exactly the drift that made the 0.1.7-rc.2 peers reject 0.2.0-rc.1.
    const runtimeVersion = JSON.parse(installed).version
    expect(runtimeVersion, `installed app is ${app.describe()}; update TARGET_DSH_VERSION (and the peer ranges) to it`).toBe(
      TARGET_DSH_VERSION,
    )
  })

  it.skipIf(installed === undefined)('the Desktop pin matches the installed app version', () => {
    const manifest = app.read('package.json')
    const desktopVersion = JSON.parse(manifest).version
    expect(
      desktopVersion,
      `installed app is ${app.describe()}; update TARGET_DESKTOP_VERSION (and the README table) to it`,
    ).toBe(TARGET_DESKTOP_VERSION)
  })
})
