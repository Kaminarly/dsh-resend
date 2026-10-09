/**
 * A synthetic DSH app that satisfies the host contract, built FROM the contract
 * table (`scripts/host-contract.mjs`) so a fixture can never quietly be narrower
 * than what the gate asserts.
 *
 * What each declaration is written AS mirrors the installed host — those shapes
 * are what `check-host-contract.mjs --report` reads off the real app — so this
 * stands in for a real installation in the mutation probes, while the installed
 * app itself stays the authority on the table's CONTENT, which is what
 * `npm run check` proves on a Desktop machine.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { APP_MANIFEST, ENTITIES, EXPORTS, SLOT_CATALOG, packageNameOf, packageOf, scopeMarkers } from '../../scripts/host-contract.mjs'

/** Members the installed host spells as getters rather than methods. */
const GETTERS = new Set(['Session.seq', 'Session.surface', 'SurfaceManager.nodes', 'ReactLoopAgent.status', 'TypertRegistry.local'])

/** Members the installed host assigns in its constructor. */
const ASSIGNED = new Set(['UiConversation.events', 'ConversationController.input'])

/** Members the installed host bolts onto the prototype, outside the class body. */
const BOLTED = new Set(['SlotRegistry.register'])

/**
 * Every declaration shape §12 requires a reverse assertion to match, with the
 * name the gate reports it under — so a test can ask not only "did it go red" but
 * "did it recognise WHICH spelling came back".
 *
 * The set is not a sample: it is every `absent: true` spelling in
 * `scripts/host-contract.mjs`'s `MEMBER_FORMS`, inline bolt-ons and the
 * through-an-object form included, and the suite separately asserts that each
 * `reportedAs` here is a form name that table can actually report.
 */
export const RESURRECTION_SHAPES = [
  { label: 'class field', reportedAs: 'class field' },
  { label: 'getter', reportedAs: 'getter' },
  { label: 'setter', reportedAs: 'setter' },
  { label: 'method', reportedAs: 'method declaration' },
  { label: 'constructor assignment', reportedAs: 'constructor assignment' },
  { label: 'instance access', reportedAs: 'instance access' },
  { label: 'object-literal property', reportedAs: 'object-literal property' },
  { label: 'quoted object key', reportedAs: 'quoted key' },
  { label: 'key at line start', reportedAs: 'key at line start' },
  { label: 'computed class member', reportedAs: 'computed declaration' },
  { label: 'computed access', reportedAs: 'computed member' },
  { label: 'in-class bolt-on', reportedAs: 'bolt-on' },
  { label: 'prototype assignment', reportedAs: 'prototype bolt-on' },
  { label: 'prototype quoted assignment', reportedAs: 'prototype bolt-on (quoted)' },
  { label: 'Object.assign bolt-on', reportedAs: 'Object.assign(X.prototype, …)' },
  { label: 'Object.assign through an object', reportedAs: 'Object.assign(X.prototype, <unlistable object>)' },
  { label: 'Object.defineProperty bolt-on', reportedAs: 'Object.defineProperty(X.prototype, …)' },
]

/** The version the fixtures stamp on every package manifest. */
const FIXTURE_VERSION = '0.2.0-rc.2'

/**
 * One member written as one of §12's declaration shapes.
 * @param shape - a label from {@link RESURRECTION_SHAPES}.
 * @param entity - the class it belongs to.
 * @param member - the member name.
 * @returns the class-body lines, the constructor lines, and the text after the
 *   class — the three places a host can put a declaration.
 */
function asShape(shape, entity, member) {
  switch (shape) {
    case 'class field':
      return { body: [`\t${member} = []`] }
    case 'getter':
      return { body: [`\tget ${member}() {\n\t\treturn []\n\t}`] }
    case 'setter':
      return { body: [`\tset ${member}(value) {\n\t\tthis.stored = value\n\t}`] }
    case 'method':
      return { body: [`\t${member}(seq) {\n\t\treturn seq\n\t}`] }
    case 'constructor assignment':
      return { ctor: [`\t\tthis.${member} = []`] }
    case 'instance access':
      return { body: [`\tcount() {\n\t\treturn this.${member}.length\n\t}`] }
    case 'object-literal property':
      return { body: [`\tview = { ${member}: [] }`] }
    case 'quoted object key':
      return { body: [`\tview = { "${member}": [] }`] }
    case 'key at line start':
      return { body: [`\tview = {\n\t\t${member}: []\n\t}`] }
    case 'computed class member':
      return { body: [`\t["${member}"]() {\n\t\treturn []\n\t}`] }
    case 'computed access':
      return { body: [`\tread(view) {\n\t\treturn view["${member}"]\n\t}`] }
    case 'in-class bolt-on':
      return { body: [`\tlink(View) {\n\t\tObject.defineProperty(View.prototype, "${member}", { value: [] })\n\t}`] }
    case 'prototype assignment':
      return { after: [`${entity}.prototype.${member} = []`] }
    case 'prototype quoted assignment':
      return { after: [`${entity}.prototype["${member}"] = []`] }
    case 'Object.assign bolt-on':
      return { after: [`Object.assign(${entity}.prototype, { ${member}: [] })`] }
    case 'Object.assign through an object':
      return { after: ['const boltOn = { ' + member + ': [] }', `Object.assign(${entity}.prototype, boltOn)`] }
    case 'Object.defineProperty bolt-on':
      return { after: [`Object.defineProperty(${entity}.prototype, "${member}", {\n\tget() {\n\t\treturn []\n\t},\n});`] }
    default:
      throw new Error(`unknown declaration shape: ${shape}`)
  }
}

