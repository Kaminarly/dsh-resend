# Handoff — DSH edit-and-resend / regenerate plugin spec (research frontier cleared)

**Date:** 2026-09-28
**Workspace:** `D:\Code\MJ-Project\dsh-resend-2`
**Governing skill:** `wayfinder` — work the map. **It is not in this session's skill catalogue** (see
"Traps" below); the map's own conventions are the authority.
**Supersedes:** [01-dsh-resend-plugin-wayfinder.md](01-dsh-resend-plugin-wayfinder.md) for *state*, but
**read 01's "User working preferences" section as well** — it is still accurate and is not duplicated here.

## What this effort is for

A **specification document** (explicitly: *no implementation code*) for a third-party DSH Desktop
plugin with edit-and-resend and regenerate. The map's own Destination section is the authority:
[`.scratch/dsh-resend-plugin/map.md`](../../.scratch/dsh-resend-plugin/map.md). The user is building
their own rather than waiting for `dsh-retrace`.

## Exactly where the work stopped

**The research frontier is clear except for one ticket.** Of 18 tickets, **17 are resolved or closed**;
only [ticket 05](../../.scratch/dsh-resend-plugin/issues/05-retrace-build-and-tests.md) is open, and the
user has ruled it **in scope and next**.

The three tickets that genuinely blocked the spec — plus the fourth that was cheap — are all done. The
four reports written in this session are listed below; **do not re-derive their findings.**

| Ticket | Report | One-line outcome |
|---|---|---|
| [Is a replaced message actually deleted…](../../.scratch/dsh-resend-plugin/issues/15-delete-vs-hide.md) | [`research/delete-vs-hide.md`](../../.scratch/dsh-resend-plugin/research/delete-vs-hide.md) | Surface removal hides nothing from the human; the plugin must hide rows itself |
| [What is the full `inputActions` API?](../../.scratch/dsh-resend-plugin/issues/04-inputactions-api.md) | [`research/inputactions-api.md`](../../.scratch/dsh-resend-plugin/research/inputactions-api.md) | Seven verbs, plain text only, no structured chip insertion |
| [How does a plugin's client half invoke its host half?](../../.scratch/dsh-resend-plugin/issues/18-client-to-host-channel.md) | [`research/client-to-host-channel.md`](../../.scratch/dsh-resend-plugin/research/client-to-host-channel.md) | Self-mounted Typert Remote; **the generator is not shipped** |
| [Does the client pipeline strip `sourceEventSeqs`?](../../.scratch/dsh-resend-plugin/issues/03-sourceeventseqs-delivery.md) | [`research/sourceEventSeqs-delivery.md`](../../.scratch/dsh-resend-plugin/research/sourceEventSeqs-delivery.md) | Not stripped — but **zero client consumers** |

**Each ticket's `## Answer` section carries the spec-relevant consequence.** Read the answers, not the
reports, unless you need the evidence.

### The single most consequential open choice

[`research/client-to-host-channel.md`](../../.scratch/dsh-resend-plugin/research/client-to-host-channel.md)
established that the Remote descriptor artifact is **generated**, and that
**`@deepseek-ai/dsh-typert-generator` is not shipped** in the installed app. The spec must pick one and
name it:

1. **hand-write** the descriptors and zod schema factories to the documented validation contract, or
2. **pin the generator** from the DSH source repository as a devDependency.

This is the only remaining question that changes what an implementing agent writes. It is recorded in
the map's "Not yet specified".

## What changed in this session (not yet reflected in 01)

- **Ticket 18 did not exist on disk.** The previous handoff referenced
  `.scratch/dsh-resend-plugin/issues/18-client-to-host-channel.md` as one of three blocking tickets, but
  `issues/` held only 01–17. It has been written and resolved.
- **The previous handoff's inventory was wrong in the other direction too:** it said "6 open tickets"
  and listed 01/02/03/04/15/18, but
  [ticket 05](../../.scratch/dsh-resend-plugin/issues/05-retrace-build-and-tests.md) was also open and
  unmentioned. **Count the tickets yourself** rather than trusting an inventory.
- **Tickets 01 and 02 are closed** as out of scope, with one-line gists kept in the map's Out of scope,
  per the previous handoff's own recommendation and the user's approval.
- **`CONTEXT.md` had two stale entries, now fixed** — and one of them caused real damage: the
  **Transcript** entry omitted the clause that a *shadowed* node keeps rendering, which is exactly the
  misreading that made ticket 15 look ambiguous. The **Replay turn** entry still described implementing
  the feature with `fork`, contradicting the map's long-settled in-place-rewind decision.
- **`Status:` lines were normalised.** Tickets 01, 02 and 17 had their banner at the top but the
  machine-readable `Status:` line buried inside a historical block, so a scan read them as open. Every
  ticket now has `Type:` / `Status:` within the first six lines, per
  [`docs/agents/issue-tracker.md`](../../docs/agents/issue-tracker.md).

## How this session worked, and why it should keep working that way

The user's concurrency quota is the binding constraint (see 01's preferences). This session therefore
**did all research inline, with zero subagents**, after telling the user so. That was accepted without
objection and produced four reports in one session. **The `research` skill's default instruction to
"spin up a background agent" was deliberately not followed** — the user's constraint outranks it. Say so
in one line if you deviate again.

