/**
 * The rewind write: the audit claim and its carrier (spec §5, §11, §13.1
 * #1–#3, #5, #6, #7, #9–#11, #15, §13.2 #17–#18).
 *
 * This is the ticket where the plugin first writes into a session, so the file
 * is organized around what can go WRONG in a log that cannot be rolled back:
 *
 *  - a pair the contract refuses must be refused BEFORE the first append (an
 *    orphan claim is the defect the reference implementation shipped);
 *  - the seq is never invented — the append boundary mints both, and the pair
 *    that landed is checked against the pair that was validated;
 *  - the price is the OFFICIAL one, imported from the meter the host folds with,
 *    or there is no write at all;
 *  - an output fault flushes exactly once before it is reported, and a refusal
 *    flushes zero times;
 *  - two clicks on one session never overlap.
 *
 * The fixtures are the real `Session`, and every append is the host's own
 * contract (§13.2 #17), so nothing here passes on a stub that always accepts.
 */
import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Context, Service } from '@deepseek-ai/cordis'
import { Session, deriveEventMessage, foldSurface, isAppendSurfaceEvent, isReplacementSurfaceEvent } from '@deepseek-ai/dsh-session'
import { currentSessionMessageProjections } from '@deepseek-ai/dsh-session-format-catalog/message-projections'
import { estimateMessage } from '@deepseek-ai/dsh-token-meter/estimate'
import { resolveTarget } from '../lib/resolve.js'
import { runtimeEndpointKeys } from '../lib/shape-probe.js'
import { TYPERT } from '../lib/typert.host.js'
import { carrierIdFor } from '../lib/marker.js'
import { planRewindPair, plannedEvents, validatePlannedPair, writeRewindPair, assertPairContract } from '../lib/write.js'
import { dispatchToHost, hostComposition } from './helpers/gateway.mjs'
import { rootDir } from './helpers/dsh.mjs'
import {
  appendReply,
  appendUser,
  auditCount,
  captureLogs,
  FIRST_PROMPT,
  hostContext,
  hostState,
  logOf,
  measuredFixture,
  middleRewoundFixture,
  openingTurnAgent,
  rewoundFixture,
  SESSION_ID,
  sessionFixture,
  sessionView,
  withLegacyEventView,
  withRacingAppend,
  withRefusingAppend,
} from './helpers/host.mjs'

/** The trace text these cases write. Honest, and not the shipped sentence. */
const TRACE_TEXT = '(a test wrote this carrier)'

/**
 * A carrier id for a case that hands one to the write directly.
 *
 * The uuid is spelled here rather than generated, so a failing case names the
 * same id twice; the counter only keeps two callers inside one session from
 * colliding, and it is NOT a seq (a seq is the log's index).
 */
let carrierCounter = 0
const markerId = (op) => carrierIdFor(op, `write-pair-${(carrierCounter += 1)}`)

/**
 * The two shipped trace texts, restated from spec §5.4 ON PURPOSE: the suite's
 * expectation must not move when the source does.
 */
const SPEC_TRACE_TEXT = {
  en: '(this message was replaced by an edit; the original is archived in the session log)',
  zh: '（此处内容已被撤回：原消息已归档，可在恢复视图中查看）',
}

/**
 * The official single-node price (spec §5.3), composed here from the OFFICIAL
 * estimator — imported, never skipped (§13.2 #18) — and the host's own
 * `deriveEventMessage`.
 *
 * The composition is restated rather than imported from the shipped
 * `./token-price.js` on purpose: this is the expectation the write is measured
 * against, and an expectation produced by the code under test could not fail.
 * The ESTIMATOR is the part that must not be re-implemented, and it is not: a
 * missing `estimateMessage` makes this file throw at import.
 * @param event - one shadowed node.
 * @returns its price, or zero when the event derives to no message.
 */
function officialNodePrice(event) {
  const message = deriveEventMessage(event)
  return message === null ? 0 : estimateMessage(message)
}

/** The official shadow price of a range: the sum over its nodes. */
function officialShadowPrice(events) {
  return events.reduce((total, event) => total + officialNodePrice(event), 0)
}

/** The `contextPressure` state — the projection that CONSUMES the claim (§13.1 #4). */
function pressureState(host, session) {
  return host.ctx.sessionProjections.stateOf(session, 'contextPressure')
}

/** Whether a value carries a `seq` property anywhere, at any depth. */
function carriesSeqKey(value) {
  if (Array.isArray(value)) return value.some(carriesSeqKey)
  if (value === null || typeof value !== 'object') return false
  return Object.entries(value).some(([key, nested]) => key === 'seq' || carriesSeqKey(nested))
}

/**
 * A live session that records what the write hands the append boundary.
 *
 * The real `Session` still performs every append, so the recorded envelope is
 * the one the host's own contract accepted — which is what makes "no `seq` was
 * handed over" a statement about the write and not about the double.
 * @param session - the real fixture session.
 * @returns a session-shaped view with the append calls it saw.
 */
function recordingSession(session) {
  const calls = []
  return Object.assign(
    sessionView(session, {
      append: (real, call) => {
        calls.push(call)
        return real.append(call.type, call.data, call.options)
      },
    }),
    { calls },
  )
}

/**
 * Drive the SHIPPED write against a fixture session, with the plan the SHIPPED
 * resolver produced for the same request.
 *
 * Resolution runs first and must succeed unless a case deliberately tampers with
 * the plan, so every write below is fed exactly what `apply` feeds it.
 * @param session - the fixture session.
 * @param request - `{ targetSeq, op, text? }`.
 * @param options - `{ state, plan, traceText, afterResolve }`; `afterResolve`
 *   moves the host between the resolution and the write, for the cases that are
 *   about the write's OWN read.
 * @returns `{ host, logs, result, plan, session, resolution }`.
 */
