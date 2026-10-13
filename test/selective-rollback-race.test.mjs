/** Ticket 01 — interruption and save failures under a real subset selection. */
import { afterEach, expect, it, vi } from 'vitest'
import { mkdtemp, mkdir, readFile, rm, writeFile, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Session } from '@deepseek-ai/dsh-session'
import { dispatchToHost, hostComposition } from './helpers/gateway.mjs'
import { hostState, SESSION_ID, sessionFixture } from './helpers/host.mjs'

// One controlled external writer, exactly like test/file-rollback-race.test.mjs:
// the hook fires after a restore settles, reproducing the gap between two writes.
const race = vi.hoisted(() => ({ afterWrite: undefined, failOutcomeSave: false }))
vi.mock('node:fs/promises', async (original) => {
  const fs = await original()
  return { ...fs, rename: async (from, to) => {
    if (String(to).includes(`${path.sep}outcomes${path.sep}`)) {
      const value = JSON.parse(await fs.readFile(from, 'utf8'))
      // Checkpoint journals must keep saving; only the terminal result fails.
      if (race.failOutcomeSave && (value.ok === true || value.kind === 'file-rollback-result')) throw new Error('simulated outcome disk failure')
    }
    await fs.rename(from, to)
    if (String(from).includes('.dsh-resend-')) await race.afterWrite?.(to, fs)
  }, writeFile: async (...args) => {
    await fs.writeFile(...args)
    await race.afterWrite?.(args[0], fs)
  } }
})
afterEach(() => { race.afterWrite = undefined; race.failOutcomeSave = false })

const fixtures = []
afterEach(async () => { for (const dispose of fixtures.splice(0).reverse()) await dispose() })

async function fixture(names = ['first.txt', 'second.txt']) {
  const home = await mkdtemp(path.join(tmpdir(), 'resend-select-race-'))
  fixtures.push(() => rm(home, { recursive: true, force: true }))
  const cwd = path.join(home, 'workspace')
  await mkdir(cwd)
  const session = Session.create(SESSION_ID, sessionFixture().snapshotEvents(), { version: 4, id: SESSION_ID, createdAt: 0, isSeeded: false, cwd })
  const state = hostState({ session, agent: 'deaf' })
  const hosts = []
  async function host() {
    const result = await hostComposition({ host: state, dataHome: path.join(home, 'data') })
    hosts.push(result)
    fixtures.push(() => result.ctx.fiber.dispose())
    return result
  }
  const first = await host()
  for (const name of names) {
    await writeFile(path.join(cwd, name), `original-${name}`)
    const call = session.append('tool/call', { turn: 2, step: 1, callId: name, name: 'write', arguments: JSON.stringify({ file_path: name, content: 'agent' }) })
    await first.ctx.waterfall('tools/execute', { name: 'write', callId: name, arguments: { file_path: name }, agent: { session } }, async () => {
      await writeFile(path.join(cwd, name), 'agent')
      return { isError: false, value: { before: `original-${name}`, after: 'agent' } }
    })
    session.append('tool/result', { turn: 2, step: 1, message: { role: 'tool', id: `result-${name}`, callId: name, content: [{ type: 'text', text: 'done' }], isError: false } }, { surfaceOp: 'append', sourceEventSeqs: [call.seq] })
  }
  const rewind = await dispatchToHost(first, 'resend/apply', { request: { sessionId: SESSION_ID, targetSeq: 2, op: 'edit', text: 'edited' } })
  expect(rewind.value.ok).toBe(true)
  const point = { sessionId: SESSION_ID, carrierSeq: rewind.value.value.carrierSeq }
  const call = async (request, receiver = first) => {
    const wire = await dispatchToHost(receiver, 'resend/rollback', { request: { scope: 'artifacts', ...point, ...request } })
    expect(wire.ok, JSON.stringify(wire)).toBe(true)
    return wire.value
  }
  const preview = await call({ phase: 'preview' })
  return { home, cwd, state, host, first, call, preview,
    execute: (request, receiver) => call({ phase: 'execute', planId: preview.value.planId, ...request }, receiver),
    journal: async () => {
      const dir = path.join(home, 'data', 'plugins', 'dsh-resend', 'outcomes')
      const [name] = await readdir(dir)
      return JSON.parse(await readFile(path.join(dir, name), 'utf8'))
    } }
}

