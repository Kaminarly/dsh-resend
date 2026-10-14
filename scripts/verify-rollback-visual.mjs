/** Reproducible visual acceptance with the installed Desktop controls and theme. */
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { startPreviewServer } from './preview-ui.mjs'

const output = new URL('../output/playwright/', import.meta.url)
await mkdir(output, { recursive: true })
const clientBundlePath=process.env.ROLLBACK_CLIENT_BUNDLE_PATH
const fixture = await startPreviewServer({ port: 0, clientBundlePath })
const browser = await chromium.launch({ channel: process.env.ROLLBACK_BROWSER_CHANNEL ?? 'msedge', headless: true })
const checks = [], errors = [], contrasts = [], screenshots = []
const bundleHash = createHash('sha256').update(await readFile(clientBundlePath ?? new URL('../lib/client.bundle.js', import.meta.url))).digest('hex')

async function screenshot(surface,name) {
  await surface.screenshot({path:new URL(name,output).pathname.replace(/^\/([A-Z]:)/,'$1')})
  screenshots.push(name)
}

async function layout(page, label, dialog = false) {
  const result = await page.evaluate(dialog => {
    const content = document.querySelector('.dsh-resend-content-dialog')
    const body = content?.querySelector('.dsh-resend-content-body')
    const bounds = node => { const r = node.getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width, height:r.height, right:r.right, bottom:r.bottom } }
    return { width:innerWidth, height:innerHeight, scrollWidth:document.documentElement.scrollWidth,
      dialog:content && bounds(content), body:body && bounds(body), bodyScrollWidth:body?.scrollWidth,
      close:content && bounds(content.querySelector('button')),
      rows:dialog ? [] : [...document.querySelectorAll('.dsh-resend-rollback-file')].map(row => ({
        row:bounds(row), parts:[...row.children].map(bounds),
      })) }
  }, dialog)
  assert.ok(result.scrollWidth <= result.width, `${label}: 页面横向溢出`)
  if (dialog) {
    assert.ok(result.dialog.x >= 0 && result.dialog.right <= result.width + 1, `${label}: 弹窗超出宽度`)
    assert.ok(result.dialog.y >= 0 && result.dialog.bottom <= result.height + 1, `${label}: 弹窗超出高度`)
    assert.ok(result.close.y >= 0 && result.close.bottom <= result.height, `${label}: 关闭入口被裁切`)
    assert.ok(result.body.height >= Math.min(260, result.height * .35), `${label}: 正文空间不足`)
  } else for (const row of result.rows) for (const part of row.parts) {
    assert.ok(part.x >= row.row.x - 1 && part.right <= row.row.right + 1, `${label}: 文件行内容超出边界`)
  }
  checks.push({ label, ...result })
}

async function contrast(page, label) {
  const samples = await page.evaluate(() => {
    const rgba = value => {
      const channels=(value.match(/[\d.]+/g) ?? []).map(Number)
      return value.startsWith('color(srgb ') ? channels.map((v,i)=>i<3?v*255:v) : channels
    }
    const blend = (front, back) => { const a = front[3] ?? 1; return front.slice(0,3).map((v,i)=>v*a+back[i]*(1-a)) }
    const luminance = rgb => rgb.map(v=>{ const x=v/255; return x<=.04045?x/12.92:((x+.055)/1.055)**2.4 }).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0)
    const selectors = ['.dsh-resend-rollback-filename','.dsh-resend-rollback-path','.dsh-resend-rollback-reason',
      '.dsh-resend-rollback-file-status','.dsh-resend-rollback-summary','.dsh-resend-content-version',
      '.dsh-resend-content-number','.dsh-resend-content-mark','.dsh-resend-content-line code',
      '.dsh-resend-content-legend','.dsh-resend-rollback-actions button']
    return selectors.flatMap(selector => [...document.querySelectorAll(selector)].filter(node=>node.textContent.trim() && node.getClientRects().length && !node.disabled).map(node=>{
      const parents=[]; for(let p=node;p;p=p.parentElement) parents.unshift(p)
      let background = [255,255,255]
      for(const p of parents) background=blend(rgba(getComputedStyle(p).backgroundColor),background)
      const foreground=blend(rgba(getComputedStyle(node).color),background)
      const a=luminance(foreground),b=luminance(background)
      return {selector, text:node.textContent.slice(0,60), ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)}
    }))
  })
  assert.ok(samples.length > 0)
  const minimum = Math.min(...samples.map(s=>s.ratio))
  assert.ok(minimum >= 4.5, `${label}: 对比度不足 ${JSON.stringify(samples.filter(s=>s.ratio<4.5))}`)
  contrasts.push({ label, minimum, samples })
}

