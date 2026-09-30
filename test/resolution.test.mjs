/**
 * Read-only resolution (spec §4.2–§4.5; ticket 03) — where the target is, what
 * the range is, and which code is refused, with nothing written.
 *
 * The seam under test is the shipped one: `lib/resolve.js` is its own artifact
 * (emitted by `scripts/build.mjs`, imported by `lib/index.js`, and the module
 * ticket 04's write consumes), never a private copy of the source. It runs over
 * a fixture session that IS the real `Session` class, folded with the official
 * `foldSurface`. The three properties this file exists to defend:
 *
 *  - the range is computed in SURFACE order from a covering read, so a
 *    descending range resolves instead of inverting (§4.3, §13.1 #6);
 *  - the resend text comes from that same read, never from a scan over a
 *    sparse event view — the defect class that shipped the wrong prompt (§13.1
 *    #13);
 *  - `target-shadowed`, `message-pending` and `message-not-found` are three
 *    separate verdicts, and a failed replay is none of them (§4.5, §13.1 #14).
 */
import { describe, expect, it } from 'vitest'
import { Session } from '@deepseek-ai/dsh-session'
import { resolveTarget } from '../lib/resolve.js'
import {
  appendReply,
  appendRewindPair,
  appendUser,
  sessionFixture,
  hostContext,
  hostState,
  middleRewoundFixture,
  rewoundFixture,
  SECOND_PROMPT,
  SESSION_ID,
  withLegacyEventView,
} from './helpers/host.mjs'

/** Resolve one request against a fixture session, optionally capturing host-log lines. */
async function resolve({ session, state = {}, request, warnings }) {
  const host = await hostContext(hostState({ session, ...state }))
  if (warnings !== undefined) host.ctx.logger.exporter({ levels: { default: 2 }, export: (message) => warnings.push(message) })
  const result = await resolveTarget(host.ctx, { sessionId: SESSION_ID, ...request }, session.surface.nodes)
  return { result, host }
}

/** The refusal code of a resolution that must have refused. */
async function codeOf(options) {
  const { result } = await resolve(options)
  expect(result.ok, `expected a refusal, got ${JSON.stringify(result)}`).toBe(false)
  return result.error.code
}

describe('the fixture mirrors the production host generation before anything else', () => {
  it('exposes the accessors and NO legacy event-view member by default (§13.2 #16)', () => {
    const session = sessionFixture()

    expect(typeof session.snapshotEvents).toBe('function')
    expect(typeof session.eventAt).toBe('function')
    // The whole reason §13.2 #16 exists: a legacy-shaped fake once let a suite
    // pass while the feature was dead on real machines.
    expect('events' in session).toBe(false)
  })

  it('offers the legacy event view only behind an explicit opt-in (§13.2 #16)', () => {
    const session = withLegacyEventView(sessionFixture(), { holeAt: 1 })

    expect('events' in session).toBe(true)
    expect(session.events[1]).toBeUndefined()
    expect(session.events[2]?.seq).toBe(2)
  })

  it('answers the covering read with a session HEADER, and resolves against the live one (§4.2)', async () => {
    const session = sessionFixture()
    const host = await hostContext(hostState({ session }))
    // What route (2) answers with: `sessionQuery.readSession` returns the session
    // HEADER, a structured clone — not a live handle — and the double's decoy
    // carries an empty surface on purpose. Resolution must not read it.
    const covering = await host.ctx.get('sessionQuery').readSession(SESSION_ID)
    expect(covering.session.surface.nodes).toEqual([])
    expect(session.surface.nodes).toEqual([0, 1, 2, 3])

    const result = await resolveTarget(host.ctx, { sessionId: SESSION_ID, targetSeq: 2, op: 'edit', text: 'x' }, session.surface.nodes)
    expect(result.ok).toBe(true)
    expect(result.value.shadowedSeqs).toEqual([2, 3])
  })
})

