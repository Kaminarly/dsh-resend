/**
 * Spec §12's host contract, as data: every host member this plugin reads, the
 * entity inside the installed app that declares it, and the reverse assertions
 * that must stay red.
 *
 * The unit of assertion is the ENTITY, not the file. A shipped bundle declares
 * hundreds of unrelated members, and names like `events`, `append` and `get` are
 * common words: scoped to the class that owns them, a reverse assertion stays
 * both loud — every declaration shape §12 names trips it — and true — a local
 * variable that happens to be called `events` does not. So the class declaration
 * is a SCOPE MARKER, and a marker that cannot be found is drift, not a pass.
 */

/** The installed app's own manifest: the first scope marker. */
export const APP_MANIFEST = 'package.json'

/**
 * Members the plugin reads, grouped by declaring entity.
 *
 * `service` is the Cordis name the host registers that entity under (§3.1): the
 * plugin injects the name, so a renamed service breaks the half even when every
 * member still exists. `usedBy` points at the plugin source that performs the
 * read, so a red gate says which code would fail at runtime.
 */
export const ENTITIES = [
  {
    entity: 'SettingsForms',
    file: 'node_modules/@deepseek-ai/dsh-settings/lib/types/index.js',
    service: 'settings', usedBy: 'src/index.js — live Profile preferences and page policy',
    present: ['configure', 'describe', 'mutate'], absent: [],
  },
  {
    entity: 'ConfigEditor',
    file: 'node_modules/@deepseek-ai/dsh-config-editor/lib/index.js',
    service: 'configEditor', usedBy: 'saved preferences integration — Profile patch and live reconciliation',
    present: ['documentPath', 'edit'], absent: [],
  },
  {
    entity: 'ConfigForms',
    file: 'node_modules/@deepseek-ai/dsh-client-ui-settings/lib/client.js',
    service: 'configForms', usedBy: 'src/preferences.js — shared saved configuration',
    present: ['get', 'describe'], absent: [],
  },
  {
    entity: 'ConfigFormController',
    file: 'node_modules/@deepseek-ai/dsh-client-ui-settings/lib/client.js',
    usedBy: 'src/preferences.js — Host write and persistence mode',
    present: ['getSnapshot', 'set'], absent: [],
  },
  {
    entity: 'SettingsDescribeMirror',
    file: 'node_modules/@deepseek-ai/dsh-client-ui-settings/lib/client.js',
    usedBy: 'src/preferences.js — read status, retry and document subscription',
    present: ['getSnapshot', 'subscribe', 'load', 'ensure'], absent: [],
  },
  {
    entity: 'Session',
    file: 'node_modules/@deepseek-ai/dsh-session/lib/index.js',
    usedBy: 'src/log-read.js, src/write.js, src/resend.js, src/file-versions.js',
    present: ['snapshotEvents', 'eventAt', 'append', 'seq', 'surface', 'header'],
    // §12's resurrection alarm: the legacy event view was removed upstream and
    // every read goes through the snapshot / `eventAt` accessors.
    absent: ['events'],
  },
  {
    entity: 'SurfaceManager',
    file: 'node_modules/@deepseek-ai/dsh-session/lib/index.js',
    usedBy: 'src/resend.js — `session.surface.nodes`',
    present: ['nodes'],
    absent: [],
  },
  {
    entity: 'SessionStore',
    file: 'node_modules/@deepseek-ai/dsh-session/lib/index.js',
    service: 'sessions',
    usedBy: 'src/resend.js (`sessions.get`), src/write.js (`sessions.flush`)',
    present: ['get', 'flush'],
    absent: [],
  },
  {
    entity: 'AgentRegistry',
    file: 'node_modules/@deepseek-ai/dsh-agent/lib/index.js',
    service: 'agents',
    usedBy: 'src/resend.js — `agents.get(sessionId)`',
    present: ['get'],
    absent: [],
  },
  {
    // `agents.get(id)` hands back the loop's own Agent implementation: this is
    // the class whose `status` the acceptance check reads (§5.5, §16.2).
    entity: 'ReactLoopAgent',
    file: 'node_modules/@deepseek-ai/dsh-agent-loop/lib/index.js',
    usedBy: 'src/resend.js — `agent.status`, `agent.followup`',
    present: ['status', 'followup'],
    absent: [],
  },
  {
    entity: 'TokenMeter',
    file: 'node_modules/@deepseek-ai/dsh-token-meter/lib/index.js',
    service: 'tokenMeter',
    usedBy: 'src/token-price.js — the official shadow price (§5.3)',
    present: ['measure', 'estimateMessage'],
    absent: [],
  },
  {
    entity: 'SessionQueryEngine',
    file: 'node_modules/@deepseek-ai/dsh-session-query/lib/index.js',
    service: 'sessionQuery',
    usedBy: 'src/log-read.js — spec §4.2 route (2)',
    present: ['readSession'],
    absent: [],
  },
  {
    // The service the plugin injects by name. Its own body declares no members
    // — it is the contract the backend implements — so this entry asserts the
    // NAME is still registered here, which is what `ctx.sessionPersistence`
    // resolving at all depends on.
    entity: 'SessionPersistence',
    file: 'node_modules/@deepseek-ai/dsh-session-persistence/lib/index.js',
    service: 'sessionPersistence',
    usedBy: 'src/log-read.js — the service is injected under this name',
    present: [],
    absent: [],
  },
  {
    // The backend that answers it. `@dsh-session-persistence` ships no `open` or
    // `stat` at all, so asserting those members against the JSONL implementation
    // is what says something about the code that actually runs.
    entity: 'JsonlSessionPersistence',
    file: 'node_modules/@deepseek-ai/dsh-session-persistence-jsonl/lib/index.js',
    usedBy: 'src/log-read.js — spec §4.2 route (1), `fileMaxSeq` only',
    present: ['open', 'stat'],
    absent: [],
  },
  {
    entity: 'SessionProjectionRegistry',
    file: 'node_modules/@deepseek-ai/dsh-session-projection/lib/index.js',
    service: 'sessionProjections',
    // The read is the SUITE's, not the shipped plugin's: §13.1 #4 observes the
    // shadow price through this projection's state, which is the only public way
    // to see the claim the host's own fold consumes (§16.3). A green gate here is
    // what says the acceptance test still measures the protocol.
    usedBy: 'test/write-pair.test.mjs — `sessionProjections.stateOf(session, "contextPressure")` (§13.1 #4)',
    present: ['stateOf'],
    absent: [],
  },
  {
    entity: 'TypertRegistry',
    file: 'node_modules/@deepseek-ai/dsh-typert-registry/lib/index.js',
    service: 'typert',
    usedBy: 'src/index.js — `ctx.typert.register`, `ctx.typert.local`',
    present: ['register', 'local'],
    absent: [],
  },
  // --- client half ----------------------------------------------------------
  {
    entity: 'SlotRegistry',
    file: 'node_modules/@deepseek-ai/dsh-client-ui-renderer/lib/client.js',
    service: 'slots',
    usedBy: 'src/client.js — `ctx.slots.inject`, `ctx.slots.register`',
    // `register` is a `SlotRegistry.prototype.register = …` bolt-on OUTSIDE the
    // class body, which is exactly why entity-qualified bolt-ons are searched
    // across the whole file rather than only inside the region.
    present: ['inject', 'register'],
    absent: [],
  },
  {
    entity: 'LocaleRuntime',
    file: 'node_modules/@deepseek-ai/dsh-client-locale/lib/client.js',
    service: 'locale',
    usedBy: 'src/client.js — `locale.register(NS, …)`, `locale.bind(NS)`; src/trace-text.js — `locale.getSnapshot().active`',
    // `getSnapshot` is the host half's read (src/trace-text.js): the carrier's
    // trace text is picked from the active locale at write time, and a member
    // that vanished would silently record the default language instead of
    // failing. It is read through `ctx.get('locale')` rather than the property,
    // because the host fiber does not inject this client-provided service.
    present: ['register', 'bind', 'getSnapshot'],
    absent: [],
  },
  {
    entity: 'UiConversation',
    file: 'node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js',
    service: 'uiConversation',
    usedBy: 'src/client.js — `uiConversation.events.register(definition)` (§7)',
    present: ['events'],
    absent: [],
  },
  {
    entity: 'ConversationEventRegistry',
    file: 'node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js',
    usedBy: 'src/client.js — the registrar this half registers Definitions with',
    present: ['register'],
    absent: [],
  },
  {
    entity: 'ConversationController',
    file: 'node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js',
    service: 'conversation',
    usedBy: 'src/client.js — `conversation.input.for(sessionScope)`',
    present: ['input'],
    absent: [],
  },
  {
    entity: 'ClientRemoteService',
    file: 'node_modules/@deepseek-ai/dsh-api-gateway/lib/client.js',
    service: 'remote',
    usedBy: 'src/client.js — `ctx.remote.$mount(TYPERT_REMOTE)` (§6.5)',
    present: ['$mount'],
    absent: [],
  },
  {
    entity: 'ClientSessions',
    file: 'node_modules/@deepseek-ai/dsh-api-session-controller/lib/client.js',
    service: 'sessions',
    usedBy: 'src/client.js — `sessions.scope(sessionId)`',
    present: ['scope'],
    // §12's second reverse assertion: the browser half owns no write and no raw
    // log (§2.4), so the client session controller must not grow the host's
    // write or event-view members. `events` is deliberately NOT listed — the
    // client session object legitimately carries a wire-event stream under that
    // name, and an alarm that can never be green is not an alarm.
    absent: ['append', 'flush', 'snapshotEvents', 'eventAt', 'followup'],
  },
  {
    entity: 'Session',
    file: 'node_modules/@deepseek-ai/dsh-api-session-controller/lib/client.js',
    usedBy: 'the client-side session object: §2.4 says it has no `append`',
    present: [],
    absent: ['append', 'flush', 'snapshotEvents', 'eventAt'],
  },
]