it('saves the confirmed selection and per-member progress, then finishes the remainder without repeating the restored file', async () => {
  const f = await fixture()
  race.afterWrite = async (target, fs) => {
    if (target === path.join(f.cwd, 'first.txt')) await fs.writeFile(path.join(f.cwd, 'second.txt'), 'user edit during rollback')
  }
  const stopped = await f.execute({ selected: ['first.txt', 'second.txt'] })
  expect(stopped).toEqual({ ok: false, error: { code: 'execution-stopped', files: [
    { path: 'first.txt', action: 'restored' },
    { path: 'second.txt', action: 'refuse', reason: 'content-diverged' },
  ] } })
  // The interrupted journal carries the selection identity and per-member states.
  expect(await f.journal()).toEqual({ kind: 'file-rollback-progress', version: 2, selected: ['first.txt', 'second.txt'],
    value: f.preview.value, states: [
      { path: 'first.txt', state: 'restored' },
      { path: 'second.txt', state: 'pending', reason: 'content-diverged' },
    ] })
  expect((await f.call({ phase: 'status' })).error.files).toEqual([
    { path: 'first.txt', action: 'restored' },
    { path: 'second.txt', action: 'refuse', reason: 'content-diverged' },
  ])
  // The second attempt reuses the recorded selection instead of defaulting to everything.
  await writeFile(path.join(f.cwd, 'second.txt'), 'agent')
  const next = await f.call({ phase: 'preview' })
  expect(next.value.files).toEqual([
    { path: 'first.txt', action: 'refuse', reason: 'already-restored' },
    { path: 'second.txt', action: 'restore' },
  ])
  expect(next.value.selected).toEqual(['first.txt', 'second.txt'])
  const restored = await f.call({ phase: 'execute', planId: next.value.planId, selected: ['second.txt'] })
  expect(restored).toEqual({ ok: true, value: { planId: next.value.planId, scope: 'artifacts', completed: true, files: [
    { path: 'first.txt', action: 'restored' },
    { path: 'second.txt', action: 'restored' },
  ] } })
  expect(await readFile(path.join(f.cwd, 'first.txt'), 'utf8')).toBe('original-first.txt')
  expect(await readFile(path.join(f.cwd, 'second.txt'), 'utf8')).toBe('original-second.txt')
})

it('lets an unselected file change DURING execution without blocking the selected restore', async () => {
  const f = await fixture()
  race.afterWrite = async (target, fs) => {
    if (target === path.join(f.cwd, 'first.txt')) await fs.writeFile(path.join(f.cwd, 'second.txt'), 'user edit during rollback')
  }
  const result = await f.execute({ selected: ['first.txt'] })
  expect(result).toEqual({ ok: true, value: { planId: f.preview.value.planId, scope: 'artifacts', completed: true, files: [
    { path: 'first.txt', action: 'restored' },
    { path: 'second.txt', action: 'kept' },
  ] } })
  expect(await readFile(path.join(f.cwd, 'first.txt'), 'utf8')).toBe('original-first.txt')
  expect(await readFile(path.join(f.cwd, 'second.txt'), 'utf8')).toBe('user edit during rollback')
})

it('never repeats a restored member even when another host still holds a plan made before the interruption', async () => {
  const f = await fixture()
  // The second host previews before the first host executes, so its plan predates
  // the interruption and still lists the restored member as restorable.
  const other = await f.host()
  const stale = await f.call({ phase: 'preview' }, other)
  expect(stale.value.files).toEqual([
    { path: 'first.txt', action: 'restore' },
    { path: 'second.txt', action: 'restore' },
  ])
  race.afterWrite = async (target, fs) => {
    if (target === path.join(f.cwd, 'first.txt')) await fs.writeFile(path.join(f.cwd, 'second.txt'), 'user edit during rollback')
  }
  await f.execute({ selected: ['first.txt', 'second.txt'] })
  race.afterWrite = undefined
  await writeFile(path.join(f.cwd, 'second.txt'), 'agent')
  const done = await f.call({ phase: 'execute', planId: stale.value.planId, selected: ['second.txt'] }, other)
  expect(done.value.files).toEqual([
    { path: 'first.txt', action: 'restored' },
    { path: 'second.txt', action: 'restored' },
  ])
  expect(await readFile(path.join(f.cwd, 'first.txt'), 'utf8')).toBe('original-first.txt')
  expect(await readFile(path.join(f.cwd, 'second.txt'), 'utf8')).toBe('original-second.txt')
})

