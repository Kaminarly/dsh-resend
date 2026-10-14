import { afterEach, expect, it, vi } from 'vitest'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile, unlink, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Session } from '@deepseek-ai/dsh-session'
import { dispatchToHost, hostComposition } from './helpers/gateway.mjs'
import { hostState, SESSION_ID, sessionFixture } from './helpers/host.mjs'
import { createSnapshotStore } from '../src/file-snapshots.js'

const faults = vi.hoisted(() => ({ reading: false }))
vi.mock('node:fs/promises', async original => {
  const fs = await original()
  return { ...fs, open: async (...args) => {
    if (faults.reading && String(args[0]).endsWith('file.txt') && args[1] === 'r') throw new Error('read denied')
    return fs.open(...args)
  } }
})
const cleanups = []
afterEach(async () => { faults.reading = false; for (const cleanup of cleanups.splice(0).reverse()) await cleanup() })

async function workspace(before, after, { preflight = false, secondWrite } = {}) {
  const home = await mkdtemp(path.join(tmpdir(), 'bounded-content-'))
  cleanups.push(() => rm(home, { recursive: true, force: true }))
  const cwd = path.join(home, 'work')
  await mkdir(cwd)
  const session = Session.create(SESSION_ID, sessionFixture().snapshotEvents(), { version: 4, id: SESSION_ID, createdAt: 0, isSeeded: false, cwd })
  const state = hostState({ session, agent: 'deaf' })
  const host = await hostComposition({ host: state, dataHome: path.join(home, 'data') })
  cleanups.push(() => host.ctx.fiber.dispose())
  const target = path.join(cwd, 'file.txt')
  if (before !== null) await writeFile(target, before)
  async function toolWrite(content, n) {
    const callId = `write-${n}`
    const args = { file_path: 'file.txt', content }
    const call = session.append('tool/call', { turn: 1, step: 1, callId, name: 'write', arguments: JSON.stringify(args) })
    await host.ctx.waterfall('tools/execute', { name: 'write', callId, arguments: args, agent: { session } }, async () => {
      const prior = await readFile(target, 'utf8').catch(error => { if (error.code === 'ENOENT') return null; throw error })
      await writeFile(target, content)
      return { isError: false, value: { before: prior?.replace(/^\ufeff/, '').replaceAll('\r\n', '\n') ?? null, after: content } }
    })
    session.append('tool/result', { turn: 1, step: 1, message: { role: 'tool', id: `result-${n}`, toolCallId: callId,
      source: { kind: 'tool', callId }, content: [{ type: 'text', text: 'written' }], isError: false } },
    { surfaceOp: 'append', sourceEventSeqs: [call.seq] })
  }
  await toolWrite(after, 1)
  if (secondWrite !== undefined) await toolWrite(secondWrite, 2)
  const call = async (endpoint, request, instance = host) => {
    const wire = await dispatchToHost(instance, `resend/${endpoint}`, { request })
    expect(wire.ok, JSON.stringify(wire)).toBe(true)
    return wire.value
  }
  const started = await call(preflight ? 'replay' : 'apply', preflight
    ? { phase: 'start', request: { sessionId: SESSION_ID, targetSeq: 2, op: 'edit', text: 'changed prompt' } }
    : { sessionId: SESSION_ID, targetSeq: 2, op: 'edit', text: 'changed prompt' })
  expect(started.ok, JSON.stringify(started)).toBe(true)
  const carrierSeq = started.value.carrierSeq
  const preview = preflight ? started : await call('rollback', { sessionId: SESSION_ID, carrierSeq, phase: 'preview' })
  const request = { sessionId: SESSION_ID, path: 'file.txt', planId: preview.value.planId,
    ...(preflight ? { source: 'preflight', preflightId: preview.value.preflightId } : { source: 'history', carrierSeq }) }
  const content = changes => call('content', { ...request, ...changes })
  const execute = () => preflight ? call('replay', { sessionId: SESSION_ID, phase: 'restore', preflightId: request.preflightId, selected: ['file.txt'] })
    : call('rollback', { sessionId: SESSION_ID, carrierSeq, phase: 'execute', planId: request.planId, selected: ['file.txt'] })
  const cancel = () => preflight ? call('replay', { sessionId: SESSION_ID, phase: 'cancel', preflightId: request.preflightId })
    : call('rollback', { sessionId: SESSION_ID, carrierSeq, phase: 'cancel', planId: request.planId })
  return { home, cwd, target, host, state, session, call, request, content, preview, execute, cancel }
}

