/**
 * The runtime `surfaceOp` shape probe (spec §5.4, §13.1 #7).
 *
 * A replace op's endpoints are spelled differently by session-format
 * generation, and the two spellings are not interchangeable: the shipped v4
 * runtime accepts **exactly** `{ op, startSeq, endSeq }` and rejects the older
 * `{ op, start, end }` immediately and legibly (`session event "user/message"
 * carries an invalid replace surfaceOp`, spec §2.2, §16.8). The older spelling
 * survives only in stored logs of format ≤ v2, which the format migration
 * rewrites on load.
 *
 * So why probe at all? Because the spec keeps it as a guard against a *future*
 * runtime (§5.4: "this is a guard, not a requirement of the shipped host"), and
 * because a plugin that silently wrote the wrong shape on some later runtime
 * would corrupt a session instead of refusing. The rules that make it a guard
 * rather than decoration:
 *
 *  - the key names are **values** in one table here, and the object is built
 *    from whatever that table yields — never from a literal at the call site.
 *    The rule is scoped to this package's SHIPPED sources, which is what
 *    `test/shape-probe.test.mjs` holds the whole `src/` tree to: no other file
 *    there may spell either endpoint name as a string at all. Test fixtures
 *    still spell the shape by hand, deliberately — an expectation the code
 *    under test produced could not fail;
 *  - a probe whose detected names disagree with the **running** format is
 *    refused loudly, before anything is written (§5.4, §11's "Throw before
 *    writing. The host will not catch it for you.");
 *  - the probe is resolved at the write boundary rather than at import time: a
 *    throw while the Loader imports a plugin row would fail the fiber and take
 *    the whole renderer down (spec §3.1), while a throw before an append costs
 *    exactly one operation.
 *
 * What this module is NOT is the last line of defence, and it should not be read
 * as one. Its own agreement check compares the detected names with the names of
 * the format constant this plugin is running against, so on a runtime whose
 * spelling the table cannot know it would agree with itself and build the wrong
 * op. The load-bearing guard against that is one level up, in
 * `./write.js`: the planned pair is replayed through the host's own
 * `foldSurface` BEFORE the first append, and the host refuses a wrong spelling
 * there (`session event "user/message" carries an invalid replace surfaceOp`,
 * spec §2.2, §16.8) — so the audit claim is never orphaned by a shape the
 * running runtime rejects. `test/write-pair.test.mjs` drives exactly that: a
 * binding spelling the pre-v3 keys is refused by the host, with zero writes.
 */
import { SESSION_FORMAT_VERSION } from '@deepseek-ai/dsh-session'

/** The one op kind a replacement carries (spec §5.4). */
export const REPLACE_OP = 'replace'

/** The member name that selects that kind — the op's own key, not its value. */
export const OP_KEY = 'op'

/**
 * The format generation from which a replace op's endpoints are `startSeq` and
 * `endSeq` (spec §5.4): version ≥ 3 uses the dense spelling, earlier ones the
 * pre-v3 `start`/`end`.
 */
const DENSE_ENDPOINT_FORMAT = 3

/**
 * The endpoint key names, as values — the ONE place this package spells them.
 *
 * Order is by generation, newest first, and the entries are frozen so a caller
 * cannot mutate a shared table into a spelling the running host would reject.
 */
const ENDPOINT_NAMES = Object.freeze([
  Object.freeze({ start: 'startSeq', end: 'endSeq' }),
  Object.freeze({ start: 'start', end: 'end' }),
])

/**
 * The endpoint key names one session-format generation gives a replace op.
 * @param formatVersion - the session format version being probed.
 * @returns `{ start, end }`, the two key names for that generation.
 * @throws a `TypeError` when the version is not a non-negative safe integer —
 *   an unreadable version must not be guessed at.
 */
export function endpointKeys(formatVersion) {
  if (!Number.isSafeInteger(formatVersion) || formatVersion < 0) {
    throw new TypeError(`dsh-resend: a session format version must be a non-negative safe integer, got ${String(formatVersion)} (spec §5.4)`)
  }
  return formatVersion >= DENSE_ENDPOINT_FORMAT ? ENDPOINT_NAMES[0] : ENDPOINT_NAMES[1]
}

/**
 * The endpoint key names of the session format this process is running against.
 * @returns `{ start, end }` for {@link SESSION_FORMAT_VERSION}.
 */
export function runtimeEndpointKeys() {
  return endpointKeys(SESSION_FORMAT_VERSION)
}

/**
 * Refuse a probe that disagrees with the running format, and return the
 * binding the write uses.
 *
 * This is the whole guard: `endpointKeys` answers what a generation spells, and
 * this refuses any answer that is not what *this* runtime spells. On a pre-v3
 * runtime the legacy answer is the running one and the binding carries it; on
 * the shipped v4 runtime the legacy answer is a mismatch and this throws.
 * @param formatVersion - the version the caller detected (default: the running
 *   one, which is what the write path passes).
 * @returns `{ formatVersion, keys, replaceOp }` — `replaceOp` is the only
 *   constructor of a `surfaceOp` this plugin has.
 * @throws an `Error` naming both spellings when the detected keys are not the
 *   running runtime's.
 */
export function shapeBinding(formatVersion = SESSION_FORMAT_VERSION) {
  const detected = endpointKeys(formatVersion)
  const running = runtimeEndpointKeys()
  if (detected.start !== running.start || detected.end !== running.end) {
    throw new Error(
      `dsh-resend: the surfaceOp shape probe detected the format-${formatVersion} spelling (${detected.start}/${detected.end}) ` +
        `but this runtime is format ${SESSION_FORMAT_VERSION} (${running.start}/${running.end}); refusing to build a surfaceOp the running host would reject (spec §5.4)`,
    )
  }

  /**
   * Build one replace op from the detected key names, with both endpoints
   * validated as the host's own contract requires (§5.4: non-negative safe
   * integers).
   * @param startSeq - the range's first surface node.
   * @param endSeq - the range's last surface node.
   * @returns exactly three keys: `op`, and the two names from this binding.
   * @throws a `TypeError` naming the offending endpoint.
   */
  const replaceOp = (startSeq, endSeq) => {
    for (const [name, value] of [[running.start, startSeq], [running.end, endSeq]]) {
      if (!Number.isSafeInteger(value) || value < 0) {
        throw new TypeError(`dsh-resend: ${name} must be a non-negative safe integer, got ${String(value)} (spec §5.4)`)
      }
    }
    return Object.freeze({ [OP_KEY]: REPLACE_OP, [running.start]: startSeq, [running.end]: endSeq })
  }

  return Object.freeze({ formatVersion: SESSION_FORMAT_VERSION, keys: running, replaceOp })
}

/**
 * The shape binding for the running session format.
 *
 * Memoised, and deliberately resolved on first use rather than at import: the
 * probe must be able to throw before a write without failing plugin activation.
 * @returns the frozen binding from {@link shapeBinding}.
 */
let memoisedBinding
export function runtimeShapeBinding() {
  return (memoisedBinding ??= shapeBinding())
}
