/**
 * The host doubles for the operation suite (spec §13.2 #16–#18).
 *
 * Three rules shape this file, and each of them is a defect the reference
 * implementation paid for:
 *
 * 1. **The fixture session is the REAL `Session` class** (`@deepseek-ai/dsh-session`),
 *    built through the real `append` API, so the surface, the replacement
 *    splice and every pre-write rule in play are the host's own — a stub whose
 *    `append` always accepts turns "the rules were respected" into a claim that
 *    can never fail (spec §13.2 #17, §16.3). The suite also folds this log with
 *    the official `foldSurface`, which is what the plugin does.
 * 2. **The fake mirrors the production host's generation by default** (§13.2
 *    #16): the session exposes `snapshotEvents()` / `eventAt()` and NO `events`
 *    member, and route (2)'s double returns WHAT the host returns —
 *    `snapshotEvents()` is exactly what `sessionQuery.readSession` is built on
 *    (spec §16.1) — so a suite that passes here is not passing on a shape the
 *    real host does not have. The legacy event view exists only behind the
 *    explicit {@link withLegacyEventView} opt-in.
 * 3. **Unknown is not zero.** Every "not available" answer the host can give
 *    (no file yet, an empty detached read, a failing read, a missing service)
 *    is modelled as its own state, so the caller's fallback is exercised
 *    instead of being papered over by a double that always answers.
 *
 * The doubles stand at the five service seams the operation reads
 * (`sessions`, `agents`, `sessionQuery`, `sessionPersistence`, `locale`) plus
 * the two host services the WRITE reads for real: the `tokenMeter` (whose
 * official estimator is the audit claim's price, spec §5.3) and the projection
 * registry it registers with. Those two are the shipped implementations, not
 * doubles — the shadow-price protocol is the thing the suite is checking, so a
 * stand-in would only prove that a stand-in agrees with itself.
 */
import { Context, Service } from '@deepseek-ai/cordis'
import { Session } from '@deepseek-ai/dsh-session'
import { SessionProjectionRegistry } from '@deepseek-ai/dsh-session-projection'
import { TokenMeter } from '@deepseek-ai/dsh-token-meter'

/** The fixture's first round. */
export const FIRST_PROMPT = 'first prompt'
export const FIRST_REPLY = 'first reply'
/** The fixture's second round — the round a regenerate acts on. */
export const SECOND_PROMPT = 'second prompt'
export const SECOND_REPLY = 'second reply'

/** The default fixture session id. */
export const SESSION_ID = 'session-1'

/**
 * Append one user message the way a real turn does — a real prompt, so the
 * round-boundary predicate (`source.kind === 'user'`) sees what production sees.
 * @param session - the fixture session.
 * @param message - `{ id, text }`, plus `source` for an injected-context message.
 * @returns the appended event.
 */
export function appendUser(session, { id, text, source = 'user' }) {
  return session.append('user/message', { role: 'user', id, content: [{ type: 'text', text }], source: { kind: source } }, { surfaceOp: 'append' })
}

/**
 * Append one assistant message, with the model source the host requires.
 * @param session - the fixture session.
 * @param message - `{ id, text }`, plus the `turn`/`step` the message belongs to.
 * @returns the appended event.
 */
export function appendReply(session, { id, text, turn = 1, step = 1 }) {
  return session.append(
    'assistant/message',
    {
      turn,
      step,
      message: { role: 'assistant', id, content: [{ type: 'text', text }], source: { kind: 'model', provider: 'fixture', model: 'fixture' } },
      stream: [],
    },
    { surfaceOp: 'append' },
  )
}

/**
 * The standard fixture: two complete rounds, seqs 0–3, all on the surface.
 *
 * `0 user(first) · 1 assistant(first reply) · 2 user(second) · 3 assistant(second reply)`
 * @param sessionId - the session identity to create it under.
 * @returns a real `Session`.
 */
export function sessionFixture(sessionId = SESSION_ID) {
  const session = Session.create(sessionId)
  appendUser(session, { id: 'u1', text: FIRST_PROMPT })
  appendReply(session, { id: 'a1', text: FIRST_REPLY, turn: 1 })
  appendUser(session, { id: 'u2', text: SECOND_PROMPT })
  appendReply(session, { id: 'a2', text: SECOND_REPLY, turn: 2, step: 1 })
  return session
}

