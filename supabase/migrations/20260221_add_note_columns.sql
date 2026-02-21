ALTER TABLE notes ADD COLUMN IF NOT EXISTS status text DEFAULT 'idea';
ALTER TABLE notes ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS contact text;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS attachments text[] DEFAULT '{}'::text[];
