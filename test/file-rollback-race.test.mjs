import { afterEach, expect, it, vi } from 'vitest'
import { mkdtemp, mkdir, readFile, rm, writeFile, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Session } from '@deepseek-ai/dsh-session'
import { dispatchToHost, hostComposition } from './helpers/gateway.mjs'
import { hostState, SESSION_ID, sessionFixture } from './helpers/host.mjs'

// A real filesystem adapter with one controlled external writer. The hook runs
// AFTER the first restore settles, reproducing the gap between two writes.
const race = vi.hoisted(() => ({ afterWrite: undefined, failOutcomeSave: false, failCheckpoint: undefined, failStaging: false, beforeCommit: undefined }))
vi.mock('node:fs/promises', async (original) => {
  const fs = await original()
  return { ...fs, rename: async (from, to) => {
    if (String(to).includes(`${path.sep}outcomes${path.sep}`)) {
      const value = JSON.parse(await fs.readFile(from, 'utf8'))
      if ((race.failOutcomeSave && value.ok === true) || race.failCheckpoint?.(value)) throw new Error('simulated outcome disk failure')
    }
    await fs.rename(from, to)
    if (String(from).includes('.dsh-resend-')) await race.afterWrite?.(to, fs)
  }, open: async (...args) => {
    const handle = await fs.open(...args)
    if (String(args[0]).includes('.dsh-resend-')) {
      const write = handle.writeFile.bind(handle)
      handle.writeFile = async (...values) => {
        if (race.failStaging) { await write('partial bytes'); throw new Error('simulated full disk') }
        await write(...values)
        await race.beforeCommit?.(fs)
      }
    }
    return handle
  }, writeFile: async (...args) => {
    await fs.writeFile(...args)
    await race.afterWrite?.(args[0], fs)
  } }
})
afterEach(() => { race.afterWrite = undefined; race.failOutcomeSave = false; race.failCheckpoint = undefined; race.failStaging = false; race.beforeCommit = undefined })

it('preserves a later file edited during execution and names both processed and refused files', async () => {
  const home = await mkdtemp(path.join(tmpdir(), 'resend-race-'))
  const cwd = path.join(home, 'workspace')
  await mkdir(cwd)
  const session = Session.create(SESSION_ID, sessionFixture().snapshotEvents(), { version: 4, id: SESSION_ID, createdAt: 0, isSeeded: false, cwd })
  const host = await hostComposition({ host: hostState({ session, agent: 'deaf' }), dataHome: path.join(home, 'data') })
  try {
    for (const name of ['first.txt', 'second.txt']) {
      await writeFile(path.join(cwd, name), 'before')
      const call = session.append('tool/call', { turn: 2, step: 1, callId: name, name: 'write', arguments: JSON.stringify({ file_path: name, content: 'agent' }) })
      await host.ctx.waterfall('tools/execute', { name: 'write', callId: name, arguments: { file_path: name }, agent: { session } }, async () => {
        await writeFile(path.join(cwd, name), 'agent')
        return { isError: false, value: { before: 'before', after: 'agent' } }
      })
      session.append('tool/result', { turn: 2, step: 1, message: { role: 'tool', id: name, callId: name, content: [{ type: 'text', text: 'done' }], isError: false } }, { surfaceOp: 'append', sourceEventSeqs: [call.seq] })
    }
    const rewound = await dispatchToHost(host, 'resend/apply', { request: { sessionId: SESSION_ID, targetSeq: 2, op: 'edit', text: 'edited' } })
    const carrierSeq = rewound.value.value.carrierSeq
    const preview = await dispatchToHost(host, 'resend/rollback', { request: { sessionId: SESSION_ID, carrierSeq, phase: 'preview' } })
    race.afterWrite = async (target, fs) => {
      if (target === path.join(cwd, 'first.txt')) await fs.writeFile(path.join(cwd, 'second.txt'), 'user edit during rollback')
    }
    const result = await dispatchToHost(host, 'resend/rollback', { request: { sessionId: SESSION_ID, carrierSeq, phase: 'execute', planId: preview.value.value.planId } })
    expect(result.value).toEqual({ ok: false, error: { code: 'execution-stopped', files: [
      { path: 'first.txt', action: 'restored' },
      { path: 'second.txt', action: 'refuse', reason: 'content-diverged' },
    ] } })
    expect(await readFile(path.join(cwd, 'first.txt'), 'utf8')).toBe('before')
    expect(await readFile(path.join(cwd, 'second.txt'), 'utf8')).toBe('user edit during rollback')
  } finally { await host.ctx.fiber.dispose(); await rm(home, { recursive: true, force: true }) }
})

