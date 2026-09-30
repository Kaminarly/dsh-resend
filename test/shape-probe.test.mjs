/**
 * The `surfaceOp` shape probe (spec §5.4, §13.1 #7).
 *
 * This is the criterion that is easiest to satisfy vacuously — write the one
 * shape the shipped host accepts, call it a probe, and never notice that the
 * "detection" is a literal. So this file holds four separate things together:
 *
 *  - the binding for the RUNNING format builds exactly the three keys the
 *    runtime accepts, and says where the names came from;
 *  - the pre-v3 generation still has an answer ({@link endpointKeys}), so the
 *    version rule is a rule and not a restatement of v4;
 *  - a probe that disagrees with the running format is refused loudly, before
 *    any write, naming both spellings;
 *  - and a source guard over the whole hand-written SHIPPED tree (`src/`): the
 *    endpoint key names appear as string literals in exactly one file, and there
 *    as VALUES of a table rather than as the object's own keys. Test fixtures
 *    are out of scope on purpose — they spell the shape by hand, so the
 *    expectation does not come from the code under test.
 */
import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { rootDir } from './helpers/dsh.mjs'
import { SESSION_FORMAT_VERSION } from '@deepseek-ai/dsh-session'
import { endpointKeys, REPLACE_OP, runtimeEndpointKeys, runtimeShapeBinding, shapeBinding } from '../lib/shape-probe.js'

const read = (rel) => readFileSync(path.join(rootDir, rel), 'utf8')

/** The endpoint key names, restated from spec §5.4/§16.8 on purpose. */
const DENSE_KEYS = { start: 'startSeq', end: 'endSeq' }
const LEGACY_KEYS = { start: 'start', end: 'end' }

describe('the binding for the running format builds the shape the host accepts (§13.1 #7)', () => {
  it('the shipped runtime is a dense-endpoint format', () => {
    // The whole probe is only meaningful against a known runtime; if this ever
    // changes, the read below is where the change shows up first.
    expect(SESSION_FORMAT_VERSION).toBeGreaterThanOrEqual(3)
    expect(runtimeEndpointKeys()).toEqual(DENSE_KEYS)
  })

  it('builds exactly three keys, from the detected names', () => {
    const binding = runtimeShapeBinding()
    const op = binding.replaceOp(7, 5)

    expect(Object.keys(op)).toEqual(['op', 'startSeq', 'endSeq'])
    expect(op).toEqual({ op: REPLACE_OP, startSeq: 7, endSeq: 5 })
    expect(binding.keys).toEqual(runtimeEndpointKeys())
    // The names are the detected ones, not a private copy of them.
    expect(Object.keys(op).slice(1)).toEqual([binding.keys.start, binding.keys.end])
  })

  it('builds the same object on every call, and the binding is frozen', () => {
    const binding = runtimeShapeBinding()

    expect(binding.replaceOp(1, 2)).toEqual(binding.replaceOp(1, 2))
    expect(Object.isFrozen(binding)).toBe(true)
    expect(Object.isFrozen(binding.replaceOp(1, 2))).toBe(true)
  })
})

describe('the version rule is a rule, not a restatement of v4', () => {
  it('gives the pre-v3 spelling to the generations before 3', () => {
    for (const version of [0, 1, 2]) expect(endpointKeys(version), `format ${version}`).toEqual(LEGACY_KEYS)
  })

  it('gives the dense spelling from 3 onwards', () => {
    for (const version of [3, 4, SESSION_FORMAT_VERSION]) expect(endpointKeys(version), `format ${version}`).toEqual(DENSE_KEYS)
  })

  it('refuses a version it cannot read instead of guessing one', () => {
    for (const version of [undefined, null, -1, 1.5, '4', Number.NaN, Number.MAX_VALUE]) {
      expect(() => endpointKeys(version), `format ${String(version)}`).toThrow(TypeError)
    }
  })
})

describe('a probe that disagrees with the running format is refused loudly (§5.4, §11)', () => {
  it('throws, naming the detected spelling and the running one', () => {
    expect(() => shapeBinding(2)).toThrow(/format-2 spelling \(start\/end\)/)
    expect(() => shapeBinding(2)).toThrow(new RegExp(`this runtime is format ${SESSION_FORMAT_VERSION} \\(startSeq/endSeq\\)`))
  })

  it('accepts a later generation whose spelling is the running one — that is what agreement means', () => {
    const binding = shapeBinding(SESSION_FORMAT_VERSION + 1)

    expect(binding.keys).toEqual(DENSE_KEYS)
    expect(binding.formatVersion).toBe(SESSION_FORMAT_VERSION)
  })

  it('refuses an endpoint that is not a non-negative safe integer, naming it', () => {
    const binding = runtimeShapeBinding()

    expect(() => binding.replaceOp(-1, 2)).toThrow(/startSeq must be a non-negative safe integer/)
    expect(() => binding.replaceOp(1, 1.5)).toThrow(/endSeq must be a non-negative safe integer/)
    expect(() => binding.replaceOp(1, Number.MAX_VALUE)).toThrow(TypeError)
  })
})

describe('the shape is built from the probe, never from a literal (§13.1 #7)', () => {
  const sourceFiles = readdirSync(path.join(rootDir, 'src'))
    .filter((name) => name.endsWith('.js'))
    .map((name) => ({ name, source: read(path.join('src', name)) }))

  it('scans a tree that is actually there', () => {
    expect(sourceFiles.length).toBeGreaterThan(5)
    expect(sourceFiles.map(({ name }) => name)).toContain('shape-probe.js')
  })

  it('spells the endpoint names as string literals in exactly one file', () => {
    // Single- and double-quoted literals only: a code literal is what could
    // become a hardcoded shape, while a backticked mention inside a comment is
    // prose (and the guards below hold this file's construction site to the
    // table's VALUES either way).
    const QUOTED_ENDPOINT = /['"](?:startSeq|endSeq)['"]/
    const spelling = sourceFiles.filter(({ source }) => QUOTED_ENDPOINT.test(source)).map(({ name }) => name)

    // A second file spelling them is exactly the hardcoded single-shape literal
    // §13.1 #7 forbids: it would be a shape the probe never chose.
    expect(spelling).toEqual(['shape-probe.js'])
  })

  it('keeps them as the table’s VALUES, never as an object key or a member read', () => {
    const source = read(path.join('src', 'shape-probe.js'))

    // Non-vacuity: the names really are in this file, in the table the binding
    // reads. If the table were renamed, the guards below could pass on a file
    // that no longer spells the names at all.
    expect(source).toMatch(/\{\s*start:\s*'startSeq',\s*end:\s*'endSeq'\s*\}/)
    expect(source).not.toMatch(/\bstartSeq\s*:/)
    expect(source).not.toMatch(/\bendSeq\s*:/)
    expect(source).not.toMatch(/\.\s*startSeq\b/)
    expect(source).not.toMatch(/\.\s*endSeq\b/)
  })
})
