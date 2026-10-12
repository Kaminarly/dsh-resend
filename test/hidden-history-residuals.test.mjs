import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { clientHalf } from '../scripts/client-bundle.mjs'
import { renderDom } from './helpers/render.mjs'
import { resolveHostApp } from '../scripts/host-app.mjs'
import { installedChatDefinitions, installedConversationAssembler, assemblerChatSnapshot } from './helpers/conversation-assembler.mjs'

const face = clientHalf().exports

const nodes = [
  { key: 'old-tool', kind: 'tool-call', anchorSeq: 3, location: { kind: 'step', turn: { turn: 1 } }, data: { root: { seq: 4 } } },
  { key: 'old-tail', kind: 'turn-tail', anchorSeq: 6.5, data: { turn: 1, seq: 6, closing: null } },
  { key: 'second-tool', kind: 'tool-call', anchorSeq: 10, location: { kind: 'step', turn: { turn: 2 } }, data: { root: { seq: 11 } } },
  { key: 'current-reply', kind: 'assistant-step', anchorSeq: 18, data: { turn: 3 } },
  { key: 'current-tail', kind: 'turn-tail', anchorSeq: 20.5, data: { turn: 3, closing: { finalNode: { seq: 18 } } } },
]
const groups = new Map([
  ['old-process', [{ key: 'old-tool' }]],
  ['second-process', [{ key: 'second-tool' }]],
  ['current-process', [{ key: 'current-reply', groupPart: 'reasoning' }]],
])
const grouped = {
  entries: [
    { kind: 'group', key: 'old-process' }, { kind: 'node', key: 'old-tail' },
    { kind: 'group', key: 'second-process' },
    { kind: 'group', key: 'current-process' }, { kind: 'node', key: 'current-reply' },
    { kind: 'node', key: 'current-tail' },
  ],
  groupSource: key => ({ getSnapshot: () => ({ members: groups.get(key) }) }),
}

async function historyDom(chat, view, points) {
  const operations = face.createResendOperations({ resend: {
    rollback: async () => ({ ok: true, value: { ok: true, value: { empty: true, completed: false, files: [] } } }),
  } })
  const preferences = face.createPreferences()
  const Surface = face.rewindRowSurface(operations, preferences)
  const row = (key, text) => createElement('div', { key, 'data-chat-anchor-key': key }, text)
  return renderDom(createElement('div', null, [
    row('group:old-process', '已读取文件，已搜索代码，已写入文件'),
    row('old-tail', '本轮 ¥0.0165 · 4 步 · 缓存命中 71%'),
    row('group:second-process', '已读取文件，修改了文件，已调用工具'),
    row('group:current-process', '当前工具摘要'),
    row('current-reply', '当前回复'), row('current-tail', '当前费用'),
    ...points.map(carrierSeq => createElement(Surface, {
      key: carrierSeq, node: { data: { carrierSeq } }, sessionId: 'residual-history',
      t: key => key === 'row.hiddenCount' ? '已隐藏 {count} 条消息' : key,
      useChat: select => select(chat),
      useConversation: select => select({ views: { grouped: () => view } }),
    })),
  ]))
}

describe('rewritten history residual rows', () => {
  it('leaves only notices for repeated rewrites, including tool-only turn costs', async () => {
    const chat = { nodes: new Map([...nodes, ...[
      { key: 'point-8', kind: 'dsh-resend-error', data: { carrierSeq: 8, shadowedSeqs: [4] } },
      { key: 'point-14', kind: 'dsh-resend-error', data: { carrierSeq: 14, shadowedSeqs: [11] } },
    ]].map(node => [node.key, node])) }
    const dom = await historyDom(chat, grouped, [8, 14])
    try {
      for (const key of ['group:old-process', 'old-tail', 'group:second-process']) {
        expect(window.getComputedStyle(dom.container.querySelector(`[data-chat-anchor-key="${key}"]`)).display, key).toBe('none')
      }
      for (const key of ['group:current-process', 'current-reply', 'current-tail']) {
        expect(window.getComputedStyle(dom.container.querySelector(`[data-chat-anchor-key="${key}"]`)).display, key).not.toBe('none')
      }
      expect(dom.container.textContent).toContain('已隐藏 2 条消息')
      expect(dom.container.textContent).toContain('已隐藏 1 条消息')
      expect(dom.container.querySelector('[role=alert]')).toBeNull()
    } finally { await dom.cleanup() }
  })
})


