# 04 — 重写：审计声明与载体，两段一次落盘

规范归属：[`spec.md`](../../dsh-resend-plugin/spec.md) §5.1–§5.4、§2.3、§11、§13.1 #1–#7、#9、#10、#11、#15，§13.2 #17、#18。规范是规范性的，本票与规范冲突时以规范为准。

**交付的端到端行为：** 一次 `resend.apply` 真正改写模型表面：被遮蔽的区间离开模型上下文，载体成为新的表面尾部。**人类记录（transcript）毫发无损**——被遮蔽的行照旧渲染，载体一个像素都不渲染（隐藏是后续票的事）。整对事件要么一起、要么不落。

## 两段，为什么成对

1. `compaction/prune`——**审计声明**。仅日志，不是表面节点；它陈述区间与被遮蔽的 token 代价，并**武装**宿主的影子价格折叠。
2. 带 `surfaceOp` 与 `sourceEventSeqs` 的 `user/message`——**载体**。它消费该声明、把区间从表面剪掉、成为新的表面尾部，**不渲染任何东西**。

三步理由：`@deepseek-ai/dsh-token-meter` 只从**同区间的相邻**声明折叠替换的 token 增量。相邻且区间匹配 ⇒ 被替换区间的 token 被正确扣除；没有声明 ⇒ 折叠得到**恰好零**增量，`surfaceTokens` 静默高估、压缩提前触发；区间不同的孤儿声明 ⇒ 宿主折叠**抛错**（`no adjacent shadow price`）。

## 读 live tail，绝不发明 seq

写前校验器把候选事件上**存在**的 `seq` 当作权威——只有当 `seq === undefined` 时它才自己分配下一个 seq。所以生产者交给校验器的信封**必须完全不带 `seq`**。硬编码 `seq: 0` 曾导致「seq 0 不连续：倒退」、`sourceEventSeqs` 引用非更早事件、以及 `foldSurface` 重放失败（会话加载会被拒）。护栏是对的，生产者是错的：**构造两个事件、校验它们、让 `append` 铸造两个 seq**。

顺序：

```
prevTail ← session.seq          // 活跃尾部，读一次
auditSeq ← prevTail             // 审计取下一个 seq
carrierSeq ← prevTail + 1
1. 在第一次追加之前校验这一对
2. session.append('compaction/prune', auditData)                               // 不得 await
3. session.append('user/message', carrierData, { surfaceOp, sourceEventSeqs })  // 不得 await
4. await sessions.flush(session)
```

**必须在第一次追加之前校验整对**：日志无法回滚，一次在审计落地**之后**才发现的拒绝会留下孤儿声明——参考实现正是这样在真实机器上留下了孤儿 `compaction/prune`。第 2、3 步之间不 `await`，第 3 步与 flush 之间也不 `await`。

预校验用官方的**只读**权威：把计划中的这一对交给 `foldSurface([...log, plannedAudit, plannedCarrier])`——它覆盖区间成员、`sourceEventSeqs` 完整性、`surfaceOp` 形状、seq 顺序与其余表面契约，且在宿主规则变化时会失败（这正是一次性手写复核做不到的）。它**不**校验影子价格算术，所以 §5.3 的价格预检查要保留。**不要** import `foldSurfaceProjection`：它不在已安装包的 exports map 里。

第 3 步仍然失败时：审计成为孤儿。报告失败、flush 已写入的内容、在宿主日志记录这条孤儿——一个日后被另一个区间复用的孤儿声明会让宿主折叠抛错，所以它必须可诊断。

## 审计声明的规则

- `type` 必须是 `'compaction/prune'`。
- `data` 的键集必须**恰好**是 `{ shadowedRange, shadowedSeqs, shadowedTokenCount }`，多一个键就是契约违反。
- 事件**不得**携带 `surfaceOp` 或 `sourceEventSeqs`——它不是表面节点。
- `shadowedSeqs` 非空、无重复，且**首尾元素必须分别等于** `shadowedRange.start` 与 `shadowedRange.end`。
- `shadowedTokenCount` 必须是非负整数，等于对每个被遮蔽节点取**官方单节点价格**之和：`deriveEventMessage(event) === null ? 0 : estimateMessage(deriveEventMessage(event))`。服务按 `ctx.get('tokenMeter') ?? ctx.tokenMeter` 解析。**不要手抄价格公式，import 它**——抄来的公式把「与宿主一致」变成一条永不失败的断言。测试时若该包无法解析，**抛错**而不是跳过断言。
- **价格取自官方包**，`tokenMeter` 不可用时**拒绝写入**并报 `internal`；不得用节点数替代，也不得跳过声明——两者都会写坏一个用户看不见的数字。

