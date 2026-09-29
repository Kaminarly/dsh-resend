#!/usr/bin/env node
/**
 * Gate 2/3 — descriptor validation (spec §6.4).
 *
 * The point of this gate is that it does not restate the registry's rules: it
 * *drives* the installed `@deepseek-ai/dsh-typert-registry` validator, so the
 * gate goes red when the host's rules change, not only when somebody forgets to
 * re-run a generator. §6.3's seven rules are asserted by **mutation**: a copy of
 * the real contribution is broken one field at a time, and the installed
 * validator must reject it *by the expected rule* — a mutation that is accepted,
 * or rejected for some other reason, is a failure that names the field and the
 * rule. Acceptance probes are the positive control: a gate whose only outcome is
 * "rejected" cannot tell a broken descriptor from a broken harness.
 *
 * A mutation list is not the copied rule list §6.4 warns about. The list says
 * *which field to break*; the validator still decides *whether that field is
 * legal*, and the expected message fragment is what proves the right rule — not a
 * neighbouring one — did the rejecting. Those fragments do quote the host's
 * diagnostics, which is deliberate: a host that rewords one turns this gate red
 * with the fragment it wanted, so the failure is a false red to update rather
 * than a false green to trust. The teeth are exercised in `test/gates.test.mjs`
 * against a deliberately crippled registry, where a rule that stopped being
 * enforced makes this gate name the field and the rule.
 *
 * Both registry registration paths are driven, because both run the same
 * `validateInvocation`: the Host face through `ctx.typert.register()`, the Client
 * face through `ctx.typert.remotes.register()` — which is the call the Gateway's
 * mount path makes. The mount path's extra rules live in the Gateway itself: the
 * repeated-namespace/method rule is driven there (against the real Gateway, in
 * `test/remote-contract.test.mjs`), and the "every client-supplied field needs a
 * strict codec" half is asserted structurally above, where the descriptor is.
 *
 * Validator resolution:
 *   1. the installed DSH Desktop app (an unpacked `resources/app`), so the gate
 *      validates against the registry the host actually runs;
 *   2. this package's pinned devDependency — what CI has, and what keeps the
 *      gate real without an installation.
 *
 * The faces are read from `lib/` because that is what ships, and the two
 * artifacts that *run* (`lib/index.js` registers one copy of the table,
 * `lib/client.bundle.js` mounts another) are read back and compared with them:
 * a face nobody ships proves nothing.
 *
 * Non-vacuity: an empty descriptor table fails this gate, because nothing can be
 * asserted against it. The skeleton's explicit concession
 * (`--allow-empty-descriptors`) is gone with the empty table, and a stale flag
 * left on a command line is a usage error rather than a silent pass.
 *
 * Usage: node scripts/check-typert.mjs [--faces <dir>]
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolveHostApp } from './host-app.mjs'
import { optionValue } from './args.mjs'
import { relativePath } from './walk-javascript.mjs'
import { readClientContribution, describeError } from './client-bundle.mjs'
import { ERROR_CODES as SOURCE_ERROR_CODES } from '../src/typert.js'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const argv = process.argv.slice(2)

/** The options this gate takes. Anything else on the command line is a usage error. */
const KNOWN_OPTIONS = ['--faces']
for (const [index, arg] of argv.entries()) {
  if (argv[index - 1] === '--faces') continue // the previous option's value
  if (!arg.startsWith('--') || KNOWN_OPTIONS.includes(arg)) continue
  console.error(`check-typert: FAIL — unknown option ${arg} (usage: check-typert [--faces <dir>])`)
  process.exit(2)
}

const facesDir = path.resolve(rootDir, optionValue(argv, '--faces', { bin: 'check-typert', fallback: 'lib' }))

const pkg = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8'))

/**
 * The closed error vocabulary, restated from spec §4.5 *on purpose*: this is the
 * independent expectation the shipped codec and the source table are both
 * measured against, so adding a thirteenth code cannot pass unnoticed.
 */
const SPEC_ERROR_CODES = [
  'bad-request',
  'session-not-found',
  'agent-unavailable',
  'agent-busy',
  'message-not-found',
  'message-pending',
  'target-shadowed',
  'not-user-message',
  'not-last-reply',
  'blank-text',
  'no-text',
  'internal',
]

const failures = []
const fail = (location, field, message) => failures.push({ location, field, message })

/**
 * A `file:line` pointer into one hand-written source file, found by needle.
 * @returns `file:line`, or the bare path when the needle no longer appears (the
 *   diagnostic still names the file that owns the claim).
 */
function lineOf(relativeFile, needle) {
  const source = path.join(rootDir, relativeFile)
  if (!existsSync(source)) return relativeFile
  const index = readFileSync(source, 'utf8').split('\n').findIndex((line) => line.includes(needle))
  return index === -1 ? relativeFile : `${relativeFile}:${index + 1}`
}

/**
 * A `file:line` pointer that *must* resolve.
 *
 * An anchor that no longer appears anywhere is a defect in this gate rather than a
 * pass: it is reported, and the bare path is returned so the reader still learns
 * which file owns the claim.
 */
