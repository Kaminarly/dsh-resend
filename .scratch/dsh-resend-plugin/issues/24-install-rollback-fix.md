# 24 — 安装编辑重发与文件回滚修复版本

Type: task
Status: resolved

## 授权与结果

2026-10-12：用户要求「安装插件」。已通过本机 DSH Desktop 的 desktop CLI 将修复版本安装到现有 desktop Profile，插件保持启用。安装时 DSH 应用未运行，下次打开加载新版。

## 验证

- 安装命令退出码为 0。
- 已安装的 15 个文件与修复后的工作区逐字节一致，包含全部 11 个构建文件。
- 插件顺序、启用状态、其他插件版本及用户配置保持原样；安装清单只更新本插件的本地包路径。
- 对已安装副本进行隔离加载验证：Bundle 装配、Host 启动、启动审计、客户端加载列表和客户端登记均通过。
- 未启动真实用户会话或发送模型消息。

安装包：`D:/DSH Desktop/plugins/dsh-resend/rollback-fix-20261012162039/dsh-resend-0.1.0.tgz`。

更新前备份：`C:/Users/Administrator/.dsh/backups/dsh-resend-rollback-fix-20261012162039/`，包含原插件、安装清单、锁文件和用户配置；旧安装包保留。

安装核对报告：`output/rollback-fix-install-report.json`。已安装副本加载报告：`output/rollback-fix-installed-probe-output.txt`。

本次安装包含已验证的文件关联修复及临时输入框保护；正式输入框完整编辑重发仍受宿主接口限制。修复范围见[修复记录](../../../docs/session-rollback-fix-20261012.md)。
