/**
 * The regenerate control on the last assistant reply (ticket 07; spec §7
 * registration 3, §7.3, §9.2–§9.4).
 *
 * The host half of regenerate — the round's prompt text, the range to the tail
 * of the surface, the `no-text` and `not-last-reply` refusals — is driven by
 * resolution.test.mjs and apply-refusals.test.mjs against the host seam. This
 * file drives the CLIENT half, the way a page would receive it: the shipped
 * `lib/client.bundle.js` is evaluated and materialized, and the registration it
 * makes is rendered in a DOM.
 *
 * What is held here:
 *
 *  - the companion Definition — one invisible chat node per assistant reply,
 *    whose `start` is PURE (the assembler replays it after a window fill) and
 *    whose only neighbourhood is `previous(kind)`;
 *  - the "last reply" verdict, which is a CLIENT question answered by adjacency
 *    alone — a reply is last when no other reply's `prevSeq` points at it — and
 *    must survive a window fill that evicted its predecessors;
 *  - the four greyed-out refusal states (§9.3): streaming, already-shadowed,
 *    image-only prompt, off-surface target — each disabled, not clickable, with
 *    the reason on hover, and never a post-click dialog;
 *  - one click is ONE `resend.apply` with `op: 'regenerate'` and no `text`
 *    member — the host re-sends the round's own prompt (§4.3);
 *  - the control appears ONLY on the last reply; every other reply renders
 *    nothing;
 *  - the registration is a brand-new list entry (`id: 'dsh-resend-regenerate'`)
 *    beside the shipped assistant-actions entries, through the shared boundary.
 */
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { clientHalf } from '../scripts/client-bundle.mjs'
import { mount, renderDom } from './helpers/render.mjs'
import { clientComposition } from './helpers/client.mjs'

const face = clientHalf().exports
const DEFINITION = face.ASSISTANT_ACTIONS_DEFINITION

// ── Log fixtures: the client sees events, and that is all it may read ──────

const userMessage = (seq, { text, sourceKind = 'user', surfaceOp = 'append' } = {}) => ({
  type: 'user/message',
  seq,
  surfaceOp,
  data: {
    id: 'user-' + seq,
    source: { kind: sourceKind },
    content: text === null ? [{ type: 'image', url: 'https://example.org/prompt.png' }] : [{ type: 'text', text }],
  },
})

const assistantMessage = (seq) => ({
  type: 'assistant/message',
  seq,
  surfaceOp: 'append',
  data: { turn: 1, step: 1, stream: 'idle', message: { id: 'reply-' + seq } },
})

/** The assembler's neighbourhood, as a Definition's `start` receives it. */
const contextAt = (events, index) => ({
  previous: (kind) => {
    for (let i = index - 1; i >= 0; i -= 1) {
      if (events[i].type === kind) return events[i]
    }
    return undefined
  },
})

const startAt = (events, index) => DEFINITION.start(contextAt(events, index), { event: events[index] })

