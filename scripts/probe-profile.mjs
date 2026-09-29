#!/usr/bin/env node
/**
 * Boot an ISOLATED profile with the shipped launcher and verify the bundle from
 * the outside — the acceptance check that cannot be a plain unit test, because
 * it needs an installed DSH Desktop.
 *
 * What it proves (ticket 01, acceptance #1):
 *   1. the profile composes the bundle's patch layer into a Loader row;
 *   2. the host boots with the row mounted and the startup audit stays silent —
 *      `auditStartupEntries` warns for every entry whose fiber is not active, so
 *      silence is the evidence that nothing was left PENDING/FAILED;
 *   3. the Web boot graph served to the browser lists the client row, and the
 *      bundle the client would fetch is the self-registering artifact.
 *
 * Safety: it builds its own `DSH_HOME` under `.tmp/`, junctions this package in
 * as a profile dependency (exactly how a profile's node_modules provides it),
 * binds an OS-assigned port, and kills the process it started. It never reads or
 * writes the real `$DSH_HOME`, and never restarts anything.
 *
 * With no installed app (CI), it prints an explicit SKIP and exits zero — like
 * `check-host-contract`, this check is Desktop-optional.
 *
 * Usage: node scripts/probe-profile.mjs [--keep]
 */
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, symlinkSync, writeFileSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { launcherFor, LAUNCHER_RELATIVE, resolveHostApp } from './host-app.mjs'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const pkg = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8'))
const keep = process.argv.includes('--keep')
const home = path.join(rootDir, '.tmp', 'probe-home')
const profile = path.join(home, 'profiles', 'probe')

const results = []
const record = (ok, message) => {
  results.push(ok)
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${message}`)
}

const skip = (reason) => {
  console.log(`probe-profile: SKIP — ${reason}`)
  process.exit(0)
}

const app = resolveHostApp()
if (app === undefined) skip('no installed DSH Desktop app found (set DSH_APP_ROOT to point at one)')
if (app.kind !== 'dir') skip(`the installed app at ${app.root} is packed; the probe needs an unpacked app to launch`)

const launcher = launcherFor(app)
if (launcher === undefined) skip(`the installed app has no dsh launcher at ${LAUNCHER_RELATIVE}`)

// --- an isolated home whose `probe` profile installs this package by path ----

rmSync(profile, { recursive: true, force: true })
mkdirSync(path.join(profile, 'node_modules'), { recursive: true })
writeFileSync(
  path.join(profile, 'package.json'),
  `${JSON.stringify(
    {
      name: 'dsh-profile-probe',
      private: true,
      dependencies: { [pkg.name]: `file:${rootDir.replace(/\\/g, '/')}` },
      dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app', pkg.name] } },
    },
    null,
    2,
  )}\n`,
)
writeFileSync(path.join(profile, 'cordis.patch.yml'), '# Probe profile user layer: no overrides.\n[]\n')
symlinkSync(rootDir, path.join(profile, 'node_modules', pkg.name), 'junction')

const runLauncher = (args) =>
  spawnSync(process.execPath, [launcher, '--profile', 'probe', ...args], {
    cwd: rootDir,
    env: { ...process.env, DSH_HOME: home },
    encoding: 'utf8',
  })

// --- 1. the composed tree mounts the row ------------------------------------

const dump = runLauncher(['--dump-config'])
record(
  dump.status === 0 && new RegExp(`- id: ${pkg.name}\\b`).test(dump.stdout ?? ''),
  `the profile composes the bundle's patch layer into a "${pkg.name}" row`,
)
if (dump.status !== 0) console.log((dump.stderr ?? '').slice(-2000))

// --- 2 and 3. boot it and read what the browser would receive ---------------

const child = spawn(process.execPath, [launcher, '--profile', 'probe', '--port', '0', '--no-open'], {
  cwd: rootDir,
  env: { ...process.env, DSH_HOME: home },
  stdio: ['ignore', 'pipe', 'pipe'],
})

let stdout = ''
let stderr = ''
child.stdout.on('data', (chunk) => (stdout += chunk))
child.stderr.on('data', (chunk) => (stderr += chunk))

/**
 * Stop the host this probe started, on any platform. Windows needs
 * `taskkill /T` because the launch may own child processes; elsewhere SIGTERM
 * with a SIGKILL fallback is enough. Leaving it running would orphan a process
 * holding a listening port.
 */
async function stopHost() {
  if (child.exitCode !== null || child.signalCode !== null) return
  const exited = new Promise((resolve) => child.once('exit', resolve))

  if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  else child.kill('SIGTERM')

  const stopped = await Promise.race([exited.then(() => true), new Promise((resolve) => setTimeout(() => resolve(false), 5000))])
  if (!stopped) {
    child.kill('SIGKILL')
    await exited
  }
}

const finish = async (code) => {
  await stopHost()
  if (!keep) rmSync(home, { recursive: true, force: true })
  process.exit(code)
}

const deadline = Date.now() + 120_000
let url
while (Date.now() < deadline) {
  const match = /dsh web: (\S+)/.exec(stdout)
  if (match !== null) {
    url = match[1]
    break
  }
  if (child.exitCode !== null) break
  await new Promise((resolve) => setTimeout(resolve, 500))
}

if (url === undefined) {
  record(false, 'the host printed its Web URL and booted')
  console.log(`--- stdout ---\n${stdout.slice(-2000)}\n--- stderr ---\n${stderr.slice(-2000)}`)
  await finish(1)
}

record(true, `the host booted and served ${url}`)
record(stderr.trim() === '', 'the startup audit stayed silent (no inactive or pending entry)')
if (stderr.trim() !== '') console.log(stderr.slice(-2000))

// Node's fetch keeps no cookie jar, so the browser's token → cookie handshake
// is walked by hand: GET /?token=… answers 303 with the session cookie.
const base = new URL(url).origin
const handshake = await fetch(url, { redirect: 'manual' })
const cookie = (handshake.headers.getSetCookie?.() ?? []).map((value) => value.split(';')[0]).join('; ')
const page = await (await fetch(`${base}/`, { headers: { cookie } })).text()

record(new RegExp(`"id":"${pkg.name}"`).test(page), 'the Web boot graph lists the client row')

const rowUrl = new RegExp(`"id":"${pkg.name}"[^}]*?"url":"([^"]+)"`).exec(page)?.[1]
const bundle = rowUrl === undefined ? '' : await (await fetch(new URL(`/${rowUrl}`, base), { headers: { cookie } })).text()
record(
  bundle.includes('__ModuleLoader__.load') && bundle.includes(`"${pkg.name}"`),
  `the served client bundle self-registers id "${pkg.name}"`,
)

await finish(results.every(Boolean) ? 0 : 1)