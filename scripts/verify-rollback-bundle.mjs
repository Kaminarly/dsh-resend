/** Pack, compare and exercise the exact delivery bytes without replacing a user installation. */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile, readdir, copyFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root=fileURLToPath(new URL('..',import.meta.url))
const npmCLI=process.env.npm_execpath
if(!npmCLI) throw new Error('请使用 npm run acceptance:rollback:bundle 运行交付检查')
const output=path.join(root,'output/rollback-release',new Date().toISOString().replace(/[:.]/g,'-'))
await mkdir(output,{recursive:true})
const run=(args,env={})=>execFileSync(process.execPath,args,{cwd:root,env:{...process.env,...env},encoding:'utf8',stdio:['ignore','pipe','pipe']})
for(const command of ['build','check']) {
  const log=run([npmCLI,'run',command]);await writeFile(path.join(output,`${command}.log`),log);console.log(log.trim())
}
const rebuilt=path.join(output,'rebuilt')
run(['scripts/build.mjs',rebuilt])
for(const name of await readdir(path.join(root,'lib'))) assert.deepEqual(await readFile(path.join(root,'lib',name)),await readFile(path.join(rebuilt,name)),`重新构建不一致：${name}`)
const [packed]=JSON.parse(run([npmCLI,'pack','--json','--pack-destination',output]))
const archive=path.join(output,packed.filename),extracted=path.join(output,'extracted')
await mkdir(extracted)
execFileSync('tar',['-xzf',archive,'-C',extracted],{cwd:root,stdio:'pipe'})
const hashes={}
for(const file of packed.files) {
  assert.match(file.path,/^(?:lib\/[^/]+\.(?:js|txt)|package\.json|cordis\.patch\.yml|README\.md|LICENSE)$/)
  const original=await readFile(path.join(root,file.path)),shipped=await readFile(path.join(extracted,'package',file.path))
  assert.deepEqual(shipped,original,`安装包与工作区不一致：${file.path}`)
  hashes[file.path]=createHash('sha256').update(shipped).digest('hex')
}
const bundle=path.join(extracted,'package/lib/client.bundle.js')
for(const kind of ['visual','browser']) {
  const log=run([`scripts/verify-rollback-${kind}.mjs`],{ROLLBACK_CLIENT_BUNDLE_PATH:bundle})
  await writeFile(path.join(output,`${kind}.log`),log);console.log(log.trim())
}
const visual=JSON.parse(await readFile(path.join(root,'output/playwright/rollback-visual-result.json'),'utf8'))
const browser=JSON.parse(await readFile(path.join(root,'output/playwright/rollback-browser-result.json'),'utf8'))
assert.equal(visual.bundleHash,hashes['lib/client.bundle.js'])
for(const [name,hash] of Object.entries(browser.hashes)) assert.equal(hash,hashes[`lib/${name}`])
const evidenceDir=path.join(output,'evidence')
await mkdir(evidenceDir)
const screenshots=[]
for(const name of visual.screenshots) {
  assert.match(name,/^delivery-(?:list|diff|stacked|native|state|scaled|long-path)-[^/\\]+\.png$/)
  await copyFile(path.join(root,'output/playwright',name),path.join(evidenceDir,name));screenshots.push(name)
}
await writeFile(path.join(evidenceDir,'visual.json'),JSON.stringify(visual,null,2)+'\n')
await writeFile(path.join(evidenceDir,'browser.json'),JSON.stringify(browser,null,2)+'\n')
const manifest={createdAt:new Date().toISOString(),sourceHead:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),
  worktreeDirty:execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim()!=='',
  archive,archiveSha256:createHash('sha256').update(await readFile(archive)).digest('hex'),hashes,screenshots,
  host:visual.host,layoutChecks:visual.checks.length,contrastMinimum:Math.min(...visual.contrasts.map(c=>c.minimum)),
  browserScenarios:browser.checks.map(c=>({entry:c.entry,name:c.name})),
  verified:['build','strict contracts','deterministic rebuild','all packed files match checkout bytes','extracted client browser acceptance'],
  limits:{installedIntoUserProfile:false,externalModelRequests:0,files:'isolated temporary workspaces',
    agent:'accepting/refusing service double',transport:'local HTTP to shipped strict gateway',
    hostModule:'checkout host bytes match extracted package',crossWindow:'independent pages and independent host compositions',
    restart:'host composition recreated against saved progress; no operating-system restart'}}
await writeFile(path.join(output,'acceptance.json'),JSON.stringify(manifest,null,2)+'\n')
console.log(`交付包与证据：${output}`)
