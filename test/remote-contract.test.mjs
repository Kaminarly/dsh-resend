/**
 * Seam ④ (ticket 02): the descriptor contract, end to end, through the **real**
 * API Gateway.
 *
 * Both halves are the shipped artifacts — `lib/index.js` registers the
 * contribution with the real Typert registry, `lib/client.bundle.js` is
 * evaluated the way the browser evaluates it and mounts the same contribution
 * with the real Gateway client service — and a call travels the whole way:
 * descriptor resolution from the host registry (strict, never the reflection
 * fallback), exact-argument checking, the strict codec's boundary decode, the
 * service method, `encodeRpcResult`, and the client's two-level unwrap.
 *
 * The only double on the wire is the `connection` service (the physical WebSocket
 * carrier): see `helpers/gateway.mjs`, which names every member it stands in for.
 * That is the honest limit of this environment — the browser lane is not reachable
 * from a Node spec. The bundle's own loader protocol is doubled separately in
 * `scripts/client-bundle.mjs`, which every bundle reader shares.
 *
 * The codec accept/reject matrix over §4.5's twelve codes belongs to
 * `scripts/check-typert.mjs`, which owns the descriptor contract; this suite
 * drives the same artifacts through the real Gateway instead.
 */
import { describe, expect, it } from 'vitest'
import { FIBER_ACTIVE } from './helpers/dsh.mjs'
import { clientHalf } from '../scripts/client-bundle.mjs'
import { clientComposition, dispatchToHost, hostComposition } from './helpers/gateway.mjs'
import { TYPERT } from '../lib/typert.host.js'

const request = { sessionId: 'session-1', targetSeq: 4, op: 'edit', text: 'the edited prompt' }

describe('the Host half registers one strict definition and serves it', () => {
  it('registers exactly once, and the registration outlives every call', async () => {
    const host = await hostComposition()
    const before = host.ctx.typert.listPackages().map((record) => record.key)
    expect(before).toEqual(['dsh-resend#host'])
    expect(host.ctx.typert.local.get('resend/apply')).toBeDefined()

    for (let call = 0; call < 3; call += 1) {
      const wire = await dispatchToHost(host, 'resend/apply', { request })
      expect(wire.ok, `call ${call + 1} did not reach the business method`).toBe(true)
    }

    // Same registration, not a re-registration per call: one package record, one
    // endpoint, and the disposer that owns it is still the plugin fiber's.
    expect(host.ctx.typert.listPackages().map((record) => record.key)).toEqual(['dsh-resend#host'])
    expect(host.ctx.typert.local.list().filter((descriptor) => descriptor.service === 'resend')).toHaveLength(1)
  })

  it('answers a real call with an envelope its own strict result codec accepts', async () => {
    const host = await hostComposition()
    const wire = await dispatchToHost(host, 'resend/apply', { request })

    // The Gateway wraps the business value (`encodeRpcResult`), so the business
    // envelope is `wire.value` — the shape every caller reads.
    expect(wire).toMatchObject({ ok: true })
    const schema = TYPERT.invocations[0].result.create()
    const parsed = schema.safeParse(wire.value)
    expect(parsed.success, `the produced envelope is not what the descriptor declares: ${JSON.stringify(parsed.error?.issues)}`).toBe(true)
  })

  it('refuses an unknown field inside the request with the strict codec, host-side', async () => {
    const host = await hostComposition()
    const wire = await dispatchToHost(host, 'resend/apply', { request: { ...request, unexpected: true } })

    // A business outcome would arrive as `ok: true` carrying our envelope; a
    // boundary refusal has no envelope at all, which is what proves the business
    // method never ran.
    expect(wire.ok).toBe(false)
    expect('value' in wire).toBe(false)
    expect(wire.error.code).toBe('gateway/input-invalid')
    expect(wire.error.details.field).toBe('request')
  })

  it('refuses an unknown wire argument before the business method runs', async () => {
    const host = await hostComposition()
    const wire = await dispatchToHost(host, 'resend/apply', { request, unexpected: true })

    expect(wire.ok).toBe(false)
    expect('value' in wire).toBe(false)
    expect(wire.error.code).toBe('gateway/arguments-invalid')
  })

  it('resolves the endpoint through the strict definition — never the reflection fallback', async () => {
    const host = await hostComposition()
    expect(host.ctx.typertGateway.resolveDescriptor('resend', 'apply', 'resend/apply')).toBe(host.ctx.typert.local.get('resend/apply'))
  })

  it('forbids the reflection fallback once the strict definition is withdrawn', async () => {
    const host = await hostComposition()
    await host.fiber.dispose()

    // The registration is that fiber's to remove: nothing else can drop it, and
    // dropping it leaves the endpoint latched as "seen strict" forever.
    expect(host.ctx.typert.local.get('resend/apply')).toBeUndefined()
    expect(host.ctx.typert.listPackages()).toEqual([])
    expect(host.ctx.typert.local.hasSeen('resend/apply')).toBe(true)

    const wire = await dispatchToHost(host, 'resend/apply', { request })
    expect(wire.ok).toBe(false)
    expect(wire.error.code).toBe('gateway/definition-unavailable')
  })
})

