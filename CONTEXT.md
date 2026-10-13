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

**临时输入框**：
打开已发送用户消息后，用于编辑并从该消息位置重新续接的输入界面。其编辑内容独立于正式 Composer 中待发送的普通草稿。
_避免使用：备用正式输入框、普通新消息输入框_

**文件引用**：
消息中指向工作文件或目录的路径引用。引用路径与上传文件附件是不同的对象。
_避免使用：文件上传、附件_

**Skill 调用**：
用户在消息中显式选择或写入某个技能名称，要求助手使用该技能处理请求。它不同于执行切换设置等独立斜杠命令。
_避免使用：执行任意命令、调用所有斜杠命令_

**Edit-and-resend**：
本功能的一种形式：重新打开 Transcript 中已经发送的用户消息进行编辑，发送编辑结果后，得到一段其中该消息内容已经改变的续接会话。
_避免使用：edit message、resend、retry_

**Regenerate**：
本功能的另一种形式：基于同一条前置用户消息，再次生成一条助手回复。
_避免使用：retry、re-roll、resend_

**最后一条用户消息**：
当前有效对话中最新的用户本人发送的消息，排除 Carrier 和宿主注入的上下文消息。已被替换的旧记录不参与判断，也不根据屏幕中的显示位置判断。
_避免使用：屏幕最下面的消息、最后一轮_

**最后一条助手回复**：
当前有效对话中最新的助手回复，与最后一条用户消息分别判断。其后出现新用户消息本身不会改变这一判定；已被替换的旧回复不参与判断。
_避免使用：屏幕最下面的回复、最后一轮_

**操作范围限制**：
分别约束 Regenerate 和 Edit-and-resend 是否只能操作当前有效对话中各自类型最后一条消息的规则。两个限制互相独立，编辑范围限制也覆盖从旧消息进入 Composer 编辑的快捷入口。
_避免使用：显示开关、最后一轮限制_

**固定隐藏**：
被替换的消息退出 Transcript 显示，原始 Session log 仍保留的既定行为。它不再是可由用户关闭的偏好。
_避免使用：删除消息、清空日志_

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

**清理无用残留**：
删除本插件未被保留记录使用的内容、遗留临时数据，以及无法确认会话归属的回滚数据；保留可识别会话的历史文件回滚数据。
_避免使用：清空回滚数据、清空全部缓存_

**按会话清除回滚数据**：
从拥有本插件回滚数据的会话中选择目标，清除所选会话的历史文件回滚数据；不会删除会话或修改工作文件。
_避免使用：删除会话、回滚文件、清空所有会话_

**无文件快照**：
会话拥有本插件的回滚记录，但记录中没有保存可用于恢复的文件内容；这类会话仍属于按会话清除的可选对象。
_避免使用：没有回滚记录、没有会话数据_

**文件回滚**：
针对某个 Rewind point 对应的工作，将可确认的文件恢复到这次工作之前的内容；先展示预览，再由用户确认。已还原或无法确认上次还原结果的文件保留当前内容，未处理文件可以重新预览。
_避免使用：重置项目、撤销全部修改_

**文件回滚预览**：
一次待确认的文件处理清单，分别列出可还原文件和保留文件及原因。确认仅执行这份清单；清单失效后需要重新预览。
_避免使用：自动回滚、立即还原_

**文件回滚内容预览**：
在文件回滚预览中，展示文件当前内容到还原后内容的差异，标出回滚将删除和恢复的行。查看内容与选择是否还原是不同的操作。
_避免使用：助手修改预览、立即回滚_

**选中还原文件**：
用户在待确认的文件处理清单中勾选、要求本次还原的文件集合。查看某个文件的内容差异不代表将其加入选中还原文件。
_避免使用：所有可还原文件、正在查看的文件_

**用户选择保留**：
文件具备还原条件，但用户未将其选入本次确认的还原集合；本次回滚成功结束后，该文件不再从同一回滚点补还原。它与因缺少快照、内容变化等原因而无法还原不同。
_避免使用：还原失败、无法还原_
