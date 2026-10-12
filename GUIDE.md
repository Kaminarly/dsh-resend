# dsh-resend 项目导读

本文说明这个仓库是什么、代码怎么组织、从哪里开始读。面向需要阅读或修改本插件的开发者。

## 这是什么

dsh-resend 是面向 DSH Desktop（DeepSeek Harness 桌面版）的第三方插件包，为会话提供两个核心能力：

- **Edit-and-resend（编辑重发）**：重新打开已发送的用户消息，编辑后再发送。
- **Regenerate（重新生成）**：基于同一条提示再次生成助手回复。

## 工作原理

一个 npm 包即一个 Bundle，包含两侧：

- **Host plugin**（`src/host.js`，产物 `lib/index.js`，Node ESM）：注册 Typert 描述符表并创建 `resend` 服务。
- **Client plugin**（产物 `lib/client.bundle.js`，浏览器 JS）：通过 Slot 挂载 React UI，包括消息操作图标、内联编辑器和设置页。

`resend.apply` 是一次严格类型化的 Remote 调用。执行时写入一对事件完成 rewind：

1. audit claim（`compaction/prune`），携带官方 shadow price，宿主自己的 token fold 据此扣除该范围，不会静默高估。
2. carrier（不渲染的 `user/message`），携带 `surfaceOp` 与 `sourceEventSeqs`。

两者在第一次 append 前通过宿主自己的 replay 一起校验，随后相邻追加，只 flush 一次。flush 完成后，提示通过 `agent.followup` 排入 agent 队列，结果 envelope 报告已排队消息的 id。

`followup` 是 fire-and-forget 调用并返回 `undefined`，唯一的接受信号是紧接调用后读取的 `agent.status`。若 agent 未接收提示，rewind 保留，envelope 省略该 id，Client 在 rewind point 渲染错误行并提供「再次发送」按钮；按下按钮重放同一个请求，Host 重新发送提示，但不会执行第二次 rewind。

## 主要功能模块

| 功能 | 说明 |
|---|---|
| 消息编辑与重新生成 | 内联编辑器、放入 Composer 的草稿转移、错误行重试 |
| 范围限制策略 | 「只允许编辑重发最后一条用户消息」「只允许重新生成最后一条助手回复」等四个独立开关，按 Profile 保存 |
| 隐藏被替换行 | 由插件自己的 CSS 隐藏计划实现；平台 Transcript 按追加来源渲染，设计上仍会显示这些行 |
| 文件回滚预览 | 记录 agent 在被撤销跨度内写过的文件，使用插件数据目录内的私有 Git blob 存储或内容寻址快照；逐字节比较后再还原 |
| 回滚数据清理 | 清理无法归属的残留数据、按会话清除回滚快照 |

范围限制与设置项的逐项验证见 [整体验收记录](docs/action-policy-acceptance.md)，清理功能的验证边界见 [清理功能验收记录](docs/cache-cleanup-acceptance.md)。

## 工程结构

```
src/       手写源代码（36 个 JavaScript 模块）
lib/       已提交的构建产物，由 esbuild 生成，不要手动编辑
scripts/   build.mjs、三个门禁脚本、probe-profile.mjs、preview-ui.mjs
test/      vitest 测试套件（37 个测试文件、fixtures 与 helpers）
docs/      验收记录、adr/、agents/
```

## 质量门禁

CI 在同一个任务内依次执行：

```
check → build → git diff --exit-code -- lib/ → test
```

任一阶段失败即整体失败。`npm run check` 包含三道门禁：

1. **`scripts/check-syntax.mjs`**：用打包器自己的解析器遍历 `src/` 与 `lib/` 下每个 JavaScript 文件，在 build 之前同时发现源码与已提交产物中的语法错误。
2. **`scripts/check-typert.mjs`**：通过已安装的 `@deepseek-ai/dsh-typert-registry` 校验器驱动描述符两侧，逐项修改真实贡献的副本断言 §6.3 的七条规则，并读取实际运行的两个产物与两侧比较。
3. **`scripts/check-host-contract.mjs`**：直接读取已安装的 DSH Desktop 应用（`app.asar` 或未打包的 `resources/app`），断言插件读取的每个成员仍然存在，上游已移除的成员保持消失。断言表在 `scripts/host-contract.mjs`，按声明成员的 Host 实体（类）组织。未安装应用时打印 `SKIP` 并以零退出。

`npm run probe` 是唯一无法在没有安装包环境运行的检查：在 `.tmp/` 下创建临时 `DSH_HOME`，把本包安装到 `probe` Profile，在操作系统分配的端口启动已发布的 Launcher，并断言 Host 审计保持静默、启动图包含 Client 行、提供的 Bundle 会自行注册。它不接触真实的 `$DSH_HOME`。

`node scripts/preview-ui.mjs` 提供本地界面验证页，使用已安装 DSH Desktop 的实际 React、消息气泡、控件和主题样式，配合示例消息与模拟操作，不读取真实会话、不发送模型请求、不改动用户文件。可用 `?dark`、`?busy` 检查深色主题与运行中禁用提示。

设置 `DSH_APP_ROOT` 可让门禁与 probe 指向指定安装，既可以是未打包的 `resources/app` 目录，也可以是 `app.asar` 路径。

