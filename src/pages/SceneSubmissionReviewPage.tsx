import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapContainer, Marker } from 'react-leaflet';
import DarkTileLayer from '@components/DarkTileLayer';
import L from 'leaflet';
import { Check, X, Loader2, MapPin, Globe, Mail, ArrowLeft } from 'lucide-react';
import { submissionAction, type Submission } from '@services/sceneLocationService';
import { TYPE_OPTIONS } from '@components/SceneMap';

const pin = L.divIcon({
  className: '',
  html: `<div style="width:26px;height:26px;background:#7c3aed;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.6)"></div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-3 py-2 border-b border-white/5 last:border-0 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words text-white">{children}</dd>
    </div>
  );
}

/**
 * Beoordeelpagina voor een aanmelding op de scenekaart. De link staat in de
 * mail aan de admins (edge function scene-submission); de token in de URL is
 * de toegang. Openen doet niets — pas een klik op Accepteren zet de plek op de
 * kaart, zodat een mailscanner die de link opent niets goedkeurt.
 */
export default function SceneSubmissionReviewPage() {
  const { token = '' } = useParams();
  const [s, setS] = useState<Submission | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [confirmReject, setConfirmReject] = useState(false);

  useEffect(() => {
    submissionAction('get', token).then(setS).catch(e => setError(e.message));
  }, [token]);

  async function act(action: 'approve' | 'reject') {
    setBusy(action); setError(null);
    try { setS(await submissionAction(action, token)); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(null); }
  }

  const typeLabel = s ? (TYPE_OPTIONS.find(o => o.value === s.type)?.label ?? s.type) : '';

  return (
    <div className="min-h-screen w-full max-w-2xl mx-auto px-4 py-8">
      <Link to="/dutch-scene" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-5">
        <ArrowLeft size={15} /> Naar de scenekaart
      </Link>
      <h1 className="text-2xl font-bold text-white mb-1">Aanmelding voor de kaart</h1>

      {!s && !error && (
        <div className="flex items-center gap-2 py-16 justify-center text-slate-400"><Loader2 size={18} className="animate-spin" /> Laden…</div>
      )}

      {error && !s && (
        <p className="mt-6 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>
      )}

      {s && (
        <>
          <p className="text-sm text-slate-400 mb-5">
            Aangemeld door {s.contact_name} op {new Date(s.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>

          {s.status === 'approved' && (
            <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              <p className="font-semibold text-emerald-100">Geaccepteerd — staat op de kaart</p>
              <p className="mt-0.5">{s.contact_name} heeft een bevestiging per e-mail gekregen. Iets aanpassen? Klik op de marker op de kaart → Bewerken.</p>
            </div>
          )}
          {s.status === 'rejected' && (
            <div className="mb-5 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
              Afgewezen — deze locatie komt niet op de kaart.
            </div>
          )}
          {s.status === 'pending' && s.expired && (
            <div className="mb-5 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
              Deze link is verlopen. Zet de locatie zo nodig zelf op de kaart met “Locatie toevoegen”.
            </div>
          )}

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
            <div className="h-52 border-b border-white/10">
              <MapContainer center={[s.lat, s.lng]} zoom={15} style={{ height: '100%', width: '100%', background: '#1a1528' }} scrollWheelZoom={false}>
                <DarkTileLayer />
                <Marker position={[s.lat, s.lng]} icon={pin} />
              </MapContainer>
            </div>
            <dl className="px-4 py-2">
              <Row label="Naam"><span className="font-semibold">{s.name}</span></Row>
              <Row label="Type">{typeLabel}</Row>
              {s.address && <Row label="Adres">{s.address}</Row>}
              <Row label="Plaats">{s.city}, {s.province}</Row>
              {s.website && (
                <Row label="Website">
                  <a href={`https://${s.website}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-violet-300 hover:text-violet-200">
                    <Globe size={13} /> {s.website}
                  </a>
                </Row>
              )}
              {s.notes && <Row label="Omschrijving">{s.notes}</Row>}
              {s.description && <Row label="Uitgebreid"><span className="whitespace-pre-line">{s.description}</span></Row>}
              <Row label="Contact">
                {s.contact_name}<br />
                <a href={`mailto:${s.contact_email}`} className="inline-flex items-center gap-1 text-violet-300 hover:text-violet-200"><Mail size={13} /> {s.contact_email}</a>
              </Row>
              {s.message && <Row label="Bericht"><span className="whitespace-pre-line">{s.message}</span></Row>}
            </dl>
          </div>

          <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500">
            <MapPin size={12} className="mt-0.5 shrink-0" />
            Controleer of de pin op de goede plek staat en of de website werkt. Na accepteren kun je alles nog aanpassen op de kaart.
          </p>

          {error && <p className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>}

          {s.status === 'pending' && !s.expired && (
            confirmReject ? (
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button type="button" onClick={() => act('reject')} disabled={!!busy}
                  className="flex-1 min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60 transition-colors">
                  {busy === 'reject' && <Loader2 size={16} className="animate-spin" />} Ja, afwijzen
                </button>
                <button type="button" onClick={() => setConfirmReject(false)} disabled={!!busy}
                  className="flex-1 min-h-[48px] rounded-xl border border-white/10 text-sm text-slate-300 hover:bg-white/5 transition-colors">
                  Toch niet
                </button>
              </div>
            ) : (
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button type="button" onClick={() => act('approve')} disabled={!!busy}
                  className="flex-1 min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60 transition-colors">
                  {busy === 'approve' ? <Loader2 size={16} className="animate-spin" /> : <Check size={17} />} Accepteren en op de kaart zetten
                </button>
                <button type="button" onClick={() => setConfirmReject(true)} disabled={!!busy}
                  className="sm:w-40 min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 text-sm font-medium text-slate-300 hover:bg-white/5 disabled:opacity-60 transition-colors">
                  <X size={16} /> Afwijzen
                </button>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
