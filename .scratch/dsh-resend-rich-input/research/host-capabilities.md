# 临时输入框文件引用与 skill 移植研究

日期：2026-10-12（Asia/Hong_Kong）。范围：工作区代码和本机当前安装的 DSH 包；不改宿主、不安装插件、不操作真实会话。

## 结论

可采用「独立临时编辑器 + 宿主查询接口 + 现有文本重发链路」。文件标签发送时是 `@路径` 文本，skill 选择发送时是 `/名称` 文本。无需为这两项能力新增结构化引用 RPC，也无需获得正式 Composer 的发送拦截入口。

这个结论确认了协议可行性，尚未证明待实现的标签、菜单、预览及真实窗口操作已经可用。

## 当前宿主证据

下表路径相对于 `D:/DSH Desktop/resources/app/node_modules/@deepseek-ai/`。本次检查的相关包版本为 `0.2.0-rc.2`；结论针对本机安装产物，不外推到其他版本。

| 事实 | 证据 |
| --- | --- |
| 文件选择产生 `source/ref/label/appearance/clipboardText` 标签；codec 只返回 `ref` | `dsh-client-ui-reference/lib/client.js:198`、`:228` |
| 正式 Composer 把标签逐项替换成 codec 输出后发送文本 | `dsh-client-ui-conversation/lib/client.js:13944` |
| 文件引用传路径，不自动携带内容；模型按需要调用文件工具读取 | `dsh-file-reference-local/lib/index.js:7`、`:342`；`dsh-file-reference/lib/index.js:54` |
| skill 菜单插入 `/name ` | `dsh-client-ui-skill/lib/client.js:424` |
| `agent/pre-step` 从用户文字识别技能，按目标 Agent 的 cwd 和 scope 加载正文 | `dsh-tool-skill/lib/index.js:168`、`:373`、`:381` |
| 文件接口为 `remote.fileReferences.list(sessionId, query, signal)`；成功值为 `{path, kind}` 数组 | `dsh-api-session-controller/lib/typert.remote-client.js:14`、`:893` |
| 技能接口为 `remote.skills.list({sessionId}, signal)`；成功值为 `{skills:[...]}` | 同文件 `:874`、`:1380` |
| skill 列表按会话预设和可供用户调用的规则筛选 | `dsh-api-session-controller/lib/index.js:2276` |
| Trigger controller 按会话绑定共享，接受候选会向正式 shell 发插入事件 | `dsh-client-ui-input-trigger/lib/client.js:711`、`:929`；`dsh-client-ui-conversation/lib/client.js:14263` |
| 注册来源没有公共读取接口；菜单组件和原生编辑器没有公开独立输入区工厂 | `dsh-client-ui-input-trigger/lib/client.js:884`、`:1261`、`:1291`；`dsh-client-ui-conversation/lib/client.js:18462` |
| 同一 Session 不支持同时挂载多个原生可编辑 root | `dsh-client-ui-conversation/README.zh.md:57` |
| 正式框会裁决行首 slash 命令，临时文本重发不经过此裁决 | `dsh-client-ui-commands/lib/client.js:975` |

## 原消息保留

历史用户消息保存发送后的文本，不保存原草稿的富文本编辑节点。`src/user-actions.js:16` 提取文字块，本来就会保留其中的 `@路径` 和 `/名称`。移植需要把这些文字还原为临时编辑器的标签和可编辑 skill 文字，并在再次发送时保留原始路径及顺序。

恢复应解析带引号路径、中文、相对路径、绝对路径和目录标记，不能根据标签显示名重建路径。相同文件名必须仍指向各自完整路径。无法可靠识别的内容保留原文，不能猜测补写。会话引用、上传文件与图片不属于本次路径引用范围。

实际加载过的 skill 另有 `skill-invocation` 消息。Chat row 的 `skillNames` 来自这些记录，不能据此保证该技能今天仍可用。原引用文本应保留，当前可用性应重新查询。

## 本仓库接入边界

