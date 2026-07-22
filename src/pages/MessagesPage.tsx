import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageSquare, Search, Clock } from 'lucide-react';
import { useAuth } from '@context/AuthContext';
import UserAvatar from '@components/UserAvatar';
import { getConversations, type Conversation } from '@services/chatService';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'zojuist';
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} u`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d`;
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
}

export default function MessagesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    getConversations(user.id).then((data) => {
      setConversations(data);
      setLoading(false);
    });
  }, [user?.id]);

  const filtered = conversations.filter((c) => {
    const name = (c.other_participant.display_name || c.other_participant.username).toLowerCase();
    return name.includes(query.toLowerCase());
  });

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Berichten</h1>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Zoek gesprek..."
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-colors"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-4 bg-white/3 border border-white/5 rounded-2xl animate-pulse">
              <div className="w-12 h-12 rounded-full bg-white/8 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-white/8 rounded w-1/3" />
                <div className="h-3 bg-white/5 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare size={28} className="text-slate-500" />
          </div>
          <p className="text-slate-400 font-medium">Geen gesprekken</p>
          <p className="text-slate-500 text-sm mt-1">
            Ga naar een profiel en klik op 'Stuur bericht' om te starten.
          </p>
          <Link
            to="/artists"
            className="inline-block mt-5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            Artiesten ontdekken
          </Link>
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map((conv) => {
            const name = conv.other_participant.display_name || conv.other_participant.username;
            const hasUnread = conv.unread_count > 0;

            return (
              <button
                key={conv.id}
                onClick={() => navigate(`/berichten/${conv.id}`)}
                className="w-full flex items-center gap-3 p-4 bg-white/3 hover:bg-white/6 border border-white/5 hover:border-white/10 rounded-2xl transition-all text-left group"
              >
                <div className="relative shrink-0">
                  <UserAvatar
                    src={conv.other_participant.avatar_url}
                    name={name}
                    size={48}
                  />
                  {hasUnread && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-violet-500 rounded-full border-2 border-[#1a1528]" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className={`text-sm font-semibold truncate ${hasUnread ? 'text-white' : 'text-slate-300'}`}>
                      {name}
                    </p>
                    <span className="text-[11px] text-slate-500 shrink-0 ml-2 flex items-center gap-1">
                      <Clock size={10} />
                      {timeAgo(conv.last_message_at)}
                    </span>
                  </div>
                  <p className={`text-xs truncate ${hasUnread ? 'text-slate-300' : 'text-slate-500'}`}>
                    {conv.last_message ?? 'Start een gesprek…'}
                  </p>
                </div>

                {hasUnread && (
                  <span className="shrink-0 min-w-[20px] h-5 bg-violet-600 rounded-full text-[10px] font-bold text-white flex items-center justify-center px-1.5">
                    {conv.unread_count > 9 ? '9+' : conv.unread_count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
