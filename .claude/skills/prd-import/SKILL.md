---
name: prd-import
description: 把非 markdown 格式的需求文档 (.docx / .xlsx / .pptx) 转成 markdown 草稿, 作为 /prd 的输入素材。用户提到「这是产品给的 doc / Excel / PPT 需求, 帮我转成 PRD」「需求文档在 xxx.docx 里」「从 Word 生成 PRD」时触发。PDF 和图片走 Claude Code 原生 Read 工具, 不经本 skill。
---

# prd-import — 需求文档格式转换

把后端/产品塞过来的 **非 markdown 格式** 的需求 (Word / Excel / PPT) 转成 markdown, 放到 `docs/prds/_imports/`, 供 `/prd` 命令当原文读。

## 职责边界

**做**:
- 识别输入文件格式, 调对应脚本转成 markdown
- 保留结构 (标题 / 列表 / 表格), 丢弃样式
- 产物落盘到 `docs/prds/_imports/<basename>-<日期>.md`, 带转换元信息头
- 提示下一步: `/prd @<产物路径>`

**不做**:
- ❌ 直接生成 PRD 草稿 — 那是 `/prd` 的事, 本 skill 只负责"翻译"
- ❌ 做任何业务判断 / 规则推断 / 字段完备性检查
- ❌ 改任何 workspace 代码
- ❌ 处理 .pdf / 图片 — Claude Code 原生支持, 直接跑 `/prd @<pdf 或图片>`

## 输入类型支持

| 格式 | 支持 | 转换库 | 说明 |
|------|------|-------|------|
| `.docx` | ✅ | mammoth | Word 2007+ 格式 |
| `.doc` | ❌ | — | 老版 Word, 请先「另存为 .docx」|
| `.xlsx` | ✅ | xlsx | 每个 sheet 转成一张 markdown 表格 |
| `.xls` | ❌ | — | 老版 Excel, 请另存为 .xlsx |
| `.pptx` | ✅ (best-effort) | 内置 unzip | 按 slide 提取文本, 不保留布局 |
| `.md` / `.txt` | ✅ | 直传 | 直接复制, 加转换头 |
| `.pdf` | ❌ (走原生) | — | 直接跑 `/prd @<file>.pdf` |
| 图片 (.png/.jpg) | ❌ (走原生) | — | 直接跑 `/prd @<file>.png` |

详细格式说明和踩坑记录见 [references/formats.md](references/formats.md)。

## 执行流程

### 第一步: 前置检查 (首次使用)

依赖装在 `workspace/` 里:

```bash
# 检查是否装过
cd workspace && pnpm list mammoth xlsx 2>/dev/null | grep -E "mammoth|xlsx"
```

没装输出会空, 这时告诉用户一次性装好:

```bash
cd workspace && pnpm install
# 或者只装缺的两个
cd workspace && pnpm add -D mammoth xlsx
```

### 第二步: 跑转换脚本

从仓库根目录:

```bash
pnpm prd:import <输入文件路径>
```

或直接指定 node (绕过 pnpm 代理):

```bash
node workspace/scripts/prd-import.mjs <输入文件路径>
```

脚本行为:
- 自动按扩展名分发处理器
- 输出路径默认: `docs/prds/_imports/<原文件名>-<YYYY-MM-DD>.md`
- 冲突时自动加 `-2` / `-3` 后缀, 不覆盖已有文件
- 产物首行加元信息注释 (源文件 / 格式 / 转换日期 / 字符数)

### 第三步: 读转换结果 + 提示下一步

跑完后读一下产物大致内容 (200 行左右, 不全读, 避免爆 context), 然后告诉用户:

```
✅ 转换完成
  源文件:   requirements/登录需求.docx (docx, 124 KB)
  转换产物: docs/prds/_imports/登录需求-2026-04-20.md (342 行)
  字数统计: 4821 字

⚠️ 注意事项:
  - 表格已转为 markdown 格式, 复杂合并单元格可能错位
  - 图片未提取 (如需引用设计稿, 手动贴 Figma 链接到 PRD)
  - 产物是「原文翻译」, 不是最终 PRD, 下一步请跑:

下一步:
  /prd @docs/prds/_imports/登录需求-2026-04-20.md
```

## 产出的 md 文件格式

```markdown
<!--
  生成: 2026-04-20 14:32
  源文件: /path/to/登录需求.docx
  格式: docx (mammoth v1.8.0)
  大小: 124 KB, 3521 字符
-->

# <从源文件提取的标题>

<正文内容, 保留标题层级 + 列表 + 表格>

## ...
```

## 失败分诊

| 失败现象 | 原因 | 处理 |
|---------|------|-----|
| `Cannot find module 'mammoth'` | 没跑 `pnpm install` | 提示用户 `cd workspace && pnpm install` |
| `.doc (non-docx) files are not supported` | 老格式 | 让用户用 Word / WPS 另存为 .docx |
| 表格错位 / 合并单元格丢失 | mammoth 限制 | 说明并建议人工校对, 不是 bug |
| 产出空文件 / 乱码 | 源文件可能加密或损坏 | 让用户确认源文件能正常打开 |
| 文件 > 10MB 转很久 | 正常, 脚本不做截断 | 等 |

## 设计原则

- **纯数据转换, 零推理** — 本 skill 不做任何语义理解, 那是 `/prd` 的工作
- **脚本出数据, AI 给提示** — 转换用 node 脚本 (可复现), AI 只负责读产物 + 引导下一步
- **产物可追溯** — 保留源文件路径和格式, 评审 PRD 时能对照原文
- **不覆盖** — `_imports/` 下同名文件自动加后缀, 避免误删
- **依赖最小** — 只依赖 `mammoth` + `xlsx` 两个 npm 包, 其他格式靠 Node 原生

## 使用示例

```
用户: 产品给我一个 Word 需求文档 requirements/登录需求.docx, 帮我做成 PRD
    ↓
AI: 先走 prd-import 把 docx 翻成 md, 再跑 /prd 走澄清流程

# 步骤 1: 转换
$ pnpm prd:import requirements/登录需求.docx
→ docs/prds/_imports/登录需求-2026-04-20.md

# 步骤 2: 走正常 PRD 流程
/prd @docs/prds/_imports/登录需求-2026-04-20.md
→ AI 按照模板问 3-5 个问题 → 生成 docs/prds/login.md
```
