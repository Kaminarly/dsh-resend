# dsh-retrace — prior art for edit-and-resend / regenerate

Source studied: `C:\Users\Administrator\.dsh\profiles\desktop\node_modules\dsh-retrace\` (v0.4.32, MIT, read-only).
DSH platform source consulted for verification: `D:\DSH Desktop\resources\app\node_modules\@deepseek-ai\...`.

**Citation convention.** Plugin paths are relative to the plugin root (`lib/...`). Platform paths are written `@pkg/lib/file.js:line` and mean `D:\DSH Desktop\resources\app\node_modules\@deepseek-ai\<pkg>\...`.

**Evidence labels.**
- `CODE` — read out of the implementation.
- `COMMENT` — stated in the plugin's own source comments (the author's design notes, often with root-cause narratives).
- `README` — stated in `README.md` / `README.zh.md`.
- `PLATFORM` — verified by reading the DSH platform source in the checkout (not this plugin).
- `INFER` — my inference, flagged as such.

---

## A. What dsh-retrace actually is

dsh-retrace is a **conversation-surface versioning layer** for DSH Desktop/Web. It gives three user moves — **Recall (撤回)**, **Edit & re-send (编辑重发)**, **Regenerate (重新生成)** — plus a **version timeline**, **artifact (file) rollback**, and a **fork map**. Its stated framing is "the **Agent business layer (production-grade guarantees)**" (`README.md:5-7`), sold on the observation that "rewinding is not just 'delete a message'" because "changed **artifact files stay changed**" (`README.md:19-25`).

**The core metaphor is two layers, not one** (`README.md:245-251`, `CODE`):

| Layer | Property |
|---|---|
| **durable transcript** | append-only; old events are **never rewritten or deleted** |
| **model-visible surface** | a *folded* projection over the log, rewound by **appending a replacement event** |

> "Persistence, projections and the transcript remain consistent because the plugin only appends valid, typed session events." — `README.md:250-251`

So its relationship to the platform primitives is:

- **Session history**: read-only. It is an audit trail. The plugin never deletes or truncates it.
- **Forking**: **it does not fork.** `sessions.fork` and `atSeq` appear **zero times** in the entire `lib/` tree (`CODE`, exhaustive grep). Every rewind happens *in the same session*, in place, on the surface.
- **Rollback**: not a log operation either — it is "append a shadow marker covering the nodes added after the version boundary" (`lib/rollback.js:6-10`, `CODE`), i.e. reverse-application through the same mechanism.
- **Message versions**: a "version" is **a boundary event**, i.e. *one surface replacement*. `versionId = v<boundarySeq>` (`lib/version-index.js:183-192`). Versions are a **timeline of rewinds**, not a per-message alternatives list (see §C).

It is a heavy plugin: ~18k lines of `lib/`, 40+ modules, its own companion package (`dsh-log-contract`), its own CLI (`bin/retrace.mjs`), dynamic-plugin variants, and a 36 KB README that is largely a **post-incident engineering log**.

---

## B. The history-rewriting mechanism

### B.1 The primitive: `surfaceOp: { op: 'replace' }`

Everything rests on one platform feature. `CODE` + `COMMENT` at `lib/host-core.js:7-16`:

> "the model-visible *surface* supports positional replacement (the same primitive compaction uses): a new surface-eligible event carrying `surfaceOp: { op: 'replace', start, end }` shadows every node in `[start..end]` from the derived model history."

Platform confirmation (`PLATFORM`):
- `@dsh-session/lib/index.js:1401-1405` — `append(type, data, ...opts)` merges `opts[0].surfaceOp` and `opts[0].sourceEventSeqs` into the event.
- `@dsh-session/README.zh.md:50` — "替换操作仅接受 `{ op: 'replace', startSeq, endSeq }`，端点为包含边界的 `SessionSeq`，按当前 surface 顺序解释" — **the current host accepts only `startSeq/endSeq`**. The `{start,end}` spelling the plugin's code mostly talks about is the **v0 host** shape; the plugin probes at runtime which one to write (`lib/adapter/dsh-writer.js:249-255`, `CODE`).
- `@dsh-session/lib/index.js:262-267` — a replace **must** list every shadowed surface node in `sourceEventSeqs` ("surface replace: sourceEventSeqs must include every shadowed surface node").
- `@dsh-session/lib/index.js:313` — `assistant/message` **cannot** carry `sourceEventSeqs` (throws).
- `@dsh-session/lib/surface.js:213-218` — non-surface-eligible events must not carry `surfaceOp`/`sourceEventSeqs` at all (throws).

**This is the single most transferable fact in the whole study: DSH has an in-place, append-only, non-destructive "rewind the model context" primitive, and it is the same one compaction uses. You do not need `sessions.fork` to do edit-and-resend.**

### B.2 "Boundary" — the plugin's own vocabulary

"Boundary" is used in two distinct senses; conflating them is a trap.

**Sense 1 — a replacement event (the primary sense).** A boundary is *the event that closed a version*:

> "an append pushes the event seq onto the surface; a replace splices `[start..end]` out and inserts the replacement's own seq. **Every replacement event closes a 'version'** — our markers (recall / edit / regenerate / restore), compaction checkpoints, or any other future surface replacer." — `lib/version-index.js:12-19` (`COMMENT`)

- Represented as **`boundarySeq`** = the replacement event's `seq` (`lib/version-index.js:184`).
- Kind classified by `classifyBoundaryKind` (`lib/version-index.js:87-92`) into `recall | edit | regenerate | restore | compaction | replace`.
- Predicate: `isReplacementSurfaceEvent(event)` = surface-eligible **and** `surfaceOp !== 'append'` (`lib/version-index.js:53-60`).

**Sense 2 — a "read point" / rewind target** in the read-side modules, where a boundary is a *row in the version list* with a digest of what it discarded. This is where `boundary-*.js` lives.

The four `boundary-*.js` modules are **read-side presentational derivations, not the write mechanism**:

| Module | What it computes | Citation |
|---|---|---|
| `boundary-derive.js` | Read-side **fallback** digest for boundaries that have **no stored artifact record**. "Authority order: a STORED record always wins." Recomputes "what did this boundary throw away?" from the log. | `lib/boundary-derive.js:1-23` (`COMMENT`) |
| `boundary-now.js` | The **counterpart that lives in the conversation TODAY**: "an entry could say WHAT it replaced … but never WHERE it was replaced FROM. The user's words: 「这个条目，现在是什么我并不知道」". Indexes `retrace-resend-*` nodes (edit/resend) and host assistant replies (regenerate). | `lib/boundary-now.js:1-27` (`COMMENT`) |
| `boundary-tree.js` | The **outline forest** — "which change landed inside which discarded set". | `lib/boundary-tree.js:1-31` (`COMMENT`) |
| `boundary-what.js` | The **digest payload** — "what did this boundary change?" Frozen shape `{op, at, new:{excerpt}, replaced:[…], replacedMore?, artifacts?}`. Built at **operation time**, stored in a **plugin-owned artifact**. | `lib/boundary-what.js:1-32` (`COMMENT`) |

**Boundary identity/ordering/nesting.**
- Identity: `boundarySeq` (an integer log seq). `versionId` is `"v" + boundarySeq` (`lib/version-index.js:257`).
- Ordering: append order (ascending seq); the fold appends records in order (`lib/version-index.js:266`), truncated to `VERSION_LIMIT = 200` keeping the most recent (`lib/version-index.js:40, 267`).
- **Nesting is derived, not stored**: parent(C) = the boundary B whose discarded set **contains C's own event seq**, choosing the **smallest such |S(B)|** (`lib/boundary-tree.js:9-13`). The author explicitly records that the naive `S(C) ⊆ S(B)` rule **failed** on real data ("`|S(child) ∩ S(parent)| = 0` for every one of the 8 links of the real 9-layer chain") and would yield a degenerate 1-parent/depth-1 forest instead of the real 14-parent/depth-9 (`lib/boundary-tree.js:14-23`). Cycle guard via memo-set-to-0 (`lib/boundary-tree.js:113`).

**Span semantics.** The rewind range is a *span* `{start, end, shadowedSeqs}`. `lib/span-semantics.js` is declared the single source of truth for slicing rules and explicitly replaced "return null carrying four meanings" with an explicit 5-state enum (`lib/span-semantics.js:6-10, 34-51`, `CODE`):

```
SPAN_STATUS = { OK, NOT_FOUND, ALREADY_SHADOWED, NOT_PERSISTED, REPLAY_FAILED }
SPAN_MODE   = { ROUND, TAIL }
```

- `ROUND` = the target's **exchange round** `[round start .. round end]` — the semantics for edit and regenerate ("输入 + 它的回复一起回退").
- `TAIL` = `[round start .. end of surface]` — the semantics for recall / "start fresh".
- Round boundary predicate: **`event.type === 'user/message' && event.data.source.kind === 'user'`** (`lib/span-semantics.js:74-76`). This is load-bearing: the runtime also appends `user/message` for injected context/steering; treating those as round boundaries would shift every span.

### B.3 What `rollback.js` actually does

`lib/rollback.js` (268 lines) is a **surface rewind + file restore** executor, not a log operation. `CODE`:

```
scope 'context'   — append an invisible replacement marker shadowing every
                    surface node added AFTER the version boundary … (git-checkout
                    semantics: the rewound content stays in the durable log as a
                    later version — non-destructive, auditable)
scope 'artifacts' — restore files (git checkout, else content-addressed snapshot
                    read-back via ctx.fs, with subprocess rm for deletions)
