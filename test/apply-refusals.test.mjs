/**
 * `resend.apply` as a business surface (spec §4.4–§4.5; ticket 03).
 *
 * Every call here travels the whole shipped path: the real API Gateway resolves
 * the strict descriptor, decodes the request, dispatches to the real service,
 * and hands back the result envelope. What this file asserts is what the ticket
 * is for —
 *
 *  - every code in §4.5's closed vocabulary has a real producer, and the code a
 *    case produces is the one it should;
 *  - every refusal path writes NOTHING: `session.seq` is untouched, no
 *    `compaction/prune` appears, and the flush count stays zero;
 *  - `apply` never rejects for a business outcome, not even when a host service
 *    throws instead of answering.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { TYPERT } from '../lib/typert.host.js'
import { dispatchToHost, hostComposition } from './helpers/gateway.mjs'
import { appendReply, auditCount, canonicalLog, completedRewindFixture, sessionFixture, hostState, SESSION_ID } from './helpers/host.mjs'

/**
 * The closed error vocabulary, restated from spec §4.5 *on purpose*: the suite's
 * case table is measured against an expectation the shipped codec cannot move,
 * so a thirteenth code — or a case table that quietly stopped covering one —
 * fails here.
 */
const SPEC_ERROR_CODES = [
  'bad-request',
  'session-not-found',
  'agent-unavailable',
  'agent-busy',
  'message-not-found',
  'message-pending',
  'target-shadowed',
  'not-user-message',
  'not-last-reply',
  'not-last-user-message',
  'not-assistant-message',
  'blank-text',
  'no-text',
  'internal',
]

/** A prompt with no text block at all: the image-only shape §4.3 refuses. */
function imageOnlyFixture() {
  const session = sessionFixture()
  session.append('user/message', { role: 'user', id: 'u-images', content: [], source: { kind: 'user' } }, { surfaceOp: 'append' })
  appendReply(session, { id: 'a3', text: 'reply three', turn: 3 })
  return session
}

/**
 * §13.1 #8's four input-fault classes, cited FROM the table below by identity.
 *
 * This is a grouping, not a second case table: the entries are the very objects
 * `CASES` holds, so a class cannot be covered twice with two different
 * expectations.
 */
const INPUT_FAULT_CASES = {
  badTarget: { code: 'bad-request', why: 'a targetSeq that is not a seq', request: { sessionId: SESSION_ID, targetSeq: 2.5, op: 'edit', text: 'x' } },
  blankEdit: { code: 'blank-text', why: 'an edit that is whitespace only', request: { sessionId: SESSION_ID, targetSeq: 2, op: 'edit', text: '  \n ' } },
  unknownSession: { code: 'session-not-found', why: 'a session the store does not know', request: { sessionId: 'no-such-session', targetSeq: 2, op: 'edit', text: 'x' } },
  busyAgent: { code: 'agent-busy', why: 'a reply streaming right now', state: { agent: { status: 'running' } }, request: { sessionId: SESSION_ID, targetSeq: 2, op: 'edit', text: 'x' } },
}

/**
 * One case per code. `state` moves the host; `request` is what the client sends.
 * The codes are §4.5's, and each case names the producer behind it.
 */
