# Handoff — `dsh-resend` ticket 01 implemented, awaiting confirmation before commits

**Date:** 2026-09-29
**Workspace:** `D:\Code\MJ-Project\dsh-resend-2` (the npm package *is* the repo root)
**Governing skill:** `implement` (invoked by the user as `/implement` on the ticket below). **Not yet finished** — see "Exactly where the work stopped".
**Predecessors:** [`.handoff/2026-09-28/01-dsh-resend-plugin-wayfinder.md`](../2026-09-28/01-dsh-resend-plugin-wayfinder.md) (user working preferences — still accurate) and [`.handoff/2026-09-28/02-dsh-resend-plugin-research-complete.md`](../2026-09-28/02-dsh-resend-plugin-research-complete.md) (research state; its subject — the spec — is now finished and this session implemented against it).

> **Continuation session (2026-09-29, later).** Round 4 ran, and it found that **the host moved
> under the project**: DSH Desktop is now **2.0.16** with `@deepseek-ai/dsh-*` **0.2.0-rc.1**
> (was 2.0.15 / 0.1.7-rc.2). The three `^0.1.7-rc.2` peer ranges no longer admit the running
> runtime, so `dsh-app-boot` **skips the whole bundle silently** and `npm run probe` failed all
> five assertions. With the user's explicit decision (option A) the target was moved to
> `0.2.0-rc.1` — peer ranges, dev-dependency pins (exact, so the suite runs the target, not a
> newer prerelease), lockfile, README table, test constants and the spec's recorded version pins.
> A new test cross-checks the pins against the *installed* app so this drift can never again
> surface only at probe time. **All six acceptance boxes are now verified green on the new host**
> and a seventh commit (`fix: target the 0.2 runtime`) was authorised to precede the original six.
> Details in "Continuation session" at the end of this document; the sections above describe the
> state as it was before round 4.


## What this session did

Implemented [ticket 01 — package skeleton and gates](../../.scratch/dsh-resend-impl/issues/01-package-skeleton-and-gates.md)
against the normative [spec](../../.scratch/dsh-resend-impl/spec.md) (§3, §6.1/§6.4/§6.6, §12 skeleton-only, §13.5).
`dsh-resend` now exists as an installable bundle with both halves and both descriptor
faces, three gates, a committed `lib/`, and CI in the fixed order
`check → build → git diff --exit-code -- lib/ → test`.

**State: implementation complete and verified; three `/code-review` rounds run and their
findings fixed; NOT committed; NOT reported to the user for confirmation yet.**

## Exactly where the work stopped

1. Round 3 (`/code-review`, both axes) reported items requiring code changes. **All are
   fixed** (see "Round 3 fixes" below) and the suite is green again.
2. **A round-4 confirmation review was intended but never launched** — all six review
   subagents are inactive and nothing is running. Start there.
3. Nothing is committed: `main` is an unborn branch, and the whole tree — this handoff
   document and the pre-existing `docs/`, `.scratch/` and `.handoff/` prose included — is
   staged. Only the gitignored `.tmp/` scratch is not. The prose paths stay out of the six
   code commits. The user's explicit confirmation is the gate before any commit (the
   `implement` skill's rule), and the graded commit plan is below.
4. The issue file `01-package-skeleton-and-gates.md` has **not** been updated yet. Its
   `Status:` is still `ready-for-agent`; the ready-to-apply update text (implementation
   record, verification evidence, review results, known limits) is drafted at
   `.tmp/ticket-01-update-draft.md` — **scratch, gitignored, regenerate if missing**.

## Next steps, in order

1. **Run `/code-review` round 4** (Standards + Spec, 2 parallel subagents — the user
   explicitly allowed up to 2 concurrent subagents from now on). Brief them with the
   round-3 delta and ask the single question: does anything still require a code change?
   Round-2/3 briefs in this session are good templates; the round-3 delta was: computed-member
   form added to `MEMBER_FORMS`; the UTF-8-corrupted byte repaired in
   `test/asar-reader.test.mjs`; `tmpDir` from the shared helper; the `walkJavaScript`
   docstring corrected; all gate diagnostics via `relativePath()`; `optionValue()` usage
   errors for `--faces`/`--plugin-root`; `pointer()` fallback now points at `src/`.
