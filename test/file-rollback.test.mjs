import { afterEach, expect, it } from 'vitest'
import { mkdtemp, rm, writeFile, readFile, readdir, stat, utimes } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { Session } from '@deepseek-ai/dsh-session'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { dispatchToHost, hostComposition } from './helpers/gateway.mjs'
import { appendUser, appendReply, hostState, SESSION_ID, sessionFixture, withRefusingAppend } from './helpers/host.mjs'

const cleanups = []
afterEach(async () => { for (const cleanup of cleanups.splice(0).reverse()) await cleanup() })

async function workspace(git = false) {
  const home = await mkdtemp(path.join(tmpdir(), 'resend-files-'))
  cleanups.push(() => rm(home, { recursive: true, force: true }))
  const cwd = path.join(home, 'workspace')
  const { mkdir } = await import('node:fs/promises')
  await mkdir(cwd)
  if (git) execFileSync('git', ['init', '-q', cwd])
  const session = Session.create(SESSION_ID, sessionFixture().snapshotEvents(), { version: 4, id: SESSION_ID, createdAt: 0, isSeeded: false, cwd })
  const state = hostState({ session, agent: 'deaf' })
  const host = await hostComposition({ host: state, dataHome: path.join(home, 'data') })
  cleanups.push(() => host.ctx.fiber.dispose())
  const call = async (request) => {
    const wire = await dispatchToHost(host, 'resend/rollback', { request: { sessionId: SESSION_ID, ...request } })
    expect(wire.ok, JSON.stringify(wire)).toBe(true)
    return wire.value
  }
  let number = 0
  async function write(name, content, beforeWrite = async () => {}) {
    const callId = `write-${++number}`
    const args = { file_path: name, content }
    const event = session.append('tool/call', { turn: 1, step: 1, callId, name: 'write', arguments: JSON.stringify(args) })
    const exec = { name: 'write', callId, arguments: args, agent: { session } }
    await host.ctx.waterfall('tools/execute', exec, async () => {
      await beforeWrite()
      const before = await readFile(path.resolve(cwd, name), 'utf8').catch((error) => { if (error.code === 'ENOENT') return null; throw error })
      await writeFile(path.resolve(cwd, name), content)
      return { isError: false, value: { path: name, before: before?.replace(/^\ufeff/, '').replaceAll('\r\n', '\n') ?? null, after: content } }
    })
    session.append('tool/result', { turn: 1, step: 1, message: { role: 'tool', id: `result-${number}`, callId, content: [{ type: 'text', text: 'written' }], isError: false } }, { surfaceOp: 'append', sourceEventSeqs: [event.seq] })
  }
  async function rewind() {
    const wire = await dispatchToHost(host, 'resend/apply', { request: { sessionId: SESSION_ID, targetSeq: 2, op: 'edit', text: 'new prompt' } })
    expect(wire.ok, JSON.stringify(wire)).toBe(true)
    expect(wire.value.ok, JSON.stringify(wire.value)).toBe(true)
    return wire.value.value.carrierSeq
  }
  return { home, cwd, session, state, host, call, write, rewind }
}

it('refuses a rollback with no rewind target and creates no version data', async () => {
  const home = await mkdtemp(path.join(tmpdir(), 'resend-files-'))
  cleanups.push(() => rm(home, { recursive: true, force: true }))
  const host = await hostComposition({ host: hostState(), dataHome: home })
  cleanups.push(() => host.ctx.fiber.dispose())
  const wire = await dispatchToHost(host, 'resend/rollback', { request: { sessionId: SESSION_ID, carrierSeq: 5, phase: 'preview' } })
  expect(wire.ok, JSON.stringify(wire)).toBe(true)
  expect(wire.value).toEqual({ ok: false, error: { code: 'no-target-state' } })
  await expect(readdir(path.join(home, 'plugins', 'dsh-resend', 'records'))).rejects.toMatchObject({ code: 'ENOENT' })
})

it('refuses a user edit made after observation but before the actual tool write', async () => {
  const w = await workspace()
  await writeFile(path.join(w.cwd, 'file.txt'), 'initial')
  await w.write('file.txt', 'agent', () => writeFile(path.join(w.cwd, 'file.txt'), 'user concurrent edit'))
  const carrierSeq = await w.rewind()
  const preview = await w.call({ carrierSeq, phase: 'preview' })
  expect(preview.value.files).toEqual([{ path: 'file.txt', action: 'refuse', reason: 'content-diverged' }])
})

