/* GENERATED FILE — do not edit by hand; built from src/write.js by scripts/build.mjs */

// src/write.js
import { foldSurface } from "@deepseek-ai/dsh-session";
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

// src/write.js
import { describeError, hostService as hostService2, logWarning } from "./host.js";
import { coveringRefusalCode, eventAtSeq, readCoveringLog } from "./log-read.js";
import { MARKER_PREFIX, hasMarkerPrefix } from "./marker.js";
import { OP_KEY, REPLACE_OP, runtimeShapeBinding } from "./shape-probe.js";

// src/token-price.js
import { deriveEventMessage } from "@deepseek-ai/dsh-session";
import { hostService } from "./host.js";
function shadowPriceSource(ctx) {
  const meter = hostService(ctx, "tokenMeter");
  if (meter === void 0) {
    return { detail: "the tokenMeter service is not in this composition; refusing to write an audit claim without the official shadow price (spec \xA75.3)" };
  }
  if (typeof meter.estimateMessage !== "function") {
    return { detail: "the tokenMeter service carries no estimateMessage(); refusing to write an audit claim without the official shadow price (spec \xA75.3)" };
  }
  return { meter };
}
function officialNodePrice(meter, event) {
  const message = deriveEventMessage(event);
  if (message === null) return 0;
  if (message === void 0) {
    throw new TypeError(`dsh-resend: the event at seq ${String(event?.seq)} (${String(event?.type)}) derives no message, so its official price is undefined (spec \xA75.3)`);
  }
  return meter.estimateMessage(message);
}
function shadowedTokenCount(meter, events) {
  let total = 0;
  for (const event of events) {
    const price = officialNodePrice(meter, event);
    if (!Number.isSafeInteger(price) || price < 0) {
      throw new TypeError(`dsh-resend: the official price of the node at seq ${String(event?.seq)} is ${String(price)}, not a non-negative integer (spec \xA75.3)`);
    }
    total += price;
  }
  if (!Number.isSafeInteger(total)) {
    throw new RangeError(`dsh-resend: the shadowed-token sum ${String(total)} is outside the safe integer range (spec \xA75.3)`);
  }
  return total;
}

