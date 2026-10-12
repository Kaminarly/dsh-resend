import { expect, it } from 'vitest'
import { createElement } from 'react'
import { clientHalf } from '../scripts/client-bundle.mjs'
import { renderDom, editorText } from './helpers/render.mjs'
import { memoryConfigForms } from './helpers/preferences.mjs'

async function panel({ files = [{ path: '中文.txt', action: 'restore' }], decision } = {}) {
  const face = clientHalf().exports
  const calls = []
  const preflight = { ok: true, value: { preflight: true, preflightId: 'host-id', planId: 'file-plan', userSeq: 2, op: 'edit', files } }
  const sent = { ok: true, value: { carrierSeq: 8, shadowedSeqs: [2, 3], resendMessageId: 'queued' } }
  const operations = face.createResendOperations({ resend: { replay: async request => {
    calls.push(request)
    return { ok: true, value: request.phase === 'start' ? files.length ? preflight : sent
      : request.phase === 'cancel' ? { ok: true, value: { canceled: true } }
      : decision ? await decision(request) : request.phase === 'preview' ? preflight : sent }
  } } })
  const dom = await renderDom(createElement(face.ReplayPreflight, { operations, sessionId: 's', userSeq: 2, t: key => key }))
  let outcome
  const request = { sessionId: 's', targetSeq: 2, op: 'edit', text: '编辑中文原文' }
  await dom.act(async () => { void operations.run(request).then(result => { outcome = result }) })
  const button = text => [...dom.container.querySelectorAll('button')].find(node => node.textContent === text)
  return { dom, calls, operations, button, outcome: () => outcome }
}

it('opens the existing file panel before sending and offers restore, keep and cancel', async () => {
  const p = await panel()
  try {
    expect(p.dom.container.querySelector('.dsh-resend-rollback')).not.toBeNull()
    expect(p.dom.container.textContent).toContain('中文.txt')
    expect(p.button('replay.restoreCount')).toBeDefined()
    expect(p.button('replay.keep')).toBeDefined()
    expect(p.button('replay.cancel')).toBeDefined()
    expect(p.outcome()).toBeUndefined()
    expect(p.operations.recordsFor('s')).toEqual([])
    await p.dom.click(p.button('replay.restoreCount'))
    expect(p.calls.map(call => call.phase)).toEqual(['start', 'restore'])
    expect(p.outcome().value.resendMessageId).toBe('queued')
    expect(p.dom.container.querySelector('.dsh-resend-rollback')).toBeNull()
  } finally { await p.dom.cleanup(); p.operations.dispose() }
})

it('does not create any file panel for an empty file set', async () => {
  const p = await panel({ files: [] })
  try {
    expect(p.outcome().value.resendMessageId).toBe('queued')
    expect(p.dom.container.querySelector('.dsh-resend-rollback')).toBeNull()
    expect(p.calls.map(call => call.phase)).toEqual(['start'])
  } finally { await p.dom.cleanup(); p.operations.dispose() }
})

it('cancel resolves the waiting editor without recording a rewind', async () => {
  const p = await panel()
  try {
    await p.dom.click(p.button('replay.cancel'))
    expect(p.outcome()).toEqual({ ok: true, value: { canceled: true } })
    expect(p.operations.recordsFor('s')).toEqual([])
    expect(p.calls.map(call => call.phase)).toEqual(['start', 'cancel'])
  } finally { await p.dom.cleanup(); p.operations.dispose() }
})

it('disables all choices during restore and keeps the panel for a recoverable failure', async () => {
  let release
  const p = await panel({ decision: () => new Promise(resolve => { release = resolve }) })
  try {
    await p.dom.click(p.button('replay.restoreCount'))
    expect([...p.dom.container.querySelectorAll('button')].every(button => button.disabled)).toBe(true)
    await p.dom.act(async () => release({ ok: false, error: { code: 'preview-stale', files: [{ path: '中文.txt', action: 'refuse', reason: 'content-diverged' }] } }))
    expect(p.outcome()).toBeUndefined()
    expect(p.dom.container.textContent).toContain('replay.stale')
    expect(p.button('files.retry')).toBeDefined()
    expect(p.button('replay.cancel').disabled).toBe(false)
    expect(p.button('replay.keep').disabled).toBe(false)
    expect(p.operations.recordsFor('s')).toEqual([])
  } finally { await p.dom.cleanup(); p.operations.dispose() }
})

it('keeps refused files visible and continues without offering restore when none are safe', async () => {
  const p = await panel({ files: [{ path: '用户修改.txt', action: 'refuse', reason: 'content-diverged' }] })
  try {
    expect(p.button('replay.restoreCount')).toBeUndefined()
    expect(p.dom.container.textContent).toContain('files.reason.content-diverged')
    await p.dom.click(p.button('replay.keep'))
    expect(p.calls.map(call => call.phase)).toEqual(['start', 'keep'])
    expect(p.outcome().value.resendMessageId).toBe('queued')
  } finally { await p.dom.cleanup(); p.operations.dispose() }
})

