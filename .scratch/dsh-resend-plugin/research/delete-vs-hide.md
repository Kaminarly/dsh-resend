# Is a replaced message actually deleted, or only removed from the model surface?

Ticket: [Is a replaced message actually deleted, or only removed from the model surface?](../issues/15-delete-vs-hide.md)
Scope: read-only. Nothing was installed, run, or modified. No session was opened.

Every claim is tagged:

- **verified-from-code** — I read the line in the shipped artifact.
- **from-docs** — a normative comment or README in a primary source says it.
- **inferred** — my reasoning, not directly attested.

Paths abbreviated:

- `PKG` = `D:\DSH Desktop\resources\app\node_modules\@deepseek-ai\`
- `PLG` = `C:\Users\Administrator\.dsh\profiles\desktop\node_modules\dsh-retrace\`

---

## Verdict

**Surface removal does not remove a message from the human transcript.** The plugin must hide the
replaced row itself. `dsh-retrace`'s CSS hide is **load-bearing, not belt-and-braces**.

The ticket's two pieces of evidence are not "both partly right" — **evidence (2) is right and
evidence (1) is a misreading of the code it cites.** `isAppendSurfaceEvent` does not mean "this
event is still on the surface". It means "this event *entered* the surface at its own log position",
and it is the filter used to build the transcript *specifically so that a landed replacement does
not erase the row the user already saw*:

> "The model-visible surface deliberately shadows replaced ranges, so it is the **wrong source for a
> human transcript** — a landed replacement would erase conversation the user already saw.
> Append-origin events are that transcript's durable source material; **replacement copies stay
> model-only**."
> — `PKG\dsh-session\lib\types\surface.js:43-46`, **from-docs**

So a shadowed node keeps `surfaceOp === 'append'` forever (the log is append-only; the marker was
written at append time and is never rewritten), the transcript filter keeps matching it, and it
keeps rendering. What the replacement removes from is the **model's** view only.

Four consequences follow, and three of them were not in the ticket:

1. **The replaced row still renders, unchanged** — same content, same position, no gap, no
   placeholder, no marker. The spec **cannot** promise "the replaced message disappears" as platform
   behaviour.
2. **The replacement's own content never renders either.** The transcript shows neither the old text
   disappearing nor the new text appearing in its place. The edited text becomes visible only when
   the plugin sends it again as a genuine append.
3. **This is deliberate platform intent, not a bug** — so a plugin that hides rows is overriding a
   design decision, and owns the consequences.
4. **A rewind shadows the whole suffix**, so hiding is not "hide one bubble" — it is "hide the
   message and everything after it", which is exactly why the declined `>40 %` safety valve was
   invented.

---

## 1. The transcript's event source — the exact predicate

**`PKG\dsh-client-ui-chat\lib\client.js:9195-9204`** — the `input-message` Conversation Definition,
which produces the `user` / `steering` / `context` / `turn-trigger` chat nodes, matches **only**
append-origin events (**verified-from-code**):

```js
const messageDefinition = {
  kind: "input-message",
  target: "chat",
  match: (event) => {
    if (event.type === "user/message") return isAppendSurfaceEvent(event) && !isCompactionCheckpoint(event) ? {
      id: String(event.data.id),
      role: "start"
    } : null;
    return null;
  },
```

with the bundled predicate at **`:8826-8828`** (**verified-from-code**):

```js
function isAppendSurfaceEvent(event) {
  return isSurfaceEvent(event) && event.surfaceOp === "append";
}
```

Three corroborations, all **verified-from-code**:

- The unclaimed-event fallback uses the same gate: `unknownFallbackDefinition.match` at
  **`:9060-9066`** is `event.type !== "assistant/live-chunk" && isAppendSurfaceEvent(event)`. So a
  replacement event does not fall into the "unknown surface" bucket either.
- **The only shipped Definition that matches a replacement `user/message` is `compaction`** —
  `compactionDefinition` at **`:9021-9049`**, gated by `compactSource` at **`:8878-8886`**, which
  requires `event.data.source.kind === "compact-checkpoint"`. I enumerated the full shipped
  registration list at **`:10894-10910`** (13 Definitions + one group): `inbox-next-step`,
  `inbox-next-turn`, `input-message`, `developer-message`, `request-prompt`, `assistant`,
  `turn-process`, `tool`, `command`, `compaction`, `retry`, `turn-error`, `turn-max-tokens`,
  `turn-tail`, `unknown-surface`. Of these, only `compaction` (and `command` via the same
  `compactSource` gate, `:8970-8974`) accepts a non-append surface event.
  **Therefore an arbitrary plugin-authored carrier renders no chat row at all** — not a
  placeholder, not a fallback JSON block.
- The host pages history by the same predicate: `paginate` at
  **`PKG\dsh-api-session-controller\lib\types\history.js:395-426`** counts messages with
  `if (!MESSAGE_TYPES.has(event.type) || !isAppendSurfaceEvent(event)) continue;` (**verified-from-code**),
  mirrored in the bundled host at **`PKG\dsh-api-session-controller\lib\index.js:1666`**.
  The transcript filter is not a client-side accident; the paging cut agrees with it.

## 2. The model-context source — a different consumer, folded

**`PKG\dsh-session\lib\types\surface.js:432-459`, `:468-477`** (**verified-from-code**): a `replace`
plan splices the range out and inserts the replacement's own seq —

```js
else if (plan?.kind === 'replace') {
    state.nodes.splice(plan.startIdx, plan.endIdx - plan.startIdx + 1, plan.seq);
```

and `foldSurface(events)` replays the whole log through exactly that transition. So the model's
surface genuinely loses the shadowed nodes. **The asymmetry the ticket hypothesised is real, and it
is the whole answer**: one consumer folds the surface, the other deliberately does not.

## 3. What the user actually sees at a replaced site

**The original row, still rendered, in its original position, with its original content, and with
nothing marking it as replaced** (**inferred**, from §1 + §2 — the two predicates are mutually
exclusive and I found no third consumer).

There is no gap and no placeholder, because no node exists to render one: the carrier fails
`isAppendSurfaceEvent` in every shipped Definition. The row is byte-identical to what it was before
the rewind.

The platform *does* have a working pattern for "render something at a replacement" — it is just not
used for user messages. `compactionDefinition.buildViewNode` (**`:9043-9048`**) returns a visible
node anchored at the **carrier's own seq** (`marker.seq = checkpoint.event.seq`), which is how the
"compacted" marker appears. A plugin can copy that shape. It does not remove the shadowed row.

## 4. Why `dsh-retrace` hides via CSS

It is protecting against **(i) — the transcript renders replaced rows and they must be hidden**. It
is not (iii) and it is not merely (ii).

- Forced mechanism. The hide is not optional in retrace's design; `options.hideShadowed` turns it
  off as a user preference, not as a fallback: "Off: every message stays visible; markers only show
  the notice" (`PLG\lib\client.js:266-267`, **verified-from-code**; Chinese pair at `:94-95`).
- Its own framing ties the hide to view/model consistency: "Plus the **view-side sync**: append a
  marker node whose renderer injects CSS hiding the shadowed rows, so 视图与模型上下文始终一致"
  (prior-art report, `dsh-retrace-prior-art.md:488`).
- And the reason the edited text still shows up is that retrace **re-prompts after the rewind**
  (`PLG\lib\host-core.js:490-533`: `writeMarker(...)` at `:526`, then `agent.followup(message)` at
  `:530`, **verified-from-code**) — i.e. it relies on a *new append* for the new visible row, exactly
  as §1 predicts it must.

### The hide contract, in the detail a spec needs

All **verified-from-code** unless noted:

| Element | Where |
|---|---|
| CSS injected from a React-rendered `<style>` owned by the plugin's own row | `PLG\lib\client.js:1336` |
| Rule shape: `[data-chat-anchor-key=<JSON.stringify(key)>]{display:none!important}` | `PLG\lib\client.js:1318-1320` |
| Keys are read from the Chat snapshot's **node map**, matched by `anchorSeq` — never constructed | `PLG\lib\client.js:802-834` |
| `turn-tail` rows match on `closing.finalNode.seq` (the seq is on the final node, not `closing`) | `PLG\lib\client.js:808-813` |
| `tool-call` rows match on `root.seq` (tool rows anchor at the log-only `tool/call` seq, which is never a surface node) | `PLG\lib\client.js:815-821` |
| Pseudo rows anchored at **half seqs** map back with `Math.ceil` before matching | `PLG\lib\client.js:823-831` |
| The rules must stay mounted even when the notice is dismissed, or the row reappears | `PLG\lib\client.js:1315-1317` |
| Per-marker plan memoised on snapshot identity (O(rows × markers × nodes) rescan cost 346 ms @2000 rows, 1.6 s @3000) | `PLG\lib\client.js:871-937` |
| Safety valve: >40 % of real rows, exempt at ≤20 rows; plugin pseudo-kinds excluded from the denominator | `PLG\lib\client.js:780-795`, `:860-869` |

The DOM contract itself, **verified-from-code** at `PKG\dsh-client-ui-chat\lib\client.js:1756-1765`:

```js
const flowKey = groupPart === void 0 || groupPart === "response" ? routedNode.key : JSON.stringify([routedNode.key, groupPart]);
return jsx("div", {
    "data-chat-anchor-key": flowKey,
    "data-chat-flow-key": flowKey,
    "data-chat-node-key": routedNode.key,
    ...
    "data-chat-flow-kind": routedNode.kind,
```

So: for an ungrouped row (a `user` row is one) the attribute is the node's stable key; for a grouped
process member it is the two-element JSON array. `routedNode.key` is the platform-assigned stable
context key — `chatNode` sets `key: context.key` (`:7143-7154`) and the registry throws if a
Definition returns anything else (`PKG\dsh-client-ui-conversation\lib\client.js:2440`) — which is
why reading keys out of the snapshot beats constructing them.

### A first-class alternative that does **not** work — record this so nobody re-chases it

The platform *does* have node-level hiding: `visibility` on a chat node, defaulted in `chatNode`
(`PKG\dsh-client-ui-chat\lib\client.js:7151`), honoured by `isVisibleChatNode` (`:7650-7651`), and
mandated as the correct way to withdraw a target — "return the same key with **hidden visibility**
instead" (`PKG\dsh-client-ui-conversation\lib\client.js:2505`) (**verified-from-code**; the shipped
client uses it for interrupted assistant steps, `PKG\dsh-client-ui-chat\lib\client.js:7614`).

**But a Definition can only set `visibility` on its own node.** The shipped `input-message`
Definition owns the `user` row and there is no override hook for another Definition's output (the
registry rejects duplicate kinds; see the map's double-mount note). So `visibility: 'hidden'` is not
a route to hiding the shipped user row — not even for ticket 01's phase-2 renderer, which would have
to re-author the row rather than hide it.

## 5. Consequence for the spec

**The spec must add a normative hiding section, and must not describe the mechanism as "removing the
message from the surface".** Concretely:

1. **Correct the mechanism statement.** A rewind changes the **model surface only**. Write it as:
   "the rewind removes the range from the *model-visible surface*; the transcript is append-origin by
   design and is unaffected, so the plugin hides the affected rows."
2. **Promise the disappearance as plugin behaviour, never as platform behaviour.** Acceptance
   criteria must observe the rendered row for the *hidden* case, and must also assert the negative
   case: with the plugin's hide disabled, the old row **is** still rendered (that is the platform's
   documented intent, and a regression test that expects it to vanish would be testing a fiction).
3. **Name what must be hidden.** Everything the rewind shadowed — the edited user message **and every
   row after it** (`assistant-step`, `tool-call`, `turn-tail`, and any pseudo row anchored into the
   range). This is the mechanism behind the ticket's "risk of a large rewind blanking most of the
   view".
4. **Name the contract**: `[data-chat-anchor-key]` CSS, keys resolved from the Chat snapshot's node
   map by `anchorSeq` (with the `turn-tail` / `tool-call` / half-seq cases above), emitted from a
   React-owned `<style>` element so the plugin never touches the DOM directly — which is also how it
   stays on the right side of `practices.md:36`.
5. **Record the declined safety valve as a live risk, with its real shape.** The user declined the
   ">40 % of the conversation" valve. Because a rewind shadows the whole suffix, a rewind near the
   top of a long session hides almost the whole transcript. With the valve declined, the spec should
   at minimum require a **count-based disclosure** (how many rows are now hidden) rather than a
   silent blank, and must state that the plugin is overriding documented platform behaviour.
6. **Record the two new hazards the ticket did not anticipate:**
   - The replacement's content is invisible. If the plugin ever rewinds **without** re-sending, the
     user sees the old text with the new reply under it — a transcript that contradicts the model.
     So "rewind, then send" must be a single atomic user-visible operation, never two affordances.
   - A stale or failed hide is *worse* than no hide feature at all, because the chat then shows a
     conversation the model does not believe it is in. This is a "fail loudly" case, not a
     "degrade quietly" one.

---

## Coupling to ticket 03, and evidence found incidentally

The hide needs the shadowed seq set on the **client**. Two candidate sources, and I found direct
evidence on the first (**verified-from-code**):

- **Top-level `event.sourceEventSeqs` is delivered and is not stripped.**
  `paginate`'s `entryFor` wraps the whole event unchanged — `{ type: 'event', event: event }`
  (`PKG\dsh-api-session-controller\lib\types\history.js:431-437`), and the client validator
  `assertSessionWireEvent` (`PKG\dsh-api-session-controller\lib\client.js:331-350`) allows exactly
  `{type, seq, time, data, ignorable, surfaceOp, sourceEventSeqs}` and **throws on any other field**,
  with the doc "Reject non-current event envelopes **without stripping or normalizing wire fields**".
  The remote codec carries both fields as optional JSON
  (`PKG\dsh-api-session-controller\lib\client.js` typert schemas).
- Retrace's own three-tier fallback is therefore defensive, not observed:
  `carrierShadowedSeqs` prefers the top-level array, slices the leading audit seq off by locating
  `surfaceOp.startSeq`, and only falls back to the paired audit context when the top-level array
  looks truncated (`PLG\lib\marker-carrier.js:434-460`); its comment says "顶层 provenance 被事件管道
  剥掉/截断时" without claiming an observation (`PLG\lib\client.js:699-702`).

**Not yet verified** (leave for ticket 03): whether a *live follow frame* carries it as reliably as a
history page does, and what the client reader actually offers — no `eventAt(seq)`, per retrace's
comment that "客户端没有 `eventAt`（只能按 kind 取相邻上下文）" (`PLG\lib\marker-carrier.js:427-428`),
which I have **not** independently confirmed against the platform's reader interface.

One related trap for the spec, **verified-from-code**: `MessageSourceMap` is a **closed union** —
`user`, `model`, `tool`, `system-prompt`, `model-selection`, `user-approval`, `ptc-mode`,
`tool-registry`, `user-rpc`, `agent-message`, `subagent-settled`, `skill-invocation`,
`cordis-host-runner`, `goal`, `schedule`, `compact-checkpoint`, `session-reference`
(e.g. `PKG\dsh-api-session-controller\lib\typert.host.js:1777`) — so a plugin cannot invent a
`source.kind` to label its carrier with. Marker identity must live in the carrier's `data.id` prefix,
which is what retrace does. `source: { kind: 'cordis-host-runner' }` is the first-party source kind
for a Cordis host plugin injecting a user message
(`PKG\dsh-cordis-host-runner\lib\index.js:2355, 2364, 2377, 2390, 2417`), and injected context
messages render as `context` nodes that `isVisibleChatNode` filters out of visible rows unless they
carry tool-registry changes (`PKG\dsh-client-ui-chat\lib\client.js:7650-7651`) — relevant to ticket 09,
not resolved here.

## Confidence

**High** for §1-§3: the predicate is quoted from the shipped bundle, the fold is quoted from the
shipped package, and the host's paging predicate agrees with the client's.

**High** for §4's mechanism and contract; **medium** for the claim that retrace's fallback tiers were
never triggered, since I am reading its comments rather than its telemetry.

**Not established**: I could not observe a rendered transcript. This session cannot install a plugin
and cannot reach loopback. Everything above is source reading. I also did not verify whether the
sidebar turn-outline or in-transcript navigation still lists CSS-hidden rows — worth one line in the
spec's risk list.
