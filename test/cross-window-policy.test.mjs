import { afterEach, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { TypertGatewayService } from '@deepseek-ai/dsh-api-gateway'
import { mkdir, mkdtemp } from 'node:fs/promises'
import path from 'node:path'
import { clientHalf } from '../scripts/client-bundle.mjs'
import { settingsHost, settingsClientProvider } from './helpers/settings-host.mjs'
import { clientComposition } from './helpers/client.mjs'
import { clientComposition as gatewayClient, dispatchToHost } from './helpers/gateway.mjs'
import { installedConversationAssembler, installedChatDefinitions, assemblerChatSnapshot } from './helpers/conversation-assembler.mjs'
import { measuredFixture, hostState, appendUser, appendReply, agentDoubles, logOf, auditCount } from './helpers/host.mjs'
import { renderDom } from './helpers/render.mjs'
import { tmpDir } from './helpers/dsh.mjs'

const resources = []
afterEach(async () => { for (const resource of resources.splice(0).reverse()) await resource.close() })

async function durable(state = hostState({ session: measuredFixture(), agent: 'deaf' })) {
  await mkdir(tmpDir, { recursive: true })
  const home = await mkdtemp(path.join(tmpDir, 'cross-window-policy-'))
  const h = await settingsHost(home, 'shared', state, { restrictRegenerateToLastReply: true, restrictEditToLastUserMessage: true })
  resources.push(h)
  await h.ctx.plugin(TypertGatewayService)
  return { h, state }
}

async function pageFor(h, faults, settle = (_endpoint, result) => result) {
  const settings = await settingsClientProvider(h, faults)
  resources.push(settings)
  const answers = []
  const ctx = await gatewayClient(async (endpoint, payload, signal) => {
    const result = await dispatchToHost(h, endpoint, payload.args, signal)
    if (endpoint === 'resend/apply' || endpoint === 'resend/replay') answers.push(result.value)
    return settle(endpoint, result)
  })
  resources.push({ close: () => ctx.fiber.dispose() })
  const c = await clientComposition({ ctx, configForms: settings.forms })
  const face = clientHalf().exports
  await ctx.plugin(face)
  const assembler = installedConversationAssembler([...installedChatDefinitions({ turnTail: true }), ...c.record.definitions])
  assembler.replaceWindow(logOf(h.ctx.sessions.get('session-1')).map(event => ({ type: 'durable', event })), false)
  let chat = assemblerChatSnapshot(assembler)
  const user = c.record.mounts.find(row => row.options.key === 'user')
  const regenerate = c.record.mounts.find(row => row.options.id === face.ASSISTANT_ACTIONS_ID)
  const settingsRow = c.record.mounts.find(row => row.options.id === face.SETTINGS_ROW_ID)
  const rewind = c.record.mounts.find(row => row.options.key === face.REWIND_ROW_KIND)
  const t = ctx.locale.bind('dsh-resend')
  const props = () => ({ sessionId: 'session-1', t,
    useChat: select => select(chat), useSession: select => select({ running: false }),
    useInput: select => select(c.record.input), inputActions: { setDraft: text => c.record.draftWrites.push(text) },
  })
  const rows = () => createElement('div', null, [
    createElement(settingsRow.component, { key: 'settings' }),
    ...[...chat.nodes.values()].filter(node => node.kind === face.REWIND_ROW_KIND).map(node =>
      createElement(rewind.component, { ...props(), key: node.key, node })),
    ...[...chat.nodes.values()].filter(node => node.kind === 'user').map(node =>
      createElement('div', { key: node.key, 'data-user-seq': node.anchorSeq },
        createElement(user.component, { ...props(), ...user.options.inject('session-1'), node }))),
    ...[...chat.nodes.values()].filter(node => node.kind === 'turn-tail').map(node =>
      createElement('div', { key: node.key, 'data-reply-seq': node.data.closing.finalNode.seq },
        createElement(regenerate.component, { ...props(), messageId: node.data.closing.finalNode.messageId }))),
  ])
  const dom = await renderDom(rows())
  resources.push({ close: () => dom.cleanup() })
  return { ...c, face, settings, dom, answers, assembler,
    button: (seq, label, kind = 'user') => dom.container.querySelector(`[data-${kind}-seq="${seq}"] button[aria-label="${label}"]`),
    async refill() {
      assembler.replaceWindow(logOf(h.ctx.sessions.get('session-1')).map(event => ({ type: 'durable', event })), false)
      chat = assemblerChatSnapshot(assembler)
      await dom.render(rows())
    },
  }
}

it('re-reads Host eligibility after reconnect even before the old Chat window is refilled', async () => {
  const { h, state } = await durable()
  const b = await pageFor(h)
  expect(b.button(6, 'Edit').disabled).toBe(false)
  await b.dom.click(b.button(6, 'Edit'))
  const textarea = b.dom.container.querySelector('textarea')
  await b.dom.change(textarea, '断线期间保留的编辑草稿')
  appendUser(state.session, { id: 'missed-user', text: 'newest question while disconnected' })
  appendReply(state.session, { id: 'missed-reply', text: 'newest reply while disconnected', turn: 3 })
  await b.dom.act(async () => {
    b.ctx.emit('connection/reset')
    await new Promise(resolve => setTimeout(resolve, 20))
  })
  expect(b.button(6, 'Send').disabled).toBe(true)
  expect(b.button(9, 'Regenerate', 'reply').disabled).toBe(true)
  expect(b.dom.container.querySelector('textarea')).toBe(textarea)
  expect(textarea.value).toBe('断线期间保留的编辑草稿')
  await b.dom.key(textarea, 'Enter')
  await b.dom.click(b.button(6, 'Edit in the composer'))
  expect(b.answers).toEqual([])
  expect(b.record.draftWrites).toEqual([])
  expect(auditCount(state.session)).toBe(0)
})

it('discards an older in-flight eligibility response after a second reconnect', async () => {
  const { h, state } = await durable()
  let delay = false, release
  const b = await pageFor(h, undefined, (endpoint, result) => {
    if (endpoint !== 'resend/conversation' || !delay) return result
    delay = false
    return new Promise(resolve => { release = () => resolve(result) })
  })
  delay = true
  await b.dom.act(async () => {
    b.ctx.emit('connection/reset')
    await vi.waitFor(() => expect(release).toBeTypeOf('function'))
  })
  expect(b.button(6, 'Edit').disabled).toBe(true)
  appendUser(state.session, { id: 'latest-after-read', text: 'latest prompt' })
  appendReply(state.session, { id: 'latest-reply-after-read', text: 'latest reply', turn: 3 })
  await b.dom.act(async () => {
    b.ctx.emit('connection/reset')
    await new Promise(resolve => setTimeout(resolve, 20))
  })
  expect(b.button(6, 'Edit').disabled).toBe(true)
  expect(b.button(9, 'Regenerate', 'reply').disabled).toBe(true)
  await b.dom.act(async () => { release() })
  expect(b.button(6, 'Edit').disabled).toBe(true)
  expect(b.button(9, 'Regenerate', 'reply').disabled).toBe(true)
  expect(auditCount(state.session)).toBe(0)
})

it('synchronizes all four switches and open controls between two durable Profile pages', async () => {
  const { h } = await durable()
  const a = await pageFor(h)
  const b = await pageFor(h)
  const textareaBefore = async () => {
    await b.dom.click(b.button(6, 'Edit'))
    const textarea = b.dom.container.querySelector('textarea')
    await b.dom.change(textarea, '跨窗口同步仍保留的文字')
    return textarea
  }
  const textarea = await textareaBefore()
  for (const field of a.face.preferences.fields) {
    await a.dom.act(async () => {
      await a.face.preferences.set(field, false)
      await vi.waitFor(() => expect(b.face.preferences.getSnapshot()[field]).toBe(false))
    })
    expect(b.dom.container.querySelector(`[data-field="${field}"] [role="switch"]`).getAttribute('aria-checked')).toBe('false')
    expect(b.dom.container.querySelector('textarea')).toBe(textarea)
    expect(textarea.value).toBe('跨窗口同步仍保留的文字')
  }
  expect(b.button(3, 'Regenerate', 'reply')).toBeNull()
  expect(b.button(0, 'Edit in the composer').disabled).toBe(false)
  await a.dom.act(async () => { await a.face.preferences.set('regenerateLastReply', true) })
  expect(b.button(3, 'Regenerate', 'reply').disabled).toBe(false)
  await a.dom.act(async () => { await a.face.preferences.set('restrictRegenerateToLastReply', true) })
  expect(b.button(3, 'Regenerate', 'reply').disabled).toBe(true)
  // A fresh independent Profile uses its own document, rather than shared browser storage.
  const other = await settingsHost(h.profile.home, 'other')
  resources.push(other)
  expect(other.settings.describe()[0].value).toEqual({ inlineEditorBeneathMessage: true, regenerateLastReply: true,
    restrictRegenerateToLastReply: false, restrictEditToLastUserMessage: false })
})

it.each(['edit', 'regenerate'])('rejects a stale second-window %s button under the newly saved rule without side effects', async op => {
  const { h, state } = await durable()
  const a = await pageFor(h)
  await a.dom.act(async () => {
    await a.face.preferences.set('restrictEditToLastUserMessage', false)
    await a.face.preferences.set('restrictRegenerateToLastReply', false)
  })
  const b = await pageFor(h, { receiveEvent: () => false })
  if (op === 'edit') {
    await b.dom.click(b.button(0, 'Edit'))
    await b.dom.change(b.dom.container.querySelector('textarea'), '旧窗口的修改')
  }
  await a.dom.act(async () => {
    await a.face.preferences.set('restrictEditToLastUserMessage', true)
    await a.face.preferences.set('restrictRegenerateToLastReply', true)
  })
  expect(b.face.preferences.getSnapshot().restrictEditToLastUserMessage).toBe(false)
  const button = b.button(op === 'edit' ? 0 : 3, op === 'edit' ? 'Send' : 'Regenerate', op === 'edit' ? 'user' : 'reply')
  expect(button.disabled).toBe(false)
  const original = logOf(state.session)
  await b.dom.click(button)
  await b.dom.act(async () => { await vi.waitFor(() => expect(b.answers).toHaveLength(1)) })
  expect(b.answers[0]).toEqual({ ok: false, error: { code: op === 'edit' ? 'not-last-user-message' : 'not-last-reply' } })
  expect(logOf(state.session)).toEqual(original)
  expect(state.calls.followups).toBe(0)
  await b.dom.act(async () => { await b.settings.forms.describe().load() })
  expect(button.disabled).toBe(true)
  if (op === 'edit') expect(b.dom.container.querySelector('textarea').value).toBe('旧窗口的修改')
})

it.each(['edit', 'regenerate'])('does not resend an accepted %s prompt even if the agent has not appended its inbox yet', async op => {
  const { h, state } = await durable()
  const a = await pageFor(h)
  await a.dom.act(async () => {
    await a.face.preferences.set('restrictEditToLastUserMessage', false)
    await a.face.preferences.set('restrictRegenerateToLastReply', false)
  })
  const request = { sessionId: 'session-1', targetSeq: op === 'edit' ? 0 : 3, op,
    ...(op === 'edit' ? { text: '必须仅接收一次的修改' } : {}) }
  const operations = a.face.createResendOperations(a.ctx.remote)
  const first = await operations.run(request)
  expect(first.ok).toBe(true)
  expect(first.value.resendMessageId).toBeUndefined()
  await a.dom.act(async () => {
    await a.face.preferences.set('restrictEditToLastUserMessage', true)
    await a.face.preferences.set('restrictRegenerateToLastReply', true)
  })
  state.agent.followup = input => {
    state.calls.followupInputs.push(input)
    state.agent.status = 'running'
  }
  const point = { sessionId: request.sessionId, carrierSeq: first.value.carrierSeq }
  expect((await operations.sendAgain(point)).value.resendMessageId).toBeDefined()
  // An accepted inbox can fail before its append is visible. Idle is not proof
  // that the prompt was never accepted; another window must not deliver it again.
  state.agent.status = 'idle'
  expect(await operations.sendAgain(point)).toBeUndefined()
  expect(await h.ctx.resend.apply(request)).toEqual({ ok: false, error: { code: 'target-shadowed' } })
  expect(auditCount(state.session)).toBe(1)
  expect(state.calls.followupInputs).toHaveLength(2) // initial failed handoff, one accepted retry
})

it.each(['edit', 'regenerate'])('keeps the actual %s Send again usable after both restrictions and a settings read failure', async op => {
  const { h, state } = await durable()
  const a = await pageFor(h)
  await a.dom.act(async () => {
    await a.face.preferences.set('restrictEditToLastUserMessage', false)
    await a.face.preferences.set('restrictRegenerateToLastReply', false)
  })
  let disconnected = false
  const b = await pageFor(h, { failRead: () => disconnected })
  if (op === 'edit') {
    await b.dom.click(b.button(0, 'Edit'))
    await b.dom.change(b.dom.container.querySelector('textarea'), '补发必须保留的准确中文\n第二行')
    await b.dom.click(b.button(0, 'Send'))
  } else await b.dom.click(b.button(3, 'Regenerate', 'reply'))
  await b.dom.act(async () => { await vi.waitFor(() => expect(b.answers).toHaveLength(1)) })
  const first = b.answers[0]
  expect(first.ok).toBe(true)
  expect(first.value.resendMessageId).toBeUndefined()
  const rewound = logOf(state.session)
  await b.refill()
  await a.dom.act(async () => {
    await a.face.preferences.set('restrictEditToLastUserMessage', true)
    await a.face.preferences.set('restrictRegenerateToLastReply', true)
  })
  disconnected = true
  await b.dom.act(async () => { await b.settings.forms.describe().load() })
  expect(b.face.preferences.getSnapshot().ready).toBe(false)
  const retry = () => b.dom.container.querySelector('button[aria-label="Send again"]')
  expect(retry().disabled).toBe(false)
  state.agent.status = 'running'
  await b.dom.click(retry())
  await b.dom.act(async () => { await vi.waitFor(() => expect(b.answers).toHaveLength(2)) })
  expect(b.answers.at(-1)).toEqual({ ok: false, error: { code: 'agent-busy' } })
  expect(logOf(state.session)).toEqual(rewound)
  state.agent.status = 'idle'
  state.covering = { error: 'SESSION_QUERY_REPLAY_FAILED' }
  await b.dom.click(retry())
  await b.dom.act(async () => { await vi.waitFor(() => expect(b.answers).toHaveLength(3)) })
  expect(b.answers.at(-1).ok).toBe(false)
  expect(logOf(state.session)).toEqual(rewound)
  state.covering = 'live'
  const request = { sessionId: 'session-1', op, targetSeq: op === 'edit' ? 6 : 9,
    ...(op === 'edit' ? { text: 'different target must not claim the exception' } : {}) }
  expect((await dispatchToHost(h, 'resend/apply', { request })).value.ok).toBe(false)
  expect(state.calls.followups).toBe(1)
  state.agent = agentDoubles(state).delivering()
  await b.dom.click(retry())
  await b.dom.act(async () => { await vi.waitFor(() => expect(b.answers).toHaveLength(4)) })
  expect(b.answers.at(-1)).toMatchObject({ ok: true, value: { carrierSeq: first.value.carrierSeq, resendMessageId: expect.any(String) } })
  expect(retry()).toBeNull()
  expect(auditCount(state.session)).toBe(1)
  expect(state.calls.flushes).toBe(1)
  expect(logOf(state.session).slice(0, rewound.length)).toEqual(rewound)
  expect(logOf(state.session).at(-1).data.content).toEqual([{ type: 'text', text: op === 'edit' ? '补发必须保留的准确中文\n第二行' : 'first prompt' }])
  expect(state.calls.followups).toBe(2)
})

it.each(['refused', 'committed-no-answer'])('re-reads the true saved restriction after %s while preserving the second-page draft', async failure => {
  const { h } = await durable()
  let failed = false
  const a = await pageFor(h, { write: async run => {
    if (!failed) return run()
    if (failure === 'committed-no-answer') await run()
    throw new Error('lost settings response')
  } })
  await a.dom.act(async () => { await a.face.preferences.set('restrictEditToLastUserMessage', false) })
  const b = await pageFor(h)
  await b.dom.click(b.button(0, 'Edit'))
  const textarea = b.dom.container.querySelector('textarea')
  await b.dom.change(textarea, '保存异常期间继续保留的草稿')
  failed = true
  await a.dom.act(async () => {
    expect(await a.face.preferences.set('restrictEditToLastUserMessage', true)).toBe(false)
    await vi.waitFor(() => expect(b.face.preferences.getSnapshot().restrictEditToLastUserMessage).toBe(failure === 'committed-no-answer'))
  })
  expect(a.face.preferences.getSnapshot()).toMatchObject({ ready: true, status: 'save-error', restrictEditToLastUserMessage: failure === 'committed-no-answer' })
  expect(b.button(0, 'Send').disabled).toBe(failure === 'committed-no-answer')
  expect(b.dom.container.querySelector('textarea')).toBe(textarea)
  expect(textarea.value).toBe('保存异常期间继续保留的草稿')
  await b.dom.change(textarea, '保存异常后仍可继续修改')
  failed = false
  await a.dom.act(async () => { expect(await a.face.preferences.retry()).toBe(true) })
  expect(a.face.preferences.getSnapshot()).toMatchObject({ ready: true, status: 'ready', restrictEditToLastUserMessage: true })
  expect(b.button(0, 'Send').disabled).toBe(true)
  expect(textarea.value).toBe('保存异常后仍可继续修改')
  expect(h.settings.describe()[0].value.restrictEditToLastUserMessage).toBe(true)
})

it.each(['edit', 'regenerate'].flatMap(op => ['rule', 'target'].map(change => ({ op, change }))))(
  'rechecks $op after queued $change changes using the actual saved Profile', async ({ op, change }) => {
    const { h, state } = await durable()
    const a = await pageFor(h)
    const field = op === 'edit' ? 'restrictEditToLastUserMessage' : 'restrictRegenerateToLastReply'
    if (change === 'rule') await a.dom.act(async () => { await a.face.preferences.set(field, false) })
    appendUser(state.session, { id: 'third-user', text: 'third question' })
    state.session.append('turn/start', { turn: 3 })
    state.session.append('step/start', { turn: 3, step: 1 })
    appendReply(state.session, { id: 'third-reply', text: 'third reply', turn: 3 })
    state.session.append('step/end', { turn: 3, step: 1 })
    state.session.append('turn/end', { turn: 3, reason: { kind: 'completed' } })
    const sessions = h.ctx.get('sessions')
    const flush = sessions.flush.bind(sessions)
    let release, entered
    const waiting = new Promise(resolve => { entered = resolve })
    sessions.flush = async session => { entered(); await new Promise(resolve => { release = resolve }); return flush(session) }
    const first = h.ctx.resend.apply({ sessionId: 'session-1', op, targetSeq: op === 'edit' ? 12 : 15,
      ...(op === 'edit' ? { text: 'third question edited' } : {}) })
    await waiting
    const queued = h.ctx.resend.apply({ sessionId: 'session-1', op,
      targetSeq: op === 'edit' ? change === 'rule' ? 0 : 6 : change === 'rule' ? 3 : 9,
      ...(op === 'edit' ? { text: 'queued edited text' } : {}) })
    try {
      if (change === 'rule') await a.dom.act(async () => { await a.face.preferences.set(field, true) })
      else {
        appendUser(state.session, { id: 'newest-user', text: 'latest question while queued' })
        appendReply(state.session, { id: 'newest-reply', text: 'latest reply while queued', turn: 4 })
      }
    } finally { release() }
    expect((await first).ok).toBe(true)
    expect(await queued).toEqual({ ok: false, error: { code: op === 'edit' ? 'not-last-user-message' : 'not-last-reply' } })
    expect(auditCount(state.session)).toBe(1)
    expect(state.calls.followups).toBe(1)
    expect(state.calls.flushes).toBe(1)
  },
)