The round shape that worked, and that the user approved explicitly at each step: **claim one ticket →
research it inline → write the report → resolve the ticket with an `## Answer` → append a gist to the
map's Decisions so far → present the report → ask which ticket next.** The user answers
multiple-choice questions item by item and picks the recommended option when the recommendation is
justified.

## Traps

- **`wayfinder` is not in this session's skill catalogue** (nor `grilling`). Do not call the `skill`
  tool for it; follow the map's conventions and
  [`docs/agents/issue-tracker.md`](../../docs/agents/issue-tracker.md), which documents the map/ticket
  protocol including `## Answer`, `Status:`, `Blocked by:` and the frontier scan.
- **The Chinese READMEs and issue files are valid strict UTF-8.** PowerShell 5.1 on this zh-CN host
  renders them as mojibake (`鈥?` for `—`). **Do not "fix" the encoding** — read with the `read` tool.
- **A green boot is not evidence that a row renders.** Still normative for the spec.
- **Do not re-derive platform facts.** The map's Notes carry them with `file:line`, and this session
  added three more (the append-origin transcript rule, the closed `MessageSourceMap` union, and the
  Remote/channel facts). Its Notes say "do not re-research" — believe it.
- **Four hypotheses about `dsh-retrace`'s edit failure are falsified**, and diagnosing retrace is out of
  scope by the user's ruling (*"别管 retrace 了"*). Ticket 05 is the **one** exception: it studies
  retrace's build and *test technique* to source the spec's acceptance criteria, and the user
  explicitly kept it in scope. Do not let that exception widen.
- **This session cannot install or visually verify anything** — no `plugin_manager`, approvals are
  rejected automatically, and `web_fetch` to loopback is refused. Any "does the user see it?" step
  belongs to a differently configured session. Ticket 05 needs `web_fetch` to GitHub, which is fine;
  if the network is unavailable, **say so and stop** rather than reconstructing from the npm tarball.
- **PowerShell `Get-ChildItem -Recurse` is unreliable on some package paths.** Use `glob`, `grep`,
  `read`.

## Suggested skills

- **`research`** — for ticket 05. Findings to
  `.scratch/dsh-resend-plugin/research/retrace-build-and-tests.md`. Ignore its "spin up a background
  agent" default for the reason above.
- **`wayfinder`** — the governing skill, **not loadable here**; follow the map and the tracker doc.
- **`writing-for-agents`** — read **before** drafting `spec.md`. The audience is another agent with no
  access to this conversation, so the spec must be self-contained: exact identifiers, `file:line`
  evidence, normative mechanism, per-extension-point fallbacks, acceptance criteria.
- **`grilling`** — only if resolving ticket 05 or the descriptor-artifact choice opens a new decision.
  The decision frontier is empty right now; keep it that way unless something genuinely forks.
- **`codebase-design`** — optional, and now more useful than before: the module seam is settled (host
  owns rewind/descriptor/policy, client owns row/editor/hiding), so this is where the spec's structure
  can be sanity-checked.
- **`domain-modeling`** — `CONTEXT.md` is current as of this session; keep it that way if the plugin's
  own vocabulary crystallises. Glossary only, no implementation detail.
- **`tech-doc-style-chinese`** — only if part of the deliverable ends up in Chinese. The spec itself is
  English by decision (ticket 07).

## Definition of done

Unchanged from 01, and worth restating because it is now close:

- every ticket resolved or explicitly out of scope — **only ticket 05 remains**,
- `spec.md` exists at `.scratch/dsh-resend-plugin/spec.md`, self-contained and implementable,
- and the map's **Not yet specified** section is empty. It currently holds drafting work, not unknowns:
  the hiding section's normative wording and its count-based disclosure in place of the declined `>40 %`
  valve, the regenerate fidelity wording, the descriptor-artifact choice, iconography, what "rewind
  succeeded, send failed" shows, and the file-rollback concurrency question (ticket 16).

Nothing was left running. No background jobs and no subagents are active.
