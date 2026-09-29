/**
 * Seam ⑥: `lib/` is a committed build artifact, and the only honest way to
 * ship that is for a fresh build to reproduce it byte-for-byte. CI enforces it
 * with `git diff --exit-code -- lib/` right after `npm run build`; this suite
 * enforces the same property without needing a commit, and additionally pins
 * the artifact set and the generated-file banner (spec §13.5 #32).
 *
 * The exports-resolution checks run in a real Node process, because that is
 * where the Loader's `internal.import(name, baseUrl)` and the plugin manager
 * resolve them.
 */
import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import path from 'node:path'
import { rootDir, tmpDir } from './helpers/dsh.mjs'

const libDir = path.join(rootDir, 'lib')

/** Every file a build must produce, and the source it is built from. */
const ARTIFACTS = [
  { file: 'index.js', source: 'src/index.js' },
  { file: 'client.bundle.js', source: 'src/client.js' },
  { file: 'typert.host.js', source: 'src/typert.host.js' },
  { file: 'typert.client.js', source: 'src/typert.client.js' },
]

const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')

async function buildInto(outDir) {
  await rm(outDir, { recursive: true, force: true })
  execFileSync(process.execPath, ['scripts/build.mjs', outDir], { cwd: rootDir, stdio: 'pipe' })
}

function runNode(code) {
  return execFileSync(process.execPath, ['--input-type=module', '--eval', code], {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
}

describe('the build produces the committed artifact set', () => {
  it('emits exactly the four files the exports map promises', () => {
    const built = readdirSync(libDir).sort()
    expect(built).toEqual(ARTIFACTS.map((artifact) => artifact.file).sort())
  })

  it('every artifact carries the GENERATED FILE banner naming its source', () => {
    for (const { file, source } of ARTIFACTS) {
      const head = readFileSync(path.join(libDir, file), 'utf8').slice(0, 400)
      expect(head, `${file} must be marked generated`).toContain('GENERATED FILE — do not edit by hand')
      expect(head, `${file} must name ${source}`).toContain(source)
    }
  })
})

describe('the build is reproducible', () => {
  it('two fresh builds are byte-identical', async () => {
    const a = path.join(tmpDir, 'build-a')
    const b = path.join(tmpDir, 'build-b')
    await buildInto(a)
    await buildInto(b)

    for (const { file } of ARTIFACTS) {
      expect(sha256(path.join(b, file)), `${file} differs between two builds`).toBe(sha256(path.join(a, file)))
    }
  })

  it('the committed lib/ equals a fresh build — the CI diff gate can be green', async () => {
    const fresh = path.join(tmpDir, 'build-fresh')
    await buildInto(fresh)

    for (const { file } of ARTIFACTS) {
      expect(sha256(path.join(libDir, file)), `lib/${file} is stale: rebuild it (this is what \`git diff --exit-code -- lib/\` catches)`).toBe(
        sha256(path.join(fresh, file)),
      )
    }
  })
})

describe('the export faces resolve in a real Node process', () => {
  it('main resolves to the host half', () => {
    const out = runNode(`
      const mod = await import('dsh-resend')
      console.log(JSON.stringify({ name: mod.name, apply: typeof mod.apply, inject: mod.inject }))
    `)
    expect(JSON.parse(out)).toEqual({ name: 'dsh-resend', apply: 'function', inject: [] })
  })

  it('both descriptor faces resolve', () => {
    const out = runNode(`
      const host = await import('dsh-resend/typert-host')
      const client = await import('dsh-resend/typert-client')
      console.log(JSON.stringify({
        hostPackage: host.TYPERT.package,
        hostFace: host.TYPERT.face,
        clientPackage: client.TYPERT_REMOTE.package,
        clientFace: 'face' in client.TYPERT_REMOTE,
        clientModel: 'model' in client.TYPERT_REMOTE,
      }))
    `)
    expect(JSON.parse(out)).toEqual({
      hostPackage: 'dsh-resend',
      hostFace: 'host',
      clientPackage: 'dsh-resend',
      clientFace: false,
      clientModel: false,
    })
  })

  it('the client face resolves to the committed bundle without executing it', () => {
    const out = runNode(`
      console.log(import.meta.resolve('dsh-resend/client'))
    `)
    expect(out.endsWith('/lib/client.bundle.js')).toBe(true)
  })

  it('there is no ./typert export — the loader route is not taken (spec §6.6)', () => {
    const out = runNode(`
      try {
        import.meta.resolve('dsh-resend/typert')
        console.log('resolvable')
      } catch (error) {
        console.log(error.code)
      }
    `)
    expect(out).toBe('ERR_PACKAGE_PATH_NOT_EXPORTED')
  })
})