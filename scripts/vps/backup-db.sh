#!/bin/sh
# sahne.today — Supabase Postgres günlük yedek scripti
# VPS'te çalışır. Kurulum: scripts/vps/README.md
#
# Yaptıkları:
#   1. Supabase'in postgres container'ında pg_dump alır (tüm şemalar: public, auth, storage)
#   2. gzip'leyip /root/db-backups altına tarihli dosya olarak koyar
#   3. 14 günden eski yedekleri siler
#   4. rclone kuruluysa ve REMOTE tanımlıysa uzak depoya (örn. Cloudflare R2) kopyalar

set -eu

BACKUP_DIR="/root/db-backups"
KEEP_DAYS=14
# rclone remote adı (boş bırakılırsa uzak kopya atlanır), örn: "r2:sahne-yedek"
REMOTE="${BACKUP_REMOTE:-}"

# Supabase'in db container'ını bul (Coolify stack'inde adı genelde 'supabase-db-...' olur)
CONTAINER=$(docker ps --format '{{.Names}}' | grep -iE 'supabase.*db|db.*supabase' | head -1)
if [ -z "$CONTAINER" ]; then
  echo "HATA: Supabase db container bulunamadi. 'docker ps' ciktisini kontrol et." >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
STAMP=$(date +%F)
FILE="$BACKUP_DIR/sahne_${STAMP}.sql.gz"

echo "[$(date '+%F %T')] Yedek aliniyor: $CONTAINER -> $FILE"
docker exec "$CONTAINER" pg_dump -U postgres -d postgres --no-owner | gzip > "$FILE"

SIZE=$(du -h "$FILE" | cut -f1)
echo "[$(date '+%F %T')] Tamamlandi ($SIZE)"

# Eski yedekleri temizle
find "$BACKUP_DIR" -name 'sahne_*.sql.gz' -mtime +"$KEEP_DAYS" -delete

# Uzak kopya (opsiyonel)
if [ -n "$REMOTE" ] && command -v rclone >/dev/null 2>&1; then
  echo "[$(date '+%F %T')] Uzak kopya: $REMOTE"
  rclone copy "$FILE" "$REMOTE/" --s3-no-check-bucket
fi

echo "[$(date '+%F %T')] Bitti."
