import { afterEach, expect, it } from 'vitest'
import { createElement } from 'react'
import { clientHalf } from '../scripts/client-bundle.mjs'
import { clientComposition } from './helpers/client.mjs'
import { renderDom } from './helpers/render.mjs'

const disposers = []
afterEach(async () => { for (const dispose of disposers.splice(0).reverse()) await dispose() })
const session = { sessionId: 'a', title: '历史会话 A', projectPath: 'D:/项目', records: 1, bytes: 200, noSnapshots: true }
const preview = { phase: 'preview', planId: 'cleanup-plan', sessions: [session], estimatedBytes: 150, itemCount: 2,
  categories: [{ kind: 'records', count: 1, bytes: 100 }, { kind: 'outcomes', count: 1, bytes: 50 }], protectedObjects: false, unreadableSessions: 0 }
async function ui(reply) {
  const composition = await clientComposition()
  const face = clientHalf().exports
  await composition.ctx.plugin(face)
  await new Promise(resolve => setTimeout(resolve, 20))
  disposers.push(() => composition.ctx.fiber.dispose())
  composition.ctx.get('locale').active = 'zh'
  const translate = composition.ctx.get('locale').bind('dsh-resend')
  const t = (key, args = {}) => Object.entries(args).reduce((text, [name, value]) => text.replaceAll('{' + name + '}', String(value)), translate(key))
  const calls = []
  const operations = { async cleanup(request) { calls.push(request); return reply(request) } }
  const dom = await renderDom(createElement(face.StorageCleanup, { operations, t }))
  disposers.push(() => dom.cleanup())
  const button = text => [...dom.container.querySelectorAll('button')].find(button => (button.getAttribute('aria-label') ?? button.textContent) === text)
  return { ...dom, button, calls, composition, face, operations, t }
}

it('selects multiple conversations, previews effects and size, then executes only after confirmation and shows skipped/failed results', async () => {
  const b = { ...session, sessionId: 'b', title: '历史会话 B' }
  const u = await ui(request => ({ ok: true, value: request.phase === 'list'
    ? { phase: 'list', sessions: [session, b] } : request.phase === 'preview' ? { ...preview, sessions: [session, b] }
      : { phase: 'execute', releasedBytes: 50, results: [
        { sessionId: 'a', title: session.title, status: 'skipped', reason: 'generating', bytes: 0 },
        { sessionId: 'b', title: b.title, status: 'failed', reason: 'delete-failed', bytes: 0 },
      ], failures: [{ item: 'records/failed.json', reason: 'delete-failed' }], changedCount: 1 } }))
  await u.click(u.button('按会话清除回滚数据'))
  expect(u.container.textContent).toContain('无文件快照')
  expect(u.container.textContent).toContain('D:/项目')
  expect(u.button('预览所选 0 个会话').disabled).toBe(true)
  for (const checkbox of u.container.querySelectorAll('input[type=checkbox]')) await u.click(checkbox)
  await u.click(u.button('预览所选 2 个会话'))
  expect(u.calls.at(-1)).toEqual({ phase: 'preview', mode: 'sessions', sessionIds: ['a', 'b'] })
  expect(u.calls.some(call => call.phase === 'execute')).toBe(false)
  expect(u.container.textContent).toContain('预计释放空间：150 B')
  expect(u.container.textContent).toContain('历史文件回滚数据将不可恢复')
  await u.click(u.button('确认清理'))
  expect(u.calls.at(-1)).toEqual({ phase: 'execute', mode: 'sessions', planId: 'cleanup-plan' })
  expect(u.container.textContent).toContain('实际释放空间：50 B')
  expect(u.container.textContent).toContain('正在生成回复')
  expect(u.container.textContent).toContain('1 项删除失败，未全部清理完成')
  expect(u.container.textContent).toContain('records/failed.json')
  expect(u.composition.record.missingKeys).toEqual([])
})

it('previews orphan deletion consequences and cancels without executing', async () => {
  const u = await ui(request => ({ ok: true, value: request.phase === 'cancel' ? { phase: 'cancel' } : { ...preview, sessions: [] } }))
  await u.click(u.button('清理无用残留'))
  expect(u.container.textContent).toContain('这些数据可能仍有用途，删除后无法恢复')
  await u.click(u.button('取消'))
  expect(u.calls.map(call => call.phase)).toEqual(['preview', 'cancel'])
  expect(u.button('确认清理')).toBeUndefined()
})

it('distinguishes empty results from read failure and never offers execute for either', async () => {
  let failed = false
  const u = await ui(() => failed ? { ok: false, error: { code: 'scan-failed' } }
    : { ok: true, value: { ...preview, sessions: [], categories: [], itemCount: 0, estimatedBytes: 0 } })
  await u.click(u.button('清理无用残留'))
  expect(u.container.textContent).toContain('没有可清理项')
  expect(u.button('确认清理')).toBeUndefined()
  failed = true
  await u.click(u.button('清理无用残留'))
  expect(u.container.textContent).toContain('数据读取失败，清理未执行')
  expect(u.button('确认清理')).toBeUndefined()
  expect(u.calls.some(call => call.phase === 'execute')).toBe(false)
})

