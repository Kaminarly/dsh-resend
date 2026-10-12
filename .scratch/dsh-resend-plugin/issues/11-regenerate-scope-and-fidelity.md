# 11 — Regenerate: which replies, and how faithful?

Type: grilling
Status: resolved

## Question

Two coupled decisions about regenerate.

**Placement.** VSCode Copilot restricts retry to the **last** response
(`when: isResponse && itemId ∈ lastItemId`). `dsh-retrace` offers it on hover over **any** assistant
reply, rewinding that reply and everything after it.

- **(a) Last reply only.** Semantics are clean: nothing downstream needs invalidating.
- **(b) Any reply.** More powerful, but regenerating a mid-history reply discards everything after it,
  which is a large, surprising rewind.

**Fidelity.** `dsh-retrace` re-sends the original prompt's **text only**; image-bearing prompts
silently degrade to text-only (`README.md:416-417`). Research ticket **04** is establishing whether
`inputActions`/the `conversation` service can carry draft attachments programmatically, which decides
whether this gap can be closed or must be documented as a limitation.

- **(c) Accept text-only** and document the degradation prominently.
- **(d) Preserve attachments** if 04 finds a supported route.

Also decide whether regenerate replays the original turn's **model and mode selection**, or takes them
from the current pickers. VSCode's retry takes them from the current pickers; its edit path replays
the model but not the mode — an asymmetry worth not copying accidentally.

## Why it matters

Placement affects both the spec's UI section and the safety story for large rewinds. Fidelity is a
documented user-visible limitation either way.

## Recommendation

**(a)** on placement, matching VSCode and avoiding mid-history rewinds. On fidelity, wait for 04; if it
finds no supported attachment route, specify **(c)** and make the limitation normative and visible in
the UI (disable regenerate, with a reason, when the prompt carried images) rather than silently
degrading the way retrace does. On model/mode: replay the original model, take the mode from the
current picker state, and state the rule explicitly.

## Answer

**(a) — the regenerate affordance appears only on the last assistant reply.** Mid-history regeneration
is out of scope; nothing downstream needs invalidating.

Fidelity: the resend carries the original prompt's **text only**, so image-bearing prompts degrade.
Because the text-only limitation follows from the choice of placement rather than from a platform
prohibition, the spec must document it as a known limitation and — unlike `dsh-retrace` — should
surface it in the UI (disable regenerate with a reason when the prompt carried attachments) rather
than silently degrading. Research ticket 04 remains useful for stating whether attachment carriage is
possible at all, but no longer gates this decision.

Model/mode: replay the original turn's **model**; take the **mode** from current picker state. State
the rule explicitly so implementers do not copy VSCode's asymmetric behaviour by accident.