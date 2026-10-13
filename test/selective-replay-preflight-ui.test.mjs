/**
 * Ticket 02 — the replay preflight panel checks files, continues with the real
 * selection and keeps both Chinese entries in their established hierarchy.
 *
 * Edit-resend and regenerate render the very same FileRollbackPreview through
 * ReplayPreflight — the selection rules below hold for both entries; the host
 * suite (test/selective-replay-preflight.test.mjs) drives both entries.
 */
import { expect, it } from 'vitest'
import { createElement } from 'react'
import { clientHalf } from '../scripts/client-bundle.mjs'
import { renderDom } from './helpers/render.mjs'

const zh = {
  'replay.restoreCount': '还原 {count} 个文件并继续',
  'replay.keep': '保留当前文件并继续',
  'replay.keepRemaining': '保留剩余文件并继续',
  'replay.cancel': '取消重发',
  'files.selectedCount': '选中还原 {count} 个文件',
  'files.userKeptCount': '{count} 个文件用户选择保留',
  'files.restoredCount': '已还原 {count} 个文件',
}
const t = key => zh[key] ?? key

const THREE = [
  { path: 'a.txt', action: 'restore' },
  { path: 'b.txt', action: 'restore' },
  { path: 'c.txt', action: 'restore' },
]
// A partial failure with the acceptance scenario's real split: a restored, b failed, c kept.
const STOPPED = { ok: false, error: { code: 'execution-stopped', files: [
  { path: 'a.txt', action: 'restored' },
  { path: 'b.txt', action: 'refuse', reason: 'restore-failed' },
  { path: 'c.txt', action: 'kept' },
] } }

async function panel(files = THREE, responses = []) {
  const face = clientHalf().exports
  const calls = []
  let index = 0
  // The fake stands for the Gateway: it wraps the BUSINESS result in the
  // transport envelope, exactly like remote.resend.replay does (two unwraps).
  const operations = face.createResendOperations({ resend: { replay: async request => {
    calls.push(request)
    if (request.phase === 'start') {
      return { ok: true, value: { ok: true, value: { preflight: true, preflightId: 'p-1', planId: 'plan-1', userSeq: 2, op: 'edit', files } } }
    }
    const response = responses[index++]
    return { ok: true, value: response === undefined
      ? { ok: true, value: { carrierSeq: 8, shadowedSeqs: [2, 3], resendMessageId: 'queued' } }
      : await response }
  } } })
  const dom = await renderDom(createElement(face.ReplayPreflight, { operations, sessionId: 's', userSeq: 2, t }))
  let outcome
  await dom.act(async () => { void operations.run({ sessionId: 's', targetSeq: 2, op: 'edit', text: '编辑后的中文草稿' })
    .then(result => { outcome = result }) })
  const button = text => [...dom.container.querySelectorAll('button')].find(node =>
    text instanceof RegExp ? text.test(node.textContent) : node.textContent === text)
  const checkOf = path => dom.container.querySelector(`li[data-path="${path}"] input[type=checkbox]`)
  const row = path => dom.container.querySelector(`li[data-path="${path}"]`)
  const selectAll = () => dom.container.querySelector('.dsh-resend-rollback-select-all input[type=checkbox]')
  return { dom, calls, operations, button, checkOf, row, selectAll, outcome: () => outcome }
}

it('defaults to everything checked and the restore count follows the actual selection', async () => {
  const p = await panel()
  try {
    expect(p.checkOf('a.txt').checked).toBe(true)
    expect(p.checkOf('b.txt').checked).toBe(true)
    expect(p.checkOf('c.txt').checked).toBe(true)
    expect(p.selectAll().checked).toBe(true)
    expect(p.button('还原 3 个文件并继续')).toBeDefined()
    expect(p.dom.container.textContent).toContain('选中还原 3 个文件')
    // Unselecting one changes the confirmed count and the kept count together.
    await p.dom.click(p.checkOf('c.txt'))
    expect(p.button('还原 2 个文件并继续')).toBeDefined()
    expect(p.dom.container.textContent).toContain('选中还原 2 个文件')
    expect(p.dom.container.textContent).toContain('1 个文件用户选择保留')
    expect(p.selectAll().indeterminate).toBe(true)
    // Zero selection hides the restore action; keep and cancel remain available.
    await p.dom.click(p.checkOf('a.txt'))
    await p.dom.click(p.checkOf('b.txt'))
    expect(p.button(/^还原/)).toBeUndefined()
    expect(p.button('保留当前文件并继续')).toBeDefined()
    expect(p.button('取消重发')).toBeDefined()
  } finally { await p.dom.cleanup(); p.operations.dispose() }
})

it('executes exactly the checked subset with its plan, and keep sends no selection at all', async () => {
  const p = await panel()
  try {
    await p.dom.click(p.checkOf('b.txt'))
    await p.dom.click(p.checkOf('c.txt'))
    await p.dom.click(p.button('还原 1 个文件并继续'))
    expect(p.calls[1]).toEqual({ phase: 'restore', sessionId: 's', preflightId: 'p-1', selected: ['a.txt'] })
    expect(p.outcome().value.resendMessageId).toBe('queued')
    expect(p.dom.container.querySelector('.dsh-resend-rollback')).toBeNull()
  } finally { await p.dom.cleanup(); p.operations.dispose() }
})

it('ignores the checkboxes on keep-current-files: the normal keep flow carries no selection', async () => {
  const p = await panel()
  try {
    await p.dom.click(p.checkOf('c.txt'))
    await p.dom.click(p.button('保留当前文件并继续'))
    expect(p.calls[1]).toEqual({ phase: 'keep', sessionId: 's', preflightId: 'p-1' })
    expect(p.outcome().value.resendMessageId).toBe('queued')
  } finally { await p.dom.cleanup(); p.operations.dispose() }
})

