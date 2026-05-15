-- Band Space: bands, members, and channel messages
-- Run this in the Supabase SQL editor

CREATE TABLE IF NOT EXISTS bands (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE,
  description TEXT,
  genre       TEXT,
  location    TEXT,
  image_url   TEXT,
  is_public   BOOLEAN DEFAULT true,
  created_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS band_members (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id  UUID REFERENCES bands(id) ON DELETE CASCADE NOT NULL,
  user_id  UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role     TEXT DEFAULT 'member',  -- 'admin' | 'member'
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(band_id, user_id)
);

-- One row per message per channel (channel is one of the five Orbit tabs)
CREATE TABLE IF NOT EXISTS band_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  band_id    UUID REFERENCES bands(id) ON DELETE CASCADE NOT NULL,
  channel    TEXT NOT NULL,  -- 'rehearsals' | 'gigs' | 'socials' | 'magazine' | 'media'
  sender_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE bands         ENABLE ROW LEVEL SECURITY;
ALTER TABLE band_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE band_messages ENABLE ROW LEVEL SECURITY;

-- Bands: public bands visible to all; private bands only to members
CREATE POLICY "Public bands viewable by all"   ON bands FOR SELECT USING (is_public = true);
CREATE POLICY "Members can view private bands" ON bands FOR SELECT USING (
  id IN (SELECT band_id FROM band_members WHERE user_id = auth.uid())
);
CREATE POLICY "Authenticated users can create bands" ON bands FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Band admins can update"         ON bands FOR UPDATE USING (
  id IN (SELECT band_id FROM band_members WHERE user_id = auth.uid() AND role = 'admin')
);

-- Members
CREATE POLICY "Anyone can view band members"   ON band_members FOR SELECT USING (true);
CREATE POLICY "Users can join bands"           ON band_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave bands"          ON band_members FOR DELETE  USING (auth.uid() = user_id);
CREATE POLICY "Admins can remove members"      ON band_members FOR DELETE  USING (
  band_id IN (SELECT band_id FROM band_members WHERE user_id = auth.uid() AND role = 'admin')
);

-- Messages: only band members can read/write
CREATE POLICY "Members can read messages"      ON band_messages FOR SELECT USING (
  band_id IN (SELECT band_id FROM band_members WHERE user_id = auth.uid())
);
CREATE POLICY "Members can send messages"      ON band_messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  band_id IN (SELECT band_id FROM band_members WHERE user_id = auth.uid())
);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE band_messages;
