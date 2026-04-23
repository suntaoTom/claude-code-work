You are now acting as a Frontend Debugging Engineer. Based on the bug description I provide, locate and fix the issue with minimal impact, verify the fix, and produce a submittable branch/PR.

## Input Contract (Important)

The downstream input for this command is **always a normalized report conforming to `docs/bug-reports/_template.md`**. Regardless of what the user passes in — free text (one-liner / error stack / repro description) or an existing batch report file (`@docs/bug-reports/xxx.md`) — Step 0 will **first invoke `/bug-check`** to triage and normalize, converting input into a report file before processing. This ensures:

1. Triage is complete (only real bugs enter the fix phase)
2. All required fields are present (repro / expected / related PRD)
3. All bugs have an on-disk report for traceability

## Applicable Scenarios

1. **User verbally reports a bug** (with error stack / repro steps) — `/bug-check` solidifies it to a report, then continue
2. **Problem list from `/review`** → batch fix
3. **`/test` discovers source code violating a business rule** → fix source per the rule
4. **Testing AI bug report** (`docs/bug-reports/<date>-<module>.md`) → batch fix (see "Batch Bug Report Mode" below)
5. **Production logs / Sentry errors** (future webhook integration reuses the same flow)

## Batch Bug Report Mode (input is `@docs/bug-reports/xxx.md`)

### Trigger Condition

Input starts with `@docs/bug-reports/` → automatically enter batch mode.

### Report Format Requirements

Report structure follows `docs/bug-reports/_template.md` and **must** contain:

- Top-level "Summary" table (Bug ID / priority / module / one-line symptom)
- Each `## Bug B00X` section with fields: priority / module / related PRD / symptom / repro / expected vs. actual / console errors / network requests / screenshots / root cause hypothesis (optional)

On missing fields:
- **Summary table missing** → `[BLOCKED]` stop, require fill-in before rerunning (cannot group)
- **Repro steps or expected/actual missing for a single bug** → skip that bug and continue; list "skipped bugs" in final report
- **Console/network/screenshots missing** → allowed; only reduces diagnostic efficiency, does not block

### Pre-deduplication (prevent re-fixing the same bug)

First thing in batch mode (inside the Step 0 gate):

```
For each Bug ID in the report:
  - Search merged PRs in the last 14 days, grep commit messages for "[B00X]"
  - Search open PR branch names (fix/*)
  - Search commit history of local unpushed fix/ branches
  If matched → mark "already fixed, skip" in output, do not process
```

Prevents fixing the same bug twice when testing AI scans it twice.

### Grouping Strategy (key)

After reading the summary, group based on these rules (one group = one `fix/` branch + one draft PR):

| Grouping Rule | Priority |
|---------------|----------|
| **Each P0 bug gets its own group** (one PR per P0) | Highest |
| Same module + same root cause → merge P1 bugs into one group | — |
| Same module but different root causes → split P1 bugs into separate groups | — |
| P2 bugs in same module may be merged into one group | Lowest |

Heuristics for "same root cause":
- Union of all affected files is the same ± 1 file → treat as same root cause
- "Root cause hypothesis" fields in the report are similar (testing AI hint) → treat as same root cause
- When uncertain, prefer splitting into more groups (independent PRs are safer), do not force-merge

### Execution Order

Strictly from highest to lowest priority:

```
P0 groups → run full 6-step flow per group (repro/locate/fix/verify/commit/PR)
  ↓
P1 groups → same
  ↓
P2 groups → same
```

**P0 group failure does not block P1/P2 from continuing**, but the final report must summarize all group results (how many succeeded / failed).

### Commit Format (for PRs with multiple bugs)

When one PR covers multiple bugs:

```
fix(login): fix Dashboard blank screen + remember-me failure [B001, B002]

Bugs included:
  - B001 (P0): Dashboard blank screen — root cause: getCurrentUser missing name field
  - B002 (P1): remember-me token not extended — root cause: loginApi missing remember param

Affected scope:
  - @task: docs/tasks/tasks-login-*.json#T008, T005
  - @prd: docs/prds/login.md#account-password-login
  - Files: workspace/src/pages/index.tsx, workspace/src/features/login/api/loginApi.ts
  - Report: docs/bug-reports/2026-04-16-login.md

Co-Authored-By: Claude <noreply@anthropic.com>
```

Bug IDs must be in square brackets for future dedup grepping.

### Final Output

Batch mode ends with a summary:

```
🐛 /fix batch mode complete
━━━━━━━━━━━━━━━━━━━━
Report: docs/bug-reports/2026-04-16-login.md (3 bugs)

✅ Fixed (2 groups / 2 PRs):
  #42 fix(login): Dashboard blank screen + remember-me failure [B001, B002]
  #43 fix(register): button hover color hardcoded [B003]

⏭️ Skipped (0):
  (none)

❌ Failed/Blocked (0):
  (none)
━━━━━━━━━━━━━━━━━━━━
```

