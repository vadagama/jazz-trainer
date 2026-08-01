#!/bin/bash
# activate-git-hooks.sh — настройка git-хуков для проекта
#
# Активирует pre-push хук из infra/git-hooks/ через core.hooksPath.
# Выполняется один раз при клонировании репозитория.
#
# Usage: bash infra/scripts/activate-git-hooks.sh

set -euo pipefail

HOOKS_DIR="infra/git-hooks"

if [ ! -d "$HOOKS_DIR" ]; then
  echo "❌ $HOOKS_DIR не найден — запусти скрипт из корня репозитория"
  exit 1
fi

git config core.hooksPath "$HOOKS_DIR"
echo "✅ Git hooks активированы: core.hooksPath = $HOOKS_DIR"
echo ""
echo "   Проверки перед пушем:"
echo "   • Всегда: целостность package-lock.json"
echo "   • При пуше в main: typecheck + lint + test"
echo ""
echo "   Пропустить проверки: git push --no-verify"
