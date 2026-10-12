import { build } from 'esbuild'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = fileURLToPath(new URL('.', import.meta.url))
await mkdir(path.join(root, 'dist'), { recursive: true })
const result = await build({
  absWorkingDir: root, entryPoints: ['editor.js'], outfile: 'dist/editor.bundle.js',
  bundle: true, format: 'cjs', platform: 'browser', target: 'es2022', metafile: true,
  legalComments: 'none',
  banner: { js: '/* 隔离原型；不接入真实会话。依赖许可见 THIRD-PARTY-LICENSES.txt。 */\nwindow.__ModuleLoader__.load({id: "dsh-rich-input-feasibility", factory: (require) => {\nvar module = {exports: {}}; var exports = module.exports;' },
  footer: { js: 'Object.defineProperty(module.exports, Symbol.toStringTag, {value: "Module"}); return module.exports; }});' },
})
await writeFile(path.join(root, 'dist/metafile.json'), JSON.stringify(result.metafile, null, 2))
const imports = Object.values(result.metafile.outputs).flatMap(output => output.imports)
if (imports.length) throw new Error('原型不应依赖宿主模块表：' + JSON.stringify(imports))
const lock = JSON.parse(await readFile(path.join(root, 'package-lock.json'), 'utf8'))
const notices = []
for (const [location, dependency] of Object.entries(lock.packages)) {
  if (!location || dependency.dev) continue
  const pkg = JSON.parse(await readFile(path.join(root, location, 'package.json'), 'utf8'))
  const license = await readFile(path.join(root, location, 'LICENSE'), 'utf8')
  notices.push(`${pkg.name}@${pkg.version}\n${license}`)
}
await writeFile(path.join(root, 'dist/THIRD-PARTY-LICENSES.txt'), notices.join('\n\n'))
console.log('编辑器已打包；外部模块依赖：0；依赖许可：' + notices.length)
