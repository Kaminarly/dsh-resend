/**
 * The rewind point and its error row, in the browser half (spec §7 registration
 * 2, §7.4, §8.6, §9.4; ticket 05).
 *
 * Everything here drives the SHIPPED artifact: `lib/client.bundle.js` is
 * evaluated and materialized the way a page does, with the module table a page
 * provides, and the faces it publishes are what the cases use — a suite that
 * imported `src/` directly would be testing a tree the browser never receives.
 * The client shell is stood in for by four small services
 * (`./helpers/client.mjs`), and the one real renderer — `react-dom/server` — is
 * used for the containment claim rather than asserting a tree by hand.
 *
 * The three claims this file exists for:
 *
 *  - a rewind point is EXACTLY one of two states: ticket 06's count notice, or
 *    §9.4's error row — never both, never neither;
 *  - the error row says what happened (history was rewound, the re-send failed),
 *    carries the warning icon and a "Send again" button, and that button replays
 *    the SAME request so the host re-sends without a second rewind;
 *  - every surface goes through the ONE shared boundary, and a render throw in
 *    one of them cannot take the rest of the UI with it.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { createElement } from 'react'
import { clientHalf, MODULE_TABLE } from '../scripts/client-bundle.mjs'
import { clientComposition, recordingRemote } from './helpers/client.mjs'
import { FIBER_ACTIVE, pkg, rootDir } from './helpers/dsh.mjs'
import { mount } from './helpers/render.mjs'

/** The bundle's published seams, materialized once for the whole file. */
const {
  REWIND_ROW_DEFINITION,
  REWIND_ROW_KIND,
  RewindRow,
  createResendOperations,
  inject,
  rewindPointView,
  rewindRowSurface,
  withPanelBoundary,
} = clientHalf().exports

/** The icon identity the browser half reaches through the module table. */
const WARNING_ICON = MODULE_TABLE['@deepseek-ai/dsh-client-ui-primitives'].IconWarningOutlineRegular

/** A carrier of this plugin's, as the client sees one. */
const CARRIER = {
  type: 'user/message',
  seq: 5,
  surfaceOp: { op: 'replace', startSeq: 2, endSeq: 3 },
  data: { role: 'user', id: 'dsh-resend-edit-fixture', content: [{ type: 'text', text: '(carrier)' }], source: { kind: 'cordis-host-runner' } },
}

/** The request both the first attempt and the retry carry. */
const REQUEST = { sessionId: 'session-1', targetSeq: 2, op: 'edit', text: 'edited' }

/** The address of the rewind point those attempts leave: one session, one carrier. */
const POINT = { sessionId: 'session-1', carrierSeq: 5 }

/** The record a failed resend leaves at a rewind point. */
const FAILED = Object.freeze({ carrierSeq: 5, shadowedSeqs: Object.freeze([2, 3]), status: 'resend-failed', request: REQUEST })
/** The record a queued resend leaves. */
const QUEUED = Object.freeze({ carrierSeq: 5, shadowedSeqs: Object.freeze([2, 3]), status: 'queued', request: REQUEST })

/** Let the Cordis fibers a composition starts settle (they are promises). */
async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 20))
}

/** A composition with a FRESH copy of the shipped half activated, and what it did. */
async function activated(options) {
  const face = clientHalf().exports
  const composition = await clientComposition(options)
  const fiber = composition.ctx.plugin(face)
  await fiber
  await settle()
  return { ...composition, face, fiber }
}

/** The translator the slot owner builds for this plugin's namespace. */
function translatorOf(ctx, locale) {
  ctx.get('locale').active = locale
  return ctx.get('locale').bind('dsh-resend')
}

/** The text a tree renders, concatenated. */
function textIn(tree) {
  if (tree === null || tree === undefined) return ''
  if (typeof tree === 'string' || typeof tree === 'number') return String(tree)
  if (Array.isArray(tree)) return tree.map(textIn).join('')
  return textIn(tree.props?.children)
}

/** Every element of one type in a tree. */
function elementsOfType(tree, type, found = []) {
  if (tree === null || tree === undefined) return found
  if (Array.isArray(tree)) {
    for (const child of tree) elementsOfType(child, type, found)
    return found
  }
  if (typeof tree !== 'object' || tree.props === undefined) return found
  if (tree.type === type) found.push(tree)
  return elementsOfType(tree.props.children, type, found)
}

