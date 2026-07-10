# VPS Veritabanı Yedeği — Kurulum

Günlük Supabase Postgres yedeği. Script: `backup-db.sh`

## 1. Scripti VPS'e kopyala

Lokal makineden (PowerShell):

```powershell
scp scripts/vps/backup-db.sh root@VPS_IP:/root/backup-db.sh
```

(ya da içeriği kopyalayıp VPS'te `nano /root/backup-db.sh` ile yapıştır)

## 2. VPS'te çalıştırılabilir yap ve test et

```bash
chmod +x /root/backup-db.sh
/root/backup-db.sh
ls -lh /root/db-backups/
```

Tarihli bir `.sql.gz` dosyası görmelisin. İçini doğrulamak için:

```bash
zcat /root/db-backups/sahne_*.sql.gz | head -20
```

## 3. Günlük cron kur (sabah 04:00)

```bash
crontab -e
```

Şu satırı ekle:

```
0 4 * * * /root/backup-db.sh >> /var/log/db-backup.log 2>&1
```

## 4. (Şiddetle önerilir) VPS dışına kopya — Cloudflare R2

Disk/VPS kaybına karşı asıl koruma bu. R2'de ücretsiz 10 GB var,
Cloudflare hesabın zaten mevcut (DNS orada).

1. Cloudflare Dashboard → R2 → bucket oluştur: `sahne-yedek`
2. R2 API token oluştur (Object Read & Write)
3. VPS'te rclone kur ve yapılandır:

```bash
apt install -y rclone
rclone config
# n (yeni remote) → isim: r2 → tip: s3 → provider: Cloudflare
# access_key_id / secret_access_key: R2 token'dan
# endpoint: https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

4. Cron satırını şöyle değiştir:

```
0 4 * * * BACKUP_REMOTE="r2:sahne-yedek" /root/backup-db.sh >> /var/log/db-backup.log 2>&1
```

## Geri yükleme (gerektiğinde)

```bash
zcat /root/db-backups/sahne_YYYY-MM-DD.sql.gz | docker exec -i <supabase-db-container> psql -U postgres -d postgres
```

> Not: Geri yükleme mevcut verinin üzerine yazar; önce yeni bir yedek al.
