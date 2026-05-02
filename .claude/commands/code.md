---
description: 前端开发工程师 — 按 tasks.json 顺序实现代码, 支持 --from / --only 参数
argument-hint: @docs/tasks/tasks-xxx.json [--from T005] [--only T003,T004]
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, TodoWrite
---

你现在是前端开发工程师角色。请按指定的 tasks.json 顺序实现代码。

## 输入

- `@docs/tasks/tasks-xxx.json` 路径 → 直接读取
- 不带路径 → 停下询问: 「请指定任务清单路径, 例: /code @docs/tasks/tasks-login-2026-04-15.json」
- 带 `--from T005` 参数 → 从指定 taskId 开始 (用于中断后续跑)
- 带 `--only T003,T004` 参数 → 只执行指定任务 (用于局部返工)

## 第零步: 前置校验 (不通过直接停)

按顺序执行, 任一不通过都报错终止:

1. **硬性闸门: 调用 `/plan-check`** — 对输入的 tasks.json 跑一遍 `.claude/commands/plan-check.md` 定义的 6 项检查 (含结构 / 依赖 / 追溯 / API 契约 / 顺序 / PRD 漂移)。不通过直接输出 `/plan-check` 的报错内容并终止, 不进入编码

   `/plan-check` 内部已经包含了 `/prd-check` 的 PRD 完备性校验, 不需重复调用

2. **openapi.json 类型已生成** — 检查 `workspace/src/types/api.ts` 存在; 不存在先跑 `pnpm gen:api`
3. **无未处理 blocked 任务** — 如果 tasks[] 里有 `status: "blocked"` 的任务 (如「推动后端更新 OpenAPI: ...」), 停下列出, 要求用户决定是否跳过

## 第零点五步: 断点恢复 (处理上次中断的状态)

扫一遍 tasks.json 的 status 分布, 按以下规则决定起点:

| 状态 | 动作 |
|------|------|
| `done` | 自动跳过, 不重做 |
| `pending` | 按依赖顺序, 从第一个「上游全 done」的 pending 任务开始 |
| `in-progress` | **停下问用户** (见下) |

### 遇到 `in-progress` 任务时

说明上次会话在这个任务里中断了, 文件状态未知, 直接续写有风险 (可能已部分写入、可能只改了 status 还没动代码)。不要自行判断, 先给用户列出现状:

1. 读 `task.filePath`, 确认文件是否已存在
2. 若存在, 读文件头 JSDoc 看 `@rules` 是否覆盖了本任务 `businessRules` 全部条目
3. 简报一句: 「T00X 文件 [已存在/不存在], JSDoc [完整/缺 N 条规则/无]」
4. 给用户 4 个选项, 等待选择:
   - **(A) 继续补全** — 文件已部分写入, 基于现状补完剩余逻辑, 不推翻已有代码
   - **(B) 删除重做** — 已有代码偏离规则或质量差, 删文件从头写
   - **(C) 标记为 done** — 实际已写完, 只是上次没来得及改状态, 直接置 done 跳过
   - **(D) 回退为 pending** — 之前没真正动代码, 改回 pending 按正常流程重跑

多个 `in-progress` 时逐个询问, 不要一次性批处理 (每个文件状态可能不同)。

### 带 `--from` / `--only` 参数时

跳过本步, 按参数直接定位起点 (用户已明确指定了断点, 不必再询问)。

## 执行原则

### 按依赖顺序, 不跳步

- 严格按 `dependencies` 字段排序, 上游任务 `status` 未变为 `done` 不能跑下游
- 并行机会: 同一层级 (无依赖关系) 的任务可以在一次会话里连续做, 但每做完一个才改 status

### 任务状态机

```
pending → in-progress → done
                      ↘ blocked (遇到问题停下问用户)
```

- 开始一个任务: `status` 改为 `in-progress`
- 完成: 改为 `done`
- 卡住 (需用户决策): 改为 `blocked`, 在任务对象里加 `blockReason` 字段, 停下问用户

### 每个任务的实现步骤

对 tasks[] 里每个任务, 按以下步骤执行:

1. **读 prdRef 原文** — 按 `task.prdRef` (如 `docs/prds/login.md#账号密码登录`) 定位到 PRD 二级标题下全部内容, 理解业务上下文
2. **确认文件路径** — `task.filePath`, 目录不存在则创建
3. **写代码**, 必须遵守:
   - **文件头 JSDoc** 包含 `@description` / `@module` / `@dependencies` / `@prd` / `@task` / `@rules` / `@design` (参考 `.claude/rules/file-docs.md`)
   - **`@prd` 字段**: 直接用 `task.prdRef` 原值
   - **`@task` 字段**: `docs/tasks/<文件名>.json#<taskId>`
   - **`@rules` 字段**: 把 `task.businessRules` 每条按顺序列进去, **原文照抄, 不要改述**
   - **`@design` 字段**: 直接用 `task.designRef` 原值 (Figma 链接 / 本地文件路径), 无设计稿则省略
   - **API 类型**: `import type { paths } from '@/types/api'`, **不得手写** request/response 类型
   - **禁止硬编码**: 文案走 i18n, 颜色/尺寸走 theme token, 枚举走常量 (参考 `.claude/rules/no-hardcode.md`)
   - **组件**: 函数式 + Props interface 导出 + 业务逻辑抽 hooks