/**
 * The slot catalog (§7's registration facts) and the props this plugin's
 * renderers destructure out of it. A missing entry or prop is drift: the row
 * would simply never mount, which looks exactly like a feature that was never
 * built.
 */
export const SLOT_CATALOG = {
  file: 'node_modules/@deepseek-ai/dsh-cordis-client-runner/lib/client.js',
  entries: [
    {
      slot: 'conversation.chat.node',
      kind: 'keyed',
      standardProps: ['useChat', 'useConversation', 'useSession', 'useInput', 'inputActions', 'sessionId', 'useProjection'],
      ownerProps: [],
    },
    {
      slot: 'conversation.chat.assistant-actions',
      kind: 'list',
      standardProps: ['useChat', 'useConversation', 'useSession', 'useInput', 'inputActions', 'sessionId', 'useProjection'],
      ownerProps: ['messageId'],
    },
  ],
}

/**
 * The bindings this plugin imports by name from the installed packages. §12 asks
 * for every host member the plugin reads, and a renamed export breaks a half at
 * load time — loudly for the host half, silently for the browser bundle, either
 * way after an upgrade rather than before it.
 *
 * `file` is where the binding is declared, and `specifier` is the module path the
 * plugin actually writes in its `import`. Both are recorded because they can
 * disagree: the plugin imports `…/message-projections`, and only the package's
 * `exports` map says that means `lib/types/message-projections.js`. Asserting the
 * name in a file the plugin no longer resolves to would be a green gate over a
 * half that cannot load, so the gate checks the map against `file` too.
 */
