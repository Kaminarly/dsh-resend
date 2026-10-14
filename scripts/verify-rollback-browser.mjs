/** Real temporary files + shipped host gateway + installed Desktop browser controls.
 * The agent double accepts or refuses a prompt without invoking an external model.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { syncBuiltinESMExports } from 'node:module'
import { createHash } from 'node:crypto'
import { chromium } from 'playwright'
import { Session } from '@deepseek-ai/dsh-session'
import { startPreviewServer } from './preview-ui.mjs'
import { hostComposition, dispatchToHost } from '../test/helpers/gateway.mjs'
import { hostState, agentDoubles, SESSION_ID, sessionFixture, auditCount } from '../test/helpers/host.mjs'

const output = new URL('../output/playwright/',import.meta.url)
await fs.mkdir(output,{recursive:true})
const browser = await chromium.launch({channel:process.env.ROLLBACK_BROWSER_CHANNEL ?? 'msedge',headless:true})
const checks=[], errors=[]
let activeFault, saveFault
const originalRename=fs.rename
// Faults live at the filesystem boundary, and only target this run's workspace.
fs.rename=async (from,to)=>{ await saveFault?.(from,to); await originalRename(from,to); await activeFault?.(to) }
syncBuiltinESMExports()

async function workspace(entry,{agent='accepting',boundaries=false,empty=false,noFiles=false}={}) {
  const home=await fs.mkdtemp(path.join(tmpdir(),'rollback-browser-'))
  const cwd=path.join(home,'work'),dataHome=path.join(home,'data')
  await fs.mkdir(cwd)
  const session=Session.create(SESSION_ID,sessionFixture().snapshotEvents(),{version:4,id:SESSION_ID,createdAt:0,isSeeded:false,cwd})
  const state=hostState({session,agent:entry==='history'?'deaf':agent})
  let host=await hostComposition({host:state,dataHome})
  const hosts=[host],calls=[]
  let sequence=0
  const before=new Map(),after=new Map()
  async function file(name,original,current) {
    before.set(name,original);after.set(name,current)
    if(original!==null) await fs.writeFile(path.join(cwd,name),original)
    const callId=`browser-write-${++sequence}`,args={file_path:name,content:current}
    const call=session.append('tool/call',{turn:1,step:1,callId,name:'write',arguments:JSON.stringify(args)})
    await host.ctx.waterfall('tools/execute',{name:'write',callId,arguments:args,agent:{session}},async()=>{
      await fs.writeFile(path.join(cwd,name),current)
      return {isError:false,value:{before:original?.replace(/^\ufeff/,'').replaceAll('\r\n','\n') ?? null,after:current}}
    })
    session.append('tool/result',{turn:1,step:1,message:{role:'tool',id:`browser-result-${sequence}`,toolCallId:callId,
      source:{kind:'tool',callId},content:[{type:'text',text:'written'}],isError:false}},{surfaceOp:'append',sourceEventSeqs:[call.seq]})
  }
  if(boundaries) {
    const sized=n=>('a'.repeat(1023)+'\n').repeat(Math.floor(n/1024))+'a'.repeat(n%1024)
    for(const [name,text] of [['bytes-equal.txt',sized(3145728)],['bytes-above.txt',sized(3145729)],
      ['lines-equal.txt','行\n'.repeat(10000)],['lines-above.txt','行\n'.repeat(10001)],
      ['unicode-equal.txt','😀'.repeat(20000)],['unicode-above.txt','😀'.repeat(20001)]]) await file(name,'',text)
  } else if(!noFiles) {
    await file('a.txt','\ufeff原始中文 A\r\n','当前 A\n')
    await file('b.txt','原始中文 B','当前 B')
    await file('new.txt',null,empty?'':'新增文件内容')
  }
  let carrierSeq
  if(entry==='history') {
    const wire=await dispatchToHost(host,'resend/apply',{request:{sessionId:SESSION_ID,targetSeq:2,op:'edit',text:'历史验收消息'}})
    assert.equal(wire.value.ok,true,JSON.stringify(wire));carrierSeq=wire.value.value.carrierSeq
  }
  const initialFollowups=state.calls.followups,initialAudits=auditCount(session)
  const uis=[]
  const makeUI=async receiver=>{
  const ui=await startPreviewServer({port:0,clientBundlePath:process.env.ROLLBACK_CLIENT_BUNDLE_PATH,fixture:{sessionId:SESSION_ID,carrierSeq},invoke:async(method,request)=>{
    const owner=request.sessionId ?? request.request?.sessionId
    assert.equal(owner,SESSION_ID)
    const wire=await dispatchToHost(receiver(),`resend/${method}`,{request})
    calls.push({method,request,result:wire})
    return wire
  }})
  uis.push(ui);return ui
  }
  const ui=await makeUI(()=>host)
  const pages=[]
  async function open({independent=false}={}) {
    let target=ui
    if(independent) {
      const secondary=await hostComposition({host:state,dataHome});hosts.push(secondary)
      target=await makeUI(()=>secondary)
    }
    const page=await browser.newPage({viewport:{width:1024,height:900}});pages.push(page)
    page.on('pageerror',error=>errors.push(error.message))
    page.on('console',message=>{if(['error','warning'].includes(message.type()))errors.push(message.text())})
    await page.goto(target.url)
    await page.getByRole('button',{name:entry==='history'?/^(预览回滚|重新预览)$/: '打开重发前面板',exact:entry!=='history'}).click()
    const panel=entry==='history'?page.locator('.dsh-resend-rollback').first():page.locator('.dsh-resend-preflight-overlay')
    if(noFiles) await page.waitForFunction(()=>window.uiFixture.operations.recordsFor('session-1').length>0)
    else await panel.locator('li[data-path]').first().waitFor()
    return {page,panel}
  }
  const disk=async name=>fs.readFile(path.join(cwd,name)).catch(e=>{if(e.code==='ENOENT')return null;throw e})
  const select=async(panel,names)=>{
    for(const row of await panel.locator('li[data-path]').all()) {
      const input=row.locator('input');if(await input.count() && await input.isEnabled()) await input.setChecked(names.includes(await row.getAttribute('data-path')))
    }
  }
  const restore=async panel=>panel.getByRole('button',{name:entry==='history'?/^还原 \d+ 个文件$/:/^还原 \d+ 个文件并继续$/}).click()
  const close=async panel=>panel.getByRole('button',{name:entry==='history'?'取消':'取消重发',exact:true}).click()
  const latest=()=>calls.filter(c=>c.method===(entry==='history'?'rollback':'replay') && ['execute','restore'].includes(c.request.phase)).at(-1)?.result.value
  return {home,cwd,state,session,calls,open,disk,select,restore,close,latest,before,after,initialFollowups,initialAudits,
    restart:async()=>{await host.ctx.fiber.dispose();host=await hostComposition({host:state,dataHome});hosts.push(host)},
    finish:async()=>{activeFault=undefined;saveFault=undefined;for(const p of pages)await p.close();for(const ui of uis)await ui.close();for(const h of hosts)await h.ctx.fiber.dispose();await fs.rm(home,{recursive:true,force:true})}}
}

async function check(entry,name,run,options) {
  const w=await workspace(entry,options)
  try {
    await run(w)
    checks.push({entry,name,calls:w.calls,followups:w.state.calls.followups-w.initialFollowups,audits:auditCount(w.session)-w.initialAudits})
    console.log(`PASS ${entry}: ${name}`)
  } catch(error) {
    console.error(JSON.stringify({entry,name,calls:w.calls,errors},null,2))
    throw error
  } finally {await w.finish()}
}

try {
  for(const entry of ['history','preflight']) {
    await check(entry,'子集还原与真实结果',async w=>{
      const {page,panel}=await w.open();await w.select(panel,['a.txt'])
      await panel.locator('li[data-path="b.txt"]').getByRole('button',{name:'查看差异'}).click()
      await page.getByText('当前 B',{exact:true}).waitFor();await page.keyboard.press('Escape')
      assert.equal(await panel.locator('li[data-path="b.txt"] input').isChecked(),false)
      await w.restore(panel)
      await page.waitForFunction(()=>!document.querySelector('.dsh-resend-preflight-overlay') &&
        (window.uiFixture.operations.recordsFor('session-1').length || document.querySelector('.dsh-resend-rollback-restored')))
      assert.deepEqual(await w.disk('a.txt'),Buffer.from(w.before.get('a.txt')))
      assert.deepEqual(await w.disk('b.txt'),Buffer.from('当前 B'))
      assert.deepEqual(await w.disk('new.txt'),Buffer.from('新增文件内容'))
      assert.equal(w.state.calls.followups-w.initialFollowups,entry==='history'?0:1)
      const result=w.latest();assert.equal(result.ok,true,JSON.stringify(result))
      if(entry==='history') assert.deepEqual(result.value.files.map(f=>f.action),['restored','kept','kept'])
    })
    for(const empty of [false,true]) await check(entry,empty?'删除新增空文件':'删除新增文件',async w=>{
      const {page,panel}=await w.open();await w.select(panel,['new.txt'])
      await panel.locator('li[data-path="new.txt"]').getByRole('button',{name:'查看差异'}).click()
      await page.getByText('还原后将删除此文件',{exact:true}).last().waitFor();await page.keyboard.press('Escape')
      await w.restore(panel)
      await page.waitForFunction(()=>!document.querySelector('.dsh-resend-preflight-overlay') &&
        (window.uiFixture.operations.recordsFor('session-1').length || document.querySelector('.dsh-resend-rollback-restored')))
      assert.equal(await w.disk('new.txt'),null)
      assert.deepEqual(await w.disk('a.txt'),Buffer.from('当前 A\n'))
    },{empty})
    await check(entry,'零选关闭保留文件和草稿',async w=>{
      const {page,panel}=await w.open();await w.select(panel,[])
      await page.evaluate(()=>window.uiFixture.operations.saveDraft({sessionId:'session-1',targetSeq:2},{sourceText:'历史原文',text:'编辑草稿'}))
      assert.equal(await panel.getByRole('button',{name:/^还原 \d+/}).count(),0)
      await w.close(panel)
      assert.deepEqual(await w.disk('a.txt'),Buffer.from('当前 A\n'))
      assert.equal(w.state.calls.followups,w.initialFollowups)
      assert.equal(auditCount(w.session),w.initialAudits)
      assert.equal(await page.evaluate(()=>window.uiFixture.operations.draftFor({sessionId:'session-1',targetSeq:2},'历史原文').text),'编辑草稿')
    })
    await check(entry,'选中内容变化拒绝执行',async w=>{
      const {panel}=await w.open();await w.select(panel,['a.txt'])
      await fs.writeFile(path.join(w.cwd,'a.txt'),'用户新修改')
      await w.restore(panel);await panel.getByRole('alert').waitFor()
      assert.equal(w.latest().error.code,'preview-stale')
      assert.deepEqual(await w.disk('a.txt'),Buffer.from('用户新修改'))
      assert.equal(w.state.calls.followups,w.initialFollowups)
      assert.equal(auditCount(w.session),w.initialAudits)
    })
    await check(entry,'部分失败、另一窗口与重启恢复',async w=>{
      const first=await w.open();await w.select(first.panel,['a.txt','b.txt'])
      const other=await w.open({independent:true})
      activeFault=async target=>{if(target===path.join(w.cwd,'a.txt')) await fs.writeFile(path.join(w.cwd,'b.txt'),'执行期间外部修改')}
      await w.restore(first.panel);await first.panel.getByRole('alert').waitFor();activeFault=undefined
      assert.equal(w.latest().error.code,'execution-stopped')
      assert.deepEqual(await w.disk('a.txt'),Buffer.from(w.before.get('a.txt')))
      assert.equal(w.state.calls.followups,w.initialFollowups)
      await fs.writeFile(path.join(w.cwd,'b.txt'),'当前 B')
      await w.restart()
      const restarted=await w.open()
      assert.equal(await restarted.panel.locator('li[data-path="a.txt"] input').isEnabled(),false)
      assert.equal(await restarted.panel.locator('li[data-path="b.txt"] input').isChecked(),true)
      assert.equal(await restarted.panel.locator('li[data-path="new.txt"] input').isChecked(),false)
      await other.panel.getByRole('button',{name:'重新预览',exact:true}).click()
      await other.page.waitForFunction(()=>{
        const root=document.querySelector('.dsh-resend-preflight-overlay') ?? document.querySelector('.dsh-resend-rollback')
        return root.querySelector('li[data-path="a.txt"] input')?.disabled && root.querySelector('li[data-path="new.txt"] input')?.checked===false
      })
      assert.equal(await other.panel.locator('li[data-path="new.txt"] input').isChecked(),false)
      if(entry==='history') {
        await w.select(restarted.panel,[]);await w.close(restarted.panel)
        assert.equal(auditCount(w.session),w.initialAudits)
      } else {
        await w.select(restarted.panel,[])
        await restarted.panel.getByRole('button',{name:'保留剩余文件并继续',exact:true}).click()
        await restarted.page.locator('.dsh-resend-preflight-overlay').waitFor({state:'detached'})
        assert.equal(w.state.calls.followups-w.initialFollowups,1)
        assert.deepEqual(await w.disk('b.txt'),Buffer.from('当前 B'))
      }
    })
    await check(entry,'正文大小、行数和 Unicode 边界',async w=>{
      const {page,panel}=await w.open()
      for(const [name,reason] of [['bytes-equal.txt',null],['bytes-above.txt','两个版本合计超过 3 MiB。'],
        ['lines-equal.txt',null],['lines-above.txt','任一版本超过 10,000 行。'],
        ['unicode-equal.txt',null],['unicode-above.txt','任一单行超过 20,000 个 Unicode 码点。']]) {
        await panel.locator(`li[data-path="${name}"]`).getByRole('button',{name:'查看差异'}).click()
        if(reason) await page.getByText(reason,{exact:true}).waitFor()
        else await page.locator('.dsh-resend-content-line').first().waitFor()
        const value=w.calls.filter(c=>c.method==='content').at(-1).result.value.value
        assert.equal(value.status,reason?'unavailable':'ready')
        await page.keyboard.press('Escape')
        assert.equal(await panel.locator(`li[data-path="${name}"] input`).isChecked(),true)
      }
      assert.equal(w.state.calls.followups,w.initialFollowups)
      assert.equal(auditCount(w.session),w.initialAudits)
    },{boundaries:true})
  }
  await check('preflight','零选保留全部文件并继续',async w=>{
    const {page,panel}=await w.open();await w.select(panel,[])
    await panel.getByRole('button',{name:'保留当前文件并继续',exact:true}).click()
    await panel.waitFor({state:'detached'})
    assert.equal(w.state.calls.followups-w.initialFollowups,1)
    assert.deepEqual(await w.disk('a.txt'),Buffer.from('当前 A\n'))
    assert.deepEqual(await w.disk('new.txt'),Buffer.from('新增文件内容'))
    assert.equal(await page.evaluate(()=>window.uiFixture.operations.recordsFor('session-1')[0].status),'queued')
  })
  await check('preflight','无文件改动直接发送',async w=>{
    const {panel}=await w.open()
    assert.equal(await panel.count(),0)
    assert.equal(w.state.calls.followups-w.initialFollowups,1)
    assert.equal(auditCount(w.session)-w.initialAudits,1)
  },{noFiles:true})
  await check('preflight','结果保存失败停止发送且不重复还原',async w=>{
    const {page,panel}=await w.open();await w.select(panel,['a.txt'])
    saveFault=async (from,to)=>{
      if(String(to).startsWith(path.join(w.home,'data')) && String(to).includes(`${path.sep}outcomes${path.sep}`)) {
        const saved=JSON.parse(await fs.readFile(from,'utf8'))
        if(saved.ok===true || saved.kind==='file-rollback-result') throw new Error('验收模拟结果保存失败')
      }
    }
    await w.restore(panel);await panel.getByRole('alert').waitFor();saveFault=undefined
    assert.equal(w.latest().error.code,'result-save-failed')
    assert.equal(w.state.calls.followups,w.initialFollowups)
    assert.deepEqual(await w.disk('a.txt'),Buffer.from(w.before.get('a.txt')))
    await fs.writeFile(path.join(w.cwd,'a.txt'),'保存失败后用户修改')
    await panel.getByRole('button',{name:'重新预览',exact:true}).click()
    await panel.getByText('已还原',{exact:true}).waitFor()
    assert.equal(await panel.locator('li input').count(),0)
    await panel.getByRole('button',{name:'保留剩余文件并继续',exact:true}).click()
    await panel.waitFor({state:'detached'})
    assert.deepEqual(await w.disk('a.txt'),Buffer.from('保存失败后用户修改'))
    assert.equal(w.state.calls.followups-w.initialFollowups,1)
  })
  await check('preflight','发送失败补发不重复还原',async w=>{
    const {page,panel}=await w.open();await w.select(panel,['a.txt']);await w.restore(panel)
    await page.getByText('历史已被重写，但重发失败：agent 没有接收这条提示词。',{exact:true}).waitFor()
    await fs.writeFile(path.join(w.cwd,'a.txt'),'文件成功后用户修改')
    w.state.agent=agentDoubles(w.state).accepting()
    await page.getByRole('button',{name:'重新发送',exact:true}).click()
    await page.waitForFunction(()=>window.uiFixture.operations.recordsFor('session-1')[0].status!=='resend-failed')
    assert.deepEqual(await w.disk('a.txt'),Buffer.from('文件成功后用户修改'))
    assert.deepEqual(await w.disk('b.txt'),Buffer.from('当前 B'))
    assert.equal(w.state.calls.followups-w.initialFollowups,2)
    assert.equal(auditCount(w.session)-w.initialAudits,1)
  },{agent:'deaf'})
  assert.deepEqual(errors,[])
  const hashes={}
  for(const file of ['client.bundle.js','index.js','host.js']) hashes[file]=createHash('sha256').update(await fs.readFile(file==='client.bundle.js' && process.env.ROLLBACK_CLIENT_BUNDLE_PATH ? process.env.ROLLBACK_CLIENT_BUNDLE_PATH : new URL(`../lib/${file}`,import.meta.url))).digest('hex')
  await fs.writeFile(new URL('rollback-browser-result.json',output),JSON.stringify({hashes,checks,errors,externalGeneration:false},null,2))
  console.log(`真实文件与浏览器组合验收通过：${checks.length} 个场景。`)
} finally {activeFault=undefined;saveFault=undefined;fs.rename=originalRename;syncBuiltinESMExports();await browser.close()}
