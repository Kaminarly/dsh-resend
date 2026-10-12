# How does a plugin's client half invoke its host half?

Ticket: [How does a plugin's client half invoke its host half?](../issues/18-client-to-host-channel.md)
Scope: read-only. Nothing was installed, run, or modified. No session was opened.

Tags: **verified-from-code** (I read the line in the shipped artifact), **from-docs** (a normative
comment or README in a primary source says it), **inferred** (my reasoning, not directly attested).

Paths:

- `PKG` = `D:\DSH Desktop\resources\app\node_modules\@deepseek-ai\`

---

## Verdict

**Candidate (a) — but not through `dsh-api-remotes`.** The channel is a **Typert Remote over the API
Gateway**, and the plugin **mounts its own namespace**.

The fact that decides it: **`ctx.remote` is provided by `@deepseek-ai/dsh-api-gateway/client`, not by
`dsh-api-remotes`** ("Host 入口提供 `ctx.typertGateway`，`@deepseek-ai/dsh-api-gateway/client` 则提供
`ctx.remote`", `PKG\dsh-api-gateway\README.zh.md:12`, **from-docs**). `dsh-api-remotes` is only the
*shell's* build-time list of which namespaces the application composes; it is not a gate on the
mechanism.

That a separate bundle can mount its own namespace is not an inference — there is a **shipped
precedent**, documented as exactly that (`PKG\dsh-experimental-client-ui-voice-input\lib\client.js:5811-5836`,
**verified-from-code**):

```js
/**
* Mount this experimental namespace without adding it to stable API Remotes.
* @param ctx - Client runtime owning the Remote, dictionaries and slots.
* @param contribution - generated speech Remote definitions.
* @returns disposer joining UI and Remote withdrawal.
*/
async function mountVoiceInput(ctx, contribution) {
  const disposeRemote = await ctx.remote.$mount(contribution);
  ...
```

The other two candidates, both **disqualified**:

- **(b) An HTTP route on `webServer` — disqualified as the primary channel.** A unary Remote call
  already *is* an HTTP call: the Gateway registers a trusted-host interceptor on the Connection's
  shared `/api` FetchHandler and returns 404 for unclaimed endpoints
  (`PKG\dsh-api-gateway\README.zh.md:31`, **from-docs**). Hand-rolling a route means re-implementing
  the trust interceptor, the descriptor lookup, JSON validation and error envelopes that the Gateway
  already provides. Keep it only as a documented fallback if the descriptor path cannot be made to
  work.
- **(c) The Cordis `host.call` bridge — disqualified.** `invoke(pluginId, pluginRunId, method, args)`
  resolves the handler through the **dynamic-plugin registry** and rejects with `plugin-not-running` /
  `stale-run` / `method-not-found` against it (`PKG\dsh-cordis-host-runner\lib\types\index.js:689-710`,
  handler registration at `:816-819`, **verified-from-code**). The surrounding lifecycle
  (`resolvePlan`, `mode run|update`, `plugin.packages`, `pluginRunId`) is the runtime-authored plugin
  panel's. An installed bundle has no such registration, so it has nothing to call.

**The cost, stated plainly, because it is the ticket's most consequential finding.** The artifact that
makes (a) work is **generated**, and **the generator is not shipped**:

```
Get-ChildItem …\@deepseek-ai -Filter "*typert*"  →  dsh-typert-loader, dsh-typert-protocol, dsh-typert-registry
Test-Path …\@deepseek-ai\dsh-typert-generator    →  False
```

Both the protocol and the registry docs say so: the decorator keeps only "最小标记" and "参数、结果、
查找与 schema 反射**需要 Typert 构建流水线**" (`PKG\dsh-typert-protocol\README.zh.md:145`,
**from-docs**); the registry "不执行 TypeScript 分析，也不生成 schema；这些由生成器与 loader 负责"
(`PKG\dsh-typert-registry\README.zh.md:12`, **from-docs**). A plain-JavaScript bundle therefore cannot
run the pipeline. It must either **hand-write descriptors and zod schema factories to the validation
contract**, or **take the generator from the DSH source as a devDependency**. The spec must pick one
and say so; this is not a detail an implementing agent can guess.

## 1. The mechanism, end to end

**Host.** `ctx.typertGateway` (from `PKG\dsh-api-gateway`) serves the endpoints. Dispatch re-reads
"当前的描述符和 Cordis 服务" on every call (`README.zh.md:27`, **from-docs**), so:

1. The business service extends `TypertRemoteService`, or calls `bindTypertRemote()` when it already
   has a base class, and marks methods `@Remote` / `@RemoteScope` (`README.zh.md:27`).
2. Strict mode reads the invocation descriptors **from `ctx.typert.local`** (`README.zh.md:29`).
3. Registration: `PKG\dsh-typert-registry\README.zh.md:44` — "生成产物在 Loader 组合中通过 loader
   注册；**其他所有者直接调用 `ctx.typert.register(contribution)`**，并获得撤销它的同一资源释放
   函数" (**from-docs**). So the loader is a convenience, not a requirement.
4. If the loader *is* used, it auto-discovers the `./typert` export of every mounted Loader entry —
   "每个符合条件的 Loader 配置项都会把其生成的宿主侧反射与 schema factory 贡献给运行时注册表" —
   and "没有该导出的包会被**静默跳过**" (`PKG\dsh-typert-loader\README.zh.md:12`, `:49`,
   **from-docs**). The export key is `./typert`
   (`PKG\dsh-message-feedback\package.json:25-28` → `lib/typert.host.js`,
   **verified-from-code**).

**Client.** `ctx.remote.$mount(contribution)` (`PKG\dsh-api-gateway\README.zh.md:50`, **from-docs**):
"校验并注册生成的 Host-for-Client 贡献项，然后**为发起调用的 Cordis fiber** 安装具体的直接方法和
作用域方法。每个 namespace 都是可追踪的 `remote.<namespace>` 子 Service，并在最后一个方法撤回后
卸载." Implementation at `PKG\dsh-api-gateway\lib\types\client\index.js:80-135` — `validateContribution`,
then `callerCtx.typert.remotes.register(contribution)`, then per-namespace install
(**verified-from-code**).

**Transport.** Unary calls go out as `ctx.connection.rpc.call('/api', endpoint, …)` with named `args`
built to match the descriptor exactly; streams open the Gateway's `/api/remote.mux` WebSocket
(`README.zh.md:52`, `:35`). The client does **no** schema validation — "Host 会在业务调用前校验收到的
wire 字段" — which is why every client-supplied field must carry a generated strict codec
(`README.zh.md:52`, `:83`).

**Discovery direction, and it matters.** The loader is **host-side only**: "**仅宿主侧**——发现机制
只会导入宿主侧 `./typert` 产物；**在为客户端运行时添加等价的发现机制之前，需要先有独立的组合所有
者**" (`PKG\dsh-typert-loader\README.zh.md:114`, **from-docs**). There is no client-side
auto-discovery, which is precisely why the client half must mount its own contribution explicitly.

## 2. What the plugin must declare

The shipped template to copy is `@deepseek-ai/dsh-experimental-client-ui-voice-input` — a client half
that mounts its own namespace. Its `package.json` (**verified-from-code**):

```json
"exports": {
  ".": { "types": "./lib/types/index.d.ts", "default": "./lib/index.js" },
  "./client": { "types": "./lib/types/client/index.d.ts", "default": "./lib/client.js" },
  "./package.json": "./package.json"
},
"dsh": {
  "client": {
    "inject": [
      "@deepseek-ai/dsh-api-remotes",
      "@deepseek-ai/dsh-api-session-controller",
      "@deepseek-ai/dsh-client-locale",
      "@deepseek-ai/dsh-client-ui-conversation",
      "@deepseek-ai/dsh-client-ui-primitives",
      "@deepseek-ai/dsh-api-gateway",
      "@deepseek-ai/dsh-client-ui-plugin-manager"
    ],
    "platform": "web",
    "external": ["@deepseek-ai/dsh-api-gateway/client"]
  }
}
```

Three things to carry into the spec:

- **`dsh.client.inject` lists package specifiers, and ordering is the point.** The gateway entry is in
  the list so the client half does not activate before `ctx.remote` exists
  (`PKG\dsh-client-ui-message-feedback\package.json:28-39` does the same, **verified-from-code**).
- **`dsh.client.external: ["@deepseek-ai/dsh-api-gateway/client"]`** keeps the gateway client out of the
  plugin's bundle so both halves share the shell's single instance.
- **On the host face, add `./typert` to both `exports` and `files`** if taking the loader path — and
  note the loader's warning that resolution and imported manifests are **cached for the whole process
  lifetime**, so "新增 `./typert` 导出后必须重启" (`PKG\dsh-typert-loader\README.zh.md:51`, `:116`,
  **from-docs**).

**Can the host half be empty?** Mechanically yes — `dsh-experimental-client-ui-voice-input\lib\index.js`
ships a six-line marker (`function apply() {}`, **verified-from-code**) because the voice bundle inserts
it as a Loader row purely to get its client half loaded. **For our plugin it cannot be empty**: the
rewind is host-side by construction (the client `ISession` has no `append`), and the host half is what
registers the descriptor and performs the two-event write.

**A second, equally shipped package shape exists**, and the spec should acknowledge the choice: the
voice-input **bundle** (`PKG\dsh-experimental-voice-input-bundle`) declares
`dsh.bundle.patch → cordis.patch.yml` and inserts **four separate packages** as Loader rows — host,
provider, API, and client — rather than exporting a `./client` from one package
(`cordis.patch.yml:1-13`, `package.json:49-53`, **verified-from-code**). A single package with
`main` + `./client` + `dsh.client` is fewer moving parts and matches what the map already assumes.

## 3. The op surface the channel must carry

**One unary Remote method, not several.** Recommended shape, with the reasons tied to earlier tickets:

```
resend.apply({ sessionId, targetSeq, op: 'edit' | 'regenerate', text? })
  → RemoteResult<{ carrierSeq, shadowedSeqs, resendMessageId }>
```

- **One call, because the rewind and the re-send must be atomic to the user.** Ticket 15 established
  that the replacement carrier renders nothing while the rewind is invisible, so a rewind that lands
  without its re-send leaves a transcript contradicting the model. Two round-trips would make that
  state reachable by any disconnect.
- **One call, because the two-event pair has a no-`await`-between invariant** (ticket 09, from
  retrace's shadow-price protocol). Keeping both appends inside one host-side call is the only way to
  honour it across a network boundary.
- **Return the shadowed seq set.** The client needs it to hide the rows
  (ticket 15's contract). The evidence in
  [Is a replaced message actually deleted…](delete-vs-hide.md) shows the client could also read
  `event.sourceEventSeqs` off the carrier, but returning it from the same call removes a dependency on
  wire-field delivery for the feature's correctness.
- **Cancellation for free.** Declare `signal: AbortSignal` as the **last host parameter**: "signal 是
  descriptor 元数据，而不是 wire 参数" and the client gets a last optional `AbortSignal` merged with
  the contribution's mount lifetime (`README.zh.md:33`, `:52`, **from-docs**). Ticket 12's "refuse while
  streaming" is still a **host-side decision** — the signal only lets a late call be abandoned.
- Phase 2's file rollback rides the same method as a further `op`, or a sibling method in the same
  namespace; either is consistent with this seam.

## 4. Failure modes the spec must require handling

All **from-docs** (`PKG\dsh-api-gateway\README.zh.md:52`, `:54`, `:81`) unless noted:

- **A unary call never rejects for carrier problems.** It resolves `RemoteResult<T>` —
  `{ ok: true, value }` or `{ ok: false, error }` — folding disconnection into the error branch as
  `gateway/*` codes, and answering a caller abort with `gateway/cancelled`. The predicate is
  `isRemoteFailure(value)`: values it accepts carry a host code; values it rejects are **local**
  faults that should be allowed to throw. **This is the error-handling rule the spec must state**, and
  the plugin must not wrap calls in a bare `try/catch` that swallows local faults.
- **Only assembly faults still reject**: argument-count mismatch, method not mounted, contribution
  withdrawn, missing Context adapter.
- **Withdrawing the contribution aborts in-flight calls and streams**, and makes externally held method
  handles reject when called. On plugin reload mid-rewind this is exactly ticket 15's
  "fail loudly" case.
- **A duplicate mount throws before any method becomes callable** — "重复端点、命名空间冲突，以及缺少
  生成的严格 codec 的 Client 供值字段，都会在方法可调用前报错" (`README.zh.md:50`). That is the
  double-mount hazard from the map, and it fails closed rather than half-applying.
- **A client-supplied field with no strict codec fails at mount.** Consequence for the hand-written
  path: pass the session as a plain string parameter and resolve it host-side, or register a lookup;
  do **not** invent a client-supplied object shape you cannot encode.
- **The `signal` is not a wire argument** and must not be declared in the descriptor as one.
- **Adding `./typert` after the fact needs a restart**, because manifest resolution is cached
  (`PKG\dsh-typert-loader\README.zh.md:51`, `:116`). Acceptance criteria must not assume a hot-added
  export becomes live.

**Not covered by this channel, and left as-is:** ">40 %"-style policy, session ownership refusal, and
the mid-stream refusal are all host-side business decisions in our own service; the Gateway neither
knows nor enforces them.

## 5. Consequences for package structure

- The bundle keeps one package with `main` (host) + `./client` (browser) + `dsh.client`
  (`platform: "web"`, `inject` including `@deepseek-ai/dsh-api-gateway`, `external` including
  `@deepseek-ai/dsh-api-gateway/client`).
- The host half must export `./typert` (descriptor + schema factories) **or** call
  `ctx.typert.register(contribution)` directly. The direct call is the smaller surface and avoids the
  loader's restart-cache rule; the export is the conventional route and needs no code in `apply`. The
  spec should name one.
- The reseat of the module seam: the **host half owns the rewind, the descriptor and the policy**; the
  **client half owns the row, the editor and the hiding**. Nothing in this channel crosses that line,
  which is why ticket 15's hiding mechanism stays entirely client-side.

## Confidence

**High** for the verdict and §1-§2: the `ctx.remote` ownership, the self-mount precedent, the
registration API and the `./typert` / `./remote` export keys are all read from shipped manifests,
READMEs and bundles.

**High** that the generator is absent from the installed app (a direct filesystem check).

**Medium** for §3's recommended op shape — it is a design recommendation consistent with the evidence,
not a finding.

**Not established.** I did not read `validateTypertManifest()`'s body, so "a hand-written manifest that
satisfies the documented contract will be accepted" is an **inference from the documented rules**, not
a verified outcome. I also did not verify whether `dsh.client.external` is required or merely an
optimization, and I did not exercise any call at runtime — no plugin was mounted and no Remote was
invoked.
