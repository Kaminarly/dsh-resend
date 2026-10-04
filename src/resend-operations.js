/**
 * The client's side of one operation: the ONE call site, the outcome it records
 * at the rewind point, and "Send again" (spec §9.4; ticket 05).
 *
 * One call site, deliberately: §9.1's rule is that rewind and send are never two
 * affordances, so the editor's Send and the regenerate control both come here,
 * and this is also the only place that knows what the host answered. What it
 * answers decides which of the two states a rewind point is in:
 *
 *  - `queued` — the envelope carried `resendMessageId`, so the prompt reached the
 *    agent, and the rewind point is ordinary and renders its count notice;
 *  - `resend-failed` — the envelope was a SUCCESS without it, i.e. the rewind
 *    landed and the agent did not take the prompt. §9.4's error row, with the
 *    "Send again" button, is what the user gets, and pressing it replays this
 *    record's own request (the host then re-sends without a second rewind).
 *
 * A refusal records nothing, and that is the honest reading: a refusal before the
 * write changed nothing, and `internal` is the one bucket where this client
 * cannot know whether a pair landed — claiming a rewind point for it would be
 * §9.4's forbidden claim, "report failure over a surface it has already changed",
 * from the other side.
 *
 * The record lives for this page load. A reload loses the re-send it enables —
 * along with the edited text that re-send would carry, which is client state by
 * construction — so the row falls back to the rewind point's ordinary state
 * rather than offering a button that could not work.
 */

/** The status of a rewind point whose prompt the agent did not take (spec §9.4). */
export const RESEND_FAILED = 'resend-failed'

/**
 * Build the operations object one page's client half uses.
 *
 * Every point of the API is addressed by ONE value — `{ sessionId, carrierSeq }`,
 * a rewind point's address (see `CONTEXT.md`) — rather than by the two fields
 * travelling separately, because they are never meaningful apart.
 * @param remote - the Gateway's client service (`ctx.remote`), whose mounted
 *   namespaces carry `resend.apply`.
 * @returns the page's operations: `run`, `outcomeOf`, `sendAgain`, `subscribe`
 *   and `dispose`.
 */
export function createResendOperations(remote) {
  /** `sessionId` → `carrierSeq` → the frozen record of that rewind point. */
  const bySession = new Map()
  const recordsBySession = new Map()
  const emptyRecords = Object.freeze([])
  const listeners = new Set()

  const notify = () => {
    for (const listener of Array.from(listeners)) listener()
  }

  /**
   * The record kept for one rewind point, or `undefined`.
   * @param point - `{ sessionId, carrierSeq }`.
   * @returns the frozen record, or `undefined` when this page kept none.
   */
  const outcomeOf = ({ sessionId, carrierSeq }) => bySession.get(sessionId)?.get(carrierSeq)

  /**
   * Record one successful call at the rewind point it produced.
   * @param request - the request that was sent, kept for "Send again".
   * @param result - the `RemoteResult` the host answered.
   */
  function record(request, result) {
    if (result?.ok !== true) return
    const { carrierSeq, shadowedSeqs, resendMessageId } = result.value
    const records = bySession.get(request.sessionId) ?? new Map()
    bySession.set(request.sessionId, records)
    records.set(
      carrierSeq,
      Object.freeze({
        // The request as it was SENT, copied: "Send again" must replay the values
        // this call used, not whatever the caller's object happens to hold later.
        request: Object.freeze({ ...request }),
        carrierSeq,
        shadowedSeqs: Object.freeze([...shadowedSeqs]),
        status: resendMessageId === undefined ? RESEND_FAILED : 'queued',
      }),
    )
    recordsBySession.set(request.sessionId, Object.freeze([...records.values()]))
    notify()
  }

  /**
   * Perform one operation end to end: one Remote call, one recorded outcome.
   * @param request - `ResendApplyRequest`, including the session.
   * @returns the host's `RemoteResult`.
   */
  async function run(request) {
    const result = await remote.resend.apply(request)
    record(request, result)
    return result
  }

  return {
    run,
    outcomeOf,
    recordsFor: (sessionId) => recordsBySession.get(sessionId) ?? emptyRecords,
    /**
     * "Send again" (spec §9.4): replay the SAME request, so the host re-sends the
     * prompt and performs no second rewind. A point with no record has nothing to
     * replay, and says so by answering `undefined` rather than inventing one.
     * @param point - `{ sessionId, carrierSeq }`.
     * @returns the host's `RemoteResult`, or `undefined` when there is nothing to
     *   replay.
     */
    async sendAgain(point) {
      const entry = outcomeOf(point)
      if (entry === undefined) return undefined
      return run(entry.request)
    },
    /**
     * Subscribe to outcome changes.
     * @param listener - called whenever a record is added or replaced.
     * @returns the unsubscriber.
     */
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    /** Drop this page's records and listeners when the plugin unloads. */
    dispose() {
      bySession.clear()
      recordsBySession.clear()
      listeners.clear()
    },
  }
}