it('reports a result-save failure with the real kept/restored split and recovers without re-restoring', async () => {
  const f = await fixture()
  race.failOutcomeSave = true
  const failed = await f.execute({ selected: ['first.txt'] })
  expect(failed).toEqual({ ok: false, error: { code: 'result-save-failed', files: [
    { path: 'first.txt', action: 'restored' },
    { path: 'second.txt', action: 'kept' },
  ] } })
  expect(await readFile(path.join(f.cwd, 'first.txt'), 'utf8')).toBe('original-first.txt')
  expect(await readFile(path.join(f.cwd, 'second.txt'), 'utf8')).toBe('agent')
  race.failOutcomeSave = false
  expect((await f.call({ phase: 'status' })).value.files).toEqual([
    { path: 'first.txt', action: 'restored' },
    { path: 'second.txt', action: 'kept' },
  ])
  await f.first.ctx.fiber.dispose()
  const restarted = await f.host()
  const status = await f.call({ phase: 'status' }, restarted)
  expect(status.value.completed).toBe(true)
  expect(status.value.files).toEqual([
    { path: 'first.txt', action: 'restored' },
    { path: 'second.txt', action: 'kept' },
  ])
  expect(await readFile(path.join(f.cwd, 'first.txt'), 'utf8')).toBe('original-first.txt')
})

it('does not promote an uncertain member to a completed point even after a restart', async () => {
  const f = await fixture(['first.txt'])
  race.afterWrite = (target, fs) => target === path.join(f.cwd, 'first.txt') ? fs.writeFile(target, '编辑器最新内容') : undefined
  const stopped = await f.execute({ selected: ['first.txt'] })
  expect(stopped.error.code).toBe('execution-stopped')
  // The committed-but-unverified member is never reported as success: the
  // point stays open with its uncertain result (ADR-0002).
  const status = await f.call({ phase: 'status' })
  expect(status.ok).toBe(false)
  expect(status.error.files).toEqual([{ path: 'first.txt', action: 'refuse', reason: 'restore-outcome-unavailable' }])
  await f.first.ctx.fiber.dispose()
  const restarted = await f.host()
  const after = await f.call({ phase: 'status' }, restarted)
  expect(after.ok).toBe(false)
  expect(after.error.files).toEqual([{ path: 'first.txt', action: 'refuse', reason: 'restore-outcome-unavailable' }])
  expect(await readFile(path.join(f.cwd, 'first.txt'), 'utf8')).toBe('编辑器最新内容')
})

it('resumes a legacy interrupted journal under a selected subset without repeating the restored file', async () => {
  const f = await fixture()
  race.afterWrite = async (target, fs) => {
    if (target === path.join(f.cwd, 'first.txt')) await fs.writeFile(path.join(f.cwd, 'second.txt'), 'user edit during rollback')
  }
  const stopped = await f.execute({}) // omitted selection: the legacy full-restore path
  expect(stopped).toEqual({ ok: false, error: { code: 'execution-stopped', files: [
    { path: 'first.txt', action: 'restored' },
    { path: 'second.txt', action: 'refuse', reason: 'content-diverged' },
  ] } })
  race.afterWrite = undefined
  expect(await f.journal()).toMatchObject({ kind: 'file-rollback-progress', version: 1 })
  await writeFile(path.join(f.cwd, 'second.txt'), 'agent')
  const next = await f.call({ phase: 'preview' })
  expect(next.value.files).toEqual([
    { path: 'first.txt', action: 'refuse', reason: 'already-restored' },
    { path: 'second.txt', action: 'restore' },
  ])
  expect(next.value.selected).toBeUndefined()
  const done = await f.call({ phase: 'execute', planId: next.value.planId, selected: ['second.txt'] })
  expect(done.value.files).toEqual([
    { path: 'first.txt', action: 'restored' },
    { path: 'second.txt', action: 'restored' },
  ])
  expect(await readFile(path.join(f.cwd, 'second.txt'), 'utf8')).toBe('original-second.txt')
})
