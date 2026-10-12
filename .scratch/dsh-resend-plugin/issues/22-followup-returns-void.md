# 22 — `followup` returns `undefined`: §5.5's await and §9.4's error row both need restating

Type: task
Status: resolved — decision: fix the wording, keep the scope
Raised by: [20-implementation-verification.md](20-implementation-verification.md) §16.2

## Why this ticket exists

Ticket 20 ran §16.2 against the shipped host. The question the ticket asked — "does `followup` settle on
acceptance or on completion?" — **has no answer, because `followup` returns nothing to settle**. That
makes two spec passages misleading in a way an implementer would follow literally and get wrong.
§16.2 carries the raw observation; this ticket carries the decision to change them.

**This is not a research question.** The behaviour is established and every shipped caller corroborates
it. What is open is the wording, and what a later UI owes the user.

## What the spec says today

- §5.5 shows `await agents.get(sessionId).followup({…})`.
- §9.4 offers a "rewind succeeded, resend failed" error row, scoped to "immediate failures" pending this
  check.

## What the host actually does

Measured live via the exact call site §5.5 names:

| Observation | Value |
|---|---|
| `followup(...)` threw | no |
| return value | `undefined` (not a thenable) |
| `agent.status` immediately after | `running` |
| `agent.status` after `await result` | `running` — but `await undefined` is a no-op, so this proves nothing |
| `followup(...)` on a **disposed** agent | **no throw** |

`Agent.followup` is `send(input, 'next-turn', true)`, and `send` has no return
(`@dsh-agent-loop/lib/index.js:800-808`). The README pairs it with `await handle.agent.whenIdle()` as
the completion signal (`@dsh-agent/README.zh.md:47-58`). All twelve shipped call sites use it as a
fire-and-forget statement (`dsh-api-session-controller:883`, `dsh-webhook:184`, `dsh-subagent:695,874`,
`dsh-schedule:1594`, `dsh-tool-jobs:285,291`, `dsh-command-goal:100`, `dsh-headless:329`,
`dsh-acp:840`, `dsh-sdk-jsonrpc-server:153`, `dsh-subagent-in-process-driver:207`).

## What needs deciding

1. **How does §5.5 state the call?** The `await` is harmless but teaches a false model — a reader will
   assume a failure can be caught there. `followup(…)` as a plain call plus an explicit
   `agent.status` read is what the host supports.
2. **Does §9.4 keep its "resend failed" row at all?** It cannot fire on an immediate throw in practice,
   since the call does not throw even on a disposed agent. Two honest replacements exist and the choice
   is the author's:
   - broaden the row to what is genuinely observable — a post-call `agent.status !== 'running'` means
     the turn was never accepted; and/or
   - keep the row and attach it to the **durable** signal: the turn closes with `turn/end` whose
     `data.reason.kind === 'error'` (success is `'completed'`). Confirmed live: a failed turn's
     `turn/end` carries the model error in `reason.error.message`. There is no `agent/error` event in
     the log for this case. This is also the only signal that survives a reload, so it is what a later
     UI would poll or subscribe to.
3. **Does the README obligation change?** §16.2's original instruction — "the README MUST say that only
   immediate failures are covered" — becomes inaccurate if the error row is broadened to the durable
   signal.

## Constraints on the answer

- §4.4 rule 4's `agent.status !== 'idle'` precondition is unaffected and still the primary guard.
- §5.2's flush ordering is unaffected: this is about what the *resend* can report, not the write.
- Whatever the row claims must remain true when the resend is accepted but the turn later fails — the
  case that motivated the check.

## Evidence

- [`spec.md`](../spec.md) §5.5, §9.4, §16.2
- `@dsh-agent-loop/lib/index.js:800-808`, `:866-875`
- `@dsh-agent/README.zh.md:47-58`
- The twelve shipped call sites listed above

## Answer

**Decision: fix the wording; keep the scope.** The product behaviour already decided stands — the
plugin's error row covers the resend it can observe, and the agent's own reporting covers the turn.
Both sections have been rewritten in place.

- **§5.5** no longer shows `await`. The call is a plain statement, with an explicit note that the
  return value is `undefined` — not a thenable, nothing to await, nothing to catch — and a comment
  saying so inline. The one inference available at the call site is stated as its own block:
  `agent.status` after the call, `running` meaning accepted. Success or failure of the **turn itself**
  is explicitly assigned to the log (`turn/end` with `reason.kind === 'completed'` or `'error'`), with
  a pointer to §9.4 and §16.2.
- **§9.4** now separates two states that were previously one row:
  - **the prompt never reached the agent** (`agent.status` was not `running` after the call) — this is
    the plugin's error row, with the "Send again" button, exactly as before;
  - **the turn was accepted and then failed** — "**This plugin does not own this case and MUST NOT
    invent a row for it**". It is indistinguishable at the call site, the agent already reports it in
    its own words at the same turn, and a second row would double-report one failure. What the plugin
    owes the user instead is stated: **do not destroy the rewind** — a failed turn leaves the same
    coherent, re-sendable state a successful one does.
- **The invariant both cases share** is now written down: never report failure over a surface already
  changed, and never imply the rewind was undone. The rewind is durable from the flush (§5.2); the
  error row describes the *resend*, never the rewind.

§16.2 keeps the raw observation and its `Contradicts` line, amended to note the resolution, so the
evidence behind the change stays readable.

**Note for whoever implements §9.4:** the "accepted but failed" case requires the plugin to *know* the
difference, which is exactly the `agent.status` read — so the two states are distinguishable at
runtime even though the promise is not. What is deliberately absent is any subscription to `turn/end`;
that would be new surface area, and this decision explicitly declines it.

## Comments