describe('the Client half mounts the same contribution and calls through', () => {
  it('refuses a contribution that repeats a namespace/method pair — the mount path rule', async () => {
    // §6.3's mount-path rule, driven where it lives: the Gateway's own
    // `validateContribution` runs before it registers or installs anything, so a
    // contribution repeating a pair is refused with nothing mounted.
    const clientCtx = await clientComposition(() => {
      throw new Error('no call is expected from a refused mount')
    })
    const [descriptor] = TYPERT.invocations

    await expect(clientCtx.remote.$mount({ package: 'dsh-resend-repeat', descriptors: [descriptor, descriptor] })).rejects.toThrow(
      /repeats direct method resend\/apply/,
    )
  })

  it('returns the Host envelope from a call made through the real Gateway client', async () => {
    const host = await hostComposition()
    const endpoints = []
    const clientCtx = await clientComposition(
      (endpoint, payload, signal) => dispatchToHost(host, endpoint, payload.args, signal),
      (endpoint) => endpoints.push(endpoint),
    )
    const { exports: face } = clientHalf()

    const fiber = clientCtx.plugin(face)
    await fiber
    expect(fiber.state).toBe(FIBER_ACTIVE)
    expect(face.remoteMountState().status).toBe('mounted')

    const carried = await clientCtx.remote.resend.apply(request)
    // The non-vacuity guard: the call really left the client through the carrier.
    expect(endpoints).toEqual(['resend/apply'])
    // Two levels: the transport result, then the business `RemoteResult`.
    expect(carried.ok).toBe(true)
    const schema = TYPERT.invocations[0].result.create()
    expect(schema.safeParse(carried.value).success).toBe(true)
  })

  it('throws on a second mount before any method is callable, and leaves the first mount intact', async () => {
    const host = await hostComposition()
    const clientCtx = await clientComposition((endpoint, payload, signal) => dispatchToHost(host, endpoint, payload.args, signal))
    const { exports: face } = clientHalf()

    const first = clientCtx.plugin(face)
    await first
    expect(face.remoteMountState().status).toBe('mounted')

    // A second activation of the same bundle is what a reload without a disposal
    // looks like. The Gateway refuses it before installing anything, and the
    // half contains that refusal: it must not fail the fiber, and it must not
    // damage the mount that already exists.
    const warnings = []
    clientCtx.logger.exporter({ levels: { default: 2 }, export: (message) => warnings.push(message) })
    const second = clientCtx.plugin(face)
    await second

    expect(second.state).toBe(FIBER_ACTIVE)
    const mount = face.remoteMountState()
    expect(mount.status).toBe('failed')
    expect(String(mount.error?.message)).toContain('already mounted')
    // The refusal is logged loudly, in this plugin's own name and words — not just
    // "some warning happened".
    const refusal = warnings.find((message) => message.type === 'warn' && message.name === 'dsh-resend')
    expect(refusal?.args.join(' '), `no dsh-resend warning in ${JSON.stringify(warnings)}`).toContain('did not mount')

    const carried = await clientCtx.remote.resend.apply(request)
    expect(carried.ok).toBe(true)
    // The contract is what this ticket delivers, so the business envelope is this
    // build's one honest outcome: a refusal. Ticket 03 replaces this assertion
    // with the resolution it lands.
    expect(carried.value.ok).toBe(false)
    expect(carried.value.error.code).toBe('internal')
  })
})
