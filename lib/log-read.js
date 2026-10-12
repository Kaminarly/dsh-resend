/* GENERATED FILE — do not edit by hand; built from src/log-read.js by scripts/build.mjs */

// src/log-read.js
import { asArray, describeError, hostService } from "./host.js";
var REFUSAL_CODES = Object.freeze({
  "not-persisted": "message-pending",
  "replay-failed": "internal",
  "session-not-found": "session-not-found",
  internal: "internal"
});
function coveringRefusalCode(reason) {
  return REFUSAL_CODES[reason] ?? "internal";
}
function lastSeqOf(log) {
  let last;
  for (const event of log) {
    if (typeof event?.seq === "number" && (last === void 0 || event.seq > last)) last = event.seq;
  }
  return last;
}
function eventAtSeq(log, seq) {
  const indexed = log[seq];
  if (indexed !== void 0 && indexed?.seq === seq) return indexed;
  return log.find((event) => event?.seq === seq);
}
function queryRefusalReason(error) {
  switch (error?.code) {
    case "SESSION_QUERY_CORRUPT_SESSION":
      return "replay-failed";
    case "SESSION_QUERY_PERSISTENCE_FAILED":
      return "not-persisted";
    case "SESSION_QUERY_SESSION_NOT_FOUND":
      return "session-not-found";
    default:
      return "internal";
  }
}
async function readCoveringLog(ctx, sessionId) {
  const query = hostService(ctx, "sessionQuery");
  if (query === void 0) {
    return { status: "refused", reason: "internal", detail: "the sessionQuery service is not in this composition" };
  }
  let covering;
  try {
    covering = await query.readSession(sessionId);
  } catch (error) {
    return { status: "refused", reason: queryRefusalReason(error), detail: describeError(error) };
  }
  if (!Array.isArray(covering?.events)) return { status: "refused", reason: "internal", detail: "the covering log is not an array" };
  const log = covering.events;
  return { status: "ok", log, lastCoveredSeq: lastSeqOf(log) };
}
async function readFileMaxSeq(ctx, sessionId) {
  const persistence = hostService(ctx, "sessionPersistence");
  if (persistence === void 0) {
    return { status: "unknown", detail: "the sessionPersistence service is not in this composition" };
  }
  let handle;
  try {
    handle = await persistence.open(sessionId, "read");
  } catch (error) {
    return { status: "unknown", detail: `the stored session could not be opened for reading: ${describeError(error)}` };
  }
  try {
    const slice = await handle.read();
    const events = asArray(slice?.events);
    if (events.length === 0) {
      if (slice?.eventState === "detached") {
        return { status: "unknown", detail: "the stored log is not materialized yet (an empty detached read)" };
      }
      return { status: "known", fileMaxSeq: -1 };
    }
    const last = lastSeqOf(events);
    if (last === void 0) return { status: "unknown", detail: "the stored log held no event carrying a seq" };
    return { status: "known", fileMaxSeq: last };
  } catch (error) {
    return { status: "unknown", detail: `the stored log could not be read: ${describeError(error)}` };
  } finally {
    try {
      await handle.close?.();
    } catch {
    }
  }
}
export {
  coveringRefusalCode,
  eventAtSeq,
  lastSeqOf,
  readCoveringLog,
  readFileMaxSeq
};
