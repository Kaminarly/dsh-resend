import { createElement } from 'react'
import { IconEditOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'

/** The current settings shell renders labels as React children, but has no icon option. */
export function SettingsNavigationLabel({ text }) {
  return createElement('span', { className: 'dsh-resend-settings-nav-label' }, [
    createElement(IconEditOutlineRegular, { key: 'icon', size: 16, 'aria-hidden': true }),
    createElement('span', { key: 'text' }, text),
  ])
}
