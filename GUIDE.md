# dsh-resend 开发指南

本文面向阅读、测试、修改或发布插件的开发者。普通使用者的功能和安装说明见 [README.md](README.md)。项目术语见 [CONTEXT.md](CONTEXT.md)，问题记录和文档布局约定见 [AGENTS.md](AGENTS.md)。

## 项目定位

`dsh-resend` 是一个 DSH Desktop Bundle：一个 npm 包同时提供 Host plugin 和 Client plugin，并通过 `cordis.patch.yml` 加入 Profile。

- Host 入口是 `package.json` 的 `main`，指向 `lib/index.js`。它注册严格 Remote 描述符并创建 `resend` 服务，负责检查请求、读取会话、准备文件记录和写入。
- Client 入口是 `package.json` 的 `./client` 导出，指向 `lib/client.bundle.js`。它向 DSH 的 Slot 注册消息操作、临时输入框、文件面板和「DSH Resend」设置页。
- `src/` 是手写源代码，`lib/` 是 `scripts/build.mjs` 生成并提交的发布文件。不要手动编辑 `lib/`。

## 当前行为

### 编辑重发与重新生成

编辑重发在已发送的用户消息上打开独立的临时输入框。临时输入框与正式 Composer 的普通草稿分开，支持 `@` 文件或目录引用、`/` 技能选择、撤销和重做；不支持编辑原消息中上传的附件。

重新生成使用所选助手回复对应的问题。编辑重发使用用户修改后的文字。两个操作都从目标处续接有效对话：目标之后的内容会退出后续上下文，插件也会固定隐藏被替换的消息行；原始 Session log 仍保留这些记录。靠近对话开头操作可能隐藏大量后续内容。

「DSH Resend」设置包含四项：显示编辑重发按钮、显示重新生成按钮、只允许编辑重发最后一条用户消息、只允许重新生成最后一条助手回复。设置按 Profile 保存；默认显示两个操作按钮，两个范围限制默认关闭。范围判断依据当前完整有效对话，不依据当前屏幕显示的消息窗口。

Host 写入 rewind 时，会把 audit claim（`compaction/prune`）与 carrier（`user/message`）作为一对事件，在首次追加前用宿主 replay 一起校验，再相邻追加并只 flush 一次。随后通过 `agent.followup` 提交提示。该调用没有返回接受结果，Host 紧接着读取 `agent.status` 判断提示是否已排队。若未排队，Client 显示「再次发送」入口；它只重试发送，不会重复 rewind。此重试状态保存在当前页面内，页面刷新后不承诺恢复。

### 文件回滚

编辑重发和重新生成先检查被替换范围内可识别的文件改动。没有文件改动时直接继续；有改动时，用户可查看清单和内容差异，选择要还原的文件、保留文件后继续，或取消。部分还原失败时会停止自动续接，显示逐文件结果；用户重新检查并决定如何处理剩余文件后才能继续。

历史 Rewind point 也提供独立的文件回滚入口。它只处理文件，不回退对话，也不发送提示。预览与执行分离；执行前重新核验文件内容和计划。当前文件与记录的助手修改后内容不一致时，插件拒绝覆盖。已还原及结果不确定的文件不会因重试而自动重复写入。

文件内容差异预览只展示受限文本：两个版本合计超过 3 MiB、任一版本超过 10,000 行或任一单行超过 20,000 个 Unicode 码点，以及内容不是可展示的 UTF-8 文本时，会说明不能预览；这不会单独取消文件原有的还原资格。还原完成后，可查看这次实际写回的内容；该查看不读取工作文件的后续变化。

插件只记录其能可靠关联的受支持工具写入。Shell 命令和第三方工具的任意文件写入不在保证范围内；历史记录缺少可靠原始内容时会明确拒绝还原，不会用 Git HEAD 或展示用差异猜测。清理入口位于「DSH Resend」设置页，包括「清理无用残留」和「按会话清除回滚数据」。清理先预览再确认，并保护仍被其他记录引用的内容。

文件清单和内容保存在插件私有数据目录：默认是 `~/.dsh/plugins/dsh-resend/`，也可由 `DSH_HOME` 指定。该目录不按 Profile 分开，同一 `DSH_HOME` 下的 Profile 共用。Git 工作区使用插件私有 Git blob；非 Git 工作区使用 SHA-256 内容对象。当前没有跨版本差分打包；相关优化仍是研究建议，不是已交付功能。

## 工程结构

