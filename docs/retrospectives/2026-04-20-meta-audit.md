# 工程元审计报告 - 2026-04-20

> 由 meta-auditor agent 自动生成, 仅为观察与建议, 未对任何文件做修改。
> 请人工 review 后决定哪些建议值得采纳, 采纳的改动走正常 PR 流程固化。

## 快速结论

- 🔴 必修: 5 条
- 🟡 建议修: 9 条
- 🔵 讨论: 4 条
- 趋势 vs 上次: 首次运行, 无历史可对比

## 🔴 必修 (5 条)

### [doc-drift] WORKFLOW.md 未登记 `/meta-audit` 命令

- **位置**: `docs/WORKFLOW.md:764`
- **现状**: WORKFLOW.md 底部「全部命令」仅列 13 个命令 (`/prd /prd-check /plan /plan-check /code /test /review /bug-check /fix /release /build /deploy /start`), 没有 `/meta-audit`。整个 WORKFLOW.md 全文 0 次提到 `/meta-audit`。
- **规则**: `.claude/README.md:50` 声明命令共 14 个, 含 `/meta-audit`; `DECISIONS.md` 2026-04-20 条目专门记录了引入 `/meta-audit`; `docs/retrospectives/README.md` 讲触发方式就是 `/meta-audit`。
- **建议**: 在 WORKFLOW.md 的「全部命令」表补入 `/meta-audit`; 另建议在「🛟 常见场景速查」加一行「想看工程整体健康度 → `/meta-audit`」。
- **影响**: 用户按 WORKFLOW.md 操作手册学习时, 永远找不到元审计命令。新加机制在入口文档里彻底失声, 和引入它的初衷相矛盾。

### [doc-drift] `.claude/agents/meta-auditor.md` 的扫描命令与项目实际根目录不匹配

- **位置**: `.claude/agents/meta-auditor.md:43-47`
- **现状**: 维度 1 的扫描命令写的是 `Grep(pattern="...", path="workspace/src")`, 但维度 1 的「手写 API 类型」检查写的是 `glob="workspace/src/features/*/api/*.ts"`。glob 参数是相对 cwd 的相对路径, 如果主 agent 从仓库根运行, 这些 pattern 是 OK 的; 但 `.claude/agents/meta-auditor.md:81/87/93` 里的 `@prd docs/prds/...` 等多处示例和 `docs/prds/*.md` 等路径也都是相对 cwd, 与 meta-auditor 的工具调用规约不一致 (工具调用并没有约束 cwd)。
- **规则**: agent prompt 自包含原则 (agents/README.md:68「prompt 要自包含」)
- **建议**: 在 meta-auditor.md 开头声明「所有路径以仓库根为基准, 扫描时传入绝对路径或由主 agent 用 cwd 锁定」, 或者把所有 Grep 的 path 改成绝对路径示例。
- **影响**: 子 agent 在不同 cwd 下 spawn, 扫描路径解析不一致, 维度 4/5 很容易误判死引用或追溯链。

### [traceability] `workspace/src/features/list/` 下所有源文件缺 `@prd / @task / @rules`, 追溯链断裂

- **位置**: `workspace/src/features/list/api/listApi.ts`, `components/SearchForm.tsx`, `components/DataTable.tsx`, `hooks/useListData.ts`, `types/types.ts`, `constants.ts`, `pages/list/index.tsx` — 共 7 个文件
- **现状**: JSDoc 只有 `@description / @module / @dependencies`, 全部缺 `@prd / @task / @rules`。Grep 全项目 `@prd` 命中 6 处均在 auth 模块, list 模块 0 处命中。
- **规则**: `.claude/rules/file-docs.md`「业务锚点字段说明」明确「编码时必须同步写入」; `CLAUDE.md:60-65` 将其列为文件说明规范的必填项。
- **建议**: 对应 PRD 目前项目里没有 `docs/prds/list.md`, 至少需要:
  - 方案 A (补规则): 给 list 模块补一份简单 PRD, 然后逐文件回填 `@prd docs/prds/list.md#xxx` + 对应 `@rules`
  - 方案 B (标注历史): 在文件头注明「本文件为框架搭建期示例, 无 PRD 支撑, 测试不依据 @rules 生成」, 避免误导
- **影响**: `/test` 对 list 模块无法按 `@rules` 生成测试, 当前 `workspace/tests/features/list/*` 里的 it() 全都是 AI 读源码推测的预期 — 源码一旦有 bug, 测试会跟着错, 这正是 2026-04-20 DECISIONS「@rules 定为测试断言唯一来源」要避免的反模式。

### [doc-drift] 测试文件位置违反 `testing.md` 「与源文件同目录」规则

