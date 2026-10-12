# 10 — What form does the edit box take?

Type: grilling
Status: resolved

## Question

The original request was "the user message temporarily becomes an edit box, allowing text editing,
quoting code, quoting files, and invoking skills". Platform facts constrain the options:

- The composer is a **per-session singleton** (`InputHub.shells`, a cached WeakMap, "the resident
  per-session facade"), so VSCode Copilot's trick — mounting a second real `ChatInputPart` inside the
  transcript row — **is not available**.
- `inputActions` is a **standard slot prop** exposing `setDraft(text)`, so a chat-node component can
  reach the real composer without resolving the singleton.
- The rich capabilities (`@` file chips, `/` skill and command triggers, code quoting) live only in
  that composer.
- Overriding the shipped `key: 'user'` renderer to make the bubble itself the editor is a
  `replaceRisk: "shadows-shipped-ui"` move pending research ticket **01**.

Options:

- **(a) Inline editor in a new node kind beneath the message.** What `dsh-retrace` does. Honours
  "in place"; rich references must be reimplemented or delegated.
- **(b) Echo the text into the real composer** and let the user edit there with full reference
  support. Cheap and fully capable, but leaves the message position.
- **(c) Both** — inline editor for quick plain-text edits, plus an "edit in composer" affordance for
  rich quoting.
- **(d) Override `key:'user'`** so the bubble itself becomes the editor. Closest to the original
  wording; depends on ticket 01 and on reproducing the shipped bubble.

## Why it matters

Determines the spec's centre of gravity and how much of the reference/skill machinery must be
specified.

## Recommendation

**(c), with (a) first.** It satisfies "in place" for the common case while routing the genuinely rich
case to the composer that already owns it. Keep (d) as a documented phase-2 possibility conditioned on
ticket 01, and do not specify it as the primary route.

## Answer

**(a3) — an inline editor plus an "edit in the composer" button.**

The inline editor sits in a new node kind beneath the message (option (a)) and handles plain-text
rewriting in place. A button on it hands the message content to the real composer for the rich cases —
`@` file references, `/` skills and commands, code quoting — because those capabilities exist only in
the composer and the composer is a per-session singleton that cannot be duplicated
(`InputHub.shells`, a cached WeakMap, "the resident per-session facade"). The composer is reached
through the `inputActions` standard slot prop, which exposes `setDraft(text)`.

The spec must therefore cover **two editing surfaces** and the handoff between them, and must not
attempt to reimplement the trigger system inside the inline editor.

Option (d) — overriding the shipped `key: 'user'` renderer so the bubble itself becomes the editor —
remains a documented phase-2 possibility conditioned on research ticket 01, not the primary route.