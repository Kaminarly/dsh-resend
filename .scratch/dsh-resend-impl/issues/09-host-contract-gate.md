# 09 — 宿主契约门禁与 CI 钉死

规范归属：[`spec.md`](../../dsh-resend-plugin/spec.md) §12、§13.5。规范是规范性的，本票与规范冲突时以规范为准。

**交付的端到端行为：** `check` 里的第三道门禁直读**已安装**应用的 `app.asar`——不联网、不改动 profile——双向断言本插件读取的每一个宿主成员。宿主把自己的契约改了，门禁在**下一次**跑 `check` 时就变红，而不是等用户退回一个静默坏掉的功能。

## 必须断言的内容

**存在**：`Session.snapshotEvents`、`Session.eventAt`、`Session.append`、`Session.seq`、`Session.surface` / `.nodes`、`SessionStore.get` / `.flush`、`AgentRegistry.get`、`Agent.status`、`Agent.followup`、`tokenMeter.measure`、`tokenMeter.estimateMessage`、`sessionQuery.readSession`、`sessionPersistence.open`、`sessionPersistence.stat`、`sessionProjections.stateOf`，以及客户端服务 `slots`、`locale`、`uiConversation`、`ctx.remote.$mount`，外加两个槽位目录条目 `conversation.chat.node` 与 `conversation.chat.assistant-actions` 及其 `standardProps`。

**不存在**，作为复活警报：`Session.events`（上游已移除——所有读取都走 snapshot / `eventAt` 访问器），以及任何本插件不使用的客户端会话控制器成员。

**一条插件侧不变量**：除读日志的那个模块之外，没有任何文件读取 legacy 事件视图成员。扫描插件自己的代码树并以 `file:line` 失败。

## 门禁自身的两条规则

- **缺失的 scope 标记与缺失的条目算漂移，不算通过。** 文件或目录条目找不到就是失败——**一个空洞地变绿的门禁比没有门禁更糟**。
- **反向断言宁可过度匹配，不可匹配不足。** 一个宿主成员可能是带初始化器的类字段、getter、方法、构造函数赋值、对象字面量属性，或挂载式（`Object.assign(X.prototype, …)`、`Object.defineProperty`、计算类成员）。这些形态都要匹配；**假红是安全方向**。

## asar 读取

asar 不存在时打印一条显式 SKIP 并以零退出——这道门禁对 Desktop 是可选的。用约 30 行的内建读取器读它，而不是引依赖：头部大小是偏移 12 处的 `u32LE`，JSON 头从 16 开始，文件数据从 `17 + headerSize` 开始，条目偏移相对于该基准。先设 `process.noAsar = true`，因为 DSH Desktop 在 Electron 的 Node 下跑包脚本，它的 asar 包装会拦截任何以 `.asar` 结尾的路径。

**Blocked by:** 02。

**Status:** resolved

