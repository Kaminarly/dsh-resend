#!/usr/bin/env node
/** Local visual fixture using the installed Desktop's React, controls and theme.
 * It loads no real Profile and never sends a real model/file operation.
 */
import http from 'node:http'
import path from 'node:path'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { transform } from 'esbuild'
import { resolveHostApp } from './host-app.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const app = resolveHostApp()
if (!app) throw new Error('An installed DSH Desktop is required for the visual fixture')
const frontend = 'node_modules/@deepseek-ai/dsh-web-frontend/dist/'
const index = app.read(frontend + 'index.html')
const asset = index.match(/src="\.\/(assets\/[^"\s]+\.js)"/)?.[1]
if (!asset) throw new Error('The installed frontend entry was not found')
const boot = app.read(frontend + asset)
const cut = boot.lastIndexOf('const fo=globalThis.dshDesktopBoot')
if (cut < 0 || !boot.includes('function rM()')) throw new Error('The installed frontend seed table changed; update this fixture')
const html = index.replace('<title>DeepSeek Harness</title>', '<title>DSH Resend 界面验证</title>')
  .replace('<div id="root"></div>', '<main id="root" style="max-width:900px;margin:40px auto;padding:0 24px"></main>')
const chat = app.read('node_modules/@deepseek-ai/dsh-client-ui-chat/lib/client.js')
  .replace('return module.exports;', 'exports.preview = { UserMessageNodeView, MessageIconActions, zh, en }; return module.exports;')
const theme = app.read('node_modules/@deepseek-ai/dsh-client-ui-theme/lib/client.js')
  .replace('return module.exports;', 'exports.preview = { installThemeStyles }; return module.exports;')
