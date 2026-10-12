# `dsh-retrace`'s build tooling and tests — read from the GitHub source

Source studied: <https://github.com/yamingmou/dsh-retrace> at `main`, tree
`097409153b6894ea918f6eda6bef1f558c823e2e` (`pushed_at` 2026-09-19, `package.json` version
**0.4.32** — the same version installed at
`C:\Users\Administrator\.dsh\profiles\desktop\node_modules\dsh-retrace\`, so `main` and the
shipped build agree). Read via `raw.githubusercontent.com` + the GitHub trees API; no clone.

**Why this needed the network.** `package.json` `files` is
`["lib/**/*.js", "lib/**/*.d.ts", "cordis.patch.yml", "README.md", "README.zh.md", "HUMANS.txt",
"LICENSE"]`, so `scripts/` and `test/` are absent from the npm tarball. Every claim below is from
the repository, not the tarball.

**Citation convention.** `path:line` or `path` relative to the repository root.
`prior-art` = the earlier report [`dsh-retrace-prior-art.md`](dsh-retrace-prior-art.md), which
studied the shipped tarball and could not see `scripts/` or `test/` (its gap #8 is this ticket).

**Evidence labels.** `CODE` — read out of the file. `COMMENT` — the author's own source-comment
narrative. `README` — their `README.md`/`ROADMAP.md`. `TEST` — pinned by a test. `INFER` — mine.

---

## Summary — the four answers

1. **The build emits one client implementation through three wrappers.** `lib/client.js` is the
   source; `lib/client.bundle.js` is it bundled for the `window.__ModuleLoader__` loader entry
   that `exports["./client"]` serves; `lib/dynamic-client.js` / `lib/dynamic-host.js` are the
   **dynamic-plugin** entries — Cordis plugin *function bodies* (`return { inject, apply }`) that
   inline the same sources and swap only the transport. `generate-dynamic.mjs` exists because DSH
   has **two plugin distribution channels** (profile bundle vs. in-session plugin editor) that
   need two different file *shapes* from one source of truth.
2. **`check-host-contract.mjs` is the load-bearing one for our spec**: 74 declarative assertions
   (60 "present" + 14 "absent") read straight out of the installed `app.asar`, run as
   `pnpm check`. It converts "which upstream surfaces does this plugin consider load-bearing" into
   a mechanical, pre-release gate — including **reverse** assertions that removed members must stay
   removed, and a **self-scan** invariant over the plugin's own tree.
3. **The session-log rewrites are tested against a fake session plus the real pre-write guard.**
   Not real sessions on disk, not a mocked `append`: a hand-written `makeSession()` that mirrors the
   measured host class, plus the actual `dsh-log-contract` guard as the oracle, plus the **official
   `dsh-token-meter` fold** imported from the installed package. The single most reusable pattern is
   the fake's default shape: it mirrors the *production* host generation by default because the
   legacy default once let 38/38 tests pass while the feature was dead on real machines.
4. **The gates are `check → build → git diff --exit-code -- lib/ → test`, identical in CI and in
   `publish.yml`**, and the pinning advice is exact-version on the plugin with a floor on its
   companion contract — *not* `^` across a host upgrade.

---

## Part 1 — The build

### 1.1 The scripts, verbatim

`package.json:9-14` (`CODE`):

```json
"build":         "node scripts/generate-dynamic.mjs && node scripts/build-client.mjs",
"check":         "node scripts/check-syntax.mjs && node scripts/check-dynamic.mjs && node scripts/check-host-contract.mjs",
"test":          "vitest run",
"prepublishOnly":"node scripts/check-pkg-meta.mjs && pnpm check && pnpm build && pnpm test"
```

Note the ordering: `check` runs **before** `build` in `prepublishOnly`, and `test` runs **after**
`build` — so the suite exercises freshly generated artifacts, not stale ones.

`package.json:52-59` (`CODE`):

```json
"scripts": { "build-client.mjs", "check-dynamic.mjs", "check-host-contract.mjs",
             "check-pkg-meta.mjs", "check-syntax.mjs", "generate-dynamic.mjs",
             "token-price-evidence.mjs", "translate-legacy-traces.mjs", "verify-install.mjs" }
```

### 1.2 `lib/client.js` vs `lib/client.bundle.js`

`exports` (`package.json:15-31`, `CODE`):

| Specifier | File | Shape |
|---|---|---|
| `.` | `lib/index.js` | Host half (`main`) |
| `./client` | **`lib/client.bundle.js`** | the built loader entry |
| `./host-core` | `lib/host-core.js` | transport-agnostic ops |
| `./dynamic-client` | `lib/dynamic-client.js` | generated, dynamic channel |
| `./dynamic-host` | `lib/dynamic-host.js` | generated, dynamic channel |

`scripts/build-client.mjs` header (`COMMENT`) states the contract exactly:

> "The client-modules runtime serves `exports["./client"]` directly as a classic script and
> requires it to self-register via `window.__ModuleLoader__.load`. This script bundles the
> human-readable client source (`lib/client.js`) into that loader-entry form
> (`lib/client.bundle.js`) … **Only `react` stays external** — it is a platform seed word the
> loader resolves itself. Everything else in the source is bundled in."

The emitted wrapper is fixed text (`build-client.mjs`, `CODE`):

```
window.__ModuleLoader__.load({
	id: "dsh-retrace",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		… bundled cjs body …
		return module.exports;
	}
});
```

esbuild options (`CODE`): `bundle: true, format: 'cjs', platform: 'browser', target: ['es2020'],
external: ['react'], write: false`, then `writeFileSync` so the file always ends in a newline.
`write: false` + a manual write is how they guarantee the trailing newline across platforms.

`id` is the **package name**, and the same string is used in the dynamic-client wrapper's error
text (`generate-dynamic.mjs`: `'dsh-retrace: unknown module "' + name + '" in dynamic client'`).
`INFER`: for our spec this id is an identity string that must match the package name or the
loader's per-plugin bookkeeping and its error messages disagree.

### 1.3 Why `generate-dynamic.mjs` is needed — the two distribution channels

`generate-dynamic.mjs` header (`COMMENT`) is explicit about the reason:

> "Generate the self-contained dynamic plugin entries from the canonical sources, so the two can
> never drift apart again.
>   `lib/dynamic-host.js`   ← `lib/host-core.js` (transport-agnostic ops)
>   `lib/dynamic-client.js` ← `lib/client.js`    (bundle + `host.call` wire)
> The dynamic files are committed (the plugin editor loads them verbatim as "function body that
> returns a Cordis Plugin"); `pnpm build` regenerates them and CI fails when the committed copies
> are stale."

`README.md` (Development section, `README`) describes the same four entry points and adds the
warning: "**Generated files.** `lib/dynamic-host.js`, `lib/dynamic-client.js` and
`lib/client.bundle.js` are built artifacts … never edit them by hand."

So there are two channels with incompatible shapes:

| Channel | How it is delivered | Required shape |
|---|---|---|
| **Bundle plugin** (profile / npm / composition) | client-modules serves `exports["./client"]` as a classic script | self-registering `window.__ModuleLoader__.load({id, factory})` |
| **Dynamic plugin** (in-session plugin editor) | the editor evaluates the file verbatim | a bare body ending in `return { inject, apply }` |

**`dynamic-host.js`** (`CODE`) is built by concatenating, in dependency order, the *stripped*
sources of five modules plus the writer, inside one `apply` scope:

```
inject: ['sessions', 'agents'],
apply(ctx) {
  const { sessions, agents } = ctx
  const log = (line) => console.error(`retrace: ${line}`)
  …inlineHostCompat, inlineSpanSemantics, inlineMarkerCarrier, inlineContract, inlineHost, inlineWriter…
  const markerWriter = createDshMarkerWriter({ meter: () => ctx.get('tokenMeter') ?? ctx.tokenMeter, log })
  const api = createEditorApi(ctx, sessions, agents, log, { writeMarker: markerWriter.writeMarker })
  const disposers = [ harness.handle('retrace.recall', …), … ]
  ctx.effect(() => () => { for (const dispose of disposers) dispose() }, 'retrace: handlers')
}
```

The comment records the ordering rule: "声明顺序 = 依赖顺序" (`host-compat.js` → `span-semantics.js`
→ `marker-carrier.js` → `adapter/contract.js` → `host-core.js` → `dsh-writer.js`), because the
strip leaves one flat scope. The strip is `src.replace(/^import .* from '[^']*';?\n/gm, '')
.replace(/^export /gm, '')` (`CODE`).

Three consequences an implementer inherits, all `COMMENT`/`CODE`:

- **The dynamic realm cannot `import` official packages.** Hence services are *injected*
  (`ctx.get('tokenMeter')`), not imported, in the generated file.
- **Inline name collisions are real build breakage.** `prior-art` §E noticed
  `marker-carrier.js` exports `MARKER_ID_PREFIXES` (a list) where `host-core.js` exports
  `MARKER_ID_PREFIX` (singular); the comment in `generate-dynamic.mjs` and the module itself
  say this shape exists so the two do not collide in the shared inline scope.
- **The strip regexes are anchored to line starts and single quotes.** An `import` written
  differently (double quotes, no semicolon, indented) would survive the strip and break the
  dynamic channel while the bundle channel stayed green. `INFER`: this is a latent trap, not an
  observed incident — but it is a reason to keep the number of modules folded into a dynamic
  payload small, and to always run `check-dynamic.mjs`.

**`dynamic-client.js`** (`CODE`) is the same client source, bundled *without* the loader banner,
with a `require` shim that resolves only `react`, and returns the plugin surface directly:

```
return {
  inject: <extracted from client.js by regex>,
  apply(ctx) {
    const mod = (() => { var module = { exports: {} }; … bundled body …
      const require = (name) => name === 'react' ? React : (() => { throw new Error('dsh-retrace: unknown module "' + name + '" in dynamic client') })()
      return module.exports })()
    if (typeof mod.__setMessageEditorWire === 'function') {
      mod.__setMessageEditorWire((op, payload) => host.call(`retrace.${op}`, payload))
    }
    return mod.apply(ctx)
  },
}
```

The `inject` list is not duplicated — it is **extracted from the source** with
`/export const inject = (\[[^\]]*\])/`, and the build throws if that pattern is absent
(`generate-dynamic.mjs`, `CODE`). The transport swap is one injected function,
`__setMessageEditorWire` — i.e. the published client and the dynamic client are the *same*
implementation with a different wire (`README`: "The dynamic client reuses the same client source
as the published one and only swaps the transport (`host.call` vs the HTTP route) via
`__setMessageEditorWire`.").

### 1.4 `check-dynamic.mjs` — because `node --check` does not apply

`CODE`: the dynamic files "start with `return { ... }`, so they are not valid standalone modules —
plain `node --check` rejects them. Compiling them as a function body is the equivalent check."

The check is `new vm.Script('(function () {\n' + source + '\n})', { filename })` — **compile only,
never run**, with `process.exitCode = 1` on failure (`CODE`).

`check-syntax.mjs` (`COMMENT`) records a second, sharper trap in the same area:

> "`node --check a.js b.js` only validates its FIRST argument and silently skips the rest
> (verified against Node 24), so the previous multi-file `node --check` invocation was only ever
> checking `lib/index.js`. We use esbuild's in-process transform (already a devDependency) instead
> of spawning `node --check` per file: no child processes, works everywhere, and fails the build on
> the first syntax error."

It walks `lib/` recursively, `transform(..., { loader: 'js', format: 'esm' })` (parse only, no
import resolution), and reports a count (`check-syntax: ok (N files)`).

### 1.5 `verify-install.mjs` — the "half-installed" gate

Not part of `check`, but it is the acceptance-criteria model for an installed third-party plugin
(`CODE`):

- Discovers the profile list **from disk** (`package.json` in each profile dir) instead of a
  hard-coded `['desktop','web',…]`, because the hard-coded list went stale and produced a false red
  while the real entry went unchecked.
- Asserts each installed version satisfies the declared range, with a hand-rolled caret matcher
  whose comment states the trap: "⚠️ 0.x 时 minor 是'不兼容边界'" — `^0.3.6` does **not** accept
  `0.4.6`.
- Asserts **cross-profile version agreement** — the incident behind it was two profiles running
  different plugin versions and writing different marker shapes into the same log
  (`COMMENT`: "web profile 停在 0.4.6/0.3.2 时仍会写 turn-null marker … 与 desktop 0.4.10 行为分裂").
- Smokes the plugin's own HTTP routes, but **only after probing a gateway baseline**: if
  `/api/health` also returns 403, route 403 is the gateway, and the smoke test downgrades to
  "not externally verifiable" instead of failing (`CODE`).
- Asserts the three generated client artifacts exist and are non-empty.

---

## Part 2 — `check-host-contract.mjs`: the host contract it asserts

### 2.1 What it is

`COMMENT` (file header) gives the motive and the shape:

> "Why this exists: twice now a plugin release was written against a host member that the installed
> DSH Desktop no longer has — `snapshot.chat.nodes` on the client and `session.events` on the host.
> **Both times the failure was silent (no crash, clean logs), so only a real user noticed.** This
> script turns the audit table into a mechanical check: every host member the plugin reads must
> still exist, and every member that must NOT exist must stay absent.
> Reads the INSTALLED app.asar directly (no network, no profile changes)."

`DSH_ASAR` overrides the path; **if the asar is absent it prints an explicit SKIP and exits 0**
(`CODE`) — the gate is Desktop-optional.

### 2.2 The table: 74 assertions, two directions

`COMMENT`: "COUNT DISCIPLINE: the total is `CHECKS.length`. … Do NOT count with `grep` on the
`kind:` field". Counting the `{ kind: …` entries gives **60 `present` + 14 `absent` = 74**.

The `absent` half is the part worth copying. It is not "the member is gone" documentation — it is a
**regression alarm against resurrection**:

| `absent` assertion | Rationale recorded in the table |
|---|---|
| `Session.events` (2 copies: `lib/index.js` and the bundled types) | removed in `0.1.5-rc.1`; all reads must go through the compat accessor |
| `Session.sessionId` | never existed; the plugin's `?? session.sessionId` fallback is a dead branch |
| `SessionStore.values()` / `.keys()` | neither is a measured host API; only `list()` is |
| client `Session.getTitle` / `.chat` / `.nodes` | `getSnapshot()?.chat?.nodes` was **always `undefined`** on this host — this is the exact break that made every message-level component throw and be swallowed |

Presence assertions cover the host read API (`session.snapshotEvents()`, `session.eventAt(seq)`,
`session.ownEvents()`, `session.isOwnSeq(seq)`, `get id()`, `get seq()`, `header`, `append`), the
surface (`get surface()`, `get nodes()`), the services (`sessions.get/list/flush`,
`agents.get/list`, `agent.status/followup/cancel/whenIdle/inbox`), the **service names**
(`super(ctx, "sessions")`, `super(ctx, "agents")`, `super(ctx, "webServer")`, `super(ctx, "fs")`,
`super(ctx, "subprocess")`, `super(ctx, "sandboxPolicy")`, `super(ctx, "jobs")`,
`super(ctx, "tokenMeter")`, `super(ctx, "sessionTitle")`, plus `ctx.provide("locale")` for the
client), the `tokenMeter` / `sessionTitle` /
`webServer` / `fs` / `subprocess` / `sandboxPolicy` / `jobs` / `sessionProjections` /
`sessionQuery` / `storageDomain` method surfaces, the client services
(`slots`, `locale`, `uiConversation`, `uiConversation.events.register`), the client session
controller (`binding`, `getSnapshot`, `loadOlder`, `loadThrough`, `hasMore`, `rename`,
`sessionId`), and the slot catalog entry for `conversation.view`.

A warning in the table is worth quoting for its own sake (`COMMENT`):

> "服务名一律取自 `super(ctx,"X")` 字面量（或 `ctx.provide("X")`），**不是**宿主 bundle 里那一行的
> `id`。例:宿主 bundle 有 `id: sandbox` 的行,而真正的服务名是 `sandboxPolicy` … 曾据 bundle 行 id
> 误判 `inject: ['sandboxPolicy']` 不成立。"

### 2.3 The matching machinery (the reusable part)

The script distinguishes five problems, each with a dedicated helper, each unit-tested
separately in `test/host-contract-matcher.test.js`:

- **`declaresMember(text, member)`** — five regex families for the ways a host actually declares a
  member: class field with optional initializer, getter/setter/method (incl. `async`, `static`,
  generator), `this.member` construction-time assignment, object-literal property, and a bare
  `member:` line. Its comment records why the naive two-form regex was insufficient: a review
  "found 16 missed resurrection forms" (`log = [];`, `eventsSnapshot;`, `hasMore = false;` …), and
  that **over-matching is the safe direction for a reverse assertion**.
- **`declaresMemberBoltOn(text, member)`** — whole-file scan for forms that live *outside* a class
  body: `Object.defineProperty/ies`, `Object.assign(X, {member})`, `X.prototype.member`,
  `X.prototype, 'member'`, `__defineGetter__('member')`, `__decorate([…], X.prototype, 'member')`,
  computed class members `['member'] = …`. The comment records that **slicing itself created that
  escape**: a bolt-on is red file-wide but green inside the class slice.
- **`scopedSlice(text, scope)`** — isolate one class body between two literal markers, so an
  unrelated class in the same file cannot satisfy or break the assertion. **Missing markers are
  treated as drift, not as a skip** (`CODE`: "The scope markers are gone: the assertion can no
  longer be evaluated, so it is drift in itself (never silently pass)"). This is the single most
  important design decision in the script.
- **`entrySlice(text, key)`** — isolate one slot-catalog entry, bounded by the next `key: "` rather
  than a character window (`COMMENT`: `conversation.view` "sits among ~40 catalog entries; a char
  window could match a neighbouring entry's `standardProps`").
- **`scanPluginFiles(root, {dir, skip, re})`** — the **plugin-side invariant**: assert something
  about *our own* source tree via `file:line` hits. Used once, and it is a good idea: no file under
  `lib/` except the compat layer and the generated dynamic host may *value-read* `session.events`.
  The comment explains the asymmetry that makes this the right place to be exhaustive:
  "Enumerating host-side resurrection forms can never be exhaustive. The finite, 100%-pinnable
  direction is the plugin's own side."

### 2.4 The runner details worth stealing

- It sets `process.noAsar = true` before touching the path, because **DSH Desktop runs package
  scripts under Electron's Node**, whose asar FS wrapper hijacks any path ending in `.asar`
  ("`openSync` on the archive itself becomes 'read an entry inside it' → ENOENT") — harmless in
  plain Node (`COMMENT`).
- It ships a ~30-line **minimal asar reader** (`CODE`): `u32LE` at offset 12 is the header size,
  the JSON header follows at 16, and file data starts at `17 + headerSize`; `entry.offset` is
  relative to that base. No extraction, no dependency. `INFER`: this is directly reusable if our
  spec wants a host-drift gate without adding a tool.
- It prints the resolved versions in the banner (`DSH Desktop <x> · @deepseek-ai/dsh-session <y>`)
  and a breakdown string, and it explicitly refuses the older `--grep` style helper that "prints
  nothing on success and would make this gate vacuously green" (`COMMENT`).

---

## Part 3 — `test/`: what it tests, and how it tests the log rewrites

96 files under `test/` (via the trees API); `vitest run`, one config. The five that matter for
session-log rewrites are `helpers.js`, `official-meter.js`, `marker-append-seq.test.js`,
`marker-carrier.test.js`, `contract-runtime.test.js` (plus `host-core.test.js` for the ops and
`client-*.test.js` for the client).

### 3.1 The answer to "how": fake session + **real** guard + **official** meter

**It does not build real sessions on disk and it does not mock `session.append`.** The technique is
a three-part oracle:

1. **A fake session shaped like the measured host class.** `helpers.js` header (`COMMENT`):
   > "The host core only reads `sessionEvents(session)` / `session.surface.nodes`, calls
   > `session.append(...)` and `sessions.flush(...)`, and queries `agents.get(sessionId).status` /
   > `.followup(...)`. This helper mirrors the append-only log plus a shadow-able surface so the
   > three editor ops can be unit-tested without the real runtime."

   `makeSession()` mirrors the measured class members (`id`, `header`, `get seq()`,
   `surface.nodes`, `append`, `snapshotEvents()`, `eventAt(seq)`) and adds test-only
   `seed()` / `appendRaw()` / `dropAt(seq)`. `append` reproduces the host's surface rule: an event
   carrying `surfaceOp.op === 'replace'` **filters the shadowed seqs out of `surface.nodes` and
   pushes its own seq as the new tail**; `log-only` types (`request/header`, `compaction/prune`,
   `compaction/summary`) do not enter the surface at all; `step/*` and `turn/*` are position
   boundaries and produce no node.

   **`dropAt(seq)` is how they simulate a windowed/sparse view** — `delete events[seq]`, leaving a
   hole — and it is the fixture behind the whole "never scan the in-memory array" family of
   regression tests.

2. **The real pre-write guard as the rejecting oracle.** `marker-append-seq.test.js` wires
   `createDshMarkerWriter({ validateMarker: createMarkerGuard({ log }).validateMarkerAppend, … })`
   — the **actual `dsh-log-contract` guard**, no fake `prewriterFactory` — so the test asserts
   against real contract rules, not a stand-in.

3. **The official package for every price, formula and protocol.** `official-meter.js` header
   (`COMMENT`) states the principle:
   > "第 1 段审计事件的 `shadowedTokenCount` 是官方 shadow-price claim (令牌价),判据只能是官方自己的
   > 估价函数——**手抄一份公式就等于把「与官方一致」变成自我实现**."
   > "解析失败时本模块**直接抛**(而不是静默降级成'跳过')——否则「与官方口径一致」会变成假绿."

   It resolves `@deepseek-ai/dsh-token-meter`, then imports its sibling pure modules **by file
   path** (`./types/estimate.js`, `./types/surface-projection.js`) because the package's `exports`
   map only allows `.`, `./client`, `./invariant`, `./package.json`. It exports the real
   `deriveEventMessage`, `estimateMessage`, `officialNodePrice` and a `officialSurfaceMeter()`
   stub.

### 3.2 The five rewrite invariants the tests pin (the acceptance-criteria payload)

**(a) The producer must not fabricate the append seq.** `marker-append-seq.test.js` header
(`COMMENT`) is a real-machine incident report, and it is the single best acceptance criterion in
this whole study:

> "Real-machine incident (DSH Desktop 2.0.9, 2026-09-14): clicking edit or recall failed with
> `Marker write rejected by contract guard: [E2/error] seq 0 不连续：倒退（backward），期望 26033 ——
> 只能追加到日志尾部（append-only，N6）` … Root cause was in `lib/adapter/dsh-writer.js`: the
> envelopes handed to `validateMarker` were hardcoded `seq: 0`. `dsh-log-contract`'s
> `createPreWriter.validateAppend` treats a **PRESENT** `seq` as authoritative — it only assigns
> `nextSeq` when `seq === undefined` — so once the guard saw the real log tail the candidate was
> read as 'backward to 0' … The guard correctly refused to write; the producer was wrong."

Pinned by `TEST`:
- the carrier's `seq === before + 1` where `before = session.seq`;
- `marker.sourceEventSeqs[0] === before` (the audit segment);
- `marker.sourceEventSeqs.every(seq => seq < marker.seq)` — **strictly earlier**;
- the envelopes handed to the guard satisfy `Object.hasOwn(envelope, 'seq') === false`;
- a negative control that fabricates `seq: 0` must reject with a message that **names** the
  problem (`/must OMIT seq/`, `/implies 64/`) instead of emitting the E2/S6/S8 triple.

**(b) Two segments, adjacent, validated as a pair *before any append*.** `TEST`: a rejected pair
leaves **zero** writes — `expect(session.seq).toBe(before)` and no `compaction/prune` in the log —
with the comment naming the old defect ("the guard used to reject the carrier **after** the audit
was already appended, leaving an orphan `compaction/prune` (the real machine left seq
26032/26033)"). Positively: `audit.seq + 1 === carrier.seq`,
`carrier.sourceEventSeqs[0] === audit.seq`, and
`audit.data.shadowedRange` equals the carrier's range exactly.

**(c) The pair is the host's shadow-price protocol, and the test proves the protocol by folding the
official projection.** This is the most valuable single test pattern here (`TEST`, and its own
`describe` says these are **host** fields the plugin never reads or writes):

- `foldSurfaceProjection(undefined, audit)` → a `claim` is defined; folding the carrier next
  consumes it (`consumed.claim === undefined`) and
  `consumed.deltaTokens === officialNodePrice(carrier) - audit.data.shadowedTokenCount`.
- Folding a log that contains a **matching adjacent** prune+replace yields a total `< 0`; folding a
  **lone replace with no claim** yields exactly `0` — "the range is never subtracted".
- An orphan claim next to a **different-range** replace makes the official fold **throw**
  (`/no adjacent shadow price/`).
- Two adjacent prunes: the first claim is overwritten and the last is expired by the next event.

**(d) The carrier's shape is closed.** `contract-runtime.test.js` (`TEST`) asserts, per rule, that a
violation throws a `contract-violation` carrying `contract` / `expected` / `actual`, and that the
rendered `actual` stays compact (`{a,b}`, `Array(3)`) so it never dumps a million events:

- `data` key set is **exactly** `{role, id, content, source}` — the comment says why: "官方
  `user/message` 词表精确四成员:多一个成员即被官方拒(editor 无处容身)". So `turn`, `step` and any
  business field are refused.
- `data.content` must be a **non-empty** array — "空 content 会投影成一条空 user 消息(实测)⇒ 写侧拦下".
- `data.source.kind === 'model'` — "source.kind 非 'model' → 轮边界污染(官方不拦,写侧拦)".
- `data.id` must match the plugin's marker-id predicate.
- `sourceEventSeqs`: no duplicates, first/last equal to the range endpoints, and **every shadowed
  seq earlier than the audit seq**.
- **`surfaceOp` key names are a runtime-variable official contract.** The comment:
  > "运行时 0.1.1-rc.2(v0 树)= `{start,end}`;lab 0.1.5(v3 树)= `{startSeq,endSeq}`(v2→v3 迁移改写
  > 键名)。两棵树都要求键数**精确为 3**,故不得混写。"

  `markerSurfaceRange()` feature-detects **both** shapes and reports the key names; mixing them, a
  key count ≠ 3, or `op !== 'replace'` all throw. And a test pins *why* the mechanism is needed —
  asserting that the source contains `runtimeSurfaceOpShape()` and **does not** contain the
  hard-coded v0 literal, with the comment: "官方 v0 的 `isReplaceOp` 只查键数=3,不查键名语义;写错形状
  会被下游以误导性错误暴露(`surface start targets consumed assistant/chunk undefined`)".
- **`startSeq > endSeq` is legal.** Two tests pin positional order explicitly ("官方
  replacementRange 只按 `indexOf(start) <= indexOf(end)` 的**位置**判定；真实会话实测:位置连续段
  `[start … end]`(start 数值 > end)是正常写入"), and the writer is exercised end-to-end on
  `{start: 4, end: 1, shadowedSeqs: [4,3,2,1]}`.
- The **audit** event's shape: `data` key set exactly `{shadowedRange, shadowedSeqs,
  shadowedTokenCount}`, **no** `surfaceOp` / `sourceEventSeqs`, `type === 'compaction/prune'`,
  `shadowedSeqs` non-empty with no duplicates and endpoints equal to `shadowedRange`, and
  `shadowedTokenCount` a non-negative integer.

**(e) Ordering of writes vs. errors — two opposite-looking rules, both deliberate.** `TEST`:
- an exit-assertion failure **flushes first, then reports** — "先落盘再报错(不留'客户端报失败、
  面上其实已改'的半状态)"; the assertion is `expect(flushed.length).toBe(1)` and the flushed length
  equals the post-write log length.
- a bad **input** span means **no write at all** — "断言先于 append;不留半关闭 turn", asserted as
  `sessionEvents(session).length === before`.

### 3.3 `marker-carrier.test.js` — the read side

`TEST`, worth one paragraph each:

- **Read tolerance must not launder the defect it is meant to detect.** The `describe` comment:
  > "容错**不得**把'审计段在、载体段在很远处或根本不存在'的真孤儿误判成成对 —— 容错把要检出的缺陷
  > 掩盖掉是唯一不可接受的结果。写侧 `assertPairing` 保持严格。"

  Pairing is decided three ways (`ref-first`, `ref-anywhere`, `adjacent-range`) and the **negative
  controls** are the point: an audit with no carrier, a carrier two seqs away with a matching range
  but no reference, and an audit seq absent from `sourceEventSeqs` non-adjacent — all must still be
  judged orphans.
- **Shadowed-seq recovery is a fallback chain**, in a fixed order: top-level `sourceEventSeqs` minus
  its audit guide item → the adjacent audit event's `shadowedSeqs` → the legacy `data.shadowedSeqs`
  — and a *partial* array (missing the range endpoint) is rejected as "not this range" and falls
  through rather than being trusted. `carrierShadowedSeqs(noTop, readerFor(log))` returning `[2,4]`
  with no top-level field at all is exactly the client-side case the earlier
  [`sourceEventSeqs-delivery`](sourceEventSeqs-delivery.md) ticket found no consumer for.
- **Business provenance does not live in the carrier.** `carrierTargetSeq` derives the target from
  `surfaceOp`'s range **start** (or the legacy `data.editor.targetSeq`), and returns `-1` when it
  cannot tell — "无区间且无旧字段 ⇒ -1(读端据 -1 判定'无法还原',不猜)". A 203-marker observation is
  cited for the rule that `editor.targetSeq === surfaceOp.start` in every real marker, and the write
  side now logs a diagnostic when the business target differs from the derived one.
- **Constants are exported and pinned as literals**: `AUDIT_EVENT_TYPE === 'compaction/prune'`,
  `CARRIER_EVENT_TYPE === 'user/message'`, `CARRIER_SOURCE_KIND === 'model'`,
  `CARRIER_DATA_KEYS === ['role','id','content','source']`, and
  `TRACE_TEXT === '（此处内容已被撤回：原消息已归档，可在恢复视图中查看）'`.

### 3.4 `host-core.test.js` — the ops contract

`TEST`, the parts our spec should carry:

- **Every op resolves, never rejects**: failures are `{ok: false, error: {code, message}}`, and even
  a throwing `sessions.get` yields `code: 'internal'`.
- Error codes are a closed vocabulary the tests pin individually: `message-not-found`,
  `target-shadowed`, `agent-busy`, `session-not-found`, `bad-request`, `no-model-header`,
  `not-user-message`, `blank-text`, `agent-unavailable`, `not-assistant-message`, `no-prompt`,
  `no-text`, `message-pending`, `span-replay-failed`.
- **`message-pending` vs `target-shadowed` is a distinction the plugin must make explicitly.**
  The `describe` header explains the state: a message is in the in-memory log but **not yet in the
  surface snapshot** (the click landed in a turn-closing window, or the file flush lags). The rule
  is a two-source verdict — an explicit `spanStatus`
  (`ok | not-found | already-shadowed | not-persisted | replay-failed`) combined with file facts
  (`{fileMaxSeq, targetSeq}`): `not-found` + in-memory seq **beyond** the file snapshot ⇒
  `message-pending` (retryable); `not-found` + snapshot **covering** that seq ⇒ `message-not-found`
  (permanently absent); `replay-failed` ⇒ `span-replay-failed`, never dressed up as
  `target-shadowed`. The comment: "内部错误,绝不冒充遮蔽".
- **The span comes from the file, and upstream text never comes from scanning memory.**
  `describe('regenerate 重发文本取自文件侧,绝不越过稀疏洞/遮蔽区选更早轮')` builds a session with a
  **hole** at the round's user seq and a shadowed earlier round, then asserts the resent text is the
  current round's prompt and **not** the earlier one, and that with no file-side prompt the op
  returns the intelligible `no-prompt` **without calling `followup` and without writing a marker**.
- **Ops on one session are serialized by a per-session lock**, asserted by counting concurrent
  `flush` calls and requiring `maxActive === 1`.
- **The flush happens exactly once per successful op**, asserted with `toHaveBeenCalledWith(session)`.
- **Round semantics**: an injected-context `user/message` (`source.kind !== 'user'`) must not split a
  round; tool rows are shadowed with their round; the carrier is not a round boundary
  (`isRoundBoundaryEvent(marker) === false`).
- **No `turn`/`step` envelope is written** in either case (mid-turn or between turns): the count
  increases by exactly 2 and the two new events are the audit then the carrier. The `describe`
  header records the reason verbatim: "`dsh-token-meter/lib/index.js:753` 只要求 `assistant/message`
  匹配打开中的 step/start;两段结构的第 2 段是 `user/message`,官方对它没有 step 配对要求(它连
  turn/step 成员都没有)⇒ 信封/计数器推进全部消失." The same `describe` also asserts the old
  envelope is gone (`sessionEvents(...).some(e => e?.type === 'turn/start' || e?.type === 'step/start')`
  is `false`) and that `agents.get('s1').phase` stays `undefined`.

### 3.5 The client-side technique (relevant to our hiding section)

`client-surface-boundaries.test.js` (`TEST`) is the model for testing a React client half with **no
jsdom and no testing library**:

- `test/mini-react.js` is a hand-rolled minimal reconciler (~6 KB) supporting
  `createElement` / `mount` / `flush`; `collectElements` / `textOf` / `findByClass` are the
  assertions vocabulary; a ~60-line `domStub()` covers only what the client's `ensureStyle` and
  close-guard assembly touch.
- The client **source** is bundled in-test with esbuild
  (`stdin: { contents: source + '\nexport { … }\n' }`, `bundle: true`, `format: 'cjs'`,
  `external: ['react']`) and evaluated with `new Function('require','module','exports', …)` where
  `require('react')` is the mini implementation and everything else falls through to
  `createRequire`. `INFER`: this is how you test a client half whose real module face is
  `{inject, apply}` — export the internals from the *source* under test, not from the shipped face.
- **Every React registration surface must be wrapped in one shared error boundary**, asserted
  **structurally** (walk the registered components and check `getDerivedStateFromError` exists and
  is the *same* function identity for all six surfaces, each with its own title) **and by a source
  guard** (every `ctx.slots.register(...)` must close with `withPanelBoundary(`). The
  `describe` header states the incident: one unwrapped surface "把宿主整页打白" (white-screened the
  host).
- A companion test **proves the boundary is load-bearing**: mounting the throwing component
  *without* the wrapper must throw out of the whole render — "这正是白屏的机制".
- Registration is captured with a **fake `ctx`** (`effect`, `locale`, `get`, `inject`,
  `slots.inject` / `slots.register`), and `slots.inject(seat, cb)` is called synchronously by the
  fake. `INFER`: this is a cheap, high-fidelity way to pin *which* slots and keys a client half
  registers.

---

## Part 4 — Gates, and pinning

### 4.1 The gates, exactly

`.github/workflows/ci.yml` (`CODE`) — on every push to `main` and every PR:

| Step | Command |
|---|---|
| install | `pnpm install --frozen-lockfile` |
| syntax | `pnpm check` (= `check-syntax` → `check-dynamic` → `check-host-contract`) |
| build | `pnpm build` |
| **generated artifacts in sync** | `git diff --exit-code -- lib/` |
| tests | `pnpm test` |

Node **22** with the comment: "pnpm 11.7.0 (`packageManager` field) requires Node >= 22.13 (uses
the `node:sqlite` builtin); Node 20 fails at setup with `ERR_UNKNOWN_BUILTIN_MODULE`". pnpm version
comes from `packageManager: "pnpm@11.7.0"`.

The build-sync step is the load-bearing gate for generated files *and it only works in that order*:
you must `build` first so the diff shows drift rather than absence. Its comment: "The committed
`lib/client.bundle.js` (and the generated dynamic entries) must never drift from their sources. Any
diff here fails the build."

`.github/workflows/publish.yml` (`CODE`) — on tags `v*`, same four gates **plus** a tag/version
consistency check (`v${package.json version} !== github.ref_name` ⇒ fail), then
`pnpm publish --provenance --no-git-checks` with `id-token: write`. `prepublishOnly` adds
`check-pkg-meta.mjs`, which positively whitelists the expected owner in `repository` / `homepage` /
`bugs` — the incident being a `repository` URL pointing at a since-deleted GitHub account on an
already-published version (npm metadata is immutable).

`dsh-log-contract` is exercised as a **devDependency of the test suite** (the guard is imported in
tests) while also being a runtime `dependency`.

### 4.2 Pinning — the answer, and where the repository contradicts itself

`README.md` (Upgrading → Pinning, `README`) is unambiguous:

> "Pin an exact plugin version (`dsh-retrace@0.4.32`) and let `dsh-log-contract` resolve to
> `>=0.3.12`. **Do not rely on `^0.4` across a host upgrade: compatibility here is decided by the
> host surface, not by semver alone.**"

The actual declarations (`package.json`, `CODE`):

- `peerDependencies` use **carets**: `@deepseek-ai/cordis ^4.0.1`,
  `@deepseek-ai/dsh-client-locale ^0.1.0-rc.6`, `dsh-client-ui-conversation ^0.1.0-rc.6`,
  `dsh-client-ui-slots ^0.1.0-rc.6`, `dsh-session ^0.1.0-rc.6`,
  `dsh-storage-domain ^0.1.0-rc.6`, `dsh-token-meter ^0.1.0-rc.6`, `react ^18.2.0`.
- `dependencies`: `dsh-log-contract ^0.3.12`, `zod ^4.4.3`.
- `devDependencies`: `esbuild ^0.28.2`, `vitest ^4.1.11`.
- `pnpm-workspace.yaml` sets `minimumReleaseAgeExclude` for two `dsh-log-contract` versions and
  `allowBuilds: { esbuild: true }` — i.e. there is also a **release-age policy** in play.

`INFER`: the prose advice and the declared ranges disagree, and **the prose is the honest one**.
The peer carets are a packaging convenience, not a compatibility claim; the compatibility claim is
the host-surface gate. For our spec the operative rule is: **declare bounded peer ranges, but make
the host surface — not the range — the thing that decides whether the build is allowed to ship.**

---

## Part 5 — What this hands the spec

Consequences, ordered by how much they change what an implementer writes.

1. **A host-contract gate is cheap, mechanical, and now has a worked example.** The 74-assertion
   table plus the five matchers is a few hundred lines, reads the installed asar with no
   dependency, and is the only defence against the failure class that actually bit this plugin
   twice (silent, clean-log breakage). Our spec should require an equivalent gate, scoped to the
   surfaces it uses, in both directions. Evidence: Part 2.
2. **Acceptance criteria for a session rewrite are writable, and Part 3.2 is the skeleton.** The
   five invariants (no fabricated seq; adjacent pair validated before any append; the
   shadow-price claim/adjacency protocol proven by folding the official projection; the closed
   carrier/audit shapes; flush-then-report for output failures but zero-write for input failures)
   are directly transcribable as normative requirements with testable predicates. Nothing here
   needs a real session on disk.
3. **Test doubles must default to the production host generation.** The `helpers.js` generation
   note is a first-class lesson: "while the fake carried only `events`, the whole suite silently
   exercised the legacy branch, and a 'guarded' regression such as
   `Array.isArray(session?.events) ? session.events : []` passed 38/38 — i.e. it could ship
   'recall/edit is dead' with a fully green suite." Our spec's test section should require the fake
   to expose **only** the shipped host's members, with any legacy shape behind an explicit
   `{host: 'legacy'}` opt-in.
4. **Never hand-copy a platform formula or a platform constant.** Import the official estimator
   **by file path** when the exports map does not expose it, and **throw** rather than skip when it
   cannot be resolved — otherwise "consistent with the official value" becomes self-fulfilling.
   Evidence: `official-meter.js`, Part 3.1.
5. **Two shapes for `surfaceOp`, selected at runtime — not a hard-coded literal.** Writing the
   wrong key pair is not caught by the host (`isReplaceOp` checks only that there are three keys),
   so the failure surfaces downstream as a nonsense error. Our spec's worked example should use
   `{op:'replace', startSeq, endSeq}` (the shape in the map's established facts, from
   `dsh-session/README.zh.md:50`) **and** require a runtime shape probe with a loud failure on
   mismatch. Evidence: Part 3.2(d).
6. **A `data` key set that is exactly four members is a hard constraint on marker design.** Marker
   identity must live in `data.id`, and business provenance (target seq, original text) must be
   **derivable** (`targetSeq` = range start) or fetched from the log — never stored in the carrier.
   This corroborates the map's `MessageSourceMap`-is-closed note and extends it from `source.kind`
   to the whole `data` object. Evidence: Part 3.2(d), §3.3.
7. **Two write-ordering rules that look contradictory and are not**: *output* assertions fail after
   the flush (never claim failure over a changed surface), *input* assertions fail before any append
   (never leave a half-written pair). Evidence: Part 3.2(e).
8. **Decide the guard dependency explicitly.** Retrace's write-safety is `dsh-log-contract`'s rules,
   and `prior-art` §F.11 #4 says do not take that dependency "unless you need offline session
   repair" — but the rules the tests exercise (append-seq authority, adjacent-pair ordering, closed
   key sets, earlier-than references) are exactly the ones the earlier report could not see because
   the tarball lacks `test/`. **This ticket changes that claim's footing**: the rules are now
   enumerated in Part 3.2 and are small enough to re-implement, while the dependency is a real
   incident vector (a host release stopped exporting a symbol `dsh-log-contract` imported, and the
   **whole plugin tree** failed to load). `INFER`: re-implement the enumerated rules and keep the
   dependency out; the reasoning is now evidence-backed rather than a hunch.
9. **The reproducibility recipe to put in the spec's build section**: canonical client source →
   esbuild bundle (`format: 'cjs'`, `external: ['react']`, `target: ['es2020']`) → loader banner
   with `{id, factory}` for `./client`; any dynamic/editor variant generated from the same source
   with the transport injected, never duplicated; `check` = syntax (esbuild `transform`, because
   `node --check` silently ignores all but its first argument) + artifact-shape checks (compile
   dynamic bodies with `new vm.Script`) + the host-contract table; CI runs
   `check → build → git diff --exit-code -- lib/ → test`; generated files committed and marked
   `GENERATED FILE — do not edit by hand`.
10. **One worked caution about copying the *transport* lessons.** Retrace builds its ops **once**
    and mounts them from one object on two transports, with a parity test, after an incident where
    wiring only the harness left the App on 404. Our spec chose a single transport (a self-mounted
    Typert Remote, ticket 18), so the parity *test* is retrace-specific — but the construction rule
    is not: build the op surface once and let transports be adapters over it. Evidence:
    `prior-art` §D.5, `README` development section.

---

## Part 6 — Honest gaps

Things this ticket did **not** settle.

1. **`host-contract-matcher.test.js` was not read**, only its existence and role (it is the
   reference for the five matchers' known escapes). A spec that adopts the technique should read it
   before writing matchers of its own. *Would settle it*: fetch
   `test/host-contract-matcher.test.js` (13 KB).
2. **I did not read `test/client-chat-hooks.test.js` (140 KB), `test/client-view-boundary.test.js`,
   or `client-store-contract.test.js`.** The client *hiding* mechanism
   (`hiddenKeysFor`, the `<style>` injection, `turn-tail` / `tool-call` / half-seq handling) is
   covered in `prior-art` §D and [`delete-vs-hide.md`](delete-vs-hide.md) from the shipped source, so
   the spec is not blocked — but the *test* treatment of the hide path is unexamined here.
3. **`test/generated.test.js`, `test/host-contract-matcher.test.js`, `test/op-channel-parity.test.js`,
   `test/prewrite-guard.test.js`, `test/span-single-truth.test.js`** — identified by name and size,
   not read. `generated.test.js` (4.5 KB) probably asserts the generated artifacts' shape and is
   worth a look before the spec fixes its own artifact policy.
4. **The `dsh-log-contract` rule set itself was not read** (it is a separate repository,
   `github.com/yamingmou/dsh-log-contract`). What is known is the subset the tests pin (Part 3.2)
   plus the rule labels that appear in error strings: `E2`, `S4`, `S6`, `S8`, `N6`, `T1`. A spec
   that re-implements the guard should read that repository's rule list rather than infer it from
   these fixtures.
5. **No real-session fixture harness was found.** Despite the `ROADMAP`'s "以真实损坏会话当测试集"
   and "真实会话夹具回归", the session-rewrite tests work entirely on in-memory fakes; the
   real-corrupted-session fixtures appear to belong to `dsh-log-contract`'s own suite. `INFER`: so
   there is **no shipped example of an end-to-end "build a session on disk, rewrite it, reload it,
   assert the loaded log" test** in this repository to copy. Our spec's acceptance criteria should
   therefore stay at the in-memory + real-guard + official-meter level, and any "does it actually
   load" criterion must be stated as a manual/differently-configured-session step (which is also
   what the handoff's trap list says).
6. **`scripts/token-price-evidence.mjs` and `translate-legacy-traces.mjs` were not read.** The
   former is the evidence script behind the `shadowedTokenCount` price semantics and may be relevant
   if our spec adopts the audit segment.
