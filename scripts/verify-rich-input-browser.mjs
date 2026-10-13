import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { build } from 'esbuild'
import { createServer } from 'node:http'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { once } from 'node:events'
import { fileURLToPath } from 'node:url'
import { createSkillHost } from './fixtures/skill-host.mjs'
import { createHostBrowserFixture } from './fixtures/host-browser.mjs'
import path from 'node:path'
import { createHash } from 'node:crypto'

const root = fileURLToPath(new URL('..', import.meta.url))
const fixture = await build({ entryPoints: [new URL('./fixtures/rich-input-browser.js', import.meta.url).pathname.replace(/^\/([A-Z]:)/u, '$1')], absWorkingDir: root,
  bundle: true, format: 'iife', platform: 'browser', write: false })
const bundlePath = path.resolve(process.env.EDITOR_BUNDLE_PATH ?? path.join(root, 'lib/client.bundle.js'))
const bundle = await readFile(bundlePath)
const hostUI = createHostBrowserFixture()
const skillHost = await createSkillHost()
if (!skillHost) throw new Error('浏览器技能验收需要可读取的已安装宿主加载钩子')
const server = createServer(async (request, response) => {
  if (request.url === '/load-skills') {
    try {
      const parts = []
      for await (const part of request) parts.push(part)
      const result = await skillHost.invoke(JSON.parse(Buffer.concat(parts).toString('utf8')))
      response.setHeader('Content-Type', 'application/json; charset=utf-8')
      response.end(JSON.stringify({ requested: result.requested.map(request => request.name), injected: result.injected }))
    } catch (error) { response.statusCode = 500; response.end(String(error)) }
    return
  }
  try {
    const pathname = new URL(request.url, 'http://localhost').pathname
    const payload = pathname === '/fixture.js' ? fixture.outputFiles[0].contents : pathname === '/client.js' ? bundle :
      pathname === '/' ? hostUI.html : hostUI.read(pathname)
    if (payload === undefined) { response.writeHead(404); response.end(); return }
    response.setHeader('Content-Type', pathname.endsWith('.js') ? 'text/javascript; charset=utf-8' :
      pathname.endsWith('.css') ? 'text/css; charset=utf-8' : pathname.endsWith('.svg') ? 'image/svg+xml' : 'text/html; charset=utf-8')
    response.end(payload)
  } catch (error) { response.writeHead(500); response.end(String(error)) }
}).listen(0, '127.0.0.1')
await once(server, 'listening')
let browser
const checks = [], errors = [], network = []
const channel = process.env.EDITOR_BROWSER_CHANNEL ?? 'msedge'
try {
  browser = await chromium.launch({ channel, headless: true })
  const page = await browser.newPage({ viewport: { width: 1100, height: 1000 }, permissions: ['clipboard-read', 'clipboard-write'] })
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {  if (message.type() === 'error') errors.push(message.text()) })
  page.on('request', request => network.push(request.url()))
  const url = `http://127.0.0.1:${server.address().port}`
  await mkdir(new URL('../output/playwright/', import.meta.url), { recursive: true })
  const input = page.getByRole('textbox', { name: '编辑消息' })
  const edit = page.getByRole('button', { name: '编辑', exact: true })
  const text = () => input.evaluate(element => {
    const read = node => node.nodeType === 3 ? node.textContent : node.dataset?.mention ? node.dataset.mention :
      node.tagName === 'BR' ? node.classList.contains('ProseMirror-trailingBreak') ? '' : node.dataset.eol ?? '\n' : [...node.childNodes].map(read).join('')
    return read(element)
  })
  const source = () => page.evaluate(() => window.richInputFixture.text)
  const paste = value => input.evaluate((element, value) => {
    const data = new DataTransfer(); data.setData('text/plain', value)
    element.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }))
  }, value)
  const replaceAll = async value => { await input.focus(); await page.keyboard.press('Control+a'); await paste(value) }
  const open = async () => { await edit.click(); await page.mouse.move(0, 0); await input.waitFor(); await page.waitForFunction(() => document.querySelectorAll('.dsh-resend-file-reference').length === 5) }
  async function selectText(value) {
    await input.evaluate(async (element, value) => {
      element.focus()
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
      const nodes = []
      let node, content = ''
      while ((node = walker.nextNode())) {
        if (node.parentElement.closest('[data-path]')) continue
        nodes.push({ node, start: content.length })
        content += node.textContent
      }
      const index = content.indexOf(value)
      if (index >= 0) {
        const first = nodes.find(entry => entry.start + entry.node.textContent.length > index)
        const last = nodes.find(entry => entry.start + entry.node.textContent.length >= index + value.length)
        const range = document.createRange(); range.setStart(first.node, index - first.start); range.setEnd(last.node, index + value.length - last.start)
        const selection = document.getSelection(); selection.removeAllRanges(); selection.addRange(range)
        document.dispatchEvent(new Event('selectionchange'))
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
        return
      }
      throw new Error('待选文字不存在 ' + value)
    }, value)
  }
  async function check(name, run, query = '') {
    if (process.env.EDITOR_TAG_ALIGNMENT_ONLY && !name.includes('标签对齐')) return
    await page.goto(url + query)
    await edit.waitFor({ timeout: 5000 }).catch(async cause => {
      console.error(JSON.stringify({ errors, body: await page.locator('body').innerText() }, null, 2)); throw cause
    })
    await run()
    assert.deepEqual(errors, [])
    checks.push(name); console.log('PASS ' + name)
  }
  for (const fontSize of [14, 18, 24]) for (const dark of [false, true]) {
    await check(`标签对齐：${dark ? '深色' : '浅色'} ${fontSize}px 字号`, async () => {
      await open(); await replaceAll('中文 English @a/same.md /tdd 后文 Text')
      await input.locator('[data-skill="tdd"]').waitFor()
      await page.locator('.dsh-resend-editor-surface').evaluate((element, size) => {
        element.style.setProperty('--dsh-content-font-size', size + 'px')
        element.style.setProperty('--dsh-content-font-delta', size - 14 + 'px')
      }, fontSize)
      const bounds = await input.evaluate(element => {
        const file = element.querySelector('[data-path]'), skill = element.querySelector('[data-skill]'), prefix = element.querySelector('.dsh-resend-skill-prefix')
        const ordinary = [...element.querySelector('p').childNodes].find(node => node.nodeType === 3 && node.textContent.includes('中文 English'))
        const rect = element => { const box = element.getBoundingClientRect(); return { top: box.top, bottom: box.bottom, height: box.height } }
        const text = element => { const range = document.createRange(); range.selectNodeContents(element); return rect({ getBoundingClientRect: () => range.getBoundingClientRect() }) }
        const pseudo = getComputedStyle(prefix, '::after')
        const skillIconCenter = prefix.getBoundingClientRect().top + parseFloat(pseudo.top) + new DOMMatrix(pseudo.transform).f + parseFloat(pseudo.height) / 2
        const fileIcon = file.querySelector('svg').getBoundingClientRect()
        return { file: rect(file), skill: rect(skill), prefix: rect(prefix), fileText: text(file.querySelector('span')), skillText: text(skill), ordinaryText: text(ordinary), fileIconCenter: fileIcon.top + fileIcon.height / 2, skillIconCenter }
      })
      await page.locator('.dsh-resend-editor-surface').screenshot({ path: path.join(root, 'output/playwright', `tag-alignment-${dark ? 'dark' : 'light'}-${fontSize}.png`) })
      for (const key of ['top', 'bottom']) {
        assert.ok(Math.abs(bounds.file[key] - bounds.skill[key]) <= 0.5, JSON.stringify(bounds))
        assert.ok(Math.abs(bounds.prefix[key] - bounds.skill[key]) <= 0.5, JSON.stringify(bounds))
        assert.ok(Math.abs(bounds.fileText[key] - bounds.skillText[key]) <= 0.5, JSON.stringify(bounds))
        assert.ok(Math.abs(bounds.fileText[key] - bounds.ordinaryText[key]) <= 0.5, JSON.stringify(bounds))
      }
      assert.ok(Math.abs(bounds.fileIconCenter - bounds.skillIconCenter) <= 0.5, JSON.stringify(bounds))
    }, dark ? '?dark' : '')
  }
  await check('连续输入英文字母时技能确认静默进行，不显示提示或改变输入框高度', async () => {
    await open(); await replaceAll('阅读 @a/same.md /tdd 正文 ')
    await input.locator('[data-skill="tdd"]').waitFor()
    const height = (await page.locator('.dsh-resend-editor-surface').boundingBox()).height
    await page.evaluate(() => {
      window.skillCheckingFlashes = []
      window.skillCheckingObserver = new MutationObserver(records => {
        for (const record of records) for (const node of record.addedNodes) {
          if (node.textContent.includes('正在确认文本中的技能')) window.skillCheckingFlashes.push(node.textContent)
        }
      })
      window.skillCheckingObserver.observe(document.querySelector('.dsh-resend-editor-surface'), { childList: true, subtree: true })
      window.richInputFixture.skillMode('delayed')
    })
    for (const letter of 'EnglishText') {
      await page.keyboard.insertText(letter)
      assert.equal(await page.locator('[data-skill-notice]').count(), 0)
      assert.equal((await page.locator('.dsh-resend-editor-surface').boundingBox()).height, height)
    }
    assert.deepEqual(await page.evaluate(() => window.skillCheckingFlashes), [])
    await page.evaluate(() => { window.skillCheckingObserver.disconnect(); window.richInputFixture.skillMode('ready'); window.richInputFixture.resetConnection() })
    await input.locator('[data-skill="tdd"]').waitFor()
    assert.equal(await text(), '阅读 @a/same.md /tdd 正文 EnglishText')
    await page.getByRole('button', { name: '发送', exact: true }).click()
    assert.equal(await page.evaluate(() => window.richInputFixture.calls[0].request.text), '阅读 @a/same.md /tdd 正文 EnglishText')
  })
  for (const width of [1100, 360]) for (const dark of [false, true]) {
    await page.setViewportSize({ width, height: 1000 })
    await check(`框外提示自查：${dark ? '深色' : '浅色'} ${width}px 的格式、失效技能、查询、预览与发送异常`, async () => {
      await open(); await replaceAll('正文')
      await page.locator('.dsh-resend-editor-surface').evaluate(element => {
        element.style.setProperty('--dsh-content-font-size', '24px')
        element.style.setProperty('--dsh-content-font-delta', '10px')
      })
      const baseline = (await page.locator('.dsh-resend-editor-surface').boundingBox()).height
      async function verify(selector) {
        await page.locator(selector).waitFor()
        const measured = await page.locator(selector).evaluate(element => {
          const surface = document.querySelector('.dsh-resend-editor-surface'), box = element.getBoundingClientRect(), outer = surface.getBoundingClientRect()
          const style = getComputedStyle(element)
          const colorProbe = document.createElement('span'); colorProbe.style.color = 'var(--dsw-alias-state-error-primary)'; element.append(colorProbe)
          const red = getComputedStyle(colorProbe).color; colorProbe.remove()
          return { below: box.top >= outer.bottom + 5, outside: !surface.contains(element), font: parseFloat(style.fontSize), color: style.color, red,
            scroll: document.documentElement.scrollWidth, viewport: innerWidth, height: outer.height }
        })
        assert.equal(measured.below, true, JSON.stringify(measured))
        assert.equal(measured.outside, true, JSON.stringify(measured))
        assert.equal(measured.font, 12)
        assert.equal(measured.color, measured.red)
        assert.equal(measured.height, baseline)
        assert.ok(measured.scroll <= measured.viewport)
        assert.equal(await page.locator('.dsh-resend-editor-surface [role="status"]').count(), 0)
      }
      await replaceAll('使用 /code-')
      await page.getByRole('option', { name: '选择技能 /code-review', exact: true }).waitFor()
      assert.equal(await page.locator('[data-skill-notice]').count(), 0)
      await input.press('Escape'); await verify('[data-skill-notice]')
      await page.locator('#row').screenshot({ path: path.join(root, 'output/playwright', `editor-notices-${dark ? 'dark' : 'light'}-${width}.png`) })
      await replaceAll('使用 /missing 正文'); await verify('[data-skill-notice]')
      await page.evaluate(() => window.richInputFixture.skillMode('failed'))
      await replaceAll('使用 /tdd 正文'); await verify('[data-skill-notice]')
      await page.evaluate(() => window.richInputFixture.skillMode('ready'))
      await page.evaluate(() => window.richInputFixture.lookupMode('failed'))
      await replaceAll('阅读 @unknown 正文'); await verify('[data-reference-notice]')
      await page.evaluate(() => window.richInputFixture.lookupMode('ready'))
      for (const previewMode of ['failed', 'unavailable']) {
        await page.evaluate(mode => window.richInputFixture.previewMode(mode), previewMode)
        await replaceAll('阅读 @a/same.md 正文')
        await page.locator('[data-path="a/same.md"]').waitFor()
        await page.locator('[data-path="a/same.md"]').evaluate(element => element.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1, button: 0 })))
        await verify('[data-preview-notice]')
      }
      await replaceAll('正文')
      await page.evaluate(() => window.richInputFixture.mode('throw'))
      await page.getByRole('button', { name: '发送', exact: true }).click()
      await verify('.dsh-resend-operation-error')
      assert.equal(await text(), '正文')
    }, dark ? '?dark' : '')
  }
  await page.setViewportSize({ width: 1100, height: 1000 })
  await check('原文全文、同名完整路径、目录与多个 skill 恢复', async () => {
    await open()
    assert.equal(await page.locator('[data-path] > svg[aria-hidden="true"]').count(), 5)
    assert.deepEqual(await input.locator('[data-skill]').allTextContents(), ['tdd', 'code-review'])
    assert.equal(await input.locator('.dsh-resend-skill-prefix').evaluateAll(nodes => nodes.every(node => getComputedStyle(node).color === 'rgba(0, 0, 0, 0)')), true)
    assert.equal(await page.getByRole('button', { name: '发送', exact: true }).innerText(), '发送')
    await page.screenshot({ path: path.join(root, 'output/playwright', 'composer-tags-preview.png'), fullPage: true })
    assert.equal(await text(), await source())
    assert.deepEqual(await page.locator('[data-path]').evaluateAll(nodes => nodes.map(node => node.dataset.path)),
      ['a/same.md', 'b/same.md', '资料/中文 说明.md', '有 空格', 'D:/Other Project/说明.md'])
    assert.equal(await page.locator('[data-path="unknown"]').count(), 0)
    assert.equal(await input.evaluate(element => { const selection = getSelection(); return selection.isCollapsed && selection.focusOffset === selection.focusNode.textContent.length }), true)
  })
  await check('换行后的技能标签保留名称，复制及发送仍使用完整调用文本', async () => {
    await open()
    const value = '阅读 @a/same.md\n/tdd /code-review'
    await replaceAll(value)
    await input.locator('[data-skill="code-review"]').waitFor()
    assert.deepEqual(await input.locator('[data-skill]').allTextContents(), ['tdd', 'code-review'])
    await input.press('Escape')
    await input.press('Control+a'); await input.press('Control+c')
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), value)
    await page.getByRole('button', { name: '发送', exact: true }).click()
    assert.equal(await page.evaluate(() => window.richInputFixture.calls[0].request.text), value)
  })
  await check('点击已确认文件和当前技能只打开预览，不发送或改写草稿', async () => {
    await open()
    const before = await text()
    await page.evaluate(() => getSelection()?.removeAllRanges())
    await page.locator('[data-path="a/same.md"]').evaluate(element => element.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1, button: 0 })))
    assert.deepEqual(await page.evaluate(() => window.richInputFixture.openedFiles), ['a/same.md'])
    assert.deepEqual(await page.evaluate(() => window.richInputFixture.calls), [])
    assert.equal(await text(), before)
    await replaceAll('请预览 /tdd')
    await page.waitForTimeout(100)
    await input.click()
    assert.deepEqual(await page.evaluate(() => window.richInputFixture.openedSkills), ['tdd'])
    assert.deepEqual(await page.evaluate(() => window.richInputFixture.calls), [])
    assert.equal(await text(), '请预览 /tdd')
  })
  await check('删除、撤销、重做、替换与 skill 中间编辑，拒绝后保留全文', async () => {
    await open()
    await page.getByRole('button', { name: '删除引用 a/same.md', exact: true }).click()
    assert.equal(await text(), (await source()).replace('@a/same.md', ''))
    await page.keyboard.press('Control+z'); assert.equal(await text(), await source())
    await page.keyboard.press('Control+Shift+z'); assert.equal(await text(), (await source()).replace('@a/same.md', ''))
    await page.keyboard.press('Control+z')
    await selectText('/tdd'); await page.keyboard.insertText('/research')
    const edited = (await source()).replace('/tdd', '/research')
    assert.equal(await text(), edited)
    await page.waitForTimeout(550)
    await page.keyboard.insertText('继续')
    assert.equal(await text(), edited.replace('/research', '/research继续'))
    await page.keyboard.press('Control+z')
    await page.getByRole('button', { name: '发送', exact: true }).click()
    await page.getByRole('alert').waitFor()
    assert.equal(await text(), edited)
    assert.equal(await page.evaluate(() => window.richInputFixture.calls[0].request.text), edited)
  })
  await check('取消、Escape 与卸载后重开均恢复原文，清空撤销、候选、选区和提示', async () => {
    await open(); await selectText('/tdd'); await page.keyboard.insertText('/research')
    await page.keyboard.press('Escape')
    if (await input.count()) await page.keyboard.press('Escape')
    assert.equal(await input.count(), 0)
    await edit.click(); assert.equal(await text(), await source())
    await replaceAll('待清空的内容 /code-')
    await page.getByRole('option', { name: '选择技能 /code-review', exact: true }).waitFor()
    assert.equal(await page.getByRole('button', { name: '取消', exact: true }).evaluate(button => {
      const box = button.getBoundingClientRect()
      return document.querySelector('.dsh-resend-menu-surface').contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2))
    }), true)
    await input.press('Escape')
    assert.equal(await input.count(), 1)
    await page.getByRole('button', { name: '取消', exact: true }).click(); await edit.click(); assert.equal(await text(), await source())
    assert.equal(await page.getByRole('listbox').count(), 0)
    assert.equal(await page.getByText('/code-', { exact: true }).count(), 0)
    assert.equal(await input.evaluate(element => { const selection = getSelection(); return selection.isCollapsed && element.contains(selection.focusNode) && selection.focusOffset === selection.focusNode.textContent.length }), true)
    await replaceAll('卸载前的编辑文字')
    await page.evaluate(() => window.richInputFixture.remount()); await edit.click(); assert.equal(await text(), await source())
    await page.keyboard.press('Control+z'); assert.equal(await text(), await source())
  })
  await check('预检冻结正文和标签，取消恢复编辑，确认只发送固定全文', async () => {
    await open(); await selectText('/tdd'); await page.keyboard.insertText('/research')
    const edited = (await source()).replace('/tdd', '/research')
    await page.evaluate(() => window.richInputFixture.mode('preflight'))
    await page.getByRole('button', { name: '发送', exact: true }).click()
    await page.getByRole('button', { name: '取消重发', exact: true }).waitFor()
    assert.equal(await input.getAttribute('contenteditable'), 'false')
    assert.equal(await page.getByRole('button', { name: '删除引用 a/same.md', exact: true }).isDisabled(), true)
    await paste('禁止预检期间写入'); assert.equal(await text(), edited)
    await page.getByRole('button', { name: '取消重发', exact: true }).click()
    await page.waitForFunction(() => document.querySelector('[role="textbox"]').contentEditable === 'true')
    assert.equal(await text(), edited)
    assert.equal(await page.evaluate(() => window.richInputFixture.received.length), 0)
    await input.focus(); await page.keyboard.press('Enter')
    await page.getByRole('button', { name: '保留当前文件并继续', exact: true }).click()
    await page.waitForFunction(() => window.richInputFixture.received.length === 1)
    assert.equal(await page.evaluate(() => window.richInputFixture.received[0].text), edited)
    assert.equal(await input.count(), 0)
    await edit.click(); assert.equal(await text(), await source())
  })
  await check('未接收时补发使用第一次完整文本，成功后清理草稿', async () => {
    await open(); await replaceAll('失败补发 @a/same.md /tdd\n完整中文')
    await page.evaluate(() => window.richInputFixture.mode('owed'))
    await input.press('Enter'); await page.waitForFunction(() => window.richInputFixture.received.length === 1)
    await edit.click(); assert.equal(await text(), await source())
    await replaceAll('后续本地编辑不会改写待补发文本')
    await page.evaluate(() => window.richInputFixture.retry())
    assert.deepEqual(await page.evaluate(() => window.richInputFixture.received.map(request => request.text)),
      ['失败补发 @a/same.md /tdd\n完整中文', '失败补发 @a/same.md /tdd\n完整中文'])
    await input.press('Escape'); await edit.click(); assert.equal(await text(), await source())
    assert.deepEqual(await page.evaluate(() => window.richInputFixture.calls.map(call => call.phase ?? 'retry')), ['start', 'retry'])
  })
  await check('Shift+Enter 换行、空白不可发送、输入法确认不发送、异常保留内容', async () => {
    await open(); await replaceAll('中文')
    await page.keyboard.press('Shift+Enter'); await page.keyboard.insertText('第二行')
    assert.equal(await text(), '中文\n第二行')
    await input.evaluate(element => {
      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true, cancelable: true }))
      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 229, bubbles: true, cancelable: true }))
    })
    assert.equal(await page.evaluate(() => window.richInputFixture.calls.length), 0)
    await replaceAll(' \n\t'); await input.press('Enter')
    assert.equal(await page.evaluate(() => window.richInputFixture.calls.length), 0)
    await replaceAll('发送异常也保留的中文 /skill'); await page.evaluate(() => window.richInputFixture.mode('throw'))
    await input.press('Escape')
    await input.press('Enter'); await page.getByRole('alert').waitFor()
    assert.equal(await text(), '发送异常也保留的中文 /skill')
    assert.equal(await input.getAttribute('contenteditable'), 'true')
  })
  await check('切换 Session 或消息后重开使用各自原文；普通正文、附件、选区与撤销不变', async () => {
    const ordinary = page.locator('#ordinary')
    await ordinary.focus(); await ordinary.press('End'); await page.keyboard.insertText('追加')
    await ordinary.evaluate(element => element.setSelectionRange(2, 4))
    await open(); await replaceAll('s0 的草稿')
    await page.evaluate(() => window.richInputFixture.switchTarget('s', 2)); await open(); await replaceAll('s2 的草稿')
    await page.evaluate(() => window.richInputFixture.switchTarget('other', 0)); await open(); await replaceAll('other0 的草稿')
    for (const [sessionId, seq] of [['s', 0], ['s', 2], ['other', 0]]) {
      await page.evaluate(([sessionId, seq]) => window.richInputFixture.switchTarget(sessionId, seq), [sessionId, seq]); await edit.click(); assert.equal(await text(), await source())
    }
    assert.equal(await ordinary.inputValue(), '普通正文 /skill @keep追加')
    assert.deepEqual(await ordinary.evaluate(element => [element.selectionStart, element.selectionEnd]), [2, 4])
    assert.equal(await page.locator('[data-attachment]').getAttribute('data-attachment'), '附件.pdf')
    await ordinary.focus(); await ordinary.press('Control+z'); assert.equal(await ordinary.inputValue(), '普通正文 /skill @keep')
  })
  await check('查询失败与延迟响应不改写正文，关闭后旧响应失效', async () => {
    await page.evaluate(() => window.richInputFixture.lookupMode('failed'))
    await edit.click(); await input.waitFor(); assert.equal(await text(), await source())
    assert.equal(await page.locator('[data-path]').count(), 0)
    await input.press('Escape'); await page.evaluate(() => window.richInputFixture.lookupMode('delayed'))
    await edit.click(); await replaceAll('已经修改 /tdd')
    await page.evaluate(() => window.richInputFixture.release()); await page.waitForTimeout(100)
    assert.equal(await text(), '已经修改 /tdd')
    await input.press('Escape')
    await input.press('Escape'); await page.evaluate(() => window.richInputFixture.release())
    assert.equal(await input.count(), 0)
  })
  await check('运行中与失效目标禁止发送，保留草稿', async () => {
    await open(); await replaceAll('有效性变化也保留草稿')
    await page.evaluate(() => window.richInputFixture.running(true)); await input.press('Enter')
    assert.equal(await page.evaluate(() => window.richInputFixture.calls.length), 0)
    await page.evaluate(() => window.richInputFixture.running(false)); await page.evaluate(() => window.richInputFixture.invalidate(false))
    await page.waitForFunction(() => document.querySelector('[aria-label="发送"]').disabled)
    await input.press('Enter'); assert.equal(await page.evaluate(() => window.richInputFixture.calls.length), 0)
    assert.equal(await text(), '有效性变化也保留草稿')
  })
  await check('菜单键盘区分同名路径、Tab 选择、输入法确认与分层 Escape', async () => {
    await open(); await replaceAll('阅读 @same')
    await page.getByRole('option', { name: '引用文件 b/same.md', exact: true }).waitFor()
    await input.evaluate(element => element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true, cancelable: true })))
    assert.equal(await text(), '阅读 @same')
    await input.press('ArrowDown'); await input.press('Tab')
    assert.equal(await text(), '阅读 @b/same.md ')
    assert.equal(await page.evaluate(() => window.richInputFixture.calls.length), 0)
    await page.keyboard.insertText('后续正文')
    await input.press('Enter'); await page.getByRole('alert').waitFor()
    assert.equal(await page.evaluate(() => window.richInputFixture.calls[0].request.text), '阅读 @b/same.md 后续正文')
    await replaceAll('保留 @不存在')
    await page.getByRole('status').filter({ hasText: '没有匹配' }).waitFor()
    await input.press('Enter'); assert.equal(await page.evaluate(() => window.richInputFixture.calls.length), 1)
    await input.press('Escape'); assert.equal(await input.count(), 1)
    assert.equal(await page.getByRole('listbox').count(), 0)
    await input.press('Escape'); assert.equal(await input.count(), 0)
  })
  await check('带空格目录下钻与返回上级，最终目录引用不吞入正文', async () => {
    await open(); await replaceAll('阅读 @有')
    await page.getByRole('button', { name: '进入目录 有 空格', exact: true }).click()
    assert.equal(await text(), '阅读 @"有 空格/')
    await page.getByRole('button', { name: '进入目录 有 空格/子 目录', exact: true }).click()
    assert.equal(await text(), '阅读 @"有 空格/子 目录/')
    await page.getByRole('button', { name: '返回上级', exact: true }).click()
    assert.equal(await text(), '阅读 @"有 空格/')
    await page.getByRole('option', { name: '引用目录 有 空格/子 目录', exact: true }).click()
    await page.keyboard.insertText('后续正文')
    assert.equal(await text(), '阅读 @"有 空格/子 目录/" 后续正文')
    await input.press('Enter'); await page.getByRole('alert').waitFor()
    assert.equal(await page.evaluate(() => window.richInputFixture.calls[0].request.text), '阅读 @"有 空格/子 目录/" 后续正文')
  })
  await check('外部绝对路径选定、撤销恢复查询、复制粘贴保留标签路径', async () => {
    await open(); await replaceAll('外部 @"D:/Other Project/')
    await page.getByRole('option', { name: '引用文件 D:/Other Project/说明.md', exact: true }).waitFor()
    await page.screenshot({ path: new URL(`../output/playwright/rich-input-menu-${channel}.png`, import.meta.url).pathname.replace(/^\/([A-Z]:)/u, '$1'), fullPage: true })
    await page.getByRole('option', { name: '引用文件 D:/Other Project/说明.md', exact: true }).click()
    assert.equal(await text(), '外部 @"D:/Other Project/说明.md" ')
    await input.press('Control+z'); assert.equal(await text(), '外部 @"D:/Other Project/')
    await input.press('Control+Shift+z'); assert.equal(await text(), '外部 @"D:/Other Project/说明.md" ')
    await input.press('Control+a')
    const copied = await input.evaluate(element => {
      const data = new DataTransfer()
      element.dispatchEvent(new ClipboardEvent('copy', { clipboardData: data, bubbles: true, cancelable: true }))
      return data.getData('text/plain')
    })
    assert.equal(copied, '外部 @"D:/Other Project/说明.md" ')
    await replaceAll(copied); await page.waitForFunction(() => document.querySelectorAll('[data-path]').length === 1)
    assert.equal(await page.locator('[data-path]').getAttribute('data-path'), 'D:/Other Project/说明.md')
    await input.press('Escape'); await edit.click(); assert.equal(await text(), await source())
  })
  await check('选区替换仅影响当前触发词，邮箱中的 @ 不触发', async () => {
    await open(); await replaceAll('前文 @same 后文')
    await selectText('@same')
    await page.getByRole('option', { name: '引用文件 b/same.md', exact: true }).waitFor()
    await input.press('ArrowDown'); await input.press('Enter')
    assert.equal(await text(), '前文 @b/same.md 后文')
    await replaceAll('邮箱 a@b.com')
    assert.equal(await page.getByRole('listbox').count(), 0)
    await input.press('Enter'); await page.getByRole('alert').waitFor()
    assert.equal(await page.evaluate(() => window.richInputFixture.calls[0].request.text), '邮箱 a@b.com')
  })
  await check('候选逆序返回、光标移动和关闭编辑均取消旧响应', async () => {
    await open(); await page.evaluate(() => window.richInputFixture.lookupMode('delayed'))
    await replaceAll('阅读 @same'); await replaceAll('阅读 @中文')
    await page.evaluate(() => window.richInputFixture.release('中文'))
    await page.getByRole('option', { name: '引用文件 资料/中文 说明.md', exact: true }).waitFor()
    await page.evaluate(() => window.richInputFixture.release('same'))
    assert.equal(await page.getByRole('option', { name: '引用文件 a/same.md', exact: true }).count(), 0)
    await selectText('阅读'); await input.evaluate(() => getSelection().collapseToStart())
    await page.waitForFunction(() => !document.querySelector('[role="listbox"]'), null, { timeout: 2000 })
    assert.equal(await page.evaluate(() => window.richInputFixture.lookups.filter(item => ['same', '中文'].includes(item.query)).every(item => item.signal.aborted)), true)
    await replaceAll('正文 @same'); await selectText('正文'); await input.evaluate(() => getSelection().collapseToStart())
    await page.waitForFunction(() => !document.querySelector('[role="listbox"]'), null, { timeout: 2000 })
    await page.evaluate(() => window.richInputFixture.release())
    assert.equal(await page.locator('[data-path]').count(), 0)
    assert.equal(await text(), '正文 @same')
    await replaceAll('关闭 @same'); await input.press('Escape'); await page.getByRole('button', { name: '取消', exact: true }).click()
    await page.evaluate(() => window.richInputFixture.release())
    assert.equal(await input.count(), 0)
  })
  await check('查询失败保留原引用和纯文本发送，预检关闭候选菜单', async () => {
    await open(); await page.evaluate(() => window.richInputFixture.lookupMode('failed'))
    await page.keyboard.insertText(' @same')
    await page.getByRole('status').filter({ hasText: '查询失败' }).waitFor()
    const failedText = await text()
    await input.press('Enter'); assert.equal(await page.evaluate(() => window.richInputFixture.calls.length), 0)
    await input.press('Escape'); await input.press('Enter'); await page.getByRole('alert').waitFor()
    assert.equal(await page.evaluate(() => window.richInputFixture.calls[0].request.text), failedText)
    assert.equal(await page.locator('[data-path]').count(), 5)
    await page.evaluate(() => { window.richInputFixture.lookupMode('ready'); window.richInputFixture.mode('preflight') })
    await replaceAll('预检 @same')
    await page.getByRole('option', { name: '引用文件 a/same.md', exact: true }).waitFor()
    await page.getByRole('button', { name: '发送', exact: true }).click()
    await page.getByRole('button', { name: '取消重发', exact: true }).waitFor()
    assert.equal(await page.getByRole('listbox').count(), 0)
    await page.getByRole('button', { name: '取消重发', exact: true }).click()
    assert.equal(await text(), '预检 @same')
  })
  await check('光标位于触发词中间时只替换完整触发词，保留两侧正文', async () => {
    await open(); await replaceAll('前文 @same 后文')
    await selectText('@same')
    await input.evaluate(() => { const selection = getSelection(); selection.collapse(selection.anchorNode, selection.anchorOffset + 3) })
    await page.getByRole('option', { name: '引用文件 b/same.md', exact: true }).waitFor()
    await page.getByRole('option', { name: '引用文件 b/same.md', exact: true }).click()
    assert.equal(await text(), '前文 @b/same.md 后文')
  })
  await check('连接重置和预设变化取消旧查询及候选，保留正文和已选标签', async () => {
    await open(); await page.evaluate(() => window.richInputFixture.lookupMode('delayed'))
    await page.keyboard.insertText(' @same')
    const draft = await text()
    await page.evaluate(() => window.richInputFixture.resetConnection())
    assert.equal(await page.evaluate(() => window.richInputFixture.lookups.filter(item => item.query === 'same').every(item => item.signal.aborted)), true)
    await page.evaluate(() => window.richInputFixture.release())
    assert.equal(await page.getByRole('listbox').count(), 0)
    assert.equal(await page.locator('[data-path]').count(), 5)
    assert.equal(await text(), draft)
    await page.evaluate(() => window.richInputFixture.lookupMode('ready'))
    await page.keyboard.insertText('.md')
    await page.getByRole('option', { name: '引用文件 a/same.md', exact: true }).waitFor()
    await page.evaluate(() => window.richInputFixture.preset('changed'))
    assert.equal(await page.getByRole('listbox').count(), 0)
    assert.equal(await page.locator('[data-path]').count(), 5)
    assert.equal(await text(), draft + '.md')
  })
  await check('长候选列表方向键循环时当前选项始终可见', async () => {
    await open(); await replaceAll('阅读 @many')
    await page.getByRole('option', { name: '引用文件 文件 20.md', exact: true }).waitFor()
    await input.press('ArrowUp')
    assert.equal(await page.getByRole('listbox').evaluate(list => {
      const active = list.querySelector('[aria-selected="true"]').getBoundingClientRect()
      const bounds = list.getBoundingClientRect()
      return active.top >= bounds.top && active.bottom <= bounds.bottom
    }), true)
    await input.press('Tab')
    assert.equal(await text(), '阅读 @"文件 20.md" ')
  })
  await check('技能菜单按目标会话过滤，Enter/Tab 选择可编辑文字后由真实钩子加载并去重', async () => {
    await open(); await replaceAll('使用 /he')
    await page.getByRole('option', { name: '选择技能 /help', exact: true }).waitFor()
    await page.screenshot({ path: new URL(`../output/playwright/skill-menu-${channel}.png`, import.meta.url).pathname.replace(/^\/([A-Z]:)/u, '$1'), fullPage: true })
    assert.equal(await page.getByRole('option').count(), 1)
    await input.evaluate(element => {
      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true, cancelable: true }))
      element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 229, bubbles: true, cancelable: true }))
    })
    assert.equal(await text(), '使用 /he')
    await input.press('Enter')
    assert.equal(await text(), '使用 /help ')
    assert.equal(await page.evaluate(() => window.richInputFixture.calls.length), 0)
    await page.keyboard.insertText('/t')
    await page.getByRole('option', { name: '选择技能 /tdd', exact: true }).waitFor()
    await input.press('Tab')
    await page.keyboard.insertText('/tdd ')
    await page.evaluate(() => window.richInputFixture.mode('accept'))
    await input.press('Enter')
    await page.waitForFunction(() => window.richInputFixture.received.length === 1)
    const result = await page.evaluate(() => ({ text: window.richInputFixture.received[0].text,
      loaded: window.richInputFixture.loaded[0], targets: window.richInputFixture.skillLookups.map(call => call.sessionId) }))
    assert.equal(result.text, '使用 /help /tdd /tdd ')
    assert.deepEqual(result.loaded.requested, ['help', 'tdd'])
    assert.deepEqual(result.loaded.injected.map(message => message.source.name), ['help', 'tdd'])
    assert.equal(result.loaded.injected.every(message => message.content[0].text.includes('隔离的')), true)
    assert.equal(result.targets.every(sessionId => sessionId === 's'), true)
    assert.equal(await page.locator('#ordinary').inputValue(), '普通正文 /skill @keep')
    assert.equal(await page.locator('[data-attachment]').count(), 1)
  })
  await check('句中技能选区与光标替换保留正文、补足空白，删除与撤销仍是文字编辑', async () => {
    await open(); await replaceAll('前文 /td后文')
    await selectText('/td')
    await page.getByRole('option', { name: '选择技能 /tdd', exact: true }).waitFor()
    await page.getByRole('option', { name: '选择技能 /tdd', exact: true }).click()
    assert.equal(await text(), '前文 /tdd 后文')
    await input.press('Control+z'); assert.equal(await text(), '前文 /td后文')
    await replaceAll('前文 /code-review 后文')
    await selectText('/code-review')
    await input.evaluate(element => { const node = element.querySelector('[data-skill="code-review"]').firstChild; getSelection().collapse(node, 2) })
    await page.getByRole('option', { name: '选择技能 /code-review', exact: true }).waitFor()
    await input.press('Tab')
    assert.equal(await text(), '前文 /code-review 后文')
    await selectText('/code-review'); await page.keyboard.press('Backspace')
    assert.equal(await text(), '前文  后文')
    assert.equal(await page.locator('[data-path]').count(), 0)
    assert.equal(await page.locator('[data-skill-notice]').count(), 0)
  })
  await check('历史失效与仅模型技能准确提示仍可重发，路径、分数、标点不误加载', async () => {
    await open(); await replaceAll('保留 /missing /model-only /usr/bin 5/8 /tdd，检查')
    await page.locator('[data-skill-notice]').filter({ hasText: '当前不可供用户调用' }).waitFor()
    assert.equal(await page.getByRole('listbox').count(), 0)
    await page.evaluate(() => window.richInputFixture.mode('accept'))
    await input.press('Enter')
    await page.waitForFunction(() => window.richInputFixture.received.length === 1)
    assert.equal(await page.evaluate(() => window.richInputFixture.received[0].text), '保留 /missing /model-only /usr/bin 5/8 /tdd，检查')
    assert.deepEqual(await page.evaluate(() => window.richInputFixture.loaded[0].injected), [])
    assert.deepEqual(await page.evaluate(() => window.richInputFixture.loaded[0].requested), ['missing', 'model-only'])
  })
  await check('技能查询失败及接口缺失不误报不存在，关闭菜单可原文发送', async () => {
    for (const mode of ['failed', 'unavailable']) {
      if (await input.count() === 0) await open()
      await page.evaluate(mode => window.richInputFixture.skillMode(mode), mode)
      await replaceAll('使用 /missing')
      await page.locator('[data-skill-notice]').filter({ hasText: '无法确认可用性' }).waitFor()
      assert.equal((await page.locator('[data-skill-notice]').innerText()).includes('当前不可供用户调用'), false)
      await input.press('Enter'); assert.equal(await text(), '使用 /missing')
      await input.press('Escape')
      await page.evaluate(() => window.richInputFixture.mode('accept'))
      await input.press('Enter')
      await page.waitForFunction(mode => window.richInputFixture.received.length === (mode === 'failed' ? 1 : 2), mode)
    }
  })
  await check('逆序技能查询、连接重置与关闭编辑取消旧候选和提示，保留新草稿', async () => {
    await open(); await page.evaluate(() => window.richInputFixture.skillMode('delayed'))
    await replaceAll('使用 /old')
    await replaceAll('使用 /td')
    await page.evaluate(() => {
      window.richInputFixture.releaseSkills(2, [{ name: 'tdd' }])
      window.richInputFixture.releaseSkills(3, [{ name: 'tdd' }])
    })
    await page.getByRole('option', { name: '选择技能 /tdd', exact: true }).waitFor()
    await page.evaluate(() => {
      window.richInputFixture.releaseSkills(0, [])
      window.richInputFixture.releaseSkills(1, [])
    })
    assert.equal(await page.getByRole('option', { name: '选择技能 /tdd', exact: true }).count(), 1)
    const choice = await page.getByRole('option').elementHandle()
    await page.evaluate(() => { window.richInputFixture.skillMode('ready'); window.richInputFixture.resetConnection() })
    await choice.evaluate(element => element.click())
    assert.equal(await page.getByRole('listbox').count(), 0)
    assert.equal(await text(), '使用 /td')
    await page.getByRole('button', { name: '取消', exact: true }).click()
    assert.equal(await page.evaluate(() => window.richInputFixture.skillLookups.every(call => call.signal.aborted)), true)
    await edit.click(); assert.equal(await text(), await source())
  })
  await check('目标预设事件重新确认技能可用性，其他会话事件不影响当前菜单', async () => {
    await open(); await replaceAll('使用 /tdd')
    await page.getByRole('option', { name: '选择技能 /tdd', exact: true }).waitFor()
    await page.evaluate(() => window.richInputFixture.skillPresetEvent('other'))
    assert.equal(await page.getByRole('option').count(), 1)
    const choice = await page.getByRole('option').elementHandle()
    await page.evaluate(() => { window.richInputFixture.skills([]); window.richInputFixture.skillPresetEvent('s') })
    await page.locator('[data-skill-notice]').filter({ hasText: '当前不可供用户调用' }).waitFor()
    await choice.evaluate(element => element.click())
    assert.equal(await text(), '使用 /tdd')
    assert.equal(await page.getByRole('listbox').count(), 0)
  })
  await check('技能选择后的预检取消、确认与补发始终使用首次固定文本', async () => {
    await open(); await replaceAll('使用 /user')
    await page.getByRole('option', { name: '选择技能 /user-only', exact: true }).waitFor()
    await input.press('Tab')
    await page.evaluate(() => window.richInputFixture.mode('preflight'))
    await input.press('Enter')
    await page.getByRole('button', { name: '取消重发', exact: true }).click()
    assert.equal(await text(), '使用 /user-only ')
    await input.press('Enter')
    await page.getByRole('button', { name: '保留当前文件并继续', exact: true }).waitFor()
    await page.evaluate(() => window.richInputFixture.mode('owed'))
    await page.getByRole('button', { name: '保留当前文件并继续', exact: true }).click()
    await page.waitForFunction(() => window.richInputFixture.received.length === 1)
    await edit.click(); await replaceAll('后续编辑 /missing')
    await page.evaluate(() => window.richInputFixture.retry())
    assert.deepEqual(await page.evaluate(() => window.richInputFixture.received.map(request => request.text)), ['使用 /user-only ', '使用 /user-only '])
    assert.deepEqual(await page.evaluate(() => window.richInputFixture.loaded.map(result => result.injected.map(message => message.source.name))), [['user-only'], ['user-only']])
  })
  await check('同时粘贴文件引用和技能查询，恢复文件标签后仍能选择并加载技能', async () => {
    await open(); await replaceAll('阅读 @a/same.md 使用 /td')
    await page.getByRole('option', { name: '选择技能 /tdd', exact: true }).waitFor()
    assert.equal(await page.locator('[data-path="a/same.md"]').count(), 1)
    await input.press('Tab')
    await page.evaluate(() => window.richInputFixture.mode('accept'))
    await input.press('Enter')
    await page.waitForFunction(() => window.richInputFixture.received.length === 1)
    assert.equal(await page.evaluate(() => window.richInputFixture.received[0].text), '阅读 @a/same.md 使用 /tdd ')
    assert.deepEqual(await page.evaluate(() => window.richInputFixture.loaded[0].injected.map(message => message.source.name)), ['tdd'])
  })
  await check('真实剪贴板键盘复制、剪切、粘贴与撤销保留引用路径', async () => {
    await open()
    const original = await source()
    await input.press('Control+a'); await input.press('Control+c')
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), original)
    await input.press('Control+x'); assert.equal(await text(), '')
    await input.press('Control+v'); assert.equal(await text(), original)
    await input.press('Control+z'); assert.equal(await text(), '')
    await input.press('Control+z'); assert.equal(await text(), original)
  })
  await check('文件查询能力缺失提示准确，原引用按原文保留并允许重发', async () => {
    await page.evaluate(() => window.richInputFixture.lookupMode('unavailable'))
    await edit.click(); await input.waitFor()
    await page.getByRole('status').filter({ hasText: '暂时无法确认文件引用' }).waitFor()
    assert.equal(await text(), await source())
    await replaceAll('保留 @same')
    await page.getByRole('status').filter({ hasText: '宿主未提供文件查询' }).waitFor()
    await input.press('Escape'); await input.press('Enter'); await page.getByRole('alert').waitFor()
    assert.equal(await page.evaluate(() => window.richInputFixture.calls[0].request.text), '保留 @same')
  })
  await check('实际点击文件、目录和外部路径；预览失败及能力缺失均保留草稿', async () => {
    await open()
    const original = await text()
    for (const path of ['a/same.md', '有 空格', 'D:/Other Project/说明.md']) {
      await page.evaluate(() => getSelection()?.removeAllRanges())
      await page.locator('[data-path]').filter({ has: page.locator('span', { hasText: path }) }).first().locator('span').click()
    }
    assert.deepEqual(await page.evaluate(() => window.richInputFixture.openedFiles), ['a/same.md', '有 空格', 'D:/Other Project/说明.md'])
    for (const mode of ['unavailable', 'failed']) {
      await page.evaluate(mode => window.richInputFixture.previewMode(mode), mode)
      await page.evaluate(() => getSelection()?.removeAllRanges())
      await page.locator('[data-path="a/same.md"]').click()
      await page.locator('[data-preview-notice]').filter({ hasText: mode === 'failed' ? '打开引用失败' : '不支持打开' }).waitFor()
      assert.equal(await text(), original)
    }
    assert.equal(await page.evaluate(() => window.richInputFixture.calls.length), 0)
    await page.evaluate(() => window.richInputFixture.previewMode('ready'))
    await replaceAll('选择文字 /tdd 后文'); await selectText('/tdd')
    const word = await input.evaluate(() => { const rect = getSelection().getRangeAt(0).getBoundingClientRect(); return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 } })
    await page.mouse.dblclick(word.x, word.y)
    assert.equal(await text(), '选择文字 /tdd 后文')
    assert.equal(await input.evaluate(() => !getSelection().isCollapsed), true)
    assert.equal(await page.evaluate(() => window.richInputFixture.calls.length), 0)
    await replaceAll('拖选 @a/same.md 后文')
    const chip = await page.locator('[data-path="a/same.md"]').boundingBox()
    const opened = await page.evaluate(() => window.richInputFixture.openedFiles.length)
    await page.mouse.move(chip.x + 3, chip.y + chip.height / 2)
    await page.mouse.down(); await page.mouse.move(chip.x + chip.width + 28, chip.y + chip.height / 2, { steps: 8 }); await page.mouse.up()
    assert.equal(await page.evaluate(() => window.richInputFixture.openedFiles.length), opened)
    assert.equal(await text(), '拖选 @a/same.md 后文')
  })
  await check('两个浏览器页面的相同目标草稿、候选和撤销互不影响', async () => {
    await open(); await replaceAll('窗口一 @same')
    const other = await browser.newPage()
    other.on('pageerror', error => errors.push(error.message))
    other.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    try {
      await other.goto(url); await other.getByRole('button', { name: '编辑', exact: true }).click()
      const otherInput = other.getByRole('textbox', { name: '编辑消息' })
      await otherInput.press('Control+a'); await other.keyboard.insertText('窗口二 /td')
      await other.getByRole('option', { name: '选择技能 /tdd', exact: true }).waitFor()
      await otherInput.press('Tab')
      assert.equal(await text(), '窗口一 @same')
      await input.press('Tab'); assert.equal(await text(), '窗口一 @a/same.md ')
      assert.equal(await otherInput.innerText(), '窗口二 /tdd ')
      await input.press('Control+z'); assert.equal(await text(), '窗口一 @same')
      assert.equal(await otherInput.innerText(), '窗口二 /tdd ')
      await otherInput.press('Control+z'); assert.equal(await otherInput.innerText(), '窗口二 /td')
      assert.equal(await text(), '窗口一 @same')
      assert.equal(await other.evaluate(() => window.richInputFixture.calls.length), 0)
    } finally { await other.close() }
  })
  for (const width of [1100, 360]) for (const dark of [false, true]) {
    await page.setViewportSize({ width, height: 1000 })
    await check(`${dark ? '深色' : '浅色'} ${width}px：三行高度、内容伸缩、长标签和菜单、焦点及发送按钮`, async () => {
      await open(); await replaceAll('一行正文')
      const minimum = await input.evaluate(element => ({ height: element.getBoundingClientRect().height, line: parseFloat(getComputedStyle(element).lineHeight) }))
      assert.equal(minimum.height, minimum.line * 3)
      await replaceAll(Array.from({ length: 8 }, (_, i) => '第' + i + '行').join('\n'))
      assert.ok((await input.boundingBox()).height >= minimum.line * 8)
      await replaceAll('阅读 @long')
      const option = page.getByRole('option', { name: /^引用文件 D:\/Other Project\//u })
      await option.waitFor()
      const assertLayout = async () => {
        const layout = await page.evaluate(() => {
          const selectors = '.dsh-resend-editor-actions button, .dsh-resend-reference-menu [aria-selected="true"]' +
            (document.querySelector('[data-trigger-menu]') ? '' : ', .dsh-resend-editor-header button')
          const controls = [...document.querySelectorAll(selectors)]
          return { viewport: innerWidth, scroll: document.documentElement.scrollWidth,
            visible: controls.every(button => {
              const rect = button.getBoundingClientRect()
              if (!rect.width || !rect.height) return true
              const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2
              return rect.left >= 0 && rect.right <= innerWidth && button.contains(document.elementFromPoint(x, y))
            }) }
        })
        assert.ok(layout.scroll <= layout.viewport, JSON.stringify(layout))
        assert.equal(layout.visible, true, JSON.stringify(layout))
      }
      await assertLayout()
      await page.screenshot({ path: path.join(root, 'output/playwright', `rich-input-menu-${dark ? 'dark' : 'light'}-${width}-${channel}.png`), fullPage: true })
      assert.equal(await input.evaluate(element => document.activeElement === element), true)
      assert.equal(await page.getByRole('listbox', { name: '文件与目录候选' }).count(), 1)
      assert.equal(await input.evaluate(element => {
        const active = document.getElementById(element.getAttribute('aria-activedescendant'))
        return document.getElementById(element.getAttribute('aria-controls'))?.contains(active) && active?.getAttribute('aria-selected') === 'true'
      }), true)
      await input.press('Tab')
      assert.equal(await input.getAttribute('aria-expanded'), 'false')
      assert.equal(await input.evaluate(element => document.activeElement === element), true)
      await page.getByRole('button', { name: '发送', exact: true }).scrollIntoViewIfNeeded()
      await assertLayout()
      await page.screenshot({ path: path.join(root, 'output/playwright', `rich-input-${dark ? 'dark' : 'light'}-${width}-${channel}.png`), fullPage: true })
      await page.keyboard.insertText('/td')
      await page.getByRole('option', { name: '选择技能 /tdd', exact: true }).waitFor()
      await assertLayout(); await input.press('Enter')
      assert.equal(await page.evaluate(() => window.richInputFixture.calls.length), 0)
      assert.equal(await page.getByText('临时输入框', { exact: true }).count(), 1)
      assert.ok((await page.getByRole('button', { name: '发送', exact: true }).boundingBox()).width >= 32)
      await replaceAll('阅读 @a/same.md 使用 /tdd')
      await input.locator('[data-skill="tdd"]').waitFor()
      await input.press('Escape')
      assert.equal(await text(), '阅读 @a/same.md 使用 /tdd')
      await assertLayout()
      const prefix = await input.locator('.dsh-resend-skill-prefix').boundingBox()
      assert.ok(prefix.width >= 14 && prefix.height >= 14)
      await page.locator('.dsh-resend-editor-surface').screenshot({ path: path.join(root, 'output/playwright', `composer-tags-${dark ? 'dark' : 'light'}-${width}.png`) })
    }, dark ? '?dark' : '')
  }
  for (const dark of [false, true]) {
    await page.setViewportSize({ width: 1100, height: 1000 })
    await check(`${dark ? '深色' : '浅色'}原生菜单对照：蓝色边框上方浮层、同款样式、鼠标高亮、目录 Tab 与模糊技能查询`, async () => {
      await open(); await replaceAll('阅读 @same')
      await page.getByRole('option', { name: '引用文件 a/same.md', exact: true }).waitFor()
      assert.equal(await page.getByRole('button', { name: '在正式输入框中编辑', exact: true }).count(), 0)
      const compare = async kind => {
        const comparison = await page.evaluate(async kind => {
          const plugin = document.querySelector('.dsh-resend-menu-surface')
          const card = document.querySelector('.dsh-resend-editor')
          const input = document.querySelector('[role="textbox"]')
          const rect = plugin.getBoundingClientRect(), cardRect = card.getBoundingClientRect()
          const names = [...plugin.querySelectorAll('.dsh-resend-menu-name')].map(node => node.textContent)
          const descriptions = [...plugin.querySelectorAll('.dsh-resend-menu-description')].map(node => node.textContent)
          window.renderNativeTriggerMenu(kind, names.map((name, index) => ({ name, description: descriptions[index],
            ...(kind === 'reference' ? { icon: 'file', section: '文件' } : {}) })), rect.width)
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
          const native = document.querySelector('#native-menu-comparison [data-trigger-menu]')
          const read = (node, keys) => Object.fromEntries(keys.map(key => [key, getComputedStyle(node)[key]]))
          const rowKeys = ['minHeight', 'padding', 'gap', 'fontSize', 'lineHeight', 'borderRadius', 'color', 'backgroundColor']
          const surfaceKeys = ['padding', 'borderRadius', 'boxShadow', 'overflow']
          const materialKeys = ['backgroundColor', 'backdropFilter']
          return { aboveBlueFrame: Math.abs(rect.bottom - (cardRect.top - 4)) <= 1 && Math.abs(rect.left - cardRect.left) <= 1 && Math.abs(rect.right - cardRect.right) <= 1,
            plugin: read(plugin, surfaceKeys), native: read(native, surfaceKeys),
            pluginRow: read(plugin.querySelector('[role="option"]'), rowKeys), nativeRow: read(native.querySelector('[role="option"]'), rowKeys),
            pluginMaterial: read(plugin.firstElementChild, materialKeys), nativeMaterial: read(native.firstElementChild, materialKeys) }
        }, kind)
        assert.equal(comparison.aboveBlueFrame, true)
        assert.deepEqual(comparison.plugin, comparison.native)
        assert.deepEqual(comparison.pluginRow, comparison.nativeRow)
        assert.deepEqual(comparison.pluginMaterial, comparison.nativeMaterial)
        await page.evaluate(() => document.getElementById('native-menu-comparison')?.remove())
      }
      await compare('reference')
      await page.getByRole('option', { name: '引用文件 b/same.md', exact: true }).hover()
      assert.equal(await page.getByRole('option', { name: '引用文件 b/same.md', exact: true }).getAttribute('aria-selected'), 'true')
      assert.equal(await input.evaluate(element => document.activeElement === element), true)
      await page.screenshot({ path: path.join(root, 'output/playwright', `reference-menu-${dark ? 'dark' : 'light'}-${channel}.png`), fullPage: true })
      await replaceAll('浏览 @有'); await page.getByRole('option', { name: '引用目录 有 空格', exact: true }).waitFor()
      await input.press('Tab'); assert.equal(await text(), '浏览 @"有 空格/')
      await page.getByRole('navigation', { name: '目录导航' }).waitFor()
      await page.getByRole('button', { name: '返回上级', exact: true }).click()
      assert.equal(await text(), '浏览 @')
      await replaceAll('使用 /cr'); await page.getByRole('option', { name: '选择技能 /code-review', exact: true }).waitFor()
      await page.waitForFunction(() => !document.querySelector('[data-skill-notice]'))
      await compare('skill')
      await page.screenshot({ path: path.join(root, 'output/playwright', `skill-menu-${dark ? 'dark' : 'light'}-${channel}.png`), fullPage: true })
      await input.press('Shift+Tab'); assert.equal(await page.getByRole('listbox').count(), 0)
      assert.equal(await page.evaluate(() => window.richInputFixture.calls.length), 0)
      await replaceAll('使用 /td'); await page.getByRole('option', { name: '选择技能 /tdd', exact: true }).waitFor()
      await page.locator('#ordinary').click(); assert.equal(await page.getByRole('listbox').count(), 0)
      assert.equal(await text(), '使用 /td')
    }, dark ? '?dark' : '')
  }
  assert.equal(network.every(request => request.startsWith(url)), true)
  await mkdir(new URL('../output/playwright/', import.meta.url), { recursive: true })
  await page.screenshot({ path: new URL(`../output/playwright/rich-input-${channel}.png`, import.meta.url).pathname.replace(/^\/([A-Z]:)/u, '$1'), fullPage: true })
  await writeFile(new URL(`../output/playwright/rich-input-${channel}.json`, import.meta.url), JSON.stringify({ channel, version: browser.version(), bundlePath, bundleSha256: createHash('sha256').update(bundle).digest('hex'), installedHostUI: true, checks, errors, network, realSessionMutations: 0, realModelRequests: 0 }, null, 2))
  console.log(`${channel}: ${checks.length} groups passed, ${errors.length} browser errors`)
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); hostUI.close() }
