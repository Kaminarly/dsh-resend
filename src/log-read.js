/**
 * The log-reading module — the ONE file that spells the host's raw event-list
 * member (spec §4.2, §12).
 *
 * Every other file in this package reads a covering log through the normalized
 * value this module returns (`log`, `lastCoveredSeq`), never through the host's
 * own member name. That is what keeps §12's plugin-side invariant meaningful:
 * `scripts/check-host-contract.mjs` scans the tree for a legacy event-view read
 * and exempts exactly this path (plus its built artifact), so the exemption is a
 * property of one small module instead of a hole in the whole host half.
 *
 * The rule this module exists to serve (spec §4.2):
 *
 *   Derive the range and the resend text from a log read that COVERS the target.
 *   A read that does not cover it is a failure — never a licence to scan
 *   whatever event list happens to be at hand. A scan that steps over a missing
 *   seq silently selects the WRONG earlier message; that is this plugin's most
 *   expensive defect class, and the production incident behind it sent the
 *   previous round's prompt.
 *
 * Two routes, and they are not interchangeable:
 *
 *  - **primary** — `sessionQuery.readSession(id)` (spec §4.2 route (2)): the
 *    replay-validated complete log. For a live session it also covers appends
 *    the plugin has just made and not yet flushed, and its event list is dense
 *    and indexed by seq, which is what makes an exact-seq lookup meaningful.
 *    Its refusals are refusals: `SESSION_QUERY_CORRUPT_SESSION` is the
 *    `replay-failed` state of spec §4.5, and it MUST NEVER be reported as
 *    "the target was already rewound".
 *  - **auxiliary** — `sessionPersistence.open(id, 'read')` (route (1)): it
 *    never takes write ownership, and its only job here is `fileMaxSeq`, the
 *    last seq the STORED log covers, because §4.5's
 *    `message-pending`/`message-not-found` discrimination is defined on
 *    `{ fileMaxSeq, targetSeq }`.
 *
 * `{ eventState: 'detached', events: [] }` is a FAILURE, not "the log is
 * empty" (spec §4.2, measured in §16.1): a session created but not yet
 * materialized returns exactly that pair with no throw, and reading it as
 * "there is nothing here" is how this route silently corrupts a range.
 * `detached` is a normal state on a materialized read — only the empty-and-
 * detached pair is the failure.
 */
import { asArray, describeError, hostService } from './host.js'

/**
 * How one covering-read refusal becomes a business code (spec §4.5).
 *
 * The refusal vocabulary here is this route's own; the business vocabulary is
 * the closed one on the wire. `not-persisted` is the "not yet written / the file
 * could not be read" state and maps to `message-pending`, the retryable bucket.
 * `replay-failed` gets `internal`: the closed vocabulary has no code of its own
 * for a log that will not replay, and the one thing it must never become is
 * `target-shadowed` — a failed internal replay dressed as "history is
 * read-only" is a lie the user cannot act on.
 *
 * Both readers of the covering log (resolution and the write) map a refusal
 * through this one table, so a route that starts refusing differently cannot be
 * classified two ways.
 */
const REFUSAL_CODES = Object.freeze({
  'not-persisted': 'message-pending',
  'replay-failed': 'internal',
  'session-not-found': 'session-not-found',
  internal: 'internal',
})

/**
 * The business code for one covering-read refusal.
 * @param reason - a reason from {@link readCoveringLog}'s refusal branch.
 * @returns one of spec §4.5's codes; an unrecognized reason is `internal`,
 *   because an unexpected fault has its own bucket and may never masquerade as
 *   a business conclusion.
 */
export function coveringRefusalCode(reason) {
  return REFUSAL_CODES[reason] ?? 'internal'
}

/**
 * The last seq an event list covers, or `undefined` when it covers none.
 *
 * The maximum is taken rather than the last element's own seq because a read is
 * only trusted to be dense — not guaranteed to be (spec §16.1 measured it dense
 * on this host, and §4.2's rule is precisely about reads that are not).
 * @param log - the event list as the host returned it.
 * @returns the largest `seq` present, or `undefined`.
 */
export function lastSeqOf(log) {
  let last
  for (const event of log) {
    if (typeof event?.seq === 'number' && (last === undefined || event.seq > last)) last = event.seq
  }
  return last
}

/**
 * The event stored at exactly this seq, or `undefined`.
 *
 * Exact match only, and this is the point: a miss is a miss. Finding "the
 * nearest earlier event" is the bug this module exists to prevent, so nothing
 * here ever returns a neighbour. The indexed fast path is the shipped host's
 * shape (dense, seq-indexed events); the scan behind it keeps the lookup
 * correct for a read that is short or hole-y, where the fast path would read a
 * different event than the one asked for.
 * @param log - the event list as the host returned it.
 * @param seq - the seq the caller asked for.
 * @returns the event whose own `seq` equals `seq`, or `undefined`.
 */
