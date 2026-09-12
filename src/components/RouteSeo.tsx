import { useLocation } from 'react-router-dom';
import Seo from '@components/Seo';
import { resolveRouteSeo } from '@lib/routeSeo';

/**
 * Zet de basis-<head> voor élke route uit één tabel. Staat bewust vóór
 * <Routes> in de boom: React voert effects in boomvolgorde uit, dus een
 * pagina die zelf een <Seo> rendert (artiest, evenement, artikel) overschrijft
 * deze waarden daarna — precies de bedoeling.
 */
export default function RouteSeo() {
  const { pathname } = useLocation();
  const seo = resolveRouteSeo(pathname);
  return <Seo title={seo.title} description={seo.description} path={pathname} noindex={seo.noindex} />;
}