- **位置**: `workspace/tests/features/list/**/*.test.ts(x)` — 7 个测试文件
- **现状**: 全部集中在 `workspace/tests/features/...` 下, 与源文件 `workspace/src/features/list/...` 分离。
- **规则**: `.claude/rules/testing.md:47-63` 明确「单元/组件测试与源文件同目录, 文件名 `<源文件>.test.ts(x)`, E2E 统一放 `workspace/tests/e2e/`」; `agents/test-writer.md:49-53` 的表格也是同目录规则。
- **建议**: 二选一
  - 把测试文件移到源文件同目录 (`workspace/src/features/list/components/SearchForm.test.tsx` 等), 符合规则
  - 或更新 `testing.md` + `test-writer.md`, 允许「tests/ 镜像 src/ 目录结构」作为替代布局 (但要给明理由)
- **影响**: test-writer agent 按 `testing.md` 生成测试时会自动写到源文件同目录, 长期会与现有位置分裂, 形成两套布局。

### [doc-drift] `features/auth/README.md` 声称的导出与实际严重不符

- **位置**: `workspace/src/features/auth/README.md:24-30`
- **现状**: README 「对外暴露」列出 `api/authApi` (✓ 已实现), `hooks/useAuth` (✗ 未实现, T012 为 pending), `components/LoginForm` + `components/RegisterForm` (✗ 未实现, T013/T014 为 pending), `constants` + `utils/tokenStorage` (✓ 已实现)。实际目录下 `components/` 和 `hooks/` 都不存在 (Glob 0 匹配)。README「核心业务流程」也描述了 `access.ts 派生 isLogin/canAdmin`, 但当前 `access.ts` 只有 `canAdmin`, 且 `canAdmin: initialState?.role === 'admin'` 直接硬编字面量字符串 `'admin'`, 没有从 auth/constants 的 `ROLE.ADMIN` 引入。
- **规则**: `.claude/rules/file-docs.md` 「模块 README 必须反映对外暴露」; `.claude/rules/no-hardcode.md` 禁止硬编字符串业务枚举。
- **建议**:
  - README 里把未实现的导出加状态标注 (例如 `🚧 pending`) 或直接删除, 并同步 `workspace/src/README.md` 的索引表 (当前该索引只列 list 一项, 未列 auth)
  - `workspace/src/access.ts` 从 `@/features/auth/constants` 引入 `ROLE.ADMIN` 替换字面量 `'admin'` (同时也该写 `@prd / @task / @rules`)
- **影响**: 新人看 README 会以为 auth 模块已经完整, 但引用 `useAuth` / `LoginForm` 会立刻报错; `access.ts` 硬编 `'admin'` 让角色一旦后端改名 (例如 `administrator`), 审计工具抓不住, 只会运行时静默失效。

## 🟡 建议修 (9 条)

### [orphaned-assets] `workspace/src/README.md` 全局索引缺 auth 模块

- **位置**: `workspace/src/README.md:5-8`
- **现状**: 功能模块表只列了 `list`, 没有 `auth`, 虽然 `features/auth/` 已存在。
- **规则**: `.claude/rules/file-docs.md` 「全局索引」强制更新。
- **建议**: 补一行 `| auth | 登录 / 注册 / 登出 / 路由守卫 | 开发中 |` (状态结合 tasks-login-2026-04-15.json 的 pending/done 比例定)。
- **影响**: 全局索引是 AI 理解项目结构的入口之一, 少模块会让 AI 错过 auth 的存在。

### [internal-consistency] workspace/src/README.md 未登记 `features/auth/`、页面路由也缺 `/login`、`/register` 等

- **位置**: `workspace/src/README.md:16-21`
- **现状**: 页面路由只列 `/` 和 `/list`, 未列 `/login /register /403` (虽然还没实现对应 page, 但 tasks-login 里已规划 T015-T017)
- **规则**: 同上 file-docs.md
- **建议**: pages 实现后追加; 当前阶段可在模块表里用「开发中」状态描述即可。
- **影响**: 与上条形成一致性缺口, 合并处理即可。

### [traceability] `docs/tasks/tasks-list-2026-03-30.json` 无 `prdRef` 字段, 与 login 任务清单不一致

- **位置**: `docs/tasks/tasks-list-2026-03-30.json`
- **现状**: 整个 JSON 没有 `prdRef`, 任务条目也没有 `prdRef` / `businessRules` 字段, 而 `tasks-login-2026-04-15.json` 两者都齐。
- **规则**: `.claude/commands/plan.md` 声明每个任务应带 `prdRef + businessRules` (WORKFLOW.md Step 2 也说「每个任务带 prdRef + businessRules」)
- **建议**: list 是早期任务清单 (2026-03-30), 在 2026-04-20 的 @rules-as-single-source 决策之前。建议二选一:
  - 补一份 `docs/prds/list.md`, 把 tasks-list 回填 `prdRef` + `businessRules`
  - 或在任务清单文件头注明「本任务清单为 @rules 机制建立前的历史产物, 不再回填」
