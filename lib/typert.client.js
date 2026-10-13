/* GENERATED FILE — do not edit by hand; built from src/typert.client.js by scripts/build.mjs */

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
  "not-last-user-message",
  "not-assistant-message",
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
function rollbackRequestSchema() {
  return z.strictObject({
    sessionId: z.string(),
    carrierSeq: z.number(),
    phase: z.enum(["status", "preview", "execute", "cancel"]),
    scope: z.optional(z.literal("artifacts")),
    planId: z.optional(z.string()),
    // The confirmed restore subset (spec §10): omitted keeps the legacy
    // full-restore behavior; an explicit set is validated by the business layer
    // against the plan it addresses, so the codec only carries its shape.
    selected: z.optional(z.array(z.string()))
  });
}
function rollbackResultSchema() {
  return z.union([
    z.strictObject({ ok: z.literal(false), error: z.strictObject({
      code: z.string(),
      files: z.optional(z.array(z.strictObject({ path: z.string(), action: z.enum(["restored", "refuse", "kept"]), reason: z.optional(z.string()) })))
    }) }),
    z.strictObject({ ok: z.literal(true), value: z.strictObject({
      planId: z.string(),
      scope: z.optional(z.literal("artifacts")),
      completed: z.optional(z.boolean()),
      empty: z.optional(z.boolean()),
      // Only a preview answer carries it: the selection identity recorded by an
      // interrupted run, so a re-check does not default back to "everything".
      selected: z.optional(z.array(z.string())),
      // 'kept' is the user's own choice to keep a file; 'refuse' with a reason
      // is the system being unable to restore it. The two are never conflated.
      files: z.array(z.strictObject({ path: z.string(), action: z.enum(["restore", "refuse", "kept", "restored"]), reason: z.optional(z.string()) }))
    }) })
  ]);
}
descriptors.push({
  id: `${PACKAGE}#${NAMESPACE}/rollback`,
  service: SERVICE,
  namespace: NAMESPACE,
  method: "rollback",
  invocation: { kind: "direct" },
  parameters: [{ name: "request", wire: "request", source: "json", codec: {
    mode: "strict",
    typeSymbol: `${PACKAGE}/types#RollbackRequest`,
    create: rollbackRequestSchema
  } }],
  result: { mode: "strict", typeSymbol: `${PACKAGE}/types#RollbackResult`, create: rollbackResultSchema }
});
function conversationRequestSchema() {
  return z.strictObject({ sessionId: z.readonly(z.string()) });
}
function conversationResultSchema() {
  return z.union([
    z.strictObject({ ok: z.literal(true), value: z.strictObject({
      assistantSeqs: z.array(z.number()),
      lastReplySeq: z.optional(z.number()),
      userSeqs: z.array(z.number()),
      lastUserSeq: z.optional(z.number())
    }) }),
    z.strictObject({ ok: z.literal(false), error: z.union(ERROR_CODES.map((code) => z.strictObject({ code: z.literal(code) }))) })
  ]);
}
descriptors.push({
  id: `${PACKAGE}#${NAMESPACE}/conversation`,
  service: SERVICE,
  namespace: NAMESPACE,
  method: "conversation",
  invocation: { kind: "direct" },
  parameters: [{ name: "request", wire: "request", source: "json", codec: {
    mode: "strict",
    typeSymbol: `${PACKAGE}/types#ConversationRequest`,
    create: conversationRequestSchema
  } }],
  result: { mode: "strict", typeSymbol: `${PACKAGE}/types#ConversationResult`, create: conversationResultSchema }
});
function cleanupRequestSchema() {
  return z.strictObject({
    phase: z.enum(["list", "preview", "execute", "cancel"]),
    mode: z.enum(["residue", "sessions"]),
    sessionIds: z.optional(z.array(z.string())),
    planId: z.optional(z.string())
  });
}
function cleanupResultSchema() {
  const session = z.strictObject({
    sessionId: z.string(),
    title: z.string(),
    projectPath: z.string(),
    records: z.number(),
    bytes: z.number(),
    noSnapshots: z.boolean()
  });
  return z.union([
    z.strictObject({ ok: z.literal(false), error: z.strictObject({ code: z.string() }) }),
    z.strictObject({ ok: z.literal(true), value: z.union([
      z.strictObject({ phase: z.literal("list"), sessions: z.array(session), unreadableSessions: z.number() }),
      z.strictObject({ phase: z.literal("cancel") }),
      z.strictObject({
        phase: z.literal("preview"),
        planId: z.string(),
        sessions: z.array(session),
        categories: z.array(z.strictObject({ kind: z.enum(["records", "outcomes", "objects", "temporary"]), count: z.number(), bytes: z.number() })),
        estimatedBytes: z.number(),
        itemCount: z.number(),
        protectedObjects: z.boolean(),
        unreadableSessions: z.number()
      }),
      z.strictObject({
        phase: z.literal("execute"),
        releasedBytes: z.number(),
        results: z.array(z.strictObject({ sessionId: z.string(), title: z.string(), status: z.enum(["cleaned", "skipped", "failed"]), reason: z.string(), bytes: z.number() })),
        failures: z.array(z.strictObject({ item: z.string(), reason: z.string() })),
        changedCount: z.number(),
        protectedObjects: z.boolean()
      })
    ]) })
  ]);
}
descriptors.push({
  id: `${PACKAGE}#${NAMESPACE}/cleanup`,
  service: SERVICE,
  namespace: NAMESPACE,
  method: "cleanup",
  invocation: { kind: "direct" },
  parameters: [{ name: "request", wire: "request", source: "json", codec: {
    mode: "strict",
    typeSymbol: `${PACKAGE}/types#CleanupRequest`,
    create: cleanupRequestSchema
  } }],
  result: { mode: "strict", typeSymbol: `${PACKAGE}/types#CleanupResult`, create: cleanupResultSchema }
});
function replayRequestSchema() {
  return z.union([
    z.strictObject({ phase: z.literal("start"), request: resendApplyRequestSchema() }),
    z.strictObject({
      phase: z.enum(["preview", "restore", "keep", "cancel"]),
      sessionId: z.string(),
      preflightId: z.string(),
      // The confirmed restore subset for `restore` (spec §10): the business layer
      // validates it against the plan before anything is consumed.
      selected: z.optional(z.array(z.string()))
    })
  ]);
}
function replayResultSchema() {
  return z.union([
    resendApplyResultSchema(),
    rollbackResultSchema(),
    z.strictObject({ ok: z.literal(true), value: z.strictObject({ canceled: z.literal(true) }) }),
    z.strictObject({ ok: z.literal(true), value: z.strictObject({
      preflight: z.literal(true),
      preflightId: z.string(),
      userSeq: z.number(),
      op: z.enum(["edit", "regenerate"]),
      planId: z.string(),
      completed: z.optional(z.boolean()),
      scope: z.optional(z.literal("artifacts")),
      // The same real per-member outcomes the history entry reports (spec §9),
      // and the selection identity an interrupted run recorded (spec §8).
      selected: z.optional(z.array(z.string())),
      files: z.array(z.strictObject({ path: z.string(), action: z.enum(["restore", "refuse", "kept", "restored"]), reason: z.optional(z.string()) }))
    }) })
  ]);
}
descriptors.push({
  id: `${PACKAGE}#${NAMESPACE}/replay`,
  service: SERVICE,
  namespace: NAMESPACE,
  method: "replay",
  invocation: { kind: "direct" },
  parameters: [{ name: "request", wire: "request", source: "json", codec: {
    mode: "strict",
    typeSymbol: `${PACKAGE}/types#ReplayRequest`,
    create: replayRequestSchema
  } }],
  result: { mode: "strict", typeSymbol: `${PACKAGE}/types#ReplayResult`, create: replayResultSchema }
});

// src/typert.client.js
var TYPERT_REMOTE = {
  package: PACKAGE,
  descriptors
};
export {
  TYPERT_REMOTE
};
