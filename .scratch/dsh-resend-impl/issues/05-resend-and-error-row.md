# 05 — 重发，以及「重写成功、重发失败」

规范归属：[`spec.md`](../../dsh-resend-plugin/spec.md) §5.5、§9.4、§7（注册点 2）、§13.1 #9。规范是规范性的，本票与规范冲突时以规范为准。

**交付的端到端行为：** 改写完之后新提示词真的送进模型并可见；而当**只有**重发这一步没送出去时，用户在重写点上看到一行可行动的错误，带一个「重新发送」按钮——按钮**不会**再重写一次。

## 重发

载体落地且会话 flush 之后：

```js
const agent = agents.get(sessionId)
agent.followup({ content: [{ type: 'text', text }], source: { kind: 'user' } })
```

- `followup(input)` 排队一个正常的下一回合提示词并唤醒驱动器。该消息作为**真实**的 `user/message` 被追加——这正是新文本可见的原因：载体什么都不渲染，重发的消息是用户唯一看到的新行。
- `source.kind` 这里**必须**是 `'user'`：与载体不同，这条消息真的是用户的回合，下游一切都必须把它当回合边界。
- **`followup` 是发射即忘，返回值不携带任何信息。** 它返回 `undefined`（不是 thenable），所以没有东西可 `await`、没有东西可 catch。**不要**给它写 `await`——那读起来像「失败可能在这里被观测到」，而它不可能；它甚至不会因为 agent 缺失或已销毁而抛错。调用点唯一可用的推断是**接受性**检查：调用之后读 `agent.status`，`running` 表示回合被接受，其余都表示没有被接受。
- **回合自身**的成败从这次调用不可观测，它在会话日志里：回合以 `turn/end` 收尾，`data.reason.kind` 为 `'completed'` 或 `'error'`（错误消息在 `reason.error.message`）。

## 两种失败，不是一个状态

**提示词从未到达 agent。** 模型上下文已被重写，但 `followup` 没接住它：调用后 `agent.status` 不是 `running`。这是插件自己的错误行覆盖的失败，它**必须**可见。在**重写点**渲染一行错误行，带：

- 警告图标 `IconWarningOutlineRegular`；
- 一句本地化文案，直白说明历史已被重写而重发失败，并给出原因；
- 一个**「重新发送」**按钮，它重发提示词而**不再**执行一次重写。

这行错误行是同一位置上隐藏计数告知行的后继；一个重写点上有且只有其中之一。

**回合被接受之后失败了。** 重写成立、agent 收下了提示词、回合本身出错（模型拒答、请求失败、工具炸了）。**这个情形不归插件所有，且不得为它发明任何行。** 它在调用点不可区分，而 agent 已经用自己的话在人类记录里、在同一个回合上报了它；在这里再悄悄声称一次，等于把一次失败报两遍，并把插件的猜测摆在宿主权威消息旁边。

插件在这种情况下唯一欠用户的是：**不要毁掉重写。** 失败的回合留下被遮蔽的区间与新追加的文本，这是一个自洽、可重发的状态——和一次成功回合留下的状态相同。用户的恢复手段是宿主自己的重试入口，不提供第二个入口是正确做法。

**两种情形下插件都绝不能**在自己已经改过的表面上报告失败，或暗示重写被撤销。flush 一完成，重写就是持久的；错误行描述的是**重发**，永远不是重写。

**Blocked by:** 04。

**Status:** ready-for-human

