# 02 — 严格契约的第一条 Remote 链路

规范归属：[`spec.md`](../../dsh-resend-plugin/spec.md) §6（全部小节）、§13.4。规范是规范性的，本票与规范冲突时以规范为准。

**交付的端到端行为：** typert 描述符成为唯一事实来源，宿主半注册它、客户端半挂载它，浏览器里能调到一条真实方法并拿回一个被严格编解码的结果信封。本票只把「契约」接通，不实现任何重写语义。

- **一张表，两个面**：宿主面文件与客户端面文件从**同一个**描述符表派生，两面深比较必须相等，因此不可能漂移。两面都是手写的——没有生成器可 pin，而校验契约小到可以精确满足。
- 宿主半在 `apply` 中调用 `ctx.typert.register(TYPERT)`；客户端半调用 `ctx.remote.$mount(contribution)`。注册由插件 fiber 持有其整个生命周期：一旦某个 endpoint 被**见到**是 strict，之后撤回就**永久禁止**它回落到弱反射路径，所有调用报 `gateway/definition-unavailable`。因此只在插件启动时注册一次，唯一移除它的是 fiber 的 effect disposer。
- 客户端半为每个客户端提供的字段配严格 codec；挂载路径额外要求贡献不得重复 `namespace`/`method` 对。
- **重复挂载必须在任何方法可调用之前抛错**，不得吞成静默 no-op：半边挂载的 namespace 比响亮失败更糟。调用点接住它、记日志、禁用该功能，而不是破坏第一次挂载。
- 宿主半的 `inject` 必须列出它读取的每个服务。Cordis 拒绝在**未注入该服务的 fiber** 上做任何服务属性读取（`cannot get property "<name>" without inject`），所以 `typert` 必须在列——`typeof ctx.typert` 这种探针在空 inject 的 fiber 上对**每个**服务都会抛，不能当存在性判据。存在性判据是 `ctx.get('<name>')`。
- 描述符是**一元**方法：`invocation.kind === 'direct'`，不带 `mode`、不带 `scope`、不带 lookup 参数、不带 `cancellation`。
- 第一个可调用方法返回 `RemoteResult<T>`：以 `ok` 为判别式的标签联合，`ok: true` 带 `value`，`ok: false` 带 `error`，error 按 `code` 构成判别联合，每个字段 `readonly()`，且**拒绝未知字段**。
- `typeSymbol` 只在涉及 lookup/context provider 时才被校验，本插件没有这类 provider，所以它只被检查非空——但它仍是严格定义与其提供者不一致时唯一的人类可读线索，必须写成真实的 `<package>/types#<TypeName>`，不得写占位符。`sourceLocation` 无人校验，省略。
- `ctx.typert.register()` 在任一条规则失败时**整批拒绝**，提交前不落地任何东西。

**Blocked by:** 01。

**Status:** ready-for-human

- [x] `scripts/check-typert.mjs` 断言 §6.3 的全部七条规则（失败时点名出错的字段）与「两面同源」这一条，并且它**读取已安装的校验器**而不是复述一份冻结的规则清单。
- [x] 校验器另外断言：一元描述符没有 `mode`、没有 `scope`、没有 lookup 参数、没有 `cancellation`。
- [x] 结果 codec 的 schema 接受 `{ ok: true, value }` 与 `{ ok: false, error }`，并**拒绝未知字段**。
- [x] 宿主面与客户端面的贡献深比较相等。
- [x] 浏览器中一条真实调用返回格式良好的结果信封；未知字段在宿主侧被拒绝。
- [x] 二次挂载在任何方法可调用之前抛错，调用点接住、记录并禁用该功能；第一次挂载未被破坏。
- [x] 注册恰发生一次，且在每一次调用之后依然存活（撤回后调用报 `gateway/definition-unavailable`，而不是静默回落）。

## Comments

### 已实现（2026-09-29）

**一张表，三个产物。** [`src/typert.js`](../../../src/typert.js) 是唯一事实来源：`PACKAGE`/`SERVICE`/`NAMESPACE`/`METHOD`/`endpointOf`/`ENDPOINT`/`INVOCATION_ID`、§4.5 的 12 码封闭词汇表、严格请求 schema、`RemoteResult` 结果 codec 全部从这一处派生。两个面仍是手写的（[`typert.host.js`](../../../src/typert.host.js) / [`typert.client.js`](../../../src/typert.client.js)），但真正会运行的是**另外两个内联副本**：`lib/index.js` 注册的那份、`lib/client.bundle.js` 挂载的那份。门禁把这两个产物读回来逐一对比，所以「不可能漂移」覆盖的是所有四个产物，而不只是两个面文件。