async function writeOn(session, request, { state = {}, plan: override, traceText = TRACE_TEXT, afterResolve } = {}) {
  const host = await hostContext(hostState({ session, ...state }))
  const logs = captureLogs(host.ctx)
  const resolution = await resolveTarget(host.ctx, { sessionId: SESSION_ID, ...request }, session.surface.nodes)
  expect(resolution.ok, `the plan must resolve: ${JSON.stringify(resolution)}`).toBe(true)
  afterResolve?.(host)
  const plan = override ?? resolution.value
  const result = await writeRewindPair(host.ctx, {
    sessions: host.ctx.get('sessions'),
    session,
    sessionId: SESSION_ID,
    plan,
    carrierId: markerId(plan.op),
    traceText,
  })
  return { host, logs, result, plan, session, resolution }
}

/** Dispatch one `resend.apply` through the real Gateway. */
async function applyThroughGateway(state = {}, fixture, request, config) {
  const session = fixture ?? sessionFixture()
  const host = await hostComposition({ host: hostState({ session, ...state }), config })
  const wire = await dispatchToHost(host, 'resend/apply', { request: { sessionId: SESSION_ID, ...request } })
  expect(wire.ok, `the boundary refused the call: ${JSON.stringify(wire.error)}`).toBe(true)
  return { envelope: wire.value, host, session }
}

/** The rewind pair a log ends with. */
function pairAtEnd(session) {
  const log = logOf(session)
  return { log, audit: log.at(-2), carrier: log.at(-1) }
}

/** How many events the session's log holds — the length §13.1 #9 is about. */
const logLength = (session) => logOf(session).length

describe('the pair is validated before the first append, and no seq is ever invented (§5.1, §5.2, §13.1 #1, #2)', () => {
  it('the append boundary mints both seqs, and the envelopes carry no seq at all', async () => {
    const recorder = recordingSession(sessionFixture())
    const before = recorder.seq
    const { result, plan } = await writeOn(recorder, { targetSeq: 2, op: 'edit', text: 'edited' })

    expect(result.ok).toBe(true)
    expect(recorder.calls.map((call) => call.type)).toEqual(['compaction/prune', 'user/message'])
    for (const call of recorder.calls) {
      expect(carriesSeqKey(call.data), `${call.type} data carries a seq`).toBe(false)
      expect(carriesSeqKey(call.options ?? {}), `${call.type} options carry a seq`).toBe(false)
    }
    // And the seqs the boundary DID mint are the ones the plan predicted.
    expect(result.value.auditSeq).toBe(before)
    expect(result.value.carrierSeq).toBe(before + 1)
    expect(plan.shadowedSeqs).toEqual([2, 3])
  })

  it('a candidate built with a fabricated seq is refused, and the refusal names the problem', () => {
    const session = sessionFixture()
    const plan = { op: 'edit', targetSeq: 2, rangeStartSeq: 2, endSeq: 3, shadowedSeqs: [2, 3], resendText: 'edited' }
    const pair = planRewindPair({ plan, auditSeq: 4, carrierId: markerId('edit'), traceText: TRACE_TEXT, shadowedTokenCount: 0 })
    const events = plannedEvents(pair, { auditSeq: 4, carrierSeq: 5 })

    expect(() => validatePlannedPair(logOf(session), events)).not.toThrow()

    // The replay CANDIDATES carry a seq (the fold indexes by it) — and the two
    // envelopes the write hands the append boundary must not, which is what the
    // recording session in the case above observes on the real appends. Here the
    // pair's own shape is what is checked: neither envelope's data nor its
    // options may bring a seq, per envelope, because spreading both into one
    // object would let the carrier's `data` hide whatever the audit's held.
    for (const event of events) expect(event).toHaveProperty('seq')
    for (const envelope of [pair.audit, pair.carrier]) {
      expect(carriesSeqKey(envelope.data), `${envelope.type} data carries a seq`).toBe(false)
      expect(carriesSeqKey(envelope.options ?? {}), `${envelope.type} options carry a seq`).toBe(false)
    }

    // The reference implementation's `seq: 0` incident: a candidate that carries
    // its own seq contradicts the log it is replayed against (§5.1). The refusal
    // has to NAME the problem — contiguity, the seq it expected, and the one it
    // saw — because a refusal that only says "invalid" is not diagnosable (§11).
    expect(() => validatePlannedPair(logOf(session), [{ ...events[0], seq: 0 }, events[1]])).toThrow(/not contiguous; expected 4/)
    expect(() => validatePlannedPair(logOf(session), [{ ...events[0], seq: 0 }, events[1]])).toThrow(/seq 0/)
  })

  it('refuses a range whose citation omits a shadowed node BEFORE any append (§11, §13.1 #2)', async () => {
    const { session } = middleRewoundFixture()
    const before = { seq: session.seq, audits: auditCount(session) }
    // Three surface nodes in the range [7, 4, 5]; the plan cites only its ends,
    // which passes this plugin's own contract and is refused by the host's fold —
    // exactly the omission that makes a session unloadable (§5.4).
    const { result, host } = await writeOn(session, { targetSeq: 4, op: 'edit', text: 'edited again' }, {
      plan: { op: 'edit', targetSeq: 7, rangeStartSeq: 7, endSeq: 5, shadowedSeqs: [7, 5], resendText: 'edited again' },
    })

    expect(result.ok).toBe(false)
    expect(result.error.code).toBe('internal')
    expect(result.error.detail).toMatch(/must include every shadowed surface node; missing 4/)
    expect(session.seq).toBe(before.seq)
    expect(auditCount(session)).toBe(before.audits)
    expect(host.state.calls.flushes).toBe(0)
  })

  it('refuses a surfaceOp the running host rejects before the audit is written (§5.4, §16.8)', async () => {
    const session = sessionFixture()
    const before = { seq: session.seq, audits: auditCount(session) }
    // The probe is NOT what stands between this plugin and a wrong spelling: a
    // binding that spells the pre-v3 keys would agree with itself on a runtime
    // whose table said so. The host's own replay validation is the load-bearing
    // guard — it runs before the first append, and it names the field (§2.2).
    const legacyBinding = {
      formatVersion: 2,
      keys: { start: 'start', end: 'end' },
      replaceOp: (start, end) => ({ op: 'replace', start, end }),
    }
    const host = await hostContext(hostState({ session }))
    const logs = captureLogs(host.ctx)
    const result = await writeRewindPair(host.ctx, {
      sessions: host.ctx.get('sessions'),
      session,
      sessionId: SESSION_ID,
      plan: { op: 'edit', targetSeq: 2, rangeStartSeq: 2, endSeq: 3, shadowedSeqs: [2, 3], resendText: 'edited' },
      carrierId: markerId('edit'),
      traceText: TRACE_TEXT,
      binding: legacyBinding,
    })

    expect(result.ok).toBe(false)
    expect(result.error.code).toBe('internal')
    expect(result.error.detail).toMatch(/invalid replace surfaceOp/)
    expect(session.seq).toBe(before.seq)
    expect(auditCount(session)).toBe(before.audits)
    expect(host.state.calls.flushes).toBe(0)
    expect(logs).toEqual([])
  })
})

