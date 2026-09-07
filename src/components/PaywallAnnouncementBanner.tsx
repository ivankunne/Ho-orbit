import { useState, useEffect } from 'react';
import { Lock, X } from 'lucide-react';
import { usePaywallSettings } from '@hooks/usePaywallSettings';

// One-time announcement, not a recurring nag — once dismissed it stays
// dismissed (unlike InstallPrompt/PushPrompt's 14/30-day re-show). Also
// stops showing on its own once the paywall actually goes live — at that
// point the real paywall screens do the talking, an advance-notice banner
// is no longer relevant.
const DISMISS_KEY = 'ho_paywall_announcement_dismissed';

export default function PaywallAnnouncementBanner() {
  const { enabled: paywallLive, loading } = usePaywallSettings();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') setDismissed(true);
    } catch { /* ignore */ }
  }, []);

  function dismiss() {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
  }

  if (loading || paywallLive || dismissed) return null;

  return (
    <div className="w-full bg-violet-500/10 border-b border-violet-500/20">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-2.5 flex items-center gap-3">
        <Lock size={16} className="text-violet-400 shrink-0" />
        <p className="flex-1 min-w-0 text-xs sm:text-sm text-violet-200/90">
          De bètaperiode van h-orbit zit erop — vanaf <strong className="text-violet-100">25 september</strong> komen Premium-functies achter een betaald abonnement.
        </p>
        <button
          onClick={dismiss}
          aria-label="Sluiten"
          className="shrink-0 p-1 text-violet-400/70 hover:text-violet-300 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
