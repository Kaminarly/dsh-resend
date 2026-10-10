# `dsh-resend` — edit-and-resend and regenerate for DeepSeek Harness

**Status:** normative. This document is the deliverable — a specification, not an implementation.
**Its reader** is an agent that will implement the package described here, from this document alone,
with no access to any other conversation or file.
**Language:** English. Platform identifiers are quoted verbatim and must not be translated or renamed.

## How to read this document

- **`MUST` / `MUST NOT` / `SHOULD`** are normative. Everything else is context.
- **Evidence markers** appear as `path:line`. `@pkg/…` means
  `<app>/node_modules/@deepseek-ai/<pkg>/…` inside the installed DSH Desktop. Read those lines when
  you need the raw fact; you do not need them to start.
- **Verified on** DSH Desktop `2.0.17`, `@deepseek-ai/dsh-*` at `0.2.0-rc.2`. **§16** lists the seven
  items a code read could not settle, each with a concrete check and a decision rule for every
  outcome. Two of them are already answered there. Nothing in §16 blocks starting.
- **§13** lists the acceptance criteria that decide whether your implementation is finished.
- The companion research is cited inline where a claim is non-obvious. You do not need those files.

### Version move

The original platform research used DSH Desktop `2.0.15` / `dsh-* 0.1.7-rc.2`; versioned raw
observations below retain that provenance. The first target move to Desktop `2.0.16` /
`dsh-* 0.2.0-rc.1` crossed a minor boundary, so both the development pins and the peer ranges had
to move: the old ranges excluded the new runtime and made the Loader silently skip the bundle.

The current verification target is Desktop `2.0.17` / `dsh-* 0.2.0-rc.2`. The nine `dsh-*`
development dependencies, lockfile, package-metadata test constants and README target table track
that exact generation. The `dsh-*` peer ranges remain `^0.2.0-rc.1`: they already admit `rc.2`
with `includePrerelease: true`, and no API this plugin reads changed between these two releases.
Raising the lower bound to `rc.2` would unnecessarily exclude hosts still on `rc.1`. Pins state
what is verified; peer ranges state compatibility with the **host surface**. Versions in fake-app
test fixtures are independent of the verification target and MUST NOT change just to follow it.

---

## 1. What you are building

A DSH Desktop plugin, `dsh-resend`, that adds two operations to a conversation:

| Operation | Target | What the user gets |
|---|---|---|
| **edit-and-resend** | any user message that is still on the model surface | the message is rewound — it and everything after it leave the model context and disappear from the view — and the edited text is sent as the new prompt |
| **regenerate** | the **last** assistant reply | that reply and everything after it are rewound, and the original prompt is sent again |

Three properties make this harder than it looks, and they shape everything below.

**One: the rewind does not hide anything.** DSH history is an append-only event log. A rewind is a
*new* event carrying a surface operation that shadows a range from the **model-visible surface**. The
human transcript is deliberately built from append-origin events only
(`@dsh-session/lib/types/surface.js:43-46`), so a shadowed row **keeps rendering, unchanged**, and the
replacement event renders as nothing at all. If this plugin wants a rewound message to disappear, the
plugin hides it. There is no platform behaviour to lean on.

**Two: the rewind and the resend must be one user-visible action.** Because the replacement event is
invisible, a rewind that lands without its resend leaves the old text on screen with a reply to text
the user cannot see — a transcript contradicting the model. The two are atomic by construction here:
one Remote call performs both.

**Three: getting `sourceEventSeqs` wrong is a hard session-load failure,** not a cosmetic bug. The
citation must list every shadowed node; omitting one makes the session unloadable.

Phase 1 is the two operations and their presentation. Phase 2 (§14) adds file rollback.

### 1.1 Vocabulary

| Term | Meaning |
|---|---|
| **rewind** | the whole operation: replace a range of the model surface and send a new prompt |
| **target** | the message the user acted on — the edited user message, or the regenerated reply |
| **the range** | the positional span `[startSeq … endSeq]` from the target to the last surface node, in surface order |
| **shadowed node** | a surface node the replacement removes from the model context |
| **audit claim** | the `compaction/prune` event that states what the range is (segment 1 of 2) |
| **carrier** | the `user/message` event that performs the replacement (segment 2 of 2) |
| **hide plan** | the client-side map from shadowed seqs to the DOM keys of the rows to hide |

---

## 2. The platform model you are building on

Read this section once. Every mechanism later depends on it.

### 2.1 The log, the surface, and the transcript

- **The log** is a single monotone `seq`-numbered, append-only event array. Nothing is ever rewritten
  or deleted. There is no session tree; same-session branching is deferred upstream
  (`@dsh-session/README.zh.md:192`).
- **The model-visible surface** is a fold over the log. It is what the model sees.
- **The transcript** is what the human sees. It is built from events with `surfaceOp === 'append'`
  and is **not** the surface fold. A shadowed node keeps `surfaceOp === 'append'` forever, so it keeps
  rendering.

### 2.2 The one primitive: a surface replace

`session.append(type, data, options)` mints the next `seq` and merges `options` into the event
(`@dsh-session/lib/index.js:1401-1405`). The option that matters:

```js
session.append('user/message', data, {
  surfaceOp: { op: 'replace', startSeq, endSeq },
  sourceEventSeqs: [ /* every shadowed node, plus the audit claim */ ],
})
```

- The range is **inclusive** at both ends and interpreted in **surface order, not seq order**
  (`@dsh-session/README.zh.md:50`). **A numerically descending range is legal** — confirmed live by
  writing `{op:'replace', startSeq: 10, endSeq: 7}` and reloading the session cold (§16.7).
- `sourceEventSeqs` **must list every shadowed surface node** (`@dsh-session/lib/index.js:262-267`).
- `assistant/message` **cannot** carry `sourceEventSeqs` — it throws (`:313`). This is why the
  carrier must be a `user/message`.
- Events that are not surface-eligible must not carry `surfaceOp` at all (`surface.js:213-218`).

**Two different key namings coexist on the shipped host, and they are not interchangeable.**
`surfaceOp` uses **`{op, startSeq, endSeq}`**; the audit's **`shadowedRange` uses `{start, end}`** — the
older spelling, which `shadowedRange` never outgrew. Both appear side by side in the shipped
first-party pruner (`@dsh-compaction-tool-result-pruner/lib/index.js:159-175`), so this is not a
legacy corner: it is the current shape of both fields, and §5.3 and §5.4 write each one in its own
naming.

The runtime **does** check `surfaceOp` strictly, and rejects a wrong spelling immediately and legibly:

```
session.append('user/message', data, {
  surfaceOp: { op: 'replace', start, end },        // ← the pre-v3 spelling
})
// Error: session event "user/message" carries an invalid replace surfaceOp
```

`isReplaceOp` requires **exactly** the three keys `op`, `startSeq`, `endSeq`, with `op === 'replace'`
and both endpoints non-negative safe integers (`@dsh-session/lib/types/surface.js:196-205`, `:230-231`) —
verified live for both a `{op, start, end}` object and a four-key object. The old spelling exists only
in **stored logs of format ≤ v2**, which `dsh-session-format-v2-to-v3` rewrites to `startSeq`/`endSeq`
on load (`:364-372`). There is no accepted alternative spelling on a v4 runtime, so the failure mode is
a loud rejection at the append boundary, not a delayed corruption.

The reference implementation still probes the runtime format and throws on mismatch. That probe is
**defensive, not load-bearing**: §5.4 keeps it because a plugin that silently wrote the wrong shape on
some future runtime would be worse off than one that refuses, and §13.1 #7 pins it. But do not read
this as "the host accepts either spelling" — it does not.

### 2.3 The two-segment write, and why the pair exists

The rewind is **two appends with no `await` between them**:

1. `compaction/prune` — the **audit claim**. Log-only; it is not a surface node. It states the range
   and the shadowed-token price, and **arms** the host's shadow-price fold.
2. `user/message` carrying `surfaceOp` + `sourceEventSeqs` — the **carrier**. It consumes the claim,
   splices the range out of the surface, and becomes the new surface tail. It renders **nothing**.

The pair is not decoration. `@deepseek-ai/dsh-token-meter` folds a replacement's token delta from an
**adjacent** claim for the **same** range:

- a matching adjacent claim ⇒ the replaced range's tokens are subtracted, correctly;
- no claim at all ⇒ the fold yields **exactly zero delta**, so `surfaceTokens` silently overestimates
  and compaction fires early;
- an orphan claim for a **different** range ⇒ the host fold **throws** (`no adjacent shadow price`).

The audit claim's `shadowedTokenCount` must therefore be the **official shadow price**, not a node
count. A node count is the documented overestimation bug. §5.3 gives the formula.

### 2.4 What the host does versus what the client does

The seam is fixed, and nothing crosses it:

- **Host half** owns the rewind, the descriptor, and the policy. It is the only half that can write:
  the client-side session object has no `append`.
- **Client half** owns the action rows, the inline editor, the hide plan, and every rendered element.

---

## 3. Package shape

One package, two halves, two faces of one descriptor table.

```
package.json
  main                      → lib/index.js          Host half
  exports["./client"]       → lib/client.bundle.js  Client half (self-registering loader entry)
  exports["./typert-host"]  → lib/typert.host.js    Host descriptor contribution
  exports["./typert-client"]→ lib/typert.client.js  Client descriptor contribution
  dsh.bundle.patch          → cordis.patch.yml      profile bundle layer
  dsh.client.platform       → "web"
  dsh.client.inject         → ["@deepseek-ai/dsh-api-gateway", "@deepseek-ai/dsh-client-locale",
                               "@deepseek-ai/dsh-client-ui-conversation"]
```

`package.json` requirements:

- `peerDependencies` MUST declare bounded ranges for every host package the code imports, including
  `@deepseek-ai/cordis`, `@deepseek-ai/dsh-session`, `@deepseek-ai/dsh-client-ui-primitives`,
  `@deepseek-ai/dsh-client-ui-slots`, `react`. Peer ranges are the **enforced** compatibility
  mechanism; DSH evaluates them with `includePrerelease: true` and reports failures as
  `incompatible-version`.
- The package MUST NOT declare a dependency on any third-party contract package. §5.3 and §6
  re-implement the rules such a package would have supplied.
- `@deepseek-ai/dsh-api-gateway` MUST be in `dsh.client.inject` so the client half does not activate
  before `ctx.remote` exists. **Do not** add `@deepseek-ai/dsh-typert-registry` — the gateway's own
  client half already declares it (`@dsh-api-gateway/package.json`), and declaring it from a plugin
  bundle would hit a module-table miss (§6.6).
- Pin the targeted upstream version exactly in the README and in this table, and state that
  compatibility is decided by the **host surface**, not by semver.

### 3.1 Services the host half injects

