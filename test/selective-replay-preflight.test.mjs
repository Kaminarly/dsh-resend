/** Ticket 02 — the replay preflight processes the checked selection and continues. */
import { afterEach, expect, it, vi } from 'vitest'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Session } from '@deepseek-ai/dsh-session'
import { dispatchToHost, hostComposition } from './helpers/gateway.mjs'
import { auditCount, hostState, SESSION_ID, sessionFixture } from './helpers/host.mjs'

// The mock stands for the disk: beforeCommit fires on every staged private save,
// afterCommit on every landed rename, and failResultSave breaks ONLY terminal
// completion records — checkpoint journals keep saving (01's race harness fixed
// exactly these three seams).
const faults = vi.hoisted(() => ({ afterCommit: undefined, failResultSave: false }))
vi.mock('node:fs/promises', async original => {
  const fs = await original()
  return { ...fs, rename: async (from, to) => {
    if (faults.failResultSave && String(to).includes(`${path.sep}outcomes${path.sep}`)) {
      const value = JSON.parse(await fs.readFile(from, 'utf8'))
      if (value.ok === true || value.kind === 'file-rollback-result') throw new Error('simulated outcome disk failure')
    }
    await fs.rename(from, to)
    if (String(from).includes('.dsh-resend-')) await faults.afterCommit?.(to, fs)
  } }
})
const cleanups = []
afterEach(async () => {
  faults.afterCommit = undefined; faults.failResultSave = false
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup()
})

async function workspace({ agent = 'accepting' } = {}) {
  const home = await mkdtemp(path.join(tmpdir(), 'resend-preflight-select-'))
  cleanups.push(() => rm(home, { recursive: true, force: true }))
  const cwd = path.join(home, 'workspace')
  await mkdir(cwd)
  const session = Session.create(SESSION_ID, sessionFixture().snapshotEvents(), { version: 4, id: SESSION_ID, createdAt: 0, isSeeded: false, cwd })
  const state = hostState({ session, agent })
  const host = await hostComposition({ host: state, dataHome: path.join(home, 'data') })
  cleanups.push(() => host.ctx.fiber.dispose())
  let count = 0
  async function write(name, content) {
    const callId = `write-${++count}`
    const args = { file_path: name, content }
    const call = session.append('tool/call', { turn: 2, step: 1, callId, name: 'write', arguments: JSON.stringify(args) })
    await host.ctx.waterfall('tools/execute', { name: 'write', callId, arguments: args, agent: { session } }, async () => {
      const before = await readFile(path.join(cwd, name), 'utf8').catch(error => { if (error.code === 'ENOENT') return null; throw error })
      await writeFile(path.join(cwd, name), content)
      return { isError: false, value: { before: before?.replace(/^\ufeff/, '').replaceAll('\r\n', '\n') ?? null, after: content } }
    })
    session.append('tool/result', { turn: 2, step: 1, message: { role: 'tool', id: `result-${count}`, toolCallId: callId, source: { kind: 'tool', callId }, content: [{ type: 'text', text: 'written' }], isError: false } }, { surfaceOp: 'append', sourceEventSeqs: [call.seq] })
  }
  // a, b and c stand for 已还原 / 失败 / 未选 across the acceptance scenarios.
  await writeFile(path.join(cwd, 'a.txt'), '中文 A')
  await write('a.txt', '助手改过 A')
  await writeFile(path.join(cwd, 'b.txt'), '中文 B')
  await write('b.txt', '助手改过 B')
  await writeFile(path.join(cwd, 'c.txt'), '中文 C')
  await write('c.txt', '助手改过 C')
  const call = async (request, target = host) => {
    const wire = await dispatchToHost(target, 'resend/replay', { request })
    expect(wire.ok, JSON.stringify(wire)).toBe(true)
    return wire.value
  }
  const start = (op = 'edit') => call({ phase: 'start', request: { sessionId: SESSION_ID,
    targetSeq: op === 'edit' ? 2 : 3, op, ...(op === 'edit' ? { text: '编辑后的中文消息' } : {}) } })
  const choose = (result, phase, selected) => call({ phase, sessionId: SESSION_ID,
    preflightId: result.value.preflightId, ...(selected === undefined ? {} : { selected }) })
  const outcomeFiles = async () => {
    const dir = path.join(home, 'data', 'plugins', 'dsh-resend', 'outcomes')
    try { return await readdir(dir) } catch (error) { if (error.code === 'ENOENT') return []; throw error }
  }
  const outcome = async () => {
    const dir = path.join(home, 'data', 'plugins', 'dsh-resend', 'outcomes')
    const [name] = await readdir(dir)
    return JSON.parse(await readFile(path.join(dir, name), 'utf8'))
  }
  const contents = async (...names) => Object.fromEntries(await Promise.all(names.map(async name =>
    [name, await readFile(path.join(cwd, name), 'utf8')])))
  return { cwd, session, state, host, write, call, start, choose, outcome, outcomeFiles, contents }
}

