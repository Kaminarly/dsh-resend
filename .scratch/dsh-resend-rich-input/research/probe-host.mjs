// Read-only probe of installed host code. No real Session, model, or profile is used.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import vm from 'node:vm'
import { createResendOperations } from '../../../src/resend-operations.js'

const root = process.env.DSH_RESEARCH_PACKAGES ?? 'D:/DSH Desktop/resources/app/node_modules/@deepseek-ai'
const load = (relative) => import(pathToFileURL(path.join(root, relative)).href)
const { activeAtToken, formatFileMention } = await load('dsh-file-reference/lib/types/grammar.js')
const { apply } = await load('dsh-tool-skill/lib/index.js')
let checks = 0
const check = (title, run) => { run(); checks++; console.log('PASS ' + title) }

function browserSource(packageName) {
  let registration
  vm.runInNewContext(readFileSync(path.join(root, packageName, 'lib/client.js'), 'utf8'), {
    window: { __ModuleLoader__: { load: value => { registration = value } } },
    console, AbortController,
  })
  const exports = registration.factory(() => ({}))
  let source
  const triggers = { registerSource: value => { source = value; return () => {} } }
  const sessions = {}
  exports.apply({
    locale: { register: () => () => {}, bind: () => value => value },
    effect: run => run(), get: name => name === 'inputTriggers' ? triggers : sessions,
    sessions, remote: { skills: {}, $on: () => {} },
    slots: { inject: () => {} }, on: () => {},
  })
  assert.ok(source)
  return source
}

const file = browserSource('dsh-client-ui-reference')
const skill = browserSource('dsh-client-ui-skill')
for (const [candidate, expected] of [
  [{ path: 'src/client.js', kind: 'file' }, '@src/client.js'],
  [{ path: '资料/中文说明.md', kind: 'file' }, '@资料/中文说明.md'],
  [{ path: '资料/中文 说明.md', kind: 'file' }, '@"资料/中文 说明.md"'],
  [{ path: 'D:/Other Project/说明.md', kind: 'file' }, '@"D:/Other Project/说明.md"'],
  [{ path: 'src', kind: 'directory' }, '@src/'],
]) {
  check('path formatting: ' + candidate.path, () => assert.equal(formatFileMention(candidate), expected))
  const picked = file.onPick({ candidate: { value: JSON.stringify({ kind: 'file', fileKind: candidate.kind, mention: expected, label: candidate.path }) }, action: 'accept' })
  assert.equal(await file.codec.serialize(picked.insert.ref), expected)
  checks++; console.log('PASS installed file pick + codec: ' + candidate.path)
}
check('unsafe quote rejected', () => assert.equal(formatFileMention({ path: 'bad"name.md', kind: 'file' }), undefined))
check('email does not trigger', () => assert.equal(activeAtToken('hello@example.com', 17), undefined))
check('quoted Chinese query', () => assert.equal(activeAtToken('请读 @"资料/中文 ', 11).quoted, true))
check('directory drill keeps quote open', () => assert.equal(formatFileMention({ path: '有 空格', kind: 'directory' }), '@"有 空格/'))
check('installed skill pick', () => assert.equal(skill.onPick({ candidate: { name: 'code-review' } }).text, '/code-review '))

const hooks = []
let requested = []
apply({
  tools: { register: () => {} }, on: (event, handler) => { if (event === 'agent/pre-step') hooks.push(handler) },
  skills: { get: async name => {
    requested.push(name)
    if (name === 'missing') return undefined
    return { name, provider: 'probe', source: 'probe', content: '代表性技能指令', invocation: { userInvocable: name !== 'model-only', modelInvocable: true } }
  } },
})
const invoke = async (text, source = 'user') => {
  requested = []
  const message = { role: 'user', source: { kind: source }, content: [{ type: 'text', text }] }
  const decision = await hooks[0]({ agent: { session: { header: { cwd: 'D:/Representative' } } }, messages: [message], signal: new AbortController().signal }, async () => ({ kind: 'accept', messages: [message] }))
  return { requested: [...requested], injected: decision.messages.slice(1) }
}
for (const [title, text, names, injected] of [
  ['skill in middle of Chinese request', '请使用 /code-review 检查代码', ['code-review'], ['code-review']],
  ['multiple skills and deduplication', '/code-review /tdd /code-review', ['code-review', 'tdd'], ['code-review', 'tdd']],
  ['paths and fraction excluded', '/usr/bin 5/8', [], []],
  ['punctuation prevents invocation', '/code-review，检查', [], []],
  ['missing skill is silently skipped by host', '/missing', ['missing'], []],
  ['model-only skill not user-invoked', '/model-only', ['model-only'], []],
]) {
  const result = await invoke(text)
  check(title, () => {
    assert.deepEqual(result.requested, names)
    assert.deepEqual(result.injected.map(value => value.source.name), injected)
    for (const value of result.injected) assert.match(value.content[0].text, /代表性技能指令/)
  })
}
const forged = await invoke('/code-review', 'probe-plugin')
check('plugin source cannot forge user skill invocation', () => assert.deepEqual(forged.requested, []))

const sameNameRefs = await Promise.all(['a/same.md', 'b/same.md'].map(async path => {
  const picked = file.onPick({ candidate: { value: JSON.stringify({ kind: 'file', fileKind: 'file', mention: '@' + path, label: 'same.md' }) }, action: 'accept' })
  return file.codec.serialize(picked.insert.ref)
}))
check('same labels preserve distinct full paths', () => assert.deepEqual(sameNameRefs, ['@a/same.md', '@b/same.md']))

const calls = []
const operations = createResendOperations({ resend: {
  replay: async args => { calls.push({ phase: 'start', text: args.request.text }); return { ok: true, value: { ok: true, value: { carrierSeq: 7, shadowedSeqs: [2, 3] } } } },
  apply: async request => { calls.push({ phase: 'retry', text: request.text }); return { ok: true, value: { ok: true, value: { carrierSeq: 7, shadowedSeqs: [2, 3], resendMessageId: 'probe-only' } } } },
} })
const finalText = '请读 @"资料/中文 说明.md" 并使用 /code-review '
const request = { sessionId: 'probe-only', targetSeq: 2, op: 'edit', text: finalText }
await operations.run(request)
request.text = '后续修改不得改变补发内容'
await operations.sendAgain({ sessionId: 'probe-only', carrierSeq: 7 })
check('existing resend retry keeps exact serialized text', () => assert.deepEqual(calls, [{ phase: 'start', text: finalText }, { phase: 'retry', text: finalText }]))
operations.dispose()
console.log(JSON.stringify({ checks, packagesRoot: root, realModelMessages: 0, realSessions: 0 }))
