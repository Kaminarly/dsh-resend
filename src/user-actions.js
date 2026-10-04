/** The user-message action row, plain-text editor and chat-node Definition. */
import { createElement, useRef, useState } from 'react'
import { IconCloseOutlineRegular, IconEditOutlineRegular, IconPaperPlaneOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import { useHiding } from './use-hiding.js'

export const USER_ACTIONS_KIND = 'dsh-resend-user-actions'
const identity = (value) => value

export function userMessageText(eventOrData) {
  const content = eventOrData?.data?.content ?? eventOrData?.content
  return Array.isArray(content) ? content.filter((part) => part?.type === 'text').map((part) => part.text).join('\n') : ''
}

export function userActionsSurface(operations) {
  return function BoundUserActions(props) {
    return createElement(UserActionsRow, { ...props, operations })
  }
}

export function UserActionsRow(props) {
  const { node, sessionId, inputActions, useInput, useSession, readInput, operations, t } = props
  const { plan, css, error: hideError, diagnostics } = useHiding({ ...props, suppressError: true })
  const data = node.data
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(data.text)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState()
  const inFlight = useRef(false)
  const input = typeof useInput === 'function' ? useInput(identity) : undefined
  const session = typeof useSession === 'function' ? useSession(identity) : undefined
  const hidden = plan?.hiddenSeqs.has(data.seq) === true
  const stopReason = session?.running ? t('row.stopFirst') : data.text.trim() === '' ? t('row.noText') : undefined
  const composerReason = input?.phase !== 'plain' ? t('row.composerBusy')
    : typeof inputActions?.setDraft !== 'function' || typeof readInput !== 'function' ? t('row.composerUnavailable') : undefined

  const open = () => {
    if (stopReason !== undefined || inFlight.current) return
    setText(data.text)
    setError(undefined)
    setEditing(true)
  }
  const cancel = () => {
    if (inFlight.current) return
    setEditing(false)
    setError(undefined)
  }
  const send = async () => {
    if (inFlight.current || stopReason !== undefined || text.trim() === '') return
    inFlight.current = true
    setPending(true)
    setError(undefined)
    try {
      const result = await operations.run({ sessionId, targetSeq: data.seq, op: 'edit', text })
      if (result.ok) setEditing(false)
      else setError(t('row.operationFailed') + ' (' + result.error.code + ')')
    } catch (cause) {
      setError(t('row.operationFailed'))
      console.warn('[dsh-resend] edit at seq ' + data.seq + ' in session ' + sessionId + ': ' + (cause?.message ?? cause))
    } finally {
      inFlight.current = false
      setPending(false)
    }
  }
  const editInComposer = () => {
    if (inFlight.current || composerReason !== undefined) return
    // useInput is a React hook and cannot be invoked here. readInput resolves
    // the same session's public input facade and reads its live snapshot.
    try {
      if (readInput()?.phase !== 'plain') return
      if (typeof inputActions?.setDraft !== 'function') return
      inputActions.setDraft(text.replace(/[\uE100-\uE11D\uFFFC]/gu, ''))
      setEditing(false)
    } catch (cause) {
      setError(t('row.composerUnavailable'))
      console.warn('[dsh-resend] composer handoff for session ' + sessionId + ': ' + (cause?.message ?? cause))
    }
  }
  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      cancel()
    } else if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      void send()
    }
  }
  const style = createElement('style', { key: 'rules', 'data-dsh-resend-hide-rules': 'true' }, css)
  // A hide failure belongs to the rewind point that produced the range. This
  // action row must remain usable when another rewind point has bad data.
  const localDiagnostics = hideError ?? diagnostics.find((entry) => entry.shadowedSeqs.includes(data.seq))?.message
  if (localDiagnostics !== undefined) {
    return createElement('div', { role: 'alert', className: 'dsh-resend-row-error' }, [style,
      createElement('span', { key: 'message' }, t('row.hideFailed')),
      createElement('pre', { key: 'detail' }, localDiagnostics),
    ])
  }
  if (hidden || !plan?.userSeqs.has(data.seq)) return style

  const control = (key, label, icon, onClick, reason) => createElement('button', {
    key, type: 'button', className: 'dsh-resend-chip', onClick, disabled: pending || reason !== undefined,
    title: reason,
  }, icon === undefined ? label : [
    createElement(icon, { key: 'icon', size: 14 }),
    createElement('span', { key: 'label' }, label),
  ])

  return createElement('div', { className: 'dsh-resend-user-actions' }, [
    style,
    ...(!editing ? [control('edit', t('row.edit'), IconEditOutlineRegular, open, stopReason)] : [
      createElement('textarea', { key: 'textarea', value: text, rows: 3, autoFocus: true,
        disabled: pending, 'aria-label': t('row.editInput'), onChange: (event) => setText(event.target.value), onKeyDown }),
      control('send', t('row.send'), IconPaperPlaneOutlineRegular, () => { void send() }, stopReason ?? (text.trim() === '' ? t('row.blankText') : undefined)),
      control('composer', t('row.editInComposer'), undefined, editInComposer, composerReason),
      control('cancel', t('row.cancel'), IconCloseOutlineRegular, cancel),
    ]),
    error === undefined ? null : createElement('span', { key: 'error', role: 'alert' }, error),
  ])
}

export const USER_ACTIONS_DEFINITION = {
  kind: USER_ACTIONS_KIND,
  target: 'chat',
  match: (event) => event?.type === 'user/message' && event.surfaceOp === 'append'
    ? { id: 'dsh-resend-user-actions:' + String(event.data.id), role: 'start' } : null,
  start: (_context, match) => ({ seq: match.event.seq, text: userMessageText(match.event) }),
  update: (context) => context.state,
  buildViewNode: (context) => context.state === undefined ? null : ({
    key: context.key, kind: USER_ACTIONS_KIND, id: context.id, target: 'chat',
    // The actions must follow their user bubble and remain outside the host's
    // collapsible process groups. Hiding maps this kind via data.seq, not the
    // half-seq presentation anchor.
    anchorSeq: context.state.seq + 0.5,
    location: { kind: 'unresolved' },
    visibility: 'visible', data: context.state,
  }),
}

/**
 * An invisible node records surface replacements from any producer, so action
 * eligibility is independent of whether the transcript itself hides that
 * producer's rows. No renderer is needed for a visibility:hidden node.
 */
export const SURFACE_SHADOW_DEFINITION = {
  kind: 'dsh-resend-surface-shadow',
  target: 'chat',
  match: (event) => event?.surfaceOp?.op === 'replace'
    ? { id: String(event.seq), role: 'start' } : null,
  start: (_context, match) => ({ seq: match.event.seq, shadowedSeqs: [...(match.event.sourceEventSeqs ?? [])] }),
  update: (context) => context.state,
  buildViewNode: (context) => context.state === undefined ? null : ({
    key: context.key, kind: 'dsh-resend-surface-shadow', id: context.id, target: 'chat',
    anchorSeq: context.state.seq, location: { kind: 'unresolved' },
    visibility: 'hidden', data: context.state,
  }),
}
