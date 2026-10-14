// Research harness only. Never opens the user's rollback store or changes work files.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile, copyFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { zstdCompressSync, zstdDecompressSync, constants } from 'node:zlib'
import { createSnapshotStore } from '../../src/file-snapshots.js'

const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const compress = bytes => zstdCompressSync(bytes, { params: { [constants.ZSTD_c_compressionLevel]: 3 } })
const env = { ...process.env, GIT_CONFIG_COUNT: '0', GIT_TERMINAL_PROMPT: '0' }
for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES', 'GIT_COMMON_DIR', 'GIT_NAMESPACE']) delete env[key]
const git = (home, args, input) => execFileSync('git', [`--git-dir=${home}`, ...args], { input, env, windowsHide: true, maxBuffer: 16 * 1024 * 1024 })
async function size(directory) {
  let total = 0
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = path.join(directory, entry.name)
    total += entry.isDirectory() ? await size(name) : (await stat(name)).size
  }
  return total
}
async function sampleRead(task) {
  const samples = []
  for (let i = 0; i < 5; i++) {
    const start = performance.now()
    await task()
    samples.push(performance.now() - start)
  }
  samples.sort((a, b) => a - b)
  return +samples[2].toFixed(2)
}
function randomBytes(length, seed) {
  const bytes = Buffer.alloc(length)
  let state = seed >>> 0
  for (let i = 0; i < length; i++) {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5
    bytes[i] = state & 255
  }
  return bytes
}
function edits(initial, dispersed = false) {
  const versions = [initial]
  for (let n = 1; n <= 20; n++) {
    const next = Buffer.from(versions.at(-1))
    for (let i = 0; i < (dispersed ? 10 : 1); i++) {
      const offset = Math.floor(next.length * (i + 1) / (dispersed ? 11 : 2)) + n
      next[offset] = next[offset] === 65 ? 66 : 65
    }
    versions.push(next)
  }
  return versions
}
function lineEdits(initial) {
  const versions = [initial]
  for (let n = 1; n <= 20; n++) {
    const before = versions.at(-1), middle = Math.floor(before.length / 2)
    const insert = Buffer.from(`\r\n// 第 ${n} 次局部修改：${randomBytes(256, n + 500).toString('hex')}\r\n`)
    const removed = n % 2 === 0 ? 256 : 0
    versions.push(Buffer.concat([before.subarray(0, middle), insert, before.subarray(middle + removed)]))
  }
  return versions
}
// Byte replacement between the longest unchanged prefix and suffix.
// This deliberately simple prototype is not an optimal diff algorithm.
function delta(base, next) {
  let prefix = 0, suffix = 0
  while (prefix < Math.min(base.length, next.length) && base[prefix] === next[prefix]) prefix++
  while (suffix < Math.min(base.length, next.length) - prefix && base[base.length - 1 - suffix] === next[next.length - 1 - suffix]) suffix++
  const header = Buffer.alloc(12)
  header.writeUInt32LE(prefix, 0); header.writeUInt32LE(suffix, 4); header.writeUInt32LE(next.length, 8)
  return compress(Buffer.concat([header, next.subarray(prefix, next.length - suffix)]))
}
function apply(base, compressed) {
  const payload = zstdDecompressSync(compressed)
  const prefix = payload.readUInt32LE(0), suffix = payload.readUInt32LE(4), length = payload.readUInt32LE(8)
  assert.ok(prefix + suffix <= base.length)
  const next = Buffer.concat([base.subarray(0, prefix), payload.subarray(12), base.subarray(base.length - suffix)])
  assert.equal(next.length, length)
  return next
}

