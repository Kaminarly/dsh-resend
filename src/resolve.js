/**
 * Read-only resolution: where the target is, what the range is, which code to
 * refuse with, and whether the request is really ticket 05's re-send with no
 * rewind — writing nothing (spec §4.2–§4.5, §9.4; tickets 03 and 05).
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
 * **One state is not in that list, and it is the state §9.4 is about.** A target
 * covered by THIS plugin's own carrier, whose paired resend message
 * (`./marker.js`) is nowhere in the log, is not "history is read-only": the
 * rewind landed and the prompt never reached the agent, which is exactly the
 * failure the user's "Send again" button exists for. Resolving it as
 * `target-shadowed` would tell that user their history is gone when the one
 * thing they can still do is send the prompt. So the same shadowing test that
 * produces `target-shadowed` first asks whether the shadowing carrier is ours
 * and its resend never landed, and answers a `kind: 'resend-only'` plan when it
 * is. The check is log-derived, so it survives a host restart, and the read that
 * carries it is the agreed surface (see {@link resendOnlyPlan}) — a read that
 * dropped the resend message disagrees with the live surface and refuses
 * `message-pending` before this verdict is reached.
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
import { isCarrierIdFor, resendIdFor } from './marker.js'
import { createHash } from 'node:crypto'

/** Bind retries to exact edited text without adding prompt contents to the log. */
export function editPromptDigest(text) {
  return createHash('sha256').update(JSON.stringify(text)).digest('hex')
}

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
export function lastAssistantSeq(log, nodes) {
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

/** One saved-policy check shared by resolution and the synchronous write boundary. */
export function regenerateTargetRefusal(log, nodes, targetSeq, restrict = true) {
  const target = eventAtSeq(log, targetSeq)
  if (target === undefined) return refuse('message-pending', 'the target is no longer readable')
  if (target.type !== 'assistant/message' || !isAppendSurfaceEvent(target)) {
    return refuse('not-assistant-message', `seq ${targetSeq} is not an append assistant reply`)
  }
  if (!nodes.includes(targetSeq)) return refuse('target-shadowed', 'the target left the effective conversation')
  if (restrict !== false) {
    const last = lastAssistantSeq(log, nodes)
    if (last.status === 'unreadable') return refuse('message-pending', `surface node ${last.seq} is unreadable`)
    if (last.seq !== targetSeq) return refuse('not-last-reply', `seq ${targetSeq} is not the last assistant reply`)
  }
}

/** Loader volatile fields are live refs, rather than the raw saved booleans. */
export function restrictRegenerate(ctx) {
  return ctx.fiber?.config?.restrictRegenerateToLastReply?.get?.() !== false
}

function isUserMessage(event) {
  return event?.type === 'user/message' && isAppendSurfaceEvent(event) && event.data?.source?.kind === 'user'
}

export function restrictEdit(ctx) {
  return ctx.fiber?.config?.restrictEditToLastUserMessage?.get?.() !== false
}

/** Real user sends count even when they have no editable text. */
export function editTargetRefusal(log, nodes, targetSeq, restrict = true) {
  const target = eventAtSeq(log, targetSeq)
  if (target === undefined) return refuse('message-pending', 'the target is no longer readable')
  if (!isUserMessage(target)) return refuse('not-user-message', 'the target is not an append message sent by the user')
  if (!nodes.includes(targetSeq)) return refuse('target-shadowed', 'the target left the effective conversation')
  if (restrict !== false) {
    for (let index = nodes.length - 1; index >= 0; index -= 1) {
      const event = eventAtSeq(log, nodes[index])
      if (event === undefined) return refuse('message-pending', 'the effective conversation is not fully readable')
      if (isUserMessage(event)) {
        if (event.seq !== targetSeq) return refuse('not-last-user-message', 'the target is not the last user message')
        return
      }
    }
    return refuse('not-last-user-message', 'no effective user message was found')
  }
}

/** Read the complete model surface; a Chat window never establishes its tail. */
export async function effectiveConversationEligibility(ctx, session) {
  const covering = await readCoveringLog(ctx, session.id)
  if (covering.status === 'refused') return refuse(coveringRefusalCode(covering.reason), covering.detail)
  let fold
  try { fold = foldSurface(covering.log, currentSessionMessageProjections) } catch {
    return refuse('message-pending', 'the effective conversation could not be established')
  }
  if (!sameSurface(fold.nodes, asArray(session.surface.nodes))) return refuse('message-pending', 'the effective conversation changed during the read')
  const assistantSeqs = fold.nodes.filter(seq => {
    const event = eventAtSeq(covering.log, seq)
    return event?.type === 'assistant/message' && isAppendSurfaceEvent(event)
  })
  const lastReplySeq = assistantSeqs.at(-1)
  const userSeqs = fold.nodes.filter(seq => isUserMessage(eventAtSeq(covering.log, seq)))
  const lastUserSeq = userSeqs.at(-1)
  return { ok: true, value: { assistantSeqs, ...(lastReplySeq === undefined ? {} : { lastReplySeq }),
    userSeqs, ...(lastUserSeq === undefined ? {} : { lastUserSeq }) } }
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
 * Whether the covering log holds the `user/message` with this id.
 *
 * The one question ticket 05's re-send rests on: §4.1's `resendMessageId` is "the
 * id of the message queued to the agent", so a message carrying it is the proof
 * that this carrier's prompt was queued — and its absence, from a read already
 * shown to agree with the live surface, is the proof that it never was.
 * @param log - the covering log.
 * @param id - the id being searched for.
 * @returns true when an event in the log carries that id.
 */
function logHoldsMessage(log, id) {
  return log.some((event) => event?.type === 'user/message' && event?.data?.id === id)
}

/**
 * Ticket 05's resend-only plan: the rewind already landed and its prompt never
 * reached the agent, so the one thing owed is the re-send (spec §9.4).
 *
 * Three facts together, all from the covering log and its fold:
 *
 *  - the range covering the target belongs to a carrier of OURS, for THIS
 *    operation (`./marker.js`) — another plugin's replacement, or an edit
 *    carrier answering a regenerate, is ordinary read-only history;
 *  - the resend message that carrier's id derives is nowhere in the log;
 *  - the prompt is still readable, so the re-send is not a guess: for an edit it
 *    is the request's own text (validated exactly as §4.4 step 6 validates it),
 *    for a regenerate the range start's message, which is the round's prompt.
 *
 * `undefined` means "not a re-send" and leaves the caller's `target-shadowed`
 * verdict in place.
 * @param log - the covering log.
 * @param fold - the official fold of that log, or `undefined` when it did not
 *   replay. Without the fold there is no range membership to read, and this is
 *   not a re-send.
 * @param request - the boundary-validated `ResendApplyRequest`.
 * @returns `{ ok: true, value }` with a `kind: 'resend-only'` plan, a refusal,
 *   or `undefined` when the target is simply shadowed.
 */
function resendOnlyPlan(log, fold, request) {
  if (fold === undefined) return undefined
  const { op, targetSeq } = request

  const replacement = fold.replacements.find((candidate) => candidate.shadowedSeqs.includes(targetSeq))
  if (replacement === undefined) return undefined

  const carrier = eventAtSeq(log, replacement.seq)
  const carrierId = carrier?.data?.id
  if (carrier?.type !== 'user/message' || !isCarrierIdFor(op, carrierId)) return undefined
  if (logHoldsMessage(log, resendIdFor(carrierId))) return undefined
  if (op === 'edit' && targetSeq !== replacement.start) return undefined
  if (op === 'regenerate') {
    const recordedTarget = /-target-(\d+)$/.exec(carrierId)
    if (recordedTarget !== null) {
      if (Number(recordedTarget[1]) !== targetSeq) return undefined
    } else {
      // Legacy carriers did not record the reply address. They only ever acted
      // on the last assistant reply, so recover exactly that original target.
      const original = foldSurface(log.filter(event => event.seq < replacement.seq - 1), currentSessionMessageProjections)
      if (lastAssistantSeq(log, original.nodes).seq !== targetSeq) return undefined
    }
  }

  let resendText
  if (op === 'edit') {
    resendText = request.text
    if (typeof resendText !== 'string') return refuse('bad-request', 'op "edit" requires text')
    if (resendText.trim() === '') return refuse('blank-text', 'the edited text is empty or whitespace-only')
    const recordedPrompt = /-prompt-sha256-([a-f0-9]{64})$/.exec(carrierId)
    if (recordedPrompt !== null && recordedPrompt[1] !== editPromptDigest(resendText)) return undefined
  } else {
    // The carrier's range start is the round's prompt — the same fact §4.3
    // resolves a regenerate from, read from this same covering log.
    resendText = promptText(eventAtSeq(log, replacement.start))
    if (resendText === undefined) {
      return refuse('no-text', `the rewind at seq ${replacement.seq} was resolved from a prompt with no text block`)
    }
  }

  return {
    ok: true,
    value: {
      kind: 'resend-only',
      op,
      targetSeq,
      carrierSeq: replacement.seq,
      resendMessageId: resendIdFor(carrierId),
      shadowedSeqs: [...replacement.shadowedSeqs],
      resendText,
    },
  }
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
 * @returns `{ ok: true, value: plan }` with `kind: 'rewind'` and
 *   `{ op, targetSeq, rangeStartSeq, endSeq, shadowedSeqs, resendText }` — the
 *   pair to write — or `kind: 'resend-only'` and
 *   `{ op, targetSeq, carrierSeq, resendMessageId, shadowedSeqs, resendText }`,
 *   the already-landed rewind whose prompt is still owed (spec §9.4), or
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

  // Type validation also precedes the owed-prompt exception: a user or carrier
  // must never masquerade as a regenerate retry inside the shadowed range.
  if (op === 'regenerate' && (target.type !== 'assistant/message' || !isAppendSurfaceEvent(target))) {
    return refuse('not-assistant-message', `seq ${targetSeq} is not an append assistant reply`)
  }

  // §4.3 step 2: decided from the LOG — a carrier's replacement range covering
  // the target is the positive fact, and being off the (now agreed) surface is
  // the same fact seen from the other side. A log-only seq, e.g. a tool/call
  // anchor, lands here too: it never joined the surface and never will.
  //
  // This verdict does not depend on the read being foldable: the live surface is
  // the session's own view and knows nothing about what this read dropped, so a
  // read that cannot be folded can never make a rewound target look alive.
  if (coveredByCarrier || !liveNodes.includes(targetSeq)) {
    // …unless the carrier that covers it is OUR OWN and its prompt never
    // reached the agent: that is §9.4's recoverable failure, not read-only
    // history, and the re-send is the whole of what the user is owed.
    if (coveredByCarrier) {
      const owed = resendOnlyPlan(log, fold, request)
      if (owed !== undefined) return owed
    }
    return refuse('target-shadowed', coveredByCarrier ? `a carrier's range covers seq ${targetSeq}` : `seq ${targetSeq} is off the active surface`)
  }

  // §4.3 step 4: only an edit acts on a user message.
  if (op === 'edit' && !isUserMessage(target)) {
    return refuse('not-user-message', `seq ${targetSeq} is a ${String(target.type)}, not a user message`)
  }

  // The saved Profile rule decides the allowed range; the caller cannot override it.
  if (op === 'regenerate') {
    const refusal = regenerateTargetRefusal(log, liveNodes, targetSeq, restrictRegenerate(ctx))
    if (refusal) return refusal
  }
  if (op === 'edit') {
    const refusal = editTargetRefusal(log, liveNodes, targetSeq, restrictEdit(ctx))
    if (refusal) return refusal
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
      kind: 'rewind',
      op,
      targetSeq,
      rangeStartSeq,
      endSeq: liveNodes[liveNodes.length - 1],
      shadowedSeqs: liveNodes.slice(startIndex),
      resendText,
    },
  }
}
