# Handoff — DSH edit-and-resend / regenerate plugin spec (wayfinder, mid-flight)

**Date:** 2026-09-28
**Workspace:** `D:\Code\MJ-Project\dsh-resend-2`
**Governing skill:** `wayfinder` — this is a charted map partway through "work through the map".

## What this effort is for

The user wants a **specification document** (explicitly: *no implementation code*) for a third-party
DSH Desktop plugin with two features:

1. **Edit-and-resend** — a sent user message can be edited and sent again.
2. **Regenerate** — an assistant reply can be produced again.

They will implement it with AI assistance afterwards. They chose to build their own rather than wait for
`dsh-retrace` (which already implements both) because its user-message editing does not work for them.

**The spec has NOT been written yet, and that is correct.** The user challenged an early attempt:
*"不对啊，是不是还有票据没解决？哪有这么快就写spec了"*. Four spec-critical facts are still missing.
Do not start writing `spec.md` until they are resolved.

## Read these first, in this order

| Artifact | Why |
|---|---|
| [`.scratch/dsh-resend-plugin/map.md`](.scratch/dsh-resend-plugin/map.md) | The map: destination, Notes with all established platform facts, Decisions so far, fog, out-of-scope. **The single most important file.** Its Notes say "do not re-research" — believe it. |
| [`.scratch/dsh-resend-plugin/issues/`](.scratch/dsh-resend-plugin/issues/) | 18 tickets. Read only the open ones plus any resolved ticket you need detail from. |
| [`CONTEXT.md`](CONTEXT.md) | Glossary. Read the **Branch** entry before using that word — it has already caused one wasted round. |
| `.scratch/dsh-resend-plugin/research/` | Four completed research reports. `dsh-retrace-prior-art.md` is the richest; `v2.0.15-edit-breakage.md` records four **falsified** hypotheses. |

Do **not** re-derive the platform facts — they are in the map's Notes with `file:line` evidence.

## Exactly where the work stopped

The **decision frontier is empty** — all `grilling` tickets are resolved. What remains is the **research
frontier**: 6 open tickets, of which 3 genuinely block the spec.

The user's last message asked **which ticket to run first** and had not yet answered. The recommended
order, and the reason it matters:

1. [Is a replaced message actually deleted, or only removed from the model surface?](.scratch/dsh-resend-plugin/issues/15-delete-vs-hide.md)
   — **most load-bearing.** The user decided the replaced message is hidden by removing it from the
   surface. Whether surface removal *alone* removes it from the transcript is **unknown**, with
   conflicting evidence. If extra hiding is needed, the spec must say so and must record the risk that
   the user **declined** the ">40 % of the conversation" safety valve.
