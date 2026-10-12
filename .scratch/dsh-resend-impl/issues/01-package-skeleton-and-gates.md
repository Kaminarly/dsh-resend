# 01 — 包骨架与三道门禁

规范归属：[`spec.md`](../../dsh-resend-plugin/spec.md) §3、§6.6、§13.5。规范是规范性的，本票与规范冲突时以规范为准。

**交付的端到端行为：** `dsh-resend` 成为一个可安装的 bundle，装进 profile 后宿主半被加载、客户端半被加载、两个 descriptor 导出面可解析——但功能是空的。三条门禁从第一天就在，后续每一票都在它们的保护下落地。

- 一个 npm 包即一个 bundle：`main` 指向宿主半（Node ESM），`./client` 指向客户端半（自注册 loader 入口），`./typert-host` 与 `./typert-client` 是两面 descriptor 贡献，`dsh.bundle.patch` 指向 profile 补丁层，`dsh.client.platform` 为 `web`。
- `dsh.client.inject` 必须包含 `@deepseek-ai/dsh-api-gateway`，好让客户端半在 `ctx.remote` 存在之前不激活；**不要**加入 `@deepseek-ai/dsh-typert-registry`——gateway 自己的客户端半已经声明了它，插件 bundle 再声明会撞上模块表缺失。
- 只走直接注册路线：**不**提供 `./typert` 导出、**不**引入 loader、**不**构造反射 `model`。
- `peerDependencies` 为代码 import 的每个宿主包声明有界范围，含 `@deepseek-ai/cordis`、`@deepseek-ai/dsh-session`、`@deepseek-ai/dsh-client-ui-primitives`、`@deepseek-ai/dsh-client-ui-slots`、`react`。peer 范围是**被强制执行**的兼容机制，DSH 以 `includePrerelease: true` 评估，失败报 `incompatible-version`。
- 包**不得**依赖任何第三方契约包。
- `lib/client.bundle.js` 是提交进仓库的构建产物，`build` 能重建它。
- `check` 依次跑三道门禁：源码语法（用 bundler 的 parser 解析 `lib/` 下每一个文件——裸 `node --check` 只校验它的**第一个**参数）、descriptor 校验（`scripts/check-typert.mjs`）、宿主契约门禁（`scripts/check-host-contract.mjs`，本票只需骨架）。
- CI 顺序固定为 `check` → `build` → `git diff --exit-code -- lib/` → `test`，其中 diff 门禁是构建产物诚实性的唯一保障，且只在 `build` 之后才有意义。

**Blocked by:** 无——可立即开始。

**Status:** ready-for-human

- [x] 包在 profile 中加载成功，宿主半与客户端半都存在且不报错；插件 fiber 不永久 pending（`assertEntriesActive()` 通过，渲染器能启动）。
- [x] `lib/client.bundle.js` 自注册加载器入口可用，且 `git diff --exit-code -- lib/` 在 `build` 之后为绿。
- [x] `check` 跑通三条门禁，且语法门禁会因 `lib/` 下**任意**一个文件（不止第一个）的语法错误而失败——用一个故意的坏文件验证。
- [x] `peerDependencies` 全部是有界范围，`dsh.client.inject` 含 gateway 且不含 typert registry。
- [x] 包中不存在第三方契约包依赖，也不存在 `./typert` 导出。
- [x] CI 的四个阶段按 `check → build → git diff → test` 的顺序执行，且任一阶段失败即整体失败。

## Comments

### 已实现（2026-09-29）

**包** — `dsh-resend` 位于仓库根目录，一个 npm 包即一个 bundle：`main` → `lib/index.js`（宿主半），`exports["./client"]` → `lib/client.bundle.js`（自注册 loader 入口），`exports["./typert-host"]` 与 `exports["./typert-client"]` 为两面 descriptor，`dsh.bundle.patch` → `cordis.patch.yml`，`dsh.client.platform: "web"`，`dsh.client.inject` = gateway + locale + ui-conversation（gateway 在内，typert registry 不在内）。`peerDependencies` 为本票点名的五条有界范围，其中三个 `@deepseek-ai/dsh-*` 范围最终定为 `^0.2.0-rc.1`（见下方"版本迁移"）；无运行时依赖、无 `./typert` 导出、不引入 loader、不构造反射 `model`。

