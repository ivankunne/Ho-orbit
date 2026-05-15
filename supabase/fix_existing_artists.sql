-- One-time fix: promote all users with approved tracks to role 'Artiest'
-- Run this once in the Supabase SQL Editor to fix existing accounts.

UPDATE profiles
SET role = 'Artiest'
WHERE id IN (
  SELECT DISTINCT uploaded_by
  FROM tracks
  WHERE upload_status = 'approved'
    AND uploaded_by IS NOT NULL
)
AND role != 'Artiest';
