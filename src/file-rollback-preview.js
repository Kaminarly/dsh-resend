import { createElement, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Button, FileTypeIcon, IconCheckOutlineRegular, IconRefreshOutlineRegular, IconShieldOutlineRegular, IconWarningOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import { createPortal } from 'react-dom'
import { UIStyles } from './ui.js'

/** File-only restore: a compact entry expands into the exact approved plan. */
export function FileRollbackPreview({ operations, point, t, preflight }) {
  const [result, setResult] = useState()
  const [pending, setPending] = useState('status')
  const [completed, setCompleted] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const running = useRef(false)
  const busy = pending !== null
  const terminal = result?.ok === true && (completed || result.value.completed === true)
  useEffect(() => {
    if (preflight) {
      setResult(preflight.result)
      setPending(preflight.pending)
      setCompleted(preflight.result.value?.completed === true)
      setCollapsed(false)
      return
    }
    let alive = true
    running.current = true
    setPending('status')
    setResult(undefined)
    setCompleted(false)
    setCollapsed(false)
    void Promise.resolve().then(() => operations.rollback({ ...point, scope: 'artifacts', phase: 'status' })).then((answer) => {
      if (!alive) return
      if (answer.ok && answer.value.completed) {
        setResult(answer)
        setCompleted(true)
        setCollapsed(true)
      } else if (!answer.ok || answer.value.empty) setResult(answer)
    }).catch(() => {
      if (alive) setResult({ ok: false, error: { code: 'internal' } })
    }).finally(() => {
      if (alive) { running.current = false; setPending(null) }
    })
    return () => { alive = false }
  }, [operations, point.sessionId, point.carrierSeq, preflight])
  async function run(phase) {
    if (preflight) return operations.chooseReplay(point.sessionId, phase === 'execute' ? 'restore' : phase)
    if (running.current || terminal) return
    running.current = true
    setPending(phase)
    if (phase === 'preview') { setResult(undefined); setCompleted(false); setCollapsed(false) }
    try {
      const answer = await operations.rollback({ ...point, scope: 'artifacts', phase, ...(phase === 'preview' ? {} : { planId: result?.value?.planId }) })
      setResult(phase === 'cancel' && answer.ok ? undefined : answer)
      setCompleted(phase === 'execute' || answer.value?.completed === true)
    } catch {
      setResult({ ok: false, error: { code: 'internal' } })
      setCompleted(phase === 'execute')
    } finally { running.current = false; setPending(null) }
  }
  function close() {
    if (preflight) { void operations.chooseReplay(point.sessionId, 'cancel'); return }
    if (terminal) setCollapsed(true)
    else if (!completed && result?.ok && result.value.planId) void run('cancel')
    else { setResult(undefined); setCompleted(false) }
  }
  const preview = result?.ok ? result.value : undefined
  const files = preview?.files ?? result?.error?.files ?? []
  const restorable = completed ? 0 : files.filter((file) => file.action === 'restore').length
  const restored = files.filter((file) => file.action === 'restored' || (completed && result?.ok && file.action === 'restore')).length
  const kept = files.filter((file) => file.action === 'refuse').length
  const expanded = preflight || (result !== undefined && !collapsed) || (busy && pending !== 'status')
  const canExecute = preview !== undefined && !terminal && !completed && restorable > 0
  const countText = (key, count) => String(t(key)).replace('{count}', String(count))
  const renderIcon = (Icon) => createElement(Icon, { key: 'icon', size: 16, 'aria-hidden': true })
  const button = (key, onClick, label, variant = 'ghost') => createElement(Button, {
    key, type: 'button', size: 'sm', variant, disabled: busy, onClick,
    className: `dsh-resend-rollback-button${key === 'preview' ? ' dsh-resend-rollback-preview-button' : key === 'execute' ? ' dsh-resend-rollback-confirm-button' : ''}`,
  }, label)
  if (!preflight && (pending === 'status' || result?.value?.empty === true)) return null
  return createElement('section', { className: 'dsh-resend-rollback', 'aria-label': t('files.title'), 'aria-busy': busy }, [
    createElement(UIStyles, { key: 'ui' }),
    createElement('header', { key: 'header', className: 'dsh-resend-rollback-header' }, [
      createElement('div', { key: 'title', className: 'dsh-resend-rollback-title' }, [
        renderIcon(IconRefreshOutlineRegular),
        createElement('div', { key: 'text' }, [
          createElement('h3', { key: 'heading' }, t('files.title')),
          createElement('p', { key: 'description' }, t('files.description')),
        ]),
      ]),
      terminal && collapsed
        ? createElement('div', { key: 'finished', className: 'dsh-resend-rollback-header-actions' }, [
          createElement('span', { key: 'stage', className: 'dsh-resend-rollback-stage', role: 'status' }, t('files.finished')),
          button('view', () => { setCollapsed(false) }, t('files.viewResult')),
        ])
        : expanded || busy
        ? createElement('span', { key: 'stage', className: 'dsh-resend-rollback-stage', role: 'status' },
          t(busy ? (pending === 'status' ? 'files.readingStatus' : ['execute', 'restore'].includes(pending) ? 'files.restoring' : pending === 'cancel' ? 'files.canceling' : pending === 'keep' ? 'replay.sending' : 'files.checking') : terminal ? 'files.finished' : result?.ok ? 'files.awaiting' : 'files.needsPreview'))
        : button('preview', () => { void run('preview') }, [renderIcon(IconRefreshOutlineRegular), t('files.previewShort')], 'outline'),
    ]),
    expanded && createElement('div', { key: 'content', className: 'dsh-resend-rollback-content', 'aria-live': 'polite' }, [
      result?.ok === false && createElement('p', { key: 'error', className: 'dsh-resend-rollback-notice dsh-resend-rollback-warning', role: 'alert' }, t(`files.error.${result.error.code}`)),
      completed && result?.ok && createElement('p', { key: 'completed', className: 'dsh-resend-rollback-notice' }, t('files.completed')),
      preflight && restored > 0 && createElement('p', { key: 'cancel-hint', className: 'dsh-resend-rollback-notice' }, t('replay.cancelHint')),
      preview?.files.length === 0 && createElement('p', { key: 'empty', className: 'dsh-resend-rollback-notice' }, t('files.empty')),
      files.length > 0 && createElement('div', { key: 'summary', className: 'dsh-resend-rollback-summary' }, [
        createElement('strong', { key: 'count' }, countText(completed || (preflight && restored > 0) ? 'files.restoredCount' : 'files.restoreCount', completed || (preflight && restored > 0) ? restored : restorable)),
        createElement('span', { key: 'kept' }, countText(completed ? 'files.keptCount' : 'files.keepCount', kept)),
      ]),
      files.length > 0 && createElement('ul', { key: 'files', className: 'dsh-resend-rollback-files', 'aria-label': t('files.list') }, files.map((file, index) => {
        const normalized = file.path.replaceAll('\\', '/')
        const split = normalized.lastIndexOf('/')
        const action = completed && file.action === 'restore' ? 'restored' : file.action
        const refused = action === 'refuse'
        const Icon = action === 'restored' ? IconCheckOutlineRegular : refused ? IconWarningOutlineRegular : IconRefreshOutlineRegular
        return createElement('li', { key: `${index}:${file.path}`, className: 'dsh-resend-rollback-file' }, [
          createElement('span', { key: 'icon', className: 'dsh-resend-rollback-file-icon', 'aria-hidden': true }, createElement(FileTypeIcon, { path: file.path, size: 20 })),
          createElement('div', { key: 'info', className: 'dsh-resend-rollback-file-info', title: file.path }, [
            createElement('span', { key: 'name', className: 'dsh-resend-rollback-filename' }, normalized.slice(split + 1)),
            createElement('span', { key: 'path', className: 'dsh-resend-rollback-path' }, split < 0 ? t('files.root') : normalized.slice(0, split + 1)),
            file.reason !== undefined && createElement('span', { key: 'reason', className: 'dsh-resend-rollback-reason' }, t(`files.reason.${file.reason}`)),
          ]),
          createElement('span', { key: 'status', className: `dsh-resend-rollback-file-status dsh-resend-rollback-${action}` }, [
            renderIcon(Icon), t(refused ? completed ? 'files.kept' : 'files.unavailable' : `files.${action}`),
          ]),
        ])
      })),
    ]),
    expanded && createElement('footer', { key: 'footer', className: 'dsh-resend-rollback-footer' }, [
      createElement('p', { key: 'hint', className: 'dsh-resend-rollback-hint' }, [renderIcon(IconShieldOutlineRegular), t(canExecute ? 'files.confirmHint' : 'files.recordedOnly')]),
      createElement('div', { key: 'actions', className: 'dsh-resend-rollback-actions' }, [
        button('close', close, t(completed ? 'files.closeResult' : result?.ok && restorable ? 'files.cancel' : 'files.close')),
        preflight && button('keep', () => { void operations.chooseReplay(point.sessionId, 'keep') }, t('replay.keep'), 'outline'),
        canExecute && button('execute', () => { void run('execute') }, countText('files.executeCount', restorable), 'primary'),
        result?.ok === false && button('retry', () => { void run('preview') }, t('files.retry'), 'outline'),
      ]),
    ]),
  ])
}

const noSubscribe = () => () => {}
/** The pending plan sits immediately before its original user message. */
export function ReplayPreflight({ operations, sessionId, userSeq, targetSeq, visibleUserSeqs, portal = false, t }) {
  const entry = useSyncExternalStore(operations.subscribe ?? noSubscribe,
    () => operations.preflightFor?.(sessionId), () => undefined)
  const anchor = useRef(null)
  const active = !!entry && (visibleUserSeqs ? entry.request.targetSeq === targetSeq && !visibleUserSeqs.includes(entry.userSeq)
    : entry.userSeq === userSeq)
  useLayoutEffect(() => {
    if (!active) return
    anchor.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
    anchor.current?.focus({ preventScroll: true })
  }, [active])
  if (!active) return null
  const translations = {
    'files.description': entry.op === 'edit' ? 'replay.editDescription' : 'replay.regenerateDescription',
    'files.awaiting': 'replay.awaiting', 'files.executeCount': 'replay.restoreCount',
    'files.finished': 'replay.awaiting',
    'files.cancel': 'replay.cancel', 'files.close': 'replay.cancel',
    'files.closeResult': 'replay.cancel', 'files.confirmHint': 'replay.restoreHint', 'files.recordedOnly': 'replay.waitingHint',
  }
  const panel = createElement('div', { ref: anchor, tabIndex: -1, onKeyDown: event => {
    if (event.key === 'Escape' && !entry.pending) { event.preventDefault(); void operations.chooseReplay(sessionId, 'cancel') }
    if (event.key !== 'Tab' || (!portal && !visibleUserSeqs)) return
    const buttons = [...anchor.current.querySelectorAll('button:not(:disabled)')]
    if (!buttons.length) { event.preventDefault(); return }
    if (event.shiftKey && (document.activeElement === buttons[0] || document.activeElement === anchor.current)) {
      event.preventDefault(); buttons.at(-1).focus()
    } else if (!event.shiftKey && document.activeElement === buttons.at(-1)) { event.preventDefault(); buttons[0].focus() }
  } }, createElement(FileRollbackPreview, { operations, preflight: entry, point: { sessionId },
    t: key => {
      if (key === 'files.error.preview-stale') return t('replay.stale')
      if (key === 'files.error.plan-not-found') return t('replay.expired')
      const value = t(translations[key] ?? key)
      return key.startsWith('files.error.') && value === key ? t('replay.failed') : value
    } }))
  if (!portal && !visibleUserSeqs) return panel
  return createPortal(createElement('div', { role: 'dialog', 'aria-modal': true, 'aria-label': t('files.title'),
    className: 'dsh-resend-preflight-overlay' }, createElement('div', { className: 'dsh-resend-preflight-dialog' }, panel)), document.body)
}
