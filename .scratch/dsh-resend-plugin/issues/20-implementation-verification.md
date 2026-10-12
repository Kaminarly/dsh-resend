# 20 — Implementation-time verification: run these seven checks, then start building

Type: task
Status: resolved
Blocked by: nothing. Do §16.6 first — it is the only check that can invalidate the planned architecture.

## Why this ticket exists

[`spec.md`](../spec.md) §16 lists seven items that a code read could not settle. They are **not
design questions** — every one already has a decided fallback, so none of them blocked writing the
spec. They are **observations**, and each one is cheapest to make before the code that depends on it
exists.

This ticket is the runnable form of §16: what to do, in what order, what each outcome means, and where
to record the answer. **§16 remains normative** — if this ticket and the spec disagree, the spec wins.

## Who can run this

A session that can **install and mount a plugin into the DSH Desktop profile and restart the app.**
That means:

- a `plugin_manager` tool, or the `dsh plugin --profile desktop add <path>` CLI;
- the ability to restart DSH Desktop (bundles are not hot-reloaded — manifest resolution is cached for
  the process lifetime);
- read access to the host log —
  `%APPDATA%\DSH Desktop\logs\host\dsh-<date>.error.log` on Windows,
  `~/Library/Application Support/DSH Desktop/logs/host/` on macOS;
- a scratch session and a live agent, for §16.2.

**Not** the session that wrote the spec: it had no `plugin_manager`, approvals were auto-rejected, and
`web_fetch` to loopback was refused.

## Run in this order

The order is not arbitrary. 16.6 decides whether the descriptor architecture in spec §6 stands at all,
so it goes first — a negative answer there changes the package shape, and finding that out after
building the rest wastes the most work. 16.7 is next for the same reason at smaller scale, and because
it is a single grep.

| # | Check | Cost | Can change |
|---|---|---|---|
| **16.6** | `ctx.typert.register()` reachable from a bundle? | one probe plugin | **the whole descriptor section** |
| **16.7** | the carrier's `source.kind` | one grep | one constant in §5.4 |
| **16.1** | `sessionPersistence.open(id, 'read')` on a live session | one probe | which log route §4.2 prefers |
| **16.2** | `agent.followup` promise semantics | one scratch call | what §9.4 can report |
| **16.3** | pair-level validator entry point | read the guard's exports | at most, less code |
| 16.4 | `RemoteResult` envelope encoding | — | **already answered** |
| 16.5 | does the result codec decode on the client? | — | **already answered** |

---

## 16.6 — Is `ctx.typert.register()` reachable from an installed bundle's host half?

**What it decides.** Spec §6 builds on the direct-registration route
(`ctx.typert.register(contribution)`), which needs no `./typert` export, no reflection `model`, and no
restart-cache caveat. If it is unreachable from a bundle, the descriptor section falls back to the
loader route and inherits all three costs.

**How.** Make a throwaway host half whose `apply` does nothing but report, then iterate. Each edit is a
reload, and a throw in `apply` fails the plugin's fiber — which is exactly why this runs first.

```js
export const inject = []            // keep it empty: this probe must not depend on anything
export function apply(ctx) {
  console.log('[probe] typert:', typeof ctx.typert)
  console.log('[probe] register:', typeof ctx.typert?.register)
  try {
    ctx.typert.register({
      package: 'dsh-resend-probe',
      face: 'host',
      schemas: [],
      invocations: [],
    })
    console.log('[probe] register OK')
  } catch (e) {
    console.log('[probe] register threw:', e?.message ?? e)
  }
}
```

Expect three lines in the host log. A throw that names a rule means the contribution shape is wrong,
not that the route is unavailable — fix the shape and re-run before concluding anything.

**Outcomes.**

| Observed | Conclusion | Action |
|---|---|---|
| `register: function`, `register OK` | the direct route works | proceed per spec §6; delete the probe |
| `typert: undefined` | the registry is not in this composition | take the loader route: add the `./typert` export and the reflection `model`, restart after adding the export, and record that the restart-cache rule now applies |
| `register` missing but `ctx.typert` present | a different registration surface exists | read `dsh-typert-registry`'s `lib/index.js` for the actual entry point before choosing |

