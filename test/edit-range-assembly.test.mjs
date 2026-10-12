import { expect, it } from 'vitest'
import { createElement } from 'react'
import { clientHalf } from '../scripts/client-bundle.mjs'
import { clientComposition } from './helpers/client.mjs'
import { hostComposition, dispatchToHost, clientComposition as gatewayClient } from './helpers/gateway.mjs'
import { installedConversationAssembler, assemblerChatSnapshot, installedChatDefinitions } from './helpers/conversation-assembler.mjs'
import { renderDom, editorText } from './helpers/render.mjs'
import { resolveHostApp } from '../scripts/host-app.mjs'
import { measuredFixture, hostState, appendUser, logOf } from './helpers/host.mjs'
import { memoryConfigForms } from './helpers/preferences.mjs'

it.skipIf(!resolveHostApp())('uses the installed assembler and actual Host eligibility for paging, live image-only sends, injections and rewind', async () => {
  const session = measuredFixture()
  const events = logOf(session)
  const h = await hostComposition({ host: hostState({ session, agent: 'deaf' }) })
  const gateway = await gatewayClient((endpoint, payload, signal) => dispatchToHost(h, endpoint, payload.args, signal))
  const c = await clientComposition({ ctx: gateway, configForms: memoryConfigForms({ restrictEditToLastUserMessage: true }) })
  const page = clientHalf().exports
  await c.ctx.plugin(page)
  const assembler = installedConversationAssembler([...installedChatDefinitions(), ...c.record.definitions])
  const registration = c.record.mounts.find(entry => ['user', page.USER_ACTIONS_KIND].includes(entry.options.key))
  let chat
  const rows = () => createElement('div', null, [...chat.nodes.values()].filter(node => node.kind === 'user').map(node =>
    createElement('div', { key: node.key, 'data-user-seq': node.anchorSeq }, createElement(registration.component, {
      ...registration.options.inject(session.id), sessionId: session.id,
      node: registration.options.key === 'user' ? node : { ...node, data: {
        seq: node.anchorSeq, text: page.userMessageText(node.data),
      } },
      t: c.ctx.get('locale').bind('dsh-resend'),
      useChat: select => select(chat), useSession: select => select({ running: false }),
      useInput: select => select(c.record.input), inputActions: { setDraft: text => c.record.draftWrites.push(text) },
    }))))
  assembler.replaceWindow(events.slice(0, 6).map(event => ({ type: 'durable', event })), true)
  chat = assemblerChatSnapshot(assembler)
  const dom = await renderDom(rows())
  const edit = seq => dom.container.querySelector('[data-user-seq="' + seq + '"] button[aria-label="Edit"]')
    ?? dom.container.querySelector('[data-user-seq="' + seq + '"] button[aria-label="Send"]')
  const show = async () => { chat = assemblerChatSnapshot(assembler); await dom.render(rows()) }
  try {
    expect(edit(0).disabled).toBe(true)
    assembler.replaceWindow(events.slice(6).map(event => ({ type: 'durable', event })), true)
    await show()
    expect(edit(6).disabled).toBe(false)
    assembler.prepend(events.slice(0, 6).map(event => ({ type: 'durable', event })), false)
    await show()
    expect(edit(0).disabled).toBe(true)
    await dom.click(edit(6))
    await dom.change(dom.container.querySelector('[role="textbox"]'), '历史加载后保留的草稿')
    const textarea = dom.container.querySelector('[role="textbox"]')
    const injection = appendUser(session, { id: 'context', text: 'host injection', source: 'host' })
    assembler.append({ type: 'durable', event: injection })
    await show()
    expect(edit(6).disabled).toBe(false)
    expect(edit(injection.seq)).toBeNull()
    const image = session.append('user/message', { role: 'user', id: 'image', content: [], source: { kind: 'user' } }, { surfaceOp: 'append' })
    assembler.append({ type: 'durable', event: image })
    await show()
    expect(edit(6).disabled).toBe(true)
    expect(edit(image.seq).disabled).toBe(true)
    expect(edit(image.seq).parentElement.getAttribute('aria-label')).toBe('This message has no editable text')
    expect(dom.container.querySelector('[role="textbox"]')).toBe(textarea)
    expect(editorText(textarea)).toBe('历史加载后保留的草稿')
    await dom.key(textarea, 'Enter')
    expect(h.host.calls.followups).toBe(0)
    const before = session.seq
    // Replay removes the image and injected context; the earlier real user is last again.
    expect((await h.ctx.resend.apply({ sessionId: session.id, targetSeq: image.seq, op: 'edit', text: 'image question edited' })).ok).toBe(true)
    for (const event of logOf(session).slice(before)) assembler.append({ type: 'durable', event })
    await show()
    expect(edit(6).disabled).toBe(false)
    expect(editorText(textarea)).toBe('历史加载后保留的草稿')
    assembler.replaceWindow(logOf(session).map(event => ({ type: 'durable', event })), false)
    await show()
    expect(edit(6).disabled).toBe(false)
    expect(edit(image.seq)).toBeNull()
  } finally { await dom.cleanup(); await gateway.fiber.dispose(); await h.ctx.fiber.dispose() }
})