describe('the range is the surface from the target to its end (§4.3)', () => {
  it('edit: the target and everything after it, in surface order', async () => {
    const session = sessionFixture()
    const { result } = await resolve({ session, request: { targetSeq: 2, op: 'edit', text: 'the edited prompt' } })

    expect(result).toEqual({
      ok: true,
      value: { op: 'edit', targetSeq: 2, rangeStartSeq: 2, endSeq: 3, shadowedSeqs: [2, 3], resendText: 'the edited prompt' },
    })
  })

  it('edit near the top takes the whole surface with it', async () => {
    const session = sessionFixture()
    const { result } = await resolve({ session, request: { targetSeq: 0, op: 'edit', text: 'x' } })

    expect(result.value.shadowedSeqs).toEqual([0, 1, 2, 3])
  })

  it('regenerate: the target reply’s ROUND, and that round’s prompt as the text (§4.3, §9.2)', async () => {
    const session = sessionFixture()
    const { result } = await resolve({ session, request: { targetSeq: 3, op: 'regenerate' } })

    expect(result).toEqual({
      ok: true,
      value: { op: 'regenerate', targetSeq: 3, rangeStartSeq: 2, endSeq: 3, shadowedSeqs: [2, 3], resendText: 'second prompt' },
    })
  })

  it('a numerically descending range resolves, and the real validator takes it unchanged (§13.1 #6, §16.7)', async () => {
    const { session, carrierSeq } = middleRewoundFixture()
    expect(session.surface.nodes).toEqual([0, 1, carrierSeq, 4, 5])

    // A second rewind aimed at the carrier is exactly the shape §16.7 measured:
    // startSeq is numerically GREATER than endSeq.
    const { result } = await resolve({ session, request: { targetSeq: carrierSeq, op: 'edit', text: 'edited again' } })
    expect(result.ok).toBe(true)
    expect(result.value.rangeStartSeq).toBeGreaterThan(result.value.endSeq)
    expect(result.value.shadowedSeqs).toEqual([carrierSeq, 4, 5])

    // The pre-flight that makes "resolved" mean "writable": the planned range is
    // handed to the REAL append contract (no stub that always accepts), which
    // validates range membership, `sourceEventSeqs` completeness and the
    // `surfaceOp` shape, and writes it back unchanged.
    const before = session.seq
    const written = appendRewindPair(session, result.value, { id: 'dsh-resend-edit-prefight' })
    expect(session.seq).toBe(before + 2)
    expect(written.carrier.surfaceOp).toEqual({ op: 'replace', startSeq: result.value.rangeStartSeq, endSeq: result.value.endSeq })
    expect(written.carrier.sourceEventSeqs).toEqual([written.audit.seq, ...result.value.shadowedSeqs])
    expect(session.surface.nodes).toEqual([0, 1, before + 1])
  })

  it('the pre-flight is the real contract: it refuses a citation that omits a shadowed node', () => {
    // The teeth behind the test above. A pre-write check that accepts anything
    // proves nothing, so the same append is driven with one shadowed node left
    // out of `sourceEventSeqs` — the omission that makes a session unloadable —
    // and the host must name what is missing.
    const { session, carrierSeq } = middleRewoundFixture()

    expect(() =>
      session.append(
        'user/message',
        { role: 'user', id: 'dsh-resend-edit-omitter', content: [{ type: 'text', text: '(an incomplete citation)' }], source: { kind: 'cordis-host-runner' } },
        { surfaceOp: { op: 'replace', startSeq: carrierSeq, endSeq: 5 }, sourceEventSeqs: [carrierSeq, 4] },
      ),
    ).toThrow(/sourceEventSeqs must include every shadowed surface node/)
  })
})