**Record.** Write the answer into spec §16.6 (replace the check with the finding) and into the README's
compatibility section.

---

## 16.7 — The carrier's `source.kind`

**What it decides.** One constant in spec §5.4: whether the replacement carrier declares
`'cordis-host-runner'` (the honest first-party kind for a host plugin injecting a user message) or
`'model'` (the convention the shipped reference implementation uses, with production mileage).

**Already established, so do not re-derive it:**

- **No host-side consumer gates on `source.kind` for round boundaries.** Exhaustive search across
  `dsh-session`, `dsh-agent`, `dsh-agent-loop`, `dsh-session-projection` finds one host-side use, and
  it is unrelated: the agent loop's ownership test for its own runtime-context snapshots
  (`@dsh-agent-loop/lib/index.js:218-222`, `SOURCE = 'runtime-context'`).
- **The client's human-turn test is `source.kind === 'user'`**
  (`@dsh-client-ui-chat/lib/client.js:9131`, `:9208`). Both candidates pass it.
- **Rendering is not a factor.** The carrier is a `replace` event, so `isAppendSurfaceEvent` is false
  for it and no shipped message definition matches it — `input-message`'s `match` requires that
  predicate (`@dsh-client-ui-chat/lib/client.js:9199`). The trigger-label table that knows
  `'cordis-host-runner'` (`:6595-6598`) is only reachable for a row that already rendered.

**How.** One grep over the installed tree, for the literal:

```powershell
Select-String -Path "$app\node_modules\@deepseek-ai\*\lib\*.js" -Pattern 'cordis-host-runner' |
  Select-Object -ExpandProperty Path -Unique
```

**Outcomes.**

| Observed | Action |
|---|---|
| Hits only in `MessageSourceMap` declarations and the client's trigger-label table | use `'cordis-host-runner'`; record the choice |
| A hit showing it treated as a model or assistant message | use `'model'`; record why |

**Then assert it**, because the choice is only safe if the write is inert: after a rewind, the round
structure as the host computes it is unchanged, and the carrier is not classified as a model message.
That is acceptance criterion spec §13.1 #15 — write it as a test, not as a note.

---

## 16.1 — Does `sessionPersistence.open(id, 'read')` work on the *currently open* session?

**What it decides.** Which of spec §4.2's two log routes is primary. The service is **confirmed
present**: `sessionPersistence` and `sessionQuery` are both loaded by the `dsh-base` bundle
(`@dsh-base/cordis.patch.yml:130-131`, `:149-150`), which this profile composes. What is unconfirmed is
**ownership** — whether a read handle can be opened on a session that is currently open in the app.

**How.** From the host half's `apply`, against a live session id:

```js
const handle = await ctx.sessionPersistence.open(sessionId, 'read')   // catch and log
const { eventState, events } = await handle.read()
console.log('[probe] events:', events?.length, 'eventState:', eventState)
console.log('[probe] target:', events?.[targetSeq]?.type)
```

**Outcomes.**

| Observed | Action |
|---|---|
| No throw, `events[targetSeq]` is the event you expect | route (1) is primary, as spec §4.2 prefers |
| `SessionAlreadyOwnedError` | use route (2), `ctx.sessionQuery.readSession(sessionId)`, and state in the README that a live session's span comes from the replay-validated log rather than the file |
| `SESSION_QUERY_PERSISTENCE_FAILED`, or any other persistence error | the plugin MUST still refuse safely — **never** fall back to the windowed in-memory view (spec §4.2) |

**This is the check that most directly protects against the spec's central hazard**: a span computed
from a sparse view silently selects the wrong earlier message. If both routes fail, the correct
behaviour is refusal, not a fallback.

---

## 16.2 — Does `agent.followup` settle on acceptance or on completion?