it.each(['edit', 'regenerate'])('%s preflight restores only the selected subset, saves the real result, then rewinds and sends', async op => {
  const w = await workspace()
  const preview = await w.start(op)
  expect(preview.value.files).toEqual([
    { path: 'a.txt', action: 'restore' },
    { path: 'b.txt', action: 'restore' },
    { path: 'c.txt', action: 'restore' },
  ])
  expect(w.state.calls.followups).toBe(0)
  // The result is durable before anything is rewound or sent.
  faults.afterCommit = async (target) => {
    if (String(target).includes(`${path.sep}outcomes${path.sep}`)) {
      expect(auditCount(w.session), 'the rewind must not precede the saved result').toBe(0)
      expect(w.state.calls.followups, 'the prompt must not be queued before the saved result').toBe(0)
    }
  }
  const sent = await w.choose(preview, 'restore', ['a.txt'])
  expect(sent.ok, JSON.stringify(sent)).toBe(true)
  expect(sent.value.resendMessageId).toBeDefined()
  expect(await w.contents('a.txt', 'b.txt', 'c.txt')).toEqual({ 'a.txt': '中文 A', 'b.txt': '助手改过 B', 'c.txt': '助手改过 C' })
  expect(w.state.calls.trace).toEqual(['flush', 'followup'])
  expect(w.state.calls.followupInputs[0].content[0].text).toBe(op === 'edit' ? '编辑后的中文消息' : 'second prompt')
  expect(auditCount(w.session)).toBe(1)
  // The unselected members are kept by choice, never reported as restored.
  expect(await w.outcome()).toEqual({ kind: 'file-rollback-result', version: 2, value: { ok: true, value: {
    planId: preview.value.planId, completed: true, files: [
      { path: 'a.txt', action: 'restored' },
      { path: 'b.txt', action: 'kept' },
      { path: 'c.txt', action: 'kept' },
    ] } } })
})

it('restores everything when the caller omits the selection, as before selections existed', async () => {
  const w = await workspace()
  const preview = await w.start()
  expect((await w.choose(preview, 'restore')).ok).toBe(true)
  expect(await w.contents('a.txt', 'b.txt', 'c.txt')).toEqual({ 'a.txt': '中文 A', 'b.txt': '中文 B', 'c.txt': '中文 C' })
  expect(w.state.calls.followups).toBe(1)
  const saved = await w.outcome()
  expect(saved.kind).toBeUndefined()
  expect(saved.ok).toBe(true)
})

it('refuses empty, forged and duplicated selections before writing anything, and still permits keep and cancel', async () => {
  const w = await workspace()
  const preview = await w.start()
  for (const selected of [[], ['missing.txt'], ['a.txt', 'a.txt']]) {
    expect(await w.choose(preview, 'restore', selected)).toEqual({ ok: false, error: { code: 'invalid-selection' } })
  }
  expect(await w.contents('a.txt', 'b.txt', 'c.txt')).toEqual({ 'a.txt': '助手改过 A', 'b.txt': '助手改过 B', 'c.txt': '助手改过 C' })
  expect(w.state.calls.followups).toBe(0)
  expect(auditCount(w.session)).toBe(0)
  expect(await w.outcomeFiles()).toEqual([])
  // The refusals never consumed the plan: keep continues with every file as it stands.
  expect((await w.choose(preview, 'keep')).ok).toBe(true)
  expect(w.state.calls.followups).toBe(1)
})

it('stops generation after a partial restore, re-checks with the recorded selection, and finalizes on keep with the real results', async () => {
  const w = await workspace()
  const preview = await w.start()
  faults.afterCommit = async (target, fs) => {
    if (target === path.join(w.cwd, 'a.txt')) await fs.writeFile(path.join(w.cwd, 'b.txt'), '用户修改 D')
  }
  const stopped = await w.choose(preview, 'restore', ['a.txt', 'b.txt'])
  faults.afterCommit = undefined
  expect(stopped.error.code).toBe('execution-stopped')
  expect(stopped.error.files).toEqual([
    { path: 'a.txt', action: 'restored' },
    { path: 'b.txt', action: 'refuse', reason: 'content-diverged' },
    { path: 'c.txt', action: 'kept' },
  ])
  expect(w.state.calls.followups).toBe(0)
  expect(auditCount(w.session)).toBe(0)
  // The re-check reports a as already restored and never re-selects the kept c.
  const refreshed = await w.choose(preview, 'preview')
  expect(refreshed.value.files).toEqual([
    { path: 'a.txt', action: 'refuse', reason: 'already-restored' },
    { path: 'b.txt', action: 'refuse', reason: 'content-diverged' },
    { path: 'c.txt', action: 'restore' },
  ])
  expect(refreshed.value.selected).toEqual(['a.txt', 'b.txt'])
  // Keeping the remainder saves the real results and the kept decisions, then continues.
  expect((await w.choose(refreshed, 'keep')).ok).toBe(true)
  expect(await w.contents('a.txt', 'b.txt', 'c.txt')).toEqual({ 'a.txt': '中文 A', 'b.txt': '用户修改 D', 'c.txt': '助手改过 C' })
  expect(w.state.calls.trace).toEqual(['flush', 'followup'])
  expect(auditCount(w.session)).toBe(1)
  const saved = await w.outcome()
  expect(saved.kind).toBe('file-rollback-result')
  expect(saved.version).toBe(2)
  expect(saved.value.value.files).toEqual([
    { path: 'a.txt', action: 'restored' },
    { path: 'b.txt', action: 'kept' },
    { path: 'c.txt', action: 'kept' },
  ])
})

