/* GENERATED FILE — do not edit by hand; built from src/index.js by scripts/build.mjs */

// src/resend.js
import { Service } from "@deepseek-ai/cordis";

// src/typert.js
import * as z from "zod/mini";
var PACKAGE = "dsh-resend";
var SERVICE = "resend";
var NAMESPACE = "resend";
var METHOD = "apply";
var endpointOf = (descriptor) => `${descriptor.namespace}/${descriptor.method}`;
var ENDPOINT = endpointOf({ namespace: NAMESPACE, method: METHOD });
var INVOCATION_ID = `${PACKAGE}#${ENDPOINT}`;
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
function failure(code) {
  if (!ERROR_CODES.includes(code)) {
    throw new TypeError(`dsh-resend: ${JSON.stringify(code)} is not one of the ${ERROR_CODES.length} result codes (spec \xA74.5)`);
  }
  return Object.freeze({ ok: false, error: Object.freeze({ code }) });
}
var ResendService = class extends Service {
  /** @param ctx - the Host plugin's context, which owns this Service's lifetime. */
  constructor(ctx) {
    super(ctx, SERVICE);
    this.typertRemote = Object.freeze({ service: this, serviceKey: SERVICE, namespace: NAMESPACE });
  }
  /**
   * One edit-and-resend or regenerate: rewind, then resend (spec §1, §4.1).
   *
   * The contract is in place; the semantics are not. Target resolution, the
   * rewind pair (§5.1–§5.4) and the resend (§5.5) land in tickets 03–05. Until
   * they do, every call refuses rather than pretending: a fabricated success
   * would tell the client a message was queued that never was. `internal` is the
   * closed vocabulary's only code for "this build cannot serve the request", and
   * the row logs that state once at startup.
   * @param request - `ResendApplyRequest`, already boundary-validated by the
   *   Gateway through this descriptor's strict codec (spec §6.3 rule 5).
   * @returns `RemoteResult<ResendApplyResult>`; never a rejection for a business
   *   outcome (spec §4.5).
   */
  apply(request) {
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
var inject = ["typert"];
function apply(ctx) {
  new ResendService(ctx);
  ctx.typert.register(TYPERT);
  const endpoints = ctx.typert.local.list().filter((descriptor) => descriptor.service === SERVICE).map(endpointOf);
  ctx.root.logger?.("dsh-resend")?.info(
    `dsh-resend host half loaded \u2014 Remote endpoints registered: ${endpoints.join(", ") || "none"}. Operation semantics are not implemented in this build: every ${ENDPOINT} call refuses with "internal".`
  );
}
export {
  apply,
  inject,
  name
};
