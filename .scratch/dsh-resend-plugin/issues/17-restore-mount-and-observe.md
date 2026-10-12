# 17 — Restore the mount and observe the actual symptom

Type: task
Status: closed — out of scope

**CLOSED — out of scope.** The user's ruling: *"别管 retrace 了，按已知事实写 spec"* — diagnosing
`dsh-retrace`'s own defect is not what this spec is for. Its two by-products are kept, because both are
normative for the new plugin and are carried into `spec.md`:

1. **A green boot is not evidence that a row renders.** Registration telemetry read
   `definitions=4 slots=6 seats=6` while nothing appeared on screen. Acceptance criteria must require
   observation of the rendered row.
2. **The new plugin must tolerate a double mount, or fail loudly.** The client registries throw on
   duplicate keys — `ConversationEventRegistry.register` on a duplicate kind
   (`dsh-client-ui-conversation/lib/client.js:2654-2657`), and likewise `views.register` (`:2883`) and
   `groups.register` (`:2906`). A second `apply()` contending for the same keys leaves a partially
   applied plugin. Do not inherit that.

The analysis below is retained as a record of why the diagnosis was abandoned, not as pending work.

---

# 17 (original) — Restore the mount and observe the actual symptom

Type: task
Status: closed — out of scope — **historical; see the banner above**

## Question

There is nothing to decide, prototype or research here. The discussion is blocked until a **single
observation** is made, because the premise of the spec's item #1 is currently **unconfirmed**.

Research ticket 14 falsified the API-breakage hypothesis, and found that

- `dsh-retrace` is **not mounted** in this profile — it is in `dependencies` but absent from
  `dsh.profile.bundles`, so every start logs `[root] patch: entry "dsh-retrace" not found`, and
- **no operation was ever invoked** — zero log matches for `editAndResend`, `spanFromFile`,
  `not-user-message` or `target-shadowed`,

so the reported "other features work, only user-message editing fails" split has no host evidence
behind it. Before the spec can state item #1 accurately, the symptom must be re-established on a
correctly mounted plugin.

## What must happen

1. **Restore the mount.** Put `dsh-retrace` back into `dsh.profile.bundles` in
   `~\.dsh\profiles\desktop\package.json` (and resolve the earlier **double mount** — it was loaded from
   both `.dsh-market` and the profile root, causing `duplicate prefix route "/api/plugins/retrace"` and
   `versioning disabled: domain 'retrace' is already open`). The supported route is
   `plugin_manager action: install_bundle`; hand-writing the profile is explicitly discouraged by the
   first-party guidance and needs its own approval. **This session cannot do it** — it has no
   `plugin_manager` tool and approvals are rejected automatically — so this is a human step, or a step
   for a differently configured session.
2. **Restart** DSH Desktop so the composed profile picks the row up.
3. **Observe, and report exactly one of three states** for the action row rendered **beneath the user's
   own message** (not beneath an assistant reply — assistant-side recall is a different component and
   cannot be used as evidence):

   | Observation | Meaning |
   |---|---|
   | No action row, **plus** an error panel titled `用户消息操作渲染出错` | the row's render is throwing |
   | No action row, **no** error panel | `match()` / `buildViewNode()` returned null — a definition or anchor mismatch |
   | Action row **present** (it carries both a 编辑 and a 撤回 chip) | the row renders fine; the fault is inside the edit flow itself |

4. **Then attempt one edit** and capture what appears in
   `%APPDATA%\DSH Desktop\logs\host\dsh-*.log`, specifically any of `spanFromFile`, `editAndResend`,
   `not-user-message`, `target-shadowed`.

## Why it matters

Every downstream answer depends on which of those three states is real. If the row never rendered, the
spec's item #1 is about *registration or anchoring*. If the row rendered and the edit failed, item #1 is
about the **round-boundary detection** — the one code path ticket 14 found that is exclusive to
edit-and-resend (`isRoundBoundary`, `span-semantics.js:74-75`, and the positional
`sessionEvents(session)[seq]` fallback at `host-compat.js:158` that a windowed, sparse host view turns
into `undefined` → `not-user-message`).

The second outcome is the more likely one, and it is a genuinely different spec: it means the new plugin
must **not** rely on positional indexing into the event array, and must read the session **file** rather
than the in-memory event view — the same hazard already recorded in the map's Notes and in the earlier
prior-art research.

## Answer (partially re-established from the user's observation)

The user reports, on the current install:

- **beneath every user message: an action row whose only action is 复制 (Copy)**
- **beneath every assistant reply: 撤回 and 重新生成**

This corrects the premise the ticket was written on. `dsh-retrace` **is** running — the assistant-side
affordances prove it — so the earlier "not mounted" finding applies only to the profile-root row. The
real symptom is narrower and sharper: **plain list-slot registrations work; retrace's manufactured
Conversation-Definition node kind produces no node at all.** What the user sees under user messages is
the *shipped* `UserMessageNodeView` default row, which renders copy only.

## The prime suspect, and the cheap experiment that tests it

**`dsh-retrace` is mounted twice.** It is listed in `dsh.profile.bundles`
(`~\.dsh\profiles\desktop\package.json:24`) **and** hot-mounted by the market at
`.dsh-market\hot-1.yml`:

```yaml
- id: 'mkt-dsh-retrace'
  name: 'file:///C:/Users/Administrator/.dsh/profiles/desktop/node_modules/dsh-retrace/lib/index.js'
```

That duplicate is already visible in the logs as `duplicate prefix route "/api/plugins/retrace"` and
`versioning disabled: domain 'retrace' is already open`. And the registries it competes for **throw on
duplicates**: `ConversationEventRegistry.register` → `registerDefinition(…, 'conversation Definition
"…" is already registered', …)` (`dsh-client-ui-conversation/lib/client.js:2654-2657`), and likewise
`views.register` (`:2883`) and `groups.register` (`:2906`). Two `apply()` runs therefore contend for the
same registry keys, and a throw partway through the second run leaves a **partially applied** plugin —
exactly the shape of "assistant actions live, the manufactured node kind dead".

**Experiment:** remove the market hot-mount (`.dsh-market\hot-1.yml`) — or otherwise reduce the mount to
a single row — restart DSH Desktop, and look again beneath a user message. If the edit/recall chips
appear, the cause was the duplicate mount.

## Why this is still the right ticket

Whichever way the experiment lands, the finding stands that this is a **runtime** question. Four
code-level hypotheses about the mechanism have now been falsified — see the addendum to
[What exactly breaks user-message editing on DSH Desktop v2.0.15?](14-v2-0-15-edit-breakage.md) —
and the remaining stages (`start` populating `context.state`, `buildViewNode`, node routing and
grouping) are invisible to registration telemetry.

## Spec consequences, recorded regardless of the outcome

1. **A green boot is not evidence that a row renders.** Registration telemetry showed `definitions=4
   slots=6 seats=6` while nothing appeared. The spec's acceptance criteria must require **observation of
   the rendered row**, not inference from successful registration.
2. **The new plugin must tolerate a double mount, or fail loudly.** Duplicate registration into these
   registries throws. Our plugin should either make its registrations idempotent or detect a second
   mount and refuse visibly — never half-apply.

## Resolution

_Experiment pending; requires a restart this session cannot perform._