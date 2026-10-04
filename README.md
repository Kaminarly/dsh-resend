# dsh-resend

Edit-and-resend and regenerate for DeepSeek Harness conversations: reopen a sent
user message and send the edit again, or produce an assistant reply again from
the same prompt.

**Status: the contract is live, the operation resolves, the rewind is written, and the prompt is sent.**
The package installs and loads — the Host plugin registers the Typert descriptor
table and creates the `resend` service, the Client plugin mounts the same
contribution with `ctx.remote.$mount` — so `resend.apply` is a real,
strictly-typed Remote call end to end, and **every refusal path is finished
behaviour**: for any input it answers with the correct one of the twelve codes —
an empty or unknown session, a missing or streaming agent, a target that never
existed, one that is only pending, one that was already rewound, the wrong kind
of message, a blank edit, an image-only prompt.

The range and the resend text are resolved from one covering log read, folded
with the official `foldSurface` — and a request that resolves is **written**: the
rewind is one pair of events, the audit claim (`compaction/prune`) and its
carrier (a `user/message` carrying `surfaceOp` + `sourceEventSeqs`), validated
together through the host's own replay *before* the first append, appended
adjacently, and flushed exactly once. The carrier renders nothing; the replaced
range leaves the model surface and stays in the transcript; and the audit claim
carries the **official** shadow price, so the host's own token fold subtracts the
range instead of silently overestimating it.

**The resend is live too.** After that flush the prompt is queued to the agent
with `agent.followup`, and the result envelope reports the id of the message that
was queued — that message is the only new row the user sees, because the carrier
renders nothing. `followup` is fire-and-forget and returns `undefined`, so the
one acceptance signal is `agent.status`, read immediately after the call: when
the agent did not take the prompt, the rewind **stands** and the envelope simply
omits that id. The client then renders an error row at the rewind point with a
"Send again" button, and pressing it replays the same request — the host re-sends
the prompt and performs **no** second rewind. A turn the agent accepted and which
then failed is deliberately not this plugin's to report: the agent reports it
itself, in the transcript.

The retry the button offers lives for the page load that recorded it, because the
request it replays (including an edited message's text) is client state by
construction. The client now registers an action row under user messages and
hides the rows covered by a rewind. The inline editor's “Edit in the composer”
action sends plain text through inputActions.setDraft(text) only: @ file
references and / skills or commands are shown as literal text, and must be
rebuilt from the composer trigger menu. Attachments are not copied into the
draft; choose them again in the composer.
If a future integration needs to preserve attachments, the supported upgrade
path is to supply the file objects again through createDrafts(sessionId, File[])
and pass the resulting attachment ids; this plugin does not invent or persist
those files.

The rewind removes the affected range from the model-visible surface. The
human transcript is append-origin by design and is unaffected, so this plugin
hides the affected rows itself with React-rendered CSS. This is deliberate
plugin behaviour, not a platform delete. The user can dismiss the count notice,
but its style rules remain mounted so the hidden rows cannot reappear.

The proposed “hide at most 40% of the conversation” safety valve was rejected.
A large rewind near the top of a long session is therefore visually destructive
by design; the localized count notice is the only disclosure between the user
and a mostly blank transcript. A hide-plan failure is reported in the affected
row and in the diagnostic log rather than silently leaving an inconsistent view.

## Targeted upstream

| Target | Version |
|---|---|
| DSH Desktop | `2.0.17` |
| `@deepseek-ai/dsh-*` | `0.2.0-rc.2` |
| `@deepseek-ai/cordis` | `4.0.4` |

Compatibility is decided by the **host surface**, not by semver alone: the
plugin reads the members the installed host actually exposes, and `npm run check`
fails when one of the members it currently asserts is missing or has changed
shape. The `peerDependencies` ranges in `package.json` are the enforced
mechanism DSH evaluates (with `includePrerelease`), and they are bounded; a peer
range the running runtime does not satisfy is reported by DSH as
`incompatible-version`. The table above is the generation this package was
**verified** against (and the one its dev-dependencies are pinned to); the peer
ranges are deliberately wider floors, because a range that excludes a host DSH
still runs makes the Loader skip the bundle silently.

## Layout

```
package.json            one npm package = one bundle
cordis.patch.yml        profile bundle patch layer (one Loader row)
src/                    hand-written sources
lib/                    committed build artifacts (never edit by hand)
scripts/build.mjs       rebuilds lib/ from src/ (esbuild)
scripts/check-*.mjs     the three gates
scripts/probe-profile.mjs  boots an isolated profile and verifies both halves
test/                   vitest suite
```

`lib/` is generated and committed. CI proves it is honest by running
`git diff --exit-code -- lib/` immediately after `npm run build`, which is the
only gate that catches a source change nobody rebuilt.

## Development

```
npm install
npm run check     # 1. source syntax  2. descriptor validation  3. host contract
npm run build     # rebuild lib/
npm test          # vitest suite
npm run probe     # boot an isolated profile and verify both halves (Desktop only)
```

Gates:

1. **`scripts/check-syntax.mjs`** — parses every file under `lib/` with the
   bundler's own parser. (A plain `node --check` silently validates only its
   first argument, which is why this is a walk.)
