import { expect, it } from 'vitest'
import { createElement } from 'react'
import { clientHalf } from '../scripts/client-bundle.mjs'
import { renderDom } from './helpers/render.mjs'

async function panel(rollback, status = async () => ({ ok: true, value: { planId: '', completed: false, files: [] } })) {
  const { FileRollbackPreview, createResendOperations } = clientHalf().exports
  const calls = []
  const operations = createResendOperations({ resend: { rollback: async (request) => {
    if (request.phase === 'status') return { ok: true, value: await status(request) }
    calls.push(request)
    return { ok: true, value: await rollback(request) }
  } } })
  const dom = await renderDom(createElement(FileRollbackPreview, { operations, point: { sessionId: 's', carrierSeq: 5 }, t: (key) => key }))
  const button = (key) => [...dom.container.querySelectorAll('button')].find((node) => node.textContent === key)
  return { dom, calls, button }
}

it('starts compact, previews every file and refusal, cancels without executing, and executes the same file-only plan', async () => {
  const preview = { ok: true, value: { planId: 'opaque-plan', files: [
    { path: 'src/safe.txt', action: 'restore' },
    { path: 'user.txt', action: 'refuse', reason: 'content-diverged' },
  ] } }
  const { dom, calls, button } = await panel(async () => preview)
  try {
    expect(dom.container.querySelectorAll('input[type=radio]')).toHaveLength(0)
    expect(dom.container.querySelectorAll('button')).toHaveLength(1)
    expect(dom.container.querySelector('ul')).toBeNull()
    await dom.click(button('files.previewShort'))
    expect(dom.container.textContent).toContain('safe.txt')
    expect(dom.container.textContent).toContain('src/')
    expect(dom.container.textContent).toContain('user.txt')
    expect(dom.container.textContent).toContain('files.reason.content-diverged')
    expect(calls.map((call) => call.phase)).toEqual(['preview'])
    await dom.click(button('files.cancel'))
    expect(calls.map((call) => call.phase)).toEqual(['preview', 'cancel'])
    expect(dom.container.querySelector('ul')).toBeNull()
    await dom.click(button('files.previewShort'))
    await dom.click(button('files.executeCount'))
    expect(calls.at(-1)).toEqual({ sessionId: 's', carrierSeq: 5, scope: 'artifacts', phase: 'execute', planId: 'opaque-plan' })
    expect(dom.container.textContent).toContain('files.completed')
    expect(dom.container.textContent).toContain('files.restored')
    expect(dom.container.textContent).toContain('files.kept')
    expect(button('files.executeCount')).toBeUndefined()
    await dom.click(button('files.closeResult'))
    expect(dom.container.querySelector('ul')).toBeNull()
    expect(button('files.previewShort') === undefined).toBe(true)
    expect(dom.container.textContent).toContain('files.finished')
    expect(button('files.viewResult')).toBeDefined()
    await dom.click(button('files.viewResult'))
    expect(dom.container.textContent).toContain('files.restored')
    expect(button('files.executeCount')).toBeUndefined()
    expect(calls.map((call) => call.phase)).toEqual(['preview', 'cancel', 'preview', 'execute'])
    expect(dom.container.textContent).not.toContain('rollback.conversation')
  } finally { await dom.cleanup() }
})

it('loads a persisted completion as a collapsed result without offering preview or execution', async () => {
  let reads = 0
  const { dom, calls, button } = await panel(async () => { throw new Error('completed points cannot preview or execute') }, async () => {
    reads++
    return { ok: true, value: { planId: 'saved-plan', completed: true, files: [{ path: 'saved.txt', action: 'restore' }] } }
  })
  try {
    expect(reads).toBe(1)
    expect(button('files.previewShort') === undefined).toBe(true)
    expect(dom.container.textContent).toContain('files.finished')
    expect(dom.container.querySelector('ul')).toBeNull()
    await dom.click(button('files.viewResult'))
    expect(dom.container.textContent).toContain('saved.txt')
    expect(dom.container.textContent).toContain('files.restored')
    expect(button('files.executeCount')).toBeUndefined()
    await dom.click(button('files.closeResult'))
    expect(button('files.previewShort') === undefined).toBe(true)
    expect(dom.container.textContent).toContain('files.finished')
    expect(calls).toEqual([])
  } finally { await dom.cleanup() }
})

it.each([{ files: [] }, { files: [{ path: 'user.txt', action: 'refuse', reason: 'content-diverged' }] }])('has no confirmation action when no files can be restored: $files', async ({ files }) => {
  const { dom, calls, button } = await panel(async () => ({ ok: true, value: { planId: 'no-restores', files } }))
  try {
    await dom.click(button('files.previewShort'))
    expect(button('files.executeCount')).toBeUndefined()
    expect(dom.container.textContent).toContain(files.length ? 'files.reason.content-diverged' : 'files.empty')
    await dom.click(button('files.close'))
    expect(calls.map((call) => call.phase)).toEqual(['preview', 'cancel'])
    expect(dom.container.querySelector('ul')).toBeNull()
  } finally { await dom.cleanup() }
})

it('retains both restored and refused files after execution stops and requires a fresh preview to retry', async () => {
  let previews = 0
  const { dom, calls, button } = await panel(async (request) => request.phase === 'preview'
    ? { ok: true, value: { planId: `plan-${++previews}`, files: [
      { path: 'first.txt', action: 'restore' }, { path: 'second.txt', action: 'restore' },
    ] } }
    : { ok: false, error: { code: 'execution-stopped', files: [
      { path: 'first.txt', action: 'restored' }, { path: 'second.txt', action: 'refuse', reason: 'content-diverged' },
    ] } })
  try {
    await dom.click(button('files.previewShort'))
    await dom.click(button('files.executeCount'))
    expect(dom.container.textContent).toContain('files.error.execution-stopped')
    expect(dom.container.textContent).toContain('first.txt')
    expect(dom.container.textContent).toContain('second.txt')
    expect(dom.container.textContent).toContain('files.restored')
    expect(dom.container.textContent).toContain('files.kept')
    expect(button('files.executeCount')).toBeUndefined()
    expect(dom.container.textContent).not.toContain('files.completed')
    await dom.click(button('files.retry'))
    expect(calls.at(-1)).toEqual({ sessionId: 's', carrierSeq: 5, scope: 'artifacts', phase: 'preview' })
    await dom.click(button('files.executeCount'))
    expect(calls.at(-1).planId).toBe('plan-2')
  } finally { await dom.cleanup() }
})

it('shows a preview failure and can recover without exposing a confirmation for an invalid plan', async () => {
  let attempts = 0
  const { dom, button } = await panel(async () => ++attempts === 1
    ? { ok: false, error: { code: 'agent-busy' } }
    : { ok: true, value: { planId: 'fresh-plan', files: [{ path: 'safe.txt', action: 'restore' }] } })
  try {
    await dom.click(button('files.previewShort'))
    expect(dom.container.textContent).toContain('files.error.agent-busy')
    expect(button('files.executeCount')).toBeUndefined()
    await dom.click(button('files.retry'))
    expect(dom.container.textContent).not.toContain('files.error.agent-busy')
    expect(button('files.executeCount')).toBeDefined()
  } finally { await dom.cleanup() }
})
