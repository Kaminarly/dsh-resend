import { afterEach, describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { clientHalf } from '../scripts/client-bundle.mjs'
import { renderDom } from './helpers/render.mjs'
import { resolveConfig } from '@deepseek-ai/cordis'
import * as host from '../lib/index.js'
import { settingsHost, settingsClientProvider } from './helpers/settings-host.mjs'
import { mkdir, mkdtemp } from 'node:fs/promises'
import { tmpDir } from './helpers/dsh.mjs'
import path from 'node:path'
import { clientComposition } from './helpers/client.mjs'
import { hostState } from './helpers/host.mjs'

const resources = []
afterEach(async () => {
  for (const resource of resources.splice(0).reverse()) await resource.close()
})
async function durable(name = 'first') {
  await mkdir(tmpDir, { recursive: true })
  const home = await mkdtemp(path.join(tmpDir, 'saved-preferences-'))
  const h = await settingsHost(home, name)
  resources.push(h)
  return h
}
async function clientFor(h, faults) {
  const client = await settingsClientProvider(h, faults)
  resources.push(client)
  return client
}
const tick = async () => { await new Promise(resolve => setTimeout(resolve, 0)) }

// ConfigForms is the host service boundary; the durable integration below
// also exercises the installed SettingsForms/ConfigEditor and profile files.
function formsFixture(value = {}) {
  let snapshot = { status: 'ready', view: { writable: true, namespaces: [{ ns: 'dsh-resend', value }] }, error: null }
  const listeners = new Set()
  const mirror = {
    getSnapshot: () => snapshot,
    subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn) },
    ensure: async () => {}, load: async () => {},
  }
  const publish = (next) => { snapshot = next; listeners.forEach(fn => fn()) }
  const form = {
    getSnapshot: () => ({ mode: 'host' }),
    set: async (field, next) => {
      publish({ ...snapshot, view: { ...snapshot.view, namespaces: [{ ns: 'dsh-resend', value: { ...snapshot.view.namespaces[0].value, [field]: next } }] } })
      return true
    },
  }
  return { get: () => form, describe: () => mirror, form, mirror, publish }
}