/**
 * Append the rewind pair this plugin writes — the audit claim and its carrier —
 * through the real `append` API, so the fixture's already-rewound state is one
 * the host itself accepted (spec §5.2–§5.4).
 *
 * Used by the fixtures that need a shadowed earlier round, and by the suite as
 * the pre-flight that the PLANNED pair is acceptable write input: the real
 * append contract validates range membership, `sourceEventSeqs` completeness and
 * the `surfaceOp` shape, and rejects a wrong one loudly.
 * @param session - the fixture session.
 * @param plan - a resolved plan (`rangeStartSeq`, `endSeq`, `shadowedSeqs`).
 * @param options - `{ id }` for the carrier's marker id.
 * @returns `{ audit, carrier }`, the two appended events.
 */
export function appendRewindPair(session, plan, { id = 'dsh-resend-edit-fixture' } = {}) {
  const audit = session.append('compaction/prune', {
    shadowedRange: { start: plan.rangeStartSeq, end: plan.endSeq },
    shadowedSeqs: [...plan.shadowedSeqs],
    shadowedTokenCount: 0,
  })
  const carrier = session.append(
    'user/message',
    { role: 'user', id, content: [{ type: 'text', text: '(a fixture rewind wrote this carrier)' }], source: { kind: 'cordis-host-runner' } },
    { surfaceOp: { op: 'replace', startSeq: plan.rangeStartSeq, endSeq: plan.endSeq }, sourceEventSeqs: [audit.seq, ...plan.shadowedSeqs] },
  )
  return { audit, carrier }
}

/**
 * The standard fixture with the turn/step lifecycle a real agent loop writes
 * around every assistant settlement.
 *
 * The measurement planner (`tokenMeter.measure`) requires a matching
 * `step/start` before any `assistant/message` — it throws otherwise — so the
 * cross-check spec §13.1 #4 asks for cannot run against
 * {@link sessionFixture}. The surface is the same shape
 * (`0 user · 3 assistant · 6 user · 9 assistant`); only log-only lifecycle
 * events sit between them.
 * @param sessionId - the session identity to create it under.
 * @returns a real `Session` the measurement planner can fold.
 */
export function measuredFixture(sessionId = SESSION_ID) {
  const session = Session.create(sessionId)
  appendUser(session, { id: 'u1', text: FIRST_PROMPT })
  session.append('turn/start', { turn: 1 })
  session.append('step/start', { turn: 1, step: 1 })
  appendReply(session, { id: 'a1', text: FIRST_REPLY, turn: 1, step: 1 })
  session.append('step/end', { turn: 1, step: 1 })
  session.append('turn/end', { turn: 1, reason: { kind: 'completed' } })
  appendUser(session, { id: 'u2', text: SECOND_PROMPT })
  session.append('turn/start', { turn: 2 })
  session.append('step/start', { turn: 2, step: 1 })
  appendReply(session, { id: 'a2', text: SECOND_REPLY, turn: 2, step: 1 })
  session.append('step/end', { turn: 2, step: 1 })
  session.append('turn/end', { turn: 2, reason: { kind: 'completed' } })
  return session
}

/**
 * A fixture already rewound once: the second round was shadowed by a carrier,
 * so the surface ends `[0, 1, 5]` with 2 and 3 gone (spliced in place, §16.7).
 * @param sessionId - the session identity.
 * @returns `{ session, auditSeq: 4, carrierSeq: 5, shadowedSeqs: [2, 3] }`.
 */
export function rewoundFixture(sessionId = SESSION_ID) {
  const session = sessionFixture(sessionId)
  const { audit, carrier } = appendRewindPair(session, { rangeStartSeq: 2, endSeq: 3, shadowedSeqs: [2, 3] })
  return { session, auditSeq: audit.seq, carrierSeq: carrier.seq, shadowedSeqs: [2, 3] }
}

/**
 * A fixture whose surface is NUMERICALLY DESCENDING, which is legal (§2.2,
 * §16.7): three rounds, the middle one rewound, so the carrier is spliced in
 * where that range was and the surface becomes `[0, 1, 7, 4, 5]` — 7 is the
 * carrier and 4, 5 follow it with lower seqs.
 * @param sessionId - the session identity.
 * @returns `{ session, carrierSeq: 7 }`.
 */
