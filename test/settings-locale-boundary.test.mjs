/**
 * Settings, localization, and the one shared error boundary (ticket 08; spec
 * §7 registration 4, §7.4, §10, §13.3 #19–#21).
 *
 * The end-to-end behaviour this ticket owns: editable preferences that take
 * effect immediately in the very pass that flips them; a UI that is exactly
 * one of two languages at any moment, with slot-projected labels provided as
 * thunks so a language switch needs no re-registration; the trace text, whose
 * language is picked at WRITE time and is immutable once written; and the one
 * boundary implementation every registered surface goes through — so a render
 * throw in one surface becomes that surface's own failure row, never a blank
 * page.
 *
 * As in the sibling files, everything behavioural drives the shipped bundle
 * (`clientHalf()`), never `src/`: the suite holds the tree the browser actually
 * receives. The two source guards are the exception, and they read `src/` on
 * purpose — they are about the wiring a page is built from.
 */
import { describe, expect, it, vi } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { createElement } from 'react'
import { clientHalf } from '../scripts/client-bundle.mjs'
import { clientComposition } from './helpers/client.mjs'
import { mount, renderDom } from './helpers/render.mjs'
import { rootDir } from './helpers/dsh.mjs'
import { TRACE_TEXT, traceTextNow } from '../lib/trace-text.js'

/** The bundle's published seams, materialized once for the whole file. */
const face = clientHalf().exports

/**
 * One activated composition: the shipped half against the four client doubles.
 * Each call materializes a FRESH module instance, so the preferences store a
 * toggle test mutates never leaks into the next test's defaults.
 */
async function activated(options = {}) {
  const composition = await clientComposition(options)
  const page = clientHalf().exports
  await composition.ctx.plugin(page)
  await new Promise((resolve) => setTimeout(resolve, 20))
  return composition
}

/** The settings registration, found by its id. */
const settingsOf = (composition) => composition.record.mounts.find((entry) => entry.options.id === 'dsh-resend-preferences')

/** The action-row registration, found by its key. */
const actionsOf = (composition) => composition.record.mounts.find((entry) => entry.options.key === 'dsh-resend-user-actions')

/** The rewind-point registration, found by its key. */
const rewindOf = (composition) => composition.record.mounts.find((entry) => entry.options.key === 'dsh-resend-error')

/** The regenerate registration, found by its id. */
const regenerateOf = (composition) => composition.record.mounts.find((entry) => entry.options.id === 'dsh-resend-regenerate')

/**
 * One snapshot that answers every surface in this file: the user row, the
 * action row, the reply row, and the rewind point whose record shadows seqs
 * 2 and 3 (the default recording-remote result, once an edit is sent).
 */
const SNAPSHOT_NODES = new Map([
  ['user-2', { key: 'user-2', kind: 'user', anchorSeq: 2 }],
  ['assigned-actions', { key: 'assigned-actions', kind: 'dsh-resend-user-actions', anchorSeq: 2, data: { seq: 2, text: 'original' } }],
  ['reply-3', { key: 'reply-3', kind: 'assistant-step', anchorSeq: 3 }],
  ['point-5', { key: 'point-5', kind: 'dsh-resend-error', anchorSeq: 5, data: { carrierSeq: 5, shadowedSeqs: [2, 3] } }],
])
const SNAPSHOT = { nodes: SNAPSHOT_NODES }

/**
 * The same transcript without the carrier node: until an edit lands, nothing is
 * shadowed, so the action row is visible — the Edit chip is present and clickable.
 */
const LIVE_NODES = new Map([...SNAPSHOT_NODES].filter(([key]) => key !== 'point-5'))
const LIVE = { nodes: LIVE_NODES }

/** The standard slot props the action row registration receives, for one snapshot. */
function actionProps(composition, snapshot = LIVE) {
  const registration = actionsOf(composition)
  return {
    node: SNAPSHOT_NODES.get('assigned-actions'),
    sessionId: 'session-1',
    t: composition.ctx.get('locale').bind('dsh-resend'),
    useChat: (select) => select(snapshot),
    useInput: (select) => select(composition.record.input),
    useSession: (select) => select({ running: false }),
    inputActions: { setDraft: (text) => composition.record.draftWrites.push(text) },
    ...registration.options.inject('session-1'),
  }
}