2. **Fix anything round 4 requires**, re-running `npm run check`, `npm run build`,
   `git diff --exit-code -- lib/`, `npm test` (currently 81 passed / 2 skipped) each time.
3. **Report to the user in Chinese** and wait for explicit confirmation. Include: what was
   built, the evidence (below), the two recorded spec discrepancies, the honest limits, and
   the two judgement calls left to them ("half" vs the glossary's *Host plugin*/*Client
   plugin*; the byte-identical `spec.md` twins under `.scratch/`).
4. **After confirmation, commit by logical intent** (issue file and the pre-existing
   `docs/`, `.scratch/`, `.handoff/` prose stay out of these commits):
   | # | Paths | Message |
   |---|---|---|
   | 1 | `.gitignore`, `.gitattributes`, `LICENSE` | `chore: add repository conventions for the dsh-resend bundle` |
   | 2 | `package.json`, `package-lock.json`, `cordis.patch.yml`, `README.md`, `src/**` | `feat: add the dsh-resend bundle skeleton (Host and Client plugins, descriptor faces)` |
   | 3 | `scripts/build.mjs`, `lib/**` | `build: generate the committed lib/ artifacts from src/ with esbuild` |
   | 4 | `scripts/check-*.mjs`, `scripts/host-app.mjs`, `scripts/asar.mjs`, `scripts/walk-javascript.mjs`, `scripts/args.mjs`, `scripts/probe-profile.mjs` | `feat: add the three gates and the isolated-profile probe` |
   | 5 | `test/**` | `test: verify the skeleton, the gates, artifact honesty and CI order` |
   | 6 | `.github/workflows/ci.yml` | `ci: run check → build → git diff → test in that order` |
   Unstage the rest first (`git reset`), then `git add <paths>` per commit.
5. **Then update the issue file** per [`docs/agents/issue-tracker.md`](../../docs/agents/issue-tracker.md):
   tick the six acceptance boxes, move `Status:` to a human-review state
   (`ready-for-human`), append the `## Comments` section (implementation record,
   verification evidence, review results, known limits) from the draft above. **Stop there**
   — the `implement` skill ends after that update.

## Evidence already gathered (do not re-derive)

- `npm run check` green: syntax 4 files; descriptor gate OK + `VACUOUS` note against the
  **installed** app validator (`D:\DSH Desktop\resources\app`); host contract
  `OK — SKELETON: 2 present and 1 absent`.
- `npm run build` then `git diff --exit-code -- lib/` → exit 0. Gate teeth were demonstrated:
  a hand edit → exit 1, rebuild → exit 0; a broken file appended to `lib/typert.client.js`
  (third of four in sorted order) → `lib/typert.client.js:17:0 — Unexpected end of file`.
- `npm test` → **81 passed, 2 skipped** in 8 files (the 2 skips are the real-arch
  cross-check, which also ran green once with `DSH_TEST_ASAR` set to a real archive).
- `npm run probe` → five PASS lines: row composed, host booted, **stderr empty** (the
  startup audit warns for every non-active entry, so silence = nothing left PENDING),
  client row in the served `__DSH_BOOT__` graph (65 rows), served bundle self-registers.
- Install-from-tarball: `npm pack` publishes exactly 8 files; a second scratch home with
  that tarball extracted into the profile's `node_modules` boots identically.
- The user's real `desktop` profile was never modified (it contains no `dsh-resend`).

## Round 3 fixes (already applied — for the round-4 brief)

- `MEMBER_FORMS` gained the absent-only **computed member** form (`['events']`) that §12
  names; the ABSENT alarm now covers getter/setter, method, class field, computed member,
  quoted/object-literal key, key at line start, instance access, prototype bolt-on.
- `test/asar-reader.test.mjs` had one invalid UTF-8 byte (`e2 80 3f` instead of the em
  dash) — repaired; a repo-wide scan now reports zero non-UTF-8 text files.
- `test/host-half-boot.test.mjs` imports `tmpDir` from `test/helpers/dsh.mjs`;
  `scripts/walk-javascript.mjs` docstring now says it throws ENOENT (callers guard);
  every gate diagnostic goes through `relativePath()` (forward slashes on all platforms);
  `--faces`/`--plugin-root` without a value exits 2 with a usage line
  (`scripts/args.mjs`); `pointer()`'s fallback points at the face's `src/` file.

