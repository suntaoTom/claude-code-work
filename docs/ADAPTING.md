# 跨工种适配清单

> 本仓库当前是「AI 驱动的**前端**研发工作流框架」。这套骨架的绝大部分机制是领域无关的, 换一套 `rules/` + `workspace/` 就能用于后端 / 数据 / 移动 / DevOps / QA / 设计 / 产品 / 写作 / 科研 等任何工种。
>
> 本文档列出**哪些照搬、哪些替换、哪些可选**, 以及一份从前端模板迁移到其他工种的步骤清单。

---

## 三层结构

把框架拆成三层, 决定每层能不能跨工种:

| 层 | 内容 | 跨工种可复用? |
|----|------|-------------|
| **内核层** | 协作机制 + 工作流骨架 + 可追溯 + 硬性闸门 + 设计原则 | ✅ 照搬, 不用改 |
| **领域层** | `rules/` 里的编码/测试/硬编码规范 | ⚠️ 保留结构, 替换内容 |
| **工种特化层** | `workspace/` 工作区 + `commands/` 里的领域假设 | ❌ 整个替换 |

---

## 第一部分: 直接照搬 (领域无关内核)

以下内容改都不用改, 拿去就能用:

### 1.1 协作机制 (`.claude/` 五件套)

| 机制 | 作用 | 跨工种怎么用 |
|------|------|-------------|
| `commands/*.md` | 固定流程的 prompt | 换内容不换结构, 八步法名字可留 |
| `skills/*/SKILL.md` | 可复用工具包 | 换工具, 结构不变 |
| `agents/*.md` | 专职子代理 | 换人设, 框架不变 |
| `hooks/*` | 生命周期钩子 | 照搬 |
| `rules/*.md` | 硬规矩 | 结构照搬, 内容重写 |

### 1.2 八步法骨架 (命令名可以照抄)

```
/prd → /plan → /code → /test → /review → /build → /deploy → /release
   ↓       ↓        ↓       ↓        ↓         ↓        ↓         ↓
 需求   拆解    实现   验证   评审   产物    交付    发布
```

**每步的抽象含义是跨工种的**, 只是「产出物」变了 (见第三部分映射表)。

辅助命令同样通用: `/prd-check` `/plan-check` `/bug-check` `/fix` `/start` `/meta-audit`。

### 1.3 可追溯链

```
需求文档锚点  →  任务 ID  →  产出物里的引用 (@prd/@rules/@task)  →  验证用例
```

不管是代码、SQL、Terraform、Figma 文件、还是论文稿, 都能挂这条链。关键是**每个产出物都标注来源**。

### 1.4 硬性闸门思路

`/prd-check` 在进 `/plan` 前拦, `/plan-check` 在进 `/code` 前拦。

**通用原则**: 任何两个阶段之间, 都应该有一个 `check` 命令拦截「上游未完成的占位符」和「下游依赖的契约缺失」。具体检查项按工种改, 机制不变。

### 1.5 设计原则 (所有工种共用)

1. **可追溯**: 任何产出都能反查到需求
2. **关键节点人审**: 需求 / 拆解 / 评审 / 发布 这几步必须人拍板
3. **失败显式可见**: 不降级、不跳过、不默默兜底

### 1.6 文档基建

| 文件 | 作用 | 跨工种用法 |
|------|------|-----------|
| `docs/DECISIONS.md` | ADR | 记架构/流程决策, 不限工种 |
| `docs/retrospectives/` | meta-audit 报告 | 定期自检, 不限工种 |
| 目录级 `README.md` | 文件清单 | 任何目录都该有 |
| 产出物头部 JSDoc / 注释块 | `@prd` `@task` `@rules` 锚点 | 语法不同 (Python 用 docstring, SQL 用块注释, Figma 用组件 description), 语义相同 |

---

## 第二部分: 保留结构、替换内容 (领域层)

以下文件保留文件名和大纲, 按本工种重写内容:

### 2.1 `.claude/rules/tech-stack.md`

