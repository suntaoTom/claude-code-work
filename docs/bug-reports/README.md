# docs/bug-reports/ — UI Test Bug Reports

> **This is the data-contract directory between test-side AI testing and the `/fix` command.**
> Test-side AIs write standardized reports here, which `/fix @path.md --pr` consumes in bulk.

## Directory Contents

```
docs/bug-reports/
├── README.md                        ← The file you are reading
├── _template.md                     ← Report template (fixed fields — do not edit)
├── 2026-04-16-login.md              ← Daily report (named by date + module)
├── 2026-04-17-user-list.md
└── screenshots/                     ← Screenshots (optional to gitignore)
    ├── B001-01-blank.png
    └── ...
```

## File Naming

```
<YYYY-MM-DD>-<module-or-page>.md
```

- One report = **one test run** and can contain multiple bugs
- Multiple runs on the same module same day → append `-2`, `-3`
- Do not use Chinese filenames

## Workflow

```
1. Test-side AI writes a report per the template to docs/bug-reports/<date>-<module>.md
       ↓
2. Run /bug-check @docs/bug-reports/<date>-<module>.md  (validate format + triage)
       ↓
3. Human review at a glance (confirm not a false positive, 3-5 minutes)
       ↓
4. Run /fix @docs/bug-reports/<date>-<module>.md --pr
       ↓
5. /fix embeds /bug-check → groups by priority + module → produces 1–N draft PRs
       ↓
6. Human review the PRs, merge
```

**Step 2 is optional but recommended**: `/bug-check` validates the report format (fields complete, priorities valid, no fix suggestions) and performs Triage (real bug vs. missing rule / feature request). Skipping it is fine — step 4's `/fix` will run it again automatically. But running it up front catches test-side AI format issues early and avoids downstream blockage.

**Do not skip step 3**. Test-side AIs can produce false positives (e.g., treating a dev-mode warning as an error); letting `/fix` run unchecked burns tokens fixing non-bugs.

### Verbal-Bug Flow (Non Test-Side AI)

```
1. /fix login page blank screen
       ↓
2. /fix embeds /bug-check → asks follow-ups → persists to docs/bug-reports/<date>-<module>.md → stops
       ↓
3. Human reviews the report and confirms
       ↓
4. /fix @docs/bug-reports/<date>-<module>.md [--pr]
       ↓
5. Normal fix flow
```

Every bug (verbal / test-side AI / Sentry) ultimately lives as a standardized report in `docs/bug-reports/`, giving unified traceability.

---

## Test-Side AI System Prompt Snippet (Critical)

Paste the block below into your automated-testing tool's system prompt (Playwright MCP / Browser Use / Claude Computer Use / Appium / simulator / etc.). **Copy verbatim** — do not modify:

```text
# UI Test Report Specification

You are a UI automation tester, not a fix engineer. Your job is to **find and record problems**, not to change code.

## Deliverable

At the end of each test run, write every discovered bug to the following path in the format defined by docs/bug-reports/_template.md:

  docs/bug-reports/<YYYY-MM-DD>-<module-or-page-under-test>.md

Mandatory field rules:
1. Every field must be filled; write "none" if there is no data — do not skip
2. The "Symptom" field must be a one-sentence description; vague things like "the page is broken" are not acceptable
3. "Reproduction steps" must be numbered and sequential, with each step doing exactly one thing (click / input / wait)
4. "Expected vs. Actual" uses a table comparing both sides; do not write only one side
5. "Console errors" must be pasted verbatim with the stack trace; do not rewrite
6. "Network requests" list the relevant APIs, their status, and any anomalous key fields
7. "Screenshot" paths must exist; naming: <Bug ID>-<sequence>-<description>.png
8. "Root-cause guess" is optional; leave it blank if unsure. If confident, write the guess + evidence; **never modify code**
9. "Priority" is P0/P1/P2 based on blocking severity (definitions in the template)
10. "Related PRD" — look up the nearest semantic anchor in docs/prds/; leave blank if none

## Boundaries

- ❌ Do not modify code, do not git commit, do not call /fix
- ❌ Do not write files outside this scope (only docs/bug-reports/ and the screenshots/ subdirectory)
- ❌ Do not include "suggested fix code" in the report (/fix will figure it out)
- ✅ If zero bugs were found, still produce a report (empty "Overview" table + one-line summary), so the caller knows the run happened

## After Delivering

Return the generated report path to the caller, and the human decides whether to run:
  /fix @<report-path> --pr
```

---

## Integration with `/bug-check` and `/fix`

`/bug-check` is the gate in front of `/fix` (Triage + normalization), but can also run standalone:

| Command | Example | Behavior |
|---------|---------|----------|
| `/bug-check` (standalone) | `/bug-check @docs/bug-reports/2026-04-16-login.md` | Validate format + Triage (bug / feature / missing rule); if it fails, list exactly what's missing |
| `/bug-check` (verbal) | `/bug-check login page blank screen` | Ask follow-ups → persist to `docs/bug-reports/<date>-<module>.md` → stop for your review |
| `/fix` (bulk report) | `/fix @docs/bug-reports/2026-04-16-login.md --pr` | Embed `/bug-check` validation → group by priority + module → produce 1–N draft PRs |
| `/fix` (verbal) | `/fix login page blank screen` | Embed `/bug-check` follow-ups + persist → **stop**; after your review, re-run `/fix @<report-path>` |

Grouping rules (executed by `/fix`):

- Same priority + same module + same root cause → merged into **one PR**
- Different modules → split into **multiple PRs** (for independent review)
- P0 bugs get their own PR (not mixed with P1/P2)

Each PR's commit message includes every included Bug ID, e.g.:

```
fix(login): fix Dashboard blank screen + broken Remember Me [B001, B002]
```

---

## Screenshot Management

- Path: `docs/bug-reports/screenshots/<Bug ID>-<sequence>-<short-description>.png`
- Default: **not gitignored** (so PR reviewers can see them). If the volume gets too large, consider:
  - Compress to webp
  - Or add to `.gitignore` and keep locally only

```gitignore
# If you decide not to commit screenshots, uncomment the line below:
# docs/bug-reports/screenshots/
```

---

## Archival Strategy

- Report files are **kept by default** — no scheduled cleanup
- Once every bug in a report is closed (PRs merged), you may annotate the metadata with `status: all fixed`, but do not delete the file
- If you do delete, explain why in the commit message (preserves historical traceability)

---

## FAQ

**Q: What if the test-side AI can't write files?**
A: Have it output the report contents to the chat, and the human pastes it into `docs/bug-reports/` manually. Or use a tool like Claude Computer Use that has file permissions.

**Q: A report contains 20 bugs — will `/fix` handle them all at once?**
A: It will split them into multiple PRs, but a single invocation processes them all. For very large batches, consider manually removing P2 items first, running only P0/P1, then running P2 separately.

**Q: The test-side AI's "root cause guess" is wrong — what now?**
A: `/fix` never trusts it blindly; it performs its own step 2 "locate root cause". The guess is just an accelerator hint; `/fix`'s diagnosis is authoritative.

**Q: A duplicate bug was reported — what now?**
A: `/fix`'s step-zero front-end gate greps the last 7 days of closed bug reports and currently open PR branches; a duplicate triggers `[BLOCKED]` and asks the human to investigate. (This check is implemented in `/fix`, not in this directory.)
