import { afterEach, expect, it } from 'vitest'
import { createElement } from 'react'
import { Session } from '@deepseek-ai/dsh-session'
import { TypertGatewayService } from '@deepseek-ai/dsh-api-gateway'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { clientHalf } from '../scripts/client-bundle.mjs'
import { settingsHost, settingsClientProvider } from './helpers/settings-host.mjs'
import { dispatchToHost } from './helpers/gateway.mjs'
import { installedConversationAssembler, installedChatDefinitions, assemblerChatSnapshot } from './helpers/conversation-assembler.mjs'
import { measuredFixture, hostState, agentDoubles, logOf, auditCount } from './helpers/host.mjs'
import { renderDom } from './helpers/render.mjs'
import { tmpDir } from './helpers/dsh.mjs'

// Spec §9.4's existing seams: durable ConfigForms, strict request entry,
// real Session replay and installed conversation assembly. No model network.
const resources = []
afterEach(async () => { for (const resource of resources.splice(0).reverse()) await resource.close() })
async function durable(state) {
  await mkdir(tmpDir, { recursive: true })
  const home = await mkdtemp(path.join(tmpDir, 'integrated-acceptance-'))
  const host = await settingsHost(home, 'acceptance', state)
  resources.push(host)
  await host.ctx.plugin(TypertGatewayService)
  const client = await settingsClientProvider(host)
  resources.push(client)
  const face = clientHalf().exports
  face.preferences.connect(client.forms)
  return { host, client, face }
}

const combinations = [
  { restrictRegenerate: true, restrictEdit: true },
  { restrictRegenerate: true, restrictEdit: false },
  { restrictRegenerate: false, restrictEdit: true },
  { restrictRegenerate: false, restrictEdit: false },
]
it.each(combinations.flatMap(rules => ['edit', 'regenerate'].flatMap(op => [false, true].map(last => ({ ...rules, op, last })))))
  ('saved ranges regenerate=$restrictRegenerate edit=$restrictEdit govern $op (last=$last) in a new session', async ({ restrictRegenerate, restrictEdit, op, last }) => {
    const state = hostState({ session: measuredFixture(), agent: 'delivering' })
    const { host, face } = await durable(state)
    expect(face.preferences.getSnapshot()).toMatchObject({ ready: true, inlineEditorBeneathMessage: true,
      regenerateLastReply: true, restrictRegenerateToLastReply: false, restrictEditToLastUserMessage: false })
    await face.preferences.set('restrictRegenerateToLastReply', restrictRegenerate)
    await face.preferences.set('restrictEditToLastUserMessage', restrictEdit)
    // Hide, modify the independent range, then show again without losing it.
    await face.preferences.set('regenerateLastReply', false)
    await face.preferences.set('restrictRegenerateToLastReply', !restrictRegenerate)
    await face.preferences.set('restrictRegenerateToLastReply', restrictRegenerate)
    await face.preferences.set('regenerateLastReply', true)
    expect(host.settings.describe()[0].value).toEqual({ inlineEditorBeneathMessage: true,
      regenerateLastReply: true, restrictRegenerateToLastReply: restrictRegenerate, restrictEditToLastUserMessage: restrictEdit })
    // Same live Profile, freshly created conversation, same saved policy.
    state.session = measuredFixture('new-conversation')
    state.agent = agentDoubles(state).delivering()
    const original = logOf(state.session)
    const targetSeq = op === 'edit' ? last ? 6 : 0 : last ? 9 : 3
    const request = { sessionId: 'new-conversation', targetSeq, op,
      ...(op === 'edit' ? { text: '联合验收修改后的准确中文\n第二行 @文件 /技能' } : {}) }
    const response = await dispatchToHost(host, 'resend/apply', { request })
    expect(response.ok).toBe(true)
    const limited = op === 'edit' ? restrictEdit : restrictRegenerate
    if (limited && !last) {
      expect(response.value).toEqual({ ok: false, error: { code: op === 'edit' ? 'not-last-user-message' : 'not-last-reply' } })
      expect(logOf(state.session)).toEqual(original)
      expect(state.calls.flushes).toBe(0)
      expect(state.calls.followups).toBe(0)
    } else {
      expect(response.value).toMatchObject({ ok: true, value: { shadowedSeqs: last ? [6, 9] : [0, 3, 6, 9] } })
      expect(state.calls.followups).toBe(1)
      expect(state.calls.followupInputs[0].content).toEqual([{ type: 'text', text: op === 'edit' ? request.text : last ? 'second prompt' : 'first prompt' }])
      expect(state.session.surface.nodes).toEqual(last ? [0, 3, 13, 14] : [13, 14])
      expect(logOf(state.session).slice(0, 12)).toEqual(original)
      expect(auditCount(state.session)).toBe(1)
    }
  })