**三道门禁**（`npm run check`，按序执行）：

1. `scripts/check-syntax.mjs` — 用 esbuild 的 parser 解析 `lib/` 下每一个文件（走 walk，因为裸 `node --check` 只校验第一个参数），每个失败都报 `file:line:column`。
2. `scripts/check-typert.mjs` — 用**已安装**的 `@deepseek-ai/dsh-typert-registry`（`register` + `remotes.register`）驱动两面 face，深比较两面、断言 unary-only 形状，并**拒绝空 descriptor 表**；骨架只能靠显式 `--allow-empty-descriptors` 通过，且会打印点名 ticket 02 的 `VACUOUS` 提示。
3. `scripts/check-host-contract.mjs` — 本票要求的**骨架**：经校验的 app 发现（`DSH_APP_ROOT` → 常见安装位置；解包目录或经内置 reader 读取的 `app.asar`）、scope 标记、两条 PRESENT 探针、一条 ABSENT（复活）探针，覆盖声明式与 bolt-on 两种形态，插件侧 legacy 读取扫描以 §12 的日志模块豁免为显式接缝，未安装 app 时显式 `SKIP` 并 exit 0。

**构建** — `scripts/build.mjs`（esbuild 0.28.2 固定版本，`absWorkingDir` 固定以保证确定性）从 `src/` 重建四个 `lib/` 文件；每个产物都带写明来源的 `GENERATED FILE` 横幅。

**探针** — `scripts/probe-profile.mjs`（`npm run probe`）在 `.tmp/` 下建隔离 `DSH_HOME`，把包装进 `probe` profile，用系统分配端口启动随包发布的 launcher，断言补丁行已合成、启动审计静默、Web boot graph 含客户端行、被服务的 bundle 自注册。它绝不触碰真实 `$DSH_HOME`，未安装 app 时 `SKIP`。

**CI** — `.github/workflows/ci.yml`，单 job，四步固定顺序 `check` → `build` → `git diff --exit-code -- lib/` → `test`；没有任何一步 `continue-on-error`。

### 版本迁移（2026-09-29）— 目标 `0.2.0-rc.1`

本票在实现期间宿主发生了升级：DSH Desktop `2.0.15` → **`2.0.16`**，`@deepseek-ai/dsh-*` `0.1.7-rc.2` → **`0.2.0-rc.1`**。`dsh-app-boot` 用 `semver.satisfies(runtimeVersion, range, { includePrerelease: true })` 评估每条 `@deepseek-ai/dsh-*` peer，而 `0.x` 的 caret 范围锁住次版本号，因此原来的 `^0.1.7-rc.2` 不再接受运行中的宿主；随后 loader 会**静默跳过**不兼容的 bundle，于是什么都加载不了、探针五条断言全红。原作者决定接受 0.2 运行时，目标随之迁移到 peer 范围、devDependencies（精确钉住，让测试跑目标运行时而不是更新的预发布版）、锁文件、README 目标表、测试常量，以及规范中记录的版本钉点。新增一条测试把上述常量与**已安装 app** 自己的 `dsh-app-boot` 版本（经门禁同一个 helper）比对，使下一次升级在测试套件里就失败。本次迁移未改动任何门禁逻辑、源码或 `lib/` 产物。

### 已执行的验证

