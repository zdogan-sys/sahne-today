-- Instagram hesap kaynakları
CREATE TABLE IF NOT EXISTS instagram_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  instagram_url text NOT NULL,
  city text,
  is_active boolean DEFAULT true,
  last_checked_at timestamptz,
  last_error text,
  created_at timestamptz DEFAULT now()
);

-- Claude'un çıkardığı etkinlik taslakları (admin onayı bekler)
CREATE TABLE IF NOT EXISTS event_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES instagram_sources(id) ON DELETE SET NULL,
  source_username text,
  post_url text,
  caption text,
  extracted jsonb,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'skipped')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE instagram_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_drafts ENABLE ROW LEVEL SECURITY;

-- Sadece service role erişir (admin işlemleri)

-- Ankara hesapları
INSERT INTO instagram_sources (username, instagram_url, city) VALUES
  ('lastpennyco',        'https://www.instagram.com/lastpennyco/',        'Ankara'),
  ('route_nyxlarge',     'https://www.instagram.com/route_nyxlarge/',     'Ankara'),
  ('beatrocknpub',       'https://www.instagram.com/beatrocknpub/',       'Ankara'),
  ('nefesbarankara',     'https://www.instagram.com/nefesbarankara/',     'Ankara'),
  ('nilrockbarbestekar', 'https://www.instagram.com/nilrockbarbestekar/', 'Ankara'),
  ('twisterpubb',        'https://www.instagram.com/twisterpubb/',        'Ankara'),
  ('manhattanbar.ankara','https://www.instagram.com/manhattanbar.ankara/','Ankara'),
  ('siyahbeyaz.bar',     'https://www.instagram.com/siyahbeyaz.bar/',     'Ankara'),
  ('tenedosankara',      'https://www.instagram.com/tenedosankara/',      'Ankara')
ON CONFLICT (username) DO NOTHING;