/** The snapshot the rewind point reads its count from. */
function rewindProps(composition) {
  return {
    node: SNAPSHOT_NODES.get('point-5'),
    sessionId: 'session-1',
    t: composition.ctx.get('locale').bind('dsh-resend'),
    useChat: (select) => select(SNAPSHOT),
  }
}

/** The last-reply companion snapshot, the way the regenerate fixture builds one. */
const REGENERATE_SNAPSHOT = { nodes: new Map([
  ['step-2', { key: 'step-2', kind: 'assistant-step', anchorSeq: 2 }],
  ['companion-2', { key: 'companion-2', kind: 'dsh-resend-regenerate', anchorSeq: 2, visibility: 'hidden', data: { seq: 2, id: 'reply-2', prevSeq: null, prompt: { seq: 1, isAppend: true, sourceKind: 'user', hasText: true } } }],
  ['step-6', { key: 'step-6', kind: 'assistant-step', anchorSeq: 6 }],
  ['companion-6', { key: 'companion-6', kind: 'dsh-resend-regenerate', anchorSeq: 6, visibility: 'hidden', data: { seq: 6, id: 'reply-6', prevSeq: 2, prompt: { seq: 5, isAppend: true, sourceKind: 'user', hasText: true } } }],
])}
const regenerateProps = (composition) => ({
  messageId: 'reply-6',
  sessionId: 'session-1',
  t: composition.ctx.get('locale').bind('dsh-resend'),
  useChat: (select) => select(REGENERATE_SNAPSHOT),
  useSession: (select) => select({ running: false }),
})

/** Every hand-written source file under `src/`, for the source guards below. */
const sourceTexts = () => readdirSync(path.join(rootDir, 'src'))
  .filter((file) => file.endsWith('.js'))
  .map((file) => readFileSync(path.join(rootDir, 'src', file), 'utf8'))

/**
 * The same files with comments removed, so a count over them is a count of CODE
 * (a comment that mentions `withPanelBoundary(` is prose, not a construction site).
 */
const sourceCode = () => sourceTexts()
  .map((text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, ''))
  .join('\n')

/** The English dictionary this half registered. */
const settingsDictionary = (composition) => composition.record.dictionaries
  .find((entry) => entry.namespace === 'dsh-resend')
  .dictionaries.en

/**
 * The props a registration receives when a case only needs its element tree:
 * the slot's own props, with no store behind them. Calling a registration's
 * component is what produces the boundary element, so these are enough — none of
 * the surfaces is rendered here, only constructed.
 */
const SLOT_PROPS = Object.freeze({
  node: SNAPSHOT_NODES.get('assigned-actions'),
  sessionId: 'session-1',
  t: (key) => key,
})

/** One button in a rendered tree, by its visible text; `null` when absent. */
const buttonIn = (container, text) => [...container.querySelectorAll('button')].find((button) => button.textContent === text || button.getAttribute('aria-label') === text) ?? null

/** One settings toggle, by its field. */
const toggleIn = (container, field) => container.querySelector(`[data-field="${field}"] button.dsh-resend-settings-toggle`)