- **影响**: `/code` 跑新的 list 任务分支时没 businessRules 可引用, `/test` 也无从按规则生成测试。

### [doc-drift] `workspace/src/features/list/types/types.ts` 未使用 `@/types/api`

- **位置**: `workspace/src/features/list/types/types.ts:7-30`
- **现状**: 手写了 `ListItem / ListQueryParams / ListResponse` interface, 没有从 `@/types/api` 的 `paths` 提取。
- **规则**: `CLAUDE.md:108-112` 「API 类型**必须**从 `@/types/api` 导入, **禁止**手写 request/response 类型」; maintainer 级铁律。
- **建议**: 检查 openapi.json 是否已有对应 list 接口 (当前 openapi.json 是 RWA/返佣相关, 没有 list)。如果没有:
  - 推后端补 list 接口, 走方案 B (local stub) + `pnpm gen:api`
  - 或正式声明 list 模块是「框架示例」而非真实业务, 放开此限制
- **影响**: 一旦后端提供 list 接口, 手写类型与生成类型会产生双份维护, 违反单一事实源。

### [rule-violations] `workspace/src/access.ts` 文件头缺业务锚点

- **位置**: `workspace/src/access.ts:1-4`
- **现状**: JSDoc 只有 `@description / @module`, 无 `@prd / @task / @rules`, 但它承担了 PRD 功能点 4「路由守卫与角色权限」的角色判定逻辑。
- **规则**: `.claude/rules/file-docs.md`; 相关规则有「管理员 (role=admin) 可访问全部页面」等。
- **建议**: 补 `@prd docs/prds/login.md#功能点-4-路由守卫与角色权限` + `@task docs/tasks/tasks-login-2026-04-15.json#T010` + `@rules ...`; 同时修正字面量硬编码 (见 🔴 第 5 条)。
- **影响**: 追溯链在这个关键文件上断了一截。

### [doc-drift] 目录级 README 的「最后更新」日期不一致

- **位置**: `workspace/src/features/list/api/README.md:9` (2026-04-07), `features/list/README.md` 无日期, `features/auth/api/README.md:9` (2026-04-16)
- **现状**: 日期维护不均, 有的改了有的没改。
- **规则**: `.claude/rules/file-docs.md` 模板要求有「最后更新」列。
- **建议**: 统一处理方式 — 要么坚持每次改代码都改日期, 要么删掉「最后更新」列改用 git blame (更可靠)。团队讨论定。
- **影响**: 低, 但文档可信度会随时间衰减。

### [orphaned-assets] `docs/bug-reports/README.md` 提到的 `2026-04-16-login.md` 等示例实际不存在

- **位置**: `docs/bug-reports/README.md:11-13` 的目录示例
- **现状**: 示例列举了 `2026-04-16-login.md` 和 `2026-04-17-user-list.md` 及 `screenshots/`, 但 Glob `docs/bug-reports/*.md` 只返回 `README.md` 和 `_template.md`, screenshots 目录不存在。
- **规则**: 一致性 — 示例路径宜加标注或用虚构名。
- **建议**: 把示例包成 `<!-- 示例 -->` HTML 注释, 或改用明显的虚构命名 (如 `<yyyy-mm-dd>-<module>.md`)。
- **影响**: 轻度混淆, AI 读到后可能误以为有真实报告。

### [orphaned-assets] `workspace/src/types/` 目录缺 README.md

- **位置**: `workspace/src/types/`
- **现状**: 目录下只有生成产物 `api.ts` 和 `typings.d.ts`, 无 README。
- **规则**: `.claude/rules/file-docs.md` 列表里 `types/` 是必须有 README 的目录。
- **建议**: 加一份 README, 主要说明 `api.ts` 是生成产物 + 「禁止手改」提醒, 以及 `typings.d.ts` 的作用。
- **影响**: 低, 但对新人是良好的止损提醒。

### [internal-consistency] `/meta-audit` 命令 prompt 里使用 `Agent(subagent_type=...)` 语法但协调逻辑位置不清

- **位置**: `.claude/commands/meta-audit.md:22-29`
- **现状**: 命令 prompt 内示意 `Agent(subagent_type="meta-auditor", ...)`, 这是 Claude Code 的 Task 工具调用形式的简写, 但 commands/meta-audit.md 首行是直接面向主 agent 的用户指令「你现在是元审计协调员」, 两者的协议形态不同。其他 commands (如 fix.md / code.md) 也有类似简写, 需要团队确认哪种约定。
- **规则**: 无强制规则, 这是框架内部约定。
- **建议**: 在 `.claude/README.md` 的「命令 vs 技能 vs 代理」章节补一条「主命令 spawn 子代理的标准写法」, 让新人不用猜。
- **影响**: 低, 当前能正常运行, 但新写命令时容易偏航。

