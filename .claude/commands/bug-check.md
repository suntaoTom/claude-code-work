You are now a bug triage + normalizer. For the given bug description, perform three tasks:

1. **Triage**: Determine whether this is a real bug or a feature request / missing rule (the latter should not enter `/fix`)
2. **Normalize**: Solidify the input into a structured report conforming to `docs/bug-reports/_template.md`
3. **Validate**: Check if all required fields are present, anchors exist, and no forbidden content is included

Downstream `/fix` always only accepts "normalized reports produced by this command" — keeping the input contract single.

## Applicable Scenarios

1. **User self-checks a bug report in real time** — after a testing AI or manual review writes one, run `/bug-check @docs/bug-reports/xxx.md` to validate format
2. **Mandatory pre-check for `/fix`** — `/fix` must run this command first; if it fails, do not enter the fix phase
3. **Entry point to solidify verbally described bugs** — `/fix <one-liner>` will first delegate to this command to solidify a report, write it to disk, then let the user review it

## Input

| Input | Mode | Behavior |
|-------|------|----------|
| `@docs/bug-reports/xxx.md` | Batch | Validate only, do not rewrite |
| Free text (one-liner / error stack / repro description) | Interactive | Ask follow-up questions → solidify to file → stop for user review |
| No arguments | — | Stop and ask: "Please describe the bug or specify a report path" |

## Step 1: Triage (bug vs. missing rule vs. feature)

**Core question**: Is the "expected behavior" described by the user already defined in the PRD?

1. Extract keywords from the input (module / feature / action / expected result)
2. grep `docs/prds/` to find the most relevant PRD, then look for the "Business Rules" section
3. Route based on the table below:

| Situation | Verdict | Action |
|-----------|---------|--------|
| Description contains "add / increase / I want / support XX feature" | Feature request | Stop, suggest `/prd <description>`, do not enter /fix |
| PRD has a clear business rule, but code implementation does not match | ✅ Real bug | Proceed to Step 2 |
| PRD does not cover this scenario (timeout / exception / new boundary) | Missing rule, not a bug | Stop, suggest "run `/prd` to add the rule first, then `/prd-check`, then `/plan`, then `/code`" |
| PRD has a rule but it's ambiguous, multiple interpretations | Unclear | In interactive mode, stop and ask PM; in headless mode, output `[BLOCKED]` listing candidate interpretations |

**Key distinction**: "Code doesn't implement a rule that PRD has" = bug; "Code doesn't cover a scenario that PRD doesn't mention" = missing rule → use `/prd`, not `/fix`.

Triage failure terminates immediately — do not proceed to Step 2.

## Step 2: Normalize (branching by input type)

### 2A. Input is a report file (batch mode — validate only, do not rewrite)

Run the following checks on the file in sequence, collect all results before summarizing (no short-circuit):

| Check | Pass Criteria | On Failure |
|-------|---------------|------------|
| Metadata fields complete | Report ID / created date / test tool / test scope all non-empty | List missing fields |
| Summary table non-empty | At least 1 bug record | Blocked (cannot group) |
| Required fields per bug | Priority / module / symptom / repro steps / expected vs. actual all filled | List which bug is missing which field |
| Valid priority values | Only P0 / P1 / P2 | List invalid values |
| PRD anchor traceable (soft) | Path file exists and anchor can be grepped in the file | Soft warning, non-blocking (empty allowed) |
| No `[TBD]` remaining | Zero grep hits across the file | List locations, blocking |
| No forbidden "fix code suggestions" | No "Suggested code:" / "You can fix it by:" / code blocks as fix | List locations, blocking (violates `docs/bug-reports/README.md` boundary) |
| `[AI Inference]` scan | Soft warning, lets reviewers know what the AI guessed | Non-blocking |

### 2B. Input is free text (interactive mode — must be solidified)

Ask follow-up questions → solidify → stop for user review. **Do not automatically proceed to `/fix`**.

**Steps**:

1. **Determine file path**:
   - Infer module name from the description (e.g., keyword "login" → `login`)
   - Compose `docs/bug-reports/<YYYY-MM-DD>-<module>.md`
   - If same-day, same-module file already exists → append `-2` / `-3` suffix

