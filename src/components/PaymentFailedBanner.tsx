import { useState } from 'react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';
import { useAuth } from '@context/AuthContext';
import { openBillingPortal } from '@services/subscriptionService';

// Shown when the user's last renewal charge failed (Stripe status
// past_due). Access itself is NOT cut off — stripe-webhook keeps `plan`
// as 'paid' through Stripe's own automatic retry window — this is purely a
// friendly heads-up so they notice and fix their payment method before
// retries are exhausted. Session-dismissible only (not the permanent
// localStorage pattern AiPolicyBanner/PaywallAnnouncementBanner use): this
// is an actionable billing issue, not an FYI, so it should resurface next
// visit until it's actually resolved.
const DISMISS_KEY = 'ho_payment_failed_banner_dismissed';

export default function PaymentFailedBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
  });
  const [loading, setLoading] = useState(false);

  if (user?.subscriptionStatus !== 'past_due' || dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
  }

  async function handleUpdatePayment() {
    setLoading(true);
    try {
      await openBillingPortal();
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="w-full bg-amber-500/10 border-b border-amber-500/20">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-2.5 flex items-center gap-3">
        <AlertTriangle size={16} className="text-amber-400 shrink-0" />
        <p className="flex-1 min-w-0 text-xs sm:text-sm text-amber-200/90">
          Je laatste betaling voor H-orbit Pro is niet gelukt. We proberen het automatisch nog een paar keer — werk je betaalmethode bij om je toegang te behouden.
        </p>
        <button
          onClick={handleUpdatePayment}
          disabled={loading}
          className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-amber-300 hover:text-amber-100 bg-amber-500/15 hover:bg-amber-500/25 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : null}
          Betaalmethode bijwerken
        </button>
        <button
          onClick={dismiss}
          aria-label="Sluiten"
          className="shrink-0 p-1 text-amber-400/70 hover:text-amber-300 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
