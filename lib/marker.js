/* GENERATED FILE — do not edit by hand; built from src/marker.js by scripts/build.mjs */

// src/marker.js
var MARKER_PREFIX = "dsh-resend-";
function carrierIdFor(op, uuid) {
  return `${MARKER_PREFIX}${op}-${uuid}`;
}
function resendIdFor(carrierId) {
  return `${carrierId}-resend`;
}
function hasMarkerPrefix(id) {
  return typeof id === "string" && id.startsWith(MARKER_PREFIX);
}
function isCarrierIdFor(op, id) {
  return hasMarkerPrefix(id) && id.startsWith(`${MARKER_PREFIX}${op}-`);
}
export {
  MARKER_PREFIX,
  carrierIdFor,
  hasMarkerPrefix,
  isCarrierIdFor,
  resendIdFor
};
