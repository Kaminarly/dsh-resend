# What is the full `inputActions` API?

Ticket: [What is the full `inputActions` API?](../issues/04-inputactions-api.md)
Scope: read-only. Nothing was installed, run, or modified. No session was opened.

Tags: **verified-from-code** (I read the line in the shipped artifact), **from-docs** (a normative
comment or README in a primary source says it), **inferred** (my reasoning, not directly attested).

Paths:

- `PKG` = `D:\DSH Desktop\resources\app\node_modules\@deepseek-ai\`
- `PLG` = `C:\Users\Administrator\.dsh\profiles\desktop\node_modules\dsh-retrace\`

---

## Verdict

`inputActions` has **exactly seven verbs**, all of them plain-text or attachment-id operations:

`captureInsertion` · `insertText` · `setDraft` · `addAttachments` · `removeAttachment` ·
`pruneAttachments` · `submit`

Three answers to the ticket's questions, in order of how much they change the design:

1. **A plugin cannot insert a structured reference chip into the draft programmatically.** The chip
   path exists in the platform but only the input-trigger controller drives it, and only on a user's
   accept action; the sanitizer in `insertText`/`setDraft` strips the chip placeholder characters, so
   identity cannot be smuggled through as text either. **The "edit in the composer" route is
   text-only** — the rich `@` / `/` / code quoting that ticket 10 chose it for is *not* carried by the
   echo; the user re-creates it by hand.
2. **Attachments can ride a draft and are submitted with the text as one unit** — but only by id, and
   the only way an id enters the browser draft registry is `createDrafts(sessionId, File[])`. There
   is **no API to promote a session's existing attachment into a draft attachment**, so lifting the
   regenerate image degradation means re-uploading bytes (fetch the authorized image URL → `Blob` →
   `File` → `createDrafts`), and `createDrafts` is not on the `inputActions` face.
3. **`submit()` takes no arguments and always requests the `"queue"` delivery mode.** A plugin cannot
   choose the mode. The Session still derives the actual position from run state, so an idle send
   lands in the transcript — but the plugin cannot ask for `steer`, and it cannot submit a text
   argument: the draft is the only payload.

## 1. The complete surface

There is **no shipped declaration** of the type — the only complete enumeration is the object literal.
It is annotated in place as "The public provide-channel action face (one stable identity per
session)" (**from-docs**), at `PKG\dsh-client-ui-conversation\lib\client.js:13461-13484`
(**verified-from-code**):

| Verb | Signature | Behaviour |
|---|---|---|
| `captureInsertion()` | `() => {start, end, draftRev}` | Current selection as a detect-coordinate span, or a collapsed span at the document end; plus the draft revision. `:13462-13465` |
| `insertText(text, span)` | returns `boolean` | Insert one undoable **plain-text** edit at `span`. `false` when phase is `adjudicating`/`submitting`/disposed, or when `span.draftRev !== rev`. `:13466-13470` |
| `setDraft(text)` | `void` | Replace the whole draft. **No phase guard, no revision check.** `:13471-13473` |
| `addAttachments(ids)` | `boolean` | Append ordered attachment ids; `false` while admission is locked. `:13474` |
| `removeAttachment(id)` | `boolean` | Remove one id; `false` if absent or locked. `:13475-13477` |
| `pruneAttachments(ids)` | `void` | Keep only the ids that still resolve in the attachment registry. `:13478-13480` |
| `submit()` | `void` | Submit the draft. **Hard-codes `this.submit("queue")`.** `:13481-13483` |

**Delivery.** The prop is the shell's own action object, not a wrapper: the composer entry passes
`inputActions: shell.actions` (`PKG\dsh-client-ui-conversation\lib\client.js:18064`, with
`props: ["inputActions"]` at `:18053`). The slot catalogue lists it as a standard prop —
`"inputActions: InputActions"` (`PKG\dsh-cordis-client-runner\lib\client.js:2381`) — but the catalogue
publishes only the **type name**, not the body; no `.d.ts` for `InputActions` ships in the package
(`glob **/*.d.ts` → nothing). `README.zh.md:137` documents only the two insertion verbs.

**Therefore the spec must require a runtime shape guard, not a type import** (`from-docs` reasoning):
the plugin is plain JavaScript, the interface is unversioned and undeclared, and it is not in the
frozen module table. `dsh-retrace` does exactly this — `typeof inputActions.setDraft === 'function'`
before every call (`PLG\lib\client.js:1223-1225`) (**verified-from-code**). Copy that pattern for all
seven verbs and degrade visibly when one is missing.

## 2. `setDraft(text)` — the verb the chosen design depends on

Implementation at `PKG\dsh-client-ui-conversation\lib\client.js:13550-13552` delegating to
`:13236-13252` (**verified-from-code**). Six behaviours matter:

1. **It is not a plain setter.** The text is "placeholder-sanitized" — reference placeholder
   characters `[\uE100-\uE11D\uFFFC]` are stripped (`REFERENCE_PLACEHOLDER_RE`, `:13121`, applied
   `:13237`). Anything a plugin tries to round-trip through a chip placeholder is lost.
2. **Newlines become paragraphs**, and empty lines become empty paragraphs — so a multi-line edited
   message keeps its shape.
3. **The caret lands at the end**, always.
4. **It is a no-op when the text already matches** the draft's clipboard projection
   (`if (clean === this.projection.clipboardText) return;`, `:13238`) — so pressing "edit in the
   composer" twice does not disturb the user's caret.
5. **It is merged into the undo history** rather than being its own undoable step, so Ctrl/Cmd-Z does
   not undo a programmatic seed as a unit.
6. **It has no phase guard.** `insertText`, `addAttachments` and `removeAttachment` all refuse while
   the draft is `adjudicating` or `submitting`; `setDraft` writes unconditionally. A plugin that
   echoes a message while the user is mid-submit can clobber the in-flight draft's text. **The spec
   must gate this itself** — check the phase the plugin reads from `useInput` before calling.

## 3. `captureInsertion` + `insertText` — and the revision trap

`captureInsertion()` returns `{start, end, draftRev}`. `insertText` refuses when
`span.draftRev !== this.rev` (`:13468`; the same guard appears on the shell's internal
`insertReference`/`consumeToken`/`insertText` at `:13727`, `:13750`, `:13763`, `:13784`), and
`rev` is bumped on **every publish** (`this.rev += 1` at `:13531`) — i.e. **any** draft change, not
only a user edit.

Consequence (**from-docs**, `README.zh.md:137`): *"an async consumer is responsible for retaining the
result after an insert is rejected and waiting for the user to act."* If our plugin ever inserts text
asynchronously (a generated rewrite, a summarised prompt), it must capture the span at the moment of
the click, not before an `await`, and must handle refusal by keeping the result available rather than
dropping it. The shipped voice-input package is the worked example
(`PKG\dsh-experimental-client-ui-voice-input\lib\client.js:5022`, `:5041`, `:5144`).

## 4. Structured reference chips — not available programmatically

This is the finding that costs the design something, so the evidence is laid out in full.

**The chip path exists.** `SessionInputShell.insertReference` (`:13747-13753`) builds a real chip node
via `$createReferenceChipNode(ref)` (`:13322-13328`, `:12536`), and the shared shell registers four
scoped-command verbs for it (`:14198-14203`):

```js
actx.on("slash/input-begin-command", (req) => shell.beginCommand(req.claim, req.span) ? true : void 0),
actx.on("slash/input-insert-reference", (req) => shell.insertReference(req.reference, req.span) ? true : void 0),
actx.on("slash/input-consume-token", (req) => shell.consumeToken(req.guard) ? true : void 0),
actx.on("slash/input-insert-text", (req) => shell.insertText(req.text, req.span, req.continue === true) ? true : void 0)
```

**But the only emitter is the trigger controller, and only on acceptance.**
`InputTriggerController.execute(outcome, span)` is the sole call site of those events
(`PKG\dsh-client-ui-input-trigger\lib\client.js:711-728`) — `actx.bail(actx, "slash/input-insert-reference", {reference: outcome.insert, span})`.
`outcome` is produced when a completion is accepted, and the sanctioned way to contribute one is a
registered source: `ctx.inputTriggers.registerSource(src)`
(`PKG\dsh-client-ui-input-trigger\lib\client.js:904-919`), whose `(trigger, name)` must be unique.

**And text smuggling is blocked.** `insertAsyncText` — the implementation behind
`InputActions.insertText` — strips the placeholder range before inserting
(`:13307-13313`, `REFERENCE_PLACEHOLDER_RE` at `:13121`), and `setDraft` strips it too
(`:13237`). So a plugin cannot reconstruct a chip by inserting its serialized identity as text.

**Conclusion (inferred, from the four pieces above).** The plugin's only *sanctioned* routes into the
draft are plain text (`setDraft`, `insertText`), attachment ids, and a trigger source that requires a
user accept action. **Programmatic full-fidelity echo does not exist.** Reaching the scoped
`slash/input-insert-reference` event directly would mean dispatching another package's private
session-scoped verb — an unsanctioned coupling the spec should explicitly forbid, because the event
names are not in the frozen module table and the `actx` subject is not handed to plugins.

**Consequence for the decided design.** Ticket 10's option **(a3)** justified the "edit in the
composer" button as *"for rich `@`/`/`/code quoting via `inputActions.setDraft`"*. That justification
is **not supportable as written**: `setDraft` carries text only, so the echo silently drops every file
reference, skill reference and command claim the original message had. The spec must either:
state plainly that the composer echo is text-only and the user re-creates references by hand; or drop
the reference-fidelity claim. What it must **not** do is promise "edit in the composer, with your
`@`/`/` references intact".

## 5. Attachments, and the regenerate fidelity gap

**A draft is text plus an ordered attachment-id list, and it is submitted as one unit** —
`session.prompt(content, mode, signal, requestId)` is called with
`[...serializedAttachments, ...text]` (`:3455-3463`), and there is a separate **attachment-only send
path** for a blank draft with attachments (`:13626-13634`). So yes: text and attachments ride
together.

**But the id must already be in the browser draft registry**, and there is exactly one entry point:

```js
createDrafts(sessionId, files) {
  return files.map((file) => { /* image → browserDraftAttachment(file); other → upload */ })
}
```
— `:3477-3494` (**verified-from-code**), whose doc says "Create runtime-only draft attachments".
`addAttachments(ids)` only appends ids (`:13554-13560`), and `pruneAttachments` keeps "only ids that
still resolve in **the browser attachment registry**" (`:13587-13590`).

**There is no API to promote a sent message's attachment into a draft attachment.** Session
attachments are read-only to plugins through
`ctx.uiConversation.imageUrl(sessionId, attachment)` (`:3108`; documented at `README.zh.md:12`), which
resolves a session-authorized browser URL — the same call the chat uses for
`ownerProps.loadImage` (`:15616`).

**So the image degradation can be lifted, but only by re-uploading.** The chain would be: read the
sent message's attachment list → `ctx.uiConversation.imageUrl(...)` → `fetch` → `Blob` →
`new File([blob], name, {type})` → `conversation.createDrafts(sessionId, [file])` →
`inputActions.addAttachments(ids)` → `inputActions.submit()`. Three caveats the spec must state:

- `createDrafts` is a method on the **conversation service**, not on the `inputActions` face, so this
  route depends on service reachability and is a separate compatibility risk from the seven verbs.
- It round-trips the bytes and allocates a **new** session attachment, so the regenerated turn
  references a copy, not the original.
- It is **image-only in practice** — `createDrafts` splits on browser MIME (`isImageMediaType`), and
  non-images become file drafts that must finish a background upload before
  `serializeDraftAttachments` will succeed (`:3616-3635` throws while any upload is not `ready`).

Given ticket 11 already decided to **surface** the degradation rather than hide it, the honest spec
position is: keep the degradation, and record this re-upload chain as the documented upgrade path
with its three caveats — not as a solved problem.

## 6. `submit()` semantics

`InputActions.submit()` → `this.submit("queue")` (`:13481-13483`) → `submit(mode = "queue")`
(`:13625`) → adjudication, then the submission transaction, then the default sink
(`deps.defaultSink` → `this.sink(session, …)`, wired at `:14181`), which calls
`session.prompt(content, mode, signal, submission.requestId)` (`:3463`). Documented behaviour
(**from-docs**, `README.zh.md:77`, `:79`):

- **Optimistic**: the draft, occurrence table and undo history are cleared in the same transaction,
  and the send runs as a detached attempt, so the user can keep typing immediately.
- **Delivery position is derived, not chosen**: the Session combines the requested mode with the
  current run state — idle send lands in the transcript, busy + queue goes to the QueueDock, busy +
  steer goes to pending-steering. Our plugin always requests `queue`, so **it can never steer**.
- **The echo is retired once**, correlated by the submission's `requestId`/`rpcId`; concurrent
  failures are restored in submission order before the user's later edits, and the composer restores
  a failed draft only when it is empty or still holds the previous auto-restored content.
- **Command submissions (a leading `/`) take a different path** with a frozen `submitting` phase and
  shared attachment credentials.
- A **whitespace-only draft with no attachments cannot be sent** (`README.zh.md:73`).

**Consequence for the spec.** If the plugin's own send is the one that follows a rewind, it inherits
optimistic-send semantics: the new user row appears locally before the host admits it, and can be
rolled back on failure. That interacts with the hiding requirement — a rolled-back send leaves a
rewind that already happened. The spec must define what "rewind succeeded but send failed" shows,
because ticket 15 established that the rewind is invisible to the user while the send is not.

## Confidence

**High** for §1, §2, §4, §6: read directly from the implementation, cross-checked against the
package's own `README.zh.md` where it documents the behaviour.

**High** for §5's "no promotion API": `draftAttachments` is written in exactly two places (`:3481`,
`:3490`), both inside `createDrafts`.

**Medium** for the claim that direct dispatch of `slash/input-insert-reference` is *unsanctioned*
rather than merely *undocumented* — I established that plugins are not handed the binding `actx` and
that the event is package-private by construction, but I did not audit whether any shipped plugin
reaches a binding-scoped context and dispatches another package's verb.

**Not established.** I did not verify the interface at runtime; no plugin was mounted and no composer
was driven. Nothing here is an observation of rendered behaviour.