describe('the rewind point is a row at the carrier, and nothing else becomes one (§5.4, §7)', () => {
  it('matches a carrier of this plugin’s and refuses every neighbour', () => {
    const match = REWIND_ROW_DEFINITION.match(CARRIER)
    expect(match).toEqual({ id: 'dsh-resend:dsh-resend-edit-fixture', role: 'start' })

    // An ordinary prompt, which renders as itself — the row is not an extra
    // affordance under every message.
    expect(REWIND_ROW_DEFINITION.match({ ...CARRIER, surfaceOp: 'append' })).toBeNull()
    // Another plugin's replacement: the id prefix is the only identity there is,
    // because `source.kind` is the honest kind for ANY Cordis host plugin.
    expect(REWIND_ROW_DEFINITION.match({ ...CARRIER, data: { ...CARRIER.data, id: 'another-plugin-carrier' } })).toBeNull()
    // The audit claim is log-only, and an assistant replacement is not a user
    // message at all.
    expect(REWIND_ROW_DEFINITION.match({ type: 'compaction/prune', seq: 4, data: {} })).toBeNull()
    expect(REWIND_ROW_DEFINITION.match({ ...CARRIER, type: 'assistant/message' })).toBeNull()
    expect(REWIND_ROW_DEFINITION.match(undefined)).toBeNull()
  })

  it('produces one visible node anchored at the carrier’s own seq', () => {
    // `start` is what the assembler replays after a window fill, so it is where
    // the node's whole state comes from: the carrier's seq, and nothing the row
    // does not read.
    const state = REWIND_ROW_DEFINITION.start(undefined, { event: CARRIER })
    expect(state).toEqual({ carrierSeq: 5 })

    const context = {
      key: 'node-key',
      id: 'dsh-resend:dsh-resend-edit-fixture',
      state,
      start: { location: { kind: 'event', seq: 5 } },
    }

    const node = REWIND_ROW_DEFINITION.buildViewNode(context)

    expect(node.kind).toBe(REWIND_ROW_KIND)
    expect(node.kind).not.toBe('user')
    expect(node.anchorSeq).toBe(5)
    expect(node.data).toEqual(state)
    expect(node.visibility).toBe('visible')
    expect(node.target).toBe('chat')
    // No state yet (the assembler replays `start` after a window fill) is not a
    // node with an invented anchor.
    expect(REWIND_ROW_DEFINITION.buildViewNode({ ...context, state: undefined })).toBeNull()
    expect(REWIND_ROW_DEFINITION.update({ state })).toEqual(state)
  })
})

describe('exactly one of the two states, at every input (§8.6, §9.4)', () => {
  it('is total and single-valued', () => {
    const inputs = [undefined, null, {}, { status: 'queued' }, { status: 'resend-failed' }, { status: 'anything-else' }, FAILED, QUEUED]

    for (const input of inputs) {
      const view = rewindPointView(input)
      expect(['notice', 'resend-failed']).toContain(view.kind)
      // One value, one branch: "both at once" is not a state this function can
      // describe, which is what makes the mutual exclusion structural.
      expect(Object.keys(view)).toEqual(['kind'])
    }
  })

  it('renders the error row for a failed re-send and nothing for the notice state', () => {
    const failed = RewindRow({ outcome: FAILED, t: (key) => key, onSendAgain: () => {} })

    expect(failed).not.toBeNull()
    expect(failed.props.role).toBe('alert')
    // Ticket 06 owns the count notice; until it lands, that state renders no row
    // rather than a second claim at the same rewind point.
    expect(RewindRow({ outcome: QUEUED, t: (key) => key, onSendAgain: () => {} })).toBeNull()
    expect(RewindRow({ outcome: undefined, t: (key) => key, onSendAgain: () => {} })).toBeNull()
  })
})

describe('the error row says what happened and offers one action (§9.4)', () => {
  it('carries the warning icon, the plain statement, and a "Send again" button', async () => {
    const { ctx } = await activated()
    const t = translatorOf(ctx, 'en')
    let pressed = 0
    const tree = RewindRow({ outcome: FAILED, t, onSendAgain: () => (pressed += 1) })

    const buttons = elementsOfType(tree, 'button')
    expect(buttons).toHaveLength(1)
    expect(textIn(buttons[0])).toBe('Send again')
    // The message states both halves plainly: history WAS rewound, and the reason
    // the prompt is missing is that the agent did not take it (§9.4).
    expect(textIn(tree)).toContain('History was rewound')
    expect(textIn(tree)).toContain('the re-send failed')
    expect(textIn(tree)).toContain('the agent did not take the prompt')
    expect(elementsOfType(tree, WARNING_ICON)).toHaveLength(1)

    buttons[0].props.onClick()
    expect(pressed).toBe(1)
  })

  it('speaks exactly one language — never both at once (§10)', async () => {
    const zhCtx = await activated()
    const enCtx = await activated()
    const zhRow = RewindRow({ outcome: FAILED, t: translatorOf(zhCtx.ctx, 'zh'), onSendAgain: () => {} })
    const enRow = RewindRow({ outcome: FAILED, t: translatorOf(enCtx.ctx, 'en'), onSendAgain: () => {} })

    expect(textIn(zhRow)).toContain('历史已被重写')
    expect(textIn(zhRow)).toContain('重新发送')
    expect(textIn(zhRow)).not.toContain('Send again')
    expect(textIn(enRow)).toContain('Send again')
    expect(textIn(enRow)).not.toContain('重新发送')
    expect(zhCtx.record.missingKeys).toEqual([])
    expect(enCtx.record.missingKeys).toEqual([])
  })
})

