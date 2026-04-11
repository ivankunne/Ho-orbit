import { Keyboard } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@components/ui/dialog';

const GROUPS = [
  {
    label: 'Afspelen',
    shortcuts: [
      { keys: ['Space'], description: 'Afspelen / Pauzeren' },
      { keys: ['←'], description: 'Vorig nummer' },
      { keys: ['→'], description: 'Volgend nummer' },
      { keys: ['S'], description: 'Shuffle aan/uit' },
      { keys: ['L'], description: 'Nummer liken' },
    ],
  },
  {
    label: 'Navigatie',
    shortcuts: [
      { keys: ['⌘', 'K'], description: 'Zoeken openen' },
      { keys: ['Esc'], description: 'Overlay sluiten' },
      { keys: ['?'], description: 'Sneltoetsen tonen' },
    ],
  },
];

function Kbd({ children }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[28px] h-7 px-1.5 bg-white/8 border border-white/15 rounded-md text-[11px] font-mono font-semibold text-slate-300 shadow-sm">
      {children}
    </kbd>
  );
}

export default function KeyboardShortcutsModal({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-600/20 flex items-center justify-center">
              <Keyboard size={16} className="text-violet-400" />
            </div>
            <DialogTitle>Sneltoetsen</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {GROUPS.map(group => (
            <div key={group.label}>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">
                {group.label}
              </p>
              <div className="space-y-2">
                {group.shortcuts.map(sc => (
                  <div key={sc.description} className="flex items-center justify-between gap-4">
                    <span className="text-sm text-slate-300">{sc.description}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {sc.keys.map((k, i) => (
                        <Kbd key={i}>{k}</Kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-white/8 bg-white/[0.02] -mx-6 -mb-6 px-6 py-3">
          <p className="text-[11px] text-slate-600 text-center">
            Sneltoetsen werken niet wanneer je in een tekstveld typt
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