describe('registration 4: editable preferences and fixed hiding', () => {
  it('registers the settings row under its own id, with a thunk label and no owner props', async () => {
    const composition = await activated()
    const registration = settingsOf(composition)
    expect(registration).not.toBeUndefined()
    expect(registration.options).toEqual({
      name: 'settings.general.item',
      id: 'dsh-resend-preferences',
      order: expect.any(Number),
      locale: 'dsh-resend',
      label: expect.any(Function),
    })
    expect(registration.options.id).not.toBe('dsh-resend-regenerate')
    expect(typeof registration.component).toBe('function')
  })

  it('keeps hiding fixed while the remaining settings default to on', async () => {
    const composition = await activated()
    const settingsDom = await renderDom(createElement(settingsOf(composition).component))
    const chatDom = await renderDom(createElement(actionsOf(composition).component, actionProps(composition)))
    try {
      // Every preference starts on.
      expect(toggleIn(settingsDom.container, 'hideReplacedMessages')).toBeNull()
      expect(settingsDom.container.querySelectorAll('[role=switch]')).toHaveLength(3)
      for (const field of ['inlineEditorBeneathMessage', 'regenerateLastReply', 'restrictRegenerateToLastReply']) {
        const toggle = settingsDom.container.querySelector(`[data-field="${field}"] button.dsh-resend-settings-toggle`)
        expect(toggle?.getAttribute('aria-checked')).toBe('true')
      }

      // Send one edit so this page has a record: seqs 2 and 3 are shadowed.
      await chatDom.click(buttonIn(chatDom.container, 'Edit'))
      await chatDom.change(chatDom.container.querySelector('textarea'), 'edited')
      await chatDom.key(chatDom.container.querySelector('textarea'), 'Enter')
      expect(composition.calls).toHaveLength(1)

      // Replaced rows are always hidden.
      const style = chatDom.container.querySelector('style[data-dsh-resend-hide-rules]')
      expect(style.textContent).toContain('user-2')
      expect(style.textContent).toContain('display:none')

      // The notice row reports the count.
      const noticeDom = await renderDom(createElement(rewindOf(composition).component, rewindProps(composition)))
      try {
        expect(noticeDom.container.textContent).toContain('3 messages hidden')
      } finally {
        await noticeDom.cleanup()
      }

    } finally {
      await chatDom.cleanup()
      await settingsDom.cleanup()
    }
  })

  it('rejects writes to the retired hiding preference', () => {
    const preferences = face.createPreferences()
    expect(preferences.fields).not.toContain('hideReplacedMessages')
    expect(preferences.getSnapshot()).not.toHaveProperty('hideReplacedMessages')
    expect(() => preferences.set('hideReplacedMessages', false)).toThrow('unknown preference')
    expect(() => preferences.set('hideReplacedMessages', true)).toThrow('unknown preference')
  })

  it('inline editor off removes the editor from the row and keeps the composer handoff', async () => {
    const composition = await activated()
    const settingsDom = await renderDom(createElement(settingsOf(composition).component))
    const chatDom = await renderDom(createElement(actionsOf(composition).component, actionProps(composition)))
    try {
      // On: the row opens an inline editor.
      await chatDom.click(buttonIn(chatDom.container, 'Edit'))
      expect(chatDom.container.querySelector('textarea')).not.toBeNull()
      await chatDom.click(buttonIn(chatDom.container, 'Cancel'))

      // Off: the editor is gone and the handoff remains.
      await settingsDom.click(toggleIn(settingsDom.container, 'inlineEditorBeneathMessage'))
      await chatDom.act(async () => {})
      expect(chatDom.container.querySelector('textarea')).toBeNull()
      const composer = buttonIn(chatDom.container, 'Edit in the composer')
      expect(composer).not.toBeNull()
      expect(composer.disabled).toBe(false)
      expect(buttonIn(chatDom.container, 'Edit')).toBeNull()
    } finally {
      await chatDom.cleanup()
      await settingsDom.cleanup()
    }
  })

  it('regenerate off hides the control entirely', async () => {
    const composition = await activated()
    const settingsDom = await renderDom(createElement(settingsOf(composition).component))
    const stripDom = await renderDom(createElement(regenerateOf(composition).component, regenerateProps(composition)))
    try {
      expect(buttonIn(stripDom.container, 'Regenerate')).not.toBeNull()

      await settingsDom.click(toggleIn(settingsDom.container, 'regenerateLastReply'))
      await stripDom.act(async () => {})
      expect(stripDom.container.innerHTML).toBe('')
      expect(stripDom.container.querySelector('button')).toBeNull()
    } finally {
      await stripDom.cleanup()
      await settingsDom.cleanup()
    }
  })
})

