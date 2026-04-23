You are now acting as a Software Architect. Based on the requirements I provide, complete the following:

## Step 0: Locate the PRD (mandatory)

Task lists must be traceable to PRD anchors — otherwise the downstream `/test` command cannot generate tests from business rules.

1. **Determine input type**:
   - Input is `@docs/prds/xxx.md` path → read directly
   - Input is a text description → **stop and ask the user**:
     - Does a corresponding PRD already exist? What is the path?
     - If not, **recommend running `/prd <requirement description>` to generate a PRD draft first**, then fill in all `[TBD]` items before coming back to run `/plan`
   - Do not hardcode requirements without a PRD — the resulting `acceptanceCriteria` would be AI guesses, and tests would be wrong too

2. **Extract all H2 feature headings from the PRD** as anchor sources for subsequent `prdRef` fields:
   ```
   Anchors extracted from docs/prds/user-list.md:
     - #search-form
     - #data-table
     - #bulk-delete
   ```

3. **If the PRD lacks a "Business Rules" section**, prompt the user to fill it in before continuing (no rules = no reliable test generation)

4. **Hard gate: invoke `/prd-check` for completeness validation (stop if it fails)**

   **Must** run `/prd-check` against the input PRD (defined in `.claude/commands/prd-check.md`) and get the result:

   - **Pass** → proceed to the "Analysis Steps"
   - **Fail** → output the `/prd-check` error content, **terminate**, do not proceed to task breakdown

   **How to run**: as an embedded step in `/plan`, run all 5 checks defined in `prd-check.md` in full — same rules, output format, and blocking decisions. **Do not re-implement the check logic, and do not downgrade or skip it.**

   **Why it's a separate command**:
   - Users can independently run `/prd-check @docs/prds/xxx.md` during PRD review for real-time self-checking without needing to run `/plan`
   - `/plan` and `/prd-check` share the same check rules, avoiding divergence

## Analysis Steps

1. **Understand requirements**: read the full PRD, list all feature points + business rules
2. **Extract data contract + consistency validation**: read the PRD's "Data Contract" section, get operationId list + status + error code mappings

   For each operationId, validate by status:

   | PRD Status | Validation Logic | On Failure |
   |------------|------------------|------------|
   | ✅ Already exists | Must appear in `workspace/api-spec/openapi.json` | Stop, remind user to fetch latest openapi.json or confirm with backend |
   | 🆕 Pending backend implementation | Must have a stub in PRD's "API Proposals" section, **or** already in `workspace/api-spec/openapi.local.json` | Stop, remind user to add stub / review / add to local.json |
   | No status annotation | PRD is non-conformant | Stop, require user to fill in the status column |

   - If PRD is completely missing the data contract → **stop and remind the user to run `/prd` to add it** — do not fabricate API definitions
   - Once a 🆕 API stub is reviewed, there are two paths:
     - **Recommended**: merge into the main `openapi.json` (via backend or frontend PR)
     - **Fallback**: put into `workspace/api-spec/openapi.local.json` for local frontend dev; remove after backend implements it

3. **Identify reuse opportunities**: check the component library noted in CLAUDE.md, mark what can be reused
4. **Break down tasks**: decompose requirements into specific development tasks, **each task must reference a PRD anchor**

### Mandatory Task Order

For each feature point, produce tasks in this order (clear dependency chain, supports parallel/batched work):

```
gen:api    (run once to ensure types are up to date)  ← command: pnpm gen:api, output: workspace/src/types/api.ts
   ↓
api        (request functions)                         ← types imported from workspace/src/types/api.ts, never hand-written
   ↓
mock       (fake data)                                 ← types from workspace/src/types/api.ts, for use before backend is ready
   ↓
store/hook (state management)                          ← sourced from: PRD business rules
   ↓
component  (UI components)                             ← sourced from: PRD business rules
   ↓
page       (page assembly)                             ← sourced from: PRD interaction flows
```

### Hard Rules for API Types

- ❌ **Never hand-write** request/response types — always import from `@/types/api`
- ❌ **Never produce `api-type` style hand-written type files** in tasks — OpenAPI-generated types are sufficient
- ✅ For api function input/output types, use `import type { paths } from '@/types/api'` directly
- ✅ If OpenAPI is missing a field, add a `blocked` task at the top of the task list: "Push backend to update OpenAPI: <what's missing>" — do not hardcode workarounds

## Output Format

Output the task list in JSON format:

```json
{
  "moduleName": "Module Name",
  "moduleCode": "user-list",
  "prdRef": "docs/prds/user-list.md",
  "summary": "One-sentence summary of what this module does",
  "createdAt": "generation date",
  "tasks": [
    {
      "taskId": "T001",
      "type": "precondition | gen-api | api | mock | constants | utils | locale | config | model | store | hook | wrapper | component | page",
      "name": "file name",
      "filePath": "workspace/src/features/xxx/xxx.ts",
      "description": "Specific implementation requirements",
      "prdRef": "docs/prds/user-list.md#search-form",
      "designRef": "Figma: <URL>#Frame-SearchForm or docs/designs/search-form.png or empty",
      "businessRules": [
        "When phone number format is invalid, show real-time error and disable the search button",
        "When all fields are empty, disable the search button",
        "After reset clears all fields, automatically trigger one query"
      ],
      "props": {},
      "dependencies": ["other taskIds this depends on"],
      "reuseComponents": ["existing reusable components"],
      "acceptanceCriteria": ["acceptance criterion 1", "acceptance criterion 2"],
      "status": "pending"
    }
  ],
  "routeConfig": {
    "path": "/xxx",
    "layout": "which layout to use"
  },
  "dataFlow": "brief description of data flow"
}
```

### Field Descriptions

| Field | Required | Source | Purpose |
|-------|----------|--------|---------|
| `prdRef` (top-level) | ✅ | Input PRD path | PRD entry for the entire module |
| `task.prdRef` | ✅ | PRD H2 heading anchors | Written into source file `@prd` JSDoc during coding |
| `task.designRef` | ❌ | Frame mapping from PRD "Design" section | Written into source file `@design` JSDoc; leave empty if no design spec |
| `task.businessRules` | ✅ | Verbatim text from PRD "Business Rules" section | Written into source file `@rules` JSDoc — **must be copied verbatim, no paraphrasing** |
| `task.acceptanceCriteria` | ✅ | Concrete version of businessRules (includes technical details) | Self-check after coding; may include UI/performance/compatibility requirements |

**businessRules vs acceptanceCriteria distinction**:
- `businessRules` = business semantics, implementation-agnostic (e.g., "disable button when all fields empty")
- `acceptanceCriteria` = technical acceptance, includes implementation requirements (e.g., "disabled button has disabled=true and className includes ant-btn-disabled")

## Requirements

- List tasks in dependency order (api → store → hooks → components → page)
- Each component must have an explicit Props interface
- Note which existing components can be reused
- Every task must have the three-part requirement: `prdRef` + `businessRules` + `acceptanceCriteria`
- Edge cases must be considered: empty state, loading, error, insufficient permissions
- `businessRules` must be extracted verbatim from the PRD — no improvisation

## Output Method

1. First, output the complete task list in the terminal for preview
2. Then save the task list to a local file: `docs/tasks/tasks-[module-code]-[today's date].json`
3. If `docs/tasks/` does not exist, create it first
4. **Additional note**: during the coding phase, write `prdRef` into the source file's `@prd` and write `businessRules` into the source file's `@rules` (see `.claude/rules/file-docs.md`)

Requirements are as follows:
$ARGUMENTS
