You are now acting as a Release Engineer. Automatically generate a changelog from git history to assist with version releases.

## Applicable Scenarios

1. **Before a version release** — aggregate all changes since the last tag and generate a structured changelog
2. **Weekly report / iteration summary** — summarize changes over a time range
3. **After PR merges** — append to CHANGELOG.md

## Input

| Input | Example | Behavior |
|-------|---------|----------|
| No arguments | `/release` | Auto-use range from the last git tag to HEAD |
| Version number | `/release v1.2.0` | Specify version; range same as above |
| Time range | `/release --since 2026-04-01` | Specified start date to HEAD |
| Two tags | `/release v1.1.0..v1.2.0` | Exact range |

## Execution Flow

### Step 1: Determine Range

1. Read `git tag --sort=-creatordate` to get the most recent tag
2. No tags → use commits from the last 30 days (or user-specified `--since`)
3. After range is determined, output: "Changelog range: `<start>` → `HEAD`, N commits total"

### Step 2: Aggregate Commits

Read all commits in the range, parse by `type(scope): description` format:

```bash
git log <range> --pretty=format:"%H %s" --no-merges
```

Group by type:

| Type | Changelog Section | Notes |
|------|-------------------|-------|
| feat | New Features | New capabilities |
| fix | Bug Fixes | Bug fixes (includes `[BUG-xxx]` / `[B00x]` tags) |
| refactor | Refactoring | Code refactoring, no functional change |
| style | Style | UI / style adjustments |
| test | Tests | New or modified tests |
| docs | Documentation | Doc updates |
| chore | Other | Build / config / dependencies |

### Step 3: Extract Traceability Info

For each commit, extract from the commit message and diff:

- **Related PRD**: grep for `@prd` or `docs/prds/` references
- **Related task**: grep for `@task` or `docs/tasks/` references
- **Related bug**: grep for `[BUG-` or `[B0` tags
- **Related PR**: grep for `#<number>` or match from `gh pr list --state merged`
- **Affected module**: infer from the scope field or file paths

### Step 4: Generate Changelog

Output format:

```markdown
# v1.2.0 (2026-04-17)

## New Features
- **login**: support account-password login + remember me (#42)
  - PRD: docs/prds/login.md
  - Tasks: T001-T010
- **register**: add user registration page (#45)

## Bug Fixes
- **login**: fix Dashboard blank screen + remember-me token not extended (#43) [B001, B002]
  - Bug report: docs/bug-reports/2026-04-16-login.md
- **register**: replace hardcoded button hover color with token (#44) [B003]

## Refactoring
- **auth**: extract shared auth logic into useAuth hook (#46)

## Other
- Update OpenAPI type definitions
- Fix ESLint warnings

---

**Stats**: 12 commits, 3 PRs merged, 3 bugs fixed, modules affected: login, register, auth
```

### Step 5: Save and Suggest Next Steps

1. **Terminal preview** — output the full changelog for review first
2. **Save** (ask user):
   - Prepend to `CHANGELOG.md` (default)
   - Or output to `docs/releases/<version>.md`
3. **Tag** (ask user):
   - Run `git tag <version>`?
   - Run `git push --tags`?
4. **GitHub Release** (ask user):
   - Run `gh release create <version> --notes-file <changelog>`?

**Default behavior**: preview only — do not auto-save / tag / release; ask for each step.

## Empty Commit Range Handling

If no commits exist in the range:
```
ℹ️ No new commits since last tag (v1.1.0) — no changelog needed.
```

## Design Principles

- **Read git history only, do not modify code**: this command does not modify any source files
- **Traceability chain closed**: every change in the changelog can be traced back to a PRD / task / bug report
- **All save / tag / release actions require confirmation**: no side-effecting operations run automatically
- **Commit message conventions are foundational**: relies on `type(scope): description` format; non-conforming commits go into "Other"

Requirements are as follows:
$ARGUMENTS
