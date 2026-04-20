import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
const rehearsalSpaceCities = [];
const rehearsalSpaceMarkers = [];

// Fix Leaflet default icon broken paths in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const typeColors = {
  'Repetitieruimte': '#8b5cf6',
  'Studio': '#06b6d4',
  'Jamspace': '#10b981',
};

function createCityIcon(city, isSelected) {
  const size = Math.max(40, 30 + city.spaceCount * 2);
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${city.color};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 3px solid ${isSelected ? '#fff' : 'rgba(255,255,255,0.3)'};
        box-shadow: 0 0 0 ${isSelected ? '4px' : '0px'} ${city.color}60, 0 4px 15px rgba(0,0,0,0.5);
        cursor: pointer;
        transition: all 0.2s;
        font-family: Inter, sans-serif;
      ">
        <div style="text-align: center;">
          <div style="font-size: 14px; font-weight: 700; color: white; line-height: 1;">${city.spaceCount}</div>
          <div style="font-size: 7px; color: rgba(255,255,255,0.8); font-weight: 500; line-height: 1; margin-top: 1px;">spaces</div>
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2) - 5],
  });
}

function createSpaceIcon(space) {
  const color = typeColors[space.type] || '#8b5cf6';
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

export default function SpacesMap() {
  const [zoom, setZoom] = useState(7);
  const [selectedCity, setSelectedCity] = useState(null);
  const [mapInstance, setMapInstance] = useState(null);

  const showSpaces = zoom >= 10;
  const showCities = zoom < 10;

  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/10" style={{ height: '520px' }}>
      {/* Zoom hint */}
      <div className="absolute top-3 left-3 z-[1000] bg-[#231d3a]/90 backdrop-blur-sm border border-white/10 text-xs text-slate-400 px-3 py-2 rounded-lg pointer-events-none">
        {showSpaces ? '🎵 Klik op een ruimte voor meer info' : '🔍 Klik op een stad om in te zoomen'}
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
              <span className="text-xs text-slate-300">Aantal ruimtes</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Groter = meer ruimtes</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {Object.entries({ 'Repetitieruimte': 'Repetitieruimte', 'Studio': 'Studio', 'Jamspace': 'Jamspace' }).map(([k, v]) => (
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
        {showCities && rehearsalSpaceCities.map(city => (
          <Marker
            key={city.id}
            position={[city.lat, city.lng]}
            icon={createCityIcon(city, selectedCity === city.id)}
            eventHandlers={{
              click: () => {
                setSelectedCity(city.id);
                if (mapInstance) {
                  mapInstance.flyTo([city.lat, city.lng], 12, { duration: 1.2 });
                }
              }
            }}
          />
        ))}

        {/* Ruimtemarkeringen bij inzoomen */}
        {showSpaces && rehearsalSpaceMarkers.map(space => (
          <Marker
            key={space.id}
            position={[space.lat, space.lng]}
            icon={createSpaceIcon(space)}
          >
            <Popup closeButton={false}>
              <div style={{
                background: '#231d3a',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '12px',
                fontFamily: 'Inter, sans-serif',
                color: '#f1f5f9',
                minWidth: '200px',
              }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#fff', marginBottom: '4px' }}>{space.name}</div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ background: (typeColors[space.type] || '#8b5cf6') + '25', color: typeColors[space.type] || '#8b5cf6', fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px' }}>{space.type}</span>
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>{space.city}</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '2px' }}>€{space.pricePerHour}/uur</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>⭐ {space.rating} ({space.reviews} reviews)</div>
                <button
                  style={{ width: '100%', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '8px', padding: '7px 0', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
                >
                  Meer info →
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