export function eventAtSeq(log, seq) {
  const indexed = log[seq]
  if (indexed !== undefined && indexed?.seq === seq) return indexed
  return log.find((event) => event?.seq === seq)
}

/**
 * Classify one `sessionQuery.readSession` refusal into spec §4.5's explicit
 * states. An unrecognized code is `internal` — an unexpected fault has its own
 * bucket, and it is never allowed to masquerade as a business conclusion.
 * @param error - the thrown value.
 * @returns `'replay-failed' | 'not-persisted' | 'session-not-found' | 'internal'`.
 */
function queryRefusalReason(error) {
  switch (error?.code) {
    case 'SESSION_QUERY_CORRUPT_SESSION':
      return 'replay-failed'
    case 'SESSION_QUERY_PERSISTENCE_FAILED':
      return 'not-persisted'
    case 'SESSION_QUERY_SESSION_NOT_FOUND':
      return 'session-not-found'
    default:
      return 'internal'
  }
}

/**
 * Read the covering log for one session (spec §4.2 route (2)).
 *
 * Never throws for a host fault: every refusal comes back classified, because a
 * remote call's business outcome must not be an exception (§4.5).
 * @param ctx - the host context.
 * @param sessionId - the session to read.
 * @returns `{ status: 'ok', log, lastCoveredSeq }`, or
 *   `{ status: 'refused', reason, detail }` with `reason` one of
 *   `'not-persisted' | 'replay-failed' | 'session-not-found' | 'internal'`.
 */
export async function readCoveringLog(ctx, sessionId) {
  const query = hostService(ctx, 'sessionQuery')
  if (query === undefined) {
    return { status: 'refused', reason: 'internal', detail: 'the sessionQuery service is not in this composition' }
  }

  let covering
  try {
    covering = await query.readSession(sessionId)
  } catch (error) {
    return { status: 'refused', reason: queryRefusalReason(error), detail: describeError(error) }
  }

  // Only the event list is taken. The route also answers with the session's
  // HEADER (`covering.session`), which is a structured clone and not a live
  // handle: the live session still comes from `sessions.get(id)` (spec §4.2).
  // Reading the surface out of the header here would be reading a snapshot that
  // knows nothing about the plugin's own latest appends.
  const log = asArray(covering?.events)
  return { status: 'ok', log, lastCoveredSeq: lastSeqOf(log) }
}

/**
 * Read `fileMaxSeq` — the last seq the STORED log covers (spec §4.2 route (1),
 * §4.5).
 *
 * Unknown is a legitimate answer and the caller must handle it: the auxiliary
 * route takes no write ownership, and a session with no file yet, an
 * empty-and-detached read, or a failed read all mean the fact is simply not
 * available. The caller then falls back to the covering read's own extent
 * rather than inventing a `message-pending` it cannot support (§4.5).
 *
 * The read handle is closed again. Closing a READ handle only drops it from the
 * backend's open-handle bookkeeping — the pending record of a
 * created-but-unmaterialized session is a WRITE handle's to release — so this
 * borrows the route without changing what the session's owner sees.
 * @param ctx - the host context.
 * @param sessionId - the session to inspect.
 * @returns `{ status: 'known', fileMaxSeq }` or `{ status: 'unknown', detail }`
 *   — `unknown` is an answer here, so its `detail` is a diagnostic line, not a
 *   classification the caller switches on.
 */
export async function readFileMaxSeq(ctx, sessionId) {
  const persistence = hostService(ctx, 'sessionPersistence')
  if (persistence === undefined) {
    return { status: 'unknown', detail: 'the sessionPersistence service is not in this composition' }
  }

  let handle
  try {
    handle = await persistence.open(sessionId, 'read')
  } catch (error) {
    return { status: 'unknown', detail: `the stored session could not be opened for reading: ${describeError(error)}` }
  }

  try {
    const slice = await handle.read()
    const events = asArray(slice?.events)

    if (events.length === 0) {
      // §4.2: the empty-and-detached pair is a failure, not an empty log.
      if (slice?.eventState === 'detached') {
        return { status: 'unknown', detail: 'the stored log is not materialized yet (an empty detached read)' }
      }
      // A materialized log with no events covers no seq at all, so every
      // target is beyond it — which is what §4.5's `targetSeq > fileMaxSeq`
      // branch is for. `-1` states that fact instead of leaving it unknown.
      return { status: 'known', fileMaxSeq: -1 }
    }

    const last = lastSeqOf(events)
    if (last === undefined) return { status: 'unknown', detail: 'the stored log held no event carrying a seq' }
    return { status: 'known', fileMaxSeq: last }
  } catch (error) {
    return { status: 'unknown', detail: `the stored log could not be read: ${describeError(error)}` }
  } finally {
    try {
      await handle.close?.()
    } catch {
      // Releasing a borrowed read handle is bookkeeping; a failure there must
      // not replace the answer this call already has.
    }
  }
}
