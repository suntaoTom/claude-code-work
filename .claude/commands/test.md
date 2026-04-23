You are now acting as a Test Engineer. Generate comprehensive test cases for the specified components/functions.

## Testing Frameworks

- Unit tests: Vitest + @testing-library/react
- E2E tests: Playwright (only when explicitly requested)

## Test File Placement Rules (mandatory)

All test files **must be placed under `workspace/tests/`**, mirroring the `workspace/src/` directory structure with a one-to-one correspondence to source files.
**Prohibited**: placing `*.test.ts(x)` files in the same directory as source files or in `__tests__/` subdirectories.

Mapping examples:

| Source File | Test File |
|-------------|-----------|
| `workspace/src/features/list/api/listApi.ts` | `workspace/tests/features/list/api/listApi.test.ts` |
| `workspace/src/features/list/components/SearchForm.tsx` | `workspace/tests/features/list/components/SearchForm.test.tsx` |
| `workspace/src/pages/list/index.tsx` | `workspace/tests/pages/list/index.test.tsx` |

Test files must reference business code **exclusively via the `@/` alias** (do not write `../../../src/...`):

```ts
import SearchForm from '@/features/list/components/SearchForm';
vi.mock('@/features/list/api/listApi', () => ({ ... }));
```

## Execution Flow

### Step 0: Read Business Anchors and Extract Business Rules (mandatory)

Test expectations must come from **business rules**, not from AI inferences about source code behavior. Otherwise you get "tests and source code are both AI-written, mutually validating" false passes.

For each target source file:

1. **Extract business anchors from the JSDoc header** (see `.claude/rules/file-docs.md`):
   - `@prd docs/prds/xxx.md#<anchor>` → PRD location
   - `@task docs/tasks/xxx.json#<taskId>` → task entry
   - `@rules` → multi-line business rule list

2. **Read the linked documents**:
   - Open the PRD fragment at `@prd` for full context
   - Open the task entry at `@task` to read acceptance criteria
   - Use `@rules` directly as the rule list

3. **Output the business rule list** (show to user for alignment):

   ```
   Business rules extracted from SearchForm.tsx:
     R1. Phone number must pass PHONE_REG validation after input (source: @rules)
     R2. Search button disabled when: all fields empty (source: PRD#search-form/rule2)
     R3. After reset clears all fields, automatically trigger one query (source: @task#task-003 acceptance criteria)
   ```

4. **If the source file lacks business anchors**:
   - **Stop and notify the user**, listing which files are missing `@prd` / `@task` / `@rules`
   - Offer two options:
     - (Recommended) Fill in anchors first, then generate tests to ensure traceability
     - (Fallback) Allow test generation based on source code signatures/types, but clearly annotate in the report: "This test is based on code inference, not business-driven — bias risk exists"
   - Do not enter fallback mode without authorization.

### Step 1: Scan Target Files, Classify

For the target specified in `$ARGUMENTS` (single file / directory / glob), classify by these rules:

1. **Locate test files**: for each source file `src/<path>/Foo.tsx`, the corresponding test is fixed at `tests/<path>/Foo.test.tsx`.
   - If old tests exist in the same directory or `__tests__/`, treat them as legacy; migrate to `tests/` and delete the originals when generating.

2. **Compare git last commit time** (approach: source modified time > test modified time → needs regeneration):

   ```bash
   git log -1 --format=%ct -- <source path>
   git log -1 --format=%ct -- <test path>
   ```

   - Source never committed (new file) → classify as "❌ No tests" or "🔄 Needs regeneration" (if a test exists)
   - Test never committed → treat as latest, skip
   - Source commit time > test commit time → classify as "🔄 Needs regeneration"

3. **Output classification list** (for user confirmation):
   ```
   Scan results:
     ✅ Already covered and up to date (skip):
        - workspace/src/components/UserCard.tsx
     🔄 Source has updates (recommend regenerating):
        - workspace/src/components/UserProfile.tsx (source 2026-04-10 > test 2026-03-20)
     ❌ No tests (will generate):
        - workspace/src/components/Dashboard.tsx
   ```

### Step 2: Determine Scope Based on Arguments

- **Default** (no arguments): generate for "❌ No tests" + "🔄 Source has updates"
- `--only-missing`: generate only for "❌ No tests"
- `--force`: regenerate everything (including "✅")

For "🔄 Needs regeneration" files, read the old test file as reference; preserve still-applicable cases and add/modify changed parts.

### Step 3: Generate Tests (business rules as the skeleton)

**Core principle**: one business rule → one `it()` case. Rules come from the list extracted in Step 0 — do not add assertions by inferring from source code.