describe('one call site, one record, and "Send again" replays the same request (§9.4)', () => {
  it('records a failure from a success envelope with no id, and reads it back at that point', async () => {
    const { ctx, calls } = await clientComposition({ results: [{ ok: true, value: { carrierSeq: 5, shadowedSeqs: [2, 3] } }] })
    const operations = createResendOperations(ctx.get('remote'))

    const result = await operations.run(REQUEST)

    expect(result.ok).toBe(true)
    expect(calls).toEqual([REQUEST])
    const outcome = operations.outcomeOf(POINT)
    expect(outcome.status).toBe('resend-failed')
    expect(outcome.shadowedSeqs).toEqual([2, 3])
    expect(rewindPointView(outcome).kind).toBe('resend-failed')
  })

  it('replays the same request once, and becomes the notice state when the re-send lands', async () => {
    const { ctx, calls } = await clientComposition({
      results: [
        { ok: true, value: { carrierSeq: 5, shadowedSeqs: [2, 3] } },
        { ok: true, value: { carrierSeq: 5, shadowedSeqs: [2, 3], resendMessageId: 'dsh-resend-edit-fixture-resend' } },
      ],
    })
    const operations = createResendOperations(ctx.get('remote'))
    await operations.run(REQUEST)

    const retried = await operations.sendAgain(POINT)

    expect(retried.ok).toBe(true)
    expect(calls).toEqual([REQUEST, REQUEST])
    expect(calls[1]).toEqual(calls[0])
    expect(operations.outcomeOf(POINT).status).toBe('queued')
    expect(rewindPointView(operations.outcomeOf(POINT)).kind).toBe('notice')
  })

  it('records nothing for a refusal — there is no rewind point to describe', async () => {
    const { ctx } = await clientComposition({ results: [{ ok: false, error: { code: 'internal' } }, { ok: false, error: { code: 'agent-busy' } }] })
    const operations = createResendOperations(ctx.get('remote'))

    await operations.run(REQUEST)
    await operations.run({ ...REQUEST, op: 'regenerate' })

    expect(operations.outcomeOf(POINT)).toBeUndefined()
  })

  it('has nothing to replay at a point this page did not produce', async () => {
    const { ctx, calls } = await clientComposition()
    const operations = createResendOperations(ctx.get('remote'))

    expect(await operations.sendAgain(POINT)).toBeUndefined()
    expect(calls).toEqual([])
  })

  it('notifies its subscribers while it holds them, and stops after they leave', async () => {
    const { ctx } = await clientComposition({ results: [{ ok: true, value: { carrierSeq: 5, shadowedSeqs: [2, 3] } }] })
    const operations = createResendOperations(ctx.get('remote'))
    let told = 0
    const stop = operations.subscribe(() => (told += 1))

    await operations.run(REQUEST)
    expect(told).toBe(1)
    stop()
    await operations.run({ ...REQUEST, targetSeq: 0 })
    expect(told).toBe(1)
  })
})

