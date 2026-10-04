/**
 * The resend, and "rewind succeeded, resend failed" (spec §5.5, §9.4; ticket 05).
 *
 * Two behaviours are under test, and they are deliberately different states:
 *
 *  - a rewind whose prompt the agent TOOK: the carrier renders nothing, so the
 *    message `followup` queued is the only new row the user sees, and the
 *    envelope reports the id of that message (§4.1's `resendMessageId`);
 *  - a rewind whose prompt the agent did NOT take: the rewind stands — it was
 *    flushed before the call — and the envelope says so by omitting that id. The
 *    client renders the §9.4 error row with its "Send again" button, and pressing
 *    it re-sends the SAME request: this suite holds that to "one more `followup`,
 *    no second `compaction/prune`, no second flush".
 *
 * What is NOT here is the third state: a turn the agent accepted and which then
 * failed. That one belongs to the agent's own reporting (§9.4), and the case
 * below asserts the plugin's whole contribution to it — that it changes nothing,
 * claims nothing, and leaves a state the host's own retry entry can work from.
 */
import { describe, expect, it } from 'vitest'
import { carrierIdFor, isCarrierIdFor, resendIdFor } from '../lib/marker.js'
import { TYPERT } from '../lib/typert.host.js'
import { dispatchToHost, hostComposition } from './helpers/gateway.mjs'
import {
  agentDoubles,
  appendReply,
  appendRewindPair,
  auditCount,
  captureLogs,
  completedRewindFixture,
  foreignRewindFixture,
  hostState,
  logOf,
  openingTurnAgent,
  rewoundFixture,
  SECOND_PROMPT,
  SESSION_ID,
  sessionFixture,
  withRefusingAppend,
} from './helpers/host.mjs'

/** One composition over a given host state, with its log lines captured. */
async function compose(state) {
  const host = await hostComposition({ host: state })
  return { host, logs: captureLogs(host.ctx) }
}

/** Dispatch one `resend.apply` through the real Gateway, over a host state. */
async function apply(state, request) {
  const { host, logs } = await compose(state)
  return { envelope: await dispatch(host, request), host, logs, session: state.session }
}

/** Dispatch one call through an EXISTING composition (to move the host between calls). */
async function dispatch(host, request) {
  const wire = await dispatchToHost(host, 'resend/apply', { request: { sessionId: SESSION_ID, ...request } })
  expect(wire.ok, `the boundary refused the call: ${JSON.stringify(wire.error)}`).toBe(true)
  return wire.value
}

/** The prompt one `followup` call carried. */
function promptOf(input) {
  return input.content.map((block) => block.text).join('\n')
}

