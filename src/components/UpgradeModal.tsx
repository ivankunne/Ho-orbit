import { useEffect, useState } from 'react';
import { Lock, Check, X } from 'lucide-react';
import { Button } from '@components/ui/button';
import { useUpgradeModal } from '@context/UpgradeModalContext';
import {
  startCheckout,
  getPlanInfo,
  formatPlanPrice,
  yearlySavingsLabel,
  type PlanInterval,
  type PlanOptions,
} from '@services/subscriptionService';
import { PRO_FEATURES } from '@data/subscriptionPlans';

/**
 * Het Pro-venster. Zelfde rol als PaywallPage, maar als overlay: sinds de
 * paywall op de hándeling zit in plaats van op de pagina, zou een volledige
 * paginawissel de bezoeker wegtrekken uit de lijst waar hij net in stond.
 * PaywallPage blijft bestaan voor de routes die wél helemaal Pro zijn
 * (BandSpace).
 */
export default function UpgradeModal() {
  const { isOpen, title, description, close } = useUpgradeModal();
  const [plans, setPlans] = useState<PlanOptions>({ month: null, year: null });
  const [billingInterval, setBillingInterval] = useState<PlanInterval>('month');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) getPlanInfo().then(setPlans);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, close]);

  if (!isOpen) return null;

  const selectedPlan = plans[billingInterval];
  const savings = yearlySavingsLabel(plans.month, plans.year);

  const handleUpgrade = async () => {
    setError('');
    setLoading(true);
    try {
      await startCheckout(billingInterval);
    } catch (err: any) {
      setError(err?.message || 'Er ging iets mis. Probeer het later opnieuw.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={close} />

      <div className="relative bg-[#1e1833] border border-white/10 rounded-2xl shadow-2xl shadow-black/60 w-full max-w-sm max-h-[92vh] overflow-y-auto z-10">
        <button
          onClick={close}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors z-10"
          aria-label="Sluiten"
        >
          <X size={18} />
        </button>

        <div className="p-6 sm:p-7">
          <div className="flex flex-col items-center text-center mb-6 pr-6">
            <div className="w-12 h-12 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center mb-3">
              <Lock size={22} className="text-violet-400" />
            </div>
            <h2 className="text-xl font-bold text-white">{title || 'Dit is een Pro-functie'}</h2>
            <p className="text-sm text-slate-500 mt-1">
              {description || 'Upgrade naar H-orbit Pro om dit te gebruiken.'}
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl mb-5">
              {error}
            </div>
          )}

          <div className="flex gap-1 p-1 mb-4 bg-white/5 rounded-lg">
            {(['month', 'year'] as const).map(key => (
              <button
                key={key}
                onClick={() => setBillingInterval(key)}
                className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${
                  billingInterval === key ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {key === 'month' ? 'Maandelijks' : 'Jaarlijks'}
              </button>
            ))}
          </div>
          {billingInterval === 'year' && savings && (
            <p className="text-emerald-400 text-xs font-medium text-center mb-4">{savings}</p>
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
            {loading ? 'Bezig…' : selectedPlan ? `Upgraden — ${formatPlanPrice(selectedPlan)}` : 'Upgraden naar Pro'}
          </Button>

          <button
            onClick={close}
            className="w-full mt-3 text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            Nu even niet
          </button>
        </div>
      </div>
    </div>
  );
}
