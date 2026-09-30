/* GENERATED FILE — do not edit by hand; built from src/shape-probe.js by scripts/build.mjs */

// src/shape-probe.js
import { SESSION_FORMAT_VERSION } from "@deepseek-ai/dsh-session";
var REPLACE_OP = "replace";
var OP_KEY = "op";
var DENSE_ENDPOINT_FORMAT = 3;
var ENDPOINT_NAMES = Object.freeze([
  Object.freeze({ start: "startSeq", end: "endSeq" }),
  Object.freeze({ start: "start", end: "end" })
]);
function endpointKeys(formatVersion) {
  if (!Number.isSafeInteger(formatVersion) || formatVersion < 0) {
    throw new TypeError(`dsh-resend: a session format version must be a non-negative safe integer, got ${String(formatVersion)} (spec \xA75.4)`);
  }
  return formatVersion >= DENSE_ENDPOINT_FORMAT ? ENDPOINT_NAMES[0] : ENDPOINT_NAMES[1];
}
function runtimeEndpointKeys() {
  return endpointKeys(SESSION_FORMAT_VERSION);
}
function shapeBinding(formatVersion = SESSION_FORMAT_VERSION) {
  const detected = endpointKeys(formatVersion);
  const running = runtimeEndpointKeys();
  if (detected.start !== running.start || detected.end !== running.end) {
    throw new Error(
      `dsh-resend: the surfaceOp shape probe detected the format-${formatVersion} spelling (${detected.start}/${detected.end}) but this runtime is format ${SESSION_FORMAT_VERSION} (${running.start}/${running.end}); refusing to build a surfaceOp the running host would reject (spec \xA75.4)`
    );
  }
  const replaceOp = (startSeq, endSeq) => {
    for (const [name, value] of [[running.start, startSeq], [running.end, endSeq]]) {
      if (!Number.isSafeInteger(value) || value < 0) {
        throw new TypeError(`dsh-resend: ${name} must be a non-negative safe integer, got ${String(value)} (spec \xA75.4)`);
      }
    }
    return Object.freeze({ [OP_KEY]: REPLACE_OP, [running.start]: startSeq, [running.end]: endSeq });
  };
  return Object.freeze({ formatVersion: SESSION_FORMAT_VERSION, keys: running, replaceOp });
}
var memoisedBinding;
function runtimeShapeBinding() {
  return memoisedBinding ??= shapeBinding();
}
export {
  OP_KEY,
  REPLACE_OP,
  endpointKeys,
  runtimeEndpointKeys,
  runtimeShapeBinding,
  shapeBinding
};
