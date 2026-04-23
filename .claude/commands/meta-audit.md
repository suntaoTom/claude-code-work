You are now the meta-audit coordinator. The user just typed `/meta-audit`. Your sole responsibility is to **spawn a meta-auditor sub-agent** to perform a full scan, then present the report's key findings to the user.

## Command Arguments

The user may pass:
- `--focus=<dimension>` — scan only one dimension (`rule-violations` / `doc-drift` / `internal-consistency` / `traceability` / `dead-links` / `orphaned-assets`)
- `--output=<path>` — override the default report location

No arguments = scan all 6 dimensions, write report to `docs/retrospectives/<today's date>-meta-audit.md`.

## Execution Flow

### 1. Find the Previous Report (for trend comparison)

```
Glob(pattern="docs/retrospectives/*-meta-audit.md")
```

Sort by filename and take the most recent (excluding any same-day report that may already exist).

### 2. Spawn meta-auditor agent

```
Agent(
  subagent_type="meta-auditor",
  description="Engineering meta-audit",
  prompt=<see prompt template below>
)
```

Prompt template (variables to fill are in `<>`):

```
Please execute a meta-audit and output the report to docs/retrospectives/<today>-meta-audit.md.

Scan dimensions: <full | focus=<dimension>>
Previous report (for trend comparison): <previousReportPath | first run>

Strict constraints:
- Only Read / Grep / Glob for scanning
- Only Write to the report path; do not touch any other files
- Do not reference git, do not modify .claude/, do not modify workspace/

Follow the execution steps and report format defined in .claude/agents/meta-auditor.md.
```

### 3. Receive summary and show to user

After receiving the summary returned by meta-auditor, output the following in the terminal:

```markdown
## 📊 Meta-audit complete

**Report**: [docs/retrospectives/<date>-meta-audit.md](docs/retrospectives/<date>-meta-audit.md)

### Findings
- 🔴 Must fix: X items
- 🟡 Recommend fixing: Y items
- 🔵 Discussion: Z items

### Top 3 Must-Fix (prioritize these)
1. <1st item from agent>
2. <2nd item from agent>
3. <3rd item from agent>

### Trend (vs. last run)
- Resolved: A items ✅
- New: B items
- Persistently unaddressed: C items ⚠️

### Next Steps
Please review the full report. For accepted suggestions, follow the normal process to implement:
- Rule changes → edit .claude/rules/ directly
- Code changes → use /fix or normal development flow
- Discussion items → open a GitHub issue or discuss with the team

This command **does not auto-fix** — all changes require human decision.
```

## Design Principles

- The command is only responsible for **orchestration + display**; all actual scan logic lives in the meta-auditor agent
- Do not read any scanned files in the main context (let the agent read them — protect the main context)
- Never auto-fix; always let the user decide
- If the user passed `--focus`, remind them that only a subset of dimensions was scanned — this is not a comprehensive audit

## Usage

```
/meta-audit                          # Scan all 6 dimensions, default output path
/meta-audit --focus=traceability     # Only check traceability chain breaks
/meta-audit --focus=dead-links       # Only check dead references
/meta-audit --output=/tmp/audit.md   # Custom report location
```

Please execute the meta-audit:
$ARGUMENTS
