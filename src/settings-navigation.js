import { createElement } from 'react'
import { IconEditOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'

/**
 * The nav glyph, registered into the shell's `settings.section.icon` seat. The
 * shell renders this seat per row: a matching entry replaces its default gear
 * (the gear is what the row showed before this registration existed). The shell
 * passes `{ size, active }`; the active styling is owned by the shell's button.
 */
export function SettingsNavigationIcon({ size }) {
  return createElement(IconEditOutlineRegular, { size, 'aria-hidden': true })
}

/** The shell renders labels as React children; the glyph now comes from the icon seat, so this is text only. */
export function SettingsNavigationLabel({ text }) {
  return createElement('span', { className: 'dsh-resend-settings-nav-label' },
    createElement('span', { key: 'text' }, text))
}
