import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Check, ArrowRight } from 'lucide-react';
import { Button } from '@components/ui/button';
import { startCheckout, getPlanInfo, formatPlanPrice, type PlanInfo } from '@services/subscriptionService';
import { PRO_FEATURES } from '@data/subscriptionPlans';

interface PaywallPageProps {
  /** Override the default heading, e.g. "De radiozender is exclusief voor Pro-leden". */
  title?: string;
  /** Override the default subtext under the heading. */
  description?: string;
}

/**
 * Shown in place of a page's content when the visitor isn't on a paid plan —
 * see RequirePlan, which wraps a route's element with this. Not wired into
 * any route yet; that happens per-page once it's time to actually gate it.
 */
export default function PaywallPage({ title, description }: PaywallPageProps) {
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getPlanInfo().then(setPlan);
  }, []);

  const handleUpgrade = async () => {
    setError('');
    setLoading(true);
    try {
      await startCheckout();
    } catch (err: any) {
      setError(err?.message || 'Er ging iets mis. Probeer het later opnieuw.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1528] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Link to="/" className="flex items-center gap-2.5 w-fit">
            <img src="/H-orbit-logo.png" alt="h-orbit" className="h-10 w-auto" />
          </Link>
        </div>

        <div className="bg-white/[0.03] border border-white/8 rounded-3xl p-7 sm:p-8">
          <div className="flex flex-col items-center text-center mb-7">
            <div className="w-12 h-12 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center mb-3">
              <Lock size={22} className="text-violet-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">{title || 'Dit is een Pro-functie'}</h1>
            <p className="text-sm text-slate-500 mt-1">
              {description || 'Upgrade naar H-orbit Pro om deze pagina te ontgrendelen.'}
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl mb-5">
              {error}
            </div>
          )}

          <ul className="space-y-2 mb-6">
            {PRO_FEATURES.map(f => (
              <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                <Check size={15} className="text-violet-400 mt-0.5 shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          <Button onClick={handleUpgrade} disabled={loading} className="w-full">
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>Upgraden{plan ? ` — ${formatPlanPrice(plan)}` : ' naar Pro'} <ArrowRight size={18} /></>
            )}
          </Button>

          <Link
            to="/muziek"
            className="block text-center mt-6 text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            Terug naar h-orbit
          </Link>
        </div>
      </div>
    </div>
  );
}
