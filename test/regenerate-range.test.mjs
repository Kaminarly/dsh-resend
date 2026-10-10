import { afterEach, expect, it } from 'vitest'
import { dispatchToHost, hostComposition } from './helpers/gateway.mjs'
import { appendReply, appendUser, auditCount, hostState, logOf, sessionFixture } from './helpers/host.mjs'
import { createVolatile, updateVolatile } from '@deepseek-ai/cosmokit'

const hosts = []
afterEach(async () => { for (const h of hosts.splice(0)) await h.ctx.fiber.dispose() })
async function host(options = {}) { const h = await hostComposition(options); hosts.push(h); return h }
const regenerate = (h, targetSeq) => dispatchToHost(h, 'resend/apply', { request: { sessionId: 'session-1', targetSeq, op: 'regenerate' } })

it('replays the original earlier question and removes subsequent context while retaining the entire log', async () => {
  const session = sessionFixture()
  const original = logOf(session)
  const h = await host({ host: hostState({ session, agent: 'delivering' }), config: { restrictRegenerateToLastReply: false } })
  const result = await regenerate(h, 1)
  expect(result.value).toMatchObject({ ok: true, value: { shadowedSeqs: [0, 1, 2, 3] } })
  expect(h.host.calls.followupInputs[0].content).toEqual([{ type: 'text', text: 'first prompt' }])
  expect(logOf(session).slice(0, 4)).toEqual(original)
  expect(session.surface.nodes).toEqual([5, 6])
  expect(auditCount(session)).toBe(1)
})

it('refuses a newly restricted earlier reply after the covering read awaited, before any rewind or prompt', async () => {
  const h = await host({ config: { restrictRegenerateToLastReply: false } })
  const query = h.ctx.get('sessionQuery')
  const read = query.readSession.bind(query)
  let reads = 0
  query.readSession = async (...args) => {
    const result = await read(...args)
    if (++reads === 2) updateVolatile(h.fiber.config.restrictRegenerateToLastReply, createVolatile(true))
    return result
  }
  const result = await regenerate(h, 1)
  expect(result.value).toEqual({ ok: false, error: { code: 'not-last-reply' } })
  expect(logOf(h.host.session)).toHaveLength(4)
  expect(h.host.calls.flushes).toBe(0)
  expect(h.host.calls.followups).toBe(0)
})

it('provides reply eligibility from the complete effective conversation, independently of the client window', async () => {
  const h = await host()
  appendUser(h.host.session, { id: 'later-user', text: 'a later question' })
  const result = await dispatchToHost(h, 'resend/conversation', { request: { sessionId: 'session-1' } })
  expect(result).toEqual({ ok: true, value: { ok: true, value: { assistantSeqs: [1, 3], lastReplySeq: 3 } } })
  expect(h.host.calls.followups).toBe(0)
  expect(auditCount(h.host.session)).toBe(0)
})

it('cannot use the owed-prompt exception for a different question inside an earlier regenerate range', async () => {
  const h = await host({ host: hostState({ agent: 'deaf' }), config: { restrictRegenerateToLastReply: false } })
  expect((await regenerate(h, 1)).value.ok).toBe(true)
  updateVolatile(h.fiber.config.restrictRegenerateToLastReply, createVolatile(true))
  expect((await regenerate(h, 3)).value).toEqual({ ok: false, error: { code: 'target-shadowed' } })
  expect(h.host.calls.followups).toBe(1)
  expect(auditCount(h.host.session)).toBe(1)
  h.host.agent.followup = input => { h.host.calls.followups++; h.host.calls.followupInputs.push(input); h.host.agent.status = 'running' }
  expect((await regenerate(h, 1)).value.ok).toBe(true)
  expect(h.host.calls.followups).toBe(2)
  expect(auditCount(h.host.session)).toBe(1)
  expect(h.host.calls.followupInputs.at(-1).content).toEqual([{ type: 'text', text: 'first prompt' }])
})

it.each([0, 2])('rejects user target %s with range disabled without writing or sending', async target => {
  const h = await host({ config: { restrictRegenerateToLastReply: false } })
  expect((await regenerate(h, target)).value).toEqual({ ok: false, error: { code: 'not-assistant-message' } })
  expect(logOf(h.host.session)).toHaveLength(4)
  expect(h.host.calls.followups).toBe(0)
})

it('checks a newly appended assistant at the final write boundary', async () => {
  const h = await host()
  const query = h.ctx.get('sessionQuery')
  const read = query.readSession.bind(query)
  let reads = 0
  query.readSession = async (...args) => {
    if (++reads === 3) appendReply(h.host.session, { id: 'newer', text: 'newer reply', turn: 3 })
    return read(...args)
  }
  expect((await regenerate(h, 3)).value).toEqual({ ok: false, error: { code: 'not-last-reply' } })
  expect(auditCount(h.host.session)).toBe(0)
  expect(h.host.calls.followups).toBe(0)
})

it.each(['rule', 'target'])('rechecks %s changes while a direct request waits behind another rewind', async change => {
  const state = hostState({ agent: 'deaf' })
  appendUser(state.session, { id: 'tail-user', text: 'latest question' })
  const h = await host({ host: state, config: { restrictRegenerateToLastReply: false } })
  const sessions = h.ctx.get('sessions')
  const flush = sessions.flush.bind(sessions)
  let release, started
  const waiting = new Promise(resolve => { started = resolve })
  sessions.flush = async (...args) => {
    started()
    await new Promise(resolve => { release = resolve })
    return flush(...args)
  }
  const first = h.ctx.resend.apply({ sessionId: 'session-1', targetSeq: 4, op: 'edit', text: 'changed latest question' })
  await waiting
  const queued = h.ctx.resend.apply({ sessionId: 'session-1', targetSeq: change === 'rule' ? 1 : 3, op: 'regenerate' })
  updateVolatile(h.fiber.config.restrictRegenerateToLastReply, createVolatile(true))
  if (change === 'target') appendReply(state.session, { id: 'new-target', text: 'new assistant reply' })
  release()
  expect((await first).ok).toBe(true)
  expect(await queued).toEqual({ ok: false, error: { code: 'not-last-reply' } })
  expect(auditCount(state.session)).toBe(1)
  expect(state.calls.followups).toBe(1)
})
