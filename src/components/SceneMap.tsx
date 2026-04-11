import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, ZoomControl } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';

// Fix Leaflet default icon broken paths in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// City scenes — zoom level 7-8 shows these clustered
const cityScenes = [
  {
    id: 'amsterdam',
    name: 'Amsterdam',
    lat: 52.3676,
    lng: 4.9041,
    sceneCount: 14,
    genres: ['Jazz', 'Elektronisch', 'Indie', 'Nederpop'],
    artists: ['Jacco Gardner', 'Klangstof'],
    venues: ['Paradiso', 'Melkweg', 'Bimhuis', 'Shelter', 'AFAS Live'],
    description: 'De grootste en meest diverse muziekscene van Nederland. Thuisbasis van wereldklasse jazz, underground elektronisch en een bruisende indiepopcultuur.',
    color: '#7c3aed',
  },
  {
    id: 'rotterdam',
    name: 'Rotterdam',
    lat: 51.9225,
    lng: 4.4792,
    sceneCount: 10,
    genres: ['Hip-Hop', 'Techno', 'House', 'Bluesrock'],
    artists: ['Frenna', 'Canal Soundsystem'],
    venues: ['Boomtown', 'Baroeg', 'Maassilo', 'LantarenVenster'],
    description: 'Rauw en authentiek. Rotterdam heeft de stoerste hiphop- en techno-scene van het land, geworteld in arbeidersklassetrots en havenenergie.',
    color: '#3b82f6',
  },
  {
    id: 'denhaag',
    name: 'Den Haag',
    lat: 52.0705,
    lng: 4.3007,
    sceneCount: 7,
    genres: ['Nederpop', 'Indie Pop', 'Punk', 'Singer-Songwriter'],
    artists: ['Eefje de Visser'],
    venues: ['Paard', 'Amare', 'De Centrale'],
    description: 'De Hofstad heeft altijd een eigen, eigenwijze popcultuur gehad. Van de vroege Nederpopbeweging tot de hedendaagse indiescene.',
    color: '#a855f7',
  },
  {
    id: 'utrecht',
    name: 'Utrecht',
    lat: 52.0907,
    lng: 5.1214,
    sceneCount: 8,
    genres: ['Alternatieve Rock', 'Jazz', 'Indie', 'Folk'],
    artists: ['Kensington'],
    venues: ['Tivoli Vredenburg', 'De Helling', 'ACU', 'Ekko'],
    description: 'Studentenergie en serieuze muzikaliteit. Tivoli Vredenburg is een van de beste concertlocaties van Europa.',
    color: '#22c55e',
  },
  {
    id: 'nijmegen',
    name: 'Nijmegen',
    lat: 51.8426,
    lng: 5.8546,
    sceneCount: 5,
    genres: ['Bluesrock', 'Post-Punk', 'Metal', 'Alternatief'],
    artists: ['DeWolff'],
    venues: ['Doornroosje', 'De Vereeniging', 'Merleyn'],
    description: 'Nijmegen presteert ver boven zijn gewichtsklasse. Blues, rock en postpunk domineren de lokale podia.',
    color: '#ef4444',
  },
  {
    id: 'tilburg',
    name: 'Tilburg',
    lat: 51.5555,
    lng: 5.0913,
    sceneCount: 6,
    genres: ['Metal', 'Punk', 'Elektronisch', 'Hardcore'],
    artists: [],
    venues: ['013', 'Little Devil', 'Roadburn Festival'],
    description: 'Thuisbasis van 013 en het legendarische Roadburn Festival. Tilburgs metal- en punkverleden voedt een avontuurlijke muziekscene.',
    color: '#f59e0b',
  },
  {
    id: 'groningen',
    name: 'Groningen',
    lat: 53.2194,
    lng: 6.5665,
    sceneCount: 5,
    genres: ['Indie', 'Folk', 'Pop', 'Elektronisch'],
    artists: [],
    venues: ['Vera', 'De Oosterpoort', 'Paradigm'],
    description: 'Een levendige studentenscene met Vera als cultureel hart. Groningen staat bekend om zijn toegankelijke, open muziekcultuur.',
    color: '#06b6d4',
  },
  {
    id: 'eindhoven',
    name: 'Eindhoven',
    lat: 51.4416,
    lng: 5.4697,
    sceneCount: 4,
    genres: ['Elektronisch', 'Metal', 'Indie', 'Experimenteel'],
    artists: [],
    venues: ['Effenaar', 'Dynamo', 'Muziekgebouw Eindhoven'],
    description: 'Design en technologie bepalen de sfeer in Eindhoven. De Effenaar is een van de meest gerespecteerde podia van het land.',
    color: '#ec4899',
  },
];

