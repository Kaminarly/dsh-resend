import { describe, expect, it, vi } from 'vitest'
import { clientHalf } from '../scripts/client-bundle.mjs'
import { clientComposition, dispatchToHost, hostComposition } from './helpers/gateway.mjs'
import { clientComposition as mountClientServices } from './helpers/client.mjs'
import { createElement } from 'react'
import { renderDom, editorText } from './helpers/render.mjs'

describe('message operations consume the real Gateway answer', () => {
  // Root-context calls bypass Cordis injection checks. Drive the registered
  // surfaces instead, so an undeclared remote.resend fails exactly like Desktop.
  it.each(['edit', 'regenerate'])('%s through the registered UI reaches the host without a client error', async (op) => {
    const host = await hostComposition()
    const calls = []
    const answers = []
    const client = await clientComposition(async (endpoint, payload, signal) => {
      const answer = await dispatchToHost(host, endpoint, payload.args, signal)
      if (endpoint === 'resend/replay') answers.push(answer)
      return answer
    }, (endpoint) => calls.push(endpoint))
    const { record } = await mountClientServices({ ctx: client })
    const face = clientHalf().exports
    const fiber = client.plugin(face)
    let dom
    try {
      await fiber
      await new Promise((resolve) => setTimeout(resolve, 20))
      client.locale.active = 'zh'
      const t = client.locale.bind('dsh-resend')
      const user = { key: 'user-2', kind: 'user', anchorSeq: 2, data: { seq: 2, content: [{ type: 'text', text: '中文原文' }] } }
      const companion = { key: 'companion-3', kind: 'dsh-resend-regenerate', anchorSeq: 3, visibility: 'hidden', data: {
        seq: 3, id: 'a2', prevSeq: null, prompt: { seq: 2, isAppend: true, sourceKind: 'user', hasText: true },
      } }
      const chat = { nodes: new Map([[user.key, user], [companion.key, companion]]) }
      const registration = record.mounts.find((entry) => op === 'edit' ? entry.options.key === 'user' : entry.options.id === 'dsh-resend-regenerate')
      expect(registration).toBeDefined()
      dom = await renderDom(createElement(registration.component, {
        node: user, messageId: 'a2', sessionId: 'session-1', t,
        useChat: (select) => select(chat), useSession: (select) => select({ running: false }), useInput: (select) => select({ phase: 'plain' }),
      }))
      if (op === 'edit') {
        await dom.click(dom.container.querySelector('[aria-label="' + t('row.edit') + '"]'))
        await dom.change(dom.container.querySelector('[role="textbox"]'), '编辑后的中文提示')
        await dom.click(dom.container.querySelector('[aria-label="' + t('row.send') + '"]'))
      } else {
        await dom.click(dom.container.querySelector('[aria-label="' + t('row.regenerate') + '"]'))
      }
      expect(document.body.querySelector('[role="alert"]')?.textContent).toBeUndefined()
      await dom.act(async () => { await vi.waitFor(() => expect(answers).toHaveLength(1), { interval: 5 }) })
      expect(document.body.querySelector('[role="alert"]')?.textContent).toBeUndefined()
      expect(answers).toMatchObject([{ ok: true, value: { ok: true } }])
      if (op === 'edit') expect(dom.container.querySelector('[role="textbox"]') === null).toBe(true)
      expect(calls.filter(endpoint => endpoint === 'resend/replay')).toEqual(['resend/replay'])
      if (op === 'regenerate') expect(calls[0]).toBe('resend/conversation')
      expect(host.host.calls.followups).toBe(1)
      expect(host.host.calls.followupInputs[0].content).toEqual([{ type: 'text', text: op === 'edit' ? '编辑后的中文提示' : 'second prompt' }])
    } finally { await dom?.cleanup(); await fiber.dispose(); await host.fiber.dispose() }
  })

  it.each([
    { op: 'edit', targetSeq: 2, text: '编辑后的中文提示' },
    { op: 'regenerate', targetSeq: 3 },
  ])('$op reaches the host and returns the business result', async (request) => {
    const host = await hostComposition()
    const calls = []
    const client = await clientComposition((endpoint, payload, signal) => dispatchToHost(host, endpoint, payload.args, signal), (endpoint) => calls.push(endpoint))
    const face = clientHalf().exports
    const fiber = client.plugin(face)
    await fiber
    try {
      const operations = face.createResendOperations(client.remote)
      const result = await operations.run({ sessionId: 'session-1', ...request })
      expect(calls).toEqual(['resend/replay'])
      expect(result).toMatchObject({ ok: true, value: { carrierSeq: expect.any(Number), shadowedSeqs: [2, 3], resendMessageId: expect.any(String) } })
      expect(operations.outcomeOf({ sessionId: 'session-1', carrierSeq: result.value.carrierSeq })?.status).toBe('queued')
    } finally { await fiber.dispose(); await host.fiber.dispose() }
  })

  it('returns a business refusal without attempting to record a successful rewind', async () => {
    const host = await hostComposition()
    const client = await clientComposition((endpoint, payload, signal) => dispatchToHost(host, endpoint, payload.args, signal))
    const face = clientHalf().exports
    const fiber = client.plugin(face)
    await fiber
    try {
      const operations = face.createResendOperations(client.remote)
      expect(await operations.run({ sessionId: 'session-1', targetSeq: 4, op: 'edit', text: '中文' })).toEqual({ ok: false, error: { code: 'message-pending' } })
      expect(operations.recordsFor('session-1')).toHaveLength(0)
      const rollback = await operations.rollback({ sessionId: 'session-1', carrierSeq: 5, phase: 'preview', scope: 'artifacts' })
      expect(rollback.ok).toBe(false)
      expect(typeof rollback.error.code).toBe('string')
    } finally { await fiber.dispose(); await host.fiber.dispose() }
  })

  it('retains transport failures as failures and never records them', async () => {
    const client = await clientComposition(() => ({ ok: false, error: { code: 'gateway/internal', message: 'offline' } }))
    const face = clientHalf().exports
    const fiber = client.plugin(face)
    await fiber
    try {
      const operations = face.createResendOperations(client.remote)
      const result = await operations.run({ sessionId: 'session-1', targetSeq: 2, op: 'edit', text: '中文' })
      expect(result.ok).toBe(false)
      expect(result.error.code).toBe('gateway/internal')
      expect(operations.recordsFor('session-1')).toHaveLength(0)
    } finally { await fiber.dispose() }
  })
})
