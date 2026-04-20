#!/bin/bash
# 未完成任务提醒: 开启会话时扫描 in-progress 任务
# 触发时机: ConversationStart

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
found=0

for f in "$PROJECT_ROOT"/docs/tasks/tasks-*.json; do
  [ -f "$f" ] || continue

  if grep -q '"status":\s*"in-progress"' "$f" 2>/dev/null; then
    if [ $found -eq 0 ]; then
      echo "📋 发现未完成的任务:"
      found=1
    fi
    tasks=$(grep -B2 '"in-progress"' "$f" \
      | grep '"taskId"' \
      | sed 's/.*"taskId":\s*"\(.*\)".*/\1/' \
      | tr '\n' ' ')
    basename=$(basename "$f")
    echo "  $basename: $tasks"
  fi
done
