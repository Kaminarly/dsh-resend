import { createElement as h, useRef, useState } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'

export const formatStorageBytes = bytes => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`
}

const icon = (kind, key = kind) => h('svg', {
  key, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7,
  strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
  className: kind === 'spinner' ? 'dsh-resend-cleanup-spinner' : undefined,
}, h('path', { d: {
  spinner: 'M21 12a9 9 0 1 1-9-9',
  storage: 'M4 5h16v5H4z M4 14h16v5H4z M7 7.5h.01 M7 16.5h.01',
  residue: 'm15 3 6 6-12 12-6-6z M9 9l6 6 M14 21h7',
  sessions: 'M5 3h10l4 4v14H5z M14 3v5h5 M9 12h6 M9 16h6',
  arrow: 'M5 12h14 m-5-5 5 5-5 5',
}[kind] }))

export function StorageCleanup({ operations, t }) {
  const [mode, setMode] = useState('residue')
  const [answer, setAnswer] = useState()
  const [selected, setSelected] = useState([])
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const inFlight = useRef(false)
  async function call(request) {
    if (inFlight.current) return
    inFlight.current = true; setPending(request.phase); setError('')
    try {
      const result = await operations.cleanup(request)
      if (!result.ok) { setError(result.error.code); return }
      setAnswer(result.value.phase === 'cancel' ? undefined : result.value)
    } catch { setError('connection') }
    finally { inFlight.current = false; setPending(false) }
  }
  async function open(next) {
    if (inFlight.current) return
    if (answer?.phase === 'preview') {
      // Retire the old server plan before opening another entry.
      await call({ mode, phase: 'cancel', planId: answer.planId })
    }
    setMode(next); setAnswer(undefined); setSelected([])
    await call({ mode: next, phase: next === 'sessions' ? 'list' : 'preview' })
  }
  const button = (key, text, onClick, disabled = false, variant = 'outline') => {
    const working = pending === ({ preview: 'preview', confirm: 'execute', cancel: 'cancel' })[key]
    return h(Button, {
      key, type: 'button', disabled: !!pending || disabled, onClick, size: 'sm', variant,
      className: 'dsh-resend-cleanup-button', 'aria-busy': working || undefined,
    }, [working ? icon('spinner') : null, h('span', { key: 'text' }, text)])
  }
  const sessions = answer?.sessions ?? []
  const entry = next => h('button', {
    key: next, type: 'button', className: 'dsh-resend-cleanup-entry', disabled: !!pending,
    'aria-label': t('cleanup.' + next), 'aria-pressed': mode === next && (!!answer || !!pending),
    onClick: () => { void open(next) },
  }, [icon(next), h('span', { key: 'copy', className: 'dsh-resend-cleanup-entry-copy' }, [
    h('strong', { key: 'title' }, t('cleanup.' + next)),
    h('span', { key: 'hint' }, t('cleanup.' + next + 'Hint')),
  ]), icon('arrow')])
  return h('section', { className: 'dsh-resend-cleanup', 'aria-label': t('cleanup.heading'), 'aria-busy': !!pending }, [
    h('div', { key: 'heading', className: 'dsh-resend-cleanup-heading' }, [icon('storage'), h('h3', { key: 'title' }, t('cleanup.heading'))]),
    h('p', { key: 'scope', className: 'dsh-resend-settings-description' }, t('cleanup.scope')),
    h('div', { key: 'entries', className: 'dsh-resend-cleanup-entries' }, [entry('residue'), entry('sessions')]),
    pending ? h('div', { key: 'pending', className: 'dsh-resend-cleanup-pending', role: 'status', 'aria-live': 'polite' }, [
      icon('spinner'), h('div', { key: 'copy' }, [
        h('strong', { key: 'title' }, t('cleanup.processing')),
        h('p', { key: 'hint' }, t('cleanup.processing.' + pending)),
      ]),
    ]) : null,
    error ? h('div', { key: 'error', className: 'dsh-resend-cleanup-error', role: 'alert' }, [
      h('p', { key: 'text' }, t('cleanup.error.' + (['bad-request', 'plan-not-found', 'storage-busy', 'unsafe-storage', 'scan-failed', 'internal', 'connection'].includes(error) ? error : 'internal'))),
      button('retry', t('cleanup.retry'), () => { void open(mode) }),
    ]) : null,
    answer?.unreadableSessions > 0 ? h('p', { key: 'unreadable', className: 'dsh-resend-rollback-warning' }, t('cleanup.unreadable', { count: answer.unreadableSessions })) : null,
    answer?.protectedObjects ? h('p', { key: 'protected', className: 'dsh-resend-settings-description' }, t('cleanup.protected')) : null,
    answer?.phase === 'list' ? h('div', { key: 'list', className: 'dsh-resend-cleanup-panel' }, [
      h('div', { key: 'header', className: 'dsh-resend-cleanup-panel-header' }, [
        h('h4', { key: 'title' }, t('cleanup.chooseSessions')),
        h('span', { key: 'total', className: 'dsh-resend-cleanup-meta' }, t('cleanup.sessionCount', { count: sessions.length })),
      ]),
      h('p', { key: 'hint', className: 'dsh-resend-cleanup-hint' }, t(sessions.length === 0 ? 'cleanup.emptySessions' : 'cleanup.select')),
      h('ul', { key: 'sessions', className: 'dsh-resend-cleanup-list' }, sessions.map(session => h('li', { key: session.sessionId },
        h('label', { className: 'dsh-resend-cleanup-session', 'data-selected': selected.includes(session.sessionId) }, [
          h('input', { key: 'check', type: 'checkbox', disabled: !!pending, checked: selected.includes(session.sessionId),
            onChange: event => setSelected(ids => event.target.checked ? [...ids, session.sessionId] : ids.filter(id => id !== session.sessionId)) }),
          h('span', { key: 'info', className: 'dsh-resend-cleanup-session-info' }, [h('strong', { key: 'title' }, session.title),
            h('span', { key: 'path', className: 'dsh-resend-cleanup-path' }, session.projectPath || session.sessionId),
            h('span', { key: 'size', className: 'dsh-resend-cleanup-path' }, t('cleanup.sessionDetail', { count: session.records, size: formatStorageBytes(session.bytes) })),
            session.noSnapshots ? h('span', { key: 'empty', className: 'dsh-resend-cleanup-badge' }, t('cleanup.noSnapshots')) : null]),
        ])))),
      sessions.length > 0 ? h('div', { key: 'footer', className: 'dsh-resend-cleanup-footer' }, [
        h('span', { key: 'selected', className: 'dsh-resend-cleanup-meta', 'aria-live': 'polite' }, t('cleanup.selectedCount', { count: selected.length })),
        button('preview', t('cleanup.previewSelection', { count: selected.length }), () => { void call({ mode, phase: 'preview', sessionIds: selected }) }, selected.length === 0, 'primary'),
      ]) : null,
    ]) : null,
    answer?.phase === 'preview' ? h('div', { key: 'preview', className: 'dsh-resend-cleanup-panel' }, [
      h('div', { key: 'heading', className: 'dsh-resend-cleanup-panel-header' }, h('h4', null, t('cleanup.preview'))),
      h('p', { key: 'size', className: 'dsh-resend-cleanup-space' }, t('cleanup.estimated', { size: formatStorageBytes(answer.estimatedBytes) })),
      answer.itemCount === 0 ? h('p', { key: 'empty', className: 'dsh-resend-cleanup-hint' }, t('cleanup.empty')) : null,
      h('ul', { key: 'categories', className: 'dsh-resend-cleanup-summary' }, answer.categories.filter(category => category.count > 0).map(category =>
        h('li', { key: category.kind }, t('cleanup.category.' + category.kind, { count: category.count, size: formatStorageBytes(category.bytes) })))),
      sessions.length > 0 ? h('ul', { key: 'selected', className: 'dsh-resend-cleanup-summary' }, sessions.map(session => h('li', { key: session.sessionId }, `${session.title} · ${session.projectPath || session.sessionId}`))) : null,
      answer.itemCount > 0 ? h('p', { key: 'impact', className: 'dsh-resend-rollback-warning dsh-resend-cleanup-impact' }, t(mode === 'residue' ? 'cleanup.residueImpact' : 'cleanup.sessionImpact')) : null,
      h('div', { key: 'actions', className: 'dsh-resend-cleanup-footer dsh-resend-cleanup-actions' }, [
        button('cancel', t('cleanup.cancel'), () => { void call({ mode, phase: 'cancel', planId: answer.planId }) }),
        answer.itemCount > 0 ? button('confirm', t('cleanup.confirm'), () => { void call({ mode, phase: 'execute', planId: answer.planId }) }, !!error, 'primary') : null,
      ]),
    ]) : null,
    answer?.phase === 'execute' ? h('div', { key: 'result', className: 'dsh-resend-cleanup-panel dsh-resend-cleanup-result', role: 'status' }, [
      h('div', { key: 'heading', className: 'dsh-resend-cleanup-panel-header' }, h('h4', null, t('cleanup.result'))),
      h('p', { key: 'size', className: 'dsh-resend-cleanup-space' }, t('cleanup.released', { size: formatStorageBytes(answer.releasedBytes) })),
      h('ul', { key: 'items', className: 'dsh-resend-cleanup-summary' }, answer.results.map(result => h('li', { key: result.sessionId, 'data-status': result.status }, [
        `${result.title}：${t('cleanup.status.' + result.status)}`,
        result.reason ? ` · ${t('cleanup.reason.' + result.reason)}` : '',
      ]))),
      answer.failures.length > 0 ? h('div', { key: 'failures', role: 'alert' }, [
        h('p', { key: 'text' }, t('cleanup.failedCount', { count: answer.failures.length })),
        h('ul', { key: 'files' }, answer.failures.map(failure => h('li', { key: failure.item }, failure.item))),
      ]) : null,
      answer.changedCount > 0 ? h('p', { key: 'changed' }, t('cleanup.changed', { count: answer.changedCount })) : null,
      answer.results.length === 0 && answer.failures.length === 0 && answer.changedCount === 0 ? h('p', { key: 'done' }, t('cleanup.residueDone')) : null,
    ]) : null,
  ])
}

export const CLEANUP_DICTIONARIES = {
  'zh-CN': {
    'cleanup.heading': '回滚数据清理',
    'cleanup.scope': '管理当前 DSH 数据目录中本插件保存的数据。该目录可能由多个 Profile 共用；会话、工作文件、插件设置和其他插件数据均保留。',
    'cleanup.residue': '清理无用残留', 'cleanup.sessions': '按会话清除回滚数据',
    'cleanup.residueHint': '检查无归属回滚数据、未引用内容和遗留临时文件。',
    'cleanup.sessionsHint': '选择需要清理的会话，预览范围后再确认。',
    'cleanup.chooseSessions': '选择会话', 'cleanup.sessionCount': '共 {count} 个会话', 'cleanup.selectedCount': '已选 {count} 个会话',
    'cleanup.processing': '正在处理，请稍候…', 'cleanup.retry': '重新读取并预览',
    'cleanup.processing.list': '正在读取会话和回滚记录。数据较多时可能需要一些时间，请保持此页面打开。',
    'cleanup.processing.preview': '正在核对清理范围并计算可释放空间，请保持此页面打开。',
    'cleanup.processing.execute': '正在清理已确认的数据，请保持此页面打开，完成后将显示结果。',
    'cleanup.processing.cancel': '正在取消清理预览，请稍候。',
    'cleanup.select': '选择要清除历史文件回滚数据的会话（可多选）。相关体积可能包含共享内容，最终释放空间以确认页为准。',
    'cleanup.emptySessions': '当前查询范围内没有可清除回滚数据的会话。', 'cleanup.noSnapshots': '无文件快照',
    'cleanup.sessionDetail': '{count} 条回滚记录 · 相关体积 {size}', 'cleanup.previewSelection': '预览所选 {count} 个会话',
    'cleanup.preview': '确认清理范围', 'cleanup.estimated': '预计释放空间：{size}', 'cleanup.empty': '没有可清理项。',
    'cleanup.category.records': '回滚清单：{count} 项 · {size}', 'cleanup.category.outcomes': '回滚完成结果：{count} 项 · {size}',
    'cleanup.category.objects': '不再使用的文件内容：{count} 项 · {size}', 'cleanup.category.temporary': '遗留临时文件：{count} 项 · {size}',
    'cleanup.residueImpact': '无法确认会话归属的回滚数据也会删除。这些数据可能仍有用途，删除后无法恢复；已识别会话的历史回滚数据保留。',
    'cleanup.sessionImpact': '所选会话已保存的历史文件回滚数据将不可恢复，已有恢复预览会失效。后续新操作仍可产生新的回滚记录。执行时跳过忙碌会话。',
    'cleanup.confirm': '确认清理', 'cleanup.cancel': '取消', 'cleanup.result': '清理结果', 'cleanup.released': '实际释放空间：{size}',
    'cleanup.status.cleaned': '已清理', 'cleanup.status.skipped': '已跳过', 'cleanup.status.failed': '清理未完成',
    'cleanup.reason.generating': '正在生成回复', 'cleanup.reason.editing': '正在编辑重发', 'cleanup.reason.rolling-back': '正在执行文件回滚',
    'cleanup.reason.preview-stale': '数据已变化，请重新预览', 'cleanup.reason.delete-failed': '部分数据删除失败，请重试',
    'cleanup.reason.coordination-unavailable': '无法确认其他窗口的使用状态，请稍后重试',
    'cleanup.failedCount': '{count} 项删除失败，未全部清理完成。', 'cleanup.changed': '{count} 项因范围变化或正在使用而保留，请重新预览。',
    'cleanup.residueDone': '预览中的无用残留已清理。',
    'cleanup.protected': '部分保留清单无法完整读取，相关文件内容暂不回收。',
    'cleanup.unreadable': '{count} 个会话日志无法读取，部分数据可能无法识别归属；无归属数据仅会在「清理无用残留」中纳入删除。',
    'cleanup.error.bad-request': '所选数据已变化，请重新读取并预览。', 'cleanup.error.plan-not-found': '清理预览已失效，请重新预览。',
    'cleanup.error.storage-busy': '本插件数据正在被其他操作使用，请稍后重试。',
    'cleanup.error.unsafe-storage': '本插件存储路径包含链接或异常文件，已停止清理。',
    'cleanup.error.scan-failed': '数据读取失败，清理未执行。请检查存储和会话后重试。',
    'cleanup.error.internal': '清理未完成，请重新读取并检查结果。',
    'cleanup.error.connection': '与 DSH 的通信中断，执行结果尚未确认。请重新读取并预览。',
  },
  en: {
    'cleanup.heading': 'Rollback data cleanup',
    'cleanup.scope': 'Manage data saved by this plugin in the current DSH data directory, which may be shared across Profiles. Conversations, work files, settings and other plugins are preserved.',
    'cleanup.residue': 'Clean unused leftovers', 'cleanup.sessions': 'Clear rollback data by conversation',
    'cleanup.residueHint': 'Check unowned rollback data, unreferenced contents and leftover temporary files.',
    'cleanup.sessionsHint': 'Select conversations and review the scope before confirming.',
    'cleanup.chooseSessions': 'Select conversations', 'cleanup.sessionCount': '{count} conversations', 'cleanup.selectedCount': '{count} selected',
    'cleanup.processing': 'Processing…', 'cleanup.retry': 'Read and preview again',
    'cleanup.processing.list': 'Reading conversations and rollback records. Large datasets may take a while. Keep this page open.',
    'cleanup.processing.preview': 'Checking the cleanup scope and calculating releasable space. Keep this page open.',
    'cleanup.processing.execute': 'Cleaning the confirmed data. Keep this page open until the results appear.',
    'cleanup.processing.cancel': 'Canceling the cleanup preview. Please wait.',
    'cleanup.select': 'Select conversations to clear saved file rollback data (multiple selection). Related sizes may include shared contents; the confirmation shows the releasable total.',
    'cleanup.emptySessions': 'No conversations with rollback data in the current query scope.', 'cleanup.noSnapshots': 'No file snapshots',
    'cleanup.sessionDetail': '{count} rollback records · {size} related data', 'cleanup.previewSelection': 'Preview {count} selected conversations',
    'cleanup.preview': 'Confirm cleanup scope', 'cleanup.estimated': 'Estimated space released: {size}', 'cleanup.empty': 'Nothing to clean.',
    'cleanup.category.records': 'Rollback manifests: {count} · {size}', 'cleanup.category.outcomes': 'Completion results: {count} · {size}',
    'cleanup.category.objects': 'Unused file contents: {count} · {size}', 'cleanup.category.temporary': 'Leftover temporary files: {count} · {size}',
    'cleanup.residueImpact': 'Rollback data with unknown conversation ownership will also be deleted. It may still be useful and cannot be recovered after deletion. Identified conversations retain their rollback data.',
    'cleanup.sessionImpact': 'Saved historical file rollback data for selected conversations cannot be recovered. Existing restore previews expire. New operations can still save new rollback records. Busy conversations are skipped.',
    'cleanup.confirm': 'Confirm cleanup', 'cleanup.cancel': 'Cancel', 'cleanup.result': 'Cleanup results', 'cleanup.released': 'Space released: {size}',
    'cleanup.status.cleaned': 'Cleaned', 'cleanup.status.skipped': 'Skipped', 'cleanup.status.failed': 'Incomplete',
    'cleanup.reason.generating': 'Generating a reply', 'cleanup.reason.editing': 'Editing and resending', 'cleanup.reason.rolling-back': 'Restoring files',
    'cleanup.reason.preview-stale': 'Data changed; preview again', 'cleanup.reason.delete-failed': 'Some data could not be deleted; retry',
    'cleanup.reason.coordination-unavailable': 'Other windows could not be checked; retry later',
    'cleanup.failedCount': '{count} items could not be deleted. Cleanup is incomplete.', 'cleanup.changed': '{count} items were retained because the scope changed or they are in use. Preview again.',
    'cleanup.residueDone': 'Previewed leftovers were cleaned.',
    'cleanup.protected': 'Some retained manifests cannot be fully read. File contents are preserved.',
    'cleanup.unreadable': '{count} conversation logs could not be read. Some data may have unknown ownership; only Clean unused leftovers includes such data for deletion.',
    'cleanup.error.bad-request': 'The selected data changed. Read and preview again.', 'cleanup.error.plan-not-found': 'The cleanup preview expired. Preview again.',
    'cleanup.error.storage-busy': 'Other operations are using plugin data. Try again later.',
    'cleanup.error.unsafe-storage': 'The plugin storage contains links or unexpected files. Cleanup stopped.',
    'cleanup.error.scan-failed': 'Data could not be read. Cleanup did not run. Check storage and conversations and retry.',
    'cleanup.error.internal': 'Cleanup did not finish. Read again and check the results.',
    'cleanup.error.connection': 'Communication with DSH was interrupted. The result is unconfirmed. Read and preview again.',
  },
}
