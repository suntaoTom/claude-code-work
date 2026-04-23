You are now a task list completeness checker. Run hard-gate checks against the input tasks.json and output whether it can proceed to the `/code` coding phase.

## Applicable Scenarios

1. **User wants to verify if a task list is executable** — quick health check after `/plan` generates it
2. **Mandatory pre-check for `/code`** — `/code` must run this command first; if it fails, coding is refused

## Input

- `@docs/tasks/tasks-xxx.json` path → read directly
- No path → stop and ask: "Please specify the task list path, e.g.: /plan-check @docs/tasks/tasks-login-2026-04-15.json"

## Checks (run in order, no short-circuit — report all issues at once)

### Check 1: Valid Structure (P0)

Validate JSON structure:
- Required fields: `moduleCode` / `prdRef` / `tasks[]` / `createdAt`
- Each item in `tasks[]` must contain: `taskId` / `type` / `name` / `filePath` / `description` / `prdRef` / `businessRules` / `acceptanceCriteria` / `status`
- `type` must be one of: `precondition | gen-api | api | mock | constants | utils | locale | config | model | store | hook | wrapper | component | page`
- `status` must be one of: `pending | in-progress | done | blocked`
- `taskId` must be globally unique (no duplicates)

> Note: Infrastructure types (`precondition` / `constants` / `utils` / `locale` / `config` / `model` / `wrapper`) are for i18n, route guards, access config, constants, utilities, runtime config, and other non-api/component/page engineering files.

**On failure**: list the violating taskIds and specific field issues

### Check 2: Valid Dependency Graph (P0)

Perform graph-theory validation on `tasks[].dependencies` arrays:
- **No dangling references**: every taskId in dependencies must actually exist
- **No circular dependencies**: detect cycles via topological sort
- **No forward references**: dependent taskId must appear before the current taskId in array order

**On failure**: list problematic edges (A → B does not exist / A → B → A cycle / A appears before B but depends on B)

### Check 3: PRD Traceability Chain Complete (P0)

- Top-level `prdRef` must point to an existing PRD file
- Each task's `prdRef` must be in `<PRD path>#<anchor>` format
- The anchor must actually exist as an **H2 / H3 / H4 heading** (`## / ### / ####`) in the corresponding PRD — sections like "Data Contract", "Mock Data Conventions", "API Proposals" are naturally nested H3/H4 under feature points and may be referenced directly
- `businessRules` array must be non-empty, and each entry must not contain `[TBD]` / `TODO` / `???`
  - **Exemption**: tasks with `type ∈ { precondition, gen-api, config, locale }` may have empty `businessRules` (these are tooling/infrastructure tasks with no business semantics to extract)
- Each `businessRules` entry should be traceable to the original wording in the PRD's "Business Rules" section (minor punctuation differences allowed)

**On failure**: list the broken taskId + issue type (anchor not found / rules empty / rules contain placeholders)

### Check 4: API Contract Aligned (P0)

For tasks with `type: "api"` or `type: "mock"`:
- The operationId implied by the task description or filePath must appear in one of these three places:
  1. `workspace/api-spec/openapi.json`
  2. `workspace/api-spec/openapi.local.json`
  3. The PRD's "API Proposals" section stub (`operationId: xxx`)
- If absent from all three, further check whether a `type: "precondition"` task in tasks[] promises to add the stub — if one exists, **downgrade to warning** (non-blocking), noting that the precondition must execute first
- For `type: "api"` tasks with an explicit operationId in `description`, query directly
- If the task doesn't mention an operationId explicitly, issue a soft prompt (non-blocking) asking the user to confirm

**On failure**: list tasks using undefined operationIds (not found in all three places and no precondition fallback)

### Check 5: Task Order Meets Standards (P1)

