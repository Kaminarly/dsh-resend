# DSH conversation UI and message/session data model

Fact-finding for a plugin adding **(a) edit-and-resend on user messages** and **(b) regenerate on assistant replies**.

Primary source is the shipped app at `D:\DSH Desktop\resources\app\` (`dsh-plugin-desktop` v2.0.15, `@deepseek-ai/dsh*` v0.1.7-rc.2), which is the ground truth for what runs on this machine. Public TypeScript source at `deepseek-ai/deepseek-harness` (branch `master`) is used to confirm semantics and provide readable declarations; it is a **newer/parallel build** than the shipped rc.2, so where the two differ the shipped bundle wins and the difference is noted.

Legend: **[V]** verified from shipped code · **[P]** verified from public repo source · **[D]** public docs · **[I]** inferred.

---

## Summary (blunt)

**Can an external plugin add UI to DSH Desktop's conversation view today? Yes — and this is the officially supported path, not a hack.**

- DSH's client UI is **React 18** rendered through a **slot registry** (`ctx.slots.register` / `renderSlot`), and third-party plugins contribute React components into declared slots. The shipped app loads client plugins over `window.__ModuleLoader__.load({ id, factory })`. **[V]**
- The **assistant** message action row has an open extension slot: **`conversation.chat.assistant-actions`** (`kind: 'list'`, `scope: 'session'`, owner `{ messageId }`). A plugin can add a "Regenerate" button there. **[V]**
- The **user** message action row has **no slot**. `UserMessageNodeView` builds its own `MessageIconActions` with no `extraActions` hook, whereas the assistant `TurnTailNodeView` passes one. There is also no `conversation.chat.user-actions` key. So **edit-and-resend has no supported injection point on the user bubble** — it needs either a new upstream slot, or an unsupported route (a `keyed` `conversation.chat.node` renderer replacing `key: 'user'`, or DOM injection). **[V]**
- The client ships as **bundled but *not* minified** JavaScript (rolldown, original identifiers and JSDoc comments preserved), plus a full `lib/main.js.map` source map for the Electron main process. It is **not sealed in the "unreadable" sense** — but it is also **not something you patch in place**: extension happens by registering into slots from a plugin package, not by editing the shipped bundles. **[V]**
- **History is a linear, append-only event log — with real branching available via fork.** A conversation is one monotone `seq`-numbered `SessionEvent[]`; there is **no message-parent/child pointer and no per-message tree**. **"Edit and resend" therefore cannot branch in place.** However DSH already has a first-class **`sessions.fork({ sessionId, atSeq })`** that copies an inclusive event prefix into a *new child session* and balances an open turn with synthetic closers — and the UI already exposes it as the per-message **"Branch"** button. **[V]**
- **Recommendation:** model "edit and resend" as **fork-at-the-user-message + send the edited text in the child**, and "regenerate" as **fork at the assistant message's turn boundary + re-prompt in the child** (or the simpler near-term option: fork + auto-send). Neither feature can mutate the existing session, and no API exists to do so. **[I]**
- **No "regenerate"/"retry"/"resend" concept exists anywhere in the codebase** for assistant replies. The only `retry` is `@deepseek-ai/dsh-llm-retry`, an *automatic provider-request* retry at the agent step boundary — unrelated to a user-invoked regenerate. **[V]**

---

## A. The rendering surface

### Framework and ownership

React 18 (`react@18.3.1` is a direct dependency of the desktop shell — `D:\DSH Desktop\resources\app\package.json:285`). The conversation is rendered by several first-party client plugin packages, declared as bundle inputs in the shell's `dsh.client.inject` list — `D:\DSH Desktop\resources\app\package.json:101-113`, notably:

- `@deepseek-ai/dsh-client-ui-conversation` — conversation shell, header, composer (`package.json:156`)
- `@deepseek-ai/dsh-client-ui-chat` — the transcript/chat target (`package.json:154`)
- `@deepseek-ai/dsh-client-ui-slots` — the slot registry (`package.json:167`)
- `@deepseek-ai/dsh-client-ui-renderer` — mounts slots into React (`package.json:163`)

### Where the message list lives

There is no `node_modules/**/src` for first-party packages; each ships one bundle. The transcript lives in **`D:\DSH Desktop\resources\app\node_modules\@deepseek-ai\dsh-client-ui-chat\lib\client.js`** (12,420 lines):

- `ChatNodeSeat` — per-node seat, line 1668
- `ChatView` — the transcript view, line 5043; `loadOlder`/`loadThrough`/`forkAt` wired at 12352-12372
- The transcript is a list of **keyed `ChatNode` renderers** dispatched through the slot `conversation.chat.node` (`renderSlot` call at line 1770).
- The conversation shell is in `...\dsh-client-ui-conversation\lib\client.js`: `main.conversation` root registered at line 18068-18075, `renderSlot("main.conversation")` at 16277.

### Shipped form: bundled, *not* minified

Every first-party client package's `lib/client.js` begins with a module-loader registration and keeps original names and JSDoc:

```
window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-conversation",
	factory: (require) => {
```
— `D:\DSH Desktop\resources\app\node_modules\@deepseek-ai\dsh-client-ui-conversation\lib\client.js:1-4`

Region markers preserve the original source path, e.g. `//#region lib/types/client/chat/MessageIconActions.js` at `...dsh-client-ui-chat\lib\client.js:1121`. So type information is stripped but structure is legible. **[V]**

- **No `.d.ts` and no `.map` files ship inside the `@deepseek-ai/dsh-client-ui-*` packages** (verified by recursive enumeration: only `dsh-session-telemetry-otel` and cordis-family packages carry maps; zero client UI packages carry `.d.ts`). **[V]**
- The Electron **main** process does ship a full source map: `D:\DSH Desktop\resources\app\lib\main.js.map` (399,981 bytes). **[V]**
- The **web shell** is a built Vite app: `...\@deepseek-ai\dsh-web-frontend\dist\index.html` plus `dist\assets\index-Q6zc2uHV.js` (614.5 KB) and `dist\assets\vendor-CCJJTK99.js` (723.2 KB). **[V]**

### Can it be extended from outside? Yes — via slots

The extension mechanism is the slot registry, `@deepseek-ai/dsh-client-ui-slots`. A plugin declares/consumes slots and registers React components. Declared kinds: `single`, `list`, `keyed`, `chain` (`dsh-client-ui-slots\lib\index.js`; README `README.zh.md`). Registrations happen with `ctx.slots.register(...)` / `ctx.slots.registerFactory(...)` and are rendered with `renderSlot(name, ownerProps)`.

**Proof by existence:** the machine already runs third-party plugins that inject React UI, with full TypeScript source shipped:

- `C:\Users\Administrator\.dsh\profiles\desktop\node_modules\dsh-better-sidebar\src\client\index.tsx` (20.8 KB) and ~90 `.tsx` components
- `...\dsh-better-sidebar\package.json:47-56` declares the client entry:
  ```json
  "client": {
    "inject": ["@deepseek-ai/dsh-client-locale", "@deepseek-ai/dsh-client-ui-slots",
               "@deepseek-ai/dsh-client-ui-conversation", "@deepseek-ai/dsh-client-ui-sidebar-right",
               "@deepseek-ai/dsh-client-modules"],
    "platform": "web"
  }
  ```
  — the same `dsh.client.inject` contract the first-party packages use.
- Installed profile bundles: `C:\Users\Administrator\.dsh\profiles\desktop\package.json:14-25` (`dsh-better-sidebar`, `dsh-retrace`, `@kenz1117/dsh-ui-usage-billing`, …).

**[V]** Conclusion: the surface is **extensible but not patchable**. Do not edit shipped bundles; ship a plugin that registers components.

---

## B. The message data model

Types were stripped from the shipped bundles, but the wire `.d.ts` declarations are embedded verbatim as `declaration` strings in the Session Controller's typert host module. Extract source: **`D:\DSH Desktop\resources\app\node_modules\@deepseek-ai\dsh-api-session-controller\lib\typert.host.js`**, `"declaration"` properties (359 of them), e.g. `SessionEventMap` at line 1993 and again at 2728. A flattened extraction created during this research is at `.scratch/dsh-resend-plugin/research/_declarations.txt` (line numbers there are *extraction* lines, not source lines; the `=== line N ===` markers give the true `typert.host.js` line).

### Message

```
interface MessageBase {
    readonly id: MessageId;
    readonly content: readonly ContentBlock[];
    readonly source: MessageSource;
}
interface UserMessage extends MessageBase { readonly role: 'user'; }
interface AssistantMessage extends MessageBase { readonly role: 'assistant'; readonly source: ModelMessageSource; }
interface SystemMessage extends MessageBase { readonly role: 'system'; readonly source: MessageSourceMap['system-prompt']; }
interface DeveloperMessage extends MessageBase { readonly role: 'developer'; }
interface ToolResultMessage extends MessageBase {
    readonly role: 'tool';
    readonly source: ToolMessageSource;
    readonly toolCallId: ToolCallId;
    readonly isError?: boolean;
}
type Message = MessageRoleMap[keyof MessageRoleMap];
type MessageId = Branded<'MessageId'>;
```
— `typert.host.js:2380` (AssistantMessage), `:2868` (ToolResultMessage), `:2816` (SystemMessage), `:2911`/`:2915` (brands), `:1737-1776` region. **Roles are exactly `system | developer | user | assistant | tool`** — there is no separate "tool" content role; tool output is a `tool`-role message. **[V]**

- **Identity:** `Message.id` is a fresh `randomUUID()`, deep-frozen at construction — `...\@deepseek-ai\dsh-llm\lib\types\message.js:34-39`. **[V]**
- Message **content is a list of blocks**, not a string: `ContentBlockMap` = `text | reasoning | image | file | 'tool-call' | 'tool-addition' | 'tool-removal'` (`typert.host.js:1553-1561`). `TextBlock` = `{ type: 'text'; text: string }` (`:2828`). **[V]**
- **Sources** are a tagged union (`MessageSourceMap`, `typert.host.js:1777-1795`): `user`, `model`, `tool`, `system-prompt`, `user-rpc`, `agent-message`, `subagent-settled`, `skill-invocation`, `goal`, `schedule`, `model-selection`, `user-approval`, `ptc-mode`, `tool-registry`, plus a `ContextFormed` mixin (`instructions|catalog|snapshot|notice|relay|recall`). Note `'user-rpc': { kind: 'user'; rpcId: SessionRequestId; clientTimeZone?: string }` — the same `kind: 'user'` as a typed prompt, discriminated by the map key. **[V]**
- **The user message event payload is the `UserMessage` itself, not a wrapper:** `'user/message': UserMessage` (`typert.host.js:1617`), whereas assistant/system/developer/tool results are wrapped as `{ turn, step, message }` (`:1618-1623`). **[V]**

### Session / event envelope

```
type SessionEvent<T extends SessionEventType = SessionEventType> =
  { [K in SessionEventType]: { type: K; seq: SessionSeq; time: number; data: SessionEventMap[K]; ignorable?: true; }
    & (K extends SurfaceEventType ? SurfaceIntent<K> : { surfaceOp?: never; sourceEventSeqs?: never; }) }[T];

export type SurfaceEventType = 'system/message' | 'developer/message' | 'user/message' | 'assistant/message' | 'tool/result';
export type SurfaceOp = 'append' | { op: 'replace'; startSeq: SessionSeq; endSeq: SessionSeq; };
export type SurfaceIntent<T extends SurfaceEventType = SurfaceEventType> =
  { surfaceOp: SurfaceOp } & (T extends 'assistant/message' ? { sourceEventSeqs?: never; } : { sourceEventSeqs?: SessionSeq[]; });

export interface SessionHeader {
    readonly version: typeof SESSION_FORMAT_VERSION;
    readonly id: SessionId;
    readonly createdAt: number;
    readonly cwd?: string;
    readonly parentSession?: SessionId;
    readonly isSeeded: boolean;
    readonly origin?: 'subagent';
    readonly delegationDepth?: number;
    readonly agentPreset?: string;
}
```
— `typert.host.js:2724` (SessionEvent), `:2804` (SurfaceEventType), `:2812` (SurfaceOp), `:2808` (SurfaceIntent), `:2736` (SessionHeader). **[V]**

- **Ordering metadata is `seq`, a dense zero-based monotone integer** branded `SessionSeq`; `SessionSeq = BrandedNumber<'SessionSeq'>` (`typert.host.js:2756`). `time` is a `number` (epoch ms). **[V]**
- **There is no `parentMessageId` / `parentId` field on any message or event.** The only parent link is `SessionHeader.parentSession` (session → session), used for subagents and forks. **[V]**
- **`surfaceOp` is the interesting mechanism for this project.** It has exactly two variants: `'append'`, and `{ op: 'replace'; startSeq; endSeq }` — an inclusive seq range of *earlier* events to shadow. Validation: `...\@deepseek-ai\dsh-session\lib\types\surface.js:196-234` (`isReplaceOp`, `surfaceOpOf`); `startSeq`/`endSeq` "must reference earlier events" at `:305-310`; replacement range must exist and be ordered at `:316-327`; and every shadowed node must be cited in `sourceEventSeqs` at `:236-269`. **[V]**
- **`SessionEventMap` (the full event vocabulary)** — `typert.host.js:1612-1653`, 40+ entries including `turn/start`, `turn/end` (with `TurnEndReason`), `step/start`, `step/end`, `user/message`, `assistant/message`, `assistant/attempt`, `tool/call`, `tool/result`, `request/header`, `agent/inbox/spliced`, `feedback/message-put`, `feedback/message-delete`, `compaction/*`, `session/end-seed`. The cross-package registry is `KNOWN_SESSION_EVENT_TYPES` at `...\@deepseek-ai\dsh-session\lib\types\known-event-types.js:21-81` (52 entries). **[V]**
- `Session` service class declaration (the host-side object): `typert.host.js:1917` region — `append(type, data, opts?)`, `deriveMessages()`, `deriveEventMessage(event)`, `seq`, `eventAt(seq)`, `snapshotEvents(from, to)`, `isOwnSeq(seq)`, `inheritedEventCount`, `firstLiveSeq`, `surface`. **[V]**
- `SESSION_FORMAT_VERSION = 4` — `...\dsh-session\lib\types\types.js:54`. **[V]**

### The model-visible surface vs. the human transcript

This distinction matters for the feature. `deriveMessages()` projects the log to what the model sees, and a `replace` shadows its range there. The **human transcript deliberately reads append-origin events only**:

> "The model-visible surface deliberately shadows replaced ranges, so it is the wrong source for a human transcript — a landed replacement would erase conversation the user already saw. Append-origin events are that transcript's durable source material; replacement copies stay model-only."
— `...\dsh-session\lib\types\surface.js:39-52` (`isAppendSurfaceEvent`) **[V]**

So a `replace` is **not** a way to rewrite what the user sees.

---

## C. Persistence & history

### Where sessions live

JSONL, one file per session, under a readable project directory. Actual files on this machine:

```
C:\Users\Administrator\.dsh\sessions\--D-Code-MJ-Project-dsh-resend-2--\<session-uuid>\session.v4.jsonl.zstd
C:\Users\Administrator\.dsh\sessions\--D-Code-MJ-Project-dsh-resend--\session-295ff03d-...\session.v4.jsonl.zstd
```
— observed by enumeration of `C:\Users\Administrator\.dsh\sessions\`. The directory `--D-Code-MJ-Project-dsh-resend-2--` is this session's workspace; the live file for **this very session** is `C:\Users\Administrator\.dsh\sessions\--D-Code-MJ-Project-dsh-resend-2--\session-64c4e9e1-cdd5-4212-b6a2-baca33704901\session.v4.jsonl.zstd` (153.9 KB, mtime 2026/9/28 15:27:50). **[V]**

Layout is documented at `...\dsh-session-persistence-jsonl\README.zh.md:56-72`:

```
<root>/
  --<normalized-cwd>--/          # readable project directory (or _no-cwd/)
    <encoded-id>/                # session-owned directory
      session.jsonl.zstd         # released v0, compressed root
      session.v1.jsonl.zstd      # released v1
      session.v2.jsonl.zstd      # released v2
      session.v3.jsonl.zstd      # released v3/current
      session.jsonl              # released v0, raw root
      ...
```
**[D]** — confirmed against disk layout above. Note the doc says "v3/current" while the shipped `SESSION_FORMAT_VERSION` is **4** and the observed filenames are `session.v4.jsonl.zstd`; the doc lags the build. Trust the filename/constant. **[V]**

- Encoding: default `compression: 'zstd'` (checksummed Zstandard frames), or `'none'` for newline-delimited UTF-8 that external readers can consume — `README.zh.md:45-48`. **Compressed files cannot be read line-by-line; use the backend or reconfigure a new root with `'none'`** (`README.zh.md:162`). **[D]**
- Physical record form: **one JSON line per persisted event**, header line first; `sourceEventSeqs` uses a lossless storage form where runs of ≥3 seqs become `[start, end]` pairs and are expanded on read — `README.zh.md:104`. **[D]**
- `root` is required config with no default, mounted via profile YAML (`dsh-session` + `dsh-session-persistence-jsonl` with `config.root`) — `README.zh.md:36-48`. Here the root resolves under `~/.dsh`.
- **There is no delete API for session files** — `README.zh.md:163`. **[D]**
- Separate SQLite package `dsh-session-query-sqlite` exists but is a *query/index* layer, not the session store; the JSONL backend is "the only first-party session persistence provider" (`README.zh.md:32`). **[D]**

### Linear or branching? — **Linear log, explicit fork for branching**

**The decisive statements:**

1. Model: append-only event log with **synthetic closers** and an inherited prefix; child gets a **copy** of the parent's prefix, not a pointer.
   > "Copy an inclusive event prefix, mark its inherited cut, and close its open tail with forked results and step/turn endings."
   — `...\dsh-session\lib\types\fork.js:7-27` (`buildForkSeed(events, boundary)`; slices `events.slice(0, boundary + 1)`, pushes `session/end-seed`, then `openTurnClosers(prefix, { kind: 'forked' })`) **[V]**

2. Public README, "Known limitations":
   > **"fork 之外没有会话树"** — "no session tree beyond fork": pi-style entry trees based on branched sessions are deferred unless a consumer needs capability beyond boundary-based forking.
   — `...\dsh-session\README.zh.md:192` **[D]**

3. Fork API surface (client):
   ```
   Fork a session from an exact inclusive prefix of the source ... the optional exact inclusive
   boundary seq (a real event seq the caller already knows; a cut inside an open turn is balanced
   Host-side with synthetic closers, and omission selects the latest completed-turn prefix)
   ```
   — `...\dsh-api-session-controller\lib\types\client\sessions\service.js:326-357` **[V]**

4. Service-level fork: `ctx.sessions.fork(source, boundary?, childSessionId?)`, `fork()` copies the exact inclusive prefix (default: last event), `inheritedEventCount` counts only the copied prefix; `SessionHeader.isSeeded` reports fork history — `...\dsh-session\README.zh.md:66-70`. **[D]**
   Constraint: "Store API only accepts live source sessions ... Fork only closes open tails, it does not repair missing results in already-closed steps" — `README.zh.md:189`. **[D]**

**Therefore:** one message has exactly **one** successor in a given session log. Multiple alternatives exist only as **multiple sessions** sharing an event prefix. `replace` (`surfaceOp`) can shadow a range *for the model* but never creates an alternative transcript — and the human transcript ignores it (`surface.js:39-52`). **[V]**

### Existing notion of alternatives / variants / re-runs

- **No "variant" / "alternative" / "regenerate" concept.** Exhaustive grep for `regenerat|re-generate|rerun|re-run|editAndResend|resend|editMessage` across all of `node_modules\@deepseek-ai` returns only unrelated hits: codegen instructions ("run `pnpm run gen-*` to regenerate"), Excel's `regeneratorRuntime`, an in-flight-read `rerun` flag in settings loaders, and tool-hint prose. No feature surface. **[V]**
- The nearest real concepts are: **fork** (above), **compaction** (`compaction/start|summary|end|prune`, which shadow ranges without deleting them, `README.zh.md:12`), and **`agent/inbox/spliced`** (`{ target, start, removedCount?, inserted: UserMessage[], outcome? }` — `typert.host.js:1627`), which splices *pending queued* user messages in the agent inbox, i.e. before they become durable history. **[V]**
- **`assistant/attempt`** records a failed/retried/cancelled model attempt *without* adding model history — `README.zh.md:88`. This is the log's existing "a turn was tried more than once" record, but it is diagnostic only. **[D]**

---

## D. Existing affordances

### Per-message actions today — exactly two: **Copy** and **Branch**

`MessageIconActions` is the shared action row — `...\dsh-client-ui-chat\lib\client.js:1122-1200`. Its own doc comment: *"Copy / branch (/ clock) IconActions row shared by user and assistant chrome."* (`:1123`). Props: `{ text, time, clock, onBranch, branchUnavailable, className, extraActions, usageAction, t }` (`:1127`).

- **Copy** button — `:1163-1173`, uses `writeClipboard(text)` from `dsh-client-ui-primitives`.
- **Branch** button — `:1175-1188`, `IconBranchOutlineRegular`, disabled when unavailable; label `t("message.branchUnavailable")`.
- **`extraActions`** — inserted between Copy and Branch at `:1174`. This is the extension point.
- Tooltip strings: `"message.branchUnavailable": "Available only on the last message of a completed turn"` — `:5606` (en) / `:5417` (zh). **Branching is restricted to the last message of a completed turn.** **[V]**

**No delete, no edit, no retry/regenerate, no fork-per-user-message** exists in the UI. **[V]**

**Asymmetry (critical for this project):**

- **Assistant** row is slot-extensible. `TurnTailNodeView` (`:6499`) computes `messageId = closing.finalNode.messageId` (`:6522`), renders `assistantActions = renderSlot("conversation.chat.assistant-actions", { messageId })` (`:6523`), and passes it as `extraActions` (`:6537`). Its `onBranch` calls `forkAt(data.seq)` (`:6532-6534`) with `branchUnavailable: data.branchUnavailable || hasLaterChatNode` (`:6535`).
- **User** row is **not** slot-extensible. `UserMessageNodeView` (`:1453-1473`) builds `MessageIconActions` with only `{ text, time, clock, className, t }` — **no `onBranch`, no `extraActions`** (`:1465-1471`). Same for the pending/steering bubbles (`:1405-1410`, `:1443-1449`). And the declared `SlotMap` has **no user-action key**: the `ui-chat` contract declares only `conversation.chat.node`, `conversation.message.images`, `conversation.chat.commandview`, `conversation.chat.turnTail`, `conversation.chat.assistant-actions`, `shell.quota-notice` (`packages/client/ui-chat/src/client/contract/slots.ts`, `interface SlotMap` region) **[P]**; the `ui-conversation` contract's `SlotMap` has no per-message key at all (`packages/client/ui-conversation/src/client/contract/slots.ts`) **[P]**. The bundle's own registrations confirm the same set: `children: { "conversation.chat.turnTail": {kind:'list'}, "conversation.chat.assistant-actions": {kind:'list'} }` — `client.js:6786-6795`. **[V]**

Fallback hooks for the user bubble if a slot is refused:
- **`conversation.chat.node` is `keyed` by `ChatNodeKind`**, and *"Reusing a key replaces that node renderer"* (`ui-chat/.../slots.ts`, `SlotMap` doc). Replacing key `user` would let a plugin own the user bubble entirely — but that means reimplementing the shipped bubble. **[P]**
- DOM hook: the seat sets `data-chat-flow-kind: routedNode.kind` (`client.js:1765`) and the user node kind is `"user"` (`client.js:9227`), so `[data-chat-flow-kind="user"]` is a stable-ish selector. **[V]** (an unsupported route)

### Working template to copy: `dsh-client-ui-message-feedback`

The thumbs-up/down feature is a **first-party plugin that already does exactly what "Regenerate" needs** — it registers one entry into `conversation.chat.assistant-actions`, keyed by `messageId`, with per-session lazy state:

```js
ctx.slots.inject("conversation.chat.assistant-actions", () => ctx.slots.register({
    name: "conversation.chat.assistant-actions",
    id: "feedback",
    order: 10,
    locale: NS,
    inject: (sessionId) => {
        const { feedback, dialog } = surfaceFor(sessionId);
        return {
            hooks: { feedback },
            ensure: () => feedback.ensure(),
            current: (messageId) => feedback.getSnapshot().items.get(messageId),
            retract: (messageId, rating) => feedback.retract(messageId, rating),
            openDialog: (messageId, rating) => { dialog.open({ kind: "message", messageId, rating }); },
        };
    },
}, MessageFeedbackActions));
```
— `D:\DSH Desktop\resources\app\node_modules\@deepseek-ai\dsh-client-ui-message-feedback\lib\client.js:815-836` **[V]**

Note the pattern: `id` + `order` for list placement, `inject(sessionId)` for per-session state, and the component reads its own `messageId` from the owner props. A "Regenerate" action is a near-identical registration. (The same file also registers a dialog into `conversation.input.overlay` at `:837-844`, if a confirmation UI is wanted.)

### Search for retry / regenerate / resend

- **No client-side regenerate/retry/resend action exists.** Only Copy + Branch, above. **[V]**
- `@deepseek-ai/dsh-llm-retry` **is not this feature.** It is an *automatic* executor that retries failed provider requests at a persistent agent step boundary, with bounded `normal` or unbounded `always` modes chosen by each provider's `retryPolicy`; it re-runs the failed step **within the same open turn**, and a direct `ctx.llm.stream()` call still attempts only once — `...\dsh-llm-retry\README.zh.md:2` (frontmatter `description:`) and `:12` (原文: *"重试会在同一个打开的轮次内重跑失败步骤，而直接 `ctx.llm.stream()` 调用仍只尝试一次"*). It emits `llm/retry` and `llm/retry-started` events (`known-event-types.js:44-45`). **[V]**
- Server-side, no regenerate endpoint. The conversation face (`IConversation`) exposes exactly: `send(text)`, `updateQueue(itemId, action)`, `cancel()`, `loadOlder()` — `packages/client/ui-conversation/src/client/service.ts`, `interface IConversation` region **[P]**, matching the shipped implementation (`...\dsh-client-ui-conversation\lib\client.js`, `ConversationController`). **[V]**

### How the client sends a new user message

```
/**
 * The outward conversation face (`ctx.conversation`) ...
 */
export interface IConversation {
  readonly input: SessionInputResolver
  readonly blocks: ComposerBlocks
  /** Send a prompt into the caller scope's session (queued turn).
   *  @param text - prompt text, sent verbatim as one text block. */
  send(text: string): Promise<void>
  updateQueue(itemId: MessageId, action: QueueAction): Promise<void>
  cancel(): Promise<void>
  loadOlder(): Promise<void>
}
```
— `packages/client/ui-conversation/src/client/service.ts`, `interface IConversation` **[P]**

Implementation (shipped):
```js
async send(text) {
  const session = this.scopedSession('send');
  const result = await session.prompt([{ type: 'text', text }], 'queue');
  ...
}
```
— `...\dsh-client-ui-conversation\lib\client.js`, `ConversationController.send` (the `send`/`sendSession` methods) **[V]**; public equivalent `async send(text: string)` in `service.ts` calls `session.prompt([{ type: 'text', text }], 'queue')`. **[P]**

**Path, end to end:**
1. Composer submit → input machine `submit(mode = "queue")` (`...\dsh-client-ui-conversation\lib\client.js:13625`), which runs a submit transaction and calls `claim.submit(args, this.deps.actx, attachments)` (`:14073-14084`).
2. `ConversationController.sendSession(session, text, attachmentIds, mode, signal)` — builds `content` as `[...uploaded, ...(text === '' ? [] : [{ type: 'text', text }])]` and calls `session.prompt(content, mode, signal, submission.requestId)`. **[P]/[V]**
3. Transport is a **Remote/RPC service**, not HTTP or an Electron IPC channel from the client's perspective: `@deepseek-ai/dsh-typert-protocol` `Remote`/`TypertRemoteService`, e.g. the file-reference adapter `SessionFileReferences.list(agent, query, signal)` decorated `@Remote` with namespace `fileReferences` — `...\dsh-api-session-controller\lib\types\file-references.js:36-68`. The same carrier in the shipped bundle appears as `ctx.remote.session.fork(...)` (`...\dsh-api-session-controller\lib\types\client\sessions\manager.js:462`) and `ctx.remote.fileReferences.list(...)` (`...\dsh-client-ui-reference\lib\client.js:172`). **[V]**
4. Payload shape for a prompt: an array of content blocks, text as `{ type: 'text', text }`, images as `{ type: 'image', mediaType, data, name? }`, files as `{ type: 'file', receiptId }` (see `sendSession`). **[P]**
5. Server side writes `session.append('user/message', <UserMessage>, { surfaceOp: 'append' })`, per the documented usage — `...\dsh-session\README.zh.md:45-47`. **[D]**

### Can a caller re-run a turn with a modified preceding user message?

**Not by mutation. Only by forking.**

- **No truncate/delete/rewrite-history API exists.** Enumerating every mutating session operation: `Session.append` (append-only), `sessions.create`, `sessions.fork`, `sessions.flush`. The persistence README states "**committed events are never rewritten**" (`...\dsh-session-persistence-jsonl\README.zh.md:76`) and there is no delete interface (`:163`). **[D]**
- The one *edit-like* verb is on the **pending queue**, not history: `conversation.updateQueue(itemId, action)` with `QueueAction` edit/remove/steer, applied to "one pending queue occurrence" (agent-owned inbox identity) — `service.ts` `IConversation.updateQueue`. It fails with `session/queue-item-not-found` once the item is no longer pending (`service.ts` `updateQueue` implementation). **[P]** This is why `agent/inbox/spliced` exists in the event map. **[V]**
- **The supported "re-run with a modified preceding user message" is:**
  ```
  fork({ sessionId, atSeq })  →  childId
  openSession(childId)        →  child becomes the active conversation
  child.prompt([{type:'text', text: editedText}], 'queue')
  ```
  `fork` items: `ctx.sessions.fork({ sessionId, atSeq, increaseTitle })` then `ctx.uiWorkspace.openSession(childId)` — `...\dsh-client-ui-chat\lib\client.js:12364-12372`; client service `fork(opts)` — `...\dsh-api-session-controller\lib\types\client\sessions\service.js:339-357`; error type `SessionForkError` (`:22-32`); child title auto-increments (`:56-61`, `increasedForkTitle`). **[V]**
- **Caveats to design around:** (a) a cut inside an open turn is auto-balanced Host-side with synthetic closers (`service.js:330-333`) — for "edit and resend" cut at the **user message's own seq − 1** so the edited prompt replaces it cleanly; (b) `forkAt` is UI-disabled unless the target is the last message of a completed turn (`client.js:6535` + `branchUnavailable` semantics), but the **service-level `fork` has no such restriction** — the restriction is a UI policy, not an API limit; (c) forking requires the **source session to be live** (`dsh-session\README.zh.md:189`). **[V]/[D]**
- To find the right `atSeq`: message-producing events carry their own `seq`; the client already reads `closing.finalNode.seq` and `anchorSeq` (`client.js:6502`, `:6514`). A plugin can obtain a `user/message` event's seq from the followed history stream (`SessionHistoryController.follow`, `...\dsh-api-session-controller\lib\types\history.js:139-269`) or `session.loadThrough(seq)` (`client.js:12355`). **[V]**

---

## E. Composer / code-block / file-reference / skill affordances

**Yes, all three exist, and the reference/skill machinery is a public, extensible registry.**

### Trigger characters

`@deepseek-ai/dsh-client-ui-input-trigger` package description: *"Input trigger pipeline: '/' and '@' detection, candidate menu, pick routing to registered sources"* (`...\dsh-client-ui-input-trigger\package.json:3`). **[V]**

Registered sources in this build:

| Trigger | Source name | Package / line | Precedence |
|---|---|---|---|
| `@` | `reference` (files + sessions) | `...\dsh-client-ui-reference\lib\client.js:160` | — |
| `@` | bare-mention grammar | `...\dsh-client-ui-conversation\lib\client.js:12679` | — |
| `/` | `command` | `...\dsh-client-ui-commands\lib\client.js:756` | — |
| `/` | `skill` | `...\dsh-client-ui-skill\lib\client.js:369` | `order: 2` (`:371`) |

Word-boundary rule: a trigger char opens only at start-of-draft, after whitespace, or after certain punctuation, so `@` inside an email does not trigger — `...\dsh-client-ui-input-trigger\lib\client.js:78-166`. **[V]**

### Exact syntactic markers (`@` file grammar)

Mirrored host grammar `formatFileMention` in `@deepseek-ai/dsh-file-reference`:
- plain `@path/to/file.ts` when the path has no whitespace
- quoted `@"path with spaces/file.ts"` when it does
- `undefined` (unrepresentable) if the path contains a control character or a double quote
- a **directory** uses the trailing slash as plain text (`@dir/`) so completion can descend; a **file** becomes a structured chip

— `C:\Users\Administrator\.dsh\profiles\desktop\node_modules\dsh-better-sidebar\src\client\conversation-draft.ts:197-212` (`fileMention`), quoted from the host grammar. **[V]**

### How a reference is represented in message content

Two layers:

1. **In the draft**, a reference is a **structured chip** (Lexical editor node), inserted via a session-scoped event, not plain text:
   ```
   actx.emit('slash/input-insert-reference', {
     reference: { source: 'reference', ref: '@rel/path.ts', label: 'path.ts',
                  appearance: 'file', clipboardText: '@rel/path.ts' },
     span: { draftRev, start: draft.length, end: draft.length },
   })
   ```
   — `...dsh-better-sidebar\src\client\conversation-draft.ts:223-251` (`insertFileReference`). Handler registration on the DSH side: `actx.on("slash/input-insert-reference", (req) => shell.insertReference(req.reference, req.span) ? true : void 0)` — `...\dsh-client-ui-conversation\lib\client.js:14200`. Sibling events: `slash/input-begin-command` (`:14199`), `slash/input-consume-token` (`:14201`), `slash/input-insert-text` (`:14202`). **[V]**
   The chip **displays `@<basename>` but serializes to `@<relative path>` on send** — same file, doc at `:215-222`. `appearance` values seen: `'file'`, `'folder'`, `'session'` (`...\dsh-client-ui-reference\lib\client.js:209-218`).
2. **On send**, the serializer resolves references to text through the registered source: `inputTriggers.serializeReference(o.source, o.ref, attempt.signal)` — `...\dsh-client-ui-conversation\lib\client.js:13951-13957`. For `@` references the codec is identity: `codec: { clipboardText: (ref) => ref, serialize: (ref) => Promise.resolve(ref) }` — `...\dsh-client-ui-reference\lib\client.js:228-231`. So a file reference reaches the model as **plain text `@relative/path.ts`** inside the message's `content` text block. **[V]**
3. **Skills** are the same mechanism with a different trigger: `onPick` returns `{ text: '/<skill-name> ' }` — `...\dsh-client-ui-skill\lib\client.js:417-419`; the skill's candidate list comes from `fetchCatalog(sessionId)` (Remote `skillCatalog`, `...\dsh-api-session-controller\lib\types\skill-catalog.js`), and `openReference` opens the skill's `SKILL.md` in the sidebar (`:398-416`). The log records a `'skill-invocation'` message source: `SkillInvocationSource { kind: 'skill-invocation'; name; form: 'instructions' }` (`typert.host.js:2800-2809`). **[V]**
4. **Slash commands** are `/{name}`; `command/run` and `command/done` events record the run (`typert.host.js:1635-1636`). **[V]**

### Code block / quoting

There is **no code-quote trigger character**. The established pattern (from the sidebar plugin, agreed with the product owner) is to insert a **fenced code block whose info line is `relativePath:startLine[-endLine]`**:

```
```path/to/file.ts:12-15
<selected text>
```
```
- header format `rel[:start[-end]]` and the fenced payload builder: `...\dsh-better-sidebar\src\client\selection-payload.ts:36-41` (`headerOf`) and `:48-57` (`buildSelectionInsert`, `SELECTION_LIMIT = 500`); over the limit only the path line is inserted (`:55`). **[V]**
- The ` ```lang ` info line convention is also what the transcript renders as a code block with a banner (`data-code-block-banner` in the chat CSS, `...\dsh-client-ui-chat\lib\client.js:1103`). **[V]**

### Composer/plugin API for the edit box (the important part for the target feature)

Resolved lazily through `ctx.get('conversation')`, scoped per session:
```ts
export interface SidebarSessionInput {
  state: { getSnapshot(): { draft: string; draftRev?: number } }
  setDraft(text: string): void
}
export interface SidebarConversation {
  input: { for(actx: Context): SidebarSessionInput }
}
```
— `...\dsh-better-sidebar\src\context-types.ts:611-627`. **[V]**

Working calls (from a shipped third-party plugin, in production):
```ts
const actx = ctx.sessions.scope(sessionId)          // Agent-scoped Context
const conversation = ctx.get('conversation')
const input = conversation.input.for(actx)
const draft = input.state.getSnapshot().draft
input.setDraft(next)                                 // single public write path
```
— `...\dsh-better-sidebar\src\client\conversation-draft.ts:169-195`. **[V]**

Known constraints a plugin must handle:
- **No caret API on the conversation service** — the composer is a **`<textarea data-phase>`** inside `#root [data-slot="conversation"]`; caret must be probed from the DOM and restored manually after `setDraft` because a controlled React textarea resets the caret — same file, doc at `:16-33`, `findComposerTextarea` at `:92-100`, `probeComposerCaret` at `:113-124`, `placeComposerCaretAfterInsert` at `:136-161`. This implies the shipped composer is a **textarea**, while the conversation package also carries a Lexical editor (`@lexical/extension/InitialState` at `...dsh-client-ui-conversation\lib\client.js:11397`); the textarea is what the plugin relies on. **[V]**
- `draftRev` is a **span-CAS revision** required to mint a structured chip; `insertFileReference` returns false if `draftRev` is `undefined` or unchanged — `context-types.ts:613-616`, `conversation-draft.ts:232-251`. **[V]**

---

## Gaps / could not verify

1. **No `DraftAttachmentId`-level verification of submit for a *forked* child from a plugin.** Forking + `openSession` is verified, and `conversation.send(text)` / `session.prompt(content, mode)` are verified, but I did not find a shipped example that forks and then immediately sends into the child. The composition is inferred from two verified APIs. **[I]**
2. **Whether a forked child's `prompt` is available immediately after `openSession`** (retention/scope timing). `fork` is documented as synchronously addressable *on resolution* (`service.js:327-329`), and `scope(id)` returns `undefined` without a retained generation (`service.js:358-365`), but the timing of `scope()` availability for a freshly forked child after `openSession` is unverified. Test before relying on it. **[I]**
3. **The exact next user-message `seq` for an arbitrary transcript position in the client store.** `ChatNode` exposes `seq`/`anchorSeq`/`finalNode.seq` (`client.js:6502-6514`) but I did not enumerate the full `ChatNode` data shape (it lives in `ui-chat/src/client/contract/chat-nodes.ts`, not fetched). A plugin may instead need the raw `user/message` event seq from the followed history stream. **[I]**
4. **Reflowing/restoring the edited text into the composer for "edit".** `setDraft` works, but mapping a sent message's content back to a draft string (including chips/mentions) is not a solved path — the sent form is plain text (`@path`), so re-inserting it as a chip requires re-emitting `slash/input-insert-reference` with a fresh `draftRev`. **[I]**
5. **`main.js.map` original sources not mined.** The Electron main-process source map (399,981 B) was located but not decoded; it concerns the desktop shell (windows, tray, profiles, webserver), which looked peripheral to this feature. If the plugin needs desktop-side capabilities (dialogs, native menus), that map is the place to look. **[V that it exists; contents unverified]**
6. **`127.0.0.1:43120` could not be fetched** — `web_fetch` rejected the loopback address as outside its allowlist ("non-public IP address ... outside the configured allowlist"). The boot shape was instead established from `dsh-web-frontend\dist\index.html` and the `__ModuleLoader__` bundle header. Runtime DOM/behaviour in the live GUI is unverified from here.
7. **Shipped rc.2 vs public `master` drift.** The public contract files are a newer build (e.g. `dsh-plugin-desktop` here is 2.0.15 with `dsh` 0.1.7-rc.2; the public repo's `ui-conversation` has files like `stop-sequence.ts`, `view-selection.ts`). Every claim above that matters was cross-checked against the shipped bundle, but the **public `.d.ts`/contracts may be ahead of what the installed app actually runs**. Verify against the installed version before finalizing an API contract.
8. **~~GBK-encoded READMEs.~~ — retracted, this was my own measurement error.** `...\dsh-llm-retry\README.zh.md` is **valid strict UTF-8** (verified: `UTF8Encoding(false, true).GetString` throws on invalid sequences, and it did not; 9,449 bytes). An earlier read in this research used PowerShell 5.1 (`5.1.19041.5848`) with `Get-Content -Encoding Default`, whose "Default" is the system **ANSI** codepage (GBK on this zh-CN host) — that produced the mojibake, not the file. Every `README.zh.md` inspected in this research is UTF-8. **Tooling note for the team:** on this host, do not use `Get-Content -Encoding Default` for these files; use plain `Get-Content` or `read`.
9. **`SlotMap` is empty in the shipped runner.** The cordis client runner's embedded declaration is `export interface SlotMap {\n}` (`...\dsh-cordis-client-runner\lib\client.js:2184`) — slot keys are contributed by declaration merging from each owning package, so **there is no single shipped file listing every slot**. The authoritative lists are the per-package contract files (public repo) plus `renderSlot(...)`/`children: {...}` call sites in the shipped bundles.
10. **`typert.host.js` embeds each declaration more than once.** The 359 `"declaration"` strings are not unique: type bundles are repeated per composition (e.g. `SessionEventMap` at `:1993` and `:2728`; `SessionHeader` at `:1657` and `:2736`). All `typert.host.js:NNNN` citations above were spot-checked by re-reading the cited line; where two copies exist, the cited one is the later/more complete. If a reader sees a different line for the same type, it is the sibling copy, not a discrepancy.

---

## Practical conclusions for the plugin

| Need | Verdict |
|---|---|
| Add UI to the conversation view | **Supported** — React + `ctx.slots.register` into a declared slot |
| Add a **Regenerate** button on assistant replies | **Supported today** — slot `conversation.chat.assistant-actions`, owner `{ messageId }`. Copy `dsh-client-ui-message-feedback:815-836` as the template |
| Add an **Edit** button on user messages | **No slot today** — needs upstream slot (`conversation.chat.user-actions`), or replace keyed `conversation.chat.node` `user`, or DOM injection into `[data-chat-flow-kind="user"]` |
| Re-run a turn with edited text | **Fork only** — `sessions.fork({ sessionId, atSeq })` → open child → `prompt(editedText, 'queue')`. No history mutation API exists |
| Branching history | **Yes, via forks** (new session, copied prefix). **No in-session tree, no message-level parent/child, no variants** |
| Composer quoting code / referencing files / skills | **All present** — fenced ` ```path:lines `, `@path` / `@"path with spaces"` chips, `/skill` and `/command` |
| Drive the composer from a plugin | **Yes** — `ctx.get('conversation').input.for(actx)` → `getSnapshot().draft` / `setDraft(text)`; plus `slash/input-insert-reference` for structured chips |

### Suggested two-phase shape

1. **Phase 1 (fully supported today): Regenerate.** Register into `conversation.chat.assistant-actions`. On click, `ctx.sessions.fork({ sessionId, atSeq })` where `atSeq` is the last event seq *before* the turn being regenerated — i.e. back up to just after the preceding `user/message` — then `ctx.uiWorkspace.openSession(childId)` and `session.prompt(previousUserText, 'queue')`. Because `fork` copies an inclusive prefix and closes an open turn with `openTurnClosers`, cutting at a completed turn boundary needs no repair.
2. **Phase 2 (needs an upstream slot, or a fallback): Edit and resend.** The UI affordance is the blocker, not the data path. The data path is the same fork machinery, cut at `userMessageSeq - 1`, with the edited text sent into the child. Request `conversation.chat.user-actions` (a `list` slot with an owner carrying the user message's `messageId` and `seq`) upstream — the symmetry with `assistant-actions` makes it a small, natural addition. Until then, replacing the keyed `conversation.chat.node` renderer for `user` is the only slot-legal route.