it('uses private Git blobs without changing HEAD, branch refs, the index or worktree until execution', async () => {
  const w = await workspace(true)
  const git = (...args) => execFileSync('git', args, { cwd: w.cwd }).toString('utf8')
  await writeFile(path.join(w.cwd, 'file.txt'), 'committed')
  git('add', '.')
  git('-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-qm', 'initial')
  const head = git('rev-parse', 'HEAD')
  const refs = git('show-ref')
  const index = await readFile(path.join(w.cwd, '.git', 'index'))
  await writeFile(path.join(w.cwd, 'file.txt'), 'user uncommitted before turn')
  await w.write('file.txt', 'agent wrote this')
  const carrierSeq = await w.rewind()
  const preview = await w.call({ carrierSeq, phase: 'preview' })
  expect(preview.value.files).toEqual([{ path: 'file.txt', action: 'restore' }])
  expect(await readFile(path.join(w.cwd, 'file.txt'), 'utf8')).toBe('agent wrote this')
  expect(await w.call({ carrierSeq, phase: 'execute', planId: preview.value.planId })).toEqual(preview)
  expect(await readFile(path.join(w.cwd, 'file.txt'), 'utf8')).toBe('user uncommitted before turn')
  expect(git('rev-parse', 'HEAD')).toBe(head)
  expect(git('show-ref')).toBe(refs)
  expect(await readFile(path.join(w.cwd, '.git', 'index'))).toEqual(index)
  const privateGit = path.join(w.home, 'data', 'plugins', 'dsh-resend', 'objects.git')
  expect(execFileSync('git', [`--git-dir=${privateGit}`, 'count-objects', '-v']).toString()).toContain('count: 2')
  expect(execFileSync('git', [`--git-dir=${privateGit}`, 'for-each-ref']).toString()).toBe('')
})

it('names divergent and missing-prior-state files and executes exactly the previewed subset', async () => {
  const w = await workspace()
  await writeFile(path.join(w.cwd, 'changed.txt'), 'before')
  await w.write('changed.txt', 'agent')
  await w.write('safe.txt', 'agent-created')
  const oldCall = w.session.append('tool/call', { turn: 2, step: 1, callId: 'historic', name: 'edit', arguments: JSON.stringify({ file_path: 'historic.txt', old_string: 'old', new_string: 'new' }) })
  w.session.append('tool/result', { turn: 2, step: 1, message: { role: 'tool', id: 'historic-result', callId: 'historic', content: [{ type: 'text', text: 'edited' }], isError: false } }, { surfaceOp: 'append', sourceEventSeqs: [oldCall.seq] })
  await writeFile(path.join(w.cwd, 'historic.txt'), 'do not guess')
  await writeFile(path.join(w.cwd, 'changed.txt'), 'user changed this later')
  const carrierSeq = await w.rewind()
  const preview = await w.call({ carrierSeq, phase: 'preview' })
  expect(preview.value.files).toEqual([
    { path: 'changed.txt', action: 'refuse', reason: 'content-diverged' },
    { path: 'safe.txt', action: 'restore' },
    { path: 'historic.txt', action: 'refuse', reason: 'prior-state-unavailable' },
  ])
  expect(await w.call({ carrierSeq, phase: 'execute', planId: preview.value.planId })).toEqual(preview)
  expect(await readFile(path.join(w.cwd, 'changed.txt'), 'utf8')).toBe('user changed this later')
  expect(await readFile(path.join(w.cwd, 'historic.txt'), 'utf8')).toBe('do not guess')
  await expect(readFile(path.join(w.cwd, 'safe.txt'))).rejects.toMatchObject({ code: 'ENOENT' })
})

it('rejects changes after the preview, and canceling or forging a plan writes nothing', async () => {
  const w = await workspace()
  await w.write('file.txt', 'agent')
  const carrierSeq = await w.rewind()
  const preview = await w.call({ carrierSeq, phase: 'preview' })
  expect(await w.call({ carrierSeq, phase: 'execute' })).toEqual({ ok: false, error: { code: 'plan-not-found' } })
  expect(await w.call({ carrierSeq, phase: 'cancel', planId: preview.value.planId })).toEqual(preview)
  expect(await w.call({ carrierSeq, phase: 'execute', planId: preview.value.planId })).toEqual({ ok: false, error: { code: 'plan-not-found' } })
  const next = await w.call({ carrierSeq, phase: 'preview' })
  await writeFile(path.join(w.cwd, 'file.txt'), 'user edit after preview')
  expect(await w.call({ carrierSeq, phase: 'execute', planId: next.value.planId })).toEqual({ ok: false, error: { code: 'preview-stale', files: [
    { path: 'file.txt', action: 'refuse', reason: 'content-diverged' },
  ] } })
  expect(await readFile(path.join(w.cwd, 'file.txt'), 'utf8')).toBe('user edit after preview')
})