- [x] 写入成功时 `followup` 恰好被调用一次，参数形状断言为 `{ role: 'user', id: <票 04 成功信封返回的 resendMessageId>, content: [{ type:'text', text }], source: { kind: 'user' } }`，并断言送达的那条 `user/message` 的 `data.id` 就是它。`id` 不是本票发明的：票 04 在写入时铸出重发消息的身份并经成功信封交下来（§4.1 的字段字面意思是「queued to the agent 的那条消息的 id」），而 agent loop 把 inbox 里的输入对象**原样**追加成事件（`@dsh-agent-loop/lib/index.js:1061`），所以显式 `id` 会活到那条消息里。**不要**把输入过 `createUserMessage`：其 `createMessage` 会做 `{ ...input, id: brandString(randomUUID()) }` 覆盖掉它（`@deepseek-ai/dsh-llm/lib/index.js:37-42`，已装机 0.2.0-rc.2 在 `lib/types/message.js`），那样 `resendMessageId` 就与它命名的那条消息脱钩。
- [x] **接受性判定只用 `agent.status`**：调用后立即读取；不 await、不读返回值、不依赖任何 thenable。有一条用例证明返回值是 `undefined` 且对已销毁的 agent 也不抛错。
- [x] 接受失败（状态非 `running`）时错误行**只出现**在重写点上，且包含原因文案与「重新发送」按钮。
- [x] 点「重新发送」只再调用一次 `followup`，**不产生**第二次重写（日志中不新增 `compaction/prune`，`session.seq` 只增加重发消息本身所需的部分）。
- [x] 一个重写点上，错误行与隐藏计数告知行**互斥**，恰有其一。（互斥与「恰有一个分支」由 `rewindPointView` 的单值性和测试钉住；告知行的**内容**按规范归属票 06，见下「已知限制与交接」，所以今天该分支渲染空而不是一个凑出来的计数。）
- [x] 已接受但随后失败的回合：插件**不**产生任何行、**不**把重写标记为失败、**不**尝试撤销；被遮蔽的区间保持被遮蔽，新文本保持已追加，状态可被宿主自己的重试入口恢复。
- [x] 错误行本身渲染抛错时被共享错误边界接住，其余界面继续渲染（与票据 08 的边界实现相同）。

## Comments

### 与票 04 的交接（票 04 实现时发现，2026-10-02）

票 04 的成功信封必须带 `resendMessageId`（§4.1 的封闭结果形状：三个字段都在严格 codec 里，缺一个就在边界被拒），但重发是**本票**的事，所以票 04 在写入时先铸出这个身份（`dsh-resend-<op>-resend-<uuid>`）并通过成功信封交下来。本票必须把它作为 `followup` 输入的 `id` 传下去，理由、证据与两个陷阱见上面第 41 行（`createUserMessage` 会覆盖 `id`，所以必须传成员齐全的消息对象**原样**）。不这么做，`resendMessageId` 就是一句指向不存在消息的谎话——本票的清单第 1 行与那个字段届时互斥。

这一行是用户确认后、按 `/code-review` 的 Spec 轴要求修订的：原文把参数形状钉成两成员（照抄了 §5.5 的缩写片段），而 §5.5 的片段至少还缺 `role`（追加 `user/message` 的既有形状一直是 `{ role, id, content, source }` 四成员，本仓库的 fixture 也是）。

### 已实现（2026-10-02）

**交付的端到端行为。** 改写落盘并 flush 之后，新提示词真的被送进模型：`followup` 排队的那条 `user/message` 是用户唯一看到的新行（载体一个像素都不渲染），成功信封报出它的 id；而当**只有**重发没送出去时，重写**照旧成立**，用户在重写点看到一行错误行（警告图标 + 直白文案 + 「重新发送」），按钮重放同一个请求——宿主只重发、不再落第二对事件。

**模块图。** `lib/` 现在十个产物（九个宿主侧 ESM + 一个浏览器包），新增一个自有产物：

- [`src/marker.js`](../../../src/marker.js) — 插件自己的事件身份，一个模块一处拼写：`carrierIdFor(op, uuid)` 铸载体 id `dsh-resend-<op>-<uuid>`，`resendIdFor(carrierId)` 派生重发消息 id `<载体 id>-resend`，`isCarrierIdFor(op, id)` 与 `hasMarkerPrefix(id)` 供读取方判定。**纯**（uuid 由调用方传入），所以宿主三处读者与浏览器包可以共用同一份拼写——这也正是客户端能识别「自己的载体」的原因。
- 客户端三个新模块（被 esbuild 内联进 `lib/client.bundle.js`，不单独出产物）：[`src/panel-boundary.js`](../../../src/panel-boundary.js)（唯一共享错误边界 + `withPanelBoundary`）、[`src/rewind-row.js`](../../../src/rewind-row.js)（重写点的 Definition、两态选择、行组件、把本页 operations 绑进槽位的 `rewindRowSurface`）、[`src/resend-operations.js`](../../../src/resend-operations.js)（唯一调用点、结果记录、「重新发送」重放）。

**关键取舍。**

