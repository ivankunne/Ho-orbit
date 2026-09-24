import { useState, useEffect } from 'react';
import { Lock, X } from 'lucide-react';
import { usePaywallSettings } from '@hooks/usePaywallSettings';

// One-time announcement, not a recurring nag — once dismissed it stays
// dismissed (unlike InstallPrompt/PushPrompt's 14/30-day re-show). Also
// stops showing on its own once the paywall actually goes live — at that
// point the real paywall screens do the talking, an advance-notice banner
// is no longer relevant.
const DISMISS_KEY = 'ho_paywall_announcement_dismissed';
// Laatst bekende stand van de paywall-schakelaar.
const LIVE_CACHE_KEY = 'ho_paywall_live_cache';

function readStorage(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

/**
 * Waarom de zichtbaarheid synchroon wordt bepaald: deze balk staat bovenaan
 * elke pagina. Wachtte hij op de paywall-instelling uit Supabase, dan
 * verscheen hij pas een fractie later en duwde hij de hele pagina 69px omlaag
 * — de grootste layout-shift van de site, op iedere pagina.
 *
 * Nu beslist hij bij de eerste render al, op basis van de laatst bekende
 * stand (of, bij een allereerste bezoek, de aanname dat de paywall nog niet
 * live is — zo stond hij tot nu toe). Als de echte stand binnenkomt en anders
 * blijkt, past hij zich alsnog aan.
 */
export default function PaywallAnnouncementBanner() {
  const { enabled: paywallLive, loading } = usePaywallSettings();
  const [dismissed, setDismissed] = useState(() => readStorage(DISMISS_KEY) === '1');

  useEffect(() => {
    if (loading) return;
    try { localStorage.setItem(LIVE_CACHE_KEY, paywallLive ? '1' : '0'); } catch { /* ignore */ }
  }, [loading, paywallLive]);

  function dismiss() {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
  }

  const live = loading ? readStorage(LIVE_CACHE_KEY) === '1' : paywallLive;
  if (live || dismissed) return null;

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
