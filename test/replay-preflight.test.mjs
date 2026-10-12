import { afterEach, expect, it, vi } from 'vitest'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { Session } from '@deepseek-ai/dsh-session'
import { dispatchToHost, hostComposition } from './helpers/gateway.mjs'
import { agentDoubles, appendReply, appendUser, auditCount, hostState, logOf, SESSION_ID, sessionFixture } from './helpers/host.mjs'

const faults = vi.hoisted(() => ({ beforeCommit: undefined, afterCommit: undefined, failResultSave: false }))
vi.mock('node:fs/promises', async original => {
  const fs = await original()
  return { ...fs, open: async (...args) => {
    const handle = await fs.open(...args)
    if (String(args[0]).includes('.dsh-resend-')) {
      const write = handle.writeFile.bind(handle)
      handle.writeFile = async (...values) => { await write(...values); await faults.beforeCommit?.(fs) }
    }
    return handle
  }, rename: async (from, to) => {
    if (faults.failResultSave && String(to).includes(`${path.sep}outcomes${path.sep}`) && JSON.parse(await fs.readFile(from, 'utf8')).ok) throw new Error('result-save-failed')
    await fs.rename(from, to)
    if (String(from).includes('.dsh-resend-')) await faults.afterCommit?.(to, fs)
  } }
})
const cleanups = []
afterEach(async () => {
  faults.beforeCommit = undefined; faults.afterCommit = undefined; faults.failResultSave = false
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup()
})

async function workspace({ agent = 'accepting', files = true, resultFormat = 'native', config } = {}) {
  const home = await mkdtemp(path.join(tmpdir(), 'resend-preflight-'))
  cleanups.push(() => rm(home, { recursive: true, force: true }))
  const cwd = path.join(home, 'workspace')
  await mkdir(cwd)
  const session = Session.create(SESSION_ID, sessionFixture().snapshotEvents(), { version: 4, id: SESSION_ID, createdAt: 0, isSeeded: false, cwd })
  const state = hostState({ session, agent })
  const host = await hostComposition({ host: state, dataHome: path.join(home, 'data'), config })
  cleanups.push(() => host.ctx.fiber.dispose())
  let count = 0
  async function write(name, content) {
    const callId = `write-${++count}`
    const args = { file_path: name, content }
    const call = session.append('tool/call', { turn: 2, step: 1, callId, name: 'write', arguments: JSON.stringify(args) })
    await host.ctx.waterfall('tools/execute', { name: 'write', callId, arguments: args, agent: { session } }, async () => {
      const before = await readFile(path.join(cwd, name), 'utf8').catch(error => { if (error.code === 'ENOENT') return null; throw error })
      await writeFile(path.join(cwd, name), content)
      return { isError: false, value: { before, after: content } }
    })
    session.append('tool/result', { turn: 2, step: 1, message: { role: 'tool', id: `result-${count}`,
      ...(resultFormat === 'native' ? { toolCallId: callId, source: { kind: 'tool', callId } }
        : resultFormat === 'legacy' ? { callId }
        : resultFormat === 'source' ? { source: { kind: 'tool', callId } }
        : resultFormat === 'conflicting' ? { toolCallId: callId, source: { kind: 'tool', callId: 'wrong-id' } } : {}),
      content: [{ type: 'text', text: 'written' }], isError: false } }, { surfaceOp: 'append', sourceEventSeqs: [call.seq] })
  }
  if (files) { await writeFile(path.join(cwd, 'file.txt'), '中文 A'); await write('file.txt', '中文 B'); await write('file.txt', '中文 C') }
  const call = async (request, target = host) => {
    const wire = await dispatchToHost(target, 'resend/replay', { request })
    expect(wire.ok, JSON.stringify(wire)).toBe(true)
    return wire.value
  }
  const start = (op = 'edit') => call({ phase: 'start', request: { sessionId: SESSION_ID,
    targetSeq: op === 'edit' ? 2 : 3, op, ...(op === 'edit' ? { text: '编辑后的中文消息' } : {}) } })
  const choose = (result, phase) => call({ phase, sessionId: SESSION_ID, preflightId: result.value.preflightId })
  return { home, cwd, session, state, host, write, call, start, choose }
}

it('keeps an unassociated mutation in preflight instead of treating it as no changes', async () => {
  const w = await workspace({ resultFormat: 'missing' })
  const preview = await w.start('regenerate')
  expect(preview.value).toMatchObject({ preflight: true, files: [{ path: 'file.txt' }] })
  expect(w.state.calls.followups).toBe(0)
  expect(auditCount(w.session)).toBe(0)
})