```js
export const inject = [
  'sessions',           // get(id), flush(session)
  'agents',             // get(id) → Agent
  'sessionQuery',       // readSession(id) — replay-validated event log
  'sessionPersistence', // open(id, 'read') → file-backed handle
  'tokenMeter',         // measure(session) — the official shadow price
  'typert',              // register(contribution) — §6.6; see §16.6
]
```

The last entry is required, not optional: Cordis refuses **any** service property read on a fiber that
does not inject that service (`cannot get property "<name>" without inject`), so the host half cannot
reach `ctx.typert.register` without declaring it. §16.6 records the observation.

Service names above are the ones the host registers via `super(ctx, "<name>")`; they are **not** the
`id` of any composition row. Confirm each with a one-line probe at startup and fail soft (§4.4).

`export const inject` MUST list only services that certainly exist in the composition. A service that
never resolves leaves the plugin fiber permanently pending, which fails `assertEntriesActive()` and
**the whole renderer will not boot**. Anything optional and uncertain belongs in a child fiber:
`ctx.inject(['serviceName'], (ctx) => { … })`, whose absence disables one feature instead of the app.

---

## 4. Host half — the operations

### 4.1 Two operations, one method

The Remote surface is **one unary method**. Rewind and resend are one call because they must be one
user-visible action (§1, property two).

```
resend.apply({ sessionId: string, targetSeq: number, op: 'edit' | 'regenerate', text?: string })
  → RemoteResult<{
      carrierSeq: number,        // seq of the carrier event
      shadowedSeqs: number[],    // every shadowed surface node, in surface order
      resendMessageId: string,   // id of the message queued to the agent
    }>
```

- `op: 'edit'` requires `text` (the edited prompt).
- `op: 'regenerate'` ignores `text` and re-sends the target round's original prompt text.
- `targetSeq` is read from the client's Chat snapshot. **The host re-derives everything else from the
  log** — the client supplies no span, no text for regenerate, and no shadowed-seq list.

`sessionId` is a plain string parameter. **Do not** introduce a client-supplied object shape for the
session or the message; every client-supplied field needs a strict codec (§6.3), and a plain string
keeps that surface minimal.

### 4.2 The span is computed from a log read that covers the target

This is the single most important implementation rule in this document.

**The rule.** You MUST derive the range and the resend text from a log read that covers `targetSeq`. A
read that does not cover it is a **failure**, never a licence to scan whatever event array you happen
to hold: a scan that steps over a missing seq silently selects the *wrong* earlier message. The
reference implementation's history is a catalogue of this class of bug — a sparse scan for "the
preceding user message" selected a prompt from an earlier round (production incident), and an unfixed
copy of that shape shipped as a dead feature.

**Route (2) is primary: `ctx.sessionQuery.readSession(sessionId)`.**

```js
const { session, inheritedEventCount, events } = await ctx.sessionQuery.readSession(sessionId)
```

It returns a replay-validated full event log with the inherited prefix marked
(`@dsh-session-query/README.zh.md:35, :45`). On the shipped host the `events` array is the **complete,
dense, contiguous log indexed by seq** — `events[targetSeq].seq === targetSeq` — and for a *live*
session it also covers appends the plugin has just made and not yet flushed. It is the preferred route
because it is the one that cannot be short:

- on this host `snapshotEvents()` is the whole log, so the "windowed and sparse in-memory view" an
  earlier draft of this section warned about is **not** what a live session holds. Measured, not
  assumed: §16.1.
- the file route below can return an **empty slice without throwing**, which no `try/catch` can detect.

**Name trap:** `readSession(...).session` is the session **header** (a structured clone), not a live
handle. The live session still comes from `ctx.sessions.get(sessionId)`. Rejections from this route —
`SESSION_QUERY_PERSISTENCE_FAILED`, `SESSION_QUERY_CORRUPT_SESSION` — are refusals; the corrupt case is
the `replay-failed` state of §4.5 and **must never** be reported as `target-shadowed`.

**Route (1) is auxiliary: `ctx.sessionPersistence.open(sessionId, 'read')` → `handle.read(offset?, length?)`.**

Its job is **`fileMaxSeq`** — the last seq the *stored* log covers — because §4.5's
`message-pending` vs `message-not-found` discrimination is defined on `{ fileMaxSeq, targetSeq }`. It
never takes write ownership (`@dsh-session-persistence/README.zh.md:32-49`). Two rules:

- **`{ eventState: 'detached', events: [] }` is a failure, not an empty log.** A session that has been
  created but not yet materialized yields exactly this pair, with no throw; reading it as "the log has
  no events" is how this route silently corrupts a span. (`'detached'` is also a normal,
  caller-exclusive state on a materialized read — only the **empty-*and*-detached** pair is the
  failure.)
- A sliced `read(offset, length)` is efficient and legal for *reading a known event*, but a **span**
  MUST NOT be computed from one. Anything that decides *which* events to shadow uses the whole-log read
  or route (2).

If neither route yields an event for `targetSeq`, the operation MUST fail with `message-pending` or
`message-not-found` per §4.3 — **never** fall back to scanning any in-memory array.

**The write path is a separate question.** §5.1's live tail comes from `session.seq`, read once
immediately before the first append. Do not source the tail from either read route: a read describes
what exists, the tail describes where the append lands, and only the session itself knows the latter.

### 4.3 Resolving the target and the range

```
resolveTarget(sessionId, targetSeq):
  log ← the covering read's event list (§4.2: route (2) primary)
  target ← the event at targetSeq
  1. target missing from the log                      → not-found            (§4.5)
  2. target is already shadowed (any carrier's range
     covers targetSeq, or targetSeq ∉ current
     surface nodes)                                   → target-shadowed      (§4.5)
  3. target is in the log but not yet on the surface
     (the file has caught up, the surface has not)    → message-pending      (§4.5)
  4. op === 'edit' and target.type ≠ 'user/message'   → not-user-message
  5. op === 'regenerate' and target is not the last
     assistant reply on the surface                   → not-last-reply
```

Then compute the range:

```
surfaceSeqs ← the current surface's node seqs, in surface order
start       ← position of targetSeq in surfaceSeqs
end         ← surfaceSeqs[surfaceSeqs.length - 1]      // the tail, always
range       ← surfaceSeqs.slice(start)                 // surface order; may descend numerically
```

The range always runs to the **end of the surface**. A rewind near the top of a long session therefore
shadows nearly everything after it; §9 records that consequence and what the UI owes the user.

For `op: 'regenerate'`, the resend text is the **text of the user message at the range's start**,
read from the same covering log — never from a windowed view, and never re-derived by scanning forward
from an arbitrary earlier message (§4.2). If that message carries no text block, refuse with `no-text`
rather than sending an empty prompt.

`target-shadowed` is decided from the **log**, not from a client-supplied list: a target is shadowed
when some carrier's `surfaceOp` range covers it, or when it is absent from the current surface nodes.
Both facts come from the same covering read plus the live surface, so the check needs no extra state —
and it must not be confused with `not-found`, which means no such seq exists at all (§4.5).

### 4.4 Preconditions, in the order they are checked

```
1. `paused` / teardown in progress                     → internal
2. sessionId empty or session unknown                  → bad-request / session-not-found
3. agent for the session is missing                    → agent-unavailable
4. agent.status !== 'idle'                             → agent-busy
5. target resolution (§4.3)                            → its own code
6. op-specific text validation                         → blank-text / no-text
```

Rule 4 is user-visible behaviour, not just a guard: the user's decision is that **neither operation is
available while a reply is streaming**, and the user stops it themselves. You MUST NOT cancel the
in-flight turn on the user's behalf. The README's own warning stands: editing mid-step made a resend
reference another turn's chunks and the token meter threw `belongs to another step` — a corruption
that stopping manually does not reliably prevent either, because the click races the turn boundary.
The host guard is what makes the operation safe; the UI's disabled state (§9) is only a courtesy.

`agent.cancel({ kind: 'user' })` followed by `await agent.whenIdle()` is a **defensive precondition
only**: if a turn is somehow open when the write is about to happen, the plugin waits for idle rather
than appending into an open turn. The plugin never initiates the cancellation.

### 4.5 The result envelope and the error codes

`apply` **never rejects** for business outcomes. It resolves `RemoteResult<T>`, discriminated by
`isRemoteFailure`. Rejection is reserved for assembly faults (the method is not mounted, the
contribution was withdrawn, an argument count mismatch) — the API Gateway's rule, and you MUST NOT
wrap the call in a bare `try/catch` that swallows a local fault into a business error.

The error code vocabulary is **closed**. These are the codes, with the user-facing meaning:

| Code | Meaning | Retryable |
|---|---|---|
| `bad-request` | malformed input (empty `sessionId`, missing `text` for edit) | no |
| `session-not-found` | no such session | no |
| `agent-unavailable` | no live agent for the session | no |
| `agent-busy` | a reply is streaming; the user must stop it first | yes |
| `message-not-found` | the target is permanently absent | no |
| `message-pending` | the target exists but is not yet on the surface — a turn is closing, or the file and surface disagree | **yes** |
| `target-shadowed` | the target was already rewound, or is otherwise off the active surface | no |
| `not-user-message` | edit was aimed at a non-user message | no |
| `not-last-reply` | regenerate was aimed at anything but the last reply | no |
| `blank-text` | the edited text is empty or whitespace-only | no |
| `no-text` | the prompt to re-send has no text block (image-only) | no |
| `internal` | an unexpected fault | maybe |

`message-pending` and `target-shadowed` **must not be conflated**. They arrive from the same
observation — the target is not on the surface — and the user's next action differs completely: one
says "try again in a moment", the other says "this is historical, it is gone". Decide from two facts
together:

- **explicit state**, when the caller has it: `not-found` | `already-shadowed` | `not-persisted` |
  `replay-failed`;
- **file facts**: `{ fileMaxSeq, targetSeq }`, where `fileMaxSeq` is the last seq the **stored** log
  covers — the one thing §4.2's auxiliary route exists to supply — and `targetSeq` is the seq the
  client asked for.

The rule, in terms of the covering read's `lastCoveredSeq`:

- `not-found` **and** `targetSeq > fileMaxSeq` ⇒ `message-pending` (the event is not written yet; a
  turn is closing, or the file and the surface disagree). Retryable.
- `not-found` **and** `targetSeq <= fileMaxSeq` (the covering read reaches that seq, so the absence is
  real) ⇒ `message-not-found` (it never existed). Not retryable.
- `replay-failed` ⇒ its own code, coming from route (2)'s `SESSION_QUERY_CORRUPT_SESSION`, and it
  **must never** be reported as `target-shadowed`; a failed internal replay dressed as "history is
  read-only" is a lie the user cannot act on.

Do not consult the in-memory array for either fact. If the auxiliary route is unavailable, `fileMaxSeq`
is unknown — fall back to `not-found` combined with the covering read's own extent, and never invent a
`message-pending` you cannot support.

