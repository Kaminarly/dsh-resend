# Does the client event pipeline strip top-level `sourceEventSeqs`?

Ticket: [Does the client event pipeline strip top-level `sourceEventSeqs`?](../issues/03-sourceeventseqs-delivery.md)
Scope: read-only. Nothing was installed, run, or modified. No session was opened.

Tags: **verified-from-code**, **from-docs** (a normative comment or README in a primary source),
**inferred**. Paths:

- `PKG` = `D:\DSH Desktop\resources\app\node_modules\@deepseek-ai\`
- `PLG` = `C:\Users\Administrator\.dsh\profiles\desktop\node_modules\dsh-retrace\`

---

## Verdict

**No. Nothing strips it, on either path, and nothing could.** But the more useful finding is the
next one: **no shipped client consumer reads it either.** `sourceEventSeqs` is delivered,
schema-declared, validated — and completely unconsumed on the browser side.

That cuts both ways, and the spec must respect both edges:

- It is **safe to rely on**: the field is an accepted wire field, the client validator explicitly
  refuses to normalise, and both delivery paths pass the event object through untouched.
- But **we would be its only consumer.** No first-party browser feature would notice if a future
  version stopped populating it. That is a weak compatibility position for a field the hiding
  mechanism depends on — and it is the strongest argument for
  [ticket 18](../issues/18-client-to-host-channel.md)'s recommendation that the **host return the
  shadowed seq set from the same Remote call** rather than the client re-deriving it from the carrier.

Answers to the ticket's four questions, in order:

| # | Question | Answer |
|---|---|---|
| 1 | Is `sourceEventSeqs` preserved on the envelope, or projected away? | **Preserved, verbatim, on both history pages and live follow frames** — the same `entryFor()` on both paths |
| 2 | Is `surfaceOp` preserved, and in what shape? | **Yes, unchanged** — and the client runs a full copy of the host's surface validator over it |
| 3 | Does the client reader expose anything but `reader.previous(kind)`? | **No — `previous(kind)` is the reader's *only* method.** There is no event-at-seq lookup |
| 4 | Does any shipped client bundle read either field? | **`surfaceOp`: yes, three UI bundles. `sourceEventSeqs`: zero** |

## 1. `sourceEventSeqs` is delivered, and cannot be stripped

**`assertSessionWireEvent` is a whitelist that throws on anything unknown**
(`PKG\dsh-api-session-controller\lib\client.js:331-350`, **verified-from-code**):

```js
/** Event-local acceptance for raw Session journal responses; payloads remain owner-defined JSON. */
/**
* Reject non-current event envelopes without stripping or normalizing wire fields.
* ...
*/
function assertSessionWireEvent(value) {
  ...
  for (const key of Object.keys(event)) switch (key) {
    case "type": case "seq": case "time": case "data":
    case "ignorable": case "surfaceOp": case "sourceEventSeqs": break;
    default: throw new Error(`${subject} has unexpected field ${key}`);
  }
```

Two independent guarantees in one function: `sourceEventSeqs` is an **accepted** field, and an
event carrying any **unexpected** field is **rejected** rather than rebuilt. Its own doc says
"without stripping or normalizing wire fields" (**from-docs**) — the discipline is stated, not
merely observed.

**Both delivery paths share one serializer.** `entryFor` wraps the whole event unchanged
(**verified-from-code**):

```js
function entryFor(event) {
  return { type: 'event', event: event };   // history.js:431-437
}
```

- **History pages**: `pageRecords(page.events)` → `records: pageRecords(page.events)` in the opening
  snapshot (`PKG\dsh-api-session-controller\lib\types\history.js:214`, `:439-441`).
- **Live follow frames**: `yield entryFor(item.event);` (`:251`).

The follow generator validates seq contiguity (`:247-249`, `session event stream skipped seq`) and
never touches `surfaceOp` or `sourceEventSeqs`. So the answer to "is a live follow frame as reliable
as a history page" is **they are the same code path** — this was the ticket's last open risk and it
closes.

**The remote codec carries it too**, declared as an optional JSON field in both
`PKG\dsh-api-session-controller\lib\client.js` typert schemas and
`PKG\dsh-api-remotes\lib\client.js:9922`, `:9972`, `:10433` (**verified-from-code**).

**Therefore retrace's three-tier fallback is defensive, not a response to an observed loss.** Its
own comment is careful about this: it describes the fallback as applying when "顶层 provenance 被事件管道
剥掉/截断时" (`PLG\lib\client.js:699-702`, **verified-from-code**) without ever claiming it observed a
strip, and `carrierShadowedSeqs` only leaves the top-level array when it "looks truncated", i.e. when
the range start cannot be located in it (`PLG\lib\marker-carrier.js:434-460`).

## 2. `surfaceOp` is preserved in its current shape

Not merely preserved — **re-validated on the client by a full copy of the host's surface validator**
(`PKG\dsh-api-session-controller\lib\client.js:263-320`, **verified-from-code**): `isReplaceOp` demands
**exactly three keys** (`op`, `startSeq`, `endSeq`, `:268-271`), and `assertSourceEventReferences`
(`:289-307`) enforces the same rules the host does, including the one that matters most here:

```js
const missing = shadowedSeqs.filter((seq) => !sources.has(seq));
if (missing.length > 0) throw new Error(`surface replace: sourceEventSeqs must include every shadowed surface node; missing ${missing.join(", ")}`);
```

So a client half that wants to be *certain* the carrier it holds is well-formed can validate it the
same way the platform does, and a malformed carrier is a hard failure rather than a silent
mis-render.

One shape caveat for the spec: the **current host accepts only `startSeq`/`endSeq`** — the
`isReplaceOp` check rejects `{start, end}` — which matches the map's established fact and retrace's
own note that it probes the shape at runtime.

## 3. The client reader has exactly one method

This is the finding that constrains how a plugin can *find out* what a carrier shadowed. The reader
is built at `PKG\dsh-client-ui-conversation\lib\client.js:2328-2349` (**verified-from-code**):

```js
readerFor(beforeSeq, dependencies) {
  return { previous: (kind) => {
    const predecessor = this.previousContext(kind, beforeSeq);
    dependencies.set(kind, {
      kind,
      key: predecessor?.key,
      revision: predecessor?.revision,
      windowGap: predecessor === void 0 && this.hasMore
    });
    if (predecessor?.state === void 0) return void 0;
    ...
  } };
}
```

**`previous(kind)` is the entire interface.** There is no `eventAt(seq)`, no `get`, no iteration, and
nothing that takes a seq. Two consequences the spec must carry:

1. **Retrace's asserted limitation is confirmed**: "客户端没有 `eventAt`（只能按 kind 取相邻上下文）"
   (`PLG\lib\marker-carrier.js:427-428`). A Definition cannot ask "what did this carrier shadow?" — it
   can only ask "give me the previous context of kind *K*". The working trick is therefore to register
   a **dedicated Definition purely to be readable by kind** — which is exactly what retrace's
   `auditContextDefinition()` is for: it declares no `target` and no `buildViewNode` and exists only
   so the reader can fetch the adjacent event by kind (`PLG\lib\marker-carrier.js:405-414`).
2. **A miss can be a paging artifact, not an absence — and the assembler handles it for you.** The
   reader records `windowGap: predecessor === void 0 && this.hasMore` and feeds it into the
   dependency set. The plugin never sees that flag, but the effect is that the assembler **replays**
   the affected context once the missing predecessor is paged in. The spec obligation that follows:
   a Definition's `start` must be **pure and re-runnable**, because it can be invoked again with a
   different reader answer for the same event.

## 4. Who actually reads the two fields

A sweep of every shipped `*/lib/client.js` (**verified-from-code**):

**`sourceEventSeqs` — zero consumers.** All 13 occurrences are in two files, neither a feature:

| File | What it does with it |
|---|---|
| `PKG\dsh-api-session-controller\lib\client.js:278-306`, `:342` | the wire validator quoted in §1 |
| `PKG\dsh-api-remotes\lib\client.js:9922`, `:9972`, `:10433` | remote codec schema declarations |

**`surfaceOp` — real consumers on the client**, all using it for exactly one purpose, as an
append-origin filter:

| Consumer | Evidence |
|---|---|
| `PKG\dsh-client-ui-chat\lib\client.js` | `isAppendSurfaceEvent` / `isReplacementSurfaceEvent` (`:8826-8838`), applied at `:9063`, `:9199`, `:9683` |
| `PKG\dsh-client-ui-deliverables\lib\client.js` | bundled copy of the predicate (`:1058`), applied `:1172` |
| `PKG\dsh-client-ui-schedule\lib\client.js` | bundled copy (`:1594`), applied `:1680` |

Note what this means for **hiding**: `surfaceOp` is read by three shipped UI bundles and by the host's
history pager (`history.js:409`), so its delivery is load-bearing for the platform itself. If a version
ever stopped delivering `surfaceOp`, the transcript would break visibly. `sourceEventSeqs` has no such
safety net.

## Consequence for the spec

1. **Do not make the hide depend on `sourceEventSeqs`.** It survives today, but we would be its only
   consumer — an unobserved field with no first-party test coverage. Have the host half **return the
   shadowed seq set as the result of the same Remote call that performs the rewind**
   ([ticket 18](../issues/18-client-to-host-channel.md)), and treat the top-level field as a
   best-effort fallback at most. This closes the loop with
   [Is a replaced message actually deleted…](delete-vs-hide.md), whose hide contract needs that set.
2. **The carrier's `sourceEventSeqs` is still mandatory** — the platform rejects a replace that omits
   a shadowed node (`surface.js:265-268` host-side, and the client re-checks it). Skipping it is a hard
   session-load failure, so "we get the set from the Remote result" must not be read as licence to
   write an incomplete citation.
3. **Accept either `surfaceOp` shape check in the plugin**, but write only `{op:'replace', startSeq,
   endSeq}` — `isReplaceOp` demands exactly those three keys and the `{start, end}` spelling is the
   older host's.
4. **If a Definition must reach an adjacent event, register a Definition for its kind.** There is no
   seq-addressed read; and the kind-only reader means two plugins using the same kind string would
   collide, so namespace the kind.
5. **Definitions replay.** A `start` that recorded "no predecessor" once can be re-run with one
   available; keep it pure and derive from the arguments.

## Confidence

**High** for §1, §2 and §4: the serializer, the validator and the consumer sweep are all read
directly, and §1's two paths call the same function.

**High** for §3's interface: `readerFor` returns an object literal with one property.

**Medium** for the replay inference in §3.2 — I read `windowGap` being recorded into the dependency
set and the assembler's replay machinery around it (`:2316-2327`), but I did not trace a replay
end-to-end to confirm that a Definition is always re-run when its predecessor arrives.

**Not established.** No runtime observation: no session was opened, no follower was attached, and no
carrier event was inspected as the browser receives it. Everything above is source reading.
