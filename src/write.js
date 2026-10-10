/**
 * The write: the audit claim and its carrier, validated as a PAIR before the
 * first append, appended adjacently, and flushed exactly once (spec §5).
 *
 * The two segments are not decoration and they are not independent (spec §2.3):
 *
 *  1. `compaction/prune` — the **audit claim**. Log-only, not a surface node. It
 *     states the range and the shadowed-token price, and it **arms** the host's
 *     shadow-price fold.
 *  2. `user/message` carrying `surfaceOp` + `sourceEventSeqs` — the **carrier**.
 *     It consumes that claim, splices the range out of the surface, becomes the
 *     new surface tail, and renders nothing.
 *
 * The host's fold subtracts a replacement's token delta from an **adjacent**
 * claim for the **same** range. A matching claim subtracts the range correctly;
 * no claim at all folds exactly zero and `surfaceTokens` silently overestimates;
 * an orphan claim for a *different* range makes the host fold THROW. Those three
 * facts are why this module validates the whole pair before writing anything
 * (spec §5.2, §16.3) and why it re-checks the pair it actually minted.
 *
 * Four rules shape the code, each with a defect behind it:
 *
 *  - **Validate the pair before the first append.** The log cannot be rolled
 *    back, so a rejection discovered after the audit landed leaves an orphan
 *    claim — the reference implementation shipped exactly that defect onto real
 *    machines (spec §5.2).
 *  - **Never invent a `seq`.** The append boundary treats a present `seq` on a
 *    candidate as authoritative and mints its own only when it is absent
 *    (§5.1); the envelopes built here carry no `seq` anywhere, and the two the
 *    append mints are read back and checked.
 *  - **The price is the official one, or there is no write.** See
 *    `./token-price.js`; a node count or a skipped claim corrupts a number the
 *    user cannot see (§5.3).
 *  - **An output fault flushes first** (§13.1 #9): when the carrier append fails
 *    or the minted pair is not the pair that was validated, what was written is
 *    flushed exactly once before the failure is reported, and the orphan is made
 *    diagnosable in the host log (§11). The plugin never reports failure *about*
 *    a rewind it did not undo, and it never reports success over one it did not
 *    land.
 */
import { foldSurface } from '@deepseek-ai/dsh-session'
import { currentSessionMessageProjections } from '@deepseek-ai/dsh-session-format-catalog/message-projections'
import { refuse } from './error-codes.js'
import { describeError, hostService, logWarning } from './host.js'
import { coveringRefusalCode, eventAtSeq, readCoveringLog } from './log-read.js'
import { MARKER_PREFIX, hasMarkerPrefix } from './marker.js'
import { OP_KEY, REPLACE_OP, runtimeShapeBinding } from './shape-probe.js'
import { shadowPriceSource, shadowedTokenCount } from './token-price.js'
import { editTargetRefusal, regenerateTargetRefusal, restrictEdit, restrictRegenerate } from './resolve.js'

/** The audit claim's event type (spec §5.3). */
const AUDIT_TYPE = 'compaction/prune'

/** The carrier's event type (spec §5.4). `assistant/message` cannot cite sources. */
const CARRIER_TYPE = 'user/message'

/**
 * The carrier's `source.kind` (spec §5.4, §16.7): the first-party kind for "a
 * Cordis host plugin injected this user message".
 *
 * It must NOT be `user` (or `user-rpc`, whose value is also `user`): those mean
 * "a real human turn" and would make an invisible carrier split a conversation
 * round. Measured live — a carrier written with this kind kept the round count
 * unchanged — so this is settled, not a candidate.
 */
const CARRIER_SOURCE_KIND = 'cordis-host-runner'

/**
 * The audit claim's exact key set (spec §5.3) — extra keys are a violation.
 */
const AUDIT_KEYS = ['shadowedRange', 'shadowedSeqs', 'shadowedTokenCount']

/**
 * The audit's range spelling: `{ start, end }`.
 *
 * Deliberately NOT the carrier's `startSeq`/`endSeq`: both spellings are current
 * on v4 and they appear side by side in the shipped first-party pruner (spec
 * §2.2). Each field is written in its own naming.
 */
const SHADOWED_RANGE_KEYS = ['start', 'end']

