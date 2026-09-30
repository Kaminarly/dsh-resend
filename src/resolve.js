/**
 * Read-only resolution: where the target is, what the range is, and which code
 * to refuse with — writing nothing (spec §4.2–§4.5; ticket 03).
 *
 * The whole point of this module is that the range and the resend text come
 * from **one** covering log read per operation (see `./log-read.js`), and that
 * the surface facts are derived from that same log with the **official**
 * `foldSurface`, never from a seq-monotonic assumption about the node list.
 * A replacement carrier is spliced INTO the node list at the position of the
 * range it shadows, so surface order and seq order disagree by design: a
 * `[4, 6, 8, 10]` surface rewound over `[4, 6]` becomes `[14, 8, 10]`, and a
 * range computed with `indexOf` over an assumed-ascending surface inverts and
 * deadlocks the write (spec §16.7, prior art §F.6).
 *
 * The three "not on the surface" outcomes are deliberately NOT conflated
 * (spec §4.5):
 *
 *  - `target-shadowed` — the log says the target is gone: a carrier's
 *    replacement range covers it, or it is off the active surface, so it was
 *     rewound (or never joined at all). Not retryable.
 *  - `message-pending` — the target exists but the surface has not taken it up,
 *    or the read and the live surface disagree about what the surface is.
 *    Retryable.
 *  - `message-not-found` — this seq never existed. Not retryable.
 *
 * and `replay-failed` is never dressed as any of them.
 *
 * The one degradation this module performs, in one place: when the covering read
 * cannot be folded at all, the LIVE surface becomes the only surface view (see
 * the fold below). Everything else refuses.
 */
import { foldSurface, isAppendSurfaceEvent } from '@deepseek-ai/dsh-session'
import { currentSessionMessageProjections } from '@deepseek-ai/dsh-session-format-catalog/message-projections'
import { refuse } from './error-codes.js'
import { asArray, describeError, logWarning } from './host.js'
import { coveringRefusalCode, eventAtSeq, readCoveringLog, readFileMaxSeq } from './log-read.js'

/**
 * The code for a target the covering log does not hold (spec §4.5).
 *
 * Two facts together: the explicit `not-found` state, and the file facts. The
 * stored log's `fileMaxSeq` is the primary extent; when the auxiliary route
 * cannot supply it, the covering read's own extent stands in. When neither is
 * known, this returns `message-not-found` — the specification forbids inventing
 * a `message-pending` that nothing supports.
 * @param ctx - the host context.
 * @param sessionId - the session being resolved.
 * @param targetSeq - the seq the client asked for.
 * @param lastCoveredSeq - the covering read's extent, if it reached anything.
 * @returns `'message-pending' | 'message-not-found'`.
 */
async function absentTargetCode(ctx, sessionId, targetSeq, lastCoveredSeq) {
  const file = await readFileMaxSeq(ctx, sessionId)
  const extent = file.status === 'known' ? file.fileMaxSeq : lastCoveredSeq
  if (extent === undefined) return 'message-not-found'
  return targetSeq > extent ? 'message-pending' : 'message-not-found'
}

/**
 * Whether two surface node lists are the same surface, order included.
 * @param left - one node list.
 * @param right - the other.
 * @returns true when they are the same list.
 */
function sameSurface(left, right) {
  return left.length === right.length && left.every((seq, index) => seq === right[index])
}

/**
 * Where the surface's last assistant reply is (spec §4.3 step 5).
 *
 * Three outcomes, because "no reply" and "cannot see" must not be conflated: a
 * walk that meets a node this read does not hold cannot testify about what
 * follows the target, while a surface that genuinely carries no reply is a plain
 * failure of the check.
 * @param log - the covering log.
 * @param nodes - the current surface node seqs, in surface order.
 * @returns `{ status: 'found' | 'unreadable', seq }` or `{ status: 'absent' }`.
 */
function lastAssistantSeq(log, nodes) {
  for (let index = nodes.length - 1; index >= 0; index -= 1) {
    const event = eventAtSeq(log, nodes[index])
    // A node whose event this read does not hold ends the walk, the same rule
    // the prompt walk follows: stepping over a hole to an earlier node is
    // exactly what §4.2 forbids, so this reports what it cannot see instead.
    if (event === undefined) return { status: 'unreadable', seq: nodes[index] }
    if (event.type === 'assistant/message') return { status: 'found', seq: event.seq }
  }
  return { status: 'absent' }
}

