import { useEffect, useState } from 'react';
import { BellRing, X } from 'lucide-react';
import { useAuth } from '@context/AuthContext';
import { pushSupported, pushPermission, isPushEnabled, enablePush } from '@services/pushService';

/**
 * "Turn on notifications" nudge for users who have installed the app to their
 * home screen but haven't enabled push yet.
 *
 * Deliberately complements InstallPrompt: that one shows only when NOT
 * installed, this one only when running standalone — so the two never stack.
 * Shown once permission is still "default" (we never re-prompt after a deny),
 * and a dismissal is remembered for 30 days.
 */

const DISMISS_KEY = 'ho_push_prompt_dismissed_at';
const DISMISS_DAYS = 30;

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function recentlyDismissed(): boolean {
  const raw = localStorage.getItem(DISMISS_KEY);
  const ts = raw ? Number(raw) : 0;
  if (!ts) return false;
  return Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

export default function PushPrompt() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    if (!pushSupported() || !isStandalone() || recentlyDismissed()) return;
    if (pushPermission() !== 'default') return;

    let cancelled = false;
    isPushEnabled().then((enabled) => {
      if (cancelled || enabled) return;
      window.setTimeout(() => !cancelled && setVisible(true), 3000);
    });
    return () => { cancelled = true; };
  }, [user?.id]);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  };

  const enable = async () => {
    if (!user?.id) return;
    setBusy(true);
    const res = await enablePush(user.id);
    setBusy(false);
    // Either way we stop nagging: granted → done; denied → respect the choice.
    setVisible(false);
    if (!res.ok) localStorage.setItem(DISMISS_KEY, String(Date.now()));
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-0 z-[80] flex justify-center px-4 pointer-events-none
                 bottom-[calc(var(--bottom-nav-h,4.5rem)+0.75rem)] lg:bottom-6"
      role="dialog"
      aria-label="Meldingen inschakelen"
    >
      <div
        className="pointer-events-auto w-full max-w-md flex items-start gap-3 rounded-2xl
                   border border-white/10 bg-[#231d3a] p-3 pr-2 shadow-2xl
                   animate-in fade-in slide-in-from-bottom-4 duration-300"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-600/20 text-violet-300">
          <BellRing className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1 py-0.5">
          <p className="text-sm font-semibold text-slate-100">Zet meldingen aan</p>
          <p className="mt-0.5 text-xs leading-snug text-slate-400">
            Krijg een seintje bij nieuwe berichten en volgers — zonder je e-mail te checken.
          </p>
        </div>

        <button
          onClick={enable}
          disabled={busy}
          className="shrink-0 mt-0.5 inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 py-2
                     text-sm font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-60
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
        >
          <BellRing className="h-4 w-4" />
          Aanzetten
        </button>

        <button
          onClick={dismiss}
          aria-label="Sluiten"
          className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400
                     transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
