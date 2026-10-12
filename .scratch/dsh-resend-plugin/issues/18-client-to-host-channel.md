# 18 — How does a plugin's client half invoke its host half?

Type: research
Status: resolved — report:
[`../research/client-to-host-channel.md`](../research/client-to-host-channel.md)

**One finding is superseded.** This ticket presents the absence of `dsh-typert-generator` as a cost
that forces a choice between hand-writing and pinning. [How is the Remote descriptor artifact
produced?](19-descriptor-artifact.md) read the installed validator bodies and found the generator is
**not load-bearing**: the registry's other documented route, `ctx.typert.register(contribution)`,
enforces **seven readable rules**, and the loader's stricter `validateTypertManifest()` — the function
this ticket's §"Confidence" marks as unread — is loader-only and never runs on that route. Read 19
for the decision; everything else here stands.

**Carries an un-made decision.** This ticket is filed as `research` because its first job is factual,
but the choice it feeds — which channel the plugin is built on — is a decision, not a finding. Until
it is answered, the map's "the decision frontier is empty" is **not** true.

## Question

The rewind is host-side by construction: the client `ISession` surface exposes
`prompt` / `cancel` / `command` / `loadOlder` and **no `append`**, so it cannot write a
`surfaceOp` replacement. The client half (the action row under the message, and the inline editor)
therefore has to call into the host half over some channel. Choose that channel.

Candidates, with what is already known:

- **(a) A `@deepseek-ai/dsh-api-remotes` remote namespace.** Believed to be the mechanism the
  first-party client plugins use — that belief is **inherited from the map's frontier notes and is
  itself unverified**. Unknown: whether a third-party bundle may declare its own namespace, how it is
  declared, how the client half addresses it, and whether it needs a `dsh.client.inject` entry.
- **(b) An HTTP route registered on `webServer`.** What `dsh-retrace` does — its host `inject`
  includes `webServer` and it serves `/api/plugins/retrace/…` (`lib/http.js:2-47`, `:469-500`).
  Unknown: origin/auth posture, whether the route is reachable from the plugin's own client half, and
  what the plugin must do about a session id it does not own.
- **(c) The Cordis dynamic-plugin `host.call` bridge.** `dsh-cordis-host-runner` dispatches a client
  call to a per-plugin-run handler map: `invoke(pluginId, pluginRunId, method, args)`
  (`dsh-cordis-host-runner/lib/types/index.js:689-710`, handler registration at `:816-819`), and
  reports failures back to the agent as "the Client called host.call({method})" (`:979`).
  **Suspected not to apply**: the surrounding machinery (`resolvePlan`, `mode run|update`,
  `plugin.packages`, `pluginRunId`) is the dynamic-plugin panel's lifecycle, which may be exclusive
  to plugins authored at runtime. Establish whether an installed bundle's client half can reach it.

## What to establish

1. **Enumerate every available client→host mechanism**, with `file:line` and the declaration a
   bundle must add for each. Say which are documented for third-party bundles and which are
   first-party-internal.
2. **Decide (a) vs (b) vs (c) on evidence**, and state the losing candidates' disqualifying facts.
3. **The op surface the channel must carry.** At minimum: perform the two-event rewind
   (`compaction/prune` claim + `user/message` carrier, no `await` between), report the seq range it
   shadowed, and trigger the re-prompt. Phase 2 adds file rollback. State whether one call or several.
4. **Failure modes that the spec must require handling**: the client half calling after a session
   switch (wrong session id), a stale call after plugin reload, a call while the agent is streaming
   ([Behaviour while the agent is streaming](12-mid-stream-behaviour.md) says refuse), and the
   double-mount hazard already recorded on the map.
5. **Consequences for package structure**: `package.json` `exports`, the `dsh.client` section
   (`platform`, `immediately`, `inject`), and whether the host half can be empty.

## Why it matters

This draws the plugin's module seam and fixes its skeleton. Getting it wrong means either a
first-party-internal API that breaks on upgrade, or a hand-rolled HTTP surface that duplicates
authorization the platform already enforces — and the spec is written for another agent, so it must
name the exact declaration to write, not the general idea.

## Recommendation

Do not decide before the research reports. Default expectation: **(a)** if a third-party bundle can
declare a remote namespace at all, because it is the platform's own seam and inherits the session
transport the client half already has; otherwise **(b)**, copying `dsh-retrace`'s route shape, since
it is the one option with real-world mileage on this exact feature. Treat **(c)** as unlikely until
shown reachable.

## Sources

