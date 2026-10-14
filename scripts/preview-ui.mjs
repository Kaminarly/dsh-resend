#!/usr/bin/env node
/** Local visual fixture using the installed Desktop's React, controls and theme.
 * It loads no real Profile and never sends a real model/file operation.
 */
import http from 'node:http'
import path from 'node:path'
import { readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { transform } from 'esbuild'
import { resolveHostApp } from './host-app.mjs'
import { contentDiff } from '../src/content-diff.js'

export async function startPreviewServer({ invoke, fixture, clientBundlePath, port = Number(process.env.DSH_PREVIEW_PORT ?? 43129) } = {}) {
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
const html = index.replace(/<link[^>]+rel="manifest"[^>]*>/g, '').replace('<title>DeepSeek Harness</title>', '<title>DSH Resend 界面验证</title>')
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
const deliveryFixture = ${JSON.stringify(fixture ?? null)};
const dictionaries = { chat: { zh: host.zh, en: host.en } };
const translate = (ns) => (key, args = {}) => {
  let text = dictionaries[ns]?.zh?.[key] ?? ({copy:'复制',copied:'已复制'})[key] ?? key;
  for (const [key,value] of Object.entries(args)) text = text.replaceAll('{' + key + '}', String(value));
  return text;
};
const listeners = new Set();
const registrations = [{ options: { key:'user' }, locale:'chat', component:host.UserMessageNodeView }];
// Browser storage belongs only to this simulated fixture. The real plugin
// persists completion through the Host's private outcome files.
const rollbackDemoKey = 'dsh-resend-ui.file-rollback-result';
const contentParams = new URLSearchParams(location.search);
const contentFixture = contentParams.has('contentPreview');
const contentFiles = [
  {path:'src/中文目录/非常长的路径/用于确认完整路径不会挤压按钮/相同文件名.js',action:'restore'},
  {path:'src/另一个目录/相同文件名.js',action:'restore',operation:'delete'},
  {path:'empty.txt',action:'restore',operation:'delete'},
  {path:'README.md',action:'refuse',reason:'content-diverged'}
];
if (contentParams.has('longPaths')) {
  const filename = '用于辨认对象的长文件名'.repeat(6) + '.js';
  contentFiles[0].path = 'src/' + '非常长的中文目录/'.repeat(60) + filename;
  contentFiles[1].path = 'src/另一个目录/' + filename;
}
const contentExample = ${JSON.stringify(contentDiff(Buffer.from(Array.from({ length: 120 }, (_, i) => i === 5 ? 'const message = "当前中文内容";' : i === 8 ? '<script>不会执行</script>' : i === 10 ? 'const longLine = "' + '长行'.repeat(300) + '";' : `// 第 ${i + 1} 行上下文`).join('\n')),
  Buffer.from('\ufeff' + Array.from({ length: 120 }, (_, i) => i === 5 ? 'const message = "工作前保存的中文内容";' : i === 8 ? '// 恢复的内容' : i === 10 ? 'const longLine = "恢复后的内容";' : `// 第 ${i + 1} 行上下文`).join('\r\n') + '\r\n')))};
let contentReads = 0;
const demoContent = async request => {
  contentReads++;
  await new Promise(resolve=>setTimeout(resolve,Number(contentParams.get('contentDelay')??100)));
  const state = contentParams.get('contentState');
  const result = state === 'stale' ? {ok:false,error:{code:'plan-not-found'}}
    : state === 'error' && contentReads === 1 ? {ok:false,error:{code:'read-failed'}}
    : state === 'unavailable' ? {ok:true,value:{status:'unavailable',reason:'too-large',action:'restore',sizes:{current:4000000,target:12345}}}
    : request.path === 'empty.txt' ? {ok:true,value:${JSON.stringify(contentDiff(Buffer.from(''), null))}}
    : {ok:true,value:contentExample};
  return {ok:true,value:result};
};
const demoRollback = async (request) => {
  const saved = localStorage.getItem(rollbackDemoKey);
  if (saved) return {ok:true,value:JSON.parse(saved)};
  if (request.phase === 'status') return {ok:true,value:{ok:true,value:{planId:'',completed:false,files:[]}}};
  const result = {ok:true,value:{planId:'preview-plan',scope:request.scope,files:contentFixture?contentFiles:[{path:'src/example.js',action:'restore'},{path:'README.md',action:'refuse',reason:'content-diverged'}]}};
  if (request.phase === 'execute') { result.value.completed = true; localStorage.setItem(rollbackDemoKey,JSON.stringify(result)); }
  return {ok:true,value:result};
};
const cleanupSessions = [
  {sessionId:'cleanup-a',title:'文件回滚界面调整',projectPath:'D:/Code/MJ-Project/dsh-resend-2',records:4,bytes:245760,noSnapshots:false},
  {sessionId:'cleanup-b',title:'历史空清单会话',projectPath:'D:/Code/示例项目',records:1,bytes:128,noSnapshots:true}
];
const demoCleanup = async (request) => {
  const delay = Number(new URLSearchParams(location.search).get('cleanupDelay') ?? 150);
  await new Promise(resolve=>setTimeout(resolve,Math.min(10000,Math.max(0,delay))));
  const sessions = cleanupSessions.filter(session=>(request.sessionIds??[]).includes(session.sessionId));
  const value = request.phase === 'list' ? {phase:'list',sessions:cleanupSessions,unreadableSessions:0}
    : request.phase === 'cancel' ? {phase:'cancel'} : request.phase === 'execute' ? {phase:'execute',releasedBytes:131072,
      results:request.mode==='sessions'?[{sessionId:'cleanup-a',title:'文件回滚界面调整',status:'cleaned',reason:'',bytes:0},
        {sessionId:'cleanup-b',title:'历史空清单会话',status:'skipped',reason:'generating',bytes:0}]:[],failures:[],changedCount:0,protectedObjects:false}
      : {phase:'preview',planId:'cleanup-demo',sessions,estimatedBytes:131072,itemCount:8,protectedObjects:false,unreadableSessions:0,
        categories:[{kind:'records',count:2,bytes:1024},{kind:'outcomes',count:1,bytes:256},{kind:'objects',count:5,bytes:129792}]};
  return {ok:true,value:{ok:true,value}};
};
let remote = { $mount: async () => {}, resend: { conversation: async () => ({ok:true,value:{ok:true,value:{assistantSeqs:[1,3],lastReplySeq:3,userSeqs:[0,2],lastUserSeq:2}}}), replay: async request => ({ok:true,value:contentFixture ? request.phase === 'start' ? {ok:true,value:{preflight:true,preflightId:'fixture-preflight',planId:'preview-plan',userSeq:2,op:'edit',files:contentFiles}} : {ok:true,value:{canceled:true}} : {ok:false,error:{code:'agent-busy'}}}), apply: async () => ({ok:true,value:{ok:false,error:{code:'agent-busy'}}}), content:demoContent,rollback:demoRollback,cleanup:demoCleanup } };
if (deliveryFixture) remote = { $mount: async () => {}, resend: Object.fromEntries(['conversation','replay','apply','content','rollback'].map(method => [method, async request => {
  const response = await fetch('/rollback-rpc', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({method,request})});
  if (!response.ok) throw new Error('验收接口失败');
  return response.json();
}])) };
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
const contextEvents = new Map();
const ctx = {
  on:(name,callback)=>{const held=contextEvents.get(name)??new Set();held.add(callback);contextEvents.set(name,held);return()=>held.delete(callback)},
  remote, configForms, root:{}, effect:(callback)=>callback(), inject:(_deps,callback)=>callback(ctx),
  locale:{ register:(ns,table)=>{dictionaries[ns]=table}, bind:translate },
  uiConversation:{events:{register:()=>()=>{}}},
  sessions:{scope:(sessionId)=>({sessionId})}, conversation:{input:{for:()=>({state:{getSnapshot:()=>({phase:'plain'})}})}},
  slots:{ inject:(_name,callback)=>callback(), entries:()=>registrations,
    subscribe:(_name,callback)=>{listeners.add(callback);return()=>listeners.delete(callback)},
    register:(options,component)=>{const entry={options,component,locale:options.locale};registrations.push(entry);listeners.forEach(fn=>fn());return()=>{registrations.splice(registrations.indexOf(entry),1);listeners.forEach(fn=>fn())}} }
};
await face.apply(ctx);
if (contentParams.has('longPaths')) dictionaries['dsh-resend'].zh = {...dictionaries['dsh-resend'].zh,
  'files.reason.content-diverged':'文件已被其他操作修改。'.repeat(30)};
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
const render = seeds['react-dom/client'].createRoot(document.getElementById('root'));
const rollbackPoint = {sessionId:deliveryFixture?.sessionId ?? 'fixture',carrierSeq:deliveryFixture?.carrierSeq ?? 5};
const preflightEntry = h(face.ReplayPreflight,{operations,sessionId:rollbackPoint.sessionId,userSeq:2,portal:true,t});
function HostModalFixture() {
  const [open,setOpen] = React.useState(false);
  const {Button,Modal} = seeds['@deepseek-ai/dsh-client-ui-primitives'];
  return h(React.Fragment,null,h(Button,{onClick:()=>setOpen(true)},'打开宿主原生弹窗'),
    h(Modal,{open,onClose:()=>setOpen(false),title:'宿主原生弹窗'},h('p',null,'对照字体、背景、按钮、圆角与阴影。')));
}
function DeliveryReplayResult() {
  const records = React.useSyncExternalStore(operations.subscribe,()=>operations.recordsFor(rollbackPoint.sessionId));
  return records.map(record=>h(face.RewindRow,{key:record.carrierSeq,t,outcome:record,
    onSendAgain:()=>void operations.sendAgain({sessionId:rollbackPoint.sessionId,carrierSeq:record.carrierSeq})}));
}
render.render(deliveryFixture ? h(React.Fragment,null,
  h(face.FileRollbackPreview,{t,operations,point:rollbackPoint}),
  h('button',{onClick:()=>void operations.run({sessionId:rollbackPoint.sessionId,targetSeq:2,op:'edit',text:'编辑后的验收消息'})},'打开重发前面板'),preflightEntry,h(DeliveryReplayResult)
) : new URLSearchParams(location.search).has('settingsOnly') ? h(settings.component,{}) : h(React.Fragment,null,
  heading('用户消息'),h('div',{'data-chat-flow-kind':'user'},h(native.component,{...base,node:user,...native.options.inject('fixture')})),
  heading('较早用户消息'),h('div',{'data-chat-flow-kind':'user','data-earlier-user':true},h(native.component,{...base,node:oldUser,...native.options.inject('fixture')})),
  heading('助手回复'),h('p',null,'编辑入口与复制图标相邻；操作名称在悬停时显示。'),h('div',{style:{height:40,overflow:'hidden'},'data-clipped-actions':true},h(host.MessageIconActions,{text:'示例回复',t:translate('chat'),extraActions:h(regen.component,{...base,messageId:'reply-3'})})),
  heading('较早回复'),h(host.MessageIconActions,{text:'较早回复示例',t:translate('chat'),extraActions:h(regen.component,{...base,messageId:'reply-1'})}),
  heading('重试提示'),h(face.RewindRow,{t,outcome:{status:'resend-failed'},onSendAgain:()=>{}}),
  h(SettingsFixture),heading('文件回滚'),h(face.FileRollbackPreview,{t,operations,point:{sessionId:'fixture',carrierSeq:5}}),
  contentFixture && h('button',{onClick:()=>void operations.run({sessionId:'fixture',targetSeq:2,op:'edit',text:'模拟重发'})},'打开重发前面板'),
  contentFixture && preflightEntry,
  h(HostModalFixture),
  contentParams.has('mixedResults') && h(face.FileRollbackPreview,{t,operations:{rollback:async()=>({ok:true,value:{completed:true,files:[
    {path:contentFiles[0].path,action:'restored'}, {path:contentFiles[1].path,action:'kept'},
    {path:'README.md',action:'refuse',reason:'content-diverged'}]}})},point:{sessionId:'mixed',carrierSeq:5}}),
  h('button',{onClick:()=>{localStorage.removeItem(rollbackDemoKey);location.reload()}},'重置回滚演示')
));
window.uiFixture = {face,host,seeds,registrations,snapshot,remote,operations,
  reconnect:()=>{for(const callback of contextEvents.get('connection/reset')??[])callback()}};
document.body.style.background = 'var(--dsw-alias-bg-base)';
if (new URLSearchParams(location.search).has('dark')) document.body.setAttribute('data-ds-dark-theme','');
`

await transform(preview, { loader: 'js', format: 'esm' })

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost')
  if (url.pathname === '/rollback-rpc' && invoke && request.method === 'POST') {
    try {
      const parts = []; let bytes = 0;
      for await (const part of request) { bytes += part.length; if (bytes > 65536) throw new Error('请求过大'); parts.push(part); }
      const {method,request:payload} = JSON.parse(Buffer.concat(parts).toString('utf8'));
      if (!['conversation','replay','apply','content','rollback'].includes(method)) throw new Error('未知验收接口');
      response.setHeader('Content-Type','application/json; charset=utf-8');
      response.end(JSON.stringify(await invoke(method,payload)));
    } catch (error) { response.writeHead(400); response.end(String(error.message)); }
    return;
  }
  const routes = { '/': ['text/html', html], '/preview.js': ['text/javascript', preview],
    '/favicon.svg': ['image/svg+xml', app.read(frontend + 'favicon.svg')],
    '/host-chat.js': ['text/javascript', chat], '/host-theme.js': ['text/javascript', theme], '/settings-panel.js': ['text/javascript', settingsPanel],
    '/plugin.js': ['text/javascript', readFileSync(clientBundlePath ?? path.join(root,new URL(request.headers.referer??'http://localhost').searchParams.has('baseline')?'.tmp/ui-01-baseline/client.bundle.js':'lib/client.bundle.js'), 'utf8')],
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
}).listen(port, '127.0.0.1')
await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject)})
return { server, app, url: 'http://127.0.0.1:' + server.address().port,
  close: async () => { await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve())); app.close?.() } }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const fixture = await startPreviewServer()
  console.log('UI fixture: ' + fixture.url + ' (installed Desktop controls; simulated operations only)')
}
