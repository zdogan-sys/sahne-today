-- Mekan social_links'inde Instagram varsa instagram_sources'a otomatik ekle.
-- INSERT veya UPDATE'te tetiklenir; username zaten varsa atlar.

CREATE OR REPLACE FUNCTION sync_venue_instagram_source()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  ig_url     text;
  v_username text;
BEGIN
  ig_url := NEW.social_links->>'instagram';

  IF ig_url IS NULL OR trim(ig_url) = '' THEN
    RETURN NEW;
  END IF;

  v_username := split_part(rtrim(ig_url, '/'), '/', array_length(string_to_array(rtrim(ig_url, '/'), '/'), 1));

  IF v_username = '' THEN
    RETURN NEW;
  END IF;

  INSERT INTO instagram_sources (username, instagram_url, city)
  VALUES (
    v_username,
    CASE WHEN ig_url LIKE 'http%' THEN ig_url ELSE 'https://www.instagram.com/' || v_username || '/' END,
    NEW.city
  )
  ON CONFLICT (username) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_venue_instagram_source
AFTER INSERT OR UPDATE OF social_links ON venues
FOR EACH ROW
EXECUTE FUNCTION sync_venue_instagram_source();
