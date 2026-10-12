import { afterEach, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { zstdDecompressSync } from 'node:zlib'
import { createHash } from 'node:crypto'
import { tmpdir, homedir } from 'node:os'
import path from 'node:path'
import { Session } from '@deepseek-ai/dsh-session'
import { dispatchToHost, hostComposition } from './helpers/gateway.mjs'
import { hostState, logOf, auditCount } from './helpers/host.mjs'

// Optional local evidence; portable native-format coverage lives in replay-preflight.
// Never mutate the original log or run tools/model requests against the user's cwd.
const evidence = process.env.DSH_RESEND_REPLAY_LOG ?? path.join(homedir(), '.dsh', 'sessions',
  '--D-Code-MJ-Project-dsh-resend-2--', 'session-7c1c57f8-3671-43ca-b92f-5d923b707722', 'session.v4.jsonl.zstd')
const cleanups = []
afterEach(async () => { for (const cleanup of cleanups.splice(0).reverse()) await cleanup() })
const sha = bytes => createHash('sha256').update(bytes).digest('hex')

it.skipIf(!existsSync(evidence)).each(['edit', 'regenerate'])('original session: %s lists EXAMPLE.md before any rewind or prompt', async op => {
  const bytes = await readFile(evidence)
  const chunks = []
  for (let offset = 0; offset < bytes.length;) {
    const frame = zstdDecompressSync(bytes.subarray(offset), { info: true })
    expect(frame.engine.bytesWritten).toBeGreaterThan(0)
    chunks.push(frame.buffer)
    offset += frame.engine.bytesWritten
  }
  const rows = Buffer.concat(chunks).toString('utf8').trim().split('\n').map(line => JSON.parse(line))
  const home = await mkdtemp(path.join(tmpdir(), 'resend-real-replay-'))
  cleanups.push(() => rm(home, { recursive: true, force: true }))
  const cwd = path.join(home, 'workspace')
  await mkdir(cwd)
  const originalFile = '# dsh-resend\n\nVersion: 0.1.0\n\nUpstream (DSH Desktop): 2.0.17\n\nDescription: 插件作用\n'
  await writeFile(path.join(cwd, 'EXAMPLE.md'), originalFile)
  const events = rows.filter(row => Number.isSafeInteger(row.seq) && row.seq < 107)
  expect(events).toHaveLength(107)
  const sessionId = 'isolated-original-replay'
  const session = Session.create(sessionId, events, { version: 4, id: sessionId, createdAt: 0, isSeeded: false, cwd })
  const state = hostState({ session, agent: 'accepting' })
  const host = await hostComposition({ host: state, dataHome: path.join(home, 'data'),
    config: { restrictEditToLastUserMessage: false, restrictRegenerateToLastReply: false } })
  cleanups.push(() => host.ctx.fiber.dispose())
  const original = logOf(session)
  const wire = await dispatchToHost(host, 'resend/replay', { request: { phase: 'start', request: {
    sessionId, targetSeq: op === 'regenerate' ? 53 : 37, op,
    ...(op === 'edit' ? { text: '@EXAMPLE.md 追加本插件的版本号，并用一句话描述插件的作用' } : {}),
  } } })
  expect(wire.ok).toBe(true)
  const preview = wire.value
  expect(preview, JSON.stringify(preview)).toMatchObject({ ok: true, value: { preflight: true, userSeq: 37,
    files: [{ path: 'EXAMPLE.md', action: 'refuse', reason: 'prior-state-unavailable' }] } })
  expect(state.calls.followups).toBe(0)
  expect(auditCount(session)).toBe(0)
  expect(logOf(session)).toEqual(original)
  const keep = await dispatchToHost(host, 'resend/replay', { request: { phase: 'keep', sessionId, preflightId: preview.value.preflightId } })
  expect(keep.value.ok).toBe(true)
  expect(state.calls.followups).toBe(1)
  expect(auditCount(session)).toBe(1)
  expect(await readFile(path.join(cwd, 'EXAMPLE.md'), 'utf8')).toBe(originalFile)
  expect(sha(await readFile(evidence))).toBe(sha(bytes))
})