it('detects an external edit between two agent writes and refuses the file', async () => {
  const w = await workspace()
  await w.write('file.txt', 'first agent write')
  await writeFile(path.join(w.cwd, 'file.txt'), 'user concurrent work')
  await w.write('file.txt', 'second agent write')
  const carrierSeq = await w.rewind()
  const preview = await w.call({ carrierSeq, phase: 'preview' })
  expect(preview.value.files).toEqual([{ path: 'file.txt', action: 'refuse', reason: 'diverged-between-writes' }])
  expect(await w.call({ carrierSeq, phase: 'execute', planId: preview.value.planId })).toEqual(preview)
  expect(await readFile(path.join(w.cwd, 'file.txt'), 'utf8')).toBe('second agent write')
})

it('compares bytes rather than timestamps and preserves a refused external edit exactly', async () => {
  const w = await workspace()
  const safe = path.join(w.cwd, 'safe.txt')
  const changed = path.join(w.cwd, 'changed.txt')
  const original = Buffer.from('原始内容\r\n', 'utf8')
  await writeFile(safe, original)
  await w.write('safe.txt', 'agent')
  await w.write('changed.txt', 'agent')
  const carrierSeq = await w.rewind()
  const time = await stat(changed)
  const external = Buffer.from([0xef, 0xbb, 0xbf, 0xff, 0x00, 0x0d, 0x0a])
  await writeFile(changed, external)
  await utimes(changed, time.atime, time.mtime)
  await utimes(safe, new Date(0), new Date(0))
  const preview = await w.call({ carrierSeq, phase: 'preview' })
  expect(preview.value.files).toEqual([
    { path: 'safe.txt', action: 'restore' },
    { path: 'changed.txt', action: 'refuse', reason: 'content-diverged' },
  ])
  expect(await w.call({ carrierSeq, phase: 'execute', planId: preview.value.planId })).toEqual(preview)
  expect(await readFile(changed)).toEqual(external)
  expect(await readFile(safe)).toEqual(original)
})

it('rolls back conversation only to the rewind point without restoring files or sending a prompt', async () => {
  const w = await workspace()
  await w.write('file.txt', 'agent')
  const carrierSeq = await w.rewind()
  const atPoint = w.session.surface.nodes.map((seq) => w.session.eventAt(seq).data)
  appendUser(w.session, { id: 'later', text: 'new conversation' })
  appendReply(w.session, { id: 'later-reply', text: 'new reply' })
  const before = w.session.seq
  const preview = await w.call({ carrierSeq, scope: 'conversation', phase: 'preview' })
  expect(preview.ok).toBe(true)
  expect(preview.value.files).toEqual([])
  expect(preview.value.conversation).toMatchObject({ action: 'rewind', count: 2 })
  expect(w.session.seq).toBe(before)
  const followups = w.state.calls.followups
  const result = await w.call({ carrierSeq, scope: 'conversation', phase: 'execute', planId: preview.value.planId })
  expect(result.ok).toBe(true)
  expect(result.value.conversation.action).toBe('rewound')
  const restored = w.session.surface.nodes.map((seq) => w.session.eventAt(seq).data)
  expect(restored.map(({ id, ...data }) => data)).toEqual(atPoint.map(({ id, ...data }) => data))
  expect(await readFile(path.join(w.cwd, 'file.txt'), 'utf8')).toBe('agent')
  expect(w.state.calls.followups).toBe(followups)
})