describe('every registered surface goes through the ONE boundary (§7.4, §13.3 #19)', () => {
  /** A surface that throws when rendered — the incident this boundary answers. */
  function ThrowingSurface() {
    throw new Error('this surface read a path that was permanently undefined')
  }

  it('the slot occupant is the boundary wrapping the row, with the page’s operations bound in', async () => {
    const { record } = await activated()

    const mount = record.mounts.find((entry) => entry.options.key === REWIND_ROW_KIND)
    expect(mount).toBeDefined()
    expect(mount.options.name).toBe('conversation.chat.node')
    expect(mount.options.locale).toBe('dsh-resend')

    const slotProps = { t: (key) => key, node: { data: { carrierSeq: 5 } }, sessionId: 'session-1' }
    const tree = mount.component(slotProps)

    // The registered component is a boundary element whose child is the BOUND
    // surface: invoking that child with the slot's own props must yield the row
    // with this page's operations attached, because the slot's props do NOT carry
    // plugin state (spec §7 lists the standard set).
    expect(typeof tree.type.getDerivedStateFromError).toBe('function')
    expect(typeof tree.props.children.type).toBe('function')
    const bound = tree.props.children.type(slotProps)
    expect(typeof bound.props.operations.subscribe).toBe('function')
    expect(typeof bound.props.operations.outcomeOf).toBe('function')
  })

  it('renders the registered wiring in a real DOM with only the slot’s own props', async () => {
    const { record } = await activated()
    const registration = record.mounts.find((entry) => entry.options.key === REWIND_ROW_KIND)

    const { html, thrown } = await mount(
      createElement(registration.component, { t: (key) => key, node: { data: { carrierSeq: 5 } }, sessionId: 'session-1' }),
    )

    // This page has recorded nothing at that point yet, so the rewind point is in
    // its ordinary state. What this case proves is the WIRING: the surface
    // rendered rather than being replaced by its own boundary — a registration
    // that forgot to bind `operations` would render the failure panel's title
    // here instead of nothing.
    expect(thrown).toBeUndefined()
    expect(html).toBe('')
  })

  it('renders the error row and the ordinary state through the shipped surface factory', async () => {
    // The components a real page renders are the ones this page registered, with
    // the props a slot provides. Driving the SHIPPED factory is what closes the
    // gap a hand-supplied `operations` would hide.
    const row = withPanelBoundary(rewindRowSurface({ subscribe: () => () => {}, outcomeOf: () => FAILED }), 'panel.error.rewindRow')
    const slotProps = { t: (key) => key, node: { data: { carrierSeq: 5 } }, sessionId: 'session-1' }

    const failed = await mount(createElement(row, slotProps))

    expect(failed.thrown).toBeUndefined()
    expect(failed.html).toContain('row.resendFailed')
    expect(failed.html).toContain('row.sendAgain')

    // …and the same wiring at a QUEUED point shows no error row at all — the
    // exclusion is what the user sees, not only what a function returns.
    const queued = await mount(
      createElement(withPanelBoundary(rewindRowSurface({ subscribe: () => () => {}, outcomeOf: () => QUEUED }), 'panel.error.rewindRow'), slotProps),
    )
    expect(queued.thrown).toBeUndefined()
    expect(queued.html).toBe('')
  })

  it('the error row itself, when its render throws, is contained and the rest keeps rendering (§7.4)', async () => {
    const operations = {
      subscribe() {
        throw new Error('this surface read a path that was permanently undefined')
      },
      outcomeOf: () => FAILED,
    }
    const row = withPanelBoundary(rewindRowSurface(operations), 'panel.error.rewindRow')

    const { html, thrown } = await mount(
      createElement('div', null, [
        createElement('p', { key: 'sibling' }, 'the rest of the UI is fine'),
        createElement(row, { key: 'row', t: (key) => key, node: { data: { carrierSeq: 5 } }, sessionId: 'session-1' }),
      ]),
    )

    expect(thrown).toBeUndefined()
    expect(html).toContain('the rest of the UI is fine')
    expect(html).toContain('panel.error.rewindRow')
  })

  it('contains a render throw to the failing surface, and the rest of the UI renders', async () => {
    const Wrapped = withPanelBoundary(ThrowingSurface, 'panel.error.rewindRow')
    const t = (key) => (key === 'panel.error.rewindRow' ? 'This rewind point could not be displayed' : key)

    const { html, thrown, reported } = await mount(
      createElement('div', null, [
        createElement('p', { key: 'sibling' }, 'the rest of the UI is fine'),
        createElement(Wrapped, { key: 'surface', t }),
      ]),
    )

    expect(thrown).toBeUndefined()
    expect(html).toContain('the rest of the UI is fine')
    expect(html).toContain('This rewind point could not be displayed')
    expect(html).toContain('this surface read a path that was permanently undefined')
    // The failure is not silent: React reported it, and the boundary's own
    // `componentDidCatch` logged it for a human reading the browser console.
    expect(reported.join('\n')).toContain('dsh-resend')
  })

  it('the un-boundaried surface throws out of the render — and takes the whole tree with it (§13.3 #20)', async () => {
    // The incident, reproduced: no boundary means the throw escapes AND React
    // unmounts everything it had rendered, which is the blank page.
    const { thrown, html } = await mount(createElement(ThrowingSurface, {}))

    expect(thrown?.message).toMatch(/permanently undefined/)
    expect(html).toBe('')
  })

  it('the source guard: the one registration site passes the shared factory and binds the operations', () => {
    const source = readFileSync(path.join(rootDir, 'src', 'client.js'), 'utf8')

    const registrations = source.match(/slots\.register\(\s*\{[^}]*\},\s*([^)]*)\)/g) ?? []
    expect(registrations.length).toBeGreaterThan(0)
    for (const registration of registrations) {
      // No registration site passes a bare component, and none may pass the row
      // surface unbound: the operations object is what the row reads its state
      // from, and the slot does not provide it.
      expect(registration).toMatch(/withPanelBoundary\(\s*rewindRowSurface\(/)
    }
  })

  it('the icon names this half imports exist in the installed primitives package', () => {
    // The module table's stand-in (`scripts/client-bundle.mjs`) cannot prove the
    // shipped package exports a name; the installed package can, and a missing
    // icon must be red here rather than an empty square in front of a user.
    const primitives = readFileSync(path.join(rootDir, 'node_modules', '@deepseek-ai', 'dsh-client-ui-primitives', 'lib', 'index.js'), 'utf8')

    expect(primitives).toMatch(/IconWarningOutlineRegular/)
    expect(Object.keys(pkg.peerDependencies)).toContain('@deepseek-ai/dsh-client-ui-primitives')
  })

  it('the dictionaries exist for both languages and carry the same keys', async () => {
    const { record } = await activated()

    const registration = record.dictionaries.find((entry) => entry.namespace === 'dsh-resend')
    expect(registration).toBeDefined()
    expect(Object.keys(registration.dictionaries).sort()).toEqual(['en', 'zh'])
    expect(Object.keys(registration.dictionaries.en).sort()).toEqual(Object.keys(registration.dictionaries.zh).sort())
    for (const key of ['row.resendFailed', 'row.sendAgain', 'panel.error.rewindRow', 'panel.retry']) {
      expect(Object.keys(registration.dictionaries.zh)).toContain(key)
    }
  })
})

