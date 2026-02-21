ALTER TABLE notes ADD COLUMN IF NOT EXISTS contact_role text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS contact_role text;
