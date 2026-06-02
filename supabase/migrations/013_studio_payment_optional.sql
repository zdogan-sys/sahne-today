-- Stüdyo rezervasyonlarında ödeme opsiyonel
ALTER TABLE venues ADD COLUMN IF NOT EXISTS studio_payment_enabled bool DEFAULT false;