describe('the browser half mounts only when the Remote contract did (§6.5, §7)', () => {
  it('registers the definition the row needs, in a child fiber, and activates', async () => {
    const { fiber, face, record, mounted } = await activated()

    expect(fiber.state).toBe(FIBER_ACTIVE)
    expect(face.remoteMountState().status).toBe('mounted')
    expect(mounted).toHaveLength(1)
    expect(record.definitions).toHaveLength(1)
    expect(record.definitions[0]).toBe(face.REWIND_ROW_DEFINITION)
    expect(record.injected).toContain('conversation.chat.node')
    // The three slot-side services are NOT in the static inject list: a host
    // without one of them would leave the row PENDING forever, and the renderer's
    // boot audit treats that as a failed boot.
    expect(inject).toEqual(['remote'])
  })

  it('accepts either generation of the definition registry, and says so when neither is there', async () => {
    const older = await activated({ conversation: 'self' })
    expect(older.record.definitions).toHaveLength(1)
    expect(older.record.definitions[0]).toBe(older.face.REWIND_ROW_DEFINITION)

    const none = await clientComposition({ conversation: 'none' })
    const warnings = []
    none.ctx.logger.exporter({ levels: { default: 2 }, export: (line) => warnings.push(line) })
    await none.ctx.plugin(clientHalf().exports)
    await settle()

    // No definition means the row never appears — but the half is still active
    // and still mounted its slot, and the degradation is not silent.
    expect(none.record.definitions).toEqual([])
    expect(none.record.injected).toContain('conversation.chat.node')
    expect(warnings.some((line) => line.args.join(' ').includes('no definition registry'))).toBe(true)
  })

  it('mounts nothing at all while its slot-side services are missing, and stays a live row', async () => {
    // A composition with the Remote service ONLY: the feature is ABSENT (§7),
    // which is an accepted state — and, crucially, not a boot failure. The whole
    // reason the UI waits in a child fiber is that a row left PENDING by a missing
    // service fails the renderer's boot audit for every other plugin too.
    const face = clientHalf().exports
    const { RecordingRemote, mounted } = recordingRemote()
    const ctx = new Context()
    await ctx.plugin(RecordingRemote)

    const fiber = ctx.plugin(face)
    await fiber
    await settle()

    expect(fiber.state).toBe(FIBER_ACTIVE)
    expect(mounted).toHaveLength(1)
    expect(face.remoteMountState().status).toBe('mounted')
  })
})
