# Map: DSH edit-and-resend / regenerate plugin spec

Effort slug: `dsh-resend-plugin`. Tracker: local markdown (see `docs/agents/issue-tracker.md`).

## Destination

A **specification document** (no implementation code) for a DSH Desktop plugin that adds two
operations: **edit-and-resend** on a sent user message, and **regenerate** on an assistant reply.
The spec must be implementable by another agent: it names every extension point it uses, gives each
one a declared-absent fallback, states the history-rewriting mechanism and its failure modes as
normative requirements, and defines acceptance criteria.

Not the destination: working plugin code, a fork of `dsh-retrace`, or upstream patches.

## Notes

**Domain.** Authoring a third-party DSH plugin: a Cordis plugin shipped as an npm package ("bundle")
installed into a profile, with a Host half (`main`) and a Client half (`exports["./client"]`), the
latter loading through `window.__ModuleLoader__.load({id, factory(require)})`.

**Primary sources.** The shipped app at `D:\DSH Desktop\resources\app\` is ground truth; its client
bundles are rolldown-bundled but **not minified**, so they are greppable. First-party authoring
guidance ships inside it at
`node_modules\@deepseek-ai\dsh-agent-preset\skills\cordis-plugin-development\` (SKILL.md plus
`references/ui-plugin.md`, `references/practices.md`, `references/host-plugin.md`, and a decoration
template). Read `practices.md` before choosing any extension point. The complete slot catalogue with
`doc`, `registerOptions`, `ownerProps`, `occupants` and `replaceRisk` is embedded in
`node_modules\@deepseek-ai\dsh-cordis-client-runner\lib\client.js`.

**This session runs inside the target profile** (`DSH_PROFILE=desktop`,
`DSH_PROFILE_DIR=C:\Users\Administrator\.dsh\profiles\desktop`, GUI at `http://127.0.0.1:43120`).
Installing a plugin changes the GUI this session is driven through.

**Skills every session should consult.** `research` when a ticket needs facts; `writing-for-agents`
when drafting spec prose; `tech-doc-style-chinese` if the spec is written in Chinese.

### Established platform facts — do not re-research

- History is a single monotone `seq`-numbered **append-only event log**. There is **no session
  tree**; same-session branching is explicitly deferred upstream (`dsh-session/README.zh.md:192`).
- **In-place history rewind is a first-class platform mechanism**, not a hack:
  `session.append(type, data, { surfaceOp: {op:'replace', startSeq, endSeq}, sourceEventSeqs })`
  (`dsh-session/lib/index.js:1401-1405`). Replace is **inclusive** and ordered by **surface order,
  not seq order** (`README.zh.md:50`). `sourceEventSeqs` must list **every** shadowed node
  (`:267`). `assistant/message` cannot carry `sourceEventSeqs` (`:313`), so the carrier must be
  `user/message`.
- `sessions.fork({sessionId, atSeq})` exists (`atSeq` inclusive) but **is not the mechanism this
  effort uses** — forking for edit-and-resend is strictly worse (it moves the user to another
  session).
- Slot keys are company for the client UI. The keyed `conversation.chat.node` slot's **key is the
  node kind** (`dsh-client-ui-chat/lib/client.js:1770-1778`).
- `conversation.chat.assistant-actions` (list) exists for assistant replies.
  **No user-message actions slot exists**; the official way to add a per-user-message affordance is
  to register a **new Chat node kind** via `ctx.uiConversation.events.register()` and render it in
  `conversation.chat.node` under that kind's key (`practices.md:37`).
- The composer is a **deliberate per-session singleton** (`InputHub.shells`, a cached WeakMap,
  "the resident per-session facade"), but `inputActions` is a **standard slot prop** exposing
  `setDraft(text)`, so a chat-node component can reach the composer without resolving the singleton.
- Plugins must not write DOM (`practices.md:36`) and must not import Harness Client packages
  (`practices.md:35`) — though shipped third-party plugins do both in practice.
