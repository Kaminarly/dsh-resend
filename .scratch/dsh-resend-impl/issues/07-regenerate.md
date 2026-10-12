# 07 — 重新生成：最后一条回复上的控件

规范归属：[`spec.md`](../../dsh-resend-plugin/spec.md) §7（注册点 3 与 §7.3）、§9.2、§9.3、§4.3。规范是规范性的，本票与规范冲突时以规范为准。

**交付的端到端行为：** 在最后一条助手回复上点「重新生成」，那条回复及其后的一切消失，原始提示词被重发，新回复流式写出来。

## 控件

- **只**出现在**最后一条**助手回复上，且**永久可见**——不是 hover 才现身。
- 图标 `IconRefreshOutlineRegular` + 本地化「重新生成」标签。
- 它坐在出厂就有的助手动作条里：往 `conversation.chat.assistant-actions`（一个**列表**槽位，每个条目收到 `{ messageId }`）注册一个**全新** `id`，就在出厂条目旁边加一条；用出厂的 id 会替换掉它。
- 该槽位的拥有者 props 只携带持久的 `messageId`——**没有** seq。因此「哪一条是最后一条回复」是一个客户端问题：给它所需的邻近上下文、按自己的 kind 注册，读取方唯一的查找是 `previous(kind)`——客户端上**没有**「取 seq 处的事件」。定义的 `start` 必须保持纯粹，因为组装器在窗口填充之后会重放它。

## 行为

- 触发后从那条回复所在的回合起重写，并重发**原始提示词**的文本。
- 旧回复及其后的一切消失；新回复流式写出来。
- 重发文本由宿主侧从覆盖目标的日志读取推导（票据 03 的规则）：区间起点那条 user message 的文本，且是**当前**轮的，绝不是更早轮次的。若该消息没有文本块，以 `no-text` 拒绝，而不是发送一个空提示词。
- 重发走宿主侧 `agent.followup`（票据 05），**不**走输入框——`submit()` 不接参数且总是请求 `queue` 模式，插件无法掌控派发方式。

## 拒绝的呈现方式

拒绝**必须**呈现为控件**置灰、不可点击、hover 给出原因**——不是在事后弹一个错误对话框。这适用于客户端能预判的每一个错误码：流式中、已被遮蔽、image-only 提示词、目标已不在表面上。宿主无论如何都会拒绝，所以置灰只是礼貌，不是护栏。

**回复流式期间两个操作都不可用**，hover 原因是「请先停止回复」。这是用户可见行为：用户已决定流式期间两个操作都不可用，由用户自己停下它。

**Blocked by:** 06。

**Status:** resolved

- [x] 控件只出现在最后一条助手回复上，永久可见，注册的是全新 id 因而出厂条目一个不少。——`isLastReply` 以「没有其他回复的 `prevSeq` 指向它」为准入渲染；`dsh-resend-regenerate` 是列表槽里的全新 id（`order: 100`），用例断言注册选项里 `key` 缺席、id 不复用任何出厂条目。
- [x] 触发生成的是一次重写 + 一次重发；重发文本是**当前**轮区间起点那条 user message 的文本，不是更早轮次的。——一次点击恰好一次 `op: 'regenerate'` 调用且**不带** `text` 成员；重发文本的推导在宿主侧（票 03 的规则：覆盖目标日志里**当前**轮的提示词），客户端只发意图。
- [x] image-only 提示词以 `no-text` 拒绝，`followup` 零次调用，不写入任何标记。——宿主侧由票 03 交付并测试；客户端对它是唯一能预判的提示词拒绝（确定无文本块的 append → `promptRefusal` 置灰）。
- [x] 客户端对「最后一条回复」的判定只用 `previous(kind)` 这类相邻查找，定义里的 `start` 是纯函数（有一条用例在窗口填充/重放之后仍然判定正确）。——`start` 只读 `previous('assistant/message')` / `previous('user/message')`；用例在整窗与尾片（`slice` 之后）上重放，判定一致，事件窗口不受触碰。
- [x] 四条拒绝情形（流式中、已被遮蔽、image-only、目标已不在表面上）都表现为置灰 + 不可点击 + hover 原因，且不得在点击后弹错误对话框。——四条用例分别断言 `disabled`、`title` 原因文案、点击零调用、树中无 `[role="dialog"]`。
- [x] 回复流式期间编辑与重新生成都不可用，且插件**不**替用户取消进行中的回合。——`session?.running` 同时置灰两个控件（原因复用 `row.stopFirst`「请先停止回复」）；客户端从不调用取消。
- [x] 当 agent 忙碌时，即使客户端置灰状态因时序未能阻止点击，宿主仍然以 `agent-busy` 拒绝。——宿主侧 `apply` 的规则守卫（票 05 交付）；客户端把拒绝呈现为行内 `role=alert` 文本（含错误码），不是事后对话框。

## Comments

### 已实现（2026-10-08）

