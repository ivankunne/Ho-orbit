import { useState, useEffect } from 'react';
import {
  Play, Clock, Eye, BookOpen, Sliders, Disc3, Calendar,
  Loader2, Lock, CheckCircle2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatPlays } from '@utils/format';

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

// Placeholder data so the page isn't empty before DB content is added
const PLACEHOLDER: Masterclass[] = [
  {
    id: 'ph1', title: 'Van idee naar beat: het productieproces ontrafeld', category: 'producer',
    description: 'Hoe werk je een ruwe melodie uit tot een volledige productie? Stapsgewijs uitgelegd door een van de meest productieve beatmakers van de Benelux.',
    video_url: '', thumbnail_url: '', instructor_name: 'DJ Promo',
    instructor_avatar: '', duration: '38 min', is_free: true, views_count: 1240, created_at: new Date().toISOString(),
  },
  {
    id: 'ph2', title: 'Mix zoals de groten: stems, busses en glue', category: 'mixer',
    description: 'Van ruwe opname naar radiokwaliteit. Leer hoe je met een clean mixchain ruimte creëert en je tracks laat doordrukken.',
    video_url: '', thumbnail_url: '', instructor_name: 'MixCloud Nine',
    instructor_avatar: '', duration: '55 min', is_free: true, views_count: 876, created_at: new Date().toISOString(),
  },
  {
    id: 'ph3', title: 'Mastering voor streaming: Spotify, Apple Music, Tidal', category: 'master',
    description: 'Loudness targets, true peak, dithering — alles wat je moet weten om je track goed te laten klinken op alle platformen.',
    video_url: '', thumbnail_url: '', instructor_name: 'Studio Loud',
    instructor_avatar: '', duration: '42 min', is_free: false, views_count: 654, created_at: new Date().toISOString(),
  },
  {
    id: 'ph4', title: 'Gigs boeken in 2025: van pitch tot contract', category: 'booker',
    description: 'Hoe schrijf je een overtuigende pitch? Welke venues zijn open voor nieuwe artiesten? En wat staat er in een standaard optreedcontract?',
    video_url: '', thumbnail_url: '', instructor_name: 'Boekingscentrale NL',
    instructor_avatar: '', duration: '61 min', is_free: true, views_count: 1103, created_at: new Date().toISOString(),
  },
  {
    id: 'ph5', title: 'Sampling legaal doen: clearances & credits', category: 'producer',
    description: 'Sample clearance is ingewikkeld maar niet onmogelijk. Leer wanneer je toestemming nodig hebt en hoe je dat aanvraagt.',
    video_url: '', thumbnail_url: '', instructor_name: 'DJ Promo',
    instructor_avatar: '', duration: '29 min', is_free: true, views_count: 788, created_at: new Date().toISOString(),
  },
  {
    id: 'ph6', title: 'Zang opnemen: microfoon, preamp en ruimte', category: 'mixer',
    description: 'Alles over het opnemen van zang in een thuisstudio. Welke microfoon voor welk stemtype? Hoe behandel je de ruimte?',
    video_url: '', thumbnail_url: '', instructor_name: 'MixCloud Nine',
    instructor_avatar: '', duration: '47 min', is_free: false, views_count: 512, created_at: new Date().toISOString(),
  },
];

export default function MasterclassPage() {
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('all');
  const [masterclasses, setMasterclasses] = useState<Masterclass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let query = supabase
        .from('masterclasses')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(60);

      if (activeCategory !== 'all') query = query.eq('category', activeCategory);

      const { data } = await query;
      // Use DB data if available, otherwise fall through to placeholders
      const list = data && data.length > 0 ? data : PLACEHOLDER;
      const filtered = activeCategory === 'all'
        ? list
        : list.filter(m => m.category === activeCategory);
      setMasterclasses(filtered);
      setLoading(false);
    })();
  }, [activeCategory]);

  const featured = masterclasses[0];
  const rest = masterclasses.slice(1);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 lg:px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Masterclass Archief</h1>
        <p className="text-slate-400 max-w-lg">
          Leer van producenten, mixers, masters en bookers uit de Nederlandse muziekscene. Gratis en betaald.
        </p>
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
        <div className="flex justify-center py-20">
          <Loader2 size={28} className="animate-spin text-violet-400" />
        </div>
      ) : (
        <>
          {/* Featured (first result) */}
          {featured && (
            <div className="mb-10 bg-white/3 border border-white/8 rounded-2xl overflow-hidden lg:flex">
              <div className="lg:w-96 aspect-video lg:aspect-auto bg-white/5 relative shrink-0 flex items-center justify-center">
                {featured.thumbnail_url
                  ? <img src={featured.thumbnail_url} alt={featured.title} className="w-full h-full object-cover" />
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
                <button className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors w-fit">
                  <Play size={16} fill="white" /> Bekijken
                </button>
              </div>
            </div>
          )}

          {/* Grid */}
          {rest.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {rest.map(mc => (
                <MasterclassCard key={mc.id} mc={mc} />
              ))}
            </div>
          )}

          {masterclasses.length === 0 && (
            <div className="text-center py-20 text-slate-500">
              <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium text-slate-400">Geen masterclasses gevonden</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MasterclassCard({ mc }: { mc: Masterclass }) {
  return (
    <div className="group bg-white/3 hover:bg-white/5 border border-white/8 rounded-2xl overflow-hidden cursor-pointer transition-all">
      <div className="relative aspect-video bg-white/5 flex items-center justify-center overflow-hidden">
        {mc.thumbnail_url
          ? <img src={mc.thumbnail_url} alt={mc.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
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
    </div>
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
