/**
 * dsh-resend — Client plugin (`exports["./client"]` → lib/client.bundle.js).
 *
 * The Client plugin is the half that owns every rendered element. It is built
 * into a classic script that self-registers one factory with the Web client
 * module loader — `window.__ModuleLoader__.load({ id: 'dsh-resend', factory })`.
 * The factory runs at materialization time and its `require` is the client
 * module table, so every bare specifier it asks for must be either a platform
 * seed word or another registered package; anything else throws a module-table
 * miss at load time. That is why a client-side dependency is declared in
 * `dsh.client.inject` (arrival order) rather than imported freely — and why the
 * descriptor table and its zod schemas are *bundled* rather than imported
 * (spec §6.6). `react` and the UI primitives are the two entries this half does
 * ask the table for: one React instance and the host's own atoms.
 *
 * Spec §6.5: this half mounts the same contribution the Host half registers, and
 * §7: every registration goes through `ctx.slots.inject`, so a renamed or removed
 * slot means the entry never mounts — an accepted normal state, not an error.
 *
 * The UI itself is mounted in a CHILD fiber waiting on `remote.resend`, `slots`,
 * `locale` and `uiConversation` rather than in this row's static `inject`. A service
 * in the static list that a host does not have leaves the row permanently PENDING, and
 * the renderer's boot audit treats that as a failed boot — the whole GUI would
 * not start because one optional feature was missing. Waiting in a child fiber is
 * what makes §7's own promise true: if a registration is unavailable, the
 * corresponding feature is absent and nothing else is affected.
 */
import { withPanelBoundary } from './panel-boundary.js'
import { createElement } from 'react'
import { SettingsNavigationLabel } from './settings-navigation.js'
import { UIStyles } from './ui.js'
import { CLEANUP_DICTIONARIES } from './storage-cleanup-ui.js'
import { CONTENT_DICTIONARIES } from './content-preview.js'
export { StorageCleanup } from './storage-cleanup-ui.js'
import { createPreferences } from './preferences.js'
import { createResendOperations } from './resend-operations.js'
import {
  ASSISTANT_ACTIONS_DEFINITION,
  ASSISTANT_ACTIONS_ID,
  ASSISTANT_ACTIONS_KIND,
  RegenerateControl,
  companionStates,
  isLastReply,
  promptRefusal,
  regenerateReason,
  regenerateSurface,
} from './regenerate.js'
import { SETTINGS_ROW_ID, SettingsRow, settingsSurface } from './settings-row.js'
import { HideRulesSurface } from './hide-rules.js'
import { PACKAGE } from './typert.js'
import { REWIND_ROW_DEFINITION, REWIND_ROW_KIND, RewindRow, rewindPointView, rewindRowSurface } from './rewind-row.js'
import { SURFACE_SHADOW_DEFINITION, USER_ACTIONS_DEFINITION, USER_ACTIONS_KIND, UserActionsRow, userActionsSurface, userMessageSurface, userMessageText, InlineEditorSurface } from './user-actions.js'
import { hidePlanFor, hideRulesFor, hiddenKeysFor } from './hide-plan.js'
import { TYPERT_REMOTE } from './typert.client.js'
export { FileRollbackPreview, ReplayPreflight } from './file-rollback-preview.js'
export { operationErrorText, OperationErrorNotice } from './operation-error.js'
export { SettingsNavigationLabel } from './settings-navigation.js'

/**
 * The contribution this half mounts, re-exported.
 *
 * The browser bundle inlines its own copy of the shared table, so the copy that
 * actually reaches `ctx.remote.$mount` is not the one `lib/typert.client.js`
 * exports. Publishing it is what lets `scripts/check-typert.mjs` read the copy
 * back out of the built bundle and prove the two are the same contract.
 */
export { TYPERT_REMOTE }

/**
 * The surfaces and seams the suite drives, re-exported from the bundle.
 *
 * A browser half has no Node-runnable host, so the only honest way to test it is
 * to evaluate and materialize the SHIPPED artifact and drive what it publishes —
 * importing `src/` directly would test a tree the browser never receives. These
 * are the seams that has to reach: the row (its content and its two states), the
 * Definition that decides which events become a row, the factory that binds the
 * page's operations into it, the shared boundary the registration went through,
 * and the operations object behind "Send again".
 */
export {
  createResendOperations,
  REWIND_ROW_DEFINITION,
  REWIND_ROW_KIND,
  RewindRow,
  rewindPointView,
  rewindRowSurface,
  USER_ACTIONS_DEFINITION,
  SURFACE_SHADOW_DEFINITION,
  USER_ACTIONS_KIND,
  UserActionsRow,
  userActionsSurface,
  userMessageSurface,
  userMessageText,
  ASSISTANT_ACTIONS_DEFINITION,
  ASSISTANT_ACTIONS_ID,
  ASSISTANT_ACTIONS_KIND,
  companionStates,
  isLastReply,
  promptRefusal,
  regenerateReason,
  RegenerateControl,
  regenerateSurface,
  hiddenKeysFor,
  hidePlanFor,
  hideRulesFor,
  withPanelBoundary,
  createPreferences,
  preferences,
  SettingsRow,
  settingsSurface,
  SETTINGS_ROW_ID,
  HideRulesSurface,
  InlineEditorSurface,
}

export const name = PACKAGE