function requiredLine(relativeFile, needle) {
  const location = lineOf(relativeFile, needle)
  if (location === relativeFile) fail(relativeFile, needle, `the gate's anchor ${JSON.stringify(needle)} no longer appears in ${relativeFile} — fix the anchor`)
  return location
}

/**
 * A `file:line` pointer for a field, resolved against the hand-written sources
 * the generated face comes from — the face's own source first, then the shared
 * descriptor table.
 */
function pointer(needle, generatedFile) {
  for (const candidate of [`src/${generatedFile}`, 'src/typert.js']) {
    if (!existsSync(path.join(rootDir, candidate))) continue
    const location = lineOf(candidate, needle)
    // `lineOf` returns the bare path when the needle is absent.
    if (location !== candidate) return location
  }
  return requiredLine(`src/${generatedFile}`, needle)
}

/** Function-source-aware normalization, so two bundled copies of one table compare equal. */
function normalize(value) {
  if (typeof value === 'function') return `[function ${value.name}]${value.toString()}`
  if (Array.isArray(value)) return value.map(normalize)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, normalize(entry)]))
  }
  return value
}

const sameTable = (left, right) => JSON.stringify(normalize(left)) === JSON.stringify(normalize(right))

/**
 * The codec probe set, in one place: what each schema must accept and what it must
 * refuse. The face assertions and the artifact comparison below both measure with
 * these probes, so "the copy that runs behaves like the face" means exactly what
 * "the face is strict" means.
 */
const CODEC_CASES = [
  {
    name: 'parameters[0].codec',
    anchor: 'create: resendApplyRequestSchema',
    codec: (descriptor) => descriptor.parameters?.[0]?.codec,
    accepted: [
      ['edit', { sessionId: 's', targetSeq: 4, op: 'edit', text: 'hi' }],
      ['regenerate, no text', { sessionId: 's', targetSeq: 4, op: 'regenerate' }],
      // §4.5 owns these as business codes, so the codec must let them through.
      ['empty sessionId ⇒ bad-request', { sessionId: '', targetSeq: 0, op: 'edit', text: '' }],
      ['edit without text ⇒ bad-request', { sessionId: 's', targetSeq: 0, op: 'edit' }],
    ],
    rejected: [
      ['unknown field', { sessionId: 's', targetSeq: 4, op: 'edit', unexpected: true }],
      ['missing field', { targetSeq: 4, op: 'edit' }],
      ['wrong type', { sessionId: 's', targetSeq: '4', op: 'edit' }],
      ['unknown op', { sessionId: 's', targetSeq: 4, op: 'rewind' }],
    ],
  },
  {
    name: 'result',
    anchor: 'create: resendApplyResultSchema',
    codec: (descriptor) => descriptor.result,
    accepted: [
      ['ok: true', { ok: true, value: { carrierSeq: 7, shadowedSeqs: [4, 6], resendMessageId: 'dsh-resend-edit-1' } }],
      ['ok: true, empty shadowedSeqs', { ok: true, value: { carrierSeq: 7, shadowedSeqs: [], resendMessageId: 'dsh-resend-edit-1' } }],
      ...SPEC_ERROR_CODES.map((code) => [`ok: false, ${code}`, { ok: false, error: { code } }]),
    ],
    rejected: [
      // Neither branch alone is a RemoteResult: `{ ok: true }` has no value and
      // `{ ok: false }` has no error.
      ['empty', {}],
      ['ok: true without value', { ok: true }],
      ['ok: false without error', { ok: false }],
      ['unknown envelope field', { ok: true, value: { carrierSeq: 7, shadowedSeqs: [4, 6], resendMessageId: 'm' }, unexpected: true }],
      ['unknown value field', { ok: true, value: { carrierSeq: 7, shadowedSeqs: [4, 6], resendMessageId: 'm', unexpected: true } }],
      ['unknown error field', { ok: false, error: { code: 'internal', unexpected: true } }],
      ['unknown error code', { ok: false, error: { code: 'not-a-code' } }],
      ['wrong value type', { ok: true, value: { carrierSeq: '7', shadowedSeqs: [4, 6], resendMessageId: 'm' } }],
    ],
  },
]

/** The case's probes as one flat list, each with the verdict it must produce. */
const probesOf = (codecCase) => [
  ...codecCase.accepted.map(([label, value]) => ({ label, value, accept: true })),
  ...codecCase.rejected.map(([label, value]) => ({ label, value, accept: false })),
]

/** Materialize one codec's schema, or the reason it cannot be used. */
function schemaOf(codec) {
  const schema = codec?.create?.()
  return typeof schema?.safeParse === 'function' ? { schema } : { error: 'did not produce a schema with safeParse()' }
}

/**
 * Two copies of one table compared as *contract* rather than as code.
 *
 * The browser bundle inlines its own zod, so its schema factories' source text
 * cannot equal the ESM faces' even though they build the same schema; `create`
 * therefore compares by name, every other field verbatim, and each codec's
 * verdicts are compared over the probe set — a copy that admitted a field the face
 * refuses fails here whatever its function text looks like.
 * @returns the first difference, or `undefined` when the copies agree.
 */
