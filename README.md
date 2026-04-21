<div align="center">

# Claude Code WorkFlow

<p><strong>An AI-driven R&D workflow framework</strong></p>

<p>
Breaks the full chain of "Requirements → Breakdown → Implementation → Verification → Review → Delivery → Release" into traceable commands, skills, subagents, and rules.<br />
AI executes, humans supervise every critical checkpoint · Runs on top of <a href="https://docs.claude.com/en/docs/claude-code">Claude Code</a>
</p>

<p>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License" /></a>
  <a href="https://docs.claude.com/en/docs/claude-code"><img src="https://img.shields.io/badge/Powered%20by-Claude%20Code-8A2BE2" alt="Powered by Claude Code" /></a>
  <img src="https://img.shields.io/badge/status-active-success.svg" alt="Status" />
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" />
  <br />
  <a href="https://github.com/suntaoTom/claude-code-work/stargazers"><img src="https://img.shields.io/github/stars/suntaoTom/claude-code-work?style=social" alt="Stars" /></a>
  <a href="https://github.com/suntaoTom/claude-code-work/commits"><img src="https://img.shields.io/github/last-commit/suntaoTom/claude-code-work" alt="Last commit" /></a>
  <a href="https://github.com/suntaoTom/claude-code-work/issues"><img src="https://img.shields.io/github/issues/suntaoTom/claude-code-work" alt="Issues" /></a>
  <a href="https://github.com/suntaoTom/claude-code-work/releases"><img src="https://img.shields.io/github/v/release/suntaoTom/claude-code-work?include_prereleases&sort=semver" alt="Release" /></a>
</p>

<p>
  <strong><a href="docs/WORKFLOW.md">Operations Manual</a></strong> ·
  <strong><a href="docs/ADAPTING.md">Cross-Domain Adaptation</a></strong> ·
  <strong><a href="docs/DECISIONS.md">Architecture Decisions</a></strong> ·
  <strong><a href=".claude/README.md">Framework Internals</a></strong> ·
  <strong><a href="#how-to-use">Quick Start</a></strong>
</p>

</div>

---

## Table of Contents

