# docs 目录说明

本目录存放 AI 前端自动化工作流产生的所有文档。

## 目录结构

```
docs/
├── README.md              ← 你正在看的这个文件
├── tasks/                 ← AI 架构师生成的任务清单
│   ├── tasks-user-module-2026-03-30.json
│   ├── tasks-order-module-2026-04-01.json
│   └── ...
└── prds/                  ← 产品需求文档 (可选)
    ├── prd-user-module.md
    └── ...
```

## tasks/ 目录

存放由 `/plan` 命令生成的 JSON 任务清单。每个文件对应一个功能模块的开发任务拆解。

### 文件命名规则

```
tasks-[模块名英文]-[日期].json
```

### 文件内容说明

```json
{
  "moduleName": "模块名称",
  "summary": "模块功能概述",
  "createdAt": "生成日期",
  "tasks": [
    {
      "taskId": "T001", // 任务唯一标识
      "type": "api", // 类型: api | store | component | hook | page
      "name": "userApi", // 文件/模块名称
      "filePath": "src/...", // 目标文件路径
      "description": "...", // 具体实现要求
      "props": {}, // Props 接口定义 (组件才有)
      "dependencies": [], // 依赖的其他任务 taskId
      "reuseComponents": [], // 可复用的已有组件
      "acceptanceCriteria": [], // 验收标准
      "status": "pending" // 状态: pending | in-progress | done | blocked
    }
  ],
  "routeConfig": {}, // 路由配置
  "dataFlow": "..." // 数据流向说明
}
```

### status 状态说明

| 状态        | 含义                        |
| ----------- | --------------------------- |
| pending     | 待开发                      |
| in-progress | 开发中                      |
| done        | 已完成                      |
| blocked     | 被阻塞 (依赖未完成或有问题) |

### 怎么使用这些文件

```bash
# 编码时引用任务清单
> 请根据 @docs/tasks/tasks-user-module-2026-03-30.json 从 T001 开始实现

# 更新任务状态
> 把 @docs/tasks/tasks-user-module-2026-03-30.json 中 T001 的 status 改为 done

# 查看哪些任务还没完成
> 读取 @docs/tasks/tasks-user-module-2026-03-30.json，列出所有 status 不是 done 的任务
```

## prds/ 目录 (可选)

存放产品需求文档。复杂需求建议先写成 .md 文件再交给 AI 规划:

```bash
/plan @docs/prds/prd-user-module.md
```
