# DSH Resend Plugin

A third-party plugin for DSH Desktop that lets a user edit an already-sent message and send it again, and lets a user regenerate an assistant reply. This glossary exists because the platform's vocabulary collides with the vocabulary of the tools this feature is modelled on — most damagingly on the word "branch".

## Platform vocabulary

DSH's own terms. Use these spellings; do not invent synonyms.

**Bundle**:
The installable unit of a DSH plugin: an npm package whose `cordis.patch.yml` inserts rows into the Loader.
_Avoid_: plugin package, extension

**Profile**:
An installed Harness environment at `$DSH_HOME/profiles/<name>`, holding the bundles installed into it. This effort targets the `desktop` profile.
_Avoid_: workspace, environment

**Host plugin** / **Client plugin**:
The two faces of one bundle. The Host plugin is the `main` export and runs as Node ESM; the Client plugin is the `./client` export and runs as browser JavaScript. They are separable — one may be empty.
_Avoid_: server plugin, frontend plugin

**Slot**:
A named hole in the Client render tree that a plugin may register a React component into. A slot must be *declared* before it can be registered into; `ctx.slots.inject` defers registration until its declaration appears.
_Avoid_: extension point, hook, mount point

**Cell**, **occupant**, **shadowing**:
A cell is one addressable position in a slot — the slot itself for `single`, one per `key` for `keyed`, one per `id` for `list`. Registering into an occupied cell at a lower priority *shadows* the existing occupant; for `keyed` and `list` this is the documented way to replace host UI.
_Avoid_: override, monkey-patch

**Owner props**:
The typed values a slot's owner passes down to its occupants — its contract with them. `conversation.chat.node` passes `forkAt`, `openFile`, `openSkill`, `renderMessageImages`.
_Avoid_: props, context

**Chat row**:
One rendered entry in the transcript, despatched by the `conversation.chat.node` slot under a `ChatNodeKind` key (`user`, `assistant-step`, `tool-call`, `turn-tail`, …).
_Avoid_: message component, bubble

**Turn**:
A unit of conversation bounded by a trigger and its closing — the granularity that forking and `turnTail` actions operate on.
_Avoid_: exchange, round

**seq**:
The monotone, contiguous index of an event in a session's log. The only ordering metadata; the only address for cutting history.
_Avoid_: offset, index, cursor

**Session log**:
The append-only, `seq`-numbered event log that is the single source of truth for a session. Committed events are never rewritten, and there is no delete or truncate operation.
_Avoid_: history, database, store

**Transcript**:
What the human sees of the session log, which is deliberately narrower than the log: only events with `surfaceOp === 'append'` are rendered.
This is **append-origin, not the surface fold**, and the difference is the point: a node that a later replacement shadowed keeps `surfaceOp === 'append'` and **keeps rendering**, while the replacement that carries its new content renders **nothing at all**. The model's view loses the node; the human's does not. Hiding a replaced row is therefore the plugin's own job, never a platform behaviour.
_Avoid_: view, conversation, surface

**Composer**:
The message input surface, owning the draft, attachment chips, and the `@`/`/` trigger system.
_Avoid_: input box, editor, textarea

**Trigger**:
The completion mechanism behind `@` file references and `/` skills and commands. Registrable by plugins via `ctx.inputTriggers.registerSource`.
_Avoid_: autocomplete, mention

## This effort's vocabulary

**Edit-and-resend**:
The feature: a user message already in the transcript is reopened for editing, and sending the edit produces a continuation in which that message reads differently.
_Avoid_: edit message, resend, retry

**Regenerate**:
The feature: an assistant reply is produced again from the same preceding user message.
_Avoid_: retry, re-roll, resend

**Branch** — **read this one carefully**:
In DSH, a branch is a *new sibling session* created by `fork({ sessionId, atSeq })`, which copies the inclusive event prefix `0..atSeq` into that child and closes open turns with synthetic enders. It is not a tree node within the current session.
_Avoid_: tree, variant, alternative, forked message — DSH has no session tree beyond fork; a ChatGPT-style in-thread branch with next/previous navigation does not exist here and is explicitly deferred upstream.

**Replay turn**:
The composite mechanism both features reduce to: rewind the model surface **in place**, in the same session, by appending a **pair** of events — the audit claim below, then the carrier — whose `surfaceOp` replaces the target message and everything after it, then `prompt` the replacement text as a fresh append. Regenerate replays with the original text; edit-and-resend replays with the edited text.
**It does not fork.** `sessions.fork` exists but is not this mechanism — forking would move the user to a different session. The fresh append matters twice over: it is what prompts the model, and (because replacement carriers never render) it is also the only thing that makes the new text visible to the user.
That append is the **resend message**, and its id is derived from the carrier's own id. The derivation is not bookkeeping: it is what lets a later reader answer "was this carrier's prompt ever queued?" from the log alone, which is the question the "Send again" affordance turns on.
_Avoid_: rerun, resubmit, branch, fork

**Audit claim**:
The `compaction/prune` event that opens the pair: log-only, never a surface node. It states the shadowed range and the **official** shadow price of the nodes that range removes, which is what **arms** the host's own token fold to subtract them; a replacement with no adjacent claim folds exactly zero, and a claim for a different range makes that fold throw. So the two events are one write: a claim that lands without its carrier is an orphan, and a carrier that lands without a claim is a silent overestimate.
_Avoid_: prune event, tombstone, log entry

**Carrier**:
The `user/message` event that closes the pair: it consumes the claim, splices the replaced range out of the model surface, becomes the new surface tail, and renders **nothing** (it is not append-origin — see Transcript). Its `id` carries the plugin's marker prefix, and its `source.kind` is the host-plugin kind, never a human-turn kind.
_Avoid_: replacement message, stub message, placeholder

**Rewind point**:
The position in the transcript where a replay turn's carrier sits — the seq the model surface now begins at. The plugin renders its own row there, and that row is exactly one of two things: the count notice, or the error row that offers "Send again" when the carrier's prompt never reached the agent. Which one it is follows from the log (the row exists because a carrier does), with the one page-local exception the error row's own retry text creates.
_Avoid_: marker row, notice row, boundary marker
