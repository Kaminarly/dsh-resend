import { createElement, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconCloseOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import { ERROR_CODES } from './error-codes.js'
import { IconAction } from './ui.js'

/** Show a localized cause; keep raw transport messages in diagnostic logs. */
export function operationErrorText(failure, t) {
  const raw = failure?.code ?? 'client/unexpected-error'
  const code = typeof raw === 'string' && /^[\w/-]{1,80}$/.test(raw) ? raw : 'client/unexpected-error'
  const key = ERROR_CODES.includes(code) ? code
    : code === 'client/result-invalid' ? 'result-invalid'
    : code === 'gateway/cancelled' ? 'cancelled'
    : code.startsWith('gateway/') ? 'connection'
    : 'unexpected'
  return t('operation.error.' + key) + ' (' + code + ')'
}

/** A body portal follows the action without being clipped by the chat flow. */
export function OperationErrorNotice({ anchor, text, t, onDismiss }) {
  const panel = useRef(null)
  const [position, setPosition] = useState(null)
  useLayoutEffect(() => {
    const update = () => {
      const rect = anchor.current?.getBoundingClientRect()
      if (!rect || !panel.current) return
      const width = Math.min(360, window.innerWidth - 24)
      const height = panel.current.getBoundingClientRect().height
      const below = rect.bottom + 8
      setPosition({ width, left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
        top: Math.max(12, below + height <= window.innerHeight - 12 ? below : rect.top - height - 8),
        visibility: rect.bottom < 0 || rect.top > window.innerHeight ? 'hidden' : 'visible' })
    }
    update()
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null
    observer?.observe(panel.current)
    document.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => { observer?.disconnect(); document.removeEventListener('scroll', update, true); window.removeEventListener('resize', update) }
  }, [anchor, text])
  return createPortal(createElement('div', { ref: panel, role: 'alert', className: 'dsh-resend-error-notice',
    style: position ?? { visibility: 'hidden', width: 'min(360px, calc(100vw - 24px))' } }, [
    createElement('span', { key: 'text' }, text),
    createElement(IconAction, { key: 'close', label: t('operation.dismiss'), icon: IconCloseOutlineRegular, onClick: onDismiss }),
  ]), document.body)
}
