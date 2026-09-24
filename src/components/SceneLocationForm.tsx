import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Loader2, MapPin, Search, Trash2 } from 'lucide-react';
import { useToast } from '@components/Toast';
import { Sheet, Field, inputCls } from '@components/LearningForms';
import {
  createSceneLocation, updateSceneLocation, deleteSceneLocation, geocodeAddress, submitSceneLocation,
  PROVINCES, type SceneLocation, type SceneLocationInput,
} from '@services/sceneLocationService';

const pin = L.divIcon({
  className: '',
  html: `<div style="width:26px;height:26px;background:#7c3aed;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.6)"></div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

/** Klik op de kaart zet de pin daar neer. */
function ClickToPlace({ onPick }: { onPick: (p: [number, number]) => void }) {
  useMapEvents({ click: e => onPick([e.latlng.lat, e.latlng.lng]) });
  return null;
}

/** Springt naar de pin als die van buitenaf verandert (adres opgezocht). */
function FollowPin({ pos, token }: { pos: [number, number] | null; token: number }) {
  const map = useMap();
  useEffect(() => { if (pos) map.setView(pos, Math.max(map.getZoom(), 15)); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/** Het venster schuift open; Leaflet meet zijn grootte bij het aanmaken en
 *  laadt anders maar een deel van de kaarttegels. Na het openen opnieuw meten. */
function FixSize() {
  const map = useMap();
  useEffect(() => { const t = setTimeout(() => map.invalidateSize(), 250); return () => clearTimeout(t); }, [map]);
  return null;
}

type TypeOption = { value: string; label: string };

/**
 * Locatie toevoegen of wijzigen op de scenekaart.
 *
 * - `mode="admin"`: direct opslaan. Alleen voor admins — de knoppen die dit
 *   openen zijn verborgen voor anderen, en de database weigert het sowieso
 *   (scene_locations_admin_migration.sql).
 * - `mode="public"`: "Meld je locatie aan" voor iedereen. Vraagt ook naam en
 *   e-mail van de aanvrager en stuurt het naar de admins ter beoordeling
 *   (edge function scene-submission); er komt niets direct op de kaart.
 *
 * De plek komt uit het adres (OpenStreetMap) en is daarna met de pin bij te
 * stellen: een adres alleen legt een marker soms midden in een straat, of op
 * het verkeerde pand bij een groot complex.
 */
export default function SceneLocationForm({ mode = 'admin', location, typeOptions, existing, onClose, onSaved, onDeleted }: {
  mode?: 'admin' | 'public';
  location?: SceneLocation | null;
  typeOptions: TypeOption[];
  existing: SceneLocation[];
  onClose: () => void;
  onSaved?: (row: SceneLocation) => void;
  onDeleted?: (id: number) => void;
}) {
  const addToast = useToast();
  const editing = !!location;
  const isPublic = mode === 'public';
  const [contact, setContact] = useState({ name: '', email: '', message: '', website_confirm: '' });
  const upContact = (k: keyof typeof contact) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setContact(s => ({ ...s, [k]: e.target.value }));
  const [f, setF] = useState({
    name: location?.name ?? '',
    type: location?.type ?? typeOptions[0]?.value ?? '',
    address: location?.address ?? '',
    city: location?.city ?? '',
    province: location?.province ?? '',
    website: location?.website ?? '',
    notes: location?.notes ?? '',
    description: location?.description ?? '',
  });
  const [pos, setPos] = useState<[number, number] | null>(location ? [location.lat, location.lng] : null);
  const [jump, setJump] = useState(0);
  const [finding, setFinding] = useState(false);
  const [found, setFound] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const up = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF(s => ({ ...s, [k]: e.target.value }));

  // Een type dat niet in de lijst staat (bv. 'Cultuurcentrum') blijft kiesbaar
  // bij het wijzigen, anders zou opslaan het stilletjes veranderen.
  const options = f.type && !typeOptions.some(o => o.value === f.type)
    ? [...typeOptions, { value: f.type, label: f.type }]
    : typeOptions;

  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const duplicate = f.name.trim() && f.city.trim()
    ? existing.find(l => l.id !== location?.id && norm(l.name) === norm(f.name) && norm(l.city) === norm(f.city))
    : undefined;

  const website = f.website.trim().replace(/^https?:\/\//i, '').replace(/\/$/, '');
  const errors = {
    name: !f.name.trim() ? 'Geef de locatie een naam.' : undefined,
    city: !f.city.trim() ? 'Vul de plaats in.' : undefined,
    province: !f.province ? 'Kies een provincie.' : undefined,
    website: website && !/^[^\s/]+\.[a-z]{2,}(\/\S*)?$/i.test(website) ? 'Dit lijkt geen geldig webadres, bv. www.voorbeeld.nl' : undefined,
    pos: !pos ? 'Zoek het adres op of tik op de kaart om de plek aan te geven.' : undefined,
    contactName: isPublic && !contact.name.trim() ? 'Vul je naam in.' : undefined,
    contactEmail: isPublic && !/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(contact.email.trim()) ? 'Vul een geldig e-mailadres in.' : undefined,
  };
  const show = (k: keyof typeof errors) => (tried ? errors[k] : undefined);

  async function findAddress() {
    if (!f.city.trim() && !f.address.trim()) { addToast('Vul eerst een adres en plaats in.', 'error'); return; }
    setFinding(true); setFound(null);
    try {
      const hit = await geocodeAddress({ address: f.address, city: f.city, name: f.name });
      if (!hit) { addToast('Adres niet gevonden. Controleer het of tik de plek aan op de kaart.', 'error'); return; }
      setPos([hit.lat, hit.lng]); setJump(j => j + 1); setFound(hit.label);
      setF(s => ({ ...s, city: s.city || hit.city || '', province: s.province || hit.province || '' }));
    } catch {
      addToast('Adres opzoeken lukt nu niet. Tik de plek aan op de kaart.', 'error');
    } finally {
      setFinding(false);
    }
  }

  async function submit() {
    setTried(true);
    if (Object.values(errors).some(Boolean) || !pos) return;
    setBusy(true);
    const input: SceneLocationInput = {
      name: f.name.trim(),
      type: f.type,
      address: f.address.trim() || null,
      city: f.city.trim(),
      province: f.province,
      website: website || null,
      notes: f.notes.trim() || null,
      description: f.description.trim() || null,
      lat: Number(pos[0].toFixed(7)),
      lng: Number(pos[1].toFixed(7)),
    };
    try {
      if (isPublic) {
        await submitSceneLocation(input, contact);
        addToast('Bedankt! We bekijken je aanmelding en laten het je per e-mail weten.', 'success');
        onClose();
        return;
      }
      const row = editing ? await updateSceneLocation(location!.id, input) : await createSceneLocation(input);
      addToast(editing ? 'Locatie bijgewerkt' : 'Locatie op de kaart gezet', 'success');
      onSaved?.(row);
      onClose();
    } catch (err) {
      addToast((err as Error)?.message || 'Opslaan is mislukt.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!location) return;
    setBusy(true);
    try {
      await deleteSceneLocation(location.id);
      addToast('Locatie verwijderd', 'success');
      onDeleted?.(location.id);
      onClose();
    } catch (err) {
      addToast((err as Error)?.message || 'Verwijderen is mislukt.', 'error');
      setBusy(false);
    }
  }

  return (
    <Sheet title={isPublic ? 'Meld je locatie aan' : editing ? 'Locatie bewerken' : 'Locatie toevoegen'}
      submitLabel={isPublic ? 'Versturen' : 'Opslaan'} onClose={onClose} busy={busy} onSubmit={submit}>
      {isPublic && (
        <p className="-mt-1 text-sm text-slate-400">
          Heb je een oefenruimte, podium of zaal waar muzikanten terecht kunnen? Vul de gegevens in; na een korte
          controle door ons team staat hij op de kaart.
        </p>
      )}
      <Field label="Naam" required error={show('name')}>
        <input value={f.name} onChange={up('name')} placeholder="bv. Poppodium De Vorstin" className={inputCls} />
      </Field>
      {duplicate && (
        <p className="-mt-3 rounded-lg bg-amber-500/10 border border-amber-500/25 px-3 py-2 text-xs text-amber-200">
          {isPublic
            ? <>“{duplicate.name}” in {duplicate.city} staat al op de kaart. Klopt er iets niet? Meld het gerust, zet het dan in je bericht.</>
            : <>Er staat al een “{duplicate.name}” in {duplicate.city} op de kaart. Weet je zeker dat dit een andere plek is?</>}
        </p>
      )}

      <Field label="Type" required hint="Bepaalt de kleur en het filter in de legenda.">
        <select value={f.type} onChange={up('type')} className={inputCls}>
          {options.map(o => <option key={o.value} value={o.value} className="bg-[#1e1833]">{o.label}</option>)}
        </select>
      </Field>

      <Field label="Adres" hint="Straat en huisnummer.">
        <input value={f.address} onChange={up('address')} placeholder="bv. Koninginneweg 44" className={inputCls} autoComplete="off" />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Plaats" required error={show('city')}>
          <input value={f.city} onChange={up('city')} placeholder="bv. Hilversum" className={inputCls} />
        </Field>
        <Field label="Provincie" required error={show('province')}>
          <select value={f.province} onChange={up('province')} className={inputCls}>
            <option value="" className="bg-[#1e1833]">Kies…</option>
            {PROVINCES.map(p => <option key={p} value={p} className="bg-[#1e1833]">{p}</option>)}
          </select>
        </Field>
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-slate-300">Plek op de kaart <span className="text-violet-400">*</span></span>
        <button type="button" onClick={findAddress} disabled={finding}
          className="mb-2 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-violet-500/40 bg-violet-600/15 px-4 text-sm font-semibold text-violet-200 hover:bg-violet-600/25 disabled:opacity-60 transition-colors">
          {finding ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Zoek adres op de kaart
        </button>
        <div className="h-56 overflow-hidden rounded-xl border border-white/10">
          <MapContainer center={pos ?? [52.2, 5.3]} zoom={pos ? 15 : 7} minZoom={6} maxZoom={18}
            style={{ height: '100%', width: '100%', background: '#1a1528' }}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" subdomains="abcd" maxZoom={19}
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>' />
            <FixSize />
            <ClickToPlace onPick={setPos} />
            <FollowPin pos={pos} token={jump} />
            {pos && (
              <Marker position={pos} icon={pin} draggable
                eventHandlers={{ dragend: e => { const p = (e.target as L.Marker).getLatLng(); setPos([p.lat, p.lng]); } }} />
            )}
          </MapContainer>
        </div>
        {show('pos')
          ? <span className="mt-1 block text-xs text-red-400">{show('pos')}</span>
          : <span className="mt-1 flex items-start gap-1 text-xs text-slate-500">
              <MapPin size={12} className="mt-0.5 shrink-0" />
              {found ? `Gevonden: ${found}. Klopt het niet precies? Sleep de pin.` : 'Tik op de kaart of sleep de pin om de plek precies goed te zetten.'}
            </span>}
      </div>

      <Field label="Website" error={show('website')}>
        <input value={f.website} onChange={up('website')} placeholder="www.voorbeeld.nl" inputMode="url" className={inputCls} autoComplete="off" />
      </Field>

      <Field label="Korte omschrijving" hint="Staat in het pop-upje op de kaart. Houd het kort, bv. wat er aan apparatuur is.">
        <input value={f.notes} onChange={up('notes')} maxLength={120} placeholder="bv. 3 oefenruimtes met drumstel en versterkers" className={inputCls} />
      </Field>

      <Field label="Uitgebreide beschrijving" hint="Optioneel. Ingevuld? Dan krijgt de locatie een eigen pagina met een “Meer info”-knop.">
        <textarea value={f.description} onChange={up('description')} rows={4} className={`${inputCls} py-2.5 resize-y`} />
      </Field>

      {isPublic && (
        <div className="space-y-5 border-t border-white/8 pt-5">
          <p className="text-sm font-semibold text-white">Jouw gegevens</p>
          <Field label="Je naam" required error={show('contactName')}>
            <input value={contact.name} onChange={upContact('name')} autoComplete="name" className={inputCls} />
          </Field>
          <Field label="Je e-mailadres" required error={show('contactEmail')} hint="Alleen om je te laten weten dat je locatie op de kaart staat. Niet zichtbaar voor anderen.">
            <input value={contact.email} onChange={upContact('email')} type="email" autoComplete="email" inputMode="email" className={inputCls} />
          </Field>
          <Field label="Bericht voor ons" hint="Optioneel.">
            <textarea value={contact.message} onChange={upContact('message')} rows={3} maxLength={1000} className={`${inputCls} py-2.5 resize-y`} />
          </Field>
          {/* Honeypot: onzichtbaar voor mensen, bots vullen het in. */}
          <input value={contact.website_confirm} onChange={upContact('website_confirm')} tabIndex={-1} autoComplete="off"
            aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" name="website_confirm" />
        </div>
      )}

      {editing && !isPublic && (
        <div className="border-t border-white/8 pt-4">
          {confirmDelete ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <button type="button" onClick={remove} disabled={busy}
                className="flex-1 min-h-[44px] rounded-xl bg-red-600 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60 transition-colors">
                Ja, verwijder “{location!.name}”
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} disabled={busy}
                className="flex-1 min-h-[44px] rounded-xl border border-white/10 text-sm text-slate-300 hover:bg-white/5 transition-colors">
                Toch niet
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl px-3 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors">
              <Trash2 size={15} /> Locatie verwijderen
            </button>
          )}
        </div>
      )}
    </Sheet>
  );
}
