import { Link, useNavigate } from 'react-router-dom';
import { Music, Home, ArrowLeft, Search } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 text-center">
      {/* Big 404 */}
      <div className="relative mb-8 select-none">
        <p className="text-[120px] lg:text-[180px] font-black text-white/3 leading-none tracking-tighter">
          404
        </p>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 bg-violet-600/15 rounded-full flex items-center justify-center">
            <Music size={40} className="text-violet-400" />
          </div>
        </div>
      </div>

      <h1 className="text-2xl lg:text-3xl font-bold text-white mb-3">Pagina niet gevonden</h1>
      <p className="text-slate-400 text-base max-w-md mb-8 leading-relaxed">
        Deze pagina bestaat niet of is verplaatst. Misschien is het een rare remix?
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 bg-white/8 hover:bg-white/12 border border-white/10 text-white font-medium px-5 py-2.5 rounded-xl transition-colors"
        >
          <ArrowLeft size={16} /> Terug
        </button>
        <Link
          to="/"
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors"
        >
          <Home size={16} /> Naar de homepage
        </Link>
        <Link
          to="/artists"
          className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-medium px-5 py-2.5 rounded-xl transition-colors"
        >
          <Search size={16} /> Artiesten ontdekken
        </Link>
      </div>

      {/* Decorative waveform */}
      <div className="flex items-end gap-1 mt-12 opacity-10">
        {[20,45,80,35,60,90,25,70,50,85,30,65,40,75,55].map((h, i) => (
          <div
            key={i}
            className="w-3 bg-violet-500 rounded-full"
            style={{ height: `${h}px` }}
          />
        ))}
      </div>
    </div>
  );
}
