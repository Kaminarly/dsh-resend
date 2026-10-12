# 19 — How is the Remote descriptor artifact produced: hand-write it, or pin the generator?

Type: research
Status: resolved

## Question

[How does a plugin's client half invoke its host half?](18-client-to-host-channel.md) established the
channel — a **self-mounted Typert Remote over the API Gateway** — and left one choice to the spec
(*"The spec must pick one and say so; this is not a detail an implementing agent can guess"*):

1. **hand-write** the descriptors and zod schema factories, or
2. **pin** `@deepseek-ai/dsh-typert-generator` from the DSH source as a devDependency.

Ticket 18 also recorded the reason it could not answer it: *"I did not read
`validateTypertManifest()`'s body, so 'a hand-written manifest that satisfies the documented contract
will be accepted' is an **inference from the documented rules**, not a verified outcome."* Its
premise was therefore **"the generator is load-bearing"** — the question was only which workaround to
take.

This ticket reads the **installed 2.0.15 validator bodies** and the **shipped generated artifacts**
and settles it.

## Sources

Local, read-only, on the shipped app: `D:\DSH Desktop\resources\app\node_modules\@deepseek-ai\` —
`dsh-typert-registry\lib\index.js` (the validation contract), `dsh-api-gateway\lib\index.js` and
`\lib\types\client\index.js` (the consumer and the mount path),
`dsh-api-gateway\README.zh.md`, `dsh-typert-loader\README.zh.md`, `dsh-client-modules\lib\index.js`,
and two **shipped generated artifacts** to read the target shape off:
`dsh-message-feedback\lib\typert.host.js` (344 lines) and
`dsh-message-feedback\lib\typert.remote-client.js` (190 lines), plus `package.json` manifests across
the tree. Nothing was installed, run, or modified.

## Answer

**Hand-write it. The generator is not load-bearing, and ticket 18's premise was too pessimistic.**

The decisive finding is that the artifact does **not** have to pass the loader's strict manifest
validator at all. `ctx.typert.register(contribution)` is the **other documented registration route**
("其他所有者直接调用 `ctx.typert.register(contribution)`", `dsh-typert-registry/README.zh.md:44`), and
the registry's own `register()` validates a much smaller, fully readable contract:

```
register(contribution)            lib/index.js:398-418
├─ validatePackage(contribution)   :477-489
│    validateSegment("package name", contribution.package)     // nonempty, no '#'
│    face === "host" || face === "client"                      // REQUIRED
│    model: contribution.model                                 // optional — passed through verbatim
├─ validateSchemas(contribution)   :490-507
│    per schema: validateSegment(name); typeof create === 'function'
└─ localStore.validate(invocations) → validateInvocation per descriptor   :522-561
     validateNonempty("invocation id", d.id)
     validateSegment("invocation service key", d.service)      // nonempty, no '#'
     validateWireName("invocation namespace" | "method" | "implementation method")
     validateCodec(d.result)
     per parameter: validateWireName(name); validateWireName(wire);
                    wire fields unique;
                    source==='lookup' ⇒ has lookup key, no acceptsUndefined;
                    source!=='lookup' ⇒ must NOT declare lookup;
                    validateCodec(parameter.codec)
     cancellation !== undefined ⇒ cancellation.parameter === "signal"
     mode !== undefined ⇒ mode === "stream"                    // so a unary op OMITS mode
     descriptor.scope !== undefined ⇒ invocation.kind === 'direct', + only-lookup-parameter rule
     invocation.kind === 'context' ⇒ context/wire/codec validations
validateCodec(codec, subject)      :562-566
     codec.mode === 'src-json' ⇒ return (nothing else checked)
     else  validateNonempty(`${subject} type symbol`, codec.typeSymbol)
           typeof codec.create === 'function'
```

That is **the whole hand-written contract** — seven rules, no TypeScript analysis, no reflection
graph. `validateSegment` is `nonempty && !includes('#')` (`:570-572`); `validateWireName` is
`/^[A-Za-z0-9_$.-]+$/` with `.` and `..` excluded (`:567-569`); `validateNonempty` is a length check
(`:573-575`).

And `validateTypertManifest()` — the validator ticket 18 could not read — **is loader-only**. The
loader README scopes it to the loader's own boundary ("`validateTypertManifest()` 是模块／文件边界",
`dsh-typert-loader/README.zh.md:69`), and its list of what a manifest must carry ("必须指名导出它的
包、携带 `host` face、持有 schema factory，并保持服务、事件、对象、成员、类型与文档记录格式正确")
is exactly the `model` reflection graph — which the **registry** treats as an optional pass-through
field (`:487`). So the direct route does not need `model`, does not need `./typert` in `exports`, and
does not inherit the loader's **"resolution and imported manifests are cached for the whole process
lifetime, so adding a `./typert` export requires a restart"** rule
(`dsh-typert-loader/README.zh.md:51`, `:116`).

### The target shape, read off the shipped artifact

`dsh-message-feedback` ships exactly this pattern, one method per file. The host face
(`lib/typert.host.js:109-190`) is a 20-line structure plus zod schema factories:

```js
export const TYPERT = {
  package: '@deepseek-ai/dsh-message-feedback',
  face: 'host',
  schemas: [],
  invocations: [
    {
      id: '@deepseek-ai/dsh-message-feedback#messageFeedback/put',
      service: 'messageFeedback',
      namespace: 'messageFeedback',
      method: 'put',
      invocation: { kind: 'direct' },
      parameters: [
        { name: 'request', wire: 'request', source: 'json',
          codec: { mode: 'strict',
                   typeSymbol: '@deepseek-ai/dsh-message-feedback/types#MessageFeedbackPutRequest',
                   create: _…_put_parameter_0$schema } },
      ],
      result: { mode: 'strict',
                typeSymbol: '@deepseek-ai/dsh-message-feedback/types#MessageFeedbackPutResult',
                create: _…_put_result$schema },
      sourceLocation: {"file":"packages/feedback/message-feedback/src/index.ts","line":167,"column":3},
    },
  ],
  model: { /* the reflection graph — the loader path's requirement */ },
}
```

The client face (`lib/typert.remote-client.js:109-188`) is the same descriptor list under
`TYPERT_REMOTE` (no `face`, no `model`). The schema factories are lazy and memoised —
`const f = () => (f.value ??= z.object({…}))` (`:5-9`) — and the generated style marks every field
`.readonly()` and wraps scalars as `z.intersection(z.string(), z.unknown())`.

Three facts that fall out of reading the generated output:

- **`sourceLocation` is not validated anywhere.** No occurrence of it in the registry, and none in
  the gateway. It is generator provenance that points at a `packages/…/src/index.ts` which is **not
  shipped**. A hand-written artifact omits it.
- **`model` is optional on the direct route** (`:487` passes `contribution.model` through with no
  check). Omitting it costs the `model`-based reflections (`getPackage`), which our plugin does not
  consume.
- **`typeSymbol` only has to be non-empty** — the gateway compares it against a *provider*'s
  `wireTypeSymbol` only for lookup/context parameters
  (`dsh-api-gateway/lib/index.js:1072`, `:1096`; `lib/types/index.js:627`, `:665`). Our single unary
  op has no lookup parameters, so the value is a label. It should still be a truthful
  `<package>/types#<TypeName>` string, because it is the only human-readable trace when a strict
  definition and its provider disagree.

### The host-side descriptors are the load-bearing half — and they are ours to register

`resolveDescriptor()` reads **`ctx.typert.local`**, i.e. the *host's* registry:

```
resolveDescriptor(namespace, method, endpoint)        dsh-api-gateway/lib/index.js:989-994
  const strict = this.ctx.typert.local.get(endpoint)
  if (strict !== undefined) return strict
  if (this.ctx.typert.local.hasSeen(endpoint))
      throw TypertGatewayError('gateway/definition-unavailable', …,
        'its strict definition was withdrawn and SRC fallback is forbidden')
  return this.resolveSrcDescriptor(…)                 // :995-1013, reflection-based fallback
```

Two consequences the spec must carry:

- **The host half must register the same descriptor itself**, via `ctx.typert.register()` or the
  loader — mounting the client contribution alone does not give the gateway a strict definition, and
  the SRC fallback (which resolves parameters by name through `ctx.reflect.props` +
  `lookup.definitions()`, `:1021-1031`) is a weaker, differently-validated path.
- **Withdrawal is a latch.** Once an endpoint has been seen as strict and withdrawn, SRC fallback is
  **forbidden** and the endpoint throws `gateway/definition-unavailable` (`:992`). The registry
  reports `hasSeen()` from its own history (`dsh-typert-registry/lib/index.js:117-119`). So an
  endpoint must not be registered and then dropped while calls can still arrive — which is what makes
  the registration's effect-scoped disposer (`:405-417`) the right ownership model, and why the spec
  should require the registration to live for the plugin fiber's whole life.

### The client half needs no extra declaration

`dsh-typert-registry` is **already injected by the gateway's own client half**
(`dsh-api-gateway/package.json` → `dsh.client.inject: ["@deepseek-ai/dsh-typert-registry",
"@deepseek-ai/dsh-client-connection"]`), so a plugin does not declare it, and resolving it directly
from the plugin bundle would hit the module-table miss
(`dsh-client-modules/lib/client.js:700-705`). The plugin declares the gateway, and the gateway
declares the registry — package rows are graph-ordered (`dsh-client-modules/lib/index.js:415-437`).
Our plugin also needs no `dsh.client.external` for the registry, unlike the shipped consumers that
declare `external: ["@deepseek-ai/dsh-api-gateway/client"]` to share the shell's gateway instance.

### Why the generator was never load-bearing

The generator's *output* is what we need, and the output is small, regular, and hand-writable — the
largest part of it is the zod schema, which the spec's op shape makes short (one string field plus a
small discriminated-union result). Pinning the generator would add a **private, unpublished source
dependency** (there is no `@deepseek-ai/dsh-typert-generator` in the installed tree), plus its own
build-time surface, to produce a file we then check in and hand-maintain anyway. The drift risk that
motivates pinning is better served by an **executable validator we own**, which is strictly stronger
than a checked-in generated file: it fails the build when the rules change, rather than when someone
forgets to re-run a generator.

