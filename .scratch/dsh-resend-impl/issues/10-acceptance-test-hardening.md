# 10 — 验收标准的测试硬化

规范归属：[`spec.md`](../../dsh-resend-plugin/spec.md) §13.1 #1–#15、§13.2 #16–#18、§13.3 #19–#24。规范是规范性的，本票与规范冲突时以规范为准。

**交付的端到端行为：** 规范里剩下的每一条验收标准都由一个**行为回退就会失败**的自动化检查覆盖，而且测试替身本身不会再骗人。这条票的存在理由是一段真实事故史：一个 legacy 形状的替身让整套用例通过，而功能在真机上早已死掉。

## 测试替身纪律

- 替身**默认**镜像生产宿主的代：暴露 `snapshotEvents()` / `eventAt()` 且**没有** `events` 成员；legacy 数组只在显式 opt-in 之后才存在。有一条测试断言默认替身满足 `'events' in session === false`。
- 用例跑的是**真实的写前规则**，不是永远接受的桩。
- 每一个价格都来自**官方包**：估计器是被 import 的，它缺失时整套用例**抛错**，绝不跳过。

## 需要被钉死的宿主机制

1. **不伪造 seq**：载体 `seq === 追加前 session.seq + 1`；信封不含 `seq` 属性；伪造 `seq` 的候选被拒绝且报错点名该问题。
2. **配对先于追加**：被契约拒绝的一对让 `session.seq` 不变且日志中没有 `compaction/prune`。
3. **相邻与引用**：`audit.seq + 1 === carrier.seq`；`sourceEventSeqs[0] === audit.seq`；每个被引用 seq 严格更小；无重复；区间部分首尾等于区间两端。
4. **影子价格协议**：经 `contextPressure` 状态观测（没有存活 `claim`，`surfaceTokens` 恰好变化 `officialNodePrice(carrier) − shadowedTokenCount`）；孤立 replace 折叠恰好零；区间不同的孤儿声明让折叠抛错。
5. **封闭形状**：载体与审计的 `data` 键集精确匹配，`source.kind` 是钉下的那一个。
6. **递减区间**：起点数值大于终点的区间被接受并原样写入。
7. **形状探针**：`surfaceOp` 由探测到的键名构造；探测器与运行中格式不一致时抛错；源码中无硬编码单一形状字面量。
8. **输入故障零写入**：坏目标、空白编辑、未知会话、忙碌 agent——每一种之后日志与调用前逐字节相同。
9. **输出故障先 flush**：写入之后的失败断言发生时 flush 已发生恰一次，其观测长度等于写入后日志长度。
10. **flush 纪律**：每次成功操作恰一次 `sessions.flush(session)`，拒绝时零次。
11. **串行化**：并发两次操作，flush 埋点断言 `maxActive === 1`。
12. **永不 reject**：每一个业务结果都 resolve 结果信封；连抛异常的 `sessions.get` 也产出格式良好的错误码。
13. **稀疏日志安全**：在当轮 user 的 seq 上打洞、同时存在一个已被遮蔽的更早轮次时，regenerate 重发**当前**轮的提示词；无可读提示词时以 `no-text` 拒绝、`followup` 零次、零写入。
14. **三态与四态判别**：`message-pending` / `target-shadowed` / `message-not-found` 各自成码，与文件事实的组合各自有断言，且 `replay-failed` 永不产出 `target-shadowed`。
15. **载体不是回合边界**：写入前后回合数相等，载体不被归类为模型消息。

## 需要被钉死的客户端行为