describe('the companion Definition (§7.3)', () => {
  it('matches append assistant messages and refuses every neighbour', () => {
    expect(DEFINITION.match(assistantMessage(6))).toEqual({ id: 'reply-6', role: 'start' })

    // A prompt, a carrier, and the absence of an event: none of these is a
    // reply, so none gets a companion.
    expect(DEFINITION.match(userMessage(5, { text: 'a prompt' }))).toBeNull()
    expect(DEFINITION.match({ ...assistantMessage(6), surfaceOp: { op: 'replace', startSeq: 2, endSeq: 3 } })).toBeNull()
    expect(DEFINITION.match(undefined)).toBeNull()
  })

  it('starts from the adjacency the assembler replays, and from nothing else (§7.3)', () => {
    const full = [
      userMessage(1, { text: 'first prompt' }), assistantMessage(2),
      userMessage(3, { text: 'second prompt' }), assistantMessage(4),
      userMessage(5, { text: 'third prompt' }), assistantMessage(6),
    ]

    // The whole state, and nothing the control does not read: this reply's seq
    // and durable id, the PREVIOUS reply's seq (the only "am I last?" evidence a
    // client may keep), and the nearest prompt's eligibility facts.
    expect(startAt(full, 1)).toEqual({
      seq: 2, id: 'reply-2', prevSeq: null,
      prompt: { seq: 1, isAppend: true, sourceKind: 'user', hasText: true },
    })
    expect(startAt(full, 3)).toEqual({
      seq: 4, id: 'reply-4', prevSeq: 2,
      prompt: { seq: 3, isAppend: true, sourceKind: 'user', hasText: true },
    })
    expect(startAt(full, 5)).toEqual({
      seq: 6, id: 'reply-6', prevSeq: 4,
      prompt: { seq: 5, isAppend: true, sourceKind: 'user', hasText: true },
    })

    // A window that begins mid-conversation: the first reply in the window has
    // no predecessor to point at, and no prompt in reach — both recorded, not
    // invented. The assembler's own replay passes `undefined` where the context
    // is not yet there, so `start` must tolerate it.
    expect(startAt(full.slice(2), 1)).toEqual({
      seq: 4, id: 'reply-4', prevSeq: null,
      prompt: { seq: 3, isAppend: true, sourceKind: 'user', hasText: true },
    })
    expect(startAt(full.slice(4), 1)).toEqual({
      seq: 6, id: 'reply-6', prevSeq: null,
      prompt: { seq: 5, isAppend: true, sourceKind: 'user', hasText: true },
    })
    expect(startAt(full.slice(5), 0)).toEqual({ seq: 6, id: 'reply-6', prevSeq: null, prompt: null })
    // The assembler's own replay passes `undefined` where the context is not
    // yet there, so `start` must tolerate it.
    expect(DEFINITION.start(undefined, { event: assistantMessage(6) })).toEqual(
      { seq: 6, id: 'reply-6', prevSeq: null, prompt: null },
    )
  })

  it('replays identically after a window fill, and still decides the last reply (§7.3)', () => {
    const full = [
      userMessage(1, { text: 'first prompt' }), assistantMessage(2),
      userMessage(3, { text: 'second prompt' }), assistantMessage(4),
      userMessage(5, { text: 'third prompt' }), assistantMessage(6),
    ]

    const verdict = (states) => states.filter((state) => face.isLastReply(state, states)).map((state) => state.seq)

    // The whole window: one last reply, and the verdict is the adjacency itself.
    const fullStates = [startAt(full, 1), startAt(full, 3), startAt(full, 5)]
    expect(verdict(fullStates)).toEqual([6])

    // The window fill evicts the first exchange; the assembler replays `start`
    // over what remains. Purity is the contract — the replay is deterministic on
    // its inputs — and the verdict must not change with it.
    const filled = full.slice(2)
    const replayed = [startAt(filled, 1), startAt(filled, 3)]
    expect(verdict(replayed)).toEqual([6])
    expect(face.isLastReply(replayed[0], replayed)).toBe(false)
    expect(face.isLastReply(replayed[1], replayed)).toBe(true)

    // Purity itself: the same replay, twice, from the same inputs — identical
    // state, the event window untouched.
    const first = startAt(filled, 3)
    const second = startAt(filled, 3)
    expect(second).toEqual(first)
    expect(filled).toEqual(full.slice(2))
  })

  it('builds one invisible companion per reply, and nothing when state is missing', () => {
    const state = { seq: 6, id: 'reply-6', prevSeq: 4, prompt: { seq: 5, isAppend: true, sourceKind: 'user', hasText: true } }
    const context = { key: 'companion-6', id: 'reply-6', state }

    const node = DEFINITION.buildViewNode(context)

    expect(node).toEqual({
      key: 'companion-6',
      kind: face.ASSISTANT_ACTIONS_KIND,
      id: 'reply-6',
      target: 'chat',
      anchorSeq: 6,
      location: { kind: 'unresolved' },
      visibility: 'hidden',
      data: state,
    })
    // A hidden companion is context for the slot's own entry; it renders nothing
    // and needs no renderer of its own.
    expect(node.visibility).toBe('hidden')
    expect(DEFINITION.buildViewNode({ ...context, state: undefined })).toBeNull()
    expect(DEFINITION.update({ state })).toEqual(state)
  })
})

