# 03 — 只读解析：目标、区间与错误码代数

规范归属：[`spec.md`](../../dsh-resend-plugin/spec.md) §4（全部小节）、§13.1 #8、#12、#13、#14，§13.2。规范是规范性的，本票与规范冲突时以规范为准。

**交付的端到端行为：** `resend.apply` 能在任何输入下给出**正确的业务结论**——目标在哪、区间是什么、该拒绝时拒绝哪一个码——而**不写任何东西**。本票结束时，全部拒绝路径都是可验证的真实行为，只有成功路径停在写边界。

## 核心规则（本票存在的理由）

区间与重发文本**必须**来自一次覆盖 `targetSeq` 的日志读取。不覆盖它的一次读取是**失败**，绝不是「扫描手头这个数组」的许可：跨过缺失 seq 的一次扫描会静默选到**更早的、错误的**那条消息。这是本插件最贵的一类缺陷——参考实现曾把「往前扫最近的 user message」发到生产，选中了上一轮的提示词。

- **主路线**：`ctx.sessionQuery.readSession(sessionId)` 返回经过重放校验的完整事件日志，并标记继承前缀。对**活跃**会话，它覆盖插件刚追加、尚未 flush 的事件，且 `events` 数组是**完整、稠密、以 seq 为下标**的日志（`events[targetSeq].seq === targetSeq`）。
- **含义陷阱**：`readSession(...).session` 是会话**头部**（结构化克隆），不是活句柄；活会话仍从 `ctx.sessions.get(sessionId)` 取。该路线的拒绝 `SESSION_QUERY_PERSISTENCE_FAILED` / `SESSION_QUERY_CORRUPT_SESSION` 是拒绝：后者属于 `replay-failed`，**永远不得**报成 `target-shadowed`。
- **辅助路线**：`ctx.sessionPersistence.open(sessionId, 'read')` 只负责 `fileMaxSeq`——**已存储**日志覆盖到的最后一个 seq，§4.5 的 `message-pending`/`message-not-found` 判别就定义在 `{ fileMaxSeq, targetSeq }` 上。它从不取得写所有权。
  - `{ eventState: 'detached', events: [] }` 是**失败**，不是「日志是空的」：尚未物化的会话会无异常地返回这一对，把它读成「日志没有事件」正是这条路线静默算错区间的方式。（`detached` 本身在物化读取上也是正常状态，只有**空**且 `detached` 这对组合是失败。）
  - 切片读取 `read(offset, length)` 对「读取一个已知事件」是合法且高效的，但**区间绝不得**由它算出。
- 两条路线都拿不到 `targetSeq` 的事件时，必须以 `message-pending` 或 `message-not-found` 失败，**绝不**回落到任何内存数组。
- **写路径是另一回事**：写入用的 live tail 来自 `session.seq`，在第一次追加前读一次。读取描述「已有什么」，tail 描述「追加会落在哪」，只有会话自己知道后者。

## 解析顺序

1. 目标不在日志中 → `message-not-found`（另见下面与 `message-pending` 的判别）。
2. 目标已被遮蔽（某载体的 `surfaceOp` 区间覆盖它，或它不在当前表面节点中）→ `target-shadowed`。
3. 目标在日志中但尚未上表面（文件追上了，表面没有）→ `message-pending`。
4. `op === 'edit'` 而目标不是 `user/message` → `not-user-message`。
5. `op === 'regenerate'` 而目标不是表面上**最后一条**助手回复 → `not-last-reply`。

`target-shadowed` 由**日志**判定，而不是客户端给的列表：某载体的 `surfaceOp` 区间覆盖它，或它不在当前表面节点中。它**不得**与 `not-found` 混淆——后者指这个 seq 根本不存在。

## 区间

以表面顺序取出表面节点的 seq 列表，`start` 是目标在其中的位置，`end` **永远是**列表最后一项，区间是 `slice(start)`。区间总是延伸到**表面末尾**，因此靠近顶部的一次重写会遮蔽其后几乎全部内容。表面顺序与 seq 顺序无关，**数值上递减的区间合法**。

