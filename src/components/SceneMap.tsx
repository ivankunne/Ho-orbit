import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import { supabase } from '@/lib/supabase';

// Fix Leaflet default icon broken paths in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface SceneLocation {
  id: number;
  province: string;
  city: string;
  name: string;
  address: string;
  type: string;
  website: string;
  notes: string;
  lat: number;
  lng: number;
}

// Type → colour mapping
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
};

const LEGEND_TYPES = [
  ['Pop/Heavy',        'Poppodium / Studio'],
  ['Cultuur',          'Cultuurcentrum'],
  ['Erfgoed',          'Erfgoed / Kerk'],
  ['Dorpshuis',        'Dorpshuis'],
  ['Gemeenschapshuis', 'Gemeenschapshuis'],
  ['Maatschappij',     'Scouting / Sociaal'],
  ['MFA',              'Multifunctioneel'],
];

function getColor(type: string) {
  return TYPE_COLORS[type] ?? '#7c3aed';
}

// City scenes — shown at zoom < 10
const cityScenes = [
  { id: 'amsterdam',  name: 'Amsterdam',  lat: 52.3676, lng: 4.9041,  count: 3,  color: '#7c3aed' },
  { id: 'rotterdam',  name: 'Rotterdam',  lat: 51.9225, lng: 4.4792,  count: 3,  color: '#3b82f6' },
  { id: 'denhaag',    name: 'Den Haag',   lat: 52.0705, lng: 4.3007,  count: 2,  color: '#a855f7' },
  { id: 'utrecht',    name: 'Utrecht',    lat: 52.0907, lng: 5.1214,  count: 4,  color: '#22c55e' },
  { id: 'nijmegen',   name: 'Nijmegen',   lat: 51.8426, lng: 5.8546,  count: 2,  color: '#ef4444' },
  { id: 'tilburg',    name: 'Tilburg',    lat: 51.5555, lng: 5.0913,  count: 1,  color: '#f59e0b' },
  { id: 'groningen',  name: 'Groningen',  lat: 53.2194, lng: 6.5665,  count: 4,  color: '#06b6d4' },
  { id: 'eindhoven',  name: 'Eindhoven',  lat: 51.4416, lng: 5.4697,  count: 2,  color: '#ec4899' },
  { id: 'enschede',   name: 'Enschede',   lat: 52.2215, lng: 6.8937,  count: 3,  color: '#14b8a6' },
  { id: 'leeuwarden', name: 'Leeuwarden', lat: 53.2012, lng: 5.7999,  count: 2,  color: '#f97316' },
  { id: 'maastricht', name: 'Maastricht', lat: 50.8514, lng: 5.6909,  count: 2,  color: '#a855f7' },
  { id: 'zwolle',     name: 'Zwolle',     lat: 52.5168, lng: 6.0830,  count: 2,  color: '#7c3aed' },
  { id: 'arnhem',     name: 'Arnhem',     lat: 51.9851, lng: 5.8987,  count: 1,  color: '#22c55e' },
  { id: 'breda',      name: 'Breda',      lat: 51.5719, lng: 4.7683,  count: 2,  color: '#3b82f6' },
];

function createCityIcon(scene: typeof cityScenes[0], isSelected: boolean) {
  const size = Math.max(38, 28 + scene.count * 3);
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:${size}px;height:${size}px;
        background:${scene.color};border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        border:3px solid ${isSelected ? '#fff' : 'rgba(255,255,255,0.3)'};
        box-shadow:0 0 0 ${isSelected ? '4px' : '0px'} ${scene.color}60,0 4px 15px rgba(0,0,0,0.5);
        cursor:pointer;font-family:Space Grotesk,sans-serif;
      ">
        <div style="text-align:center;">
          <div style="font-size:13px;font-weight:700;color:white;line-height:1;">${scene.count}</div>
          <div style="font-size:7px;color:rgba(255,255,255,0.8);font-weight:500;line-height:1;margin-top:1px;">spots</div>
        </div>
      </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2) - 5],
  });
}

function createLocationIcon(loc: SceneLocation) {
  const color = getColor(loc.type);
  return L.divIcon({
    className: '',
    html: `<div style="
      width:28px;height:28px;
      background:${color};
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      border:2px solid rgba(255,255,255,0.4);
      box-shadow:0 3px 10px rgba(0,0,0,0.5);
    "></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
}

function MapController({ onZoomChange, onMapReady }: { onZoomChange: (z: number) => void; onMapReady: (m: any) => void }) {
  const map = useMapEvents({
    zoomend: () => onZoomChange(map.getZoom()),
    moveend: () => onZoomChange(map.getZoom()),
  });
  useEffect(() => { onMapReady(map); }, [map]);
  return null;
}

export default function SceneMap() {
  const [zoom, setZoom] = useState(7);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [locations, setLocations] = useState<SceneLocation[]>([]);

  useEffect(() => {
    supabase
      .from('scene_locations')
      .select('*')
      .not('lat', 'is', null)
      .then(({ data }) => setLocations((data ?? []) as SceneLocation[]));
  }, []);

  const showVenues = zoom >= 10;
  const showCities = zoom < 10;

  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/10 scene-map-wrapper" style={{ height: '540px' }}>
      {/* Hint */}
      <div className="absolute top-3 left-3 z-10 bg-[#231d3a]/90 backdrop-blur-sm border border-white/10 text-xs text-slate-400 px-3 py-2 rounded-lg pointer-events-none">
        {showVenues
          ? `🎵 ${locations.length > 0 ? `${locations.length} locaties` : 'Klik op een marker'} — klik voor details`
          : '🔍 Zoom in op een stad om alle locaties te zien'}
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 right-3 z-10 bg-[#231d3a]/90 backdrop-blur-sm border border-white/10 rounded-xl p-3 max-h-60 overflow-y-auto">
        <p className="text-xs text-slate-400 font-semibold mb-2 uppercase tracking-wider">Legenda</p>
        {showCities ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-violet-600 flex items-center justify-center">
                <span className="text-white text-[8px] font-bold">N</span>
              </div>
              <span className="text-xs text-slate-300">Aantal locaties</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Groter = meer locaties</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {LEGEND_TYPES.map(([key, label]) => (
              <div key={key} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: getColor(key) }} />
                <span className="text-xs text-slate-300">{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <MapContainer
        center={[52.3, 5.3]}
        zoom={7}
        minZoom={6}
        maxZoom={16}
        style={{ height: '100%', width: '100%', background: '#1a1528' }}
        zoomControl={false}
        scrollWheelZoom={true}
      >
        <ZoomControl position="topright" />
        <MapController onZoomChange={setZoom} onMapReady={setMapInstance} />

        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          subdomains="abcd"
          maxZoom={19}
        />

        {/* City bubbles */}
        {showCities && cityScenes.map(scene => (
          <Marker
            key={scene.id}
            position={[scene.lat, scene.lng]}
            icon={createCityIcon(scene, selectedCity === scene.id)}
            eventHandlers={{
              click: () => {
                setSelectedCity(scene.id);
                mapInstance?.flyTo([scene.lat, scene.lng], 12, { duration: 1.2 });
              },
            }}
          />
        ))}

        {/* Individual location markers from DB */}
        {showVenues && locations.map(loc => (
          <Marker
            key={loc.id}
            position={[loc.lat, loc.lng]}
            icon={createLocationIcon(loc)}
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
                {loc.website && (
                  <a
                    href={loc.website.startsWith('http') ? loc.website : `https://${loc.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
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
                    Website bekijken →
                  </a>
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
        .scene-map-wrapper .leaflet-map-pane  { z-index: 0 !important; }
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
  );
}
