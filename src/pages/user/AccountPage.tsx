import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { User, Bell, Lock, Palette, Check, LogOut, Camera, AlertTriangle, Eye, EyeOff, Sun, Moon, Loader, Mail, Phone, Briefcase } from 'lucide-react';
import { useAuth } from '@context/AuthContext';
import { changePassword, deleteAccount, updateProfile as persistProfile, uploadAvatar, uploadBanner } from '@services/userService';
import { getTheme, toggleTheme } from '@utils/theme';
import { Input } from '@components/ui/input';
import { Textarea } from '@components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/select';
import { Button } from '@components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@components/ui/dialog';

const sidebarItems = [
  { key: 'profiel', label: 'Profiel', icon: User },
  { key: 'meldingen', label: 'Meldingen', icon: Bell },
  { key: 'beveiliging', label: 'Beveiliging', icon: Lock },
  { key: 'weergave', label: 'Weergave', icon: Palette },
];

const SOCIAL_PLATFORMS = [
  { key: 'spotify',    label: 'Spotify',      badge: 'SP', color: 'text-green-400',  placeholder: 'Artiest-ID',         hint: 'open.spotify.com/artist/…' },
  { key: 'soundcloud', label: 'SoundCloud',   badge: 'SC', color: 'text-orange-400', placeholder: 'gebruikersnaam',     hint: 'soundcloud.com/{handle}' },
  { key: 'appleMusic', label: 'Apple Music',  badge: 'AM', color: 'text-slate-300',  placeholder: 'Volledige URL',      hint: 'music.apple.com/…' },
  { key: 'youtube',    label: 'YouTube',      badge: 'YT', color: 'text-red-400',    placeholder: '@kanaalhandle',      hint: 'youtube.com/@{handle}' },
  { key: 'instagram',  label: 'Instagram',    badge: 'IG', color: 'text-pink-400',   placeholder: '@gebruikersnaam',    hint: 'instagram.com/{handle}' },
  { key: 'twitter',    label: 'X / Twitter',  badge: '𝕏',  color: 'text-slate-200',  placeholder: '@gebruikersnaam',    hint: 'x.com/{handle}' },
  { key: 'tiktok',     label: 'TikTok',       badge: 'TT', color: 'text-white',      placeholder: '@gebruikersnaam',    hint: 'tiktok.com/@{handle}' },
  { key: 'facebook',   label: 'Facebook',     badge: 'fb', color: 'text-blue-400',   placeholder: 'paginanaam',         hint: 'facebook.com/{handle}' },
  { key: 'bandcamp',   label: 'Bandcamp',     badge: 'BC', color: 'text-teal-400',   placeholder: 'artiesthandle',      hint: '{handle}.bandcamp.com' },
  { key: 'beatport',   label: 'Beatport',     badge: 'BP', color: 'text-yellow-400', placeholder: 'artiestslug',        hint: 'beatport.com/artist/{slug}' },
  { key: 'shopify',    label: 'Shop',         badge: 'SH', color: 'text-emerald-400',placeholder: 'Volledige winkel-URL', hint: 'jouwwinkel.myshopify.com' },
  { key: 'website',    label: 'Website',      badge: '🌐', color: 'text-violet-400', placeholder: 'https://jouwsite.nl', hint: 'Eigen website' },
];

const ALL_GENRES = [
  { id: 'nederpop', label: 'Nederpop' },
  { id: 'hiphop', label: 'Hip-Hop' },
  { id: 'elektronisch', label: 'Elektronisch' },
  { id: 'jazz', label: 'Jazz' },
  { id: 'indie', label: 'Indie' },
  { id: 'rnb', label: 'R&B' },
  { id: 'rock', label: 'Rock' },
  { id: 'folk', label: 'Folk' },
  { id: 'techno', label: 'Techno' },
  { id: 'klassiek', label: 'Klassiek' },
];

