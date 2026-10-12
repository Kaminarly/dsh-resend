# 03 — 替换安装文件回滚修订版

Type: task
Status: resolved

## 授权与范围

2026-10-11 用户要求「帮我替换安装」。安装到现有 DSH Desktop 2.0.17 的 desktop Profile，保留其他插件的声明版本、启用选择和用户配置。

## 安装结果

- 使用应用自带的 CLI shim 和 pnpm 环境执行本地包更新，命令退出码为 0。
- dsh-resend 保持启用。安装中的 11 个构建文件及插件补丁与本轮构建逐字节一致。
- 其他插件依赖声明、Bundle 顺序、关闭选择以及 cordis.yml、cordis.patch.yml、pnpm-workspace.yaml 保持原样。
- 直接使用已安装插件副本在隔离 Profile 中验证：Host 加载、启动审计、浏览器加载列表和客户端注册均通过。
- 安装时应用已关闭，没有关闭用户进程、修改会话或执行真实文件回滚。下次打开应用加载新版。

安装包：D:/DSH Desktop/plugins/dsh-resend/file-rollback-20261011-020246/dsh-resend-0.1.0.tgz

更新前备份：C:/Users/Administrator/.dsh/backups/dsh-resend-file-rollback-20261011-020246/

备份包含安装配置、锁文件、工作区配置和原有构建。旧安装包继续保留。

## Comments

本地安装沿用 0.1.0 版本号，以新的固定目录区分包内容，避免重复读取旧包。已安装副本的隔离验证使用工作区临时数据目录，不使用真实用户 Profile 启动测试。
