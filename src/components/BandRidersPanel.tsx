import { useState, useEffect, useRef } from 'react';
import { FileText, Plus, X, Loader2, Trash2, Pencil, Share2, Check, Upload } from 'lucide-react';
import { useToast } from '@components/Toast';
import EmptyState from '@components/EmptyState';
import ConfirmDialog from '@components/ConfirmDialog';
import {
  type BandRider, type BandRiderFile, type RiderType,
  getBandRiders, createRider, updateRider, deleteRider, regenerateRiderShareToken,
  getRiderFiles, uploadRiderFile, deleteRiderFile,
} from '@services/riderService';

const RIDER_TYPES: { value: RiderType; label: string; plural: string }[] = [
  { value: 'technical', label: 'Technical Rider', plural: 'Technical Riders' },
  { value: 'hospitality', label: 'Hospitality Rider', plural: 'Hospitality Riders' },
  { value: 'stage_plot', label: 'Stage Plot', plural: 'Stage Plots' },
  { value: 'input_list', label: 'Input List', plural: 'Input Lists' },
  { value: 'lighting', label: 'Lighting Rider', plural: 'Lighting Riders' },
  { value: 'other', label: 'Overig document', plural: 'Overige documenten' },
];

interface Props {
  bandId: string;
  isAdmin: boolean;
  userId?: string;
}

