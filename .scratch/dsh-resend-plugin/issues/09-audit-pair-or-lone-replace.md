# 09 — Audit claim + carrier pair, or a lone surface replace?

Type: grilling
Blocked by: 02 (no longer gating — decided ahead of the research)
Status: resolved

## Question

`dsh-retrace` rewinds with **two** appends — a `compaction/prune` audit claim followed by the
`user/message` carrier that carries `{surfaceOp:{op:'replace',…}, sourceEventSeqs:[…]}`, with no
`await` between them. Our research ticket **02** is establishing whether the audit claim is actually
required by a platform consumer (the token meter / shadow-price accounting) or is a defensive
convention.

Once 02 reports, choose:

- **(a) Two-segment pair, as retrace does.** Copy a mechanism with real-world mileage. Cost: one more
  event type in the log, and the ordering constraint must be honoured exactly.
- **(b) Lone `user/message` replace.** Simpler log, fewer invariants. Adopt only if 02 shows nothing
  consumes the claim and nothing drifts.

## Why it matters

This becomes a normative section of the spec. Choosing wrong either corrupts token accounting
silently or adds an unnecessary invariant that implementers can get wrong — and a wrong
`sourceEventSeqs` is a **hard session-load failure**, not a cosmetic bug.

## Recommendation

Do not decide before 02 reports. Default expectation: **(a)**, because the failure mode is severe and
retrace's three-tier fallback is itself evidence that this area is fragile. But if 02 finds the claim
unconsumed, prefer (b) and say so on evidence.

## Answer

**(a) — copy `dsh-retrace`'s two-event pair**: the `compaction/prune` audit claim followed by the
`user/message` carrier carrying `{surfaceOp:{op:'replace', startSeq, endSeq}, sourceEventSeqs:[…]}`,
with **no `await` between them**.

Decided ahead of research ticket 02, so 02 no longer gates this choice — it now only serves to
confirm the claim is genuinely consumed (and to document what would drift if it were omitted). The
spec adopts the pair as normative regardless.