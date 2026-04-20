# AI Frontend Automation

> 运行在 [Claude Code](https://docs.claude.com/en/docs/claude-code) 之上的**前端研发工作流框架** — 把「需求 → 设计 → 代码 → 测试 → 上线」全链路拆成可追溯的命令、技能、子代理和规则, 由 AI 执行, 人监督每个关键节点。

---

## 这是什么

一套给前端团队用的工程化框架, 解决两个老问题:

1. **AI 写代码没约束** → 一套硬闸门 (PRD 完备性 / `@rules` 追溯链 / P0 禁硬编码 / Hooks 静默守护) 把 AI 拉回轨道
2. **AI 写代码无记忆** → ADR / retrospectives / tasks.json status 等档案, 把每次决策沉淀成跨会话可读的历史

### 不是什么

- ❌ 不是单个「超级 agent」 — 主力是命令 + 多子代理协作
- ❌ 不是纯 skill 包 — 技能包只是其中一类部件
- ❌ 不是 UI 组件库 — 它是流程, 组件用的是 Ant Design 5

### 是什么

一个完整的 SDLC (软件开发生命周期) 框架, 由五类部件协作:

| 部件 | 位置 | 触发方式 | 数量 | 适合 |
|------|------|---------|------|------|
| **命令** (commands) | [.claude/commands/](.claude/commands/) | 用户 `/<name>` | 14 | 主工作流 (纯思考) |
| **技能包** (skills) | [.claude/skills/](.claude/skills/) | 显式或 AI 自动 | 4 | 跑脚本拿数据 |
| **子代理** (agents) | [.claude/agents/](.claude/agents/) | 主命令 spawn | 4 | 并行 / 保护 context |
| **钩子** (hooks) | [.claude/hooks/](.claude/hooks/) | 事件自动 | 3 | 静默守护 (不阻断) |
| **规则** (rules) | [.claude/rules/](.claude/rules/) | AI 自动遵守 | 5 | 长期稳定的编码约束 |

边界和添加规范详见 [.claude/README.md](.claude/README.md)。

---

## 目录总览

```
AI-Frontend-Automation/
├── README.md                 ← 你在这
├── CLAUDE.md                 ← 项目规则 (Claude Code 启动时自动加载)
├── .claude/                  ← AI 自动化配置
│   ├── commands/             ← 主流程命令 (14 个, /prd /plan /code ...)
│   ├── skills/               ← 扩展技能包 (ext-perf-audit 等 4 个)
│   ├── agents/               ← 子代理 (test-writer / code-reviewer / bug-fixer / meta-auditor)
│   ├── hooks/                ← 事件钩子 (硬编码检测 / 任务状态提醒 / 提交前检查)
│   └── rules/                ← 编码规范 (coding-style / file-docs / no-hardcode / tech-stack / testing)
├── docs/                     ← AI 工作流产物 + 历史档案
│   ├── WORKFLOW.md           ← 八步法操作手册 (新人必读)
│   ├── DECISIONS.md          ← 架构决策记录 (ADR)
│   ├── prds/                 ← /prd 生成的产品需求文档
│   ├── tasks/                ← /plan 生成的任务清单 (JSON)
│   ├── bug-reports/          ← 测试端 AI 或人工报的 bug
│   └── retrospectives/       ← /meta-audit 产出的健康度快照 (只读, 不可变)
└── workspace/                ← 实际前端工程 (UmiJS 4 + React 18 + TS 5)
    ├── src/
    ├── tests/                ← 镜像 src/ 结构
    ├── api-spec/             ← OpenAPI 契约 (openapi.json + 可选 openapi.local.json)
    └── config/
```

---

## 主线工作流 (八步法)

```
/prd <需求>              口语需求 → PRD 草稿 (含 [待确认])
   ↓  人工审 PRD, 清零 [待确认]
/plan @docs/prds/x.md    PRD → 任务清单 (tasks.json, 含 prdRef + businessRules)
   ↓
/code @docs/tasks/x.json 任务清单 → 源码 (JSDoc 写入 @prd / @task / @rules)
   ↓
/test <目录>             源码 @rules → 测试 it() (每条规则一个)
   ↓
/review <目录>           代码审查 (可 spawn code-reviewer 独立视角)
   ↓
/build <平台>            构建 + 本地预览 (web / ios / android / harmony)
   ↓
/deploy <平台> --env staging  推送 + 健康检查 + 通知
   ↓
/release <版本>          自动聚合 changelog + 打 tag (可选)
```

配套命令: `/fix` `/bug-check` `/prd-check` `/plan-check` `/start` `/meta-audit`

详细步骤见 [docs/WORKFLOW.md](docs/WORKFLOW.md)。

---

## 三大设计原则

1. **可追溯 (Traceable)**
   PRD 锚点 → 任务 ID → 源码 `@prd/@rules` → 测试 `it()`, 一条线贯穿。任何一环改了, 顺着链路扫下游。

2. **人监督关键节点**
   AI 做全量执行, 但 PRD 审、任务审、review、production 部署都停下等人点头。AI 不能默默绕过闸门。

3. **失败显式可见**
   不隐藏错误, 不自动绕过, 不以「通过」掩盖 bug。测试红了按 4 类分诊 (测试代码 → 环境 → 测试预期 → 源码), 源码是最后才怀疑的。

---

## 技术栈

UmiJS 4 · React 18 · TypeScript 5 · Ant Design 5 · Vitest · Playwright · MSW · pnpm · Vite 模式

详见 [.claude/rules/tech-stack.md](.claude/rules/tech-stack.md)。

---

## 快速开始

```bash
# 1. 安装依赖
pnpm install

# 2. 放 OpenAPI 契约 (后端给)
cp <后端文件> workspace/api-spec/openapi.json

# 3. 生成 TS 类型 + 启动项目
pnpm gen:api && pnpm dev

# 4. 开 Claude Code 跑第一个功能
claude
> /start                       # 让 AI 认识项目 (首次必做)
> /prd 我要做一个登录功能      # 生成 PRD 草稿
```

完整 30 分钟登机指南见 [docs/WORKFLOW.md](docs/WORKFLOW.md#-快速开始-第一次打开项目必读)。

---

## 我该从哪里开始看

| 我是... | 第一个打开 |
|--------|----------|
| **第一次接手项目** | [docs/WORKFLOW.md](docs/WORKFLOW.md) — 八步法操作手册 |
| 想知道这套框架怎么演变的 | [docs/DECISIONS.md](docs/DECISIONS.md) — 架构决策记录 (ADR) |
| 想了解编码规范 | [CLAUDE.md](CLAUDE.md) — 规则入口, 引到各条细则 |
| 要改框架机制 (加命令 / skill / agent) | [.claude/README.md](.claude/README.md) — 五类部件的边界 |
| 查历次健康度扫描 | [docs/retrospectives/](docs/retrospectives/) — `/meta-audit` 只读观察报告 |
| 前后端协作 / OpenAPI 流程 | [docs/WORKFLOW.md#🔌-前后端协作](docs/WORKFLOW.md#-前后端协作-重点) |
| 测试端 AI 怎么对接 | [docs/bug-reports/README.md](docs/bug-reports/README.md) |

---

## 许可证

MIT (可选, 按需修改)