function contractDifference(faceDescriptors, artifactDescriptors) {
  if (faceDescriptors.length !== artifactDescriptors.length) {
    return `the face carries ${faceDescriptors.length} descriptor(s) and the artifact ${artifactDescriptors.length}`
  }
  for (const [index, face] of faceDescriptors.entries()) {
    const artifact = artifactDescriptors[index]
    const shape = (descriptor) => ({
      ...descriptor,
      parameters: (descriptor.parameters ?? []).map((parameter) => ({ ...parameter, codec: { ...parameter.codec, create: parameter.codec?.create?.name } })),
      result: { ...descriptor.result, create: descriptor.result?.create?.name },
    })
    const faceShape = shape(face)
    const artifactShape = shape(artifact)
    for (const key of new Set([...Object.keys(faceShape), ...Object.keys(artifactShape)])) {
      if (JSON.stringify(faceShape[key]) !== JSON.stringify(artifactShape[key])) {
        return `descriptor ${index} differs from the face's at ${key} (${JSON.stringify(faceShape[key])} vs ${JSON.stringify(artifactShape[key])})`
      }
    }
    for (const codecCase of CODEC_CASES) {
      const left = schemaOf(codecCase.codec(face))
      const right = schemaOf(codecCase.codec(artifact))
      if (left.error !== undefined || right.error !== undefined) return `${codecCase.name} of descriptor ${index} has no usable schema in one of the copies`
      for (const probe of probesOf(codecCase)) {
        if (left.schema.safeParse(probe.value).success !== right.schema.safeParse(probe.value).success) {
          return `${codecCase.name} of descriptor ${index} disagrees with the face on ${JSON.stringify(probe.value)}`
        }
      }
    }
  }
  return undefined
}

/** A deep copy that keeps function references, for breaking one field at a time. */
function clone(value) {
  if (Array.isArray(value)) return value.map(clone)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, clone(entry)]))
  }
  return value
}

/**
 * Load the validator the rule probes run against: the installed app's registry
 * when there is an unpacked one (so the gate follows the host that actually
 * runs), otherwise this package's pinned devDependency.
 * @returns `{ cordis, registry, source }`, or records a failure for a mistyped
 *   `DSH_APP_ROOT`.
 */
async function loadValidator() {
  const app = (() => {
    try {
      return resolveHostApp()
    } catch (error) {
      // The resolution that failed lives in the shared app reader, so that is
      // where the pointer goes.
      fail(requiredLine('scripts/host-app.mjs', 'export function resolveHostApp'), 'DSH_APP_ROOT', error.message)
      return undefined
    }
  })()

  // A packed app cannot be imported from, so the installed validator is only
  // reachable through an unpacked installation.
  if (typeof app?.resolveFrom === 'function' && existsSync(path.join(app.modulesDir, '@deepseek-ai', 'dsh-typert-registry'))) {
    const cordisEntry = app.resolveFrom('package.json', '@deepseek-ai/cordis')
    const registryEntry = app.resolveFrom('package.json', '@deepseek-ai/dsh-typert-registry')
    return {
      cordis: await import(pathToFileURL(cordisEntry).href),
      registry: await import(pathToFileURL(registryEntry).href),
      source: `installed app (${app.describe()})`,
    }
  }

  return {
    cordis: await import('@deepseek-ai/cordis'),
    registry: await import('@deepseek-ai/dsh-typert-registry'),
    source: 'devDependency @deepseek-ai/dsh-typert-registry (no unpacked installed app found)',
  }
}

/**
 * Load one descriptor face from the faces directory.
 * @param file - face file name inside that directory.
 * @param exportName - the contribution it must export (`TYPERT` / `TYPERT_REMOTE`).
 * @returns the contribution, or `undefined` after recording why it is missing.
 */
async function loadFace(file, exportName) {
  const target = path.join(facesDir, file)
  if (!existsSync(target)) {
    fail(relativePath(rootDir, target), exportName, 'descriptor face file is missing')
    return undefined
  }
  const module = await import(pathToFileURL(target).href)
  const face = module[exportName]
  if (face === undefined) {
    fail(relativePath(rootDir, target), exportName, `the face file does not export ${exportName}`)
    return undefined
  }
  return face
}

/**
 * Drive one registration path with one contribution in a fresh registry.
 * @param face - one `faces` record: the path's `register` and `list` accessors.
 * @returns the rejection message, or `undefined` when the validator accepted it.
 */
async function driveValidator(validator, face, contribution) {
  const ctx = new validator.cordis.Context()
  await ctx.plugin(validator.registry.TypertRegistry)
  const register = (vctx) => face.register(vctx.typert, contribution)
  register.inject = ['typert']
  try {
    await ctx.plugin(register)
    return undefined
  } catch (error) {
    return error?.message ?? String(error)
  } finally {
    await ctx.fiber.dispose()
  }
}

