/** The user-message action row, plain-text editor and chat-node Definition. */
import { createElement, useRef, useState } from 'react'
import { IconCloseOutlineRegular, IconEditOutlineRegular, IconPaperPlaneOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import { usePreferences } from './preferences.js'
import { HideRulesSurface } from './hide-rules.js'
import { withPanelBoundary } from './panel-boundary.js'
import { useHiding } from './use-hiding.js'
import { useConversationEligibility } from './conversation-eligibility.js'
import { IconAction, UIStyles } from './ui.js'

export const USER_ACTIONS_KIND = 'dsh-resend-user-actions'
const identity = (value) => value

export function userMessageText(eventOrData) {
  const content = eventOrData?.data?.content ?? eventOrData?.content
  return Array.isArray(content) ? content.filter((part) => part?.type === 'text').map((part) => part.text).join('\n') : ''
}

export function userActionsSurface(operations, preferences) {
  return function BoundUserActions(props) {
    return createElement(UserActionsRow, { ...props, operations, preferences })
  }
}

/**
 * One grey-able chip: disabled while the row is in flight or the reason says
 * no, and the reason on hover. A module-level helper — the row and the inline
 * editor are two surfaces now, and both draw the same control.
 * @param key - the React key of the chip in its array.
 * @param label - the chip's visible text.
 * @param icon - the icon element, or nothing for a text-only chip.
 * @param onClick - the chip's action.
 * @param reason - the hover reason, or undefined for a live chip. A reason
 *   also greys the chip out — it explains why the chip cannot act.
 * @param disabled - whether the chip is greyed out, independent of reason.
 */
const control = (key, label, icon, onClick, reason, disabled) => createElement(IconAction, {
  key, label, icon: icon ?? IconEditOutlineRegular, onClick, reason, disabled,
})

/**
 * Surface 2: the inline editor, a sub-surface of the action row (ticket 08,
 * spec §7.4). It is its own boundary-wrapped component so a throw while
 * editing — the one place this surface reads live data — fails as the editor's
 * own row, not the whole action row. It renders an ARRAY (no wrapper div), so
 * the row's DOM is the editor's DOM: the same four children, in the same place.
 */
function InlineEditor({ t, value, disabled, stopReason, composerReason, onText, onSend, onComposer, onCancel, onKeyDown }) {
  return [
    createElement('textarea', { key: 'textarea', value, rows: 3, autoFocus: true,
      disabled, 'aria-label': t('row.editInput'), onChange: onText, onKeyDown }),
    control('send', t('row.send'), IconPaperPlaneOutlineRegular, onSend, stopReason ?? (value.trim() === '' ? t('row.blankText') : undefined), disabled),
    control('composer', t('row.editInComposer'), undefined, onComposer, composerReason, disabled),
    control('cancel', t('row.cancel'), IconCloseOutlineRegular, onCancel, undefined, disabled),
  ]
}

export const InlineEditorSurface = withPanelBoundary(InlineEditor, 'panel.error.inlineEditor')

export function UserActionsRow(props) {
  const { node, sessionId, inputActions, useInput, useSession, readInput, operations, preferences, t } = props
  const prefs = usePreferences(preferences)
  const { plan, css, error: hideError, diagnostics } = useHiding({ ...props, suppressError: true })
  const data = node.data
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(data.text)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState()
  const inFlight = useRef(false)
  const input = typeof useInput === 'function' ? useInput(identity) : undefined
  const session = typeof useSession === 'function' ? useSession(identity) : undefined
  const { conversation, revision } = useConversationEligibility(operations, sessionId, session, plan)
  const hidden = plan?.hiddenSeqs.has(data.seq) === true
  const reasonFor = (saved, current, context) => {
    if (!context.plan || !current.ready) return t('row.conversationUnavailable')
    if (context.plan.hiddenSeqs.has(context.data.seq) || !current.userSeqs.includes(context.data.seq)) return t('row.shadowed')
    if (!saved.ready) return t(saved.status === 'loading' ? 'settings.loading' : 'settings.read-error')
    if (saved.restrictEditToLastUserMessage !== false && current.lastUserSeq !== context.data.seq) return t('row.notLastUser')
    if (context.session?.running) return t('row.stopFirst')
    if (context.data.text.trim() === '') return t('row.noText')
  }
  const live = useRef()
  live.current = { plan, data, session, revision, text }
  const currentReason = () => reasonFor(preferences.getSnapshot(),
    operations.conversationFor(sessionId, live.current.revision), live.current)
  const stopReason = reasonFor(prefs, conversation, live.current)
  const composerReason = stopReason ?? (input?.phase !== 'plain' ? t('row.composerBusy')
    : typeof inputActions?.setDraft !== 'function' || typeof readInput !== 'function' ? t('row.composerUnavailable') : undefined)

  const open = () => {
    if (currentReason() !== undefined || inFlight.current) return
    setText(live.current.data.text)
    setError(undefined)
    setEditing(true)
  }
  const cancel = () => {
    if (inFlight.current) return
    setEditing(false)
    setError(undefined)
  }
  const send = async () => {
    if (inFlight.current || currentReason() !== undefined || live.current.text.trim() === '') return
    inFlight.current = true
    setPending(true)
    setError(undefined)
    try {
      const result = await operations.run({ sessionId, targetSeq: live.current.data.seq, op: 'edit', text: live.current.text })
      if (result.ok) setEditing(false)
      else setError(t('row.operationFailed') + ' (' + result.error.code + ')' +
        (result.error.code === 'not-last-user-message' ? '：' + t('operation.error.not-last-user-message') : ''))
    } catch (cause) {
      setError(t('row.operationFailed'))
      console.warn('[dsh-resend] edit at seq ' + data.seq + ' in session ' + sessionId + ': ' + (cause?.message ?? cause))
    } finally {
      inFlight.current = false
      setPending(false)
    }
  }
  const editInComposer = () => {
    if (inFlight.current || currentReason() !== undefined) return
    // useInput is a React hook and cannot be invoked here. readInput resolves
    // the same session's public input facade and reads its live snapshot.
    try {
      if (readInput()?.phase !== 'plain') return
      if (typeof inputActions?.setDraft !== 'function') return
      inputActions.setDraft((editing ? live.current.text : live.current.data.text).replace(/[\uE100-\uE11D\uFFFC]/gu, ''))
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
  const inlineOn = prefs.inlineEditorBeneathMessage
  // Surface 6: the hide-rules element, now a boundary-wrapped surface, is the
  // one DOM node the transcript hides with. It is created here and reused at
  // every site that used to carry the raw <style>.
  const rules = createElement(HideRulesSurface, { key: 'rules', t, css })
  // A hide failure belongs to the rewind point that produced the range. This
  // action row must remain usable when another rewind point has bad data.
  const localDiagnostics = hideError ?? diagnostics.find((entry) => entry.shadowedSeqs.includes(data.seq))?.message
  if (localDiagnostics !== undefined) {
    return createElement('div', { role: 'alert', className: 'dsh-resend-row-error' }, [
      createElement(HideRulesSurface, { key: 'rules', t, css }),
      createElement('span', { key: 'message' }, t('row.hideFailed')),
      createElement('pre', { key: 'detail' }, localDiagnostics),
    ])
  }
  if (hidden || !plan?.userSeqs.has(data.seq)) return rules

  const idle = !inlineOn
    ? [control('composer', t('row.editInComposer'), undefined, editInComposer, stopReason ?? composerReason, pending)]
    : [control('edit', t('row.edit'), IconEditOutlineRegular, open, stopReason, pending)]
  const body = !editing
    ? idle
    : [createElement(InlineEditorSurface, {
      key: 'inline', t, value: text, disabled: pending, stopReason, composerReason,
      onText: (event) => setText(event.target.value),
      onSend: () => { void send() }, onComposer: editInComposer, onCancel: cancel, onKeyDown,
    })]
  return createElement('div', { className: 'dsh-resend-user-actions' }, [
    rules,
    createElement(UIStyles, { key: 'ui' }),
    ...body,
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