it('reports unsaved results truthfully and retries saving without touching already restored files', async () => {
  const home = await mkdtemp(path.join(tmpdir(), 'resend-outcome-'))
  const cwd = path.join(home, 'workspace')
  await mkdir(cwd)
  const session = Session.create(SESSION_ID, sessionFixture().snapshotEvents(), { version: 4, id: SESSION_ID, createdAt: 0, isSeeded: false, cwd })
  const state = hostState({ session, agent: 'deaf' })
  const host = await hostComposition({ host: state, dataHome: path.join(home, 'data') })
  let restarted
  try {
    const target = path.join(cwd, 'file.txt')
    await writeFile(target, 'original')
    const call = session.append('tool/call', { turn: 2, step: 1, callId: 'one-write', name: 'write', arguments: JSON.stringify({ file_path: 'file.txt', content: 'agent' }) })
    await host.ctx.waterfall('tools/execute', { name: 'write', callId: 'one-write', arguments: { file_path: 'file.txt' }, agent: { session } }, async () => {
      await writeFile(target, 'agent')
      return { isError: false, value: { before: 'original', after: 'agent' } }
    })
    session.append('tool/result', { turn: 2, step: 1, message: { role: 'tool', id: 'result', callId: 'one-write', content: [{ type: 'text', text: 'done' }], isError: false } }, { surfaceOp: 'append', sourceEventSeqs: [call.seq] })
    const rewind = await dispatchToHost(host, 'resend/apply', { request: { sessionId: SESSION_ID, targetSeq: 2, op: 'edit', text: 'edited' } })
    const carrierSeq = rewind.value.value.carrierSeq
    const request = { sessionId: SESSION_ID, carrierSeq }
    const preview = await dispatchToHost(host, 'resend/rollback', { request: { ...request, phase: 'preview' } })
    race.failOutcomeSave = true
    const failed = await dispatchToHost(host, 'resend/rollback', { request: { ...request, phase: 'execute', planId: preview.value.value.planId } })
    expect(failed.value).toEqual({ ok: false, error: { code: 'result-save-failed', files: [{ path: 'file.txt', action: 'restored' }] } })
    expect(await readFile(target, 'utf8')).toBe('original')
    await writeFile(target, 'agent')
    const again = await dispatchToHost(host, 'resend/rollback', { request: { ...request, phase: 'preview' } })
    expect(again.value.error.code).toBe('result-save-failed')
    expect(await readFile(target, 'utf8')).toBe('agent')
    race.failOutcomeSave = false
    expect((await dispatchToHost(host, 'resend/rollback', { request: { ...request, phase: 'status' } })).value.value.completed).toBe(true)
    await host.ctx.fiber.dispose()
    restarted = await hostComposition({ host: state, dataHome: path.join(home, 'data') })
    expect((await dispatchToHost(restarted, 'resend/rollback', { request: { ...request, phase: 'status' } })).value.value.completed).toBe(true)
    expect(await readFile(target, 'utf8')).toBe('agent')
  } finally { await restarted?.ctx.fiber.dispose(); await host.ctx.fiber.dispose(); await rm(home, { recursive: true, force: true }) }
})

const fixtures = []
afterEach(async () => { for (const dispose of fixtures.splice(0).reverse()) await dispose() })