it.each(['artifacts', 'both'])('executes %s independently using the approved scope', async (scope) => {
  const w = await workspace()
  await writeFile(path.join(w.cwd, 'file.txt'), 'before')
  await w.write('file.txt', 'agent')
  const carrierSeq = await w.rewind()
  const later = appendUser(w.session, { id: 'later', text: 'later prompt' })
  const preview = await w.call({ carrierSeq, scope, phase: 'preview' })
  const seq = w.session.seq
  expect(await w.call({ carrierSeq, scope: 'conversation', phase: 'execute', planId: preview.value.planId }))
    .toEqual({ ok: false, error: { code: 'plan-scope-mismatch' } })
  expect(w.session.seq).toBe(seq)
  expect(await readFile(path.join(w.cwd, 'file.txt'), 'utf8')).toBe('agent')
  const result = await w.call({ carrierSeq, scope, phase: 'execute', planId: preview.value.planId })
  expect(result.ok).toBe(true)
  expect(await readFile(path.join(w.cwd, 'file.txt'), 'utf8')).toBe('before')
  expect(w.session.surface.nodes.includes(later.seq)).toBe(scope === 'artifacts')
  if (scope === 'artifacts') expect(w.session.seq).toBe(seq)
})

it.each(['conversation', 'artifacts', 'both'])('canceling %s writes neither conversation nor files', async (scope) => {
  const w = await workspace()
  await w.write('file.txt', 'agent')
  const carrierSeq = await w.rewind()
  appendUser(w.session, { id: 'later', text: 'later prompt' })
  const events = w.session.snapshotEvents()
  const preview = await w.call({ carrierSeq, scope, phase: 'preview' })
  expect((await w.call({ carrierSeq, scope, phase: 'cancel', planId: preview.value.planId })).ok).toBe(true)
  expect((await w.call({ carrierSeq, scope, phase: 'execute', planId: preview.value.planId })).error.code).toBe('plan-not-found')
  expect(w.session.snapshotEvents()).toEqual(events)
  expect(await readFile(path.join(w.cwd, 'file.txt'), 'utf8')).toBe('agent')
})

it('requires a new preview when the conversation grows after a both-scope preview', async () => {
  const w = await workspace()
  await w.write('file.txt', 'agent')
  const carrierSeq = await w.rewind()
  appendUser(w.session, { id: 'later', text: 'later prompt' })
  const preview = await w.call({ carrierSeq, scope: 'both', phase: 'preview' })
  appendUser(w.session, { id: 'newer', text: 'newer prompt' })
  const events = w.session.snapshotEvents()
  const result = await w.call({ carrierSeq, scope: 'both', phase: 'execute', planId: preview.value.planId })
  expect(result).toEqual({ ok: false, error: { code: 'conversation-stale', files: [
    { path: 'file.txt', action: 'refuse', reason: 'execution-stopped' },
  ] } })
  expect(w.session.snapshotEvents()).toEqual(events)
  expect(await readFile(path.join(w.cwd, 'file.txt'), 'utf8')).toBe('agent')
})

it('refuses both scopes if the agent starts while preparing the conversation rollback', async () => {
  const w = await workspace()
  await w.write('file.txt', 'agent')
  const carrierSeq = await w.rewind()
  appendUser(w.session, { id: 'later', text: 'later prompt' })
  const preview = await w.call({ carrierSeq, scope: 'both', phase: 'preview' })
  const events = w.session.snapshotEvents()
  let checks = 0
  Object.defineProperty(w.state.agent, 'status', { get: () => ++checks < 3 ? 'idle' : 'running' })
  const result = await w.call({ carrierSeq, scope: 'both', phase: 'execute', planId: preview.value.planId })
  expect(result).toEqual({ ok: false, error: { code: 'agent-busy', files: [
    { path: 'file.txt', action: 'refuse', reason: 'execution-stopped' },
  ] } })
  expect(w.session.snapshotEvents()).toEqual(events)
  expect(await readFile(path.join(w.cwd, 'file.txt'), 'utf8')).toBe('agent')
})

it('reports the new conversation point and every refused file if saving the rollback fails', async () => {
  const w = await workspace()
  await w.write('file.txt', 'agent')
  const carrierSeq = await w.rewind()
  const later = appendUser(w.session, { id: 'later', text: 'later prompt' })
  const preview = await w.call({ carrierSeq, scope: 'both', phase: 'preview' })
  w.host.ctx.sessions.flush = async () => { throw new Error('disk failed') }
  const result = await w.call({ carrierSeq, scope: 'both', phase: 'execute', planId: preview.value.planId })
  expect(result).toMatchObject({ ok: false, error: { code: 'conversation-save-failed', files: [
    { path: 'file.txt', action: 'refuse', reason: 'execution-stopped' },
  ], conversation: { action: 'rewound', count: 1 } } })
  expect(w.session.surface.nodes.includes(result.error.conversation.carrierSeq)).toBe(true)
  expect(w.session.surface.nodes.includes(later.seq)).toBe(false)
  expect(await readFile(path.join(w.cwd, 'file.txt'), 'utf8')).toBe('agent')
})

