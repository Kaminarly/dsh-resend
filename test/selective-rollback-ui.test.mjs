/** Ticket 01 — the history entry's checkbox list selects the restore subset. */
import { expect, it } from 'vitest'
import { createElement } from 'react'
import { clientHalf } from '../scripts/client-bundle.mjs'
import { renderDom } from './helpers/render.mjs'

const { FileRollbackPreview, createResendOperations } = clientHalf().exports

async function panel(rollback, status = async () => ({ ok: true, value: { planId: '', completed: false, files: [] } })) {
  const calls = []
  const operations = createResendOperations({ resend: { rollback: async (request) => {
    if (request.phase === 'status') return { ok: true, value: await status(request) }
    calls.push(request)
    return { ok: true, value: await rollback(request) }
  } } })
  const dom = await renderDom(createElement(FileRollbackPreview, { operations, point: { sessionId: 's', carrierSeq: 5 }, t: (key) => key }))
  const button = (key) => [...dom.container.querySelectorAll('button')].find((node) => node.textContent === key)
  const checks = () => [...dom.container.querySelectorAll('input[type=checkbox]')]
  const row = (path) => dom.container.querySelector(`li[data-path="${path}"]`)
  const checkOf = (path) => row(path)?.querySelector('input[type=checkbox]')
  const selectAll = () => dom.container.querySelector('.dsh-resend-rollback-select-all input[type=checkbox]')
  return { dom, calls, button, checks, row, checkOf, selectAll }
}

it('checks every restorable file by default, distinguishes counts, and executes exactly the checked subset', async () => {
  const preview = { ok: true, value: { planId: 'opaque-plan', files: [
    { path: 'src/safe.txt', action: 'restore' },
    { path: 'src/other.txt', action: 'restore' },
    { path: 'user.txt', action: 'refuse', reason: 'content-diverged' },
  ] } }
  const executed = { ok: true, value: { planId: 'opaque-plan', completed: true, files: [
    { path: 'src/safe.txt', action: 'restored' },
    { path: 'src/other.txt', action: 'kept' },
    { path: 'user.txt', action: 'refuse', reason: 'content-diverged' },
  ] } }
  const { dom, calls, button, checks, row, checkOf, selectAll } = await panel((request) => request.phase === 'execute' ? executed : preview)
  try {
    await dom.click(button('files.previewShort'))
    // One enabled-and-checked checkbox per restorable row, a disabled one on the
    // refused row, and a batch control that starts out fully checked.
    expect(checks()).toHaveLength(4)
    expect(checkOf('src/safe.txt').checked).toBe(true)
    expect(checkOf('src/other.txt').checked).toBe(true)
    expect(checkOf('user.txt').disabled).toBe(true)
    expect(selectAll().checked).toBe(true)
    expect(dom.container.textContent).toContain('files.selectedCount')
    expect(dom.container.textContent).toContain('files.userKeptCount')
    expect(dom.container.textContent).toContain('files.unavailableCount')
    expect(dom.container.textContent).toContain('files.deselectAll')
    // Partial selection: the batch control goes indeterminate and the execute count follows.
    await dom.click(checkOf('src/other.txt'))
    expect(selectAll().checked).toBe(false)
    expect(selectAll().indeterminate).toBe(true)
    expect(button('files.executeCount')).toBeDefined()
    // Zero selection hides the restore action; only the close that cancels remains.
    await dom.click(checkOf('src/safe.txt'))
    expect(button('files.executeCount')).toBeUndefined()
    expect(button('files.cancel')).toBeDefined()
    // Selecting all through the batch control restores the action; clearing it
    // through the same control hides it again.
    await dom.click(selectAll())
    expect(button('files.executeCount')).toBeDefined()
    await dom.click(selectAll())
    expect(button('files.executeCount')).toBeUndefined()
    await dom.click(selectAll())
    expect(button('files.executeCount')).toBeDefined()
    await dom.click(button('files.executeCount'))
    expect(calls.at(-1)).toEqual({ sessionId: 's', carrierSeq: 5, scope: 'artifacts', phase: 'execute',
      planId: 'opaque-plan', selected: ['src/safe.txt', 'src/other.txt'] })
    // The result distinguishes restored, kept by choice and system-refused.
    expect(dom.container.textContent).toContain('files.completed')
    expect(row('src/safe.txt').textContent).toContain('files.restored')
    expect(row('src/other.txt').textContent).toContain('files.userKept')
    expect(row('user.txt').textContent).toContain('files.unavailable')
    expect(row('user.txt').querySelector('input')).toBeNull()
    expect(button('files.executeCount')).toBeUndefined()
  } finally { await dom.cleanup() }
})

