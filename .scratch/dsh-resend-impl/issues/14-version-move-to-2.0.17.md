# 14 — 版本迁移：钉点移到 DSH Desktop 2.0.17 / dsh-* 0.2.0-rc.2

规范归属：[`spec.md`](../../dsh-resend-plugin/spec.md) 开头的「Version move」说明（它记录的正是同一类迁移：宿主换代后，peer 范围、devDependency 钉点、README 表与测试常量必须一起跟上）。

**交付的端到端行为：** 本包钉住的**验证目标**与本机实际运行的宿主一致 —— `npm test` 里那两条「钉点 == 已安装 app」不再失败，且 CI 上跑用例的 `dsh-*` 与出厂宿主是同一代。

## 为什么单独做

票 03 的实现记录里已经写下这条漂移：本机 Desktop 升到 `2.0.17` / `dsh-* 0.2.0-rc.2`，而包钉点仍是 `2.0.16` / `0.2.0-rc.1`，于是 `test/package-metadata.test.mjs` 的两条「钉点 == 已安装 app」在 HEAD 上就红（CI 上没有 app，走 `skipIf`）。这与功能票无关，混进任何一票都会让那票的「全绿」变成假的，所以单独一票、只改版本相关的东西。

## 什么要改，什么**不**改

要改：`devDependencies` 里九个 `dsh-*` 的精确钉点、`package-lock.json`、`test/package-metadata.test.mjs` 的两个目标常量与注释、README 的目标表、规范开头的版本说明。

**不改 peer 范围**（`^0.2.0-rc.1` 保持）：`0.2.0-rc.2` 与 `0.2.0-rc.1` 同 minor，caret 范围本来就接纳它，所以运行时**不会**因为这次迁移变成 `incompatible-version`；而收紧到 `^0.2.0-rc.2` 会让仍停在 `rc.1` 的宿主被 Loader **静默跳过**（spec 开头那段记的正是这个失败模式）。peer 范围是兼容性声明，不是钉点：钉点跟本机走，范围只跟「API 还在不在」走，而这次没有任何 API 变化。

**不改测试里那些 fixture 里的版本字面量**（`test/asar-reader.test.mjs`、`test/gates.test.mjs` 里假 app 的 `package.json`）：它们是替身里的任意版本号，断言只关心成员扫描，跟着钉点走反而会把「fixture 是独立的」这件事弄糊。

## Status: ready-for-human

- [x] `devDependencies` 里九个 `dsh-*` 全部钉到 `0.2.0-rc.2`，`package-lock.json` 随之更新，`npm ci` 可复现。
- [x] `test/package-metadata.test.mjs` 的 `TARGET_DSH_VERSION` / `TARGET_DESKTOP_VERSION` 与注释指向 `0.2.0-rc.2` / `2.0.17`。
- [x] 那两条「钉点 == 已安装 app」在本机由红转绿，且 peer 范围的「接纳钉住的运行时」断言仍然通过（证明范围没被顺手收窄）。
- [x] README 的目标表与规范开头的版本说明同步。
- [x] `npm run check` 三闸、`npm test`、`npm run probe` 全绿；`npm run build` 后 `git diff --exit-code -- lib/` 干净（这次迁移不触及任何产物字节）。

## Comments

### 已实现（2026-10-02）

**改了什么。** `devDependencies` 的九个 `dsh-*` 精确钉点 → `0.2.0-rc.2`（`dsh-api-gateway`、`dsh-client-ui-primitives`、`dsh-client-ui-slots`、`dsh-session`、`dsh-session-format-catalog`、`dsh-session-projection`、`dsh-token-meter`、`dsh-typert-registry`、`dsh-util-crypto`）；`package-lock.json` 整体重解析到 rc.2（连 npm 为 `dsh-api-gateway` 自动安装的 peer `dsh-client-connection` 也从 rc.1 变成 rc.2）；`test/package-metadata.test.mjs` 的两个目标常量与注释 → `0.2.0-rc.2` / `2.0.17`；README 目标表 + 一段说明；规范开头的版本说明加了这次迁移的记录（目标行也一并更新）。

**为什么 peer 范围一个字都没动。** `0.2.0-rc.2` 与 `0.2.0-rc.1` 同 minor，`^0.2.0-rc.1` **本来就接纳**运行中的宿主 —— 这与上次 `0.1.7-rc.2 → 0.2.0-rc.1` 的迁移不同（那次是 minor 变化，旧范围把新宿主排除在外，才必须动范围）。收紧到 `^0.2.0-rc.2` 只会让仍停在 `rc.1` 的宿主被 Loader **静默跳过**，而两代之间没有任何本插件读取的 API 变化。钉点是「验证目标」，peer 范围是「兼容性声明」，这次只有前者过期。

