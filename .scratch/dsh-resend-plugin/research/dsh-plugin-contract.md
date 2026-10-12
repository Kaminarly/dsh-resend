# DSH plugin contract — fact-finding report

Primary source: the shipped DSH Desktop app at `D:\DSH Desktop\resources\app\` (`dsh-plugin-desktop` v2.0.15,
`package.json:2`). DSH runtime version in that build: `0.1.7-rc.2` (`package.json:125`). "Verified from code" below
means read out of shipped JS/TS/JSON; "from shipped docs" means a README/skill file shipped inside the app;
"inferred" is marked inline. No network sources were used, so nothing here is "from public docs".

**Path legend.** Every abbreviated citation resolves against two bases:

- `APP` = `D:\DSH Desktop\resources\app\`. So `package.json` → `APP\package.json`;
  `dsh-client-modules/lib/index.js` → `APP\node_modules\@deepseek-ai\dsh-client-modules\lib\index.js`;
  `cordis/src/fiber.ts` → `APP\node_modules\@deepseek-ai\cordis\src\fiber.ts`.
- `SKILL` = `APP\node_modules\@deepseek-ai\dsh-agent-preset\skills\cordis-plugin-development\`; so `SKILL.md`,
  `references/practices.md`, `references/host-plugin.md`, `references/ui-plugin.md`, `templates/decoration/client.js`
  all sit under it. `cordis-composition-reference/SKILL.md` is the sibling skill directory.
- Untruncated third-party evidence: `dsh-better-sidebar`, `dsh-retrace`, `dsh-web-fetch-enhanced`, `dshmarket`,
  `@kenz1117/dsh-ui-usage-billing`, `@michengai/dsh-archive-manager` are all directories under
  `C:\Users\Administrator\.dsh\profiles\desktop\node_modules\`; quoted fields come from their `package.json`.

## Summary

A DSH plugin is a **Cordis plugin**: a module exporting either `apply(ctx, config)` (optionally with `export const
inject` and `export const Config`) or a service class as its default export
(`.../skills/cordis-plugin-development/references/host-plugin.md:49-53`). It is not a standalone artifact format —
plugins are shipped inside an npm package that is installed into a **profile**, the on-disk composition root at
`$DSH_HOME/profiles/<name>` (`.../dsh-app-boot/README.zh.md:50`). The manifest is the package's ordinary
**`package.json`**, carrying a **`dsh`** field; the artifact that makes a package installable as a group of plugins is
called a **bundle**, declared by `dsh.bundle.patch` (`host-plugin.md:3`). A bundle may additionally declare
**`dsh.client`** plus an `exports["./client"]` browser bundle, which makes one of its rows a **client plugin** that
contributes UI to the Web page (`.../dsh-client-modules/README.zh.md:34`). So: a directory *and* an npm package — a
directory while you author it, an npm package (or a local path) once installed; the two plugin "kinds" are Host
plugins and Client plugins, which are separable halves of the same package.

## A. Identity & packaging

**Both a directory and an npm package.** Authoring is a directory the agent writes in the workspace
(`SKILL.md:8`, `:20`); installation makes it a dependency of the profile's npm project
(`C:\Users\Administrator\.dsh\profiles\desktop\package.json:4-12`).

**Manifest = `package.json`, field `dsh`.** The shared type declarations are `DshPackageManifest` / `DshManifest` /
`DshClientManifest` in `@deepseek-ai/dsh-package-manifest` (`.../dsh-package-manifest/README.zh.md:12`, `:31-43`).
That package ships **types only** — `lib/index.js` is literally `export {};` (verified). The author-facing shape,
assembled from the type doc and the shipped `dsh.client` validator:

| Field | Meaning | Source |
|---|---|---|
| `dsh.manifestVersion` | manifest format id; declared format is `1`, independent of npm version | `dsh-package-manifest/README.zh.md:52`; real use `dsh-better-sidebar/package.json` `"manifestVersion": 1` |
| `dsh.bundle.patch` | patch file path **or ordered list of paths**, relative to package root; applied as one bundle layer | `dsh-package-manifest/README.zh.md:46`; `dsh-app-boot/README.zh.md:50` |
| `dsh.client.platform` | required string; must be `"web"` to be treated as a client plugin | `dsh-client-modules/lib/index.js:65`, `:714` |
| `dsh.client.inject` | string array; **ordering only** (keeps activation ordered, entries stay importable) | `dsh-client-modules/lib/index.js:66`; `references/practices.md:35` |
| `dsh.client.external` | string array; dynamic module requests beyond the platform seed table | `dsh-client-modules/lib/index.js:67`, `:400-402` |
| `dsh.client.immediately` | boolean | `dsh-client-modules/lib/index.js:68`, `:726` |
| `dsh.profile.bundles` | profile-only: ordered bundle list | `dsh-app-boot/lib/index.js:857`, `:920`; real use `profiles\desktop\package.json:14-27` |
| `icon` | top-level path to SVG/PNG/JPEG/WebP ≤256 KiB for Plugin Manager cards | `host-plugin.md:31-45` |
| `engines.dsh` | author-declared compatible DSH version, semver range | `dsh-package-manifest/README.zh.md:53` |

`dsh.manifestVersion` and `engines.dsh` are **types only and are not enforced**; the enforced compatibility field is
`peerDependencies` (see D). A validator for `dsh.client` is real and throws on malformed input:
`dsh-client-modules/lib/index.js:61-75`.

**Discovery and loading.** Roots: the profile directory `$DSH_HOME/profiles/<name>` (`dsh-app-boot/README.zh.md:50`),
with profile packages resolved from `<profile>/node_modules` (`SKILL.md:30`). Discovery is **not** a directory scan for
manifests — bundle `package.json`s are resolved from `dsh.profile.bundles` order over the patch layers
(`dsh-app-boot/lib/index.js:473`, `:957`), and client declarations are found by scanning the **live Cordis Loader
entry list** incrementally: `dsh-client-modules/lib/index.js:114-120` ("Every cordis `internal/plugin` emission
(fiber construction/disposal) marks the fiber's entry name dirty"). Env vars: **`DSH_PROFILE`** (profile name) and
**`DSH_PROFILE_DIR`** (its directory) are set in every shell call of a profile-launched Harness and absent in a
profile-less boot (`SKILL.md:30`). The CLI entry point is `dsh plugin --profile <name> …`
(`dsh-retrace/cordis.patch.yml:8`), and `dsh --profile "$DSH_PROFILE" --dump-config` prints the composed profile
(`SKILL.md:30`).

**Runtime.** Host plugins run as **Node ESM inside the host process**, with the profile's `node_modules` on the
resolution path — no sandbox, no DSL (`host-plugin.md:1-3`; `dsh-plugin-manager/README.zh.md:31`: "已安装的 Host 代码在
宿主进程内运行，不受工作区沙箱限制"). Client plugins run as browser JS (see C). TypeScript is authoring-only; the
shipped artifact is built JS (`dsh-client-modules/README.zh.md:50`).

## B. Plugin kinds & extension points

**Kinds (DSH's own words).** Not two names for two artifacts, but one package with two faces:
- **Host plugin** — the `main`/`.` export, executed by the Cordis Loader (`host-plugin.md:47-53`).
- **Client plugin** — the `exports["./client"]` browser bundle, active only when `dsh.client.platform === "web"`
  (`dsh-client-modules/lib/index.js:714`).
- **Bundle** — a package declaring `dsh.bundle.patch` that contributes *rows*; **row** = one Loader entry
  (`id`, `name`, `config`, `disabled`, `inject`, `intercept`, `isolate`; `cordis-composition-reference/SKILL.md:18`).

**UI extension point: the slot system.** `@deepseek-ai/dsh-client-ui-slots` is the registry; `ui-renderer` implements
it (`dsh-client-ui-slots/README.zh.md:12`, `:64`). Four kinds — `single`, `list`, `keyed`, `chain`
(`dsh-client-ui-slots/README.zh.md:28`). The exact call pair, from the shipped template:

```js
// .../skills/cordis-plugin-development/templates/decoration/client.js:15-19
apply(ctx) {
  ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
    name: 'conversation.composer.dock', id: 'my-decoration', order: 5,
  }, Decoration));
}
```

`ctx.slots.inject(ownerKey, () => ctx.slots.register(...))` is the canonical form (`practices.md:36`);
registrations dispose when the owning declaration collapses. Other real API, verified by `README` + call sites:
`ctx.slots.registerFactory()`, injected `renderFactorySlot()`, `useFactorySlot(name, fallback)`, `slot.entries(name)`,
`slot.subscribe(name, cb)`, and `renderSlot` / `renderSlotChain` with a `fallback`
(`dsh-client-ui-slots/README.zh.md:32-34`; `dsh-client-ui-chat/lib/client.js:10931`, `:1770`).

Slot ids observed in shipped call sites (non-exhaustive, all evidence-backed from `dsh-client-ui-*/lib/client.js`) —
**chat/conversation**: `conversation.chat.node` (node/message-part renderer dispatch, `dsh-client-ui-chat:6711-6798`),
`conversation.chat.assistant-actions` (**per-message action row**; rendered `dsh-client-ui-chat:6523`, registered
`dsh-client-ui-message-feedback:815`), `conversation.chat.commandview`, `conversation.message.images`,
`conversation.trajectory.images`, `conversation.composer{,.bar,.dock}`, `conversation.view`, `conversation.header`,
`conversation.input.{dock,overlay,model,plan,permission,left,right,activity,attachments}`,
`conversation.session.header.{actions,utilities,corner,lineage}`, `conversation.approval.detail`,
`conversation.plan-review.actions`, `conversation.hero.{brand.mark,workspace}`; **shell/sidebar**: `shell.overlay`,
`shell.leading`, `shell.quota-notice` (chain), `sidebar.panellist`, `sidebar.brand.{mark,name}`,
`sidebar.footer.action`, `sidebar.session.row.{leading,hover}`, `sidebar.right.pane.tab{,.title}`,
`sidebar.right.tab.document.{actions,unpreviewable}`; **settings**: `settings.section`, `settings.general.item`,
`settings.models.sign-in`. The conversation slots are declared as `children` at
`dsh-client-ui-conversation:18070-18254`.

**Adding a Chat row** — the documented route for custom conversation content (`practices.md:37`): register an event
definition with `ctx.uiConversation.events.register()` and its view in the `conversation.chat.node` slot under the
definition's `kind`. The Conversation layer owns paging, Turn/Step placement, and incremental assembly.

**Host extension points** (`practices.md:16-29`, plus signatures read from shipped code):
- Tools: `ctx.tools.register(definition)` returns the exact disposer; definition must declare
  `output { schema, render, presentationMeta? }`; `run_code` is reserved
  (`dsh-tools/lib/index.js:2878-2887`). Also `ctx.tools.restrict({allow,deny})` (`:2895`) and
  `ctx.tools.guard(guard)` (`:2921`).
- Weakest→strongest ordering of mechanism, per `practices.md:10`: `restrict()` < `guard()` < waterfall listeners <
  `system-prompt/assemble`.
- Waterfall listeners: `agent/pre-step`, `agent/request`, `llm/stream`, `tools/pre-execute`, `tools/execute`,
  `tools/post-execute` (`practices.md:16`); observe outcomes on `tools/result` (`:17`).
- Prompt/context: `ctx.systemPrompt.section()`; `agent.inject()`; per-agent registration on `agent.ctx` obtained in an
  `agent/created` listener (`practices.md:18-19`).
- Session state: `ctx.sessionProjections` unit with pure sync `apply(state, event)` and `stateOf()`
  (`practices.md:26-27`).
- Skills: `ctx.skills.register(...)` for an in-memory skill, `ctx.skills.registerProvider(...)` (sync, returns a
  disposer; `runtime` is a reserved provider name) (`dsh-skill/README.zh.md:52-53`).
- **Tools vs UI are fully separable**: a tool is registered on the Host context via `ctx.tools.register`; UI is a
  React component registered on the Client context via `ctx.slots.register`. The shipped decoration template has a
  UI half and a no-op Host half (`templates/decoration/index.js` is `export function apply() {}`).

**Lifecycle / event bus.** Cordis itself. `ctx.effect(execute, label?)` runs `execute` immediately and collects its
disposers, running them in reverse on disposal or fiber unload
(`@deepseek-ai/cordis/src/fiber.ts:405-418`). The event bus is mixed onto `ctx`: `ctx.on` / `ctx.once` / `ctx.off` /
`ctx.emit` / `ctx.bail` / `ctx.waterfall` (`cordis/src/events.ts:194`, `:217`, `:234`, `:288`, `:312`). Dependency
declaration is `export const inject = [...]` or `ctx.inject([...], cb)` (`registry.ts:300`; `host-plugin.md:51`;
`practices.md:20`). `ctx.provide(name, value, check?)` (`reflect.ts:277`), `ctx.get(name)` (`reflect.ts:233`).
Fiber states are `PENDING | LOADING | ACTIVE | FAILED | DISPOSED | UNLOADING`
(`cordis/src/fiber.ts:147-154`), surfaced to the UI as `pending | loading | active | failed | unloading | null`
(`dsh-host-plugin-inventory/README.zh.md:32`).

## C. Building & loading a client plugin

**Expected artifact.** One browser script that registers a **lazy CJS factory** via a global queue facade, then
exports a Cordis plugin with `inject`/`apply`:

```js
window.__ModuleLoader__.load({
  id: '@local/my-decoration',          // id MUST equal the package name
  factory(require) {
    const React = require('react');
    return { inject: ['slots'], apply(ctx) { ctx.slots.inject(...) } };
  },
});
```
(`templates/decoration/client.js:1-22`.) The facade's real implementation is
`dsh-client-modules/lib/index.js:455-474` (`mode:"queue"`, `load()`, `create()`). Executing a bundle **only**
registers the factory; module-body side effects including CSS injection live inside the factory closure and run at
materialization (`dsh-client-modules/lib/index.js:16-23`).

**Path.** Whatever `package.json` `exports["./client"]` points at, resolved as
`join(dirname(pkgJsonPath), clientRel)` (`dsh-client-modules/lib/index.js:170-180`, `:718-723`). Real third-party
examples: `dsh-retrace` → `./lib/client.bundle.js`, `@kenz1117/dsh-ui-usage-billing` → `./lib/client.js`,
`dshmarket` → `./client/client.js`. **No `lib/client.js` path is hardcoded anywhere in shipped Node code** (grep for
`lib/client.js` over `@deepseek-ai/**/*.js` returns nothing); the README's `lib/client.js` wording
(`dsh-client-modules/README.zh.md:50`) names the convention, not a fixed contract.

**Build tooling.** `tsdown` is the dominant choice, with a `watch` script: `"bundle": "tsdown"`,
`"watch": "tsdown --watch"` (`dsh-better-sidebar`, `@kenz1117/dsh-ui-usage-billing`, `dsh-web-fetch-enhanced`,
`dshmarket`). `esbuild` is used by `dsh-retrace` and by `@michengai/dsh-archive-manager` (devDependencies).
tsdown's code-splitting maps `import()` to `require.async("./client.<name>.js")`, served at a versioned
`/plugins/<package>/client.<name>.js?rev=<rev>` sibling URL (`dsh-client-modules/README.zh.md:38`, `:74`).

**Install location.** `<profile>/node_modules/<pkg>`, plus the package name added to `dsh.profile.bundles` in the
profile `package.json` and (usually) an `insert` row in the bundle's `cordis.patch.yml`
(`dsh-retrace/cordis.patch.yml:20-24`; real profile `profiles\desktop\package.json:13-31`).

**Dev loop / HMR.** The receiver is `@deepseek-ai/dsh-client-hmr` (v0.1.7-rc.2). Transport: the host half stat-polls
every graph row's client bundle and serves an SSE channel at the constant endpoint **`/plugins/events`**, broadcasting
`graph` and `rebuilt` frames (`dsh-client-hmr/lib/index.js:4-14`, `:21-22`, `:79-90`). Config is a single field,
`pollIntervalMs`, default `500` (`:22`). Change detection is `mtimeMs` + `ctimeMs` + `size` — the bundle content is
not hashed (`:27-39`; `dsh-client-modules/README.zh.md:74`). On a `rebuilt` frame the browser invalidates the old
module, prefetches the single-resource script, tears down the old fiber, then remounts via `entry.refresh()`
(`dsh-client-hmr/README.zh.md:66`). Trigger: run `pnpm run dev:web`, which starts the host and the rebuild watcher
together; `--no-serve` attaches the watcher to a host started elsewhere (`dsh-client-hmr/README.zh.md:32`). Reload is
deliberately coarse: React state inside the reloaded plugin is lost, connection/session state survives; there is **no
rollback on failure** and react-refresh-style state preservation is explicitly excluded (`:116-118`). Electron's
install and backend-restart flows do **not** use this SSE path (`:118`).

**Runtime API surface handed to a client plugin.** `factory` receives exactly one argument: a **synchronous
`require`** (plus `require.async` for split chunks) — not an import map, not a `ctx` passed in as an argument. The
plugin itself returns `{ inject, apply }`, and `apply(ctx)` receives the **Cordis client `Context`** (`ctx.slots`,
`ctx.locale`, `ctx.effect`, `ctx.on`). Resolution order for `require`: platform seed table → memoized record → boot
graph row → registered factory → throw (`dsh-client-modules/lib/index.js:25-31`, `:68`). The **frozen platform module
table** (`PLATFORM_MODULES`) is written by the web shell as
`{ "react", "react/jsx-runtime", "react-dom", "react-dom/client", "@deepseek-ai/cordis", "@deepseek-ai/dsh-client-store", "@deepseek-ai/dsh-client-ui-slots", "@deepseek-ai/dsh-client-ui-primitives", "@deepseek-ai/dsh-client-ui-dockkit" }`
— verified in `@deepseek-ai/dsh-web-frontend/dist/assets/index-Q6zc2uHV.js` at offset ~624265. Anything else must be
declared in `dsh.client.external` (or bundled). Note: `@deepseek-ai/dsh-client-ui-dockkit` appears in that table but
is **not an installed package** in this build (verified absent from `node_modules/@deepseek-ai`).

## D. Constraints

**No code sandbox for Host plugins.** Plugin and bundle management is gated by approval instead: every
`plugin_manager` action requires `danger-full-access` or per-call approval, and on `never`/denial/cancel/unavailable
approval channel nothing executes; approval does not change the session permission mode
(`dsh-plugin-manager/README.zh.md:31`). Once installed, "已安装的 Host 代码在宿主进程内运行，不受工作区沙箱限制" —
installed Host code runs in the host process outside the workspace sandbox (`:31`). pnpm-blocked dependency build
scripts need a separate, explicit approval (`:31`, `:58`).

**Version/compat fields.** The enforced check is `peerDependencies`: every peer named `@deepseek-ai/dsh` or starting
with `@deepseek-ai/dsh-` is semver-satisfied against the running DSH version, **with prereleases participating**
(`includePrerelease: true`); `workspace:^`/`workspace:~`/`workspace:*` mean "the current runtime"
(`dsh-app-boot/lib/index.js:286-313`). Failure yields `incompatible-version` with `name`, `version`, `runtimeVersion`,
and unmet `peers` (`dsh-plugin-manager/README.zh.md:69`). Escape hatch: exact-version exemptions in the profile's own
`compatibility.json`, mapping exact `package-name@version` → exact runtime versions, requiring `acceptRisk: true`
(`PROFILE_COMPATIBILITY_FILENAME = "compatibility.json"`, `dsh-app-boot/lib/index.js:328`; CLI
`dsh plugin --profile <p> allow-version <pkg@ver> --dsh-version <runtime> --accept-risk`,
`dsh-plugin-manager/README.zh.md:69`). `dsh.manifestVersion` and `engines.dsh` are declared but **not enforced**
("当前安装器和加载器不强制检查 `dsh.manifestVersion` 或 `engines.dsh`", `dsh-package-manifest/README.zh.md:93`).
`@kenz1117/dsh-ui-usage-billing` uses a further **unverified** `dsh.compatibility` field
(`{dsh, dshReleases}`) that does not appear in the shipped manifest types.

**Other constraint facts.** Replacing an already-installed package requires a process restart to load the new
JavaScript module generation (`dsh-plugin-manager/README.zh.md:130`). A row whose client bundle is missing fails
activation loudly with a build instruction and the package/path list (`dsh-client-modules/README.zh.md:50`). Module
graph cycles are rejected at composition time (`dsh-client-modules/lib/index.js:424`), as is a row declaring its own
package in `external` (`:428`). On the UI plane: do not replace the app root or append a second application to
`document.body`, and do not read another plugin's DOM (`ui-plugin.md:13`); a throwing component blanks the slot entry
with console `slot entry crashed in '<slot>'` (`practices.md:35`). Route visible text through the Client locale service
and style with `--dsw-alias-*` theme tokens (`ui-plugin.md:13`; `practices.md:34`).

## Gaps / could not verify

1. **No public-repo check.** Network sources were not consulted; both GitHub repos and npm READMEs are unverified.
   Everything above comes from the local shipped build.
2. **`@deepseek-ai/dsh-package-manifest` ships no `.d.ts`.** `lib/index.js` is `export {};` and `lib/types/**/*.d.ts`
   is absent from this build, so the manifest table is reconstructed from `README.zh.md` plus the runtime validator —
   field *types* are inferred, field *names* are verified. A source checkout's `util/package-manifest/src/types.ts`
   would settle it.
3. **`dsh.profile.patchReload` is unexplained.** It appears in the live profile
   (`profiles\desktop\package.json:26`, `"patchReload": "live"`) but a full recursive search of the app's
   `node_modules` and `lib` for the literal string returns **zero** matches. It is written by third-party tooling
   (likely `dshmarket`) and is not part of any shipped DSH schema — do not rely on it.
4. **Exact `ctx.slots.register` option/type surface** (`order`, `children`, `store`, `select`, `locale`, `inject`)
   and the `SlotMap` declaration-merging type is documented but its `.d.ts` was not located; `dsh-client-ui-slots`
   ships only `lib/index.js`. Authoritative shape would come from a DSH source checkout's
   `packages/client/ui-slots/src/`.
5. **`ctx.uiConversation.events.register()` signature** is documented (`practices.md:37`) but the concrete event
   definition shape and available `kind` values were not extracted.
6. **`dsh.client.immediately` semantics** are validated (`dsh-client-modules/lib/index.js:68`) and propagated into the
   graph row (`:401`) but the consumer that acts on it was not traced; its effect on activation ordering is inferred.
7. **`dsh.client.external` vs. bundling** is a real decision but no rule was found beyond "declare non-baseline runtime
   imports in `dsh.client.external`" (`ui-plugin.md:9`) and "resolve against the frozen seed table"
   (`dsh-client-modules/README.zh.md:46`).
8. **The `plugin_manager` / `cordis_inspect_query` tools** are referenced throughout the shipped skill
   (`SKILL.md:8`, `:26`) and are the intended authoring workflow, but they are not in this agent's own tool list; their
   full parameter schemas were not read (`dsh-plugin-manager/lib/typert.host.js` and `lib/types/tools.js` exist and
   are the place to look).
9. **Cross-platform path assumptions** in the skill (`SKILL.md:34`: in Desktop the skill directory sits inside
   `app.asar`) did not apply — this build has a plain on-disk directory, and its files were read directly.