- [What Is This](#what-is-this)
- [Highlights](#highlights)
- [Framework Five-Part Architecture](#framework-five-part-architecture)
- [Eight-Step Workflow Scaffold](#eight-step-workflow-scaffold)
- [Three Design Principles](#three-design-principles)
- [Directory Overview](#directory-overview)
- [How to Use](#how-to-use)
- [Branch Guide](#branch-guide)
- [Where to Start](#where-to-start)
- [License](#license)

---

## What Is This

**This repository is the framework core itself — it is domain-agnostic (frontend / backend / data / mobile / DevOps / QA / design / product / writing / research...).** Concrete implementations live under `workspace/` and are swapped out by the user per domain.

The framework uses Gates and Archives to directly address the two classic pain points of AI-collaborative R&D:

| Problem                   | Symptom                                            | How the framework treats it                                                                      |
| ------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **AI has no constraints** | Makes things up, edits randomly, works around bugs | Hard Gates (PRD Completeness / `@rules` Traceability Chain / No Hardcoding / Silent Guard Hooks) |
| **AI has no memory**      | Every session starts from guessing                 | Archive accumulation (ADR / retrospectives / tasks.json) — readable across sessions              |

> The framework is **not tied to a tech stack and not tied to a domain**. Domain specialization lives in `.claude/rules/*.md` and `workspace/`.

---

## Highlights

- **Eight-Step SDLC** — `/prd → /plan → /code → /test → /review → /build → /deploy → /release` as a single pipeline, supplemented by `/fix` `/bug-check` `/prd-check` `/plan-check` `/start` `/meta-audit`
- **Hard Gates** — `prd-check` catches placeholders, `plan-check` catches incomplete tasks; AI cannot silently skip them
- **Traceability Chain** — PRD anchor → Task ID → artifact `@prd/@rules` → verification `it()`; any link can be scanned downstream when something changes
- **Five-Part Collaboration** — Commands (decisions) + Skills (scripts) + Subagents (parallel / independent perspective) + Hooks (silent guard) + Rules (long-term constraints), with clear boundaries
- **Cross-domain portable** — Swap `workspace/` + rewrite the contents of `.claude/rules/` to use for backend / data / mobile / any other domain (see [ADAPTING.md](docs/ADAPTING.md))
- **Archives carry context** — ADRs record decisions, retrospectives record health, tasks.json records progress; a new session can read the history at a glance

---

## Framework Five-Part Architecture

| Part          | Location                               | Trigger                  | Best for                              |
| ------------- | -------------------------------------- | ------------------------ | ------------------------------------- |
| **Commands**  | [.claude/commands/](.claude/commands/) | User `/<name>`           | Main workflow (pure thinking)         |
| **Skills**    | [.claude/skills/](.claude/skills/)     | Explicit or auto         | Running scripts to fetch data         |
| **Subagents** | [.claude/agents/](.claude/agents/)     | Main command spawn       | Parallel / context isolation          |
| **Hooks**     | [.claude/hooks/](.claude/hooks/)       | Auto on events           | Silent guard (non-blocking)           |
| **Rules**     | [.claude/rules/](.claude/rules/)       | AI follows automatically | Long-term stable artifact constraints |

Boundaries and addition conventions — see [.claude/README.md](.claude/README.md).

---

## Eight-Step Workflow Scaffold

```text
 /prd       Spoken requirement ──→ Structured PRD (with [TBD])
    │
    │  Human review; /prd-check zeroes out placeholders
    ▼
 /plan      PRD ──→ Task manifest (with prdRef + business rules)
    │
    │  /plan-check acceptance
    ▼
 /code      Task manifest ──→ Artifact (header carries @prd / @task / @rules)
    ▼
 /test      Artifact @rules ──→ Verification cases (one per rule)
    ▼
 /review    Independent-perspective audit (can spawn code-reviewer)
    ▼
 /build     Productization
    ▼
 /deploy    Deliver to target environment
    ▼
 /release   Aggregate changelog + cut tag
```

Each step's **abstract semantics are domain-agnostic**; artifacts are swapped per domain. Full operations manual: [docs/WORKFLOW.md](docs/WORKFLOW.md).

---

## Three Design Principles

<table>
<tr>
<td width="33%" valign="top">

### Traceable

PRD anchor → Task ID → artifact `@prd/@rules` → verification cases, threaded end to end.

Change any link and the downstream chain can be swept — nothing missed, nothing out of place.

</td>
<td width="33%" valign="top">

### Human Review at Key Checkpoints

AI handles full execution, but **stops and waits for a human nod** before PRD / breakdown / review / delivery.

AI cannot silently bypass gates. `/prd-check` and `/plan-check` are hard blocks, not reminders.

</td>
<td width="33%" valign="top">

### Failures Are Visible

No hiding errors, no auto workarounds, no "green" masking real bugs.

When things go red, triage by four categories (tools → environment → expectation → artifact), and **the artifact is the last thing you suspect**.

</td>
</tr>
</table>

---

## Directory Overview

```text
claude-code-work/
├── README.md                 ← You are here (framework overview)
├── CLAUDE.md                 ← Project rules (auto-loaded when Claude Code starts)
├── .claude/                  ← Framework core (domain-agnostic mechanisms)
│   ├── commands/             ← Eight-step commands + helper commands
│   ├── skills/               ← Extension skills
│   ├── agents/               ← Dedicated subagents
│   ├── hooks/                ← Event hooks
│   └── rules/                ← Artifact constraints (swap contents per domain, keep structure)
├── docs/                     ← AI workflow artifacts + historical archives
│   ├── WORKFLOW.md           ← Eight-step operations manual
│   ├── ADAPTING.md           ← Cross-domain adaptation checklist (required when forking)
│   ├── DECISIONS.md          ← Architecture Decision Records (ADR)
│   ├── prds/                 ← PRDs generated by /prd
│   ├── tasks/                ← Task manifests generated by /plan (JSON)
│   ├── bug-reports/          ← Inputs for /fix
│   └── retrospectives/       ← Read-only snapshots produced by /meta-audit
└── workspace/                ← Actual project (swap for any domain)
```

- **Framework core** = `.claude/` + `docs/` + `CLAUDE.md` + `README.md`
- **Domain specialization** = `workspace/` + the concrete contents of `.claude/rules/*.md`

---

## How to Use

### Prerequisites

- [Claude Code CLI](https://docs.claude.com/en/docs/claude-code) installed and signed in

### Three steps to get started

```bash
# 1. Fork this repo and rename it for your domain
git clone https://github.com/suntaoTom/claude-code-work.git ai-<domain>-automation
cd ai-<domain>-automation

# 2. Follow ADAPTING.md to swap in your domain layer
#    - Replace workspace/ with a project scaffold for your domain
#    - Rewrite the rule contents in .claude/rules/*.md
#    - Update the onboarding in CLAUDE.md

# 3. Open Claude Code and run your first requirement
claude
> /start                       # Required on first run — AI reads through the project
> /prd <your requirement description>  # Generate a PRD draft
```

The framework core itself **requires no extra installation** — Claude Code CLI is all you need. Dependencies under `workspace/` depend on your domain (frontend `pnpm install`, backend might be `mvn / go mod / pip install`, etc.).

---

## Branch Guide

| Branch        | Purpose                                                                     |
| ------------- | --------------------------------------------------------------------------- |
| `main`        | Framework core overview (domain-agnostic, you are here)                     |
| `ai-frontend` | Frontend domain implementation (UmiJS + React + antd + Vitest + Playwright) |
| `feature`     | Integration branch for development                                          |
| `Harness`     | Iteration branch for the framework core                                     |

To see a full domain example, check out the corresponding branch (e.g., `git checkout ai-frontend`). `ai-backend` / `ai-data` and other branches will be added over time.

---

## Where to Start

| I am...                                                      | Open this first                                                                |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| **Picking up the framework for the first time**              | [docs/WORKFLOW.md](docs/WORKFLOW.md) — Eight-Step operations manual            |
| Wanting to port the framework to a domain                    | [docs/ADAPTING.md](docs/ADAPTING.md) — Cross-domain adaptation checklist       |
| Modifying framework mechanisms (add command / skill / agent) | [.claude/README.md](.claude/README.md) — Boundaries of the five parts          |
| Checking how the framework evolved                           | [docs/DECISIONS.md](docs/DECISIONS.md) — Architecture Decision Records (ADR)   |
| Reviewing past health scans                                  | [docs/retrospectives/](docs/retrospectives/) — `/meta-audit` read-only reports |
| Enabling GitHub automation                                   | [.github/SETUP.md](.github/SETUP.md)                                           |

---

## Contributing

Issues and PRs are welcome. Before submitting:

1. Run `/meta-audit` to check whether your change introduces health regressions
2. If you change framework mechanisms, add an ADR entry in [docs/DECISIONS.md](docs/DECISIONS.md) with background

---

## License

[MIT](LICENSE) © 2026 suntaoTom