**注意两个字段的命名不同名且都现行**：载体的 `surfaceOp` 用 `{ op, startSeq, endSeq }`，审计的 `shadowedRange` 用 `{ start, end }`。出厂的一方 pruner 把两种拼写并排写在同一个文件里，所以这不是遗留角落。各写各的拼写。

## 载体的规则

`data` 的键集**恰好**是 `{ role, id, content, source }`——DSH 的 `user/message` 词表就是这四个，第五个成员会被宿主拒绝：

- `role` 为 `'user'`；`id` 带稳定插件前缀 `dsh-resend-`（这是标记身份**唯一**能待的地方：`MessageSourceMap` 是 17 种值的封闭联合，插件无法发明 `source.kind`）。
- `content` 是非空文本块数组；空内容会投射成一条空 user message。
- `source.kind` 必须是 `'cordis-host-runner'`——「一个 Cordis 宿主插件注入了这条 user message」的诚实一方 kind。**不得**用任何表示「真实人类回合」的值（`user`、以及值同样为 `user` 的 `user-rpc`）：那会让载体切出一个新回合，对一个不可见事件恰好是错的。此结论已实机确认，不是候选。
- 业务来源（编辑了哪条、原文是什么）必须可**推导**（目标就是区间起点）或从日志回读，**永不**随载体携带。
- 追踪文本 `TRACE_TEXT` 渲染为零，但它是人类翻查会话文件时看到的东西，所以必须诚实：`en: (this message was replaced by an edit; the original is archived in the session log)` / `zh: （此处内容已被撤回：原消息已归档，可在恢复视图中查看）`。

`surfaceOp` 与 `sourceEventSeqs`：

- `surfaceOp` 恰好三个键，`op` 为 `'replace'`，两端都是非负安全整数。v4 运行时会**严格**校验并立即、清楚地拒绝错误拼写（`session event "user/message" carries an invalid replace surfaceOp`），所以除 `startSeq`/`endSeq` 之外没有可接受的写法。
- **运行时形状探针（防御性）**：启动时读会话格式版本，版本 ≥ 3 写 `{ op, startSeq, endSeq }`，v3 之前的拼写写 `{ op, start, end }`；对象必须由探测到的键名构造，**绝不**来自硬编码字面量，不一致时大声抛错。它只是对未来运行时的一道护栏，不是出厂宿主的要求。
- `sourceEventSeqs` 必须是 `[auditSeq, ...shadowedNodes]`，按**表面（位置）顺序**。首元素是审计（便利性指引项，不属于区间），因此 `sourceEventSeqs[0] === auditSeq`，且区间部分的首尾元素必须等于区间两端。
- 无重复，且**每一个**被引用的 seq 必须**严格小于**载体自身的 seq——前向引用会让会话无法加载。
- **漏掉任何一个被遮蔽节点都是硬性的会话加载失败。** 区间是权威，列表必须与它精确一致；拿不准时宁可多列。

## 并发与 flush

同一会话上的操作必须由**每会话锁**串行化，好让两次点击无法交错成两次重写；锁覆盖目标解析、两次追加、flush 与重发。每次成功操作**恰好一次** `sessions.flush(session)`，拒绝时零次。

**Blocked by:** 03。

**Status:** ready-for-human

