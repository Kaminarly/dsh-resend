// Render the installed MenuView itself for visual comparison, without its Composer controller.
export function nativeTriggerMenuFixture(app) {
  const source = app.read('node_modules/@deepseek-ai/dsh-client-ui-input-trigger/lib/client.js')
  const stylesStart = source?.indexOf('const css = ".bqwvaa_menu') ?? -1
  const viewStart = source?.indexOf('const MAX_HEIGHT = 400;') ?? -1
  if (stylesStart < 0 || viewStart < 0) throw new Error('宿主原生菜单比较入口已变化')
  const styles = source.slice(stylesStart, source.indexOf('//#endregion', stylesStart))
  const view = source.slice(viewStart, source.indexOf('//#endregion', viewStart))
  return `{
    const react = globalThis.__UI_SEEDS__.react;
    const { createRoot } = globalThis.__UI_SEEDS__['react-dom/client'];
    const _deepseek_ai_dsh_client_ui_primitives = globalThis.__UI_SEEDS__['@deepseek-ai/dsh-client-ui-primitives'];
    const react_jsx_runtime = { jsx: (type, props, key) => react.createElement(type, { ...props, key }), jsxs: (type, props, key) => react.createElement(type, { ...props, key }) };
    const clsx = (...values) => values.filter(Boolean).join(' ');
    ${styles}
    ${view}
    globalThis.renderNativeTriggerMenu = (kind, candidates, width) => {
      let mount = document.getElementById('native-menu-comparison');
      if (mount) mount.remove();
      mount = document.createElement('div'); mount.id = 'native-menu-comparison';
      mount.style.cssText = 'position:absolute;left:-10000px;top:600px;width:' + width + 'px';
      document.body.appendChild(mount);
      const state = { open: true, highlight: { source: kind, index: 0 }, groups: [{ source: kind, status: 'ready', items: candidates }] };
      const menu = { getSnapshot: () => state, subscribe: () => () => {} };
      const trail = new Map();
      createRoot(mount).render(react.createElement(MenuView, { menu, headers: { getSnapshot: () => trail, subscribe: () => () => {} }, onPick() {}, onCrumb() {}, onHover() {}, onDismiss() {}, t: key => ({ skill: '技能', reference: '文件' })[key] ?? key }));
    };
  }`
}