describe('the closed shapes the host refuses to widen (§13.1 #5)', () => {
  it('writes the audit claim with exactly its three keys, and no surface metadata', async () => {
    const { session, result } = await writeOn(sessionFixture(), { targetSeq: 2, op: 'edit', text: 'edited' })
    const { audit } = pairAtEnd(session)

    expect(result.ok).toBe(true)
    expect(audit.type).toBe('compaction/prune')
    expect(Object.keys(audit.data)).toEqual(['shadowedRange', 'shadowedSeqs', 'shadowedTokenCount'])
    expect(Object.keys(audit.data.shadowedRange)).toEqual(['start', 'end'])
    expect(audit.data.shadowedSeqs).toEqual([2, 3])
    expect(Number.isSafeInteger(audit.data.shadowedTokenCount)).toBe(true)
    expect(audit.data.shadowedTokenCount).toBeGreaterThanOrEqual(0)
    // It is not a surface node: neither marker may appear on it (§5.3).
    expect(audit.surfaceOp).toBeUndefined()
    expect(audit.sourceEventSeqs).toBeUndefined()
    // And it is not a candidate envelope either: the seq the log carries is the
    // one the append BOUNDARY minted, never one the data brought with it (§5.1).
    expect(Object.hasOwn(audit.data, 'seq')).toBe(false)
  })

  it('writes the carrier with exactly its four keys, the plugin prefix, and the host-runner kind', async () => {
    const { session } = await writeOn(sessionFixture(), { targetSeq: 2, op: 'edit', text: 'edited' })
    const { carrier } = pairAtEnd(session)

    expect(carrier.type).toBe('user/message')
    expect(Object.keys(carrier.data)).toEqual(['role', 'id', 'content', 'source'])
    expect(carrier.data.role).toBe('user')
    expect(carrier.data.id).toMatch(/^dsh-resend-edit-/)
    expect(Array.isArray(carrier.data.content)).toBe(true)
    expect(carrier.data.content.length).toBeGreaterThan(0)
    for (const block of carrier.data.content) {
      expect(block.type).toBe('text')
      expect(typeof block.text).toBe('string')
    }
    expect(carrier.data.content[0].text).toBe(TRACE_TEXT)
    expect(Object.keys(carrier.data.source)).toEqual(['kind'])
    // A human-turn kind would make an invisible carrier split a round (§5.4, §16.7).
    expect(carrier.data.source.kind).toBe('cordis-host-runner')
    expect(['user', 'user-rpc']).not.toContain(carrier.data.source.kind)
    // The carrier's seq is the one the append boundary minted into the envelope:
    // the payload the write handed over carried no seq of its own (§5.1).
    expect(Object.hasOwn(carrier.data, 'seq')).toBe(false)
  })

  it('writes a surfaceOp with exactly the three keys this runtime accepts', async () => {
    const { session } = await writeOn(sessionFixture(), { targetSeq: 2, op: 'edit', text: 'edited' })
    const { carrier } = pairAtEnd(session)
    const keys = runtimeEndpointKeys()

    expect(Object.keys(carrier.surfaceOp)).toEqual(['op', keys.start, keys.end])
    expect(carrier.surfaceOp.op).toBe('replace')
    expect(carrier.surfaceOp[keys.start]).toBe(2)
    expect(carrier.surfaceOp[keys.end]).toBe(3)
  })
})

describe('adjacency and citation (§5.4, §13.1 #3)', () => {
  it('the carrier is adjacent to its claim, cites it first, and cites only earlier events', async () => {
    const { session, result } = await writeOn(sessionFixture(), { targetSeq: 2, op: 'edit', text: 'edited' })
    const { audit, carrier } = pairAtEnd(session)

    expect(audit.seq + 1).toBe(carrier.seq)
    expect(carrier.seq).toBe(result.value.carrierSeq)
    expect(carrier.sourceEventSeqs[0]).toBe(audit.seq)
    expect(new Set(carrier.sourceEventSeqs).size).toBe(carrier.sourceEventSeqs.length)
    for (const seq of carrier.sourceEventSeqs) expect(seq).toBeLessThan(carrier.seq)
    // The adjacency claim is about the PAIR, not about this one write: every
    // citation is strictly older than the carrier, which is the invariant a
    // forward reference (including the carrier's own seq) would break.
    for (const seq of carrier.sourceEventSeqs) expect(seq).toBeLessThanOrEqual(audit.seq)
    // The range portion is the range: same members, surface order, same ends.
    expect(carrier.sourceEventSeqs.slice(1)).toEqual([2, 3])
    expect(carrier.sourceEventSeqs[1]).toBe(carrier.surfaceOp[runtimeEndpointKeys().start])
    expect(carrier.sourceEventSeqs.at(-1)).toBe(carrier.surfaceOp[runtimeEndpointKeys().end])
    expect(audit.data.shadowedRange).toEqual({ start: 2, end: 3 })
    expect(audit.data.shadowedSeqs[0]).toBe(audit.data.shadowedRange.start)
    expect(audit.data.shadowedSeqs.at(-1)).toBe(audit.data.shadowedRange.end)
  })

  it('refuses a citation that is not strictly older than the carrier, and the host fold refuses it too (§13.1 #3)', () => {
    const session = sessionFixture()
    const plan = { op: 'edit', targetSeq: 2, rangeStartSeq: 2, endSeq: 3, shadowedSeqs: [2, 3], resendText: 'edited' }
    const pair = planRewindPair({ plan, auditSeq: 4, carrierId: markerId('edit'), traceText: TRACE_TEXT, shadowedTokenCount: 0 })

    // A plan this plugin never produces: the carrier cites its own seq, i.e. a
    // reference that is not strictly earlier than the event carrying it. Without
    // a LIVE check the clause is unreachable and could be deleted silently, so it
    // is driven here on purpose.
    const forward = { plan, auditSeq: 4, carrierSeq: 4 }
    expect(() => assertPairContract(pair, forward)).toThrow(/must reference earlier events only; 4 is not strictly less than 4/)

    // …and the host's own fold refuses the same candidate, which is what makes
    // the rule the host's rather than this plugin's invention.
    const events = plannedEvents(pair, { auditSeq: 4, carrierSeq: 5 })
    expect(() =>
      validatePlannedPair(logOf(session), [{ ...events[0] }, { ...events[1], sourceEventSeqs: [4, 2, 3, 99] }]),
    ).toThrow(/sourceEventSeqs must reference earlier events/)
  })
})

