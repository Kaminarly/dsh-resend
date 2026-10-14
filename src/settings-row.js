/**
 * The Message editing page: registration point 4 on `settings.section` (ticket 08,
 * spec §7).
 *
 * The section renders from its own bound preferences and translator. Its
 * owner also passes a close action, which these preference controls do not need.
 * The page is a pure
 * function of two things it binds itself: the preferences store (the only
 * writer of those fields) and the live translator the registration factory
 * hands it. The boundary factory's third argument exists for exactly this: a
 * surface whose slot passes no `t` still has to be able to draw its own
 * failure row.
 *
 * Each toggle reads the saved Profile snapshot. During a write all switches
 * wait for acceptance; chat surfaces keep their previous saved behavior.
 */
import { createElement } from 'react'
import { Button, Switch } from '@deepseek-ai/dsh-client-ui-primitives'
import { UIStyles } from './ui.js'
import { PREFERENCE_FIELDS, usePreferences } from './preferences.js'
import { StorageCleanup } from './storage-cleanup-ui.js'

/** One row per preference field, keyed by the field's i18n label. */
const SETTING_KEYS = Object.freeze({
  showEditResendButton: 'settings.showEditResendButton',
  regenerateLastReply: 'settings.regenerateLastReply',
  restrictRegenerateToLastReply: 'settings.restrictRegenerateToLastReply',
  restrictEditToLastUserMessage: 'settings.restrictEditToLastUserMessage',
})
const DESCRIPTIONS = Object.freeze({
  restrictRegenerateToLastReply: 'settings.regenerateRangeDescription',
  restrictEditToLastUserMessage: 'settings.editRangeDescription',
})
const DEPENDENCIES = Object.freeze({
  restrictEditToLastUserMessage: 'showEditResendButton',
  restrictRegenerateToLastReply: 'regenerateLastReply',
})

/** The id this row registers under — brand-new, never a shipped one. */
export const SETTINGS_ROW_ID = 'dsh-resend-preferences'

/** The row, as a component: store plus translator in, one DOM tree out. */
export function SettingsRow({ preferences, t, operations }) {
  const snapshot = usePreferences(preferences)
  return createElement('div', { className: 'dsh-resend-settings' }, [
    createElement(UIStyles, { key: 'ui' }),
    createElement('div', { key: 'heading', className: 'dsh-resend-settings-heading' }, t('settings.heading')),
    snapshot.status === 'ready' ? null : createElement('div', {
      key: 'status', role: snapshot.status.endsWith('error') ? 'alert' : 'status',
    }, [t('settings.' + snapshot.status), snapshot.status.endsWith('error') ? createElement(Button, {
      key: 'retry', onClick: () => { void preferences.retry() },
    }, t('settings.retry')) : null]),
    ...PREFERENCE_FIELDS.map((field) => {
      const dependentDisabled = DEPENDENCIES[field] !== undefined && snapshot[DEPENDENCIES[field]] === false
      return createElement('div', { key: field, className: 'dsh-resend-settings-row', 'data-field': field,
        'data-dependent-disabled': dependentDisabled || undefined }, [
        createElement('div', { key: 'label', className: 'dsh-resend-settings-label' }, [
          createElement('span', { key: 'name' }, t(SETTING_KEYS[field])),
          DESCRIPTIONS[field] ? createElement('p', {
            key: 'description', className: 'dsh-resend-settings-description', id: 'dsh-resend-' + field + '-description',
          }, t(DESCRIPTIONS[field])) : null,
        ]),
        createElement(Switch, {
          key: 'toggle',
          className: 'dsh-resend-settings-toggle', label: t(SETTING_KEYS[field]),
          checked: snapshot[field], disabled: !snapshot.ready || snapshot.status === 'saving' || dependentDisabled,
          'aria-describedby': DESCRIPTIONS[field] ? 'dsh-resend-' + field + '-description' : undefined,
          onChange: (next) => { if (!dependentDisabled) void preferences.set(field, next) },
        }),
      ])
    }),
    operations ? createElement(StorageCleanup, { key: 'cleanup', operations, t }) : null,
  ])
}

/**
 * The bound surface: the factory closes over this page's store and its live
 * translator, so the row the slot renders with no props is still a live row.
 * The registration wraps it in the shared boundary with the same translator
 * as the third factory argument — the slot hands the component nothing.
 * @param preferences - the store the chat surfaces read.
 * @param translate - the live translator, re-read from the locale on every render.
 * @returns the component the registration wraps and passes.
 */
export function settingsSurface(preferences, translate, operations) {
  return function BoundSettings(props) {
    return createElement(SettingsRow, { preferences, t: props.t ?? translate, operations })
  }
}
