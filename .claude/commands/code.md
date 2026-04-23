You are now acting as a Frontend Engineer. Implement code in the order specified by the given tasks.json.

## Input

- `@docs/tasks/tasks-xxx.json` path → read directly
- No path → stop and ask: "Please specify the task list path, e.g.: /code @docs/tasks/tasks-login-2026-04-15.json"
- With `--from T005` → start from the specified taskId (for resuming after interruption)
- With `--only T003,T004` → execute only the specified tasks (for partial rework)

## Step 0: Pre-validation (fail = stop immediately)

Execute in order; any failure causes an error and terminates:

1. **Hard gate: invoke `/plan-check`** — run all 6 checks defined in `.claude/commands/plan-check.md` against the input tasks.json (structure / dependencies / traceability / API contract / order / PRD drift). On failure, output the `/plan-check` error content and terminate — do not enter the coding phase.

   `/plan-check` already includes the PRD completeness check from `/prd-check` — no need to call it again.

2. **OpenAPI types generated** — check that `workspace/src/types/api.ts` exists; if not, run `pnpm gen:api` first.
3. **No unresolved blocked tasks** — if any task in tasks[] has `status: "blocked"` (e.g., "Push backend to update OpenAPI: ..."), stop, list them, and ask the user whether to skip them.

## Step 0.5: Checkpoint Recovery (handle interrupted state from last session)

Scan the status distribution in tasks.json and decide the starting point based on these rules:

| Status | Action |
|--------|--------|
| `done` | Skip automatically, do not redo |
| `pending` | Follow dependency order; start from the first pending task whose upstream is all `done` |
| `in-progress` | **Stop and ask the user** (see below) |

### When an `in-progress` task is encountered

This means the last session was interrupted mid-task; the file state is unknown. Continuing blindly is risky (file may be partially written, or only the status was changed without touching code). Do not make assumptions — report the current state to the user:

1. Read `task.filePath`, confirm whether the file exists
2. If it exists, read the file's JSDoc header to check whether `@rules` covers all entries in `businessRules`
3. Give a one-line summary: "T00X file [exists/does not exist], JSDoc [complete / missing N rules / absent]"
4. Present 4 options and wait for the user's choice:
   - **(A) Continue completing** — file partially written; complete remaining logic based on current state without overwriting existing code
   - **(B) Delete and redo** — existing code diverges from rules or is low quality; delete the file and rewrite from scratch
   - **(C) Mark as done** — actually finished already, just didn't update the status in time; set to done and skip
   - **(D) Revert to pending** — code was never really touched; reset to pending and rerun normally

For multiple `in-progress` tasks, ask one at a time — do not batch-process (each file's state may differ).

### When `--from` / `--only` parameters are provided

Skip this step and jump directly to the specified starting point (the user has already specified the breakpoint, no need to ask).

## Execution Principles

### Follow dependency order — do not skip steps

- Strictly respect the `dependencies` field; downstream tasks cannot run until all upstream tasks have `status: "done"`
- Parallelism opportunity: tasks at the same dependency level (no dependency between them) can be done consecutively in one session, but update status after each one completes

### Task State Machine

```
pending → in-progress → done
                      ↘ blocked (stop and ask user when a problem arises)
```

- Starting a task: set `status` to `in-progress`
- Completed: set to `done`
- Stuck (user decision needed): set to `blocked`, add a `blockReason` field to the task object, stop and ask the user

### Implementation Steps for Each Task

For each task in tasks[], follow these steps:

1. **Read the prdRef source** — navigate to `task.prdRef` (e.g., `docs/prds/login.md#account-password-login`) to find the full content under that PRD H2 heading and understand the business context
2. **Confirm the file path** — `task.filePath`; create the directory if it doesn't exist
3. **Write code**, strictly following:
   - **File-header JSDoc** including `@description` / `@module` / `@dependencies` / `@prd` / `@task` / `@rules` / `@design` (see `.claude/rules/file-docs.md`)
   - **`@prd` field**: use `task.prdRef` verbatim
   - **`@task` field**: `docs/tasks/<filename>.json#<taskId>`
   - **`@rules` field**: list each entry in `task.businessRules` in order — **copy verbatim, do not paraphrase**
   - **`@design` field**: use `task.designRef` verbatim (Figma link / local file path); omit if no design spec
   - **API types**: `import type { paths } from '@/types/api'` — **never hand-write** request/response types
   - **No hardcoding**: text via i18n, colors/sizes via theme tokens, enums via constants (see `.claude/rules/no-hardcode.md`)
   - **Components**: functional + exported Props interface + business logic extracted to hooks
4. **Maintain directory README.md** — add one row to the file manifest in the README.md of the file's directory (see `.claude/rules/file-docs.md`)
5. **Update status after completion** — change the corresponding task's `status` in tasks.json from `in-progress` to `done`
6. **Brief report** — output one line: "✅ T00X complete: <file path>"

### When to Stop and Ask (do not act unilaterally)

- PRD rules are ambiguous or contradictory
- OpenAPI is missing a required field (per plan.md rules, add a blocked task to push backend)
- Upstream dependencies are not yet complete
- Need to choose a technical approach (multiple valid implementations exist)
- Need to create a file not listed in tasks[] (means `/plan` missed splitting a task — go back and update the plan)

### When NOT to Stop

- Style details (colors/spacing) — choose reasonably per theme tokens
- Internal naming — follow coding conventions
- JSDoc wording — follow the template

## After All Tasks Complete

1. Summarize the list of files produced in this session
2. Suggest next steps:
   ```
   ✅ All tasks for module login complete (N total)

   Suggested next steps:
     1. Start dev to validate: pnpm dev
     2. Generate tests: /test workspace/src/features/login/
     3. Code review: /review workspace/src/features/login/
   ```
3. If any `blocked` tasks remain in the task list, list them as a reminder

## Input

$ARGUMENTS
