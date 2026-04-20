# hooks/ — Claude Code 自动化钩子

> 配置在 `.claude/settings.json` 中, 在特定事件时自动执行。只提醒, 不阻断。

## 文件清单

| 文件 | 触发时机 | 作用 |
|------|---------|------|
| check-hardcode.sh | 每次编辑/创建 ts/tsx 文件后 | 扫描中文硬编码, 违反 P0 规则立刻警告 |
| check-tasks-status.sh | 每次开启新会话时 | 列出 in-progress 的任务, 提醒上次中断位置 |
| pre-commit-check.sh | git commit 前 | 检查任务状态是否忘记更新为 done |

## 添加新 hook

1. 在本目录创建 `.sh` 脚本, 加 `chmod +x`
2. 脚本顶部注释写明: 触发时机 + 作用
3. 在 `.claude/settings.json` 的对应事件下引用: `".claude/hooks/xxx.sh"`
4. 更新本 README 的文件清单

## 可用的环境变量

| 变量 | 可用事件 | 说明 |
|------|---------|------|
| `$CLAUDE_FILE_PATH` | PostToolUse (Edit/Write) | 刚编辑的文件路径 |
| `$CLAUDE_TOOL_INPUT` | PreToolUse | 即将执行的工具输入内容 |

## 设计原则

- 只提醒, 不阻断 (exit 0, 不 exit 1)
- 没问题就静默, 有问题才输出
- 超时 5 秒, 不做重操作