describe('the resend text comes from the covering read, never from a sparse view (§4.2, §13.1 #13)', () => {
  /**
   * The shape the production incident shipped: a backward scan for "the
   * previous user message" over a sparse event view. It is here as the NEGATIVE
   * CONTROL — it must produce the wrong, earlier prompt, so the assertion that
   * the resolver does not is not vacuous.
   */
  const naiveBackwardScan = (legacy, fromSeq) => {
    for (let index = fromSeq; index >= 0; index -= 1) {
      const event = legacy[index]
      if (event?.type === 'user/message' && event.data?.source?.kind === 'user') return event.data.content[0].text
    }
    return undefined
  }

  /** Three rounds, so the last one has a prompt of its own to re-send. */
  const thirdRoundFixture = () => {
    const session = sessionFixture()
    appendUser(session, { id: 'u3', text: 'prompt three' })
    appendReply(session, { id: 'a3', text: 'reply three', turn: 3 })
    return session
  }

  it('re-sends the CURRENT round’s prompt when the legacy view has a hole at it', async () => {
    const session = rewoundFixture().session
    appendUser(session, { id: 'u3', text: 'prompt three' })
    appendReply(session, { id: 'a3', text: 'reply three', turn: 3 })
    const [promptSeq, replySeq] = [6, 7]

    // Opt in to the sparse view, with a hole exactly at the current prompt and
    // an earlier round still visible through it.
    withLegacyEventView(session, { holeAt: promptSeq })
    expect(naiveBackwardScan(session.events, replySeq)).toBe(SECOND_PROMPT)

    const { result } = await resolve({ session, request: { targetSeq: replySeq, op: 'regenerate' } })
    expect(result.ok).toBe(true)
    expect(result.value.resendText).toBe('prompt three')
    expect(result.value.rangeStartSeq).toBe(promptSeq)
    // Non-vacuity: the wrong answer was reachable, and it is not what came back.
    expect(result.value.resendText).not.toBe(SECOND_PROMPT)
  })

  it('refuses with `no-text` when the COVERING READ itself has the hole at the prompt', async () => {
    // The same hazard, one layer down: the read this resolver is allowed to use
    // cannot produce the prompt. The answer must be the intelligible refusal —
    // never `internal`, and never the earlier round's prompt.
    const session = thirdRoundFixture()
    const warnings = []
    const { result } = await resolve({
      session,
      state: { covering: { omit: [4] } },
      request: { targetSeq: 5, op: 'regenerate' },
      warnings,
    })

    expect(result.ok).toBe(false)
    expect(result.error.code).toBe('no-text')
    // A read that does not replay is a degradation, and it is diagnosable.
    expect(warnings.some((message) => message.type === 'warn' && message.args.join(' ').includes('did not replay'))).toBe(true)
  })

  it('re-sends the current round’s prompt when the covering read has a hole elsewhere', async () => {
    const session = thirdRoundFixture()
    const warnings = []
    const { result } = await resolve({
      session,
      state: { covering: { omit: [1] } },
      request: { targetSeq: 5, op: 'regenerate' },
      warnings,
    })

    expect(result.ok).toBe(true)
    expect(result.value.resendText).toBe('prompt three')
    expect(result.value.rangeStartSeq).toBe(4)
    expect(result.value.resendText).not.toBe(SECOND_PROMPT)
    expect(warnings.some((message) => message.type === 'warn')).toBe(true)
  })

  it('still resolves an edit against the live surface when the covering read cannot be folded', async () => {
    const session = thirdRoundFixture()
    const { result } = await resolve({ session, state: { covering: { omit: [1] } }, request: { targetSeq: 4, op: 'edit', text: 'edited' } })

    expect(result.ok).toBe(true)
    expect(result.value.shadowedSeqs).toEqual([4, 5])
  })

  it('refuses with `message-pending` when a node after the target is missing from the read', async () => {
    const { session, carrierSeq } = rewoundFixture()
    // The surface is [0, 1, carrier]; the read does not hold the carrier, so it
    // cannot establish that seq 1 is the LAST reply. That is not a claim that it
    // is not — it is a read that does not cover the surface, which is retryable.
    expect(await codeOf({ session, state: { covering: { omit: [carrierSeq] } }, request: { targetSeq: 1, op: 'regenerate' } })).toBe('message-pending')
  })

  it('does not mistake an injected-context user message for the round’s prompt', async () => {
    const session = sessionFixture()
    // A real prompt, then a plugin-injected context message (`source.kind` is
    // not `user`, so it is not a round boundary), then the reply.
    const injected = appendUser(session, { id: 'ctx', text: 'file changed: readme.md', source: 'cordis-host-runner' })
    const reply = appendReply(session, { id: 'a2', text: 'reply two', turn: 2 })

    const { result } = await resolve({ session, request: { targetSeq: reply.seq, op: 'regenerate' } })
    expect(result.ok).toBe(true)
    expect(result.value.resendText).not.toBe('file changed: readme.md')
    // The round still starts where it started: at the prompt it was taken from.
    expect(result.value.rangeStartSeq).toBe(2)
    expect(result.value.shadowedSeqs).toContain(injected.seq)
  })

  it('refuses with `no-text` for a prompt that carries no text block', async () => {
    const session = sessionFixture()
    session.append('user/message', { role: 'user', id: 'u-images', content: [], source: { kind: 'user' } }, { surfaceOp: 'append' })
    const reply = appendReply(session, { id: 'a3', text: 'reply three', turn: 3 })

    const { result } = await resolve({ session, request: { targetSeq: reply.seq, op: 'regenerate' } })
    expect(result.ok).toBe(false)
    expect(result.error.code).toBe('no-text')
  })

  it('refuses with `no-text` for a reply with no prompt on the surface at all', async () => {
    // A session that opens with a reply: there is no round for it to belong to,
    // and guessing one from anywhere is exactly what must not happen.
    const session = Session.create(SESSION_ID)
    const reply = appendReply(session, { id: 'a1', text: 'an orphan reply' })

    const { result } = await resolve({ session, request: { targetSeq: reply.seq, op: 'regenerate' } })
    expect(result.ok).toBe(false)
    expect(result.error.code).toBe('no-text')
  })
})

