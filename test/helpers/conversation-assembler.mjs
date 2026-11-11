import vm from 'node:vm'
import { resolveTestHostApp } from './test-host-app.mjs'

/** Run the installed browser assembler itself, without booting its editor/UI. */
export function installedConversationAssembler(definitions) {
  const app = resolveTestHostApp()
  if (!app) return undefined
  try {
    const source = app.read('node_modules/@deepseek-ai/dsh-client-ui-conversation/lib/client.js')
    const start = source.indexOf('//#region lib/types/client/conversation/location-index.js')
    const end = source.indexOf('//#region lib/types/client/conversation/definition-registry.js', start)
    const keyStart = source.indexOf('function conversationContextKey(')
    const keyEnd = source.indexOf('//#endregion', keyStart)
    if (start < 0 || end < start || keyStart < 0 || keyEnd < keyStart) throw new Error('Installed conversation assembler boundaries changed')
    // The 0.2.2-rc.1 assembler reads the PartialArguments view from the host's
    // shared util/values module, which the browser bundle keeps in its own
    // region; include it or the sliced assembler throws on first use.
    let values = ''
    const valuesStart = source.indexOf('//#region ../../util/values/lib/index.js')
    if (valuesStart >= 0) {
      const valuesEnd = source.indexOf('//#endregion', valuesStart)
      if (valuesEnd < valuesStart) throw new Error('Installed conversation assembler values boundary changed')
      values = source.slice(valuesStart, valuesEnd)
    }
    const Assembler = vm.runInNewContext(values + source.slice(keyStart, keyEnd) + source.slice(start, end) + '\nConversationNodeAssembler')
    return new Assembler({ entries: () => definitions, fallbackEntry: () => undefined }, { entries: () => [] })
  } finally { app.close?.() }
}

export function assemblerChatSnapshot(assembler) {
  assembler.flush()
  const nodes = [...assembler.contexts.values()].map((context) => context.definition.buildViewNode?.(context)).filter(Boolean)
  return { nodes: new Map(nodes.map((node) => [node.key, node])) }
}

/** The installed host's message, assistant and tool Definitions, without its UI. */
export function installedChatDefinitions({ turnTail = false } = {}) {
  const app = resolveTestHostApp()
  if (!app) return undefined
  try {
    const source = app.read('node_modules/@deepseek-ai/dsh-client-ui-chat/lib/client.js')
    // The tool Definition reads PartialArguments (its own util/values region, a
    // proper var declaration in the chat bundle); without it the sliced
    // definitions throw a ReferenceError on the first tool call.
    const regions = [
      '../../util/values/lib/index.js',
      'lib/types/client/conversation-nodes/common.js',
      'lib/types/client/conversation-nodes/event-projection.js',
      'lib/types/client/conversation-nodes/assistant.js',
      '../../core/session/lib/types/surface.js',
      'lib/types/client/conversation-nodes/message.js',
      'lib/types/client/conversation-nodes/tool.js',
      ...(turnTail ? [
        '../../llm/llm/lib/types/assistant-stream.js',
        '../../llm/token-meter/lib/types/turn-usage.js',
        'lib/types/client/conversation-nodes/turn-tail.js',
      ] : []),
    ].map((name) => {
      const start = source.indexOf('//#region ' + name)
      const end = source.indexOf('//#endregion', start)
      if (start < 0 || end < start) throw new Error('Installed Chat Definition region changed: ' + name)
      return source.slice(start, end)
    })
    return vm.runInNewContext(regions.join('\n') + '\n[messageDefinition, assistantDefinition, toolDefinition' + (turnTail ? ', turnTailDefinition' : '') + ']')
  } finally { app.close?.() }
}
