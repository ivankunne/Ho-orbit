-- Enforces the paywall at the database level, not just in the React UI.
-- Until now, RequirePlan was a client-side-only gate: nothing in RLS
-- referenced profiles.plan, so anyone with a valid (free) session could read
-- "Premium" data directly via the Supabase REST API, bypassing the app
-- entirely. This closes that gap for every paywalled table EXCEPT BandSpace
-- (bands/band_members/band_messages/band_events/band_invites/
-- band_rehearsal_recordings) — that one is deliberately excluded pending a
-- real decision: does every band member need their own Pro plan, or does
-- one member's subscription cover the whole band? (2 of the 5 real bands
-- today have multiple members, so this isn't theoretical.) Do not add
-- BandSpace RLS here without that decision made first.
--
-- Uses RESTRICTIVE policies (AS RESTRICTIVE), not the default PERMISSIVE —
-- these AND onto whatever a table's existing policies already allow, rather
-- than replacing/competing with them. Several of these tables already carry
-- duplicate/overlapping permissive policies from being touched by multiple
-- migrations over time; restrictive policies are the safe way to layer a new
-- global requirement on top without having to audit and rewrite every
-- existing policy on each table.
--
-- Run manually once in the Supabase SQL editor, after
-- stripe_subscriptions_migration.sql and paywall_settings_migration.sql.

-- Deliberately broader than the frontend's current RequirePlan bypass
-- (which — as of 2026-09-08, for an explicit ongoing test — only bypasses
-- MASTER_ADMIN_EMAIL, not every admin). That frontend narrowing is about the
-- fan-facing paywall *experience* for testing; this function protects
-- *operational* access (admins moderating events/hub/forum posts via the
-- Admin panel), which must keep working for any admin regardless of that
-- frontend test. If the frontend bypass is ever widened back to "every
-- admin", these two already agree — no change needed here.
create or replace function public.has_paywalled_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    -- Global switch off (Admin panel "Ga live" not yet pressed) — nothing
    -- is actually restricted yet, matching RequirePlan's behavior.
    not coalesce((select enabled from public.paywall_settings where id = true), false)
    or public.is_admin()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and plan = 'paid'
    );
$$;

-- Mirrors isFreeConversation() in chatService.ts: a DM conversation is free
-- iff exactly one participant has role = 'Artiest'. Kept as its own function
-- (rather than folding into has_paywalled_access) since it needs the
-- specific conversation's two participants, not just the current user.
create or replace function public.can_access_conversation(p_conversation_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_p1 uuid;
  v_p2 uuid;
  v_other_id uuid;
  v_my_role text;
  v_other_role text;
begin
  select participant_1, participant_2 into v_p1, v_p2
  from public.conversations where id = p_conversation_id;

  if v_p1 is null then
    return false;
  end if;

  if public.has_paywalled_access() then
    return true;
  end if;

  v_other_id := case when v_p1 = auth.uid() then v_p2 else v_p1 end;

  select role into v_my_role from public.profiles where id = auth.uid();
  select role into v_other_role from public.profiles where id = v_other_id;

  return (v_my_role = 'Artiest') is distinct from (v_other_role = 'Artiest');
end;
$$;

-- Venue-pagina's — read-only feature, no user-facing write path today.
drop policy if exists "paywall_gate_venues_select" on public.venues;
create policy "paywall_gate_venues_select"
  on public.venues as restrictive for select
  using (public.has_paywalled_access());

-- Evenementen (overzicht + detail + ticketlinks)
drop policy if exists "paywall_gate_events" on public.events;
create policy "paywall_gate_events"
  on public.events as restrictive for all
  using (public.has_paywalled_access());

-- Netwerken (Wanted / Jump on a Track / Open Calls)
drop policy if exists "paywall_gate_networking_posts" on public.networking_posts;
create policy "paywall_gate_networking_posts"
  on public.networking_posts as restrictive for all
  using (public.has_paywalled_access());

-- Hub
drop policy if exists "paywall_gate_hub_posts" on public.hub_posts;
create policy "paywall_gate_hub_posts"
  on public.hub_posts as restrictive for all
  using (public.has_paywalled_access());

drop policy if exists "paywall_gate_hub_replies" on public.hub_replies;
create policy "paywall_gate_hub_replies"
  on public.hub_replies as restrictive for all
  using (public.has_paywalled_access());

-- Direct messages — fan↔artiest stays free, everything else needs Pro.
-- Only SELECT and INSERT: "mark as read" (UPDATE) on a conversation you can
-- already legitimately see (per the existing participant-only policy) isn't
-- worth blocking, and conversations themselves (the list) intentionally stay
-- fully visible — MessagesPage shows locked conversations with a badge
-- rather than hiding them, so conversations is NOT gated here.
drop policy if exists "paywall_gate_messages_select" on public.messages;
create policy "paywall_gate_messages_select"
  on public.messages as restrictive for select
  using (public.can_access_conversation(conversation_id));

drop policy if exists "paywall_gate_messages_insert" on public.messages;
create policy "paywall_gate_messages_insert"
  on public.messages as restrictive for insert
  with check (public.can_access_conversation(conversation_id));
