CREATE TABLE IF NOT EXISTS custom_tags (
  name text PRIMARY KEY,
  color text NOT NULL DEFAULT '#3b82f6'
);

ALTER TABLE custom_tags ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'custom_tags' AND policyname = 'Allow all') THEN
    CREATE POLICY "Allow all" ON custom_tags FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
