#!/bin/bash
# Восстановление SQLite БД на Railway Volume из бэкапа
# Использование:
#   ./rollback-db.sh <backup-file>          — восстановить из локального файла
#   ./rollback-db.sh --latest               — восстановить последний бэкап на Railway Volume
#   ./rollback-db.sh --list                 — показать доступные бэкапы на Railway Volume

set -euo pipefail

SERVICE="${2:-amazilia-api-prod}"
REMOTE_DB="/app/data/jazz-trainer.sqlite"

if [ $# -eq 0 ]; then
  echo "Usage:"
  echo "  $0 <backup-file> [service-name]     Restore from local backup file"
  echo "  $0 --latest [service-name]          Restore latest backup on Railway Volume"
  echo "  $0 --list [service-name]            List available backups on Railway Volume"
  exit 1
fi

case "$1" in
  --list)
    echo "📋 Available backups on Railway Volume (service: ${SERVICE}):"
    railway run --service "${SERVICE}" \
      "ls -lh /app/data/jazz-trainer-backup-*.sqlite 2>/dev/null || echo '(no backups found)'"
    ;;

  --latest)
    echo "🔍 Finding latest backup on Railway Volume..."
    LATEST=$(railway run --service "${SERVICE}" \
      "ls -t /app/data/jazz-trainer-backup-*.sqlite 2>/dev/null | head -1" || true)

    if [ -z "${LATEST}" ]; then
      echo "❌ No backups found on Railway Volume"
      exit 1
    fi

    echo "   Latest backup: ${LATEST}"
    echo "⚠️  This will REPLACE the current database. Are you sure? (yes/no)"
    read -r CONFIRM
    if [ "${CONFIRM}" != "yes" ]; then
      echo "❌ Rollback cancelled"
      exit 1
    fi

    echo "🔄 Restoring database from ${LATEST}..."
    railway run --service "${SERVICE}" "cp ${LATEST} ${REMOTE_DB}" || {
      echo "❌ Rollback failed"
      exit 1
    }

    echo "🔄 Redeploying service to pick up restored database..."
    railway service redeploy --service "${SERVICE}" || true
    echo "✅ Rollback complete. Service is restarting with restored database."
    ;;

  *)
    BACKUP_FILE="$1"
    if [ ! -f "${BACKUP_FILE}" ]; then
      echo "❌ Backup file not found: ${BACKUP_FILE}"
      exit 1
    fi

    echo "⚠️  This will REPLACE the current database with ${BACKUP_FILE}. Are you sure? (yes/no)"
    read -r CONFIRM
    if [ "${CONFIRM}" != "yes" ]; then
      echo "❌ Rollback cancelled"
      exit 1
    fi

    echo "🔄 Uploading backup to Railway Volume..."
    railway run --service "${SERVICE}" "cat > ${REMOTE_DB}" < "${BACKUP_FILE}" || {
      echo "❌ Upload failed"
      exit 1
    }

    echo "🔄 Redeploying service to pick up restored database..."
    railway service redeploy --service "${SERVICE}" || true
    echo "✅ Rollback complete. Service is restarting with restored database."
    ;;
esac