- `npm run check` 全绿（两个读取 app 的门禁都用的已安装 `D:\DSH Desktop\resources\app`）；`npm run build` 后 `git diff --exit-code -- lib/` exit 0。
- **迁移到 `2.0.16` / `0.2.0-rc.1` 后完整重跑**：`npm run check` 全绿（宿主契约在新宿主上仍是 `2 present and 1 absent`，即两条 PRESENT 与那条 ABSENT 复活探针都成立）；`npm run build` + `git diff --exit-code -- lib/` exit 0；`npm test` → **83 passed, 2 skipped**（8 个文件）；`npm run probe` → 五条 PASS，stderr 为空。
- 门禁的"牙齿"逐条实测而非断言：
  - 产物诚实性：手改 `lib/index.js` → diff exit 1；重建 → exit 0。
  - 语法：往真实的 `lib/typert.client.js`（排序后四个中的第三个）追加一个坏文件 → exit 1，报 `lib/typert.client.js:17:0 — Unexpected end of file`；重建 → exit 0。
  - 宿主契约：缺成员、缺 scope 标记、复活 `Session.events`（以 `Object.defineProperty` bolt-on 形式）、写错 `DSH_APP_ROOT`、以及一个存在但无关的目录，全部变红并点名具体成员。
- `npm test` → 8 个文件全绿，覆盖：包/patch 元数据与 README 钉点；钉住的目标版本与已安装 app 的运行时版本交叉核对；宿主半经真实 Cordis Loader 在 profile 形状的 `node_modules` 布局中启动（fiber ACTIVE，另有永久 PENDING 的反例）；客户端 bundle 的自注册、模块表纯净性、`[object Module]` 标签与激活；产物集合、横幅、逐字节一致的重建、committed `lib/` == 全新构建，以及在真实 Node 进程中解析导出（含 `./typert` 的 `ERR_PACKAGE_PATH_NOT_EXPORTED`）；三道门禁各自的牙齿（含 registry 拒绝的非法 namespace、两面 face 漂移、非 unary descriptor、空表拒绝）；asar reader（合成 Electron 格式归档、一个真实第三方归档交叉核对、packed-app 门禁路径）；探针端到端；以及 CI 阶段顺序。
- **探针真实运行**：补丁行存在、宿主启动、stderr 为空（启动审计会为每个非 active 条目告警，静默即表示没有任何条目残留在 PENDING/FAILED）、boot graph 含 `dsh-resend`、被服务的 bundle 自注册 id `dsh-resend`。
- 用户的真实 `desktop` profile 未被改动，DSH Desktop 未重启。

### 审查记录（`/code-review`，每轮两轴并行）

**第 1 轮**：门禁 2 空转通过；客户端半只靠一次性的临时证据；asar reader 无测试钉住；§12 的日志读取模块缺豁免；一个看起来未被使用的 devDependency；一个与本机绑定的安装候选路径；门禁与测试间的重复代码。全部处理：空表拒绝 + 显式让步（`--allow-empty-descriptors` 与 `VACUOUS` 提示）、提交进仓库的探针及其套件测试、asar 测试（合成 + 真实归档交叉核对 + packed-app 门禁路径）、`LEGACY_READ_EXEMPT` 接缝、README 中关于 `node-addon-require-builtin` 的说明、带校验的 app 发现（本机开发路径降级为最后候选）、共享的 JavaScript walker、共享测试 helper，以及术语修正。

**第 2 轮**。（Standards）残留的 "half" 措辞；重复的常量与协议拼写；重复的 `spec.md` 副本；门禁内两张几乎一样的形态表；packed-app reader 上一个会抛异常的 `resolveFrom` 桩；插件侧扫描的空转漏洞；探针里只在 Windows 可用的 `taskkill`。（Spec）同一个 `taskkill` 缺陷；门禁 2 三处失败缺 `file:line` 指针；legacy 读取模式匹配过窄；ABSENT 告警缺 method 形态；测试里硬编码的第三方归档路径。代码类发现全部修掉——单一形态表 + 按方向接受、放宽的过度匹配模式、ABSENT 告警纳入 method 形态、`--plugin-root` 与无 JavaScript 时的失败及测试、以能力缺失取代会抛异常的桩、真实的 `file:line` 锚点、跨平台的宿主关闭、为每个重算常量提供共享 helper、归档发现 + `$DSH_TEST_ASAR` 覆盖。两个判断项交由作者而非单方面改动："half" 作为规范自身对两个插件的同义词，以及 `.scratch/` 下逐字节相同的 `spec.md` 副本。