/**
 * The client services this half reads.
 *
 * `remote` is the API Gateway's Client service: `$mount` is the only way a
 * plugin's client half publishes a Remote contribution, and without it there is
 * no operation to drive — so it is required, and the rest are waited for in the
 * child fiber below.
 */
export const inject = ['remote']

/** The dictionary namespace this plugin owns (spec §10). */
const NS = PACKAGE

/**
 * One store per page subscribes to the host's saved Profile configuration.
 * It stays alive across settings changes so mounted editors keep their drafts.
 */
const preferences = createPreferences()

/**
 * The two dictionaries (spec §10: Chinese and English, never both at once).
 *
 * The active host locale picks one through `ctx.locale`; the slot's own `t` does
 * the projection, so no localized string is stored in a registered option.
 */
const DICTIONARIES = {
  zh: {
    ...CLEANUP_DICTIONARIES['zh-CN'],
    ...CONTENT_DICTIONARIES['zh-CN'],
    'replay.editDescription': '先处理文件，再发送编辑后的消息',
    'replay.regenerateDescription': '先处理文件，再重新生成回复',
    'replay.awaiting': '等待选择 · 助手尚未生成',
    'replay.restoreCount': '还原 {count} 个文件并继续',
    'replay.keep': '保留当前文件并继续',
    'replay.keepRemaining': '保留剩余文件并继续',
    'replay.cancel': '取消重发',
    'replay.cancelHint': '取消重发会保留已经还原的文件，旧对话不会因此撤回。',
    'replay.restoreHint': '仅还原选中的文件；本次完成后，未选文件将保留，不能从此回滚点再次还原。',
    'replay.waitingHint': '助手尚未开始生成',
    'replay.sending': '正在发送消息…',
    'replay.stale': '文件或对话已变化。文件变化后可重新预览；对话变化后请取消重发，再重新操作。',
    'replay.expired': '预览已失效，请取消重发后重新操作。',
    'replay.failed': '重发未完成。请重新预览后继续，或取消重发。',
    'files.error.rewind-failed': '文件已还原，但旧对话未能撤回，消息尚未发送。可继续重发；取消重发会保留已还原的文件。',
    'files.title': '文件回滚',
    'files.description': '还原本次重写记录的文件改动',
    'files.previewShort': '预览回滚',
    'files.checking': '正在检查文件…',
    'files.restoring': '正在还原文件…',
    'files.canceling': '正在取消预览…',
    'files.awaiting': '检查文件 · 等待确认',
    'files.finished': '已结束',
    'files.viewResult': '查看结果',
    'files.readingStatus': '正在读取回滚状态…',
    'files.error.result-save-failed': '文件已还原，但结果未能保存。请检查存储后重新读取状态；本次运行中不会重复还原。',
    'files.needsPreview': '需要重新预览',
    'files.restoreCount': '{count} 个文件可还原',
    'files.restoredCount': '已还原 {count} 个文件',
    'files.selectedCount': '选中还原 {count} 个文件',
    'files.userKeptCount': '{count} 个文件用户选择保留',
    'files.unavailableCount': '{count} 个文件无法还原',
    'files.keepCount': '{count} 个文件将保留当前内容',
    'files.keptCount': '{count} 个文件未还原',
    'files.selectAll': '全选',
    'files.deselectAll': '取消全选',
    'files.selectFile': '选择还原 {path}',
    'files.list': '文件回滚清单',
    'files.root': '项目根目录',
    'files.unavailable': '无法还原',
    'files.kept': '未还原',
    'files.userKept': '用户选择保留',
    'files.restorable': '可还原',
    'files.confirmHint': '仅还原选中的文件；本次完成后，未选文件将保留，不能从此回滚点再次还原。',
    'files.recordedOnly': '仅处理本次记录的文件',
    'files.executeCount': '还原 {count} 个文件',
    'files.close': '收起',
    'files.closeResult': '收起结果',
    'files.retry': '重新预览',
    'files.preview': '预览文件回滚',
    'files.heading': '确认前不会改动文件。以下文件将按此计划处理：',
    'files.completed': '文件回滚已结束。以下是本次处理结果：',
    'files.empty': '这次重写没有记录到文件改动。',
    'files.restore': '将还原',
    'files.restored': '已还原',
    'files.refuse': '拒绝还原',
    'files.execute': '确认还原文件',
    'files.cancel': '取消',
    'files.reason.content-diverged': '文件已被其他操作修改',
    'files.reason.diverged-between-writes': '两次写入之间存在其他修改',
    'files.reason.prior-state-unavailable': '缺少可靠的原始内容',
    'files.reason.tool-result-unavailable': '缺少工具结果，无法确认文件修改情况',
    'files.reason.tool-result-ambiguous': '工具结果关联不明确，无法可靠还原',
    'files.reason.unsafe-path': '文件路径不在可还原范围内',
    'files.reason.unreadable-file': '无法读取文件',
    'files.reason.snapshot-unavailable': '原始内容记录无法读取',
    'files.reason.restore-failed': '文件还原失败',
    'files.reason.write-outcome-unavailable': '写入失败，无法确认文件变化的来源',
    'files.reason.execution-stopped': '本次还原已停止，未处理此文件',
    'files.reason.agent-busy': '回复已开始，停止还原以免覆盖正在写入的文件',
    'files.reason.already-restored': '此前已还原，保留当前文件',
    'files.reason.restore-outcome-unavailable': '此前还原中断，无法确认结果，保留当前文件',
    'files.error.progress-save-failed': '还原进度无法保存，已停止处理。以下列出本次已还原与未还原的文件。请检查存储后重新预览。',
    'files.error.storage-busy': '其他窗口正在处理回滚数据，请稍后重新预览。',
    'files.error.storage-recovery-required': '发现无法确认归属的旧锁，已停止操作。请退出宿主后检查插件存储中的协调文件。',
    'files.error.no-target-state': '这次重写没有可用的文件还原记录。',
    'files.error.invalid-selection': '还原选择无效，未处理任何文件。请调整勾选后重试。',
    'files.error.preview-stale': '预览后文件发生变化，未执行还原。请重新预览。',
    'files.error.plan-not-found': '预览已失效，请重新预览。',
    'files.error.agent-busy': '请先停止回复，再预览文件回滚。',
    'files.error.session-not-found': '当前会话无法读取。',
    'files.error.bad-request': '文件回滚请求无效，请重新预览。',
    'files.error.internal': '文件回滚未完成，请重新预览后检查文件。',
    'files.error.execution-stopped': '文件回滚已停止。以下列出已还原与未还原的文件，请检查后重新预览。',
    'row.resendFailed': '历史已被重写，但重发失败：agent 没有接收这条提示词。',
    'row.sendAgain': '重新发送',
    'row.edit': '编辑',
    'row.hostIncompatible': '当前 DSH 版本的消息操作区无法扩展，编辑入口暂不可用。',
    'row.editInput': '编辑消息',
    'row.send': '发送',
    'row.cancel': '取消',
    'row.editInComposer': '在正式输入框中编辑',
    'row.editInComposerHint': '宿主暂不支持在正式输入框中编辑重发，请使用临时输入框',
    'row.composerResendUnavailable': '宿主暂不支持在正式输入框中编辑重发，请使用临时输入框',
    'row.temporaryInput': '临时输入框',
    'row.fileGroup': '文件',
    'row.fileRoot': '工作区',
    'row.fileNavigation': '目录导航',
    'row.skillGroup': '技能',
    'row.skillUserOnly': '仅用户',
    'row.removeReference': '删除引用',
    'row.referenceLookupUnavailable': '暂时无法确认文件引用，已保留原文，可继续编辑重发。',
    'row.referencePreviewUnavailable': '当前宿主不支持打开此引用，正文和草稿已保留。',
    'row.referencePreviewFailed': '打开引用失败，正文和草稿已保留。',
    'row.fileCandidates': '文件与目录候选',
    'row.fileLoading': '正在查询文件与目录…',
    'row.fileReady': '选择仅引用路径；目录可选定或进入。',
    'row.fileEmpty': '没有匹配的文件或目录，可修改查询。',
    'row.fileUnavailable': '宿主未提供文件查询，关闭菜单后可按原文重发。',
    'row.fileFailed': '文件查询失败，原文已保留。可修改查询或关闭菜单后重发。',
    'row.fileParent': '返回上级',
    'row.fileClose': '关闭文件菜单',
    'row.fileSelect': '引用文件',
    'row.fileSelectDirectory': '引用目录',
    'row.fileDrill': '进入目录',
    'row.skillCandidates': '可供用户调用的技能',
    'row.skillLoading': '正在查询技能…',
    'row.skillReady': '选择技能后可继续编辑名称；发送时由宿主确认并加载。',
    'row.skillEmpty': '没有匹配的可用技能，关闭菜单后可按原文重发。',
    'row.skillUnavailable': '宿主未提供技能查询，无法确认可用性。已保留原文，可继续重发。',
    'row.skillFailed': '技能查询失败，无法确认可用性。已保留原文，可继续重发。',
    'row.skillClose': '关闭技能菜单',
    'row.skillSelect': '选择技能',
    'row.skillChecking': '正在确认文本中的技能…',
    'row.skillMissing': '以下技能当前不可供用户调用，可能已失效或改名。已保留原文，可继续重发：',
    'row.skillInvalid': '以下文字不符合技能调用格式，将作为普通原文发送；技能名称前后需有空白：',
    'row.hiddenCount': '已隐藏 {count} 条消息',
    'row.dismiss': '关闭',
    'row.hideFailed': '重写后的消息无法隐藏',
    'row.stopFirst': '请先停止回复',
    'row.noText': '这条消息没有可编辑的文本',
    'row.blankText': '消息不能为空',
    'row.composerBusy': '输入框正在忙碌，请稍后再试',
    'row.composerUnavailable': '当前输入框无法接收文本',
    'row.operationFailed': '编辑并重发失败，请重试',
    'row.regenerate': '重新生成',
    'row.notLast': '只能重新生成最后一条回复',
    'row.shadowed': '这条回复已被重写',
    'row.imageOnly': '这条提示词没有可重发的文本',
    'row.offSurface': '这条回复不在当前对话面上',
    'row.regenerateFailed': '重新生成失败，请重试',
    'panel.errorTitle': '这个界面无法显示',
    'panel.errorHint': '其余界面不受影响。可以重试，或刷新页面。',
    'panel.retry': '重试',
    'panel.error.rewindRow': '重写点无法显示',
    'panel.error.userActions': '用户消息操作无法显示',
    'panel.error.regenerate': '重生成功能无法显示',
    'panel.error.inlineEditor': '内联编辑器无法显示',
    'panel.error.hideRules': '隐藏规则无法显示',
    'panel.error.settings': '设置行无法显示',
    'panel.error.settingsNavigation': '设置导航图标无法显示',
    'settings.heading': 'DSH Resend 设置',
    'settings.nav': 'DSH Resend',
    'operation.dismiss': '关闭错误提示',
    'operation.error.bad-request': '请求内容无效，请重新打开编辑器后发送。',
    'operation.error.session-not-found': '当前会话无法读取，请重新打开会话。',
    'operation.error.agent-unavailable': '当前会话的智能体不可用，请重新打开会话后重试。',
    'operation.error.agent-busy': '回复正在进行，请先停止回复，再重试。',
    'operation.error.message-not-found': '找不到目标消息，请刷新会话后重试。',
    'operation.error.message-pending': '目标消息尚未完整加载，请等待加载完成后重试。',
    'operation.error.target-shadowed': '这条消息已被后续编辑替换，请选择当前显示的消息。',
    'operation.error.not-user-message': '目标不是可编辑的用户消息，请重新选择。',
    'operation.error.not-last-reply': '只能重新生成最后一条回复，请选择最后一条回复。',
    'operation.error.not-last-user-message': '只能编辑重发最后一条用户消息，请选择最后一条用户消息。',
    'row.notLastUser': '只能编辑重发最后一条用户消息',
    'operation.error.not-assistant-message': '目标不是可重新生成的助手回复，请重新选择。',
    'row.conversationUnavailable': '暂时无法确认当前有效对话，请重试',
    'operation.error.blank-text': '消息内容不能为空，请输入内容后发送。',
    'operation.error.no-text': '这条消息没有可重发的文字内容，请在输入框中重新发送。',
    'operation.error.internal': 'DSH 处理重发时发生错误，请查看宿主诊断日志后重试。',
    'operation.error.connection': '与 DSH 的通信未完成，请确认应用仍在运行，然后重试。',
    'operation.error.cancelled': '请求已取消，请重试。',
    'operation.error.result-invalid': 'DSH 返回的结果无法识别，请更新插件或检查版本兼容性。',
    'operation.error.unexpected': '插件处理请求时发生错误，请重新打开会话并检查诊断日志。',
    'settings.inlineEditorBeneathMessage': '消息下方的内联编辑器',
    'settings.inlineEditorFallbackDescription': '当前宿主暂不支持正式输入框编辑重发。此设置关闭时仍使用临时输入框。',
    'settings.regenerateLastReply': '显示重新生成按钮',
    'settings.restrictRegenerateToLastReply': '只允许重新生成最后一条助手回复',
    'settings.restrictEditToLastUserMessage': '只允许编辑重发最后一条用户消息',
    'settings.editRangeDescription': '开启后，仅可编辑重发最后一条用户消息；关闭后，则允许编辑重发较早的用户消息。操作将从所选消息重新续接，并发送修改后的内容，其后的对话将退出当前上下文。',
    'settings.regenerateRangeDescription': '开启后，仅可重新生成最后一条助手回复；关闭后，则允许重新生成较早的助手回复。操作将从所选回复对应的问题重新续接，其后的对话将退出当前上下文。',
    'settings.loading': '正在读取设置…',
    'settings.saving': '正在保存…',
    'settings.read-error': '设置读取失败，请重试',
    'settings.save-error': '设置保存失败，请重试',
    'settings.retry': '重试',
    'settings.on': '开',
    'settings.off': '关',
  },
  en: {
    'replay.editDescription': 'Review files before sending the edited message',
    'replay.regenerateDescription': 'Review files before regenerating the reply',
    'replay.awaiting': 'Waiting for your choice · Assistant has not started',
    'replay.restoreCount': 'Restore {count} files and continue',
    'replay.keep': 'Keep current files and continue',
    'replay.keepRemaining': 'Keep remaining files and continue',
    'replay.cancel': 'Cancel replay',
    'replay.cancelHint': 'Canceling keeps the restored files and leaves the old conversation in place.',
    'replay.restoreHint': 'Only the selected files are restored. After this run, unselected files are kept and cannot be restored from this rewind point again.',
    'replay.waitingHint': 'The assistant has not started generating',
    'replay.sending': 'Sending the message…',
    'replay.stale': 'Files or conversation changed. Refresh the preview for file changes; cancel and start again for conversation changes.',
    'replay.expired': 'The preview expired. Cancel replay and start again.',
    'replay.failed': 'Replay did not finish. Refresh the preview to continue, or cancel replay.',
    'files.error.rewind-failed': 'Files were restored, but the conversation could not be rewound and the message was not sent. Retry to continue; canceling keeps the restored files.',
    ...CLEANUP_DICTIONARIES.en,
    ...CONTENT_DICTIONARIES.en,
    'files.title': 'File rollback',
    'files.description': 'Restore file changes recorded for this rewind',
    'files.previewShort': 'Preview rollback',
    'files.checking': 'Checking files…',
    'files.restoring': 'Restoring files…',
    'files.canceling': 'Canceling preview…',
    'files.awaiting': 'Check files · Awaiting confirmation',
    'files.finished': 'Finished',
    'files.viewResult': 'View results',
    'files.readingStatus': 'Reading rollback status…',
    'files.error.result-save-failed': 'Files were restored, but the result could not be saved. Check storage and read the status again. This run will not restore them twice.',
    'files.needsPreview': 'Preview again',
    'files.restoreCount': '{count} files can be restored',
    'files.restoredCount': 'Restored {count} files',
    'files.selectedCount': 'Restoring {count} selected files',
    'files.userKeptCount': '{count} files kept by your choice',
    'files.unavailableCount': '{count} files cannot be restored',
    'files.keepCount': '{count} files will keep their current contents',
    'files.keptCount': '{count} files were not restored',
    'files.selectAll': 'Select all',
    'files.deselectAll': 'Deselect all',
    'files.selectFile': 'Select {path} for restore',
    'files.list': 'File rollback list',
    'files.root': 'Project root',
    'files.unavailable': 'Cannot restore',
    'files.kept': 'Not restored',
    'files.userKept': 'Kept by choice',
    'files.restorable': 'Restorable',
    'files.confirmHint': 'Only the selected files are restored. After this run, unselected files are kept and cannot be restored from this rewind point again.',
    'files.recordedOnly': 'Only files recorded for this rewind',
    'files.executeCount': 'Restore {count} files',
    'files.close': 'Collapse',
    'files.closeResult': 'Collapse results',
    'files.retry': 'Preview again',
    'files.preview': 'Preview file rollback',
    'files.heading': 'Files stay unchanged until confirmation. This plan will process:',
    'files.completed': 'File rollback finished. Results:',
    'files.empty': 'No file changes were recorded for this rewind.',
    'files.restore': 'Will restore',
    'files.restored': 'Restored',
    'files.refuse': 'Refused',
    'files.execute': 'Confirm file restore',
    'files.cancel': 'Cancel',
    'files.reason.content-diverged': 'The file was changed by another operation',
    'files.reason.diverged-between-writes': 'Other changes occurred between writes',
    'files.reason.prior-state-unavailable': 'Reliable prior contents are unavailable',
    'files.reason.tool-result-unavailable': 'Tool result is missing; file changes cannot be verified',
    'files.reason.tool-result-ambiguous': 'Tool result association is ambiguous; safe restoration is unavailable',
    'files.reason.unsafe-path': 'The path is outside the restorable scope',
    'files.reason.unreadable-file': 'The file cannot be read',
    'files.reason.snapshot-unavailable': 'Stored contents cannot be read',
    'files.reason.restore-failed': 'The file could not be restored',
    'files.reason.write-outcome-unavailable': 'The write failed; the source of file changes cannot be verified',
    'files.reason.execution-stopped': 'Rollback stopped before processing this file',
    'files.reason.agent-busy': 'A reply started; restoration stopped to protect ongoing writes',
    'files.reason.already-restored': 'Previously restored; the current file is preserved',
    'files.reason.restore-outcome-unavailable': 'A previous restore was interrupted; its result is uncertain and the current file is preserved',
    'files.error.progress-save-failed': 'Restore progress could not be saved, so processing stopped. Restored and unprocessed files are listed below. Check storage and preview again.',
    'files.error.storage-busy': 'Another window is processing rollback data. Preview again shortly.',
    'files.error.storage-recovery-required': 'An old lock has no verifiable owner, so the operation stopped. Exit the host and inspect the coordination files in plugin storage.',
    'files.error.no-target-state': 'No file restore record is available for this rewind.',
    'files.error.invalid-selection': 'Invalid restore selection; nothing was processed. Adjust the selection and try again.',
    'files.error.preview-stale': 'Files changed after the preview. Nothing was restored. Preview again.',
    'files.error.plan-not-found': 'The preview expired. Preview again.',
    'files.error.agent-busy': 'Stop the reply before previewing file rollback.',
    'files.error.session-not-found': 'The conversation cannot be read.',
    'files.error.bad-request': 'Invalid rollback request. Preview again.',
    'files.error.internal': 'File rollback did not finish. Preview again and inspect the files.',
    'files.error.execution-stopped': 'Rollback stopped. Restored and refused files are listed below. Inspect them and preview again.',
    'row.resendFailed': 'History was rewound, but the re-send failed: the agent did not take the prompt.',
    'row.sendAgain': 'Send again',
    'row.edit': 'Edit',
    'row.hostIncompatible': 'This DSH version cannot extend user-message actions. Editing is unavailable.',
    'row.editInput': 'Edit message',
    'row.send': 'Send',
    'row.cancel': 'Cancel',
    'row.editInComposer': 'Edit in the composer',
    'row.editInComposerHint': 'The host cannot edit and resend from the composer yet; use the temporary input',
    'row.composerResendUnavailable': 'The host cannot edit and resend from the composer yet; use the temporary input',
    'row.temporaryInput': 'Temporary input',
    'row.fileGroup': 'Files',
    'row.fileRoot': 'Workspace',
    'row.fileNavigation': 'Folder navigation',
    'row.skillGroup': 'Skills',
    'row.skillUserOnly': 'user-only',
    'row.removeReference': 'Remove reference',
    'row.referenceLookupUnavailable': 'File references could not be verified. Original text is retained and can still be edited and resent.',
    'row.referencePreviewUnavailable': 'This host cannot open the reference. The text and draft are retained.',
    'row.referencePreviewFailed': 'Opening the reference failed. The text and draft are retained.',
    'row.fileCandidates': 'File and directory candidates',
    'row.fileLoading': 'Searching files and directories…',
    'row.fileReady': 'References contain paths only. Select a directory or browse inside it.',
    'row.fileEmpty': 'No matching files or directories. Edit the query to search again.',
    'row.fileUnavailable': 'The host does not provide file search. Close this menu to resend the original text.',
    'row.fileFailed': 'File search failed. Original text is retained. Edit the query or close this menu to resend.',
    'row.fileParent': 'Parent directory',
    'row.fileClose': 'Close file menu',
    'row.fileSelect': 'Reference file',
    'row.fileSelectDirectory': 'Reference directory',
    'row.fileDrill': 'Browse directory',
    'row.skillCandidates': 'User-invocable skills',
    'row.skillLoading': 'Looking up skills…',
    'row.skillReady': 'The selected name stays editable. The host checks and loads it when sent.',
    'row.skillEmpty': 'No matching available skills. Close the menu to resend the original text.',
    'row.skillUnavailable': 'Skill lookup is unavailable; availability is unknown. The original text can still be resent.',
    'row.skillFailed': 'Skill lookup failed; availability is unknown. The original text can still be resent.',
    'row.skillClose': 'Close skill menu',
    'row.skillSelect': 'Select skill',
    'row.skillChecking': 'Checking skills in the text…',
    'row.skillMissing': 'These skills cannot currently be invoked by users and may have been removed or renamed. The original text can still be resent:',
    'row.skillInvalid': 'These tokens will be sent as plain text. Skill names require whitespace boundaries:',
    'row.hiddenCount': '{count} messages hidden',
    'row.dismiss': 'Dismiss',
    'row.hideFailed': 'The rewound messages could not be hidden',
    'row.stopFirst': 'Stop the reply first',
    'row.noText': 'This message has no editable text',
    'row.blankText': 'The message cannot be blank',
    'row.composerBusy': 'The composer is busy; try again later',
    'row.composerUnavailable': 'The composer cannot accept text',
    'row.operationFailed': 'Edit and resend failed; try again',
    'row.regenerate': 'Regenerate',
    'row.notLast': 'Only the last reply can be regenerated',
    'row.shadowed': 'This reply was already rewound',
    'row.imageOnly': 'The prompt has no text to re-send',
    'row.offSurface': 'This reply is off the current surface',
    'row.regenerateFailed': 'Regenerate failed; try again',
    'panel.errorTitle': 'This panel could not be displayed',
    'panel.errorHint': 'The rest of the UI is unaffected. Retry, or reload the page.',
    'panel.retry': 'Retry',
    'panel.error.rewindRow': 'This rewind point could not be displayed',
    'panel.error.userActions': 'User message actions could not be displayed',
    'panel.error.regenerate': 'The regenerate control could not be displayed',
    'panel.error.inlineEditor': 'The inline editor could not be displayed',
    'panel.error.hideRules': 'The hide rules could not be displayed',
    'panel.error.settings': 'The settings row could not be displayed',
    'panel.error.settingsNavigation': 'The settings navigation icon could not be displayed',
    'settings.heading': 'DSH Resend settings',
    'settings.nav': 'DSH Resend',
    'operation.dismiss': 'Dismiss error',
    'operation.error.bad-request': 'Invalid request. Reopen the editor and send again.',
    'operation.error.session-not-found': 'The conversation cannot be read. Reopen it.',
    'operation.error.agent-unavailable': 'The agent is unavailable. Reopen the conversation and retry.',
    'operation.error.agent-busy': 'A reply is running. Stop it before retrying.',
    'operation.error.message-not-found': 'The target message was not found. Refresh the conversation.',
    'operation.error.message-pending': 'The target message is still loading. Wait and retry.',
    'operation.error.target-shadowed': 'This message was replaced. Select the current message.',
    'operation.error.not-user-message': 'The target is not an editable user message. Select another message.',
    'operation.error.not-last-reply': 'Only the last reply can be regenerated. Select it.',
    'operation.error.not-last-user-message': 'Only the last user message can be edited and resent. Select the last user message.',
    'row.notLastUser': 'Only the last user message can be edited and resent',
    'operation.error.not-assistant-message': 'The target is not an assistant reply that can be regenerated. Select another reply.',
    'row.conversationUnavailable': 'Could not confirm the effective conversation. Please retry.',
    'operation.error.blank-text': 'Enter some text before sending.',
    'operation.error.no-text': 'This message has no text to resend. Send it from the composer.',
    'operation.error.internal': 'DSH failed while processing the request. Check the host diagnostics and retry.',
    'operation.error.connection': 'Communication with DSH did not finish. Check that the app is running and retry.',
    'operation.error.cancelled': 'The request was cancelled. Retry.',
    'operation.error.result-invalid': 'The DSH result is not recognized. Update the plugin or check compatibility.',
    'operation.error.unexpected': 'The plugin failed while processing the request. Reopen the conversation and check diagnostics.',
    'settings.inlineEditorBeneathMessage': 'Inline editor beneath the message',
    'settings.inlineEditorFallbackDescription': 'The host does not support editing and resending from the composer yet. When this setting is off, editing still uses the temporary input.',
    'settings.regenerateLastReply': 'Show regenerate buttons',
    'settings.restrictRegenerateToLastReply': 'Only allow regenerating the last assistant reply',
    'settings.restrictEditToLastUserMessage': 'Only allow editing and resending the last user message',
    'settings.editRangeDescription': 'When enabled, only the last user message can be edited and resent; when disabled, earlier user messages can also be edited and resent. The conversation resumes from the selected message and sends the modified text; subsequent conversation leaves the current context.',
    'settings.regenerateRangeDescription': 'When enabled, only the last assistant reply can be regenerated; when disabled, earlier assistant replies can also be regenerated. The conversation resumes from the question for the selected reply. Later conversation leaves the current context.',
    'settings.loading': 'Reading settings…',
    'settings.saving': 'Saving…',
    'settings.read-error': 'Could not read settings. Please retry.',
    'settings.save-error': 'Could not save settings. Please retry.',
    'settings.retry': 'Retry',
    'settings.on': 'On',
    'settings.off': 'Off',
  },
}

