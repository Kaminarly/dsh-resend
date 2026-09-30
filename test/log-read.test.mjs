/**
 * The log-reading module (spec §4.2, §12) — driven as the shipped artifact it
 * is: `lib/log-read.js` is emitted on its own precisely so that §12's
 * plugin-side invariant can exempt one small module instead of the whole host
 * half, and so that the two routes can be asserted where they live.
 *
 * What this file is really about: a read either covers what it was asked for or
 * it is a failure. The two ways that can go wrong are both here — a lookup that
 * quietly returns a NEIGHBOUR instead of the event asked for, and the
 * empty-and-detached pair that reads like "the log is empty" (spec §4.2,
 * §16.1).
 */
import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { eventAtSeq, lastSeqOf, readCoveringLog, readFileMaxSeq } from '../lib/log-read.js'
import { sessionFixture, hostContext, hostState, SESSION_ID } from './helpers/host.mjs'

const coveringRefusal = async (covering) => {
  const { ctx } = await hostContext(hostState({ covering }))
  return readCoveringLog(ctx, SESSION_ID)
}

const fileFacts = async (stored) => {
  const { ctx, state } = await hostContext(hostState({ stored }))
  return { facts: await readFileMaxSeq(ctx, SESSION_ID), state }
}

describe('route (2): the covering read (spec §4.2)', () => {
  it('returns the live session’s own log, with the extent it covers', async () => {
    const { ctx } = await hostContext()
    const covering = await readCoveringLog(ctx, SESSION_ID)

    expect(covering.status).toBe('ok')
    expect(covering.log.map((event) => event.seq)).toEqual([0, 1, 2, 3])
    expect(covering.lastCoveredSeq).toBe(3)
    // A non-vacuity guard: this is the host's own snapshot, event for event.
    expect(covering.log.map((event) => event.type)).toEqual(['user/message', 'assistant/message', 'user/message', 'assistant/message'])
  })

  it('classifies a corrupt replay as `replay-failed` — never as a shadowed target', async () => {
    const covering = await coveringRefusal({ error: 'SESSION_QUERY_CORRUPT_SESSION' })

    expect(covering.status).toBe('refused')
    expect(covering.reason).toBe('replay-failed')
  })

  it('classifies a persistence failure as `not-persisted`', async () => {
    const covering = await coveringRefusal({ error: 'SESSION_QUERY_PERSISTENCE_FAILED' })

    expect(covering.status).toBe('refused')
    expect(covering.reason).toBe('not-persisted')
  })

  it('classifies an unknown session as `session-not-found`', async () => {
    const covering = await coveringRefusal({ error: 'SESSION_QUERY_SESSION_NOT_FOUND' })

    expect(covering.status).toBe('refused')
    expect(covering.reason).toBe('session-not-found')
  })

  it('classifies a code it does not know as `internal`, not as a business conclusion', async () => {
    const covering = await coveringRefusal({ error: 'SESSION_QUERY_SOMETHING_NEW' })

    expect(covering.status).toBe('refused')
    expect(covering.reason).toBe('internal')
  })

  it('refuses, rather than throwing, when the composition has no query service', async () => {
    // A context that never registered the service. "No service" is a refusal, not
    // an exception — an unhandled throw out of a Remote method is not a business
    // outcome (spec §4.5).
    const bare = new Context()
    expect(bare.get('sessionQuery')).toBeUndefined()

    const covering = await readCoveringLog(bare, SESSION_ID)
    expect(covering.status).toBe('refused')
    expect(covering.reason).toBe('internal')
    expect(covering.detail).toContain('sessionQuery')
  })
})

describe('route (1): fileMaxSeq, the last seq the STORED log covers (spec §4.2, §4.5)', () => {
  it('answers with the stored log’s last seq, and borrows the route read-only', async () => {
    const { facts, state } = await fileFacts('mirror')

    expect(facts).toEqual({ status: 'known', fileMaxSeq: 3 })
    // It never takes write ownership, and it gives the handle back.
    expect(state.calls.storedAccess).toEqual(['read'])
    expect(state.calls.storedCloses).toBe(1)
  })

  it('answers with the lagging stored log’s extent, not the live one', async () => {
    const { facts } = await fileFacts({ mode: 'prefix', count: 2 })

    expect(facts).toEqual({ status: 'known', fileMaxSeq: 1 })
  })

  it('treats an empty-and-detached read as a FAILURE, not as an empty log', async () => {
    const { facts } = await fileFacts({ mode: 'detached-empty' })

    expect(facts.status).toBe('unknown')
    expect(facts.detail).toContain('detached')
  })

  it('reports a materialized log with no events as covering no seq at all', async () => {
    const { facts } = await fileFacts({ mode: 'empty' })

    // `-1` is a fact, not a missing answer: every seq is beyond a log that holds
    // nothing, which is what §4.5's `targetSeq > fileMaxSeq` branch exists for.
    expect(facts).toEqual({ status: 'known', fileMaxSeq: -1 })
  })

  it('reports unknown when there is no stored session', async () => {
    const { facts } = await fileFacts({ mode: 'not-found' })

    expect(facts.status).toBe('unknown')
  })

  it('reports unknown — never a throw — when the stored log cannot be read', async () => {
    const { facts, state } = await fileFacts({ mode: 'throwing' })

    expect(facts.status).toBe('unknown')
    expect(state.calls.storedCloses).toBe(1)
  })

  it('reports unknown when the composition has no persistence service', async () => {
    const bare = new Context()
    expect(bare.get('sessionPersistence')).toBeUndefined()

    const facts = await readFileMaxSeq(bare, SESSION_ID)

    expect(facts.status).toBe('unknown')
    expect(facts.detail).toContain('sessionPersistence')
  })
})

describe('exact-seq lookup: a miss is a miss', () => {
  it('never returns a neighbour for a seq the read does not hold', () => {
    const session = sessionFixture()
    const log = session.snapshotEvents().filter((event) => event.seq !== 1)

    expect(log.map((event) => event.seq)).toEqual([0, 2, 3])
    // The two neighbours are present and this still answers "no event".
    expect(eventAtSeq(log, 1)).toBeUndefined()
    expect(eventAtSeq(log, 2)?.seq).toBe(2)
  })

  it('tolerates a hole in the array as well as a filtered list', () => {
    const session = sessionFixture()
    const log = [...session.snapshotEvents()]
    delete log[2]

    expect(eventAtSeq(log, 2)).toBeUndefined()
    expect(eventAtSeq(log, 3)?.seq).toBe(3)
    // The extent is the farthest seq present, which is what the fallback in
    // §4.5 measures — not the array's length.
    expect(lastSeqOf(log)).toBe(3)
  })

  it('answers `undefined` for an empty read, so no extent can be invented', () => {
    expect(lastSeqOf([])).toBeUndefined()
  })
})
