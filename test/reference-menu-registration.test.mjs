import { expect, it } from 'vitest'
import { Service } from '@deepseek-ai/cordis'
import { createElement } from 'react'
import { clientHalf } from '../scripts/client-bundle.mjs'
import { clientComposition } from './helpers/client.mjs'
import { renderDom, editorText } from './helpers/render.mjs'

it.each([
  ['@', '文件查询失败', 'a/same.md', 'remote.fileReferences'],
  ['/', '技能查询失败', '/tdd', 'remote.skills'],
])('the registered temporary input queries %s through the host service scope', async (trigger, failure, candidate, namespace) => {
  const { ctx, record } = await clientComposition()
  const queries = []
  await ctx.plugin(class extends Service {
    constructor(scope) { super(scope, namespace) }
    async list(...args) {
      queries.push(args)
      return { ok: true, value: trigger === '@' ? [{ path: 'a/same.md', kind: 'file' }] : { skills: [{ name: 'tdd' }] } }
    }
  })
  const face = clientHalf().exports
  const fiber = ctx.plugin(face)
  let dom
  try {
    await fiber
    await new Promise(resolve => setTimeout(resolve, 20))
    ctx.locale.active = 'zh'
    const t = ctx.locale.bind('dsh-resend')
    const node = { key: 'u', kind: 'user', anchorSeq: 2, data: { seq: 2, text: '中文原文' } }
    const registration = record.mounts.find(entry => entry.options.key === 'user')
    expect(registration).toBeDefined()
    dom = await renderDom(createElement(registration.component, {
      node, sessionId: 'session-1', t,
      useChat: select => select({ nodes: new Map([['u', node]]) }),
      useSession: select => select({ running: false }), useInput: select => select({ phase: 'plain' }),
    }))
    await dom.click(dom.container.querySelector('[aria-label="' + t('row.edit') + '"]'))
    const input = dom.container.querySelector('[role="textbox"]')
    await dom.change(input, trigger)
    expect(dom.container.querySelector('.dsh-resend-reference-menu').textContent).not.toContain(failure)
    expect([...dom.container.querySelectorAll('[role="option"]')].map(option => option.getAttribute('aria-label'))).toEqual([t(trigger === '@' ? 'row.fileSelect' : 'row.skillSelect') + ' ' + candidate])
    expect(dom.container.querySelector('[aria-label="' + t('row.editInComposer') + '"]')).toBeNull()
    expect(queries).toHaveLength(1)
    expect(queries[0][0]).toEqual(trigger === '@' ? 'session-1' : { sessionId: 'session-1' })
    expect(queries[0].at(-1).aborted).toBe(false)
    await dom.key(input, 'Tab')
    expect(editorText(input)).toBe(trigger === '/' ? '/tdd ' : '@a/same.md ')
  } finally {
    await dom?.cleanup()
    await fiber.dispose()
  }
})