export const EXPORTS = [
  {
    file: 'node_modules/@deepseek-ai/dsh-session/lib/index.js',
    specifier: '@deepseek-ai/dsh-session',
    usedBy: 'src/resolve.js, src/write.js, src/token-price.js, src/shape-probe.js',
    names: ['foldSurface', 'isAppendSurfaceEvent', 'deriveEventMessage', 'SESSION_FORMAT_VERSION'],
  },
  {
    file: 'node_modules/@deepseek-ai/dsh-session-format-catalog/lib/types/message-projections.js',
    specifier: '@deepseek-ai/dsh-session-format-catalog/message-projections',
    usedBy: 'src/resolve.js, src/write.js — the projections `foldSurface` needs',
    names: ['currentSessionMessageProjections'],
  },
  {
    file: 'node_modules/@deepseek-ai/dsh-client-ui-primitives/lib/index.js',
    specifier: '@deepseek-ai/dsh-client-ui-primitives',
    usedBy: 'src/user-actions.js, src/regenerate.js, src/rewind-row.js',
    names: ['Button', 'Tooltip', 'Switch', 'IconEditOutlineRegular', 'IconPaperPlaneOutlineRegular', 'IconCloseOutlineRegular', 'IconRefreshOutlineRegular', 'IconWarningOutlineRegular'],
  },
]

