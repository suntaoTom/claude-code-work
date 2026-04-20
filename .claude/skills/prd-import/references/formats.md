# 格式细节与踩坑记录

## .docx (Word 2007+)

### 用的库: [mammoth](https://github.com/mwilliamson/mammoth.js)

- 输出: 用 `convertToMarkdown` API, 保留标题 (H1-H6) / 段落 / 列表 / 表格 / 引用
- 不保留: 字体颜色、字号、图片 (图片被提取但本脚本丢弃)
- 不支持 `.doc` (老格式 OLE 复合文档), 用户请另存为 `.docx`

### 已知限制

| 现象 | 原因 | 解决 |
|------|------|-----|
| 合并单元格错位 | mammoth 把 colspan/rowspan 展开成多个空列 | 人工编辑 md 后修 |
| 脚注丢失 | mammoth 默认不提取脚注 | 如果需求依赖脚注, 手动从原文复制 |
| 页眉页脚丢失 | 不是正文 | 通常不影响需求理解 |
| 嵌入的 Excel 对象被丢弃 | 跨格式嵌入不支持 | 让产品把 Excel 单独导出 |
| 自定义样式被忽略 | mammoth 只识别语义样式 (Heading / List) | 让产品用标准样式写文档 |

### 产品给文档时的建议 (可发给他们)

- 用 Word 自带的 **Heading 1-3** 样式标记标题 (不要手动调字号)
- 表格用规则矩形, 避免合并单元格
- 图片和截图单独放一个目录, 在 Word 里只给文字描述 + 引用编号
- 需求规则用编号列表 (Word 的 List 样式), 不要手动打 "1.", "2."

## .xlsx (Excel 2007+)

### 用的库: [SheetJS xlsx](https://github.com/SheetJS/sheetjs)

- 每个 sheet 转成一段 `## <sheet 名>` 标题 + 一张 markdown 表格
- 空行空列自动去除
- 数字保留原始精度 (不做货币格式化)

### 已知限制

| 现象 | 原因 | 解决 |
|------|------|-----|
| 合并单元格只保留左上角值 | xlsx 的标准行为 | 让产品不要合并 |
| 公式被计算成值 | xlsx 默认策略 | 一般是需求文档不含公式, 不影响 |
| 日期被转成 Excel 序列号 | xlsx 底层存储 | 脚本会检测并转回 ISO 日期字符串 |
| 图表 / 透视表 | 非表格数据 | 不支持, 请让产品出表格版 |

## .pptx (PowerPoint 2007+)

### 做法: 原生 unzip + XML 正则提取

- .pptx 本质是 zip, 内含 `ppt/slides/slide*.xml`
- 脚本解压后用正则抽每个 slide 的文本
- 每张 slide 输出为 `## Slide N` + 文本

### 局限

这是 best-effort, 不是完整转换:

| 丢失内容 | 为什么 |
|---------|-------|
| 布局 / 位置 | 转 md 就没意义了 |
| 图片 / 截图 | 无法 OCR |
| 动画 / 过渡 | 无法表达 |
| 演讲者备注 | 默认不抽 (如需要改脚本读 `notesSlide*.xml`) |

**建议**: 如果需求主要靠 PPT 表达, 让产品补一个 Word 或 markdown 版, PPT 作为辅助。

## .pdf

**不走本 skill**。Claude Code 的 `Read` 工具原生支持 PDF (带 `pages` 参数读指定页), 视觉模型能识别扫描件。直接:

```bash
/prd @requirements/登录需求.pdf
```

`/prd` 内部会读 PDF 内容, 和读 md 一样。

**例外**: 如果 PDF 超过 20 页, `Read` 要求指定 pages 范围。这时:
1. 先用 PDF 阅读器看一下目录, 找关键章节页码
2. 分段读 `@<file.pdf>` pages="1-10" 之类

## 图片需求 (.png / .jpg / .jpeg)

**不走本 skill**。Claude Code 多模态能力会识别需求截图、流程图、原型图。直接:

```bash
/prd @requirements/登录流程.png
```

## 其他格式

| 格式 | 建议 |
|------|------|
| `.md` / `.txt` | 直接 `/prd @<file>`, 不必转换 |
| Notion 导出 `.md` + `_imports/` | 用 Notion 的 "Export as Markdown" (会带图片), 直接喂 `/prd` |
| 飞书 / 语雀 导出 `.docx` | 当普通 docx 处理 |
| Confluence 导出 `.html` | 目前没支持, 可手动复制内容到 .md |
| 钉钉文档 / 腾讯文档 | 导出为 .docx 再走本 skill |

## 字符编码

脚本默认用 UTF-8 读写。如果源文件是 GBK / GB18030 (老版 Windows Word 偶尔出现):
- mammoth 自己处理 docx 内部编码, 不受影响
- xlsx 同上
- 纯 .txt 文件如果是 GBK, 脚本会输出警告并尝试 `iconv-lite` 转换 (如果装了)

如果转出来全是乱码, 让用户用 VSCode 打开源文件, 右下角切编码为 UTF-8 另存即可。