it('supports the historical callId result shape explicitly', async () => {
  const w = await workspace({ resultFormat: 'legacy' })
  expect((await w.start()).value).toMatchObject({ preflight: true, files: [{ path: 'file.txt', action: 'restore' }] })
})

it('supports source.callId alone and explicit sourceEventSeqs linkage', async () => {
  for (const resultFormat of ['source', 'missing']) {
    const w = await workspace({ resultFormat })
    expect((await w.start()).value.files).toEqual([{ path: 'file.txt', action: 'restore' }])
    expect(w.state.calls.followups).toBe(0)
  }
})

it('refuses conflicting result identities and waits for an explicit choice', async () => {
  const w = await workspace({ resultFormat: 'conflicting' })
  const preview = await w.start()
  expect(preview.value.files).toEqual([{ path: 'file.txt', action: 'refuse', reason: 'tool-result-ambiguous' }])
  expect(w.state.calls.followups).toBe(0)
  expect((await w.choose(preview, 'cancel')).value.canceled).toBe(true)
  expect(await readFile(path.join(w.cwd, 'file.txt'), 'utf8')).toBe('中文 C')
})

it('does not silently discard writes with no usable result linkage', async () => {
  const w = await workspace({ files: false })
  w.session.append('tool/call', { turn: 2, step: 1, callId: 'unlinked', name: 'write', arguments: JSON.stringify({ file_path: 'unlinked.txt' }) })
  w.session.append('tool/result', { turn: 2, step: 1, message: { role: 'tool', id: 'unlinked-result', content: [{ type: 'text', text: 'written' }], isError: false } }, { surfaceOp: 'append' })
  const preview = await w.start()
  expect(preview.value.files).toEqual([{ path: 'unlinked.txt', action: 'refuse', reason: 'tool-result-unavailable' }])
  expect(w.state.calls.followups).toBe(0)
})

it('refuses duplicated tool results instead of choosing one arbitrarily', async () => {
  const w = await workspace()
  const original = logOf(w.session).find(event => event.type === 'tool/result')
  w.session.append('tool/result', { ...original.data, message: { ...original.data.message, id: 'duplicate-result' } }, { surfaceOp: 'append', sourceEventSeqs: original.sourceEventSeqs })
  const preview = await w.start()
  expect(preview.value.files).toEqual([{ path: 'file.txt', action: 'refuse', reason: 'tool-result-ambiguous' }])
  expect(w.state.calls.followups).toBe(0)
})

it('keeps mutations with missing results visible but excludes missing results from an earlier user message', async () => {
  const w = await workspace({ files: false })
  w.session.append('tool/call', { turn: 2, step: 1, callId: 'missing', name: 'edit', arguments: JSON.stringify({ file_path: 'file.txt' }) })
  const preview = await w.start('regenerate')
  expect(preview.value.files).toEqual([{ path: 'file.txt', action: 'refuse', reason: 'tool-result-unavailable' }])
  expect(w.state.calls.followups).toBe(0)
  await w.choose(preview, 'cancel')
  const user = appendUser(w.session, { id: 'later', text: '后续消息没有修改文件' })
  const sent = await w.call({ phase: 'start', request: { sessionId: SESSION_ID, targetSeq: user.seq, op: 'edit', text: '后续消息编辑' } })
  expect(sent.ok).toBe(true)
  expect(sent.value.preflight).toBeUndefined()
  expect(w.state.calls.followups).toBe(1)
})

it('blocks malformed mutation arguments instead of sending without a file inventory', async () => {
  const w = await workspace({ files: false })
  w.session.append('tool/call', { turn: 2, step: 1, callId: 'malformed', name: 'write', arguments: '{' })
  const result = await w.start()
  expect(result).toEqual({ ok: false, error: { code: 'internal' } })
  expect(w.state.calls.followups).toBe(0)
  expect(auditCount(w.session)).toBe(0)
})

