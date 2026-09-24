import { TileLayer } from 'react-leaflet';

/**
 * De kaartachtergrond voor alle kaarten in de app.
 *
 * Tot september 2026 kwamen de tegels van CARTO (dark_all). CARTO geeft
 * zonder API-sleutel nu aan iedereen een tegel met het watermerk "API KEY
 * REQUIRED", ongeacht de site. Daarom de standaardtegels van OpenStreetMap:
 * gratis, zonder sleutel. Die zijn licht; de klasse `dark-tiles` (index.css)
 * maakt ze donker zodat ze bij de site passen.
 *
 * Gebruiksvoorwaarden OSM: bronvermelding verplicht (staat hieronder), geen
 * massaal downloaden. Groeit het verkeer flink, dan is een betaalde
 * tegeldienst met sleutel (bv. Stadia of MapTiler) de volgende stap — dan
 * hoeft alleen dit bestand te veranderen.
 */
export default function DarkTileLayer() {
  return (
    <TileLayer
      url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-bijdragers'
      className="dark-tiles"
      maxZoom={19}
    />
  );
}