describe('the resend is the message the user sees, and it carries the id the envelope names (§4.1, §5.5)', () => {
  it('hands the agent the plain four-member message, exactly once, after the flush', async () => {
    const session = sessionFixture()
    // `'delivering'` is the agent loop's own act: it appends the claimed input
    // VERBATIM through the host's append contract, so a wrong message shape or a
    // lost id fails here rather than passing a fixture nobody checks.
    const state = hostState({ session, agent: 'delivering' })
    const { envelope, host } = await apply(state, { targetSeq: 2, op: 'edit', text: 'edited' })
    const [input] = state.calls.followupInputs

    // §5.5's call, in one statement, after §5.2's one flush.
    expect(state.calls.followups).toBe(1)
    expect(state.calls.trace).toEqual(['flush', 'followup'])
    expect(Object.keys(input).sort()).toEqual(['content', 'id', 'role', 'source'])
    expect(input.role).toBe('user')
    expect(input.content).toEqual([{ type: 'text', text: 'edited' }])
    expect(input.source).toEqual({ kind: 'user' })

    // The id is the one the SUCCESS ENVELOPE reports, and it is the id of the
    // message that reached the session — `resendMessageId` is not a promise about
    // a row nobody can find (`createUserMessage` would have replaced it).
    expect(envelope.value.resendMessageId).toBe(input.id)
    const delivered = session.eventAt(session.seq - 1)
    expect(delivered.type).toBe('user/message')
    expect(delivered.surfaceOp).toBe('append')
    expect(delivered.data.id).toBe(envelope.value.resendMessageId)
    expect(delivered.data.source).toEqual({ kind: 'user' })
    expect(promptOf(delivered.data)).toBe('edited')

    // The rewind itself is untouched by the resend: one claim, one carrier, one
    // flush, and the resent message is the only thing after them.
    expect(auditCount(session)).toBe(1)
    expect(envelope.value.carrierSeq).toBe(5)
    expect(envelope.value.shadowedSeqs).toEqual([2, 3])
    expect(session.surface.nodes).toEqual([0, 1, 5, 6])
    expect(host.host.calls.flushes).toBe(1)
  })

  it('never awaits the value that is not a promise: a poisoned thenable is never touched (§5.5, §16.2)', async () => {
    const session = sessionFixture()
    const state = hostState({ session })
    let thensRead = 0
    state.agent = {
      status: 'idle',
      followup(input) {
        state.calls.followups += 1
        state.calls.followupInputs.push(input)
        this.status = 'running'
        // `followup` returns `undefined` on this host — not a thenable — and this
        // is that fact with teeth: a single `await` on the call site would read
        // this member, and the acceptance check below would never see a running
        // agent.
        return { then() { thensRead += 1 } }
      },
    }

    const { envelope } = await apply(state, { targetSeq: 2, op: 'edit', text: 'edited' })

    expect(thensRead).toBe(0)
    expect(envelope.ok).toBe(true)
    expect(typeof envelope.value.resendMessageId).toBe('string')
  })

  it('a disposed agent is a business answer, not a throw: the rewind stands and no id is reported (§16.2, §9.4)', async () => {
    const session = sessionFixture()
    // The measured shape of `followup` on a disposed agent: it returns nothing,
    // throws nothing, and leaves `status` where it was. `agent.status` is the one
    // acceptance signal there is, so this is the acceptance failure.
    const state = hostState({ session, agent: 'deaf' })
    const probe = { role: 'user', id: 'probe', content: [{ type: 'text', text: 'probe' }], source: { kind: 'user' } }
    const handoffs = state.calls.followups
    // Held to the double before the plugin touches it: what the measured host
    // returns is NOTHING — no promise, nothing to await, nothing to catch.
    expect(state.agent.followup(probe)).toBeUndefined()
    expect(state.agent.status).toBe('idle')

    const { envelope, host, logs } = await apply(state, { targetSeq: 2, op: 'edit', text: 'edited' })

    expect(envelope.ok).toBe(true)
    expect(envelope.value).toEqual({ carrierSeq: 5, shadowedSeqs: [2, 3] })
    expect(Object.hasOwn(envelope.value, 'resendMessageId')).toBe(false)

    // The rewind is durable and complete: it is not undone, retried or re-marked
    // because the prompt was not taken.
    expect(session.seq).toBe(6)
    expect(auditCount(session)).toBe(1)
    expect(session.surface.nodes).toEqual([0, 1, 5])
    expect(host.host.calls.flushes).toBe(1)
    expect(state.calls.followups).toBe(handoffs + 2)
    expect(logs.some((line) => line.args.join(' ').includes('did not take the prompt'))).toBe(true)
  })

  it('the strict result codec takes a success without the id, and still refuses an unknown member (§6.3)', () => {
    const schema = TYPERT.invocations[0].result.create()

    expect(schema.safeParse({ ok: true, value: { carrierSeq: 5, shadowedSeqs: [2, 3] } }).success).toBe(true)
    expect(schema.safeParse({ ok: true, value: { carrierSeq: 5, shadowedSeqs: [2, 3], resendMessageId: 'dsh-resend-edit-x-resend' } }).success).toBe(true)
    expect(schema.safeParse({ ok: true, value: { carrierSeq: 5, shadowedSeqs: [2, 3], resendAccepted: false } }).success).toBe(false)
  })
})

