/**
 * The probe is the only acceptance check that needs an installed DSH Desktop, so
 * it is a committed script (`scripts/probe-profile.mjs`, `npm run probe`) rather
 * than a one-off: this suite runs it wherever it can, and asserts the explicit
 * SKIP everywhere else — which is what a CI runner gets.
 *
 * It boots a real host process, so it is the one slow test in the suite: the
 * probe builds its own `DSH_HOME` under `.tmp/`, binds an OS-assigned port, and
 * kills the process it started. It never touches the real `$DSH_HOME`.
 */
import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { launcherFor, resolveHostApp } from '../scripts/host-app.mjs'
import { rootDir } from './helpers/dsh.mjs'

const app = resolveHostApp()
const launcher = launcherFor(app)

describe('probe-profile', () => {
  it('either verifies the running bundle or skips with a reason', () => {
    const result = spawnSync(process.execPath, ['scripts/probe-profile.mjs'], {
      cwd: rootDir,
      encoding: 'utf8',
      timeout: 200_000,
    })
    const stdout = result.stdout ?? ''
    const stderr = result.stderr ?? ''

    expect(result.status, `probe stderr:\n${stderr}`).toBe(0)

    if (launcher === undefined) {
      expect(stdout).toContain('SKIP')
      expect(stdout).toMatch(/no installed DSH Desktop app|packed|no dsh launcher/)
      return
    }

    expect(stdout).toContain('PASS: the profile composes the bundle\'s patch layer')
    expect(stdout).toContain('PASS: the host booted and served')
    expect(stdout).toContain('PASS: the startup audit stayed silent')
    expect(stdout).toContain('PASS: the Web boot graph lists the client row')
    expect(stdout).toContain('PASS: the served client bundle self-registers')
  }, 240_000)
})