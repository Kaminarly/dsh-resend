/* GENERATED FILE — do not edit by hand; built from src/client.js by scripts/build.mjs */
window.__ModuleLoader__.load({
	id: "dsh-resend",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from2, except, desc) => {
  if (from2 && typeof from2 === "object" || typeof from2 === "function") {
    for (let key of __getOwnPropNames(from2))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from2[key], enumerable: !(desc = __getOwnPropDesc(from2, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client.js
var client_exports = {};
__export(client_exports, {
  ASSISTANT_ACTIONS_DEFINITION: () => ASSISTANT_ACTIONS_DEFINITION,
  ASSISTANT_ACTIONS_ID: () => ASSISTANT_ACTIONS_ID,
  ASSISTANT_ACTIONS_KIND: () => ASSISTANT_ACTIONS_KIND,
  FileRollbackPreview: () => FileRollbackPreview,
  HideRulesSurface: () => HideRulesSurface,
  InlineEditorSurface: () => InlineEditorSurface,
  OperationErrorNotice: () => OperationErrorNotice,
  REWIND_ROW_DEFINITION: () => REWIND_ROW_DEFINITION,
  REWIND_ROW_KIND: () => REWIND_ROW_KIND,
  RegenerateControl: () => RegenerateControl,
  ReplayPreflight: () => ReplayPreflight,
  RewindRow: () => RewindRow,
  SETTINGS_ROW_ID: () => SETTINGS_ROW_ID,
  SURFACE_SHADOW_DEFINITION: () => SURFACE_SHADOW_DEFINITION,
  SettingsNavigationLabel: () => SettingsNavigationLabel,
  SettingsRow: () => SettingsRow,
  StorageCleanup: () => StorageCleanup,
  TYPERT_REMOTE: () => TYPERT_REMOTE,
  USER_ACTIONS_DEFINITION: () => USER_ACTIONS_DEFINITION,
  USER_ACTIONS_KIND: () => USER_ACTIONS_KIND,
  UserActionsRow: () => UserActionsRow,
  apply: () => apply2,
  companionStates: () => companionStates,
  createPreferences: () => createPreferences,
  createResendOperations: () => createResendOperations,
  hiddenKeysFor: () => hiddenKeysFor,
  hidePlanFor: () => hidePlanFor,
  hideRulesFor: () => hideRulesFor,
  inject: () => inject,
  isLastReply: () => isLastReply,
  name: () => name,
  operationErrorText: () => operationErrorText,
  preferences: () => preferences,
  promptRefusal: () => promptRefusal,
  regenerateReason: () => regenerateReason,
  regenerateSurface: () => regenerateSurface,
  remoteMountState: () => remoteMountState,
  rewindPointView: () => rewindPointView,
  rewindRowSurface: () => rewindRowSurface,
  settingsSurface: () => settingsSurface,
  userActionsSurface: () => userActionsSurface,
  userMessageSurface: () => userMessageSurface,
  userMessageText: () => userMessageText,
  withPanelBoundary: () => withPanelBoundary
});
module.exports = __toCommonJS(client_exports);

// src/panel-boundary.js
var import_react2 = require("react");
var import_dsh_client_ui_primitives2 = require("@deepseek-ai/dsh-client-ui-primitives");

// src/ui.js
var import_react = require("react");
var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
function IconAction({ label, tooltip = label, icon: Icon, reason, disabled = false, primary = false, showLabel = false, ...props }) {
  const locked = disabled || reason !== void 0;
  const button = (0, import_react.createElement)(import_dsh_client_ui_primitives.Button, {
    ...props,
    type: "button",
    size: "sm",
    variant: primary ? "primary" : "ghost",
    className: showLabel ? "dsh-resend-text-action" : "dsh-resend-icon-action",
    "aria-label": label,
    disabled: locked
  }, (0, import_react.createElement)(Icon, { size: 16, "aria-hidden": true }), showLabel ? (0, import_react.createElement)("span", null, label) : null);
  return (0, import_react.createElement)(
    import_dsh_client_ui_primitives.Tooltip,
    { label: reason ?? tooltip, side: "bottom", portal: true },
    (0, import_react.createElement)("span", { className: "dsh-resend-disabled-action", tabIndex: locked ? 0 : void 0, "aria-label": locked ? reason ?? label : void 0 }, button)
  );
}
function UIStyles() {
  return (0, import_react.createElement)("style", { "data-dsh-resend-ui": true }, CSS);
}
var CSS = `
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
`;

// node_modules/zod/v4/core/util.js
function getEnumValues(entries) {
  const numericValues = Object.values(entries).filter((v) => typeof v === "number");
  const values = Object.entries(entries).filter(([k, _]) => numericValues.indexOf(+k) === -1).map(([_, v]) => v);
  return values;
}
function jsonStringifyReplacer(_, value) {
  if (typeof value === "bigint")
    return value.toString();
  return value;
}
var Cached = class {
  constructor(getter) {
    this._getter = getter;
    this._value = void 0;
  }
  get value() {
    const getter = this._getter;
    if (getter !== void 0) {
      this._value = getter();
      this._getter = void 0;
    }
    return this._value;
  }
};
function cached(getter) {
  return new Cached(getter);
}
function cleanRegex(source) {
  const start = source.startsWith("^") ? 1 : 0;
  const end = source.endsWith("$") ? source.length - 1 : source.length;
  return source.slice(start, end);
}
function assignProp(target, prop, value) {
  Object.defineProperty(target, prop, {
    value,
    writable: true,
    enumerable: true,
    configurable: true
  });
}
var captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {
};
function isObject(data) {
  return typeof data === "object" && data !== null && !Array.isArray(data);
}
var propertyKeyTypes = /* @__PURE__ */ new Set(["string", "number", "symbol"]);
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function clone(inst, def, params) {
  const cl = new inst._zod.constr(def ?? inst._zod.def);
  if (!def || params?.parent)
    cl._zod.parent = inst;
  return cl;
}
function normalizeParams(_params) {
  const params = _params;
  if (!params)
    return {};
  if (typeof params === "string")
    return { error: () => params };
  if (params?.message !== void 0) {
    if (params?.error !== void 0)
      throw new Error("Cannot specify both `message` and `error` params");
    params.error = params.message;
  }
  delete params.message;
  if (typeof params.error === "string")
    return { ...params, error: () => params.error };
  return params;
}
function optionalKeys(shape) {
  return Object.keys(shape).filter((k) => {
    return shape[k]._zod.optin !== void 0 && shape[k]._zod.optout === "optional";
  });
}
function aborted(x, startIndex = 0) {
  if (x.aborted === true)
    return true;
  for (let i2 = startIndex; i2 < x.issues.length; i2++) {
    if (x.issues[i2]?.continue !== true) {
      return true;
    }
  }
  return false;
}
function explicitlyAborted(x, startIndex = 0) {
  if (x.aborted === true)
    return true;
  for (let i2 = startIndex; i2 < x.issues.length; i2++) {
    if (x.issues[i2]?.continue === false) {
      return true;
    }
  }
  return false;
}
function prefixIssues(path, issues) {
  return issues.map((iss) => {
    var _a2;
    (_a2 = iss).path ?? (_a2.path = []);
    iss.path.unshift(path);
    return iss;
  });
}
function unwrapMessage(message) {
  return typeof message === "string" ? message : message?.message;
}
function attachSchema(issues, start, inst) {
  var _a2;
  for (let i2 = start; i2 < issues.length; i2++) {
    (_a2 = issues[i2]).schema ?? (_a2.schema = inst);
  }
}
function finalizeIssue(iss, ctx, config2) {
  var _a2;
  const traits = iss.inst?._zod?.traits;
  if (traits?.has("$ZodType")) {
    if (traits.has("$ZodCheck"))
      (_a2 = iss).schema ?? (_a2.schema = iss.inst);
    else
      iss.schema = iss.inst;
  }
  const schemaError = iss.schema !== iss.inst ? iss.schema?._zod.def?.error : void 0;
  const message = iss.message ? iss.message : unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ?? unwrapMessage(schemaError?.(iss)) ?? unwrapMessage(ctx?.error?.(iss)) ?? unwrapMessage(config2.customError?.(iss)) ?? unwrapMessage(config2.localeError?.(iss)) ?? "Invalid input";
  const full = {};
  for (const k of Object.keys(iss)) {
    if (k === "inst" || k === "schema" || k === "continue" || k === "input" || k === "__proto__")
      continue;
    full[k] = iss[k];
  }
  full.path ?? (full.path = []);
  full.message = message;
  if (ctx?.reportInput) {
    full.input = iss.input;
  }
  return full;
}
function members(proto, table) {
  for (const key in table) {
    const desc = Object.getOwnPropertyDescriptor(table, key);
    if (desc.get)
      Object.defineProperty(proto, key, { ...desc, enumerable: false });
    else
      defineBound(proto, key, desc.value);
  }
}
function own(inst, key, value, enumerable = true) {
  Object.defineProperty(inst, key, { configurable: true, writable: true, enumerable, value });
  return value;
}
function hide(inst, key, value) {
  return own(inst, key, value, false);
}
function defineBound(proto, key, fn) {
  Object.defineProperty(proto, key, {
    configurable: true,
    get() {
      return this == null ? fn : own(this, key, fn.bind(this));
    },
    set(value) {
      own(this, key, value);
    }
  });
}
function claim(inst, sentinel) {
  const proto = Object.getPrototypeOf(inst);
  return sentinel in proto ? void 0 : proto;
}
var installing;
var broke = false;
var breaker = {
  configurable: true,
  get() {
    broke = true;
    return void 0;
  }
};
function defineLazyInternal(inst, key, compute) {
  const proto = Object.getPrototypeOf(inst._zod);
  if (key in proto && installing !== inst._zod) {
    installing = void 0;
    return;
  }
  installing = inst._zod;
  Object.defineProperty(proto, key, {
    configurable: true,
    get() {
      Object.defineProperty(this, key, breaker);
      const outer = broke;
      broke = false;
      try {
        const value = compute(this);
        if (broke)
          delete this[key];
        else
          Object.defineProperty(this, key, { configurable: true, writable: true, value });
        broke = broke || outer;
        return value;
      } catch (err) {
        delete this[key];
        broke = broke || outer;
        throw err;
      }
    },
    set(value) {
      Object.defineProperty(this, key, { configurable: true, writable: true, value });
    }
  });
}
function installLazyProp(inst, key, make, enumerable) {
  const proto = claim(inst, key);
  if (!proto)
    return;
  Object.defineProperty(proto, key, {
    configurable: true,
    get() {
      const desc = { configurable: true, writable: true, enumerable, value: void 0 };
      Object.defineProperty(this, key, desc);
      desc.value = make(this);
      Object.defineProperty(this, key, desc);
      return desc.value;
    },
    set(value) {
      Object.defineProperty(this, key, { configurable: true, writable: true, enumerable, value });
    }
  });
}

// node_modules/zod/v4/core/core.js
var _a;
var _zodDesc = { value: void 0, enumerable: false };
var _E = "captureStackTrace" in Error ? Error : null;
function newError(Definition) {
  const E = _E;
  if (E) {
    const saved = E.stackTraceLimit;
    if (typeof saved === "number") {
      try {
        E.stackTraceLimit = 0;
      } catch {
        _E = null;
        return new Definition();
      }
      try {
        return new Definition();
      } finally {
        E.stackTraceLimit = saved;
      }
    }
  }
  return new Definition();
}
// @__NO_SIDE_EFFECTS__
function $constructor(name2, initializer2, proto, params) {
  const zodProto = {};
  function Internals(def) {
    this.def = def;
    this.constr = _;
    this.traits = /* @__PURE__ */ new Set();
  }
  Internals.prototype = zodProto;
  const protoMembers = proto;
  const initialized = protoMembers && /* @__PURE__ */ new WeakSet();
  function init(inst, def) {
    if (!inst._zod) {
      _zodDesc.value = new Internals(def);
      try {
        Object.defineProperty(inst, "_zod", _zodDesc);
      } finally {
        _zodDesc.value = void 0;
      }
    } else if (inst._zod.traits.has(name2)) {
      return;
    }
    inst._zod.traits.add(name2);
    initializer2(inst, def);
    if (initialized) {
      const own2 = Object.getPrototypeOf(inst);
      const ctorProto = inst._zod.constr.prototype;
      let up = own2;
      while (up && up !== ctorProto)
        up = Object.getPrototypeOf(up);
      const target = up ?? own2;
      if (!initialized.has(target)) {
        initialized.add(target);
        members(target, protoMembers);
      }
    }
    const proto2 = _.prototype;
    for (const k in proto2) {
      if (!Object.prototype.hasOwnProperty.call(proto2, k))
        continue;
      if (!(k in inst)) {
        inst[k] = proto2[k].bind(inst);
      }
    }
  }
  const Parent = params?.Parent ?? Object;
  class Definition extends Parent {
  }
  Object.defineProperty(Definition, "name", { value: name2 });
  function _(def) {
    const inst = params?.Parent ? newError(Definition) : this;
    init(inst, def);
    const deferred = inst._zod.deferred;
    if (deferred) {
      for (const fn of deferred) {
        fn();
      }
      inst._zod.deferred = void 0;
    }
    const pp = globalThis.__zod_globalConfig?.postProcessor;
    if (pp)
      pp(inst);
    return inst;
  }
  Object.defineProperty(_, "init", { value: init });
  Object.defineProperty(_, Symbol.hasInstance, {
    value: (inst) => {
      if (params?.Parent && inst instanceof params.Parent)
        return true;
      return inst?._zod?.traits?.has(name2);
    }
  });
  Object.defineProperty(_, "name", { value: name2 });
  return _;
}
var $ZodAsyncError = class extends Error {
  constructor() {
    super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
  }
};
(_a = globalThis).__zod_globalConfig ?? (_a.__zod_globalConfig = {});
var globalConfig = globalThis.__zod_globalConfig;
function config(newConfig) {
  if (newConfig)
    Object.assign(globalConfig, newConfig);
  return globalConfig;
}

// node_modules/zod/v4/core/errors.js
function _getMessage() {
  const internals = this._zod;
  internals.message ?? (internals.message = JSON.stringify(internals.def, jsonStringifyReplacer, 2));
  return internals.message;
}
function _setMessage(value) {
  this._zod.message = value;
}
var _messageDesc = {
  get: _getMessage,
  set: _setMessage,
  enumerable: true,
  configurable: true
};
var _issuesDesc = { value: void 0, enumerable: false };
var _installedToString = /* @__PURE__ */ new WeakSet([Object.prototype, Error.prototype]);
var initializer = (inst, def) => {
  inst.name = "$ZodError";
  _issuesDesc.value = def;
  Object.defineProperty(inst, "issues", _issuesDesc);
  _issuesDesc.value = void 0;
  Object.defineProperty(inst, "message", _messageDesc);
  const proto = Object.getPrototypeOf(inst);
  if (!_installedToString.has(proto)) {
    _installedToString.add(proto);
    Object.defineProperty(proto, "toString", {
      configurable: true,
      enumerable: false,
      get() {
        const value = () => this.message;
        Object.defineProperty(this, "toString", { value, configurable: true, writable: true });
        return value;
      },
      set(value) {
        Object.defineProperty(this, "toString", { value, configurable: true, writable: true });
      }
    });
  }
};
var $ZodError = $constructor("$ZodError", initializer);
var $ZodRealError = $constructor("$ZodError", initializer, void 0, {
  Parent: Error
});

// node_modules/zod/v4/core/parse.js
var _parse = (_Err) => {
  const fn = (schema2, value, _ctx, _params) => {
    const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
    const result = schema2._zod.run({ value, issues: [] }, ctx);
    if (result instanceof Promise) {
      throw new $ZodAsyncError();
    }
    if (result.issues.length) {
      const e = new (_params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
      captureStackTrace(e, _params?.callee ?? fn);
      throw e;
    }
    return result.value;
  };
  return fn;
};
var parse = /* @__PURE__ */ _parse($ZodRealError);
var _parseAsync = (_Err) => {
  const fn = async (schema2, value, _ctx, params) => {
    const ctx = _ctx ? { ..._ctx, async: true } : { async: true };
    let result = schema2._zod.run({ value, issues: [] }, ctx);
    if (result instanceof Promise)
      result = await result;
    if (result.issues.length) {
      const e = new (params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
      captureStackTrace(e, params?.callee ?? fn);
      throw e;
    }
    return result.value;
  };
  return fn;
};
var parseAsync = /* @__PURE__ */ _parseAsync($ZodRealError);
var _safeParse = (_Err) => (schema2, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
  const result = schema2._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise) {
    throw new $ZodAsyncError();
  }
  return result.issues.length ? failure(_Err, result.issues, ctx) : { success: true, data: result.value };
};
var safeParse = /* @__PURE__ */ _safeParse($ZodRealError);
function failure(Err, issues, ctx) {
  let error;
  return {
    success: false,
    get error() {
      if (!error) {
        error = new Err(issues.map((iss) => finalizeIssue(iss, ctx, config())));
        issues = void 0;
        ctx = void 0;
      }
      return error;
    },
    set error(e) {
      error = e;
      issues = void 0;
      ctx = void 0;
    }
  };
}
var _safeParseAsync = (_Err) => async (schema2, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, async: true } : { async: true };
  let result = schema2._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise)
    result = await result;
  return result.issues.length ? failure(_Err, result.issues, ctx) : { success: true, data: result.value };
};
var safeParseAsync = /* @__PURE__ */ _safeParseAsync($ZodRealError);

// node_modules/zod/v4/core/regexes.js
var anyString = /^[\s\S]{0,}$/;
var number = /^-?\d+(?:\.\d+)?$/;
var boolean = /^(?:true|false)$/i;

// node_modules/zod/v4/core/versions.js
var version = {
  major: 4,
  minor: 6,
  patch: 5
};

// node_modules/zod/v4/core/schemas.js
var $ZodType = /* @__PURE__ */ $constructor("$ZodType", (inst, def) => {
  var _a2;
  inst ?? (inst = {});
  inst._zod.def = def;
  inst._zod.bag = inst._zod.bag || {};
  inst._zod.version = version;
  const defChecks = inst._zod.def.checks;
  const checks = inst._zod.traits.has("$ZodCheck") ? [inst, ...defChecks ?? []] : defChecks?.length ? [...defChecks] : [];
  for (const ch of checks) {
    for (const fn of ch._zod.onattach) {
      fn(inst);
    }
  }
  if (checks.length === 0) {
    (_a2 = inst._zod).deferred ?? (_a2.deferred = []);
    inst._zod.deferred?.push(() => {
      inst._zod.run = inst._zod.parse;
    });
  } else {
    const runChecks = (payload, checks2, ctx) => {
      if (payload.memo)
        return payload;
      let isAborted = aborted(payload);
      let asyncResult;
      for (const ch of checks2) {
        if (ch._zod.def.when) {
          if (explicitlyAborted(payload))
            continue;
          const shouldRun = ch._zod.def.when(payload);
          if (!shouldRun)
            continue;
        } else if (isAborted) {
          continue;
        }
        const currLen = payload.issues.length;
        const _ = ch._zod.check(payload);
        if (_ instanceof Promise && ctx?.async === false) {
          throw new $ZodAsyncError();
        }
        if (asyncResult || _ instanceof Promise) {
          asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
            await _;
            const nextLen = payload.issues.length;
            if (nextLen === currLen)
              return;
            attachSchema(payload.issues, currLen, inst);
            if (!isAborted)
              isAborted = aborted(payload, currLen);
          });
        } else {
          const nextLen = payload.issues.length;
          if (nextLen === currLen)
            continue;
          attachSchema(payload.issues, currLen, inst);
          if (!isAborted)
            isAborted = aborted(payload, currLen);
        }
      }
      if (asyncResult) {
        return asyncResult.then(() => {
          return payload;
        });
      }
      return payload;
    };
    const handleCanaryResult = (canary, payload, ctx) => {
      if (aborted(canary)) {
        canary.aborted = true;
        return canary;
      }
      const checkResult = runChecks(payload, checks, ctx);
      if (checkResult instanceof Promise) {
        if (ctx.async === false)
          throw new $ZodAsyncError();
        return checkResult.then((checkResult2) => inst._zod.parse(checkResult2, ctx));
      }
      return inst._zod.parse(checkResult, ctx);
    };
    inst._zod.run = (payload, ctx) => {
      if (ctx.skipChecks) {
        return inst._zod.parse(payload, ctx);
      }
      if (ctx.direction === "backward") {
        const canary = inst._zod.parse({ value: payload.value, issues: [] }, { ...ctx, skipChecks: true });
        if (canary instanceof Promise) {
          return canary.then((canary2) => {
            return handleCanaryResult(canary2, payload, ctx);
          });
        }
        return handleCanaryResult(canary, payload, ctx);
      }
      const result = inst._zod.parse(payload, ctx);
      if (result instanceof Promise) {
        if (ctx.async === false)
          throw new $ZodAsyncError();
        return result.then((result2) => runChecks(result2, checks, ctx));
      }
      return runChecks(result, checks, ctx);
    };
  }
}, {
  // Wrappers extend this by installing a richer factory over it; reading it eagerly would defeat the laziness.
  get "~standard"() {
    return hide(this, "~standard", standardProps(this));
  },
  set "~standard"(value) {
    own(this, "~standard", value);
  }
});
var toStandardResult = (r, ctx) => r.issues.length ? { issues: r.issues.map((iss) => finalizeIssue(iss, ctx, config())) } : { value: r.value };
async function validateAsync(inst, value) {
  const ctx = { async: true };
  return toStandardResult(await inst._zod.run({ value, issues: [] }, ctx), ctx);
}
function standardProps(inst) {
  return {
    validate: (value) => {
      const ctx = { async: false };
      try {
        const r = inst._zod.run({ value, issues: [] }, ctx);
        if (!(r instanceof Promise))
          return toStandardResult(r, ctx);
      } catch (_) {
      }
      return validateAsync(inst, value);
    },
    vendor: "zod",
    version: 1
  };
}
var $ZodString = /* @__PURE__ */ $constructor("$ZodString", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = def.pattern ?? anyString;
  inst._zod.parse = (payload, _) => {
    if (def.coerce)
      try {
        payload.value = String(payload.value);
      } catch (_2) {
      }
    if (typeof payload.value === "string")
      return payload;
    payload.issues.push({
      expected: "string",
      code: "invalid_type",
      input: payload.value,
      inst
    });
    return payload;
  };
});
var $ZodNumber = /* @__PURE__ */ $constructor("$ZodNumber", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = number;
  inst._zod.parse = (payload, _ctx) => {
    if (def.coerce)
      try {
        payload.value = Number(payload.value);
      } catch (_) {
      }
    const input = payload.value;
    if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) {
      return payload;
    }
    const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? String(input) : void 0 : void 0;
    payload.issues.push({
      expected: "number",
      code: "invalid_type",
      input,
      inst,
      ...received ? { received } : {}
    });
    return payload;
  };
});
var $ZodBoolean = /* @__PURE__ */ $constructor("$ZodBoolean", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = boolean;
  inst._zod.parse = (payload, _ctx) => {
    if (def.coerce)
      try {
        payload.value = Boolean(payload.value);
      } catch (_) {
      }
    const input = payload.value;
    if (typeof input === "boolean")
      return payload;
    payload.issues.push({
      expected: "boolean",
      code: "invalid_type",
      input,
      inst
    });
    return payload;
  };
});
var $ZodNever = /* @__PURE__ */ $constructor("$ZodNever", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _ctx) => {
    payload.issues.push({
      expected: "never",
      code: "invalid_type",
      input: payload.value,
      inst
    });
    return payload;
  };
});
function handleArrayResult(result, final, index) {
  if (result.issues.length) {
    final.issues.push(...prefixIssues(index, result.issues));
  }
  final.value[index] = result.value;
}
var $ZodArray = /* @__PURE__ */ $constructor("$ZodArray", (inst, def) => {
  $ZodType.init(inst, def);
  const memo = globalConfig.memoizer;
  memo?.attach(inst);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    if (!Array.isArray(input)) {
      payload.issues.push({
        expected: "array",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    payload.value = memo ? memo.alloc(inst, payload, Array(input.length), ctx) : Array(input.length);
    const proms = [];
    const abortEarly = ctx?.abortEarly;
    for (let i2 = 0; i2 < input.length; i2++) {
      const item = input[i2];
      const result = def.element._zod.run({
        value: item,
        issues: []
      }, ctx);
      if (result instanceof Promise) {
        proms.push(result.then((result2) => handleArrayResult(result2, payload, i2)));
      } else {
        handleArrayResult(result, payload, i2);
        if (abortEarly && result.issues.length !== 0 && aborted(result))
          break;
      }
    }
    if (proms.length) {
      return Promise.all(proms).then(() => payload);
    }
    return payload;
  };
});
function handlePropertyResult(result, final, key, input, optin, optout) {
  const isPresent = key in input;
  const isOptionalOut = optout === "optional";
  if (!isPresent && isOptionalOut && optin === "optional") {
    return;
  }
  if (result.issues.length) {
    if (optin !== void 0 && isOptionalOut && !isPresent) {
      return;
    }
    final.issues.push(...prefixIssues(key, result.issues));
  }
  if (!isPresent && optin === void 0) {
    if (!result.issues.length) {
      final.issues.push({
        code: "invalid_type",
        expected: "nonoptional",
        input: void 0,
        path: [key]
      });
    }
    return;
  }
  if (result.value === void 0) {
    if (isPresent || optin === "defaulted" && !isOptionalOut) {
      final.value[key] = void 0;
    }
  } else {
    final.value[key] = result.value;
  }
}
var NO_SYMBOL_KEYS = [];
function normalizeDef(def) {
  const keys2 = Object.keys(def.shape);
  const ownSymbols = Object.getOwnPropertySymbols(def.shape);
  const symbolKeys = ownSymbols.length ? ownSymbols : NO_SYMBOL_KEYS;
  const allKeys = symbolKeys.length ? [...keys2, ...symbolKeys] : keys2;
  for (const k of allKeys) {
    if (!def.shape?.[k]?._zod?.traits?.has("$ZodType")) {
      throw new Error(`Invalid element at key "${String(k)}": expected a Zod schema`);
    }
  }
  const okeys = optionalKeys(def.shape);
  return {
    ...def,
    allKeys,
    symbolKeys,
    // string-only: handleCatchall matches it against `for...in`, which never yields a symbol
    keySet: new Set(keys2),
    numKeys: keys2.length,
    optionalKeys: new Set(okeys)
  };
}
function handleCatchall(proms, input, payload, ctx, def, inst, abortEarly) {
  const unrecognized = [];
  const keySet = def.keySet;
  const _catchall = def.catchall._zod;
  const t = _catchall.def.type;
  const optin = _catchall.optin;
  const optout = _catchall.optout;
  let seen = 0;
  for (const key in input) {
    if (abortEarly && payload.issues.length !== seen) {
      if (aborted(payload, seen))
        break;
      seen = payload.issues.length;
    }
    if (keySet.has(key))
      continue;
    if (key === "__proto__") {
      if (t === "never")
        unrecognized.push(key);
      continue;
    }
    if (t === "never") {
      unrecognized.push(key);
      continue;
    }
    const r = _catchall.run({ value: input[key], issues: [] }, ctx);
    if (r instanceof Promise) {
      proms.push(r.then((r2) => handlePropertyResult(r2, payload, key, input, optin, optout)));
    } else {
      handlePropertyResult(r, payload, key, input, optin, optout);
    }
  }
  if (unrecognized.length) {
    payload.issues.push({
      code: "unrecognized_keys",
      keys: unrecognized,
      input,
      inst,
      // Describes the shape of the input, not the validity of the parsed value, so it never aborts. The parse still fails; the schema's own checks just get to run first, and an enclosing intersection can reconcile the key against a sibling operand.
      continue: true
    });
  }
  if (!proms.length)
    return payload;
  return Promise.all(proms).then(() => {
    return payload;
  });
}
var $ZodObject = /* @__PURE__ */ $constructor("$ZodObject", (inst, def) => {
  $ZodType.init(inst, def);
  const desc = Object.getOwnPropertyDescriptor(def, "shape");
  const sh = desc?.get ? desc.get.raw : def.shape ?? {};
  if (sh) {
    const get2 = () => {
      const newSh = { ...sh };
      Object.defineProperty(def, "shape", { value: newSh });
      get2.raw = newSh;
      return newSh;
    };
    get2.raw = sh;
    Object.defineProperty(def, "shape", { get: get2 });
  }
  const _normalized = cached(() => normalizeDef(def));
  defineLazyInternal(inst, "propValues", (zod) => {
    const shape = zod.def.shape;
    const propValues = {};
    for (const key in shape) {
      const field = shape[key]._zod;
      if (field.values) {
        if (!Object.prototype.hasOwnProperty.call(propValues, key)) {
          assignProp(propValues, key, /* @__PURE__ */ new Set());
        }
        for (const v of field.values)
          propValues[key].add(v);
        if (field.optin !== void 0)
          propValues[key].add(void 0);
      }
    }
    return propValues;
  });
  const isObject2 = isObject;
  const catchall = def.catchall;
  let value;
  const memo = globalConfig.memoizer;
  memo?.attach(inst);
  inst._zod.parse = (payload, ctx) => {
    value ?? (value = _normalized.value);
    const input = payload.value;
    if (!isObject2(input)) {
      payload.issues.push({
        expected: "object",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    payload.value = memo ? memo.alloc(inst, payload, {}, ctx) : {};
    const proms = [];
    const shape = value.shape;
    const abortEarly = ctx?.abortEarly;
    let seen = payload.issues.length;
    for (const key of value.allKeys) {
      if (abortEarly && payload.issues.length !== seen) {
        if (aborted(payload, seen))
          break;
        seen = payload.issues.length;
      }
      if (key === "__proto__")
        continue;
      const el = shape[key];
      const optin = el._zod.optin;
      const optout = el._zod.optout;
      const r = el._zod.run({ value: input[key], issues: [] }, ctx);
      if (r instanceof Promise) {
        proms.push(r.then((r2) => handlePropertyResult(r2, payload, key, input, optin, optout)));
      } else {
        handlePropertyResult(r, payload, key, input, optin, optout);
      }
    }
    if (!catchall) {
      return proms.length ? Promise.all(proms).then(() => payload) : payload;
    }
    return handleCatchall(proms, input, payload, ctx, _normalized.value, inst, abortEarly === true);
  };
});
function handleUnionResults(results, final, inst, ctx) {
  for (const result of results) {
    if (result.issues.length === 0) {
      final.value = result.value;
      return final;
    }
  }
  const nonaborted = results.filter((r) => !aborted(r));
  if (nonaborted.length === 1) {
    final.value = nonaborted[0].value;
    return nonaborted[0];
  }
  final.issues.push({
    code: "invalid_union",
    input: final.value,
    inst,
    errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  });
  return final;
}
var $ZodUnion = /* @__PURE__ */ $constructor("$ZodUnion", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazyInternal(inst, "optin", (zod) => zod.def.options.some((o) => o._zod.optin === "defaulted") ? "defaulted" : zod.def.options.some((o) => o._zod.optin !== void 0) ? "optional" : void 0);
  defineLazyInternal(inst, "optout", (zod) => zod.def.options.some((o) => o._zod.optout === "optional") ? "optional" : void 0);
  defineLazyInternal(inst, "values", (zod) => {
    if (zod.def.options.every((o) => o._zod.values)) {
      return new Set(zod.def.options.flatMap((option) => Array.from(option._zod.values)));
    }
    return void 0;
  });
  defineLazyInternal(inst, "pattern", (zod) => {
    if (zod.def.options.every((o) => o._zod.pattern)) {
      const patterns = zod.def.options.map((o) => o._zod.pattern);
      return new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
    }
    return void 0;
  });
  const first = def.options.length === 1 ? def.options[0]._zod.run : null;
  inst._zod.parse = (payload, ctx) => {
    if (first) {
      return first(payload, ctx);
    }
    let async = false;
    const results = [];
    for (const option of def.options) {
      const result = option._zod.run({
        value: payload.value,
        issues: []
      }, ctx);
      if (result instanceof Promise) {
        results.push(result);
        async = true;
      } else {
        if (result.issues.length === 0)
          return result;
        results.push(result);
      }
    }
    if (!async)
      return handleUnionResults(results, payload, inst, ctx);
    return Promise.all(results).then((results2) => {
      return handleUnionResults(results2, payload, inst, ctx);
    });
  };
});
var $ZodEnum = /* @__PURE__ */ $constructor("$ZodEnum", (inst, def) => {
  $ZodType.init(inst, def);
  const values = getEnumValues(def.entries);
  const valuesSet = new Set(values);
  inst._zod.values = valuesSet;
  defineLazyInternal(inst, "pattern", (zod) => {
    const patternValues = getEnumValues(zod.def.entries).filter((k) => propertyKeyTypes.has(typeof k));
    return new RegExp(patternValues.length ? `^(${patternValues.map((o) => escapeRegex(o.toString())).join("|")})$` : "^[^\\s\\S]$");
  });
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (valuesSet.has(input)) {
      return payload;
    }
    payload.issues.push({
      code: "invalid_value",
      values,
      input,
      inst
    });
    return payload;
  };
});
var $ZodLiteral = /* @__PURE__ */ $constructor("$ZodLiteral", (inst, def) => {
  $ZodType.init(inst, def);
  const values = new Set(def.values);
  inst._zod.values = values;
  defineLazyInternal(inst, "pattern", (zod) => {
    const vals = zod.def.values;
    return new RegExp(vals.length ? `^(${vals.map((o) => typeof o === "string" ? escapeRegex(o) : o ? escapeRegex(o.toString()) : String(o)).join("|")})$` : "^[^\\s\\S]$");
  });
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (values.has(input)) {
      return payload;
    }
    payload.issues.push({
      code: "invalid_value",
      values: def.values,
      input,
      inst
    });
    return payload;
  };
});
function handleOptionalResult(payload, result) {
  payload.value = result.issues.length ? void 0 : result.value;
  return payload;
}
var $ZodOptional = /* @__PURE__ */ $constructor("$ZodOptional", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazyInternal(inst, "optin", (zod) => zod.def.innerType._zod.optin === "defaulted" ? "defaulted" : "optional");
  inst._zod.optout = "optional";
  defineLazyInternal(inst, "values", (zod) => {
    const values = zod.def.innerType._zod.values;
    return values ? /* @__PURE__ */ new Set([...values, void 0]) : void 0;
  });
  defineLazyInternal(inst, "pattern", (zod) => {
    const pattern = zod.def.innerType._zod.pattern;
    return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : void 0;
  });
  inst._zod.parse = (payload, ctx) => {
    if (payload.value === void 0) {
      if (def.innerType._zod.optin !== "defaulted")
        return payload;
      const result = def.innerType._zod.run({ value: payload.value, issues: [] }, ctx);
      if (result instanceof Promise)
        return result.then((result2) => handleOptionalResult(payload, result2));
      return handleOptionalResult(payload, result);
    }
    return def.innerType._zod.run(payload, ctx);
  };
});
var $ZodReadonly = /* @__PURE__ */ $constructor("$ZodReadonly", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazyInternal(inst, "propValues", (zod) => zod.def.innerType._zod.propValues);
  defineLazyInternal(inst, "values", (zod) => zod.def.innerType._zod.values);
  defineLazyInternal(inst, "optin", (zod) => zod.def.innerType?._zod?.optin);
  defineLazyInternal(inst, "optout", (zod) => zod.def.innerType?._zod?.optout);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then(handleReadonlyResult);
    }
    return handleReadonlyResult(result);
  };
});
function handleReadonlyResult(payload) {
  if (!payload.memo)
    payload.value = Object.freeze(payload.value);
  return payload;
}

// node_modules/zod/v4/core/api.js
function snapshotChecks(def) {
  if (def.checks)
    def.checks = [...def.checks];
  return def;
}
// @__NO_SIDE_EFFECTS__
function _string(Class, params) {
  return new Class(snapshotChecks({ type: "string", ...normalizeParams(params) }));
}
// @__NO_SIDE_EFFECTS__
function _number(Class, params) {
  return new Class(snapshotChecks({ type: "number", checks: [], ...normalizeParams(params) }));
}
// @__NO_SIDE_EFFECTS__
function _boolean(Class, params) {
  return new Class({
    type: "boolean",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _never(Class, params) {
  return new Class({
    type: "never",
    ...normalizeParams(params)
  });
}

// node_modules/zod/v4/mini/schemas.js
var ZodMiniType = /* @__PURE__ */ $constructor("ZodMiniType", (inst, def) => {
  if (!inst._zod)
    throw new Error("Uninitialized schema in ZodMiniType.");
  $ZodType.init(inst, def);
  inst.def = def;
  inst.type = def.type;
}, {
  // `with` is an alias for `check`: the same function object, not a wrapper.
  get with() {
    return this.check;
  },
  set with(value) {
    own(this, "with", value);
  },
  parse(data, params) {
    return parse(this, data, params, { callee: this.parse });
  },
  parseAsync(data, params) {
    return parseAsync(this, data, params, { callee: this.parseAsync });
  },
  safeParse(data, params) {
    return safeParse(this, data, params);
  },
  safeParseAsync(data, params) {
    return safeParseAsync(this, data, params);
  },
  check(...checks) {
    const def = this.def;
    return this.clone({
      ...def,
      checks: [
        ...def.checks ?? [],
        ...checks.map((ch) => typeof ch === "function" ? { _zod: { check: ch, def: { check: "custom" }, onattach: [] } } : ch)
      ]
    }, { parent: true });
  },
  clone(_def, params) {
    return clone(this, _def, params);
  },
  brand() {
    return this;
  },
  register(reg, meta2) {
    reg.add(this, meta2);
    return this;
  },
  apply(fn, ...args) {
    return args.length === 0 ? fn(this) : fn(this, ...args);
  }
});
var ZodMiniString = /* @__PURE__ */ $constructor("ZodMiniString", (inst, def) => {
  $ZodString.init(inst, def);
  ZodMiniType.init(inst, def);
});
// @__NO_SIDE_EFFECTS__
function string2(params) {
  return _string(ZodMiniString, params);
}
var ZodMiniNumber = /* @__PURE__ */ $constructor("ZodMiniNumber", (inst, def) => {
  $ZodNumber.init(inst, def);
  ZodMiniType.init(inst, def);
});
// @__NO_SIDE_EFFECTS__
function number2(params) {
  return _number(ZodMiniNumber, params);
}
var ZodMiniBoolean = /* @__PURE__ */ $constructor("ZodMiniBoolean", (inst, def) => {
  $ZodBoolean.init(inst, def);
  ZodMiniType.init(inst, def);
});
// @__NO_SIDE_EFFECTS__
function boolean2(params) {
  return _boolean(ZodMiniBoolean, params);
}
var ZodMiniNever = /* @__PURE__ */ $constructor("ZodMiniNever", (inst, def) => {
  $ZodNever.init(inst, def);
  ZodMiniType.init(inst, def);
});
// @__NO_SIDE_EFFECTS__
function never(params) {
  return _never(ZodMiniNever, params);
}
var ZodMiniArray = /* @__PURE__ */ $constructor("ZodMiniArray", (inst, def) => {
  $ZodArray.init(inst, def);
  ZodMiniType.init(inst, def);
});
// @__NO_SIDE_EFFECTS__
function array(element, params) {
  return new ZodMiniArray({
    type: "array",
    element,
    ...normalizeParams(params)
  });
}
var ZodMiniObject = /* @__PURE__ */ $constructor("ZodMiniObject", (inst, def) => {
  $ZodObject.init(inst, def);
  ZodMiniType.init(inst, def);
  installLazyProp(inst, "shape", (self) => self._zod.def.shape, false);
});
// @__NO_SIDE_EFFECTS__
function strictObject(shape, params) {
  return new ZodMiniObject({
    type: "object",
    shape,
    catchall: /* @__PURE__ */ never(),
    ...normalizeParams(params)
  });
}
var ZodMiniUnion = /* @__PURE__ */ $constructor("ZodMiniUnion", (inst, def) => {
  $ZodUnion.init(inst, def);
  ZodMiniType.init(inst, def);
});
// @__NO_SIDE_EFFECTS__
function union(options, params) {
  return new ZodMiniUnion({
    type: "union",
    options,
    ...normalizeParams(params)
  });
}
var ZodMiniEnum = /* @__PURE__ */ $constructor("ZodMiniEnum", (inst, def) => {
  $ZodEnum.init(inst, def);
  ZodMiniType.init(inst, def);
  inst.options = [...inst._zod.values];
});
// @__NO_SIDE_EFFECTS__
function _enum(values, params) {
  const entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
  return new ZodMiniEnum({
    type: "enum",
    entries,
    ...normalizeParams(params)
  });
}
var ZodMiniLiteral = /* @__PURE__ */ $constructor("ZodMiniLiteral", (inst, def) => {
  $ZodLiteral.init(inst, def);
  ZodMiniType.init(inst, def);
});
// @__NO_SIDE_EFFECTS__
function literal(value, params) {
  return new ZodMiniLiteral({
    type: "literal",
    values: Array.isArray(value) ? value : [value],
    ...normalizeParams(params)
  });
}
var ZodMiniOptional = /* @__PURE__ */ $constructor("ZodMiniOptional", (inst, def) => {
  $ZodOptional.init(inst, def);
  ZodMiniType.init(inst, def);
});
// @__NO_SIDE_EFFECTS__
function optional(innerType) {
  return new ZodMiniOptional({
    type: "optional",
    innerType
  });
}
var ZodMiniReadonly = /* @__PURE__ */ $constructor("ZodMiniReadonly", (inst, def) => {
  $ZodReadonly.init(inst, def);
  ZodMiniType.init(inst, def);
});
// @__NO_SIDE_EFFECTS__
function readonly(innerType) {
  return new ZodMiniReadonly({
    type: "readonly",
    innerType
  });
}

// src/error-codes.js
var ERROR_CODES = Object.freeze([
  "bad-request",
  "session-not-found",
  "agent-unavailable",
  "agent-busy",
  "message-not-found",
  "message-pending",
  "target-shadowed",
  "not-user-message",
  "not-last-reply",
  "not-last-user-message",
  "not-assistant-message",
  "blank-text",
  "no-text",
  "internal"
]);

// src/typert.js
var PACKAGE = "dsh-resend";
var SERVICE = "resend";
var NAMESPACE = "resend";
var METHOD = "apply";
var endpointOf = (descriptor) => `${descriptor.namespace}/${descriptor.method}`;
var ENDPOINT = endpointOf({ namespace: NAMESPACE, method: METHOD });
var INVOCATION_ID = `${PACKAGE}#${ENDPOINT}`;
var requestSchema;
function resendApplyRequestSchema() {
  return requestSchema ??= strictObject({
    sessionId: readonly(string2()),
    targetSeq: readonly(number2()),
    op: readonly(_enum(["edit", "regenerate"])),
    text: optional(readonly(string2()))
  });
}
var resultSchema;
function resendApplyResultSchema() {
  return resultSchema ??= union([
    strictObject({
      ok: readonly(literal(true)),
      value: readonly(strictObject({
        carrierSeq: readonly(number2()),
        shadowedSeqs: readonly(array(number2())),
        resendMessageId: optional(readonly(string2()))
      }))
    }),
    strictObject({
      ok: readonly(literal(false)),
      error: readonly(union(ERROR_CODES.map((code2) => strictObject({ code: readonly(literal(code2)) }))))
    })
  ]);
}
var descriptors = [
  {
    id: INVOCATION_ID,
    service: SERVICE,
    namespace: NAMESPACE,
    method: METHOD,
    // Unary: `invocation.kind` is `direct`, and `mode`, `scope`, `cancellation`
    // and lookup parameters are all omitted — the registry allows `mode` only as
    // `'stream'`, so a unary method omits it entirely (spec §6.3 rule 6).
    invocation: { kind: "direct" },
    parameters: [
      {
        name: "request",
        wire: "request",
        source: "json",
        codec: {
          mode: "strict",
          // Nothing verifies this string beyond non-emptiness (this plugin has no
          // lookup or Context provider). It is still the only human-readable trace
          // when a strict definition and its provider disagree, so it names the
          // type this schema actually is.
          typeSymbol: `${PACKAGE}/types#ResendApplyRequest`,
          create: resendApplyRequestSchema
        }
      }
    ],
    result: {
      mode: "strict",
      typeSymbol: `${PACKAGE}/types#ResendApplyResult`,
      create: resendApplyResultSchema
    }
  }
];
function rollbackRequestSchema() {
  return strictObject({
    sessionId: string2(),
    carrierSeq: number2(),
    phase: _enum(["status", "preview", "execute", "cancel"]),
    scope: optional(literal("artifacts")),
    planId: optional(string2())
  });
}
function rollbackResultSchema() {
  return union([
    strictObject({ ok: literal(false), error: strictObject({
      code: string2(),
      files: optional(array(strictObject({ path: string2(), action: _enum(["restored", "refuse"]), reason: optional(string2()) })))
    }) }),
    strictObject({ ok: literal(true), value: strictObject({
      planId: string2(),
      scope: optional(literal("artifacts")),
      completed: optional(boolean2()),
      empty: optional(boolean2()),
      files: array(strictObject({ path: string2(), action: _enum(["restore", "refuse"]), reason: optional(string2()) }))
    }) })
  ]);
}
descriptors.push({
  id: `${PACKAGE}#${NAMESPACE}/rollback`,
  service: SERVICE,
  namespace: NAMESPACE,
  method: "rollback",
  invocation: { kind: "direct" },
  parameters: [{ name: "request", wire: "request", source: "json", codec: {
    mode: "strict",
    typeSymbol: `${PACKAGE}/types#RollbackRequest`,
    create: rollbackRequestSchema
  } }],
  result: { mode: "strict", typeSymbol: `${PACKAGE}/types#RollbackResult`, create: rollbackResultSchema }
});
function conversationRequestSchema() {
  return strictObject({ sessionId: readonly(string2()) });
}
function conversationResultSchema() {
  return union([
    strictObject({ ok: literal(true), value: strictObject({
      assistantSeqs: array(number2()),
      lastReplySeq: optional(number2()),
      userSeqs: array(number2()),
      lastUserSeq: optional(number2())
    }) }),
    strictObject({ ok: literal(false), error: union(ERROR_CODES.map((code2) => strictObject({ code: literal(code2) }))) })
  ]);
}
descriptors.push({
  id: `${PACKAGE}#${NAMESPACE}/conversation`,
  service: SERVICE,
  namespace: NAMESPACE,
  method: "conversation",
  invocation: { kind: "direct" },
  parameters: [{ name: "request", wire: "request", source: "json", codec: {
    mode: "strict",
    typeSymbol: `${PACKAGE}/types#ConversationRequest`,
    create: conversationRequestSchema
  } }],
  result: { mode: "strict", typeSymbol: `${PACKAGE}/types#ConversationResult`, create: conversationResultSchema }
});
function cleanupRequestSchema() {
  return strictObject({
    phase: _enum(["list", "preview", "execute", "cancel"]),
    mode: _enum(["residue", "sessions"]),
    sessionIds: optional(array(string2())),
    planId: optional(string2())
  });
}
function cleanupResultSchema() {
  const session = strictObject({
    sessionId: string2(),
    title: string2(),
    projectPath: string2(),
    records: number2(),
    bytes: number2(),
    noSnapshots: boolean2()
  });
  return union([
    strictObject({ ok: literal(false), error: strictObject({ code: string2() }) }),
    strictObject({ ok: literal(true), value: union([
      strictObject({ phase: literal("list"), sessions: array(session), unreadableSessions: number2() }),
      strictObject({ phase: literal("cancel") }),
      strictObject({
        phase: literal("preview"),
        planId: string2(),
        sessions: array(session),
        categories: array(strictObject({ kind: _enum(["records", "outcomes", "objects", "temporary"]), count: number2(), bytes: number2() })),
        estimatedBytes: number2(),
        itemCount: number2(),
        protectedObjects: boolean2(),
        unreadableSessions: number2()
      }),
      strictObject({
        phase: literal("execute"),
        releasedBytes: number2(),
        results: array(strictObject({ sessionId: string2(), title: string2(), status: _enum(["cleaned", "skipped", "failed"]), reason: string2(), bytes: number2() })),
        failures: array(strictObject({ item: string2(), reason: string2() })),
        changedCount: number2(),
        protectedObjects: boolean2()
      })
    ]) })
  ]);
}
descriptors.push({
  id: `${PACKAGE}#${NAMESPACE}/cleanup`,
  service: SERVICE,
  namespace: NAMESPACE,
  method: "cleanup",
  invocation: { kind: "direct" },
  parameters: [{ name: "request", wire: "request", source: "json", codec: {
    mode: "strict",
    typeSymbol: `${PACKAGE}/types#CleanupRequest`,
    create: cleanupRequestSchema
  } }],
  result: { mode: "strict", typeSymbol: `${PACKAGE}/types#CleanupResult`, create: cleanupResultSchema }
});
function replayRequestSchema() {
  return union([
    strictObject({ phase: literal("start"), request: resendApplyRequestSchema() }),
    strictObject({ phase: _enum(["preview", "restore", "keep", "cancel"]), sessionId: string2(), preflightId: string2() })
  ]);
}
function replayResultSchema() {
  return union([
    resendApplyResultSchema(),
    rollbackResultSchema(),
    strictObject({ ok: literal(true), value: strictObject({ canceled: literal(true) }) }),
    strictObject({ ok: literal(true), value: strictObject({
      preflight: literal(true),
      preflightId: string2(),
      userSeq: number2(),
      op: _enum(["edit", "regenerate"]),
      planId: string2(),
      completed: optional(boolean2()),
      scope: optional(literal("artifacts")),
      files: array(strictObject({ path: string2(), action: _enum(["restore", "refuse"]), reason: optional(string2()) }))
    }) })
  ]);
}
descriptors.push({
  id: `${PACKAGE}#${NAMESPACE}/replay`,
  service: SERVICE,
  namespace: NAMESPACE,
  method: "replay",
  invocation: { kind: "direct" },
  parameters: [{ name: "request", wire: "request", source: "json", codec: {
    mode: "strict",
    typeSymbol: `${PACKAGE}/types#ReplayRequest`,
    create: replayRequestSchema
  } }],
  result: { mode: "strict", typeSymbol: `${PACKAGE}/types#ReplayResult`, create: replayResultSchema }
});

// src/panel-boundary.js
var translatorOrKey = (t) => typeof t === "function" ? t : (key) => key;
var PanelBoundary = class extends import_react2.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  /**
   * React's error-boundary hook: the first thrown value becomes this surface's
   * state, and the surface renders its own failure row instead of unmounting the
   * host's tree.
   */
  static getDerivedStateFromError(error) {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }
  /** Report the failure on the only channel a browser half has. */
  componentDidCatch(error) {
    const message = error instanceof Error ? error.message : String(error);
    if (typeof console !== "undefined" && typeof console.warn === "function") {
      console.warn(`[${PACKAGE}] a registered surface failed to render: ${message}`);
    }
  }
  render() {
    const { error } = this.state;
    if (error === null) return this.props.children;
    const t = translatorOrKey(this.props.t);
    const title = typeof this.props.title === "string" && this.props.title !== "" ? this.props.title : t("panel.errorTitle");
    return (0, import_react2.createElement)("div", null, [
      this.props.fallback && (0, import_react2.createElement)(import_react2.Fragment, { key: "original" }, this.props.fallback),
      (0, import_react2.createElement)("div", { key: "error", className: "dsh-resend-panel-error", role: "alert" }, [
        (0, import_react2.createElement)(UIStyles, { key: "ui" }),
        (0, import_react2.createElement)("div", { key: "title", className: "dsh-resend-panel-error-title" }, title),
        (0, import_react2.createElement)("div", { key: "hint", className: "dsh-resend-panel-error-hint" }, t("panel.errorHint")),
        (0, import_react2.createElement)("pre", { key: "detail", className: "dsh-resend-panel-error-detail" }, String(error.message ?? error)),
        (0, import_react2.createElement)(IconAction, {
          key: "retry",
          label: t("panel.retry"),
          icon: import_dsh_client_ui_primitives2.IconRefreshOutlineRegular,
          onClick: () => this.setState({ error: null })
        })
      ])
    ]);
  }
};
function withPanelBoundary(Surface, titleKey, baseTranslate, Fallback) {
  return function Panel({ t, ...props }) {
    const translate = translatorOrKey(t ?? baseTranslate);
    return (0, import_react2.createElement)(
      PanelBoundary,
      { t: translate, title: translate(titleKey), fallback: Fallback ? (0, import_react2.createElement)(Fallback, { ...props, t: translate }) : void 0 },
      (0, import_react2.createElement)(Surface, { t: translate, ...props })
    );
  };
}

// src/client.js
var import_react16 = require("react");

// src/settings-navigation.js
var import_react3 = require("react");
var import_dsh_client_ui_primitives3 = require("@deepseek-ai/dsh-client-ui-primitives");
function SettingsNavigationLabel({ text }) {
  return (0, import_react3.createElement)("span", { className: "dsh-resend-settings-nav-label" }, [
    (0, import_react3.createElement)(import_dsh_client_ui_primitives3.IconEditOutlineRegular, { key: "icon", size: 16, "aria-hidden": true }),
    (0, import_react3.createElement)("span", { key: "text" }, text)
  ]);
}

// src/storage-cleanup-ui.js
var import_react4 = require("react");
var import_dsh_client_ui_primitives4 = require("@deepseek-ai/dsh-client-ui-primitives");
var formatStorageBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
};
var icon = (kind, key = kind) => (0, import_react4.createElement)("svg", {
  key,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  className: kind === "spinner" ? "dsh-resend-cleanup-spinner" : void 0
}, (0, import_react4.createElement)("path", { d: {
  spinner: "M21 12a9 9 0 1 1-9-9",
  storage: "M4 5h16v5H4z M4 14h16v5H4z M7 7.5h.01 M7 16.5h.01",
  residue: "m15 3 6 6-12 12-6-6z M9 9l6 6 M14 21h7",
  sessions: "M5 3h10l4 4v14H5z M14 3v5h5 M9 12h6 M9 16h6",
  arrow: "M5 12h14 m-5-5 5 5-5 5"
}[kind] }));
function StorageCleanup({ operations, t }) {
  const [mode, setMode] = (0, import_react4.useState)("residue");
  const [answer, setAnswer] = (0, import_react4.useState)();
  const [selected, setSelected] = (0, import_react4.useState)([]);
  const [pending, setPending] = (0, import_react4.useState)(false);
  const [error, setError] = (0, import_react4.useState)("");
  const inFlight = (0, import_react4.useRef)(false);
  async function call(request) {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(request.phase);
    setError("");
    try {
      const result = await operations.cleanup(request);
      if (!result.ok) {
        setError(result.error.code);
        return;
      }
      setAnswer(result.value.phase === "cancel" ? void 0 : result.value);
    } catch {
      setError("connection");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }
  async function open(next) {
    if (inFlight.current) return;
    if (answer?.phase === "preview") {
      await call({ mode, phase: "cancel", planId: answer.planId });
    }
    setMode(next);
    setAnswer(void 0);
    setSelected([]);
    await call({ mode: next, phase: next === "sessions" ? "list" : "preview" });
  }
  const button = (key, text, onClick, disabled = false, variant = "outline") => {
    const working = pending === { preview: "preview", confirm: "execute", cancel: "cancel" }[key];
    return (0, import_react4.createElement)(import_dsh_client_ui_primitives4.Button, {
      key,
      type: "button",
      disabled: !!pending || disabled,
      onClick,
      size: "sm",
      variant,
      className: "dsh-resend-cleanup-button",
      "aria-busy": working || void 0
    }, [working ? icon("spinner") : null, (0, import_react4.createElement)("span", { key: "text" }, text)]);
  };
  const sessions = answer?.sessions ?? [];
  const entry = (next) => (0, import_react4.createElement)("button", {
    key: next,
    type: "button",
    className: "dsh-resend-cleanup-entry",
    disabled: !!pending,
    "aria-label": t("cleanup." + next),
    "aria-pressed": mode === next && (!!answer || !!pending),
    onClick: () => {
      void open(next);
    }
  }, [icon(next), (0, import_react4.createElement)("span", { key: "copy", className: "dsh-resend-cleanup-entry-copy" }, [
    (0, import_react4.createElement)("strong", { key: "title" }, t("cleanup." + next)),
    (0, import_react4.createElement)("span", { key: "hint" }, t("cleanup." + next + "Hint"))
  ]), icon("arrow")]);
  return (0, import_react4.createElement)("section", { className: "dsh-resend-cleanup", "aria-label": t("cleanup.heading"), "aria-busy": !!pending }, [
    (0, import_react4.createElement)("div", { key: "heading", className: "dsh-resend-cleanup-heading" }, [icon("storage"), (0, import_react4.createElement)("h3", { key: "title" }, t("cleanup.heading"))]),
    (0, import_react4.createElement)("p", { key: "scope", className: "dsh-resend-settings-description" }, t("cleanup.scope")),
    (0, import_react4.createElement)("div", { key: "entries", className: "dsh-resend-cleanup-entries" }, [entry("residue"), entry("sessions")]),
    pending ? (0, import_react4.createElement)("div", { key: "pending", className: "dsh-resend-cleanup-pending", role: "status", "aria-live": "polite" }, [
      icon("spinner"),
      (0, import_react4.createElement)("div", { key: "copy" }, [
        (0, import_react4.createElement)("strong", { key: "title" }, t("cleanup.processing")),
        (0, import_react4.createElement)("p", { key: "hint" }, t("cleanup.processing." + pending))
      ])
    ]) : null,
    error ? (0, import_react4.createElement)("div", { key: "error", className: "dsh-resend-cleanup-error", role: "alert" }, [
      (0, import_react4.createElement)("p", { key: "text" }, t("cleanup.error." + (["bad-request", "plan-not-found", "storage-busy", "unsafe-storage", "scan-failed", "internal", "connection"].includes(error) ? error : "internal"))),
      button("retry", t("cleanup.retry"), () => {
        void open(mode);
      })
    ]) : null,
    answer?.unreadableSessions > 0 ? (0, import_react4.createElement)("p", { key: "unreadable", className: "dsh-resend-rollback-warning" }, t("cleanup.unreadable", { count: answer.unreadableSessions })) : null,
    answer?.protectedObjects ? (0, import_react4.createElement)("p", { key: "protected", className: "dsh-resend-settings-description" }, t("cleanup.protected")) : null,
    answer?.phase === "list" ? (0, import_react4.createElement)("div", { key: "list", className: "dsh-resend-cleanup-panel" }, [
      (0, import_react4.createElement)("div", { key: "header", className: "dsh-resend-cleanup-panel-header" }, [
        (0, import_react4.createElement)("h4", { key: "title" }, t("cleanup.chooseSessions")),
        (0, import_react4.createElement)("span", { key: "total", className: "dsh-resend-cleanup-meta" }, t("cleanup.sessionCount", { count: sessions.length }))
      ]),
      (0, import_react4.createElement)("p", { key: "hint", className: "dsh-resend-cleanup-hint" }, t(sessions.length === 0 ? "cleanup.emptySessions" : "cleanup.select")),
      (0, import_react4.createElement)("ul", { key: "sessions", className: "dsh-resend-cleanup-list" }, sessions.map((session) => (0, import_react4.createElement)(
        "li",
        { key: session.sessionId },
        (0, import_react4.createElement)("label", { className: "dsh-resend-cleanup-session", "data-selected": selected.includes(session.sessionId) }, [
          (0, import_react4.createElement)("input", {
            key: "check",
            type: "checkbox",
            disabled: !!pending,
            checked: selected.includes(session.sessionId),
            onChange: (event) => setSelected((ids) => event.target.checked ? [...ids, session.sessionId] : ids.filter((id) => id !== session.sessionId))
          }),
          (0, import_react4.createElement)("span", { key: "info", className: "dsh-resend-cleanup-session-info" }, [
            (0, import_react4.createElement)("strong", { key: "title" }, session.title),
            (0, import_react4.createElement)("span", { key: "path", className: "dsh-resend-cleanup-path" }, session.projectPath || session.sessionId),
            (0, import_react4.createElement)("span", { key: "size", className: "dsh-resend-cleanup-path" }, t("cleanup.sessionDetail", { count: session.records, size: formatStorageBytes(session.bytes) })),
            session.noSnapshots ? (0, import_react4.createElement)("span", { key: "empty", className: "dsh-resend-cleanup-badge" }, t("cleanup.noSnapshots")) : null
          ])
        ])
      ))),
      sessions.length > 0 ? (0, import_react4.createElement)("div", { key: "footer", className: "dsh-resend-cleanup-footer" }, [
        (0, import_react4.createElement)("span", { key: "selected", className: "dsh-resend-cleanup-meta", "aria-live": "polite" }, t("cleanup.selectedCount", { count: selected.length })),
        button("preview", t("cleanup.previewSelection", { count: selected.length }), () => {
          void call({ mode, phase: "preview", sessionIds: selected });
        }, selected.length === 0, "primary")
      ]) : null
    ]) : null,
    answer?.phase === "preview" ? (0, import_react4.createElement)("div", { key: "preview", className: "dsh-resend-cleanup-panel" }, [
      (0, import_react4.createElement)("div", { key: "heading", className: "dsh-resend-cleanup-panel-header" }, (0, import_react4.createElement)("h4", null, t("cleanup.preview"))),
      (0, import_react4.createElement)("p", { key: "size", className: "dsh-resend-cleanup-space" }, t("cleanup.estimated", { size: formatStorageBytes(answer.estimatedBytes) })),
      answer.itemCount === 0 ? (0, import_react4.createElement)("p", { key: "empty", className: "dsh-resend-cleanup-hint" }, t("cleanup.empty")) : null,
      (0, import_react4.createElement)("ul", { key: "categories", className: "dsh-resend-cleanup-summary" }, answer.categories.filter((category) => category.count > 0).map((category) => (0, import_react4.createElement)("li", { key: category.kind }, t("cleanup.category." + category.kind, { count: category.count, size: formatStorageBytes(category.bytes) })))),
      sessions.length > 0 ? (0, import_react4.createElement)("ul", { key: "selected", className: "dsh-resend-cleanup-summary" }, sessions.map((session) => (0, import_react4.createElement)("li", { key: session.sessionId }, `${session.title} \xB7 ${session.projectPath || session.sessionId}`))) : null,
      answer.itemCount > 0 ? (0, import_react4.createElement)("p", { key: "impact", className: "dsh-resend-rollback-warning dsh-resend-cleanup-impact" }, t(mode === "residue" ? "cleanup.residueImpact" : "cleanup.sessionImpact")) : null,
      (0, import_react4.createElement)("div", { key: "actions", className: "dsh-resend-cleanup-footer dsh-resend-cleanup-actions" }, [
        button("cancel", t("cleanup.cancel"), () => {
          void call({ mode, phase: "cancel", planId: answer.planId });
        }),
        answer.itemCount > 0 ? button("confirm", t("cleanup.confirm"), () => {
          void call({ mode, phase: "execute", planId: answer.planId });
        }, !!error, "primary") : null
      ])
    ]) : null,
    answer?.phase === "execute" ? (0, import_react4.createElement)("div", { key: "result", className: "dsh-resend-cleanup-panel dsh-resend-cleanup-result", role: "status" }, [
      (0, import_react4.createElement)("div", { key: "heading", className: "dsh-resend-cleanup-panel-header" }, (0, import_react4.createElement)("h4", null, t("cleanup.result"))),
      (0, import_react4.createElement)("p", { key: "size", className: "dsh-resend-cleanup-space" }, t("cleanup.released", { size: formatStorageBytes(answer.releasedBytes) })),
      (0, import_react4.createElement)("ul", { key: "items", className: "dsh-resend-cleanup-summary" }, answer.results.map((result) => (0, import_react4.createElement)("li", { key: result.sessionId, "data-status": result.status }, [
        `${result.title}\uFF1A${t("cleanup.status." + result.status)}`,
        result.reason ? ` \xB7 ${t("cleanup.reason." + result.reason)}` : ""
      ]))),
      answer.failures.length > 0 ? (0, import_react4.createElement)("div", { key: "failures", role: "alert" }, [
        (0, import_react4.createElement)("p", { key: "text" }, t("cleanup.failedCount", { count: answer.failures.length })),
        (0, import_react4.createElement)("ul", { key: "files" }, answer.failures.map((failure2) => (0, import_react4.createElement)("li", { key: failure2.item }, failure2.item)))
      ]) : null,
      answer.changedCount > 0 ? (0, import_react4.createElement)("p", { key: "changed" }, t("cleanup.changed", { count: answer.changedCount })) : null,
      answer.results.length === 0 && answer.failures.length === 0 && answer.changedCount === 0 ? (0, import_react4.createElement)("p", { key: "done" }, t("cleanup.residueDone")) : null
    ]) : null
  ]);
}
var CLEANUP_DICTIONARIES = {
  "zh-CN": {
    "cleanup.heading": "\u56DE\u6EDA\u6570\u636E\u6E05\u7406",
    "cleanup.scope": "\u7BA1\u7406\u5F53\u524D DSH \u6570\u636E\u76EE\u5F55\u4E2D\u672C\u63D2\u4EF6\u4FDD\u5B58\u7684\u6570\u636E\u3002\u8BE5\u76EE\u5F55\u53EF\u80FD\u7531\u591A\u4E2A Profile \u5171\u7528\uFF1B\u4F1A\u8BDD\u3001\u5DE5\u4F5C\u6587\u4EF6\u3001\u63D2\u4EF6\u8BBE\u7F6E\u548C\u5176\u4ED6\u63D2\u4EF6\u6570\u636E\u5747\u4FDD\u7559\u3002",
    "cleanup.residue": "\u6E05\u7406\u65E0\u7528\u6B8B\u7559",
    "cleanup.sessions": "\u6309\u4F1A\u8BDD\u6E05\u9664\u56DE\u6EDA\u6570\u636E",
    "cleanup.residueHint": "\u68C0\u67E5\u65E0\u5F52\u5C5E\u56DE\u6EDA\u6570\u636E\u3001\u672A\u5F15\u7528\u5185\u5BB9\u548C\u9057\u7559\u4E34\u65F6\u6587\u4EF6\u3002",
    "cleanup.sessionsHint": "\u9009\u62E9\u9700\u8981\u6E05\u7406\u7684\u4F1A\u8BDD\uFF0C\u9884\u89C8\u8303\u56F4\u540E\u518D\u786E\u8BA4\u3002",
    "cleanup.chooseSessions": "\u9009\u62E9\u4F1A\u8BDD",
    "cleanup.sessionCount": "\u5171 {count} \u4E2A\u4F1A\u8BDD",
    "cleanup.selectedCount": "\u5DF2\u9009 {count} \u4E2A\u4F1A\u8BDD",
    "cleanup.processing": "\u6B63\u5728\u5904\u7406\uFF0C\u8BF7\u7A0D\u5019\u2026",
    "cleanup.retry": "\u91CD\u65B0\u8BFB\u53D6\u5E76\u9884\u89C8",
    "cleanup.processing.list": "\u6B63\u5728\u8BFB\u53D6\u4F1A\u8BDD\u548C\u56DE\u6EDA\u8BB0\u5F55\u3002\u6570\u636E\u8F83\u591A\u65F6\u53EF\u80FD\u9700\u8981\u4E00\u4E9B\u65F6\u95F4\uFF0C\u8BF7\u4FDD\u6301\u6B64\u9875\u9762\u6253\u5F00\u3002",
    "cleanup.processing.preview": "\u6B63\u5728\u6838\u5BF9\u6E05\u7406\u8303\u56F4\u5E76\u8BA1\u7B97\u53EF\u91CA\u653E\u7A7A\u95F4\uFF0C\u8BF7\u4FDD\u6301\u6B64\u9875\u9762\u6253\u5F00\u3002",
    "cleanup.processing.execute": "\u6B63\u5728\u6E05\u7406\u5DF2\u786E\u8BA4\u7684\u6570\u636E\uFF0C\u8BF7\u4FDD\u6301\u6B64\u9875\u9762\u6253\u5F00\uFF0C\u5B8C\u6210\u540E\u5C06\u663E\u793A\u7ED3\u679C\u3002",
    "cleanup.processing.cancel": "\u6B63\u5728\u53D6\u6D88\u6E05\u7406\u9884\u89C8\uFF0C\u8BF7\u7A0D\u5019\u3002",
    "cleanup.select": "\u9009\u62E9\u8981\u6E05\u9664\u5386\u53F2\u6587\u4EF6\u56DE\u6EDA\u6570\u636E\u7684\u4F1A\u8BDD\uFF08\u53EF\u591A\u9009\uFF09\u3002\u76F8\u5173\u4F53\u79EF\u53EF\u80FD\u5305\u542B\u5171\u4EAB\u5185\u5BB9\uFF0C\u6700\u7EC8\u91CA\u653E\u7A7A\u95F4\u4EE5\u786E\u8BA4\u9875\u4E3A\u51C6\u3002",
    "cleanup.emptySessions": "\u5F53\u524D\u67E5\u8BE2\u8303\u56F4\u5185\u6CA1\u6709\u53EF\u6E05\u9664\u56DE\u6EDA\u6570\u636E\u7684\u4F1A\u8BDD\u3002",
    "cleanup.noSnapshots": "\u65E0\u6587\u4EF6\u5FEB\u7167",
    "cleanup.sessionDetail": "{count} \u6761\u56DE\u6EDA\u8BB0\u5F55 \xB7 \u76F8\u5173\u4F53\u79EF {size}",
    "cleanup.previewSelection": "\u9884\u89C8\u6240\u9009 {count} \u4E2A\u4F1A\u8BDD",
    "cleanup.preview": "\u786E\u8BA4\u6E05\u7406\u8303\u56F4",
    "cleanup.estimated": "\u9884\u8BA1\u91CA\u653E\u7A7A\u95F4\uFF1A{size}",
    "cleanup.empty": "\u6CA1\u6709\u53EF\u6E05\u7406\u9879\u3002",
    "cleanup.category.records": "\u56DE\u6EDA\u6E05\u5355\uFF1A{count} \u9879 \xB7 {size}",
    "cleanup.category.outcomes": "\u56DE\u6EDA\u5B8C\u6210\u7ED3\u679C\uFF1A{count} \u9879 \xB7 {size}",
    "cleanup.category.objects": "\u4E0D\u518D\u4F7F\u7528\u7684\u6587\u4EF6\u5185\u5BB9\uFF1A{count} \u9879 \xB7 {size}",
    "cleanup.category.temporary": "\u9057\u7559\u4E34\u65F6\u6587\u4EF6\uFF1A{count} \u9879 \xB7 {size}",
    "cleanup.residueImpact": "\u65E0\u6CD5\u786E\u8BA4\u4F1A\u8BDD\u5F52\u5C5E\u7684\u56DE\u6EDA\u6570\u636E\u4E5F\u4F1A\u5220\u9664\u3002\u8FD9\u4E9B\u6570\u636E\u53EF\u80FD\u4ECD\u6709\u7528\u9014\uFF0C\u5220\u9664\u540E\u65E0\u6CD5\u6062\u590D\uFF1B\u5DF2\u8BC6\u522B\u4F1A\u8BDD\u7684\u5386\u53F2\u56DE\u6EDA\u6570\u636E\u4FDD\u7559\u3002",
    "cleanup.sessionImpact": "\u6240\u9009\u4F1A\u8BDD\u5DF2\u4FDD\u5B58\u7684\u5386\u53F2\u6587\u4EF6\u56DE\u6EDA\u6570\u636E\u5C06\u4E0D\u53EF\u6062\u590D\uFF0C\u5DF2\u6709\u6062\u590D\u9884\u89C8\u4F1A\u5931\u6548\u3002\u540E\u7EED\u65B0\u64CD\u4F5C\u4ECD\u53EF\u4EA7\u751F\u65B0\u7684\u56DE\u6EDA\u8BB0\u5F55\u3002\u6267\u884C\u65F6\u8DF3\u8FC7\u5FD9\u788C\u4F1A\u8BDD\u3002",
    "cleanup.confirm": "\u786E\u8BA4\u6E05\u7406",
    "cleanup.cancel": "\u53D6\u6D88",
    "cleanup.result": "\u6E05\u7406\u7ED3\u679C",
    "cleanup.released": "\u5B9E\u9645\u91CA\u653E\u7A7A\u95F4\uFF1A{size}",
    "cleanup.status.cleaned": "\u5DF2\u6E05\u7406",
    "cleanup.status.skipped": "\u5DF2\u8DF3\u8FC7",
    "cleanup.status.failed": "\u6E05\u7406\u672A\u5B8C\u6210",
    "cleanup.reason.generating": "\u6B63\u5728\u751F\u6210\u56DE\u590D",
    "cleanup.reason.editing": "\u6B63\u5728\u7F16\u8F91\u91CD\u53D1",
    "cleanup.reason.rolling-back": "\u6B63\u5728\u6267\u884C\u6587\u4EF6\u56DE\u6EDA",
    "cleanup.reason.preview-stale": "\u6570\u636E\u5DF2\u53D8\u5316\uFF0C\u8BF7\u91CD\u65B0\u9884\u89C8",
    "cleanup.reason.delete-failed": "\u90E8\u5206\u6570\u636E\u5220\u9664\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5",
    "cleanup.reason.coordination-unavailable": "\u65E0\u6CD5\u786E\u8BA4\u5176\u4ED6\u7A97\u53E3\u7684\u4F7F\u7528\u72B6\u6001\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5",
    "cleanup.failedCount": "{count} \u9879\u5220\u9664\u5931\u8D25\uFF0C\u672A\u5168\u90E8\u6E05\u7406\u5B8C\u6210\u3002",
    "cleanup.changed": "{count} \u9879\u56E0\u8303\u56F4\u53D8\u5316\u6216\u6B63\u5728\u4F7F\u7528\u800C\u4FDD\u7559\uFF0C\u8BF7\u91CD\u65B0\u9884\u89C8\u3002",
    "cleanup.residueDone": "\u9884\u89C8\u4E2D\u7684\u65E0\u7528\u6B8B\u7559\u5DF2\u6E05\u7406\u3002",
    "cleanup.protected": "\u90E8\u5206\u4FDD\u7559\u6E05\u5355\u65E0\u6CD5\u5B8C\u6574\u8BFB\u53D6\uFF0C\u76F8\u5173\u6587\u4EF6\u5185\u5BB9\u6682\u4E0D\u56DE\u6536\u3002",
    "cleanup.unreadable": "{count} \u4E2A\u4F1A\u8BDD\u65E5\u5FD7\u65E0\u6CD5\u8BFB\u53D6\uFF0C\u90E8\u5206\u6570\u636E\u53EF\u80FD\u65E0\u6CD5\u8BC6\u522B\u5F52\u5C5E\uFF1B\u65E0\u5F52\u5C5E\u6570\u636E\u4EC5\u4F1A\u5728\u300C\u6E05\u7406\u65E0\u7528\u6B8B\u7559\u300D\u4E2D\u7EB3\u5165\u5220\u9664\u3002",
    "cleanup.error.bad-request": "\u6240\u9009\u6570\u636E\u5DF2\u53D8\u5316\uFF0C\u8BF7\u91CD\u65B0\u8BFB\u53D6\u5E76\u9884\u89C8\u3002",
    "cleanup.error.plan-not-found": "\u6E05\u7406\u9884\u89C8\u5DF2\u5931\u6548\uFF0C\u8BF7\u91CD\u65B0\u9884\u89C8\u3002",
    "cleanup.error.storage-busy": "\u672C\u63D2\u4EF6\u6570\u636E\u6B63\u5728\u88AB\u5176\u4ED6\u64CD\u4F5C\u4F7F\u7528\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5\u3002",
    "cleanup.error.unsafe-storage": "\u672C\u63D2\u4EF6\u5B58\u50A8\u8DEF\u5F84\u5305\u542B\u94FE\u63A5\u6216\u5F02\u5E38\u6587\u4EF6\uFF0C\u5DF2\u505C\u6B62\u6E05\u7406\u3002",
    "cleanup.error.scan-failed": "\u6570\u636E\u8BFB\u53D6\u5931\u8D25\uFF0C\u6E05\u7406\u672A\u6267\u884C\u3002\u8BF7\u68C0\u67E5\u5B58\u50A8\u548C\u4F1A\u8BDD\u540E\u91CD\u8BD5\u3002",
    "cleanup.error.internal": "\u6E05\u7406\u672A\u5B8C\u6210\uFF0C\u8BF7\u91CD\u65B0\u8BFB\u53D6\u5E76\u68C0\u67E5\u7ED3\u679C\u3002",
    "cleanup.error.connection": "\u4E0E DSH \u7684\u901A\u4FE1\u4E2D\u65AD\uFF0C\u6267\u884C\u7ED3\u679C\u5C1A\u672A\u786E\u8BA4\u3002\u8BF7\u91CD\u65B0\u8BFB\u53D6\u5E76\u9884\u89C8\u3002"
  },
  en: {
    "cleanup.heading": "Rollback data cleanup",
    "cleanup.scope": "Manage data saved by this plugin in the current DSH data directory, which may be shared across Profiles. Conversations, work files, settings and other plugins are preserved.",
    "cleanup.residue": "Clean unused leftovers",
    "cleanup.sessions": "Clear rollback data by conversation",
    "cleanup.residueHint": "Check unowned rollback data, unreferenced contents and leftover temporary files.",
    "cleanup.sessionsHint": "Select conversations and review the scope before confirming.",
    "cleanup.chooseSessions": "Select conversations",
    "cleanup.sessionCount": "{count} conversations",
    "cleanup.selectedCount": "{count} selected",
    "cleanup.processing": "Processing\u2026",
    "cleanup.retry": "Read and preview again",
    "cleanup.processing.list": "Reading conversations and rollback records. Large datasets may take a while. Keep this page open.",
    "cleanup.processing.preview": "Checking the cleanup scope and calculating releasable space. Keep this page open.",
    "cleanup.processing.execute": "Cleaning the confirmed data. Keep this page open until the results appear.",
    "cleanup.processing.cancel": "Canceling the cleanup preview. Please wait.",
    "cleanup.select": "Select conversations to clear saved file rollback data (multiple selection). Related sizes may include shared contents; the confirmation shows the releasable total.",
    "cleanup.emptySessions": "No conversations with rollback data in the current query scope.",
    "cleanup.noSnapshots": "No file snapshots",
    "cleanup.sessionDetail": "{count} rollback records \xB7 {size} related data",
    "cleanup.previewSelection": "Preview {count} selected conversations",
    "cleanup.preview": "Confirm cleanup scope",
    "cleanup.estimated": "Estimated space released: {size}",
    "cleanup.empty": "Nothing to clean.",
    "cleanup.category.records": "Rollback manifests: {count} \xB7 {size}",
    "cleanup.category.outcomes": "Completion results: {count} \xB7 {size}",
    "cleanup.category.objects": "Unused file contents: {count} \xB7 {size}",
    "cleanup.category.temporary": "Leftover temporary files: {count} \xB7 {size}",
    "cleanup.residueImpact": "Rollback data with unknown conversation ownership will also be deleted. It may still be useful and cannot be recovered after deletion. Identified conversations retain their rollback data.",
    "cleanup.sessionImpact": "Saved historical file rollback data for selected conversations cannot be recovered. Existing restore previews expire. New operations can still save new rollback records. Busy conversations are skipped.",
    "cleanup.confirm": "Confirm cleanup",
    "cleanup.cancel": "Cancel",
    "cleanup.result": "Cleanup results",
    "cleanup.released": "Space released: {size}",
    "cleanup.status.cleaned": "Cleaned",
    "cleanup.status.skipped": "Skipped",
    "cleanup.status.failed": "Incomplete",
    "cleanup.reason.generating": "Generating a reply",
    "cleanup.reason.editing": "Editing and resending",
    "cleanup.reason.rolling-back": "Restoring files",
    "cleanup.reason.preview-stale": "Data changed; preview again",
    "cleanup.reason.delete-failed": "Some data could not be deleted; retry",
    "cleanup.reason.coordination-unavailable": "Other windows could not be checked; retry later",
    "cleanup.failedCount": "{count} items could not be deleted. Cleanup is incomplete.",
    "cleanup.changed": "{count} items were retained because the scope changed or they are in use. Preview again.",
    "cleanup.residueDone": "Previewed leftovers were cleaned.",
    "cleanup.protected": "Some retained manifests cannot be fully read. File contents are preserved.",
    "cleanup.unreadable": "{count} conversation logs could not be read. Some data may have unknown ownership; only Clean unused leftovers includes such data for deletion.",
    "cleanup.error.bad-request": "The selected data changed. Read and preview again.",
    "cleanup.error.plan-not-found": "The cleanup preview expired. Preview again.",
    "cleanup.error.storage-busy": "Other operations are using plugin data. Try again later.",
    "cleanup.error.unsafe-storage": "The plugin storage contains links or unexpected files. Cleanup stopped.",
    "cleanup.error.scan-failed": "Data could not be read. Cleanup did not run. Check storage and conversations and retry.",
    "cleanup.error.internal": "Cleanup did not finish. Read again and check the results.",
    "cleanup.error.connection": "Communication with DSH was interrupted. The result is unconfirmed. Read and preview again."
  }
};

// src/preferences.js
var import_react5 = require("react");
var PREFERENCE_FIELDS = Object.freeze([
  "inlineEditorBeneathMessage",
  "regenerateLastReply",
  "restrictEditToLastUserMessage",
  "restrictRegenerateToLastReply"
]);
var DEFAULTS = Object.freeze({ inlineEditorBeneathMessage: true, regenerateLastReply: true, restrictRegenerateToLastReply: false, restrictEditToLastUserMessage: false });
function createPreferences() {
  const listeners = /* @__PURE__ */ new Set();
  let snapshot = Object.freeze({ ...DEFAULTS, ready: false, status: "loading" });
  let connection;
  let saving = false;
  let saveError = false;
  let retryWrite;
  const publish = (next) => {
    if (Object.keys(next).every((key) => next[key] === snapshot[key])) return;
    snapshot = Object.freeze(next);
    for (const listener of [...listeners]) listener();
  };
  function sync() {
    const held = connection?.mirror.getSnapshot();
    const row = held?.view?.namespaces?.find((row2) => row2.ns === "dsh-resend");
    const known = connection?.form.getSnapshot().mode === "host" && held?.error == null && row !== void 0 && held.status === "ready";
    const values = { ...DEFAULTS };
    for (const field of PREFERENCE_FIELDS) {
      if (typeof row?.value?.[field] === "boolean") values[field] = row.value[field];
    }
    const loading = !held || held.status === "loading" || held.status === "idle" && held.error == null;
    publish({
      ...known && !saving ? values : snapshot,
      ready: known,
      status: saving ? "saving" : !known ? loading ? "loading" : "read-error" : saveError ? "save-error" : "ready"
    });
  }
  function connect(forms) {
    if (connection) throw new Error("preferences already connected");
    const current = { mirror: forms.describe(), form: forms.get("dsh-resend") };
    connection = current;
    const unsubscribe = current.mirror.subscribe(sync);
    sync();
    void Promise.resolve(current.mirror.ensure()).catch(() => {
      if (connection === current) publish({ ...snapshot, ready: false, status: "read-error" });
    });
    return () => {
      unsubscribe();
      if (connection !== current) return;
      connection = void 0;
      publish({ ...snapshot, ready: false, status: "loading" });
    };
  }
  function set(field, value) {
    if (!PREFERENCE_FIELDS.includes(field)) throw new Error("unknown preference " + field);
    if (typeof value !== "boolean") throw new Error("preference " + field + " must be a boolean");
    if (saving || !snapshot.ready || !connection) return Promise.resolve(false);
    if (snapshot[field] === value) {
      saveError = false;
      retryWrite = void 0;
      sync();
      return Promise.resolve(true);
    }
    return save(field, value);
  }
  async function save(field, value) {
    const current = connection;
    saving = true;
    saveError = false;
    retryWrite = { field, value };
    sync();
    let accepted = false;
    try {
      accepted = await current.form.set(field, value) === true;
    } catch {
    }
    if (connection === current) {
      publish({ ...snapshot, ready: false, status: "saving" });
      try {
        await current.mirror.load();
      } catch {
        saving = false;
        saveError = true;
        publish({ ...snapshot, ready: false, status: "read-error" });
        return false;
      }
    }
    saving = false;
    if (connection !== current) return accepted;
    saveError = !accepted;
    if (accepted) retryWrite = void 0;
    sync();
    return accepted;
  }
  async function retry() {
    if (saving || !connection) return false;
    if (snapshot.ready && saveError && retryWrite) return set(retryWrite.field, retryWrite.value);
    const current = connection;
    publish({ ...snapshot, ready: false, status: "loading" });
    try {
      await current.mirror.load();
    } catch {
      if (connection === current) publish({ ...snapshot, ready: false, status: "read-error" });
      return false;
    }
    if (connection === current) sync();
    return snapshot.ready;
  }
  return Object.freeze({
    fields: PREFERENCE_FIELDS,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
    connect,
    set,
    retry
  });
}
function usePreferences(store) {
  return (0, import_react5.useSyncExternalStore)(store.subscribe, store.getSnapshot);
}

// src/resend-operations.js
var RESEND_FAILED = "resend-failed";
function unwrapRemoteResult(result) {
  if (result?.ok === false) return result;
  if (result?.ok !== true || typeof result.value?.ok !== "boolean") {
    const error = new Error("The Gateway did not return a business result");
    error.code = "client/result-invalid";
    throw error;
  }
  return result.value;
}
function createResendOperations(remote, references = remote) {
  const bySession = /* @__PURE__ */ new Map();
  const recordsBySession = /* @__PURE__ */ new Map();
  const emptyRecords = Object.freeze([]);
  const listeners = /* @__PURE__ */ new Set();
  const referenceInvalidationListeners = /* @__PURE__ */ new Set();
  const conversations = /* @__PURE__ */ new Map();
  const preflights = /* @__PURE__ */ new Map();
  const retrying = /* @__PURE__ */ new Set();
  const drafts = /* @__PURE__ */ new Map();
  let disposed = false;
  const unreadConversation = Object.freeze({ ready: false, status: "loading" });
  const notify = () => {
    for (const listener of Array.from(listeners)) listener();
  };
  const outcomeOf = ({ sessionId, carrierSeq }) => bySession.get(sessionId)?.get(carrierSeq);
  function record(request, result) {
    if (disposed || result?.ok !== true) return;
    const { carrierSeq, shadowedSeqs, resendMessageId } = result.value;
    if (request.op === "edit" && resendMessageId !== void 0) {
      drafts.get(request.sessionId)?.delete(request.targetSeq);
      if (drafts.get(request.sessionId)?.size === 0) drafts.delete(request.sessionId);
    }
    const records = bySession.get(request.sessionId) ?? /* @__PURE__ */ new Map();
    bySession.set(request.sessionId, records);
    records.set(
      carrierSeq,
      Object.freeze({
        // The request as it was SENT, copied: "Send again" must replay the values
        // this call used, not whatever the caller's object happens to hold later.
        request: Object.freeze({ ...request }),
        carrierSeq,
        shadowedSeqs: Object.freeze([...shadowedSeqs]),
        status: resendMessageId === void 0 ? RESEND_FAILED : "queued"
      })
    );
    recordsBySession.set(request.sessionId, Object.freeze([...records.values()]));
    notify();
  }
  async function run(request) {
    if (disposed) return { ok: true, value: { canceled: true } };
    if (preflights.has(request.sessionId)) return { ok: false, error: { code: "replay-busy" } };
    const result = unwrapRemoteResult(await remote.resend.replay({ phase: "start", request }));
    if (disposed) return { ok: true, value: { canceled: true } };
    if (result.ok && result.value.preflight) {
      return new Promise((resolve) => {
        preflights.set(request.sessionId, {
          request: { ...request },
          result,
          resolve,
          pending: null,
          userSeq: result.value.userSeq,
          op: result.value.op
        });
        notify();
      });
    }
    record(request, result);
    return result;
  }
  return {
    run,
    draftFor({ sessionId, targetSeq }, sourceText) {
      const draft = drafts.get(sessionId)?.get(targetSeq);
      return draft?.sourceText === sourceText ? draft : void 0;
    },
    saveDraft({ sessionId, targetSeq }, draft) {
      if (disposed) return;
      if (!drafts.has(sessionId)) drafts.set(sessionId, /* @__PURE__ */ new Map());
      drafts.get(sessionId).set(targetSeq, draft);
    },
    clearDraft({ sessionId, targetSeq }) {
      drafts.get(sessionId)?.delete(targetSeq);
      if (drafts.get(sessionId)?.size === 0) drafts.delete(sessionId);
    },
    async referenceCandidates(sessionId, query, signal) {
      if (typeof references.fileReferences?.list !== "function") return { ok: false, unavailable: true };
      return references.fileReferences.list(sessionId, query, signal);
    },
    async skillCandidates(sessionId, signal) {
      if (typeof references.skills?.list !== "function") return { ok: false, unavailable: true };
      return references.skills.list({ sessionId }, signal);
    },
    subscribeReferenceInvalidation(listener) {
      referenceInvalidationListeners.add(listener);
      return () => referenceInvalidationListeners.delete(listener);
    },
    invalidateReferenceQueries(sessionId) {
      for (const listener of Array.from(referenceInvalidationListeners)) listener(sessionId);
    },
    preflightFor: (sessionId) => preflights.get(sessionId),
    async chooseReplay(sessionId, phase) {
      const entry = preflights.get(sessionId);
      if (!entry || entry.pending) return;
      preflights.set(sessionId, { ...entry, pending: phase });
      notify();
      let result;
      try {
        result = unwrapRemoteResult(await remote.resend.replay({
          sessionId,
          phase,
          preflightId: entry.result.value?.preflightId ?? entry.preflightId
        }));
      } catch {
        result = { ok: false, error: { code: "internal" } };
      }
      if (phase === "cancel" && result.error?.code === "plan-not-found") result = { ok: true, value: { canceled: true } };
      if (!preflights.has(sessionId)) return result;
      if (result.ok && !result.value.preflight) {
        preflights.delete(sessionId);
        if (!result.value.canceled) record(entry.request, result);
        notify();
        entry.resolve(result);
      } else {
        preflights.set(sessionId, {
          ...entry,
          result,
          pending: null,
          preflightId: entry.result.value?.preflightId ?? entry.preflightId
        });
        notify();
      }
      return result;
    },
    // Reconnection may precede Chat refill. Re-read every observed session and
    // retire in-flight replies so old neighbours cannot reopen an invalid target.
    invalidateConversations() {
      for (const listener of Array.from(referenceInvalidationListeners)) listener();
      for (const [sessionId, entry] of conversations) {
        void this.refreshConversation(sessionId, entry.revision, true);
      }
    },
    conversationFor(sessionId, revision) {
      const entry = conversations.get(sessionId);
      return entry?.revision === revision ? entry.snapshot : unreadConversation;
    },
    async refreshConversation(sessionId, revision, retry = false) {
      const previous = conversations.get(sessionId);
      if (previous?.revision === revision && !retry) return previous.promise;
      const entry = { revision, snapshot: unreadConversation };
      conversations.set(sessionId, entry);
      notify();
      entry.promise = (async () => {
        let next;
        try {
          const result = unwrapRemoteResult(await remote.resend.conversation({ sessionId }));
          if (result.ok !== true) throw result.error;
          const { assistantSeqs, lastReplySeq, userSeqs, lastUserSeq } = result.value;
          for (const [seqs, last] of [[assistantSeqs, lastReplySeq], [userSeqs, lastUserSeq]]) {
            if (!Array.isArray(seqs) || seqs.some((seq) => !Number.isSafeInteger(seq) || seq < 0) || new Set(seqs).size !== seqs.length || last !== seqs.at(-1)) throw new Error("invalid conversation eligibility");
          }
          next = Object.freeze({ ready: true, status: "ready", assistantSeqs, lastReplySeq, userSeqs, lastUserSeq });
        } catch {
          next = Object.freeze({ ready: false, status: "read-error" });
        }
        if (conversations.get(sessionId) !== entry) return;
        entry.snapshot = next;
        notify();
      })();
      return entry.promise;
    },
    async rollback(request) {
      return unwrapRemoteResult(await remote.resend.rollback(request));
    },
    async cleanup(request) {
      return unwrapRemoteResult(await remote.resend.cleanup(request));
    },
    outcomeOf,
    recordsFor: (sessionId) => recordsBySession.get(sessionId) ?? emptyRecords,
    /**
     * "Send again" (spec §9.4): replay the SAME request, so the host re-sends the
     * prompt and performs no second rewind. A point with no record has nothing to
     * replay, and says so by answering `undefined` rather than inventing one.
     * @param point - `{ sessionId, carrierSeq }`.
     * @returns the host's `RemoteResult`, or `undefined` when there is nothing to
     *   replay.
     */
    async sendAgain(point) {
      const entry = outcomeOf(point);
      if (entry?.status !== RESEND_FAILED) return void 0;
      const key = `${point.sessionId}:${String(point.carrierSeq)}`;
      if (retrying.has(key)) return void 0;
      retrying.add(key);
      try {
        const result = unwrapRemoteResult(await remote.resend.apply(entry.request));
        record(entry.request, result);
        return result;
      } finally {
        retrying.delete(key);
      }
    },
    /**
     * Subscribe to outcome changes.
     * @param listener - called whenever a record is added or replaced.
     * @returns the unsubscriber.
     */
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** Drop this page's records and listeners when the plugin unloads. */
    dispose() {
      for (const listener of Array.from(referenceInvalidationListeners)) listener();
      referenceInvalidationListeners.clear();
      disposed = true;
      for (const entry of preflights.values()) entry.resolve({ ok: true, value: { canceled: true } });
      preflights.clear();
      bySession.clear();
      recordsBySession.clear();
      conversations.clear();
      drafts.clear();
      retrying.clear();
      listeners.clear();
    }
  };
}

// src/regenerate.js
var import_react13 = require("react");

// src/conversation-eligibility.js
var import_react6 = require("react");
function useConversationEligibility(operations, sessionId, session, plan) {
  const revision = JSON.stringify([
    plan?.revision,
    [...plan?.hiddenSeqs ?? []],
    session?.running,
    session?.openState
  ]);
  const conversation = (0, import_react6.useSyncExternalStore)(operations.subscribe, () => operations.conversationFor(sessionId, revision));
  (0, import_react6.useEffect)(() => {
    void operations.refreshConversation(sessionId, revision);
  }, [operations, sessionId, revision]);
  return { conversation, revision };
}

// src/file-rollback-preview.js
var import_react7 = require("react");
var import_dsh_client_ui_primitives5 = require("@deepseek-ai/dsh-client-ui-primitives");
var import_react_dom = require("react-dom");
function FileRollbackPreview({ operations, point, t, preflight }) {
  const [result, setResult] = (0, import_react7.useState)();
  const [pending, setPending] = (0, import_react7.useState)("status");
  const [completed, setCompleted] = (0, import_react7.useState)(false);
  const [collapsed, setCollapsed] = (0, import_react7.useState)(false);
  const running = (0, import_react7.useRef)(false);
  const busy = pending !== null;
  const terminal = result?.ok === true && (completed || result.value.completed === true);
  (0, import_react7.useEffect)(() => {
    if (preflight) {
      setResult(preflight.result);
      setPending(preflight.pending);
      setCompleted(preflight.result.value?.completed === true);
      setCollapsed(false);
      return;
    }
    let alive = true;
    running.current = true;
    setPending("status");
    setResult(void 0);
    setCompleted(false);
    setCollapsed(false);
    void Promise.resolve().then(() => operations.rollback({ ...point, scope: "artifacts", phase: "status" })).then((answer) => {
      if (!alive) return;
      if (answer.ok && answer.value.completed) {
        setResult(answer);
        setCompleted(true);
        setCollapsed(true);
      } else if (!answer.ok || answer.value.empty) setResult(answer);
    }).catch(() => {
      if (alive) setResult({ ok: false, error: { code: "internal" } });
    }).finally(() => {
      if (alive) {
        running.current = false;
        setPending(null);
      }
    });
    return () => {
      alive = false;
    };
  }, [operations, point.sessionId, point.carrierSeq, preflight]);
  async function run(phase) {
    if (preflight) return operations.chooseReplay(point.sessionId, phase === "execute" ? "restore" : phase);
    if (running.current || terminal) return;
    running.current = true;
    setPending(phase);
    if (phase === "preview") {
      setResult(void 0);
      setCompleted(false);
      setCollapsed(false);
    }
    try {
      const answer = await operations.rollback({ ...point, scope: "artifacts", phase, ...phase === "preview" ? {} : { planId: result?.value?.planId } });
      setResult(phase === "cancel" && answer.ok ? void 0 : answer);
      setCompleted(phase === "execute" || answer.value?.completed === true);
    } catch {
      setResult({ ok: false, error: { code: "internal" } });
      setCompleted(phase === "execute");
    } finally {
      running.current = false;
      setPending(null);
    }
  }
  function close2() {
    if (preflight) {
      void operations.chooseReplay(point.sessionId, "cancel");
      return;
    }
    if (terminal) setCollapsed(true);
    else if (!completed && result?.ok && result.value.planId) void run("cancel");
    else {
      setResult(void 0);
      setCompleted(false);
    }
  }
  const preview = result?.ok ? result.value : void 0;
  const files = preview?.files ?? result?.error?.files ?? [];
  const restorable = completed ? 0 : files.filter((file) => file.action === "restore").length;
  const restored = files.filter((file) => file.action === "restored" || completed && result?.ok && file.action === "restore").length;
  const kept = files.filter((file) => file.action === "refuse").length;
  const expanded = preflight || result !== void 0 && !collapsed || busy && pending !== "status";
  const canExecute = preview !== void 0 && !terminal && !completed && restorable > 0;
  const countText = (key, count) => String(t(key)).replace("{count}", String(count));
  const renderIcon = (Icon) => (0, import_react7.createElement)(Icon, { key: "icon", size: 16, "aria-hidden": true });
  const button = (key, onClick, label, variant = "ghost") => (0, import_react7.createElement)(import_dsh_client_ui_primitives5.Button, {
    key,
    type: "button",
    size: "sm",
    variant,
    disabled: busy,
    onClick,
    className: `dsh-resend-rollback-button${key === "preview" ? " dsh-resend-rollback-preview-button" : key === "execute" ? " dsh-resend-rollback-confirm-button" : ""}`
  }, label);
  if (!preflight && (pending === "status" || result?.value?.empty === true)) return null;
  return (0, import_react7.createElement)("section", { className: "dsh-resend-rollback", "aria-label": t("files.title"), "aria-busy": busy }, [
    (0, import_react7.createElement)(UIStyles, { key: "ui" }),
    (0, import_react7.createElement)("header", { key: "header", className: "dsh-resend-rollback-header" }, [
      (0, import_react7.createElement)("div", { key: "title", className: "dsh-resend-rollback-title" }, [
        renderIcon(import_dsh_client_ui_primitives5.IconRefreshOutlineRegular),
        (0, import_react7.createElement)("div", { key: "text" }, [
          (0, import_react7.createElement)("h3", { key: "heading" }, t("files.title")),
          (0, import_react7.createElement)("p", { key: "description" }, t("files.description"))
        ])
      ]),
      terminal && collapsed ? (0, import_react7.createElement)("div", { key: "finished", className: "dsh-resend-rollback-header-actions" }, [
        (0, import_react7.createElement)("span", { key: "stage", className: "dsh-resend-rollback-stage", role: "status" }, t("files.finished")),
        button("view", () => {
          setCollapsed(false);
        }, t("files.viewResult"))
      ]) : expanded || busy ? (0, import_react7.createElement)(
        "span",
        { key: "stage", className: "dsh-resend-rollback-stage", role: "status" },
        t(busy ? pending === "status" ? "files.readingStatus" : ["execute", "restore"].includes(pending) ? "files.restoring" : pending === "cancel" ? "files.canceling" : pending === "keep" ? "replay.sending" : "files.checking" : terminal ? "files.finished" : result?.ok ? "files.awaiting" : "files.needsPreview")
      ) : button("preview", () => {
        void run("preview");
      }, [renderIcon(import_dsh_client_ui_primitives5.IconRefreshOutlineRegular), t("files.previewShort")], "outline")
    ]),
    expanded && (0, import_react7.createElement)("div", { key: "content", className: "dsh-resend-rollback-content", "aria-live": "polite" }, [
      result?.ok === false && (0, import_react7.createElement)("p", { key: "error", className: "dsh-resend-rollback-notice dsh-resend-rollback-warning", role: "alert" }, t(`files.error.${result.error.code}`)),
      completed && result?.ok && (0, import_react7.createElement)("p", { key: "completed", className: "dsh-resend-rollback-notice" }, t("files.completed")),
      preflight && restored > 0 && (0, import_react7.createElement)("p", { key: "cancel-hint", className: "dsh-resend-rollback-notice" }, t("replay.cancelHint")),
      preview?.files.length === 0 && (0, import_react7.createElement)("p", { key: "empty", className: "dsh-resend-rollback-notice" }, t("files.empty")),
      files.length > 0 && (0, import_react7.createElement)("div", { key: "summary", className: "dsh-resend-rollback-summary" }, [
        (0, import_react7.createElement)("strong", { key: "count" }, countText(completed || preflight && restored > 0 ? "files.restoredCount" : "files.restoreCount", completed || preflight && restored > 0 ? restored : restorable)),
        (0, import_react7.createElement)("span", { key: "kept" }, countText(completed ? "files.keptCount" : "files.keepCount", kept))
      ]),
      files.length > 0 && (0, import_react7.createElement)("ul", { key: "files", className: "dsh-resend-rollback-files", "aria-label": t("files.list") }, files.map((file, index) => {
        const normalized = file.path.replaceAll("\\", "/");
        const split2 = normalized.lastIndexOf("/");
        const action = completed && file.action === "restore" ? "restored" : file.action;
        const refused = action === "refuse";
        const Icon = action === "restored" ? import_dsh_client_ui_primitives5.IconCheckOutlineRegular : refused ? import_dsh_client_ui_primitives5.IconWarningOutlineRegular : import_dsh_client_ui_primitives5.IconRefreshOutlineRegular;
        return (0, import_react7.createElement)("li", { key: `${index}:${file.path}`, className: "dsh-resend-rollback-file" }, [
          (0, import_react7.createElement)("span", { key: "icon", className: "dsh-resend-rollback-file-icon", "aria-hidden": true }, (0, import_react7.createElement)(import_dsh_client_ui_primitives5.FileTypeIcon, { path: file.path, size: 20 })),
          (0, import_react7.createElement)("div", { key: "info", className: "dsh-resend-rollback-file-info", title: file.path }, [
            (0, import_react7.createElement)("span", { key: "name", className: "dsh-resend-rollback-filename" }, normalized.slice(split2 + 1)),
            (0, import_react7.createElement)("span", { key: "path", className: "dsh-resend-rollback-path" }, split2 < 0 ? t("files.root") : normalized.slice(0, split2 + 1)),
            file.reason !== void 0 && (0, import_react7.createElement)("span", { key: "reason", className: "dsh-resend-rollback-reason" }, t(`files.reason.${file.reason}`))
          ]),
          (0, import_react7.createElement)("span", { key: "status", className: `dsh-resend-rollback-file-status dsh-resend-rollback-${action}` }, [
            renderIcon(Icon),
            t(refused ? completed ? "files.kept" : "files.unavailable" : `files.${action}`)
          ])
        ]);
      }))
    ]),
    expanded && (0, import_react7.createElement)("footer", { key: "footer", className: "dsh-resend-rollback-footer" }, [
      (0, import_react7.createElement)("p", { key: "hint", className: "dsh-resend-rollback-hint" }, [renderIcon(import_dsh_client_ui_primitives5.IconShieldOutlineRegular), t(canExecute ? "files.confirmHint" : "files.recordedOnly")]),
      (0, import_react7.createElement)("div", { key: "actions", className: "dsh-resend-rollback-actions" }, [
        button("close", close2, t(completed ? "files.closeResult" : result?.ok && restorable ? "files.cancel" : "files.close")),
        preflight && button("keep", () => {
          void operations.chooseReplay(point.sessionId, "keep");
        }, t("replay.keep"), "outline"),
        canExecute && button("execute", () => {
          void run("execute");
        }, countText("files.executeCount", restorable), "primary"),
        result?.ok === false && button("retry", () => {
          void run("preview");
        }, t("files.retry"), "outline")
      ])
    ])
  ]);
}
var noSubscribe = () => () => {
};
function ReplayPreflight({ operations, sessionId, userSeq, targetSeq, visibleUserSeqs, portal = false, t }) {
  const entry = (0, import_react7.useSyncExternalStore)(
    operations.subscribe ?? noSubscribe,
    () => operations.preflightFor?.(sessionId),
    () => void 0
  );
  const anchor = (0, import_react7.useRef)(null);
  const active = !!entry && (visibleUserSeqs ? entry.request.targetSeq === targetSeq && !visibleUserSeqs.includes(entry.userSeq) : entry.userSeq === userSeq);
  (0, import_react7.useLayoutEffect)(() => {
    if (!active) return;
    anchor.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
    anchor.current?.focus({ preventScroll: true });
  }, [active]);
  if (!active) return null;
  const translations = {
    "files.description": entry.op === "edit" ? "replay.editDescription" : "replay.regenerateDescription",
    "files.awaiting": "replay.awaiting",
    "files.executeCount": "replay.restoreCount",
    "files.finished": "replay.awaiting",
    "files.cancel": "replay.cancel",
    "files.close": "replay.cancel",
    "files.closeResult": "replay.cancel",
    "files.confirmHint": "replay.restoreHint",
    "files.recordedOnly": "replay.waitingHint"
  };
  const panel = (0, import_react7.createElement)("div", { ref: anchor, tabIndex: -1, onKeyDown: (event) => {
    if (event.key === "Escape" && !entry.pending) {
      event.preventDefault();
      void operations.chooseReplay(sessionId, "cancel");
    }
    if (event.key !== "Tab" || !portal && !visibleUserSeqs) return;
    const buttons = [...anchor.current.querySelectorAll("button:not(:disabled)")];
    if (!buttons.length) {
      event.preventDefault();
      return;
    }
    if (event.shiftKey && (document.activeElement === buttons[0] || document.activeElement === anchor.current)) {
      event.preventDefault();
      buttons.at(-1).focus();
    } else if (!event.shiftKey && document.activeElement === buttons.at(-1)) {
      event.preventDefault();
      buttons[0].focus();
    }
  } }, (0, import_react7.createElement)(FileRollbackPreview, {
    operations,
    preflight: entry,
    point: { sessionId },
    t: (key) => {
      if (key === "files.error.preview-stale") return t("replay.stale");
      if (key === "files.error.plan-not-found") return t("replay.expired");
      const value = t(translations[key] ?? key);
      return key.startsWith("files.error.") && value === key ? t("replay.failed") : value;
    }
  }));
  if (!portal && !visibleUserSeqs) return panel;
  return (0, import_react_dom.createPortal)((0, import_react7.createElement)("div", {
    role: "dialog",
    "aria-modal": true,
    "aria-label": t("files.title"),
    className: "dsh-resend-preflight-overlay"
  }, (0, import_react7.createElement)("div", { className: "dsh-resend-preflight-dialog" }, panel)), document.body);
}

// src/regenerate.js
var import_dsh_client_ui_primitives10 = require("@deepseek-ai/dsh-client-ui-primitives");

// src/use-hiding.js
var import_react8 = require("react");

// src/hide-plan.js
var indexes = /* @__PURE__ */ new WeakMap();
var plans = /* @__PURE__ */ new WeakMap();
function chatNodes(snapshot) {
  if (typeof snapshot?.nodes?.values !== "function") throw new Error("the Chat snapshot has no readable node store");
  return snapshot.nodes.values();
}
function affectedSeq(node, turnSeqs) {
  if (node.kind === "dsh-resend-user-actions") return node.data.seq;
  if (node.kind === "turn-tail") return node.data?.closing?.finalNode?.seq ?? turnSeqs?.get(node.data?.turn);
  if (node.kind === "tool-call") return node.data?.root?.seq ?? node.anchorSeq;
  return node.anchorSeq;
}
function indexFor(snapshot, grouped) {
  const cache = indexes.get(snapshot);
  if (cache !== void 0 && cache.grouped === grouped) return cache.index;
  const bySeq = /* @__PURE__ */ new Map();
  const carriers = /* @__PURE__ */ new Map();
  const modelShadowed = /* @__PURE__ */ new Set();
  const userSeqs = /* @__PURE__ */ new Set();
  const rendered = /* @__PURE__ */ new Map();
  const groups = [];
  const eligibilityNodes = [];
  if (grouped !== void 0) {
    for (const entry of grouped.entries) {
      const members2 = entry.kind === "group" ? grouped.groupSource(entry.key)?.getSnapshot()?.members : [entry];
      if (!Array.isArray(members2)) throw new Error("Chat group " + entry.key + " has no readable members");
      const memberKeys = [];
      for (const member of members2) {
        const key = member.groupPart === void 0 || member.groupPart === "response" ? member.key : JSON.stringify([member.key, member.groupPart]);
        memberKeys.push(key);
        const keys2 = rendered.get(member.key) ?? [];
        keys2.push(key);
        rendered.set(member.key, keys2);
      }
      if (entry.kind === "group") groups.push({ key: "group:" + entry.key, members: memberKeys });
    }
  }
  const nodes = [...chatNodes(snapshot)];
  const turnSeqs = /* @__PURE__ */ new Map();
  for (const node of nodes) {
    if (node.visibility === "hidden") continue;
    const turn = node.kind === "tool-call" ? node.location?.turn?.turn ?? node.data?.root?.turn : node.kind === "assistant-step" ? node.data?.turn : void 0;
    const seq = affectedSeq(node);
    if (turn !== void 0 && typeof seq === "number" && Number.isFinite(seq)) {
      turnSeqs.set(turn, Math.max(turnSeqs.get(turn) ?? -Infinity, seq));
    }
  }
  for (const node of nodes) {
    eligibilityNodes.push([node.key, node.kind, node.anchorSeq, node.data?.seq, node.data?.prompt, node.data?.shadowedSeqs]);
    if (node.kind === "dsh-resend-error") carriers.set(node.data.carrierSeq, node.data);
    if (node.kind === "dsh-resend-surface-shadow") {
      for (const seq2 of node.data.shadowedSeqs) modelShadowed.add(seq2);
    }
    if (node.kind === "user") userSeqs.add(node.data?.seq ?? node.anchorSeq);
    if (node.visibility === "hidden") continue;
    const seq = affectedSeq(node, turnSeqs);
    if (typeof seq !== "number" || !Number.isFinite(seq)) continue;
    const flowKeys = grouped === void 0 ? [node.flowKey ?? node.key] : rendered.get(node.key) ?? [];
    if (flowKeys.some((key) => typeof key !== "string" || key === "")) throw new Error("Chat node at seq " + seq + " has no stable flow key");
    const keys2 = bySeq.get(Math.ceil(seq)) ?? [];
    keys2.push(...flowKeys);
    bySeq.set(Math.ceil(seq), keys2);
  }
  const index = { bySeq, groups, carriers, modelShadowed, userSeqs, revision: JSON.stringify(eligibilityNodes) };
  indexes.set(snapshot, { grouped, index });
  return index;
}
function planForSeqs(shadowedSeqs, index) {
  if (!Array.isArray(shadowedSeqs) || shadowedSeqs.length === 0 || shadowedSeqs.some((seq) => !Number.isSafeInteger(seq) || seq < 0)) {
    throw new Error("the rewind has no valid shadowedSeqs from Remote or carrier provenance");
  }
  const keys2 = /* @__PURE__ */ new Set();
  for (const seq of shadowedSeqs) {
    for (const key of index.bySeq.get(seq) ?? []) keys2.add(key);
  }
  return Object.freeze({ keys: Object.freeze([...keys2]), count: keys2.size, has: (key) => keys2.has(key) });
}
function hiddenKeysFor(shadowedSeqs, nodes) {
  return planForSeqs(shadowedSeqs, indexFor({ nodes }, void 0));
}
function hidePlanFor(snapshot, records, grouped) {
  if (snapshot === void 0 || snapshot === null) throw new Error("the Chat snapshot is unavailable");
  const previous = plans.get(snapshot);
  if (previous?.records === records && previous.grouped === grouped) return previous.plan;
  const index = indexFor(snapshot, grouped);
  const points = new Map(index.carriers);
  for (const record of records) points.set(record.carrierSeq, record);
  const byCarrier = /* @__PURE__ */ new Map();
  const hiddenSeqs = new Set(index.modelShadowed);
  const allKeys = /* @__PURE__ */ new Set();
  const errors = /* @__PURE__ */ new Map();
  for (const [carrierSeq, point] of points) {
    try {
      const plan2 = planForSeqs(point.shadowedSeqs, index);
      byCarrier.set(carrierSeq, plan2);
      for (const seq of point.shadowedSeqs) hiddenSeqs.add(seq);
      for (const key of plan2.keys) allKeys.add(key);
    } catch (error) {
      errors.set(carrierSeq, {
        message: "range " + JSON.stringify(point.range ?? point.shadowedSeqs ?? []) + ": " + (error?.message ?? error),
        shadowedSeqs: [...point.shadowedSeqs ?? []]
      });
    }
  }
  const groupKeys = index.groups.filter((group) => group.members.length > 0 && group.members.every((key) => allKeys.has(key))).map((group) => group.key);
  const plan = Object.freeze({
    byCarrier,
    groupKeys: Object.freeze(groupKeys),
    errors,
    hiddenSeqs,
    userSeqs: index.userSeqs,
    revision: index.revision,
    keys: Object.freeze([...allKeys]),
    carrierSeqs: new Set(index.carriers.keys())
  });
  plans.set(snapshot, { records, grouped, plan });
  return plan;
}
function hideRulesFor(keys2) {
  return keys2.map((key) => {
    if (typeof key !== "string" || key === "") throw new Error("a hide rule has no stable flow key");
    const quoted = JSON.stringify(key).replace(/\\u([0-9a-f]{4})|\\([nrtbf])/gi, (_match, hex, short) => {
      const codes = { n: "a", r: "d", t: "9", b: "8", f: "c" };
      return "\\" + (hex ?? codes[short]) + " ";
    });
    return "[data-chat-anchor-key=" + quoted.replace(/</g, "\\3c ") + "]{display:none!important}";
  }).join("\n");
}

// src/use-hiding.js
var identity = (value) => value;
function useHiding({ useChat, useConversation, sessionId, operations, node, suppressError = false }) {
  const records = (0, import_react8.useSyncExternalStore)(operations.subscribe, () => operations.recordsFor(sessionId));
  const snapshot = typeof useChat === "function" ? useChat(identity) : void 0;
  const conversation = typeof useConversation === "function" ? useConversation(identity) : void 0;
  let plan;
  let css = "";
  let error;
  try {
    const grouped = conversation?.views?.grouped?.("chat");
    plan = hidePlanFor(snapshot, records, grouped);
    css = hideRulesFor([...plan.keys, ...plan.groupKeys]);
  } catch (cause) {
    const range = records.length > 0 ? records.map((record) => record.shadowedSeqs) : node?.data?.range ?? node?.data?.shadowedSeqs ?? [node?.data?.seq ?? node?.data?.carrierSeq];
    error = "range " + JSON.stringify(range) + ": " + (cause?.message ?? cause);
  }
  const diagnostics = plan?.errors.size > 0 ? [...plan.errors.values()] : [];
  const diagnosticText = diagnostics.map((entry) => entry.message).join("; ");
  (0, import_react8.useEffect)(() => {
    if (error !== void 0 || diagnosticText !== "") console.warn("[dsh-resend] session " + sessionId + ": unable to hide rewind " + (error ?? diagnosticText));
  }, [diagnosticText, error, sessionId]);
  return { plan, css, error: suppressError ? void 0 : error, diagnostics };
}

// src/operation-error.js
var import_react9 = require("react");
var import_react_dom2 = require("react-dom");
var import_dsh_client_ui_primitives6 = require("@deepseek-ai/dsh-client-ui-primitives");
function operationErrorText(failure2, t) {
  const raw = failure2?.code ?? "client/unexpected-error";
  const code2 = typeof raw === "string" && /^[\w/-]{1,80}$/.test(raw) ? raw : "client/unexpected-error";
  const key = ERROR_CODES.includes(code2) ? code2 : code2 === "client/result-invalid" ? "result-invalid" : code2 === "gateway/cancelled" ? "cancelled" : code2.startsWith("gateway/") ? "connection" : "unexpected";
  return t("operation.error." + key) + " (" + code2 + ")";
}
function OperationErrorNotice({ anchor, text, t, onDismiss }) {
  const panel = (0, import_react9.useRef)(null);
  const [position, setPosition] = (0, import_react9.useState)(null);
  (0, import_react9.useLayoutEffect)(() => {
    const update = () => {
      const rect = anchor.current?.getBoundingClientRect();
      if (!rect || !panel.current) return;
      const width = Math.min(360, window.innerWidth - 24);
      const height = panel.current.getBoundingClientRect().height;
      const below = rect.bottom + 8;
      setPosition({
        width,
        left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
        top: Math.max(12, below + height <= window.innerHeight - 12 ? below : rect.top - height - 8),
        visibility: rect.bottom < 0 || rect.top > window.innerHeight ? "hidden" : "visible"
      });
    };
    update();
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(update) : null;
    observer?.observe(panel.current);
    document.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      observer?.disconnect();
      document.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [anchor, text]);
  return (0, import_react_dom2.createPortal)((0, import_react9.createElement)("div", {
    ref: panel,
    role: "alert",
    className: "dsh-resend-error-notice",
    style: position ?? { visibility: "hidden", width: "min(360px, calc(100vw - 24px))" }
  }, [
    (0, import_react9.createElement)("span", { key: "text" }, text),
    (0, import_react9.createElement)(IconAction, { key: "close", label: t("operation.dismiss"), icon: import_dsh_client_ui_primitives6.IconCloseOutlineRegular, onClick: onDismiss })
  ]), document.body);
}

// src/user-actions.js
var import_react12 = require("react");
var import_dsh_client_ui_primitives9 = require("@deepseek-ai/dsh-client-ui-primitives");

// src/hide-rules.js
var import_react10 = require("react");
function HideRulesElement({ css }) {
  return (0, import_react10.createElement)("style", { "data-dsh-resend-hide-rules": "true" }, css);
}
var HideRulesSurface = withPanelBoundary(HideRulesElement, "panel.error.hideRules");

// node_modules/orderedmap/dist/index.js
function OrderedMap(content) {
  this.content = content;
}
OrderedMap.prototype = {
  constructor: OrderedMap,
  find: function(key) {
    for (var i2 = 0; i2 < this.content.length; i2 += 2)
      if (this.content[i2] === key) return i2;
    return -1;
  },
  // :: (string) → ?any
  // Retrieve the value stored under `key`, or return undefined when
  // no such key exists.
  get: function(key) {
    var found2 = this.find(key);
    return found2 == -1 ? void 0 : this.content[found2 + 1];
  },
  // :: (string, any, ?string) → OrderedMap
  // Create a new map by replacing the value of `key` with a new
  // value, or adding a binding to the end of the map. If `newKey` is
  // given, the key of the binding will be replaced with that key.
  update: function(key, value, newKey) {
    var self = newKey && newKey != key ? this.remove(newKey) : this;
    var found2 = self.find(key), content = self.content.slice();
    if (found2 == -1) {
      content.push(newKey || key, value);
    } else {
      content[found2 + 1] = value;
      if (newKey) content[found2] = newKey;
    }
    return new OrderedMap(content);
  },
  // :: (string) → OrderedMap
  // Return a map with the given key removed, if it existed.
  remove: function(key) {
    var found2 = this.find(key);
    if (found2 == -1) return this;
    var content = this.content.slice();
    content.splice(found2, 2);
    return new OrderedMap(content);
  },
  // :: (string, any) → OrderedMap
  // Add a new key to the start of the map.
  addToStart: function(key, value) {
    return new OrderedMap([key, value].concat(this.remove(key).content));
  },
  // :: (string, any) → OrderedMap
  // Add a new key to the end of the map.
  addToEnd: function(key, value) {
    var content = this.remove(key).content.slice();
    content.push(key, value);
    return new OrderedMap(content);
  },
  // :: (string, string, any) → OrderedMap
  // Add a key after the given key. If `place` is not found, the new
  // key is added to the end.
  addBefore: function(place, key, value) {
    var without = this.remove(key), content = without.content.slice();
    var found2 = without.find(place);
    content.splice(found2 == -1 ? content.length : found2, 0, key, value);
    return new OrderedMap(content);
  },
  // :: ((key: string, value: any))
  // Call the given function for each key/value pair in the map, in
  // order.
  forEach: function(f) {
    for (var i2 = 0; i2 < this.content.length; i2 += 2)
      f(this.content[i2], this.content[i2 + 1]);
  },
  // :: (union<Object, OrderedMap>) → OrderedMap
  // Create a new map by prepending the keys in this map that don't
  // appear in `map` before the keys in `map`.
  prepend: function(map2) {
    map2 = OrderedMap.from(map2);
    if (!map2.size) return this;
    return new OrderedMap(map2.content.concat(this.subtract(map2).content));
  },
  // :: (union<Object, OrderedMap>) → OrderedMap
  // Create a new map by appending the keys in this map that don't
  // appear in `map` after the keys in `map`.
  append: function(map2) {
    map2 = OrderedMap.from(map2);
    if (!map2.size) return this;
    return new OrderedMap(this.subtract(map2).content.concat(map2.content));
  },
  // :: (union<Object, OrderedMap>) → OrderedMap
  // Create a map containing all the keys in this map that don't
  // appear in `map`.
  subtract: function(map2) {
    var result = this;
    map2 = OrderedMap.from(map2);
    for (var i2 = 0; i2 < map2.content.length; i2 += 2)
      result = result.remove(map2.content[i2]);
    return result;
  },
  // :: () → Object
  // Turn ordered map into a plain object.
  toObject: function() {
    var result = {};
    this.forEach(function(key, value) {
      result[key] = value;
    });
    return result;
  },
  // :: number
  // The amount of keys in this map.
  get size() {
    return this.content.length >> 1;
  }
};
OrderedMap.from = function(value) {
  if (value instanceof OrderedMap) return value;
  var content = [];
  if (value) for (var prop in value) content.push(prop, value[prop]);
  return new OrderedMap(content);
};
var dist_default = OrderedMap;

// node_modules/prosemirror-model/dist/index.js
function findDiffStart(a, b, pos) {
  for (let i2 = 0; ; i2++) {
    if (i2 == a.childCount || i2 == b.childCount)
      return a.childCount == b.childCount ? null : pos;
    let childA = a.child(i2), childB = b.child(i2);
    if (childA == childB) {
      pos += childA.nodeSize;
      continue;
    }
    if (!childA.sameMarkup(childB))
      return pos;
    if (childA.isText && childA.text != childB.text) {
      let tA = childA.text, tB = childB.text, j = 0;
      for (; tA[j] == tB[j]; j++)
        pos++;
      if (j && j < tA.length && j < tB.length && surrogateHigh(tA.charCodeAt(j - 1)) && surrogateLow(tA.charCodeAt(j)))
        pos--;
      return pos;
    }
    if (childA.content.size || childB.content.size) {
      let inner = findDiffStart(childA.content, childB.content, pos + 1);
      if (inner != null)
        return inner;
    }
    pos += childA.nodeSize;
  }
}
function findDiffEnd(a, b, posA, posB) {
  for (let iA = a.childCount, iB = b.childCount; ; ) {
    if (iA == 0 || iB == 0)
      return iA == iB ? null : { a: posA, b: posB };
    let childA = a.child(--iA), childB = b.child(--iB), size = childA.nodeSize;
    if (childA == childB) {
      posA -= size;
      posB -= size;
      continue;
    }
    if (!childA.sameMarkup(childB))
      return { a: posA, b: posB };
    if (childA.isText && childA.text != childB.text) {
      let tA = childA.text, tB = childB.text, iA2 = tA.length, iB2 = tB.length;
      while (iA2 > 0 && iB2 > 0 && tA[iA2 - 1] == tB[iB2 - 1]) {
        iA2--;
        iB2--;
        posA--;
        posB--;
      }
      if (iA2 && iB2 && iA2 < tA.length && surrogateHigh(tA.charCodeAt(iA2 - 1)) && surrogateLow(tA.charCodeAt(iA2))) {
        posA++;
        posB++;
      }
      return { a: posA, b: posB };
    }
    if (childA.content.size || childB.content.size) {
      let inner = findDiffEnd(childA.content, childB.content, posA - 1, posB - 1);
      if (inner)
        return inner;
    }
    posA -= size;
    posB -= size;
  }
}
function surrogateLow(ch) {
  return ch >= 56320 && ch < 57344;
}
function surrogateHigh(ch) {
  return ch >= 55296 && ch < 56320;
}
var Fragment2 = class _Fragment {
  /**
  @internal
  */
  constructor(content, size) {
    this.content = content;
    this.size = size || 0;
    if (size == null)
      for (let i2 = 0; i2 < content.length; i2++)
        this.size += content[i2].nodeSize;
  }
  /**
  Invoke a callback for all descendant nodes between the given two
  positions (relative to start of this fragment). Doesn't descend
  into a node when the callback returns `false`.
  */
  nodesBetween(from2, to, f, nodeStart = 0, parent) {
    for (let i2 = 0, pos = 0; pos < to; i2++) {
      let child = this.content[i2], end = pos + child.nodeSize;
      if (end > from2 && f(child, nodeStart + pos, parent || null, i2) !== false && child.content.size) {
        let start = pos + 1;
        child.nodesBetween(Math.max(0, from2 - start), Math.min(child.content.size, to - start), f, nodeStart + start);
      }
      pos = end;
    }
  }
  /**
  Call the given callback for every descendant node. `pos` will be
  relative to the start of the fragment. The callback may return
  `false` to prevent traversal of a given node's children.
  */
  descendants(f) {
    this.nodesBetween(0, this.size, f);
  }
  /**
  Extract the text between `from` and `to`. See the same method on
  [`Node`](https://prosemirror.net/docs/ref/#model.Node.textBetween).
  */
  textBetween(from2, to, blockSeparator, leafText) {
    let text = "", first = true;
    this.nodesBetween(from2, to, (node, pos) => {
      let nodeText = node.isText ? node.text.slice(Math.max(from2, pos) - pos, to - pos) : !node.isLeaf ? "" : leafText ? typeof leafText === "function" ? leafText(node) : leafText : node.type.spec.leafText ? node.type.spec.leafText(node) : "";
      if (node.isBlock && (node.isLeaf && nodeText || node.isTextblock) && blockSeparator) {
        if (first)
          first = false;
        else
          text += blockSeparator;
      }
      text += nodeText;
    }, 0);
    return text;
  }
  /**
  Create a new fragment containing the combined content of this
  fragment and the other.
  */
  append(other) {
    if (!other.size)
      return this;
    if (!this.size)
      return other;
    let last = this.lastChild, first = other.firstChild, content = this.content.slice(), i2 = 0;
    if (last.isText && last.sameMarkup(first)) {
      content[content.length - 1] = last.withText(last.text + first.text);
      i2 = 1;
    }
    for (; i2 < other.content.length; i2++)
      content.push(other.content[i2]);
    return new _Fragment(content, this.size + other.size);
  }
  /**
  Cut out the sub-fragment between the two given positions.
  */
  cut(from2, to = this.size) {
    if (from2 == 0 && to == this.size)
      return this;
    let result = [], size = 0;
    if (to > from2)
      for (let i2 = 0, pos = 0; pos < to; i2++) {
        let child = this.content[i2], end = pos + child.nodeSize;
        if (end > from2) {
          if (pos < from2 || end > to) {
            if (child.isText)
              child = child.cut(Math.max(0, from2 - pos), Math.min(child.text.length, to - pos));
            else
              child = child.cut(Math.max(0, from2 - pos - 1), Math.min(child.content.size, to - pos - 1));
          }
          result.push(child);
          size += child.nodeSize;
        }
        pos = end;
      }
    return new _Fragment(result, size);
  }
  /**
  @internal
  */
  cutByIndex(from2, to) {
    if (from2 == to)
      return _Fragment.empty;
    if (from2 == 0 && to == this.content.length)
      return this;
    return new _Fragment(this.content.slice(from2, to));
  }
  /**
  Create a new fragment in which the node at the given index is
  replaced by the given node.
  */
  replaceChild(index, node) {
    let current = this.content[index];
    if (current == node)
      return this;
    let copy2 = this.content.slice();
    let size = this.size + node.nodeSize - current.nodeSize;
    copy2[index] = node;
    return new _Fragment(copy2, size);
  }
  /**
  Create a new fragment by prepending the given node to this
  fragment.
  */
  addToStart(node) {
    return new _Fragment([node].concat(this.content), this.size + node.nodeSize);
  }
  /**
  Create a new fragment by appending the given node to this
  fragment.
  */
  addToEnd(node) {
    return new _Fragment(this.content.concat(node), this.size + node.nodeSize);
  }
  /**
  Compare this fragment to another one.
  */
  eq(other) {
    if (this.content.length != other.content.length)
      return false;
    for (let i2 = 0; i2 < this.content.length; i2++)
      if (!this.content[i2].eq(other.content[i2]))
        return false;
    return true;
  }
  /**
  The first child of the fragment, or `null` if it is empty.
  */
  get firstChild() {
    return this.content.length ? this.content[0] : null;
  }
  /**
  The last child of the fragment, or `null` if it is empty.
  */
  get lastChild() {
    return this.content.length ? this.content[this.content.length - 1] : null;
  }
  /**
  The number of child nodes in this fragment.
  */
  get childCount() {
    return this.content.length;
  }
  /**
  Get the child node at the given index. Raise an error when the
  index is out of range.
  */
  child(index) {
    let found2 = this.content[index];
    if (!found2)
      throw new RangeError("Index " + index + " out of range for " + this);
    return found2;
  }
  /**
  Get the child node at the given index, if it exists.
  */
  maybeChild(index) {
    return this.content[index] || null;
  }
  /**
  Call `f` for every child node, passing the node, its offset
  into this parent node, and its index.
  */
  forEach(f) {
    for (let i2 = 0, p = 0; i2 < this.content.length; i2++) {
      let child = this.content[i2];
      f(child, p, i2);
      p += child.nodeSize;
    }
  }
  /**
  Find the first position at which this fragment and another
  fragment differ, or `null` if they are the same.
  */
  findDiffStart(other, pos = 0) {
    return findDiffStart(this, other, pos);
  }
  /**
  Find the first position, searching from the end, at which this
  fragment and the given fragment differ, or `null` if they are
  the same. Since this position will not be the same in both
  nodes, an object with two separate positions is returned.
  */
  findDiffEnd(other, pos = this.size, otherPos = other.size) {
    return findDiffEnd(this, other, pos, otherPos);
  }
  /**
  Find the index and inner offset corresponding to a given relative
  position in this fragment. The result object will be reused
  (overwritten) the next time the function is called. @internal
  */
  findIndex(pos) {
    if (pos == 0)
      return retIndex(0, pos);
    if (pos == this.size)
      return retIndex(this.content.length, pos);
    if (pos > this.size || pos < 0)
      throw new RangeError(`Position ${pos} outside of fragment (${this})`);
    for (let i2 = 0, curPos = 0; ; i2++) {
      let cur = this.child(i2), end = curPos + cur.nodeSize;
      if (end >= pos) {
        if (end == pos)
          return retIndex(i2 + 1, end);
        return retIndex(i2, curPos);
      }
      curPos = end;
    }
  }
  /**
  Return a debugging string that describes this fragment.
  */
  toString() {
    return "<" + this.toStringInner() + ">";
  }
  /**
  @internal
  */
  toStringInner() {
    return this.content.join(", ");
  }
  /**
  Create a JSON-serializeable representation of this fragment.
  */
  toJSON() {
    return this.content.length ? this.content.map((n) => n.toJSON()) : null;
  }
  /**
  Deserialize a fragment from its JSON representation.
  */
  static fromJSON(schema2, value) {
    if (!value)
      return _Fragment.empty;
    if (!Array.isArray(value))
      throw new RangeError("Invalid input for Fragment.fromJSON");
    return _Fragment.fromArray(value.map(schema2.nodeFromJSON));
  }
  /**
  Build a fragment from an array of nodes. Ensures that adjacent
  text nodes with the same marks are joined together.
  */
  static fromArray(array2) {
    if (!array2.length)
      return _Fragment.empty;
    let joined, size = 0;
    for (let i2 = 0; i2 < array2.length; i2++) {
      let node = array2[i2];
      size += node.nodeSize;
      if (i2 && node.isText && array2[i2 - 1].sameMarkup(node)) {
        if (!joined)
          joined = array2.slice(0, i2);
        joined[joined.length - 1] = node.withText(joined[joined.length - 1].text + node.text);
      } else if (joined) {
        joined.push(node);
      }
    }
    return new _Fragment(joined || array2, size);
  }
  /**
  Create a fragment from something that can be interpreted as a
  set of nodes. For `null`, it returns the empty fragment. For a
  fragment, the fragment itself. For a node or array of nodes, a
  fragment containing those nodes.
  */
  static from(nodes) {
    if (!nodes)
      return _Fragment.empty;
    if (nodes instanceof _Fragment)
      return nodes;
    if (Array.isArray(nodes))
      return this.fromArray(nodes);
    if (nodes.attrs)
      return new _Fragment([nodes], nodes.nodeSize);
    throw new RangeError("Can not convert " + nodes + " to a Fragment" + (nodes.nodesBetween ? " (looks like multiple versions of prosemirror-model were loaded)" : ""));
  }
};
Fragment2.empty = new Fragment2([], 0);
var found = { index: 0, offset: 0 };
function retIndex(index, offset) {
  found.index = index;
  found.offset = offset;
  return found;
}
function compareDeep(a, b) {
  if (a === b)
    return true;
  if (!(a && typeof a == "object") || !(b && typeof b == "object"))
    return false;
  let array2 = Array.isArray(a);
  if (Array.isArray(b) != array2)
    return false;
  if (array2) {
    if (a.length != b.length)
      return false;
    for (let i2 = 0; i2 < a.length; i2++)
      if (!compareDeep(a[i2], b[i2]))
        return false;
  } else {
    for (let p in a)
      if (!(p in b) || !compareDeep(a[p], b[p]))
        return false;
    for (let p in b)
      if (!(p in a))
        return false;
  }
  return true;
}
var Mark = class _Mark {
  /**
  @internal
  */
  constructor(type, attrs) {
    this.type = type;
    this.attrs = attrs;
  }
  /**
  Given a set of marks, create a new set which contains this one as
  well, in the right position. If this mark is already in the set,
  the set itself is returned. If any marks that are set to be
  [exclusive](https://prosemirror.net/docs/ref/#model.MarkSpec.excludes) with this mark are present,
  those are replaced by this one.
  */
  addToSet(set) {
    let copy2, placed = false;
    for (let i2 = 0; i2 < set.length; i2++) {
      let other = set[i2];
      if (this.eq(other))
        return set;
      if (this.type.excludes(other.type)) {
        if (!copy2)
          copy2 = set.slice(0, i2);
      } else if (other.type.excludes(this.type)) {
        return set;
      } else {
        if (!placed && other.type.rank > this.type.rank) {
          if (!copy2)
            copy2 = set.slice(0, i2);
          copy2.push(this);
          placed = true;
        }
        if (copy2)
          copy2.push(other);
      }
    }
    if (!copy2)
      copy2 = set.slice();
    if (!placed)
      copy2.push(this);
    return copy2;
  }
  /**
  Remove this mark from the given set, returning a new set. If this
  mark is not in the set, the set itself is returned.
  */
  removeFromSet(set) {
    for (let i2 = 0; i2 < set.length; i2++)
      if (this.eq(set[i2]))
        return set.slice(0, i2).concat(set.slice(i2 + 1));
    return set;
  }
  /**
  Test whether this mark is in the given set of marks.
  */
  isInSet(set) {
    for (let i2 = 0; i2 < set.length; i2++)
      if (this.eq(set[i2]))
        return true;
    return false;
  }
  /**
  Test whether this mark has the same type and attributes as
  another mark.
  */
  eq(other) {
    return this == other || this.type == other.type && compareDeep(this.attrs, other.attrs);
  }
  /**
  Convert this mark to a JSON-serializeable representation.
  */
  toJSON() {
    let obj = { type: this.type.name };
    for (let _ in this.attrs) {
      obj.attrs = this.attrs;
      break;
    }
    return obj;
  }
  /**
  Deserialize a mark from JSON.
  */
  static fromJSON(schema2, json) {
    if (!json)
      throw new RangeError("Invalid input for Mark.fromJSON");
    let type = schema2.marks[json.type];
    if (!type)
      throw new RangeError(`There is no mark type ${json.type} in this schema`);
    let mark = type.create(json.attrs);
    return mark;
  }
  /**
  Test whether two sets of marks are identical.
  */
  static sameSet(a, b) {
    if (a == b)
      return true;
    if (a.length != b.length)
      return false;
    for (let i2 = 0; i2 < a.length; i2++)
      if (!a[i2].eq(b[i2]))
        return false;
    return true;
  }
  /**
  Create a properly sorted mark set from null, a single mark, or an
  unsorted array of marks.
  */
  static setFrom(marks) {
    if (!marks || Array.isArray(marks) && marks.length == 0)
      return _Mark.none;
    if (marks instanceof _Mark)
      return [marks];
    let copy2 = marks.slice();
    copy2.sort((a, b) => a.type.rank - b.type.rank);
    return copy2;
  }
};
Mark.none = [];
var ReplaceError = class extends Error {
};
var Slice = class _Slice {
  /**
  Create a slice. When specifying a non-zero open depth, you must
  make sure that there are nodes of at least that depth at the
  appropriate side of the fragment—i.e. if the fragment is an
  empty paragraph node, `openStart` and `openEnd` can't be greater
  than 1.

  It is not necessary for the content of open nodes to conform to
  the schema's content constraints, though it should be a valid
  start/end/middle for such a node, depending on which sides are
  open.
  */
  constructor(content, openStart, openEnd) {
    this.content = content;
    this.openStart = openStart;
    this.openEnd = openEnd;
  }
  /**
  The size this slice would add when inserted into a document.
  */
  get size() {
    return this.content.size - this.openStart - this.openEnd;
  }
  /**
  @internal
  */
  insertAt(pos, fragment) {
    let content = insertInto(this.content, pos + this.openStart, fragment, this.openStart + 1, this.openEnd + 1);
    return content && new _Slice(content, this.openStart, this.openEnd);
  }
  /**
  @internal
  */
  removeBetween(from2, to) {
    return new _Slice(removeRange(this.content, from2 + this.openStart, to + this.openStart), this.openStart, this.openEnd);
  }
  /**
  Tests whether this slice is equal to another slice.
  */
  eq(other) {
    return this.content.eq(other.content) && this.openStart == other.openStart && this.openEnd == other.openEnd;
  }
  /**
  @internal
  */
  toString() {
    return this.content + "(" + this.openStart + "," + this.openEnd + ")";
  }
  /**
  Convert a slice to a JSON-serializable representation.
  */
  toJSON() {
    if (!this.content.size)
      return null;
    let json = { content: this.content.toJSON() };
    if (this.openStart > 0)
      json.openStart = this.openStart;
    if (this.openEnd > 0)
      json.openEnd = this.openEnd;
    return json;
  }
  /**
  Deserialize a slice from its JSON representation.
  */
  static fromJSON(schema2, json) {
    if (!json)
      return _Slice.empty;
    let openStart = json.openStart || 0, openEnd = json.openEnd || 0;
    if (typeof openStart != "number" || typeof openEnd != "number")
      throw new RangeError("Invalid input for Slice.fromJSON");
    return new _Slice(Fragment2.fromJSON(schema2, json.content), openStart, openEnd);
  }
  /**
  Create a slice from a fragment by taking the maximum possible
  open value on both side of the fragment.
  */
  static maxOpen(fragment, openIsolating = true) {
    let openStart = 0, openEnd = 0;
    for (let n = fragment.firstChild; n && !n.isLeaf && (openIsolating || !n.type.spec.isolating); n = n.firstChild)
      openStart++;
    for (let n = fragment.lastChild; n && !n.isLeaf && (openIsolating || !n.type.spec.isolating); n = n.lastChild)
      openEnd++;
    return new _Slice(fragment, openStart, openEnd);
  }
};
Slice.empty = new Slice(Fragment2.empty, 0, 0);
function removeRange(content, from2, to) {
  let { index, offset } = content.findIndex(from2), child = content.maybeChild(index);
  let { index: indexTo, offset: offsetTo } = content.findIndex(to);
  if (offset == from2 || child.isText) {
    if (offsetTo != to && !content.child(indexTo).isText)
      throw new RangeError("Removing non-flat range");
    return content.cut(0, from2).append(content.cut(to));
  }
  if (index != indexTo)
    throw new RangeError("Removing non-flat range");
  return content.replaceChild(index, child.copy(removeRange(child.content, from2 - offset - 1, to - offset - 1)));
}
function insertInto(content, dist, insert, openStart, openEnd, parent) {
  let { index, offset } = content.findIndex(dist), child = content.maybeChild(index);
  if (offset == dist || child.isText) {
    if (parent && openStart <= 0 && openEnd <= 0 && !parent.canReplace(index, index, insert))
      return null;
    return content.cut(0, dist).append(insert).append(content.cut(dist));
  }
  let inner = insertInto(child.content, dist - offset - 1, insert, index == 0 ? openStart - 1 : 0, index == content.childCount - 1 ? openEnd - 1 : 0, child);
  return inner && content.replaceChild(index, child.copy(inner));
}
function replace($from, $to, slice2) {
  if (slice2.openStart > $from.depth)
    throw new ReplaceError("Inserted content deeper than insertion position");
  if ($from.depth - slice2.openStart != $to.depth - slice2.openEnd)
    throw new ReplaceError("Inconsistent open depths");
  return replaceOuter($from, $to, slice2, 0);
}
function replaceOuter($from, $to, slice2, depth) {
  let index = $from.index(depth), node = $from.node(depth);
  if (index == $to.index(depth) && depth < $from.depth - slice2.openStart) {
    let inner = replaceOuter($from, $to, slice2, depth + 1);
    return node.copy(node.content.replaceChild(index, inner));
  } else if (!slice2.content.size) {
    return close(node, replaceTwoWay($from, $to, depth));
  } else if (!slice2.openStart && !slice2.openEnd && $from.depth == depth && $to.depth == depth) {
    let parent = $from.parent, content = parent.content;
    return close(parent, content.cut(0, $from.parentOffset).append(slice2.content).append(content.cut($to.parentOffset)));
  } else {
    let { start, end } = prepareSliceForReplace(slice2, $from);
    return close(node, replaceThreeWay($from, start, end, $to, depth));
  }
}
function checkJoin(main, sub) {
  if (!sub.type.compatibleContent(main.type))
    throw new ReplaceError("Cannot join " + sub.type.name + " onto " + main.type.name);
}
function joinable($before, $after, depth) {
  let node = $before.node(depth);
  checkJoin(node, $after.node(depth));
  return node;
}
function addNode(child, target) {
  let last = target.length - 1;
  if (last >= 0 && child.isText && child.sameMarkup(target[last]))
    target[last] = child.withText(target[last].text + child.text);
  else
    target.push(child);
}
function addRange($start, $end, depth, target) {
  let node = ($end || $start).node(depth);
  let startIndex = 0, endIndex = $end ? $end.index(depth) : node.childCount;
  if ($start) {
    startIndex = $start.index(depth);
    if ($start.depth > depth) {
      startIndex++;
    } else if ($start.textOffset) {
      addNode($start.nodeAfter, target);
      startIndex++;
    }
  }
  for (let i2 = startIndex; i2 < endIndex; i2++)
    addNode(node.child(i2), target);
  if ($end && $end.depth == depth && $end.textOffset)
    addNode($end.nodeBefore, target);
}
function close(node, content) {
  if (!node.type.validContent(content))
    throw new ReplaceError("Invalid content for node " + node.type.name);
  return node.copy(content);
}
function replaceThreeWay($from, $start, $end, $to, depth) {
  let openStart = $from.depth > depth && joinable($from, $start, depth + 1);
  let openEnd = $to.depth > depth && joinable($end, $to, depth + 1);
  let content = [];
  addRange(null, $from, depth, content);
  if (openStart && openEnd && $start.index(depth) == $end.index(depth)) {
    checkJoin(openStart, openEnd);
    addNode(close(openStart, replaceThreeWay($from, $start, $end, $to, depth + 1)), content);
  } else {
    if (openStart)
      addNode(close(openStart, replaceTwoWay($from, $start, depth + 1)), content);
    addRange($start, $end, depth, content);
    if (openEnd)
      addNode(close(openEnd, replaceTwoWay($end, $to, depth + 1)), content);
  }
  addRange($to, null, depth, content);
  return new Fragment2(content);
}
function replaceTwoWay($from, $to, depth) {
  let content = [];
  addRange(null, $from, depth, content);
  if ($from.depth > depth) {
    let type = joinable($from, $to, depth + 1);
    addNode(close(type, replaceTwoWay($from, $to, depth + 1)), content);
  }
  addRange($to, null, depth, content);
  return new Fragment2(content);
}
function prepareSliceForReplace(slice2, $along) {
  let extra = $along.depth - slice2.openStart, parent = $along.node(extra);
  let node = parent.copy(slice2.content);
  for (let i2 = extra - 1; i2 >= 0; i2--)
    node = $along.node(i2).copy(Fragment2.from(node));
  return {
    start: node.resolveNoCache(slice2.openStart + extra),
    end: node.resolveNoCache(node.content.size - slice2.openEnd - extra)
  };
}
var ResolvedPos = class _ResolvedPos {
  /**
  @internal
  */
  constructor(pos, path, parentOffset) {
    this.pos = pos;
    this.path = path;
    this.parentOffset = parentOffset;
    this.depth = path.length / 3 - 1;
  }
  /**
  @internal
  */
  resolveDepth(val) {
    if (val == null)
      return this.depth;
    if (val < 0)
      return this.depth + val;
    return val;
  }
  /**
  The parent node that the position points into. Note that even if
  a position points into a text node, that node is not considered
  the parent—text nodes are ‘flat’ in this model, and have no content.
  */
  get parent() {
    return this.node(this.depth);
  }
  /**
  The root node in which the position was resolved.
  */
  get doc() {
    return this.node(0);
  }
  /**
  The ancestor node at the given level. `p.node(p.depth)` is the
  same as `p.parent`.
  */
  node(depth) {
    return this.path[this.resolveDepth(depth) * 3];
  }
  /**
  The index into the ancestor at the given level. If this points
  at the 3rd node in the 2nd paragraph on the top level, for
  example, `p.index(0)` is 1 and `p.index(1)` is 2.
  */
  index(depth) {
    return this.path[this.resolveDepth(depth) * 3 + 1];
  }
  /**
  The index pointing after this position into the ancestor at the
  given level.
  */
  indexAfter(depth) {
    depth = this.resolveDepth(depth);
    return this.index(depth) + (depth == this.depth && !this.textOffset ? 0 : 1);
  }
  /**
  The (absolute) position at the start of the node at the given
  level.
  */
  start(depth) {
    depth = this.resolveDepth(depth);
    return depth == 0 ? 0 : this.path[depth * 3 - 1] + 1;
  }
  /**
  The (absolute) position at the end of the node at the given
  level.
  */
  end(depth) {
    depth = this.resolveDepth(depth);
    return this.start(depth) + this.node(depth).content.size;
  }
  /**
  The (absolute) position directly before the wrapping node at the
  given level, or, when `depth` is `this.depth + 1`, the original
  position.
  */
  before(depth) {
    depth = this.resolveDepth(depth);
    if (!depth)
      throw new RangeError("There is no position before the top-level node");
    return depth == this.depth + 1 ? this.pos : this.path[depth * 3 - 1];
  }
  /**
  The (absolute) position directly after the wrapping node at the
  given level, or the original position when `depth` is `this.depth + 1`.
  */
  after(depth) {
    depth = this.resolveDepth(depth);
    if (!depth)
      throw new RangeError("There is no position after the top-level node");
    return depth == this.depth + 1 ? this.pos : this.path[depth * 3 - 1] + this.path[depth * 3].nodeSize;
  }
  /**
  When this position points into a text node, this returns the
  distance between the position and the start of the text node.
  Will be zero for positions that point between nodes.
  */
  get textOffset() {
    return this.pos - this.path[this.path.length - 1];
  }
  /**
  Get the node directly after the position, if any. If the position
  points into a text node, only the part of that node after the
  position is returned.
  */
  get nodeAfter() {
    let parent = this.parent, index = this.index(this.depth);
    if (index == parent.childCount)
      return null;
    let dOff = this.pos - this.path[this.path.length - 1], child = parent.child(index);
    return dOff ? parent.child(index).cut(dOff) : child;
  }
  /**
  Get the node directly before the position, if any. If the
  position points into a text node, only the part of that node
  before the position is returned.
  */
  get nodeBefore() {
    let index = this.index(this.depth);
    let dOff = this.pos - this.path[this.path.length - 1];
    if (dOff)
      return this.parent.child(index).cut(0, dOff);
    return index == 0 ? null : this.parent.child(index - 1);
  }
  /**
  Get the position at the given index in the parent node at the
  given depth (which defaults to `this.depth`).
  */
  posAtIndex(index, depth) {
    depth = this.resolveDepth(depth);
    let node = this.path[depth * 3], pos = depth == 0 ? 0 : this.path[depth * 3 - 1] + 1;
    for (let i2 = 0; i2 < index; i2++)
      pos += node.child(i2).nodeSize;
    return pos;
  }
  /**
  Get the marks at this position, factoring in the surrounding
  marks' [`inclusive`](https://prosemirror.net/docs/ref/#model.MarkSpec.inclusive) property. If the
  position is at the start of a non-empty node, the marks of the
  node after it (if any) are returned.
  */
  marks() {
    let parent = this.parent, index = this.index();
    if (parent.content.size == 0)
      return Mark.none;
    if (this.textOffset)
      return parent.child(index).marks;
    let main = parent.maybeChild(index - 1), other = parent.maybeChild(index);
    if (!main) {
      let tmp = main;
      main = other;
      other = tmp;
    }
    let marks = main.marks;
    for (var i2 = 0; i2 < marks.length; i2++)
      if (marks[i2].type.spec.inclusive === false && (!other || !marks[i2].isInSet(other.marks)))
        marks = marks[i2--].removeFromSet(marks);
    return marks;
  }
  /**
  Get the marks after the current position, if any, except those
  that are non-inclusive and not present at position `$end`. This
  is mostly useful for getting the set of marks to preserve after a
  deletion. Will return `null` if this position is at the end of
  its parent node or its parent node isn't a textblock (in which
  case no marks should be preserved).
  */
  marksAcross($end) {
    let after = this.parent.maybeChild(this.index());
    if (!after || !after.isInline)
      return null;
    let marks = after.marks, next = $end.parent.maybeChild($end.index());
    for (var i2 = 0; i2 < marks.length; i2++)
      if (marks[i2].type.spec.inclusive === false && (!next || !marks[i2].isInSet(next.marks)))
        marks = marks[i2--].removeFromSet(marks);
    return marks;
  }
  /**
  The depth up to which this position and the given (non-resolved)
  position share the same parent nodes.
  */
  sharedDepth(pos) {
    for (let depth = this.depth; depth > 0; depth--)
      if (this.start(depth) <= pos && this.end(depth) >= pos)
        return depth;
    return 0;
  }
  /**
  Returns a range based on the place where this position and the
  given position diverge around block content. If both point into
  the same textblock, for example, a range around that textblock
  will be returned. If they point into different blocks, the range
  around those blocks in their shared ancestor is returned. You can
  pass in an optional predicate that will be called with a parent
  node to see if a range into that parent is acceptable.
  */
  blockRange(other = this, pred) {
    if (other.pos < this.pos)
      return other.blockRange(this);
    for (let d = this.depth - (this.parent.inlineContent || this.pos == other.pos ? 1 : 0); d >= 0; d--)
      if (other.pos <= this.end(d) && (!pred || pred(this.node(d))))
        return new NodeRange(this, other, d);
    return null;
  }
  /**
  Query whether the given position shares the same parent node.
  */
  sameParent(other) {
    return this.pos - this.parentOffset == other.pos - other.parentOffset;
  }
  /**
  Return the greater of this and the given position.
  */
  max(other) {
    return other.pos > this.pos ? other : this;
  }
  /**
  Return the smaller of this and the given position.
  */
  min(other) {
    return other.pos < this.pos ? other : this;
  }
  /**
  @internal
  */
  toString() {
    let str = "";
    for (let i2 = 1; i2 <= this.depth; i2++)
      str += (str ? "/" : "") + this.node(i2).type.name + "_" + this.index(i2 - 1);
    return str + ":" + this.parentOffset;
  }
  /**
  @internal
  */
  static resolve(doc3, pos) {
    if (!(pos >= 0 && pos <= doc3.content.size))
      throw new RangeError("Position " + pos + " out of range");
    let path = [];
    let start = 0, parentOffset = pos;
    for (let node = doc3; ; ) {
      let { index, offset } = node.content.findIndex(parentOffset);
      let rem = parentOffset - offset;
      path.push(node, index, start + offset);
      if (!rem)
        break;
      node = node.child(index);
      if (node.isText)
        break;
      parentOffset = rem - 1;
      start += offset + 1;
    }
    return new _ResolvedPos(pos, path, parentOffset);
  }
  /**
  @internal
  */
  static resolveCached(doc3, pos) {
    let cache = resolveCache.get(doc3);
    if (cache) {
      for (let i2 = 0; i2 < cache.elts.length; i2++) {
        let elt = cache.elts[i2];
        if (elt.pos == pos)
          return elt;
      }
    } else {
      resolveCache.set(doc3, cache = new ResolveCache());
    }
    let result = cache.elts[cache.i] = _ResolvedPos.resolve(doc3, pos);
    cache.i = (cache.i + 1) % resolveCacheSize;
    return result;
  }
};
var ResolveCache = class {
  constructor() {
    this.elts = [];
    this.i = 0;
  }
};
var resolveCacheSize = 12;
var resolveCache = /* @__PURE__ */ new WeakMap();
var NodeRange = class {
  /**
  Construct a node range. `$from` and `$to` should point into the
  same node until at least the given `depth`, since a node range
  denotes an adjacent set of nodes in a single parent node.
  */
  constructor($from, $to, depth) {
    this.$from = $from;
    this.$to = $to;
    this.depth = depth;
  }
  /**
  The position at the start of the range.
  */
  get start() {
    return this.$from.before(this.depth + 1);
  }
  /**
  The position at the end of the range.
  */
  get end() {
    return this.$to.after(this.depth + 1);
  }
  /**
  The parent node that the range points into.
  */
  get parent() {
    return this.$from.node(this.depth);
  }
  /**
  The start index of the range in the parent node.
  */
  get startIndex() {
    return this.$from.index(this.depth);
  }
  /**
  The end index of the range in the parent node.
  */
  get endIndex() {
    return this.$to.indexAfter(this.depth);
  }
};
var emptyAttrs = /* @__PURE__ */ Object.create(null);
var Node = class _Node {
  /**
  @internal
  */
  constructor(type, attrs, content, marks = Mark.none) {
    this.type = type;
    this.attrs = attrs;
    this.marks = marks;
    this.content = content || Fragment2.empty;
  }
  /**
  The array of this node's child nodes.
  */
  get children() {
    return this.content.content;
  }
  /**
  The size of this node, as defined by the integer-based [indexing
  scheme](https://prosemirror.net/docs/guide/#doc.indexing). For text nodes, this is the
  amount of characters. For other leaf nodes, it is one. For
  non-leaf nodes, it is the size of the content plus two (the
  start and end token).
  */
  get nodeSize() {
    return this.isLeaf ? 1 : 2 + this.content.size;
  }
  /**
  The number of children that the node has.
  */
  get childCount() {
    return this.content.childCount;
  }
  /**
  Get the child node at the given index. Raises an error when the
  index is out of range.
  */
  child(index) {
    return this.content.child(index);
  }
  /**
  Get the child node at the given index, if it exists.
  */
  maybeChild(index) {
    return this.content.maybeChild(index);
  }
  /**
  Call `f` for every child node, passing the node, its offset
  into this parent node, and its index.
  */
  forEach(f) {
    this.content.forEach(f);
  }
  /**
  Invoke a callback for all descendant nodes recursively overlapping
  the given two positions that are relative to start of this
  node's content. This includes all ancestors of the nodes
  containing the two positions. The callback is invoked with the
  node, its position relative to the original node (method receiver),
  its parent node, and its child index. When the callback returns
  false for a given node, that node's children will not be
  recursed over. The last parameter can be used to specify a
  starting position to count from.
  */
  nodesBetween(from2, to, f, startPos = 0) {
    this.content.nodesBetween(from2, to, f, startPos, this);
  }
  /**
  Call the given callback for every descendant node. Doesn't
  descend into a node when the callback returns `false`.
  */
  descendants(f) {
    this.nodesBetween(0, this.content.size, f);
  }
  /**
  Concatenates all the text nodes found in this fragment and its
  children.
  */
  get textContent() {
    return this.isLeaf && this.type.spec.leafText ? this.type.spec.leafText(this) : this.textBetween(0, this.content.size, "");
  }
  /**
  Get all text between positions `from` and `to`. When
  `blockSeparator` is given, it will be inserted to separate text
  from different block nodes. If `leafText` is given, it'll be
  inserted for every non-text leaf node encountered, otherwise
  [`leafText`](https://prosemirror.net/docs/ref/#model.NodeSpec.leafText) will be used.
  */
  textBetween(from2, to, blockSeparator, leafText) {
    return this.content.textBetween(from2, to, blockSeparator, leafText);
  }
  /**
  Returns this node's first child, or `null` if there are no
  children.
  */
  get firstChild() {
    return this.content.firstChild;
  }
  /**
  Returns this node's last child, or `null` if there are no
  children.
  */
  get lastChild() {
    return this.content.lastChild;
  }
  /**
  Test whether two nodes represent the same piece of document.
  */
  eq(other) {
    return this == other || this.sameMarkup(other) && this.content.eq(other.content);
  }
  /**
  Compare the markup (type, attributes, and marks) of this node to
  those of another. Returns `true` if both have the same markup.
  */
  sameMarkup(other) {
    return this.hasMarkup(other.type, other.attrs, other.marks);
  }
  /**
  Check whether this node's markup correspond to the given type,
  attributes, and marks.
  */
  hasMarkup(type, attrs, marks) {
    return this.type == type && compareDeep(this.attrs, attrs || type.defaultAttrs || emptyAttrs) && Mark.sameSet(this.marks, marks || Mark.none);
  }
  /**
  Create a new node with the same markup as this node, containing
  the given content (or empty, if no content is given).
  */
  copy(content = null) {
    if (content == this.content)
      return this;
    return new _Node(this.type, this.attrs, content, this.marks);
  }
  /**
  Create a copy of this node, with the given set of marks instead
  of the node's own marks.
  */
  mark(marks) {
    return marks == this.marks ? this : new _Node(this.type, this.attrs, this.content, marks);
  }
  /**
  Create a copy of this node with only the content between the
  given positions. If `to` is not given, it defaults to the end of
  the node.
  */
  cut(from2, to = this.content.size) {
    if (from2 == 0 && to == this.content.size)
      return this;
    return this.copy(this.content.cut(from2, to));
  }
  /**
  Cut out the part of the document between the given positions, and
  return it as a `Slice` object.
  */
  slice(from2, to = this.content.size, includeParents = false) {
    if (from2 == to)
      return Slice.empty;
    let $from = this.resolve(from2), $to = this.resolve(to);
    let depth = includeParents ? 0 : $from.sharedDepth(to);
    let start = $from.start(depth), node = $from.node(depth);
    let content = node.content.cut($from.pos - start, $to.pos - start);
    return new Slice(content, $from.depth - depth, $to.depth - depth);
  }
  /**
  Replace the part of the document between the given positions with
  the given slice. The slice must 'fit', meaning its open sides
  must be able to connect to the surrounding content, and its
  content nodes must be valid children for the node they are placed
  into. If any of this is violated, an error of type
  [`ReplaceError`](https://prosemirror.net/docs/ref/#model.ReplaceError) is thrown.
  */
  replace(from2, to, slice2) {
    return replace(this.resolve(from2), this.resolve(to), slice2);
  }
  /**
  Find the node directly after the given position.
  */
  nodeAt(pos) {
    for (let node = this; ; ) {
      let { index, offset } = node.content.findIndex(pos);
      node = node.maybeChild(index);
      if (!node)
        return null;
      if (offset == pos || node.isText)
        return node;
      pos -= offset + 1;
    }
  }
  /**
  Find the (direct) child node after the given offset, if any,
  and return it along with its index and offset relative to this
  node.
  */
  childAfter(pos) {
    let { index, offset } = this.content.findIndex(pos);
    return { node: this.content.maybeChild(index), index, offset };
  }
  /**
  Find the (direct) child node before the given offset, if any,
  and return it along with its index and offset relative to this
  node.
  */
  childBefore(pos) {
    if (pos == 0)
      return { node: null, index: 0, offset: 0 };
    let { index, offset } = this.content.findIndex(pos);
    if (offset < pos)
      return { node: this.content.child(index), index, offset };
    let node = this.content.child(index - 1);
    return { node, index: index - 1, offset: offset - node.nodeSize };
  }
  /**
  Resolve the given position in the document, returning an
  [object](https://prosemirror.net/docs/ref/#model.ResolvedPos) with information about its context.
  */
  resolve(pos) {
    return ResolvedPos.resolveCached(this, pos);
  }
  /**
  @internal
  */
  resolveNoCache(pos) {
    return ResolvedPos.resolve(this, pos);
  }
  /**
  Test whether a given mark or mark type occurs in this document
  between the two given positions.
  */
  rangeHasMark(from2, to, type) {
    let found2 = false;
    if (to > from2)
      this.nodesBetween(from2, to, (node) => {
        if (type.isInSet(node.marks))
          found2 = true;
        return !found2;
      });
    return found2;
  }
  /**
  True when this is a block (non-inline node)
  */
  get isBlock() {
    return this.type.isBlock;
  }
  /**
  True when this is a textblock node, a block node with inline
  content.
  */
  get isTextblock() {
    return this.type.isTextblock;
  }
  /**
  True when this node allows inline content.
  */
  get inlineContent() {
    return this.type.inlineContent;
  }
  /**
  True when this is an inline node (a text node or a node that can
  appear among text).
  */
  get isInline() {
    return this.type.isInline;
  }
  /**
  True when this is a text node.
  */
  get isText() {
    return this.type.isText;
  }
  /**
  True when this is a leaf node.
  */
  get isLeaf() {
    return this.type.isLeaf;
  }
  /**
  True when this is an atom, i.e. when it does not have directly
  editable content. This is usually the same as `isLeaf`, but can
  be configured with the [`atom` property](https://prosemirror.net/docs/ref/#model.NodeSpec.atom)
  on a node's spec (typically used when the node is displayed as
  an uneditable [node view](https://prosemirror.net/docs/ref/#view.NodeView)).
  */
  get isAtom() {
    return this.type.isAtom;
  }
  /**
  Return a string representation of this node for debugging
  purposes.
  */
  toString() {
    if (this.type.spec.toDebugString)
      return this.type.spec.toDebugString(this);
    let name2 = this.type.name;
    if (this.content.size)
      name2 += "(" + this.content.toStringInner() + ")";
    return wrapMarks(this.marks, name2);
  }
  /**
  Get the content match in this node at the given index.
  */
  contentMatchAt(index) {
    let match = this.type.contentMatch.matchFragment(this.content, 0, index);
    if (!match)
      throw new Error("Called contentMatchAt on a node with invalid content");
    return match;
  }
  /**
  Test whether replacing the range between `from` and `to` (by
  child index) with the given replacement fragment (which defaults
  to the empty fragment) would leave the node's content valid. You
  can optionally pass `start` and `end` indices into the
  replacement fragment.
  */
  canReplace(from2, to, replacement = Fragment2.empty, start = 0, end = replacement.childCount) {
    let one = this.contentMatchAt(from2).matchFragment(replacement, start, end);
    let two = one && one.matchFragment(this.content, to);
    if (!two || !two.validEnd)
      return false;
    for (let i2 = start; i2 < end; i2++)
      if (!this.type.allowsMarks(replacement.child(i2).marks))
        return false;
    return true;
  }
  /**
  Test whether replacing the range `from` to `to` (by index) with
  a node of the given type would leave the node's content valid.
  */
  canReplaceWith(from2, to, type, marks) {
    if (marks && !this.type.allowsMarks(marks))
      return false;
    let start = this.contentMatchAt(from2).matchType(type);
    let end = start && start.matchFragment(this.content, to);
    return end ? end.validEnd : false;
  }
  /**
  Test whether the given node's content could be appended to this
  node. If that node is empty, this will only return true if there
  is at least one node type that can appear in both nodes (to avoid
  merging completely incompatible nodes).
  */
  canAppend(other) {
    if (other.content.size)
      return this.canReplace(this.childCount, this.childCount, other.content);
    else
      return this.type.compatibleContent(other.type);
  }
  /**
  Check whether this node and its descendants conform to the
  schema, and raise an exception when they do not.
  */
  check() {
    this.type.checkContent(this.content);
    checkAttrs(this.type.attrs, this.attrs, "node", this.type.name);
    let copy2 = Mark.none;
    for (let i2 = 0; i2 < this.marks.length; i2++) {
      let mark = this.marks[i2];
      checkAttrs(mark.type.attrs, mark.attrs, "mark", mark.type.name);
      copy2 = mark.addToSet(copy2);
    }
    if (!Mark.sameSet(copy2, this.marks))
      throw new RangeError(`Invalid collection of marks for node ${this.type.name}: ${this.marks.map((m) => m.type.name)}`);
    this.content.forEach((node) => node.check());
  }
  /**
  Return a JSON-serializeable representation of this node.
  */
  toJSON() {
    let obj = { type: this.type.name };
    for (let _ in this.attrs) {
      obj.attrs = this.attrs;
      break;
    }
    if (this.content.size)
      obj.content = this.content.toJSON();
    if (this.marks.length)
      obj.marks = this.marks.map((n) => n.toJSON());
    return obj;
  }
  /**
  Deserialize a node from its JSON representation.
  */
  static fromJSON(schema2, json) {
    if (!json)
      throw new RangeError("Invalid input for Node.fromJSON");
    let marks = void 0;
    if (json.marks) {
      if (!Array.isArray(json.marks))
        throw new RangeError("Invalid mark data for Node.fromJSON");
      marks = json.marks.map(schema2.markFromJSON);
    }
    if (json.type == "text") {
      if (typeof json.text != "string")
        throw new RangeError("Invalid text node in JSON");
      return schema2.text(json.text, marks);
    }
    let content = Fragment2.fromJSON(schema2, json.content);
    let node = schema2.nodeType(json.type).create(json.attrs, content, marks);
    return node;
  }
};
Node.prototype.text = void 0;
var TextNode = class _TextNode extends Node {
  /**
  @internal
  */
  constructor(type, attrs, content, marks) {
    super(type, attrs, null, marks);
    if (!content)
      throw new RangeError("Empty text nodes are not allowed");
    this.text = content;
  }
  toString() {
    if (this.type.spec.toDebugString)
      return this.type.spec.toDebugString(this);
    return wrapMarks(this.marks, JSON.stringify(this.text));
  }
  get textContent() {
    return this.text;
  }
  textBetween(from2, to) {
    return this.text.slice(from2, to);
  }
  get nodeSize() {
    return this.text.length;
  }
  mark(marks) {
    return marks == this.marks ? this : new _TextNode(this.type, this.attrs, this.text, marks);
  }
  withText(text) {
    if (text == this.text)
      return this;
    return new _TextNode(this.type, this.attrs, text, this.marks);
  }
  cut(from2 = 0, to = this.text.length) {
    if (from2 == 0 && to == this.text.length)
      return this;
    return this.withText(this.text.slice(from2, to));
  }
  eq(other) {
    return this.sameMarkup(other) && this.text == other.text;
  }
  toJSON() {
    let base2 = super.toJSON();
    base2.text = this.text;
    return base2;
  }
};
function wrapMarks(marks, str) {
  for (let i2 = marks.length - 1; i2 >= 0; i2--)
    str = marks[i2].type.name + "(" + str + ")";
  return str;
}
function checkAttrs(attrs, values, type, name2) {
  for (let attr in values)
    if (!(attr in attrs))
      throw new RangeError(`Unsupported attribute ${attr} for ${type} of type ${name2}`);
  for (let attr in attrs) {
    if (attrs[attr].validate)
      attrs[attr].validate(values[attr]);
  }
}
var ContentMatch = class _ContentMatch {
  /**
  @internal
  */
  constructor(validEnd) {
    this.validEnd = validEnd;
    this.next = [];
    this.wrapCache = [];
  }
  /**
  @internal
  */
  static parse(string3, nodeTypes) {
    let stream = new TokenStream(string3, nodeTypes);
    if (stream.next == null)
      return _ContentMatch.empty;
    let expr = parseExpr(stream);
    if (stream.next)
      stream.err("Unexpected trailing text");
    let match = dfa(nfa(expr));
    checkForDeadEnds(match, stream);
    return match;
  }
  /**
  Match a node type, returning a match after that node if
  successful.
  */
  matchType(type) {
    for (let i2 = 0; i2 < this.next.length; i2++)
      if (this.next[i2].type == type)
        return this.next[i2].next;
    return null;
  }
  /**
  Try to match a fragment. Returns the resulting match when
  successful.
  */
  matchFragment(frag, start = 0, end = frag.childCount) {
    let cur = this;
    for (let i2 = start; cur && i2 < end; i2++)
      cur = cur.matchType(frag.child(i2).type);
    return cur;
  }
  /**
  @internal
  */
  get inlineContent() {
    return this.next.length != 0 && this.next[0].type.isInline;
  }
  /**
  Get the first matching node type at this match position that can
  be generated.
  */
  get defaultType() {
    for (let i2 = 0; i2 < this.next.length; i2++) {
      let { type } = this.next[i2];
      if (!(type.isText || type.hasRequiredAttrs()))
        return type;
    }
    return null;
  }
  /**
  @internal
  */
  compatible(other) {
    for (let i2 = 0; i2 < this.next.length; i2++)
      for (let j = 0; j < other.next.length; j++)
        if (this.next[i2].type == other.next[j].type)
          return true;
    return false;
  }
  /**
  Try to match the given fragment, and if that fails, see if it can
  be made to match by inserting nodes in front of it. When
  successful, return a fragment of inserted nodes (which may be
  empty if nothing had to be inserted). When `toEnd` is true, only
  return a fragment if the resulting match goes to the end of the
  content expression.
  */
  fillBefore(after, toEnd = false, startIndex = 0) {
    let seen = [this];
    function search(match, types) {
      let finished = match.matchFragment(after, startIndex);
      if (finished && (!toEnd || finished.validEnd))
        return Fragment2.from(types.map((tp) => tp.createAndFill()));
      for (let i2 = 0; i2 < match.next.length; i2++) {
        let { type, next } = match.next[i2];
        if (!(type.isText || type.hasRequiredAttrs()) && seen.indexOf(next) == -1) {
          seen.push(next);
          let found2 = search(next, types.concat(type));
          if (found2)
            return found2;
        }
      }
      return null;
    }
    return search(this, []);
  }
  /**
  Find a set of wrapping node types that would allow a node of the
  given type to appear at this position. The result may be empty
  (when it fits directly) and will be null when no such wrapping
  exists.
  */
  findWrapping(target) {
    for (let i2 = 0; i2 < this.wrapCache.length; i2 += 2)
      if (this.wrapCache[i2] == target)
        return this.wrapCache[i2 + 1];
    let computed = this.computeWrapping(target);
    this.wrapCache.push(target, computed);
    return computed;
  }
  /**
  @internal
  */
  computeWrapping(target) {
    let seen = /* @__PURE__ */ Object.create(null), active = [{ match: this, type: null, via: null }];
    while (active.length) {
      let current = active.shift(), match = current.match;
      if (match.matchType(target)) {
        let result = [];
        for (let obj = current; obj.type; obj = obj.via)
          result.push(obj.type);
        return result.reverse();
      }
      for (let i2 = 0; i2 < match.next.length; i2++) {
        let { type, next } = match.next[i2];
        if (!type.isLeaf && !type.hasRequiredAttrs() && !(type.name in seen) && (!current.type || next.validEnd)) {
          active.push({ match: type.contentMatch, type, via: current });
          seen[type.name] = true;
        }
      }
    }
    return null;
  }
  /**
  The number of outgoing edges this node has in the finite
  automaton that describes the content expression.
  */
  get edgeCount() {
    return this.next.length;
  }
  /**
  Get the _n_​th outgoing edge from this node in the finite
  automaton that describes the content expression.
  */
  edge(n) {
    if (n >= this.next.length)
      throw new RangeError(`There's no ${n}th edge in this content match`);
    return this.next[n];
  }
  /**
  @internal
  */
  toString() {
    let seen = [];
    function scan(m) {
      seen.push(m);
      for (let i2 = 0; i2 < m.next.length; i2++)
        if (seen.indexOf(m.next[i2].next) == -1)
          scan(m.next[i2].next);
    }
    scan(this);
    return seen.map((m, i2) => {
      let out = i2 + (m.validEnd ? "*" : " ") + " ";
      for (let i3 = 0; i3 < m.next.length; i3++)
        out += (i3 ? ", " : "") + m.next[i3].type.name + "->" + seen.indexOf(m.next[i3].next);
      return out;
    }).join("\n");
  }
};
ContentMatch.empty = new ContentMatch(true);
var TokenStream = class {
  constructor(string3, nodeTypes) {
    this.string = string3;
    this.nodeTypes = nodeTypes;
    this.inline = null;
    this.pos = 0;
    this.tokens = string3.split(/\s*(?=\b|\W|$)/);
    if (this.tokens[this.tokens.length - 1] == "")
      this.tokens.pop();
    if (this.tokens[0] == "")
      this.tokens.shift();
  }
  get next() {
    return this.tokens[this.pos];
  }
  eat(tok) {
    return this.next == tok && (this.pos++ || true);
  }
  err(str) {
    throw new SyntaxError(str + " (in content expression '" + this.string + "')");
  }
};
function parseExpr(stream) {
  let exprs = [];
  do {
    exprs.push(parseExprSeq(stream));
  } while (stream.eat("|"));
  return exprs.length == 1 ? exprs[0] : { type: "choice", exprs };
}
function parseExprSeq(stream) {
  let exprs = [];
  do {
    exprs.push(parseExprSubscript(stream));
  } while (stream.next && stream.next != ")" && stream.next != "|");
  return exprs.length == 1 ? exprs[0] : { type: "seq", exprs };
}
function parseExprSubscript(stream) {
  let expr = parseExprAtom(stream);
  for (; ; ) {
    if (stream.eat("+"))
      expr = { type: "plus", expr };
    else if (stream.eat("*"))
      expr = { type: "star", expr };
    else if (stream.eat("?"))
      expr = { type: "opt", expr };
    else if (stream.eat("{"))
      expr = parseExprRange(stream, expr);
    else
      break;
  }
  return expr;
}
function parseNum(stream) {
  if (/\D/.test(stream.next))
    stream.err("Expected number, got '" + stream.next + "'");
  let result = Number(stream.next);
  stream.pos++;
  return result;
}
function parseExprRange(stream, expr) {
  let min = parseNum(stream), max = min;
  if (stream.eat(",")) {
    if (stream.next != "}")
      max = parseNum(stream);
    else
      max = -1;
  }
  if (!stream.eat("}"))
    stream.err("Unclosed braced range");
  return { type: "range", min, max, expr };
}
function resolveName(stream, name2) {
  let types = stream.nodeTypes, type = types[name2];
  if (type)
    return [type];
  let result = [];
  for (let typeName in types) {
    let type2 = types[typeName];
    if (type2.isInGroup(name2))
      result.push(type2);
  }
  if (result.length == 0)
    stream.err("No node type or group '" + name2 + "' found");
  return result;
}
function parseExprAtom(stream) {
  if (stream.eat("(")) {
    let expr = parseExpr(stream);
    if (!stream.eat(")"))
      stream.err("Missing closing paren");
    return expr;
  } else if (!/\W/.test(stream.next)) {
    let exprs = resolveName(stream, stream.next).map((type) => {
      if (stream.inline == null)
        stream.inline = type.isInline;
      else if (stream.inline != type.isInline)
        stream.err("Mixing inline and block content");
      return { type: "name", value: type };
    });
    stream.pos++;
    return exprs.length == 1 ? exprs[0] : { type: "choice", exprs };
  } else {
    stream.err("Unexpected token '" + stream.next + "'");
  }
}
function nfa(expr) {
  let nfa2 = [[]];
  connect(compile(expr, 0), node());
  return nfa2;
  function node() {
    return nfa2.push([]) - 1;
  }
  function edge(from2, to, term) {
    let edge2 = { term, to };
    nfa2[from2].push(edge2);
    return edge2;
  }
  function connect(edges, to) {
    edges.forEach((edge2) => edge2.to = to);
  }
  function compile(expr2, from2) {
    if (expr2.type == "choice") {
      return expr2.exprs.reduce((out, expr3) => out.concat(compile(expr3, from2)), []);
    } else if (expr2.type == "seq") {
      for (let i2 = 0; ; i2++) {
        let next = compile(expr2.exprs[i2], from2);
        if (i2 == expr2.exprs.length - 1)
          return next;
        connect(next, from2 = node());
      }
    } else if (expr2.type == "star") {
      let loop = node();
      edge(from2, loop);
      connect(compile(expr2.expr, loop), loop);
      return [edge(loop)];
    } else if (expr2.type == "plus") {
      let loop = node();
      connect(compile(expr2.expr, from2), loop);
      connect(compile(expr2.expr, loop), loop);
      return [edge(loop)];
    } else if (expr2.type == "opt") {
      return [edge(from2)].concat(compile(expr2.expr, from2));
    } else if (expr2.type == "range") {
      let cur = from2;
      for (let i2 = 0; i2 < expr2.min; i2++) {
        let next = node();
        connect(compile(expr2.expr, cur), next);
        cur = next;
      }
      if (expr2.max == -1) {
        connect(compile(expr2.expr, cur), cur);
      } else {
        for (let i2 = expr2.min; i2 < expr2.max; i2++) {
          let next = node();
          edge(cur, next);
          connect(compile(expr2.expr, cur), next);
          cur = next;
        }
      }
      return [edge(cur)];
    } else if (expr2.type == "name") {
      return [edge(from2, void 0, expr2.value)];
    } else {
      throw new Error("Unknown expr type");
    }
  }
}
function cmp(a, b) {
  return b - a;
}
function nullFrom(nfa2, node) {
  let result = [];
  scan(node);
  return result.sort(cmp);
  function scan(node2) {
    let edges = nfa2[node2];
    if (edges.length == 1 && !edges[0].term)
      return scan(edges[0].to);
    result.push(node2);
    for (let i2 = 0; i2 < edges.length; i2++) {
      let { term, to } = edges[i2];
      if (!term && result.indexOf(to) == -1)
        scan(to);
    }
  }
}
function dfa(nfa2) {
  let labeled = /* @__PURE__ */ Object.create(null);
  return explore(nullFrom(nfa2, 0));
  function explore(states) {
    let out = [];
    states.forEach((node) => {
      nfa2[node].forEach(({ term, to }) => {
        if (!term)
          return;
        let set;
        for (let i2 = 0; i2 < out.length; i2++)
          if (out[i2][0] == term)
            set = out[i2][1];
        nullFrom(nfa2, to).forEach((node2) => {
          if (!set)
            out.push([term, set = []]);
          if (set.indexOf(node2) == -1)
            set.push(node2);
        });
      });
    });
    let state = labeled[states.join(",")] = new ContentMatch(states.indexOf(nfa2.length - 1) > -1);
    for (let i2 = 0; i2 < out.length; i2++) {
      let states2 = out[i2][1].sort(cmp);
      state.next.push({ type: out[i2][0], next: labeled[states2.join(",")] || explore(states2) });
    }
    return state;
  }
}
function checkForDeadEnds(match, stream) {
  for (let i2 = 0, work = [match]; i2 < work.length; i2++) {
    let state = work[i2], dead = !state.validEnd, nodes = [];
    for (let j = 0; j < state.next.length; j++) {
      let { type, next } = state.next[j];
      nodes.push(type.name);
      if (dead && !(type.isText || type.hasRequiredAttrs()))
        dead = false;
      if (work.indexOf(next) == -1)
        work.push(next);
    }
    if (dead)
      stream.err("Only non-generatable nodes (" + nodes.join(", ") + ") in a required position (see https://prosemirror.net/docs/guide/#generatable)");
  }
}
function defaultAttrs(attrs) {
  let defaults = /* @__PURE__ */ Object.create(null);
  for (let attrName in attrs) {
    let attr = attrs[attrName];
    if (!attr.hasDefault)
      return null;
    defaults[attrName] = attr.default;
  }
  return defaults;
}
function computeAttrs(attrs, value) {
  let built = /* @__PURE__ */ Object.create(null);
  for (let name2 in attrs) {
    let attr = attrs[name2];
    let given = value && value[name2];
    if (given === void 0) {
      if (attr.hasDefault)
        given = attr.default;
      else
        throw new RangeError("No value supplied for attribute " + name2);
    } else if (attr.validate) {
      attr.validate(given);
    }
    built[name2] = given;
  }
  return built;
}
function initAttrs(typeName, attrs) {
  let result = /* @__PURE__ */ Object.create(null);
  if (attrs)
    for (let name2 in attrs)
      result[name2] = new Attribute(typeName, name2, attrs[name2]);
  return result;
}
var NodeType = class _NodeType {
  /**
  @internal
  */
  constructor(name2, schema2, spec) {
    this.name = name2;
    this.schema = schema2;
    this.spec = spec;
    this.markSet = null;
    this.groups = spec.group ? spec.group.split(" ") : [];
    this.attrs = initAttrs(name2, spec.attrs);
    this.defaultAttrs = defaultAttrs(this.attrs);
    this.contentMatch = null;
    this.inlineContent = null;
    this.isBlock = !(spec.inline || name2 == "text");
    this.isText = name2 == "text";
  }
  /**
  True if this is an inline type.
  */
  get isInline() {
    return !this.isBlock;
  }
  /**
  True if this is a textblock type, a block that contains inline
  content.
  */
  get isTextblock() {
    return this.isBlock && this.inlineContent;
  }
  /**
  True for node types that allow no content.
  */
  get isLeaf() {
    return this.contentMatch == ContentMatch.empty;
  }
  /**
  True when this node is an atom, i.e. when it does not have
  directly editable content.
  */
  get isAtom() {
    return this.isLeaf || !!this.spec.atom;
  }
  /**
  Return true when this node type is part of the given
  [group](https://prosemirror.net/docs/ref/#model.NodeSpec.group).
  */
  isInGroup(group) {
    return this.groups.indexOf(group) > -1;
  }
  /**
  The node type's [whitespace](https://prosemirror.net/docs/ref/#model.NodeSpec.whitespace) option.
  */
  get whitespace() {
    return this.spec.whitespace || (this.spec.code ? "pre" : "normal");
  }
  /**
  Tells you whether this node type has any required attributes.
  */
  hasRequiredAttrs() {
    for (let n in this.attrs)
      if (this.attrs[n].isRequired)
        return true;
    return false;
  }
  /**
  Indicates whether this node allows some of the same content as
  the given node type.
  */
  compatibleContent(other) {
    return this == other || this.contentMatch.compatible(other.contentMatch);
  }
  /**
  @internal
  */
  computeAttrs(attrs) {
    if (!attrs && this.defaultAttrs)
      return this.defaultAttrs;
    else
      return computeAttrs(this.attrs, attrs);
  }
  /**
  Create a `Node` of this type. The given attributes are
  checked and defaulted (you can pass `null` to use the type's
  defaults entirely, if no required attributes exist). `content`
  may be a `Fragment`, a node, an array of nodes, or
  `null`. Similarly `marks` may be `null` to default to the empty
  set of marks.
  */
  create(attrs = null, content, marks) {
    if (this.isText)
      throw new Error("NodeType.create can't construct text nodes");
    return new Node(this, this.computeAttrs(attrs), Fragment2.from(content), Mark.setFrom(marks));
  }
  /**
  Like [`create`](https://prosemirror.net/docs/ref/#model.NodeType.create), but check the given content
  against the node type's content restrictions, and throw an error
  if it doesn't match.
  */
  createChecked(attrs = null, content, marks) {
    content = Fragment2.from(content);
    this.checkContent(content);
    return new Node(this, this.computeAttrs(attrs), content, Mark.setFrom(marks));
  }
  /**
  Like [`create`](https://prosemirror.net/docs/ref/#model.NodeType.create), but see if it is
  necessary to add nodes to the start or end of the given fragment
  to make it fit the node. If no fitting wrapping can be found,
  return null. Note that, due to the fact that required nodes can
  always be created, this will always succeed if you pass null or
  `Fragment.empty` as content.
  */
  createAndFill(attrs = null, content, marks) {
    attrs = this.computeAttrs(attrs);
    content = Fragment2.from(content);
    if (content.size) {
      let before = this.contentMatch.fillBefore(content);
      if (!before)
        return null;
      content = before.append(content);
    }
    let matched = this.contentMatch.matchFragment(content);
    let after = matched && matched.fillBefore(Fragment2.empty, true);
    if (!after)
      return null;
    return new Node(this, attrs, content.append(after), Mark.setFrom(marks));
  }
  /**
  Returns true if the given fragment is valid content for this node
  type.
  */
  validContent(content) {
    let result = this.contentMatch.matchFragment(content);
    if (!result || !result.validEnd)
      return false;
    for (let i2 = 0; i2 < content.childCount; i2++)
      if (!this.allowsMarks(content.child(i2).marks))
        return false;
    return true;
  }
  /**
  Throws a RangeError if the given fragment is not valid content for this
  node type.
  @internal
  */
  checkContent(content) {
    if (!this.validContent(content))
      throw new RangeError(`Invalid content for node ${this.name}: ${content.toString().slice(0, 50)}`);
  }
  /**
  @internal no longer useful, but called by old prosemirror-view versions
  */
  checkAttrs(attrs) {
  }
  /**
  Check whether the given mark type is allowed in this node.
  */
  allowsMarkType(markType) {
    return this.markSet == null || this.markSet.indexOf(markType) > -1;
  }
  /**
  Test whether the given set of marks are allowed in this node.
  */
  allowsMarks(marks) {
    if (this.markSet == null)
      return true;
    for (let i2 = 0; i2 < marks.length; i2++)
      if (!this.allowsMarkType(marks[i2].type))
        return false;
    return true;
  }
  /**
  Removes the marks that are not allowed in this node from the given set.
  */
  allowedMarks(marks) {
    if (this.markSet == null)
      return marks;
    let copy2;
    for (let i2 = 0; i2 < marks.length; i2++) {
      if (!this.allowsMarkType(marks[i2].type)) {
        if (!copy2)
          copy2 = marks.slice(0, i2);
      } else if (copy2) {
        copy2.push(marks[i2]);
      }
    }
    return !copy2 ? marks : copy2.length ? copy2 : Mark.none;
  }
  /**
  @internal
  */
  static compile(nodes, schema2) {
    let result = /* @__PURE__ */ Object.create(null);
    nodes.forEach((name2, spec) => result[name2] = new _NodeType(name2, schema2, spec));
    let topType = schema2.spec.topNode || "doc";
    if (!result[topType])
      throw new RangeError("Schema is missing its top node type ('" + topType + "')");
    if (!result.text)
      throw new RangeError("Every schema needs a 'text' type");
    for (let _ in result.text.attrs)
      throw new RangeError("The text node type should not have attributes");
    return result;
  }
};
function validateType(typeName, attrName, type) {
  let types = type.split("|");
  return (value) => {
    let name2 = value === null ? "null" : typeof value;
    if (types.indexOf(name2) < 0)
      throw new RangeError(`Expected value of type ${types} for attribute ${attrName} on type ${typeName}, got ${name2}`);
  };
}
var Attribute = class {
  constructor(typeName, attrName, options) {
    this.hasDefault = Object.prototype.hasOwnProperty.call(options, "default");
    this.default = options.default;
    this.validate = typeof options.validate == "string" ? validateType(typeName, attrName, options.validate) : options.validate;
  }
  get isRequired() {
    return !this.hasDefault;
  }
};
var MarkType = class _MarkType {
  /**
  @internal
  */
  constructor(name2, rank, schema2, spec) {
    this.name = name2;
    this.rank = rank;
    this.schema = schema2;
    this.spec = spec;
    this.attrs = initAttrs(name2, spec.attrs);
    this.excluded = null;
    let defaults = defaultAttrs(this.attrs);
    this.instance = defaults ? new Mark(this, defaults) : null;
  }
  /**
  Create a mark of this type. `attrs` may be `null` or an object
  containing only some of the mark's attributes. The others, if
  they have defaults, will be added.
  */
  create(attrs = null) {
    if (!attrs && this.instance)
      return this.instance;
    return new Mark(this, computeAttrs(this.attrs, attrs));
  }
  /**
  @internal
  */
  static compile(marks, schema2) {
    let result = /* @__PURE__ */ Object.create(null), rank = 0;
    marks.forEach((name2, spec) => result[name2] = new _MarkType(name2, rank++, schema2, spec));
    return result;
  }
  /**
  When there is a mark of this type in the given set, a new set
  without it is returned. Otherwise, the input set is returned.
  */
  removeFromSet(set) {
    for (var i2 = 0; i2 < set.length; i2++)
      if (set[i2].type == this) {
        set = set.slice(0, i2).concat(set.slice(i2 + 1));
        i2--;
      }
    return set;
  }
  /**
  Tests whether there is a mark of this type in the given set.
  */
  isInSet(set) {
    for (let i2 = 0; i2 < set.length; i2++)
      if (set[i2].type == this)
        return set[i2];
  }
  /**
  Queries whether a given mark type is
  [excluded](https://prosemirror.net/docs/ref/#model.MarkSpec.excludes) by this one.
  */
  excludes(other) {
    return this.excluded.indexOf(other) > -1;
  }
};
var Schema = class {
  /**
  Construct a schema from a schema [specification](https://prosemirror.net/docs/ref/#model.SchemaSpec).
  */
  constructor(spec) {
    this.linebreakReplacement = null;
    this.cached = /* @__PURE__ */ Object.create(null);
    let instanceSpec = this.spec = {};
    for (let prop in spec)
      instanceSpec[prop] = spec[prop];
    instanceSpec.nodes = dist_default.from(spec.nodes), instanceSpec.marks = dist_default.from(spec.marks || {}), this.nodes = NodeType.compile(this.spec.nodes, this);
    this.marks = MarkType.compile(this.spec.marks, this);
    let contentExprCache = /* @__PURE__ */ Object.create(null);
    for (let prop in this.nodes) {
      if (prop in this.marks)
        throw new RangeError(prop + " can not be both a node and a mark");
      let type = this.nodes[prop], contentExpr = type.spec.content || "", markExpr = type.spec.marks;
      type.contentMatch = contentExprCache[contentExpr] || (contentExprCache[contentExpr] = ContentMatch.parse(contentExpr, this.nodes));
      type.inlineContent = type.contentMatch.inlineContent;
      if (type.spec.linebreakReplacement) {
        if (this.linebreakReplacement)
          throw new RangeError("Multiple linebreak nodes defined");
        if (!type.isInline || !type.isLeaf)
          throw new RangeError("Linebreak replacement nodes must be inline leaf nodes");
        this.linebreakReplacement = type;
      }
      type.markSet = markExpr == "_" ? null : markExpr ? gatherMarks(this, markExpr.split(" ")) : markExpr == "" || !type.inlineContent ? [] : null;
    }
    for (let prop in this.marks) {
      let type = this.marks[prop], excl = type.spec.excludes;
      type.excluded = excl == null ? [type] : excl == "" ? [] : gatherMarks(this, excl.split(" "));
    }
    this.nodeFromJSON = (json) => Node.fromJSON(this, json);
    this.markFromJSON = (json) => Mark.fromJSON(this, json);
    this.topNodeType = this.nodes[this.spec.topNode || "doc"];
    this.cached.wrappings = /* @__PURE__ */ Object.create(null);
  }
  /**
  Create a node in this schema. The `type` may be a string or a
  `NodeType` instance. Attributes will be extended with defaults,
  `content` may be a `Fragment`, `null`, a `Node`, or an array of
  nodes.
  */
  node(type, attrs = null, content, marks) {
    if (typeof type == "string")
      type = this.nodeType(type);
    else if (!(type instanceof NodeType))
      throw new RangeError("Invalid node type: " + type);
    else if (type.schema != this)
      throw new RangeError("Node type from different schema used (" + type.name + ")");
    return type.createChecked(attrs, content, marks);
  }
  /**
  Create a text node in the schema. Empty text nodes are not
  allowed.
  */
  text(text, marks) {
    let type = this.nodes.text;
    return new TextNode(type, type.defaultAttrs, text, Mark.setFrom(marks));
  }
  /**
  Create a mark with the given type and attributes.
  */
  mark(type, attrs) {
    if (typeof type == "string")
      type = this.marks[type];
    return type.create(attrs);
  }
  /**
  @internal
  */
  nodeType(name2) {
    let found2 = this.nodes[name2];
    if (!found2)
      throw new RangeError("Unknown node type: " + name2);
    return found2;
  }
};
function gatherMarks(schema2, marks) {
  let found2 = [];
  for (let i2 = 0; i2 < marks.length; i2++) {
    let name2 = marks[i2], mark = schema2.marks[name2], ok = mark;
    if (mark) {
      found2.push(mark);
    } else {
      for (let prop in schema2.marks) {
        let mark2 = schema2.marks[prop];
        if (name2 == "_" || mark2.spec.group && mark2.spec.group.split(" ").indexOf(name2) > -1)
          found2.push(ok = mark2);
      }
    }
    if (!ok)
      throw new SyntaxError("Unknown mark type: '" + marks[i2] + "'");
  }
  return found2;
}
function isTagRule(rule) {
  return rule.tag != null;
}
function isStyleRule(rule) {
  return rule.style != null;
}
var DOMParser = class _DOMParser {
  /**
  Create a parser that targets the given schema, using the given
  parsing rules.
  */
  constructor(schema2, rules) {
    this.schema = schema2;
    this.rules = rules;
    this.tags = [];
    this.styles = [];
    let matchedStyles = this.matchedStyles = [];
    rules.forEach((rule) => {
      if (isTagRule(rule)) {
        this.tags.push(rule);
      } else if (isStyleRule(rule)) {
        let prop = /[^=]*/.exec(rule.style)[0];
        if (matchedStyles.indexOf(prop) < 0)
          matchedStyles.push(prop);
        this.styles.push(rule);
      }
    });
    this.normalizeLists = !this.tags.some((r) => {
      if (!/^(ul|ol)\b/.test(r.tag) || !r.node)
        return false;
      let node = schema2.nodes[r.node];
      return node.contentMatch.matchType(node);
    });
  }
  /**
  Parse a document from the content of a DOM node.
  */
  parse(dom, options = {}) {
    let context = new ParseContext(this, options, false);
    context.addAll(dom, Mark.none, options.from, options.to);
    return context.finish();
  }
  /**
  Parses the content of the given DOM node, like
  [`parse`](https://prosemirror.net/docs/ref/#model.DOMParser.parse), and takes the same set of
  options. But unlike that method, which produces a whole node,
  this one returns a slice that is open at the sides, meaning that
  the schema constraints aren't applied to the start of nodes to
  the left of the input and the end of nodes at the end.
  */
  parseSlice(dom, options = {}) {
    let context = new ParseContext(this, options, true);
    context.addAll(dom, Mark.none, options.from, options.to);
    return Slice.maxOpen(context.finish());
  }
  /**
  @internal
  */
  matchTag(dom, context, after) {
    for (let i2 = after ? this.tags.indexOf(after) + 1 : 0; i2 < this.tags.length; i2++) {
      let rule = this.tags[i2];
      if (matches(dom, rule.tag) && (rule.namespace === void 0 || dom.namespaceURI == rule.namespace) && (!rule.context || context.matchesContext(rule.context))) {
        if (rule.getAttrs) {
          let result = rule.getAttrs(dom);
          if (result === false)
            continue;
          rule.attrs = result || void 0;
        }
        return rule;
      }
    }
  }
  /**
  @internal
  */
  matchStyle(prop, value, context, after) {
    for (let i2 = after ? this.styles.indexOf(after) + 1 : 0; i2 < this.styles.length; i2++) {
      let rule = this.styles[i2], style = rule.style;
      if (style.indexOf(prop) != 0 || rule.context && !context.matchesContext(rule.context) || // Test that the style string either precisely matches the prop,
      // or has an '=' sign after the prop, followed by the given
      // value.
      style.length > prop.length && (style.charCodeAt(prop.length) != 61 || style.slice(prop.length + 1) != value))
        continue;
      if (rule.getAttrs) {
        let result = rule.getAttrs(value);
        if (result === false)
          continue;
        rule.attrs = result || void 0;
      }
      return rule;
    }
  }
  /**
  @internal
  */
  static schemaRules(schema2) {
    let result = [];
    function insert(rule) {
      let priority = rule.priority == null ? 50 : rule.priority, i2 = 0;
      for (; i2 < result.length; i2++) {
        let next = result[i2], nextPriority = next.priority == null ? 50 : next.priority;
        if (nextPriority < priority)
          break;
      }
      result.splice(i2, 0, rule);
    }
    for (let name2 in schema2.marks) {
      let rules = schema2.marks[name2].spec.parseDOM;
      if (rules)
        rules.forEach((rule) => {
          insert(rule = copy(rule));
          if (!(rule.mark || rule.ignore || rule.clearMark))
            rule.mark = name2;
        });
    }
    for (let name2 in schema2.nodes) {
      let rules = schema2.nodes[name2].spec.parseDOM;
      if (rules)
        rules.forEach((rule) => {
          insert(rule = copy(rule));
          if (!(rule.node || rule.ignore || rule.mark))
            rule.node = name2;
        });
    }
    return result;
  }
  /**
  Construct a DOM parser using the parsing rules listed in a
  schema's [node specs](https://prosemirror.net/docs/ref/#model.NodeSpec.parseDOM), reordered by
  [priority](https://prosemirror.net/docs/ref/#model.GenericParseRule.priority).
  */
  static fromSchema(schema2) {
    return schema2.cached.domParser || (schema2.cached.domParser = new _DOMParser(schema2, _DOMParser.schemaRules(schema2)));
  }
};
var blockTags = {
  address: true,
  article: true,
  aside: true,
  blockquote: true,
  body: true,
  canvas: true,
  dd: true,
  div: true,
  dl: true,
  fieldset: true,
  figcaption: true,
  figure: true,
  footer: true,
  form: true,
  h1: true,
  h2: true,
  h3: true,
  h4: true,
  h5: true,
  h6: true,
  header: true,
  hgroup: true,
  hr: true,
  li: true,
  noscript: true,
  ol: true,
  output: true,
  p: true,
  pre: true,
  section: true,
  table: true,
  tfoot: true,
  ul: true
};
var ignoreTags = {
  head: true,
  noscript: true,
  object: true,
  script: true,
  style: true,
  title: true
};
var listTags = { ol: true, ul: true };
var OPT_PRESERVE_WS = 1;
var OPT_PRESERVE_WS_FULL = 2;
var OPT_OPEN_LEFT = 4;
function wsOptionsFor(type, preserveWhitespace, base2) {
  if (preserveWhitespace != null)
    return (preserveWhitespace ? OPT_PRESERVE_WS : 0) | (preserveWhitespace === "full" ? OPT_PRESERVE_WS_FULL : 0);
  return type && type.whitespace == "pre" ? OPT_PRESERVE_WS | OPT_PRESERVE_WS_FULL : base2 & ~OPT_OPEN_LEFT;
}
var NodeContext = class {
  constructor(type, attrs, marks, solid, match, options) {
    this.type = type;
    this.attrs = attrs;
    this.marks = marks;
    this.solid = solid;
    this.options = options;
    this.content = [];
    this.activeMarks = Mark.none;
    this.match = match || (options & OPT_OPEN_LEFT ? null : type.contentMatch);
  }
  findWrapping(node) {
    if (!this.match) {
      if (!this.type)
        return [];
      let fill = this.type.contentMatch.fillBefore(Fragment2.from(node));
      if (fill) {
        this.match = this.type.contentMatch.matchFragment(fill);
      } else {
        let start = this.type.contentMatch, wrap2;
        if (wrap2 = start.findWrapping(node.type)) {
          this.match = start;
          return wrap2;
        } else {
          return null;
        }
      }
    }
    return this.match.findWrapping(node.type);
  }
  finish(openEnd) {
    if (!(this.options & OPT_PRESERVE_WS)) {
      let last = this.content[this.content.length - 1], m;
      if (last && last.isText && (m = /[ \t\r\n\u000c]+$/.exec(last.text))) {
        let text = last;
        if (last.text.length == m[0].length)
          this.content.pop();
        else
          this.content[this.content.length - 1] = text.withText(text.text.slice(0, text.text.length - m[0].length));
      }
    }
    let content = Fragment2.from(this.content);
    if (!openEnd && this.match)
      content = content.append(this.match.fillBefore(Fragment2.empty, true));
    return this.type ? this.type.create(this.attrs, content, this.marks) : content;
  }
  inlineContext(node) {
    if (this.type)
      return this.type.inlineContent;
    if (this.content.length)
      return this.content[0].isInline;
    return node.parentNode && !blockTags.hasOwnProperty(node.parentNode.nodeName.toLowerCase());
  }
};
var ParseContext = class {
  constructor(parser, options, isOpen) {
    this.parser = parser;
    this.options = options;
    this.isOpen = isOpen;
    this.open = 0;
    this.localPreserveWS = false;
    let topNode = options.topNode, topContext;
    let topOptions = wsOptionsFor(null, options.preserveWhitespace, 0) | (isOpen ? OPT_OPEN_LEFT : 0);
    if (topNode)
      topContext = new NodeContext(topNode.type, topNode.attrs, Mark.none, true, options.topMatch || topNode.type.contentMatch, topOptions);
    else if (isOpen)
      topContext = new NodeContext(null, null, Mark.none, true, null, topOptions);
    else
      topContext = new NodeContext(parser.schema.topNodeType, null, Mark.none, true, null, topOptions);
    this.nodes = [topContext];
    this.find = options.findPositions;
    this.needsBlock = false;
  }
  get top() {
    return this.nodes[this.open];
  }
  // Add a DOM node to the content. Text is inserted as text node,
  // otherwise, the node is passed to `addElement` or, if it has a
  // `style` attribute, `addElementWithStyles`.
  addDOM(dom, marks) {
    if (dom.nodeType == 3)
      this.addTextNode(dom, marks);
    else if (dom.nodeType == 1)
      this.addElement(dom, marks);
  }
  addTextNode(dom, marks) {
    let value = dom.nodeValue;
    let top = this.top, preserveWS = top.options & OPT_PRESERVE_WS_FULL ? "full" : this.localPreserveWS || (top.options & OPT_PRESERVE_WS) > 0;
    let { schema: schema2 } = this.parser;
    if (preserveWS === "full" || top.inlineContext(dom) || /[^ \t\r\n\u000c]/.test(value)) {
      if (!preserveWS) {
        value = value.replace(/[ \t\r\n\u000c]+/g, " ");
        if (/^[ \t\r\n\u000c]/.test(value) && this.open == this.nodes.length - 1) {
          let nodeBefore = top.content[top.content.length - 1];
          let domNodeBefore = dom.previousSibling;
          if (!nodeBefore || domNodeBefore && domNodeBefore.nodeName == "BR" || nodeBefore.isText && /[ \t\r\n\u000c]$/.test(nodeBefore.text))
            value = value.slice(1);
        }
      } else if (preserveWS === "full") {
        value = value.replace(/\r\n?/g, "\n");
      } else if (schema2.linebreakReplacement && /[\r\n]/.test(value) && this.top.findWrapping(schema2.linebreakReplacement.create())) {
        let lines = value.split(/\r?\n|\r/);
        for (let i2 = 0; i2 < lines.length; i2++) {
          if (i2)
            this.insertNode(schema2.linebreakReplacement.create(), marks, true);
          if (lines[i2])
            this.insertNode(schema2.text(lines[i2]), marks, !/\S/.test(lines[i2]));
        }
        value = "";
      } else {
        value = value.replace(/\r?\n|\r/g, " ");
      }
      if (value)
        this.insertNode(schema2.text(value), marks, !/\S/.test(value));
      this.findInText(dom);
    } else {
      this.findInside(dom);
    }
  }
  // Try to find a handler for the given tag and use that to parse. If
  // none is found, the element's content nodes are added directly.
  addElement(dom, marks, matchAfter) {
    let outerWS = this.localPreserveWS, top = this.top;
    if (dom.tagName == "PRE" || /pre/.test(dom.style && dom.style.whiteSpace))
      this.localPreserveWS = true;
    let name2 = dom.nodeName.toLowerCase(), ruleID;
    if (listTags.hasOwnProperty(name2) && this.parser.normalizeLists)
      normalizeList(dom);
    let rule = this.options.ruleFromNode && this.options.ruleFromNode(dom) || (ruleID = this.parser.matchTag(dom, this, matchAfter));
    out: if (rule ? rule.ignore : ignoreTags.hasOwnProperty(name2)) {
      this.findInside(dom);
      this.ignoreFallback(dom, marks);
    } else if (!rule || rule.skip || rule.closeParent) {
      if (rule && rule.closeParent)
        this.open = Math.max(0, this.open - 1);
      else if (rule && rule.skip.nodeType)
        dom = rule.skip;
      let sync, oldNeedsBlock = this.needsBlock;
      if (blockTags.hasOwnProperty(name2)) {
        if (top.content.length && top.content[0].isInline && this.open) {
          this.open--;
          top = this.top;
        }
        sync = true;
        if (!top.type)
          this.needsBlock = true;
      } else if (!dom.firstChild) {
        this.leafFallback(dom, marks);
        break out;
      }
      let innerMarks = rule && rule.skip ? marks : this.readStyles(dom, marks);
      if (innerMarks)
        this.addAll(dom, innerMarks);
      if (sync)
        this.sync(top);
      this.needsBlock = oldNeedsBlock;
    } else {
      let innerMarks = this.readStyles(dom, marks);
      if (innerMarks)
        this.addElementByRule(dom, rule, innerMarks, rule.consuming === false ? ruleID : void 0);
    }
    this.localPreserveWS = outerWS;
  }
  // Called for leaf DOM nodes that would otherwise be ignored
  leafFallback(dom, marks) {
    if (dom.nodeName == "BR" && this.top.type && this.top.type.inlineContent)
      this.addTextNode(dom.ownerDocument.createTextNode("\n"), marks);
  }
  // Called for ignored nodes
  ignoreFallback(dom, marks) {
    if (dom.nodeName == "BR" && (!this.top.type || !this.top.type.inlineContent))
      this.findPlace(this.parser.schema.text("-"), marks, true);
  }
  // Run any style parser associated with the node's styles. Either
  // return an updated array of marks, or null to indicate some of the
  // styles had a rule with `ignore` set.
  readStyles(dom, marks) {
    let styles = dom.style;
    if (styles && styles.length)
      for (let i2 = 0; i2 < this.parser.matchedStyles.length; i2++) {
        let name2 = this.parser.matchedStyles[i2], value = styles.getPropertyValue(name2);
        if (value)
          for (let after = void 0; ; ) {
            let rule = this.parser.matchStyle(name2, value, this, after);
            if (!rule)
              break;
            if (rule.ignore)
              return null;
            if (rule.clearMark)
              marks = marks.filter((m) => !rule.clearMark(m));
            else
              marks = marks.concat(this.parser.schema.marks[rule.mark].create(rule.attrs));
            if (rule.consuming === false)
              after = rule;
            else
              break;
          }
      }
    return marks;
  }
  // Look up a handler for the given node. If none are found, return
  // false. Otherwise, apply it, use its return value to drive the way
  // the node's content is wrapped, and return true.
  addElementByRule(dom, rule, marks, continueAfter) {
    let sync, nodeType;
    if (rule.node) {
      nodeType = this.parser.schema.nodes[rule.node];
      if (!nodeType.isLeaf) {
        let inner = this.enter(nodeType, rule.attrs || null, marks, rule.preserveWhitespace);
        if (inner) {
          sync = true;
          marks = inner;
        }
      } else if (!this.insertNode(nodeType.create(rule.attrs), marks, dom.nodeName == "BR")) {
        this.leafFallback(dom, marks);
      }
    } else {
      let markType = this.parser.schema.marks[rule.mark];
      marks = marks.concat(markType.create(rule.attrs));
    }
    let startIn = this.top;
    if (nodeType && nodeType.isLeaf) {
      this.findInside(dom);
    } else if (continueAfter) {
      this.addElement(dom, marks, continueAfter);
    } else if (rule.getContent) {
      this.findInside(dom);
      rule.getContent(dom, this.parser.schema).forEach((node) => this.insertNode(node, marks, false));
    } else {
      let contentDOM = dom;
      if (typeof rule.contentElement == "string")
        contentDOM = dom.querySelector(rule.contentElement);
      else if (typeof rule.contentElement == "function")
        contentDOM = rule.contentElement(dom);
      else if (rule.contentElement)
        contentDOM = rule.contentElement;
      this.findAround(dom, contentDOM, true);
      this.addAll(contentDOM, marks);
      this.findAround(dom, contentDOM, false);
    }
    if (sync && this.sync(startIn))
      this.open--;
  }
  // Add all child nodes between `startIndex` and `endIndex` (or the
  // whole node, if not given). If `sync` is passed, use it to
  // synchronize after every block element.
  addAll(parent, marks, startIndex, endIndex) {
    let index = startIndex || 0;
    for (let dom = startIndex ? parent.childNodes[startIndex] : parent.firstChild, end = endIndex == null ? null : parent.childNodes[endIndex]; dom != end; dom = dom.nextSibling, ++index) {
      this.findAtPoint(parent, index);
      this.addDOM(dom, marks);
    }
    this.findAtPoint(parent, index);
  }
  // Try to find a way to fit the given node type into the current
  // context. May add intermediate wrappers and/or leave non-solid
  // nodes that we're in.
  findPlace(node, marks, cautious) {
    let route, sync;
    for (let depth = this.open, penalty = 0; depth >= 0; depth--) {
      let cx = this.nodes[depth];
      let found2 = cx.findWrapping(node);
      if (found2 && (!route || route.length > found2.length + penalty)) {
        route = found2;
        sync = cx;
        if (!found2.length)
          break;
      }
      if (cx.solid) {
        if (cautious)
          break;
        penalty += 2;
      }
    }
    if (!route)
      return null;
    this.sync(sync);
    for (let i2 = 0; i2 < route.length; i2++)
      marks = this.enterInner(route[i2], null, marks, false);
    return marks;
  }
  // Try to insert the given node, adjusting the context when needed.
  insertNode(node, marks, cautious) {
    if (node.isInline && this.needsBlock && !this.top.type) {
      let block = this.textblockFromContext();
      if (block)
        marks = this.enterInner(block, null, marks);
    }
    let innerMarks = this.findPlace(node, marks, cautious);
    if (innerMarks) {
      this.closeExtra();
      let top = this.top;
      if (top.match)
        top.match = top.match.matchType(node.type);
      let nodeMarks = Mark.none;
      for (let m of innerMarks.concat(node.marks))
        if (top.type ? top.type.allowsMarkType(m.type) : markMayApply(m.type, node.type))
          nodeMarks = m.addToSet(nodeMarks);
      top.content.push(node.mark(nodeMarks));
      return true;
    }
    return false;
  }
  // Try to start a node of the given type, adjusting the context when
  // necessary.
  enter(type, attrs, marks, preserveWS) {
    let innerMarks = this.findPlace(type.create(attrs), marks, false);
    if (innerMarks)
      innerMarks = this.enterInner(type, attrs, marks, true, preserveWS);
    return innerMarks;
  }
  // Open a node of the given type
  enterInner(type, attrs, marks, solid = false, preserveWS) {
    this.closeExtra();
    let top = this.top;
    top.match = top.match && top.match.matchType(type);
    let options = wsOptionsFor(type, preserveWS, top.options);
    if (top.options & OPT_OPEN_LEFT && top.content.length == 0)
      options |= OPT_OPEN_LEFT;
    let applyMarks = Mark.none;
    marks = marks.filter((m) => {
      if (top.type ? top.type.allowsMarkType(m.type) : markMayApply(m.type, type)) {
        applyMarks = m.addToSet(applyMarks);
        return false;
      }
      return true;
    });
    this.nodes.push(new NodeContext(type, attrs, applyMarks, solid, null, options));
    this.open++;
    return marks;
  }
  // Make sure all nodes above this.open are finished and added to
  // their parents
  closeExtra(openEnd = false) {
    let i2 = this.nodes.length - 1;
    if (i2 > this.open) {
      for (; i2 > this.open; i2--)
        this.nodes[i2 - 1].content.push(this.nodes[i2].finish(openEnd));
      this.nodes.length = this.open + 1;
    }
  }
  finish() {
    this.open = 0;
    this.closeExtra(this.isOpen);
    return this.nodes[0].finish(!!(this.isOpen || this.options.topOpen));
  }
  sync(to) {
    for (let i2 = this.open; i2 >= 0; i2--) {
      if (this.nodes[i2] == to) {
        this.open = i2;
        return true;
      } else if (this.localPreserveWS) {
        this.nodes[i2].options |= OPT_PRESERVE_WS;
      }
    }
    return false;
  }
  get currentPos() {
    this.closeExtra();
    let pos = 0;
    for (let i2 = this.open; i2 >= 0; i2--) {
      let content = this.nodes[i2].content;
      for (let j = content.length - 1; j >= 0; j--)
        pos += content[j].nodeSize;
      if (i2)
        pos++;
    }
    return pos;
  }
  findAtPoint(parent, offset) {
    if (this.find)
      for (let i2 = 0; i2 < this.find.length; i2++) {
        if (this.find[i2].node == parent && this.find[i2].offset == offset)
          this.find[i2].pos = this.currentPos;
      }
  }
  findInside(parent) {
    if (this.find)
      for (let i2 = 0; i2 < this.find.length; i2++) {
        if (this.find[i2].pos == null && parent.nodeType == 1 && parent.contains(this.find[i2].node))
          this.find[i2].pos = this.currentPos;
      }
  }
  findAround(parent, content, before) {
    if (parent != content && this.find)
      for (let i2 = 0; i2 < this.find.length; i2++) {
        if (this.find[i2].pos == null && parent.nodeType == 1 && parent.contains(this.find[i2].node)) {
          let pos = content.compareDocumentPosition(this.find[i2].node);
          if (pos & (before ? 2 : 4))
            this.find[i2].pos = this.currentPos;
        }
      }
  }
  findInText(textNode) {
    if (this.find)
      for (let i2 = 0; i2 < this.find.length; i2++) {
        if (this.find[i2].node == textNode)
          this.find[i2].pos = this.currentPos - (textNode.nodeValue.length - this.find[i2].offset);
      }
  }
  // Determines whether the given context string matches this context.
  matchesContext(context) {
    if (context.indexOf("|") > -1)
      return context.split(/\s*\|\s*/).some(this.matchesContext, this);
    let parts = context.split("/");
    let option = this.options.context;
    let useRoot = !this.isOpen && (!option || option.parent.type == this.nodes[0].type);
    let minDepth = -(option ? option.depth + 1 : 0) + (useRoot ? 0 : 1);
    let match = (i2, depth) => {
      for (; i2 >= 0; i2--) {
        let part = parts[i2];
        if (part == "") {
          if (i2 == parts.length - 1 || i2 == 0)
            continue;
          for (; depth >= minDepth; depth--)
            if (match(i2 - 1, depth))
              return true;
          return false;
        } else {
          let next = depth > 0 || depth == 0 && useRoot ? this.nodes[depth].type : option && depth >= minDepth ? option.node(depth - minDepth).type : null;
          if (!next || next.name != part && !next.isInGroup(part))
            return false;
          depth--;
        }
      }
      return true;
    };
    return match(parts.length - 1, this.open);
  }
  textblockFromContext() {
    let $context = this.options.context;
    if ($context)
      for (let d = $context.depth; d >= 0; d--) {
        let deflt = $context.node(d).contentMatchAt($context.indexAfter(d)).defaultType;
        if (deflt && deflt.isTextblock && deflt.defaultAttrs)
          return deflt;
      }
    for (let name2 in this.parser.schema.nodes) {
      let type = this.parser.schema.nodes[name2];
      if (type.isTextblock && type.defaultAttrs)
        return type;
    }
  }
};
function normalizeList(dom) {
  for (let child = dom.firstChild, prevItem = null; child; child = child.nextSibling) {
    let name2 = child.nodeType == 1 ? child.nodeName.toLowerCase() : null;
    if (name2 && listTags.hasOwnProperty(name2) && prevItem) {
      prevItem.appendChild(child);
      child = prevItem;
    } else if (name2 == "li") {
      prevItem = child;
    } else if (name2) {
      prevItem = null;
    }
  }
}
function matches(dom, selector) {
  return (dom.matches || dom.msMatchesSelector || dom.webkitMatchesSelector || dom.mozMatchesSelector).call(dom, selector);
}
function copy(obj) {
  let copy2 = {};
  for (let prop in obj)
    copy2[prop] = obj[prop];
  return copy2;
}
function markMayApply(markType, nodeType) {
  let nodes = nodeType.schema.nodes;
  for (let name2 in nodes) {
    let parent = nodes[name2];
    if (!parent.allowsMarkType(markType))
      continue;
    let seen = [], scan = (match) => {
      seen.push(match);
      for (let i2 = 0; i2 < match.edgeCount; i2++) {
        let { type, next } = match.edge(i2);
        if (type == nodeType)
          return true;
        if (seen.indexOf(next) < 0 && scan(next))
          return true;
      }
    };
    if (scan(parent.contentMatch))
      return true;
  }
}
var DOMSerializer = class _DOMSerializer {
  /**
  Create a serializer. `nodes` should map node names to functions
  that take a node and return a description of the corresponding
  DOM. `marks` does the same for mark names, but also gets an
  argument that tells it whether the mark's content is block or
  inline content (for typical use, it'll always be inline). A mark
  serializer may be `null` to indicate that marks of that type
  should not be serialized.
  */
  constructor(nodes, marks) {
    this.nodes = nodes;
    this.marks = marks;
  }
  /**
  Serialize the content of this fragment to a DOM fragment. When
  not in the browser, the `document` option, containing a DOM
  document, should be passed so that the serializer can create
  nodes.
  */
  serializeFragment(fragment, options = {}, target) {
    if (!target)
      target = doc(options).createDocumentFragment();
    let top = target, active = [];
    fragment.forEach((node) => {
      if (active.length || node.marks.length) {
        let keep = 0, rendered = 0;
        while (keep < active.length && rendered < node.marks.length) {
          let next = node.marks[rendered];
          if (!this.marks[next.type.name]) {
            rendered++;
            continue;
          }
          if (!next.eq(active[keep][0]) || next.type.spec.spanning === false)
            break;
          keep++;
          rendered++;
        }
        while (keep < active.length)
          top = active.pop()[1];
        while (rendered < node.marks.length) {
          let add = node.marks[rendered++];
          let markDOM = this.serializeMark(add, node.isInline, options);
          if (markDOM) {
            active.push([add, top]);
            top.appendChild(markDOM.dom);
            top = markDOM.contentDOM || markDOM.dom;
          }
        }
      }
      top.appendChild(this.serializeNodeInner(node, options));
    });
    return target;
  }
  /**
  @internal
  */
  serializeNodeInner(node, options) {
    if (node.isText)
      return doc(options).createTextNode(node.text);
    let { dom, contentDOM } = renderSpec(doc(options), this.nodes[node.type.name](node), null, node.attrs);
    if (contentDOM) {
      if (node.isLeaf)
        throw new RangeError("Content hole not allowed in a leaf node spec");
      this.serializeFragment(node.content, options, contentDOM);
    }
    return dom;
  }
  /**
  Serialize this node to a DOM node. This can be useful when you
  need to serialize a part of a document, as opposed to the whole
  document. To serialize a whole document, use
  [`serializeFragment`](https://prosemirror.net/docs/ref/#model.DOMSerializer.serializeFragment) on
  its [content](https://prosemirror.net/docs/ref/#model.Node.content).
  */
  serializeNode(node, options = {}) {
    let dom = this.serializeNodeInner(node, options);
    for (let i2 = node.marks.length - 1; i2 >= 0; i2--) {
      let wrap2 = this.serializeMark(node.marks[i2], node.isInline, options);
      if (wrap2) {
        (wrap2.contentDOM || wrap2.dom).appendChild(dom);
        dom = wrap2.dom;
      }
    }
    return dom;
  }
  /**
  @internal
  */
  serializeMark(mark, inline, options = {}) {
    let toDOM = this.marks[mark.type.name];
    return toDOM && renderSpec(doc(options), toDOM(mark, inline), null, mark.attrs);
  }
  static renderSpec(doc3, structure, xmlNS = null, blockArraysIn) {
    if (typeof structure == "string")
      return { dom: doc3.createTextNode(structure) };
    return renderSpec(doc3, structure, xmlNS, blockArraysIn);
  }
  /**
  Build a serializer using the [`toDOM`](https://prosemirror.net/docs/ref/#model.NodeSpec.toDOM)
  properties in a schema's node and mark specs.
  */
  static fromSchema(schema2) {
    return schema2.cached.domSerializer || (schema2.cached.domSerializer = new _DOMSerializer(this.nodesFromSchema(schema2), this.marksFromSchema(schema2)));
  }
  /**
  Gather the serializers in a schema's node specs into an object.
  This can be useful as a base to build a custom serializer from.
  */
  static nodesFromSchema(schema2) {
    let result = gatherToDOM(schema2.nodes);
    if (!result.text)
      result.text = (node) => node.text;
    return result;
  }
  /**
  Gather the serializers in a schema's mark specs into an object.
  */
  static marksFromSchema(schema2) {
    return gatherToDOM(schema2.marks);
  }
};
function gatherToDOM(obj) {
  let result = {};
  for (let name2 in obj) {
    let toDOM = obj[name2].spec.toDOM;
    if (toDOM)
      result[name2] = toDOM;
  }
  return result;
}
function doc(options) {
  return options.document || window.document;
}
var suspiciousAttributeCache = /* @__PURE__ */ new WeakMap();
function suspiciousAttributes(attrs) {
  let value = suspiciousAttributeCache.get(attrs);
  if (value === void 0)
    suspiciousAttributeCache.set(attrs, value = suspiciousAttributesInner(attrs));
  return value;
}
function suspiciousAttributesInner(attrs) {
  let result = null;
  function scan(value) {
    if (value && typeof value == "object") {
      if (Array.isArray(value)) {
        if (typeof value[0] == "string") {
          if (!result)
            result = [];
          result.push(value);
        } else {
          for (let i2 = 0; i2 < value.length; i2++)
            scan(value[i2]);
        }
      } else {
        for (let prop in value)
          scan(value[prop]);
      }
    }
  }
  scan(attrs);
  return result;
}
function renderSpec(doc3, structure, xmlNS, blockArraysIn) {
  if (structure.nodeType == 1)
    return { dom: structure };
  if (structure.dom && structure.dom.nodeType == 1)
    return structure;
  let tagName = structure[0], suspicious;
  if (typeof tagName != "string")
    throw new RangeError("Invalid array passed to renderSpec");
  if (blockArraysIn && (suspicious = suspiciousAttributes(blockArraysIn)) && suspicious.indexOf(structure) > -1)
    throw new RangeError("Using an array from an attribute object as a DOM spec. This may be an attempted cross site scripting attack.");
  let space = tagName.indexOf(" ");
  if (space > 0) {
    xmlNS = tagName.slice(0, space);
    tagName = tagName.slice(space + 1);
  }
  let contentDOM;
  let dom = xmlNS ? doc3.createElementNS(xmlNS, tagName) : doc3.createElement(tagName);
  let attrs = structure[1], start = 1;
  if (attrs && typeof attrs == "object" && attrs.nodeType == null && !Array.isArray(attrs)) {
    start = 2;
    for (let name2 in attrs)
      if (attrs[name2] != null) {
        let space2 = name2.indexOf(" ");
        if (space2 > 0)
          dom.setAttributeNS(name2.slice(0, space2), name2.slice(space2 + 1), attrs[name2]);
        else if (name2 == "style" && dom.style)
          dom.style.cssText = attrs[name2];
        else
          dom.setAttribute(name2, attrs[name2]);
      }
  }
  for (let i2 = start; i2 < structure.length; i2++) {
    let child = structure[i2];
    if (child === 0) {
      if (i2 < structure.length - 1 || i2 > start)
        throw new RangeError("Content hole must be the only child of its parent node");
      return { dom, contentDOM: dom };
    } else if (typeof child == "string") {
      dom.appendChild(doc3.createTextNode(child));
    } else {
      let { dom: inner, contentDOM: innerContent } = renderSpec(doc3, child, xmlNS, blockArraysIn);
      dom.appendChild(inner);
      if (innerContent) {
        if (contentDOM)
          throw new RangeError("Multiple content holes");
        contentDOM = innerContent;
      }
    }
  }
  return { dom, contentDOM };
}

// node_modules/prosemirror-transform/dist/index.js
var lower16 = 65535;
var factor16 = Math.pow(2, 16);
function makeRecover(index, offset) {
  return index + offset * factor16;
}
function recoverIndex(value) {
  return value & lower16;
}
function recoverOffset(value) {
  return (value - (value & lower16)) / factor16;
}
var DEL_BEFORE = 1;
var DEL_AFTER = 2;
var DEL_ACROSS = 4;
var DEL_SIDE = 8;
var MapResult = class {
  /**
  @internal
  */
  constructor(pos, delInfo, recover) {
    this.pos = pos;
    this.delInfo = delInfo;
    this.recover = recover;
  }
  /**
  Tells you whether the position was deleted, that is, whether the
  step removed the token on the side queried (via the `assoc`)
  argument from the document.
  */
  get deleted() {
    return (this.delInfo & DEL_SIDE) > 0;
  }
  /**
  Tells you whether the token before the mapped position was deleted.
  */
  get deletedBefore() {
    return (this.delInfo & (DEL_BEFORE | DEL_ACROSS)) > 0;
  }
  /**
  True when the token after the mapped position was deleted.
  */
  get deletedAfter() {
    return (this.delInfo & (DEL_AFTER | DEL_ACROSS)) > 0;
  }
  /**
  Tells whether any of the steps mapped through deletes across the
  position (including both the token before and after the
  position).
  */
  get deletedAcross() {
    return (this.delInfo & DEL_ACROSS) > 0;
  }
};
var StepMap = class _StepMap {
  /**
  Create a position map. The modifications to the document are
  represented as an array of numbers, in which each group of three
  represents a modified chunk as `[start, oldSize, newSize]`.
  */
  constructor(ranges, inverted = false) {
    this.ranges = ranges;
    this.inverted = inverted;
    if (!ranges.length && _StepMap.empty)
      return _StepMap.empty;
  }
  /**
  @internal
  */
  recover(value) {
    let diff = 0, index = recoverIndex(value);
    if (!this.inverted)
      for (let i2 = 0; i2 < index; i2++)
        diff += this.ranges[i2 * 3 + 2] - this.ranges[i2 * 3 + 1];
    return this.ranges[index * 3] + diff + recoverOffset(value);
  }
  mapResult(pos, assoc = 1) {
    return this._map(pos, assoc, false);
  }
  map(pos, assoc = 1) {
    return this._map(pos, assoc, true);
  }
  /**
  @internal
  */
  _map(pos, assoc, simple) {
    let diff = 0, oldIndex = this.inverted ? 2 : 1, newIndex = this.inverted ? 1 : 2;
    for (let i2 = 0; i2 < this.ranges.length; i2 += 3) {
      let start = this.ranges[i2] - (this.inverted ? diff : 0);
      if (start > pos)
        break;
      let oldSize = this.ranges[i2 + oldIndex], newSize = this.ranges[i2 + newIndex], end = start + oldSize;
      if (pos <= end) {
        let side = !oldSize ? assoc : pos == start ? -1 : pos == end ? 1 : assoc;
        let result = start + diff + (side < 0 ? 0 : newSize);
        if (simple)
          return result;
        let recover = pos == (assoc < 0 ? start : end) ? null : makeRecover(i2 / 3, pos - start);
        let del2 = 0;
        if (oldSize) {
          del2 |= pos == start ? DEL_AFTER : pos == end ? DEL_BEFORE : DEL_ACROSS;
          if (assoc < 0 ? pos != start : pos != end)
            del2 |= DEL_SIDE;
        }
        return new MapResult(result, del2, recover);
      }
      diff += newSize - oldSize;
    }
    return simple ? pos + diff : new MapResult(pos + diff, 0, null);
  }
  /**
  @internal
  */
  touches(pos, recover) {
    let diff = 0, index = recoverIndex(recover);
    let oldIndex = this.inverted ? 2 : 1, newIndex = this.inverted ? 1 : 2;
    for (let i2 = 0; i2 < this.ranges.length; i2 += 3) {
      let start = this.ranges[i2] - (this.inverted ? diff : 0);
      if (start > pos)
        break;
      let oldSize = this.ranges[i2 + oldIndex], end = start + oldSize;
      if (pos <= end && i2 == index * 3)
        return true;
      diff += this.ranges[i2 + newIndex] - oldSize;
    }
    return false;
  }
  /**
  Calls the given function on each of the changed ranges included in
  this map.
  */
  forEach(f) {
    let oldIndex = this.inverted ? 2 : 1, newIndex = this.inverted ? 1 : 2;
    for (let i2 = 0, diff = 0; i2 < this.ranges.length; i2 += 3) {
      let start = this.ranges[i2], oldStart = start - (this.inverted ? diff : 0), newStart = start + (this.inverted ? 0 : diff);
      let oldSize = this.ranges[i2 + oldIndex], newSize = this.ranges[i2 + newIndex];
      f(oldStart, oldStart + oldSize, newStart, newStart + newSize);
      diff += newSize - oldSize;
    }
  }
  /**
  Create an inverted version of this map. The result can be used to
  map positions in the post-step document to the pre-step document.
  */
  invert() {
    return new _StepMap(this.ranges, !this.inverted);
  }
  /**
  @internal
  */
  toString() {
    return (this.inverted ? "-" : "") + JSON.stringify(this.ranges);
  }
  /**
  Create a map that moves all positions by offset `n` (which may be
  negative). This can be useful when applying steps meant for a
  sub-document to a larger document, or vice-versa.
  */
  static offset(n) {
    return n == 0 ? _StepMap.empty : new _StepMap(n < 0 ? [0, -n, 0] : [0, 0, n]);
  }
};
StepMap.empty = new StepMap([]);
var Mapping = class _Mapping {
  /**
  Create a new mapping with the given position maps.
  */
  constructor(maps, mirror, from2 = 0, to = maps ? maps.length : 0) {
    this.mirror = mirror;
    this.from = from2;
    this.to = to;
    this._maps = maps || [];
    this.ownData = !(maps || mirror);
  }
  /**
  The step maps in this mapping.
  */
  get maps() {
    return this._maps;
  }
  /**
  Create a mapping that maps only through a part of this one.
  */
  slice(from2 = 0, to = this.maps.length) {
    return new _Mapping(this._maps, this.mirror, from2, to);
  }
  /**
  Add a step map to the end of this mapping. If `mirrors` is
  given, it should be the index of the step map that is the mirror
  image of this one.
  */
  appendMap(map2, mirrors) {
    if (!this.ownData) {
      this._maps = this._maps.slice();
      this.mirror = this.mirror && this.mirror.slice();
      this.ownData = true;
    }
    this.to = this._maps.push(map2);
    if (mirrors != null)
      this.setMirror(this._maps.length - 1, mirrors);
  }
  /**
  Add all the step maps in a given mapping to this one (preserving
  mirroring information).
  */
  appendMapping(mapping) {
    for (let i2 = 0, startSize = this._maps.length; i2 < mapping._maps.length; i2++) {
      let mirr = mapping.getMirror(i2);
      this.appendMap(mapping._maps[i2], mirr != null && mirr < i2 ? startSize + mirr : void 0);
    }
  }
  /**
  Finds the offset of the step map that mirrors the map at the
  given offset, in this mapping (as per the second argument to
  `appendMap`).
  */
  getMirror(n) {
    if (this.mirror) {
      for (let i2 = 0; i2 < this.mirror.length; i2++)
        if (this.mirror[i2] == n)
          return this.mirror[i2 + (i2 % 2 ? -1 : 1)];
    }
  }
  /**
  @internal
  */
  setMirror(n, m) {
    if (!this.mirror)
      this.mirror = [];
    this.mirror.push(n, m);
  }
  /**
  Append the inverse of the given mapping to this one.
  */
  appendMappingInverted(mapping) {
    for (let i2 = mapping.maps.length - 1, totalSize = this._maps.length + mapping._maps.length; i2 >= 0; i2--) {
      let mirr = mapping.getMirror(i2);
      this.appendMap(mapping._maps[i2].invert(), mirr != null && mirr > i2 ? totalSize - mirr - 1 : void 0);
    }
  }
  /**
  Create an inverted version of this mapping.
  */
  invert() {
    let inverse = new _Mapping();
    inverse.appendMappingInverted(this);
    return inverse;
  }
  /**
  Map a position through this mapping.
  */
  map(pos, assoc = 1) {
    if (this.mirror)
      return this._map(pos, assoc, true);
    for (let i2 = this.from; i2 < this.to; i2++)
      pos = this._maps[i2].map(pos, assoc);
    return pos;
  }
  /**
  Map a position through this mapping, returning a mapping
  result.
  */
  mapResult(pos, assoc = 1) {
    return this._map(pos, assoc, false);
  }
  /**
  @internal
  */
  _map(pos, assoc, simple) {
    let delInfo = 0;
    for (let i2 = this.from; i2 < this.to; i2++) {
      let map2 = this._maps[i2], result = map2.mapResult(pos, assoc);
      if (result.recover != null) {
        let corr = this.getMirror(i2);
        if (corr != null && corr > i2 && corr < this.to) {
          i2 = corr;
          pos = this._maps[corr].recover(result.recover);
          continue;
        }
      }
      delInfo |= result.delInfo;
      pos = result.pos;
    }
    return simple ? pos : new MapResult(pos, delInfo, null);
  }
};
var stepsByID = /* @__PURE__ */ Object.create(null);
var Step = class {
  /**
  Get the step map that represents the changes made by this step,
  and which can be used to transform between positions in the old
  and the new document.
  */
  getMap() {
    return StepMap.empty;
  }
  /**
  Try to merge this step with another one, to be applied directly
  after it. Returns the merged step when possible, null if the
  steps can't be merged.
  */
  merge(other) {
    return null;
  }
  /**
  Deserialize a step from its JSON representation. Will call
  through to the step class' own implementation of this method.
  */
  static fromJSON(schema2, json) {
    if (!json || !json.stepType)
      throw new RangeError("Invalid input for Step.fromJSON");
    let type = stepsByID[json.stepType];
    if (!type)
      throw new RangeError(`No step type ${json.stepType} defined`);
    return type.fromJSON(schema2, json);
  }
  /**
  To be able to serialize steps to JSON, each step needs a string
  ID to attach to its JSON representation. Use this method to
  register an ID for your step classes. Try to pick something
  that's unlikely to clash with steps from other modules.
  */
  static jsonID(id, stepClass) {
    if (id in stepsByID)
      throw new RangeError("Duplicate use of step JSON ID " + id);
    stepsByID[id] = stepClass;
    stepClass.prototype.jsonID = id;
    return stepClass;
  }
};
var StepResult = class _StepResult {
  /**
  @internal
  */
  constructor(doc3, failed) {
    this.doc = doc3;
    this.failed = failed;
  }
  /**
  Create a successful step result.
  */
  static ok(doc3) {
    return new _StepResult(doc3, null);
  }
  /**
  Create a failed step result.
  */
  static fail(message) {
    return new _StepResult(null, message);
  }
  /**
  Call [`Node.replace`](https://prosemirror.net/docs/ref/#model.Node.replace) with the given
  arguments. Create a successful result if it succeeds, and a
  failed one if it throws a `ReplaceError`.
  */
  static fromReplace(doc3, from2, to, slice2) {
    try {
      return _StepResult.ok(doc3.replace(from2, to, slice2));
    } catch (e) {
      if (e instanceof ReplaceError)
        return _StepResult.fail(e.message);
      throw e;
    }
  }
};
function mapFragment(fragment, f, parent) {
  let mapped = [];
  for (let i2 = 0; i2 < fragment.childCount; i2++) {
    let child = fragment.child(i2);
    if (child.content.size)
      child = child.copy(mapFragment(child.content, f, child));
    if (child.isInline)
      child = f(child, parent, i2);
    mapped.push(child);
  }
  return Fragment2.fromArray(mapped);
}
var AddMarkStep = class _AddMarkStep extends Step {
  /**
  Create a mark step.
  */
  constructor(from2, to, mark) {
    super();
    this.from = from2;
    this.to = to;
    this.mark = mark;
  }
  apply(doc3) {
    let oldSlice = doc3.slice(this.from, this.to), $from = doc3.resolve(this.from);
    let parent = $from.node($from.sharedDepth(this.to));
    let slice2 = new Slice(mapFragment(oldSlice.content, (node, parent2) => {
      if (!node.isAtom || !parent2.type.allowsMarkType(this.mark.type))
        return node;
      return node.mark(this.mark.addToSet(node.marks));
    }, parent), oldSlice.openStart, oldSlice.openEnd);
    return StepResult.fromReplace(doc3, this.from, this.to, slice2);
  }
  invert() {
    return new RemoveMarkStep(this.from, this.to, this.mark);
  }
  map(mapping) {
    let from2 = mapping.mapResult(this.from, 1), to = mapping.mapResult(this.to, -1);
    if (from2.deleted && to.deleted || from2.pos >= to.pos)
      return null;
    return new _AddMarkStep(from2.pos, to.pos, this.mark);
  }
  merge(other) {
    if (other instanceof _AddMarkStep && other.mark.eq(this.mark) && this.from <= other.to && this.to >= other.from)
      return new _AddMarkStep(Math.min(this.from, other.from), Math.max(this.to, other.to), this.mark);
    return null;
  }
  toJSON() {
    return {
      stepType: "addMark",
      mark: this.mark.toJSON(),
      from: this.from,
      to: this.to
    };
  }
  /**
  @internal
  */
  static fromJSON(schema2, json) {
    if (typeof json.from != "number" || typeof json.to != "number")
      throw new RangeError("Invalid input for AddMarkStep.fromJSON");
    return new _AddMarkStep(json.from, json.to, schema2.markFromJSON(json.mark));
  }
};
Step.jsonID("addMark", AddMarkStep);
var RemoveMarkStep = class _RemoveMarkStep extends Step {
  /**
  Create a mark-removing step.
  */
  constructor(from2, to, mark) {
    super();
    this.from = from2;
    this.to = to;
    this.mark = mark;
  }
  apply(doc3) {
    let oldSlice = doc3.slice(this.from, this.to);
    let slice2 = new Slice(mapFragment(oldSlice.content, (node) => {
      return node.mark(this.mark.removeFromSet(node.marks));
    }, doc3), oldSlice.openStart, oldSlice.openEnd);
    return StepResult.fromReplace(doc3, this.from, this.to, slice2);
  }
  invert() {
    return new AddMarkStep(this.from, this.to, this.mark);
  }
  map(mapping) {
    let from2 = mapping.mapResult(this.from, 1), to = mapping.mapResult(this.to, -1);
    if (from2.deleted && to.deleted || from2.pos >= to.pos)
      return null;
    return new _RemoveMarkStep(from2.pos, to.pos, this.mark);
  }
  merge(other) {
    if (other instanceof _RemoveMarkStep && other.mark.eq(this.mark) && this.from <= other.to && this.to >= other.from)
      return new _RemoveMarkStep(Math.min(this.from, other.from), Math.max(this.to, other.to), this.mark);
    return null;
  }
  toJSON() {
    return {
      stepType: "removeMark",
      mark: this.mark.toJSON(),
      from: this.from,
      to: this.to
    };
  }
  /**
  @internal
  */
  static fromJSON(schema2, json) {
    if (typeof json.from != "number" || typeof json.to != "number")
      throw new RangeError("Invalid input for RemoveMarkStep.fromJSON");
    return new _RemoveMarkStep(json.from, json.to, schema2.markFromJSON(json.mark));
  }
};
Step.jsonID("removeMark", RemoveMarkStep);
var AddNodeMarkStep = class _AddNodeMarkStep extends Step {
  /**
  Create a node mark step.
  */
  constructor(pos, mark) {
    super();
    this.pos = pos;
    this.mark = mark;
  }
  apply(doc3) {
    let node = doc3.nodeAt(this.pos);
    if (!node)
      return StepResult.fail("No node at mark step's position");
    let updated = node.type.create(node.attrs, null, this.mark.addToSet(node.marks));
    return StepResult.fromReplace(doc3, this.pos, this.pos + 1, new Slice(Fragment2.from(updated), 0, node.isLeaf ? 0 : 1));
  }
  invert(doc3) {
    let node = doc3.nodeAt(this.pos);
    if (node) {
      let newSet = this.mark.addToSet(node.marks);
      if (newSet.length == node.marks.length) {
        for (let i2 = 0; i2 < node.marks.length; i2++)
          if (!node.marks[i2].isInSet(newSet))
            return new _AddNodeMarkStep(this.pos, node.marks[i2]);
        return new _AddNodeMarkStep(this.pos, this.mark);
      }
    }
    return new RemoveNodeMarkStep(this.pos, this.mark);
  }
  map(mapping) {
    let pos = mapping.mapResult(this.pos, 1);
    return pos.deletedAfter ? null : new _AddNodeMarkStep(pos.pos, this.mark);
  }
  toJSON() {
    return { stepType: "addNodeMark", pos: this.pos, mark: this.mark.toJSON() };
  }
  /**
  @internal
  */
  static fromJSON(schema2, json) {
    if (typeof json.pos != "number")
      throw new RangeError("Invalid input for AddNodeMarkStep.fromJSON");
    return new _AddNodeMarkStep(json.pos, schema2.markFromJSON(json.mark));
  }
};
Step.jsonID("addNodeMark", AddNodeMarkStep);
var RemoveNodeMarkStep = class _RemoveNodeMarkStep extends Step {
  /**
  Create a mark-removing step.
  */
  constructor(pos, mark) {
    super();
    this.pos = pos;
    this.mark = mark;
  }
  apply(doc3) {
    let node = doc3.nodeAt(this.pos);
    if (!node)
      return StepResult.fail("No node at mark step's position");
    let updated = node.type.create(node.attrs, null, this.mark.removeFromSet(node.marks));
    return StepResult.fromReplace(doc3, this.pos, this.pos + 1, new Slice(Fragment2.from(updated), 0, node.isLeaf ? 0 : 1));
  }
  invert(doc3) {
    let node = doc3.nodeAt(this.pos);
    if (!node || !this.mark.isInSet(node.marks))
      return this;
    return new AddNodeMarkStep(this.pos, this.mark);
  }
  map(mapping) {
    let pos = mapping.mapResult(this.pos, 1);
    return pos.deletedAfter ? null : new _RemoveNodeMarkStep(pos.pos, this.mark);
  }
  toJSON() {
    return { stepType: "removeNodeMark", pos: this.pos, mark: this.mark.toJSON() };
  }
  /**
  @internal
  */
  static fromJSON(schema2, json) {
    if (typeof json.pos != "number")
      throw new RangeError("Invalid input for RemoveNodeMarkStep.fromJSON");
    return new _RemoveNodeMarkStep(json.pos, schema2.markFromJSON(json.mark));
  }
};
Step.jsonID("removeNodeMark", RemoveNodeMarkStep);
var ReplaceStep = class _ReplaceStep extends Step {
  /**
  The given `slice` should fit the 'gap' between `from` and
  `to`—the depths must line up, and the surrounding nodes must be
  able to be joined with the open sides of the slice. When
  `structure` is true, the step will fail if the content between
  from and to is not just a sequence of closing and then opening
  tokens (this is to guard against rebased replace steps
  overwriting something they weren't supposed to).
  */
  constructor(from2, to, slice2, structure = false) {
    super();
    this.from = from2;
    this.to = to;
    this.slice = slice2;
    this.structure = structure;
  }
  apply(doc3) {
    if (this.structure && contentBetween(doc3, this.from, this.to))
      return StepResult.fail("Structure replace would overwrite content");
    return StepResult.fromReplace(doc3, this.from, this.to, this.slice);
  }
  getMap() {
    return new StepMap([this.from, this.to - this.from, this.slice.size]);
  }
  invert(doc3) {
    return new _ReplaceStep(this.from, this.from + this.slice.size, doc3.slice(this.from, this.to));
  }
  map(mapping) {
    let to = mapping.mapResult(this.to, -1);
    let from2 = this.from == this.to && _ReplaceStep.MAP_BIAS < 0 ? to : mapping.mapResult(this.from, 1);
    if (from2.deletedAcross && to.deletedAcross)
      return null;
    return new _ReplaceStep(from2.pos, Math.max(from2.pos, to.pos), this.slice, this.structure);
  }
  merge(other) {
    if (!(other instanceof _ReplaceStep) || other.structure || this.structure)
      return null;
    if (this.from + this.slice.size == other.from && !this.slice.openEnd && !other.slice.openStart) {
      let slice2 = this.slice.size + other.slice.size == 0 ? Slice.empty : new Slice(this.slice.content.append(other.slice.content), this.slice.openStart, other.slice.openEnd);
      return new _ReplaceStep(this.from, this.to + (other.to - other.from), slice2, this.structure);
    } else if (other.to == this.from && !this.slice.openStart && !other.slice.openEnd) {
      let slice2 = this.slice.size + other.slice.size == 0 ? Slice.empty : new Slice(other.slice.content.append(this.slice.content), other.slice.openStart, this.slice.openEnd);
      return new _ReplaceStep(other.from, this.to, slice2, this.structure);
    } else {
      return null;
    }
  }
  toJSON() {
    let json = { stepType: "replace", from: this.from, to: this.to };
    if (this.slice.size)
      json.slice = this.slice.toJSON();
    if (this.structure)
      json.structure = true;
    return json;
  }
  /**
  @internal
  */
  static fromJSON(schema2, json) {
    if (typeof json.from != "number" || typeof json.to != "number")
      throw new RangeError("Invalid input for ReplaceStep.fromJSON");
    return new _ReplaceStep(json.from, json.to, Slice.fromJSON(schema2, json.slice), !!json.structure);
  }
};
ReplaceStep.MAP_BIAS = 1;
Step.jsonID("replace", ReplaceStep);
var ReplaceAroundStep = class _ReplaceAroundStep extends Step {
  /**
  Create a replace-around step with the given range and gap.
  `insert` should be the point in the slice into which the content
  of the gap should be moved. `structure` has the same meaning as
  it has in the [`ReplaceStep`](https://prosemirror.net/docs/ref/#transform.ReplaceStep) class.
  */
  constructor(from2, to, gapFrom, gapTo, slice2, insert, structure = false) {
    super();
    this.from = from2;
    this.to = to;
    this.gapFrom = gapFrom;
    this.gapTo = gapTo;
    this.slice = slice2;
    this.insert = insert;
    this.structure = structure;
  }
  apply(doc3) {
    if (this.structure && (contentBetween(doc3, this.from, this.gapFrom) || contentBetween(doc3, this.gapTo, this.to)))
      return StepResult.fail("Structure gap-replace would overwrite content");
    let gap = doc3.slice(this.gapFrom, this.gapTo);
    if (gap.openStart || gap.openEnd)
      return StepResult.fail("Gap is not a flat range");
    let inserted = this.slice.insertAt(this.insert, gap.content);
    if (!inserted)
      return StepResult.fail("Content does not fit in gap");
    return StepResult.fromReplace(doc3, this.from, this.to, inserted);
  }
  getMap() {
    return new StepMap([
      this.from,
      this.gapFrom - this.from,
      this.insert,
      this.gapTo,
      this.to - this.gapTo,
      this.slice.size - this.insert
    ]);
  }
  invert(doc3) {
    let gap = this.gapTo - this.gapFrom;
    return new _ReplaceAroundStep(this.from, this.from + this.slice.size + gap, this.from + this.insert, this.from + this.insert + gap, doc3.slice(this.from, this.to).removeBetween(this.gapFrom - this.from, this.gapTo - this.from), this.gapFrom - this.from, this.structure);
  }
  map(mapping) {
    let from2 = mapping.mapResult(this.from, 1), to = mapping.mapResult(this.to, -1);
    let gapFrom = this.from == this.gapFrom ? from2.pos : mapping.map(this.gapFrom, -1);
    let gapTo = this.to == this.gapTo ? to.pos : mapping.map(this.gapTo, 1);
    if (from2.deletedAcross && to.deletedAcross || gapFrom < from2.pos || gapTo > to.pos)
      return null;
    return new _ReplaceAroundStep(from2.pos, to.pos, gapFrom, gapTo, this.slice, this.insert, this.structure);
  }
  toJSON() {
    let json = {
      stepType: "replaceAround",
      from: this.from,
      to: this.to,
      gapFrom: this.gapFrom,
      gapTo: this.gapTo,
      insert: this.insert
    };
    if (this.slice.size)
      json.slice = this.slice.toJSON();
    if (this.structure)
      json.structure = true;
    return json;
  }
  /**
  @internal
  */
  static fromJSON(schema2, json) {
    if (typeof json.from != "number" || typeof json.to != "number" || typeof json.gapFrom != "number" || typeof json.gapTo != "number" || typeof json.insert != "number")
      throw new RangeError("Invalid input for ReplaceAroundStep.fromJSON");
    return new _ReplaceAroundStep(json.from, json.to, json.gapFrom, json.gapTo, Slice.fromJSON(schema2, json.slice), json.insert, !!json.structure);
  }
};
Step.jsonID("replaceAround", ReplaceAroundStep);
function contentBetween(doc3, from2, to) {
  let $from = doc3.resolve(from2), dist = to - from2, depth = $from.depth;
  while (dist > 0 && depth > 0 && $from.indexAfter(depth) == $from.node(depth).childCount) {
    depth--;
    dist--;
  }
  if (dist > 0) {
    let next = $from.node(depth).maybeChild($from.indexAfter(depth));
    while (dist > 0) {
      if (!next || next.isLeaf)
        return true;
      next = next.firstChild;
      dist--;
    }
  }
  return false;
}
function addMark(tr, from2, to, mark) {
  let removed = [], added = [];
  let removing, adding;
  tr.doc.nodesBetween(from2, to, (node, pos, parent) => {
    if (!node.isInline)
      return;
    let marks = node.marks;
    if (!mark.isInSet(marks) && parent.type.allowsMarkType(mark.type)) {
      let start = Math.max(pos, from2), end = Math.min(pos + node.nodeSize, to);
      let newSet = mark.addToSet(marks);
      for (let i2 = 0; i2 < marks.length; i2++) {
        if (!marks[i2].isInSet(newSet)) {
          if (removing && removing.to == start && removing.mark.eq(marks[i2]))
            removing.to = end;
          else
            removed.push(removing = new RemoveMarkStep(start, end, marks[i2]));
        }
      }
      if (adding && adding.to == start)
        adding.to = end;
      else
        added.push(adding = new AddMarkStep(start, end, mark));
    }
  });
  removed.forEach((s) => tr.step(s));
  added.forEach((s) => tr.step(s));
}
function removeMark(tr, from2, to, mark) {
  let matched = [], step = 0;
  tr.doc.nodesBetween(from2, to, (node, pos) => {
    if (!node.isInline)
      return;
    step++;
    let toRemove = null;
    if (mark instanceof MarkType) {
      let set = node.marks, found2;
      while (found2 = mark.isInSet(set)) {
        (toRemove || (toRemove = [])).push(found2);
        set = found2.removeFromSet(set);
      }
    } else if (mark) {
      if (mark.isInSet(node.marks))
        toRemove = [mark];
    } else {
      toRemove = node.marks;
    }
    if (toRemove && toRemove.length) {
      let end = Math.min(pos + node.nodeSize, to);
      for (let i2 = 0; i2 < toRemove.length; i2++) {
        let style = toRemove[i2], found2;
        for (let j = 0; j < matched.length; j++) {
          let m = matched[j];
          if (m.step == step - 1 && style.eq(matched[j].style))
            found2 = m;
        }
        if (found2) {
          found2.to = end;
          found2.step = step;
        } else {
          matched.push({ style, from: Math.max(pos, from2), to: end, step });
        }
      }
    }
  });
  matched.forEach((m) => tr.step(new RemoveMarkStep(m.from, m.to, m.style)));
}
function clearIncompatible(tr, pos, parentType, match = parentType.contentMatch, clearNewlines = true) {
  let node = tr.doc.nodeAt(pos);
  let replSteps = [], cur = pos + 1;
  for (let i2 = 0; i2 < node.childCount; i2++) {
    let child = node.child(i2), end = cur + child.nodeSize;
    let allowed = match.matchType(child.type);
    if (!allowed) {
      replSteps.push(new ReplaceStep(cur, end, Slice.empty));
    } else {
      match = allowed;
      for (let j = 0; j < child.marks.length; j++)
        if (!parentType.allowsMarkType(child.marks[j].type))
          tr.step(new RemoveMarkStep(cur, end, child.marks[j]));
      if (clearNewlines && child.isText && parentType.whitespace != "pre") {
        let m, newline = /\r?\n|\r/g, slice2;
        while (m = newline.exec(child.text)) {
          if (!slice2)
            slice2 = new Slice(Fragment2.from(parentType.schema.text(" ", parentType.allowedMarks(child.marks))), 0, 0);
          replSteps.push(new ReplaceStep(cur + m.index, cur + m.index + m[0].length, slice2));
        }
      }
    }
    cur = end;
  }
  if (!match.validEnd) {
    let fill = match.fillBefore(Fragment2.empty, true);
    tr.replace(cur, cur, new Slice(fill, 0, 0));
  }
  for (let i2 = replSteps.length - 1; i2 >= 0; i2--)
    tr.step(replSteps[i2]);
}
function canCut(node, start, end) {
  return (start == 0 || node.canReplace(start, node.childCount)) && (end == node.childCount || node.canReplace(0, end));
}
function liftTarget(range) {
  let parent = range.parent;
  let content = parent.content.cutByIndex(range.startIndex, range.endIndex);
  for (let depth = range.depth, contentBefore = 0, contentAfter = 0; ; --depth) {
    let node = range.$from.node(depth);
    let index = range.$from.index(depth) + contentBefore, endIndex = range.$to.indexAfter(depth) - contentAfter;
    if (depth < range.depth && node.canReplace(index, endIndex, content))
      return depth;
    if (depth == 0 || node.type.spec.isolating || !canCut(node, index, endIndex))
      break;
    if (index)
      contentBefore = 1;
    if (endIndex < node.childCount)
      contentAfter = 1;
  }
  return null;
}
function lift(tr, range, target) {
  let { $from, $to, depth } = range;
  let gapStart = $from.before(depth + 1), gapEnd = $to.after(depth + 1);
  let start = gapStart, end = gapEnd;
  let before = Fragment2.empty, openStart = 0;
  for (let d = depth, splitting = false; d > target; d--)
    if (splitting || $from.index(d) > 0) {
      splitting = true;
      before = Fragment2.from($from.node(d).copy(before));
      openStart++;
    } else {
      start--;
    }
  let after = Fragment2.empty, openEnd = 0;
  for (let d = depth, splitting = false; d > target; d--)
    if (splitting || $to.after(d + 1) < $to.end(d)) {
      splitting = true;
      after = Fragment2.from($to.node(d).copy(after));
      openEnd++;
    } else {
      end++;
    }
  tr.step(new ReplaceAroundStep(start, end, gapStart, gapEnd, new Slice(before.append(after), openStart, openEnd), before.size - openStart, true));
}
function wrap(tr, range, wrappers) {
  let content = Fragment2.empty;
  for (let i2 = wrappers.length - 1; i2 >= 0; i2--) {
    if (content.size) {
      let match = wrappers[i2].type.contentMatch.matchFragment(content);
      if (!match || !match.validEnd)
        throw new RangeError("Wrapper type given to Transform.wrap does not form valid content of its parent wrapper");
    }
    content = Fragment2.from(wrappers[i2].type.create(wrappers[i2].attrs, content));
  }
  let start = range.start, end = range.end;
  tr.step(new ReplaceAroundStep(start, end, start, end, new Slice(content, 0, 0), wrappers.length, true));
}
function setBlockType(tr, from2, to, type, attrs) {
  if (!type.isTextblock)
    throw new RangeError("Type given to setBlockType should be a textblock");
  let mapFrom = tr.steps.length;
  tr.doc.nodesBetween(from2, to, (node, pos) => {
    let attrsHere = typeof attrs == "function" ? attrs(node) : attrs;
    if (node.isTextblock && !node.hasMarkup(type, attrsHere) && canChangeType(tr.doc, tr.mapping.slice(mapFrom).map(pos), type)) {
      let convertNewlines = null;
      if (type.schema.linebreakReplacement) {
        let pre = type.whitespace == "pre", supportLinebreak = !!type.contentMatch.matchType(type.schema.linebreakReplacement);
        if (pre && !supportLinebreak)
          convertNewlines = false;
        else if (!pre && supportLinebreak)
          convertNewlines = true;
      }
      if (convertNewlines === false)
        replaceLinebreaks(tr, node, pos, mapFrom);
      clearIncompatible(tr, tr.mapping.slice(mapFrom).map(pos, 1), type, void 0, convertNewlines === null);
      let mapping = tr.mapping.slice(mapFrom);
      let startM = mapping.map(pos, 1), endM = mapping.map(pos + node.nodeSize, 1);
      tr.step(new ReplaceAroundStep(startM, endM, startM + 1, endM - 1, new Slice(Fragment2.from(type.create(attrsHere, null, node.marks)), 0, 0), 1, true));
      if (convertNewlines === true)
        replaceNewlines(tr, node, pos, mapFrom);
      return false;
    }
  });
}
function replaceNewlines(tr, node, pos, mapFrom) {
  node.forEach((child, offset) => {
    if (child.isText) {
      let m, newline = /\r?\n|\r/g;
      while (m = newline.exec(child.text)) {
        let start = tr.mapping.slice(mapFrom).map(pos + 1 + offset + m.index);
        tr.replaceWith(start, start + 1, node.type.schema.linebreakReplacement.create());
      }
    }
  });
}
function replaceLinebreaks(tr, node, pos, mapFrom) {
  node.forEach((child, offset) => {
    if (child.type == child.type.schema.linebreakReplacement) {
      let start = tr.mapping.slice(mapFrom).map(pos + 1 + offset);
      tr.replaceWith(start, start + 1, node.type.schema.text("\n"));
    }
  });
}
function canChangeType(doc3, pos, type) {
  let $pos = doc3.resolve(pos), index = $pos.index();
  return $pos.parent.canReplaceWith(index, index + 1, type);
}
function setNodeMarkup(tr, pos, type, attrs, marks) {
  let node = tr.doc.nodeAt(pos);
  if (!node)
    throw new RangeError("No node at given position");
  if (!type)
    type = node.type;
  let newNode = type.create(attrs, null, marks || node.marks);
  if (node.isLeaf)
    return tr.replaceWith(pos, pos + node.nodeSize, newNode);
  if (!type.validContent(node.content))
    throw new RangeError("Invalid content for node type " + type.name);
  tr.step(new ReplaceAroundStep(pos, pos + node.nodeSize, pos + 1, pos + node.nodeSize - 1, new Slice(Fragment2.from(newNode), 0, 0), 1, true));
}
function canSplit(doc3, pos, depth = 1, typesAfter) {
  let $pos = doc3.resolve(pos), base2 = $pos.depth - depth;
  let innerType = typesAfter && typesAfter[typesAfter.length - 1] || $pos.parent;
  if (base2 < 0 || $pos.parent.type.spec.isolating || !$pos.parent.canReplace($pos.index(), $pos.parent.childCount) || !innerType.type.validContent($pos.parent.content.cutByIndex($pos.index(), $pos.parent.childCount)))
    return false;
  for (let d = $pos.depth - 1, i2 = depth - 2; d > base2; d--, i2--) {
    let node = $pos.node(d), index2 = $pos.index(d);
    if (node.type.spec.isolating)
      return false;
    let rest = node.content.cutByIndex(index2, node.childCount);
    let overrideChild = typesAfter && typesAfter[i2 + 1];
    if (overrideChild)
      rest = rest.replaceChild(0, overrideChild.type.create(overrideChild.attrs));
    let after = typesAfter && typesAfter[i2] || node;
    if (!node.canReplace(index2 + 1, node.childCount) || !after.type.validContent(rest))
      return false;
  }
  let index = $pos.indexAfter(base2);
  let baseType = typesAfter && typesAfter[0];
  return $pos.node(base2).canReplaceWith(index, index, baseType ? baseType.type : $pos.node(base2 + 1).type);
}
function split(tr, pos, depth = 1, typesAfter) {
  let $pos = tr.doc.resolve(pos), before = Fragment2.empty, after = Fragment2.empty;
  for (let d = $pos.depth, e = $pos.depth - depth, i2 = depth - 1; d > e; d--, i2--) {
    before = Fragment2.from($pos.node(d).copy(before));
    let typeAfter = typesAfter && typesAfter[i2];
    after = Fragment2.from(typeAfter ? typeAfter.type.create(typeAfter.attrs, after) : $pos.node(d).copy(after));
  }
  tr.step(new ReplaceStep(pos, pos, new Slice(before.append(after), depth, depth), true));
}
function canJoin(doc3, pos) {
  let $pos = doc3.resolve(pos), index = $pos.index();
  return joinable2($pos.nodeBefore, $pos.nodeAfter) && $pos.parent.canReplace(index, index + 1);
}
function canAppendWithSubstitutedLinebreaks(a, b) {
  if (!b.content.size)
    a.type.compatibleContent(b.type);
  let match = a.contentMatchAt(a.childCount);
  let { linebreakReplacement } = a.type.schema;
  for (let i2 = 0; i2 < b.childCount; i2++) {
    let child = b.child(i2);
    let type = child.type == linebreakReplacement ? a.type.schema.nodes.text : child.type;
    match = match.matchType(type);
    if (!match)
      return false;
    if (!a.type.allowsMarks(child.marks))
      return false;
  }
  return match.validEnd;
}
function joinable2(a, b) {
  return !!(a && b && !a.isLeaf && canAppendWithSubstitutedLinebreaks(a, b));
}
function join(tr, pos, depth) {
  let convertNewlines = null;
  let { linebreakReplacement } = tr.doc.type.schema;
  let $before = tr.doc.resolve(pos - depth), beforeType = $before.node().type;
  if (linebreakReplacement && beforeType.inlineContent) {
    let pre = beforeType.whitespace == "pre";
    let supportLinebreak = !!beforeType.contentMatch.matchType(linebreakReplacement);
    if (pre && !supportLinebreak)
      convertNewlines = false;
    else if (!pre && supportLinebreak)
      convertNewlines = true;
  }
  let mapFrom = tr.steps.length;
  if (convertNewlines === false) {
    let $after = tr.doc.resolve(pos + depth);
    replaceLinebreaks(tr, $after.node(), $after.before(), mapFrom);
  }
  if (beforeType.inlineContent)
    clearIncompatible(tr, pos + depth - 1, beforeType, $before.node().contentMatchAt($before.index()), convertNewlines == null);
  let mapping = tr.mapping.slice(mapFrom), start = mapping.map(pos - depth);
  tr.step(new ReplaceStep(start, mapping.map(pos + depth, -1), Slice.empty, true));
  if (convertNewlines === true) {
    let $full = tr.doc.resolve(start);
    replaceNewlines(tr, $full.node(), $full.before(), tr.steps.length);
  }
  return tr;
}
function insertPoint(doc3, pos, nodeType) {
  let $pos = doc3.resolve(pos);
  if ($pos.parent.canReplaceWith($pos.index(), $pos.index(), nodeType))
    return pos;
  if ($pos.parentOffset == 0)
    for (let d = $pos.depth - 1; d >= 0; d--) {
      let index = $pos.index(d);
      if ($pos.node(d).canReplaceWith(index, index, nodeType))
        return $pos.before(d + 1);
      if (index > 0)
        return null;
    }
  if ($pos.parentOffset == $pos.parent.content.size)
    for (let d = $pos.depth - 1; d >= 0; d--) {
      let index = $pos.indexAfter(d);
      if ($pos.node(d).canReplaceWith(index, index, nodeType))
        return $pos.after(d + 1);
      if (index < $pos.node(d).childCount)
        return null;
    }
  return null;
}
function dropPoint(doc3, pos, slice2) {
  let $pos = doc3.resolve(pos);
  if (!slice2.content.size)
    return pos;
  let content = slice2.content;
  for (let i2 = 0; i2 < slice2.openStart; i2++)
    content = content.firstChild.content;
  for (let pass = 1; pass <= (slice2.openStart == 0 && slice2.size ? 2 : 1); pass++) {
    for (let d = $pos.depth; d >= 0; d--) {
      let bias = d == $pos.depth ? 0 : $pos.pos <= ($pos.start(d + 1) + $pos.end(d + 1)) / 2 ? -1 : 1;
      let insertPos = $pos.index(d) + (bias > 0 ? 1 : 0);
      let parent = $pos.node(d), fits = false;
      if (pass == 1) {
        fits = parent.canReplace(insertPos, insertPos, content);
      } else {
        let wrapping = parent.contentMatchAt(insertPos).findWrapping(content.firstChild.type);
        fits = wrapping && parent.canReplaceWith(insertPos, insertPos, wrapping[0]);
      }
      if (fits)
        return bias == 0 ? $pos.pos : bias < 0 ? $pos.before(d + 1) : $pos.after(d + 1);
    }
  }
  return null;
}
function replaceStep(doc3, from2, to = from2, slice2 = Slice.empty) {
  if (from2 == to && !slice2.size)
    return null;
  let $from = doc3.resolve(from2), $to = doc3.resolve(to);
  if (fitsTrivially($from, $to, slice2))
    return new ReplaceStep(from2, to, slice2);
  return new Fitter($from, $to, slice2).fit();
}
function fitsTrivially($from, $to, slice2) {
  return !slice2.openStart && !slice2.openEnd && $from.start() == $to.start() && $from.parent.canReplace($from.index(), $to.index(), slice2.content);
}
var Fitter = class {
  constructor($from, $to, unplaced) {
    this.$from = $from;
    this.$to = $to;
    this.unplaced = unplaced;
    this.frontier = [];
    this.placed = Fragment2.empty;
    for (let i2 = 0; i2 <= $from.depth; i2++) {
      let node = $from.node(i2);
      this.frontier.push({
        type: node.type,
        match: node.contentMatchAt($from.indexAfter(i2))
      });
    }
    for (let i2 = $from.depth; i2 > 0; i2--)
      this.placed = Fragment2.from($from.node(i2).copy(this.placed));
  }
  get depth() {
    return this.frontier.length - 1;
  }
  fit() {
    while (this.unplaced.size) {
      let fit = this.findFittable();
      if (fit)
        this.placeNodes(fit);
      else
        this.openMore() || this.dropNode();
    }
    let moveInline = this.mustMoveInline(), placedSize = this.placed.size - this.depth - this.$from.depth;
    let $from = this.$from, $to = this.close(moveInline < 0 ? this.$to : $from.doc.resolve(moveInline));
    if (!$to)
      return null;
    let content = this.placed, openStart = $from.depth, openEnd = $to.depth;
    while (openStart && openEnd && content.childCount == 1) {
      content = content.firstChild.content;
      openStart--;
      openEnd--;
    }
    let slice2 = new Slice(content, openStart, openEnd);
    if (moveInline > -1)
      return new ReplaceAroundStep($from.pos, moveInline, this.$to.pos, this.$to.end(), slice2, placedSize);
    if (slice2.size || $from.pos != this.$to.pos)
      return new ReplaceStep($from.pos, $to.pos, slice2);
    return null;
  }
  // Find a position on the start spine of `this.unplaced` that has
  // content that can be moved somewhere on the frontier. Returns two
  // depths, one for the slice and one for the frontier.
  findFittable() {
    let startDepth = this.unplaced.openStart;
    for (let cur = this.unplaced.content, d = 0, openEnd = this.unplaced.openEnd; d < startDepth; d++) {
      let node = cur.firstChild;
      if (cur.childCount > 1)
        openEnd = 0;
      if (node.type.spec.isolating && openEnd <= d) {
        startDepth = d;
        break;
      }
      cur = node.content;
    }
    for (let pass = 1; pass <= 2; pass++) {
      for (let sliceDepth = pass == 1 ? startDepth : this.unplaced.openStart; sliceDepth >= 0; sliceDepth--) {
        let fragment, parent = null;
        if (sliceDepth) {
          parent = contentAt(this.unplaced.content, sliceDepth - 1).firstChild;
          fragment = parent.content;
        } else {
          fragment = this.unplaced.content;
        }
        let first = fragment.firstChild;
        for (let frontierDepth = this.depth; frontierDepth >= 0; frontierDepth--) {
          let { type, match } = this.frontier[frontierDepth], wrap2, inject2 = null;
          if (pass == 1 && (first ? match.matchType(first.type) || (inject2 = match.fillBefore(Fragment2.from(first), false)) : parent && type.compatibleContent(parent.type)))
            return { sliceDepth, frontierDepth, parent, inject: inject2 };
          else if (pass == 2 && first && (wrap2 = match.findWrapping(first.type)))
            return { sliceDepth, frontierDepth, parent, wrap: wrap2 };
          if (parent && match.matchType(parent.type))
            break;
        }
      }
    }
  }
  openMore() {
    let { content, openStart, openEnd } = this.unplaced;
    if (maxOpen(content, -1) <= openStart)
      return false;
    if (this.unplaced.size > 1 && maxOpen(content, 1) > openEnd)
      openEnd++;
    this.unplaced = new Slice(content, openStart + 1, openEnd);
    return true;
  }
  dropNode() {
    let { content, openStart, openEnd } = this.unplaced;
    let inner = contentAt(content, openStart);
    if (inner.childCount <= 1 && openStart > 0) {
      let openAtEnd = content.size - openStart <= openStart + inner.size;
      this.unplaced = new Slice(dropFromFragment(content, openStart - 1, 1), openStart - 1, openAtEnd ? openStart - 1 : openEnd);
    } else {
      this.unplaced = new Slice(dropFromFragment(content, openStart, 1), openStart, openEnd);
    }
  }
  // Move content from the unplaced slice at `sliceDepth` to the
  // frontier node at `frontierDepth`. Close that frontier node when
  // applicable.
  placeNodes({ sliceDepth, frontierDepth, parent, inject: inject2, wrap: wrap2 }) {
    while (this.depth > frontierDepth)
      this.closeFrontierNode();
    if (wrap2)
      for (let i2 = 0; i2 < wrap2.length; i2++)
        this.openFrontierNode(wrap2[i2]);
    let slice2 = this.unplaced, fragment = parent ? parent.content : slice2.content;
    let openStart = slice2.openStart - sliceDepth;
    let taken = 0, add = [];
    let { match, type } = this.frontier[frontierDepth];
    if (inject2) {
      for (let i2 = 0; i2 < inject2.childCount; i2++)
        add.push(inject2.child(i2));
      match = match.matchFragment(inject2);
    }
    let openEndCount = fragment.size + sliceDepth - (slice2.content.size - slice2.openEnd);
    while (taken < fragment.childCount) {
      let next = fragment.child(taken), matches2 = match.matchType(next.type);
      if (!matches2)
        break;
      taken++;
      if (taken > 1 || openStart == 0 || next.content.size) {
        match = matches2;
        add.push(closeNodeStart(next.mark(type.allowedMarks(next.marks)), taken == 1 ? openStart : 0, taken == fragment.childCount ? openEndCount : -1));
      }
    }
    let toEnd = taken == fragment.childCount;
    if (!toEnd)
      openEndCount = -1;
    this.placed = addToFragment(this.placed, frontierDepth, Fragment2.from(add));
    this.frontier[frontierDepth].match = match;
    if (toEnd && openEndCount < 0 && parent && parent.type == this.frontier[this.depth].type && this.frontier.length > 1)
      this.closeFrontierNode();
    for (let i2 = 0, cur = fragment; i2 < openEndCount; i2++) {
      let node = cur.lastChild;
      this.frontier.push({ type: node.type, match: node.contentMatchAt(node.childCount) });
      cur = node.content;
    }
    this.unplaced = !toEnd ? new Slice(dropFromFragment(slice2.content, sliceDepth, taken), slice2.openStart, slice2.openEnd) : sliceDepth == 0 ? Slice.empty : new Slice(dropFromFragment(slice2.content, sliceDepth - 1, 1), sliceDepth - 1, openEndCount < 0 ? slice2.openEnd : sliceDepth - 1);
  }
  mustMoveInline() {
    if (!this.$to.parent.isTextblock)
      return -1;
    let top = this.frontier[this.depth], level;
    if (!top.type.isTextblock || !contentAfterFits(this.$to, this.$to.depth, top.type, top.match, false) || this.$to.depth == this.depth && (level = this.findCloseLevel(this.$to)) && level.depth == this.depth)
      return -1;
    let { depth } = this.$to, after = this.$to.after(depth);
    while (depth > 1 && after == this.$to.end(--depth))
      ++after;
    return after;
  }
  findCloseLevel($to) {
    scan: for (let i2 = Math.min(this.depth, $to.depth); i2 >= 0; i2--) {
      let { match, type } = this.frontier[i2];
      let dropInner = i2 < $to.depth && $to.end(i2 + 1) == $to.pos + ($to.depth - (i2 + 1));
      let fit = contentAfterFits($to, i2, type, match, dropInner);
      if (!fit)
        continue;
      for (let d = i2 - 1; d >= 0; d--) {
        let { match: match2, type: type2 } = this.frontier[d];
        let matches2 = contentAfterFits($to, d, type2, match2, true);
        if (!matches2 || matches2.childCount)
          continue scan;
      }
      return { depth: i2, fit, move: dropInner ? $to.doc.resolve($to.after(i2 + 1)) : $to };
    }
  }
  close($to) {
    let close2 = this.findCloseLevel($to);
    if (!close2)
      return null;
    while (this.depth > close2.depth)
      this.closeFrontierNode();
    if (close2.fit.childCount)
      this.placed = addToFragment(this.placed, close2.depth, close2.fit);
    $to = close2.move;
    for (let d = close2.depth + 1; d <= $to.depth; d++) {
      let node = $to.node(d), add = node.type.contentMatch.fillBefore(node.content, true, $to.index(d));
      this.openFrontierNode(node.type, node.attrs, add);
    }
    return $to;
  }
  openFrontierNode(type, attrs = null, content) {
    let top = this.frontier[this.depth];
    top.match = top.match.matchType(type);
    this.placed = addToFragment(this.placed, this.depth, Fragment2.from(type.create(attrs, content)));
    this.frontier.push({ type, match: type.contentMatch });
  }
  closeFrontierNode() {
    let open = this.frontier.pop();
    let add = open.match.fillBefore(Fragment2.empty, true);
    if (add.childCount)
      this.placed = addToFragment(this.placed, this.frontier.length, add);
  }
};
function dropFromFragment(fragment, depth, count) {
  if (depth == 0)
    return fragment.cutByIndex(count, fragment.childCount);
  return fragment.replaceChild(0, fragment.firstChild.copy(dropFromFragment(fragment.firstChild.content, depth - 1, count)));
}
function addToFragment(fragment, depth, content) {
  if (depth == 0)
    return fragment.append(content);
  return fragment.replaceChild(fragment.childCount - 1, fragment.lastChild.copy(addToFragment(fragment.lastChild.content, depth - 1, content)));
}
function contentAt(fragment, depth) {
  for (let i2 = 0; i2 < depth; i2++)
    fragment = fragment.firstChild.content;
  return fragment;
}
function closeNodeStart(node, openStart, openEnd) {
  if (openStart <= 0)
    return node;
  let frag = node.content;
  if (openStart > 1)
    frag = frag.replaceChild(0, closeNodeStart(frag.firstChild, openStart - 1, frag.childCount == 1 ? openEnd - 1 : 0));
  if (openStart > 0) {
    frag = node.type.contentMatch.fillBefore(frag).append(frag);
    if (openEnd <= 0)
      frag = frag.append(node.type.contentMatch.matchFragment(frag).fillBefore(Fragment2.empty, true));
  }
  return node.copy(frag);
}
function contentAfterFits($to, depth, type, match, open) {
  let node = $to.node(depth), index = open ? $to.indexAfter(depth) : $to.index(depth);
  if (index == node.childCount && !type.compatibleContent(node.type))
    return null;
  let fit = match.fillBefore(node.content, true, index);
  return fit && !invalidMarks(type, node.content, index) ? fit : null;
}
function invalidMarks(type, fragment, start) {
  for (let i2 = start; i2 < fragment.childCount; i2++)
    if (!type.allowsMarks(fragment.child(i2).marks))
      return true;
  return false;
}
function definesContent(type) {
  return type.spec.defining || type.spec.definingForContent;
}
function maxOpen(frag, side) {
  for (let count = 0; ; count++) {
    let ch = side < 0 ? frag.firstChild : frag.lastChild;
    if (!ch || ch.isAtom)
      return count;
    frag = ch.content;
  }
}
function replaceRange(tr, from2, to, slice2) {
  if (!slice2.size)
    return tr.deleteRange(from2, to);
  let $from = tr.doc.resolve(from2), $to = tr.doc.resolve(to);
  if (fitsTrivially($from, $to, slice2))
    return tr.step(new ReplaceStep(from2, to, slice2));
  let targetDepths = coveredDepths($from, $to);
  if (targetDepths[targetDepths.length - 1] == 0)
    targetDepths.pop();
  let preferredTarget = -($from.depth + 1);
  targetDepths.unshift(preferredTarget);
  for (let d = $from.depth, pos = $from.pos - 1; d > 0; d--, pos--) {
    let spec = $from.node(d).type.spec;
    if (spec.defining || spec.definingAsContext || spec.isolating)
      break;
    if (targetDepths.indexOf(d) > -1)
      preferredTarget = d;
    else if ($from.before(d) == pos)
      targetDepths.splice(1, 0, -d);
  }
  let preferredTargetIndex = targetDepths.indexOf(preferredTarget);
  let leftNodes = [], preferredDepth = slice2.openStart;
  for (let content = slice2.content, i2 = 0; ; i2++) {
    let node = content.firstChild;
    leftNodes.push(node);
    if (i2 == slice2.openStart)
      break;
    content = node.content;
  }
  for (let d = preferredDepth - 1; d >= 0; d--) {
    let leftNode = leftNodes[d], def = definesContent(leftNode.type);
    if (def && !leftNode.sameMarkup($from.node(Math.abs(preferredTarget) - 1)))
      preferredDepth = d;
    else if (def || !leftNode.type.isTextblock)
      break;
  }
  for (let j = slice2.openStart; j >= 0; j--) {
    let openDepth = (j + preferredDepth + 1) % (slice2.openStart + 1);
    let insert = leftNodes[openDepth];
    if (!insert)
      continue;
    for (let i2 = 0; i2 < targetDepths.length; i2++) {
      let targetDepth = targetDepths[(i2 + preferredTargetIndex) % targetDepths.length], expand = true;
      if (targetDepth < 0) {
        expand = false;
        targetDepth = -targetDepth;
      }
      let parent = $from.node(targetDepth - 1), index = $from.index(targetDepth - 1);
      if (parent.canReplaceWith(index, index, insert.type, insert.marks))
        return tr.replace($from.before(targetDepth), expand ? $to.after(targetDepth) : to, new Slice(closeFragment(slice2.content, 0, slice2.openStart, openDepth), openDepth, slice2.openEnd));
    }
  }
  let startSteps = tr.steps.length;
  for (let i2 = targetDepths.length - 1; i2 >= 0; i2--) {
    tr.replace(from2, to, slice2);
    if (tr.steps.length > startSteps)
      break;
    let depth = targetDepths[i2];
    if (depth < 0)
      continue;
    from2 = $from.before(depth);
    to = $to.after(depth);
  }
}
function closeFragment(fragment, depth, oldOpen, newOpen, parent) {
  if (depth < oldOpen) {
    let first = fragment.firstChild;
    fragment = fragment.replaceChild(0, first.copy(closeFragment(first.content, depth + 1, oldOpen, newOpen, first)));
  }
  if (depth > newOpen) {
    let match = parent.contentMatchAt(0);
    let start = match.fillBefore(fragment).append(fragment);
    fragment = start.append(match.matchFragment(start).fillBefore(Fragment2.empty, true));
  }
  return fragment;
}
function replaceRangeWith(tr, from2, to, node) {
  if (!node.isInline && from2 == to && tr.doc.resolve(from2).parent.content.size) {
    let point = insertPoint(tr.doc, from2, node.type);
    if (point != null)
      from2 = to = point;
  }
  tr.replaceRange(from2, to, new Slice(Fragment2.from(node), 0, 0));
}
function deleteRange(tr, from2, to) {
  let $from = tr.doc.resolve(from2), $to = tr.doc.resolve(to);
  if ($from.parent.isTextblock && $to.parent.isTextblock && $from.start() != $to.start() && $from.parentOffset == 0 && $to.parentOffset == 0) {
    let shared = $from.sharedDepth(to), isolated = false;
    for (let d = $from.depth; d > shared; d--)
      if ($from.node(d).type.spec.isolating)
        isolated = true;
    for (let d = $to.depth; d > shared; d--)
      if ($to.node(d).type.spec.isolating)
        isolated = true;
    if (!isolated) {
      for (let d = $from.depth; d > 0 && from2 == $from.start(d); d--)
        from2 = $from.before(d);
      for (let d = $to.depth; d > 0 && to == $to.start(d); d--)
        to = $to.before(d);
      $from = tr.doc.resolve(from2);
      $to = tr.doc.resolve(to);
    }
  }
  let covered = coveredDepths($from, $to);
  for (let i2 = 0; i2 < covered.length; i2++) {
    let depth = covered[i2], last = i2 == covered.length - 1;
    if (last && depth == 0 || $from.node(depth).type.contentMatch.validEnd)
      return tr.delete($from.start(depth), $to.end(depth));
    if (depth > 0 && (last || $from.node(depth - 1).canReplace($from.index(depth - 1), $to.indexAfter(depth - 1))))
      return tr.delete($from.before(depth), $to.after(depth));
  }
  for (let d = 1; d <= $from.depth && d <= $to.depth; d++) {
    if (from2 - $from.start(d) == $from.depth - d && to > $from.end(d) && $to.end(d) - to != $to.depth - d && $from.start(d - 1) == $to.start(d - 1) && $from.node(d - 1).canReplace($from.index(d - 1), $to.index(d - 1)))
      return tr.delete($from.before(d), to);
  }
  tr.delete(from2, to);
}
function coveredDepths($from, $to) {
  let result = [], minDepth = Math.min($from.depth, $to.depth);
  for (let d = minDepth; d >= 0; d--) {
    let start = $from.start(d);
    if (start < $from.pos - ($from.depth - d) || $to.end(d) > $to.pos + ($to.depth - d) || $from.node(d).type.spec.isolating || $to.node(d).type.spec.isolating)
      break;
    if (start == $to.start(d) || d == $from.depth && d == $to.depth && $from.parent.inlineContent && $to.parent.inlineContent && d && $to.start(d - 1) == start - 1)
      result.push(d);
  }
  return result;
}
var AttrStep = class _AttrStep extends Step {
  /**
  Construct an attribute step.
  */
  constructor(pos, attr, value) {
    super();
    this.pos = pos;
    this.attr = attr;
    this.value = value;
  }
  apply(doc3) {
    let node = doc3.nodeAt(this.pos);
    if (!node)
      return StepResult.fail("No node at attribute step's position");
    let attrs = /* @__PURE__ */ Object.create(null);
    for (let name2 in node.attrs)
      attrs[name2] = node.attrs[name2];
    attrs[this.attr] = this.value;
    let updated = node.type.create(attrs, null, node.marks);
    return StepResult.fromReplace(doc3, this.pos, this.pos + 1, new Slice(Fragment2.from(updated), 0, node.isLeaf ? 0 : 1));
  }
  getMap() {
    return StepMap.empty;
  }
  invert(doc3) {
    return new _AttrStep(this.pos, this.attr, doc3.nodeAt(this.pos).attrs[this.attr]);
  }
  map(mapping) {
    let pos = mapping.mapResult(this.pos, 1);
    return pos.deletedAfter ? null : new _AttrStep(pos.pos, this.attr, this.value);
  }
  toJSON() {
    return { stepType: "attr", pos: this.pos, attr: this.attr, value: this.value };
  }
  static fromJSON(schema2, json) {
    if (typeof json.pos != "number" || typeof json.attr != "string")
      throw new RangeError("Invalid input for AttrStep.fromJSON");
    return new _AttrStep(json.pos, json.attr, json.value);
  }
};
Step.jsonID("attr", AttrStep);
var DocAttrStep = class _DocAttrStep extends Step {
  /**
  Construct an attribute step.
  */
  constructor(attr, value) {
    super();
    this.attr = attr;
    this.value = value;
  }
  apply(doc3) {
    let attrs = /* @__PURE__ */ Object.create(null);
    for (let name2 in doc3.attrs)
      attrs[name2] = doc3.attrs[name2];
    attrs[this.attr] = this.value;
    let updated = doc3.type.create(attrs, doc3.content, doc3.marks);
    return StepResult.ok(updated);
  }
  getMap() {
    return StepMap.empty;
  }
  invert(doc3) {
    return new _DocAttrStep(this.attr, doc3.attrs[this.attr]);
  }
  map(mapping) {
    return this;
  }
  toJSON() {
    return { stepType: "docAttr", attr: this.attr, value: this.value };
  }
  static fromJSON(schema2, json) {
    if (typeof json.attr != "string")
      throw new RangeError("Invalid input for DocAttrStep.fromJSON");
    return new _DocAttrStep(json.attr, json.value);
  }
};
Step.jsonID("docAttr", DocAttrStep);
var TransformError = class extends Error {
};
TransformError = function TransformError2(message) {
  let err = Error.call(this, message);
  err.__proto__ = TransformError2.prototype;
  return err;
};
TransformError.prototype = Object.create(Error.prototype);
TransformError.prototype.constructor = TransformError;
TransformError.prototype.name = "TransformError";
var Transform = class {
  /**
  Create a transform that starts with the given document.
  */
  constructor(doc3) {
    this.doc = doc3;
    this.steps = [];
    this.docs = [];
    this.mapping = new Mapping();
  }
  /**
  The starting document.
  */
  get before() {
    return this.docs.length ? this.docs[0] : this.doc;
  }
  /**
  Apply a new step in this transform, saving the result. Throws an
  error when the step fails.
  */
  step(step) {
    let result = this.maybeStep(step);
    if (result.failed)
      throw new TransformError(result.failed);
    return this;
  }
  /**
  Try to apply a step in this transformation, ignoring it if it
  fails. Returns the step result.
  */
  maybeStep(step) {
    let result = step.apply(this.doc);
    if (!result.failed)
      this.addStep(step, result.doc);
    return result;
  }
  /**
  True when the document has been changed (when there are any
  steps).
  */
  get docChanged() {
    return this.steps.length > 0;
  }
  /**
  Return a single range, in post-transform document positions,
  that covers all content changed by this transform. Returns null
  if no replacements are made. Note that this will ignore changes
  that add/remove marks without replacing the underlying content.
  */
  changedRange() {
    let from2 = 1e9, to = -1e9;
    for (let i2 = 0; i2 < this.mapping.maps.length; i2++) {
      let map2 = this.mapping.maps[i2];
      if (i2) {
        from2 = map2.map(from2, 1);
        to = map2.map(to, -1);
      }
      map2.forEach((_f, _t, fromB, toB) => {
        from2 = Math.min(from2, fromB);
        to = Math.max(to, toB);
      });
    }
    return from2 == 1e9 ? null : { from: from2, to };
  }
  /**
  @internal
  */
  addStep(step, doc3) {
    this.docs.push(this.doc);
    this.steps.push(step);
    this.mapping.appendMap(step.getMap());
    this.doc = doc3;
  }
  /**
  Replace the part of the document between `from` and `to` with the
  given `slice`.
  */
  replace(from2, to = from2, slice2 = Slice.empty) {
    let step = replaceStep(this.doc, from2, to, slice2);
    if (step)
      this.step(step);
    return this;
  }
  /**
  Replace the given range with the given content, which may be a
  fragment, node, or array of nodes.
  */
  replaceWith(from2, to, content) {
    return this.replace(from2, to, new Slice(Fragment2.from(content), 0, 0));
  }
  /**
  Delete the content between the given positions.
  */
  delete(from2, to) {
    return this.replace(from2, to, Slice.empty);
  }
  /**
  Insert the given content at the given position.
  */
  insert(pos, content) {
    return this.replaceWith(pos, pos, content);
  }
  /**
  Replace a range of the document with a given slice, using
  `from`, `to`, and the slice's
  [`openStart`](https://prosemirror.net/docs/ref/#model.Slice.openStart) property as hints, rather
  than fixed start and end points. This method may grow the
  replaced area or close open nodes in the slice in order to get a
  fit that is more in line with WYSIWYG expectations, by dropping
  fully covered parent nodes of the replaced region when they are
  marked [non-defining as
  context](https://prosemirror.net/docs/ref/#model.NodeSpec.definingAsContext), or including an
  open parent node from the slice that _is_ marked as [defining
  its content](https://prosemirror.net/docs/ref/#model.NodeSpec.definingForContent).

  This is the method, for example, to handle paste. The similar
  [`replace`](https://prosemirror.net/docs/ref/#transform.Transform.replace) method is a more
  primitive tool which will _not_ move the start and end of its given
  range, and is useful in situations where you need more precise
  control over what happens.
  */
  replaceRange(from2, to, slice2) {
    replaceRange(this, from2, to, slice2);
    return this;
  }
  /**
  Replace the given range with a node, but use `from` and `to` as
  hints, rather than precise positions. When from and to are the same
  and are at the start or end of a parent node in which the given
  node doesn't fit, this method may _move_ them out towards a parent
  that does allow the given node to be placed. When the given range
  completely covers a parent node, this method may completely replace
  that parent node.
  */
  replaceRangeWith(from2, to, node) {
    replaceRangeWith(this, from2, to, node);
    return this;
  }
  /**
  Delete the given range, expanding it to cover fully covered
  parent nodes until a valid replace is found.
  */
  deleteRange(from2, to) {
    deleteRange(this, from2, to);
    return this;
  }
  /**
  Split the content in the given range off from its parent, if there
  is sibling content before or after it, and move it up the tree to
  the depth specified by `target`. You'll probably want to use
  [`liftTarget`](https://prosemirror.net/docs/ref/#transform.liftTarget) to compute `target`, to make
  sure the lift is valid.
  */
  lift(range, target) {
    lift(this, range, target);
    return this;
  }
  /**
  Join the blocks around the given position. If depth is 2, their
  last and first siblings are also joined, and so on.
  */
  join(pos, depth = 1) {
    join(this, pos, depth);
    return this;
  }
  /**
  Wrap the given [range](https://prosemirror.net/docs/ref/#model.NodeRange) in the given set of wrappers.
  The wrappers are assumed to be valid in this position, and should
  probably be computed with [`findWrapping`](https://prosemirror.net/docs/ref/#transform.findWrapping).
  */
  wrap(range, wrappers) {
    wrap(this, range, wrappers);
    return this;
  }
  /**
  Set the type of all textblocks (partly) between `from` and `to` to
  the given node type with the given attributes.
  */
  setBlockType(from2, to = from2, type, attrs = null) {
    setBlockType(this, from2, to, type, attrs);
    return this;
  }
  /**
  Change the type, attributes, and/or marks of the node at `pos`.
  When `type` isn't given, the existing node type is preserved,
  */
  setNodeMarkup(pos, type, attrs = null, marks) {
    setNodeMarkup(this, pos, type, attrs, marks);
    return this;
  }
  /**
  Set a single attribute on a given node to a new value.
  The `pos` addresses the document content. Use `setDocAttribute`
  to set attributes on the document itself.
  */
  setNodeAttribute(pos, attr, value) {
    this.step(new AttrStep(pos, attr, value));
    return this;
  }
  /**
  Set a single attribute on the document to a new value.
  */
  setDocAttribute(attr, value) {
    this.step(new DocAttrStep(attr, value));
    return this;
  }
  /**
  Add a mark to the node at position `pos`.
  */
  addNodeMark(pos, mark) {
    this.step(new AddNodeMarkStep(pos, mark));
    return this;
  }
  /**
  Remove a mark (or all marks of the given type) from the node at
  position `pos`.
  */
  removeNodeMark(pos, mark) {
    let node = this.doc.nodeAt(pos);
    if (!node)
      throw new RangeError("No node at position " + pos);
    if (mark instanceof Mark) {
      if (mark.isInSet(node.marks))
        this.step(new RemoveNodeMarkStep(pos, mark));
    } else {
      let set = node.marks, found2, steps = [];
      while (found2 = mark.isInSet(set)) {
        steps.push(new RemoveNodeMarkStep(pos, found2));
        set = found2.removeFromSet(set);
      }
      for (let i2 = steps.length - 1; i2 >= 0; i2--)
        this.step(steps[i2]);
    }
    return this;
  }
  /**
  Split the node at the given position, and optionally, if `depth` is
  greater than one, any number of nodes above that. By default, the
  parts split off will inherit the node type of the original node.
  This can be changed by passing an array of types and attributes to
  use after the split (with the outermost nodes coming first).
  */
  split(pos, depth = 1, typesAfter) {
    split(this, pos, depth, typesAfter);
    return this;
  }
  /**
  Add the given mark to the inline content between `from` and `to`.
  */
  addMark(from2, to, mark) {
    addMark(this, from2, to, mark);
    return this;
  }
  /**
  Remove marks from inline nodes between `from` and `to`. When
  `mark` is a single mark, remove precisely that mark. When it is
  a mark type, remove all marks of that type. When it is null,
  remove all marks of any type.
  */
  removeMark(from2, to, mark) {
    removeMark(this, from2, to, mark);
    return this;
  }
  /**
  Removes all marks and nodes from the content of the node at
  `pos` that don't match the given new parent node type. Accepts
  an optional starting [content match](https://prosemirror.net/docs/ref/#model.ContentMatch) as
  third argument.
  */
  clearIncompatible(pos, parentType, match) {
    clearIncompatible(this, pos, parentType, match);
    return this;
  }
};

// node_modules/prosemirror-state/dist/index.js
var classesById = /* @__PURE__ */ Object.create(null);
var Selection = class {
  /**
  Initialize a selection with the head and anchor and ranges. If no
  ranges are given, constructs a single range across `$anchor` and
  `$head`.
  */
  constructor($anchor, $head, ranges) {
    this.$anchor = $anchor;
    this.$head = $head;
    this.ranges = ranges || [new SelectionRange($anchor.min($head), $anchor.max($head))];
  }
  /**
  The selection's anchor, as an unresolved position.
  */
  get anchor() {
    return this.$anchor.pos;
  }
  /**
  The selection's head.
  */
  get head() {
    return this.$head.pos;
  }
  /**
  The lower bound of the selection's main range.
  */
  get from() {
    return this.$from.pos;
  }
  /**
  The upper bound of the selection's main range.
  */
  get to() {
    return this.$to.pos;
  }
  /**
  The resolved lower  bound of the selection's main range.
  */
  get $from() {
    return this.ranges[0].$from;
  }
  /**
  The resolved upper bound of the selection's main range.
  */
  get $to() {
    return this.ranges[0].$to;
  }
  /**
  Indicates whether the selection contains any content.
  */
  get empty() {
    let ranges = this.ranges;
    for (let i2 = 0; i2 < ranges.length; i2++)
      if (ranges[i2].$from.pos != ranges[i2].$to.pos)
        return false;
    return true;
  }
  /**
  Get the content of this selection as a slice.
  */
  content() {
    return this.$from.doc.slice(this.from, this.to, true);
  }
  /**
  Replace the selection with a slice or, if no slice is given,
  delete the selection. Will append to the given transaction.
  */
  replace(tr, content = Slice.empty) {
    let lastNode = content.content.lastChild, lastParent = null;
    for (let i2 = 0; i2 < content.openEnd; i2++) {
      lastParent = lastNode;
      lastNode = lastNode.lastChild;
    }
    let mapFrom = tr.steps.length, ranges = this.ranges;
    for (let i2 = 0; i2 < ranges.length; i2++) {
      let { $from, $to } = ranges[i2], mapping = tr.mapping.slice(mapFrom);
      tr.replaceRange(mapping.map($from.pos), mapping.map($to.pos), i2 ? Slice.empty : content);
      if (i2 == 0)
        selectionToInsertionEnd(tr, mapFrom, (lastNode ? lastNode.isInline : lastParent && lastParent.isTextblock) ? -1 : 1);
    }
  }
  /**
  Replace the selection with the given node, appending the changes
  to the given transaction.
  */
  replaceWith(tr, node) {
    let mapFrom = tr.steps.length, ranges = this.ranges;
    for (let i2 = 0; i2 < ranges.length; i2++) {
      let { $from, $to } = ranges[i2], mapping = tr.mapping.slice(mapFrom);
      let from2 = mapping.map($from.pos), to = mapping.map($to.pos);
      if (i2) {
        tr.deleteRange(from2, to);
      } else {
        tr.replaceRangeWith(from2, to, node);
        selectionToInsertionEnd(tr, mapFrom, node.isInline ? -1 : 1);
      }
    }
  }
  /**
  Find a valid cursor or leaf node selection starting at the given
  position and searching back if `dir` is negative, and forward if
  positive. When `textOnly` is true, only consider cursor
  selections. Will return null when no valid selection position is
  found.
  */
  static findFrom($pos, dir, textOnly = false) {
    let inner = $pos.parent.inlineContent ? new TextSelection($pos) : findSelectionIn($pos.node(0), $pos.parent, $pos.pos, $pos.index(), dir, textOnly);
    if (inner)
      return inner;
    for (let depth = $pos.depth - 1; depth >= 0; depth--) {
      let found2 = dir < 0 ? findSelectionIn($pos.node(0), $pos.node(depth), $pos.before(depth + 1), $pos.index(depth), dir, textOnly) : findSelectionIn($pos.node(0), $pos.node(depth), $pos.after(depth + 1), $pos.index(depth) + 1, dir, textOnly);
      if (found2)
        return found2;
    }
    return null;
  }
  /**
  Find a valid cursor or leaf node selection near the given
  position. Searches forward first by default, but if `bias` is
  negative, it will search backwards first.
  */
  static near($pos, bias = 1) {
    return this.findFrom($pos, bias) || this.findFrom($pos, -bias) || new AllSelection($pos.node(0));
  }
  /**
  Find the cursor or leaf node selection closest to the start of
  the given document. Will return an
  [`AllSelection`](https://prosemirror.net/docs/ref/#state.AllSelection) if no valid position
  exists.
  */
  static atStart(doc3) {
    return findSelectionIn(doc3, doc3, 0, 0, 1) || new AllSelection(doc3);
  }
  /**
  Find the cursor or leaf node selection closest to the end of the
  given document.
  */
  static atEnd(doc3) {
    return findSelectionIn(doc3, doc3, doc3.content.size, doc3.childCount, -1) || new AllSelection(doc3);
  }
  /**
  Deserialize the JSON representation of a selection. Must be
  implemented for custom classes (as a static class method).
  */
  static fromJSON(doc3, json) {
    if (!json || !json.type)
      throw new RangeError("Invalid input for Selection.fromJSON");
    let cls = classesById[json.type];
    if (!cls)
      throw new RangeError(`No selection type ${json.type} defined`);
    return cls.fromJSON(doc3, json);
  }
  /**
  To be able to deserialize selections from JSON, custom selection
  classes must register themselves with an ID string, so that they
  can be disambiguated. Try to pick something that's unlikely to
  clash with classes from other modules.
  */
  static jsonID(id, selectionClass) {
    if (id in classesById)
      throw new RangeError("Duplicate use of selection JSON ID " + id);
    classesById[id] = selectionClass;
    selectionClass.prototype.jsonID = id;
    return selectionClass;
  }
  /**
  Get a [bookmark](https://prosemirror.net/docs/ref/#state.SelectionBookmark) for this selection,
  which is a value that can be mapped without having access to a
  current document, and later resolved to a real selection for a
  given document again. (This is used mostly by the history to
  track and restore old selections.) The default implementation of
  this method just converts the selection to a text selection and
  returns the bookmark for that.
  */
  getBookmark() {
    return TextSelection.between(this.$anchor, this.$head).getBookmark();
  }
};
Selection.prototype.visible = true;
var SelectionRange = class {
  /**
  Create a range.
  */
  constructor($from, $to) {
    this.$from = $from;
    this.$to = $to;
  }
};
var warnedAboutTextSelection = false;
function checkTextSelection($pos) {
  if (!warnedAboutTextSelection && !$pos.parent.inlineContent) {
    warnedAboutTextSelection = true;
    console["warn"]("TextSelection endpoint not pointing into a node with inline content (" + $pos.parent.type.name + ")");
  }
}
var TextSelection = class _TextSelection extends Selection {
  /**
  Construct a text selection between the given points.
  */
  constructor($anchor, $head = $anchor) {
    checkTextSelection($anchor);
    checkTextSelection($head);
    super($anchor, $head);
  }
  /**
  Returns a resolved position if this is a cursor selection (an
  empty text selection), and null otherwise.
  */
  get $cursor() {
    return this.$anchor.pos == this.$head.pos ? this.$head : null;
  }
  map(doc3, mapping) {
    let $head = doc3.resolve(mapping.map(this.head));
    if (!$head.parent.inlineContent)
      return Selection.near($head);
    let $anchor = doc3.resolve(mapping.map(this.anchor));
    return new _TextSelection($anchor.parent.inlineContent ? $anchor : $head, $head);
  }
  replace(tr, content = Slice.empty) {
    super.replace(tr, content);
    if (content == Slice.empty) {
      let marks = this.$from.marksAcross(this.$to);
      if (marks)
        tr.ensureMarks(marks);
    }
  }
  eq(other) {
    return other instanceof _TextSelection && other.anchor == this.anchor && other.head == this.head;
  }
  getBookmark() {
    return new TextBookmark(this.anchor, this.head);
  }
  toJSON() {
    return { type: "text", anchor: this.anchor, head: this.head };
  }
  /**
  @internal
  */
  static fromJSON(doc3, json) {
    if (typeof json.anchor != "number" || typeof json.head != "number")
      throw new RangeError("Invalid input for TextSelection.fromJSON");
    return new _TextSelection(doc3.resolve(json.anchor), doc3.resolve(json.head));
  }
  /**
  Create a text selection from non-resolved positions.
  */
  static create(doc3, anchor, head = anchor) {
    let $anchor = doc3.resolve(anchor);
    return new this($anchor, head == anchor ? $anchor : doc3.resolve(head));
  }
  /**
  Return a text selection that spans the given positions or, if
  they aren't text positions, find a text selection near them.
  `bias` determines whether the method searches forward (default)
  or backwards (negative number) first. Will fall back to calling
  [`Selection.near`](https://prosemirror.net/docs/ref/#state.Selection^near) when the document
  doesn't contain a valid text position.
  */
  static between($anchor, $head, bias) {
    let dPos = $anchor.pos - $head.pos;
    if (!bias || dPos)
      bias = dPos >= 0 ? 1 : -1;
    if (!$head.parent.inlineContent) {
      let found2 = Selection.findFrom($head, bias, true) || Selection.findFrom($head, -bias, true);
      if (found2)
        $head = found2.$head;
      else
        return Selection.near($head, bias);
    }
    if (!$anchor.parent.inlineContent) {
      if (dPos == 0) {
        $anchor = $head;
      } else {
        $anchor = (Selection.findFrom($anchor, -bias, true) || Selection.findFrom($anchor, bias, true)).$anchor;
        if ($anchor.pos < $head.pos != dPos < 0)
          $anchor = $head;
      }
    }
    return new _TextSelection($anchor, $head);
  }
};
Selection.jsonID("text", TextSelection);
var TextBookmark = class _TextBookmark {
  constructor(anchor, head) {
    this.anchor = anchor;
    this.head = head;
  }
  map(mapping) {
    return new _TextBookmark(mapping.map(this.anchor), mapping.map(this.head));
  }
  resolve(doc3) {
    return TextSelection.between(doc3.resolve(this.anchor), doc3.resolve(this.head));
  }
};
var NodeSelection = class _NodeSelection extends Selection {
  /**
  Create a node selection. Does not verify the validity of its
  argument.
  */
  constructor($pos) {
    let node = $pos.nodeAfter;
    let $end = $pos.node(0).resolve($pos.pos + node.nodeSize);
    super($pos, $end);
    this.node = node;
  }
  map(doc3, mapping) {
    let { deleted, pos } = mapping.mapResult(this.anchor);
    let $pos = doc3.resolve(pos);
    if (deleted)
      return Selection.near($pos);
    return new _NodeSelection($pos);
  }
  content() {
    return new Slice(Fragment2.from(this.node), 0, 0);
  }
  eq(other) {
    return other instanceof _NodeSelection && other.anchor == this.anchor;
  }
  toJSON() {
    return { type: "node", anchor: this.anchor };
  }
  getBookmark() {
    return new NodeBookmark(this.anchor);
  }
  /**
  @internal
  */
  static fromJSON(doc3, json) {
    if (typeof json.anchor != "number")
      throw new RangeError("Invalid input for NodeSelection.fromJSON");
    return new _NodeSelection(doc3.resolve(json.anchor));
  }
  /**
  Create a node selection from non-resolved positions.
  */
  static create(doc3, from2) {
    return new _NodeSelection(doc3.resolve(from2));
  }
  /**
  Determines whether the given node may be selected as a node
  selection.
  */
  static isSelectable(node) {
    return !node.isText && node.type.spec.selectable !== false;
  }
};
NodeSelection.prototype.visible = false;
Selection.jsonID("node", NodeSelection);
var NodeBookmark = class _NodeBookmark {
  constructor(anchor) {
    this.anchor = anchor;
  }
  map(mapping) {
    let { deleted, pos } = mapping.mapResult(this.anchor);
    return deleted ? new TextBookmark(pos, pos) : new _NodeBookmark(pos);
  }
  resolve(doc3) {
    let $pos = doc3.resolve(this.anchor), node = $pos.nodeAfter;
    if (node && NodeSelection.isSelectable(node))
      return new NodeSelection($pos);
    return Selection.near($pos);
  }
};
var AllSelection = class _AllSelection extends Selection {
  /**
  Create an all-selection over the given document.
  */
  constructor(doc3) {
    super(doc3.resolve(0), doc3.resolve(doc3.content.size));
  }
  replace(tr, content = Slice.empty) {
    if (content == Slice.empty) {
      tr.delete(0, tr.doc.content.size);
      let sel = Selection.atStart(tr.doc);
      if (!sel.eq(tr.selection))
        tr.setSelection(sel);
    } else {
      super.replace(tr, content);
    }
  }
  toJSON() {
    return { type: "all" };
  }
  /**
  @internal
  */
  static fromJSON(doc3) {
    return new _AllSelection(doc3);
  }
  map(doc3) {
    return new _AllSelection(doc3);
  }
  eq(other) {
    return other instanceof _AllSelection;
  }
  getBookmark() {
    return AllBookmark;
  }
};
Selection.jsonID("all", AllSelection);
var AllBookmark = {
  map() {
    return this;
  },
  resolve(doc3) {
    return new AllSelection(doc3);
  }
};
function findSelectionIn(doc3, node, pos, index, dir, text = false) {
  if (node.inlineContent)
    return TextSelection.create(doc3, pos);
  for (let i2 = index - (dir > 0 ? 0 : 1); dir > 0 ? i2 < node.childCount : i2 >= 0; i2 += dir) {
    let child = node.child(i2);
    if (!child.isAtom) {
      let inner = findSelectionIn(doc3, child, pos + dir, dir < 0 ? child.childCount : 0, dir, text);
      if (inner)
        return inner;
    } else if (!text && NodeSelection.isSelectable(child)) {
      return NodeSelection.create(doc3, pos - (dir < 0 ? child.nodeSize : 0));
    }
    pos += child.nodeSize * dir;
  }
  return null;
}
function selectionToInsertionEnd(tr, startLen, bias) {
  let last = tr.steps.length - 1;
  if (last < startLen)
    return;
  let step = tr.steps[last];
  if (!(step instanceof ReplaceStep || step instanceof ReplaceAroundStep))
    return;
  let map2 = tr.mapping.maps[last], end;
  map2.forEach((_from, _to, _newFrom, newTo) => {
    if (end == null)
      end = newTo;
  });
  tr.setSelection(Selection.near(tr.doc.resolve(end), bias));
}
var UPDATED_SEL = 1;
var UPDATED_MARKS = 2;
var UPDATED_SCROLL = 4;
var Transaction = class extends Transform {
  /**
  @internal
  */
  constructor(state) {
    super(state.doc);
    this.curSelectionFor = 0;
    this.updated = 0;
    this.meta = /* @__PURE__ */ Object.create(null);
    this.time = Date.now();
    this.curSelection = state.selection;
    this.storedMarks = state.storedMarks;
  }
  /**
  The transaction's current selection. This defaults to the editor
  selection [mapped](https://prosemirror.net/docs/ref/#state.Selection.map) through the steps in the
  transaction, but can be overwritten with
  [`setSelection`](https://prosemirror.net/docs/ref/#state.Transaction.setSelection).
  */
  get selection() {
    if (this.curSelectionFor < this.steps.length) {
      this.curSelection = this.curSelection.map(this.doc, this.mapping.slice(this.curSelectionFor));
      this.curSelectionFor = this.steps.length;
    }
    return this.curSelection;
  }
  /**
  Update the transaction's current selection. Will determine the
  selection that the editor gets when the transaction is applied.
  */
  setSelection(selection) {
    if (selection.$from.doc != this.doc)
      throw new RangeError("Selection passed to setSelection must point at the current document");
    this.curSelection = selection;
    this.curSelectionFor = this.steps.length;
    this.updated = (this.updated | UPDATED_SEL) & ~UPDATED_MARKS;
    this.storedMarks = null;
    return this;
  }
  /**
  Whether the selection was explicitly updated by this transaction.
  */
  get selectionSet() {
    return (this.updated & UPDATED_SEL) > 0;
  }
  /**
  Set the current stored marks.
  */
  setStoredMarks(marks) {
    this.storedMarks = marks;
    this.updated |= UPDATED_MARKS;
    return this;
  }
  /**
  Make sure the current stored marks or, if that is null, the marks
  at the selection, match the given set of marks. Does nothing if
  this is already the case.
  */
  ensureMarks(marks) {
    if (!Mark.sameSet(this.storedMarks || this.selection.$from.marks(), marks))
      this.setStoredMarks(marks);
    return this;
  }
  /**
  Add a mark to the set of stored marks.
  */
  addStoredMark(mark) {
    return this.ensureMarks(mark.addToSet(this.storedMarks || this.selection.$head.marks()));
  }
  /**
  Remove a mark or mark type from the set of stored marks.
  */
  removeStoredMark(mark) {
    return this.ensureMarks(mark.removeFromSet(this.storedMarks || this.selection.$head.marks()));
  }
  /**
  Whether the stored marks were explicitly set for this transaction.
  */
  get storedMarksSet() {
    return (this.updated & UPDATED_MARKS) > 0;
  }
  /**
  @internal
  */
  addStep(step, doc3) {
    super.addStep(step, doc3);
    this.updated = this.updated & ~UPDATED_MARKS;
    this.storedMarks = null;
  }
  /**
  Update the timestamp for the transaction.
  */
  setTime(time2) {
    this.time = time2;
    return this;
  }
  /**
  Replace the current selection with the given slice.
  */
  replaceSelection(slice2) {
    this.selection.replace(this, slice2);
    return this;
  }
  /**
  Replace the selection with the given node. When `inheritMarks` is
  true and the content is inline, it inherits the marks from the
  place where it is inserted.
  */
  replaceSelectionWith(node, inheritMarks = true) {
    let selection = this.selection;
    if (inheritMarks)
      node = node.mark(this.storedMarks || (selection.empty ? selection.$from.marks() : selection.$from.marksAcross(selection.$to) || Mark.none));
    selection.replaceWith(this, node);
    return this;
  }
  /**
  Delete the selection.
  */
  deleteSelection() {
    this.selection.replace(this);
    return this;
  }
  /**
  Replace the given range, or the selection if no range is given,
  with a text node containing the given string.
  */
  insertText(text, from2, to) {
    let schema2 = this.doc.type.schema;
    if (from2 == null) {
      if (!text)
        return this.deleteSelection();
      return this.replaceSelectionWith(schema2.text(text), true);
    } else {
      if (to == null)
        to = from2;
      if (!text)
        return this.deleteRange(from2, to);
      let marks = this.storedMarks;
      if (!marks) {
        let $from = this.doc.resolve(from2);
        marks = to == from2 ? $from.marks() : $from.marksAcross(this.doc.resolve(to));
      }
      this.replaceRangeWith(from2, to, schema2.text(text, marks));
      if (!this.selection.empty && this.selection.to == from2 + text.length)
        this.setSelection(Selection.near(this.selection.$to));
      return this;
    }
  }
  /**
  Store a metadata property in this transaction, keyed either by
  name or by plugin.
  */
  setMeta(key, value) {
    this.meta[typeof key == "string" ? key : key.key] = value;
    return this;
  }
  /**
  Retrieve a metadata property for a given name or plugin.
  */
  getMeta(key) {
    return this.meta[typeof key == "string" ? key : key.key];
  }
  /**
  Returns true if this transaction doesn't contain any metadata,
  and can thus safely be extended.
  */
  get isGeneric() {
    for (let _ in this.meta)
      return false;
    return true;
  }
  /**
  Indicate that the editor should scroll the selection into view
  when updated to the state produced by this transaction.
  */
  scrollIntoView() {
    this.updated |= UPDATED_SCROLL;
    return this;
  }
  /**
  True when this transaction has had `scrollIntoView` called on it.
  */
  get scrolledIntoView() {
    return (this.updated & UPDATED_SCROLL) > 0;
  }
};
function bind(f, self) {
  return !self || !f ? f : f.bind(self);
}
var FieldDesc = class {
  constructor(name2, desc, self) {
    this.name = name2;
    this.init = bind(desc.init, self);
    this.apply = bind(desc.apply, self);
  }
};
var baseFields = [
  new FieldDesc("doc", {
    init(config2) {
      return config2.doc || config2.schema.topNodeType.createAndFill();
    },
    apply(tr) {
      return tr.doc;
    }
  }),
  new FieldDesc("selection", {
    init(config2, instance) {
      return config2.selection || Selection.atStart(instance.doc);
    },
    apply(tr) {
      return tr.selection;
    }
  }),
  new FieldDesc("storedMarks", {
    init(config2) {
      return config2.storedMarks || null;
    },
    apply(tr, _marks, _old, state) {
      return state.selection.$cursor ? tr.storedMarks : null;
    }
  }),
  new FieldDesc("scrollToSelection", {
    init() {
      return 0;
    },
    apply(tr, prev) {
      return tr.scrolledIntoView ? prev + 1 : prev;
    }
  })
];
var Configuration = class {
  constructor(schema2, plugins) {
    this.schema = schema2;
    this.plugins = [];
    this.pluginsByKey = /* @__PURE__ */ Object.create(null);
    this.fields = baseFields.slice();
    if (plugins)
      plugins.forEach((plugin) => {
        if (this.pluginsByKey[plugin.key])
          throw new RangeError("Adding different instances of a keyed plugin (" + plugin.key + ")");
        this.plugins.push(plugin);
        this.pluginsByKey[plugin.key] = plugin;
        if (plugin.spec.state)
          this.fields.push(new FieldDesc(plugin.key, plugin.spec.state, plugin));
      });
  }
};
var EditorState = class _EditorState {
  /**
  @internal
  */
  constructor(config2) {
    this.config = config2;
  }
  /**
  The schema of the state's document.
  */
  get schema() {
    return this.config.schema;
  }
  /**
  The plugins that are active in this state.
  */
  get plugins() {
    return this.config.plugins;
  }
  /**
  Apply the given transaction to produce a new state.
  */
  apply(tr) {
    return this.applyTransaction(tr).state;
  }
  /**
  @internal
  */
  filterTransaction(tr, ignore = -1) {
    for (let i2 = 0; i2 < this.config.plugins.length; i2++)
      if (i2 != ignore) {
        let plugin = this.config.plugins[i2];
        if (plugin.spec.filterTransaction && !plugin.spec.filterTransaction.call(plugin, tr, this))
          return false;
      }
    return true;
  }
  /**
  Verbose variant of [`apply`](https://prosemirror.net/docs/ref/#state.EditorState.apply) that
  returns the precise transactions that were applied (which might
  be influenced by the [transaction
  hooks](https://prosemirror.net/docs/ref/#state.PluginSpec.filterTransaction) of
  plugins) along with the new state.
  */
  applyTransaction(rootTr) {
    if (!this.filterTransaction(rootTr))
      return { state: this, transactions: [] };
    let trs = [rootTr], newState = this.applyInner(rootTr), seen = null;
    for (; ; ) {
      let haveNew = false;
      for (let i2 = 0; i2 < this.config.plugins.length; i2++) {
        let plugin = this.config.plugins[i2];
        if (plugin.spec.appendTransaction) {
          let n = seen ? seen[i2].n : 0, oldState = seen ? seen[i2].state : this;
          let tr = n < trs.length && plugin.spec.appendTransaction.call(plugin, n ? trs.slice(n) : trs, oldState, newState);
          if (tr && newState.filterTransaction(tr, i2)) {
            tr.setMeta("appendedTransaction", rootTr);
            if (!seen) {
              seen = [];
              for (let j = 0; j < this.config.plugins.length; j++)
                seen.push(j < i2 ? { state: newState, n: trs.length } : { state: this, n: 0 });
            }
            trs.push(tr);
            newState = newState.applyInner(tr);
            haveNew = true;
          }
          if (seen)
            seen[i2] = { state: newState, n: trs.length };
        }
      }
      if (!haveNew)
        return { state: newState, transactions: trs };
    }
  }
  /**
  @internal
  */
  applyInner(tr) {
    if (!tr.before.eq(this.doc))
      throw new RangeError("Applying a mismatched transaction");
    let newInstance = new _EditorState(this.config), fields = this.config.fields;
    for (let i2 = 0; i2 < fields.length; i2++) {
      let field = fields[i2];
      newInstance[field.name] = field.apply(tr, this[field.name], this, newInstance);
    }
    return newInstance;
  }
  /**
  Accessor that constructs and returns a new [transaction](https://prosemirror.net/docs/ref/#state.Transaction) from this state.
  */
  get tr() {
    return new Transaction(this);
  }
  /**
  Create a new state.
  */
  static create(config2) {
    let $config = new Configuration(config2.doc ? config2.doc.type.schema : config2.schema, config2.plugins);
    let instance = new _EditorState($config);
    for (let i2 = 0; i2 < $config.fields.length; i2++)
      instance[$config.fields[i2].name] = $config.fields[i2].init(config2, instance);
    return instance;
  }
  /**
  Create a new state based on this one, but with an adjusted set
  of active plugins. State fields that exist in both sets of
  plugins are kept unchanged. Those that no longer exist are
  dropped, and those that are new are initialized using their
  [`init`](https://prosemirror.net/docs/ref/#state.StateField.init) method, passing in the new
  configuration object..
  */
  reconfigure(config2) {
    let $config = new Configuration(this.schema, config2.plugins);
    let fields = $config.fields, instance = new _EditorState($config);
    for (let i2 = 0; i2 < fields.length; i2++) {
      let name2 = fields[i2].name;
      instance[name2] = this.hasOwnProperty(name2) ? this[name2] : fields[i2].init(config2, instance);
    }
    return instance;
  }
  /**
  Serialize this state to JSON. If you want to serialize the state
  of plugins, pass an object mapping property names to use in the
  resulting JSON object to plugin objects. The argument may also be
  a string or number, in which case it is ignored, to support the
  way `JSON.stringify` calls `toString` methods.
  */
  toJSON(pluginFields) {
    let result = { doc: this.doc.toJSON(), selection: this.selection.toJSON() };
    if (this.storedMarks)
      result.storedMarks = this.storedMarks.map((m) => m.toJSON());
    if (pluginFields && typeof pluginFields == "object")
      for (let prop in pluginFields) {
        if (prop == "doc" || prop == "selection")
          throw new RangeError("The JSON fields `doc` and `selection` are reserved");
        let plugin = pluginFields[prop], state = plugin.spec.state;
        if (state && state.toJSON)
          result[prop] = state.toJSON.call(plugin, this[plugin.key]);
      }
    return result;
  }
  /**
  Deserialize a JSON representation of a state. `config` should
  have at least a `schema` field, and should contain array of
  plugins to initialize the state with. `pluginFields` can be used
  to deserialize the state of plugins, by associating plugin
  instances with the property names they use in the JSON object.
  */
  static fromJSON(config2, json, pluginFields) {
    if (!json)
      throw new RangeError("Invalid input for EditorState.fromJSON");
    if (!config2.schema)
      throw new RangeError("Required config field 'schema' missing");
    let $config = new Configuration(config2.schema, config2.plugins);
    let instance = new _EditorState($config);
    $config.fields.forEach((field) => {
      if (field.name == "doc") {
        instance.doc = Node.fromJSON(config2.schema, json.doc);
      } else if (field.name == "selection") {
        instance.selection = Selection.fromJSON(instance.doc, json.selection);
      } else if (field.name == "storedMarks") {
        if (json.storedMarks)
          instance.storedMarks = json.storedMarks.map(config2.schema.markFromJSON);
      } else {
        if (pluginFields)
          for (let prop in pluginFields) {
            let plugin = pluginFields[prop], state = plugin.spec.state;
            if (plugin.key == field.name && state && state.fromJSON && Object.prototype.hasOwnProperty.call(json, prop)) {
              instance[field.name] = state.fromJSON.call(plugin, config2, json[prop], instance);
              return;
            }
          }
        instance[field.name] = field.init(config2, instance);
      }
    });
    return instance;
  }
};
function bindProps(obj, self, target) {
  for (let prop in obj) {
    let val = obj[prop];
    if (val instanceof Function)
      val = val.bind(self);
    else if (prop == "handleDOMEvents")
      val = bindProps(val, self, {});
    target[prop] = val;
  }
  return target;
}
var Plugin = class {
  /**
  Create a plugin.
  */
  constructor(spec) {
    this.spec = spec;
    this.props = {};
    if (spec.props)
      bindProps(spec.props, this, this.props);
    this.key = spec.key ? spec.key.key : createKey("plugin");
  }
  /**
  Extract the plugin's state field from an editor state.
  */
  getState(state) {
    return state[this.key];
  }
};
var keys = /* @__PURE__ */ Object.create(null);
function createKey(name2) {
  if (name2 in keys)
    return name2 + "$" + ++keys[name2];
  keys[name2] = 0;
  return name2 + "$";
}
var PluginKey = class {
  /**
  Create a plugin key.
  */
  constructor(name2 = "key") {
    this.key = createKey(name2);
  }
  /**
  Get the active plugin with this key, if any, from an editor
  state.
  */
  get(state) {
    return state.config.pluginsByKey[this.key];
  }
  /**
  Get the plugin's state from an editor state.
  */
  getState(state) {
    return state[this.key];
  }
};

// node_modules/prosemirror-view/dist/index.js
var domIndex = function(node) {
  for (var index = 0; ; index++) {
    node = node.previousSibling;
    if (!node)
      return index;
  }
};
var parentNode = function(node) {
  let parent = node.assignedSlot || node.parentNode;
  return parent && parent.nodeType == 11 ? parent.host : parent;
};
var reusedRange = null;
var textRange = function(node, from2, to) {
  let range = reusedRange || (reusedRange = document.createRange());
  range.setEnd(node, to == null ? node.nodeValue.length : to);
  range.setStart(node, from2 || 0);
  return range;
};
var clearReusedRange = function() {
  reusedRange = null;
};
var isEquivalentPosition = function(node, off, targetNode, targetOff) {
  return targetNode && (scanFor(node, off, targetNode, targetOff, -1) || scanFor(node, off, targetNode, targetOff, 1));
};
var atomElements = /^(img|br|input|textarea|hr)$/i;
function scanFor(node, off, targetNode, targetOff, dir) {
  var _a2;
  for (; ; ) {
    if (node == targetNode && off == targetOff)
      return true;
    if (off == (dir < 0 ? 0 : nodeSize(node))) {
      let parent = node.parentNode;
      if (!parent || !isElt(parent) || hasBlockDesc(node) || atomElements.test(node.nodeName) || node.contentEditable == "false")
        return false;
      off = domIndex(node) + (dir < 0 ? 0 : 1);
      node = parent;
    } else if (isElt(node)) {
      let child = node.childNodes[off + (dir < 0 ? -1 : 0)];
      if (isElt(child) && child.contentEditable == "false") {
        if ((_a2 = child.pmViewDesc) === null || _a2 === void 0 ? void 0 : _a2.ignoreForSelection)
          off += dir;
        else
          return false;
      } else {
        node = child;
        off = dir < 0 ? nodeSize(node) : 0;
      }
    } else {
      return false;
    }
  }
}
function nodeSize(node) {
  return node.nodeType == 3 ? node.nodeValue.length : node.childNodes.length;
}
function isElt(node) {
  return node.nodeType == 1;
}
function isText(node) {
  return node.nodeType == 3;
}
function contains(parent, child) {
  return child ? parent.contains(isElt(child) ? child : child.parentNode) : false;
}
function textNodeBefore$1(node, offset) {
  for (; ; ) {
    if (isText(node) && offset)
      return node;
    if (isElt(node) && offset > 0) {
      if (node.contentEditable == "false")
        return null;
      node = node.childNodes[offset - 1];
      offset = nodeSize(node);
    } else if (node.parentNode && !hasBlockDesc(node)) {
      offset = domIndex(node);
      node = node.parentNode;
    } else {
      return null;
    }
  }
}
function textNodeAfter$1(node, offset) {
  for (; ; ) {
    if (isText(node) && offset < node.nodeValue.length)
      return node;
    if (isElt(node) && offset < node.childNodes.length) {
      if (node.contentEditable == "false")
        return null;
      node = node.childNodes[offset];
      offset = 0;
    } else if (node.parentNode && !hasBlockDesc(node)) {
      offset = domIndex(node) + 1;
      node = node.parentNode;
    } else {
      return null;
    }
  }
}
function isOnEdge(node, offset, parent) {
  for (let atStart = offset == 0, atEnd = offset == nodeSize(node); atStart || atEnd; ) {
    if (node == parent)
      return true;
    let index = domIndex(node);
    node = node.parentNode;
    if (!node)
      return false;
    atStart = atStart && index == 0;
    atEnd = atEnd && index == nodeSize(node);
  }
}
function hasBlockDesc(dom) {
  let desc;
  for (let cur = dom; cur; cur = cur.parentNode)
    if (desc = cur.pmViewDesc)
      break;
  return desc && desc.node && desc.node.isBlock && (desc.dom == dom || desc.contentDOM == dom);
}
var selectionCollapsed = function(domSel) {
  return domSel.focusNode && isEquivalentPosition(domSel.focusNode, domSel.focusOffset, domSel.anchorNode, domSel.anchorOffset);
};
function keyEvent(keyCode, key) {
  let event = document.createEvent("Event");
  event.initEvent("keydown", true, true);
  event.keyCode = keyCode;
  event.key = event.code = key;
  return event;
}
function deepActiveElement(doc3) {
  let elt = doc3.activeElement;
  while (elt && elt.shadowRoot)
    elt = elt.shadowRoot.activeElement;
  return elt;
}
function caretFromPoint(doc3, x, y) {
  if (doc3.caretPositionFromPoint) {
    try {
      let pos = doc3.caretPositionFromPoint(x, y);
      if (pos)
        return { node: pos.offsetNode, offset: Math.min(nodeSize(pos.offsetNode), pos.offset) };
    } catch (_) {
    }
  }
  if (doc3.caretRangeFromPoint) {
    let range = doc3.caretRangeFromPoint(x, y);
    if (range)
      return { node: range.startContainer, offset: Math.min(nodeSize(range.startContainer), range.startOffset) };
  }
}
var nav = typeof navigator != "undefined" ? navigator : null;
var doc2 = typeof document != "undefined" ? document : null;
var agent = nav && nav.userAgent || "";
var ie_edge = /Edge\/(\d+)/.exec(agent);
var ie_upto10 = /MSIE \d/.exec(agent);
var ie_11up = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(agent);
var ie = !!(ie_upto10 || ie_11up || ie_edge);
var ie_version = ie_upto10 ? document.documentMode : ie_11up ? +ie_11up[1] : ie_edge ? +ie_edge[1] : 0;
var gecko = !ie && /gecko\/(\d+)/i.test(agent);
gecko && +(/Firefox\/(\d+)/.exec(agent) || [0, 0])[1];
var _chrome = !ie && /Chrome\/(\d+)/.exec(agent);
var chrome = !!_chrome;
var chrome_version = _chrome ? +_chrome[1] : 0;
var safari = !ie && !!nav && /Apple Computer/.test(nav.vendor);
var ios = safari && (/Mobile\/\w+/.test(agent) || !!nav && nav.maxTouchPoints > 2);
var mac2 = ios || (nav ? /Mac/.test(nav.platform) : false);
var windows = nav ? /Win/.test(nav.platform) : false;
var android = /Android \d/.test(agent);
var webkit = !!doc2 && "webkitFontSmoothing" in doc2.documentElement.style;
var webkit_version = webkit ? +(/\bAppleWebKit\/(\d+)/.exec(navigator.userAgent) || [0, 0])[1] : 0;
function windowRect(doc3) {
  let vp = doc3.defaultView && doc3.defaultView.visualViewport;
  if (vp)
    return {
      left: 0,
      right: vp.width,
      top: 0,
      bottom: vp.height
    };
  return {
    left: 0,
    right: doc3.documentElement.clientWidth,
    top: 0,
    bottom: doc3.documentElement.clientHeight
  };
}
function getSide(value, side) {
  return typeof value == "number" ? value : value[side];
}
function clientRect(node) {
  let rect = node.getBoundingClientRect();
  let scaleX = rect.width / node.offsetWidth || 1;
  let scaleY = rect.height / node.offsetHeight || 1;
  return {
    left: rect.left,
    right: rect.left + node.clientWidth * scaleX,
    top: rect.top,
    bottom: rect.top + node.clientHeight * scaleY
  };
}
function scrollRectIntoView(view, rect, startDOM) {
  if (!nonZero(rect) && rect.left == 0)
    return;
  let scrollThreshold = view.someProp("scrollThreshold") || 0, scrollMargin = view.someProp("scrollMargin") || 5;
  let doc3 = view.dom.ownerDocument;
  for (let parent = startDOM || view.dom; ; ) {
    if (!parent)
      break;
    if (!isElt(parent)) {
      parent = parentNode(parent);
      continue;
    }
    let atTop = parent == doc3.body;
    let bounding = atTop ? windowRect(doc3) : clientRect(parent);
    let moveX = 0, moveY = 0;
    if (rect.top < bounding.top + getSide(scrollThreshold, "top"))
      moveY = -(bounding.top - rect.top + getSide(scrollMargin, "top"));
    else if (rect.bottom > bounding.bottom - getSide(scrollThreshold, "bottom"))
      moveY = rect.bottom - rect.top > bounding.bottom - bounding.top ? rect.top + getSide(scrollMargin, "top") - bounding.top : rect.bottom - bounding.bottom + getSide(scrollMargin, "bottom");
    if (rect.left < bounding.left + getSide(scrollThreshold, "left"))
      moveX = -(bounding.left - rect.left + getSide(scrollMargin, "left"));
    else if (rect.right > bounding.right - getSide(scrollThreshold, "right"))
      moveX = rect.right - bounding.right + getSide(scrollMargin, "right");
    if (moveX || moveY) {
      if (atTop) {
        doc3.defaultView.scrollBy(moveX, moveY);
      } else {
        let startX = parent.scrollLeft, startY = parent.scrollTop;
        if (moveY)
          parent.scrollTop += moveY;
        if (moveX)
          parent.scrollLeft += moveX;
        let dX = parent.scrollLeft - startX, dY = parent.scrollTop - startY;
        rect = { left: rect.left - dX, top: rect.top - dY, right: rect.right - dX, bottom: rect.bottom - dY };
      }
    }
    let pos = atTop ? "fixed" : getComputedStyle(parent).position;
    if (/^(fixed|sticky)$/.test(pos))
      break;
    parent = pos == "absolute" ? parent.offsetParent : parentNode(parent);
  }
}
function storeScrollPos(view) {
  let rect = view.dom.getBoundingClientRect(), startY = Math.max(0, rect.top);
  let refDOM, refTop;
  for (let x = (rect.left + rect.right) / 2, y = startY + 1; y < Math.min(innerHeight, rect.bottom); y += 5) {
    let dom = view.root.elementFromPoint(x, y);
    if (!dom || dom == view.dom || !view.dom.contains(dom))
      continue;
    let localRect = dom.getBoundingClientRect();
    if (localRect.top >= startY - 20) {
      refDOM = dom;
      refTop = localRect.top;
      break;
    }
  }
  return { refDOM, refTop, stack: scrollStack(view.dom) };
}
function scrollStack(dom) {
  let stack = [], doc3 = dom.ownerDocument;
  for (let cur = dom; cur; cur = parentNode(cur)) {
    stack.push({ dom: cur, top: cur.scrollTop, left: cur.scrollLeft });
    if (dom == doc3)
      break;
  }
  return stack;
}
function resetScrollPos({ refDOM, refTop, stack }) {
  let newRefTop = refDOM ? refDOM.getBoundingClientRect().top : 0;
  restoreScrollStack(stack, newRefTop == 0 ? 0 : newRefTop - refTop);
}
function restoreScrollStack(stack, dTop) {
  for (let i2 = 0; i2 < stack.length; i2++) {
    let { dom, top, left } = stack[i2];
    if (dom.scrollTop != top + dTop)
      dom.scrollTop = top + dTop;
    if (dom.scrollLeft != left)
      dom.scrollLeft = left;
  }
}
var preventScrollSupported = null;
function focusPreventScroll(dom) {
  if (dom.setActive)
    return dom.setActive();
  if (preventScrollSupported)
    return dom.focus(preventScrollSupported);
  let stored = scrollStack(dom);
  dom.focus(preventScrollSupported == null ? {
    get preventScroll() {
      preventScrollSupported = { preventScroll: true };
      return true;
    }
  } : void 0);
  if (!preventScrollSupported) {
    preventScrollSupported = false;
    restoreScrollStack(stored, 0);
  }
}
function findOffsetInNode(node, coords) {
  let closest;
  let dxClosest = 2e8, coordsClosest, offset = 0;
  let rowBot = coords.top, rowTop = coords.top;
  let firstBelow, coordsBelow;
  for (let child = node.firstChild, childIndex = 0; child; child = child.nextSibling, childIndex++) {
    let rects;
    if (isElt(child))
      rects = child.getClientRects();
    else if (isText(child))
      rects = textRange(child).getClientRects();
    else
      continue;
    for (let i2 = 0; i2 < rects.length; i2++) {
      let rect = rects[i2];
      if (rect.top <= rowBot && rect.bottom >= rowTop) {
        rowBot = Math.max(rect.bottom, rowBot);
        rowTop = Math.min(rect.top, rowTop);
        let dx = rect.left > coords.left ? rect.left - coords.left : rect.right < coords.left ? coords.left - rect.right : 0;
        if (dx < dxClosest) {
          closest = child;
          dxClosest = dx;
          coordsClosest = dx && isText(closest) ? {
            left: rect.right < coords.left ? rect.right : rect.left,
            top: coords.top
          } : coords;
          if (isElt(child) && dx)
            offset = childIndex + (coords.left >= (rect.left + rect.right) / 2 ? 1 : 0);
          continue;
        }
      } else if (rect.top > coords.top && !firstBelow && rect.left <= coords.left && rect.right >= coords.left) {
        firstBelow = child;
        coordsBelow = { left: Math.max(rect.left, Math.min(rect.right, coords.left)), top: rect.top };
      }
      if (!closest && (coords.left >= rect.right && coords.top >= rect.top || coords.left >= rect.left && coords.top >= rect.bottom))
        offset = childIndex + 1;
    }
  }
  if (!closest && firstBelow) {
    closest = firstBelow;
    coordsClosest = coordsBelow;
    dxClosest = 0;
  }
  if (closest && isText(closest))
    return findOffsetInText(closest, coordsClosest);
  if (!closest || dxClosest)
    return { node, offset };
  return findOffsetInNode(closest, coordsClosest);
}
function findOffsetInText(node, coords) {
  let len = node.nodeValue.length;
  let range = document.createRange(), result;
  for (let i2 = 0; i2 < len; i2++) {
    range.setEnd(node, i2 + 1);
    range.setStart(node, i2);
    let rect = singleRect(range, 1);
    if (rect.top == rect.bottom)
      continue;
    if (inRect(coords, rect)) {
      result = { node, offset: i2 + (coords.left >= (rect.left + rect.right) / 2 ? 1 : 0) };
      break;
    }
  }
  range.detach();
  return result || { node, offset: 0 };
}
function inRect(coords, rect) {
  return coords.left >= rect.left - 1 && coords.left <= rect.right + 1 && coords.top >= rect.top - 1 && coords.top <= rect.bottom + 1;
}
function targetKludge(dom, coords) {
  let parent = dom.parentNode;
  if (parent && /^li$/i.test(parent.nodeName) && coords.left < dom.getBoundingClientRect().left)
    return parent;
  return dom;
}
function posFromElement(view, elt, coords) {
  let { node, offset } = findOffsetInNode(elt, coords), bias = -1;
  if (isElt(node) && !node.firstChild) {
    let rect = node.getBoundingClientRect();
    bias = rect.left != rect.right && coords.left > (rect.left + rect.right) / 2 ? 1 : -1;
  }
  return view.docView.posFromDOM(node, offset, bias);
}
function posFromCaret(view, node, offset, coords) {
  let outsideBlock = -1;
  for (let cur = node, sawBlock = false; ; ) {
    if (cur == view.dom)
      break;
    let desc = view.docView.nearestDesc(cur, true), rect;
    if (!desc)
      return null;
    if (isElt(desc.dom) && (desc.node.isBlock && desc.parent || !desc.contentDOM) && // Ignore elements with zero-size bounding rectangles
    ((rect = desc.dom.getBoundingClientRect()).width || rect.height)) {
      if (desc.node.isBlock && desc.parent && !/^T(R|BODY|HEAD|FOOT)$/.test(desc.dom.nodeName)) {
        if (!sawBlock && rect.left > coords.left || rect.top > coords.top)
          outsideBlock = desc.posBefore;
        else if (!sawBlock && rect.right < coords.left || rect.bottom < coords.top)
          outsideBlock = desc.posAfter;
        sawBlock = true;
      }
      if (!desc.contentDOM && outsideBlock < 0 && !desc.node.isText) {
        let before = desc.node.isBlock ? coords.top < (rect.top + rect.bottom) / 2 : coords.left < (rect.left + rect.right) / 2;
        return before ? desc.posBefore : desc.posAfter;
      }
    }
    cur = desc.dom.parentNode;
  }
  return outsideBlock > -1 ? outsideBlock : view.docView.posFromDOM(node, offset, -1);
}
function elementFromPoint(element, coords, box) {
  let len = element.childNodes.length;
  if (len && box.top < box.bottom) {
    for (let startI = Math.max(0, Math.min(len - 1, Math.floor(len * (coords.top - box.top) / (box.bottom - box.top)) - 2)), i2 = startI; ; ) {
      let child = element.childNodes[i2];
      if (isElt(child)) {
        let rects = child.getClientRects();
        for (let j = 0; j < rects.length; j++) {
          let rect = rects[j];
          if (inRect(coords, rect))
            return elementFromPoint(child, coords, rect);
        }
      }
      if ((i2 = (i2 + 1) % len) == startI)
        break;
    }
  }
  return element;
}
function posAtCoords(view, coords) {
  let doc3 = view.dom.ownerDocument, node, offset = 0;
  let caret = caretFromPoint(doc3, coords.left, coords.top);
  if (caret)
    ({ node, offset } = caret);
  let elt = (view.root.elementFromPoint ? view.root : doc3).elementFromPoint(coords.left, coords.top);
  let pos;
  if (!elt || !view.dom.contains(elt)) {
    let box = view.dom.getBoundingClientRect();
    if (!inRect(coords, box))
      return null;
    elt = elementFromPoint(view.dom, coords, box);
    if (!elt)
      return null;
  }
  if (safari) {
    for (let p = elt; node && p; p = parentNode(p))
      if (p.draggable)
        node = void 0;
  }
  elt = targetKludge(elt, coords);
  if (node) {
    if (gecko && isElt(node)) {
      offset = Math.min(offset, node.childNodes.length);
      if (offset < node.childNodes.length) {
        let next = node.childNodes[offset], box;
        if (next.nodeName == "IMG" && (box = next.getBoundingClientRect()).right <= coords.left && box.bottom > coords.top)
          offset++;
      }
    }
    let prev;
    if (webkit && offset && isElt(node) && isElt(prev = node.childNodes[offset - 1]) && prev.contentEditable == "false" && prev.getBoundingClientRect().top >= coords.top)
      offset--;
    if (node == view.dom && offset == node.childNodes.length - 1 && isElt(node.lastChild) && coords.top > node.lastChild.getBoundingClientRect().bottom)
      pos = view.state.doc.content.size;
    else if (offset == 0 || !isElt(node) || node.childNodes[offset - 1].nodeName != "BR")
      pos = posFromCaret(view, node, offset, coords);
  }
  if (pos == null)
    pos = posFromElement(view, elt, coords);
  let desc = view.docView.nearestDesc(elt, true);
  return { pos, inside: desc ? desc.posAtStart - desc.border : -1 };
}
function nonZero(rect) {
  return rect.top < rect.bottom || rect.left < rect.right;
}
function singleRect(target, bias) {
  let rects = target.getClientRects();
  if (rects.length) {
    let first = rects[bias < 0 ? 0 : rects.length - 1];
    if (nonZero(first))
      return first;
  }
  return Array.prototype.find.call(rects, nonZero) || target.getBoundingClientRect();
}
var BIDI = /[\u0590-\u05f4\u0600-\u06ff\u0700-\u08ac]/;
function coordsAtPos(view, pos, side) {
  let { node, offset, atom } = view.docView.domFromPos(pos, side < 0 ? -1 : 1);
  let supportEmptyRange = webkit || gecko;
  if (isText(node)) {
    if (supportEmptyRange && (BIDI.test(node.nodeValue) || (side < 0 ? !offset : offset == node.nodeValue.length))) {
      let rect = singleRect(textRange(node, offset, offset), side);
      if (gecko && offset && /\s/.test(node.nodeValue[offset - 1]) && offset < node.nodeValue.length) {
        let rectBefore = singleRect(textRange(node, offset - 1, offset - 1), -1);
        if (rectBefore.top == rect.top) {
          let rectAfter = singleRect(textRange(node, offset, offset + 1), -1);
          if (rectAfter.top != rect.top)
            return flattenV(rectAfter, rectAfter.left < rectBefore.left);
        }
      }
      return rect;
    } else {
      let from2 = offset, to = offset, takeSide = side < 0 ? 1 : -1;
      if (side < 0 && !offset) {
        to++;
        takeSide = -1;
      } else if (side >= 0 && offset == node.nodeValue.length) {
        from2--;
        takeSide = 1;
      } else if (side < 0) {
        from2--;
      } else {
        to++;
      }
      return flattenV(singleRect(textRange(node, from2, to), takeSide), takeSide < 0);
    }
  }
  let $dom = view.state.doc.resolve(pos - (atom || 0));
  if (!$dom.parent.inlineContent) {
    if (atom == null && offset && (side < 0 || offset == nodeSize(node))) {
      let before = node.childNodes[offset - 1];
      if (isElt(before))
        return flattenH(before.getBoundingClientRect(), false);
    }
    if (atom == null && offset < nodeSize(node)) {
      let after = node.childNodes[offset];
      if (isElt(after))
        return flattenH(after.getBoundingClientRect(), true);
    }
    return flattenH(node.getBoundingClientRect(), side >= 0);
  }
  if (atom == null && offset && (side < 0 || offset == nodeSize(node))) {
    let before = node.childNodes[offset - 1];
    let target = isText(before) ? textRange(before, nodeSize(before) - (supportEmptyRange ? 0 : 1)) : isElt(before) && (before.nodeName != "BR" || !before.nextSibling) ? before : null;
    if (target)
      return flattenV(singleRect(target, 1), false);
  }
  if (atom == null && offset < nodeSize(node)) {
    let after = node.childNodes[offset];
    while (after.pmViewDesc && after.pmViewDesc.ignoreForCoords)
      after = after.nextSibling;
    let target = !after ? null : isText(after) ? textRange(after, 0, supportEmptyRange ? 0 : 1) : isElt(after) ? after : null;
    if (target)
      return flattenV(singleRect(target, -1), true);
  }
  return flattenV(singleRect(isText(node) ? textRange(node) : node, -side), side >= 0);
}
function flattenV(rect, left) {
  if (rect.width == 0)
    return rect;
  let x = left ? rect.left : rect.right;
  return { top: rect.top, bottom: rect.bottom, left: x, right: x };
}
function flattenH(rect, top) {
  if (rect.height == 0)
    return rect;
  let y = top ? rect.top : rect.bottom;
  return { top: y, bottom: y, left: rect.left, right: rect.right };
}
function withFlushedState(view, state, f) {
  let viewState = view.state, active = view.root.activeElement;
  if (viewState != state)
    view.updateState(state);
  if (active != view.dom)
    view.focus();
  try {
    return f();
  } finally {
    if (viewState != state)
      view.updateState(viewState);
    if (active != view.dom && active)
      active.focus();
  }
}
function endOfTextblockVertical(view, state, dir) {
  let sel = state.selection;
  let $pos = dir == "up" ? sel.$from : sel.$to;
  return withFlushedState(view, state, () => {
    let { node: dom } = view.docView.domFromPos($pos.pos, dir == "up" ? -1 : 1);
    for (; ; ) {
      let nearest = view.docView.nearestDesc(dom, true);
      if (!nearest)
        break;
      if (nearest.node.isBlock) {
        dom = nearest.contentDOM || nearest.dom;
        break;
      }
      dom = nearest.dom.parentNode;
    }
    let coords = coordsAtPos(view, $pos.pos, 1);
    for (let child = dom.firstChild; child; child = child.nextSibling) {
      let boxes;
      if (isElt(child))
        boxes = child.getClientRects();
      else if (isText(child))
        boxes = textRange(child, 0, child.nodeValue.length).getClientRects();
      else
        continue;
      for (let i2 = 0; i2 < boxes.length; i2++) {
        let box = boxes[i2];
        if (box.bottom > box.top + 1 && (dir == "up" ? coords.top - box.top > (box.bottom - coords.top) * 2 : box.bottom - coords.bottom > (coords.bottom - box.top) * 2))
          return false;
      }
    }
    return true;
  });
}
var maybeRTL = /[\u0590-\u08ac]/;
function endOfTextblockHorizontal(view, state, dir) {
  let { $head } = state.selection;
  if (!$head.parent.isTextblock)
    return false;
  let offset = $head.parentOffset, atStart = !offset, atEnd = offset == $head.parent.content.size;
  let sel = view.domSelection();
  if (!sel)
    return $head.pos == $head.start() || $head.pos == $head.end();
  if (!maybeRTL.test($head.parent.textContent) || !sel.modify)
    return dir == "left" || dir == "backward" ? atStart : atEnd;
  return withFlushedState(view, state, () => {
    let { focusNode: oldNode, focusOffset: oldOff, anchorNode, anchorOffset } = view.domSelectionRange();
    let oldBidiLevel = sel.caretBidiLevel;
    sel.modify("move", dir, "character");
    let parentDOM = $head.depth ? view.docView.domAfterPos($head.before()) : view.dom;
    let { focusNode: newNode, focusOffset: newOff } = view.domSelectionRange();
    let result = newNode && !contains(parentDOM, newNode) || oldNode == newNode && oldOff == newOff;
    try {
      sel.collapse(anchorNode, anchorOffset);
      if (oldNode && (oldNode != anchorNode || oldOff != anchorOffset) && sel.extend)
        sel.extend(oldNode, oldOff);
    } catch (_) {
    }
    if (oldBidiLevel != null)
      sel.caretBidiLevel = oldBidiLevel;
    return result;
  });
}
var cachedState = null;
var cachedDir = null;
var cachedResult = false;
function endOfTextblock(view, state, dir) {
  if (cachedState == state && cachedDir == dir)
    return cachedResult;
  cachedState = state;
  cachedDir = dir;
  return cachedResult = dir == "up" || dir == "down" ? endOfTextblockVertical(view, state, dir) : endOfTextblockHorizontal(view, state, dir);
}
var NOT_DIRTY = 0;
var CHILD_DIRTY = 1;
var CONTENT_DIRTY = 2;
var NODE_DIRTY = 3;
var ViewDesc = class {
  constructor(parent, children, dom, contentDOM) {
    this.parent = parent;
    this.children = children;
    this.dom = dom;
    this.contentDOM = contentDOM;
    this.dirty = NOT_DIRTY;
    dom.pmViewDesc = this;
  }
  // Used to check whether a given description corresponds to a
  // widget/mark/node.
  matchesWidget(widget) {
    return false;
  }
  matchesMark(mark) {
    return false;
  }
  matchesNode(node, outerDeco, innerDeco) {
    return false;
  }
  matchesHack(nodeName) {
    return false;
  }
  // When parsing in-editor content (in domchange.js), we allow
  // descriptions to determine the parse rules that should be used to
  // parse them.
  parseRule(addedNodes) {
    return null;
  }
  // Used by the editor's event handler to ignore events that come
  // from certain descs.
  stopEvent(event) {
    return false;
  }
  // The size of the content represented by this desc.
  get size() {
    let size = 0;
    for (let i2 = 0; i2 < this.children.length; i2++)
      size += this.children[i2].size;
    return size;
  }
  // For block nodes, this represents the space taken up by their
  // start/end tokens.
  get border() {
    return 0;
  }
  destroy() {
    this.parent = void 0;
    if (this.dom.pmViewDesc == this)
      this.dom.pmViewDesc = void 0;
    for (let i2 = 0; i2 < this.children.length; i2++)
      this.children[i2].destroy();
  }
  posBeforeChild(child) {
    for (let i2 = 0, pos = this.posAtStart; ; i2++) {
      let cur = this.children[i2];
      if (cur == child)
        return pos;
      pos += cur.size;
    }
  }
  get posBefore() {
    return this.parent.posBeforeChild(this);
  }
  get posAtStart() {
    return this.parent ? this.parent.posBeforeChild(this) + this.border : 0;
  }
  get posAfter() {
    return this.posBefore + this.size;
  }
  get posAtEnd() {
    return this.posAtStart + this.size - 2 * this.border;
  }
  localPosFromDOM(dom, offset, bias) {
    if (this.contentDOM && contains(this.contentDOM, dom)) {
      if (bias < 0) {
        let domBefore, desc;
        if (dom == this.contentDOM) {
          domBefore = dom.childNodes[offset - 1];
        } else {
          while (dom.parentNode != this.contentDOM)
            dom = dom.parentNode;
          domBefore = dom.previousSibling;
        }
        while (domBefore && !((desc = domBefore.pmViewDesc) && desc.parent == this))
          domBefore = domBefore.previousSibling;
        return domBefore ? this.posBeforeChild(desc) + desc.size : this.posAtStart;
      } else {
        let domAfter, desc;
        if (dom == this.contentDOM) {
          domAfter = dom.childNodes[offset];
        } else {
          while (dom.parentNode != this.contentDOM)
            dom = dom.parentNode;
          domAfter = dom.nextSibling;
        }
        while (domAfter && !((desc = domAfter.pmViewDesc) && desc.parent == this))
          domAfter = domAfter.nextSibling;
        return domAfter ? this.posBeforeChild(desc) : this.posAtEnd;
      }
    }
    let atEnd;
    if (dom == this.dom && this.contentDOM) {
      atEnd = offset > domIndex(this.contentDOM);
    } else if (this.contentDOM && this.contentDOM != this.dom && this.dom.contains(this.contentDOM)) {
      atEnd = !!(dom.compareDocumentPosition(this.contentDOM) & 4);
    } else if (this.dom.firstChild) {
      if (offset == 0)
        for (let search = dom; ; search = search.parentNode) {
          if (search == this.dom) {
            atEnd = false;
            break;
          }
          if (search.previousSibling)
            break;
        }
      if (atEnd == null && offset == dom.childNodes.length)
        for (let search = dom; ; search = search.parentNode) {
          if (search == this.dom) {
            atEnd = true;
            break;
          }
          if (search.nextSibling)
            break;
        }
    }
    return (atEnd == null ? bias > 0 : atEnd) ? this.posAtEnd : this.posAtStart;
  }
  nearestDesc(dom, onlyNodes = false) {
    for (let first = true, cur = dom; cur; cur = cur.parentNode) {
      let desc = this.getDesc(cur), nodeDOM;
      if (desc && (!onlyNodes || desc.node)) {
        if (first && (nodeDOM = desc.nodeDOM) && !(isElt(nodeDOM) ? contains(nodeDOM, dom) : nodeDOM == dom))
          first = false;
        else
          return desc;
      }
    }
  }
  getDesc(dom) {
    let desc = dom.pmViewDesc;
    for (let cur = desc; cur; cur = cur.parent)
      if (cur == this)
        return desc;
  }
  posFromDOM(dom, offset, bias) {
    for (let scan = dom; scan; scan = scan.parentNode) {
      let desc = this.getDesc(scan);
      if (desc)
        return desc.localPosFromDOM(dom, offset, bias);
    }
    return -1;
  }
  // Find the desc for the node after the given pos, if any. (When a
  // parent node overrode rendering, there might not be one.)
  descAt(pos) {
    for (let i2 = 0, offset = 0; i2 < this.children.length; i2++) {
      let child = this.children[i2], end = offset + child.size;
      if (offset == pos && end != offset) {
        while (!child.border && child.children.length) {
          for (let i3 = 0; i3 < child.children.length; i3++) {
            let inner = child.children[i3];
            if (inner.size) {
              child = inner;
              break;
            }
          }
        }
        return child;
      }
      if (pos < end)
        return child.descAt(pos - offset - child.border);
      offset = end;
    }
  }
  domFromPos(pos, side) {
    if (!this.contentDOM)
      return { node: this.dom, offset: 0, atom: pos + 1 };
    let i2 = 0, offset = 0;
    for (let curPos = 0; i2 < this.children.length; i2++) {
      let child = this.children[i2], end = curPos + child.size;
      if (end > pos) {
        offset = pos - curPos;
        break;
      }
      curPos = end;
    }
    if (offset)
      return this.children[i2].domFromPos(offset - this.children[i2].border, side);
    for (; i2 > 0; i2--) {
      let prev = this.children[i2 - 1];
      if (prev.size || !(prev instanceof BufferHackViewDesc || prev instanceof WidgetViewDesc && prev.side >= 0))
        break;
    }
    if (side <= 0) {
      let prev, enter = true;
      for (; ; i2--, enter = false) {
        prev = i2 ? this.children[i2 - 1] : null;
        if (!prev || prev.dom.parentNode == this.contentDOM)
          break;
      }
      if (prev && side && enter && !prev.border && !prev.domAtom)
        return prev.domFromPos(prev.size, side);
      return { node: this.contentDOM, offset: prev ? domIndex(prev.dom) + 1 : 0 };
    } else {
      let next, enter = true;
      for (; ; i2++, enter = false) {
        next = i2 < this.children.length ? this.children[i2] : null;
        if (!next || next.dom.parentNode == this.contentDOM)
          break;
      }
      if (next && enter && !next.border && !next.domAtom)
        return next.domFromPos(0, side);
      return { node: this.contentDOM, offset: next ? domIndex(next.dom) : this.contentDOM.childNodes.length };
    }
  }
  // Used to find a DOM range in a single parent for a given changed
  // range.
  parseRange(from2, to, base2 = 0) {
    if (this.children.length == 0)
      return { node: this.contentDOM, from: from2, to, fromOffset: 0, toOffset: this.contentDOM.childNodes.length };
    let fromOffset = -1, toOffset = -1;
    for (let offset = base2, i2 = 0; ; i2++) {
      let child = this.children[i2], end = offset + child.size;
      if (fromOffset == -1 && from2 <= end) {
        let childBase = offset + child.border;
        if (from2 >= childBase && to <= end - child.border && child.node && child.contentDOM && this.contentDOM.contains(child.contentDOM))
          return child.parseRange(from2, to, childBase);
        from2 = offset;
        for (let j = i2; j > 0; j--) {
          let prev = this.children[j - 1];
          if (prev.size && prev.dom.parentNode == this.contentDOM && !prev.emptyChildAt(1)) {
            fromOffset = domIndex(prev.dom) + 1;
            break;
          }
          from2 -= prev.size;
        }
        if (fromOffset == -1)
          fromOffset = 0;
      }
      if (fromOffset > -1 && (end > to || i2 == this.children.length - 1)) {
        to = end;
        for (let j = i2 + 1; j < this.children.length; j++) {
          let next = this.children[j];
          if (next.size && next.dom.parentNode == this.contentDOM && !next.emptyChildAt(-1)) {
            toOffset = domIndex(next.dom);
            break;
          }
          to += next.size;
        }
        if (toOffset == -1)
          toOffset = this.contentDOM.childNodes.length;
        break;
      }
      offset = end;
    }
    return { node: this.contentDOM, from: from2, to, fromOffset, toOffset };
  }
  emptyChildAt(side) {
    if (this.border || !this.contentDOM || !this.children.length)
      return false;
    let child = this.children[side < 0 ? 0 : this.children.length - 1];
    return child.size == 0 || child.emptyChildAt(side);
  }
  domAfterPos(pos) {
    let { node, offset } = this.domFromPos(pos, 0);
    if (!isElt(node) || offset == node.childNodes.length)
      throw new RangeError("No node after pos " + pos);
    return node.childNodes[offset];
  }
  // View descs are responsible for setting any selection that falls
  // entirely inside of them, so that custom implementations can do
  // custom things with the selection. Note that this falls apart when
  // a selection starts in such a node and ends in another, in which
  // case we just use whatever domFromPos produces as a best effort.
  setSelection(anchor, head, view, force = false) {
    let from2 = Math.min(anchor, head), to = Math.max(anchor, head);
    for (let i2 = 0, offset = 0; i2 < this.children.length; i2++) {
      let child = this.children[i2], end = offset + child.size;
      if (from2 > offset && to < end)
        return child.setSelection(anchor - offset - child.border, head - offset - child.border, view, force);
      offset = end;
    }
    let anchorDOM = this.domFromPos(anchor, anchor ? -1 : 1);
    let headDOM = head == anchor ? anchorDOM : this.domFromPos(head, head ? -1 : 1);
    let domSel = view.root.getSelection();
    let selRange = view.domSelectionRange();
    let brKludge = false;
    if ((gecko || safari) && anchor == head) {
      let { node, offset } = anchorDOM;
      if (isText(node)) {
        brKludge = !!(offset && node.nodeValue[offset - 1] == "\n");
        if (brKludge && offset == node.nodeValue.length) {
          for (let scan = node, after; scan; scan = scan.parentNode) {
            if (after = scan.nextSibling) {
              if (after.nodeName == "BR")
                anchorDOM = headDOM = { node: after.parentNode, offset: domIndex(after) + 1 };
              break;
            }
            let desc = scan.pmViewDesc;
            if (desc && desc.node && desc.node.isBlock)
              break;
          }
        }
      } else {
        let prev = node.childNodes[offset - 1];
        brKludge = prev && (prev.nodeName == "BR" || prev.contentEditable == "false");
      }
    }
    if (gecko && selRange.focusNode && selRange.focusNode != headDOM.node && isElt(selRange.focusNode)) {
      let after = selRange.focusNode.childNodes[selRange.focusOffset];
      if (after && after.contentEditable == "false")
        force = true;
    }
    if (!(force || brKludge && safari) && isEquivalentPosition(anchorDOM.node, anchorDOM.offset, selRange.anchorNode, selRange.anchorOffset) && isEquivalentPosition(headDOM.node, headDOM.offset, selRange.focusNode, selRange.focusOffset))
      return;
    let domSelExtended = false;
    if ((domSel.extend || anchor == head) && !(brKludge && gecko)) {
      domSel.collapse(anchorDOM.node, anchorDOM.offset);
      try {
        if (anchor != head)
          domSel.extend(headDOM.node, headDOM.offset);
        domSelExtended = true;
      } catch (_) {
      }
    }
    if (!domSelExtended) {
      if (anchor > head) {
        let tmp = anchorDOM;
        anchorDOM = headDOM;
        headDOM = tmp;
      }
      let range = document.createRange();
      range.setEnd(headDOM.node, headDOM.offset);
      range.setStart(anchorDOM.node, anchorDOM.offset);
      domSel.removeAllRanges();
      domSel.addRange(range);
    }
  }
  ignoreMutation(mutation) {
    return !this.contentDOM && mutation.type != "selection";
  }
  get contentLost() {
    return this.contentDOM && this.contentDOM != this.dom && !this.dom.contains(this.contentDOM);
  }
  // Remove a subtree of the element tree that has been touched
  // by a DOM change, so that the next update will redraw it.
  markDirty(from2, to) {
    for (let offset = 0, i2 = 0; i2 < this.children.length; i2++) {
      let child = this.children[i2], end = offset + child.size;
      if (offset == end ? from2 <= end && to >= offset : from2 < end && to > offset) {
        let startInside = offset + child.border, endInside = end - child.border;
        if (from2 >= startInside && to <= endInside) {
          this.dirty = from2 == offset || to == end ? CONTENT_DIRTY : CHILD_DIRTY;
          if (from2 == startInside && to == endInside && (child.contentLost || child.dom.parentNode != this.contentDOM))
            child.dirty = NODE_DIRTY;
          else
            child.markDirty(from2 - startInside, to - startInside);
          return;
        } else {
          child.dirty = child.dom == child.contentDOM && child.dom.parentNode == this.contentDOM && !child.children.length ? CONTENT_DIRTY : NODE_DIRTY;
        }
      }
      offset = end;
    }
    this.dirty = CONTENT_DIRTY;
  }
  markParentsDirty() {
    let level = 1;
    for (let node = this.parent; node; node = node.parent, level++) {
      let dirty = level == 1 ? CONTENT_DIRTY : CHILD_DIRTY;
      if (node.dirty < dirty)
        node.dirty = dirty;
    }
  }
  get domAtom() {
    return false;
  }
  get ignoreForCoords() {
    return false;
  }
  get ignoreForSelection() {
    return false;
  }
  isText(text) {
    return false;
  }
};
var WidgetViewDesc = class extends ViewDesc {
  constructor(parent, widget, view, pos) {
    let self, dom = widget.type.toDOM;
    if (typeof dom == "function")
      dom = dom(view, () => {
        if (!self)
          return pos;
        if (self.parent)
          return self.parent.posBeforeChild(self);
      });
    if (!widget.type.spec.raw) {
      let elt = isElt(dom) ? dom : document.createElement("span");
      if (elt != dom)
        elt.appendChild(dom);
      if (!elt.hasAttribute("contenteditable"))
        elt.contentEditable = "false";
      elt.classList.add("ProseMirror-widget");
    }
    super(parent, [], dom, null);
    this.widget = widget;
    this.widget = widget;
    self = this;
  }
  matchesWidget(widget) {
    return this.dirty == NOT_DIRTY && widget.type.eq(this.widget.type);
  }
  parseRule() {
    return { ignore: true };
  }
  stopEvent(event) {
    let stop = this.widget.spec.stopEvent;
    return stop ? stop(event) : false;
  }
  ignoreMutation(mutation) {
    return mutation.type != "selection" || this.widget.spec.ignoreSelection;
  }
  destroy() {
    this.widget.type.destroy(this.dom);
    super.destroy();
  }
  get domAtom() {
    return true;
  }
  get ignoreForSelection() {
    return !!this.widget.type.spec.relaxedSide;
  }
  get side() {
    return this.widget.type.side;
  }
};
var CompositionViewDesc = class extends ViewDesc {
  constructor(parent, dom, textDOM, text) {
    super(parent, [], dom, null);
    this.textDOM = textDOM;
    this.text = text;
  }
  get size() {
    return this.text.length;
  }
  localPosFromDOM(dom, offset) {
    if (dom != this.textDOM)
      return this.posAtStart + (offset ? this.size : 0);
    return this.posAtStart + offset;
  }
  domFromPos(pos) {
    return { node: this.textDOM, offset: pos };
  }
  ignoreMutation(mut) {
    return mut.type === "characterData" && mut.target.nodeValue == mut.oldValue;
  }
};
var MarkViewDesc = class _MarkViewDesc extends ViewDesc {
  constructor(parent, mark, dom, contentDOM, spec) {
    super(parent, [], dom, contentDOM);
    this.mark = mark;
    this.spec = spec;
  }
  static create(parent, mark, inline, view) {
    let custom = view.nodeViews[mark.type.name];
    let spec = custom && custom(mark, view, inline);
    if (!spec || !spec.dom)
      spec = DOMSerializer.renderSpec(document, mark.type.spec.toDOM(mark, inline), null, mark.attrs);
    return new _MarkViewDesc(parent, mark, spec.dom, spec.contentDOM || spec.dom, spec);
  }
  parseRule() {
    if (this.dirty & NODE_DIRTY || this.mark.type.spec.reparseInView)
      return null;
    return { mark: this.mark.type.name, attrs: this.mark.attrs, contentElement: this.contentDOM };
  }
  matchesMark(mark) {
    return this.dirty != NODE_DIRTY && this.mark.eq(mark);
  }
  markDirty(from2, to) {
    super.markDirty(from2, to);
    if (this.dirty != NOT_DIRTY) {
      let parent = this.parent;
      while (!parent.node)
        parent = parent.parent;
      if (parent.dirty < this.dirty)
        parent.dirty = this.dirty;
      this.dirty = NOT_DIRTY;
    }
  }
  slice(from2, to, view) {
    let copy2 = _MarkViewDesc.create(this.parent, this.mark, true, view);
    let nodes = this.children, size = this.size;
    if (to < size)
      nodes = replaceNodes(nodes, to, size, view);
    if (from2 > 0)
      nodes = replaceNodes(nodes, 0, from2, view);
    for (let i2 = 0; i2 < nodes.length; i2++)
      nodes[i2].parent = copy2;
    copy2.children = nodes;
    return copy2;
  }
  ignoreMutation(mutation) {
    return this.spec.ignoreMutation ? this.spec.ignoreMutation(mutation) : super.ignoreMutation(mutation);
  }
  destroy() {
    if (this.spec.destroy)
      this.spec.destroy();
    super.destroy();
  }
};
var NodeViewDesc = class _NodeViewDesc extends ViewDesc {
  constructor(parent, node, outerDeco, innerDeco, dom, contentDOM, nodeDOM) {
    super(parent, [], dom, contentDOM);
    this.node = node;
    this.outerDeco = outerDeco;
    this.innerDeco = innerDeco;
    this.nodeDOM = nodeDOM;
  }
  // By default, a node is rendered using the `toDOM` method from the
  // node type spec. But client code can use the `nodeViews` spec to
  // supply a custom node view, which can influence various aspects of
  // the way the node works.
  //
  // (Using subclassing for this was intentionally decided against,
  // since it'd require exposing a whole slew of finicky
  // implementation details to the user code that they probably will
  // never need.)
  static create(parent, node, outerDeco, innerDeco, view, pos) {
    let custom = view.nodeViews[node.type.name], descObj;
    let spec = custom && custom(node, view, () => {
      if (!descObj)
        return pos;
      if (descObj.parent)
        return descObj.parent.posBeforeChild(descObj);
    }, outerDeco, innerDeco);
    let dom = spec && spec.dom, contentDOM = spec && spec.contentDOM;
    if (node.isText) {
      if (!dom)
        dom = document.createTextNode(node.text);
      else if (!isText(dom))
        throw new RangeError("Text must be rendered as a DOM text node");
    } else if (!dom) {
      let spec2 = DOMSerializer.renderSpec(document, node.type.spec.toDOM(node), null, node.attrs);
      ({ dom, contentDOM } = spec2);
    }
    if (!contentDOM && !node.isText && dom.nodeName != "BR") {
      if (!dom.hasAttribute("contenteditable"))
        dom.contentEditable = "false";
      if (node.type.spec.draggable)
        dom.draggable = true;
    }
    let nodeDOM = dom;
    dom = applyOuterDeco(dom, outerDeco, node);
    if (spec)
      return descObj = new CustomNodeViewDesc(parent, node, outerDeco, innerDeco, dom, contentDOM || null, nodeDOM, spec);
    else if (node.isText)
      return new TextViewDesc(parent, node, outerDeco, innerDeco, dom, nodeDOM);
    else
      return new _NodeViewDesc(parent, node, outerDeco, innerDeco, dom, contentDOM || null, nodeDOM);
  }
  parseRule(addedNodes) {
    if (this.node.type.spec.reparseInView)
      return null;
    let rule = { node: this.node.type.name, attrs: this.node.attrs };
    if (this.node.type.whitespace == "pre")
      rule.preserveWhitespace = "full";
    if (!this.contentDOM) {
      rule.getContent = () => this.node.content;
    } else if (!this.contentLost) {
      rule.contentElement = this.contentDOM;
    } else {
      for (let i2 = this.children.length - 1; i2 >= 0; i2--) {
        let child = this.children[i2];
        if (this.dom.contains(child.dom.parentNode)) {
          rule.contentElement = child.dom.parentNode;
          break;
        }
      }
      if (!rule.contentElement) {
        let found2 = addedNodes && addedNodes.find((n) => isElt(n) && addedNodes.indexOf(n.parentNode) < 0 && this.dom.contains(n));
        if (found2)
          rule.contentElement = found2;
        else
          rule.getContent = () => Fragment2.empty;
      }
    }
    return rule;
  }
  matchesNode(node, outerDeco, innerDeco) {
    return this.dirty == NOT_DIRTY && node.eq(this.node) && sameOuterDeco(outerDeco, this.outerDeco) && innerDeco.eq(this.innerDeco);
  }
  get size() {
    return this.node.nodeSize;
  }
  get border() {
    return this.node.isLeaf ? 0 : 1;
  }
  // Syncs `this.children` to match `this.node.content` and the local
  // decorations, possibly introducing nesting for marks. Then, in a
  // separate step, syncs the DOM inside `this.contentDOM` to
  // `this.children`.
  updateChildren(view, pos) {
    let inline = this.node.inlineContent, off = pos;
    let composition = view.composing ? this.localCompositionInfo(view, pos) : null;
    let localComposition = composition && composition.pos > -1 ? composition : null;
    let compositionInChild = composition && composition.pos < 0;
    let updater = new ViewTreeUpdater(this, localComposition && localComposition.node, view);
    let addBuffers = this.node.inlineContent, atBufferPos = addBuffers && this.node.isBlock;
    iterDeco(this.node, this.innerDeco, (widget, i2, insideNode) => {
      if (widget.spec.marks)
        updater.syncToMarks(widget.spec.marks, inline, view, i2);
      else if (widget.type.side >= 0 && !insideNode)
        updater.syncToMarks(i2 == this.node.childCount ? Mark.none : this.node.child(i2).marks, inline, view, i2);
      updater.placeWidget(widget, view, off);
    }, (child, outerDeco, innerDeco, i2) => {
      updater.syncToMarks(child.marks, inline, view, i2);
      if (atBufferPos && child.isAtom && !child.isText)
        updater.addHackNode("IMG", updater.top);
      let compIndex;
      if (updater.findNodeMatch(child, outerDeco, innerDeco, i2)) ;
      else if (compositionInChild && view.state.selection.from > off && view.state.selection.to < off + child.nodeSize && (compIndex = updater.findIndexWithChild(composition.node)) > -1 && updater.updateNodeAt(child, outerDeco, innerDeco, compIndex, view)) ;
      else if (updater.updateNextNode(child, outerDeco, innerDeco, view, i2, off)) ;
      else {
        updater.addNode(child, outerDeco, innerDeco, view, off);
      }
      off += child.nodeSize;
      if (addBuffers)
        atBufferPos = child.isAtom && !child.isText;
    });
    updater.syncToMarks([], inline, view, 0);
    if (this.node.isTextblock)
      updater.addTextblockHacks();
    updater.destroyRest();
    if (updater.changed || this.dirty == CONTENT_DIRTY) {
      if (localComposition)
        this.protectLocalComposition(view, localComposition);
      renderDescs(this.contentDOM, this.children, view);
      if (ios)
        iosHacks(this.dom);
    }
  }
  localCompositionInfo(view, pos) {
    let { from: from2, to } = view.state.selection;
    if (!(view.state.selection instanceof TextSelection) || from2 < pos || to > pos + this.node.content.size)
      return null;
    let textNode = view.input.compositionNode;
    if (!textNode || !this.dom.contains(textNode.parentNode))
      return null;
    if (this.node.inlineContent) {
      let text = textNode.nodeValue;
      let textPos = findTextInFragment(this.node.content, text, from2 - pos, to - pos);
      return textPos < 0 ? null : { node: textNode, pos: textPos, text };
    } else {
      return { node: textNode, pos: -1, text: "" };
    }
  }
  protectLocalComposition(view, { node, pos, text }) {
    if (this.getDesc(node))
      return;
    let topNode = node;
    for (; ; topNode = topNode.parentNode) {
      if (topNode.parentNode == this.contentDOM)
        break;
      while (topNode.previousSibling)
        topNode.parentNode.removeChild(topNode.previousSibling);
      while (topNode.nextSibling)
        topNode.parentNode.removeChild(topNode.nextSibling);
      if (topNode.pmViewDesc)
        topNode.pmViewDesc = void 0;
    }
    let desc = new CompositionViewDesc(this, topNode, node, text);
    view.input.compositionNodes.push(desc);
    this.children = replaceNodes(this.children, pos, pos + text.length, view, desc);
  }
  // If this desc must be updated to match the given node decoration,
  // do so and return true.
  update(node, outerDeco, innerDeco, view) {
    if (this.dirty == NODE_DIRTY || !node.sameMarkup(this.node))
      return false;
    this.updateInner(node, outerDeco, innerDeco, view);
    return true;
  }
  updateInner(node, outerDeco, innerDeco, view) {
    this.updateOuterDeco(outerDeco);
    this.node = node;
    this.innerDeco = innerDeco;
    if (this.contentDOM)
      this.updateChildren(view, this.posAtStart);
    this.dirty = NOT_DIRTY;
  }
  updateOuterDeco(outerDeco) {
    if (sameOuterDeco(outerDeco, this.outerDeco))
      return;
    let needsWrap = !isElt(this.nodeDOM);
    let oldDOM = this.dom;
    this.dom = patchOuterDeco(this.dom, this.nodeDOM, computeOuterDeco(this.outerDeco, this.node, needsWrap), computeOuterDeco(outerDeco, this.node, needsWrap));
    if (this.dom != oldDOM) {
      oldDOM.pmViewDesc = void 0;
      this.dom.pmViewDesc = this;
    }
    this.outerDeco = outerDeco;
  }
  // Mark this node as being the selected node.
  selectNode() {
    if (isElt(this.nodeDOM)) {
      this.nodeDOM.classList.add("ProseMirror-selectednode");
      if (this.contentDOM || !this.node.type.spec.draggable)
        this.nodeDOM.draggable = true;
    }
  }
  // Remove selected node marking from this node.
  deselectNode() {
    if (isElt(this.nodeDOM)) {
      this.nodeDOM.classList.remove("ProseMirror-selectednode");
      if (this.contentDOM || !this.node.type.spec.draggable)
        this.nodeDOM.removeAttribute("draggable");
    }
  }
  get domAtom() {
    return this.node.isAtom;
  }
};
function docViewDesc(doc3, outerDeco, innerDeco, dom, view) {
  applyOuterDeco(dom, outerDeco, doc3);
  let docView = new NodeViewDesc(void 0, doc3, outerDeco, innerDeco, dom, dom, dom);
  if (docView.contentDOM)
    docView.updateChildren(view, 0);
  return docView;
}
var TextViewDesc = class _TextViewDesc extends NodeViewDesc {
  constructor(parent, node, outerDeco, innerDeco, dom, nodeDOM) {
    super(parent, node, outerDeco, innerDeco, dom, null, nodeDOM);
  }
  parseRule() {
    let skip = this.nodeDOM.parentNode;
    while (skip && skip != this.dom && !skip.pmIsDeco)
      skip = skip.parentNode;
    return { skip: skip || true };
  }
  update(node, outerDeco, innerDeco, view) {
    if (this.dirty == NODE_DIRTY || this.dirty != NOT_DIRTY && !this.inParent() || !node.sameMarkup(this.node))
      return false;
    this.updateOuterDeco(outerDeco);
    if ((this.dirty != NOT_DIRTY || node.text != this.node.text) && node.text != this.nodeDOM.nodeValue) {
      this.nodeDOM.nodeValue = node.text;
      if (view.trackWrites == this.nodeDOM)
        view.trackWrites = null;
    }
    this.node = node;
    this.dirty = NOT_DIRTY;
    return true;
  }
  inParent() {
    let parentDOM = this.parent.contentDOM;
    for (let n = this.nodeDOM; n; n = n.parentNode)
      if (n == parentDOM)
        return true;
    return false;
  }
  domFromPos(pos) {
    return { node: this.nodeDOM, offset: pos };
  }
  localPosFromDOM(dom, offset, bias) {
    if (dom == this.nodeDOM)
      return this.posAtStart + Math.min(offset, this.node.text.length);
    return super.localPosFromDOM(dom, offset, bias);
  }
  ignoreMutation(mutation) {
    return mutation.type != "characterData" && mutation.type != "selection";
  }
  slice(from2, to, _view) {
    let node = this.node.cut(from2, to), dom = document.createTextNode(node.text);
    return new _TextViewDesc(this.parent, node, this.outerDeco, this.innerDeco, dom, dom);
  }
  markDirty(from2, to) {
    super.markDirty(from2, to);
    if (this.dom != this.nodeDOM && (from2 == 0 || to == this.nodeDOM.nodeValue.length))
      this.dirty = NODE_DIRTY;
  }
  get domAtom() {
    return false;
  }
  isText(text) {
    return this.node.text == text;
  }
};
var BufferHackViewDesc = class extends ViewDesc {
  parseRule() {
    return { ignore: true };
  }
  matchesHack(nodeName) {
    return this.dirty == NOT_DIRTY && this.dom.nodeName == nodeName;
  }
  get domAtom() {
    return true;
  }
  get ignoreForCoords() {
    return this.dom.nodeName == "IMG";
  }
};
var CustomNodeViewDesc = class extends NodeViewDesc {
  constructor(parent, node, outerDeco, innerDeco, dom, contentDOM, nodeDOM, spec) {
    super(parent, node, outerDeco, innerDeco, dom, contentDOM, nodeDOM);
    this.spec = spec;
  }
  // A custom `update` method gets to decide whether the update goes
  // through. If it does, and there's a `contentDOM` node, our logic
  // updates the children.
  update(node, outerDeco, innerDeco, view) {
    if (this.dirty == NODE_DIRTY)
      return false;
    if (this.spec.update && (this.node.type == node.type || this.spec.multiType)) {
      let result = this.spec.update(node, outerDeco, innerDeco);
      if (result)
        this.updateInner(node, outerDeco, innerDeco, view);
      return result;
    } else if (!this.contentDOM && !node.isLeaf) {
      return false;
    } else {
      return super.update(node, outerDeco, innerDeco, view);
    }
  }
  selectNode() {
    this.spec.selectNode ? this.spec.selectNode() : super.selectNode();
  }
  deselectNode() {
    this.spec.deselectNode ? this.spec.deselectNode() : super.deselectNode();
  }
  setSelection(anchor, head, view, force) {
    this.spec.setSelection ? this.spec.setSelection(anchor, head, view.root) : super.setSelection(anchor, head, view, force);
  }
  destroy() {
    if (this.spec.destroy)
      this.spec.destroy();
    super.destroy();
  }
  stopEvent(event) {
    return this.spec.stopEvent ? this.spec.stopEvent(event) : false;
  }
  ignoreMutation(mutation) {
    return this.spec.ignoreMutation ? this.spec.ignoreMutation(mutation) : super.ignoreMutation(mutation);
  }
};
function renderDescs(parentDOM, descs, view) {
  let dom = parentDOM.firstChild, written = false;
  for (let i2 = 0; i2 < descs.length; i2++) {
    let desc = descs[i2], childDOM = desc.dom;
    if (childDOM.parentNode == parentDOM) {
      while (childDOM != dom) {
        dom = rm(dom);
        written = true;
      }
      dom = dom.nextSibling;
    } else {
      written = true;
      parentDOM.insertBefore(childDOM, dom);
    }
    if (desc instanceof MarkViewDesc) {
      let pos = dom ? dom.previousSibling : parentDOM.lastChild;
      renderDescs(desc.contentDOM, desc.children, view);
      dom = pos ? pos.nextSibling : parentDOM.firstChild;
    }
  }
  while (dom) {
    dom = rm(dom);
    written = true;
  }
  if (written && view.trackWrites == parentDOM)
    view.trackWrites = null;
}
var OuterDecoLevel = function(nodeName) {
  if (nodeName)
    this.nodeName = nodeName;
};
OuterDecoLevel.prototype = /* @__PURE__ */ Object.create(null);
var noDeco = [new OuterDecoLevel()];
function computeOuterDeco(outerDeco, node, needsWrap) {
  if (outerDeco.length == 0)
    return noDeco;
  let top = needsWrap ? noDeco[0] : new OuterDecoLevel(), result = [top];
  for (let i2 = 0; i2 < outerDeco.length; i2++) {
    let attrs = outerDeco[i2].type.attrs;
    if (!attrs)
      continue;
    if (attrs.nodeName)
      result.push(top = new OuterDecoLevel(attrs.nodeName));
    for (let name2 in attrs) {
      let val = attrs[name2];
      if (val == null)
        continue;
      if (needsWrap && result.length == 1)
        result.push(top = new OuterDecoLevel(node.isInline ? "span" : "div"));
      if (name2 == "class")
        top.class = (top.class ? top.class + " " : "") + val;
      else if (name2 == "style")
        top.style = (top.style ? top.style + ";" : "") + val;
      else if (name2 != "nodeName")
        top[name2] = val;
    }
  }
  return result;
}
function patchOuterDeco(outerDOM, nodeDOM, prevComputed, curComputed) {
  if (prevComputed == noDeco && curComputed == noDeco)
    return nodeDOM;
  let curDOM = nodeDOM;
  for (let i2 = 0; i2 < curComputed.length; i2++) {
    let deco = curComputed[i2], prev = prevComputed[i2];
    if (i2) {
      let parent;
      if (prev && prev.nodeName == deco.nodeName && curDOM != outerDOM && (parent = curDOM.parentNode) && parent.nodeName.toLowerCase() == deco.nodeName) {
        curDOM = parent;
      } else {
        parent = document.createElement(deco.nodeName);
        parent.pmIsDeco = true;
        parent.appendChild(curDOM);
        prev = noDeco[0];
        curDOM = parent;
      }
    }
    patchAttributes(curDOM, prev || noDeco[0], deco);
  }
  return curDOM;
}
function patchAttributes(dom, prev, cur) {
  for (let name2 in prev)
    if (name2 != "class" && name2 != "style" && name2 != "nodeName" && !(name2 in cur))
      dom.removeAttribute(name2);
  for (let name2 in cur)
    if (name2 != "class" && name2 != "style" && name2 != "nodeName" && cur[name2] != prev[name2])
      dom.setAttribute(name2, cur[name2]);
  if (prev.class != cur.class) {
    let prevList = prev.class ? prev.class.split(" ").filter(Boolean) : [];
    let curList = cur.class ? cur.class.split(" ").filter(Boolean) : [];
    for (let i2 = 0; i2 < prevList.length; i2++)
      if (curList.indexOf(prevList[i2]) == -1)
        dom.classList.remove(prevList[i2]);
    for (let i2 = 0; i2 < curList.length; i2++)
      if (prevList.indexOf(curList[i2]) == -1)
        dom.classList.add(curList[i2]);
    if (dom.classList.length == 0)
      dom.removeAttribute("class");
  }
  if (prev.style != cur.style) {
    if (prev.style) {
      let prop = /\s*([\w\-\xa1-\uffff]+)\s*:(?:"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|\(.*?\)|[^;])*/g, m;
      while (m = prop.exec(prev.style))
        dom.style.removeProperty(m[1]);
    }
    if (cur.style)
      dom.style.cssText += cur.style;
  }
}
function applyOuterDeco(dom, deco, node) {
  return patchOuterDeco(dom, dom, noDeco, computeOuterDeco(deco, node, !isElt(dom)));
}
function sameOuterDeco(a, b) {
  if (a.length != b.length)
    return false;
  for (let i2 = 0; i2 < a.length; i2++)
    if (!a[i2].type.eq(b[i2].type))
      return false;
  return true;
}
function rm(dom) {
  let next = dom.nextSibling;
  dom.parentNode.removeChild(dom);
  return next;
}
var ViewTreeUpdater = class {
  constructor(top, lock, view) {
    this.lock = lock;
    this.view = view;
    this.index = 0;
    this.stack = [];
    this.changed = false;
    this.top = top;
    this.preMatch = preMatch(top.node.content, top);
  }
  // Destroy and remove the children between the given indices in
  // `this.top`.
  destroyBetween(start, end) {
    if (start == end)
      return;
    for (let i2 = start; i2 < end; i2++)
      this.top.children[i2].destroy();
    this.top.children.splice(start, end - start);
    this.changed = true;
  }
  // Destroy all remaining children in `this.top`.
  destroyRest() {
    this.destroyBetween(this.index, this.top.children.length);
  }
  // Sync the current stack of mark descs with the given array of
  // marks, reusing existing mark descs when possible.
  syncToMarks(marks, inline, view, parentIndex) {
    let keep = 0, depth = this.stack.length >> 1;
    let maxKeep = Math.min(depth, marks.length);
    while (keep < maxKeep && (keep == depth - 1 ? this.top : this.stack[keep + 1 << 1]).matchesMark(marks[keep]) && marks[keep].type.spec.spanning !== false)
      keep++;
    while (keep < depth) {
      this.destroyRest();
      this.top.dirty = NOT_DIRTY;
      this.index = this.stack.pop();
      this.top = this.stack.pop();
      depth--;
    }
    while (depth < marks.length) {
      this.stack.push(this.top, this.index + 1);
      let found2 = -1, scanTo = this.top.children.length;
      if (parentIndex < this.preMatch.index)
        scanTo = Math.min(this.index + 3, scanTo);
      for (let i2 = this.index; i2 < scanTo; i2++) {
        let next = this.top.children[i2];
        if (next.matchesMark(marks[depth]) && !this.isLocked(next.dom)) {
          found2 = i2;
          break;
        }
      }
      if (found2 < 0 && this.index < this.top.children.length) {
        let cur = this.top.children[this.index];
        if (cur instanceof MarkViewDesc && cur.dirty != NODE_DIRTY && cur.mark.type == marks[depth].type && cur.spec.update && !this.isLocked(cur.dom) && cur.spec.update(marks[depth])) {
          cur.mark = marks[depth];
          found2 = this.index;
          this.changed = true;
        }
      }
      if (found2 > -1) {
        if (found2 > this.index) {
          this.changed = true;
          this.destroyBetween(this.index, found2);
        }
        this.top = this.top.children[this.index];
      } else {
        let markDesc = MarkViewDesc.create(this.top, marks[depth], inline, view);
        this.top.children.splice(this.index, 0, markDesc);
        this.top = markDesc;
        this.changed = true;
      }
      this.index = 0;
      depth++;
    }
  }
  // Try to find a node desc matching the given data. Skip over it and
  // return true when successful.
  findNodeMatch(node, outerDeco, innerDeco, index) {
    let found2 = -1, targetDesc;
    if (index >= this.preMatch.index && (targetDesc = this.preMatch.matches[index - this.preMatch.index]).parent == this.top && targetDesc.matchesNode(node, outerDeco, innerDeco)) {
      found2 = this.top.children.indexOf(targetDesc, this.index);
    } else {
      for (let i2 = this.index, e = Math.min(this.top.children.length, i2 + 5); i2 < e; i2++) {
        let child = this.top.children[i2];
        if (child.matchesNode(node, outerDeco, innerDeco) && !this.preMatch.matched.has(child)) {
          found2 = i2;
          break;
        }
      }
    }
    if (found2 < 0)
      return false;
    this.destroyBetween(this.index, found2);
    this.index++;
    return true;
  }
  updateNodeAt(node, outerDeco, innerDeco, index, view) {
    let child = this.top.children[index];
    if (child.dirty == NODE_DIRTY && child.dom == child.contentDOM)
      child.dirty = CONTENT_DIRTY;
    if (!child.update(node, outerDeco, innerDeco, view))
      return false;
    this.destroyBetween(this.index, index);
    this.index++;
    return true;
  }
  findIndexWithChild(domNode) {
    for (; ; ) {
      let parent = domNode.parentNode;
      if (!parent)
        return -1;
      if (parent == this.top.contentDOM) {
        let desc = domNode.pmViewDesc;
        if (desc)
          for (let i2 = this.index; i2 < this.top.children.length; i2++) {
            if (this.top.children[i2] == desc)
              return i2;
          }
        return -1;
      }
      domNode = parent;
    }
  }
  // Try to update the next node, if any, to the given data. Checks
  // pre-matches to avoid overwriting nodes that could still be used.
  updateNextNode(node, outerDeco, innerDeco, view, index, pos) {
    for (let i2 = this.index; i2 < this.top.children.length; i2++) {
      let next = this.top.children[i2];
      if (next instanceof NodeViewDesc) {
        let preMatch2 = this.preMatch.matched.get(next);
        if (preMatch2 != null && preMatch2 != index)
          return false;
        let nextDOM = next.dom, updated;
        let locked = this.isLocked(nextDOM) && !(node.isText && next.node && next.node.isText && next.nodeDOM.nodeValue == node.text && next.dirty != NODE_DIRTY && sameOuterDeco(outerDeco, next.outerDeco));
        if (!locked && next.update(node, outerDeco, innerDeco, view)) {
          this.destroyBetween(this.index, i2);
          if (next.dom != nextDOM)
            this.changed = true;
          this.index++;
          return true;
        } else if (!locked && (updated = this.recreateWrapper(next, node, outerDeco, innerDeco, view, pos))) {
          this.destroyBetween(this.index, i2);
          this.top.children[this.index] = updated;
          if (updated.contentDOM) {
            updated.dirty = CONTENT_DIRTY;
            updated.updateChildren(view, pos + 1);
            updated.dirty = NOT_DIRTY;
          }
          this.changed = true;
          this.index++;
          return true;
        }
        break;
      }
    }
    return false;
  }
  // When a node with content is replaced by a different node with
  // identical content, move over its children.
  recreateWrapper(next, node, outerDeco, innerDeco, view, pos) {
    if (next.dirty || node.isAtom || !next.children.length || !next.node.content.eq(node.content) || !sameOuterDeco(outerDeco, next.outerDeco) || !innerDeco.eq(next.innerDeco))
      return null;
    let wrapper = NodeViewDesc.create(this.top, node, outerDeco, innerDeco, view, pos);
    if (wrapper.contentDOM) {
      wrapper.children = next.children;
      next.children = [];
      for (let ch of wrapper.children)
        ch.parent = wrapper;
    }
    next.destroy();
    return wrapper;
  }
  // Insert the node as a newly created node desc.
  addNode(node, outerDeco, innerDeco, view, pos) {
    let desc = NodeViewDesc.create(this.top, node, outerDeco, innerDeco, view, pos);
    if (desc.contentDOM)
      desc.updateChildren(view, pos + 1);
    this.top.children.splice(this.index++, 0, desc);
    this.changed = true;
  }
  placeWidget(widget, view, pos) {
    let next = this.index < this.top.children.length ? this.top.children[this.index] : null;
    if (next && next.matchesWidget(widget) && (widget == next.widget || !next.widget.type.toDOM.parentNode)) {
      this.index++;
    } else {
      let desc = new WidgetViewDesc(this.top, widget, view, pos);
      this.top.children.splice(this.index++, 0, desc);
      this.changed = true;
    }
  }
  // Make sure a textblock looks and behaves correctly in
  // contentEditable.
  addTextblockHacks() {
    let lastChild = this.top.children[this.index - 1], parent = this.top;
    while (lastChild instanceof MarkViewDesc) {
      parent = lastChild;
      lastChild = parent.children[parent.children.length - 1];
    }
    if (!lastChild || // Empty textblock
    !(lastChild instanceof TextViewDesc) || /\n$/.test(lastChild.node.text) || this.view.requiresGeckoHackNode && /\s$/.test(lastChild.node.text)) {
      if ((safari || chrome) && lastChild && lastChild.dom.contentEditable == "false")
        this.addHackNode("IMG", parent);
      this.addHackNode("BR", this.top);
    }
  }
  addHackNode(nodeName, parent) {
    if (parent == this.top && this.index < parent.children.length && parent.children[this.index].matchesHack(nodeName)) {
      this.index++;
    } else {
      let dom = document.createElement(nodeName);
      if (nodeName == "IMG") {
        dom.className = "ProseMirror-separator";
        dom.alt = "";
      }
      if (nodeName == "BR")
        dom.className = "ProseMirror-trailingBreak";
      let hack = new BufferHackViewDesc(this.top, [], dom, null);
      if (parent != this.top)
        parent.children.push(hack);
      else
        parent.children.splice(this.index++, 0, hack);
      this.changed = true;
    }
  }
  isLocked(node) {
    return this.lock && (node == this.lock || isElt(node) && node.contains(this.lock.parentNode));
  }
};
function preMatch(frag, parentDesc) {
  let curDesc = parentDesc, descI = curDesc.children.length;
  let fI = frag.childCount, matched = /* @__PURE__ */ new Map(), matches2 = [];
  outer: while (fI > 0) {
    let desc;
    for (; ; ) {
      if (descI) {
        let next = curDesc.children[descI - 1];
        if (next instanceof MarkViewDesc) {
          curDesc = next;
          descI = next.children.length;
        } else {
          desc = next;
          descI--;
          break;
        }
      } else if (curDesc == parentDesc) {
        break outer;
      } else {
        descI = curDesc.parent.children.indexOf(curDesc);
        curDesc = curDesc.parent;
      }
    }
    let node = desc.node;
    if (!node)
      continue;
    if (node != frag.child(fI - 1))
      break;
    --fI;
    matched.set(desc, fI);
    matches2.push(desc);
  }
  return { index: fI, matched, matches: matches2.reverse() };
}
function compareSide(a, b) {
  return a.type.side - b.type.side;
}
function iterDeco(parent, deco, onWidget, onNode) {
  let locals = deco.locals(parent), offset = 0;
  if (locals.length == 0) {
    for (let i2 = 0; i2 < parent.childCount; i2++) {
      let child = parent.child(i2);
      onNode(child, locals, deco.forChild(offset, child), i2);
      offset += child.nodeSize;
    }
    return;
  }
  let decoIndex = 0, active = [], restNode = null;
  for (let parentIndex = 0; ; ) {
    let widget, widgets;
    while (decoIndex < locals.length && locals[decoIndex].to == offset) {
      let next = locals[decoIndex++];
      if (next.widget) {
        if (!widget)
          widget = next;
        else
          (widgets || (widgets = [widget])).push(next);
      }
    }
    if (widget) {
      if (widgets) {
        widgets.sort(compareSide);
        for (let i2 = 0; i2 < widgets.length; i2++)
          onWidget(widgets[i2], parentIndex, !!restNode);
      } else {
        onWidget(widget, parentIndex, !!restNode);
      }
    }
    let child, index;
    if (restNode) {
      index = -1;
      child = restNode;
      restNode = null;
    } else if (parentIndex < parent.childCount) {
      index = parentIndex;
      child = parent.child(parentIndex++);
    } else {
      break;
    }
    for (let i2 = 0; i2 < active.length; i2++)
      if (active[i2].to <= offset)
        active.splice(i2--, 1);
    while (decoIndex < locals.length && locals[decoIndex].from <= offset && locals[decoIndex].to > offset)
      active.push(locals[decoIndex++]);
    let end = offset + child.nodeSize;
    if (child.isText) {
      let cutAt = end;
      if (decoIndex < locals.length && locals[decoIndex].from < cutAt)
        cutAt = locals[decoIndex].from;
      for (let i2 = 0; i2 < active.length; i2++)
        if (active[i2].to < cutAt)
          cutAt = active[i2].to;
      if (cutAt < end) {
        restNode = child.cut(cutAt - offset);
        child = child.cut(0, cutAt - offset);
        end = cutAt;
        index = -1;
      }
    } else {
      while (decoIndex < locals.length && locals[decoIndex].to < end)
        decoIndex++;
    }
    let outerDeco = child.isInline && !child.isLeaf ? active.filter((d) => !d.inline) : active.slice();
    onNode(child, outerDeco, deco.forChild(offset, child), index);
    offset = end;
  }
}
function iosHacks(dom) {
  if (dom.nodeName == "UL" || dom.nodeName == "OL") {
    let oldCSS = dom.style.cssText;
    dom.style.cssText = oldCSS + "; list-style: square !important";
    window.getComputedStyle(dom).listStyle;
    dom.style.cssText = oldCSS;
  }
}
function findTextInFragment(frag, text, from2, to) {
  for (let i2 = 0, pos = 0; i2 < frag.childCount && pos <= to; ) {
    let child = frag.child(i2++), childStart = pos;
    pos += child.nodeSize;
    if (!child.isText)
      continue;
    let str = child.text;
    while (i2 < frag.childCount) {
      let next = frag.child(i2++);
      pos += next.nodeSize;
      if (!next.isText)
        break;
      str += next.text;
    }
    if (pos >= from2) {
      if (pos >= to && str.slice(to - text.length - childStart, to - childStart) == text)
        return to - text.length;
      let found2 = childStart < to ? str.lastIndexOf(text, to - childStart - 1) : -1;
      if (found2 >= 0 && found2 + text.length + childStart >= from2)
        return childStart + found2;
      if (from2 == to && str.length >= to + text.length - childStart && str.slice(to - childStart, to - childStart + text.length) == text)
        return to;
    }
  }
  return -1;
}
function replaceNodes(nodes, from2, to, view, replacement) {
  let result = [];
  for (let i2 = 0, off = 0; i2 < nodes.length; i2++) {
    let child = nodes[i2], start = off, end = off += child.size;
    if (start >= to || end <= from2) {
      result.push(child);
    } else {
      if (start < from2)
        result.push(child.slice(0, from2 - start, view));
      if (replacement) {
        result.push(replacement);
        replacement = void 0;
      }
      if (end > to)
        result.push(child.slice(to - start, child.size, view));
    }
  }
  return result;
}
function selectionFromDOM(view, origin = null) {
  let domSel = view.domSelectionRange(), doc3 = view.state.doc;
  if (!domSel.focusNode)
    return null;
  let nearestDesc = view.docView.nearestDesc(domSel.focusNode), inWidget = nearestDesc && nearestDesc.size == 0;
  let head = view.docView.posFromDOM(domSel.focusNode, domSel.focusOffset, 1);
  if (head < 0)
    return null;
  let $head = doc3.resolve(head), anchor, selection;
  if (selectionCollapsed(domSel)) {
    anchor = head;
    while (nearestDesc && !nearestDesc.node)
      nearestDesc = nearestDesc.parent;
    if (nearestDesc && nearestDesc.node.isAtom && NodeSelection.isSelectable(nearestDesc.node) && nearestDesc.parent && !(nearestDesc.node.isInline && isOnEdge(domSel.focusNode, domSel.focusOffset, nearestDesc.dom))) {
      let pos = nearestDesc.posBefore;
      selection = new NodeSelection(head == pos ? $head : doc3.resolve(pos));
    } else if (gecko && origin == "key" && head > view.state.selection.to && isElt(domSel.focusNode) && domSel.focusOffset == domSel.focusNode.childNodes.length && nearestDesc && nearestDesc.posAtStart > view.state.selection.to) {
      for (let scan = domSel.focusNode; ; scan = scan.parentNode) {
        if (getComputedStyle(scan).overflow != "visible") {
          selection = Selection.findFrom(doc3.resolve(nearestDesc.posAtStart), 1);
          break;
        }
        if (scan == nearestDesc.dom || scan.nextSibling || !scan.parentNode || !isElt(scan.parentNode))
          break;
      }
    }
  } else {
    if (domSel instanceof view.dom.ownerDocument.defaultView.Selection && domSel.rangeCount > 1) {
      let min = head, max = head;
      for (let i2 = 0; i2 < domSel.rangeCount; i2++) {
        let range = domSel.getRangeAt(i2);
        min = Math.min(min, view.docView.posFromDOM(range.startContainer, range.startOffset, 1));
        max = Math.max(max, view.docView.posFromDOM(range.endContainer, range.endOffset, -1));
      }
      if (min < 0)
        return null;
      [anchor, head] = max == view.state.selection.anchor ? [max, min] : [min, max];
      $head = doc3.resolve(head);
    } else {
      anchor = view.docView.posFromDOM(domSel.anchorNode, domSel.anchorOffset, 1);
    }
    if (anchor < 0)
      return null;
  }
  let $anchor = doc3.resolve(anchor);
  if (!selection) {
    let bias = origin == "pointer" || view.state.selection.head < $head.pos && !inWidget ? 1 : -1;
    selection = selectionBetween(view, $anchor, $head, bias);
  }
  return selection;
}
function editorOwnsSelection(view) {
  return view.editable ? view.hasFocus() : hasSelection(view) && document.activeElement && document.activeElement.contains(view.dom);
}
function selectionToDOM(view, force = false) {
  let sel = view.state.selection;
  syncNodeSelection(view, sel);
  if (!editorOwnsSelection(view))
    return;
  let mouseDown = view.input.mouseDown;
  if (!force && chrome && mouseDown) {
    let domSel = view.domSelectionRange(), curSel = view.domObserver.currentSelection;
    if (domSel.anchorNode && curSel.anchorNode && isEquivalentPosition(domSel.anchorNode, domSel.anchorOffset, curSel.anchorNode, curSel.anchorOffset) && mouseDown.delaySelUpdate()) {
      view.domObserver.setCurSelection();
      return;
    }
  }
  view.domObserver.disconnectSelection();
  if (view.cursorWrapper) {
    selectCursorWrapper(view);
  } else {
    let { anchor, head } = sel, resetEditableFrom, resetEditableTo;
    if (brokenSelectBetweenUneditable && !(sel instanceof TextSelection)) {
      if (!sel.$from.parent.inlineContent)
        resetEditableFrom = temporarilyEditableNear(view, sel.from);
      if (!sel.empty && !sel.$from.parent.inlineContent)
        resetEditableTo = temporarilyEditableNear(view, sel.to);
    }
    view.docView.setSelection(anchor, head, view, force);
    if (brokenSelectBetweenUneditable) {
      if (resetEditableFrom)
        resetEditable(resetEditableFrom);
      if (resetEditableTo)
        resetEditable(resetEditableTo);
    }
    if (sel.visible) {
      view.dom.classList.remove("ProseMirror-hideselection");
    } else {
      view.dom.classList.add("ProseMirror-hideselection");
      if ("onselectionchange" in document)
        removeClassOnSelectionChange(view);
    }
  }
  view.domObserver.setCurSelection();
  view.domObserver.connectSelection();
}
var brokenSelectBetweenUneditable = safari || chrome && chrome_version < 63;
function temporarilyEditableNear(view, pos) {
  let { node, offset } = view.docView.domFromPos(pos, 0);
  let after = offset < node.childNodes.length ? node.childNodes[offset] : null;
  let before = offset ? node.childNodes[offset - 1] : null;
  if (safari && after && after.contentEditable == "false")
    return setEditable(after);
  if ((!after || after.contentEditable == "false") && (!before || before.contentEditable == "false")) {
    if (after)
      return setEditable(after);
    else if (before)
      return setEditable(before);
  }
}
function setEditable(element) {
  element.contentEditable = "true";
  if (safari && element.draggable) {
    element.draggable = false;
    element.wasDraggable = true;
  }
  return element;
}
function resetEditable(element) {
  element.contentEditable = "false";
  if (element.wasDraggable) {
    element.draggable = true;
    element.wasDraggable = null;
  }
}
function removeClassOnSelectionChange(view) {
  let doc3 = view.dom.ownerDocument;
  doc3.removeEventListener("selectionchange", view.input.hideSelectionGuard);
  let domSel = view.domSelectionRange();
  let node = domSel.anchorNode, offset = domSel.anchorOffset;
  doc3.addEventListener("selectionchange", view.input.hideSelectionGuard = () => {
    if (domSel.anchorNode != node || domSel.anchorOffset != offset) {
      doc3.removeEventListener("selectionchange", view.input.hideSelectionGuard);
      setTimeout(() => {
        if (!editorOwnsSelection(view) || view.state.selection.visible)
          view.dom.classList.remove("ProseMirror-hideselection");
      }, 20);
    }
  });
}
function selectCursorWrapper(view) {
  let domSel = view.domSelection();
  if (!domSel)
    return;
  let node = view.cursorWrapper.dom, img = node.nodeName == "IMG";
  if (img)
    domSel.collapse(node.parentNode, domIndex(node) + 1);
  else
    domSel.collapse(node, 0);
  if (!img && !view.state.selection.visible && ie && ie_version <= 11) {
    node.disabled = true;
    node.disabled = false;
  }
}
function syncNodeSelection(view, sel) {
  if (sel instanceof NodeSelection) {
    let desc = view.docView.descAt(sel.from);
    if (desc != view.lastSelectedViewDesc) {
      clearNodeSelection(view);
      if (desc)
        desc.selectNode();
      view.lastSelectedViewDesc = desc;
    }
  } else {
    clearNodeSelection(view);
  }
}
function clearNodeSelection(view) {
  if (view.lastSelectedViewDesc) {
    if (view.lastSelectedViewDesc.parent)
      view.lastSelectedViewDesc.deselectNode();
    view.lastSelectedViewDesc = void 0;
  }
}
function selectionBetween(view, $anchor, $head, bias) {
  return view.someProp("createSelectionBetween", (f) => f(view, $anchor, $head)) || TextSelection.between($anchor, $head, bias);
}
function hasFocusAndSelection(view) {
  if (view.editable && !view.hasFocus())
    return false;
  return hasSelection(view);
}
function hasSelection(view) {
  let sel = view.domSelectionRange();
  if (!sel.anchorNode)
    return false;
  try {
    return contains(view.dom, sel.anchorNode) && (view.editable || contains(view.dom, sel.focusNode));
  } catch (_) {
    return false;
  }
}
function anchorInRightPlace(view) {
  let anchorDOM = view.docView.domFromPos(view.state.selection.anchor, 0);
  let domSel = view.domSelectionRange();
  return isEquivalentPosition(anchorDOM.node, anchorDOM.offset, domSel.anchorNode, domSel.anchorOffset);
}
function moveSelectionBlock(state, dir) {
  let { $anchor, $head } = state.selection;
  let $side = dir > 0 ? $anchor.max($head) : $anchor.min($head);
  let $start = !$side.parent.inlineContent ? $side : $side.depth ? state.doc.resolve(dir > 0 ? $side.after() : $side.before()) : null;
  return $start && Selection.findFrom($start, dir);
}
function apply(view, sel) {
  view.dispatch(view.state.tr.setSelection(sel).scrollIntoView());
  return true;
}
function selectHorizontally(view, dir, mods) {
  let sel = view.state.selection;
  if (sel instanceof TextSelection) {
    if (mods.indexOf("s") > -1) {
      let { $head } = sel, node = $head.textOffset ? null : dir < 0 ? $head.nodeBefore : $head.nodeAfter;
      if (!node || node.isText || !node.isLeaf)
        return false;
      let $newHead = view.state.doc.resolve($head.pos + node.nodeSize * (dir < 0 ? -1 : 1));
      return apply(view, new TextSelection(sel.$anchor, $newHead));
    } else if (!sel.empty) {
      return false;
    } else if (view.endOfTextblock(dir > 0 ? "forward" : "backward")) {
      let next = moveSelectionBlock(view.state, dir);
      if (next && next instanceof NodeSelection)
        return apply(view, next);
      return false;
    } else if (!(mac2 && mods.indexOf("m") > -1)) {
      let $head = sel.$head, node = $head.textOffset ? null : dir < 0 ? $head.nodeBefore : $head.nodeAfter, desc;
      if (!node || node.isText)
        return false;
      let nodePos = dir < 0 ? $head.pos - node.nodeSize : $head.pos;
      if (!(node.isAtom || (desc = view.docView.descAt(nodePos)) && !desc.contentDOM))
        return false;
      if (NodeSelection.isSelectable(node)) {
        return apply(view, new NodeSelection(dir < 0 ? view.state.doc.resolve($head.pos - node.nodeSize) : $head));
      } else {
        return apply(view, new TextSelection(view.state.doc.resolve(dir < 0 ? nodePos : nodePos + node.nodeSize)));
      }
    }
  } else if (sel instanceof NodeSelection && sel.node.isInline) {
    return apply(view, new TextSelection(dir > 0 ? sel.$to : sel.$from));
  } else {
    let next = moveSelectionBlock(view.state, dir);
    if (next)
      return apply(view, next);
    return false;
  }
}
function isIgnorable(dom, dir) {
  let desc = dom.pmViewDesc;
  return desc ? desc.size == 0 && (dir < 0 || dom.nextSibling || dom.nodeName != "BR") : isElt(dom) && dom.contentEditable == "false";
}
function skipIgnoredNodes(view, dir) {
  return dir < 0 ? skipIgnoredNodesBefore(view) : skipIgnoredNodesAfter(view);
}
function skipIgnoredNodesBefore(view) {
  let sel = view.domSelectionRange();
  let node = sel.focusNode, offset = sel.focusOffset;
  if (!node)
    return;
  let moveNode, moveOffset, force = false;
  if (gecko && isElt(node) && offset < nodeSize(node) && isIgnorable(node.childNodes[offset], -1))
    force = true;
  for (; ; ) {
    if (offset > 0) {
      if (!isElt(node))
        break;
      let before = node.childNodes[offset - 1];
      if (isIgnorable(before, -1)) {
        moveNode = node;
        moveOffset = --offset;
      } else if (isText(before)) {
        node = before;
        offset = node.nodeValue.length;
      } else {
        break;
      }
    } else if (isBlockNode(node)) {
      break;
    } else {
      let prev = node.previousSibling;
      while (prev && isIgnorable(prev, -1)) {
        moveNode = node.parentNode;
        moveOffset = domIndex(prev);
        prev = prev.previousSibling;
      }
      if (!prev) {
        node = node.parentNode;
        if (node == view.dom)
          break;
        offset = 0;
      } else {
        node = prev;
        offset = nodeSize(node);
      }
    }
  }
  if (force)
    setSelFocus(view, node, offset);
  else if (moveNode)
    setSelFocus(view, moveNode, moveOffset);
}
function skipIgnoredNodesAfter(view) {
  let sel = view.domSelectionRange();
  let node = sel.focusNode, offset = sel.focusOffset;
  if (!node)
    return;
  let len = nodeSize(node);
  let moveNode, moveOffset;
  for (; ; ) {
    if (offset < len) {
      if (!isElt(node))
        break;
      let after = node.childNodes[offset];
      if (isIgnorable(after, 1)) {
        moveNode = node;
        moveOffset = ++offset;
      } else {
        break;
      }
    } else if (isBlockNode(node)) {
      break;
    } else {
      let next = node.nextSibling;
      while (next && isIgnorable(next, 1)) {
        moveNode = next.parentNode;
        moveOffset = domIndex(next) + 1;
        next = next.nextSibling;
      }
      if (!next) {
        node = node.parentNode;
        if (node == view.dom)
          break;
        offset = len = 0;
      } else {
        node = next;
        offset = 0;
        len = nodeSize(node);
      }
    }
  }
  if (moveNode)
    setSelFocus(view, moveNode, moveOffset);
}
function isBlockNode(dom) {
  let desc = dom.pmViewDesc;
  return desc && desc.node && desc.node.isBlock;
}
function textNodeAfter(node, offset) {
  while (node && offset == node.childNodes.length && !hasBlockDesc(node)) {
    offset = domIndex(node) + 1;
    node = node.parentNode;
  }
  while (node && offset < node.childNodes.length) {
    let next = node.childNodes[offset];
    if (isText(next))
      return next;
    if (isElt(next) && next.contentEditable == "false")
      break;
    node = next;
    offset = 0;
  }
}
function textNodeBefore(node, offset) {
  while (node && !offset && !hasBlockDesc(node)) {
    offset = domIndex(node);
    node = node.parentNode;
  }
  while (node && offset) {
    let next = node.childNodes[offset - 1];
    if (isText(next))
      return next;
    if (isElt(next) && next.contentEditable == "false")
      break;
    node = next;
    offset = node.childNodes.length;
  }
}
function setSelFocus(view, node, offset) {
  if (!isText(node)) {
    let before, after;
    if (after = textNodeAfter(node, offset)) {
      node = after;
      offset = 0;
    } else if (before = textNodeBefore(node, offset)) {
      node = before;
      offset = before.nodeValue.length;
    }
  }
  let sel = view.domSelection();
  if (!sel)
    return;
  if (selectionCollapsed(sel)) {
    let range = document.createRange();
    range.setEnd(node, offset);
    range.setStart(node, offset);
    sel.removeAllRanges();
    sel.addRange(range);
  } else if (sel.extend) {
    sel.extend(node, offset);
  }
  view.domObserver.setCurSelection();
  let { state } = view;
  setTimeout(() => {
    if (view.state == state)
      selectionToDOM(view);
  }, 50);
}
function findDirection(view, pos) {
  let $pos = view.state.doc.resolve(pos);
  if (!(chrome || windows) && $pos.parent.inlineContent) {
    let coords = view.coordsAtPos(pos);
    if (pos > $pos.start()) {
      let before = view.coordsAtPos(pos - 1);
      let mid = (before.top + before.bottom) / 2;
      if (mid > coords.top && mid < coords.bottom && Math.abs(before.left - coords.left) > 1)
        return before.left < coords.left ? "ltr" : "rtl";
    }
    if (pos < $pos.end()) {
      let after = view.coordsAtPos(pos + 1);
      let mid = (after.top + after.bottom) / 2;
      if (mid > coords.top && mid < coords.bottom && Math.abs(after.left - coords.left) > 1)
        return after.left > coords.left ? "ltr" : "rtl";
    }
  }
  let computed = getComputedStyle(view.dom).direction;
  return computed == "rtl" ? "rtl" : "ltr";
}
function selectVertically(view, dir, mods) {
  let sel = view.state.selection;
  if (sel instanceof TextSelection && !sel.empty || mods.indexOf("s") > -1)
    return false;
  if (mac2 && mods.indexOf("m") > -1)
    return false;
  let { $from, $to } = sel;
  if (!$from.parent.inlineContent || view.endOfTextblock(dir < 0 ? "up" : "down")) {
    let next = moveSelectionBlock(view.state, dir);
    if (next && next instanceof NodeSelection)
      return apply(view, next);
  }
  if (!$from.parent.inlineContent) {
    let side = dir < 0 ? $from : $to;
    let beyond = sel instanceof AllSelection ? Selection.near(side, dir) : Selection.findFrom(side, dir);
    return beyond ? apply(view, beyond) : false;
  }
  return false;
}
function stopNativeHorizontalDelete(view, dir) {
  if (!(view.state.selection instanceof TextSelection))
    return true;
  let { $head, $anchor, empty: empty2 } = view.state.selection;
  if (!$head.sameParent($anchor))
    return true;
  if (!empty2)
    return false;
  if (view.endOfTextblock(dir > 0 ? "forward" : "backward"))
    return true;
  let nextNode = !$head.textOffset && (dir < 0 ? $head.nodeBefore : $head.nodeAfter);
  if (nextNode && !nextNode.isText) {
    let tr = view.state.tr;
    if (dir < 0)
      tr.delete($head.pos - nextNode.nodeSize, $head.pos);
    else
      tr.delete($head.pos, $head.pos + nextNode.nodeSize);
    view.dispatch(tr);
    return true;
  }
  return false;
}
function switchEditable(view, node, state) {
  view.domObserver.stop();
  node.contentEditable = state;
  view.domObserver.start();
}
function safariDownArrowBug(view) {
  if (!safari || view.state.selection.$head.parentOffset > 0)
    return false;
  let { focusNode, focusOffset } = view.domSelectionRange();
  if (focusNode && isElt(focusNode) && focusOffset == 0 && focusNode.firstChild && isElt(focusNode.firstChild) && focusNode.firstChild.contentEditable == "false") {
    let child = focusNode.firstChild;
    switchEditable(view, child, "true");
    setTimeout(() => switchEditable(view, child, "false"), 20);
  }
  return false;
}
function getMods(event) {
  let result = "";
  if (event.ctrlKey)
    result += "c";
  if (event.metaKey)
    result += "m";
  if (event.altKey)
    result += "a";
  if (event.shiftKey)
    result += "s";
  return result;
}
function captureKeyDown(view, event) {
  let code2 = event.keyCode, mods = getMods(event);
  if (code2 == 8 || mac2 && code2 == 72 && mods == "c") {
    return stopNativeHorizontalDelete(view, -1) || skipIgnoredNodes(view, -1);
  } else if (code2 == 46 && !event.shiftKey || mac2 && code2 == 68 && mods == "c") {
    return stopNativeHorizontalDelete(view, 1) || skipIgnoredNodes(view, 1);
  } else if (code2 == 13 || code2 == 27) {
    return true;
  } else if (code2 == 37 || mac2 && code2 == 66 && mods == "c") {
    let dir = code2 == 37 ? findDirection(view, view.state.selection.from) == "ltr" ? -1 : 1 : -1;
    return selectHorizontally(view, dir, mods) || skipIgnoredNodes(view, dir);
  } else if (code2 == 39 || mac2 && code2 == 70 && mods == "c") {
    let dir = code2 == 39 ? findDirection(view, view.state.selection.from) == "ltr" ? 1 : -1 : 1;
    return selectHorizontally(view, dir, mods) || skipIgnoredNodes(view, dir);
  } else if (code2 == 38 || mac2 && code2 == 80 && mods == "c") {
    return selectVertically(view, -1, mods) || skipIgnoredNodes(view, -1);
  } else if (code2 == 40 || mac2 && code2 == 78 && mods == "c") {
    return safariDownArrowBug(view) || selectVertically(view, 1, mods) || skipIgnoredNodes(view, 1);
  } else if (mods == (mac2 ? "m" : "c") && (code2 == 66 || code2 == 73 || code2 == 89 || code2 == 90)) {
    return true;
  }
  return false;
}
function serializeForClipboard(view, slice2) {
  view.someProp("transformCopied", (f) => {
    slice2 = f(slice2, view);
  });
  let context = [], { content, openStart, openEnd } = slice2;
  while (openStart > 1 && openEnd > 1 && content.childCount == 1 && content.firstChild.childCount == 1) {
    openStart--;
    openEnd--;
    let node = content.firstChild;
    context.push(node.type.name, node.attrs != node.type.defaultAttrs ? node.attrs : null);
    content = node.content;
  }
  let serializer = view.someProp("clipboardSerializer") || DOMSerializer.fromSchema(view.state.schema);
  let doc3 = detachedDoc(), wrap2 = doc3.createElement("div");
  wrap2.appendChild(serializer.serializeFragment(content, { document: doc3 }));
  let firstChild = wrap2.firstChild, needsWrap, wrappers = 0;
  while (firstChild && isElt(firstChild) && (needsWrap = wrapMap[firstChild.nodeName.toLowerCase()])) {
    for (let i2 = needsWrap.length - 1; i2 >= 0; i2--) {
      let wrapper = doc3.createElement(needsWrap[i2]);
      while (wrap2.firstChild)
        wrapper.appendChild(wrap2.firstChild);
      wrap2.appendChild(wrapper);
      wrappers++;
    }
    firstChild = wrap2.firstChild;
  }
  if (firstChild && isElt(firstChild))
    firstChild.setAttribute("data-pm-slice", `${openStart} ${openEnd}${wrappers ? ` -${wrappers}` : ""} ${JSON.stringify(context)}`);
  let text = view.someProp("clipboardTextSerializer", (f) => f(slice2, view)) || slice2.content.textBetween(0, slice2.content.size, "\n\n");
  return { dom: wrap2, text, slice: slice2 };
}
function parseFromClipboard(view, text, html, plainText, $context) {
  let inCode = $context.parent.type.spec.code;
  let dom, slice2;
  if (!html && !text)
    return null;
  let asText = !!text && (plainText || inCode || !html);
  if (asText) {
    view.someProp("transformPastedText", (f) => {
      text = f(text, inCode || plainText, view);
    });
    if (inCode) {
      slice2 = new Slice(Fragment2.from(view.state.schema.text(text.replace(/\r\n?/g, "\n"))), 0, 0);
      view.someProp("transformPasted", (f) => {
        slice2 = f(slice2, view, true);
      });
      return slice2;
    }
    let parsed = view.someProp("clipboardTextParser", (f) => f(text, $context, plainText, view));
    if (parsed) {
      slice2 = parsed;
    } else {
      let marks = $context.marks();
      let { schema: schema2 } = view.state, serializer = DOMSerializer.fromSchema(schema2);
      dom = document.createElement("div");
      text.split(/(?:\r\n?|\n)+/).forEach((block) => {
        let p = dom.appendChild(document.createElement("p"));
        if (block)
          p.appendChild(serializer.serializeNode(schema2.text(block, marks)));
      });
    }
  } else {
    view.someProp("transformPastedHTML", (f) => {
      html = f(html, view);
    });
    dom = readHTML(html);
    if (webkit)
      restoreReplacedSpaces(dom);
  }
  let contextNode = dom && dom.querySelector("[data-pm-slice]");
  let sliceData = contextNode && /^(\d+) (\d+)(?: -(\d+))? (.*)/.exec(contextNode.getAttribute("data-pm-slice") || "");
  if (sliceData && sliceData[3])
    for (let i2 = +sliceData[3]; i2 > 0; i2--) {
      let child = dom.firstChild;
      while (child && !isElt(child))
        child = child.nextSibling;
      if (!child)
        break;
      dom = child;
    }
  if (!slice2) {
    let parser = view.someProp("clipboardParser") || view.someProp("domParser") || DOMParser.fromSchema(view.state.schema);
    slice2 = parser.parseSlice(dom, {
      preserveWhitespace: !!(asText || sliceData),
      context: $context,
      ruleFromNode(dom2) {
        if (dom2.nodeName == "BR" && !dom2.nextSibling && dom2.parentNode && !inlineParents.test(dom2.parentNode.nodeName))
          return { ignore: true };
        return null;
      }
    });
  }
  if (sliceData) {
    slice2 = addContext(closeSlice(slice2, +sliceData[1], +sliceData[2]), sliceData[4]);
  } else {
    slice2 = Slice.maxOpen(normalizeSiblings(slice2.content, $context), true);
    if (slice2.openStart || slice2.openEnd) {
      let openStart = 0, openEnd = 0;
      for (let node = slice2.content.firstChild; openStart < slice2.openStart && !node.type.spec.isolating; openStart++, node = node.firstChild) {
      }
      for (let node = slice2.content.lastChild; openEnd < slice2.openEnd && !node.type.spec.isolating; openEnd++, node = node.lastChild) {
      }
      slice2 = closeSlice(slice2, openStart, openEnd);
    }
  }
  view.someProp("transformPasted", (f) => {
    slice2 = f(slice2, view, asText);
  });
  return slice2;
}
var inlineParents = /^(a|abbr|acronym|b|cite|code|del|em|i|ins|kbd|label|output|q|ruby|s|samp|span|strong|sub|sup|time|u|tt|var)$/i;
function normalizeSiblings(fragment, $context) {
  if (fragment.childCount < 2)
    return fragment;
  for (let d = $context.depth; d >= 0; d--) {
    let parent = $context.node(d);
    let match = parent.contentMatchAt($context.index(d));
    let lastWrap, result = [];
    fragment.forEach((node) => {
      if (!result)
        return;
      let wrap2 = match.findWrapping(node.type), inLast;
      if (!wrap2)
        return result = null;
      if (inLast = result.length && lastWrap.length && addToSibling(wrap2, lastWrap, node, result[result.length - 1], 0)) {
        result[result.length - 1] = inLast;
      } else {
        if (result.length)
          result[result.length - 1] = closeRight(result[result.length - 1], lastWrap.length);
        let wrapped = withWrappers(node, wrap2);
        result.push(wrapped);
        match = match.matchType(wrapped.type);
        lastWrap = wrap2;
      }
    });
    if (result)
      return Fragment2.from(result);
  }
  return fragment;
}
function withWrappers(node, wrap2, from2 = 0) {
  for (let i2 = wrap2.length - 1; i2 >= from2; i2--)
    node = wrap2[i2].create(null, Fragment2.from(node));
  return node;
}
function addToSibling(wrap2, lastWrap, node, sibling, depth) {
  if (depth < wrap2.length && depth < lastWrap.length && wrap2[depth] == lastWrap[depth]) {
    let inner = addToSibling(wrap2, lastWrap, node, sibling.lastChild, depth + 1);
    if (inner)
      return sibling.copy(sibling.content.replaceChild(sibling.childCount - 1, inner));
    let match = sibling.contentMatchAt(sibling.childCount);
    if (match.matchType(depth == wrap2.length - 1 ? node.type : wrap2[depth + 1]))
      return sibling.copy(sibling.content.append(Fragment2.from(withWrappers(node, wrap2, depth + 1))));
  }
}
function closeRight(node, depth) {
  if (depth == 0)
    return node;
  let fragment = node.content.replaceChild(node.childCount - 1, closeRight(node.lastChild, depth - 1));
  let fill = node.contentMatchAt(node.childCount).fillBefore(Fragment2.empty, true);
  return node.copy(fragment.append(fill));
}
function closeRange(fragment, side, from2, to, depth, openEnd) {
  let node = side < 0 ? fragment.firstChild : fragment.lastChild, inner = node.content;
  if (fragment.childCount > 1)
    openEnd = 0;
  if (depth < to - 1)
    inner = closeRange(inner, side, from2, to, depth + 1, openEnd);
  if (depth >= from2)
    inner = side < 0 ? node.contentMatchAt(0).fillBefore(inner, openEnd <= depth).append(inner) : inner.append(node.contentMatchAt(node.childCount).fillBefore(Fragment2.empty, true));
  return fragment.replaceChild(side < 0 ? 0 : fragment.childCount - 1, node.copy(inner));
}
function closeSlice(slice2, openStart, openEnd) {
  if (openStart < slice2.openStart)
    slice2 = new Slice(closeRange(slice2.content, -1, openStart, slice2.openStart, 0, slice2.openEnd), openStart, slice2.openEnd);
  if (openEnd < slice2.openEnd)
    slice2 = new Slice(closeRange(slice2.content, 1, openEnd, slice2.openEnd, 0, 0), slice2.openStart, openEnd);
  return slice2;
}
var wrapMap = {
  thead: ["table"],
  tbody: ["table"],
  tfoot: ["table"],
  caption: ["table"],
  colgroup: ["table"],
  col: ["table", "colgroup"],
  tr: ["table", "tbody"],
  td: ["table", "tbody", "tr"],
  th: ["table", "tbody", "tr"]
};
function detachedDoc() {
  return document.implementation.createHTMLDocument("title");
}
var _policy = null;
function maybeWrapTrusted(html) {
  let trustedTypes = window.trustedTypes;
  if (!trustedTypes)
    return html;
  if (!_policy) {
    if (_policy = trustedTypes.defaultPolicy)
      try {
        return _policy.createHTML(html);
      } catch (_a2) {
      }
    _policy = trustedTypes.createPolicy("ProseMirrorClipboard", { createHTML: (s) => s });
  }
  return _policy.createHTML(html);
}
function readHTML(html) {
  let metas = /^(\s*<meta [^>]*>)*/.exec(html);
  if (metas)
    html = html.slice(metas[0].length);
  let doc3 = detachedDoc(), elt = doc3.body;
  let firstTag = /<([a-z][^>\s]+)/i.exec(html), wrap2;
  if (wrap2 = firstTag && wrapMap[firstTag[1].toLowerCase()])
    html = wrap2.map((n) => "<" + n + ">").join("") + html + wrap2.map((n) => "</" + n + ">").reverse().join("");
  elt.innerHTML = maybeWrapTrusted(html);
  if (wrap2)
    for (let i2 = 0; i2 < wrap2.length; i2++)
      elt = elt.querySelector(wrap2[i2]) || elt;
  for (let i2 = 0; i2 < doc3.styleSheets.length; i2++) {
    let style = doc3.styleSheets[i2];
    for (let j = 0; j < style.rules.length; j++) {
      let rule = style.rules[j];
      if (rule instanceof CSSStyleRule) {
        let matches2 = elt.querySelectorAll(rule.selectorText);
        for (let k = 0; k < matches2.length; k++)
          matches2[k].style.cssText += rule.style.cssText;
      }
    }
  }
  return elt;
}
function restoreReplacedSpaces(dom) {
  let nodes = dom.querySelectorAll(chrome ? "span:not([class]):not([style])" : "span.Apple-converted-space");
  for (let i2 = 0; i2 < nodes.length; i2++) {
    let node = nodes[i2];
    if (node.childNodes.length == 1 && node.textContent == "\xA0" && node.parentNode)
      node.parentNode.replaceChild(dom.ownerDocument.createTextNode(" "), node);
  }
}
function addContext(slice2, context) {
  if (!slice2.size)
    return slice2;
  let schema2 = slice2.content.firstChild.type.schema, array2;
  try {
    array2 = JSON.parse(context);
  } catch (e) {
    return slice2;
  }
  let { content, openStart, openEnd } = slice2;
  for (let i2 = array2.length - 2; i2 >= 0; i2 -= 2) {
    let type = schema2.nodes[array2[i2]];
    if (!type || type.hasRequiredAttrs())
      break;
    try {
      content = Fragment2.from(type.create(array2[i2 + 1], content));
    } catch (e) {
      break;
    }
    openStart++;
    openEnd++;
  }
  return new Slice(content, openStart, openEnd);
}
var handlers = {};
var editHandlers = {};
var passiveHandlers = { touchstart: true, touchmove: true };
var InputState = class {
  constructor() {
    this.shiftKey = false;
    this.mouseDown = null;
    this.lastKeyCode = null;
    this.lastKeyCodeTime = 0;
    this.lastClick = { time: 0, x: 0, y: 0, type: "", button: 0 };
    this.lastSelectionOrigin = null;
    this.lastSelectionTime = 0;
    this.lastIOSEnter = 0;
    this.lastIOSEnterFallbackTimeout = -1;
    this.lastFocus = 0;
    this.lastTouch = 0;
    this.lastChromeDelete = 0;
    this.composing = false;
    this.compositionNode = null;
    this.composingTimeout = -1;
    this.compositionNodes = [];
    this.compositionEndedAt = -2e8;
    this.compositionID = 1;
    this.badSafariComposition = false;
    this.compositionPendingChanges = 0;
    this.domChangeCount = 0;
    this.eventHandlers = /* @__PURE__ */ Object.create(null);
    this.hideSelectionGuard = null;
  }
};
function initInput(view) {
  for (let event in handlers) {
    let handler = handlers[event];
    view.dom.addEventListener(event, view.input.eventHandlers[event] = (event2) => {
      if (eventBelongsToView(view, event2) && !runCustomHandler(view, event2) && (view.editable || !(event2.type in editHandlers)))
        handler(view, event2);
    }, passiveHandlers[event] ? { passive: true } : void 0);
  }
  if (safari)
    view.dom.addEventListener("input", () => null);
  ensureListeners(view);
}
function setSelectionOrigin(view, origin) {
  view.input.lastSelectionOrigin = origin;
  view.input.lastSelectionTime = Date.now();
}
function destroyInput(view) {
  if (view.input.mouseDown)
    view.input.mouseDown.done();
  view.domObserver.stop();
  for (let type in view.input.eventHandlers)
    view.dom.removeEventListener(type, view.input.eventHandlers[type]);
  clearTimeout(view.input.composingTimeout);
  clearTimeout(view.input.lastIOSEnterFallbackTimeout);
}
function ensureListeners(view) {
  view.someProp("handleDOMEvents", (currentHandlers) => {
    for (let type in currentHandlers)
      if (!view.input.eventHandlers[type])
        view.dom.addEventListener(type, view.input.eventHandlers[type] = (event) => runCustomHandler(view, event));
  });
}
function runCustomHandler(view, event) {
  return view.someProp("handleDOMEvents", (handlers2) => {
    let handler = handlers2[event.type];
    return handler ? handler(view, event) || event.defaultPrevented : false;
  });
}
function eventBelongsToView(view, event) {
  if (!event.bubbles)
    return true;
  if (event.defaultPrevented)
    return false;
  for (let node = event.target; node != view.dom; node = node.parentNode)
    if (!node || node.nodeType == 11 || node.pmViewDesc && node.pmViewDesc.stopEvent(event))
      return false;
  return true;
}
function dispatchEvent(view, event) {
  if (!runCustomHandler(view, event) && handlers[event.type] && (view.editable || !(event.type in editHandlers)))
    handlers[event.type](view, event);
}
editHandlers.keydown = (view, _event) => {
  let event = _event;
  view.input.shiftKey = event.keyCode == 16 || event.shiftKey;
  if (inOrNearComposition(view))
    return;
  view.input.lastKeyCode = event.keyCode;
  view.input.lastKeyCodeTime = Date.now();
  if (android && chrome && event.keyCode == 13)
    return;
  if (event.keyCode != 229)
    view.domObserver.forceFlush();
  if (ios && event.keyCode == 13 && !event.ctrlKey && !event.altKey && !event.metaKey) {
    let now = Date.now();
    view.input.lastIOSEnter = now;
    view.input.lastIOSEnterFallbackTimeout = setTimeout(() => {
      if (view.input.lastIOSEnter == now) {
        view.someProp("handleKeyDown", (f) => f(view, keyEvent(13, "Enter")));
        view.input.lastIOSEnter = 0;
      }
    }, 200);
  } else if (view.someProp("handleKeyDown", (f) => f(view, event)) || captureKeyDown(view, event)) {
    event.preventDefault();
  } else {
    setSelectionOrigin(view, "key");
  }
};
editHandlers.keyup = (view, event) => {
  if (event.keyCode == 16)
    view.input.shiftKey = false;
};
editHandlers.keypress = (view, _event) => {
  let event = _event;
  if (inOrNearComposition(view) || !event.charCode || event.ctrlKey && !event.altKey || mac2 && event.metaKey)
    return;
  if (view.someProp("handleKeyPress", (f) => f(view, event))) {
    event.preventDefault();
    return;
  }
  let sel = view.state.selection;
  if (!(sel instanceof TextSelection) || !sel.$from.sameParent(sel.$to)) {
    let text = String.fromCharCode(event.charCode);
    let deflt = () => view.state.tr.insertText(text).scrollIntoView();
    if (!/[\r\n]/.test(text) && !view.someProp("handleTextInput", (f) => f(view, sel.$from.pos, sel.$to.pos, text, deflt)))
      view.dispatch(deflt());
    event.preventDefault();
  }
};
function eventCoords(event) {
  return { left: event.clientX, top: event.clientY };
}
function isNear(event, click) {
  let dx = click.x - event.clientX, dy = click.y - event.clientY;
  return dx * dx + dy * dy < 100;
}
function runHandlerOnContext(view, propName, pos, inside, event) {
  if (inside == -1)
    return false;
  let $pos = view.state.doc.resolve(inside);
  for (let i2 = $pos.depth + 1; i2 > 0; i2--) {
    if (view.someProp(propName, (f) => i2 > $pos.depth ? f(view, pos, $pos.nodeAfter, $pos.before(i2), event, true) : f(view, pos, $pos.node(i2), $pos.before(i2), event, false)))
      return true;
  }
  return false;
}
function updateSelection(view, selection, origin) {
  if (!view.focused)
    view.focus();
  if (view.state.selection.eq(selection))
    return;
  let tr = view.state.tr.setSelection(selection);
  tr.setMeta("pointer", true);
  view.dispatch(tr);
}
function selectClickedLeaf(view, inside) {
  if (inside == -1)
    return false;
  let $pos = view.state.doc.resolve(inside), node = $pos.nodeAfter;
  if (node && node.isAtom && NodeSelection.isSelectable(node)) {
    updateSelection(view, new NodeSelection($pos));
    return true;
  }
  return false;
}
function selectClickedNode(view, inside) {
  if (inside == -1)
    return false;
  let sel = view.state.selection, selectedNode, selectAt;
  if (sel instanceof NodeSelection)
    selectedNode = sel.node;
  let $pos = view.state.doc.resolve(inside);
  for (let i2 = $pos.depth + 1; i2 > 0; i2--) {
    let node = i2 > $pos.depth ? $pos.nodeAfter : $pos.node(i2);
    if (NodeSelection.isSelectable(node)) {
      if (selectedNode && sel.$from.depth > 0 && i2 >= sel.$from.depth && $pos.before(sel.$from.depth + 1) == sel.$from.pos)
        selectAt = $pos.before(sel.$from.depth);
      else
        selectAt = $pos.before(i2);
      break;
    }
  }
  if (selectAt != null) {
    updateSelection(view, NodeSelection.create(view.state.doc, selectAt));
    return true;
  } else {
    return false;
  }
}
function handleSingleClick(view, pos, inside, event, selectNode) {
  return runHandlerOnContext(view, "handleClickOn", pos, inside, event) || view.someProp("handleClick", (f) => f(view, pos, event)) || (selectNode ? selectClickedNode(view, inside) : selectClickedLeaf(view, inside));
}
function handleDoubleClick(view, pos, inside, event) {
  return runHandlerOnContext(view, "handleDoubleClickOn", pos, inside, event) || view.someProp("handleDoubleClick", (f) => f(view, pos, event));
}
function handleTripleClick(view, pos, inside, event) {
  return runHandlerOnContext(view, "handleTripleClickOn", pos, inside, event) || view.someProp("handleTripleClick", (f) => f(view, pos, event)) || defaultTripleClick(view, inside, event);
}
function defaultTripleClick(view, inside, event) {
  if (event.button != 0)
    return false;
  let selection = selectionForTripleClick(view, inside, true), doc3 = view.state.doc;
  if (!selection)
    return false;
  updateSelection(view, selection);
  if (selection instanceof TextSelection && doc3.eq(view.state.doc))
    view.input.mouseDown = new TripleClickDrag(view, selection);
  return true;
}
function selectionForTripleClick(view, inside, selectNodes) {
  let doc3 = view.state.doc;
  if (inside == -1)
    return doc3.inlineContent ? TextSelection.create(doc3, 0, doc3.content.size) : null;
  let $pos = doc3.resolve(inside);
  for (let i2 = $pos.depth + 1; i2 > 0; i2--) {
    let node = i2 > $pos.depth ? $pos.nodeAfter : $pos.node(i2);
    let nodePos = $pos.before(i2);
    if (node.inlineContent)
      return TextSelection.create(doc3, nodePos + 1, nodePos + 1 + node.content.size);
    else if (selectNodes && NodeSelection.isSelectable(node))
      return NodeSelection.create(doc3, nodePos);
  }
  return null;
}
function forceDOMFlush(view) {
  return endComposition(view);
}
var selectNodeModifier = mac2 ? "metaKey" : "ctrlKey";
handlers.mousedown = (view, _event) => {
  let event = _event;
  view.input.shiftKey = event.shiftKey;
  let flushed = forceDOMFlush(view);
  let now = Date.now(), type = "singleClick";
  if (now - view.input.lastClick.time < 500 && isNear(event, view.input.lastClick) && !event[selectNodeModifier] && view.input.lastClick.button == event.button) {
    if (view.input.lastClick.type == "singleClick")
      type = "doubleClick";
    else if (view.input.lastClick.type == "doubleClick")
      type = "tripleClick";
  }
  view.input.lastClick = { time: now, x: event.clientX, y: event.clientY, type, button: event.button };
  if (view.input.mouseDown)
    view.input.mouseDown.done();
  let pos = view.posAtCoords(eventCoords(event));
  if (!pos)
    return;
  if (type == "singleClick") {
    view.input.mouseDown = new LeftMouseDown(view, pos, event, !!flushed);
  } else if ((type == "doubleClick" ? handleDoubleClick : handleTripleClick)(view, pos.pos, pos.inside, event)) {
    event.preventDefault();
  } else {
    setSelectionOrigin(view, "pointer");
  }
};
var MouseDown = class {
  constructor(view) {
    this.view = view;
    this.mightDrag = null;
    view.root.addEventListener("mouseup", this.up = this.up.bind(this));
    view.root.addEventListener("mousemove", this.move = this.move.bind(this));
  }
  up(event) {
    this.done();
  }
  move(event) {
    if (event.buttons == 0)
      this.done();
  }
  done() {
    this.view.root.removeEventListener("mouseup", this.up);
    this.view.root.removeEventListener("mousemove", this.move);
    if (this.view.input.mouseDown == this)
      this.view.input.mouseDown = null;
  }
  delaySelUpdate() {
    return false;
  }
};
var LeftMouseDown = class extends MouseDown {
  constructor(view, pos, event, flushed) {
    super(view);
    this.pos = pos;
    this.event = event;
    this.flushed = flushed;
    this.delayedSelectionSync = false;
    this.startDoc = view.state.doc;
    this.selectNode = !!event[selectNodeModifier];
    this.allowDefault = event.shiftKey;
    let targetNode, targetPos;
    if (pos.inside > -1) {
      targetNode = view.state.doc.nodeAt(pos.inside);
      targetPos = pos.inside;
    } else {
      let $pos = view.state.doc.resolve(pos.pos);
      targetNode = $pos.parent;
      targetPos = $pos.depth ? $pos.before() : 0;
    }
    const target = flushed ? null : event.target;
    const targetDesc = target ? view.docView.nearestDesc(target, true) : null;
    this.target = targetDesc && isElt(targetDesc.nodeDOM) ? targetDesc.nodeDOM : null;
    let { selection } = view.state;
    if (event.button == 0 && (targetNode.type.spec.draggable && targetNode.type.spec.selectable !== false || selection instanceof NodeSelection && selection.from <= targetPos && selection.to > targetPos))
      this.mightDrag = {
        node: targetNode,
        pos: targetPos,
        addAttr: !!(this.target && !this.target.draggable),
        setUneditable: !!(this.target && gecko && !this.target.hasAttribute("contentEditable"))
      };
    if (this.target && this.mightDrag && (this.mightDrag.addAttr || this.mightDrag.setUneditable)) {
      this.view.domObserver.stop();
      if (this.mightDrag.addAttr)
        this.target.draggable = true;
      if (this.mightDrag.setUneditable)
        setTimeout(() => {
          if (this.view.input.mouseDown == this)
            this.target.setAttribute("contentEditable", "false");
        }, 20);
      this.view.domObserver.start();
    }
    setSelectionOrigin(view, "pointer");
  }
  done() {
    super.done();
    if (this.mightDrag && this.target) {
      this.view.domObserver.stop();
      if (this.mightDrag.addAttr)
        this.target.removeAttribute("draggable");
      if (this.mightDrag.setUneditable)
        this.target.removeAttribute("contentEditable");
      this.view.domObserver.start();
    }
    if (this.delayedSelectionSync)
      setTimeout(() => {
        if (!this.view.isDestroyed)
          selectionToDOM(this.view);
      });
  }
  up(event) {
    this.done();
    if (!this.view.dom.contains(event.target))
      return;
    let pos = this.pos;
    if (this.view.state.doc != this.startDoc)
      pos = this.view.posAtCoords(eventCoords(event));
    this.updateAllowDefault(event);
    if (this.allowDefault || !pos) {
      setSelectionOrigin(this.view, "pointer");
    } else if (handleSingleClick(this.view, pos.pos, pos.inside, event, this.selectNode)) {
      event.preventDefault();
    } else if (event.button == 0 && (this.flushed || // Safari ignores clicks on draggable elements
    safari && this.mightDrag && !this.mightDrag.node.isAtom || // Chrome will sometimes treat a node selection as a
    // cursor, but still report that the node is selected
    // when asked through getSelection. You'll then get a
    // situation where clicking at the point where that
    // (hidden) cursor is doesn't change the selection, and
    // thus doesn't get a reaction from ProseMirror. This
    // works around that.
    chrome && !this.view.state.selection.visible && Math.min(Math.abs(pos.pos - this.view.state.selection.from), Math.abs(pos.pos - this.view.state.selection.to)) <= 2)) {
      updateSelection(this.view, Selection.near(this.view.state.doc.resolve(pos.pos)));
      event.preventDefault();
    } else {
      setSelectionOrigin(this.view, "pointer");
    }
  }
  move(event) {
    this.updateAllowDefault(event);
    setSelectionOrigin(this.view, "pointer");
    super.move(event);
  }
  updateAllowDefault(event) {
    if (!this.allowDefault && (Math.abs(this.event.x - event.clientX) > 4 || Math.abs(this.event.y - event.clientY) > 4))
      this.allowDefault = true;
  }
  delaySelUpdate() {
    if (!this.allowDefault)
      return false;
    this.delayedSelectionSync = true;
    return true;
  }
};
var TripleClickDrag = class extends MouseDown {
  constructor(view, startSelection) {
    super(view);
    this.startSelection = startSelection;
    this.startDoc = view.state.doc;
  }
  move(event) {
    if (event.buttons == 0 || this.view.isDestroyed || !this.view.state.doc.eq(this.startDoc)) {
      this.done();
      return;
    }
    event.preventDefault();
    setSelectionOrigin(this.view, "pointer");
    let pos = this.view.posAtCoords(eventCoords(event));
    let target = pos && selectionForTripleClick(this.view, pos.inside, false);
    if (!target)
      return;
    let { doc: doc3 } = this.view.state, start = this.startSelection;
    let [anchor, head] = target.from < start.from ? [start.to, target.from] : [start.from, target.to];
    updateSelection(this.view, TextSelection.create(doc3, anchor, head));
  }
};
handlers.touchstart = (view) => {
  view.input.lastTouch = Date.now();
  forceDOMFlush(view);
  setSelectionOrigin(view, "pointer");
};
handlers.touchmove = (view) => {
  view.input.lastTouch = Date.now();
  setSelectionOrigin(view, "pointer");
};
handlers.contextmenu = (view) => forceDOMFlush(view);
function inOrNearComposition(view, event) {
  if (view.composing)
    return true;
  if (safari && Math.abs(Date.now() - view.input.compositionEndedAt) < 500) {
    view.input.compositionEndedAt = -2e8;
    return true;
  }
  return false;
}
var timeoutComposition = android ? 5e3 : -1;
editHandlers.compositionstart = editHandlers.compositionupdate = (view) => {
  if (!view.composing) {
    view.domObserver.flush();
    let { state } = view, $pos = state.selection.$to;
    if (state.selection instanceof TextSelection && state.selection.empty && (state.storedMarks || !$pos.textOffset && $pos.parentOffset && $pos.nodeBefore.marks.some((m) => m.type.spec.inclusive === false) || chrome && windows && selectionBeforeUneditable(view))) {
      view.markCursor = view.state.storedMarks || $pos.marks();
      endComposition(view, true);
      view.markCursor = null;
    } else {
      endComposition(view, !state.selection.empty);
      if (gecko && state.selection.empty && $pos.parentOffset && !$pos.textOffset && $pos.nodeBefore.marks.length) {
        let sel = view.domSelectionRange();
        for (let node = sel.focusNode, offset = sel.focusOffset; node && isElt(node) && offset != 0; ) {
          let before = offset < 0 ? node.lastChild : node.childNodes[offset - 1];
          if (!before)
            break;
          if (isText(before)) {
            let sel2 = view.domSelection();
            if (sel2)
              sel2.collapse(before, before.nodeValue.length);
            break;
          } else {
            node = before;
            offset = -1;
          }
        }
      }
    }
    view.input.composing = true;
  }
  scheduleComposeEnd(view, timeoutComposition);
};
function selectionBeforeUneditable(view) {
  let { focusNode, focusOffset } = view.domSelectionRange();
  if (!focusNode || !isElt(focusNode) || focusOffset >= focusNode.childNodes.length)
    return false;
  let next = focusNode.childNodes[focusOffset];
  return isElt(next) && next.contentEditable == "false";
}
editHandlers.compositionend = (view, event) => {
  if (view.composing) {
    view.input.composing = false;
    view.input.compositionEndedAt = Date.now();
    view.input.compositionPendingChanges = view.domObserver.pendingRecords().length ? view.input.compositionID : 0;
    view.input.compositionNode = null;
    if (view.input.badSafariComposition)
      view.domObserver.forceFlush();
    else if (view.input.compositionPendingChanges)
      Promise.resolve().then(() => view.domObserver.flush());
    view.input.compositionID++;
    scheduleComposeEnd(view, 20);
  }
};
function scheduleComposeEnd(view, delay) {
  clearTimeout(view.input.composingTimeout);
  if (delay > -1)
    view.input.composingTimeout = setTimeout(() => endComposition(view), delay);
}
function clearComposition(view) {
  if (view.composing) {
    view.input.composing = false;
    view.input.compositionEndedAt = Date.now();
  }
  while (view.input.compositionNodes.length > 0)
    view.input.compositionNodes.pop().markParentsDirty();
}
function findCompositionNode(view) {
  let sel = view.domSelectionRange();
  if (!sel.focusNode)
    return null;
  let textBefore = textNodeBefore$1(sel.focusNode, sel.focusOffset);
  let textAfter = textNodeAfter$1(sel.focusNode, sel.focusOffset);
  if (textBefore && textAfter && textBefore != textAfter) {
    let descAfter = textAfter.pmViewDesc, lastChanged = view.domObserver.lastChangedTextNode;
    if (textBefore == lastChanged || textAfter == lastChanged)
      return lastChanged;
    if (!descAfter || !descAfter.isText(textAfter.nodeValue)) {
      return textAfter;
    } else if (view.input.compositionNode == textAfter) {
      let descBefore = textBefore.pmViewDesc;
      if (!(!descBefore || !descBefore.isText(textBefore.nodeValue)))
        return textAfter;
    }
  }
  return textBefore || textAfter;
}
function endComposition(view, restarting = false) {
  if (android && view.domObserver.flushingSoon >= 0)
    return;
  view.domObserver.forceFlush();
  clearComposition(view);
  if (restarting || view.docView && view.docView.dirty) {
    let sel = selectionFromDOM(view), cur = view.state.selection;
    if (sel && !sel.eq(cur))
      view.dispatch(view.state.tr.setSelection(sel));
    else if ((view.markCursor || restarting) && !cur.$from.node(cur.$from.sharedDepth(cur.to)).inlineContent)
      view.dispatch(view.state.tr.deleteSelection());
    else
      view.updateState(view.state);
    return true;
  }
  return false;
}
function captureCopy(view, dom) {
  if (!view.dom.parentNode)
    return;
  let wrap2 = view.dom.parentNode.appendChild(document.createElement("div"));
  wrap2.appendChild(dom);
  wrap2.style.cssText = "position: fixed; left: -10000px; top: 10px";
  let sel = getSelection(), range = document.createRange();
  range.selectNodeContents(dom);
  view.dom.blur();
  sel.removeAllRanges();
  sel.addRange(range);
  setTimeout(() => {
    if (wrap2.parentNode)
      wrap2.parentNode.removeChild(wrap2);
    view.focus();
  }, 50);
}
var brokenClipboardAPI = ie && ie_version < 15 || ios && webkit_version < 604;
handlers.copy = editHandlers.cut = (view, _event) => {
  let event = _event;
  let sel = view.state.selection, cut = event.type == "cut";
  if (sel.empty)
    return;
  let data = brokenClipboardAPI ? null : event.clipboardData;
  let slice2 = sel.content(), { dom, text } = serializeForClipboard(view, slice2);
  if (data) {
    event.preventDefault();
    data.clearData();
    data.setData("text/html", dom.innerHTML);
    data.setData("text/plain", text);
  } else {
    captureCopy(view, dom);
  }
  if (cut)
    view.dispatch(view.state.tr.deleteSelection().scrollIntoView().setMeta("uiEvent", "cut"));
};
function sliceSingleNode(slice2) {
  return slice2.openStart == 0 && slice2.openEnd == 0 && slice2.content.childCount == 1 ? slice2.content.firstChild : null;
}
function capturePaste(view, event) {
  if (!view.dom.parentNode)
    return;
  let plainText = view.input.shiftKey || view.state.selection.$from.parent.type.spec.code;
  let target = view.dom.parentNode.appendChild(document.createElement(plainText ? "textarea" : "div"));
  if (!plainText)
    target.contentEditable = "true";
  target.style.cssText = "position: fixed; left: -10000px; top: 10px";
  target.focus();
  let plain = view.input.shiftKey && view.input.lastKeyCode != 45;
  setTimeout(() => {
    view.focus();
    if (target.parentNode)
      target.parentNode.removeChild(target);
    if (plainText)
      doPaste(view, target.value, null, plain, event);
    else
      doPaste(view, target.textContent, target.innerHTML, plain, event);
  }, 50);
}
function doPaste(view, text, html, preferPlain, event) {
  let slice2 = parseFromClipboard(view, text, html, preferPlain, view.state.selection.$from);
  if (view.someProp("handlePaste", (f) => f(view, event, slice2 || Slice.empty)))
    return true;
  if (!slice2)
    return false;
  let singleNode = sliceSingleNode(slice2);
  let tr = singleNode ? view.state.tr.replaceSelectionWith(singleNode, preferPlain) : view.state.tr.replaceSelection(slice2);
  view.dispatch(tr.scrollIntoView().setMeta("paste", true).setMeta("uiEvent", "paste"));
  return true;
}
function getText(clipboardData) {
  let text = clipboardData.getData("text/plain") || clipboardData.getData("Text");
  if (text)
    return text;
  let uris = clipboardData.getData("text/uri-list");
  return uris ? uris.replace(/\r?\n/g, " ") : "";
}
editHandlers.paste = (view, _event) => {
  let event = _event;
  if (view.composing && !android)
    return;
  let data = brokenClipboardAPI ? null : event.clipboardData;
  let plain = view.input.shiftKey && view.input.lastKeyCode != 45;
  if (data && doPaste(view, getText(data), data.getData("text/html"), plain, event))
    event.preventDefault();
  else
    capturePaste(view, event);
};
var Dragging = class {
  constructor(slice2, move, node) {
    this.slice = slice2;
    this.move = move;
    this.node = node;
  }
};
var dragCopyModifier = mac2 ? "altKey" : "ctrlKey";
function dragMoves(view, event) {
  let copy2;
  view.someProp("dragCopies", (test) => {
    copy2 = copy2 || test(event);
  });
  return copy2 != null ? !copy2 : !event[dragCopyModifier];
}
handlers.dragstart = (view, _event) => {
  let event = _event;
  let mouseDown = view.input.mouseDown;
  if (mouseDown)
    mouseDown.done();
  if (!event.dataTransfer)
    return;
  let sel = view.state.selection;
  let pos = sel.empty ? null : view.posAtCoords(eventCoords(event));
  let node;
  if (pos && pos.pos >= sel.from && pos.pos <= (sel instanceof NodeSelection ? sel.to - 1 : sel.to)) ;
  else if (mouseDown && mouseDown.mightDrag) {
    node = NodeSelection.create(view.state.doc, mouseDown.mightDrag.pos);
  } else if (event.target && isElt(event.target)) {
    let desc = view.docView.nearestDesc(event.target, true);
    if (desc && desc.node.type.spec.draggable && desc != view.docView)
      node = NodeSelection.create(view.state.doc, desc.posBefore);
  }
  let draggedSlice = (node || view.state.selection).content();
  let { dom, text, slice: slice2 } = serializeForClipboard(view, draggedSlice);
  if (!event.dataTransfer.files.length || !chrome || chrome_version > 120)
    event.dataTransfer.clearData();
  event.dataTransfer.setData(brokenClipboardAPI ? "Text" : "text/html", dom.innerHTML);
  event.dataTransfer.effectAllowed = "copyMove";
  if (!brokenClipboardAPI)
    event.dataTransfer.setData("text/plain", text);
  view.dragging = new Dragging(slice2, dragMoves(view, event), node);
};
handlers.dragend = (view) => {
  let dragging = view.dragging;
  window.setTimeout(() => {
    if (view.dragging == dragging)
      view.dragging = null;
  }, 50);
};
editHandlers.dragover = editHandlers.dragenter = (_, e) => e.preventDefault();
editHandlers.drop = (view, event) => {
  try {
    handleDrop(view, event, view.dragging);
  } finally {
    view.dragging = null;
  }
};
function handleDrop(view, event, dragging) {
  if (!event.dataTransfer)
    return;
  let eventPos = view.posAtCoords(eventCoords(event));
  if (!eventPos)
    return;
  let $mouse = view.state.doc.resolve(eventPos.pos);
  let slice2 = dragging && dragging.slice;
  if (slice2) {
    view.someProp("transformPasted", (f) => {
      slice2 = f(slice2, view, false);
    });
  } else {
    slice2 = parseFromClipboard(view, getText(event.dataTransfer), brokenClipboardAPI ? null : event.dataTransfer.getData("text/html"), false, $mouse);
  }
  let move = !!(dragging && dragMoves(view, event));
  if (view.someProp("handleDrop", (f) => f(view, event, slice2 || Slice.empty, move))) {
    event.preventDefault();
    return;
  }
  if (!slice2)
    return;
  event.preventDefault();
  let insertPos = slice2 ? dropPoint(view.state.doc, $mouse.pos, slice2) : $mouse.pos;
  if (insertPos == null)
    insertPos = $mouse.pos;
  let tr = view.state.tr;
  if (move) {
    let { node } = dragging;
    if (node)
      node.replace(tr);
    else
      tr.deleteSelection();
  }
  let pos = tr.mapping.map(insertPos);
  let isNode = slice2.openStart == 0 && slice2.openEnd == 0 && slice2.content.childCount == 1;
  let beforeInsert = tr.doc;
  if (isNode)
    tr.replaceRangeWith(pos, pos, slice2.content.firstChild);
  else
    tr.replaceRange(pos, pos, slice2);
  if (tr.doc.eq(beforeInsert))
    return;
  let $pos = tr.doc.resolve(pos);
  if (isNode && NodeSelection.isSelectable(slice2.content.firstChild) && $pos.nodeAfter && $pos.nodeAfter.sameMarkup(slice2.content.firstChild)) {
    tr.setSelection(new NodeSelection($pos));
  } else {
    let end = tr.mapping.map(insertPos);
    tr.mapping.maps[tr.mapping.maps.length - 1].forEach((_from, _to, _newFrom, newTo) => end = newTo);
    tr.setSelection(selectionBetween(view, $pos, tr.doc.resolve(end)));
  }
  view.focus();
  view.dispatch(tr.setMeta("uiEvent", "drop"));
}
handlers.focus = (view) => {
  view.input.lastFocus = Date.now();
  if (!view.focused) {
    view.domObserver.stop();
    view.dom.classList.add("ProseMirror-focused");
    view.domObserver.start();
    view.focused = true;
    setTimeout(() => {
      if (view.docView && view.hasFocus() && !view.domObserver.currentSelection.eq(view.domSelectionRange()))
        selectionToDOM(view);
    }, 20);
  }
};
handlers.blur = (view, _event) => {
  let event = _event;
  if (view.focused) {
    view.domObserver.stop();
    view.dom.classList.remove("ProseMirror-focused");
    view.domObserver.start();
    if (event.relatedTarget && view.dom.contains(event.relatedTarget))
      view.domObserver.currentSelection.clear();
    view.focused = false;
  }
};
handlers.beforeinput = (view, _event) => {
  let event = _event;
  if (android && event.inputType == "deleteContentBackward") {
    view.domObserver.flushSoon();
    let { domChangeCount } = view.input;
    setTimeout(() => {
      if (view.input.domChangeCount != domChangeCount)
        return;
      view.dom.blur();
      view.focus();
      if (view.someProp("handleKeyDown", (f) => f(view, keyEvent(8, "Backspace"))))
        return;
      let { $cursor } = view.state.selection;
      if ($cursor && $cursor.pos > 0)
        view.dispatch(view.state.tr.delete($cursor.pos - 1, $cursor.pos).scrollIntoView());
    }, 50);
  }
};
for (let prop in editHandlers)
  handlers[prop] = editHandlers[prop];
function compareObjs(a, b) {
  if (a == b)
    return true;
  for (let p in a)
    if (a[p] !== b[p])
      return false;
  for (let p in b)
    if (!(p in a))
      return false;
  return true;
}
var WidgetType = class _WidgetType {
  constructor(toDOM, spec) {
    this.toDOM = toDOM;
    this.spec = spec || noSpec;
    this.side = this.spec.side || 0;
  }
  map(mapping, span, offset, oldOffset) {
    let { pos, deleted } = mapping.mapResult(span.from + oldOffset, this.side < 0 ? -1 : 1);
    return deleted ? null : new Decoration(pos - offset, pos - offset, this);
  }
  valid() {
    return true;
  }
  eq(other) {
    return this == other || other instanceof _WidgetType && (this.spec.key && this.spec.key == other.spec.key || this.toDOM == other.toDOM && compareObjs(this.spec, other.spec));
  }
  destroy(node) {
    if (this.spec.destroy)
      this.spec.destroy(node);
  }
};
var InlineType = class _InlineType {
  constructor(attrs, spec) {
    this.attrs = attrs;
    this.spec = spec || noSpec;
  }
  map(mapping, span, offset, oldOffset) {
    let from2 = mapping.map(span.from + oldOffset, this.spec.inclusiveStart ? -1 : 1) - offset;
    let to = mapping.map(span.to + oldOffset, this.spec.inclusiveEnd ? 1 : -1) - offset;
    return from2 >= to ? null : new Decoration(from2, to, this);
  }
  valid(_, span) {
    return span.from < span.to;
  }
  eq(other) {
    return this == other || other instanceof _InlineType && compareObjs(this.attrs, other.attrs) && compareObjs(this.spec, other.spec);
  }
  static is(span) {
    return span.type instanceof _InlineType;
  }
  destroy() {
  }
};
var NodeType2 = class _NodeType {
  constructor(attrs, spec) {
    this.attrs = attrs;
    this.spec = spec || noSpec;
  }
  map(mapping, span, offset, oldOffset) {
    let from2 = mapping.mapResult(span.from + oldOffset, 1);
    if (from2.deleted)
      return null;
    let to = mapping.mapResult(span.to + oldOffset, -1);
    if (to.deleted || to.pos <= from2.pos)
      return null;
    return new Decoration(from2.pos - offset, to.pos - offset, this);
  }
  valid(node, span) {
    let { index, offset } = node.content.findIndex(span.from), child;
    return offset == span.from && !(child = node.child(index)).isText && offset + child.nodeSize == span.to;
  }
  eq(other) {
    return this == other || other instanceof _NodeType && compareObjs(this.attrs, other.attrs) && compareObjs(this.spec, other.spec);
  }
  destroy() {
  }
};
var Decoration = class _Decoration {
  /**
  @internal
  */
  constructor(from2, to, type) {
    this.from = from2;
    this.to = to;
    this.type = type;
  }
  /**
  @internal
  */
  copy(from2, to) {
    return new _Decoration(from2, to, this.type);
  }
  /**
  @internal
  */
  eq(other, offset = 0) {
    return this.type.eq(other.type) && this.from + offset == other.from && this.to + offset == other.to;
  }
  /**
  @internal
  */
  map(mapping, offset, oldOffset) {
    return this.type.map(mapping, this, offset, oldOffset);
  }
  /**
  Creates a widget decoration, which is a DOM node that's shown in
  the document at the given position. It is recommended that you
  delay rendering the widget by passing a function that will be
  called when the widget is actually drawn in a view, but you can
  also directly pass a DOM node. `getPos` can be used to find the
  widget's current document position.
  */
  static widget(pos, toDOM, spec) {
    return new _Decoration(pos, pos, new WidgetType(toDOM, spec));
  }
  /**
  Creates an inline decoration, which adds the given attributes to
  each inline node between `from` and `to`.
  */
  static inline(from2, to, attrs, spec) {
    return new _Decoration(from2, to, new InlineType(attrs, spec));
  }
  /**
  Creates a node decoration. `from` and `to` should point precisely
  before and after a node in the document. That node, and only that
  node, will receive the given attributes.
  */
  static node(from2, to, attrs, spec) {
    return new _Decoration(from2, to, new NodeType2(attrs, spec));
  }
  /**
  The spec provided when creating this decoration. Can be useful
  if you've stored extra information in that object.
  */
  get spec() {
    return this.type.spec;
  }
  /**
  @internal
  */
  get inline() {
    return this.type instanceof InlineType;
  }
  /**
  @internal
  */
  get widget() {
    return this.type instanceof WidgetType;
  }
};
var none = [];
var noSpec = {};
var DecorationSet = class _DecorationSet {
  /**
  @internal
  */
  constructor(local, children) {
    this.local = local.length ? local : none;
    this.children = children.length ? children : none;
  }
  /**
  Create a set of decorations, using the structure of the given
  document. This will consume (modify) the `decorations` array, so
  you must make a copy if you want need to preserve that.
  */
  static create(doc3, decorations) {
    return decorations.length ? buildTree(decorations, doc3, 0, noSpec) : empty;
  }
  /**
  Find all decorations in this set which touch the given range
  (including decorations that start or end directly at the
  boundaries) and match the given predicate on their spec. When
  `start` and `end` are omitted, all decorations in the set are
  considered. When `predicate` isn't given, all decorations are
  assumed to match.
  */
  find(start, end, predicate) {
    let result = [];
    this.findInner(start == null ? 0 : start, end == null ? 1e9 : end, result, 0, predicate);
    return result;
  }
  findInner(start, end, result, offset, predicate) {
    for (let i2 = 0; i2 < this.local.length; i2++) {
      let span = this.local[i2];
      if (span.from <= end && span.to >= start && (!predicate || predicate(span.spec)))
        result.push(span.copy(span.from + offset, span.to + offset));
    }
    for (let i2 = 0; i2 < this.children.length; i2 += 3) {
      if (this.children[i2] < end && this.children[i2 + 1] > start) {
        let childOff = this.children[i2] + 1;
        this.children[i2 + 2].findInner(start - childOff, end - childOff, result, offset + childOff, predicate);
      }
    }
  }
  /**
  Map the set of decorations in response to a change in the
  document.
  */
  map(mapping, doc3, options) {
    if (this == empty || mapping.maps.length == 0)
      return this;
    return this.mapInner(mapping, doc3, 0, 0, options || noSpec);
  }
  /**
  @internal
  */
  mapInner(mapping, node, offset, oldOffset, options) {
    let newLocal;
    for (let i2 = 0; i2 < this.local.length; i2++) {
      let mapped = this.local[i2].map(mapping, offset, oldOffset);
      if (mapped && mapped.type.valid(node, mapped))
        (newLocal || (newLocal = [])).push(mapped);
      else if (options.onRemove)
        options.onRemove(this.local[i2].spec);
    }
    if (this.children.length)
      return mapChildren(this.children, newLocal || [], mapping, node, offset, oldOffset, options);
    else
      return newLocal ? new _DecorationSet(newLocal.sort(byPos), none) : empty;
  }
  /**
  Add the given array of decorations to the ones in the set,
  producing a new set. Consumes the `decorations` array. Needs
  access to the current document to create the appropriate tree
  structure.
  */
  add(doc3, decorations) {
    if (!decorations.length)
      return this;
    if (this == empty)
      return _DecorationSet.create(doc3, decorations);
    return this.addInner(doc3, decorations, 0);
  }
  addInner(doc3, decorations, offset) {
    let children, childIndex = 0;
    doc3.forEach((childNode, childOffset) => {
      let baseOffset = childOffset + offset, found2;
      if (!(found2 = takeSpansForNode(decorations, childNode, baseOffset)))
        return;
      if (!children)
        children = this.children.slice();
      while (childIndex < children.length && children[childIndex] < childOffset)
        childIndex += 3;
      if (children[childIndex] == childOffset)
        children[childIndex + 2] = children[childIndex + 2].addInner(childNode, found2, baseOffset + 1);
      else
        children.splice(childIndex, 0, childOffset, childOffset + childNode.nodeSize, buildTree(found2, childNode, baseOffset + 1, noSpec));
      childIndex += 3;
    });
    let local = moveSpans(childIndex ? withoutNulls(decorations) : decorations, -offset);
    for (let i2 = 0; i2 < local.length; i2++)
      if (!local[i2].type.valid(doc3, local[i2]))
        local.splice(i2--, 1);
    return new _DecorationSet(local.length ? this.local.concat(local).sort(byPos) : this.local, children || this.children);
  }
  /**
  Create a new set that contains the decorations in this set, minus
  the ones in the given array.
  */
  remove(decorations) {
    if (decorations.length == 0 || this == empty)
      return this;
    return this.removeInner(decorations, 0);
  }
  removeInner(decorations, offset) {
    let children = this.children, local = this.local;
    for (let i2 = 0; i2 < children.length; i2 += 3) {
      let found2;
      let from2 = children[i2] + offset, to = children[i2 + 1] + offset;
      for (let j = 0, span; j < decorations.length; j++)
        if (span = decorations[j]) {
          if (span.from > from2 && span.to < to) {
            decorations[j] = null;
            (found2 || (found2 = [])).push(span);
          }
        }
      if (!found2)
        continue;
      if (children == this.children)
        children = this.children.slice();
      let removed = children[i2 + 2].removeInner(found2, from2 + 1);
      if (removed != empty) {
        children[i2 + 2] = removed;
      } else {
        children.splice(i2, 3);
        i2 -= 3;
      }
    }
    if (local.length) {
      for (let i2 = 0, span; i2 < decorations.length; i2++)
        if (span = decorations[i2]) {
          for (let j = 0; j < local.length; j++)
            if (local[j].eq(span, offset)) {
              if (local == this.local)
                local = this.local.slice();
              local.splice(j--, 1);
            }
        }
    }
    if (children == this.children && local == this.local)
      return this;
    return local.length || children.length ? new _DecorationSet(local, children) : empty;
  }
  forChild(offset, node) {
    if (this == empty)
      return this;
    if (node.isLeaf)
      return _DecorationSet.empty;
    let child, local;
    for (let i2 = 0; i2 < this.children.length; i2 += 3)
      if (this.children[i2] >= offset) {
        if (this.children[i2] == offset)
          child = this.children[i2 + 2];
        break;
      }
    let start = offset + 1, end = start + node.content.size;
    for (let i2 = 0; i2 < this.local.length; i2++) {
      let dec = this.local[i2];
      if (dec.from < end && dec.to > start && dec.type instanceof InlineType) {
        let from2 = Math.max(start, dec.from) - start, to = Math.min(end, dec.to) - start;
        if (from2 < to)
          (local || (local = [])).push(dec.copy(from2, to));
      }
    }
    if (local) {
      let localSet = new _DecorationSet(local.sort(byPos), none);
      return child ? new DecorationGroup([localSet, child]) : localSet;
    }
    return child || empty;
  }
  /**
  @internal
  */
  eq(other) {
    if (this == other)
      return true;
    if (!(other instanceof _DecorationSet) || this.local.length != other.local.length || this.children.length != other.children.length)
      return false;
    for (let i2 = 0; i2 < this.local.length; i2++)
      if (!this.local[i2].eq(other.local[i2]))
        return false;
    for (let i2 = 0; i2 < this.children.length; i2 += 3)
      if (this.children[i2] != other.children[i2] || this.children[i2 + 1] != other.children[i2 + 1] || !this.children[i2 + 2].eq(other.children[i2 + 2]))
        return false;
    return true;
  }
  /**
  @internal
  */
  locals(node) {
    return removeOverlap(this.localsInner(node));
  }
  /**
  @internal
  */
  localsInner(node) {
    if (this == empty)
      return none;
    if (node.inlineContent || !this.local.some(InlineType.is))
      return this.local;
    let result = [];
    for (let i2 = 0; i2 < this.local.length; i2++) {
      if (!(this.local[i2].type instanceof InlineType))
        result.push(this.local[i2]);
    }
    return result;
  }
  forEachSet(f) {
    f(this);
  }
};
DecorationSet.empty = new DecorationSet([], []);
DecorationSet.removeOverlap = removeOverlap;
var empty = DecorationSet.empty;
var DecorationGroup = class _DecorationGroup {
  constructor(members2) {
    this.members = members2;
  }
  map(mapping, doc3) {
    const mappedDecos = this.members.map((member) => member.map(mapping, doc3, noSpec));
    return _DecorationGroup.from(mappedDecos);
  }
  forChild(offset, child) {
    if (child.isLeaf)
      return DecorationSet.empty;
    let found2 = [];
    for (let i2 = 0; i2 < this.members.length; i2++) {
      let result = this.members[i2].forChild(offset, child);
      if (result == empty)
        continue;
      if (result instanceof _DecorationGroup)
        found2 = found2.concat(result.members);
      else
        found2.push(result);
    }
    return _DecorationGroup.from(found2);
  }
  eq(other) {
    if (!(other instanceof _DecorationGroup) || other.members.length != this.members.length)
      return false;
    for (let i2 = 0; i2 < this.members.length; i2++)
      if (!this.members[i2].eq(other.members[i2]))
        return false;
    return true;
  }
  locals(node) {
    let result, sorted = true;
    for (let i2 = 0; i2 < this.members.length; i2++) {
      let locals = this.members[i2].localsInner(node);
      if (!locals.length)
        continue;
      if (!result) {
        result = locals;
      } else {
        if (sorted) {
          result = result.slice();
          sorted = false;
        }
        for (let j = 0; j < locals.length; j++)
          result.push(locals[j]);
      }
    }
    return result ? removeOverlap(sorted ? result : result.sort(byPos)) : none;
  }
  // Create a group for the given array of decoration sets, or return
  // a single set when possible.
  static from(members2) {
    switch (members2.length) {
      case 0:
        return empty;
      case 1:
        return members2[0];
      default:
        return new _DecorationGroup(members2.every((m) => m instanceof DecorationSet) ? members2 : members2.reduce((r, m) => r.concat(m instanceof DecorationSet ? m : m.members), []));
    }
  }
  forEachSet(f) {
    for (let i2 = 0; i2 < this.members.length; i2++)
      this.members[i2].forEachSet(f);
  }
};
function mapChildren(oldChildren, newLocal, mapping, node, offset, oldOffset, options) {
  let children = oldChildren.slice();
  for (let i2 = 0, baseOffset = oldOffset; i2 < mapping.maps.length; i2++) {
    let moved = 0;
    mapping.maps[i2].forEach((oldStart, oldEnd, newStart, newEnd) => {
      let dSize = newEnd - newStart - (oldEnd - oldStart);
      for (let i3 = 0; i3 < children.length; i3 += 3) {
        let end = children[i3 + 1];
        if (end < 0 || oldStart > end + baseOffset - moved)
          continue;
        let start = children[i3] + baseOffset - moved;
        if (oldEnd >= start) {
          children[i3 + 1] = oldStart <= start ? -2 : -1;
        } else if (oldStart >= baseOffset && dSize) {
          children[i3] += dSize;
          children[i3 + 1] += dSize;
        }
      }
      moved += dSize;
    });
    baseOffset = mapping.maps[i2].map(baseOffset, -1);
  }
  let mustRebuild = false;
  for (let i2 = 0; i2 < children.length; i2 += 3)
    if (children[i2 + 1] < 0) {
      if (children[i2 + 1] == -2) {
        mustRebuild = true;
        children[i2 + 1] = -1;
        continue;
      }
      let from2 = mapping.map(oldChildren[i2] + oldOffset), fromLocal = from2 - offset;
      if (fromLocal < 0 || fromLocal >= node.content.size) {
        mustRebuild = true;
        continue;
      }
      let to = mapping.map(oldChildren[i2 + 1] + oldOffset, -1), toLocal = to - offset;
      let { index, offset: childOffset } = node.content.findIndex(fromLocal);
      let childNode = node.maybeChild(index);
      if (childNode && childOffset == fromLocal && childOffset + childNode.nodeSize == toLocal) {
        let mapped = children[i2 + 2].mapInner(mapping, childNode, from2 + 1, oldChildren[i2] + oldOffset + 1, options);
        if (mapped != empty) {
          children[i2] = fromLocal;
          children[i2 + 1] = toLocal;
          children[i2 + 2] = mapped;
        } else {
          children[i2 + 1] = -2;
          mustRebuild = true;
        }
      } else {
        mustRebuild = true;
      }
    }
  if (mustRebuild) {
    let decorations = mapAndGatherRemainingDecorations(children, oldChildren, newLocal, mapping, offset, oldOffset, options);
    let built = buildTree(decorations, node, 0, options);
    newLocal = built.local;
    for (let i2 = 0; i2 < children.length; i2 += 3)
      if (children[i2 + 1] < 0) {
        children.splice(i2, 3);
        i2 -= 3;
      }
    for (let i2 = 0, j = 0; i2 < built.children.length; i2 += 3) {
      let from2 = built.children[i2];
      while (j < children.length && children[j] < from2)
        j += 3;
      children.splice(j, 0, built.children[i2], built.children[i2 + 1], built.children[i2 + 2]);
    }
  }
  return new DecorationSet(newLocal.sort(byPos), children);
}
function moveSpans(spans, offset) {
  if (!offset || !spans.length)
    return spans;
  let result = [];
  for (let i2 = 0; i2 < spans.length; i2++) {
    let span = spans[i2];
    result.push(new Decoration(span.from + offset, span.to + offset, span.type));
  }
  return result;
}
function mapAndGatherRemainingDecorations(children, oldChildren, decorations, mapping, offset, oldOffset, options) {
  function gather(set, oldOffset2) {
    for (let i2 = 0; i2 < set.local.length; i2++) {
      let mapped = set.local[i2].map(mapping, offset, oldOffset2);
      if (mapped)
        decorations.push(mapped);
      else if (options.onRemove)
        options.onRemove(set.local[i2].spec);
    }
    for (let i2 = 0; i2 < set.children.length; i2 += 3)
      gather(set.children[i2 + 2], set.children[i2] + oldOffset2 + 1);
  }
  for (let i2 = 0; i2 < children.length; i2 += 3)
    if (children[i2 + 1] == -1)
      gather(children[i2 + 2], oldChildren[i2] + oldOffset + 1);
  return decorations;
}
function takeSpansForNode(spans, node, offset) {
  if (node.isLeaf)
    return null;
  let end = offset + node.nodeSize, found2 = null;
  for (let i2 = 0, span; i2 < spans.length; i2++) {
    if ((span = spans[i2]) && span.from > offset && span.to < end) {
      (found2 || (found2 = [])).push(span);
      spans[i2] = null;
    }
  }
  return found2;
}
function withoutNulls(array2) {
  let result = [];
  for (let i2 = 0; i2 < array2.length; i2++)
    if (array2[i2] != null)
      result.push(array2[i2]);
  return result;
}
function buildTree(spans, node, offset, options) {
  let children = [], hasNulls = false;
  node.forEach((childNode, localStart) => {
    let found2 = takeSpansForNode(spans, childNode, localStart + offset);
    if (found2) {
      hasNulls = true;
      let subtree = buildTree(found2, childNode, offset + localStart + 1, options);
      if (subtree != empty)
        children.push(localStart, localStart + childNode.nodeSize, subtree);
    }
  });
  let locals = moveSpans(hasNulls ? withoutNulls(spans) : spans, -offset).sort(byPos);
  for (let i2 = 0; i2 < locals.length; i2++)
    if (!locals[i2].type.valid(node, locals[i2])) {
      if (options.onRemove)
        options.onRemove(locals[i2].spec);
      locals.splice(i2--, 1);
    }
  return locals.length || children.length ? new DecorationSet(locals, children) : empty;
}
function byPos(a, b) {
  return a.from - b.from || a.to - b.to;
}
function removeOverlap(spans) {
  let working = spans;
  for (let i2 = 0; i2 < working.length - 1; i2++) {
    let span = working[i2];
    if (span.from != span.to)
      for (let j = i2 + 1; j < working.length; j++) {
        let next = working[j];
        if (next.from == span.from) {
          if (next.to != span.to) {
            if (working == spans)
              working = spans.slice();
            working[j] = next.copy(next.from, span.to);
            insertAhead(working, j + 1, next.copy(span.to, next.to));
          }
          continue;
        } else {
          if (next.from < span.to) {
            if (working == spans)
              working = spans.slice();
            working[i2] = span.copy(span.from, next.from);
            insertAhead(working, j, span.copy(next.from, span.to));
          }
          break;
        }
      }
  }
  return working;
}
function insertAhead(array2, i2, deco) {
  while (i2 < array2.length && byPos(deco, array2[i2]) > 0)
    i2++;
  array2.splice(i2, 0, deco);
}
function viewDecorations(view) {
  let found2 = [];
  view.someProp("decorations", (f) => {
    let result = f(view.state);
    if (result && result != empty)
      found2.push(result);
  });
  if (view.cursorWrapper)
    found2.push(DecorationSet.create(view.state.doc, [view.cursorWrapper.deco]));
  return DecorationGroup.from(found2);
}
var observeOptions = {
  childList: true,
  characterData: true,
  characterDataOldValue: true,
  attributes: true,
  attributeOldValue: true,
  subtree: true
};
var useCharData = ie && ie_version <= 11;
var SelectionState = class {
  constructor() {
    this.anchorNode = null;
    this.anchorOffset = 0;
    this.focusNode = null;
    this.focusOffset = 0;
  }
  set(sel) {
    this.anchorNode = sel.anchorNode;
    this.anchorOffset = sel.anchorOffset;
    this.focusNode = sel.focusNode;
    this.focusOffset = sel.focusOffset;
  }
  clear() {
    this.anchorNode = this.focusNode = null;
  }
  eq(sel) {
    return sel.anchorNode == this.anchorNode && sel.anchorOffset == this.anchorOffset && sel.focusNode == this.focusNode && sel.focusOffset == this.focusOffset;
  }
};
var DOMObserver = class {
  constructor(view, handleDOMChange) {
    this.view = view;
    this.handleDOMChange = handleDOMChange;
    this.queue = [];
    this.flushingSoon = -1;
    this.observer = null;
    this.currentSelection = new SelectionState();
    this.onCharData = null;
    this.suppressingSelectionUpdates = false;
    this.lastChangedTextNode = null;
    this.observer = window.MutationObserver && new window.MutationObserver((mutations) => {
      for (let i2 = 0; i2 < mutations.length; i2++)
        this.queue.push(mutations[i2]);
      if (ie && ie_version <= 11 && mutations.some((m) => m.type == "childList" && m.removedNodes.length || m.type == "characterData" && m.oldValue.length > m.target.nodeValue.length)) {
        this.flushSoon();
      } else if (safari && view.composing && mutations.some((m) => m.type == "childList" && m.target.nodeName == "TR")) {
        view.input.badSafariComposition = true;
        this.flushSoon();
      } else {
        this.flush();
      }
    });
    if (useCharData) {
      this.onCharData = (e) => {
        this.queue.push({ target: e.target, type: "characterData", oldValue: e.prevValue });
        this.flushSoon();
      };
    }
    this.onSelectionChange = this.onSelectionChange.bind(this);
  }
  flushSoon() {
    if (this.flushingSoon < 0)
      this.flushingSoon = window.setTimeout(() => {
        this.flushingSoon = -1;
        this.flush();
      }, 20);
  }
  forceFlush() {
    if (this.flushingSoon > -1) {
      window.clearTimeout(this.flushingSoon);
      this.flushingSoon = -1;
      this.flush();
    }
  }
  start() {
    if (this.observer) {
      this.observer.takeRecords();
      this.observer.observe(this.view.dom, observeOptions);
    }
    if (this.onCharData)
      this.view.dom.addEventListener("DOMCharacterDataModified", this.onCharData);
    this.connectSelection();
  }
  stop() {
    if (this.observer) {
      let take = this.observer.takeRecords();
      if (take.length) {
        for (let i2 = 0; i2 < take.length; i2++)
          this.queue.push(take[i2]);
        window.setTimeout(() => this.flush(), 20);
      }
      this.observer.disconnect();
    }
    if (this.onCharData)
      this.view.dom.removeEventListener("DOMCharacterDataModified", this.onCharData);
    this.disconnectSelection();
  }
  connectSelection() {
    this.view.dom.ownerDocument.addEventListener("selectionchange", this.onSelectionChange);
  }
  disconnectSelection() {
    this.view.dom.ownerDocument.removeEventListener("selectionchange", this.onSelectionChange);
  }
  suppressSelectionUpdates() {
    this.suppressingSelectionUpdates = true;
    setTimeout(() => this.suppressingSelectionUpdates = false, 50);
  }
  onSelectionChange() {
    if (!hasFocusAndSelection(this.view))
      return;
    if (this.suppressingSelectionUpdates)
      return selectionToDOM(this.view);
    if (ie && ie_version <= 11 && !this.view.state.selection.empty) {
      let sel = this.view.domSelectionRange();
      if (sel.focusNode && isEquivalentPosition(sel.focusNode, sel.focusOffset, sel.anchorNode, sel.anchorOffset))
        return this.flushSoon();
    }
    this.flush();
  }
  setCurSelection() {
    this.currentSelection.set(this.view.domSelectionRange());
  }
  ignoreSelectionChange(sel) {
    if (!sel.focusNode)
      return true;
    let ancestors = /* @__PURE__ */ new Set(), container;
    for (let scan = sel.focusNode; scan; scan = parentNode(scan))
      ancestors.add(scan);
    for (let scan = sel.anchorNode; scan; scan = parentNode(scan))
      if (ancestors.has(scan)) {
        container = scan;
        break;
      }
    let desc = container && this.view.docView.nearestDesc(container);
    if (desc && desc.ignoreMutation({
      type: "selection",
      target: isText(container) ? container.parentNode : container
    })) {
      this.setCurSelection();
      return true;
    }
  }
  pendingRecords() {
    if (this.observer)
      for (let mut of this.observer.takeRecords())
        this.queue.push(mut);
    return this.queue;
  }
  flush() {
    let { view } = this;
    if (!view.docView || this.flushingSoon > -1)
      return;
    let mutations = this.pendingRecords();
    if (mutations.length)
      this.queue = [];
    let sel = view.domSelectionRange();
    let newSel = !this.suppressingSelectionUpdates && !this.currentSelection.eq(sel) && hasFocusAndSelection(view) && !this.ignoreSelectionChange(sel);
    let from2 = -1, to = -1, typeOver = false, added = [];
    if (view.editable) {
      for (let i2 = 0; i2 < mutations.length; i2++) {
        let result = this.registerMutation(mutations[i2], added);
        if (result) {
          from2 = from2 < 0 ? result.from : Math.min(result.from, from2);
          to = to < 0 ? result.to : Math.max(result.to, to);
          if (result.typeOver)
            typeOver = true;
        }
      }
    }
    if (added.some((n) => n.nodeName == "BR") && (view.input.lastKeyCode == 8 || view.input.lastKeyCode == 46 || chrome && (view.composing || view.input.compositionEndedAt > Date.now() - 50) && mutations.some((m) => m.type == "childList" && m.removedNodes.length))) {
      for (let node of added)
        if (node.nodeName == "BR" && node.parentNode) {
          let after = node.nextSibling;
          while (after && isElt(after)) {
            if (after.contentEditable == "false") {
              node.parentNode.removeChild(node);
              break;
            }
            after = after.firstChild;
          }
        }
    } else if (gecko && added.length) {
      let brs = added.filter((n) => n.nodeName == "BR");
      if (brs.length == 2) {
        let [a, b] = brs;
        if (a.parentNode && a.parentNode.parentNode == b.parentNode)
          b.remove();
        else
          a.remove();
      } else {
        let { focusNode } = this.currentSelection;
        for (let br of brs) {
          let parent = br.parentNode;
          if (parent && parent.nodeName == "LI" && (!focusNode || blockParent(view, focusNode) != parent))
            br.remove();
        }
      }
    }
    let readSel = null;
    if (from2 < 0 && newSel && view.input.lastFocus > Date.now() - 200 && Math.max(view.input.lastTouch, view.input.lastClick.time) < Date.now() - 300 && selectionCollapsed(sel) && (readSel = selectionFromDOM(view)) && readSel.eq(Selection.near(view.state.doc.resolve(0), 1))) {
      view.input.lastFocus = 0;
      selectionToDOM(view);
      this.currentSelection.set(sel);
      view.scrollToSelection();
    } else if (from2 > -1 || newSel) {
      if (from2 > -1) {
        view.docView.markDirty(from2, to);
        checkCSS(view);
      }
      if (view.input.badSafariComposition) {
        view.input.badSafariComposition = false;
        fixUpBadSafariComposition(view, added);
      }
      this.handleDOMChange(from2, to, typeOver, added);
      if (view.docView && view.docView.dirty)
        view.updateState(view.state);
      else if (!this.currentSelection.eq(sel))
        selectionToDOM(view);
      this.currentSelection.set(sel);
    }
  }
  registerMutation(mut, added) {
    if (added.indexOf(mut.target) > -1)
      return null;
    let desc = this.view.docView.nearestDesc(mut.target);
    if (mut.type == "attributes" && (desc == this.view.docView || mut.attributeName == "contenteditable" || // Firefox sometimes fires spurious events for null/empty styles
    mut.attributeName == "style" && !mut.oldValue && !mut.target.getAttribute("style")))
      return null;
    if (!desc || desc.ignoreMutation(mut))
      return null;
    if (mut.type == "childList") {
      for (let i2 = 0; i2 < mut.addedNodes.length; i2++) {
        let node = mut.addedNodes[i2];
        added.push(node);
        if (isText(node))
          this.lastChangedTextNode = node;
      }
      if (desc.contentDOM && desc.contentDOM != desc.dom && !desc.contentDOM.contains(mut.target))
        return { from: desc.posBefore, to: desc.posAfter };
      let prev = mut.previousSibling, next = mut.nextSibling;
      if (ie && ie_version <= 11 && mut.addedNodes.length) {
        for (let i2 = 0; i2 < mut.addedNodes.length; i2++) {
          let { previousSibling, nextSibling } = mut.addedNodes[i2];
          if (!previousSibling || Array.prototype.indexOf.call(mut.addedNodes, previousSibling) < 0)
            prev = previousSibling;
          if (!nextSibling || Array.prototype.indexOf.call(mut.addedNodes, nextSibling) < 0)
            next = nextSibling;
        }
      }
      let fromOffset = prev && prev.parentNode == mut.target ? domIndex(prev) + 1 : 0;
      let from2 = desc.localPosFromDOM(mut.target, fromOffset, -1);
      let toOffset = next && next.parentNode == mut.target ? domIndex(next) : mut.target.childNodes.length;
      let to = desc.localPosFromDOM(mut.target, toOffset, 1);
      return { from: from2, to };
    } else if (mut.type == "attributes") {
      return { from: desc.posAtStart - desc.border, to: desc.posAtEnd + desc.border };
    } else {
      this.lastChangedTextNode = mut.target;
      return {
        from: desc.posAtStart,
        to: desc.posAtEnd,
        // An event was generated for a text change that didn't change
        // any text. Mark the dom change to fall back to assuming the
        // selection was typed over with an identical value if it can't
        // find another change.
        typeOver: mut.target.nodeValue == mut.oldValue
      };
    }
  }
};
var cssChecked = /* @__PURE__ */ new WeakMap();
var cssCheckWarned = false;
function checkCSS(view) {
  if (cssChecked.has(view))
    return;
  cssChecked.set(view, null);
  if (["normal", "nowrap", "pre-line"].indexOf(getComputedStyle(view.dom).whiteSpace) !== -1) {
    view.requiresGeckoHackNode = gecko;
    if (cssCheckWarned)
      return;
    console["warn"]("ProseMirror expects the CSS white-space property to be set, preferably to 'pre-wrap'. It is recommended to load style/prosemirror.css from the prosemirror-view package.");
    cssCheckWarned = true;
  }
}
function rangeToSelectionRange(view, range) {
  let anchorNode = range.startContainer, anchorOffset = range.startOffset;
  let focusNode = range.endContainer, focusOffset = range.endOffset;
  let currentAnchor = view.domAtPos(view.state.selection.anchor);
  if (isEquivalentPosition(currentAnchor.node, currentAnchor.offset, focusNode, focusOffset))
    [anchorNode, anchorOffset, focusNode, focusOffset] = [focusNode, focusOffset, anchorNode, anchorOffset];
  return { anchorNode, anchorOffset, focusNode, focusOffset };
}
function safariShadowSelectionRange(view, selection) {
  if (selection.getComposedRanges) {
    let range = selection.getComposedRanges(view.root)[0];
    if (range)
      return rangeToSelectionRange(view, range);
  }
  let found2;
  function read(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    found2 = event.getTargetRanges()[0];
  }
  view.dom.addEventListener("beforeinput", read, true);
  document.execCommand("indent");
  view.dom.removeEventListener("beforeinput", read, true);
  return found2 ? rangeToSelectionRange(view, found2) : null;
}
function blockParent(view, node) {
  for (let p = node.parentNode; p && p != view.dom; p = p.parentNode) {
    let desc = view.docView.nearestDesc(p, true);
    if (desc && desc.node.isBlock)
      return p;
  }
  return null;
}
function fixUpBadSafariComposition(view, addedNodes) {
  var _a2;
  let { focusNode, focusOffset } = view.domSelectionRange();
  for (let node of addedNodes) {
    if (((_a2 = node.parentNode) === null || _a2 === void 0 ? void 0 : _a2.nodeName) == "TR") {
      let nextCell = node.nextSibling;
      while (nextCell && (nextCell.nodeName != "TD" && nextCell.nodeName != "TH"))
        nextCell = nextCell.nextSibling;
      if (nextCell) {
        let parent = nextCell;
        for (; ; ) {
          let first = parent.firstChild;
          if (!first || !isElt(first) || first.contentEditable == "false" || /^(BR|IMG)$/.test(first.nodeName))
            break;
          parent = first;
        }
        parent.insertBefore(node, parent.firstChild);
        if (focusNode == node)
          view.domSelection().collapse(node, focusOffset);
      } else {
        node.parentNode.removeChild(node);
      }
    }
  }
}
function parseBetween(view, from_, to_, addedNodes) {
  let { node: parent, fromOffset, toOffset, from: from2, to } = view.docView.parseRange(from_, to_);
  let domSel = view.domSelectionRange();
  let find;
  let anchor = domSel.anchorNode;
  if (anchor && contains(view.dom, anchor)) {
    find = [{ node: anchor, offset: domSel.anchorOffset }];
    if (!selectionCollapsed(domSel))
      find.push({ node: domSel.focusNode, offset: domSel.focusOffset });
  }
  if (chrome && view.input.lastKeyCode === 8) {
    for (let off = toOffset; off > fromOffset; off--) {
      let node = parent.childNodes[off - 1], desc = node.pmViewDesc;
      if (node.nodeName == "BR" && !desc) {
        toOffset = off;
        break;
      }
      if (!desc || desc.size)
        break;
    }
  }
  let startDoc = view.state.doc;
  let parser = view.someProp("domParser") || DOMParser.fromSchema(view.state.schema);
  let $from = startDoc.resolve(from2);
  let sel = null, doc3 = parser.parse(parent, {
    topNode: $from.parent,
    topMatch: $from.parent.contentMatchAt($from.index()),
    topOpen: true,
    from: fromOffset,
    to: toOffset,
    preserveWhitespace: $from.parent.type.whitespace == "pre" ? "full" : true,
    findPositions: find,
    ruleFromNode: ruleFromNode(addedNodes),
    context: $from
  });
  if (find && find[0].pos != null) {
    let anchor2 = find[0].pos, head = find[1] && find[1].pos;
    if (head == null)
      head = anchor2;
    sel = { anchor: anchor2 + from2, head: head + from2 };
  }
  return { doc: doc3, sel, from: from2, to };
}
var ruleFromNode = (added) => (dom) => {
  let desc = dom.pmViewDesc;
  if (desc) {
    return desc.parseRule(added);
  } else if (dom.nodeName == "BR" && dom.parentNode) {
    if (safari && /^(ul|ol)$/i.test(dom.parentNode.nodeName)) {
      let skip = document.createElement("div");
      skip.appendChild(document.createElement("li"));
      return { skip };
    } else if (dom.parentNode.lastChild == dom || safari && /^(tr|table)$/i.test(dom.parentNode.nodeName)) {
      return { ignore: true };
    }
  } else if (dom.nodeName == "IMG" && dom.getAttribute("mark-placeholder")) {
    return { ignore: true };
  }
  return null;
};
var isInline = /^(a|abbr|acronym|b|bd[io]|big|br|button|cite|code|data(list)?|del|dfn|em|i|img|ins|kbd|label|map|mark|meter|output|q|ruby|s|samp|small|span|strong|su[bp]|time|u|tt|var)$/i;
function readDOMChange(view, from2, to, typeOver, addedNodes) {
  let compositionID = view.input.compositionPendingChanges || (view.composing ? view.input.compositionID : 0);
  view.input.compositionPendingChanges = 0;
  if (from2 < 0) {
    let origin = view.input.lastSelectionTime > Date.now() - 50 ? view.input.lastSelectionOrigin : null;
    let newSel = selectionFromDOM(view, origin);
    if (newSel && !view.state.selection.eq(newSel)) {
      if (chrome && android && view.input.lastKeyCode === 13 && Date.now() - 100 < view.input.lastKeyCodeTime && view.someProp("handleKeyDown", (f) => f(view, keyEvent(13, "Enter"))))
        return;
      let tr = view.state.tr.setSelection(newSel);
      if (origin == "pointer")
        tr.setMeta("pointer", true);
      else if (origin == "key")
        tr.scrollIntoView();
      if (compositionID)
        tr.setMeta("composition", compositionID);
      view.dispatch(tr);
    }
    return;
  }
  let $before = view.state.doc.resolve(from2);
  let shared = $before.sharedDepth(to);
  from2 = $before.before(shared + 1);
  to = view.state.doc.resolve(to).after(shared + 1);
  let sel = view.state.selection;
  let parse2 = parseBetween(view, from2, to, addedNodes);
  let doc3 = view.state.doc, compare = doc3.slice(parse2.from, parse2.to);
  let preferredPos, preferredSide;
  if (view.input.lastKeyCode === 8 && Date.now() - 100 < view.input.lastKeyCodeTime) {
    preferredPos = view.state.selection.to;
    preferredSide = "end";
  } else {
    preferredPos = view.state.selection.from;
    preferredSide = "start";
  }
  view.input.lastKeyCode = null;
  let change = findDiff(compare.content, parse2.doc.content, parse2.from, preferredPos, preferredSide);
  if (change)
    view.input.domChangeCount++;
  if ((ios && view.input.lastIOSEnter > Date.now() - 225 || android) && addedNodes.some((n) => isElt(n) && !isInline.test(n.nodeName)) && (!change || change.endA >= change.endB) && view.someProp("handleKeyDown", (f) => f(view, keyEvent(13, "Enter")))) {
    view.input.lastIOSEnter = 0;
    return;
  }
  if (!change) {
    if (typeOver && sel instanceof TextSelection && !sel.empty && sel.$head.sameParent(sel.$anchor) && !view.composing && !(parse2.sel && parse2.sel.anchor != parse2.sel.head)) {
      change = { start: sel.from, endA: sel.to, endB: sel.to };
    } else {
      if (parse2.sel) {
        let sel2 = resolveSelection(view, view.state.doc, parse2.sel);
        if (sel2 && !sel2.eq(view.state.selection)) {
          let tr = view.state.tr.setSelection(sel2);
          if (compositionID)
            tr.setMeta("composition", compositionID);
          view.dispatch(tr);
        }
      }
      return;
    }
  }
  if (view.state.selection.from < view.state.selection.to && change.start == change.endB && view.state.selection instanceof TextSelection) {
    if (change.start > view.state.selection.from && change.start <= view.state.selection.from + 2 && view.state.selection.from >= parse2.from) {
      change.start = view.state.selection.from;
    } else if (change.endA < view.state.selection.to && change.endA >= view.state.selection.to - 2 && view.state.selection.to <= parse2.to) {
      change.endB += view.state.selection.to - change.endA;
      change.endA = view.state.selection.to;
    }
  }
  if (ie && ie_version <= 11 && change.endB == change.start + 1 && change.endA == change.start && change.start > parse2.from && parse2.doc.textBetween(change.start - parse2.from - 1, change.start - parse2.from + 1) == " \xA0") {
    change.start--;
    change.endA--;
    change.endB--;
  }
  let $from = parse2.doc.resolveNoCache(change.start - parse2.from);
  let $to = parse2.doc.resolveNoCache(change.endB - parse2.from);
  let $fromA = doc3.resolve(change.start);
  let inlineChange = $from.sameParent($to) && $from.parent.inlineContent && $fromA.end() >= change.endA;
  if ((ios && view.input.lastIOSEnter > Date.now() - 225 && (!inlineChange || addedNodes.some((n) => n.nodeName == "DIV" || n.nodeName == "P")) || !inlineChange && looksLikeEnter(parse2.doc, $from.pos, $to.pos)) && view.someProp("handleKeyDown", (f) => f(view, keyEvent(13, "Enter")))) {
    view.input.lastIOSEnter = 0;
    return;
  }
  if (view.state.selection.anchor > change.start && looksLikeBackspace(doc3, change.start, change.endA, $from, $to) && view.someProp("handleKeyDown", (f) => f(view, keyEvent(8, "Backspace")))) {
    if (android && chrome)
      view.domObserver.suppressSelectionUpdates();
    return;
  }
  if (chrome && change.endB == change.start)
    view.input.lastChromeDelete = Date.now();
  if (android && !inlineChange && $from.start() != $to.start() && $to.parentOffset == 0 && $from.depth == $to.depth && parse2.sel && parse2.sel.anchor == parse2.sel.head && parse2.sel.head == change.endA) {
    change.endB -= 2;
    $to = parse2.doc.resolveNoCache(change.endB - parse2.from);
    setTimeout(() => {
      view.someProp("handleKeyDown", function(f) {
        return f(view, keyEvent(13, "Enter"));
      });
    }, 20);
  }
  let chFrom = change.start, chTo = change.endA;
  let mkTr = (base2) => {
    let tr = base2 || view.state.tr.replace(chFrom, chTo, parse2.doc.slice(change.start - parse2.from, change.endB - parse2.from));
    if (parse2.sel) {
      let sel2 = resolveSelection(view, tr.doc, parse2.sel);
      if (sel2 && !(chrome && view.composing && sel2.empty && (change.start != change.endB || view.input.lastChromeDelete < Date.now() - 100) && (sel2.head == chFrom || sel2.head == tr.mapping.map(chTo) - 1) || ie && sel2.empty && sel2.head == chFrom))
        tr.setSelection(sel2);
    }
    if (compositionID)
      tr.setMeta("composition", compositionID);
    return tr.scrollIntoView();
  };
  let markChange;
  if (inlineChange) {
    if ($from.pos == $to.pos) {
      if (ie && ie_version <= 11 && $from.parentOffset == 0) {
        view.domObserver.suppressSelectionUpdates();
        setTimeout(() => selectionToDOM(view), 20);
      }
      let tr = mkTr(view.state.tr.delete(chFrom, chTo));
      let marks = doc3.resolve(change.start).marksAcross(doc3.resolve(change.endA));
      if (marks)
        tr.ensureMarks(marks);
      view.dispatch(tr);
    } else if (
      // Adding or removing a mark
      change.endA == change.endB && (markChange = isMarkChange($from.parent.content.cut($from.parentOffset, $to.parentOffset), $fromA.parent.content.cut($fromA.parentOffset, change.endA - $fromA.start())))
    ) {
      let tr = mkTr(view.state.tr);
      if (markChange.type == "add")
        tr.addMark(chFrom, chTo, markChange.mark);
      else
        tr.removeMark(chFrom, chTo, markChange.mark);
      view.dispatch(tr);
    } else if ($from.parent.child($from.index()).isText && $from.index() == $to.index() - ($to.textOffset ? 0 : 1)) {
      let text = $from.parent.textBetween($from.parentOffset, $to.parentOffset);
      let deflt = () => mkTr(view.state.tr.insertText(text, chFrom, chTo));
      if (!view.someProp("handleTextInput", (f) => f(view, chFrom, chTo, text, deflt)))
        view.dispatch(deflt());
    } else {
      view.dispatch(mkTr());
    }
  } else {
    view.dispatch(mkTr());
  }
}
function resolveSelection(view, doc3, parsedSel) {
  if (Math.max(parsedSel.anchor, parsedSel.head) > doc3.content.size)
    return null;
  return selectionBetween(view, doc3.resolve(parsedSel.anchor), doc3.resolve(parsedSel.head));
}
function isMarkChange(cur, prev) {
  let curMarks = cur.firstChild.marks, prevMarks = prev.firstChild.marks;
  let added = curMarks, removed = prevMarks, type, mark, update;
  for (let i2 = 0; i2 < prevMarks.length; i2++)
    added = prevMarks[i2].removeFromSet(added);
  for (let i2 = 0; i2 < curMarks.length; i2++)
    removed = curMarks[i2].removeFromSet(removed);
  if (added.length == 1 && removed.length == 0) {
    mark = added[0];
    type = "add";
    update = (node) => node.mark(mark.addToSet(node.marks));
  } else if (added.length == 0 && removed.length == 1) {
    mark = removed[0];
    type = "remove";
    update = (node) => node.mark(mark.removeFromSet(node.marks));
  } else {
    return null;
  }
  let updated = [];
  for (let i2 = 0; i2 < prev.childCount; i2++)
    updated.push(update(prev.child(i2)));
  if (Fragment2.from(updated).eq(cur))
    return { mark, type };
}
function looksLikeBackspace(old, start, end, $newStart, $newEnd) {
  if (
    // The content must have shrunk
    end - start <= $newEnd.pos - $newStart.pos || // newEnd must point directly at or after the end of the block that newStart points into
    skipClosingAndOpening($newStart, true, false) < $newEnd.pos
  )
    return false;
  let $start = old.resolve(start);
  if (!$newStart.parent.isTextblock) {
    let after = $start.nodeAfter;
    return after != null && end == start + after.nodeSize;
  }
  if ($start.parentOffset < $start.parent.content.size || !$start.parent.isTextblock)
    return false;
  let $next = old.resolve(skipClosingAndOpening($start, true, true));
  if (!$next.parent.isTextblock || $next.pos > end || skipClosingAndOpening($next, true, false) < end)
    return false;
  return $newStart.parent.content.cut($newStart.parentOffset).eq($next.parent.content);
}
function looksLikeEnter(content, from2, to) {
  let newTextlines = 0, newLeaves = 0;
  content.nodesBetween(from2, to, (node, pos) => {
    if (node.isTextblock && pos >= from2 && pos < to)
      newTextlines++;
    else if (node.isText ? /\S/.test(node.text.slice(Math.max(0, from2 - pos), Math.min(node.nodeSize, to - pos))) : node.isLeaf)
      newLeaves++;
  });
  return newLeaves == 0 && newTextlines == 1;
}
function skipClosingAndOpening($pos, fromEnd, mayOpen) {
  let depth = $pos.depth, end = fromEnd ? $pos.end() : $pos.pos;
  while (depth > 0 && (fromEnd || $pos.indexAfter(depth) == $pos.node(depth).childCount)) {
    depth--;
    end++;
    fromEnd = false;
  }
  if (mayOpen) {
    let next = $pos.node(depth).maybeChild($pos.indexAfter(depth));
    while (next && !next.isLeaf) {
      next = next.firstChild;
      end++;
    }
  }
  return end;
}
function findDiff(a, b, pos, preferredPos, preferredSide) {
  let start = a.findDiffStart(b, pos), lenA = pos + a.size, lenB = pos + b.size;
  if (start == null)
    return null;
  let { a: endA, b: endB } = a.findDiffEnd(b, lenA, lenB);
  if (preferredSide == "end") {
    let adjust = Math.max(0, start - Math.min(endA, endB));
    preferredPos -= endA + adjust - start;
  }
  if (endA < start && lenA < lenB) {
    let move = preferredPos <= start && preferredPos >= endA ? start - preferredPos : 0;
    start -= move;
    endB = start + (endB - endA);
    endA = start;
  } else if (endB < start) {
    let move = preferredPos <= start && preferredPos >= endB ? start - preferredPos : 0;
    start -= move;
    endA = start + (endA - endB);
    endB = start;
  }
  return { start, endA, endB };
}
var EditorView = class {
  /**
  Create a view. `place` may be a DOM node that the editor should
  be appended to, a function that will place it into the document,
  or an object whose `mount` property holds the node to use as the
  document container. If it is `null`, the editor will not be
  added to the document.
  */
  constructor(place, props) {
    this._root = null;
    this.focused = false;
    this.trackWrites = null;
    this.mounted = false;
    this.markCursor = null;
    this.cursorWrapper = null;
    this.lastSelectedViewDesc = void 0;
    this.input = new InputState();
    this.prevDirectPlugins = [];
    this.pluginViews = [];
    this.requiresGeckoHackNode = false;
    this.dragging = null;
    this._props = props;
    this.state = props.state;
    this.directPlugins = props.plugins || [];
    this.directPlugins.forEach(checkStateComponent);
    this.dispatch = this.dispatch.bind(this);
    this.dom = place && place.mount || document.createElement("div");
    if (place) {
      if (place.appendChild)
        place.appendChild(this.dom);
      else if (typeof place == "function")
        place(this.dom);
      else if (place.mount)
        this.mounted = true;
    }
    this.editable = getEditable(this);
    updateCursorWrapper(this);
    this.nodeViews = buildNodeViews(this);
    this.docView = docViewDesc(this.state.doc, computeDocDeco(this), viewDecorations(this), this.dom, this);
    this.domObserver = new DOMObserver(this, (from2, to, typeOver, added) => readDOMChange(this, from2, to, typeOver, added));
    this.domObserver.start();
    initInput(this);
    this.updatePluginViews();
  }
  /**
  Holds `true` when a
  [composition](https://w3c.github.io/uievents/#events-compositionevents)
  is active.
  */
  get composing() {
    return this.input.composing;
  }
  /**
  The view's current [props](https://prosemirror.net/docs/ref/#view.EditorProps).
  */
  get props() {
    if (this._props.state != this.state) {
      let prev = this._props;
      this._props = {};
      for (let name2 in prev)
        this._props[name2] = prev[name2];
      this._props.state = this.state;
    }
    return this._props;
  }
  /**
  Update the view's props. Will immediately cause an update to
  the DOM.
  */
  update(props) {
    if (props.handleDOMEvents != this._props.handleDOMEvents)
      ensureListeners(this);
    let prevProps = this._props;
    this._props = props;
    if (props.plugins) {
      props.plugins.forEach(checkStateComponent);
      this.directPlugins = props.plugins;
    }
    this.updateStateInner(props.state, prevProps);
  }
  /**
  Update the view by updating existing props object with the object
  given as argument. Equivalent to `view.update(Object.assign({},
  view.props, props))`.
  */
  setProps(props) {
    let updated = {};
    for (let name2 in this._props)
      updated[name2] = this._props[name2];
    updated.state = this.state;
    for (let name2 in props)
      updated[name2] = props[name2];
    this.update(updated);
  }
  /**
  Update the editor's `state` prop, without touching any of the
  other props.
  */
  updateState(state) {
    this.updateStateInner(state, this._props);
  }
  updateStateInner(state, prevProps) {
    var _a2;
    let prev = this.state, redraw = false, updateSel = false;
    if (state.storedMarks && this.composing) {
      clearComposition(this);
      updateSel = true;
    }
    this.state = state;
    let pluginsChanged = prev.plugins != state.plugins || this._props.plugins != prevProps.plugins;
    if (pluginsChanged || this._props.plugins != prevProps.plugins || this._props.nodeViews != prevProps.nodeViews) {
      let nodeViews = buildNodeViews(this);
      if (changedNodeViews(nodeViews, this.nodeViews)) {
        this.nodeViews = nodeViews;
        redraw = true;
      }
    }
    if (pluginsChanged || prevProps.handleDOMEvents != this._props.handleDOMEvents) {
      ensureListeners(this);
    }
    this.editable = getEditable(this);
    updateCursorWrapper(this);
    let innerDeco = viewDecorations(this), outerDeco = computeDocDeco(this);
    let scroll = prev.plugins != state.plugins && !prev.doc.eq(state.doc) ? "reset" : state.scrollToSelection > prev.scrollToSelection ? "to selection" : "preserve";
    let updateDoc = redraw || !this.docView.matchesNode(state.doc, outerDeco, innerDeco);
    if (updateDoc || !state.selection.eq(prev.selection))
      updateSel = true;
    let oldScrollPos = scroll == "preserve" && updateSel && this.dom.style.overflowAnchor == null && storeScrollPos(this);
    if (updateSel) {
      this.domObserver.stop();
      let forceSelUpdate = updateDoc && (ie || chrome) && !this.composing && !prev.selection.empty && !state.selection.empty && selectionContextChanged(prev.selection, state.selection);
      if (updateDoc) {
        let chromeKludge = chrome ? this.trackWrites = this.domSelectionRange().focusNode : null;
        if (this.composing)
          this.input.compositionNode = findCompositionNode(this);
        if (redraw || !this.docView.update(state.doc, outerDeco, innerDeco, this)) {
          this.docView.updateOuterDeco(outerDeco);
          this.docView.destroy();
          this.docView = docViewDesc(state.doc, outerDeco, innerDeco, this.dom, this);
        }
        if (chromeKludge && (!this.trackWrites || !this.dom.contains(this.trackWrites)))
          forceSelUpdate = true;
      }
      let mouseDown = this.input.mouseDown;
      if (forceSelUpdate || !(mouseDown && this.domObserver.currentSelection.eq(this.domSelectionRange()) && anchorInRightPlace(this) && mouseDown.delaySelUpdate())) {
        selectionToDOM(this, forceSelUpdate);
      } else {
        syncNodeSelection(this, state.selection);
        this.domObserver.setCurSelection();
      }
      this.domObserver.start();
    }
    this.updatePluginViews(prev);
    if (((_a2 = this.dragging) === null || _a2 === void 0 ? void 0 : _a2.node) && !prev.doc.eq(state.doc))
      this.updateDraggedNode(this.dragging, prev);
    if (scroll == "reset") {
      this.dom.scrollTop = 0;
    } else if (scroll == "to selection") {
      this.scrollToSelection();
    } else if (oldScrollPos) {
      resetScrollPos(oldScrollPos);
    }
  }
  /**
  @internal
  */
  scrollToSelection() {
    let startDOM = this.domSelectionRange().focusNode;
    if (!startDOM || !contains(this.dom, startDOM)) ;
    else if (this.someProp("handleScrollToSelection", (f) => f(this))) ;
    else if (this.state.selection instanceof NodeSelection) {
      let target = this.docView.domAfterPos(this.state.selection.from);
      if (isElt(target))
        scrollRectIntoView(this, target.getBoundingClientRect(), startDOM);
    } else {
      scrollRectIntoView(this, this.coordsAtPos(this.state.selection.head, 1), startDOM);
    }
  }
  destroyPluginViews() {
    let view;
    while (view = this.pluginViews.pop())
      if (view.destroy)
        view.destroy();
  }
  updatePluginViews(prevState) {
    if (!prevState || prevState.plugins != this.state.plugins || this.directPlugins != this.prevDirectPlugins) {
      this.prevDirectPlugins = this.directPlugins;
      this.destroyPluginViews();
      for (let i2 = 0; i2 < this.directPlugins.length; i2++) {
        let plugin = this.directPlugins[i2];
        if (plugin.spec.view)
          this.pluginViews.push(plugin.spec.view(this));
      }
      for (let i2 = 0; i2 < this.state.plugins.length; i2++) {
        let plugin = this.state.plugins[i2];
        if (plugin.spec.view)
          this.pluginViews.push(plugin.spec.view(this));
      }
    } else {
      for (let i2 = 0; i2 < this.pluginViews.length; i2++) {
        let pluginView = this.pluginViews[i2];
        if (pluginView.update)
          pluginView.update(this, prevState);
      }
    }
  }
  updateDraggedNode(dragging, prev) {
    let sel = dragging.node, found2 = -1;
    if (sel.from < this.state.doc.content.size && this.state.doc.nodeAt(sel.from) == sel.node) {
      found2 = sel.from;
    } else {
      let movedPos = sel.from + (this.state.doc.content.size - prev.doc.content.size);
      let moved = movedPos > 0 && movedPos < this.state.doc.content.size && this.state.doc.nodeAt(movedPos);
      if (moved == sel.node)
        found2 = movedPos;
    }
    this.dragging = new Dragging(dragging.slice, dragging.move, found2 < 0 ? void 0 : NodeSelection.create(this.state.doc, found2));
  }
  someProp(propName, f) {
    let prop = this._props && this._props[propName], value;
    if (prop != null && (value = f ? f(prop) : prop))
      return value;
    for (let i2 = 0; i2 < this.directPlugins.length; i2++) {
      let prop2 = this.directPlugins[i2].props[propName];
      if (prop2 != null && (value = f ? f(prop2) : prop2))
        return value;
    }
    let plugins = this.state.plugins;
    if (plugins)
      for (let i2 = 0; i2 < plugins.length; i2++) {
        let prop2 = plugins[i2].props[propName];
        if (prop2 != null && (value = f ? f(prop2) : prop2))
          return value;
      }
  }
  /**
  Query whether the view has focus.
  */
  hasFocus() {
    if (ie) {
      let node = this.root.activeElement;
      if (node == this.dom)
        return true;
      if (!node || !this.dom.contains(node))
        return false;
      while (node && this.dom != node && this.dom.contains(node)) {
        if (node.contentEditable == "false")
          return false;
        node = node.parentElement;
      }
      return true;
    }
    return this.root.activeElement == this.dom;
  }
  /**
  Focus the editor.
  */
  focus() {
    this.domObserver.stop();
    if (this.editable)
      focusPreventScroll(this.dom);
    selectionToDOM(this);
    this.domObserver.start();
  }
  /**
  Get the document root in which the editor exists. This will
  usually be the top-level `document`, but might be a [shadow
  DOM](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Shadow_DOM)
  root if the editor is inside one.
  */
  get root() {
    let cached2 = this._root;
    if (cached2 == null)
      for (let search = this.dom.parentNode; search; search = search.parentNode) {
        if (search.nodeType == 9 || search.nodeType == 11 && search.host) {
          if (!search.getSelection)
            Object.getPrototypeOf(search).getSelection = () => search.ownerDocument.getSelection();
          return this._root = search;
        }
      }
    return cached2 || document;
  }
  /**
  When an existing editor view is moved to a new document or
  shadow tree, call this to make it recompute its root.
  */
  updateRoot() {
    this._root = null;
  }
  /**
  Given a pair of viewport coordinates, return the document
  position that corresponds to them. May return null if the given
  coordinates aren't inside of the editor. When an object is
  returned, its `pos` property is the position nearest to the
  coordinates, and its `inside` property holds the position of the
  inner node that the position falls inside of, or -1 if it is at
  the top level, not in any node.
  */
  posAtCoords(coords) {
    return posAtCoords(this, coords);
  }
  /**
  Returns the viewport rectangle at a given document position.
  `left` and `right` will be the same number, as this returns a
  flat cursor-ish rectangle. If the position is between two things
  that aren't directly adjacent, `side` determines which element
  is used. When < 0, the element before the position is used,
  otherwise the element after.
  */
  coordsAtPos(pos, side = 1) {
    return coordsAtPos(this, pos, side);
  }
  /**
  Find the DOM position that corresponds to the given document
  position. When `side` is negative, find the position as close as
  possible to the content before the position. When positive,
  prefer positions close to the content after the position. When
  zero, prefer as shallow a position as possible.

  Note that you should **not** mutate the editor's internal DOM,
  only inspect it (and even that is usually not necessary).
  */
  domAtPos(pos, side = 0) {
    return this.docView.domFromPos(pos, side);
  }
  /**
  Find the DOM node that represents the document node after the
  given position. May return `null` when the position doesn't point
  in front of a node or if the node is inside an opaque node view.

  This is intended to be able to call things like
  `getBoundingClientRect` on that DOM node. Do **not** mutate the
  editor DOM directly, or add styling this way, since that will be
  immediately overriden by the editor as it redraws the node.
  */
  nodeDOM(pos) {
    let desc = this.docView.descAt(pos);
    return desc ? desc.nodeDOM : null;
  }
  /**
  Find the document position that corresponds to a given DOM
  position. (Whenever possible, it is preferable to inspect the
  document structure directly, rather than poking around in the
  DOM, but sometimes—for example when interpreting an event
  target—you don't have a choice.)

  The `bias` parameter can be used to influence which side of a DOM
  node to use when the position is inside a leaf node.
  */
  posAtDOM(node, offset, bias = -1) {
    let pos = this.docView.posFromDOM(node, offset, bias);
    if (pos == null)
      throw new RangeError("DOM position not inside the editor");
    return pos;
  }
  /**
  Find out whether the selection is at the end of a textblock when
  moving in a given direction. When, for example, given `"left"`,
  it will return true if moving left from the current cursor
  position would leave that position's parent textblock. Will apply
  to the view's current state by default, but it is possible to
  pass a different state.
  */
  endOfTextblock(dir, state) {
    return endOfTextblock(this, state || this.state, dir);
  }
  /**
  Run the editor's paste logic with the given HTML string. The
  `event`, if given, will be passed to the
  [`handlePaste`](https://prosemirror.net/docs/ref/#view.EditorProps.handlePaste) hook.
  */
  pasteHTML(html, event) {
    return doPaste(this, "", html, false, event || new ClipboardEvent("paste"));
  }
  /**
  Run the editor's paste logic with the given plain-text input.
  */
  pasteText(text, event) {
    return doPaste(this, text, null, true, event || new ClipboardEvent("paste"));
  }
  /**
  Serialize the given slice as it would be if it was copied from
  this editor. Returns a DOM element that contains a
  representation of the slice as its children, a textual
  representation, and the transformed slice (which can be
  different from the given input due to hooks like
  [`transformCopied`](https://prosemirror.net/docs/ref/#view.EditorProps.transformCopied)).
  */
  serializeForClipboard(slice2) {
    return serializeForClipboard(this, slice2);
  }
  /**
  Removes the editor from the DOM and destroys all [node
  views](https://prosemirror.net/docs/ref/#view.NodeView).
  */
  destroy() {
    if (!this.docView)
      return;
    destroyInput(this);
    this.destroyPluginViews();
    if (this.mounted) {
      this.docView.update(this.state.doc, [], viewDecorations(this), this);
      this.dom.textContent = "";
    } else if (this.dom.parentNode) {
      this.dom.parentNode.removeChild(this.dom);
    }
    this.docView.destroy();
    this.docView = null;
    clearReusedRange();
  }
  /**
  This is true when the view has been
  [destroyed](https://prosemirror.net/docs/ref/#view.EditorView.destroy) (and thus should not be
  used anymore).
  */
  get isDestroyed() {
    return this.docView == null;
  }
  /**
  Used for testing.
  */
  dispatchEvent(event) {
    return dispatchEvent(this, event);
  }
  /**
  @internal
  */
  domSelectionRange() {
    let sel = this.dom.isConnected !== false && this.domSelection();
    if (!sel)
      return { focusNode: null, focusOffset: 0, anchorNode: null, anchorOffset: 0 };
    return safari && this.root.nodeType === 11 && deepActiveElement(this.dom.ownerDocument) == this.dom && safariShadowSelectionRange(this, sel) || sel;
  }
  /**
  @internal
  */
  domSelection() {
    return this.root.getSelection();
  }
};
EditorView.prototype.dispatch = function(tr) {
  let dispatchTransaction = this._props.dispatchTransaction;
  if (dispatchTransaction)
    dispatchTransaction.call(this, tr);
  else
    this.updateState(this.state.apply(tr));
};
function computeDocDeco(view) {
  let attrs = /* @__PURE__ */ Object.create(null);
  attrs.class = "ProseMirror";
  attrs.contenteditable = String(view.editable);
  view.someProp("attributes", (value) => {
    if (typeof value == "function")
      value = value(view.state);
    if (value)
      for (let attr in value) {
        if (attr == "class")
          attrs.class += " " + value[attr];
        else if (attr == "style")
          attrs.style = (attrs.style ? attrs.style + ";" : "") + value[attr];
        else if (!attrs[attr] && attr != "contenteditable" && attr != "nodeName")
          attrs[attr] = String(value[attr]);
      }
  });
  if (!attrs.translate)
    attrs.translate = "no";
  return [Decoration.node(0, view.state.doc.content.size, attrs)];
}
function updateCursorWrapper(view) {
  if (view.markCursor) {
    let dom = document.createElement("img");
    dom.className = "ProseMirror-separator";
    dom.setAttribute("mark-placeholder", "true");
    dom.setAttribute("alt", "");
    view.cursorWrapper = { dom, deco: Decoration.widget(view.state.selection.from, dom, { raw: true, marks: view.markCursor }) };
  } else {
    view.cursorWrapper = null;
  }
}
function getEditable(view) {
  return !view.someProp("editable", (value) => value(view.state) === false);
}
function selectionContextChanged(sel1, sel2) {
  let depth = Math.min(sel1.$anchor.sharedDepth(sel1.head), sel2.$anchor.sharedDepth(sel2.head));
  return sel1.$anchor.start(depth) != sel2.$anchor.start(depth);
}
function buildNodeViews(view) {
  let result = /* @__PURE__ */ Object.create(null);
  function add(obj) {
    for (let prop in obj)
      if (!Object.prototype.hasOwnProperty.call(result, prop))
        result[prop] = obj[prop];
  }
  view.someProp("nodeViews", add);
  view.someProp("markViews", add);
  return result;
}
function changedNodeViews(a, b) {
  let nA = 0, nB = 0;
  for (let prop in a) {
    if (a[prop] != b[prop])
      return true;
    nA++;
  }
  for (let _ in b)
    nB++;
  return nA != nB;
}
function checkStateComponent(plugin) {
  if (plugin.spec.state || plugin.spec.filterTransaction || plugin.spec.appendTransaction)
    throw new RangeError("Plugins passed directly to the view must not have a state component");
}

// node_modules/rope-sequence/dist/index.js
var GOOD_LEAF_SIZE = 200;
var RopeSequence = function RopeSequence2() {
};
RopeSequence.prototype.append = function append(other) {
  if (!other.length) {
    return this;
  }
  other = RopeSequence.from(other);
  return !this.length && other || other.length < GOOD_LEAF_SIZE && this.leafAppend(other) || this.length < GOOD_LEAF_SIZE && other.leafPrepend(this) || this.appendInner(other);
};
RopeSequence.prototype.prepend = function prepend(other) {
  if (!other.length) {
    return this;
  }
  return RopeSequence.from(other).append(this);
};
RopeSequence.prototype.appendInner = function appendInner(other) {
  return new Append(this, other);
};
RopeSequence.prototype.slice = function slice(from2, to) {
  if (from2 === void 0) from2 = 0;
  if (to === void 0) to = this.length;
  if (from2 >= to) {
    return RopeSequence.empty;
  }
  return this.sliceInner(Math.max(0, from2), Math.min(this.length, to));
};
RopeSequence.prototype.get = function get(i2) {
  if (i2 < 0 || i2 >= this.length) {
    return void 0;
  }
  return this.getInner(i2);
};
RopeSequence.prototype.forEach = function forEach(f, from2, to) {
  if (from2 === void 0) from2 = 0;
  if (to === void 0) to = this.length;
  if (from2 <= to) {
    this.forEachInner(f, from2, to, 0);
  } else {
    this.forEachInvertedInner(f, from2, to, 0);
  }
};
RopeSequence.prototype.map = function map(f, from2, to) {
  if (from2 === void 0) from2 = 0;
  if (to === void 0) to = this.length;
  var result = [];
  this.forEach(function(elt, i2) {
    return result.push(f(elt, i2));
  }, from2, to);
  return result;
};
RopeSequence.from = function from(values) {
  if (values instanceof RopeSequence) {
    return values;
  }
  return values && values.length ? new Leaf(values) : RopeSequence.empty;
};
var Leaf = /* @__PURE__ */ (function(RopeSequence3) {
  function Leaf2(values) {
    RopeSequence3.call(this);
    this.values = values;
  }
  if (RopeSequence3) Leaf2.__proto__ = RopeSequence3;
  Leaf2.prototype = Object.create(RopeSequence3 && RopeSequence3.prototype);
  Leaf2.prototype.constructor = Leaf2;
  var prototypeAccessors = { length: { configurable: true }, depth: { configurable: true } };
  Leaf2.prototype.flatten = function flatten() {
    return this.values;
  };
  Leaf2.prototype.sliceInner = function sliceInner(from2, to) {
    if (from2 == 0 && to == this.length) {
      return this;
    }
    return new Leaf2(this.values.slice(from2, to));
  };
  Leaf2.prototype.getInner = function getInner(i2) {
    return this.values[i2];
  };
  Leaf2.prototype.forEachInner = function forEachInner(f, from2, to, start) {
    for (var i2 = from2; i2 < to; i2++) {
      if (f(this.values[i2], start + i2) === false) {
        return false;
      }
    }
  };
  Leaf2.prototype.forEachInvertedInner = function forEachInvertedInner(f, from2, to, start) {
    for (var i2 = from2 - 1; i2 >= to; i2--) {
      if (f(this.values[i2], start + i2) === false) {
        return false;
      }
    }
  };
  Leaf2.prototype.leafAppend = function leafAppend(other) {
    if (this.length + other.length <= GOOD_LEAF_SIZE) {
      return new Leaf2(this.values.concat(other.flatten()));
    }
  };
  Leaf2.prototype.leafPrepend = function leafPrepend(other) {
    if (this.length + other.length <= GOOD_LEAF_SIZE) {
      return new Leaf2(other.flatten().concat(this.values));
    }
  };
  prototypeAccessors.length.get = function() {
    return this.values.length;
  };
  prototypeAccessors.depth.get = function() {
    return 0;
  };
  Object.defineProperties(Leaf2.prototype, prototypeAccessors);
  return Leaf2;
})(RopeSequence);
RopeSequence.empty = new Leaf([]);
var Append = /* @__PURE__ */ (function(RopeSequence3) {
  function Append2(left, right) {
    RopeSequence3.call(this);
    this.left = left;
    this.right = right;
    this.length = left.length + right.length;
    this.depth = Math.max(left.depth, right.depth) + 1;
  }
  if (RopeSequence3) Append2.__proto__ = RopeSequence3;
  Append2.prototype = Object.create(RopeSequence3 && RopeSequence3.prototype);
  Append2.prototype.constructor = Append2;
  Append2.prototype.flatten = function flatten() {
    return this.left.flatten().concat(this.right.flatten());
  };
  Append2.prototype.getInner = function getInner(i2) {
    return i2 < this.left.length ? this.left.get(i2) : this.right.get(i2 - this.left.length);
  };
  Append2.prototype.forEachInner = function forEachInner(f, from2, to, start) {
    var leftLen = this.left.length;
    if (from2 < leftLen && this.left.forEachInner(f, from2, Math.min(to, leftLen), start) === false) {
      return false;
    }
    if (to > leftLen && this.right.forEachInner(f, Math.max(from2 - leftLen, 0), Math.min(this.length, to) - leftLen, start + leftLen) === false) {
      return false;
    }
  };
  Append2.prototype.forEachInvertedInner = function forEachInvertedInner(f, from2, to, start) {
    var leftLen = this.left.length;
    if (from2 > leftLen && this.right.forEachInvertedInner(f, from2 - leftLen, Math.max(to, leftLen) - leftLen, start + leftLen) === false) {
      return false;
    }
    if (to < leftLen && this.left.forEachInvertedInner(f, Math.min(from2, leftLen), to, start) === false) {
      return false;
    }
  };
  Append2.prototype.sliceInner = function sliceInner(from2, to) {
    if (from2 == 0 && to == this.length) {
      return this;
    }
    var leftLen = this.left.length;
    if (to <= leftLen) {
      return this.left.slice(from2, to);
    }
    if (from2 >= leftLen) {
      return this.right.slice(from2 - leftLen, to - leftLen);
    }
    return this.left.slice(from2, leftLen).append(this.right.slice(0, to - leftLen));
  };
  Append2.prototype.leafAppend = function leafAppend(other) {
    var inner = this.right.leafAppend(other);
    if (inner) {
      return new Append2(this.left, inner);
    }
  };
  Append2.prototype.leafPrepend = function leafPrepend(other) {
    var inner = this.left.leafPrepend(other);
    if (inner) {
      return new Append2(inner, this.right);
    }
  };
  Append2.prototype.appendInner = function appendInner2(other) {
    if (this.left.depth >= Math.max(this.right.depth, other.depth) + 1) {
      return new Append2(this.left, new Append2(this.right, other));
    }
    return new Append2(this, other);
  };
  return Append2;
})(RopeSequence);
var dist_default2 = RopeSequence;

// node_modules/prosemirror-history/dist/index.js
var max_empty_items = 500;
var Branch = class _Branch {
  constructor(items, eventCount) {
    this.items = items;
    this.eventCount = eventCount;
  }
  // Pop the latest event off the branch's history and apply it
  // to a document transform.
  popEvent(state, preserveItems) {
    if (this.eventCount == 0)
      return null;
    let end = this.items.length;
    for (; ; end--) {
      let next = this.items.get(end - 1);
      if (next.selection) {
        --end;
        break;
      }
    }
    let remap, mapFrom;
    if (preserveItems) {
      remap = this.remapping(end, this.items.length);
      mapFrom = remap.maps.length;
    }
    let transform = state.tr;
    let selection, remaining;
    let addAfter = [], addBefore = [];
    this.items.forEach((item, i2) => {
      if (!item.step) {
        if (!remap) {
          remap = this.remapping(end, i2 + 1);
          mapFrom = remap.maps.length;
        }
        mapFrom--;
        addBefore.push(item);
        return;
      }
      if (remap) {
        addBefore.push(new Item(item.map));
        let step = item.step.map(remap.slice(mapFrom)), map2;
        if (step && transform.maybeStep(step).doc) {
          map2 = transform.mapping.maps[transform.mapping.maps.length - 1];
          addAfter.push(new Item(map2, void 0, void 0, addAfter.length + addBefore.length));
        }
        mapFrom--;
        if (map2)
          remap.appendMap(map2, mapFrom);
      } else {
        transform.maybeStep(item.step);
      }
      if (item.selection) {
        selection = remap ? item.selection.map(remap.slice(mapFrom)) : item.selection;
        remaining = new _Branch(this.items.slice(0, end).append(addBefore.reverse().concat(addAfter)), this.eventCount - 1);
        return false;
      }
    }, this.items.length, 0);
    return { remaining, transform, selection };
  }
  // Create a new branch with the given transform added.
  addTransform(transform, selection, histOptions, preserveItems) {
    let newItems = [], eventCount = this.eventCount;
    let oldItems = this.items, lastItem = !preserveItems && oldItems.length ? oldItems.get(oldItems.length - 1) : null;
    for (let i2 = 0; i2 < transform.steps.length; i2++) {
      let step = transform.steps[i2].invert(transform.docs[i2]);
      let item = new Item(transform.mapping.maps[i2], step, selection), merged;
      if (merged = lastItem && lastItem.merge(item)) {
        item = merged;
        if (i2)
          newItems.pop();
        else
          oldItems = oldItems.slice(0, oldItems.length - 1);
      }
      newItems.push(item);
      if (selection) {
        eventCount++;
        selection = void 0;
      }
      if (!preserveItems)
        lastItem = item;
    }
    let overflow = eventCount - histOptions.depth;
    if (overflow > DEPTH_OVERFLOW) {
      oldItems = cutOffEvents(oldItems, overflow);
      eventCount -= overflow;
    }
    return new _Branch(oldItems.append(newItems), eventCount);
  }
  remapping(from2, to) {
    let maps = new Mapping();
    this.items.forEach((item, i2) => {
      let mirrorPos = item.mirrorOffset != null && i2 - item.mirrorOffset >= from2 ? maps.maps.length - item.mirrorOffset : void 0;
      maps.appendMap(item.map, mirrorPos);
    }, from2, to);
    return maps;
  }
  addMaps(array2) {
    if (this.eventCount == 0)
      return this;
    return new _Branch(this.items.append(array2.map((map2) => new Item(map2))), this.eventCount);
  }
  // When the collab module receives remote changes, the history has
  // to know about those, so that it can adjust the steps that were
  // rebased on top of the remote changes, and include the position
  // maps for the remote changes in its array of items.
  rebased(rebasedTransform, rebasedCount) {
    if (!this.eventCount)
      return this;
    rebasedCount = Math.min(this.items.length, rebasedCount);
    let rebasedItems = [], start = this.items.length - rebasedCount;
    let mapping = rebasedTransform.mapping;
    let newUntil = rebasedTransform.steps.length;
    let eventCount = this.eventCount;
    this.items.forEach((item) => {
      if (item.selection)
        eventCount--;
    }, start);
    let iRebased = rebasedCount;
    this.items.forEach((item) => {
      let pos = mapping.getMirror(--iRebased);
      if (pos == null)
        return;
      newUntil = Math.min(newUntil, pos);
      let map2 = mapping.maps[pos];
      if (item.step) {
        let step = rebasedTransform.steps[pos].invert(rebasedTransform.docs[pos]);
        let selection = item.selection && item.selection.map(mapping.slice(iRebased + 1, pos));
        if (selection)
          eventCount++;
        rebasedItems.push(new Item(map2, step, selection));
      } else {
        rebasedItems.push(new Item(map2));
      }
    }, start);
    let newMaps = [];
    for (let i2 = rebasedCount; i2 < newUntil; i2++)
      newMaps.push(new Item(mapping.maps[i2]));
    let items = this.items.slice(0, start).append(newMaps).append(rebasedItems);
    let branch = new _Branch(items, eventCount);
    if (branch.emptyItemCount() > max_empty_items)
      branch = branch.compress(this.items.length - rebasedItems.length);
    return branch;
  }
  emptyItemCount() {
    let count = 0;
    this.items.forEach((item) => {
      if (!item.step)
        count++;
    });
    return count;
  }
  // Compressing a branch means rewriting it to push the air (map-only
  // items) out. During collaboration, these naturally accumulate
  // because each remote change adds one. The `upto` argument is used
  // to ensure that only the items below a given level are compressed,
  // because `rebased` relies on a clean, untouched set of items in
  // order to associate old items with rebased steps.
  compress(upto = this.items.length) {
    let remap = this.remapping(0, upto), mapFrom = remap.maps.length;
    let items = [], events = 0;
    this.items.forEach((item, i2) => {
      if (i2 >= upto) {
        items.push(item);
        if (item.selection)
          events++;
      } else if (item.step) {
        let step = item.step.map(remap.slice(mapFrom)), map2 = step && step.getMap();
        mapFrom--;
        if (map2)
          remap.appendMap(map2, mapFrom);
        if (step) {
          let selection = item.selection && item.selection.map(remap.slice(mapFrom));
          if (selection)
            events++;
          let newItem = new Item(map2.invert(), step, selection), merged, last = items.length - 1;
          if (merged = items.length && items[last].merge(newItem))
            items[last] = merged;
          else
            items.push(newItem);
        }
      } else if (item.map) {
        mapFrom--;
      }
    }, this.items.length, 0);
    return new _Branch(dist_default2.from(items.reverse()), events);
  }
};
Branch.empty = new Branch(dist_default2.empty, 0);
function cutOffEvents(items, n) {
  let cutPoint;
  items.forEach((item, i2) => {
    if (item.selection && n-- == 0) {
      cutPoint = i2;
      return false;
    }
  });
  return items.slice(cutPoint);
}
var Item = class _Item {
  constructor(map2, step, selection, mirrorOffset) {
    this.map = map2;
    this.step = step;
    this.selection = selection;
    this.mirrorOffset = mirrorOffset;
  }
  merge(other) {
    if (this.step && other.step && !other.selection) {
      let step = other.step.merge(this.step);
      if (step)
        return new _Item(step.getMap().invert(), step, this.selection);
    }
  }
};
var HistoryState = class {
  constructor(done, undone, prevRanges, prevTime, prevComposition) {
    this.done = done;
    this.undone = undone;
    this.prevRanges = prevRanges;
    this.prevTime = prevTime;
    this.prevComposition = prevComposition;
  }
};
var DEPTH_OVERFLOW = 20;
function applyTransaction(history2, state, tr, options) {
  let historyTr = tr.getMeta(historyKey), rebased;
  if (historyTr)
    return historyTr.historyState;
  if (tr.getMeta(closeHistoryKey))
    history2 = new HistoryState(history2.done, history2.undone, null, 0, -1);
  let appended = tr.getMeta("appendedTransaction");
  if (tr.steps.length == 0) {
    return history2;
  } else if (appended && appended.getMeta(historyKey)) {
    if (appended.getMeta(historyKey).redo)
      return new HistoryState(history2.done.addTransform(tr, void 0, options, mustPreserveItems(state)), history2.undone, rangesFor(tr.mapping.maps), history2.prevTime, history2.prevComposition);
    else
      return new HistoryState(history2.done, history2.undone.addTransform(tr, void 0, options, mustPreserveItems(state)), null, history2.prevTime, history2.prevComposition);
  } else if (tr.getMeta("addToHistory") !== false && !(appended && appended.getMeta("addToHistory") === false)) {
    let composition = tr.getMeta("composition");
    let newGroup = history2.prevTime == 0 || !appended && history2.prevComposition != composition && (history2.prevTime < (tr.time || 0) - options.newGroupDelay || !isAdjacentTo(tr, history2.prevRanges));
    let prevRanges = appended ? mapRanges(history2.prevRanges, tr.mapping) : rangesFor(tr.mapping.maps);
    return new HistoryState(history2.done.addTransform(tr, newGroup ? state.selection.getBookmark() : void 0, options, mustPreserveItems(state)), Branch.empty, prevRanges, tr.time, composition == null ? history2.prevComposition : composition);
  } else if (rebased = tr.getMeta("rebased")) {
    return new HistoryState(history2.done.rebased(tr, rebased), history2.undone.rebased(tr, rebased), mapRanges(history2.prevRanges, tr.mapping), history2.prevTime, history2.prevComposition);
  } else {
    return new HistoryState(history2.done.addMaps(tr.mapping.maps), history2.undone.addMaps(tr.mapping.maps), mapRanges(history2.prevRanges, tr.mapping), history2.prevTime, history2.prevComposition);
  }
}
function isAdjacentTo(transform, prevRanges) {
  if (!prevRanges)
    return false;
  if (!transform.docChanged)
    return true;
  let adjacent = false;
  transform.mapping.maps[0].forEach((start, end) => {
    for (let i2 = 0; i2 < prevRanges.length; i2 += 2)
      if (start <= prevRanges[i2 + 1] && end >= prevRanges[i2])
        adjacent = true;
  });
  return adjacent;
}
function rangesFor(maps) {
  let result = [];
  for (let i2 = maps.length - 1; i2 >= 0 && result.length == 0; i2--)
    maps[i2].forEach((_from, _to, from2, to) => result.push(from2, to));
  return result;
}
function mapRanges(ranges, mapping) {
  if (!ranges)
    return null;
  let result = [];
  for (let i2 = 0; i2 < ranges.length; i2 += 2) {
    let from2 = mapping.map(ranges[i2], 1), to = mapping.map(ranges[i2 + 1], -1);
    if (from2 <= to)
      result.push(from2, to);
  }
  return result;
}
function histTransaction(history2, state, redo2) {
  let preserveItems = mustPreserveItems(state);
  let histOptions = historyKey.get(state).spec.config;
  let pop = (redo2 ? history2.undone : history2.done).popEvent(state, preserveItems);
  if (!pop)
    return null;
  let selection = pop.selection.resolve(pop.transform.doc);
  let added = (redo2 ? history2.done : history2.undone).addTransform(pop.transform, state.selection.getBookmark(), histOptions, preserveItems);
  let newHist = new HistoryState(redo2 ? added : pop.remaining, redo2 ? pop.remaining : added, null, 0, -1);
  return pop.transform.setSelection(selection).setMeta(historyKey, { redo: redo2, historyState: newHist });
}
var cachedPreserveItems = false;
var cachedPreserveItemsPlugins = null;
function mustPreserveItems(state) {
  let plugins = state.plugins;
  if (cachedPreserveItemsPlugins != plugins) {
    cachedPreserveItems = false;
    cachedPreserveItemsPlugins = plugins;
    for (let i2 = 0; i2 < plugins.length; i2++)
      if (plugins[i2].spec.historyPreserveItems) {
        cachedPreserveItems = true;
        break;
      }
  }
  return cachedPreserveItems;
}
function closeHistory(tr) {
  return tr.setMeta(closeHistoryKey, true);
}
var historyKey = new PluginKey("history");
var closeHistoryKey = new PluginKey("closeHistory");
function history(config2 = {}) {
  config2 = {
    depth: config2.depth || 100,
    newGroupDelay: config2.newGroupDelay || 500
  };
  return new Plugin({
    key: historyKey,
    state: {
      init() {
        return new HistoryState(Branch.empty, Branch.empty, null, 0, -1);
      },
      apply(tr, hist, state) {
        return applyTransaction(hist, state, tr, config2);
      }
    },
    config: config2,
    props: {
      handleDOMEvents: {
        beforeinput(view, e) {
          let inputType = e.inputType;
          let command = inputType == "historyUndo" ? undo : inputType == "historyRedo" ? redo : null;
          if (!command || !view.editable)
            return false;
          e.preventDefault();
          return command(view.state, view.dispatch);
        }
      }
    }
  });
}
function buildCommand(redo2, scroll) {
  return (state, dispatch) => {
    let hist = historyKey.getState(state);
    if (!hist || (redo2 ? hist.undone : hist.done).eventCount == 0)
      return false;
    if (dispatch) {
      let tr = histTransaction(hist, state, redo2);
      if (tr)
        dispatch(scroll ? tr.scrollIntoView() : tr);
    }
    return true;
  };
}
var undo = buildCommand(false, true);
var redo = buildCommand(true, true);
var undoNoScroll = buildCommand(false, false);
var redoNoScroll = buildCommand(true, false);

// node_modules/w3c-keyname/index.js
var base = {
  8: "Backspace",
  9: "Tab",
  10: "Enter",
  12: "NumLock",
  13: "Enter",
  16: "Shift",
  17: "Control",
  18: "Alt",
  20: "CapsLock",
  27: "Escape",
  32: " ",
  33: "PageUp",
  34: "PageDown",
  35: "End",
  36: "Home",
  37: "ArrowLeft",
  38: "ArrowUp",
  39: "ArrowRight",
  40: "ArrowDown",
  44: "PrintScreen",
  45: "Insert",
  46: "Delete",
  59: ";",
  61: "=",
  91: "Meta",
  92: "Meta",
  106: "*",
  107: "+",
  108: ",",
  109: "-",
  110: ".",
  111: "/",
  144: "NumLock",
  145: "ScrollLock",
  160: "Shift",
  161: "Shift",
  162: "Control",
  163: "Control",
  164: "Alt",
  165: "Alt",
  173: "-",
  186: ";",
  187: "=",
  188: ",",
  189: "-",
  190: ".",
  191: "/",
  192: "`",
  219: "[",
  220: "\\",
  221: "]",
  222: "'"
};
var shift = {
  48: ")",
  49: "!",
  50: "@",
  51: "#",
  52: "$",
  53: "%",
  54: "^",
  55: "&",
  56: "*",
  57: "(",
  59: ":",
  61: "+",
  173: "_",
  186: ":",
  187: "+",
  188: "<",
  189: "_",
  190: ">",
  191: "?",
  192: "~",
  219: "{",
  220: "|",
  221: "}",
  222: '"'
};
var mac3 = typeof navigator != "undefined" && /Mac/.test(navigator.platform);
var ie2 = typeof navigator != "undefined" && /MSIE \d|Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(navigator.userAgent);
for (i = 0; i < 10; i++) base[48 + i] = base[96 + i] = String(i);
var i;
for (i = 1; i <= 24; i++) base[i + 111] = "F" + i;
var i;
for (i = 65; i <= 90; i++) {
  base[i] = String.fromCharCode(i + 32);
  shift[i] = String.fromCharCode(i);
}
var i;
for (code in base) if (!shift.hasOwnProperty(code)) shift[code] = base[code];
var code;
function keyName(event) {
  var ignoreKey = mac3 && event.metaKey && event.shiftKey && !event.ctrlKey && !event.altKey || ie2 && event.shiftKey && event.key && event.key.length == 1 || event.key == "Unidentified";
  var name2 = !ignoreKey && event.key || (event.shiftKey ? shift : base)[event.keyCode] || event.key || "Unidentified";
  if (name2 == "Esc") name2 = "Escape";
  if (name2 == "Del") name2 = "Delete";
  if (name2 == "Left") name2 = "ArrowLeft";
  if (name2 == "Up") name2 = "ArrowUp";
  if (name2 == "Right") name2 = "ArrowRight";
  if (name2 == "Down") name2 = "ArrowDown";
  return name2;
}

// node_modules/prosemirror-keymap/dist/index.js
var mac4 = typeof navigator != "undefined" && /Mac|iP(hone|[oa]d)/.test(navigator.platform);
var windows2 = typeof navigator != "undefined" && /Win/.test(navigator.platform);
function normalizeKeyName(name2) {
  let parts = name2.split(/-(?!$)/), result = parts[parts.length - 1];
  if (result == "Space")
    result = " ";
  let alt, ctrl, shift2, meta2;
  for (let i2 = 0; i2 < parts.length - 1; i2++) {
    let mod = parts[i2];
    if (/^(cmd|meta|m)$/i.test(mod))
      meta2 = true;
    else if (/^a(lt)?$/i.test(mod))
      alt = true;
    else if (/^(c|ctrl|control)$/i.test(mod))
      ctrl = true;
    else if (/^s(hift)?$/i.test(mod))
      shift2 = true;
    else if (/^mod$/i.test(mod)) {
      if (mac4)
        meta2 = true;
      else
        ctrl = true;
    } else
      throw new Error("Unrecognized modifier name: " + mod);
  }
  if (alt)
    result = "Alt-" + result;
  if (ctrl)
    result = "Ctrl-" + result;
  if (meta2)
    result = "Meta-" + result;
  if (shift2)
    result = "Shift-" + result;
  return result;
}
function normalize(map2) {
  let copy2 = /* @__PURE__ */ Object.create(null);
  for (let prop in map2)
    copy2[normalizeKeyName(prop)] = map2[prop];
  return copy2;
}
function modifiers(name2, event, shift2 = true) {
  if (event.altKey)
    name2 = "Alt-" + name2;
  if (event.ctrlKey)
    name2 = "Ctrl-" + name2;
  if (event.metaKey)
    name2 = "Meta-" + name2;
  if (shift2 && event.shiftKey)
    name2 = "Shift-" + name2;
  return name2;
}
function keymap(bindings) {
  return new Plugin({ props: { handleKeyDown: keydownHandler(bindings) } });
}
function keydownHandler(bindings) {
  let map2 = normalize(bindings);
  return function(view, event) {
    let name2 = keyName(event), baseName, direct = map2[modifiers(name2, event)];
    if (direct && direct(view.state, view.dispatch, view))
      return true;
    if (name2.length == 1 && name2 != " ") {
      if (event.shiftKey) {
        let noShift = map2[modifiers(name2, event, false)];
        if (noShift && noShift(view.state, view.dispatch, view))
          return true;
      }
      if ((event.altKey || event.metaKey || event.ctrlKey) && // Ctrl-Alt may be used for AltGr on Windows
      !(windows2 && event.ctrlKey && event.altKey) && (baseName = base[event.keyCode]) && baseName != name2) {
        let fromCode = map2[modifiers(baseName, event)];
        if (fromCode && fromCode(view.state, view.dispatch, view))
          return true;
      }
    }
    return false;
  };
}

// node_modules/prosemirror-commands/dist/index.js
var deleteSelection = (state, dispatch) => {
  if (state.selection.empty)
    return false;
  if (dispatch)
    dispatch(state.tr.deleteSelection().scrollIntoView());
  return true;
};
function atBlockStart(state, view) {
  let { $cursor } = state.selection;
  if (!$cursor || (view ? !view.endOfTextblock("backward", state) : $cursor.parentOffset > 0))
    return null;
  return $cursor;
}
var joinBackward = (state, dispatch, view) => {
  let $cursor = atBlockStart(state, view);
  if (!$cursor)
    return false;
  let $cut = findCutBefore($cursor);
  if (!$cut) {
    let range = $cursor.blockRange(), target = range && liftTarget(range);
    if (target == null)
      return false;
    if (dispatch)
      dispatch(state.tr.lift(range, target).scrollIntoView());
    return true;
  }
  let before = $cut.nodeBefore;
  if (deleteBarrier(state, $cut, dispatch, -1))
    return true;
  if ($cursor.parent.content.size == 0 && (textblockAt(before, "end") || NodeSelection.isSelectable(before))) {
    for (let depth = $cursor.depth; ; depth--) {
      let delStep = replaceStep(state.doc, $cursor.before(depth), $cursor.after(depth), Slice.empty);
      if (delStep && delStep.slice.size < delStep.to - delStep.from) {
        if (dispatch) {
          let tr = state.tr.step(delStep);
          tr.setSelection(textblockAt(before, "end") ? Selection.findFrom(tr.doc.resolve(tr.mapping.map($cut.pos, -1)), -1) : NodeSelection.create(tr.doc, $cut.pos - before.nodeSize));
          dispatch(tr.scrollIntoView());
        }
        return true;
      }
      if (depth == 1 || $cursor.node(depth - 1).childCount > 1)
        break;
    }
  }
  if (before.isAtom && $cut.depth == $cursor.depth - 1) {
    if (dispatch)
      dispatch(state.tr.delete($cut.pos - before.nodeSize, $cut.pos).scrollIntoView());
    return true;
  }
  return false;
};
function textblockAt(node, side, only = false) {
  for (let scan = node; scan; scan = side == "start" ? scan.firstChild : scan.lastChild) {
    if (scan.isTextblock)
      return true;
    if (only && scan.childCount != 1)
      return false;
  }
  return false;
}
var selectNodeBackward = (state, dispatch, view) => {
  let { $head, empty: empty2 } = state.selection, $cut = $head;
  if (!empty2)
    return false;
  if ($head.parent.isTextblock) {
    if (view ? !view.endOfTextblock("backward", state) : $head.parentOffset > 0)
      return false;
    $cut = findCutBefore($head);
  }
  let node = $cut && $cut.nodeBefore;
  if (!node || !NodeSelection.isSelectable(node))
    return false;
  if (dispatch)
    dispatch(state.tr.setSelection(NodeSelection.create(state.doc, $cut.pos - node.nodeSize)).scrollIntoView());
  return true;
};
function findCutBefore($pos) {
  if (!$pos.parent.type.spec.isolating)
    for (let i2 = $pos.depth - 1; i2 >= 0; i2--) {
      if ($pos.index(i2) > 0)
        return $pos.doc.resolve($pos.before(i2 + 1));
      if ($pos.node(i2).type.spec.isolating)
        break;
    }
  return null;
}
function atBlockEnd(state, view) {
  let { $cursor } = state.selection;
  if (!$cursor || (view ? !view.endOfTextblock("forward", state) : $cursor.parentOffset < $cursor.parent.content.size))
    return null;
  return $cursor;
}
var joinForward = (state, dispatch, view) => {
  let $cursor = atBlockEnd(state, view);
  if (!$cursor)
    return false;
  let $cut = findCutAfter($cursor);
  if (!$cut)
    return false;
  let after = $cut.nodeAfter;
  if (deleteBarrier(state, $cut, dispatch, 1))
    return true;
  if ($cursor.parent.content.size == 0 && (textblockAt(after, "start") || NodeSelection.isSelectable(after))) {
    let delStep = replaceStep(state.doc, $cursor.before(), $cursor.after(), Slice.empty);
    if (delStep && delStep.slice.size < delStep.to - delStep.from) {
      if (dispatch) {
        let tr = state.tr.step(delStep);
        tr.setSelection(textblockAt(after, "start") ? Selection.findFrom(tr.doc.resolve(tr.mapping.map($cut.pos)), 1) : NodeSelection.create(tr.doc, tr.mapping.map($cut.pos)));
        dispatch(tr.scrollIntoView());
      }
      return true;
    }
  }
  if (after.isAtom && $cut.depth == $cursor.depth - 1) {
    if (dispatch)
      dispatch(state.tr.delete($cut.pos, $cut.pos + after.nodeSize).scrollIntoView());
    return true;
  }
  return false;
};
var selectNodeForward = (state, dispatch, view) => {
  let { $head, empty: empty2 } = state.selection, $cut = $head;
  if (!empty2)
    return false;
  if ($head.parent.isTextblock) {
    if (view ? !view.endOfTextblock("forward", state) : $head.parentOffset < $head.parent.content.size)
      return false;
    $cut = findCutAfter($head);
  }
  let node = $cut && $cut.nodeAfter;
  if (!node || !NodeSelection.isSelectable(node))
    return false;
  if (dispatch)
    dispatch(state.tr.setSelection(NodeSelection.create(state.doc, $cut.pos)).scrollIntoView());
  return true;
};
function findCutAfter($pos) {
  if (!$pos.parent.type.spec.isolating)
    for (let i2 = $pos.depth - 1; i2 >= 0; i2--) {
      let parent = $pos.node(i2);
      if ($pos.index(i2) + 1 < parent.childCount)
        return $pos.doc.resolve($pos.after(i2 + 1));
      if (parent.type.spec.isolating)
        break;
    }
  return null;
}
var newlineInCode = (state, dispatch) => {
  let { $head, $anchor } = state.selection;
  if (!$head.parent.type.spec.code || !$head.sameParent($anchor))
    return false;
  if (dispatch)
    dispatch(state.tr.insertText("\n").scrollIntoView());
  return true;
};
function defaultBlockAt(match) {
  for (let i2 = 0; i2 < match.edgeCount; i2++) {
    let { type } = match.edge(i2);
    if (type.isTextblock && !type.hasRequiredAttrs())
      return type;
  }
  return null;
}
var exitCode = (state, dispatch) => {
  let { $head, $anchor } = state.selection;
  if (!$head.parent.type.spec.code || !$head.sameParent($anchor))
    return false;
  let above = $head.node(-1), after = $head.indexAfter(-1), type = defaultBlockAt(above.contentMatchAt(after));
  if (!type || !above.canReplaceWith(after, after, type))
    return false;
  if (dispatch) {
    let pos = $head.after(), tr = state.tr.replaceWith(pos, pos, type.createAndFill());
    tr.setSelection(Selection.near(tr.doc.resolve(pos), 1));
    dispatch(tr.scrollIntoView());
  }
  return true;
};
var createParagraphNear = (state, dispatch) => {
  let sel = state.selection, { $from, $to } = sel;
  if (sel instanceof AllSelection || $from.parent.inlineContent || $to.parent.inlineContent)
    return false;
  let type = defaultBlockAt($to.parent.contentMatchAt($to.indexAfter()));
  if (!type || !type.isTextblock)
    return false;
  if (dispatch) {
    let side = (!$from.parentOffset && $to.index() < $to.parent.childCount ? $from : $to).pos;
    let tr = state.tr.insert(side, type.createAndFill());
    tr.setSelection(TextSelection.create(tr.doc, side + 1));
    dispatch(tr.scrollIntoView());
  }
  return true;
};
var liftEmptyBlock = (state, dispatch) => {
  let { $cursor } = state.selection;
  if (!$cursor || $cursor.parent.content.size)
    return false;
  if ($cursor.depth > 1 && $cursor.after() != $cursor.end(-1)) {
    let before = $cursor.before();
    if (canSplit(state.doc, before)) {
      if (dispatch)
        dispatch(state.tr.split(before).scrollIntoView());
      return true;
    }
  }
  let range = $cursor.blockRange(), target = range && liftTarget(range);
  if (target == null)
    return false;
  if (dispatch)
    dispatch(state.tr.lift(range, target).scrollIntoView());
  return true;
};
function splitBlockAs(splitNode) {
  return (state, dispatch) => {
    if (state.selection instanceof NodeSelection && state.selection.node.isBlock) {
      let { $from: $from2 } = state.selection;
      if (!$from2.parentOffset || !canSplit(state.doc, $from2.pos))
        return false;
      if (dispatch)
        dispatch(state.tr.split($from2.pos).scrollIntoView());
      return true;
    }
    if (!state.selection.$from.depth)
      return false;
    let tr = state.tr;
    if (!state.selection.empty && (state.selection instanceof TextSelection || state.selection instanceof AllSelection))
      tr.deleteSelection();
    let { $from } = tr.selection, mapFrom = tr.steps.length;
    let types = [];
    let splitDepth, deflt, atEnd = false, atStart = false;
    for (let d = $from.depth; ; d--) {
      let node = $from.node(d);
      if (node.isBlock) {
        atEnd = $from.end(d) == $from.pos + ($from.depth - d);
        atStart = $from.start(d) == $from.pos - ($from.depth - d);
        deflt = defaultBlockAt($from.node(d - 1).contentMatchAt($from.indexAfter(d - 1)));
        let splitType = splitNode && splitNode($from.parent, atEnd, $from);
        types.unshift(splitType || (atEnd && deflt ? { type: deflt } : null));
        splitDepth = d;
        break;
      } else {
        if (d == 1)
          return false;
        types.unshift(null);
      }
    }
    let splitPos = $from.pos;
    let can = canSplit(tr.doc, splitPos, types.length, types);
    if (!can) {
      types[0] = deflt ? { type: deflt } : null;
      can = canSplit(tr.doc, splitPos, types.length, types);
    }
    if (!can)
      return false;
    tr.split(splitPos, types.length, types);
    if (!atEnd && atStart && $from.node(splitDepth).type != deflt) {
      let mapping = tr.mapping.slice(mapFrom);
      let first = mapping.map($from.before(splitDepth)), $first = tr.doc.resolve(first);
      if (deflt && $from.node(splitDepth - 1).canReplaceWith($first.index(), $first.index() + 1, deflt))
        tr.setNodeMarkup(mapping.map($from.before(splitDepth)), deflt);
    }
    if (dispatch)
      dispatch(tr.scrollIntoView());
    return true;
  };
}
var splitBlock = splitBlockAs();
var selectAll = (state, dispatch) => {
  if (dispatch)
    dispatch(state.tr.setSelection(new AllSelection(state.doc)));
  return true;
};
function joinMaybeClear(state, $pos, dispatch) {
  let before = $pos.nodeBefore, after = $pos.nodeAfter, index = $pos.index();
  if (!before || !after || !before.type.compatibleContent(after.type))
    return false;
  if (!before.content.size && $pos.parent.canReplace(index - 1, index)) {
    if (dispatch)
      dispatch(state.tr.delete($pos.pos - before.nodeSize, $pos.pos).scrollIntoView());
    return true;
  }
  if (!$pos.parent.canReplace(index, index + 1) || !(after.isTextblock || canJoin(state.doc, $pos.pos)))
    return false;
  if (dispatch)
    dispatch(state.tr.join($pos.pos).scrollIntoView());
  return true;
}
function deleteBarrier(state, $cut, dispatch, dir) {
  let before = $cut.nodeBefore, after = $cut.nodeAfter, conn, match;
  let isolated = before.type.spec.isolating || after.type.spec.isolating;
  if (!isolated && joinMaybeClear(state, $cut, dispatch))
    return true;
  let canDelAfter = !isolated && $cut.parent.canReplace($cut.index(), $cut.index() + 1);
  if (canDelAfter && (conn = (match = before.contentMatchAt(before.childCount)).findWrapping(after.type)) && match.matchType(conn[0] || after.type).validEnd) {
    if (dispatch) {
      let end = $cut.pos + after.nodeSize, wrap2 = Fragment2.empty;
      for (let i2 = conn.length - 1; i2 >= 0; i2--)
        wrap2 = Fragment2.from(conn[i2].create(null, wrap2));
      wrap2 = Fragment2.from(before.copy(wrap2));
      let tr = state.tr.step(new ReplaceAroundStep($cut.pos - 1, end, $cut.pos, end, new Slice(wrap2, 1, 0), conn.length, true));
      let $joinAt = tr.doc.resolve(end + 2 * conn.length);
      if ($joinAt.nodeAfter && $joinAt.nodeAfter.type == before.type && canJoin(tr.doc, $joinAt.pos))
        tr.join($joinAt.pos);
      dispatch(tr.scrollIntoView());
    }
    return true;
  }
  let selAfter = after.type.spec.isolating || dir > 0 && isolated ? null : Selection.findFrom($cut, 1);
  let range = selAfter && selAfter.$from.blockRange(selAfter.$to), target = range && liftTarget(range);
  if (target != null && target >= $cut.depth) {
    if (dispatch)
      dispatch(state.tr.lift(range, target).scrollIntoView());
    return true;
  }
  if (canDelAfter && textblockAt(after, "start", true) && textblockAt(before, "end")) {
    let at = before, wrap2 = [];
    for (; ; ) {
      wrap2.push(at);
      if (at.isTextblock)
        break;
      at = at.lastChild;
    }
    let afterText = after, afterDepth = 1;
    for (; !afterText.isTextblock; afterText = afterText.firstChild)
      afterDepth++;
    if (at.canReplace(at.childCount, at.childCount, afterText.content)) {
      if (dispatch) {
        let end = Fragment2.empty;
        for (let i2 = wrap2.length - 1; i2 >= 0; i2--)
          end = Fragment2.from(wrap2[i2].copy(end));
        let tr = state.tr.step(new ReplaceAroundStep($cut.pos - wrap2.length, $cut.pos + after.nodeSize, $cut.pos + afterDepth, $cut.pos + after.nodeSize - afterDepth, new Slice(end, wrap2.length, 0), 0, true));
        dispatch(tr.scrollIntoView());
      }
      return true;
    }
  }
  return false;
}
function selectTextblockSide(side) {
  return function(state, dispatch) {
    let sel = state.selection, $pos = side < 0 ? sel.$from : sel.$to;
    let depth = $pos.depth;
    while ($pos.node(depth).isInline) {
      if (!depth)
        return false;
      depth--;
    }
    if (!$pos.node(depth).isTextblock)
      return false;
    if (dispatch)
      dispatch(state.tr.setSelection(TextSelection.create(state.doc, side < 0 ? $pos.start(depth) : $pos.end(depth))));
    return true;
  };
}
var selectTextblockStart = selectTextblockSide(-1);
var selectTextblockEnd = selectTextblockSide(1);
function chainCommands(...commands) {
  return function(state, dispatch, view) {
    for (let i2 = 0; i2 < commands.length; i2++)
      if (commands[i2](state, dispatch, view))
        return true;
    return false;
  };
}
var backspace = chainCommands(deleteSelection, joinBackward, selectNodeBackward);
var del = chainCommands(deleteSelection, joinForward, selectNodeForward);
var pcBaseKeymap = {
  "Enter": chainCommands(newlineInCode, createParagraphNear, liftEmptyBlock, splitBlock),
  "Mod-Enter": exitCode,
  "Backspace": backspace,
  "Mod-Backspace": backspace,
  "Shift-Backspace": backspace,
  "Delete": del,
  "Mod-Delete": del,
  "Mod-a": selectAll
};
var macBaseKeymap = {
  "Ctrl-h": pcBaseKeymap["Backspace"],
  "Alt-Backspace": pcBaseKeymap["Mod-Backspace"],
  "Ctrl-d": pcBaseKeymap["Delete"],
  "Ctrl-Alt-Backspace": pcBaseKeymap["Mod-Delete"],
  "Alt-Delete": pcBaseKeymap["Mod-Delete"],
  "Alt-d": pcBaseKeymap["Mod-Delete"],
  "Ctrl-a": selectTextblockStart,
  "Ctrl-e": selectTextblockEnd
};
for (let key in pcBaseKeymap)
  macBaseKeymap[key] = pcBaseKeymap[key];
var mac5 = typeof navigator != "undefined" ? /Mac|iP(hone|[oa]d)/.test(navigator.platform) : typeof os != "undefined" && os.platform ? os.platform() == "darwin" : false;
var baseKeymap = mac5 ? macBaseKeymap : pcBaseKeymap;

// src/reference-text.js
var schema = new Schema({ nodes: {
  doc: { content: "paragraph" },
  paragraph: { content: "inline*", toDOM: () => ["p", 0] },
  text: { group: "inline" },
  hard_break: {
    inline: true,
    group: "inline",
    selectable: false,
    attrs: { eol: { default: "\n" } },
    toDOM: (node) => ["br", { "data-eol": node.attrs.eol }]
  },
  file_reference: {
    inline: true,
    group: "inline",
    atom: true,
    attrs: { path: {}, kind: {}, mention: {} },
    toDOM: (node) => ["span", { "data-file-reference": node.attrs.mention, contenteditable: "false" }, node.attrs.path]
  }
} });
function referenceTokens(text) {
  return [...text.matchAll(/(?:^|\s)(@"([^"\r\n]*)"|@([^\s"]+))/gu)].map((match) => ({ mention: match[1], path: match[2] ?? match[3] })).filter((token) => token.path && !/[\u0000-\u001f\u007f-\u009f"]/u.test(token.path));
}
function finalMention({ path, kind }) {
  const value = kind === "directory" ? path.replace(/\/$/u, "") + "/" : path;
  if (!value || /[\u0000-\u001f\u007f-\u009f"]/u.test(value)) throw new Error("\u8BE5\u8DEF\u5F84\u65E0\u6CD5\u5B89\u5168\u8868\u793A\u4E3A\u5F15\u7528");
  return /\s/u.test(value) ? `@"${value}"` : `@${value}`;
}
function appendText(nodes, text) {
  for (const part of text.split(/(\r\n|\r|\n)/u)) {
    if (!part) continue;
    nodes.push(/^[\r\n]+$/u.test(part) ? schema.nodes.hard_break.create({ eol: part }) : schema.text(part));
  }
}
function createDocument(text, candidates = []) {
  const known = /* @__PURE__ */ new Map();
  for (const candidate of candidates) {
    const mention = finalMention(candidate);
    known.set(mention, candidate);
    const path = candidate.kind === "directory" ? candidate.path.replace(/\/$/u, "") + "/" : candidate.path;
    known.set(`@"${path}"`, candidate);
  }
  const nodes = [];
  let offset = 0;
  const token = /(?:^|\s)(@"[^"\r\n]*"|@[^\s"]+)/gu;
  for (const match of text.matchAll(token)) {
    const start = match.index + match[0].length - match[1].length;
    const possible = [...known.keys()].filter((mention2) => match[1].startsWith(mention2)).sort((a, b) => b.length - a.length);
    const mention = possible.find((value) => {
      const suffix = text.slice(start + value.length);
      return !suffix || /^[\s，。；、！？,;!?)]/u.test(suffix);
    });
    if (!mention) continue;
    appendText(nodes, text.slice(offset, start));
    nodes.push(schema.nodes.file_reference.create({ ...known.get(mention), mention }));
    offset = start + mention.length;
  }
  appendText(nodes, text.slice(offset));
  return schema.nodes.doc.create(null, schema.nodes.paragraph.create(null, nodes));
}
function exportText(node) {
  return node.textBetween(0, node.content.size ?? node.size, "", (leaf) => leaf.type.name === "file_reference" ? leaf.attrs.mention : leaf.attrs.eol ?? "");
}

// src/skill-text.js
var skillName = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
function skillTokens(text) {
  return [...new Set([...text.matchAll(/(?:^|\s)\/([^\s/]+)(?=\s|$)/gu)].map((match) => match[1]))];
}
function skillCatalog(result) {
  if (result?.ok !== true || !Array.isArray(result.value?.skills)) return void 0;
  if (result.value.skills.some((skill) => !skill || typeof skill.name !== "string" || !skillName.test(skill.name))) return void 0;
  const seen = /* @__PURE__ */ new Set();
  return result.value.skills.filter((skill) => {
    if (skill.userInvocable === false || skill.invocation?.userInvocable === false || seen.has(skill.name)) return false;
    seen.add(skill.name);
    return true;
  });
}

// src/reference-menu.js
var import_dsh_client_ui_primitives7 = require("@deepseek-ai/dsh-client-ui-primitives");
var menuId = 0;
function triggerAt(state) {
  const { selection } = state;
  if (!selection.$from.sameParent(selection.$to) || !selection.$from.parent.isTextblock) return;
  const leafText = (node) => node.type === schema.nodes.hard_break ? "\n" : "\uFFFC";
  const before = selection.$from.parent.textBetween(0, selection.$from.parentOffset, "", leafText);
  const selected = selection.$from.parent.textBetween(selection.$from.parentOffset, selection.$to.parentOffset, "", leafText);
  const match = /(?:^|\s)(@(?:"([^"\r\n\ufffc]*)|([^\s@"\ufffc]*)))$/u.exec(before + selected);
  if (!match) {
    const skill = /(?:^|\s)(\/([a-z0-9-]*))$/u.exec(before + selected);
    if (!skill) return;
    const from3 = selection.to - skill[1].length;
    if (!selection.empty && from3 !== selection.from) return;
    const after = selection.$to.parent.textBetween(selection.$to.parentOffset, selection.$to.parent.content.size, "", leafText);
    const tail = selection.empty ? /^[a-z0-9-]*/u.exec(after)[0] : "";
    if (selection.empty && after.slice(tail.length) && !/^\s/u.test(after.slice(tail.length))) return;
    return { from: from3, to: selection.to + tail.length, query: skill[2], kind: "skill" };
  }
  const query = match[2] ?? match[3];
  const from2 = selection.to - match[1].length;
  if (!selection.empty && from2 !== selection.from) return;
  let to = selection.to;
  if (selection.empty) {
    const after = selection.$to.parent.textBetween(selection.$to.parentOffset, selection.$to.parent.content.size, "", leafText);
    const tail = match[2] !== void 0 ? /^[^"\r\n\ufffc]*(?:"|$)/u.exec(after)?.[0] : /^[^\s@"\ufffc]*/u.exec(after)?.[0];
    to += tail?.length ?? 0;
  }
  return { from: from2, to, query, kind: "file" };
}
function validCandidates(value) {
  const seen = /* @__PURE__ */ new Set();
  return value.filter((candidate) => {
    if (!candidate || !["file", "directory"].includes(candidate.kind) || typeof candidate.path !== "string") return false;
    try {
      finalMention(candidate);
    } catch {
      return false;
    }
    const key = candidate.kind + ":" + candidate.path;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function createReferenceMenu(element, { getView, lookup, lookupSkills, disabled, translate, onCandidate, syncSelection, onRender }) {
  const document2 = element.ownerDocument;
  const menu = document2.createElement("div");
  menu.className = "dsh-resend-reference-menu";
  menu.id = "dsh-resend-reference-menu-" + ++menuId;
  menu.hidden = true;
  element.append(menu);
  let current, request, dismissed, results = [], active = 0, status, destroyed = false, drilled = false;
  let t = translate;
  function close2() {
    request?.abort();
    request = void 0;
    current = void 0;
    menu.hidden = true;
    onRender(void 0);
    const view = getView();
    view.dom.removeAttribute("aria-controls");
    view.dom.removeAttribute("aria-activedescendant");
    view.dom.setAttribute("aria-expanded", "false");
  }
  function live() {
    return !destroyed && !disabled() && current && getView().state === current.state;
  }
  function replaceQuery(query, initial = current) {
    syncSelection();
    if (current !== initial || !live()) return;
    const { from: from2, to } = current.trigger;
    const text = /\s/u.test(query) ? '@"' + query : "@" + query;
    const view = getView();
    view.dispatch(closeHistory(view.state.tr.insertText(text, from2, to)).setMeta("referenceDrill", true).scrollIntoView());
    view.focus();
  }
  function choose(candidate, initial = current) {
    syncSelection();
    if (current !== initial || !live() || !results.includes(candidate)) return;
    const view = getView(), { from: from2, to } = current.trigger;
    if (current.trigger.kind === "skill") {
      close2();
      const transaction2 = closeHistory(view.state.tr.insertText("/" + candidate.name, from2, to));
      const end = from2 + candidate.name.length + 1;
      const following2 = transaction2.doc.textBetween(end, end + 1, "", () => "\n");
      if (!/^\s/u.test(following2)) transaction2.insertText(" ", end);
      view.dispatch(transaction2.scrollIntoView());
      dismissed = view.state;
      close2();
      view.focus();
      return;
    }
    const mention = finalMention(candidate);
    const node = schema.nodes.file_reference.create({ ...candidate, mention });
    onCandidate(candidate);
    close2();
    const transaction = closeHistory(view.state.tr.replaceWith(from2, to, node));
    const following = transaction.doc.textBetween(from2 + 1, from2 + 2, "", () => "\n");
    if (!/^\s/u.test(following)) transaction.insertText(" ", from2 + 1);
    view.dispatch(transaction.scrollIntoView());
    dismissed = view.state;
    close2();
    view.focus();
  }
  function render() {
    const context = current;
    menu.hidden = false;
    const view = getView();
    const kind = current.trigger.kind;
    view.dom.setAttribute("aria-expanded", "true");
    const normalized = current.trigger.query.replaceAll("\\", "/");
    const slash = normalized.lastIndexOf("/");
    const crumbs = [];
    if (kind === "file" && drilled && slash >= 0) {
      const segments = normalized.slice(0, slash).split("/").filter(Boolean);
      const root = normalized.startsWith("/") ? "/" : "";
      crumbs.push({ label: t("row.fileRoot"), query: root });
      segments.forEach((label, index) => crumbs.push({ label, query: root + segments.slice(0, index + 1).join("/") + "/" }));
    }
    const listId = menu.id + "-list";
    const optionId = (index) => menu.id + "-option-" + index;
    view.dom.setAttribute("aria-controls", listId);
    if (results[active]) view.dom.setAttribute("aria-activedescendant", optionId(active));
    else view.dom.removeAttribute("aria-activedescendant");
    onRender({
      element: menu,
      kind,
      query: current.trigger.query,
      status,
      active,
      results,
      crumbs,
      listId,
      optionId,
      onPick: (index) => {
        if (current === context) choose(results[index], context);
      },
      onDrill: (index) => {
        if (current === context && results[index]?.kind === "directory") replaceQuery(results[index].path.replace(/\/$/u, "") + "/", context);
      },
      onCrumb: (index) => {
        if (current === context && crumbs[index]) replaceQuery(crumbs[index].query, context);
      },
      onHover: (index) => {
        if (current !== context || !live() || active === index || !results[index]) return;
        active = index;
        render();
      },
      onDismiss: (focus = true) => {
        if (current === context) {
          dismissed = view.state;
          close2();
          if (focus) view.focus();
        }
      }
    });
  }
  async function refresh(transaction) {
    const view = getView();
    if (destroyed || disabled() || view.composing || dismissed === view.state) {
      close2();
      return;
    }
    if (current?.state === view.state) return;
    close2();
    if (transaction?.docChanged) drilled = transaction.getMeta("referenceDrill") === true;
    const trigger = triggerAt(view.state);
    if (!trigger) return;
    const state = view.state;
    current = { trigger, state };
    results = [];
    active = 0;
    status = "Loading";
    const controller = new document2.defaultView.AbortController();
    request = controller;
    render();
    try {
      const result = await (trigger.kind === "skill" ? lookupSkills(controller.signal) : lookup(trigger.query, controller.signal));
      if (!live() || current.state !== state || request !== controller || controller.signal.aborted) return;
      const values = trigger.kind === "skill" ? skillCatalog(result) : result?.ok === true && Array.isArray(result.value) ? validCandidates(result.value) : void 0;
      if (!values) status = result?.unavailable ? "Unavailable" : "Failed";
      else {
        results = trigger.kind === "skill" ? (0, import_dsh_client_ui_primitives7.rankByName)(values, trigger.query) : values;
        status = results.length ? "Ready" : "Empty";
      }
    } catch {
      if (!live() || current.state !== state || request !== controller || controller.signal.aborted) return;
      status = "Failed";
    }
    render();
  }
  return {
    refresh,
    refreshAfterRestoration(previous) {
      if (dismissed === previous) dismissed = getView().state;
      return refresh();
    },
    composing() {
      close2();
    },
    invalidate() {
      dismissed = getView().state;
      close2();
    },
    setLabels(next) {
      t = next;
      if (current) render();
    },
    handleKey(event) {
      if (!current || menu.hidden) return false;
      if (event.key === "Escape" || event.key === "Tab" && event.shiftKey) {
        dismissed = getView().state;
        close2();
      } else if (["ArrowDown", "ArrowUp"].includes(event.key)) {
        if (results.length) {
          active = (active + (event.key === "ArrowDown" ? 1 : results.length - 1)) % results.length;
          render();
        }
      } else if (["Enter", "Tab"].includes(event.key) && !event.shiftKey) {
        if (event.key === "Tab" && results[active]?.kind === "directory") replaceQuery(results[active].path.replace(/\/$/u, "") + "/");
        else if (results[active]) choose(results[active]);
      } else if (event.key === "ArrowRight" && results[active]?.kind === "directory") {
        replaceQuery(results[active].path.replace(/\/$/u, "") + "/");
      } else return false;
      event.preventDefault();
      return true;
    },
    close: close2,
    destroy() {
      close2();
      destroyed = true;
      menu.remove();
    }
  };
}

// src/temporary-editor.js
function createTemporaryEditor(element, options) {
  let view, menu, destroyed = false, frozen = options.disabled === true, request, skillRequest;
  let candidates = options.draft?.candidates ?? [];
  let availableSkills = /* @__PURE__ */ new Map();
  let label = options.label, removeLabel = options.removeLabel;
  const changed = () => options.onChange({ state: view.state, text: exportText(view.state.doc), candidates });
  function skillDecorations(state2) {
    const decorations = [];
    state2.doc.descendants((node, position) => {
      if (!node.isTextblock) return;
      const text = node.textBetween(0, node.content.size, "", (leaf) => leaf.type === schema.nodes.hard_break ? "\n" : "\uFFFC");
      for (const match of text.matchAll(/(?:^|\s)\/([a-z0-9]+(?:-[a-z0-9]+)*)(?=\s|$)/gu)) {
        if (!availableSkills.has(match[1])) continue;
        const from2 = position + 1 + match.index + match[0].length - match[1].length - 1;
        decorations.push(Decoration.inline(from2 + 1, from2 + match[1].length + 1, {
          class: "dsh-resend-skill-reference",
          "data-skill": match[1]
        }), Decoration.inline(from2, from2 + 1, { class: "dsh-resend-skill-prefix", "aria-hidden": "true" }));
      }
      return false;
    });
    return DecorationSet.create(state2.doc, decorations);
  }
  function updateSkillCatalog(catalog) {
    availableSkills = new Map(catalog.map((skill) => [skill.name, skill]));
    view.setProps({ decorations: skillDecorations });
  }
  function previewSkillAt(position, event) {
    if (frozen || destroyed || event.detail > 1 || event.button !== 0) return false;
    const selection = element.ownerDocument.getSelection();
    if (selection && !selection.isCollapsed) return false;
    const resolved = view.state.doc.resolve(position ?? view.state.selection.head);
    if (!resolved.parent.isTextblock) return false;
    const before = resolved.parent.textBetween(0, resolved.parentOffset, "", () => "\uFFFC");
    const after = resolved.parent.textBetween(resolved.parentOffset, resolved.parent.content.size, "", () => "\uFFFC");
    const text = before + after;
    for (const match of text.matchAll(/(?:^|\s)\/([a-z0-9]+(?:-[a-z0-9]+)*)(?=\s|$)/gu)) {
      const start = match.index + match[0].length - match[1].length - 1;
      const end = start + match[1].length + 1;
      if (resolved.parentOffset < start || resolved.parentOffset > end) continue;
      const name2 = match[1];
      if (!availableSkills.has(name2)) return false;
      void preview("skill", name2);
      return true;
    }
    return false;
  }
  const lineBreak = (state2, dispatch) => {
    if (!frozen) dispatch(state2.tr.replaceSelectionWith(schema.nodes.hard_break.create()).scrollIntoView());
    return true;
  };
  const plugins = [history(), keymap({
    "Mod-z": undo,
    "Mod-Shift-z": redo,
    "Mod-y": redo,
    "Shift-Enter": lineBreak
  }), keymap(baseKeymap)];
  const state = options.draft?.state?.reconfigure({ plugins }) ?? EditorState.create({
    doc: createDocument(options.text, candidates),
    plugins
  });
  function syncClipboardSelection(view2, includeCaret = false) {
    const selection = view2.dom.ownerDocument.getSelection();
    if (!selection || !includeCaret && selection.isCollapsed || !view2.dom.contains(selection.anchorNode) || !view2.dom.contains(selection.focusNode)) return false;
    const anchor = view2.posAtDOM(selection.anchorNode, selection.anchorOffset);
    const head = view2.posAtDOM(selection.focusNode, selection.focusOffset);
    if (anchor !== view2.state.selection.anchor || head !== view2.state.selection.head) {
      view2.dispatch(view2.state.tr.setSelection(TextSelection.between(view2.state.doc.resolve(anchor), view2.state.doc.resolve(head))));
    }
    return false;
  }
  view = new EditorView(element, {
    state,
    editable: () => !frozen,
    decorations: skillDecorations,
    attributes: { role: "textbox", "aria-label": options.label, "aria-multiline": "true", "aria-disabled": String(frozen) },
    handleDOMEvents: {
      copy: syncClipboardSelection,
      cut: syncClipboardSelection,
      click: (_view, event) => {
        const reference = event.target?.closest?.("[data-path]");
        if (reference) return false;
        return previewSkillAt(view.state.selection.head, event);
      },
      // Skip editor keymaps during IME confirmation without preventing browser composition.
      keydown: (_view, event) => event.isComposing || event.keyCode === 229 || view.composing,
      compositionstart: () => {
        menu?.composing();
        return false;
      },
      compositionend: () => {
        queueMicrotask(() => {
          if (!destroyed) void menu?.refresh();
        });
        return false;
      }
    },
    dispatchTransaction(transaction) {
      if (destroyed || frozen && transaction.docChanged) return;
      if (transaction.docChanged || transaction.selectionSet) request?.abort();
      if (transaction.docChanged) skillRequest?.abort();
      const previous = view.state;
      view.updateState(view.state.apply(transaction));
      changed();
      if (transaction.getMeta("restoreReferences")) void menu?.refreshAfterRestoration(previous);
      else void menu?.refresh(transaction);
      if (transaction.docChanged) void checkSkills();
    },
    handleKeyDown(_view, event) {
      if (!frozen && menu?.handleKey(event)) return true;
      if (event.key === "Escape" || event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        if (!frozen) options.onKeyDown(event);
        return true;
      }
      return frozen;
    },
    clipboardTextSerializer: (slice2) => exportText(slice2.content),
    handlePaste(_view, event) {
      if (frozen) return true;
      const clipboard = event.clipboardData;
      if (!clipboard || !Array.from(clipboard.types).includes("text/plain")) return false;
      syncClipboardSelection(view);
      const content = createDocument(clipboard.getData("text/plain"), candidates).firstChild.content;
      view.dispatch(closeHistory(view.state.tr.replaceSelection(new Slice(content, 0, 0))).scrollIntoView());
      void restoreReferences();
      return true;
    },
    nodeViews: {
      file_reference(node, _view, getPos) {
        const dom = element.ownerDocument.createElement("span");
        dom.className = "dsh-resend-file-reference";
        dom.contentEditable = "false";
        dom.title = node.attrs.path;
        dom.dataset.path = node.attrs.path;
        dom.dataset.mention = node.attrs.mention;
        const icon2 = element.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "svg");
        icon2.setAttribute("viewBox", "0 0 24 24");
        icon2.setAttribute("fill", "none");
        icon2.setAttribute("stroke", "currentColor");
        icon2.setAttribute("stroke-width", "1.5");
        icon2.setAttribute("stroke-linecap", "round");
        icon2.setAttribute("stroke-linejoin", "round");
        icon2.setAttribute("aria-hidden", "true");
        icon2.classList.add("dsh-resend-reference-icon");
        const outline = element.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "path");
        outline.setAttribute("d", "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z M14 2v6h6 M8 13h8 M8 17h6");
        icon2.append(outline);
        const label2 = element.ownerDocument.createElement("span");
        label2.textContent = node.attrs.path;
        const remove = element.ownerDocument.createElement("button");
        remove.type = "button";
        remove.textContent = "\xD7";
        remove.disabled = frozen;
        remove.setAttribute("aria-label", removeLabel + " " + node.attrs.path);
        remove.addEventListener("mousedown", (event) => event.preventDefault());
        remove.addEventListener("click", () => {
          if (frozen || destroyed) return;
          const position = getPos();
          if (typeof position !== "number") return;
          view.dispatch(closeHistory(view.state.tr.delete(position, position + node.nodeSize)).scrollIntoView());
          view.focus();
        });
        dom.append(icon2, label2, remove);
        let pointerStart;
        dom.addEventListener("mousedown", (event) => {
          pointerStart = event.button === 0 ? { x: event.clientX, y: event.clientY } : void 0;
        });
        dom.addEventListener("click", (event) => {
          const start = pointerStart;
          pointerStart = void 0;
          if (frozen || destroyed || event.detail > 1 || event.target === remove || remove.contains(event.target)) return;
          const selection = element.ownerDocument.getSelection();
          const selectedInsideChip = selection && !selection.isCollapsed && dom.contains(selection.anchorNode) && dom.contains(selection.focusNode);
          const clickedAtom = start && Math.hypot(event.clientX - start.x, event.clientY - start.y) < 4 && view.state.selection instanceof NodeSelection && view.state.selection.from === getPos();
          if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) >= 4) return;
          if (selection && !selection.isCollapsed && !selectedInsideChip && !clickedAtom) return;
          void preview("file", node.attrs.path);
        });
        return { dom, stopEvent: (event) => remove.contains(event.target), ignoreMutation: (mutation) => mutation.type !== "selection" };
      }
    }
  });
  async function preview(kind, value) {
    if (frozen || destroyed) return;
    const callback = kind === "file" ? options.openFile : options.openSkill;
    if (typeof callback !== "function") {
      options.onPreviewNotice?.({ status: "Unavailable", kind, value });
      return;
    }
    try {
      const result = await callback(value);
      if (result === false) options.onPreviewNotice?.({ status: "Unavailable", kind, value });
      else options.onPreviewNotice?.(void 0);
    } catch {
      options.onPreviewNotice?.({ status: "Failed", kind, value });
    }
  }
  menu = createReferenceMenu(element, {
    getView: () => view,
    lookup: options.lookup,
    lookupSkills: options.lookupSkills,
    disabled: () => frozen,
    translate: options.translate,
    onRender: options.onMenuChange,
    syncSelection: () => syncClipboardSelection(view, true),
    onCandidate: (candidate) => {
      candidates = [...candidates, candidate];
    }
  });
  async function checkSkills() {
    skillRequest?.abort();
    if (destroyed || frozen) return;
    const tokens = skillTokens(exportText(view.state.doc));
    const invalid = tokens.filter((name2) => !skillName.test(name2));
    const names = tokens.filter((name2) => skillName.test(name2));
    if (!names.length) {
      updateSkillCatalog([]);
      options.onSkillNotice?.(invalid.length ? { status: "Invalid", names: invalid } : void 0);
      return;
    }
    const controller = new element.ownerDocument.defaultView.AbortController();
    skillRequest = controller;
    options.onSkillNotice?.(void 0);
    let result;
    try {
      result = await options.lookupSkills(controller.signal);
    } catch {
      result = void 0;
    }
    if (destroyed || frozen || controller.signal.aborted || skillRequest !== controller) return;
    const catalog = skillCatalog(result);
    if (!catalog) {
      updateSkillCatalog([]);
      options.onSkillNotice?.({ status: result?.unavailable ? "Unavailable" : "Failed", names: [] });
      return;
    }
    updateSkillCatalog(catalog);
    const missing = names.filter((name2) => !catalog.some((skill) => skill.name === name2));
    const notices = [];
    if (missing.length) notices.push({ status: "Missing", names: missing });
    if (invalid.length) notices.push({ status: "Invalid", names: invalid });
    options.onSkillNotice?.(notices.length ? notices : void 0);
  }
  async function restoreReferences() {
    request?.abort();
    if (destroyed || frozen) return;
    const text = exportText(view.state.doc);
    const paths = [...new Set(referenceTokens(text).map((token) => token.path))];
    if (!paths.length) {
      options.onNotice(false);
      return;
    }
    const controller = new element.ownerDocument.defaultView.AbortController();
    request = controller;
    const initial = view.state;
    const results = await Promise.allSettled(paths.map((path) => options.lookup(path.replace(/\/$/u, ""), controller.signal)));
    if (destroyed || frozen || controller.signal.aborted || request !== controller || view.state !== initial) return;
    let unavailable = false;
    const confirmed = [];
    for (const result of results) {
      if (result.status !== "fulfilled" || result.value?.ok !== true || !Array.isArray(result.value.value)) {
        unavailable = true;
        continue;
      }
      for (const candidate of result.value.value) {
        if (candidate && typeof candidate.path === "string" && ["file", "directory"].includes(candidate.kind) && paths.includes(candidate.kind === "directory" ? candidate.path.replace(/\/$/u, "") + "/" : candidate.path) && !/[\u0000-\u001f\u007f-\u009f"]/u.test(candidate.path)) confirmed.push(candidate);
      }
    }
    candidates = [...candidates, ...confirmed];
    const restored = createDocument(text, candidates);
    const replacements = [];
    let oldPosition = 1;
    restored.firstChild.forEach((node) => {
      if (node.type === schema.nodes.file_reference) replacements.push({ position: oldPosition, node });
      oldPosition += node.type === schema.nodes.file_reference ? node.attrs.mention.length : node.type === schema.nodes.hard_break ? node.attrs.eol.length : node.nodeSize;
    });
    const transaction = view.state.tr;
    for (const { position, node } of replacements.reverse()) {
      let offset = 0, from2, to;
      view.state.doc.firstChild.forEach((oldNode, pos) => {
        const length = oldNode.type === schema.nodes.file_reference ? oldNode.attrs.mention.length : oldNode.type === schema.nodes.hard_break ? oldNode.attrs.eol.length : oldNode.nodeSize;
        if (position - 1 >= offset && position - 1 < offset + length && oldNode.isText) {
          from2 = pos + 1 + position - 1 - offset;
          to = from2 + node.attrs.mention.length;
        }
        offset += length;
      });
      if (from2 !== void 0) transaction.replaceWith(from2, to, node);
    }
    if (transaction.docChanged) view.dispatch(transaction.setMeta("addToHistory", false).setMeta("restoreReferences", true));
    else changed();
    options.onNotice(unavailable);
  }
  if (!options.draft?.state) view.dispatch(view.state.tr.setSelection(TextSelection.atEnd(view.state.doc)));
  menu.invalidate();
  view.focus();
  changed();
  void restoreReferences();
  void checkSkills();
  return {
    getText: () => exportText(view.state.doc),
    invalidateQueries() {
      request?.abort();
      skillRequest?.abort();
      updateSkillCatalog([]);
      menu.invalidate();
      void checkSkills();
    },
    setLabels(nextLabel, nextRemoveLabel, translate) {
      label = nextLabel;
      removeLabel = nextRemoveLabel;
      menu.setLabels(translate);
      view.setProps({ attributes: { role: "textbox", "aria-label": label, "aria-multiline": "true", "aria-disabled": String(frozen) } });
      view.dom.querySelectorAll(".dsh-resend-file-reference").forEach((chip) => {
        chip.querySelector("button").setAttribute("aria-label", removeLabel + " " + chip.dataset.path);
      });
    },
    setDisabled(disabled) {
      frozen = disabled;
      if (disabled) {
        request?.abort();
        skillRequest?.abort();
        menu.close();
      } else void checkSkills();
      view.setProps({
        editable: () => !frozen,
        attributes: { role: "textbox", "aria-label": label, "aria-multiline": "true", "aria-disabled": String(frozen) }
      });
      view.dom.querySelectorAll(".dsh-resend-file-reference button").forEach((button) => {
        button.disabled = frozen;
      });
    },
    destroy() {
      destroyed = true;
      request?.abort();
      skillRequest?.abort();
      menu.destroy();
      view.destroy();
    }
  };
}

// src/reference-menu-ui.js
var import_react11 = require("react");
var import_react_dom3 = require("react-dom");
var import_dsh_client_ui_primitives8 = require("@deepseek-ai/dsh-client-ui-primitives");
function ReferenceMenuView({ menu, t }) {
  const { kind, status, active, results, crumbs, listId, optionId } = menu;
  const surface = (0, import_react11.useRef)(null), viewport = (0, import_react11.useRef)(null);
  const [overflow, setOverflow] = (0, import_react11.useState)(false);
  const maxHeight = (0, import_dsh_client_ui_primitives8.useAnchoredMaxHeight)(surface, 400, menu, 84);
  const updateOverflow = () => {
    const node = viewport.current;
    setOverflow(!!node && node.scrollTop + node.clientHeight < node.scrollHeight - 1);
  };
  (0, import_react11.useLayoutEffect)(() => {
    surface.current?.querySelector('[aria-selected="true"]')?.scrollIntoView?.({ block: "nearest" });
    updateOverflow();
  }, [menu, maxHeight]);
  const dismiss = (0, import_react11.useRef)(menu.onDismiss);
  dismiss.current = menu.onDismiss;
  (0, import_react11.useEffect)(() => {
    const document2 = menu.element.ownerDocument;
    const outside = (event) => {
      if (!menu.element.closest(".dsh-resend-editor-surface")?.contains(event.target)) dismiss.current(false);
    };
    document2.addEventListener("pointerdown", outside, true);
    return () => document2.removeEventListener("pointerdown", outside, true);
  }, [menu.element]);
  const pointer = (action) => (event) => {
    event.preventDefault();
    event.stopPropagation();
    action();
  };
  const pickEvents = (action) => ({ onMouseDown: pointer(action), onClick: pointer(action) });
  const list = [];
  list.push((0, import_react11.createElement)("div", { key: "title", role: "presentation", className: kind === "skill" ? "dsh-resend-menu-title" : "dsh-resend-menu-section-title" }, t(kind === "skill" ? "row.skillGroup" : "row.fileGroup")));
  if (status === "Loading") list.push((0, import_react11.createElement)(
    "div",
    { key: "loading", role: "status", "aria-label": t("row." + kind + status) },
    [32, 48].map((width) => (0, import_react11.createElement)(
      "div",
      { key: width, className: "dsh-resend-menu-skeleton-row" },
      (0, import_react11.createElement)("span", { className: "dsh-resend-menu-skeleton", style: { width: width + "%" } })
    ))
  ));
  else if (status !== "Ready") list.push((0, import_react11.createElement)("div", { key: "status", className: "dsh-resend-menu-status", role: "status", "aria-label": t("row." + kind + status) }, [
    (0, import_react11.createElement)("span", { key: "text" }, t("row." + kind + status)),
    (0, import_react11.createElement)("button", { key: "close", type: "button", ...pickEvents(menu.onDismiss) }, t("row." + kind + "Close"))
  ]));
  results.forEach((candidate, index) => {
    const directory = candidate.kind === "directory";
    const path = kind === "file" ? candidate.path.replaceAll("\\", "/").replace(/\/$/u, "") : "";
    const slash = path.lastIndexOf("/");
    const name2 = kind === "skill" ? candidate.name : path.slice(slash + 1) + (directory ? "/" : "");
    const description = kind === "skill" ? (candidate.modelInvocable === false || candidate.invocation?.modelInvocable === false ? t("row.skillUserOnly") + " \xB7 " : "") + (candidate.description ?? "") : crumbs.length === 0 && slash >= 0 ? path.slice(0, slash) : "";
    const label = t(kind === "skill" ? "row.skillSelect" : directory ? "row.fileSelectDirectory" : "row.fileSelect") + " " + (kind === "skill" ? "/" + candidate.name : candidate.path);
    list.push((0, import_react11.createElement)("button", {
      key: optionId(index),
      id: optionId(index),
      type: "button",
      role: "option",
      className: "dsh-resend-menu-item",
      "aria-label": label,
      "aria-selected": index === active,
      title: kind === "file" ? candidate.path : "/" + candidate.name,
      ...pickEvents(() => menu.onPick(index)),
      onMouseMove: () => menu.onHover(index)
    }, [
      kind === "file" && (0, import_react11.createElement)("span", { key: "icon", className: "dsh-resend-menu-icon", "aria-hidden": true }, (0, import_react11.createElement)(import_dsh_client_ui_primitives8.ReferenceIconRegular, { kind: directory ? "folder" : "file", size: 14 })),
      (0, import_react11.createElement)("span", { key: "name", className: "dsh-resend-menu-name" }, name2),
      description && (0, import_react11.createElement)("span", { key: "description", className: "dsh-resend-menu-description" }, description),
      directory && (0, import_react11.createElement)("span", { key: "trailing", className: "dsh-resend-menu-trailing" }, [
        (0, import_react11.createElement)("span", { key: "hint", className: "dsh-resend-menu-drill-hint", "aria-hidden": true }, t("row.fileDrill")),
        (0, import_react11.createElement)("kbd", { key: "key", className: "dsh-resend-menu-drill-key", "aria-hidden": true }, "Tab"),
        (0, import_react11.createElement)("span", {
          key: "drill",
          role: "button",
          "aria-label": t("row.fileDrill") + " " + candidate.path,
          className: "dsh-resend-menu-drill",
          ...pickEvents(() => menu.onDrill(index))
        }, (0, import_react11.createElement)(import_dsh_client_ui_primitives8.IconChevronRightOutlineRegular, { size: 12 }))
      ])
    ]));
  });
  return (0, import_react_dom3.createPortal)((0, import_react11.createElement)(import_dsh_client_ui_primitives8.MenuSurface, {
    ref: surface,
    className: "dsh-resend-menu-surface",
    style: { maxHeight },
    "data-trigger-menu": "",
    "data-overflow-below": overflow || void 0
  }, [
    crumbs.length > 0 && (0, import_react11.createElement)(
      "nav",
      { key: "crumbs", className: "dsh-resend-menu-crumbs", "aria-label": t("row.fileNavigation") },
      crumbs.map((crumb, index) => (0, import_react11.createElement)(
        import_react11.Fragment,
        { key: index },
        index > 0 && (0, import_react11.createElement)("span", { className: "dsh-resend-menu-crumb-separator", "aria-hidden": true }, (0, import_react11.createElement)(import_dsh_client_ui_primitives8.IconChevronRightOutlineRegular, { size: 12 })),
        (0, import_react11.createElement)("button", {
          type: "button",
          className: "dsh-resend-menu-crumb",
          disabled: index === crumbs.length - 1,
          "aria-current": index === crumbs.length - 1 ? "location" : void 0,
          "aria-label": index === crumbs.length - 2 ? t("row.fileParent") : crumb.label,
          ...pickEvents(() => menu.onCrumb(index))
        }, crumb.label)
      ))
    ),
    (0, import_react11.createElement)("div", {
      key: "list",
      ref: viewport,
      id: listId,
      className: "dsh-resend-menu-viewport",
      role: "listbox",
      "aria-label": t("row." + kind + "Candidates"),
      "aria-activedescendant": results[active] ? optionId(active) : void 0,
      onScroll: updateOverflow
    }, list)
  ]), menu.element);
}

// src/user-actions.js
var USER_ACTIONS_KIND = "dsh-resend-user-actions";
var identity2 = (value) => value;
function userMessageText(eventOrData) {
  const content = eventOrData?.data?.content ?? eventOrData?.content;
  return Array.isArray(content) ? content.filter((part) => part?.type === "text").map((part) => part.text).join("\n") : "";
}
function userActionsSurface(operations, preferences2) {
  return function BoundUserActions(props) {
    return (0, import_react12.createElement)(UserActionsRow, { ...props, operations, preferences: preferences2 });
  };
}
function userMessageSurface(original, operations, preferences2, hostTranslate) {
  const renderOriginal = typeof original === "function" ? original : original?.type;
  return function UserMessageWithActions(props) {
    const hostProps = { ...props, t: hostTranslate };
    if (typeof renderOriginal !== "function") {
      return (0, import_react12.createElement)(
        import_react12.Fragment,
        null,
        (0, import_react12.createElement)(original, hostProps),
        (0, import_react12.createElement)("div", { role: "alert" }, props.t("row.hostIncompatible"))
      );
    }
    const bubble = renderOriginal(hostProps);
    if (!(0, import_react12.isValidElement)(bubble) || typeof bubble.props.actions !== "function") {
      return (0, import_react12.createElement)(
        import_react12.Fragment,
        null,
        bubble,
        (0, import_react12.createElement)("div", { role: "alert" }, props.t("row.hostIncompatible"))
      );
    }
    return (0, import_react12.createElement)(UserActionsRow, {
      ...props,
      operations,
      preferences: preferences2,
      renderMessage: (action) => (0, import_react12.cloneElement)(bubble, {
        actions: (text) => {
          const actions = bubble.props.actions(text);
          if (!(0, import_react12.isValidElement)(actions)) throw new Error("The host user-message actions no longer return a React element");
          return (0, import_react12.cloneElement)(actions, { extraActions: (0, import_react12.createElement)(import_react12.Fragment, null, actions.props.extraActions, action) });
        }
      })
    });
  };
}
var control = (key, label, icon2, onClick, reason, disabled) => (0, import_react12.createElement)(IconAction, {
  key,
  label,
  icon: icon2,
  onClick,
  reason,
  disabled,
  ...key === "send" ? { primary: true, showLabel: true, "data-primary": true } : {}
});
function InlineEditor({ t, value, draft, editorRef, lookup, lookupSkills, queryContext, subscribeQueryInvalidation, openFile, openSkill, disabled, stopReason, onText, onSend, onCancel, onKeyDown, onClose }) {
  const root = (0, import_react12.useRef)(null);
  const callbacks = (0, import_react12.useRef)();
  callbacks.current = { onText, onKeyDown, openFile, openSkill, onClose };
  const [notice, setNotice] = (0, import_react12.useState)(false);
  const [previewNotice, setPreviewNotice] = (0, import_react12.useState)();
  const [skillNotice, setSkillNotice] = (0, import_react12.useState)();
  const [menu, setMenu] = (0, import_react12.useState)();
  const lastQueryContext = (0, import_react12.useRef)(queryContext);
  (0, import_react12.useLayoutEffect)(() => {
    const editor = createTemporaryEditor(root.current, {
      text: value,
      draft,
      disabled,
      lookup,
      lookupSkills,
      openFile: (path) => callbacks.current.openFile ? callbacks.current.openFile(path) : false,
      openSkill: (name2) => callbacks.current.openSkill ? callbacks.current.openSkill(name2) : false,
      label: t("row.editInput"),
      removeLabel: t("row.removeReference"),
      translate: t,
      onChange: (next) => callbacks.current.onText(next),
      onNotice: setNotice,
      onPreviewNotice: setPreviewNotice,
      onSkillNotice: setSkillNotice,
      onMenuChange: setMenu,
      onKeyDown: (event) => callbacks.current.onKeyDown(event)
    });
    editorRef.current = editor;
    const unsubscribe = subscribeQueryInvalidation?.(() => editor.invalidateQueries());
    return () => {
      unsubscribe?.();
      if (editorRef.current === editor) editorRef.current = null;
      editor.destroy();
      callbacks.current.onClose?.();
    };
  }, []);
  (0, import_react12.useLayoutEffect)(() => {
    if (lastQueryContext.current !== queryContext) editorRef.current?.invalidateQueries();
    lastQueryContext.current = queryContext;
  }, [queryContext]);
  (0, import_react12.useLayoutEffect)(() => editorRef.current?.setDisabled(disabled), [disabled]);
  const label = t("row.editInput"), removeLabel = t("row.removeReference");
  (0, import_react12.useLayoutEffect)(() => editorRef.current?.setLabels(label, removeLabel, t), [label, removeLabel, t]);
  const skillNotices = (skillNotice ? Array.isArray(skillNotice) ? skillNotice : [skillNotice] : []).map((entry) => ["Missing", "Invalid"].includes(entry.status) && menu?.kind === "skill" && menu.status === "Ready" && menu.results.length > 0 ? { ...entry, names: entry.names.filter((name2) => name2 !== menu.query) } : entry).filter((entry) => !["Missing", "Invalid"].includes(entry.status) || entry.names.length > 0);
  const notices = [
    notice && (0, import_react12.createElement)("span", { key: "notice", role: "status", "data-reference-notice": true }, t("row.referenceLookupUnavailable")),
    previewNotice && (0, import_react12.createElement)(
      "span",
      { key: "preview-notice", role: "status", "data-preview-notice": true },
      t("row.referencePreview" + previewNotice.status)
    ),
    skillNotices.length > 0 && (0, import_react12.createElement)(
      "span",
      { key: "skills", role: "status", "data-skill-notice": true },
      skillNotices.map((entry, index) => (0, import_react12.createElement)("span", { key: index }, t("row.skill" + entry.status) + (entry.names.length ? " " + entry.names.map((name2) => "/" + name2).join("\u3001") : "")))
    )
  ].filter(Boolean);
  return (0, import_react12.createElement)(import_react12.Fragment, null, [(0, import_react12.createElement)("div", { key: "surface", className: "dsh-resend-editor-surface" }, [
    (0, import_react12.createElement)("div", { key: "header", className: "dsh-resend-editor-header" }, [
      (0, import_react12.createElement)("span", { key: "label", className: "dsh-resend-editor-label" }, t("row.temporaryInput")),
      control("cancel", t("row.cancel"), import_dsh_client_ui_primitives9.IconCloseOutlineRegular, onCancel, void 0, disabled)
    ]),
    (0, import_react12.createElement)("div", { key: "editor", className: "dsh-resend-editor" }, [
      (0, import_react12.createElement)("div", { key: "input", ref: root, className: "dsh-resend-rich-input" }),
      menu && (0, import_react12.createElement)(ReferenceMenuView, { key: "menu", menu, t }),
      (0, import_react12.createElement)("div", { key: "actions", className: "dsh-resend-editor-actions" }, [
        control("send", t("row.send"), import_dsh_client_ui_primitives9.IconPaperPlaneOutlineRegular, onSend, stopReason ?? (value.trim() === "" ? t("row.blankText") : void 0), disabled)
      ])
    ])
  ]), notices.length > 0 && (0, import_react12.createElement)("div", { key: "notices", className: "dsh-resend-editor-notices" }, notices)]);
}
var InlineEditorSurface = withPanelBoundary(InlineEditor, "panel.error.inlineEditor");
function UserActionsRow(props) {
  const { node, sessionId, useSession, operations, preferences: preferences2, t } = props;
  const prefs = usePreferences(preferences2);
  const preflight = (0, import_react12.useSyncExternalStore)(operations.subscribe, () => operations.preflightFor?.(sessionId));
  const { plan, css, error: hideError, diagnostics } = useHiding({ ...props, suppressError: true });
  const data = { seq: node.data.seq ?? node.anchorSeq, text: node.data.text ?? userMessageText(node.data) };
  const target = { sessionId, targetSeq: data.seq };
  const targetKey = JSON.stringify([sessionId, data.seq, data.text]);
  const [editing, setEditing] = (0, import_react12.useState)();
  const [text, setText] = (0, import_react12.useState)(data.text);
  const [pending, setPending] = (0, import_react12.useState)(false);
  const [error, setError] = (0, import_react12.useState)();
  const inFlight = (0, import_react12.useRef)(false);
  const editorRef = (0, import_react12.useRef)(null);
  const session = typeof useSession === "function" ? useSession(identity2) : void 0;
  const fileScope = typeof props.useSessions === "function" ? props.useSessions((snapshot) => {
    const summary = snapshot.byId[sessionId];
    return JSON.stringify([summary?.cwd, summary?.projectionValues?.agentPreset]);
  }) : void 0;
  const queryContext = JSON.stringify([fileScope, session?.openState]);
  const { conversation, revision } = useConversationEligibility(operations, sessionId, session, plan);
  const hidden = plan?.hiddenSeqs.has(data.seq) === true;
  const reasonFor = (saved, current, context) => {
    if (!context.plan || !current.ready) return t("row.conversationUnavailable");
    if (context.plan.hiddenSeqs.has(context.data.seq) || !current.userSeqs.includes(context.data.seq)) return t("row.shadowed");
    if (!saved.ready) return t(saved.status === "loading" ? "settings.loading" : "settings.read-error");
    if (saved.restrictEditToLastUserMessage !== false && current.lastUserSeq !== context.data.seq) return t("row.notLastUser");
    if (context.session?.running) return t("row.stopFirst");
    if (context.data.text.trim() === "") return t("row.noText");
  };
  const live = (0, import_react12.useRef)();
  live.current = { plan, data, session, revision, text, targetKey };
  const currentReason = () => reasonFor(
    preferences2.getSnapshot(),
    operations.conversationFor(sessionId, live.current.revision),
    live.current
  );
  const stopReason = reasonFor(prefs, conversation, live.current);
  const open = () => {
    if (live.current.targetKey !== targetKey || currentReason() !== void 0 || inFlight.current || operations.preflightFor?.(sessionId)) return;
    operations.clearDraft(target);
    setText(live.current.data.text);
    setError(void 0);
    setEditing(targetKey);
  };
  const cancel = () => {
    if (inFlight.current) return;
    operations.clearDraft(target);
    setEditing(false);
    setError(void 0);
  };
  const send = async () => {
    if (live.current.targetKey !== targetKey || inFlight.current || operations.preflightFor?.(sessionId) || currentReason() !== void 0) return;
    const finalText = editorRef.current?.getText();
    if (finalText === void 0 || finalText.trim() === "") return;
    inFlight.current = true;
    editorRef.current.setDisabled(true);
    setPending(true);
    setError(void 0);
    try {
      const result = await operations.run({ ...target, op: "edit", text: finalText });
      if (result.ok) {
        if (!result.value?.canceled) {
          if (result.value?.resendMessageId !== void 0) operations.clearDraft(target);
          if (live.current.targetKey === targetKey) setEditing(false);
        }
      } else if (live.current.targetKey === targetKey) setError(t("row.operationFailed") + "\uFF1A" + operationErrorText(result.error, t));
    } catch (cause) {
      if (live.current.targetKey === targetKey) setError(t("row.operationFailed") + "\uFF1A" + operationErrorText(cause, t));
      console.warn("[dsh-resend] edit at seq " + data.seq + " in session " + sessionId + ": " + (cause?.message ?? cause));
    } finally {
      inFlight.current = false;
      editorRef.current?.setDisabled(false);
      setPending(false);
    }
  };
  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
    } else if (event.key === "Enter" && !event.shiftKey && !(event.nativeEvent ?? event).isComposing && (event.nativeEvent ?? event).keyCode !== 229) {
      event.preventDefault();
      void send();
    }
  };
  const rules = (0, import_react12.createElement)(HideRulesSurface, { key: "rules", t, css });
  const localDiagnostics = hideError ?? diagnostics.find((entry) => entry.shadowedSeqs.includes(data.seq))?.message;
  if (localDiagnostics !== void 0) {
    return (0, import_react12.createElement)("div", { role: "alert", className: "dsh-resend-row-error" }, [
      props.renderMessage ? (0, import_react12.createElement)(import_react12.Fragment, { key: "message" }, props.renderMessage(null)) : null,
      (0, import_react12.createElement)(UIStyles, { key: "ui" }),
      (0, import_react12.createElement)(ReplayPreflight, { key: "preflight", operations, sessionId, userSeq: data.seq, portal: true, t }),
      (0, import_react12.createElement)(HideRulesSurface, { key: "rules", t, css }),
      (0, import_react12.createElement)("span", { key: "error" }, t("row.hideFailed")),
      (0, import_react12.createElement)("pre", { key: "detail" }, localDiagnostics)
    ]);
  }
  const eligible = !hidden && plan?.userSeqs.has(data.seq);
  if (!eligible) return (0, import_react12.createElement)(
    import_react12.Fragment,
    null,
    rules,
    props.renderMessage?.(null),
    (0, import_react12.createElement)(ReplayPreflight, { operations, sessionId, userSeq: data.seq, portal: true, t })
  );
  const idle = [control("edit", t("row.edit"), import_dsh_client_ui_primitives9.IconEditOutlineRegular, open, stopReason, pending || !!preflight)];
  const editor = editing === targetKey && (0, import_react12.createElement)(InlineEditorSurface, {
    key: targetKey,
    t,
    value: text,
    draft: operations.draftFor(target, data.text),
    editorRef,
    lookup: (query, signal) => operations.referenceCandidates(sessionId, query, signal),
    lookupSkills: (signal) => operations.skillCandidates(sessionId, signal),
    // Chat node owner props are already session-bound by the host. Keeping
    // these callbacks from the same row preserves the target Session and its
    // cwd while the temporary editor is open; the editor passes only the
    // complete path or exact skill name required by the host API.
    openFile: props.openFile,
    openSkill: props.openSkill,
    queryContext,
    subscribeQueryInvalidation: (listener) => operations.subscribeReferenceInvalidation((changedSessionId) => {
      if (changedSessionId === void 0 || changedSessionId === sessionId) listener();
    }),
    disabled: pending || !!preflight,
    stopReason,
    onText: (draft) => {
      if (live.current.targetKey !== targetKey) return;
      operations.saveDraft(target, { ...draft, sourceText: data.text });
      setText(draft.text);
    },
    onSend: () => {
      void send();
    },
    onCancel: cancel,
    onKeyDown,
    onClose: () => operations.clearDraft(target)
  });
  const actions = (0, import_react12.createElement)("span", { className: "dsh-resend-user-actions" }, idle);
  return (0, import_react12.createElement)("div", { className: props.renderMessage ? "dsh-resend-user-message" : void 0 }, [
    rules,
    (0, import_react12.createElement)(UIStyles, { key: "ui" }),
    (0, import_react12.createElement)(ReplayPreflight, { key: "preflight", operations, sessionId, userSeq: data.seq, t }),
    props.renderMessage ? (0, import_react12.createElement)(import_react12.Fragment, { key: "message" }, props.renderMessage(actions)) : (0, import_react12.createElement)(import_react12.Fragment, { key: "actions" }, actions),
    editor,
    error === void 0 ? null : (0, import_react12.createElement)("span", { key: "error", role: "alert", className: "dsh-resend-operation-error" }, error)
  ]);
}
var USER_ACTIONS_DEFINITION = {
  kind: USER_ACTIONS_KIND,
  target: "chat",
  match: (event) => event?.type === "user/message" && event.surfaceOp === "append" ? { id: "dsh-resend-user-actions:" + String(event.data.id), role: "start" } : null,
  start: (_context, match) => ({ seq: match.event.seq, text: userMessageText(match.event) }),
  update: (context) => context.state,
  buildViewNode: (context) => context.state === void 0 ? null : {
    key: context.key,
    kind: USER_ACTIONS_KIND,
    id: context.id,
    target: "chat",
    // Legacy companion metadata stays invisible: visible controls now belong
    // to the shipped user node, so process grouping cannot relocate them.
    anchorSeq: context.state.seq + 0.5,
    location: { kind: "unresolved" },
    visibility: "hidden",
    data: context.state
  }
};
var SURFACE_SHADOW_DEFINITION = {
  kind: "dsh-resend-surface-shadow",
  target: "chat",
  match: (event) => event?.surfaceOp?.op === "replace" ? { id: String(event.seq), role: "start" } : null,
  start: (_context, match) => ({ seq: match.event.seq, shadowedSeqs: [...match.event.sourceEventSeqs ?? []] }),
  update: (context) => context.state,
  buildViewNode: (context) => context.state === void 0 ? null : {
    key: context.key,
    kind: "dsh-resend-surface-shadow",
    id: context.id,
    target: "chat",
    anchorSeq: context.state.seq,
    location: { kind: "unresolved" },
    visibility: "hidden",
    data: context.state
  }
};

// src/regenerate.js
var identity3 = (value) => value;
var ASSISTANT_ACTIONS_ID = "dsh-resend-regenerate";
var ASSISTANT_ACTIONS_KIND = "dsh-resend-regenerate";
function companionStates(snapshot) {
  const states = [];
  if (typeof snapshot?.nodes?.values === "function") {
    for (const node of snapshot.nodes.values()) {
      if (node?.kind === ASSISTANT_ACTIONS_KIND && node.data !== void 0) states.push(node.data);
    }
  }
  return states;
}
function isLastReply(state, conversation) {
  return conversation?.ready === true && conversation.lastReplySeq === state?.seq;
}
function promptRefusal(state) {
  const prompt = state?.prompt;
  if (prompt === void 0 || prompt === null) return void 0;
  if (prompt.isAppend !== true) return void 0;
  if (prompt.sourceKind !== "user") return void 0;
  return prompt.hasText === false ? "imageOnly" : void 0;
}
function regenerateReason(state, conversation, session, plan, restrict = true) {
  if (state === void 0 || state === null) return "offSurface";
  if (plan?.hiddenSeqs?.has?.(state.seq) === true) return "shadowed";
  if (plan === void 0 || conversation?.ready !== true) return "unreadable";
  if (!conversation.assistantSeqs.includes(state.seq)) return "shadowed";
  if (restrict !== false && !isLastReply(state, conversation)) return "notLast";
  if (session?.running === true) return "stopFirst";
  return promptRefusal(state) ?? null;
}
var REASON_TEXT = Object.freeze({
  notLast: "row.notLast",
  stopFirst: "row.stopFirst",
  shadowed: "row.shadowed",
  imageOnly: "row.imageOnly",
  offSurface: "row.offSurface",
  unreadable: "row.conversationUnavailable"
});
function RegenerateControl(props) {
  const { messageId, sessionId, operations, preferences: preferences2, t, useChat, useSession, useConversation } = props;
  const chat = typeof useChat === "function" ? useChat(identity3) : void 0;
  const session = typeof useSession === "function" ? useSession(identity3) : void 0;
  const { plan } = useHiding({ useChat, useConversation, sessionId, operations, suppressError: true });
  const prefs = usePreferences(preferences2);
  const states = companionStates(chat);
  const state = states.find((candidate) => candidate.id === messageId) ?? null;
  const { conversation, revision } = useConversationEligibility(operations, sessionId, session, plan);
  const reason = regenerateReason(state, conversation, session, plan, prefs.restrictRegenerateToLastReply);
  const [pending, setPending] = (0, import_react13.useState)(false);
  const preflight = (0, import_react13.useSyncExternalStore)(operations.subscribe, () => operations.preflightFor?.(sessionId));
  const [error, setError] = (0, import_react13.useState)(null);
  const inFlight = (0, import_react13.useRef)(false);
  const anchor = (0, import_react13.useRef)(null);
  const regenerate = async () => {
    const saved = preferences2.getSnapshot();
    const current = regenerateReason(state, operations.conversationFor(sessionId, revision), session, plan, saved.restrictRegenerateToLastReply);
    if (!saved.ready || !saved.regenerateLastReply || inFlight.current || operations.preflightFor?.(sessionId) || current !== null) return;
    inFlight.current = true;
    setPending(true);
    setError(null);
    try {
      const result = await operations.run({ sessionId, targetSeq: state.seq, op: "regenerate" });
      if (result?.ok !== true) setError(t("row.regenerateFailed") + "\uFF1A" + operationErrorText(result?.error, t));
    } catch (cause) {
      setError(t("row.regenerateFailed") + "\uFF1A" + operationErrorText(cause, t));
      console.warn("[dsh-resend] regenerate at seq " + state.seq + " in session " + sessionId + ": " + (cause?.message ?? cause));
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };
  if (prefs.regenerateLastReply === false) return null;
  const disabledReason = !prefs.ready ? t(prefs.status === "loading" ? "settings.loading" : "settings.read-error") : reason === null ? void 0 : t(REASON_TEXT[reason]);
  return (0, import_react13.createElement)("div", { ref: anchor, className: "dsh-resend-regenerate" }, [
    (0, import_react13.createElement)(UIStyles, { key: "ui" }),
    (0, import_react13.createElement)(ReplayPreflight, {
      key: "preflight-fallback",
      operations,
      sessionId,
      targetSeq: state?.seq,
      t,
      visibleUserSeqs: Array.from(chat?.nodes?.values?.() ?? []).filter((node) => node.kind === "user").map((node) => node.data?.seq ?? node.anchorSeq)
    }),
    (0, import_react13.createElement)(IconAction, {
      key: "regenerate",
      label: t("row.regenerate"),
      icon: import_dsh_client_ui_primitives10.IconRefreshOutlineRegular,
      disabled: !prefs.ready || pending || !!preflight || reason !== null,
      reason: disabledReason,
      onClick: () => {
        void regenerate();
      }
    }),
    conversation.status === "read-error" ? (0, import_react13.createElement)(IconAction, {
      key: "retry-read",
      label: t("settings.retry"),
      icon: import_dsh_client_ui_primitives10.IconRefreshOutlineRegular,
      onClick: () => {
        void operations.refreshConversation(sessionId, revision, true);
      }
    }) : null,
    error === null ? null : (0, import_react13.createElement)(OperationErrorNotice, { key: "error", anchor, text: error, t, onDismiss: () => setError(null) })
  ]);
}
function regenerateSurface(operations, preferences2) {
  return function BoundRegenerate(props) {
    return (0, import_react13.createElement)(RegenerateControl, { ...props, operations, preferences: preferences2 });
  };
}
var ASSISTANT_ACTIONS_DEFINITION = {
  kind: ASSISTANT_ACTIONS_KIND,
  target: "chat",
  match: (event) => event?.type === "assistant/message" && event.surfaceOp === "append" ? { id: String(event.data?.message?.id ?? event.seq), role: "start" } : null,
  start: (_context, match, reader) => {
    const event = match.event;
    const previousReply = reader?.previous?.(ASSISTANT_ACTIONS_KIND);
    const previousPrompt = reader?.previous?.(USER_ACTIONS_KIND);
    const prompt = previousPrompt?.matches?.find((entry) => entry.role === "start")?.event;
    return {
      seq: event.seq,
      id: String(event.data?.message?.id ?? event.seq),
      prevSeq: previousReply?.state?.seq ?? null,
      prompt: prompt === void 0 ? null : {
        seq: prompt.seq,
        isAppend: prompt.surfaceOp === "append",
        sourceKind: prompt.data?.source?.kind ?? null,
        hasText: (Array.isArray(prompt.data?.content) ? prompt.data.content : []).some(
          (block) => block?.type === "text" && typeof block.text === "string"
        )
      }
    };
  },
  update: (context) => context.state,
  buildViewNode: (context) => context.state === void 0 ? null : {
    key: context.key,
    kind: ASSISTANT_ACTIONS_KIND,
    id: context.id,
    target: "chat",
    anchorSeq: context.state.seq,
    location: { kind: "unresolved" },
    visibility: "hidden",
    data: context.state
  }
};

// src/settings-row.js
var import_react14 = require("react");
var import_dsh_client_ui_primitives11 = require("@deepseek-ai/dsh-client-ui-primitives");
var SETTING_KEYS = Object.freeze({
  inlineEditorBeneathMessage: "settings.inlineEditorBeneathMessage",
  regenerateLastReply: "settings.regenerateLastReply",
  restrictRegenerateToLastReply: "settings.restrictRegenerateToLastReply",
  restrictEditToLastUserMessage: "settings.restrictEditToLastUserMessage"
});
var DESCRIPTIONS = Object.freeze({
  inlineEditorBeneathMessage: "settings.inlineEditorFallbackDescription",
  restrictRegenerateToLastReply: "settings.regenerateRangeDescription",
  restrictEditToLastUserMessage: "settings.editRangeDescription"
});
var SETTINGS_ROW_ID = "dsh-resend-preferences";
function SettingsRow({ preferences: preferences2, t, operations }) {
  const snapshot = usePreferences(preferences2);
  return (0, import_react14.createElement)("div", { className: "dsh-resend-settings" }, [
    (0, import_react14.createElement)(UIStyles, { key: "ui" }),
    (0, import_react14.createElement)("div", { key: "heading", className: "dsh-resend-settings-heading" }, t("settings.heading")),
    snapshot.status === "ready" ? null : (0, import_react14.createElement)("div", {
      key: "status",
      role: snapshot.status.endsWith("error") ? "alert" : "status"
    }, [t("settings." + snapshot.status), snapshot.status.endsWith("error") ? (0, import_react14.createElement)(import_dsh_client_ui_primitives11.Button, {
      key: "retry",
      onClick: () => {
        void preferences2.retry();
      }
    }, t("settings.retry")) : null]),
    ...PREFERENCE_FIELDS.map((field) => (0, import_react14.createElement)("div", { key: field, className: "dsh-resend-settings-row", "data-field": field }, [
      (0, import_react14.createElement)("div", { key: "label", className: "dsh-resend-settings-label" }, [
        (0, import_react14.createElement)("span", { key: "name" }, t(SETTING_KEYS[field])),
        DESCRIPTIONS[field] ? (0, import_react14.createElement)("p", {
          key: "description",
          className: "dsh-resend-settings-description",
          id: "dsh-resend-" + field + "-description"
        }, t(DESCRIPTIONS[field])) : null
      ]),
      (0, import_react14.createElement)(import_dsh_client_ui_primitives11.Switch, {
        key: "toggle",
        className: "dsh-resend-settings-toggle",
        label: t(SETTING_KEYS[field]),
        checked: snapshot[field],
        disabled: !snapshot.ready || snapshot.status === "saving",
        "aria-describedby": DESCRIPTIONS[field] ? "dsh-resend-" + field + "-description" : void 0,
        onChange: (next) => {
          void preferences2.set(field, next);
        }
      })
    ])),
    operations ? (0, import_react14.createElement)(StorageCleanup, { key: "cleanup", operations, t }) : null
  ]);
}
function settingsSurface(preferences2, translate, operations) {
  return function BoundSettings(props) {
    return (0, import_react14.createElement)(SettingsRow, { preferences: preferences2, t: props.t ?? translate, operations });
  };
}

// src/rewind-row.js
var import_react15 = require("react");
var import_dsh_client_ui_primitives12 = require("@deepseek-ai/dsh-client-ui-primitives");

// src/marker.js
var MARKER_PREFIX = "dsh-resend-";
function hasMarkerPrefix(id) {
  return typeof id === "string" && id.startsWith(MARKER_PREFIX);
}

// src/rewind-row.js
var REWIND_ROW_KIND = "dsh-resend-error";
function isCarrierEvent(event) {
  return event?.type === "user/message" && event?.surfaceOp !== void 0 && event.surfaceOp !== "append" && hasMarkerPrefix(event.data?.id);
}
function rewindPointView(outcome) {
  return outcome?.status === RESEND_FAILED ? { kind: "resend-failed" } : { kind: "notice" };
}
function RewindRow({ outcome, t, onSendAgain, hidePlan, hideError, onDismiss }) {
  const view = rewindPointView(outcome);
  if (hideError !== void 0) {
    return (0, import_react15.createElement)("div", { className: "dsh-resend-row dsh-resend-row-error", role: "alert" }, [
      (0, import_react15.createElement)(UIStyles, { key: "ui" }),
      (0, import_react15.createElement)(import_dsh_client_ui_primitives12.IconWarningOutlineRegular, { key: "icon", className: "dsh-resend-row-icon" }),
      (0, import_react15.createElement)("span", { key: "message", className: "dsh-resend-row-message" }, t("row.hideFailed")),
      (0, import_react15.createElement)("pre", { key: "detail", className: "dsh-resend-row-detail" }, hideError)
    ]);
  }
  if (view.kind === "notice") {
    return (0, import_react15.createElement)("div", { className: "dsh-resend-row dsh-resend-row-notice" }, [
      (0, import_react15.createElement)(UIStyles, { key: "ui" }),
      (0, import_react15.createElement)("span", { key: "message", className: "dsh-resend-row-message" }, String(t("row.hiddenCount")).replace("{count}", String(hidePlan?.count ?? 0))),
      (0, import_react15.createElement)(IconAction, { key: "dismiss", label: t("row.dismiss"), icon: import_dsh_client_ui_primitives12.IconCloseOutlineRegular, onClick: onDismiss })
    ]);
  }
  return (0, import_react15.createElement)("div", { className: "dsh-resend-row dsh-resend-row-error", role: "alert" }, [
    (0, import_react15.createElement)(UIStyles, { key: "ui" }),
    (0, import_react15.createElement)(import_dsh_client_ui_primitives12.IconWarningOutlineRegular, { key: "icon", className: "dsh-resend-row-icon" }),
    (0, import_react15.createElement)("span", { key: "message", className: "dsh-resend-row-message" }, t("row.resendFailed")),
    (0, import_react15.createElement)(
      IconAction,
      { key: "send-again", label: t("row.sendAgain"), icon: import_dsh_client_ui_primitives12.IconRefreshOutlineRegular, onClick: onSendAgain }
    )
  ]);
}
function rewindRowSurface(operations, preferences2) {
  return function BoundRewindRow(props) {
    return (0, import_react15.createElement)(RewindRowSurface, { ...props, operations, preferences: preferences2 });
  };
}
function RewindRowSurface(props) {
  const { node, sessionId, operations, t } = props;
  const point = { sessionId, carrierSeq: node?.data?.carrierSeq };
  const outcome = (0, import_react15.useSyncExternalStore)(operations.subscribe, () => operations.outcomeOf(point));
  const { plan, css, error } = useHiding(props);
  const [dismissed, setDismissed] = (0, import_react15.useState)(false);
  const hidePlan = plan?.byCarrier.get(point.carrierSeq);
  const missingPlan = plan !== void 0 && hidePlan === void 0 && !plan.errors.has(point.carrierSeq) ? "range " + JSON.stringify(node.data.range ?? [point.carrierSeq]) + ": the rewind point is missing from the Chat hide plan" : void 0;
  const hideError = error ?? plan?.errors.get(point.carrierSeq)?.message ?? missingPlan;
  (0, import_react15.useEffect)(() => {
    if (missingPlan !== void 0) console.warn("[dsh-resend] session " + sessionId + ": unable to hide rewind " + missingPlan);
  }, [missingPlan, sessionId]);
  const row = (0, import_react15.createElement)(RewindRow, {
    outcome,
    t,
    hidePlan,
    hideError,
    onDismiss: () => setDismissed(true),
    onSendAgain: () => {
      void operations.sendAgain(point);
    }
  });
  return (0, import_react15.createElement)("div", null, [
    (0, import_react15.createElement)(HideRulesSurface, { key: "rules", t, css }),
    (!dismissed || rewindPointView(outcome).kind === "resend-failed" || hideError !== void 0) && (0, import_react15.createElement)("div", { key: "row" }, row),
    (0, import_react15.createElement)(FileRollbackPreview, { key: "files", operations, point, t })
  ]);
}
var REWIND_ROW_DEFINITION = {
  kind: REWIND_ROW_KIND,
  target: "chat",
  match: (event) => isCarrierEvent(event) ? { id: `dsh-resend:${String(event.data.id)}`, role: "start" } : null,
  start: (_context, match) => {
    const event = match.event;
    const state = { carrierSeq: event.seq, range: { start: event.surfaceOp.startSeq, end: event.surfaceOp.endSeq } };
    if (Array.isArray(event.sourceEventSeqs)) state.shadowedSeqs = event.sourceEventSeqs.slice(1);
    return state;
  },
  update: (context) => context.state,
  buildViewNode: (context) => {
    if (context.state === void 0) return null;
    return {
      key: context.key,
      kind: REWIND_ROW_KIND,
      id: context.id,
      target: "chat",
      anchorSeq: context.state.carrierSeq,
      // A plugin kind would otherwise enter a collapsible process group. The
      // disclosure must stay independently visible at its seq.
      location: { kind: "unresolved" },
      visibility: "visible",
      data: context.state
    };
  }
};

// src/typert.client.js
var TYPERT_REMOTE = {
  package: PACKAGE,
  descriptors
};

// src/client.js
var name = PACKAGE;
var inject = ["remote"];
var NS = PACKAGE;
var preferences = createPreferences();
var DICTIONARIES = {
  zh: {
    ...CLEANUP_DICTIONARIES["zh-CN"],
    "replay.editDescription": "\u5148\u5904\u7406\u6587\u4EF6\uFF0C\u518D\u53D1\u9001\u7F16\u8F91\u540E\u7684\u6D88\u606F",
    "replay.regenerateDescription": "\u5148\u5904\u7406\u6587\u4EF6\uFF0C\u518D\u91CD\u65B0\u751F\u6210\u56DE\u590D",
    "replay.awaiting": "\u7B49\u5F85\u9009\u62E9 \xB7 \u52A9\u624B\u5C1A\u672A\u751F\u6210",
    "replay.restoreCount": "\u8FD8\u539F {count} \u4E2A\u6587\u4EF6\u5E76\u7EE7\u7EED",
    "replay.keep": "\u4FDD\u7559\u5F53\u524D\u6587\u4EF6\u5E76\u7EE7\u7EED",
    "replay.cancel": "\u53D6\u6D88\u91CD\u53D1",
    "replay.cancelHint": "\u53D6\u6D88\u91CD\u53D1\u4F1A\u4FDD\u7559\u5DF2\u7ECF\u8FD8\u539F\u7684\u6587\u4EF6\uFF0C\u65E7\u5BF9\u8BDD\u4E0D\u4F1A\u56E0\u6B64\u64A4\u56DE\u3002",
    "replay.restoreHint": "\u8FD8\u539F\u5B8C\u6210\u540E\u624D\u4F1A\u5F00\u59CB\u751F\u6210",
    "replay.waitingHint": "\u52A9\u624B\u5C1A\u672A\u5F00\u59CB\u751F\u6210",
    "replay.sending": "\u6B63\u5728\u53D1\u9001\u6D88\u606F\u2026",
    "replay.stale": "\u6587\u4EF6\u6216\u5BF9\u8BDD\u5DF2\u53D8\u5316\u3002\u6587\u4EF6\u53D8\u5316\u540E\u53EF\u91CD\u65B0\u9884\u89C8\uFF1B\u5BF9\u8BDD\u53D8\u5316\u540E\u8BF7\u53D6\u6D88\u91CD\u53D1\uFF0C\u518D\u91CD\u65B0\u64CD\u4F5C\u3002",
    "replay.expired": "\u9884\u89C8\u5DF2\u5931\u6548\uFF0C\u8BF7\u53D6\u6D88\u91CD\u53D1\u540E\u91CD\u65B0\u64CD\u4F5C\u3002",
    "replay.failed": "\u91CD\u53D1\u672A\u5B8C\u6210\u3002\u8BF7\u91CD\u65B0\u9884\u89C8\u540E\u7EE7\u7EED\uFF0C\u6216\u53D6\u6D88\u91CD\u53D1\u3002",
    "files.error.rewind-failed": "\u6587\u4EF6\u5DF2\u8FD8\u539F\uFF0C\u4F46\u65E7\u5BF9\u8BDD\u672A\u80FD\u64A4\u56DE\uFF0C\u6D88\u606F\u5C1A\u672A\u53D1\u9001\u3002\u53EF\u7EE7\u7EED\u91CD\u53D1\uFF1B\u53D6\u6D88\u91CD\u53D1\u4F1A\u4FDD\u7559\u5DF2\u8FD8\u539F\u7684\u6587\u4EF6\u3002",
    "files.title": "\u6587\u4EF6\u56DE\u6EDA",
    "files.description": "\u8FD8\u539F\u672C\u6B21\u91CD\u5199\u8BB0\u5F55\u7684\u6587\u4EF6\u6539\u52A8",
    "files.previewShort": "\u9884\u89C8\u56DE\u6EDA",
    "files.checking": "\u6B63\u5728\u68C0\u67E5\u6587\u4EF6\u2026",
    "files.restoring": "\u6B63\u5728\u8FD8\u539F\u6587\u4EF6\u2026",
    "files.canceling": "\u6B63\u5728\u53D6\u6D88\u9884\u89C8\u2026",
    "files.awaiting": "\u68C0\u67E5\u6587\u4EF6 \xB7 \u7B49\u5F85\u786E\u8BA4",
    "files.finished": "\u5DF2\u7ED3\u675F",
    "files.viewResult": "\u67E5\u770B\u7ED3\u679C",
    "files.readingStatus": "\u6B63\u5728\u8BFB\u53D6\u56DE\u6EDA\u72B6\u6001\u2026",
    "files.error.result-save-failed": "\u6587\u4EF6\u5DF2\u8FD8\u539F\uFF0C\u4F46\u7ED3\u679C\u672A\u80FD\u4FDD\u5B58\u3002\u8BF7\u68C0\u67E5\u5B58\u50A8\u540E\u91CD\u65B0\u8BFB\u53D6\u72B6\u6001\uFF1B\u672C\u6B21\u8FD0\u884C\u4E2D\u4E0D\u4F1A\u91CD\u590D\u8FD8\u539F\u3002",
    "files.needsPreview": "\u9700\u8981\u91CD\u65B0\u9884\u89C8",
    "files.restoreCount": "{count} \u4E2A\u6587\u4EF6\u53EF\u8FD8\u539F",
    "files.restoredCount": "\u5DF2\u8FD8\u539F {count} \u4E2A\u6587\u4EF6",
    "files.keepCount": "{count} \u4E2A\u6587\u4EF6\u5C06\u4FDD\u7559\u5F53\u524D\u5185\u5BB9",
    "files.keptCount": "{count} \u4E2A\u6587\u4EF6\u672A\u8FD8\u539F",
    "files.list": "\u6587\u4EF6\u56DE\u6EDA\u6E05\u5355",
    "files.root": "\u9879\u76EE\u6839\u76EE\u5F55",
    "files.unavailable": "\u65E0\u6CD5\u8FD8\u539F",
    "files.kept": "\u672A\u8FD8\u539F",
    "files.confirmHint": "\u786E\u8BA4\u540E\u624D\u4F1A\u6539\u52A8\u6587\u4EF6",
    "files.recordedOnly": "\u4EC5\u5904\u7406\u672C\u6B21\u8BB0\u5F55\u7684\u6587\u4EF6",
    "files.executeCount": "\u786E\u8BA4\u8FD8\u539F {count} \u4E2A\u6587\u4EF6",
    "files.close": "\u6536\u8D77",
    "files.closeResult": "\u6536\u8D77\u7ED3\u679C",
    "files.retry": "\u91CD\u65B0\u9884\u89C8",
    "files.preview": "\u9884\u89C8\u6587\u4EF6\u56DE\u6EDA",
    "files.heading": "\u786E\u8BA4\u524D\u4E0D\u4F1A\u6539\u52A8\u6587\u4EF6\u3002\u4EE5\u4E0B\u6587\u4EF6\u5C06\u6309\u6B64\u8BA1\u5212\u5904\u7406\uFF1A",
    "files.completed": "\u6587\u4EF6\u56DE\u6EDA\u5DF2\u7ED3\u675F\u3002\u4EE5\u4E0B\u662F\u672C\u6B21\u5904\u7406\u7ED3\u679C\uFF1A",
    "files.empty": "\u8FD9\u6B21\u91CD\u5199\u6CA1\u6709\u8BB0\u5F55\u5230\u6587\u4EF6\u6539\u52A8\u3002",
    "files.restore": "\u5C06\u8FD8\u539F",
    "files.restored": "\u5DF2\u8FD8\u539F",
    "files.refuse": "\u62D2\u7EDD\u8FD8\u539F",
    "files.execute": "\u786E\u8BA4\u8FD8\u539F\u6587\u4EF6",
    "files.cancel": "\u53D6\u6D88",
    "files.reason.content-diverged": "\u6587\u4EF6\u5DF2\u88AB\u5176\u4ED6\u64CD\u4F5C\u4FEE\u6539",
    "files.reason.diverged-between-writes": "\u4E24\u6B21\u5199\u5165\u4E4B\u95F4\u5B58\u5728\u5176\u4ED6\u4FEE\u6539",
    "files.reason.prior-state-unavailable": "\u7F3A\u5C11\u53EF\u9760\u7684\u539F\u59CB\u5185\u5BB9",
    "files.reason.tool-result-unavailable": "\u7F3A\u5C11\u5DE5\u5177\u7ED3\u679C\uFF0C\u65E0\u6CD5\u786E\u8BA4\u6587\u4EF6\u4FEE\u6539\u60C5\u51B5",
    "files.reason.tool-result-ambiguous": "\u5DE5\u5177\u7ED3\u679C\u5173\u8054\u4E0D\u660E\u786E\uFF0C\u65E0\u6CD5\u53EF\u9760\u8FD8\u539F",
    "files.reason.unsafe-path": "\u6587\u4EF6\u8DEF\u5F84\u4E0D\u5728\u53EF\u8FD8\u539F\u8303\u56F4\u5185",
    "files.reason.unreadable-file": "\u65E0\u6CD5\u8BFB\u53D6\u6587\u4EF6",
    "files.reason.snapshot-unavailable": "\u539F\u59CB\u5185\u5BB9\u8BB0\u5F55\u65E0\u6CD5\u8BFB\u53D6",
    "files.reason.restore-failed": "\u6587\u4EF6\u8FD8\u539F\u5931\u8D25",
    "files.reason.write-outcome-unavailable": "\u5199\u5165\u5931\u8D25\uFF0C\u65E0\u6CD5\u786E\u8BA4\u6587\u4EF6\u53D8\u5316\u7684\u6765\u6E90",
    "files.reason.execution-stopped": "\u672C\u6B21\u8FD8\u539F\u5DF2\u505C\u6B62\uFF0C\u672A\u5904\u7406\u6B64\u6587\u4EF6",
    "files.reason.agent-busy": "\u56DE\u590D\u5DF2\u5F00\u59CB\uFF0C\u505C\u6B62\u8FD8\u539F\u4EE5\u514D\u8986\u76D6\u6B63\u5728\u5199\u5165\u7684\u6587\u4EF6",
    "files.reason.already-restored": "\u6B64\u524D\u5DF2\u8FD8\u539F\uFF0C\u4FDD\u7559\u5F53\u524D\u6587\u4EF6",
    "files.reason.restore-outcome-unavailable": "\u6B64\u524D\u8FD8\u539F\u4E2D\u65AD\uFF0C\u65E0\u6CD5\u786E\u8BA4\u7ED3\u679C\uFF0C\u4FDD\u7559\u5F53\u524D\u6587\u4EF6",
    "files.error.progress-save-failed": "\u8FD8\u539F\u8FDB\u5EA6\u65E0\u6CD5\u4FDD\u5B58\uFF0C\u5DF2\u505C\u6B62\u5904\u7406\u3002\u4EE5\u4E0B\u5217\u51FA\u672C\u6B21\u5DF2\u8FD8\u539F\u4E0E\u672A\u8FD8\u539F\u7684\u6587\u4EF6\u3002\u8BF7\u68C0\u67E5\u5B58\u50A8\u540E\u91CD\u65B0\u9884\u89C8\u3002",
    "files.error.storage-busy": "\u5176\u4ED6\u7A97\u53E3\u6B63\u5728\u5904\u7406\u56DE\u6EDA\u6570\u636E\uFF0C\u8BF7\u7A0D\u540E\u91CD\u65B0\u9884\u89C8\u3002",
    "files.error.storage-recovery-required": "\u53D1\u73B0\u65E0\u6CD5\u786E\u8BA4\u5F52\u5C5E\u7684\u65E7\u9501\uFF0C\u5DF2\u505C\u6B62\u64CD\u4F5C\u3002\u8BF7\u9000\u51FA\u5BBF\u4E3B\u540E\u68C0\u67E5\u63D2\u4EF6\u5B58\u50A8\u4E2D\u7684\u534F\u8C03\u6587\u4EF6\u3002",
    "files.error.no-target-state": "\u8FD9\u6B21\u91CD\u5199\u6CA1\u6709\u53EF\u7528\u7684\u6587\u4EF6\u8FD8\u539F\u8BB0\u5F55\u3002",
    "files.error.preview-stale": "\u9884\u89C8\u540E\u6587\u4EF6\u53D1\u751F\u53D8\u5316\uFF0C\u672A\u6267\u884C\u8FD8\u539F\u3002\u8BF7\u91CD\u65B0\u9884\u89C8\u3002",
    "files.error.plan-not-found": "\u9884\u89C8\u5DF2\u5931\u6548\uFF0C\u8BF7\u91CD\u65B0\u9884\u89C8\u3002",
    "files.error.agent-busy": "\u8BF7\u5148\u505C\u6B62\u56DE\u590D\uFF0C\u518D\u9884\u89C8\u6587\u4EF6\u56DE\u6EDA\u3002",
    "files.error.session-not-found": "\u5F53\u524D\u4F1A\u8BDD\u65E0\u6CD5\u8BFB\u53D6\u3002",
    "files.error.bad-request": "\u6587\u4EF6\u56DE\u6EDA\u8BF7\u6C42\u65E0\u6548\uFF0C\u8BF7\u91CD\u65B0\u9884\u89C8\u3002",
    "files.error.internal": "\u6587\u4EF6\u56DE\u6EDA\u672A\u5B8C\u6210\uFF0C\u8BF7\u91CD\u65B0\u9884\u89C8\u540E\u68C0\u67E5\u6587\u4EF6\u3002",
    "files.error.execution-stopped": "\u6587\u4EF6\u56DE\u6EDA\u5DF2\u505C\u6B62\u3002\u4EE5\u4E0B\u5217\u51FA\u5DF2\u8FD8\u539F\u4E0E\u672A\u8FD8\u539F\u7684\u6587\u4EF6\uFF0C\u8BF7\u68C0\u67E5\u540E\u91CD\u65B0\u9884\u89C8\u3002",
    "row.resendFailed": "\u5386\u53F2\u5DF2\u88AB\u91CD\u5199\uFF0C\u4F46\u91CD\u53D1\u5931\u8D25\uFF1Aagent \u6CA1\u6709\u63A5\u6536\u8FD9\u6761\u63D0\u793A\u8BCD\u3002",
    "row.sendAgain": "\u91CD\u65B0\u53D1\u9001",
    "row.edit": "\u7F16\u8F91",
    "row.hostIncompatible": "\u5F53\u524D DSH \u7248\u672C\u7684\u6D88\u606F\u64CD\u4F5C\u533A\u65E0\u6CD5\u6269\u5C55\uFF0C\u7F16\u8F91\u5165\u53E3\u6682\u4E0D\u53EF\u7528\u3002",
    "row.editInput": "\u7F16\u8F91\u6D88\u606F",
    "row.send": "\u53D1\u9001",
    "row.cancel": "\u53D6\u6D88",
    "row.editInComposer": "\u5728\u6B63\u5F0F\u8F93\u5165\u6846\u4E2D\u7F16\u8F91",
    "row.editInComposerHint": "\u5BBF\u4E3B\u6682\u4E0D\u652F\u6301\u5728\u6B63\u5F0F\u8F93\u5165\u6846\u4E2D\u7F16\u8F91\u91CD\u53D1\uFF0C\u8BF7\u4F7F\u7528\u4E34\u65F6\u8F93\u5165\u6846",
    "row.composerResendUnavailable": "\u5BBF\u4E3B\u6682\u4E0D\u652F\u6301\u5728\u6B63\u5F0F\u8F93\u5165\u6846\u4E2D\u7F16\u8F91\u91CD\u53D1\uFF0C\u8BF7\u4F7F\u7528\u4E34\u65F6\u8F93\u5165\u6846",
    "row.temporaryInput": "\u4E34\u65F6\u8F93\u5165\u6846",
    "row.fileGroup": "\u6587\u4EF6",
    "row.fileRoot": "\u5DE5\u4F5C\u533A",
    "row.fileNavigation": "\u76EE\u5F55\u5BFC\u822A",
    "row.skillGroup": "\u6280\u80FD",
    "row.skillUserOnly": "\u4EC5\u7528\u6237",
    "row.removeReference": "\u5220\u9664\u5F15\u7528",
    "row.referenceLookupUnavailable": "\u6682\u65F6\u65E0\u6CD5\u786E\u8BA4\u6587\u4EF6\u5F15\u7528\uFF0C\u5DF2\u4FDD\u7559\u539F\u6587\uFF0C\u53EF\u7EE7\u7EED\u7F16\u8F91\u91CD\u53D1\u3002",
    "row.referencePreviewUnavailable": "\u5F53\u524D\u5BBF\u4E3B\u4E0D\u652F\u6301\u6253\u5F00\u6B64\u5F15\u7528\uFF0C\u6B63\u6587\u548C\u8349\u7A3F\u5DF2\u4FDD\u7559\u3002",
    "row.referencePreviewFailed": "\u6253\u5F00\u5F15\u7528\u5931\u8D25\uFF0C\u6B63\u6587\u548C\u8349\u7A3F\u5DF2\u4FDD\u7559\u3002",
    "row.fileCandidates": "\u6587\u4EF6\u4E0E\u76EE\u5F55\u5019\u9009",
    "row.fileLoading": "\u6B63\u5728\u67E5\u8BE2\u6587\u4EF6\u4E0E\u76EE\u5F55\u2026",
    "row.fileReady": "\u9009\u62E9\u4EC5\u5F15\u7528\u8DEF\u5F84\uFF1B\u76EE\u5F55\u53EF\u9009\u5B9A\u6216\u8FDB\u5165\u3002",
    "row.fileEmpty": "\u6CA1\u6709\u5339\u914D\u7684\u6587\u4EF6\u6216\u76EE\u5F55\uFF0C\u53EF\u4FEE\u6539\u67E5\u8BE2\u3002",
    "row.fileUnavailable": "\u5BBF\u4E3B\u672A\u63D0\u4F9B\u6587\u4EF6\u67E5\u8BE2\uFF0C\u5173\u95ED\u83DC\u5355\u540E\u53EF\u6309\u539F\u6587\u91CD\u53D1\u3002",
    "row.fileFailed": "\u6587\u4EF6\u67E5\u8BE2\u5931\u8D25\uFF0C\u539F\u6587\u5DF2\u4FDD\u7559\u3002\u53EF\u4FEE\u6539\u67E5\u8BE2\u6216\u5173\u95ED\u83DC\u5355\u540E\u91CD\u53D1\u3002",
    "row.fileParent": "\u8FD4\u56DE\u4E0A\u7EA7",
    "row.fileClose": "\u5173\u95ED\u6587\u4EF6\u83DC\u5355",
    "row.fileSelect": "\u5F15\u7528\u6587\u4EF6",
    "row.fileSelectDirectory": "\u5F15\u7528\u76EE\u5F55",
    "row.fileDrill": "\u8FDB\u5165\u76EE\u5F55",
    "row.skillCandidates": "\u53EF\u4F9B\u7528\u6237\u8C03\u7528\u7684\u6280\u80FD",
    "row.skillLoading": "\u6B63\u5728\u67E5\u8BE2\u6280\u80FD\u2026",
    "row.skillReady": "\u9009\u62E9\u6280\u80FD\u540E\u53EF\u7EE7\u7EED\u7F16\u8F91\u540D\u79F0\uFF1B\u53D1\u9001\u65F6\u7531\u5BBF\u4E3B\u786E\u8BA4\u5E76\u52A0\u8F7D\u3002",
    "row.skillEmpty": "\u6CA1\u6709\u5339\u914D\u7684\u53EF\u7528\u6280\u80FD\uFF0C\u5173\u95ED\u83DC\u5355\u540E\u53EF\u6309\u539F\u6587\u91CD\u53D1\u3002",
    "row.skillUnavailable": "\u5BBF\u4E3B\u672A\u63D0\u4F9B\u6280\u80FD\u67E5\u8BE2\uFF0C\u65E0\u6CD5\u786E\u8BA4\u53EF\u7528\u6027\u3002\u5DF2\u4FDD\u7559\u539F\u6587\uFF0C\u53EF\u7EE7\u7EED\u91CD\u53D1\u3002",
    "row.skillFailed": "\u6280\u80FD\u67E5\u8BE2\u5931\u8D25\uFF0C\u65E0\u6CD5\u786E\u8BA4\u53EF\u7528\u6027\u3002\u5DF2\u4FDD\u7559\u539F\u6587\uFF0C\u53EF\u7EE7\u7EED\u91CD\u53D1\u3002",
    "row.skillClose": "\u5173\u95ED\u6280\u80FD\u83DC\u5355",
    "row.skillSelect": "\u9009\u62E9\u6280\u80FD",
    "row.skillChecking": "\u6B63\u5728\u786E\u8BA4\u6587\u672C\u4E2D\u7684\u6280\u80FD\u2026",
    "row.skillMissing": "\u4EE5\u4E0B\u6280\u80FD\u5F53\u524D\u4E0D\u53EF\u4F9B\u7528\u6237\u8C03\u7528\uFF0C\u53EF\u80FD\u5DF2\u5931\u6548\u6216\u6539\u540D\u3002\u5DF2\u4FDD\u7559\u539F\u6587\uFF0C\u53EF\u7EE7\u7EED\u91CD\u53D1\uFF1A",
    "row.skillInvalid": "\u4EE5\u4E0B\u6587\u5B57\u4E0D\u7B26\u5408\u6280\u80FD\u8C03\u7528\u683C\u5F0F\uFF0C\u5C06\u4F5C\u4E3A\u666E\u901A\u539F\u6587\u53D1\u9001\uFF1B\u6280\u80FD\u540D\u79F0\u524D\u540E\u9700\u6709\u7A7A\u767D\uFF1A",
    "row.hiddenCount": "\u5DF2\u9690\u85CF {count} \u6761\u6D88\u606F",
    "row.dismiss": "\u5173\u95ED",
    "row.hideFailed": "\u91CD\u5199\u540E\u7684\u6D88\u606F\u65E0\u6CD5\u9690\u85CF",
    "row.stopFirst": "\u8BF7\u5148\u505C\u6B62\u56DE\u590D",
    "row.noText": "\u8FD9\u6761\u6D88\u606F\u6CA1\u6709\u53EF\u7F16\u8F91\u7684\u6587\u672C",
    "row.blankText": "\u6D88\u606F\u4E0D\u80FD\u4E3A\u7A7A",
    "row.composerBusy": "\u8F93\u5165\u6846\u6B63\u5728\u5FD9\u788C\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5",
    "row.composerUnavailable": "\u5F53\u524D\u8F93\u5165\u6846\u65E0\u6CD5\u63A5\u6536\u6587\u672C",
    "row.operationFailed": "\u7F16\u8F91\u5E76\u91CD\u53D1\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5",
    "row.regenerate": "\u91CD\u65B0\u751F\u6210",
    "row.notLast": "\u53EA\u80FD\u91CD\u65B0\u751F\u6210\u6700\u540E\u4E00\u6761\u56DE\u590D",
    "row.shadowed": "\u8FD9\u6761\u56DE\u590D\u5DF2\u88AB\u91CD\u5199",
    "row.imageOnly": "\u8FD9\u6761\u63D0\u793A\u8BCD\u6CA1\u6709\u53EF\u91CD\u53D1\u7684\u6587\u672C",
    "row.offSurface": "\u8FD9\u6761\u56DE\u590D\u4E0D\u5728\u5F53\u524D\u5BF9\u8BDD\u9762\u4E0A",
    "row.regenerateFailed": "\u91CD\u65B0\u751F\u6210\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5",
    "panel.errorTitle": "\u8FD9\u4E2A\u754C\u9762\u65E0\u6CD5\u663E\u793A",
    "panel.errorHint": "\u5176\u4F59\u754C\u9762\u4E0D\u53D7\u5F71\u54CD\u3002\u53EF\u4EE5\u91CD\u8BD5\uFF0C\u6216\u5237\u65B0\u9875\u9762\u3002",
    "panel.retry": "\u91CD\u8BD5",
    "panel.error.rewindRow": "\u91CD\u5199\u70B9\u65E0\u6CD5\u663E\u793A",
    "panel.error.userActions": "\u7528\u6237\u6D88\u606F\u64CD\u4F5C\u65E0\u6CD5\u663E\u793A",
    "panel.error.regenerate": "\u91CD\u751F\u6210\u529F\u80FD\u65E0\u6CD5\u663E\u793A",
    "panel.error.inlineEditor": "\u5185\u8054\u7F16\u8F91\u5668\u65E0\u6CD5\u663E\u793A",
    "panel.error.hideRules": "\u9690\u85CF\u89C4\u5219\u65E0\u6CD5\u663E\u793A",
    "panel.error.settings": "\u8BBE\u7F6E\u884C\u65E0\u6CD5\u663E\u793A",
    "panel.error.settingsNavigation": "\u8BBE\u7F6E\u5BFC\u822A\u56FE\u6807\u65E0\u6CD5\u663E\u793A",
    "settings.heading": "DSH Resend \u8BBE\u7F6E",
    "settings.nav": "DSH Resend",
    "operation.dismiss": "\u5173\u95ED\u9519\u8BEF\u63D0\u793A",
    "operation.error.bad-request": "\u8BF7\u6C42\u5185\u5BB9\u65E0\u6548\uFF0C\u8BF7\u91CD\u65B0\u6253\u5F00\u7F16\u8F91\u5668\u540E\u53D1\u9001\u3002",
    "operation.error.session-not-found": "\u5F53\u524D\u4F1A\u8BDD\u65E0\u6CD5\u8BFB\u53D6\uFF0C\u8BF7\u91CD\u65B0\u6253\u5F00\u4F1A\u8BDD\u3002",
    "operation.error.agent-unavailable": "\u5F53\u524D\u4F1A\u8BDD\u7684\u667A\u80FD\u4F53\u4E0D\u53EF\u7528\uFF0C\u8BF7\u91CD\u65B0\u6253\u5F00\u4F1A\u8BDD\u540E\u91CD\u8BD5\u3002",
    "operation.error.agent-busy": "\u56DE\u590D\u6B63\u5728\u8FDB\u884C\uFF0C\u8BF7\u5148\u505C\u6B62\u56DE\u590D\uFF0C\u518D\u91CD\u8BD5\u3002",
    "operation.error.message-not-found": "\u627E\u4E0D\u5230\u76EE\u6807\u6D88\u606F\uFF0C\u8BF7\u5237\u65B0\u4F1A\u8BDD\u540E\u91CD\u8BD5\u3002",
    "operation.error.message-pending": "\u76EE\u6807\u6D88\u606F\u5C1A\u672A\u5B8C\u6574\u52A0\u8F7D\uFF0C\u8BF7\u7B49\u5F85\u52A0\u8F7D\u5B8C\u6210\u540E\u91CD\u8BD5\u3002",
    "operation.error.target-shadowed": "\u8FD9\u6761\u6D88\u606F\u5DF2\u88AB\u540E\u7EED\u7F16\u8F91\u66FF\u6362\uFF0C\u8BF7\u9009\u62E9\u5F53\u524D\u663E\u793A\u7684\u6D88\u606F\u3002",
    "operation.error.not-user-message": "\u76EE\u6807\u4E0D\u662F\u53EF\u7F16\u8F91\u7684\u7528\u6237\u6D88\u606F\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9\u3002",
    "operation.error.not-last-reply": "\u53EA\u80FD\u91CD\u65B0\u751F\u6210\u6700\u540E\u4E00\u6761\u56DE\u590D\uFF0C\u8BF7\u9009\u62E9\u6700\u540E\u4E00\u6761\u56DE\u590D\u3002",
    "operation.error.not-last-user-message": "\u53EA\u80FD\u7F16\u8F91\u91CD\u53D1\u6700\u540E\u4E00\u6761\u7528\u6237\u6D88\u606F\uFF0C\u8BF7\u9009\u62E9\u6700\u540E\u4E00\u6761\u7528\u6237\u6D88\u606F\u3002",
    "row.notLastUser": "\u53EA\u80FD\u7F16\u8F91\u91CD\u53D1\u6700\u540E\u4E00\u6761\u7528\u6237\u6D88\u606F",
    "operation.error.not-assistant-message": "\u76EE\u6807\u4E0D\u662F\u53EF\u91CD\u65B0\u751F\u6210\u7684\u52A9\u624B\u56DE\u590D\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9\u3002",
    "row.conversationUnavailable": "\u6682\u65F6\u65E0\u6CD5\u786E\u8BA4\u5F53\u524D\u6709\u6548\u5BF9\u8BDD\uFF0C\u8BF7\u91CD\u8BD5",
    "operation.error.blank-text": "\u6D88\u606F\u5185\u5BB9\u4E0D\u80FD\u4E3A\u7A7A\uFF0C\u8BF7\u8F93\u5165\u5185\u5BB9\u540E\u53D1\u9001\u3002",
    "operation.error.no-text": "\u8FD9\u6761\u6D88\u606F\u6CA1\u6709\u53EF\u91CD\u53D1\u7684\u6587\u5B57\u5185\u5BB9\uFF0C\u8BF7\u5728\u8F93\u5165\u6846\u4E2D\u91CD\u65B0\u53D1\u9001\u3002",
    "operation.error.internal": "DSH \u5904\u7406\u91CD\u53D1\u65F6\u53D1\u751F\u9519\u8BEF\uFF0C\u8BF7\u67E5\u770B\u5BBF\u4E3B\u8BCA\u65AD\u65E5\u5FD7\u540E\u91CD\u8BD5\u3002",
    "operation.error.connection": "\u4E0E DSH \u7684\u901A\u4FE1\u672A\u5B8C\u6210\uFF0C\u8BF7\u786E\u8BA4\u5E94\u7528\u4ECD\u5728\u8FD0\u884C\uFF0C\u7136\u540E\u91CD\u8BD5\u3002",
    "operation.error.cancelled": "\u8BF7\u6C42\u5DF2\u53D6\u6D88\uFF0C\u8BF7\u91CD\u8BD5\u3002",
    "operation.error.result-invalid": "DSH \u8FD4\u56DE\u7684\u7ED3\u679C\u65E0\u6CD5\u8BC6\u522B\uFF0C\u8BF7\u66F4\u65B0\u63D2\u4EF6\u6216\u68C0\u67E5\u7248\u672C\u517C\u5BB9\u6027\u3002",
    "operation.error.unexpected": "\u63D2\u4EF6\u5904\u7406\u8BF7\u6C42\u65F6\u53D1\u751F\u9519\u8BEF\uFF0C\u8BF7\u91CD\u65B0\u6253\u5F00\u4F1A\u8BDD\u5E76\u68C0\u67E5\u8BCA\u65AD\u65E5\u5FD7\u3002",
    "settings.inlineEditorBeneathMessage": "\u6D88\u606F\u4E0B\u65B9\u7684\u5185\u8054\u7F16\u8F91\u5668",
    "settings.inlineEditorFallbackDescription": "\u5F53\u524D\u5BBF\u4E3B\u6682\u4E0D\u652F\u6301\u6B63\u5F0F\u8F93\u5165\u6846\u7F16\u8F91\u91CD\u53D1\u3002\u6B64\u8BBE\u7F6E\u5173\u95ED\u65F6\u4ECD\u4F7F\u7528\u4E34\u65F6\u8F93\u5165\u6846\u3002",
    "settings.regenerateLastReply": "\u663E\u793A\u91CD\u65B0\u751F\u6210\u6309\u94AE",
    "settings.restrictRegenerateToLastReply": "\u53EA\u5141\u8BB8\u91CD\u65B0\u751F\u6210\u6700\u540E\u4E00\u6761\u52A9\u624B\u56DE\u590D",
    "settings.restrictEditToLastUserMessage": "\u53EA\u5141\u8BB8\u7F16\u8F91\u91CD\u53D1\u6700\u540E\u4E00\u6761\u7528\u6237\u6D88\u606F",
    "settings.editRangeDescription": "\u5F00\u542F\u540E\uFF0C\u4EC5\u53EF\u7F16\u8F91\u91CD\u53D1\u6700\u540E\u4E00\u6761\u7528\u6237\u6D88\u606F\uFF1B\u5173\u95ED\u540E\uFF0C\u5219\u5141\u8BB8\u7F16\u8F91\u91CD\u53D1\u8F83\u65E9\u7684\u7528\u6237\u6D88\u606F\u3002\u64CD\u4F5C\u5C06\u4ECE\u6240\u9009\u6D88\u606F\u91CD\u65B0\u7EED\u63A5\uFF0C\u5E76\u53D1\u9001\u4FEE\u6539\u540E\u7684\u5185\u5BB9\uFF0C\u5176\u540E\u7684\u5BF9\u8BDD\u5C06\u9000\u51FA\u5F53\u524D\u4E0A\u4E0B\u6587\u3002",
    "settings.regenerateRangeDescription": "\u5F00\u542F\u540E\uFF0C\u4EC5\u53EF\u91CD\u65B0\u751F\u6210\u6700\u540E\u4E00\u6761\u52A9\u624B\u56DE\u590D\uFF1B\u5173\u95ED\u540E\uFF0C\u5219\u5141\u8BB8\u91CD\u65B0\u751F\u6210\u8F83\u65E9\u7684\u52A9\u624B\u56DE\u590D\u3002\u64CD\u4F5C\u5C06\u4ECE\u6240\u9009\u56DE\u590D\u5BF9\u5E94\u7684\u95EE\u9898\u91CD\u65B0\u7EED\u63A5\uFF0C\u5176\u540E\u7684\u5BF9\u8BDD\u5C06\u9000\u51FA\u5F53\u524D\u4E0A\u4E0B\u6587\u3002",
    "settings.loading": "\u6B63\u5728\u8BFB\u53D6\u8BBE\u7F6E\u2026",
    "settings.saving": "\u6B63\u5728\u4FDD\u5B58\u2026",
    "settings.read-error": "\u8BBE\u7F6E\u8BFB\u53D6\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5",
    "settings.save-error": "\u8BBE\u7F6E\u4FDD\u5B58\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5",
    "settings.retry": "\u91CD\u8BD5",
    "settings.on": "\u5F00",
    "settings.off": "\u5173"
  },
  en: {
    "replay.editDescription": "Review files before sending the edited message",
    "replay.regenerateDescription": "Review files before regenerating the reply",
    "replay.awaiting": "Waiting for your choice \xB7 Assistant has not started",
    "replay.restoreCount": "Restore {count} files and continue",
    "replay.keep": "Keep current files and continue",
    "replay.cancel": "Cancel replay",
    "replay.cancelHint": "Canceling keeps the restored files and leaves the old conversation in place.",
    "replay.restoreHint": "Generation starts after files are restored",
    "replay.waitingHint": "The assistant has not started generating",
    "replay.sending": "Sending the message\u2026",
    "replay.stale": "Files or conversation changed. Refresh the preview for file changes; cancel and start again for conversation changes.",
    "replay.expired": "The preview expired. Cancel replay and start again.",
    "replay.failed": "Replay did not finish. Refresh the preview to continue, or cancel replay.",
    "files.error.rewind-failed": "Files were restored, but the conversation could not be rewound and the message was not sent. Retry to continue; canceling keeps the restored files.",
    ...CLEANUP_DICTIONARIES.en,
    "files.title": "File rollback",
    "files.description": "Restore file changes recorded for this rewind",
    "files.previewShort": "Preview rollback",
    "files.checking": "Checking files\u2026",
    "files.restoring": "Restoring files\u2026",
    "files.canceling": "Canceling preview\u2026",
    "files.awaiting": "Check files \xB7 Awaiting confirmation",
    "files.finished": "Finished",
    "files.viewResult": "View results",
    "files.readingStatus": "Reading rollback status\u2026",
    "files.error.result-save-failed": "Files were restored, but the result could not be saved. Check storage and read the status again. This run will not restore them twice.",
    "files.needsPreview": "Preview again",
    "files.restoreCount": "{count} files can be restored",
    "files.restoredCount": "Restored {count} files",
    "files.keepCount": "{count} files will keep their current contents",
    "files.keptCount": "{count} files were not restored",
    "files.list": "File rollback list",
    "files.root": "Project root",
    "files.unavailable": "Cannot restore",
    "files.kept": "Not restored",
    "files.confirmHint": "Files change only after confirmation",
    "files.recordedOnly": "Only files recorded for this rewind",
    "files.executeCount": "Restore {count} files",
    "files.close": "Collapse",
    "files.closeResult": "Collapse results",
    "files.retry": "Preview again",
    "files.preview": "Preview file rollback",
    "files.heading": "Files stay unchanged until confirmation. This plan will process:",
    "files.completed": "File rollback finished. Results:",
    "files.empty": "No file changes were recorded for this rewind.",
    "files.restore": "Will restore",
    "files.restored": "Restored",
    "files.refuse": "Refused",
    "files.execute": "Confirm file restore",
    "files.cancel": "Cancel",
    "files.reason.content-diverged": "The file was changed by another operation",
    "files.reason.diverged-between-writes": "Other changes occurred between writes",
    "files.reason.prior-state-unavailable": "Reliable prior contents are unavailable",
    "files.reason.tool-result-unavailable": "Tool result is missing; file changes cannot be verified",
    "files.reason.tool-result-ambiguous": "Tool result association is ambiguous; safe restoration is unavailable",
    "files.reason.unsafe-path": "The path is outside the restorable scope",
    "files.reason.unreadable-file": "The file cannot be read",
    "files.reason.snapshot-unavailable": "Stored contents cannot be read",
    "files.reason.restore-failed": "The file could not be restored",
    "files.reason.write-outcome-unavailable": "The write failed; the source of file changes cannot be verified",
    "files.reason.execution-stopped": "Rollback stopped before processing this file",
    "files.reason.agent-busy": "A reply started; restoration stopped to protect ongoing writes",
    "files.reason.already-restored": "Previously restored; the current file is preserved",
    "files.reason.restore-outcome-unavailable": "A previous restore was interrupted; its result is uncertain and the current file is preserved",
    "files.error.progress-save-failed": "Restore progress could not be saved, so processing stopped. Restored and unprocessed files are listed below. Check storage and preview again.",
    "files.error.storage-busy": "Another window is processing rollback data. Preview again shortly.",
    "files.error.storage-recovery-required": "An old lock has no verifiable owner, so the operation stopped. Exit the host and inspect the coordination files in plugin storage.",
    "files.error.no-target-state": "No file restore record is available for this rewind.",
    "files.error.preview-stale": "Files changed after the preview. Nothing was restored. Preview again.",
    "files.error.plan-not-found": "The preview expired. Preview again.",
    "files.error.agent-busy": "Stop the reply before previewing file rollback.",
    "files.error.session-not-found": "The conversation cannot be read.",
    "files.error.bad-request": "Invalid rollback request. Preview again.",
    "files.error.internal": "File rollback did not finish. Preview again and inspect the files.",
    "files.error.execution-stopped": "Rollback stopped. Restored and refused files are listed below. Inspect them and preview again.",
    "row.resendFailed": "History was rewound, but the re-send failed: the agent did not take the prompt.",
    "row.sendAgain": "Send again",
    "row.edit": "Edit",
    "row.hostIncompatible": "This DSH version cannot extend user-message actions. Editing is unavailable.",
    "row.editInput": "Edit message",
    "row.send": "Send",
    "row.cancel": "Cancel",
    "row.editInComposer": "Edit in the composer",
    "row.editInComposerHint": "The host cannot edit and resend from the composer yet; use the temporary input",
    "row.composerResendUnavailable": "The host cannot edit and resend from the composer yet; use the temporary input",
    "row.temporaryInput": "Temporary input",
    "row.fileGroup": "Files",
    "row.fileRoot": "Workspace",
    "row.fileNavigation": "Folder navigation",
    "row.skillGroup": "Skills",
    "row.skillUserOnly": "user-only",
    "row.removeReference": "Remove reference",
    "row.referenceLookupUnavailable": "File references could not be verified. Original text is retained and can still be edited and resent.",
    "row.referencePreviewUnavailable": "This host cannot open the reference. The text and draft are retained.",
    "row.referencePreviewFailed": "Opening the reference failed. The text and draft are retained.",
    "row.fileCandidates": "File and directory candidates",
    "row.fileLoading": "Searching files and directories\u2026",
    "row.fileReady": "References contain paths only. Select a directory or browse inside it.",
    "row.fileEmpty": "No matching files or directories. Edit the query to search again.",
    "row.fileUnavailable": "The host does not provide file search. Close this menu to resend the original text.",
    "row.fileFailed": "File search failed. Original text is retained. Edit the query or close this menu to resend.",
    "row.fileParent": "Parent directory",
    "row.fileClose": "Close file menu",
    "row.fileSelect": "Reference file",
    "row.fileSelectDirectory": "Reference directory",
    "row.fileDrill": "Browse directory",
    "row.skillCandidates": "User-invocable skills",
    "row.skillLoading": "Looking up skills\u2026",
    "row.skillReady": "The selected name stays editable. The host checks and loads it when sent.",
    "row.skillEmpty": "No matching available skills. Close the menu to resend the original text.",
    "row.skillUnavailable": "Skill lookup is unavailable; availability is unknown. The original text can still be resent.",
    "row.skillFailed": "Skill lookup failed; availability is unknown. The original text can still be resent.",
    "row.skillClose": "Close skill menu",
    "row.skillSelect": "Select skill",
    "row.skillChecking": "Checking skills in the text\u2026",
    "row.skillMissing": "These skills cannot currently be invoked by users and may have been removed or renamed. The original text can still be resent:",
    "row.skillInvalid": "These tokens will be sent as plain text. Skill names require whitespace boundaries:",
    "row.hiddenCount": "{count} messages hidden",
    "row.dismiss": "Dismiss",
    "row.hideFailed": "The rewound messages could not be hidden",
    "row.stopFirst": "Stop the reply first",
    "row.noText": "This message has no editable text",
    "row.blankText": "The message cannot be blank",
    "row.composerBusy": "The composer is busy; try again later",
    "row.composerUnavailable": "The composer cannot accept text",
    "row.operationFailed": "Edit and resend failed; try again",
    "row.regenerate": "Regenerate",
    "row.notLast": "Only the last reply can be regenerated",
    "row.shadowed": "This reply was already rewound",
    "row.imageOnly": "The prompt has no text to re-send",
    "row.offSurface": "This reply is off the current surface",
    "row.regenerateFailed": "Regenerate failed; try again",
    "panel.errorTitle": "This panel could not be displayed",
    "panel.errorHint": "The rest of the UI is unaffected. Retry, or reload the page.",
    "panel.retry": "Retry",
    "panel.error.rewindRow": "This rewind point could not be displayed",
    "panel.error.userActions": "User message actions could not be displayed",
    "panel.error.regenerate": "The regenerate control could not be displayed",
    "panel.error.inlineEditor": "The inline editor could not be displayed",
    "panel.error.hideRules": "The hide rules could not be displayed",
    "panel.error.settings": "The settings row could not be displayed",
    "panel.error.settingsNavigation": "The settings navigation icon could not be displayed",
    "settings.heading": "DSH Resend settings",
    "settings.nav": "DSH Resend",
    "operation.dismiss": "Dismiss error",
    "operation.error.bad-request": "Invalid request. Reopen the editor and send again.",
    "operation.error.session-not-found": "The conversation cannot be read. Reopen it.",
    "operation.error.agent-unavailable": "The agent is unavailable. Reopen the conversation and retry.",
    "operation.error.agent-busy": "A reply is running. Stop it before retrying.",
    "operation.error.message-not-found": "The target message was not found. Refresh the conversation.",
    "operation.error.message-pending": "The target message is still loading. Wait and retry.",
    "operation.error.target-shadowed": "This message was replaced. Select the current message.",
    "operation.error.not-user-message": "The target is not an editable user message. Select another message.",
    "operation.error.not-last-reply": "Only the last reply can be regenerated. Select it.",
    "operation.error.not-last-user-message": "Only the last user message can be edited and resent. Select the last user message.",
    "row.notLastUser": "Only the last user message can be edited and resent",
    "operation.error.not-assistant-message": "The target is not an assistant reply that can be regenerated. Select another reply.",
    "row.conversationUnavailable": "Could not confirm the effective conversation. Please retry.",
    "operation.error.blank-text": "Enter some text before sending.",
    "operation.error.no-text": "This message has no text to resend. Send it from the composer.",
    "operation.error.internal": "DSH failed while processing the request. Check the host diagnostics and retry.",
    "operation.error.connection": "Communication with DSH did not finish. Check that the app is running and retry.",
    "operation.error.cancelled": "The request was cancelled. Retry.",
    "operation.error.result-invalid": "The DSH result is not recognized. Update the plugin or check compatibility.",
    "operation.error.unexpected": "The plugin failed while processing the request. Reopen the conversation and check diagnostics.",
    "settings.inlineEditorBeneathMessage": "Inline editor beneath the message",
    "settings.inlineEditorFallbackDescription": "The host does not support editing and resending from the composer yet. When this setting is off, editing still uses the temporary input.",
    "settings.regenerateLastReply": "Show regenerate buttons",
    "settings.restrictRegenerateToLastReply": "Only allow regenerating the last assistant reply",
    "settings.restrictEditToLastUserMessage": "Only allow editing and resending the last user message",
    "settings.editRangeDescription": "When enabled, only the last user message can be edited and resent; when disabled, earlier user messages can also be edited and resent. The conversation resumes from the selected message and sends the modified text; subsequent conversation leaves the current context.",
    "settings.regenerateRangeDescription": "When enabled, only the last assistant reply can be regenerated; when disabled, earlier assistant replies can also be regenerated. The conversation resumes from the question for the selected reply. Later conversation leaves the current context.",
    "settings.loading": "Reading settings\u2026",
    "settings.saving": "Saving\u2026",
    "settings.read-error": "Could not read settings. Please retry.",
    "settings.save-error": "Could not save settings. Please retry.",
    "settings.retry": "Retry",
    "settings.on": "On",
    "settings.off": "Off"
  }
};
var mount = { status: "pending", error: void 0 };
function remoteMountState() {
  return Object.freeze({ ...mount });
}
function conversationRegistrar(service) {
  if (typeof service?.events?.register === "function") return (definition) => service.events.register(definition);
  if (typeof service?.register === "function") return (definition) => service.register(definition);
  return void 0;
}
function mountSurfaces(scope, ctx) {
  scope.inject(["configForms"], (settingsScope) => {
    settingsScope.effect(() => preferences.connect(settingsScope.configForms), "dsh-resend: saved preferences");
  });
  scope.effect(() => scope.locale.register(NS, DICTIONARIES), "dsh-resend: dictionaries");
  const translate = scope.locale.bind(NS);
  const references = {};
  const operations = createResendOperations(scope.remote, references);
  scope.effect(() => () => operations.dispose(), "dsh-resend: rewind-point records");
  for (const name2 of ["fileReferences", "skills"]) {
    scope.inject(["remote." + name2], (queryScope) => queryScope.effect(() => {
      references[name2] = queryScope.remote[name2];
      operations.invalidateReferenceQueries();
      return () => {
        delete references[name2];
        operations.invalidateReferenceQueries();
      };
    }, "dsh-resend: " + name2 + " queries"));
  }
  scope.on("connection/reset", () => operations.invalidateConversations());
  scope.remote.$on?.("agent-preset/selected", (sessionId) => operations.invalidateReferenceQueries(sessionId));
  const register = conversationRegistrar(scope.uiConversation);
  const slot = "conversation.chat.node";
  if (register === void 0) {
    ctx.root.logger?.("dsh-resend")?.warn(
      "dsh-resend: uiConversation exposes no definition registry this build understands; the rewind-point row will not mount"
    );
  } else {
    for (const [definition, label] of [
      [REWIND_ROW_DEFINITION, "dsh-resend: rewind-point definition"],
      [USER_ACTIONS_DEFINITION, "dsh-resend: user-actions definition"],
      [SURFACE_SHADOW_DEFINITION, "dsh-resend: surface eligibility definition"],
      [ASSISTANT_ACTIONS_DEFINITION, "dsh-resend: regenerate-companion definition"]
    ]) {
      const dispose = register(definition);
      scope.effect(
        () => () => {
          try {
            dispose?.();
          } catch {
          }
        },
        label
      );
    }
  }
  scope.inject(["conversation", "sessions"], (inputScope) => {
    inputScope.slots.inject(slot, () => inputScope.effect(() => {
      let original;
      let dispose;
      let reconciling = false;
      const reconcile = () => {
        if (reconciling) return;
        const entry = inputScope.slots.entries(slot).find((entry2) => entry2.options.key === "user" && entry2.locale === "chat");
        if (entry === original) return;
        reconciling = true;
        try {
          original = entry;
          dispose?.();
          dispose = void 0;
          if (entry === void 0) return;
          const hostTranslate = inputScope.locale.bind(entry.locale);
          const fallback = (props) => (0, import_react16.createElement)(entry.component, { ...props, t: hostTranslate });
          const Surface = userMessageSurface(entry.component, operations, preferences, hostTranslate);
          dispose = inputScope.slots.register({
            name: slot,
            key: "user",
            priority: (entry.options.priority ?? 0) - 1,
            locale: NS,
            inject: (sessionId) => ({
              readInput: () => {
                const input = inputScope.conversation?.input;
                const sessionScope = inputScope.sessions?.scope?.(sessionId);
                if (typeof input?.for !== "function" || sessionScope === void 0) return void 0;
                return input.for(sessionScope)?.state?.getSnapshot?.();
              }
            })
          }, withPanelBoundary(Surface, "panel.error.userActions", void 0, fallback));
        } finally {
          reconciling = false;
        }
      };
      const unsubscribe = inputScope.slots.subscribe(slot, reconcile);
      reconcile();
      return () => {
        unsubscribe();
        dispose?.();
      };
    }, "dsh-resend: native user-message actions"));
  });
  scope.slots.inject(
    slot,
    () => scope.slots.register(
      { name: slot, key: REWIND_ROW_KIND, locale: NS },
      withPanelBoundary(rewindRowSurface(operations, preferences), "panel.error.rewindRow")
    )
  );
  const actionsSlot = "conversation.chat.assistant-actions";
  scope.slots.inject(
    actionsSlot,
    () => scope.slots.register(
      { name: actionsSlot, id: ASSISTANT_ACTIONS_ID, order: 100, locale: NS, label: () => translate("row.regenerate") },
      withPanelBoundary(regenerateSurface(operations, preferences), "panel.error.regenerate")
    )
  );
  const settingsSlot = "settings.section";
  scope.slots.inject(
    settingsSlot,
    () => scope.slots.register(
      { name: settingsSlot, id: SETTINGS_ROW_ID, order: 100, locale: NS, label: () => (0, import_react16.createElement)(SettingsNavigationLabel, { text: translate("settings.nav") }) },
      withPanelBoundary(settingsSurface(preferences, translate, operations), "panel.error.settings", translate)
    )
  );
  scope.slots.inject("settings.action", () => scope.slots.register(
    { name: "settings.action", id: SETTINGS_ROW_ID + "-navigation-style", order: 100, locale: NS },
    withPanelBoundary(UIStyles, "panel.error.settingsNavigation", translate)
  ));
}
async function apply2(ctx) {
  try {
    await ctx.remote.$mount(TYPERT_REMOTE);
  } catch (error) {
    mount = { status: "failed", error };
    ctx.root.logger?.("dsh-resend")?.warn(
      `dsh-resend: the Remote contribution did not mount (${error?.message ?? error}); edit-and-resend and regenerate stay disabled for this page`
    );
    return;
  }
  mount = { status: "mounted", error: void 0 };
  ctx.inject(["remote.resend", "slots", "locale", "uiConversation"], (scope) => mountSurfaces(scope, ctx));
}

		Object.defineProperty(module.exports, Symbol.toStringTag, { value: "Module" });
		return module.exports;
	}
});

