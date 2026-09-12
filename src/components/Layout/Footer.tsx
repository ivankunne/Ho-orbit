import { Link } from 'react-router-dom';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto border-t border-white/5 py-5 px-4 lg:px-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
        <p>© {year} H-orbit. Alle rechten voorbehouden.</p>

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          {/* Statische publieke pagina's — gewone <a>'s, geen SPA-routes. */}
          <a href="/podia"            className="hover:text-slate-400 transition-colors">Podia in Nederland</a>
          <a href="/voor-artiesten"   className="hover:text-slate-400 transition-colors">Voor artiesten</a>
          <Link to="/privacy"      className="hover:text-slate-400 transition-colors">Privacybeleid</Link>
          <Link to="/voorwaarden"  className="hover:text-slate-400 transition-colors">Voorwaarden</Link>
          <Link to="/cookies"      className="hover:text-slate-400 transition-colors">Cookies</Link>
          <a href="mailto:info@h-orbit.nl" className="hover:text-slate-400 transition-colors">Contact</a>
        </div>

        <p>
          Made by{' '}
          <a
            href="https://frameflow.no"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-500 hover:text-slate-400 transition-colors"
          >
            frameflow.no
          </a>
        </p>
      </div>
    </footer>
  );
}
