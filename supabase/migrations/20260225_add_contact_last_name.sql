ALTER TABLE notes ADD COLUMN IF NOT EXISTS contact_last_name text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS contact_last_name text;