it.each([false, true])('reads the net current-to-original diff without consuming the plan (preflight=%s)', async preflight => {
  const original = '\ufeff保留用户改动\r\n原文\r\n'
  const w = await workspace(original, '保留用户改动\n中间版本\n', { preflight, secondWrite: '保留用户改动\n最终版本' })
  const events = w.session.snapshotEvents()
  const followups = w.state.calls.followups
  const result = await w.content()
  expect(result).toMatchObject({ ok: true, value: { status: 'ready', action: 'restore',
    current: { bom: false, eol: 'lf', finalNewline: false }, target: { bom: true, eol: 'crlf', finalNewline: true },
    rows: [{ kind: 'context', text: '保留用户改动', oldLine: 1, newLine: 1 },
      { kind: 'delete', text: '最终版本', oldLine: 2 }, { kind: 'add', text: '原文', newLine: 2 }] } })
  expect(JSON.stringify(result)).not.toMatch(/中间版本|records|objects|snapshots/)
  expect(await w.content()).toEqual(result)
  expect(await readFile(w.target, 'utf8')).toBe('保留用户改动\n最终版本')
  expect(w.session.snapshotEvents()).toEqual(events)
  expect(w.state.calls.followups).toBe(followups)
  expect(await readdir(path.join(w.home, 'data/plugins/dsh-resend/outcomes')).catch(error => error.code === 'ENOENT' ? [] : Promise.reject(error))).toEqual([])
  expect((await w.execute()).ok).toBe(true)
  expect(await readFile(w.target)).toEqual(Buffer.from(original))
  expect((await w.content()).error.code).toBe('plan-not-found')
})

it.each([false, true])('rejects forged members, owners, sources and private addresses and preserves the valid plan (%s)', async preflight => {
  const w = await workspace('original', 'current', { preflight })
  for (const changes of [{ path: '../secret.txt' }, { path: w.home }, { path: 'objects/private' },
    { sessionId: 'different-session' }, { planId: 'forged' },
    ...(preflight ? [{ preflightId: 'forged' }, { source: 'history', carrierSeq: 2, preflightId: undefined }]
      : [{ carrierSeq: 0 }, { source: 'preflight', preflightId: 'forged', carrierSeq: undefined }])]) {
    const wire = await dispatchToHost(w.host, 'resend/content', { request: Object.fromEntries(Object.entries({ ...w.request, ...changes }).filter(([, value]) => value !== undefined)) })
    expect(wire.ok && wire.value.ok).toBe(false)
    expect(JSON.stringify(wire)).not.toContain('original')
  }
  const extra = await dispatchToHost(w.host, 'resend/content', { request: { ...w.request, snapshot: 'private' } })
  expect(extra.ok).toBe(false)
  expect((await w.content()).value.status).toBe('ready')
  await w.cancel()
  expect((await w.content()).error.code).toBe('plan-not-found')
  expect(await readFile(w.target, 'utf8')).toBe('current')
})

const byteLimit = 3145728
const sized = bytes => ('a'.repeat(1023) + '\n').repeat(Math.floor(bytes / 1024)) + 'a'.repeat(bytes % 1024)
it.each([
  ['bytes equal', '', sized(byteLimit), undefined],
  ['bytes above', '', sized(byteLimit + 1), 'too-large'],
  ['lines equal', '', 'x\n'.repeat(10000), undefined],
  ['lines above', '', 'x\n'.repeat(10001), 'too-many-lines'],
  ['points equal', '', '😀'.repeat(20000), undefined],
  ['points above', '', '😀'.repeat(20001), 'line-too-long'],
  ['BOM bytes above', '\ufeff', sized(byteLimit - 2), 'too-large'],
  ['BOM bytes equal', '\ufeff', sized(byteLimit - 3), undefined],
  ['BOM not a text line', '\ufeff', '', undefined],
  ['NUL text', 'valid', 'a\0b', 'non-text'],
  ['work budget', 'a\n'.repeat(1500), 'b\n'.repeat(1500), 'computation-limited'],
])('enforces %s before content crosses the gateway and leaves restore available', async (_label, before, after, reason) => {
  const w = await workspace(before, after)
  expect(w.preview.value.files[0].action).toBe('restore')
  const result = await w.content()
  expect(result.ok, JSON.stringify(result.error)).toBe(true)
  if (reason) {
    expect(result.value).toMatchObject({ status: 'unavailable', reason })
    expect(result.value).not.toHaveProperty('rows')
    expect(result.value).not.toHaveProperty('current')
  } else expect(result.value.status).toBe('ready')
  if (_label === 'BOM not a text line') expect(result.value).toMatchObject({ current: { lines: 0, bytes: 0 }, target: { lines: 0, bytes: 3, bom: true } })
  expect((await w.execute()).ok).toBe(true)
  expect(await readFile(w.target)).toEqual(Buffer.from(before))
})