describe('hidden process group boundaries', () => {
  it('preserves a group containing an effective message and combines separate rewinds', () => {
    const chat = { nodes: new Map([
      ['a', { key: 'a', kind: 'assistant-step', anchorSeq: 4 }],
      ['b', { key: 'b', kind: 'assistant-step', anchorSeq: 11 }],
    ]) }
    const view = {
      entries: [{ kind: 'group', key: 'shared' }],
      groupSource: () => ({ getSnapshot: () => ({ members: [{ key: 'a', groupPart: 'reasoning' }, { key: 'b' }] }) }),
    }
    const first = { carrierSeq: 8, shadowedSeqs: [4] }
    expect(face.hidePlanFor(chat, [first], view).groupKeys).toEqual([])
    const plan = face.hidePlanFor(chat, [first, { carrierSeq: 14, shadowedSeqs: [11] }], view)
    expect(plan.groupKeys).toEqual(['group:shared'])
    expect(plan.byCarrier.get(8).count).toBe(1)
    expect(plan.byCarrier.get(14).count).toBe(1)
  })

  it('keeps empty groups and unrelated tool-only turn footers visible', () => {
    const chat = { nodes: new Map(nodes.map(node => [node.key, node])) }
    const view = {
      entries: [...grouped.entries, { kind: 'group', key: 'empty' }],
      groupSource: key => key === 'empty' ? { getSnapshot: () => ({ members: [] }) } : grouped.groupSource(key),
    }
    const plan = face.hidePlanFor(chat, [{ carrierSeq: 14, shadowedSeqs: [11] }], view)
    expect(plan.keys).not.toContain('old-tail')
    expect(plan.groupKeys).toEqual(['group:second-process'])
  })

  it.skipIf(!resolveHostApp())('hides tool-only turn footers produced by the installed DSH assembler after reopening', () => {
    const events = [
      { type: 'user/message', seq: 0, time: 0, surfaceOp: 'append', data: { id: 'u', source: { kind: 'user' }, content: [{ type: 'text', text: '读取文件' }] } },
      { type: 'turn/start', seq: 1, time: 1, data: { turn: 1 } },
      { type: 'step/start', seq: 2, time: 2, data: { turn: 1, step: 1 } },
      { type: 'tool/call', seq: 3, time: 3, data: { turn: 1, step: 1, callId: 'read', name: 'read', arguments: '{}' } },
      { type: 'tool/result', seq: 4, time: 4, surfaceOp: 'append', data: { turn: 1, step: 1, message: { source: { callId: 'read' }, content: [{ type: 'text', text: '旧工具结果' }] } } },
      { type: 'step/end', seq: 5, time: 5, data: { turn: 1, step: 1 } },
      { type: 'turn/end', seq: 6, time: 6, data: { turn: 1, reason: { kind: 'completed' } } },
      { type: 'user/message', seq: 8, time: 8, surfaceOp: { op: 'replace', startSeq: 0, endSeq: 4 }, sourceEventSeqs: [7, 0, 4],
        data: { id: 'dsh-resend-edit-history-8', source: { kind: 'dsh-resend' }, content: [] } },
    ]
    const original = JSON.stringify(events)
    for (let open = 0; open < 2; open++) {
      const assembler = installedConversationAssembler([...installedChatDefinitions({ turnTail: true }), face.REWIND_ROW_DEFINITION])
      assembler.replaceWindow(events.map(event => ({ type: 'durable', event })), false)
      const chat = assemblerChatSnapshot(assembler)
      const tool = [...chat.nodes.values()].find(node => node.kind === 'tool-call')
      const tail = [...chat.nodes.values()].find(node => node.kind === 'turn-tail')
      expect(tail.data.closing).toBeNull()
      expect(tool.data.root.turn).toBeUndefined()
      const view = {
        entries: [{ kind: 'group', key: 'process' }, { kind: 'node', key: tail.key }],
        groupSource: () => ({ getSnapshot: () => ({ members: [{ key: tool.key }] }) }),
      }
      const plan = face.hidePlanFor(chat, [], view)
      expect(plan.keys).toContain(tool.key)
      expect(plan.keys).toContain(tail.key)
      expect(plan.groupKeys).toEqual(['group:process'])
      expect(plan.byCarrier.get(8).count).toBe(2)
    }
    expect(JSON.stringify(events)).toBe(original)
  })
})