scope 'both'      — context first, then artifacts
```
— `lib/rollback.js:5-19` (`COMMENT`)

Mechanically (`CODE`):
1. `contextDiff(session, record)`: `foldSurface(events.slice(0, boundarySeq + 1))` → `targetNodes`; diff = current surface nodes **not** in `targetNodes` (`lib/rollback.js:89-101`).
2. If the diff is non-empty: build `span = {start: diff[0], end: diff[last], shadowedSeqs: diff}` and call the **same** `writeMarker` the edit/regenerate path uses, with `op:'restore'` (`lib/rollback.js:260-272`).
3. Artifacts: git-first, snapshot fallback, `rm` via `ctx.subprocess.spawn` for deleted files, guarded by `ctx.fs.contains(root, target)` realpath-in-workspace checks (`lib/rollback.js:103-111, 165-198`).
4. `preview()` is a no-side-effect dry run and is expected to run before `execute()` (`lib/rollback.js:143-163, 247`).

**It does `sessions.fork` nowhere. It writes to the same session. It never truncates.** What happens to the abandoned suffix: **the events remain in the log forever**; they are simply no longer on the surface (the replacement splices them out and inserts the marker's own seq in their place — `lib/version-index.js:307-310`).

### B.4 The write path: `adapter/dsh-writer.js` — the two-segment carrier

This is the key file. "Committed events are never rewritten" holds: **it appends two new events.** `CODE`:

```
第 1 段 `compaction/prune`(log-only 审计):
  data = { shadowedRange:{start,end}, shadowedSeqs:[…], shadowedTokenCount:n }
第 2 段 `user/message`(真正遮蔽):
  data = { role, id, content, source }
  surfaceOp = {op:'replace',start,end}(v0) / {op:'replace',startSeq,endSeq}(v3)
  sourceEventSeqs = [<第 1 段 seq>, …全部被遮蔽节点]
  source.kind = 'model'(≠'user')