/**
 * One entity's source: its class, its service registration, and its members.
 * @param entry - an `ENTITIES` row.
 * @param options - `omit` (`"Entity.member"` set) and `add` (`"Entity.member"` →
 *   a shape from {@link RESURRECTION_SHAPES}).
 * @returns the entity's text.
 */
function entitySource(entry, { omit = new Set(), add = {} } = {}) {
  const key = (member) => `${entry.entity}.${member}`
  const bolted = entry.present.filter((member) => !omit.has(key(member)) && BOLTED.has(key(member)))
  const declared = entry.present.filter((member) => !omit.has(key(member)) && !BOLTED.has(key(member)))

  const ctor = []
  const body = []
  const after = []
  if (entry.service !== undefined) ctor.push(`\t\tsuper(ctx, "${entry.service}")`)
  for (const member of declared) {
    if (ASSIGNED.has(key(member))) ctor.push(`\t\tthis.${member} = new Registrar(ctx)`)
    else body.push(GETTERS.has(key(member)) ? `\tget ${member}() {\n\t\treturn []\n\t}` : `\t${member}${member === 'scope' ? '(id)' : '()'} {\n\t\treturn []\n\t}`)
  }
  for (const member of entry.absent) {
    const shape = add[key(member)]
    if (shape === undefined) continue
    const written = asShape(shape, entry.entity, member)
    ctor.push(...(written.ctor ?? []))
    body.push(...(written.body ?? []))
    after.push(...(written.after ?? []))
  }

  return [
    `var ${entry.entity} = class ${entry.entity} extends Service {`,
    ...(ctor.length > 0 ? ['\tconstructor(ctx) {', ...ctor, '\t}'] : []),
    ...body,
    '};',
    ...after,
    ...bolted.map((member) => `${entry.entity}.prototype.${member} = function ${member}(options) {\n\treturn options\n};`),
  ].join('\n')
}

/** The slot catalog, written the way the installed app writes it. */
function catalogSource({ omitSlots = new Set(), omitProps = new Set() } = {}) {
  const entries = SLOT_CATALOG.entries
    .filter(({ slot }) => !omitSlots.has(slot))
    .map(({ slot, kind, standardProps, ownerProps }) => {
      const lines = ['\t{', `\t\tkey: "${slot}",`, `\t\tkind: "${kind}",`]
      if (ownerProps.length > 0 && !omitProps.has(`${slot}#ownerProps`)) lines.push(`\t\townerProps: ["/** Owner currency of the entry. */ interface Owner { ${ownerProps.join(': string, ')}: string }"],`)
      if (!omitProps.has(`${slot}#standardProps`)) {
        lines.push('\t\tstandardProps: [')
        for (const prop of standardProps) if (!omitProps.has(`${slot}#${prop}`)) lines.push(`\t\t\t"${prop}: Prop",`)
        lines.push('\t\t],')
      }
      lines.push('\t\tsource: "client/contract/slots.ts:1"', '\t},')
      return lines.join('\n')
    })
  return `/** The slot catalog the client runner ships. */\nconst SLOT_CATALOG = [\n${entries.join('\n')}\n];\nexport { SLOT_CATALOG };\n`
}

/**
 * A whole installation-shaped file tree that satisfies the contract.
 * @param options - `omitMembers` (`"Entity.member"`) and `omitExports`
 *   (`"file#name"`) drop declarations; `omitMarkers` (manifest paths) and
 *   `omitFiles` (contract file paths) drop scope markers; `omitSlots`,
 *   `omitProps` (`"slot#prop"` or `"slot#standardProps"`) trim the catalog;
 *   `omitServices` renames a service registration away; `resurrect`
 *   (`"Entity.member"` → shape) writes a removed member back; `repointExports`
 *   (`specifier` → target) writes a different `exports` map for that package.
 * @returns app-relative path to text.
 */
