# 04 — What is the full `inputActions` API?

Type: research
Status: resolved — report:
[`../research/inputactions-api.md`](../research/inputactions-api.md)

## Question

`inputActions` is a **standard prop** delivered to slot occupants, exposing at least
`setDraft(text)`. Enumerate the complete surface, because the spec depends on it for two things:

1. **Echoing an edited message into the composer** (the rich-reference path, since the composer is a
   per-session singleton and cannot be instantiated twice — so `@` file references, `/` skills and
   commands are only available there).
2. **The regenerate fidelity gap** — regenerate re-sends prompt **text only**, so image-bearing
   prompts degrade. Establish whether attachments can be carried through a draft
   (`pruneAttachments` is known to exist at `@deepseek-ai/dsh-client-ui-conversation/lib/client.js:17225`),
   and whether a draft's attachment set plus text can be submitted as one unit.

Also determine: `submit`/`send` semantics, how `setDraft` interacts with the trigger system
(`slash/input-insert-reference`, `ctx.inputTriggers.registerSource`), and whether a plugin can
insert a **structured reference chip** (not just plain text) into the draft.

## Why it matters

Decides whether the spec's "edit with full reference support" route is real, and whether the image
degradation can be lifted or must be documented as a limitation.

## Sources

`…\dsh-client-ui-conversation\lib\client.js` (`ixInputHub`, `SessionInputShell`, `setDraft`,
`pruneAttachments`), its `README.zh.md`, the slot catalogue's `standardProps` entries, and
`dsh-retrace\lib\client.js:1223` (its use of `setDraft`).

Report to: `.scratch/dsh-resend-plugin/research/inputactions-api.md`

## Answer

**The complete surface is seven verbs**, enumerated only in the object literal at
`@deepseek-ai/dsh-client-ui-conversation/lib/client.js:13461-13484` — the shipped package has **no
`.d.ts`** for the type and the slot catalogue publishes only the name `"inputActions: InputActions"`
(`dsh-cordis-client-runner/lib/client.js:2381`):

`captureInsertion()` · `insertText(text, span)` · `setDraft(text)` · `addAttachments(ids)` ·
`removeAttachment(id)` · `pruneAttachments(ids)` · `submit()`

The spec must guard each verb's presence at runtime (`typeof … === 'function'`), as `dsh-retrace`
does at `lib/client.js:1223-1225`; there is no type to import.

1. **Rich-reference echo is NOT available — this downgrades ticket 10's (a3) justification.** The
   chip path exists (`shell.insertReference`, `:13747-13753`; chip node `:13322-13328`) and is reached
   by the four scoped verbs registered at `:14198-14203`, but the **only emitter** is
   `InputTriggerController.execute` (`dsh-client-ui-input-trigger/lib/client.js:711-728`), which fires
   on a **user's accept action** from a source registered via `ctx.inputTriggers.registerSource`
   (`:904-919`). Text smuggling is blocked: `insertText` and `setDraft` both strip the reference
   placeholder range (`:13309`, `:13237`, regex at `:13121`). So the composer echo is **text-only**;
   `@`/`/`/code references are dropped and must be re-created by hand, or the fidelity claim is
   withdrawn.
2. **Attachments can ride a draft, but only by id.** A draft is text + an ordered id list, submitted
   as one unit (`session.prompt([...attachments, ...text])`, `:3455-3463`), with an attachment-only
   path for a blank draft (`:13626-13634`). The **only** way an id enters the browser draft registry is
   `createDrafts(sessionId, File[])` (`:3477-3494` — the only two writes to `draftAttachments`); there
   is **no** API promoting a sent message's attachment into a draft. Sent attachments are read-only via
   `ctx.uiConversation.imageUrl(sessionId, attachment)` (`:3108`). Lifting the image degradation is
   therefore a **re-upload** chain (imageUrl → fetch → Blob → File → `createDrafts` →
   `addAttachments` → `submit`), and `createDrafts` is a **service** method, not on the
   `inputActions` face. Keep the degradation (ticket 11) and record this as the upgrade path with its
   caveats: new attachment identity, bytes round-tripped, non-images need a finished background upload.
3. **`submit()` takes no arguments and always requests the `"queue"` mode** (`this.submit("queue")`,
   `:13481-13483`). The plugin cannot steer, and cannot submit a text argument — the draft is the only
   payload. Delivery position is derived from run state by the Session.
4. **`setDraft` has no phase guard; the other mutators do.** `insertText` / `addAttachments` /
   `removeAttachment` refuse while `adjudicating` or `submitting`; `setDraft` writes unconditionally
   (`:13550-13552`). The spec must gate `setDraft` on the phase the plugin reads from `useInput`,
   otherwise a composer echo can clobber an in-flight draft.
5. **`insertText` needs a fresh span.** `captureInsertion()` returns `{start, end, draftRev}`, and
   `rev` is bumped on **every publish** (`:13531`), so any draft change between capture and insert
   refuses the edit. An async producer must capture at click time and retain its result on refusal
   (`README.zh.md:137`).
6. **A plugin-initiated send inherits optimistic-send semantics** (`README.zh.md:77`, `:79`): the draft
   is cleared in the same transaction, the echo is retired once, and a failed send is restored. This
   interacts with ticket 15's finding — the rewind is invisible to the user while the send is not — so
   the spec must define what "rewind succeeded, send failed" shows.