it.each(['edit', 'regenerate'])('restores saved settings and fixed hiding from persisted %s history after restarting the isolated host', async op => {
  const state = hostState({ session: measuredFixture(), agent: 'delivering' })
  const { host, client, face } = await durable(state)
  for (const field of face.preferences.fields) expect(await face.preferences.set(field, false)).toBe(true)
  const original = logOf(state.session)
  const request = { sessionId: state.session.id, targetSeq: op === 'edit' ? 0 : 3, op,
    ...(op === 'edit' ? { text: '重启后仍保留的中文原文\n第二行' } : {}) }
  const result = await dispatchToHost(host, 'resend/apply', { request })
  expect(result.value.ok).toBe(true)
  const file = path.join(host.profile.home, 'session-log.json')
  await writeFile(file, JSON.stringify(logOf(state.session)), 'utf8')
  await client.close(); await host.close()
  resources.splice(resources.indexOf(client), 1); resources.splice(resources.indexOf(host), 1)
  state.session = Session.create('session-1', JSON.parse(await readFile(file, 'utf8')))
  state.agent = agentDoubles(state).delivering()
  const restarted = await settingsHost(host.profile.home, 'acceptance', state)
  resources.push(restarted)
  const freshClient = await settingsClientProvider(restarted)
  resources.push(freshClient)
  const fresh = clientHalf().exports
  fresh.preferences.connect(freshClient.forms)
  expect(fresh.preferences.getSnapshot()).toMatchObject({ ready: true, inlineEditorBeneathMessage: false,
    regenerateLastReply: false, restrictRegenerateToLastReply: false, restrictEditToLastUserMessage: false })
  expect(logOf(state.session).slice(0, 12)).toEqual(original)
  expect(state.session.surface.nodes).toEqual([13, 14])
  const assembler = installedConversationAssembler([...installedChatDefinitions({ turnTail: true }), fresh.REWIND_ROW_DEFINITION, fresh.SURFACE_SHADOW_DEFINITION])
  assembler.replaceWindow(logOf(state.session).map(event => ({ type: 'durable', event })), false)
  const chat = assemblerChatSnapshot(assembler)
  const point = [...chat.nodes.values()].find(node => node.kind === fresh.REWIND_ROW_KIND)
  const surface = fresh.rewindRowSurface(fresh.createResendOperations({}), fresh.preferences)
  const dom = await renderDom(createElement('div', null, [
    ...[...chat.nodes.values()].filter(node => node.kind === 'user' || node.kind === 'turn-tail').map(node =>
      createElement('div', { key: node.key, 'data-chat-anchor-key': node.key, 'data-seq': node.anchorSeq }, 'row')),
    createElement(surface, { key: 'rewind', node: point, sessionId: 'session-1', t: key => key, useChat: select => select(chat) }),
  ]))
  resources.push({ close: () => dom.cleanup() })
  const oldUser = dom.container.querySelector('[data-seq="0"]')
  const newUser = dom.container.querySelector('[data-seq="14"]')
  expect(window.getComputedStyle(oldUser).display).toBe('none')
  expect(window.getComputedStyle(newUser).display).not.toBe('none')
  await dom.click(dom.container.querySelector('button[aria-label="row.dismiss"]'))
  expect(dom.container.textContent).not.toContain('row.hiddenCount')
  expect(window.getComputedStyle(oldUser).display).toBe('none')
  expect(window.getComputedStyle(newUser).display).not.toBe('none')
})