Validate ordering by `task.type`:
- If any `api` / `mock` tasks exist in tasks[], there must be a `type: "gen-api"` task that comes before all `api`/`mock` tasks
- `page` tasks must depend on at least one `component` task (via dependencies)
  - **Exemption**: placeholder/system pages (e.g., `403`/`404`/`500`) may only depend on `locale` tasks, since they are assembled directly from UI framework built-in components with no business components to extract
  - Criteria: task name or filePath contains `403` / `404` / `500`, or description explicitly says "no business logic" / "display only"
- `api` tasks cannot depend on `component` / `page` (wrong direction)
- `store` / `hook` cannot depend on `page`

**On failure**: list task pairs with ordering violations

### Check 6: PRD Not Drifted (P1)

- Compare `tasks.json.createdAt` with the PRD file's last modification time (`git log -1 --format=%cI <PRD path>` or file mtime)
- If PRD was modified after tasks.json, issue a **warning** (non-blocking, but strongly recommended)
- Run a full `/prd-check` pass on the PRD (5 checks); if the PRD currently fails, this check **blocks** (meaning the PRD was broken after the fact)

**On failure (blocking)**: prompt "PRD is currently failing /prd-check — please fix the PRD before rerunning /plan"
**On warning (non-blocking)**: prompt "PRD was modified at <time> — recommend rerunning /plan to sync latest rules; if no rule changes were made, you may continue"

## Supplementary Checks (soft prompts, non-blocking)

- Whether all tasks still have `status: "pending"` (or if `in-progress` tasks exist, suggesting a previous interruption)
- Whether any `blocked` tasks exist (list them, prompt user to decide whether to continue)
- Whether `acceptanceCriteria` is empty (empty does not block, but test generation will lack reference)

## Output Format

### On Pass

```
✅ Task list completeness check passed: docs/tasks/tasks-login-2026-04-15.json

Passed checks (6/6):
  ✅ Valid structure (12 tasks)
  ✅ Dependency graph: no cycles, no dangling refs, no forward references
  ✅ PRD traceability chain complete (12 prdRef anchors all exist)
  ✅ API contract aligned (5 operationIds all in openapi.json)
  ✅ Task order meets standards (gen-api at top, dependency directions correct)
  ✅ PRD not drifted

⚠️ Soft prompts:
  • 3 tasks have status "blocked" (T008/T009/T010) — please decide whether to skip

Next step: /code @docs/tasks/tasks-login-2026-04-15.json
```

### On Failure

```
❌ Task list completeness check failed: docs/tasks/tasks-login-2026-04-15.json

Blocking issues (all must be fixed before running /code):

[Check 2: Valid Dependency Graph]  2 issues
  T005 depends on T099, but T099 does not exist
  T003 → T007 → T003 is a circular dependency

[Check 3: PRD Traceability]  1 issue
  T004 prdRef points to docs/prds/login.md#phone-login,
    but login.md has no such H2 heading (existing anchors: #account-password-login / #user-registration / #route-guard-and-role-permissions / #logout)

[Check 6: PRD Not Drifted]  Blocking
  docs/prds/login.md currently fails /prd-check (3 [TBD] items)

Passed (3/6):
  ✅ Valid structure
  ✅ API contract aligned
  ✅ Task order meets standards

Fix options:
  (A) PRD has changed → fix the PRD, rerun /prd-check to confirm green, then rerun /plan to re-split tasks
  (B) tasks.json was manually corrupted → run /plan to regenerate (do not manually edit tasks.json)
  (C) A task should be removed → delete the object and remove its id from all dependencies arrays

After fixing, rerun: /plan-check @docs/tasks/tasks-login-2026-04-15.json
```

## Design Principles

- **Read-only checks, do not modify tasks.json**
- **No short-circuit**: run all 6 checks, then report
- **PRD drift is the focal point**: this is where production incidents happen — PRD changed but tasks not re-split leads to wrong code
- **Reuse `/prd-check`**: Check 6 runs the PRD-side gate directly without re-implementing the logic
- **When tasks.json is corrupted, prefer suggesting a `/plan` rerun** rather than manual edits (manual edits easily introduce new inconsistencies)

Requirements are as follows:
$ARGUMENTS
