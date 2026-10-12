import { afterEach, expect, it } from 'vitest'
import { createElement } from 'react'
import { clientHalf } from '../scripts/client-bundle.mjs'
import { renderDom, editorText } from './helpers/render.mjs'
import { readyPreferences } from './helpers/preferences.mjs'

const resources = []
afterEach(async () => { for (const close of resources.splice(0).reverse()) await close() })

async function editor({ text = '原文 @a/same.md /tdd', lookup, replay, sessionId = 's', seq = 0 } = {}) {
  const face = clientHalf().exports
  const calls = []
  const operations = face.createResendOperations({ fileReferences: lookup && { list: lookup }, resend: {
    conversation: async () => ({ ok: true, value: { ok: true, value: { userSeqs: [seq], lastUserSeq: seq, assistantSeqs: [] } } }),
    replay: async input => { calls.push(input); return { ok: true, value: replay ? await replay(input) : { ok: false, error: { code: 'agent-busy' } } } },
  } })
  const node = { key: 'u', kind: 'user', anchorSeq: seq, data: { seq, text } }
  const props = { node, sessionId, operations, preferences: readyPreferences(face), t: key => key,
    useChat: select => select({ nodes: new Map([['u', node]]) }), useSession: select => select({ running: false }) }
  const dom = await renderDom(createElement(face.UserActionsRow, props))
  resources.push(() => dom.cleanup(), () => operations.dispose())
  const element = () => createElement(face.UserActionsRow, props)
  return { ...dom, calls, face, operations, props, element,
    input: () => dom.container.querySelector('textarea, [role="textbox"]'),
    button: key => dom.container.querySelector(`[aria-label="row.${key}"]`),
  }
}

it('retains the edited draft after Escape and reopening the same message', async () => {
  const dom = await editor()
  await dom.click(dom.button('edit'))
  await dom.change(dom.input(), '本次编辑 @b/same.md /research')
  expect(editorText(dom.input())).toBe('本次编辑 @b/same.md /research')
  expect(dom.operations.draftFor({ sessionId: 's', targetSeq: 0 }, dom.props.node.data.text)?.text).toBe('本次编辑 @b/same.md /research')
  await dom.key(dom.input(), 'Escape')
  expect(dom.operations.draftFor({ sessionId: 's', targetSeq: 0 }, dom.props.node.data.text)?.text).toBe('本次编辑 @b/same.md /research')
  await dom.click(dom.button('edit'))
  expect(editorText(dom.input())).toBe('本次编辑 @b/same.md /research')
})

it('restores complete paths, preserves skill text and never guesses unknown mentions', async () => {
  const text = '阅读 @a/same.md 与 @b/same.md @"资料/中文 说明.md" @"有 空格/" /tdd /missing @unknown 邮箱x@y.com'
  const seen = []
  const dom = await editor({ text, lookup: async (sessionId, query) => {
    seen.push({ sessionId, query })
    return { ok: true, value: query === 'unknown' ? [{ path: 'somewhere/unknown', kind: 'file' }] :
      [{ path: query, kind: query === '有 空格' ? 'directory' : 'file' }] }
  } })
  await dom.click(dom.button('edit'))
  expect(editorText(dom.input())).toBe(text)
  expect([...dom.container.querySelectorAll('[data-path]')].map(node => node.dataset.path))
    .toEqual(['a/same.md', 'b/same.md', '资料/中文 说明.md', '有 空格'])
  expect(seen.every(item => item.sessionId === 's')).toBe(true)
  expect(seen).toContainEqual({ sessionId: 's', query: '有 空格' })
  expect(seen.some(item => item.query.endsWith('/'))).toBe(false)
  await dom.click(dom.container.querySelector('[data-path="a/same.md"] button'))
  await dom.key(dom.input(), 'Enter')
  expect(dom.calls[0]).toEqual({ phase: 'start', request: { sessionId: 's', targetSeq: 0, op: 'edit', text: text.replace('@a/same.md', '') } })
  expect(editorText(dom.input())).toBe(text.replace('@a/same.md', ''))
})

it('late reference lookup cannot overwrite an edited draft or attach to a closed editor', async () => {
  const replies = []
  const dom = await editor({ lookup: (_sessionId, _query, signal) => new Promise(resolve => replies.push({ resolve, signal })) })
  await dom.click(dom.button('edit'))
  await dom.change(dom.input(), '已经修改 /tdd')
  await dom.act(async () => replies[0].resolve({ ok: true, value: [{ path: 'a/same.md', kind: 'file' }] }))
  expect(editorText(dom.input())).toBe('已经修改 /tdd')
  expect(dom.container.querySelector('[data-path]')).toBeNull()
  await dom.key(dom.input(), 'Escape')
  expect(replies[0].signal.aborted).toBe(true)
})

