import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { clientHalf } from '../scripts/client-bundle.mjs'
import { renderDom } from './helpers/render.mjs'
import { clientComposition } from './helpers/client.mjs'

const face = clientHalf().exports

async function activated(options) {
  const composition = await clientComposition(options)
  const page = clientHalf().exports
  await composition.ctx.plugin(page)
  await new Promise((resolve) => setTimeout(resolve, 20))
  return { ...composition, page }
}

const userNode = { key: 'assigned-actions', kind: 'dsh-resend-user-actions', anchorSeq: 2, data: { seq: 2, text: '原文 @file /skill' } }
const snapshot = { nodes: new Map([
  ['assigned-user', { key: 'assigned-user', kind: 'user', anchorSeq: 2 }],
  ['assigned-actions', userNode],
  ['assigned-reply', { key: 'assigned-reply', kind: 'assistant-step', anchorSeq: 3 }],
]) }

async function editor(options = {}) {
  const composition = await activated(options)
  const registration = composition.record.mounts.find((entry) => entry.options.key === 'dsh-resend-user-actions')
  const props = {
    node: userNode, sessionId: 'session-1', t: composition.ctx.get('locale').bind('dsh-resend'),
    useChat: (select) => select(snapshot), useInput: (select) => select(composition.record.input),
    useSession: (select) => select({ running: options.running ?? false }),
    inputActions: { setDraft: (text) => composition.record.draftWrites.push(text) },
    ...registration.options.inject('session-1'),
  }
  const dom = await renderDom(createElement(registration.component, props))
  return { ...composition, ...dom, props, registration, button: (text) => [...dom.container.querySelectorAll('button')].find((button) => button.textContent === text) }
}

describe('edit and resend at the registered action row', () => {
  it('Enter sends one Remote request; Escape and Cancel write nothing; Shift+Enter and IME Enter stay in the editor', async () => {
    const dom = await editor()
    try {
      await dom.click(dom.button('Edit'))
      const textarea = dom.container.querySelector('textarea')
      expect(textarea.value).toBe('原文 @file /skill')
      await dom.key(textarea, 'Enter', { shiftKey: true })
      await dom.key(textarea, 'Enter', { isComposing: true })
      expect(dom.calls).toHaveLength(0)
      await dom.key(textarea, 'Escape')
      expect(dom.container.querySelector('textarea')).toBeNull()
      expect(dom.record.draftWrites).toEqual([])
      await dom.click(dom.button('Edit'))
      await dom.click(dom.button('Cancel'))
      expect(dom.calls).toHaveLength(0)
      await dom.click(dom.button('Edit'))
      await dom.change(dom.container.querySelector('textarea'), '修改后的中文 @file /skill')
      await dom.key(dom.container.querySelector('textarea'), 'Enter')
      expect(dom.calls).toEqual([{ sessionId: 'session-1', targetSeq: 2, op: 'edit', text: '修改后的中文 @file /skill' }])
    } finally { await dom.cleanup() }
  })

  it('Send is the same single operation and a rapid second activation cannot send twice', async () => {
    const dom = await editor()
    try {
      await dom.click(dom.button('Edit'))
      const send = dom.button('Send')
      await dom.act(async () => {
        send.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
        send.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
      })
      expect(dom.calls).toHaveLength(1)
      expect(dom.calls[0].op).toBe('edit')
      expect(dom.container.querySelector('textarea')).toBeNull()
      expect(dom.container.querySelector('style')).not.toBeNull()
    } finally { await dom.cleanup() }
  })

  it.each(['claimed', 'submitting', 'adjudicating'])('composer handoff is disabled in %s and rechecks a phase flip after rendering', async (phase) => {
    const dom = await editor()
    try {
      await dom.click(dom.button('Edit'))
      const composer = dom.button('Edit in the composer')
      expect(composer.disabled).toBe(false)
      dom.record.input = { phase }
      // Do not render: exercise the gap between the old button and live store.
      await dom.click(composer)
      expect(dom.record.draftWrites).toEqual([])
      expect(dom.container.querySelector('textarea')).not.toBeNull()
      await dom.render(createElement(dom.registration.component, dom.props))
      expect(dom.button('Edit in the composer').disabled).toBe(true)
      expect(dom.calls).toHaveLength(0)
    } finally { await dom.cleanup() }
  })

  it('composer handoff carries literal references and strips chip placeholders, without submitting', async () => {
    const dom = await editor()
    try {
      await dom.click(dom.button('Edit'))
      await dom.change(dom.container.querySelector('textarea'), '@file /skill \uFFFC\uE100正文')
      await dom.click(dom.button('Edit in the composer'))
      expect(dom.record.draftWrites).toEqual(['@file /skill 正文'])
      expect(dom.calls).toHaveLength(0)
      expect(dom.container.querySelector('textarea')).toBeNull()
    } finally { await dom.cleanup() }
  })
})

