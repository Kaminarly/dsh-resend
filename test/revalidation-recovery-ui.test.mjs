import { expect, it } from 'vitest'
import { createElement as h } from 'react'
import { clientHalf } from '../scripts/client-bundle.mjs'
import { renderDom } from './helpers/render.mjs'

const { FileRollbackPreview, ReplayPreflight, createResendOperations } = clientHalf().exports
const files = ['a.txt', 'b.txt', 'c.txt'].map(path => ({ path, action: 'restore' }))
const plan = (id, members = files, selected) => ({ ok: true, value: { planId: id, files: members,
  preflight: true, preflightId: 'preflight', userSeq: 2, op: 'edit', ...(selected ? { selected } : {}) } })
const content = text => ({ ok: true, value: { status: 'ready', action: 'restore', sizes: { current: 1, target: 1 },
  current: { exists: true, bytes: 1, lines: 1, bom: false, eol: 'none', finalNewline: false },
  target: { exists: true, bytes: 1, lines: 1, bom: false, eol: 'none', finalNewline: false },
  rows: [{ kind: 'delete', text, oldLine: 1 }] } })
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done }); return { promise, resolve } }

async function panel({ preflight = false, read = async () => content('当前正文'), respond = async () => plan('first') } = {}) {
  const calls = []
  const wire = async request => {
    calls.push(request)
    return { ok: true, value: request.phase === 'status' ? { ok: true, value: { planId: '', files: [] } }
      : request.phase === 'cancel' ? { ok: true, value: { canceled: true, files: [] } }
      : request.phase === 'start' ? plan('first') : await respond(request) }
  }
  const operations = createResendOperations({ resend: { rollback: wire, replay: wire,
    content: async request => { calls.push(request); return { ok: true, value: await read(request) } },
    cleanup: async () => ({ ok: true, value: { ok: true, value: {} } }),
  } })
  const element = (sessionId = 's') => preflight ? h(ReplayPreflight, { operations, sessionId, userSeq: 2, portal: true, t: key => key })
    : h(FileRollbackPreview, { operations, point: { sessionId, carrierSeq: 5 }, t: key => key })
  const dom = await renderDom(element())
  if (preflight) await dom.act(async () => { void operations.run({ sessionId: 's', targetSeq: 2, op: 'edit', text: '中文草稿' }) })
  const button = key => [...document.querySelectorAll('button')].find(node => node.textContent === key || node.getAttribute('aria-label') === key)
  const check = path => document.querySelector(`li[data-path="${path}"] input`)
  const viewer = path => document.querySelector(`li[data-path="${path}"] .dsh-resend-content-view`)
  if (!preflight) await dom.click(button('files.previewShort'))
  return { dom, operations, calls, element, button, check, viewer,
    cleanup: async () => { await dom.act(async () => operations.dispose()); await dom.cleanup() } }
}

it.each([false, true])('rechecking retains only the previous selected identities, removes unavailable members and leaves newcomers unchecked (%s)', async preflight => {
  let previews = 0
  const p = await panel({ preflight, respond: async () => ++previews === (preflight ? 1 : 2) ? plan('second', [
    { path: 'a.txt', action: 'refuse', reason: 'content-diverged' }, { path: 'b.txt', action: 'restore' },
    { path: 'c.txt', action: 'restore' }, { path: 'new.txt', action: 'restore' },
  ]) : plan('first') })
  try {
    await p.dom.click(p.check('c.txt'))
    await p.dom.click(p.viewer('c.txt'))
    expect(document.querySelector('code').textContent).toBe('当前正文')
    await p.dom.click(p.button('content.close'))
    await p.dom.click(p.button('files.retry'))
    expect(p.check('a.txt').disabled).toBe(true)
    expect(p.check('a.txt').checked).toBe(false)
    expect(p.check('b.txt').checked).toBe(true)
    expect(p.check('c.txt').checked).toBe(false)
    expect(p.check('new.txt').checked).toBe(false)
    expect(document.querySelector('.dsh-resend-content-dialog')).toBeNull()
  } finally { await p.cleanup() }
})

it.each([false, true])('an execute failure without a saved journal never resets the previous selection to all (%s)', async preflight => {
  let previews = 0
  const p = await panel({ preflight, respond: async request => ['execute', 'restore'].includes(request.phase)
    ? { ok: false, error: { code: 'preview-stale', files: [] } } : plan(`plan-${++previews}`) })
  try {
    await p.dom.click(p.check('c.txt'))
    await p.dom.click(p.button(preflight ? 'replay.restoreCount' : 'files.executeCount'))
    await p.dom.click(p.button('files.retry'))
    expect(p.check('a.txt').checked).toBe(true)
    expect(p.check('b.txt').checked).toBe(true)
    expect(p.check('c.txt').checked).toBe(false)
    await p.dom.click(p.check('a.txt'))
    await p.dom.click(p.check('b.txt'))
    await p.dom.click(p.button(preflight ? 'replay.cancel' : 'files.cancel'))
    expect(p.calls.at(-1).phase).toBe('cancel')
    expect(document.body.textContent).not.toContain('files.completed')
  } finally { await p.cleanup() }
})