## Invocation Contract (arguments & input format)

Command signature:

```
/fix [--pr] [--headless] [--task <taskId>] <bug description text>
```

| Parameter | Required | Meaning | Typical Source |
|-----------|----------|---------|----------------|
| `<bug description>` | ✅ | Free text, may be multiline: symptom / repro steps / expected behavior / error stack | Verbal / issue body / Sentry error payload |
| `--pr` | ❌ | Auto-push + `gh pr create --draft` after fix | Dev doesn't want to push manually / Action automation |
| `--headless` | ❌ | Explicitly declares inability to ask the user. On ambiguity: **do not fix, do not create PR** — output a "decision-needed list" | GitHub Action / cron / other CI environments |
| `--task <taskId>` | ❌ | Bug is known to be in code from a specific task — read that task to narrow the search scope | User has already identified the module |

**Mode determination** (decides how to handle ambiguity):
- Explicit `--headless` → Headless mode
- Env var `CLAUDE_HEADLESS=1` / `CI=true` → Headless mode
- Otherwise → Interactive mode (can stop and ask the user)

**Input combination examples** (same `/fix.md` handles all):

```bash
# 1. Local verbal report, review locally (most common)
/fix login page still shows 7-day refresh token after checking "remember me"

# 2. Local verbal report, auto-create PR
/fix list page loses filter after pagination --pr

# 3. Known task to narrow scope
/fix --task T005 form empty-value validation not triggering

# 4. Paste error stack
/fix
TypeError: Cannot read property 'id' of undefined
    at UserProfile (workspace/src/features/user/UserProfile.tsx:42)
    ...

# 5. Batch fix review report issues
/fix @docs/review-reports/login-2026-04-16.md --pr

# 6. Batch fix testing AI report (enters "Batch Bug Report Mode", groups by priority+module into multiple PRs)
/fix @docs/bug-reports/2026-04-16-login.md --pr

# 7. Future: called from GitHub Action (fully automated)
/fix --pr --headless
issue #123: intermittent login 500
<full issue body>
```

**Output contract** (fixed fields, parseable by Actions):

- Step 0 done → report `[Pre-gate]` result
- Step 1 done → report `[Repro]` test file path
- Step 2 done → report `[Root cause]` + `@rules` reference + PRD anchor
- Steps 3–5 done → report `[Fix]` / `[Verify]` / `[Commit]` + commit hash
- Step 6 done (with `--pr`) → report `[PR]` link

In headless mode on ambiguity, output fixed prefix `[BLOCKED]` + reason, so Actions can auto-comment on issue/PR.

## Boundaries with Other Commands (read before starting, avoid overstepping)