/**
 * The package directory a contract file lives in — `node_modules/@scope/name`,
 * or `node_modules/name` when the package is unscoped.
 * @param file - an app-relative path from {@link EXPORTS}, {@link ENTITIES} or
 *   {@link scopeMarkers}.
 * @returns the app-relative package directory.
 */
export function packageOf(file) {
  const parts = file.split('/')
  return parts[1].startsWith('@') ? `${parts[0]}/${parts[1]}/${parts[2]}` : `${parts[0]}/${parts[1]}`
}

/**
 * The package name a contract file belongs to, as the host's own manifest writes
 * it — `@scope/name`, or `name` for an unscoped package.
 * @param file - an app-relative path from {@link EXPORTS} or {@link ENTITIES}.
 * @returns the package name.
 */
export function packageNameOf(file) {
  return packageOf(file).split('/').slice(1).join('/')
}

/**
 * Where one `exports` specifier lands, in the form this table writes paths.
 *
 * Node resolves the specifier the plugin imports: `exports[subpath].default`,
 * falling back to `main` for the package root. Nothing here resolves a pattern
 * key (`"./src/*"`): every specifier this plugin imports is an exact key, and a
 * package that replaced one with a pattern would go red rather than be guessed
 * at, which is the safe direction.
 * @param manifest - the installed package's parsed `package.json`.
 * @param specifier - the module path the plugin imports.
 * @param packageName - the package's own name, e.g. `@deepseek-ai/dsh-session`.
 * @returns an app-relative path, or `undefined` when nothing maps there.
 */
