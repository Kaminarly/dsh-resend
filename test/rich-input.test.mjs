import { afterEach, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { clientHalf } from '../scripts/client-bundle.mjs'
import { renderDom, editorText } from './helpers/render.mjs'
import { readyPreferences } from './helpers/preferences.mjs'
import { createSkillHost, representativeSkills } from '../scripts/fixtures/skill-host.mjs'

const resources = []
const skillHost = await createSkillHost()
afterEach(async () => { for (const close of resources.splice(0).reverse()) await close() })

async function editor({ text = '原文 @a/same.md /tdd', lookup, skills, replay, openFile, openSkill, sessionId = 's', seq = 0 } = {}) {
  const face = clientHalf().exports
  const calls = []
  const operations = face.createResendOperations({ fileReferences: lookup && { list: lookup }, skills: skills && { list: skills }, resend: {
    conversation: async () => ({ ok: true, value: { ok: true, value: { userSeqs: [seq], lastUserSeq: seq, assistantSeqs: [] } } }),
    replay: async input => { calls.push(input); return { ok: true, value: replay ? await replay(input) : { ok: false, error: { code: 'agent-busy' } } } },
    apply: async request => { calls.push({ retry: request }); return { ok: true, value: { ok: true, value: {
      carrierSeq: 5, shadowedSeqs: [seq], resendMessageId: 'accepted-retry',
    } } } },
  } })
  const node = { key: 'u', kind: 'user', anchorSeq: seq, data: { seq, text } }
  const props = { node, sessionId, operations, openFile, openSkill, preferences: readyPreferences(face), t: key => key,
    useChat: select => select({ nodes: new Map([['u', node]]) }), useSession: select => select({ running: false }) }
  const dom = await renderDom(createElement(face.UserActionsRow, props))
  resources.push(() => dom.cleanup(), () => operations.dispose())
  const element = () => createElement(face.UserActionsRow, props)
  return { ...dom, calls, face, operations, props, element,
    input: () => dom.container.querySelector('textarea, [role="textbox"]'),
    button: key => dom.container.querySelector(`[aria-label="row.${key}"]`),
  }
}

it('places skill validation beneath the entire temporary input surface', async () => {
  const dom = await editor({ text: '使用 /missing', skills: async () => ({ ok: true, value: { skills: [] } }) })
  await dom.click(dom.button('edit'))
  const notice = dom.container.querySelector('[data-skill-notice]')
  expect(notice.textContent).toContain('row.skillMissing')
  expect(notice.closest('.dsh-resend-editor-surface') === null).toBe(true)
  expect(notice.closest('.dsh-resend-editor-notices') !== null).toBe(true)
  expect(dom.container.querySelector('.dsh-resend-editor-surface').nextElementSibling === notice.parentElement).toBe(true)
  await dom.key(dom.input(), 'Enter')
  expect(dom.calls[0].request.text).toBe('使用 /missing')
})

it('does not warn about an unfinished skill name while its matching candidates are open', async () => {
  const dom = await editor({ text: '正文', skills: async () => ({ ok: true, value: { skills: [{ name: 'code-review' }] } }) })
  await dom.click(dom.button('edit'))
  await dom.change(dom.input(), '使用 /code-')
  expect(dom.container.querySelector('[role="option"]')).not.toBeNull()
  expect(dom.container.querySelector('[data-skill-notice]') === null).toBe(true)
  await dom.key(dom.input(), 'Escape')
  expect(dom.container.querySelector('[data-skill-notice]').textContent).toContain('row.skillInvalid')
})

it('previews a confirmed file path without sending or changing the draft', async () => {
  const opened = []
  const dom = await editor({
    openFile: path => opened.push(path),
    lookup: async () => ({ ok: true, value: [{ path: 'a/same.md', kind: 'file' }] }),
  })
  await dom.click(dom.button('edit'))
  const input = dom.input()
  const before = editorText(input)
  await dom.click(dom.container.querySelector('[data-path="a/same.md"]'))
  expect(opened).toEqual(['a/same.md'])
  expect(editorText(input)).toBe(before)
  expect(dom.calls).toHaveLength(0)
  await dom.key(input, 'Enter')
  expect(dom.calls[0].request.text).toBe(before)
})

it('previews only an exact current-session skill and reports unsupported preview capability', async () => {
  const opened = []
  const dom = await editor({
    openSkill: name => opened.push(name),
    skills: async () => ({ ok: true, value: { skills: [{ name: 'tdd' }] } }),
  })
  await dom.click(dom.button('edit'))
  await dom.change(dom.input(), '使用 /tdd')
  await dom.click(dom.input())
  expect(opened).toEqual(['tdd'])
  await dom.change(dom.input(), '使用 /missing')
  await dom.click(dom.input())
  expect(opened).toEqual(['tdd'])
  expect(dom.container.querySelector('[data-preview-notice]')).toBeNull()
  const unavailable = await editor({
    skills: async () => ({ ok: true, value: { skills: [{ name: 'tdd' }] } }),
  })
  await unavailable.click(unavailable.button('edit'))
  await unavailable.change(unavailable.input(), '使用 /tdd')
  await unavailable.click(unavailable.input())
  expect(unavailable.container.querySelector('[data-preview-notice]').textContent).toContain('row.referencePreviewUnavailable')
})

it('retains the draft and shows a recoverable notice when preview opening fails', async () => {
  const dom = await editor({
    openFile: async () => { throw new Error('preview failed') },
    lookup: async () => ({ ok: true, value: [{ path: 'a/same.md', kind: 'file' }] }),
  })
  await dom.click(dom.button('edit'))
  await dom.change(dom.input(), '修改后 @a/same.md')
  await dom.click(dom.container.querySelector('[data-path="a/same.md"]'))
  expect(dom.container.querySelector('[data-preview-notice]').textContent).toContain('row.referencePreviewFailed')
  expect(editorText(dom.input())).toBe('修改后 @a/same.md')
  await dom.key(dom.input(), 'Enter')
  expect(dom.calls[0].request.text).toBe('修改后 @a/same.md')
})

it('freezes reference previews during preflight and resumes the same target after cancel', async () => {
  const opened = []
  const dom = await editor({
    openFile: path => opened.push(path),
    lookup: async () => ({ ok: true, value: [{ path: 'a/same.md', kind: 'file' }] }),
    replay: input => input.phase === 'cancel'
      ? { ok: true, value: { canceled: true } }
      : { ok: true, value: { preflight: true, preflightId: 'preview', userSeq: 0, op: 'edit', files: [] } },
  })
  await dom.click(dom.button('edit'))
  await dom.key(dom.input(), 'Enter')
  const chip = dom.container.querySelector('[data-path="a/same.md"]')
  await dom.click(chip)
  expect(opened).toEqual([])
  await dom.act(async () => dom.operations.chooseReplay('s', 'cancel'))
  await dom.click(chip)
  expect(opened).toEqual(['a/same.md'])
})

it('selects only target-session skills as editable text before resending', async () => {
  const dom = await editor({ text: '请使用', sessionId: 'target', skills: async (request, signal) => {
    expect(request).toEqual({ sessionId: 'target' })
    expect(signal.aborted).toBe(false)
    return { ok: true, value: { skills: [{ name: 'tdd', description: '测试驱动' }, { name: 'code-review', description: '审查' }] } }
  } })
  await dom.click(dom.button('edit'))
  await dom.change(dom.input(), '请使用 /td')
  expect([...dom.container.querySelectorAll('.dsh-resend-menu-name')].map(option => option.textContent)).toEqual(['tdd'])
  await dom.key(dom.input(), 'Tab')
  expect(editorText(dom.input())).toBe('请使用 /tdd ')
  expect(dom.container.querySelector('[data-path]')).toBeNull()
  expect(dom.calls).toHaveLength(0)
  await dom.key(dom.input(), 'Enter')
  expect(dom.calls[0].request.text).toBe('请使用 /tdd ')
})

it('restoring a pasted file reference retains the active skill query and lets the user finish selection', async () => {
  const dom = await editor({ text: '正文',
    lookup: async () => ({ ok: true, value: [{ path: 'file.md', kind: 'file' }] }),
    skills: async () => ({ ok: true, value: { skills: [{ name: 'tdd' }] } }),
  })
  await dom.click(dom.button('edit'))
  await dom.change(dom.input(), '阅读 @file.md 使用 /td')
  expect(dom.container.querySelector('[data-path]')).not.toBeNull()
  expect(dom.container.querySelector('.dsh-resend-menu-name')?.textContent).toBe('tdd')
  await dom.key(dom.input(), 'Tab')
  await dom.key(dom.input(), 'Enter')
  expect(dom.calls[0].request.text).toBe('阅读 @file.md 使用 /tdd ')
})

it('does not label a matching unfinished skill query as missing, while preserving historical warnings', async () => {
  const dom = await editor({ text: '正文', skills: async () => ({ ok: true, value: { skills: [{ name: 'code-review' }] } }) })
  await dom.click(dom.button('edit'))
  await dom.change(dom.input(), '使用 /cr')
  expect(dom.container.querySelector('[role="option"]')?.getAttribute('aria-label')).toBe('row.skillSelect /code-review')
  expect(dom.container.querySelector('[data-skill-notice]') === null).toBe(true)
  await dom.change(dom.input(), '先 /missing 使用 /cr')
  const notice = dom.container.querySelector('[data-skill-notice]')
  expect(notice.textContent).toContain('/missing')
  expect(notice.textContent).not.toContain('/cr')
  await dom.key(dom.input(), 'Escape')
  expect(dom.container.querySelector('[data-skill-notice]').textContent).toContain('/cr')
})

it.each([
  ['Missing', async () => ({ ok: true, value: { skills: [{ name: 'tdd' }] } })],
  ['Unavailable', undefined],
  ['Failed', async () => { throw new Error('查询失败') }],
  ['Failed', async () => ({ ok: true, value: { skills: [{ name: null }] } })],
])('warns accurately about historical skills (%s) while allowing the unchanged original text to resend', async (status, skills) => {
  const text = '使用 /missing 与 /model-only'
  const dom = await editor({ text, skills })
  await dom.click(dom.button('edit'))
  expect(dom.container.querySelector('[data-skill-notice]')?.textContent).toContain('row.skill' + status)
  expect(editorText(dom.input())).toBe(text)
  await dom.key(dom.input(), 'Enter')
  expect(dom.calls[0].request.text).toBe(text)
})

it('keeps multiple skill names editable, replaceable and removable without turning them into tags', async () => {
  const dom = await editor({ text: '正文', skills: async () => ({ ok: true, value: { skills: [{ name: 'tdd' }, { name: 'code-review' }] } }) })
  await dom.click(dom.button('edit'))
  await dom.change(dom.input(), '使用 /t')
  await dom.key(dom.input(), 'Enter')
  await dom.change(dom.input(), '使用 /tdd 然后 /code')
  await dom.key(dom.input(), 'Tab')
  expect(editorText(dom.input())).toBe('使用 /tdd 然后 /code-review ')
  expect(dom.calls).toHaveLength(0)
  expect(dom.container.querySelector('[data-skill-notice]')).toBeNull()
  await dom.change(dom.input(), '使用 /code-review 然后 /tdd 已替换')
  await dom.key(dom.input(), 'Enter')
  expect(dom.calls[0].request.text).toBe('使用 /code-review 然后 /tdd 已替换')
  await dom.change(dom.input(), '技能均已删除')
  expect(dom.container.querySelector('[data-skill-notice]')).toBeNull()
  expect(dom.container.querySelector('[data-path]')).toBeNull()
})

it.each(['读取 /usr/bin 与 5/8', '读取 D:/Project/file.md', '紧挨/tdd', '读取 /tdd，检查'])('does not open a skill menu or rewrite paths, fractions or invalid boundaries: %s', async text => {
  const dom = await editor({ text: '正文', skills: async () => ({ ok: true, value: { skills: [{ name: 'tdd' }] } }) })
  await dom.click(dom.button('edit'))
  await dom.change(dom.input(), text)
  expect(dom.container.querySelector('[role="listbox"]')).toBeNull()
  if (text.includes('，')) expect(dom.container.querySelector('[data-skill-notice]').textContent).toContain('row.skillInvalid')
  await dom.key(dom.input(), 'Enter')
  expect(dom.calls[0].request.text).toBe(text)
})

it('rejects explicit model-only candidates and deduplicates names, retaining user-only skills', async () => {
  const dom = await editor({ text: '使用 /model-only', skills: async () => ({ ok: true, value: { skills: [
    { name: 'model-only', invocation: { userInvocable: false, modelInvocable: true } },
    { name: 'tdd', modelInvocable: false }, { name: 'tdd' },
  ] } }) })
  await dom.click(dom.button('edit'))
  expect(dom.container.querySelector('[data-skill-notice]').textContent).toContain('/model-only')
  await dom.change(dom.input(), '使用 /')
  expect([...dom.container.querySelectorAll('.dsh-resend-menu-name')].map(option => option.textContent)).toEqual(['tdd'])
  await dom.key(dom.input(), 'Enter')
  expect(editorText(dom.input())).toBe('使用 /tdd ')
})

it.each([
  ['Loading', () => new Promise(() => {})],
  ['Empty', async () => ({ ok: true, value: { skills: [] } })],
  ['Unavailable', undefined],
  ['Failed', async () => ({ ok: false, error: { code: 'gateway/internal' } })],
])('a skill menu in state %s captures Enter, Tab and IME confirmation until Escape closes it', async (status, skills) => {
  const dom = await editor({ text: '正文', skills })
  await dom.click(dom.button('edit'))
  await dom.change(dom.input(), '使用 /missing')
  expect(dom.container.querySelector('.dsh-resend-reference-menu [role="status"]').getAttribute('aria-label')).toBe('row.skill' + status)
  await dom.key(dom.input(), 'Enter', { isComposing: true })
  await dom.key(dom.input(), 'Enter', { keyCode: 229 })
  await dom.key(dom.input(), 'Enter')
  await dom.key(dom.input(), 'Tab')
  expect(dom.calls).toHaveLength(0)
  expect(editorText(dom.input())).toBe('使用 /missing')
  await dom.key(dom.input(), 'Escape')
  expect(dom.input()).not.toBeNull()
  await dom.key(dom.input(), 'Enter')
  expect(dom.calls[0].request.text).toBe('使用 /missing')
})

it('ignores reversed skill replies, stale buttons and obsolete warnings after draft changes', async () => {
  const replies = []
  const dom = await editor({ text: '正文', skills: (_request, signal) => new Promise(resolve => replies.push({ signal, resolve })) })
  await dom.click(dom.button('edit'))
  await dom.change(dom.input(), '使用 /old')
  const old = [...replies]
  await dom.change(dom.input(), '使用 /new')
  const newest = replies.filter(reply => !old.includes(reply))
  await dom.act(async () => newest.forEach(reply => reply.resolve({ ok: true, value: { skills: [{ name: 'new' }] } })))
  const button = dom.container.querySelector('[role="option"]')
  await dom.act(async () => old.forEach(reply => reply.resolve({ ok: true, value: { skills: [] } })))
  expect(button.textContent).toBe('new')
  expect(dom.container.querySelector('[data-skill-notice]')).toBeNull()
  await dom.change(dom.input(), '新草稿不含技能')
  await dom.click(button)
  expect(editorText(dom.input())).toBe('新草稿不含技能')
  expect(replies.every(reply => reply.signal.aborted)).toBe(true)
  expect(dom.container.querySelector('[role="listbox"]')).toBeNull()
  expect(dom.container.querySelector('[data-skill-notice]')).toBeNull()
})

it('invalidates only the affected session skill menu and rechecks historical skill availability after a preset event', async () => {
  let skills = [{ name: 'tdd' }]
  const dom = await editor({ text: '正文', skills: async () => ({ ok: true, value: { skills } }) })
  await dom.click(dom.button('edit'))
  await dom.change(dom.input(), '使用 /tdd')
  const choice = dom.container.querySelector('[role="option"]')
  await dom.act(async () => dom.operations.invalidateReferenceQueries('another-session'))
  expect(dom.container.querySelector('[role="option"]')).toBe(choice)
  skills = []
  await dom.act(async () => dom.operations.invalidateReferenceQueries('s'))
  await dom.click(choice)
  expect(editorText(dom.input())).toBe('使用 /tdd')
  expect(dom.container.querySelector('[role="listbox"]')).toBeNull()
  expect(dom.container.querySelector('[data-skill-notice]').textContent).toContain('row.skillMissing')
})

it('freezes selected skill text for preflight and retry even when the later local draft changes', async () => {
  const dom = await editor({ text: '正文', skills: async () => ({ ok: true, value: { skills: [{ name: 'tdd' }] } }),
    replay: input => ({ ok: true, value: input.phase === 'start'
      ? { preflight: true, preflightId: 'plan', userSeq: 0, op: 'edit', files: [] }
      : { carrierSeq: 5, shadowedSeqs: [] } }) })
  await dom.click(dom.button('edit'))
  await dom.change(dom.input(), '使用 /t')
  await dom.key(dom.input(), 'Tab')
  await dom.key(dom.input(), 'Enter')
  await dom.change(dom.input(), '冻结期间修改 /missing')
  expect(editorText(dom.input())).toBe('使用 /tdd ')
  await dom.act(async () => dom.operations.chooseReplay('s', 'keep'))
  await dom.click(dom.button('edit'))
  expect(editorText(dom.input())).toBe(dom.props.node.data.text)
  await dom.change(dom.input(), '后续编辑 /missing')
  await dom.act(async () => dom.operations.sendAgain({ sessionId: 's', carrierSeq: 5 }))
  expect(dom.calls.map(call => call.phase ?? 'retry')).toEqual(['start', 'keep', 'retry'])
  expect(dom.calls[0].request.text).toBe('使用 /tdd ')
  expect(dom.calls[2].retry.text).toBe('使用 /tdd ')
})

it.skipIf(!skillHost).each([
  ['请选择', '请使用 /help', '请使用 /help ', ['help']],
  ['重复名称', '使用 /tdd /code-review /tdd 已选好', '使用 /tdd /code-review /tdd 已选好', ['tdd', 'code-review']],
  ['失效技能', '使用 /missing /model-only 已保留', '使用 /missing /model-only 已保留', []],
  ['用户专用技能', '使用 /user-only 已选好', '使用 /user-only 已选好', ['user-only']],
  ['路径与分数', '读取 /usr/bin 5/8 /tdd，检查', '读取 /usr/bin 5/8 /tdd，检查', []],
])('loads actual host instructions from the resent user message: %s', async (_label, edited, expected, names) => {
  const { hostComposition, dispatchToHost } = await import('./helpers/gateway.mjs')
  const { hostState, SESSION_ID } = await import('./helpers/host.mjs')
  const state = hostState({ agent: 'delivering' })
  const host = await hostComposition({ host: state })
  resources.push(() => host.ctx.fiber.dispose())
  const dom = await editor({ text: '原文', sessionId: SESSION_ID, seq: 2,
    skills: async () => ({ ok: true, value: { skills: representativeSkills.filter(skill => skill.invocation.userInvocable)
      .map(skill => ({ name: skill.name, description: skill.description, modelInvocable: skill.invocation.modelInvocable })) } }),
    replay: async input => (await dispatchToHost(host, 'resend/replay', { request: input })).value,
  })
  await dom.click(dom.button('edit'))
  await dom.change(dom.input(), edited)
  if (edited === '请使用 /help') {
    await dom.key(dom.input(), 'Tab')
    expect(dom.calls).toHaveLength(0)
  }
  if (edited.includes('/missing')) expect(dom.container.querySelector('[data-skill-notice]').textContent).toContain('row.skillMissing')
  await dom.key(dom.input(), 'Enter')
  await dom.act(async () => vi.waitFor(() => expect(state.calls.followups).toBe(1)))
  const message = state.calls.followupInputs[0]
  expect(message.source).toEqual({ kind: 'user' })
  expect(message.content).toEqual([{ type: 'text', text: expected }])
  const result = await skillHost.invoke(message, { session: state.session })
  expect(result.injected.map(message => message.source.name)).toEqual(names)
  for (const message of result.injected) expect(message.content[0].text).toContain('隔离的 ' + message.source.name + ' 技能指令')
  expect(result.requested.every(request => request.lookup.cwd === state.session.header.cwd)).toBe(true)
})

it('selects a complete host file path from an independent menu before Enter can resend', async () => {
  const dom = await editor({ text: '请阅读', sessionId: 'target', lookup: async (sessionId, query) => {
    expect(sessionId).toBe('target')
    return { ok: true, value: query === 'same' ? [
      { path: 'a/same.md', kind: 'file' }, { path: 'b/same.md', kind: 'file' },
      { path: 'other-session', kind: 'session' },
    ] : [] }
  } })
  await dom.click(dom.button('edit'))
  await dom.change(dom.input(), '请阅读 @same')
  expect(dom.container.querySelector('[role="listbox"]')).not.toBeNull()
  expect(dom.container.querySelectorAll('[role="option"]')).toHaveLength(2)
  await dom.key(dom.input(), 'ArrowDown')
  await dom.key(dom.input(), 'Enter')
  expect(dom.calls).toHaveLength(0)
  expect(editorText(dom.input())).toBe('请阅读 @b/same.md ')
  expect(dom.container.querySelector('[data-path="b/same.md"]')).not.toBeNull()
  await dom.key(dom.input(), 'Enter')
  expect(dom.calls[0].request.text).toBe('请阅读 @b/same.md ')
})

it('drills into directories separately from selection and closes a spaced external directory before prose', async () => {
  const seen = []
  const dom = await editor({ text: '正文', lookup: async (_sessionId, query) => {
    seen.push(query)
    return { ok: true, value: query === '资料/' ? [{ path: '资料/中文 说明.md', kind: 'file' }] :
      [{ path: '资料', kind: 'directory' }, { path: 'D:/Other Project', kind: 'directory' }] }
  } })
  await dom.click(dom.button('edit'))
  await dom.change(dom.input(), '正文 @')
  await dom.click(dom.container.querySelector('[aria-label="row.fileDrill 资料"]'))
  expect(seen).toContain('资料/')
  expect(editorText(dom.input())).toBe('正文 @资料/')
  await dom.click(dom.container.querySelector('[aria-label="row.fileParent"]'))
  expect(editorText(dom.input())).toBe('正文 @')
  await dom.click(dom.container.querySelector('[aria-label="row.fileSelectDirectory D:/Other Project"]'))
  expect(editorText(dom.input())).toBe('正文 @"D:/Other Project/" ')
  await dom.key(dom.input(), 'Enter')
  expect(dom.calls[0].request.text).toBe('正文 @"D:/Other Project/" ')
  await dom.key(dom.input(), 'z', { ctrlKey: true })
  expect(editorText(dom.input())).toBe('正文 @')
})

it('changing the draft cancels both menu and restoration queries before old results can insert a tag', async () => {
  const replies = []
  const dom = await editor({ text: '正文', lookup: (_sessionId, query, signal) =>
    new Promise(resolve => replies.push({ query, signal, resolve })) })
  await dom.click(dom.button('edit'))
  await dom.change(dom.input(), '正文 @file')
  await dom.change(dom.input(), '已修改的正文')
  expect(replies.every(reply => reply.signal.aborted)).toBe(true)
  await dom.act(async () => { for (const reply of replies) reply.resolve({ ok: true, value: [{ path: 'file', kind: 'file' }] }) })
  expect(dom.container.querySelector('[data-path]')).toBeNull()
  expect(dom.container.querySelector('[role="listbox"]')).toBeNull()
  expect(editorText(dom.input())).toBe('已修改的正文')
})

it.each([
  ['Loading', (_sessionId, _query, _signal) => new Promise(() => {})],
  ['Empty', async () => ({ ok: true, value: [] })],
  ['Unavailable', undefined],
  ['Failed', async () => { throw new Error('查询失败') }],
])('distinguishes the %s menu state and retains plain text until the menu closes', async (status, lookup) => {
  const dom = await editor({ text: '原文', lookup })
  await dom.click(dom.button('edit'))
  await dom.change(dom.input(), '原文 @not-found')
  expect(dom.container.querySelector('.dsh-resend-reference-menu [role="status"]').getAttribute('aria-label')).toBe('row.file' + status)
  await dom.key(dom.input(), 'Enter')
  expect(dom.calls).toHaveLength(0)
  expect(editorText(dom.input())).toBe('原文 @not-found')
  await dom.key(dom.input(), 'Escape')
  expect(dom.input()).not.toBeNull()
  await dom.key(dom.input(), 'Enter')
  expect(dom.calls[0].request.text).toBe('原文 @not-found')
})

it('newer candidate replies win and closed editors abort their remaining queries', async () => {
  const replies = []
  const dom = await editor({ text: '原文', lookup: (_sessionId, query, signal) =>
    new Promise(resolve => replies.push({ query, signal, resolve })) })
  await dom.click(dom.button('edit'))
  await dom.change(dom.input(), '原文 @first')
  await dom.change(dom.input(), '原文 @second')
  await dom.act(async () => { for (const reply of replies.filter(item => item.query === 'second'))
    reply.resolve({ ok: true, value: [{ path: 'new/second.md', kind: 'file' }] }) })
  await dom.act(async () => { for (const reply of replies.filter(item => item.query === 'first'))
    reply.resolve({ ok: true, value: [{ path: 'old/first.md', kind: 'file' }] }) })
  expect([...dom.container.querySelectorAll('[role="option"]')].map(option => option.title)).toEqual(['new/second.md'])
  await dom.click(dom.button('cancel'))
  expect(replies.every(reply => reply.signal.aborted)).toBe(true)
  expect(dom.input()).toBeNull()
})

it('only opens at the current token, including a new line, without swallowing following prose or skill text', async () => {
  const dom = await editor({ text: '原文', lookup: async () => ({ ok: true, value: [{ path: 'file.md', kind: 'file' }] }) })
  await dom.click(dom.button('edit'))
  await dom.change(dom.input(), '正文 @file /skill')
  expect(dom.container.querySelector('.dsh-resend-reference-menu [role="status"]').getAttribute('aria-label')).toBe('row.skillUnavailable')
  await dom.key(dom.input(), 'Escape')
  await dom.key(dom.input(), 'Enter')
  expect(dom.calls[0].request.text).toBe('正文 @file /skill')
  await dom.change(dom.input(), '正文\n@file')
  expect(dom.container.querySelector('[role="option"]')?.textContent).toBe('file.md')
  await dom.key(dom.input(), 'Tab')
  expect(editorText(dom.input())).toBe('正文\n@file.md ')
})

it('old directory controls cannot replace a newer query even if a delayed click reaches them', async () => {
  const dom = await editor({ text: '原文', lookup: async (_sessionId, query) => ({ ok: true, value:
    [{ path: query.startsWith('first/') ? 'first/sub' : 'second/sub', kind: 'directory' }] }) })
  await dom.click(dom.button('edit'))
  await dom.change(dom.input(), '原文 @first/')
  await dom.click(dom.container.querySelector('[aria-label="row.fileDrill first/sub"]'))
  const oldDrill = dom.container.querySelector('[aria-label="row.fileDrill first/sub"]')
  const oldParent = dom.container.querySelector('[aria-label="row.fileParent"]')
  await dom.change(dom.input(), '原文 @second/')
  await dom.click(oldDrill)
  await dom.click(oldParent)
  expect(editorText(dom.input())).toBe('原文 @second/')
  expect(dom.calls).toHaveLength(0)
})

it('connection reset aborts pending file queries and retires visible choices while retaining the draft', async () => {
  const replies = []
  const dom = await editor({ text: '原文', lookup: (_sessionId, query, signal) =>
    new Promise(resolve => replies.push({ query, signal, resolve })) })
  await dom.click(dom.button('edit'))
  await dom.change(dom.input(), '正文 @same')
  await dom.act(async () => dom.operations.invalidateConversations())
  expect(replies.every(reply => reply.signal.aborted)).toBe(true)
  await dom.act(async () => { for (const reply of replies) reply.resolve({ ok: true, value: [{ path: 'old/same.md', kind: 'file' }] }) })
  expect(dom.container.querySelector('[role="listbox"]')).toBeNull()
  expect(editorText(dom.input())).toBe('正文 @same')
})

it('changing the target preset retires its old file choices without clearing the independent draft', async () => {
  const dom = await editor({ text: '原文', lookup: async () => ({ ok: true, value: [{ path: 'old/file.md', kind: 'file' }] }) })
  let preset = 'original'
  dom.props.useSessions = select => select({ byId: { s: { cwd: 'D:/Project', projectionValues: { agentPreset: preset } } } })
  await dom.render(dom.element())
  await dom.click(dom.button('edit'))
  await dom.change(dom.input(), '正文 @file')
  const choice = dom.container.querySelector('[role="option"]')
  preset = 'new'
  await dom.render(dom.element())
  await dom.click(choice)
  expect(dom.container.querySelector('[role="listbox"]')).toBeNull()
  expect(editorText(dom.input())).toBe('正文 @file')
})

it.each(['Escape', 'cancel'])('discards the draft, selection and undo history after closing with %s', async close => {
  const dom = await editor()
  await dom.click(dom.button('edit'))
  await dom.change(dom.input(), '本次编辑 @b/same.md /research')
  expect(editorText(dom.input())).toBe('本次编辑 @b/same.md /research')
  expect(dom.operations.draftFor({ sessionId: 's', targetSeq: 0 }, dom.props.node.data.text)?.text).toBe('本次编辑 @b/same.md /research')
  if (close === 'Escape') {
    await dom.key(dom.input(), 'Escape')
    if (dom.input()) await dom.key(dom.input(), 'Escape')
  }
  else await dom.click(dom.button('cancel'))
  expect(dom.operations.draftFor({ sessionId: 's', targetSeq: 0 }, dom.props.node.data.text)).toBeUndefined()
  await dom.click(dom.button('edit'))
  expect(editorText(dom.input())).toBe(dom.props.node.data.text)
  await dom.key(dom.input(), 'z', { ctrlKey: true })
  expect(editorText(dom.input())).toBe(dom.props.node.data.text)
})

it('restores complete paths, preserves skill text and never guesses unknown mentions', async () => {
  const text = '阅读 @a/same.md 与 @b/same.md @"资料/中文 说明.md" @"有 空格/" /tdd /missing @unknown 邮箱x@y.com'
  const seen = []
  const dom = await editor({ text, lookup: async (sessionId, query) => {
    seen.push({ sessionId, query })
    return { ok: true, value: query === 'unknown' ? [{ path: 'somewhere/unknown', kind: 'file' }] :
      [{ path: query, kind: query === '有 空格' ? 'directory' : 'file' }] }
  } })
  await dom.click(dom.button('edit'))
  expect(editorText(dom.input())).toBe(text)
  expect([...dom.container.querySelectorAll('[data-path]')].map(node => node.dataset.path))
    .toEqual(['a/same.md', 'b/same.md', '资料/中文 说明.md', '有 空格'])
  expect(seen.every(item => item.sessionId === 's')).toBe(true)
  expect(seen).toContainEqual({ sessionId: 's', query: '有 空格' })
  expect(seen.some(item => item.query.endsWith('/'))).toBe(false)
  await dom.click(dom.container.querySelector('[data-path="a/same.md"] button'))
  await dom.key(dom.input(), 'Enter')
  expect(dom.calls[0]).toEqual({ phase: 'start', request: { sessionId: 's', targetSeq: 0, op: 'edit', text: text.replace('@a/same.md', '') } })
  expect(editorText(dom.input())).toBe(text.replace('@a/same.md', ''))
})

it('late reference lookup cannot overwrite an edited draft or attach to a closed editor', async () => {
  const replies = []
  const dom = await editor({ lookup: (_sessionId, _query, signal) => new Promise(resolve => replies.push({ resolve, signal })) })
  await dom.click(dom.button('edit'))
  await dom.change(dom.input(), '已经修改 /tdd')
  await dom.act(async () => replies[0].resolve({ ok: true, value: [{ path: 'a/same.md', kind: 'file' }] }))
  expect(editorText(dom.input())).toBe('已经修改 /tdd')
  expect(dom.container.querySelector('[data-path]')).toBeNull()
  await dom.key(dom.input(), 'Escape')
  expect(replies[0].signal.aborted).toBe(true)
})

it('restores references after CRLF and CR without changing original line endings', async () => {
  const text = '第一行\r\n引用 @a/same.md\r下一行 @b/same.md\n/tdd'
  const dom = await editor({ text, lookup: async (_sessionId, query) => ({ ok: true, value: [{ path: query, kind: 'file' }] }) })
  await dom.click(dom.button('edit'))
  expect(editorText(dom.input())).toBe(text)
  expect(dom.container.querySelectorAll('[data-path]')).toHaveLength(2)
  await dom.key(dom.input(), 'Enter')
  expect(dom.calls[0].request.text).toBe(text)
})

it('switching locale updates all open editor labels without replacing its draft or selection', async () => {
  const dom = await editor({ lookup: async () => ({ ok: true, value: [{ path: 'a/same.md', kind: 'file' }] }) })
  await dom.click(dom.button('edit'))
  const input = dom.input()
  await dom.change(input, '编辑后的文字 @a/same.md /tdd')
  const saved = dom.operations.draftFor({ sessionId: 's', targetSeq: 0 }, dom.props.node.data.text)
  dom.props.t = key => '中文:' + key
  await dom.render(dom.element())
  expect(dom.input()).toBe(input)
  expect(input.getAttribute('aria-label')).toBe('中文:row.editInput')
  expect(dom.container.querySelector('[data-path] button').getAttribute('aria-label')).toBe('中文:row.removeReference a/same.md')
  expect(editorText(input)).toBe(saved.text)
  const after = dom.operations.draftFor({ sessionId: 's', targetSeq: 0 }, dom.props.node.data.text)
  expect(after.state.selection.eq(saved.state.selection)).toBe(true)
})

it('unmounting the row discards its draft and reopening starts from the message source', async () => {
  const dom = await editor({ replay: () => ({ ok: true, value: { carrierSeq: 5, shadowedSeqs: [0], resendMessageId: 'accepted' } }) })
  await dom.click(dom.button('edit'))
  await dom.change(dom.input(), '保留的草稿 /tdd')
  await dom.render(null)
  expect(dom.operations.draftFor({ sessionId: 's', targetSeq: 0 }, dom.props.node.data.text)).toBeUndefined()
  await dom.render(dom.element())
  await dom.click(dom.button('edit'))
  expect(editorText(dom.input())).toBe(dom.props.node.data.text)
  await dom.key(dom.input(), 'Enter')
  expect(dom.input()).toBeNull()
  expect(dom.operations.draftFor({ sessionId: 's', targetSeq: 0 }, dom.props.node.data.text)).toBeUndefined()
})

it('preflight freezes text and chip removal; cancel restores the current edit', async () => {
  const dom = await editor({ lookup: async () => ({ ok: true, value: [{ path: 'a/same.md', kind: 'file' }] }),
    replay: input => input.phase === 'cancel' ? { ok: true, value: { canceled: true } } :
      { ok: true, value: { preflight: true, preflightId: 'plan', userSeq: 0, op: 'edit', files: [] } } })
  await dom.click(dom.button('edit'))
  const input = dom.input()
  await dom.key(input, 'Enter')
  expect(input.getAttribute('contenteditable')).toBe('false')
  const remove = dom.container.querySelector('[data-path] button')
  expect(remove.disabled).toBe(true)
  await dom.change(input, '预检期间不允许写入')
  await dom.click(remove)
  expect(editorText(input)).toBe('原文 @a/same.md /tdd')
  await dom.act(async () => dom.operations.chooseReplay('s', 'cancel'))
  expect(input.getAttribute('contenteditable')).toBe('true')
  expect(remove.disabled).toBe(false)
  expect(editorText(input)).toBe('原文 @a/same.md /tdd')
})

it('blank and IME confirmation never send; refusal and exception preserve the draft', async () => {
  const dom = await editor({ replay: () => { throw new Error('transport failed') } })
  await dom.click(dom.button('edit'))
  await dom.change(dom.input(), ' \n\t')
  await dom.key(dom.input(), 'Enter')
  expect(dom.calls).toEqual([])
  await dom.change(dom.input(), '输入法正文 /tdd')
  await dom.key(dom.input(), 'Enter', { isComposing: true })
  await dom.key(dom.input(), 'Enter', { keyCode: 229 })
  expect(dom.calls).toEqual([])
  await dom.key(dom.input(), 'Enter')
  expect(editorText(dom.input())).toBe('输入法正文 /tdd')
  expect(dom.input().getAttribute('contenteditable')).toBe('true')
})