`op: 'regenerate'` 的重发文本是**区间起点那条 user message 的文本**（image-only 则拒绝 `no-text`），取自同一次覆盖式读取——绝不来自窗口化视图，绝不靠从任意更早消息向前扫描重新推导。

## 前置条件，按检查顺序

暂停/拆除中 → `internal`；`sessionId` 为空或会话未知 → `bad-request` / `session-not-found`；会话没有 agent → `agent-unavailable`；`agent.status !== 'idle'` → `agent-busy`；然后才是目标解析；最后是 op 专属的文本校验 → `blank-text` / `no-text`。

`agent-busy` 是**用户可见行为**而不只是护栏：用户已决定**流式回复期间两个操作都不可用**，由用户自己停下它。插件**不得**替用户取消进行中的回合。`agent.cancel({ kind: 'user' })` 加 `await agent.whenIdle()` 只是**防御性前置条件**，位置在「即将写入」处：若写入前仍有回合打开，插件等它空闲，而不是往一个打开的回合里追加。插件从不主动发起取消。

## 结果信封

`apply` 对业务结果**永不 reject**，它 resolve 一个以 `isRemoteFailure` 判别的 `RemoteResult<T>`。reject 只留给装配故障（方法未挂载、贡献被撤回、参数个数不匹配），所以**不得**用裸 `try/catch` 把本地故障吞成业务错误。

错误码词汇表是**封闭**的：`bad-request`、`session-not-found`、`agent-unavailable`、`agent-busy`、`message-not-found`、`message-pending`、`target-shadowed`、`not-user-message`、`not-last-reply`、`blank-text`、`no-text`、`internal`。

`message-pending` 与 `target-shadowed` **不得**混为一谈：它们来自同一个观察（目标不在表面上），但用户下一步动作完全不同——一个说「过一会儿再试」，另一个说「这是历史，没了」。判别用两个事实一起决定：

- 调用方手里有**显式状态**时用它：`not-found` / `already-shadowed` / `not-persisted` / `replay-failed`；
- **文件事实**：`{ fileMaxSeq, targetSeq }`。
  - `not-found` **且** `targetSeq > fileMaxSeq` ⇒ `message-pending`（可重试：回合正在收尾，或文件与表面不一致）。
  - `not-found` **且** `targetSeq <= fileMaxSeq` ⇒ `message-not-found`（这个事件从未存在）。
  - `replay-failed` ⇒ 自己的码，且**永远不得**报成 `target-shadowed`：一次失败的重放装扮成「历史是只读的」，是用户无法据此行动的一句谎话。
- 辅助路线不可用时 `fileMaxSeq` 未知：回落到 `not-found` 加上覆盖式读取自身的范围，**绝不**编造一个你无法支撑的 `message-pending`。

两个事实都不得从内存数组里取。

**Blocked by:** 02。

**Status:** ready-for-human

- [x] 12 个错误码各有自动化用例，且每个用例断言 `session.seq` 未变、日志中**没有**新的 `compaction/prune`——即拒绝路径零写入。
- [x] `message-pending`、`target-shadowed`、`message-not-found` 三态各自产生自己的码，且与文件事实的组合也各有断言；`replay-failed` 在任何输入组合下都不产出 `target-shadowed`。
- [x] **稀疏日志安全**：在当轮 user 的 seq 上故意打洞、同时存在一个已被遮蔽的更早轮次时，regenerate 重发的是**当前**轮的提示词，绝不是更早那条；无可读提示词时以 `no-text` 拒绝、`followup` 调用零次、不写入任何标记。
- [x] 表面顺序区间被正确计算：一个数值递减的区间（起点 seq 大于终点 seq）被解析并通过校验，写出时原样不变。
- [x] 测试替身默认镜像生产宿主的代：暴露 `snapshotEvents()` / `eventAt()` 且**没有** `events` 成员，legacy 数组只在显式 opt-in 后才存在；有一条断言 `'events' in session === false` 的测试。
- [x] 用例跑的是**真实的写前规则**，不是永远接受的桩。
- [x] 任何一次抛异常的 `sessions.get` 也产出格式良好的错误码——`apply` 对业务结果永不 reject。
- [x] 解析只在覆盖 `targetSeq` 的读取上进行：缺少该 seq 的读取产生上表中的失败码，而不是选中另一个事件。

