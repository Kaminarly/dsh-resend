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
 * The UI itself is mounted in a CHILD fiber waiting on `slots`, `locale` and
 * `uiConversation` rather than in this row's static `inject`. A service in the
 * static list that a host does not have leaves the row permanently PENDING, and
 * the renderer's boot audit treats that as a failed boot — the whole GUI would
 * not start because one optional feature was missing. Waiting in a child fiber is
 * what makes §7's own promise true: if a registration is unavailable, the
 * corresponding feature is absent and nothing else is affected.
 */
import { withPanelBoundary } from './panel-boundary.js'
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
import { SURFACE_SHADOW_DEFINITION, USER_ACTIONS_DEFINITION, USER_ACTIONS_KIND, UserActionsRow, userActionsSurface, userMessageText, InlineEditorSurface } from './user-actions.js'
import { hidePlanFor, hideRulesFor, hiddenKeysFor } from './hide-plan.js'
import { TYPERT_REMOTE } from './typert.client.js'

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
 * This page's preferences store, created once per materialization (ticket 08,
 * spec §7 registration 4). Every chat surface and the settings row read the same
 * store, so a toggle in the settings row is immediate everywhere; and because
 * the store exists even when the host has no `settings.general.item` slot, a
 * missing slot means the feature simply runs on the defaults — "槽位缺失时用默认
 * 值，没有设置界面" — nothing else is affected.
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
    'row.resendFailed': '历史已被重写，但重发失败：agent 没有接收这条提示词。',
    'row.sendAgain': '重新发送',
    'row.edit': '编辑',
    'row.editInput': '编辑消息',
    'row.send': '发送',
    'row.cancel': '取消',
    'row.editInComposer': '在输入框中编辑',
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
    'settings.heading': '消息编辑设置',
    'settings.hideReplacedMessages': '隐藏被替换的消息',
    'settings.inlineEditorBeneathMessage': '消息下方的内联编辑器',
    'settings.regenerateLastReply': '最后一条回复上的重新生成',
    'settings.on': '开',
    'settings.off': '关',
  },
  en: {
    'row.resendFailed': 'History was rewound, but the re-send failed: the agent did not take the prompt.',
    'row.sendAgain': 'Send again',
    'row.edit': 'Edit',
    'row.editInput': 'Edit message',
    'row.send': 'Send',
    'row.cancel': 'Cancel',
    'row.editInComposer': 'Edit in the composer',
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
    'settings.heading': 'Message editing settings',
    'settings.hideReplacedMessages': 'Hide replaced messages',
    'settings.inlineEditorBeneathMessage': 'Inline editor beneath the message',
    'settings.regenerateLastReply': 'Regenerate on the last reply',
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
  scope.effect(() => scope.locale.register(NS, DICTIONARIES), 'dsh-resend: dictionaries')

  // The live translator: every label this half projects re-reads the active
  // locale on each call, so a language switch needs no re-registration — the
  // registered option carries a THUNK, never a projected string (spec §10).
  const translate = scope.locale.bind(NS)

  const operations = createResendOperations(ctx.remote)
  scope.effect(() => () => operations.dispose(), 'dsh-resend: rewind-point records')

  // The rewind point and the user action row are both chat nodes because a
  // Definition says so; the keyed slot occupants below render their kinds.
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
    inputScope.slots.inject(slot, () =>
      inputScope.slots.register(
        {
          name: slot, key: USER_ACTIONS_KIND, locale: NS,
          inject: (sessionId) => ({
            readInput: () => {
              const input = inputScope.conversation?.input
              const sessionScope = inputScope.sessions?.scope?.(sessionId)
              if (typeof input?.for !== 'function' || sessionScope === undefined) return undefined
              return input.for(sessionScope)?.state?.getSnapshot?.()
            },
          }),
        },
        withPanelBoundary(userActionsSurface(operations, preferences), 'panel.error.userActions'),
      ),
    )
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

  // Registration 4 (ticket 08): the settings row, on the ROOT scope's own
  // settings slot. The owner passes no props at all, so the boundary factory
  // takes the live translator as its third argument — a prop-less surface must
  // still be able to draw its own failure row.
  const settingsSlot = 'settings.general.item'
  scope.slots.inject(settingsSlot, () =>
    scope.slots.register(
      { name: settingsSlot, id: SETTINGS_ROW_ID, order: 100, locale: NS, label: () => translate('settings.heading') },
      withPanelBoundary(settingsSurface(preferences, translate), 'panel.error.settings', translate),
    ),
  )
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
  ctx.inject(['slots', 'locale', 'uiConversation'], (scope) => mountSurfaces(scope, ctx))
}
