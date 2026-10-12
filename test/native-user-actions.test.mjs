import { describe, expect, it } from 'vitest'
import { createElement, memo } from 'react'
import { clientHalf } from '../scripts/client-bundle.mjs'
import { clientComposition } from './helpers/client.mjs'
import { renderDom, editorText } from './helpers/render.mjs'
import { readyPreferences } from './helpers/preferences.mjs'
import { resolveHostApp } from '../scripts/host-app.mjs'
import vm from 'node:vm'
import * as React from 'react'
import * as jsxRuntime from 'react/jsx-runtime'

const face = clientHalf().exports
const user = { key: 'user-2', kind: 'user', anchorSeq: 2,
  data: { seq: 2, time: 123, content: [{ type: 'text', text: '中文原文\n第二行' }, { type: 'file', attachment: { name: '说明.md' } }], referenceLabels: ['src/a.js'], skillNames: ['grilling'] } }
const snapshot = { nodes: new Map([[user.key, user]]) }
const props = { node: user, sessionId: 's', t: (key) => key, useChat: (select) => select(snapshot), useInput: (select) => select({ phase: 'plain' }),
  useSession: (select) => select({ running: false }), inputActions: { setDraft() {} }, readInput: () => ({ phase: 'plain' }) }

function Bubble({ content, actions, renderMessageImages, references, referenceLabels, skillNames }) {
  return createElement('div', { 'data-original-bubble': true }, content[0].text,
    createElement('span', null, content[1].attachment.name, referenceLabels, skillNames),
    createElement('button', { 'aria-label': '引用', onClick: () => references.openFile('src/a.js') }),
    renderMessageImages({ images: ['fixture-image'] }), actions(content[0].text))
}
function Actions({ extraActions, text, time, t }) {
  return createElement('div', { 'data-original-actions': true, 'data-time': time },
    createElement('button', { 'aria-label': t('copy'), 'data-copy-text': text }), extraActions)
}
const original = memo(({ node, t, renderMessageImages, openFile, openSkill }) => createElement(Bubble, {
  ...node.data, t, renderMessageImages, references: { openFile, openSkill },
  actions: (text) => createElement(Actions, { text, time: node.data.time, t }),
}))

async function mounted(Original = original) {
  const seen = []
  const remote = { resend: { conversation: async () => ({ ok: true, value: { ok: true, value: { userSeqs: [2], lastUserSeq: 2, assistantSeqs: [] } } }) } }
  const Surface = face.userMessageSurface(Original, face.createResendOperations(remote), readyPreferences(face), (key) => '宿主:' + key)
  const fallback = (hostProps) => createElement(Original, { ...hostProps, t: (key) => '宿主:' + key })
  const dom = await renderDom(createElement(face.withPanelBoundary(Surface, 'panel.error.userActions', undefined, fallback), {
    ...props, renderMessageImages: () => createElement('span', { 'data-image': true }, '图片'), openFile: (path) => seen.push(path), openSkill() {},
  }))
  return { ...dom, seen }
}

