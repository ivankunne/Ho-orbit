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