export function exportTarget(manifest, specifier, packageName) {
  const subpath = specifier === packageName ? '.' : `.${specifier.slice(packageName.length)}`
  const value = manifest.exports?.[subpath]
  const declared = typeof value === 'string' ? value : value?.default ?? value?.import ?? value?.require
  const target = declared ?? (subpath === '.' ? manifest.main : undefined)
  return target === undefined ? undefined : target.replace(/^\.\//, '')
}

/**
 * How a member may be spelled on the host, and which direction accepts each
 * spelling.
 *
 * §12: a reverse (ABSENT) assertion over-matches rather than under-matches, and
 * every declaration shape counts — class field with an initializer, getter,
 * method, constructor assignment, object-literal property, and bolt-on
 * (`Object.assign(X.prototype, …)`, `Object.defineProperty`, computed class
 * members). The two directions still differ, deliberately:
 *
 *  - PRESENT must not accept a bare call (`x.snapshotEvents(`) or a computed
 *    access (`["snapshotEvents"]`): those are usage, and accepting them would let
 *    a removed member pass on a leftover call site.
 *  - ABSENT must not accept a plain local (`const events = …`) or prose inside a
 *    string: neither is a member, and matching them would leave the alarm
 *    permanently red — the one way this gate becomes useless.
 *
 * `scope: 'entity'` forms name the entity, so they are searched across the whole
 * file (a bolt-on lives outside the class body); `scope: 'region'` forms are
 * searched line by line inside the entity's own body.
 */
export const MEMBER_FORMS = [
  { form: 'getter', scope: 'region', spell: (n) => new RegExp(`\\bget\\s+${n}\\s*\\(`), present: true, absent: true },
  { form: 'setter', scope: 'region', spell: (n) => new RegExp(`\\bset\\s+${n}\\s*\\(`), present: true, absent: true },
  { form: 'method declaration', scope: 'region', spell: (n) => new RegExp(`^\\s*(?:async\\s+|static\\s+|\\*\\s+)*${n}\\s*\\(`), present: true, absent: true },
  { form: 'class field', scope: 'region', spell: (n) => new RegExp(`^\\s*(?:static\\s+)?${n}\\s*=[^=]`), present: true, absent: true },
  { form: 'constructor assignment', scope: 'region', spell: (n) => new RegExp(`this\\.${n}\\s*=[^=]`), present: true, absent: true },
  { form: 'instance access', scope: 'region', spell: (n) => new RegExp(`this\\.${n}\\s*[=(.]`), present: false, absent: true },
  { form: 'object-literal property', scope: 'region', spell: (n) => new RegExp(`[{,]\\s*${n}\\s*[:(]`), present: true, absent: true },
  { form: 'quoted key', scope: 'region', spell: (n) => new RegExp(`(?<!case\\s)["'\`]${n}["'\`]\\s*[:(]`), present: true, absent: true },
  // A computed class member is a declaration only when it starts a class
  // member line; the anchored form keeps PRESENT from accepting an ordinary
  // `object["name"]()` call while ABSENT still uses the broader access alarm.
  { form: 'computed declaration', scope: 'region', spell: (n) => new RegExp(`^\\s*\\[\\s*["'\`]${n}["'\`]\\s*\\]\\s*(?:\\(|=)`), present: true, absent: true },
  { form: 'computed member', scope: 'region', spell: (n) => new RegExp(`\\[\\s*["'\`]${n}["'\`]\\s*\\]`), present: false, absent: true },
  { form: 'key at line start', scope: 'region', spell: (n) => new RegExp(`^\\s+${n}\\s*:`), present: true, absent: true },
  { form: 'bolt-on', scope: 'region', spell: (n) => new RegExp(`Object\\.(?:assign|definePropert(?:y|ies))[^\\n]*["'\`]${n}["'\`]`), present: true, absent: true },
  // `\b` before the entity name in every entity-scoped form: without it,
  // `Session.prototype.append` also matches inside
  // `ClientSession.prototype.append`, and one file can hold both classes.
  { form: 'prototype bolt-on', scope: 'entity', spell: (e, n) => new RegExp(`\\b${e}\\.prototype\\.${n}\\s*[=(]`), present: true, absent: true },
  { form: 'prototype bolt-on (quoted)', scope: 'entity', spell: (e, n) => new RegExp(`\\b${e}\\.prototype\\[\\s*["'\`]${n}["'\`]`), present: true, absent: true },
  { form: 'Object.assign(X.prototype, …)', scope: 'entity', spell: (e, n) => new RegExp(`Object\\.assign\\(\\s*\\b${e}\\.prototype[\\s\\S]{0,400}?[{,]\\s*${n}\\s*[:(]`), present: true, absent: true },
  { form: 'Object.defineProperty(X.prototype, …)', scope: 'entity', spell: (e, n) => new RegExp(`Object\\.definePropert(?:y|ies)\\(\\s*\\b${e}\\.prototype[\\s\\S]{0,160}?["'\`]${n}["'\`]`), present: true, absent: true },
  // The one bolt-on no scan can see into: `Object.assign(X.prototype, methods)`
  // hands the whole member set over as an identifier, so whether a removed member
  // is in it is unknowable from here. Listed ABSENT only, and after the inline
  // form so the precise spelling wins when the literal is small enough to read:
  // for a member that must be PRESENT, accepting this would let a genuinely
  // missing declaration pass on the strength of an unrelated assignment, which is
  // the vacuous green §12 rules out. A false red is the safe direction.
  { form: 'Object.assign(X.prototype, <unlistable object>)', scope: 'entity', spell: (e) => new RegExp(`Object\\.assign\\(\\s*\\b${e}\\.prototype\\s*,`), present: false, absent: true },
]

/**
 * A table name, escaped for use inside a `RegExp`.
 *
 * Not every name here is a JavaScript identifier: a slot key is a dotted path
 * (`conversation.chat.node`), where an unescaped `.` matches any character — so a
 * mistyped or renamed slot would still satisfy the pattern meant to catch it.
 * Escape the whole metacharacter set rather than assuming a shape.
 * @param value - the name.
 * @returns the name, safe to interpolate into a pattern.
 */
export const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * The forms one member may take in one direction.
 * @param entity - the class the member belongs to.
 * @param member - member name as it appears in host source.
 * @param direction - `present` (a declaration that must still exist) or `absent`
 *   (a spelling a removed member could return through).
 * @returns `{ form, scope, pattern }` entries, in the order a match should be
 *   reported: the precise spelling before the broad one.
 */
export function memberForms(entity, member, direction) {
  const name = escapeRegex(member)
  const escaped = escapeRegex(entity)
  return MEMBER_FORMS.filter((candidate) => candidate[direction]).map(({ form, scope, spell }) => ({ form, scope, pattern: scope === 'entity' ? spell(escaped, name) : spell(name) }))
}

/**
 * Where one member's declaration sits, and which spelling it is.
 *
 * Every direction walks the same two places — the entity's own body line by
 * line, then the whole file for the bolt-ons that live outside it — so both
 * callers share this lookup rather than restating the `scope` convention.
 * @param forms - from {@link memberForms}, in reporting order.
 * @param region - the entity's `{ start, body }` from {@link entityRegion}.
 * @param text - the whole file, for the entity-scoped forms.
 * @returns `{ index, shape }` for a region hit (`index` is into `region.body`),
 *   `{ boltOnForm }` for an entity-scoped hit, or `{ boltOnForm: undefined }`
 *   when neither matches.
 */
export function locateMember(forms, region, text) {
  const index = region.body.findIndex((line) => forms.some(({ scope, pattern }) => scope === 'region' && pattern.test(line)))
  if (index !== -1) return { index, shape: forms.find(({ scope, pattern }) => scope === 'region' && pattern.test(region.body[index])) }
  return { boltOnForm: forms.find(({ scope, pattern }) => scope === 'entity' && pattern.test(text)) }
}

/**
 * A host class's own body, located by indentation.
 *
 * esbuild output is consistently indented: the declaration line and the `};` that
 * closes it share one indentation level, and nothing inside the body sits at or
 * left of it. A file that abandons that layout yields no region, and the gate
 * calls that drift rather than guessing — silently reading the rest of the file
 * would widen every assertion in it, including a reverse one.
 * @param lines - the file split on newlines.
 * @param entity - the class name to find.
 * @returns `{ start, end, body }` with 1-based inclusive bounds, or `undefined`.
 */
export function entityRegion(lines, entity) {
  const name = escapeRegex(entity)
  const declaration = new RegExp(`^\\s*(?:(?:export|default)\\s+)?(?:var|let|const)\\s+${name}\\s*=\\s*class\\b|^\\s*(?:(?:export|default)\\s+)?class\\s+${name}\\b`)
  const start = lines.findIndex((line) => declaration.test(line))
  if (start === -1) return undefined
  const indent = lines[start].match(/^\s*/)[0].length
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i]
    if (line.trim() === '') continue
    if (line.match(/^\s*/)[0].length <= indent && /^[})\]]/.test(line.trim())) return { start: start + 1, end: i + 1, body: lines.slice(start, i + 1) }
  }
  return undefined
}