**描述符。** 唯一 unary 方法 `dsh-resend#resend/apply`：`invocation.kind === 'direct'`，不带 `mode`/`scope`/lookup/`cancellation`，省略 `sourceLocation`；`typeSymbol` 写成真实的 `dsh-resend/types#ResendApplyRequest` / `#ResendApplyResult`。schema 用 `zod/mini`（同一份 zod core 的函数式拼法，已确认 4.4.3 与安装的 4.6.5 都提供所需 API）：请求是 strict 结构，结果是以 `ok` 为判别式的联合，`ok:false` 对 12 个码各有变体，每层都拒绝未知字段。选 `mini` 的理由写在文件头：两个面共用一张表，于是 schema 构造代码会被打进浏览器包，经典入口会让 `lib/client.bundle.js` 从 ~40 KB 涨到 ~758 KB，而这些函数在客户端从不执行（§16.5）。

**宿主半。** `inject = ['typert']`（§3.1/§16.6）；`apply` 先建 `resend` 服务（[`src/resend.js`](../../../src/resend.js) 手写 `typertRemote` 绑定，serviceKey/namespace 由描述符表导入，不可能与描述符不一致），再 `ctx.typert.register(TYPERT)`。注册由该行 fiber 的生命周期持有；启动日志打印的是**从注册表读回**的端点，不是表里打算注册的东西。

**契约接通、语义未实现。** `resend.apply` 目前一律 resolve `{ ok: false, error: { code: 'internal' } }`。封闭词汇表里没有「未实现」这个码，而伪造成功会告诉客户端一条根本没排队的消息；README、启动日志、源码注释三处都写明这是本构建的状态。**票 03 必须整体替换这一段，而不是继承它**——`internal` 在 §4.4 里另有含义，信封本身无法区分两者。

**客户端半。** `inject = ['remote']`；`apply` 调 `ctx.remote.$mount(TYPERT_REMOTE)`。重复挂载在方法可调用之前抛错（Gateway 先校验整份贡献，且安装中途失败会自行回卷），调用点接住、warn 记录、把 `remoteMountState()` 置为 `failed` 作为票 06–08 的功能开关，fiber 保持 ACTIVE、第一次挂载照常可调用。

**门禁（[`scripts/check-typert.mjs`](../../../scripts/check-typert.mjs)）。** 对**已安装 app 的校验器**跑 42 个拒绝探针 + 8 个接受探针：§6.3 七条规则逐字段变异，且要求拒绝来自**该条规则**（期望的消息片段就是「是哪条规则在拦」的证据；片段被改写只会误红、不会误绿）；两条注册路径都跑（host `ctx.typert.register`、client `ctx.typert.remotes.register`）。另有：整批原子性（合法成员 + 违规成员 → 整批拒绝且一个都不落地）、两面深比较、产物读回对账、请求/结果 codec 的接受-拒绝矩阵（12 码各接受、未知码与未知字段各拒绝）、严格 `pointer()`（锚点消失即报门禁自身缺陷）。空表直接红；`--allow-empty-descriptors` 已成用法错误（exit 2），骨架期的让步随空表一起消失。

**测试。** 新增 [`test/remote-contract.test.mjs`](../../../test/remote-contract.test.mjs)（真 Gateway 端到端：信封被自己的严格 codec 接受、请求里的未知字段在宿主侧被 `gateway/input-invalid` 拒绝、多余 wire 字段被 `gateway/arguments-invalid` 拒绝、二次挂载 `already mounted` 被容纳、重复 `namespace`/`method` 对被挂载路径拒绝、撤回后 `gateway/definition-unavailable`、注册恰一次并在三次调用后仍存活）。调用链上唯一的替身是 `connection`（物理载体），[`test/helpers/gateway.mjs`](../../../test/helpers/gateway.mjs) 逐条列出它替代的成员；loader 启动协议这一层替身集中在 [`scripts/client-bundle.mjs`](../../../scripts/client-bundle.mjs)，门禁与测试共用。

**提交（8 个，按逻辑意图）。** `chore:` 依赖 → `feat:` 契约表 → `feat:` 宿主半 → `feat:` 客户端半 → `build:` 重生成 `lib/`（同时移除空表让步）→ `feat:` 门禁 → `test:` → `docs:`。

### 已执行的验证

