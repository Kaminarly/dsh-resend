const React = window.__UI_SEEDS__.react
const ReactDOM = window.__UI_SEEDS__['react-dom']
const { createRoot } = window.__UI_SEEDS__['react-dom/client']

const h = React.createElement
const primitives = window.__UI_SEEDS__['@deepseek-ai/dsh-client-ui-primitives']
let dictionary
const text = '请先阅读 @a/same.md 和 @b/same.md @"资料/中文 说明.md" @"有 空格/" @"D:/Other Project/说明.md"\n使用 /tdd /code-review /missing；保留 @unknown 和邮箱a@b.com。'
const paths = ['a/same.md', 'b/same.md', '资料/中文 说明.md', '有 空格', 'D:/Other Project/说明.md']
const longPath = 'D:/Other Project/' + '很长的目录名称/'.repeat(12) + '中文说明.md'
window.__ModuleLoader__ = { async load({ factory }) {
  const table = { react: React, 'react-dom': ReactDOM, '@deepseek-ai/dsh-client-ui-primitives': primitives }
  const face = factory(name => { if (!(name in table)) throw new Error('模块表缺失 ' + name); return table[name] })
  await face.apply({ remote: { $mount: async () => {} }, root: {}, inject: (_deps, callback) => callback({
    remote: {}, inject() {}, effect: fn => fn(), on() {},
    locale: { register: (_ns, table) => { dictionary = table.zh }, bind: () => key => dictionary[key] ?? key },
    uiConversation: { events: { register: () => () => {} } }, slots: { inject() {} },
  }) })
  const calls = [], received = [], openedFiles = [], openedSkills = [], lookups = [], delayed = [], skillLookups = [], skillDelayed = [], loaded = []
  let mode = 'refuse', lookupMode = 'ready', current = { sessionId: 's', seq: 0 }, running = false, valid = true, carrier = 20
  let preset = 'original', previewMode = 'ready'
  let skillMode = 'ready', skillCatalog = [
    { name: 'tdd', description: '测试驱动', modelInvocable: true },
    { name: 'code-review', description: '代码审查', modelInvocable: true },
    { name: 'help', description: '同名技能', modelInvocable: true },
    { name: 'user-only', description: '仅用户调用', modelInvocable: false },
  ]
  async function receive(request) {
    const response = await fetch('/load-skills', { method: 'POST', body: JSON.stringify({
      role: 'user', source: { kind: 'user' }, content: [{ type: 'text', text: request.text }],
    }) })
    if (!response.ok) throw new Error('隔离技能加载失败')
    loaded.push(await response.json())
    received.push(request)
  }
  const plans = new Map()
  const savedPreferences = { ready: true, restrictEditToLastUserMessage: false, inlineEditorBeneathMessage: true }
  const preferences = { getSnapshot: () => savedPreferences, subscribe: () => () => {} }
  const operations = face.createResendOperations({
    skills: { list: async (request, signal) => {
      const call = { sessionId: request.sessionId, signal }
      skillLookups.push(call)
      if (skillMode === 'failed') throw new Error('技能查询失败')
      if (skillMode === 'unavailable') return { ok: false, unavailable: true }
      let skills = skillCatalog
      if (skillMode === 'delayed') skills = await new Promise(resolve => skillDelayed.push({ call, resolve }))
      return { ok: true, value: { skills } }
    } },
    fileReferences: { list: async (sessionId, query, signal) => {
      lookups.push({ sessionId, query, signal })
      if (lookupMode === 'unavailable') return { ok: false, unavailable: true }
      if (lookupMode === 'failed') throw new Error('文件查询不可用')
      if (lookupMode === 'delayed') await new Promise(resolve => delayed.push({ query, resolve }))
      if (signal.aborted) return { ok: false }
      if (query === 'long' || query === longPath) return { ok: true, value: [{ path: longPath, kind: 'file' }] }
      if (query === 'many') return { ok: true, value: Array.from({ length: 20 }, (_, index) => ({ path: `文件 ${index + 1}.md`, kind: 'file' })) }
      const searchPaths = [...paths, '有 空格/子 目录', '有 空格/子 目录/中文.md']
      return { ok: true, value: searchPaths.filter(path => path === query || path + '/' === query ||
        query === '' || path.includes(query)).map(path => ({ path, kind: ['有 空格', '有 空格/子 目录'].includes(path) ? 'directory' : 'file' })) }
    } },
    resend: {
      conversation: async () => ({ ok: true, value: { ok: true, value: { userSeqs: valid ? [0, 2] : [], lastUserSeq: valid ? 2 : undefined, assistantSeqs: [] } } }),
      replay: async input => {
        calls.push(input)
        if (mode === 'throw') throw new Error('发送连接异常')
        if (input.phase === 'cancel') { plans.delete(input.sessionId); return { ok: true, value: { ok: true, value: { canceled: true } } } }
        if (input.phase === 'start' && mode === 'preflight') {
          plans.set(input.request.sessionId, input.request)
          return { ok: true, value: { ok: true, value: { preflight: true, preflightId: 'plan', userSeq: input.request.targetSeq, op: 'edit', files: [{ path: 'a/same.md', action: 'restore' }] } } }
        }
        const request = input.request ?? plans.get(input.sessionId)
        if (mode === 'refuse') return { ok: true, value: { ok: false, error: { code: 'agent-busy' } } }
        await receive(request)
        return { ok: true, value: { ok: true, value: { carrierSeq: carrier++, shadowedSeqs: [], ...(mode === 'owed' ? {} : { resendMessageId: 'accepted' }) } } }
      },
      apply: async request => {
        calls.push({ retry: request }); await receive(request)
        return { ok: true, value: { ok: true, value: { carrierSeq: carrier - 1, shadowedSeqs: [], resendMessageId: 'accepted-retry' } } }
      },
    },
  })
  let root = createRoot(document.getElementById('row'))
  function render() {
    const node = { key: 'u' + current.seq, kind: 'user', anchorSeq: current.seq, data: { seq: current.seq, text } }
    const nodes = new Map([[node.key, node]])
    root.render(h(face.UserActionsRow, { node, ...current, operations, preferences, t: key => dictionary[key] ?? key,
      openFile: previewMode === 'unavailable' ? undefined : path => {
        if (previewMode === 'failed') throw new Error('隔离预览失败')
        openedFiles.push(path)
      }, openSkill: previewMode === 'unavailable' ? undefined : name => {
        if (previewMode === 'failed') throw new Error('隔离预览失败')
        openedSkills.push(name)
      },
      useChat: select => select({ nodes }), useSession: select => select({ running }),
      useSessions: select => select({ byId: { [current.sessionId]: { cwd: 'D:/Project', projectionValues: { agentPreset: preset } } } }),
      inputActions: { setDraft: () => { throw new Error('禁止改动正式 Composer') } },
    }))
  }
  window.richInputFixture = {
    text, longPath, calls, received, openedFiles, openedSkills, lookups, skillLookups, loaded,
    previewMode(value) { previewMode = value; render() },
    skillMode(value) { skillMode = value },
    skills(value) { skillCatalog = value },
    releaseSkills(index, skills) { const entry = skillDelayed[index]; if (entry) entry.resolve(skills) },
    skillPresetEvent(sessionId) { operations.invalidateReferenceQueries(sessionId) },
    mode(value) { mode = value },
    lookupMode(value) { lookupMode = value },
    resetConnection() { operations.invalidateConversations() },
    preset(value) { preset = value; render() },
    release(query) { for (let i = delayed.length - 1; i >= 0; i--) {
      if (query === undefined || delayed[i].query === query) delayed.splice(i, 1)[0].resolve()
    } },
    switchTarget(sessionId, seq) { current = { sessionId, seq }; render() },
    running(value) { running = value; render() },
    async invalidate(value) { valid = value; await operations.refreshConversation(current.sessionId, operations.recordsFor(current.sessionId).length, true); render() },
    remount() { root.unmount(); root = createRoot(document.getElementById('row')); render() },
    retry: () => operations.sendAgain({ sessionId: current.sessionId, carrierSeq: carrier - 1 }),
  }
  render()
} }