it.each(['edit', 'regenerate'])('%s at round two removes all three later writes to EXAMPLE.md after confirmation', async op => {
  const w = await workspace({ files: false, config: { restrictEditToLastUserMessage: false, restrictRegenerateToLastReply: false } })
  const before = '# dsh-resend\n'
  const version = before + '\nVersion: 0.1.0\n'
  const upstream = version + '\nUpstream (DSH Desktop): 2.0.17\n'
  await writeFile(path.join(w.cwd, 'EXAMPLE.md'), before)
  await w.write('EXAMPLE.md', version)
  appendUser(w.session, { id: 'third', text: '@EXAMPLE.md 追加适配的上游版本' })
  await w.write('./EXAMPLE.md', upstream)
  appendReply(w.session, { id: 'third-reply', text: '已追加上游版本', turn: 3 })
  appendUser(w.session, { id: 'fourth', text: '@EXAMPLE.md 追加插件作用' })
  const after = upstream + '\nDescription: 插件作用\n'
  await w.write('EXAMPLE.md', after)
  appendReply(w.session, { id: 'fourth-reply', text: '已追加插件作用', turn: 4 })
  const preview = await w.start(op)
  expect(preview.value.files).toEqual([{ path: 'EXAMPLE.md', action: 'restore' }])
  expect(w.state.calls.followups).toBe(0)
  expect(await readFile(path.join(w.cwd, 'EXAMPLE.md'), 'utf8')).toBe(after)
  expect((await w.choose(preview, 'restore')).ok).toBe(true)
  expect(await readFile(path.join(w.cwd, 'EXAMPLE.md'), 'utf8')).toBe(before)
  expect(w.state.calls.followups).toBe(1)
  expect(auditCount(w.session)).toBe(1)
})

it.each(['edit', 'regenerate'])('%s waits for a choice, restores C to A, then rewinds and sends the exact prompt', async op => {
  const w = await workspace()
  const original = logOf(w.session)
  const preview = await w.start(op)
  expect(preview.value).toMatchObject({ preflight: true, userSeq: 2, files: [{ path: 'file.txt', action: 'restore' }] })
  expect(JSON.stringify(preview)).not.toContain('中文 A')
  expect(logOf(w.session)).toEqual(original)
  expect(w.state.calls.followups).toBe(0)
  const followup = w.state.agent.followup.bind(w.state.agent)
  w.state.agent.followup = input => {
    expect(requireFileAtSend).toBe('中文 A')
    followup(input)
  }
  let requireFileAtSend
  faults.afterCommit = async (_, fs) => { requireFileAtSend = await fs.readFile(path.join(w.cwd, 'file.txt'), 'utf8'); expect(auditCount(w.session)).toBe(0) }
  const sent = await w.choose(preview, 'restore')
  expect(sent.ok, JSON.stringify(sent)).toBe(true)
  expect(await readFile(path.join(w.cwd, 'file.txt'), 'utf8')).toBe('中文 A')
  expect(w.state.calls.trace).toEqual(['flush', 'followup'])
  expect(w.state.calls.followupInputs[0].content[0].text).toBe(op === 'edit' ? '编辑后的中文消息' : 'second prompt')
  expect(auditCount(w.session)).toBe(1)
  expect(await w.choose(preview, 'restore')).toEqual({ ok: false, error: { code: 'plan-not-found' } })
})

it.each(['edit', 'regenerate'])('%s skips preflight and the later empty file panel when there are no file changes', async op => {
  const w = await workspace({ files: false })
  const sent = await w.start(op)
  expect(sent.value.preflight).toBeUndefined()
  expect(w.state.calls.followups).toBe(1)
  const status = await dispatchToHost(w.host, 'resend/rollback', { request: { sessionId: SESSION_ID, carrierSeq: sent.value.carrierSeq, phase: 'status' } })
  expect(status.value.value.empty).toBe(true)
})

it('skips writes whose combined before and after contents are equal', async () => {
  const w = await workspace()
  await w.write('file.txt', '中文 A')
  expect((await w.start()).value.preflight).toBeUndefined()
  expect(w.state.calls.followups).toBe(1)
})

it('cancel preserves files and the entire conversation and permits a new operation', async () => {
  const w = await workspace()
  const original = logOf(w.session)
  const preview = await w.start()
  expect(await w.choose(preview, 'cancel')).toEqual({ ok: true, value: { canceled: true } })
  expect(await readFile(path.join(w.cwd, 'file.txt'), 'utf8')).toBe('中文 C')
  expect(logOf(w.session)).toEqual(original)
  expect(w.state.calls.followups).toBe(0)
  expect((await w.start()).value.preflight).toBe(true)
})

