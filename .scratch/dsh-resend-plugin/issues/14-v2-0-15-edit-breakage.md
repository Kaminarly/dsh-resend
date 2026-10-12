# 14 — What exactly breaks user-message editing on DSH Desktop v2.0.15?

Type: research
Status: resolved (investigated; hypothesis falsified — the question reopens as ticket 17)

## Question

This is **spec item #1** — the first problem the spec must solve.

**Reported symptom.** `dsh-retrace@0.4.32` runs on DSH Desktop **v2.0.15** and its **other functions
work normally** — regenerate, recall via assistant-reply hover, timeline, artifact rollback. **Only
user-message edit-and-resend is broken**: the user cannot edit a user message. Nothing more is known;
whether the affordance fails to appear, appears but does nothing, or errors, has not been established.

**Determine the precise breakage**, with evidence, and report it as a list of API deltas between the
version `dsh-retrace` targets and the version actually shipped.

### Version delta (working hypothesis)

- `dsh-retrace@0.4.32` declares peers on `^0.1.0-rc.6` for `@deepseek-ai/dsh-client-locale`,
  `dsh-client-ui-conversation`, `dsh-client-ui-slots`, `dsh-session`, `dsh-storage-domain`,
  `dsh-token-meter` (see its `package.json`).
- The shipped profile runs `@deepseek-ai/dsh-*` at **`0.1.7-rc.2`** inside `dsh-plugin-desktop`
  **v2.0.15** (`D:\DSH Desktop\resources\app\package.json`).

### Why this is a narrow, diagnosable failure

The symptom's shape is a strong clue. Regenerate rides a **plain list-slot registration** into
`conversation.chat.assistant-actions`. The user-message affordance instead rides a **Conversation
Definition** — a manufactured node kind:

- `dsh-retrace` registers definitions `userActionsDefinition`, `userReferenceDefinition`,
  `recallMarkerDefinition`, `auditContextDefinition()` (`lib/client.js:3973-3979`), anchoring the row at
  the message's `seq` (the reference row uses `seq - 0.5` to sort above it).
- It then registers `conversation.chat.node` renderers for those kinds (`lib/client.js:4021-4037`).
- Its own code comments flag that resolving the registration entry point wrongly **fails silently**:
  it tries `uiConversation.events.register` first and `service.register` second, and warns that getting
  this wrong yields "no buttons, all-green boot" (`lib/client.js:3848-3858`).

So the leading hypothesis is that the **Conversation Definition / node-kind registration path** changed
between `rc.6` and `0.1.7-rc.2`, while slot registration did not — which would break exactly the
user-message affordance and nothing else.

### What to establish

1. **Reproduce the failure logically.** Walk `dsh-retrace`'s client boot path against the shipped
   `0.1.7-rc.2` packages and find the first point of divergence. Quote both sides.
2. **The registration entry point.** In the shipped version, what *is* the supported way to register a
   Conversation Definition? Is `ctx.uiConversation.events.register` present? Is `service.register`
   present? Was either renamed, moved, or given a different signature? Find the shipped declaration.
3. **The node-kind contract.** Has `ChatNodeKind`, the `{ [Kind in ChatNodeKind]: { node: ChatNode<Kind> } }`
   key table, the `chatNode(context, kind, seq, state)` builder, or the
   `renderSlot("conversation.chat.node", …, {entryKey: routedNode.kind})` dispatch changed?
   Specifically: can a plugin still manufacture a **new** kind, or has the key table been closed?
4. **Anchoring.** Did the `seq`-based anchor (including the `seq - 0.5` sort trick) survive? Is there a
   new ordering mechanism?
5. **Any other delta** that would affect a plugin doing this work: `ctx.sessionProjections.register`
   shape, `session.append` options, `inputActions`, locale registration, the slot catalogue entries the
   plugin relies on.
6. **Verdict for the spec.** State precisely what the new plugin must do differently to make
   user-message editing work on v2.0.15 — and flag any delta that would **also** threaten the new
   plugin's other features.

### Sources

