/* GENERATED FILE — do not edit by hand; built from src/resolve.js by scripts/build.mjs */

// src/resolve.js
import { foldSurface, isAppendSurfaceEvent } from "@deepseek-ai/dsh-session";
import { currentSessionMessageProjections } from "@deepseek-ai/dsh-session-format-catalog/message-projections";

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
  "blank-text",
  "no-text",
  "internal"
]);
function assertCode(code) {
  if (!ERROR_CODES.includes(code)) {
    throw new TypeError(`dsh-resend: ${JSON.stringify(code)} is not one of the ${ERROR_CODES.length} result codes (spec \xA74.5)`);
  }
}
function refuse(code, detail) {
  assertCode(code);
  return { ok: false, error: detail === void 0 ? { code } : { code, detail } };
}

// src/resolve.js
import { asArray, describeError, logWarning } from "./host.js";
import { coveringRefusalCode, eventAtSeq, readCoveringLog, readFileMaxSeq } from "./log-read.js";
async function absentTargetCode(ctx, sessionId, targetSeq, lastCoveredSeq) {
  const file = await readFileMaxSeq(ctx, sessionId);
  const extent = file.status === "known" ? file.fileMaxSeq : lastCoveredSeq;
  if (extent === void 0) return "message-not-found";
  return targetSeq > extent ? "message-pending" : "message-not-found";
}
function sameSurface(left, right) {
  return left.length === right.length && left.every((seq, index) => seq === right[index]);
}
function lastAssistantSeq(log, nodes) {
  for (let index = nodes.length - 1; index >= 0; index -= 1) {
    const event = eventAtSeq(log, nodes[index]);
    if (event === void 0) return { status: "unreadable", seq: nodes[index] };
    if (event.type === "assistant/message") return { status: "found", seq: event.seq };
  }
  return { status: "absent" };
}
function roundPrompt(log, nodes, targetSeq) {
  for (let index = nodes.indexOf(targetSeq) - 1; index >= 0; index -= 1) {
    const event = eventAtSeq(log, nodes[index]);
    if (event === void 0) return void 0;
    if (event.type !== "user/message") continue;
    if (!isAppendSurfaceEvent(event)) continue;
    if (event.data?.source?.kind !== "user") continue;
    return { seq: event.seq, index };
  }
  return void 0;
}
function promptText(event) {
  const blocks = asArray(event?.data?.content).filter((block) => block?.type === "text" && typeof block.text === "string");
  return blocks.length === 0 ? void 0 : blocks.map((block) => block.text).join("\n");
}
async function resolveTarget(ctx, request, liveSurfaceNodes) {
  const { sessionId, targetSeq, op } = request;
  const liveNodes = asArray(liveSurfaceNodes);
  if (op !== "edit" && op !== "regenerate") return refuse("bad-request", `unknown op ${JSON.stringify(op)}`);
  const covering = await readCoveringLog(ctx, sessionId);
  if (covering.status === "refused") {
    return refuse(coveringRefusalCode(covering.reason), covering.detail);
  }
  const log = covering.log;
  const target = eventAtSeq(log, targetSeq);
  if (target === void 0) {
    return refuse(await absentTargetCode(ctx, sessionId, targetSeq, covering.lastCoveredSeq), `seq ${targetSeq} is not in the covering read`);
  }
  let fold;
  try {
    fold = foldSurface(log, currentSessionMessageProjections);
  } catch (error) {
    logWarning(ctx, `the covering read of ${JSON.stringify(sessionId)} did not replay (${describeError(error)}); resolving against the live surface only`);
  }
  if (fold !== void 0 && !sameSurface(fold.nodes, liveNodes)) {
    return refuse("message-pending", `the covering read's surface disagrees with the live surface of ${JSON.stringify(sessionId)}`);
  }
  const coveredByCarrier = fold !== void 0 && fold.replacements.some((replacement) => replacement.shadowedSeqs.includes(targetSeq));
  if (coveredByCarrier || !liveNodes.includes(targetSeq)) {
    return refuse("target-shadowed", coveredByCarrier ? `a carrier's range covers seq ${targetSeq}` : `seq ${targetSeq} is off the active surface`);
  }
  if (op === "edit" && target.type !== "user/message") {
    return refuse("not-user-message", `seq ${targetSeq} is a ${String(target.type)}, not a user message`);
  }
  if (op === "regenerate") {
    const lastReply = lastAssistantSeq(log, liveNodes);
    if (lastReply.status === "unreadable") {
      return refuse("message-pending", `the covering read does not hold surface node ${lastReply.seq}`);
    }
    if (lastReply.seq !== targetSeq) {
      return refuse("not-last-reply", `seq ${targetSeq} is not the last assistant reply on the surface`);
    }
  }
  let rangeStartSeq;
  let startIndex;
  let resendText;
  if (op === "edit") {
    rangeStartSeq = targetSeq;
    startIndex = liveNodes.indexOf(targetSeq);
    resendText = request.text;
    if (typeof resendText !== "string") return refuse("bad-request", 'op "edit" requires text');
    if (resendText.trim() === "") return refuse("blank-text", "the edited text is empty or whitespace-only");
  } else {
    const prompt = roundPrompt(log, liveNodes, targetSeq);
    const event = prompt === void 0 ? void 0 : eventAtSeq(log, prompt.seq);
    resendText = event === void 0 ? void 0 : promptText(event);
    if (prompt === void 0 || resendText === void 0) {
      return refuse("no-text", `no readable prompt text for the round containing seq ${targetSeq}`);
    }
    rangeStartSeq = prompt.seq;
    startIndex = prompt.index;
  }
  return {
    ok: true,
    value: {
      op,
      targetSeq,
      rangeStartSeq,
      endSeq: liveNodes[liveNodes.length - 1],
      shadowedSeqs: liveNodes.slice(startIndex),
      resendText
    }
  };
}
export {
  resolveTarget
};
