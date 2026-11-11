/**
 * The real API Gateway, for the specs that exercise a Remote call end to end.
 *
 * Two faces are loaded, both from the **pinned devDependency** rather than the
 * installed app, so these specs run in CI as well as on a developer machine:
 *
 *  - the Host face through the package entry (`main` → `lib/index.js`), which
 *    owns strict descriptor resolution and the wire envelope;
 *  - the Client face by file path, because the Gateway exports its client half
 *    only as a self-registering browser bundle (its own `./client` → `lib/client.js`)
 *    — `lib/types/client/index.js` is the ESM service that bundle is built from,
 *    and it is the one a Node spec can install. Its undeclared
 *    `@deepseek-ai/dsh-util-crypto` import is why that package is a direct
 *    devDependency here rather than a hoisting accident.
 *
 * `carrier` is the only double: the `connection` service stands in for the
 * physical WebSocket carrier, which no Node spec can open against a browser
 * client. Everything above it — `$mount`, contribution validation, namespace
 * installation, argument assembly, strict decoding, dispatch, the result
 * envelope and its two-level unwrap — is the shipped mechanism.
 *
 * Since 0.2.2-rc.1 the Gateway's host service hard-injects the
 * `remoteAccess` service, which ships in its own package
 * (`@deepseek-ai/dsh-api-remote-access`, a devDependency here for the same
 * reason the other two are): the composition plugs in the real service, or the
 * Gateway installs but its `typertGateway` member never materializes and every
 * dispatch dies with `Cannot read properties of undefined (reading
 * 'invokeRpc')` — the 0.2.2-rc.1 regression this suite caught.
 */
import { Context, Service } from '@deepseek-ai/cordis'
import { createVolatile, updateVolatile } from '@deepseek-ai/cosmokit'
import * as registry from '@deepseek-ai/dsh-typert-registry'
import * as gateway from '@deepseek-ai/dsh-api-gateway'
import * as remoteAccess from '@deepseek-ai/dsh-api-remote-access'
import { hostState, plugHostDoubles } from './host.mjs'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import path from 'node:path'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'

const require_ = createRequire(new URL('../../package.json', import.meta.url))
const gatewayRoot = path.dirname(require_.resolve('@deepseek-ai/dsh-api-gateway/package.json'))

/** The Gateway's Client service (the ESM the `./client` browser bundle is built from). */
export const clientService = await import(pathToFileURL(path.join(gatewayRoot, 'lib', 'types', 'client', 'index.js')).href)

/**
 * A `connection` service that carries Remote calls straight to `dispatch`.
 *
 * The Gateway's client half touches exactly these members: `rpc.call` for a
 * unary method, `rpc.open` (never, for a unary method — its presence is what
 * keeps the stream mux from trying to open a WebSocket), `registerGenerationSource`
 * for forwarded events, `start` for the connection loop, and `isLoopback`/`generation`
 * for `$host`; since 0.2.2-rc.1 it also reads `interactions` to decide whether forwarded events (`$on`) are allowed at all.
 * A member the Gateway actually calls must be real; this is not a
 * passthrough stub.
 * @param dispatch - `(endpoint, payload, signal) => Promise<wire result>`.
 * @returns a Connection Service class to plugin into the client composition.
 */
export function carrierDouble(dispatch) {
  return class TestCarrier extends Service {
    constructor(ctx) {
      super(ctx, 'connection')
      this.isLoopback = true
      // 0.2.2-rc.1 reads this to decide whether the client half may take
      // forwarded events ($on) and streams; a browser page is an answer peer.
      this.interactions = 'answer'
      this.generation = { getSnapshot: () => undefined }
      this.rpc = {
        call: (api, endpoint, payload, signal) => dispatch(endpoint, payload, signal),
        open: () => {
          throw new Error('client api: this spec calls a unary method, which never opens a stream')
        },
      }
    }

    registerGenerationSource() {
      return () => {}
    }

    start() {
      return { stop() {} }
    }
  }
}

