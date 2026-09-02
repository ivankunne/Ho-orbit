import type { ReactNode } from 'react';
import { useAuth } from '@context/AuthContext';
import PageLoader from '@components/PageLoader';
import PaywallPage from '@pages/PaywallPage';

interface RequirePlanProps {
  children: ReactNode;
  /** Passed through to PaywallPage for page-specific copy. */
  title?: string;
  description?: string;
}

/**
 * Paid-content gate for a route, mirroring ProtectedRoute in App.tsx. Not
 * wired into any route yet — wrap a page's element with this once it's time
 * to put it behind the paywall:
 *
 *   <Route path="/x" element={<ProtectedRoute><RequirePlan><XPage /></RequirePlan></ProtectedRoute>} />
 *
 * Only checks user.plan === 'paid' today (the one plan that exists). If a
 * second paid tier or a la carte fee is ever added, extend this rather than
 * adding a parallel gate.
 */
export default function RequirePlan({ children, title, description }: RequirePlanProps) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user?.plan !== 'paid') return <PaywallPage title={title} description={description} />;
  return <>{children}</>;
}
