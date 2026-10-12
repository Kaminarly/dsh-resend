# 12 — Behaviour while the agent is streaming

Type: grilling
Status: resolved

## Question

Both operations rewrite history, which is unsafe while a turn is in flight. `dsh-retrace`'s README
tells users they must stop the reply first, but its code path instead calls
`agent.cancel({kind:'user'})` followed by `await agent.whenIdle()`. Our research into its hazards
found that editing mid-step made a resend reference another turn's chunks, and `dsh-token-meter`
threw `belongs to another step` — a corruption that manual stopping does not reliably prevent.

Choose:

- **(a) Automatically cancel the in-flight turn, wait for idle, then proceed.** Forgiving; the user's
  intent is unambiguous. Cost: discards a reply the user may have been reading.
- **(b) Refuse, and tell the user to stop first.** Predictable; pushes the hazard onto the user, who
  cannot see it.
- **(c) Offer to cancel** — prompt with an explicit confirmation, then cancel and proceed.

## Why it matters

Mid-stream editing is the highest-frequency way to hit the corruption path. Whatever is chosen becomes
a normative requirement, and the spec must also state that the operation is refused for
already-compacted or previously-replaced targets (retrace's rule: it acts on the **active model
surface** only).

## Recommendation

**(c)**, degrading to **(b)** if a confirmation cannot be surfaced. Reasoning: silent cancellation
loses work the user is watching; silent refusal hides a real hazard; an explicit prompt is both honest
and safe. Regardless of choice, the spec must require `agent.cancel({kind:'user'})` + `whenIdle()`
before any append, and must never proceed while a turn is open.

## Answer

**(b) — refuse; the user must click stop first.** Neither edit-and-resend nor regenerate is available
while a reply is in flight. The user's own words: "必须先点停止，否则无法编辑用户消息或重新生成回复".

So the spec specifies **no automatic cancellation**. The affordances must be visibly unavailable
(disabled, with the reason communicated) while the session is streaming, and the host-side guard must
reject the operation rather than relying on the UI alone. `agent.cancel({kind:'user'})` +
`await agent.whenIdle()` remain a defensive precondition before any append — the plugin never appends
while a turn is open — but the plugin does not initiate the cancellation itself.

The operation is additionally refused for already-compacted or previously-replaced targets, matching
`dsh-retrace`'s rule that these operations act on the **active model surface** only.