/**
 * Whether a batch's legal member lands when a later member is refused.
 *
 * §6.3's closing claim is that `register()` refuses the whole batch *before
 * committing anything* — which is what lets every mutation probe below read one
 * rejection as "the rules were enforced" rather than "part of the table was". A
 * registry that committed the descriptors it had already validated would still
 * pass those probes, so the atomicity is driven directly: one legal descriptor
 * followed by one that breaks a rule, and the registry asked what it kept.
 * @param face - one `faces` record: the path's `register`, `list`, and `descriptorsOf`.
 * @returns the rejection message (if any) and how many descriptors landed.
 */
async function batchAtomicity(validator, face, contribution) {
  const [first] = face.descriptorsOf(contribution)
  const legal = clone(first)
  legal.method = 'second'
  legal.id = `${contribution.package}#${legal.namespace}/${legal.method}`
  // The illegal member breaks several rules at once on purpose: this probe is
  // about *whether* a refused batch lands nothing, not about which rule refused
  // it, and a single broken rule would turn into a false failure whenever a test
  // fixture cripples exactly that rule.
  const illegal = clone(legal)
  illegal.method = 'third'
  illegal.namespace = 'bad#namespace'
  illegal.id = `${contribution.package}#${illegal.namespace}/${illegal.method}`
  illegal.parameters = [{ ...illegal.parameters[0], wire: 'bad#wire' }]
  illegal.result = { ...illegal.result, typeSymbol: '' }

  const batch = { ...contribution, [face.listName]: [legal, illegal] }
  const ctx = new validator.cordis.Context()
  await ctx.plugin(validator.registry.TypertRegistry)
  const register = (vctx) => face.register(vctx.typert, batch)
  register.inject = ['typert']
  let rejection
  try {
    await ctx.plugin(register)
  } catch (error) {
    rejection = error?.message ?? String(error)
  }
  const landed = face.list(ctx.typert).length
  await ctx.fiber.dispose()
  return { rejection, landed }
}

/**
 * How the two registration faces differ. The Host face registers with
 * `ctx.typert.register()`; the Client face registers the same descriptor list
 * with `ctx.typert.remotes.register()`, which is the call the Gateway's mount
 * path makes — both run the same `validateInvocation`, which is why one rule
 * probe can be driven through either.
 */
const FACE_SHAPES = {
  host: {
    listName: 'invocations',
    descriptorsOf: (contribution) => contribution.invocations ?? [],
    register: (typert, contribution) => typert.register(contribution),
    list: (typert) => typert.local.list(),
  },
  client: {
    listName: 'descriptors',
    descriptorsOf: (contribution) => contribution.descriptors ?? [],
    register: (typert, contribution) => typert.remotes.register(contribution),
    list: (typert) => typert.remotes.list(),
  },
}

const hostFace = await loadFace('typert.host.js', 'TYPERT')
const clientFace = await loadFace('typert.client.js', 'TYPERT_REMOTE')

/**
 * One face as the record every shared assertion reads: its own name and pointer
 * file, its contribution, the descriptor list it carries, and the shape's
 * accessors for the mutated copies below.
 */
function faceRecord(name, pointerFile, contribution) {
  const shape = FACE_SHAPES[name]
  return { name, pointerFile, contribution, descriptors: shape.descriptorsOf(contribution), ...shape }
}

const faces = []
if (hostFace !== undefined) faces.push(faceRecord('host', 'typert.host.js', hostFace))
if (clientFace !== undefined) faces.push(faceRecord('client', 'typert.client.js', clientFace))
const faceNamed = (name) => faces.find((face) => face.name === name)

// --- the contribution's shape, identity, and non-vacuity ---------------------