it.each([['created', null, '新建\n', 'delete'], ['created empty', null, '', 'delete'],
  ['restore empty', '', 'changed', 'empty'], ['format only', '\ufeff中文\r\n', '中文\n', 'restore']])(
  'distinguishes %s and restores original bytes', async (_label, before, after, action) => {
    const w = await workspace(before, after)
    expect(w.preview.value.files[0]).toMatchObject({ action: 'restore', ...(before === null ? { operation: 'delete' } : {}) })
    const result = await w.content()
    expect(result.value).toMatchObject({ status: 'ready', action, target: { exists: before !== null, bytes: before === null ? 0 : Buffer.byteLength(before) } })
    if (after === '') expect(result.value.rows).toEqual([])
    if (_label === 'format only') expect(result.value.rows).toEqual([{ kind: 'context', text: '中文', oldLine: 1, newLine: 1 }])
    expect((await w.execute()).ok).toBe(true)
    if (before === null) await expect(readFile(w.target)).rejects.toMatchObject({ code: 'ENOENT' })
    else expect(await readFile(w.target)).toEqual(Buffer.from(before))
  })

it('retries ordinary read failure without retiring the plan and refuses changed current content', async () => {
  const w = await workspace('original', 'current')
  faults.reading = true
  expect(await w.content()).toEqual({ ok: false, error: { code: 'read-failed' } })
  faults.reading = false
  expect((await w.content()).value.status).toBe('ready')
  await writeFile(w.target, 'external edit')
  expect(await w.content()).toEqual({ ok: false, error: { code: 'preview-stale' } })
  expect(await readFile(w.target, 'utf8')).toBe('external edit')
})

it.each([false, true])('invalidates content after cross-host cleanup (%s)', async preflight => {
  const w = await workspace('original', 'current', { preflight })
  const other = await hostComposition({ host: w.state, dataHome: path.join(w.home, 'data') })
  cleanups.push(() => other.ctx.fiber.dispose())
  const plan = await w.call('cleanup', { phase: 'preview', mode: 'sessions', sessionIds: [SESSION_ID] }, other)
  expect((await w.call('cleanup', { phase: 'execute', mode: 'sessions', planId: plan.value.planId }, other)).ok).toBe(true)
  expect((await w.content()).error.code).toBe('plan-not-found')
  expect(await readFile(w.target, 'utf8')).toBe('current')
})

it('rejects a link substituted after plan creation', async () => {
  const w = await workspace('original', 'current')
  const outside = path.join(w.home, 'outside.txt')
  await writeFile(outside, 'private outside text')
  await unlink(w.target)
  await symlink(outside, w.target)
  expect((await w.content()).error.code).toBe('preview-stale')
  expect(await readFile(outside, 'utf8')).toBe('private outside text')
})

it.each([['non-text', Buffer.from([0xff, 0xfe]), 'current'], ['create', Buffer.from('saved'), null]])(
  'previews a verifiable saved %s record without expanding file capture', async (kind, before, after) => {
    const w = await workspace('original', 'current')
    await w.cancel()
    // Representative existing records can express byte snapshots or an absent
    // current side even though this ticket does not extend tool capture.
    const storage = path.join(w.home, 'data/plugins/dsh-resend')
    const store = createSnapshotStore(storage)
    const [name] = await readdir(path.join(storage, 'records'))
    const target = path.join(storage, 'records', name)
    const record = JSON.parse(await readFile(target, 'utf8'))
    record.files = [{ path: 'file.txt', before: await store.put(before, 'cas'), after: await store.put(after === null ? null : Buffer.from(after), 'cas') }]
    await writeFile(target, JSON.stringify(record))
    if (after === null) await unlink(w.target)
    const plan = await w.call('rollback', { sessionId: SESSION_ID, carrierSeq: w.request.carrierSeq, phase: 'preview' })
    const result = await w.content({ planId: plan.value.planId })
    if (kind === 'non-text') expect(result.value).toMatchObject({ status: 'unavailable', reason: 'non-text' })
    else expect(result.value).toMatchObject({ status: 'ready', action: 'create', current: { exists: false, bytes: 0, lines: 0 }, rows: [{ kind: 'add', text: 'saved', newLine: 1 }] })
    expect((await w.call('rollback', { sessionId: SESSION_ID, carrierSeq: w.request.carrierSeq, phase: 'execute', planId: plan.value.planId, selected: ['file.txt'] })).ok).toBe(true)
    expect(await readFile(w.target)).toEqual(before)
  })