describe('"Send again" re-sends the same prompt without performing another rewind (§9.4)', () => {
  /** The state one failed resend leaves: the pair, and no message after it. */
  async function failedResend() {
    const session = sessionFixture()
    const state = hostState({ session, agent: 'deaf' })
    const first = await apply(state, { targetSeq: 2, op: 'edit', text: 'edited' })
    expect(first.envelope.ok).toBe(true)
    expect(Object.hasOwn(first.envelope.value, 'resendMessageId')).toBe(false)
    return { session, state, first }
  }

  it('replays the same request: one more `followup`, no second audit claim, no second flush', async () => {
    const { session, state } = await failedResend()
    const before = { seq: session.seq, audits: auditCount(session), flushes: state.calls.flushes }
    const carrierId = session.eventAt(5).data.id

    // The agent comes back — the situation the button exists for.
    state.agent = agentDoubles(state).delivering()
    const { envelope } = await apply(state, { targetSeq: 2, op: 'edit', text: 'edited' })

    expect(envelope.ok).toBe(true)
    expect(envelope.value.carrierSeq).toBe(5)
    expect(envelope.value.shadowedSeqs).toEqual([2, 3])
    // The id is DERIVED from the carrier that already exists, restated here from
    // the log rather than taken from the module that computes it.
    expect(envelope.value.resendMessageId).toBe(`${carrierId}-resend`)
    expect(state.calls.followupInputs[1].id).toBe(`${carrierId}-resend`)
    expect(promptOf(state.calls.followupInputs[1])).toBe('edited')

    // "Without another rewind", measured on the log: no new claim, no new
    // carrier, no flush — and the only seq spent is the resent message's own.
    expect(state.calls.followups).toBe(2)
    expect(state.calls.trace).toEqual(['flush', 'followup', 'followup'])
    expect(auditCount(session)).toBe(before.audits)
    expect(state.calls.flushes).toBe(before.flushes)
    expect(session.seq).toBe(before.seq + 1)
    expect(session.eventAt(session.seq - 1).data.id).toBe(`${carrierId}-resend`)
  })

  it('is not repeatable once the prompt landed: the same request becomes read-only history', async () => {
    const { session, state } = await failedResend()
    state.agent = agentDoubles(state).delivering()
    await apply(state, { targetSeq: 2, op: 'edit', text: 'edited' })

    // The turn is over, so the agent is idle again and a third press — or a stale
    // client — reaches resolution. What refuses it there is the LOG: the message
    // the carrier's id derives is already in it, so there is nothing owed.
    state.agent.status = 'idle'
    const { envelope } = await apply(state, { targetSeq: 2, op: 'edit', text: 'edited' })
    expect(envelope).toEqual({ ok: false, error: { code: 'target-shadowed' } })
    expect(state.calls.followups).toBe(2)
  })

  it('serializes two presses into at most one prompt, and writes nothing at all (§4.6, §9.4)', async () => {
    const { session, state } = await failedResend()
    const handoffs = state.calls.followups
    const flushes = state.calls.flushes
    state.agent = agentDoubles(state).delivering()
    const host = await hostComposition({ host: state })

    // Two fast presses of "Send again": both calls reach the host, and the
    // per-session lock plus §4.4 rule 4 must leave exactly ONE prompt queued.
    const [first, second] = await Promise.all([
      dispatch(host, { targetSeq: 2, op: 'edit', text: 'edited' }),
      dispatch(host, { targetSeq: 2, op: 'edit', text: 'edited' }),
    ])
    const envelopes = [first, second]

    expect(envelopes.filter((envelope) => envelope.ok)).toHaveLength(1)
    // The loser is refused from the LOG — by the time it holds the lock, the
    // message the carrier's id derives is in it, so there is nothing owed. (Were
    // the message still in flight, §4.4 rule 4 would refuse it instead: the case
    // above drives that one.)
    expect(envelopes.find((envelope) => !envelope.ok)?.error.code).toBe('target-shadowed')
    expect(state.calls.followups).toBe(handoffs + 1)
    // Neither press rewound anything: no new claim, no flush, and the only seq
    // spent is the one prompt that was actually queued.
    expect(auditCount(session)).toBe(1)
    expect(state.calls.flushes).toBe(flushes)
    expect(session.seq).toBe(7)
  })

  it('a regenerate re-sends the round’s prompt, read from the log and not from the client (§4.3, §9.2)', async () => {
    const session = sessionFixture()
    // A regenerate rewind of ours whose resend never landed. Its range starts at
    // the round's prompt, which is where the re-send text comes from.
    appendRewindPair(session, { rangeStartSeq: 2, endSeq: 3, shadowedSeqs: [2, 3] }, { id: 'dsh-resend-regenerate-fixture' })
    const state = hostState({ session, agent: 'delivering' })

    const { envelope } = await apply(state, { targetSeq: 3, op: 'regenerate' })

    expect(envelope.ok).toBe(true)
    expect(envelope.value.resendMessageId).toBe('dsh-resend-regenerate-fixture-resend')
    expect(promptOf(state.calls.followupInputs[0])).toBe(SECOND_PROMPT)
    expect(promptOf(state.calls.followupInputs[0])).not.toBe('')
  })

  it('never treats another plugin’s carrier, or another operation’s, as its own', async () => {
    const foreign = foreignRewindFixture()
    const foreignState = hostState({ session: foreign.session })
    const foreignResult = await apply(foreignState, { targetSeq: 2, op: 'edit', text: 'edited' })
    expect(foreignResult.envelope.error.code).toBe('target-shadowed')
    expect(foreignState.calls.followups).toBe(0)

    // An EDIT carrier must not answer a regenerate: the prompt would be the
    // wrong one, and the two operations resolve their text differently.
    const ours = rewoundFixture()
    const oursState = hostState({ session: ours.session })
    const wrongOp = await apply(oursState, { targetSeq: 3, op: 'regenerate' })
    expect(wrongOp.envelope.error.code).toBe('target-shadowed')
    expect(oursState.calls.followups).toBe(0)

    // And a FINISHED rewind of ours is ordinary history too.
    const completed = completedRewindFixture()
    const completedState = hostState({ session: completed.session })
    const completedResult = await apply(completedState, { targetSeq: 2, op: 'edit', text: 'edited' })
    expect(completedResult.envelope.error.code).toBe('target-shadowed')
    expect(completedState.calls.followups).toBe(0)
  })

  it('keeps §4.4 step 6 in force: a blank or missing edit text is refused, and nothing is sent', async () => {
    const { session, state } = await failedResend()

    const blank = await apply(state, { targetSeq: 2, op: 'edit', text: '   ' })
    expect(blank.envelope.error.code).toBe('blank-text')
    const missing = await apply(state, { targetSeq: 2, op: 'edit' })
    expect(missing.envelope.error.code).toBe('bad-request')
    expect(state.calls.followups).toBe(1)
    expect(session.seq).toBe(6)
  })

  it('refuses `no-text` rather than sending an empty prompt when the rewind’s prompt has no text (§4.3)', async () => {
    const session = sessionFixture()
    // An image-only prompt, rewritten: the re-send has nothing to send.
    const imageOnly = session.append(
      'user/message',
      { role: 'user', id: 'u-images', content: [], source: { kind: 'user' } },
      { surfaceOp: 'append' },
    )
    const reply = appendReply(session, { id: 'a3', text: 'reply three', turn: 3 })
    appendRewindPair(session, { rangeStartSeq: imageOnly.seq, endSeq: reply.seq, shadowedSeqs: [imageOnly.seq, reply.seq] }, { id: 'dsh-resend-regenerate-images' })
    const state = hostState({ session })

    const { envelope } = await apply(state, { targetSeq: reply.seq, op: 'regenerate' })

    expect(envelope.error.code).toBe('no-text')
    expect(state.calls.followups).toBe(0)
  })

  it('refuses `agent-busy` when a turn opened while the re-send waited for the lock (§4.4 rule 4)', async () => {
    const { state } = await failedResend()
    const handoffs = state.calls.followups
    // Idle for `apply`'s own rule-4 read, running by the time the locked body
    // re-reads it — the race the retry must not queue a prompt into.
    state.agent = openingTurnAgent({ afterReads: 1 })

    const { envelope } = await apply(state, { targetSeq: 2, op: 'edit', text: 'edited' })

    expect(envelope.error.code).toBe('agent-busy')
    expect(state.calls.followups).toBe(handoffs)
  })
})