- Test descriptions (`it('...')`) directly quote the business rule verbatim
- Annotate the rule source in comments for traceability:

  ```typescript
  describe('SearchForm', () => {
    // R1: Phone number must pass PHONE_REG validation after input (PRD#search-form/rule1)
    it('should show error when phone number format is invalid', () => { ... });

    // R2: Search button disabled when all fields empty
    it('should disable search button when all fields are empty', () => { ... });
  });
  ```

- For branches in the source that aren't covered by rules (e.g., edge cases, error paths), supplementary tests are allowed but must be annotated with `[Inferred]` in the description, prompting manual confirmation of whether they match business expectations
- The 7 scenario categories below are **supplementary dimensions** — business rules are the primary axis, not the other way around

## Test Requirements

### Scenarios that must be covered:

1. **Normal render**: whether the component can mount and render correctly
2. **Props passing**: rendering results under different prop combinations
3. **User interaction**: clicks, inputs, selections, etc.
4. **State changes**: whether state updates correctly after interaction
5. **Async operations**: loading / success / error states for API requests
6. **Edge cases**: empty data, very long text, special characters
7. **Error handling**: network errors, malformed data

### Code standards:

- Use describe / it to organize tests
- Test descriptions should clearly express the test intent
- Each `it` tests only one behavior
- Use `@testing-library/react`'s `screen` and `userEvent`
- Mock API requests using `vi.mock` or MSW
- Do not test implementation details — only test behavior and output
- **Forbid real network requests** (CI breaks the moment the network is down) — all API calls must be mocked

### API Test Layering Standards

| Layer | What to Test | How to Mock |
|-------|-------------|-------------|
| `api/*.ts` (request functions) | Request param assembly, response parsing, error handling | `vi.mock('umi-request')` or MSW; verify call params and return values |
| `hooks/*.ts` (business hooks) | State transitions, loading/error handling | `vi.mock('../api/xxx')`, no concern for network details |
| `components/*.tsx` | Business rules, UI behavior | `vi.mock('../api/xxx')` entire api module; only assert business behavior |

**Assertion data shape must align with OpenAPI types**: mock return values must be annotated with types from `@/types/api` so the TS compiler enforces consistency — do not hand-write fields.

```typescript
// ✅ Correct: use generated types; wrong fields cause TS error
import type { paths } from '@/types/api';
type SearchResp = paths['/api/users/search']['get']['responses']['200']['content']['application/json'];
const mockResp: SearchResp = { code: 0, message: 'ok', data: { total: 1, list: [...] } };
vi.mocked(searchUsers).mockResolvedValue(mockResp);

// ❌ Wrong: hand-written types; backend field changes won't break this test, but integration will blow up
vi.mocked(searchUsers).mockResolvedValue({ code: 0, data: { items: [...] } });
```

## Output Format

- New files: generate at the mirrored path `tests/<path>/[ComponentName].test.tsx` (create directory if it doesn't exist)
- Regenerated: overwrite the test under `tests/`; briefly explain "what cases were added/modified/removed compared to the old version, and why"
- If legacy test files still exist in the source directory, migrate and delete the originals

### Step 4: Auto-run and Self-heal (mandatory)

After generating/updating test files, **must proactively execute** to verify they run and pass. Do not hand off unverified tests to the user.

1. **Run tests** (only the files involved in this round to avoid noise):

   ```bash
   pnpm test --run tests/<path>/Foo.test.tsx tests/<path>/Bar.test.tsx
   ```

2. **Error triage and fix**, categorized by source:

   | Error Type | Handling |
   |------------|---------|
   | Test environment not ready (missing `@testing-library/react` / `jsdom` / `vitest.config.ts` / `@/` alias not resolved) | **Stop and notify the user**, list what deps/config need to be added; let user confirm before installing — do not run `pnpm add` without authorization |
   | Test code itself is wrong (selector not found, mock data structure wrong, missing async await) | **Modify the test file**, rerun |
   | Test exposes a real source code bug (behavior does not match business rule) | **Stop and notify the user**, specify which rule from Step 0 is violated (e.g., "violates R2: search button should be disabled when all fields empty, but source code doesn't do this check"), let user decide whether to fix source or revise the rule — do not modify source code on your own |
   | Missing dependency or TS type error | First determine if it's an environment issue or a test issue; handle based on the categories above |

3. **Loop until all green**: fix test → rerun → fix → rerun. Max 3 auto-fix rounds per session; if still failing, stop and report current status — do not loop indefinitely.

4. **Final report** includes:
   - List of files generated/updated in this round
   - Test execution results (pass count / fail count)
   - Fix process (what adjustments were made and why)
   - Unresolved issues and recommendations

Please execute the above flow for the following targets:
$ARGUMENTS