it('restores references after CRLF and CR without changing original line endings', async () => {
  const text = '第一行\r\n引用 @a/same.md\r下一行 @b/same.md\n/tdd'
  const dom = await editor({ text, lookup: async (_sessionId, query) => ({ ok: true, value: [{ path: query, kind: 'file' }] }) })
  await dom.click(dom.button('edit'))
  expect(editorText(dom.input())).toBe(text)
  expect(dom.container.querySelectorAll('[data-path]')).toHaveLength(2)
  await dom.key(dom.input(), 'Enter')
  expect(dom.calls[0].request.text).toBe(text)
})

it('switching locale updates all open editor labels without replacing its draft or selection', async () => {
  const dom = await editor({ lookup: async () => ({ ok: true, value: [{ path: 'a/same.md', kind: 'file' }] }) })
  await dom.click(dom.button('edit'))
  const input = dom.input()
  await dom.change(input, '编辑后的文字 @a/same.md /tdd')
  const saved = dom.operations.draftFor({ sessionId: 's', targetSeq: 0 }, dom.props.node.data.text)
  dom.props.t = key => '中文:' + key
  await dom.render(dom.element())
  expect(dom.input()).toBe(input)
  expect(input.getAttribute('aria-label')).toBe('中文:row.editInput')
  expect(dom.container.querySelector('[data-path] button').getAttribute('aria-label')).toBe('中文:row.removeReference a/same.md')
  expect(editorText(input)).toBe(saved.text)
  const after = dom.operations.draftFor({ sessionId: 's', targetSeq: 0 }, dom.props.node.data.text)
  expect(after.state.selection.eq(saved.state.selection)).toBe(true)
})

it('remounting the row restores its independent draft and successful resend clears it', async () => {
  const dom = await editor({ replay: () => ({ ok: true, value: { carrierSeq: 5, shadowedSeqs: [0], resendMessageId: 'accepted' } }) })
  await dom.click(dom.button('edit'))
  await dom.change(dom.input(), '保留的草稿 /tdd')
  await dom.render(null)
  await dom.render(dom.element())
  await dom.click(dom.button('edit'))
  expect(editorText(dom.input())).toBe('保留的草稿 /tdd')
  await dom.key(dom.input(), 'Enter')
  expect(dom.input()).toBeNull()
  expect(dom.operations.draftFor({ sessionId: 's', targetSeq: 0 }, dom.props.node.data.text)).toBeUndefined()
})

it('preflight freezes text and chip removal; cancel restores the current edit', async () => {
  const dom = await editor({ lookup: async () => ({ ok: true, value: [{ path: 'a/same.md', kind: 'file' }] }),
    replay: input => input.phase === 'cancel' ? { ok: true, value: { canceled: true } } :
      { ok: true, value: { preflight: true, preflightId: 'plan', userSeq: 0, op: 'edit', files: [] } } })
  await dom.click(dom.button('edit'))
  const input = dom.input()
  await dom.key(input, 'Enter')
  expect(input.getAttribute('contenteditable')).toBe('false')
  const remove = dom.container.querySelector('[data-path] button')
  expect(remove.disabled).toBe(true)
  await dom.change(input, '预检期间不允许写入')
  await dom.click(remove)
  expect(editorText(input)).toBe('原文 @a/same.md /tdd')
  await dom.act(async () => dom.operations.chooseReplay('s', 'cancel'))
  expect(input.getAttribute('contenteditable')).toBe('true')
  expect(remove.disabled).toBe(false)
  expect(editorText(input)).toBe('原文 @a/same.md /tdd')
})

it('blank and IME confirmation never send; refusal and exception preserve the draft', async () => {
  const dom = await editor({ replay: () => { throw new Error('transport failed') } })
  await dom.click(dom.button('edit'))
  await dom.change(dom.input(), ' \n\t')
  await dom.key(dom.input(), 'Enter')
  expect(dom.calls).toEqual([])
  await dom.change(dom.input(), '输入法正文 /tdd')
  await dom.key(dom.input(), 'Enter', { isComposing: true })
  await dom.key(dom.input(), 'Enter', { keyCode: 229 })
  expect(dom.calls).toEqual([])
  await dom.key(dom.input(), 'Enter')
  expect(editorText(dom.input())).toBe('输入法正文 /tdd')
  expect(dom.input().getAttribute('contenteditable')).toBe('true')
})