19. 一个共享错误边界包住每个注册界面（结构化断言：各站点渲染同一个边界类、包装函数同出一个工厂、各有本地化标题；源码守卫：没有裸组件）；一个抛错的界面让其余界面完好。
20. 不带边界的那个组件确实把错误抛出渲染——证明边界正是阻止空白页面的东西。
21. `setDraft` 由插件按阶段把关：忙碌阶段「在输入框中编辑」被禁用，且阶段变化中的一次点击不会调用它。
22. 隐藏计划恰好隐藏快照为被遮蔽 seq 分配的那些 key，覆盖 `turn-tail`、`tool-call`、半 seq 三种情形；每个快照只算一次；且有一个**负对照**——同一行在插件规则未挂载时仍然渲染。
23. 规则在 dismiss 之后依然存活：dismiss 计数告知行不会恢复任何行。
24. 计数是诚实的：等于发出计划中的 key 数量，不是被遮蔽 seq 的数量。

**Blocked by:** 04、05、06、07、08。

**Status:** resolved

- [x] 上面 §13.1 #1–#15、§13.3 #19–#24 每一条都有一个自动化检查，且**把对应行为改坏时该检查变红**（逐条验证，不接受「看起来在测」）。
- [x] 默认替身满足 `'events' in session === false`；legacy 数组只在显式 opt-in 后存在。
- [x] 用例跑真实写前规则，不是永远接受的桩。
- [x] 价格估计器自官方包 import；该包无法解析时用例**抛错**而非跳过。
- [x] 第 8 条的「逐字节相同」断言比较的是完整序列化日志，而不是只比较 `seq`。
- [x] 第 4 条同时断言两条机制：`contextPressure` 状态（消费声明的那条）与 `tokenMeter.measure().surfaceTokens`（另一条），并在用例里注明后者不经过声明路径。
- [x] 不 import `foldSurfaceProjection`——它不在已安装包的 exports map 里；也不按 `lib/` 路径深入，那是宿主契约门禁要防的事。

## Answer

### 交付

| 提交 | 内容 |
|---|---|
| `b3d6c0e` | `test: pin every remaining acceptance criterion to a check that goes red`——五个用例文件与 `src/token-price.js` 的文档 |
| `1cb533b` | `test: reach the pair contract's forward-reference clause through a named seam`——`assertPairContract` 导出为有文档的测试缝（+ `lib/write.js`） |

`npm run check` 通过；全量用例 **418 通过 / 2 跳过**（跳过的是 `package-metadata.test.mjs` 中依赖本机安装版本的两条 `skipIf`，本票未触碰）；`node scripts/build.mjs` 后 `git status` 无输出，说明提交的 `lib/` 与重新构建逐字节一致。

### 加固的缺口（原套件在这些地方会「看起来在测」）

| 条目 | 原状态 | 现在 |
|---|---|---|
| §13.1 #1 | 两个信封展开合并后只检查了载体 | 逐信封分别检查 `data` 与 `options` 不含 `seq` |
| §13.1 #3 | 「严格更早」子句在生产路径上不可达，从未被执行 | 新增直接驱动该子句的用例，并证明宿主 fold 也拒绝同一候选 |
| §13.1 #4 | 只比算术，未绑定到消费声明的路径 | claim 被消费 + 增量等于 `officialNodePrice(carrier) − shadowedTokenCount` + 非空泛性；`measure()` 标注为不经声明路径的交叉验证 |
| §13.1 #6 | 只在 `surfaceOp` 中断言递减区间 | 审计声明与载体引用同样断言原样写入 |
| §13.1 #8 | 只比 `session.seq` | 新增 `canonicalLog()`：整份日志规范化字符串；13 条拒绝用例表 + 四类输入故障（坏目标、空白编辑、未知会话、忙碌 agent）逐字节比对 |
| §13.1 #9 | flush 观测值记的是 `session.seq` | 记 `snapshotEvents().length`，且去掉 `?? seq` 兜底（测不到就报错，而不是自己跟自己比） |
| §13.2 #18 | 只证明「某个 resolver」在空目录下失败 | 解析官方包落在真实文件上 + 断言出厂价格路径经 meter 服务取得 + 拒绝动态 import + 逐节点驱动服务方法与模块导出一致 |
| §13.3 #19 | 只测手搓的 thrower | 四个注册点渲染同一个 `PanelBoundary` 类 + 包装函数源码一致（与另一模块实例的同一工厂产物对比）+ 每个构造点各自标题 + 注释剥离后的构造点计数 |
| §13.3 #24 | 计数只在单一用例里比数字 | 补 `count === keys.length` 与「8 个键 ≠ 3 个被遮蔽 seq」的明确对照 |