describe('user actions stay in the original host message', () => {
  it('retains the host bubble, attachments, references, copy text and clock; edit is its next action', async () => {
    const dom = await mounted()
    try {
      const actions = dom.container.querySelector('[data-original-actions]')
      const buttons = [...actions.querySelectorAll('button')]
      expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual(['宿主:copy', 'row.edit'])
      expect(buttons[1].textContent).toBe('')
      expect(buttons[0].getAttribute('data-copy-text')).toBe('中文原文\n第二行')
      expect(actions.getAttribute('data-time')).toBe('123')
      expect(dom.container.textContent).toContain('说明.mdsrc/a.jsgrilling图片')
      await dom.click(dom.container.querySelector('[aria-label="引用"]'))
      expect(dom.seen).toEqual(['src/a.js'])
      await dom.click(buttons[1])
      expect(editorText(dom.container.querySelector('[role="textbox"]'))).toBe('中文原文\n第二行')
      expect(dom.container.querySelectorAll('[data-original-bubble]')).toHaveLength(1)
      expect(dom.container.querySelectorAll('.dsh-resend-editor-surface button')).toHaveLength(3)
      expect(dom.container.querySelectorAll('.dsh-resend-editor-actions button')).toHaveLength(2)
    } finally { await dom.cleanup() }
  })

  it('keeps the original bubble and reports incompatible host output', async () => {
    const dom = await mounted(memo(() => createElement('div', { 'data-original-bubble': true }, '保留原消息')))
    try {
      expect(dom.container.textContent).toContain('保留原消息')
      expect(dom.container.querySelector('[role=alert]').textContent).toBe('row.hostIncompatible')
      expect(dom.container.querySelector('[aria-label="row.edit"]')).toBeNull()
    } finally { await dom.cleanup() }
  })

  it('retains the original message when the host action callback becomes incompatible', async () => {
    const dom = await mounted(memo(({ node, renderMessageImages, openFile }) => createElement(Bubble, {
      ...node.data, renderMessageImages, references: { openFile }, actions: () => null,
    })))
    try {
      expect(dom.container.querySelectorAll('[data-original-bubble]')).toHaveLength(1)
      expect(dom.container.textContent).toContain('中文原文\n第二行')
      expect(dom.container.textContent).toContain('说明.md')
      expect(dom.container.querySelector('[role=alert]')).not.toBeNull()
      expect(dom.container.querySelector('[aria-label="row.edit"]')).toBeNull()
    } finally { await dom.cleanup() }
  })

  it('reconciles a late host renderer and removes its decorator when that renderer leaves', async () => {
    const composition = await clientComposition()
    composition.record.replaceHostUser(undefined)
    const fiber = composition.ctx.plugin(clientHalf().exports)
    await fiber
    await new Promise((resolve) => setTimeout(resolve, 20))
    const seat = () => composition.record.mounts.filter((entry) => entry.options.key === 'user')
    expect(seat()).toHaveLength(0)
    composition.record.replaceHostUser({ component: original, locale: 'chat', options: { key: 'user', priority: 0 } })
    expect(seat()).toHaveLength(1)
    expect(seat()[0].options.priority).toBe(-1)
    composition.record.replaceHostUser(undefined)
    expect(seat()).toHaveLength(0)
    await fiber.dispose()
    composition.record.replaceHostUser({ component: original, locale: 'chat', options: { key: 'user' } })
    expect(seat()).toHaveLength(0)
  })
})

const app = resolveHostApp()
it.skipIf(!app)('the installed host renderer preserves the actions callback and consumes extraActions after copy', async () => {
  const source = app.read('node_modules/@deepseek-ai/dsh-client-ui-chat/lib/client.js')
  const start = source.indexOf('const UserMessageNodeView =')
  const end = source.indexOf('/** Injected-context keyed Chat renderer.', start)
  expect(start).toBeGreaterThan(0)
  expect(end).toBeGreaterThan(start)
  const Original = vm.runInNewContext(source.slice(start, end) + '\nUserMessageNodeView', {
    react: React, react_jsx_runtime: jsxRuntime, UserStyleBubble: Bubble, MessageIconActions: Actions,
    MessageItem_module_css_default: { actions: 'host-actions' },
  })
  const dom = await mounted(Original)
  try {
    const buttons = dom.container.querySelector('[data-original-actions]').querySelectorAll('button')
    expect(buttons[1].getAttribute('aria-label')).toBe('row.edit')
    expect(dom.container.querySelector('[data-original-bubble]')).not.toBeNull()
    const actionsSource = source.slice(source.indexOf('function MessageIconActions('), source.indexOf('function contentParts('))
    expect(actionsSource).toContain('extraActions, usageAction')
    expect(actionsSource.lastIndexOf('extraActions,')).toBeGreaterThan(actionsSource.indexOf('IconCopyOutlineRegular'))
  } finally { await dom.cleanup(); app.close?.() }
})
