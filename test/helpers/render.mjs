/**
 * A real DOM for the surfaces this plugin registers (spec §7.4; ticket 05).
 *
 * The claim the shared boundary makes is "a render throw inside one surface
 * becomes that surface's own failure row, and everything else keeps rendering" —
 * and it can only be answered where React's boundary semantics actually run. Two
 * tempting shortcuts do not work, both measured against the pinned React:
 *
 *  - the LEGACY server renderer (`renderToStaticMarkup`) propagates a render
 *    throw; a boundary looks like it does nothing at all;
 *  - the streaming renderer makes a throw during the SHELL fatal
 *    (`onShellError`), and emits no markup, so siblings are gone too.
 *
 * So this harness installs a DOM (jsdom) and renders with `react-dom/client` —
 * the renderer the browser runs, not a stand-in. `react-dom` and `jsdom` are
 * devDependencies for exactly this reason: no shipped artifact imports either.
 *
 * The environment is installed once per process (globals are process-wide) and
 * the renderer is imported only after the DOM exists, because `react-dom/client`
 * reads `document` at its own module scope.
 */
import { JSDOM, VirtualConsole } from 'jsdom'

/** The installed DOM, or `undefined` before {@link installDom} runs. */
let dom

/**
 * Install the DOM and the React act flag, once.
 * @returns the jsdom instance.
 */
function installDom() {
  if (dom !== undefined) return dom
  dom = new JSDOM('<!doctype html><html><body></body></html>', {
    // React reports a caught render error through `console.error` and jsdom
    // forwards its own "uncaught error" events to the same place; both are
    // expected in this file, and `mount` collects them instead of printing them.
    virtualConsole: new VirtualConsole(),
  })
  globalThis.window = dom.window
  globalThis.document = dom.window.document
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  return dom
}

/** The renderer pair, imported once the DOM exists. */
let renderer
async function reactRenderer() {
  if (renderer !== undefined) return renderer
  const [{ createRoot }, react] = await Promise.all([import('react-dom/client'), import('react')])
  const act = typeof react.act === 'function' ? react.act : (await import('react-dom/test-utils')).act
  renderer = { createRoot, act }
  return renderer
}

/**
 * Mount one element into a fresh container and report what happened.
 *
 * The throw is RETURNED rather than re-thrown, because the interesting failure —
 * a surface with no boundary — is exactly the case where React unmounts the whole
 * tree: the caller needs both facts (it threw, and the container is empty) to
 * state the claim.
 * @param element - the element to render.
 * @returns `{ html, thrown, reported }`: the container's markup, the error React
 *   let escape (`undefined` when nothing escaped), and the lines React logged
 *   about it.
 */
export async function mount(element) {
  installDom()
  const { createRoot, act } = await reactRenderer()
  const container = document.createElement('div')
  document.body.append(container)

  const reported = []
  const consoleError = console.error
  console.error = (...args) => {
    reported.push(args.map((value) => String(value)).join(' '))
  }

  let thrown
  try {
    const root = createRoot(container)
    await act(async () => {
      root.render(element)
    })
  } catch (error) {
    thrown = error
  } finally {
    console.error = consoleError
  }

  const html = container.innerHTML
  container.remove()
  return { html, thrown, reported }
}

/** Keep a rendered tree alive while a test drives real events and CSS. */
export async function renderDom(element) {
  installDom()
  const { createRoot, act } = await reactRenderer()
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () => root.render(element))
  return {
    container,
    act,
    async render(next) {
      await act(async () => root.render(next))
    },
    async click(target) {
      await act(async () => target.dispatchEvent(new window.MouseEvent('click', { bubbles: true })))
    },
    async key(target, key, options = {}) {
      await act(async () => target.dispatchEvent(new window.KeyboardEvent('keydown', { bubbles: true, cancelable: true, key, ...options })))
    },
    async change(target, value) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
      await act(async () => {
        setter.call(target, value)
        target.dispatchEvent(new window.Event('input', { bubbles: true }))
      })
    },
    async cleanup() {
      await act(async () => root.unmount())
      container.remove()
    },
  }
}
