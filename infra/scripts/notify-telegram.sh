#!/bin/bash
# notify-telegram.sh — Send alert to Telegram via Bot API
#
# Usage:
#   ./notify-telegram.sh "Pipeline failed: deploy-api" "error"
#   ./notify-telegram.sh "Deploy successful" "info"
#
# Environment variables (set in CI secrets or .env):
#   TELEGRAM_BOT_TOKEN  — Bot token from @BotFather
#   TELEGRAM_CHAT_ID    — Target chat/group ID
#
# Message levels: info, warn, error, success
# Use emoji prefixes for visual distinction in Telegram.

set -euo pipefail

MESSAGE="${1:-No message}"
LEVEL="${2:-info}"
BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
CHAT_ID="${TELEGRAM_CHAT_ID:-}"

if [ -z "$BOT_TOKEN" ] || [ -z "$CHAT_ID" ]; then
  echo "[notify-telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set — skipping notification"
  exit 0
fi

# Emoji prefix by level
case "$LEVEL" in
  success) EMOJI="✅" ;;
  error)   EMOJI="🔴" ;;
  warn)    EMOJI="⚠️" ;;
  *)       EMOJI="ℹ️" ;;
esac

# Build message with context
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M:%S UTC")
REPO="${GITHUB_REPOSITORY:-local}"
REF="${GITHUB_REF_NAME:-unknown}"
RUN_URL="${GITHUB_SERVER_URL:-}/${GITHUB_REPOSITORY:-}/actions/runs/${GITHUB_RUN_ID:-}"
COMMIT="${GITHUB_SHA:-unknown}"
COMMIT_SHORT="${COMMIT:0:7}"

FULL_MESSAGE="${EMOJI} *${LEVEL^^}* — ${REPO}
${MESSAGE}

📋 *Details:*
• Branch: \`${REF}\`
• Commit: \`${COMMIT_SHORT}\`
• Time: ${TIMESTAMP}"

# Append run URL if available
if [ -n "${RUN_URL:-}" ] && [ "$RUN_URL" != "/" ]; then
  FULL_MESSAGE="${FULL_MESSAGE}
• [View Run](${RUN_URL})"
fi

# Send via Telegram Bot API
# HTML parse mode for bold/link formatting
curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
  -H "Content-Type: application/json" \
  -d "$(cat <<EOF
{
  "chat_id": "${CHAT_ID}",
  "text": "${FULL_MESSAGE}",
  "parse_mode": "Markdown",
  "disable_web_page_preview": true
}
EOF
)" > /dev/null

echo "[notify-telegram] Notification sent (level=${LEVEL})"
