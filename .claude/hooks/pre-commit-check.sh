#!/bin/bash
# 提交前状态检查: git commit 前检查任务是否仍为 in-progress
# 触发时机: PreToolUse (Bash, 仅 git commit 命令)

# 不是 git commit 则跳过
echo "$CLAUDE_TOOL_INPUT" | grep -q 'git commit' || exit 0

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
has_inprogress=0

for f in "$PROJECT_ROOT"/docs/tasks/tasks-*.json; do
  [ -f "$f" ] || continue

  if grep -q '"status":\s*"in-progress"' "$f" 2>/dev/null; then
    if [ $has_inprogress -eq 0 ]; then
      echo "⚠️ 提交前检查: 以下任务仍为 in-progress,确认是否需要改为 done:"
      has_inprogress=1
    fi
    tasks=$(grep -B2 '"in-progress"' "$f" \
      | grep '"taskId"' \
      | sed 's/.*"taskId":\s*"\(.*\)".*/\1/' \
      | tr '\n' ' ')
    basename=$(basename "$f")
    echo "  $basename: $tasks"
  fi
done