- [x] `scripts/check-host-contract.mjs` 直读已安装应用的 `app.asar`，不联网、不写 profile，并被 `check` 与 CI 调用。——断言表抽到 `scripts/host-contract.mjs`，门禁只负责读取与判定：`app.read()` 是唯一的读取入口（`package.json:30` 串进 `check`，`.github/workflows/ci.yml:30` 跑 `npm run check`），测试用源码守卫断言门禁文件不含 `fetch(`／`http.request`／`writeFileSync`／`appendFileSync`／`mkdirSync`／`DSH_HOME`／`rmSync`。已安装应用可以是未打包的 `resources/app` 或打包的 `app.asar`，两条路径各有用例（打包路径由 `test/helpers/asar.mjs` 写出的归档驱动）。
- [x] 上面列出的每一个**存在**成员都被断言，且故意删掉其中一个时门禁**变红**（在临时副本上验证）。——表里 19 个实体共 29 个 PRESENT 成员 + 10 个按名字导入的绑定，每个成员/绑定的删除用例都由表本身生成，并断言**只有那一条**断言变红（`FAIL PRESENT` 计数为 1）；此外还有针对**真实安装副本**的变异用例：改名 `readSession`、把 `SlotRegistry.prototype.register` 这个挂载式成员改掉，都必须变红并点名。真实安装上跑门禁为绿（29 present / 10 absent / 19 entities / 10 imported bindings / 2 catalog entries）。
- [x] `Session.events` 被作为**不存在**断言；把该成员人为加回时门禁变红。——ABSENT 方向对 `Session.events` 有 17 种声明形态的复活用例（类字段、getter、setter、方法、构造赋值、实例访问、对象字面量/引号键/行首键、计算声明、计算访问、类内挂载、原型挂载与引号原型挂载、`Object.assign` 内联与经对象、`Object.defineProperty`），测试断言**用例集合与表的 `absent` 形态集合完全相等**；真实安装副本上给 `Session.prototype` 回挂 `events` 也必须变红。
- [x] 插件侧扫描在 `lib/` 下出现一次 legacy 事件视图成员读取时以 `file:line` 失败。——`src/` 与 `lib/` 各自扫描一次，命中即 `plugin-side legacy read <file>:<line>`；`session["events"]` 这类计算写法同样命中。豁免是**表达式级**的：只把 `uiConversation.events.register` 这一段从行里剔除后再判定，因此同一行既注册又读内容仍会红。豁免范围由产物横幅推导（`src/log-read.js` 或横幅指向它的产物），每个目录必须恰好有一个日志读取模块，缺失即漂移，无法靠改名单放宽。
- [x] scope 标记或目录条目缺失时门禁失败，而不是空洞地通过。——包清单、契约文件、类声明、服务注册名、目录条目缺失全部失败；目录条目被声明两次算歧义（不再读第一个）；**表自身任何一组为空也失败**（含 `EXPORTS[i].names`、目录条目的 `standardProps` 这类嵌套），因为空表会一边什么都不断言一边打印 OK。另有源码守卫断言门禁确实调用了这个守卫。
- [x] 反向断言覆盖类字段、getter、方法、构造函数赋值、对象字面量属性与挂载式六种声明形态。——`MEMBER_FORMS` 实现 17 种（PRESENT 与 ABSENT 各自取舍：PRESENT 不接受裸调用或计算访问，ABSENT 不接受裸局部变量），实体限定的挂载式形态都带 `\b`，因此 `ClientSession.prototype.append` 不会误伤同文件里的 `Session`（有近似名/正对照用例）。无法枚举成员的 `Object.assign(X.prototype, methods)` 只在 ABSENT 方向成立，宁可假红。
- [x] asar 不存在时输出显式 SKIP 并 `exit 0`。——`resolveHostApp()` 找不到任何安装时打印 `check-host-contract: SKIP — …` 并以 0 退出；CI（无 Desktop）每次都会走到这一支，本机用例则在有安装时断言 OK 路径。显式 `DSH_APP_ROOT`／`DSH_APP_ASAR` 指错是硬失败而非跳过。
- [x] 读取器设了 `process.noAsar = true`，且在 Electron 的 Node 下运行时不因 asar 包装而误判。——`scripts/asar.mjs` 与 `scripts/host-app.mjs`（两个能打开路径的模块）各自在模块顶层设置；用例在**新进程**里先把标志清掉再 import，断言被置为 `true`。数据基址按头部自证选择（Electron pickle 式 `8 + u32LE@4`，§12 的紧凑式 `17 + headerSize` 作为回退），两种布局各有用例。

## Comments

### 已实现（2026-10-09）

四个提交，`lib/` 无需重建（`git diff --exit-code -- lib/` 在 `build` 后干净）：

1. `0217357 refactor: share the gate option guard` — 两道门禁逐字重复的「未知选项即用法错误」循环抽到 `scripts/args.mjs`（`rejectUnknownOptions`），保留两处要点：有值选项的值位跳过、诊断里点名门禁自己的选项。`check-typert.mjs` 改用同一实现。
2. `c724d57 feat: assert every host member the plugin reads, in both directions` — 新增断言表 `scripts/host-contract.mjs`，重写 `scripts/check-host-contract.mjs`，并修好 `scripts/asar.mjs` 的布局选择与 `noAsar` 位置。
3. `95735a9 test: cover the contract table, its drift cases and the asar layouts` — 新套件 109 例（夹具由表生成，逐成员/逐绑定删除、17 种复活形态、目录与 exports 漂移、插件侧扫描、空表守卫、真实安装变异），`test/helpers/{host-contract,asar}.mjs`，`test/asar-reader.test.mjs` 接管两种头部布局与 `noAsar` 探针。
4. `9aa9350 docs: describe the completed host-contract gate, and land the pending translation` — README 第三条门禁改成实际行为；顺带落地自「隐藏行为」那次会话起一直未提交的 README／CONTEXT 中文翻译（门禁那一段写在该文件的语言里，无法拆开；代码提交不受影响）。

**表为什么按「实体」而不是按文件组织。** 打包后的 bundle 里 `events`、`append`、`get` 这类名字到处都是，只有把断言限定在**声明该成员的类**上，反向（ABSENT）警报才能同时做到响亮与为真。类声明因此是 scope 标记，找不到就是漂移。

**额外断言（超出 §12 枚举，但服务同一条交付承诺）。** 插件两侧按名字导入的绑定会被检查，且不只检查「那个文件里还有这个导出」，还从包的 `exports` map 推导插件 import 的 specifier 落点，落点不符即 `import path moved`——否则宿主改了子路径映射，门禁会对着一个没人加载的文件保持绿色。`--report` 是默认关闭的诊断开关，用来在真实安装上核对每条断言是由哪种声明形态满足的。

