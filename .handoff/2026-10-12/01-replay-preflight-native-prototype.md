# 重发前文件处理：原版面板原型交接

工作目录：`D:\Code\MJ-Project\dsh-resend-2`。当前分支为 `main`。

## 从这里继续

用户要求交接当前会话。最新交付是复用插件原版文件回滚面板的交互原型；用户尚未确认采用方案，也没有要求实施正式功能。接下来应根据用户试用反馈调整原型，或在用户要求实施时接入正式流程。

首先阅读[新版原型说明](/D:/Code/MJ-Project/dsh-resend-2/.prototype/replay-preflight-native/README.md)。运行方式、演示情景、控件来源和验证记录以该文件为准，不需要从头研究或重做界面。

## 用户诉求与关键纠正

用户以三轮文件内容 A → B → C 为例，要求根据代码回答重新生成第二轮时面板的位置与恢复目标。已确认：第二轮及之后的旧对话被隐藏；面板可见位置在第一轮之后、新第二轮提问之前；文件恢复目标为 A，点击重新生成本身不会恢复文件。若新回复已修改文件，原恢复计划可能被拒绝。

用户指出助手立即生成，导致用户来不及操作文件回滚。提出的流程为：先预览，用户选择恢复文件后继续、保留当前文件继续或取消，然后才撤回旧对话并发送提示。重新生成与编辑重发共用这一顺序。

第一版逻辑演示被用户明确否定，理由是外观不像插件里的面板。**后续原型必须沿用现有面板和真实 DSH 控件。** 保持一个方案，按反馈调整按钮和流程；不另做通用仪表盘或多种视觉方案。用户尚未评价新版，不能将本次交接理解为批准实施。

## 当前交付与位置

- 最新原型目录：[replay-preflight-native](/D:/Code/MJ-Project/dsh-resend-2/.prototype/replay-preflight-native/README.md)。服务入口为同目录的 [serve.mjs](/D:/Code/MJ-Project/dsh-resend-2/.prototype/replay-preflight-native/serve.mjs)，页面行为为 [prototype.js](/D:/Code/MJ-Project/dsh-resend-2/.prototype/replay-preflight-native/prototype.js)。
- 服务读取插件面板源码，仅在内存中改写必要行为，保留原 CSS 类名和真实控件。页面中的「对照原面板」直接渲染当前发布文件里的原组件。
- 最新截图：[浅色面板](/D:/Code/MJ-Project/dsh-resend-2/.prototype/replay-preflight-native/panel-light.png)、[深色面板](/D:/Code/MJ-Project/dsh-resend-2/.prototype/replay-preflight-native/panel-dark.png)、[手机面板](/D:/Code/MJ-Project/dsh-resend-2/.prototype/replay-preflight-native/panel-mobile.png)。
- 上次交付地址为 `http://127.0.0.1:55366/?open=1`，其中 `open=1` 自动展开预览。**本轮交接检查发现该服务已停止。** 需要展示时按 README 重新启动，以启动输出的端口为准。可用 `DSH_NATIVE_PROTOTYPE_PORT` 指定端口。
- 所有文件变化与助手生成都是内存模拟，编辑结果用 E 表示，不具备理解提示或处理真实文件的能力。底部情景、主题、放慢过程及对照控件属于原型演示栏。手机宽度下演示栏已改为正常文档布局，避免遮挡面板按钮。
- 被否定的旧逻辑演示仍在 `.prototype/replay-preflight.html`，仅为会话历史，后续展示使用新版目录。更早的 `.prototype/file-rollback/` 是其他任务的原型。

## 代码事实入口

需要实施时，沿以下链路核对当前工作区版本：

- [resolve.js](/D:/Code/MJ-Project/dsh-resend-2/src/resolve.js:467)：从目标回复对应的用户提问开始撤回到当前对话尾部。
- [resend.js](/D:/Code/MJ-Project/dsh-resend-2/src/resend.js:244)：准备文件记录、写入撤回记录，然后立即把提示交给助手；这是要改变的顺序。
- [file-versions.js](/D:/Code/MJ-Project/dsh-resend-2/src/file-versions.js:129)：同一文件保留范围内第一次修改前的内容、最后一次修改后的内容。
- [file-rollback.js](/D:/Code/MJ-Project/dsh-resend-2/src/file-rollback.js:104)：助手运行时拒绝预览和执行；恢复还会校验当前文件是否与记录一致。
- [rewind-row.js](/D:/Code/MJ-Project/dsh-resend-2/src/rewind-row.js:182)：现有面板挂在撤回记录处。
- 原型复用的正式面板与样式：[file-rollback-preview.js](/D:/Code/MJ-Project/dsh-resend-2/src/file-rollback-preview.js)、[ui.js](/D:/Code/MJ-Project/dsh-resend-2/src/ui.js)。

## 验证与实施边界

新版浏览器交互、原组件外观对照、深浅主题和手机布局的验证详情见原型 README。本会话较早还运行了相关现有测试，结果为 15 个文件、256 项通过；另在临时工作区实际模拟三轮写入并调用正式发布代码，验证恢复为 A，以及文件后来变为 B 时拒绝恢复。这些是当时的验证，不能代替正式改造后的检查。

当前原型验证的是交互顺序。正式实现仍需处理预览过期、跨窗口操作、文件恢复部分成功、恢复后撤回失败、发送失败重试和重启后的状态；不能把演示的延迟回调直接投入正式代码。

本会话没有修改 `src/`、`lib/` 或真实用户 Profile，没有提交或推送。工作区在本会话开始前就有大量修改和未跟踪文件，当前状态仍保留；不要将现有差异归因于本会话，也不要清理或覆盖。新增原型全部位于已被忽略的 `.prototype/`，普通 `git diff` 不包含它们。

用户确认流程后，再按 prototype 技能归档原型、在相关实施 issue 中记录来源并实施。既有 issue 入口：[文件回滚任务](/D:/Code/MJ-Project/dsh-resend-2/.scratch/dsh-resend-file-rollback/issues/01-file-only-panel.md)，该任务记录的是此前的面板决定，不代表本次前置确认已获批准。

## Suggested skills / 建议技能

- `prototype`：继续试用或调整原型时使用；用户要求现有面板外观，优先于技能默认的多方案要求。
- `playwright`：验证真实控件交互、截图、手机宽度及主题。验证脚本为临时浏览器操作，原型没有新增测试套件。
- `tech-doc-style-chinese`：界面文案与说明保持清晰中文。
- `codebase-design`：正式实施时梳理统一的重发流程及文件恢复职责。
- `diagnosing-bugs`：如果后续出现运行或恢复异常，先定位原因再修改。

继续遵守根目录 [AGENTS.md](/D:/Code/MJ-Project/dsh-resend-2/AGENTS.md) 和用户要求：UTF-8、全程中文、保留现有中文、完成前实际验证。此次 handoff 技能按用户提供的路径读取，文件位于 `C:\Users\Administrator\.agents\skills\handoff\SKILL.md`。