describe('target-shadowed / message-pending / message-not-found are three verdicts (§4.3, §4.5, §13.1 #14)', () => {
  it('target-shadowed when a carrier’s range covers the target — decided from the log', async () => {
    const { session } = rewoundFixture()
    expect(await codeOf({ session, request: { targetSeq: 2, op: 'edit', text: 'x' } })).toBe('target-shadowed')
    expect(await codeOf({ session, request: { targetSeq: 3, op: 'edit', text: 'x' } })).toBe('target-shadowed')
  })

  it('target-shadowed when the target is off the active surface in both views', async () => {
    const session = sessionFixture()
    // A log-only event: it is in the log, it never joins the surface, and no
    // retry will change that — so it is "off the active surface" (§4.5), not
    // "pending".
    const logOnly = session.append('turn/start', { turn: 2 })

    expect(await codeOf({ session, request: { targetSeq: logOnly.seq, op: 'edit', text: 'x' } })).toBe('target-shadowed')
  })

  it('message-pending when the target is beyond every log the host can show', async () => {
    const session = sessionFixture()

    expect(await codeOf({ session, request: { targetSeq: 9, op: 'edit', text: 'x' } })).toBe('message-pending')
  })

  it('message-pending when the log has it and the live surface has not taken it up yet (§4.3 step 3)', async () => {
    const session = sessionFixture()
    const host = await hostContext(hostState({ session }))
    // The second fact source disagreeing with the log: a surface that lags.
    const lagging = session.surface.nodes.filter((seq) => seq !== 2)

    const result = await resolveTarget(host.ctx, { sessionId: SESSION_ID, targetSeq: 2, op: 'edit', text: 'x' }, lagging)
    expect(result.ok).toBe(false)
    expect(result.error.code).toBe('message-pending')
  })

  it('message-not-found when the covering read reaches past a seq it does not hold', async () => {
    const session = sessionFixture()

    // The stored log mirrors the live one (seqs 0–3), so the absence of seq 2
    // from the read is real.
    expect(await codeOf({ session, state: { covering: { omit: [2] } }, request: { targetSeq: 2, op: 'edit', text: 'x' } })).toBe(
      'message-not-found',
    )
  })

  it('message-pending when the stored log says the seq may still be coming', async () => {
    const session = sessionFixture()

    // A read that does not cover seq 2 while the STORED log stops at seq 1:
    // the file and the surface disagree, which is the retryable case (§4.5).
    expect(
      await codeOf({ session, state: { covering: { omit: [2] }, stored: { mode: 'prefix', count: 2 } }, request: { targetSeq: 2, op: 'edit', text: 'x' } }),
    ).toBe('message-pending')
  })

  it('message-pending when the stored log is materialized but empty', async () => {
    const session = sessionFixture()

    // A stored log that covers nothing makes every seq "not written yet".
    expect(
      await codeOf({ session, state: { covering: { omit: [2] }, stored: { mode: 'empty' } }, request: { targetSeq: 2, op: 'edit', text: 'x' } }),
    ).toBe('message-pending')
  })

  it('falls back to the covering read’s own extent when the stored log cannot answer (§4.5)', async () => {
    const session = sessionFixture()

    // The auxiliary route is unavailable (the empty-and-detached failure), so
    // the read's own extent decides — and it reaches past seq 2.
    expect(
      await codeOf({ session, state: { covering: { omit: [2] }, stored: { mode: 'detached-empty' } }, request: { targetSeq: 2, op: 'edit', text: 'x' } }),
    ).toBe('message-not-found')
  })

  it('never invents a `message-pending` that nothing supports (§4.5)', async () => {
    // An empty session plus an unreadable stored log: no extent exists anywhere,
    // so the answer is the non-retryable one rather than a hopeful "try again".
    const bare = Session.create(SESSION_ID)

    expect(await codeOf({ session: bare, state: { stored: { mode: 'throwing' } }, request: { targetSeq: 0, op: 'edit', text: 'x' } })).toBe(
      'message-not-found',
    )
    expect(bare.seq).toBe(0)
  })

  it('reports a failed replay as `internal` — never as `target-shadowed` — for every input', async () => {
    const session = rewoundFixture().session
    const requests = [
      { targetSeq: 0, op: 'edit', text: 'x' },
      { targetSeq: 1, op: 'edit', text: 'x' },
      { targetSeq: 1, op: 'regenerate' },
      { targetSeq: 2, op: 'edit', text: 'x' },
      { targetSeq: 9, op: 'regenerate' },
      { targetSeq: 4, op: 'edit', text: '   ' },
    ]

    for (const request of requests) {
      const code = await codeOf({ session, state: { covering: { error: 'SESSION_QUERY_CORRUPT_SESSION' } }, request })
      expect(code, `${JSON.stringify(request)} was dressed up as a business conclusion`).toBe('internal')
    }
  })
})

