# docs/bug-reports/ — UI 测试 bug 报告

> **这是测试端 AI 测试和 `/fix` 命令之间的数据契约目录**。
> 测试端 AI 在这里产出标准格式报告, `/fix @path.md --pr` 批量消费。

## 目录内容

```
docs/bug-reports/
├── README.md                        ← 你正在看的这个文件
├── _template.md                     ← 报告模板 (字段固定, 不要改)
├── 2026-04-16-login.md              ← 日常报告 (按日期 + 模块命名)
├── 2026-04-17-user-list.md
└── screenshots/                     ← 截图 (gitignore 可选)
    ├── B001-01-blank.png
    └── ...
```

## 文件命名规范

```
<YYYY-MM-DD>-<模块或页面>.md
```

- 一份报告对应**一轮测试**, 可以包含多个 bug
- 同一天同一模块多次测试 → 加后缀 `-2`, `-3`
- 不要用中文文件名

## 工作流

```
1. 测试端 AI 按模板写报告到 docs/bug-reports/<日期>-<模块>.md
       ↓
2. 跑 /bug-check @docs/bug-reports/<日期>-<模块>.md  (校验格式 + 分诊)
       ↓
3. 人 review 一眼 (确认不是误报, 3-5 分钟)
       ↓
4. 跑 /fix @docs/bug-reports/<日期>-<模块>.md --pr
       ↓
5. /fix 内嵌 /bug-check → 按优先级 + 模块分组 → 产出 1~N 个 draft PR
       ↓
6. 人 review PR, 合并
```

**第 2 步可选但推荐**: `/bug-check` 会校验报告格式 (字段齐不齐、优先级合法、无修复代码建议) 并做分诊 (判断是真 bug 还是漏规则 / feature request)。不跑也行 — 第 4 步 `/fix` 里会自动再跑一次。但提前跑能及时发现测试端 AI 的格式问题, 避免后续阻塞。

**不要跳过第 3 步**。测试端 AI 可能误报 (比如 dev 模式的 warning 当成 error), 让 `/fix` 直接跑会浪费修无效 bug 的算力。

### 口头描述 bug 的流程 (非测试端 AI)

```
1. /fix 登录页白屏
       ↓
2. /fix 内嵌 /bug-check → 反问补齐 → 固化到 docs/bug-reports/<日期>-<模块>.md → 停下
       ↓
3. 人 review 报告, 确认无误
       ↓
4. /fix @docs/bug-reports/<日期>-<模块>.md [--pr]
       ↓
5. 正常修复流程
```

所有 bug (口头 / 测试端 AI / Sentry) 最终都在 `docs/bug-reports/` 里有一份规范报告, 追溯统一。

---

## 测试端 AI 的 System Prompt 片段 (关键)

把下面这段塞到你用的自动化测试工具的 system prompt 里 (Playwright MCP / Browser Use / Claude Computer Use / Appium / 模拟器 / 等等)。**原样拷贝**, 不要改:

```text
# UI 测试报告规范

你是 UI 自动化测试员, 不是修复工程师。任务是**发现问题并记录**, 不是改代码。

## 产出方式

每次测试结束, 把发现的所有 bug 按 docs/bug-reports/_template.md 的格式, 输出到:

  docs/bug-reports/<YYYY-MM-DD>-<被测模块或页面>.md

字段填写强制规则:
1. 所有字段都必须填, 没有数据写"无", 不要跳过
2. "现象"字段一句话讲清楚, 不要写"页面有问题"这种空话
3. "复现步骤"必须编号有序, 每步只做一件事 (点/输入/等待)
4. "期望 vs 实际"用表格对比, 不要只写其中一边
5. "控制台错误"粘贴原文 + 堆栈, 不要改写
6. "网络请求"列出相关的 API 及 status + 关键字段异常
7. "截图"路径真实存在, 命名: <Bug ID>-<序号>-<描述>.png
8. "根因推测"可选, 不确定就留空; 确定的话写推测 + 依据, **绝不改代码**
9. "优先级" 按阻塞程度选 P0/P1/P2 (定义见模板)
10. "关联 PRD" 从 docs/prds/ 里找语义最接近的锚点, 没有则留空

## 边界

- ❌ 不要修代码, 不要 git commit, 不要调用 /fix
- ❌ 不要跨目录写文件 (只写 docs/bug-reports/ 和 screenshots/ 子目录)
- ❌ 不要在报告里写"建议的修复方案代码" (/fix 自己会想)
- ✅ 测出 0 个 bug 也产一份报告 (空的 "概览" 表 + 一句话总结), 让上游知道跑过了

## 产出后

把生成的报告路径回报给调用方, 由人决定是否跑:
  /fix @<报告路径> --pr
```