/**
 * The seq of the user message that opens the target reply's round (spec §4.3,
 * §9.2 "rewinds from that reply's round").
 *
 * Walking BACK over the surface is safe in exactly one way: every node is
 * looked up by its own seq, and a node whose event the covering read does not
 * hold ends the walk as a failure instead of being stepped over. Skipping a
 * hole — or the shadowed earlier round behind it — is the production defect
 * this whole module exists to prevent, and it resends the WRONG prompt.
 *
 * Two kinds of `user/message` are not a round's prompt: a replacement carrier
 * (a user message on the surface, but never append-origin) and an
 * injected-context message (`source.kind !== 'user'`, e.g. steering or a file
 * notice), which does not open a round at all.
 * @param log - the covering log.
 * @param nodes - the current surface node seqs, in surface order.
 * @param targetSeq - the target reply's seq.
 * @returns `{ seq, index }` for the round's prompt — the index is where the
 *   range starts in `nodes` — or `undefined` when it cannot be read.
 */
function roundPrompt(log, nodes, targetSeq) {
  for (let index = nodes.indexOf(targetSeq) - 1; index >= 0; index -= 1) {
    const event = eventAtSeq(log, nodes[index])
    if (event === undefined) return undefined
    if (event.type !== 'user/message') continue
    if (!isAppendSurfaceEvent(event)) continue
    if (event.data?.source?.kind !== 'user') continue
    return { seq: event.seq, index }
  }
  return undefined
}

/**
 * The text a regenerate resends: the prompt's text blocks, in order.
 * @param event - the round's user-message event.
 * @returns the joined text, or `undefined` when the message carries no text
 *   block at all — an image-only prompt, which is refused with `no-text`
 *   rather than sent as an empty prompt (spec §4.3).
 */
function promptText(event) {
  const blocks = asArray(event?.data?.content).filter((block) => block?.type === 'text' && typeof block.text === 'string')
  return blocks.length === 0 ? undefined : blocks.map((block) => block.text).join('\n')
}

/**
 * Resolve the target and the range without writing anything (spec §4.3).
 *
 * The order of the checks is normative (§4.3): a missing target is decided
 * before shadowing, the read's agreement with the live surface before either is
 * used, and the op-specific rejections only once the target is a live surface
 * node — which is why a blank edit aimed at a shadowed message is
 * `target-shadowed`, not `blank-text`.
 * @param ctx - the host context.
 * @param request - the boundary-validated `ResendApplyRequest`.
 * @param liveSurfaceNodes - the LIVE session's current surface node seqs, in
 *   surface order (`session.surface.nodes`). §4.3 names the live surface as the
 *   surface; the covering read's own fold is the cross-check on it.
 * @returns `{ ok: true, value: plan }` with
 *   `{ op, targetSeq, rangeStartSeq, endSeq, shadowedSeqs, resendText }`, or
 *   `{ ok: false, error: { code, detail? } }` in spec §4.5's vocabulary.
 */
