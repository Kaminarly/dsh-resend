# 06 — Why does this spec exist, given `dsh-retrace`?

Type: grilling
Status: resolved

## Question

`dsh-retrace@0.4.32` already implements both target features, in place, in the same session — plus
recall, a version timeline, artifact rollback, git integration and LLM summaries. It is installed in
this profile and is currently **`disabled: true`** (`~\.dsh\profiles\desktop\cordis.patch.yml:213-214`).

Why is it disabled, and what does that imply for this spec? Candidates:

- **Too heavy / opaque** — ~18k lines; it writes to the session log; ~80% of it is orthogonal to the
  two features. → The spec is a *minimal* implementation, ~1 700 lines of core, with every risk
  surfaced.
- **It broke the app** — its README records that a hard `dsh-log-contract` dependency once failed
  when a host release removed an export, taking down the whole plugin tree so the app would not
  start. → The spec's core requirement becomes *fail-soft isolation*.
- **It conflicts** with another installed plugin. → The spec must state its coexistence rules.
- **Never really tried.** → The honest answer may be "adopt retrace instead of writing a spec", and
  this map should be closed.

## Why it matters

This is the load-bearing question. Every other ticket's answer changes depending on whether the spec
is a minimal rewrite, a hardened alternative, or unnecessary. The research tickets are unaffected —
they establish facts needed under any answer.

## Recommendation

Ask directly and record the answer verbatim. If the reason is "too heavy", the spec's spine is a
minimal-scope statement plus the hazard checklist. Reserve the possibility that the right outcome is
"don't build it" — the map should be able to conclude that.

## Answer

**The decision stands; the recorded reason is corrected.**

**Decision.** `dsh-retrace`'s user-message edit-and-resend does not work for this user on DSH Desktop
v2.0.15, so rather than wait for the plugin author, they will hand-build a new plugin with AI
assistance. Upstream confirms there is nothing to wait for: `v0.4.32` is the newest tag, `main` equals
it, and **no fix exists**.

**Correction — this is important.** The reason was originally recorded as "not adapted to v2.0.15",
implying an API incompatibility. Research ticket 14 **falsified that hypothesis**: the plugin's own
shipped telemetry shows every Definition and every slot registration succeeding on `DSHDesktop/2.0.15`.
Ticket 14 also found that at the time of investigation the plugin was **not mounted at all** (absent from
`dsh.profile.bundles`), that it had earlier been **double-mounted**, and that **no edit operation was
ever invoked** in any log. So the mechanism behind the user's observation is **not established** — it
must be re-established by observation via ticket 17 before the spec can state it.

**Consequence for the spec's spine.** Compatibility with the shipped version remains the driving
requirement — the user wants a plugin that works where retrace does not. But the spec's **item #1 cannot
yet be written**, because its premise is unconfirmed. The honest framing for the spec is that
user-message editing must work on DSH Desktop v2.0.15 / `@deepseek-ai/dsh-*` `0.1.7-rc.2`, with the
specific hazard to avoid identified by ticket 17.

**Also note:** the target version must be stated in the spec, and the `dsh-retrace` peer range
(`^0.1.0-rc.6`) is *not* the explanation for the failure.