/**
 * The ONE error boundary every surface this plugin registers is wrapped in
 * (spec §7.4, §11, §13.3 #19).
 *
 * Why this is not optional, in the shape it actually happened: a render-time
 * throw inside a chat-node component is caught by the HOST's boundary and
 * swallowed. The reference implementation lost its entire edit affordance that
 * way — buttons absent, settings fine, nothing in any log — because one node
 * component read a path that was permanently `undefined`. The failure looked
 * exactly like "the feature was never built", which is the worst failure mode a
 * plugin can have.
 *
 * So every registration goes through {@link withPanelBoundary}: one
 * implementation, each surface carrying its own localized title and a retry
 * control. React only implements error boundaries through
 * `getDerivedStateFromError` / `componentDidCatch`, which is why this is a class
 * component and not a hook.
 */
import { Component, createElement } from 'react'
// The plugin's name is spelled once, in the descriptor table (`./typert.js`), and
// every diagnostic from this half carries it.
import { PACKAGE } from './typert.js'

/**
 * A translator that says what it cannot translate.
 *
 * The failure row is rendered before any plugin store is trustworthy, so a
 * surface that arrived without `t` must still be able to draw its own failure:
 * a boundary whose render throws would take the host's tree down with it, which
 * is the incident this whole module answers.
 * @param t - the slot's translator, if it has one.
 * @returns a function that always answers a string.
 */
const translatorOrKey = (t) => (typeof t === 'function' ? t : (key) => key)

/**
 * The boundary itself. Not registered anywhere directly — always through
 * {@link withPanelBoundary}, so no registration site can pass a bare component.
 */
class PanelBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  /**
   * React's error-boundary hook: the first thrown value becomes this surface's
   * state, and the surface renders its own failure row instead of unmounting the
   * host's tree.
   */
  static getDerivedStateFromError(error) {
    return { error: error instanceof Error ? error : new Error(String(error)) }
  }

  /** Report the failure on the only channel a browser half has. */
  componentDidCatch(error) {
    const message = error instanceof Error ? error.message : String(error)
    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
      console.warn(`[${PACKAGE}] a registered surface failed to render: ${message}`)
    }
  }

  render() {
    const { error } = this.state
    if (error === null) return this.props.children

    const t = translatorOrKey(this.props.t)
    const title = typeof this.props.title === 'string' && this.props.title !== '' ? this.props.title : t('panel.errorTitle')
    return createElement('div', { className: 'dsh-resend-panel-error', role: 'alert' }, [
      createElement('div', { key: 'title', className: 'dsh-resend-panel-error-title' }, title),
      createElement('div', { key: 'hint', className: 'dsh-resend-panel-error-hint' }, t('panel.errorHint')),
      createElement('pre', { key: 'detail', className: 'dsh-resend-panel-error-detail' }, String(error.message ?? error)),
      createElement(
        'button',
        {
          key: 'retry',
          type: 'button',
          className: 'dsh-resend-chip',
          onClick: () => this.setState({ error: null }),
        },
        t('panel.retry'),
      ),
    ])
  }
}

/**
 * Wrap one registration surface in the shared boundary.
 *
 * `titleKey` is that surface's own localized failure title, so a broken panel
 * says which panel it is — and `t` is taken from the slot's own props, because
 * the failure row is rendered before any plugin store is trustworthy.
 * @param Surface - the surface component.
 * @param titleKey - the i18n key of this surface's failure title.
 * @returns the component a registration site may pass.
 */
export function withPanelBoundary(Surface, titleKey) {
  return function Panel({ t, ...props }) {
    const translate = translatorOrKey(t)
    return createElement(
      PanelBoundary,
      { t: translate, title: translate(titleKey) },
      createElement(Surface, { t: translate, ...props }),
    )
  }
}
