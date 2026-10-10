/**
 * The settings row: registration point 4 on `settings.general.item` (ticket 08,
 * spec §7).
 *
 * The owner of this slot passes NO props at all — `children?: never` in the
 * catalog, and nothing projects a `label` here either — so the row is a pure
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
import { PREFERENCE_FIELDS, usePreferences } from './preferences.js'

/** One row per preference field, keyed by the field's i18n label. */
const SETTING_KEYS = Object.freeze({
  inlineEditorBeneathMessage: 'settings.inlineEditorBeneathMessage',
  regenerateLastReply: 'settings.regenerateLastReply',
})

/** The id this row registers under — brand-new, never a shipped one. */
export const SETTINGS_ROW_ID = 'dsh-resend-preferences'

/** The row, as a component: store plus translator in, one DOM tree out. */
export function SettingsRow({ preferences, t }) {
  const snapshot = usePreferences(preferences)
  return createElement('div', { className: 'dsh-resend-settings' }, [
    createElement('div', { key: 'heading', className: 'dsh-resend-settings-heading' }, t('settings.heading')),
    snapshot.status === 'ready' ? null : createElement('div', {
      key: 'status', role: snapshot.status.endsWith('error') ? 'alert' : 'status',
    }, [t('settings.' + snapshot.status), snapshot.status.endsWith('error') ? createElement('button', {
      key: 'retry', type: 'button', onClick: () => { void preferences.retry() },
    }, t('settings.retry')) : null]),
    ...PREFERENCE_FIELDS.map((field) =>
      createElement('div', { key: field, className: 'dsh-resend-settings-row', 'data-field': field }, [
        createElement('span', { key: 'label', className: 'dsh-resend-settings-label' }, t(SETTING_KEYS[field])),
        createElement('button', {
          key: 'toggle',
          type: 'button',
          className: 'dsh-resend-chip dsh-resend-settings-toggle',
          'data-field': field,
          'aria-pressed': snapshot[field],
          disabled: !snapshot.ready || snapshot.status === 'saving',
          onClick: () => { void preferences.set(field, !snapshot[field]) },
        }, snapshot[field] ? t('settings.on') : t('settings.off')),
      ])),
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
export function settingsSurface(preferences, translate) {
  return function BoundSettings(props) {
    return createElement(SettingsRow, { preferences, t: props.t ?? translate })
  }
}