export default function AccountPage() {
  const { user, updateProfile, logout } = useAuth();
  const [activeSection, setActiveSection] = useState('profiel');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id || typeof user.id !== 'string') return;
    setAvatarUploading(true);
    try {
      const url = await uploadAvatar(user.id, file);
      updateProfile({ avatar: url });
    } catch (err) {
      console.error('Avatar upload mislukt:', err);
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Accountinstellingen</h1>
        <p className="text-slate-400 text-sm">Beheer je profiel, meldingen en beveiliging</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white/3 border border-white/5 rounded-2xl p-4 mb-4 text-center">
            <div className="relative inline-block mb-3">
              <img
                src={user.avatar}
                alt={user.displayName}
                className={`w-20 h-20 rounded-full object-cover mx-auto transition-opacity ${avatarUploading ? 'opacity-50' : ''}`}
              />
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                className="absolute bottom-0 right-0 w-7 h-7 bg-violet-600 rounded-full flex items-center justify-center border-2 border-[#1a1528] hover:bg-violet-500 transition-colors disabled:opacity-60"
              >
                {avatarUploading ? <Loader size={11} className="text-white animate-spin" /> : <Camera size={13} className="text-white" />}
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
            <p className="text-white font-semibold text-sm">{user.displayName}</p>
            <p className="text-slate-500 text-xs">@{user.username}</p>
            <Link
              to={`/profiel/${user.username}`}
              className="inline-block mt-3 text-xs text-violet-400 hover:text-violet-300 transition-colors"
            >
              Profiel bekijken →
            </Link>
          </div>

          <nav className="space-y-1">
            {sidebarItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveSection(item.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                    activeSection === item.key
                      ? 'bg-violet-600/15 text-violet-400'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </button>
              );
            })}
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors text-left mt-4"
            >
              <LogOut size={16} />
              Uitloggen
            </button>
          </nav>
        </div>

        {/* Main content */}
        <div className="lg:col-span-3">
          {activeSection === 'profiel' && (
            <ProfielSection
              user={user}
              updateProfile={updateProfile}
              userId={typeof user.id === 'string' ? user.id : null}
            />
          )}
          {activeSection === 'meldingen' && (
            <MeldingenSection user={user} updateProfile={updateProfile} />
          )}
          {activeSection === 'beveiliging' && (
            <BeveiligingSection user={user} logout={logout} />
          )}
          {activeSection === 'weergave' && (
            <WeergaveSection />
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Profiel ─────────────────────────────────────────────── */
function ProfielSection({ user, updateProfile, userId }: { user: any; updateProfile: (u: any) => void; userId: string | null }) {
  const [form, setForm] = useState({
    displayName: user?.displayName || '',
    bio: user?.bio || '',
    location: user?.location || '',
    email: user?.email || '',
    preferredGenres: user?.preferredGenres || [],
    social: user?.social ?? {},
    bookingInfo: user?.bookingInfo ?? {},
  });
  const [saved, setSaved] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setSocial = (key: string, val: string) =>
    setForm(f => ({ ...f, social: { ...f.social, [key]: val || undefined } }));
  const setBooking = (key: string, val: string) =>
    setForm(f => ({ ...f, bookingInfo: { ...f.bookingInfo, [key]: val || undefined } }));

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setBannerUploading(true);
    try {
      const url = await uploadBanner(userId, file);
      updateProfile({ banner: url });
    } catch (err) {
      console.error('Banner upload mislukt:', err);
    } finally {
      setBannerUploading(false);
      e.target.value = '';
    }
  };

  function toggleGenre(id) {
    setForm(f => ({
      ...f,
      preferredGenres: f.preferredGenres.includes(id)
        ? f.preferredGenres.filter(g => g !== id)
        : [...f.preferredGenres, id],
    }));
  }

  const handleSave = async () => {
    updateProfile(form);
    if (user?.id && typeof user.id === 'string') {
      await persistProfile(user.id, form);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="bg-white/3 border border-white/5 rounded-2xl p-6">
      <h2 className="text-lg font-semibold text-white mb-6">Profielgegevens</h2>
      <div className="space-y-5">

        {/* Banner upload */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Bannerfoto</label>
          <div className="relative rounded-xl overflow-hidden h-28 bg-white/5 border border-white/8 group cursor-pointer" onClick={() => bannerInputRef.current?.click()}>
            {user.banner && <img src={user.banner} alt="Banner" className="w-full h-full object-cover" />}
            <div className={`absolute inset-0 flex items-center justify-center transition-colors ${bannerUploading ? 'bg-black/60' : 'bg-black/30 group-hover:bg-black/50'}`}>
              <div className="flex items-center gap-2 text-white text-sm font-medium">
                {bannerUploading ? <Loader size={14} className="animate-spin" /> : <Camera size={14} />}
                {bannerUploading ? 'Uploaden...' : 'Bannerfoto wijzigen'}
              </div>
            </div>
            <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Weergavenaam</label>
            <Input
              value={form.displayName}
              onChange={e => set('displayName', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Gebruikersnaam</label>
            <Input
              value={user.username}
              disabled
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">E-mailadres</label>
          <Input
            type="email"
            value={form.email}
            onChange={e => set('email', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Locatie</label>
          <Input
            value={form.location}
            onChange={e => set('location', e.target.value)}
            placeholder="bijv. Amsterdam, Nederland"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Biografie</label>
          <Textarea
            value={form.bio}
            onChange={e => set('bio', e.target.value)}
            placeholder="Vertel iets over jezelf..."
            maxLength={200}
            className="resize-none"
          />
          <p className={`text-xs mt-1 ${form.bio.length >= 190 ? 'text-amber-400' : 'text-slate-500'}`}>
            {form.bio.length}/200 tekens
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Favoriete genres</label>
          <div className="flex flex-wrap gap-2">
            {ALL_GENRES.map(g => (
              <button
                key={g.id}
                type="button"
                onClick={() => toggleGenre(g.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                  form.preferredGenres.includes(g.id)
                    ? 'bg-violet-600/20 border-violet-500/50 text-violet-400'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">Wordt gebruikt voor gepersonaliseerde aanbevelingen</p>
        </div>

        {/* Social links */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Sociale links & platforms</label>
          <p className="text-xs text-slate-500 mb-3">Voer je handle of URL in — lege velden worden niet getoond</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {SOCIAL_PLATFORMS.map(p => (
              <div key={p.key} className="flex items-center gap-2">
                <span className={`w-8 text-center text-[11px] font-bold shrink-0 ${p.color}`}>{p.badge}</span>
                <div className="flex-1">
                  <Input
                    placeholder={p.placeholder}
                    value={form.social?.[p.key] || ''}
                    onChange={e => setSocial(p.key, e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Booking & contact */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Boeking & contact</label>
          <p className="text-xs text-slate-500 mb-3">Zichtbaar op je profiel voor promotors en boekingskantoren</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5"><Mail size={12} /> Boekings-e-mail</label>
              <Input
                type="email"
                placeholder="booking@jouwmail.nl"
                value={form.bookingInfo?.email || ''}
                onChange={e => setBooking('email', e.target.value)}
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5"><Briefcase size={12} /> Manager / agent</label>
              <Input
                placeholder="Naam manager of boekingskantoor"
                value={form.bookingInfo?.manager || ''}
                onChange={e => setBooking('manager', e.target.value)}
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5"><Phone size={12} /> Telefoon / WhatsApp</label>
              <Input
                type="tel"
                placeholder="+31 6 12 34 56 78"
                value={form.bookingInfo?.phone || ''}
                onChange={e => setBooking('phone', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className={`flex items-center gap-2 text-green-400 text-sm transition-opacity ${saved ? 'opacity-100' : 'opacity-0'}`}>
            <Check size={16} /> Opgeslagen!
          </div>
          <Button onClick={handleSave} className="ml-auto">
            Wijzigingen opslaan
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Meldingen ───────────────────────────────────────────── */
function MeldingenSection({ user, updateProfile }) {
  const defaults = {
    'Nieuwe volger': true,
    'Reacties op nummers': true,
    'Evenementherinneringen': true,
    'Nieuwe berichten in forums': false,
    'Aanbevelingen': false,
    'Nieuwsbrief': false,
    ...(user?.notifications || {}),
  };
  const [notifications, setNotifications] = useState(defaults);
  const [saved, setSaved] = useState(false);

  const ITEMS = [
    { label: 'Nieuwe volger', desc: 'Ontvang een melding als iemand je gaat volgen' },
    { label: 'Reacties op nummers', desc: 'Meldingen voor reacties op jouw uploads' },
    { label: 'Evenementherinneringen', desc: 'Herinnering 24 uur voor aangemelde evenementen' },
    { label: 'Nieuwe berichten in forums', desc: 'Reacties in discussions die je volgt' },
    { label: 'Aanbevelingen', desc: 'Gepersonaliseerde muziekaanbevelingen' },
    { label: 'Nieuwsbrief', desc: 'Wekelijkse h-orbit nieuwsbrief' },
  ];

  const handleSave = () => {
    // TODO: replace with → userService.updatePreferences(user.id, { notifications })
    updateProfile({ notifications });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="bg-white/3 border border-white/5 rounded-2xl p-6">
      <h2 className="text-lg font-semibold text-white mb-6">Meldingen</h2>
      <div className="space-y-4">
        {ITEMS.map(item => (
          <NotificationToggle
            key={item.label}
            label={item.label}
            desc={item.desc}
            on={notifications[item.label]}
            onChange={val => setNotifications(n => ({ ...n, [item.label]: val }))}
          />
        ))}
      </div>
      <div className="flex items-center justify-end gap-4 mt-6">
        <div className={`flex items-center gap-2 text-green-400 text-sm transition-opacity ${saved ? 'opacity-100' : 'opacity-0'}`}>
          <Check size={16} /> Opgeslagen!
        </div>
        <button
          onClick={handleSave}
          className="bg-violet-600 hover:bg-violet-500 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
        >
          Voorkeuren opslaan
        </button>
      </div>
    </div>
  );
}

/* ─── Beveiliging ─────────────────────────────────────────── */
function BeveiligingSection({ user, logout }) {
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [pwSuccess, setPwSuccess] = useState(false);
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const setField = (k, v) => {
    setPwForm(f => ({ ...f, [k]: v }));
    if (pwErrors[k]) setPwErrors(e => ({ ...e, [k]: null }));
  };

  const handleChangePassword = async () => {
    const errors = {};
    if (!pwForm.current) errors.current = 'Vul je huidige wachtwoord in.';
    if (!pwForm.next) errors.next = 'Vul een nieuw wachtwoord in.';
    else if (pwForm.next.length < 6) errors.next = 'Minimaal 6 tekens vereist.';
    if (pwForm.next && pwForm.confirm !== pwForm.next) errors.confirm = 'Wachtwoorden komen niet overeen.';
    if (Object.keys(errors).length) { setPwErrors(errors); return; }

    const result = await changePassword(user.id, { currentPassword: pwForm.current, newPassword: pwForm.next });
    if (!result.ok) { setPwErrors({ current: result.error }); return; }

    setPwForm({ current: '', next: '', confirm: '' });
    setPwErrors({});
    setPwSuccess(true);
    setTimeout(() => setPwSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Password change */}
      <div className="bg-white/3 border border-white/5 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-6">Wachtwoord wijzigen</h2>
        <div className="space-y-5">
          {[
            { key: 'current', label: 'Huidig wachtwoord', placeholder: '••••••••' },
            { key: 'next', label: 'Nieuw wachtwoord', placeholder: 'Minimaal 6 tekens' },
            { key: 'confirm', label: 'Nieuw wachtwoord bevestigen', placeholder: '••••••••' },
          ].map(field => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-slate-300 mb-2">{field.label}</label>
              <div className="relative">
                <input
                  type={showPw[field.key] ? 'text' : 'password'}
                  value={pwForm[field.key]}
                  onChange={e => setField(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className={`w-full bg-white/5 border rounded-xl px-4 py-3 pr-11 text-white placeholder-slate-500 focus:outline-none transition-all ${
                    pwErrors[field.key] ? 'border-red-500/60 focus:border-red-500' : 'border-white/10 focus:border-violet-500/50'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => ({ ...s, [field.key]: !s[field.key] }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPw[field.key] ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {pwErrors[field.key] && (
                <p className="text-xs text-red-400 mt-1">{pwErrors[field.key]}</p>
              )}
            </div>
          ))}

          <div className="flex items-center justify-between pt-1">
            <div className={`flex items-center gap-2 text-green-400 text-sm transition-opacity ${pwSuccess ? 'opacity-100' : 'opacity-0'}`}>
              <Check size={16} /> Wachtwoord gewijzigd!
            </div>
            <button
              onClick={handleChangePassword}
              className="bg-violet-600 hover:bg-violet-500 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors ml-auto"
            >
              Wachtwoord wijzigen
            </button>
          </div>
        </div>
      </div>

      {/* Active sessions */}
      <div className="bg-white/3 border border-white/5 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Actieve sessies</h2>
        <p className="text-xs text-slate-400 mb-4">Je bent momenteel ingelogd op de volgende apparaten.</p>
        <div className="bg-white/3 border border-white/5 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-white font-medium">Huidige sessie</p>
            <p className="text-xs text-slate-400">Browser · Nu actief</p>
          </div>
          <span className="text-xs bg-green-500/15 text-green-400 px-2 py-1 rounded-full">Actief</span>
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={16} className="text-red-400" />
          <h2 className="text-sm font-semibold text-red-400">Gevarenzone</h2>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Het verwijderen van je account is permanent en kan niet ongedaan worden gemaakt.
          Al je data, uploads en reacties worden gewist.
        </p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="text-sm text-red-400 hover:text-red-300 border border-red-500/30 hover:bg-red-500/10 px-4 py-2 rounded-xl transition-colors"
        >
          Account verwijderen
        </button>
      </div>

      {showDeleteModal && (
        <DeleteAccountModal
          username={user.username}
          onConfirm={async (confirmUsername) => {
            const result = await deleteAccount(user.id, { username: user.username, confirmUsername });
            if (!result.ok) return result.error;
            logout();
            return null;
          }}
          onClose={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  );
}

/* ─── Delete Account Modal ────────────────────────────────── */
function DeleteAccountModal({ username, onConfirm, onClose }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    const err = await onConfirm(input);
    setLoading(false);
    if (err) { setError(err); return; }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-[#231d3a] border-red-500/30">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
              <AlertTriangle size={18} className="text-red-400" />
            </div>
            <div>
              <DialogTitle className="text-base">Account verwijderen</DialogTitle>
              <DialogDescription className="text-xs">Deze actie is onomkeerbaar</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            Typ je gebruikersnaam <span className="font-bold text-white">@{username}</span> ter bevestiging:
          </p>

          <div>
            <Input
              value={input}
              onChange={e => { setInput(e.target.value); setError(''); }}
              placeholder={username}
              className={error ? 'border-red-500/60' : ''}
            />
            {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
          </div>

          <div className="flex gap-3">
            <Button onClick={onClose} variant="ghost" className="flex-1">
              Annuleren
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={loading || !input}
              variant="destructive"
              className="flex-1"
            >
              {loading ? 'Bezig...' : 'Permanent verwijderen'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Weergave ────────────────────────────────────────────── */
function WeergaveSection() {
  const [theme, setThemeState] = useState(() => getTheme());

  const handleToggle = (next) => {
    if (next === theme) return;
    toggleTheme();
    setThemeState(next);
  };

  return (
    <div className="bg-white/3 border border-white/5 rounded-2xl p-6">
      <h2 className="text-lg font-semibold text-white mb-6">Weergave-instellingen</h2>
      <div className="space-y-6">
        <div>
          <p className="text-sm font-medium text-slate-300 mb-3">Kleurthema</p>
          <div className="grid grid-cols-2 gap-3 max-w-xs">
            {[
              { key: 'dark', label: 'Donker', icon: Moon },
              { key: 'light', label: 'Licht', icon: Sun },
            ].map(opt => {
              const Icon = opt.icon;
              const active = theme === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => handleToggle(opt.key)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                    active ? 'border-violet-500 bg-violet-600/10' : 'border-white/10 hover:border-white/30 hover:bg-white/5'
                  }`}
                >
                  <Icon size={20} className={active ? 'text-violet-400' : 'text-slate-400'} />
                  <span className={`text-sm font-medium ${active ? 'text-violet-400' : 'text-slate-400'}`}>
                    {opt.label}
                  </span>
                  {active && (
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-slate-300 mb-3">Taal</p>
          <Select defaultValue="nl">
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nl">Nederlands</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

/* ─── Notification Toggle ─────────────────────────────────── */
function NotificationToggle({ label, desc, on, onChange }) {
  return (
    <div className="flex items-center justify-between p-4 bg-white/2 rounded-xl">
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
      </div>
      <button
        onClick={() => onChange(!on)}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${on ? 'bg-violet-600' : 'bg-white/10'}`}
      >
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${on ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  );
}