it('stops the keep wrap-up and sends nothing when the final result cannot be saved', async () => {
  const w = await workspace()
  const preview = await w.start()
  faults.afterCommit = async (target, fs) => {
    if (target === path.join(w.cwd, 'a.txt')) await fs.writeFile(path.join(w.cwd, 'b.txt'), '用户修改 D')
  }
  expect((await w.choose(preview, 'restore', ['a.txt', 'b.txt'])).error.code).toBe('execution-stopped')
  faults.afterCommit = undefined
  faults.failResultSave = true
  const failed = await w.choose(preview, 'keep')
  expect(failed.error.code).toBe('result-save-failed')
  expect(failed.error.files).toEqual([
    { path: 'a.txt', action: 'restored' },
    { path: 'b.txt', action: 'kept' },
    { path: 'c.txt', action: 'kept' },
  ])
  expect(w.state.calls.followups).toBe(0)
  expect(auditCount(w.session)).toBe(0)
  faults.failResultSave = false
  expect((await w.choose(preview, 'keep')).ok).toBe(true)
  expect(w.state.calls.followups).toBe(1)
})

it('keeps an uncertain member uncertain through the keep wrap-up and never finalizes the point', async () => {
  const w = await workspace()
  const preview = await w.start()
  // b commits but its verification fails: the outcome is unknown and must stay unknown.
  faults.afterCommit = async (target, fs) => {
    if (target === path.join(w.cwd, 'b.txt')) await fs.writeFile(target, '编辑器最新内容')
  }
  const stopped = await w.choose(preview, 'restore', ['a.txt', 'b.txt'])
  faults.afterCommit = undefined
  expect(stopped.error.code).toBe('execution-stopped')
  expect(stopped.error.files).toEqual([
    { path: 'a.txt', action: 'restored' },
    { path: 'b.txt', action: 'refuse', reason: 'restore-outcome-unavailable' },
    { path: 'c.txt', action: 'kept' },
  ])
  const kept = await w.choose(preview, 'keep')
  expect(kept.error.code).toBe('execution-stopped')
  expect(kept.error.files).toEqual([
    { path: 'a.txt', action: 'restored' },
    { path: 'b.txt', action: 'refuse', reason: 'restore-outcome-unavailable' },
    { path: 'c.txt', action: 'kept' },
  ])
  expect(w.state.calls.followups).toBe(0)
  expect(auditCount(w.session)).toBe(0)
  expect((await w.outcome()).kind).toBe('file-rollback-progress')
  expect(await readFile(path.join(w.cwd, 'b.txt'), 'utf8')).toBe('编辑器最新内容')
})

it('reports kept files honestly when the rewind fails after a subset restore, and the retry only continues', async () => {
  const w = await workspace()
  const preview = await w.start()
  const append = w.session.append.bind(w.session)
  let refuse = true
  w.session.append = (...args) => {
    if (refuse && args[0] === 'compaction/prune') throw new Error('simulated rewind failure')
    return append(...args)
  }
  const failed = await w.choose(preview, 'restore', ['a.txt'])
  expect(failed.error.code).toBe('rewind-failed')
  expect(failed.error.files).toEqual([
    { path: 'a.txt', action: 'restored' },
    { path: 'b.txt', action: 'kept' },
    { path: 'c.txt', action: 'kept' },
  ])
  expect(w.state.calls.followups).toBe(0)
  expect(auditCount(w.session)).toBe(0)
  refuse = false
  // A retry with an EXPANDED selection must not restore again: b keeps its contents.
  const resent = await w.choose(preview, 'restore', ['a.txt', 'b.txt'])
  expect(resent.ok, JSON.stringify(resent)).toBe(true)
  expect(resent.value.resendMessageId).toBeDefined()
  expect(await w.contents('a.txt', 'b.txt')).toEqual({ 'a.txt': '中文 A', 'b.txt': '助手改过 B' })
  expect(auditCount(w.session)).toBe(1)
})