const CASES = [
  { code: 'not-last-user-message', why: 'an edit aimed at an older user message', request: { sessionId: SESSION_ID, targetSeq: 0, op: 'edit', text: 'changed' } },
  { code: 'not-assistant-message', why: 'a user message is never a regenerate target', request: { sessionId: SESSION_ID, targetSeq: 2, op: 'regenerate' } },
  { code: 'bad-request', why: 'an empty sessionId', request: { sessionId: '', targetSeq: 2, op: 'edit', text: 'x' } },
  { code: 'bad-request', why: 'a missing text for edit', request: { sessionId: SESSION_ID, targetSeq: 2, op: 'edit' } },
  INPUT_FAULT_CASES.badTarget,
  INPUT_FAULT_CASES.unknownSession,
  { code: 'agent-unavailable', why: 'a session with no live agent', state: { agent: undefined }, request: { sessionId: SESSION_ID, targetSeq: 2, op: 'edit', text: 'x' } },
  INPUT_FAULT_CASES.busyAgent,
  {
    code: 'message-not-found',
    why: 'a seq the covering read reaches past but does not hold',
    state: { covering: { omit: [2] } },
    request: { sessionId: SESSION_ID, targetSeq: 2, op: 'edit', text: 'x' },
  },
  { code: 'message-pending', why: 'a seq beyond every log the host can show', request: { sessionId: SESSION_ID, targetSeq: 9, op: 'edit', text: 'x' } },
  {
    code: 'target-shadowed',
    why: 'a target a carrier’s range already covers',
    // A FINISHED rewind of this plugin's: the pair and the resend message it
    // queued. (A pair whose resend message never landed is ticket 05's
    // `resend-only` retry, not read-only history — see `resend.test.mjs`.)
    fixture: () => completedRewindFixture().session,
    request: { sessionId: SESSION_ID, targetSeq: 2, op: 'edit', text: 'x' },
  },
  { code: 'not-user-message', why: 'an edit aimed at an assistant reply', request: { sessionId: SESSION_ID, targetSeq: 3, op: 'edit', text: 'x' } },
  { code: 'not-last-reply', why: 'a regenerate aimed at an older reply', request: { sessionId: SESSION_ID, targetSeq: 1, op: 'regenerate' } },
  INPUT_FAULT_CASES.blankEdit,
  {
    code: 'no-text',
    why: 'a prompt that carries no text block',
    fixture: imageOnlyFixture,
    request: { sessionId: SESSION_ID, targetSeq: 5, op: 'regenerate' },
  },
  {
    code: 'internal',
    why: 'a covering read that fails its replay',
    state: { covering: { error: 'SESSION_QUERY_CORRUPT_SESSION' } },
    request: { sessionId: SESSION_ID, targetSeq: 2, op: 'edit', text: 'x' },
  },
]

/**
 * Compose a host and dispatch one request through the real Gateway.
 *
 * The pre-call snapshot is taken here, BEFORE the dispatch, so the zero-write
 * assertions compare against the session's real starting state rather than
 * against itself.
 */
async function apply(state, fixture, request) {
  const session = fixture ?? sessionFixture()
  const host = await hostComposition({ host: hostState({ session, ...state }) })
  const before = { seq: session.seq, audits: auditCount(session), log: canonicalLog(session) }
  const wire = await dispatchToHost(host, 'resend/apply', { request })

  // A business outcome always reaches the caller as an envelope; a refused call
  // with no envelope would mean the boundary stopped it, which is a different
  // (and here, wrong) claim about the request.
  expect(wire.ok, `the boundary refused the call: ${JSON.stringify(wire.error)}`).toBe(true)
  return { envelope: wire.value, host, session, before }
}