describe('an accepted turn that later fails is the agent’s own reporting (§9.4)', () => {
  it('changes nothing, claims nothing, and leaves the host’s retry entry a coherent state', async () => {
    const session = sessionFixture()
    const state = hostState({ session, agent: 'delivering' })
    const { envelope } = await apply(state, { targetSeq: 2, op: 'edit', text: 'edited' })
    expect(typeof envelope.value.resendMessageId).toBe('string')

    const before = logOf(session).map((event) => event.type)
    // The turn runs and fails, in the agent's own words, at the same turn.
    session.append('turn/end', { turn: 1, reason: { kind: 'error', error: { message: 'the model refused' } } })
    const after = logOf(session).map((event) => event.type)

    // The plugin's whole contribution: nothing. No row, no failure claim, no
    // attempt to un-rewind — the one appended event is the host's own turn end.
    expect(after.slice(before.length)).toEqual(['turn/end'])
    expect(auditCount(session)).toBe(1)
    expect(state.calls.flushes).toBe(1)
    expect(state.calls.followups).toBe(1)

    // The state a failed turn leaves is the state a successful one leaves: the
    // range is shadowed, the new text is appended, and the plugin offers no
    // second entry of its own (the host's retry affordance is the recovery).
    expect(session.surface.nodes).toEqual([0, 1, 5, 6])
    // The failed turn is over, so the agent is idle again; a retry on this target
    // is then refused from the LOG — the prompt was already queued.
    state.agent.status = 'idle'
    const again = await apply(state, { targetSeq: 2, op: 'edit', text: 'edited' })
    expect(again.envelope.error.code).toBe('target-shadowed')
  })

  it('never shows §9.4’s row for a rewind that did not land: the orphan claim is a failure, not a resend', async () => {
    const session = withRefusingAppend(sessionFixture(), { onType: 'user/message', message: 'the host refused this event' })
    const state = hostState({ session })
    const host = await hostComposition({ host: state })
    const logs = captureLogs(host.ctx)

    const wire = await dispatchToHost(host, 'resend/apply', { request: { sessionId: SESSION_ID, targetSeq: 2, op: 'edit', text: 'edited' } })

    // §11's row for this case is reported as a FAILURE with the orphan named: no
    // carrier landed, so there is no rewind point for a §9.4 row to describe, and
    // claiming a rewound history here would be the mirror image of the lie §9.4
    // forbids.
    expect(wire.value.ok).toBe(false)
    expect(wire.value.error.code).toBe('internal')
    expect(auditCount(session)).toBe(1)
    expect(state.calls.flushes).toBe(1)
    expect(state.calls.followups).toBe(0)
    expect(logs.some((line) => line.args.join(' ').includes('ORPHAN audit claim'))).toBe(true)
  })
})

describe('the plugin’s own event identities (§5.4, §9.4)', () => {
  it('derives the resend message’s id from the carrier’s, under one prefix', () => {
    const carrierId = carrierIdFor('edit', 'abc-123')

    expect(carrierId).toBe('dsh-resend-edit-abc-123')
    expect(resendIdFor(carrierId)).toBe('dsh-resend-edit-abc-123-resend')
    expect(carrierIdFor('regenerate', 'abc-123')).toBe('dsh-resend-regenerate-abc-123')
  })

  it('recognizes only its own carriers, and only for the operation asked about', () => {
    expect(isCarrierIdFor('edit', 'dsh-resend-edit-abc')).toBe(true)
    expect(isCarrierIdFor('regenerate', 'dsh-resend-regenerate-abc')).toBe(true)

    expect(isCarrierIdFor('regenerate', 'dsh-resend-edit-abc')).toBe(false)
    expect(isCarrierIdFor('edit', 'another-plugin-carrier')).toBe(false)
    expect(isCarrierIdFor('edit', undefined)).toBe(false)
  })
})
