import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Play, Clock, Eye, BookOpen, Sliders, Disc3, Calendar,
  Lock, CheckCircle2, X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatPlays } from '@utils/format';
import { optimizedImage } from '@lib/image';
import EmptyState from '@components/EmptyState';
import { Skeleton, TileSkeletons } from '@components/Skeleton';
import VideoEmbed, { parseVideo } from '@components/VideoEmbed';
import { AdminAddButton, MasterclassFormModal } from '@components/LearningForms';
import { useRequirePlan } from '@hooks/useRequirePlan';
import type { MasterclassCategory } from '@services/learningService';

const CATEGORIES = [
  { key: 'all',      label: 'Alles' },
  { key: 'producer', label: 'Producenten', icon: Disc3     },
  { key: 'mixer',    label: 'Mixers',       icon: Sliders   },
  { key: 'master',   label: 'Masters',      icon: BookOpen  },
  { key: 'booker',   label: 'Bookers',      icon: Calendar  },
] as const;

type CategoryKey = typeof CATEGORIES[number]['key'];

const CAT_STYLE: Record<string, { color: string; bg: string }> = {
  producer: { color: 'text-violet-400', bg: 'bg-violet-400/10 border-violet-400/20' },
  mixer:    { color: 'text-sky-400',    bg: 'bg-sky-400/10 border-sky-400/20' },
  master:   { color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
  booker:   { color: 'text-amber-400',  bg: 'bg-amber-400/10 border-amber-400/20' },
};

interface Masterclass {
  id: string;
  title: string;
  description: string;
  category: string;
  video_url: string;
  thumbnail_url: string;
  instructor_name: string;
  instructor_avatar: string;
  duration: string;
  is_free: boolean;
  views_count: number;
  created_at: string;
}

export default function MasterclassPage() {
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('all');
  const [all, setAll] = useState<Masterclass[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [playing, setPlaying] = useState<Masterclass | null>(null);
  const requirePlan = useRequirePlan();

  // Eén keer alles ophalen en in de browser filteren. Filterde de database per
  // categorie, dan was "geen masterclasses in deze categorie" niet te
  // onderscheiden van "er zijn nog helemaal geen masterclasses".
  useEffect(() => {
    supabase.from('masterclasses').select('*').order('created_at', { ascending: false }).limit(200)
      .then(({ data }) => { setAll((data ?? []) as Masterclass[]); setLoading(false); });
  }, []);

  const masterclasses = useMemo(
    () => (activeCategory === 'all' ? all : all.filter(m => m.category === activeCategory)),
    [all, activeCategory],
  );

  const featured = masterclasses[0];
  const rest = masterclasses.slice(1);

  // Betaalde masterclasses: bekijken is een Pro-handeling, net als elders.
  function open(mc: Masterclass) {
    if (!mc.is_free && !requirePlan('Deze masterclass is voor Pro-leden', 'Upgrade naar H-orbit Pro om alle masterclasses te bekijken.')) return;
    setPlaying(mc);
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 lg:px-6 py-10">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-white mb-2">Masterclass Archief</h1>
          <p className="text-slate-400 max-w-lg">
            Leer van producenten, mixers, masters en bookers uit de Nederlandse muziekscene. Gratis en betaald.
          </p>
        </div>
        <AdminAddButton label="Masterclass" onClick={() => setShowForm(true)} />
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 mb-8 bg-white/4 p-1 rounded-xl border border-white/8 w-fit flex-wrap">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeCategory === cat.key
                ? 'bg-violet-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div role="status" aria-busy="true" aria-label="Masterclasses laden…">
          <Skeleton className="mb-10 h-56 w-full rounded-2xl" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"><TileSkeletons count={3} imageClassName="aspect-video h-auto" /></div>
        </div>
      ) : (
        <>
          {/* Featured (first result) */}
          {featured && (
            <div className="mb-10 bg-white/3 border border-white/8 rounded-2xl overflow-hidden lg:flex">
              <div className="lg:w-96 aspect-video lg:aspect-auto bg-white/5 relative shrink-0 flex items-center justify-center">
                {featured.thumbnail_url
                  ? <img decoding="async" src={optimizedImage(featured.thumbnail_url, 640)} alt={featured.title} className="w-full h-full object-cover" />
                  : <CategoryPlaceholder category={featured.category} large />
                }
                <PlayOverlay free={featured.is_free} />
              </div>
              <div className="p-6 flex flex-col justify-center">
                <CategoryBadge category={featured.category} />
                <h2 className="text-xl font-bold text-white mt-3 mb-2">{featured.title}</h2>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">{featured.description}</p>
                <div className="flex items-center gap-4 text-xs text-slate-500 mb-5">
                  {featured.instructor_name && <span className="text-slate-300 font-medium">{featured.instructor_name}</span>}
                  {featured.duration && <span className="flex items-center gap-1"><Clock size={11} />{featured.duration}</span>}
                  <span className="flex items-center gap-1"><Eye size={11} />{formatPlays(featured.views_count)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => open(featured)}
                  className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors w-fit"
                >
                  {featured.is_free ? <Play size={16} fill="white" /> : <Lock size={15} />} Bekijken
                </button>
              </div>
            </div>
          )}

          {/* Grid */}
          {rest.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {rest.map(mc => (
                <MasterclassCard key={mc.id} mc={mc} onOpen={() => open(mc)} />
              ))}
            </div>
          )}

          {all.length === 0 && (
            <EmptyState
              title="Nog geen masterclasses"
              subtitle="Er zijn nog geen masterclasses. Kom binnenkort terug om de nieuwe masterclasses te bekijken!"
            />
          )}
          {all.length > 0 && masterclasses.length === 0 && (
            <EmptyState
              title="Geen masterclasses in deze categorie"
              subtitle="Er zijn hier nog geen masterclasses. Kijk in een andere categorie."
              action={{ label: 'Alle masterclasses', onClick: () => setActiveCategory('all') }}
            />
          )}
        </>
      )}

      {showForm && (
        <MasterclassFormModal
          categories={CATEGORIES.filter(c => c.key !== 'all') as unknown as { key: MasterclassCategory; label: string }[]}
          onClose={() => setShowForm(false)}
          onCreated={(row) => setAll(prev => [row as Masterclass, ...prev])}
        />
      )}
      {playing && <MasterclassPlayer mc={playing} onClose={() => setPlaying(null)} />}
    </div>
  );
}

