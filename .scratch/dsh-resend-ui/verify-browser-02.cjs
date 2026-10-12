/** playwright-cli -s=dsh-ui02 run-code --filename=<this file>. Baseline mode must fail. */
async (page) => {
  const baseline = new URL(page.url()).searchParams.has('baseline')
  await page.goto('http://127.0.0.1:43129/' + (baseline ? '?baseline' : ''))
  await page.setViewportSize({ width: 1280, height: 900 })
  const checks = []
  const check = (ok, text) => { if (!ok) throw new Error(text); checks.push(text) }
  await page.getByRole('button', { name: '重新生成', exact: true }).click()
  const error = page.getByRole('alert').filter({ hasText: '重新生成' }).first()
  await error.waitFor({ state: 'attached' })
  const clipped = await error.evaluate((el) => {
    const rect = el.getBoundingClientRect()
    for (let parent = el.parentElement; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent), box = parent.getBoundingClientRect()
      if (['hidden','clip'].includes(style.overflowY) && (rect.top < box.top || rect.bottom > box.bottom)) return true
      if (['hidden','clip'].includes(style.overflowX) && (rect.left < box.left || rect.right > box.right)) return true
    }
    return false
  })
  check(!clipped, '重新生成错误提示被操作区裁切')
  check(await error.textContent().then(text => text.includes('请先停止回复') && text.includes('agent-busy')), '重新生成错误必须说明原因与处理办法')
  await page.mouse.move(10,10)
  await page.screenshot({ path: 'D:/Code/MJ-Project/dsh-resend-2/output/playwright/dsh-ui02-error-light.png', fullPage: true })
  await page.setViewportSize({ width:390, height:844 })
  const box = await error.boundingBox()
  check(box.x >= 0 && box.x + box.width <= 390 && box.y >= 0 && box.y + box.height <= 844, '窄窗口提示超出视口')
  await page.getByRole('button', { name:'关闭错误提示', exact:true }).click()
  check(await error.count() === 0, '关闭错误提示失败')
  await page.setViewportSize({ width:1280, height:900 })
  await page.getByRole('button',{ name:'打开设置',exact:true }).click()
  const dialog = page.getByRole('dialog')
  const editing = dialog.getByRole('button',{ name:'消息编辑', exact:true })
  const glyph = (paths) => paths.map(path=>path.getAttribute('d')).join('|')
  const navGlyph = await editing.locator('.dsh-resend-settings-nav-label svg path').evaluateAll(glyph)
  const editGlyph = await page.locator('.dsh-resend-user-message').getByRole('button',{name:'编辑',exact:true}).locator('svg path').evaluateAll(glyph)
  check(navGlyph !== '' && navGlyph === editGlyph, '独立设置入口缺少编辑图标')
  check(await editing.locator(':scope > svg').evaluate(el=>getComputedStyle(el).display) === 'none', '宿主默认齿轮图标仍与编辑图标重复显示')
  check(await dialog.getByRole('switch').count() === 3, '消息编辑页缺少已有设置')
  const toggle = dialog.getByRole('switch').first()
  await toggle.click()
  check(await toggle.getAttribute('aria-checked') === 'false', '独立设置页开关没有生效')
  await toggle.click()
  await dialog.getByRole('button',{name:'通用设置',exact:true}).click()
  check(await dialog.getByRole('switch').count() === 0, '通用设置仍显示插件设置')
  await editing.click()
  await page.screenshot({ path:'D:/Code/MJ-Project/dsh-resend-2/output/playwright/dsh-ui02-settings-light.png',fullPage:true })
  await page.evaluate(()=>document.body.setAttribute('data-ds-dark-theme',''))
  await page.screenshot({ path:'D:/Code/MJ-Project/dsh-resend-2/output/playwright/dsh-ui02-settings-dark.png',fullPage:true })
  await dialog.getByRole('button',{ name:'关闭', exact:true }).click()
  const user = page.locator('.dsh-resend-user-message')
  await user.getByRole('button',{ name:'编辑', exact:true }).click()
  await user.getByRole('textbox').fill('修改后的中文第一行\n第二行')
  await user.getByRole('button',{ name:'发送',exact:true }).click()
  const editError = user.getByRole('alert')
  check(await editError.textContent().then(text=>text.includes('请先停止回复')&&text.includes('agent-busy')), '编辑重发未说明具体失败原因')
  check(await user.getByRole('textbox').inputValue() === '修改后的中文第一行\n第二行', '失败后编辑内容丢失')
  await page.getByRole('button',{ name:'重新生成',exact:true }).click()
  await page.screenshot({ path:'D:/Code/MJ-Project/dsh-resend-2/output/playwright/dsh-ui02-error-dark.png',fullPage:true })
  await page.setViewportSize({ width:390,height:844 })
  await page.screenshot({ path:'D:/Code/MJ-Project/dsh-resend-2/output/playwright/dsh-ui02-narrow.png',fullPage:true })
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth), '窄窗口发生横向溢出')
  return checks
}
