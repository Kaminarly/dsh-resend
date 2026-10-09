# dsh-resend

为 DeepSeek Harness 会话提供 Edit-and-resend 和 Regenerate：重新打开已发送的用户消息并再次发送编辑结果，或根据同一条提示再次生成助手回复。

**状态：契约已生效，操作可以完成，rewind 已写入，提示已发送。**

该包可以安装并加载：Host plugin 会注册 Typert 描述符表并创建 `resend` 服务，Client plugin 通过 `ctx.remote.$mount` 挂载相同的贡献。因此，`resend.apply` 从头到尾都是一个真实且严格类型化的 Remote 调用，**所有拒绝路径都已经实现**：对于任意输入，它都会返回十二种代码中正确的一种，包括空 Session 或未知 Session、缺少 agent 或 agent 正在流式处理、从未存在过的目标、仍处于 pending 状态的目标、已经 rewind 的目标、消息类型错误、空白编辑，以及仅包含图片的提示。

范围和 resend 文本通过一次覆盖范围的日志读取解析，再使用官方的 `foldSurface` 进行折叠；凡是解析成功的请求都会被**写入**：rewind 由一对事件组成，即 audit claim（`compaction/prune`）和 carrier（携带 `surfaceOp` + `sourceEventSeqs` 的 `user/message`），两者在第一次 append 前通过宿主自己的 replay 一起校验，随后相邻追加，并且只 flush 一次。Carrier 不渲染；被替换的范围会离开 model surface，但仍留在 Transcript 中；audit claim 携带**官方** shadow price，因此宿主自己的 token fold 会扣除该范围，而不会静默地高估。

**resend 也已经生效。** flush 完成后，提示会通过 `agent.followup` 排入 agent 队列，结果 envelope 会报告已排队消息的 id。该消息是用户唯一能看到的新行，因为 carrier 不渲染。`followup` 是 fire-and-forget 调用并返回 `undefined`，因此唯一的接受信号是紧接调用后读取的 `agent.status`：如果 agent 没有接收提示，rewind 会保留，envelope 只会省略该 id。此时 Client 会在 rewind point 渲染错误行，并提供「再次发送」按钮；按下按钮会重放同一个请求，Host 会重新发送提示，但**不会执行第二次 rewind**。如果 agent 已接收 Turn、之后才失败，这不属于本插件的报告范围，agent 会在 Transcript 中自行报告。

按钮提供的重试只在记录该状态的页面加载期间有效，因为它所重放的请求（包括编辑后的消息文本）按设计保存在 Client 状态中。Client 现在会在用户消息下注册 action row，并隐藏被 rewind 覆盖的行。内联编辑器的「在 Composer 中编辑」操作只通过 `inputActions.setDraft(text)` 发送纯文本：`@` 文件引用以及 `/` 技能或命令会作为字面文本显示，必须从 Composer 的 Trigger 菜单中重新构建。附件不会复制到 draft 中，需要在 Composer 里重新选择。
如果未来的集成需要保留附件，支持的升级路径是通过 `createDrafts(sessionId, File[])` 再次提供文件对象，并传入生成的附件 id；本插件不会自行创建或持久化这些文件。

rewind 会从模型可见的 surface 中移除受影响的范围。人类看到的 Transcript 按设计以追加来源为准，不受影响，因此本插件通过 React 渲染的 CSS 自行隐藏受影响的行。这是插件行为，不是平台删除。用户可以关闭计数通知，但其样式规则仍会保持挂载，以确保隐藏的行不会重新出现。

此前提议的「最多隐藏会话 40%」安全阀已被否决。因此，在长 Session 的顶部附近进行大范围 rewind，会按设计造成明显的视觉变化；局部计数通知是用户与几乎空白的 Transcript 之间唯一的说明。隐藏计划失败时，会在受影响的行和诊断日志中报告，而不会悄悄留下不一致的视图。

## 目标上游版本

| 目标 | 版本 |
|---|---|
| DSH Desktop | `2.0.17` |
| `@deepseek-ai/dsh-*` | `0.2.0-rc.2` |
| `@deepseek-ai/cordis` | `4.0.4` |

