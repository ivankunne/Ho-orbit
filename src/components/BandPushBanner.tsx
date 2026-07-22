import { useEffect, useState } from 'react';
import { BellRing, X } from 'lucide-react';
import { pushSupported, pushPermission, isPushEnabled, enablePush } from '@services/pushService';

/**
 * "Turn on notifications" banner shown at the top of a BandSpace's Home view,
 * so members discover push in the exact context where they'd want it (new
 * chat messages and @mentions) instead of only inside Account settings.
 *
 * Unlike the global PushPrompt (which only nudges once the PWA is installed),
 * this one doesn't require standalone mode — push works from a normal browser
 * tab on desktop/Android, it's only iOS Safari that needs the home-screen
 * install, and enablePush() already surfaces that as an inline error if it
 * fails, so there's no need to gate the banner itself on install state.
 */

const DISMISS_KEY = 'ho_band_push_banner_dismissed_at';
const DISMISS_DAYS = 14;

function recentlyDismissed(): boolean {
  const raw = localStorage.getItem(DISMISS_KEY);
  const ts = raw ? Number(raw) : 0;
  if (!ts) return false;
  return Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

export default function BandPushBanner({ userId }: { userId?: string }) {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !pushSupported() || recentlyDismissed()) return;
    if (pushPermission() !== 'default') return; // already granted/denied — nothing to nudge
    let cancelled = false;
    isPushEnabled().then(enabled => {
      if (!cancelled && !enabled) setVisible(true);
    });
    return () => { cancelled = true; };
  }, [userId]);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  };

  const enable = async () => {
    if (!userId) return;
    setBusy(true); setError(null);
    const res = await enablePush(userId);
    setBusy(false);
    if (res.ok) setVisible(false);
    else setError(res.error ?? 'Er ging iets mis.');
  };

  if (!visible) return null;

  return (
    <div className="flex items-start gap-3 p-4 bg-violet-500/8 border border-violet-500/20 rounded-2xl mb-6">
      <div className="w-9 h-9 rounded-lg bg-violet-600/20 border border-violet-500/25 flex items-center justify-center shrink-0">
        <BellRing size={16} className="text-violet-300" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">Mis geen bericht meer</p>
        <p className="text-xs text-slate-400 mt-0.5">
          Zet meldingen aan om direct een seintje te krijgen bij nieuwe berichten en @vermeldingen in deze band.
        </p>
        {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}
        <div className="flex items-center gap-2 mt-2.5">
          <button onClick={enable} disabled={busy}
            className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
            <BellRing size={12} /> {busy ? 'Bezig…' : 'Meldingen aanzetten'}
          </button>
          <button onClick={dismiss} className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-2 py-1.5">
            Niet nu
          </button>
        </div>
      </div>
      <button onClick={dismiss} aria-label="Sluiten" className="text-slate-500 hover:text-white p-1 shrink-0">
        <X size={14} />
      </button>
    </div>
  );
}