it('rejects a conversation that grows during a both-scope execution even if the preview had no new messages', async () => {
  const w = await workspace()
  await w.write('file.txt', 'agent')
  const carrierSeq = await w.rewind()
  const preview = await w.call({ carrierSeq, scope: 'both', phase: 'preview' })
  expect(preview.value.conversation).toEqual({ action: 'unchanged', count: 0 })
  let checks = 0
  Object.defineProperty(w.state.agent, 'status', { get: () => {
    if (++checks === 2) appendUser(w.session, { id: 'newer', text: 'new concurrent prompt' })
    return 'idle'
  } })
  const result = await w.call({ carrierSeq, scope: 'both', phase: 'execute', planId: preview.value.planId })
  expect(result).toEqual({ ok: false, error: { code: 'conversation-stale', files: [
    { path: 'file.txt', action: 'refuse', reason: 'execution-stopped' },
  ] } })
  expect(await readFile(path.join(w.cwd, 'file.txt'), 'utf8')).toBe('agent')
})

it('retains the private record across plugin restart without publishing contents or record addresses', async () => {
  const w = await workspace()
  await writeFile(path.join(w.cwd, 'file.txt'), 'before restart 中文')
  await w.write('file.txt', 'agent wrote')
  const carrierSeq = await w.rewind()
  await w.host.ctx.fiber.dispose()
  const restarted = await hostComposition({ host: w.state, dataHome: path.join(w.home, 'data') })
  cleanups.push(() => restarted.ctx.fiber.dispose())
  const preview = await dispatchToHost(restarted, 'resend/rollback', { request: { sessionId: SESSION_ID, carrierSeq, phase: 'preview' } })
  expect(preview.value.value.files).toEqual([{ path: 'file.txt', action: 'restore' }])
  const result = await dispatchToHost(restarted, 'resend/rollback', { request: { sessionId: SESSION_ID, carrierSeq, phase: 'execute', planId: preview.value.value.planId } })
  expect(result.value).toEqual(preview.value)
  expect(await readFile(path.join(w.cwd, 'file.txt'), 'utf8')).toBe('before restart 中文')
  expect(JSON.stringify(preview)).not.toContain('before restart')
  expect(restarted.ctx.typert.local.list().map((d) => d.method)).toEqual(['apply', 'rollback'])
  const forged = await dispatchToHost(restarted, 'resend/rollback', { request: { sessionId: SESSION_ID, carrierSeq, phase: 'preview', recordId: 'secret' } })
  expect(forged.ok).toBe(false)
})

it('does not record a refused rewind', async () => {
  const w = await workspace()
  await w.write('file.txt', 'agent')
  w.state.session = withRefusingAppend(w.session, { onType: 'user/message' })
  const failed = await dispatchToHost(w.host, 'resend/apply', { request: { sessionId: SESSION_ID, targetSeq: 2, op: 'edit', text: 'edited' } })
  expect(failed.value.ok).toBe(false)
  expect(await readdir(path.join(w.home, 'data', 'plugins', 'dsh-resend', 'records')).catch((error) => { if (error.code === 'ENOENT') return []; throw error })).toEqual([])
})

it('does not include previously shadowed tool writes in a later rewind', async () => {
  const w = await workspace()
  await w.write('previous.txt', 'first turn')
  await w.rewind()
  const prompt = appendUser(w.session, { id: 'fresh', text: 'fresh prompt' })
  await w.write('current.txt', 'current turn')
  const result = await dispatchToHost(w.host, 'resend/apply', { request: { sessionId: SESSION_ID, targetSeq: prompt.seq, op: 'edit', text: 'again' } })
  expect(result.value.ok, JSON.stringify(result)).toBe(true)
  const preview = await w.call({ carrierSeq: result.value.value.carrierSeq, phase: 'preview' })
  expect(preview.value.files).toEqual([{ path: 'current.txt', action: 'restore' }])
})