## Comments

### 已实现（2026-10-01）

**交付的端到端行为。** `resend.apply` 在任何输入下都给出正确的业务结论，且**零写入**：目标在哪、区间是什么、该拒绝时报哪一个码；成功路径停在写边界（票 04）。

**模块图。** `lib/` 现在七个产物：六个宿主侧 ESM（`index.js`、`host.js`、`log-read.js`、`resolve.js`、`typert.host.js`、`typert.client.js`）+ 一个浏览器包。三个内部 sibling 由 `scripts/build.mjs` 单独产出并在 `lib/index.js` 中保持 external，都不是 `exports` 面。`src/index.js` 的 `main` 面只导出 `name` / `inject` / `apply`。

- [`src/error-codes.js`](../../../src/error-codes.js) — §4.5 的 12 码封闭词汇表独立成模块：描述符表（结果 codec 的判别联合）与解析器共用同一份清单，解析器因此不必把 zod 的 schema 拖进自己的产物（`src/typert.js` 仍 re-export 它，门禁的独立清单比对不受影响）。`assertCode` 是解析器的 refusal 与宿主信封 `failure()` 共用的同一道校验。
- [`src/host.js`](../../../src/host.js) — 宿主访问：`hostService`（§16.6 的不带 inject 要求的存在性判据）、`asArray`、`describeError`、`logWarning`。
- [`src/log-read.js`](../../../src/log-read.js) — **唯一的「日志读取模块」**（§12 豁免对象）。路线 (2) `sessionQuery.readSession` 为主：`SESSION_QUERY_CORRUPT_SESSION` → `replay-failed`、`SESSION_QUERY_PERSISTENCE_FAILED` → `not-persisted`、`SESSION_QUERY_SESSION_NOT_FOUND` → `session-not-found`、未知码 → `internal`；只取事件列表，`covering.session`（头部、结构化克隆）一概不读。路线 (1) `sessionPersistence.open(id,'read')` 只供 `fileMaxSeq`：从不取得写所有权，`{detached, events: []}` 明确按失败处理（`detached` 本身不是错误信号），读完归还句柄（read 句柄的 close 只影响 open-handle 记账，不碰 pending 记录）。对外一律叫 `log`，原始成员名只出现在这一个文件里。
- [`src/resolve.js`](../../../src/resolve.js) — 只读解析（下详），独立产物；票 04 的写入消费同一个 plan。
- [`src/resend.js`](../../../src/resend.js) — §4.4 前置条件顺序：fiber 非 ACTIVE → `internal`；空 `sessionId` / 未知 op / edit 缺 text / 非整数 seq → `bad-request`；未知会话 → `session-not-found`；无 agent → `agent-unavailable`；`status !== 'idle'` → `agent-busy`；然后解析；最后 op 专属文本校验（`blank-text` / `no-text`）。宿主读取抛异常时映射到 `internal` 并记一行可诊断日志——`apply` 对业务结果永不 reject。完全解析成功的请求在写边界返回 `internal`，同时**记日志**说明「停在写边界（票 04）」：封闭词汇表没有「可解析但不可写」这个码，信封无法区分，日志补上。
- [`src/index.js`](../../../src/index.js) — `inject` 五个服务（`sessions` / `agents` / `sessionQuery` / `sessionPersistence` / `typert`，§3.1）。`tokenMeter` 留到票 04 第一次读它时加入。