- **接受失败是「成功但缺字段」，不是错误码**（用户确认的设计）。§9.4 禁止对自己已经改过的表面报失败，而成功分支还必须在场：客户端要用 `carrierSeq`/`shadowedSeqs` 做隐藏计划（票 06）。所以 `resendMessageId` 变成可选——它在场＝提示词已入队，缺席＝未入队——`ok:false` 的那条路会同时违背 §9.4 并扣住隐藏计划需要的字段。
- **「重新发送」复用同一个 `resend/apply`，由宿主做「只重发」**（用户确认的设计）。识别完全是日志推导的：目标被**自己**的、**同一个 op** 的载体遮蔽，且该载体 id 派生出的重发消息不在覆盖式日志里。不新增端点、不动线上契约、宿主重启后仍可判定。载体 id 与重发 id 的配对（`./marker.js`）就是为这个问句存在的：票 04 的两个独立 uuid 让「这条载体的提示词到底有没有入队」变成不可答。
- **`source.kind` 是 `'user'`，输入原样四成员**：`followup` 收到的是 `{ role, id, content, source }`，不过 `createUserMessage`（它的 `createMessage` 会覆盖 `id`，那样 `resendMessageId` 就指向不存在的消息）。
- **重试路径同样过 §4.4 规则 4**：`apply` 的规则 4 读在锁外，所以锁内再读一次；重发不写任何事件，因此它**拒绝**（`agent-busy`）而**不**取消用户自己的回合（写入边界那次 `cancel` 是给「回合抢在写入前打开」的竞态用的）。
- **`surfaceOp` 探针/门禁的边界**：`scripts/check-host-contract.mjs` 的插件侧「legacy 事件视图」扫描原来会命中客户端的 `uiConversation.events.register(...)`——那是**注册表**读取（§7 唯一入口），不是被移除的 session 事件数组。改成**按表达式**豁免（同一表达式里取 `register`），文件级不豁免；`test/gates.test.mjs` 用正反对照把它钉住：同一文件里 `service.events.register(...)` 通过、`service.events.map(...)` 以 `file:line` 失败。

**测试与替身。** 新增 [`test/resend.test.mjs`](../../../test/resend.test.mjs)（15 例，真 Gateway 端到端）与 [`test/rewind-row.test.mjs`](../../../test/rewind-row.test.mjs)（23 例）。宿主侧替身新增**按模式驱动**的 agent（`accepting` 会像实测那样把 `status` 翻成 `running`；`deaf` 是已销毁 agent 的形态——静默、不抛、永不接受；`delivering` 做 agent loop 被接受后会做的事：把认领的输入**原样**经宿主自己的 append 契约追加成真实 `user/message`），并新增 `completedRewindFixture`（带重发消息＝已完成的改写）与 `foreignRewindFixture`（别人写的载体）——`rewoundFixture` 的语义随之写明：**只有一对、没有重发消息**，正是本票重试识别的那个状态。客户端侧新增 [`test/helpers/client.mjs`](../../../test/helpers/client.mjs)（四个客户端服务替身）与 [`test/helpers/render.mjs`](../../../test/helpers/render.mjs)（jsdom + `react-dom/client` 的真实 DOM）。

**为什么客户端测试要真 DOM。** 「一个界面渲染抛错只让它自己变成错误行，其余照常」这条只有 React 的边界语义真的跑起来才答得了：实测两个服务端渲染器都不行——legacy 的 `renderToStaticMarkup` 直接把抛错往外传（边界看起来什么都没做），流式的 `renderToPipeableStream` 让 shell 阶段的抛错变成致命（`onShellError`，兄弟节点一起没了）。所以 `react-dom` 与 `jsdom` 只作 devDependency（没有任何随包代码 import 它们），`react` 仍是 peer（一页只有一个实例；内联第二份正是 hooks 经典故障）。

**测试接缝。** `lib/client.bundle.js` 的工厂现在只向模块表要两个条目（`react`、`@deepseek-ai/dsh-client-ui-primitives`），由 [`scripts/client-bundle.mjs`](../../../scripts/client-bundle.mjs) 的 `MODULE_TABLE` 提供：`react` 是真的（本包的 peer），primitives 是**两个图标的替身**并写明替身边界（已装包是浏览器专属：ESM 里 import `.module.css` 与本仓库没装的 workspace 包，Node 载不进来）；「名字真的存在于已安装包」由 `test/rewind-row.test.mjs` 直接读包源码钉住——替身证明不了这条。此外 `src/client.js` 把套件要驱动的接缝（行、选择函数、Definition、绑定工厂、边界工厂、operations 工厂）从产物里再导出：浏览器半没有可跑的宿主，唯一诚实的测法是**求值并物化真正发布的那份产物**再驱动它。

