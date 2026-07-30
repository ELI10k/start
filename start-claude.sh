#!/usr/bin/env bash
set -euo pipefail

if ! command -v claude >/dev/null 2>&1; then
  echo "Claude Code is not installed."
  echo "Install it with: npm install -g @anthropic-ai/claude-code"
  exit 1
fi

if [ ! -d .git ]; then
  echo "Run this script from the START repository root (the folder containing .git)."
  exit 1
fi

for file in CLAUDE.md START_MASTER.md HANDOFF_CHECKLIST.md PROJECT_STATUS.md; do
  if [ ! -f "$file" ]; then
    echo "Missing required handoff file: $file"
    exit 1
  fi
done

printf '\nSTART repository: %s\n' "$(pwd)"
printf 'Current branch: %s\n' "$(git branch --show-current 2>/dev/null || true)"
printf 'Working tree:\n'
git status --short || true
printf '\nLaunching Claude Code...\n'
exec claude
