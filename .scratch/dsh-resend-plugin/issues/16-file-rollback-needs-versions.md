# 16 — File rollback needs versions, but versioning was declined

Type: grilling
Status: resolved

## Question

Two answers are in direct conflict.

**"Product file rollback (git / snapshot)" is IN scope** — the user added it while ruling the rest of
`dsh-retrace`'s orthogonal systems out.

**"Do not record this round as a version, even at the bottom layer" — versioning is OUT.**

These cannot both hold as stated. `dsh-retrace`'s file rollback is *built on* its version records: each
rewind records a version carrying "消息与触碰文件" (the messages **and the files touched**), and the
rollback restores files to that version's recorded state — git-first, with a content-addressed snapshot
as fallback, a dry-run preview, and the rollback itself recorded as a new `restore` version. Without a
per-round record of *which files a turn touched and what they contained beforehand*, there is no target
state to roll back to.

So one of these must give:

- **(a) Record versions after all — but only as the substrate for file rollback.** No timeline UI, no
  version browsing, no message versioning. A minimal record per rewind: the touched files and their
  prior contents. This is B4 reversed, narrowly.
- **(b) Keep versioning out and implement file rollback ad hoc** — snapshot the files touched by a turn
  at the moment of the edit, keyed to that edit. Note this is versioning under another name; it differs
  from (a) mainly in that nothing is addressable or listable afterwards.
- **(c) Drop file rollback.** Restores the original, smaller scope: the two features plus their
  presentation.

Two further consequences to weigh:

- **Cost.** File rollback is the single largest item now in scope. It requires observing which files a
  turn wrote (via `tool/result` or the session log), capturing their prior contents, choosing a storage
  backend (git or content-addressed snapshots), and defining what "dry-run preview" means.
- **Ordering.** File rollback is only meaningful *after* the history rewind works, because the rewind is
  what defines the span of work being undone. It should not be specified ahead of the mechanism.

Also undecided within (a)/(b), if either is chosen: does rollback cover **only files the agent wrote**,
or also files the user changed concurrently? `dsh-retrace`'s README frames it as "仅对话 / 仅产物 /
两者" — a three-way choice presented to the user at rollback time.

## Recommendation

**(a), narrowly scoped.** It is honest about the dependency, keeps the substrate minimal, and preserves
the feature the user explicitly asked for. Write it into the spec as a **second-phase section** that
depends on the rewind mechanism, explicitly excluding timeline UI, version browsing and message
versioning — so "no versioning" survives as a statement about *user-visible* version features.

## Answer

**(a) — record versions, but only as the substrate for file rollback.**

The narrow reversal of B4 is accepted. The spec must therefore distinguish two things that the phrase
"no versioning" was conflating:

- **In:** a minimal record per rewind carrying the files that turn touched **and their prior contents**,
  existing solely so a rollback has a target state. Nothing about it is user-addressable or listable.
- **Out:** the version timeline, version browsing, message versioning, and any user-visible version
  feature.

Also carried into the spec:

- **Phase ordering.** File rollback is specified as a **second-phase** section that depends on the
  history-rewind mechanism, because the rewind is what defines the span of work being undone. It must
  not be specified ahead of the mechanism.
- **Scope of a rollback.** The user chooses per rollback between conversation only, artifacts only, or
  both (`dsh-retrace` presents this three-way choice), with a dry-run preview before it executes.
- **Backend.** git-first with a content-addressed snapshot fallback.
- **Open within this answer:** whether rollback covers only files the agent wrote, or also files changed
  concurrently by the user. The spec should state the rule explicitly rather than inherit it by default.