**替换**: 框架 / 库 / 工具链

| 工种 | 替换为 |
|------|-------|
| 前端 | UmiJS + React + antd (当前) |
| 后端 | Spring Boot / Express / Gin / FastAPI / Rails |
| 数据工程 | dbt / Airflow / Spark / Flink / Kafka |
| 移动 (iOS) | Swift + SwiftUI + Combine |
| 移动 (Android) | Kotlin + Jetpack Compose |
| 跨端 | Flutter / React Native |
| DevOps/SRE | Terraform + Ansible + Helm + ArgoCD |
| QA | Playwright / Cypress / Selenium + Allure |
| 设计 | Figma + Design Token 工具链 |
| 产品 | Notion / 飞书 / Jira + 数据看板 |
| 技术写作 | Markdown + MkDocs / Docusaurus + mermaid |
| 科研 | Python + Jupyter + LaTeX + Git LFS |

### 2.2 `.claude/rules/no-hardcode.md`

**替换**: 「什么算硬编码」的具体场景

| 工种 | 不得写死的内容 |
|------|--------------|
| 前端 | 文案 / 颜色 / API 地址 / 枚举值 / 尺寸 / 魔法数 |
| 后端 | 配置 / 密钥 / DB 连接串 / 限流阈值 / 超时 / 错误码 |
| 数据 | schema 路径 / 表名前缀 / 分区字段 / 重跑阈值 |
| 移动 | 文案 / 主题色 / API / 版本号 / feature flag |
| DevOps | 资源规格 / 域名 / 账号 ID / region / AMI |
| QA | 账号 / 环境 URL / 等待时间 / 断言阈值 |
| 设计 | 颜色值 (用 token) / 字号 / 圆角 / 间距 |
| 写作 | 链接 / 版本号 / 产品名 (用变量/宏) |

**通用原则**: 任何「会变、会不同环境/不同租户、可能被多处引用」的值, 都不准硬编码。配置要分层 (全局 → 模块 → 实例), 不得大量重复。

### 2.3 `.claude/rules/coding-style.md` (或改名为 `authoring-style.md`)

**替换**: 本工种的命名规范、文件组织、注释惯例

- 写码工种 (前端/后端/移动/数据/DevOps) → 保留「编码规范」命名
- 非码工种 → 改成对应的「产出规范」:
  - 设计: design-style.md (命名层次 / 图层规范 / 组件复用)
  - 产品: prd-style.md (结构化写作 / 用户故事格式)
  - 写作: writing-style.md (语气 / 结构 / 引用)
  - 科研: research-style.md (实验记录 / 数据管理 / 复现标准)

### 2.4 `.claude/rules/testing.md` (或改名为 `validation.md`)

**替换**: 本工种的验证方式

| 工种 | 验证方式 |
|------|---------|
| 前端 | Vitest + Playwright |
| 后端 | JUnit / pytest / go test + 集成测试 + 契约测试 |
| 数据 | dbt test / great_expectations / 数据质量断言 |
| 移动 | XCTest / Espresso / Flutter test + 真机回归 |
| DevOps | terratest / conftest / policy-as-code + 演练 |
| QA | 测试报告 + 用例覆盖矩阵 |
| 设计 | 可用性测试 + a11y 审计 + 设计评审 checklist |
| 产品 | 验收 case + 数据埋点验证 |
| 写作 | 同行评审 + 链接/术语一致性检查 |
| 科研 | 结果复现 + 统计显著性检验 |

**通用原则**: 验证断言的**唯一来源是需求规则 (@rules)**, 不是 AI 读产出物的推测。这条不管什么工种都不变。

### 2.5 `.claude/rules/file-docs.md`

**替换**: 注释/元数据的语法, 保留语义