**What it decides.** What spec §9.4's "rewind succeeded, resend failed" row can honestly claim. If
`followup` resolves on acceptance, a later turn failure is not observable from it and the error row
covers only immediate failures.

**How.** In a scratch session with a live, idle agent:

```js
const p = agents.get(sessionId).followup({
  content: [{ type: 'text', text: 'probe: reply with one word' }],
  source: { kind: 'user' },
})
console.log('[probe] thenable:', typeof p?.then)
console.log('[probe] status right after:', agents.get(sessionId).status)   // 'running' or 'idle'?
await p
console.log('[probe] status after await:', agents.get(sessionId).status)   // still 'running' ⇒ acceptance
```

**Outcomes.**

| Observed | Action |
|---|---|
| Status is `running` immediately after, and the promise resolved early | **acceptance** semantics. §9.4 covers immediate failures only; the agent's own failure reporting covers the rest, and the README MUST say so. Never infer success from the promise — check `status` |
| Status is `idle` after `await` | **completion** semantics. §9.4 can report a failed turn too, and the error row is the full story |

---

## 16.3 — Can the pre-write validator check the two events as a pair?

**What it decides.** Nothing about correctness. Spec §5.2 validates the pair **before** the first
append so a rejection leaves zero writes; if the guard exposes a pair-level entry point, use it and
delete the hand-rolled pre-check.

**How.** Read the guard's exported surface for an entry point taking **both** events, rather than a
single candidate envelope. The shape to look for is a phase pair: a `pre` phase and a `pair` phase
that receives the planned audit segment together with its predicted seq.

**Outcomes.**

| Observed | Action |
|---|---|
| A pair-level entry point exists | call it before appending and let it be the authority; keep the hand-rolled pre-check only for rules it does not cover |
| It does not | keep spec §5.2's explicit pre-validation — sufficient either way |

**The acceptance criterion behind this is spec §13.1 #2**: a rejected pair leaves `session.seq`
unchanged and **no** `compaction/prune` in the log. However the check is wired, that test must pass —
an orphan audit is a real defect the reference implementation shipped.

---

## 16.4 — The `RemoteResult` envelope encoding — ANSWERED

**Do not re-check this.** Read from the installed bundle: the host's strict result codec is a tagged
union, and the generated form for a `RemoteResult<T>` is exactly what you would write by hand:

```js
z.union([
  z.object({ ok: z.literal(true).readonly(),  value: <T> }),
  z.object({ ok: z.literal(false).readonly(), error: <discriminated union on `code`> }),
])
```

Evidence: `@dsh-message-feedback/lib/typert.host.js:11-33` and `:69-107` (two shipped strict result
codecs); `@dsh-api-gateway/lib/index.js:1072`, `:1096` for the only place a codec's `typeSymbol` is
compared with a provider's.

**Action:** write the result schema in that union shape, with one `error` variant per code in spec
§4.5, every field `.readonly()`, and **rejecting unknown fields**.

---

## 16.5 — Does the result codec's schema decode on the client? — ANSWERED: no

**Do not re-check this.** `@dsh-api-gateway/lib/client.js:1799-1802`:

```js
value: descriptor.result.mode === "strict" && descriptor.result.decode !== void 0
  ? descriptor.result.decode(result.value)
  : result.value
```

The generated codec carries `mode`, `typeSymbol` and `create` — **no `decode`** — so the client passes
the host's value through unchanged and the result schema never runs at runtime on the client.

**Consequences to carry into the implementation:**

- the result schema is **not** a client-side trust boundary; the validation duty is host-side;
- still write it strictly and completely — it is what the typert registry serves to tooling, and a
  wrong one is a documented lie about the wire;
- the `decode` hook is a real extension point for native byte handling; this plugin does not need it.

---

## Definition of done

1. **16.6, 16.7, 16.1, 16.2, 16.3 are each answered** with the observed output recorded — not with a
   conclusion, the raw observation.
