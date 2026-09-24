import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, ZoomControl } from 'react-leaflet';
import { ChevronDown, X, Plus, Pencil, MapPinPlus } from 'lucide-react';
import MapAttributionNl from '@components/MapAttributionNl';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@context/AuthContext';
import SceneLocationForm from '@components/SceneLocationForm';
import type { SceneLocation } from '@services/sceneLocationService';

// Fix Leaflet default icon broken paths in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Keeps the map locked to the Netherlands — panning/zooming further out
// reaches tiles outside our basemap's coverage (shown as broken "API key
// required" tiles), so we hard-stop the viewport at the border instead.
const NL_BOUNDS: [[number, number], [number, number]] = [
  [50.4, 2.9],
  [53.8, 7.5],
];

const TYPE_COLORS: Record<string, string> = {
  'Pop/Heavy':        '#7c3aed',
  'Cultuur':          '#3b82f6',
  'Cultuurcentrum':   '#3b82f6',
  'Erfgoed':          '#a855f7',
  'Dorpshuis':        '#22c55e',
  'MFA':              '#06b6d4',
  'Maatschappij':     '#f59e0b',
  'Broedplaats':      '#ef4444',
  'Gemeenschapshuis': '#ec4899',
  'Koepel':           '#14b8a6',
  'Commercieel':      '#f97316',
  'Oefenruimte':      '#facc15',
};

/**
 * Legenda-groepen. Gebaseerd op de types die echt in scene_locations staan,
 * niet op een vaste lijst: de oude legenda had 7 regels voor 11 types, waardoor
 * Broedplaats, Commercieel en Koepel nergens stonden, en "Cultuurcentrum"
 * eigenlijk naar het type 'Cultuur' wees terwijl 'Cultuurcentrum' ook bestaat.
 * Als filter zou dat locaties onvindbaar maken.
 *
 * Een type dat hier niet in staat (bv. een nieuw type in de database) valt in
 * "Overig", zodat het nooit buiten het filter kan vallen.
 */
const LEGEND_GROUPS: { id: string; label: string; types: string[] }[] = [
  { id: 'pop',          label: 'Poppodium / Studio', types: ['Pop/Heavy'] },
  { id: 'oefenruimte',  label: 'Oefenruimte',        types: ['Oefenruimte'] },
  { id: 'cultuur',      label: 'Cultuurcentrum',     types: ['Cultuur', 'Cultuurcentrum'] },
  { id: 'erfgoed',      label: 'Erfgoed / Kerk',     types: ['Erfgoed'] },
  { id: 'dorpshuis',    label: 'Dorpshuis',          types: ['Dorpshuis'] },
  { id: 'sociaal',      label: 'Scouting / Sociaal', types: ['Maatschappij'] },
  { id: 'gemeenschap',  label: 'Gemeenschapshuis',   types: ['Gemeenschapshuis'] },
  { id: 'mfa',          label: 'Multifunctioneel',   types: ['MFA'] },
  { id: 'broedplaats',  label: 'Broedplaats',        types: ['Broedplaats'] },
  { id: 'commercieel',  label: 'Commercieel',        types: ['Commercieel'] },
  { id: 'koepel',       label: 'Koepelorganisatie',  types: ['Koepel'] },
];
const OTHER_GROUP = { id: 'overig', label: 'Overig', types: [] as string[] };
const OTHER_COLOR = '#94a3b8';

function groupOf(type: string): string {
  return LEGEND_GROUPS.find(g => g.types.includes(type))?.id ?? OTHER_GROUP.id;
}

function getColor(type: string) {
  // Onbekende types krijgen dezelfde kleur als "Overig" in de legenda, zodat
  // een marker altijd terug te vinden is in de legenda.
  return TYPE_COLORS[type] ?? OTHER_COLOR;
}

function groupColor(id: string) {
  const g = LEGEND_GROUPS.find(x => x.id === id);
  return g ? getColor(g.types[0]) : OTHER_COLOR;
}

/** Zoomt naar de zichtbare markers als het filter verandert; bij "alles" terug
 *  naar heel Nederland. Doet niets bij het eerste laden. */
