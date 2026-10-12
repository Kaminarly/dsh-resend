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
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
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
  apply: () => apply,
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
.dsh-resend-editor textarea{box-sizing:border-box;display:block;width:100%;min-height:calc(66px + var(--dsh-content-font-delta,0px) + var(--dsh-content-font-delta,0px) + var(--dsh-content-font-delta,0px));resize:none;overflow:hidden;border:0;outline:none;padding:0;background:transparent;color:inherit;font:inherit;font-size:var(--dsh-content-font-size,14px);line-height:calc(22px + var(--dsh-content-font-delta,0px))}
.dsh-resend-editor textarea:disabled{opacity:.5}
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
  for (let i = startIndex; i < x.issues.length; i++) {
    if (x.issues[i]?.continue !== true) {
      return true;
    }
  }
  return false;
}
function explicitlyAborted(x, startIndex = 0) {
  if (x.aborted === true)
    return true;
  for (let i = startIndex; i < x.issues.length; i++) {
    if (x.issues[i]?.continue === false) {
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
  for (let i = start; i < issues.length; i++) {
    (_a2 = issues[i]).schema ?? (_a2.schema = inst);
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
  const fn = (schema, value, _ctx, _params) => {
    const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
    const result = schema._zod.run({ value, issues: [] }, ctx);
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
  const fn = async (schema, value, _ctx, params) => {
    const ctx = _ctx ? { ..._ctx, async: true } : { async: true };
    let result = schema._zod.run({ value, issues: [] }, ctx);
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
var _safeParse = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
  const result = schema._zod.run({ value, issues: [] }, ctx);
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
var _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, async: true } : { async: true };
  let result = schema._zod.run({ value, issues: [] }, ctx);
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
    for (let i = 0; i < input.length; i++) {
      const item = input[i];
      const result = def.element._zod.run({
        value: item,
        issues: []
      }, ctx);
      if (result instanceof Promise) {
        proms.push(result.then((result2) => handleArrayResult(result2, payload, i)));
      } else {
        handleArrayResult(result, payload, i);
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
  const keys = Object.keys(def.shape);
  const ownSymbols = Object.getOwnPropertySymbols(def.shape);
  const symbolKeys = ownSymbols.length ? ownSymbols : NO_SYMBOL_KEYS;
  const allKeys = symbolKeys.length ? [...keys, ...symbolKeys] : keys;
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
    keySet: new Set(keys),
    numKeys: keys.length,
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
    const get = () => {
      const newSh = { ...sh };
      Object.defineProperty(def, "shape", { value: newSh });
      get.raw = newSh;
      return newSh;
    };
    get.raw = sh;
    Object.defineProperty(def, "shape", { get });
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
      error: readonly(union(ERROR_CODES.map((code) => strictObject({ code: readonly(literal(code)) }))))
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
    strictObject({ ok: literal(false), error: union(ERROR_CODES.map((code) => strictObject({ code: literal(code) }))) })
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
var import_react15 = require("react");

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
function createResendOperations(remote) {
  const bySession = /* @__PURE__ */ new Map();
  const recordsBySession = /* @__PURE__ */ new Map();
  const emptyRecords = Object.freeze([]);
  const listeners = /* @__PURE__ */ new Set();
  const conversations = /* @__PURE__ */ new Map();
  const preflights = /* @__PURE__ */ new Map();
  let disposed = false;
  const unreadConversation = Object.freeze({ ready: false, status: "loading" });
  const notify = () => {
    for (const listener of Array.from(listeners)) listener();
  };
  const outcomeOf = ({ sessionId, carrierSeq }) => bySession.get(sessionId)?.get(carrierSeq);
  function record(request, result) {
    if (disposed || result?.ok !== true) return;
    const { carrierSeq, shadowedSeqs, resendMessageId } = result.value;
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
      const result = unwrapRemoteResult(await remote.resend.apply(entry.request));
      record(entry.request, result);
      return result;
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
      disposed = true;
      for (const entry of preflights.values()) entry.resolve({ ok: true, value: { canceled: true } });
      preflights.clear();
      bySession.clear();
      recordsBySession.clear();
      conversations.clear();
      listeners.clear();
    }
  };
}

// src/regenerate.js
var import_react12 = require("react");

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
  function close() {
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
        const split = normalized.lastIndexOf("/");
        const action = completed && file.action === "restore" ? "restored" : file.action;
        const refused = action === "refuse";
        const Icon = action === "restored" ? import_dsh_client_ui_primitives5.IconCheckOutlineRegular : refused ? import_dsh_client_ui_primitives5.IconWarningOutlineRegular : import_dsh_client_ui_primitives5.IconRefreshOutlineRegular;
        return (0, import_react7.createElement)("li", { key: `${index}:${file.path}`, className: "dsh-resend-rollback-file" }, [
          (0, import_react7.createElement)("span", { key: "icon", className: "dsh-resend-rollback-file-icon", "aria-hidden": true }, (0, import_react7.createElement)(import_dsh_client_ui_primitives5.FileTypeIcon, { path: file.path, size: 20 })),
          (0, import_react7.createElement)("div", { key: "info", className: "dsh-resend-rollback-file-info", title: file.path }, [
            (0, import_react7.createElement)("span", { key: "name", className: "dsh-resend-rollback-filename" }, normalized.slice(split + 1)),
            (0, import_react7.createElement)("span", { key: "path", className: "dsh-resend-rollback-path" }, split < 0 ? t("files.root") : normalized.slice(0, split + 1)),
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
        button("close", close, t(completed ? "files.closeResult" : result?.ok && restorable ? "files.cancel" : "files.close")),
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
var import_dsh_client_ui_primitives8 = require("@deepseek-ai/dsh-client-ui-primitives");

// src/use-hiding.js
var import_react8 = require("react");

// src/hide-plan.js
var indexes = /* @__PURE__ */ new WeakMap();
var plans = /* @__PURE__ */ new WeakMap();
function chatNodes(snapshot) {
  if (typeof snapshot?.nodes?.values !== "function") throw new Error("the Chat snapshot has no readable node store");
  return snapshot.nodes.values();
}
function affectedSeq(node) {
  if (node.kind === "dsh-resend-user-actions") return node.data.seq;
  if (node.kind === "turn-tail") return node.data?.closing?.finalNode?.seq;
  if (node.kind === "tool-call") return node.data?.root?.seq;
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
  const eligibilityNodes = [];
  if (grouped !== void 0) {
    for (const entry of grouped.entries) {
      const members2 = entry.kind === "group" ? grouped.groupSource(entry.key)?.getSnapshot()?.members : [entry];
      if (!Array.isArray(members2)) throw new Error("Chat group " + entry.key + " has no readable members");
      for (const member of members2) {
        const key = member.groupPart === void 0 || member.groupPart === "response" ? member.key : JSON.stringify([member.key, member.groupPart]);
        const keys = rendered.get(member.key) ?? [];
        keys.push(key);
        rendered.set(member.key, keys);
      }
    }
  }
  for (const node of chatNodes(snapshot)) {
    eligibilityNodes.push([node.key, node.kind, node.anchorSeq, node.data?.seq, node.data?.prompt, node.data?.shadowedSeqs]);
    if (node.kind === "dsh-resend-error") carriers.set(node.data.carrierSeq, node.data);
    if (node.kind === "dsh-resend-surface-shadow") {
      for (const seq2 of node.data.shadowedSeqs) modelShadowed.add(seq2);
    }
    if (node.kind === "user") userSeqs.add(node.data?.seq ?? node.anchorSeq);
    if (node.visibility === "hidden") continue;
    const seq = affectedSeq(node);
    if (typeof seq !== "number" || !Number.isFinite(seq)) continue;
    const flowKeys = grouped === void 0 ? [node.flowKey ?? node.key] : rendered.get(node.key) ?? [];
    if (flowKeys.some((key) => typeof key !== "string" || key === "")) throw new Error("Chat node at seq " + seq + " has no stable flow key");
    const keys = bySeq.get(Math.ceil(seq)) ?? [];
    keys.push(...flowKeys);
    bySeq.set(Math.ceil(seq), keys);
  }
  const index = { bySeq, carriers, modelShadowed, userSeqs, revision: JSON.stringify(eligibilityNodes) };
  indexes.set(snapshot, { grouped, index });
  return index;
}
function planForSeqs(shadowedSeqs, index) {
  if (!Array.isArray(shadowedSeqs) || shadowedSeqs.length === 0 || shadowedSeqs.some((seq) => !Number.isSafeInteger(seq) || seq < 0)) {
    throw new Error("the rewind has no valid shadowedSeqs from Remote or carrier provenance");
  }
  const keys = /* @__PURE__ */ new Set();
  for (const seq of shadowedSeqs) {
    for (const key of index.bySeq.get(seq) ?? []) keys.add(key);
  }
  return Object.freeze({ keys: Object.freeze([...keys]), count: keys.size, has: (key) => keys.has(key) });
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
  const plan = Object.freeze({
    byCarrier,
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
function hideRulesFor(keys) {
  return keys.map((key) => {
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
    css = hideRulesFor(plan.keys);
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
  const code = typeof raw === "string" && /^[\w/-]{1,80}$/.test(raw) ? raw : "client/unexpected-error";
  const key = ERROR_CODES.includes(code) ? code : code === "client/result-invalid" ? "result-invalid" : code === "gateway/cancelled" ? "cancelled" : code.startsWith("gateway/") ? "connection" : "unexpected";
  return t("operation.error." + key) + " (" + code + ")";
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
var import_react11 = require("react");
var import_dsh_client_ui_primitives7 = require("@deepseek-ai/dsh-client-ui-primitives");

// src/hide-rules.js
var import_react10 = require("react");
function HideRulesElement({ css }) {
  return (0, import_react10.createElement)("style", { "data-dsh-resend-hide-rules": "true" }, css);
}
var HideRulesSurface = withPanelBoundary(HideRulesElement, "panel.error.hideRules");

// src/user-actions.js
var USER_ACTIONS_KIND = "dsh-resend-user-actions";
var identity2 = (value) => value;
function userMessageText(eventOrData) {
  const content = eventOrData?.data?.content ?? eventOrData?.content;
  return Array.isArray(content) ? content.filter((part) => part?.type === "text").map((part) => part.text).join("\n") : "";
}
function userActionsSurface(operations, preferences2) {
  return function BoundUserActions(props) {
    return (0, import_react11.createElement)(UserActionsRow, { ...props, operations, preferences: preferences2 });
  };
}
function userMessageSurface(original, operations, preferences2, hostTranslate) {
  const renderOriginal = typeof original === "function" ? original : original?.type;
  return function UserMessageWithActions(props) {
    const hostProps = { ...props, t: hostTranslate };
    if (typeof renderOriginal !== "function") {
      return (0, import_react11.createElement)(
        import_react11.Fragment,
        null,
        (0, import_react11.createElement)(original, hostProps),
        (0, import_react11.createElement)("div", { role: "alert" }, props.t("row.hostIncompatible"))
      );
    }
    const bubble = renderOriginal(hostProps);
    if (!(0, import_react11.isValidElement)(bubble) || typeof bubble.props.actions !== "function") {
      return (0, import_react11.createElement)(
        import_react11.Fragment,
        null,
        bubble,
        (0, import_react11.createElement)("div", { role: "alert" }, props.t("row.hostIncompatible"))
      );
    }
    return (0, import_react11.createElement)(UserActionsRow, {
      ...props,
      operations,
      preferences: preferences2,
      renderMessage: (action) => (0, import_react11.cloneElement)(bubble, {
        actions: (text) => {
          const actions = bubble.props.actions(text);
          if (!(0, import_react11.isValidElement)(actions)) throw new Error("The host user-message actions no longer return a React element");
          return (0, import_react11.cloneElement)(actions, { extraActions: (0, import_react11.createElement)(import_react11.Fragment, null, actions.props.extraActions, action) });
        }
      })
    });
  };
}
var control = (key, label, icon2, onClick, reason, disabled) => (0, import_react11.createElement)(IconAction, {
  key,
  label,
  icon: icon2,
  onClick,
  reason,
  disabled,
  ...key === "send" ? { primary: true, "data-primary": true } : {}
});
function InlineEditor({ t, value, disabled, stopReason, composerReason, onText, onSend, onComposer, onCancel, onKeyDown }) {
  const textarea = (0, import_react11.useRef)(null);
  const fitText = () => {
    const input = textarea.current;
    if (!input) return;
    input.style.height = "0px";
    input.style.height = input.scrollHeight + "px";
  };
  (0, import_react11.useLayoutEffect)(fitText, [value]);
  (0, import_react11.useLayoutEffect)(() => {
    const input = textarea.current;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }, []);
  (0, import_react11.useLayoutEffect)(() => {
    const input = textarea.current;
    const Observer = input.ownerDocument.defaultView.ResizeObserver;
    if (!Observer) return;
    let width;
    const observer = new Observer(([entry]) => {
      if (entry.contentRect.width === width) return;
      width = entry.contentRect.width;
      fitText();
    });
    observer.observe(input);
    return () => observer.disconnect();
  }, []);
  return (0, import_react11.createElement)("div", { className: "dsh-resend-editor-surface" }, [
    (0, import_react11.createElement)("div", { key: "header", className: "dsh-resend-editor-header" }, [
      (0, import_react11.createElement)("span", { key: "label", className: "dsh-resend-editor-label" }, t("row.temporaryInput")),
      control("cancel", t("row.cancel"), import_dsh_client_ui_primitives7.IconCloseOutlineRegular, onCancel, void 0, disabled)
    ]),
    (0, import_react11.createElement)("div", { key: "editor", className: "dsh-resend-editor" }, [
      (0, import_react11.createElement)("textarea", {
        key: "textarea",
        ref: textarea,
        value,
        rows: 3,
        disabled,
        "aria-label": t("row.editInput"),
        onChange: onText,
        onKeyDown
      }),
      (0, import_react11.createElement)("div", { key: "actions", className: "dsh-resend-editor-actions" }, [
        (0, import_react11.createElement)(
          "span",
          { key: "composer", className: "dsh-resend-editor-composer" },
          (0, import_react11.createElement)(IconAction, {
            label: t("row.editInComposer"),
            icon: import_dsh_client_ui_primitives7.IconEditOutlineRegular,
            tooltip: t("row.editInComposerHint"),
            onClick: onComposer,
            reason: composerReason,
            disabled,
            showLabel: true
          })
        ),
        control("send", t("row.send"), import_dsh_client_ui_primitives7.IconPaperPlaneOutlineRegular, onSend, stopReason ?? (value.trim() === "" ? t("row.blankText") : void 0), disabled)
      ])
    ])
  ]);
}
var InlineEditorSurface = withPanelBoundary(InlineEditor, "panel.error.inlineEditor");
function UserActionsRow(props) {
  const { node, sessionId, inputActions, useInput, useSession, readInput, operations, preferences: preferences2, t } = props;
  const prefs = usePreferences(preferences2);
  const preflight = (0, import_react11.useSyncExternalStore)(operations.subscribe, () => operations.preflightFor?.(sessionId));
  const { plan, css, error: hideError, diagnostics } = useHiding({ ...props, suppressError: true });
  const data = { seq: node.data.seq ?? node.anchorSeq, text: node.data.text ?? userMessageText(node.data) };
  const [editing, setEditing] = (0, import_react11.useState)(false);
  const [text, setText] = (0, import_react11.useState)(data.text);
  const [pending, setPending] = (0, import_react11.useState)(false);
  const [error, setError] = (0, import_react11.useState)();
  const inFlight = (0, import_react11.useRef)(false);
  const input = typeof useInput === "function" ? useInput(identity2) : void 0;
  const session = typeof useSession === "function" ? useSession(identity2) : void 0;
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
  const live = (0, import_react11.useRef)();
  live.current = { plan, data, session, revision, text };
  const currentReason = () => reasonFor(
    preferences2.getSnapshot(),
    operations.conversationFor(sessionId, live.current.revision),
    live.current
  );
  const stopReason = reasonFor(prefs, conversation, live.current);
  const composerReason = stopReason ?? (input?.phase !== "plain" ? t("row.composerBusy") : typeof inputActions?.setDraft !== "function" || typeof readInput !== "function" ? t("row.composerUnavailable") : void 0);
  const open = () => {
    if (currentReason() !== void 0 || inFlight.current || operations.preflightFor?.(sessionId)) return;
    setText(live.current.data.text);
    setError(void 0);
    setEditing(true);
  };
  const cancel = () => {
    if (inFlight.current) return;
    setEditing(false);
    setError(void 0);
  };
  const send = async () => {
    if (inFlight.current || operations.preflightFor?.(sessionId) || currentReason() !== void 0 || live.current.text.trim() === "") return;
    inFlight.current = true;
    setPending(true);
    setError(void 0);
    try {
      const result = await operations.run({ sessionId, targetSeq: live.current.data.seq, op: "edit", text: live.current.text });
      if (result.ok) {
        if (!result.value?.canceled) setEditing(false);
      } else setError(t("row.operationFailed") + "\uFF1A" + operationErrorText(result.error, t));
    } catch (cause) {
      setError(t("row.operationFailed") + "\uFF1A" + operationErrorText(cause, t));
      console.warn("[dsh-resend] edit at seq " + data.seq + " in session " + sessionId + ": " + (cause?.message ?? cause));
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };
  const editInComposer = () => {
    if (inFlight.current || currentReason() !== void 0) return;
    try {
      if (readInput()?.phase !== "plain") return;
      if (typeof inputActions?.setDraft !== "function") return;
      inputActions.setDraft((editing ? live.current.text : live.current.data.text).replace(/[\uE100-\uE11D\uFFFC]/gu, ""));
      setEditing(false);
    } catch (cause) {
      setError(t("row.composerUnavailable"));
      console.warn("[dsh-resend] composer handoff for session " + sessionId + ": " + (cause?.message ?? cause));
    }
  };
  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
    } else if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send();
    }
  };
  const inlineOn = prefs.inlineEditorBeneathMessage;
  const rules = (0, import_react11.createElement)(HideRulesSurface, { key: "rules", t, css });
  const localDiagnostics = hideError ?? diagnostics.find((entry) => entry.shadowedSeqs.includes(data.seq))?.message;
  if (localDiagnostics !== void 0) {
    return (0, import_react11.createElement)("div", { role: "alert", className: "dsh-resend-row-error" }, [
      props.renderMessage ? (0, import_react11.createElement)(import_react11.Fragment, { key: "message" }, props.renderMessage(null)) : null,
      (0, import_react11.createElement)(UIStyles, { key: "ui" }),
      (0, import_react11.createElement)(ReplayPreflight, { key: "preflight", operations, sessionId, userSeq: data.seq, portal: true, t }),
      (0, import_react11.createElement)(HideRulesSurface, { key: "rules", t, css }),
      (0, import_react11.createElement)("span", { key: "error" }, t("row.hideFailed")),
      (0, import_react11.createElement)("pre", { key: "detail" }, localDiagnostics)
    ]);
  }
  const eligible = !hidden && plan?.userSeqs.has(data.seq);
  if (!eligible) return (0, import_react11.createElement)(
    import_react11.Fragment,
    null,
    rules,
    props.renderMessage?.(null),
    (0, import_react11.createElement)(ReplayPreflight, { operations, sessionId, userSeq: data.seq, portal: true, t })
  );
  const idle = !inlineOn ? [control("composer", t("row.editInComposer"), import_dsh_client_ui_primitives7.IconEditOutlineRegular, editInComposer, stopReason ?? composerReason, pending || !!preflight)] : [control("edit", t("row.edit"), import_dsh_client_ui_primitives7.IconEditOutlineRegular, open, stopReason, pending || !!preflight)];
  const editor = editing && (0, import_react11.createElement)(InlineEditorSurface, {
    key: "inline",
    t,
    value: text,
    disabled: pending || !!preflight,
    stopReason,
    composerReason,
    onText: (event) => setText(event.target.value),
    onSend: () => {
      void send();
    },
    onComposer: editInComposer,
    onCancel: cancel,
    onKeyDown
  });
  const actions = (0, import_react11.createElement)("span", { className: "dsh-resend-user-actions" }, idle);
  return (0, import_react11.createElement)("div", { className: props.renderMessage ? "dsh-resend-user-message" : void 0 }, [
    rules,
    (0, import_react11.createElement)(UIStyles, { key: "ui" }),
    (0, import_react11.createElement)(ReplayPreflight, { key: "preflight", operations, sessionId, userSeq: data.seq, t }),
    props.renderMessage ? (0, import_react11.createElement)(import_react11.Fragment, { key: "message" }, props.renderMessage(actions)) : (0, import_react11.createElement)(import_react11.Fragment, { key: "actions" }, actions),
    editor,
    error === void 0 ? null : (0, import_react11.createElement)("span", { key: "error", role: "alert", className: "dsh-resend-operation-error" }, error)
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
  const [pending, setPending] = (0, import_react12.useState)(false);
  const preflight = (0, import_react12.useSyncExternalStore)(operations.subscribe, () => operations.preflightFor?.(sessionId));
  const [error, setError] = (0, import_react12.useState)(null);
  const inFlight = (0, import_react12.useRef)(false);
  const anchor = (0, import_react12.useRef)(null);
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
  return (0, import_react12.createElement)("div", { ref: anchor, className: "dsh-resend-regenerate" }, [
    (0, import_react12.createElement)(UIStyles, { key: "ui" }),
    (0, import_react12.createElement)(ReplayPreflight, {
      key: "preflight-fallback",
      operations,
      sessionId,
      targetSeq: state?.seq,
      t,
      visibleUserSeqs: Array.from(chat?.nodes?.values?.() ?? []).filter((node) => node.kind === "user").map((node) => node.data?.seq ?? node.anchorSeq)
    }),
    (0, import_react12.createElement)(IconAction, {
      key: "regenerate",
      label: t("row.regenerate"),
      icon: import_dsh_client_ui_primitives8.IconRefreshOutlineRegular,
      disabled: !prefs.ready || pending || !!preflight || reason !== null,
      reason: disabledReason,
      onClick: () => {
        void regenerate();
      }
    }),
    conversation.status === "read-error" ? (0, import_react12.createElement)(IconAction, {
      key: "retry-read",
      label: t("settings.retry"),
      icon: import_dsh_client_ui_primitives8.IconRefreshOutlineRegular,
      onClick: () => {
        void operations.refreshConversation(sessionId, revision, true);
      }
    }) : null,
    error === null ? null : (0, import_react12.createElement)(OperationErrorNotice, { key: "error", anchor, text: error, t, onDismiss: () => setError(null) })
  ]);
}
function regenerateSurface(operations, preferences2) {
  return function BoundRegenerate(props) {
    return (0, import_react12.createElement)(RegenerateControl, { ...props, operations, preferences: preferences2 });
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
var import_react13 = require("react");
var import_dsh_client_ui_primitives9 = require("@deepseek-ai/dsh-client-ui-primitives");
var SETTING_KEYS = Object.freeze({
  inlineEditorBeneathMessage: "settings.inlineEditorBeneathMessage",
  regenerateLastReply: "settings.regenerateLastReply",
  restrictRegenerateToLastReply: "settings.restrictRegenerateToLastReply",
  restrictEditToLastUserMessage: "settings.restrictEditToLastUserMessage"
});
var DESCRIPTIONS = Object.freeze({
  restrictRegenerateToLastReply: "settings.regenerateRangeDescription",
  restrictEditToLastUserMessage: "settings.editRangeDescription"
});
var SETTINGS_ROW_ID = "dsh-resend-preferences";
function SettingsRow({ preferences: preferences2, t, operations }) {
  const snapshot = usePreferences(preferences2);
  return (0, import_react13.createElement)("div", { className: "dsh-resend-settings" }, [
    (0, import_react13.createElement)(UIStyles, { key: "ui" }),
    (0, import_react13.createElement)("div", { key: "heading", className: "dsh-resend-settings-heading" }, t("settings.heading")),
    snapshot.status === "ready" ? null : (0, import_react13.createElement)("div", {
      key: "status",
      role: snapshot.status.endsWith("error") ? "alert" : "status"
    }, [t("settings." + snapshot.status), snapshot.status.endsWith("error") ? (0, import_react13.createElement)(import_dsh_client_ui_primitives9.Button, {
      key: "retry",
      onClick: () => {
        void preferences2.retry();
      }
    }, t("settings.retry")) : null]),
    ...PREFERENCE_FIELDS.map((field) => (0, import_react13.createElement)("div", { key: field, className: "dsh-resend-settings-row", "data-field": field }, [
      (0, import_react13.createElement)("div", { key: "label", className: "dsh-resend-settings-label" }, [
        (0, import_react13.createElement)("span", { key: "name" }, t(SETTING_KEYS[field])),
        DESCRIPTIONS[field] ? (0, import_react13.createElement)("p", {
          key: "description",
          className: "dsh-resend-settings-description",
          id: "dsh-resend-" + field + "-description"
        }, t(DESCRIPTIONS[field])) : null
      ]),
      (0, import_react13.createElement)(import_dsh_client_ui_primitives9.Switch, {
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
    operations ? (0, import_react13.createElement)(StorageCleanup, { key: "cleanup", operations, t }) : null
  ]);
}
function settingsSurface(preferences2, translate, operations) {
  return function BoundSettings(props) {
    return (0, import_react13.createElement)(SettingsRow, { preferences: preferences2, t: props.t ?? translate, operations });
  };
}

// src/rewind-row.js
var import_react14 = require("react");
var import_dsh_client_ui_primitives10 = require("@deepseek-ai/dsh-client-ui-primitives");

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
    return (0, import_react14.createElement)("div", { className: "dsh-resend-row dsh-resend-row-error", role: "alert" }, [
      (0, import_react14.createElement)(UIStyles, { key: "ui" }),
      (0, import_react14.createElement)(import_dsh_client_ui_primitives10.IconWarningOutlineRegular, { key: "icon", className: "dsh-resend-row-icon" }),
      (0, import_react14.createElement)("span", { key: "message", className: "dsh-resend-row-message" }, t("row.hideFailed")),
      (0, import_react14.createElement)("pre", { key: "detail", className: "dsh-resend-row-detail" }, hideError)
    ]);
  }
  if (view.kind === "notice") {
    return (0, import_react14.createElement)("div", { className: "dsh-resend-row dsh-resend-row-notice" }, [
      (0, import_react14.createElement)(UIStyles, { key: "ui" }),
      (0, import_react14.createElement)("span", { key: "message", className: "dsh-resend-row-message" }, String(t("row.hiddenCount")).replace("{count}", String(hidePlan?.count ?? 0))),
      (0, import_react14.createElement)(IconAction, { key: "dismiss", label: t("row.dismiss"), icon: import_dsh_client_ui_primitives10.IconCloseOutlineRegular, onClick: onDismiss })
    ]);
  }
  return (0, import_react14.createElement)("div", { className: "dsh-resend-row dsh-resend-row-error", role: "alert" }, [
    (0, import_react14.createElement)(UIStyles, { key: "ui" }),
    (0, import_react14.createElement)(import_dsh_client_ui_primitives10.IconWarningOutlineRegular, { key: "icon", className: "dsh-resend-row-icon" }),
    (0, import_react14.createElement)("span", { key: "message", className: "dsh-resend-row-message" }, t("row.resendFailed")),
    (0, import_react14.createElement)(
      IconAction,
      { key: "send-again", label: t("row.sendAgain"), icon: import_dsh_client_ui_primitives10.IconRefreshOutlineRegular, onClick: onSendAgain }
    )
  ]);
}
function rewindRowSurface(operations, preferences2) {
  return function BoundRewindRow(props) {
    return (0, import_react14.createElement)(RewindRowSurface, { ...props, operations, preferences: preferences2 });
  };
}
function RewindRowSurface(props) {
  const { node, sessionId, operations, t } = props;
  const point = { sessionId, carrierSeq: node?.data?.carrierSeq };
  const outcome = (0, import_react14.useSyncExternalStore)(operations.subscribe, () => operations.outcomeOf(point));
  const { plan, css, error } = useHiding(props);
  const [dismissed, setDismissed] = (0, import_react14.useState)(false);
  const hidePlan = plan?.byCarrier.get(point.carrierSeq);
  const missingPlan = plan !== void 0 && hidePlan === void 0 && !plan.errors.has(point.carrierSeq) ? "range " + JSON.stringify(node.data.range ?? [point.carrierSeq]) + ": the rewind point is missing from the Chat hide plan" : void 0;
  const hideError = error ?? plan?.errors.get(point.carrierSeq)?.message ?? missingPlan;
  (0, import_react14.useEffect)(() => {
    if (missingPlan !== void 0) console.warn("[dsh-resend] session " + sessionId + ": unable to hide rewind " + missingPlan);
  }, [missingPlan, sessionId]);
  const row = (0, import_react14.createElement)(RewindRow, {
    outcome,
    t,
    hidePlan,
    hideError,
    onDismiss: () => setDismissed(true),
    onSendAgain: () => {
      void operations.sendAgain(point);
    }
  });
  return (0, import_react14.createElement)("div", null, [
    (0, import_react14.createElement)(HideRulesSurface, { key: "rules", t, css }),
    (!dismissed || rewindPointView(outcome).kind === "resend-failed" || hideError !== void 0) && (0, import_react14.createElement)("div", { key: "row" }, row),
    (0, import_react14.createElement)(FileRollbackPreview, { key: "files", operations, point, t })
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
    "row.editInComposerHint": "\u652F\u6301\u5F15\u7528\u6587\u4EF6\u3001\u8C03\u7528\u6280\u80FD",
    "row.temporaryInput": "\u4E34\u65F6\u8F93\u5165\u6846",
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
    "row.editInComposerHint": "Supports file references and skills",
    "row.temporaryInput": "Temporary input",
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
  const operations = createResendOperations(scope.remote);
  scope.effect(() => () => operations.dispose(), "dsh-resend: rewind-point records");
  scope.on("connection/reset", () => operations.invalidateConversations());
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
          const fallback = (props) => (0, import_react15.createElement)(entry.component, { ...props, t: hostTranslate });
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
      { name: settingsSlot, id: SETTINGS_ROW_ID, order: 100, locale: NS, label: () => (0, import_react15.createElement)(SettingsNavigationLabel, { text: translate("settings.nav") }) },
      withPanelBoundary(settingsSurface(preferences, translate, operations), "panel.error.settings", translate)
    )
  );
  scope.slots.inject("settings.action", () => scope.slots.register(
    { name: "settings.action", id: SETTINGS_ROW_ID + "-navigation-style", order: 100, locale: NS },
    withPanelBoundary(UIStyles, "panel.error.settingsNavigation", translate)
  ));
}
async function apply(ctx) {
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