2. **Each answer is written back into [`spec.md`](../spec.md) §16**, replacing the question with the
   finding, so the spec stops asking a question that has an answer.
3. **Any answer that contradicts the spec is raised as its own ticket** rather than absorbed quietly.
   §16.6 and §16.7 are the two that can.
4. **The probes are deleted.** No probe code ships — the only surviving artifacts are the answers and
   the acceptance tests that pin them (spec §13.1 #15 for 16.7, §13.1 #2 for 16.3).
5. **Failures are reported, not worked around.** If a check cannot be run — no live agent, no restart,
   no log access — say which one and stop; do not infer the answer from the documentation.

## Comments

## Answer

**All five runnable checks were run against the shipped host and every answer is recorded in
[`spec.md`](../spec.md) §16. Nothing here is inferred from documentation.** Two answers contradict the
spec and were raised as their own tickets rather than absorbed:
[`21-live-log-route-order.md`](21-live-log-route-order.md) (§16.1 vs §4.2) and
[`22-followup-returns-void.md`](22-followup-returns-void.md) (§16.2 vs §5.5/§9.4).

### How it was run

The ticket's precondition — install and mount a plugin into the profile, then restart the app — turned
out to be satisfiable **without touching the user's environment**:

- DSH Desktop ships its own real `dsh` launcher at
  `resources/app/node_modules/@deepseek-ai/dsh/lib/bin.js`. It refuses the `desktop` profile
  ("managed exclusively by the Electron application") but boots **any other profile** happily, and it
  provides `profileContext` itself, so the `!!js` gates in `dsh-base`'s patch activate normally.
- Setting `DSH_HOME` to a scratch directory gave a fully isolated harness home. A throwaway `probe`
  profile composed from `@deepseek-ai/dsh-base` + `@deepseek-ai/dsh-web-app` plus a local
  `dsh-resend-probe` bundle (declared as a dependency and listed in `dsh.profile.bundles`, exactly
  like a real install) reproduced the delivered composition, including the typert registry, the
  session persistence seam, the agent loop, and the invariant guards.
- The probe bundle carried two Loader rows so the same run could observe both an **uninjected** fiber
  and a properly injected one.
- Consequence: **the user's `desktop` profile was never modified and DSH Desktop was never restarted**
  — which also means the approach sidesteps this ticket's own warning about restarting a GUI that
  other sessions may be driven through.

Probes were iterated five times (`probeA`…`probeI`) as earlier attempts hit three instructive walls:
the Cordis inject guard, a `user/message` append refused without a `surfaceOp` marker, and (in the
credential-free probe profile) an isolated session whose model turn fails before producing surface
content — so later probes built their surface content directly.

### Per-check outcome

| # | Question | Answer | Spec impact |
|---|---|---|---|
| **16.6** | Is `ctx.typert.register()` reachable from a bundle? | **Yes.** `object`/`function`, `register()` accepted a contribution, `listPackages()` showed it live. | §6 stands unchanged. But the ticket's own probe (`inject: []`) **cannot** answer this — Cordis throws `cannot get property "typert" without inject` for any uninjected service read, which the ticket's decision table would have misread as "not in this composition". §3.1 now lists `typert` in the inject list. |
| **16.7** | The carrier's `source.kind` | **`'cordis-host-runner'`.** Grep: every hit is a `MessageSourceMap` declaration, a *producer* in `dsh-cordis-host-runner`, a client trigger-label `case`, or a V3-migration allowlist — no consumer anywhere. Live write: round count 1→1, `isAppendSurfaceEvent` false, role `user`. | §6/§5.4 confirmed. Bonus: the live write confirmed the **descending range** (§13.1 #6) and that the fold **splices** the carrier into the surface (§8's hide plan must key on `isAppendSurfaceEvent`). |
| **16.1** | `open(id,'read')` on a live session | **No throw — but it can silently return `{eventState:'detached', events: []}`** in the created-but-never-materialized window. `SessionAlreadyOwnedError` comes from `open(id,'write')`. And `readSession` is *not* the windowed view: it is `snapshotEvents()`, the complete dense log. Same live session, same instant, no file yet: route (1) 0 events, route (2) 6. | **Contradicts §4.2.** Ticket 21. |
| **16.2** | `followup` promise semantics | **Neither — it returns `undefined`, not a promise.** Status `running` after; no throw even on a disposed agent. Failure is observable in the log as `turn/end` with `reason.kind === 'error'`. | **Contradicts §5.5/§9.4.** Ticket 22. |
| **16.3** | Pair-level validator entry point | **No host entry point** (`validateNext` holds one pending plan and requires contiguous seq; `SessionStore.validateAppend`/`validatePair` absent; `invariants` not in this composition). The reference implementation's `pre`/`pair` phases are its own third-party guard. **But** the exported `foldSurface(events)` is a pure, read-only whole-log checker that rejected a malformed planned pair **with zero mutation** — while *not* checking the shadow-price arithmetic. | §5.2 keeps its explicit pre-check; **add** `foldSurface` over the planned pair as the official authority for the rules it covers. |
| 16.4 | `RemoteResult` encoding | Already answered (bundle read). | none |
| 16.5 | Client-side result decode | Already answered — no, client passes through. | none |

