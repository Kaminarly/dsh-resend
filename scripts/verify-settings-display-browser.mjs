/** Saved display preferences and their dependent controls, with actual Desktop UI components. */
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import { startPreviewServer } from './preview-ui.mjs'

const output = new URL('../output/playwright/', import.meta.url)
await mkdir(output, { recursive: true })
const fixture = await startPreviewServer({ port: 0 })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const checks = [], errors = []
try {
  for (const dark of [false, true]) for (const width of [375, 1024]) {
    const page = await browser.newPage({ viewport: { width, height: 1100 } })
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(fixture.url + '/?settingsOnly' + (dark ? '&dark' : ''))
    const settings = page.locator('.dsh-resend-settings')
    const control = name => settings.getByRole('switch', { name, exact: true })
    const edit = control('显示编辑重发按钮'), regenerate = control('显示重新生成按钮')
    const editRange = control('只允许编辑重发最后一条用户消息')
    const regenerateRange = control('只允许重新生成最后一条助手回复')
    await edit.waitFor()
    assert.equal(await settings.getByRole('switch').count(), 4)
    assert.equal(await settings.getByText('消息下方的内联编辑器', { exact: true }).count(), 0)
    await editRange.click()
    await page.waitForFunction(() => window.uiFixture.face.preferences.getSnapshot().status === 'ready')
    await regenerateRange.click()
    await page.waitForFunction(() => window.uiFixture.face.preferences.getSnapshot().status === 'ready')
    for (const [showEdit, showRegenerate] of [[true, true], [false, true], [false, false], [true, false], [true, true]]) {
      for (const [toggle, next] of [[edit, showEdit], [regenerate, showRegenerate]]) {
        if ((await toggle.getAttribute('aria-checked') === 'true') !== next) {
          await toggle.click()
          await page.waitForFunction(() => window.uiFixture.face.preferences.getSnapshot().status === 'ready')
        }
      }
      assert.equal(await editRange.isDisabled(), !showEdit)
      assert.equal(await regenerateRange.isDisabled(), !showRegenerate)
      assert.equal(await editRange.getAttribute('aria-checked'), 'true')
      assert.equal(await regenerateRange.getAttribute('aria-checked'), 'true')
      const bounds = await settings.boundingBox()
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1)
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      checks.push({ width, dark, showEdit, showRegenerate, savedRestrictions: true })
      if (!showEdit && !showRegenerate) {
        await page.evaluate(async () => { await Promise.all(document.getAnimations().filter(a => a.effect.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))) })
        await page.screenshot({
          path: new URL(`settings-display-${dark ? 'dark' : 'light'}-${width}.png`, output).pathname.replace(/^\/([A-Z]:)/, '$1'),
          fullPage: true,
        })
      }
    }
    await page.close()
  }
  assert.deepEqual(errors, [])
  await writeFile(new URL('settings-display-result.json', output), JSON.stringify({ checks, errors,
    persistence: 'Verified separately through installed SettingsForms and temporary Profiles in preferences-persistence.test.mjs',
  }, null, 2) + '\n')
  console.log(`设置联动浏览器验收通过：${checks.length} 个开关组合与布局检查。`)
} finally { await browser.close(); await fixture.close() }