// Alternative contract: rollback from the exact current post-state, not an independent archive.
// Same-length replacements use multiple byte ranges; length changes use one span.
function inverseDelta(before, after) {
  const ranges = []
  if (before.length === after.length) {
    for (let offset = 0; offset < before.length;) {
      if (before[offset] === after[offset]) { offset++; continue }
      const start = offset
      while (offset < before.length && before[offset] !== after[offset]) offset++
      ranges.push([start, offset, before.subarray(start, offset)])
    }
  } else {
    let prefix = 0, suffix = 0
    while (prefix < Math.min(before.length, after.length) && before[prefix] === after[prefix]) prefix++
    while (suffix < Math.min(before.length, after.length) - prefix && before[before.length - 1 - suffix] === after[after.length - 1 - suffix]) suffix++
    ranges.push([prefix, after.length - suffix, before.subarray(prefix, before.length - suffix)])
  }
  const count = Buffer.alloc(4); count.writeUInt32LE(ranges.length)
  const parts = [count]
  for (const [from, to, bytes] of ranges) {
    const head = Buffer.alloc(12)
    head.writeUInt32LE(from, 0); head.writeUInt32LE(to, 4); head.writeUInt32LE(bytes.length, 8)
    parts.push(head, bytes)
  }
  return compress(Buffer.concat(parts))
}
function reverse(after, payload) {
  const raw = zstdDecompressSync(payload), count = raw.readUInt32LE(0), parts = []
  let offset = 4, cursor = 0
  for (let n = 0; n < count; n++) {
    const from = raw.readUInt32LE(offset), to = raw.readUInt32LE(offset + 4), length = raw.readUInt32LE(offset + 8)
    offset += 12
    assert.ok(from >= cursor && to >= from && to <= after.length && offset + length <= raw.length)
    parts.push(after.subarray(cursor, from), raw.subarray(offset, offset + length))
    offset += length; cursor = to
  }
  assert.equal(offset, raw.length)
  return Buffer.concat([...parts, after.subarray(cursor)])
}