### 4.6 Serialization

Operations on the same session MUST be serialized by a **per-session lock**, so two clicks cannot
interleave two rewinds. Hold the lock across target resolution, both appends, the flush, and the
resend. Assert this in tests by counting concurrent flushes (§13.1).

---

## 5. The write

### 5.1 Read the live tail; never invent a `seq`

The pre-write validator treats a **present** `seq` on a candidate event as authoritative — it assigns
the next seq itself only when `seq === undefined`. So the producer MUST hand the validator envelopes
carrying **no `seq` at all**.

This is a production incident, not a theory. A hardcoded `seq: 0` in the envelope produced:

```
[E2/error] seq 0 不连续：倒退（backward），期望 26033 —— 只能追加到日志尾部（append-only，N6）
[S6/error] sourceEventSeqs 必须引用更早事件：26032 >= 当前 seq 0
[S8/error] foldSurface 重放失败 … 会话加载会被拒（SessionPersistenceCorruptionError）
```

The guard was right and the producer was wrong. **Build the two events, validate them, and let
`append` mint both seqs.**

### 5.2 The append sequence

```
prevTail ← session.seq                        // the live tail, read once
auditSeq ← prevTail                           // the audit takes the next seq
carrierSeq ← prevTail + 1

1. validate the PAIR against the whole rule set below   // before any append
2. session.append('compaction/prune', auditData)                          // MUST NOT await
3. session.append('user/message', carrierData, { surfaceOp, sourceEventSeqs })  // MUST NOT await
4. await sessions.flush(session)
```

**Validate the pair before the first append.** A rejection discovered *after* the audit has landed
leaves an orphan claim, because the log cannot be rolled back — the reference implementation shipped
exactly that defect and left orphan `compaction/prune` events on real machines. Steps 2 and 3 have no
`await` between them, and neither does step 3's append and step 4's flush, for the same reason.

If step 3 nonetheless fails, the audit is orphaned. Report the failure, flush what was written, and
record the orphan in the host log — an orphan claim for a range that later gets a *different* replace
makes the host fold throw (§2.3), so it must be diagnosable.

### 5.3 The audit claim (segment 1)

```js
{
  shadowedRange:      { start: startSeq, end: endSeq },   // exactly the carrier's range
  shadowedSeqs:       [ …shadowedNodes ],                  // non-empty, no duplicates
  shadowedTokenCount: <official shadow price>,             // NOT a node count
}
```

Rules:

- `type` MUST be `'compaction/prune'`.
- `data`'s key set MUST be exactly `{ shadowedRange, shadowedSeqs, shadowedTokenCount }`. Extra keys
  are a contract violation.
- The event MUST NOT carry `surfaceOp` or `sourceEventSeqs`. It is not a surface node.
- `shadowedSeqs` MUST be non-empty, MUST contain no duplicate seqs, and its **first and last elements
  MUST equal** `shadowedRange.start` and `shadowedRange.end`.
- `shadowedTokenCount` MUST be a non-negative integer equal to the sum, over every shadowed node, of
  the official per-node price. Compute it as:

  ```
  price(event) = deriveEventMessage(event) === null ? 0 : estimateMessage(deriveEventMessage(event))
  shadowedTokenCount = Σ price(node) for node in shadowedNodes
  ```

  Both functions come from the **official** package: `@deepseek-ai/dsh-token-meter` exposes
  `measure(session)` and `estimateMessage(message)`, and `@deepseek-ai/dsh-session` exports
  `deriveEventMessage`. Resolve the service as `ctx.get('tokenMeter') ?? ctx.tokenMeter`.
- **If the meter is unavailable, refuse the write** and report `internal`. Do not substitute a node
  count, and do not skip the claim — either one corrupts a number the user cannot see.

**Do not hand-copy the price formula.** Import it. A copied formula turns "agrees with the host" into
a claim that can never fail, which is the opposite of a check. If the package cannot be resolved at
test time, **throw** rather than skipping the assertion.

### 5.4 The carrier (segment 2)

```js
// data — the key set is EXACTLY these four members
{
  role:    'user',
  id:      `dsh-resend-${op}-${markerNonce}`,        // marker identity lives here
  content: [{ type: 'text', text: TRACE_TEXT }],      // non-empty
  source:  { kind: 'cordis-host-runner' },
}
```

Rules, each of which has a failure mode behind it:

