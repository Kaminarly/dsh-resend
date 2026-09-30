/**
 * The per-session lock (spec §4.6).
 *
 * Two clicks must not interleave into two rewinds of the same session: the
 * range is computed from a read of the surface, the pair is validated against
 * the log it will land on, and both appends have to be adjacent — so a second
 * operation running anywhere inside that sequence can plan against a surface
 * the first one is about to change.
 *
 * A promise chain per session id is the whole mechanism: the lock is held for
 * exactly the task's own lifetime, the chain never rejects (so a refusal cannot
 * poison the next caller), and the entry is dropped once its tail settles so a
 * long-lived host does not accumulate one promise per session it has ever seen.
 *
 * What the lock does NOT do is pre-empt: a queued call runs after the one
 * ahead of it finishes, under the same preconditions it was admitted with. That
 * is why `apply` re-reads the live surface inside the lock rather than reusing
 * what it saw before queueing.
 */

/** The tail of each session's chain; an entry exists only while work is queued. */
const tails = new Map()

/**
 * Run one task with sole ownership of a session.
 * @param sessionId - the session the task operates on.
 * @param task - the work to serialize, called once the previous owner is done.
 * @returns the task's own promise: its value or its rejection, unchanged.
 */
export function withSessionLock(sessionId, task) {
  const previous = tails.get(sessionId) ?? Promise.resolve()
  const run = previous.then(task)
  // The tail is what the NEXT caller waits on, so it must never reject: a
  // refusal is a normal result here, not a reason to fail an unrelated call.
  const tail = run.then(
    () => undefined,
    () => undefined,
  )
  tails.set(sessionId, tail)
  void tail.then(() => {
    if (tails.get(sessionId) === tail) tails.delete(sessionId)
  })
  return run
}
