CREATE TABLE IF NOT EXISTS production_items (
  id text PRIMARY KEY,
  parent_id text REFERENCES production_items(id) ON DELETE CASCADE,
  title text NOT NULL,
  item_type text NOT NULL DEFAULT 'note',
  icon text NOT NULL DEFAULT '📄',
  color text NOT NULL DEFAULT '#3b82f6',
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_production_items_parent ON production_items(parent_id);

ALTER TABLE production_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'production_items' AND policyname = 'Allow all') THEN
    CREATE POLICY "Allow all" ON production_items FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
