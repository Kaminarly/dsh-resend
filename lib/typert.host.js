/* GENERATED FILE — do not edit by hand; built from src/typert.host.js by scripts/build.mjs */

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

// src/typert.host.js
var TYPERT = {
  package: PACKAGE,
  face: "host",
  schemas,
  invocations: descriptors
};
export {
  TYPERT
};