## The decision

**Hand-write both artifacts. Produce no generated descriptor file, and take no generator dependency.**
Concretely, the spec must require:

1. **Two hand-written contributions from one descriptor table** — a host file registered with
   `ctx.typert.register()` and a client file mounted with `ctx.remote.$mount()` — so the descriptor
   list exists **once** and the two faces cannot disagree. This is the local equivalent of what
   `generate-dynamic.mjs` does for retrace's two channels.
2. **An executable validator that runs in `check`/CI and asserts the seven registry rules plus the
   gateway's mount rules** against the hand-written contributions before anything is mounted:
   non-empty `id`; `package`/`service` free of `#`; `namespace`/`method`/parameter `name`/`wire`
   matching `/^[A-Za-z0-9_$.-]+$/` and not `.`/`..`; unique wire fields; every codec either
   `{mode:'src-json'}` or non-empty `typeSymbol` **and** a function `create`; `result` codec present;
   unary ops declaring **no** `mode`; `cancellation.parameter === 'signal'` if declared; and — from
   `dsh-api-gateway/lib/types/client/index.js:136-157` — **no duplicate namespace/method within the
   contribution**. Read the installed package, not a copied list, so the check follows the host.
3. **A truthfulness rule for `typeSymbol`**, since nothing validates it: `<package>/types#<TypeName>`
   naming a type the spec actually defines, never an empty or placeholder string.