export function middleRewoundFixture(sessionId = SESSION_ID) {
  const session = Session.create(sessionId)
  appendUser(session, { id: 'u1', text: 'prompt one' })
  appendReply(session, { id: 'a1', text: 'reply one', turn: 1 })
  appendUser(session, { id: 'u2', text: 'prompt two' })
  appendReply(session, { id: 'a2', text: 'reply two', turn: 2 })
  appendUser(session, { id: 'u3', text: 'prompt three' })
  appendReply(session, { id: 'a3', text: 'reply three', turn: 3 })
  const { carrier } = appendRewindPair(session, { rangeStartSeq: 2, endSeq: 3, shadowedSeqs: [2, 3] })
  return { session, carrierSeq: carrier.seq }
}

/**
 * Opt IN to a legacy event view on a fixture session (§13.2 #16).
 *
 * This is the temptation the invariant exists for: a dense-array member named
 * `events`, optionally with a hole punched at a seq. The default fixture has no
 * such member, so nothing in the suite can pass through it by accident; the
 * sparse-safety case opts in and then asserts the plugin never consults it.
 * @param session - the fixture session to attach the view to.
 * @param options - `{ holeAt }`: delete that index, leaving a hole (and a view
 *   whose backward scan steps straight over it).
 * @returns the same session, now carrying the legacy member.
 */
export function withLegacyEventView(session, { holeAt } = {}) {
  const legacy = [...session.snapshotEvents()]
  if (holeAt !== undefined) delete legacy[holeAt]
  Object.defineProperty(session, 'events', { value: legacy, enumerable: false, configurable: true })
  return session
}

/**
 * Every event the session's log holds, through the host's own accessor.
 * @param session - the fixture session.
 * @returns its events, in log order.
 */
export function logOf(session) {
  return session.snapshotEvents()
}

/**
 * How many audit claims (`compaction/prune`) the log carries.
 * @param session - the fixture session.
 * @returns the count, for a zero-write assertion.
 */
export function auditCount(session) {
  return logOf(session).filter((event) => event?.type === 'compaction/prune').length
}

/**
 * A session-shaped view of a real `Session` whose append boundary is
 * intercepted.
 *
 * The real `Session` is still the one that mints seqs and enforces the append
 * contract, so a case built on this view still passes on the host's own rules
 * (spec §13.2 #17). What moves is only the boundary itself: the cases that are
 * about what the write does when an append is refused, when another host writer
 * lands between its two appends, or when what it hands over has to be recorded.
 * @param session - the real fixture session.
 * @param options - `{ append }`: `(real, call) => event`, where `call` is
 *   `{ type, data, options }`. Omitted, every append goes straight through.
 * @returns a session-shaped view (`id`, `seq`, `surface`, `eventAt`,
 *   `snapshotEvents`, `append`) — `seq` and `surface` stay live.
 */
export function sessionView(session, { append } = {}) {
  return {
    get id() {
      return session.id
    },
    get seq() {
      return session.seq
    },
    get surface() {
      return session.surface
    },
    append: (type, data, options) => (append === undefined ? session.append(type, data, options) : append(session, { type, data, options })),
    eventAt: (seq) => session.eventAt(seq),
    snapshotEvents: (...range) => session.snapshotEvents(...range),
  }
}

/**
 * A live session with a host writer racing the rewind (spec §13.1 #9).
 *
 * The plugin plans its pair from `session.seq` and validates it, and between
 * that plan and the carrier append another host plugin can append a log-only
 * event (a title, a checkpoint, a telemetry row — none of them the plugin's
 * business). This wrapper reproduces exactly that: one extra event lands right
 * after the audit claim, so the carrier is no longer adjacent to the claim that
 * prices it.
 *
 * The real `Session` still does every append, so the pair still satisfies the
 * host's own append contract — which is the point: the corruption this models is
 * silent at the append boundary and only visible in the minted seqs.
 * @param session - the real fixture session.
 * @param options - `{ onType, raceType, raceData }`.
 * @returns a session-shaped view whose appends carry the race.
 */
