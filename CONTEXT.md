# DSH Resend 插件

这是一个用于 DSH Desktop 的第三方插件。它允许用户编辑已经发送的消息并再次发送，也允许用户重新生成助手回复。之所以维护这份术语表，是因为平台词汇与本功能所参考的工具词汇存在冲突，其中影响最大的是「branch」一词。

## 平台术语

以下是 DSH 自有术语。请使用这些拼写，不要自行创造同义词。

**Bundle**：
DSH 插件的可安装单元：一个 npm 包，其 `cordis.patch.yml` 会向 Loader 插入行。
_避免使用：plugin package、extension_

**Profile**：
位于 `$DSH_HOME/profiles/<name>` 的已安装 Harness 环境，其中保存安装到该环境的 Bundle。本项目面向 `desktop` Profile。
_避免使用：workspace、environment_

**Host plugin** / **Client plugin**：
同一个 Bundle 的两个侧面。Host plugin 是 `main` 导出项，以 Node ESM 运行；Client plugin 是 `./client` 导出项，以浏览器 JavaScript 运行。两者可以彼此独立，其中一方可以为空。
_避免使用：server plugin、frontend plugin_

**Slot**：
Client 渲染树中的具名空位，插件可以向其中注册 React 组件。Slot 必须先声明，之后才能注册；`ctx.slots.inject` 会把注册操作延后到声明出现为止。
_避免使用：extension point、hook、mount point_

**Cell**、**occupant**、**shadowing**：
Cell 是 Slot 中一个可寻址的位置：对于 `single`，Slot 本身就是一个 Cell；对于 `keyed`，每个 `key` 对应一个 Cell；对于 `list`，每个 `id` 对应一个 Cell。在较低优先级的已占用 Cell 中注册内容，会对现有 occupant 形成 *shadowing*；对于 `keyed` 和 `list`，这是替换宿主 UI 的文档化方式。
_避免使用：override、monkey-patch_

**Owner props**：
Slot 的 owner 向 occupant 传递的类型化值，也就是 owner 与 occupant 之间的契约。`conversation.chat.node` 会传递 `forkAt`、`openFile`、`openSkill`、`renderMessageImages`。
_避免使用：props、context_

**Chat row**：
Transcript 中渲染的一条记录，由 `conversation.chat.node` Slot 在 `ChatNodeKind` 键（`user`、`assistant-step`、`tool-call`、`turn-tail` 等）下分派。
_避免使用：message component、bubble_

**Turn**：
由触发事件和结束事件界定的一段会话单元，是 fork 和 `turnTail` 操作所使用的粒度。
_避免使用：exchange、round_

**seq**：
会话日志中事件的单调递增且连续的序号。它是唯一的排序元数据，也是切割历史的唯一地址。
_避免使用：offset、index、cursor_

**Session log**：
会话唯一的事实来源：一个只追加、按 `seq` 编号的事件日志。已提交的事件永远不会重写，也不存在 delete 或 truncate 操作。
_避免使用：history、database、store_

**Transcript**：
用户看到的 Session log 内容。它有意比日志更窄：只有 `surfaceOp === 'append'` 的事件会被渲染。
这指的是**追加来源，而不是 surface fold**，两者的区别正是关键：被后续 replacement shadow 的节点仍保留 `surfaceOp === 'append'`，因此**仍会渲染**；承载新内容的 replacement 则完全不渲染。模型看到的内容会失去该节点，用户看到的内容不会。因此，隐藏被替换的行始终是插件自己的职责，不是平台行为。
_避免使用：view、conversation、surface_

**Composer**：
消息输入界面，负责 draft、附件标签以及 `@`/`/` 触发系统。
_避免使用：input box、editor、textarea_

**Trigger**：
`@` 文件引用和 `/` 技能与命令背后的补全机制。插件可通过 `ctx.inputTriggers.registerSource` 注册 Trigger。
_避免使用：autocomplete、mention_

## 本项目术语

**Edit-and-resend**：
本功能的一种形式：重新打开 Transcript 中已经发送的用户消息进行编辑，发送编辑结果后，得到一段其中该消息内容已经改变的续接会话。
_避免使用：edit message、resend、retry_

**Regenerate**：
本功能的另一种形式：基于同一条前置用户消息，再次生成一条助手回复。
_避免使用：retry、re-roll、resend_

**Branch** —— **请仔细阅读这一项**：
在 DSH 中，Branch 是通过 `fork({ sessionId, atSeq })` 创建的**新的同级 Session**。它会把包含端点在内的事件前缀 `0..atSeq` 复制到子 Session，并用合成的结束事件关闭未结束的 Turn。Branch 不是当前 Session 内的树节点。
_避免使用：tree、variant、alternative、forked message —— DSH 除了 fork 之外没有 Session 树；类似 ChatGPT 的、在同一线程内通过上一条/下一条导航的 Branch 已由上游明确延后。_

**Replay turn**：
这是两个功能共同使用的复合机制：在同一个 Session 中通过追加**一对**事件原地回退模型 surface——先追加下方的 audit claim，再追加 carrier。两者的 `surfaceOp` 会替换目标消息及其后的所有内容，随后再以全新的 append 发送 prompt。Regenerate 使用原文本重放；Edit-and-resend 使用编辑后的文本重放。
**它不会 fork。** `sessions.fork` 确实存在，但不是本机制；fork 会把用户带到另一个 Session。全新的 append 有双重作用：它负责触发模型，而且由于 replacement carrier 永远不渲染，它也是让新文本对用户可见的唯一方式。
这条 append 就是 **resend message**，其 id 由 carrier 自身的 id 推导而来。这种推导不是简单的记录工作：它让后续读取者仅凭日志回答「这个 carrier 的 prompt 是否曾经排入队列」，而这正是「再次发送」操作是否可用所依据的问题。
_避免使用：rerun、resubmit、branch、fork_

**Audit claim**：
开启这一对事件的 `compaction/prune` 事件：只存在于日志中，永远不是 surface 节点。它记录被 shadow 的范围以及该范围移除节点的**官方** shadow price；这会**使能**宿主自身的 token fold 去扣除这些节点。没有相邻 claim 的 replacement 折叠出的值恰好为零，而范围不同的 claim 会使该折叠抛错。因此，这两个事件必须作为一次写入：claim 单独到达会产生孤立 claim，carrier 单独到达会产生静默的高估。
_避免使用：prune event、tombstone、log entry_

**Carrier**：
结束这一对事件的 `user/message` 事件：它消费 claim，把被替换的范围从模型 surface 中拼接移除，成为新的 surface 尾部，并且**什么也不渲染**（它不是追加来源，参见 Transcript）。它的 `id` 带有插件的标记前缀，`source.kind` 使用 Host plugin 类型，绝不能使用 human-turn 类型。
_避免使用：replacement message、stub message、placeholder_

**Rewind point**：
Replay turn 的 carrier 所在的 Transcript 位置，也就是模型 surface 现在开始的 `seq`。插件会在这里渲染自己的行，该行严格是两者之一：计数通知，或在 carrier 的 prompt 从未到达 agent 时提供「再次发送」的错误行。具体是哪一种由日志决定（该行之所以存在，是因为 carrier 存在），唯一的页面内例外是错误行自身的重试文本所产生的内容。
_避免使用：marker row、notice row、boundary marker_