try {
  for (const dark of [false,true]) for (const width of [375,768,1024,1440]) {
    const page = await browser.newPage({ viewport:{width,height:900} })
    page.on('pageerror', error=>errors.push(error.message))
    page.on('console', message=>{ if (['error','warning'].includes(message.type())) errors.push(message.text()) })
    const label = `${dark?'dark':'light'}-${width}`
    await page.goto(fixture.url + '/?contentPreview' + (dark?'&dark':''))
    await page.getByRole('button',{name:'预览回滚',exact:true}).click()
    const panel=page.locator('.dsh-resend-rollback').first()
    await panel.getByRole('button',{name:'查看差异'}).first().waitFor()
    await layout(page, `${label}-all`)
    await screenshot(panel,`delivery-list-${label}.png`)
    await panel.locator('.dsh-resend-rollback-check-label input').first().uncheck()
    assert.equal(await panel.locator('.dsh-resend-rollback-select-all input').evaluate(n=>n.indeterminate),true)
    await layout(page,`${label}-partial`)
    await panel.locator('.dsh-resend-rollback-select-all input').check()
    await panel.locator('.dsh-resend-rollback-select-all input').uncheck()
    assert.equal(await panel.getByRole('button',{name:/^还原 \d+ 个文件$/}).count(),0)
    await panel.getByRole('button',{name:'查看差异'}).first().click()
    await page.locator('.dsh-resend-content-line').first().waitFor()
    await layout(page,`${label}-zero-diff`,true)
    await contrast(page,label)
    await screenshot(page,`delivery-diff-${label}.png`)
    await page.keyboard.press('Escape')
    assert.equal(await panel.getByRole('button',{name:'查看差异'}).first().evaluate(n=>n===document.activeElement),true)
    await page.getByRole('button',{name:'打开重发前面板'}).click()
    const overlay=page.locator('.dsh-resend-preflight-overlay')
    await overlay.getByRole('button',{name:'查看差异'}).first().click()
    await page.locator('.dsh-resend-content-line').first().waitFor()
    await layout(page,`${label}-stacked`,true)
    await screenshot(page,`delivery-stacked-${label}.png`)
    await page.keyboard.press('Escape')
    await overlay.waitFor()
    await overlay.getByRole('button',{name:'取消重发'}).click()
    await page.getByRole('button',{name:'打开宿主原生弹窗'}).click()
    await page.getByRole('dialog',{name:'宿主原生弹窗',exact:true}).waitFor()
    await screenshot(page,`delivery-native-${label}.png`)
    await page.close()
    console.log(`PASS ${label}`)
  }
  for (const state of ['loading','unavailable','error','stale','mixed']) {
    const page=await browser.newPage({viewport:{width:375,height:900}})
    page.on('pageerror', error=>errors.push(error.message))
    await page.goto(fixture.url+`/?contentPreview&dark&${state==='loading'?'contentDelay=2000':state==='mixed'?'mixedResults':`contentState=${state}`}`)
    await page.getByRole('button',{name:'预览回滚',exact:true}).click()
    if(state==='mixed') {
      await page.getByRole('button',{name:'查看结果',exact:true}).click()
      await layout(page,'mixed-results')
    } else {
      await page.getByRole('button',{name:'查看差异'}).first().click()
      await page.getByText(state==='loading'?'正在读取内容…':state==='unavailable'?'无法预览正文；仍可在原面板选择还原。':state==='stale'?'清单或文件已变化，内容预览已失效。请关闭后重新检查。':'内容读取失败，原有文件选择未改变。',{exact:true}).waitFor()
      await layout(page,`${state}-375`,true)
      if(state==='error') { await page.getByRole('button',{name:'重试读取'}).click(); await page.locator('.dsh-resend-content-line').first().waitFor() }
    }
    await screenshot(page,`delivery-state-${state}.png`)
    await page.close()
  }
  for(const width of [375,1440]) {
    const page=await browser.newPage({viewport:{width,height:900},hasTouch:true,reducedMotion:'reduce'})
    await page.goto(fixture.url+'/?contentPreview&dark')
    await page.getByRole('button',{name:'预览回滚',exact:true}).click()
    await page.locator('.dsh-resend-rollback').first().evaluate(node=>{
      node.style.setProperty('--dsh-content-font-size','20px');node.style.setProperty('--dsh-content-font-size-secondary','18px')
    })
    await layout(page,`touch-scaled-${width}`)
    assert.ok(await page.locator('.dsh-resend-rollback-check-label').first().evaluate(n=>n.getBoundingClientRect().width>=44))
    await page.getByRole('button',{name:'查看差异'}).first().click()
    await page.locator('.dsh-resend-content-dialog').evaluate(node=>{
      node.style.setProperty('--dsh-content-font-size','20px');node.style.setProperty('--dsh-content-font-size-secondary','18px')
    })
    await page.locator('.dsh-resend-content-line').first().waitFor()
    await layout(page,`touch-scaled-diff-${width}`,true)
    await screenshot(page,`delivery-scaled-${width}.png`)
    await page.close()
  }
  for(const height of [400,600,900]) {
    const page=await browser.newPage({viewport:{width:375,height},reducedMotion:'reduce'})
    await page.goto(fixture.url+'/?contentPreview&dark&longPaths&contentDelay=1000')
    await page.getByRole('button',{name:'预览回滚',exact:true}).click()
    await layout(page,`long-path-and-error-${height}`)
    await page.getByRole('button',{name:'查看差异'}).first().click()
    await page.getByText('正在读取内容…',{exact:true}).waitFor()
    const loadingTop=await page.locator('.dsh-resend-content-body').evaluate(n=>n.getBoundingClientRect().top)
    await page.locator('.dsh-resend-content-line').first().waitFor()
    await layout(page,`long-path-diff-${height}`,true)
    await page.getByRole('button',{name:'关闭内容预览',exact:true}).focus()
    await page.keyboard.press('Shift+Tab')
    assert.equal(await page.locator('.dsh-resend-content-path').evaluate(n=>n===document.activeElement),true)
    await page.keyboard.press('End')
    assert.ok(await page.locator('.dsh-resend-content-path').evaluate(n=>n.scrollTop>0))
    const readyTop=await page.locator('.dsh-resend-content-body').evaluate(n=>n.getBoundingClientRect().top)
    assert.ok(Math.abs(readyTop-loadingTop)<=2,`读取完成时正文位置跳动 ${readyTop-loadingTop}px`)
    await screenshot(page,`delivery-long-path-${height}.png`)
    await page.close()
  }
  assert.deepEqual(errors,[])
  await writeFile(new URL('rollback-visual-result.json',output),JSON.stringify({host:fixture.app.describe(),bundleHash,checks,contrasts,errors,screenshots},null,2))
  console.log(`视觉验收通过：${checks.length} 个布局检查，${contrasts.length} 组对比度检查。`)
} finally { await browser.close(); await fixture.close() }