/**
 * Every catalog entry for one slot. A slot declared twice is not one slot with
 * a spare — which entry governs the registration is undecided — so the caller
 * compares the count against one rather than taking the first match.
 * @param lines - the catalog file split on newlines.
 * @param slot - the slot key.
 * @returns each entry's `{ start, end, body }`, with 1-based inclusive bounds.
 */
export function catalogEntries(lines, slot) {
  const marker = new RegExp(`^\\s*key: ["']${escapeRegex(slot)}["'],?$`)
  const entries = []
  for (let start = 0; start < lines.length; start++) {
    if (!marker.test(lines[start])) continue
    const indent = lines[start].match(/^\s*/)[0].length
    for (let i = start + 1; i < lines.length; i++) {
      const line = lines[i]
      if (line.trim() === '') continue
      if (line.match(/^\s*/)[0].length < indent) {
        entries.push({ start: start + 1, end: i, body: lines.slice(start, i) })
        start = i - 1
        break
      }
    }
  }
  return entries
}

/**
 * Every app-relative file the contract reads, scope markers and catalog
 * included. Tests build installation-shaped fixtures from exactly this list, so
 * a fixture cannot silently be narrower than the contract.
 * @returns app-relative paths, deduplicated and sorted.
 */
export function contractFiles() {
  const files = new Set([APP_MANIFEST, SLOT_CATALOG.file])
  for (const entry of ENTITIES) files.add(entry.file)
  for (const entry of EXPORTS) files.add(entry.file)
  for (const marker of scopeMarkers()) files.add(marker)
  return [...files].sort()
}