Shipped app at `D:\DSH Desktop\resources\app\node_modules\@deepseek-ai\` (ground truth; client bundles
are **not** minified); `dsh-retrace` at `C:\Users\Administrator\.dsh\profiles\desktop\node_modules\dsh-retrace\`;
its GitHub repo <https://github.com/yamingmou/dsh-retrace> for the version history and any migration
notes; and `dsh-client-ui-conversation`'s and `dsh-client-ui-chat`'s own READMEs, whose changelogs may
name the change. Prefer `glob`/`grep`/`read`; PowerShell `Get-ChildItem -Recurse` is unreliable here.

## Addendum — four hypotheses falsified; the failure is downstream of registration

Follow-up investigation, driven by the user's observation that **the action row beneath user messages
shows only 复制 (Copy)** while **assistant replies show both 撤回 and 重新生成**.

That observation also corrects this ticket's own earlier conclusion: the assistant-side affordances prove
`dsh-retrace` **is** running. The profile lists it in `dsh.profile.bundles`
(`~\.dsh\profiles\desktop\package.json:24`), and `.dsh-market/hot-1.yml` mounts it a **second** time
(`id: mkt-dsh-retrace`, `name: file:///…/dsh-retrace/lib/index.js`) — the source of the earlier
`duplicate prefix route` and `versioning disabled: domain 'retrace' is already open`. The
`entry "dsh-retrace" not found` error is about the root row only.

So the real symptom is precise: **plain list-slot registrations work (assistant actions); the
manufactured Conversation-Definition node kind produces no node at all.** The user's row is the shipped
`UserMessageNodeView` default, which renders `MessageIconActions` with copy only.

Falsified, in order:

1. **API breakage in the Definition / node-kind path** — falsified by the plugin's own telemetry
   (`definitions=4 slots=6 seats=6 uiConversationSource=uiConversation.events`).
2. **`.events.register` became a dead shim** — falsified.
   `ConversationEventRegistry.register` is the live registry: it calls `registerDefinition` and
   `refresh()`, and notifies subscribers (`dsh-client-ui-conversation/lib/client.js:2647-2657`).
3. **`event.surfaceOp` no longer reaches the client** — falsified. `dsh-retrace`'s
   `userActionsDefinition.match` gates on `event.surfaceOp === 'append'`
   (`dsh-retrace/lib/client.js:596-602`), and the **shipped chat client uses the identical predicate
   successfully**: `isSurfaceEvent(event) && event.surfaceOp === "append"`
   (`dsh-client-ui-chat/lib/client.js:8827`). The wire type carries it too
   (`SessionWireEvent.surfaceOp`, `dsh-api-session-controller/lib/typert.host.js:2185`).
4. **Event-to-Definition arbitration** — falsified. Dispatch is **all-matches, not first-match-wins**:
   `for (const definition of this.eventDefinitions.entries()) { const result = definition.match(event);
   if (result === null) continue; … accept(definition, result.id, result.role) }`
   (`dsh-client-ui-conversation/lib/client.js:2148-2153`). The shipped `user` definition cannot starve
   `retrace-actions`.

**Where the failure therefore must be.** Downstream of registration and matching — the stages that
telemetry cannot see: whether `start` ever populates `context.state`, whether `buildViewNode` is called,
and whether the produced `user-actions` node survives routing/grouping/placement into
`conversation.chat.node`. `ctx.uiConversation.groups.register` and `views.register` both throw when a
target is already registered (`:2906`, `:2883`), so the grouping stage is a live suspect.

**Conclusion, and it matters for the spec:** this is now a **runtime** question, not a code-reading one.
Registration-success telemetry is demonstrably **not** evidence that a row renders. The spec must
therefore treat "the row actually appears" as an acceptance criterion requiring observation — not
something to be inferred from a green boot.

## Answer

**The leading hypothesis is falsified.** The Conversation-Definition / new-node-kind registration path
did **not** break on v2.0.15. Full report:
`.scratch/dsh-resend-plugin/research/v2.0.15-edit-breakage.md`.

### What the evidence shows

The plugin's own client telemetry is in the host log, on `DSHDesktop/2.0.15`:

```
[dsh-retrace] client: loaded id=dsh-retrace inject=[slots,locale] definitions=4 slots=6 seats=6 uiConversationSource=uiConversation.events
```
(`%APPDATA%\DSH Desktop\logs\host\dsh-2026-09-28.log:108,143,182,237`)

