import { forumCategories, forumThreads, threadReplies } from '@data/mockData.js';

// TODO: replace with → api.get('/forums/categories')
export async function getCategories() {
  return forumCategories;
}

// TODO: replace with → api.get('/forums/threads?categoryId=X')
export async function getThreadsByCategory(categoryId) {
  const stored = _loadThreads();
  const all = [...stored, ...forumThreads];
  return categoryId ? all.filter(t => t.categoryId === categoryId) : all;
}

// TODO: replace with → api.get('/forums/threads/:threadId')
export async function getThread(threadId) {
  const stored = _loadThreads();
  const all = [...stored, ...forumThreads];
  return all.find(t => String(t.id) === String(threadId)) ?? null;
}

// TODO: replace with → api.post('/forums/threads', payload)
export async function createThread({ categoryId, title, body, tags = [], authorId, authorName, authorAvatar }) {
  const stored = _loadThreads();
  const thread = {
    id: Date.now(),
    categoryId: Number(categoryId),
    title,
    body,
    tags,
    pinned: false,
    replies: 0,
    views: 0,
    createdAt: new Date().toISOString(),
    author: { id: authorId, name: authorName, avatar: authorAvatar },
    lastPost: { user: authorName, time: 'zojuist' },
  };
  const next = [thread, ...stored];
  localStorage.setItem('ho_forum_threads', JSON.stringify(next));
  return thread;
}

// TODO: replace with → api.get('/forums/threads/:threadId/replies')
export async function getReplies(threadId) {
  const stored = _loadReplies(threadId);
  const mock = threadReplies.filter(r => String(r.threadId) === String(threadId));
  return [...mock, ...stored];
}

// TODO: replace with → api.post('/forums/threads/:threadId/replies', payload)
export async function createReply({ threadId, body, authorId, authorName, authorAvatar }) {
  const stored = _loadReplies(threadId);
  const reply = {
    id: Date.now(),
    threadId,
    author: { id: authorId, name: authorName, avatar: authorAvatar },
    content: body,
    createdAt: new Date().toISOString(),
    likes: 0,
  };
  const next = [...stored, reply];
  localStorage.setItem(`ho_forum_replies_${threadId}`, JSON.stringify(next));
  return reply;
}

// TODO: replace with → api.post('/forums/replies/:replyId/like')
export async function toggleReplyLike(replyId, threadId, userId) {
  const stored = _loadReplies(threadId);
  const next = stored.map(r => {
    if (r.id !== replyId) return r;
    const likedBy = r.likedBy ?? [];
    const already = likedBy.includes(userId);
    return {
      ...r,
      likes: already ? r.likes - 1 : r.likes + 1,
      likedBy: already ? likedBy.filter(id => id !== userId) : [...likedBy, userId],
    };
  });
  localStorage.setItem(`ho_forum_replies_${threadId}`, JSON.stringify(next));
  return next;
}

// --- Helpers ---
function _loadThreads() {
  try { return JSON.parse(localStorage.getItem('ho_forum_threads') || '[]'); }
  catch { return []; }
}

function _loadReplies(threadId) {
  try { return JSON.parse(localStorage.getItem(`ho_forum_replies_${threadId}`) || '[]'); }
  catch { return []; }
}
