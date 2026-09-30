/**
 * Stand-in host services, for the compositions that load the Host row without
 * composing the operation's real dependencies.
 *
 * Two of those exist, and neither is about the operation:
 *
 *  - `scripts/check-typert.mjs` reads the descriptor table back out of
 *    `lib/index.js` by activating the shipped row. That check measures the
 *    DESCRIPTOR contract, so the services the row declares are supplied as
 *    name-only stand-ins: the row must activate (a fiber stuck PENDING would
 *    never register anything), and nothing in that gate calls the operation.
 *  - `test/host-half-boot.test.mjs` drives the same activation through the real
 *    Loader, where the same reasoning applies and the PENDING failure mode is
 *    the thing under test.
 *
 * A stand-in answers exactly one question — "is a service registered under this
 * name?" — and nothing else. The operation's own behaviour is exercised against
 * doubles that mirror the production host's shape (`test/helpers/host.mjs`) and
 * against the real `Session` implementation, not against these.
 *
 * This is deliberately not a test helper: a gate must not import the test tree
 * (the reverse dependency is the one the suite already has, through
 * `scripts/client-bundle.mjs`).
 */
import { Service } from '@deepseek-ai/cordis'

/**
 * One Cordis Service class registered under `name`, carrying no behaviour.
 * @param name - the service key the host would register.
 * @returns a plugin class, ready for `ctx.plugin()`.
 */
function standInService(name) {
  return class StandInService extends Service {
    constructor(ctx) {
      super(ctx, name)
    }
  }
}

/**
 * Register one stand-in for every service `row` declares and `provided` does
 * not already supply. The row must then activate unless something ELSE is
 * missing — which is what makes a PENDING assertion attributable.
 * @param ctx - the context to register them in.
 * @param row - a loaded plugin module (`{ inject }`).
 * @param provided - service names the composition already registers.
 * @returns a promise settling once every stand-in is registered.
 */
export async function provideStandInServices(ctx, row, provided = []) {
  for (const name of (row.inject ?? []).filter((declared) => !provided.includes(declared))) {
    await ctx.plugin(standInService(name))
  }
}
