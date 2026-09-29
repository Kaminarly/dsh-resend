/**
 * Client descriptor contribution (spec §6.1) — mounted by the Client plugin with
 * `ctx.remote.$mount(TYPERT_REMOTE)`.
 *
 * The same descriptor list as the host face, without `face` and without
 * `model`: the gateway's mount path registers exactly `{ package, descriptors }`
 * with the client-side typert registry.
 */
import { PACKAGE, descriptors } from './typert.js'

export const TYPERT_REMOTE = {
  package: PACKAGE,
  descriptors,
}