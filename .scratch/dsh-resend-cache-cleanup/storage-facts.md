# 按会话清理的事实依据

## 会话发现与显示

宿主的 `sessionQuery.listSessions()` 可列出当前内存会话与已保存的冷会话；项目路径来自会话头，标题可通过独立或批量标题查询读取。`readSession()` 可直接读取完整日志，不需要先打开会话。

来源：`D:\DSH Desktop\resources\app\node_modules\@deepseek-ai\dsh-session-query\lib\index.js`，第 95、1070、1079、1113、1127 行。

## 旧文件的会话归属

现有清单和结果文件使用会话 ID 与回退点 ID 的摘要命名，文件内容不含会话 ID。可以从仍可读取的完整日志找出本插件的回退点，再重算文件名对应已有文件。不能只扫描当前界面可见消息。

会话已删除、日志损坏、会话库根目录不在当前查询服务范围内时，无法完整识别旧文件的归属。未被日志匹配不等于数据已无用途；用户在本次设计中明确选择将无法归属的回滚数据纳入无用残留，允许清理。该决定来自用户选择，而不是文件归属核查已经证明可以无损删除。

来源：`D:\Code\MJ-Project\dsh-resend-2\src\file-versions.js`，第 79、170、181、201 行；`D:\Code\MJ-Project\dsh-resend-2\src\typert.js`，第 178 行。

## 共享范围与空间统计

同一 DSH 数据目录中的本插件数据没有按 Profile 分隔。默认宿主会话目录也按 DSH 数据目录共用，但 Profile 可以配置不同的会话库根目录。

文件内容按内容摘要去重，因此不同会话可能共用内容对象。清除所选会话时，仍被保留清单引用的对象必须保留；所选会话预计释放空间须合并计算，不能简单累加每条会话的引用体积。

来源：`D:\Code\MJ-Project\dsh-resend-2\src\file-versions.js`，第 71 行；`D:\Code\MJ-Project\dsh-resend-2\src\file-snapshots.js`，第 28、50 行；`D:\DSH Desktop\resources\app\node_modules\@deepseek-ai\dsh-base\cordis.patch.yml`，第 130 行；`D:\DSH Desktop\resources\app\node_modules\@deepseek-ai\dsh-session-persistence-jsonl\lib\index.js`，第 2395 行。

## 执行期间的协调

现有会话操作锁及 Agent 查询只覆盖当前 Host，不能据此证明其他 Host 没有使用同一份数据。宿主会话锁只保护日志，不保护插件的清单、结果和内容对象。

实施清理功能时，需要为插件数据读写和清理建立适用的协调机制。删除数据后还须使旧预览计划失效，避免继续执行已预览的历史恢复；内存中的完成记录也不能重新写回已经清除的数据。

来源：`D:\Code\MJ-Project\dsh-resend-2\src\session-lock.js`，第 23 行；`D:\Code\MJ-Project\dsh-resend-2\src\file-versions.js`，第 74、83、175、214、274 行；`D:\DSH Desktop\resources\app\node_modules\@deepseek-ai\dsh-agent\lib\index.js`，第 594 行；`D:\DSH Desktop\resources\app\node_modules\@deepseek-ai\dsh-session-persistence-jsonl\lib\index.js`，第 614 行。

本次仅核实事实，未修改运行代码或清理真实数据。
