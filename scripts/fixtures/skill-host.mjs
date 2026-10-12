// Exercise the installed loader with an isolated registry; never open a user Session.
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { resolveHostApp } from '../host-app.mjs'

export const representativeSkills = [
  { name: 'tdd', description: '测试驱动', invocation: { userInvocable: true, modelInvocable: true } },
  { name: 'code-review', description: '审查代码', invocation: { userInvocable: true, modelInvocable: true } },
  { name: 'help', description: '与宿主命令同名的技能', invocation: { userInvocable: true, modelInvocable: true } },
  { name: 'user-only', description: '仅用户调用', invocation: { userInvocable: true, modelInvocable: false } },
  { name: 'model-only', description: '仅模型调用', invocation: { userInvocable: false, modelInvocable: true } },
]

export async function createSkillHost() {
  const app = resolveHostApp()
  if (!app || app.kind !== 'dir') { app?.close?.(); return }
  const { apply } = await import(pathToFileURL(path.join(app.modulesDir, '@deepseek-ai/dsh-tool-skill/lib/index.js')).href)
  const hooks = []
  const requests = []
  apply({
    tools: { register() {} },
    on(event, handler) { if (event === 'agent/pre-step') hooks.push(handler) },
    skills: { async get(name, lookup) {
      requests.push({ name, lookup })
      const skill = representativeSkills.find(skill => skill.name === name)
      return skill && { ...skill, provider: 'isolated', content: '隔离的 ' + name + ' 技能指令' }
    } },
  })
  if (typeof hooks[0] !== 'function') throw new Error('宿主技能加载钩子缺失')
  return {
    async invoke(message, agent = { session: { header: { cwd: 'D:/Representative' } } }) {
      const start = requests.length
      const signal = new AbortController().signal
      const decision = await hooks[0]({ agent, messages: [message], signal }, async () => ({ kind: 'accept', messages: [message] }))
      return { requested: requests.slice(start), injected: decision.messages.slice(1) }
    },
  }
}
