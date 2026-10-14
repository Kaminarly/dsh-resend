import { createElement as h, useEffect, useState } from 'react'
import { Button, Modal } from '@deepseek-ai/dsh-client-ui-primitives'

export const CONTENT_DICTIONARIES = {
  'zh-CN': {
    'content.view': '查看差异', 'content.title': '文件内容差异', 'content.close': '关闭内容预览', 'content.closeButton': '关闭',
    'content.direction': '当前内容 → 还原后内容', 'content.loading': '正在读取内容…',
    'content.delete': '还原后将删除此文件', 'content.create': '还原后将创建此文件',
    'content.empty': '还原后为空文件', 'content.restore': '还原为工作前保存的内容',
    'content.legendDelete': '− 回滚将删除', 'content.legendAdd': '+ 回滚将恢复',
    'content.unavailable': '无法预览正文；仍可在原面板选择还原。',
    'content.too-large': '两个版本合计超过 3 MiB。', 'content.too-many-lines': '任一版本超过 10,000 行。',
    'content.line-too-long': '任一单行超过 20,000 个 Unicode 码点。',
    'content.non-text': '内容不是可安全展示的 UTF-8 文本。', 'content.computation-limited': '差异计算超过资源限制。',
    'content.failed': '内容读取失败，原有文件选择未改变。', 'content.retry': '重试读取',
    'content.stale': '清单或文件已变化，内容预览已失效。请关闭后重新检查。',
    'content.current': '当前', 'content.target': '还原后', 'content.absent': '文件不存在',
    'content.bytes': '字节', 'content.lines': '行', 'content.bom': 'UTF-8 BOM',
    'content.noBom': '无 BOM', 'content.finalNewline': '末尾有换行', 'content.noFinalNewline': '末尾无换行',
    'content.eol.none': '无行结束符', 'content.eol.lf': 'LF', 'content.eol.crlf': 'CRLF', 'content.eol.cr': 'CR', 'content.eol.mixed': '混合行结束符',
    'content.format': '文本行相同；差异在文件状态、BOM、行结束符或末尾换行。',
    'content.noRows': '没有文本行；文件处理动作见上方说明。',
  },
  en: {
    'content.view': 'View diff', 'content.title': 'File content diff', 'content.close': 'Close content preview', 'content.closeButton': 'Close',
    'content.direction': 'Current content → Restored content', 'content.loading': 'Reading content…',
    'content.delete': 'Restoring will delete this file', 'content.create': 'Restoring will create this file',
    'content.empty': 'Restoring will leave an empty file', 'content.restore': 'Restore the content saved before this work',
    'content.legendDelete': '− Removed by rollback', 'content.legendAdd': '+ Restored by rollback',
    'content.unavailable': 'Content cannot be previewed; the file can still be selected for restoration.',
    'content.too-large': 'The two versions exceed 3 MiB combined.', 'content.too-many-lines': 'A version exceeds 10,000 lines.',
    'content.line-too-long': 'A line exceeds 20,000 Unicode code points.',
    'content.non-text': 'Content is not safely displayable UTF-8 text.', 'content.computation-limited': 'Diff computation exceeds the resource limit.',
    'content.failed': 'Content could not be read. Your file selection has not changed.', 'content.retry': 'Retry reading',
    'content.stale': 'The plan or file changed; this preview has expired. Close it and check again.',
    'content.current': 'Current', 'content.target': 'Restored', 'content.absent': 'File does not exist',
    'content.bytes': 'bytes', 'content.lines': 'lines', 'content.bom': 'UTF-8 BOM',
    'content.noBom': 'No BOM', 'content.finalNewline': 'Final newline', 'content.noFinalNewline': 'No final newline',
    'content.eol.none': 'No line ending', 'content.eol.lf': 'LF', 'content.eol.crlf': 'CRLF', 'content.eol.cr': 'CR', 'content.eol.mixed': 'Mixed line endings',
    'content.format': 'Text lines are identical; file state, BOM, line endings or the final newline differ.',
    'content.noRows': 'No text lines; see the file operation above.',
  },
}