### 已执行的验证

- `npm run check`：三闸全绿（`check-syntax` 解析 `lib/` 下 10 个文件；`check-typert` 对**已安装 app** 的校验器跑 42 拒绝/8 接受探针、两面深比较、2 个产物读回对账；`check-host-contract` 含新的注册表读豁免）。
- `npm run build` 后 `git diff --exit-code -- lib/` → exit 0（CI 的产物诚实性门禁；`test/build-artifacts.test.mjs` 另有等价断言，并断言每个产物都被 git 跟踪）。
- `npm test` → **273 passed / 2 skipped**（17 个文件）。
- `npm run probe` → **5 PASS**（隔离 profile 真机启动：宿主行 ACTIVE、启动审计静默、boot graph 含客户端行、被服务的 bundle 自注册）。
- 产物自查：`lib/client.bundle.js` 里能读到 `translatorOrKey` / `RESEND_FAILED` / `slot`，且已**没有** `carrierId`；`lib/resolve.js`、`lib/index.js` 带 `resendOnlyPlan` / `hasMarkerPrefix`。
- 行卫生：本票新增/修改的文件无行尾空格、无超长代码行、文件尾有换行、全树严格 UTF-8（无 BOM、无 U+FFFD、LF）。

### 审查记录（`/code-review`，两轴，逐条处理）

**第 1 轮（Standards + Spec 双轴并行子代理）。**

- **Standards 硬发现 3 条**：9 个新/改文件缺行尾换行 → 全补；`isCarrierEvent` 有导出无读者 → 收回模块私有；**一条真缺陷**：注册进槽位的行界面拿不到 `operations`（槽位只传 §7 那套标准 props），真机上会读 `undefined.subscribe` 并被自己的错误边界顶掉——正是 §7.4 记录的「看起来这个功能从没做过」那类故障 → 改为在注册点绑定 `rewindRowSurface(operations)`，并补两条测试（槽位只给标准 props 的真实 DOM 渲染；不绑定就会渲染出错误面板的负向路径）。
- **Standards 判断项 5 条** → 全改：`retryPlan` 改名 `resendOnlyPlan` 且本功能一律称 re-send / 「Send again」（`CONTEXT.md` 的 Avoid 词表禁用 retry 指这两个功能）；测试里重复的 require 闭包改用 `materialize(registration, recordingTable)`；计数器误名 `carrierSeq` → `carrierCounter`（seq 是日志索引）；插件名四处拼写 → 统一 `PACKAGE`；前缀判定两种写法 → `hasMarkerPrefix`。
- **Spec 7 条**：5 条以代码+测试修掉（原因文案进断言；`followup` 返回值 `undefined` 直接断言；并发两次「重新发送」只能进一条提示词；`blank-text`/`no-text`/`agent-busy` 在重试路径同样成立；§11 注释改为如实陈述与 §9.4 的张力而不是引用错条款）；另外 4 条记录为决策/限制（见下）。

**第 2 轮（小范围抽查子代理；两次「整树复核」子代理长时间无返回，已中断并改为小范围抽查）。**

- **Spec 抽查三问**：① 「重新发送」**不可能**产生第二次重写——目标一旦被自己的载体遮蔽，`surfaceOp` 的起点就不再在活表面上，落不下一对；重复入队有两道闸：配对重发消息是否已在日志（主闸，日志推导）+ §4.4 规则 4 的 `agent-busy`（时间窗闸，依赖 §16.2 实测的「调用后立即 `running`」）。② 两态互斥是结构性的（单值函数 + 单分支），但「恰有其一」今天只到互斥这一层，因为告知行内容属票 06。③ 已接受后失败的回合：插件零行、零声明、不撤销 ✓。**最新一轮 Spec 抽查不要求改代码。**
- **Standards 抽查 7 条** → 全改：工厂 `@returns` 漏 `subscribe` 与各成员缺 `@param`/`@returns` → 补全；Definition state 里无读者的 `carrierId` → 删除（测试改为钉住 `start` 的精确形状 `{ carrierSeq }`）；`'conversation.chat.node'` 两处 → 一个 `slot` 常量；重复的 `bySession.get(...)` → 一个带文档的 `outcomeOf`；`'resend-failed'` 跨模块字面量 → 单一来源 `RESEND_FAILED`；`(sessionId, carrierSeq)` 数据泥团 → 公开 API 收成一个 `{ sessionId, carrierSeq }` **重写点地址**；`PLUGIN = PACKAGE` 别名去掉 + 重复的 `typeof t === 'function'` 守卫抽成 `translatorOrKey`。修复由实现者按行核对，并以套件/门禁/产物证据复核。

