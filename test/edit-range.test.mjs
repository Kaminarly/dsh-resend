import { afterEach, expect, it } from 'vitest'
import { createElement } from 'react'
import { clientHalf } from '../scripts/client-bundle.mjs'
import { clientComposition } from './helpers/client.mjs'
import { renderDom, editorText } from './helpers/render.mjs'
import { memoryConfigForms } from './helpers/preferences.mjs'

const resources = []
afterEach(async () => { for (const close of resources.splice(0).reverse()) await close() })

async function editor({ restrict = true, inline = true } = {}) {
  let eligibility = { assistantSeqs: [1, 3], lastReplySeq: 3, userSeqs: [0, 2], lastUserSeq: 2 }
  let chat = { nodes: new Map([0, 2].map(seq => ['user-' + seq, {
    key: 'user-' + seq, kind: 'user', anchorSeq: seq, data: { seq, text: '原文 ' + seq },
  }])) }
  const c = await clientComposition({ replyState: () => eligibility,
    configForms: memoryConfigForms({ restrictEditToLastUserMessage: restrict, inlineEditorBeneathMessage: inline }) })
  const page = clientHalf().exports
  const fiber = c.ctx.plugin(page)
  await fiber
  resources.push(() => fiber.dispose())
  const registration = c.record.mounts.find(entry => ['user', page.USER_ACTIONS_KIND].includes(entry.options.key))
  const props = { ...registration.options.inject('session-1'), node: chat.nodes.get('user-0'), sessionId: 'session-1',
    t: c.ctx.get('locale').bind('dsh-resend'), useChat: select => select(chat),
    useSession: select => select({ running: false }), useInput: select => select(c.record.input),
    inputActions: { setDraft: text => c.record.draftWrites.push(text) } }
  const element = () => createElement(registration.component, props)
  const dom = await renderDom(element())
  resources.push(() => dom.cleanup())
  return { ...c, ...dom, page, props,
    button: label => dom.container.querySelector('button[aria-label="' + label + '"]'),
    async update(next) {
      eligibility = next
      chat = { nodes: new Map(next.userSeqs.map(seq => ['user-' + seq,
        chat.nodes.get('user-' + seq) ?? { key: 'user-' + seq, kind: 'user', anchorSeq: seq }])) }
      await dom.render(element())
    },
  }
}

it.each([true, false])('disables the earlier edit entry with a focusable range reason (inline=%s)', async inline => {
  const dom = await editor({ inline })
  const button = dom.button(inline ? 'Edit' : 'Edit in the composer')
  expect(button.disabled).toBe(true)
  expect(button.parentElement.getAttribute('aria-label')).toBe('Only the last user message can be edited and resent')
  expect(button.parentElement.tabIndex).toBe(0)
  await dom.click(button)
  await dom.key(button.parentElement, 'Enter')
  expect(dom.calls).toEqual([])
  expect(dom.record.draftWrites).toEqual([])
  expect(dom.container.querySelector('[role="textbox"]')).toBeNull()
})

it('guards old callbacks against current policy and current conversation, including Enter and Composer handoff', async () => {
  const face = clientHalf().exports
  const preferences = face.createPreferences()
  preferences.connect(memoryConfigForms({ restrictEditToLastUserMessage: false }))
  let eligibility = { assistantSeqs: [], userSeqs: [0], lastUserSeq: 0 }
  const calls = [], drafts = []
  const operations = face.createResendOperations({ resend: {
    conversation: async () => ({ ok: true, value: { ok: true, value: eligibility } }),
    replay: async ({ request }) => { calls.push(request); return { ok: true, value: { ok: false, error: { code: 'agent-busy' } } } },
  } })
  const chat = { nodes: new Map([['u', { key: 'u', kind: 'user', anchorSeq: 0 }]]) }
  const props = { sessionId: 's', node: { data: { seq: 0, text: 'original' } }, preferences, operations,
    t: key => key, useChat: select => select(chat), useInput: select => select({ phase: 'plain' }),
    useSession: select => select({ running: false }), inputActions: { setDraft: text => drafts.push(text) }, readInput: () => ({ phase: 'plain' }) }
  let held
  function Capture() { held = face.UserActionsRow(props); return held }
  const dom = await renderDom(createElement(Capture))
  resources.push(() => dom.cleanup())
  const findElement = (element, matches) => {
    if (!element || typeof element !== 'object') return undefined
    if (matches(element)) return element
    for (const child of [].concat(element.props?.children ?? [])) {
      const found = findElement(child, matches)
      if (found) return found
    }
  }
  const oldOpen = findElement(held, element => element.props?.label === 'row.edit').props.onClick
  await dom.act(async () => oldOpen())
  await dom.change(dom.container.querySelector('[role="textbox"]'), 'saved draft')
  const oldEditor = findElement(held, element => typeof element.props?.onSend === 'function').props
  // Update the public authority without re-rendering the stale callbacks.
  await dom.act(async () => { await preferences.set('restrictEditToLastUserMessage', true) })
  const revision = JSON.stringify([face.hidePlanFor(chat, operations.recordsFor('s')).revision, [], false, null])
  eligibility = { assistantSeqs: [], userSeqs: [0, 2], lastUserSeq: 2 }
  await dom.act(async () => operations.refreshConversation('s', revision, true))
  await dom.act(async () => {
    oldEditor.onSend(); oldEditor.onComposer(); oldEditor.onKeyDown({ key: 'Enter', shiftKey: false, nativeEvent: {}, preventDefault() {} }); oldOpen()
  })
  expect(calls).toEqual([])
  expect(drafts).toEqual([])
  expect(editorText(dom.container.querySelector('[role="textbox"]'))).toBe('saved draft')
})

