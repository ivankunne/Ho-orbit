import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Play, Clock, Eye, CheckCircle, RotateCcw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAppState } from '@context/AppStateContext';
import EmptyState from '@components/EmptyState';

const difficultyColors = {
  Beginner:  'bg-green-500/20 text-green-400',
  Gevorderd: 'bg-yellow-500/20 text-yellow-400',
  Expert:    'bg-red-500/20 text-red-400',
};

const allTags = ['Alles', 'Mixen', 'Opnemen', 'Masteren', 'Productie', 'Songschrijven', 'Ableton', 'Hip-Hop', 'Jazz', 'Nederpop'];

function formatViews(n) {
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
  return n.toString();
}

function ProgressRing({ pct, size = 20 }) {
  const r = (size - 4) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="white" strokeWidth="2" strokeOpacity="0.2" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="#8b5cf6" strokeWidth="2"
        strokeDasharray={`${(pct / 100) * circ} ${circ}`}
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function TutorialsPage() {
  const [activeTag, setActiveTag] = useState('Alles');
  const [activeDifficulty, setActiveDifficulty] = useState('Alles');
  const [tutorials, setTutorials] = useState([]);
  const { tutorialProgress, setTutorialWatched, clearTutorialProgress } = useAppState();

  useEffect(() => {
    supabase.from('tutorials').select('*').then(({ data }) => setTutorials(data ?? []));
  }, []);

  const filtered = useMemo(() =>
    tutorials.filter(t => {
      const tagMatch = activeTag === 'Alles' || t.tags.some(tag => tag.toLowerCase().includes(activeTag.toLowerCase()));
      const diffMatch = activeDifficulty === 'Alles' || t.difficulty === activeDifficulty;
      return tagMatch && diffMatch;
    }),
    [activeTag, activeDifficulty, tutorials]
  );

  const featured = tutorials[0];

  const inProgress = tutorials.filter(t => {
    const p = tutorialProgress[t.id];
    return p !== undefined && p > 0 && p < 100;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Tutorials</h1>
        <p className="text-slate-400">Leer produceren, mixen, opnemen en meer van de gemeenschap</p>
      </div>

      {/* Uitgelichte tutorial */}
      <Link to={`/tutorials/${featured.id}`} className="mb-10 group relative rounded-2xl overflow-hidden cursor-pointer block">
        <img src={featured.thumbnail_url} alt={featured.title} className="w-full h-64 lg:h-80 object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1528] via-[#1a1528]/50 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-16 h-16 bg-violet-600 rounded-full flex items-center justify-center">
            <Play size={28} className="text-white ml-1" fill="white" />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-violet-600 text-white text-xs font-bold px-2 py-0.5 rounded">UITGELICHT</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${difficultyColors[featured.difficulty]}`}>{featured.difficulty}</span>
          </div>
          <h2 className="text-xl lg:text-2xl font-bold text-white mb-1">{featured.title}</h2>
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <span>door {featured.instructor}</span>
            <span className="flex items-center gap-1"><Clock size={13} /> {featured.duration}</span>
            <span className="flex items-center gap-1"><Eye size={13} /> {formatViews(featured.views_count)} weergaven</span>
          </div>
        </div>
        <div className="absolute top-4 right-4 bg-black/60 text-white text-sm font-medium px-2 py-1 rounded-lg">
          {featured.duration}
        </div>
      </Link>

      {/* Verder kijken */}
      {inProgress.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-4">Verder kijken</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {inProgress.map(tutorial => {
              const pct = tutorialProgress[tutorial.id];
              return (
                <div key={tutorial.id} className="group bg-white/3 hover:bg-white/6 border border-white/5 rounded-xl overflow-hidden transition-all">
                  <Link to={`/tutorials/${tutorial.id}`} className="block">
                    <div className="relative aspect-video overflow-hidden">
                      <img src={tutorial.thumbnail_url} alt={tutorial.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <div className="w-10 h-10 bg-violet-600 rounded-full flex items-center justify-center">
                          <Play size={16} className="text-white ml-0.5" fill="white" />
                        </div>
                      </div>
                      {/* Progress overlay */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                        <div className="h-full bg-violet-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="absolute bottom-2.5 right-2 flex items-center gap-1.5 bg-black/70 rounded-full px-2 py-0.5">
                        <ProgressRing pct={pct} size={16} />
                        <span className="text-[10px] text-white font-medium">{pct}%</span>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-semibold text-white line-clamp-1">{tutorial.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">door {tutorial.instructor}</p>
                    </div>
                  </Link>
                  <div className="flex gap-2 px-3 pb-3">
                    <button
                      onClick={() => setTutorialWatched(tutorial.id)}
                      className="flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 bg-green-500/10 hover:bg-green-500/20 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <CheckCircle size={12} /> Markeer als bekeken
                    </button>
                    <button
                      onClick={() => clearTutorialProgress(tutorial.id)}
                      className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 hover:bg-white/5 px-2 py-1.5 rounded-lg transition-colors"
                    >
                      <RotateCcw size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-8">
        <div className="flex gap-2 flex-wrap">
          {['Alles', 'Beginner', 'Gevorderd', 'Expert'].map(d => (
            <button
              key={d}
              onClick={() => setActiveDifficulty(d)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeDifficulty === d
                  ? 'bg-violet-600 text-white'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="w-px bg-white/10" />
        <div className="flex gap-2 flex-wrap">
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeTag === tag
                  ? 'bg-blue-500/80 text-white'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/10'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Tutorial raster */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filtered.length === 0 && (
          <EmptyState
            title="Geen tutorials gevonden"
            subtitle="Er zijn geen tutorials die overeenkomen met deze filters. Probeer een andere moeilijkheidsgraad of tag."
            action={{ label: 'Filters wissen', onClick: () => { setActiveTag('Alles'); setActiveDifficulty('Alles'); } }}
          />
        )}
        {filtered.map(tutorial => {
          const pct = tutorialProgress[tutorial.id];
          const watched = pct === 100;
          const started = pct > 0 && pct < 100;
          return (
            <Link
              key={tutorial.id}
              to={`/tutorials/${tutorial.id}`}
              className="group bg-white/3 hover:bg-white/6 border border-white/5 rounded-xl overflow-hidden cursor-pointer transition-all hover:-translate-y-0.5 block"
            >
              <div className="relative aspect-video overflow-hidden">
                <img
                  src={tutorial.thumbnail_url}
                  alt={tutorial.title}
                  className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${watched ? 'brightness-50' : ''}`}
                />
                {watched && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-1">
                      <CheckCircle size={28} className="text-green-400" />
                      <span className="text-xs text-green-400 font-semibold">Bekeken</span>
                    </div>
                  </div>
                )}
                {!watched && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <div className="w-10 h-10 bg-violet-600 rounded-full flex items-center justify-center">
                      <Play size={16} className="text-white ml-0.5" fill="white" />
                    </div>
                  </div>
                )}
                {started && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                    <div className="h-full bg-violet-500" style={{ width: `${pct}%` }} />
                  </div>
                )}
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs font-medium px-1.5 py-0.5 rounded">
                  {tutorial.duration}
                </div>
                <div className={`absolute top-2 left-2 text-xs font-medium px-2 py-0.5 rounded ${difficultyColors[tutorial.difficulty]}`}>
                  {tutorial.difficulty}
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-sm font-semibold text-white leading-tight mb-1 line-clamp-2">{tutorial.title}</h3>
                <p className="text-xs text-slate-400 mb-3">door {tutorial.instructor}</p>
                <p className="text-xs text-slate-500 line-clamp-2 mb-3">{tutorial.description}</p>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Eye size={11} /> {formatViews(tutorial.views_count)}</span>
                  <span className="flex items-center gap-1"><Clock size={11} /> {tutorial.duration}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-3">
                  {tutorial.tags.map(tag => (
                    <span key={tag} className="text-xs bg-white/6 text-slate-400 px-2 py-0.5 rounded-full">{tag}</span>
                  ))}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