export async function resolveTarget(ctx, request, liveSurfaceNodes) {
  const { sessionId, targetSeq, op } = request
  const liveNodes = asArray(liveSurfaceNodes)

  // The descriptor's strict codec already refuses an unknown `op` at the
  // boundary; this seam is exported and callable directly, so it stays total on
  // its own terms rather than treating an unknown op as "not edit".
  if (op !== 'edit' && op !== 'regenerate') return refuse('bad-request', `unknown op ${JSON.stringify(op)}`)

  const covering = await readCoveringLog(ctx, sessionId)
  if (covering.status === 'refused') {
    return refuse(coveringRefusalCode(covering.reason), covering.detail)
  }
  const log = covering.log

  const target = eventAtSeq(log, targetSeq)
  if (target === undefined) {
    return refuse(await absentTargetCode(ctx, sessionId, targetSeq, covering.lastCoveredSeq), `seq ${targetSeq} is not in the covering read`)
  }

  let fold
  try {
    // The official projections are supplied because a log that carries a
    // projection-owned event (`@messageProjection`) is REFUSED by a bare fold —
    // the same list `sessionQuery.readSession` replays with, so the fold here is
    // the host's own replay and not a second interpretation of the format.
    fold = foldSurface(log, currentSessionMessageProjections)
  } catch (error) {
    // A read that does not replay — a short or hole-y read, which is §4.2's own
    // failure shape — cannot testify about the surface. It does NOT get to break
    // the operation into an opaque fault either: the live surface is still the
    // current surface, and every read below is still an exact-seq read that
    // refuses instead of stepping over a hole (§4.2, §13.1 #13). The degradation
    // is logged rather than silent, so a read that keeps failing this way is
    // diagnosable. Note this is NOT the `replay-failed` state of §4.5: that comes
    // from route (2)'s own typed refusal, and that one is a refusal.
    logWarning(ctx, `the covering read of ${JSON.stringify(sessionId)} did not replay (${describeError(error)}); resolving against the live surface only`)
  }

  // §4.3 step 3, in its strongest form: the covering read and the live session
  // must agree about the surface BEFORE either is used for a span. A read that
  // folds to a different node list is a read of a different surface — dropping a
  // carrier from a short read quietly re-exposes the whole range that carrier had
  // shadowed, and a span computed from that list would not even be valid against
  // the surface the writer validates. Retryable, never destructive.
  //
  // Deliberately conservative: it also refuses a read whose only discrepancy
  // lies AFTER the target, where §4.3 would have taken the range from the live
  // surface and resolved. Retrying costs one click, and resolving against a read
  // already shown to misrepresent this session's surface is how a wrong span
  // gets written.
  if (fold !== undefined && !sameSurface(fold.nodes, liveNodes)) {
    return refuse('message-pending', `the covering read's surface disagrees with the live surface of ${JSON.stringify(sessionId)}`)
  }

  const coveredByCarrier = fold !== undefined && fold.replacements.some((replacement) => replacement.shadowedSeqs.includes(targetSeq))

  // §4.3 step 2: decided from the LOG — a carrier's replacement range covering
  // the target is the positive fact, and being off the (now agreed) surface is
  // the same fact seen from the other side. A log-only seq, e.g. a tool/call
  // anchor, lands here too: it never joined the surface and never will.
  //
  // This verdict does not depend on the read being foldable: the live surface is
  // the session's own view and knows nothing about what this read dropped, so a
  // read that cannot be folded can never make a rewound target look alive.
  if (coveredByCarrier || !liveNodes.includes(targetSeq)) {
    return refuse('target-shadowed', coveredByCarrier ? `a carrier's range covers seq ${targetSeq}` : `seq ${targetSeq} is off the active surface`)
  }

  // §4.3 step 4: only an edit acts on a user message.
  if (op === 'edit' && target.type !== 'user/message') {
    return refuse('not-user-message', `seq ${targetSeq} is a ${String(target.type)}, not a user message`)
  }

  // §4.3 step 5: regenerate acts on the LAST assistant reply, and only on it.
  if (op === 'regenerate') {
    const lastReply = lastAssistantSeq(log, liveNodes)
    // The read cannot see a node after the target, so it cannot establish that
    // the target is the last reply: retryable, and never a claim that the reply
    // is not the last one (§4.2's "a read that does not cover it is a failure").
    if (lastReply.status === 'unreadable') {
      return refuse('message-pending', `the covering read does not hold surface node ${lastReply.seq}`)
    }
    if (lastReply.seq !== targetSeq) {
      return refuse('not-last-reply', `seq ${targetSeq} is not the last assistant reply on the surface`)
    }
  }

  // §4.4 step 6: op-specific text validation, after target resolution.
  //
  // The range's start and its position come out of this branch together, so the
  // span needs no second lookup: for an edit the start is the target (already
  // known to be ON the live surface), and for a regenerate it is the node the
  // walk returned, taken from that walk's own position.
  let rangeStartSeq
  let startIndex
  let resendText
  if (op === 'edit') {
    rangeStartSeq = targetSeq
    startIndex = liveNodes.indexOf(targetSeq)
    resendText = request.text
    // §4.5 gives these two different rows on purpose: "missing text for edit" is
    // malformed input, while an empty or whitespace-only one is the business
    // refusal (and §4.4 checks it here, after the target resolved).
    if (typeof resendText !== 'string') return refuse('bad-request', 'op "edit" requires text')
    if (resendText.trim() === '') return refuse('blank-text', 'the edited text is empty or whitespace-only')
  } else {
    // A regenerate rewinds the target reply's ROUND and re-sends that round's
    // prompt (spec §4.3 "the text of the user message at the range's start",
    // §9.2, ticket 07) — so the range starts at the prompt, not at the reply.
    // §4.3's pseudocode says `start ← position of targetSeq`, which cannot hold
    // together with its own next sentence (the range's start is a USER message)
    // nor with §5.4's provenance rule (the range's start identifies what was
    // acted on: for regenerate, the round's prompt).
    const prompt = roundPrompt(log, liveNodes, targetSeq)
    const event = prompt === undefined ? undefined : eventAtSeq(log, prompt.seq)
    resendText = event === undefined ? undefined : promptText(event)
    if (prompt === undefined || resendText === undefined) {
      return refuse('no-text', `no readable prompt text for the round containing seq ${targetSeq}`)
    }
    rangeStartSeq = prompt.seq
    startIndex = prompt.index
  }

  // §4.3: the range always runs to the end of the surface, in SURFACE order —
  // it may descend numerically, and that is legal (§13.1 #6, measured §16.7).
  return {
    ok: true,
    value: {
      op,
      targetSeq,
      rangeStartSeq,
      endSeq: liveNodes[liveNodes.length - 1],
      shadowedSeqs: liveNodes.slice(startIndex),
      resendText,
    },
  }
}
