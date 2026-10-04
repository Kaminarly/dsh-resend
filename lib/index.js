/* GENERATED FILE — do not edit by hand; built from src/index.js by scripts/build.mjs */

// src/typert.js
import * as z from "zod/mini";

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

// src/typert.js
var PACKAGE = "dsh-resend";
var SERVICE = "resend";
var NAMESPACE = "resend";
var METHOD = "apply";
var endpointOf = (descriptor) => `${descriptor.namespace}/${descriptor.method}`;
var ENDPOINT = endpointOf({ namespace: NAMESPACE, method: METHOD });
var INVOCATION_ID = `${PACKAGE}#${ENDPOINT}`;
var schemas = [];
var requestSchema;
function resendApplyRequestSchema() {
  return requestSchema ??= z.strictObject({
    sessionId: z.readonly(z.string()),
    targetSeq: z.readonly(z.number()),
    op: z.readonly(z.enum(["edit", "regenerate"])),
    text: z.optional(z.readonly(z.string()))
  });
}
var resultSchema;
function resendApplyResultSchema() {
  return resultSchema ??= z.union([
    z.strictObject({
      ok: z.readonly(z.literal(true)),
      value: z.readonly(z.strictObject({
        carrierSeq: z.readonly(z.number()),
        shadowedSeqs: z.readonly(z.array(z.number())),
        resendMessageId: z.optional(z.readonly(z.string()))
      }))
    }),
    z.strictObject({
      ok: z.readonly(z.literal(false)),
      error: z.readonly(z.union(ERROR_CODES.map((code) => z.strictObject({ code: z.readonly(z.literal(code)) }))))
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

// src/resend.js
import { Service } from "@deepseek-ai/cordis";
import { randomUUID } from "@deepseek-ai/dsh-util-crypto";
import { describeError, hostService, logWarning } from "./host.js";
import { carrierIdFor, resendIdFor } from "./marker.js";
import { resolveTarget } from "./resolve.js";

// src/session-lock.js
var tails = /* @__PURE__ */ new Map();
function withSessionLock(sessionId, task) {
  const previous = tails.get(sessionId) ?? Promise.resolve();
  const run = previous.then(task);
  const tail = run.then(
    () => void 0,
    () => void 0
  );
  tails.set(sessionId, tail);
  void tail.then(() => {
    if (tails.get(sessionId) === tail) tails.delete(sessionId);
  });
  return run;
}

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

// src/resend.js
import { writeRewindPair } from "./write.js";
var FIBER_ACTIVE = 2;
function failure(code) {
  assertCode(code);
  return Object.freeze({ ok: false, error: Object.freeze({ code }) });
}
function guarded(read) {
  try {
    return { value: read() };
  } catch (error) {
    return { code: "internal", detail: describeError(error) };
  }
}
function handOffPrompt(ctx, { agent, sessionId, resendMessageId, text }) {
  try {
    agent.followup({ role: "user", id: resendMessageId, content: [{ type: "text", text }], source: { kind: "user" } });
    if (agent.status === "running") return true;
    logWarning(
      ctx,
      `the rewind of ${JSON.stringify(sessionId)} stands, but the agent did not take the prompt (status ${JSON.stringify(agent.status)}): the re-send is owed and the client offers it (spec \xA79.4)`
    );
  } catch (error) {
    logWarning(ctx, `the re-send for ${JSON.stringify(sessionId)} could not be handed to the agent: ${describeError(error)}`);
  }
  return false;
}
function rewindResult({ carrierSeq, shadowedSeqs, resendMessageId }) {
  const value = resendMessageId === void 0 ? { carrierSeq, shadowedSeqs } : { carrierSeq, shadowedSeqs, resendMessageId };
  return Object.freeze({ ok: true, value: Object.freeze(value) });
}
async function rewind(ctx, { session, agent, sessions, sessionId, request }) {
  try {
    const { op } = request;
    const surfaceRead = guarded(() => session.surface.nodes);
    if (surfaceRead.code !== void 0) {
      logWarning(ctx, `resend.apply could not read the live surface of ${JSON.stringify(sessionId)}: ${surfaceRead.detail}`);
      return failure(surfaceRead.code);
    }
    const resolution = await resolveTarget(ctx, request, surfaceRead.value);
    if (!resolution.ok) {
      if (resolution.error.code === "internal") {
        logWarning(ctx, `resend.apply could not resolve the request: ${resolution.error.detail ?? "no detail"}`);
      }
      return failure(resolution.error.code);
    }
    const plan = resolution.value;
    if (plan.kind === "resend-only") {
      if (agent.status !== "idle") {
        logWarning(ctx, `the re-send for ${JSON.stringify(sessionId)} was asked for while a turn was open on it (spec \xA74.4 rule 4)`);
        return failure("agent-busy");
      }
      const taken2 = handOffPrompt(ctx, { agent, sessionId, resendMessageId: plan.resendMessageId, text: plan.resendText });
      return rewindResult({
        carrierSeq: plan.carrierSeq,
        shadowedSeqs: plan.shadowedSeqs,
        resendMessageId: taken2 ? plan.resendMessageId : void 0
      });
    }
    if (agent.status !== "idle") {
      agent.cancel?.({ kind: "user" });
      await agent.whenIdle?.();
      if (agent.status !== "idle") {
        logWarning(ctx, `resend.apply found a turn open on ${JSON.stringify(sessionId)} at the write boundary and it did not reach idle`);
        return failure("agent-busy");
      }
    }
    const carrierId = carrierIdFor(op, randomUUID());
    const resendMessageId = resendIdFor(carrierId);
    const write = await writeRewindPair(ctx, {
      sessions,
      session,
      sessionId,
      plan,
      carrierId,
      traceText: traceTextNow(ctx)
    });
    if (!write.ok) {
      if (write.error.code === "internal") {
        logWarning(ctx, `resend.apply could not write the rewind pair for ${JSON.stringify(sessionId)}: ${write.error.detail ?? "no detail"}`);
      }
      return failure(write.error.code);
    }
    const taken = handOffPrompt(ctx, { agent, sessionId, resendMessageId, text: plan.resendText });
    return rewindResult({
      carrierSeq: write.value.carrierSeq,
      shadowedSeqs: write.value.shadowedSeqs,
      resendMessageId: taken ? resendMessageId : void 0
    });
  } catch (error) {
    logWarning(ctx, `resend.apply failed unexpectedly while rewinding ${JSON.stringify(sessionId)}: ${describeError(error)}`);
    return failure("internal");
  }
}
var ResendService = class extends Service {
  /**
   * @param ctx - the context this row was activated with. Captured rather than
   *   read back later: `ctx` is a property Cordis TRACES, so a read of it inside
   *   a method resolves to the CALLER's context, not this row's — and the
   *   caller's fiber is the root fiber, which is ACTIVE forever. §4.4 step 1 is
   *   only observable through the row's own fiber, and service resolution is
   *   only honest through the context the plugin was loaded with.
   */
  constructor(ctx) {
    super(ctx, SERVICE);
    this.hostCtx = ctx;
    this.ownerFiber = ctx.fiber;
    this.typertRemote = Object.freeze({ service: this, serviceKey: SERVICE, namespace: NAMESPACE });
  }
  /**
   * One edit-and-resend or regenerate: rewind the range, then resend the prompt
   * — or, when the rewind already landed and its prompt never reached the agent,
   * only the resend (spec §5.5, §9.4).
   *
   * Every diagnosable line for an unexpected fault goes through `logWarning`
   * (spec §11, §12); every business refusal is legible to the user as one of the
   * closed codes and is never logged.
   * @param request - `ResendApplyRequest`, already boundary-validated by the
   *   Gateway through this descriptor's strict codec (spec §6.3 rule 5).
   * @returns `RemoteResult<ResendApplyResult>`; never a rejection for a business
   *   outcome (spec §4.5).
   */
  async apply(request) {
    const ctx = this.hostCtx;
    const fiber = this.ownerFiber;
    if (fiber !== void 0 && fiber.state !== FIBER_ACTIVE) return failure("internal");
    const sessionId = request?.sessionId;
    const targetSeq = request?.targetSeq;
    const op = request?.op;
    if (typeof sessionId !== "string" || sessionId === "") return failure("bad-request");
    if (op !== "edit" && op !== "regenerate") return failure("bad-request");
    if (op === "edit" && typeof request.text !== "string") return failure("bad-request");
    if (!Number.isSafeInteger(targetSeq) || targetSeq < 0) return failure("bad-request");
    const sessions = hostService(ctx, "sessions");
    if (sessions === void 0) return failure("internal");
    const sessionRead = guarded(() => sessions.get(sessionId));
    if (sessionRead.code !== void 0) {
      logWarning(ctx, `resend.apply could not read sessions.get(${JSON.stringify(sessionId)}): ${sessionRead.detail}`);
      return failure(sessionRead.code);
    }
    const session = sessionRead.value;
    if (session === void 0) return failure("session-not-found");
    const agents = hostService(ctx, "agents");
    if (agents === void 0) return failure("internal");
    const agentRead = guarded(() => agents.get(sessionId));
    if (agentRead.code !== void 0) {
      logWarning(ctx, `resend.apply could not read agents.get(${JSON.stringify(sessionId)}): ${agentRead.detail}`);
      return failure(agentRead.code);
    }
    const agent = agentRead.value;
    if (agent === void 0) return failure("agent-unavailable");
    if (agent.status !== "idle") return failure("agent-busy");
    return withSessionLock(sessionId, () => rewind(ctx, { session, agent, sessions, sessionId, request }));
  }
};

// src/typert.host.js
var TYPERT = {
  package: PACKAGE,
  face: "host",
  schemas,
  invocations: descriptors
};

// src/index.js
var name = "dsh-resend";
var inject = ["sessions", "agents", "sessionQuery", "sessionPersistence", "tokenMeter", "typert"];
function apply(ctx) {
  new ResendService(ctx);
  ctx.typert.register(TYPERT);
  const endpoints = ctx.typert.local.list().filter((descriptor) => descriptor.service === SERVICE).map(endpointOf);
  ctx.root.logger?.("dsh-resend")?.info(
    `dsh-resend host half loaded \u2014 Remote endpoints registered: ${endpoints.join(", ") || "none"}. ${ENDPOINT} resolves its target, its range and its resend text from a covering log read, then writes the rewind as one pair \u2014 the audit claim (compaction/prune) and its carrier (user/message) \u2014 validated together before either append and flushed once. The resend itself is ticket 05.`
  );
}
export {
  apply,
  inject,
  name
};