### 逐条变异验证（18 个变异，全部变红）

脚本：[`.tmp/mutation-runner.mjs`](../../../.tmp/mutation-runner.mjs)（13 条）、[`.tmp/mutation-runner-2.mjs`](../../../.tmp/mutation-runner-2.mjs)（5 条）。每条只改一处行为，重新构建后跑对应套件，记录是否变红，随后按内存快照还原源码并重建。

| 变异 | 对应条目 | 结果 |
|---|---|---|
| M1 载体 options 带 `seq` | §13.1 #1 | RED |
| M2 配对校验挪到首次追加之后 | §13.1 #2 | RED |
| M3 拒绝信息不点名具体问题 | §13.1 #1/#8 | RED |
| M4 `apply` 开头先写一条日志事件 | §13.1 #8 | RED |
| M5 审计声明写 `shadowedTokenCount: 0` | §13.1 #4 | RED |
| M6 删掉「引用严格更早」检查 | §13.1 #3 | RED |
| M7 跳过落地后的一致性断言 | §13.1 #9 | RED |
| M8 去掉会话锁的串行化 | §13.1 #11 | RED |
| M9 去掉 meter 解析（改用本地估算） | §13.1 #4 | RED |
| M10 默认替身长出 `events` 成员 | §13.1 #16 | RED |
| M11 自己实现价格公式取代官方估计器 | §13.1 #18 | RED |
| M12 `turn-tail` 锚点返回 `undefined` | §13.3 #22 | RED |
| M13 某个注册点不过边界 | §13.3 #19 | RED |
| M14 审计 `data` 多一个键 | §13.1 #5 | RED |
| M15 递减区间被归一化 | §13.1 #6 | RED |
| M16 源码里硬编码一套形状字面量 | §13.1 #7 | RED |
| M17 `Math.ceil` 半 seq 锚点被去掉 | §13.3 #22 | RED |
| M18 用引用条数冒充计数 | §13.3 #24 | RED |

未做变异的条目（#10、#12、#13、#14、#15、#20、#21、#23）由用例自带的反例钉住：负对照（同一行在规则未挂载时仍渲染、朴素回扫确实答错）、豁免表之外的代码集合、以及「拒绝时 flush 恰零次 / `replay-failed` 永不产出 `target-shadowed`」这类互斥断言。

### 代码审查（两个轴，四轮）

| 轮次 | 标准轴 | 规范轴 |
|---|---|---|
| 1 | 3 处硬违规 + 6 处判断项 | 2 处部分满足 + 3 处实现有误 + 范围蔓延 |
| 2 | 3 处确认修复，4 处残留 | 2 处仍部分，3 处已修 |
| 3 | 3 处待修（注释诚实性、交叉引用、重复断言） | §13.3 #19 仍部分（缺类身份），§13.2 #18 确认满足 |
| 4 | **无需改动** | **无需改动** |

每轮发现项均以「改代码」收口，无一项以「辩称可接受」结案。主要修复：