兼容性由 **host surface** 决定，不能只看 semver：插件会读取已安装 Host 实际暴露的成员；当当前断言的某个成员缺失或形状发生变化时，`npm run check` 会失败。`package.json` 中的 `peerDependencies` 范围是 DSH 评估时强制使用的机制（带有 `includePrerelease`），并且范围有上下界；如果运行时不满足 peer 范围，DSH 会报告 `incompatible-version`。上表是本包**验证过**的版本组合，也是开发依赖锁定的版本组合；peer 范围有意设置为更宽的下限，因为如果范围排除了仍能运行该包的 Host 版本，Loader 会静默跳过该 Bundle。

## 目录结构

```
package.json            一个 npm 包 = 一个 Bundle
cordis.patch.yml        Profile Bundle 补丁层（一个 Loader 行）
src/                    手写源代码
lib/                    已提交的构建产物（不要手动编辑）
scripts/build.mjs       从 src/ 重建 lib/（esbuild）
scripts/check-*.mjs     三个门禁脚本
scripts/probe-profile.mjs  启动隔离 Profile 并验证两侧
test/                   vitest 测试套件
```

`lib/` 是生成目录，并且已提交到仓库。CI 会在运行 `npm run build` 后立即执行 `git diff --exit-code -- lib/`，以证明它与源代码一致；这是唯一能捕获「修改了源代码但没有重新构建」情况的门禁。

## 开发

```
npm install
npm run check     # 1. 源代码语法  2. 描述符校验  3. Host 契约
npm run build     # 重建 lib/
npm test          # vitest 测试套件
npm run probe     # 启动隔离 Profile 并验证两侧（仅限 Desktop）
```

门禁包括：

1. **`scripts/check-syntax.mjs`** —— 使用打包器自己的解析器解析 `lib/` 下的每个文件。（普通的 `node --check` 只会静默校验第一个参数，因此这里必须遍历目录。）
2. **`scripts/check-typert.mjs`** —— 通过已安装的 `@deepseek-ai/dsh-typert-registry` 校验器驱动 Typert 描述符的两侧，而不是重复实现校验规则，因此门禁会随 Host 变化。脚本通过逐项修改真实贡献的副本来断言 §6.3 的七条规则：每次破坏一个字段，校验器都必须根据对应规则拒绝；同时使用接受探测作为正向对照。两条注册路径都会被驱动（Host 侧使用 `ctx.typert.register`，Client 侧使用 `ctx.typert.remotes.register`），并读取实际运行的两个产物，再与两侧进行比较（`lib/index.js` 中的注册和 `lib/client.bundle.js` 中的挂载），因为只验证没人发布的侧面没有意义。描述符表为空时会失败：没有内容可供断言，脚手架所需的 `--allow-empty-descriptors` 让步已经移除（现在传入该参数会以用法错误退出）。
3. **`scripts/check-host-contract.mjs`** —— 直接读取已安装的 DSH Desktop 应用（`app.asar` 或未打包的 `resources/app`），不联网、不改动 Profile；断言表在 `scripts/host-contract.mjs`，它按**声明该成员的 Host 实体**（类）而不是按文件来组织，因为 `events`、`append`、`get` 这类名字在打包产物里到处都是。两个方向都会被断言：插件读取的每个成员必须仍在（PRESENT），上游已移除的成员必须保持消失（ABSENT，即复活警报），插件两侧按名字导入的绑定同样会被检查（改名的导出会让 Host 侧加载即报错、让浏览器 Bundle 静默失效）。三条规则与断言同等重要：文件、包清单或 Slot 目录项找不到算漂移而非通过；反向断言宁可过度匹配——类字段、getter、方法、构造函数赋值、对象字面量属性，以及 `Object.assign(X.prototype, …)` / `Object.defineProperty` / 计算成员这类挂载式写法都要匹配，连无法枚举成员的 `Object.assign(X.prototype, methods)` 也算；此外还有一条插件侧不变量，扫描 `src/` 与 `lib/`，除日志读取模块外任何文件读取 legacy 事件视图成员（包括 `session["events"]` 这种计算写法）都会以 `file:line` 失败。读取器内置在 `scripts/asar.mjs`（不引依赖），并在打开任何路径之前设置 `process.noAsar = true`，因为 DSH Desktop 在 Electron 的 Node 下运行包脚本，其 asar 包装会拦截以 `.asar` 结尾的路径。没有安装应用时，脚本会打印明确的 `SKIP` 并以零退出，因为该门禁对 Desktop 是可选的；这也是它在 CI Runner 上会显示为「绿色但为空」的原因。