export function withRacingAppend(session, { onType = 'compaction/prune', raceType = 'session/title', raceData = { title: 'a racing host writer' } } = {}) {
  return sessionView(session, {
    append: (real, { type, data, options }) => {
      const event = real.append(type, data, options)
      if (type === onType) real.append(raceType, { ...raceData })
      return event
    },
  })
}

/**
 * A live session whose SECOND append is refused (spec §5.2 step 3, §11).
 *
 * The audit claim has already landed when this fires, and the log cannot be
 * rolled back — so this is the case that owes the user a flush of what was
 * written plus a diagnosable orphan, never a silent half-write.
 * @param session - the real fixture session.
 * @param options - `{ onType, message }`.
 * @returns a session-shaped view that refuses one append type.
 */
export function withRefusingAppend(session, { onType = 'user/message', message = 'the host refused this event' } = {}) {
  return sessionView(session, {
    append: (real, { type, data, options }) => {
      if (type === onType) throw new Error(message)
      return real.append(type, data, options)
    },
  })
}

/**
 * An agent whose turn OPENS after the precondition has already read it idle.
 *
 * Spec §4.4's rule 4 refuses a busy agent, and §9.2 has the user stop a
 * streaming reply themselves. This double models the one case neither covers:
 * the turn starts between that check and the write, so the write boundary has to
 * notice it rather than appending into an open turn.
 * @param options - `{ afterReads }`, how many `status` reads stay idle.
 * @returns an agent-shaped record that opens a turn on the read after that.
 */
export function openingTurnAgent({ afterReads = 1 } = {}) {
  const agent = {
    reads: 0,
    cancels: [],
    idles: 0,
    open: false,
    opened: false,
    get status() {
      agent.reads += 1
      // The turn opens exactly ONCE — that is what makes it a race rather than
      // a streaming reply — and stays closed once it has been cancelled.
      if (!agent.opened && agent.reads > afterReads) {
        agent.opened = true
        agent.open = true
      }
      return agent.open ? 'running' : 'idle'
    },
    cancel(cause) {
      agent.cancels.push(cause)
      agent.open = false
    },
    async whenIdle() {
      agent.idles += 1
      agent.open = false
    },
    followup() {},
  }
  return agent
}

/**
 * The mutable state every double in one composition reads.
 *
 * Mutate it between calls to move the host: a test can make the stored log lag,
 * make the covering read refuse, or make an agent busy without rebuilding the
 * composition.
 * @param options - the initial host state; every field has a production-shaped
 *   default.
 * @returns the state object handed to {@link hostDoubles}.
 */
export function hostState(options = {}) {
  const state = {
    session: options.session ?? sessionFixture(options.sessionId),
    /** `undefined` models a session with no live agent (`agent-unavailable`). */
    agent: 'agent' in options ? options.agent : undefined,
    sessionsThrow: options.sessionsThrow ?? false,
    agentThrows: options.agentThrows ?? false,
    /**
     * How route (2) behaves:
     *  - `'live'` (default) — the complete log of the live session, which is
     *    what `sessionQuery.readSession` returns on this host (§16.1);
     *  - `{ omit: [seq] }` — a read with a hole, i.e. one that does NOT cover
     *    those seqs (the shape §4.2's rule is about);
     *  - `{ copy: [at, from] }` — a read of the SAME LENGTH that holds the
     *    event at `from` twice, so the seq at `at` is simply absent: the shape
     *    an indexed lookup answers with a neighbour;
     *  - `{ error }` — a refusal carrying that typed code.
     */
    covering: options.covering ?? 'live',
    /**
     * The locale a composition's locale service reports (spec §10). The shipped
     * Desktop provides it from its CLIENT half, which is why the write reads it
     * defensively and defaults to English; `'fr'` models a locale this plugin
     * has no text for.
     */
    locale: options.locale ?? 'en',
    /**
     * How route (1) behaves:
     *  - `'mirror'` (default) — the stored log matches the live one;
     *  - `{ mode: 'prefix', count }` — a stored log that lags the live one;
     *  - `{ mode: 'empty' }` — a materialized stored log with no events;
     *  - `{ mode: 'detached-empty' }` — the failure pair of §4.2;
     *  - `{ mode: 'not-found' }` — no stored session at all;
     *  - `{ mode: 'throwing' }` — the stored log cannot be read.
     */
    stored: options.stored ?? 'mirror',
    /** What the doubles were asked to do, for assertions like "zero flushes". */
    calls: {
      coveringReads: 0,
      storedOpens: 0,
      storedAccess: [],
      storedReads: 0,
      storedCloses: 0,
      flushes: 0,
      followups: 0,
      /** The session's own `seq` observed AT each flush (spec §13.1 #9). */
      flushLengths: [],
      /** Flushes in flight right now, and the high-water mark of that count. */
      activeFlushes: 0,
      maxActiveFlushes: 0,
    },
  }

  // The default agent carries the one method the RESEND calls (ticket 05),
  // counted: a suite can then assert that a refusal never reached the agent at
  // all, which is a stronger claim than "no message was visible".
  if (!('agent' in options)) state.agent = { status: 'idle', followup: () => void (state.calls.followups += 1) }

  return state
}