describe('hide rules at the transcript boundary', () => {
  it('keeps the exact rules and honest count after dismiss, even when carrier provenance is absent', async () => {
    const operations = face.createResendOperations({ resend: { apply: async () => ({ ok: true, value: { carrierSeq: 5, shadowedSeqs: [2, 3], resendMessageId: 'resent' } }) } })
    await operations.run({ sessionId: 'session-1', targetSeq: 2, op: 'edit', text: 'edited' })
    const pointNode = { key: 'assigned-point', kind: face.REWIND_ROW_KIND, anchorSeq: 5, data: { carrierSeq: 5 } }
    const chat = { nodes: new Map([...snapshot.nodes, [pointNode.key, pointNode]]) }
    const rows = [...snapshot.nodes.values()].map((node) => createElement('div', { key: node.key, 'data-chat-anchor-key': node.key }, 'old'))
    const t = (key) => ({ 'row.hiddenCount': '已隐藏 {count} 条消息', 'row.dismiss': '关闭' })[key] ?? key
    const dom = await renderDom(createElement('div', null, [...rows, createElement(face.rewindRowSurface(operations, face.preferences), {
      key: 'point', node: pointNode, sessionId: 'session-1', t, useChat: (select) => select(chat),
    })]))
    try {
      expect(dom.container.textContent).toContain('已隐藏 3 条消息')
      const rules = dom.container.querySelector('style').textContent
      expect(rules.split('\n')).toHaveLength(3)
      await dom.click(dom.container.querySelector('button'))
      expect(dom.container.textContent).not.toContain('已隐藏')
      expect(dom.container.querySelector('style').textContent).toBe(rules)
      for (const row of dom.container.querySelectorAll('[data-chat-anchor-key]')) expect(window.getComputedStyle(row).display).toBe('none')
    } finally { await dom.cleanup() }
  })

  it('cold-load fallback comes from carrier sourceEventSeqs, and missing provenance is a loud range error', async () => {
    const event = { type: 'user/message', seq: 5, surfaceOp: { op: 'replace', startSeq: 2, endSeq: 3 },
      data: { id: 'dsh-resend-edit-cold' }, sourceEventSeqs: [4, 2, 3] }
    const state = face.REWIND_ROW_DEFINITION.start(undefined, { event })
    expect(state.shadowedSeqs).toEqual([2, 3])
    const node = face.REWIND_ROW_DEFINITION.buildViewNode({ key: 'cold', id: 'cold', state })
    const chat = { nodes: new Map([...snapshot.nodes, ['cold', node]]) }
    const operations = face.createResendOperations({})
    const row = face.rewindRowSurface(operations, face.preferences)
    const props = { node, sessionId: 'cold-session', t: (key) => key === 'row.hiddenCount' ? '{count} messages hidden' : key,
      useChat: (select) => select(chat) }
    const dom = await renderDom(createElement(row, props))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      expect(dom.container.textContent).toContain('3 messages hidden')
      const missing = { ...node, data: { carrierSeq: 5, range: { start: 2, end: 3 } } }
      const broken = { nodes: new Map([...snapshot.nodes, ['cold', missing]]) }
      await dom.render(createElement(row, { ...props, node: missing, useChat: (select) => select(broken) }))
      expect(dom.container.querySelector('[role=alert]')).not.toBeNull()
      expect(dom.container.textContent).toContain('row.hideFailed')
      expect(warn.mock.calls.flat().join(' ')).toMatch(/range.*start.*2.*end.*3.*shadowedSeqs/)
      expect(dom.container.textContent).not.toContain('messages hidden')
    } finally { warn.mockRestore(); await dom.cleanup() }
  })

  it('fails visibly and names the range when the node store or grouping cannot be read', async () => {
    const operations = face.createResendOperations({ resend: { apply: async () => ({ ok: true, value: { carrierSeq: 5, shadowedSeqs: [2, 3], resendMessageId: 'resent' } }) } })
    await operations.run({ sessionId: 'session-1', targetSeq: 2, op: 'edit', text: 'edited' })
    const rewindNode = { key: 'rewind-5', kind: 'dsh-resend-error', anchorSeq: 5,
      data: { carrierSeq: 5, range: { start: 2, end: 3 } } }
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const dom = await renderDom(createElement(face.rewindRowSurface(operations, face.preferences), {
      node: rewindNode, sessionId: 'session-1', t: (key) => key, useChat: (select) => select({}),
    }))
    try {
      expect(dom.container.querySelector('[role=alert]')).not.toBeNull()
      expect(dom.container.textContent).toContain('row.hideFailed')
      expect(warn.mock.calls.flat().join(' ')).toMatch(/range.*2,3.*node store/)
    } finally { warn.mockRestore(); await dom.cleanup() }
  })

  it('scopes a hide-plan error to the user row covered by its bad range', async () => {
    const badRecords = [{ carrierSeq: 8, shadowedSeqs: [2, 'bad'], range: { start: 2, end: 4 } }]
    const brokenOperations = {
      recordsFor: () => badRecords,
      subscribe: () => () => {},
    }
    const rows = [2, 4].map((seq) => ({ key: 'actions-' + seq, kind: 'dsh-resend-user-actions', anchorSeq: seq + 0.5, data: { seq, text: 'message ' + seq } }))
    const chat = { nodes: new Map([
      ['user-2', { key: 'user-2', kind: 'user', anchorSeq: 2 }],
      ['user-4', { key: 'user-4', kind: 'user', anchorSeq: 4 }],
      ...rows.map((node) => [node.key, node]),
    ]) }
    const component = face.userActionsSurface(brokenOperations, face.preferences)
    const dom = await renderDom(createElement('div', null, rows.map((node) => createElement(component, {
      key: node.key, node, sessionId: 'session-1', t: (key) => key,
      useChat: (select) => select(chat), useInput: (select) => select({ phase: 'plain' }),
      useSession: (select) => select({ running: false }), inputActions: { setDraft: () => {} }, readInput: () => ({ phase: 'plain' }),
    }))))
    try {
      expect(dom.container.querySelectorAll('[role=alert]')).toHaveLength(1)
      expect(dom.container.querySelector('.dsh-resend-user-actions')).not.toBeNull()
    } finally { await dom.cleanup() }
  })

  it('uses tail finalNode, tool root and half-seq anchors and scans once for all rewind points', () => {
    let scans = 0
    const nodes = [
      { key: 'host-user-key', kind: 'user', anchorSeq: 20 },
      { key: 'host-actions-key', kind: 'dsh-resend-user-actions', anchorSeq: 20.5, data: { seq: 20 } },
      { key: 'host-tail-key', kind: 'turn-tail', anchorSeq: 999, data: { closing: { seq: 999, finalNode: { seq: 21 } } } },
      { key: 'host-tool-key', kind: 'tool-call', anchorSeq: 777, data: { root: { seq: 21 } } },
      { key: 'host-half-key', kind: 'turn-process', anchorSeq: 20.5 },
      { key: 'unaffected', kind: 'user', anchorSeq: 19 },
      { key: 'wrong-tail', kind: 'turn-tail', anchorSeq: 21, data: { closing: { seq: 21, finalNode: { seq: 19 } } } },
      { key: 'wrong-tool', kind: 'tool-call', anchorSeq: 21, data: { root: { seq: 19 } } },
    ]
    const chat = { nodes: { values() { scans++; return nodes } } }
    const records = [{ carrierSeq: 22, shadowedSeqs: [20, 21] }, { carrierSeq: 24, shadowedSeqs: [19] }]
    const plan = face.hidePlanFor(chat, records)
    expect(plan.byCarrier.get(22).keys).toEqual(['host-user-key', 'host-actions-key', 'host-tail-key', 'host-tool-key', 'host-half-key'])
    expect(plan.byCarrier.get(22).count).toBe(5)
    expect(plan.byCarrier.get(24).keys).toEqual(['unaffected', 'wrong-tail', 'wrong-tool'])
    for (let i = 0; i < 2000; i++) expect(face.hidePlanFor(chat, records)).toBe(plan)
    expect(scans).toBe(1)
    face.hidePlanFor({ ...chat }, records)
    expect(scans).toBe(2)
  })

  it('gets actual split flow placements from the host grouping store', () => {
    const chat = { nodes: { values: () => [
      { key: 'assigned-step', kind: 'assistant-step', anchorSeq: 21 },
      { key: 'assigned-user', kind: 'user', anchorSeq: 20 },
    ] } }
    const grouped = {
      entries: [{ kind: 'group', key: 'assigned-process' }, { kind: 'node', key: 'assigned-step', groupPart: 'response' }, { kind: 'node', key: 'assigned-user' }],
      groupSource: () => ({ getSnapshot: () => ({ members: [{ kind: 'node', key: 'assigned-step', groupPart: 'reasoning' }] }) }),
    }
    const plan = face.hidePlanFor(chat, [{ carrierSeq: 22, shadowedSeqs: [20, 21] }], grouped)
    expect(plan.keys).toEqual(['assigned-user', '["assigned-step","reasoning"]', 'assigned-step'])
    expect(plan.byCarrier.get(22).count).toBe(3)
  })

  it('hides the platform key, including JSON grouped keys, while the negative control stays visible', async () => {
    const keys = ['platform-user-2', '["platform-step-3","reasoning"]']
    const rows = keys.map((key) => createElement('div', { key, 'data-chat-anchor-key': key }, key))
    const tree = (rules) => createElement('div', null, [
      ...rows,
      ...(rules ? [createElement('style', { key: 'style' }, face.hideRulesFor(keys))] : []),
    ])
    const dom = await renderDom(tree(false))
    try {
      for (const row of dom.container.querySelectorAll('[data-chat-anchor-key]')) {
        expect(window.getComputedStyle(row).display).not.toBe('none')
      }
      await dom.render(tree(true))
      for (const row of dom.container.querySelectorAll('[data-chat-anchor-key]')) {
        expect(window.getComputedStyle(row).display).toBe('none')
      }
    } finally {
      await dom.cleanup()
    }
  })
})