describe('localization: one language at a time, labels by thunk (spec §10)', () => {
  it('a language switch re-reads every label without re-registering', async () => {
    const composition = await activated()
    const locale = composition.ctx.get('locale')
    expect(locale.active).toBe('en')
    const registration = settingsOf(composition)
    const strip = regenerateOf(composition)

    // The slot-projected labels are thunks, and they read the live locale.
    expect(typeof registration.options.label).toBe('function')
    expect(registration.options.label()).toBe('Message editing settings')
    expect(typeof strip.options.label).toBe('function')
    expect(strip.options.label()).toBe('Regenerate')

    // The settings row is English; its owner passes no props at all.
    const settingsDom = await renderDom(createElement(registration.component))
    // And the chat surfaces are English through the slot's own translator.
    const chatDom = await renderDom(createElement(actionsOf(composition).component, actionProps(composition)))
    try {
      expect(settingsDom.container.textContent).toContain('Inline editor beneath the message')
      expect(settingsDom.container.textContent).toContain('Show regenerate buttons')
      expect(settingsDom.container.textContent).not.toContain('Hide replaced messages')
      expect(buttonIn(chatDom.container, 'Edit')).not.toBeNull()

      // One language at a time: flip the active locale. No register call follows.
      locale.active = 'zh'
      await settingsDom.render(createElement(registration.component))
      await chatDom.render(createElement(actionsOf(composition).component, actionProps(composition)))
      expect(settingsDom.container.textContent).toContain('消息下方的内联编辑器')
      expect(settingsDom.container.textContent).toContain('显示重新生成按钮')
      expect(settingsDom.container.textContent).not.toContain('隐藏被替换的消息')
      expect(settingsDom.container.textContent).not.toContain('Hide replaced messages')
      expect(buttonIn(chatDom.container, '编辑')).not.toBeNull()
      expect(buttonIn(chatDom.container, 'Edit')).toBeNull()
      expect(registration.options.label()).toBe('消息编辑设置')
      expect(strip.options.label()).toBe('重新生成')
      expect(composition.record.dictionaries).toHaveLength(1)
      expect(composition.record.mounts).toHaveLength(4)
    } finally {
      await chatDom.cleanup()
      await settingsDom.cleanup()
    }
  })

  it('carries the new keys in both dictionaries', async () => {
    const composition = await activated()
    const entry = composition.record.dictionaries.find((item) => item.namespace === 'dsh-resend')
    expect(Object.keys(entry.dictionaries).sort()).toEqual(['en', 'zh'])
    for (const key of [
      'settings.heading', 'settings.inlineEditorBeneathMessage', 'settings.regenerateLastReply',
      'settings.restrictRegenerateToLastReply', 'settings.regenerateRangeDescription',
      'row.conversationUnavailable', 'operation.error.not-assistant-message',
      'settings.loading', 'settings.saving', 'settings.read-error', 'settings.save-error', 'settings.retry',
      'settings.on', 'settings.off',
      'panel.error.inlineEditor', 'panel.error.hideRules', 'panel.error.settings',
    ]) {
      expect(Object.keys(entry.dictionaries.en)).toContain(key)
      expect(Object.keys(entry.dictionaries.zh)).toContain(key)
    }
  })
})

describe('the trace text picks its language at write time (spec §5.4, §10)', () => {
  const ctxWith = (active) => ({ get: (name) => (name === 'locale' ? { getSnapshot: () => ({ active }) } : undefined) })

  it('records the active locale at write time, and defaults to English', () => {
    expect(traceTextNow(ctxWith('zh'))).toBe(TRACE_TEXT.zh)
    expect(traceTextNow(ctxWith('en'))).toBe(TRACE_TEXT.en)
    expect(traceTextNow({ get: () => undefined })).toBe(TRACE_TEXT.en)
    expect(traceTextNow(ctxWith('fr'))).toBe(TRACE_TEXT.en)
  })

  it('is immutable once written: the recorded text is a frozen constant', () => {
    expect(Object.isFrozen(TRACE_TEXT)).toBe(true)
    expect(Object.isFrozen(TRACE_TEXT.en)).toBe(true)
    expect(Object.isFrozen(TRACE_TEXT.zh)).toBe(true)
    const written = traceTextNow(ctxWith('zh'))
    // A later locale change cannot reach back into what was already written.
    expect(traceTextNow(ctxWith('en'))).toBe(TRACE_TEXT.en)
    expect(written).toBe(TRACE_TEXT.zh)
  })
})