```text
package.json       包入口、依赖、DSH 元数据和 npm 命令
cordis.patch.yml   将 Bundle 加入 Profile
src/               手写 Host、Client、编辑、回滚、存储和设置模块
lib/               可发布构建产物；由 scripts/build.mjs 生成
scripts/           构建、契约门禁、隔离启动及浏览器验收工具
test/              Vitest 测试、fixtures 和测试辅助工具
docs/              验收记录、故障记录、存储研究与 ADR
.scratch/          本地 issue/spec 记录，遵循 AGENTS.md 约定
```

阅读核心路径时，可从这些文件开始：

- `src/index.js`、`src/host.js`：Host half 注册与服务启动。
- `src/resend.js`、`src/resolve.js`、`src/write.js`：请求处理、目标解析和 rewind 写入。
- `src/log-read.js`、`src/file-versions.js`、`src/file-snapshots.js`：日志读取、文件变更记录和快照存储。
- `src/file-rollback.js`、`src/rollback-files.js`、`src/content-preview.js`：回滚计划、文件写回和内容预览。
- `src/client.js`、`src/ui.js`、`src/temporary-editor.js`：Client 注册、界面和临时输入框。
- `src/typert.js`、`src/typert.host.js`、`src/typert.client.js`：Host 与 Client 共用的 Remote 描述符及两侧注册。

## 开发与验收

环境要求：Node.js 22 或更高版本。安装依赖并运行常规检查：

```powershell
npm ci
npm run check
npm run build
git diff --exit-code -- lib/
npm test
```

CI 按 `check → build → 比较 lib/ → test` 的顺序执行。提交源码改动时，生成产物必须与源码一致；不要在 build 前比较 `lib/`。

持久化设置集成测试使用 DSH Desktop 的 Loader、ConfigEditor 和 SettingsForms。本机有 DSH Desktop 时，测试读取实际安装；GitHub Actions 则使用锁文件中的 DSH `0.2.0-rc.2` 依赖，并先应用 `test/fixtures/dsh-app-boot-0.2.0-rc.2.patch`，模拟 DSH Desktop 2.0.17 随附的宿主补丁。

`npm run check` 包含三项检查：

1. `scripts/check-syntax.mjs` 使用 esbuild 解析器遍历 `src/` 和 `lib/` 中的 JavaScript。
2. `scripts/check-typert.mjs` 使用安装的 DSH Typert registry 校验描述符、Host/Client 两侧贡献和拒绝路径。描述符表必须非空；旧参数 `--allow-empty-descriptors` 会作为未知参数拒绝。
3. `scripts/check-host-contract.mjs` 检查插件实际读取的宿主成员及已移除成员。没有可读取的 DSH Desktop 安装时会显示 `SKIP`；该项只有实际运行才算完成。

`npm test` 运行 Vitest 测试。测试覆盖请求拒绝、范围规则、编辑器、文件回滚、存储清理、多窗口状态及构建契约。不要在文档中固定测试文件数或通过数；测试集合会随项目变化。

`npm run probe` 在 `.tmp/` 下创建隔离 `DSH_HOME` 和 `probe` Profile，使用安装的 DSH Launcher 验证 Bundle 装配、Host 启动和 Client 注册。它不会使用真实的 `$DSH_HOME` 或发送模型请求。此检查需要未打包的 DSH Desktop 安装；缺少应用或 Launcher 时会显示 `SKIP`。

`node scripts/preview-ui.mjs` 启动本地界面预览，使用安装版 DSH 的 React、控件和主题，以及示例会话和模拟操作。它不读取真实会话、不请求模型，也不改动工作文件。可通过 `DSH_APP_ROOT` 指向 `resources/app` 或 `app.asar`，供宿主契约检查选择目标安装；`probe` 仍需要展开的应用目录。

专项验收命令来自 `package.json`：

```powershell
npm run acceptance:browser
npm run acceptance:bundle
npm run acceptance:rollback:visual
npm run acceptance:rollback:browser
npm run acceptance:rollback:bundle
node scripts/verify-settings-display-browser.mjs
```

这些检查覆盖临时输入框、安装包内容、隔离 Profile、文件还原交互和设置布局。Bundle 验收需要本机 DSH Desktop 测试环境；浏览器验收使用 Edge，打包验收使用 `tar`。检查输出和截图写入被忽略的 `output/`，不属于源码或发布文件。验收使用隔离数据和替身接收服务，不代表向真实用户 Profile 安装或请求外部模型。

## 兼容性与依赖

