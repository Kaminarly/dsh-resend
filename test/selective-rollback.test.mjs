/** Ticket 01 — the history entry restores a checked subset and reports real results. */
import { afterEach, expect, it } from 'vitest'
import { mkdtemp, rm, writeFile, readFile, readdir, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Session } from '@deepseek-ai/dsh-session'
import { dispatchToHost, hostComposition } from './helpers/gateway.mjs'
import { appendUser, hostState, SESSION_ID, sessionFixture } from './helpers/host.mjs'

const cleanups = []
afterEach(async () => { for (const cleanup of cleanups.splice(0).reverse()) await cleanup() })

async function workspace() {
  const home = await mkdtemp(path.join(tmpdir(), 'resend-select-'))
  cleanups.push(() => rm(home, { recursive: true, force: true }))
  const cwd = path.join(home, 'workspace')
  await mkdir(cwd)
  const session = Session.create(SESSION_ID, sessionFixture().snapshotEvents(), { version: 4, id: SESSION_ID, createdAt: 0, isSeeded: false, cwd })
  const state = hostState({ session, agent: 'deaf' })
  const host = await hostComposition({ host: state, dataHome: path.join(home, 'data') })
  cleanups.push(() => host.ctx.fiber.dispose())
  const call = async (request) => {
    const wire = await dispatchToHost(host, 'resend/rollback', { request: { sessionId: SESSION_ID, scope: 'artifacts', ...request } })
    expect(wire.ok, JSON.stringify(wire)).toBe(true)
    return wire.value
  }
  let number = 0
  async function write(name, content) {
    const callId = `write-${++number}`
    const args = { file_path: name, content }
    const event = session.append('tool/call', { turn: 1, step: 1, callId, name: 'write', arguments: JSON.stringify(args) })
    const exec = { name: 'write', callId, arguments: args, agent: { session } }
    await host.ctx.waterfall('tools/execute', exec, async () => {
      const before = await readFile(path.resolve(cwd, name), 'utf8').catch((error) => { if (error.code === 'ENOENT') return null; throw error })
      await writeFile(path.resolve(cwd, name), content)
      return { isError: false, value: { path: name, before: before?.replace(/^\ufeff/, '').replaceAll('\r\n', '\n') ?? null, after: content } }
    })
    session.append('tool/result', { turn: 1, step: 1, message: { role: 'tool', id: `result-${number}`, toolCallId: callId, source: { kind: 'tool', callId }, content: [{ type: 'text', text: 'written' }], isError: false } }, { surfaceOp: 'append', sourceEventSeqs: [event.seq] })
  }
  async function rewind() {
    const wire = await dispatchToHost(host, 'resend/apply', { request: { sessionId: SESSION_ID, targetSeq: 2, op: 'edit', text: 'new prompt' } })
    expect(wire.ok, JSON.stringify(wire)).toBe(true)
    expect(wire.value.ok, JSON.stringify(wire.value)).toBe(true)
    return wire.value.value.carrierSeq
  }
  const outcomeFiles = async () => {
    const dir = path.join(home, 'data', 'plugins', 'dsh-resend', 'outcomes')
    try { return await readdir(dir) } catch (error) { if (error.code === 'ENOENT') return []; throw error }
  }
  const outcomeFile = async () => {
    const [name] = await outcomeFiles()
    return JSON.parse(await readFile(path.join(home, 'data', 'plugins', 'dsh-resend', 'outcomes', name), 'utf8'))
  }
  return { home, cwd, session, state, host, call, write, rewind, outcomeFiles, outcomeFile }
}

const file = (w, name) => path.join(w.cwd, name)