### 已知限制与交接

- **错误行的可见性是页面级的。** 「重新发送」要重放的那份请求（尤其编辑后的文本）按构造就是客户端状态，所以刷新页面后该重写点回落到普通状态（今天渲染空，票 06 起是计数告知行），不再提供按钮——**规范 §9.4 的「必须可见」在发生它的那一页成立**。要跨刷新就得把用户文本写进浏览器存储，本票刻意没做这个发明；日志侧（宿主）已经能独立判定这条重试，客户端若日后要问，需要的是第二条 Remote 方法，而那与「一个一元方法」的取向冲突，得先改规范。
- **告知行的内容归票 06。** §8.6 要求计数**等于发出的隐藏计划 key 数**（不是被遮蔽 seq 数），那是票 06 的机器；所以本票只交付「两态互斥、恰有一个分支」，该分支暂渲染空——用一个凑出来的数字填上，恰恰会在最需要它的长会话重写上撒谎。
- **§11 的「第二次追加失败 → show §9.4」按 §9.4 自身描述裁定为不适用。** 那一行是第二次 append 失败、载体没落地：**没有载体就没有重写点**，§9.4 的行又明确说的是「重写发生了、重发没有」，照字面加一行等于对着没被改过的表面声称历史已被重写。所以仍以 `internal` 失败 + 日志里的 `ORPHAN audit claim`（票 04 已实现）呈现。这是本票唯一一处与规范表格字面表述不一致的地方，按 §9.4 的规范性描述裁定。
- **`followup` 外的 try/catch 是防 §9.4 违例，不是猜 §16.2。** §16.2 实测它不抛（对已销毁 agent 也不抛）；这段存在只为「万一将来抛了」也不能把已 flush 的重写报成失败，那时「未入队」是用户能行动的状态。
- **浏览器半的接缝再导出是给套件用的**（`RewindRow` / `rewindPointView` / `REWIND_ROW_DEFINITION` / `rewindRowSurface` / `withPanelBoundary` / `createResendOperations`）：`src/` 直接 import 会测到浏览器永远收不到的树（primitives 是浏览器专属），所以套件必须驱动发布产物的导出面。票 06/07 的入口就是 `createResendOperations.run`（绑定方式与 `rewindRowSurface` 相同）。
- **客户端 UI 走子 fiber。** `slots`/`locale`/`uiConversation` 不进静态 `inject`：静态里有一个宿主没有的服务会让整行 PENDING，而 renderer 的启动审计把 PENDING 当启动失败（参考实现为此整页白过）。等不到的代价只是功能缺席，符合 §7 自己的承诺。
- **票 06 接手处**：`rewind-row.js` 的 notice 分支（计数 + dismiss，且 dismiss 后隐藏规则必须仍挂载）、动作行 Definition 与 `conversation.chat.node` 的 `user` 之外新 kind、隐藏计划与 `<style>`；`resend-operations.js` 的记录里已经带上 `shadowedSeqs`（隐藏计划的来源），`test/helpers/render.mjs` 可以直接复用做六个界面的边界断言。

### 提交（8 个，按逻辑意图；票文件本身不在这些提交里）

`chore:` DOM 测试渲染器（react-dom / jsdom）与包描述 → `feat:` 事件身份（载体 id 与派生的重发 id）与可选 `resendMessageId`（含 `lib/marker.js` 产物接线）→ `feat:` flush 后重发 + 只重发重试 → `feat:` 浏览器半（重写点行、共享边界、模块表、契约门禁的注册表读豁免）→ `test:` 宿主侧重发/重试套件与随之改变的三处既有期望 → `test:` 客户端套件（服务替身 + DOM 套件）→ `build:` 重生成 `lib/`（十个产物）→ `docs:` README 与 `CONTEXT.md`（新增 `Rewind point` 词条，并在 `Replay turn` 记下重发消息 id 由载体 id 派生）。