const temporary = await mkdtemp(path.join(tmpdir(), 'resend-storage-research-'))
const output = path.resolve('output/rollback-storage-research')
await mkdir(output, { recursive: true })
try {
  const structuredLines = Array.from({ length: 9000 }, (_, i) => `export const item_${i} = { name: "中文项目", enabled: true, description: "persistent rollback state", index: ${i} };\r\n`).join('')
  const diverse = Buffer.from(randomBytes(512 * 1024, 12345).toString('hex'))
  const cases = [
    ['tiny-markdown', edits(Buffer.from('# 示例项目\r\n\r\n这是需要原样恢复的中文说明。\r\n'.repeat(3)))],
    ['repository-ui-source', edits(await readFile(new URL('../../src/ui.js', import.meta.url)))],
    ['structured-source-1MiB-local-edits', edits(Buffer.from(structuredLines).subarray(0, 1024 * 1024))],
    ['diverse-text-1MiB-local-edits', edits(diverse)],
    ['diverse-text-1MiB-dispersed-edits', edits(diverse, true)],
    ['diverse-text-1MiB-line-insert-delete', lineEdits(diverse)],
    ['binary-1MiB-local-edits', edits(randomBytes(1024 * 1024, 42))],
    ['unrelated-binary-512KiB-rewrites', Array.from({ length: 21 }, (_, i) => randomBytes(512 * 1024, i + 77))],
  ]
  const results = []
  for (const [name, versions] of cases) {
    const root = path.join(temporary, name)
    await mkdir(root)
    const unique = [...new Map(versions.map(bytes => [hash(bytes), bytes])).values()]
    const rawBytes = unique.reduce((n, bytes) => n + bytes.length, 0)
    const rows = []
    const rawHome = path.join(root, 'raw')
    await mkdir(rawHome)
    const rawStore = createSnapshotStore(rawHome)
    let started = performance.now()
    const rawRefs = []
    for (const bytes of versions) rawRefs.push(await rawStore.put(bytes, 'cas'))
    const rawWriteMs = performance.now() - started
    const reopened = createSnapshotStore(rawHome)
    for (let i = 0; i < versions.length; i++) assert.deepEqual(await reopened.get(rawRefs[i]), versions[i])
    const rawPreviewMs = await sampleRead(async () => {
      assert.deepEqual(await reopened.get(rawRefs.at(-1)), versions.at(-1))
      assert.deepEqual(await reopened.get(rawRefs[0]), versions[0])
    })
    rows.push({ method: 'raw-cas', bytes: await size(rawHome), writeMs: +rawWriteMs.toFixed(1), previewReadMedianMs: rawPreviewMs })

    const fullHome = path.join(root, 'zstd-full')
    await mkdir(fullHome)
    started = performance.now()
    for (const bytes of unique) await writeFile(path.join(fullHome, hash(bytes)), compress(bytes))
    const fullWriteMs = performance.now() - started
    for (const bytes of versions) assert.deepEqual(zstdDecompressSync(await readFile(path.join(fullHome, hash(bytes)))), bytes)
    const fullPreviewMs = await sampleRead(async () => {
      for (const bytes of [versions.at(-1), versions[0]]) {
        const decoded = zstdDecompressSync(await readFile(path.join(fullHome, hash(bytes))))
        assert.equal(hash(decoded), hash(bytes)); assert.deepEqual(decoded, bytes)
      }
    })
    rows.push({ method: 'zstd-full', bytes: await size(fullHome), writeMs: +fullWriteMs.toFixed(1), previewReadMedianMs: fullPreviewMs })

    const chainHome = path.join(root, 'checkpoint-delta')
    await mkdir(chainHome)
    const index = []
    started = performance.now()
    for (let i = 0; i < versions.length; i++) {
      let payload = compress(versions[i]), kind = 'full', base = null
      if (i % 8 !== 0) {
        const patch = delta(versions[i - 1], versions[i])
        if (patch.length < payload.length) { payload = patch; kind = 'delta'; base = i - 1 }
      }
      index.push({ hash: hash(versions[i]), kind, base })
      await writeFile(path.join(chainHome, `${i}.bin`), payload)
    }
    await writeFile(path.join(chainHome, 'index.json'), JSON.stringify(index))
    const deltaWriteMs = performance.now() - started
    const saved = JSON.parse(await readFile(path.join(chainHome, 'index.json'), 'utf8'))
    let maximumDepth = 0
    async function load(i, depth = 0) {
      maximumDepth = Math.max(maximumDepth, depth)
      const item = saved[i], payload = await readFile(path.join(chainHome, `${i}.bin`))
      const bytes = item.kind === 'full' ? zstdDecompressSync(payload) : apply(await load(item.base, depth + 1), payload)
      assert.equal(hash(bytes), item.hash)
      return bytes
    }
    for (let i = 0; i < versions.length; i++) assert.deepEqual(await load(i), versions[i])
    assert.ok(maximumDepth <= 7)
    rows.push({ method: 'zstd-byte-delta-checkpoint8', bytes: await size(chainHome), writeMs: +deltaWriteMs.toFixed(1), maximumDepth })

    const inverseHome = path.join(root, 'inverse-only')
    await mkdir(inverseHome)
    const inverseIndex = []
    started = performance.now()
    for (let i = 1; i < versions.length; i++) {
      inverseIndex.push({ beforeHash: hash(versions[i - 1]), afterHash: hash(versions[i]) })
      await writeFile(path.join(inverseHome, `${i}.bin`), inverseDelta(versions[i - 1], versions[i]))
    }
    await writeFile(path.join(inverseHome, 'index.json'), JSON.stringify(inverseIndex))
    const inverseWriteMs = performance.now() - started
    const inverseSaved = JSON.parse(await readFile(path.join(inverseHome, 'index.json'), 'utf8'))
    async function reverseStep(current, i) {
      const record = inverseSaved[i - 1]
      assert.equal(hash(current), record.afterHash, 'post-state-diverged')
      const before = reverse(current, await readFile(path.join(inverseHome, `${i}.bin`)))
      assert.equal(hash(before), record.beforeHash, 'restored-state-diverged')
      return before
    }
    let current = Buffer.from(versions.at(-1))
    for (let i = versions.length - 1; i > 0; i--) {
      current = await reverseStep(current, i)
      assert.deepEqual(current, versions[i - 1])
    }
    const external = Buffer.from(versions.at(-1)); external[0] ^= 1
    await assert.rejects(reverseStep(external, versions.length - 1), /post-state-diverged/)
    const inversePreviewMs = await sampleRead(async () => {
      let current = versions.at(-1)
      for (let i = versions.length - 1; i > 0; i--) current = await reverseStep(current, i)
      assert.deepEqual(current, versions[0])
    })
    rows.push({ method: 'inverse-byte-delta-current-file-base', bytes: await size(inverseHome), writeMs: +inverseWriteMs.toFixed(1),
      requiresUnchangedCurrentPostState: true, independentArchive: false, previewReadMedianMs: inversePreviewMs })

    const gitHome = path.join(root, 'loose.git')
    execFileSync('git', ['init', '--bare', '--quiet', gitHome], { env, windowsHide: true })
    started = performance.now()
    const oids = versions.map(bytes => git(gitHome, ['hash-object', '-w', '--stdin'], bytes).toString('utf8').trim())
    const looseWriteMs = performance.now() - started
    const looseBytes = await size(path.join(gitHome, 'objects'))
    const readGitPair = location => {
      for (const i of [versions.length - 1, 0]) {
        const bytes = git(location, ['cat-file', 'blob', oids[i]])
        assert.equal(hash(bytes), hash(versions[i])); assert.deepEqual(bytes, versions[i])
      }
    }
    const loosePreviewMs = await sampleRead(() => readGitPair(gitHome))
    rows.push({ method: 'git-loose', bytes: looseBytes, writeMs: +looseWriteMs.toFixed(1), initializationBytes: await size(gitHome) - looseBytes,
      previewReadMedianMs: loosePreviewMs })
    const packRoot = path.join(gitHome, 'objects', 'pack')
    await mkdir(packRoot, { recursive: true })
    started = performance.now()
    git(gitHome, ['pack-objects', '--window=50', '--depth=8', '--threads=1', '--delta-base-offset', path.join(packRoot, 'pack')], [...new Set(oids)].join('\n') + '\n')
    const packMs = performance.now() - started
    const packedBytes = await size(packRoot)
    const packedHome = path.join(root, 'packed-read.git')
    execFileSync('git', ['init', '--bare', '--quiet', packedHome], { env, windowsHide: true })
    for (const file of await readdir(packRoot)) await copyFile(path.join(packRoot, file), path.join(packedHome, 'objects', 'pack', file))
    for (let i = 0; i < versions.length; i++) assert.deepEqual(git(packedHome, ['cat-file', 'blob', oids[i]]), versions[i])
    const packedPreviewMs = await sampleRead(() => readGitPair(packedHome))
    rows.push({ method: 'git-pack', bytes: packedBytes, packMs: +packMs.toFixed(1), includesPackIndex: true, previewReadMedianMs: packedPreviewMs })
    const result = { name, versions: versions.length, uniqueVersions: unique.length, originalFileBytes: versions[0].length, rawBytes,
      byteExactRestore: true, rows: rows.map(row => ({ ...row, savingVersusRawPercent: +(100 * (1 - row.bytes / rawBytes)).toFixed(2) })) }
    results.push(result)
    console.log(JSON.stringify(result))
  }
  // Strict byte restoration of BOM, CRLF/LF, missing final newline, empty and binary payloads.
  const edgeCases = [Buffer.from('\ufeff中文\r\n'), Buffer.from('中文\n'), Buffer.from('中文'), Buffer.alloc(0), Buffer.from([0, 255, 13, 10]), Buffer.alloc(0)]
  for (let i = 1; i < edgeCases.length; i++) {
    assert.deepEqual(apply(edgeCases[i - 1], delta(edgeCases[i - 1], edgeCases[i])), edgeCases[i])
    assert.deepEqual(reverse(edgeCases[i], inverseDelta(edgeCases[i - 1], edgeCases[i])), edgeCases[i - 1])
  }
  const report = { generatedAt: new Date().toISOString(), node: process.version, git: execFileSync('git', ['--version'], { encoding: 'utf8' }).trim(),
    parameters: { versions: 21, edits: 20, zstdLevel: 3, checkpointInterval: 8, gitWindow: 50, gitDepth: 8, gitThreads: 1, previewReadRepetitions: 5 },
    scope: 'Isolated deterministic samples. File bytes only; excludes common observation/outcome metadata and filesystem allocation. Git pack includes index but excludes repo scaffolding. Write timing is single-run and includes process launch for Git. Preview read timing is the median of 5 warm-cache reads: independent archives read original and latest snapshots; inverse storage reconstructs the original through all 20 patches using an already-read current file. No gateway, work-file read/write, or outcome persistence is timed.',
    edgeCaseByteExactRestore: true, externalEditHashRefusalVerified: true, results }
  await writeFile(path.join(output, 'results.json'), JSON.stringify(report, null, 2) + '\n')
  console.log('Saved output/rollback-storage-research/results.json; every version restored byte-for-byte.')
} finally { await rm(temporary, { recursive: true, force: true }) }
