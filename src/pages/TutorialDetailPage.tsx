import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, Clock, Eye, ChevronLeft, BookOpen, Video, CheckCircle2, Wrench } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import CommentSection from '@components/CommentSection';

const difficultyColors = {
  Beginner: 'bg-green-500/20 text-green-400 border-green-500/30',
  Gevorderd: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  Expert: 'bg-red-500/20 text-red-400 border-red-500/30',
};

function formatViews(n) {
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
  return n.toString();
}

export default function TutorialDetailPage() {
  const { id } = useParams();
  const [tutorial, setTutorial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [moreTutorials, setMoreTutorials] = useState([]);
  const [activeTab, setActiveTab] = useState('guide');
  const [completedSteps, setCompletedSteps] = useState(new Set());

  useEffect(() => {
    supabase.from('tutorials').select('*').eq('id', Number(id)).single()
      .then(({ data }) => { setTutorial(data); setLoading(false); });
  }, [id]);

  useEffect(() => {
    if (!tutorial) return;
    supabase.from('tutorials').select('*').neq('id', tutorial.id).limit(4)
      .then(({ data }) => setMoreTutorials(data ?? []));
  }, [tutorial?.id]);

  if (loading) return null;

  if (!tutorial) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-slate-400 text-lg mb-4">Tutorial niet gevonden.</p>
        <Link to="/tutorials" className="text-violet-400 hover:text-violet-300">
          ← Terug naar tutorials
        </Link>
      </div>
    );
  }

  function toggleStep(index) {
    setCompletedSteps(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  const progress = tutorial.steps ? Math.round((completedSteps.size / tutorial.steps.length) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link to="/tutorials" className="hover:text-violet-400 transition-colors flex items-center gap-1">
          <ChevronLeft size={14} />
          Tutorials
        </Link>
        <span>/</span>
        <span className="text-slate-300 truncate">{tutorial.title}</span>
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-8">
        {/* Main content */}
        <div>
          {/* Hero */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${difficultyColors[tutorial.difficulty]}`}>
                {tutorial.difficulty}
              </span>
              {tutorial.tags.map(tag => (
                <span key={tag} className="text-xs bg-white/6 text-slate-400 px-2 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">{tutorial.title}</h1>
            <p className="text-slate-400 mb-4">{tutorial.description}</p>
            <div className="flex flex-wrap items-center gap-5 text-sm text-slate-500">
              <span>door <span className="text-violet-400 font-medium">{tutorial.instructor}</span></span>
              <span className="flex items-center gap-1.5"><Clock size={14} /> {tutorial.duration}</span>
              <span className="flex items-center gap-1.5"><Eye size={14} /> {formatViews(tutorial.views_count)} weergaven</span>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 mb-6 bg-white/3 border border-white/8 rounded-xl p-1 w-fit">
            <button
              onClick={() => setActiveTab('video')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'video'
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Video size={15} />
              Video
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'guide'
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen size={15} />
              Stap-voor-stap gids
            </button>
          </div>

          {/* Video tab */}
          {activeTab === 'video' && (
            <div>
              {/* Video placeholder */}
              <div className="relative rounded-2xl overflow-hidden bg-[#231d3a] border border-white/8 mb-6 aspect-video flex items-center justify-center">
                <img
                  src={tutorial.thumbnail_url}
                  alt={tutorial.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-30"
                />
                <div className="relative flex flex-col items-center gap-4">
                  <div className="w-20 h-20 bg-violet-600 rounded-full flex items-center justify-center shadow-2xl shadow-orange-500/30">
                    <Play size={36} className="text-white ml-1.5" fill="white" />
                  </div>
                  <p className="text-slate-400 text-sm">Video — binnenkort beschikbaar</p>
                </div>
                <div className="absolute bottom-4 right-4 bg-black/70 text-white text-sm font-medium px-2.5 py-1 rounded-lg">
                  {tutorial.duration}
                </div>
              </div>

              {/* Chapters */}
              {tutorial.chapters && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">Hoofdstukken</h3>
                  <div className="space-y-1">
                    {tutorial.chapters.map((chapter, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/3 hover:bg-white/6 border border-white/5 transition-colors cursor-pointer group"
                      >
                        <span className="text-xs font-mono text-violet-400 w-10 shrink-0">{chapter.time}</span>
                        <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{chapter.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Guide tab */}
          {activeTab === 'guide' && tutorial.steps && (
            <div>
              {/* Progress bar */}
              <div className="mb-6 p-4 bg-white/3 border border-white/8 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-400">Jouw voortgang</span>
                  <span className="text-sm font-semibold text-violet-400">{completedSteps.size}/{tutorial.steps.length} stappen</span>
                </div>
                <div className="h-2 bg-white/8 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-600 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-4">
                {tutorial.steps.map((step, i) => {
                  const done = completedSteps.has(i);
                  return (
                    <div
                      key={i}
                      className={`rounded-2xl border transition-all ${
                        done
                          ? 'bg-green-500/5 border-green-500/20'
                          : 'bg-white/3 border-white/8'
                      }`}
                    >
                      <button
                        onClick={() => toggleStep(i)}
                        className="w-full flex items-start gap-4 p-5 text-left"
                      >
                        <div className={`mt-0.5 shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                          done
                            ? 'bg-green-500 border-green-500'
                            : 'border-white/20 bg-transparent'
                        }`}>
                          {done && <CheckCircle2 size={14} className="text-white" fill="white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-semibold text-base mb-2 transition-colors ${done ? 'text-green-400' : 'text-white'}`}>
                            {step.title}
                          </h3>
                          <p className="text-sm text-slate-400 leading-relaxed">{step.body}</p>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>

              {progress === 100 && (
                <div className="mt-6 p-5 bg-green-500/10 border border-green-500/20 rounded-2xl text-center">
                  <p className="text-green-400 font-semibold text-lg mb-1">Goed gedaan!</p>
                  <p className="text-slate-400 text-sm">Je hebt alle stappen van deze tutorial doorlopen.</p>
                </div>
              )}
            </div>
          )}
          <CommentSection resourceType="tutorial" resourceId={tutorial.id} resourceTitle={tutorial.title} />
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Quick info */}
          <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Over deze tutorial</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Instructeur</span>
                <span className="text-violet-400 font-medium">{tutorial.instructor}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Duur</span>
                <span className="text-slate-300">{tutorial.duration}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Niveau</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${difficultyColors[tutorial.difficulty]}`}>
                  {tutorial.difficulty}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Weergaven</span>
                <span className="text-slate-300">{formatViews(tutorial.views_count)}</span>
              </div>
              {tutorial.steps && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Stappen</span>
                  <span className="text-slate-300">{tutorial.steps.length}</span>
                </div>
              )}
            </div>
          </div>

          {/* Tools needed */}
          {tutorial.tools && (
            <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Wrench size={14} className="text-violet-400" />
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Benodigde tools</h3>
              </div>
              <ul className="space-y-2">
                {tutorial.tools.map((tool, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-600 shrink-0" />
                    {tool}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Chapters (sidebar, visible on guide tab too) */}
          {tutorial.chapters && (
            <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Video size={14} className="text-violet-400" />
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Video-inhoud</h3>
              </div>
              <div className="space-y-1">
                {tutorial.chapters.map((chapter, i) => (
                  <div key={i} className="flex items-center gap-3 py-1.5">
                    <span className="text-xs font-mono text-violet-400/70 w-9 shrink-0">{chapter.time}</span>
                    <span className="text-xs text-slate-400">{chapter.title}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setActiveTab('video')}
                className="mt-3 w-full text-center text-xs text-violet-400 hover:text-violet-300 transition-colors"
              >
                Bekijk video →
              </button>
            </div>
          )}

          {/* Other tutorials */}
          <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Meer tutorials</h3>
            <div className="space-y-3">
              {moreTutorials.map(t => (
                <Link
                  key={t.id}
                  to={`/tutorials/${t.id}`}
                  className="flex items-center gap-3 group"
                >
                  <img
                    src={t.thumbnail_url}
                    alt={t.title}
                    className="w-16 h-10 rounded-lg object-cover shrink-0 group-hover:opacity-80 transition-opacity"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors line-clamp-2 leading-snug">
                      {t.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{t.duration}</p>
                  </div>
                </Link>
              ))}
            </div>
            <Link
              to="/tutorials"
              className="block mt-4 text-center text-xs text-violet-400 hover:text-violet-300 transition-colors"
            >
              Alle tutorials bekijken →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