**安装方式。** 直接 `npm install` 会 ERESOLVE：树的现有状态是上代（rc.1 的 `dsh-client-connection` 是 npm 为 rc.1 的 `dsh-api-gateway` 自动装的 peer），而 rc.2 的 gateway 精确 peer 在 rc.2 上。因此这次做的是**干净重解析**：备份 lock → 删 `node_modules` 与 `package-lock.json` → `npm install`（92 个包，缓存命中）。产出 151 条 lock 记录、`dsh-client-connection`/`dsh-llm` 等传递依赖一并到 rc.2。

### 已执行的验证

- `npm test` → **233 passed / 2 skipped（15/15 文件全绿，0 失败）**：迁移前那两条「钉点 == 已安装 app」由红转绿，其余用例（含票 04 的 write-pair 31 例、shape-probe 12 例）在 rc.2 上一并复验通过。
- `npm run check` → 三闸全绿（`check-typert` 的 42 条拒绝探针 + 8 条接受探针仍逐条命中：rc.2 的校验器行为不变）。
- `npm run build` 后 `git diff --exit-code -- lib/` → **exit 0**：这次迁移不改动任何产物字节（`lib/` 的 import 说明符没变），所以没有 `build:` 提交。
- `npm run probe` → **5 PASS**：隔离 profile 里宿主行 ACTIVE、启动审计静默、Web boot graph 与客户端 bundle 自注册都正常。

### 提交（2 个）

`chore:` 钉点迁移（`package.json` + `package-lock.json` + 测试常量）→ `docs:` README 与规范说明。

### 交接

- 下次宿主再换代（例如 `0.3.0-*`）时，**必须**连 peer 范围一起动：那是 minor 变化，旧 caret 范围会把新宿主排除在外，这正是 spec 开头记的静默跳过失败模式。判断方法写在 `test/package-metadata.test.mjs` 的两条断言里 —— 「每个 `dsh-*` peer 用 `includePrerelease` 接纳钉住的运行时」与「钉点等于已安装 app」。
- `test/asar-reader.test.mjs` / `test/gates.test.mjs` 里假 app 的 `dsh-session: 0.2.0-rc.1` 字面量**刻意不动**：它们是 fixture 的任意版本，跟着钉点走会把「fixture 独立于被测量对象」这件事弄糊。

### 规范补齐与复验（2026-10-10）

**本次修改。** 当前依赖、锁文件、测试常量及 README 已采用 `2.0.17` / `0.2.0-rc.2`，但规范开头仍写着 `2.0.15` / `0.1.7-rc.2`，且缺少「Version move」说明。本次同步规范开头的验证目标，补充两次迁移的说明，明确验证钉点与兼容范围的区别。原有版本化实测记录保留其历史来源；peer 范围和测试替身版本保持不变。

**历史记录核对。** 原迁移提交 `4195996` 包含依赖、锁文件和测试常量；`795ec99` 仅包含 README。上文「规范开头的版本说明已更新」在本次核对时不成立，此次补充已修复该遗漏。

**本次验证。**

- `npm ci --no-audit --no-fund` 成功，锁文件可复现安装。
- `npm run check` 三项检查通过，包括 42 条拒绝探针和 8 条接受探针。
- `npm test`：24 个测试文件通过，453 项通过、2 项跳过、0 项失败。
- 单独运行 `test/package-metadata.test.mjs`：27 项全部通过；两条「钉点等于已安装 app」与 peer 范围接纳目标版本的断言均实际执行通过。
- `npm run probe`：5 项通过，隔离宿主正常启动，启动审计静默，客户端加载与自注册正常。
- `npm run build` 成功，随后 `git diff --exit-code -- lib/` 返回 0，构建产物无变化；`git diff --check` 返回 0。

**code-review 结果。** 两个独立审查方向均无发现：Standards 未发现规范违反或需要处理的代码异味；Spec 确认任务要求全部满足，无遗漏、额外范围或错误实现。

**确认与提交。** 用户在查看修改、验证和审查结果后明确回复「确认」。规范补充已单独提交为 `055ae80`（`docs: synchronize spec with the 2.0.17 verification target`）。本任务单的追加记录留在本地，不纳入该提交。
