-- ============================================================================
-- FIX: band creation fails with 403 on band_members insert
--
-- band_roles_migration.sql tightened the band_members INSERT policy to only
-- allow self-inserting as a pending 'member' (closing the old hole where a
-- user could insert themselves directly as an active admin). That
-- inadvertently also blocked the legitimate band-creation flow
-- (BandSpacePage.tsx handleCreate), which inserts the creator as an active
-- member immediately after creating the band row — no join-request/approval
-- step for your own band.
--
-- Fix: allow a second, narrow case — self-insert as active 'owner', but only
-- for a band whose bands.created_by is the caller themselves. This can't be
-- forged (created_by is fixed at band creation, checked via EXISTS), and the
-- existing one-active-owner-per-band unique index still prevents duplicates.
--
-- Run in the Supabase Dashboard → SQL Editor. Safe to re-run.
-- ============================================================================

DROP POLICY IF EXISTS "Users can request to join as pending member" ON band_members;
CREATE POLICY "Users can join as pending, or claim ownership of their own band" ON band_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND (
      (role = 'member' AND status = 'pending')
      OR (
        role = 'owner' AND status = 'active'
        AND EXISTS (SELECT 1 FROM bands WHERE bands.id = band_members.band_id AND bands.created_by = auth.uid())
      )
    )
  );
