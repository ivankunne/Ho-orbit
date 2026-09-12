import { useAuthModal } from '@context/AuthModalContext';

/**
 * Staat op de plek waar een uitgelogde bezoeker anders niets zou zien: het
 * invoerveld van een reactie, een forumbericht, een aanmeldknop. Rondkijken
 * mag zonder account, meedoen niet — en dat is prettiger als het er staat dan
 * wanneer het vak stilzwijgend ontbreekt.
 */
export default function AuthPrompt({
  message = 'Maak een gratis account om mee te doen.',
  className = '',
}: {
  message?: string;
  className?: string;
}) {
  const { open } = useAuthModal();

  return (
    <div
      className={`rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3 ${className}`}
    >
      <p className="text-sm text-slate-400 flex-1 min-w-0">{message}</p>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => open('signup')}
          className="px-3.5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-colors"
        >
          Account maken
        </button>
        <button
          type="button"
          onClick={() => open('login')}
          className="px-3.5 py-2 rounded-lg border border-white/15 hover:border-white/30 text-slate-300 hover:text-white text-sm font-medium transition-colors"
        >
          Inloggen
        </button>
      </div>
    </div>
  );
}
