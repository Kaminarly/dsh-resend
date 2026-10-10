/**
 * The client-side doubles for the browser half's suite (ticket 05).
 *
 * The browser half has no Node-runnable host to drive it, so what stands in here
 * are the four SERVICES it reads, one per seam, and each of them is deliberately
 * small: what is under test is the plugin's own behaviour — which registrations
 * it makes, with which options, and what it does with the answer to a Remote
 * call — not a re-implementation of the client shell.
 *
 * Two rules keep these doubles honest:
 *
 * 1. **The plugin face itself is the shipped artifact.** Every case drives
 *    `lib/client.bundle.js` (evaluated and materialized the way a page does), so
 *    nothing here can pass against a source tree the browser never receives.
 * 2. **A double that cannot answer says so.** The slot double calls its callback
 *    immediately, because `ctx.slots.inject` defers until the slot is DECLARED
 *    and this composition is the "declared" case; a case about a missing slot
 *    would need the other case, and none is asserted here.
 */
import { Context, Service } from '@deepseek-ai/cordis'
import { createElement, memo } from 'react'
import { memoryConfigForms } from './preferences.mjs'

const FixtureUserMessage = memo(function FixtureUserMessage({ node, t }) {
  const text = node.data?.text ?? node.data?.content?.filter((part) => part.type === 'text').map((part) => part.text).join('\n') ?? ''
  return createElement(FixtureBubble, { text, actions: () => createElement(FixtureActions, { t }) })
})
function FixtureBubble({ text, actions }) {
  return createElement('div', { 'data-host-user': true }, createElement('div', null, text), actions(text))
}
function FixtureActions({ extraActions }) {
  return createElement('div', { 'data-host-actions': true }, createElement('button', { 'aria-label': 'Copy' }), extraActions)
}

/**
 * A `remote` service and a separately traced `remote.resend` namespace, as in the
 * Gateway: it records the mount, and answers `resend.apply` from the scripted results.
 *
 * `results` is consumed one call at a time (the last one repeats), so a case can
 * describe "the first attempt failed, the retry landed" without a callback.
 * @param options - `{ results }`: the envelopes to answer with, in call order.
 * @returns `{ RecordingRemote, mounted, calls }` — the service class, the
 *   contributions it was asked to mount, and the requests it was asked to run.
 */
export function recordingRemote({ results = [{ ok: true, value: { carrierSeq: 5, shadowedSeqs: [2, 3], resendMessageId: 'dsh-resend-edit-fixture-resend' } }], replyState = () => ({ assistantSeqs: [2, 6], lastReplySeq: 6 }) } = {}) {
  const mounted = []
  const calls = []

  class RecordingResend extends Service {
    constructor(ctx) {
      super(ctx, 'remote.resend')
    }

    async apply(request) {
      calls.push(request)
      return { ok: true, value: results.length === 0 ? { ok: false, error: { code: 'agent-busy' } } : results[Math.min(calls.length - 1, results.length - 1)] }
    }

    async conversation(request) {
      return { ok: true, value: { ok: true, value: { userSeqs: [0, 2], lastUserSeq: 2, ...replyState(request) } } }
    }
  }

  class RecordingRemote extends Service {
    constructor(ctx) {
      super(ctx, 'remote')
      new RecordingResend(ctx)
    }

    $mount(contribution) {
      mounted.push(contribution)
      return async () => {}
    }
  }

  return { RecordingRemote, mounted, calls }
}

/**
 * The four client services a composition plugs in, sharing one record of what
 * the plugin asked them for.
 * @returns the service classes, all constructed around the same `record`.
 */
