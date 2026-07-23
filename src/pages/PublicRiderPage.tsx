import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, FileText, Download, AlertCircle, Printer } from 'lucide-react';
import { getPublicRider, type PublicRider } from '@services/riderService';
import { avatarPlaceholder } from '@utils/placeholder';

const RIDER_TYPE_LABELS: Record<string, string> = {
  technical: 'Technical Rider',
  hospitality: 'Hospitality Rider',
  stage_plot: 'Stage Plot',
  input_list: 'Input List',
  lighting: 'Lighting Rider',
  other: 'Document',
};

function formatSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Public, unauthenticated rider page: /rider/:token
 * No app chrome (see the isRiderShare check in App.tsx). Reachable by anyone
 * with the share link — the RLS-bypassing get_public_rider RPC is the only
 * data path in, scoped strictly to this one rider.
 */
export default function PublicRiderPage() {
  const { token } = useParams<{ token: string }>();
  const [rider, setRider] = useState<PublicRider | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    getPublicRider(token).then(r => {
      setRider(r);
      setLoading(false);
    });
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0c1a]">
        <Loader2 size={28} className="animate-spin text-violet-400" />
      </div>
    );
  }

  if (!rider) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#0f0c1a] px-6 text-center">
        <AlertCircle size={28} className="text-red-400" />
        <div>
          <p className="text-lg font-semibold text-white">Rider niet gevonden</p>
          <p className="text-sm text-slate-500 mt-1 max-w-xs">
            Deze link is ongeldig of niet langer beschikbaar. Vraag de band om een nieuwe link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0c1a] print:bg-white">
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
        }
      `}</style>
      <div className="max-w-2xl mx-auto px-6 py-10 print:py-0 print:px-0">
        <div className="flex items-center gap-3 mb-8 print:mb-6">
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/10 border border-white/15 print:border-slate-300 shrink-0">
            <img src={rider.band_image_url || avatarPlaceholder(rider.band_name)} alt={rider.band_name} className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-sm text-slate-400 print:text-slate-600">{rider.band_name}</p>
            <p className="text-[11px] font-semibold text-violet-400 print:text-violet-700 uppercase tracking-wider">
              {RIDER_TYPE_LABELS[rider.type] ?? 'Document'}
            </p>
          </div>
          <button onClick={() => window.print()}
            className="no-print ml-auto flex items-center gap-1.5 text-xs text-slate-400 hover:text-white border border-white/10 hover:border-white/20 rounded-lg px-3 py-1.5 transition-colors">
            <Printer size={13} /> Printen
          </button>
        </div>

        <h1 className="text-2xl font-bold text-white print:text-black mb-3">{rider.title}</h1>
        {rider.description && (
          <p className="text-slate-300 print:text-slate-800 leading-relaxed whitespace-pre-line mb-8">{rider.description}</p>
        )}

        {rider.files.length > 0 ? (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-500 print:text-slate-600 uppercase tracking-wider">Bestanden</p>
            {rider.files.map(f => {
              const isImage = (f.file_type ?? '').startsWith('image/');
              if (isImage) {
                return (
                  <div key={f.id}>
                    <img src={f.file_url} alt={f.file_name} className="w-full rounded-xl border border-white/10 print:border-slate-300" />
                    <p className="text-xs text-slate-500 mt-1.5">{f.file_name}</p>
                  </div>
                );
              }
              return (
                <div key={f.id}>
                  <a href={f.file_url} target="_blank" rel="noopener noreferrer" download={f.file_name}
                    className="no-print flex items-center gap-3 bg-white/5 border border-white/10 hover:border-violet-500/40 rounded-xl px-4 py-3 transition-colors">
                    <FileText size={18} className="text-violet-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{f.file_name}</p>
                      {f.size_bytes ? <p className="text-xs text-slate-500">{formatSize(f.size_bytes)}</p> : null}
                    </div>
                    <Download size={16} className="text-slate-400 shrink-0" />
                  </a>
                  <p className="hidden print:block text-sm text-slate-700">{f.file_name} — zie bijgevoegd bestand</p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Geen bestanden bijgevoegd.</p>
        )}

        <p className="no-print text-[11px] text-slate-600 mt-12 text-center">
          Gedeeld via <span className="text-violet-400">h-orbit</span>
        </p>
      </div>
    </div>
  );
}
