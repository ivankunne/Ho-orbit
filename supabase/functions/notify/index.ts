// Edge Function: notify
//
// Sends transactional notifications (in-app row + email via Resend) to the
// RECIPIENT of an action. Invoked from the browser by the actor right after a
// message is sent or a follow is created. Runs with the service-role key so it
// can read the recipient's email/prefs and write a notification row on their
// behalf (which RLS blocks for the client).
//
// Body:
//   { kind: 'message', conversationId: string, messageId: string }
//   { kind: 'follow',  targetUserId: string }   // UUID of the followed profile
//
// Deploy:  supabase functions deploy notify
// Secrets: RESEND_API_KEY, SITE_URL (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
//          are injected automatically by the platform).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { sendEmail } from '../_shared/resend.ts';
import { newFollowerEmail, newMessageEmail } from '../_shared/emails.ts';
import { sendPushToUser } from '../_shared/push.ts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

// Opt-out model: a pref counts as enabled unless it was explicitly set to false.
const prefEnabled = (prefs: Record<string, unknown> | null, key: string) =>
  !prefs || prefs[key] !== false;

function displayName(p: { display_name?: string | null; username?: string | null } | null): string {
  return p?.display_name || p?.username || 'iemand';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !serviceKey) return json({ error: 'Server not configured' }, 500);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Identify the caller from their JWT — the actor.
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  const callerId = userData?.user?.id;
  if (userErr || !callerId) return json({ error: 'Unauthorized' }, 401);

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  try {
    if (payload.kind === 'message') {
      return await handleMessage(admin, callerId, payload);
    }
    if (payload.kind === 'follow') {
      return await handleFollow(admin, callerId, payload);
    }
    return json({ error: 'Unknown kind' }, 400);
  } catch (e) {
    console.error('[notify] error:', e);
    return json({ error: 'Internal error' }, 500);
  }
});

async function handleMessage(
  admin: ReturnType<typeof createClient>,
  callerId: string,
  payload: Record<string, unknown>,
) {
  const conversationId = String(payload.conversationId ?? '');
  const messageId = String(payload.messageId ?? '');
  if (!UUID_RE.test(conversationId) || !UUID_RE.test(messageId)) {
    return json({ error: 'conversationId and messageId must be UUIDs' }, 400);
  }

  const { data: message } = await admin
    .from('messages')
    .select('id, sender_id, conversation_id, content')
    .eq('id', messageId)
    .single();

  // The caller must be the actual sender of the message.
  if (!message || message.sender_id !== callerId || message.conversation_id !== conversationId) {
    return json({ error: 'Message not found for caller' }, 403);
  }

  const { data: conv } = await admin
    .from('conversations')
    .select('participant_1, participant_2')
    .eq('id', conversationId)
    .single();
  if (!conv) return json({ error: 'Conversation not found' }, 404);

  const recipientId = conv.participant_1 === callerId ? conv.participant_2 : conv.participant_1;
  if (!recipientId || recipientId === callerId) return json({ skipped: 'self' });

  const [{ data: recipient }, { data: sender }] = await Promise.all([
    admin.from('profiles').select('display_name, username, email, notification_prefs').eq('id', recipientId).single(),
    admin.from('profiles').select('display_name, username').eq('id', callerId).single(),
  ]);

  const senderName = displayName(sender);
  const preview = message.content.length > 120 ? `${message.content.slice(0, 120)}…` : message.content;
  const title = `Nieuw bericht van ${senderName}`;
  const link = `/berichten/${conversationId}`;

  // In-app notification (always — fixes recipients previously getting nothing).
  await admin.from('notifications').insert({
    user_id: recipientId,
    type: 'message',
    title,
    body: preview,
    link,
  });

  // Push + email share the "Nieuw bericht" preference (opt-out model).
  const wantsMessage = prefEnabled(recipient?.notification_prefs ?? null, 'Nieuw bericht');

  let pushed = 0;
  if (wantsMessage) {
    const res = await sendPushToUser(admin, recipientId, {
      title,
      body: preview,
      url: link,
      tag: `conv-${conversationId}`,
    });
    pushed = res.sent;
  }

  let emailed = false;
  if (recipient?.email && wantsMessage) {
    const { subject, html } = newMessageEmail({
      recipientName: displayName(recipient),
      senderName,
      preview: message.content,
      conversationId,
    });
    const res = await sendEmail({ to: recipient.email, subject, html });
    emailed = res.ok;
    if (!res.ok) console.warn('[notify] message email failed:', res.error);
  }

  return json({ ok: true, emailed, pushed });
}

async function handleFollow(
  admin: ReturnType<typeof createClient>,
  callerId: string,
  payload: Record<string, unknown>,
) {
  const targetUserId = String(payload.targetUserId ?? '');
  if (!UUID_RE.test(targetUserId)) {
    return json({ error: 'targetUserId must be a profile UUID' }, 400);
  }
  if (targetUserId === callerId) return json({ skipped: 'self' });

  const [{ data: target }, { data: follower }] = await Promise.all([
    admin.from('profiles').select('display_name, username, email, notification_prefs').eq('id', targetUserId).single(),
    admin.from('profiles').select('display_name, username').eq('id', callerId).single(),
  ]);
  if (!target) return json({ error: 'Target profile not found' }, 404);

  const followerName = displayName(follower);
  const followerUsername = follower?.username ?? '';
  const link = followerUsername ? `/profiel/${followerUsername}` : '/profiel';
  const body = `${followerName} volgt je nu`;

  await admin.from('notifications').insert({
    user_id: targetUserId,
    type: 'follow',
    title: 'Nieuwe volger',
    body,
    link,
  });

  // Push + email share the "Nieuwe volger" preference (opt-out model).
  const wantsFollow = prefEnabled(target.notification_prefs, 'Nieuwe volger');

  let pushed = 0;
  if (wantsFollow) {
    const res = await sendPushToUser(admin, targetUserId, {
      title: 'Nieuwe volger',
      body,
      url: link,
      tag: 'follow',
    });
    pushed = res.sent;
  }

  let emailed = false;
  if (target.email && wantsFollow) {
    const { subject, html } = newFollowerEmail({
      recipientName: displayName(target),
      followerName,
      followerUsername,
    });
    const res = await sendEmail({ to: target.email, subject, html });
    emailed = res.ok;
    if (!res.ok) console.warn('[notify] follow email failed:', res.error);
  }

  return json({ ok: true, emailed, pushed });
}