/** This page's one mount state, replaced (never mutated in place) as the attempt settles. */
let mount = { status: 'pending', error: undefined }

/**
 * The outcome of this page's one mount attempt.
 *
 * A feature switch, not a diagnostic: the UI registrations read it and must not
 * mount half a feature when the Remote contribution did not. The failure is also
 * logged loudly at the call site.
 *
 * One page load materializes this factory once, so this is that page's answer.
 * If a later activation is refused while an earlier mount is still live, the
 * switch still reads `failed` while calls keep working: spec §6.5 asks for the
 * feature to be disabled on a refused mount rather than for a half-mounted
 * namespace, and this half cannot inspect the namespaces an earlier activation
 * installed.
 * @returns `{ status, error }` for the current page.
 */
export function remoteMountState() {
  return Object.freeze({ ...mount })
}

/**
 * The conversation-definition registrar, resolved defensively.
 *
 * The current host keeps the registry INSIDE the service
 * (`uiConversation.events.register`); older generations exposed `register` on the
 * service itself. Both are accepted, and `undefined` means neither is there —
 * which the caller must report, because a silently unregistered Definition looks
 * exactly like a feature that was never built (the reference implementation's
 * two-week incident).
 * @param service - `ctx.uiConversation`.
 * @returns `(definition) => dispose`, or `undefined` when the service has no
 *   registration entry point this build understands.
 */
