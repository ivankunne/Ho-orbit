import { useState, useEffect } from 'react';
import { ShieldBan, X } from 'lucide-react';

// One-time policy statement, not a recurring nag — once dismissed it stays
// dismissed (unlike InstallPrompt/PushPrompt's 14/30-day re-show).
const DISMISS_KEY = 'ho_ai_policy_banner_dismissed';

export default function AiPolicyBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) !== '1') setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    setVisible(false);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
  }

  if (!visible) return null;

  return (
    <div className="w-full bg-amber-500/10 border-b border-amber-500/20">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-2.5 flex items-center gap-3">
        <ShieldBan size={16} className="text-amber-400 shrink-0" />
        <p className="flex-1 min-w-0 text-xs sm:text-sm text-amber-200/90">
          h-orbit is er voor échte artiesten — we keuren geen AI-gegenereerde &quot;artiesten&quot; goed en steunen menselijke creativiteit.
        </p>
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