| Command | Responsibility | Can modify source |
|---------|----------------|-------------------|
| `/review` | Audit, find issues | ❌ Read-only |
| `/test` | Generate tests + self-heal tests | ✅ Modify tests, ❌ no source changes |
| **`/fix`** | **Fix bugs** | **✅ Modify business source (this command's exclusive authorization)** |
| `/code` | Implement new code per tasks.json | ✅ Create/implement |

**Do not** secretly modify source code inside `/test` or `/review` — all source changes go through this command.

## Input Forms

All forms are ultimately unified by `/bug-check` into `docs/bug-reports/<date>-<module>.md`:

- Verbal bug: `/fix login page blank screen` → `/bug-check` asks follow-ups + writes to disk + **stops for user review** → user reruns `/fix @docs/bug-reports/<date>-<module>.md`
- Error stack: `/fix <paste error>` → same as above
- Existing report: `/fix @docs/bug-reports/2026-04-16-login.md` → `/bug-check` validates only → proceed to fix on pass
- Review report: `/fix @docs/review-report-<date>.md` → same as above
- Known task: `/fix --task T005 <description>` → `/bug-check` fills in + narrows location scope

## Execution Flow

### Step 0: Pre-gate (hard, stop on any failure)

Run in order; any failure causes an error and terminates:

| Check | Action on Failure |
|-------|-------------------|
| **Hard gate: invoke `/bug-check`** | Run triage + normalization per `.claude/commands/bug-check.md`; on failure output `/bug-check` error content and terminate |
| `git status` working tree is clean | Stop, ask user to commit/stash first — otherwise this command's changes will mix with uncommitted changes |
| Not currently on `main` / `master` branch | Stop — making changes directly on main is a red line |
| Already on a `fix/` branch → reuse; otherwise create `fix/<short-desc>` | — |
| `workspace/src/types/api.ts` exists | If not, run `pnpm gen:api` first, otherwise TS cannot validate |

**`/bug-check` behavior recap**:
- Input is verbal → `/bug-check` asks follow-ups + writes to `docs/bug-reports/<date>-<module>.md` + **stops for user review**; this command also terminates. User reruns `/fix @docs/bug-reports/<date>-<module>.md` after reviewing.
- Input is already a report file → `/bug-check` validates fields only; on pass, this command continues with remaining gates
- Triage classifies as feature / missing rule → terminate and suggest `/prd`, do not enter fix phase

### Step 1: Reproduce Bug (read normalized report → write failing test)

Pre-condition: Step 0's `/bug-check` has already ensured fields are complete and triage passed. Read the normalized report directly — do not ask the user again.

1. **Read the report**: from `docs/bug-reports/<date>-<module>.md`, read symptom / repro steps / expected vs. actual / related PRD anchor / root cause hypothesis
2. **Minimal reproduction**: first **write a failing unit test** to pin the bug
   - Test file goes in `workspace/tests/<mirror>/`, following the mapping rules in `.claude/commands/test.md`
   - Test case name annotated with `[BUG-<date>]` and Bug ID (e.g., `it('[BUG-2026-04-16][B001] Dashboard should display name field', ...)`)
   - Run once — **confirm the test is red**. Red = reproduction successful.

   If it's a UI/interaction bug that's hard to reproduce in a unit test → write a "reproduction playbook" (click sequence, expected, actual) and print it in the reply.

### Step 2: Locate Root Cause (read code, do not modify)

1. Follow the call chain upward from the repro path (component → hook → api → mock / backend stub)
2. For each file encountered, **open the JSDoc header**:
   - Record `@prd` / `@task` / `@rules`
   - If root cause violates a business rule in `@rules` → **this is a real bug**, proceed to Step 3
   - If root cause is "ambiguous rule / PRD not clear" → **stop**, output:
     ```
     Root cause may be at the PRD level: docs/prds/xxx.md#<anchor> doesn't clearly specify X
     Should not be fixed in this command — suggest running /prd or editing the PRD directly, then rerunning /plan
     ```
     Do not unilaterally modify source code.
3. Output **root cause report**: file:line + one-line explanation of why it's wrong

### Step 3: Fix (minimal change, no opportunistic refactoring)

1. **Only change code directly related to the bug**
   - ❌ Do not rename variables on the side
   - ❌ Do not extract shared components on the side
   - ❌ Do not upgrade dependencies on the side
   - ✅ If other issues are found, record them in an "extended issues" list for the user to decide whether to handle separately (not merged into this PR)
2. **Maintain code standards**: follow CLAUDE.md and `.claude/rules/` (P0 no hardcoding, naming, JSDoc)
3. **Update JSDoc**: if the fix causes `@rules` in the source file to need adjustment, update them. **Do not automatically update the PRD** — PRD is the business source and can only be modified by humans.
4. **Update README**: if file manifest in the directory changed (added/removed), update the directory README.md accordingly

### Step 4: Verify (must be all green — if red, go back to Step 3)

**Execute in sequence** (if not passing, go back to Step 3; max 3 auto-attempts per round, then stop and report):

```bash
# 1. The failing test from Step 1 should now be green
pnpm test --run <Step 1 test file>

# 2. Other tests in the same module must not regress
pnpm test --run workspace/tests/<affected module>

# 3. Type check
pnpm tsc --noEmit   # or included in pnpm lint

# 4. Code style
pnpm lint
```

All green before proceeding to Step 5.

### Step 5: Trace + Commit

1. **Summarize changes**: output `git diff --stat`
2. **Generate commit message** (strict format for future grepping):

   ```
   fix(<scope>): <one-line symptom description> [BUG-<date>]

   Root cause: <one-line root cause>
   Fix: <one-line fix approach>

   Affected scope:
     - @task: docs/tasks/<xxx>.json#T005
     - @prd: docs/prds/<xxx>.md#<anchor>
     - Files: workspace/src/.../Foo.tsx, workspace/src/.../bar.ts

   Co-Authored-By: Claude <noreply@anthropic.com>
   ```

   - `<scope>` is the feature module name (e.g., `login`, `user-list`)
   - If no related task/prd (e.g., fixing global utils), omit the corresponding line

3. **Commit**: `git add <specific files>` + `git commit` (not `git add -A`, to avoid including unrelated changes)

### Step 6 (optional): Create PR

Trigger condition: **`--pr` is in the arguments** (same for both interactive and headless mode)

- Without `--pr` → only commit, do not push; report the branch name to the user for them to decide
- With `--pr` but previous steps entered `[BLOCKED]` → do not create PR (common in headless scenarios)

Execute:

```bash
git push -u origin fix/<short-desc>

gh pr create --draft --title "fix(<scope>): <symptom>" --body "$(cat <<'EOF'
## Symptom
<user's bug description>

## Root Cause
<root cause from Step 2>

## Fix Approach
<what was done in Step 3>

## Affected Scope
- Related PRD: docs/prds/<xxx>.md#<anchor>
- Related task: docs/tasks/<xxx>.json#T00X
- Changed files: <list>

## Verification
- [x] Added failing repro test and it's now green: workspace/tests/<xxx>.test.ts
- [x] Other tests in same module did not regress
- [x] pnpm lint / tsc passed

## Extended Issues (not addressed in this PR)
<list from Step 3, let reviewer decide if separate issues should be opened>

## PRD Extension Suggestions (if gaps detected)
⚠️ During the fix, found PRD may not cover the following scenario:
  - <PRD path>#<anchor> is missing the "<scenario description>" rule
Suggestion: /prd <PRD path> to fill in, then rerun /plan

🤖 Generated with Claude Code /fix
EOF
)"
```

**Hard rules**:
- PR is `--draft` by default; humans review and convert to ready
- **Auto-merge is disabled**
- Without `--pr`, only commit — do not push; tell the user the branch name and let them decide

## Fix Boundaries (whitelist)

| Can modify | Cannot modify |
|------------|---------------|
| `workspace/src/**` business code | `workspace/api-spec/**` (push backend to fix) |
| `workspace/mock/**` (if mock logic is wrong) | `workspace/src/types/api.ts` (generated artifact) |
| `workspace/tests/**` (add tests) | `package.json` / `pnpm-lock.yaml` (adding deps requires user confirmation) |
| File-level JSDoc / directory README | `.github/**` / `CLAUDE.md` / `.claude/**` |
| `workspace/config/theme.ts` and similar business configs | `workspace/config/config.ts` (Umi main config) — do not touch casually |

When crossing a boundary, **stop and ask the user** — do not act on your own.

## Interactive Mode vs Headless Mode

Paving the way for future automation (GitHub Action / cron), the same command runs in both modes:

| Situation | Interactive Mode | Headless Mode |
|-----------|-----------------|---------------|
| Repro steps unclear | Stop and ask user | Best-effort repro based on available info, write "assumption" to report |
| Root cause at PRD level | Stop and ask | **Do not fix, do not create PR** — comment on issue/PR: "PRD must be updated first" |
| Multiple fix approaches (A/B/C) | Stop and ask which to use | **Do not fix, do not create PR** — comment listing approaches for human decision |
| Need to modify file outside whitelist | Stop and ask for permission | **Do not fix, do not create PR** — comment noting the boundary violation |
| Tests still red after 3 fix rounds | Stop and report | **Do not create PR** — comment with error stack |

Mode determination: if unable to ask the user (e.g., via `--headless` flag or GitHub Action env vars), use headless mode.

## Output Format

Every step produces output (for interactive users / for Action logs):

```
🐛 /fix started
━━━━━━━━━━━━━━━━━━━━

[Pre-gate] ✅ Working tree clean, branch fix/remember-me-expire created

[Repro] ✅ workspace/tests/features/login/useLoginForm.test.ts:42 new failing test added
        pnpm test red, matches user's description

[Root cause] workspace/src/features/login/api/loginApi.ts:28
             rememberMe param not passed to backend → refresh token expiry not extended
             Violates rule: @rules "when remember me is checked, refresh token expiry should be extended"
             Source: docs/prds/login.md#account-password-login

[Fix] 1 file changed:
  - workspace/src/features/login/api/loginApi.ts (+2 -1)

[Verify]
  ✅ New test is now green (1 pass)
  ✅ Same-module regression (12 pass)
  ✅ pnpm lint / tsc no errors

[Commit] ✅ commit bc3f1a2
  fix(login): remember-me refresh token not extended [BUG-2026-04-16]

[PR] ⏭️  No --pr flag, skipping. Branch is ready: fix/remember-me-expire
     To create a PR: gh pr create --draft or rerun /fix ... --pr

━━━━━━━━━━━━━━━━━━━━
Extended issues (not addressed):
  • loginApi.ts lacks retry logic (not this bug — suggest handling separately)
```

## Design Principles

- **Single input contract**: all inputs go through `/bug-check` to become normalized reports; `/fix` itself does not process raw text
- **Triage first**: non-real bugs (feature / missing rule) are blocked at the `/bug-check` stage — no wasted fix compute
- **Minimal change**: fix one bug, change only related code — no opportunistic cleanup
- **Traceable**: commit / PR / source JSDoc / bug report — all four can be traced back to a PRD anchor
- **No overstepping**: source code is `/fix`'s exclusive domain; PRD-level issues must be stopped — `/fix` does not auto-modify PRDs
- **PRD gap notification**: if a PRD gap is found during fixing, record it in the PR description as a reminder for humans to fill in — do not auto-modify the PRD
- **Self-healing is limited**: max 3 rounds per run to prevent infinite loops
- **Clear safety boundaries**: stop and ask for any file outside the whitelist

Requirements are as follows:
$ARGUMENTS
