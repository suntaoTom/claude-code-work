#!/bin/bash
# P0 硬编码检测: 编辑 ts/tsx 文件后, 扫描未走 i18n 的中文文案
# 触发时机: PostToolUse (Edit|Write)

filepath="$CLAUDE_FILE_PATH"

# 非 ts/tsx/js/jsx 文件跳过
[ -z "$filepath" ] && exit 0
echo "$filepath" | grep -qE '\.(tsx?|jsx?)$' || exit 0
[ -f "$filepath" ] || exit 0

# 扫描中文字符, 排除注释行
matches=$(grep -nP '[\x{4e00}-\x{9fff}]' "$filepath" 2>/dev/null \
  | grep -vE '^[0-9]+:\s*(//|/\*|\*|\*/)' \
  | head -5)

if [ -n "$matches" ]; then
  echo "⚠️ P0 硬编码检测: $filepath 中发现中文文案,请走 i18n"
  echo "$matches"
fi