- Never append a plugin-owned event type: the persistence reader refuses the whole log, and unknown
  historical types make a session permanently unmigratable.
- **The transcript is append-origin and is deliberately NOT the surface fold.** A chat row renders
  only for events with `surfaceOp === 'append'`, so a **shadowed node keeps rendering** and a
  **replacement carrier renders nothing at all**. Quote: "The model-visible surface deliberately
  shadows replaced ranges, so it is the wrong source for a human transcript — a landed replacement
  would erase conversation the user already saw. … replacement copies stay model-only"
  (`dsh-session/lib/types/surface.js:43-46`; predicate applied at
  `dsh-client-ui-chat/lib/client.js:9195-9204`). Consequence: **hiding a replaced row is the
  plugin's job** — there is no platform behaviour to lean on (see [Is a replaced message actually
  deleted, or only removed from the model surface?](issues/15-delete-vs-hide.md)).
- `MessageSourceMap` is a **closed union** (17 kinds, `user` … `session-reference`); a plugin cannot
  invent a `source.kind`. Marker identity must live in the carrier's `data.id` prefix. The
  first-party source kind for a Cordis host plugin injecting a user message is
  `{kind:'cordis-host-runner'}`.

### Reference implementations on this machine

- `dsh-retrace@0.4.32` at `~\.dsh\profiles\desktop\node_modules\dsh-retrace\` — prior art that
  already implements both features in place. **Currently `disabled: true`** in the profile patch.
  Its core three operations are ~1 700 lines; ~80% of its ~18k lines is orthogonal versioning.
- `@deepseek-ai/dsh-client-ui-message-feedback` — the minimal first-party template for registering
  into `conversation.chat.assistant-actions`.
- `dsh-better-sidebar@0.22.0` — a complete, shipped third-party UI plugin: manifest, `src/`,
  build (`tsc && tsdown`), tests (vitest + Playwright), locales.
- Research reports live in `.scratch/dsh-resend-plugin/research/`.

## Decisions so far

<!-- one line per resolved ticket: gist + link -->

- **The destination is reached: [`spec.md`](spec.md) exists** — a self-contained, English,
  implementation-ready specification for `dsh-resend`, written for an agent with no access to this
  conversation. It names every extension point with a declared-absent fallback, states the rewind
  mechanism and its failure modes normatively, and defines 32 acceptance criteria. Its §16 carries
  eight verification items — each with a concrete check and a decision rule, two answered by reading
  the installed bundle, six run against the shipped host — not specification gaps.
- [Implementation-time verification: run these seven checks, then start building](issues/20-implementation-verification.md)
  — **resolved. All five runnable checks ran against the shipped host and every answer is now in
  `spec.md` §16.** The run did **not** touch the user's environment: DSH Desktop's own `dsh` launcher
  boots any non-`desktop` profile, so an isolated `DSH_HOME` under `%TEMP%` plus a throwaway `probe`
  profile reproduced the delivered composition (typert registry, persistence seam, agent loop,
  invariant guards) with the real profile never modified and the GUI never restarted — a strictly
  better probe environment than the ticket's own precondition, and now the recommended one. **Three
  answers are decisive, and two of them contradict the spec:**
  `ctx.typert.register()` **is** reachable from a bundle (§6 stands — but the ticket's own
  `inject: []` probe could not have shown it, because Cordis throws on *any* uninjected service read
  and the ticket's decision table would have misread that as "not in this composition"); the carrier's
  kind is **`'cordis-host-runner'`** (grep: no consumer anywhere, and a live write confirmed round
  structure intact, §13.1 #15 now *observed*, plus the descending range of §13.1 #6 end to end
  including a cold reload); **route (1) `open(id,'read')` silently returns an empty slice** on a
  never-flushed session, and `readSession` is *not* the windowed view §4.2 calls it; and **`followup`
  returns `undefined`**, so there is no promise to settle. A **third** finding surfaced while
  implementing the decisions: `foldSurfaceProjection` — which §13.1 #4 told the test suite to import —
  is **not exported** from `@deepseek-ai/dsh-token-meter` (only `TokenMeter` is), so that criterion was
  unimplementable as written; it now asserts through `sessionProjections.stateOf(session,
  'contextPressure')`, the projection that actually consumes the claim. A **fourth** (`§16.8`):
  `surfaceOp` accepts exactly **one** spelling on v4 (`{op, startSeq, endSeq}`) and rejects
  `{op, start, end}` immediately, contradicting §2.2's claim that the host "does not check their names"
  — while the audit's `shadowedRange` really does use `{start, end}`, so the two fields genuinely
  differ and §2.2/§5.3/§5.4 now say so.
- [§4.2's log-route preference order is wrong for the shipped host](issues/21-live-log-route-order.md) —
  raised by ticket 20, **resolved: reverse the order, then give each route one job.** Route (2)
  `readSession` is primary and supplies the range and resend text; route (1) `open(id,'read')` is
  auxiliary and supplies `fileMaxSeq` for §4.5. `{detached, events: []}` is now named a failure, a
  sliced read is forbidden for computing a span, and the write path is separated out (`session.seq`,
  not a read). §4.2's rule survives at the head of the section.
- [§5.5's await and §9.4's error row both need restating](issues/22-followup-returns-void.md) — raised by
  ticket 20, **resolved: fix the wording, keep the scope.** §5.5 drops the `await` and states that the
  return value is `undefined`; the only call-site inference is `agent.status === 'running'`. §9.4 now
  separates the two failures — the prompt never reaching the agent (the plugin's row, with "Send
  again") versus an accepted-then-failed turn ("**this plugin does not own this case and MUST NOT
  invent a row for it**"; its job is only not to destroy the rewind). No subscription to `turn/end` —
  deliberately declined as new surface area.
- [Why does this spec exist, given `dsh-retrace`?](issues/06-why-this-spec-exists.md) — the user wants
  their own plugin rather than waiting for the author, and **upstream has no fix** (`v0.4.32` is newest,
  `main` equals it). ~~Not adapted to v2.0.15~~ — **that reason is corrected**: the API-breakage
  hypothesis was falsified. Compatibility with the shipped version is still the spec's spine, but the
  mechanism behind the observed failure is **not established**.
- [What exactly breaks user-message editing on DSH Desktop v2.0.15?](issues/14-v2-0-15-edit-breakage.md) —
  **hypothesis falsified.** The plugin's own telemetry shows all 4 Definitions and all 6 slot
  registrations succeeding on `DSHDesktop/2.0.15`; the `ChatNodeKind` table is not runtime-enforced and
  no slot is missing. Two things undercut the premise: the plugin is **not currently mounted** (absent
  from `dsh.profile.bundles`), and **no edit operation was ever invoked** in any log. The only
  edit-exclusive code path is the `isRoundBoundary` gate — a hypothesis, not a cause.
- [What form does the spec take, and who implements from it?](issues/07-spec-form-and-audience.md) —
  a self-contained single `spec.md` in English, for another agent to implement with no access to this
  conversation.
- [Scope boundary: what is in, what is out](issues/08-scope-boundary.md) — the two features plus their
  inseparable behaviour (replaced message **deleted if possible, else hidden**; editor reached from an
  action row **beneath** the message; `Enter`/`Esc` **and** buttons; regenerate on the last reply,
  permanently visible; refusals greyed out with a hover reason). Bilingual but **never both languages at
  once**. No "original prompt" comparison, no hide safety valve. **Product/file rollback (git / snapshot)
  is IN scope** — the rest of `dsh-retrace`'s parallel systems are out.
- [File rollback needs versions, but versioning was declined](issues/16-file-rollback-needs-versions.md) —
  **(a)** record versions **only as the substrate for file rollback** (the files a turn touched and
  their prior contents). No timeline, no version browsing, no message versioning — "no versioning"
  survives as a claim about *user-visible* version features. File rollback is a **second-phase**
  section depending on the rewind mechanism.
- [Audit claim + carrier pair, or a lone surface replace?](issues/09-audit-pair-or-lone-replace.md) —
  copy `dsh-retrace`'s two-event pair (`compaction/prune` claim + `user/message` carrier, no `await`
  between), as normative.
- [What form does the edit box take?](issues/10-edit-box-form.md) — **(a3)** an inline editor in a new
  node kind beneath the message, plus an "edit in the composer" button for rich `@`/`/`/code quoting
  via `inputActions.setDraft`. **Correction from
  [What is the full `inputActions` API?](issues/04-inputactions-api.md): that second clause does not
  hold as written.** `setDraft` carries plain text only — chips cannot be inserted programmatically
  and their placeholder characters are stripped — so the composer echo drops every `@`/`/` reference
  and the user re-creates them by hand. The button survives; the fidelity claim does not.
- [Regenerate: which replies, and how faithful?](issues/11-regenerate-scope-and-fidelity.md) — last
  assistant reply only; text-only resend with the image degradation surfaced in the UI rather than
  silent.
- [Behaviour while the agent is streaming](issues/12-mid-stream-behaviour.md) — **refuse**; the user
  stops the reply first. No automatic cancellation.
- [Dependency and compatibility policy](issues/13-dependency-and-compat-policy.md) — **`require` of
  Harness Client packages is ALLOWED** (the static module table, notably
  `dsh-client-ui-primitives` — the user declined to re-author controls), but a client plugin's module
  face is `{inject, apply}`, so the shipped **chat** components are still unreachable: the user bubble
  must still be matched by copied markup/CSS. Guard the `require`, wrap primitive use in an error
  boundary, declare bounded `peerDependencies`. No hard third-party contract dependencies;
  per-registration-point fallbacks; exact upstream pinning; fail-soft isolation.
- [Is a replaced message actually deleted, or only removed from the model surface?](issues/15-delete-vs-hide.md)
  — **surface removal does not hide anything from the human.** The transcript renders append-origin
  events by design (`surface.js:43-46`), so the replaced row stays on screen unchanged, **and the
  replacement's own content never renders either**. The plugin must therefore specify its own hiding:
  CSS on `[data-chat-anchor-key]`, keys read from the Chat snapshot's node map by `anchorSeq` (never
  constructed), handling `turn-tail` / `tool-call` / half-seq pseudo rows, emitted from a React-owned
  `<style>`. Node-level `visibility:'hidden'` exists but cannot hide another Definition's row.
  "Rewind removes the message from the surface" is **forbidden wording** in the spec; "rewind + send"
  must be one atomic action; a failed hide must fail loudly. The declined `>40 %` valve is a live
  risk — a rewind shadows the whole suffix.
- [What is the full `inputActions` API?](issues/04-inputactions-api.md) — **seven verbs, and no more**:
  `captureInsertion` / `insertText` / `setDraft` / `addAttachments` / `removeAttachment` /
  `pruneAttachments` / `submit` (`dsh-client-ui-conversation/lib/client.js:13461-13484`; no `.d.ts`
  ships, so guard every verb's presence at runtime). **Structured reference chips cannot be inserted
  programmatically** — only the input-trigger controller drives the chip path, on a user's accept
  action, and `setDraft`/`insertText` strip chip placeholders; the composer echo is text-only.
  **Attachments ride a draft but only by id**, and the sole registry entry is
  `createDrafts(sessionId, File[])` — so the regenerate image degradation stays, with a documented
  re-upload upgrade path. **`submit()` takes no arguments and always requests the `queue` mode**, so
  the plugin can never steer. **`setDraft` has no phase guard** while the other mutators do, so the
  plugin must gate it on `useInput`'s phase itself.
- [How does a plugin's client half invoke its host half?](issues/18-client-to-host-channel.md) — **a
  Typert Remote over the API Gateway, mounted by the plugin itself**, not through `dsh-api-remotes`
  (which is only the shell's build-time namespace list; `ctx.remote` comes from
  `dsh-api-gateway/client`). A shipped precedent self-mounts — "without adding it to stable API
  Remotes" (`dsh-experimental-client-ui-voice-input/lib/client.js:5811-5836`). The HTTP-route and
  Cordis `host.call` candidates are both disqualified on evidence. **The load-bearing cost: the
  descriptor artifact is generated and `dsh-typert-generator` is NOT shipped** — the spec must choose
  hand-written descriptors (to the documented validation contract) or pinning the generator from the
  DSH source. Op surface: **one unary call**, because ticket 15 makes rewind+send atomic and ticket 09
  forbids an `await` between the two appends. A unary call **never rejects for carrier problems**
  (it resolves `RemoteResult`, discriminated by `isRemoteFailure`); only assembly faults reject; a
  duplicate mount throws before any method is callable.
- [Does the client event pipeline strip top-level `sourceEventSeqs`?](issues/03-sourceeventseqs-delivery.md)
  — **nothing strips it, and nothing could** (history pages and live follow frames share one `entryFor`
  that passes the event through whole; the wire validator refuses to normalise and throws on unknown
  fields). **But no shipped client consumer reads it either** — `surfaceOp` has three UI consumers,
  `sourceEventSeqs` has **zero**. So: do **not** make the hiding depend on it — have the **host return
  the shadowed seq set from the same Remote call** and treat the field as a fallback. The citation
  itself stays mandatory; omitting a shadowed node is a hard session-load failure. Also: the client
  **reader has exactly one method**, `previous(kind)` — there is **no event-at-seq lookup**, so a
  Definition needing an adjacent event must register a Definition for its kind (namespaced), and its
  `start` must be pure because the assembler replays it after a window fill.
- [What does `dsh-retrace`'s build and test technique teach us?](issues/05-retrace-build-and-tests.md)
  — read from GitHub `main` (**0.4.32**, same as the installed tarball). **The build is one client
  implementation through three wrappers** because DSH has two plugin channels with incompatible file
  shapes: `client.bundle.js` self-registers `window.__ModuleLoader__.load({id, factory})` for
  `exports["./client"]`, while `dynamic-{client,host}.js` are generated bare function bodies
  (`return { inject, apply }`, imports stripped) for the in-session plugin editor. **The load-bearing
  artifact for the spec is `scripts/check-host-contract.mjs`: 74 declarative assertions (60 present +
  14 absent) read out of the installed `app.asar`**, turning "which upstream surfaces are load-bearing"
  into a mechanical gate — with *absent* assertions as resurrection alarms and a self-scan invariant
  over the plugin's own tree. **The log rewrites are tested with a fake session shaped like the
  production host + the REAL `dsh-log-contract` guard as the oracle + the OFFICIAL `dsh-token-meter`
  fold for every price** — not real sessions on disk, not a mocked `append`. Five invariants come out
  as usable acceptance criteria: omit `seq` (the `seq: 0` regression caused a hard refusal), validate
  the pair **before any append** (zero writes on rejection), prove the shadow-price protocol by
  folding the official projection (matching claim ⇒ negative delta; a lone replace ⇒ **exactly zero**;
  mismatched orphan ⇒ the host fold throws), the carrier's `data` is **exactly**
  `{role,id,content,source}` and `start > end` is **legal** (positional order), and output assertions
  fail **after** the flush while input assertions fail **before** any append. Gates:
  `check → build → git diff --exit-code -- lib/ → test`, identical in CI and publish; pin the plugin
  exactly, never `^` across a host upgrade. Two by-products: a test double must **default to the
  production host generation** (a legacy-shaped fake once let 38/38 pass while the feature was dead),
  and the guard-dependency question is now **decidable** — the rules are small enough to re-implement,
  and `dsh-log-contract` is a real incident vector (a host export removal took the **whole plugin
  tree** down), so keep it out.
- [How is the Remote descriptor artifact produced?](issues/19-descriptor-artifact.md) — **hand-write
  it; the generator is not load-bearing.** Ticket 18's premise ("the generator is required, so pick a
  workaround") was too pessimistic: the artifact does **not** have to pass the loader's
  `validateTypertManifest()`, because the registry's other documented route,
  **`ctx.typert.register(contribution)`**, validates only **seven rules** read straight out of the
  installed `dsh-typert-registry/lib/index.js:398-575` — non-empty `id`; `package`/`service` free of
  `#`; `namespace`/`method`/parameter `name`/`wire` matching `/^[A-Za-z0-9_$.-]+$/`; unique wire
  fields; every codec either `{mode:'src-json'}` or non-empty `typeSymbol` **plus** a function
  `create`; a `result` codec; unary ops declaring **no** `mode`. **`model` (the reflection graph) is
  optional** (`:487`) and **`sourceLocation` is validated nowhere** — both are generator provenance.
  The target shape was read off a shipped generated artifact
  (`dsh-message-feedback/lib/typert.{host,remote-client}.js`) and is ~20 lines of structure plus a
  zod schema. **The host-side descriptor is the load-bearing half**: `resolveDescriptor()` reads
  `ctx.typert.local` (`dsh-api-gateway/lib/index.js:989-994`), so mounting the client contribution
  alone leaves the gateway on the weaker SRC fallback — and **withdrawal is a latch**: a strict
  endpoint that has been seen and withdrawn forbids SRC permanently
  (`gateway/definition-unavailable`, `:992`), so the registration must live for the plugin fiber's
  whole life. No extra `dsh.client.inject` is needed for the registry — the gateway's own client half
  already declares it. **Consequence: two hand-written contributions from one descriptor table (so
  the faces cannot drift), plus an executable validator asserting the seven rules against the
  *installed* package, instead of pinning a private unpublished generator to produce a file we would
  check in and hand-maintain anyway.**

