# 03 — Does the client event pipeline strip top-level `sourceEventSeqs`?

Type: research
Status: resolved — report:
[`../research/sourceEventSeqs-delivery.md`](../research/sourceEventSeqs-delivery.md)

## Question

`dsh-retrace` defends against the client losing top-level `sourceEventSeqs` **three separate ways**,
yet its documentation never states that it observed the loss. Establish the truth:

1. Trace the path from a server-side `session.append(…, {surfaceOp, sourceEventSeqs})` to the client's
   in-memory session view. Is `sourceEventSeqs` preserved on the event envelope, or projected away?
2. Is `surfaceOp` preserved, and in what shape?
3. What does the client actually have for surface math — confirm that the client exposes
   `reader.previous(kind)` but **no** "event at seq" lookup, and what follows from that for a
   renderer that needs to know which nodes a marker shadows.
4. Does the shipped client bundle show any consumer reading either field?

Determines how much defensive machinery our spec must require, and whether the client can render a
"replaced here" marker at all without a host-provided projection.

## Why it matters

If the field is not delivered, the spec must require the **host** half to compute and serve the
marker state through a session projection (`ctx.sessionProjections.register({…, wire:{view}})`) —
a unit without `wire` is checkpoint-only and never served.

## Sources

`…\dsh-client-ui-chat\lib\client.js` (event ingest, `reader.previous`),
`…\dsh-client-ui-session\`, `…\dsh-session-projection\`, `…\dsh-api-session-controller\lib\client.js`
(the client session view), and `dsh-retrace\lib\client.js` (its three fallbacks).

Report to: `.scratch/dsh-resend-plugin/research/sourceEventSeqs-delivery.md`

## Answer

**No — nothing strips it, on either path, and nothing could. But no shipped client consumer reads it
either.** The field is delivered, schema-declared and validated, and completely **unconsumed** on the
browser side.

1. **Delivered verbatim.** `entryFor(event)` wraps the whole event unchanged —
   `{ type: 'event', event: event }` (`dsh-api-session-controller/lib/types/history.js:431-437`) — and
   **both paths call it**: history pages via `pageRecords` (`:214`, `:439-441`) and **live follow
   frames** via `yield entryFor(item.event)` (`:251`). The follow generator checks seq contiguity
   (`:247-249`) and never touches the field. So the ticket's last open risk — "is a follow frame as
   reliable as a page" — closes: they are the same code path. The client validator
   `assertSessionWireEvent` (`dsh-api-session-controller/lib/client.js:331-350`) accepts
   `{type, seq, time, data, ignorable, surfaceOp, sourceEventSeqs}` and **throws on any other field**,
   with the normative doc "**without stripping or normalizing wire fields**". The remote codec declares
   both as optional JSON. **Retrace's three-tier fallback is defensive, not observed** — its own comment
   describes the stripped case without claiming it (`dsh-retrace/lib/client.js:699-702`).
2. **`surfaceOp` preserved and re-validated client-side** by a full copy of the host's surface validator
   (`dsh-api-session-controller/lib/client.js:263-320`), including
   "must include every shadowed surface node" (`:305-306`). `isReplaceOp` demands **exactly three keys**
   (`op`, `startSeq`, `endSeq`), so write the current shape and not `{start, end}`.
3. **The reader has exactly one method.** `readerFor` returns `{ previous: (kind) => … }` and nothing
   else (`dsh-client-ui-conversation/lib/client.js:2328-2349`) — **no event-at-seq lookup**, so a
   Definition cannot ask what a carrier shadowed. Retrace's workaround is confirmed as the only route:
   register a **dedicated Definition purely to be readable by kind** (`dsh-retrace/lib/marker-carrier.js:405-414`).
   The reader also records `windowGap: predecessor === void 0 && this.hasMore`, so a miss may be a
   paging artifact — the assembler replays the context once the predecessor loads, which means a
   Definition's `start` must be **pure and re-runnable**.
4. **Consumer sweep** (every shipped `*/lib/client.js`): **`sourceEventSeqs` has zero consumers** — all
   13 occurrences are the validator above plus remote codec schemas
   (`dsh-api-remotes/lib/client.js:9922`, `:9972`, `:10433`). **`surfaceOp` does have consumers**, all
   using it as an append-origin filter: `dsh-client-ui-chat` (`:8826-8838`, applied `:9063`, `:9199`,
   `:9683`), `dsh-client-ui-deliverables` (`:1058`, `:1172`), `dsh-client-ui-schedule` (`:1594`,
   `:1680`) — plus the host pager (`history.js:409`). Two consequences for the spec:
   - **Do not make the hide depend on `sourceEventSeqs`.** It survives, but we would be its **only**
     consumer, with no first-party test coverage behind it. Have the **host return the shadowed seq set
     as the result of the same Remote call** ([How does a plugin's client half invoke its host half?](18-client-to-host-channel.md))
     and treat the top-level field as a best-effort fallback at most. This closes the loop with
     [Is a replaced message actually deleted…](15-delete-vs-hide.md), whose hide contract needs that set.
   - **The citation stays mandatory regardless.** The platform rejects a replace that omits a shadowed
     node (host `surface.js:265-268`; the client re-checks it), so "the host returns the set" is **not**
     licence to write an incomplete `sourceEventSeqs` — omitting one is a hard session-load failure.

Also recorded: a Definition that needs an adjacent event must register a Definition for its kind, so
the kind string must be namespaced to avoid colliding with another plugin's.