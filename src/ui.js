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
.dsh-resend-icon-action[data-primary],.dsh-resend-text-action[data-primary]{background:var(--dsw-alias-button-info-fill);color:#fff}
.dsh-resend-icon-action[data-primary]:hover:not(:disabled),.dsh-resend-text-action[data-primary]:hover:not(:disabled){background:var(--dsw-alias-button-info-hover);color:#fff}
.dsh-resend-disabled-action{display:inline-flex;border-radius:var(--dsw-radius-sm,8px)}
.dsh-resend-user-message{min-width:0}
.dsh-resend-user-actions,.dsh-resend-regenerate{display:inline-flex;align-items:center;gap:8px}
.dsh-resend-editor-surface{box-sizing:border-box;width:100%;min-width:0;margin-top:8px;padding:8px;border:.5px solid var(--dsw-alias-border-l4);border-radius:calc(var(--dsw-radius-xl,20px) + 8px);background:var(--dsw-alias-bg-layer-1)}
.dsh-resend-editor-header{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px}
.dsh-resend-editor-header .dsh-resend-icon-action{width:32px;height:32px!important}
.dsh-resend-editor-label{margin-left:8px;color:var(--dsw-alias-label-secondary);font-size:var(--dsh-content-font-size-secondary,13px);line-height:20px}
.dsh-resend-editor{position:relative;box-sizing:border-box;display:flex;flex-direction:column;width:100%;min-width:0;padding:12px;gap:10px;border:.5px solid var(--dsw-alias-border-l4);border-radius:var(--dsw-radius-xl,20px);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}
.dsh-resend-editor:focus-within{border-color:var(--dsw-alias-state-business-primary)}
.dsh-resend-rich-input .ProseMirror{box-sizing:border-box;display:block;width:100%;min-height:calc(66px + var(--dsh-content-font-delta,0px) + var(--dsh-content-font-delta,0px) + var(--dsh-content-font-delta,0px));resize:none;overflow:hidden;border:0;outline:none;padding:0;background:transparent;color:inherit;font:inherit;font-size:var(--dsh-content-font-size,14px);line-height:calc(22px + var(--dsh-content-font-delta,0px))}
.dsh-resend-rich-input [aria-disabled="true"]{opacity:.5}
.dsh-resend-rich-input .ProseMirror{white-space:pre-wrap;overflow-wrap:anywhere}
.dsh-resend-rich-input .ProseMirror p{margin:0}
.dsh-resend-file-reference{display:inline-flex;align-items:center;gap:4px;max-width:100%;vertical-align:baseline;border-radius:4px;padding:0 4px;background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 12%,transparent);white-space:normal}
.dsh-resend-file-reference span{align-self:baseline;overflow-wrap:anywhere}
.dsh-resend-reference-icon{width:14px;height:14px;flex:none;align-self:center}
.dsh-resend-skill-reference,.dsh-resend-skill-prefix{background:color-mix(in srgb,var(--dsw-alias-state-business-primary) 12%,transparent);cursor:pointer}
.dsh-resend-skill-reference{display:inline-block;vertical-align:baseline;line-height:inherit;border-radius:0 4px 4px 0;padding:0 4px;box-decoration-break:clone;-webkit-box-decoration-break:clone}
.dsh-resend-skill-prefix{position:relative;display:inline-block;box-sizing:content-box;width:14px;height:calc(22px + var(--dsh-content-font-delta,0px));padding-left:4px;border-radius:4px 0 0 4px;color:transparent;font-size:inherit;line-height:inherit;vertical-align:baseline}
.dsh-resend-skill-prefix::after{content:"";position:absolute;left:4px;top:50%;transform:translateY(-50%);width:14px;height:14px;pointer-events:none;background:var(--dsw-alias-label-primary);mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z'/%3E%3C/svg%3E") center/contain no-repeat}
.dsh-resend-file-reference button{border:0;background:transparent;color:inherit;cursor:pointer;padding:0 2px;font:inherit}
.dsh-resend-file-reference button:disabled{opacity:.4;cursor:default}
.dsh-resend-file-reference.ProseMirror-selectednode{outline:1px solid var(--dsw-alias-state-business-primary)}
.dsh-resend-reference-menu{position:absolute;bottom:calc(100% + 4px);left:0;right:0;z-index:100}
.dsh-resend-reference-menu[hidden]{display:none}
.dsh-resend-menu-surface{box-sizing:border-box;--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);--dsh-scrollbar-width:6px;--dsh-scrollbar-thumb-border:2px;--dsh-scrollbar-track-margin:12px;--dsw-elevation-stroke-color:var(--dsw-alias-border-l1);box-shadow:var(--dsw-elevation-prominent);border:0;display:flex;flex-direction:column;padding:4px;overflow:hidden}
.dsh-resend-menu-surface[data-overflow-below]:after{content:"";background:linear-gradient(to bottom,transparent,var(--dsw-specific-menu));pointer-events:none;height:16px;position:absolute;bottom:4px;left:4px;right:14px}
.dsh-resend-menu-viewport{display:flex;flex-direction:column;min-height:0;overflow-y:auto;overscroll-behavior:contain}
.dsh-resend-menu-title{color:var(--dsw-alias-label-tertiary);padding:6px 8px;font-size:11px;line-height:15px;flex:none}
.dsh-resend-menu-section-title{box-sizing:border-box;min-height:23px;color:var(--dsw-alias-label-tertiary);flex:none;padding:5px 8px 2px;font-size:11px;font-weight:500;line-height:16px}
.dsh-resend-menu-item{box-sizing:border-box;border-radius:var(--dsw-radius-md,12px);cursor:pointer;width:100%;min-height:34px;color:var(--dsw-alias-label-primary);text-align:left;background:transparent;border:0;display:flex;align-items:center;gap:6px;padding:6px 8px;font:inherit;font-size:13px;line-height:20px}
.dsh-resend-menu-item[aria-selected="true"]{background:var(--dsw-alias-interactive-bg-hover)}
.dsh-resend-menu-icon{width:14px;height:14px;color:var(--dsw-alias-menu-icon);flex:none;display:inline-flex;align-items:center;justify-content:center}
.dsh-resend-menu-icon svg{width:14px;height:14px}
.dsh-resend-menu-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:none;max-width:40%}
.dsh-resend-menu-description{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right;min-width:0;color:var(--dsw-alias-label-tertiary);flex:1;font-size:12px;line-height:18px}
.dsh-resend-menu-trailing{display:inline-flex;align-items:center;gap:3px;flex:none;margin-left:auto}
.dsh-resend-menu-drill-hint,.dsh-resend-menu-drill-key{color:var(--dsw-alias-label-caption);white-space:nowrap;font-size:10px;line-height:16px;display:none}
.dsh-resend-menu-drill-key{border-radius:var(--dsw-radius-xs,4px);background:var(--dsw-alias-interactive-bg-hover);padding:0 4px;font-family:inherit}
.dsh-resend-menu-item[aria-selected="true"] .dsh-resend-menu-drill-hint,.dsh-resend-menu-item[aria-selected="true"] .dsh-resend-menu-drill-key{display:inline-flex}
.dsh-resend-menu-drill{border-radius:var(--dsw-radius-xs,4px);width:18px;height:18px;color:var(--dsw-alias-menu-icon);flex:none;display:inline-grid;place-items:center}
.dsh-resend-menu-drill:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dsh-resend-menu-crumbs{border-bottom:.5px solid var(--dsw-alias-border-l1);display:flex;align-items:center;flex-wrap:wrap;flex:none;gap:2px;margin-bottom:2px;padding:3px 3px 5px}
.dsh-resend-menu-crumb{border-radius:var(--dsw-radius-sm,8px);max-width:40%;color:var(--dsw-alias-label-tertiary);cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:transparent;border:0;flex:0 auto;padding:2px 5px;font:inherit;font-size:11px;line-height:16px}
.dsh-resend-menu-crumb:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dsh-resend-menu-crumb[aria-current]{color:var(--dsw-alias-label-primary);cursor:default;background:transparent}
.dsh-resend-menu-crumb-separator{color:var(--dsw-alias-menu-icon);flex:none;display:inline-flex}
.dsh-resend-menu-skeleton-row{box-sizing:border-box;display:flex;align-items:center;min-height:34px;padding:6px 8px}
.dsh-resend-menu-skeleton{border-radius:var(--dsw-radius-xs,4px);background:var(--dsw-alias-bg-skeleton);height:18px;animation:dsh-resend-menu-loading 2s cubic-bezier(.36,0,.64,1) infinite}
@keyframes dsh-resend-menu-loading{0%,80%,100%{opacity:1}40%{opacity:.6}}
@media(prefers-reduced-motion:reduce){.dsh-resend-menu-skeleton{animation:none}}
.dsh-resend-menu-status{padding:6px 8px;color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:20px;overflow-wrap:anywhere}
.dsh-resend-menu-status button{display:block;border:0;border-radius:var(--dsw-radius-sm,8px);padding:4px 0;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;font:inherit}
.dsh-resend-reference-menu button:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary)}
.dsh-resend-editor-actions{display:flex;justify-content:flex-end;align-items:center;gap:8px}
.dsh-resend-editor-notices{display:flex;flex-direction:column;gap:4px;margin:6px 12px 0;color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px;overflow-wrap:anywhere}
.dsh-resend-text-action{box-sizing:border-box;display:inline-flex!important;align-items:center;justify-content:center;gap:6px;min-width:0;min-height:32px;height:auto!important;padding:6px 8px!important;border-radius:var(--dsw-radius-sm,8px)!important;color:var(--dsw-alias-label-secondary);font-size:var(--dsh-content-font-size-secondary,13px);line-height:20px;white-space:normal!important;text-align:left;cursor:pointer}
.dsh-resend-text-action svg{width:16px;height:16px;flex:none}
.dsh-resend-text-action:focus-visible{outline:1.5px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.dsh-resend-text-action:disabled{opacity:.4;cursor:default}
.dsh-resend-editor-actions .dsh-resend-icon-action{width:32px;height:32px!important}
.dsh-resend-row{display:flex;align-items:center;flex-wrap:wrap;gap:8px;color:var(--dsw-alias-label-tertiary);font-size:var(--dsh-content-font-size-secondary,13px);line-height:22px;padding:8px 0}
.dsh-resend-row-error,.dsh-resend-panel-error{color:var(--dsw-alias-state-error-primary)}
.dsh-resend-row-detail,.dsh-resend-panel-error-detail{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;max-width:100%}
.dsh-resend-operation-error{display:block;margin-top:8px;color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px;overflow-wrap:anywhere}
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
.dsh-resend-rollback-select-all{display:flex;align-items:center;gap:9px;margin:14px 0 2px;padding:6px 0;font-size:var(--dsh-content-font-size-secondary,13px);color:var(--dsw-alias-label-secondary);cursor:pointer}
.dsh-resend-rollback-select-all:has(input:disabled){cursor:default;opacity:.55}
.dsh-resend-rollback-select-all span{overflow-wrap:anywhere}
.dsh-resend-rollback-check,.dsh-resend-rollback-select-all input{width:16px;height:16px;flex:none;margin:0;accent-color:var(--dsw-alias-state-business-primary);cursor:pointer}
.dsh-resend-rollback-check:focus-visible,.dsh-resend-rollback-select-all input:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.dsh-resend-rollback-check:disabled{cursor:default;opacity:.45}
.dsh-resend-rollback-file{display:flex;align-items:center;gap:12px;padding:14px 0;flex-wrap:wrap}
.dsh-resend-rollback-file-info{min-width:min(160px,100%)}
.dsh-resend-content-view{flex:none}
.dsh-resend-content-dialog{box-sizing:border-box;width:min(960px,calc(100vw - 32px))!important;max-width:100%!important;height:min(820px,calc(100dvh - 48px));max-height:100%!important;display:flex;flex-direction:column;gap:0!important;padding:0!important;overflow:hidden;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}
div[role="presentation"]:has(>.dsh-resend-content-dialog){z-index:1100}
div[role="presentation"]:has(>.dsh-resend-content-stacked)>div[aria-hidden="true"]{backdrop-filter:none}
div[role="presentation"]:has(>.dsh-resend-content-stacked)>div[aria-hidden="true"]::after{background:transparent}
.dsh-resend-content-header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding:20px 24px 14px;flex:none;border-bottom:.5px solid var(--dsw-alias-border-l4)}
.dsh-resend-content-header>div{min-width:0;flex:1}
.dsh-resend-content-header h2{margin:0 0 8px;font:inherit;font-size:var(--dsh-content-font-size,14px);font-weight:600}
.dsh-resend-content-header p{margin:4px 0;color:var(--dsw-alias-label-secondary);font-size:var(--dsh-content-font-size-secondary,13px);overflow-wrap:anywhere}
.dsh-resend-content-path{color:var(--dsw-alias-label-primary)!important}
.dsh-resend-content-header button{flex:none;white-space:normal;max-width:120px}
.dsh-resend-content-meta{padding:14px 24px;flex:none;font-size:var(--dsh-content-font-size-secondary,13px);overflow-wrap:anywhere}
.dsh-resend-content-meta strong{font-weight:500}
.dsh-resend-content-version{margin:4px 0;color:var(--dsw-alias-label-secondary)}
.dsh-resend-content-legend{display:flex;gap:20px;flex-wrap:wrap;margin-top:10px}
.dsh-resend-content-body{flex:1;min-height:0;min-width:0;overflow:auto;overscroll-behavior:contain;border-top:.5px solid var(--dsw-alias-border-l4);padding:12px 0;font-size:var(--dsh-content-font-size-secondary,13px)}
.dsh-resend-content-body:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}
.dsh-resend-content-body>p,.dsh-resend-content-message{margin:0;padding:16px 24px;overflow-wrap:anywhere;white-space:normal}
.dsh-resend-content-lines{width:max-content;min-width:100%;font-family:var(--dsw-font-markdown-code-block);font-size:var(--dsh-content-font-size-secondary,13px);line-height:24px}
.dsh-resend-content-line{display:flex;min-height:24px;padding-right:20px}
.dsh-resend-content-line code{font:inherit;white-space:pre;tab-size:4}
.dsh-resend-content-number{box-sizing:border-box;width:5ch;flex:none;text-align:right;padding-right:1ch;color:var(--dsw-alias-label-secondary);user-select:none}
.dsh-resend-content-mark{width:3ch;flex:none;text-align:center}
.dsh-resend-content-delete{background:var(--dsw-alias-code-diff-deleted)}
.dsh-resend-content-add{background:var(--dsw-alias-code-diff-added)}
.dsh-resend-content-mark,.dsh-resend-content-legend{color:var(--dsw-alias-label-primary)}
@media(max-width:480px){div[role="presentation"]:has(>.dsh-resend-content-dialog){padding: max(12px,var(--dsh-frame-overlay-top,12px)) 8px}.dsh-resend-content-header{padding:16px 14px;gap:8px}.dsh-resend-content-meta{padding:12px 14px}.dsh-resend-content-dialog{width:calc(100vw - 16px)!important;height:calc(100dvh - 24px)}.dsh-resend-content-header button{max-width:90px;min-height:44px}.dsh-resend-content-view{min-height:44px!important}.dsh-resend-content-number{width:4ch}}
.dsh-resend-rollback-file+.dsh-resend-rollback-file{border-top:.5px solid var(--dsw-alias-border-l4)}
.dsh-resend-rollback-file-icon{flex:none;display:flex;align-items:center;justify-content:center;width:32px;height:36px;border:.5px solid var(--dsw-alias-border-l4);border-radius:6px;background:var(--dsw-alias-interactive-bg-hover)}
.dsh-resend-rollback-file-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;overflow-wrap:anywhere}
.dsh-resend-rollback-filename{font-weight:500;font-size:var(--dsh-content-font-size-secondary,13px)}
.dsh-resend-rollback-path,.dsh-resend-rollback-reason{font-size:var(--dsh-content-font-size-secondary,13px);color:var(--dsw-alias-label-secondary)}
.dsh-resend-rollback-file-status{display:inline-flex;align-items:center;gap:5px;flex:none;white-space:nowrap;color:var(--dsh-resend-rollback-accent);font-size:var(--dsh-content-font-size-secondary,13px)}
.dsh-resend-rollback-file-status svg{width:14px;height:14px;flex:none}
.dsh-resend-rollback-refuse,.dsh-resend-rollback-reason,.dsh-resend-rollback-warning{color:var(--dsh-resend-rollback-warning)}
.dsh-resend-rollback-kept{color:var(--dsw-alias-label-secondary)}
.dsh-resend-rollback-restored{color:var(--dsw-alias-state-success-primary,var(--dsw-alias-state-business-primary))}
.dsh-resend-rollback-notice{margin:16px 0;padding:12px 14px;border-radius:8px;background:var(--dsw-alias-interactive-bg-hover);font-size:var(--dsh-content-font-size-secondary,13px);overflow-wrap:anywhere}
.dsh-resend-rollback-footer{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 20px;border-top:.5px solid var(--dsw-alias-border-l4)}
.dsh-resend-rollback-hint{display:flex;align-items:center;gap:7px;margin:0;color:var(--dsw-alias-label-secondary);font-size:var(--dsh-content-font-size-secondary,13px)}
.dsh-resend-rollback-hint svg{flex:none;width:14px;height:14px}
.dsh-resend-rollback-actions{display:flex;justify-content:flex-end;align-items:center;gap:8px}
.dsh-resend-panel-error-hint{color:var(--dsw-alias-label-secondary)}
@media(max-width:480px){.dsh-resend-editor{width:100%}.dsh-resend-settings{padding:12px}.dsh-resend-rollback-header{flex-wrap:wrap;gap:12px;padding:16px}.dsh-resend-rollback-preview-button{margin-left:30px}.dsh-resend-rollback-content{padding:0 16px}.dsh-resend-rollback-file{gap:9px}.dsh-resend-rollback-file-icon{display:none}.dsh-resend-rollback-footer{flex-direction:column;align-items:flex-start;padding:14px 16px}.dsh-resend-rollback-actions{width:100%;flex-wrap:wrap}}
`
