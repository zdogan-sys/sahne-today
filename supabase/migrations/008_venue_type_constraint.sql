ALTER TABLE venues DROP CONSTRAINT IF EXISTS venues_venue_type_check;
ALTER TABLE venues ADD CONSTRAINT venues_venue_type_check
  CHECK (venue_type IN ('pub','turku_bar','live_music','bookstore','theater','cafe','studio','dance_studio','other'));
