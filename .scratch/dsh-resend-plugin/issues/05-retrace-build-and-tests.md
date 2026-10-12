# 05 — `dsh-retrace`'s build tooling and tests (from GitHub, not the npm tarball)

Type: research
Status: resolved — report:
[`../research/retrace-build-and-tests.md`](../research/retrace-build-and-tests.md)

## Question

The npm tarball of `dsh-retrace@0.4.32` ships only `lib/**`, `cordis.patch.yml`, READMEs and
`HUMANS.txt` (`package.json` `files`). Its `scripts/` and `test/` directories are excluded, so its
build pipeline and — more importantly — **how it tests the dangerous boundaries** are unverifiable
locally. Read them from the source repository: <https://github.com/yamingmou/dsh-retrace>.

Answer:

1. `scripts/build-client.mjs`, `scripts/generate-dynamic.mjs`, `scripts/check-*.mjs` — what does its
   build actually emit, and why does it need `generate-dynamic`? Explain the difference between
   `lib/client.js` and `lib/client.bundle.js` and the role of `dynamic-client.js` /
   `dynamic-host.js`.
2. `scripts/check-host-contract.mjs` — what contract does it assert against the host? This is
   evidence about which upstream surfaces it considers load-bearing.
3. `test/` — what does it test, and **how does it test the session-log rewrites**? Does it build real
   sessions and assert on the resulting log, mock `session.append`, or something else? Capture any
   fixture or harness pattern worth reusing in our spec's acceptance criteria.
4. Its documented verification/CI gates, and whether it pins upstream versions (its README suggests
   pinning `dsh-retrace@0.4.32` exactly).

## Why it matters

Our spec needs acceptance criteria for a mechanism whose failure mode is **hard session load
failure**, not a cosmetic bug. Whatever retrace does to gain confidence is the best available
starting point.

## Sources

GitHub only — the tarball lacks these files. Use `web_fetch` on raw.githubusercontent.com. If the
network is unavailable, say so plainly and stop rather than reconstructing from the tarball.

Report to: `.scratch/dsh-resend-plugin/research/retrace-build-and-tests.md`

## Answer

Read from GitHub `main` (tree `0974091`), whose `package.json` version is **0.4.32** — the same as
the installed tarball, so the source repository and the shipped build agree. The network was
available; nothing is reconstructed from the tarball.

1. **The build emits one client implementation through three wrappers.** `lib/client.js` is the
   source; `lib/client.bundle.js` is it esbuild-bundled (`format:'cjs'`, `external:['react']`,
   `target:['es2020']`) and wrapped in a self-registering
   `window.__ModuleLoader__.load({id:"dsh-retrace", factory})` for `exports["./client"]`;
   `lib/dynamic-{client,host}.js` are the **dynamic-plugin channel** — bare function bodies ending
   in `return { inject, apply }` that inline the same sources (import/export lines stripped, one
   flat scope, dependency-ordered) and swap only the transport via an injected
   `__setMessageEditorWire`. `generate-dynamic` exists because DSH has **two plugin distribution
   channels with incompatible file shapes** for one source of truth; both dynamic files are
   committed, and `check-dynamic` compiles them with `new vm.Script` because `node --check` cannot
   parse them. `check-syntax` uses esbuild's `transform` because `node --check a.js b.js` validates
   **only its first argument**.