### Follow-up findings (after the original five)

Three further discrepancies surfaced while folding the decisions back into the spec. None was one of
the original seven; all are recorded where the next reader will find them.

- **§16.8 — `surfaceOp` spelling.** §2.2 claimed the host "does not check their names", so a wrong
  spelling would be accepted and fail downstream. **False**: two live appends proved v4 rejects
  `{op, start, end}` and a four-key object immediately and by name
  (`session event "user/message" carries an invalid replace surfaceOp`). The related trap is real
  though — the audit's `shadowedRange` genuinely uses `{start, end}` while `surfaceOp` uses
  `{startSeq, endSeq}`, side by side in the shipped pruner. §2.2, §5.3 and §5.4 corrected.
- **§13.1 #4 was unimplementable as written.** It told the suite to fold the **official**
  `foldSurfaceProjection`, but that function is not in `@deepseek-ai/dsh-token-meter`'s exports map —
  only `TokenMeter` is. Rewritten to assert through `sessionProjections.stateOf(session,
  'contextPressure')`, the projection that actually consumes the claim, with the two-path trap
  (`measure()` never consults a claim) named.
- **`sessionProjections.stateOf` added to §12's host-contract gate**, since §13.1 #4 now depends on it.

### Definition of done

1. ✅ Each of 16.6, 16.7, 16.1, 16.2, 16.3 answered **with the raw observation**, not a conclusion — §16
   now carries the observed values, the member-by-member enumerations, and the failure messages
   verbatim.
2. ✅ Each answer written back into [`spec.md`](../spec.md) §16 in place of the question.
3. ✅ Both contradicting answers raised as their own tickets (21, 22), each stating what is open and
   what constraints the answer must respect. Both have since been **resolved by decision** and folded
   back into §4.2 and §5.5/§9.4; §16.1 and §16.2 keep the raw observation and note the resolution.
4. ✅ Probes deleted (confined to two scratch `DSH_HOME` directories under `%TEMP%`, both removed;
   nothing was installed into the real profile). The surviving artifacts are the §16 answers, the two
   tickets, and the acceptance criteria that pin them — §13.1 #15 is now *observed*, not just
   specified, and §13.1 #6 is confirmed end to end including a cold reload.
5. ✅ No check failed to run. The one precondition that could not be met — restarting DSH Desktop
   itself — turned out not to be necessary, and the reason is recorded above.

### One thing this run changed about the ticket's own assumptions

The ticket said "a session that can install and mount a plugin into the DSH Desktop profile and restart
the app". That is **not required**. The shipped `dsh` launcher plus an alternate `DSH_HOME` is a
strictly better probe environment: no user state at risk, a GUI never restarted, and the same delivered
code paths. Any future ticket in this effort that needs a live host should use it.

