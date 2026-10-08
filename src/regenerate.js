/**
 * The regenerate control on the last assistant reply (ticket 07; spec §7
 * registration 3, §7.3, §9.2–§9.4).
 *
 * The control is a LIST entry in the shipped `conversation.chat.assistant-actions`
 * slot: the slot's owner renders one entry per assistant reply, and each entry
 * receives the standard props plus `{ messageId }` — the reply's durable message
 * id. Which reply is the last one is not a host question, it is a CLIENT one,
 * and the answer is adjacency, because a client never sees the whole log:
 *
 *   a reply is last when no other reply's companion points at it.
 *
 * The companion is one invisible chat node per append assistant message. Its
 * Definition records what `previous(kind)` can still see when the assembler
 * runs — the PREVIOUS reply's seq and the nearest prompt's eligibility facts —
 * and the slot entry looks that companion up by the node's `id` (the message
 * id the slot already hands it). A window fill evicts predecessors, replays
 * `start`, and the verdict holds: a reply that has a later reply in the same
 * window still has that reply's companion pointing at it, and one that does
 * not is the last.
 *
 * Refusals the client can PREDICT (§9.3) never send a call: streaming (the
 * host's own `agent-busy` is the real guard; this grey-out is the courtesy),
 * already-shadowed (the reply's own range is gone — nothing to rewind), an
 * image-only prompt (the host's `no-text`), and an off-surface target (no
 * companion at all — the reply no longer exists as an append). Each renders as
 * a disabled, unclickable chip with the reason on hover, never a post-click
 * dialog.
 */
import { createElement, useRef, useState } from 'react'
import { IconRefreshOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import { useHiding } from './use-hiding.js'

const identity = (value) => value

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
 * A reply is the last when no OTHER companion points at it. `prevSeq` is the
 * only "am I last?" evidence a client may keep — the preceding reply's seq —
 * so the verdict is pure adjacency: a reply that is another reply's previous
 * is not last, and one no reply points at is.
 * @param state - the reply's companion state.
 * @param states - every companion state in the window, including `state`.
 * @returns whether `state` is the window's last assistant reply.
 */
export function isLastReply(state, states) {
  return !states.some((other) => other !== state && other.seq !== state.seq && other.prevSeq === state.seq)
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
 * off-surface (the reply's append is gone) > not-last (render nothing) >
 * streaming > already-shadowed > image-only prompt.
 * @param state - the reply's companion state, or nothing when off-surface.
 * @param states - every companion state in the window.
 * @param session - the session's running flag, or nothing when unreadable.
 * @param plan - the shared hide plan, or nothing when its read failed.
 * @returns the reason code, or `null` when the control may send.
 */
export function regenerateReason(state, states, session, plan) {
  if (state === undefined || state === null) return 'offSurface'
  if (!isLastReply(state, states)) return 'notLast'
  if (session?.running === true) return 'stopFirst'
  if (plan?.hiddenSeqs?.has?.(state.seq) === true) return 'shadowed'
  return promptRefusal(state) ?? null
}

/** The refusal reasons a chip can grey out with, keyed to their dictionary entries. */
const REASON_TEXT = Object.freeze({
  stopFirst: 'row.stopFirst',
  shadowed: 'row.shadowed',
  imageOnly: 'row.imageOnly',
  offSurface: 'row.offSurface',
})

/**
 * The control itself: the always-visible chip on the last reply, nothing
 * anywhere else, and a host refusal answered with inline text (§9.3).
 *
 * The slot hands each entry the standard props plus `{ messageId }`, and the
 * entry looks its own companion up by the message id — the Definition's node
 * `id`, the same durable value the host's strip renders per reply.
 */
export function RegenerateControl(props) {
  const { messageId, sessionId, operations, t, useChat, useSession, useConversation } = props
  const chat = typeof useChat === 'function' ? useChat(identity) : undefined
  const session = typeof useSession === 'function' ? useSession(identity) : undefined
  const { plan } = useHiding({ useChat, useConversation, sessionId, operations, suppressError: true })

  const states = companionStates(chat)
  const state = states.find((candidate) => candidate.id === messageId) ?? null
  const reason = regenerateReason(state, states, session, plan)

  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)
  const inFlight = useRef(false)

  const regenerate = async () => {
    if (inFlight.current || reason !== null) return
    inFlight.current = true
    setPending(true)
    setError(null)
    try {
      // No `text` member: the host re-sends the round's own prompt (§4.3). The
      // client has never read the prompt text, and it should not have to.
      const result = await operations.run({ sessionId, targetSeq: state.seq, op: 'regenerate' })
      if (result?.ok !== true) setError(t('row.regenerateFailed') + ' (' + (result?.error?.code ?? '?') + ')')
    } catch (cause) {
      setError(t('row.regenerateFailed'))
      console.warn('[dsh-resend] regenerate at seq ' + state.seq + ' in session ' + sessionId + ': ' + (cause?.message ?? cause))
    } finally {
      inFlight.current = false
      setPending(false)
    }
  }

  if (reason === 'notLast') return null
  const disabledReason = reason === null ? undefined : t(REASON_TEXT[reason])
  return createElement('div', { className: 'dsh-resend-regenerate' }, [
    createElement('button', {
      key: 'regenerate',
      type: 'button',
      className: 'dsh-resend-chip',
      disabled: pending || reason !== null,
      title: disabledReason,
      onClick: () => {
        void regenerate()
      },
    }, [
      createElement(IconRefreshOutlineRegular, { key: 'icon', size: 14 }),
      createElement('span', { key: 'label' }, t('row.regenerate')),
    ]),
    error === null ? null : createElement('span', { key: 'error', role: 'alert' }, error),
  ])
}

/** Bind the plugin's operations into the control, the way the other surfaces are bound. */
export function regenerateSurface(operations) {
  return function BoundRegenerate(props) {
    return createElement(RegenerateControl, { ...props, operations })
  }
}

/**
 * One invisible companion per assistant reply. `start` is PURE — the
 * assembler replays it after a window fill — and reads only `previous(kind)`:
 * the previous reply's seq (the last-reply adjacency) and the nearest prompt's
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
  start: (context, match) => {
    const event = match.event
    const previousReply = context?.previous?.('assistant/message')
    const prompt = context?.previous?.('user/message')
    return {
      seq: event.seq,
      id: String(event.data?.message?.id ?? event.seq),
      prevSeq: previousReply?.seq ?? null,
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
