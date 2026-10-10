# 四设置整体验收记录

日期：2026-10-10（Asia/Hong_Kong）。目标：DSH Desktop 2.0.17。依据：[消息操作范围与持久设置规格](../.scratch/dsh-resend-action-policy/spec.md) §9 的 22 项标准及 §10 的 14 项决定；事项：[06](../.scratch/dsh-resend-action-policy/issues/06-integrated-acceptance.md)。前置事项 01、05 均为 `resolved`。

本轮重新执行验证，补充四种限制组合、同 Profile 新会话及重启后历史隐藏的 18 项联合测试。当前项目的 35 个测试文件中，583 项通过、2 项跳过、0 项失败。项目完整 `npm test` 另包含前序提交验证副本：共 114 个文件，2085 项通过、8 项跳过、0 项失败。副本通过不作为新功能完成的依据。

## 验证方式与边界

- **实际宿主服务**：从本机安装读取 SettingsForms、ConfigEditor、Loader、ConfigForms，实际写入并重新读取 `.tmp/integrated-acceptance-*` 等隔离 Profile；独立客户端验证同步和失败恢复。重启验证会关闭并重新建立测试宿主，不重启用户应用。
- **实际消息处理**：严格 Gateway 请求入口、真实 Session 追加与重放、官方模型可见范围、token 处理，以及本机真实会话组装器和消息定义。至少两组问答检查交付给 agent 的 prompt、退出上下文的消息范围和原始日志。agent 与网络传输为边界替身；没有连接外部模型，不能将这些结果描述为外部模型实际推理成功。
- **实际浏览器控件**：Playwright 打开 `scripts/preview-ui.mjs`，运行当前 `lib/client.bundle.js`，使用本机 DSH 的 React、消息气泡、按钮、Tooltip、Switch、设置外壳和主题。页面采用示例会话与模拟保存；长期保存和实际请求处理由隔离集成验证承担，不能用预览页证明保存成功。
- **保留限制**：升级前没有编辑摘要的旧 Carrier 无法核验欠下编辑文字的精确身份，沿用事项 04 已记录的兼容行为。本轮对新记录验证换目标、换文字和重复补发拒绝，不声称旧记录也具备相同文字核验能力。未新增刷新后编辑草稿或补发状态恢复能力。
- **验收阶段未执行**：用户 Profile 安装、用户应用重启、发布、Git 提交、外部模型请求。普通 Composer 发送验证为入口独立性和既有保护回归，没有操作用户的实际会话。用户随后明确授权提交代码并安装插件；安装结果在事项 06 的后续记录中说明。

## 22 项标准核对

表中的「通过」指在上述边界内实际执行并通过，不表示对未执行项目作出承诺。文件均为本轮重新运行的当前项目 `test/`，不使用历史副本替代。