`PKG\dsh-api-remotes\` (namespace declaration, client addressing),
`PKG\dsh-api-session-controller\lib\client.js` (the client session surface — confirm the absence of
`append`), `PKG\dsh-cordis-host-runner\lib\` and `PKG\dsh-client-ui-cordis\lib\` (the `host.call`
bridge and whether it is dynamic-only), `PKG\dsh-host-webserver\` (route registration),
`PLG\lib\http.js` + `PLG\lib\index.js` (retrace's end-to-end route),
and the first-party authoring guidance at
`APP\node_modules\@deepseek-ai\dsh-agent-preset\skills\cordis-plugin-development\references\`
(`host-plugin.md`, `ui-plugin.md`, `practices.md`) — note that as of this writing it documents slots,
Services and Events but **no** client→host channel, which is itself a finding to confirm.

Where `PKG` = `D:\DSH Desktop\resources\app\node_modules\@deepseek-ai\`, `PLG` =
`C:\Users\Administrator\.dsh\profiles\desktop\node_modules\dsh-retrace\`, `APP` =
`D:\DSH Desktop\resources\app\`.

Report to: `.scratch/dsh-resend-plugin/research/client-to-host-channel.md`

## Answer

**(a) — a Typert Remote over the API Gateway, mounted by the plugin itself.** Not through
`dsh-api-remotes`: that package is only the *shell's* build-time list of composed namespaces, while
`ctx.remote` itself is provided by `@deepseek-ai/dsh-api-gateway/client`
(`PKG\dsh-api-gateway\README.zh.md:12`). A separate bundle mounting its own namespace has a shipped
precedent, documented as exactly that — "Mount this experimental namespace **without adding it to
stable API Remotes**" (`PKG\dsh-experimental-client-ui-voice-input\lib\client.js:5811-5836`).

- **(b) HTTP route — disqualified as the primary channel.** A unary Remote call already *is* an HTTP
  call through the Connection's shared `/api` FetchHandler with a trusted-host interceptor
  (`README.zh.md:31`); hand-rolling a route re-implements trust, validation and error envelopes the
  Gateway already owns. Keep as a fallback only.
- **(c) Cordis `host.call` — disqualified.** `invoke()` resolves handlers through the
  **dynamic-plugin** registry and rejects with `plugin-not-running` / `stale-run`
  (`PKG\dsh-cordis-host-runner\lib\types\index.js:689-710`); an installed bundle has no such
  registration.

**The cost, and it is the consequential finding:** the artifact that makes (a) work is **generated**,
and **`@deepseek-ai/dsh-typert-generator` is not shipped** (only loader / protocol / registry are; a
direct filesystem check returns False). The protocol and registry both confirm the pipeline is
build-time (`dsh-typert-protocol\README.zh.md:145`: reflection and schema "需要 Typert 构建流水线").
So the spec must choose: **hand-write descriptors and zod schema factories to the validation
contract**, or **pin the generator from the DSH source as a devDependency**. An implementing agent
cannot guess this.

Mechanism: host registers descriptors via `ctx.typert.register(contribution)`
(`dsh-typert-registry\README.zh.md:44`) or ships a `./typert` export the loader auto-discovers
(`dsh-typert-loader\README.zh.md:12`; the export key is `./typert`,
`dsh-message-feedback\package.json:25-28`); client calls `await ctx.remote.$mount(contribution)`,
which validates, registers per-fiber, and installs `remote.<namespace>` sub-Services
(`dsh-api-gateway\README.zh.md:50`). Client-side discovery does **not** exist — the loader is
host-only by design (`dsh-typert-loader\README.zh.md:114`) — which is exactly why the client half must
mount its own contribution.

**Op surface: one unary call, not several** —
`resend.apply({sessionId, targetSeq, op, text}) → RemoteResult<{carrierSeq, shadowedSeqs, resendMessageId}>`.
One call because ticket 15 makes "rewind + send" atomic to the user, and because ticket 09's two-event
pair carries a **no-`await`-between** invariant that only holds if both appends happen inside one
host-side call. Declare `signal: AbortSignal` last for cancellation (it is descriptor metadata, not a
wire argument).

**Failure rule the spec must state:** a unary call **never rejects for carrier problems** — it
resolves `RemoteResult<T>`, folding disconnection into `gateway/*` codes and answering a caller abort
with `gateway/cancelled`. Only **assembly** faults reject (arity mismatch, unmounted method, withdrawn
contribution, missing Context adapter). Discriminate with `isRemoteFailure(value)`; never wrap the call
in a bare `try/catch` that swallows local faults. A duplicate mount **throws before any method is
callable** — the double-mount hazard fails closed. A client-supplied field without a generated strict
codec fails at mount, so pass the session as a plain string and resolve it host-side. Adding `./typert`
later needs a **restart** (manifests are cached for the process lifetime).

**Package structure:** one package, `main` (host) + `./client` (browser) + `dsh.client`
(`platform: "web"`, `inject` including `@deepseek-ai/dsh-api-gateway`, `external` including
`@deepseek-ai/dsh-api-gateway/client`) — copy
`PKG\dsh-experimental-client-ui-voice-input\package.json`. **The host half can be a six-line marker**
when a bundle only needs its client loaded (that package's `lib/index.js` is exactly that), **but ours
cannot be empty** — it owns the rewind, the descriptor and the policy. A second shipped shape exists
(a bundle inserting separate host and client packages as Loader rows,
`PKG\dsh-experimental-voice-input-bundle\cordis.patch.yml:1-13`); one package is fewer moving parts.

**This closes the ticket's un-made decision**, so the map's decision frontier is now genuinely empty.