if (hostFace !== undefined && clientFace !== undefined) {
  const hostAnchor = pointer('export const TYPERT', 'typert.host.js')
  const clientAnchor = pointer('export const TYPERT_REMOTE', 'typert.client.js')

  if (hostFace.face !== 'host') fail(pointer('face:', 'typert.host.js'), 'face', `expected "host", got ${JSON.stringify(hostFace.face)}`)
  if ('face' in clientFace) fail(clientAnchor, 'face', 'the client face must not declare a face')
  if ('model' in hostFace) fail(hostAnchor, 'model', 'the reflection model is deliberately not used on the direct-registration route (spec §6.6)')
  if ('model' in clientFace) fail(clientAnchor, 'model', 'the client face must not carry a reflection model')

  if (hostFace.package !== pkg.name) fail(pointer('PACKAGE = ', 'typert.host.js'), 'package', `host face package ${JSON.stringify(hostFace.package)} is not the npm name ${JSON.stringify(pkg.name)}`)
  if (clientFace.package !== pkg.name) fail(pointer('PACKAGE = ', 'typert.client.js'), 'package', `client face package ${JSON.stringify(clientFace.package)} is not the npm name ${JSON.stringify(pkg.name)}`)

  // One table, two faces: the whole point of deriving both from src/typert.js.
  if (!sameTable(hostFace.invocations, clientFace.descriptors)) {
    fail(pointer('descriptors', 'typert.host.js'), 'invocations/descriptors', 'the host and client faces do not carry the same descriptor list')
  }

  for (const { pointerFile, descriptors, listName } of faces) {
    for (const [index, descriptor] of descriptors.entries()) {
      // The id is computed from the descriptor's own parts, so it is the *table*
      // that owns every claim below: point at the literal this descriptor is
      // built from, not at a value that appears in no file.
      const where = pointer('id: INVOCATION_ID', pointerFile)
      const field = (name) => `${listName}[${index}].${name}`

      // §6.2's project convention, not a registry rule: the id names the
      // endpoint it defines, so a renamed method cannot leave a stale id behind.
      const expectedId = `${pkg.name}#${descriptor.namespace}/${descriptor.method}`
      if (descriptor.id !== expectedId) {
        fail(where, field('id'), `the invocation id must be ${JSON.stringify(expectedId)} (spec §6.2), got ${JSON.stringify(descriptor.id)}`)
      }

      // A unary method: `direct`, and no stream-only member anywhere.
      if (descriptor.invocation?.kind !== 'direct') fail(where, field('invocation.kind'), 'this plugin mounts direct invocations only')
      if ('mode' in descriptor) fail(where, field('mode'), 'a unary method omits mode entirely (only "stream" is legal)')
      if ('scope' in descriptor) fail(where, field('scope'), 'this plugin declares no scope projection')
      if ('cancellation' in descriptor) fail(where, field('cancellation'), 'this plugin declares no cancellation parameter')
      if ('sourceLocation' in descriptor) fail(where, field('sourceLocation'), 'sourceLocation is generator provenance; it is validated nowhere and must be omitted')
      for (const parameter of descriptor.parameters ?? []) {
        if (parameter.source === 'lookup') fail(where, field(`parameters.${parameter.name}`), 'this plugin has no lookup parameters')
        if (parameter.source === 'context') fail(where, field(`parameters.${parameter.name}`), 'this plugin has no context receiver')
        // The mount path's extra rule: every client-supplied field needs a strict
        // codec (`@dsh-api-gateway/lib/types/client/index.js:587-602`).
        if (parameter.codec?.mode !== 'strict') {
          fail(where, field(`parameters.${parameter.name}.codec.mode`), 'every client-supplied field needs a strict codec')
        }
      }
      if (descriptor.result?.mode !== 'strict') fail(where, field('result.mode'), 'the result codec must be strict')
    }
  }

  const descriptorCount = hostFace.invocations?.length ?? 0
  if (descriptorCount === 0) {
    fail(
      pointer('export const descriptors', 'typert.host.js'),
      'invocations',
      "the descriptor table is empty: §6.3's rules, both registration paths and the envelope codecs would all be asserted against nothing",
    )
  }
}

// --- the error vocabulary, from its source of truth -------------------------

if (JSON.stringify(SOURCE_ERROR_CODES) !== JSON.stringify(SPEC_ERROR_CODES)) {
  fail(
    pointer('ERROR_CODES = Object.freeze', 'typert.js'),
    'ERROR_CODES',
    `the source vocabulary ${JSON.stringify(SOURCE_ERROR_CODES)} is not spec §4.5's ${JSON.stringify(SPEC_ERROR_CODES)}`,
  )
}

// --- the artifacts that run carry the same table as the faces ----------------
//
// The two face files are what this gate has validated so far, but neither of them
// is what runs: `lib/index.js` registers its own inlined copy with the Typert
// registry, and `lib/client.bundle.js` mounts its own inlined copy in the page.
// "One table, two faces" is only a property of the shipped bundle if those two
// copies are the same contract, so both are read back and deep-compared:
//
//  - the host copy by letting the row register on a real registry and reading the
//    endpoints back out of it — the same evidence the boot log reports;
//  - the browser copy by evaluating the bundle the way the page does (the
//    module-loader queue, and a `require` that refuses any lookup by name — a
//    bundle needing a module-table entry must not read as "publishes nothing")
//    and asking it for the contribution it publishes.
//
// A faces directory without those artifacts (the gate's own test fixtures) skips
// them; in `lib/` both are always present, and the artifact set is pinned by the
// build suite.

/**
 * The contribution the host half actually registers, or the reason it could not be read.
 *
 * The Cordis context and registry here come from this package's own resolution,
 * not from the installed app the rule probes above use: `lib/index.js` imports
 * cordis and zod from *its* side, and a Context from a second copy of Cordis
 * would be a different realm's object graph. The registry is the same
 * implementation either way; this check is about which descriptors landed, not
 * about the rules that let them land.
 * @returns `{ descriptors }`, or `{ error }` naming why the row could not register.
 */
async function registeredByHostHalf() {
  const cordis = await import('@deepseek-ai/cordis')
  const registry = await import('@deepseek-ai/dsh-typert-registry')
  const ctx = new cordis.Context()
  await ctx.plugin(registry.TypertRegistry)
  try {
    const row = await import(pathToFileURL(path.join(facesDir, 'index.js')).href)
    await ctx.plugin(row)
    return { descriptors: ctx.typert.local.list() }
  } catch (error) {
    return { error: describeError(error) }
  } finally {
    await ctx.fiber.dispose()
  }
}

