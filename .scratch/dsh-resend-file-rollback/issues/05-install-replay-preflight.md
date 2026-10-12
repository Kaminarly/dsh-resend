# 05 — 安装重发前文件处理版本

Type: task
Status: resolved

## 授权与结果

2026-10-12：用户要求「帮我安装」。已更新到现有 DSH Desktop 2.0.17 的 desktop Profile，dsh-resend 保持启用。

应用当前处于关闭状态，下次打开加载新版。未关闭用户应用进程、启动真实用户会话或发送模型消息。

## 安装与验证

- 用应用自带 desktop CLI 和包管理环境安装新的本地包，命令退出码为 0。
- 安装后逐字节核对全部 15 个文件，其中包含 11 个构建文件，全部与已验证版本一致。
- 已安装 Host 的接口贡献包含重发前置处理入口。
- 插件顺序、启用选择、其他插件依赖声明与实际版本、cordis.yml、cordis.patch.yml 和 pnpm-workspace.yaml 均保持原样；安装清单仅更新本插件的本地包路径。
- 使用已安装副本在隔离 Profile 启动验证：Host 加载、启动审计、客户端加载列表和客户端注册全部通过。

安装包：`D:/DSH Desktop/plugins/dsh-resend/replay-preflight-20261012150321/dsh-resend-0.1.0.tgz`。

更新前备份：`C:/Users/Administrator/.dsh/backups/dsh-resend-replay-preflight-20261012150321/`。包含原安装清单、锁文件、用户配置、工作区配置与原插件文件；旧安装包保留。

安装核对报告：`output/replay-preflight-install-report.json`。已安装副本的隔离验证脚本：`output/probe-installed-replay-preflight.mjs`。
