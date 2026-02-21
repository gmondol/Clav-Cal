ALTER TABLE notes ADD COLUMN IF NOT EXISTS linked_collab_ids text[] DEFAULT '{}'::text[];
