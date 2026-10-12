# 15 — 较早回复的重新生成按钮未禁用

Status: resolved
Type: bug

## 现象

在 DSH Desktop 2.0.17 中，较早回复下方的重新生成按钮仍可点击，悬停只显示「重新生成」。需要显示灰色禁用图标，并在下方的悬停提示中显示「只能重新生成最后一条回复」。

## 原因与修复

`ConversationNodeAssembler` 调用 `Definition.start(context, match, reader)`。邻接读取器是第三个参数，`previous(kind)` 查找已注册 Definition 的上下文，返回 `state` 和 `matches`，并不返回原始事件。

旧实现从第一个参数读取 `previous`，又以原始事件类型作为查找名称，因此每条回复都得到空的 `prevSeq`，全部被误判为最后一条。旧测试手工填写邻接信息，未覆盖真实宿主调用。

修复后，通过第三个参数读取插件自身的回复和用户消息 Definition；上一条回复从 `state.seq` 获取，提示词事实从该用户消息上下文的起始 Match 获取。

## 验证

- `npx vitest run test/regenerate-control.test.mjs -t 'installed assembler'` 在修复前失败：较早回复的按钮 `disabled` 为 `false`；修复后通过。
- 新增测试使用电脑上安装的 DSH 会话组装器，覆盖打开历史、禁用较早回复，以及实时新增回复后更新按钮状态。
- 浏览器验证使用上述真实组装器产生的数据和宿主控件，确认图标禁用、最后一条可用、悬停文字准确且位于图标下方。
- 全量测试 473 项通过，2 项跳过；语法、描述符和宿主兼容检查通过。

后续涉及会话 Definition 邻接读取的测试应覆盖真实组装器，避免仅依靠手工指定的伴生状态。