describe('saved display preferences', () => {
  it('persists edit range independently and applies the saved rule without remounting', async () => {
    const state = hostState({ agent: 'delivering' })
    await mkdir(tmpDir, { recursive: true })
    const home = await mkdtemp(path.join(tmpDir, 'saved-edit-range-'))
    const h = await settingsHost(home, 'edit-range', state)
    resources.push(h)
    const first = await clientFor(h)
    const page = clientHalf().exports
    page.preferences.connect(first.forms)
    const request = { sessionId: 'session-1', targetSeq: 0, op: 'edit', text: '修改后的准确文字\n第二行' }
    const fiber = h.entry.fiber
    expect(page.preferences.getSnapshot().restrictEditToLastUserMessage).toBe(true)
    expect(await h.ctx.resend.apply(request)).toEqual({ ok: false, error: { code: 'not-last-user-message' } })
    expect(await page.preferences.set('restrictEditToLastUserMessage', false)).toBe(true)
    const second = await clientFor(h)
    const fresh = clientHalf().exports
    fresh.preferences.connect(second.forms)
    expect(fresh.preferences.getSnapshot()).toMatchObject({ ready: true, restrictEditToLastUserMessage: false, restrictRegenerateToLastReply: true })
    expect(h.entry.fiber).toBe(fiber)
    expect((await h.ctx.resend.apply(request)).ok).toBe(true)
    expect(state.calls.followupInputs[0].content).toEqual([{ type: 'text', text: request.text }])
  })
  it('persists the independent regenerate range through the installed host and a fresh page', async () => {
    const h = await durable()
    const first = await clientFor(h)
    const page = clientHalf().exports
    page.preferences.connect(first.forms)
    expect(page.preferences.getSnapshot().restrictRegenerateToLastReply).toBe(true)
    expect(await page.preferences.set('restrictRegenerateToLastReply', false)).toBe(true)
    expect(await page.preferences.set('regenerateLastReply', false)).toBe(true)
    const second = await clientFor(h)
    const fresh = clientHalf().exports
    fresh.preferences.connect(second.forms)
    expect(fresh.preferences.getSnapshot()).toMatchObject({ restrictRegenerateToLastReply: false, regenerateLastReply: false, inlineEditorBeneathMessage: true })
    expect(await fresh.preferences.set('regenerateLastReply', true)).toBe(true)
    expect(fresh.preferences.getSnapshot().restrictRegenerateToLastReply).toBe(false)
    expect(h.settings.describe()[0].value.restrictRegenerateToLastReply).toBe(false)
  })
  it('enforces the actual saved Profile rule through the direct operation service without remounting', async () => {
    await mkdir(tmpDir, { recursive: true })
    const home = await mkdtemp(path.join(tmpDir, 'saved-range-policy-'))
    const state = hostState({ agent: 'delivering' })
    const h = await settingsHost(home, 'range', state)
    resources.push(h)
    const client = await clientFor(h)
    const page = clientHalf().exports
    page.preferences.connect(client.forms)
    const service = h.ctx.resend
    const fiber = h.entry.fiber
    const request = { sessionId: 'session-1', targetSeq: 1, op: 'regenerate' }
    expect(await service.apply(request)).toEqual({ ok: false, error: { code: 'not-last-reply' } })
    expect(await page.preferences.set('restrictRegenerateToLastReply', false)).toBe(true)
    expect(h.entry.fiber === fiber).toBe(true)
    expect((await service.apply(request)).ok).toBe(true)
    expect(state.calls.followupInputs[0].content).toEqual([{ type: 'text', text: 'first prompt' }])
  })
  it('does not let a delayed successful response overwrite a newer save from another page', async () => {
    const h = await durable()
    let release
    let committed
    const whenCommitted = new Promise(resolve => { committed = resolve })
    const first = await clientFor(h, { write: async run => {
      const response = await run()
      committed()
      return new Promise(resolve => { release = () => resolve(response) })
    } })
    const second = await clientFor(h)
    const a = clientHalf().exports
    const b = clientHalf().exports
    a.preferences.connect(first.forms); b.preferences.connect(second.forms)
    const firstSave = a.preferences.set('regenerateLastReply', false)
    await whenCommitted
    await second.forms.describe().load()
    expect(b.preferences.getSnapshot().regenerateLastReply).toBe(false)
    expect(await b.preferences.set('regenerateLastReply', true)).toBe(true)
    await first.forms.describe().load()
    release()
    await firstSave
    expect(a.preferences.getSnapshot()).toMatchObject({ ready: true, status: 'ready', regenerateLastReply: true })
    expect(h.settings.describe()[0].value.regenerateLastReply).toBe(true)
  })
  it('keeps the open draft and formal values while saving, and retains editing/cancel during a read failure', async () => {
    const h = await durable()
    let finish
    let disconnected = false
    const client = await clientFor(h, { failRead: () => disconnected, write: run => new Promise(resolve => {
      finish = async () => { const result = await run(); await tick(); resolve(result) }
    }) })
    const page = clientHalf().exports
    const composition = await clientComposition({ configForms: client.forms })
    resources.push({ close: () => composition.ctx.fiber.dispose() })
    await composition.ctx.plugin(page); await tick()
    const registration = composition.record.mounts.find(row => row.options.key === 'dsh-resend-user-actions')
    const nodes = new Map([
      ['user-2', { key: 'user-2', kind: 'user', anchorSeq: 2 }],
      ['actions', { key: 'actions', kind: 'dsh-resend-user-actions', anchorSeq: 2, data: { seq: 2, text: 'original' } }],
    ])
    const props = {
      sessionId: 'session-1', node: nodes.get('actions'), t: composition.ctx.get('locale').bind('dsh-resend'),
      useChat: select => select({ nodes }), useSession: select => select({ running: false }),
      useInput: select => select({ phase: 'plain' }), inputActions: { setDraft: text => composition.record.draftWrites.push(text) },
      ...(registration.options.inject?.('session-1') ?? {}),
    }
    const dom = await renderDom(createElement(registration.component, props))
    const button = label => [...dom.container.querySelectorAll('button')].find(button => button.getAttribute('aria-label') === label || button.textContent === label)
    try {
      await dom.click(button('Edit'))
      const textarea = dom.container.querySelector('textarea')
      await dom.change(textarea, '草稿不会丢失')
      let save
      await dom.act(async () => { save = page.preferences.set('inlineEditorBeneathMessage', false); await tick() })
      expect(page.preferences.getSnapshot()).toMatchObject({ status: 'saving', inlineEditorBeneathMessage: true })
      // Host invalidation arrives before the write response is delivered.
      const complete = finish()
      await tick()
      expect(page.preferences.getSnapshot().inlineEditorBeneathMessage).toBe(true)
      await dom.act(async () => { await complete; await save })
      expect(dom.container.querySelector('textarea')).toBe(textarea)
      expect(textarea.value).toBe('草稿不会丢失')
      expect(page.preferences.getSnapshot().inlineEditorBeneathMessage).toBe(false)
      disconnected = true
      await dom.act(async () => { await client.forms.describe().load() })
      expect(button('Send').disabled).toBe(true)
      expect(button('Edit in the composer').disabled).toBe(true)
      expect(textarea.disabled).toBe(false)
      await dom.key(textarea, 'Enter')
      await dom.click(button('Edit in the composer'))
      expect(composition.calls).toEqual([])
      expect(composition.record.draftWrites).toEqual([])
      await dom.change(textarea, '读取失败后仍可修改')
      await dom.click(button('Cancel'))
      expect(dom.container.querySelector('textarea')).toBeNull()
    } finally { await dom.cleanup() }
  })
  it('renders loading and read failures without enabling message actions, then retries against the host', async () => {
    const h = await durable()
    let disconnected = true
    const client = await clientFor(h, { failRead: () => disconnected })
    const page = clientHalf().exports
    const composition = await clientComposition({ configForms: client.forms })
    resources.push({ close: () => composition.ctx.fiber.dispose() })
    await composition.ctx.plugin(page)
    await tick()
    const row = composition.record.mounts.find(row => row.options.id === 'dsh-resend-preferences')
    const dom = await renderDom(createElement(row.component))
    try {
      expect(dom.container.textContent).toContain('Could not read settings. Please retry.')
      expect([...dom.container.querySelectorAll('button.dsh-resend-settings-toggle')].every(button => button.disabled)).toBe(true)
      expect(page.preferences.getSnapshot().ready).toBe(false)
      disconnected = false
      await dom.click([...dom.container.querySelectorAll('button')].find(button => button.textContent === 'Retry'))
      expect(page.preferences.getSnapshot().ready).toBe(true)
      expect(dom.container.querySelector('button.dsh-resend-settings-toggle').disabled).toBe(false)
    } finally { await dom.cleanup() }
  })

  it('synchronizes two installed providers and re-reads missed changes after reconnect', async () => {
    const h = await durable()
    const first = await clientFor(h)
    let disconnected = false
    const second = await clientFor(h, { failRead: () => disconnected })
    const a = clientHalf().exports
    const b = clientHalf().exports
    a.preferences.connect(first.forms); b.preferences.connect(second.forms)
    await a.preferences.set('inlineEditorBeneathMessage', false)
    await second.forms.describe().load()
    expect(b.preferences.getSnapshot().inlineEditorBeneathMessage).toBe(false)
    disconnected = true
    await a.preferences.set('regenerateLastReply', false)
    await second.forms.describe().load()
    expect(b.preferences.getSnapshot().ready).toBe(false)
    disconnected = false
    second.ctx.emit('connection/reset')
    await second.forms.describe().ensure()
    expect(b.preferences.getSnapshot()).toMatchObject({ ready: true, inlineEditorBeneathMessage: false, regenerateLastReply: false })
  })

  it.each(['regenerateLastReply', 'restrictRegenerateToLastReply', 'restrictEditToLastUserMessage'].flatMap(field =>
    ['refused', 'committed-no-answer', 'unconfirmed'].map(failure => ({ field, failure }))))(
    'recovers authoritative $field after $failure and provides a usable retry', async ({ field, failure }) => {
      const h = await durable()
      let failed = true
      let readFails = false
      const client = await clientFor(h, {
        failRead: () => readFails,
        write: async run => {
          if (!failed) return run()
          if (failure !== 'refused') await run()
          if (failure === 'unconfirmed') readFails = true
          throw new Error('simulated lost write response')
        },
      })
      const page = clientHalf().exports
      page.preferences.connect(client.forms)
      expect(await page.preferences.set(field, false)).toBe(false)
      expect(page.preferences.getSnapshot()).toMatchObject(failure === 'unconfirmed'
        ? { ready: false, status: 'read-error' }
        : { ready: true, status: 'save-error', [field]: failure === 'refused' })
      failed = false; readFails = false
      await page.preferences.retry()
      if (failure === 'unconfirmed') await page.preferences.retry()
      expect(page.preferences.getSnapshot()).toMatchObject({ ready: true, [field]: false })
      expect(page.preferences.getSnapshot().status).toBe('ready')
      expect(h.settings.describe()[0].value[field]).toBe(false)
    },
  )
  it('saves through the installed host and restores after both page refresh and host restart, isolating Profiles', async () => {
    await mkdir(tmpDir, { recursive: true })
    const home = await mkdtemp(path.join(tmpDir, 'saved-preferences-'))
    let h = await settingsHost(home, 'first')
    let client = await settingsClientProvider(h)
    const page = clientHalf().exports
    page.preferences.connect(client.forms)
    const fiber = h.entry.fiber
    expect(await page.preferences.set('inlineEditorBeneathMessage', false)).toBe(true)
    expect(await page.preferences.set('regenerateLastReply', false)).toBe(true)
    expect(h.entry.fiber).toBe(fiber)
    expect(h.settings.describe()[0].value).toEqual({ inlineEditorBeneathMessage: false, regenerateLastReply: false, restrictRegenerateToLastReply: true, restrictEditToLastUserMessage: true })
    expect(await page.preferences.set('restrictRegenerateToLastReply', false)).toBe(true)
    expect(await page.preferences.set('restrictEditToLastUserMessage', false)).toBe(true)
    await client.close()
    client = await settingsClientProvider(h)
    const refreshed = clientHalf().exports
    refreshed.preferences.connect(client.forms)
    expect(refreshed.preferences.getSnapshot()).toMatchObject({ ready: true, inlineEditorBeneathMessage: false, regenerateLastReply: false, restrictRegenerateToLastReply: false, restrictEditToLastUserMessage: false })
    await client.close(); await h.close()
    h = await settingsHost(home, 'first')
    client = await settingsClientProvider(h)
    const restarted = clientHalf().exports
    restarted.preferences.connect(client.forms)
    expect(restarted.preferences.getSnapshot()).toMatchObject({ ready: true, inlineEditorBeneathMessage: false, regenerateLastReply: false, restrictRegenerateToLastReply: false, restrictEditToLastUserMessage: false })
    const other = await settingsHost(home, 'second')
    expect(other.settings.describe()[0].value).toEqual({ inlineEditorBeneathMessage: true, regenerateLastReply: true, restrictRegenerateToLastReply: true, restrictEditToLastUserMessage: true })
    await other.close(); await client.close(); await h.close()
  })
  it('exposes live host fields with independent defaults and keeps legal old values', () => {
    expect(host.Config).toBeDefined()
    const parsed = resolveConfig(host, { inlineEditorBeneathMessage: false, regenerateLastReply: 'false' })
    expect(parsed.inlineEditorBeneathMessage.get()).toBe(false)
    expect(parsed.regenerateLastReply.get()).toBe(true)
    expect(parsed.restrictRegenerateToLastReply.get()).toBe(true)
    expect(parsed.restrictEditToLastUserMessage.get()).toBe(true)
    expect(resolveConfig(host, { restrictRegenerateToLastReply: false }).restrictRegenerateToLastReply.get()).toBe(false)
    expect(host.Config.dict.regenerateLastReply.meta.volatile).toBe(true)
  })
  it('loads authoritative values and updates a second page only after acceptance', async () => {
    const a = clientHalf().exports
    const b = clientHalf().exports
    const forms = formsFixture({ inlineEditorBeneathMessage: false })
    const offA = a.preferences.connect(forms)
    const offB = b.preferences.connect(forms)
    expect(a.preferences.getSnapshot()).toMatchObject({ ready: true, inlineEditorBeneathMessage: false, regenerateLastReply: true })
    let finish
    const original = forms.form.set
    forms.form.set = (...args) => new Promise(resolve => { finish = async () => resolve(await original(...args)) })
    const write = a.preferences.set('regenerateLastReply', false)
    expect(a.preferences.getSnapshot()).toMatchObject({ status: 'saving', regenerateLastReply: true })
    expect(await a.preferences.set('inlineEditorBeneathMessage', true)).toBe(false)
    await finish()
    await write
    expect(b.preferences.getSnapshot()).toMatchObject({ ready: true, regenerateLastReply: false })
    offA(); offB()
  })
})
