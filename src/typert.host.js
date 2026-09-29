/**
 * Host descriptor contribution (spec §6.1) — registered by the Host plugin with
 * `ctx.typert.register(TYPERT)`.
 *
 * The direct-registration route only: `model` (the loader's reflection graph)
 * is deliberately omitted, because nothing here uses reflection and the loader
 * route has three failure modes this one does not (spec §6.6).
 */
import { PACKAGE, descriptors, schemas } from './typert.js'

export const TYPERT = {
  package: PACKAGE,
  face: 'host',
  schemas,
  invocations: descriptors,
}