describe('a numerically descending range is accepted and written unchanged (§13.1 #6)', () => {
  it('the low-level writer accepts a descending replacement plan and reloads cold', async () => {
    const { session, carrierSeq } = middleRewoundFixture()
    expect(session.surface.nodes).toEqual([0, 1, carrierSeq, 4, 5])

    const { result } = await writeOn(session, { targetSeq: 4, op: 'edit', text: 'edited again' }, {
      plan: { op: 'edit', targetSeq: carrierSeq, rangeStartSeq: carrierSeq, endSeq: 5, shadowedSeqs: [carrierSeq, 4, 5], resendText: 'edited again' },
    })
    const { log, audit, carrier } = pairAtEnd(session)
    const keys = runtimeEndpointKeys()

    expect(result.ok).toBe(true)
    expect(carrier.surfaceOp[keys.start]).toBeGreaterThan(carrier.surfaceOp[keys.end])
    expect(carrier.surfaceOp[keys.start]).toBe(carrierSeq)
    // WRITTEN UNCHANGED: the claim states the same descending pair, so the range
    // that reached the log is the supplied low-level plan, not a normalized
    // or reordered copy.
    expect(audit.data.shadowedRange).toEqual({ start: carrierSeq, end: 5 })
    expect(carrier.sourceEventSeqs.slice(1)).toEqual([carrierSeq, 4, 5])
    // Spliced in place: the carrier takes the position of the range it shadows.
    expect(session.surface.nodes).toEqual([0, 1, carrier.seq])
    // And the written log replays to exactly that surface — the cold-load check.
    expect(foldSurface(log, currentSessionMessageProjections).nodes).toEqual(session.surface.nodes)
  })
})

describe('the shadow-price protocol (§5.3, §13.1 #4, §13.2 #18)', () => {
  it('imports the official estimator rather than re-implementing it', () => {
    // §13.2 #18: the estimator is imported, and its absence must make the suite
    // THROW — so this assertion is about the import above having resolved.
    expect(typeof estimateMessage).toBe('function')
    expect(officialNodePrice(sessionFixture().eventAt(0))).toBeGreaterThan(0)
  })

  it('states the official sum over the range, not a node count', async () => {
    const session = measuredFixture()
    const host = await hostContext(hostState({ session }))
    const { result } = await writeOn(session, { targetSeq: 6, op: 'edit', text: 'edited' })
    const { audit } = pairAtEnd(session)
    const range = [6, 9].map((seq) => session.eventAt(seq))

    expect(result.ok).toBe(true)
    expect(audit.data.shadowedTokenCount).toBe(officialShadowPrice(range))
    // The node count is the documented overestimation bug; these differ, which
    // is what makes the assertion above non-vacuous.
    expect(audit.data.shadowedTokenCount).not.toBe(audit.data.shadowedSeqs.length)
    // And the estimator the write reached through the meter SERVICE is the one
    // this expectation uses: the service method delegates to the imported module
    // export, so the two agree node by node. A service that priced by some other
    // rule would disagree here even while both totals looked plausible.
    const meter = host.ctx.get('tokenMeter')
    for (const event of range) {
      expect(meter.estimateMessage(deriveEventMessage(event))).toBe(officialNodePrice(event))
    }
  })

  it('leaves no surviving claim, and moves surfaceTokens by exactly the claim delta', async () => {
    const session = measuredFixture()
    const host = await hostContext(hostState({ session }))
    const before = pressureState(host, session)
    const resolution = await resolveTarget(host.ctx, { sessionId: SESSION_ID, targetSeq: 6, op: 'edit', text: 'edited' }, session.surface.nodes)
    expect(resolution.ok).toBe(true)
    const result = await writeRewindPair(host.ctx, {
      sessions: host.ctx.get('sessions'),
      session,
      sessionId: SESSION_ID,
      plan: resolution.value,
      carrierId: markerId('edit'),
      traceText: TRACE_TEXT,
    })
    const { audit, carrier } = pairAtEnd(session)
    const after = pressureState(host, session)
    const expectedDelta = officialNodePrice(carrier) - audit.data.shadowedTokenCount

    expect(result.ok).toBe(true)
    // The claim was CONSUMED, not merely written: after the pair no `claim` is
    // armed, which is only true if the carrier was the very next surface event
    // (spec §5.3).
    expect(after.claim).toBeUndefined()
    expect(after.surfaceTokens - before.surfaceTokens).toBe(expectedDelta)
    // The other mechanism over the same surface: the measurement planner prices
    // the surface directly through `priceSurface`, so it never consults a claim
    // and never enters `foldSurfaceProjection`. It is a cross-check, not a second
    // witness of the claim path (spec §16.3).
    expect(host.ctx.get('tokenMeter').measure(session).surfaceTokens).toBe(after.surfaceTokens)

    // Non-vacuity, in the shape of the documented defect: a claim that stated the
    // NODE COUNT instead of the official price, or a write that skipped the claim
    // entirely, both move the total to a different number — so the assertion
    // above is about the price the claim carries and not about arithmetic that
    // would hold for any non-zero claim.
    expect(audit.data.shadowedTokenCount).not.toBe(session.surface.nodes.length)
    expect(audit.data.shadowedTokenCount).toBeGreaterThan(0)
    // A skipped claim folds zero (see the lone-replace case below): if the audit
    // had not armed the fold, the delta would be exactly the carrier's own price.
    expect(expectedDelta).not.toBe(officialNodePrice(carrier))
  })

  it('shows the armed claim and the folded total in the same state', async () => {
    const session = measuredFixture()
    const host = await hostContext(hostState({ session }))
    const before = pressureState(host, session)
    // A lone claim: armed by the audit, consumed by nothing yet.
    session.append('compaction/prune', { shadowedRange: { start: 6, end: 9 }, shadowedSeqs: [6, 9], shadowedTokenCount: 7 })
    const armed = pressureState(host, session)

    expect(armed.claim).toEqual({ start: 6, end: 9, tokens: 7 })
    expect(armed.surfaceTokens).toBe(before.surfaceTokens)
  })

  it('folds exactly zero for a lone replace that has no claim at all', async () => {
    const session = measuredFixture()
    const host = await hostContext(hostState({ session }))
    const before = pressureState(host, session)
    const keys = runtimeEndpointKeys()
    session.append(
      'user/message',
      { role: 'user', id: 'dsh-resend-edit-lone', content: [{ type: 'text', text: TRACE_TEXT }], source: { kind: 'cordis-host-runner' } },
      { surfaceOp: { op: 'replace', [keys.start]: 6, [keys.end]: 9 }, sourceEventSeqs: [6, 9] },
    )

    expect(pressureState(host, session).surfaceTokens - before.surfaceTokens).toBe(0)
  })

  it('makes the fold throw for an orphan claim over a different range', async () => {
    const session = measuredFixture()
    const host = await hostContext(hostState({ session }))
    // An orphan claim for a range that is NOT the one the carrier replaces —
    // the damage an orphaned audit does to a later, different replace (§2.3).
    session.append('compaction/prune', { shadowedRange: { start: 0, end: 3 }, shadowedSeqs: [0, 3], shadowedTokenCount: 1 })
    const keys = runtimeEndpointKeys()
    const carrier = session.append(
      'user/message',
      { role: 'user', id: 'dsh-resend-edit-orphan', content: [{ type: 'text', text: TRACE_TEXT }], source: { kind: 'cordis-host-runner' } },
      { surfaceOp: { op: 'replace', [keys.start]: 6, [keys.end]: 9 }, sourceEventSeqs: [6, 9] },
    )

    expect(() => pressureState(host, session)).toThrow(/has no adjacent shadow price/)
    // The refusal names the event that contradicted the claim and both ranges,
    // because an orphan claim is only findable through that diagnostic (§11).
    expect(() => pressureState(host, session)).toThrow(new RegExp(`replace at seq ${carrier.seq} over range 6-9`))
    expect(() => pressureState(host, session)).toThrow(/armed claim covers 0-3/)
  })
})

