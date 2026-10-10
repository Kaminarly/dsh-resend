/** Host controls and theme tokens shared by every plugin surface. */
import { createElement } from 'react'
import { Button, Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'

export function IconAction({ label, icon: Icon, reason, disabled = false, ...props }) {
  const locked = disabled || reason !== undefined
  const button = createElement(Button, {
    ...props, type: 'button', size: 'sm', variant: 'ghost',
    className: 'dsh-resend-icon-action', 'aria-label': label,
    disabled: locked,
  }, createElement(Icon, { size: 16, 'aria-hidden': true }))
  // Disabled native buttons do not consistently receive pointer/focus events.
  return createElement(Tooltip, { label: reason ?? label, side: 'bottom', portal: true },
    createElement('span', { className: 'dsh-resend-disabled-action', tabIndex: locked ? 0 : undefined, 'aria-label': locked ? reason ?? label : undefined }, button))
}

export function UIStyles() {
  return createElement('style', { 'data-dsh-resend-ui': true }, CSS)
}

const CSS = `
.dsh-resend-icon-action{box-sizing:border-box!important;width:calc(28px + var(--dsh-content-font-delta,0px));height:calc(28px + var(--dsh-content-font-delta,0px))!important;flex:none;padding:6px!important;border-radius:var(--dsw-radius-sm,8px)!important;color:var(--dsw-alias-label-tertiary)}
.dsh-resend-icon-action svg{width:calc(15px + var(--dsh-content-font-delta,0px));height:calc(15px + var(--dsh-content-font-delta,0px))}
.dsh-resend-icon-action:hover:not(:disabled){color:var(--dsw-alias-label-secondary)}
.dsh-resend-icon-action:focus-visible,.dsh-resend-disabled-action:focus-visible{outline:1.5px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.dsh-resend-icon-action:disabled{opacity:.4;cursor:default}
.dsh-resend-disabled-action{display:inline-flex;border-radius:var(--dsw-radius-sm,8px)}
.dsh-resend-regenerate{position:relative}
.dsh-resend-settings{box-sizing:border-box;margin:12px 0;padding:16px;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-md,12px);background:var(--dsw-alias-bg-layer-1);font-size:var(--dsh-content-font-size,14px);line-height:22px;color:var(--dsw-alias-label-primary)}
.dsh-resend-settings-heading{font-weight:600;margin-bottom:12px}
.dsh-resend-settings-row{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:10px 0}
.dsh-resend-settings-row + .dsh-resend-settings-row{border-top:.5px solid var(--dsw-alias-border-l4)}
.dsh-resend-settings-label{min-width:0}
.dsh-resend-settings-description{margin:6px 0 0;color:var(--dsw-alias-label-secondary);font-size:var(--dsh-content-font-size-secondary,13px);line-height:22px;overflow-wrap:anywhere}
.dsh-resend-settings-toggle{flex:none}
`