function clientDoubles({ declared = true } = {}) {
  const record = {
    /** `{ name, callback }` per `slots.inject`. */
    injected: [],
    /** `{ options, component }` per `slots.register`. */
    mounts: [],
    /** `{ namespace, dictionaries }` per `locale.register`. */
    dictionaries: [],
    /** The Definitions registered through `uiConversation`. */
    definitions: [],
    /** i18n keys any surface asked for that no dictionary defines. */
    missingKeys: [],
    input: { phase: 'plain' },
    draftWrites: [],
  }
  const hostEntries = [{ component: FixtureUserMessage, options: { key: 'user' }, locale: 'chat' }]
  const slotListeners = new Set()
  record.replaceHostUser = (entry) => {
    hostEntries.splice(0, hostEntries.length, ...(entry ? [entry] : []))
    slotListeners.forEach((listener) => listener())
  }

  /** The slot registry: `inject` mounts immediately (see the file head). */
  class Slots extends Service {
    constructor(ctx) {
      super(ctx, 'slots')
    }

    inject(name, callback) {
      record.injected.push(name)
      return declared ? callback() : undefined
    }

    register(options, component) {
      const entry = { options, component, locale: options.locale }
      record.mounts.push(entry)
      slotListeners.forEach((listener) => listener())
      return () => {
        record.mounts = record.mounts.filter((mount) => mount.options !== options)
        slotListeners.forEach((listener) => listener())
      }
    }

    entries(name) { return [...hostEntries, ...record.mounts.filter((entry) => entry.options.name === name)] }
    subscribe(_name, listener) { slotListeners.add(listener); return () => slotListeners.delete(listener) }
  }

  class Sessions extends Service {
    constructor(ctx) { super(ctx, 'sessions') }
    scope(sessionId) { return { sessionId } }
  }

  class Conversation extends Service {
    constructor(ctx) {
      super(ctx, 'conversation')
      this.input = { for: () => ({ state: { getSnapshot: () => record.input } }) }
    }
  }

  /**
   * The locale service: dictionaries in, a translator out.
   *
   * `bind` is what the SLOT OWNER uses to build the `t` prop a surface receives,
   * so a case can hand a surface exactly the translator the host would.
   */
  class Locale extends Service {
    constructor(ctx) {
      super(ctx, 'locale')
      this.active = 'en'
    }

    register(namespace, dictionaries) {
      record.dictionaries.push({ namespace, dictionaries })
      return () => {
        record.dictionaries = record.dictionaries.filter((entry) => entry.namespace !== namespace)
      }
    }

    bind(namespace) {
      return (key) => {
        for (const entry of record.dictionaries) {
          if (entry.namespace !== namespace) continue
          const table = entry.dictionaries[this.active] ?? entry.dictionaries.en ?? {}
          if (typeof table[key] === 'string') return table[key]
        }
        record.missingKeys.push(key)
        return key
      }
    }
  }

  /**
   * The conversation service carrying the Definition registry.
   *
   * `shape` picks which generation this composition models: the current one keeps
   * the registry on `events`, the older one exposed `register` on the service
   * itself, and `'none'` models a service with no entry point this build
   * understands.
   * @param shape - `'events' | 'self' | 'none'`, default `'events'`.
   */
  function UiConversationFor(shape = 'events') {
    class UiConversation extends Service {
      constructor(ctx) {
        super(ctx, 'uiConversation')
        if (shape === 'events') {
          this.events = {
            register: (definition) => {
              record.definitions.push(definition)
              return () => {
                record.definitions = record.definitions.filter((entry) => entry !== definition)
              }
            },
          }
        } else if (shape === 'self') {
          this.register = (definition) => {
            record.definitions.push(definition)
            return () => {
              record.definitions = record.definitions.filter((entry) => entry !== definition)
            }
          }
        }
      }
    }
    return UiConversation
  }

  return { record, Slots, Locale, UiConversationFor, Sessions, Conversation }
}

/**
 * One client composition: the four services plus a recording `remote`, ready for
 * the shipped browser half to activate against.
 * @param options - `{ results, conversation, ctx }`; `ctx` can carry the real Gateway.
 * @returns `{ ctx, record, mounted, calls }` — the context to activate the half
 *   in, what the doubles were asked for, and the Remote calls that were made.
 */
export async function clientComposition({ results, conversation = 'events', declared = true, ctx = new Context(), configForms, replyState } = {}) {
  if (ctx.get('configForms') === undefined) {
    await ctx.plugin(class extends Service {
      constructor(scope) {
        super(scope, 'configForms')
        Object.assign(this, configForms ? {
          get: (...args) => configForms.get(...args), describe: () => configForms.describe(),
        } : memoryConfigForms())
      }
    })
  }
  const { record, Slots, Locale, UiConversationFor, Sessions, Conversation } = clientDoubles({ declared })
  const { RecordingRemote, mounted, calls } = recordingRemote({ ...(results === undefined ? {} : { results }), replyState })
  if (ctx.get('remote') === undefined) await ctx.plugin(RecordingRemote)
  await ctx.plugin(Slots)
  await ctx.plugin(Locale)
  await ctx.plugin(UiConversationFor(conversation))
  await ctx.plugin(Sessions)
  await ctx.plugin(Conversation)
  return { ctx, record, mounted, calls }
}
