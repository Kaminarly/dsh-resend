import { expect, it } from 'vitest'
import { clientHalf } from '../scripts/client-bundle.mjs'
import { clientComposition } from './helpers/client.mjs'

it('explains host refusals and transport failures in the current language without exposing raw exception text', async () => {
  const composition = await clientComposition()
  const face = clientHalf().exports
  const fiber = composition.ctx.plugin(face)
  await fiber
  await new Promise(resolve=>setTimeout(resolve,20))
  try {
    const locale = composition.ctx.get('locale')
    locale.active = 'zh'
    const t = locale.bind('dsh-resend')
    expect(face.operationErrorText({ code: 'agent-busy' }, t)).toContain('请先停止回复')
    expect(face.operationErrorText({ code: 'message-pending' }, t)).toContain('尚未完整加载')
    expect(face.operationErrorText({ code: 'not-assistant-message' }, t)).toContain('目标不是可重新生成的助手回复，请重新选择。')
    expect(face.operationErrorText({ code: 'not-last-user-message' }, t)).toContain('只能编辑重发最后一条用户消息，请选择最后一条用户消息。')
    expect(face.operationErrorText({ code: 'gateway/internal' }, t)).toContain('与 DSH 的通信')
    expect(face.operationErrorText({ code: 'client/result-invalid' }, t)).toContain('版本兼容性')
    const cause = new Error('sensitive fixture URL ?token=do-not-show')
    expect(face.operationErrorText(cause, t)).not.toContain('do-not-show')
    expect(face.operationErrorText(cause, t)).toContain('插件处理请求')
    locale.active = 'en'
    expect(face.operationErrorText({ code: 'not-last-user-message' }, t)).toContain('Only the last user message can be edited and resent.')
    expect(face.operationErrorText({ code: 'not-assistant-message' }, t)).toContain('The target is not an assistant reply')
    expect(face.operationErrorText({ code: 'agent-busy' }, t)).toContain('Stop it before retrying')
  } finally { await fiber.dispose() }
})
