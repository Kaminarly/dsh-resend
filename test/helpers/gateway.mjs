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
 */
import { Context, Service } from '@deepseek-ai/cordis'
import * as registry from '@deepseek-ai/dsh-typert-registry'
import * as gateway from '@deepseek-ai/dsh-api-gateway'
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
 * for `$host`. A member the Gateway actually calls must be real; this is not a
 * passthrough stub.
 * @param dispatch - `(endpoint, payload, signal) => Promise<wire result>`.
 * @returns a Connection Service class to plugin into the client composition.
 */
export function carrierDouble(dispatch) {
  return class TestCarrier extends Service {
    constructor(ctx) {
      super(ctx, 'connection')
      this.isLoopback = true
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
  await ctx.plugin(gateway.TypertGatewayService)
  await plugHostDoubles(ctx, host)
  const hostHalf = await import('../../lib/index.js')
  // Each composition owns its plugin data; tests never write the user's home.
  const previousHome = process.env.DSH_HOME
  const dataHome = options.dataHome ?? await mkdtemp(path.join(tmpdir(), 'resend-host-'))
  let fiber
  process.env.DSH_HOME = dataHome
  try { fiber = ctx.plugin(hostHalf, options.config); await fiber }
  finally { if (previousHome === undefined) delete process.env.DSH_HOME; else process.env.DSH_HOME = previousHome }
  if (options.dataHome === undefined) ctx.effect(() => () => rm(dataHome, { recursive: true, force: true }))
  return { ctx, fiber, host }
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
 * @param host - the object from {@link hostComposition}.
 * @param endpoint - `<namespace>/<method>`.
 * @param args - the descriptor's named wire arguments.
 * @param signal - the call's cancellation signal, as the carrier passes it.
 * @returns the encoded RPC result. The fourth `invokeRpc` argument (the peer) is
 *   left undefined, which makes the Gateway use its operator peer — a browser
 *   carrier's peer is transport state this double deliberately does not model.
 */
export function dispatchToHost(host, endpoint, args, signal) {
  return host.ctx.typertGateway.invokeRpc(endpoint, { args }, signal, undefined)
}
