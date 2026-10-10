import { expect, it } from 'vitest'
import { createElement } from 'react'
import * as React from 'react'
import * as ReactDOM from 'react-dom'
import * as jsx from 'react/jsx-runtime'
import vm from 'node:vm'
import { clientHalf } from '../scripts/client-bundle.mjs'
import { resolveHostApp } from '../scripts/host-app.mjs'
import { renderDom } from './helpers/render.mjs'

const app = resolveHostApp()
it.skipIf(!app)('preserves the installed settings panel and changes only Message editing to its edit glyph', async () => {
  const source = app.read('node_modules/@deepseek-ai/dsh-client-ui-settings-general/lib/client.js')
  const iconStart = source.indexOf('function navIcon(')
  const iconEnd = source.indexOf('/**', iconStart)
  const panelStart = source.indexOf('function SettingsPanel(')
  const panelEnd = source.indexOf('function SettingsRoot(', panelStart)
  const classMap = source.match(/var SettingsRoot_module_css_default = (\{[\s\S]*?\});/)[1]
  const Gear = (props) => createElement('svg', { ...props, 'data-host-gear': true })
  const Panel = vm.runInNewContext(`const SettingsRoot_module_css_default = ${classMap};\n${source.slice(iconStart, iconEnd)}\n${source.slice(panelStart, panelEnd)}\nSettingsPanel`, {
    react: React, react_dom: ReactDOM, react_jsx_runtime: jsx, clsx: (...values) => values.filter(Boolean).join(' '),
    _deepseek_ai_dsh_client_ui_primitives: { useModalLayer() {}, IconSettingsOutlineMedium: Gear, IconCloseOutlineRegular: Gear },
    get document() { return globalThis.document },
  })
  const face = clientHalf().exports
  const selected = []
  const props = { rows: [{ id: 'general', label: '通用设置' }, { id: 'dsh-resend-preferences', label: createElement(face.SettingsNavigationLabel, { text: '消息编辑' }) }], activeId: 'dsh-resend-preferences', onSelect: (id) => selected.push(id), onClose() {},
    renderSlot: (slot, _props, options) => slot === 'settings.section' ? createElement('span', null, options.only) : '设置' }
  const dom = await renderDom(createElement(Panel, props))
  try {
    const buttons = [...document.body.querySelectorAll('nav button')]
    const editing = buttons.find((button) => button.textContent === '消息编辑')
    const general = buttons.find((button) => button.textContent === '通用设置')
    expect(editing.querySelector('[data-icon="edit-outline"]')).not.toBeNull()
    expect(editing.querySelector('.dsh-resend-settings-nav-label')).not.toBeNull()
    expect(general.querySelector('[data-host-gear]')).not.toBeNull()
    expect(document.body.querySelector('[role=dialog]').textContent).toContain('dsh-resend-preferences')
    await dom.click(general)
    expect(selected).toEqual(['general'])
  } finally { await dom.cleanup(); app.close?.() }
})