**解析规则。** 区间与重发文本来自**一次**覆盖式读取；按 seq **精确**查找，命中不到就是失败，绝不取邻近事件。`foldSurface(log, currentSessionMessageProjections)`（官方投影清单，与 `sessionQuery.readSession` 重放用的同一份）与**活表面**必须逐位一致：不一致 → `message-pending`（保守、可重试——短读丢掉某个载体时会把被它遮蔽的整段重新暴露出来）。折叠本身不可用（短读/带洞、或重放被拒）时降级为「只用活表面」并记警告，而不是报 `internal`——这正是 §13.1 #13 后半句要的行为。缺失目标用两个事实判定：`fileMaxSeq` 为主，辅助路线不可用时用覆盖式读取自身的范围，两者都不可用 → `message-not-found`（绝不编造 pending）。`replay-failed` 永不变成 `target-shadowed`。载体区间覆盖目标、或目标不在活表面上 → `target-shadowed`（不对目标做任何邻近查找）。区间起点与它在节点表里的位置由同一次走查给出，因此不需要第二次查找，也没有不可达的兜底分支。

**regenerate 的区间起点：一条需要记录的规范取舍。** 代码把区间起点放在**当轮 user message**（票 07 / §9.2 / §5.4 的 provenance 规则 / 参考实现的 round-scoped span），因为只有这一读法同时满足「区间起点那条 user message 的文本」且不让重发的提示词在模型上下文里出现两次。规范 §4.3 的伪码 `start ← position of targetSeq` 与它自己的下一句冲突；用户已确认**不改规范**，本票把该取舍记在这里、并写在 `src/resolve.js` 的注释里，供票 04 写 `surfaceOp.startSeq` / `shadowedRange.start` 时沿用。

**§12 的豁免改成「派生 + 单例」。** 豁免不再是脚本里的路径清单，而是「该文件就是 `src/log-read.js`，或它带 `GENERATED FILE` 横幅且横幅点名了这个源」，且每个被扫描目录**恰好一个**日志读取模块；缺了按漂移报红。门禁新增三条牙齿用例：改名后的等价副本会红、目录里没有日志读取模块会红、同目录第二个横幅声明者会红。

**测试替身（§13.2 #16/#17）。** fixture session 就是真 `Session`（真 append 校验、真 surface 合并、真 `foldSurface`）；路线 (2) 的替身返回宿主自己读的东西（`snapshotEvents`，与 §16.1 实测的 `readSession` 一致），且它返回的 `session` 字段是**头部诱饵**（表面为空，活会话只能从 `sessions.get` 取）。默认**没有** `events` 成员，legacy 稀疏视图只在显式 opt-in 后存在（有一条断言 `'events' in session === false`）。降级路径、`fileMaxSeq` 各态（镜像 / 滞后 / 空 / detached-empty / 不存在 / 读失败）都有各自的替身状态。agent 替身带一个被计数的 `followup`，好让「拒绝时绝不触及 agent」成为可断言的事实。

**测试。** 新增 [`test/log-read.test.mjs`](../../../test/log-read.test.mjs)（两条路线、精确查找、`fileMaxSeq` 各态、句柄归还）、[`test/resolution.test.mjs`](../../../test/resolution.test.mjs)（区间 / 重发文本 / 三态 / 文件事实组合 / §4.3–§4.4 顺序 / 稀疏读安全 / 递减区间 + 真写前校验预检）、[`test/apply-refusals.test.mjs`](../../../test/apply-refusals.test.mjs)（12 码端到端、零写入、永不 reject）、[`test/host-access.test.mjs`](../../../test/host-access.test.mjs)；[`test/gates.test.mjs`](../../../test/gates.test.mjs)、[`test/build-artifacts.test.mjs`](../../../test/build-artifacts.test.mjs)（新增「每个产物都必须已被 git 跟踪」一条）、[`test/package-metadata.test.mjs`](../../../test/package-metadata.test.mjs)、[`test/helpers/*`](../../../test/helpers) 随产物集合与 inject 更新。