| 项 | 场景与结果 | 验证方式与证据 |
|---|---|---|
| 1 | 首次无保存记录时四开关全部开启，顺序与名称准确，无隐藏开关。通过。 | `integrated-acceptance` 实际宿主默认值；`settings-locale-boundary` 四开关断言；浏览器首次设置页。 |
| 2 | 两段中文说明逐字正确，四种限制组合切换后始终显示。通过。 | `edit-range`、`regenerate-control`；浏览器两段说明全文比较、浅色与 480px 深色布局。 |
| 3 | 显示关闭后所有重新生成按钮隐藏；隐藏期间可修改范围，重新开启保留该值并恢复对应禁用状态。通过。 | 新增 16 项组合请求测试的真实保存；`cross-window-policy`；浏览器显示关、改范围、再开启。 |
| 4 | 四设置分别真实保存，独立新页面、测试宿主重启和新会话使用保存值；其他 Profile 全开，不串值。通过。用户应用重启未执行。 | `preferences-persistence`、新增组合与两类重启历史测试、`cross-window-policy`。 |
| 5 | 缺字段默认开启；合法旧布尔值保留，非法字段不覆盖其他合法字段。通过。 | `preferences-persistence` 的宿主配置解析与 `settings-locale-boundary` 的客户端默认值；旧隐藏值忽略。 |
| 6 | 旧隐藏值 false 不能取消隐藏，旧字段不再可写。通过。 | `edit-hiding`、`settings-locale-boundary`；设置页无对应控件。 |
| 7 | 读取、保存、读取失败、保存失败状态正确；拒绝写入及已写入但丢响应均重新读取权威值并可重试。通过。 | `preferences-persistence` 四字段故障矩阵，`cross-window-policy` 保留已打开草稿；失败由服务边界注入。 |
| 8 | 两个独立页面同步四字段；屏蔽更新的旧窗口不能绕过新规则，拒绝无日志和 prompt 副作用。通过。 | `cross-window-policy` 实际保存与 Gateway 请求；重连和旧响应丢弃用例。 |
| 9 | 两限制的四种组合，分别覆盖较早／最后目标与两种操作；规则互不影响。通过。 | 新增 16 项隔离 Profile 联合请求测试；浏览器同样核对四种组合的两类控件。 |
| 10 | 较早控件置灰且不可点击，短提示准确、位于下方，Tab 可聚焦读取，Enter 不能绕过。通过。 | `edit-range`、`regenerate-control`；浏览器两类提示位置，编辑提示键盘往返及下方坐标检查。 |
| 11 | 打开历史、窗口替换、加载更多、实时新增均依赖完整有效对话，不将窗口末尾当会话末尾。通过。 | `edit-range-assembly`、`regenerate-control` 使用本机 ConversationNodeAssembler、真实消息定义和实际 Host 资格。 |
| 12 | 回退覆盖的较晚记录退出判断，存活的较早对应消息可再次成为最后一条。通过。 | `edit-range-assembly`、`regenerate-control`、`resolution`；联合请求检查 Session 有效范围。 |
| 13 | 最新无文字真实用户消息参与最后判定；Carrier、注入、工具及助手片段不造成错误资格。通过。 | `edit-range-host`、两类实际组装器测试、`resolution` 和 `regenerate-control`。 |
| 14 | 关闭范围仍拒绝非助手目标、失效目标、正在生成、无文字等无效条件；拒绝无回退写入。通过。 | `regenerate-range`、`apply-refusals`、`regenerate-control`、`edit-range-host`。 |
| 15 | 直接请求不能绕过保存规则；锁排队期间或写入前规则／目标变化重新核验，不产生部分回退。通过。 | `cross-window-policy`、`edit-range-host`、`regenerate-range`，观察原始日志、flush 和 prompt 次数。 |
| 16 | 内联打开、发送、Enter、放入 Composer 和关闭内联后的入口都受限制；复制与普通 Composer 入口保持独立。通过入口及既有保护回归；实际用户 Composer 发送未执行。 | `edit-range`、`edit-hiding`、`native-user-actions`，浏览器实际编辑／复制控件及模拟 draft 接口。 |
| 17 | 编辑框失去资格保留修改文字，可继续修改／取消；发送和 Composer 禁用，恢复后可继续，避免重复交付。通过。 | `edit-range`、`edit-range-assembly`、`cross-window-policy`；浏览器较早消息中文草稿的禁用、继续修改和恢复。 |
| 18 | 保存／同步设置不重挂载编辑框；已放入 Composer 的普通草稿在后续限制开启后保留。通过。 | `preferences-persistence`、`cross-window-policy`、`edit-range`；浏览器 textarea 身份和 draft 全文比较。 |
| 19 | 两组问答中，较早 Regenerate 交付原问题，Edit-and-resend 交付准确修改文字；后续内容退出官方模型可见范围，原始 12 条日志完整。通过实际交付入口和上下文验证；外部模型调用未执行。 | 新增组合和重启测试、`regenerate-range`、`edit-range-host`，检查 prompt 全文、surface seqs、日志前缀与 Audit claim 数。 |
| 20 | 无额外确认弹窗；历史重新打开、重启测试宿主、关闭计数通知后旧消息仍隐藏，新消息可见。通过。 | 新增两类持久历史重启测试、`edit-hiding`；浏览器监测额外 dialog 为 0。 |
| 21 | 隐藏计划读取或分组失败有明确错误；普通消息、附件、原文和原有文件回滚未退化。通过。 | `edit-hiding`、`native-user-actions`、`file-rollback`、`file-rollback-race`、`file-rollback-ui`；浏览器宿主附件与中文气泡。 |
| 22 | 两类回退成功而交付失败，随后开两限制仍能合法补发；只补欠下 prompt，不写第二组事件，不重复交付；换目标／文字拒绝。通过新记录路径；旧无摘要 Carrier 的精确文字核验限制保留。 | `cross-window-policy` 两类真实「再次发送」入口和已接收保护；`edit-range-host`、`regenerate-range` 伪装补发拒绝。 |

## 14 项决定核对