- [x] 载体的 `seq` 等于追加前的 `session.seq + 1`；交给校验器的信封**没有** `seq` 属性；带伪造 `seq` 的候选被拒绝且报错信息点名该问题。
- [x] 一对被契约拒绝的事件在**任何追加之前**被拒绝：`session.seq` 不变，日志中**没有** `compaction/prune`。
- [x] `audit.seq + 1 === carrier.seq`；`carrier.sourceEventSeqs[0] === audit.seq`；每个被引用 seq 严格小于 `carrier.seq`；无重复；区间部分的首尾等于区间两端。
- [x] **影子价格协议**：通过消费该声明的投射观测——`ctx.sessionProjections.stateOf(session, 'contextPressure')` 的状态同时带 `claim` 与折叠后的 `surfaceTokens`。配对之后：**没有存活 `claim`**，且 `surfaceTokens` 恰好变化 `officialNodePrice(carrier) − audit.data.shadowedTokenCount`。一次没有声明的孤立 replace 折叠**恰好零**。区间不同的孤儿声明让折叠**抛错**（`token surface: replace at seq N over range … has no adjacent shadow price`）。另用公开的 `tokenMeter.measure(session).surfaceTokens` 交叉核对，并注明这是**另一条**机制（测量规划器），它佐证算术但不经过声明路径。
- [x] **封闭形状**：载体 `data` 键集恰为 `{role, id, content, source}`，content 是非空文本块数组，id 带插件前缀，`source.kind` 是 `'cordis-host-runner'`；审计 `data` 键集恰为 `{shadowedRange, shadowedSeqs, shadowedTokenCount}`，不带 `surfaceOp`、不带 `sourceEventSeqs`，`shadowedTokenCount` 是非负整数。
- [x] 数值递减的区间被接受并原样写入（已实机确认到冷加载重放校验为止）。
- [x] `surfaceOp` 对象由探测到的运行时键名构造；与运行中格式不一致的探测器抛错；源码中不存在硬编码的单一形状字面量。
- [x] 区间被替换为**原位剪接**：载体占据被遮蔽区间在节点列表中的位置（实测：表面 `[4,6,8,10]` 在覆盖 `[4,6]` 的重写后成为 `[14,8,10]`）。因此隐藏计划必须依据 `isAppendSurfaceEvent`，**绝不得**依据「是否在表面上」。
- [x] **输出故障先 flush**：一次写在之后的失败断言发生时，flush 已经发生且**恰好一次**，其观测长度等于写入后的日志长度。插件从不在自己已经改过的表面上报告失败。
- [x] flush 纪律：每次成功操作恰好一次 `sessions.flush(session)`，拒绝时零次。
- [x] **串行化**：同一会话上并发发起的两次操作绝不重叠——给 flush 埋点并断言 `maxActive === 1`。
- [x] **载体不是回合边界**：写入前后宿主自己算出的回合数相等，且载体不被归类为模型消息。
- [x] 票据 03 的稀疏日志安全用例在本票之后依然通过，且此时它是真的写入了。

## Comments

### 已实现（2026-10-02）

**交付的端到端行为。** 一次 `resend.apply` 真正改写模型表面：审计声明（`compaction/prune`）与载体（带 `surfaceOp` + `sourceEventSeqs` 的 `user/message`）成对写入，**在任何追加之前**用宿主自己的 `foldSurface` 校验整对、两次追加相邻、`flush` 恰好一次。人类记录毫发无损：被遮蔽的行照旧渲染，载体一个像素都不渲染。重发仍是票 05 的。

**模块图。** `lib/` 现在九个产物（八个宿主侧 ESM + 一个浏览器包）。新增两个自有产物，其余三个新模块按「只有一个读者」内联：

