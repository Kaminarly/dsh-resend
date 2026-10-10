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
    expect(calls.at(-1)).toEqual({ sessionId: 's', carrierSeq: 5, phase: 'execute', planId: 'opaque-plan' })
    expect(dom.container.textContent).toContain('files.completed')
    expect(dom.container.textContent).toContain('user.txt')
  } finally { await dom.cleanup() }
})
