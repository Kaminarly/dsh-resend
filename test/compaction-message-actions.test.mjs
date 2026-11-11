import { describe, expect, it } from 'vitest'
import { createElement, memo } from 'react'
import { clientHalf } from '../scripts/client-bundle.mjs'
import { renderDom } from './helpers/render.mjs'
import { readyPreferences } from './helpers/preferences.mjs'

const face = clientHalf().exports

/**
 * A user message that carries an image and text, like the message in the
 * report. Only the host's chat data matters to the action row.
 */
const imageUser = {
  key: 'user-8', kind: 'user', anchorSeq: 8,
  data: {
    seq: 8, time: 8,
    content: [
      { type: 'image', attachment: { attachmentId: 'sha256:aa', mediaType: 'image/png', width: 10, height: 10, bytes: 100, name: 'image.png' } },
      { type: 'text', text: '为什么用户消息带图片时没有编辑按钮？' },
    ],
  },
}

const laterUser = {
  key: 'user-10', kind: 'user', anchorSeq: 10,
  data: { seq: 10, time: 10, content: [{ type: 'text', text: '之后的文本消息' }] },
}

/** The host message plus the actions seat the plugin augments. */
function HostActions({ extraActions, text }) {
  return createElement('div', { 'data-host-actions': true }, createElement('button', { 'aria-label': 'copy', 'data-copy': text }), extraActions)
}

function HostBubble({ text, imageName, actions }) {
  return createElement('div', { 'data-host-message': true },
    imageName === undefined ? null : createElement('span', { 'data-image': true }, imageName),
    createElement('span', null, text),
    actions(text))
}

const Original = memo(function Original({ node }) {
  const content = Array.isArray(node.data.content) ? node.data.content : []
  const text = content.filter((part) => part.type === 'text').map((part) => part.text).join('\n')
  const imageName = content.find((part) => part.type === 'image')?.attachment?.name
  return createElement(HostBubble, {
    text,
    imageName,
    // The shipped UserMessageNodeView owns this callback and hands it to the
    // bubble; the plugin reads it from the element to append its own action.
    actions: (value) => createElement(HostActions, { text: value }),
  })
})

/**
 * Build the invisible node the plugin derives from one surface replacement.
 * @param event - the replacement event; its source kind distinguishes a host
 *   compaction checkpoint from a rewind.
 * @returns the hidden chat node the assembler would place in the snapshot.
 */
function shadowNode(event) {
  const match = face.SURFACE_SHADOW_DEFINITION.match(event)
  expect(match).not.toBeNull()
  const state = face.SURFACE_SHADOW_DEFINITION.start(undefined, { ...match, event })
  return face.SURFACE_SHADOW_DEFINITION.buildViewNode({ key: 'shadow-' + event.seq, id: match.id, state })
}

function replacement(seq, sourceKind, shadowedSeqs = [8]) {
  return {
    type: 'user/message', seq, time: seq,
    data: { source: { kind: sourceKind }, content: [{ type: 'text', text: '摘要' }] },
    sourceEventSeqs: shadowedSeqs,
    surfaceOp: { op: 'replace', startSeq: 8, endSeq: 8 },
  }
}

async function mountRow({ node, snapshot, userSeqs = [10], lastUserSeq = 10 }) {
  const remote = {
    resend: {
      conversation: async () => ({ ok: true, value: { ok: true, value: { userSeqs, lastUserSeq, assistantSeqs: [] } } }),
    },
  }
  const operations = face.createResendOperations(remote)
  const preferences = readyPreferences(face)
  const Surface = face.userMessageSurface(Original, operations, preferences, (key) => key)
  const props = {
    node, sessionId: 'compacted-session', t: (key) => key,
    useChat: (select) => select(snapshot),
    useInput: (select) => select({ phase: 'plain' }),
    useSession: (select) => select({ running: false }),
    useSessions: (select) => select({ byId: {} }),
    inputActions: { setDraft() {} }, readInput: () => ({ phase: 'plain' }),
  }
  return renderDom(createElement(Surface, props))
}

describe('compacted user messages keep their message and show the edit action', () => {
  it('renders the image message and a disabled edit action with the compaction reason', async () => {
    const shadow = shadowNode(replacement(9, 'compact-checkpoint'))
    const snapshot = { nodes: new Map([[imageUser.key, imageUser], [laterUser.key, laterUser], [shadow.key, shadow]]) }
    const dom = await mountRow({ node: imageUser, snapshot })
    try {
      expect(dom.container.querySelector('[data-host-message]')).not.toBeNull()
      expect(dom.container.textContent).toContain('为什么用户消息带图片时没有编辑按钮？')
      expect(dom.container.querySelector('[data-image]')).not.toBeNull()
      const button = dom.container.querySelector('[aria-label="row.edit"]')
      expect(button).not.toBeNull()
      expect(button.disabled).toBe(true)
      // IconAction carries the disabled reason on the wrapper so the tooltip
      // and keyboard focus still explain why the action is unavailable.
      expect(button.parentElement.getAttribute('aria-label')).toBe('row.compacted')
    } finally { await dom.cleanup() }
  })

  it('still removes the action when the replacement is a rewind that hides the row', async () => {
    const shadow = shadowNode(replacement(9, 'dsh-resend'))
    const snapshot = { nodes: new Map([[imageUser.key, imageUser], [laterUser.key, laterUser], [shadow.key, shadow]]) }
    const dom = await mountRow({ node: imageUser, snapshot })
    try {
      expect(dom.container.querySelector('[aria-label="row.edit"]')).toBeNull()
    } finally { await dom.cleanup() }
  })
})