it('removes the historical file panel after reading an empty record', async () => {
  const face = clientHalf().exports
  const dom = await renderDom(createElement(face.FileRollbackPreview, { point: { sessionId: 's', carrierSeq: 8 },
    operations: { rollback: async () => ({ ok: true, value: { planId: '', completed: false, empty: true, files: [] } }) }, t: key => key }))
  try { expect(dom.container.querySelector('.dsh-resend-rollback')).toBeNull() }
  finally { await dom.cleanup() }
})

it('cancel from the actual editor preserves the draft and shows no failure notice', async () => {
  const face = clientHalf().exports
  const preferences = face.createPreferences()
  const disconnect = preferences.connect(memoryConfigForms({ inlineEditorBeneathMessage: true }))
  const preflight = { ok: true, value: { preflight: true, preflightId: 'host-id', planId: 'plan', userSeq: 2, op: 'edit',
    files: [{ path: '中文.txt', action: 'restore' }] } }
  const operations = face.createResendOperations({ resend: {
    conversation: async () => ({ ok: true, value: { ok: true, value: { assistantSeqs: [], userSeqs: [2], lastUserSeq: 2 } } }),
    replay: async request => ({ ok: true, value: request.phase === 'start' ? preflight : { ok: true, value: { canceled: true } } }),
  } })
  const node = { key: 'u2', kind: 'user', anchorSeq: 2, data: { seq: 2, text: '中文原文' } }
  const snapshot = { nodes: new Map([[node.key, node]]) }
  const dom = await renderDom(createElement(face.UserActionsRow, { node, operations, preferences, sessionId: 's', t: key => key,
    useChat: select => select(snapshot), useSession: select => select({ running: false }), useInput: select => select({ phase: 'plain' }) }))
  try {
    await dom.click(dom.container.querySelector('button[aria-label="row.edit"]'))
    await dom.change(dom.container.querySelector('[role="textbox"]'), '取消后仍应保留的中文草稿')
    await dom.click(dom.container.querySelector('button[aria-label="row.send"]'))
    await dom.click([...dom.container.querySelectorAll('button')].find(button => button.textContent === 'replay.cancel'))
    expect(editorText(dom.container.querySelector('[role="textbox"]'))).toBe('取消后仍应保留的中文草稿')
    expect((dom.container.querySelector('[role="textbox"]').getAttribute('aria-disabled') === 'true')).toBe(false)
    expect(dom.container.querySelector('[role="alert"]')).toBeNull()
    expect(operations.recordsFor('s')).toEqual([])
  } finally { await dom.cleanup(); operations.dispose(); disconnect() }
})

it('keeps a fallback panel available when the original user message is outside the current window', async () => {
  const p = await panel()
  await p.dom.cleanup()
  const face = clientHalf().exports
  const dom = await renderDom(createElement(face.ReplayPreflight, { operations: p.operations, sessionId: 's', targetSeq: 2, visibleUserSeqs: [], t: key => key }))
  try {
    const dialog = document.querySelector('[role="dialog"]')
    expect(dialog).not.toBeNull()
    expect(dialog.textContent).toContain('中文.txt')
    const anchor = dialog.querySelector('[tabindex="-1"]')
    await dom.key(anchor, 'Escape')
    expect(p.outcome().value.canceled).toBe(true)
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  } finally { await dom.cleanup(); p.operations.dispose() }
})

it('does not recreate a plan when its first response arrives after the plugin was disposed', async () => {
  const face = clientHalf().exports
  let release
  const operations = face.createResendOperations({ resend: { replay: () => new Promise(resolve => { release = resolve }) } })
  const running = operations.run({ sessionId: 's', targetSeq: 2, op: 'edit', text: '草稿' })
  operations.dispose()
  release({ ok: true, value: { ok: true, value: { preflight: true, userSeq: 2, preflightId: 'late', files: [] } } })
  expect(await running).toEqual({ ok: true, value: { canceled: true } })
  expect(operations.preflightFor('s')).toBeUndefined()
  expect(operations.recordsFor('s')).toEqual([])
})

it('ignores repeated choices while the first restore response is pending', async () => {
  let release
  const p = await panel({ decision: () => new Promise(resolve => { release = resolve }) })
  try {
    let first
    await p.dom.act(async () => {
      first = p.operations.chooseReplay('s', 'restore')
      await p.operations.chooseReplay('s', 'keep')
      await p.operations.chooseReplay('s', 'cancel')
    })
    expect(p.calls.map(call => call.phase)).toEqual(['start', 'restore'])
    await p.dom.act(async () => {
      release({ ok: true, value: { carrierSeq: 8, shadowedSeqs: [2, 3], resendMessageId: 'queued' } })
      await first
    })
    expect(p.outcome().value.resendMessageId).toBe('queued')
  } finally { await p.dom.cleanup(); p.operations.dispose() }
})

it('can close a plan invalidated by a fresh action in another page', async () => {
  const p = await panel({ decision: async () => ({ ok: false, error: { code: 'plan-not-found' } }) })
  try {
    await p.dom.click(p.button('replay.restoreCount'))
    expect(p.outcome()).toBeUndefined()
    await p.dom.click(p.button('replay.cancel'))
    expect(p.outcome().value.canceled).toBe(true)
    expect(p.operations.recordsFor('s')).toEqual([])
  } finally { await p.dom.cleanup(); p.operations.dispose() }
})
