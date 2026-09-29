/**
 * The asar reader is the one piece of the host-contract gate whose real input
 * (a packed DSH Desktop installation) is absent from both this machine and CI,
 * so it is covered two ways:
 *
 *  - a synthetic archive written here in the container format Electron produces
 *    (u32LE@4 = header payload, u32LE@12 = JSON length, data at `8 + payload`),
 *    which also drives the packed-app path of the gate;
 *  - a cross-check against a real Electron archive when this machine happens to
 *    have one, because a reader and a writer that share one author's
 *    understanding of the format can agree with each other and still be wrong.
 *
 * Spec §12 states the data base as `17 + headerSize`; the measured base is
 * `align4(16 + headerSize)`. The real-archive case below is what keeps that
 * correction honest rather than a matter of opinion.
 */
import { describe, expect, it } from 'vitest'
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { openAsar } from '../scripts/asar.mjs'
import { resolveHostApp } from '../scripts/host-app.mjs'
import { rootDir, tmpDir } from './helpers/dsh.mjs'

/** Scratch location for the archives these tests write. */
const asarDir = path.join(tmpDir, 'asar')

/**
 * Opportunistic corroboration against an archive this project did not write:
 * `$DSH_TEST_ASAR` when set, otherwise the conventional Electron install roots
 * of this platform. CI has neither, so the case skips there — the synthetic
 * archive above is the portable coverage, and this case exists to keep
 * `scripts/asar.mjs` honest about the container format it claims to read rather
 * than agreeing with its own writer.
 */
function findRealArchive() {
  const explicit = process.env.DSH_TEST_ASAR
  if (explicit !== undefined && existsSync(explicit)) return explicit

  const found = []
  const visit = (dir, depth) => {
    if (found.length > 0 || depth < 0) return
    let entries
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (found.length > 0) return
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) visit(full, depth - 1)
      else if (entry.isFile() && entry.name.endsWith('.asar')) found.push(full)
    }
  }

  const seeds = [
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Programs'),
    process.env.ProgramFiles,
    '/Applications',
    '/opt',
  ]
  for (const seed of seeds.filter(Boolean)) visit(seed, 4)
  return found[0]
}

const REAL_ARCHIVE = findRealArchive()

/**
 * Write a minimal but faithful asar: a pickle header, the nested JSON index, then
 * the file payloads, with entry offsets relative to the data base. Directory
 * levels are nested `files` objects, exactly as Electron writes them.
 */
function writeAsar(target, files) {
  const index = { files: {} }
  const payloads = []
  let offset = 0

  for (const [name, contents] of Object.entries(files)) {
    const body = Buffer.from(contents, 'utf8')
    const segments = name.split('/')
    const leaf = segments.pop()
    let node = index
    for (const segment of segments) {
      node.files[segment] ??= { files: {} }
      node = node.files[segment]
    }
    node.files[leaf] = { size: body.length, offset: String(offset) }
    payloads.push(body)
    offset += body.length
  }

  const json = Buffer.from(JSON.stringify(index), 'utf8')
  // The pickle pads the header JSON to a 4-byte boundary; the data base is
  // 8 + payloadSize, which is exactly align4(16 + json.length).
  const padding = (4 - (json.length % 4)) % 4
  const payloadSize = 8 + json.length + padding
  const header = Buffer.alloc(8 + payloadSize)

  header.writeUInt32LE(4, 0)
  header.writeUInt32LE(payloadSize, 4)
  header.writeUInt32LE(payloadSize - 4, 8)
  header.writeUInt32LE(json.length, 12)
  json.copy(header, 16)

  mkdirSync(path.dirname(target), { recursive: true })
  writeFileSync(target, Buffer.concat([header, ...payloads]))
  return { dataBase: 8 + payloadSize, headerSize: json.length }
}

