import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Music, Calendar, FileText, MessageSquare, Heart, UserPlus,
  X, CheckCheck, BellOff, Trash2, Upload,
} from 'lucide-react';
import { useAuth } from '@context/AuthContext';
import {
  getNotifications, markAsRead, markAllAsRead, deleteNotification,
} from '@services/notificationService';

const TYPE_ICON = {
  like:        { icon: Heart,        color: 'text-violet-400 bg-violet-600/15' },
  follow:      { icon: UserPlus,     color: 'text-blue-400 bg-blue-500/15' },
  rsvp:        { icon: Calendar,     color: 'text-green-400 bg-green-500/15' },
  comment:     { icon: MessageSquare, color: 'text-purple-400 bg-purple-500/15' },
  forum_reply: { icon: MessageSquare, color: 'text-orange-400 bg-orange-500/15' },
  system:      { icon: Upload,       color: 'text-pink-400 bg-pink-500/15' },
  article:     { icon: FileText,     color: 'text-green-400 bg-green-500/15' },
  default:     { icon: Bell,         color: 'text-slate-400 bg-white/10' },
};

function relativeTime(iso) {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'zojuist';
    if (mins < 60) return `${mins} min geleden`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} uur geleden`;
    const days = Math.floor(hrs / 24);
    return days === 1 ? 'gisteren' : `${days} dagen geleden`;
  } catch {
    return '';
  }
}

export default function NotificationsPanel({ onClose }) {
  const ref = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getNotifications(user.id);
      setNotifications(data);
    } catch { /* silent */ }
  }, [user]);

  useEffect(() => {
    load();
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    setTimeout(() => document.addEventListener('mousedown', handle), 0);
    return () => document.removeEventListener('mousedown', handle);
  }, [load, onClose]);

  const handleClick = async (notif) => {
    try {
      const next = await markAsRead(user.id, notif.id);
      setNotifications(next);
    } catch { /* silent */ }
    if (notif.link) navigate(notif.link);
    onClose();
  };

  const handleDelete = async (e, notifId) => {
    e.stopPropagation();
    try {
      const next = await deleteNotification(user.id, notifId);
      setNotifications(next);
    } catch { /* silent */ }
  };

  const handleMarkAllRead = async () => {
    try {
      const next = await markAllAsRead(user.id);
      setNotifications(next);
    } catch { /* silent */ }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const allRead = unreadCount === 0;

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-80 bg-[#231d3a] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50"
      style={{ animation: 'slideDown 0.2s cubic-bezier(0.34,1.2,0.64,1) both' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-white" />
          <span className="text-sm font-semibold text-white">Meldingen</span>
          {unreadCount > 0 && (
            <span className="text-xs font-bold bg-violet-600 text-white px-1.5 py-0.5 rounded-full leading-none">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!allRead && (
            <button
              onClick={handleMarkAllRead}
              title="Alles als gelezen markeren"
              className="p-1.5 text-slate-500 hover:text-violet-400 transition-colors rounded-lg hover:bg-white/5"
            >
              <CheckCheck size={15} />
            </button>
          )}
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-white transition-colors rounded-lg hover:bg-white/5">
            <X size={15} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3">
              <BellOff size={20} className="text-slate-500" />
            </div>
            <p className="text-sm font-medium text-slate-400">Geen meldingen</p>
            <p className="text-xs text-slate-600 mt-1">Acties zoals liken en volgen verschijnen hier</p>
          </div>
        ) : (
          notifications.map(notif => {
            const { icon: Icon, color } = TYPE_ICON[notif.type] ?? TYPE_ICON.default;
            return (
              <button
                key={notif.id}
                onClick={() => handleClick(notif)}
                className={`flex items-start gap-3 px-4 py-3 hover:bg-white/4 transition-colors border-b border-white/5 last:border-0 w-full text-left group ${
                  !notif.read ? 'bg-white/2' : 'opacity-70'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${color}`}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${!notif.read ? 'text-white font-medium' : 'text-slate-400'}`}>
                    {notif.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.body}</p>
                  <p className="text-xs text-slate-600 mt-1">{relativeTime(notif.createdAt)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0 mt-1">
                  {!notif.read && <div className="w-2 h-2 rounded-full bg-violet-500" />}
                  <button
                    onClick={(e) => handleDelete(e, notif.id)}
                    className="text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-0.5"
                    title="Verwijder melding"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer */}
      {!allRead && notifications.length > 0 && (
        <div className="px-4 py-3 border-t border-white/8 text-center">
          <button
            onClick={handleMarkAllRead}
            className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
          >
            Alle meldingen als gelezen markeren
          </button>
        </div>
      )}

      <style>{`
        @keyframes slideDown { from { transform: translateY(-8px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
    </div>
  );
}

// Export unread count hook for Navbar badge
export function useNotificationCount(userId) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!userId) { setCount(0); return; }
    getNotifications(userId).then(notifs => setCount(notifs.filter(n => !n.read).length)).catch(() => {});
  }, [userId]);
  return count;
}
