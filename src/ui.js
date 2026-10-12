/** Host controls and theme tokens shared by every plugin surface. */
import { createElement } from 'react'
import { Button, Tooltip } from '@deepseek-ai/dsh-client-ui-primitives'

export function IconAction({ label, tooltip = label, icon: Icon, reason, disabled = false, primary = false, showLabel = false, ...props }) {
  const locked = disabled || reason !== undefined
  const button = createElement(Button, {
    ...props, type: 'button', size: 'sm', variant: primary ? 'primary' : 'ghost',
    className: showLabel ? 'dsh-resend-text-action' : 'dsh-resend-icon-action', 'aria-label': label,
    disabled: locked,
  }, createElement(Icon, { size: 16, 'aria-hidden': true }), showLabel ? createElement('span', null, label) : null)
  // Disabled native buttons do not consistently receive pointer/focus events.
  return createElement(Tooltip, { label: reason ?? tooltip, side: 'bottom', portal: true },
    createElement('span', { className: 'dsh-resend-disabled-action', tabIndex: locked ? 0 : undefined, 'aria-label': locked ? reason ?? label : undefined }, button))
}

export function UIStyles() {
  return createElement('style', { 'data-dsh-resend-ui': true }, CSS)
}

const CSS = `
.dsh-resend-preflight-overlay{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;background:color-mix(in srgb,var(--dsw-alias-bg-base) 80%,transparent)}
.dsh-resend-preflight-dialog{width:min(864px,100%);max-height:calc(100vh - 32px);overflow:auto;border-radius:var(--dsw-radius-sm,8px);background:var(--dsw-alias-bg-base);box-shadow:0 8px 32px #0002}
.dsh-resend-cleanup{container-type:inline-size;margin-top:24px;padding-top:20px;border-top:.5px solid var(--dsw-alias-border-l4);--dsh-cleanup-accent:var(--dsw-alias-state-business-primary);--dsh-cleanup-tint:color-mix(in srgb,var(--dsh-cleanup-accent) 6%,var(--dsw-alias-bg-layer-1))}
.dsh-resend-cleanup h3,.dsh-resend-cleanup h4{font:inherit;font-weight:600;margin:0}
.dsh-resend-cleanup-heading{display:flex;align-items:center;gap:9px;margin-bottom:8px}
.dsh-resend-cleanup-heading svg{width:19px;height:19px;color:var(--dsw-alias-label-secondary);flex:none}
.dsh-resend-cleanup-entries{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:18px 0}
.dsh-resend-cleanup-entry{display:flex;align-items:flex-start;gap:10px;min-width:0;padding:15px 14px;border:1px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-sm,8px);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;text-align:left;cursor:pointer;transition:background .18s,border-color .18s}
.dsh-resend-cleanup-entry>svg{width:18px;height:18px;flex:none;margin-top:2px;color:var(--dsw-alias-label-secondary)}
.dsh-resend-cleanup-entry>svg:last-child{width:15px;height:15px;margin-left:auto}
.dsh-resend-cleanup-entry-copy{display:flex;flex-direction:column;gap:4px;min-width:0;overflow-wrap:anywhere}
.dsh-resend-cleanup-entry-copy strong{font-weight:600}
.dsh-resend-cleanup-entry-copy>span,.dsh-resend-cleanup-meta,.dsh-resend-cleanup-hint{color:var(--dsw-alias-label-secondary);font-size:var(--dsh-content-font-size-secondary,13px);line-height:1.65}
.dsh-resend-cleanup-entry:hover:not(:disabled){background:var(--dsh-cleanup-tint);border-color:color-mix(in srgb,var(--dsh-cleanup-accent) 50%,var(--dsw-alias-border-l4))}
.dsh-resend-cleanup-entry[aria-pressed=true]{background:var(--dsh-cleanup-tint);border-color:var(--dsh-cleanup-accent)}
.dsh-resend-cleanup-entry[aria-pressed=true]>svg:first-child{color:var(--dsh-cleanup-accent)}
.dsh-resend-cleanup button:focus-visible,.dsh-resend-cleanup input:focus-visible{outline:2px solid var(--dsh-cleanup-accent);outline-offset:3px}
.dsh-resend-cleanup button:disabled{cursor:default;opacity:.55}
.dsh-resend-cleanup-button{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;white-space:normal!important;height:auto!important;cursor:pointer}
.dsh-resend-cleanup-spinner{width:18px;height:18px;flex:none;animation:dsh-resend-cleanup-spin .8s linear infinite}
@keyframes dsh-resend-cleanup-spin{to{transform:rotate(360deg)}}
.dsh-resend-cleanup-pending{display:flex;align-items:flex-start;gap:12px;padding:14px 16px;margin:16px 0;border:1px solid color-mix(in srgb,var(--dsh-cleanup-accent) 25%,var(--dsw-alias-border-l4));border-radius:var(--dsw-radius-sm,8px);background:var(--dsh-cleanup-tint)}
.dsh-resend-cleanup-pending>svg{margin-top:2px;color:var(--dsh-cleanup-accent)}
.dsh-resend-cleanup-pending strong{font-weight:500}.dsh-resend-cleanup-pending p{margin:3px 0 0;font-size:var(--dsh-content-font-size-secondary,13px);color:var(--dsw-alias-label-secondary)}
.dsh-resend-cleanup-error{padding:14px 16px;margin:16px 0;border:1px solid color-mix(in srgb,var(--dsw-alias-state-error-primary) 30%,var(--dsw-alias-border-l4));border-radius:var(--dsw-radius-sm,8px)}
.dsh-resend-cleanup-error p{margin:0 0 10px}
.dsh-resend-cleanup-panel{margin-top:16px;border:1px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-sm,8px);overflow:hidden}
.dsh-resend-cleanup-panel-header{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 16px;background:color-mix(in srgb,var(--dsw-alias-label-primary) 3%,var(--dsw-alias-bg-layer-1));border-bottom:.5px solid var(--dsw-alias-border-l4)}
.dsh-resend-cleanup-panel-header>.dsh-resend-cleanup-meta{flex:none}
.dsh-resend-cleanup-hint{margin:12px 16px;overflow-wrap:anywhere}
.dsh-resend-cleanup-list{list-style:none;padding:0 8px;margin:0 0 8px;max-height:360px;overflow:auto;overscroll-behavior:contain}
.dsh-resend-cleanup-list>li+li{border-top:.5px solid var(--dsw-alias-border-l4)}
.dsh-resend-cleanup-session{display:flex;align-items:flex-start;gap:12px;margin:4px 0;padding:12px 10px;border-radius:6px;cursor:pointer;overflow-wrap:anywhere;transition:background .18s}
.dsh-resend-cleanup-session:hover,.dsh-resend-cleanup-session[data-selected=true]{background:var(--dsh-cleanup-tint)}
.dsh-resend-cleanup-session:has(input:disabled){cursor:default}
.dsh-resend-cleanup-session input{width:16px;height:16px;flex:none;margin:3px 0 0;accent-color:var(--dsh-cleanup-accent);cursor:inherit}
.dsh-resend-cleanup-session-info{min-width:0;display:flex;flex-direction:column;gap:3px}
.dsh-resend-cleanup-session-info strong{font-weight:600}
.dsh-resend-cleanup-path{display:block;font-size:var(--dsh-content-font-size-secondary,13px);color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}
.dsh-resend-cleanup-badge{align-self:flex-start;margin-top:3px;padding:0 6px;border-radius:4px;background:color-mix(in srgb,var(--dsw-alias-label-primary) 6%,var(--dsw-alias-bg-layer-1));color:var(--dsw-alias-label-secondary);font-size:12px}
.dsh-resend-cleanup-footer{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;padding:12px 16px;border-top:.5px solid var(--dsw-alias-border-l4);background:color-mix(in srgb,var(--dsw-alias-label-primary) 3%,var(--dsw-alias-bg-layer-1))}
.dsh-resend-cleanup-actions{justify-content:flex-end}
.dsh-resend-cleanup-space{font-weight:600;margin:16px;font-variant-numeric:tabular-nums}
.dsh-resend-cleanup-summary{padding:0 16px 0 34px;margin:12px 0;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}
.dsh-resend-cleanup-summary li+li{margin-top:6px}
.dsh-resend-cleanup-impact{margin:16px!important;padding:12px 14px;background:color-mix(in srgb,var(--dsw-alias-state-warn-label) 6%,var(--dsw-alias-bg-layer-1));border-radius:6px;font-size:var(--dsh-content-font-size-secondary,13px)}
.dsh-resend-cleanup-result>p:not(.dsh-resend-cleanup-space),.dsh-resend-cleanup-result>[role=alert]{margin:12px 16px;overflow-wrap:anywhere}
.dsh-resend-cleanup [role=alert]{color:var(--dsw-alias-state-error-primary)}
@container(max-width:500px){.dsh-resend-cleanup-entries{grid-template-columns:minmax(0,1fr)}.dsh-resend-cleanup-footer:not(.dsh-resend-cleanup-actions){align-items:stretch;flex-direction:column}.dsh-resend-cleanup-footer>.dsh-resend-cleanup-button{max-width:100%}}
@media(prefers-reduced-motion:reduce){.dsh-resend-cleanup-spinner{animation:none}.dsh-resend-cleanup-entry,.dsh-resend-cleanup-session{transition:none}}
.dsh-resend-icon-action{box-sizing:border-box!important;width:calc(28px + var(--dsh-content-font-delta,0px));height:calc(28px + var(--dsh-content-font-delta,0px))!important;flex:none;padding:6px!important;border-radius:var(--dsw-radius-sm,8px)!important;color:var(--dsw-alias-label-tertiary)}
.dsh-resend-icon-action svg{width:calc(15px + var(--dsh-content-font-delta,0px));height:calc(15px + var(--dsh-content-font-delta,0px))}
.dsh-resend-icon-action:hover:not(:disabled){color:var(--dsw-alias-label-secondary)}
.dsh-resend-icon-action:focus-visible,.dsh-resend-disabled-action:focus-visible{outline:1.5px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.dsh-resend-icon-action:disabled{opacity:.4;cursor:default}
.dsh-resend-icon-action[data-primary]{background:var(--dsw-alias-button-info-fill);color:#fff}
.dsh-resend-icon-action[data-primary]:hover:not(:disabled){background:var(--dsw-alias-button-info-hover);color:#fff}
.dsh-resend-disabled-action{display:inline-flex;border-radius:var(--dsw-radius-sm,8px)}
.dsh-resend-user-message{min-width:0}
.dsh-resend-user-actions,.dsh-resend-regenerate{display:inline-flex;align-items:center;gap:8px}
.dsh-resend-editor-surface{box-sizing:border-box;width:100%;min-width:0;margin-top:8px;padding:8px;border:.5px solid var(--dsw-alias-border-l4);border-radius:calc(var(--dsw-radius-xl,20px) + 8px);background:var(--dsw-alias-bg-layer-1)}
.dsh-resend-editor-header{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px}
.dsh-resend-editor-header .dsh-resend-icon-action{width:32px;height:32px!important}
.dsh-resend-editor-label{margin-left:8px;color:var(--dsw-alias-label-secondary);font-size:var(--dsh-content-font-size-secondary,13px);line-height:20px}
.dsh-resend-editor{box-sizing:border-box;display:flex;flex-direction:column;width:100%;min-width:0;padding:12px;gap:10px;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-xl,20px);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}
.dsh-resend-editor:focus-within{border-color:var(--dsw-alias-state-business-primary)}
.dsh-resend-rich-input .ProseMirror{box-sizing:border-box;display:block;width:100%;min-height:calc(66px + var(--dsh-content-font-delta,0px) + var(--dsh-content-font-delta,0px) + var(--dsh-content-font-delta,0px));resize:none;overflow:hidden;border:0;outline:none;padding:0;background:transparent;color:inherit;font:inherit;font-size:var(--dsh-content-font-size,14px);line-height:calc(22px + var(--dsh-content-font-delta,0px))}
.dsh-resend-rich-input [aria-disabled="true"]{opacity:.5}
.dsh-resend-rich-input .ProseMirror{white-space:pre-wrap;overflow-wrap:anywhere}
.dsh-resend-rich-input .ProseMirror p{margin:0}
.dsh-resend-file-reference{display:inline-flex;align-items:center;gap:4px;max-width:100%;vertical-align:baseline;border-radius:4px;padding:0 4px;background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 12%,transparent);white-space:normal}
.dsh-resend-file-reference span{overflow-wrap:anywhere}
.dsh-resend-file-reference button{border:0;background:transparent;color:inherit;cursor:pointer;padding:0 2px;font:inherit}
.dsh-resend-file-reference button:disabled{opacity:.4;cursor:default}
.dsh-resend-file-reference.ProseMirror-selectednode{outline:1px solid var(--dsw-alias-state-business-primary)}
.dsh-resend-reference-menu{margin-top:8px;padding:8px;border:1px solid var(--dsw-alias-border-l4);border-radius:6px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit}
.dsh-resend-reference-menu[hidden]{display:none}
.dsh-resend-reference-menu-header{display:flex;justify-content:space-between;gap:8px}
.dsh-resend-reference-menu [role="status"]{padding:6px 0;font-size:.9em}
.dsh-resend-reference-menu [role="listbox"]{max-height:240px;overflow:auto}
.dsh-resend-reference-candidate{display:flex;gap:6px;margin:2px 0}
.dsh-resend-reference-menu button{border:0;border-radius:4px;padding:6px;background:transparent;color:inherit;cursor:pointer;font:inherit;text-align:left;overflow-wrap:anywhere}
.dsh-resend-reference-candidate [role="option"]{flex:1;min-width:0}
.dsh-resend-reference-menu button:hover,.dsh-resend-reference-menu [aria-selected="true"]{background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 12%,transparent)}
.dsh-resend-reference-menu button:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary)}
.dsh-resend-editor-actions{display:flex;justify-content:flex-end;align-items:center;gap:8px}
.dsh-resend-editor-composer{display:flex;min-width:0;margin-right:auto}
.dsh-resend-editor-composer .dsh-resend-disabled-action{min-width:0}
.dsh-resend-editor-composer .dsh-resend-text-action{background:color-mix(in srgb,var(--dsw-alias-label-primary) 5%,var(--dsw-alias-bg-layer-1))!important;box-shadow:inset 0 0 0 .5px var(--dsw-alias-border-l4)}
.dsh-resend-editor-composer .dsh-resend-text-action:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-label-primary) 9%,var(--dsw-alias-bg-layer-1))!important}
.dsh-resend-text-action{box-sizing:border-box;display:inline-flex!important;align-items:center;justify-content:center;gap:6px;min-width:0;min-height:32px;height:auto!important;padding:6px 8px!important;border-radius:var(--dsw-radius-sm,8px)!important;color:var(--dsw-alias-label-secondary);font-size:var(--dsh-content-font-size-secondary,13px);line-height:20px;white-space:normal!important;text-align:left;cursor:pointer}
.dsh-resend-text-action svg{width:16px;height:16px;flex:none}
.dsh-resend-text-action:focus-visible{outline:1.5px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.dsh-resend-text-action:disabled{opacity:.4;cursor:default}
.dsh-resend-editor-actions .dsh-resend-icon-action{width:32px;height:32px!important}
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
.dsh-resend-rollback{padding:0;overflow:hidden;border-radius:10px;--dsh-resend-rollback-accent:color-mix(in srgb,var(--dsw-alias-state-business-primary) 85%,var(--dsw-alias-label-primary));--dsh-resend-rollback-warning:color-mix(in srgb,var(--dsw-alias-state-warn-label) 65%,var(--dsw-alias-label-primary))}
.dsh-resend-rollback-header{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:16px 20px}
.dsh-resend-rollback-title{display:flex;align-items:center;gap:10px;min-width:0}
.dsh-resend-rollback-title>svg{flex:none;width:20px;height:20px;color:var(--dsw-alias-state-business-primary)}
.dsh-resend-rollback-title h3{margin:0 0 2px;font:inherit;font-weight:600;font-size:var(--dsh-content-font-size,14px)}
.dsh-resend-rollback-title p{margin:0;color:var(--dsw-alias-label-secondary);font-size:var(--dsh-content-font-size-secondary,13px);overflow-wrap:anywhere}
.dsh-resend-rollback-stage{flex:none;font-size:var(--dsh-content-font-size-secondary,13px);color:var(--dsw-alias-label-secondary)}
.dsh-resend-rollback-header-actions{display:flex;align-items:center;gap:12px;flex:none}
.dsh-resend-rollback-button{display:inline-flex!important;align-items:center;justify-content:center;gap:6px;min-height:36px!important;white-space:nowrap}
.dsh-resend-rollback-button svg{flex:none;width:16px;height:16px}
.dsh-resend-rollback-preview-button{color:var(--dsh-resend-rollback-accent)!important;background:var(--dsw-alias-interactive-bg-hover)!important;border-color:transparent!important}
.dsh-resend-rollback-confirm-button{background:var(--dsh-resend-rollback-accent)!important;color:var(--dsw-alias-bg-layer-1)!important;border-color:transparent!important}
.dsh-resend-rollback-confirm-button:hover:not(:disabled){filter:brightness(.94)}
.dsh-resend-rollback-button:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.dsh-resend-rollback-content{border-top:.5px solid var(--dsw-alias-border-l4);padding:0 20px}
.dsh-resend-rollback-summary{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin:18px 0 12px;font-size:var(--dsh-content-font-size-secondary,13px)}
.dsh-resend-rollback-summary strong{font-weight:600;color:var(--dsh-resend-rollback-accent)}
.dsh-resend-rollback-summary>span{color:var(--dsw-alias-label-secondary);text-align:right}
.dsh-resend-rollback-files{list-style:none;padding:0;margin:0}
.dsh-resend-rollback-file{display:flex;align-items:center;gap:12px;padding:14px 0}
.dsh-resend-rollback-file+.dsh-resend-rollback-file{border-top:.5px solid var(--dsw-alias-border-l4)}
.dsh-resend-rollback-file-icon{flex:none;display:flex;align-items:center;justify-content:center;width:32px;height:36px;border:.5px solid var(--dsw-alias-border-l4);border-radius:6px;background:var(--dsw-alias-interactive-bg-hover)}
.dsh-resend-rollback-file-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;overflow-wrap:anywhere}
.dsh-resend-rollback-filename{font-weight:500;font-size:var(--dsh-content-font-size-secondary,13px)}
.dsh-resend-rollback-path,.dsh-resend-rollback-reason{font-size:var(--dsh-content-font-size-secondary,13px);color:var(--dsw-alias-label-secondary)}
.dsh-resend-rollback-file-status{display:inline-flex;align-items:center;gap:5px;flex:none;white-space:nowrap;color:var(--dsh-resend-rollback-accent);font-size:var(--dsh-content-font-size-secondary,13px)}
.dsh-resend-rollback-file-status svg{width:14px;height:14px;flex:none}
.dsh-resend-rollback-refuse,.dsh-resend-rollback-reason,.dsh-resend-rollback-warning{color:var(--dsh-resend-rollback-warning)}
.dsh-resend-rollback-restored{color:var(--dsw-alias-state-success-primary,var(--dsw-alias-state-business-primary))}
.dsh-resend-rollback-notice{margin:16px 0;padding:12px 14px;border-radius:8px;background:var(--dsw-alias-interactive-bg-hover);font-size:var(--dsh-content-font-size-secondary,13px);overflow-wrap:anywhere}
.dsh-resend-rollback-footer{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 20px;border-top:.5px solid var(--dsw-alias-border-l4)}
.dsh-resend-rollback-hint{display:flex;align-items:center;gap:7px;margin:0;color:var(--dsw-alias-label-secondary);font-size:var(--dsh-content-font-size-secondary,13px)}
.dsh-resend-rollback-hint svg{flex:none;width:14px;height:14px}
.dsh-resend-rollback-actions{display:flex;justify-content:flex-end;align-items:center;gap:8px}
.dsh-resend-panel-error-hint{color:var(--dsw-alias-label-secondary)}
@media(max-width:480px){.dsh-resend-editor{width:100%}.dsh-resend-settings{padding:12px}.dsh-resend-rollback-header{flex-wrap:wrap;gap:12px;padding:16px}.dsh-resend-rollback-preview-button{margin-left:30px}.dsh-resend-rollback-content{padding:0 16px}.dsh-resend-rollback-file{gap:9px}.dsh-resend-rollback-file-icon{display:none}.dsh-resend-rollback-footer{flex-direction:column;align-items:flex-start;padding:14px 16px}.dsh-resend-rollback-actions{width:100%;flex-wrap:wrap}}
`