| 工种 | 怎么挂 `@prd` `@task` `@rules` |
|------|------------------------------|
| 前端/后端 | 文件头 JSDoc / docstring |
| 数据 (SQL) | 文件头块注释 `/* @prd ... */` |
| 数据 (dbt) | model 的 `description` YAML 字段 |
| 移动 (Swift) | `/// @prd ...` |
| DevOps (Terraform) | `# @prd ...` 块 + `description` 参数 |
| 设计 (Figma) | 组件 description 字段 + page 层级描述 |
| 产品 (PRD) | 本身就是 PRD, `@task` 挂在 user story 上 |
| 写作 | frontmatter `prd: xxx, task: xxx` |
| 科研 | 实验脚本 docstring + Jupyter 第一个 cell |

---

## 第三部分: 八步法的工种映射表

每步的抽象语义不变, 产出物按工种替换:

| 步骤 | 抽象语义 | 前端 | 后端 | 数据 | 移动 | DevOps | QA | 设计 | 产品 | 科研 |
|------|---------|------|------|------|------|--------|-----|------|------|------|
| `/prd` | 固化需求 | PRD | API 需求书 | 指标定义 | 功能规格 | SLO/runbook 需求 | 质量目标 | 设计简报 | MRD/PRD | 研究问题+假设 |
| `/plan` | 拆任务 | 组件/hook/api 清单 | controller/service/model 清单 | DAG + 表结构 | 页面/组件清单 | IaC 模块拆分 | 测试计划+用例矩阵 | 信息架构+组件清单 | 功能拆解+优先级 | 实验设计 |
| `/code` | 实现 | TypeScript 代码 | Java/Go/Python 代码 | SQL / dbt / Airflow DAG | Swift/Kotlin/Dart | Terraform/Helm | 自动化脚本 | Figma 组件 | PRD 正文 | 实验脚本/分析 |
| `/test` | 验证 | Vitest + Playwright | JUnit/pytest + 集成 | dbt test / GE | XCTest/Espresso | terratest/conftest | 执行+报告 | 可用性测试 | 验收 case | 结果复现 |
| `/review` | 评审 | 代码审查 | 代码审查 | SQL/DAG 审查 | 代码审查 | IaC 审查 | 测试报告审查 | 设计评审 | PRD 评审 | 同行评议 |
| `/build` | 产物化 | 静态资源 bundle | Docker image | 任务镜像/jar | .ipa / .apk | helm chart / plan output | 用例库 | 设计规范交付包 | 文档打包 | 论文稿 |
| `/deploy` | 交付 | CDN/OSS | K8s/Serverless | 调度平台注册 | TestFlight/内测 | apply 到目标环境 | 测试环境部署 | token 发布 | 需求登记 | 投稿 |
| `/release` | 发布 | 正式版+灰度 | 正式版+金丝雀 | 上线指标 | App Store/Play | 变更通告+回滚预案 | 质量签章 | DS 版本号 | 需求宣讲 | 发表+回复评审 |

---

## 第四部分: 可选模块 (按工种取舍)

以下模块某些工种用不上, 直接删:

| 模块 | 用得上的工种 | 用不上的工种 |
|------|------------|------------|
| OpenAPI 类型生成 | 有契约对接的前端/后端/移动 | 设计/产品/写作/科研 |
| 国际化规范 | 面向用户的产品 (前端/移动/文案) | 后端/DevOps/数据 (一般无此需求) |
| Design Token | 前端/移动/设计 | 后端/数据/DevOps |
| 无障碍审计 (`ext-a11y-check`) | 前端/移动/设计 | 其他 |
| 性能审计 (`ext-perf-audit`) | 前端/移动/后端/数据 | 写作/产品/设计 |
| 依赖审计 (`ext-dep-audit`) | 所有有依赖管理的工种 | — |

**原则**: 不确定要不要留, 先留着; 确定不用, 整块删 (不要留空壳)。

---

## 第五部分: 迁移步骤 (从本仓库 fork 到新工种)