/** The contribution the browser bundle publishes, or the reason it could not be read. */
function mountedByClientBundle() {
  const read = readClientContribution(path.join(facesDir, 'client.bundle.js'))
  if (read.error !== undefined) return read
  return { descriptors: read.contribution.descriptors }
}

let artifactsChecked = 0
for (const [artifact, faceName, read, source] of [
  ['index.js', 'host', registeredByHostHalf, ['src/index.js', 'register(TYPERT)']],
  ['client.bundle.js', 'client', mountedByClientBundle, ['src/client.js', '$mount(TYPERT_REMOTE)']],
]) {
  const face = faceNamed(faceName)
  const target = path.join(facesDir, artifact)
  if (face === undefined || !existsSync(target)) continue
  artifactsChecked += 1

  // The artifact is generated, so the pointer names the hand-written line that
  // would have to change: the registration, or the mount.
  const where = requiredLine(source[0], source[1])
  const readBack = await read()
  if (readBack.error !== undefined) {
    fail(where, artifact, `the artifact's copy of the contribution could not be read: ${readBack.error}`)
    continue
  }
  const difference = contractDifference(face.descriptors, readBack.descriptors)
  if (difference !== undefined) {
    fail(
      where,
      artifact,
      `the copy of the table inlined into ${artifact} is not the face's — ${difference}: what runs would publish a contract the gate did not validate`,
    )
  }
}

// --- drive the installed validator ------------------------------------------

const validator = failures.length === 0 ? await loadValidator() : undefined
let rejectionProbes = 0
let acceptanceProbes = 0

if (validator !== undefined && failures.length === 0) {
  // Positive control first: the real contributions, unmutated, through both
  // paths. Everything below assumes this passes.
  for (const face of faces) {
    const rejection = await driveValidator(validator, face, face.contribution)
    if (rejection !== undefined) {
      fail(pointer('export const TYPERT', face.pointerFile), 'contribution', `the installed validator rejected the ${face.name} contribution: ${rejection}`)
    }
  }

  // Then the batch property every probe below depends on.
  for (const face of faces) {
    const where = pointer('export const TYPERT', face.pointerFile)
    const { rejection, landed } = await batchAtomicity(validator, face, face.contribution)
    if (rejection === undefined) {
      fail(where, 'contribution', `${face.name} face: the installed validator ACCEPTED a batch whose second descriptor breaks §6.3 rules 3, 4 and 5 — a rejected batch is no longer refused whole`)
    } else if (landed !== 0) {
      fail(where, 'contribution', `${face.name} face: ${landed} descriptor(s) landed from a batch the validator refused — a partially committed table is a contract this gate never validated`)
    }
  }
}