| 决定 | 本轮确认结果 |
|---|---|
| Q1 | 两个范围开关均在「消息编辑」页，与现有两个显示／编辑方式开关同页。 |
| Q2 | 较早操作执行原有 Replay turn，后续有效对话退出上下文。 |
| Q3 | 设置按 Profile 长期保存，独立页面和测试宿主重启恢复。 |
| Q4 | 两个限制均默认开启。 |
| Q5 | 用户消息、助手回复分别按完整有效对话判断最后一条。 |
| Q6 | 保留显示字段 `regenerateLastReply`，名称为「显示重新生成按钮」。 |
| Q7 | 较早图标保留并置灰，准确短提示在下方且键盘可读。 |
| Q8 | Composer 编辑快捷入口与内联入口使用同一编辑限制。 |
| Q9 | 没有额外操作确认；两条后果说明始终可见。 |
| Q10 | 草稿保留、操作禁用、资格恢复后继续。 |
| Q11 | 固定隐藏，无隐藏开关；剩余四设置真实保存。 |
| Q12 | 同 Profile 共享，不同 Profile 独立。 |
| Q13 | 读取／保存状态、失败恢复、多窗口与旧请求核验均通过。 |
| Q14 | 新记录合法补发不重复回退／交付；保留旧格式及刷新恢复的既有边界。 |

## 检查与可复现证据

- `npm run check`：通过源码与 11 个产物语法、两侧严格描述和 14 个错误码、45 个存在／10 个缺失宿主成员等检查。
- `npm run build` 后执行 `git diff --exit-code -- lib/`：通过，生成产物与当前源码一致，未手改产物。
- 新增单文件验证：18 项全部通过，见 `output/06-integrated-tests.json`。
- 适用测试：当前项目 16 个文件、202 项通过；同名历史副本另有 406 项通过，不计为新功能证据，见 `output/06-targeted-tests.json`。
- 当前项目全量：`npx vitest run --dir test --reporter=json --outputFile=output/06-current-tests.json`，35 个文件、583 项通过、2 项跳过。跳过的是实际 Electron archive 的两项交叉验证；本机安装为展开目录，相关展开目录、宿主组装器和持久设置测试均实际执行。
- 完整默认测试：`npm test`，114 个文件、2085 项通过、8 项跳过。默认发现范围也包含 `.tmp/fixed-hide-commit`、`.tmp/regenerate-range-commit` 和 `output/04-submit-tree` 前序副本。
- 浏览器脚本：`output/06-browser-check.js`；结果：`output/06-browser-check.log`。浅色首次设置、两类禁用提示、中文草稿和 480px 深色说明均已截图并人工查看，浏览器 Errors 0、Warnings 0。
- 原有中文名称、两条规格原文、消息原文保留；旧测试注释及两份基础规格已明确当前四设置、默认范围、执行侧判断、固定隐藏和长期保存，未改动无关回滚规则。

启动浏览器验证页：

```powershell
$env:DSH_PREVIEW_PORT = '43136'
node scripts/preview-ui.mjs
```

在另一个终端执行已安装的 Playwright CLI：

```powershell
npx --no-install --package @playwright/cli playwright-cli -s=acceptance06 open http://127.0.0.1:43136 --headed
npx --no-install --package @playwright/cli playwright-cli -s=acceptance06 run-code --filename=output/06-browser-check.js
npx --no-install --package @playwright/cli playwright-cli -s=acceptance06 console warning
```

截图：[首次四设置](../output/playwright/06-settings-light.png)、[重新生成下方提示](../output/playwright/06-regenerate-tooltip.png)、[编辑键盘提示](../output/playwright/06-edit-keyboard-tooltip.png)、[保留中文草稿](../output/playwright/06-retained-draft.png)、[深色窄窗口说明](../output/playwright/06-settings-dark-narrow.png)。

## 审查与交付状态

以本轮开始的 `172203ac2fcb39aac3692d8aaf96e3900d9d65aa` 为基准，审查本轮工作区增量。两份旧规格与本轮修改前副本比较，排除已有改动；未将原有 `CONTEXT.md` 及其他未跟踪内容纳入本轮。

- **Standards（规范）**：硬性违规 0 项；判断性代码异味 0 项。确认复用既有测试接口、原有中文保留、问题状态未提前变更及生成产物无差异。
- **Spec（需求）**：0 项需修改发现。22 项标准及 14 项决定覆盖完整，验证边界如实标明；审查者独立重跑新增 18 项测试，全部通过。

完整审查记录见 `output/06-integrated-acceptance-review.md`。用户随后明确要求「提交代码，别再做审查，提交之后帮我安装插件」。据此按测试、说明分类提交，代码提交后更新事项 06，再安装到用户的 Desktop Profile；不再运行审查。本地 `.scratch` 规格与事项资料保留在现有事项目录，不混入代码提交。