```
— `lib/marker-carrier.js:15-30` (`COMMENT`)

Write sequence in `createDshMarkerWriter().writeMarker` (`lib/adapter/dsh-writer.js:216-341`, `CODE`):

1. `assertSpanShape(span)` — contract check before any write.
2. Look up the last known model via `lastModelSource(session)` (`request/header` config, else last `assistant/message` source); **throw `no-model-header`** if absent (`:223-229`). The carrier needs `provider`/`model` because `source.kind === 'model'` requires non-empty strings (`lib/marker-carrier.js:28-30`).
3. Build `data` with `content` that is **never empty** — `carrierContentOf` prefers caller text, then an injected deriver, then the frozen notice `TRACE_TEXT = '（此处内容已被撤回：原消息已归档，可在恢复视图中查看）'` (`lib/adapter/dsh-writer.js:45-71`, `lib/marker-carrier.js:74`). Reason (`COMMENT`): `content: []` projects to an empty `role:'user'` message, which reads as "the user sent an empty message".
4. Choose the `surfaceOp` key shape at runtime (`runtimeSurfaceOpShape()`) (`:249-255`).
5. **Run all validations before any append**: `assertMarkerShape` on a preview, then `validateMarker(..., {phase:'pre'})` (business gate), then compute the official token price, then `assertAuditShape`, then `validateMarker(..., {phase:'pair', audit, auditSeq})` with the planned audit event synthesised into the event list (`:266-317`).
6. **`plannedAuditSeq` race loop**: re-read `nextAppendSeq(session)` and re-validate, up to 3 attempts; if it keeps moving → throw `marker-pair-race` with **nothing written** (`:302-317`).
7. **Synchronous write segment, no `await` between the two appends** (`:318-337`): `appendAudit(...)` then `session.append(CARRIER_EVENT_TYPE, data, {surfaceOp, sourceEventSeqs: [auditSeq, ...shadowed]})`.
8. `rearmClaim` — if a concurrent event landed between audit and carrier, re-append the audit and use the new seq (`:331-335, 367-376`).
9. `assertPairing` — post-write reconciliation: `sourceEventSeqs[0] === auditSeq && carrier.seq === auditSeq + 1 && eventAt(auditSeq).type === 'compaction/prune'`; otherwise throw `marker-pair-unpaired` (`:390-402`).

**Why a *pair*, and why `user/message` and not `assistant/message`** (`COMMENT`, `lib/adapter/dsh-writer.js:17-29`, `lib/marker-carrier.js:6-13`):
- `assistant/message` is "structurally out" because the official v3 tree refuses provenance on it and the v1→v2 migration edge unconditionally strips its `sourceEventSeqs`. (Confirmed `PLATFORM`: `@dsh-session/lib/index.js:313`.)
- `user/message` is "the **only one** of the four surface-eligible types that can do an arbitrary multi-node range replace" (`tool/result` is single-node; `system/message` can't in v0).
- The audit segment exists because the official **shadow-price protocol** requires a `compaction/prune` claim immediately adjacent to the replace, and the official `dsh-token-meter` consumes it as a **token price**, not a node count (`lib/adapter/dsh-writer.js:154-191`, `COMMENT`). Writing the node *count* would make `surfaceTokens` drift and **prematurely trigger compaction**.

### B.5 The hazards — what the four guards defend against

These are the warnings our spec must absorb. Each is backed by a real incident in the author's comments.

#### `prewrite-guard.js` — "the write must be validated before it lands"

- **Hazard**: `COMMENT` at `lib/prewrite-guard.js:4-9`:
  > "事故（2026-08-25）第 1 轮失败就是'违约写入没被拦'：surface-replace 的 `sourceEventSeqs` 被清空后写盘 → 会话加载抛 `SessionPersistenceCorruptionError`；第 2 轮把 marker 改成 append → 客户端引擎崩溃（rt.js:6816）。"
- **Trigger**: a `{phase:'pair'}` envelope that `dsh-log-contract`'s `createPreWriter(...).validateAppend(...)` rejects (S5 coverage / M1 engine / P1–P2 marker semantics / S8 foldSurface final check). Also an explicit check: **the envelope must not carry a fabricated `seq`** — "带一个假 seq（历史硬编码 0）会被判 `[E2] seq 0 不连续：倒退, 期望 N` → `[S6]` → `[S8]` 三连" (`:158-171`).
- **Business gate before the contract gate**: `rollbackShareOf` — refuse an in-place rewrite that shadows a large range of a large session (`:71-99`). Thresholds: `ROLLBACK_MIN_SHADOWED = 40` nodes are always allowed; a session only counts as "large" above `ROLLBACK_MIN_EVENTS = 2000` events. The author explicitly **abandoned a ratio-based** rule because the host's `surface.nodes` can be windowed (~12 nodes), making 12/12 = 100% and blocking edits to the latest message (`:49-62`). `restore` markers are exempt (`isRestoreMarker`, `:76-80`).
- **Remedy**: throw `marker-rejected` / `rollback-guide`, **nothing is written**. Degrades silently if `dsh-log-contract` cannot be imported (`:148-157`).

#### `close-guard.js` + `close-guard-client.js` — "don't lose work by accident"

- **Hazard**: closing/quitting with live work (agent running, queued inbox, background jobs, unclosed turns) loses progress (`lib/close-guard.js:6`).
- **Finding that matters**: **there is no host seam for "before session close".** `COMMENT` at `lib/close-guard.js:12-20`: "host/client 均无'会话关闭前'插件钩子… 可用的退出时机 = 插件 dispose". The delivered substitute is detection + a dispose-time warning + a queryable `runningState` op.
- **The desktop deadlock** — the single most instructive hazard in the repo. The client armed `beforeunload` `preventDefault()`; DSH Desktop's Electron shell has **no `will-prevent-unload` handler** (the author grepped the packaged `app.asar`: 0 hits), so Electron silently honours the veto and shows nothing → **the app cannot be quit at all**; disabling the plugin's "exit confirmation" setting immediately fixed it (`lib/close-guard.js:26-43`, `lib/close-guard-client.js:7-38`, `README.md:445-471`).
- **Remedy, after two failed attempts**: never arm the native gate on desktop. Four request-level criteria (`x-dsh-desktop-renderer` header, UA containing `Electron`, URL **or `Referer`** containing `dsh-desktop-`) plus a client-side **veto** (`navigator.userAgent` / page URL) — "宿主说'可以武装'只是'不反对'，两者都为真才武装" (`lib/close-guard.js:68-90`). Then a **page-drawn confirm gate** that only calls `preventDefault()` *after* it has drawn the box and synchronously verified visibility; if it cannot draw, is not visible, or the page is hidden, it **lets the close through immediately** (`README.md:442`). A Web-Worker watchdog is the last resort.
- **Rule**: "只检测+提示，绝不中断/取消 agent、绝不写事件" (`lib/close-guard.js:19-20`).

#### `interrupt-guard.js` — "unclosed turns exist, and you must not repair them"

- **Hazard**: a session with `turn/start` and no `turn/end` (crash / force-kill / power loss) may trigger stale-cursor replay on restart.
- **Critical calibration finding**: `turn/end` with `reason.kind ∈ {'interrupted','aborted'}` is **normal closure** written by the official agent loop's `finally`. Treating those as unclosed would emit misleading warnings for **91% of sessions** — "archive 实测 69 会话中 666 aborted + 126 interrupted 全是正常闭合、真 open 只 10 个" (`lib/interrupt-guard.js:30-36`).
- **Remedy**: detect + log only. Explicitly **never writes `turn/end`**: "与官方持久化竞态会引入双写；且插件不应在运行期补写持久化事件" (`lib/interrupt-guard.js:14-17`).

#### `watchdog.js` — "another writer is appending to this session file"

- **Hazard**: `COMMENT` at `lib/watchdog.js:4-8`:
  > "`dsh-session-persistence` 的 `appendCore` 只断言「事件 seq == 进程内 cursor」（lib/index.js:835），**不复查文件尾部**——另一进程/旧光标写入时，文件尾部 seq 会领先于本进程内存会话长度，且没有任何写入路径会发现它。"
- **Trigger**: poll every 10s over recently-active sessions; compare the **file's last seq** (via `dsh-log-contract`'s `tailSeq`) against the **in-memory event count**. **One direction only**: `fileSeq > memoryLength` → anomaly. `fileSeq <= memoryLength` is normal (unflushed local appends) — checking the reverse "必误报" (`lib/watchdog.js:9-13`).
- **Remedy**: byte-level snapshot of the session file to `<pluginDataHome()>/dsh-retrace/snapshots/<id>-<ts>.jsonl.zstd` + one warning per session per 5 minutes (`lib/watchdog.js:97-105, 184-195`).
- **Two traps recorded**: (a) `memoryLengthFor` returns **`null`, not `0`**, when the session isn't in this process's memory view — returning 0 made `fileSeq > 0` always true and snapshotted every session every 5 minutes (`:150-166`). (b) **Do not use `ctx.setInterval`** — "cordis ctx 是 Proxy，访问未 inject 的 `timer` 属性直接抛 'cannot get property \"timer\" without inject'（实测启动崩溃）"; use global `setInterval` and call `.unref()` or the interval **pins the host process and blocks quit** (`:49-52, 117-125`).

### B.6 `lib/platform/session-paths.js` — disk layout

`CODE`. The module exists because four files each hard-coded a path and diverged across a "base generation" migration (`:1-7`).

Session roots, ordered (`sessionRoots`, `:67-76`):
1. `$DSH_HOME/sessions` (only if `$DSH_HOME` is set),
2. `~/dsh-v3/sessions` (new base),
3. `~/.dsh/sessions` (old home).

`activeSessionsRoot()` = **the first of those that actually exists** (`:83-89`). Session filenames: **both** `session.v3.jsonl.zstd` and `session.jsonl.zstd` are accepted; when both coexist in one session dir, the one with the newer `mtime` wins (`SESSION_FILE_NAMES`, `:37-40`; `pickSessionFile`, `:129-141`). Layout: `<root>/<workspace-dir>/<sessionId>/<session file>`.

Plugin data home (`pluginDataHome`, `:91-127`) — deliberately **same-source as the session base**, not the official `resolveDshHome()`:
> "官方只认 `$DSH_HOME → ~/.dsh`，不认识 `~/dsh-v3`。插件数据若走官方口径 … 就会「会话读 `~/dsh-v3`、快照/存储写 `~/.dsh`」——数据自洽但**存储分裂**" (`:95-98`)

Order: (1) `$DSH_HOME` if non-blank (normalised exactly like the official resolver); (2) `dirname(activeSessionsRoot())`; (3) the existing base dir; (4) `~/.dsh`.

What lives where (`CODE`):

| Artifact | Path | Format |
|---|---|---|
| Plugin data root | `<pluginDataHome>/dsh-retrace/` | dir |
| File snapshots (CAS) | `<pluginDataHome>/dsh-retrace/objects/<sha256[:2]>/<sha256>` | content-addressed bytes |
| Watchdog snapshots | `<pluginDataHome>/dsh-retrace/snapshots/<id>-<ts>.jsonl.zstd` | byte copy of the session file |
| Boundary digests / summaries | `<pluginDataHome>/dsh-retrace/summaries/<sessionId>.jsonl` | append-only JSONL |
| Refcounts + global config + version-git facts | `$DSH_HOME/storages/retrace.json` | `storageDomain` JSON (`lib/artifact-store.js:56-74`) |
| Short codes | `<pluginDataHome>/dsh-retrace/codes.json` (override via `DSH_RETRACE_BADGE_TABLE`) | JSON table |

Durability recipe for the CAS store is copied from the official attachment store: stage in tmp → `O_EXCL` write → `fsync` → **hardlink publish** → directory `fsync` → integrity-verified reads (`lib/artifact-store.js:12-17`). `mode: 0o700` dirs, `0o600` files (`lib/watchdog.js:191-194`).

---

## C. Message versions and the fork map

### C.1 Does it implement navigable alternatives per message? **No.**

`CODE`. A "version" is **one boundary** — one surface replacement — identified by `versionId = "v" + boundarySeq` (`lib/version-index.js:257`). The wire view (`viewVersionIndex`, `lib/version-index.js:364-381`) is a **flat, append-ordered list**:

```
{ versionId, boundarySeq, createdAt, kind, markerText, messageCount, fileCounts, touchedFiles, git }
```

There is **no grouping key that says "these N versions are alternatives of the same message"** and **no prev/next affordance**. `CODE` search for variant/alternative/switch-version logic in `client.js` returns nothing. What the UI offers instead (`README.md:82-84`, `CODE` in `RetraceView`, `lib/client.js:2533`):

- **Timeline** — a `conversation.view` tab listing every boundary (type, time, message count, file badges), pushed live via `session/projection` (no polling), with an HTTP `/versions` fallback.
- **Jump-to-conversation** — one click scrolls to that point; it pages the chat store with the official `store.loadThrough(seq)` until the anchor seq is loaded, then scrolls it into view and flashes it (`lib/client.js:1697, 1717-1725, 1922, 2654-2655`).
- **Restore to this version** — a rollback with a dry-run preview and a scope choice (context-only / artifacts-only / both).

**So the ordering is global (append order), and the linkage is the derived outline forest of §B.2, not a per-message DAG.**

### C.2 The fork map

`CODE`. Two files, deliberately split:

- `lib/forkmap.js` — the **pure fold** (the state machine).
- `lib/projection/forkmap.js` — the **projection unit definition** (the zod schemas + registration envelope).

`COMMENT` definition (`lib/forkmap.js:1-35`):

> "The fork map is the BRANCH-TOPOLOGY presentation layer ('how we got here'): every surface replacement — recall / edit / regenerate / restore markers, compaction checkpoints, and any other replace — is a **FORK POINT** that shadows a range of the old path and continues a new path."

State (`createForkmapState`, `:45-52`): `{ nodes: [{seq,type}], boundaries: [{seq,kind,replacedSeqs}] }` — the current surface as a spine, plus every boundary with the seqs it shadowed.

**What problem it solves** — two things the versions list cannot express:
1. **Where the old path went.** The shadowed nodes are the "branches".
2. **Which session this one came from.** The **session lineage** A4 feature walks `header.parentSession` child→root with cycle protection (`lib/versioning.js:378-399`), surfaced via `GET /api/plugins/retrace/lineage?sessionId=` and the CLI `retrace lineage` (`README.md:610-615`).

**Direction of the mapping**: for *session* lineage it is **child → parent** only, by walking `session.header.parentSession` upward. There is **no parent → children index and no fork-point seq** for sessions in this plugin — i.e. the fork map does **not** track `sessions.fork({atSeq})` relationships. It has no notion of `atSeq` at all (`CODE`, zero hits).

**Within one session**, the topology is the boundary forest of §B.2, keyed by `boundarySeq` and rebuilt from discarded-set membership (`lib/boundary-tree.js:68-126`). Persistence:
- The **projection fold state** is persisted by the framework's projection cache; the fork-map state is **deliberately not truncated** ("VERSION_LIMIT=200 truncation would drop old fork points", `lib/projection/forkmap.js:15-19`).
- The wire view is **separate from the state schema** and strips `digests`/`pendingSeq`: "the view is ~92 KB smaller without them" (`lib/projection/forkmap.js:47-55`).
- **Rebuildable from the log alone** — both folds are pure functions of committed events, so they are **caches, not sources of truth**.

**Collision handling** (`CODE`): the tree takes "latest record wins per boundary (the artifact is append-only)" (`lib/boundary-tree.js:70-75`), and equal-size parent candidates are tie-broken by nearest seq then lowest seq (`:47-53`). The fold's `replacedSeqsOfBoundary` prefers the **live splice's** shadowed seqs and falls back to "the marker's own citation minus its audit guide item" — "never a numeric window" (`lib/version-index.js:213-229`).

### C.3 Where versions actually live — the reconciliation

This is the subtlest part of the design, and the answer is **three different places for three different things**:

| Thing | Where | Rebuildable? |
|---|---|---|
| The **fact** that a boundary exists, its kind, its time, its message count, its touched files | **Derived** purely from the log, by the `retrace/versions` projection fold (`lib/version-index.js:287-332`); persisted only as a framework-owned projection checkpoint cache | Yes — pure fold |
| The **human-readable digest** of *what* was replaced (`what`, excerpts, artifact counts) | **Plugin-owned sidecar artifact**: `<pluginDataHome>/dsh-retrace/summaries/<sessionId>.jsonl`, append-only JSONL keyed by `boundarySeq` + `contentHash` | **Partly.** `boundary-derive.js` recomputes it from the log **when the originals are still there**; "once compaction removes those events, the log can no longer reproduce it" (`lib/boundary-derive.js:1-23`) |
| **File contents** at a version | Content-addressed objects + `retrace` storageDomain refcounts | No — but it's the only copy and it's GC'd by refcount |

And critically — **the plugin deliberately does not put its own event types in the log**:

> "NOT in the host session log (a plugin-owned event type without the `ignorable` marker makes the host persistence reader refuse the whole log) and NOT in the projection wire or the durable checkpoint (that tax is paid on every append; measured +70.8%/+93.7%)." — `lib/boundary-what.js:11-15` (`COMMENT`)

**So the reconciliation rule is:** the log is the source of truth for *what happened* and is the only input to the folds; sidecars hold only *derived-but-expensive* or *plugin-owned* content, always with the log winning on conflict (`lib/boundary-derive.js:16-18`: "a STORED record always wins … This module is the fallback, never an override").

The one thing the plugin *does* write into the log is the **carrier pair** — and those are **official event types** (`compaction/prune` + `user/message`) carrying plugin-recognisable ids, not custom types. Custom types were a **shipped mistake**: `retrace/goal-marker` and `retrace/marker` are outside the official v0 frozen manifest, and the v0→v1 migration edge **refuses all unknown historical event types**, making those sessions **permanently unmigratable** (`lib/marker-carrier.js:81-117`, `COMMENT`). The fix was to *translate* them in place into `feedback/record` — the one official type that is free text + zero coordinates + zero state machine — because deletion was rejected.

### C.4 `message-list.js`

`CODE`. It is the abstraction the author considers the "first capability of the agent business layer" (`lib/message-list.js:4`), with an explicit philosophy:

> "日志层：客观记录一切消息事件 + 编辑/撤回操作（append-only，永不改写）；业务层（本模块）：按业务规则推导「当前对话 = 哪些消息」…；渲染层：消费本模块输出的消息列表，与日志如何表达（DSH surface/replace/turn）无关。"

It is **pure** (imports only `span-semantics.js`) and knows exactly two abstractions: `messages` (`{seq, role, turn, text}`) and `shadows` (`{seqs?}` or `{start,end}`). `projectMessageList` maps each message to `status: 'active' | 'shadowed'` (`:42-61`); `shadowed` is **retained for audit**, not dropped.

**Important for us**: `message-list.js` is **not** what the shipped UI renders from, and it is **not** the source of the node map. The client reads chat nodes from the host's `useChat` snapshot instead. `message-list.js` has **no event-type table** and does no event filtering — the adapter is responsible for producing the minimal message shape. So it is a *design artefact / target abstraction*, largely unused by the live path. `INFER`: treat its philosophy (log layer / business projection / render layer separation) as the transferable part, not the code.

---

## D. Its UI surface

### D.1 Slots registered (exhaustive, `lib/client.js`)

| # | Slot key | Kind | file:line | Renders |
|---|---|---|---|---|
| 1 | `conversation.chat.assistant-actions` | list (child of `turn-tail`) | `lib/client.js:4014-4019` | `AssistantActions` — recall / regenerate strip |
| 2 | `conversation.chat.node` | keyed, `key: 'user-actions'` | `lib/client.js:4021-4025` | `UserActionsRow` — edit/recall row **under** a user message |
| 3 | `conversation.chat.node` | keyed, `key: 'retrace-reference'` | `lib/client.js:4027-4031` | `ReferenceRow` — collapsible "original input" block |
| 4 | `conversation.chat.node` | keyed, `key: 'recall-marker'` | `lib/client.js:4033-4037` | `RecallMarkerRow` — notice + CSS row-hiding |
| 5 | `conversation.view` | tab | `lib/client.js:4043-4055` | `RetraceView` — the version timeline / fork map |
| 6 | `settings.general.item` | list | `lib/client.js:4057-4062` | `OptionsRow` — 6 preference toggles |

All six go through `mountSlot` (`lib/client.js:4005-4012`), which wraps `ctx.slots.inject(seat, () => ctx.slots.register(...))` and counts seats for a self-report (`seats` = 7 attempts, `slots` = landed registrations — `lib/client.js:3913-3917`).

**Answers to the specific questions:**
- `conversation.chat.assistant-actions` — **yes**, registered (`:4014`).
- `conversation.chat.node` — **yes, three keys**, all *new* kinds: `user-actions`, `retrace-reference`, `recall-marker`.
- A user-message actions slot — **no.** `PLATFORM` confirms there is none: the shipped `conversation.chat.node` keys are `user, steering, context, turn-trigger, system-prompt, assistant-step, command, manual-compaction, compaction, model-retry, turn-error, turn-max-tokens, turn-process, turn-tail, unknown` (`@dsh-client-ui-chat/lib/client.js:6711-6801`), and `conversation.chat.assistant-actions` is a **list child of `turn-tail`**, rendered with `{messageId}` (`@dsh-client-ui-chat/lib/client.js:6523, 6786-6795`).
- Composer/input slot — **no dedicated slot**; it uses the `inputActions` **standard prop** (§D.4).
- Footer/toolbar/sidebar — none. Views go through `conversation.view`; settings through `settings.general.item`.

### D.2 The missing user-actions slot: does it shadow `key: 'user'`? **No — and this is the elegant part.**

`PLATFORM`: `renderSlot("conversation.chat.node", routedOwner, { entryKey: routedNode.kind, ... })` (`@dsh-client-ui-chat/lib/client.js:1770-1778`) — **the keyed slot's key IS the chat node kind.** The shipped user bubble is `{name:'conversation.chat.node', key:'user'}` → `UserMessageNodeView` (`@dsh-client-ui-chat/lib/client.js:6711-6715`). Registering `key: 'user'` would replace it.

dsh-retrace instead **manufactures new node kinds** via Conversation Definitions and registers renderers for those kinds:

```js
const userActionsDefinition = {
  kind: 'retrace-actions',
  target: 'chat',
  match: (event) => (
    event.type === 'user/message'
    && event.surfaceOp === 'append'          // only real appends, not replacements
    && event.data.source?.kind === 'user'    // only real user input, not injected context
      ? { id: String(event.data.id), role: 'start' }
      : null
  ),
  start: (_context, match) => ({ seq: event.seq, time, messageId, content }),
  update: (context) => context.state,
  buildViewNode: (context) => chatNodeLike(context, 'user-actions', context.state.seq, context.state),
}
```
— `lib/client.js:592-617` (`CODE`)

`chatNodeLike` (`:579-590`) emits `{key, kind, id, target:'chat', anchorSeq, location, visibility:'visible', data}`. Note **`anchorSeq = the message's seq`** — the row is ordered next to the message it belongs to purely by seq. The reference row uses `seq - 0.5` to sort **above** the message (`:646`).