- `uiConversationSource=uiConversation.events` — not the failure value `…no-register-entry`, so
  `ctx.uiConversation.events.register` **exists and was reached**.
- `definitions=4` — all four Definitions registered, including `userActionsDefinition`.
- `slots=6 seats=6` — all six `ctx.slots.register` calls succeeded, including the three
  `conversation.chat.node` keys `user-actions` / `retrace-reference` / `recall-marker`.

Independently verified unchanged: the `uiConversation` service, `events.register`,
`assertDefinitionTarget`, the `chatNode` shape, and the `seq - 0.5` anchor (never integer-validated).
Crucially, **the `ChatNodeKind` key table is not runtime-enforced** — a keyed register accepts any key,
and unknown kinds have a designed `fallback`. No slot the plugin uses is missing from the catalogue.

### Two facts that undercut the premise

1. **The plugin is currently not mounted at all.** `dsh-retrace` is in the profile's `dependencies`
   (`~\.dsh\profiles\desktop\package.json:9`) but **not** in `dsh.profile.bundles` (`:15-24`), producing
   `[root] patch: entry "dsh-retrace" not found` on every start after 15:44 (log `:251,255,261`). An
   earlier **double mount** (`.dsh-market` plus the profile root) also occurred, producing
   `duplicate prefix route "/api/plugins/retrace"` and `versioning disabled: domain 'retrace' is already
   open` (`:112,120,130`).
2. **No operation was ever invoked.** Zero log matches for `spanFromFile`, `editAndResend`,
   `not-user-message` or `target-shadowed`, though the wrapper logs unconditionally. The reported
   working/failing split is therefore **not corroborated by host evidence**, and no mechanism was
   invented to fill the gap.

### The decisive diagnostic — one observation settles the mode

"Recall works" **cannot** mean user-message recall: in `UserActionsRow` the Edit and Recall chips are
unconditional children of one `<span>` behind one shared early return, so they cannot fail
independently. Assistant-side recall is a separate component on the plain list slot. Therefore:

| Observation | Meaning |
|---|---|
| No action row under the user's own message, **plus** an error panel titled `用户消息操作渲染出错` | the row's render is throwing |
| No action row, **no** error panel | `match()` / `buildViewNode()` returned null — definition or anchor mismatch |
| Action row **present** | the row renders; the fault is inside the edit flow itself |

### The one remaining code-level candidate (hypothesis, not cause)

`isRoundBoundary` is used by `editAndResend` **alone** (`lib/host-core.js:501`; recall has no type check,
regenerate checks `assistant/message`), where
`isRoundBoundaryEvent = event?.type === 'user/message' && event?.data?.source?.kind === 'user'`
(`lib/span-semantics.js:74-75`). `lib/host-compat.js:158` falls back to positional
`sessionEvents(session)[seq]`, and the host event view is **windowed and sparse**, which yields
`undefined`, then `not-user-message`, which is terminal. This is the only path found that is exclusive to
edit-and-resend, so it alone matches the reported symptom's shape.

**On upstream:** `v0.4.32` is the newest tag and `main` equals it — **no fix exists**. Its CHANGELOG
0.4.28 names this exact symptom twice (`Session.events` removal and the plugin's own
`snapshot.chat.nodes` read); both were fixed, and both fixes are present in the shipped build.

### Platform constraints confirmed for our own implementation

Normative for the spec, independent of retrace's bug:

- `sourceEventSeqs` must cite **every** shadowed node — otherwise a hard throw
  (`dsh-session/lib/index.js:327-328`).
- A replace `surfaceOp` must have **exactly** the three keys `{op, startSeq, endSeq}` (`:290-293`).
- Non-surface-eligible events may **not** carry `surfaceOp` / `sourceEventSeqs` (`:297-301`).
- `assistant/message` may **never** carry `sourceEventSeqs` (`:313`) — hence the `user/message` carrier.
- **`isRoundBoundary` also gates regenerate's span-start validation**, so regenerate can silently degrade
  to `no-prompt` — our implementation must not inherit that failure mode.

Report: `.scratch/dsh-resend-plugin/research/v2.0.15-edit-breakage.md`