function FitToVisible({ points, active }: { points: [number, number][]; active: string | null }) {
  const map = useMap();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!active || points.length === 0) { map.flyToBounds(NL_BOUNDS, { duration: 0.6 }); return; }
    if (points.length === 1) { map.flyTo(points[0], 11, { duration: 0.6 }); return; }
    map.flyToBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 11, duration: 0.6 });
    // Alleen reageren op een ándere keuze, niet op elke nieuwe array.
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function createLocationIcon(type: string) {
  const color = getColor(type);
  return L.divIcon({
    className: '',
    html: `<div style="
      width:22px;height:22px;
      background:${color};
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      border:2px solid rgba(255,255,255,0.5);
      box-shadow:0 2px 8px rgba(0,0,0,0.6);
    "></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
    popupAnchor: [0, -22],
  });
}

function ZoomTracker({ onZoom }: { onZoom: (z: number) => void }) {
  const map = useMapEvents({ zoomend: () => onZoom(map.getZoom()) });
  return null;
}

// Keuzes in het formulier: één type per legendagroep, met de legendanaam.
export const TYPE_OPTIONS = LEGEND_GROUPS.map(g => ({ value: g.types[0], label: g.label }));

export default function SceneMap() {
  const { user } = useAuth();
  const isAdmin = !!user?.isAdmin;
  // null = dicht, 'new' = toevoegen (admin), 'submit' = aanmelden (iedereen),
  // anders de locatie die bewerkt wordt.
  const [editing, setEditing] = useState<SceneLocation | 'new' | 'submit' | null>(null);
  const [zoom, setZoom] = useState(7);
  const [locations, setLocations] = useState<SceneLocation[]>([]);
  const [active, setActive] = useState<string | null>(null);
  // Op mobiel dichtgeklapt: elf regels zouden anders een groot deel van de kaart
  // afdekken. Op grotere schermen staat hij open.
  const [legendOpen, setLegendOpen] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 640px)').matches,
  );

  const groups = useMemo(() => {
    const counts = new Map<string, number>();
    for (const l of locations) counts.set(groupOf(l.type), (counts.get(groupOf(l.type)) ?? 0) + 1);
    return [...LEGEND_GROUPS, OTHER_GROUP]
      .map(g => ({ ...g, count: counts.get(g.id) ?? 0 }))
      .filter(g => g.count > 0);
  }, [locations]);

  const visible = useMemo(
    () => (active ? locations.filter(l => groupOf(l.type) === active) : locations),
    [locations, active],
  );
  const activeLabel = groups.find(g => g.id === active)?.label;
  const toggle = (id: string) => setActive(cur => (cur === id ? null : id));

  useEffect(() => {
    supabase
      .from('scene_locations')
      .select('*')
      .not('lat', 'is', null)
      .limit(500)
      .then(({ data, error }) => {
        if (!error) setLocations((data ?? []) as SceneLocation[]);
      });
  }, []);

  const saved = (row: SceneLocation) => setLocations(ls =>
    ls.some(l => l.id === row.id) ? ls.map(l => (l.id === row.id ? row : l)) : [...ls, row]);
  const removed = (id: number) => setLocations(ls => ls.filter(l => l.id !== id));

  return (
    <>
    <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-violet-500/25 bg-violet-600/10 px-4 py-3">
      <p className="flex-1 text-sm text-violet-200">
        Heb je een oefenruimte, podium of zaal? Zet hem op de kaart zodat muzikanten je kunnen vinden.
      </p>
      <div className="flex flex-wrap gap-2 shrink-0">
        <button type="button" onClick={() => setEditing('submit')}
          className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-violet-400/40 bg-violet-600/20 px-4 text-sm font-semibold text-white hover:bg-violet-600/35 transition-colors">
          <MapPinPlus size={16} /> Meld je locatie aan
        </button>
        {isAdmin && (
          <button type="button" onClick={() => setEditing('new')}
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 hover:bg-violet-500 active:scale-[0.98] transition-[background-color,transform]">
            <Plus size={16} strokeWidth={2.5} /> Locatie toevoegen
          </button>
        )}
      </div>
    </div>
    <div className="relative rounded-2xl overflow-hidden border border-white/10 scene-map-wrapper" style={{ height: '540px' }}>
      {/* Hint */}
      <div className="absolute top-3 left-3 z-10 bg-[#231d3a]/90 backdrop-blur-sm border border-white/10 text-xs text-slate-400 px-3 py-2 rounded-lg pointer-events-none">
        {locations.length === 0
          ? '🗺️ Kaart laden...'
          : active
            ? `🎵 ${visible.length} van ${locations.length} locaties — ${activeLabel}`
            : `🎵 ${locations.length} locaties — klik een marker voor details`}
      </div>

      {/* Legenda — tegelijk het filter. Klik een type om alleen dat type te
          tonen; nog eens klikken of "Alles tonen" zet het terug. */}
      <div className="absolute bottom-3 right-3 z-10 max-w-[calc(100%-1.5rem)] bg-[#231d3a]/95 backdrop-blur-sm border border-white/10 rounded-xl shadow-xl">
        <button
          type="button"
          onClick={() => setLegendOpen(o => !o)}
          aria-expanded={legendOpen}
          aria-controls="kaart-legenda"
          className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
        >
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Legenda</span>
          {active && !legendOpen && (
            <span className="flex min-w-0 items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: groupColor(active) }} />
              <span className="truncate">{activeLabel}</span>
            </span>
          )}
          <ChevronDown size={14} className={`ml-auto shrink-0 text-slate-400 transition-transform ${legendOpen ? 'rotate-180' : ''}`} />
        </button>
        {legendOpen && (
          <div id="kaart-legenda" className="px-2 pb-2">
            <ul className="max-h-[260px] overflow-y-auto overscroll-contain space-y-0.5" aria-label="Filter op type locatie">
              {groups.map(g => {
                const on = active === g.id;
                const dim = active !== null && !on;
                return (
                  <li key={g.id}>
                    <button
                      type="button"
                      onClick={() => toggle(g.id)}
                      aria-pressed={on}
                      className={`flex w-full min-h-[34px] items-center gap-2 rounded-lg px-2 text-left transition-colors ${
                        on ? 'bg-white/10' : 'hover:bg-white/5'
                      } ${dim ? 'opacity-45' : ''}`}
                    >
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: groupColor(g.id) }} />
                      <span className="flex-1 text-xs text-slate-200">{g.label}</span>
                      <span className="text-[11px] tabular-nums text-slate-500">{g.count}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {active && (
              <button
                type="button"
                onClick={() => setActive(null)}
                className="mt-1 flex w-full min-h-[34px] items-center justify-center gap-1.5 rounded-lg border border-white/10 text-xs font-medium text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
              >
                <X size={12} /> Alles tonen
              </button>
            )}
          </div>
        )}
      </div>

      <MapContainer
        center={[52.3, 5.3]}
        zoom={7}
        minZoom={7}
        maxZoom={16}
        maxBounds={NL_BOUNDS}
        maxBoundsViscosity={1.0}
        style={{ height: '100%', width: '100%', background: '#1a1528' }}
        zoomControl={false}
        scrollWheelZoom={true}
      >
        <ZoomControl position="topright" />
        <ZoomTracker onZoom={setZoom} />

        <MapAttributionNl />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          subdomains="abcd"
          maxZoom={19}
        />

        <FitToVisible points={visible.map(l => [l.lat, l.lng] as [number, number])} active={active} />

        {visible.map(loc => (
          <Marker
            key={loc.id}
            position={[loc.lat, loc.lng]}
            icon={createLocationIcon(loc.type)}
          >
            <Popup closeButton={false}>
              <div style={{
                background: '#231d3a',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '12px',
                fontFamily: 'Space Grotesk, sans-serif',
                color: '#f1f5f9',
                minWidth: '200px',
                maxWidth: '240px',
              }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#fff', marginBottom: '6px', lineHeight: '1.3' }}>
                  {loc.name}
                </div>
                <span style={{
                  display: 'inline-block',
                  background: `${getColor(loc.type)}25`,
                  color: getColor(loc.type),
                  fontSize: '10px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '20px',
                  marginBottom: '8px',
                }}>
                  {loc.type}
                </span>
                {loc.address && (
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{loc.address}</div>
                )}
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                  {loc.city}{loc.province && loc.province !== loc.city ? `, ${loc.province}` : ''}
                </div>
                {loc.notes && (
                  <div style={{ fontSize: '11px', color: '#8b5cf6', marginTop: '6px', lineHeight: '1.4' }}>
                    {loc.notes}
                  </div>
                )}
                {loc.description && (
                  <Link
                    to={`/dutch-scene/locatie/${loc.id}`}
                    style={{
                      display: 'block',
                      marginTop: '10px',
                      background: '#7c3aed',
                      color: '#fff',
                      borderRadius: '8px',
                      padding: '7px 0',
                      fontSize: '12px',
                      fontWeight: 600,
                      textAlign: 'center',
                      textDecoration: 'none',
                    }}
                  >
                    Meer info →
                  </Link>
                )}
                {loc.website && (
                  <a
                    href={loc.website.startsWith('http') ? loc.website : `https://${loc.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'block',
                      marginTop: '10px',
                      background: loc.description ? 'rgba(255,255,255,0.08)' : '#7c3aed',
                      color: loc.description ? '#f1f5f9' : '#fff',
                      borderRadius: '8px',
                      padding: '7px 0',
                      fontSize: '12px',
                      fontWeight: 600,
                      textAlign: 'center',
                      textDecoration: 'none',
                    }}
                  >
                    Website bekijken →
                  </a>
                )}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setEditing(loc)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      width: '100%', marginTop: '8px', padding: '7px 0', borderRadius: '8px',
                      background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
                      color: '#cbd5e1', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    <Pencil size={12} /> Bewerken
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <style>{`
        .scene-map-wrapper { position: relative; z-index: 0; }
        .scene-map-wrapper .leaflet-pane,
        .scene-map-wrapper .leaflet-top,
        .scene-map-wrapper .leaflet-bottom,
        .scene-map-wrapper .leaflet-control { z-index: auto !important; }
        .scene-map-wrapper .leaflet-map-pane     { z-index: 0 !important; }
        .scene-map-wrapper .leaflet-tile-pane    { z-index: 1 !important; }
        .scene-map-wrapper .leaflet-overlay-pane { z-index: 2 !important; }
        .scene-map-wrapper .leaflet-shadow-pane  { z-index: 3 !important; }
        .scene-map-wrapper .leaflet-marker-pane  { z-index: 4 !important; }
        .scene-map-wrapper .leaflet-tooltip-pane { z-index: 5 !important; }
        .scene-map-wrapper .leaflet-popup-pane   { z-index: 6 !important; }
        .scene-map-wrapper .leaflet-top,
        .scene-map-wrapper .leaflet-bottom       { z-index: 7 !important; }
        .leaflet-popup-content-wrapper { background: transparent !important; box-shadow: none !important; border: none !important; padding: 0 !important; }
        .leaflet-popup-content         { margin: 0 !important; }
        .leaflet-popup-tip-container   { display: none !important; }
        .leaflet-container { font-family: Space Grotesk, sans-serif; }
        .leaflet-control-zoom a { background: #231d3a !important; color: #f1f5f9 !important; border-color: rgba(255,255,255,0.1) !important; }
        .leaflet-control-zoom a:hover { background: #38325f !important; color: #7c3aed !important; }
        .leaflet-control-attribution { background: rgba(10,14,26,0.8) !important; color: #475569 !important; font-size: 9px !important; }
        .leaflet-control-attribution a { color: #7c3aed !important; }
      `}</style>
    </div>
    {editing && (
      <SceneLocationForm
        mode={editing === 'submit' ? 'public' : 'admin'}
        location={editing === 'new' || editing === 'submit' ? null : editing}
        typeOptions={TYPE_OPTIONS}
        existing={locations}
        onClose={() => setEditing(null)}
        onSaved={saved}
        onDeleted={removed}
      />
    )}
    </>
  );
}
