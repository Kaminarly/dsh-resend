/**
 * The ONE descriptor table both faces of the bundle derive from (spec §6.1).
 *
 * Two hand-written faces exist because the Host plugin registers a contribution
 * and the Client plugin mounts one; both are generated from this single table so
 * they cannot drift, and `scripts/check-typert.mjs` proves that by deep-comparing
 * the two faces it imports from `lib/`.
 *
 * Hand-written, deliberately: there is no generator to pin, and the validation
 * contract (§6.3) is small enough to satisfy exactly. `model` is omitted (it is
 * the loader's reflection graph and nothing here reflects), and `sourceLocation`
 * is omitted (it is generator provenance pointing at a file that is not
 * shipped, and nothing validates it).
 *
 * Everything the descriptor needs is derived here — package, service, namespace,
 * method, endpoint — so the service binding in `./resend.js` and the descriptor
 * in this file cannot disagree about an identity.
 *
 * The schemas come from `zod/mini`, the same zod core with a functional spelling
 * (`z.readonly(z.string())` instead of `z.string().readonly()`). The reason is
 * the client bundle: both faces derive from this one table, so whatever builds
 * these schemas is bundled into the browser script, and the classic entry would
 * carry zod's entire surface — 758 KB of committed artifact instead of ~40 KB —
 * for functions the client never calls (spec §16.5: the result codec has no
 * `decode`, and the mount path only checks `mode: 'strict'`). Everything the
 * host's boundary decode needs — strict objects, parse, safeParse — is core
 * behavior, and the two entries share one core.
 */
import * as z from 'zod/mini'
import { ERROR_CODES } from './error-codes.js'

/** Package name as it appears on the wire and in every key. */
export const PACKAGE = 'dsh-resend'

/** The Cordis service key that owns the method (`ctx.get(SERVICE)`). */
export const SERVICE = 'resend'

/** Remote namespace; the endpoint is `<NAMESPACE>/<METHOD>` (spec §6.2). */
export const NAMESPACE = 'resend'

/** The one unary method this plugin mounts. */
export const METHOD = 'apply'

/**
 * The wire spelling of one endpoint, `<namespace>/<method>`.
 *
 * One home for the format: the descriptor's own endpoint, and the endpoints the
 * host half reads back out of the registry at startup, are spelled by this.
 * @param descriptor - anything carrying `namespace` and `method`.
 */
export const endpointOf = (descriptor) => `${descriptor.namespace}/${descriptor.method}`

/** The endpoint the API Gateway dispatches on. */
export const ENDPOINT = endpointOf({ namespace: NAMESPACE, method: METHOD })

/** Invocation id: `<package>#<endpoint>`. */
export const INVOCATION_ID = `${PACKAGE}#${ENDPOINT}`

/**
 * The closed business-error vocabulary (spec §4.5), re-exported from its own
 * module so this table stays the one place the WIRE contract is derived from:
 * the result codec below turns it into a discriminated union, and every
 * producer of a code checks against the same list.
 */
export { ERROR_CODES }

/** Schema records: `{ name, create }`, each `create` a schema factory. */
export const schemas = []

/**
 * The `resend.apply` request, structurally (spec §4.1).
 *
 * Structural on purpose: every semantic refusal in §4.5 — an empty `sessionId`,
 * a missing `text` for `op: 'edit'` — is a **business** outcome that must reach
 * the caller as one of the twelve codes, so the codec must not pre-empt the
 * business layer by rejecting them here. What the codec does enforce is the wire
 * shape: JSON types only, no unknown fields (strictness is what makes a field a
 * caller forgot loud instead of silently dropped).
 */
let requestSchema
/** @returns the strict `ResendApplyRequest` wire schema. */
export function resendApplyRequestSchema() {
  return (requestSchema ??= z.strictObject({
    sessionId: z.readonly(z.string()),
    targetSeq: z.readonly(z.number()),
    op: z.readonly(z.enum(['edit', 'regenerate'])),
    text: z.optional(z.readonly(z.string())),
  }))
}

/**
 * The `resend.apply` result — `RemoteResult<T>` (spec §4.1, §4.5, §16.4).
 *
 * A tagged union: `ok: true` carries the business value, `ok: false` carries one
 * variant per code in {@link ERROR_CODES}. Every field is readonly and every
 * object is strict, so an unknown member is rejected rather than folded away.
 *
 * `resendMessageId` is OPTIONAL, and that is deliberate (ticket 05, spec §4.1,
 * §9.4): its own meaning is "the id of the message queued to the agent", so a
 * rewind that landed but whose prompt the agent did not take has no such id to
 * report. The alternative — answering `ok: false` — would report FAILURE over a
 * surface this plugin has already changed, which §9.4 forbids outright, and it
 * would also withhold `carrierSeq`/`shadowedSeqs` from a client that needs them
 * (the hide plan is built from the shadowed set). So the two outcomes are one
 * success with an optional member: present means the prompt was queued, absent
 * means the rewind stands and the re-send did not, and the client renders the
 * §9.4 row for the latter.
 *
 * The client never runs this schema (spec §16.5: the generated result codec
 * carries no `decode`, so the host's value passes through unchanged). It is
 * written out in full anyway: it is what the Typert registry serves to tooling,
 * and a wrong one is a documented lie about the wire.
 */