it('retains editable text across policy changes and newly appended users; restores actions without losing the draft', async () => {
  const dom = await editor({ restrict: false })
  await dom.click(dom.button('Edit'))
  await dom.change(dom.container.querySelector('[role="textbox"]'), '修改的草稿\n保留中文')
  const textarea = dom.container.querySelector('[role="textbox"]')
  await dom.act(async () => { await dom.page.preferences.set('restrictEditToLastUserMessage', true) })
  expect(dom.container.querySelector('[role="textbox"]')).toBe(textarea)
  expect(editorText(textarea)).toBe('修改的草稿\n保留中文')
  expect((textarea.getAttribute('aria-disabled') === 'true')).toBe(false)
  expect(dom.button('Send').disabled).toBe(true)
  expect(dom.button('Edit in the composer').disabled).toBe(true)
  expect(dom.button('Cancel').disabled).toBe(false)
  await dom.key(textarea, 'Enter')
  await dom.click(dom.button('Send'))
  await dom.click(dom.button('Edit in the composer'))
  expect(dom.calls).toEqual([])
  expect(dom.record.draftWrites).toEqual([])
  await dom.change(textarea, '还可以修改和复制')
  await dom.update({ assistantSeqs: [1], lastReplySeq: 1, userSeqs: [0], lastUserSeq: 0 })
  expect(dom.button('Send').disabled).toBe(false)
  await dom.update({ assistantSeqs: [1], lastReplySeq: 1, userSeqs: [0, 4], lastUserSeq: 4 })
  expect(dom.button('Send').disabled).toBe(true)
  expect(editorText(textarea)).toBe('还可以修改和复制')
  await dom.act(async () => { await dom.page.preferences.set('restrictEditToLastUserMessage', false) })
  await dom.key(textarea, 'Enter')
  expect(dom.calls).toEqual([{ sessionId: 'session-1', targetSeq: 0, op: 'edit', text: '还可以修改和复制' }])
})

it('keeps editing available in composer-only Profiles without overwriting an ordinary draft', async () => {
  const dom = await editor({ restrict: false, inline: false })
  expect(dom.button('Edit in the composer').disabled).toBe(true)
  await dom.click(dom.button('Edit in the composer'))
  expect(dom.record.draftWrites).toEqual([])
  await dom.click(dom.button('Edit'))
  expect(editorText(dom.container.querySelector('[role="textbox"]'))).toBe('原文 0')
  await dom.change(dom.container.querySelector('[role="textbox"]'), '编辑草稿保留')
  await dom.act(async () => { await dom.page.preferences.set('restrictEditToLastUserMessage', true) })
  expect(dom.record.draftWrites).toEqual([])
  expect(editorText(dom.container.querySelector('[role="textbox"]'))).toBe('编辑草稿保留')
  expect(dom.button('Send').disabled).toBe(true)
  expect(dom.button('Edit in the composer').disabled).toBe(true)
  const copy = dom.container.querySelector('button[aria-label="Copy"]')
  if (copy) expect(copy.disabled).toBe(false)
  expect(dom.calls).toEqual([])
})

it('shows the exact Chinese edit range explanation in both toggle states', async () => {
  const c = await clientComposition()
  const page = clientHalf().exports
  const fiber = c.ctx.plugin(page)
  await fiber
  resources.push(() => fiber.dispose())
  c.ctx.get('locale').active = 'zh'
  const row = c.record.mounts.find(entry => entry.options.id === 'dsh-resend-preferences')
  const dom = await renderDom(createElement(row.component))
  resources.push(() => dom.cleanup())
  const field = () => dom.container.querySelector('[data-field="restrictEditToLastUserMessage"]')
  const explanation = '开启后，仅可编辑重发最后一条用户消息；关闭后，则允许编辑重发较早的用户消息。操作将从所选消息重新续接，并发送修改后的内容，其后的对话将退出当前上下文。'
  expect(field().querySelector('button').getAttribute('aria-checked')).toBe('false')
  expect(field().querySelector('p').textContent).toBe(explanation)
  await dom.click(field().querySelector('button'))
  expect(field().querySelector('p').textContent).toBe(explanation)
  expect(field().querySelector('button').getAttribute('aria-checked')).toBe('true')
})