if (validator !== undefined && failures.length === 0) {
  /**
   * One §6.3 rule probe: break `fieldPath` with `mutate`, and require the
   * validator to refuse it with a message containing `expect` — the fragment that
   * proves *this* rule, and not a neighbouring one, did the rejecting. A probe
   * whose `scope` is `'contribution'` mutates the contribution itself and so has
   * no index path.
   */
  const rules = [
    {
      rule: 1,
      fieldPath: 'id',
      anchor: 'id: INVOCATION_ID',
      why: 'a non-empty id',
      mutate: (d) => {
        d.id = ''
      },
      expect: 'invalid invocation id',
    },
    {
      rule: 2,
      fieldPath: 'package',
      scope: 'contribution',
      anchor: 'PACKAGE = ',
      why: 'a package name with no "#"',
      // Contribution-level rather than descriptor-level: this is the one rule
      // about the face's own name, so it takes the second probe argument.
      mutate: (_descriptor, contribution) => {
        contribution.package = 'bad#package'
      },
      expect: 'must not contain "#"',
    },
    {
      rule: 2,
      fieldPath: 'package',
      scope: 'contribution',
      anchor: 'PACKAGE = ',
      why: 'a non-empty package name',
      mutate: (_descriptor, contribution) => {
        contribution.package = ''
      },
      // The two paths word the subject differently ("package name" on the host,
      // "Remote package name" on the client), so the fragment is the common part.
      expect: 'package name',
    },
    {
      rule: 2,
      fieldPath: 'service',
      anchor: 'service: SERVICE',
      why: 'a non-empty service key with no "#"',
      mutate: (d) => {
        d.service = 'bad#service'
      },
      expect: 'invalid invocation service key',
    },
    {
      rule: 2,
      fieldPath: 'service',
      anchor: 'service: SERVICE',
      why: 'a non-empty service key',
      mutate: (d) => {
        d.service = ''
      },
      expect: 'invalid invocation service key',
    },
    {
      rule: 3,
      fieldPath: 'namespace',
      anchor: '    namespace: NAMESPACE,',
      why: 'endpoint-segment namespace characters only',
      mutate: (d) => {
        d.namespace = 'bad#ns'
      },
      expect: 'invalid invocation namespace',
    },
    {
      rule: 3,
      fieldPath: 'method',
      anchor: '    method: METHOD,',
      why: 'endpoint-segment method characters only, and not "." or ".."',
      mutate: (d) => {
        d.method = '..'
      },
      expect: 'invalid invocation method',
    },
    {
      rule: 3,
      fieldPath: 'parameters[0].name',
      anchor: "name: 'request'",
      why: 'endpoint-segment parameter-name characters only',
      mutate: (d) => {
        d.parameters[0].name = 'bad name'
      },
      expect: 'invalid parameter name',
    },
    {
      rule: 3,
      fieldPath: 'parameters[0].wire',
      anchor: "wire: 'request'",
      why: 'endpoint-segment wire-field characters only',
      mutate: (d) => {
        d.parameters[0].wire = 'bad#wire'
      },
      expect: 'invalid parameter wire field',
    },
    {
      rule: 3,
      fieldPath: 'implementation',
      anchor: '    method: METHOD,',
      why: 'endpoint-segment characters in a renamed implementation method too',
      mutate: (d) => {
        d.implementation = 'bad#implementation'
      },
      expect: 'invalid invocation implementation method',
    },
    {
      rule: 4,
      fieldPath: 'parameters[1].wire',
      anchor: "wire: 'request'",
      why: 'unique wire fields within one descriptor',
      mutate: (d) => {
        d.parameters.push({ ...clone(d.parameters[0]), name: 'second' })
      },
      expect: 'repeats wire field',
    },
    {
      rule: 4,
      fieldPath: 'parameters[1].lookup',
      anchor: "source: 'json'",
      why: 'a lookup key on a parameter whose source is lookup',
      mutate: (d) => {
        d.parameters.push({ name: 'second', wire: 'second', source: 'lookup', codec: { mode: 'src-json' } })
      },
      expect: 'has no lookup key',
    },
    {
      rule: 4,
      fieldPath: 'parameters[0].lookup',
      anchor: "source: 'json'",
      why: 'no lookup declaration on any other source',
      mutate: (d) => {
        d.parameters[0].lookup = 'session'
      },
      expect: 'declares a lookup key',
    },
    {
      rule: 4,
      fieldPath: 'parameters[1].acceptsUndefined',
      anchor: "source: 'json'",
      why: 'no acceptsUndefined on a lookup parameter',
      mutate: (d) => {
        d.parameters.push({ name: 'second', wire: 'second', source: 'lookup', lookup: 'session', acceptsUndefined: true, codec: { mode: 'src-json' } })
      },
      expect: 'cannot accept undefined',
    },
    {
      rule: 5,
      fieldPath: 'parameters[0].codec.typeSymbol',
      anchor: 'typeSymbol: `${PACKAGE}/types#ResendApplyRequest`',
      why: 'a non-empty type symbol for every strict codec',
      mutate: (d) => {
        d.parameters[0].codec.typeSymbol = ''
      },
      expect: 'type symbol',
    },
    {
      rule: 5,
      fieldPath: 'parameters[0].codec.create',
      anchor: 'create: resendApplyRequestSchema',
      why: 'a create() factory on every strict codec',
      mutate: (d) => {
        d.parameters[0].codec.create = undefined
      },
      expect: 'has no create() factory',
    },
    {
      rule: 5,
      fieldPath: 'result.typeSymbol',
      anchor: 'typeSymbol: `${PACKAGE}/types#ResendApplyResult`',
      why: 'the result codec is validated exactly like a parameter codec',
      mutate: (d) => {
        d.result.typeSymbol = ''
      },
      expect: 'type symbol',
    },
    {
      rule: 5,
      fieldPath: 'result.create',
      anchor: 'create: resendApplyResultSchema',
      why: 'the result codec needs a create() factory too',
      mutate: (d) => {
        d.result.create = undefined
      },
      expect: 'has no create() factory',
    },
    {
      rule: 6,
      fieldPath: 'mode',
      anchor: 'invocation: { kind:',
      why: 'mode may only ever be "stream"',
      mutate: (d) => {
        d.mode = 'unary'
      },
      expect: 'mode must be "stream"',
    },
    {
      rule: 6,
      fieldPath: 'cancellation.parameter',
      anchor: 'invocation: { kind:',
      why: 'cancellation may only ever name "signal"',
      mutate: (d) => {
        d.cancellation = { parameter: 'abort' }
      },
      expect: 'cancellation parameter must be "signal"',
    },
    {
      rule: 7,
      fieldPath: 'scope',
      anchor: 'invocation: { kind:',
      why: 'a scope must select its only lookup parameter',
      mutate: (d) => {
        d.scope = { context: 'session', wire: 'sessionId' }
      },
      expect: 'must select its only lookup parameter',
    },
  ]

  /** The positive controls: rule shapes the validator must accept. */
  const acceptances = [
    {
      rule: 5,
      fieldPath: 'parameters[0].codec',
      anchor: "mode: 'strict',",
      why: 'the src-json codec is the one codec shape exempt from typeSymbol/create',
      mutate: (d) => {
        d.parameters[0].codec = { mode: 'src-json' }
      },
    },
    {
      rule: 6,
      fieldPath: 'mode',
      anchor: 'invocation: { kind:',
      why: '"stream" is the only legal declared mode, so a unary op must omit the member rather than spell it',
      mutate: (d) => {
        d.mode = 'stream'
      },
    },
    {
      rule: 6,
      fieldPath: 'cancellation',
      anchor: 'invocation: { kind:',
      why: '"signal" is the only legal cancellation parameter',
      mutate: (d) => {
        d.cancellation = { parameter: 'signal' }
      },
    },
    {
      rule: 7,
      fieldPath: 'scope',
      anchor: 'invocation: { kind:',
      why: 'a scope that does select its only lookup parameter is legal — this plugin simply declares none',
      mutate: (d) => {
        d.parameters[0] = { name: 'sessionId', wire: 'sessionId', source: 'lookup', lookup: 'session', codec: { mode: 'src-json' } }
        d.scope = { context: 'session', wire: 'sessionId' }
      },
    },
  ]

  for (const face of faces) {
    const label = `${face.name} face`
    /** A copy of the real face with one probe's mutation applied to every descriptor it carries. */
    const mutate = (probe) => {
      const mutated = clone(face.contribution)
      for (const descriptor of face.descriptorsOf(mutated)) probe.mutate(descriptor, mutated)
      return mutated
    }

    for (const probe of rules) {
      const rejection = await driveValidator(validator, face, mutate(probe))
      rejectionProbes += 1
      const where = pointer(probe.anchor, face.pointerFile)
      const field = probe.scope === 'contribution' ? probe.fieldPath : `${face.listName}[0].${probe.fieldPath}`
      if (rejection === undefined) {
        fail(where, field, `${label}: §6.3 rule ${probe.rule} (${probe.why}) is no longer enforced — the installed validator ACCEPTED the mutation`)
      } else if (!rejection.includes(probe.expect)) {
        fail(
          where,
          field,
          `${label}: the mutation was rejected, but not by §6.3 rule ${probe.rule} — expected a message containing ${JSON.stringify(probe.expect)}, got ${JSON.stringify(rejection)}`,
        )
      }
    }

    for (const probe of acceptances) {
      const rejection = await driveValidator(validator, face, mutate(probe))
      acceptanceProbes += 1
      if (rejection !== undefined) {
        fail(
          pointer(probe.anchor, face.pointerFile),
          `${face.listName}[0].${probe.fieldPath}`,
          `${label}: §6.3 rule ${probe.rule} (${probe.why}) — the installed validator rejected a legal shape: ${rejection}`,
        )
      }
    }
  }
}