describe('reading a synthetic archive', () => {
  const archivePath = path.join(asarDir, 'synthetic.asar')
  const layout = writeAsar(archivePath, {
    'package.json': JSON.stringify({ name: 'dsh-plugin-desktop', version: '9.9.9' }),
    'node_modules/@deepseek-ai/dsh-session/package.json': JSON.stringify({ name: '@deepseek-ai/dsh-session', version: '0.2.0-rc.1' }),
    'lib/index.js': 'export const marker = "inside the archive"\n',
  })

  it('places the file data at align4(16 + headerSize), which is what the pickle header records', () => {
    const archive = openAsar(archivePath)
    const padding = (4 - (layout.headerSize % 4)) % 4

    expect(archive.dataBase).toBe(layout.dataBase)
    expect(archive.dataBase).toBe(16 + layout.headerSize + padding)
    // Spec §12's `17 + headerSize` agrees only when that padding is exactly 1;
    // otherwise it lands a byte or two off the first entry.
    expect(archive.dataBase - (17 + layout.headerSize)).toBe(padding - 1)
    archive.close()
  })

  it('reads entries byte-for-byte and reports missing ones as missing', () => {
    const archive = openAsar(archivePath)
    expect(archive.readFile('lib/index.js').toString('utf8')).toBe('export const marker = "inside the archive"\n')
    expect(archive.readFile('lib/absent.js')).toBeUndefined()
    expect(archive.exists('node_modules/@deepseek-ai/dsh-session/package.json')).toBe(true)
    expect(archive.exists('node_modules/@deepseek-ai/absent')).toBe(false)
    archive.close()
  })

  it('resolves as an app through host-app.mjs, so the gate can read a packed installation', () => {
    const app = resolveHostApp({ candidates: [archivePath] })
    expect(app?.kind).toBe('asar')
    expect(JSON.parse(app.read('package.json')).name).toBe('dsh-plugin-desktop')
    app.close?.()
  })

  it('a packed app has no import capability at all, rather than a stub that throws', () => {
    const app = resolveHostApp({ candidates: [archivePath] })
    expect(app.resolveFrom).toBeUndefined()
    app.close?.()
  })

  it('a candidate that is app-shaped but drifted is returned, so the gate diagnoses rather than skips', () => {
    const drifted = path.join(asarDir, 'drifted.asar')
    writeAsar(drifted, { 'lib/index.js': 'export {}\n' })
    const app = resolveHostApp({ candidates: [drifted] })
    expect(app?.kind).toBe('asar')
    app.close?.()
  })

  it('an unrelated directory that merely exists is skipped in favour of a later real app', () => {
    const unrelated = path.join(asarDir, 'unrelated')
    mkdirSync(unrelated, { recursive: true })
    const app = resolveHostApp({ candidates: [unrelated, archivePath] })
    expect(app?.root).toBe(archivePath)
    app.close?.()
  })

  it('nothing app-shaped anywhere means no app, not a vacuous pass', () => {
    rmSync(path.join(asarDir, 'nothing-here'), { recursive: true, force: true })
    expect(resolveHostApp({ candidates: [path.join(asarDir, 'nothing-here')] })).toBeUndefined()
  })
})

describe.runIf(REAL_ARCHIVE !== undefined)('cross-check against a real Electron archive', () => {
  const archivePath = REAL_ARCHIVE

  it('reads an archive this project did not write', () => {
    const archive = openAsar(archivePath)
    const manifest = JSON.parse(archive.readFile('package.json').toString('utf8'))
    expect(typeof manifest.name).toBe('string')

    // Independent corroboration of the data base: the entry named `package.json`
    // must parse as JSON at the offset the reader computes. Reading a few bytes
    // early (the spec's formula) yields a leading garbage byte and throws here.
    expect(manifest.name.length).toBeGreaterThan(0)
    archive.close()
  })

  it('agrees with the filesystem about an unpacked entry, when this archive has one', () => {
    const archive = openAsar(archivePath)
    const findUnpackedFile = (node, prefix = '') => {
      for (const [name, entry] of Object.entries(node.files ?? {})) {
        const full = prefix === '' ? name : `${prefix}/${name}`
        if (entry.unpacked === true && entry.files === undefined && entry.size !== undefined) return full
        const nested = findUnpackedFile(entry, full)
        if (nested !== undefined) return nested
      }
      return undefined
    }

    const unpacked = findUnpackedFile(archive.header)
    const onDisk = unpacked === undefined ? undefined : path.join(`${archivePath}.unpacked`, ...unpacked.split('/'))
    if (onDisk !== undefined && existsSync(onDisk)) {
      expect(archive.readFile(unpacked).equals(readFileSync(onDisk))).toBe(true)
    }
    archive.close()
  })
})

describe('the packed-app path through the gate', () => {
  it('check-host-contract reads a packed installation and reports drift with a pointer', () => {
    const drifted = path.join(asarDir, 'gate-packed.asar')
    writeAsar(drifted, {
      'package.json': JSON.stringify({ name: 'dsh-plugin-desktop', version: '9.9.9' }),
      'node_modules/@deepseek-ai/dsh-session/package.json': JSON.stringify({ name: '@deepseek-ai/dsh-session', version: '0.2.0-rc.1' }),
      // `eventAt` is deliberately absent: the gate must notice, and it must say
      // which file and member, even when the file lives inside an archive.
      'node_modules/@deepseek-ai/dsh-session/lib/index.js': 'export class Session {\n\tsnapshotEvents() { return [] }\n}\n',
    })

    const result = spawnSync(process.execPath, ['scripts/check-host-contract.mjs'], {
      cwd: rootDir,
      encoding: 'utf8',
      env: { ...process.env, DSH_APP_ROOT: drifted },
    })

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('PRESENT eventAt')
    expect(result.stderr).toContain('packed app')
  })
})