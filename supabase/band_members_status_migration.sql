-- Add status column to band_members for join-request approval flow
-- Run this in the Supabase SQL editor AFTER band_space_migration.sql

ALTER TABLE band_members
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'
  CHECK (status IN ('pending', 'active'));

-- Update message policies: only ACTIVE members can read/write
DROP POLICY IF EXISTS "Members can read messages"  ON band_messages;
DROP POLICY IF EXISTS "Members can send messages"  ON band_messages;

CREATE POLICY "Active members can read messages" ON band_messages FOR SELECT USING (
  band_id IN (
    SELECT band_id FROM band_members
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE POLICY "Active members can send messages" ON band_messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  band_id IN (
    SELECT band_id FROM band_members
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Allow admins to accept/decline (UPDATE and DELETE on other members)
DROP POLICY IF EXISTS "Admins can remove members" ON band_members;

CREATE POLICY "Admins can update member status" ON band_members FOR UPDATE USING (
  band_id IN (
    SELECT band_id FROM band_members
    WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
  )
);

CREATE POLICY "Admins or self can remove members" ON band_members FOR DELETE USING (
  auth.uid() = user_id
  OR band_id IN (
    SELECT band_id FROM band_members
    WHERE user_id = auth.uid() AND role = 'admin' AND status = 'active'
  )
);
