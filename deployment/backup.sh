#!/bin/bash
# Eduly Database Backup Script
# Usage: Add to crontab: 0 2 * * * /path/to/backup.sh
# Runs daily at 2 AM

set -euo pipefail

BACKUP_DIR="/var/backups/eduly"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

# PostgreSQL backup
if [ -n "${DATABASE_URL:-}" ]; then
    DB_NAME=$(echo "$DATABASE_URL" | sed -n 's|.*//.*/.*/\(.*\)|\1|p' || echo "eduly")
    pg_dump "$DATABASE_URL" | gzip > "$BACKUP_DIR/eduly_${TIMESTAMP}.sql.gz"
    echo "[$(date)] PostgreSQL backup: eduly_${TIMESTAMP}.sql.gz"
else
    # SQLite backup
    SQLITE_PATH="${SQLITE_PATH:-/var/www/eduly/backend/eduly.db}"
    if [ -f "$SQLITE_PATH" ]; then
        sqlite3 "$SQLITE_PATH" ".backup '$BACKUP_DIR/eduly_${TIMESTAMP}.db'"
        gzip "$BACKUP_DIR/eduly_${TIMESTAMP}.db"
        echo "[$(date)] SQLite backup: eduly_${TIMESTAMP}.db.gz"
    else
        echo "[$(date)] ERROR: No database found"
        exit 1
    fi
fi

# Remove old backups
find "$BACKUP_DIR" -name "eduly_*" -mtime +"$RETENTION_DAYS" -delete
echo "[$(date)] Cleaned backups older than ${RETENTION_DAYS} days"
