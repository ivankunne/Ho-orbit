import { supabase } from '@/lib/supabase';

export async function getComments(resourceType: string, resourceId: number | string) {
  const { data } = await supabase
    .from('comments')
    .select('*, profiles:author_id(username, display_name, avatar_url), comment_likes(user_id)')
    .eq('resource_type', resourceType)
    .eq('resource_id', resourceId)
    .order('created_at', { ascending: false });
  return (data ?? []).map((c) => ({
    id: c.id,
    body: c.body,
    authorId: c.author_id,
    authorName: (c.profiles as { display_name: string })?.display_name ?? 'Unknown',
    authorAvatar: (c.profiles as { avatar_url: string })?.avatar_url ?? '',
    createdAt: c.created_at,
    likes: ((c.comment_likes as { user_id: string }[]) ?? []).map((l) => l.user_id),
  }));
}

export async function addComment({
  resourceType, resourceId, body, authorId,
}: {
  resourceType: string; resourceId: number | string; body: string; authorId: string;
  authorName?: string; authorAvatar?: string;
}) {
  const { data, error } = await supabase
    .from('comments')
    .insert({ resource_type: resourceType, resource_id: resourceId, body, author_id: authorId })
    .select('*, profiles:author_id(username, display_name, avatar_url)')
    .single();
  if (error || !data) throw error;
  return {
    id: data.id,
    body: data.body,
    authorId: data.author_id,
    authorName: (data.profiles as { display_name: string })?.display_name ?? '',
    authorAvatar: (data.profiles as { avatar_url: string })?.avatar_url ?? '',
    createdAt: data.created_at,
    likes: [],
  };
}

export async function deleteComment(
  resourceType: string, resourceId: number | string, commentId: number, userId: string
) {
  await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)
    .eq('resource_type', resourceType)
    .eq('resource_id', resourceId)
    .eq('author_id', userId);
  return getComments(resourceType, resourceId);
}

export async function toggleCommentLike(
  resourceType: string, resourceId: number | string, commentId: number, userId: string
) {
  const { data: existing } = await supabase
    .from('comment_likes')
    .select('comment_id')
    .eq('comment_id', commentId)
    .eq('user_id', userId)
    .single();
  if (existing) {
    await supabase.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', userId);
  } else {
    await supabase.from('comment_likes').insert({ comment_id: commentId, user_id: userId });
  }
  return getComments(resourceType, resourceId);
}