- [`src/write.js`](../../../src/write.js) — 写入本身：`planRewindPair`（两个信封，**任何地方都不带 `seq`**）、`plannedEvents`（校验用的事件信封，带 `append` 将铸造的 seq）、`validatePlannedPair`（把 `[...日志, 审计, 载体]` 交给官方 `foldSurface`）、`assertPairContract`（封闭形状 + 引用完整性，点名出错字段）、`verifyWrittenPair`（写入后的出口断言）、`writeRewindPair`（编排：官方价格 → 覆盖式读取 → 契约与重放校验 → 两次追加 → flush → 出口断言）。
- [`src/shape-probe.js`](../../../src/shape-probe.js) — 运行时 `surfaceOp` 形状探针：键名以**值**的形式存在于一张表里，`replaceOp` 用探测到的键名构造对象；探测器与运行中格式不一致即抛错。模块头明确写了它**不是**最后一道防线：真正挡在错拼写前面的是写入前的重放校验（宿主自己的 `isReplaceOp`）。
- [`src/token-price.js`](../../../src/token-price.js)（内联进 `write.js`）— 官方单价：`deriveEventMessage(event) === null ? 0 : meter.estimateMessage(...)`，`meter` 按 §5.3 解析为 `ctx.get('tokenMeter') ?? ctx.tokenMeter`。meter 缺失**或没有 `estimateMessage`** 都拒绝写入并报 `internal`，绝不用节点数替代。
- [`src/session-lock.js`](../../../src/session-lock.js)（内联进 `index.js`）— 每会话锁：一条 promise 链，永不 reject、结算后回收表项。锁覆盖目标解析、两次追加、flush 与（票 05 的）重发。
- [`src/trace-text.js`](../../../src/trace-text.js)（内联进 `index.js`）— 两句诚实的 `TRACE_TEXT` 与「写入时按活动语言选一次」的接缝。

**共享抽取（两处，都是消除重复而不是扩张）。** `refuse(code, detail)` 移进 [`src/error-codes.js`](../../../src/error-codes.js)（解析器与写入共用同一个校验码的构造器）；覆盖式读取的拒绝→业务码映射移进 [`src/log-read.js`](../../../src/log-read.js) 的 `coveringRefusalCode`（两条读取路径共用一张表）。`src/resolve.js` 相应只删代码。

**写入的关键取舍。**

- **校验在第一次追加之前。** 顺序严格是 §5.2：读 live tail 一次 → 用官方 `foldSurface` 校验整对 → 追加 → 追加（中间不 await）→ flush。契约违反时**零写入**：`session.seq` 不变、日志里没有 `compaction/prune`、flush 为零。
- **覆盖式读取在写入处重新取一次**，并用 `readCoveringLog` 自己的 `lastCoveredSeq`（不是数组下标）判断它是否覆盖 live tail：不覆盖则 `message-pending`（可重试），绝不用一份更短的日志去校验一次更长的写入。代价是每次写入多一次 O(log) 的读取（已知限制，见下）。
- **出口断言在 flush 之后。** 写入之后核对「铸出来的那一对 == 被校验的那一对」（seq 相邻、`sourceEventSeqs[0]` 指向审计、`surfaceOp` 形状）。宿主若在计划与追加之间插入了一个事件，claim 不再相邻、被替换区间的 token 会被静默高估——这时先 flush 再报 `internal`，并把不一致写进宿主日志。载体追加失败时同样：flush 恰好一次（只 flush 已落地的部分），日志里记一条点名 seq 与区间的 `ORPHAN` 行。审计自己就被拒时 flush 为零。
- **`surfaceOp` 用 `{ op, startSeq, endSeq }`，审计的 `shadowedRange` 用 `{ start, end }`** —— 各写各的拼写（§2.2）。
- **`source.kind` 是 `'cordis-host-runner'`**，`id` 带 `dsh-resend-` 前缀（载体 `dsh-resend-<op>-<uuid>`，由 `@deepseek-ai/dsh-util-crypto` 的 `randomUUID` 铸）。

**顺带修掉的一个真实缺陷（票 03 的 §4.4 step 1）。** 原实现读 `this.ctx.fiber.state`，但 Cordis 的 `ctx` 是被**追踪**的属性：方法内读到的 `this.ctx` 是**调用方**的上下文，它的 fiber 是永远 ACTIVE 的 root fiber——所以那道「本行 fiber 非 ACTIVE → `internal`」的检查从来没有生效过。实测确认（`service.ctx === host.ctx`、`ctx.fiber.uid === 0`，而插件行自己的 fiber uid 非 0、dispose 后 state 变 4）。现在在构造函数里捕获 `hostCtx` 与 `ownerFiber`，§4.4 step 1 才真的可观测：调用方在行拆除后仍持有服务引用时，请求以 `internal` 拒绝、零写入。