it('restores only the selected subset, finalizes the whole point and persists real per-file results', async () => {
  const w = await workspace()
  await writeFile(file(w, 'first.txt'), 'original-a 中文')
  await writeFile(file(w, 'second.txt'), 'original-b')
  await w.write('first.txt', 'agent-a')
  await w.write('second.txt', 'agent-b')
  const carrierSeq = await w.rewind()
  const preview = await w.call({ carrierSeq, phase: 'preview' })
  expect(preview.value.files).toEqual([
    { path: 'first.txt', action: 'restore' },
    { path: 'second.txt', action: 'restore' },
  ])
  const events = w.session.snapshotEvents()
  const result = await w.call({ carrierSeq, phase: 'execute', planId: preview.value.planId, selected: ['first.txt'] })
  expect(result).toEqual({ ok: true, value: {
    planId: preview.value.planId, scope: 'artifacts', completed: true,
    files: [
      { path: 'first.txt', action: 'restored' },
      { path: 'second.txt', action: 'kept' },
    ],
  } })
  expect(await readFile(file(w, 'first.txt'), 'utf8')).toBe('original-a 中文')
  expect(await readFile(file(w, 'second.txt'), 'utf8')).toBe('agent-b')
  expect(w.session.snapshotEvents()).toEqual(events)
  // The whole point is finalized: no phase offers a second restore, not even for the kept file.
  for (const phase of ['status', 'preview', 'execute']) {
    const answer = await w.call({ carrierSeq, phase, planId: 'forged', ...(phase === 'execute' ? { selected: ['second.txt'] } : {}) })
    expect(answer.value).toEqual(result.value)
    expect(await readFile(file(w, 'second.txt'), 'utf8')).toBe('agent-b')
  }
  // The completion record carries a recognizable new version.
  expect(await w.outcomeFile()).toEqual({ kind: 'file-rollback-result', version: 2, value: result })
  // The same real result survives a restart.
  await w.host.ctx.fiber.dispose()
  const restarted = await hostComposition({ host: w.state, dataHome: path.join(w.home, 'data') })
  cleanups.push(() => restarted.ctx.fiber.dispose())
  const status = await dispatchToHost(restarted, 'resend/rollback', { request: { sessionId: SESSION_ID, carrierSeq, scope: 'artifacts', phase: 'status' } })
  expect(status.value.value).toEqual(result.value)
  expect(await readFile(file(w, 'first.txt'), 'utf8')).toBe('original-a 中文')
  expect(await readFile(file(w, 'second.txt'), 'utf8')).toBe('agent-b')
})

it('rejects empty, forged, duplicate, cross-plan and disabled selections without consuming the plan or writing files', async () => {
  const w = await workspace()
  await writeFile(file(w, 'a.txt'), 'original')
  await w.write('a.txt', 'agent')
  await w.write('b.txt', 'agent-created')
  const carrierSeq = await w.rewind()
  await writeFile(file(w, 'b.txt'), 'user edit') // b becomes unrestorable
  const preview = await w.call({ carrierSeq, phase: 'preview' })
  expect(preview.value.files).toEqual([
    { path: 'a.txt', action: 'restore' },
    { path: 'b.txt', action: 'refuse', reason: 'content-diverged' },
  ])
  const prompt = appendUser(w.session, { id: 'next', text: 'next prompt' })
  await w.write('c.txt', 'agent-c')
  const next = await dispatchToHost(w.host, 'resend/apply', { request: { sessionId: SESSION_ID, targetSeq: prompt.seq, op: 'edit', text: 'again' } })
  const otherPreview = await w.call({ carrierSeq: next.value.value.carrierSeq, phase: 'preview' })
  expect(otherPreview.value.files).toEqual([{ path: 'c.txt', action: 'restore', operation: 'delete' }])
  const invalid = [
    [],                                  // an explicit empty set is not an omitted selection
    ['missing.txt'],                     // forged member
    ['a.txt', 'a.txt'],                  // duplicate member
    ['b.txt'],                           // disabled member (unrestorable)
    ['c.txt'],                           // member of another plan
  ]
  for (const selected of invalid) {
    const answer = await w.call({ carrierSeq, phase: 'execute', planId: preview.value.planId, selected })
    expect(answer).toEqual({ ok: false, error: { code: 'invalid-selection' } })
  }
  expect(await readFile(file(w, 'a.txt'), 'utf8')).toBe('agent')
  expect((await w.outcomeFiles()).length).toBe(0)
  // The plan was never consumed by the refusals: a valid selection still executes.
  const done = await w.call({ carrierSeq, phase: 'execute', planId: preview.value.planId, selected: ['a.txt'] })
  expect(done.value.files).toEqual([
    { path: 'a.txt', action: 'restored' },
    { path: 'b.txt', action: 'refuse', reason: 'content-diverged' },
  ])
  expect(await readFile(file(w, 'a.txt'), 'utf8')).toBe('original')
  expect(await readFile(file(w, 'b.txt'), 'utf8')).toBe('user edit')
})

