import { supabase } from '@lib/supabase';

export type PlanInterval = 'month' | 'year';

async function invokeAndRedirect(
  functionName: 'stripe-checkout' | 'stripe-portal',
  body?: Record<string, unknown>,
) {
  const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>(functionName, { body });
  if (error || !data?.url) {
    throw new Error(data?.error || error?.message || 'Er ging iets mis. Probeer het later opnieuw.');
  }
  window.location.href = data.url;
}

/** Redirects the browser to a Stripe Checkout session for the Pro plan. */
export function startCheckout(interval: PlanInterval = 'month') {
  return invokeAndRedirect('stripe-checkout', { interval });
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

export interface PlanOptions {
  month: PlanInfo | null;
  year: PlanInfo | null;
}

/** Live price info for both Pro plans, straight from Stripe (never hardcoded). */
export async function getPlanInfo(): Promise<PlanOptions> {
  const { data, error } = await supabase.functions.invoke<PlanOptions & { error?: string }>('stripe-plan');
  if (error || !data || data.error) return { month: null, year: null };
  return { month: data.month ?? null, year: data.year ?? null };
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

/** e.g. "Bespaar 17% t.o.v. maandelijks" — null if either price is missing. */
export function yearlySavingsLabel(month: PlanInfo | null, year: PlanInfo | null): string | null {
  if (!month || !year) return null;
  const monthlyCostPerYear = month.amount * 12;
  if (monthlyCostPerYear <= year.amount) return null;
  const pct = Math.round((1 - year.amount / monthlyCostPerYear) * 100);
  return `Bespaar ${pct}% t.o.v. maandelijks`;
}
