/* GENERATED FILE — do not edit by hand; built from src/host.js by scripts/build.mjs */

// src/host.js
function hostService(ctx, name) {
  return ctx.get(name) ?? ctx[name];
}
function describeError(error) {
  if (error === null || error === void 0) return String(error);
  return typeof error.message === "string" && error.message !== "" ? error.message : String(error);
}
function asArray(value) {
  return Array.isArray(value) ? value : [];
}
function logWarning(ctx, detail) {
  ctx.root.logger?.("dsh-resend")?.warn(`dsh-resend: ${detail}`);
}
export {
  asArray,
  describeError,
  hostService,
  logWarning
};