export function hostFixture(options = {}) {
  const omitMembers = new Set(options.omitMembers ?? [])
  const omitExports = new Set(options.omitExports ?? [])
  const omitServices = new Set(options.omitServices ?? [])
  const skipped = new Set(options.omitFiles ?? [])

  const files = {}
  files[APP_MANIFEST] = JSON.stringify({ name: 'dsh-plugin-desktop', version: '9.9.9' })
  for (const marker of scopeMarkers()) {
    if ((options.omitMarkers ?? []).includes(marker)) continue
    files[marker] = JSON.stringify({ name: packageNameOf(marker), version: FIXTURE_VERSION })
  }

  // The `exports` map each package really ships, rebuilt from the table so the
  // fixture cannot claim a specifier resolves somewhere else — that agreement is
  // what `check-host-contract` asserts, and a fixture that faked it would prove
  // nothing. A package the table does not import from needs no map.
  const maps = new Map()
  for (const entry of EXPORTS) {
    const pkg = packageOf(entry.file)
    const name = packageNameOf(entry.file)
    const subpath = entry.specifier === name ? '.' : `.${entry.specifier.slice(name.length)}`
    const map = maps.get(pkg) ?? {}
    map[subpath] = `./${entry.file.slice(pkg.length + 1)}`
    maps.set(pkg, map)
  }
  for (const [pkg, map] of maps) {
    const marker = `${pkg}/package.json`
    if (files[marker] === undefined) continue
    files[marker] = JSON.stringify({ ...JSON.parse(files[marker]), exports: options.repointExports?.[pkg] ?? map })
  }

  // One file can hold several entities, and hold exported bindings too, exactly
  // as the shipped bundles do.
  const perFile = new Map()
  for (const entry of ENTITIES) perFile.set(entry.file, [...(perFile.get(entry.file) ?? []), entry])
  for (const { file } of EXPORTS) if (!perFile.has(file)) perFile.set(file, [])

  for (const [file, entries] of perFile) {
    if (skipped.has(file)) continue
    const bodies = entries.map((entry) => entitySource(entry, { omit: omitMembers, add: options.resurrect ?? {} }))
    const exports = EXPORTS.filter((entry) => entry.file === file).flatMap(({ names }) => names).filter((name) => !omitExports.has(`${file}#${name}`))
    files[file] = `/** A synthetic stand-in for ${file}. */\nclass Service {\n\tconstructor(ctx, name) {\n\t\tthis.ctx = ctx\n\t\tthis.name = name\n\t}\n}\n${exports.length > 0 ? `\n${exports.map((name) => `const ${name} = () => []`).join('\n')}\n\nexport { ${exports.join(', ')} };\n` : ''}\n${bodies.join('\n\n')}\n`
  }

  if (!skipped.has(SLOT_CATALOG.file)) {
    files[SLOT_CATALOG.file] = catalogSource({ omitSlots: new Set(options.omitSlots ?? []), omitProps: new Set(options.omitProps ?? []) })
  }

  for (const service of omitServices) {
    for (const [file, text] of Object.entries(files)) {
      files[file] = text.replace(new RegExp(`super\\(ctx, "${service}"\\)`, 'g'), 'super(ctx, "renamed-away")')
    }
  }

  return files
}

/**
 * Write an app-relative path-to-text map to disk as a tree — one writer for both
 * a fixture installation and a fixture plugin tree, so "which files count" and
 * "how they land on disk" cannot drift between the two.
 * @param dir - the directory to create the tree under.
 * @param files - app-relative path to file contents.
 * @returns `dir`, for chaining.
 */
export function writeTree(dir, files) {
  for (const [relative, content] of Object.entries(files)) {
    const target = path.join(dir, ...relative.split('/'))
    mkdirSync(path.dirname(target), { recursive: true })
    writeFileSync(target, content)
  }
  return dir
}

/**
 * Replace one verbatim span of source, or fail loudly: a mutation that quietly
 * stops matching would turn this suite's own teeth into a vacuous green.
 * @param text - the source to patch.
 * @param from - the literal span, which must be present.
 * @param to - its replacement.
 * @param what - what the patch is, for the diagnostic.
 * @returns the patched source.
 */
export function splice(text, from, to, what) {
  if (!text.includes(from)) throw new Error(`cannot patch ${what}: ${JSON.stringify(from)} is not in it any more`)
  return text.replace(from, to)
}