describe('the client-side refusal predictions (§9.3)', () => {
  it('predicts image-only for a definite no-text prompt, and nothing it cannot see', () => {
    const state = (prompt) => ({ seq: 6, id: 'reply-6', prevSeq: 4, prompt })

    // A prompt with no text block is the one definite no-text the client can
    // call: the nearest user message IS the round's prompt, and it carries none.
    expect(face.promptRefusal(state({ seq: 5, isAppend: true, sourceKind: 'user', hasText: false }))).toBe('imageOnly')
    expect(face.promptRefusal(state({ seq: 5, isAppend: true, sourceKind: 'user', hasText: true }))).toBeUndefined()

    // The rest are undecidable FROM the client, and the host's refusal is the
    // answer: no prompt in the window (a fill may have evicted it), a carrier in
    // the seat (the host skips replacements), and a steering message between the
    // prompt and the reply (the host walks past it).
    expect(face.promptRefusal(state(null))).toBeUndefined()
    expect(face.promptRefusal(state({ seq: 5, isAppend: false, sourceKind: 'user', hasText: true }))).toBeUndefined()
    expect(face.promptRefusal(state({ seq: 5, isAppend: true, sourceKind: 'steering', hasText: true }))).toBeUndefined()
  })

  it('decides "last" by adjacency: a reply is last when no reply points at it', () => {
    const chain = [
      { seq: 2, id: 'reply-2', prevSeq: null },
      { seq: 4, id: 'reply-4', prevSeq: 2 },
      { seq: 6, id: 'reply-6', prevSeq: 4 },
    ]
    expect(face.isLastReply(chain[0], chain)).toBe(false)
    expect(face.isLastReply(chain[1], chain)).toBe(false)
    expect(face.isLastReply(chain[2], chain)).toBe(true)

    // A lone reply is its own last. And a shadowed reply still ANSWERS to the
    // verdict — its companion survives shadowing (`append` forever), so a
    // shadowed last reply is where the greyed control goes, not a reply that no
    // longer exists.
    expect(face.isLastReply(chain[2], [chain[2]])).toBe(true)
  })
})

