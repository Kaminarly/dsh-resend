import { afterEach, expect, it, vi } from 'vitest'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Session } from '@deepseek-ai/dsh-session'
import { dispatchToHost, hostComposition } from './helpers/gateway.mjs'
import { hostState, SESSION_ID, sessionFixture } from './helpers/host.mjs'

// A real filesystem adapter with one controlled external writer. The hook runs
// AFTER the first restore settles, reproducing the gap between two writes.
const race = vi.hoisted(() => ({ afterWrite: undefined }))
vi.mock('node:fs/promises', async (original) => {
  const fs = await original()
  return { ...fs, writeFile: async (...args) => {
    await fs.writeFile(...args)
    await race.afterWrite?.(args[0], fs)
  } }
})
afterEach(() => { race.afterWrite = undefined })

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
