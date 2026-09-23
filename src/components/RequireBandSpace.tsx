import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@context/AuthContext';
import RequirePlan from '@components/RequirePlan';
import PageLoader from '@components/PageLoader';
import { fetchBandSpaceAccess } from '@services/bandSeatService';

/**
 * BandSpace is een Pro-functie, maar de vijf mensen die een abonnee uitnodigt
 * betalen niet zelf — zij vallen onder zijn abonnement. RequirePlan kijkt
 * alleen naar het eigen plan van de bezoeker en zou hen dus precies buiten de
 * deur zetten waar de stoel voor gekocht is.
 *
 * has_bandspace_access() in de database beantwoordt de echte vraag: zelf Pro,
 * óf actief lid van een band van iemand anders. Die tweede kan alleen bestaan
 * binnen de ruimte van een betalende eigenaar — de stoeltrigger laat niets
 * anders toe — dus is het lidmaatschap zelf het bewijs van dekking.
 */
export default function RequireBandSpace({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [covered, setCovered] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) { setCovered(false); return; }
    let active = true;
    fetchBandSpaceAccess().then((allowed) => { if (active) setCovered(allowed); });
    return () => { active = false; };
  }, [user]);

  if (authLoading || (user && covered === null)) return <PageLoader />;

  return (
    <RequirePlan
      bypass={covered === true}
      title="BandSpace is een Pro-functie"
      description="Upgrade naar H-orbit Pro om je band-workspace te gebruiken. Wie jij uitnodigt, hoeft zelf niets te betalen."
    >
      {children}
    </RequirePlan>
  );
}