/** A keyed mount owns exactly one read; a retired mount never accepts its reply. */
export function ContentPreview({ operations, request, onClose, stacked, t }) {
  const [answer, setAnswer] = useState()
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let alive = true
    setAnswer(undefined)
    void Promise.resolve().then(() => operations.content(request)).then(result => {
      if (alive) setAnswer(result)
    }).catch(() => { if (alive) setAnswer({ ok: false, error: { code: 'read-failed' } }) })
    return () => { alive = false }
  }, [operations, request, attempt])
  const value = answer?.ok ? answer.value : undefined
  const stale = answer?.ok === false && ['plan-not-found', 'preview-stale', 'invalid-member', 'session-not-found'].includes(answer.error.code)
  const version = (key, info) => h('p', { key, className: 'dsh-resend-content-version' },
    `${t(`content.${key}`)}: ${info.exists ? `${info.bytes} ${t('content.bytes')} · ${info.lines} ${t('content.lines')} · ${t(info.bom ? 'content.bom' : 'content.noBom')} · ${t(`content.eol.${info.eol}`)} · ${t(info.finalNewline ? 'content.finalNewline' : 'content.noFinalNewline')}` : t('content.absent')}`)
  return h(Modal, { open: true, onClose, headless: true, title: t('content.title'),
    className: `dsh-resend-content-dialog${stacked ? ' dsh-resend-content-stacked' : ''}`, backdropBlur: !stacked,
    // React portal events would otherwise bubble into the replay panel.
    onKeyDownCapture: event => {
      if (event.key === 'Escape' && !event.isComposing && !event.ctrlKey && !event.altKey && !event.metaKey) {
        event.preventDefault(); event.stopPropagation(); if (!event.repeat) onClose()
      }
      if (event.key === 'Tab') {
        const dialog = event.currentTarget.querySelector('.dsh-resend-content-dialog')
        const controls = [...dialog.querySelectorAll('button:not(:disabled), [tabindex="0"]')]
        const first = controls[0]
        const last = controls.at(-1)
        if (event.shiftKey ? document.activeElement === first : document.activeElement === last) {
          event.preventDefault(); (event.shiftKey ? last : first)?.focus()
        }
        event.stopPropagation()
      }
    },
  }, [
    h('header', { key: 'header', className: 'dsh-resend-content-header' }, [
      h('div', { key: 'heading' }, [h('h2', { key: 'title' }, t('content.title')),
        h('p', { key: 'path', className: 'dsh-resend-content-path' }, request.path),
        h('p', { key: 'direction' }, t('content.direction'))]),
      h(Button, { key: 'close', type: 'button', variant: 'ghost', size: 'sm', onClick: onClose,
        'data-modal-autofocus': true, 'aria-label': t('content.close') }, t('content.closeButton')),
    ]),
    value && h('div', { key: 'meta', className: 'dsh-resend-content-meta' }, [
      h('strong', { key: 'action' }, t(`content.${value.action}`)),
      value.status === 'ready' ? [version('current', value.current), version('target', value.target)]
        : h('p', { key: 'sizes' }, `${t('content.current')}: ${value.sizes.current} ${t('content.bytes')} · ${t('content.target')}: ${value.sizes.target} ${t('content.bytes')}`),
      h('div', { key: 'legend', className: 'dsh-resend-content-legend' }, [
        h('span', { key: 'delete' }, t('content.legendDelete')), h('span', { key: 'add' }, t('content.legendAdd'))]),
    ]),
    h('div', { key: 'body', className: 'dsh-resend-content-body', tabIndex: 0, 'aria-label': t('content.direction'), 'aria-busy': answer === undefined },
      answer === undefined ? h('p', { role: 'status' }, t('content.loading'))
      : answer.ok === false ? h('div', { role: 'alert', className: 'dsh-resend-content-message' }, [
        h('p', { key: 'error' }, t(stale ? 'content.stale' : 'content.failed')),
        !stale && h(Button, { key: 'retry', type: 'button', variant: 'outline', size: 'sm', onClick: () => setAttempt(value => value + 1) }, t('content.retry')),
      ]) : value.status === 'unavailable' ? h('div', { role: 'status', className: 'dsh-resend-content-message' }, [
        h('p', { key: 'reason' }, t(`content.${value.reason}`)), h('p', { key: 'hint' }, t('content.unavailable')),
      ]) : [
        !value.rows.some(row => row.kind !== 'context') && h('p', { key: 'format', className: 'dsh-resend-content-message' }, t(value.rows.length ? 'content.format' : 'content.noRows')),
        h('div', { key: 'diff', className: 'dsh-resend-content-lines' }, value.rows.map((row, index) => h('div', {
          key: index, className: `dsh-resend-content-line dsh-resend-content-${row.kind}`,
        }, [h('span', { key: 'old', className: 'dsh-resend-content-number' }, row.oldLine ?? ''),
          h('span', { key: 'new', className: 'dsh-resend-content-number' }, row.newLine ?? ''),
          h('span', { key: 'mark', className: 'dsh-resend-content-mark' }, row.kind === 'delete' ? '−' : row.kind === 'add' ? '+' : ' '),
          h('code', { key: 'text' }, row.text)]))),
      ]),
  ])
}
