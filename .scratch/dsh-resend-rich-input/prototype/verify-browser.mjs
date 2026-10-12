import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { once } from 'node:events'
import { startServer } from './serve.mjs'
import { historyText } from './fixtures.js'

const root = fileURLToPath(new URL('.', import.meta.url))
const server = startServer(0)
await once(server, 'listening')
let browser
const checks = []
try {
  browser = await chromium.launch({ channel: process.env.EDITOR_BROWSER_CHANNEL ?? 'msedge', headless: true })
  const context = await browser.newContext({ viewport: { width: 1100, height: 1100 } })
  const page = await context.newPage()
  const errors = []
  const network = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('request', request => network.push(request.url()))
  await page.goto(`http://127.0.0.1:${server.address().port}`)
  const input = page.getByRole('textbox', { name: '独立临时编辑器' })
  await input.waitFor()
  const getText = () => page.evaluate(() => window.editorFixture.editor.getText())
  const reset = text => page.evaluate(text => window.editorFixture.open(text), text)
  const end = () => page.evaluate(() => window.editorFixture.editor.selectEnd())
  async function check(name, run) { await run(); checks.push(name); console.log('PASS ' + name) }
  async function selectText(text) {
    await page.evaluate(text => {
      const view = window.editorFixture.editor.view
      let position
      view.state.doc.descendants((node, pos) => {
        if (position === undefined && node.isText && node.text.includes(text)) position = pos + node.text.indexOf(text)
      })
      if (position === undefined) throw new Error('待选文字不存在：' + text)
      view.dispatch(view.state.tr.setSelection(view.state.selection.constructor.create(view.state.doc, position, position + text.length)))
      view.focus()
    }, text)
  }
  async function paste(text) {
    await input.evaluate((element, text) => {
      const data = new DataTransfer()
      data.setData('text/plain', text)
      element.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }))
    }, text)
  }

  await check('打包产物通过宿主等价模块注册器加载，历史全文完整', async () => {
    assert.equal(await getText(), historyText)
    assert.equal(await page.locator('.file-reference').count(), 7)
    assert.deepEqual(await page.locator('.file-reference').evaluateAll(nodes => nodes.map(node => node.dataset.path)),
      ['资料/中文说明.md', '资料/中文 说明.md', 'a/same.md', 'b/same.md', 'src', '有 空格', 'D:/Other Project/说明.md'])
  })
  await check('删除同名引用仅影响所选路径，键盘撤销和重做可恢复', async () => {
    await page.getByRole('button', { name: '删除引用 a/same.md', exact: true }).click()
    assert.equal(await getText(), historyText.replace('@a/same.md', ''))
    await page.keyboard.press('Control+z')
    assert.equal(await getText(), historyText)
    await page.keyboard.press('Control+Shift+z')
    assert.equal(await getText(), historyText.replace('@a/same.md', ''))
    await page.keyboard.press('Control+z')
  })
  await check('引用前后文字与 skill 可选区编辑，未知 skill 原样保留', async () => {
    await selectText('请先阅读')
    await page.keyboard.insertText('请重点阅读')
    await selectText('/tdd')
    await page.keyboard.insertText('/research')
    await selectText('后面的正文必须保留')
    await page.keyboard.insertText('后面的正文已修改')
    assert.equal(await getText(), historyText.replace('请先阅读', '请重点阅读').replace('/tdd', '/research').replace('后面的正文必须保留', '后面的正文已修改'))
    assert.equal(await page.locator('.file-reference').count(), 7)
  })
  await check('开放目录搜索转换为闭合标签，后文不属于引用；一次撤销恢复搜索', async () => {
    await reset('目录 ')
    await end()
    await page.getByRole('button', { name: '下钻 有 空格/', exact: true }).click()
    assert.equal(await getText(), '目录 @"有 空格/')
    assert.equal(await page.locator('.file-reference').count(), 0)
    await page.getByRole('button', { name: '选定 有 空格/', exact: true }).click()
    assert.equal(await getText(), '目录 @"有 空格/" ')
    await page.keyboard.press('Control+z')
    assert.equal(await getText(), '目录 @"有 空格/')
    await page.keyboard.press('Control+Shift+z')
    await end()
    await page.keyboard.insertText('后续中文正文')
    assert.equal(await getText(), '目录 @"有 空格/" 后续中文正文')
    assert.equal(await page.locator('.file-reference').getAttribute('data-path'), '有 空格')
  })
  await check('选中引用后可以替换为同名的另一完整路径', async () => {
    await reset('前 @a/same.md 后')
    await input.click()
    await page.keyboard.press('Control+Home')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Shift+ArrowRight')
    await page.getByRole('button', { name: '选择 b/same.md', exact: true }).click()
    assert.equal(await getText(), '前 @b/same.md  后')
    await page.keyboard.press('Control+z')
    assert.equal(await getText(), '前 @a/same.md 后')
  })
  await check('真实键盘复制与剪切输出引用语法，粘贴恢复标签，撤销不丢内容', async () => {
    await reset(historyText)
    await input.click()
    await page.evaluate(() => {
      window.copiedText = null
      document.addEventListener('copy', event => { window.copiedText = event.clipboardData.getData('text/plain') })
      document.addEventListener('cut', event => { window.copiedText = event.clipboardData.getData('text/plain') })
    })
    await page.keyboard.press('Control+a')
    await page.keyboard.press('Control+c')
    assert.equal(await page.evaluate(() => window.copiedText), historyText)
    await page.keyboard.press('Control+x')
    assert.equal(await page.evaluate(() => window.copiedText), historyText)
    assert.equal(await getText(), '')
    await page.keyboard.press('Control+z')
    assert.equal(await getText(), historyText)
    await reset('')
    await input.click()
    await page.keyboard.press('Control+v')
    await page.waitForFunction(text => window.editorFixture.editor.getText() === text, historyText)
    assert.equal(await getText(), historyText)
    assert.equal(await page.locator('.file-reference').count(), 7)
    await page.keyboard.press('Control+z')
    assert.equal(await getText(), '')
  })
  await check('含标签的选区复制保持完整路径，选区粘贴仅替换目标文字', async () => {
    await reset('前 @a/same.md 后')
    await input.click()
    await page.keyboard.press('Control+Home')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('Shift+ArrowRight')
    await page.keyboard.press('Control+c')
    assert.equal(await page.evaluate(() => window.copiedText), '@a/same.md')
    await selectText('后')
    await paste('新文字 /tdd')
    assert.equal(await getText(), '前 @a/same.md 新文字 /tdd')
  })
  await check('输入法确认不发送，Shift+Enter 换行，Enter 发送精确文本', async () => {
    await reset('中文 /tdd')
    await end()
    const count = await page.evaluate(() => window.editorFixture.calls.length)
    await input.evaluate(element => element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 229, isComposing: true, bubbles: true, cancelable: true })))
    assert.equal(await page.evaluate(() => window.editorFixture.calls.length), count)
    await page.keyboard.press('Shift+Enter')
    await page.keyboard.insertText('下一行')
    assert.equal(await getText(), '中文 /tdd\n下一行')
    await page.keyboard.press('Enter')
    assert.equal(await page.evaluate(() => window.editorFixture.calls.at(-1).text), '中文 /tdd\n下一行')
    assert.equal(await page.evaluate(() => window.editorFixture.calls.length), count + 1)
  })
  await check('多个编辑区的正文和撤销记录相互独立，普通草稿未改变', async () => {
    await page.evaluate(() => {
      const container = document.createElement('div')
      container.id = 'second-editor'
      document.body.append(container)
      const face = window.__prototypeRegistrations.get('dsh-rich-input-feasibility').factory(() => { throw new Error('不应加载外部模块') })
      window.secondEditor = face.createEditor(container, { text: '第二份草稿' })
    })
    const second = page.locator('#second-editor [role="textbox"]')
    await second.click()
    await page.keyboard.press('Control+End')
    await page.keyboard.insertText(' 修改')
    await page.keyboard.press('Control+z')
    assert.equal(await page.evaluate(() => window.secondEditor.getText()), '第二份草稿')
    assert.equal(await getText(), '中文 /tdd\n下一行')
    assert.equal(await page.getByRole('textbox', { name: '普通草稿替身' }).inputValue(), '普通草稿：保留这些文字与附件。')
  })
  await check('导出后固定文本不随后续编辑变化；仅有本地静态网络请求', async () => {
    await reset(historyText)
    await page.getByRole('button', { name: '导出到接收替身' }).click()
    await end()
    await page.keyboard.insertText(' 后续编辑')
    assert.equal(await page.evaluate(() => window.editorFixture.calls.at(-1).text), historyText)
    assert.ok(network.every(url => url.startsWith(`http://127.0.0.1:${server.address().port}/`)))
    assert.deepEqual(errors, [])
  })
  await mkdir(root + 'evidence', { recursive: true })
  await page.screenshot({ path: root + 'evidence/editor.png', fullPage: true })
  const channel = process.env.EDITOR_BROWSER_CHANNEL ?? 'msedge'
  const evidence = { channel, browser: browser.version(), checks, errors, network, realModelRequests: 0, realSessionChanges: 0 }
  await writeFile(root + 'evidence/browser-' + channel + '.json', JSON.stringify(evidence, null, 2))
  console.log(JSON.stringify({ checks: checks.length, browser: browser.version(), errors: errors.length }))
} finally {
  await browser?.close()
  await new Promise(resolve => server.close(resolve))
}
