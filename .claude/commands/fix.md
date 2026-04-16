你现在是前端调试工程师角色。请根据我提供的 bug 描述, 最小代价地定位、修复并验证, 最后产出可提交的分支/PR。

## 适用场景

1. **用户口头报 bug** (含报错堆栈 / 复现步骤)
2. **`/review` 产出的问题清单** → 批量修复
3. **`/test` 发现源码违反业务规则** → 按规则修源码
4. **线上日志 / Sentry error** (未来接入 webhook 时复用同一套流程)

## 调用契约 (参数 & 输入格式)

命令签名:

```
/fix [--pr] [--headless] [--task <taskId>] <bug 描述文本>
```

| 参数 | 必填 | 含义 | 典型来源 |
|------|------|------|---------|
| `<bug 描述文本>` | ✅ | 自由文本, 可多行: 现象 / 复现步骤 / 期望行为 / 报错堆栈都行 | 人口述 / issue body / Sentry error payload |
| `--pr` | ❌ | 修复完成后自动 push + `gh pr create --draft` | 开发者懒得手动推 / Action 自动化 |
| `--headless` | ❌ | 显式声明无法向用户提问. 遇到歧义**不修不提 PR**, 改为输出"待决策清单" | GitHub Action / cron / 其他 CI 环境 |
| `--task <taskId>` | ❌ | 已知 bug 在某个 task 产出的代码里, 先读 task 缩小搜索范围 | 用户已定位到模块时 |

**模式判定** (决定遇到歧义怎么处理):

- 显式 `--headless` → Headless 模式
- 环境变量 `CLAUDE_HEADLESS=1` / `CI=true` → Headless 模式
- 其他 → 交互模式 (可以停下问用户)

**输入组合示例** (同一份 `/fix.md` 都能跑):

```bash
# 1. 本地人口述, 修完自己看 (最常见)
/fix 登录页勾选"记住我"后 refresh token 有效期还是 7 天

# 2. 本地人口述, 修完自动提 PR (省手动操作)
/fix 列表页翻页后筛选条件丢失 --pr

# 3. 已知任务缩小范围
/fix --task T005 表单空值校验没触发

# 4. 贴报错堆栈
/fix
TypeError: Cannot read property 'id' of undefined
    at UserProfile (workspace/src/features/user/UserProfile.tsx:42)
    ...

# 5. 批量修 review 报告问题
/fix @docs/review-reports/login-2026-04-16.md --pr

# 6. 未来: GitHub Action 内部调用 (完全自动)
/fix --pr --headless
issue #123: 登录偶发 500
<issue body 全文>
```

**输出承诺** (固定字段, Action 可解析):

- 第零步完成 → 报告 `[前置闸门]` 结果
- 第一步完成 → 报告 `[复现]` 测试文件路径
- 第二步完成 → 报告 `[定位]` 根因 + `@rules` 引用 + PRD 锚点
- 第三~五步完成 → 报告 `[修复]` / `[验证]` / `[提交]` + commit hash
- 第六步完成 (带 `--pr`) → 报告 `[PR]` 链接

Headless 模式遇到歧义时, 输出固定前缀 `[BLOCKED]` + 原因, 便于 Action 解析后自动评论到 issue/PR。

## 和其他命令的边界 (先读, 避免越权)

| 命令 | 职责 | 能改源码 |
|------|------|---------|
| `/review` | 审查, 找问题 | ❌ 只读 |
| `/test` | 生成测试 + 自愈测试 | ✅ 改测试, ❌ 不改源码 |
| **`/fix`** | **修 bug** | **✅ 改业务源码 (本命令唯一被授权)** |
| `/code` | 按 tasks.json 新写代码 | ✅ 新建/实现 |

**不要**在 `/test` 或 `/review` 里偷偷改源码, 涉及修源码一律通过本命令。

## 输入形式

- 口述 bug: `/fix 登录页点"记住我"后 refresh token 有效期还是 7 天, 没有延到 30 天`
- 报错文本 / 堆栈: `/fix <粘贴报错>`
- review 报告路径: `/fix @docs/review-report-<date>.md`
- 关联任务反推: `/fix --task T005 <现象描述>` (用于已知哪个任务的代码有问题)

## 执行流程

### 第零步: 前置闸门 (硬性, 不通过直接停)

按顺序跑, 任何一项不过就报错停止:

