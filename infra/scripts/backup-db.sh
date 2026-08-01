#!/bin/bash
# Бэкап SQLite БД на Railway Volume
# Использование: ./backup-db.sh [service-name]
# По умолчанию: amazilia-api

set -euo pipefail

SERVICE="${1:-amazilia-api-prod}"
TIMESTAMP=$(date +%s)
BACKUP_NAME="jazz-trainer-backup-${TIMESTAMP}.sqlite"
REMOTE_DB="/app/data/jazz-trainer.sqlite"
REMOTE_BACKUP="/app/data/${BACKUP_NAME}"

echo "🔒 Backing up SQLite database from Railway service '${SERVICE}'..."
echo "   Source: ${REMOTE_DB}"
echo "   Backup: ${REMOTE_BACKUP}"

# Step 1: Copy DB to backup file on Railway Volume
railway run --service "${SERVICE}" \
  "cp ${REMOTE_DB} ${REMOTE_BACKUP}" || {
  echo "❌ Failed to create backup on Railway Volume"
  exit 1
}

# Step 2: Download backup to local machine
echo "📥 Downloading backup to local machine..."
railway run --service "${SERVICE}" "cat ${REMOTE_BACKUP}" > "${BACKUP_NAME}" || {
  echo "❌ Failed to download backup"
  exit 1
}

echo "✅ Backup complete: ${BACKUP_NAME} ($(du -h "${BACKUP_NAME}" | cut -f1))"

# Step 3: Cleanup old backups on Railway Volume (keep last 5)
echo "🧹 Cleaning up old backups (keeping last 5)..."
railway run --service "${SERVICE}" \
  "ls -t /app/data/jazz-trainer-backup-*.sqlite 2>/dev/null | tail -n +6 | xargs -r rm" || true

echo "✅ Done."