it('cancels without executing when nothing is selected and records no completion', async () => {
  const preview = { ok: true, value: { planId: 'one-file', files: [{ path: 'safe.txt', action: 'restore' }] } }
  const { dom, calls, button, checkOf } = await panel(async () => preview)
  try {
    await dom.click(button('files.previewShort'))
    await dom.click(checkOf('safe.txt'))
    expect(button('files.executeCount')).toBeUndefined()
    await dom.click(button('files.cancel'))
    expect(calls.map((call) => call.phase)).toEqual(['preview', 'cancel'])
    expect(calls.some((call) => call.phase === 'execute')).toBe(false)
    expect(dom.container.textContent).not.toContain('files.completed')
    expect(dom.container.querySelector('ul')).toBeNull()
  } finally { await dom.cleanup() }
})

it('reuses the recorded selection after an interrupted run instead of defaulting to everything', async () => {
  let attempts = 0
  const { dom, calls, button, checkOf } = await panel((request) => {
    attempts += 1
    if (request.phase === 'execute') return { ok: false, error: { code: 'execution-stopped', files: [
      { path: 'first.txt', action: 'restored' },
      { path: 'second.txt', action: 'refuse', reason: 'content-diverged' },
    ] } }
    return attempts === 1 ? { ok: true, value: { planId: 'plan-1', files: [
      { path: 'first.txt', action: 'restore' }, { path: 'second.txt', action: 'restore' },
    ] } } : { ok: true, value: { planId: `plan-${attempts}`, selected: ['first.txt', 'second.txt'], files: [
      { path: 'first.txt', action: 'refuse', reason: 'already-restored' },
      { path: 'second.txt', action: 'restore' },
    ] } }
  })
  try {
    await dom.click(button('files.previewShort'))
    await dom.click(button('files.executeCount'))
    expect(dom.container.textContent).toContain('files.error.execution-stopped')
    await dom.click(button('files.retry'))
    expect(calls.at(-1).phase).toBe('preview')
    // first.txt is no longer selectable; second.txt keeps the recorded selection.
    expect(checkOf('first.txt').disabled).toBe(true)
    expect(checkOf('first.txt').checked).toBe(false)
    expect(checkOf('second.txt').checked).toBe(true)
    await dom.click(button('files.executeCount'))
    expect(calls.at(-1)).toMatchObject({ phase: 'execute', planId: 'plan-3', selected: ['second.txt'] })
  } finally { await dom.cleanup() }
})

it('renders a persisted new-format completion without checkboxes or a restore action', async () => {
  const { dom, button, row } = await panel(async () => { throw new Error('completed points cannot preview or execute') }, async () => ({
    ok: true, value: { planId: 'saved-plan', completed: true, files: [
      { path: 'kept.txt', action: 'kept' },
      { path: 'failed.txt', action: 'refuse', reason: 'content-diverged' },
    ] },
  }))
  try {
    expect(button('files.previewShort') === undefined).toBe(true)
    await dom.click(button('files.viewResult'))
    expect(dom.container.querySelector('input')).toBeNull()
    expect(row('kept.txt').textContent).toContain('files.userKept')
    expect(row('failed.txt').textContent).toContain('files.unavailable')
    expect(button('files.executeCount')).toBeUndefined()
  } finally { await dom.cleanup() }
})

it('reads a legacy completion with restore-shaped files as restored, not as user-kept', async () => {
  const { dom, button, row } = await panel(async () => { throw new Error('completed points cannot preview or execute') }, async () => ({
    ok: true, value: { planId: 'legacy-plan', completed: true, files: [
      { path: 'done.txt', action: 'restore' },
      { path: 'blocked.txt', action: 'refuse', reason: 'content-diverged' },
    ] },
  }))
  try {
    await dom.click(button('files.viewResult'))
    expect(row('done.txt').textContent).toContain('files.restored')
    expect(row('blocked.txt').textContent).toContain('files.kept')
    expect(dom.container.querySelectorAll('input[type=checkbox]')).toHaveLength(0)
  } finally { await dom.cleanup() }
})