---

## 和 `/bug-check` + `/fix` 的对接

`/bug-check` 是 `/fix` 的前置闸门 (分诊 + 规范化), 也可独立运行:

| 命令 | 示例 | 行为 |
|------|------|------|
| `/bug-check` (独立) | `/bug-check @docs/bug-reports/2026-04-16-login.md` | 校验格式 + 分诊 (bug / feature / 漏规则), 不通过列具体缺什么 |
| `/bug-check` (口头) | `/bug-check 登录页白屏` | 反问补齐 → 固化到 `docs/bug-reports/<日期>-<模块>.md` → 停下让你 review |
| `/fix` (批量报告) | `/fix @docs/bug-reports/2026-04-16-login.md --pr` | 内嵌 `/bug-check` 校验 → 按优先级+模块分组 → 产出 1~N 个 draft PR |
| `/fix` (口头) | `/fix 登录页白屏` | 内嵌 `/bug-check` 反问+固化 → **停下**, 你 review 后重跑 `/fix @<报告路径>` |

分组规则 (由 `/fix` 执行):

- 同优先级 + 同模块 + 同根因 → 合并进**一个 PR**
- 不同模块 → 拆**多个 PR** (便于独立 review)
- P0 bug 单独开 PR (不和 P1/P2 混)

每个 PR 的 commit message 会带所有包含的 Bug ID, 例如:

```
fix(login): 修复 Dashboard 白屏 + 记住我失效 [B001, B002]
```

---

## 截图管理

- 路径: `docs/bug-reports/screenshots/<Bug ID>-<序号>-<短描述>.png`
- 默认**不 gitignore** (让 PR review 能看到), 如果体积大再考虑:
  - 压缩为 webp
  - 或加到 `.gitignore` 只本地保留

```gitignore
# 如果决定不提交截图, 解除注释下面这行:
# docs/bug-reports/screenshots/
```

---

## 报告归档策略

- 报告文件 **默认保留**, 不定期清理
- 一份报告里的 bug 全部关闭 (PR merged) 后, 可以在元信息加标注 `状态: 已全部修复`, 但不删文件
- 删的话 commit 信息里写清楚为什么删 (防止历史追溯丢失)

---

## 常见问题

**Q: 测试端 AI 没有文件写权限怎么办?**
A: 让它把报告内容输出到对话框, 人手工保存到 `docs/bug-reports/`。或者用 Claude Computer Use 之类有文件权限的工具。

**Q: 一份报告发现了 20 个 bug, `/fix` 会一次修完吗?**
A: 会分组拆成多个 PR, 但单次调用会全部处理。如果量大建议先手工删掉 P2 条目, 只让它修 P0/P1, P2 单独再跑一次。

**Q: 测试端 AI 推测的"根因"错了怎么办?**
A: `/fix` 不会盲信, 会自己做第二步"定位根因"。推测只是加速提示, 最终以 `/fix` 的定位为准。

**Q: 同一个 bug 重复报告了怎么办?**
A: `/fix` 在第零步前置闸门会 grep 最近 7 天的已关闭 bug 报告 + 当前打开的 PR 分支, 发现重复直接 `[BLOCKED]` 提示人去看。(此校验由 `/fix` 实现, 不是本目录职责)