describe('the registered regenerate control (§9.2, §9.3)', () => {
  /** One activated composition, with the assistant-actions entry found by id. */
  async function activated(options = {}) {
    const composition = await clientComposition(options)
    await composition.ctx.plugin(face)
    await new Promise((resolve) => setTimeout(resolve, 20))
    const registration = composition.record.mounts.find((entry) => entry.options.name === 'conversation.chat.assistant-actions')
    return { ...composition, registration }
  }

  it('registers beside the shipped entries under its own id, never a shipped one', async () => {
    const { record, registration } = await activated()

    expect(registration).not.toBeUndefined()
    expect(registration.options).toEqual({
      name: 'conversation.chat.assistant-actions',
      id: 'dsh-resend-regenerate',
      order: expect.any(Number),
      locale: 'dsh-resend',
    })
    expect(registration.options.id).not.toBe('dsh-resend-user-actions')
    expect(registration.options.key).toBeUndefined()
    expect(typeof registration.component).toBe('function')
    // The companion Definition is registered like its siblings, under its own
    // kind — and that kind is outside the shipped node keys.
    expect(record.definitions.some((definition) => definition.kind === 'dsh-resend-regenerate')).toBe(true)
  })

  it('renders nothing at all on a reply that is not the last', async () => {
    const { registration, snapshot, cleanup } = await rendered({ replySeqs: [2, 6], messageId: 'reply-2' })
    try {
      // Not the last reply: no chip, no reason, nothing the strip can grey out.
      expect(snapshot.container.querySelector('button')).toBeNull()
      expect(snapshot.container.querySelector('[data-icon="refresh-outline"]')).toBeNull()
    } finally {
      await cleanup()
    }
  })

  it('is a permanently visible control on the last reply, and one click is one regenerate', async () => {
    const { registration, calls, cleanup } = await rendered({ replySeqs: [2, 6], messageId: 'reply-6', results: [] })
    try {
      const chip = [...cleanup.__container.querySelectorAll('button')]
      expect(chip).toHaveLength(1)
      expect(chip[0].disabled).toBe(false)
      expect(chip[0].querySelector('[data-icon="refresh-outline"]')).not.toBeNull()
      expect(chip[0].textContent).toContain('Regenerate')

      // One click: ONE `resend.apply`, `op: 'regenerate'`, and no `text` member —
      // the host re-sends the round's own prompt, not anything the client typed.
      await cleanup.click(chip[0])
      expect(calls).toEqual([{ sessionId: 'session-1', targetSeq: 6, op: 'regenerate' }])
      expect(calls[0].text).toBeUndefined()

      // A second activation before the first settles is the same single
      // operation, not a double-send.
      await cleanup.act(async () => {
        chip[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
        chip[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
      })
      expect(calls).toHaveLength(2)
      expect(calls[1]).toEqual({ sessionId: 'session-1', targetSeq: 6, op: 'regenerate' })
    } finally {
      await cleanup()
    }
  })

  it.each([
    ['streaming', { running: true }, 'row.stopFirst', '请先停止回复'],
    ['already shadowed', { replySeqs: [6], shadow: [6] }, 'row.shadowed', '这条回复已被重写'],
    ['image-only prompt', { replySeqs: [6], prompt: { seq: 5, isAppend: true, sourceKind: 'user', hasText: false } }, 'row.imageOnly', '这条提示词没有可重发的文本'],
    ['off-surface target', { replySeqs: [6], companion: false }, 'row.offSurface', '这条回复不在当前对话面上'],
  ])('greys out %s as disabled + hover reason, and answers no click with a call', async (_label, options, _reasonKey, reasonText) => {
    const { cleanup, calls, record } = await rendered({ messageId: 'reply-6', locale: 'zh', ...options })
    try {
      const chip = cleanup.__container.querySelector('button')
      expect(chip).not.toBeNull()
      expect(chip.disabled).toBe(true)
      expect(chip.title).toBe(reasonText)
      await cleanup.click(chip)
      expect(calls).toHaveLength(0)
      // §9.3: a refusal is the greyed control, never an error dialog after the
      // fact. No dialog exists in this tree at all.
      expect(cleanup.__container.querySelector('[role="dialog"]')).toBeNull()
      expect(record.missingKeys).toEqual([])
    } finally {
      await cleanup()
    }
  })

  it('answers a host refusal with inline text, not a dialog (§9.3, §4.4)', async () => {
    const { cleanup, calls } = await rendered({
      messageId: 'reply-6',
      replySeqs: [2, 6],
      results: [{ ok: false, error: { code: 'agent-busy' } }],
    })
    try {
      const chip = cleanup.__container.querySelector('button')
      expect(chip.disabled).toBe(false)
      await cleanup.click(chip)
      expect(calls).toHaveLength(1)
      // The host said `agent-busy` after the grey-out's timing slipped a click;
      // the answer is inline text the user can read, never a dialog.
      const alert = cleanup.__container.querySelector('[role="alert"]')
      expect(alert).not.toBeNull()
      expect(alert.textContent).toContain('agent-busy')
      expect(cleanup.__container.querySelector('[role="dialog"]')).toBeNull()
    } finally {
      await cleanup()
    }
  })

  it('speaks exactly one language — never both at once (§10)', async () => {
    const { registration, cleanup } = await rendered({ replySeqs: [2, 6], messageId: 'reply-6', locale: 'zh', results: [] })
    const zhText = cleanup.__container.querySelector('button').textContent
    expect(zhText).toContain('重新生成')
    expect(zhText).not.toContain('Regenerate')
    await cleanup()

    const en = await rendered({ replySeqs: [2, 6], messageId: 'reply-6', locale: 'en', results: [] })
    const enText = en.cleanup.__container.querySelector('button').textContent
    expect(enText).toContain('Regenerate')
    expect(enText).not.toContain('重新生成')
    await en.cleanup()
  })

  it('is contained by the shared boundary like every other surface (§7.4)', async () => {
    const throwing = {
      subscribe() {
        throw new Error('this surface read a path that was permanently undefined')
      },
      recordsFor: () => Object.freeze([]),
      outcomeOf: () => undefined,
      run: async () => {
        throw new Error('unreachable')
      },
    }
    const wrapped = face.withPanelBoundary(face.regenerateSurface(throwing), 'panel.error.regenerate')
    const t = (key) => (key === 'panel.error.regenerate' ? 'The regenerate control could not be displayed' : key)
    const snapshot = { nodes: new Map([['step-6', assistantStep(6)]]) }

    const { html, thrown } = await mount(
      createElement(wrapped, {
        messageId: 'reply-6',
        sessionId: 'session-1',
        t,
        useChat: (select) => select(snapshot),
      }),
    )

    expect(thrown).toBeUndefined()
    expect(html).toContain('The regenerate control could not be displayed')
    expect(html).toContain('this surface read a path that was permanently undefined')

    // Without the boundary the same throw escapes the render, §13.3 #20.
    const unboundaried = await mount(
      createElement(face.regenerateSurface(throwing), {
        messageId: 'reply-6',
        sessionId: 'session-1',
        t,
        useChat: (select) => select(snapshot),
      }),
    )
    expect(unboundaried.thrown).toBeDefined()
  })
})

/**
 * Render the registered entry against a transcript the case describes.
 *
 * `replySeqs` are assistant replies with companions (each pointing at its
 * predecessor); `shadow` adds a surface-shadow node covering the listed seqs;
 * `companion: false` drops the last reply's companion — the off-surface case;
 * `prompt` overrides the last reply's prompt facts.
 */
async function rendered(options) {
  const { replySeqs = [6], shadow = [], companion = true, prompt, results, locale = 'en', running = false, messageId } = options
  const composition = await clientComposition({ results })
  await composition.ctx.plugin(face)
  await new Promise((resolve) => setTimeout(resolve, 20))
  const registration = composition.record.mounts.find((entry) => entry.options.name === 'conversation.chat.assistant-actions')
  expect(registration?.options?.id).toBe('dsh-resend-regenerate')

  const nodes = []
  replySeqs.forEach((seq, index) => {
    nodes.push(assistantStep(seq))
    if (companion || seq !== replySeqs[replySeqs.length - 1]) {
      const prev = index > 0 ? replySeqs[index - 1] : null
      nodes.push(companionNode(seq, prev, prompt))
    }
  })
  for (const seq of shadow) {
    nodes.push({ key: 'shadow-' + seq, kind: 'dsh-resend-surface-shadow', anchorSeq: seq + 1, visibility: 'hidden', data: { seq: seq + 1, shadowedSeqs: [seq] } })
  }
  const snapshot = { nodes: new Map(nodes.map((node) => [node.key, node])) }

  composition.ctx.get('locale').active = locale
  const t = composition.ctx.get('locale').bind('dsh-resend')
  const dom = await renderDom(createElement(registration.component, {
    messageId: messageId ?? ('reply-' + replySeqs[replySeqs.length - 1]),
    sessionId: 'session-1',
    t,
    useChat: (select) => select(snapshot),
    useSession: (select) => select({ running }),
  }))
  return {
    composition,
    registration,
    calls: composition.calls,
    record: composition.record,
    snapshot: dom,
    cleanup: Object.assign(dom.cleanup.bind(dom), { __container: dom.container, click: dom.click.bind(dom), act: dom.act.bind(dom) }),
  }
}

const assistantStep = (seq) => ({ key: 'step-' + seq, kind: 'assistant-step', anchorSeq: seq })

function companionNode(seq, prevSeq, prompt) {
  return {
    key: 'companion-' + seq,
    kind: 'dsh-resend-regenerate',
    anchorSeq: seq,
    visibility: 'hidden',
    data: {
      seq,
      id: 'reply-' + seq,
      prevSeq,
      prompt: prompt ?? { seq: seq - 1, isAppend: true, sourceKind: 'user', hasText: true },
    },
  }
}