/** The carrier's exact key set (spec §5.4) — a fifth member is refused. */
const CARRIER_KEYS = ['role', 'id', 'content', 'source']

/**
 * Throw unless an object's key set is exactly the expected one.
 *
 * Both closed shapes in this module are closed *exactly*: the host refuses a
 * fifth carrier member, and an extra audit key corrupts the claim's contract.
 * The message names the whole key set rather than the first difference, because
 * the offending field is what the operator needs (spec §11).
 * @param actual - the keys found.
 * @param expected - the keys required.
 * @param what - the field's name, for the message.
 * @throws an `Error` naming `what` and both key sets.
 */
function assertKeySet(actual, expected, what) {
  const missing = expected.filter((key) => !actual.includes(key))
  const extra = actual.filter((key) => !expected.includes(key))
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `${what} must carry exactly [${expected.join(', ')}]; found [${actual.join(', ')}]` +
        `${missing.length === 0 ? '' : ` (missing ${missing.join(', ')})`}${extra.length === 0 ? '' : ` (unexpected ${extra.join(', ')})`} (spec §5.3–§5.4)`,
    )
  }
}

/**
 * Build the two envelopes this write will hand to the append boundary.
 *
 * Neither carries a `seq`: the append boundary mints both, and a candidate that
 * carried one would be treated as authoritative (spec §5.1). The planned seqs
 * exist only for the pre-write replay validation, in
 * {@link plannedEvents}.
 * @param options - `{ plan, auditSeq, carrierId, traceText, shadowedTokenCount,
 *   binding }`; `plan` is a resolved plan (`rangeStartSeq`, `endSeq`,
 *   `shadowedSeqs`) and `auditSeq` is the seq the audit claim will take.
 * @returns `{ audit: { type, data }, carrier: { type, data, options } }`.
 */
export function planRewindPair({ plan, auditSeq, carrierId, traceText, shadowedTokenCount: claim, binding = runtimeShapeBinding() }) {
  return {
    audit: {
      type: AUDIT_TYPE,
      data: {
        shadowedRange: { start: plan.rangeStartSeq, end: plan.endSeq },
        shadowedSeqs: [...plan.shadowedSeqs],
        shadowedTokenCount: claim,
      },
    },
    carrier: {
      type: CARRIER_TYPE,
      data: {
        role: 'user',
        id: carrierId,
        content: [{ type: 'text', text: traceText }],
        source: { kind: CARRIER_SOURCE_KIND },
      },
      options: {
        surfaceOp: binding.replaceOp(plan.rangeStartSeq, plan.endSeq),
        sourceEventSeqs: [auditSeq, ...plan.shadowedSeqs],
      },
    },
  }
}

/**
 * Check every closed shape and every citation rule of the planned pair, naming
 * the offending field (spec §5.3, §5.4, §11).
 *
 * This is this plugin's own contract, not the host's: the replay validation in
 * {@link validatePlannedPair} is the authority on range membership and surface
 * legality, while this names a *field* the operator can act on. Both run before
 * the first append.
 *
 * The claim and the carrier are checked AGAINST EACH OTHER, not only each
 * against the plan they were built from: §5.3's rule is that the claim's
 * `shadowedRange` is *exactly the carrier's range*, and two comparisons that
 * both read the plan could not fail — the pattern §5.3 forbids for the price.
 *
 * Exported because the forward-reference clause is only reachable with a plan
 * this plugin would never produce: the suite hands it a candidate that cites the
 * carrier's own seq, so the rule is checked rather than assumed (spec §13.1 #3).
 * That makes this export a TEST SEAM on the write module's public surface — the
 * alternative is a rule nothing can exercise, which is how a check quietly
 * becomes a comment. It is called from {@link writeRewindPair} and nowhere else.
 * @param pair - the pair from {@link planRewindPair}.
 * @param context - `{ plan, auditSeq, carrierSeq, binding }`.
 * @throws an `Error` naming the field that violates the contract.
 */