let resultSchema
/** @returns the strict `ResendApplyResult` wire schema. */
export function resendApplyResultSchema() {
  return (resultSchema ??= z.union([
    z.strictObject({
      ok: z.readonly(z.literal(true)),
      value: z.readonly(z.strictObject({
        carrierSeq: z.readonly(z.number()),
        shadowedSeqs: z.readonly(z.array(z.number())),
        resendMessageId: z.optional(z.readonly(z.string())),
      })),
    }),
    z.strictObject({
      ok: z.readonly(z.literal(false)),
      error: z.readonly(z.union(ERROR_CODES.map((code) => z.strictObject({ code: z.readonly(z.literal(code)) })))),
    }),
  ]))
}

/** Invocation descriptors, shared verbatim by both faces. */
export const descriptors = [
  {
    id: INVOCATION_ID,
    service: SERVICE,
    namespace: NAMESPACE,
    method: METHOD,
    // Unary: `invocation.kind` is `direct`, and `mode`, `scope`, `cancellation`
    // and lookup parameters are all omitted — the registry allows `mode` only as
    // `'stream'`, so a unary method omits it entirely (spec §6.3 rule 6).
    invocation: { kind: 'direct' },
    parameters: [
      {
        name: 'request',
        wire: 'request',
        source: 'json',
        codec: {
          mode: 'strict',
          // Nothing verifies this string beyond non-emptiness (this plugin has no
          // lookup or Context provider). It is still the only human-readable trace
          // when a strict definition and its provider disagree, so it names the
          // type this schema actually is.
          typeSymbol: `${PACKAGE}/types#ResendApplyRequest`,
          create: resendApplyRequestSchema,
        },
      },
    ],
    result: {
      mode: 'strict',
      typeSymbol: `${PACKAGE}/types#ResendApplyResult`,
      create: resendApplyResultSchema,
    },
  },
]

/** Phase 2 exposes consequences and transient plans, never stored contents. */
export function rollbackRequestSchema() {
  return z.strictObject({
    sessionId: z.string(), carrierSeq: z.number(),
    phase: z.enum(['preview', 'execute', 'cancel']),
    scope: z.optional(z.enum(['conversation', 'artifacts', 'both'])),
    planId: z.optional(z.string()),
  })
}

const rollbackConversationSchema = () => z.strictObject({
  action: z.enum(['rewind', 'rewound', 'unchanged']), count: z.number(),
  carrierSeq: z.optional(z.number()), shadowedSeqs: z.optional(z.array(z.number())),
})

export function rollbackResultSchema() {
  return z.union([
    z.strictObject({ ok: z.literal(false), error: z.strictObject({ code: z.string(),
      files: z.optional(z.array(z.strictObject({ path: z.string(), action: z.enum(['restored', 'refuse']), reason: z.optional(z.string()) }))),
      conversation: z.optional(rollbackConversationSchema()),
    }) }),
    z.strictObject({ ok: z.literal(true), value: z.strictObject({
      planId: z.string(),
      scope: z.optional(z.enum(['conversation', 'artifacts', 'both'])),
      conversation: z.optional(rollbackConversationSchema()),
      files: z.array(z.strictObject({ path: z.string(), action: z.enum(['restore', 'refuse']), reason: z.optional(z.string()) })),
    }) }),
  ])
}

descriptors.push({
  id: `${PACKAGE}#${NAMESPACE}/rollback`, service: SERVICE, namespace: NAMESPACE, method: 'rollback',
  invocation: { kind: 'direct' },
  parameters: [{ name: 'request', wire: 'request', source: 'json', codec: {
    mode: 'strict', typeSymbol: `${PACKAGE}/types#RollbackRequest`, create: rollbackRequestSchema,
  } }],
  result: { mode: 'strict', typeSymbol: `${PACKAGE}/types#RollbackResult`, create: rollbackResultSchema },
})

/** Only eligibility addresses cross this read-only seam; no prompt text or log. */
export function conversationRequestSchema() {
  return z.strictObject({ sessionId: z.readonly(z.string()) })
}
export function conversationResultSchema() {
  return z.union([
    z.strictObject({ ok: z.literal(true), value: z.strictObject({
      assistantSeqs: z.array(z.number()), lastReplySeq: z.optional(z.number()),
      userSeqs: z.array(z.number()), lastUserSeq: z.optional(z.number()),
    }) }),
    z.strictObject({ ok: z.literal(false), error: z.union(ERROR_CODES.map(code => z.strictObject({ code: z.literal(code) }))) }),
  ])
}
descriptors.push({
  id: `${PACKAGE}#${NAMESPACE}/conversation`, service: SERVICE, namespace: NAMESPACE, method: 'conversation',
  invocation: { kind: 'direct' },
  parameters: [{ name: 'request', wire: 'request', source: 'json', codec: {
    mode: 'strict', typeSymbol: `${PACKAGE}/types#ConversationRequest`, create: conversationRequestSchema,
  } }],
  result: { mode: 'strict', typeSymbol: `${PACKAGE}/types#ConversationResult`, create: conversationResultSchema },
})
