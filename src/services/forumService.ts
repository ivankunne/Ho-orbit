import { supabase } from '@/lib/supabase';

export async function getCategories() {
  const { data } = await supabase
    .from('forum_categories')
    .select('*')
    .order('sort_order');
  return data ?? [];
}

export async function getThreadsByCategory(categoryId?: number) {
  let query = supabase
    .from('forum_threads')
    .select('*, profiles:author_id(username, display_name, avatar_url)')
    .order('pinned', { ascending: false })
    .order('last_post_at', { ascending: false });
  if (categoryId) query = query.eq('category_id', categoryId);
  const { data } = await query;
  return (data ?? []).map(mapThread);
}

export async function getThread(threadId: string | number) {
  const { data } = await supabase
    .from('forum_threads')
    .select('*, profiles:author_id(username, display_name, avatar_url)')
    .eq('id', threadId)
    .single();
  if (!data) return null;
  await supabase.from('forum_threads').update({ views_count: data.views_count + 1 }).eq('id', threadId);
  return mapThread(data);
}

export async function createThread({
  categoryId, title, body, tags = [], authorId,
}: {
  categoryId: number; title: string; body: string; tags?: string[]; authorId: string;
}) {
  const { data, error } = await supabase
    .from('forum_threads')
    .insert({ category_id: categoryId, title, body, tags, author_id: authorId })
    .select('*, profiles:author_id(username, display_name, avatar_url)')
    .single();
  if (error || !data) throw error;
  return mapThread(data);
}

export async function getReplies(threadId: string | number) {
  const { data } = await supabase
    .from('forum_replies')
    .select('*, profiles:author_id(username, display_name, avatar_url), forum_reply_likes(user_id)')
    .eq('thread_id', threadId)
    .order('created_at');
  return (data ?? []).map(mapReply);
}

export async function createReply({
  threadId, body, authorId,
}: {
  threadId: string | number; body: string; authorId: string;
}) {
  const { data, error } = await supabase
    .from('forum_replies')
    .insert({ thread_id: threadId, content: body, author_id: authorId })
    .select('*, profiles:author_id(username, display_name, avatar_url)')
    .single();
  if (error || !data) throw error;
  const { data: thread } = await supabase.from('forum_threads').select('replies_count').eq('id', threadId).single();
  await supabase
    .from('forum_threads')
    .update({ replies_count: ((thread?.replies_count as number) ?? 0) + 1, last_post_at: new Date().toISOString() })
    .eq('id', threadId);
  return mapReply(data);
}

export async function toggleReplyLike(replyId: number, _threadId: string | number, userId: string) {
  const { data: existing } = await supabase
    .from('forum_reply_likes')
    .select('reply_id')
    .eq('reply_id', replyId)
    .eq('user_id', userId)
    .single();
  if (existing) {
    await supabase.from('forum_reply_likes').delete().eq('reply_id', replyId).eq('user_id', userId);
    const { data: reply } = await supabase.from('forum_replies').select('likes_count').eq('id', replyId).single();
    await supabase.from('forum_replies').update({ likes_count: Math.max(0, ((reply?.likes_count as number) ?? 1) - 1) }).eq('id', replyId);
  } else {
    await supabase.from('forum_reply_likes').insert({ reply_id: replyId, user_id: userId });
  }
}

function mapThread(d: Record<string, unknown>) {
  const profile = d.profiles as { username: string; display_name: string; avatar_url: string } | null;
  return {
    id: d.id,
    categoryId: d.category_id,
    title: d.title,
    body: d.body,
    tags: d.tags ?? [],
    pinned: d.pinned,
    replies: d.replies_count,
    views: d.views_count,
    createdAt: d.created_at,
    author: {
      id: d.author_id,
      name: profile?.display_name ?? profile?.username ?? 'Unknown',
      avatar: profile?.avatar_url ?? '',
    },
    lastPost: { user: profile?.display_name ?? '', time: d.last_post_at },
  };
}

function mapReply(d: Record<string, unknown>) {
  const profile = d.profiles as { username: string; display_name: string; avatar_url: string } | null;
  const likedBy = ((d.forum_reply_likes as { user_id: string }[]) ?? []).map((l) => l.user_id);
  return {
    id: d.id,
    threadId: d.thread_id,
    author: {
      id: d.author_id,
      name: profile?.display_name ?? profile?.username ?? 'Unknown',
      avatar: profile?.avatar_url ?? '',
    },
    content: d.content,
    createdAt: d.created_at,
    likes: d.likes_count,
    likedBy,
  };
}
