import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ChevronLeft, Pin, ThumbsUp, MessageSquare, Eye, Flag,
  Send, Quote, Bold, Italic, Smile,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getThread, getReplies, createReply, toggleReplyLike } from '@services/forumService';
import { addNotification } from '@services/notificationService';
import { useAuth } from '@context/AuthContext';
import { useToast } from '@components/Toast';
import BlurImage from '@components/BlurImage';

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString('nl-NL', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function ReplyCard({ reply, isOP, isOwn, index, onLike, liked, onReport }) {
  return (
    <div
      id={`reply-${reply.id}`}
      className={`flex gap-4 p-5 rounded-xl border transition-colors ${
        isOwn
          ? 'bg-violet-600/8 border-violet-500/20'
          : isOP
          ? 'bg-violet-600/5 border-violet-500/15'
          : 'bg-white/3 border-white/5'
      }`}
    >
      <div className="shrink-0">
        <BlurImage
          src={reply.author.avatar}
          alt={reply.author.name}
          className="w-10 h-10 rounded-full"
          imgClassName="object-cover"
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="font-semibold text-sm text-white">{reply.author.name}</span>
          {isOP && (
            <span className="text-[10px] font-bold bg-violet-600/20 text-violet-400 px-2 py-0.5 rounded-full uppercase tracking-wide">
              Auteur
            </span>
          )}
          {isOwn && (
            <span className="text-[10px] font-bold bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full uppercase tracking-wide">
              Jij
            </span>
          )}
          <span className="text-xs text-slate-500 ml-auto">{formatDate(reply.createdAt)}</span>
          <span className="text-xs text-slate-600">#{index + 1}</span>
        </div>

        {reply.content.startsWith('>') ? (
          <div className="mb-2">
            {reply.content.split('\n').map((line, i) => (
              line.startsWith('>')
                ? <p key={i} className="text-xs text-slate-500 italic border-l-2 border-white/20 pl-2 mb-1">{line.slice(1).trim()}</p>
                : <p key={i} className="text-sm text-slate-300 leading-relaxed">{line}</p>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-300 leading-relaxed">{reply.content}</p>
        )}

        <div className="flex items-center gap-4 mt-3 pt-2 border-t border-white/5">
          <button
            onClick={() => onLike(reply.id)}
            className={`flex items-center gap-1.5 text-xs transition-colors ${
              liked ? 'text-violet-400' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <ThumbsUp size={13} fill={liked ? 'currentColor' : 'none'} />
            {(reply.likes || 0) + (liked ? 1 : 0)}
          </button>
          <button
            onClick={onReport}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-400 transition-colors ml-auto"
          >
            <Flag size={12} /> Melden
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ForumThreadPage() {
  const { threadId } = useParams();
  const { user } = useAuth();
  const addToast = useToast();

  const [thread, setThread]     = useState(null);
  const [replies, setReplies]   = useState([]);
  const [replyText, setReplyText] = useState('');
  const [likedReplies, setLikedReplies] = useState(new Set());
  const [loading, setLoading]   = useState(true);
  const [category, setCategory] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [t, r] = await Promise.all([getThread(threadId), getReplies(threadId)]);
        setThread(t);
        setReplies(r);
        if (t?.categoryId) {
          supabase.from('forum_categories').select('id, name').eq('id', t.categoryId).single()
            .then(({ data }) => setCategory(data));
        }
      } catch {
        addToast('Er is iets misgegaan. Probeer het opnieuw.', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [threadId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLike(replyId) {
    setLikedReplies(prev => {
      const next = new Set(prev);
      next.has(replyId) ? next.delete(replyId) : next.add(replyId);
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!replyText.trim() || !user) return;

    try {
      const newReply = await createReply({
        threadId,
        body: replyText.trim(),
        authorId: user.id,
      });

      setReplies(prev => [...prev, newReply]);
      setReplyText('');
      addToast('Reactie geplaatst!', 'success');

      await addNotification(user.id, {
        type: 'forum_reply',
        title: 'Reactie geplaatst',
        body: `Je hebt gereageerd in "${thread?.title}"`,
        link: `/forums/thread/${threadId}`,
      });

      setTimeout(() => {
        document.getElementById(`reply-${newReply.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } catch {
      addToast('Er is iets misgegaan. Probeer het opnieuw.', 'error');
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center text-slate-400">
        <div className="w-8 h-8 border-2 border-violet-500/50 border-t-violet-500 rounded-full animate-spin mx-auto mb-4" />
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center text-slate-400">
        <MessageSquare size={32} className="mx-auto mb-3 opacity-30" />
        <p className="text-lg font-semibold text-white mb-2">Discussie niet gevonden</p>
        <Link to="/forums" className="text-violet-400 hover:underline">← Terug naar forums</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-6 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link to="/forums" className="hover:text-white transition-colors">Forums</Link>
        {category && (
          <>
            <span>/</span>
            <Link to="/forums" className="hover:text-white transition-colors truncate max-w-[140px]">
              {category.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-slate-300 truncate">{thread.title}</span>
      </nav>

      {/* Thread header */}
      <div className="mb-6">
        <div className="flex items-start gap-3 mb-3">
          {thread.pinned && <Pin size={16} className="text-violet-400 mt-1 shrink-0" />}
          <h1 className="text-xl lg:text-2xl font-bold text-white leading-snug">{thread.title}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 mb-3">
          <span className="flex items-center gap-1.5">
            <MessageSquare size={12} /> {replies.length} reacties
          </span>
          <span className="flex items-center gap-1.5">
            <Eye size={12} /> {(thread.views || 0).toLocaleString('nl-NL')} weergaven
          </span>
          <span>Gestart op {formatDate(thread.createdAt)}</span>
        </div>

        {thread.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {thread.tags.map(tag => (
              <span key={tag} className="text-xs bg-white/8 text-slate-400 px-2 py-0.5 rounded border border-white/10">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Replies */}
      <div className="space-y-3 mb-8">
        {replies.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <MessageSquare size={28} className="mx-auto mb-3 opacity-30" />
            <p>Nog geen reacties. Wees de eerste!</p>
          </div>
        ) : (
          replies.map((reply, i) => (
            <ReplyCard
              key={reply.id}
              reply={reply}
              isOP={i === 0}
              isOwn={reply.author?.id === user?.id}
              index={i}
              onLike={handleLike}
              liked={likedReplies.has(reply.id)}
              onReport={() => addToast('Melding verzonden. We bekijken het zo snel mogelijk.', 'success')}
            />
          ))
        )}
      </div>

      {/* Reply box */}
      <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <BlurImage
            src={user?.avatar || 'https://picsum.photos/seed/default/40/40'}
            alt={user?.displayName || ''}
            className="w-8 h-8 rounded-full shrink-0"
            imgClassName="object-cover"
          />
          <p className="text-sm font-semibold text-white">Jouw reactie</p>
        </div>

        <div className="flex items-center gap-1 mb-2 pb-2 border-b border-white/8">
          {[Bold, Italic, Quote, Smile].map((Icon, i) => (
            <button
              key={i}
              type="button"
              className="p-1.5 text-slate-500 hover:text-white hover:bg-white/8 rounded transition-colors"
            >
              <Icon size={14} />
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <textarea
            id="reply-box"
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder="Deel je gedachten met de gemeenschap..."
            rows={5}
            className="w-full bg-transparent text-sm text-slate-200 placeholder-slate-600 focus:outline-none resize-none leading-relaxed"
          />
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/8">
            <p className="text-xs text-slate-600">
              {replyText.length > 0 && `${replyText.length} tekens`}
            </p>
            <button
              type="submit"
              disabled={!replyText.trim()}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2 rounded-xl transition-colors"
            >
              <Send size={14} /> Plaatsen
            </button>
          </div>
        </form>
      </div>

      <div className="mt-6 pt-6 border-t border-white/8">
        <Link
          to="/forums"
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft size={15} /> Terug naar forums
        </Link>
      </div>
    </div>
  );
}