export function assertPairContract(pair, { plan, auditSeq, carrierSeq, binding = runtimeShapeBinding() }) {
  const { data: audit, options: auditOptions } = pair.audit
  const { data: carrier, options } = pair.carrier

  assertKeySet(Object.keys(audit), AUDIT_KEYS, 'the audit claim’s data')
  assertKeySet(Object.keys(audit.shadowedRange), SHADOWED_RANGE_KEYS, 'the audit claim’s shadowedRange')
  if (auditOptions !== undefined) {
    throw new Error('the audit claim must not carry surfaceOp or sourceEventSeqs: it is not a surface node (spec §5.3)')
  }

  assertKeySet(Object.keys(carrier), CARRIER_KEYS, 'the carrier’s data')
  if (carrier.role !== 'user') throw new Error(`the carrier’s role must be "user", got ${JSON.stringify(carrier.role)} (spec §5.4)`)
  if (!hasMarkerPrefix(carrier.id)) {
    throw new Error(`the carrier’s id must carry the ${MARKER_PREFIX} prefix, got ${JSON.stringify(carrier.id)} (spec §5.4)`)
  }
  if (!Array.isArray(carrier.content) || carrier.content.length === 0) {
    throw new Error('the carrier’s content must be a non-empty array of text blocks: empty content projects an empty user message (spec §5.4)')
  }
  for (const block of carrier.content) {
    if (block?.type !== 'text' || typeof block.text !== 'string' || block.text === '') {
      throw new Error(`the carrier’s content must hold text blocks only, got ${JSON.stringify(block)} (spec §5.4)`)
    }
  }
  assertKeySet(Object.keys(carrier.source ?? {}), ['kind'], 'the carrier’s source')
  if (carrier.source.kind !== CARRIER_SOURCE_KIND) {
    throw new Error(`the carrier’s source.kind must be ${JSON.stringify(CARRIER_SOURCE_KIND)}, got ${JSON.stringify(carrier.source.kind)} (spec §5.4)`)
  }

  if (options?.surfaceOp === undefined) throw new Error('the carrier must carry a replace surfaceOp (spec §5.4)')
  const surfaceOp = options.surfaceOp
  assertKeySet(Object.keys(surfaceOp), [OP_KEY, binding.keys.start, binding.keys.end], 'the carrier’s surfaceOp')
  if (surfaceOp[OP_KEY] !== REPLACE_OP) {
    throw new Error(`the carrier’s surfaceOp ${OP_KEY} must be ${JSON.stringify(REPLACE_OP)}, got ${JSON.stringify(surfaceOp[OP_KEY])} (spec §5.4)`)
  }
  for (const name of [binding.keys.start, binding.keys.end]) {
    const endpoint = surfaceOp[name]
    if (!Number.isSafeInteger(endpoint) || endpoint < 0) {
      throw new Error(`the carrier’s surfaceOp ${name} must be a non-negative safe integer, got ${String(endpoint)} (spec §5.4)`)
    }
  }
  const rangeStart = surfaceOp[binding.keys.start]
  const rangeEnd = surfaceOp[binding.keys.end]
  if (audit.shadowedRange.start !== rangeStart || audit.shadowedRange.end !== rangeEnd) {
    throw new Error(
      `the audit claim’s shadowedRange ${audit.shadowedRange.start}..${audit.shadowedRange.end} must be exactly the carrier’s range ${rangeStart}..${rangeEnd} (spec §5.3)`,
    )
  }
  if (rangeStart !== plan.rangeStartSeq || rangeEnd !== plan.endSeq) {
    throw new Error(`the carrier’s surfaceOp range ${rangeStart}..${rangeEnd} must be exactly the resolved range ${plan.rangeStartSeq}..${plan.endSeq} (spec §5.3)`)
  }

  const citedSeqs = audit.shadowedSeqs
  if (!Array.isArray(citedSeqs) || citedSeqs.length === 0) throw new Error('the audit claim’s shadowedSeqs must be a non-empty array (spec §5.3)')
  if (new Set(citedSeqs).size !== citedSeqs.length) throw new Error('the audit claim’s shadowedSeqs must not contain duplicates (spec §5.3)')
  if (citedSeqs[0] !== rangeStart || citedSeqs.at(-1) !== rangeEnd) {
    throw new Error(`the audit claim’s shadowedSeqs must begin at ${rangeStart} and end at ${rangeEnd} (spec §5.3)`)
  }
  if (!Number.isSafeInteger(audit.shadowedTokenCount) || audit.shadowedTokenCount < 0) {
    throw new Error(`the audit claim’s shadowedTokenCount must be a non-negative integer, got ${String(audit.shadowedTokenCount)} (spec §5.3)`)
  }

  const sources = options.sourceEventSeqs
  if (!Array.isArray(sources) || sources.length === 0) throw new Error('the carrier’s sourceEventSeqs must be a non-empty array (spec §5.4)')
  if (sources[0] !== auditSeq) throw new Error(`the carrier’s sourceEventSeqs must begin at the audit claim (seq ${auditSeq}), got ${String(sources[0])} (spec §5.4)`)
  if (new Set(sources).size !== sources.length) throw new Error('the carrier’s sourceEventSeqs must not contain duplicates (spec §5.4)')
  const forward = sources.find((seq) => !Number.isSafeInteger(seq) || seq >= carrierSeq)
  if (forward !== undefined) {
    throw new Error(`the carrier’s sourceEventSeqs must reference earlier events only; ${String(forward)} is not strictly less than ${carrierSeq} (spec §5.4)`)
  }
  const rangePortion = sources.slice(1)
  if (rangePortion.length !== plan.shadowedSeqs.length || rangePortion.some((seq, index) => seq !== plan.shadowedSeqs[index])) {
    throw new Error(`the carrier’s sourceEventSeqs must cite the range exactly, in surface order: [${plan.shadowedSeqs.join(', ')}], got [${rangePortion.join(', ')}] (spec §5.4)`)
  }
}