it('locks the list while restoring and never starts a second processing run from repeated input', async () => {
  let release
  const p = await panel(THREE, [new Promise(resolve => { release = resolve })])
  try {
    await p.dom.click(p.checkOf('c.txt'))
    await p.dom.click(p.button('还原 2 个文件并继续'))
    expect(p.calls.map(call => call.phase)).toEqual(['start', 'restore'])
    expect([...p.dom.container.querySelectorAll('button')].every(node => node.disabled)).toBe(true)
    expect(p.checkOf('a.txt').disabled).toBe(true)
    expect(p.selectAll().disabled).toBe(true)
    await p.dom.act(async () => {
      await p.operations.chooseReplay('s', 'keep')
      await p.operations.chooseReplay('s', 'restore', ['b.txt'])
    })
    expect(p.calls.map(call => call.phase)).toEqual(['start', 'restore'])
    await p.dom.act(async () => release(STOPPED))
    // Real results stand: a is 已还原, b shows its reason, c is kept by choice — never restored.
    expect(p.row('a.txt').textContent).toContain('files.restored')
    expect(p.row('b.txt').textContent).toContain('files.unavailable')
    expect(p.row('b.txt').textContent).toContain('files.reason.restore-failed')
    expect(p.row('c.txt').textContent).toContain('files.userKept')
    expect(p.dom.container.textContent).toContain('已还原 1 个文件')
    expect(p.button('保留剩余文件并继续')).toBeDefined()
  } finally { await p.dom.cleanup(); p.operations.dispose() }
})

it('re-checks after a partial failure without reprocessing a or re-selecting c, then keeps the remainder', async () => {
  const p = await panel(THREE, [
    STOPPED,
    { ok: true, value: { preflight: true, preflightId: 'p-1', planId: 'plan-2', userSeq: 2, op: 'edit',
      selected: ['a.txt', 'b.txt'], files: [
      { path: 'a.txt', action: 'refuse', reason: 'already-restored' },
      { path: 'b.txt', action: 'restore' },
      { path: 'c.txt', action: 'restore' },
    ] } },
  ])
  try {
    await p.dom.click(p.checkOf('c.txt'))
    await p.dom.click(p.button('还原 2 个文件并继续'))
    // The preflight renders its own failure line for a stopped run (replay.failed),
    // not the history panel's raw error keys.
    expect(p.dom.container.textContent).toContain('replay.failed')
    await p.dom.click(p.button('files.retry'))
    // The recorded selection re-checks: b keeps its choice, c is NOT re-selected.
    expect(p.checkOf('a.txt').disabled).toBe(true)
    expect(p.checkOf('a.txt').checked).toBe(false)
    expect(p.checkOf('b.txt').checked).toBe(true)
    expect(p.checkOf('c.txt').checked).toBe(false)
    // Clearing the last remaining choice swaps the primary action to the keep wrap-up.
    await p.dom.click(p.checkOf('b.txt'))
    expect(p.button(/^还原/)).toBeUndefined()
    expect(p.button('保留剩余文件并继续')).toBeDefined()
    await p.dom.click(p.button('保留剩余文件并继续'))
    expect(p.calls.at(-1)).toEqual({ phase: 'keep', sessionId: 's', preflightId: 'p-1' })
    expect(p.outcome().value.resendMessageId).toBe('queued')
  } finally { await p.dom.cleanup(); p.operations.dispose() }
})

it('explains what already happened when the replay is canceled after a partial restore', async () => {
  const p = await panel(THREE, [STOPPED, { ok: true, value: { canceled: true } }])
  try {
    await p.dom.click(p.checkOf('c.txt'))
    await p.dom.click(p.button('还原 2 个文件并继续'))
    expect(p.dom.container.textContent).toContain('replay.cancelHint')
    await p.dom.click(p.button('取消重发'))
    expect(p.calls.at(-1).phase).toBe('cancel')
    expect(p.outcome().value.canceled).toBe(true)
    expect(p.operations.recordsFor('s')).toEqual([])
  } finally { await p.dom.cleanup(); p.operations.dispose() }
})

it('keeps the established action hierarchy: restore primary, keep secondary, cancel subdued', async () => {
  const p = await panel(THREE, [STOPPED])
  try {
    await p.dom.click(p.checkOf('c.txt'))
    expect(p.button('还原 2 个文件并继续').dataset.variant).toBe('primary')
    expect(p.button('保留当前文件并继续').dataset.variant).toBe('outline')
    expect(p.button('取消重发').dataset.variant).toBe('ghost')
    await p.dom.click(p.button('还原 2 个文件并继续'))
    expect(p.button('保留剩余文件并继续').dataset.variant).toBe('outline')
  } finally { await p.dom.cleanup(); p.operations.dispose() }
})

it('shows no selectable file for an all-refused list and still offers keep and cancel', async () => {
  const p = await panel([{ path: 'd.txt', action: 'refuse', reason: 'content-diverged' }])
  try {
    // Refused members keep the 01 rule: a checkbox is shown but locked.
    expect(p.checkOf('d.txt').disabled).toBe(true)
    expect(p.button(/^还原/)).toBeUndefined()
    expect(p.dom.container.textContent).toContain('files.reason.content-diverged')
    expect(p.button('保留当前文件并继续')).toBeDefined()
    expect(p.button('取消重发')).toBeDefined()
    await p.dom.click(p.button('保留当前文件并继续'))
    expect(p.outcome().value.resendMessageId).toBe('queued')
  } finally { await p.dom.cleanup(); p.operations.dispose() }
})