**并发与 flush。** 同一会话上的并发 `apply` 由锁串行化；测试给 `flush` 埋点（让它在其间 `await` 一次），断言 `maxActiveFlushes === 1`、两次并发只有一次写入与一次 flush、第二个请求得到 `target-shadowed`。

**测试。** 新增 [`test/write-pair.test.mjs`](../../../test/write-pair.test.mjs)（31 例）与 [`test/shape-probe.test.mjs`](../../../test/shape-probe.test.mjs)（12 例）；[`test/apply-refusals.test.mjs`](../../../test/apply-refusals.test.mjs) 的「停在写边界」一组变成真实的写入断言；`test/build-artifacts.test.mjs`、`test/host-half-boot.test.mjs`、`test/package-metadata.test.mjs`、[`test/helpers/host.mjs`](../../../test/helpers/host.mjs)、[`test/helpers/dsh.mjs`](../../../test/helpers/dsh.mjs) 随 inject、产物集合与新替身更新。

**测试替身。** `plugHostDoubles` 现在额外挂上**真实的** `SessionProjectionRegistry` + `TokenMeter`（影子价格协议本身就是被测对象，替身只会证明替身自洽）；新增 `captureLogs`、`sessionView`（三个用例共用同一份 session 形视图）、`withRacingAppend`（模拟宿主在两次追加之间插入事件）、`withRefusingAppend`、`openingTurnAgent`、`measuredFixture`（带 `turn/start`/`step/start` 生命周期，好让测量规划器 `measure()` 能折叠）、`Locale` 替身，以及 flush 埋点（`flushLengths`/`maxActiveFlushes`）。覆盖式读取新增 `{ copy: [at, from] }` 状态：**长度相同、某个 seq 上放着错的事件**——索引式查找会答成邻居的那种读。

### 已执行的验证

- `npm run check`：三闸全绿（`check-syntax` 解析 `lib/` 下 9 个文件）。
- `npm run build` 后 `git diff --exit-code -- lib/` exit 0；`test/build-artifacts.test.mjs` 另有等价断言（提交的 `lib/` == 全新构建，且每个产物都被 git 跟踪——新增 `lib/write.js`、`lib/shape-probe.js` 已跟踪）。
- `npm test` → **231 passed / 2 skipped**；另有 **2 项与本票无关的既有环境漂移失败**（`test/package-metadata.test.mjs` 的「钉点 == 已安装 app」两条：本机 Desktop 已升到 `2.0.17` / `dsh-* 0.2.0-rc.2`，钉点仍是 `2.0.16` / `0.2.0-rc.1`；HEAD 上同样两条失败）。见票 03 的同一记录。
- `npm run probe` → **5 PASS**：隔离 profile 里宿主行 ACTIVE、启动审计静默——即新增的 `tokenMeter` 在真实 profile 中确实解析（这也是把 `tokenMeter` 放进顶层 `inject` 的前提，见「已知限制」）。

### 审查记录（`/code-review`，每轮 Standards + Spec 双轴并行，共四轮）

**第 1 轮 Standards**（4 条必须改 + 12 条判断项）：

- 必须改：覆盖判定只看 `covering.log.length`（`log-read.js` 自己写明「读取不保证稠密」）→ 改用 `readCoveringLog` 的 `lastCoveredSeq`，长度只作第二证人；
- 必须改：三个 session 形替身（`withRacingAppend`/`withRefusingAppend`/`recordingSession`）各自抄一遍同一套 `id/seq/surface/eventAt/snapshotEvents` → 抽出一个 `sessionView(session, { append })` 工厂；
- 必须改：源码守卫的「不许任何文件拼写端点键名」与实际只扫 `src/` 不一致 → 把声明收窄到**发布的** `src/` 树（测试 fixture 仍手写形状，这是刻意的独立性）；
- 必须改：`src/resend.js` 丢了文件尾换行（HEAD 有），五个新源文件与两个新测试也没有 → 全部补上（另加 `CONTEXT.md`）；`src/write.js` 一处 184 列 → 折行；测试里 `officialNodePrice` 的注释声称「imported, never re-implemented」而实际重述了组合 → 改成「估算器是 import 的，组合是刻意重述的独立期望」，并在 `scripts/build.mjs` 写明 `token-price.js`/`trace-text.js`/`session-lock.js` 为何保持内联；
- 判断项：无读者的导出（`assertPairContract`/`verifyWrittenPair`/`AUDIT_TYPE`/`CARRIER_TYPE`/`CARRIER_SOURCE_KIND`/`MARKER_PREFIX`/`traceTextFor`/`activeLocale`，第 2 轮又加 `officialNodePrice`/`TRACE_TEXT`/`DEFAULT_LOCALE`）→ 全部收回；`markerId` 形参与同名函数遮蔽 → 统一改名 `carrierId`；一条 `flush()` 中间人函数 → 内联；
- 明确保留（判断项，不改）：`{ plan, auditSeq, carrierSeq, binding }` 这一「数据泥团」（JS 仓库没有类型层，且它就是这一对自己的身份）、`src/write.js` 的模块大小（只有一个变化理由：§5 的写入契约；拆开需要多一个产物或一次 re-export）。