- `carriesSeqKey({ ...audit, ...carrier })` 的展开碰撞（规范轴 #1）；
- `flushLengths` 记的是 `seq` 而非日志长度（规范轴 #2）；
- `canonicalLog` 文档描述了并不存在的 `session.constructor` replacer（两轴共同指出，段落删除）；
- 「同一函数身份」一度以函数名相等充当（规范轴指出名字相等挡不住同名副本），改为类身份 + 源码文本双断言；随后确认该措辞本身在结构上不成立，规范 §7.4 与 §13.3 #19 已按 §16 的规则修正（见 Comments）；
- 我的 `token-price.js` 文档称估计器是「宿主 fold 调用的同一个函数」并暗示本模块有 import——实为服务方法，文档改为事实陈述，等价性交回测试逐节点驱动；
- 新增用例中的重复断言、过时交叉引用（「下一个用例」实为上一个）、无依据的 checklist 引文，全部修正；
- 一次事故：用 PowerShell 重写 `test/settings-locale-boundary.test.mjs` 时破坏了 UTF-8。已用 Node 从 `HEAD` 按字节还原该文件（`git diff` 归零确认），再用编辑工具重新施加改动，最终 diff 为纯新增（`140 insertions, 0 deletions`）。

### 已知取舍（记录备查，非缺口）

1. **§13.3 #19 的「函数身份相同」字面上不成立**：`withPanelBoundary(Surface, titleKey)` 每次调用都返回一个新的 `Panel` 闭包，四个注册点必然拿到四个不同对象——这不是测试写弱了，而是措辞与结构冲突。规范正文（§7.4 与 §13.3 #19）已改为断言真正共享的东西：**四个站点渲染同一个 `PanelBoundary` 类**，且四个包装函数由同一个工厂产出（源码文本一致）。本票不为此改写注册结构：让身份字面成立需要把工厂调用提到模块级并把 surface／title 降级为 prop，而 slot 的 owner props 并不携带我们的 surface，`settingsSurface(preferences, translate)` 这类需闭包的 surface 也无法退化成纯 prop——为一条断言改写运行期契约，收益为负。
2. **`assertPairContract` 的导出是测试缝**：生产路径永远走不到该子句，而且这不是「罕见」而是**结构上不可达**——见下方 Comments 的记录。保留导出，因为 `lib/write.js` 不在包的 `exports` 映射里（`main` → `lib/index.js`），外部拿不到它，而删掉就只剩「宿主 fold 也会拒绝」这一层兜底：那不是插件对自己行为的担保，正是这张票存在的理由的反面。
3. **计数只钉了 `hidePlanFor` 这一层**：`hideRulesFor` 与 `hiddenKeysFor` 两个包装函数仅通过它被间接覆盖。未为补断言而改动票外行为。

## Comments

### 规范措辞修正：§13.3 #19「函数身份」

代码审查第四轮与随后的核查确认：`.scratch/dsh-resend-plugin/spec.md` 的 §7.4（「identity-checked across all registration sites」）与 §13.3 #19（「same function identity across sites」）描述了一个结构上不成立的断言。按 §16 的既定规则——**发现写进记录，决策归其所属章节**——两处正文都已改为：断言一个 `PanelBoundary` 类 + 一个工厂 + 各自的标题，并说明函数身份为何不可能成立（工厂按站点调用，每个站点要传自己的 surface 与 title）。本票清单第 19 条的转述随之更新。

### 前向引用子句：为什么不能靠不导出就驱动

原本的记录是「该子句在生产路径上不可达」。核查后发现更强：**在写前校验路径上不可能构造出前向引用**。

- `plan.shadowedSeqs` 的每个 seq 都必须命中覆盖读，而覆盖读只含已存在的事件；
- 载体落在写前 `session.seq` 位置，即**大于**每一个已存在事件；
- 因此每个被引用的 seq 都必然小于载体位置。

唯一「不小于」的引用是 `sourceEventSeqs[0] === auditSeq`——第 0 位，契约对它明确豁免。也就是说该子句只能由**不成立的 plan**（被引用 seq 不存在）触发，而那些 plan 会先在覆盖检查处以 `message-pending` 被拒。所以：保留 `assertPairContract` 的导出，让插件自己这层检查留下证据；宿主 `foldSurface` 的同一规则（`sourceEventSeqs must reference earlier events: N >= current seq M`）只能算兜底，不算担保。
