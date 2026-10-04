/**
 * The rewind point: one row, at the carrier's own seq, which is exactly one of
 * two states (spec §7 registration 2, §8.6, §9.4; ticket 05).
 *
 * The position is the carrier's, and the carrier is the event this plugin wrote
 * that renders NOTHING (spec §5.4) — so this Definition is what puts a row where
 * the model context now begins:
 *
 *  - the **count notice** (§8.6) when the rewind is ordinary — ticket 06 owns its
 *    content, because its count must equal the number of keys in the emitted hide
 *    plan;
 *  - the **error row** (§9.4) when the resend this plugin queued for that carrier
 *    was not taken — the warning icon, a plain statement that history was rewound
 *    and the re-send failed, and a "Send again" button that replays the same
 *    request without performing another rewind.
 *
 * Exactly one of the two at every input: {@link rewindPointView} is total and
 * single-valued, and {@link RewindRow} renders its one branch — so the plugin can
 * never show both (two claims about one rewind point) at once.
 *
 * What the plugin CANNOT yet show is the notice's content: its count must equal
 * the number of keys in the emitted hide plan (§8.6), which is ticket 06's
 * machinery, so until then that state renders no row rather than a number nobody
 * can stand behind. The state a rewind point is in is decided from the record
 * THIS PAGE LOAD produced (`./resend-operations.js`), because the re-send the error
 * row offers replays a request that includes client-side text; a page that did
 * not issue the call has nothing to replay and falls back to the notice state.
 */
import { createElement, useSyncExternalStore } from 'react'
import { IconWarningOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import { hasMarkerPrefix } from './marker.js'
import { RESEND_FAILED } from './resend-operations.js'

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
 * @returns the row's element tree, or `null` for the state ticket 06 fills in.
 */
export function RewindRow({ outcome, t, onSendAgain }) {
  const view = rewindPointView(outcome)

  if (view.kind === 'notice') {
    // §8.6's count notice, owned by ticket 06. Its count is the number of keys in
    // the emitted hide plan — NOT the number of shadowed seqs — so approximating
    // it here would put a wrong number on exactly the large rewinds where it is
    // the user's only warning. Rendering nothing is the honest seam.
    return null
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
export function rewindRowSurface(operations) {
  return function BoundRewindRow(props) {
    return createElement(RewindRowSurface, { ...props, operations })
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
function RewindRowSurface({ node, sessionId, operations, t }) {
  const point = { sessionId, carrierSeq: node?.data?.carrierSeq }
  // `operations.subscribe` is passed as the method itself, not wrapped: React
  // re-subscribes whenever that argument's identity changes, so a fresh closure
  // per render would tear the subscription down and rebuild it on every pass.
  const outcome = useSyncExternalStore(operations.subscribe, () => operations.outcomeOf(point))

  return createElement(RewindRow, {
    outcome,
    t,
    onSendAgain: () => {
      void operations.sendAgain(point)
    },
  })
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
  start: (_context, match) => ({ carrierSeq: match.event.seq }),
  update: (context) => context.state,
  buildViewNode: (context) => {
    if (context.state === undefined) return null
    return {
      key: context.key,
      kind: REWIND_ROW_KIND,
      id: context.id,
      target: 'chat',
      anchorSeq: context.state.carrierSeq,
      location: context.start?.location ?? context.matches?.[0]?.location ?? { kind: 'unresolved' },
      visibility: 'visible',
      data: context.state,
    }
  },
}