- `type` MUST be `'user/message'`. `assistant/message` cannot carry `sourceEventSeqs` (§2.2).
- **`data` MUST have exactly the four members above.** DSH's `user/message` word list is exactly
  `{role, id, content, source}`; a fifth member is refused by the host. So business provenance —
  which message was edited, what the original text was — MUST be **derivable** (the target is the
  range's start) or read back from the log. It is never carried.
- `content` MUST be a non-empty array of text blocks. Empty content projects as an empty user message.
- `id` MUST carry a stable plugin prefix (`dsh-resend-`) so the plugin can recognise its own events.
  This is the **only** place marker identity can live: `MessageSourceMap` is a closed union of
  17 kinds and a plugin cannot invent a `source.kind`.
- `source.kind` MUST **NOT** be a value that means "a real human turn". The kind `user` (and the
  `user-rpc` kind, whose value is also `user`) makes the carrier split a conversation round, which is
  exactly wrong for an invisible event. The first-party kind for "a Cordis host plugin injected this
  user message" is `'cordis-host-runner'`; it is not a human turn and is the honest choice.
  **Confirmed live — this is settled, not a candidate: see §16.7.** A carrier written with this kind
  kept the round count unchanged, was not classified as a model message, and reloaded cold.

The trace text (`TRACE_TEXT`) is the carrier's visible-to-the-log content. It renders as nothing, but
it is what a human sees if they inspect the session file, so it MUST be honest:

```
en: (this message was replaced by an edit; the original is archived in the session log)
zh: （此处内容已被撤回：原消息已归档，可在恢复视图中查看）
```

`surfaceOp` and `sourceEventSeqs`:

```js
surfaceOp: { op: 'replace', startSeq, endSeq },   // the ONLY accepted shape on this host (v4)
sourceEventSeqs: [ auditSeq, ...shadowedNodes ],  // POSITIONAL order, not seq order
```

Note the naming split, which is a live trap rather than a legacy detail: the carrier's `surfaceOp` is
**`startSeq`/`endSeq`** while the audit's `shadowedRange` (below) is **`start`/`end`**. Both are current
on v4, and both appear side by side in the shipped pruner. See §2.2.

- **Runtime shape probe (defensive).** Read the session format version at startup
  (`SESSION_FORMAT_VERSION` from `@deepseek-ai/dsh-session`; it is `4` on the shipped host). On
  version ≥ 3 write `{ op, startSeq, endSeq }`; on the pre-v3 spelling write `{ op, start, end }`.
  Build the object from the detected key names — never from a hardcoded literal — and throw loudly on a
  mismatch. Never write both spellings, never write a fourth key. **This is a guard, not a
  requirement of the shipped host:** v4 rejects any spelling other than `startSeq`/`endSeq`
  immediately and with a clear message (§2.2), so the probe costs little and buys protection only
  against a future runtime.
- `surfaceOp` MUST have exactly three keys, `op` MUST be `'replace'`, and both endpoints MUST be
  non-negative safe integers.
- `sourceEventSeqs` MUST be `[auditSeq, ...shadowedNodes]` in **surface (positional) order**. The
  first element is the audit, which is a convenience guide item, not part of the range. Therefore
  `sourceEventSeqs[0] === auditSeq`, and the first and last members of the range portion MUST equal
  the range endpoints.
- `sourceEventSeqs` MUST contain no duplicates, and **every** referenced seq MUST be strictly less
  than the carrier's own seq. A forward reference makes the session unloadable.
- Omitting even one shadowed node is a **hard session-load failure**. When in doubt, list more: the
  range is authoritative and the list must match it exactly.

### 5.5 The resend

After the carrier lands and the session is flushed:

```js
const agent = agents.get(sessionId)
agent.followup({                        // returns undefined — NOT a promise (§16.2)
  content: [{ type: 'text', text }],
  source:  { kind: 'user' },
})
```

`followup(input)` queues a normal next-turn prompt and wakes the driver
(`@dsh-agent-loop/lib/index.js:806-808`; `@dsh-agent/README.zh.md:47-53`). The message is appended as
a **real** `user/message`, which is what makes the new text visible: the carrier renders nothing, so
the resent message is the only new row the user sees.

`source.kind` MUST be `'user'` here — unlike the carrier, this message genuinely is the user's turn
and must be treated as a round boundary by everything downstream.

**`followup` is fire-and-forget, and the return value carries no information.** It returns `undefined`
(not a thenable), so there is nothing to `await` and nothing to catch. Do **not** write `await` on it:
that reads as if a failure could be observed there, and it cannot. It does not even throw for a missing
or disposed agent. The only inference available at the call site is the **acceptance** check:

```js
// after the call: 'running' means the turn was accepted; 'idle' means it was not.
agent.status
```

Success or failure of the **turn itself** is not observable from this call. It is observable from the
session log, where the turn closes with `turn/end` and `data.reason.kind` is `'completed'` or
`'error'` (the error carries `reason.error.message`). §9.4 says what the UI owes the user in each case,
and this plugin's own error row covers only the acceptance failure — the agent's own reporting covers
the rest. Measured, not assumed: §16.2.

---

## 6. The descriptor artifact

Decision: **hand-write both faces.** There is no generator to pin, and the validation contract is
small enough to satisfy exactly. This section is that contract.

### 6.1 What a contribution is

Two hand-written files, both derived from **one** descriptor table so the faces cannot drift:

- `lib/typert.host.js` — registered by the host half with `ctx.typert.register(contribution)`.
- `lib/typert.client.js` — mounted by the client half with `ctx.remote.$mount(contribution)`.

Host shape:

```js
export const TYPERT = {
  package: 'dsh-resend',        // REQUIRED; non-empty, MUST NOT contain '#'
  face: 'host',                 // REQUIRED; exactly 'host' or 'client'
  schemas: [],                  // each entry: { name, create } — `create` MUST be a function
  invocations: [ /* one descriptor, below */ ],
  // `model` is OPTIONAL on this route and is omitted deliberately: it is the loader's
  // reflection graph, and dropping it costs only the model-based reflections we do not use.
}
```

Client shape: the same descriptor list under `TYPERT_REMOTE`, without `face` and `model`.

### 6.2 The descriptor

```js
{
  id:        'dsh-resend#resend/apply',   // non-empty
  service:   'resend',                    // non-empty, MUST NOT contain '#'
  namespace: 'resend',                    // /^[A-Za-z0-9_$.-]+$/, not '.' or '..'
  method:    'apply',                     // same grammar
  invocation: { kind: 'direct' },
  parameters: [
    { name: 'request', wire: 'request', source: 'json',
      codec: { mode: 'strict',
               typeSymbol: 'dsh-resend/types#ResendApplyRequest',
               create: resendApplyRequestSchema } },
  ],
  result: { mode: 'strict',
            typeSymbol: 'dsh-resend/types#ResendApplyResult',
            create: resendApplyResultSchema },
}
```

### 6.3 The seven rules the registry enforces

Read these off the installed validator, not from a copy — the point of an executable check is that it
follows the host. `ctx.typert.register()` rejects the **whole batch** before committing anything if
any rule fails.

1. `id` MUST be non-empty.
2. `package` and `service` MUST be non-empty and MUST NOT contain `#`.
3. `namespace`, `method`, `implementation` (if present), parameter `name`, and parameter `wire` MUST
   match `/^[A-Za-z0-9_$.-]+$/` and MUST NOT be `.` or `..`.
4. Parameter `wire` fields MUST be unique within the descriptor. A parameter with
   `source: 'lookup'` MUST have a lookup key and MUST NOT set `acceptsUndefined`; a parameter with any
   other source MUST NOT declare `lookup` at all.
5. Every codec MUST either be exactly `{ mode: 'src-json' }`, or have a **non-empty** `typeSymbol`
   **and** a `create` that is a function. The `result` codec is validated the same way.
6. If `cancellation` is declared, `cancellation.parameter` MUST be `'signal'`. If `mode` is declared,
   it MUST be `'stream'` — **so a unary method omits `mode` entirely.**
7. `descriptor.scope`, when present, requires `invocation.kind === 'direct'`, a scope key without
   `#`, a wire field name, and exactly one lookup parameter matching both. A `context` invocation has
   its own extra rules. **This plugin uses neither** — `kind: 'direct'`, no `scope`, no lookup
   parameters.

The mount path adds one more: the contribution MUST NOT repeat a `namespace`/`method` pair, and every
client-supplied field MUST carry a strict codec (`@dsh-api-gateway/lib/types/client/index.js:136-157`,
`:587-602`).

**`sourceLocation` is validated nowhere.** Omit it. It is generator provenance that points at a
TypeScript source file that is not shipped.

**`typeSymbol` is only checked for non-emptiness** unless a lookup or context provider is involved,
which this plugin has none of. It is still the only human-readable trace when a strict definition and
its provider disagree, so write a truthful `<package>/types#<TypeName>` string — never a placeholder.

### 6.4 The executable validator

Ship `scripts/check-typert.mjs`, run it from `check` and from CI, and have it **read the installed
validator** (`dsh-typert-registry`'s `lib/index.js`) rather than restating a frozen list:

- assert every rule in §6.3 against both contributions, with the failing field named;
- assert both faces derive from one shared table (import both and deep-compare);
- assert the unary descriptor declares no `mode`, no `scope`, no lookup parameter, and no
  `cancellation`;
- assert the result codec's schema accepts `{ ok: true, value }` and `{ ok: false, error }` and
  **rejects an unknown field** (strictness is what makes a forgotten field loud instead of silent);
- exit non-zero with a `file:line` pointer on any failure.

This is strictly stronger than a checked-in generated file: it fails when the host's rules change,
not only when someone forgets to re-run a generator.

### 6.5 The host registers; the client mounts

- The **host half** calls `ctx.typert.register(TYPERT)` in `apply`. Without this the gateway has no
  strict definition, and dispatch falls back to a weaker reflection-based path that resolves
  parameters by name.
- **Registration is owned by the plugin fiber for its whole life.** The disposal latch: once an
  endpoint has been *seen* as strict and then withdrawn, the fallback is **permanently forbidden** for
  that endpoint and every call fails with `gateway/definition-unavailable`. Register once, at plugin
  start, and let the fiber's effect disposer be the only thing that removes it.
- The **client half** builds the same descriptors and calls `ctx.remote.$mount(contribution)`
  (`@dsh-api-gateway/README.zh.md:50`). Mount is per-namespace and unmounts when the last method is
  withdrawn.
- **A duplicate mount MUST throw before any method is callable.** Do not catch it into a silent
  no-op: a half-mounted namespace is worse than a loud failure. Wrap the mount so a second attempt
  logs and disables the feature rather than corrupting the first.

### 6.6 No `./typert` export, no loader

Deliberately **not** taking the loader route:

- it requires a full reflection graph (`model`) that this plugin does not use;
- it caches resolution and imported manifests **for the whole process lifetime**, so adding the export
  after the fact needs an app restart;
- its failure mode is a silent skip ("packages without that export are silently skipped").

Calling `ctx.typert.register()` directly avoids all three. The one thing not to do is `require()` the
registry from the plugin's client bundle: a client plugin resolves modules against a fixed table plus
the boot graph, and an unlisted specifier throws at load
(`@dsh-client-modules/lib/client.js:700-705`). The gateway's client half injects the registry; the
plugin reaches Typert through `ctx`, never through an import.

---

## 7. Client half — extension points

Every registration goes through **`ctx.slots.inject(key, callback)`**, never a bare `ctx.slots.register`.
`inject` defers the registration until the slot's declaration exists, so a renamed or removed slot
means the entry never mounts — an accepted normal state, not an error. The shipped plugin
`@deepseek-ai/dsh-client-ui-message-feedback` is the minimal template for the assistant-actions case.

Each of the following is one registration point with its own fallback. If a registration is
unavailable, the corresponding feature is **absent**; nothing else is affected.

| # | Slot | Key / id | What it renders | If the slot is absent |
|---|---|---|---|---|
| 1 | `conversation.chat.node` | `dsh-resend-user-actions` | the action row beneath a user message, and the inline editor when open | no edit affordance; regenerate still works |
| 2 | `conversation.chat.node` | `dsh-resend-error` | the partial-failure row at a rewind point (§9.4) | failures are reported in the host log only |
| 3 | `conversation.chat.assistant-actions` | id `dsh-resend-regenerate`, `order` chosen to sit beside the shipped entries | the regenerate control on the last reply | no regenerate affordance |
| 4 | `settings.general.item` | — | the plugin's preferences (§10) | defaults apply; no settings UI |
| 5 | *(inside 1)* | — | a React-owned `<style>` element carrying the hide rules (§8) | **hard failure** — see §8.5 |

Registration facts you will need, quoted from the slot catalogue
(`@dsh-cordis-client-runner/lib/client.js:2495-2535`, `:2397-2444`):

- `conversation.chat.node` is a **keyed** slot: the key is the **node kind**, and the renderer chosen
  is the occupant registered under that kind. Registering an already-occupied key **replaces that
  occupant**. The shipped key table already contains: `assistant-step, command, command-input,
  compaction, context, manual-compaction, model-retry, steering, system-prompt, tool-call, turn-error,
  turn-max-tokens, turn-process, turn-tail, turn-trigger, unknown, user, workflow-run`. **Choose keys
  outside that set** — this plugin never contends for the `user` key.
- Both slots deliver, as standard props: `useChat: UseChat`, `useInput: SnapshotSelectorHook<InputState>`,
  `inputActions: InputActions`, `sessionId: SessionId`, `useConversation`, `useProjection`.
- `conversation.chat.assistant-actions` is a **list** slot: each entry receives `{ messageId }`. A
  **fresh** `id` adds an action beside the shipped entries; reusing a shipped id replaces it. The
  owner props carry only the durable `messageId` — not a seq.
- Both slots are declared transitively by an entry in `conversation.view`, so they exist while that
  entry is mounted.

### 7.1 The user-message action row (registration 1)

There is **no user-message actions slot** in DSH, and the full slot catalogue confirms it. The
supported way to attach an affordance to a user message is to register a **new chat node kind** whose
definition targets the user message and whose renderer is this row. The reference implementation does
exactly this and it works in production.

The node's renderer receives a `seq` for the user message. It renders, in a row **beneath** the
message:

- an edit control: `IconEditOutlineRegular` + the localized "Edit" label;
- when open, the inline editor: a textarea seeded with the message's text, plus a **Send** button
  (`IconPaperPlaneOutlineRegular`) and a **Cancel** button (`IconCloseOutlineRegular`);
- an "Edit in the composer" button, which hands the text to the real composer (below).

Keyboard: **`Enter` submits, `Esc` cancels**, in addition to the buttons. `Shift+Enter` inserts a
newline. Do not submit on `Enter` while an IME composition is active — check
`event.nativeEvent.isComposing`.

**The inline editor is plain text only.** Rich references — `@` file chips, `/` skills and commands,
code quoting — exist **only** in the real composer, which is a per-session singleton that cannot be
duplicated. So the second affordance exists: **"Edit in the composer"** calls
`inputActions.setDraft(text)` and closes the inline editor.

State the limitation plainly in the README, because the button will disappoint otherwise:

- `setDraft` carries **plain text only**. Chip placeholders are stripped. A message containing an `@`
  file reference or a `/` command is echoed into the composer as literal text, and the user
  re-creates the reference by hand from the trigger menu.
- The upgrade path, if you want it: attachments ride a draft **by id** and the registry entry
  `createDrafts(sessionId, File[])` allocates them. That is a service method, not part of
  `inputActions`, and it requires the user to supply the file objects again. Document it; do not fake
  it.

### 7.2 `inputActions` — the whole surface, and its trap

Exactly seven verbs. There is no `.d.ts`, so **guard every verb's presence at runtime** before use:

| Verb | Signature | Phase-guarded? |
|---|---|---|
| `captureInsertion()` | `() => { …caret span…, draftRev }` | no |
| `insertText(text, span)` | `=> boolean` | **yes** |
| `setDraft(text)` | `=> void` | **NO** |
| `addAttachments(ids)` | `=> boolean` | **yes** |
| `removeAttachment(id)` | `=> boolean` | **yes** |
| `pruneAttachments(ids)` | `=> void` | no |
| `submit()` | `=> void` | no (refuses internally) |

(`@dsh-client-ui-conversation/lib/client.js:13461-13484`.)

The trap: **`setDraft` is the one mutator with no phase guard**, while `insertText`,
`addAttachments`, and `removeAttachment` all return `false` during the busy phases. `setDraft` also
returns nothing, so a refusal is indistinguishable from success.

**You MUST gate `setDraft` yourself** on `useInput`'s phase. The phases are `plain`, `claimed`,
`submitting`, `adjudicating`; the busy ones are the last three. Concretely: disable the "Edit in the
composer" button unless the phase is `plain`, and re-check the phase immediately before calling —
the store can change between render and click.

`submit()` takes **no arguments** and always requests the `queue` mode, so this plugin can never
steer how its prompt is dispatched. Regenerate therefore does **not** go through the composer; it uses
the host-side `agent.followup` (§5.5).

### 7.3 The regenerate control (registration 3)

- It appears on the **last assistant reply only**, and it is **permanently visible**, not
  hover-revealed.
- Icon `IconRefreshOutlineRegular` + the localized "Regenerate" label.
- Determining "the last reply" is a client-side question. Give your definition the neighbouring
  context it needs by registering for its kind; the reader's only lookup is `previous(kind)` — **there
  is no "event at seq" on the client**. Keep the definition's `start` pure, because the assembler
  replays it after a window fill.
- Disabled with a hover reason when: the agent is streaming (§9.2); the prompt carried attachments
  (`no-text`); the target is off the surface.
- The action row it sits in is the shipped assistant-actions strip, so the plugin adds one entry
  beside the shipped ones rather than re-authoring the strip.

### 7.4 Every registered surface gets an error boundary

**Every** React surface this plugin registers — the action row, the inline editor, the error row, the
regenerate control, the settings row, and the hide-rules element — MUST be wrapped in **one shared
error boundary** implementation, passed through a single factory (e.g. `withPanelBoundary(Surface,
titleKey)`) so no registration site passes a bare component.

Why this is not optional: a render-time throw inside a chat-node component is caught by the host's
boundary and **swallowed**. The shipped reference implementation lost its entire edit affordance this
way — buttons absent, settings fine, no error anywhere — because one node component read a path that
was permanently `undefined`. The failure looked like "the feature was never built".

So: one boundary implementation, checked across all registration sites, each carrying its own
localized error title and a retry control. The factory is called separately at each site — that is what
lets each one pass its own surface — so the shared thing is the **boundary class** every wrapper
renders, not the wrapper function objects: assert that every registration's tree is the one
`PanelBoundary` class, that the wrappers were all produced by that one factory, and that each title is
its own. Add a test that mounts a deliberately throwing surface and asserts that (a) the other surfaces
still render, and (b) the same component **without** the boundary does throw out of the render — which
is the mechanism being defended against.

### 7.5 No DOM writes

The plugin MUST NOT write to the DOM directly. The one place it needs styled output — the hide rules —
is achieved by rendering a `<style>` element from React (§8.4).

---

## 8. Hiding the shadowed rows

### 8.1 What must be hidden, and why the plugin must do it

A rewind removes the range from the **model surface**. It does **not** affect the transcript. Nothing
disappears, and nothing appears in place of the removed rows: the carrier matches no shipped renderer,
so it renders nothing at all. **The plugin hides the rows, or they stay on screen.**

This is the plugin deliberately overriding documented platform behaviour, and the README MUST say so.
Write the mechanism as:

> The rewind removes the range from the model-visible surface. The transcript is append-origin by
> design and is unaffected, so the plugin hides the affected rows itself.

Do **not** describe the mechanism as "removing the message from the surface" — that phrasing is false
about what the user sees, and it is the exact misreading that makes the hide look optional.

### 8.2 The DOM contract

Rows carry their identity as data attributes
(`@dsh-client-ui-chat/lib/client.js:1756-1765`):

```
data-chat-anchor-key  = flowKey       ← hide on this one
data-chat-flow-key    = flowKey
data-chat-node-key    = routedNode.key
data-chat-flow-kind   = routedNode.kind
```

- For an ungrouped row (a `user` row is one) `flowKey` is the node's stable key.
- For a grouped process member it is the **two-element JSON array** `JSON.stringify([nodeKey, groupPart])`.

### 8.3 Building the hide plan

**Read the keys out of the Chat snapshot's node map; never construct one.** The node key is assigned
by the platform, and a constructed key silently hides nothing.

```
hiddenKeysFor(shadowedSeqs, nodes):
  for each node in the Chat snapshot's node map:
    match the node against the shadowed seq set, per its kind:
      · a plain row            → node.anchorSeq ∈ shadowedSeqs
      · kind 'turn-tail'       → node.data.closing.finalNode.seq ∈ shadowedSeqs
                                 (the seq is on the FINAL NODE, not on `closing`)
      · kind 'tool-call'       → node.data.root.seq ∈ shadowedSeqs
                                 (tool rows anchor at the log-only tool/call seq,
                                  which is never a surface node)
      · a pseudo row anchored at a half seq
                               → Math.ceil(anchorSeq) ∈ shadowedSeqs
    if matched → emit the row's flowKey exactly as the snapshot gives it
```

**Compute one hide plan per snapshot, memoised on the snapshot's reference identity.** Do not rescan
the node map per row: that shape measured **346 ms at 2 000 rows / 20 markers** and **1 568 ms at
3 000 / 30**, and the fix — a single plan per snapshot, queried in O(1) — measured **8.3 ms** and
**18.3 ms**.

### 8.4 Emitting the rules

Render a `<style>` element **from your own row component** (a React-owned style element, so the plugin
never touches the DOM):

```css
[data-chat-anchor-key="<JSON-stringified flowKey>"]{display:none!important}
```

- One rule per hidden key. `JSON.stringify` the key so a grouped-member key (an array) is quoted
  correctly.
- **The rules MUST stay mounted even when the notice is dismissed.** Unmounting them makes every
  hidden row reappear — the highest-severity bug this section can have.
- The shadowed-seq set comes from the same Remote call that performed the rewind (`shadowedSeqs`), and
  the carrier's `sourceEventSeqs` is the fallback, not the primary source. Do **not** make the hide
  depend on the carrier event reaching the client: the field survives the pipeline, but no shipped
  client consumer reads it, so its delivery is not a behaviour to rely on.

### 8.5 Failure is loud, never quiet

A hide that silently fails leaves a chat showing a conversation the model does not believe it is in —
worse than not having the feature. Therefore:

- If the hide plan cannot be built, or the rules cannot be emitted, the plugin MUST surface an error
  state in the affected row and log a diagnosable line naming the range and the reason.
- Degrading quietly is forbidden. This is the one place in the plugin where "fail softly" is wrong.

### 8.6 Count-based disclosure

The user declined a "hide at most 40 % of the conversation" safety valve, and a rewind near the top of
a long session hides nearly the whole transcript. The plugin MUST disclose, not blank:

- Every rewind states how many rows it hid — a notice row at the rewind point carrying the localized
  count, e.g. `en: N messages hidden` / `zh: 已隐藏 N 条消息`. The count is taken from the hide plan,
  so it is what actually happened, not what was requested.
- The notice is dismissible, and dismissing it MUST NOT restore the rows (§8.4).
- The README MUST record the declined valve and its consequence in the user's own terms: a large
  rewind is visually destructive by design, and the count is the only thing standing between the user
  and a blank page.

---

## 9. The actions, as the user experiences them

### 9.1 Edit and resend

1. The action row sits beneath every user message that is on the model surface, with the edit control.
2. Activating it opens the inline editor seeded with the message's text.
3. `Enter` or Send performs **one** operation: rewind + resend, one Remote call.
4. The edited message and everything after it disappear; the new prompt appears as the resent message
   where the model context now begins. The hide notice (§8.6) states the count.
5. `Esc` or Cancel closes the editor with no effect. Nothing is written.

**Rewind and send are never two affordances.** There MUST NOT be a "rewind without sending" control
anywhere in the UI.

### 9.2 Regenerate

1. The control appears on the last assistant reply, permanently visible.
2. Activating it rewinds from that reply's round and re-sends the original prompt's text.
3. The old reply and everything after it disappear; the new reply streams in.

**While a reply is streaming, both operations are unavailable** — disabled, with the reason on hover
("Stop the reply first"). The host refuses regardless (§4.4), so the disabled state is a courtesy, not
the guard.

### 9.3 Refusals

A refusal MUST be presented as the control being **greyed out and not clickable, with the reason on
hover** — not as an error dialog after the fact. This applies to every code in §4.5 that the client
can predict: streaming, already-shadowed, image-only prompt, off-surface target.

### 9.4 Rewind succeeded, resend failed

Two different failures reach the user here, and they are **not** the same state.

**The prompt never reached the agent.** The model context has been rewound but `followup` did not take
it: `agent.status` was not `running` after the call. This is the failure this plugin's own error row
covers, and it MUST be visible. Render an **error row at the rewind point** (registration 2 in §7)
carrying:

- a warning icon (`IconWarningOutlineRegular`);
- a localized message stating plainly that history was rewound and the re-send failed, with the
  reason;
- a **"Send again"** button, which re-sends the prompt **without** performing another rewind.

The error row is the successor to the hide notice at the same position; exactly one of the two is
present at a rewind point.

**The turn was accepted and then failed.** The rewind stands, the agent took the prompt, and the turn
itself errored — the model refused, the request failed, a tool blew up. **This plugin does not own this
case and MUST NOT invent a row for it.** It is indistinguishable at the call site (`followup` returns
`undefined` and does not throw; see §5.5 and §16.2), and the agent already reports it in its own words,
in the transcript, at the same turn. Quietly claiming it here would double-report one failure and put
the plugin's guess next to the host's authoritative message.

What the plugin owes the user in that case is only this: **do not destroy the rewind.** A failed turn
leaves the replaced range shadowed and the new text appended, which is a coherent, re-sendable state —
the same state a successful turn leaves. The user's recovery is the host's own retry affordance, and
failing to provide a second one is correct.

**What the plugin must never do** in either case is report failure over a surface it has already
changed, or imply the rewind was undone. The rewind is durable the moment the flush completes (§5.2);
the error row describes the *resend*, never the rewind.

---

## 10. Settings and localization

`settings.general.item` (registration 4) carries the plugin's preferences:

| Setting | Default | Meaning |
|---|---|---|
| Hide replaced messages | on | Off leaves rows visible with the notice only (§8.6) |
| Inline editor beneath the message | on | Off removes the row's inline editor, keeping "Edit in the composer" |
| Regenerate on the last reply | on | Off hides the control entirely |

**Localization.** Chinese and English, **never both at once** — the active host locale selects one.
Register through `ctx.locale`, and use a **thunk** for any label a slot's `label` option projects, so
localized text follows the locale without re-registering. `TRACE_TEXT` (§5.4) is the one string that
lives in the log rather than the UI; pick the language at write time from the active locale and record
that the choice is immutable once written.

---

## 11. Shared failure modes

| Failure | Required behaviour |
|---|---|
| The pre-write validator rejects the pair | Zero writes. Report the contract violation with the offending field named. Never retry with a different shape. |
| The second append fails after the first landed | Flush what was written, log the orphan audit, report failure, and show §9.4. |
| The `tokenMeter` service is unavailable | Refuse the write with `internal`. Never substitute a node count. |
| A `surfaceOp` key-shape mismatch | Throw before writing. The host will not catch it for you. |
| The Remote mount is attempted twice | Throw before any method is callable; catch at the call site, log, and disable the feature instead of half-mounting. |
| The Remote contribution is withdrawn mid-call | In-flight calls abort. Treat as `internal`, and do not retry automatically. |
| A chat-node render throws | The shared boundary contains it to that surface. Every other surface keeps rendering. |
| The hide plan cannot be built | Loud error row + diagnostic log (§8.5). |
| The resend is accepted but the turn later fails | The rewind stands. Report the agent failure normally — do not attempt to un-rewind. |

---

## 12. Host-contract gate

Ship `scripts/check-host-contract.mjs`, run it from `check` and from CI. It reads the **installed**
app's `app.asar` directly — no network, no profile mutation — and asserts, in **both** directions,
every host member this plugin reads. A worked example exists in the reference implementation; the
technique matters more than the count.

What it MUST assert:

- **Present:** `Session.snapshotEvents`, `Session.eventAt`, `Session.append`, `Session.seq`,
  `Session.surface` / `.nodes`, `SessionStore.get` / `.flush`, `AgentRegistry.get`, `Agent.status`,
  `Agent.followup`, `tokenMeter.measure`, `tokenMeter.estimateMessage`, `sessionQuery.readSession`,
  `sessionPersistence.open`, `sessionPersistence.stat`, `sessionProjections.stateOf`, and the client
  services `slots`, `locale`, `uiConversation`, `ctx.remote.$mount`, plus the two slot-catalog entries
  `conversation.chat.node` and `conversation.chat.assistant-actions` and their `standardProps`.
- **Absent**, as resurrection alarms: `Session.events` (removed upstream — all reads go through the
  snapshot/`eventAt` accessors), and any client-session-controller member this plugin does not use.
- **A plugin-side invariant:** no file outside the log-reading module may read a legacy event-view
  member. Scan the plugin's own tree and fail with `file:line`.

Two rules for the gate itself:

- **Missing scope markers and missing entries count as drift, not as a pass.** If the file or the
  catalog entry cannot be found, the check fails. A vacuously green gate is worse than no gate.
- **Reverse assertions over-match rather than under-match.** A host member can be declared as a class
  field with an initializer, a getter, a method, a constructor assignment, an object-literal property,
  or a bolt-on (`Object.assign(X.prototype, …)`, `Object.defineProperty`, computed class members).
  Match all of them; a false red is the safe direction.

If the asar is absent, print an explicit SKIP and exit zero — the gate is Desktop-optional. Read it
with a ~30-line built-in reader rather than a dependency: the header size is a `u32LE` at offset 12,
the JSON header follows at 16, and file data starts at `17 + headerSize` with entry offsets relative
to that base. Set `process.noAsar = true` first, because DSH Desktop runs package scripts under
Electron's Node, whose asar wrapper intercepts any path ending in `.asar`.

---

## 13. Acceptance criteria

Finish line: every criterion below is satisfied by an automated check that fails when the behaviour
regresses. Criteria are grouped by what they observe.

### 13.1 Host mechanics

1. **No fabricated seq.** The carrier's `seq` equals the pre-append `session.seq` + 1; the envelopes
   handed to the validator carry **no** `seq` property; a candidate built with a fabricated `seq` is
   rejected with a message that names the problem.
2. **The pair is validated before any append.** A pair the contract rejects leaves `session.seq`
   unchanged and **no** `compaction/prune` in the log.
3. **Adjacency and citation.** `audit.seq + 1 === carrier.seq`; `carrier.sourceEventSeqs[0] ===
   audit.seq`; every referenced seq is strictly less than `carrier.seq`; no duplicates; the range
   portion's endpoints equal the range's.
4. **The shadow-price protocol.** Observe the claim through the projection that consumes it —
   `ctx.sessionProjections.stateOf(session, 'contextPressure')`, whose state carries both `claim` and
   the folded `surfaceTokens`. After the pair: **no surviving `claim`**, and `surfaceTokens` moved by
   exactly `officialNodePrice(carrier) − audit.data.shadowedTokenCount`. A lone replace with no claim
   folds **exactly zero** (bounded state cannot reconstruct the range). An orphan claim against a
   different range makes the fold **throw**
   (`token surface: replace at seq N over range … has no adjacent shadow price`).
   **Do not import `foldSurfaceProjection`** — it is not reachable from the installed package (see
   §16.3). The projection's *state* is the observable; the function is private.
   Cross-check with the public `tokenMeter.measure(session).surfaceTokens`, which prices the surface
   directly — note this is a **different** mechanism (the measurement planner), so it corroborates the
   arithmetic without exercising the claim path.
5. **Closed shapes.** The carrier's `data` key set is exactly `{role, id, content, source}`; content is
   a non-empty text-block array; the id carries the plugin prefix; and `source.kind` is the one chosen
   in §5.4 (not a human-turn kind, and the choice is recorded per §16.7). The audit's `data` key set is
   exactly `{shadowedRange, shadowedSeqs, shadowedTokenCount}`, carries no `surfaceOp` and no
   `sourceEventSeqs`, and its `shadowedTokenCount` is a non-negative integer.
6. **Positional ranges.** A range whose `startSeq` is numerically greater than its `endSeq` is accepted
   and written unchanged.
7. **Shape probe.** The `surfaceOp` object is built from the detected runtime key names; a detector
   that disagrees with the running format throws. The source contains no hardcoded single-shape
   literal.
8. **Input faults write nothing.** A bad target, a blank edit, an unknown session, a busy agent: each
   leaves the log byte-identical to before the call.
9. **Output faults flush first.** When an exit assertion fails after a write, the flush has already
   happened exactly once and its observed length equals the post-write log length. The plugin never
   reports failure over a surface it has already changed.
10. **Flush discipline.** Exactly one `sessions.flush(session)` per successful operation, and none on
    a refusal.
11. **Serialization.** Two operations issued concurrently on one session never overlap: instrument the
    flush and assert `maxActive === 1`.
12. **Never rejects.** Every business outcome resolves a result envelope; even a throwing `sessions.get`
    yields a well-formed error code.
13. **Sparse-log safety.** With a hole deliberately punched at the round's user seq and a shadowed
    earlier round present, regenerate re-sends the **current** round's prompt and never an earlier
    one; with no readable prompt it refuses with `no-text`, calls `followup` zero times, and writes no
    marker.
14. **`message-pending` vs `target-shadowed` vs `message-not-found`.** Each of the three states, and
    their combination with file facts, produces its own code — and `replay-failed` never produces
    `target-shadowed`.
15. **The carrier is not a round boundary.** A carrier appended into a session leaves the round
    structure — as the host computes it — unchanged: the number of rounds before and after the write
    is equal, and the carrier is not classified as a model message (§16.7).

### 13.2 Test-double discipline

16. **The fake mirrors the production host generation by default.** It exposes `snapshotEvents()` /
    `eventAt()` and **no** `events` member; a legacy array is available only behind an explicit
    opt-in. Add a test asserting `'events' in session === false` for the default fake. This criterion
    exists because a legacy-shaped fake once let an entire suite pass while the feature was dead on
    real machines.
17. **The suite runs the real pre-write rules**, not a stub that always accepts.
18. **Every price comes from the official package.** The estimator is imported, and its absence makes
    the suite **throw**, never skip.

### 13.3 Client

19. **One shared error boundary** wraps every registered surface, asserted structurally (one boundary
    class across every registration site, every wrapper produced by the one factory, each with its own
    localized title) and by a source guard (no registration site passes a bare component). A throwing
    surface leaves the rest of the UI intact. Function *identity* is not the assertion and cannot be:
    the factory is called once per site so each site can pass its own surface and title, which makes
    every wrapper a distinct object — the shared identity is the boundary class they all render (§7.4).
20. **The un-boundaried case throws out of the render** — proving the boundary is what prevents the
    blank page.
21. **`setDraft` is phase-gated** by the plugin: the composer-echo control is disabled during the
    busy phases, and a click during a phase change does not call it.
22. **The hide plan** hides exactly the rows whose keys the snapshot assigns to the shadowed seqs,
    covering the `turn-tail`, `tool-call`, and half-seq cases; it is computed once per snapshot; and a
    row that should be hidden is hidden, while the **negative control** — the same row with the
    plugin's rules unmounted — is still rendered.
23. **The rules survive dismissal.** Dismissing the count notice does not restore any row.
24. **The count is honest** — it equals the number of keys in the emitted plan, not the number of
    shadowed seqs.

### 13.4 Descriptor and packaging

25. **The seven rules** (§6.3) are asserted against both contributions by `scripts/check-typert.mjs`,
    which reads the installed validator rather than a copied list.
26. **One table, two faces** — the host and client contributions are deep-equal.
27. **The result codec rejects an unknown field.**
28. **The host registers exactly once and the registration outlives every call**; a second mount
    throws before any method is callable and is contained by the caller.
29. **`peerDependencies` are bounded**, and `dsh.client.inject` lists the gateway but not the registry.

### 13.5 Gates

30. `check` runs: source syntax (parse every file under `lib/` with the bundler's parser — a plain
    `node --check` silently validates only its **first** argument), the descriptor validator, and the
    host-contract gate.
31. CI runs, in this order: `check` → `build` → **`git diff --exit-code -- lib/`** → `test`. The
    diff gate is what keeps committed build artifacts honest, and it only works after `build`.
32. Generated files, if any, are committed and carry a `GENERATED FILE — do not edit by hand` banner
    naming their source.

---

## 14. Phase 2 — file rollback

**Do not implement this before phase 1 works.** A rollback is only meaningful once the rewind defines
the span of work being undone, so this section deliberately follows the mechanism.

A rewind moves the conversation back but leaves the files the agent changed exactly as they are. Phase
2 closes that gap, and it needs a substrate:

**Versions, narrowly.** Every rewind records a minimal, non-user-addressable record of the files that
turn touched **and their prior contents** — nothing more. There is no timeline UI, no version
browsing, and no message versioning; those remain out of scope. The record exists solely so a rollback
has a target state.

- **Observing what a turn touched.** Derive the file set from the turn's events in the span being
  undone — the tool rows that write — read from the same file-backed log route as §4.2.
- **Storage.** git-first when the workspace is a repository, with a content-addressed snapshot
  fallback under the plugin data home. Never auto-commit, never touch the user's branches.
- **The rollback act.** The user chooses per rollback between **conversation only**, **artifacts
  only**, or **both**, and sees a **dry-run preview** before it executes.
- **Concurrency, stated explicitly.** The spec must state the rule rather than inherit one by default:
  the record covers files **the agent wrote within the span**. A file the user edited concurrently is
  out of the record, and the rollback MUST NOT overwrite it — detect the divergence at rollback time
  by comparing the file's current content against the recorded post-state, and refuse that file with a
  named reason rather than clobbering it. This is the conservative rule, and it is chosen because the
  alternative silently destroys work the record never saw.

Phase 2 rides the same Remote namespace as a second `op` value or a sibling method; either is
consistent with the seam in §3.

---

## 15. Appendix — upstream proposal (context only, not a task)

**Nothing in this appendix is for you to implement, and nothing else in this document depends on it.**
It is background on why §7.1 takes the shape it does.

DSH has no user-message actions slot, and this feature is the second implementation to work around
that by manufacturing a chat node kind. `@dsh-session/README.zh.md:192` names "a consumer that needs
capability beyond boundary-based forking" as the trigger for revisiting that design, which is what
this plugin is.

Proposal: add a **`conversation.chat.user-actions`** list slot, parallel to
`conversation.chat.assistant-actions` and declared by the same `conversation.view` entry, delivering
`{ messageId, seq }` as owner props. Its absence is why this plugin must register a node kind (§7.1);
its presence would remove one registration point and one manufactured node kind from every plugin in
this space. Until it exists, §7.1 is the supported route.

---

## 16. Verification items — ALL ANSWERED

Originally seven items that a code read could not settle; §16.8 was added when implementing the
answers turned up a further discrepancy, so there are **eight**. Every one has now been **run against
the shipped host** (DSH Desktop 2.0.15, `dsh-session` 0.1.7-rc.2) and the raw observation is recorded
below in place of the question — the observed values, the member-by-member enumerations, and the
failure messages verbatim. **Two of the answers contradicted this document and have since been folded
back into it**:
§16.1 changed §4.2 (which route computes the span, and how the auxiliary route's empty read is
handled) and §16.2 changed §5.5 / §9.4 (how the resend call is written and what it can report). Those
sections now read as decided. The rule stands: **§16 records the observation, the owning section
carries the decision.**

**§16.8 was not one of the original seven.** It was found while implementing §13.1 #4, whose text told
the test suite to import `foldSurfaceProjection` — an export the installed package does not have. That
thread also disproved §2.2's claims about `surfaceOp` spelling tolerance. Both corrections are in the
sections that owned them; §16.8 records the observation because the same rule applies: a finding with
evidence gets written down where the next reader will find it.

**How these were measured.** A throwaway bundle was installed into an isolated harness home
(`DSH_HOME` pointed at a scratch directory, a separate `probe` profile composed from
`@deepseek-ai/dsh-base` + `@deepseek-ai/dsh-web-app`), booted with the shipped `dsh` launcher, and the
observations were read off its stdout. The user's real `desktop` profile was never modified and DSH
Desktop was never restarted. The probe bundle has been deleted; nothing from it ships.

Items 4 and 5 were answered earlier by reading the installed bundle.

### 16.1 `sessionPersistence.open(id, 'read')` on a live session — it does *not* take ownership, but it can silently return nothing

**Raw observation.** On a live session owned by a write handle:

| Call | Result |
|---|---|
| `open(id, 'read')` | **no throw** — ownership is never contested |
| `open(id, 'write')` | `SessionAlreadyOwnedError: session "…" is already owned by an active write handle` |
| `read()` **before the session is first materialized** | `{ eventState: 'detached', events: [] }` — **empty, and no throw** |
| `read()` after the session has a file, on the **same** handle | `{ eventState: 'shared-frozen', events: [0…N] }` — dense, complete to the tail |
| `read()` after the session has a file, on a **fresh** handle | identical to the above |
| `read(offset, length)` | honours the offset; `events[targetSeq]` indexes correctly because seqs are dense from 0 |

So the ownership question the check was written for **has a negative premise**: `SessionAlreadyOwnedError`
is raised by `open(id, 'write')`, never by `open(id, 'read')`. Route (1) is available on a live session.

**The real hazard is different, and worse.** `read()` returns an **empty slice without throwing** while
the session has never been materialized: `JsonlSessionPersistence.open` hands a read handle whose
`materialized` flag is false whenever a *pending* (created-but-never-flushed) entry exists, and
`JsonlSessionHandle.read` then falls through to `resolveCurrentLog()` → no file → `{ detached, [] }`
(`@dsh-session-persistence-jsonl/lib/index.js:2454-2490`, `:64-92`). A caller that only catches throws
sees a successful read of an empty log. Note the state name is not an error signal in general —
`shared-frozen` vs `detached` describes whether the slice is caller-exclusive or shared, and both are
normal (`@dsh-session-persistence/README.zh.md:32-49`) — so the *pair* `detached` + `events.length === 0`
is the thing to treat as failure.

**Route (2) is not what this document said it was.** `sessionQuery.readSession(id)` for a live session
is exactly `snapshotLive(session)` = `{ header, inheritedEventCount, events: session.snapshotEvents()
.map(clone) }` (`@dsh-session-query/lib/index.js:126-134`, `:300-306`). It *is* the `snapshotEvents()`
view — and in this host that view is the **complete, dense, contiguous log**, because `Session` is
constructed with `new SurfaceManager(this.log, SessionLogOffset(0), projections)`
(`@dsh-session/lib/index.js:1284`) and `snapshotEvents()` returns the whole `this.log`
(`:1336-1345`). Windowed/sparse construction exists in the `SurfaceManager` API but has **no caller in
this host**.

Measured side by side on one live session at the same instant, when no file existed yet: **route (1)
returned 0 events (`detached`) and route (2) returned 6.** Once a session has a file, route (1) reads
it fine and even sees a just-appended, not-yet-explicitly-flushed event (the delivered JSONL backend
persists each batch as it is routed), so the empty case is specifically the
created-but-never-materialized window — which is exactly where a plugin's very first operation on a
fresh session lands.

**Conclusion.** Keep §4.2's *rule* — derive the span from a log read that covers the target, and refuse
rather than guess — because it is what makes the empty-slice case safe. But the earlier preference order
and its stated reason were wrong for this host: route (1) is neither the freshest nor the safer of the
two, and route (2) is not "narrower".

**Resolved.** §4.2 now rests on the rule, makes **route (2) primary** for the span and the resend text,
and demotes route (1) to supplying `fileMaxSeq` for §4.5 — with `{ detached, events: [] }` named
explicitly as a failure rather than an empty log. Was
[`21-live-log-route-order.md`](issues/21-live-log-route-order.md) (now resolved).

### 16.2 `agent.followup` settles on **neither** acceptance nor completion — it returns `undefined`

**Raw observation.** On a live, idle agent, via the exact call site §5.5 names:

```js
const result = ctx.agents.get(sessionId).followup({
  content: [{ type: 'text', text: 'probe: reply with one word' }],
  source: { kind: 'user' },
})
```

| Observation | Value |
|---|---|
| `followup()` threw | no |
| return value | `undefined` |
| `typeof` the return value | `undefined` |
| `typeof result?.then` | `undefined` — **not a thenable, not a promise** |
| `agent.status` immediately after | `running` |
| `agent.status` after `await result` | `running` — but that proves nothing: `await undefined` is a no-op |
| `agents.get(id) === handle.agent` | `true` |
| `followup()` on a disposed agent | **no throw** |
| `await agent.whenIdle()` | resolves; status then `idle` |

`Agent.followup` is `send(input, 'next-turn', true)` and `send` returns nothing
(`@dsh-agent-loop/lib/index.js:800-808`). The binary the ticket proposed — "acceptance vs completion" —
does not exist: there is no promise to settle at all. **Every** shipped first-party caller uses it as a
fire-and-forget statement (`dsh-api-session-controller:883`, `dsh-webhook:184`, `dsh-subagent:695`,
`dsh-schedule:1594`, `dsh-tool-jobs:285`, `dsh-command-goal:100`, and six more), and the package README
pairs it with `await handle.agent.whenIdle()` as the completion signal
(`@dsh-agent/README.zh.md:47-58`).

**What this means for §9.4 and §5.5.** §9.4's error row cannot claim an immediate **throw** — there is
no throw, even on a disposed agent. What it can claim is the **acceptance** failure, and that rests on
one signal, confirmed live:

- `agent.status` — read it after the call; `running` means the turn was accepted, anything else means it
  was not. Never infer anything from the return value, because there is none.

The **turn's own** failure is a separate, durable signal the host already reports:

- the log — the turn closes with `turn/end` whose `data.reason.kind === 'error'` (observed, with the
  model error message carried in `reason.error.message`); success is `reason.kind === 'completed'`.
  There is no `agent/error` event in the log for this case; the failure lives on `turn/end`. This is the
  agent's own reporting, not the plugin's row — see §9.4.

**Resolved.** §5.5 now writes the call as a plain statement with an explicit note that the return value
is `undefined`, and §9.4 separates the two failures: the acceptance failure is the plugin's error row
(with "Send again"), and the accepted-then-failed turn is the agent's own reporting, which the plugin
must not duplicate. Was [`22-followup-returns-void.md`](issues/22-followup-returns-void.md) (now
resolved).

### 16.3 No pair-level entry point exists in the host — but the host *does* offer a pure whole-log checker

**Raw observation.** The host's validation surface, enumerated live:

| Member | Present | Pair-capable? |
|---|---|---|
| `session.append(type, data, opts)` | yes | no — validates and commits each event, one at a time |
| `session.surface.validateNext(event)` | yes | **no** — holds exactly ONE pending plan, and rejects a candidate whose seq is not the next one (`session event seq 14 is not contiguous; expected 13`) |
| `SessionStore.validateAppend` / `.validatePair` | **absent** | — |
| `invariants` service | absent from this composition | — |
| `foldSurface(events)` — exported by `@deepseek-ai/dsh-session` | yes | **yes, in the useful sense** |

A planned pair handed to `foldSurface([...log, plannedAudit, plannedCarrier])` is checked **without
mutating anything** (`session.seq` unchanged — verified). It is a real gate, not a rubber stamp: it
**threw** on a carrier whose `sourceEventSeqs` omitted shadowed nodes
(`surface replace: sourceEventSeqs must include every shadowed surface node; missing 6, 8, 10`).
It does *not* check the shadow-price claim's arithmetic — a planned audit whose `shadowedRange`
contradicted its carrier was accepted, so §5.3's price protocol stays your own pre-check.

The reference implementation's `pre`/`pair` phases are **its own** `createMarkerGuard` phases over
`dsh-log-contract` (`dsh-retrace/lib/prewrite-guard.js:122-216`) — a third-party contract package §3
explicitly forbids depending on. They are not a host entry point.

**Conclusion.** Keep §5.2's explicit pre-validation. Additionally, `foldSurface` is the **official,
authoritative, read-only** way to validate the planned pair before the first append — strictly better
than a hand-rolled re-check for the rules it covers (range membership, `sourceEventSeqs` completeness,
`surfaceOp` shape, seq ordering, and the whole rest of the surface contract), because it fails when the
host's rules change. Recommended: run the pair through `foldSurface` **and** keep §5.3's arithmetic
pre-check for the price. §13.1 #2 stays the acceptance test either way.

**One export that is not reachable, found while checking this.** §13.1 #4 previously said to fold the
**official** `foldSurfaceProjection` over `[audit, carrier]`. That function exists
(`@dsh-token-meter/lib/types/surface-projection.js:37`) but **is not exported from the package**: the
exports map declares only `.`, `./client`, `./estimate`, `./src/*` and `./package.json`, and the
runtime export list is exactly `TokenMeter, default`. Importing
`@deepseek-ai/dsh-token-meter/types/surface-projection` throws
`Package subpath './types/surface-projection' is not defined by "exports"`. So the criterion as written
could not be implemented, and a test that "imported the official fold" would have had to reach into
`lib/` by path — which the host-contract gate (§12) exists to prevent.

The protocol is still observable, through the projection that **consumes** the claim:
`ctx.sessionProjections.stateOf(session, 'contextPressure')` returns the raw state carrying both
`claim` and `surfaceTokens`, and its `apply` is the sole caller of `foldSurfaceProjection`
(`@dsh-token-meter/lib/index.js:474`). §13.1 #4 has been rewritten to assert through that state.

**A trap worth knowing:** the token meter has **two independent paths over the same surface**, and only
one of them is the claim protocol. `TokenMeter.measure()` prices the surface directly with the
measurement planner and never consults a claim
(`@dsh-token-meter/lib/index.js:205`, `:762`, `:784`), whereas `contextPressure` is the shadow-price
consumer. A test that asserts on `measure().surfaceTokens` alone proves the arithmetic is *plausible*,
not that the claim was defined and consumed — hence both are named in §13.1 #4.

### 16.4 The `RemoteResult` envelope encoding — ANSWERED

Read from the installed bundle, so no runtime check is needed.

The host's strict codec is the authority for the wire shape, and the generated codec for a
`RemoteResult<T>` is the tagged union you would write by hand:

```js
z.union([
  z.object({ ok: z.literal(true).readonly(),  value: <T> }),
  z.object({ ok: z.literal(false).readonly(), error: <discriminated union on `code`> }),
])
```

Evidence: `@dsh-message-feedback/lib/typert.host.js:11-33` and `:69-107` (two shipped strict result
codecs), and `@dsh-api-gateway/lib/index.js:1072`, `:1096` for the only place a codec's `typeSymbol`
is compared with a provider's. Write the result schema in exactly that union shape, with one `error`
variant per code in §4.5, and mark every field `.readonly()`.

### 16.5 Is the result codec's schema used to decode on the client? — ANSWERED: no

`@dsh-api-gateway/lib/client.js:1799-1802`:

```js
return {
  ok: true,
  value: descriptor.result.mode === "strict" && descriptor.result.decode !== void 0
    ? descriptor.result.decode(result.value)
    : result.value,
}
```

The generated result codec carries `mode`, `typeSymbol` and `create` — **no `decode`**. So the client
passes the host's value through unchanged, and the result schema's `create` never runs at runtime on
the client. Consequences:

- **The result schema is not a client-side trust boundary.** Your validation duty is host-side: the
  host validates what arrives (`@dsh-api-gateway/README.zh.md:52`).
- **Still write the result schema strictly and completely.** It is what the typert registry serves to
  tooling, and a wrong one is a documented lie about the wire.
- The `decode` hook is a real extension point if you ever need native byte handling; you do not.

### 16.6 `ctx.typert.register()` **is** reachable from a bundle's host half — and the probe as originally written would have answered wrong

**Raw observation.** Two Loader rows in one installed bundle, differing only in their `inject`:

```js
// Row A — export const inject = []
typeof ctx.typert                 // ACCESS THREW: cannot get property "typert" without inject
typeof ctx.typert?.register       // ACCESS THREW: cannot get property "typert" without inject
ctx.get('typert')                 // undefined
```

```js
// Row B — export const inject = ['typert', 'agents', 'sessions', 'sessionPersistence', 'sessionQuery']
typeof ctx.typert                 // object
typeof ctx.typert.register        // function
ctx.typert.register({ package: 'dsh-resend-probe-full', face: 'host', schemas: [], invocations: [] })
                                  // OK (no throw); returned a function (the effect disposer)
ctx.typert.listPackages()         // ["dsh-resend-probe-full#host"]  — the contribution is live
```

**The original probe could not have given a usable answer.** Row A is the ticket's own probe —
`inject = []`, "keep it empty: this probe must not depend on anything" — and Cordis refuses *any* service
property read on a fiber that does not inject it: the proxy trap for an uninjected prop throws
`cannot get property "<name>" without inject` (`@deepseek-ai/cordis@4.0.4/lib/index.js:668-681`). So
`typeof ctx.typert` on an empty-inject fiber throws for **every** service, present or absent, and the
ticket's own decision table would have read that throw as "the registry is not in this composition" and
sent the implementation down the loader route — the expensive fallback — on a false signal. The honest
presence test is `ctx.get('typert')`, the accessor documented as carrying no inject requirement, or a
fiber that simply injects it.

**Conclusion.** The direct route works, exactly as §6 assumes: `ctx.typert.register(contribution)` is
callable from an installed bundle's host half, accepts a minimal well-formed contribution, and the
contribution becomes visible in the registry. **§6 stands unchanged**; no `./typert` export, no
reflection `model`, no restart-cache caveat. §6.6's reasoning is confirmed rather than merely plausible.
One implementation note this settles: because the probe's empty-`inject` form is a trap, the host half
MUST declare `typert` in its `inject` list (which §3.1 already implies but does not state for this
service).

### 16.7 The carrier's `source.kind` is `'cordis-host-runner'` — confirmed by grep **and** by a live write

**Raw observation, part 1 — the grep.** For the literal across the installed
`@deepseek-ai/*` tree, every hit is one of exactly three things, and none of them is a consumer:

| Where | What it is |
|---|---|
| `*/lib/typert.host.js` (10 packages) | the closed `MessageSourceMap` declaration, quoted verbatim |
| `dsh-cordis-host-runner/lib/index.js:2355, :2364, :2377, :2390, :2417` | **producer** sites — that package injecting a user message via `createUserMessage({… source: { kind: 'cordis-host-runner' }})` |
| `dsh-client-ui-chat/lib/client.js:6595` | a `case` in the trigger-label table (`title: 'message.trigger.plugin'`), reachable only for a row that already rendered |

The only other hits are `dsh-session-format-v3-to-v4/lib/index.js:78`, where the string sits in
`RELEASED_SAME_NAME_PRODUCERS` — a list of released V3 plugin names that keep their current kind —
i.e. a migration allowlist, not a classifier.

**No hit anywhere treats the kind as a model or assistant message.** The candidate that *is* special is
the other one: `dsh-session/lib/types/surface.js` validates an `assistant/message`'s source as
`{ kind: 'model', … }` with a required `provider`/`model`/`replayState` shape — observed live, a cold
reload **rejected** a hand-made assistant message with `session event at seq 6 message must have model
source`. `'model'` is therefore a kind with a stricter contract attached, which the carrier does not
satisfy and should not have to.

**Raw observation, part 2 — the live write** (this is §13.1 #15, observed rather than asserted). The
real pair was written into a live session on the shipped host: `compaction/prune` audit, then the
`user/message` carrier with `source: { kind: 'cordis-host-runner' }`, `surfaceOp: {op:'replace',
startSeq, endSeq}` and `sourceEventSeqs: [auditSeq, …range]`.

| Assertion | Observed |
|---|---|
| `audit.seq + 1 === carrier.seq` | true |
| `carrier.sourceEventSeqs[0] === audit.seq` | true |
| every referenced seq `< carrier.seq` | true |
| no duplicate references | true |
| carrier `data` key set is exactly `{role, id, content, source}` | true |
| `surfaceOp` key set is exactly `{op, startSeq, endSeq}` | true |
| **round count before vs after** (host's own `turn/start` count) | **1 → 1, unchanged** |
| `isReplacementSurfaceEvent(carrier)` / `isAppendSurfaceEvent(carrier)` | `true` / **`false`** |
| `deriveEventMessage(carrier).role` | `'user'` — **not** a model/assistant message |
| the official meter still folds the session | yes, `measure()` returns a consistent `nodes` list |

**Conclusion.** Use `'cordis-host-runner'`. It is the honest first-party kind for "a Cordis host plugin
injected this user message", it is what the shipped `dsh-cordis-host-runner` itself uses for identical
messages, no consumer misreads it, and the write was accepted with the round structure intact.

**Two consequences for §8 that the live write settled, and that §8 must reflect.** `applySurfacePlan`
**splices** the replacement into the node list in place of the shadowed range
(`@dsh-session/lib/types/surface.js:438-441`) — measured: surface `[4,6,8,10]` after a rewind covering
`[4,6]` became `[14,8,10]`. So:

- the carrier **is** a surface node and **is** the current provider of the replacement content, while
  `isAppendSurfaceEvent` is still false — which is exactly why it renders nothing and why the fresh
  append (§5.5) is the only thing that makes the new text visible. §8's hide plan must key on
  `isAppendSurfaceEvent`, never on surface membership;
- a second rewind that targets the carrier produces the **descending** range the spec predicted:
  `startSeq = 10 > endSeq = 7` was written unchanged and accepted, then reloaded cold and
  replay-validated (`foldSurface` on the persisted log reproduced the live surface exactly). §13.1 #6
  is confirmed, and §4.3's "may descend numerically" is literal.

### 16.8 `surfaceOp` accepts exactly one spelling on v4 — found while implementing §13.1 #4

**Raw observation.** Three appends into one live v4 session, identical but for the `surfaceOp` object:

| `surfaceOp` written | Result |
|---|---|
| `{ op: 'replace', startSeq, endSeq }` | **accepted**; written back verbatim |
| `{ op: 'replace', start, end }` | **rejected** — `Error: session event "user/message" carries an invalid replace surfaceOp` |
| `{ op: 'replace', startSeq, endSeq, extra }` | **rejected** — same message |

`isReplaceOp` requires exactly the three keys `op`, `startSeq`, `endSeq`, with `op === 'replace'` and
both endpoints non-negative safe integers (`@dsh-session/lib/types/surface.js:196-205`), and the
rejection comes from `surfaceOpOf` at the append boundary (`:230-231`). The pre-v3 `{start, end}`
spelling survives only in **stored logs of format ≤ v2**, which `dsh-session-format-v2-to-v3`
rewrites on load (`:364-372`).

**This contradicted §2.2**, which claimed the host "does not check their names", that a wrong spelling
"is accepted and then fails downstream with a bewildering error", and that §5.4's runtime probe was
what stood between the plugin and that corruption. All three were wrong: the rejection is immediate,
and it names the field. §2.2 and §5.4 have been corrected; §5.4's probe is retained as a guard
against a future runtime, with its real justification stated rather than an invented one.

**The related trap, which is real and remains.** The two fields use *different* key namings on the
same runtime: `surfaceOp` is `{op, startSeq, endSeq}` while the audit's `shadowedRange` is
`{start, end}`. The shipped first-party pruner writes both spellings side by side
(`@dsh-compaction-tool-result-pruner/lib/index.js:159-175`), so this is the current shape of both
fields, not legacy drift. §5.3, §5.4 and §2.2 now state each field in its own naming.
