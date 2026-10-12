# 13 — Dependency and compatibility policy

Type: grilling
Status: resolved

## Question

Three related policy choices, each with a concrete precedent on this machine.

**(a) May plugin code `require` Harness Client packages** (`@deepseek-ai/dsh-client-ui-primitives`,
`dsh-client-store`, …)? First-party guidance forbids it — `practices.md:35`: *"Do not
`require('@deepseek-ai/dsh-client-ui-primitives')` or load any other Harness Client package as a
module … Write your own controls and match the host instead"*, because they change without notice and
a throwing component blanks the slot entry. But shipped third-party plugins do it anyway:
`dsh-better-sidebar` peer-depends on `dsh-client-ui-primitives`; `@kenz1117/dsh-ui-usage-billing`
requires it in its client bundle.

**(b) May the plugin hard-depend on a third-party contract package** such as `dsh-log-contract`?
`dsh-retrace` does, and its README records that when a host release removed one export it used, **the
entire plugin tree failed to load and the app would not start**. That is the strongest argument for a
soft dependency.

**(c) What compatibility and degradation rules does the spec impose?** Upstream is `0.1.7-rc.2`, a
release candidate. Every slot our plugin targets is declared by another package and can be renamed or
removed. Note `ctx.slots.inject(key, cb)` already defers registration until a declaration exists, so
"declare-absent → stay unmounted" is nearly free.

Related: `export const inject` must not list optional services — a permanently-pending row makes
`assertEntriesActive()` fail and **the whole renderer will not boot**. Optional services belong in
`ctx.inject([...])` child fibers.

## Why it matters

These determine the spec's risk posture far more than any UI detail. The failure modes are total:
renderer will not boot, or app will not start.

## Recommendation

**(a) Forbid.** Style with `--dsw-alias-*` theme tokens and self-authored controls only. This is the
documented rule, and it is what makes the plugin survive upstream drift.
**(b) Forbid hard dependencies.** If a contract package is used at all, it must be optional, resolved
through `inject`/`ctx.inject`, and degrading to a documented reduced-feature mode when absent.
**(c) Require per-registration-point fallbacks, exact upstream version pinning, and fail-soft
isolation** so that no failure in this plugin can prevent boot.

## Answer

The user's answers, with one revision made after the trade-off was explained.

### (a) REVISED — `require` of Harness Client packages is **allowed**

Originally recommended forbidden; the user overrode it: *"改成允许 require 宿主的客户端包，我没那么多时间重写一套控件."* Time cost of self-authoring controls is the deciding factor, and this matches what shipped third-party plugins actually do (`dsh-better-sidebar` peer-depends on `dsh-client-ui-primitives`; `@kenz1117/dsh-ui-usage-billing` requires it in its bundle).

**Precision on what this actually buys** — verified from `dsh-client-modules/lib/index.js:405-437`, whose doc says an `external` specifier is *"either the package row it names (`<pkg>/client` aliases the bare package) **or a static-table name that adds no graph edge**"*:

- **Available:** the frozen static module table — `react`, `react/jsx-runtime`, `react-dom`,
  `react-dom/client`, `@deepseek-ai/cordis`, `@deepseek-ai/dsh-client-store`,
  `@deepseek-ai/dsh-client-ui-slots`, **`@deepseek-ai/dsh-client-ui-primitives`**,
  `@deepseek-ai/dsh-client-ui-dockkit`. Primitives is the real win: buttons, icons, tooltips, code
  blocks, JSON blocks — the regenerate button and the editor's controls no longer need authoring.
- **NOT available:** the shipped chat components (`UserMessageNodeView`, `UserStyleBubble`,
  `MessageIconActions`). They live in `dsh-client-ui-chat`, and a client plugin's module face is its
  registered factory return value — the plugin shape `{inject, apply}` — **not** its internal
  components. So requiring a chat package does not hand over its views.

**Consequence for the spec, which must be stated plainly:** allowing `require` solves the *controls*
(the easy part) but **not** the *user bubble* (the hard part). Matching the shipped bubble's appearance
still requires copying its markup and CSS, and the phase-2 "the bubble itself becomes the editor" route
is still blocked — see ticket 01.

**Three cheap mitigations retained anyway**, because allowing `require` does not mean abandoning
fail-soft, and each is near-zero cost:

1. **Guard the `require`.** A missing or renamed module must degrade, not throw — wrap resolution so the
   feature switches off instead of the plugin failing to load.
2. **Wrap primitive usage in a React error boundary.** This neutralises the official rule's strongest
   objection — *"a throwing component blanks your slot entry"* — by containing a primitive's render
   failure to our own control instead of retiring the whole slot entry.
3. **Declare `peerDependencies` with a bounded range.** Per prior research this is the *enforced*
   compatibility mechanism: DSH checks it with `includePrerelease: true` and surfaces failures as
   `incompatible-version`. It is the supported way to say which upstream versions this plugin targets.

### (b) Forbid hard dependencies on third-party contract packages — UNCHANGED

If one is used at all it must be optional, resolved through `inject` / `ctx.inject([...])`, and degrade
to a documented reduced-feature mode when absent. Never list an optional service in
`export const inject` — a permanently-pending row makes `assertEntriesActive()` fail and the whole
renderer will not boot. The precedent stands: `dsh-retrace`'s hard `dsh-log-contract` dependency took
down the entire plugin tree when a host release removed one export it used.

### (c) Per-registration-point fallbacks and version pinning — UNCHANGED

Every slot registration goes through `ctx.slots.inject(key, cb)`, so a renamed or removed slot means
the entry silently never mounts — an accepted normal state, not an error. Pin the targeted upstream
version exactly and state it in the spec (DSH Desktop v2.0.15, `@deepseek-ai/dsh-*` at `0.1.7-rc.2`),
and require fail-soft isolation so no failure in this plugin can prevent boot.