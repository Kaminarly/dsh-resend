#!/usr/bin/env node
/**
 * Rebuild every file under `lib/` from `src/`.
 *
 * `lib/` is committed, so this script must be deterministic: a pinned esbuild
 * version, no source maps, no legal-comment extraction, no absolute paths, and
 * LF output. CI proves the committed bytes are honest with
 * `git diff --exit-code -- lib/` immediately after this script runs.
 *
 * Usage: node scripts/build.mjs [outDir]   (default: lib)
 */
import { build } from 'esbuild'
import { mkdir, readFile, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const rootDir = fileURLToPath(new URL('..', import.meta.url))
const outDir = path.resolve(process.argv[2] ?? path.join(rootDir, 'lib'))

const pkg = JSON.parse(await readFile(path.join(rootDir, 'package.json'), 'utf8'))

/** §13.5 #32: generated files say so and name their source. */
const generatedBanner = (source) =>
  `/* GENERATED FILE — do not edit by hand; built from ${source} by scripts/build.mjs */`

/**
 * The client half's loader-entry wrapper. A bundle is a classic script that
 * registers one factory; the factory is factory-form CJS and returns its module
 * exports (dsh-client-modules materializes it with the module-table `require`).
 *
 * Only the footer touches `module.exports`: esbuild's own CJS conversion
 * reassigns it (`module.exports = __toCommonJS(exports)`), so a tag set on the
 * banner's `exports` object would be discarded.
 */
const clientBanner = `${generatedBanner('src/client.js')}
window.__ModuleLoader__.load({
\tid: ${JSON.stringify(pkg.name)},
\tfactory: (require) => {
\t\tvar module = { exports: {} };
\t\tvar exports = module.exports;
`

const clientFooter = `
\t\tObject.defineProperty(module.exports, Symbol.toStringTag, { value: "Module" });
\t\treturn module.exports;
\t}
});
`

/**
 * Node-side faces, emitted as plain ESM with host packages left as imports.
 * The descriptor *client* face is one of them: it is an ES module the host
 * runtime loads (`exports["./typert-client"]`), not browser code — the name
 * says which half mounts it, not which runtime executes it.
 *
 * `host.js`, `log-read.js` and `resolve.js` are emitted as their own artifacts,
 * and kept EXTERNAL in the others, for reasons that are not packaging taste:
 *
 *  - `log-read.js` is the one module allowed to read the host's raw event list,
 *    and `scripts/check-host-contract.mjs` enforces that by exempting exactly
 *    that path (spec §12). Inlining it into `lib/index.js` would exempt the
 *    whole host half instead, turning a scoped invariant into a permanent hole.
 *  - `host.js` and `resolve.js` are separate concerns with separate readers: the
 *    host-access utilities are shared by every reader, and the resolver is the
 *    seam the suite drives and the write (ticket 04) consumes, so neither
 *    belongs inside the plugin's entry face. Inlining `host.js` would also ship
 *    the same utilities inside two artifacts.
 *
 * All three are internal siblings, not export faces, so they are deliberately
 * absent from `exports` in package.json.
 */
const ESM_ENTRIES = [
  { entry: 'src/index.js', out: 'index.js', external: ['./host.js', './log-read.js', './resolve.js'] },
  { entry: 'src/host.js', out: 'host.js' },
  { entry: 'src/log-read.js', out: 'log-read.js', external: ['./host.js'] },
  { entry: 'src/resolve.js', out: 'resolve.js', external: ['./host.js', './log-read.js'] },
  { entry: 'src/typert.host.js', out: 'typert.host.js' },
  { entry: 'src/typert.client.js', out: 'typert.client.js' },
]

await rm(outDir, { recursive: true, force: true })
await mkdir(outDir, { recursive: true })

/** Client half → self-registering loader entry (classic script, factory-form CJS). */
await build({
  entryPoints: [path.join(rootDir, 'src/client.js')],
  outfile: path.join(outDir, 'client.bundle.js'),
  absWorkingDir: rootDir,
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  legalComments: 'none',
  banner: { js: clientBanner },
  footer: { js: clientFooter },
})

for (const { entry, out, external } of ESM_ENTRIES) {
  await build({
    entryPoints: [path.join(rootDir, entry)],
    outfile: path.join(outDir, out),
    absWorkingDir: rootDir,
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node22',
    packages: 'external',
    ...(external === undefined ? {} : { external }),
    legalComments: 'none',
    banner: { js: generatedBanner(entry) },
  })
}

console.log(`build: wrote ${path.relative(rootDir, outDir) || '.'} — ${['client.bundle.js', ...ESM_ENTRIES.map((face) => face.out)].sort().join(', ')}`)