// Detailed venue markers — visible at zoom 10+
const venueMarkers = [
  { id: 'paradiso', name: 'Paradiso', lat: 52.3626, lng: 4.8823, type: 'podium', city: 'Amsterdam', capacity: 1500 },
  { id: 'melkweg', name: 'Melkweg', lat: 52.3640, lng: 4.8831, type: 'podium', city: 'Amsterdam', capacity: 700 },
  { id: 'bimhuis', name: 'Bimhuis', lat: 52.3770, lng: 4.9126, type: 'jazzclub', city: 'Amsterdam', capacity: 300 },
  { id: 'shelter', name: 'Shelter', lat: 52.3980, lng: 4.8730, type: 'club', city: 'Amsterdam', capacity: 500 },
  { id: 'boomtown', name: 'Boomtown', lat: 51.9050, lng: 4.4720, type: 'club', city: 'Rotterdam', capacity: 3000 },
  { id: 'baroeg', name: 'Baroeg', lat: 51.9200, lng: 4.5000, type: 'podium', city: 'Rotterdam', capacity: 700 },
  { id: 'paard', name: 'Paard', lat: 52.0780, lng: 4.3100, type: 'podium', city: 'Den Haag', capacity: 1200 },
  { id: 'vredenburg', name: 'Tivoli Vredenburg', lat: 52.0920, lng: 5.1130, type: 'concertzaal', city: 'Utrecht', capacity: 5000 },
  { id: 'doornroosje', name: 'Doornroosje', lat: 51.8470, lng: 5.8600, type: 'podium', city: 'Nijmegen', capacity: 1000 },
  { id: '013', name: '013', lat: 51.5600, lng: 5.0870, type: 'podium', city: 'Tilburg', capacity: 5000 },
  { id: 'vera', name: 'Vera', lat: 53.2190, lng: 6.5540, type: 'club', city: 'Groningen', capacity: 250 },
  { id: 'effenaar', name: 'Effenaar', lat: 51.4380, lng: 5.4820, type: 'podium', city: 'Eindhoven', capacity: 1500 },
];

const typeColors = {
  podium: '#7c3aed',
  club: '#3b82f6',
  jazzclub: '#a855f7',
  concertzaal: '#22c55e',
};

function createCityIcon(scene, isSelected) {
  const size = Math.max(40, 30 + scene.sceneCount * 1.5);
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${scene.color};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 3px solid ${isSelected ? '#fff' : 'rgba(255,255,255,0.3)'};
        box-shadow: 0 0 0 ${isSelected ? '4px' : '0px'} ${scene.color}60, 0 4px 15px rgba(0,0,0,0.5);
        cursor: pointer;
        transition: all 0.2s;
        font-family: Inter, sans-serif;
      ">
        <div style="text-align: center;">
          <div style="font-size: 14px; font-weight: 700; color: white; line-height: 1;">${scene.sceneCount}</div>
          <div style="font-size: 7px; color: rgba(255,255,255,0.8); font-weight: 500; line-height: 1; margin-top: 1px;">venues</div>
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2) - 5],
  });
}

function createVenueIcon(venue) {
  const color = typeColors[venue.type] || '#7c3aed';
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: 28px;
        height: 28px;
        background: ${color};
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid rgba(255,255,255,0.4);
        box-shadow: 0 3px 10px rgba(0,0,0,0.5);
      "></div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
}

function MapController({ onZoomChange, onMapReady }) {
  const map = useMapEvents({
    zoomend: () => onZoomChange(map.getZoom()),
    moveend: () => onZoomChange(map.getZoom()),
  });
  useEffect(() => { onMapReady(map); }, [map]);
  return null;
}