- `npm run check`：三道门禁全绿；`check-typert` 报 `42 rejection, 8 acceptance probes`、`2 artifact(s) read back`，校验器取自**已安装 app**。
- `npm run build` 后 `git diff --exit-code -- lib/` → exit 0（CI 的产物诚实性门禁在同一次运行中为绿）。
- `npm test` → **102 passed / 2 skipped**（9 个文件；票 01 迁移后基线为 83 passed / 2 skipped）。
- `npm run probe` → 5 PASS（真实 launcher + 隔离 profile；宿主行 ACTIVE、启动审计静默 = 注册成功）。
- 门禁牙齿逐条实测，不是推断：3 个 crippled-registry fixture（规则 5 停止执行 → 点名 `typeSymbol`/rule 5；规则 3 停止执行 → 点名 `namespace`/rule 3；"被别的规则拒绝" → 报 `but not by §6.3 rule 5`）、2 个产物漂移 fixture（只改 `lib/index.js` 或只改 `lib/client.bundle.js` → 门禁点名该产物与差异字段）、codec 突变手测（`strictObject`→`object` → `the codec accepted {...}, which it must refuse`）、bundle 语法破坏时门禁干净报错而不是崩栈。

### 审查记录（`/code-review`，每轮 Standards + Spec 双轴并行）

共 6 轮 + 1 次增量复检。每轮「必须改」的发现都在下一轮得到确认；最后一轮 Spec 轴 0 项、Standards 轴 1 项（一句描述已删设计的注释）已修，增量复检两轴均为「无需改动」。

- 第 1 轮：产物副本无人对账（评审以「陈旧 bundle」为反证）、门禁规则清单的表述、宽泛断言等 → 引入产物读回对账与整批原子性探针，并把「为什么变异表不是一份冻结清单」写进门禁头注释。
- 第 2 轮：`face` 双重含义、`face === 'host'` 三处重复分支、loader 协议替身两份 → 收敛成 `FACE_SHAPES` 面记录与共享的 `scripts/client-bundle.mjs`。
- 第 3 轮：描述符形状失败与产物失败只有裸路径而无 `file:line`（§6.4）→ 形状失败指向 `src/typert.js` 的字段字面量、产物失败指向 `src/index.js`/`src/client.js` 的注册/挂载行；挂载路径的重复对被真正驱动。
- 第 4 轮：codec 块的指针仍是计算值（无 `file:line`）、无测试钉住 `:line` → 每个 codec case 自带锚点，牙齿测试断言 `src/typert.js:\d+`，`pointer()` 变为「锚点消失即报错」。
- 第 5 轮：`materialize` 的 `misses` 是死路径（push 之后立刻 throw，三处注释失真）→ 去掉 `misses`，仍以抛错指名 specifier，并给替身加了「按名拒绝」的牙齿用例。
- 第 6 轮：`evaluateBundle`/`registeredByHostHalf` 文档缺 `@param`/`@returns`、一句描述已删设计的注释、部分锚点会落到注释或无关推导、显式文件的锚点静默降级 → 全部修正。

**审查之外自查修掉的一处自身缺陷：** 实现期间有两个测试文件被 PowerShell 管道写成非法 UTF-8（同票 01 第 3 轮那类问题），已用编辑器重写，并对整棵树做了严格 UTF-8 校验（src/、scripts/、test/、lib/、README 均无 U+FFFD、无 BOM、LF）。

### 已知限制与交接

- **浏览器通道在 Node 里不可达。** 端到端用例替身的是 `connection`（物理 WebSocket 载体）；`$mount`、贡献校验、命名空间安装、参数组装、严格解码、派发、结果信封与两层解包全部是真代码。`npm run probe` 另证客户端半已被合成并被服务，但**没有**在真实页面里执行它。
- **`resend.apply` 目前一律 `internal`。** 票 03 必须替换这一分支；结果 schema 的成功分支至今没有生产者，票 03 应补一条正路径断言。
- **请求 codec 故意放行** 空 `sessionId` 与缺 `text` 的 `op:'edit'`：`bad-request`/`blank-text`/`no-text` 是业务结论，属业务层（票 03），codec 不越权替它们拒绝。
- **`remoteMountState()` 是页面级开关**：一次页面加载只物化一次工厂；若某次激活被拒而更早的挂载仍存活，开关读作 `failed` 而调用仍可用（§6.5 要求被拒即禁用功能，且这一半无法窥探先前激活装下的命名空间）。票 06–08 读它时需知道这一点。
- §6.4 的 `file:line`：`loadFace` 的「面文件缺失/未导出」只给路径——这两种情况本就没有行可指。
- 新增的两个 **仅测试用** devDependency：`@deepseek-ai/dsh-api-gateway`（精确钉点，让描述符用例在 CI 里驱动真实消费者）与 `@deepseek-ai/dsh-util-crypto`（gateway 的客户端 ESM 引用了它却未声明）。gateway 是 devDependency 而非 peer：**没有任何随包代码 import 它**，客户端半经 `ctx.remote` 到达，`dsh.client.inject` 只负责到达顺序。
- `zod`（`^4.4.3`）成为运行时依赖；`zod/mini` 的 API 已在 4.4.3 上单独验证过，不是在 4.6.5 上想当然。
