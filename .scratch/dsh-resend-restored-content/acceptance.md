# 完成后查看还原内容：验收记录

日期：2026-10-14。

已结束的回滚清单中，已还原文件右侧显示「查看还原内容」。弹窗展示本次保存的还原正文及行号、BOM、行结束符和末尾换行信息；后续工作文件修改不改变结果。删除文件、空文件、非文本、超限及记录清理或损坏有明确说明。入口不依赖已消费的预览计划，不写工作文件、会话日志或额外正文副本。

## 验证结果

- 完整测试：129 个测试文件通过、1 个跳过；2356 项通过、10 项按环境跳过。
- 构建和检查通过：两端请求契约一致，实际宿主契约检查通过，重复构建字节一致。
- 浏览器与真实临时文件：22 个场景通过，覆盖回滚前与历史入口、完成后查看、后续修改、刷新和 Host plugin 重建、删除结果、焦点返回以及原有选择和失败恢复流程。
- 视觉验证：47 项布局检查、8 组对比度检查通过；人工检查新增的浅色桌面和深色 375 像素截图，正文、按钮、关闭入口均可见。
- 隔离宿主启动：6 项检查通过，插件成功挂载，实际提供的浏览器代码与构建一致。
- 安装包：全部交付文件与工作区字节相符；安装后 16 个文件与验收包一致。

桌面截图：[完成后正文](../../output/playwright/restored-content-history-1024.png)。深色窄窗口：[完成后正文](../../output/playwright/restored-content-preflight-375.png)。完整交付证据：[acceptance.json](../../output/rollback-release/2026-10-14T06-10-45-354Z/acceptance.json)。测试使用临时工作文件及接受／拒绝请求的助手替身，不请求外部模型。

## 安装

通过 DSH 自带的 `resources/app/lib/desktop-cli.js`，执行 `plugin --profile desktop add <本地安装包>`。安装退出码为 0。安装前将 Profile 的清单、锁文件、依赖脚本配置和插件配置保存到安装目录中的 `profile-before-install/`。

安装包位于 `D:/DSH Desktop/plugins/dsh-resend/restored-content-20261014/dsh-resend-0.1.0.tgz`，SHA-256 为 `865c1e9887d2bd8977a9f33c94e3bd7fbad7b201337f2265e5ed923b35baa192`。实际安装位置为 `C:/Users/Administrator/.dsh/profiles/desktop/node_modules/dsh-resend/`。Profile 已指向新包，`dsh-resend` 仍在已选组合包中，未被禁用，原有插件配置保持。

本次确认了磁盘安装及启用配置，隔离宿主可正常加载。运行中的 Desktop 服务对无认证读取返回 403，因此未把磁盘核对解释为已确认热加载。若当前窗口仍显示旧版，重启 DSH Desktop 后加载新包。