The four Definitions are registered through `conversationRegistrar` (`:3848-3858`), which resolves `service.events.register` **first** and `service.register` second, and returns `null` if neither exists. **Why this indirection exists** is one of the best-documented incidents in the repo (`:3895-3911`, `CODE`/`COMMENT`):

> "0.4.26 把注册入口当在**服务自身**上，而 2.0.9 的 uiConversation 把注册表放在 `.events` 上 … ⇒ 守卫 `typeof conversationEvents.register === 'function'` **恒 false** ⇒ 四个 Definition 静默不注册 ⇒ user-actions 行 / marker 节点 / 编辑参考行全都不出现（用户看到的就是"没有编辑和撤回了"），而 boot 全绿、无任何报错。"

And the follow-on rule (`:3906-3910`): **do not put the optional service name in the static `export const inject`** — on a host that lacks it, the plugin row stays pending forever and `assertEntriesActive()` throws, which means **the whole renderer fails to boot**. Use a `ctx.inject([...])` child fiber instead; child fibers are not loader entries, so waiting forever is harmless.

`PLATFORM` corroborates the pair rule: `assertDefinitionTarget` throws unless `target` and `buildViewNode` are declared **together** (`@dsh-client-ui-conversation/lib/client.js:2688-2689`), and a definition without `buildViewNode` is skipped when building view nodes (`:2437-2438`). That is exactly how `auditContextDefinition()` works — it declares no `target`/`buildViewNode` and exists **only** so the reader can fetch an adjacent context by kind (`lib/marker-carrier.js:396-414`).

### D.3 Per-message affordances

**On an assistant reply** — `AssistantActions({messageId, sessionId, useChat, t})` (`lib/client.js:1107`), rendered into the `assistant-actions` strip. It resolves the message's seq via `useMessageSeq(useChat, messageId)` (`:756`), then renders recall + regenerate, suppressed by two independent predicates: `useSeqHidden` (visually hidden) and `useShadowed` (operationally impossible — "a shadowed message can never be edited/recalled again (the host rejects it with `target-shadowed`), so its action entries must be hidden even when the row itself stays visible") (`:1185-1196, 952-971`).

**On a user message** — `UserActionsRow({node, sessionId, useChat, inputActions, t})` (`lib/client.js:1183`). This is worth being precise about because it is **not** "the bubble becomes an edit box":

- The row renders **below** the bubble (a separate chat node, `anchorSeq = message.seq`).
- Idle state: two chips `编辑` / `撤回` (`:1278-1295`).
- Editing state: the row itself swaps to a `<textarea rows=3>` + `发送` / `取消`, seeded with `textOf(content)` via `setDraft` on open (`:1198-1202, 1247-1277`).
- **The bubble itself is never touched.** The "in place" feeling comes from the row occupying the message's slot in the flow.

**Hide mechanism (the actual view/context sync).** The `recall-marker` node injects a `<style>` tag with `[data-chat-anchor-key="<key>"]{display:none!important}` for every hidden row (`lib/client.js:1318-1320, 1336`). The hidden key set comes from `hiddenKeysFor(shadowedSeqs, nodes)` (`:802-834`), which handles three special cases: `turn-tail` (match `node.data.closing.finalNode.seq`), `tool-call` (match `node.data.root.seq`, because the tool row anchors at a **log-only** `tool/call` seq that is never a surface node), and pseudo rows anchored at half-seqs (`Math.ceil` before matching). `PLATFORM` confirms the DOM contract is real: the shipped chat flow item sets `"data-chat-anchor-key": flowKey` and `flowKey = routedNode.key` for ungrouped/response rows (`@dsh-client-ui-chat/lib/client.js:1756-1761`).