**第 1 轮 Spec**（1 条越界声明、2 条不可失败的检查、1 条规范张力）：

- 必须改：`assertPairContract` 把审计的 `shadowedRange` 只跟 `plan` 比 —— §5.3 的原文是「**恰好等于载体的区间**」，两边都读 plan 就是一条永远不会失败的断言（正是 §5.3 反对价格公式手抄的同一个理由）→ 现在先与**载体的 `surfaceOp` 端点**互校，再与解析出的区间比，审计 `shadowedSeqs` 的两端也对同一组端点；
- 必须改（文档）：§5.4 的「探测不一致即抛错」在写入路径上不可达 → 模块头写明**探针不是最后防线**，真正挡在错拼写前面的是写入前的官方重放校验；并新增用例把一份**旧拼写**的 binding 送进 `writeRewindPair`，断言宿主自己的 `invalid replace surfaceOp` 在第一次追加之前拒绝它（零写入、零 flush）；
- 记录为决策（不改代码）：`resendMessageId` 是票 05 的交接契约（见「已知限制」）；`tokenMeter` 进顶层 `inject` 依据 §3.1 且探针实测启动审计静默；读取与会话不一致时用 `message-pending`（§4.5 自己那句「the file and the surface disagree」）。

**第 2 轮**：Standards 的 A/B/C 三条（`officialNodePrice`/`TRACE_TEXT`/`DEFAULT_LOCALE` 三个无读者导出、`plugHostDoubles` 注释写「四个替身」、`markerId` 形参遮蔽）全部修完并复验；Spec 只剩一条「`resendMessageId` 的结论必须写在票 05 实现者会读的地方」。

**第 3 轮**：Standards 复核 A/B/C 全部成立，另发现两处**文档**计数过期（`test/helpers/host.mjs` 头部、`src/host.js` 头部）→ 改正；Spec 把 13 项清单逐条走完（12 项已有测试钉住），并指出 `followup(createUserMessage({ …, id }))` 这条最自然的路会**静默丢掉** id（`createMessage` 做 `{ ...input, id: brandString(randomUUID()) }`）→ `src/resend.js` 的注记现在点名这个陷阱与两处证据路径。

**第 4 轮（收尾）**：两轴都只剩注释/计数级发现并当场修完 —— `test/host-half-boot.test.mjs`、`src/host.js`、`src/index.js` 的服务计数（六 = 五个被读取的 inject 缝 + `locale`），以及 `src/host.js` 说 `typert`「只注册不读」（`src/index.js` 注册后还会 `ctx.typert.local.list()` 读回来）的措辞。**收尾结论：没有仍未处理、需要改代码的发现。**

### 同步修订了票 05 的一行（本票带入，用户确认后执行）

票 05 清单第 1 行原把 `followup` 的参数形状钉成 `{ content, source }`（照抄 §5.5 的缩写片段）。票 04 的结果信封必须带 `resendMessageId`（§4.1 的封闭形状），而 agent loop 是把 inbox 输入对象原样追加成事件的（`@dsh-agent-loop/lib/index.js:1061`，inbox schema 是 `z.custom()`），所以票 05 必须把票 04 交下来的那个 id 作为输入的 `id` 传下去，且**不能**过 `createUserMessage`（它会覆盖 `id`）。已把那一行改成四成员形状 + 断言送达消息的 `data.id`，并在票 05 追加 `## Comments` 说明来由。