**牙齿实测（变异，不是断言）。** `eventAtSeq` 改成「最近更早事件」→ 10 个用例红；`absentTargetCode` 把 not-found 混成 `target-shadowed` → 5 个用例红；`sameSurface` 关闭 → pending 用例红；`roundPrompt` 改为跨过洞 → 「覆盖式读取本身有洞」用例红（正是本票最贵缺陷类的守门用例）；`error-codes.js` 里删掉一个码 → `check-typert` 点名 `src/error-codes.js:13` 且只报这一条（不再出现「锚点消失」的自指失败）。写前规则用真 `append` 预检递减区间（原样被接受），并有反例证明该预检有牙：漏列一个被遮蔽节点会被宿主拒绝并点名。

### 已执行的验证

- `npm run check`：三闸全绿（`check-syntax` 解析 `lib/` 下 7 个文件）。
- `npm run build` 后 `git diff --exit-code -- lib/` exit 0（已提交的树）；`test/build-artifacts.test.mjs` 另有等价断言：提交的 `lib/` == 全新构建，且每个产物都被 git 跟踪。
- `npm test` → **188 passed / 2 skipped**；另有 **2 项与本票无关的既有环境漂移失败**：`test/package-metadata.test.mjs` 的「钉点 == 已安装 app」两条（本机 Desktop 已升到 `2.0.17` / `dsh-* 0.2.0-rc.2`，钉点仍是 `2.0.16` / `0.2.0-rc.1`；HEAD 上同样两条失败，CI 无 app 时 `skipIf` 跳过）。peer 范围 `^0.2.0-rc.1` 经 semver 实算已接受 rc.2，所以这只是钉点与 README 表的文档漂移，建议按规范「版本迁移」那段单独做一次小迁移（票 11 或新票）。
- `npm run probe` → 5 PASS：隔离 profile 里宿主行 ACTIVE、启动审计静默——即 `inject` 的五个服务在真实 profile 中都能解析，bundle 不会被静默跳过。
- **产物说明**：本次 `lib/client.bundle.js` 的字节变化（+7.7 KB）不是本票改动的客户端逻辑，而是安装新 devDependency 时 npm 重写了 `node_modules/zod`（版本号仍是 4.6.5）后，全新构建出的 zod 代码与 HEAD 里那份不再一致。提交的产物必须等于全新构建，故一并重生；客户端半的符号面未变（`grep` 确认 bundle 里没有 `resolveTarget` / `readCoveringLog` / `foldSurface` / `sessionQuery` / `sessionPersistence` / `fileMaxSeq` / `message-projections`）。

### 审查记录（`/code-review`，每轮 Standards + Spec 双轴并行，共三轮）

三轴结论：**最后一轮 Spec 轴「无需改动」，Standards 轴的三条必须改全部修完并复验。**

