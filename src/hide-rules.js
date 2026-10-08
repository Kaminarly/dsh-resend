/**
 * The hide-rules element, surfaced as a boundary (ticket 08, spec §7.4).
 *
 * The `<style>` element that carries the hide CSS was, in the action row and
 * the rewind point, a raw element the surface itself created. Surface 6 is
 * that same element wrapped in the shared boundary: a throw in the CSS
 * projection is this element's own failure row, and the rest of the row keeps
 * rendering. The wrapping surface is the one DOM node the transcript hides
 * with, so its own failure must never blank the rows it is meant to hide.
 */
import { createElement } from 'react'
import { withPanelBoundary } from './panel-boundary.js'

/** The element itself: one `<style>` carrying the CSS text. */
function HideRulesElement({ css }) {
  return createElement('style', { 'data-dsh-resend-hide-rules': 'true' }, css)
}

/** Surface 6: the hide-rules element through the shared boundary. */
export const HideRulesSurface = withPanelBoundary(HideRulesElement, 'panel.error.hideRules')
