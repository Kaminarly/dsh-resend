#!/usr/bin/env node
/**
 * Gate 2/3 — descriptor validation (spec §6.4).
 *
 * The point of this gate is that it does not restate the registry's rules: it
 * *drives* the installed `@deepseek-ai/dsh-typert-registry` validator with both
 * descriptor faces, so the gate goes red when the host's rules change, not only
 * when somebody forgets to re-run a generator.
 *
 * Validator resolution:
 *   1. the installed DSH Desktop app (an unpacked `resources/app`), so the gate
 *      validates against the registry the host actually runs;
 *   2. this package's pinned devDependency — what CI has, and what keeps the
 *      gate real without an installation.
 *
 * The faces are read from `lib/` because that is what ships; CI's
 * `git diff --exit-code -- lib/` right after `build` is what keeps them current.
 *
 * Non-vacuity: an empty descriptor table fails this gate, because nothing can
 * be asserted against it. Ticket 01 ships the skeleton with an intentionally
 * empty table, so `npm run check` passes `--allow-empty-descriptors`, which
 * prints a loud vacuity note instead. Ticket 02 fills the table and removes
 * that flag — after which an emptied table goes red again.
 *
 * Usage: node scripts/check-typert.mjs [--faces <dir>] [--allow-empty-descriptors]
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolveHostApp } from './host-app.mjs'
import { optionValue } from './args.mjs'
import { relativePath } from './walk-javascript.mjs'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const argv = process.argv.slice(2)
const facesDir = path.resolve(rootDir, optionValue(argv, '--faces', { bin: 'check-typert', fallback: 'lib' }))
const allowEmptyDescriptors = argv.includes('--allow-empty-descriptors')

const pkg = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8'))

const failures = []
const fail = (location, field, message) => failures.push({ location, field, message })

/**
 * A `file:line` pointer for a field, resolved against the hand-written sources
 * the generated face comes from — the face's own source first, then the shared
 * descriptor table — falling back to the generated file when the field has no
 * literal source line (a computed key, a whole-object claim).
 */
function pointer(needle, generatedFile) {
  const candidates = [`src/${generatedFile}`, 'src/typert.js']
  if (needle !== undefined) {
    for (const candidate of candidates) {
      const source = path.join(rootDir, candidate)
      if (!existsSync(source)) continue
      const index = readFileSync(source, 'utf8').split('\n').findIndex((line) => line.includes(needle))
      if (index !== -1) return `${candidate}:${index + 1}`
    }
  }
  return relativePath(rootDir, path.join('src', generatedFile))
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

async function loadValidator() {
  const app = (() => {
    try {
      return resolveHostApp()
    } catch (error) {
      fail('package.json', 'DSH_APP_ROOT', error.message)
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

const hostFace = await loadFace('typert.host.js', 'TYPERT')
const clientFace = await loadFace('typert.client.js', 'TYPERT_REMOTE')

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

  for (const [index, descriptor] of (hostFace.invocations ?? []).entries()) {
    const where = pointer(descriptor?.id, 'typert.host.js')
    const field = (name) => `invocations[${index}].${name}`

    if (descriptor.invocation?.kind !== 'direct') fail(where, field('invocation.kind'), 'this plugin mounts direct invocations only')
    if ('mode' in descriptor) fail(where, field('mode'), 'a unary method omits mode entirely (only "stream" is legal)')
    if ('scope' in descriptor) fail(where, field('scope'), 'this plugin declares no scope projection')
    if ('cancellation' in descriptor) fail(where, field('cancellation'), 'this plugin declares no cancellation parameter')
    if ('sourceLocation' in descriptor) fail(where, field('sourceLocation'), 'sourceLocation is generator provenance; it is validated nowhere and must be omitted')
    for (const parameter of descriptor.parameters ?? []) {
      if (parameter.source === 'lookup') fail(where, field(`parameters.${parameter.name}`), 'this plugin has no lookup parameters')
      if (parameter.source === 'context') fail(where, field(`parameters.${parameter.name}`), 'this plugin has no context receiver')
    }

    // Envelope-level assertions that need no knowledge of T: a strict
    // RemoteResult is a tagged union, so neither branch alone can parse.
    // (Ticket 02 extends this with the accept/reject cases for the real
    // request and result schemas, including unknown-field rejection.)
    if (descriptor.result?.mode === 'strict' && typeof descriptor.result.create === 'function') {
      const schema = descriptor.result.create()
      if (typeof schema?.safeParse !== 'function') {
        fail(where, field('result.create'), 'the strict result codec did not produce a schema with safeParse()')
      } else {
        for (const envelope of [{ ok: true }, { ok: false }, {}]) {
          if (schema.safeParse(envelope).success) {
            fail(where, field('result'), `the result schema accepted ${JSON.stringify(envelope)}, which is not a RemoteResult envelope`)
          }
        }
      }
    }
  }

  // Non-vacuity: §6.3's seven rules are asserted *through* descriptors, so an
  // empty table means this gate checked nothing about them. The skeleton may
  // still ship empty, but only as an explicit, loud concession.
  const descriptorCount = hostFace.invocations?.length ?? 0
  if (descriptorCount === 0 && !allowEmptyDescriptors) {
    fail(
      pointer('descriptors = []', 'typert.host.js'),
      'invocations',
      'the descriptor table is empty, so §6.3\'s rules and the installed validator are never exercised; pass --allow-empty-descriptors to acknowledge that deliberately',
    )
  }
}

const validator = await loadValidator()

if (hostFace !== undefined && clientFace !== undefined && failures.length === 0) {
  const ctx = new validator.cordis.Context()
  await ctx.plugin(validator.registry.TypertRegistry)

  const registerBothFaces = (vctx) => {
    vctx.typert.register(hostFace)
    vctx.typert.remotes.register(clientFace)
  }
  registerBothFaces.inject = ['typert']

  try {
    await ctx.plugin(registerBothFaces)
  } catch (error) {
    fail(pointer('export const TYPERT', 'typert.host.js'), 'contribution', `the installed validator rejected the contribution: ${error?.message ?? error}`)
  } finally {
    await ctx.fiber.dispose()
  }
}

if (failures.length > 0) {
  for (const { location, field, message } of failures) console.error(`check-typert: FAIL ${location} (${field}) — ${message}`)
  console.error(`check-typert: ${failures.length} failure(s); faces read from ${relativePath(rootDir, facesDir)}`)
  process.exit(1)
}

const descriptorCount = hostFace?.invocations?.length ?? 0
console.log(
  `check-typert: OK — ${descriptorCount} invocation descriptor(s) in ${relativePath(rootDir, facesDir)}, host and client faces deep-equal, validated by ${validator.source}`,
)
if (descriptorCount === 0) {
  console.log(
    'check-typert: VACUOUS — the descriptor table is empty: §6.3\'s rules and the validator drive asserted nothing about any invocation. Ticket 01 ships the skeleton this way on purpose; ticket 02 fills the table and drops --allow-empty-descriptors from `check`.',
  )
}