/**
 * The manifest of every package the table reads from — a scope marker in §12's
 * sense: if the host no longer ships the package, nothing else here can be true.
 * @returns app-relative `package.json` paths, deduplicated and sorted.
 */
export function scopeMarkers() {
  const packages = new Set()
  for (const entry of [...ENTITIES, ...EXPORTS]) {
    if (!entry.file.startsWith('node_modules/')) continue
    packages.add(`${packageOf(entry.file)}/package.json`)
  }
  return [...packages].sort()
}

/**
 * The table entries whose emptiness would silently erase the assertions built
 * from them.
 *
 * The table is data, so an unfilled group — or a filled one whose members were
 * never listed — leaves the gate asserting nothing there while still printing
 * OK. §12's rule covers the gate's own inputs as much as the host's: a vacuously
 * green gate is worse than no gate, which is why `check-typert` deleted its
 * `--allow-empty-descriptors` concession too. The walk goes one level down for
 * the same reason: `EXPORTS[0].names` empty is as quiet as `EXPORTS` empty.
 * @param table - group name to members; defaults to the real table, and is
 *   overridable so the empty cases themselves can be tested.
 * @returns one description per entry that asserts nothing.
 */
export function emptyTableGroups(table = { entities: ENTITIES, importedBindings: EXPORTS, catalogEntries: SLOT_CATALOG.entries, scopeMarkers: scopeMarkers() }) {
  const empty = []
  if (table.entities.length === 0) empty.push('entities')
  table.entities.forEach((entry, index) => {
    // An entity that declares no member may still be the shape of a service
    // whose registration is the assertion (see SessionPersistence below).
    if (entry.present.length + entry.absent.length === 0 && entry.service === undefined) empty.push(`entities[${index}] (${entry.entity}: no member and no service)`)
  })
  if (table.importedBindings.length === 0) empty.push('importedBindings')
  table.importedBindings.forEach((entry, index) => {
    if (entry.names.length === 0) empty.push(`importedBindings[${index}] (${entry.file}: no binding name)`)
  })
  if (table.catalogEntries.length === 0) empty.push('catalogEntries')
  table.catalogEntries.forEach((entry, index) => {
    // `ownerProps` may be empty on purpose; `standardProps` may not, because
    // every renderer this plugin registers reads at least one of them.
    if (entry.standardProps.length === 0) empty.push(`catalogEntries[${index}] (${entry.slot}: no standardProp)`)
  })
  if (table.scopeMarkers.length === 0) empty.push('scopeMarkers')
  return empty
}
