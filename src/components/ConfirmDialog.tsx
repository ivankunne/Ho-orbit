import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@components/ui/dialog';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
}

// Single reusable confirm dialog for every destructive action in BandSpace —
// replaces native window.confirm() so it matches the app's own look, and
// shows an in-place spinner instead of just freezing the browser.
export default function ConfirmDialog({
  open, onOpenChange, title, description,
  confirmLabel = 'Bevestigen', cancelLabel = 'Annuleren', destructive = true, onConfirm,
}: ConfirmDialogProps) {
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => !loading && onOpenChange(o)}>
      <DialogContent className="sm:max-w-sm bg-[#1e1a30] border-white/10 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-white">{title}</DialogTitle>
          <DialogDescription className="text-slate-400">{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <button onClick={() => onOpenChange(false)} disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:border-white/20 transition-colors text-sm disabled:opacity-50">
            {cancelLabel}
          </button>
          <button onClick={handleConfirm} disabled={loading}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-colors text-sm disabled:opacity-50 ${destructive ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-violet-600 hover:bg-violet-500 text-white'}`}>
            {loading && <Loader2 size={14} className="animate-spin" />} {confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