it('contains communication failures and supports English labels without missing translations', async () => {
  const u = await ui(async () => { throw new Error('disconnected') })
  await u.click(u.button('按会话清除回滚数据'))
  expect(u.container.textContent).toContain('执行结果尚未确认')
  u.composition.ctx.get('locale').active = 'en'
  await u.render(createElement(u.face.StorageCleanup, { operations: u.operations, t: u.t }))
  expect(u.container.textContent).toContain('Clear rollback data by conversation')
  expect(u.composition.record.missingKeys).toEqual([])
})

it('keeps an animated status and locks controls throughout delayed reading, preview and cleanup', async () => {
  let resolveRequest
  const u = await ui(() => new Promise(resolve => { resolveRequest = resolve }))
  const settle = value => u.act(async () => resolveRequest({ ok: true, value }))
  const expectBusy = hint => {
    expect(u.container.querySelector('section').getAttribute('aria-busy')).toBe('true')
    const status = u.container.querySelector('.dsh-resend-cleanup-pending[role=status]')
    expect(status.textContent).toContain('正在处理，请稍候…')
    expect(status.textContent).toContain(hint)
    expect(status.querySelector('svg.dsh-resend-cleanup-spinner').getAttribute('aria-hidden')).toBe('true')
    expect([...u.container.querySelectorAll('button,input')].every(control => control.disabled)).toBe(true)
  }
  const expectIdle = () => {
    expect(u.container.querySelector('section').getAttribute('aria-busy')).toBe('false')
    expect(u.container.querySelector('.dsh-resend-cleanup-spinner')).toBeNull()
  }
  await u.click(u.button('按会话清除回滚数据'))
  expectBusy('正在读取会话和回滚记录')
  await u.click(u.button('按会话清除回滚数据'))
  expect(u.calls).toHaveLength(1)
  await settle({ phase: 'list', sessions: [session] })
  expectIdle()
  await u.click(u.container.querySelector('input'))
  expect(u.container.querySelector('label').dataset.selected).toBe('true')
  expect(u.container.textContent).toContain('已选 1 个会话')
  await u.click(u.button('预览所选 1 个会话'))
  expectBusy('正在核对清理范围')
  expect(u.button('预览所选 1 个会话').querySelector('.dsh-resend-cleanup-spinner')).not.toBeNull()
  await settle(preview)
  expectIdle()
  await u.click(u.button('确认清理'))
  expectBusy('正在清理已确认的数据')
  expect(u.button('确认清理').querySelector('.dsh-resend-cleanup-spinner')).not.toBeNull()
  await u.click(u.button('确认清理'))
  expect(u.calls.filter(call => call.phase === 'execute')).toHaveLength(1)
  await settle({ phase: 'execute', releasedBytes: 150, results: [], failures: [], changedCount: 0 })
  expectIdle()
  expect(u.container.textContent).toContain('实际释放空间：150 B')
  expect(u.composition.record.missingKeys).toEqual([])
})

it('shows cancellation progress and removes the spinner when cancellation completes', async () => {
  let resolveCancel
  const u = await ui(request => request.phase === 'cancel'
    ? new Promise(resolve => { resolveCancel = resolve }) : { ok: true, value: preview })
  await u.click(u.button('清理无用残留'))
  await u.click(u.button('取消'))
  expect(u.container.querySelector('.dsh-resend-cleanup-pending').textContent).toContain('正在取消清理预览')
  expect(u.button('取消').querySelector('.dsh-resend-cleanup-spinner')).not.toBeNull()
  await u.act(async () => resolveCancel({ ok: true, value: { phase: 'cancel' } }))
  expect(u.container.querySelector('.dsh-resend-cleanup-spinner')).toBeNull()
  expect(u.button('确认清理')).toBeUndefined()
  expect(u.composition.record.missingKeys).toEqual([])
})

it.each(['response', 'connection'])('ends loading after a delayed %s failure and allows retry', async kind => {
  let finish
  const u = await ui(() => new Promise((resolve, reject) => {
    finish = () => kind === 'response' ? resolve({ ok: false, error: { code: 'scan-failed' } }) : reject(new Error('disconnected'))
  }))
  u.composition.ctx.get('locale').active = 'en'
  await u.render(createElement(u.face.StorageCleanup, { operations: u.operations, t: u.t }))
  await u.click(u.button('Clear rollback data by conversation'))
  expect(u.container.querySelector('.dsh-resend-cleanup-pending').textContent).toContain('Reading conversations')
  await u.act(async () => finish())
  expect(u.container.querySelector('.dsh-resend-cleanup-spinner')).toBeNull()
  expect(u.container.querySelector('section').getAttribute('aria-busy')).toBe('false')
  expect(u.container.querySelector('[role=alert]')).not.toBeNull()
  expect(u.button('Read and preview again').disabled).toBe(false)
  expect(u.composition.record.missingKeys).toEqual([])
})