async function rollbackFixture(names = ['file.txt']) {
  const home = await mkdtemp(path.join(tmpdir(), 'resend-guarded-'))
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
    await writeFile(path.join(cwd, name), '原有中文\r\n')
    const call = session.append('tool/call', { turn: 2, step: 1, callId: name, name: 'write', arguments: JSON.stringify({ file_path: name }) })
    await first.ctx.waterfall('tools/execute', { name: 'write', callId: name, arguments: { file_path: name }, agent: { session } }, async () => {
      await writeFile(path.join(cwd, name), 'agent')
      return { isError: false, value: { before: '原有中文\n', after: 'agent' } }
    })
    session.append('tool/result', { turn: 2, step: 1, message: { role: 'tool', id: `result-${name}`, callId: name, content: [{ type: 'text', text: 'done' }], isError: false } }, { surfaceOp: 'append', sourceEventSeqs: [call.seq] })
  }
  const rewind = await dispatchToHost(first, 'resend/apply', { request: { sessionId: SESSION_ID, targetSeq: 2, op: 'edit', text: 'edited' } })
  expect(rewind.value.ok).toBe(true)
  const point = { sessionId: SESSION_ID, carrierSeq: rewind.value.value.carrierSeq }
  async function call(request, receiver = first) {
    const wire = await dispatchToHost(receiver, 'resend/rollback', { request: { ...point, ...request } })
    expect(wire.ok, JSON.stringify(wire)).toBe(true)
    return wire.value
  }
  const preview = await call({ phase: 'preview' })
  return { home, cwd, state, first, host, call, preview,
    execute: (plan = preview, receiver) => call({ phase: 'execute', planId: plan.value.planId }, receiver) }
}

it('preserves the complete target when staging fails after a partial write and removes staging files', async () => {
  const f = await rollbackFixture()
  race.failStaging = true
  const result = await f.execute()
  expect(result.error).toMatchObject({ code: 'execution-stopped', files: [{ path: 'file.txt', action: 'refuse', reason: 'restore-failed' }] })
  expect(await readFile(path.join(f.cwd, 'file.txt'))).toEqual(Buffer.from('agent'))
  expect(await readdir(f.cwd)).toEqual(['file.txt'])
  race.failStaging = false
  expect((await f.execute(await f.call({ phase: 'preview' }))).ok).toBe(true)
  expect(await readFile(path.join(f.cwd, 'file.txt'))).toEqual(Buffer.from('原有中文\r\n'))
})

it('rechecks external edits after staging and before replacement', async () => {
  const f = await rollbackFixture()
  race.beforeCommit = fs => fs.writeFile(path.join(f.cwd, 'file.txt'), '用户在暂存期间修改')
  expect((await f.execute()).error.files).toEqual([{ path: 'file.txt', action: 'refuse', reason: 'content-diverged' }])
  expect(await readFile(path.join(f.cwd, 'file.txt'), 'utf8')).toBe('用户在暂存期间修改')
  expect(await readdir(f.cwd)).toEqual(['file.txt'])
})

it('rechecks agent status after staging and before replacement', async () => {
  const f = await rollbackFixture()
  race.beforeCommit = async () => { f.state.agent.status = 'running' }
  expect((await f.execute()).error.files).toEqual([{ path: 'file.txt', action: 'refuse', reason: 'agent-busy' }])
  expect(await readFile(path.join(f.cwd, 'file.txt'), 'utf8')).toBe('agent')
})

it('does not declare completion if verification after replacement detects an external edit', async () => {
  const f = await rollbackFixture()
  race.afterWrite = (target, fs) => target === path.join(f.cwd, 'file.txt') ? fs.writeFile(target, '编辑器最新内容') : undefined
  expect((await f.execute()).error.code).toBe('execution-stopped')
  expect((await f.call({ phase: 'status' })).ok).toBe(false)
  const restarted = await f.host()
  const next = await f.call({ phase: 'preview' }, restarted)
  expect(next.value.files).toEqual([{ path: 'file.txt', action: 'refuse', reason: 'restore-outcome-unavailable' }])
  expect(await readFile(path.join(f.cwd, 'file.txt'), 'utf8')).toBe('编辑器最新内容')
})

