// Seed an isolated page with the installed Desktop's actual React, controls and theme.
import { resolveHostApp } from '../host-app.mjs'

export function createHostBrowserFixture() {
  const app = resolveHostApp()
  if (!app) throw new Error('浏览器交付验收需要已安装的 DSH Desktop')
  const frontend = 'node_modules/@deepseek-ai/dsh-web-frontend/dist/'
  const index = app.read(frontend + 'index.html')
  const asset = index.match(/src="\.\/(assets\/[^"\s]+\.js)"/)?.[1]
  if (!asset) throw new Error('宿主前端入口已变化')
  const boot = app.read(frontend + asset)
  const cut = boot.lastIndexOf('const fo=globalThis.dshDesktopBoot')
  if (cut < 0 || !boot.includes('function rM()')) throw new Error('宿主前端模块表已变化')
  const theme = app.read('node_modules/@deepseek-ai/dsh-client-ui-theme/lib/client.js')
    .replace('return module.exports;', 'exports.installFixtureTheme = installThemeStyles; return module.exports;')
  const runtime = `${boot.slice(0, cut)}
globalThis.__UI_SEEDS__ = rM();
let themeEntry;
window.__ModuleLoader__ = { load: entry => { themeEntry = entry } };
await new Promise((resolve, reject) => {
  const script = document.createElement('script'); script.src = '/host-theme.js';
  script.onload = resolve; script.onerror = reject; document.head.append(script);
});
themeEntry.factory(name => globalThis.__UI_SEEDS__[name]).installFixtureTheme({ effect: fn => fn() });
document.body.style.background = 'var(--dsw-alias-bg-base)';
if (new URLSearchParams(location.search).has('dark')) document.body.setAttribute('data-ds-dark-theme', '');
for (const url of ['/fixture.js', '/client.js']) await new Promise((resolve, reject) => {
  const script = document.createElement('script'); script.src = url;
  script.onload = resolve; script.onerror = reject; document.head.append(script);
});`
  const content = '<main><h1>临时输入框隔离验收</h1><div id="row"></div><section id="composer"><label>普通草稿<textarea id="ordinary">普通正文 /skill @keep</textarea></label><span data-attachment="附件.pdf">附件.pdf</span></section></main>'
  const html = index.replace(/<link[^>]+rel="manifest"[^>]*>/gu, '')
    .replace('<title>DeepSeek Harness</title>', '<title>临时输入框隔离验收</title>')
    .replace('<div id="root"></div>', content)
    .replace('</head>', '<style>main{box-sizing:border-box;max-width:900px;margin:32px auto;padding:0 16px}#composer{margin-top:32px;padding:16px;border:1px solid #ccc}#ordinary{max-width:100%}</style></head>')
  return {
    html,
    read(url) {
      if (url === '/' + asset) return runtime
      if (url === '/host-theme.js') return theme
      if (url === '/favicon.svg') return app.read(frontend + 'favicon.svg')
      if (/^\/assets\/[A-Za-z0-9_./-]+$/u.test(url) && !url.includes('..')) return app.read(frontend + url.slice(1))
    },
    close: () => app.close?.(),
  }
}