## 🔵 讨论 (4 条)

### [discussion] 追溯链「源文件 @rules 数量 ≈ 测试 it() 数量」在 list 模块完全崩塌

- **位置**: `workspace/src/features/list/*` 与 `workspace/tests/features/list/*`
- **现状**: list 模块源文件 0 个 `@rules`, 测试共 32 个 `it()`。按 2026-04-20 的「@rules 作为测试唯一来源」决策, list 所有测试都违反这一原则。
- **值得讨论的问题**: 是允许 list 作为「框架示例」继续存在, 还是必须补齐规则? 如果允许, 是否需要在 `test-writer` 里加白名单, 以免未来误判?

### [discussion] `tasks-login-2026-04-15.json` 的 T009-T018 状态 = pending, 占比 10/18 ≈ 56%

- **位置**: `docs/tasks/tasks-login-2026-04-15.json`
- **现状**: 从 T009 (initialState model) 往后全部 pending, 但 auth/README.md 已经描述它们像完成品。
- **值得讨论的问题**: 是要继续推 login 模块完成, 还是把 pending 任务落盘状态改为 `blocked` 并注明依赖项? README 明显是「写在前面」的风格, 和任务状态割裂。

### [discussion] 项目内 `models/` 目录不存在, 但 CLAUDE.md 和 tech-stack.md 反复提到它

- **位置**: `CLAUDE.md`, `.claude/rules/tech-stack.md`
- **现状**: 文档声称 「全局共享状态优先用 @umijs/plugin-model (useModel), 文件放 workspace/src/models/」, 但 `workspace/src/models/` 当前不存在 (Glob 0 匹配); T009 计划新建 `models/initialState.ts` 但仍 pending。
- **值得讨论的问题**: 规范提前描述一个还没落地的目录是否合适? 对 AI 来说, 没文件等于空目录, 不会错; 但在「维度 2 状态管理漂移」的检查视角看, 这是「规范说 A 实际做不到 A」的典型信号, 值得记一笔。

### [discussion] `.claude/hooks/pre-commit-check.sh` 在 PreToolUse(Bash) 上匹配不够精确

- **位置**: `.claude/settings.json:27-37`
- **现状**: `PreToolUse` 匹配 `Bash` 工具就跑 `pre-commit-check.sh`。意味着任何 Bash 调用 (如 `pnpm dev` / `ls`) 都会触发这个 hook, 不只是 `git commit`。
- **值得讨论的问题**: 是否需要让 hook 脚本内部判断 `$CLAUDE_TOOL_INPUT` 是 `git commit` 再执行? 当前每次 Bash 都花时间检查任务状态, 5s 超时内一般不致命, 但有性能噪声。

## ✅ 做得好的地方 (正反馈)

1. **auth 模块 API / mock / 常量 / 国际化 / 拦截器的 `@prd / @task / @rules` 全部齐整**, 6 处命中全部精准指向 `docs/prds/login.md` 的合法锚点, 是追溯链机制设计出后最成功的落地示例。
2. **`workspace/src/features/auth/constants.ts` 完全消灭硬编码**, 路由路径 / 角色 / 错误码 / storage key / 校验正则 / 查询参数名通通常量化, 这正是 P0 `no-hardcode` 规则的典范实现。
3. **P0 规则自动扫描 0 命中**: `style={{`、`: any`、`from 'axios'` 在 `workspace/src` 全无匹配, 说明 hook `check-hardcode.sh` + 人工约束共同有效。
4. **`.claude/` 目录 5 类机制 (commands / skills / agents / hooks / rules) 划分清晰**, 每个子目录都有自洽 README, 入口导航到下级, 这是长期维护性的关键基建。
5. **DECISIONS.md 真的在用**: 2026-04-20 一天记录了 6 条重大决策, 含替代方案和影响, 让后续任何审计或新人能追问「为什么」, 非常有价值。

## 本次扫描范围

- 维度: rule-violations / doc-drift / internal-consistency / traceability / dead-links / orphaned-assets (全 6 维度)
- 扫描文件数: 约 60 (`.claude/` 全部 + `docs/` 全部 + `workspace/src/` 核心 18 个 + `workspace/config/`, `workspace/mock/`, `workspace/api-spec/`, `workspace/tests/`)
- 生成耗时: 估算 15-18 分钟 (多轮 Glob / Grep / Read)

## 采纳建议的流程

1. 人工 review 本报告
2. 对采纳的建议, 走对应流程固化:
   - 改规则 → 直接改 `.claude/rules/`
   - 改命令 → 改 `.claude/commands/`
   - 改代码 → 走 `/fix` 或正常开发流程
3. 改动走 PR, 不要在本文件里标注「已处理」 (本报告是快照, 不可变)
4. 下次 `/meta-audit` 跑时会自动对比, 不需手动标记