4. **`sourceLocation` and `model` omitted**, with a comment saying why (both are generator/loader
   concerns; `model` is optional at `dsh-typert-registry/lib/index.js:487`, and
   `sourceLocation` is validated nowhere).
5. **The host-side registration owned by the plugin fiber for its whole life**, and the withdrawal
   latch stated as a normative requirement: dropping a strict endpoint that has been seen forbids the
   SRC fallback permanently (`dsh-api-gateway/lib/index.js:992`).
6. **Schema factories lazy and memoised** (`() => (f.value ??= z.object({…}))`) and the result codec
   strict, so the host rejects unknown fields instead of silently folding a field the plugin forgot
   to declare.
7. **No `./typert` export and no loader**, therefore no restart-cache caveat
   (`dsh-typert-loader/README.zh.md:51`, `:116`) and no `model` graph to maintain. This is the option
   ticket 18 §5 left open ("The spec should name one") — named here.

## What this does not settle

- **Whether `ctx.typert.register()` is reachable from an installed bundle's host half.** The
  registry's README names it as the route for "other owners" (`:44`) and the service is
  `ctx.typert`, but no shipped *third-party* plugin was found registering directly — the shipped
  consumers use the loader via `./typert`. The pattern is documented; it is not attested by a
  third-party example. A differently-configured session could confirm it in one mount.
- **The `RemoteResult` envelope's exact generated encoding.** The result schema is synthesised from
  the TypeScript return type, so the plugin's own `RemoteResult<T>` union must be written by hand to
  match whatever the gateway produces. The shape is visible in the shipped artifact
  (`{ok:true,value}` / `{ok:false,error:{code,…}}`) but the authoritative TypeScript type was not
  read from `dsh-typert-protocol`.
- **Whether `result.create`'s schema is ever used for *decoding* on the client** — the README says
  the host validates incoming wire fields and the client converts results via an optional `decode()`
  (`dsh-api-gateway/README.zh.md:52`, `:29`). Not traced; it affects how strict the result schema must
  be.