it('combines absolute and relative spellings of the same file into one restore', async () => {
  const w = await workspace()
  await writeFile(path.join(w.cwd, 'alias.txt'), 'original')
  await w.write('alias.txt', 'first')
  await w.write(path.join(w.cwd, 'alias.txt'), 'second')
  const carrierSeq = await w.rewind()
  const preview = await w.call({ carrierSeq, phase: 'preview' })
  expect(preview.value.files).toEqual([{ path: 'alias.txt', action: 'restore' }])
  expect(await w.call({ carrierSeq, phase: 'execute', planId: preview.value.planId })).toEqual(preview)
  expect(await readFile(path.join(w.cwd, 'alias.txt'), 'utf8')).toBe('original')
})

it('includes first-party child tool writes whose root result is in the undone span', async () => {
  const w = await workspace()
  const root = w.session.append('tool/call', { turn: 2, step: 1, callId: 'root', name: 'run_code', arguments: JSON.stringify({ code: 'await tools.write(...)' }) })
  const args = { file_path: 'child.txt', content: 'child output' }
  const exec = { name: 'write', callId: 'child', rootCallId: 'root', parent: Symbol('parent'), arguments: args, agent: { session: w.session } }
  await w.host.ctx.waterfall('tools/execute', exec, async () => {
    await writeFile(path.join(w.cwd, 'child.txt'), 'child output')
    return { isError: false, value: { before: null, after: 'child output' } }
  })
  w.session.append('tool/ptc-dispatch', { rootCallId: 'root', parentCallId: 'root', subCallId: 'child', name: 'write', arguments: args, isError: false, content: [{ type: 'text', text: 'done' }] })
  w.session.append('tool/result', { turn: 2, step: 1, message: { role: 'tool', id: 'root-result', callId: 'root', content: [{ type: 'text', text: 'done' }], isError: false } }, { surfaceOp: 'append', sourceEventSeqs: [root.seq] })
  const carrierSeq = await w.rewind()
  const preview = await w.call({ carrierSeq, phase: 'preview' })
  expect(preview.value.files).toEqual([{ path: 'child.txt', action: 'restore' }])
  expect(await w.call({ carrierSeq, phase: 'execute', planId: preview.value.planId })).toEqual(preview)
  await expect(readFile(path.join(w.cwd, 'child.txt'))).rejects.toMatchObject({ code: 'ENOENT' })
})

it('checks the legacy editor output against its declared change instead of recording later user edits', async () => {
  const w = await workspace()
  await writeFile(path.join(w.cwd, 'file.txt'), 'old text')
  const args = { command: 'str_replace', path: path.join(w.cwd, 'file.txt'), old_str: 'old', new_str: 'new' }
  const call = w.session.append('tool/call', { turn: 2, step: 1, callId: 'editor', name: 'str_replace_editor', arguments: JSON.stringify(args) })
  await w.host.ctx.waterfall('tools/execute', { name: 'str_replace_editor', callId: 'editor', arguments: args, agent: { session: w.session } }, async () => {
    await writeFile(path.join(w.cwd, 'file.txt'), 'new text')
    await writeFile(path.join(w.cwd, 'file.txt'), 'user edit after tool write')
    return { isError: false, value: 'The file has been edited successfully.' }
  })
  w.session.append('tool/result', { turn: 2, step: 1, message: { role: 'tool', id: 'editor-result', callId: 'editor', content: [{ type: 'text', text: 'edited' }], isError: false } }, { surfaceOp: 'append', sourceEventSeqs: [call.seq] })
  const carrierSeq = await w.rewind()
  const preview = await w.call({ carrierSeq, phase: 'preview' })
  expect(preview.value.files).toEqual([{ path: 'file.txt', action: 'refuse', reason: 'content-diverged' }])
  expect(await readFile(path.join(w.cwd, 'file.txt'), 'utf8')).toBe('user edit after tool write')
})