**交付的端到端行为。** 在最后一条助手回复上点「重新生成」：那条回复及其后的一切消失，原始提示词被重发，新回复流式写出来。重发文本由宿主侧从覆盖目标的日志推导（票 03），本票交付客户端侧：控件、判定、拒绝呈现。

**模块图。** 一个新增的客户端模块（被 esbuild 内联进 `lib/client.bundle.js`，不单独出产物）：

- [`src/regenerate.js`](../../src/regenerate.js) — 伴生 Definition（纯 `start`，只读 `previous(kind)`）、拒绝原因代数（`offSurface > notLast > stopFirst > shadowed > imageOnly`）、`companionStates` / `isLastReply` / `promptRefusal`，以及 `RegenerateControl`（常驻 chip、四种置灰态、宿主拒绝时的行内错误文本）。注册点 3 在 [`src/client.js`](../../src/client.js) 接线：`conversation.chat.assistant-actions` 列表槽，全新 `id: dsh-resend-regenerate`，`order: 100`，与出厂条目并排；zh/en 字典各加 6 键（标签 + 三种非流式拒绝原因 + 面板错误标题）。

**关键取舍。**

- **「哪一条是最后一条」完全留在客户端。** 定义给每条 append 的回复种一个隐形伴生节点（`visibility: 'hidden'`，锚点在回复自己的 seq——它是上下文，不是展示），携带 `seq` / `prevSeq` / 提示词资格事实。控件的判定读全部伴生节点：没有其他回复的 `prevSeq` 指向它，它就是最后一条。拥有者 props 只有持久的 `messageId`，邻接是唯一查找（`previous(kind)`），`start` 保持纯粹，所以组装器在窗口填充之后的重放对判定是幂等的。
- **客户端只能从提示词预判一条拒绝**：确定无文本块的 append（`no-text`）。流式读 `session?.running`（槽的 `useSession`；已装机宿主的 catalog 把它列在 assistant-actions 的 standardProps 里）；已被遮蔽读 surface-shadow 节点（它们无需载体记录就喂给 `plan.hiddenSeqs`）；离面则根本没有伴生。宿主 `agent-busy` 仍是真正的护栏——置灰只是礼貌。
- **一次点击 = 一次 `resend.apply`，`op: 'regenerate'`，不带 `text` 成员**（§4.3：宿主自己重发本轮提示词）。在途守卫让第二下点击落在同一个操作上；宿主拒绝呈现为行内 `role=alert` 文本（含错误码），绝不是事后对话框。

**测试。** [`test/regenerate-control.test.mjs`](../../test/regenerate-control.test.mjs)（16 例）驱动构建产物：伴生 Definition（纯 start、窗口填充重放同一性、buildViewNode 形状）、拒绝预测、仅最后一条可见、一次点击一次调用的形状、四种置灰态、宿主拒绝的行内文本、zh/en 单一语言标签、共享错误边界（含无边界时外抛的对照）。[`test/rewind-row.test.mjs`](../../test/rewind-row.test.mjs) 的注册计数随新 Definition 移动（3→4 定义、2→3 挂载）。全量 302 例全过，三个门禁（syntax / typert / host-contract）全绿。

### /code-review（2026-10-08）

两个轴并行评审工作区改动（相对 `HEAD`）：

**Standards 轴**：无文档标准的硬性违规。词汇表（CONTEXT.md 的 Regenerate/重新生成，规避同义词）、槽契约（全新 id、列表槽、`inject` 延迟注册）、测试约定（驱动构建产物而非 `src/` import）全部通过。判断题标记：「companion」成为常设概念、assistant-actions 槽的 owner prop `messageId` 都不在 CONTEXT.md 词汇表里——按 domain.md 的流程记给 /domain-modeling，本票不越权改词汇表；`send`（票 06）与 `regenerate` 的 guard-run-report 形状重复、`identity` helper 重复、内容块扫描弱重复、双常量同值——均保持现状：每个界面自带 run-loop、operations 是共享接缝，是本仓库有文档的兄弟惯用法，跨工单重构不属于本票边界。

**Spec 轴**：实质合规，零缺失需求。一个边缘双重报告：宿主拒绝后的行内错误 span 与 §9.4 分配给重写点错误行的报告权擦边——保留，票 06 有同样的行内错误先例，且它不是 §9.3 禁止的对话框。一个依赖项发现：流式置灰读 `useSession`，而 spec 的槽事实不承诺列表条目收到它；已验证已装机宿主 catalog 确实在该槽的 standardProps 里列出 `useSession`，且 spec §12 的 catalog 门禁在票 09 之前明确是骨架——**记给票 09**：断言 assistant-actions 的 standardProps 含 `useSession`，或让控件改经有保证的 prop 读运行状态。

**裁定**：最终评审轮无 must-fix 发现，循环终止。代码经用户确认后按逻辑意图分两次提交（feat: regenerate control on the last assistant reply / test: cover the regenerate control），issue 文件不入代码提交。
