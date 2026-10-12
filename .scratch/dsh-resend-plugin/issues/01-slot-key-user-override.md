# 01 — Can the shipped `user` chat-node renderer be overridden, and is the original reachable?

Type: research
Status: closed — out of scope (superseded, phase 2)

**CLOSED — out of scope (superseded, phase 2).** The chosen edit-box design
([What form does the edit box take?](10-edit-box-form.md), option **(a3)**) renders a **new node kind
beneath** the message and never contends for the shipped `user` key, so this research gates nothing the
spec must state. The phase-2 ambition it belonged to — "the user bubble itself becomes the editor" — is
recorded on the map as a future possibility only.

One by-product is worth keeping, because it closes off half of the phase-2 route: node-level
`visibility: 'hidden'` **cannot** hide another Definition's row
(`@deepseek-ai/dsh-client-ui-conversation/lib/client.js:2505` mandates it only for a Definition's *own*
node), so a phase-2 renderer could not hide the shipped bubble — it would have to re-author it. See
[Is a replaced message actually deleted…](15-delete-vs-hide.md), §"A first-class alternative that does
not work".

The question below is retained as a record of what was set aside, not as pending work.

---

# 01 (original)

Type: research
Status: open (not started) — **historical; superseded above**

## Question

`conversation.chat.node` is a `keyed` slot whose key **is** the node kind, and the shipped
`key: 'user'` occupant is `UserMessageNodeView`. Decide the conflict policy for a plugin that
registers `key: 'user'`:

1. Does a second registration for an occupied key **replace** it, throw, or land in the same cell at
   a different priority (and if so, which wins)? The slot registry's `register()` validates
   occupancy per (key, priority) pair — determine what that means for a plugin that does not want to
   pick a fight over priority.
2. Is the **original** `UserMessageNodeView` component reachable from a plugin at all, so an override
   could delegate to it instead of reimplementing the user bubble? It is not exported through the
   frozen platform module table, so establish whether any other route exists.
3. What breaks when an occupant is replaced — does the shipped UI lose anything the plugin cannot
   reproduce (`UserStyleBubble`'s `actions` render prop, `referenceLabels`, `skillNames`,
   `renderMessageImages`)?

This decides whether "the message itself becomes the editor" is achievable, or whether the edit
affordance must live in a **new node kind rendered beneath** the message (which is what
`dsh-retrace` does). It is the phase-2 route; phase 1 does not depend on it.

## Why it matters

Load-bearing for the edit-box form decision. If the shipped renderer cannot be safely overridden,
"the user message temporarily becomes an edit box" is not implementable as described and the spec
must say so.

## Sources

`@deepseek-ai/dsh-client-ui-slots/lib/index.js` (the `register` occupancy rules and
`entriesOfSlot` shadowing projection); `@deepseek-ai/dsh-client-ui-chat/lib/client.js` around the
`conversation.chat.node` declaration and `UserMessageNodeView`; the slot catalogue in
`@deepseek-ai/dsh-cordis-client-runner/lib/client.js` (its `replaceRisk: "shows-shipped-ui"` note
for this key).

## Resolution

**Closed — out of scope.** Superseded by the (a3) edit-box decision; the phase-2 route it scoped is now
recorded as a future possibility, with the `visibility` finding above as its one usable by-product.