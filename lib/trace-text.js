/* GENERATED FILE — do not edit by hand; built from src/trace-text.js by scripts/build.mjs */

// src/trace-text.js
var TRACE_TEXT = Object.freeze({
  en: "(this message was replaced by an edit; the original is archived in the session log)",
  zh: "\uFF08\u6B64\u5904\u5185\u5BB9\u5DF2\u88AB\u64A4\u56DE\uFF1A\u539F\u6D88\u606F\u5DF2\u5F52\u6863\uFF0C\u53EF\u5728\u6062\u590D\u89C6\u56FE\u4E2D\u67E5\u770B\uFF09"
});
var DEFAULT_LOCALE = "en";
function traceTextFor(locale) {
  return TRACE_TEXT[locale] ?? TRACE_TEXT[DEFAULT_LOCALE];
}
function activeLocale(ctx) {
  const locale = ctx.get("locale");
  const active = typeof locale?.getSnapshot === "function" ? locale.getSnapshot()?.active : void 0;
  return typeof active === "string" && active !== "" ? active : void 0;
}
function traceTextNow(ctx) {
  return traceTextFor(activeLocale(ctx) ?? DEFAULT_LOCALE);
}
export {
  TRACE_TEXT,
  traceTextNow
};
