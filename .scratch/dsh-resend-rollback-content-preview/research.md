# 文件回滚内容预览可行性

调查日期：2026-10-13。基于当前工作区和本地安装的宿主依赖；本次仅调查和编写文档，未实现功能。

## 已确认事实

- 截图中的重发前置面板与历史文件回滚入口共用 `src/file-rollback-preview.js` 中的 `FileRollbackPreview`。重发前选择恢复、保留或取消由 `ReplayPreflight` 和 `chooseReplay` 接入。
- 可还原文件的临时计划已持有工作前后的原始内容。创建计划时核验工作文件与记录的结束内容一致；执行前再次核验。可以据此展示清单创建时的当前内容与还原后内容的差异。
- 当前远程契约只返回路径、动作和原因，不返回文件内容。内容预览需要新增受限读取能力或扩展契约，不能仅增加界面。
- 被拒绝还原的文件不保证有可用的前后内容，不能承诺所有文件都能预览。
- 本地 `@deepseek-ai/dsh-client-ui-primitives` 提供 `DiffBlock`，输入为 `oldText`、`newText` 和路径，可控制折叠行数。`newText` 必须是字符串，文件即将删除的状态需要明确补充，不能用空字符串冒充文件不存在。

## 初步结论

具备实现条件。用户第一轮已选择当前内容到还原后内容的差异、两个入口和逐文件多选。内容读取仍应绑定有效回滚清单；逐文件多选需要同时调整执行范围和完成记录。

## 多选对现有规则的影响

- 当前成功执行会永久结束整个回滚点：`src/file-rollback.js:119`、`src/file-rollback.js:188`。用户第二轮决定延续这一规则，未选文件记为用户选择保留，不在同一回滚点补还原。
- 执行前目前核验全部可还原文件：`src/file-rollback.js:141`。若只执行选中子集，需要明确未选文件变化是否影响本次执行。
- 当前进度仅区分待处理、拒绝、结果不确定、已还原，不区分用户主动保留：`src/file-rollback.js:81`、`src/file-rollback.js:150`。
- 当前结果转换会按整份清单的完成状态推断文件已还原：`src/resend.js:49`、`src/file-rollback-preview.js:111`。多选后必须依据每个文件的真实结果显示。
- 没有按时间自动过期；新预览、取消、执行、会话释放、重启和回滚数据清理均可能使临时计划失效。
- 同一文件连续改写合并为首次工作前内容和最后一次工作后内容；新增文件回滚意味着删除文件，必须与还原为空文件区别显示。
- 当前没有正文大小、行数或差异计算上限。非文本和超限预览需要独立降级规则，不能直接等同于无法还原。
- 现有中断恢复记录没有保存选中集合。多选后需要保存实际选择，避免重新预览、刷新或重启后意外扩大还原范围，并兼容旧记录。
- 宿主提供独立 `Modal` 和 `useModalLayer`，见本地依赖 `lib/types/Modal.d.ts`、`lib/types/useModalLayer.d.ts`。现有前置面板自行约束键盘行为，内容弹窗叠加时需要协调 Escape 和 Tab。

## 宿主样式依据

- `node_modules/@deepseek-ai/dsh-client-ui-primitives/lib/Modal.module.css`：弹窗采用分层背景、主题圆角、主题突出阴影和遮罩，普通弹窗默认宽度约 380 像素；标题和正文使用统一间距，包含减少动态效果处理。
- `node_modules/@deepseek-ai/dsh-client-ui-primitives/lib/DiffBlock.module.css`：使用宿主代码字体、删除／恢复语义色及背景色，并以减号／加号补充颜色；代码区域支持内部横向滚动和换行。
- `node_modules/@deepseek-ai/dsh-client-ui-primitives/lib/Button.module.css`、`Checkbox.module.css`：控件尺寸、圆角、主题颜色、禁用与悬停反馈、复选框焦点样式均可复用。
- UI/UX 技能查询用于核对焦点、响应布局和反馈要求；其泛用品牌色、外部字体及展示页布局不适用于本插件，样式以实际宿主为准。规格中的约 960 像素大弹窗为本功能设计基准，非宿主现成默认尺寸。

## 验证

- 界面相关现有检查：`npm test -- --run test/file-rollback-ui.test.mjs test/replay-preflight-ui.test.mjs`。实际运行 5 个测试文件，29 项通过。
- 后端相关现有检查：`npm test -- test/file-rollback.test.mjs test/file-rollback-race.test.mjs`。实际运行 8 个测试文件，133 项通过。覆盖内容保真、回滚失效、外部修改、文件安全边界、清理与中断等既有规则。
- 前置流程现有检查：`npm test -- test/replay-preflight.test.mjs`，29 项通过。

以上检查验证现有机制，不代表尚未实现的内容预览功能已通过验收。
