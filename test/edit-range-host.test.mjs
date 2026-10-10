import { afterEach, expect, it } from 'vitest'
import { createVolatile, updateVolatile } from '@deepseek-ai/cosmokit'
import { dispatchToHost, hostComposition } from './helpers/gateway.mjs'
import { appendUser, auditCount, hostState, logOf, sessionFixture, middleRewoundFixture } from './helpers/host.mjs'

const hosts = []
afterEach(async () => { for (const h of hosts.splice(0)) await h.ctx.fiber.dispose() })
async function host(options = {}) { const h = await hostComposition(options); hosts.push(h); return h }
const edit = (h, targetSeq, text = '修改后的准确文字\n下一行') => dispatchToHost(h, 'resend/apply', { request: { sessionId: 'session-1', targetSeq, op: 'edit', text } })
const restrict = h => updateVolatile(h.fiber.config.restrictEditToLastUserMessage, createVolatile(true))

it('replays earlier edited text, removes the later effective context, and preserves the original log', async () => {
  const session = sessionFixture()
  const original = logOf(session)
  const h = await host({ host: hostState({ session, agent: 'delivering' }), config: { restrictEditToLastUserMessage: false } })
  const result = await edit(h, 0)
  expect(result.value).toMatchObject({ ok: true, value: { shadowedSeqs: [0, 1, 2, 3] } })
  expect(h.host.calls.followupInputs[0].content).toEqual([{ type: 'text', text: '修改后的准确文字\n下一行' }])
  expect(session.surface.nodes).toEqual([5, 6])
  expect(logOf(session).slice(0, 4)).toEqual(original)
  expect(auditCount(session)).toBe(1)
})

it('counts the latest image-only send and excludes host injection and Carrier from the effective user order', async () => {
  const session = sessionFixture()
  const image = session.append('user/message', { role: 'user', id: 'image', content: [], source: { kind: 'user' } }, { surfaceOp: 'append' })
  appendUser(session, { id: 'injection', text: 'host context', source: 'host' })
  const h = await host({ host: hostState({ session }) })
  const eligibility = await h.ctx.resend.conversation({ sessionId: 'session-1' })
  expect(eligibility.value).toMatchObject({ userSeqs: [0, 2, 4], lastUserSeq: 4 })
  expect((await edit(h, 2)).value).toEqual({ ok: false, error: { code: 'not-last-user-message' } })
  expect((await edit(h, image.seq + 1)).value).toEqual({ ok: false, error: { code: 'not-user-message' } })
  expect(auditCount(session)).toBe(0)
  expect(h.host.calls.followups).toBe(0)
  const { session: descended, carrierSeq } = middleRewoundFixture()
  const other = await host({ host: hostState({ session: descended }) })
  expect((await other.ctx.resend.conversation({ sessionId: 'session-1' })).value).toMatchObject({ userSeqs: [0, 4], lastUserSeq: 4 })
  expect((await edit(other, carrierSeq)).value).toEqual({ ok: false, error: { code: 'not-user-message' } })
})

it.each(['rule', 'target'])('rechecks %s immediately before writing, with no partial rewind', async change => {
  const h = await host({ config: { restrictEditToLastUserMessage: false } })
  const query = h.ctx.get('sessionQuery')
  const read = query.readSession.bind(query)
  let reads = 0
  query.readSession = async (...args) => {
    if (++reads === 3) {
      restrict(h)
      if (change === 'target') appendUser(h.host.session, { id: 'latest', text: 'new question' })
    }
    return read(...args)
  }
  const result = await edit(h, change === 'rule' ? 0 : 2)
  expect(result.value).toEqual({ ok: false, error: { code: 'not-last-user-message' } })
  expect(auditCount(h.host.session)).toBe(0)
  expect(h.host.calls.flushes).toBe(0)
  expect(h.host.calls.followups).toBe(0)
})

it('preserves the original owed prompt after restricting, but cannot disguise another shadowed question as a retry', async () => {
  const h = await host({ host: hostState({ agent: 'deaf' }), config: { restrictEditToLastUserMessage: false } })
  expect((await edit(h, 0)).value.ok).toBe(true)
  restrict(h)
  expect((await edit(h, 2, 'a different question')).value).toEqual({ ok: false, error: { code: 'target-shadowed' } })
  appendUser(h.host.session, { id: 'newer-after-failure', text: 'a newer real user message' })
  expect((await edit(h, 0, 'different text at the original target')).value).toEqual({ ok: false, error: { code: 'target-shadowed' } })
  expect(h.host.calls.followups).toBe(1)
  h.host.agent.followup = input => { h.host.calls.followups++; h.host.calls.followupInputs.push(input); h.host.agent.status = 'running' }
  expect((await edit(h, 0)).value.ok).toBe(true)
  expect(auditCount(h.host.session)).toBe(1)
  expect(h.host.calls.followups).toBe(2)
  expect(h.host.calls.followupInputs.at(-1).content).toEqual([{ type: 'text', text: '修改后的准确文字\n下一行' }])
})

it.each(['rule', 'target'])('checks %s again after waiting for the session lock', async change => {
  const state = hostState({ agent: 'deaf' })
  appendUser(state.session, { id: 'tail', text: 'latest question' })
  const h = await host({ host: state, config: { restrictEditToLastUserMessage: change === 'target' } })
  const sessions = h.ctx.get('sessions')
  const flush = sessions.flush.bind(sessions)
  let release, started
  const waiting = new Promise(resolve => { started = resolve })
  sessions.flush = async (...args) => { started(); await new Promise(resolve => { release = resolve }); return flush(...args) }
  const first = h.ctx.resend.apply({ sessionId: 'session-1', targetSeq: 4, op: 'edit', text: 'latest changed' })
  await Promise.race([waiting, first.then(result => { throw new Error('first operation finished before flushing: ' + JSON.stringify(result)) })])
  const queued = h.ctx.resend.apply({ sessionId: 'session-1', targetSeq: change === 'rule' ? 0 : 2, op: 'edit', text: 'queued changed' })
  if (change === 'rule') restrict(h)
  else appendUser(state.session, { id: 'new-tail', text: 'new user message' })
  release()
  expect((await first).ok).toBe(true)
  expect(await queued).toEqual({ ok: false, error: { code: 'not-last-user-message' } })
  expect(auditCount(state.session)).toBe(1)
  expect(state.calls.followups).toBe(1)
})