**修掉的两处会削弱门禁的地方。** 一是骨架期留下的逃生口：原实现按 app 清单名等于 `fake-app` 就把断言收窄到两个成员——正是 §12 禁止的空洞绿灯，已连同依赖它的骨架用例一起退役（新套件是其替代）。二是 `SessionProjectionRegistry.stateOf` 的 `usedBy` 曾指向 `src/resolve.js`，实际读它的是 §13.1 #4 的**测试套件**（`test/write-pair.test.mjs`），指针已改正；同时补上 `locale.getSnapshot`（`src/trace-text.js` 真的在读，缺了会静默写默认语言）。

### /code-review（2026-10-09）

六轮两轴并行审查，最后两轴均为「无需再改代码」。逐轮必修项：

| 轮次 | 标准轴 | 规范轴 |
|---|---|---|
| 1 | 导出函数缺 `@returns`、`escapeName` 只转义 `$`、`boltOn`／`pickle` 名不副实、`presentCount` 把导入绑定算成成员、`KNOWN_FLAGS` 与 `check-typert` 重复、`writePluginTree` 与 `writeHostFixture` 重复、`contractFileList` 纯转发 | `Object.assign(X.prototype, methods)` 无形态可匹配；`Object.assign`／原型赋值形态实现了却没有用例；插件侧扫描漏掉 `session["events"]`；注册豁免按整行豁免过宽；目录条目取第一个匹配；实体限定形态缺 `\b`；`standardProps` 未转义 |
| 2 | `scripts/host-contract.mjs`／`test/gates.test.mjs` 是 CRLF（违反 `.gitattributes` 的 LF 钉死）；**表自身为空时门禁空洞地绿**；`writeHostFixture` 仍为纯转发 | 目录条目为空时连「目录文件缺失」都不报；真实源变异只覆盖 `readSession` |
| 3 | 死夹具 `let app`；`not.toContain('SKELETON')` 是空断言；目录诊断缺 `file:line`；`usage` 两种形状 | 空组检查只到顶层（`EXPORTS[i].names`、目录 `standardProps`、实体成员全空仍绿）；`\b` 无用例钉住；`EXPORTS` 断言的是「文件里还有该导出」而不是「插件 import 的 specifier 落到该文件」 |
| 4 | `test/host-contract.test.mjs` 又回到 CRLF；README 仍写「约 30 行」而读取器已 81 行 | 无需改动 |
| 5 | `RESURRECTION_SHAPES` 的自述「覆盖 MEMBER_FORMS 全部 absent 形态」不成立（缺 6 种）；`check-typert.mjs` 用块注释注释语句 | 无需改动 |
| 6 | 无需改动 | 无需改动 |

**留档的判断题与限制（非必修）：**

- `rejectUnknownOptions` 抽到 `scripts/args.mjs` 并改用到 `check-typert.mjs`，落在本票文件清单之外，但行为不变（同一诊断、同样 exit 2、同样的值位跳过），且这是第 1 轮标准轴自己要求的去重。
- `--report` 是本票新增的默认关闭开关；`EXPORTS` 表属于「本插件读取的每一个宿主成员」的扩展读法。
- §12 把数据基址写作 `17 + headerSize`，实测应为 `align4(16 + headerSize)`；实现优先采用头部自证出的 pickle 基址，并把规范里的紧凑式保留为回退，两种布局都有用例。这是**记录的规范／实测冲突**，规范原文未改。
- 本机安装是未打包的 `resources/app`，因此真实 Electron asar（`app.asar`）只有合成归档覆盖，真实归档交叉校验用例在本机与 CI 都会跳过；Electron 自身的 asar 包装无法在纯 Node 下执行，新进程 `noAsar` 探针是能做到的最强证明。
- 表与宿主的对应关系只在有安装的机器上得到证明（本机为绿）；CI 上该门禁按 §12 的设计合法地 SKIP。
- §12 的「任何本插件不使用的客户端会话控制器成员」不可枚举，实现取写/事件视图族（`append`、`flush`、`snapshotEvents`、`eventAt`、`followup`），并有意不含 `events`（客户端会话对象本就带一条同名的线上事件流，永远红着的警报等于没有警报）。

**过程留痕。** 中途一次 PowerShell `Set-Content` 回写把 `scripts/check-host-contract.mjs` 的内容破坏为 `r→e`。停手后从本会话的会话日志（zstd 分帧解码）取出该文件历史：以首次完整 `read` 为基、按序重放 19 次 `edit`，确定性重建，并以门禁输出与整套测试逐项核对与破坏前一致。