describe('every refusal is a business outcome, and writes nothing (§4.4, §4.5, §13.1 #8)', () => {
  for (const testCase of CASES) {
    it(`${testCase.code}: ${testCase.why}`, async () => {
      const { envelope, host, session, before } = await apply(testCase.state, testCase.fixture?.(), testCase.request)

      expect(envelope.ok).toBe(false)
      expect(envelope.error.code).toBe(testCase.code)

      // The zero-write claim, from the session itself: no seq minted, no orphan
      // audit claim left behind, and no flush attempted. The agent is untouched
      // as well — a refusal must not reach the resend either.
      expect(session.seq).toBe(before.seq)
      expect(auditCount(session)).toBe(before.audits)
      expect(host.host.calls.flushes).toBe(0)
      expect(host.host.calls.followups).toBe(0)
      // …and "writes nothing" is the whole log, byte for byte: a seq that did not
      // move would still hide an append that was accepted and then withdrawn, a
      // mutated event, or a write that never mints a seq. The canonical string is
      // stable across runs (object keys sorted), so the two reads are comparable.
      expect(canonicalLog(session)).toBe(before.log)
    })
  }

  it('the case table covers the whole closed vocabulary, and nothing outside it', () => {
    expect([...new Set(CASES.map((testCase) => testCase.code))].sort()).toEqual([...SPEC_ERROR_CODES].sort())
  })

  it('each of the four input-fault classes leaves the log byte-identical, not merely the same seq (§13.1 #8)', async () => {
    // §13.1 #8 names four classes. The table above covers them, and this pins
    // them BY NAME to the case each one is, against the whole log rather than the
    // seq — a comparison that could not pass if the write had touched anything at
    // all: `seq` alone does not notice a completed-then-withdrawn append, a
    // rewritten event, or a write that refrains from minting.
    const classes = [
      ['a target that is not a seq', INPUT_FAULT_CASES.badTarget],
      ['a blank edit', INPUT_FAULT_CASES.blankEdit],
      ['an unknown session', INPUT_FAULT_CASES.unknownSession],
      ['a busy agent', INPUT_FAULT_CASES.busyAgent],
    ]

    for (const [name, testCase] of classes) {
      const { envelope, session, before } = await apply(testCase.state, undefined, testCase.request)

      expect(envelope.error.code, name).toBe(testCase.code)
      expect(canonicalLog(session), name).toBe(before.log)
      expect(session.seq, name).toBe(before.seq)
    }
  })

  it('each case really is the code claimed, over the strict result codec', async () => {
    // The envelope the client receives is the one the descriptor declares — the
    // codec is what turns a typo in a code into a boundary error instead of a
    // silent unknown code on the wire.
    const schema = TYPERT.invocations[0].result.create()
    const { envelope } = await apply(undefined, undefined, { sessionId: SESSION_ID, targetSeq: 3, op: 'edit', text: 'x' })

    expect(schema.safeParse(envelope).success).toBe(true)
    expect(envelope.error.code).toBe('not-user-message')
  })
})

describe('`apply` never rejects for a business outcome (§4.5, §13.1 #12)', () => {
  let request

  beforeEach(() => {
    request = { sessionId: SESSION_ID, targetSeq: 2, op: 'edit', text: 'x' }
  })

  it('answers a well-formed code when `sessions.get` throws', async () => {
    const { envelope, host, session } = await apply({ sessionsThrow: true }, undefined, request)

    expect(envelope).toEqual({ ok: false, error: { code: 'internal' } })
    expect(session.seq).toBe(4)
    expect(host.host.calls.flushes).toBe(0)
  })

  it('answers a well-formed code when `agents.get` throws', async () => {
    const { envelope, session } = await apply({ agentThrows: true }, undefined, request)

    expect(envelope).toEqual({ ok: false, error: { code: 'internal' } })
    expect(session.seq).toBe(4)
  })

  it('answers a well-formed code when the covering read throws something unrecognized', async () => {
    const { envelope } = await apply({ covering: { error: 'SESSION_QUERY_BRAND_NEW' } }, undefined, request)

    expect(envelope.error.code).toBe('internal')
  })

  it('answers `internal` — never a rejection — when the row is torn down under a call', async () => {
    const host = await hostComposition({ host: hostState({ session: sessionFixture() }) })
    // The service the Gateway would have dispatched to, held across the teardown.
    const service = host.ctx.get('resend')
    await host.fiber.dispose()

    const envelope = await service.apply(request)

    expect(envelope).toEqual({ ok: false, error: { code: 'internal' } })
    expect(host.host.session.seq).toBe(4)
  })
})

describe('a covering-read refusal keeps its own meaning through `apply` (§4.5)', () => {
  const request = { sessionId: SESSION_ID, targetSeq: 2, op: 'edit', text: 'x' }

  it('maps a persistence failure to `message-pending` — retryable, never target-shadowed', async () => {
    const { envelope } = await apply({ covering: { error: 'SESSION_QUERY_PERSISTENCE_FAILED' } }, undefined, request)

    expect(envelope.error.code).toBe('message-pending')
  })

  it('maps a corrupt replay to `internal` — never `target-shadowed`', async () => {
    const { envelope } = await apply({ covering: { error: 'SESSION_QUERY_CORRUPT_SESSION' } }, undefined, request)

    expect(envelope.error.code).toBe('internal')
    expect(envelope.error.code).not.toBe('target-shadowed')
  })

  it('maps a session the query route does not know to `session-not-found`', async () => {
    const { envelope } = await apply({ covering: { error: 'SESSION_QUERY_SESSION_NOT_FOUND' } }, undefined, request)

    expect(envelope.error.code).toBe('session-not-found')
  })

  it('maps a missing stored session to the non-retryable absence, not to a `message-pending`', async () => {
    // No stored session to consult, and the covering read reaches past seq 2:
    // the absence is real, so the answer is the permanent one (§4.5).
    const { envelope } = await apply({ covering: { omit: [2] }, stored: { mode: 'not-found' } }, undefined, request)

    expect(envelope.error.code).toBe('message-not-found')
  })
})

