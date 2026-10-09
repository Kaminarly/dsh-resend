/**
 * One way for the gate scripts to read their optional `--flag <value>` options
 * and to refuse the rest, so a missing value or a mistyped flag is a usage error
 * naming the script instead of a TypeError from somewhere further down, or —
 * worse for a gate — a silently ignored option.
 */

/**
 * Read a `--flag <value>` option from an argument list.
 * @param argv - arguments after the script name.
 * @param flag - the flag to look for, e.g. `--faces`.
 * @param options - `bin` names the script in the diagnostic; `fallback` is
 *   returned when the flag is absent.
 * @returns the value, or the fallback.
 */
export function optionValue(argv, flag, { bin, fallback }) {
  const index = argv.indexOf(flag)
  if (index === -1) return fallback
  const value = argv[index + 1]
  if (value === undefined || value.startsWith('--')) {
    console.error(`${bin}: FAIL — ${flag} needs a value`)
    process.exit(2)
  }
  return value
}

/**
 * Exit with a usage error when the command line carries an option this gate does
 * not take.
 *
 * A gate that ignores an unknown flag is a gate whose behaviour a caller thinks
 * they changed and did not — the reason each gate exits 2 rather than carrying
 * on. The value of a `valued` option is skipped, so `--faces <dir>` is not read
 * as two arguments; a value that is itself an option (`--faces --oops`) is then
 * refused by {@link optionValue}, which needs a value.
 * @param argv - arguments after the script name.
 * @param options - `bin` names the script; `known` is every accepted option;
 *   `valued` is the subset that takes a following value; `usage` is appended to
 *   the diagnostic so the caller sees what is accepted.
 */
export function rejectUnknownOptions(argv, { bin, known, valued = [], usage }) {
  for (const [index, argument] of argv.entries()) {
    if (valued.includes(argv[index - 1])) continue // the previous option's value
    if (!argument.startsWith('--') || known.includes(argument)) continue
    console.error(`${bin}: FAIL — unknown option ${argument}${usage === undefined ? '' : ` (${usage})`}`)
    process.exit(2)
  }
}
