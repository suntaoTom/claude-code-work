<div align="center">

# Claude Code Work

<p><strong>AI 驱动的研发工作流框架</strong></p>

<p>
把「需求 → 拆解 → 实现 → 验证 → 评审 → 交付 → 发布」全链路拆成可追溯的命令、技能、子代理和规则<br />
由 AI 执行, 人监督每个关键节点 · 运行在 <a href="https://docs.claude.com/en/docs/claude-code">Claude Code</a> 之上
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
  <strong><a href="docs/WORKFLOW.md">操作手册</a></strong> ·
  <strong><a href="docs/ADAPTING.md">跨工种适配</a></strong> ·
  <strong><a href="docs/DECISIONS.md">架构决策</a></strong> ·
  <strong><a href=".claude/README.md">框架机制</a></strong> ·
  <strong><a href="#怎么用">快速开始</a></strong>
</p>

</div>

---

## 目录

- [这是什么](#这是什么)
- [核心亮点](#核心亮点)
- [框架五件套](#框架五件套)
- [八步法骨架](#八步法骨架)
- [三大设计原则](#三大设计原则)
- [目录总览](#目录总览)
- [怎么用](#怎么用)
- [分支说明](#分支说明)
- [我该从哪里开始看](#我该从哪里开始看)
- [许可证](#许可证)

---

## 这是什么

**本仓库是框架本体, 与具体工种 (前端 / 后端 / 数据 / 移动 / DevOps / QA / 设计 / 产品 / 写作 / 科研...) 无关。** 具体实现代码放在 `workspace/` 下, 由使用者按工种替换。

AI 协作研发的两个老问题, 框架用闸门和档案直接回答:

| 问题             | 表现             | 框架怎么治                                                        |
| ---------------- | ---------------- | ----------------------------------------------------------------- |
| **AI 没约束**   | 瞎写、乱改、绕 bug | 硬闸门 (需求完备性 / `@rules` 追溯链 / 禁硬编码 / Hooks 静默守护) |
| **AI 没记忆**   | 每次会话从零猜   | 档案沉淀 (ADR / retrospectives / tasks.json) 跨会话可读             |

> 框架**不绑技术栈, 不绑领域**。工种特化在 `.claude/rules/*.md` 和 `workspace/` 里做。

---

## 核心亮点

- **八步法 SDLC** — `/prd → /plan → /code → /test → /review → /build → /deploy → /release` 一条流水线, 辅以 `/fix` `/bug-check` `/prd-check` `/plan-check` `/start` `/meta-audit`
- **硬性闸门** — `prd-check` 拦占位符, `plan-check` 拦不完整任务, AI 无法默默跳过
- **可追溯链** — 需求锚点 → 任务 ID → 产出物 `@prd/@rules` → 验证 `it()`, 任何一环改动能反向扫下游
- **五件套协作** — 命令 (决策) + 技能 (脚本) + 子代理 (并行/独立视角) + 钩子 (静默守护) + 规则 (长期约束), 边界清晰
- **跨工种可移植** — 换 `workspace/` + 重写 `.claude/rules/` 内容, 即可用于后端 / 数据 / 移动 / 其他任意工种 (见 [ADAPTING.md](docs/ADAPTING.md))
- **档案自带上下文** — ADR 记决策, retrospectives 记健康度, tasks.json 记进度; 新 session 进来一眼看懂历史

---

## 框架五件套

| 部件                 | 位置                                   | 触发方式       | 适合                 |
| -------------------- | -------------------------------------- | -------------- | -------------------- |
| **命令** (commands) | [.claude/commands/](.claude/commands/) | 用户 `/<name>` | 主工作流 (纯思考)    |
| **技能包** (skills) | [.claude/skills/](.claude/skills/)     | 显式或 AI 自动 | 跑脚本拿数据         |
| **子代理** (agents) | [.claude/agents/](.claude/agents/)     | 主命令 spawn   | 并行 / 保护 context  |
| **钩子** (hooks)     | [.claude/hooks/](.claude/hooks/)       | 事件自动       | 静默守护 (不阻断)    |
| **规则** (rules)     | [.claude/rules/](.claude/rules/)       | AI 自动遵守    | 长期稳定的产出约束   |

边界和添加规范详见 [.claude/README.md](.claude/README.md)。

---

## 八步法骨架

```text
 /prd       口语需求 ──→ 结构化需求 (含 [待确认])
    │
    │  人工审, /prd-check 清零占位符
    ▼
 /plan      需求 ──→ 任务清单 (含 prdRef + 业务规则)
    │
    │  /plan-check 验收
    ▼
 /code      任务清单 ──→ 产出物 (头部挂 @prd / @task / @rules)
    ▼
 /test      产出物 @rules ──→ 验证用例 (每条规则一条)
    ▼
 /review    独立视角审查 (可 spawn code-reviewer)
    ▼
 /build     产物化
    ▼
 /deploy    交付到目标环境
    ▼
 /release   聚合 changelog + 打 tag
```

每步的**抽象语义跨工种通用**, 产出物按工种替换。完整操作手册见 [docs/WORKFLOW.md](docs/WORKFLOW.md)。

---

## 三大设计原则

<table>
<tr>
<td width="33%" valign="top">

### 可追溯 (Traceable)

需求锚点 → 任务 ID → 产出物 `@prd/@rules` → 验证用例, 一条线贯穿。

任何一环改了, 顺着链路扫下游, 不漏不错位。

</td>
<td width="33%" valign="top">

### 关键节点人审

AI 做全量执行, 但需求 / 拆解 / 评审 / 交付前都**停下等人点头**。

AI 不能默默绕过闸门, `/prd-check` `/plan-check` 是硬拦截, 不是提醒。

</td>
<td width="33%" valign="top">

### 失败显式可见

不隐藏错误, 不自动绕过, 不以「通过」掩盖 bug。

红的时候按 4 类分诊 (工具 → 环境 → 预期 → 产出), **产出是最后才怀疑的**。

</td>
</tr>
</table>

---

## 目录总览

```text
claude-code-work/
├── README.md                 ← 你在这 (框架本体介绍)
├── CLAUDE.md                 ← 项目规则 (Claude Code 启动时自动加载)
├── .claude/                  ← 框架本体 (领域无关的机制)
│   ├── commands/             ← 八步法命令 + 辅助命令
│   ├── skills/               ← 扩展技能包
│   ├── agents/               ← 专职子代理
│   ├── hooks/                ← 事件钩子
│   └── rules/                ← 产出约束 (换工种时重写内容, 保留结构)
├── docs/                     ← AI 工作流产物 + 历史档案
│   ├── WORKFLOW.md           ← 八步法操作手册
│   ├── ADAPTING.md           ← 跨工种适配清单 (fork 本框架时必读)
│   ├── DECISIONS.md          ← 架构决策记录 (ADR)
│   ├── prds/                 ← /prd 生成的需求文档
│   ├── tasks/                ← /plan 生成的任务清单 (JSON)
│   ├── bug-reports/          ← /fix 的输入
│   └── retrospectives/       ← /meta-audit 产出的只读快照
└── workspace/                ← 实际业务工程 (可替换为任何工种)
```

- **框架本体** = `.claude/` + `docs/` + `CLAUDE.md` + `README.md`
- **工种特化** = `workspace/` + `.claude/rules/*.md` 的具体内容

---

## 怎么用

### 前置要求

- [Claude Code CLI](https://docs.claude.com/en/docs/claude-code) 已安装并登录

### 三步起步

```bash
# 1. Fork 本仓库, 改名为你自己的
git clone https://github.com/suntaoTom/claude-code-work.git ai-<工种>-automation
cd ai-<工种>-automation

# 2. 按 ADAPTING.md 替换工种特化层
#    - 替换 workspace/ 为你工种的项目骨架
#    - 重写 .claude/rules/*.md 里的规则内容
#    - 更新 CLAUDE.md 的入职培训

# 3. 打开 Claude Code, 跑第一个需求
claude
> /start                       # 首次必做, AI 通读项目
> /prd <你的需求描述>          # 生成需求草稿
```

框架本体**无需额外安装**, 有 Claude Code CLI 就能跑。`workspace/` 的依赖由具体工种决定 (前端 `pnpm install`, 后端可能是 `mvn / go mod / pip install`, 等)。

---

## 分支说明

| 分支          | 定位                                                        |
| ------------- | ----------------------------------------------------------- |
| `main`        | 框架本体介绍 (与工种无关, 你在这)                           |
| `ai-frontend` | 前端工种实现 (UmiJS + React + antd + Vitest + Playwright)  |
| `feature`     | 开发集成分支                                                |
| `Harness`     | 框架本体迭代分支                                            |

想看具体工种的完整示例, 切到对应分支 (例: `git checkout ai-frontend`)。未来会陆续补 `ai-backend` / `ai-data` 等分支。

---

## 我该从哪里开始看

| 我是...                               | 第一个打开                                                                |
| ------------------------------------- | ------------------------------------------------------------------------- |
| **第一次接手框架**                   | [docs/WORKFLOW.md](docs/WORKFLOW.md) — 八步法操作手册                     |
| 想把框架迁移到某个工种                | [docs/ADAPTING.md](docs/ADAPTING.md) — 跨工种适配清单                     |
| 要改框架机制 (加命令 / skill / agent) | [.claude/README.md](.claude/README.md) — 五类部件的边界                   |
| 查框架怎么演变的                      | [docs/DECISIONS.md](docs/DECISIONS.md) — 架构决策记录 (ADR)               |
| 查历次健康度扫描                      | [docs/retrospectives/](docs/retrospectives/) — `/meta-audit` 只读观察报告 |
| 启用 GitHub 自动化                    | [.github/SETUP.md](.github/SETUP.md)                                      |

---

## 贡献

欢迎 Issue 和 PR。提交前请:

1. 跑 `/meta-audit` 看有没有引入健康度问题
2. 如果改了框架机制, 在 [docs/DECISIONS.md](docs/DECISIONS.md) 加一条 ADR 说明背景

---

## 许可证

[MIT](LICENSE) © 2026 suntaoTom
