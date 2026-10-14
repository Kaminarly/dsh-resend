import { expect, it } from 'vitest'
import { createElement as h } from 'react'
import { clientHalf } from '../scripts/client-bundle.mjs'
import { renderDom } from './helpers/render.mjs'

const { FileRollbackPreview, ReplayPreflight, createResendOperations } = clientHalf().exports
const files = [{ path: 'src/中文/file.txt', action: 'restore', operation: 'delete' }, { path: 'refused.txt', action: 'refuse', reason: 'content-diverged' }]
const value = { status: 'ready', action: 'delete', sizes: { current: 20, target: 0 },
  current: { exists: true, bytes: 20, lines: 1, bom: false, eol: 'lf', finalNewline: true },
  target: { exists: false, bytes: 0, lines: 0, bom: false, eol: 'none', finalNewline: false },
  rows: [{ kind: 'delete', text: '<script>window.executed=true</script> 中文', oldLine: 1 }] }
const success = { ok: true, value }

async function panel({ preflight = false, read = async () => success } = {}) {
  const calls = []
  const preview = { ok: true, value: { planId: 'plan', files,
    ...(preflight ? { preflight: true, preflightId: 'preflight', userSeq: 2, op: 'edit' } : {}) } }
  const operations = createResendOperations({ resend: {
    rollback: async request => ({ ok: true, value: request.phase === 'status'
      ? { ok: true, value: { files: [], planId: '' } } : preview }),
    content: async request => { calls.push(request); return { ok: true, value: await read() } },
    replay: async request => {
      calls.push(request)
      return { ok: true, value: request.phase === 'start' ? preview : { ok: true, value: { canceled: true } } }
    },
  } })
  let pending
  if (preflight) { pending = operations.run({ sessionId: 's', targetSeq: 2, op: 'edit', text: 'new' }); await Promise.resolve(); await Promise.resolve() }
  const element = sessionId => preflight ? h(ReplayPreflight, { operations, sessionId, userSeq: 2, portal: true, t: key => key })
    : h(FileRollbackPreview, { operations, point: { sessionId, carrierSeq: 5 }, t: key => key })
  const dom = await renderDom(element('s'))
  if (!preflight) await dom.click([...dom.container.querySelectorAll('button')].find(node => node.textContent === 'files.previewShort'))
  const button = key => [...document.querySelectorAll('button')].find(node => node.textContent === key || node.getAttribute('aria-label') === key)
  const dialog = () => document.querySelector('.dsh-resend-content-dialog')
  const check = () => document.querySelector('li[data-path="src/中文/file.txt"] input')
  return { dom, operations, calls, pending, element, button, dialog, check }
}

it.each([false, true])('views unchecked files as inert text and closes only the foreground dialog (%s)', async preflight => {
  const p = await panel({ preflight })
  try {
    expect(document.querySelector('li[data-path="refused.txt"] .dsh-resend-content-view')).toBeNull()
    expect(document.querySelector('li[data-path="src/中文/file.txt"]').textContent).toContain('content.delete')
    await p.dom.click(p.check())
    expect(p.check().checked).toBe(false)
    const opener = p.button('content.view')
    opener.focus()
    await p.dom.click(opener)
    expect(p.calls.at(-1)).toEqual({ sessionId: 's', planId: 'plan', path: 'src/中文/file.txt',
      ...(preflight ? { source: 'preflight', preflightId: 'preflight' } : { source: 'history', carrierSeq: 5 }) })
    expect(p.dialog().textContent).toContain('<script>window.executed=true</script> 中文')
    expect(p.dialog().querySelector('script')).toBeNull()
    expect(p.dialog().querySelector('input')).toBeNull()
    expect(p.dialog().textContent).toContain('content.direction')
    expect(p.dialog().textContent).toContain('content.legendDelete')
    expect(p.check().checked).toBe(false)
    const close = p.button('content.close')
    close.focus()
    await p.dom.key(close, 'Tab', { shiftKey: true })
    expect(document.activeElement).toBe(p.dialog().querySelector('.dsh-resend-content-body'))
    await p.dom.key(document.activeElement, 'Tab')
    expect(document.activeElement).toBe(close)
    await p.dom.key(close, 'Escape')
    expect(p.dialog()).toBeNull()
    expect(document.activeElement).toBe(opener)
    expect(p.calls.some(call => call.phase === 'cancel')).toBe(false)
    if (preflight) expect(operationsExist(p)).toBe(true)
    await p.dom.key(opener, 'Escape', { repeat: true })
    expect(p.calls.some(call => call.phase === 'cancel')).toBe(false)
    await p.dom.click(opener)
    await p.dom.click(document.querySelector('.host-modal-mask'))
    expect(p.dialog()).toBeNull()
    expect(document.activeElement).toBe(opener)
  } finally { p.operations.dispose(); await p.dom.cleanup(); if (p.pending) await p.pending }
})
const operationsExist = p => !!p.operations.preflightFor('s')

it('shows read failure with retry and unavailable content without changing selection', async () => {
  let reads = 0
  const p = await panel({ read: async () => ++reads === 1 ? { ok: false, error: { code: 'read-failed' } }
    : { ok: true, value: { status: 'unavailable', action: 'delete', sizes: { current: 4000000, target: 0 }, reason: 'too-large' } } })
  try {
    await p.dom.click(p.button('content.view'))
    expect(p.dialog().textContent).toContain('content.failed')
    expect(p.check().checked).toBe(true)
    await p.dom.click(p.button('content.retry'))
    expect(p.dialog().textContent).toContain('content.too-large')
    expect(p.dialog().textContent).toContain('4000000')
    expect(p.dialog().textContent).toContain('content.unavailable')
    expect(p.dialog().querySelector('code')).toBeNull()
    expect(p.check().checked).toBe(true)
  } finally { p.operations.dispose(); await p.dom.cleanup() }
})

it.each(['close', 'session', 'cancel', 'execute', 'dispose', 'reconnect', 'cleanup'])('retires a loading reply after %s', async action => {
  let resolve
  const p = await panel({ read: () => new Promise(done => { resolve = done }) })
  try {
    await p.dom.click(p.button('content.view'))
    expect(p.dialog().textContent).toContain('content.loading')
    if (action === 'close') await p.dom.click(p.button('content.close'))
    if (action === 'session') await p.dom.render(p.element('other'))
    if (action === 'dispose') await p.dom.act(async () => p.operations.dispose())
    if (action === 'reconnect') await p.dom.act(async () => p.operations.invalidateConversations())
    if (action === 'cleanup') await p.dom.act(async () => { await p.operations.cleanup({ phase: 'execute' }).catch(() => {}) })
    // Programmatic background actions simulate another owner initiating them.
    if (action === 'cancel' || action === 'execute') await p.dom.click(p.button(action === 'cancel' ? 'files.cancel' : 'files.executeCount'))
    await p.dom.act(async () => { resolve(success); await Promise.resolve() })
    expect(p.dialog()).toBeNull()
    if (action === 'session') { await p.dom.render(p.element('s')); expect(p.dialog()).toBeNull() }
  } finally { p.operations.dispose(); await p.dom.cleanup() }
})

it('shows plan expiration separately from retryable read failure', async () => {
  const p = await panel({ read: async () => ({ ok: false, error: { code: 'plan-not-found' } }) })
  try {
    await p.dom.click(p.button('content.view'))
    expect(p.dialog().textContent).toContain('content.stale')
    expect(p.button('content.retry')).toBeUndefined()
    expect(p.dialog().querySelector('code')).toBeNull()
  } finally { p.operations.dispose(); await p.dom.cleanup() }
})