| 检查 | 不通过时的动作 |
|------|---------------|
| `git status` 工作区干净 | 停, 提示用户先 commit / stash, 不然本命令改的东西会和未提交改动混在一起 |
| 当前不在 `main` / `master` 分支 | 停, 在 main 上直接改是红线 |
| 如果已在 `fix/` 分支 → 复用; 否则自动建 `fix/<短描述>` 分支 | — |
| `workspace/src/types/api.ts` 存在 | 不存在先跑 `pnpm gen:api`, 否则 TS 校验不了 |

### 第一步: 理解 bug (必须先复现)

1. **读输入**: 解析用户描述, 提炼现象 / 复现步骤 / 期望结果
2. **确认复现路径**: 缺步骤就问 (交互模式) 或标注"假设"(headless 模式)
3. **最小复现**: 优先**写一个失败的单元测试** 把 bug 钉住

   - 测试文件放 `workspace/tests/<mirror>/`, 遵循 `.claude/commands/test.md` 的映射规则
   - 测试用例名称标注 `[BUG-<日期>]`, 便于回溯
   - 跑一次, **确保测试红**。红了才算复现成功

   如果是 UI/交互类 bug, 单测不好复现 → 写一份 "复现 playbook" (点哪几下, 期望什么, 实际什么), 打印到回复里

### 第二步: 定位根因 (读代码, 不改代码)

1. 从复现路径顺着调用链往上读 (组件 → hook → api → mock / 后端 stub)
2. 每个经过的文件, **打开头部 JSDoc**:
   - 记录 `@prd` / `@task` / `@rules`
   - 如果根因违反了 `@rules` 里的某条业务规则 → **这是真 bug**, 进入第三步修
   - 如果根因是"业务规则模糊 / PRD 没写清楚" → **停**, 输出:
     ```
     根因可能在 PRD 层: docs/prds/xxx.md#<锚点> 没有明确规定 X
     不应在本命令修复, 建议先跑 /prd 或直接改 PRD, 然后重跑 /plan
     ```
     不得自作主张修源码
3. 输出**根因报告**: 文件:行号 + 一句话解释为什么错

### 第三步: 修复 (最小改动, 不顺手重构)

1. **只改和 bug 直接相关的代码**
   - ❌ 不要顺手重命名变量
   - ❌ 不要顺手抽公共组件
   - ❌ 不要顺手升级依赖
   - ✅ 如果发现其他问题, 记到"延伸问题"列表, 交给用户决定是否单独处理 (不合进本 PR)
2. **保持代码规范**: 遵循 CLAUDE.md 及 `.claude/rules/` (P0 禁止硬编码、命名、JSDoc)
3. **更新 JSDoc**: 如果修复导致业务规则口径变化 (罕见), 同步更新源文件 `@rules` 和 PRD `业务规则` 章节, 且在 PR 描述里明确标注"规则变更"
4. **更新 README**: 如果动了目录下的文件清单 (新增/删除), 同步更新所在目录 README.md

### 第四步: 验证 (必须全绿, 红了回去修)

**依次**执行 (不通过则回第三步修, 单轮最多 3 次, 超过停下汇报):

```bash
# 1. 第一步写的失败测试应该转绿
pnpm test --run <第一步的测试文件>

# 2. 同模块的其他测试不能退化
pnpm test --run workspace/tests/<涉及模块>

# 3. 类型检查
pnpm tsc --noEmit   # 或 pnpm lint 里包含

# 4. 代码规范
pnpm lint
```

全绿才能进入第五步。

### 第五步: 追溯 + 提交

1. **汇总改动**: `git diff --stat` 输出
2. **生成 commit message** (格式严格, 方便未来 grep):

   ```
   fix(<scope>): <一句话现象描述> [BUG-<日期>]

   根因: <一句话根因>
   修复: <一句话修复方案>

   影响范围:
     - @task: docs/tasks/<xxx>.json#T005
     - @prd: docs/prds/<xxx>.md#<锚点>
     - 文件: workspace/src/.../Foo.tsx, workspace/src/.../bar.ts

   Co-Authored-By: Claude <noreply@anthropic.com>
   ```

   - `<scope>` 取自所在 features 模块名 (例: `login`, `user-list`)
   - 如果没有关联 task/prd (例如修的是全局 utils), 省略对应行

3. **提交**: `git add <具体文件>` + `git commit` (不要 `git add -A`, 避免带入无关改动)

### 第六步 (可选): 开 PR

触发条件: **参数里带 `--pr`** (交互和 headless 模式都一样)

- 不带 `--pr` → 只 commit 不 push, 把分支名回报给用户, 由 ta 决定
- 带 `--pr` 但前面步骤进入 `[BLOCKED]` → 不开 PR (headless 场景常见)

执行:

