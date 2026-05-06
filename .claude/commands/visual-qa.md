---
description: Visual QA — 截取当前应用截图，与设计稿像素对比，输出 P0/P1/P2 报告
argument-hint: [@docs/designs/screenshots/reference/xxx.png]
allowed-tools: Bash, Read, Edit, Glob, Grep
helper: true
---

你现在是视觉 QA 工程师。执行截图对比，输出结构化的差异报告。

## 执行步骤

### 第一步: 运行对比脚本

```bash
bash docs/designs/screenshots/run-visual-qa.sh $ARGUMENTS
```

脚本会自动完成：
- 检测 dev server 是否在 port 8000 运行 → 直接截图
- 未运行 → 自动 `pnpm dev` 启动，截图后自动关闭
- ImageMagick 像素对比，生成差值图 + 左右拼接对比图
- 结果写入 `docs/designs/screenshots/actual/qa-result.json`

### 第二步: 读取结果并视觉分析

1. 读取量化指标：
   ```bash
   cat docs/designs/screenshots/actual/qa-result.json
   ```
2. 用 Read 工具读取以下图像做视觉判断：
   - `docs/designs/screenshots/actual/side-by-side.png`（左右拼接对比图）
   - `docs/designs/screenshots/actual/diff.png`（红色=差异区域）

### 第三步: 输出报告

严格按以下格式输出：

```
📸 Visual QA 报告
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
模式: web (localhost:8000)
参考: docs/designs/screenshots/reference/xiaoguotu.png
实际: docs/designs/screenshots/actual/actual-web.png

P0 结构 (必须 100% 通过)
  ✅/❌ TopBar       RMSE=x.xxx
  ✅/❌ Pipeline     RMSE=x.xxx

P1 视觉 Token (≥ 95% 合格)
  ✅/⚠️  整体相似度   RMSE=x.xxx
  差异项:
    - [ ] 区域/元素: 期望 xx, 实际 xx

P2 像素级 (≥ 75% 合格, 不阻塞)
  ✅/📌 精确度       RMSE=x.xxx

产出文件:
  差值图:  docs/designs/screenshots/actual/diff.png
  对比图:  docs/designs/screenshots/actual/side-by-side.png
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
结论: ✅ 通过 | ❌ P0 失败，必须修复后重跑 | ⚠️ P1 有差异，建议修复
下一步: /code --only <taskId> 修复差异 | 或确认接受差异继续
```

### 第四步: 上游溯源 — 确定根因层级

差异不一定是代码写错了。先做根因分类，再决定修哪一层。**直接改 CSS 是最后一步，不是第一步。**

```
diff.png 有差异
    │
    ▼
【Q1】这个 UI 区域在实际截图里完全不存在吗？
    │
    ├─ 是（整块红 / 区域缺失）
    │       │
    │       ▼
    │   【Q2】对应的 tasks.json 里有这个组件的任务吗？
    │       ├─ 没有任务 → 根因: PRD 遗漏  → 走「路径 A: 回修 PRD」
    │       ├─ 有任务但 status=pending → 根因: 任务未执行 → 走「路径 B: 补跑 /code」
    │       └─ 有任务且 status=done → 根因: 代码逻辑错误 → 走「路径 C: 修代码」
    │
    └─ 否（区域存在但样式偏差）
            │
            ▼
        【Q3】差异区域对应任务的 designRef 字段是空的吗？
            ├─ 是（designRef 为空）→ 根因: 计划缺设计引用 → 走「路径 B+: 补 designRef 后重跑」
            └─ 否（有 designRef）
                    │
                    ▼
                【Q4】PRD 里这个功能点的业务规则有视觉约束吗？（颜色/尺寸/间距）
                    ├─ 没有视觉规则 → 根因: PRD 规则不完整 → 走「路径 A+: 补 PRD 规则」
                    └─ 有规则但代码没遵守 → 根因: 实现偏差 → 走「路径 C: 修代码」
```

---

> **精准修复原则：只改有问题的那一处，不全量重跑上游。** 每条路径都给出最小改动范围。

