import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import vm from 'node:vm'
import { createDocument, exportText, finalMention, drillMention } from '../text.js'
import { candidates, historyText } from '../fixtures.js'
import { createResendOperations } from '../../../../src/resend-operations.js'

const packages = process.env.DSH_RESEARCH_PACKAGES ?? 'D:/DSH Desktop/resources/app/node_modules/@deepseek-ai'
const load = relative => import(pathToFileURL(path.join(packages, relative)).href)
const { formatFileMention } = await load('dsh-file-reference/lib/types/grammar.js')
const { FILE_REFERENCE_PROMPT } = await load('dsh-file-reference/lib/types/index.js')
const { apply } = await load('dsh-tool-skill/lib/index.js')

test('导出的文件与下钻语法对照安装宿主，闭合目录符合宿主路径提示', async () => {
  let registration
  vm.runInNewContext(readFileSync(path.join(packages, 'dsh-client-ui-reference/lib/client.js'), 'utf8'), {
    window: { __ModuleLoader__: { load: entry => { registration = entry } } }, console, AbortController,
  })
  let source
  // Capture the public source registration only; no host Trigger controller or
  // Composer is instantiated. The real codec is the independent syntax oracle.
  registration.factory(() => ({})).apply({
    locale: { register: () => () => {}, bind: () => value => value }, effect: run => run(),
    get: name => name === 'inputTriggers' ? { registerSource: value => { source = value } } : {},
  })
  for (const candidate of candidates) {
    const final = finalMention(candidate)
    const native = formatFileMention(candidate)
    assert.equal(candidate.kind === 'directory' ? drillMention(candidate) : final, native)
    const pick = source.onPick({ candidate: { value: JSON.stringify({ kind: 'file', fileKind: candidate.kind, mention: final, label: candidate.path }) }, action: 'accept' })
    assert.equal(await source.codec.serialize(pick.insert.ref), final)
  }
  assert.ok(FILE_REFERENCE_PROMPT.includes('A trailing slash marks a directory'))
  assert.ok(FILE_REFERENCE_PROMPT.includes('@"..." quotes a path containing spaces'))
})

test('最终文本进入现有重发接收替身，失败补发固定同一份文本', async () => {
  const text = exportText(createDocument(historyText, candidates))
  const calls = []
  const operations = createResendOperations({ resend: {
    replay: async args => { calls.push(args.request.text); return { ok: true, value: { ok: true, value: { carrierSeq: 7, shadowedSeqs: [2, 3] } } } },
    apply: async request => { calls.push(request.text); return { ok: true, value: { ok: true, value: { carrierSeq: 7, shadowedSeqs: [2, 3], resendMessageId: 'prototype-only' } } } },
  } })
  try {
    const request = { sessionId: 'prototype-only', targetSeq: 2, op: 'edit', text }
    await operations.run(request)
    request.text = '后续编辑'
    await operations.sendAgain({ sessionId: 'prototype-only', carrierSeq: 7 })
    assert.deepEqual(calls, [historyText, historyText])
  } finally { operations.dispose() }
})

test('导出的多个 skill 交给真实宿主加载钩子，未知 skill 不改写原文', async () => {
  const hooks = []
  const requested = []
  apply({
    tools: { register: () => {} }, on: (name, callback) => { if (name === 'agent/pre-step') hooks.push(callback) },
    skills: { get: async name => {
      requested.push(name)
      return name === 'missing' ? undefined : { name, provider: 'prototype', source: 'prototype', content: '技能替身正文', invocation: { userInvocable: true, modelInvocable: true } }
    } },
  })
  const text = exportText(createDocument('请读 @"有 空格/" 后面的正文，使用 /code-review /tdd /missing', candidates))
  const message = { role: 'user', source: { kind: 'user' }, content: [{ type: 'text', text }] }
  const decision = await hooks[0]({ agent: { session: { header: { cwd: 'D:/PrototypeOnly' } } }, messages: [message], signal: new AbortController().signal },
    async () => ({ kind: 'accept', messages: [message] }))
  assert.deepEqual(requested, ['code-review', 'tdd', 'missing'])
  assert.deepEqual(decision.messages.slice(1).map(value => value.source.name), ['code-review', 'tdd'])
  assert.equal(decision.messages[0].content[0].text, text)
})