it('keep continues with the current file, including user modifications after preview', async () => {
  const w = await workspace()
  const preview = await w.start()
  await writeFile(path.join(w.cwd, 'file.txt'), '用户修改 D')
  expect((await w.choose(preview, 'keep')).ok).toBe(true)
  expect(await readFile(path.join(w.cwd, 'file.txt'), 'utf8')).toBe('用户修改 D')
  expect(w.state.calls.followups).toBe(1)
})

it('refuses stale files, refreshes the same plan and allows keeping them', async () => {
  const w = await workspace()
  const preview = await w.start()
  await writeFile(path.join(w.cwd, 'file.txt'), '用户修改 D')
  expect((await w.choose(preview, 'restore')).error.code).toBe('preview-stale')
  expect(w.state.calls.followups).toBe(0)
  expect(auditCount(w.session)).toBe(0)
  const refreshed = await w.choose(preview, 'preview')
  expect(refreshed.value.files).toEqual([{ path: 'file.txt', action: 'refuse', reason: 'content-diverged' }])
  expect((await w.choose(refreshed, 'keep')).ok).toBe(true)
})

it('does not restore or resend over a changed conversation or active assistant', async () => {
  const w = await workspace()
  const preview = await w.start()
  w.state.agent.status = 'running'
  expect((await w.choose(preview, 'restore')).error.code).toBe('agent-busy')
  w.state.agent.status = 'idle'
  appendUser(w.session, { id: 'new', text: '来自另一个窗口' })
  expect((await w.choose(preview, 'restore')).ok).toBe(false)
  expect(await readFile(path.join(w.cwd, 'file.txt'), 'utf8')).toBe('中文 C')
  expect(w.state.calls.followups).toBe(0)
  expect((await w.choose(preview, 'cancel')).ok).toBe(true)
})

it('stops partial restore without rewinding or sending, and refreshed retries keep already restored files', async () => {
  const w = await workspace()
  await writeFile(path.join(w.cwd, 'second.txt'), '第二个 A')
  await w.write('second.txt', '第二个 C')
  const preview = await w.start()
  faults.afterCommit = async (target, fs) => { if (target === path.join(w.cwd, 'file.txt')) await fs.writeFile(path.join(w.cwd, 'second.txt'), '用户修改 D') }
  const failed = await w.choose(preview, 'restore')
  expect(failed.error.code).toBe('execution-stopped')
  expect(failed.error.files[0].action).toBe('restored')
  expect(w.state.calls.followups).toBe(0)
  expect(auditCount(w.session)).toBe(0)
  const refreshed = await w.choose(preview, 'preview')
  expect(refreshed.value.files[0].reason).toBe('already-restored')
  expect((await w.choose(refreshed, 'keep')).ok).toBe(true)
  expect(await readFile(path.join(w.cwd, 'file.txt'), 'utf8')).toBe('中文 A')
  expect(await readFile(path.join(w.cwd, 'second.txt'), 'utf8')).toBe('用户修改 D')
})

it('stops before rewind if saving the restore result fails and retries without restoring twice', async () => {
  const w = await workspace()
  const preview = await w.start()
  faults.failResultSave = true
  expect((await w.choose(preview, 'restore')).error.code).toBe('result-save-failed')
  expect(w.state.calls.followups).toBe(0)
  expect(auditCount(w.session)).toBe(0)
  expect(await readFile(path.join(w.cwd, 'file.txt'), 'utf8')).toBe('中文 A')
  faults.failResultSave = false
  faults.beforeCommit = async () => { throw new Error('must not restore twice') }
  expect((await w.choose(preview, 'restore')).ok).toBe(true)
  expect(w.state.calls.followups).toBe(1)
})

it('checks conversation again after file I/O and sends nothing if it changed', async () => {
  const w = await workspace()
  const preview = await w.start()
  faults.afterCommit = async () => appendUser(w.session, { id: 'raced', text: '同时发送的消息' })
  expect((await w.choose(preview, 'restore')).error.code).toBe('preview-stale')
  expect(auditCount(w.session)).toBe(0)
  expect(w.state.calls.followups).toBe(0)
})

it('retries a failed prompt after restore without a second rewind or file restore', async () => {
  const w = await workspace({ agent: 'deaf' })
  const preview = await w.start()
  expect((await w.choose(preview, 'restore')).value.resendMessageId).toBeUndefined()
  await writeFile(path.join(w.cwd, 'file.txt'), '发送失败后手动修改')
  w.state.agent = agentDoubles(w.state).accepting()
  const resent = await w.start()
  expect(resent.value.resendMessageId).toBeDefined()
  expect(auditCount(w.session)).toBe(1)
  expect(w.state.calls.flushes).toBe(1)
  expect(await readFile(path.join(w.cwd, 'file.txt'), 'utf8')).toBe('发送失败后手动修改')
})

