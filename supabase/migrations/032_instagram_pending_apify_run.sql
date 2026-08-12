-- Apify taramaları asenkron çalışır (~100s sürüyor, Cloudflare'in ~100s origin
-- timeout'u senkron bekleyişi imkansız kılıyor). Başlatılan run'ın id'sini ve
-- başlama zamanını burada tutup, ayrı bir "finalize" adımıyla sonucu topluyoruz.
ALTER TABLE instagram_sources
  ADD COLUMN IF NOT EXISTS pending_apify_run_id text,
  ADD COLUMN IF NOT EXISTS pending_since timestamptz;