it('does not start a second processing run for another selection behind the same lock', async () => {
  const w = await workspace({ agent: 'deaf' })
  const preview = await w.start()
  const results = await Promise.all([
    w.choose(preview, 'restore', ['a.txt']),
    w.choose(preview, 'restore', ['b.txt', 'c.txt']),
  ])
  expect(results.map(result => result.ok)).toEqual([true, false])
  expect(results[1].error.code).toBe('plan-not-found')
  // The second selection never ran: b and c keep their current contents.
  expect(await w.contents('a.txt', 'b.txt', 'c.txt')).toEqual({ 'a.txt': '中文 A', 'b.txt': '助手改过 B', 'c.txt': '助手改过 C' })
  expect(w.state.calls.followups).toBe(1)
  expect(auditCount(w.session)).toBe(1)
})

it('leaves processed files processed when the replay is canceled, and never finalizes the unfinished point', async () => {
  const w = await workspace()
  const preview = await w.start()
  faults.afterCommit = async (target, fs) => {
    if (target === path.join(w.cwd, 'a.txt')) await fs.writeFile(path.join(w.cwd, 'b.txt'), '用户修改 D')
  }
  expect((await w.choose(preview, 'restore', ['a.txt', 'b.txt'])).error.code).toBe('execution-stopped')
  faults.afterCommit = undefined
  expect(await w.choose(preview, 'cancel')).toEqual({ ok: true, value: { canceled: true } })
  // Cancel restores nothing back and sends nothing: the landed change stands.
  expect(await w.contents('a.txt', 'b.txt', 'c.txt')).toEqual({ 'a.txt': '中文 A', 'b.txt': '用户修改 D', 'c.txt': '助手改过 C' })
  expect(w.state.calls.followups).toBe(0)
  expect(auditCount(w.session)).toBe(0)
  expect((await w.outcome()).kind).toBe('file-rollback-progress')
  // A new operation is a NEW carrier (the id is minted per attempt), so its plan
  // reports the files as they now are: a and b diverge from that plan, c is
  // offered again unchecked. The old point's journal still says what happened.
  const second = await w.start()
  expect(second.value.files).toEqual([
    { path: 'a.txt', action: 'refuse', reason: 'content-diverged' },
    { path: 'b.txt', action: 'refuse', reason: 'content-diverged' },
    { path: 'c.txt', action: 'restore' },
  ])
  expect(second.value.selected).toBeUndefined()
  expect((await w.choose(second, 'keep')).ok).toBe(true)
  expect(w.state.calls.followups).toBe(1)
})

it('refuses the whole selected subset when one member changed before execution, and keeps the unselected one honest', async () => {
  const w = await workspace()
  const preview = await w.start()
  await writeFile(path.join(w.cwd, 'a.txt'), '用户抢先修改')
  const stale = await w.choose(preview, 'restore', ['a.txt', 'b.txt'])
  expect(stale.error.code).toBe('preview-stale')
  // The unselected c is a kept decision, not a system failure.
  expect(stale.error.files).toEqual([
    { path: 'a.txt', action: 'refuse', reason: 'content-diverged' },
    { path: 'b.txt', action: 'refuse', reason: 'execution-stopped' },
    { path: 'c.txt', action: 'kept' },
  ])
  expect(await w.contents('a.txt', 'b.txt', 'c.txt')).toEqual({ 'a.txt': '用户抢先修改', 'b.txt': '助手改过 B', 'c.txt': '助手改过 C' })
  expect(w.state.calls.followups).toBe(0)
  expect(await w.outcomeFiles()).toEqual([])
  const refreshed = await w.choose(preview, 'preview')
  expect(refreshed.value.files[0]).toEqual({ path: 'a.txt', action: 'refuse', reason: 'content-diverged' })
  expect((await w.choose(refreshed, 'keep')).ok).toBe(true)
})

it('refuses a malformed wire selection before any host processing starts', async () => {
  const w = await workspace()
  const preview = await w.start()
  const forged = await dispatchToHost(w.host, 'resend/replay', { request: { phase: 'restore', sessionId: SESSION_ID,
    preflightId: preview.value.preflightId, selected: 'a.txt' } })
  expect(forged.ok).toBe(false)
  expect((await w.choose(preview, 'restore', ['a.txt'])).ok).toBe(true)
  expect(await w.contents('a.txt', 'b.txt', 'c.txt')).toEqual({ 'a.txt': '中文 A', 'b.txt': '助手改过 B', 'c.txt': '助手改过 C' })
})
