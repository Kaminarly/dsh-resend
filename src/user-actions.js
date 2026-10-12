/** The host user-message actions, plain-text editor and eligibility metadata. */
import { cloneElement, createElement, Fragment, isValidElement, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { IconCloseOutlineRegular, IconEditOutlineRegular, IconPaperPlaneOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import { IconAction, UIStyles } from './ui.js'
import { usePreferences } from './preferences.js'
import { HideRulesSurface } from './hide-rules.js'
import { withPanelBoundary } from './panel-boundary.js'
import { useHiding } from './use-hiding.js'
import { operationErrorText } from './operation-error.js'
import { useConversationEligibility } from './conversation-eligibility.js'
import { ReplayPreflight } from './file-rollback-preview.js'

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

/** Delegate the shipped bubble and augment its existing copy/actions seat. */
export function userMessageSurface(original, operations, preferences, hostTranslate) {
  const renderOriginal = typeof original === 'function' ? original : original?.type
  return function UserMessageWithActions(props) {
    const hostProps = { ...props, t: hostTranslate }
    if (typeof renderOriginal !== 'function') {
      return createElement(Fragment, null, createElement(original, hostProps),
        createElement('div', { role: 'alert' }, props.t('row.hostIncompatible')))
    }
    // This delegation runs consistently in its own component, so any hooks in
    // the host renderer still belong to the same React render, not a callback.
    const bubble = renderOriginal(hostProps)
    if (!isValidElement(bubble) || typeof bubble.props.actions !== 'function') {
      return createElement(Fragment, null, bubble,
        createElement('div', { role: 'alert' }, props.t('row.hostIncompatible')))
    }
    return createElement(UserActionsRow, {
      ...props, operations, preferences,
      renderMessage: (action) => cloneElement(bubble, {
        actions: (text) => {
          const actions = bubble.props.actions(text)
          if (!isValidElement(actions)) throw new Error('The host user-message actions no longer return a React element')
          return cloneElement(actions, { extraActions: createElement(Fragment, null, actions.props.extraActions, action) })
        },
      }),
    })
  }
}

/**
 * One icon action, with a localized hover/focus label and disabled reason.
 * @param key - the React key of the action in its array.
 * @param label - the action's accessible name and tooltip.
 * @param icon - the icon component.
 * @param onClick - the action.
 * @param reason - the hover reason, or undefined for a live chip. A reason
 *   also greys the chip out — it explains why the chip cannot act.
 * @param disabled - whether the action is disabled, independent of reason.
 */
const control = (key, label, icon, onClick, reason, disabled) => createElement(IconAction, {
  key, label, icon, onClick, reason, disabled,
  ...(key === 'send' ? { primary: true, 'data-primary': true } : {}),
})

/**
 * Surface 2: the inline editor, a sub-surface of the action row (ticket 08,
 * spec §7.4). It is its own boundary-wrapped component so a throw while
 * editing — the one place this surface reads live data — fails as the editor's
 * own panel, preserving the host message and its copy action.
 */
function InlineEditor({ t, value, disabled, stopReason, composerReason, onText, onSend, onComposer, onCancel, onKeyDown }) {
  const textarea = useRef(null)
  const fitText = () => {
    const input = textarea.current
    if (!input) return
    // Reset before measuring so deleting text also shrinks back to three lines.
    input.style.height = '0px'
    input.style.height = input.scrollHeight + 'px'
  }
  useLayoutEffect(fitText, [value])
  useLayoutEffect(() => {
    const input = textarea.current
    input.focus()
    input.setSelectionRange(input.value.length, input.value.length)
  }, [])
  useLayoutEffect(() => {
    const input = textarea.current
    const Observer = input.ownerDocument.defaultView.ResizeObserver
    if (!Observer) return
    let width
    const observer = new Observer(([entry]) => {
      // Only width changes affect wrapping; height changes must not loop.
      if (entry.contentRect.width === width) return
      width = entry.contentRect.width
      fitText()
    })
    observer.observe(input)
    return () => observer.disconnect()
  }, [])
  return createElement('div', { className: 'dsh-resend-editor-surface' }, [
    createElement('div', { key: 'header', className: 'dsh-resend-editor-header' }, [
      createElement('span', { key: 'label', className: 'dsh-resend-editor-label' }, t('row.temporaryInput')),
      control('cancel', t('row.cancel'), IconCloseOutlineRegular, onCancel, undefined, disabled),
    ]),
    createElement('div', { key: 'editor', className: 'dsh-resend-editor' }, [
      createElement('textarea', { key: 'textarea', ref: textarea, value, rows: 3,
        disabled, 'aria-label': t('row.editInput'), onChange: onText, onKeyDown }),
      createElement('div', { key: 'actions', className: 'dsh-resend-editor-actions' }, [
        createElement('span', { key: 'composer', className: 'dsh-resend-editor-composer' },
          createElement(IconAction, { label: t('row.editInComposer'), icon: IconEditOutlineRegular,
            tooltip: t('row.editInComposerHint'), onClick: onComposer, reason: composerReason, disabled, showLabel: true })),
        control('send', t('row.send'), IconPaperPlaneOutlineRegular, onSend, stopReason ?? (value.trim() === '' ? t('row.blankText') : undefined), disabled),
      ]),
    ]),
  ])
}

export const InlineEditorSurface = withPanelBoundary(InlineEditor, 'panel.error.inlineEditor')

export function UserActionsRow(props) {
  const { node, sessionId, inputActions, useInput, useSession, readInput, operations, preferences, t } = props
  const prefs = usePreferences(preferences)
  const preflight = useSyncExternalStore(operations.subscribe, () => operations.preflightFor?.(sessionId))
  const { plan, css, error: hideError, diagnostics } = useHiding({ ...props, suppressError: true })
  const data = { seq: node.data.seq ?? node.anchorSeq, text: node.data.text ?? userMessageText(node.data) }
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
    if (currentReason() !== undefined || inFlight.current || operations.preflightFor?.(sessionId)) return
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
    if (inFlight.current || operations.preflightFor?.(sessionId) || currentReason() !== undefined || live.current.text.trim() === '') return
    inFlight.current = true
    setPending(true)
    setError(undefined)
    try {
      const result = await operations.run({ sessionId, targetSeq: live.current.data.seq, op: 'edit', text: live.current.text })
      if (result.ok) {
        if (!result.value?.canceled) setEditing(false)
      } else setError(t('row.operationFailed') + '：' + operationErrorText(result.error, t))
    } catch (cause) {
      setError(t('row.operationFailed') + '：' + operationErrorText(cause, t))
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
      props.renderMessage ? createElement(Fragment, { key: 'message' }, props.renderMessage(null)) : null,
      createElement(UIStyles, { key: 'ui' }),
      createElement(ReplayPreflight, { key: 'preflight', operations, sessionId, userSeq: data.seq, portal: true, t }),
      createElement(HideRulesSurface, { key: 'rules', t, css }),
      createElement('span', { key: 'error' }, t('row.hideFailed')),
      createElement('pre', { key: 'detail' }, localDiagnostics),
    ])
  }
  const eligible = !hidden && plan?.userSeqs.has(data.seq)
  if (!eligible) return createElement(Fragment, null, rules, props.renderMessage?.(null),
    createElement(ReplayPreflight, { operations, sessionId, userSeq: data.seq, portal: true, t }))

  const idle = !inlineOn
    ? [control('composer', t('row.editInComposer'), IconEditOutlineRegular, editInComposer, stopReason ?? composerReason, pending || !!preflight)]
    : [control('edit', t('row.edit'), IconEditOutlineRegular, open, stopReason, pending || !!preflight)]
  const editor = editing && createElement(InlineEditorSurface, {
      key: 'inline', t, value: text, disabled: pending || !!preflight, stopReason, composerReason,
      onText: (event) => setText(event.target.value),
      onSend: () => { void send() }, onComposer: editInComposer, onCancel: cancel, onKeyDown,
    })
  const actions = createElement('span', { className: 'dsh-resend-user-actions' }, idle)
  return createElement('div', { className: props.renderMessage ? 'dsh-resend-user-message' : undefined }, [
    rules,
    createElement(UIStyles, { key: 'ui' }),
    createElement(ReplayPreflight, { key: 'preflight', operations, sessionId, userSeq: data.seq, t }),
    props.renderMessage ? createElement(Fragment, { key: 'message' }, props.renderMessage(actions)) : createElement(Fragment, { key: 'actions' }, actions),
    editor,
    error === undefined ? null : createElement('span', { key: 'error', role: 'alert', className: 'dsh-resend-operation-error' }, error),
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
    // Legacy companion metadata stays invisible: visible controls now belong
    // to the shipped user node, so process grouping cannot relocate them.
    anchorSeq: context.state.seq + 0.5,
    location: { kind: 'unresolved' },
    visibility: 'hidden', data: context.state,
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