- **第 1 轮 Standards**：12 条（helper 缺 `@param`/`@returns`；`describeError`/`hostService` 重复实现；两个 refusal 构造器形状不一且其一不校验码；产物文件名在三个测试里各写一遍；`guarded` 结果命名误导；`scripts/host-services.mjs` 导出未用；多处缺文件尾换行）。→ 抽出 `src/host.js`（`hostService`/`describeError`/`logWarning`/`asArray`）、`refuse` 加码校验、测试共用 `libArtifacts`/`esmArtifacts` 清单、命名与换行修正。
- **第 1 轮 Spec**：(a) 覆盖式读取本身有洞时被折叠异常吞成 `internal`，而不是 `no-text`；(b) `not-persisted` / `session-not-found` 的映射只测到 log-read 层；(c) edit 缺 text 时两层给的码不一致；(d) `lastAssistantSeq` 会跨过读不到的节点；(e) §12 豁免范围无人钉住。→ 全部修掉：折叠不可用时降级为「只用活表面」+ 警告（提示词洞 → `no-text`、目标之后有洞 → `message-pending`、别处有洞仍解析当前轮）；补齐 apply 层映射用例；缺 text → `bad-request`、空白 → `blank-text`；末条回复走查改为三态；豁免改为派生 + 单例并加三条牙齿用例。
- **第 2 轮 Standards**：4 条必须改（`conversation` 当 session log 用、一句「三个服务缝」实为四个、既有脚本里另一个 `describeError`、`diagnose` 中继方法）+ 若干判断项（`asArray` 惯用法、过期注释、`@returns`）。→ 除「既有脚本的 `describeError`（语义不同、不在本票范围）」外全部修掉；新增 `asArray`。
- **第 2 轮 Spec**：(a) `lib/host.js` 没被 git 跟踪（提交后才会暴露）；(b) `resolveTarget` 出现在 `main` 导出面上是范围外扩张；(c) `sameSurface` 的判断获认可，但记录两处 caveat。→ (a) 产物全部跟踪，并新增「每个产物都必须已被 git 跟踪」用例（`git diff` 只比对已跟踪文件，构建产物被漏掉时两道门禁都会静默为绿）；(b) 解析器改为独立产物 `lib/resolve.js`，`main` 面回到 `name`/`inject`/`apply`；(c) caveat 写进注释。
- **第 3 轮 Standards**：3 条必须改（`dsh.mjs` 里「index.js 引入三者」不实；`remote-contract` 里新增行又用了 `conversation`；`check-typert` 的词汇表锚点仍指向 `src/typert.js`，词汇表搬家后会自指报错）+ 判断项（`refuse`/`isLogReader` 缺 `@returns`；`refuse` 与 `failure` 的校验重复；`roundPrompt` 之后有不可达分支；`log-read` 测试硬编码会话 id）。→ 全部修掉，锚点改为优先在 `src/error-codes.js` 命中（并实测：删掉一个码后只报 `src/error-codes.js:13` 一条），校验抽成 `assertCode`，不可达分支随「起点与位置一起从走查返回」一并消失。
- **第 3 轮 Spec**：无必须改动项。确认 12/12 码都有零写入断言、`lib/index.js` 只导出三个符号、`lib/resolve.js` 不拖 zod、client bundle 的字节变化与 `resolveTarget` 无关。唯一提示：规范 §4.3 的伪码与 regenerate 的区间起点冲突，建议在票 04 写 `surfaceOp.startSeq` 之前把规范文本对齐——用户已选择保留规范原文、由本票记录取舍（见上）。

### 提交（8 个，按逻辑意图）

`chore:` 依赖（session-format catalog）→ `feat:` 日志读取 + 宿主访问模块与 §12 派生豁免 → `feat:` 只读解析 → `feat:` 仅注册场景的服务替身 → `test:` 宿主形状替身与产物清单 → `test:` 解析/12 码/稀疏读用例 → `build:` 重生成 `lib/`（七个产物）→ `docs:` README 的读路径与写边界。票文件本身不在这些提交里。

### 已知限制与交接

- **写边界**：完全解析成功的请求 resolve `{ok:false, error:{code:'internal'}}`，并在宿主日志写明「停在写边界（票 04）」。封闭词汇表没有「可解析但不可写」这个码，信封无法区分——这是本票的过渡态，票 04 会整体替换这一行。
- **辅助路线的代价**：每次需要 `fileMaxSeq` 时读整份存储日志（O(file)）。参考实现用 mtime 键控的 300ms 缓存，本票未引入（可作后续优化）。
- **§13.2 #18**（单价必须来自官方包）属票 04：价格公式在写侧。
- **§4.4 step 1 的 `paused`**：本宿主没有会话级暂停状态（`dsh-session` / `dsh-agent` 都没有），可观测的那一半用「本行 fiber 非 ACTIVE → `internal`」实现；已在代码注释与 §4.4 的顺序位置上写明。
- **客户端半未改动**；`§13.5 #31` 的 `git diff --exit-code -- lib/` 对「构建产物被漏提交」是盲的，本票用 `test/build-artifacts.test.mjs` 的新断言补上（票 09/11 可视情况把这层检查并入 CI）。
- 脚本里仍有一个与 `src/host.js` 同名但语义不同的 `describeError`（`scripts/client-bundle.mjs`，输出带错误名前缀，用于 bundle 装载诊断）：第 2/3 轮审查判定为既有、不同契约，本票未合并。
