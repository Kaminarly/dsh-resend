/**
 * The host-access module (spec §3.1, §16.6) — a small shipped artifact with
 * three jobs, each with a measured host fact behind it:
 *
 *  - `hostService` is the presence test the spec insists on. Cordis refuses ANY
 *    service property read on a fiber that does not inject that service, so
 *    "does this composition have X" cannot be asked with `ctx.X`; `ctx.get(X)`
 *    is the accessor documented as carrying no inject requirement.
 *  - `describeError` and `asArray` are how a host answer this plugin does not
 *    control is turned into a line, or into a list it can walk.
 *  - `logWarning` is the one place a diagnosable line is written, under this
 *    plugin's name.
 */
import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { asArray, describeError, hostService, logWarning } from '../lib/host.js'
import { provideStandInServices } from '../scripts/host-services.mjs'
import { hostContext, hostState } from './helpers/host.mjs'

describe('hostService', () => {
  it('resolves a registered service by its host key', async () => {
    const { ctx } = await hostContext()

    // Asserted by its members rather than by identity: Cordis hands out a
    // distinct traceable wrapper per access, so `===` is not the property that
    // matters here — reaching the service the key names is.
    const sessions = hostService(ctx, 'sessions')
    expect(typeof sessions.get).toBe('function')
    expect(typeof sessions.flush).toBe('function')
    expect(typeof hostService(ctx, 'sessionQuery').readSession).toBe('function')
  })

  it('answers `undefined` — rather than throwing — when the composition has none', () => {
    // The honest presence test (§16.6): the empty-`inject` probe that read a
    // throw as "absent" was the trap that would have sent an implementation down
    // the expensive route on a false signal.
    const bare = new Context()

    expect(hostService(bare, 'sessions')).toBeUndefined()
    expect(hostService(bare, 'typert')).toBeUndefined()
  })

  it('still reaches a service the inject-free accessor passes over', async () => {
    const ctx = new Context()
    // The same stand-in the boot suite uses: one place that knows how to play
    // "a host service registered under this name".
    await provideStandInServices(ctx, { inject: ['sessionPersistence'] })

    expect(hostService(ctx, 'sessionPersistence') !== undefined).toBe(true)
  })
})

describe('asArray', () => {
  it('passes an array through and answers an empty one for anything else', () => {
    const list = [1, 2, 3]

    expect(asArray(list)).toBe(list)
    expect(asArray(undefined)).toEqual([])
    expect(asArray(null)).toEqual([])
    expect(asArray({ length: 1 })).toEqual([])
  })
})

describe('describeError', () => {
  it('renders a thrown Error as its message', () => {
    expect(describeError(new Error('the host said no'))).toBe('the host said no')
  })

  it('renders a non-Error throw as its string form, and never as "undefined"', () => {
    expect(describeError('a string throw')).toBe('a string throw')
    expect(describeError(undefined)).toBe('undefined')
    expect(describeError(new Error(''))).toBe('Error')
  })
})

describe('logWarning', () => {
  it('writes one warning under this plugin’s name, and only when asked', async () => {
    const { ctx } = await hostContext(hostState())
    const messages = []
    ctx.logger.exporter({ levels: { default: 2 }, export: (message) => messages.push(message) })

    logWarning(ctx, 'a covering read that did not replay')

    const warnings = messages.filter((message) => message.type === 'warn')
    expect(warnings).toHaveLength(1)
    expect(warnings[0].name).toBe('dsh-resend')
    expect(warnings[0].args.join(' ')).toContain('a covering read that did not replay')
  })
})
