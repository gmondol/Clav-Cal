CREATE TABLE IF NOT EXISTS contacts (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text,
  phone text,
  role text,
  company text,
  profile_pic_url text,
  twitch_url text,
  kick_url text,
  ig_url text,
  twitter_url text,
  tiktok_url text,
  youtube_url text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to contacts" ON contacts
  FOR ALL USING (true) WITH CHECK (true);
