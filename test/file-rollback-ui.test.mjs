import { expect, it } from 'vitest'
import { createElement } from 'react'
import { clientHalf } from '../scripts/client-bundle.mjs'
import { renderDom } from './helpers/render.mjs'

it('shows every planned file and refusal before executing the same plan; cancel writes nothing', async () => {
  const { FileRollbackPreview, createResendOperations } = clientHalf().exports
  const calls = []
  const preview = { ok: true, value: { planId: 'opaque-plan', files: [
    { path: 'safe.txt', action: 'restore' },
    { path: 'user.txt', action: 'refuse', reason: 'content-diverged' },
  ] } }
  const operations = createResendOperations({ resend: { rollback: async (request) => { calls.push(request); return preview } } })
  const dom = await renderDom(createElement(FileRollbackPreview, { operations, point: { sessionId: 's', carrierSeq: 5 }, t: (key) => key }))
  try {
    const button = (key) => [...dom.container.querySelectorAll('button')].find((node) => node.textContent === key)
    await dom.click(button('files.preview'))
    expect(dom.container.textContent).toContain('safe.txt')
    expect(dom.container.textContent).toContain('user.txt')
    expect(dom.container.textContent).toContain('files.reason.content-diverged')
    expect(calls.map((call) => call.phase)).toEqual(['preview'])
    await dom.click(button('files.cancel'))
    expect(calls.map((call) => call.phase)).toEqual(['preview', 'cancel'])
    await dom.click(button('files.preview'))
    await dom.click(button('files.execute'))
    expect(calls.at(-1)).toEqual({ sessionId: 's', carrierSeq: 5, scope: 'artifacts', phase: 'execute', planId: 'opaque-plan' })
    expect(dom.container.textContent).toContain('files.completed')
    expect(dom.container.textContent).toContain('user.txt')
  } finally { await dom.cleanup() }
})

it('offers three independent scopes and requires a fresh preview after switching scope', async () => {
  const { FileRollbackPreview, createResendOperations } = clientHalf().exports
  const calls = []
  const operations = createResendOperations({ resend: { rollback: async (request) => {
    calls.push(request)
    return { ok: true, value: { planId: 'plan', scope: request.scope, files: [], conversation: { action: 'rewind', count: 3 } } }
  } } })
  const dom = await renderDom(createElement(FileRollbackPreview, { operations, point: { sessionId: 's', carrierSeq: 5 }, t: (key) => key }))
  try {
    const button = (key) => [...dom.container.querySelectorAll('button')].find((node) => node.textContent === key)
    expect([...dom.container.querySelectorAll('input[type=radio]')].map((node) => node.value)).toEqual(['conversation', 'artifacts', 'both'])
    await dom.click(dom.container.querySelector('input[value=conversation]'))
    expect(button('rollback.execute')).toBeUndefined()
    await dom.click(button('files.preview'))
    expect(calls.at(-1).scope).toBe('conversation')
    expect(dom.container.textContent).toContain('rollback.conversation.rewind')
    expect(button('rollback.execute').disabled).toBe(false)
    await dom.click(dom.container.querySelector('input[value=both]'))
    expect(button('rollback.execute')).toBeUndefined()
    await dom.click(button('files.preview'))
    await dom.click(button('rollback.execute'))
    expect(calls.at(-1)).toMatchObject({ phase: 'execute', scope: 'both', planId: 'plan' })
  } finally { await dom.cleanup() }
})

it.each([true, false])('keeps the final refusal report at the replacement point (success=%s)', async (ok) => {
  const { FileRollbackPreview, createResendOperations } = clientHalf().exports
  const files = [{ path: 'user.txt', action: 'refuse', reason: 'content-diverged' }]
  const conversation = { action: 'rewound', count: 2, carrierSeq: 9, shadowedSeqs: [5, 6, 7] }
  const completed = ok ? { ok: true, value: { planId: 'plan', scope: 'both', files, conversation } }
    : { ok: false, error: { code: 'execution-stopped', files, conversation } }
  const operations = createResendOperations({ resend: { rollback: async (request) => request.phase === 'preview'
    ? { ok: true, value: { planId: 'plan', scope: 'both', files, conversation: { action: 'rewind', count: 2 } } }
    : completed } })
  const props = { operations, t: (key) => key }
  const dom = await renderDom(createElement(FileRollbackPreview, { ...props, key: 5, point: { sessionId: 's', carrierSeq: 5 } }))
  try {
    await dom.click(dom.container.querySelector('input[value=both]'))
    await dom.click([...dom.container.querySelectorAll('button')].find((node) => node.textContent === 'files.preview'))
    await dom.click([...dom.container.querySelectorAll('button')].find((node) => node.textContent === 'rollback.execute'))
    await dom.render(createElement(FileRollbackPreview, { ...props, key: 9, point: { sessionId: 's', carrierSeq: 9 } }))
    expect(dom.container.textContent).toContain('user.txt')
    expect(dom.container.textContent).toContain('files.reason.content-diverged')
    expect(dom.container.textContent).toContain('rollback.conversation.rewound')
    expect(dom.container.textContent).toContain(ok ? 'rollback.completed' : 'files.error.execution-stopped')
  } finally { await dom.cleanup() }
})