describe('flush discipline, output faults and serialization (§4.6, §5.2, §13.1 #9–#11)', () => {
  it('flushes exactly once on success, and never on a refusal', async () => {
    const success = await writeOn(sessionFixture(), { targetSeq: 2, op: 'edit', text: 'edited' })
    expect(success.host.state.calls.flushes).toBe(1)
    // The flush saw the WRITTEN log, not the plan: its observed length is the
    // length the log has after the pair landed (§13.1 #9).
    expect(success.host.state.calls.flushLengths).toEqual([logLength(success.session)])

    const refused = await writeOn(sessionFixture(), { targetSeq: 2, op: 'edit', text: 'edited' }, {
      plan: { op: 'edit', targetSeq: 2, rangeStartSeq: 2, endSeq: 3, shadowedSeqs: [3, 2], resendText: 'edited' },
    })
    expect(refused.result.ok).toBe(false)
    expect(refused.host.state.calls.flushes).toBe(0)
    expect(refused.session.seq).toBe(4)
  })

  it('flushes what was written exactly once when the carrier is refused, and names the orphan (§5.2, §11)', async () => {
    const session = sessionFixture()
    const { host, logs, result } = await writeOn(withRefusingAppend(session), { targetSeq: 2, op: 'edit', text: 'edited' })

    expect(result.ok).toBe(false)
    expect(result.error.code).toBe('internal')
    expect(host.state.calls.flushes).toBe(1)
    // Only the audit landed, and it stays: the log cannot be rolled back.
    expect(session.seq).toBe(5)
    expect(auditCount(session)).toBe(1)
    const orphan = logs.map((message) => message.args.join(' ')).find((line) => line.includes('ORPHAN'))
    expect(orphan).toBeDefined()
    expect(orphan).toContain('seq 4')
    expect(orphan).toContain('range 2..3')
  })

  it('flushes ZERO times when the audit itself is refused — nothing was written', async () => {
    const session = sessionFixture()
    const { host, result } = await writeOn(withRefusingAppend(session, { onType: 'compaction/prune' }), { targetSeq: 2, op: 'edit', text: 'edited' })

    expect(result.ok).toBe(false)
    expect(result.error.code).toBe('internal')
    expect(host.state.calls.flushes).toBe(0)
    expect(session.seq).toBe(4)
    expect(auditCount(session)).toBe(0)
  })

  it('flushes first, exactly once, when the pair that landed is not the pair that was validated (§13.1 #9)', async () => {
    const session = sessionFixture()
    const { host, logs, result } = await writeOn(withRacingAppend(session), { targetSeq: 2, op: 'edit', text: 'edited' })

    expect(result.ok).toBe(false)
    expect(result.error.code).toBe('internal')
    expect(result.error.detail).toMatch(/no longer adjacent|does not match the validated pair/)
    // Output fault flushes first: once, and it observed the POST-write length — all
    // seven events, so the failure was computed over a log that was already durable
    // and not over one the plugin had yet to write.
    expect(host.state.calls.flushes).toBe(1)
    expect(host.state.calls.flushLengths).toEqual([7])
    // Nothing was rolled back — the pair and the racing event are all still there,
    // and the plugin reports the mismatch rather than a silent token drift.
    expect(session.seq).toBe(7)
    expect(auditCount(session)).toBe(1)
    expect(logOf(session).at(-1).seq).toBe(6)
    expect(logs.some((message) => message.type === 'warn' && message.args.join(' ').includes('does not match the validated pair'))).toBe(true)
  })

  it('refuses `message-pending` when the covering read and the live session disagree', async () => {
    const session = sessionFixture()
    const { host, result } = await writeOn(session, { targetSeq: 2, op: 'edit', text: 'edited' }, { state: { covering: { omit: [1] } } })

    expect(result.ok).toBe(false)
    expect(result.error.code).toBe('message-pending')
    expect(host.state.calls.flushes).toBe(0)
    expect(session.seq).toBe(4)
  })

  it('refuses `message-pending` when the read holds the wrong event at a shadowed seq', async () => {
    const session = sessionFixture()
    // Same length as the live log, one seq simply absent: an indexed lookup that
    // trusts its arithmetic would price a NEIGHBOUR here (§4.2). Only the write's
    // own read is moved — the resolution's read was a good one.
    const { host, result } = await writeOn(session, { targetSeq: 2, op: 'edit', text: 'edited' }, {
      afterResolve: (composition) => {
        composition.state.covering = { copy: [2, 0] }
      },
    })

    expect(result.ok).toBe(false)
    expect(result.error.code).toBe('message-pending')
    expect(result.error.detail).toContain('shadowed surface node 2')
    expect(host.state.calls.flushes).toBe(0)
  })

  it('serializes two concurrent operations on one session (§13.1 #11)', async () => {
    const session = sessionFixture()
    const host = await hostComposition({ host: hostState({ session }) })
    const request = { sessionId: SESSION_ID, targetSeq: 2, op: 'edit', text: 'edited' }

    const [first, second] = await Promise.all([
      dispatchToHost(host, 'resend/apply', { request }),
      dispatchToHost(host, 'resend/apply', { request }),
    ])
    const envelopes = [first.value, second.value]

    expect(host.host.calls.maxActiveFlushes, 'two operations overlapped in flush').toBe(1)
    expect(host.host.calls.flushes).toBe(1)
    expect(auditCount(session)).toBe(1)
    expect(envelopes.filter((envelope) => envelope.ok)).toHaveLength(1)
    // The loser is refused `agent-busy`, not `target-shadowed`, and ticket 05 is
    // why: the winner's resend is inside the same lock and queues the prompt, so
    // by the time the second call runs a turn IS open, and §4.4's rule 4 precedes
    // target resolution. (The loser cannot be mistaken for ticket 05's retry
    // either: its target's carrier has no resend message, which is exactly the
    // retry state — the busy agent is what refuses it first.)
    expect(envelopes.filter((envelope) => !envelope.ok).map((envelope) => envelope.error.code)).toEqual(['agent-busy'])
    expect(host.host.calls.followups).toBe(1)
  })
})