**The safety guard on hiding** (`CODE`): a single marker that would hide more than `SHADOW_SAFETY_RATIO = 0.4` of rows **degrades to notice-only** — the row stays visible and a hint is shown. Short sessions (≤ `SHADOW_MIN_ROWS_FOR_RATIO = 20` rows) are **exempt**, because a small session hitting 40% is a false positive (`:780-795`, `COMMENT`). Plugin pseudo-kinds are excluded from the denominator: "counting them diluted the 40% guard to ~55-68% of real rows" (`:855-869`). A collective ratio across stacked markers triggers an advisory hint (`:1330-1333`).

**A performance lesson worth copying**: `useSeqHidden` originally rescanned the node map per row — measured **346 ms at 2000 rows/20 markers, 1568 ms at 3000/30**. It now computes **one hide plan per snapshot** (memoised on snapshot reference identity) and every row queries it in O(1): **8.3 ms / 18.3 ms** (`README.md:355-359`, `lib/client.js:871-937`).

**Composer echo.** After a recall, the recalled text is echoed into the composer:

```js
if (echoed && inputActions && typeof inputActions.setDraft === 'function') {
  inputActions.setDraft(echoed)
}
```
— `lib/client.js:1223-1225` (`CODE`)

### D.4 Custom Chat rows and the `inputActions` prop — new APIs for our spec

**No `ctx.uiConversation.events.register()` direct call**: the plugin goes through `conversationRegistrar(ctx.get('uiConversation'))` → `service.events.register(definition)` (`lib/client.js:3848-3858, 3973-3979`).

**`inputActions` is a standard slot prop**, not a service lookup. `PLATFORM`:
- `@dsh-client-ui-conversation/README.zh.md:12` — "通过 `ctx.uiSession` 提供 `useConversation`、`useInput` 和 `inputActions` 标准 props".
- `@dsh-client-ui-conversation/README.zh.md:61` — "`ctx.uiSession.provide()` 从同一个 Session binding 物化 Conversation 与 input source，并将 `inputActions` 作为稳定标准 prop 提供".
- `@dsh-client-ui-conversation/lib/client.js:18053` — `props: ["inputActions"]`, passed as `shell.actions`.
- `@dsh-client-ui-conversation/lib/client.js:16329` — `inputActions.setDraft(storedDraft)` — confirms `setDraft` is the real method.

`PLATFORM` also confirms this is **per session** (materialised from the Session binding), which matches the established fact that the composer service is a deliberate per-session singleton. **For our spec: the composer is reachable from a chat-node component as a prop; you do not need to resolve the singleton yourself.**

Other standard props the plugin consumes: `useChat` (the chat store snapshot — **nodes live in `snapshot.nodes`, not `snapshot.chat.nodes`**), `useProjection(key)`, `actions`, `store`, `t`. The `snapshot.chat.nodes` mistake cost a release (`README.md:328-340`).

### D.5 Client↔host transport

`CODE`. Three transports, one op surface:
1. **HTTP (the published default)**: same-origin `POST ${ROUTE_BASE}/${op}` with an `x-retrace-config` header carrying the client's localStorage config (`lib/client.js:469, 2016`; `lib/http.js:43-46, 56`). Host registers it on `ctx.get('webServer').register({kind:'prefix', path:'/api/plugins/retrace', handler})` (`lib/index.js:246-260`).
2. **`harness.handle` RPC** — for the dynamic-package sandbox (`lib/index.js:319, 491-534`), op names `retrace.recall` / `retrace.editAndResend` / `retrace.regenerate`.
3. **A swappable wire**: `__setMessageEditorWire(fn)` (`lib/client.js:463-468`), installed by the generated dynamic client so the *same* client source runs against either transport (`README.md:536-542`).

Route surface (`lib/http.js:2-47, 469-500`): `GET /versions`, `/forkmap`, `/lineage`, `/event`, `/surface`, `/status`, `/doctor`, `/summaries`, `/snapshot`, `GET|POST /runningState`; `POST /rollback` (`?op=preview` for dry-run), `POST /git/init`, `POST /clientReport`. Max body 64 KB (`lib/http.js:57`).

**The route is not authenticated** — it is assumed same-origin only. `INFER`: acceptable for a local desktop app; worth an explicit decision in our spec.

A structural lesson the author paid for (`lib/index.js:214-221`, `CODE`): the four short-code ops were wired to the harness only, so the App (which uses HTTP) got **404**. The fix was to build the ops **once** into an object that both transports mount from — "结构上不可能只挂一条", plus a parity test.

### D.6 View components' data sources

`RetraceView({sessionId, useChat, useProjection, t, actions, store})` (`lib/client.js:2533`):
- versions: `useProjection('retrace/versions')` when present (zero polling), else HTTP `/versions` (`:2565`).
- jump-to-message: resolve the anchor through the **`useChat` snapshot** and page with `store.loadThrough(seq)`; on failure it reports a **diagnosable reason** (renderer warning + host-log line) instead of failing silently (`README.md:336-340`, `lib/client.js:1697-1725`).

---

## E. Manifest and packaging

`package.json` (`CODE`):

```json
"type": "module",
"main": "lib/index.js",
"types": "lib/types/index.d.ts",
"exports": {
  ".":               { "default": "./lib/index.js" },
  "./client":        { "default": "./lib/client.bundle.js" },
  "./host-core":     { "default": "./lib/host-core.js" },
  "./dynamic-client":{ "default": "./lib/dynamic-client.js" },
  "./dynamic-host":  { "default": "./lib/dynamic-host.js" },
  "./package.json":  "./package.json"
},
"dsh": {
  "bundle": { "patch": "./cordis.patch.yml" },
  "client": {
    "inject": [
      "@deepseek-ai/dsh-client-locale",
      "@deepseek-ai/dsh-client-ui-conversation"
    ],
    "platform": "web"
  }
}
```
— `package.json:6-8, 15-32, 63-74`

`peerDependencies` (`:75-84`): `@deepseek-ai/cordis`, `dsh-client-locale`, `dsh-client-ui-conversation`, `dsh-client-ui-slots`, `dsh-session`, `dsh-storage-domain`, `dsh-token-meter`, `react ^18.2.0`. Runtime `dependencies` (`:85-88`): `dsh-log-contract ^0.3.12`, `zod ^4.4.3`. Dev: `esbuild`, `vitest` (`:97-100`). `bin`: `retrace → bin/retrace.mjs` (`:101-103`).

`cordis.patch.yml` — the entire row set (`CODE`):

```yaml
- insert:
    - id: dsh-retrace
      name: dsh-retrace
```
— `cordis.patch.yml:15-17`. Its header comment explains the split: "the package's `main` → lib/index.js **Host half** runs as that row. The package's `dsh.client` metadata is scanned by the modules node half, and its **client half** (`exports["./client"] → lib/client.js`) is bundled into the Web client automatically while this row is enabled" (`cordis.patch.yml:3-7`). **Note the discrepancy**: the comment says `lib/client.js`, but `exports["./client"]` actually points at `lib/client.bundle.js` (`package.json:19-21`) — the comment is stale. `INFER`: the bundle is what ships, and `lib/client.js` is source.

Host/client split (`CODE`):
- **Host**: `lib/index.js` — `export const inject = ['sessions','agents','webServer','fs','subprocess','sandboxPolicy','jobs']` (`lib/index.js:167-168`). It wires the versioning seam, the prewrite guard, the marker writer, the rollback executor, the HTTP route, the harness handlers, the watchdog, the interrupt guard and the close guard.
- **Client**: `lib/client.js` — `export const name = 'dsh-retrace'`, `export const inject = ['slots','locale']` (`lib/client.js:29-35`). Only services that **definitely exist** on the new base are listed; the optional `uiConversation` is resolved defensively via a child fiber.

`dsh.client.inject` is a list of **packages** (not services) that must be loadable for the client half. The README records the important asymmetry (`README.md:286-288`):

> "declaring a **package** that no longer exists in `dsh.client.inject` is *not* what breaks the boot — the client loader skips unknown entries silently. The breakage comes from the **service name** the plugin waits for."

**Build tooling** (`package.json:9-14`, `CODE`):
- `build`: `node scripts/generate-dynamic.mjs && node scripts/build-client.mjs`
- `check`: `check-syntax.mjs && check-dynamic.mjs && check-host-contract.mjs`
- `test`: `vitest run`
- `prepublishOnly`: meta check + check + build + test

**Three client-ish entry points ship, and they are not three implementations:**

| File | What it is | Wrapper |
|---|---|---|
| `lib/client.js` | the **source** (3 719 lines), `import`s React and the plugin's own modules | none |
| `lib/client.bundle.js` | the **built** published client (182 KB / 3 521 lines) — esbuild output wrapped for the loader | `window.__ModuleLoader__.load({ id: "dsh-retrace", factory: (require) => { … require("react") … } })` (`lib/client.bundle.js:1-3, 38`) |
| `lib/dynamic-client.js` | a **generated** dynamic-plugin variant (203 KB / 3 537 lines) that inlines the same client source and swaps the transport | `return { inject: ['slots','locale'], apply(ctx) { … const require = (name) => name === 'react' ? React : throw … } }` (`lib/dynamic-client.js:5-12`) |