/**
 * The planned pair as the replay validator needs to see it: a complete event
 * envelope per event, at the seq the append will mint.
 *
 * These objects are never appended — they exist so `foldSurface` can replay the
 * log *including* this write without mutating anything (spec §16.3).
 * @param pair - the pair from {@link planRewindPair}.
 * @param seqs - `{ auditSeq, carrierSeq }`.
 * @returns the two candidate events, in log order.
 */
export function plannedEvents(pair, { auditSeq, carrierSeq }) {
  const time = Date.now()
  return [
    { type: pair.audit.type, seq: auditSeq, time, data: pair.audit.data },
    { type: pair.carrier.type, seq: carrierSeq, time, data: pair.carrier.data, ...pair.carrier.options },
  ]
}

/**
 * Replay the log WITH the planned pair, through the official fold (spec §5.2
 * step 1, §16.3).
 *
 * `foldSurface` is the host's own read-only authority: it checks range
 * membership, `sourceEventSeqs` completeness, the `surfaceOp` shape, seq
 * contiguity and the whole rest of the surface contract, and it fails when the
 * host's rules change — which a hand-written re-check cannot do. It does NOT
 * check the shadow-price arithmetic, which is why the price is computed and
 * validated separately (spec §5.3).
 *
 * The fold needs a log that covers the write: its events are indexed by their
 * own seq from 0, so a short or hole-y read is refused here rather than silently
 * validated against a different surface.
 * @param log - the covering log, dense from seq 0.
 * @param planned - the candidates from {@link plannedEvents}.
 * @throws whatever the fold throws, verbatim: its message names the rule.
 */
export function validatePlannedPair(log, planned) {
  foldSurface([...log, ...planned], currentSessionMessageProjections)
}

/**
 * The log to validate against, and the live tail the append will land on.
 *
 * The tail is read from the SESSION, never from a read: a read describes what
 * exists, the tail describes where the append lands (spec §4.2), and only the
 * session knows the latter. The covering read is taken here — rather than reused
 * from resolution — because the pair has to be validated against the log it will
 * actually land on, and a read taken before another writer touched the session
 * is a read of a different log. A read that does not cover the live tail is
 * `message-pending`: the read and the session disagree, which is retryable, and
 * never licence to validate against a shorter log than the write will land on.
 *
 * The read's REACH is what `readCoveringLog` reports (`lastCoveredSeq`, the
 * largest seq it holds) — its event count is only a second witness, because this
 * plugin does not trust an event list to be dense (the one shape that survives
 * both is a same-length list with a hole and a duplicate, and the replay
 * validation below refuses that one). Neither fact is taken from the array's own
 * indexing.
 * @param ctx - the host context.
 * @param sessionId - the session being written to.
 * @param session - the live session.
 * @returns `{ status: 'ok', log, prevTail }` or `{ status: 'refused', refusal }`.
 */