describe('the one shared boundary across all six registered surfaces (spec §7.4)', () => {
  const SIX_TITLES = Object.freeze([
    'panel.error.userActions',
    'panel.error.inlineEditor',
    'panel.error.rewindRow',
    'panel.error.regenerate',
    'panel.error.settings',
    'panel.error.hideRules',
  ])

  it('wraps every surface through the same implementation, each with its own localized title', async () => {
    const composition = await activated()
    const t = composition.ctx.get('locale').bind('dsh-resend')
    function ThrowingSurface() {
      throw new Error('surface boom')
    }
    const warn = vi.spyOn(console, 'warn')
    try {
      for (const titleKey of SIX_TITLES) {
        const { html, thrown } = await mount(
          createElement(face.withPanelBoundary(ThrowingSurface, titleKey), { t }),
        )
        expect(thrown, titleKey).toBeUndefined()
        expect(html, titleKey).toContain('dsh-resend-panel-error')
        expect(html, titleKey).toContain('role="alert"')
        expect(html, titleKey).toContain(t(titleKey))
        expect(html, titleKey).toContain('surface boom')
        expect(html, titleKey).toContain(t('panel.retry'))
      }
      // One implementation: the one shared console message, six times.
      expect(warn.mock.calls).toHaveLength(SIX_TITLES.length)
      for (const call of warn.mock.calls) {
        // The thrown error is created in the test's realm, so the boundary sees a
        // foreign error and reports it as `Error: <message>` — assert the shared
        // prefix and the message, not the exact string.
        expect(call[0].startsWith('[dsh-resend] a registered surface failed to render: ')).toBe(true)
        expect(call[0]).toContain('surface boom')
      }
    } finally {
      warn.mockRestore()
    }
  })

  it('offers a retry that re-renders the surface', async () => {
    const composition = await activated()
    const t = composition.ctx.get('locale').bind('dsh-resend')
    let broken = true
    function FlakySurface() {
      if (broken) throw new Error('surface boom')
      return createElement('div', { className: 'dsh-resend-recovered' }, 'back')
    }
    const dom = await renderDom(createElement(face.withPanelBoundary(FlakySurface, 'panel.error.userActions'), { t }))
    try {
      expect(dom.container.querySelector('.dsh-resend-panel-error')).not.toBeNull()
      broken = false
      await dom.click(dom.container.querySelector('button.dsh-resend-chip'))
      expect(dom.container.querySelector('.dsh-resend-recovered')).not.toBeNull()
      expect(dom.container.querySelector('.dsh-resend-panel-error')).toBeNull()
    } finally {
      await dom.cleanup()
    }
  })

  it('the shipped registration sites all go through the ONE implementation, one wrap and one title each (§7.4, §13.3 #19)', async () => {
    // THE STRUCTURAL FORM of this criterion: not "a boundary exists" but "every
    // registration passes a component the SAME factory produced, and that
    // component is a boundary carrying this site's own title".
    const composition = await activated()
    const patch = face.withPanelBoundary((props) => createElement('div', props), 'panel.error.userActions')
    const registrations = composition.record.mounts
    const produced = registrations.map((registration) => registration.component({ ...SLOT_PROPS }))

    expect(registrations).toHaveLength(4)
    for (const [index, registration] of registrations.entries()) {
      const label = registration.options.id ?? registration.options.key
      const tree = produced[index]
      expect(typeof tree?.type?.getDerivedStateFromError, label).toBe('function')
      expect(typeof tree?.props?.children?.type, label).toBe('function')
      expect(typeof tree?.props?.title, label).toBe('string')
      expect(tree?.props?.title, label).not.toBe('')
    }

    // Identity, in the two forms this seam allows. All four registrations live in
    // ONE module instance, and each `Panel` closure it hands out is a distinct
    // object — so the shared thing is not the closure but the CLASS every one of
    // them renders: one `PanelBoundary` across all four sites. A per-site boundary
    // implementation would be a second class here.
    const owners = registrations.map((registration) => registration.component)
    for (const owner of owners) expect(typeof owner).toBe('function')
    expect(new Set(produced.map((tree) => tree.type)).size).toBe(1)
    // …and their bodies are one wrapper, which is what the cross-materialization
    // comparison below can be held to.
    const bodies = new Set(owners.map((owner) => String(owner)))
    expect(bodies.size).toBe(1)

    // `face` is a DIFFERENT materialization of the bundle than the composition's
    // (each `clientHalf()` is its own module instance), so object identity across
    // the two cannot be compared — the shared FACTORY can, and it produces one
    // wrapper text. A boundary a site built by hand has a different body, so the
    // comparison below is not vacuous.
    expect(String(patch)).toBe([...bodies][0])
    expect(String((props) => createElement('div', props))).not.toBe(String(patch))
    expect(String(face.withPanelBoundary((props) => createElement('div', props), 'panel.error.userActions'))).toBe(String(patch))
  })

  it('gives every construction site its own title, and no key two of them (§7.4, §13.3 #19)', async () => {
    // The source guard the criterion asks for is structural on both ends: exactly
    // one boundary class in the hand-written tree, one construction call per
    // registered title, and a distinct title per site. A surface that shared a
    // sibling's title would be reported to the user as the wrong panel.
    const composition = await activated()
    const registered = settingsDictionary(composition)
    const all = sourceCode()
    // The construction sites are the CALLS, matched to their closing parenthesis:
    // each one's LAST argument is its own title key (the settings row passes its
    // base translator after it). Anchoring on the call's end is what keeps the
    // count from drifting with a comment or an import that merely mentions the
    // factory — the factory's own declaration has no title argument and is
    // therefore not one of these.
    const callSites = [...all.matchAll(/withPanelBoundary\((?:[^()]|\([^()]*\))*?(?:'(?:panel|settings)\.[A-Za-z.]+'(?:\s*,\s*translate)?\s*)\)/g)]
    const titles = [...all.matchAll(/withPanelBoundary\((?:[^()]|\([^()]*\))*,\s*'(panel\.error\.[A-Za-z]+)'/g)].map((match) => match[1])
    // Every title in the source is one of the six this suite names, and every one
    // of the six is used: a surface whose title key no dictionary carries would
    // render the raw key instead of a sentence.
    expect(callSites).toHaveLength(6)
    expect(titles).toHaveLength(callSites.length)
    expect(new Set(titles).size).toBe(titles.length)
    expect(titles.slice().sort()).toEqual(SIX_TITLES.slice().sort())
    for (const title of titles) expect(Object.keys(registered)).toContain(title)

    // The bundle a page receives carries the same wiring — the guard is about the
    // tree that ships, not only the tree that is edited. The title key is matched
    // without its quotes because the bundler is free to choose them.
    const bundle = readFileSync(path.join(rootDir, 'lib', 'client.bundle.js'), 'utf8')
    for (const title of titles) expect(bundle.split(title).length - 1, title).toBeGreaterThanOrEqual(1)
    expect(bundle).toContain('withPanelBoundary')

    // …and each registration hands the boundary its own LOCALIZED title: the
    // boundary renders the string it was given, so a registration that forgot to
    // pass one falls back to the generic page title and is red here.
    const t = composition.ctx.get('locale').bind('dsh-resend')
    const titlesInUse = []
    for (const registration of composition.record.mounts) {
      const tree = registration.component({ ...SLOT_PROPS, t })
      expect(typeof tree.props.title).toBe('string')
      expect(tree.props.title).not.toBe(t('panel.errorTitle'))
      expect(tree.props.title).not.toBe('')
      titlesInUse.push(tree.props.title)
    }
    // Four registrations name four different panels; the remaining two titles
    // belong to sub-surfaces that a registration builds internally.
    expect(new Set(titlesInUse).size).toBe(titlesInUse.length)
    expect(Object.keys(registered).filter((key) => key.startsWith('panel.error.'))).toHaveLength(SIX_TITLES.length)
  })

  it('a throwing surface under a registration fails as that registration’s own panel (§7.4, §13.3 #19)', async () => {
    const composition = await activated()
    const t = composition.ctx.get('locale').bind('dsh-resend')
    function ThrowingSurface() {
      throw new Error('this surface read a path that was permanently undefined')
    }

    // What no other case holds: the title a REGISTRATION'S boundary renders is the
    // one that registration passed. Mounted through the registration's own wiring
    // (its factory, its title key), a throw becomes that surface's failure row and
    // not the generic panel — and not the tree's collapse (§13.3 #20 is the case
    // below; containment beside a live sibling is the rewind-row suite's subject).
    const registration = settingsOf(composition)
    const wrappedThrower = face.withPanelBoundary(ThrowingSurface, 'panel.error.settings')
    const { html, thrown } = await mount(createElement(wrappedThrower, { t }))

    expect(registration.options.id).toBe('dsh-resend-preferences')
    expect(thrown).toBeUndefined()
    expect(html).toContain('dsh-resend-panel-error')
    expect(html).toContain('role="alert"')
    expect(html).toContain(t('panel.error.settings'))
    expect(html).toContain('this surface read a path that was permanently undefined')
    // The generic page title is what a boundary with no title shows; this one is
    // the settings row's own sentence.
    expect(html).not.toContain(t('panel.errorTitle'))
  })

  it('no registration site passes a bare component (source guard)', () => {
    const texts = sourceTexts()

    // Exactly one boundary implementation in the whole half.
    expect(texts.join('\n').match(/class PanelBoundary/g)).toHaveLength(1)

    // Every slots.register site hands its component through the factory.
    const client = texts.find((text) => text.includes('function mountSurfaces'))
    expect(client).not.toBeUndefined()
    const registerSites = client.split('slots.register(').length - 1
    expect(registerSites).toBe(4)
    for (const chunk of client.split(/slots\.register\(/).slice(1)) {
      expect(chunk.slice(0, 800)).toContain('withPanelBoundary(')
    }

    // The sub-surfaces are factory products too, not inline elements: the file
    // that DEFINES each (not one that merely re-exports it) binds it to the factory.
    expect(texts.some((text) => /HideRulesSurface\s*=\s*withPanelBoundary\(/.test(text))).toBe(true)
    expect(texts.some((text) => /InlineEditorSurface\s*=\s*withPanelBoundary\(/.test(text))).toBe(true)
  })

  it('a deliberately throwing surface leaves the other surfaces intact; without the boundary the same component throws out of the render', async () => {
    const composition = await activated()
    const t = composition.ctx.get('locale').bind('dsh-resend')
    const throwingOperations = {
      subscribe: () => () => {},
      recordsFor: () => {
        throw new Error('this surface read a path that was permanently undefined')
      },
    }
    const props = { ...actionProps(composition), operations: throwingOperations, preferences: face.preferences }

    // One edit lands so the sibling has a record to count: seqs 2 and 3 shadowed.
    const chatDom = await renderDom(createElement(actionsOf(composition).component, actionProps(composition)))
    await chatDom.click(buttonIn(chatDom.container, 'Edit'))
    await chatDom.change(chatDom.container.querySelector('textarea'), 'edited')
    await chatDom.key(chatDom.container.querySelector('textarea'), 'Enter')
    expect(composition.calls).toHaveLength(1)

    // (a) wrapped, beside a working sibling surface: only the thrower fails.
    const wrapped = face.withPanelBoundary(face.userActionsSurface(throwingOperations, face.preferences), 'panel.error.userActions')
    const { html, thrown } = await mount(createElement('div', null, [
      createElement(rewindOf(composition).component, { key: 'sibling', ...rewindProps(composition) }),
      createElement(wrapped, { key: 'row', t, node: SNAPSHOT_NODES.get('assigned-actions'), sessionId: 'session-1',
        useChat: (select) => select(SNAPSHOT), useInput: (select) => select(composition.record.input),
        useSession: (select) => select({ running: false }), inputActions: { setDraft: () => {} },
        readInput: () => ({ phase: 'plain' }) }),
    ]))
    await chatDom.cleanup()
    expect(thrown).toBeUndefined()
    expect(html).toContain('messages hidden')
    expect(html).toContain(t('panel.error.userActions'))
    expect(html).toContain('this surface read a path that was permanently undefined')

    // (b) the same component without the boundary: the throw escapes the render.
    const unboundaried = await mount(createElement(face.UserActionsRow, props))
    expect(unboundaried.thrown).toBeDefined()
    expect(unboundaried.html).toBe('')
  })
})