function conversationRegistrar(service) {
  // Each read below takes `register` off the member in the same expression: that
  // method is the only thing a caller may take from it, and it is what keeps this
  // registration distinct from a read of the host's removed legacy event-view
  // array (`scripts/check-host-contract.mjs` holds exactly that distinction).
  if (typeof service?.events?.register === 'function') return (definition) => service.events.register(definition)
  if (typeof service?.register === 'function') return (definition) => service.register(definition)
  return undefined
}

/**
 * Mount every surface this half owns into a context that has the slot-side and
 * locale-side services (spec §7 registration 2, §10).
 *
 * Ticket 05 owns registration 2, the row at a rewind point. Ticket 06 adds
 * registration 1 (the action row beneath a user message), the hide rules and the
 * count notice. Ticket 07 adds registration 3, the regenerate control in the
 * assistant-actions list slot, and its invisible companion Definition; ticket 08
 * wraps the remaining surfaces and completes the localization.
 * @param scope - the child context carrying `slots`, `locale` and `uiConversation`.
 * @param ctx - this row's own context, for the Remote service.
 */
function mountSurfaces(scope, ctx) {
  scope.inject(['configForms'], (settingsScope) => {
    settingsScope.effect(() => preferences.connect(settingsScope.configForms), 'dsh-resend: saved preferences')
  })
  scope.effect(() => scope.locale.register(NS, DICTIONARIES), 'dsh-resend: dictionaries')

  // The live translator: every label this half projects re-reads the active
  // locale on each call, so a language switch needs no re-registration — the
  // registered option carries a THUNK, never a projected string (spec §10).
  const translate = scope.locale.bind(NS)

  // Each optional namespace must be read from a context declaring that service.
  // A missing query service must not hold up the editor or Desktop's boot audit.
  const references = {}
  const operations = createResendOperations(scope.remote, references)
  scope.effect(() => () => operations.dispose(), 'dsh-resend: rewind-point records')
  for (const name of ['fileReferences', 'skills']) {
    scope.inject(['remote.' + name], queryScope => queryScope.effect(() => {
      references[name] = queryScope.remote[name]
      operations.invalidateReferenceQueries()
      return () => {
        delete references[name]
        operations.invalidateReferenceQueries()
      }
    }, 'dsh-resend: ' + name + ' queries'))
  }
  scope.on('connection/reset', () => operations.invalidateConversations())
  scope.remote.$on?.('agent-preset/selected', sessionId => operations.invalidateReferenceQueries(sessionId))

  // Rewind points and hidden companions are Definitions; visible user actions
  // are attached to the original host renderer below.
  const register = conversationRegistrar(scope.uiConversation)
  const slot = 'conversation.chat.node'
  if (register === undefined) {
    ctx.root.logger?.('dsh-resend')?.warn(
      'dsh-resend: uiConversation exposes no definition registry this build understands; the rewind-point row will not mount',
    )
  } else {
    for (const [definition, label] of [
      [REWIND_ROW_DEFINITION, 'dsh-resend: rewind-point definition'],
      [USER_ACTIONS_DEFINITION, 'dsh-resend: user-actions definition'],
      [SURFACE_SHADOW_DEFINITION, 'dsh-resend: surface eligibility definition'],
      [ASSISTANT_ACTIONS_DEFINITION, 'dsh-resend: regenerate-companion definition'],
    ]) {
      const dispose = register(definition)
      scope.effect(
        () => () => {
          try {
            dispose?.()
          } catch {
            // A definition disposer is idempotent by contract; a host that
            // throws here must not take the rest of teardown with it.
          }
        },
        label,
      )
    }
  }

  scope.inject(['conversation', 'sessions'], (inputScope) => {
    inputScope.slots.inject(slot, () => inputScope.effect(() => {
      let original
      let dispose
      let reconciling = false
      const reconcile = () => {
        if (reconciling) return
        const entry = inputScope.slots.entries(slot).find((entry) => entry.options.key === 'user' && entry.locale === 'chat')
        if (entry === original) return
        reconciling = true
        try {
          original = entry
          dispose?.()
          dispose = undefined
          if (entry === undefined) return
          const hostTranslate = inputScope.locale.bind(entry.locale)
          const fallback = (props) => createElement(entry.component, { ...props, t: hostTranslate })
          const Surface = userMessageSurface(entry.component, operations, preferences, hostTranslate)
          dispose = inputScope.slots.register({
            name: slot, key: 'user', priority: (entry.options.priority ?? 0) - 1, locale: NS,
            inject: (sessionId) => ({
              readInput: () => {
                const input = inputScope.conversation?.input
                const sessionScope = inputScope.sessions?.scope?.(sessionId)
                if (typeof input?.for !== 'function' || sessionScope === undefined) return undefined
                return input.for(sessionScope)?.state?.getSnapshot?.()
              },
            }),
          }, withPanelBoundary(Surface, 'panel.error.userActions', undefined, fallback))
        } finally { reconciling = false }
      }
      const unsubscribe = inputScope.slots.subscribe(slot, reconcile)
      reconcile()
      return () => { unsubscribe(); dispose?.() }
    }, 'dsh-resend: native user-message actions'))
  })

  // §7.4: the row goes through the shared boundary like every other surface —
  // no registration site passes a bare component — and the factory below binds
  // this page's operations into it, because the slot's standard props do not
  // carry plugin state.
  scope.slots.inject(slot, () =>
    scope.slots.register(
      { name: slot, key: REWIND_ROW_KIND, locale: NS },
      withPanelBoundary(rewindRowSurface(operations, preferences), 'panel.error.rewindRow'),
    ),
  )

  // Registration 3 (ticket 07): the regenerate control, one entry in the shipped
  // assistant-actions LIST slot. Unlike the keyed slots above, a list entry is
  // identified by `id` (never a shipped entry's) and receives `{ messageId }` —
  // the reply's durable id — alongside the standard props. The companion
  // Definition the assembler builds gives the control its verdict inputs; the
  // slot's owner renders it beside every assistant reply it knows.
  const actionsSlot = 'conversation.chat.assistant-actions'
  scope.slots.inject(actionsSlot, () =>
    scope.slots.register(
      { name: actionsSlot, id: ASSISTANT_ACTIONS_ID, order: 100, locale: NS, label: () => translate('row.regenerate') },
      withPanelBoundary(regenerateSurface(operations, preferences), 'panel.error.regenerate'),
    ),
  )

  // Registration 4: a dedicated Message editing settings page. Its controls
  // bind their own store and translator instead of reading navigation props.
  const settingsSlot = 'settings.section'
  scope.slots.inject(settingsSlot, () =>
    scope.slots.register(
      { name: settingsSlot, id: SETTINGS_ROW_ID, order: 100, locale: NS, label: () => createElement(SettingsNavigationLabel, { text: translate('settings.nav') }) },
      withPanelBoundary(settingsSurface(preferences, translate, operations), 'panel.error.settings', translate),
    ),
  )

  // A style-only additive entry keeps the nav glyph correct even while another
  // section is selected. The host keeps ownership of its settings shell/slots.
  scope.slots.inject('settings.action', () => scope.slots.register(
    { name: 'settings.action', id: SETTINGS_ROW_ID + '-navigation-style', order: 100, locale: NS },
    withPanelBoundary(UIStyles, 'panel.error.settingsNavigation', translate),
  ))
}

export async function apply(ctx) {
  try {
    await ctx.remote.$mount(TYPERT_REMOTE)
  } catch (error) {
    // The refusal has to be contained, never turned into a silent no-op: a
    // half-mounted namespace is worse than a loud failure, and a second attempt
    // must not damage the mount that already exists. Nothing is left half-mounted
    // by the time this runs either way — the Gateway validates a contribution
    // before installing anything, and unwinds whatever it did install when a later
    // step fails. So: record it, log it, disable the feature.
    mount = { status: 'failed', error }
    ctx.root.logger?.('dsh-resend')?.warn(
      `dsh-resend: the Remote contribution did not mount (${error?.message ?? error}); edit-and-resend and regenerate stay disabled for this page`,
    )
    return
  }
  mount = { status: 'mounted', error: undefined }
  // $mount creates the namespace. Declare it only after mounting, and retain
  // this injected scope's Remote so later UI calls carry the same dependency.
  ctx.inject(['remote.resend', 'slots', 'locale', 'uiConversation'], (scope) => mountSurfaces(scope, ctx))
}