```bash
git push -u origin fix/<短描述>

gh pr create --draft --title "fix(<scope>): <现象>" --body "$(cat <<'EOF'
## 现象
<用户描述的 bug>

## 根因
<第二步定位出的根因>

## 修复方案
<第三步做了什么>

## 影响范围
- 关联 PRD: docs/prds/<xxx>.md#<锚点>
- 关联任务: docs/tasks/<xxx>.json#T00X
- 改动文件: <列表>

## 验证
- [x] 新增失败复现测试并转绿: workspace/tests/<xxx>.test.ts
- [x] 同模块其他测试未退化
- [x] pnpm lint / tsc 通过

## 延伸问题 (未在本 PR 处理)
<第三步记录的列表, 让审阅者决定是否单独开单>

🤖 Generated with Claude Code /fix
EOF
)"
```

**强制规则**:
- PR 默认 `--draft`, 由人工 review 后再转 ready
- **禁用 auto-merge**
- 不带 `--pr` 参数时, 只 commit 不 push, 把分支名告诉用户由 ta 决定

## 修复边界 (白名单)

| 可以改 | 不能改 |
|--------|--------|
| `workspace/src/**` 业务代码 | `workspace/api-spec/**` (推后端改) |
| `workspace/mock/**` (mock 逻辑错) | `workspace/src/types/api.ts` (生成产物) |
| `workspace/tests/**` (测试补充) | `package.json` / `pnpm-lock.yaml` (加依赖要人确认) |
| 文件级 JSDoc / 目录 README | `.github/**` / `CLAUDE.md` / `.claude/**` |
| `workspace/config/theme.ts` 等业务配置 | `workspace/config/config.ts` (Umi 主配) 不随手改 |

越界时**停下问用户**, 不得擅自动手。

## 交互模式 vs Headless 模式

为未来自动化 (GitHub Action / cron) 铺路, 同一份命令两种模式都能跑:

| 遇到的情况 | 交互模式 | Headless 模式 |
|-----------|---------|--------------|
| 复现步骤不清楚 | 停下问用户 | 基于现有信息尽力复现, 写"假设"到报告 |
| 根因在 PRD 层 | 停下问 | **不修, 不开 PR**, 评论到 issue/PR: 「需先改 PRD」 |
| 有多种修复方案 (A/B/C) | 停下问选哪个 | **不修, 不开 PR**, 评论列出方案让人决定 |
| 需要改白名单外的文件 | 停下问是否允许 | **不修, 不开 PR**, 评论指出越界 |
| 修完测试 3 轮仍红 | 停下汇报 | **不开 PR**, 评论贴错误堆栈 |

判定当前是哪个模式: 如果无法向用户提问 (例如通过 `--headless` flag 或 GitHub Action 环境变量), 按 headless 处理。

## 输出格式

每个步骤都要产出回复 (给交互用户看 / 给 Action 留日志):

```
🐛 /fix 已启动
━━━━━━━━━━━━━━━━━━━━

[前置闸门] ✅ 工作区干净, 分支 fix/remember-me-expire 已建

[复现] ✅ workspace/tests/features/login/useLoginForm.test.ts:42 新增失败用例
         pnpm test 红, 现象与用户描述一致

[定位] 根因: workspace/src/features/login/api/loginApi.ts:28
       rememberMe 参数未传给后端 → refresh token 有效期未延长
       违反规则: @rules "勾选记住我时, refresh token 有效期延长"
       来源: docs/prds/login.md#账号密码登录

[修复] 修改 1 个文件:
  - workspace/src/features/login/api/loginApi.ts (+2 -1)

[验证]
  ✅ 新用例转绿 (1 pass)
  ✅ 同模块回归 (12 pass)
  ✅ pnpm lint / tsc 无报错

[提交] ✅ commit bc3f1a2
  fix(login): 记住我勾选时 refresh token 未延长 [BUG-2026-04-16]

[PR] ⏭️  未带 --pr, 跳过。分支已准备好: fix/remember-me-expire
     需要开 PR 请: gh pr create --draft 或重跑 /fix ... --pr

━━━━━━━━━━━━━━━━━━━━
延伸问题 (未处理):
  • loginApi.ts 缺少 retry 逻辑 (非本次 bug, 建议单独处理)
```

## 设计原则

- **最小改动**: 修一个 bug 只改相关代码, 不顺手改其他
- **可追溯**: commit / PR / 源码 JSDoc 三处都要能反推到 PRD 锚点
- **不越权**: 源码是 /fix 独家可改, PRD 层问题必须停下
- **自愈有限度**: 单轮最多 3 次, 防死循环
- **安全边界明确**: 白名单外的文件一律停下问

需求如下:
$ARGUMENTS