it.each(['preview', 'execute'])('a late history %s reply cannot replace a new session or resurrect a released panel', async phase => {
  const reply = deferred()
  let reads = 0
  const p = await panel({ respond: async request => request.sessionId === 's' && request.phase === phase && (phase === 'execute' || ++reads > 1)
    ? reply.promise : plan('first') })
  try {
    await p.dom.click(p.button(phase === 'preview' ? 'files.retry' : 'files.executeCount'))
    await p.dom.render(p.element('new-session'))
    await p.dom.click(p.button('files.previewShort'))
    await p.dom.act(async () => reply.resolve(plan('obsolete', [{ path: 'obsolete.txt', action: 'restore' }])))
    expect(document.querySelector('li[data-path="obsolete.txt"]')).toBeNull()
    expect(document.body.textContent).not.toContain('files.completed')
  } finally { await p.cleanup() }
})

it.each([false, true])('refocusing revalidates an unchecked file and retires its outdated text without expanding selection (%s)', async preflight => {
  const fresh = deferred()
  let reads = 0
  const p = await panel({ preflight, read: async () => ++reads === 1 ? content('旧正文') : fresh.promise })
  try {
    await p.dom.click(p.check('c.txt'))
    await p.dom.click(p.viewer('c.txt'))
    expect(document.body.textContent).toContain('旧正文')
    await p.dom.act(async () => window.dispatchEvent(new window.Event('focus')))
    expect(document.body.textContent).not.toContain('旧正文')
    expect(document.body.textContent).toContain('content.loading')
    await p.dom.act(async () => fresh.resolve({ ok: false, error: { code: 'preview-stale' } }))
    expect(document.body.textContent).toContain('content.stale')
    expect(p.check('c.txt').checked).toBe(false)
    await p.dom.click(p.button('content.close'))
    expect(p.button(preflight ? 'replay.restoreCount' : 'files.executeCount').disabled).toBe(false)
  } finally { await p.cleanup() }
})

it.each([false, true])('reversed content replies cannot overwrite the newly opened file (%s)', async preflight => {
  const a = deferred(), b = deferred()
  const p = await panel({ preflight, read: request => request.path === 'a.txt' ? a.promise : b.promise })
  try {
    await p.dom.click(p.viewer('a.txt'))
    await p.dom.click(p.button('content.close'))
    await p.dom.click(p.viewer('b.txt'))
    await p.dom.act(async () => b.resolve(content('B 最新正文')))
    await p.dom.act(async () => a.resolve(content('A 迟到正文')))
    expect(document.body.textContent).toContain('B 最新正文')
    expect(document.body.textContent).not.toContain('A 迟到正文')
  } finally { await p.cleanup() }
})

it('the outer replay dialog includes checkboxes in its Tab boundary and falls back to its panel when an opener disappears', async () => {
  const p = await panel({ preflight: true, respond: async () => plan('updated', [{ path: 'b.txt', action: 'restore' }]) })
  try {
    const first = document.querySelector('.dsh-resend-rollback-select-all input')
    const last = p.button('files.retry')
    last.focus()
    await p.dom.key(last, 'Tab')
    expect(document.activeElement === first).toBe(true)
    await p.dom.key(first, 'Tab', { shiftKey: true })
    expect(document.activeElement === last).toBe(true)
    p.viewer('a.txt').focus()
    await p.dom.click(p.viewer('a.txt'))
    await p.dom.act(async () => { await p.operations.chooseReplay('s', 'preview') })
    expect(document.querySelector('.dsh-resend-content-dialog')).toBeNull()
    expect(document.activeElement === document.body).toBe(false)
    expect(document.activeElement.isConnected).toBe(true)
    expect(document.querySelector('li[data-path="a.txt"]')).toBeNull()
    await p.dom.key(document.activeElement, 'Tab', { shiftKey: true })
    expect(document.activeElement === p.button('files.retry')).toBe(true)
  } finally { await p.cleanup() }
})

it('cleanup retires the plan and content, offers recheck, and preserves unchecked identities', async () => {
  const p = await panel()
  try {
    await p.dom.click(p.check('c.txt'))
    await p.dom.click(p.viewer('a.txt'))
    await p.dom.act(async () => { await p.operations.cleanup({ phase: 'execute' }) })
    expect(document.querySelector('.dsh-resend-content-dialog')).toBeNull()
    expect(p.button('files.executeCount')).toBeUndefined()
    expect(document.body.textContent).toContain('files.error.plan-not-found')
    await p.dom.click(p.button('files.retry'))
    expect(p.check('c.txt').checked).toBe(false)
    expect(p.button('files.executeCount')).toBeDefined()
  } finally { await p.cleanup() }
})
