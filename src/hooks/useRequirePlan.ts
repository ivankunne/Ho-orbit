import { useCallback } from 'react';
import { useAuth } from '@context/AuthContext';
import { useUpgradeModal } from '@context/UpgradeModalContext';
import { usePaywallSettings } from '@hooks/usePaywallSettings';
import { useRequireAuth } from '@hooks/useRequireAuth';
import { MASTER_ADMIN_EMAIL } from '@pages/AdminLoginPage';

/**
 * De tweede drempel, ná useRequireAuth: inloggen is één ding, betalen een
 * ander. Kijken mag altijd — de lijst met evenementen, de netwerkoproepen —
 * maar aanmelden, plaatsen of contact opnemen vraagt Pro.
 *
 * De volgorde is bewust: wie helemaal niet is ingelogd krijgt eerst het
 * inlogvenster, want zonder account valt er niets te upgraden.
 *
 *   const requirePlan = useRequirePlan();
 *   const onRsvp = () => {
 *     if (!requirePlan('Aanmelden voor evenementen is een Pro-functie')) return;
 *     toggleRsvp(id);
 *   };
 *
 * Dezelfde uitzonderingen als RequirePlan: de master-admin komt overal langs,
 * en zolang de schakelaar in het adminpaneel uit staat is er niets afgesloten.
 */
export function useRequirePlan() {
  const { user } = useAuth();
  const { enabled: paywallLive, loading } = usePaywallSettings();
  const { open } = useUpgradeModal();
  const requireAuth = useRequireAuth();

  return useCallback(
    (title?: string, description?: string) => {
      if (!requireAuth()) return false;
      // Nog aan het laden: niet tegenhouden op iets wat we nog niet weten.
      if (loading) return true;
      if (!paywallLive) return true;
      if (user?.plan === 'paid') return true;
      if (user?.email === MASTER_ADMIN_EMAIL) return true;
      open({ title, description });
      return false;
    },
    [requireAuth, loading, paywallLive, user, open],
  );
}

/** Alleen de vraag, zonder venster — voor het tonen van een slotje of teaser. */
export function useHasPlan() {
  const { user } = useAuth();
  const { enabled: paywallLive, loading } = usePaywallSettings();
  if (loading || !paywallLive) return true;
  return user?.plan === 'paid' || user?.email === MASTER_ADMIN_EMAIL;
}