4. **维护目录 README.md** — 在文件所在目录的 README.md 文件清单加一行 (参考 `.claude/rules/file-docs.md`)
5. **完成后更新 status** — 把 `tasks.json` 对应任务的 `status` 从 `in-progress` 改为 `done`
6. **简短汇报** — 输出一句: 「✅ T00X 完成: <文件路径>」

### 什么时候停下问用户 (不要自作主张)

- PRD 规则模糊或互相矛盾
- OpenAPI 缺必要字段 (按 plan.md 规则, 加一条 blocked 任务推后端)
- 依赖的上游任务未完成
- 要选技术方案 (多种实现都合理时)
- 要新建未在 tasks[] 里的文件 (说明 `/plan` 漏拆了任务, 应回去补 plan)

### 什么时候不要停

- 样式细节 (颜色/间距) — 按 theme token 合理选
- 文件内部命名 — 按编码规范走
- JSDoc 措辞 — 按模板套

## 全部任务完成后

### 第一步: Visual QA (强制执行, 有设计截图时)

检查 `docs/designs/screenshots/` 目录是否存在设计原型截图 (`.png` / `.jpg`)。

**有截图时**, 执行以下流程:

1. **启动前端 dev 服务**:
   ```bash
   pnpm dev &
   # 等待端口就绪 (最多 15s)
   until curl -s http://localhost:8000 > /dev/null; do sleep 1; done
   ```

2. **确保 Playwright 可用 (自动安装)**:
   ```bash
   # 检查是否已安装, 未安装则自动装
   if ! npx --no playwright --version > /dev/null 2>&1; then
     pnpm add -D playwright
   fi
   # 确保 chromium 浏览器二进制存在
   npx playwright install chromium
   ```

3. **用 Playwright 截图实际效果**:
   ```bash
   npx playwright screenshot --browser chromium \
     --full-page http://localhost:8000 \
     /tmp/actual-screenshot.png
   ```

4. **读取两张图像对比** — 调用 Read 工具分别读取设计截图 (`docs/designs/screenshots/*.png`) 和实际截图 (`/tmp/actual-screenshot.png`), 用视觉判断做三层检查:

   | 层级 | 检查项 | 合格标准 | 不合格时 |
   |------|--------|---------|---------|
   | **P0 — 结构** | 主要区域存在 (ActivityBar / TopBar / Board 泳道 / RetroTimeline 等) | 100% 存在 | **必须修复再继续** |
   | **P1 — 视觉 Token** | 背景色、边框色、文字颜色、圆角大小、间距档位与设计一致 | ≥ 95% | **必须修复再继续** |
   | **P2 — 像素级** | 字号精确、图标大小、阴影参数 | ≥ 75% | 记录差异, 不阻塞 |

5. **输出差异报告**:
   ```
   📸 Visual QA 对比结果
   P0 结构: ✅ 全部存在
   P1 视觉: ⚠️  3 处差异:
     - AgentCard border-radius 应为 7px, 实际 5px
     - Lane head padding 应为 10px 12px, 实际 8px 10px
     - StatusBadge 应为 pill 形 (border-radius: 10px), 实际 3px
   P2 像素: 记录 (不阻塞)
   ```

6. **自动修复 P0/P1 差异**:
   - 定位到出问题的 `.module.css` 或 `.tsx` 文件, 用 Edit 工具直接修
   - 修完后**重新截图** (重复步骤 3-4) 验证修复是否生效
   - 若修复后仍不合格, 再修一次; 最多尝试 3 轮

7. **追溯根因到命令文件** — 如果差异是因为 `/plan` 生成的 tasks.json `businessRules` 描述不精确, 或 `/prd` 的设计规则有误导, 同步修复对应的 `.claude/commands/` 文件里相关描述, 避免下次 `/code` 重蹈覆辙。具体判断:
   - 差异是「tokens 选错」→ 修源文件, 不改命令
   - 差异是「规则描述模糊」(如没说明 border-radius 具体值) → 在 `.claude/commands/code.md` 的「什么时候不要停」章节或对应 PRD 里补具体约束

8. **关闭 dev 服务**:
   ```bash
   kill %1 2>/dev/null || true
   ```

**无截图时**: 跳过本步, 提示用户可将设计截图放入 `docs/designs/screenshots/` 以启用 Visual QA。

---

### 第二步: 汇总与提示

1. 汇总本次产出的文件清单
2. 提示下一步:
   ```
   ✅ 模块 login 全部任务完成 (共 N 个)

   建议下一步:
     1. 启动 dev 验证: pnpm dev
     2. 生成测试: /test workspace/src/features/login/
     3. 代码审查: /review workspace/src/features/login/
   ```
3. 如果任务清单里有留存的 `blocked` 任务, 一并列出提醒

## 输入

$ARGUMENTS
