You are now a PRD completeness checker. Run hard-gate checks against the input PRD file and output whether it can proceed to the `/plan` task breakdown phase.

## Applicable Scenarios

1. **User self-checks during PRD review** — make a change and run immediately to know how far from "ready to run `/plan`"
2. **Mandatory pre-check for `/plan`** — `/plan` must run this command first; if it fails, task breakdown is refused

## Input

- `@docs/prds/xxx.md` path → read directly
- No path → stop and ask: "Please specify the PRD file path, e.g.: /prd-check @docs/prds/login.md"

## Checks (run in order, no short-circuit — report all issues at once)

Run all 5 checks in sequence, collect all results before summarizing. **Do not stop at the first failure** — users want to see all issues at once.

### Check 1: Zero `[TBD]` hits (P0, must pass)

Full-text grep for `[TBD]`; hit count must be 0.

- **Why strict**: `[TBD]` will propagate all the way to `task.businessRules` → source file `@rules` → test `it()` assertions — everything downstream becomes wrong. Blocking at the entry point has the lowest cost.
- **On failure**: list the line number and text snippet for each hit

### Check 2: Zero `[TBD]` hits in body text (P1)

Full-text grep for `[TBD]`. **Allowed** in:
- Metadata table ("Owner" field)
- Change log table ("Changed by" column)

**Not allowed** anywhere else in the document body.

- **Why the metadata exception**: these fields are collaboration info and don't affect downstream generation
- **On failure**: list the out-of-bounds hit locations

### Check 3: Business Rules section contains no placeholders (P0)

Scan all entries under `### Business Rules` sections; each entry must not contain:
- `[TBD]`
- `TODO` / `FIXME` / `???`
- Empty entries (e.g., `1. `)

- **Why strict**: `businessRules` is the direct source for task breakdown and test generation — placeholders mean downstream assertions are unreliable
- **On failure**: identify which feature point and which rule contains the placeholder

### Check 4: Data Contract Status Column Complete (P1)

Scan all "Interfaces Used" tables; each operationId must have a status, and the status must be one of:
- `✅ Already exists`
- `🆕 Pending backend implementation`

- **On failure**: list operationIds with missing or invalid status values

### Check 5: 🆕 Interfaces Have Stubs (P1)

For each `🆕 Pending backend implementation` operationId, check whether it:
- Appears in the PRD's "API Proposals" section (a code block with the matching operationId)
- **Or** is already in `workspace/api-spec/openapi.local.json`

If absent from both → fails.

- **On failure**: list the operationIds missing stubs

## Supplementary Checks (soft prompts, non-blocking)

The following only issue warnings and do not affect pass/fail:

- Count of `[Default Assumption]` hits (reminds reviewers to confirm at review meeting)
- Whether the "Owner" metadata field is `[TBD]`
- Whether the "Changed by" log field is `[TBD]`

## Output Format

### On Pass

```
✅ PRD completeness check passed: docs/prds/login.md

Passed checks (5/5):
  ✅ No [TBD]
  ✅ No out-of-bounds [TBD]
  ✅ Business rules have no placeholders
  ✅ Data contract status column complete (5 operationIds)
  ✅ 🆕 Interface stubs complete (5)

⚠️ Soft prompts (non-blocking):
  • 6 [Default Assumption] items in the document — please confirm each at the review meeting
  • "Owner" metadata field is still [TBD]

Next step: /plan @docs/prds/login.md
```

### On Failure

```
❌ PRD completeness check failed: docs/prds/login.md

Blocking issues (all must be fixed before running /plan):

[Check 1: No [TBD]]  3 hits
  L118  | [TBD] email                  — registration field definition
  L119  | [TBD] phone number           — registration field definition
  L128  | Business rule 6: [TBD] whether email is required...

[Check 3: Business rules have no placeholders]  2 hits
  Feature point 2 "User Registration" rule 6: [TBD] whether...
  Feature point 2 "User Registration" rule 7: [TBD] whether...

[Check 5: 🆕 Interface stubs complete]  1 missing
  operationId `sendResetCode` marked as 🆕 but "API Proposals" section has no matching stub

Passed (2/5):
  ✅ No out-of-bounds [TBD]
  ✅ Data contract status column complete

Fix reference: docs/prds/REVIEW.md
  (A) Get answers from PM/backend and fill in concrete rules
  (B) Features not in this iteration — delete the section or change to "next iteration"
  (C) [Default Assumption] does not need to change — confirm at review meeting; [TBD] must be cleared

After fixing, rerun: /prd-check @docs/prds/login.md
```

## Design Principles

- **Do not modify the PRD file** — read-only checks
- **No short-circuit**: run all 5 checks at once, report all issues together
- **Actionable output**: each issue includes line number/location + pointer to `docs/prds/REVIEW.md`
- **Default assumptions don't block**: the AI has already provided a default value; proceed and confirm at review meeting

Requirements are as follows:
$ARGUMENTS
