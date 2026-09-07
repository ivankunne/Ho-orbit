import type { ReactNode } from 'react';
import { useAuth } from '@context/AuthContext';
import { usePaywallSettings } from '@hooks/usePaywallSettings';
import PageLoader from '@components/PageLoader';
import PaywallPage from '@pages/PaywallPage';

interface RequirePlanProps {
  children: ReactNode;
  /** Passed through to PaywallPage for page-specific copy. */
  title?: string;
  description?: string;
  /**
   * Skip the plan check for this specific render regardless of plan/switch
   * state — e.g. a fan→artiest DM conversation, which stays free even once
   * the paywall is live. Compute the condition at the call site.
   */
  bypass?: boolean;
}

/**
 * Paid-content gate for a route, mirroring ProtectedRoute in App.tsx:
 *
 *   <Route path="/x" element={<ProtectedRoute><RequirePlan><XPage /></RequirePlan></ProtectedRoute>} />
 *
 * Two things let a visitor through regardless of their own plan:
 * - `bypass` prop (a per-case exception computed by the caller)
 * - the global paywall_settings switch being off (Admin panel “Ga live”
 *   button) — this is what lets every route below be wired up in advance
 *   without actually restricting anyone until it's flipped on
 *
 * TEMPORARY, for testing (requested 2026-09-07, still in effect): normally
 * every is_admin account — and at minimum the master admin — bypasses the
 * paywall regardless of their own plan. Both bypasses are removed right now
 * so even the master admin is checked against a real plan, same as anyone
 * else. The Admin panel itself (AdminGate in App.tsx) is a separate gate,
 * untouched by this, so admins keep panel access either way. Restore an
 * admin bypass here (`user?.isAdmin` is the original, permanent design —
 * see the paywall-feature-map memory) once testing is done.
 *
 * Only checks user.plan === 'paid' today (the one plan that exists). If a
 * second paid tier or a la carte fee is ever added, extend this rather than
 * adding a parallel gate.
 */
export default function RequirePlan({ children, title, description, bypass }: RequirePlanProps) {
  const { user, loading } = useAuth();
  const { enabled: paywallLive, loading: paywallLoading } = usePaywallSettings();
  if (loading || paywallLoading) return <PageLoader />;
  if (bypass || !paywallLive || user?.plan === 'paid') return <>{children}</>;
  return <PaywallPage title={title} description={description} />;
}
