# 21 — §4.2's log-route preference order is wrong for the shipped host

Type: task
Status: resolved — decision: reverse the order, then give each route one job
Raised by: [20-implementation-verification.md](20-implementation-verification.md) §16.1

## Why this ticket exists

Ticket 20 ran §16.1 against the shipped host. The observation contradicts
[`spec.md`](../spec.md) §4.2 in three ways, and §4.2 is "the single most important implementation rule
in this document", so the correction must not be absorbed quietly. §16.1 carries the raw observation;
this ticket carries the decision to change the section.

**This is not a research question.** The facts are established (reproducible, cited below). What is
open is what §4.2 should say instead, and that is a judgement the spec's author should make.

## What §4.2 says today

1. Route (1) `ctx.sessionPersistence.open(id, 'read')` is "the freshest and the most complete view, and
   it does not touch the live session".
2. Route (2) `ctx.sessionQuery.readSession(id)` "for a *live* session reads the in-memory observation,
   not the file, so it can be narrower than (1)".
3. `SessionAlreadyOwnedError` from route (1) is the expected fallback trigger for a live session.

## What the host actually does

Measured on DSH Desktop 2.0.15, `@deepseek-ai/dsh-session` / `-persistence` / `-persistence-jsonl` /
`-session-query` 0.1.7-rc.2, live session owned by a write handle:

- **Claim 3 is false.** `open(id, 'write')` raises
  `SessionAlreadyOwnedError: session "…" is already owned by an active write handle`.
  `open(id, 'read')` **never** contests ownership — it is the documented non-owning path
  (`@dsh-session-persistence/README.zh.md:32-49`). The fallback trigger §4.2 names cannot fire.
- **Claim 1 is false, and the failure is silent.** While a session is pending (created, never flushed),
  route (1)'s `read()` returns `{ eventState: 'detached', events: [] }` — **an empty slice, no throw**
  (`@dsh-session-persistence-jsonl/lib/index.js:2454-2490` handing `materialized: false`, and `:64-92`
  falling through `resolveCurrentLog()` → no file → `{ detached, [] }`). A caller that guards with
  `try/catch` sees an empty log and cannot tell it from a real one.
- **Claim 2 is false.** `readSession` for a live session is `snapshotLive(session)` =
  `session.snapshotEvents().map(clone)` (`@dsh-session-query/lib/index.js:126-134`, `:300-306`). On this
  host that is the **complete dense log**: `Session` builds its surface manager with
  `SessionLogOffset(0)` (`@dsh-session/lib/index.js:1284`) and `snapshotEvents()` returns the whole
  `this.log` (`:1336-1345`). Windowed construction exists in the `SurfaceManager` API but has no caller
  in the shipped tree.
- Side by side, one live session, same instant, before any file existed: **route (1) 0 events
  (`detached`); route (2) 6 events.** Once a session has a file, route (1) reads it correctly and even
  sees a just-appended, not-yet-explicitly-flushed event (the delivered JSONL backend persists each
  routed batch), so the empty case is specifically the created-but-never-materialized window — which is
  exactly where a plugin's first operation on a fresh session lands.

What is *not* in question is the hazard §4.2 is built around: a sparse view silently selecting the wrong
earlier message. That hazard is real, and the rule below is what protects against it.

## What needs deciding

1. **Does the preference order reverse?** Route (2) is not the windowed view §4.2 forbids — it is a
   dense full-log read that also covers unflushed appends. Route (1) is file-backed and can be empty.
   The evidence points at preferring (2) and using (1) as the file-backed cross-check, but that inverts
   the section's thesis and needs a decision, not an inference.
2. **What is the guard for route (1)'s silent empty slice?** `eventState: 'detached'` with
   `events.length === 0` must be treated as **failure**, never as "the log has no events" — otherwise
   the plugin computes a span from nothing. The rule "if neither route yields an event for `targetSeq`,
   fail with `message-pending` or `message-not-found`" (§4.2) already covers it *if* the implementation
   does not mistake an empty read for a successful one. Should §4.2 say so explicitly?
3. **Does §4.2 keep both routes at all?** They are not cheap alternatives: one is a file read with a
   `stat` revision, the other an in-memory snapshot. If (2) subsumes (1) for a live session, two routes
   may be one route plus a caveat — but (1) is still the only route for a session that is *not* live.

## Constraints on the answer

- §4.2's central rule survives regardless: the range and the resend text come from a log read that
  covers the target, and a missing target means refusal — **never** a fallback scan of the in-memory
  array. Any rewrite must keep that.
- §13.1 #13 (sparse-log safety) is written against this section and must still be satisfiable.
- The README consequence in §4.2's outcome table ("state that a live session's span comes from the
  replay-validated log rather than the file") becomes the accurate description once the order flips.

## Evidence

- [`spec.md`](../spec.md) §4.2, §16.1
- `@deepseek-ai/dsh-session-persistence-jsonl/lib/index.js:2454-2490`, `:64-92`, `:329-346`
- `@deepseek-ai/dsh-session-query/lib/index.js:126-134`, `:300-306`
- `@deepseek-ai/dsh-session/lib/index.js:1284`, `:1336-1345`
- `@dsh-session-persistence/README.zh.md:32-49`

## Answer

**Decision: reverse the order, then give each route exactly one job.** §4.2 has been rewritten in
place.

- **Route (2) `ctx.sessionQuery.readSession(sessionId)` is primary** — it supplies the range and the
  resend text. Its `events` array is the covering log, dense and indexed by seq.
- **Route (1) `ctx.sessionPersistence.open(id, 'read')` is auxiliary** — it supplies `fileMaxSeq` for
  §4.5's `message-pending` vs `message-not-found` discrimination, and nothing else. §4.5 now states
  that rule in terms of `lastCoveredSeq` and says what to do when `fileMaxSeq` is unavailable (fall
  back to the covering read's own extent; never invent a `message-pending`).
- **`{ eventState: 'detached', events: [] }` is named as a failure**, with the note that only the
  *empty-and-detached pair* is the failure — `detached` alone is a normal caller-exclusive state on a
  materialized read.
- **A sliced `read(offset, length)` is legal for reading a known event but explicitly forbidden for
  computing a span**, since a span must not come from a read chosen to be narrow.
- **The write path is separated out explicitly**: §5.1's live tail comes from `session.seq`, not from
  either read route. A read describes what exists; the tail describes where the append lands.
- **Two name traps recorded**: `readSession(...).session` is the header, not a live handle; and
  route (2)'s `SESSION_QUERY_CORRUPT_SESSION` is §4.5's `replay-failed`, never `target-shadowed`.

§4.2's central rule is unchanged and now leads the section: derive the span from a read that covers the
target, and a read that does not cover it is a failure — never a licence to scan an in-memory array.
The README consequence this ticket flagged is now simply part of the section.

§16.1 keeps the raw observation and its `Contradicts §4.2` line, amended to note the resolution, so the
reasoning that produced the change stays readable.

## Comments