`npm run probe` 是唯一无法在没有安装包的环境中运行的检查：它会在 `.tmp/` 下创建临时 `DSH_HOME`，把本包安装到 `probe` Profile，在操作系统分配的端口上启动已发布的 Launcher，并断言 Host 审计保持静默（没有遗留 pending 项）、提供的 Web 启动图包含 Client 行，以及提供的 Bundle 会自行注册。它从不接触真实的 `$DSH_HOME`，没有安装应用时会打印 `SKIP`。

设置 `DSH_APP_ROOT`，可让门禁（以及 probe）指向指定安装：既可以是未打包的 `resources/app` 目录，也可以是 `app.asar` 路径。

`zod` 是本包唯一的运行时依赖：描述符的严格 codec 使用 zod schema，这是 Typert 要求 `create()` 工厂提供的内容。这些 schema 使用 `zod/mini` 编写——它与 zod 核心相同，只是采用函数式写法——因为两侧都从同一张表派生，所以构建这些 schema 的内容也会被打包进浏览器脚本；经典入口会把 Client 永远不会调用的函数连同约 750 KB 的 zod 一起放入 `lib/client.bundle.js`（规范 §16.5）。

`@deepseek-ai/dsh-api-gateway` 是 devDependency，而不是 peer：已发布代码不会导入它（Client 侧通过 `ctx.remote` 访问它，`dsh.client.inject` 只负责安排它到达的顺序）。将它锁定，是为了让描述符规范在 CI 中驱动真实的 consumer——mount、dispatch、envelope——而不只是依赖安装了应用的机器。

`@deepseek-ai/dsh-util-crypto` 同时是 peer 和 devDependency：已发布的 Host 侧会导入它的 `randomUUID`，用来生成 carrier 和 resend message 所使用的标记 id，因为 id 是插件可以存放标记身份的唯一位置（规范 §5.4）。这是 Host 自己的包生成消息时使用的模块，也正因如此，本包不会直接调用 `crypto.randomUUID`——该 Web API 在安全上下文之外不可用，而该模块自己的文档记录了这一点。

`@deepseek-ai/dsh-token-meter` 仅是 devDependency，有意不设为 peer：已发布代码不会导入它，而是通过 `ctx.get('tokenMeter')` 解析 meter，并从服务获取官方 estimator（规范 §5.3），这样 audit claim 的价格就是 Host 自己 fold 会扣除的数值。测试套件会导入同一个包的 estimator，独立检查该价格；缺少 estimator 时，测试套件会抛错而不是跳过。

`react-dom` 和 `jsdom` 仅是 devDependency，已发布产物不会导入二者：它们是 Client 侧测试套件渲染所使用的 DOM。需要验证的行为是：一个已注册 surface 内的渲染异常会变成该 surface 自己的失败行，而其他内容仍继续渲染；只有在 React 的边界语义实际运行的环境中才能回答这个问题，服务端渲染器无法回答（旧版渲染器会传播异常，流式渲染器在 shell 阶段发生异常时会将其视为致命错误）。`react` 本身则是 peer，因为页面通过模块表准确提供一个实例；Bundle 中出现第二个副本会造成经典的 hooks 失败，而不只是测试细节。

`node-addon-require-builtin` 是一个没有任何导入位置的 devDependency：它是 cordis 的可选 peer；只有存在该包，Loader 才能像 Profile 启动时那样，从 base URL 解析裸包名。启动测试套件会断言该路径可用，而不是伪造它。

## 安装到 Profile

```
dsh plugin --profile <name> add dsh-resend
```

之后重启 DSH Desktop（或 `dsh` 进程）。
