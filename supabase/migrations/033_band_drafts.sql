-- Instagram taramasında etkinliklerde adı geçen gruplar için öneri kuyruğu.
-- Admin onaylayınca ÜYESİZ ve SAHİPSİZ (creator_id NULL) bir bands kaydı oluşur;
-- grubun gerçek üyeleri daha sonra "Bu benim grubum" ile sahiplenir.

-- 1. Sahipsiz grup desteği
ALTER TABLE bands ALTER COLUMN creator_id DROP NOT NULL;

-- 2. Grup önerileri (admin onayı bekler)
CREATE TABLE IF NOT EXISTS band_drafts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  -- Mükerrer engeli: aynı isim (küçük harf, boşluk normalize) bir kez önerilir;
  -- atlanan bir grup sonraki taramalarda tekrar gelmez.
  name_key         text NOT NULL UNIQUE,
  instagram_handle text,
  city             text,
  genres           text[] DEFAULT '{}',
  source_username  text,
  event_draft_id   uuid REFERENCES event_drafts(id) ON DELETE SET NULL,
  sample_title     text,
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'skipped')),
  band_id          uuid REFERENCES bands(id) ON DELETE SET NULL,
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE band_drafts ENABLE ROW LEVEL SECURITY;
-- Sadece service role erişir (admin API route'ları)
GRANT ALL ON band_drafts TO service_role;