2. [How does a plugin's client half invoke its host half?](.scratch/dsh-resend-plugin/issues/18-client-to-host-channel.md)
   — decides the plugin's **skeleton**. The client `ISession` surface has **no `append`**
   (`prompt`/`cancel`/`command`/`loadOlder`/… only), so the rewind is host-side only and needs a
   client→host channel. Candidates: a `dsh-api-remotes` remote namespace (what first-party plugins use)
   versus an HTTP route (what `dsh-retrace` uses). Un-made decision; gates package structure, `exports`,
   and `dsh.client.inject`.
3. [What is the full `inputActions` API?](.scratch/dsh-resend-plugin/issues/04-inputactions-api.md)
   — only `setDraft(text)` is confirmed. Decides the "edit in the composer" half of the chosen edit-box
   design, and whether regenerate can avoid degrading image-bearing prompts to text.
4. [Does the client event pipeline strip top-level `sourceEventSeqs`?](.scratch/dsh-resend-plugin/issues/03-sourceeventseqs-delivery.md)
   — decides whether the **host** must compute and serve "what got shadowed" via a session projection.

**Also recommended, and cheap:** close
[Is a lone `user/message` surface replace safe…](.scratch/dsh-resend-plugin/issues/02-lone-replace-vs-audit-pair.md)
(superseded — the user chose to copy `dsh-retrace`'s two-event pair) and
[Can the shipped `user` chat-node renderer be overridden…](.scratch/dsh-resend-plugin/issues/01-slot-key-user-override.md)
(phase-2 only; the chosen design uses a new node kind instead). Move both to the map's Out of scope with
a one-line gist each.

## User working preferences — read this before acting

These are not captured anywhere else and have already caused friction.

- **Do not fire subagents before the user has answered.** They stopped five running agents once with
  *"停停停，停掉所有子代理，我都没回答问题，你急什么啊"*.
- **Limited concurrency — one agent at a time.** *"我没有那么多并发额度，一步步来吧"*. Ask before
  firing, and prefer a single research ticket per round.
- **Ask before acting.** After the roadmap was set, the user's instruction was to *"先问我下一步"*.
  When in doubt, present options and wait.
- **The user speaks Chinese.** Answer in Chinese. When a question uses jargon they have not met, they
  will say so — e.g. *"你问的界内界外是啥，我也不懂，先给我解释"*. Explain plainly, with concrete
  examples, before asking them to choose.
- **When there are several questions, list them one by one** so they can answer item by item. They asked
  for exactly this once: *"你把第一、第二类的问题都列出来，我一个一个给你答复"*.
- **Never present a plausible story as a confirmed cause.** The user rewards honesty about uncertainty;
  they pushed back hard when a claim outran its evidence (*"你开什么玩笑，全读完了，明明子代理还在跑"* —
  the reading was not finished). Say what is verified, what is inferred, and what is unknown.
- **Refer to tickets by name**, not bare numbers — the wayfinder rule, and the user reads by name.

## Traps that will waste a fresh agent's time

- **Four hypotheses about why `dsh-retrace`'s user-message editing fails have been falsified.** Do not
  re-run them — see the addendum in
  [What exactly breaks user-message editing on DSH Desktop v2.0.15?](.scratch/dsh-resend-plugin/issues/14-v2-0-15-edit-breakage.md).
  Chasing that bug is **out of scope** by the user's ruling (*"别管 retrace 了"*).
- **This session runs inside the target profile.** `DSH_PROFILE=desktop`, and the GUI at
  `http://127.0.0.1:43120` is the very interface the plugin would change.
- **This session cannot install or visually verify anything.** It has no `plugin_manager` /
  `cordis_inspect_query` tools, approvals are rejected automatically, and `web_fetch` to loopback is
  refused by the allowlist. Any "does the user see it?" acceptance step belongs to a differently
  configured session.
- **PowerShell `Get-ChildItem -Recurse` returns nothing on some of these package paths.** Use the
  `glob`, `grep` and `read` tools instead.
- **The Chinese READMEs are valid strict UTF-8.** They look like mojibake only if read with
  PowerShell 5.1 `-Encoding Default` on this zh-CN host. Do not "fix" the encoding.

## Two lessons already earned the hard way — both are normative for the spec

1. **A green boot is not evidence that a row renders.** `dsh-retrace`'s own telemetry read
   `definitions=4 slots=6 seats=6` while nothing appeared on screen. Acceptance criteria must require
   **observing the rendered row**, not inferring it from successful registration.
2. **The plugin must tolerate a double mount, or fail loudly.** The relevant client registries throw on
   duplicate keys (`ConversationEventRegistry.register`, `views.register`, `groups.register`), and a
   second `apply()` contending for them leaves a **partially applied** plugin.

## Suggested skills

- **`wayfinder`** — the governing skill. Work the map; one ticket per session; record the resolution in
  the ticket and the gist in the map's Decisions so far.
- **`research`** — for the four open research tickets. Findings go to
  `.scratch/dsh-resend-plugin/research/<name>.md`. Dispatch one at a time, after asking.
- **`grilling`** — if the research answers open any new decision. Frontier questions only, with a
  recommended answer each.
- **`domain-modeling`** — keep [`CONTEXT.md`](CONTEXT.md) current as the plugin's own vocabulary
  crystallises (it currently holds platform terms plus the effort's). It is a glossary only — no
  implementation detail.
- **`writing-for-agents`** — read before drafting `spec.md`. The spec's audience is another agent
  implementing with no access to this conversation (user's choice, ticket 07), so it must be
  self-contained: exact identifiers, `file:line` evidence, normative mechanism, per-extension-point
  fallbacks, acceptance criteria.
- **`codebase-design`** — optional, but useful when the host/client split is settled (ticket 18), since
  that is where the plugin's module seam is drawn.
- **`tech-doc-style-chinese`** — only if any part of the deliverable ends up written in Chinese; the spec
  itself is English by decision.

## Definition of done

The map's destination is met, and the map is finished, when:

- every remaining ticket is resolved or explicitly ruled out of scope,
- `spec.md` exists at `.scratch/dsh-resend-plugin/spec.md` (the tracker's convention for this effort),
  self-contained and implementable,
- and the map's **Not yet specified** section is empty.

Nothing was left running. No background jobs or subagents are active.