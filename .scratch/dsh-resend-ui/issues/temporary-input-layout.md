# 临时输入框布局

Status: resolved

## 要求

- 占满消息区域一整行。
- 输入区默认两行，超出后自动增高。
- 框外左上角显示「临时输入框」标签。
- 框内左下角同时显示编辑图标和「在正式输入框中编辑」。

## 结果

正式界面已采用上述布局。文本删减后输入区会收缩至两行，窗口宽度变化后会重新适应文本换行。发送、取消和转到正式输入框的行为保持可用。

原型依据：`codex/prototype-temporary-input-20261011` 分支中的 `.prototype/temporary-input/README.md`、`preview.mjs`、固定版界面代码及截图。用户已经指定布局，因此仅验证该方案。

## 验证

- 真实浏览器中使用已安装 DSH Desktop 控件和主题，模拟操作；验证一行、两行、三行、二十行、清空和删减文本。
- 验证 375、768、1024、1440px 窗口宽度下的浅色、深色主题，无横向溢出。
- 验证不修改文本时改变窗口宽度仍可自动增高和收缩。
- 验证转到正式输入框保留中文文本，Escape 可关闭编辑区。
- 构建、语法、描述文件和宿主接口检查通过；全量测试 2117 项通过、8 项跳过。
- 截图保存在 `output/playwright/temporary-input-desktop.png`、`temporary-input-mobile.png`、`temporary-input-dark.png`。
