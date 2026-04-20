<!--
  提交 PR 前请填完下方各项。
  - AI 自动生成的 PR (如 /fix 开出的) 会自动填充部分字段, 人工 PR 手动填。
  - 模板字段不适用时写 "-" 或删除该行, 不要留空。
-->

## 变更类型

- [ ] ✨ feat (新功能, 由 `/code` 产出)
- [ ] 🐛 fix (Bug 修复, 由 `/fix` 或手动产出)
- [ ] ♻️ refactor (重构, 不改变外部行为)
- [ ] 📝 docs (仅文档)
- [ ] 🧪 test (仅测试)
- [ ] 🔧 chore (依赖/配置)

## 关联 PRD / 任务

<!--
  可追溯链: PRD → task → 源码 @prd/@task/@rules → 本 PR
  只要改了业务代码, 这里必填。
-->

- PRD: docs/prds/xxx.md#<功能点锚点>
- 任务: docs/tasks/tasks-xxx.json#T00X
- (fix 类) 关联 issue: #xxx

## 变更内容

<!-- 一句话概括做了什么 (why > what), 代码 diff 能看的不用重复 -->

## 影响范围

- 涉及模块: `workspace/src/features/xxx/`
- 是否涉及 API 契约变更: ❌ 否 / ✅ 是 (如是, 说明 `workspace/api-spec/openapi.json` 改了什么)
- 是否涉及 PRD 业务规则变更: ❌ 否 / ✅ 是 (如是, 说明哪个 PRD 哪条规则, 是否评审过)

## 验证清单

<!-- fix/feat 类 PR 必填, 文档类可省略 -->

- [ ] `pnpm lint` 通过
- [ ] `pnpm test` 全绿 (单模块 + 回归)
- [ ] 新增了覆盖本变更的测试 (fix 类必须有失败 → 修复 → 转绿的测试)
- [ ] 源文件 JSDoc 的 `@prd` / `@task` / `@rules` 同步更新
- [ ] 受影响目录的 `README.md` 文件清单同步更新
- [ ] 无硬编码 (见 [.claude/rules/no-hardcode.md](../.claude/rules/no-hardcode.md))

## 延伸问题 (可选)

<!--
  发现但不在本 PR 处理的问题, 方便审阅者决定是否开单独 issue。
  /fix 命令产出的 PR 会在这里自动填充。
-->

- -

---

<!-- 若本 PR 由 AI (Claude Code) 生成, 保留下方标记便于追溯 -->
<!-- 🤖 Generated with Claude Code (/fix | /code) -->