describe('the carrier is not a round boundary (§5.4, §13.1 #15)', () => {
  it('is a replacement surface event, is not append-origin, and leaves the round count unchanged', async () => {
    const session = measuredFixture()
    const rounds = () => logOf(session).filter((event) => event.type === 'turn/start').length
    const before = rounds()

    const { result } = await writeOn(session, { targetSeq: 6, op: 'edit', text: 'edited' })
    const { carrier } = pairAtEnd(session)

    expect(result.ok).toBe(true)
    expect(isReplacementSurfaceEvent(carrier)).toBe(true)
    expect(isAppendSurfaceEvent(carrier)).toBe(false)
    expect(deriveEventMessage(carrier).role).toBe('user')
    expect(rounds()).toBe(before)
  })

  it('is not classified as a model message, and the host fold closes over it as the user side (§5.4, §13.1 #15, §16.7)', async () => {
    const session = measuredFixture()
    const host = await hostContext(hostState({ session }))
    // The host's own derivation over the log: a model message is a node the fold
    // derives to `role: 'assistant'` with a `model` source (§16.7). The carrier
    // must not join that set — a carrier a host classified as a model message
    // would be a reply where a prompt belongs, and the trace text would reach the
    // model as assistant output.
    const modelSeqs = (nodes) => nodes
      .map((seq) => ({ seq, message: deriveEventMessage(session.eventAt(seq)) }))
      .filter(({ message }) => message.role === 'assistant' && message.source.kind === 'model')
      .map(({ seq }) => seq)

    const { result } = await writeOn(session, { targetSeq: 6, op: 'edit', text: 'edited' })
    const { carrier } = pairAtEnd(session)
    const carrierMessage = deriveEventMessage(carrier)

    expect(result.ok).toBe(true)
    // The reply the write shadowed is GONE from the set, and the carrier did not
    // take its place there: the surface's replies are the ones before the range.
    expect(modelSeqs([...session.surface.nodes])).toEqual([3])
    expect(modelSeqs([...session.surface.nodes])).not.toContain(carrier.seq)
    expect(carrierMessage.role).toBe('user')
    expect(carrierMessage.source).toEqual({ kind: 'cordis-host-runner' })
    expect(carrierMessage.source.kind).not.toBe('model')
    // The surface the plugin wrote is the surface the host's own fold replays,
    // from the events alone — a carrier mistaken for a turn boundary would put a
    // node on that surface the fold does not produce.
    expect(foldSurface(logOf(session), currentSessionMessageProjections).nodes).toEqual(session.surface.nodes)
    // …and the projection that prices the surface still folds the session: the
    // claim was consumed by the carrier and nothing is left armed.
    expect(host.ctx.sessionProjections.stateOf(session, 'contextPressure').claim).toBeUndefined()
  })
})

/**
 * §13.2 #16–#18: the doubles themselves, held to what they would have to be for
 * the rest of this file to mean anything.
 */
