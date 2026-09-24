import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Music, Mic, Radio, Loader2 } from 'lucide-react';
import { useAuth } from '@context/AuthContext';
import { useToast } from '@components/Toast';
import { SELF_SERVICE_ROLES, rolesOf, saveMyRoles, type CreatorRole } from '@lib/roles';

const ICONS: Record<CreatorRole, typeof Music> = { Artiest: Music, Podcast: Mic, Radio };
const WHERE: Partial<Record<CreatorRole, { to: string; label: string }>> = {
  Artiest: { to: '/upload', label: 'Muziek uploaden' },
  Podcast: { to: '/podcasts', label: 'Naar je podcaststudio' },
};

/**
 * "Wat maak je?" in Account → Profiel. Artiest en Podcast zet je hier zelf aan
 * of uit (allebei kan). Radio staat erbij als je hem hebt, maar is alleen door
 * een admin te wijzigen. Opslaan gebeurt direct bij het omzetten.
 */
export default function CreatorRolesCard() {
  const { user, updateProfile } = useAuth();
  const addToast = useToast();
  const [busy, setBusy] = useState<CreatorRole | null>(null);
  const roles = rolesOf(user);

  async function toggle(r: CreatorRole) {
    const next = roles.includes(r) ? roles.filter(x => x !== r) : [...roles, r];
    setBusy(r);
    try {
      const saved = await saveMyRoles(user.id, next, user.role);
      updateProfile(saved);
      addToast(next.includes(r) ? `${r === 'Artiest' ? 'Artiest' : 'Podcaster'} staat aan` : `${r === 'Artiest' ? 'Artiest' : 'Podcaster'} staat uit`, 'success');
    } catch (e) {
      addToast((e as Error).message, 'error');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="bg-white/3 border border-white/5 rounded-2xl p-6 mb-6">
      <h2 className="text-lg font-semibold text-white mb-1">Wat maak je?</h2>
      <p className="text-sm text-slate-400 mb-5">Bepaalt wat je kunt uploaden. Allebei aanzetten kan, bijvoorbeeld als je muziek maakt én een podcast hebt.</p>
      <div className="space-y-2.5">
        {SELF_SERVICE_ROLES.map(r => {
          const on = roles.includes(r.id);
          const Icon = ICONS[r.id];
          return (
            <div key={r.id} className={`flex items-center gap-3 rounded-xl border p-3.5 transition-colors ${on ? 'border-violet-500/40 bg-violet-600/10' : 'border-white/10'}`}>
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${on ? 'bg-violet-600/25 text-violet-300' : 'bg-white/5 text-slate-500'}`}>
                <Icon size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">{r.label}</p>
                <p className="text-xs text-slate-400">{r.desc}</p>
                {on && WHERE[r.id] && (
                  <Link to={WHERE[r.id]!.to} className="mt-1 inline-block text-xs font-medium text-violet-300 hover:text-violet-200">{WHERE[r.id]!.label} →</Link>
                )}
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={r.label}
                disabled={busy !== null}
                onClick={() => toggle(r.id)}
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60 ${on ? 'bg-violet-600' : 'bg-white/15'}`}
              >
                <span className={`absolute top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow transition-transform ${on ? 'translate-x-[22px]' : 'translate-x-0.5'}`}>
                  {busy === r.id && <Loader2 size={12} className="animate-spin text-violet-600" />}
                </span>
              </button>
            </div>
          );
        })}
        {roles.includes('Radio') && (
          <div className="flex items-center gap-3 rounded-xl border border-white/10 p-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600/25 text-violet-300"><Radio size={18} /></div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white">Radio</p>
              <p className="text-xs text-slate-400">Je beheert een radiostation. Deze rol wordt door een admin toegekend.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