## Not yet specified

**Nothing.** The spec is written: [`spec.md`](spec.md). Every item that was on this list is now
settled and drafted, and each is recorded below so the closure is checkable rather than asserted.

| Was open | Closed by | Where it now lives |
|---|---|---|
| The spec's section structure and acceptance-criteria phrasing; the unwritable item #1 | the positional-index hazard is now the **mechanism** rather than a diagnosis: the spec forbids deriving spans or prompt text from the in-memory event view | `spec.md` §4.2, §13.1 #13 |
| The hiding section's normative wording, the count-based disclosure, and the sidebar turn-outline question | ticket 15 | `spec.md` §8 (and the outline question is **answered**: the full slot catalogue has no turn-outline slot, so nothing outside the chat view needs treatment) |
| The regenerate fidelity rule | tickets 11 and 04 | `spec.md` §7.3, §9.2, §7.1 (the `createDrafts` upgrade path is named as a service method outside `inputActions`) |
| How the Remote descriptor artifact is produced | ticket 19 | `spec.md` §6 |
| The build, verification and acceptance-criteria section — including the host-contract gate and the guard dependency | ticket 05 | `spec.md` §12, §13, §3. The guard dependency is **resolved by policy**: §3 forbids a third-party contract dependency, and §5.2/§5.3/§5.4 enumerate the pre-write rules, so the rules are re-implemented (an implementation may use a contract package as a *test-time* oracle, which is where its value is and where its blast radius is nil). |
| Iconography; the visual treatment of the action row; what "rewind succeeded, send failed" leaves on screen | decided in this session | `spec.md` §7.1, §7.3, §9.4 |
| Whether a file rollback covers files the user changed concurrently | decided in this session | `spec.md` §14 — agent-written files only, with divergence refused by name rather than clobbered |
| Migration or coexistence from `dsh-retrace` | not needed | the destination is a **new** plugin that avoids retrace's failure modes by construction; the spec says nothing about retrace, which is correct |