## Traps

- **Never rewrite text files through PowerShell.** `Set-Content -Raw` on this zh-CN host
  corrupted a UTF-8 file (the em dash became `e2 80 3f`). Use the `edit`/`write` tools, and
  after any script-driven edit run the repo-wide UTF-8 scan (one-liner in the session log;
  it walks `.mjs/.js/.json/.md/.yml/.yaml/.txt`, skipping `node_modules`, `.git`, `.tmp`).
- **The real DSH Desktop is running this session.** Do not install into the real
  `desktop` profile and do not restart the app. All probing goes through a scratch
  `DSH_HOME` under `.tmp/` (`.tmp/probe-home`, `.tmp/probe-tarball-home`), which is
  gitignored; `scripts/probe-profile.mjs` does this safely on its own.
- **`check` passes `--allow-empty-descriptors` on purpose.** Gate 2 refuses an empty
  descriptor table by default; ticket 01 ships it empty, so the concession is explicit and
  prints `VACUOUS`. Ticket 02 fills the table and must remove the flag.
- **Spec §12's asar offsets are wrong** (`17 + headerSize`; measured `8 + u32LE@4` =
  `align4(16 + headerSize)`). The reader implements the measured formula, documents the
  discrepancy, and `test/asar-reader.test.mjs` pins it. Amending the spec is the user's call.
- `assertEntriesActive()` is not a shipped host API; the ticket's intent is verified through
  the host's real audit (`auditStartupEntries`) plus the loader's entry/fiber state.
- The client half is verified as *composed and served* (probe) and *executed* in a vm
  harness; a browser-observed row is a later ticket's job — say so, do not overclaim.
- `.tmp/` also holds scratch probe runners (`setup-probe.mjs`, `probe-verify.mjs`,
  `setup-probe-packed.mjs`, `probe-boot.mjs`) and the issue-update draft. Regenerable.

## User preferences (from the previous handoff, still binding)

- **Answer in Chinese.** The user reads tickets by name, not by number.
- **Ask before acting** on anything heavy or irreversible; present options one item at a
  time and recommend clearly. They approved: `git init` (already done), package at the repo
  root, and the isolated probe. **Up to 2 parallel subagents are now allowed** — that is the
  only change to the earlier "one agent at a time" rule.
- Never present inference as verified fact; distinguish measured, inferred, and unknown.

## Suggested skills

- **`code-review`** — round 4, both axes in parallel (2 subagents); this is the next action.
- **`implement`** — the governing flow: confirm → commit by intent → update the issue file, then stop.
- **`writing-for-agents`** — if the round-4/issue text needs tightening for a fresh reader.
- **`tech-doc-style-chinese`** — only if any deliverable text ends up in Chinese; the package
  and its README are English by decision (spec ticket 07).
- **`tdd`** — consult before adding tests in the next ticket; this session's seams were
  agreed with the user (package manifest, host-half boot, client bundle protocol, descriptor
  faces, gate CLIs, build reproducibility).

## Definition of done for the next session

Ticket 01 is done when the round-4 review reports nothing requiring a code change, the user
confirms, the six categorized commits land, and the issue file carries the `## Comments`
record and a human-review `Status:` — then stop.

---

## Continuation session — round 4 and the version move

### What round 4 found

Launched as intended (Standards + Spec, 2 parallel subagents), each briefed with the whole staged
tree as the diff (`main` is unborn, so the empty tree is the fixed point) via
`.tmp/review-round4.diff`, and with "does anything still require a code change?" as the single
question.

- **Standards — `VERDICT: no code change required.`** It re-verified every round-3 fix
  (computed-member form correctly directioned at `scripts/check-host-contract.mjs:718`,
  `relativePath()` on every gate diagnostic, `optionValue()` usage errors, `pointer()`'s `src/`
  fallback, shared `tmpDir`/`rootDir`, no UTF-8 corruption) and rejected the baseline smells it
  considered (Middle Man, Speculative Generality, Duplicated Code) as documented seams. One
  cosmetic observation, explicitly "no change required": hand-written `.mjs`/`.js` files end
  without a final newline while `README.md`/`package.json`/`cordis.patch.yml`/CI do.
