import { useCallback } from 'react';
import { useAuth } from '@context/AuthContext';
import { useAuthModal } from '@context/AuthModalContext';

/**
 * De grens tussen rondkijken en meedoen.
 *
 * Sinds de app open staat voor bezoekers zonder account, zit de afscherming
 * niet meer in de route maar in de handeling: kijken mag altijd, zodra je
 * iets wilt dóén (afspelen, liken, volgen, reageren, uploaden) vraagt
 * h-orbit eerst om een account.
 *
 * Gebruik:
 *
 *   const requireAuth = useRequireAuth();
 *   const onPlay = () => { if (!requireAuth()) return; playTrack(track); };
 *
 * Of, als de handeling zelf al een functie is:
 *
 *   <button onClick={withAuth(() => toggleLike(id))}>
 *
 * Let op: dit is een UX-grens, geen beveiliging. Schrijfacties worden aan de
 * databasekant afgeschermd door RLS; dit zorgt ervoor dat een bezoeker een
 * inlogvenster ziet in plaats van een stille fout.
 */
export function useRequireAuth() {
  const { user } = useAuth();
  const { open } = useAuthModal();

  return useCallback(
    (tab: 'login' | 'signup' = 'signup') => {
      if (user) return true;
      open(tab);
      return false;
    },
    [user, open],
  );
}

/** Wikkelt een handler zodat hij pas draait als er iemand is ingelogd. */
export function useWithAuth() {
  const requireAuth = useRequireAuth();
  return useCallback(
    <T extends (...args: never[]) => unknown>(fn: T, tab: 'login' | 'signup' = 'signup') =>
      ((...args: Parameters<T>) => {
        if (!requireAuth(tab)) return undefined;
        return fn(...args);
      }) as T,
    [requireAuth],
  );
}