## 目标上游版本

| 目标 | 版本 |
|---|---|
| DSH Desktop | `2.0.17` |
| `@deepseek-ai/dsh-*` | `0.2.0-rc.2` |
| `@deepseek-ai/cordis` | `4.0.4` |

兼容性由宿主表面（host surface）决定，不由 semver 决定：插件读取已安装 Host 实际暴露的成员，当断言的某个成员缺失或形状变化时 `npm run check` 会失败。`peerDependencies` 范围带有上下界并强制 `includePrerelease`；上表是本包验证过、也是开发依赖锁定的版本组合。

## 依赖上的几个约定

- **`zod` 是唯一运行时依赖**，描述符的严格 codec 需要它。schema 用 `zod/mini` 编写：两侧从同一张表派生，经典入口会把 Client 永远不会调用的函数连同约 750 KB 的 zod 打进浏览器脚本（规范 §16.5）。
- **`@deepseek-ai/dsh-api-gateway` 是 devDependency 而非 peer**：已发布代码不导入它，Client 侧通过 `ctx.remote` 访问。锁定它是为了让 CI 驱动真实的 consumer（mount、dispatch、envelope）。
- **`@deepseek-ai/dsh-util-crypto` 同时是 peer 与 devDependency**：Host 侧导入它的 `randomUUID` 生成 carrier 与 resend message 的标记 id，因此本包不直接调用 `crypto.randomUUID`——该 Web API 在安全上下文之外不可用。
- **`@deepseek-ai/dsh-token-meter` 仅是 devDependency**：已发布代码通过 `ctx.get('tokenMeter')` 解析 meter 并从服务获取官方 estimator，这样 audit claim 的价格就是宿主 fold 会扣除的数值。
- **`react` 与 `react-dom` 均为 peer**，由宿主浏览器的模块表提供；插件用 `createPortal` 把重新生成的错误提示显示在会话裁切区域之外，不打包第二份 React。`jsdom` 仅用于验证错误边界、消息操作和设置页。
- 本包不提供 `./typert` 导出，也不使用 Typert loader 注册描述符，而是直接调用 `ctx.typert.register()`：该 loader 需要本插件不使用的完整反射图，把解析结果缓存到整个进程生命周期，失败模式是静默跳过。

## 已知限制

- 用户已拒绝「最多隐藏 40% 对话」安全阀。后果是大规模重写在设计上就是视觉上破坏性的：在长 Session 顶部附近重写可能隐藏几乎整个 Transcript，重写位置的通知显示实际隐藏的行数。计数是用户与空白页面之间的唯一东西。
- 「在正式输入框中编辑」只通过 `inputActions.setDraft(text)` 携带纯文本，chip 占位符会被剥掉：`@` 文件引用与 `/` 技能或命令按字面文本回显，需要用户从 Trigger 菜单手工重建；附件不会复制到草稿，需要重新选择。保留附件的升级路径（`createDrafts` + `addAttachments`）本包未实现。
- Shell 命令与第三方工具的任意文件写入不在可识别的文件集内。日志里已有的旧调用若缺少可靠的原始内容，在预览中明确拒绝，不用 Git HEAD 或展示用差异猜测。
- 「再次发送」按钮的重试只在记录该状态的页面加载期间有效，因为它重放的请求（含编辑后的消息文本）按设计保存在 Client 状态中。
- 独立的对话回滚，以及同时回滚对话和文件的功能已移除。Remote 的 `rollback` 只保留省略 `scope` 或指定 `artifacts` 的文件还原调用，拒绝 `conversation` 和 `both`。

## 从哪里开始读

1. [README.md](README.md)：完整的行为契约与验收说明。
2. [CONTEXT.md](CONTEXT.md)：领域术语表（Bundle、Profile、Slot、Cell、Transcript、Turn、seq 等）。平台词汇与通用工具词汇存在冲突，影响最大的是「branch」一词，改动前先对齐术语。
3. [AGENTS.md](AGENTS.md)：issue 跟踪约定（`.scratch/<feature-slug>/`）、triage 标签与 domain docs 布局。
4. `src/typert.js` 与 `src/host.js`：契约与写入路径的核心；`src/ui.js` 与 `src/client.js`：Client 侧挂载。

## 本地安装到 Profile

从源码打包（PowerShell）：

```powershell
npm ci
npm run check
npm run build
New-Item -ItemType Directory -Path "D:\DSH Desktop\plugins\dsh-resend" -Force
npm pack --pack-destination "D:\DSH Desktop\plugins\dsh-resend"
```

随后在 DSH Desktop 侧栏选择「插件」：已安装则先卸载旧版；「添加插件」中粘贴 `.tgz` 的绝对路径，不附加引号或命令；安装后选择「立即启用」，重新打开会话确认用户消息下方出现编辑图标。界面仍显示旧版时刷新页面或重启 DSH Desktop。

通用 DSH 启动器（普通 Profile）：

```text
dsh plugin --profile <name> add dsh-resend
```

DSH Desktop 2.0.17 的 `desktop` 配置由应用管理，直接运行通用启动器会返回 `profile "desktop" is managed exclusively by the Electron application`；桌面插件优先使用应用插件页安装。