const settingsSource = app.read('node_modules/@deepseek-ai/dsh-client-ui-settings-general/lib/client.js')
const navStart = settingsSource.indexOf('function navIcon(')
const navEnd = settingsSource.indexOf('/**', navStart)
const panelStart = settingsSource.indexOf('function SettingsPanel(')
const panelEnd = settingsSource.indexOf('function SettingsRoot(', panelStart)
const settingsClassMap = settingsSource.match(/var SettingsRoot_module_css_default = (\{[\s\S]*?\});/)[1]
const settingsStyleStart = settingsSource.indexOf('SettingsRoot.module.css.mjs')
const settingsCSS = JSON.parse(settingsSource.slice(settingsStyleStart).match(/const css(?:\$\d+)? = ("(?:[^"\\]|\\.)*");/)[1])
const settingsPanel = `
const seeds = globalThis.__UI_SEEDS__;
const react = seeds.react, react_dom = seeds['react-dom'], react_jsx_runtime = seeds['react/jsx-runtime'];
const _deepseek_ai_dsh_client_ui_primitives = seeds['@deepseek-ai/dsh-client-ui-primitives'];
const clsx = (...values) => values.filter(Boolean).join(' ');
const SettingsRoot_module_css_default = ${settingsClassMap};
const style = document.createElement('style'); style.textContent = ${JSON.stringify(settingsCSS)}; document.head.append(style);
${settingsSource.slice(navStart, navEnd)}
${settingsSource.slice(panelStart, panelEnd)}
window.__HOST_SETTINGS_PANEL__ = SettingsPanel;
`
const runtime = `${boot.slice(0, cut)}
globalThis.__UI_SEEDS__ = rM();
await import('/preview.js');
`
const preview = `
const seeds = globalThis.__UI_SEEDS__;
const queue = new Map();
window.__ModuleLoader__ = { load: (entry) => queue.set(entry.id, entry) };
for (const url of ['/host-theme.js','/host-chat.js','/plugin.js']) await new Promise((resolve,reject) => {
  const script = document.createElement('script'); script.src = url; script.onload = resolve; script.onerror = reject; document.head.append(script);
});
const require = (key) => { if (!(key in seeds)) throw new Error('Missing seed: ' + key); return seeds[key] };
const theme = queue.get('@deepseek-ai/dsh-client-ui-theme').factory(require);
theme.preview.installThemeStyles({ effect: (callback) => callback() });
const host = queue.get('@deepseek-ai/dsh-client-ui-chat').factory(require).preview;
await import('/settings-panel.js');
const face = queue.get('dsh-resend').factory(require);
const React = seeds.react, h = React.createElement;
const dictionaries = { chat: { zh: host.zh, en: host.en } };
const translate = (ns) => (key, args = {}) => {
  let text = dictionaries[ns]?.zh?.[key] ?? ({copy:'复制',copied:'已复制'})[key] ?? key;
  for (const [key,value] of Object.entries(args)) text = text.replaceAll('{' + key + '}', String(value));
  return text;
};
const listeners = new Set();
const registrations = [{ options: { key:'user' }, locale:'chat', component:host.UserMessageNodeView }];
const remote = { $mount: async () => {}, resend: { conversation: async () => ({ok:true,value:{ok:true,value:{assistantSeqs:[1,3],lastReplySeq:3,userSeqs:[0,2],lastUserSeq:2}}}), apply: async () => ({ok:true,value:{ok:false,error:{code:'agent-busy'}}}), rollback: async (request) => ({ok:true,value:{ok:true,value:{planId:'preview-plan',scope:request.scope,files:[{path:'src/example.js',action:'restore'},{path:'README.md',action:'refuse',reason:'content-diverged'}],conversation:request.scope==='artifacts'?undefined:{action:'rewind',count:3}}}}) } };
// This visual fixture simulates the saved document. Durable Profile behavior
// is exercised separately against the installed SettingsForms/ConfigEditor.
let settingsView = {status:'ready',error:null,view:{writable:true,namespaces:[{ns:'dsh-resend',value:{inlineEditorBeneathMessage:true,regenerateLastReply:true}}]}};
const settingsListeners = new Set();
const settingsMirror = {getSnapshot:()=>settingsView,subscribe:(fn)=>{settingsListeners.add(fn);return()=>settingsListeners.delete(fn)},ensure:async()=>{},load:async()=>{}};
const configForms = {describe:()=>settingsMirror,get:()=>({getSnapshot:()=>({mode:'host'}),set:async(field,value)=>{
  await new Promise(resolve=>setTimeout(resolve,350));
  const row=settingsView.view.namespaces[0];
  settingsView={...settingsView,view:{...settingsView.view,namespaces:[{...row,value:{...row.value,[field]:value}}]}};
  settingsListeners.forEach(fn=>fn());return true;
}})};
const ctx = {
  remote, configForms, root:{}, effect:(callback)=>callback(), inject:(_deps,callback)=>callback(ctx),
  locale:{ register:(ns,table)=>{dictionaries[ns]=table}, bind:translate },
  uiConversation:{events:{register:()=>()=>{}}},
  sessions:{scope:(sessionId)=>({sessionId})}, conversation:{input:{for:()=>({state:{getSnapshot:()=>({phase:'plain'})}})}},
  slots:{ inject:(_name,callback)=>callback(), entries:()=>registrations,
    subscribe:(_name,callback)=>{listeners.add(callback);return()=>listeners.delete(callback)},
    register:(options,component)=>{const entry={options,component,locale:options.locale};registrations.push(entry);listeners.forEach(fn=>fn());return()=>{registrations.splice(registrations.indexOf(entry),1);listeners.forEach(fn=>fn())}} }
};
await face.apply(ctx);
const user = {key:'user-2',kind:'user',anchorSeq:2,data:{seq:2,time:Date.now(),content:[{type:'text',text:'请把编辑入口放到复制按钮旁。\\n按钮和输入框保持 DSH Desktop 的风格。'},{type:'file',attachment:{name:'说明.md',bytes:128}}],referenceLabels:['src/example.js'],skillNames:['grilling']}};
const oldUser = {...user,key:'user-0',anchorSeq:0,data:{...user.data,seq:0,content:[{type:'text',text:'较早的用户消息'}]}};
const companion = {key:'companion',kind:'dsh-resend-regenerate',visibility:'hidden',anchorSeq:3,data:{id:'reply-3',seq:3,prevSeq:null,prompt:{seq:2,isAppend:true,sourceKind:'user',hasText:true}}};
const earlier = {key:'earlier',kind:'dsh-resend-regenerate',visibility:'hidden',anchorSeq:1,data:{id:'reply-1',seq:1,prevSeq:null,prompt:{seq:0,isAppend:true,sourceKind:'user',hasText:true}}};
const snapshot = {nodes:new Map([[oldUser.key,oldUser],[user.key,user],[earlier.key,earlier],[companion.key,companion]])};
const t = translate('dsh-resend');
const base = {sessionId:'fixture',t,useChat:(select)=>select(snapshot),useInput:(select)=>select({phase:'plain'}),useSession:(select)=>select({running:new URLSearchParams(location.search).has('busy')}),inputActions:{setDraft:(text)=>{window.fixtureDraft=text}},renderMessageImages:()=>null,openFile:()=>{},openSkill:()=>{}};
const native = registrations.find(entry=>entry.options.key==='user'&&entry.locale==='dsh-resend');
const regen = registrations.find(entry=>entry.options.id==='dsh-resend-regenerate');
const settings = registrations.find(entry=>entry.options.id==='dsh-resend-preferences');
const operations = face.createResendOperations(remote);
const heading = (text) => h('h2',{style:{fontSize:'16px',fontWeight:500,margin:'28px 0 14px'}},text);
function SettingsFixture() {
  const [open,setOpen] = React.useState(false);
  const [active,setActive] = React.useState('dsh-resend-preferences');
  const Panel = window.__HOST_SETTINGS_PANEL__;
  return h(React.Fragment,null,h('button',{onClick:()=>setOpen(true)},'打开设置'),open&&h(Panel,{
    rows:[{id:'general',label:'通用设置'},...registrations.filter(entry=>entry.options.name==='settings.section').map(entry=>({id:entry.options.id,label:entry.options.label()}))],
    activeId:active,onSelect:setActive,onClose:()=>setOpen(false),renderSlot:(slot,_props,options)=>slot==='settings.section'?(options.only==='general'?h('p',null,'通用设置内容'):h(settings.component,{})):slot==='settings.action'?registrations.filter(entry=>entry.options.name==='settings.action').map(entry=>h(entry.component,{key:entry.options.id})):slot==='settings.close'?'关闭':'设置'
  }));
}
seeds['react-dom/client'].createRoot(document.getElementById('root')).render(h(React.Fragment,null,
  heading('用户消息'),h('div',{'data-chat-flow-kind':'user'},h(native.component,{...base,node:user,...native.options.inject('fixture')})),
  heading('较早用户消息'),h('div',{'data-chat-flow-kind':'user','data-earlier-user':true},h(native.component,{...base,node:oldUser,...native.options.inject('fixture')})),
  heading('助手回复'),h('p',null,'编辑入口与复制图标相邻；操作名称在悬停时显示。'),h('div',{style:{height:40,overflow:'hidden'},'data-clipped-actions':true},h(host.MessageIconActions,{text:'示例回复',t:translate('chat'),extraActions:h(regen.component,{...base,messageId:'reply-3'})})),
  heading('较早回复'),h(host.MessageIconActions,{text:'较早回复示例',t:translate('chat'),extraActions:h(regen.component,{...base,messageId:'reply-1'})}),
  heading('重试提示'),h(face.RewindRow,{t,outcome:{status:'resend-failed'},onSendAgain:()=>{}}),
  h(SettingsFixture),heading('文件回滚'),h(face.FileRollbackPreview,{t,operations,point:{sessionId:'fixture',carrierSeq:5}})
));
window.uiFixture = {face,host,seeds,registrations,snapshot};
document.body.style.background = 'var(--dsw-alias-bg-base)';
if (new URLSearchParams(location.search).has('dark')) document.body.setAttribute('data-ds-dark-theme','');
`

await transform(preview, { loader: 'js', format: 'esm' })

http.createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost')
  const routes = { '/': ['text/html', html], '/preview.js': ['text/javascript', preview],
    '/favicon.svg': ['image/svg+xml', app.read(frontend + 'favicon.svg')],
    '/host-chat.js': ['text/javascript', chat], '/host-theme.js': ['text/javascript', theme], '/settings-panel.js': ['text/javascript', settingsPanel],
    '/plugin.js': ['text/javascript', readFileSync(path.join(root,new URL(request.headers.referer??'http://localhost').searchParams.has('baseline')?'.tmp/ui-01-baseline/client.bundle.js':'lib/client.bundle.js'), 'utf8')],
    ['/' + asset]: ['text/javascript', runtime] }
  try {
    if (routes[url.pathname]) {
      const [type, content] = routes[url.pathname]; response.setHeader('Content-Type', type + '; charset=utf-8'); response.end(content); return
    }
    // The whitelist avoids exposing the app directory or any profile data.
    if (!/^\/assets\/[A-Za-z0-9_./-]+$/.test(url.pathname) || url.pathname.includes('..')) { response.writeHead(404); response.end(); return }
    const content = app.kind === 'dir' ? readFileSync(path.join(app.root, frontend, url.pathname.slice(1))) : undefined
    if (!content) { response.writeHead(404); response.end(); return }
    response.setHeader('Content-Type', url.pathname.endsWith('.css') ? 'text/css' : url.pathname.endsWith('.js') ? 'text/javascript' : 'application/octet-stream')
    response.end(content)
  } catch (error) { response.writeHead(404); response.end(String(error.message)) }
}).listen(Number(process.env.DSH_PREVIEW_PORT ?? 43129), '127.0.0.1', function () {
  console.log('UI fixture: http://127.0.0.1:' + this.address().port + ' (installed Desktop controls; simulated operations only)')
})
