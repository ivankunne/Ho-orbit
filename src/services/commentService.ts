// TODO: replace with → api.get('/comments?resourceType=X&resourceId=Y')
export async function getComments(resourceType, resourceId) {
  const key = `ho_comments_${resourceType}_${resourceId}`;
  try { return JSON.parse(localStorage.getItem(key) || '[]'); }
  catch { return []; }
}

// TODO: replace with → api.post('/comments', payload)
export async function addComment({ resourceType, resourceId, body, authorId, authorName, authorAvatar }) {
  const key = `ho_comments_${resourceType}_${resourceId}`;
  const stored = await getComments(resourceType, resourceId);
  const comment = {
    id: Date.now(),
    body,
    authorId,
    authorName,
    authorAvatar,
    createdAt: new Date().toISOString(),
    likes: [],
  };
  const next = [comment, ...stored];
  localStorage.setItem(key, JSON.stringify(next));
  return comment;
}

// TODO: replace with → api.delete('/comments/:commentId')
export async function deleteComment(resourceType, resourceId, commentId, userId) {
  const key = `ho_comments_${resourceType}_${resourceId}`;
  const stored = await getComments(resourceType, resourceId);
  const comment = stored.find(c => c.id === commentId);
  if (!comment || comment.authorId !== userId) return stored;
  const next = stored.filter(c => c.id !== commentId);
  localStorage.setItem(key, JSON.stringify(next));
  return next;
}

// TODO: replace with → api.post('/comments/:commentId/like')
export async function toggleCommentLike(resourceType, resourceId, commentId, userId) {
  const key = `ho_comments_${resourceType}_${resourceId}`;
  const stored = await getComments(resourceType, resourceId);
  const next = stored.map(c => {
    if (c.id !== commentId) return c;
    const likes = c.likes ?? [];
    return {
      ...c,
      likes: likes.includes(userId)
        ? likes.filter(id => id !== userId)
        : [...likes, userId],
    };
  });
  localStorage.setItem(key, JSON.stringify(next));
  return next;
}
