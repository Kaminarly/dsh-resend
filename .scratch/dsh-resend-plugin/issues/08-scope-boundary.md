# 08 — Scope boundary: what is in, what is out

Type: grilling
Status: resolved

## Question

Which capabilities does the spec cover? Candidates, with evidence of what each costs:

**In (proposed).**
- Edit-and-resend on a user message.
- Regenerate on an assistant reply.
- **Presentation of replaced content** — hiding, marking, and the collapsed "original prompt"
  comparison. This is part of the edit-and-resend experience, not a separate feature.

**Out (proposed).** Each of these exists in `dsh-retrace` and is orthogonal to the two features:
- Recall/withdraw (removing a whole turn without editing).
- Version timeline and message versioning.
- Artifact/file rollback (git-first or content-addressed snapshots).
- LLM-generated summaries of replaced turns.
- Badges, close-guard, audit context rows, and the `retrace` CLI.
- Offline session repair and migration of legacy markers.

Also decide: does the spec include a **proposal to upstream a `user-actions` slot**? The platform has
no such slot; the official route is registering a new Chat node kind, which is what `dsh-retrace`
does. An upstream slot would be cleaner long-term but is not needed to ship.

## Why it matters

Scope fixes the effort. `dsh-retrace`'s core three operations are ~1 700 lines; the remaining ~80% of
its ~18k lines is the out-of-scope list, so leaving it out is what makes this spec tractable.

## Recommendation

In: the two features plus replaced-content presentation. Out: everything above. The upstream slot
proposal: **include as a separate, clearly-marked appendix**, because
`dsh-session/README.zh.md:192` names "a consumer that needs capability beyond boundary-based forking"
as the trigger for revisiting that design — which is precisely this feature.

## Answer

Recorded from the user's item-by-item replies. **A** = forced decisions about the two features'
inseparable behaviour; **B** = optional enhancements `dsh-retrace` has; **C** = the parallel systems.

### A — forced decisions

| | Question | Answer |
|---|---|---|
| A1 | How is the replaced user message presented? | **Hide it, by removing it from the surface.** Physical deletion is impossible (the log is append-only and never rewritten); the user accepted surface removal as the meaning of "deleted". No marker-only option, no "original prompt" comparison. |
| A2 | How is the editor triggered? | **An edit button in an action row beneath the message.** Not by clicking the message body. |
| A3 | Where does the editor appear? | **(b) inserted in a row beneath the message** — not a replacement of the bubble's content. |
| A4 | Commit / cancel? | **(c) both** — `Enter` submits, `Esc` cancels, and explicit send/cancel buttons are present. |
| A5 | Regenerate button visibility? | **Last assistant reply only, permanently visible** (not hover-revealed). |
| A6 | Transition when regenerating? | **Remove the old reply from the surface** — hidden immediately, same reasoning as A1. |
| A7 | How are refusals communicated? | **(a) the control is greyed out and not clickable, with the reason on hover.** |

Note on A2: this supersedes the original brief's "clicking the user message turns it into an edit box".
The editor is entered from an action row, which the plugin must create — the platform has no
user-message action row of its own, so A2 + A3 are satisfied by one manufactured Chat node kind.

Note on A1/A6: "delete" cannot mean physical deletion — the log is append-only and nothing is
rewritten. Research ticket 15 determines whether a surface replace already makes the message disappear
from the transcript, or whether the plugin must hide it as well.

### B — optional enhancements

| | Feature | Answer |
|---|---|---|
| B1 | Collapsible "original prompt" comparison | **No.** |
| B2 | ">40 % of the conversation" hide safety valve | **No.** Consequence: a large rewind may blank most of the view; the spec must record this risk. |
| B3 | Bilingual UI | **Yes — Chinese and English, but never both at once**; the active host locale selects one. |
| B4 | Record each rewind as a version | **No** — see the conflict recorded in ticket 16. |

### C — the parallel systems

**In scope: product/file rollback (git / snapshot).** This is the one addition, and the largest item in
the spec — see ticket 16 for its unresolved dependency on version records.

Out of scope: recall/withdraw (C1), version timeline and message versioning (C2), LLM summaries of
replaced content (C4), the `retrace` CLI (C5), badges and audit context rows (C6).