import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { createRoot } from 'react-dom/client'

const h = React.createElement
const icon = () => h('svg', { width: 16, height: 16 })
const primitives = {
  Button: React.forwardRef(({ variant, size, icon, ...props }, ref) => h('button', { ...props, ref })),
  Tooltip: ({ children }) => children,
  FileTypeIcon: icon,
  ...Object.fromEntries(['Close', 'Edit', 'PaperPlane', 'Refresh', 'Warning', 'Check', 'Shield'].map(name => ['Icon' + name + 'OutlineRegular', icon])),
}
const dictionary = {
  'row.edit': '编辑', 'row.send': '发送', 'row.cancel': '取消', 'row.editInput': '编辑消息',
  'row.temporaryInput': '临时输入框', 'row.removeReference': '删除引用', 'row.editInComposer': '在正式输入框中编辑',
  'replay.cancel': '取消重发', 'replay.keep': '保留文件并重发', 'replay.restoreCount': '还原文件并重发',
  'files.title': '重发前确认文件',
  'row.fileCandidates': '文件与目录候选', 'row.fileParent': '返回上级', 'row.fileClose': '关闭文件菜单',
  'row.fileSelect': '引用文件', 'row.fileSelectDirectory': '引用目录', 'row.fileDrill': '进入目录',
  'row.fileLoading': '正在查询文件与目录…', 'row.fileReady': '选择仅引用路径；目录可选定或进入。',
  'row.fileEmpty': '没有匹配的文件或目录，可修改查询。', 'row.fileUnavailable': '宿主未提供文件查询',
  'row.fileFailed': '文件查询失败，原文已保留。',
}
const text = '请先阅读 @a/same.md 和 @b/same.md @"资料/中文 说明.md" @"有 空格/" @"D:/Other Project/说明.md"\n使用 /tdd /code-review /missing；保留 @unknown 和邮箱a@b.com。'
const paths = ['a/same.md', 'b/same.md', '资料/中文 说明.md', '有 空格', 'D:/Other Project/说明.md']
window.__ModuleLoader__ = { load({ factory }) {
  const table = { react: React, 'react-dom': ReactDOM, '@deepseek-ai/dsh-client-ui-primitives': primitives }
  const face = factory(name => { if (!(name in table)) throw new Error('模块表缺失 ' + name); return table[name] })
  const calls = [], received = [], lookups = [], delayed = []
  let mode = 'refuse', lookupMode = 'ready', current = { sessionId: 's', seq: 0 }, running = false, valid = true, carrier = 20
  let preset = 'original'
  const plans = new Map()
  const savedPreferences = { ready: true, restrictEditToLastUserMessage: false, inlineEditorBeneathMessage: true }
  const preferences = { getSnapshot: () => savedPreferences, subscribe: () => () => {} }
  const operations = face.createResendOperations({
    fileReferences: { list: async (sessionId, query, signal) => {
      lookups.push({ sessionId, query, signal })
      if (lookupMode === 'failed') throw new Error('文件查询不可用')
      if (lookupMode === 'delayed') await new Promise(resolve => delayed.push({ query, resolve }))
      if (signal.aborted) return { ok: false }
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
        received.push(request)
        return { ok: true, value: { ok: true, value: { carrierSeq: carrier++, shadowedSeqs: [], ...(mode === 'owed' ? {} : { resendMessageId: 'accepted' }) } } }
      },
      apply: async request => {
        calls.push({ retry: request }); received.push(request)
        return { ok: true, value: { ok: true, value: { carrierSeq: carrier - 1, shadowedSeqs: [], resendMessageId: 'accepted-retry' } } }
      },
    },
  })
  let root = createRoot(document.getElementById('row'))
  function render() {
    const node = { key: 'u' + current.seq, kind: 'user', anchorSeq: current.seq, data: { seq: current.seq, text } }
    const nodes = new Map([[node.key, node]])
    root.render(h(face.UserActionsRow, { node, ...current, operations, preferences, t: key => dictionary[key] ?? key,
      useChat: select => select({ nodes }), useSession: select => select({ running }),
      useSessions: select => select({ byId: { [current.sessionId]: { cwd: 'D:/Project', projectionValues: { agentPreset: preset } } } }),
      inputActions: { setDraft: () => { throw new Error('禁止改动正式 Composer') } },
    }))
  }
  window.richInputFixture = {
    text, calls, received, lookups,
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