**What remained after the spec was written is no longer open either.** The five executable checks were
collected into ticket [Implementation-time verification: run these seven checks, then start
building](issues/20-implementation-verification.md) — originally a handoff to "a session that can
install and mount a plugin into the profile and restart DSH Desktop, which is exactly what this session
cannot do". **That precondition was wrong, and the resolution records the better method**: DSH Desktop's
own `dsh` launcher boots any profile except `desktop`, so an isolated `DSH_HOME` and a throwaway profile
reproduce the whole delivered composition without touching user state. All five checks ran there, and
every answer is now in `spec.md` §16 with its raw observation.

The two checks that could have changed the package shape both came back **positive**:
§16.6 (`ctx.typert.register()` **is** reachable from a bundle — §6 stands, no loader route) and §16.7
(the carrier's kind is **`'cordis-host-runner'`** — no consumer gates on it, and a live write kept the
round structure intact). §16.4 and §16.5 had already been answered by reading the installed bundle.

**Two answers contradicted the spec; both are now resolved and folded back into it.**
[§4.2's log-route preference order](issues/21-live-log-route-order.md) — reversed, with each route given
one job — and [§5.5/§9.4's resend observability](issues/22-followup-returns-void.md) — wording fixed,
scope kept. A third finding (`foldSurfaceProjection` was not exported, so §13.1 #4 could not have been
implemented as written) was recorded in §16.3 and the criterion rewritten against
`sessionProjections.stateOf`.

## The frontier is empty

Every ticket is resolved or closed, and the spec has no open verification item, no TODO, and no
section pointing at an unresolved decision. `spec.md` is implementation-ready: the two contradictions
surfaced by the verification run have been reconciled in the sections that own them, and the three
findings that changed the document (`typert` must be injected; the log-route order; `followup` returns
void) are all recorded with their evidence.

The next action is **implementation**, which the map's Destination deliberately excludes from this
effort's scope.

## Out of scope

- Implementation code of any kind.
- `dsh-retrace`'s parallel systems **other than file rollback**: recall/withdraw (declined explicitly),
  the version timeline and message versioning, LLM summarisation of replaced content, badges and audit
  context rows, the `retrace` CLI, and offline session repair.
- Editing assistant replies; deleting a message as a standalone arbitrary operation (deleting *the
  message a rewind replaces* is in scope); the shipped "branch" affordance.
- The ">40 % of the conversation" hide safety valve, declined — the resulting risk is recorded instead.
- **Diagnosing `dsh-retrace`'s own defect.** The user ruled this out: *"别管 retrace 了，按已知事实写
  spec"*. Closed ticket: [Restore the mount and observe the actual symptom](issues/17-restore-mount-and-observe.md).
  Out of scope because the destination is a spec for a **new** plugin, which can avoid retrace's failure
  modes by construction. Two by-products are kept as normative spec requirements: a green boot is not
  evidence that a row renders, and the plugin must tolerate a double mount or fail loudly.
- The phase-2 ambition of making the shipped user bubble itself become the editor (option (d) of ticket
  10), which depended on [Can the shipped `user` chat-node renderer be overridden…](issues/01-slot-key-user-override.md).
  Recorded as a future possibility only. **Closed, ticket 01** — the (a3) design renders a new node kind
  beneath the message and never contends for the shipped `user` key; one by-product is kept: node-level
  `visibility:'hidden'` cannot hide another Definition's row, so phase 2 would have to re-author the
  bubble, not hide it.
- **Whether the `compaction/prune` audit claim is required.** **Closed, ticket 02** — superseded by
  [Audit claim + carrier pair, or a lone surface replace?](issues/09-audit-pair-or-lone-replace.md),
  which adopted the two-event pair as normative regardless. What the answer would have changed is
  documentation only: retrace warns that writing a node count instead of a token price makes
  `surfaceTokens` overestimate and triggers compaction early.