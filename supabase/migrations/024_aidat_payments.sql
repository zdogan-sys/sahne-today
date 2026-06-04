-- Aidat ödeme kayıtları (manuel işaretleme — otomatik tahsilat yok)
CREATE TABLE IF NOT EXISTS aidat_payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  ref_type text NOT NULL CHECK (ref_type IN ('course','lesson')),
  ref_id uuid NOT NULL,            -- enrollment_id (kurs) | lesson_request_id (ders)
  student_name text,
  student_email text,
  label text,                      -- "Gitar Kursu" / "Bağlama" (filtre/gösterim)
  period text NOT NULL,            -- 'YYYY-MM'
  amount numeric,
  paid bool DEFAULT false,
  paid_at timestamptz,
  method text,                     -- 'cash' | 'pos' | 'transfer'
  note text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (ref_type, ref_id, period)
);

ALTER TABLE aidat_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Venue owner manages aidat" ON aidat_payments;
CREATE POLICY "Venue owner manages aidat" ON aidat_payments FOR ALL USING (
  auth.uid() = (SELECT owner_id FROM venues WHERE id = venue_id)
);

GRANT ALL ON aidat_payments TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON aidat_payments TO authenticated;

-- Aylık özel ders onayında ücret + seri yakalanmalı
ALTER TABLE lesson_requests ADD COLUMN IF NOT EXISTS monthly_price numeric;
ALTER TABLE lesson_requests ADD COLUMN IF NOT EXISTS series_id uuid;
