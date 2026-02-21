ALTER TABLE notes ADD COLUMN IF NOT EXISTS contact_name text;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS contact_phone text;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS contact_notes text;

ALTER TABLE events ADD COLUMN IF NOT EXISTS contact_name text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS contact_phone text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS contact_notes text;
