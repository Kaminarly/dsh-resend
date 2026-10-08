/**
 * The rewind point: one row, at the carrier's own seq, which is exactly one of
 * two states (spec §7 registration 2, §8.6, §9.4; ticket 05).
 *
 * The position is the carrier's, and the carrier is the event this plugin wrote
 * that renders NOTHING (spec §5.4) — so this Definition is what puts a row where
 * the model context now begins:
 *
 *  - the **count notice** (§8.6) when the rewind is ordinary — its count equals
 *    the number of keys in the emitted hide plan;
 *  - the **error row** (§9.4) when the resend this plugin queued for that carrier
 *    was not taken — the warning icon, a plain statement that history was rewound
 *    and the re-send failed, and a "Send again" button that replays the same
 *    request without performing another rewind.
 *
 * Exactly one of the two at every input: {@link rewindPointView} is total and
 * single-valued, and {@link RewindRow} renders its one branch — so the plugin can
 * never show both (two claims about one rewind point) at once.
 *
 * The state a rewind point is in is decided from the record THIS PAGE LOAD
 * produced (resend-operations.js), because the re-send the error
 * row offers replays a request that includes client-side text; a page that did
 * not issue the call has nothing to replay and falls back to the notice state.
 */
import { createElement, useEffect, useState, useSyncExternalStore } from 'react'
import { usePreferences } from './preferences.js'
import { IconWarningOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import { hasMarkerPrefix } from './marker.js'
import { HideRulesSurface } from './hide-rules.js'
import { RESEND_FAILED } from './resend-operations.js'
import { useHiding } from './use-hiding.js'

/**
 * The node kind, and the `conversation.chat.node` key that renders it.
 *
 * Deliberately outside the shipped key table (`user`, `assistant-step`, …): the
 * slot is KEYED, so registering an occupied kind would replace that occupant, and
 * this plugin never contends for the `user` key (spec §7).
 */
export const REWIND_ROW_KIND = 'dsh-resend-error'

/**
 * Whether an event is a carrier this plugin wrote (spec §5.4).
 *
 * The id prefix is the identity: `source.kind` is `'cordis-host-runner'`, the
 * honest kind for ANY Cordis host plugin's injected message, so it cannot
 * distinguish this plugin's carriers from another's.
 * @param event - one session event, as the client sees it.
 * @returns true for a surface-replacement user message carrying our prefix.
 */
function isCarrierEvent(event) {
  return (
    event?.type === 'user/message' &&
    event?.surfaceOp !== undefined &&
    event.surfaceOp !== 'append' &&
    hasMarkerPrefix(event.data?.id)
  )
}

/**
 * Which of the rewind point's two states this record is in (spec §8.6, §9.4).
 *
 * `notice` covers both "the re-send was queued" and "this page did not issue the
 * call": the failure state is a claim the plugin may make only about a call it
 * observed, and the ordinary state is the same row either way — §8.6's count
 * notice can be built for both, because its count comes from the hide plan the
 * log already carries rather than from this record.
 * @param outcome - the record {@link createResendOperations} kept for this
 *   carrier, or `undefined` when this page produced none.
 * @returns `{ kind: 'resend-failed' }` or `{ kind: 'notice' }`.
 */
export function rewindPointView(outcome) {
  return outcome?.status === RESEND_FAILED ? { kind: 'resend-failed' } : { kind: 'notice' }
}

/**
 * The rewind point's row, as a pure function of its state.
 *
 * Hook-free on purpose: React calls a component like this with props and uses the
 * element tree it returns, so a suite can call it directly and read that tree
 * without a renderer — which is how the row's content is held to the spec here.
 * The subscription lives one level up, in {@link RewindRowSurface}.
 * @param props - `{ outcome, t, onSendAgain }`: this carrier's record, the slot's
 *   translator, and the replay.
 * @returns the row's element tree.
 */
export function RewindRow({ outcome, t, onSendAgain, hidePlan, hideError, onDismiss }) {
  const view = rewindPointView(outcome)

  if (hideError !== undefined) {
    return createElement('div', { className: 'dsh-resend-row dsh-resend-row-error', role: 'alert' }, [
      createElement(IconWarningOutlineRegular, { key: 'icon', className: 'dsh-resend-row-icon' }),
      createElement('span', { key: 'message', className: 'dsh-resend-row-message' }, t('row.hideFailed')),
      createElement('pre', { key: 'detail', className: 'dsh-resend-row-detail' }, hideError),
    ])
  }

  if (view.kind === 'notice') {
    return createElement('div', { className: 'dsh-resend-row dsh-resend-row-notice' }, [
      createElement('span', { key: 'message', className: 'dsh-resend-row-message' }, String(t('row.hiddenCount')).replace('{count}', String(hidePlan?.count ?? 0))),
      createElement('button', { key: 'dismiss', type: 'button', className: 'dsh-resend-chip', onClick: onDismiss }, t('row.dismiss')),
    ])
  }

  return createElement('div', { className: 'dsh-resend-row dsh-resend-row-error', role: 'alert' }, [
    createElement(IconWarningOutlineRegular, { key: 'icon', className: 'dsh-resend-row-icon' }),
    createElement('span', { key: 'message', className: 'dsh-resend-row-message' }, t('row.resendFailed')),
    createElement(
      'button',
      { key: 'send-again', type: 'button', className: 'dsh-resend-chip', onClick: onSendAgain },
      t('row.sendAgain'),
    ),
  ])
}

/**
 * Bind this page's operations into the row surface.
 *
 * The slot's own props are the catalogue's standard set (`useChat`, `useInput`,
 * `inputActions`, `sessionId`, `useConversation`, `useProjection`) plus the node —
 * they do not carry plugin state, and the operations object is per page. Binding
 * it HERE, at the registration site, is what makes the row reachable in a real
 * page: a surface registered without it would read `operations.subscribe` on
 * `undefined` and be replaced by its own error boundary.
 * @param operations - the page's `createResendOperations` object.
 * @returns the slot component to wrap in the shared boundary.
 */
export function rewindRowSurface(operations, preferences) {
  return function BoundRewindRow(props) {
    return createElement(RewindRowSurface, { ...props, operations, preferences })
  }
}

/**
 * The slot occupant: it reads this carrier's record from the plugin's operations
 * and re-renders when that record moves.
 *
 * The subscription is load-bearing, not decoration: a failed resend appends
 * nothing to the log, so nothing else in the host's tree re-renders — without it
 * the error row would only appear the next time something unrelated did.
 * @param props - the bound standard props plus `{ node, sessionId, operations }`.
 * @returns the row, wrapped by the caller in the shared boundary.
 */
function RewindRowSurface(props) {
  const { node, sessionId, operations, preferences, t } = props
  const point = { sessionId, carrierSeq: node?.data?.carrierSeq }
  // `operations.subscribe` is passed as the method itself, not wrapped: React
  // re-subscribes whenever that argument's identity changes, so a fresh closure
  // per render would tear the subscription down and rebuild it on every pass.
  const outcome = useSyncExternalStore(operations.subscribe, () => operations.outcomeOf(point))
  const prefs = usePreferences(preferences)
  const { plan, css, error } = useHiding({ ...props, hide: prefs.hideReplacedMessages })
  const [dismissed, setDismissed] = useState(false)
  const hidePlan = plan?.byCarrier.get(point.carrierSeq)
  const missingPlan = plan !== undefined && hidePlan === undefined && !plan.errors.has(point.carrierSeq)
    ? 'range ' + JSON.stringify(node.data.range ?? [point.carrierSeq]) + ': the rewind point is missing from the Chat hide plan'
    : undefined
  const hideError = error ?? plan?.errors.get(point.carrierSeq)?.message ?? missingPlan
  useEffect(() => {
    if (missingPlan !== undefined) console.warn('[dsh-resend] session ' + sessionId + ': unable to hide rewind ' + missingPlan)
  }, [missingPlan, sessionId])

  const row = createElement(RewindRow, {
    outcome,
    t,
    hidePlan,
    hideError,
    onDismiss: () => setDismissed(true),
    onSendAgain: () => {
      void operations.sendAgain(point)
    },
  })
  // Dismiss only removes the notice text. Surface 6 — the hide-rules element —
  // belongs to the row tree and remains mounted for the lifetime of the rewind
  // point, hiding the rows it covers.
  return createElement('div', null, [
    createElement(HideRulesSurface, { key: 'rules', t, css }),
    (!dismissed || rewindPointView(outcome).kind === 'resend-failed' || hideError !== undefined) &&
      createElement('div', { key: 'row' }, row),
  ])
}

/**
 * The Conversation Definition that produces one rewind-point node per carrier.
 *
 * `start` keeps only what the row needs — the carrier's own seq, which addresses
 * the rewind point — and stays pure (the assembler replays it after a window
 * fill); the node is anchored at that seq, the rewind point itself, where the
 * model context now begins.
 */
export const REWIND_ROW_DEFINITION = {
  kind: REWIND_ROW_KIND,
  target: 'chat',
  match: (event) => (isCarrierEvent(event) ? { id: `dsh-resend:${String(event.data.id)}`, role: 'start' } : null),
  start: (_context, match) => {
    const event = match.event
    const state = { carrierSeq: event.seq, range: { start: event.surfaceOp.startSeq, end: event.surfaceOp.endSeq } }
    // The audit is the first citation. Remote records take precedence over this
    // cold-load fallback when the live operation was performed on this page.
    if (Array.isArray(event.sourceEventSeqs)) state.shadowedSeqs = event.sourceEventSeqs.slice(1)
    return state
  },
  update: (context) => context.state,
  buildViewNode: (context) => {
    if (context.state === undefined) return null
    return {
      key: context.key,
      kind: REWIND_ROW_KIND,
      id: context.id,
      target: 'chat',
      anchorSeq: context.state.carrierSeq,
      // A plugin kind would otherwise enter a collapsible process group. The
      // disclosure must stay independently visible at its seq.
      location: { kind: 'unresolved' },
      visibility: 'visible',
      data: context.state,
    }
  },
}