describe('a resolved plan is written, and the write is the only thing that changes the log (ticket 04)', () => {
  it('lands the pair and answers the success envelope rather than refusing over a written surface', async () => {
    // A request this build serves completely: it is the second round's prompt, on
    // the surface, edited to non-blank text. The rewind is written — audit claim
    // and carrier, adjacent, flushed once (§5.2) — the prompt is queued to the
    // agent (§5.5), and the envelope names the carrier the host minted and the
    // message the agent took. Reporting `internal` here would report failure over
    // a surface the plugin had already changed (§9.4).
    const { envelope, host, session } = await apply(undefined, undefined, { sessionId: SESSION_ID, targetSeq: 2, op: 'edit', text: 'edited' })

    expect(envelope.ok).toBe(true)
    expect(envelope.value.carrierSeq).toBe(5)
    expect(envelope.value.shadowedSeqs).toEqual([2, 3])
    expect(session.seq).toBe(6)
    expect(auditCount(session)).toBe(1)
    expect(host.host.calls.flushes).toBe(1)
    // The resend is inside the same lock and after the flush, and the promise is
    // never awaited — only the agent's own `status` says whether it was taken.
    expect(host.host.calls.trace).toEqual(['flush', 'followup'])
    expect(host.host.calls.followups).toBe(1)
    expect(typeof envelope.value.resendMessageId).toBe('string')
  })

  it('a regenerate refused for `no-text` calls `followup` zero times and writes no marker (§13.1 #13)', async () => {
    const { envelope, host, session, before } = await apply({}, imageOnlyFixture(), { sessionId: SESSION_ID, targetSeq: 5, op: 'regenerate' })

    expect(envelope.error.code).toBe('no-text')
    expect(host.host.calls.followups).toBe(0)
    expect(session.seq).toBe(before.seq)
    expect(auditCount(session)).toBe(0)
  })

  it('resolves a regenerate the same way, from the same covering read, and writes it', async () => {
    const { envelope, session } = await apply(undefined, undefined, { sessionId: SESSION_ID, targetSeq: 3, op: 'regenerate' })

    expect(envelope.ok).toBe(true)
    expect(envelope.value.shadowedSeqs).toEqual([2, 3])
    expect(session.seq).toBe(6)
  })

  it('checks the agent before the target: a busy agent refuses even a resolvable edit (§4.4)', async () => {
    const { envelope, session } = await apply({ agent: { status: 'running' } }, undefined, { sessionId: SESSION_ID, targetSeq: 2, op: 'edit', text: 'edited' })

    expect(envelope.error.code).toBe('agent-busy')
    expect(session.seq).toBe(4)
    expect(auditCount(session)).toBe(0)
  })

  it('never takes write ownership of the stored log, and only opens it when the facts are needed (spec §4.2)', async () => {
    // The covering read answered, so the auxiliary route has nothing to add and
    // is not consulted at all (§4.2: its one job is `fileMaxSeq` for §4.5).
    const resolvable = await apply(undefined, undefined, { sessionId: SESSION_ID, targetSeq: 2, op: 'edit', text: 'edited' })
    expect(resolvable.host.host.calls.storedOpens).toBe(0)

    // The target is missing, so the file facts decide — and the route is
    // borrowed read-only, exactly once, with the handle given back.
    const absent = await apply({ covering: { omit: [2] } }, undefined, { sessionId: SESSION_ID, targetSeq: 2, op: 'edit', text: 'edited' })
    expect(absent.envelope.error.code).toBe('message-not-found')
    expect(absent.host.host.calls.storedAccess).toEqual(['read'])
    expect(absent.host.host.calls.storedCloses).toBe(1)
  })
})