### 提交（10 个，按逻辑意图；票文件本身不在这些提交里）

`chore:` 依赖与 peer（token meter / session projection / util-crypto）→ `refactor:` 共用一个拒绝构造器与一张覆盖式读取拒绝映射 → `feat:` 运行时 `surfaceOp` 形状探针 → `feat:` 官方影子价格 → `feat:` 成对写入（含 build 接线）→ `feat:` apply 接线（含每会话锁、结果信封、`tokenMeter` 进 inject、行 fiber 修复）→ `test:` 替身与产物清单 → `test:` 成对写入/形状探针/拒绝用例 → `build:` 重生成 `lib/`（十个产物）→ `docs:` README 与 `CONTEXT.md`（新增 `audit claim`/`carrier` 词条，并把 `Replay turn` 改成「一对事件」；`CONTEXT.md` 此前未被跟踪，按用户确认纳入）。

### 已知限制与交接

- **`resendMessageId` 是票 05 的交接契约。** §4.1 的结果值是封闭形状（三个字段都在严格 codec 里，缺一个就在边界被拒），所以票 04 在写入时铸出**重发消息的身份**（`dsh-resend-<op>-resend-<uuid>`）并在成功信封里返回它。票 05 必须把**同一个 id** 作为 `followup` 输入的 `id` 传下去（四成员消息**原样**，不过 `createUserMessage`）——`@dsh-agent-loop/lib/index.js:1061` 是把 inbox 里的输入对象原样 `append('user/message', message, { surfaceOp: 'append' })` 的，所以显式 `id` 会活到事件里。票 05 的清单第 1 行已同步修订；若实机上该 id 仍不存活，票 05 必须回来改这里：否则这个字段就是一句谎话。
- **`tokenMeter` 进 `inject` 的理由（§3.1 vs §11 的张力）。** §3.1 只允许放「这个组合里确定存在」的服务，而 `tokenMeter` 确定存在（`npm run probe` 实测启动审计静默）；因此「服务不可用 → `internal`」在实际可达的形态是**服务存在但没有 `estimateMessage`**（两种都在 `writeRewindPair` 里拒绝，零写入）。服务整体缺失会让本行 PENDING、启动审计报红——这是刻意的显式失败，而不是静默降级一个用户看不见的数字。
- **`TRACE_TEXT` 的语言接缝。** 活动语言由客户端半提供（`@deepseek-ai/dsh-client-locale` 的 `ctx.provide('locale', …)`），宿主半只能走 `ctx.get('locale')`（**不**能读 `ctx.locale`：本 fiber 不 inject 它，属性读会被 Cordis 拒绝）。所以真实 profile 里当前写入的是英文；中文分支由替身组合断言。**票 08 补齐这条接线**，写入时的选择一旦落盘即不可更改（§10）。
- **§4.4 的防御性前置条件落在写入处。** 「回合在 rule 4 检查与写入之间打开」时，插件按 `{ kind: 'user' }` 取消并 `await agent.whenIdle()`，等不到空闲才 `agent-busy`。这是 §4.4 原文的机制，但 §4.4 归属票 03；本票把它放在锁内、写入之前，因为从本票起才真的会追加。票 05 的重发在同一个锁里，语义要它知道。
- **每次写入多一次覆盖式读取**（O(log)，在内存里是 `snapshotEvents` 的克隆）。票 03 已记录读取成本；若日后成为热点，可把解析阶段那次读取顺着 plan 传下来（当前刻意不传：写入要校验的是**它真正会落上去的那份日志**）。
- **`surfaceOp` 探针不是最后防线**（模块头已写明）：真正的守卫是写入前的官方重放校验，它会在第一次追加之前拒绝运行时不接受的拼写。探针本身的「探测与运行格式不一致即抛错」目前只在接缝上可达。
- **客户端半未改动**；`lib/client.bundle.js` 字节未变。