`lib/dynamic-host.js` (128 KB / 2 083 lines) is the same trick for the host: `return { inject: ['sessions','agents'], apply(ctx) { … } }` (`lib/dynamic-host.js:6-9`), generated from `lib/host-core.js` + `lib/adapter/dsh-writer.js` by `scripts/generate-dynamic.mjs`, which **strips `import`/`export` statements** and inlines the modules into one scope. That inlining is why `marker-carrier.js` exports a **list** (`MARKER_ID_PREFIXES`) instead of a singular constant: `host-core.js` already exports `MARKER_ID_PREFIX`, and a second same-named declaration in the shared inline scope would be `Identifier … has already been declared` (`lib/marker-carrier.js:46-53`).

Also notable: `README.md:536-542` — the generated files are committed, and **CI fails when a committed artifact is stale** (`git diff --exit-code`).

---

## F. Transferable lessons — the payload

Ordered by value to our two features.

### F.1 COPY: the in-place surface replace — this is how you do edit-and-resend **without forking**

**This answers the headline question directly.** dsh-retrace needs no `sessions.fork`, no `atSeq`, no delete, no truncate. Its entire edit-and-resend is:

1. `session.append('compaction/prune', { shadowedRange, shadowedSeqs, shadowedTokenCount })` — audit, log-only.
2. `session.append('user/message', { role:'user', id:'retrace-edit-…', content:[{type:'text',text:TRACE}], source:{kind:'model',provider,model} }, { surfaceOp:{op:'replace', startSeq, endSeq}, sourceEventSeqs:[auditSeq, ...shadowed] })` — the actual rewind.
3. `agent.followup({ id, role:'user', content:[{type:'text',text}], source:{kind:'user', rpcId} })` — re-prompt.

Plus the **view-side sync**: append a marker node whose renderer injects CSS hiding the shadowed rows, so "视图与模型上下文始终一致".

**Verdict: this is the primary mechanism, not a hack.** It is the platform's own compaction primitive (`@dsh-session/README.zh.md:50`), validated by the platform's own surface validator, used by official producers. `INFER`: a spec that forks for edit-and-resend would be strictly worse — forks are visible in the sidebar, lose the session-scoped composer, and multiply sessions.

**But it is not free.** The cost is exactly the surface-validator contract: `sourceEventSeqs` must list **every** shadowed node, in order, with no duplicates, all earlier than the current seq, and — for `assistant/message` — not at all. Getting this wrong is a hard load failure, not a cosmetic bug.

### F.2 COPY: do NOT shadow `conversation.chat.node` `key: 'user'` — manufacture a new node kind

The established fact ("`conversation.chat.node` is a keyed slot whose `user` key can be replaced") is true (`PLATFORM`: `@dsh-client-ui-chat/lib/client.js:6711-6715`) — **and dsh-retrace deliberately does not do it.** It registers a Conversation Definition producing a *new* kind (`user-actions`) anchored at the same seq, and a keyed-slot renderer for that new kind.

Why this matters for *our* feature, which is stronger (the user message itself must become an edit box):

