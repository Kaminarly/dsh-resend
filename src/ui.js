/** Host controls and theme tokens shared by every plugin surface. */
import { createElement } from 'react'
import { Button, Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'

export function IconAction({ label, icon: Icon, reason, disabled = false, primary = false, ...props }) {
  const locked = disabled || reason !== undefined
  const button = createElement(Button, {
    ...props, type: 'button', size: 'sm', variant: primary ? 'primary' : 'ghost',
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
.dsh-resend-icon-action[data-primary]{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground)}
.dsh-resend-disabled-action{display:inline-flex;border-radius:var(--dsw-radius-sm,8px)}
.dsh-resend-user-message{min-width:0}
.dsh-resend-user-actions,.dsh-resend-regenerate{display:inline-flex;align-items:center;gap:8px}
.dsh-resend-editor{box-sizing:border-box;display:flex;flex-direction:column;width:min(100%,560px);margin:8px 0 0 auto;padding:12px;gap:10px;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-xl,20px);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}
.dsh-resend-editor:focus-within{border-color:var(--dsw-alias-state-business-primary)}
.dsh-resend-editor textarea{box-sizing:border-box;display:block;width:100%;min-height:88px;max-height:360px;resize:vertical;border:0;outline:none;padding:0;background:transparent;color:inherit;font:inherit;font-size:var(--dsh-content-font-size,14px);line-height:calc(22px + var(--dsh-content-font-delta,0px))}
.dsh-resend-editor textarea:disabled{opacity:.5}
.dsh-resend-editor-actions{display:flex;justify-content:flex-end;align-items:center;gap:8px}
.dsh-resend-editor-actions .dsh-resend-icon-action{width:32px;height:32px!important}
.dsh-resend-editor-actions .dsh-resend-send{background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground)}
.dsh-resend-row{display:flex;align-items:center;flex-wrap:wrap;gap:8px;color:var(--dsw-alias-label-tertiary);font-size:var(--dsh-content-font-size-secondary,13px);line-height:22px;padding:8px 0}
.dsh-resend-row-error,.dsh-resend-panel-error{color:var(--dsw-alias-state-error-primary)}
.dsh-resend-row-detail,.dsh-resend-panel-error-detail{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;max-width:100%}
.dsh-resend-operation-error{display:block;margin-top:8px;color:var(--dsw-alias-state-error-primary);font-size:var(--dsh-content-font-size-secondary,13px);overflow-wrap:anywhere}
.dsh-resend-regenerate{position:relative}
.dsh-resend-user-message > .dsh-resend-operation-error{width:min(100%,560px);margin-left:auto}
.dsh-resend-error-notice{box-sizing:border-box;position:fixed;z-index:1000;display:flex;align-items:flex-start;gap:8px;padding:12px 14px;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-md,12px);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-state-error-primary);box-shadow:0 4px 16px #00000014;font-size:var(--dsh-content-font-size-secondary,13px);line-height:22px;overflow-wrap:anywhere}
.dsh-resend-error-notice > span:first-child{flex:1;min-width:0}
.dsh-resend-settings,.dsh-resend-rollback,.dsh-resend-panel-error{box-sizing:border-box;margin:12px 0;padding:16px;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-md,12px);background:var(--dsw-alias-bg-layer-1);font-size:var(--dsh-content-font-size,14px);line-height:22px;color:var(--dsw-alias-label-primary)}
.dsh-resend-settings-heading,.dsh-resend-panel-error-title{font-weight:600;margin-bottom:12px}
.dsh-resend-settings-nav-label{display:inline-flex;align-items:center;gap:8px;white-space:nowrap}
.dsh-resend-settings-nav-label svg{flex:none}
nav button:has(.dsh-resend-settings-nav-label) > svg{display:none}
.dsh-resend-settings-row{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:10px 0}
.dsh-resend-settings-row + .dsh-resend-settings-row{border-top:.5px solid var(--dsw-alias-border-l4)}
.dsh-resend-settings-label{min-width:0}
.dsh-resend-settings-description{margin:6px 0 0;color:var(--dsw-alias-label-secondary);font-size:var(--dsh-content-font-size-secondary,13px);line-height:22px;overflow-wrap:anywhere}
.dsh-resend-settings-toggle{flex:none}
.dsh-resend-rollback fieldset{border:0;padding:0;margin:0 0 12px;min-width:0}
.dsh-resend-rollback legend{padding:0;margin-bottom:8px;font-weight:500}
.dsh-resend-rollback-scopes{display:flex;flex-wrap:wrap;gap:8px}
.dsh-resend-rollback-scope{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-sm,8px);cursor:pointer}
.dsh-resend-rollback-scope:has(input:checked){border-color:var(--dsw-alias-state-business-primary);background:var(--dsw-alias-interactive-bg-hover)}
.dsh-resend-rollback-scope input{margin:0;accent-color:var(--dsw-alias-state-business-primary)}
.dsh-resend-rollback p{margin:10px 0;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}
.dsh-resend-rollback ul{margin:10px 0;padding-left:20px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}
.dsh-resend-rollback li{padding:4px 0}
.dsh-resend-rollback-actions{display:flex;justify-content:flex-end;flex-wrap:wrap;gap:8px;margin-top:12px}
.dsh-resend-panel-error-hint{color:var(--dsw-alias-label-secondary)}
@media(max-width:480px){.dsh-resend-editor{width:100%}.dsh-resend-settings,.dsh-resend-rollback{padding:12px}.dsh-resend-rollback-scopes{flex-direction:column}}
`