it('rejects another host window and a restarted host using an old transient preflight', async () => {
  const w = await workspace()
  const preview = await w.start()
  const other = await hostComposition({ host: w.state, dataHome: path.join(w.home, 'data') })
  cleanups.push(() => other.ctx.fiber.dispose())
  expect(await w.call({ phase: 'restore', sessionId: SESSION_ID, preflightId: preview.value.preflightId }, other)).toEqual({ ok: false, error: { code: 'plan-not-found' } })
  expect(await readFile(path.join(w.cwd, 'file.txt'), 'utf8')).toBe('中文 C')
  expect(w.state.calls.followups).toBe(0)
})

it('rejects duplicate confirmation queued behind the same host lock', async () => {
  const w = await workspace({ agent: 'deaf' })
  const preview = await w.start()
  const results = await Promise.all([w.choose(preview, 'restore'), w.choose(preview, 'restore')])
  expect(results.map(result => result.ok)).toEqual([true, false])
  expect(w.state.calls.followups).toBe(1)
  expect(auditCount(w.session)).toBe(1)
})

it('requires the original prompt, session and host-issued plan instead of trusting client fields', async () => {
  const w = await workspace()
  const preview = await w.start()
  const forged = await dispatchToHost(w.host, 'resend/replay', { request: { phase: 'restore', sessionId: SESSION_ID,
    preflightId: preview.value.preflightId, text: '替换提示', targetSeq: 0 } })
  expect(forged.ok).toBe(false)
  expect(await w.call({ phase: 'restore', sessionId: 'another-session', preflightId: preview.value.preflightId })).toEqual({ ok: false, error: { code: 'plan-not-found' } })
  expect(w.state.calls.followups).toBe(0)
})

it('retains restored files when rewind fails and retries the write without another restore', async () => {
  const w = await workspace()
  const preview = await w.start()
  const append = w.session.append.bind(w.session)
  let refuse = true
  w.session.append = (...args) => {
    if (refuse && args[0] === 'compaction/prune') throw new Error('simulated rewind failure')
    return append(...args)
  }
  const failed = await w.choose(preview, 'restore')
  expect(failed.error.code).toBe('rewind-failed')
  expect(failed.error.files).toEqual([{ path: 'file.txt', action: 'restored' }])
  expect(w.state.calls.followups).toBe(0)
  expect(auditCount(w.session)).toBe(0)
  expect(await readFile(path.join(w.cwd, 'file.txt'), 'utf8')).toBe('中文 A')
  refuse = false
  faults.beforeCommit = async () => { throw new Error('must not restore twice') }
  expect((await w.choose(preview, 'keep')).ok).toBe(true)
  expect(w.state.calls.followups).toBe(1)
})

it('invalidates a preflight if its private records were cleared and still permits cancel', async () => {
  const w = await workspace()
  const preview = await w.start()
  const cleanup = async request => (await dispatchToHost(w.host, 'resend/cleanup', { request })).value
  const scope = await cleanup({ phase: 'preview', mode: 'sessions', sessionIds: [SESSION_ID] })
  expect((await cleanup({ phase: 'execute', mode: 'sessions', planId: scope.value.planId })).ok).toBe(true)
  expect((await w.choose(preview, 'restore')).error.code).toBe('preview-stale')
  expect((await w.choose(preview, 'cancel')).ok).toBe(true)
  expect(await readFile(path.join(w.cwd, 'file.txt'), 'utf8')).toBe('中文 C')
  expect(w.state.calls.followups).toBe(0)
})

it('allows a fresh operation after page reload and retires the previous plan without sending', async () => {
  const w = await workspace()
  const abandoned = await w.start()
  const fresh = await w.start()
  expect(fresh.value.preflightId).not.toBe(abandoned.value.preflightId)
  expect(w.state.calls.followups).toBe(0)
  expect(auditCount(w.session)).toBe(0)
  expect((await w.choose(abandoned, 'restore')).error.code).toBe('plan-not-found')
  expect((await w.choose(fresh, 'restore')).ok).toBe(true)
  expect(await readFile(path.join(w.cwd, 'file.txt'), 'utf8')).toBe('中文 A')
  expect(w.state.calls.followups).toBe(1)
})