/**
 * Plug the operation's service seams into a context.
 *
 * One place, because two compositions need them: the bare one a shipped module
 * is driven against directly, and the full one the Gateway dispatches through.
 * The last two are the SHIPPED host plugins the write reads through — the
 * projection registry and the token meter — so every case below runs the real
 * shadow-price protocol rather than a stand-in that agrees with itself.
 * @param ctx - the context to register them in.
 * @param state - a {@link hostState} record shared by all five doubles.
 * @returns a promise settling once every service is registered.
 */
export async function plugHostDoubles(ctx, state) {
  const { Sessions, Agents, SessionQuery, SessionPersistence, Locale } = hostDoubles(state)
  for (const service of [Sessions, Agents, SessionQuery, SessionPersistence, Locale]) await ctx.plugin(service)
  await ctx.plugin(SessionProjectionRegistry)
  await ctx.plugin(TokenMeter)
}

/**
 * A bare composition: the operation's services and the two host services the
 * write reads, and nothing else.
 *
 * This is what a shipped module is driven against directly — `lib/write.js` is
 * its own artifact and is imported as such — without loading the plugin half or
 * the Gateway.
 * @param state - a {@link hostState} record (default: the standard fixture).
 * @returns `{ ctx, state }`.
 */
export async function hostContext(state = hostState()) {
  const ctx = new Context()
  await plugHostDoubles(ctx, state)
  return { ctx, state }
}

/**
 * Capture the host log lines a composition writes, for diagnostics assertions.
 * @param ctx - the context whose logger to read.
 * @returns an array the logger appends `{ name, type, args }` records to.
 */
export function captureLogs(ctx) {
  const logs = []
  ctx.logger.exporter({ levels: { default: 2 }, export: (message) => logs.push(message) })
  return logs
}

/** An error shaped like the host's own not-found refusal for a stored session. */
function storedNotFound(sessionId) {
  const error = new Error(`session "${sessionId}" is not stored`)
  error.name = 'SessionPersistenceNotFoundError'
  return error
}

/** An error shaped like a `SessionQueryError`, code and all. */
function queryError(code, message) {
  const error = new Error(message)
  error.name = 'SessionQueryError'
  error.code = code
  return error
}

/**
 * The five services one composition plugs in.
 * @param state - a {@link hostState} record, shared by all five.
 * @returns `{ Sessions, Agents, SessionQuery, SessionPersistence, Locale }`.
 */
