import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { useAuth } from '@context/AuthContext';
import UserAvatar from '@components/UserAvatar';
import { supabase } from '@/lib/supabase';
import {
  getMessages,
  sendMessage,
  markMessagesRead,
  type Message,
  type ConversationParticipant,
} from '@services/chatService';

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }) +
    ' ' + d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
}

export default function ConversationPage() {
  const { id: conversationId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [other, setOther] = useState<ConversationParticipant | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Load conversation meta (other participant)
  useEffect(() => {
    if (!conversationId || !user?.id) return;
    supabase
      .from('conversations')
      .select('participant_1, participant_2')
      .eq('id', conversationId)
      .single()
      .then(({ data }) => {
        if (!data) { navigate('/berichten'); return; }
        const otherId = data.participant_1 === user.id ? data.participant_2 : data.participant_1;
        supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .eq('id', otherId)
          .single()
          .then(({ data: profile }) => {
            if (profile) setOther(profile);
          });
      });
  }, [conversationId, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load messages
  useEffect(() => {
    if (!conversationId || !user?.id) return;
    setLoading(true);
    getMessages(conversationId).then((msgs) => {
      setMessages(msgs);
      setLoading(false);
      markMessagesRead(conversationId, user.id);
    });
  }, [conversationId, user?.id]);

  // Scroll to bottom when messages load
  useEffect(() => {
    if (!loading) scrollToBottom();
  }, [loading, scrollToBottom]);

  // Real-time subscription
  useEffect(() => {
    if (!conversationId || !user?.id) return;

    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => {
            if (prev.find((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          if (msg.sender_id !== user.id) {
            markMessagesRead(conversationId, user.id);
          }
          setTimeout(scrollToBottom, 50);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, user?.id, scrollToBottom]);

  const handleSend = async () => {
    if (!input.trim() || !conversationId || !user?.id || sending) return;
    setSending(true);
    const msg = await sendMessage(conversationId, user.id, input);
    if (msg) {
      setMessages((prev) => [...prev, msg]);
      setInput('');
      setTimeout(scrollToBottom, 50);
    }
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const otherName = other?.display_name || other?.username || '…';

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8 bg-[#1a1528]/80 backdrop-blur-sm shrink-0">
        <button
          onClick={() => navigate('/berichten')}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors shrink-0"
        >
          <ArrowLeft size={18} />
        </button>
        {other ? (
          <Link
            to={`/profiel/${other.username}`}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity min-w-0"
          >
            <UserAvatar src={other.avatar_url} name={otherName} size={36} className="shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white leading-tight truncate">{otherName}</p>
              <p className="text-xs text-slate-500 truncate">@{other.username}</p>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-white/8 animate-pulse" />
            <div className="w-24 h-3 bg-white/8 rounded animate-pulse" />
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={24} className="text-violet-400 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-14 h-14 rounded-full bg-violet-600/15 flex items-center justify-center mb-3">
              <UserAvatar src={other?.avatar_url} name={otherName} size={40} />
            </div>
            <p className="text-slate-300 font-medium">{otherName}</p>
            <p className="text-slate-500 text-sm mt-1">Start hier jullie gesprek</p>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => {
              const isMine = msg.sender_id === user?.id;
              const prevMsg = messages[i - 1];
              const showTime =
                !prevMsg ||
                new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() > 5 * 60 * 1000;

              return (
                <div key={msg.id}>
                  {showTime && (
                    <p className="text-center text-[10px] text-slate-600 my-2">{formatTime(msg.created_at)}</p>
                  )}
                  <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
                        isMine
                          ? 'bg-violet-600 text-white rounded-br-sm'
                          : 'bg-white/8 text-slate-200 rounded-bl-sm'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 px-4 py-3 border-t border-white/8 bg-[#1a1528]/80 backdrop-blur-sm">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            onKeyDown={handleKeyDown}
            placeholder="Stuur een bericht…"
            rows={1}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-colors resize-none leading-relaxed overflow-hidden"
            style={{ minHeight: '42px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="shrink-0 w-10 h-10 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-colors"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
        <p className="text-[10px] text-slate-600 mt-1.5 text-center">Enter om te sturen · Shift+Enter voor nieuwe regel</p>
      </div>
    </div>
  );
}