export default function BandRidersPanel({ bandId, isAdmin, userId }: Props) {
  const addToast = useToast();
  const [riders, setRiders] = useState<BandRider[]>([]);
  const [files, setFiles] = useState<Record<string, BandRiderFile[]>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ type: 'technical' as RiderType, title: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string; description: string; confirmLabel?: string; destructive?: boolean; onConfirm: () => void | Promise<void>;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getBandRiders(bandId).then(async list => {
      const filesByRider: Record<string, BandRiderFile[]> = {};
      await Promise.all(list.map(async r => { filesByRider[r.id] = await getRiderFiles(r.id); }));
      if (cancelled) return;
      setRiders(list);
      setFiles(filesByRider);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [bandId]);

  function openCreate() {
    setEditingId(null);
    setForm({ type: 'technical', title: '', description: '' });
    setShowModal(true);
  }

  function openEdit(r: BandRider) {
    setEditingId(r.id);
    setForm({ type: r.type, title: r.title, description: r.description || '' });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.title.trim() || !userId) return;
    setSaving(true);
    if (editingId) {
      const updates = { type: form.type, title: form.title.trim(), description: form.description.trim() || null };
      const ok = await updateRider(editingId, updates);
      setSaving(false);
      if (!ok) { addToast('Bijwerken mislukt', 'error'); return; }
      setRiders(prev => prev.map(r => r.id === editingId ? { ...r, ...updates } : r));
      addToast('Rider bijgewerkt', 'success');
    } else {
      const rider = await createRider(bandId, form.type, form.title.trim(), form.description.trim(), userId);
      setSaving(false);
      if (!rider) { addToast('Aanmaken mislukt', 'error'); return; }
      setRiders(prev => [...prev, rider]);
      setFiles(prev => ({ ...prev, [rider.id]: [] }));
      addToast('Rider aangemaakt', 'success');
    }
    setShowModal(false);
  }

  function handleDelete(riderId: string) {
    setConfirmDialog({
      title: 'Rider verwijderen', description: 'Weet je zeker dat je deze rider wilt verwijderen? Alle bestanden gaan verloren.',
      onConfirm: async () => {
        setDeletingId(riderId);
        const ok = await deleteRider(riderId);
        setDeletingId(null);
        if (!ok) { addToast('Verwijderen mislukt', 'error'); return; }
        setRiders(prev => prev.filter(r => r.id !== riderId));
      },
    });
  }

  async function handleUpload(riderId: string, file: File) {
    if (!userId) return;
    setUploadingId(riderId);
    const uploaded = await uploadRiderFile(file, riderId, userId);
    setUploadingId(null);
    if (!uploaded) { addToast('Uploaden mislukt', 'error'); return; }
    setFiles(prev => ({ ...prev, [riderId]: [...(prev[riderId] ?? []), uploaded] }));
  }

  async function handleDeleteFile(riderId: string, file: BandRiderFile) {
    const ok = await deleteRiderFile(file.id, file.file_url);
    if (!ok) { addToast('Verwijderen mislukt', 'error'); return; }
    setFiles(prev => ({ ...prev, [riderId]: (prev[riderId] ?? []).filter(f => f.id !== file.id) }));
  }

  async function handleCopyShareLink(rider: BandRider) {
    const url = `${window.location.origin}/rider/${rider.share_token}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(rider.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function handleRegenerateToken(riderId: string) {
    setConfirmDialog({
      title: 'Deel-link vernieuwen', description: 'Nieuwe deel-link genereren? De oude link werkt daarna niet meer.',
      confirmLabel: 'Vernieuwen', destructive: false,
      onConfirm: async () => {
        const token = await regenerateRiderShareToken(riderId);
        if (!token) { addToast('Vernieuwen mislukt', 'error'); return; }
        setRiders(prev => prev.map(r => r.id === riderId ? { ...r, share_token: token } : r));
        addToast('Nieuwe deel-link gegenereerd', 'success');
      },
    });
  }

  const grouped = RIDER_TYPES
    .map(t => ({ ...t, riders: riders.filter(r => r.type === t.value) }))
    .filter(g => g.riders.length > 0);

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 size={22} className="animate-spin text-violet-400" /></div>;
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 lg:px-10 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><FileText size={20} className="text-violet-400" /> Riders</h2>
          <p className="text-sm text-slate-500 mt-0.5">Technische en hospitality-informatie voor organisatoren</p>
        </div>
        {isAdmin && (
          <button onClick={openCreate} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-4 py-2 rounded-xl transition-colors text-sm">
            <Plus size={15} /> Rider
          </button>
        )}
      </div>

      {riders.length === 0 ? (
        <EmptyState
          title="Nog geen riders"
          subtitle={isAdmin ? 'Voeg een technical rider, stage plot of ander document toe.' : 'Er zijn nog geen riders toegevoegd.'}
          action={isAdmin ? { label: 'Rider toevoegen', onClick: openCreate } : undefined}
        />
      ) : (
        <div className="space-y-6">
          {grouped.map(g => (
            <div key={g.value}>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                {g.riders.length > 1 ? g.plural : g.label}
              </p>
              <div className="space-y-2">
                {g.riders.map(r => (
                  <div key={r.id} className="bg-white/4 border border-white/8 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-white">{r.title}</p>
                        {r.description && <p className="text-sm text-slate-400 mt-1 leading-relaxed">{r.description}</p>}
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button onClick={() => handleCopyShareLink(r)} title="Kopieer deel-link" className="p-1.5 text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 rounded-lg transition-colors">
                            {copiedId === r.id ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
                          </button>
                          <button onClick={() => openEdit(r)} title="Bewerken" className="p-1.5 text-slate-500 hover:text-white hover:bg-white/8 rounded-lg transition-colors"><Pencil size={14} /></button>
                          <button onClick={() => handleDelete(r.id)} disabled={deletingId === r.id} title="Verwijderen" className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50">
                            {deletingId === r.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                      {(files[r.id] ?? []).map(f => (
                        <div key={f.id} className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg pl-2.5 pr-1.5 py-1.5 text-xs">
                          <a href={f.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors truncate max-w-[160px]">
                            <FileText size={12} className="shrink-0" /> <span className="truncate">{f.file_name}</span>
                          </a>
                          {isAdmin && (
                            <button onClick={() => handleDeleteFile(r.id, f)} className="text-slate-600 hover:text-red-400 transition-colors shrink-0 p-0.5"><X size={11} /></button>
                          )}
                        </div>
                      ))}
                      {isAdmin && (
                        <>
                          <button onClick={() => fileInputRefs.current[r.id]?.click()} disabled={uploadingId === r.id}
                            className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 border border-dashed border-violet-500/30 hover:border-violet-500/50 rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-50">
                            {uploadingId === r.id ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />} Bestand toevoegen
                          </button>
                          <input
                            ref={el => { fileInputRefs.current[r.id] = el; }}
                            type="file" accept=".pdf,image/*" className="hidden"
                            onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(r.id, f); e.target.value = ''; }}
                          />
                        </>
                      )}
                    </div>

                    {isAdmin && (
                      <button onClick={() => handleRegenerateToken(r.id)} className="text-[11px] text-slate-600 hover:text-amber-400 transition-colors mt-3">
                        Deel-link vernieuwen (oude link stopt met werken)
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center sm:p-4 bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-[#1e1a30] border border-white/10 rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-md shadow-2xl max-h-[90dvh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-white">{editingId ? 'Rider bewerken' : 'Rider toevoegen'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/8 transition-colors"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Type</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {RIDER_TYPES.map(t => (
                    <button key={t.value} type="button" onClick={() => setForm(f => ({ ...f, type: t.value }))}
                      className={`text-xs px-3 py-2 rounded-lg border transition-all text-left ${form.type === t.value ? 'bg-violet-600/20 border-violet-500 text-white font-semibold' : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/25'}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Titel *</label>
                <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="bijv. Technical Rider 2026"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Beschrijving</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Optioneel…"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors resize-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:border-white/20 transition-colors text-sm">Annuleren</button>
              <button onClick={handleSave} disabled={saving || !form.title.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-colors disabled:opacity-50 text-sm">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Opslaan
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDialog}
        onOpenChange={open => { if (!open) setConfirmDialog(null); }}
        title={confirmDialog?.title ?? ''}
        description={confirmDialog?.description ?? ''}
        confirmLabel={confirmDialog?.confirmLabel}
        destructive={confirmDialog?.destructive}
        onConfirm={() => confirmDialog?.onConfirm()}
      />
    </div>
  );
}