async function coveringLogForWrite(ctx, sessionId, session) {
  const covering = await readCoveringLog(ctx, sessionId)
  if (covering.status === 'refused') {
    return { status: 'refused', refusal: refuse(coveringRefusalCode(covering.reason), covering.detail) }
  }

  const prevTail = session.seq
  const lastSeq = prevTail - 1
  if (covering.lastCoveredSeq !== lastSeq || covering.log.length !== prevTail) {
    return {
      status: 'refused',
      refusal: refuse(
        'message-pending',
        `the covering read of ${JSON.stringify(sessionId)} reaches ${String(covering.lastCoveredSeq)} over ${covering.log.length} events, ` +
          `while the live session is at seq ${prevTail} (the read must cover ${lastSeq} to validate this write)`,
      ),
    }
  }

  return { status: 'ok', log: covering.log, prevTail }
}

/**
 * Check that the pair the append MINTED is the pair that was validated.
 *
 * This is the exit assertion of §13.1 #9, and it exists because a host writer
 * can append between this write's plan and its appends: the audit would then no
 * longer be adjacent to the carrier, the claim would never be consumed, and the
 * replaced range's tokens would stay in `surfaceTokens` forever. The window is
 * small and the damage is silent, which is exactly when a check pays for
 * itself. It runs AFTER the flush, so the failure it reports is never a report
 * over a surface this plugin has not already made durable.
 * @param written - `{ audit, carrier }`, the events the append returned.
 * @param planned - `{ auditSeq, carrierSeq, binding }`.
 * @returns a diagnostic naming the mismatch, or `undefined` when the pair is
 *   the one that was validated.
 */
function verifyWrittenPair({ audit, carrier }, { auditSeq, carrierSeq, binding = runtimeShapeBinding() }) {
  if (audit?.seq !== auditSeq) {
    return `the audit claim landed at seq ${String(audit?.seq)}, not the validated ${auditSeq}: another writer appended between the plan and the write`
  }
  if (carrier?.seq !== carrierSeq) {
    return `the carrier landed at seq ${String(carrier?.seq)}, not the validated ${carrierSeq}: the shadow-price claim at seq ${auditSeq} is no longer adjacent to it`
  }
  if (!Array.isArray(carrier.sourceEventSeqs) || carrier.sourceEventSeqs[0] !== audit.seq) {
    return `the carrier at seq ${carrier.seq} does not cite the audit claim at seq ${audit.seq} as its first source`
  }
  const op = carrier.surfaceOp
  if (op === undefined || Object.keys(op).length !== 3 || op[OP_KEY] !== REPLACE_OP || !Object.hasOwn(op, binding.keys.start) || !Object.hasOwn(op, binding.keys.end)) {
    return `the carrier at seq ${carrier.seq} carries a surfaceOp outside the validated shape (${binding.keys.start}/${binding.keys.end})`
  }
  return undefined
}

/**
 * Write one rewind: the audit claim and its carrier, or nothing at all.
 * @param ctx - the host context.
 * @param options - `{ sessions, session, sessionId, plan, carrierId, traceText }`
 *   and an optional `binding`. `plan` is a resolved plan
 *   (`rangeStartSeq`, `endSeq`, `shadowedSeqs`).
 * @returns `{ ok: true, value: { auditSeq, carrierSeq, shadowedSeqs } }`, or a
 *   refusal — `{ ok: false, error: { code, detail? } }` — with nothing written
 *   unless the detail says otherwise.
 */