2. **`check-host-contract.mjs` is a 74-assertion declarative table (60 `present` + 14 `absent`)**
   read straight out of the installed `app.asar` with a 30-line built-in asar reader. The `absent`
   half is a **resurrection alarm** — `Session.events` (twice), `SessionStore.values()/keys()`,
   `Session.sessionId`, and the client controller's `getTitle`/`chat`/`nodes` must stay gone. It
   covers the read API, the surface, service **names** (from `super(ctx,"X")`, *not* bundle line
   ids), every service method the plugin calls, the client slot/locale/uiConversation services, the
   client session controller, the `conversation.view` slot-catalog entry, and one **self-scan
   invariant over the plugin's own tree**. Scope markers that vanish count as **drift, not skip**.
   This is evidence that retrace treats the *host surface itself* as the contract, and it is the
   only defence it has against its documented silent-failure class ("no crash, clean logs, only a
   real user noticed").
3. **The log rewrites are tested with a fake session + the real pre-write guard + the official
   token-meter fold** — not real sessions on disk, not a mocked `append`. `helpers.makeSession()`
   mirrors the measured host class (`snapshotEvents()`/`eventAt()`, no `events`), reproduces the
   `surfaceOp.replace` splice on `surface.nodes`, and adds `dropAt(seq)` to simulate a windowed,
   sparse view. The tests then wire the **actual `dsh-log-contract` guard** as the rejecting oracle
   and import the **official** `estimateMessage`/`foldSurfaceProjection` (by file path, since the
   exports map hides them) for every price. Five invariants come out directly transcribable as
   acceptance criteria: (a) the producer must **omit** `seq` so the host assigns the real tail — the
   `seq: 0` regression produced the E2/S6/S8 triple and a refused write; (b) the audit+carrier pair
   is validated **before any append**, so a rejection leaves zero writes and no orphan audit; (c) the
   pair is the host **shadow-price protocol**, proven by folding the official projection (matching
   adjacent claim ⇒ negative delta; a lone replace ⇒ exactly zero delta; a mismatched orphan claim ⇒
   the host fold **throws**); (d) the carrier's `data` key set is **exactly** `{role,id,content,source}`
   with non-empty content and `source.kind==='model'`, the audit's data key set exactly
   `{shadowedRange,shadowedSeqs,shadowedTokenCount}` with no `surfaceOp`, `sourceEventSeqs` deduped
   with endpoints = the range's, and **`start > end` is legal** (positional order); (e) output
   assertions fail **after** the flush, input assertions fail **before** any append.
4. **Gates are `check → build → git diff --exit-code -- lib/ → test`, identical in CI and
   `publish.yml`**; `prepublishOnly` adds a metadata whitelist. Node 22 / pnpm 11.7.0. Pinning
   advice is exact-version on the plugin and a **floor** on `dsh-log-contract` — "do not rely on
   `^0.4` across a host upgrade: compatibility here is decided by the host surface, not by semver
   alone" — while the declared peer ranges are carets: the prose is the honest half.

**Consequences the spec must absorb** (detail in the report, Part 5):

- A host-contract gate is **cheap and mechanical**; require an equivalent one, both directions,
  scoped to the surfaces the spec uses.
- Test doubles must **default to the production host generation** — the `helpers.js` note records
  that a legacy-shaped fake let 38/38 pass while the feature was dead on real machines.
- **Never hand-copy a platform formula**; import the official estimator and **throw** rather than
  skip if it cannot be resolved.
- Two `surfaceOp` key shapes exist and the host does not check key *names*, only that there are
  three — so require a runtime shape probe, and use `{op:'replace', startSeq, endSeq}` as the worked
  example.
- `data` being exactly four members means marker identity lives in `data.id` and business provenance
  (`targetSeq`, original text) must be **derived or read from the log**, never carried.
- The **guard dependency question is now decidable**: `prior-art` §F.11 #4 said avoid
  `dsh-log-contract` "unless you need offline session repair", but could not see the rules. The
  rules are now enumerated and small enough to re-implement, and the dependency is a real incident
  vector (a host release stopped exporting a symbol it imported, and the **whole plugin tree** failed
  to load). Recommend re-implementing the enumerated rules and keeping the dependency out.

Not settled here: `host-contract-matcher.test.js` and the client-hide test suites were not read; the
`dsh-log-contract` rule list lives in a separate repository; and **no end-to-end "write a session to
disk, reload it, assert" harness exists in this repo** — the rewrite tests are all in-memory, so any
"does it actually load" criterion belongs to a differently configured session.