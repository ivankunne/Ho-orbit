import type { ReactNode } from 'react';
import { useAuth } from '@context/AuthContext';
import { usePaywallSettings } from '@hooks/usePaywallSettings';
import PageLoader from '@components/PageLoader';
import PaywallPage from '@pages/PaywallPage';
import { MASTER_ADMIN_EMAIL } from '@pages/AdminLoginPage';

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
 * Three things let a visitor through regardless of their own plan:
 * - `bypass` prop (a per-case exception computed by the caller)
 * - the master-admin account (needs full access to moderate/manage the site)
 * - the global paywall_settings switch being off (Admin panel “Ga live”
 *   button) — this is what lets every route below be wired up in advance
 *   without actually restricting anyone until it's flipped on
 *
 * As of 2026-09-07 (explicit request): only MASTER_ADMIN_EMAIL bypasses —
 * regular is_admin accounts do NOT, and pay/subscribe like anyone else. This
 * is narrower than admin permissions elsewhere in the app (e.g. content
 * moderation, which is_admin-any covers) — a deliberate choice specific to
 * the paywall, not an oversight. The Admin panel itself (AdminGate in
 * App.tsx) is a separate gate, untouched by this, so every admin keeps
 * panel access regardless of plan.
 *
 * Only checks user.plan === 'paid' today (the one plan that exists). If a
 * second paid tier or a la carte fee is ever added, extend this rather than
 * adding a parallel gate.
 */
export default function RequirePlan({ children, title, description, bypass }: RequirePlanProps) {
  const { user, loading } = useAuth();
  const { enabled: paywallLive, loading: paywallLoading } = usePaywallSettings();
  if (loading || paywallLoading) return <PageLoader />;
  if (bypass || user?.email === MASTER_ADMIN_EMAIL || !paywallLive || user?.plan === 'paid') return <>{children}</>;
  return <PaywallPage title={title} description={description} />;
}
