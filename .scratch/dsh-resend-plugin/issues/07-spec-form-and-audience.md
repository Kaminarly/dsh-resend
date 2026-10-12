# 07 — What form does the spec take, and who implements from it?

Type: grilling
Status: resolved

## Question

Who is the spec for, and what does "done" look like for the document itself?

- **(a) The author, as a build plan.** May assume context they already hold.
- **(b) Another agent, implementing without this conversation.** Then the spec must be
  self-contained: exact API names with file:line evidence, the mechanism stated normatively, each
  extension point's declared-absent fallback, and acceptance criteria.
- **(c) A public design document** for a community-market publication. Adds audience framing,
  non-goals, and a compatibility statement.

Also decide the document's own shape: single file or a directory; whether it carries a decision log;
whether it is written in Chinese or English (the repo's other docs are English; the user works in
Chinese — note `tech-doc-style-chinese` is available).

## Why it matters

Determines how much evidence and how many exact identifiers must be embedded. Option (b) is the
strictest and subsumes (a); (c) adds framing that (b) does not require.

## Recommendation

**(b)**, written in English with the platform identifiers verbatim, as a single `spec.md` beside this
map. It subsumes (a), and (c) can be derived from it later at low cost.

## Answer

**(b) — a self-contained spec from which another agent implements, with no access to this
conversation.** It must therefore carry exact API names with `file:line` evidence, state the
mechanism normatively, give every extension point a declared-absent fallback, and define acceptance
criteria. Deliverable: a single `spec.md` beside the map, in English, with platform identifiers
verbatim.