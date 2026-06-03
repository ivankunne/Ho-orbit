import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, Music, UserPlus, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@context/AuthContext';
import { useAuthModal } from '@context/AuthModalContext';
import { useToast } from '@components/Toast';

/**
 * Public landing for band invite links: /bandspace/join/:token
 *
 * - Logged out → open the auth modal (stays on this URL, so once the
 *   visitor signs in we resume the join automatically).
 * - Logged in  → call the secure join_band_with_token RPC, which adds
 *   them as an active member (private bands included) and returns the
 *   band id, then redirect into the workspace.
 */
export default function JoinBandPage() {
  const { token } = useParams<{ token: string }>();
  const { user, loading } = useAuth();
  const { open } = useAuthModal();
  const navigate = useNavigate();
  const addToast = useToast();

  const [status, setStatus] = useState<'idle' | 'joining' | 'error'>('idle');
  const joined = useRef(false);

  useEffect(() => {
    if (loading || !token) return;

    if (!user) {
      open('signup'); // overlay; this URL is preserved so we resume after sign-in
      return;
    }

    if (joined.current) return;
    joined.current = true;

    (async () => {
      setStatus('joining');
      const { data, error } = await supabase.rpc('join_band_with_token', { p_token: token });
      if (error || !data) {
        setStatus('error');
        addToast('Kon niet lid worden van deze band', 'error');
        return;
      }
      addToast('Je bent nu lid van de band!', 'success');
      navigate(`/bandspace/${data}`, { replace: true });
    })();
  }, [user, loading, token, open, navigate, addToast]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600/40 to-violet-900/60 border border-violet-500/25 flex items-center justify-center">
        <Music size={26} className="text-violet-400" />
      </div>

      {status === 'error' ? (
        <>
          <AlertCircle size={22} className="text-red-400" />
          <div>
            <p className="text-lg font-semibold text-white">Uitnodiging ongeldig</p>
            <p className="text-sm text-slate-500 mt-1 max-w-xs">
              Deze uitnodigingslink werkt niet meer. Vraag de band om een nieuwe link.
            </p>
          </div>
          <Link to="/bandspace" className="text-violet-400 hover:underline text-sm">← Naar Band Space</Link>
        </>
      ) : !user && !loading ? (
        <>
          <div>
            <p className="text-lg font-semibold text-white">Word lid van de band</p>
            <p className="text-sm text-slate-500 mt-1 max-w-xs">
              Log in of maak een account aan om de uitnodiging te accepteren.
            </p>
          </div>
          <button
            onClick={() => open('signup')}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            <UserPlus size={15} /> Inloggen / Registreren
          </button>
        </>
      ) : (
        <>
          <Loader2 size={24} className="animate-spin text-violet-400" />
          <p className="text-sm text-slate-500">Je wordt lid gemaakt…</p>
        </>
      )}
    </div>
  );
}