```
1. Fork 本仓库, 改名
   └─ 新仓库命名建议: ai-<工种>-automation  (例: ai-backend-automation)

2. 保留不动
   ├─ .claude/commands/*.md            (八步法骨架, 改内容不改文件)
   ├─ .claude/agents/*.md              (bug-fixer / code-reviewer / meta-auditor / test-writer 等, 改人设不改机制)
   ├─ .claude/hooks/*                  (生命周期钩子, 一般能直接用)
   ├─ docs/WORKFLOW.md                 (改每步的产出物描述, 保留流程)
   ├─ docs/DECISIONS.md                (清空内容, 保留格式)
   └─ docs/retrospectives/             (清空)

3. 重写 .claude/rules/*.md
   ├─ tech-stack.md          ← 换技术栈
   ├─ no-hardcode.md         ← 换「禁止硬编码」的具体场景
   ├─ coding-style.md        ← 换为本工种的产出规范 (必要时改名)
   ├─ file-docs.md           ← 换为本工种的元数据挂载方式
   └─ testing.md             ← 换为本工种的验证方式 (必要时改名)

4. 重写 workspace/
   ├─ 前端 → workspace/ 是 UmiJS 项目
   ├─ 后端 → workspace/ 是 Spring/Express/Gin 项目
   ├─ 数据 → workspace/ 是 dbt/Airflow 项目
   ├─ 设计 → workspace/ 是 Figma 文件 + design token 源码
   └─ 写作/科研 → workspace/ 是 Markdown/LaTeX 文件集

5. 改 CLAUDE.md (入职培训)
   ├─ P0 规则可能要换 (例: 后端可能 P0 是「禁止直连数据库」而非「禁止硬编码文案」)
   ├─ 目录结构说明 refresh
   └─ 八步法示例改成本工种的场景

6. 改 docs/prds/_template.md
   └─ 不同工种的「需求文档」模板差异大, 按工种重写:
      后端:  API 定义 / 错误码 / 限流 / SLA
      数据:  指标定义 / 数据源 / 血缘 / 刷新频率
      移动:  端兼容性 / 版本分发 / 离线策略
      设计:  用户目标 / 交互流程 / 设计原则
      写作:  受众 / 立场 / 大纲 / 术语

7. 跑通一次端到端试跑
   ├─ 挑一个最小需求
   ├─ 走 /prd → /prd-check → /plan → /plan-check → /code → /test
   └─ 卡壳的地方立即记入 docs/DECISIONS.md

8. 跑一次 /meta-audit, 看框架是否自洽
```

---

## 第六部分: 不要做什么

- ❌ **过早抽「框架核 + 领域包」两层结构** — 没跑过 2-3 个工种之前, 不知道真正通用的边界在哪, 硬抽大概率抽错
- ❌ **把前端的规则硬搬给后端** — 看着文件还在, 但内容不对, AI 会按错的规则生成产出物
- ❌ **保留用不上的模块** (例: 给后端留 Design Token 规则) — 留空壳比没有更误导
- ❌ **换了 workspace 不换 CLAUDE.md** — CLAUDE.md 是入职培训, 旧培训会污染所有命令
- ❌ **一次改完所有工种** — 先跑通一个, 磨 2-3 个月, 再 fork 下一个

---

## 第七部分: 判断一个工种适不适合用本框架

**适合**:
- 有明确的**需求 → 拆解 → 实现 → 验证 → 交付**流程
- 产出物可以被文本化、可以挂元数据、可以挂锚点
- 有「契约」概念 (API / schema / token / 术语表 / 评审标准)
- 团队协作, 需要追溯

**不适合** (或性价比低):
- 纯创意工种, 流程高度非线性 (画家 / 作曲)
- 产出物无法文本化、无法版本化
- 单人项目, 没有协作追溯需求
- 需求极度快速变化, 文档化收益 < 成本

---

## 相关文档

- [README.md](../README.md) — 框架总览
- [WORKFLOW.md](WORKFLOW.md) — 八步法操作手册
- [DECISIONS.md](DECISIONS.md) — 架构决策记录 (迁移时在这里记)
- [.claude/README.md](../.claude/README.md) — 五件套说明