export default function SceneMap() {
  const [zoom, setZoom] = useState(7);
  const [selectedCity, setSelectedCity] = useState(null);
  const [mapInstance, setMapInstance] = useState(null);
  const navigate = useNavigate();

  const showVenues = zoom >= 10;
  const showCities = zoom < 10;

  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/10" style={{ height: '520px' }}>
      {/* Zoom hint */}
      <div className="absolute top-3 left-3 z-[1000] bg-[#231d3a]/90 backdrop-blur-sm border border-white/10 text-xs text-slate-400 px-3 py-2 rounded-lg pointer-events-none">
        {showVenues ? '🎵 Klik op een podium voor meer info' : '🔍 Klik op een stad om in te zoomen'}
      </div>

      {/* Legenda */}
      <div className="absolute bottom-3 right-3 z-[1000] bg-[#231d3a]/90 backdrop-blur-sm border border-white/10 rounded-xl p-3">
        <p className="text-xs text-slate-400 font-semibold mb-2 uppercase tracking-wider">Legenda</p>
        {showCities ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-violet-600 flex items-center justify-center">
                <span className="text-white text-[8px] font-bold">N</span>
              </div>
              <span className="text-xs text-slate-300">Aantal venues</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Groter = meer venues</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {Object.entries({ podium: 'Podium', club: 'Club / Bar', jazzclub: 'Jazzclub', concertzaal: 'Concertzaal' }).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: typeColors[k] }} />
                <span className="text-xs text-slate-300">{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <MapContainer
        center={[52.3, 5.3]}
        zoom={7}
        minZoom={6}
        maxZoom={14}
        style={{ height: '100%', width: '100%', background: '#1a1528' }}
        zoomControl={false}
        scrollWheelZoom={true}
      >
        <ZoomControl position="topright" />
        <MapController onZoomChange={setZoom} onMapReady={setMapInstance} />

        {/* Donkere kaarttegels */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          subdomains="abcd"
          maxZoom={19}
        />

        {/* Stadsmarkeringen */}
        {showCities && cityScenes.map(scene => (
          <Marker
            key={scene.id}
            position={[scene.lat, scene.lng]}
            icon={createCityIcon(scene, selectedCity === scene.id)}
            eventHandlers={{
              click: () => {
                setSelectedCity(scene.id);
                if (mapInstance) {
                  mapInstance.flyTo([scene.lat, scene.lng], 12, { duration: 1.2 });
                }
              }
            }}
          />
        ))}

        {/* Podiummarkeringen bij inzoomen */}
        {showVenues && venueMarkers.map(venue => (
          <Marker
            key={venue.id}
            position={[venue.lat, venue.lng]}
            icon={createVenueIcon(venue)}
          >
            <Popup closeButton={false}>
              <div style={{
                background: '#231d3a',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '12px',
                fontFamily: 'Inter, sans-serif',
                color: '#f1f5f9',
                minWidth: '180px',
              }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#fff', marginBottom: '4px' }}>{venue.name}</div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ background: (typeColors[venue.type] || '#7c3aed') + '25', color: typeColors[venue.type] || '#7c3aed', fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px', textTransform: 'capitalize' }}>{venue.type}</span>
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>{venue.city}</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Capaciteit: ~{venue.capacity.toLocaleString('nl-NL')}</div>
                <button
                  onClick={() => navigate(`/venue/${venue.id}`)}
                  style={{ marginTop: '10px', width: '100%', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '8px', padding: '7px 0', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
                >
                  Bekijk podium →
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Leaflet popup stijloverschrijving */}
      <style>{`
        .leaflet-popup-content-wrapper {
          background: transparent !important;
          box-shadow: none !important;
          border: none !important;
          padding: 0 !important;
        }
        .leaflet-popup-content {
          margin: 0 !important;
        }
        .leaflet-popup-tip-container {
          display: none !important;
        }
        .leaflet-container {
          font-family: Inter, sans-serif;
        }
        .leaflet-control-zoom a {
          background: #231d3a !important;
          color: #f1f5f9 !important;
          border-color: rgba(255,255,255,0.1) !important;
        }
        .leaflet-control-zoom a:hover {
          background: #38325f !important;
          color: #7c3aed !important;
        }
        .leaflet-control-attribution {
          background: rgba(10,14,26,0.8) !important;
          color: #475569 !important;
          font-size: 9px !important;
        }
        .leaflet-control-attribution a {
          color: #7c3aed !important;
        }
      `}</style>
    </div>
  );
}