2. **Ask all follow-up questions at once** (do not ask one by one):

   First infer what you can, then list missing items to ask all at once:

   ```
   Inferred from description (correct these if wrong):
     Bug ID: B001
     Priority: P0 [AI Inference: keyword "blank screen" is usually blocking]
     Module: login [AI Inference: keyword "login page"]
     Related PRD: docs/prds/login.md#account-password-login [AI Inference: semantic match]

   Please fill in the following at once (write "N/A" if unknown):
     1. Repro URL? (e.g., /login)
     2. Preconditions? (account / browser state / data setup)
     3. Repro steps? (numbered, one action per step)
     4. Expected behavior / actual behavior?
     5. Raw console error (if any)?
     6. Related API name + exception (if known)?
   ```

3. **Assemble the file** (strictly follow `docs/bug-reports/_template.md`):
   - Fill in inferable fields, retain `[AI Inference]` prefix
   - For optional unfilled fields (console / network / screenshot) → write "N/A"
   - For required unfilled fields (repro / expected vs. actual) → **do not write to disk, stop and ask again**

4. **Write to disk and stop**:

   After writing the file, **must stop** — do not continue to `/fix`:

   ```
   ✅ Bug report solidified: docs/bug-reports/2026-04-16-login.md

   AI Inference items (3 locations, need your review):
     L15  Priority P0
     L16  Module login
     L18  Related PRD docs/prds/login.md#account-password-login

   Next steps (choose one):
     • Confirmed correct → /fix @docs/bug-reports/2026-04-16-login.md [--pr]
     • Need corrections → edit the file directly and rerun the command above
   ```

## Output Format

### Passed (batch mode)

```
✅ bug-check passed: docs/bug-reports/2026-04-16-login.md

  ✅ Triage: 3 bugs are all real bugs (all backed by PRD business rules)
  ✅ Metadata complete / summary table non-empty
  ✅ Required fields complete (3 bugs)
  ✅ Priority values valid (P0=1 P1=1 P2=1)
  ✅ No [TBD] / no fix code suggestions

Soft warnings (non-blocking):
  • B003 "Related PRD" is empty (allowed, but recommended for /fix alignment)
  • 3 [AI Inference] locations: L15, L16, L18 — if from a testing AI, please review manually

Next step: /fix @docs/bug-reports/2026-04-16-login.md [--pr]
```

### Passed (interactive mode — solidification complete)

See the disk write output in Step 2B.4.

### Failed (triage)

```
❌ bug-check terminated: not a real bug

[Triage] Matched keywords "add / I want", classified as feature request
  Suggested path: /prd "<original description>"

or

[Triage] Expected behavior "auto-retry on network timeout" has no matching business rule in docs/prds/login.md
  Verdict: Missing PRD rule, not a code bug
  Suggested flow:
    1. /prd docs/prds/login.md  (add timeout rule)
    2. /prd-check @docs/prds/login.md
    3. /plan @docs/prds/login.md
    4. /code @docs/tasks/tasks-login-*.json
```

### Failed (field validation)

```
❌ bug-check failed: docs/bug-reports/2026-04-16-login.md

Blocking issues:

[Check: Required fields]  3 missing
  Bug B001: missing "Expected vs. Actual"
  Bug B002: missing "Repro steps"
  Bug B003: Priority value is "Urgent", should be P0/P1/P2

[Check: Fix code suggestions]  1 hit
  L87  "Suggested code: return await retry(() => fetchUser())"
  Testing AI should not provide fix suggestions — let /fix figure that out

Passed (4/7):
  ✅ Metadata / summary table / anchors / [TBD]

Fix and rerun: /bug-check @docs/bug-reports/2026-04-16-login.md
```

## Design Principles

- **Triage first**: Non-real bugs never enter `/fix`, avoiding wasted fix compute
- **Do not modify source code or PRD**: Read-only + write to bug report files only
- **Batch mode validates only**: Respect output from testing AI / manual review, do not rewrite existing reports
- **Interactive mode must write to disk**: Verbal bugs are always converted to report files, treated the same as batch, for traceability
- **Stop after writing to disk**: Consistent with `/prd` draft flow — let the user review before proceeding
- **Single input contract**: `/fix` downstream only accepts "normalized reports", not raw text

Requirements are as follows:
$ARGUMENTS