describe('the test doubles mirror the host, and their prices are the host’s (§13.2 #16, #18)', () => {
  it('the default fixture exposes the host’s accessors and NO legacy event view (§13.2 #16, #17)', () => {
    const session = sessionFixture()

    // First the generation question: this IS the host's own class, so the append
    // contract that accepted every fixture in this file is the one production
    // runs (§13.2 #17). A hand-rolled look-alike whose `append` accepts anything
    // would make each case here vacuous.
    expect(session).toBeInstanceOf(Session)
    expect(typeof session.append).toBe('function')
    expect(typeof session.snapshotEvents).toBe('function')
    expect(typeof session.eventAt).toBe('function')
    // The incident this invariant exists for: a legacy-shaped fake let a whole
    // suite pass while the feature was dead on real machines. If a fake ever
    // grows an `events` member by default, this is where it shows up.
    expect('events' in session).toBe(false)
    // …and the legacy view is reachable ONLY through the explicit opt-in, so the
    // sparse-safety case can still build the shape it exists to refuse.
    expect('events' in withLegacyEventView(sessionFixture())).toBe(true)
  })

  it('the write’s own price source reads the OFFICIAL meter, and never re-prices (§13.2 #18)', () => {
    // The assertion is about the shipped source, not a copy: a re-implemented
    // formula would price the claim with a number the host's fold disagrees with.
    // The estimator reaches the write through the meter SERVICE's own
    // `estimateMessage` — the instance method that delegates to the module export
    // (the "official sum" case above drives that equivalence node by node) — so
    // the price PATH is what the source can be held to here: it resolves the
    // official service, calls that method, and never re-derives a price of its own.
    const source = readFileSync(path.join(rootDir, 'src', 'token-price.js'), 'utf8')
    const resolved = import.meta.resolve('@deepseek-ai/dsh-token-meter/estimate')

    expect(resolved).toContain('node_modules/@deepseek-ai/dsh-token-meter')
    expect(existsSync(fileURLToPath(resolved))).toBe(true)
    expect(source).toContain("import { deriveEventMessage } from '@deepseek-ai/dsh-session'")
    expect(source).toMatch(/hostService\(ctx, 'tokenMeter'\)/)
    expect(source).toMatch(/meter\.estimateMessage\(/)
    expect(source).not.toMatch(/estimateMessage\s*=\s*\(/)
    // "Never skip" is a property of the IMPORT, not only of a missing directory:
    // a dynamic `import()` inside a `try` would make an absent package a silent
    // degradation, and this suite's failure would have to be a THROW at load.
    expect(source).not.toMatch(/await import\(/)
    expect(source).not.toMatch(/import\(['"]@deepseek-ai/)
  })

  it('a missing estimator package fails the resolver instead of skipping the case (§13.2 #18)', () => {
    // Two facts, and the second is what makes the first mean anything:
    //
    //  1. the specifier the shipped source and this suite both name resolves to a
    //     real file — a typo there would make the import throw at load, which is
    //     the "throw, never skip" the criterion asks for;
    //  2. in a scratch root where the package is absent, Node's resolver fails on
    //     that same specifier, naming it — the outcome a missing devDependency
    //     would produce, rather than a skipped case.
    const resolved = import.meta.resolve('@deepseek-ai/dsh-token-meter/estimate')
    expect(resolved).toMatch(/dsh-token-meter\/lib\/types\/estimate\.js$/)
    expect(existsSync(fileURLToPath(resolved))).toBe(true)
    const absentRoot = mkdtempSync(path.join(tmpdir(), 'dsh-resend-absent-'))
    const presentRoot = mkdtempSync(path.join(tmpdir(), 'dsh-resend-present-'))
    const probe = "import('@deepseek-ai/dsh-token-meter/estimate').then(() => { console.log('resolved') })"
    const run = (root) => spawnSync(process.execPath, ['--input-type=module', '-e', probe], { cwd: root, encoding: 'utf8' })
    try {
      mkdirSync(path.join(presentRoot, 'node_modules', '@deepseek-ai'), { recursive: true })
      symlinkSync(
        path.join(rootDir, 'node_modules', '@deepseek-ai', 'dsh-token-meter'),
        path.join(presentRoot, 'node_modules', '@deepseek-ai', 'dsh-token-meter'),
        'junction',
      )

      const reachable = run(presentRoot)
      expect(reachable.status, reachable.stderr).toBe(0)
      expect(reachable.stdout).toContain('resolved')

      const missing = run(absentRoot)
      expect(missing.status).not.toBe(0)
      expect(missing.stderr).toContain('@deepseek-ai/dsh-token-meter')
      // Vite's resolver phrasings ("Failed to resolve import", "Cannot find
      // package") and Node's own ERR_MODULE_NOT_FOUND all name the package, which
      // is what makes the failure diagnosable rather than a bare nonzero exit.
      expect(missing.stderr).toMatch(/Cannot find package|ERR_MODULE_NOT_FOUND|Failed to resolve/i)
    } finally {
      rmSync(absentRoot, { recursive: true, force: true })
      rmSync(presentRoot, { recursive: true, force: true })
    }
  })
})

describe('the write is refused rather than degraded (spec §5.3, §11)', () => {
  it('refuses with `internal`, writing nothing, when the meter is unavailable', async () => {
    const session = sessionFixture()
    const plan = { op: 'edit', targetSeq: 2, rangeStartSeq: 2, endSeq: 3, shadowedSeqs: [2, 3], resendText: 'edited' }
    // A composition with NO token meter at all. The refusal happens before any
    // service is read, which is why `sessions` is not even needed here.
    const result = await writeRewindPair(new Context(), {
      sessions: undefined,
      session,
      sessionId: SESSION_ID,
      plan,
      carrierId: markerId('edit'),
      traceText: TRACE_TEXT,
    })

    expect(result.ok).toBe(false)
    expect(result.error.code).toBe('internal')
    expect(result.error.detail).toMatch(/tokenMeter/)
    expect(result.error.detail).toMatch(/official shadow price/)
    expect(session.seq).toBe(4)
    expect(auditCount(session)).toBe(0)
  })

  it('refuses a meter that carries no official estimator, rather than pricing by hand', async () => {
    const session = sessionFixture()
    // The service exists; the estimator the host folds with does not. Anything
    // this plugin could compute instead would be a number the host disagrees with.
    class EstimatorlessMeter extends Service {
      constructor(ctx) {
        super(ctx, 'tokenMeter')
      }
    }
    const ctx = new Context()
    await ctx.plugin(EstimatorlessMeter)
    const plan = { op: 'edit', targetSeq: 2, rangeStartSeq: 2, endSeq: 3, shadowedSeqs: [2, 3], resendText: 'edited' }
    const result = await writeRewindPair(ctx, { sessions: undefined, session, sessionId: SESSION_ID, plan, carrierId: markerId('edit'), traceText: TRACE_TEXT })

    expect(result.ok).toBe(false)
    expect(result.error.code).toBe('internal')
    expect(result.error.detail).toMatch(/estimateMessage/)
    expect(session.seq).toBe(4)
    expect(auditCount(session)).toBe(0)
  })
})

describe('the operation end to end through the Gateway (§4.1, §4.4, §5.5 seam)', () => {
  it('answers the success envelope the descriptor declares, and the codec accepts it', async () => {
    const { envelope, session, host } = await applyThroughGateway({}, undefined, { targetSeq: 2, op: 'edit', text: 'edited' })
    const { carrier } = pairAtEnd(session)

    expect(envelope.ok).toBe(true)
    expect(Object.keys(envelope.value)).toEqual(['carrierSeq', 'shadowedSeqs', 'resendMessageId'])
    expect(envelope.value.carrierSeq).toBe(carrier.seq)
    expect(envelope.value.shadowedSeqs).toEqual([2, 3])
    // The resend message's id is DERIVED from the carrier's (ticket 05, §9.4):
    // the pairing is restated here rather than taken from the module that
    // computes it, because "was this prompt ever queued?" is answered from it.
    expect(envelope.value.resendMessageId).toBe(`${carrier.data.id}-resend`)
    expect(carrier.data.id).toMatch(/^dsh-resend-edit-/)
    expect(envelope.value.resendMessageId).not.toBe(carrier.data.id)
    // The strict result codec is what turns a typo in a codec-visible field into
    // a boundary error instead of a silent unknown value on the wire.
    expect(TYPERT.invocations[0].result.create().safeParse(envelope).success).toBe(true)
    expect(host.host.calls.flushes).toBe(1)
  })

  it('rewinds the round a regenerate targets, and writes the same pair', async () => {
    const session = measuredFixture()
    const { envelope } = await applyThroughGateway({}, session, { targetSeq: 9, op: 'regenerate' })
    const { audit, carrier } = pairAtEnd(session)

    expect(envelope.ok).toBe(true)
    expect(audit.data.shadowedRange).toEqual({ start: 6, end: 9 })
    expect(carrier.sourceEventSeqs.slice(1)).toEqual([6, 9])
    // The carrier is spliced where the range was: the second round's prompt and
    // reply are gone from the surface, and the first round survives.
    expect(session.surface.nodes).toEqual([0, 3, carrier.seq])
  })

  it('cancels a turn that opened between the precondition and the write, then writes (§4.4)', async () => {
    const agent = openingTurnAgent({ afterReads: 1 })
    const { envelope, session } = await applyThroughGateway({ agent }, undefined, { targetSeq: 2, op: 'edit', text: 'edited' })

    expect(envelope.ok).toBe(true)
    expect(agent.cancels).toEqual([{ kind: 'user' }])
    expect(agent.idles).toBe(1)
    expect(auditCount(session)).toBe(1)
  })

  it('writes the trace text of the ACTIVE locale, and only one language (§10, §5.4)', async () => {
    const zh = await applyThroughGateway({ locale: 'zh' }, undefined, { targetSeq: 2, op: 'edit', text: 'edited' })
    expect(pairAtEnd(zh.session).carrier.data.content[0].text).toBe(SPEC_TRACE_TEXT.zh)

    const en = await applyThroughGateway({ locale: 'en' }, undefined, { targetSeq: 2, op: 'edit', text: 'edited' })
    expect(pairAtEnd(en.session).carrier.data.content[0].text).toBe(SPEC_TRACE_TEXT.en)

    // A locale this plugin has no text for falls back rather than writing nothing.
    const other = await applyThroughGateway({ locale: 'fr' }, undefined, { targetSeq: 2, op: 'edit', text: 'edited' })
    expect(pairAtEnd(other.session).carrier.data.content[0].text).toBe(SPEC_TRACE_TEXT.en)
  })

  it('really writes the sparse-log-safe regenerate the resolution suite pins (§13.1 #13)', async () => {
    const session = rewoundFixture().session
    appendUser(session, { id: 'u3', text: 'prompt three' })
    appendReply(session, { id: 'a3', text: 'reply three', turn: 3 })
    const [promptSeq, replySeq] = [6, 7]
    // The sparse view the production incident shipped a scan over, with a hole
    // exactly at the current prompt.
    withLegacyEventView(session, { holeAt: promptSeq })

    const { envelope } = await applyThroughGateway({}, session, { targetSeq: replySeq, op: 'regenerate' })
    const { audit, carrier } = pairAtEnd(session)

    expect(envelope.ok).toBe(true)
    expect(audit.data.shadowedRange).toEqual({ start: promptSeq, end: replySeq })
    expect(carrier.sourceEventSeqs.slice(1)).toEqual([promptSeq, replySeq])
    // The plan that was written is the CURRENT round's, never the earlier one.
    expect(carrier.sourceEventSeqs).not.toContain(2)
    expect(audit.data.shadowedSeqs).not.toContain(2)
  })

  it('an edit near the top of the session rewinds everything after it (§9)', async () => {
    const { envelope, session } = await applyThroughGateway({}, undefined, { targetSeq: 0, op: 'edit', text: FIRST_PROMPT }, { restrictEditToLastUserMessage: false })
    const { carrier } = pairAtEnd(session)

    expect(envelope.ok).toBe(true)
    expect(envelope.value.shadowedSeqs).toEqual([0, 1, 2, 3])
    expect(session.surface.nodes).toEqual([carrier.seq])
  })
})