- Shadowing `key:'user'` means re-implementing the shipped user bubble — including every future change DSH makes to it. dsh-retrace's bug list is full of exactly this class of breakage (nodes moved from `snapshot.chat.nodes` to `snapshot.nodes`; the registration entry moved from the service to `service.events`; the session event array was removed).
- The **new-kind** path is a supported extension point, survives host upgrades far better, and is what the plugin actually shipped to users.
- **INFER (recommended for our spec): do both, in that order.** Phase 1 = a new node kind rendered *directly under* the user bubble (dsh-retrace's proven shape, ships safely). Phase 2 = optionally register `key:'user'` and render `<OriginalUserBubble/>` **plus** our own editor, delegating to the host's component rather than re-implementing it — and treat the "does the original component remain reachable" question as a spike, not an assumption.

**Also copy the half-seq ordering trick**: `anchorSeq = seq - 0.5` sorts a row above its message without a new ordering API (`lib/client.js:646`).

### F.3 COPY: the four registration/robustness rules that each cost a release

1. **Resolve `uiConversation` through `.events.register`, and keep `service.register` as a fallback** (`lib/client.js:3848-3858`). Getting this wrong fails **silently** — no buttons, all-green boot.
2. **Never put an optional service in the static `export const inject`.** A missing service leaves the plugin row **pending forever**, and `assertEntriesActive()` then fails the **entire renderer boot** (`lib/client.js:3906-3910`). Use `ctx.inject([...])` child fibers for optional services.
3. **Always log a degraded registration.** "静默降级本身就是第二层原因" — the plugin self-reports `{definitions, slots, seats, source}` to the host on every apply (`lib/client.js:3922-3962`).
4. **Attach every returned disposer to `ctx.effect`.** Otherwise Definitions outlive unload/hot-reload and the next apply hits "already registered" (`lib/client.js:3970-3986`).

### F.4 COPY: the agent must be idle, and you must stop it rather than refuse

`ensureIdle` (`lib/host-core.js:207-225`, `CODE`+`COMMENT`) is the highest-value operational pattern here:

> "agent 正在响应时，**不拒绝**——自动请求停止（`agent.cancel`）并等待其干净收尾（`whenIdle`）。"

The root cause it fixes (`COMMENT`, `lib/host-core.js:198-204`) — the writer doing an edit while a step is still open caused DSH's resend path to reference old `assistant/chunk` events from **another turn** into the new message's `sourceEventSeqs` (measured: turn 54's steps 7/8/9), and `dsh-token-meter` then threw `belongs to another step`, flooding the host log. Implementation: `agent.cancel({ kind: 'user' })` then `await agent.whenIdle()`, with a fallback to `agent-busy` only if the agent lacks those methods.

**Our regenerate button must do this.** A user clicking ↻ mid-stream is the common case, not the edge case. `INFER`: "stop then rewind then re-prompt" is the right UX; "refuse with an error" is not.

### F.5 COPY: the state machine, not the boolean

`SPAN_STATUS` (`lib/span-semantics.js:34-51`) replaced `computeSpan → null`. The comment spells out why: `null` was overloaded to mean "not found", "already shadowed", "not yet flushed", "replay failed", so callers had to guess. Our op results need the same discipline, because our two features face isomorphic failure modes:

- `NOT_PERSISTED` → **`message-pending`** — "just committed, file not flushed yet; retryable". Distinct from:
- `ALREADY_SHADOWED` → **`target-shadowed`** — "read-only history".
- `REPLAY_FAILED` → **`span-replay-failed`** — "internal error; **never** masquerade as shadowed".

And the read-side must not invent data. `lib/boundary-derive.js:88-93`: if the action's own new text is not reconstructible, leave it empty ("Leaving it empty keeps the client from printing a misleading 延续 line"); if the turn number is unknown, omit the field ("不编造'第 ? 轮'").

### F.6 COPY: the read path reads the **file**, not the host's in-memory view

This is a class of bug our spec must pre-empt. The host's in-memory event view is **windowed/sparse and full of `undefined` holes**:

- `COMMENT` at `lib/host-core.js:245-249`: "host 的 events 可能只加载部分（用户实测：编辑消息 host 报遮蔽 2006，而文件全量算只有 10 个；稀疏 events 遍历时 undefined 洞导致找不到下一个 user → end 到尾部 → 遮蔽全量）."
- `COMMENT` at `lib/host-core.js:563-572`: scanning the sparse in-memory events for the preceding user message "会越过洞（洞里正是该轮 user）或越过被遮蔽区间，选到**更早轮**的 user → 重发错文本 + marker targetSeq 指向错轮."

**The fix**: read the session file (`session.v3.jsonl.zstd`) via the plugin's own decoder, and replay with the **official `foldSurface`** to get the same node list the writer will validate against. `lib/adapter/dsh.js:16-18` (`COMMENT`):

> "官方 foldSurface：重放得与写入端完全一致的 surface nodes（replace 插 marker、遮蔽移除节点 → nodes 非 seq 单调；span 计算必须用它，否则 start/end indexOf 会 not found/倒置 → S4/S8 拒 → 撤回死锁）."

Note the second half: computing the span from a **seq-monotonic assumption** rather than from the folded surface produced a **deadlock** — `indexOf(start) > indexOf(end)` because the marker is *inserted* at the range start. Also: short TTL cache (300 ms) keyed on `mtimeMs:size`, so a write invalidates it (`lib/adapter/dsh.js:69-103`), and a **shape assertion sampled at head/middle/tail** on the reader output so that shape drift surfaces immediately rather than as a confusing downstream crash (`:92-97`).

**INFER — this is the biggest implementation risk for our plugin, and it is not in the established facts.** Confirmed platform APIs the plugin uses to get around it: `session.snapshotEvents()` (frozen, seq-indexed), `session.eventAt(seq)`, `session.ownEvents()`, `session.isOwnSeq(seq)` as the supported readers, with the legacy `session.events` array as a fallback (`lib/host-compat.js:1-28`, `README.md:310-317`).

### F.7 COPY: cheap diagnostics with a fingerprint, never a silent empty

`lib/host-compat.js` is a 231-line masterclass in degradation. Its rules (`COMMENT`, `:19-27`):

> - New API first, legacy second.
> - A throwing or unrecognized view degrades to `[]` WITHOUT crashing, but it **always leaves a one-shot diagnostic carrying a shape fingerprint** — "Return [] and say nothing" is a bug, not resilience.
> - Deliberately NO `Object.keys(service)` fallback: on a service instance that yields the implementation's own fields, "the scan then silently sees zero sessions while looking healthy."

Copy the shim shape for `sessions.list()` / `snapshotEvents()` / `eventAt()`, and copy the rule: **unknown ≠ zero** (`lib/watchdog.js:150-156` — a `0` default would have caused the watchdog to snapshot every session every 5 minutes).

### F.8 For regenerate — what beats "fork + re-prompt"

dsh-retrace's regenerate is **the same primitive, with a round-scoped span anchored on the preceding user input** (`lib/host-core.js:544-627`, `CODE`):

1. Resolve the assistant message's seq by **message id** (`event.data.message.id` for `assistant/message`; `event.data.id` for `user/message` — `lib/host-core.js:228-243`).
2. From the **file-side** round span, take its start = the same round's user message, and take the prompt text from **the file, not memory** (`args.regeneratePrompt`, populated by `dshAdapter.roundPromptOf`, `lib/adapter/dsh.js:227-238`).
3. Shadow the **round** (user + its reply), then `agent.followup(promptText)`.

Two rules that make it correct rather than approximately correct:
- **Do not scan memory for the preceding user** when a file span exists — the comment at `lib/host-core.js:563-572` explains it selects an **earlier round** and re-sends the wrong text.
- **Orphan replies** (assistant message with no preceding user input on the surface) → refuse with `no-prompt` rather than guess (`:589-599`): "宁可报错，绝不越过遮蔽区重发更早轮的文本".

**Limitations the spec must inherit or improve** (`README.md:413-417`, `CODE`):
- Only **user messages** can be edited. Recall works on user and assistant. Tool results are shadowed but are not targets.
- Regenerate re-sends **only the text** of the original prompt — **prompts that carried images fall back to text-only content.** `INFER`: this is a genuine gap; a text-only regenerate of an image prompt silently changes the question. Our spec should either preserve attachments or refuse.
- The target must be on the **active surface**; already-compacted or already-recalled targets are rejected `target-shadowed`.

**Does anything beat it?** `INFER`: not materially. The alternatives are (a) fork + re-prompt — worse UX, more sessions, no in-place continuity; (b) an in-place `assistant/message` replacement — **structurally blocked**, since `assistant/message` cannot carry `sourceEventSeqs` (`PLATFORM`: `@dsh-session/lib/index.js:313`), so you could not declare what you shadowed. (c) `agent.replay`-style API — does not appear to exist in this plugin's surface at all.

### F.9 WARNINGS — the hazard checklist

**Pre-write / correctness hazards**
1. **`sourceEventSeqs` must list every shadowed surface node.** Missing one → the platform throws (`PLATFORM`: `@dsh-session/lib/index.js:267`). Clearing it entirely → `SessionPersistenceCorruptionError` on load (`lib/prewrite-guard.js:6-7`).
2. **Never write a fabricated `seq`.** Let `append` assign it; a hard-coded seq triggers an E2/S6/S8 cascade and the write is rejected (`lib/prewrite-guard.js:158-171`).
3. **Never use `assistant/message` as the carrier** — no provenance allowed; v1→v2 migration strips it (`lib/marker-carrier.js:6-9`).
4. **The carrier's `source.kind` must not be `'user'`.** It would be read as a real user input, split the exchange round, and **shift every subsequent span** — and "实测官方**不拦**，照样 load 且能力看着正常" (`lib/marker-carrier.js:26-30`). Use `kind:'model'` with non-empty `provider`/`model`.
5. **`content` must never be empty.** `content: []` projects to an empty `role:'user'` message and reads as "the user sent an empty message" (`lib/marker-carrier.js:68-74`, `lib/adapter/dsh-writer.js:45-58`).
6. **A plugin-owned event type with no `ignorable` marker makes the host persistence reader refuse the whole log** (`lib/boundary-what.js:11-13`). And an unknown historical type makes the session **permanently unmigratable** (`lib/marker-carrier.js:84-92`). **Write only official event types.**
7. **Validate the whole two-segment pair before the first append.** A post-append rejection leaves an **orphan `compaction/prune`** whose shadow-price claim nobody consumes, drifting `contextPressure.surfaceTokens` (`lib/adapter/dsh-writer.js:257-266`, real machine: seq 26032/26033).
8. **The audit claim and the replace must be synchronously adjacent** — "producers append the metering event and the replacement synchronously adjacent, so a surviving claim always prices the very next event" (`lib/adapter/dsh-writer.js:319-323`). Any `await` between them lets a concurrent append displace the claim.
9. **The `shadowedTokenCount` claim must be an official token price, not a node count.** Writing node counts makes `surfaceTokens` overestimate and **prematurely triggers compaction** (`lib/adapter/dsh-writer.js:154-165`). If the meter is unavailable, **refuse to write** rather than invent a price ("编一个价会静默污染 surfaceTokens … 比拒写危险", `:279-289`).
10. **Round-boundary predicate must exclude injected context/steering** (`source.kind !== 'user'`), or spans shift (`lib/span-semantics.js:67-76`).
11. **Compute spans with the official `foldSurface`, not a seq-monotonic assumption** — otherwise `indexOf` inverts and you deadlock (`lib/adapter/dsh.js:127-133`).
12. **Read the file, not the in-memory event view**, for span and prompt computation (§F.6).
13. **One in-flight op per session** — a promise-chain lock keyed by `sessionId` (`lib/host-core.js:175-183`, `lib/rollback.js:47-55`).
14. **Guard against large rewinds in large sessions**, but use an **absolute** shadowed-node count, not a ratio — windowed `surface.nodes` breaks ratios (`lib/prewrite-guard.js:49-69`). Otherwise present a fork-based alternative — but note the plugin's own `rollback-guide` message tells the user to "create a session branch" **for an operation the plugin does not implement** (`lib/prewrite-guard.js:71-80`, `COMMENT`: "错误文案引导「打分支」而插件内无此操作 = 死路"). **Do not ship guidance for a path you have not built.**

**Process / host hazards**
15. **A single failing plugin can take down the whole plugin tree** — a boot failure means the app does not start (`README.md:376-384`). The diagnostic split: `plugin tree failed to load` = host half, `renderer boot failed` = client half.
16. **Do not declare optional services in `export const inject`** (§F.3).
17. **Do not arm `beforeunload` on desktop**, and never rely on the host's native confirm dialog — on some desktop shells quit never reaches the page at all (`requestQuit → destroy → app.exit`), and on others the veto is swallowed silently (`README.md:445-477`).
18. **Do not use `ctx.setInterval`** (Proxy throws on uninjected properties) and **always `.unref()`/dispose timers** or you pin the host event loop and block quit (`lib/watchdog.js:49-52, 117-125`; `lib/index.js:444-447`).
19. **Do not repair platform state from a plugin.** No writing `turn/end`, no cancelling the user's agent as a side effect of a guard (`lib/interrupt-guard.js:14-17`, `lib/close-guard.js:19-20`).
20. **Hide-with-CSS needs a safety valve.** A single operation that would hide >40% degrades to notice-only; ≤20 rows is exempt; pseudo-rows are excluded from the denominator (`lib/client.js:780-795, 855-869`).
21. **Per-snapshot memoisation, not per-row rescans**, for anything that walks the node map (§D.3).

**Naming / migration hazards**
22. **Keep every retired marker-id prefix forever.** Markers written under an old plugin name are still in users' logs; recognition must never break on rename (`lib/host-core.js:39-47`, `lib/marker-carrier.js:46-53`, `lib/version-index.js:30-37`). And **legacy-prefix markers must degrade to annotation-only** — never hide content based on a marker whose semantics you no longer fully trust, "so a rename can never hide previously visible content" (`lib/client.js:49-58`).
23. **Do not make the product name part of the data contract.** The plugin was previously `dsh-message-editor` and carries `message-editor` in four prefix lists plus a legacy config key (`lib/client.js:69`).

### F.10 New APIs / services / events not in the established facts

Everything below is `PLATFORM`-verified or `CODE`-verified from this plugin, and **absent from the brief's fact list**. Our spec should name these explicitly.

**Core write primitive (the one that matters most)**
- `session.append(type, data, opts?)` where `opts = { surfaceOp, sourceEventSeqs }` — `@dsh-session/lib/index.js:1401-1405`.
- `surfaceOp: { op: 'replace', startSeq, endSeq }` — endpoints **inclusive**, interpreted **in current surface order**, not numeric seq order (`@dsh-session/README.zh.md:50`).
- `surfaceOp: 'append'` for normal surface entries.
- Surface-eligible types: `system/message`, `developer/message`, `user/message`, `assistant/message`, `tool/result`; they **require** `surfaceOp`; non-eligible types must not carry `surfaceOp`/`sourceEventSeqs` (`@dsh-session/README.zh.md:50`, `@dsh-session/lib/surface.js:213-223`).

**Core read primitives**
- `session.snapshotEvents()` / `session.eventAt(seq)` / `session.ownEvents()` / `session.isOwnSeq(seq)` — the supported readers; `session.events` is gone on new hosts (`lib/host-compat.js:6-11`, `README.md:310-317`).
- `foldSurface(events)` from `@deepseek-ai/dsh-session` — official surface replay; returns `{ nodes, replacements: [{ shadowedSeqs }] }` (`lib/adapter/dsh.js:19`, `lib/forkmap.js:16-20`).
- `deriveEventMessage(event)` from `@deepseek-ai/dsh-session` — official event→message derivation, needed for per-node token pricing (`lib/index.js:42`).
- `session.deriveMessages()` — the model-visible message list (`README.md:232-233`).
- `session.header.cwd`, `session.header.parentSession`, `session.header.version` (`lib/versioning.js:387-399`, `lib/rollback.js:80-82`).

**Agent control**
- `agent.status` (`'idle' | 'running'`), `agent.cancel({kind:'user'})`, `await agent.whenIdle()` (`lib/host-core.js:207-225`; `@dsh-agent/README.zh.md:47`).
- `agent.followup(message)` — queues the next-turn prompt and wakes the driver; message shape `{id, role:'user', content:[{type:'text',text}], source:{kind:'user', rpcId}}` (`lib/host-core.js:410-417`). `steer()` and `inject()` are the siblings (`@dsh-agent/README.zh.md:47`).
- Agent cancel causes are a closed set: `user | parent | hook | disposed` (`lib/host-core.js:211-213`).

**Sessions / storage**
- `sessions.get(id)`, `sessions.list()`, `sessions.flush(session)` (`lib/host-core.js:189, 419-425`; `lib/host-compat.js:161-231`).
- `ctx.sessionProjections.register(definition)` with `{ key, stateSchema, init, apply, wire: { viewSchema, view }, stateVersion }`, plus `.onChanged(cb)` and `.snapshot(session)`; **a unit without `wire` is checkpoint-only and never served** (`lib/projection/versions.js:1-20, 80-91`; `lib/versioning.js:234-246`). The fold must return the **same state reference** when nothing changed — "`Object.is` gates the change feed" (`lib/version-index.js:275-286`).
- `ctx.sessionQuery.readEvent(...)` / `.readSurface(sessionId)` (`lib/versioning.js:358-376`).
- `ctx.storageDomain.open(defineDomain({name, version, tables, global}))` → `domain.table(name)` with `get/put/delete/entries/keys`, `domain.global.get()`, `domain.close()` (`lib/artifact-store.js:56-74`; `lib/versioning.js:249-266`).
- Client-side: `ctx.sessions.binding(sessionId)?.session` (`lib/client.js:4051`), `ctx.sessions.list()`, `store.loadThrough(seq)` (`lib/client.js:1725`).

**Client UI**
- Conversation Definitions: `ctx.get('uiConversation').events.register({kind, target, match, start, update, buildViewNode})`; `target`+`buildViewNode` must be declared together; `match` returns `{id, role}`; `start(context, match, reader)` receives a **reader** with `reader.previous(kind)` (adjacent-context lookup only — **there is no "event at seq" on the client**) (`lib/client.js:592-731`; `@dsh-client-ui-conversation/lib/client.js:2437-2438, 2688-2689`).
- Keyed slot: `ctx.slots.register({name:'conversation.chat.node', key:<node-kind>, locale}, Component)`; `renderSlot(..., {entryKey: routedNode.kind})` — **the slot key IS the node kind** (`@dsh-client-ui-chat/lib/client.js:1770-1778`).
- `conversation.chat.assistant-actions` is a **list** slot under the `turn-tail` node, receiving `{messageId}` (`@dsh-client-ui-chat/lib/client.js:6523, 6786-6795`).
- `conversation.view` slot with `{id, order, label, inject(sessionId, actions), store}`; standard props include `useChat`, `useProjection`, `actions`, `store`, `t` (`lib/client.js:4043-4055, 2533`).
- **`inputActions` standard prop with `setDraft(text)`** — the per-session composer, from `ctx.uiSession.provide()` (`@dsh-client-ui-conversation/lib/client.js:18053, 16329`; `README.zh.md:12, 61`).
- DOM contract for row-level hiding: `data-chat-anchor-key` / `data-chat-flow-key` / `data-chat-node-key` / `data-chat-flow-kind` (`@dsh-client-ui-chat/lib/client.js:1760-1765`).
- `ctx.locale.register(ns, {zh, en})` + `ctx.locale.bind(ns)` (`lib/client.js:3866, 3877`).

**Host services this plugin resolves**
`ctx.webServer.register({kind:'prefix', path, handler})`, `ctx.fs.{resolve,contains,readBytes,writeText,stat}`, `ctx.subprocess.spawn({argv, cwd, stdio, graceMs, env})`, `ctx.sandboxPolicy.resolve({session, mode})`, `ctx.jobs.list()`, `ctx.on('session/event')`, `ctx.on('session/created', handler, {global:true})`, `ctx.get('tokenMeter')`, `ctx.get('llm')`, `ctx.get('agentDefaultModel').currentSelection()`, `ctx.get('sessionTitle').rename(session, title)`, `harness.handle(name, fn)` (`lib/index.js:168, 196, 246-260, 475-482; lib/rollback.js:107-111, 171-196; lib/versioning.js:601, 618; lib/index.js:351-357`).

### F.11 What our spec should AVOID

1. **Do not build a versioning/timeline/artifact-rollback/git subsystem to ship edit-and-resend + regenerate.** That is ~80% of dsh-retrace's 18k lines and is separable. The core three ops are `host-core.js` (634 lines) + `dsh-writer.js` (403) + `marker-carrier.js` (485) + `span-semantics.js` (172) ≈ **1 700 lines**, and the client affordances are a fraction of `client.js`.
2. **Do not adopt its scope of concerns.** Close guard, boot pinning, session badges/short codes, archaeology CLI, LLM summaries, git integration, interrupt governance — all orthogonal, and several exist only to make the plugin's own footprint safe.
3. **Do not put a plugin-owned event type in the log** (§F.9 #6).
4. **Do not depend on `dsh-log-contract` unless you need offline session repair.** It is a real dependency with a real incident history: a host release stopped exporting `decodeStorageRecord`, and because `dsh-log-contract` imported it, **the whole plugin tree failed to load and the app would not start** (`README.md:267-274`).
5. **Do not compute spans or prompts from the in-memory event view** (§F.6).
6. **Do not build a two-segment audit+carrier pair unless you need official compaction accounting.** `INFER`: the `compaction/prune` claim exists to keep `dsh-token-meter`'s `surfaceTokens` honest and to survive `sourceEventSeqs` being stripped by the event pipeline. If our spec does not care about compaction pressure accounting, a single `user/message` replace with `sourceEventSeqs` is simpler — **but** the plugin's read-side fallback chain (`carrierShadowedSeqs`, `lib/marker-carrier.js:434-460`) exists precisely because relying on the top-level array alone was fragile. **This is the single largest open design decision for our spec, and it needs a spike, not a guess.**
7. **Do not copy the README's tone into a spec.** A third of it is a changelog of host breakages; useful as a risk register, useless as a specification.

---

## G. Honest gaps

**Could not determine**

1. **Whether a single-segment `user/message` replace (no `compaction/prune` audit) is safe on the current host.** The plugin asserts the pair is required for the shadow-price protocol, and platform source confirms the claim/adjacency protocol exists — but I did not verify what breaks if the claim is simply absent (only that `surfaceTokens` accounting drifts). *Would settle it*: read `@deepseek-ai/dsh-token-meter`'s surface-projection consumer, or a scratch-session experiment writing a lone replace.

2. **Whether the event pipeline actually strips top-level `sourceEventSeqs`** on the client, or whether that is defensive coding. The plugin has three fallback tiers for it (`lib/marker-carrier.js:416-460`) and a whole `AUDIT_CONTEXT_KIND` definition built for the stripped case, but never states it observed a strip on the current host. *Would settle it*: log a real carrier event's shape as the client receives it.

3. **Whether `inputActions` is available to *every* chat-node component or only to view-level components**, and whether `setDraft` is the only useful method. Verified: `inputActions` is a declared standard prop for the conversation shell and is passed down (`@dsh-client-ui-conversation/lib/client.js:18053`), and the plugin reads it from a chat-node component and it worked in production (`lib/client.js:1183, 1223`). Not verified: the full method list, or attachment handling (`pruneAttachments` is referenced at `@dsh-client-ui-conversation/lib/client.js:17225` but not used by this plugin).

4. **Whether `conversation.chat.node` `key: 'user'` can be overridden without disabling the shipped registration**, and what the override semantics are (last-wins? error? both render?). `PLATFORM` shows the shipped registration exists but I did not read `ctx.slots.register`'s conflict policy. *Would settle it*: read `@deepseek-ai/dsh-client-ui-slots`. **This is directly load-bearing for our feature** if we take the "the bubble itself becomes the editor" route.

5. **The exact `sessions.fork` surface** (the brief supplies it as an established fact; I did not re-verify it). Relevant only because **dsh-retrace never uses it** — confirmed by exhaustive grep for `sessions.fork` / `atSeq` in `lib/` (zero hits).

6. **`close-guard-client.js` internals** (634 lines). I read its header (`:1-60`) and `client.js`'s import site (`:20-27`) and its purpose, but not the page-drawn confirm gate implementation. It is out of scope for our two features.

7. **Whether `lib/client.js` and `lib/client.bundle.js` are byte-equivalent in behaviour.** The bundle is esbuild output of the source (`lib/client.bundle.js:25-38` mirrors `lib/client.js`'s export list), and `package.json` ships `./client → client.bundle.js`, so `INFER` they are equivalent — but I did not diff them, and the README's own version-history shows generated artifacts going stale.

8. **The `scripts/` directory and `test/` suite are not shipped in the npm tarball** (`package.json:33-41` lists only `lib/**`, the YAML, READMEs, `HUMANS.txt`, `LICENSE`). So the build scripts and tests referenced throughout cannot be inspected here. *Would settle it*: the GitHub repo (`github.com/yamingmou/dsh-retrace`).

9. **`bin/retrace.mjs` / `archaeology-cli.js`** — skimmed by grep only; the CLI is read-only session archaeology (`README.md:592-608`) and irrelevant to our features.

10. **Real-world reliability of the whole approach.** The README documents at least five shipped regressions in the 0.4.2x line alone, three of them silent-failure classes (missing buttons, no-op jumps, overwritten titles). `INFER`: the mechanism is sound but the **integration surface is volatile**, and a conservative, loudly-degrading implementation is worth more than a feature-rich one.

**Not attempted (per instructions)**: installing, running, or modifying anything in the plugin directory; anything beyond read-only inspection of the DSH checkout.