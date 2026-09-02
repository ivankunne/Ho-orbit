import { supabase } from '@lib/supabase';

async function invokeAndRedirect(functionName: 'stripe-checkout' | 'stripe-portal') {
  const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>(functionName);
  if (error || !data?.url) {
    throw new Error(data?.error || error?.message || 'Er ging iets mis. Probeer het later opnieuw.');
  }
  window.location.href = data.url;
}

/** Redirects the browser to a Stripe Checkout session for the Pro plan. */
export function startCheckout() {
  return invokeAndRedirect('stripe-checkout');
}

/** Redirects the browser to the Stripe Customer Portal to manage/cancel. */
export function openBillingPortal() {
  return invokeAndRedirect('stripe-portal');
}

/** Cancels at the end of the current billing period — no redirect. */
export async function cancelSubscription(): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke<{ currentPeriodEnd?: string; error?: string }>(
    'stripe-cancel',
  );
  if (error || !data || data.error) {
    throw new Error(data?.error || error?.message || 'Er ging iets mis. Probeer het later opnieuw.');
  }
  return data.currentPeriodEnd ?? null;
}

export interface PlanInfo {
  amount: number; // cents
  currency: string;
  interval: string;
  taxInclusive: boolean;
}

/** Live price info for the Pro plan, straight from Stripe (never hardcoded). */
export async function getPlanInfo(): Promise<PlanInfo | null> {
  const { data, error } = await supabase.functions.invoke<PlanInfo & { error?: string }>('stripe-plan');
  if (error || !data || data.error) return null;
  return data;
}

const INTERVAL_LABEL: Record<string, string> = {
  day: 'dag',
  week: 'week',
  month: 'maand',
  year: 'jaar',
};

/** e.g. "€ 10,00 / maand incl. btw" — falls back gracefully if info couldn't be fetched. */
export function formatPlanPrice(plan: PlanInfo): string {
  const amount = new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: plan.currency.toUpperCase(),
  }).format(plan.amount / 100);
  const suffix = plan.taxInclusive ? ' incl. btw' : '';
  return `${amount} / ${INTERVAL_LABEL[plan.interval] || plan.interval}${suffix}`;
}