it('lets an unselected file change externally without blocking the selected restore', async () => {
  const w = await workspace()
  await writeFile(file(w, 'a.txt'), 'original-a')
  await writeFile(file(w, 'b.txt'), 'original-b')
  await w.write('a.txt', 'agent-a')
  await w.write('b.txt', 'agent-b')
  const carrierSeq = await w.rewind()
  const preview = await w.call({ carrierSeq, phase: 'preview' })
  await writeFile(file(w, 'b.txt'), 'user external edit')
  const result = await w.call({ carrierSeq, phase: 'execute', planId: preview.value.planId, selected: ['a.txt'] })
  expect(result.ok).toBe(true)
  expect(result.value.files).toEqual([
    { path: 'a.txt', action: 'restored' },
    { path: 'b.txt', action: 'kept' },
  ])
  expect(await readFile(file(w, 'a.txt'), 'utf8')).toBe('original-a')
  expect(await readFile(file(w, 'b.txt'), 'utf8')).toBe('user external edit')
})

it('writes nothing when a selected file changed before execution and keeps the unselected file', async () => {
  const w = await workspace()
  await writeFile(file(w, 'a.txt'), 'original-a')
  await writeFile(file(w, 'b.txt'), 'original-b')
  await w.write('a.txt', 'agent-a')
  await w.write('b.txt', 'agent-b')
  const carrierSeq = await w.rewind()
  const preview = await w.call({ carrierSeq, phase: 'preview' })
  await writeFile(file(w, 'a.txt'), 'user edit after preview')
  const result = await w.call({ carrierSeq, phase: 'execute', planId: preview.value.planId, selected: ['a.txt'] })
  expect(result).toEqual({ ok: false, error: { code: 'preview-stale', files: [
    { path: 'a.txt', action: 'refuse', reason: 'content-diverged' },
    { path: 'b.txt', action: 'kept' },
  ] } })
  expect(await readFile(file(w, 'a.txt'), 'utf8')).toBe('user edit after preview')
  expect(await readFile(file(w, 'b.txt'), 'utf8')).toBe('agent-b')
  const status = await w.call({ carrierSeq, phase: 'status' })
  expect(status.value.completed ?? false).toBe(false)
  expect((await w.outcomeFiles()).length).toBe(0)
})

it('keeps omitted-selection requests on the full-restore path and does not guess the legacy result as user-kept', async () => {
  const w = await workspace()
  await writeFile(file(w, 'a.txt'), 'original-a')
  await writeFile(file(w, 'b.txt'), 'original-b')
  await w.write('a.txt', 'agent-a')
  await w.write('b.txt', 'agent-b')
  const carrierSeq = await w.rewind()
  const preview = await w.call({ carrierSeq, phase: 'preview' })
  const result = await w.call({ carrierSeq, phase: 'execute', planId: preview.value.planId })
  expect(result).toEqual(preview)
  expect(await readFile(file(w, 'a.txt'), 'utf8')).toBe('original-a')
  expect(await readFile(file(w, 'b.txt'), 'utf8')).toBe('original-b')
  // The legacy completion record stays in its raw shape, with 'restore' meaning restored.
  expect(await w.outcomeFile()).toEqual({ ok: true, value: { ...preview.value, completed: true } })
  await w.host.ctx.fiber.dispose()
  const restarted = await hostComposition({ host: w.state, dataHome: path.join(w.home, 'data') })
  cleanups.push(() => restarted.ctx.fiber.dispose())
  const status = await dispatchToHost(restarted, 'resend/rollback', { request: { sessionId: SESSION_ID, carrierSeq, scope: 'artifacts', phase: 'status' } })
  expect(status.value.value.completed).toBe(true)
  expect(status.value.value.files).toEqual(preview.value.files)
})
