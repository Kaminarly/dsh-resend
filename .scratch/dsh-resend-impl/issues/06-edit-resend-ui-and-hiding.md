# 06 — 编辑并重发：用户消息动作行与行隐藏

规范归属：[`spec.md`](../../dsh-resend-plugin/spec.md) §7（注册点 1、5 与 §7.1、§7.2、§7.4、§7.5）、§8（全部小节）、§9.1、§9.3。规范是规范性的，本票与规范冲突时以规范为准。

**交付的端到端行为：** 用户在任意一条仍在模型表面上的用户消息下面点「编辑」，在内联编辑器里改字，按 Enter——那一条以及其后的一切从视野中消失，新提示词出现在模型上下文现在开始的位置，并带一行如实报数的告知。

## 动作行

DSH **没有**用户消息动作槽位。给用户消息挂载入口的受支持方式是注册一个**新的 chat-node kind**，其定义指向用户消息、其渲染器就是这一行；参考实现正是这样做并在生产中工作的。

- 注册点走 `ctx.slots.inject(key, callback)`，**绝不**裸用 `ctx.slots.register`：`inject` 把注册推迟到槽位声明存在之后，所以槽位被改名或移除只是让入口永不挂载——这是被接受的正常状态，不是错误。
- 注册的 key **必须在出厂 key 表之外**（`assistant-step, command, command-input, compaction, context, manual-compaction, model-retry, steering, system-prompt, tool-call, turn-error, turn-max-tokens, turn-process, turn-tail, turn-trigger, unknown, user, workflow-run`）：`conversation.chat.node` 是**带键**槽位，注册一个已被占用的键会**替换**那个占位者——本插件从不争抢 `user` 键。
- 行渲染在消息**下方**，含编辑控件（`IconEditOutlineRegular` + 本地化「编辑」标签）。
- 打开后是内联编辑器：以该消息文本为初值的 textarea，加**发送**按钮（`IconPaperPlaneOutlineRegular`）与**取消**按钮（`IconCloseOutlineRegular`）。
- 键盘：**Enter 提交、Esc 取消**，与按钮等价；`Shift+Enter` 插入换行；IME 组合期间**不得**因 Enter 提交（检查 `event.nativeEvent.isComposing`）。
- 一次操作：重写 + 重发，**一次** Remote 调用。**界面上任何地方都不得存在「只重写不发送」的控件。**
- Esc / 取消关闭编辑器且无任何效果，不写入任何东西。

## 编辑器是纯文本的，所以还需要「在输入框中编辑」

富引用（`@` 文件 chip、`/` 技能与命令、代码引用）**只**存在于真正的输入框里，而它是每会话单例、不可复制。因此第二个入口存在：**「在输入框中编辑」**把文本交给真正的输入框并关闭内联编辑器。

- 它调用 `inputActions.setDraft(text)`——**只携带纯文本**，chip 占位符会被剥掉。含 `@` 引用或 `/` 命令的消息会作为字面文本回显进输入框，用户得从触发菜单里手工重建引用。这条限制必须写进 README，否则按钮会让人失望。
- **`setDraft` 是唯一没有阶段护栏的变更方法**：`insertText`、`addAttachments`、`removeAttachment` 在忙碌阶段会返回 `false`，而 `setDraft` 什么也不返回，所以「被拒绝」与「成功」无法区分。插件**必须自己**按 `useInput` 的阶段把关：忙碌阶段是 `claimed`、`submitting`、`adjudicating`（`plain` 是空闲那个）。具体做法：阶段不是 `plain` 时禁用该按钮，并在**调用前**立刻重查一次阶段——store 可能在渲染与点击之间改变。
- `submit()` 不接参数且总是请求 `queue` 模式，所以插件永远无法掌控自己的提示词如何被派发；**regenerate 因此不走输入框**，它用宿主侧的 `agent.followup`。

## 遮蔽行必须由插件隐藏

重写把区间从**模型表面**移除，对人类记录**没有**影响。什么都不会消失，也不会有任何东西出现在被移除行的位置：载体匹配不到任何出厂渲染器，所以它什么都不渲染。**插件不隐藏，行就留在屏幕上。**

这是插件**有意覆盖**平台有文档记载的行为，README 必须这么写。机制只能这样描述：

> 重写把该区间从模型可见表面移除。人类记录在设计上就是 append-origin，不受影响，所以插件自己隐藏了受影响的行。

**不要**把机制说成「把消息从表面上删掉」——那种说法对用户所见而言是假的，而它正是让隐藏看起来可选的那种误读。

### DOM 契约

行用 data 属性承载自己的身份：`data-chat-anchor-key` / `data-chat-flow-key` 为 `flowKey`（**隐藏依据这一个**），另有 `data-chat-flow-key`、`data-chat-node-key`、`data-chat-flow-kind`。未分组的行（`user` 行就是）其 `flowKey` 就是节点的稳定 key；被分组的过程成员则是两元素 JSON 数组 `JSON.stringify([nodeKey, groupPart])`。

### 隐藏计划的构造

**从 Chat 快照的节点表里读出 key，绝不自己构造一个。** node key 由平台分配，构造出来的 key 只会静默地什么都不隐藏。按节点 kind 匹配：

- 普通行 → `node.anchorSeq ∈ shadowedSeqs`；
- kind `turn-tail` → seq 在 **FINAL NODE** 上，即 `node.data.closing.finalNode.seq`，不在 `closing` 上；
- kind `tool-call` → `node.data.root.seq`（工具行锚在只存在于日志的 `tool/call` seq 上，它从不是表面节点）；
- 锚在半 seq 上的伪行 → `Math.ceil(anchorSeq) ∈ shadowedSeqs`。

