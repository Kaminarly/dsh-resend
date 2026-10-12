# 02 — Is a lone `user/message` surface replace safe, or is the `compaction/prune` claim required?

Type: research
Status: closed — out of scope (superseded)

**CLOSED — out of scope (superseded).** [Audit claim + carrier pair, or a lone surface replace?](09-audit-pair-or-lone-replace.md)
decided ahead of this research: the spec adopts `dsh-retrace`'s **two-event pair as normative
regardless**, so nothing here gates the spec. What the answer would have changed is documentation only —
what drifts if the claim were omitted (surface token accounting; retrace's own comment warns that
writing a node count instead of a token price makes `surfaceTokens` overestimate and triggers compaction
early).

The question below is retained as a record of what was set aside, not as pending work.

---

# 02 (original)

Type: research
Status: open (not started) — **historical; superseded above**

## Question

`dsh-retrace` always rewinds with **two** appends:

```js
session.append('compaction/prune', { shadowedRange, shadowedSeqs, shadowedTokenCount })  // audit claim
session.append('user/message', { role, id, content, source: {kind:'model', …} },
   { surfaceOp: {op:'replace', startSeq, endSeq}, sourceEventSeqs: [auditSeq, …shadowed] })
```

Determine whether the **audit claim is optional**. Specifically:

1. What consumes `compaction/prune`? Read `@deepseek-ai/dsh-token-meter`'s surface-projection
   consumer and `@deepseek-ai/dsh-session`'s shadow-price accounting.
2. If a lone `user/message` replace is performed **without** the claim, what drifts — surface token
   counts, the token meter, compaction thresholds, cache accounting? Does anything reject it?
3. Does the claim have to be a `compaction/prune` specifically, or would another type serve?
4. Confirm the ordering constraint: no `await` between the claim and the replace.

If the claim is required, the spec adopts the two-segment pair as normative. If it is optional, the
spec can specify the simpler single-append form — but only on evidence, not on preference.

## Why it matters

Decides a normative section of the spec. A wrong answer here silently corrupts token accounting or
hard-fails session load.

## Sources

`D:\DSH Desktop\resources\app\node_modules\@deepseek-ai\dsh-token-meter\`,
`…\dsh-session\lib\` (surface fold, shadow accounting), `…\dsh-compaction\`; and
`dsh-retrace\lib\adapter\dsh-writer.js:216-341`, whose three-tier fallback suggests fragility.

## Resolution

**Closed — out of scope.** Superseded by [Audit claim + carrier pair, or a lone surface replace?](09-audit-pair-or-lone-replace.md),
which adopted the two-event pair as normative without waiting for this research.