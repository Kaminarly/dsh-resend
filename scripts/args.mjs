/**
 * One way for the gate scripts to read their optional `--flag <value>` options,
 * so a missing value is a usage error naming the script instead of a TypeError
 * from somewhere further down.
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