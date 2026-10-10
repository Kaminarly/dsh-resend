/**
 * The regenerate control on each assistant reply (ticket 07; spec §7
 * registration 3, §7.3, §9.2–§9.4).
 *
 * The control is a LIST entry in the shipped `conversation.chat.assistant-actions`
 * slot: the slot's owner renders one entry per assistant reply, and each entry
 * receives the standard props plus `{ messageId }` — the reply's durable message
 * id. The Host answers which assistant records remain effective and which is
 * last; a partial history window cannot establish either fact.
 *
 * The companion is one invisible chat node per append assistant message. Its
 * Definition records what `previous(kind)` can still see when the assembler
 * runs — the previous reply's seq and the nearest prompt's eligibility facts —
 * and the slot entry looks that companion up by the node's `id` (the message
 * id the slot already hands it). Window fills, replacements and live replies
 * invalidate the shared read-only Host eligibility snapshot.
 *
 * Refusals the client can PREDICT (§9.3) never send a call: streaming (the
 * host's own `agent-busy` is the real guard; this grey-out is the courtesy),
 * already-shadowed (the reply's own range is gone — nothing to rewind), an
 * image-only prompt (the host's `no-text`), and an off-surface target (no
 * companion at all — the reply no longer exists as an append). Each renders as
 * a disabled, unclickable chip with the reason on hover, never a post-click
 * dialog.
 */