#### 路径 A: 回修 PRD（根因在需求层）

适用于：设计图里有某个 UI 区域，但 PRD 里完全没有对应章节，或业务规则缺少视觉约束。

**情况 A1 — PRD 完全缺少某功能章节（需要新建任务）**

```
最小改动:
  1. 只在 PRD 里新增缺失的 ## 功能章节 + 业务规则（不动其他章节）
  2. /prd-check → 确认通过
  3. 手动在 tasks.json 末尾追加新任务对象（不要重跑 /plan 覆盖整个文件）:
       - 给新任务分配下一个 taskId（如 T099）
       - prdRef 指向新增的章节锚点
       - designRef 指向 "图片路径#区域名"
       - dependencies 填写它依赖的已完成任务 ID
  4. /code @docs/tasks/tasks-xxx.json --only T099
  5. /visual-qa 验证
```

**情况 A2 — PRD 有章节但缺少视觉约束规则（尺寸/颜色/间距）**

```
最小改动:
  1. 只在 PRD 对应 ### 业务规则 里追加视觉约束条目（不改其他规则）
  2. /prd-check → 确认通过
  3. 在 tasks.json 找到对应任务，把新规则追加进 businessRules 数组（不重跑 /plan）
  4. /code @docs/tasks/tasks-xxx.json --only <受影响 taskId>
  5. /visual-qa 验证
```

---

#### 路径 B: 补跑 /code（根因在执行层）

适用于：tasks.json 里有这个任务但还没执行（status=pending），或 designRef 为空。

**情况 B1 — 任务未执行（status=pending）**

```
最小改动:
  /code @docs/tasks/tasks-xxx.json --only <taskId>
  （只跑这一个任务，其余 done 的任务不重做）
```

**情况 B2 — designRef 为空，开发时没有视觉参考**

```
最小改动:
  1. 用 Edit 直接改 tasks.json 里对应任务的 designRef 字段:
       "designRef": "docs/designs/screenshots/reference/xiaoguotu.png#区域名"
     （只改这一个字段，不动其他任务）
  2. /code @docs/tasks/tasks-xxx.json --only <taskId>
  3. /visual-qa 验证
```

---

#### 路径 C: 修代码（根因在实现层）

适用于：PRD 有规则、任务已完成，但实现与设计不符。**只改出问题的那个文件，不碰其他文件。**

```
最小改动:
  1. 读 diff.png 定位红色区域 → 找到唯一的责任文件
  2. 读 side-by-side.png 肉眼对比，提取期望值
  3. Grep 找到对应样式文件:
       grep -r "区域名" workspace/src --include="*.less" --include="*.module.css" -l
  4. 只用 Edit 修改该文件里出问题的那几行（不改其他选择器）
  5. /visual-qa 验证，最多 3 轮
```

> ❌ 不要因为改了样式就顺手"优化"周边代码 — 只改导致差异的那一处

---

#### 接受差异（不修复）

以下差异应标记为「已知/接受」，不进入修复流程：

| 差异类型 | 原因 | 处置 |
|---------|------|------|
| 空列表 vs 设计稿有数据 | 数据内容差异，预期行为 | 报告注明，不修复 |
| 字体渲染微差（P2） | 浏览器抗锯齿 vs 设计工具 | P2 接受 |
| 3 轮修复后仍未收敛 | 根因复杂，超出自动修复范围 | 停下告知用户人工介入 |
| 设计稿本身与 PRD 矛盾 | 设计稿未更新 | 让用户决定以哪个为准 |

## 注意事项

- **RMSE 阈值仅供参考**：页面有动态内容或未登录状态会拉高 RMSE，需结合视觉判断
- **参考图放哪**：把设计稿截图放入 `docs/designs/screenshots/reference/` 即可
- **dev server 端口**：默认 8000 (UmiJS)，如项目用其他端口修改脚本里的 `PORT` 变量
- **P2 差异不阻塞**：像素级细节（抗锯齿、字体微差）接受即可，不必强行修复

$ARGUMENTS