it('refuses external changes during a failed tool call and preserves them', async () => {
  const w = await workspace()
  await writeFile(path.join(w.cwd, 'file.txt'), 'initial')
  const args = { file_path: 'file.txt', content: 'agent' }
  const call = w.session.append('tool/call', { turn: 2, step: 1, callId: 'failed', name: 'write', arguments: JSON.stringify(args) })
  await w.host.ctx.waterfall('tools/execute', { name: 'write', callId: 'failed', arguments: args, agent: { session: w.session } }, async () => {
    await writeFile(path.join(w.cwd, 'file.txt'), 'user edit during failed call')
    return { isError: true, content: [{ type: 'text', text: 'Error: write refused' }] }
  })
  w.session.append('tool/result', { turn: 2, step: 1, message: { role: 'tool', id: 'failed-result', callId: 'failed', content: [{ type: 'text', text: 'Error: write refused' }], isError: true } }, { surfaceOp: 'append', sourceEventSeqs: [call.seq] })
  const carrierSeq = await w.rewind()
  const preview = await w.call({ carrierSeq, phase: 'preview' })
  expect(preview.value.files).toEqual([{ path: 'file.txt', action: 'refuse', reason: 'write-outcome-unavailable' }])
  expect(await w.call({ carrierSeq, phase: 'execute', planId: preview.value.planId })).toEqual(preview)
  expect(await readFile(path.join(w.cwd, 'file.txt'), 'utf8')).toBe('user edit during failed call')
})

it.each([
  { name: 'CRLF multi-line match', original: '原有\r\n中文\r\n', old: '原有\r\n中文', replacement: '新文本', after: '新文本\r\n' },
  { name: 'literal dollar replacement', original: 'old text', old: 'old', replacement: '$&', after: '$& text' },
  { name: 'non-overlapping match', original: 'aaa', old: 'aa', replacement: 'b', after: 'ba' },
])('restores legal legacy editor changes: $name', async ({ original, old, replacement, after }) => {
  const w = await workspace()
  await writeFile(path.join(w.cwd, 'file.txt'), original)
  const args = { command: 'str_replace', path: path.join(w.cwd, 'file.txt'), old_str: old, new_str: replacement }
  const call = w.session.append('tool/call', { turn: 2, step: 1, callId: 'editor-crlf', name: 'str_replace_editor', arguments: JSON.stringify(args) })
  await w.host.ctx.waterfall('tools/execute', { name: 'str_replace_editor', callId: 'editor-crlf', arguments: args, agent: { session: w.session } }, async () => {
    await writeFile(path.join(w.cwd, 'file.txt'), after)
    return { isError: false, value: 'The file has been edited successfully.' }
  })
  w.session.append('tool/result', { turn: 2, step: 1, message: { role: 'tool', id: 'editor-crlf-result', callId: 'editor-crlf', content: [{ type: 'text', text: 'edited' }], isError: false } }, { surfaceOp: 'append', sourceEventSeqs: [call.seq] })
  const carrierSeq = await w.rewind()
  const preview = await w.call({ carrierSeq, phase: 'preview' })
  expect(preview.value.files).toEqual([{ path: 'file.txt', action: 'restore' }])
  expect(await w.call({ carrierSeq, phase: 'execute', planId: preview.value.planId })).toEqual(preview)
  expect(await readFile(path.join(w.cwd, 'file.txt'), 'utf8')).toBe(original)
})

it('records the pre-tool bytes and previews then restores only the files written in the undone span', async () => {
  const w = await workspace()
  const original = Buffer.from('\ufeff原有中文\r\n未提交内容\r\n')
  await writeFile(path.join(w.cwd, '中文.txt'), original)
  await writeFile(path.join(w.cwd, 'untouched.txt'), 'leave me')
  await w.write('中文.txt', 'first edit\n')
  await w.write('中文.txt', '\ufeffsecond edit\r\n')
  await w.write('created.txt', 'new file')
  const carrierSeq = await w.rewind()
  const preview = await w.call({ carrierSeq, phase: 'preview' })
  expect(preview.ok, JSON.stringify(preview)).toBe(true)
  expect(preview.value.files).toEqual([
    { path: '中文.txt', action: 'restore' },
    { path: 'created.txt', action: 'restore' },
  ])
  expect(await readFile(path.join(w.cwd, '中文.txt'), 'utf8')).toBe('\ufeffsecond edit\r\n')
  const executed = await w.call({ carrierSeq, phase: 'execute', planId: preview.value.planId })
  expect(executed).toEqual(preview)
  expect(await readFile(path.join(w.cwd, '中文.txt'))).toEqual(original)
  await expect(readFile(path.join(w.cwd, 'created.txt'))).rejects.toMatchObject({ code: 'ENOENT' })
  expect(await readFile(path.join(w.cwd, 'untouched.txt'), 'utf8')).toBe('leave me')
  const recordDir = path.join(w.home, 'data', 'plugins', 'dsh-resend', 'records')
  expect(await readdir(recordDir)).toHaveLength(1)
})