import { createElement, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { usePreferences } from './preferences.js'
import { IconRefreshOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import { IconAction, UIStyles } from './ui.js'
import { useHiding } from './use-hiding.js'
import { USER_ACTIONS_KIND } from './user-actions.js'

const identity = (value) => value

function regenerateErrorText(error, t) {
  const code = error?.code
  return code === 'not-last-reply' || code === 'not-assistant-message'
    ? t('operation.error.' + code)
    : '(' + (code ?? '?') + ')'
}

/** The list slot's entry id — brand-new, never a shipped entry's (§7 registration 3). */
export const ASSISTANT_ACTIONS_ID = 'dsh-resend-regenerate'

/** The companion chat node's kind — a hidden node, outside the shipped node keys. */
export const ASSISTANT_ACTIONS_KIND = 'dsh-resend-regenerate'

/**
 * The companions this snapshot carries: every hidden node this plugin's
 * Definition built, in store order.
 *
 * Deliberately never throws, unlike {@link chatNodes}: a companion scan that
 * throws would take the whole strip down, and the only failure this scan can
 * have — an empty result — is a state the control already knows how to show
 * (off-surface, greyed out with the reason on hover).
 * @param snapshot - the Chat snapshot, or nothing when `useChat` is absent.
 * @returns the companion states, one per append assistant message in the window.
 */
export function companionStates(snapshot) {
  const states = []
  if (typeof snapshot?.nodes?.values === 'function') {
    for (const node of snapshot.nodes.values()) {
      if (node?.kind === ASSISTANT_ACTIONS_KIND && node.data !== undefined) states.push(node.data)
    }
  }
  return states
}

/**
 * Whole-conversation eligibility comes from the host's effective surface.
 * Window neighbours and their prevSeq never establish the conversation tail.
 * @param state - the reply's companion state.
 * @param conversation - the Host's whole effective conversation addresses.
 * @returns whether `state` is the effective conversation's last assistant reply.
 */
export function isLastReply(state, conversation) {
  return conversation?.ready === true && conversation.lastReplySeq === state?.seq
}

/**
 * The one no-text the client can PREDICT: a definite prompt with no text
 * block. Everything the host would refuse but the client cannot see — a
 * prompt evicted by a window fill, a carrier in the seat, a steering message
 * walked past — stays undecidable here, and the host's refusal is the answer.
 * @param state - the reply's companion state, or nothing when off-surface.
 * @returns `'imageOnly'`, or undefined when the host is the only judge.
 */
export function promptRefusal(state) {
  const prompt = state?.prompt
  if (prompt === undefined || prompt === null) return undefined
  if (prompt.isAppend !== true) return undefined
  if (prompt.sourceKind !== 'user') return undefined
  return prompt.hasText === false ? 'imageOnly' : undefined
}

/**
 * One reason per control state, in the order §9.3's grey-out must settle:
 * off-surface or shadowed > unreadable > saved range > streaming > no text.
 * @param state - the reply's companion state, or nothing when off-surface.
 * @param conversation - the Host's whole effective conversation addresses.
 * @param session - the session's running flag, or nothing when unreadable.
 * @param plan - the shared hide plan, or nothing when its read failed.
 * @returns the reason code, or `null` when the control may send.
 */
export function regenerateReason(state, conversation, session, plan, restrict = true) {
  if (state === undefined || state === null) return 'offSurface'
  if (plan?.hiddenSeqs?.has?.(state.seq) === true) return 'shadowed'
  if (plan === undefined || conversation?.ready !== true) return 'unreadable'
  if (!conversation.assistantSeqs.includes(state.seq)) return 'shadowed'
  if (restrict !== false && !isLastReply(state, conversation)) return 'notLast'
  if (session?.running === true) return 'stopFirst'
  return promptRefusal(state) ?? null
}

/** The refusal reasons a chip can grey out with, keyed to their dictionary entries. */
const REASON_TEXT = Object.freeze({
  notLast: 'row.notLast',
  stopFirst: 'row.stopFirst',
  shadowed: 'row.shadowed',
  imageOnly: 'row.imageOnly',
  offSurface: 'row.offSurface',
  unreadable: 'row.conversationUnavailable',
})

/**
 * The control follows the saved range and Host eligibility. Earlier replies
 * keep a disabled chip under the restriction; host refusals appear inline.
 *
 * The slot hands each entry the standard props plus `{ messageId }`, and the
 * entry looks its own companion up by the message id — the Definition's node
 * `id`, the same durable value the host's strip renders per reply.
 */
export function RegenerateControl(props) {
  const { messageId, sessionId, operations, preferences, t, useChat, useSession, useConversation } = props
  const chat = typeof useChat === 'function' ? useChat(identity) : undefined
  const session = typeof useSession === 'function' ? useSession(identity) : undefined
  const { plan } = useHiding({ useChat, useConversation, sessionId, operations, suppressError: true })
  const prefs = usePreferences(preferences)

  const states = companionStates(chat)
  const state = states.find((candidate) => candidate.id === messageId) ?? null
  const revision = JSON.stringify([states.map(state => [state.seq, state.prompt]), [...(plan?.hiddenSeqs ?? [])], session?.running, session?.openState])
  const conversation = useSyncExternalStore(operations.subscribe, () => operations.conversationFor(sessionId, revision))
  useEffect(() => { void operations.refreshConversation(sessionId, revision) }, [operations, sessionId, revision])
  const reason = regenerateReason(state, conversation, session, plan, prefs.restrictRegenerateToLastReply)

  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)
  const inFlight = useRef(false)

  const regenerate = async () => {
    const saved = preferences.getSnapshot()
    const current = regenerateReason(state, operations.conversationFor(sessionId, revision), session, plan, saved.restrictRegenerateToLastReply)
    if (!saved.ready || !saved.regenerateLastReply || inFlight.current || current !== null) return
    inFlight.current = true
    setPending(true)
    setError(null)
    try {
      // No `text` member: the host re-sends the round's own prompt (§4.3). The
      // client has never read the prompt text, and it should not have to.
      const result = await operations.run({ sessionId, targetSeq: state.seq, op: 'regenerate' })
      if (result?.ok !== true) setError(t('row.regenerateFailed') + '：' + regenerateErrorText(result?.error, t))
    } catch (cause) {
      setError(t('row.regenerateFailed') + '：' + regenerateErrorText(cause, t))
      console.warn('[dsh-resend] regenerate at seq ' + state.seq + ' in session ' + sessionId + ': ' + (cause?.message ?? cause))
    } finally {
      inFlight.current = false
      setPending(false)
    }
  }

  // The regenerate preference (ticket 08): off, the control disappears entirely —
  // including the disabled controls on earlier replies.
  if (prefs.regenerateLastReply === false) return null
  const disabledReason = !prefs.ready ? t(prefs.status === 'loading' ? 'settings.loading' : 'settings.read-error') : reason === null ? undefined : t(REASON_TEXT[reason])
  return createElement('div', { className: 'dsh-resend-regenerate' }, [
    createElement(UIStyles, { key: 'ui' }),
    createElement(IconAction, {
      key: 'regenerate',
      label: t('row.regenerate'), icon: IconRefreshOutlineRegular,
      disabled: !prefs.ready || pending || reason !== null,
      reason: disabledReason,
      onClick: () => {
        void regenerate()
      },
    }),
    conversation.status === 'read-error' ? createElement(IconAction, {
      key: 'retry-read', label: t('settings.retry'), icon: IconRefreshOutlineRegular,
      onClick: () => { void operations.refreshConversation(sessionId, revision, true) },
    }) : null,
    error === null ? null : createElement('span', { key: 'error', role: 'alert' }, error),
  ])
}

/** Bind the plugin's operations into the control, the way the other surfaces are bound. */
export function regenerateSurface(operations, preferences) {
  return function BoundRegenerate(props) {
    return createElement(RegenerateControl, { ...props, operations, preferences })
  }
}

/**
 * One invisible companion per assistant reply. `start` is PURE — the
 * assembler replays it after a window fill — and reads the third argument's
 * `previous(kind)` over the plugin's own Definition contexts:
 * the previous reply's seq (neighbour context only) and the nearest prompt's
 * eligibility facts (the one no-text the client can call). A `user/message`
 * with `surfaceOp: 'replace'` is a CARRIER and never a prompt, and a steering
 * message between prompt and reply is walked past by the host, so neither is
 * a definite prompt.
 *
 * The hidden companion carries the state the slot entry needs — the seq to
 * rewind to, the durable id to look it up by, and the verdict inputs — and
 * anchors at the reply's own seq, which places it beside that reply's strip.
 */
export const ASSISTANT_ACTIONS_DEFINITION = {
  kind: ASSISTANT_ACTIONS_KIND,
  target: 'chat',
  match: (event) => event?.type === 'assistant/message' && event.surfaceOp === 'append'
    ? { id: String(event.data?.message?.id ?? event.seq), role: 'start' } : null,
  start: (_context, match, reader) => {
    const event = match.event
    const previousReply = reader?.previous?.(ASSISTANT_ACTIONS_KIND)
    const previousPrompt = reader?.previous?.(USER_ACTIONS_KIND)
    const prompt = previousPrompt?.matches?.find((entry) => entry.role === 'start')?.event
    return {
      seq: event.seq,
      id: String(event.data?.message?.id ?? event.seq),
      prevSeq: previousReply?.state?.seq ?? null,
      prompt: prompt === undefined ? null : {
        seq: prompt.seq,
        isAppend: prompt.surfaceOp === 'append',
        sourceKind: prompt.data?.source?.kind ?? null,
        hasText: (Array.isArray(prompt.data?.content) ? prompt.data.content : []).some(
          (block) => block?.type === 'text' && typeof block.text === 'string',
        ),
      },
    }
  },
  update: (context) => context.state,
  buildViewNode: (context) => context.state === undefined ? null : ({
    key: context.key, kind: ASSISTANT_ACTIONS_KIND, id: context.id, target: 'chat',
    anchorSeq: context.state.seq, location: { kind: 'unresolved' },
    visibility: 'hidden', data: context.state,
  }),
}