it('writes no work files when the initial progress checkpoint cannot be saved', async () => {
  const f = await rollbackFixture()
  race.failCheckpoint = value => value.kind === 'file-rollback-progress'
  expect((await f.execute()).error.code).toBe('progress-save-failed')
  expect(await readFile(path.join(f.cwd, 'file.txt'), 'utf8')).toBe('agent')
})

it('preserves uncertain attempted files across restart when the post-restore checkpoint fails', async () => {
  const f = await rollbackFixture(['first.txt', 'second.txt'])
  race.failCheckpoint = value => value.states?.[0]?.state === 'restored'
  expect((await f.execute()).error.files).toEqual([
    { path: 'first.txt', action: 'restored' }, { path: 'second.txt', action: 'refuse', reason: 'execution-stopped' },
  ])
  await writeFile(path.join(f.cwd, 'first.txt'), 'agent')
  race.failCheckpoint = undefined
  const restarted = await f.host()
  const next = await f.call({ phase: 'preview' }, restarted)
  expect(next.value.files).toEqual([
    { path: 'first.txt', action: 'refuse', reason: 'restore-outcome-unavailable' }, { path: 'second.txt', action: 'restore' },
  ])
  expect((await f.execute(next, restarted)).ok).toBe(true)
  expect(await readFile(path.join(f.cwd, 'first.txt'), 'utf8')).toBe('agent')
  expect(await readFile(path.join(f.cwd, 'second.txt'), 'utf8')).toBe('原有中文\r\n')
})

it('recovers completion after a restart directly from the last checkpoint without restoring twice', async () => {
  const f = await rollbackFixture()
  race.failOutcomeSave = true
  expect((await f.execute()).error.code).toBe('result-save-failed')
  await f.first.ctx.fiber.dispose()
  await writeFile(path.join(f.cwd, 'file.txt'), 'agent')
  race.failOutcomeSave = false
  const restarted = await f.host()
  expect((await f.call({ phase: 'status' }, restarted)).value.completed).toBe(true)
  expect(await readFile(path.join(f.cwd, 'file.txt'), 'utf8')).toBe('agent')
})

it('reloads progress across hosts and never reuses a stale interrupted state after another host completes', async () => {
  const f = await rollbackFixture()
  race.failStaging = true
  expect((await f.execute()).ok).toBe(false)
  const other = await f.host()
  expect((await f.call({ phase: 'status' }, other)).ok).toBe(false)
  race.failStaging = false
  expect((await f.execute(await f.call({ phase: 'preview' }))).ok).toBe(true)
  await writeFile(path.join(f.cwd, 'file.txt'), 'agent')
  expect((await f.call({ phase: 'preview' }, other)).value.completed).toBe(true)
  expect(await readFile(path.join(f.cwd, 'file.txt'), 'utf8')).toBe('agent')
})

it('never repeats a known restored file after partial failure even if its current bytes match the post-state', async () => {
  const f = await rollbackFixture(['first.txt', 'second.txt'])
  race.afterWrite = (target, fs) => target === path.join(f.cwd, 'first.txt') ? fs.writeFile(path.join(f.cwd, 'second.txt'), 'other edit') : undefined
  expect((await f.execute()).ok).toBe(false)
  race.afterWrite = undefined
  await writeFile(path.join(f.cwd, 'first.txt'), 'agent')
  await writeFile(path.join(f.cwd, 'second.txt'), 'agent')
  const next = await f.call({ phase: 'preview' })
  expect(next.value.files).toEqual([
    { path: 'first.txt', action: 'refuse', reason: 'already-restored' }, { path: 'second.txt', action: 'restore' },
  ])
  expect((await f.execute(next)).ok).toBe(true)
  expect(await readFile(path.join(f.cwd, 'first.txt'), 'utf8')).toBe('agent')
})
