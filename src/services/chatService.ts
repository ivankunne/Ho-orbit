import { supabase } from '@/lib/supabase';

export interface ConversationParticipant {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  last_message_at: string;
  created_at: string;
  other_participant: ConversationParticipant;
  last_message: string | null;
  unread_count: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read: boolean;
}

export async function getOrCreateConversation(
  currentUserId: string,
  otherUserId: string
): Promise<string | null> {
  // Normalise order so (A,B) and (B,A) map to the same row
  const [p1, p2] = [currentUserId, otherUserId].sort();

  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('participant_1', p1)
    .eq('participant_2', p2)
    .single();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from('conversations')
    .insert({ participant_1: p1, participant_2: p2 })
    .select('id')
    .single();

  if (error) {
    console.warn('[chat] createConversation failed:', error.message);
    return null;
  }
  return created.id;
}

export async function getConversations(userId: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
    .order('last_message_at', { ascending: false });

  if (error || !data) return [];

  const results: Conversation[] = await Promise.all(
    data.map(async (conv) => {
      const otherId = conv.participant_1 === userId ? conv.participant_2 : conv.participant_1;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .eq('id', otherId)
        .single();

      const { data: lastMsg } = await supabase
        .from('messages')
        .select('content')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const { count: unread } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .eq('read', false)
        .neq('sender_id', userId);

      return {
        ...conv,
        other_participant: profile ?? { id: otherId, username: 'onbekend', display_name: null, avatar_url: null },
        last_message: lastMsg?.content ?? null,
        unread_count: unread ?? 0,
      };
    })
  );

  return results;
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) return [];
  return data ?? [];
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string
): Promise<Message | null> {
  const trimmed = content.trim();
  if (!trimmed) return null;

  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, content: trimmed })
    .select()
    .single();

  if (error) {
    console.warn('[chat] sendMessage failed:', error.message);
    return null;
  }

  // Bump last_message_at on the conversation
  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);

  return data;
}

export async function markMessagesRead(conversationId: string, userId: string) {
  await supabase
    .from('messages')
    .update({ read: true })
    .eq('conversation_id', conversationId)
    .eq('read', false)
    .neq('sender_id', userId);
}

export async function getUnreadMessageCount(userId: string): Promise<number> {
  const { data: convs } = await supabase
    .from('conversations')
    .select('id')
    .or(`participant_1.eq.${userId},participant_2.eq.${userId}`);

  if (!convs || convs.length === 0) return 0;

  const ids = convs.map((c) => c.id);
  const { count } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .in('conversation_id', ids)
    .eq('read', false)
    .neq('sender_id', userId);

  return count ?? 0;
}
