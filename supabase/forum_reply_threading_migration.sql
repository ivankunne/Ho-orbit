-- Lets someone reply directly to a specific forum reply (not just the
-- thread as a whole), so a reply can point back to — and @mention — the
-- message it's responding to instead of sitting in one flat undifferentiated
-- list. reply_to_id is nullable: a normal top-level reply just omits it.
--
-- Run manually once via the Supabase SQL editor.

alter table public.forum_replies
  add column if not exists reply_to_id bigint references public.forum_replies(id) on delete set null;

create index if not exists forum_replies_reply_to_id_idx on public.forum_replies (reply_to_id);
