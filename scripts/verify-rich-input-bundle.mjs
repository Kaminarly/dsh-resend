// Pack and exercise the exact release bytes; never install into a user Profile.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile, readdir, copyFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const output = path.join(root, 'output/rich-input-release')
const npmCLI = process.env.npm_execpath
if (!npmCLI) throw new Error('请使用 npm run acceptance:bundle 运行交付检查')
await mkdir(output, { recursive: true })
const stamp = new Date().toISOString().replace(/[:.]/gu, '-')
const runDir = path.join(output, stamp)
await mkdir(runDir)
function runNode(args, env = {}) {
  return execFileSync(process.execPath, args, { cwd: root, env: { ...process.env, ...env }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}
const checks = []
for (const name of ['build', 'check']) {
  const log = runNode([npmCLI, 'run', name])
  await writeFile(path.join(runDir, name + '.log'), log)
  checks.push(name); console.log(log.trim())
}
const [packed] = JSON.parse(runNode([npmCLI, 'pack', '--json', '--pack-destination', runDir]))
const archive = path.join(runDir, packed.filename)
const extracted = path.join(runDir, 'extracted')
await mkdir(extracted)
execFileSync('tar', ['-xzf', archive, '-C', extracted], { cwd: root, stdio: 'pipe' })
const packageDir = path.join(extracted, 'package')
const hashes = {}
for (const file of packed.files) {
  assert.match(file.path, /^(?:lib\/[^/]+\.(?:js|txt)|package\.json|cordis\.patch\.yml|README\.md|LICENSE)$/u)
  const original = await readFile(path.join(root, file.path))
  const shipped = await readFile(path.join(packageDir, file.path))
  assert.deepEqual(shipped, original, '安装包与工作区不一致：' + file.path)
  hashes[file.path] = createHash('sha256').update(shipped).digest('hex')
}
checks.push('all packed files match checkout bytes')
const probe = runNode(['scripts/probe-profile.mjs'], { DSH_PROBE_PACKAGE_DIR: packageDir })
assert.ok(!probe.includes('SKIP') && !probe.includes('FAIL'), '隔离宿主验证必须实际执行')
await writeFile(path.join(runDir, 'probe.log'), probe)
checks.push('isolated installed host loads extracted package'); console.log(probe.trim())
const browser = runNode(['scripts/verify-rich-input-browser.mjs'], { EDITOR_BUNDLE_PATH: path.join(packageDir, 'lib/client.bundle.js') })
await writeFile(path.join(runDir, 'browser.log'), browser)
checks.push('real browser exercises extracted client'); console.log(browser.trim())
const channel = process.env.EDITOR_BROWSER_CHANNEL ?? 'msedge'
const browserEvidence = JSON.parse(await readFile(path.join(root, `output/playwright/rich-input-${channel}.json`), 'utf8'))
assert.equal(browserEvidence.bundleSha256, hashes['lib/client.bundle.js'])
const screenshots = []
const evidenceDir = path.join(runDir, 'browser-evidence')
await mkdir(evidenceDir)
for (const name of await readdir(path.join(root, 'output/playwright'))) {
  if (!/^(?:rich-input|skill-menu|reference-menu)-/u.test(name) || !name.endsWith(`-${channel}.png`)) continue
  await copyFile(path.join(root, 'output/playwright', name), path.join(evidenceDir, name))
  screenshots.push(name)
}
await writeFile(path.join(evidenceDir, 'browser.json'), JSON.stringify(browserEvidence, null, 2) + '\n')
const evidence = { createdAt: new Date().toISOString(), sourceHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  worktreeDirty: execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim() !== '',
  archive, archiveSha256: createHash('sha256').update(await readFile(archive)).digest('hex'), package: packed, hashes, checks, browser: browserEvidence, screenshots,
  scope: { installedIntoRealProfile: false, realSessionMutations: 0, realModelRequests: 0, hostUI: 'installed Desktop',
    candidateRPC: 'isolated fixture', skillRegistry: 'representative fixture with installed loading hook', resourceOpening: 'isolated callback' } }
const manifest = path.join(runDir, 'acceptance.json')
await writeFile(manifest, JSON.stringify(evidence, null, 2) + '\n')
await writeFile(path.join(output, 'latest.json'), JSON.stringify({ archive, manifest }, null, 2) + '\n')
console.log('交付包：' + archive + '\n完整证据：' + manifest)
