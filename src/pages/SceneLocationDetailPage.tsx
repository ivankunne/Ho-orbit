import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Globe, Tag } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface SceneLocation {
  id: number;
  province: string;
  city: string;
  name: string;
  address: string;
  type: string;
  website: string;
  notes: string;
  description: string | null;
  lat: number;
  lng: number;
}

const TYPE_COLORS: Record<string, string> = {
  'Pop/Heavy':        '#7c3aed',
  'Cultuur':          '#3b82f6',
  'Cultuurcentrum':   '#3b82f6',
  'Erfgoed':          '#a855f7',
  'Dorpshuis':        '#22c55e',
  'MFA':              '#06b6d4',
  'Maatschappij':     '#f59e0b',
  'Broedplaats':      '#ef4444',
  'Gemeenschapshuis': '#ec4899',
  'Koepel':           '#14b8a6',
  'Commercieel':      '#f97316',
};

function getColor(type: string) {
  return TYPE_COLORS[type] ?? '#7c3aed';
}

export default function SceneLocationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [location, setLocation] = useState<SceneLocation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('scene_locations').select('*').eq('id', id).single()
      .then(({ data }) => { setLocation(data as SceneLocation | null); setLoading(false); });
  }, [id]);

  if (loading) return null;

  if (!location) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-slate-400 px-4">
        <p className="text-lg mb-4">Locatie niet gevonden.</p>
        <Link to="/hub" className="text-violet-400 hover:text-violet-300 flex items-center gap-2">
          <ArrowLeft size={16} /> Terug naar de Hub
        </Link>
      </div>
    );
  }

  const color = getColor(location.type);
  const websiteUrl = location.website
    ? (location.website.startsWith('http') ? location.website : `https://${location.website}`)
    : null;

  return (
    <div className="min-h-screen bg-[#1a1528]">
      <div className="max-w-3xl mx-auto px-4 lg:px-6 pt-6 pb-12">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white text-sm px-3 py-2 rounded-lg transition-colors"
          >
            <ArrowLeft size={15} /> Terug
          </button>
          <Link
            to="/hub"
            className="hidden sm:flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-xs px-3 py-2 rounded-lg transition-colors"
          >
            Naar de Hub-kaart
          </Link>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span
            className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
            style={{ background: `${color}30`, color }}
          >
            {location.type}
          </span>
        </div>
        <h1 className="text-3xl lg:text-5xl font-bold text-white mb-6">{location.name}</h1>

        <div className="bg-white/3 border border-white/8 rounded-2xl p-5 mb-8 space-y-3 text-sm">
          {location.address && (
            <div className="flex items-start gap-2">
              <MapPin size={14} className="text-slate-500 mt-0.5 shrink-0" />
              <span className="text-slate-300">
                {location.address}
                {location.city && `, ${location.city}`}
                {location.province && location.province !== location.city ? ` (${location.province})` : ''}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Tag size={14} className="text-slate-500 shrink-0" />
            <span className="text-slate-300">{location.type}</span>
          </div>
          {websiteUrl && (
            <div className="flex items-center gap-2">
              <Globe size={14} className="text-slate-500 shrink-0" />
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-400 hover:text-violet-300 transition-colors"
              >
                {location.website}
              </a>
            </div>
          )}
        </div>

        {location.description && (
          <section className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Over {location.name}</h2>
            <p className="text-slate-300 leading-relaxed whitespace-pre-line">{location.description}</p>
          </section>
        )}

        {location.notes && (
          <section className="mb-8">
            <p className="text-sm text-violet-300 leading-relaxed">{location.notes}</p>
          </section>
        )}

        {websiteUrl && (
          <a
            href={websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
          >
            Website bekijken
          </a>
        )}
      </div>
    </div>
  );
}