/**
 * The Host composition: the registry, the Gateway, the operation's services and
 * the shipped host half.
 *
 * The Host half declares `sessions`, `agents`, `sessionQuery` and
 * `sessionPersistence` in its `inject` list (spec §3.1), so a composition
 * without them leaves the row permanently PENDING and no call can reach it.
 * They come from `./host.mjs`: a real `Session` behind the `sessions` seam and
 * doubles shaped like the host for the two log routes and the agent registry.
 * @param options - `{ host }`, a `hostState` record to drive the doubles with
 *   (default: the standard two-round fixture, idle agent, a stored log that
 *   mirrors the live one).
 * @returns `{ ctx, fiber, host }` — `ctx.typertGateway` is what a carrier
 *   dispatches into, and `host` is the mutable state the doubles read.
 */
export async function hostComposition(options = {}) {
  const host = options.host ?? hostState()
  const ctx = new Context()
  await ctx.plugin(registry.TypertRegistry)
  await ctx.plugin(remoteAccess.RemoteAccessService)
  await ctx.plugin(gateway.TypertGatewayService)
  await plugHostDoubles(ctx, host)
  const hostHalf = await import('../../lib/index.js')
  // Each composition owns its plugin data; tests never write the user's home.
  const previousHome = process.env.DSH_HOME
  const dataHome = options.dataHome ?? await mkdtemp(path.join(tmpdir(), 'resend-host-'))
  let fiber
  process.env.DSH_HOME = dataHome
  // Refusal/race fixtures explicitly exercise enabled range restrictions.
  try { fiber = ctx.plugin(hostHalf, { restrictRegenerateToLastReply: true, restrictEditToLastUserMessage: true, ...options.config }); await fiber }
  finally { if (previousHome === undefined) delete process.env.DSH_HOME; else process.env.DSH_HOME = previousHome }
  if (options.dataHome === undefined) ctx.effect(() => () => rm(dataHome, { recursive: true, force: true }))
  return { ctx, fiber, host }
}

/**
 * Flip a saved plugin setting while a composition runs, against whichever
 * config carries the live ref. Since 0.2.2-rc.1 (cordis 4.1.0) the loader
 * retains the raw config plain, so the ref lives on the fiber's
 * effectiveConfig; older generations held it on the raw config.
 * @param host - a {@link hostComposition} result.
 * @param name - the saved setting field.
 * @param value - the boolean the ref should read from now on.
 */
export function setSavedSetting(host, name, value) {
  const reference = host.fiber.effectiveConfig?.[name] ?? host.fiber.config?.[name]
  if (reference === undefined) throw new Error(`the fiber config carries no ${name} reference`)
  updateVolatile(reference, createVolatile(value))
}

/**
 * The Client composition: the registry, the carrier double, and the real Gateway
 * client service, ready for a plugin's client half to `$mount` into.
 * @param dispatch - what the carrier does with a call (normally the host composition).
 * @param onCall - optional observer, called with the endpoint of every carried call.
 */
export async function clientComposition(dispatch, onCall) {
  const ctx = new Context()
  await ctx.plugin(registry.TypertRegistry)
  await ctx.plugin(carrierDouble((endpoint, payload, signal) => {
    onCall?.(endpoint)
    return dispatch(endpoint, payload, signal)
  }))
  await ctx.plugin(clientService)
  return ctx
}

/**
 * The wire call a carrier makes into a Host composition — the same entry the
 * Gateway's own RPC interception uses (`dispatchRpc` → `invokeRpc`).
 *
 * Since 0.2.2-rc.1 the Gateway no longer supplies a default Peer ("Every call
 * names the Peer it speaks for; the Gateway never supplies a default Peer"), so
 * the fourth `invokeRpc` argument is a minimal owner peer — the transport state
 * a browser carrier carries: an owner principal plus a live signal. One per
 * composition, cached on the host record, because a disposed peer fails its
 * calls with `gateway/peer-disposed`.
 * @param host - the object from {@link hostComposition}.
 * @param endpoint - `<namespace>/<method>`.
 * @param args - the descriptor's named wire arguments.
 * @param signal - the call's cancellation signal, as the carrier passes it.
 * @returns the encoded RPC result.
 */
export function dispatchToHost(host, endpoint, args, signal) {
  host.ownerPeer ??= { principal: { kind: 'owner' }, signal: new AbortController().signal }
  return host.ctx.typertGateway.invokeRpc(endpoint, { args }, signal, host.ownerPeer)
}
