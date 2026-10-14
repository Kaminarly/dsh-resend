# 按钮显示设置联动：验收记录

日期：2026-10-14。

已将「消息下方的内联编辑器」替换为「显示编辑重发按钮」。关闭编辑或重新生成显示开关时，隐藏对应入口，并禁用对应的范围限制选项；另一个操作的设置保持可调整。已保存的限制值及打开的编辑草稿保留。旧内联编辑器配置不迁移为隐藏按钮的决定。

- 完整测试：129 个测试文件通过、1 个跳过；2360 项通过、10 项按环境跳过。
- 设置联动浏览器验证：20 个开关组合与布局检查通过，覆盖两种主题、375／1024 像素窗口、禁用后的限制值保留和重新启用。
- 实际宿主设置系统验证：持久保存、刷新、重启、跨窗口同步、保存失败及旧配置兼容通过。
- 构建、请求契约与实际宿主契约检查通过；安装包全部交付文件与工作区一致。
- 解包后的隔离宿主启动通过，浏览器验证解包后的客户端代码，临时输入框原有 49 组验收通过、无浏览器错误。

设置截图：[浅色桌面](../../output/playwright/settings-display-light-1024.png)、[深色窄窗口](../../output/playwright/settings-display-dark-375.png)。交付证据：[acceptance.json](../../output/rich-input-release/2026-10-14T06-44-53-379Z/acceptance.json)。可运行 `node scripts/verify-settings-display-browser.mjs` 重现联动验证。

安装包保存到 `D:/DSH Desktop/plugins/dsh-resend/settings-display-20261014/dsh-resend-0.1.0.tgz`，通过 DSH 自带桌面命令行安装到 `desktop` Profile。安装前的 Profile 清单、锁文件及配置备份在同一目录的 `profile-before-install/`。安装后核对交付文件及原有启用状态。若当前窗口仍显示旧界面，重启 DSH Desktop 后加载新版。
