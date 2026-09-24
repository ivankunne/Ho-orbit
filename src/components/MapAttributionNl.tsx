import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

/**
 * Leaflet zet standaard een Engelstalige tooltip op zijn eigen bronvermelding
 * ("A JavaScript library for interactive maps"). De vermelding zelf blijft
 * staan — alleen de tekst wordt Nederlands. De verplichte vermeldingen van
 * OpenStreetMap staat los hiervan op DarkTileLayer.
 */
export default function MapAttributionNl() {
  const map = useMap();
  useEffect(() => {
    map.attributionControl?.setPrefix(
      '<a href="https://leafletjs.com" title="Leaflet — open-source kaartbibliotheek" target="_blank" rel="noopener noreferrer">Leaflet</a>',
    );
  }, [map]);
  return null;
}
