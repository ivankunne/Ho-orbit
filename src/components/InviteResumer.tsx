import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@context/AuthContext';
import { useToast } from '@components/Toast';
import { PENDING_INVITE_KEY } from '@lib/invite';

/**
 * Completes a pending band invite once the user is authenticated.
 *
 * JoinBandPage handles the case where the invite URL is open in the tab.
 * This covers the round-trip case: a visitor clicks an invite link, registers,
 * confirms their email, and is dropped back on the home page (or anywhere) —
 * the stashed token is redeemed here so they still land in the band.
 *
 * Mounted once, app-wide, inside the Router.
 */
export default function InviteResumer() {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const addToast = useToast();
  const running = useRef(false);

  useEffect(() => {
    if (loading || !user) return;
    // JoinBandPage owns the join while its URL is open — don't double-fire.
    if (pathname.startsWith('/bandspace/join/')) return;
    if (running.current) return;

    let token: string | null = null;
    try { token = localStorage.getItem(PENDING_INVITE_KEY); } catch {}
    if (!token) return;

    running.current = true;

    (async () => {
      const { data, error } = await supabase.rpc('join_band_with_token', { p_token: token });
      try { localStorage.removeItem(PENDING_INVITE_KEY); } catch {}
      if (error || !data) {
        addToast('Kon de uitnodiging niet voltooien. Vraag om een nieuwe link.', 'error');
        running.current = false;
        return;
      }
      addToast('Je bent nu lid van de band!', 'success');
      navigate(`/bandspace/${data}`, { replace: true });
    })();
  }, [user, loading, pathname, navigate, addToast]);

  return null;
}
