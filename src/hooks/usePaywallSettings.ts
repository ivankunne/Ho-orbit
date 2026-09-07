import { useEffect, useState } from 'react';
import { supabase } from '@lib/supabase';

interface PaywallSettings {
  enabled: boolean;
  loading: boolean;
}

/**
 * Global paywall on/off switch (public.paywall_settings, singleton row).
 * Starts disabled — RequirePlan lets everyone through until an admin flips
 * it on. Subscribed to realtime so a flip takes effect immediately in every
 * open tab, no refresh needed.
 */
export function usePaywallSettings(): PaywallSettings {
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

  return { enabled, loading };
}