| 边界 | 处理要求 |
| --- | --- |
| `src/user-actions.js` | 替换纯 textarea 为独立编辑器；保留原消息、操作范围、运行中禁用等判断 |
| `src/client.js` | 为每个临时编辑区绑定目标 Session 的查询与预览能力，避免调用正式 `inputActions` |
| 新编辑器状态模块 | 管理文字、文件标签、光标、撤销、菜单和查询取消；与普通草稿隔离 |
| 新候选查询模块 | 调用两个宿主接口，区分失败与空结果，按会话隔离缓存，丢弃过期响应 |
| `src/resend-operations.js:111` | 先完成标签到文本转换，再调用 `run`；预检和补发持有同一份最终文本 |
| `src/typert.js:82` | 保持现有严格 `text` 请求，不增加未经契约支持的字段 |
| `src/resend.js:123` | 保持 `source.kind: 'user'`，让宿主正常加载显式 skill |
| `src/resolve.js:56`、`src/resend.js:205`、`:268` | 继续用最终文本比较预检与补发摘要；标签显示名或最新编辑状态不参与补发 |

若以后增加上传附件或自定义引用 codec，需要另行设计完整内容协议，并同步摘要、预检、重试以及嵌套对象的深拷贝。当前浅拷贝不能作为复杂对象请求的可靠保存方式。

## 实现路线与限制

1. 先验证独立富文本编辑器：文件标签作为原子节点，skill 保持文字，支持历史文本恢复、复制粘贴、撤销和最终文本导出。不得借用正式 shell 的 editor 或发送入口。具体编辑器依赖应由隔离原型验证决定，不把宿主私有组件当公共组件导入。
2. 增加独立 `@`/`/` 菜单。复用宿主文件候选和 skill 列表，不自行扫描技能目录。文件、目录与外部路径以宿主可返回的候选为准，排除其他会话候选和 slash 命令。
3. 接入既有预检和重发。发送前导出固定文本；关闭、切换会话、切换预设、连接重置时取消查询。旧查询不能覆盖新文字、选区或消息目标。
4. 验证实际控件、宿主接收消息与失败补发，全部通过后再构建安装版。

带空格目录在宿主「继续下钻」时使用未闭合引号，如 `@"有 空格/`。临时框必须区分下钻中的搜索文字和最终选定标签；最终引用不应意外吞入后续正文。这一点需要专门的交互原型验证。

路径引用读取重发时的工作文件：预检选择还原后读还原内容，选择保留后读当前内容。新增引用不会自动把文件加入回滚清单。skill 也按调用时的注册结果加载，插件不缓存并强行注入旧技能正文。

已卸载或不可供用户调用的 skill 会被宿主跳过。按用户选择，临时框显示提示，但允许原文发送。搜索失败时不能声称「没有此技能」，也不能显示调用成功。

## 验证结果

运行 [probe-host.mjs](probe-host.mjs)：24 项通过。执行的是当前安装包的路径语法、文件来源选择与 codec、skill 来源选择及真实 `tool-skill.apply` 注册的加载钩子；skill 注册表使用代表性替身。另执行本仓库的 operations，确认编辑后的文件引用和 skill 文本在失败补发中原样保留；远端接收方使用替身。

覆盖普通路径、中文路径、含空格路径、外部绝对路径、目录、非法引号、邮箱不触发、下钻引号、多技能与去重、句中调用、路径与分数不触发、标点边界、失效技能、仅模型可调用技能、非用户来源不加载技能、同名文件路径区分及固定文本补发。未发送真实模型消息，未创建真实 Session。

本次没有实现编辑器，未验证菜单渲染、真实候选 RPC、预览或完整模型回复。实施验收见 [规格](../spec.md)。

## 对早期研究的修正

[旧 inputActions 研究](../../dsh-resend-plugin/research/inputactions-api.md)关于「setDraft 不能恢复原草稿 chip」的结论仍成立；但不能据此认定纯文本 `@路径` 和 `/name` 不具备引用或技能调用语义。当前安装包的实际序列化和技能加载均依赖这些文本。这次方案不需要把编辑任务转交正式 Composer。
