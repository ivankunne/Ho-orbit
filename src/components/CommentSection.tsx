import { useState, useEffect } from 'react';
import { Heart, Send, MessageSquare, Trash2 } from 'lucide-react';
import { useAuth } from '@context/AuthContext';
import { useToast } from './Toast';
import { getComments, addComment, deleteComment, toggleCommentLike } from '@services/commentService';
import { addNotification } from '@services/notificationService';

const MAX_CHARS = 500;

function relativeTime(iso) {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'zojuist';
    if (mins < 60) return `${mins} min geleden`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs} uur geleden`;
    const days = Math.floor(hrs / 24);
    if (days < 7)  return `${days} dag${days > 1 ? 'en' : ''} geleden`;
    return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

export default function CommentSection({ resourceType, resourceId, resourceTitle = '' }) {
  const { user } = useAuth();
  const addToast = useToast();

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await getComments(resourceType, resourceId);
        setComments(data);
      } catch {
        addToast('Er is iets misgegaan. Probeer het opnieuw.', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [resourceType, resourceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e) => {
    e.preventDefault();
    const body = newComment.trim();
    if (!body || !user) return;

    try {
      const comment = await addComment({
        resourceType,
        resourceId,
        body,
        authorId: user.id,
        authorName: user.displayName || user.username,
        authorAvatar: user.avatar || `https://picsum.photos/seed/${user.username}/40/40`,
      });
      setComments(prev => [comment, ...prev]);
      setNewComment('');

      await addNotification(user.id, {
        type: 'comment',
        title: 'Reactie geplaatst',
        body: resourceTitle
          ? `Je hebt een reactie achtergelaten op "${resourceTitle}"`
          : 'Je hebt een reactie geplaatst',
        link: window.location.pathname,
      });
    } catch {
      addToast('Er is iets misgegaan. Probeer het opnieuw.', 'error');
    }
  };

  const handleDelete = async (commentId) => {
    if (!user) return;
    try {
      const next = await deleteComment(resourceType, resourceId, commentId, user.id);
      setComments(next);
      addToast('Reactie verwijderd.', 'success');
    } catch {
      addToast('Er is iets misgegaan. Probeer het opnieuw.', 'error');
    }
  };

  const handleLike = async (commentId) => {
    if (!user) return;
    try {
      const next = await toggleCommentLike(resourceType, resourceId, commentId, user.id);
      setComments(next);
    } catch {
      addToast('Er is iets misgegaan. Probeer het opnieuw.', 'error');
    }
  };

  return (
    <div className="mt-10 pt-8 border-t border-white/8">
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare size={18} className="text-violet-400" />
        <h2 className="text-lg font-bold text-white">Reacties</h2>
        <span className="text-sm text-slate-500 ml-1">({loading ? '…' : comments.length})</span>
      </div>

      {/* New comment input */}
      {user && (
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex gap-3">
            <img
              src={user.avatar}
              alt={user.displayName}
              className="w-9 h-9 rounded-full object-cover shrink-0 mt-0.5"
            />
            <div className="flex-1">
              <div className="relative">
                <textarea
                  value={newComment}
                  onChange={e => setNewComment(e.target.value.slice(0, MAX_CHARS))}
                  placeholder="Laat een reactie achter..."
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pr-12 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:bg-white/8 transition-all resize-none"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className="absolute right-2 bottom-2 p-1.5 text-violet-400 hover:text-violet-300 disabled:text-slate-600 disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={15} />
                </button>
              </div>
              <div className="flex justify-end mt-1">
                <span className={`text-xs ${newComment.length > MAX_CHARS * 0.9 ? 'text-orange-400' : 'text-slate-600'}`}>
                  {newComment.length}/{MAX_CHARS}
                </span>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Comments list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-9 h-9 bg-white/8 rounded-full shrink-0" />
              <div className="flex-1">
                <div className="h-3 bg-white/8 rounded w-1/4 mb-2" />
                <div className="h-12 bg-white/5 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-8">Nog geen reacties. Wees de eerste!</p>
      ) : (
        <div className="space-y-5">
          {comments.map(comment => {
            const isOwn = comment.authorId === user?.id;
            const likedByMe = Array.isArray(comment.likes) && comment.likes.includes(user?.id);
            const likeCount = Array.isArray(comment.likes) ? comment.likes.length : (comment.likes || 0);

            return (
              <div key={comment.id} className="flex gap-3">
                <img
                  src={comment.authorAvatar || `https://picsum.photos/seed/${comment.authorId}/40/40`}
                  alt={comment.authorName}
                  className="w-9 h-9 rounded-full object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="bg-white/3 border border-white/5 rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-semibold text-white truncate">{comment.authorName}</span>
                        <span className="text-xs text-slate-600 shrink-0">{relativeTime(comment.createdAt)}</span>
                      </div>
                      {isOwn && (
                        <button
                          onClick={() => handleDelete(comment.id)}
                          className="text-slate-600 hover:text-red-400 transition-colors shrink-0"
                          title="Verwijder reactie"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">{comment.body}</p>
                  </div>
                  <button
                    onClick={() => handleLike(comment.id)}
                    className={`flex items-center gap-1.5 mt-1.5 ml-2 text-xs transition-colors ${
                      likedByMe ? 'text-violet-400' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <Heart size={12} fill={likedByMe ? 'currentColor' : 'none'} />
                    {likeCount}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