// src/write.js
var AUDIT_TYPE = "compaction/prune";
var CARRIER_TYPE = "user/message";
var CARRIER_SOURCE_KIND = "cordis-host-runner";
var AUDIT_KEYS = ["shadowedRange", "shadowedSeqs", "shadowedTokenCount"];
var SHADOWED_RANGE_KEYS = ["start", "end"];
var CARRIER_KEYS = ["role", "id", "content", "source"];
function assertKeySet(actual, expected, what) {
  const missing = expected.filter((key) => !actual.includes(key));
  const extra = actual.filter((key) => !expected.includes(key));
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `${what} must carry exactly [${expected.join(", ")}]; found [${actual.join(", ")}]${missing.length === 0 ? "" : ` (missing ${missing.join(", ")})`}${extra.length === 0 ? "" : ` (unexpected ${extra.join(", ")})`} (spec \xA75.3\u2013\xA75.4)`
    );
  }
}
function planRewindPair({ plan, auditSeq, carrierId, traceText, shadowedTokenCount: claim, binding = runtimeShapeBinding() }) {
  return {
    audit: {
      type: AUDIT_TYPE,
      data: {
        shadowedRange: { start: plan.rangeStartSeq, end: plan.endSeq },
        shadowedSeqs: [...plan.shadowedSeqs],
        shadowedTokenCount: claim
      }
    },
    carrier: {
      type: CARRIER_TYPE,
      data: {
        role: "user",
        id: carrierId,
        content: [{ type: "text", text: traceText }],
        source: { kind: CARRIER_SOURCE_KIND }
      },
      options: {
        surfaceOp: binding.replaceOp(plan.rangeStartSeq, plan.endSeq),
        sourceEventSeqs: [auditSeq, ...plan.shadowedSeqs]
      }
    }
  };
}
function assertPairContract(pair, { plan, auditSeq, carrierSeq, binding = runtimeShapeBinding() }) {
  const { data: audit, options: auditOptions } = pair.audit;
  const { data: carrier, options } = pair.carrier;
  assertKeySet(Object.keys(audit), AUDIT_KEYS, "the audit claim\u2019s data");
  assertKeySet(Object.keys(audit.shadowedRange), SHADOWED_RANGE_KEYS, "the audit claim\u2019s shadowedRange");
  if (auditOptions !== void 0) {
    throw new Error("the audit claim must not carry surfaceOp or sourceEventSeqs: it is not a surface node (spec \xA75.3)");
  }
  assertKeySet(Object.keys(carrier), CARRIER_KEYS, "the carrier\u2019s data");
  if (carrier.role !== "user") throw new Error(`the carrier\u2019s role must be "user", got ${JSON.stringify(carrier.role)} (spec \xA75.4)`);
  if (!hasMarkerPrefix(carrier.id)) {
    throw new Error(`the carrier\u2019s id must carry the ${MARKER_PREFIX} prefix, got ${JSON.stringify(carrier.id)} (spec \xA75.4)`);
  }
  if (!Array.isArray(carrier.content) || carrier.content.length === 0) {
    throw new Error("the carrier\u2019s content must be a non-empty array of text blocks: empty content projects an empty user message (spec \xA75.4)");
  }
  for (const block of carrier.content) {
    if (block?.type !== "text" || typeof block.text !== "string" || block.text === "") {
      throw new Error(`the carrier\u2019s content must hold text blocks only, got ${JSON.stringify(block)} (spec \xA75.4)`);
    }
  }
  assertKeySet(Object.keys(carrier.source ?? {}), ["kind"], "the carrier\u2019s source");
  if (carrier.source.kind !== CARRIER_SOURCE_KIND) {
    throw new Error(`the carrier\u2019s source.kind must be ${JSON.stringify(CARRIER_SOURCE_KIND)}, got ${JSON.stringify(carrier.source.kind)} (spec \xA75.4)`);
  }
  if (options?.surfaceOp === void 0) throw new Error("the carrier must carry a replace surfaceOp (spec \xA75.4)");
  const surfaceOp = options.surfaceOp;
  assertKeySet(Object.keys(surfaceOp), [OP_KEY, binding.keys.start, binding.keys.end], "the carrier\u2019s surfaceOp");
  if (surfaceOp[OP_KEY] !== REPLACE_OP) {
    throw new Error(`the carrier\u2019s surfaceOp ${OP_KEY} must be ${JSON.stringify(REPLACE_OP)}, got ${JSON.stringify(surfaceOp[OP_KEY])} (spec \xA75.4)`);
  }
  for (const name of [binding.keys.start, binding.keys.end]) {
    const endpoint = surfaceOp[name];
    if (!Number.isSafeInteger(endpoint) || endpoint < 0) {
      throw new Error(`the carrier\u2019s surfaceOp ${name} must be a non-negative safe integer, got ${String(endpoint)} (spec \xA75.4)`);
    }
  }
  const rangeStart = surfaceOp[binding.keys.start];
  const rangeEnd = surfaceOp[binding.keys.end];
  if (audit.shadowedRange.start !== rangeStart || audit.shadowedRange.end !== rangeEnd) {
    throw new Error(
      `the audit claim\u2019s shadowedRange ${audit.shadowedRange.start}..${audit.shadowedRange.end} must be exactly the carrier\u2019s range ${rangeStart}..${rangeEnd} (spec \xA75.3)`
    );
  }
  if (rangeStart !== plan.rangeStartSeq || rangeEnd !== plan.endSeq) {
    throw new Error(`the carrier\u2019s surfaceOp range ${rangeStart}..${rangeEnd} must be exactly the resolved range ${plan.rangeStartSeq}..${plan.endSeq} (spec \xA75.3)`);
  }
  const citedSeqs = audit.shadowedSeqs;
  if (!Array.isArray(citedSeqs) || citedSeqs.length === 0) throw new Error("the audit claim\u2019s shadowedSeqs must be a non-empty array (spec \xA75.3)");
  if (new Set(citedSeqs).size !== citedSeqs.length) throw new Error("the audit claim\u2019s shadowedSeqs must not contain duplicates (spec \xA75.3)");
  if (citedSeqs[0] !== rangeStart || citedSeqs.at(-1) !== rangeEnd) {
    throw new Error(`the audit claim\u2019s shadowedSeqs must begin at ${rangeStart} and end at ${rangeEnd} (spec \xA75.3)`);
  }
  if (!Number.isSafeInteger(audit.shadowedTokenCount) || audit.shadowedTokenCount < 0) {
    throw new Error(`the audit claim\u2019s shadowedTokenCount must be a non-negative integer, got ${String(audit.shadowedTokenCount)} (spec \xA75.3)`);
  }
  const sources = options.sourceEventSeqs;
  if (!Array.isArray(sources) || sources.length === 0) throw new Error("the carrier\u2019s sourceEventSeqs must be a non-empty array (spec \xA75.4)");
  if (sources[0] !== auditSeq) throw new Error(`the carrier\u2019s sourceEventSeqs must begin at the audit claim (seq ${auditSeq}), got ${String(sources[0])} (spec \xA75.4)`);
  if (new Set(sources).size !== sources.length) throw new Error("the carrier\u2019s sourceEventSeqs must not contain duplicates (spec \xA75.4)");
  const forward = sources.find((seq) => !Number.isSafeInteger(seq) || seq >= carrierSeq);
  if (forward !== void 0) {
    throw new Error(`the carrier\u2019s sourceEventSeqs must reference earlier events only; ${String(forward)} is not strictly less than ${carrierSeq} (spec \xA75.4)`);
  }
  const rangePortion = sources.slice(1);
  if (rangePortion.length !== plan.shadowedSeqs.length || rangePortion.some((seq, index) => seq !== plan.shadowedSeqs[index])) {
    throw new Error(`the carrier\u2019s sourceEventSeqs must cite the range exactly, in surface order: [${plan.shadowedSeqs.join(", ")}], got [${rangePortion.join(", ")}] (spec \xA75.4)`);
  }
}
function plannedEvents(pair, { auditSeq, carrierSeq }) {
  const time = Date.now();
  return [
    { type: pair.audit.type, seq: auditSeq, time, data: pair.audit.data },
    { type: pair.carrier.type, seq: carrierSeq, time, data: pair.carrier.data, ...pair.carrier.options }
  ];
}
function validatePlannedPair(log, planned) {
  foldSurface([...log, ...planned], currentSessionMessageProjections);
}
async function coveringLogForWrite(ctx, sessionId, session) {
  const covering = await readCoveringLog(ctx, sessionId);
  if (covering.status === "refused") {
    return { status: "refused", refusal: refuse(coveringRefusalCode(covering.reason), covering.detail) };
  }
  const prevTail = session.seq;
  const lastSeq = prevTail - 1;
  if (covering.lastCoveredSeq !== lastSeq || covering.log.length !== prevTail) {
    return {
      status: "refused",
      refusal: refuse(
        "message-pending",
        `the covering read of ${JSON.stringify(sessionId)} reaches ${String(covering.lastCoveredSeq)} over ${covering.log.length} events, while the live session is at seq ${prevTail} (the read must cover ${lastSeq} to validate this write)`
      )
    };
  }
  return { status: "ok", log: covering.log, prevTail };
}
function verifyWrittenPair({ audit, carrier }, { auditSeq, carrierSeq, binding = runtimeShapeBinding() }) {
  if (audit?.seq !== auditSeq) {
    return `the audit claim landed at seq ${String(audit?.seq)}, not the validated ${auditSeq}: another writer appended between the plan and the write`;
  }
  if (carrier?.seq !== carrierSeq) {
    return `the carrier landed at seq ${String(carrier?.seq)}, not the validated ${carrierSeq}: the shadow-price claim at seq ${auditSeq} is no longer adjacent to it`;
  }
  if (!Array.isArray(carrier.sourceEventSeqs) || carrier.sourceEventSeqs[0] !== audit.seq) {
    return `the carrier at seq ${carrier.seq} does not cite the audit claim at seq ${audit.seq} as its first source`;
  }
  const op = carrier.surfaceOp;
  if (op === void 0 || Object.keys(op).length !== 3 || op[OP_KEY] !== REPLACE_OP || !Object.hasOwn(op, binding.keys.start) || !Object.hasOwn(op, binding.keys.end)) {
    return `the carrier at seq ${carrier.seq} carries a surfaceOp outside the validated shape (${binding.keys.start}/${binding.keys.end})`;
  }
  return void 0;
}
async function writeRewindPair(ctx, { sessions, session, sessionId, plan, carrierId, traceText, binding = runtimeShapeBinding() }) {
  const price = shadowPriceSource(ctx);
  if (price.meter === void 0) return refuse("internal", price.detail);
  const covering = await coveringLogForWrite(ctx, sessionId, session);
  if (covering.status === "refused") return covering.refusal;
  const { prevTail } = covering;
  if (plan.tail !== void 0 && plan.tail !== prevTail) return refuse("message-pending", "the conversation changed after the rollback preview");
  if (plan.tail !== void 0 && hostService2(ctx, "agents")?.get(sessionId)?.status !== "idle") return refuse("agent-busy", "the agent started after the rollback preview");
  const auditSeq = prevTail;
  const carrierSeq = prevTail + 1;
  const nodes = [];
  for (const seq of plan.shadowedSeqs) {
    const event = eventAtSeq(covering.log, seq);
    if (event === void 0) {
      return refuse("message-pending", `the covering read of ${JSON.stringify(sessionId)} does not hold shadowed surface node ${seq}`);
    }
    nodes.push(event);
  }
  let claim;
  try {
    claim = shadowedTokenCount(price.meter, nodes);
  } catch (error) {
    return refuse("internal", `the official shadow price of the range could not be computed: ${describeError(error)}`);
  }
  const pair = planRewindPair({ plan, auditSeq, carrierId, traceText, shadowedTokenCount: claim, binding });
  try {
    assertPairContract(pair, { plan, auditSeq, carrierSeq, binding });
    validatePlannedPair(covering.log, plannedEvents(pair, { auditSeq, carrierSeq }));
  } catch (error) {
    return refuse("internal", `the planned rewind pair was refused before any write: ${describeError(error)}`);
  }
  let audit;
  try {
    audit = session.append(AUDIT_TYPE, pair.audit.data);
  } catch (error) {
    return refuse("internal", `the audit claim was refused and nothing was written: ${describeError(error)}`);
  }
  let carrier;
  try {
    carrier = session.append(CARRIER_TYPE, pair.carrier.data, pair.carrier.options);
  } catch (error) {
    await sessions.flush(session);
    logWarning(
      ctx,
      `the rewind of ${JSON.stringify(sessionId)} left an ORPHAN audit claim at seq ${audit.seq} (range ${plan.rangeStartSeq}..${plan.endSeq}) because the carrier was refused: ${describeError(error)} \u2014 flush completed for the events that did land; a later replace over a DIFFERENT range would make the host fold throw (spec \xA72.3)`
    );
    return refuse("internal", `the carrier was refused after the audit claim landed at seq ${audit.seq}: ${describeError(error)}`);
  }
  await sessions.flush(session);
  const problem = verifyWrittenPair({ audit, carrier }, { auditSeq, carrierSeq, binding });
  if (problem !== void 0) {
    logWarning(ctx, `the rewind of ${JSON.stringify(sessionId)} landed but does not match the validated pair: ${problem}`);
    return refuse("internal", `the written pair does not match the validated pair: ${problem}`);
  }
  return { ok: true, value: { auditSeq: audit.seq, carrierSeq: carrier.seq, shadowedSeqs: [...plan.shadowedSeqs] } };
}
export {
  assertPairContract,
  planRewindPair,
  plannedEvents,
  validatePlannedPair,
  writeRewindPair
};
