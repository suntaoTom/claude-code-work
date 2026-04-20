# 架构决策记录 (ADR)

> 记录框架重大设计决策 + 理由 + 替代方案。未来的 AI / 新人读这里就知道「为什么这么做」, 避免重走弯路或误改。

## 什么时候该加一条

| 应该记录 ✅ | 不用记录 ❌ |
|-----------|------------|
| 引入新机制 (命令 / skill / agent / hook / 规则分类) | 改 bug / 改措辞 / 文件重命名 |
| 变更既有机制形态 (如 `.md` → skill 包) | 日常代码改动 (commit message 即可) |
| 约束性设计选择 (只读 / 单向依赖 / 硬闸门) | 还没验证的想法 (先开 issue) |
| 反复过的决策 (必须写明为什么反复) | |

## 模板

```markdown
## YYYY-MM-DD: 一句话标题

**背景**: 触发这次决策的问题
**决策**: 做了什么, 具体到文件
**理由**: 为什么选这条
**替代方案**: 考虑过但没选的 + 放弃原因
**影响**: 关联文件/目录
```

## 规则

- 按时间倒序, 最新的在上面
- 一旦写入, 不要改旧条目内容 (决策是历史事实, 改动要另起新条目标注「推翻 YYYY-MM-DD 的 XXX 决策」)
- 每条控制在 15 行以内, 细节放链接里

---

## 2026-04-20: 引入元审计机制 (meta-auditor + /meta-audit)

**背景**: 框架越长越大, 命令/技能/代理/规则互相引用, 担心规则漂移、死引用、内部不一致。人眼巡检不现实。

**决策**: 新增只读子代理 `meta-auditor`, 扫 6 维度 (规则违规 / 文档漂移 / 内部一致性 / 追溯链 / 死引用 / 孤儿资产), 通过 `/meta-audit` 手动触发, 报告写到 `docs/retrospectives/YYYY-MM-DD-meta-audit.md`。

**理由**:
- 只读观察者, 不自动修复 — 避免「自我修改循环」「无限优化」反模式
- 硬约束在工具层不靠 prompt — agent 的 `tools: [Read, Grep, Glob, Write]`, Write 只能写报告路径
- 手动触发不定时跑 — 报告没人看就是噪音
- 报告不可变 — 下次扫描生成新报告, 自然对比趋势

**替代方案**: Agent 自动修复 (反模式风险高) / 集成进 `/review` (职责混淆) — 均放弃。

**影响**: `.claude/agents/meta-auditor.md`, `.claude/commands/meta-audit.md`, `docs/retrospectives/`

---

## 2026-04-20: ext-* 从斜杠命令升级为 Skill 包

**背景**: 4 个扩展工具 (`ext-dep-audit` / `ext-perf-audit` / `ext-a11y-check` / `ext-changelog`) 原为 `.md` 命令, 但这些任务有确定性步骤 (`pnpm audit` / `git log` / bundle size), 纯 prompt 让 AI 推断结果不可靠。

**决策**: 迁到 `.claude/skills/ext-*/` 包格式: `SKILL.md` + `scripts/*.sh` + `references/*.md`。删除原 `.claude/commands/ext-*.md`。

**理由**:
- 脚本产出数据 → AI 做解读, 结果可复现
- 渐进式加载 — SKILL.md 的 frontmatter 小, body 按需加载
- description 自动触发, 用户不必记命令名

**替代方案**: 主流程命令 (`/prd` `/plan` `/code` `/test`) 也迁 skill 包 — 不迁, 它们是纯思考类工作流, 没脚本可抽, 留在 `commands/` 更合适。

**影响**: `.claude/skills/ext-*/`, `.claude/skills/README.md`

---

## 2026-04-20: PRD 完备性检查抽为独立命令 (/prd-check)

**背景**: `/plan` 原把 PRD 完备性检查 (5 项硬闸门) 内嵌为第零步。用户改 PRD 过程中想自检只能跑整个 `/plan`, 反馈慢。

**决策**: 抽 `.claude/commands/prd-check.md` 为独立命令, `/plan` 第零步改为**调用** `/prd-check`。两处共用同一套规则。

**理由**:
- 实时反馈 — 改 PRD 随时自检
- 单一事实源 — 检查逻辑一处, 避免分叉
- 入口拦截比下游 (task / 代码 / 测试) 成本低

**影响**: `.claude/commands/prd-check.md`, `.claude/commands/plan.md`

---

## 2026-04-20: @rules 定为测试断言唯一来源

**背景**: 原本源文件 JSDoc 只有 `@prd`, 测试时 AI 读源码推测预期, 源码有 bug 时测试跟着错。

**决策**: 源文件 JSDoc 强制写 `@rules` (业务规则原文, 不得 AI 改述), `/test` 以 `@rules` 为断言**唯一来源**, 每条规则一个 `it()`。

**理由**:
- 需求 → 代码 → 测试对齐变成单一事实源, 不给 AI 推测的口子
- 业务规则改了, 源码 `@rules` 跟着改, 测试自动失效 → 强制对齐
- `@prd` 指原文, `@rules` 写在代码里, 双重锚定防断链

**替代方案**: `/test` 直接读 PRD — 放弃, 跨文件转换增加不确定性。

**影响**: `.claude/rules/file-docs.md`, `.claude/rules/testing.md`, `.claude/commands/code.md`, `.claude/commands/test.md`

---

## 2026-04-20: 4 个子代理分工 (test-writer / code-reviewer / bug-fixer / meta-auditor)

**背景**: 大目录 review / 并行修多 bug / 重型只读扫描放主 context 会爆, 或没法并行加速。

**决策**: 建 `.claude/agents/` + 4 个子代理, 由主命令 `Agent` 工具 spawn, 各自跑独立 context。

| 代理 | 工具权限 | 谁 spawn | 为什么 |
|------|---------|---------|-------|
| test-writer | R / W / E / Bash | `/code` 后 / `/test` | 测试可并行 |
| code-reviewer | R 只读 | `/review` | 独立视角 + 只读防误改 |
| bug-fixer | R / W / E / Bash | `/fix` | 多 bug 并行加速 |
| meta-auditor | R + W(仅报告) | `/meta-audit` | 重型扫描 + 只读硬约束 |

**理由**: 工具权限最小化 — 只读代理拿不到 Edit, 技术层面防误改; 独立 context 输出更聚焦不被主会话污染。

**影响**: `.claude/agents/*.md`, `.claude/agents/README.md`

---

## 2026-04-20: .claude/ 机制明确分 5 类 (commands / skills / agents / hooks / rules)

**背景**: 各种 `.md` 文件职责模糊, 新人不知该往哪塞, 也搞不清触发方式。

**决策**: 5 类机制 + 5 个目录 + `.claude/README.md` 入口导航。触发方式、并行性、上下文隔离各不同, 不能乱塞。

| 机制 | 适合 | 触发方式 |
|-----|------|---------|
| 命令 (commands/) | 主工作流 (纯思考) | 用户 `/<name>` |
| 技能包 (skills/) | 需跑脚本拿数据 | 显式或 AI 自动 |
| 代理 (agents/) | 并行 / 保护主 context | 主命令 Agent spawn |
| 钩子 (hooks/) | 静默自动检查 | settings.json 事件 |
| 规则 (rules/) | 编码约束 | CLAUDE.md 引用 |

**影响**: `.claude/README.md`, 各子目录 `README.md`