当前验证组合：

| 组件 | 当前支持与验证版本 |
|---|---|
| DSH Desktop | `2.0.17` |
| DSH runtime（`@deepseek-ai/dsh` 与 `@deepseek-ai/dsh-*`） | `0.2.0-rc.2` |
| `@deepseek-ai/cordis` | `4.0.4` |

`package.json` 中的 `peerDependencies` 给出允许范围；锁文件固定开发和验收所用版本。版本范围不能替代宿主契约检查：兼容性由实际宿主表面（host surface）决定，插件依赖宿主暴露的服务、导出和 Slot；宿主形状变化时 `npm run check` 应失败。

运行依赖包括 `zod` 和 ProseMirror 编辑器模块。`react`、`react-dom` 由 DSH Client 提供，因此声明为 peer，不重复打入浏览器包。`@deepseek-ai/dsh-api-gateway` 是开发依赖，用于驱动真实 Remote consumer 测试；发布代码通过注入的 Remote 调用它，不直接导入该包。`@deepseek-ai/dsh-util-crypto` 同时是 peer 和开发依赖，Host 用它生成消息标识。

## 安装与发布

### 本地安装

在仓库根目录运行以下命令，生成 `.tgz` 包：

```powershell
npm ci
npm run check
npm run build
New-Item -ItemType Directory -Path "D:\DSH Desktop\plugins\dsh-resend" -Force
npm pack --pack-destination "D:\DSH Desktop\plugins\dsh-resend"
```

在 DSH Desktop 侧栏打开「插件」，选择「添加插件」，输入 `.tgz` 文件的绝对路径并安装，然后启用 `dsh-resend`。升级时先卸载旧版，再安装新包。不要把本机临时路径写进发布说明。

如果 dsh-resend 已发布到该 Profile 使用的 npm registry，普通 Profile 可以使用 DSH 命令：

```text
dsh plugin --profile <name> add dsh-resend
```

DSH Desktop 2.0.17 的 `desktop` Profile 由应用管理；通用启动器不能管理这个 Profile，应通过桌面插件页面安装。

### 通过 GitHub 安装

已安装的 DSH Desktop 2.0.17 插件管理器接受 GitHub 仓库地址，例如：

```text
github:Kaminarly/dsh-resend#v0.1.0
```

这条路径不要求先发布到 npm，但需要公开可访问的仓库、可安装的根目录 `package.json`、已提交的 `lib/` 构建产物、可用的 `cordis.patch.yml`，以及本机 Git 和 GitHub 网络连接。安装器会检查 DSH 兼容性；GitHub 仓库无法访问时，切换 npm 镜像不能解决该连接问题。安装器不自动更新插件，升级需要卸载后重新安装新标签。

首个 GitHub Release 为 `v0.1.0`。后续安装时，将地址中的标签替换为要安装的发布版本；发布新标签前，应先完成本指南中的检查和测试。

## 已知限制

- Rewind 会改变后续有效上下文，并隐藏被替换的 Transcript 行；原始 Session log 保留。较早位置的操作可能隐藏大量后续消息，目前没有隐藏比例上限。
- 临时输入框不能编辑原消息的上传附件；文件引用和技能选择不等于附件复制。
- 任意 Shell 命令和第三方工具的文件写入不保证进入回滚记录。
- 旧会话缺少可靠原始文件内容时，插件会拒绝还原；不会从当前文件或 Git HEAD 推测历史。
- 「再次发送」只补发未被 agent 接收的 prompt，不重新回退；其请求状态只在当前页面生命周期内保留。
- Remote `rollback` 只支持文件范围；会话回滚和文件加会话的组合范围已移除。

## 相关文档

- [README.md](README.md)：普通使用者的功能与安装说明。
- [CONTEXT.md](CONTEXT.md)：平台术语和本项目术语。
- [docs/action-policy-acceptance.md](docs/action-policy-acceptance.md)：四项设置与操作范围验收。
- [docs/rich-input-acceptance.md](docs/rich-input-acceptance.md)：临时输入框和交付包验收。
- [docs/rollback-delivery-acceptance.md](docs/rollback-delivery-acceptance.md)：文件多选、差异预览和完成结果的整体交付验收。
- [docs/cache-cleanup-acceptance.md](docs/cache-cleanup-acceptance.md)：回滚数据清理验收。
- [docs/rollback-storage-research-20261013.md](docs/rollback-storage-research-20261013.md)：未实施的存储优化研究；其中方案不能当作当前功能。