export async function writeRewindPair(ctx, { sessions, session, sessionId, plan, carrierId, traceText, request, binding = runtimeShapeBinding() }) {
  // §5.3 — the official price, or no write at all. A missing meter is `internal`
  // and never a node count, which is the documented overestimation bug.
  const price = shadowPriceSource(ctx)
  if (price.meter === undefined) return refuse('internal', price.detail)

  const covering = await coveringLogForWrite(ctx, sessionId, session)
  if (covering.status === 'refused') return covering.refusal

  const { prevTail } = covering
  if (plan.tail !== undefined && plan.tail !== prevTail) return refuse('message-pending', 'the conversation changed after the rollback preview')
  if (plan.tail !== undefined && hostService(ctx, 'agents')?.get(sessionId)?.status !== 'idle') return refuse('agent-busy', 'the agent started after the rollback preview')
  const auditSeq = prevTail
  const carrierSeq = prevTail + 1

  // The shadowed nodes, by EXACT seq from the covering read: a miss is a miss
  // (spec §4.2). The coverage check above means a miss here is the read and the
  // session disagreeing about the surface — retryable, and never a price
  // computed over a neighbouring event.
  const nodes = []
  for (const seq of plan.shadowedSeqs) {
    const event = eventAtSeq(covering.log, seq)
    if (event === undefined) {
      return refuse('message-pending', `the covering read of ${JSON.stringify(sessionId)} does not hold shadowed surface node ${seq}`)
    }
    nodes.push(event)
  }

  let claim
  try {
    claim = shadowedTokenCount(price.meter, nodes)
  } catch (error) {
    return refuse('internal', `the official shadow price of the range could not be computed: ${describeError(error)}`)
  }

  const pair = planRewindPair({ plan, auditSeq, carrierId, traceText, shadowedTokenCount: claim, binding })
  try {
    assertPairContract(pair, { plan, auditSeq, carrierSeq, binding })
    validatePlannedPair(covering.log, plannedEvents(pair, { auditSeq, carrierSeq }))
  } catch (error) {
    // §11's first row: zero writes, the offending field named, and never a retry
    // with a different shape. The log's own replay message names the rule, so it
    // is passed through rather than wrapped into something vaguer.
    return refuse('internal', `the planned rewind pair was refused before any write: ${describeError(error)}`)
  }

  // §5.2 steps 2–4: the two appends are adjacent, and there is no `await`
  // between them or before the flush.
  if (request?.op === 'regenerate' || request?.op === 'edit') {
    const nodes = session.surface.nodes
    const refusal = request.op === 'edit'
      ? editTargetRefusal(covering.log, nodes, request.targetSeq, restrictEdit(ctx))
      : regenerateTargetRefusal(covering.log, nodes, request.targetSeq, restrictRegenerate(ctx))
    if (refusal) return refusal
    const range = nodes.slice(nodes.indexOf(plan.rangeStartSeq))
    if (session.seq !== prevTail || range.length !== plan.shadowedSeqs.length || range.some((seq, index) => seq !== plan.shadowedSeqs[index])) {
      return refuse('message-pending', 'the effective conversation changed before the rewind write')
    }
    if (hostService(ctx, 'agents')?.get(sessionId)?.status !== 'idle') return refuse('agent-busy', 'the agent started before the rewind write')
  }
  let audit
  try {
    audit = session.append(AUDIT_TYPE, pair.audit.data)
  } catch (error) {
    return refuse('internal', `the audit claim was refused and nothing was written: ${describeError(error)}`)
  }

  let carrier
  try {
    carrier = session.append(CARRIER_TYPE, pair.carrier.data, pair.carrier.options)
  } catch (error) {
    // The audit landed and the log cannot be rolled back (§5.2). Flush what was
    // written exactly once, make the orphan diagnosable, and report the failure:
    // an orphan claim for a range that later gets a different replace makes the
    // host fold throw (§2.3), so it must be findable.
    await sessions.flush(session)
    logWarning(
      ctx,
      `the rewind of ${JSON.stringify(sessionId)} left an ORPHAN audit claim at seq ${audit.seq} ` +
        `(range ${plan.rangeStartSeq}..${plan.endSeq}) because the carrier was refused: ${describeError(error)} — ` +
        `flush completed for the events that did land; a later replace over a DIFFERENT range would make the host fold throw (spec §2.3)`,
    )
    return refuse('internal', `the carrier was refused after the audit claim landed at seq ${audit.seq}: ${describeError(error)}`)
  }

  // §5.2 step 4 — the one flush of a successful write. The exit assertion below
  // runs after it, so what it reports is already durable.
  await sessions.flush(session)

  const problem = verifyWrittenPair({ audit, carrier }, { auditSeq, carrierSeq, binding })
  if (problem !== undefined) {
    logWarning(ctx, `the rewind of ${JSON.stringify(sessionId)} landed but does not match the validated pair: ${problem}`)
    return refuse('internal', `the written pair does not match the validated pair: ${problem}`)
  }

  return { ok: true, value: { auditSeq: audit.seq, carrierSeq: carrier.seq, shadowedSeqs: [...plan.shadowedSeqs] } }
}