2. **`scripts/check-typert.mjs`** — drives both Typert descriptor faces through
   the **installed** `@deepseek-ai/dsh-typert-registry` validator instead of
   restating its rules, so the gate follows the host. §6.3's seven rules are
   asserted by mutation — a copy of the real contribution is broken one field at
   a time and the validator must reject it *by that rule*, with acceptance probes
   as the positive control — both registry paths are driven
   (`ctx.typert.register` for the host face, `ctx.typert.remotes.register` for
   the client face), and the two artifacts that actually *run* are read back and
   compared with the faces (`lib/index.js`'s registration, `lib/client.bundle.js`'s
   mount), because a face nobody ships proves nothing. An empty table fails:
   there is nothing to assert against, and the `--allow-empty-descriptors`
   concession the skeleton needed is gone (passing it now exits with a usage
   error).
3. **`scripts/check-host-contract.mjs`** — **skeleton**: it reads the installed
   DSH Desktop app (`app.asar` or an unpacked `resources/app`) directly and
   asserts a first set of host members in both directions; ticket 09 completes
   §12's member table and the slot-catalog entries. With no installed app it
   prints an explicit `SKIP` and exits zero, because the gate is
   Desktop-optional — which is also why it is green-but-empty on a CI runner.

`npm run probe` is the one check that cannot run without an installation: it
builds a scratch `DSH_HOME` under `.tmp/`, installs this package into a `probe`
profile, boots the shipped launcher on an OS-assigned port, and asserts that the
host audit stayed silent (nothing left pending), that the served Web boot graph
lists the client row, and that the served bundle self-registers. It never touches
your real `$DSH_HOME`, and it prints `SKIP` when no app is installed.

Set `DSH_APP_ROOT` to point the gates (and the probe) at a specific installation:
either an unpacked `resources/app` directory or an `app.asar` path.

`zod` is the package's one runtime dependency: the descriptor's strict codecs are
zod schemas, which is what the Typert contract asks a `create()` factory for. They
are written in `zod/mini` — the same zod core with a functional spelling — because
both faces derive from one shared table and whatever builds those schemas is
therefore bundled into the browser script; the classic entry would put ~750 KB of
zod into `lib/client.bundle.js` for functions the client never calls (spec §16.5).

`@deepseek-ai/dsh-api-gateway` is a devDependency, not a peer: the shipped code
never imports it (the client half reaches it through `ctx.remote`, and
`dsh.client.inject` only orders its arrival). It is pinned so the descriptor
specs drive the real consumer — mount, dispatch, envelope — in CI, rather than
only on a machine with an installed app.

`@deepseek-ai/dsh-util-crypto` is a peer **and** a devDependency: the shipped
host half imports its `randomUUID` to mint the marker ids the carrier and the
resend message are identified by, because the id is the only place a plugin can
put marker identity (spec §5.4). It is the module the host's own packages mint
messages with, and it is why this package never calls `crypto.randomUUID`
directly — that Web API is missing outside a secure context, which the module's
own documentation records.

`@deepseek-ai/dsh-token-meter` is a devDependency only, and deliberately not a
peer: the shipped code never imports it. It resolves the meter through
`ctx.get('tokenMeter')` and takes the **official** estimator off the service
(spec §5.3), so the audit claim's price is the number the host's own fold
subtracts. The suite imports the same package's estimator to check that price
independently, and a missing estimator makes the suite throw rather than skip.

`react-dom` and `jsdom` are devDependencies only, and no shipped artifact imports
either: they are the DOM the client-half suite renders into. The claim they exist
for — a render throw inside one registered surface becomes that surface's own
failure row while everything else keeps rendering — can only be answered where
React's boundary semantics actually run, and neither server renderer can answer
it (the legacy one propagates the throw, the streaming one makes a throw during
the shell fatal). `react` itself is a peer instead, because the page provides
exactly one instance through the module table: a second copy in the bundle is the
classic hooks failure, not a test detail.

`node-addon-require-builtin` is a devDependency with no import anywhere in this
package: it is cordis's optional peer, and its presence is what lets the Loader
resolve a bare package name from a base URL the way a profile boot does. The
boot suite asserts that path is available rather than faking it.

## Installing into a profile

```
dsh plugin --profile <name> add dsh-resend
```

Restart DSH Desktop (or the `dsh` process) afterwards.