// --- the envelope codecs: what they accept, and what they must refuse --------

// Materialized from the host face: the two faces carry the *same* factory
// functions (the deep-equality assertion above is what makes that true), and a
// codec that accepted an unknown field is exactly what "strict" exists to
// prevent — the host rejects such a request at its boundary instead of folding
// the field away. The same probe set is what the artifact comparison uses, so the
// copies that run are held to the verdicts asserted here.
if (hostFace !== undefined && failures.length === 0) {
  const descriptor = (hostFace.invocations ?? [])[0]

  for (const codecCase of CODEC_CASES) {
    const where = pointer(codecCase.anchor, 'typert.host.js')
    const { schema, error } = schemaOf(codecCase.codec(descriptor))
    if (error !== undefined) {
      fail(where, `${codecCase.name}.create`, `the strict codec ${error}`)
      continue
    }
    for (const probe of probesOf(codecCase)) {
      const accepted = schema.safeParse(probe.value).success
      if (accepted === probe.accept) continue
      fail(
        where,
        `${codecCase.name} (${probe.label})`,
        probe.accept ? `the codec refused ${JSON.stringify(probe.value)}` : `the codec accepted ${JSON.stringify(probe.value)}, which it must refuse`,
      )
    }
  }
}

if (failures.length > 0) {
  for (const { location, field, message } of failures) console.error(`check-typert: FAIL ${location} (${field}) — ${message}`)
  console.error(`check-typert: ${failures.length} failure(s); faces read from ${relativePath(rootDir, facesDir)}`)
  process.exit(1)
}

const descriptorCount = hostFace?.invocations?.length ?? 0
const artifactClause =
  artifactsChecked === 0
    ? `the copies that run were not checked (${relativePath(rootDir, facesDir)} has no index.js/client.bundle.js)`
    : `the copies that run match the faces (${artifactsChecked} artifact(s) read back)`
console.log(
  `check-typert: OK — ${descriptorCount} invocation descriptor(s) in ${relativePath(rootDir, facesDir)}; host and client faces deep-equal; ${artifactClause}; ` +
    `§6.3's seven rules driven against ${validator.source} on both registration paths ` +
    `(${rejectionProbes} rejection, ${acceptanceProbes} acceptance probes); request and result codecs asserted to accept what they declare and refuse the rest, over ${SPEC_ERROR_CODES.length} codes`,
)