**第 3 轮**：找出的是最后一批真实缺陷而非重述第 2 轮——ABSENT 告警漏掉 §12 点名的 computed-member 形态；一个文件携带非法 UTF-8 字节（em dash 被写成 `e2 80 3f`）；一个测试自行重写了临时目录 helper 而没有 import `tmpDir`；`walkJavaScript` 的 docstring 描述错了失败方式；三条路径上的门禁诊断没走 `relativePath()`；`--faces`/`--plugin-root` 缺值时未按用法错误退出；`pointer()` 的回退指向了 face 并不从那里发布的文件。全部修掉并重跑全绿。

**第 4 轮**（确认轮，同样两轴）——**Standards：无需改动代码。** 逐条复核第 3 轮的修复均在位（computed-member 形态方向正确、每条诊断都走 `relativePath()`、`optionValue()` 用法错误、`src/` 回退、共享 helper、无 UTF-8 损坏），并把考虑过的 baseline 味道判为有文档依据的接缝而非缺陷。它唯一的观察明确表示无需改动：手写的 `.mjs`/`.js` 文件末尾没有换行，而 JSON/YAML/Markdown 文件有。

**第 4 轮 — Spec：一项需要改动，且是真实问题**，即上述"版本迁移"：已安装的宿主升级导致 `^0.1.7-rc.2` 不再被接受、loader 静默跳过整个 bundle，本票第 1 条验收在运行中的宿主上不成立（没有行、没有宿主半、没有客户端半，探针五条断言全红）。未发现范围蔓延。修复方式由作者决定而非单方面施加：把目标迁到 `0.2.0-rc.1`——三个 peer 范围、devDependencies 钉点（精确钉住）、锁文件、README 目标表、测试常量，以及规范中记录的版本钉点；并新增一条与已安装 app 交叉核对的测试，使这类漂移在测试套件里而不是只在探针里暴露。迁移后在 0.2 宿主上完整重跑：`check` 全绿、`build` + `git diff --exit-code -- lib/` exit 0、**83 passed / 2 skipped**、探针五条 PASS。

### 已知限制（证据的诚实边界）

- 探针验证的是客户端半**已被合成并被服务**；在浏览器中执行它在此环境下不可达，其执行由 vm harness 覆盖。浏览器中观察到的那一行属于后续票。
- `scripts/check-host-contract.mjs` 就是本票要求的骨架；§12 的完整成员表、catalog 条目与 Electron/asar 执行路径由 ticket 09 负责。
- **版本迁移只对本票涉及的面做了验证。** 骨架门禁断言的三条成员（两条 PRESENT、一条 ABSENT）以及 bundle 的合成、启动与客户端行协议都在 `0.2.0-rc.1` 上重新确认；但规范 §16 的逐成员枚举是在 `0.1.7-rc.2` 上观测的，**未**在新运行时上重新观测——规范顶部与 §16 前言都已写明这一点，依赖这些枚举的 ticket 02、05、09 在采信之前应先在较新运行时上重跑。
- 两条已记录在案的规范偏差不受迁移影响：§12 的 asar 偏移仍然写错（规范写 `17 + headerSize`，实测为 `8 + u32LE@4` = `align4(16 + headerSize)`，reader 实现的是实测公式并由 `test/asar-reader.test.mjs` 钉住，是否修订规范由作者决定）；`assertEntriesActive()` 仍不是随宿主发布的 API（其意图改以宿主真实的 `auditStartupEntries` 审计加 Loader 的 entry/fiber 状态验证）。
- 一个判断项仍留给作者：`.scratch/` 下逐字节相同的两份 `spec.md`。
