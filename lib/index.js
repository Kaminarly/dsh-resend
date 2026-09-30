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
        resendMessageId: z.readonly(z.string())
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
import { describeError, hostService, logWarning } from "./host.js";
import { resolveTarget } from "./resolve.js";
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
var ResendService = class extends Service {
  /** @param ctx - the Host plugin's context, which owns this Service's lifetime. */
  constructor(ctx) {
    super(ctx, SERVICE);
    this.typertRemote = Object.freeze({ service: this, serviceKey: SERVICE, namespace: NAMESPACE });
  }
  /**
   * One edit-and-resend or regenerate: resolve the target, the range and the
   * resend text — and write nothing (spec §4.3–§4.5; ticket 03).
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
    const fiber = this.ctx.fiber;
    if (fiber !== void 0 && fiber.state !== FIBER_ACTIVE) return failure("internal");
    const sessionId = request?.sessionId;
    const targetSeq = request?.targetSeq;
    const op = request?.op;
    if (typeof sessionId !== "string" || sessionId === "") return failure("bad-request");
    if (op !== "edit" && op !== "regenerate") return failure("bad-request");
    if (op === "edit" && typeof request.text !== "string") return failure("bad-request");
    if (!Number.isSafeInteger(targetSeq) || targetSeq < 0) return failure("bad-request");
    const sessions = hostService(this.ctx, "sessions");
    if (sessions === void 0) return failure("internal");
    const sessionRead = guarded(() => sessions.get(sessionId));
    if (sessionRead.code !== void 0) {
      logWarning(this.ctx, `resend.apply could not read sessions.get(${JSON.stringify(sessionId)}): ${sessionRead.detail}`);
      return failure(sessionRead.code);
    }
    const session = sessionRead.value;
    if (session === void 0) return failure("session-not-found");
    const agents = hostService(this.ctx, "agents");
    if (agents === void 0) return failure("internal");
    const agentRead = guarded(() => agents.get(sessionId));
    if (agentRead.code !== void 0) {
      logWarning(this.ctx, `resend.apply could not read agents.get(${JSON.stringify(sessionId)}): ${agentRead.detail}`);
      return failure(agentRead.code);
    }
    const agent = agentRead.value;
    if (agent === void 0) return failure("agent-unavailable");
    if (agent.status !== "idle") return failure("agent-busy");
    const surfaceRead = guarded(() => session.surface.nodes);
    if (surfaceRead.code !== void 0) {
      logWarning(this.ctx, `resend.apply could not read the live surface of ${JSON.stringify(sessionId)}: ${surfaceRead.detail}`);
      return failure(surfaceRead.code);
    }
    const resolution = await resolveTarget(this.ctx, request, surfaceRead.value);
    if (!resolution.ok) {
      if (resolution.error.code === "internal") logWarning(this.ctx, `resend.apply could not resolve the request: ${resolution.error.detail ?? "no detail"}`);
      return failure(resolution.error.code);
    }
    logWarning(this.ctx, `a fully resolved ${op} plan for ${JSON.stringify(sessionId)} stopped at the write boundary (the rewind pair is ticket 04)`);
    return failure("internal");
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
var inject = ["sessions", "agents", "sessionQuery", "sessionPersistence", "typert"];
function apply(ctx) {
  new ResendService(ctx);
  ctx.typert.register(TYPERT);
  const endpoints = ctx.typert.local.list().filter((descriptor) => descriptor.service === SERVICE).map(endpointOf);
  ctx.root.logger?.("dsh-resend")?.info(
    `dsh-resend host half loaded \u2014 Remote endpoints registered: ${endpoints.join(", ") || "none"}. ${ENDPOINT} resolves its target, its range and its resend text from a covering log read; this build stops at the write boundary, so a fully resolved plan refuses with "internal" until ticket 04 lands the pair.`
  );
}
export {
  apply,
  inject,
  name
};
