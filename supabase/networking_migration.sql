-- Networking & Exchange posts (Wanted, Jump on a Track, Open Calls)
-- Run this in the Supabase SQL editor

CREATE TABLE IF NOT EXISTS networking_posts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('wanted', 'jump_on_track', 'open_call')),
  title        TEXT NOT NULL,
  description  TEXT,
  genre        TEXT,
  location     TEXT,
  tags         TEXT[] DEFAULT '{}',
  event_id     INTEGER,    -- populated for open_call posts
  track_title  TEXT,       -- populated for jump_on_track posts
  contact_info TEXT,       -- email / IG / link the poster wants to share
  status       TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE networking_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view open posts"    ON networking_posts FOR SELECT USING (status = 'open');
CREATE POLICY "Users can create posts"        ON networking_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts"    ON networking_posts FOR UPDATE  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts"    ON networking_posts FOR DELETE  USING (auth.uid() = user_id);
