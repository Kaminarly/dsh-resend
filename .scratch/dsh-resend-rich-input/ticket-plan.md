# 临时输入框引用能力任务清单

日期：2026-10-12（Asia/Hong_Kong）。状态：用户已确认 6 项拆分；第 01 项隔离原型已完成，第 02 项可开始实施。

依据：[已确认规格](spec.md)、[宿主能力研究](research/host-capabilities.md)与[独立编辑路线](../../docs/adr/0002-independent-temporary-input.md)。原型已验证独立编辑器方案，正式插件功能尚未接入。

## 任务与依赖

| 编号 | 任务 | 阻塞任务 | 状态 |
| --- | --- | --- | --- |
| 01 | [验证独立编辑器的引用编辑与文本发送](issues/01-editor-feasibility.md) | 无 | resolved |
| 02 | [在临时输入框保留原引用并完成编辑重发](issues/02-restore-references-and-resend.md) | 01 | ready-for-agent |
| 03 | [用 @ 引用文件、文件夹与外部路径](issues/03-file-directory-external-references.md) | 02 | ready-for-agent |
| 04 | [用 / 选择并调用 skill](issues/04-skill-selection-and-invocation.md) | 03 | ready-for-agent |
| 05 | [引用预览与会话变化、失败恢复](issues/05-reference-preview-and-recovery.md) | 04 | ready-for-agent |
| 06 | [交付经过兼容和真实浏览器验收的 Bundle](issues/06-bundle-and-browser-acceptance.md) | 05 | ready-for-agent |

依次完成 01 → 02 → 03 → 04 → 05 → 06。第 01 项已完成，当前可直接开始第 02 项；其余虽已具备完整验收要求，仍须等待各自阻塞任务完成。

第 01 项验证规格要求的编辑器可行性。第 03 项合并文件、目录及外部路径并建立独立菜单；第 04 项复用该菜单调用 skill。第 05 项合并引用预览、会话变化和失败恢复。每项都有自己的完整行为验证，第 06 项交付经过整体浏览器及兼容验收的 Bundle。

## 规格覆盖

| 规格要求 | 主任务 |
| --- | --- |
| Q1 原引用、Q4 显示、退出后保留、目标有效性 | 01、02 |
| Q2 能力范围、Q3 @ 和 / 入口 | 03、04 |
| Q9 文件、目录、外部路径 | 03 |
| Q6 失效技能、Q8 查询失败降级、Q10 同名命令 | 03、04、05 |
| Q5 重发时文件、预检与精确补发 | 02、05 |
| Q7 独立界面和普通草稿隔离 | 01、02、03、05 |
| Q11 键盘、输入法、撤销、预览、失败保留 | 01、02、03、04、05 |
| 缓存失效、逆序响应、多编辑区与多窗口 | 03、04、05 |
| 构建、兼容、相关回归和真实浏览器验收 | 每项自身验证，06 汇总交付 |

## Comments

2026-10-12：用户要求将初稿的 8 项缩减至 6 项，随后明确确认「按这 6 项发布」。已按确认后的粒度和依赖写入独立任务，未修改父规格或其他既有任务。

2026-10-12：用户确认提交第 01 项，不再次审查。已完成隔离原型并按已有审查结果更新状态；其他任务保持原样。

## Decisions-so-far

2026-10-12：[第 01 项结论](issues/01-editor-feasibility.md#answer)：选择 ProseMirror 独立编辑器，文件标签与 skill 文字导出为宿主等价文本。6 项原型检查与 Edge、Chrome 各 10 组交互通过；两条审查线均为 0 项发现。后续实现与限制见[原型记录](prototype/README.md)。