/** Speler in een venster — er is geen aparte detailpagina voor masterclasses. */
function MasterclassPlayer({ mc, onClose }: { mc: Masterclass; onClose: () => void }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey); };
  }, [onClose]);
  const hasVideo = !!parseVideo(mc.video_url);

  return createPortal(
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={mc.title}>
      <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-[#1e1833] shadow-2xl">
        <button type="button" onClick={onClose} aria-label="Sluiten"
          className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors">
          <X size={18} />
        </button>
        <div className="relative aspect-video w-full bg-black">
          {hasVideo
            ? <VideoEmbed url={mc.video_url} title={mc.title} poster={mc.thumbnail_url || undefined} />
            : <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">De video voor deze masterclass volgt binnenkort.</div>}
        </div>
        <div className="p-5">
          <CategoryBadge category={mc.category} />
          <h2 className="mt-2 text-lg font-bold text-white">{mc.title}</h2>
          {mc.instructor_name && <p className="mt-0.5 text-sm text-slate-400">door {mc.instructor_name}</p>}
          {mc.description && <p className="mt-3 text-sm leading-relaxed text-slate-300">{mc.description}</p>}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function MasterclassCard({ mc, onOpen }: { mc: Masterclass; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="group block w-full text-left bg-white/3 hover:bg-white/5 border border-white/8 rounded-2xl overflow-hidden cursor-pointer transition-all">
      <div className="relative aspect-video bg-white/5 flex items-center justify-center overflow-hidden">
        {mc.thumbnail_url
          ? <img decoding="async" loading="lazy" src={optimizedImage(mc.thumbnail_url, 240)} alt={mc.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <CategoryPlaceholder category={mc.category} />
        }
        <PlayOverlay free={mc.is_free} />
      </div>
      <div className="p-4">
        <CategoryBadge category={mc.category} />
        <h3 className="font-semibold text-white mt-2 mb-1.5 line-clamp-2">{mc.title}</h3>
        {mc.instructor_name && (
          <p className="text-sm text-slate-400 mb-2">{mc.instructor_name}</p>
        )}
        <div className="flex items-center gap-3 text-xs text-slate-500">
          {mc.duration && <span className="flex items-center gap-1"><Clock size={11} />{mc.duration}</span>}
          <span className="flex items-center gap-1"><Eye size={11} />{formatPlays(mc.views_count)}</span>
          {mc.is_free
            ? <span className="text-emerald-400 font-medium flex items-center gap-0.5"><CheckCircle2 size={10} />Gratis</span>
            : <span className="text-amber-400 font-medium flex items-center gap-0.5"><Lock size={10} />Betaald</span>
          }
        </div>
      </div>
    </button>
  );
}

function PlayOverlay({ free }: { free: boolean }) {
  return (
    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${free ? 'bg-violet-600' : 'bg-amber-500'}`}>
        {free
          ? <Play size={20} className="text-white ml-0.5" fill="white" />
          : <Lock size={18} className="text-white" />
        }
      </div>
    </div>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const style = CAT_STYLE[category];
  const label = CATEGORIES.find(c => c.key === category)?.label ?? category;
  return (
    <span className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${style?.bg ?? ''} ${style?.color ?? 'text-slate-400'}`}>
      {label}
    </span>
  );
}

function CategoryPlaceholder({ category, large = false }: { category: string; large?: boolean }) {
  const style = CAT_STYLE[category];
  const cat = CATEGORIES.find(c => c.key === category);
  const Icon = cat && 'icon' in cat ? cat.icon : BookOpen;
  const sz = large ? 48 : 32;
  return (
    <div className={`flex items-center justify-center w-full h-full ${style?.bg ?? 'bg-white/5'}`}>
      <Icon size={sz} className={`${style?.color ?? 'text-slate-500'} opacity-30`} />
    </div>
  );
}