匹配则原样发出快照给出的 `flowKey`。

**每个快照只算一份隐藏计划，按快照的引用身份做记忆化。** 不要逐行重扫节点表：那个形状实测在 2 000 行 / 20 标记下是 **346 ms**、3 000 / 30 下是 **1 568 ms**，而修好之后（每快照一份计划、O(1) 查询）是 **8.3 ms** 与 **18.3 ms**。

### 规则的发出

从**自己**的行组件渲染一个 React 拥有的 `<style>` 元素（插件绝不直接写 DOM）：每个隐藏 key 一条规则 `[data-chat-anchor-key="<JSON.stringify(flowKey)>"]{display:none!important}`。key 要 `JSON.stringify`，这样分组成员的数组 key 才会被正确加引号。

- **规则必须在告知行被 dismiss 之后依然挂载。** 卸载它们会让每一个被隐藏的行重新出现——这是本节可能有的最高严重度缺陷。
- 被遮蔽的 seq 集合来自执行重写的那次 Remote 调用的返回值（`shadowedSeqs`）；载体的 `sourceEventSeqs` 是**兜底**而不是主来源——不要让隐藏依赖载体事件抵达客户端：该字段能活过管线，但没有任何出厂客户端消费它，所以它的送达不是可以依赖的行为。

### 失败要响，不能静默

一次静默失败的隐藏会留下一段「模型并不认为自己在其中」的对话——比没有这个功能更糟。因此隐藏计划构造不出来、或规则发不出去时，插件**必须**在受影响的行上给出错误状态，并记一条点名区间与原因的可诊断日志。**静默降级是被禁止的**——这是插件里唯一一处「优雅降级」是错的地方。

### 按数量披露

用户拒绝了「最多隐藏 40% 对话」这个安全阀，而靠近长会话顶部的重写会隐藏几乎整份记录。插件**必须**披露而不是留白：

- 每一次重写都说明它隐藏了多少行——重写点上一条告知行，带本地化计数，例如 `en: N messages hidden` / `zh: 已隐藏 N 条消息`。计数取自隐藏计划，所以它是**实际发生**的，不是被请求的。
- 告知行可 dismiss，且 dismiss **不得**恢复任何行。
- README 必须用用户自己的话记下被拒绝的安全阀及其后果：大规模重写在设计上就是视觉上破坏性的，计数是用户与空白页面之间的唯一东西。

**Blocked by:** 05。

**Status:** resolved

- [x] 动作行出现在每条仍在模型表面上的用户消息下方；被遮蔽的消息不再显示动作行。
- [x] 注册 key 不在出厂 key 表之内，插件从不占用 `user` 键；槽位缺失时只是功能不出现，没有其它影响。
- [x] 内联编辑器：Enter 与「发送」等价、Esc 与「取消」等价且零写入、`Shift+Enter` 换行、IME 组合期间 Enter 不提交。
- [x] 一次操作只发**一次** Remote 调用；界面中不存在「只重写不发送」的控件。
- [x] 「在输入框中编辑」把文本交给真输入框；含 `@` / `/` 的消息在输入框中显示为字面文本，这一点写进了 README。
- [x] `setDraft` 由插件按阶段把关：忙碌阶段按钮禁用，且**阶段变化中的一次点击不会调用它**（有一个用例覆盖渲染与点击之间阶段翻转）。
- [x] 隐藏计划恰好隐藏快照为被遮蔽 seq 分配的那些 key，覆盖 `turn-tail`、`tool-call` 与半 seq 三种情形；每个快照只算一次。
- [x] 一个应该被隐藏的行确实被隐藏，而**负对照**——同一行、插件的规则未挂载——仍然渲染。
- [x] 规则在 dismiss 计数告知行之后依然挂载，且没有任何行重新出现。
- [x] 计数是诚实的：它等于发出计划中的 key 数量，而不是被遮蔽 seq 的数量。
- [x] 隐藏计划构造不出来时给出响亮错误行 + 可诊断日志（点名区间与原因），且**不**发生静默降级。
- [x] 插件不写 DOM：唯一需要样式的输出是 React 渲染的 `<style>` 元素。

## Comments

### 已实现（2026-10-05）

已完成用户消息动作行、纯文本内联编辑器、输入框交接、按 Remote 返回值构造的隐藏计划、分组 flow key 规则、计数告知行、dismiss 后持续隐藏，以及隐藏失败的受影响行提示和诊断日志。README 已说明 append-origin 记录、纯文本引用限制、附件需要重新创建，以及拒绝 40% 安全阀后的视觉后果。

实现按逻辑意图提交：`5cf48e6`（功能）、`9f2c32a`（测试）、`99bca4b`（构建产物）、`179e075`（文档）。

验证结果：`npm run build`、`npm run check`、`npm test`（18 个文件，286 passed，2 skipped）、`npm run probe` 和 `git diff --check` 均通过。

`/code-review` 的 Spec 与 Standards 两轮复核均已完成；修复了跨重写点污染动作行错误的问题，最新复核未发现需要代码修改的结论。

### 界面要求修订（2026-10-10）

本票关于独立编辑动作行和直接显示操作文字的要求，已由[本次界面需求 01](../../dsh-resend-ui/01-native-ui-and-user-actions-placement.md)取代。编辑入口现位于原用户消息的复制图标右侧，使用图标与悬停提示；插件控件统一采用宿主控件与主题样式。两份规范的相关章节已同步修订。