- **Spec — `VERDICT: 1 item requires a code change.`** Not in the diff's logic, in the pins: the
  installed host had moved to 0.2.0-rc.1, `^0.1.7-rc.2` cannot admit it, and the loader skips the
  bundle silently — so ticket checkbox 1 was unmet. It reproduced the real composition path with
  `loadProfileDirectory('dsh web', <profile>, '@deepseek-ai/dsh/package.json')` and captured
  `skipped: [{"packageName":"dsh-resend", ...}]`. No scope creep found; the other two gates green.

### The decision the user made

Presented as a spec-level decision, not applied unilaterally. The user chose **A**: accept the
0.2 runtime, align peer ranges / dev pins / lockfile / README / test constants / spec pins, and
run it as a **commit 0** (`fix: target the 0.2 runtime`) ahead of the original six.

### What changed

| File | Change |
|---|---|
| `package.json` | three `@deepseek-ai/dsh-*` **peer** ranges → `^0.2.0-rc.1`; the same three plus `@deepseek-ai/dsh-typert-registry` pinned **exactly** as devDependencies (a caret would pull `0.2.0-rc.2`, so the suite would run a different runtime than the app) |
| `package-lock.json` | regenerated by `npm install` (dev tree now 0.2.0-rc.1 throughout) |
| `README.md` | target table: Desktop `2.0.16`, `dsh-*` `0.2.0-rc.1` |
| `test/package-metadata.test.mjs` | `TARGET_DSH_VERSION`/`TARGET_DESKTOP_VERSION` bumped; **new** `describe('the pinned target is the runtime this machine actually runs')` reads `@deepseek-ai/dsh-app-boot/package.json` and the app manifest through the same `resolveHostApp()` the gates use, so a future upgrade fails here instead of only at probe time (`it.skipIf` keeps CI without an app green) |
| `test/gates.test.mjs`, `test/asar-reader.test.mjs` | fixture manifests moved to `0.2.0-rc.1` for coherence |
| `.scratch/dsh-resend-impl/spec.md` | heading pin → `2.0.16` / `0.2.0-rc.1`, plus a **Version move** blockquote recording the move, the silent-skip mechanism, and the honest limit that §16's member-by-member observations were made on 0.1.7-rc.2; §16's own preamble now says so too |

No source file, no gate logic, and no `lib/` artifact changed — the `lib/` diff after `npm run build`
is empty.

### Verification on the new host (this session, re-run end to end)

- `npm run check` → green: syntax 4 files; descriptor gate OK + `VACUOUS`; host contract
  `OK — SKELETON: 2 present and 1 absent` against `0.2.0-rc.1` (so the two PRESENT members and the
  ABSENT resurrection member all still hold on the new host).
- `npm run build` then `git diff --exit-code -- lib/` → exit 0.
- `npm test` → **83 passed, 2 skipped** in 8 files (the 2 skips are the real-archive cross-check).
  The count moved from the 81/2 recorded above because round 3 added tests; that earlier number
  was stale, not a regression.
- `npm run probe` → all five PASS lines: row composed, host booted, **stderr empty**, client row in
  the served `__DSH_BOOT__` graph, served bundle self-registers.
- Repo-wide UTF-8 scan: no invalid text file. No `0.1.7-rc.2` remains outside the one deliberate
  historical mention in a test comment.

### Session-specific trap (new)

**This session's sandbox could not run the gates at all.** Under `workspace-write` confinement,
`scripts/check-syntax.mjs` fails with `spawn EPERM` (esbuild's `transformSync` starts a child
process, and named-pipe/stdio capture is denied), and vitest's forked workers fail the same way —
so both subagents correctly reported "cannot execute the suite here, static read only". The user
later raised the file policy to `danger-full-access` (approval prompts disabled), after which every
command above ran normally. Do not mistake a sandbox EPERM for a code failure.

### Remaining work

The seven commits, then the issue-file update. Both reviews are now satisfied: Standards reports
nothing, and Spec's single item is fixed and verified on the running host.