export function hostDoubles(state) {
  /** The live session store: `get(id)`, and the flush counter the suite asserts on. */
  class Sessions extends Service {
    constructor(ctx) {
      super(ctx, 'sessions')
    }

    get(id) {
      if (state.sessionsThrow) throw new Error('the session store threw instead of answering')
      return id === state.session.id ? state.session : undefined
    }

    async flush(session) {
      const calls = state.calls
      calls.flushes += 1
      calls.flushLengths.push(session?.seq)
      calls.activeFlushes += 1
      calls.maxActiveFlushes = Math.max(calls.maxActiveFlushes, calls.activeFlushes)
      try {
        // Yield, so an UNserialized second operation really can overlap here:
        // this is what gives the per-session-lock case (spec §4.6) its teeth —
        // deleting the lock makes `maxActiveFlushes` 2, not this test vacuous.
        await new Promise((resolve) => setTimeout(resolve, 2))
      } finally {
        calls.activeFlushes -= 1
      }
    }
  }

  /** The agent registry: `get(id)` → the agent whose `status` is a precondition. */
  class Agents extends Service {
    constructor(ctx) {
      super(ctx, 'agents')
    }

    get(id) {
      if (state.agentThrows) throw new Error('the agent registry threw instead of answering')
      return id === state.session.id ? state.agent : undefined
    }
  }

  /**
   * Route (2): the replay-validated covering read.
   *
   * Its events come from `session.snapshotEvents()`, which is exactly what the
   * shipped host's `readSession` reads (§16.1) — the double mirrors the
   * production generation rather than replacing it with something more
   * convenient.
   *
   * The `session` it answers with is a DECOY on purpose: the shipped route
   * returns the session HEADER (a structured clone), not a live handle, and a
   * plugin that read its surface out of that answer would be reading a snapshot
   * that knows nothing about its own latest appends (spec §4.2's "name trap").
   * The decoy's surface is empty, so any code that fell for it would resolve
   * against nothing and fail loudly here instead of quietly in production.
   */
  class SessionQuery extends Service {
    constructor(ctx) {
      super(ctx, 'sessionQuery')
    }

    async readSession(id) {
      state.calls.coveringReads += 1
      if (id !== state.session.id) throw queryError('SESSION_QUERY_SESSION_NOT_FOUND', `session "${id}" not found`)

      const covering = state.covering
      if (covering !== 'live' && covering.error !== undefined) {
        throw queryError(covering.error, `the covering read refused with ${covering.error}`)
      }

      const events = state.session.snapshotEvents()
      if (covering !== 'live' && Array.isArray(covering.omit)) {
        return { session: { id: state.session.id, surface: { nodes: [] } }, inheritedEventCount: 0, events: events.filter((event) => !covering.omit.includes(event.seq)) }
      }
      if (covering !== 'live' && Array.isArray(covering.copy)) {
        // The same LENGTH, the wrong event at one seq: what an indexed lookup
        // that trusts its own arithmetic answers with.
        const [at, from] = covering.copy
        const copied = [...events]
        copied[at] = copied[from]
        return { session: { id: state.session.id, surface: { nodes: [] } }, inheritedEventCount: 0, events: copied }
      }
      return { session: { id: state.session.id, surface: { nodes: [] } }, inheritedEventCount: 0, events }
    }
  }

  /** Route (1): `fileMaxSeq`, and never write ownership. */
  class SessionPersistence extends Service {
    constructor(ctx) {
      super(ctx, 'sessionPersistence')
    }

    async open(id, access) {
      state.calls.storedOpens += 1
      state.calls.storedAccess.push(access)
      if (access !== 'read') throw new Error('the operation must never take write ownership')
      if (id !== state.session.id) throw storedNotFound(id)
      if (state.stored !== 'mirror' && state.stored.mode === 'not-found') throw storedNotFound(id)

      return {
        read: async (offset = 0, length = Number.MAX_SAFE_INTEGER) => {
          state.calls.storedReads += 1
          const stored = state.stored
          if (stored !== 'mirror' && stored.mode === 'throwing') throw new Error('the stored log could not be read')
          if (stored !== 'mirror' && stored.mode === 'detached-empty') return { eventState: 'detached', events: [] }
          if (stored !== 'mirror' && stored.mode === 'empty') return { eventState: 'shared-frozen', events: [] }
          const events = state.session.snapshotEvents()
          const slice = stored !== 'mirror' && stored.mode === 'prefix' ? events.slice(0, stored.count) : events
          return { eventState: 'shared-frozen', events: slice.slice(offset, offset + length) }
        },
        close: async () => {
          state.calls.storedCloses += 1
        },
      }
    }
  }

  /**
   * The locale service a composition provides (spec §10).
   *
   * The shipped Desktop provides it from the CLIENT half, and the write reads it
   * through the inject-free `ctx.get('locale')` accessor because the host fiber
   * does not inject it — so this service is what makes "the trace text follows
   * the active locale" observable at all, and `state.locale` moves it.
   */
  class Locale extends Service {
    constructor(ctx) {
      super(ctx, 'locale')
    }

    getSnapshot() {
      return { active: state.locale, locales: [{ id: state.locale }], revision: 0 }
    }
  }

  return { Sessions, Agents, SessionQuery, SessionPersistence, Locale }
}
