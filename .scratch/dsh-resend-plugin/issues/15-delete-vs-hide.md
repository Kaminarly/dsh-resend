# 15 — Is a replaced message actually deleted, or only removed from the model surface?

Type: research
Status: resolved — report:
[`../research/delete-vs-hide.md`](../research/delete-vs-hide.md)

## Question

**The approach is now decided:** the replaced message is **hidden by removing it from the surface**, and
the user has accepted that physical deletion is impossible (the log is append-only and never rewritten).
So this ticket is no longer asking *which* approach to take — it is asking **whether surface removal
alone is sufficient**, which is the part still unknown.

**Established:** there is no delete or truncate API. A history rewind is performed by appending a
carrier event with a surface operation:

```
session.append('user/message', data, {
  surfaceOp: { op: 'replace', startSeq, endSeq }, sourceEventSeqs: [ …every shadowed node… ]
})
```

**Two pieces of evidence conflict, and this ticket exists to resolve them:**

1. One reading of `@deepseek-ai/dsh-session` says the human transcript is built by reading **only**
   events whose `surfaceOp === 'append'` (reported around `surface.js:39-52`). If so, replaced nodes
   vanish from the transcript automatically and **nothing further is needed**.
2. `dsh-retrace` nevertheless implements an **additional CSS-based hide** with its own DOM contract
   (`data-chat-anchor-key`, `@deepseek-ai/dsh-client-ui-chat/lib/client.js:1760`) and a configurable
   setting "按标记隐藏被编辑/撤回的消息". It would not need that if the transcript dropped replaced
   nodes automatically.

Both cannot be wholly right. Determine which — because if (2) is the truth, the spec must specify a
hiding mechanism, and the user has **declined** the ">40 % of the conversation" safety valve, so the
risk of a large rewind blanking most of the view must be recorded prominently.

## What to establish

1. **The transcript's event source.** How does the client-side Conversation assembly select events to
   render? Find the exact predicate. Does it filter on `surfaceOp`, on the presence of a marker, on a
   host-served projection, or something else? Quote it with `file:line`.
2. **The model-context source.** Confirm separately that `foldSurface(events)` excludes replaced nodes
   from what the model sees. These are two different consumers and may behave differently — that
   asymmetry is the likely resolution of the conflict.
3. **What the user actually sees** at the site of a replaced message: nothing at all (the row is gone),
   a gap/placeholder, or the original row still rendered? If a row remains, what is its content?
4. **Why retrace hides via CSS.** Read its hide path and determine which of these it is protecting
   against: (i) the transcript does render replaced rows and they must be hidden; (ii) a deliberate
   choice to keep rows visible-but-marked as a user preference; (iii) defence against a specific
   upstream behaviour it observed. Its comments may say.
5. **Consequence for the spec.** State plainly whether the spec can promise **"the replaced message
   disappears"** as a platform behaviour, or whether it must specify its own hiding. If hiding is
   required, say what it must hide and by what contract — and note that the user has declined the
   ">40 % of the conversation" safety valve, so the spec must record the resulting risk of a large
   rewind blanking most of the view.

## Sources

`D:\DSH Desktop\resources\app\node_modules\@deepseek-ai\` — `dsh-session` (surface fold, `surface.js`,
`README.zh.md`), `dsh-client-ui-chat` (Conversation assembly, node rendering, the `data-chat-anchor-key`
contract), `dsh-client-ui-conversation`, `dsh-session-projection`; and
`C:\Users\Administrator\.dsh\profiles\desktop\node_modules\dsh-retrace\lib\client.js` (its marker and
hide path, around lines 780-795 and 855-869). Prefer `glob`/`grep`/`read`; PowerShell
`Get-ChildItem -Recurse` is unreliable here.

Report to: `.scratch/dsh-resend-plugin/research/delete-vs-hide.md`

## Answer

**Evidence (2) wins; evidence (1) was a misreading.** Surface removal does **not** hide a message
from the human transcript. `dsh-retrace`'s CSS hide is load-bearing.

`isAppendSurfaceEvent` (`@deepseek-ai/dsh-session/lib/types/surface.js:50-52`, bundled at
`dsh-client-ui-chat/lib/client.js:8826-8828`) does not mean "still on the surface" — it means
"entered the surface at its own log position". Its normative comment (`surface.js:43-46`) says the
model-visible surface is "the **wrong source for a human transcript** — a landed replacement would
erase conversation the user already saw", and that "replacement copies stay model-only". A shadowed
node keeps `surfaceOp === 'append'` forever, so the transcript keeps rendering it.

1. **Transcript predicate.** `dsh-client-ui-chat/lib/client.js:9195-9204` — the `input-message`
   Definition matches a `user/message` only when `isAppendSurfaceEvent(event)`. The `unknown-surface`
   fallback (`:9060-9066`) has the same gate. Enumerating the shipped Definitions (`:10894-10910`),
   the **only** one that accepts a replacement `user/message` is `compaction`, gated on
   `source.kind === 'compact-checkpoint'` (`:8878-8886`, `:9021-9049`). The host pages history by the
   same predicate (`dsh-api-session-controller/lib/types/history.js:409`).
2. **Model-context source.** `foldSurface` splices the range out and inserts the carrier
   (`surface.js:442`, `:468-477`). The asymmetry is real and is the whole answer.
3. **What the user sees.** The original row, unchanged, in place, with **no** gap, placeholder or
   marker. Nothing renders at the replacement site, because no shipped Definition matches it.
4. **Why retrace hides.** Forced — (i). `options.hideShadowed` (`lib/client.js:266-267`) is a
   preference layered over a mandatory mechanism, not an alternative to it. Retrace re-prompts after
   the rewind (`lib/host-core.js:490-533`: `writeMarker` then `agent.followup`), which is exactly why
   the edited text appears: it arrives as a **new append**.
5. **Consequence.** The spec must **not** say "hidden by removing it from the surface", must not
   promise the disappearance as platform behaviour, and must carry a normative hiding section: hide
   `[data-chat-anchor-key]` rows (`dsh-client-ui-chat/lib/client.js:1756-1765`) with keys resolved
   from the Chat snapshot's node map by `anchorSeq` — never constructed — handling `turn-tail`
   (`closing.finalNode.seq`), `tool-call` (`root.seq`) and half-seq pseudo rows, emitted from a
   React-owned `<style>`. Node-level `visibility: 'hidden'` exists (`:7151`, `:7650-7651`;
   `dsh-client-ui-conversation/lib/client.js:2505`) but is **not** available for hiding another
   Definition's row.

Two hazards the ticket did not anticipate, both now spec-critical:

- **The replacement's content is invisible too.** Rewind-without-resend leaves the old text on
  screen with a reply to text the user cannot see. "Rewind + send" must be one atomic user-visible
  action.
- **A failed hide is worse than no hide feature** — the chat then shows a conversation the model does
  not believe it is in. Fail loudly, do not degrade quietly.

The declined `>40 %` safety valve is a **live** risk and its shape is now known: a rewind shadows the
whole suffix, so a rewind near the top of a long session hides nearly the whole transcript. The spec
should require count-based disclosure at minimum, and must state that the plugin overrides documented
platform behaviour.

Incidental evidence for [Does the client event pipeline strip top-level `sourceEventSeqs`?](03-sourceeventseqs-delivery.md):
`entryFor` passes the whole event through (`history.js:431-437`) and the client validator
`assertSessionWireEvent` accepts `sourceEventSeqs` while refusing any unknown field, "without
stripping or normalizing wire fields" (`dsh-api-session-controller/lib/client.js:331-350`). Recorded
there; that ticket is still open.