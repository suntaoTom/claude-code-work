# _imports/

`prd-import` skill 转换后的**需求原文 markdown**, 不是最终 PRD。

## 职责

后端/产品给过来的 `.docx / .xlsx / .pptx` 等非 markdown 格式, 经 [prd-import skill](../../../.claude/skills/prd-import/SKILL.md) 转成 markdown 后落在这里, 作为 `/prd` 命令的输入素材。

## 流程

```
产品的 登录需求.docx
    ↓  pnpm prd:import 登录需求.docx
docs/prds/_imports/登录需求-2026-04-20.md   ← 原文翻译, 保留在这里以便追溯
    ↓  /prd @docs/prds/_imports/登录需求-2026-04-20.md
docs/prds/login.md                          ← 最终 PRD (走澄清 + 模板)
```

## 命名

`<原文件名>-<YYYY-MM-DD>.md` (同日重名自动加 `-2`/`-3` 后缀)。

## 是否要提交到 Git?

**看场景**:

| 场景 | 要不要 commit |
|------|-------------|
| 公司内部需求, 对团队有追溯价值 | ✅ 提交, 让 PR review 时对照原文 |
| 包含敏感信息 (客户名 / 未公开业务) | ❌ 加 `.gitignore`, 本地留存 |
| 一次性试验 / 草稿 | ❌ 不提交, 用完删 |

默认**提交**, 个别敏感的手动删 + `.gitignore`。

## 不要做什么

- ❌ 不要手改这里的文件, 它是「源的翻译」, 改了就和原文脱钩
- ❌ 不要把 `_imports/` 文件当最终 PRD 用, 它没走模板校验, 没有 `[待确认]` 标注
- ❌ 不要在 `/plan` 里用 `_imports/` 的路径, `/plan` 要的是通过 `/prd` + 模板生成的正式 PRD
