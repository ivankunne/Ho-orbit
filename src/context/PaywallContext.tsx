import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@lib/supabase';

interface PaywallSettings {
  enabled: boolean;
  loading: boolean;
}

const PaywallContext = createContext<PaywallSettings>({ enabled: false, loading: true });

/**
 * Single shared subscription to public.paywall_settings — mount once at the
 * app root. Every consumer (RequirePlan, the Admin panel's Paywall section,
 * PaywallAnnouncementBanner, messaging) reads from this one context instead
 * of opening its own realtime channel: two channels opened under the same
 * name throws "cannot add postgres_changes callbacks after subscribe()",
 * which is exactly what happened when this used to be a plain hook that
 * every consumer called independently.
 */
export function PaywallProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    supabase
      .from('paywall_settings')
      .select('enabled')
      .eq('id', true)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        setEnabled(!!data?.enabled);
        setLoading(false);
      });

    const channel = supabase
      .channel('paywall_settings_changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'paywall_settings' },
        (payload) => setEnabled(!!(payload.new as { enabled?: boolean }).enabled),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return <PaywallContext.Provider value={{ enabled, loading }}>{children}</PaywallContext.Provider>;
}

export function usePaywallSettings(): PaywallSettings {
  return useContext(PaywallContext);
}