describe('op-specific refusals, in the order §4.3 and §4.4 fix', () => {
  it('edit aimed at a non-user message', async () => {
    const session = sessionFixture()

    expect(await codeOf({ session, request: { targetSeq: 3, op: 'edit', text: 'x' } })).toBe('not-user-message')
  })

  it('regenerate aimed at anything but the last assistant reply', async () => {
    const session = sessionFixture()

    expect(await codeOf({ session, request: { targetSeq: 1, op: 'regenerate' } })).toBe('not-last-reply')
    // A user message is not a reply either.
    expect(await codeOf({ session, request: { targetSeq: 2, op: 'regenerate' } })).toBe('not-last-reply')
  })

  it('regenerate is allowed on the surviving reply after a rewind shadowed a later round', async () => {
    const { session, carrierSeq } = rewoundFixture()
    // The carrier is not an assistant reply, so seq 1 is still the last one.
    expect(await codeOf({ session, request: { targetSeq: carrierSeq, op: 'regenerate' } })).toBe('not-last-reply')

    const { result } = await resolve({ session, request: { targetSeq: 1, op: 'regenerate' } })
    expect(result.ok).toBe(true)
    expect(result.value.resendText).toBe('first prompt')
    expect(result.value.shadowedSeqs).toEqual([0, 1, carrierSeq])
  })

  it('blank-text for an empty or whitespace-only edit, and bad-request when the text is missing', async () => {
    const session = sessionFixture()

    expect(await codeOf({ session, request: { targetSeq: 2, op: 'edit', text: '' } })).toBe('blank-text')
    expect(await codeOf({ session, request: { targetSeq: 2, op: 'edit', text: '   \n' } })).toBe('blank-text')
    // §4.5's rows are deliberately different: a MISSING text is malformed input,
    // and the same wire input says "bad-request" at `apply`'s boundary.
    expect(await codeOf({ session, request: { targetSeq: 2, op: 'edit' } })).toBe('bad-request')
  })

  it('target resolution runs first: a blank edit aimed at a shadowed message is `target-shadowed`', async () => {
    const { session } = rewoundFixture()

    expect(await codeOf({ session, request: { targetSeq: 2, op: 'edit', text: '   ' } })).toBe('target-shadowed')
  })

  it('an unknown op is malformed input at this seam, not "not edit"', async () => {
    const session = sessionFixture()

    expect(await codeOf({ session, request: { targetSeq: 2, op: 'rewind', text: 'x' } })).toBe('bad-request')
  })
})
