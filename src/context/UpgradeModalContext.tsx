import { createContext, useContext, useState, type ReactNode } from 'react';

interface UpgradeModalState {
  /** Kop boven het venster, bv. "Aanmelden voor evenementen is een Pro-functie". */
  title?: string;
  description?: string;
}

interface UpgradeModalContextValue extends UpgradeModalState {
  isOpen: boolean;
  open: (state?: UpgradeModalState) => void;
  close: () => void;
}

const UpgradeModalContext = createContext<UpgradeModalContextValue | null>(null);

/**
 * Tegenhanger van AuthModalContext, maar een stap verder in de trechter: je
 * bent ingelogd, alleen niet op een betaald plan. Bewust een venster en geen
 * hele pagina — je raakt de lijst waar je in zat niet kwijt.
 */
export function UpgradeModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<UpgradeModalState>({});

  return (
    <UpgradeModalContext.Provider
      value={{
        isOpen,
        ...state,
        open: (next = {}) => { setState(next); setIsOpen(true); },
        close: () => setIsOpen(false),
      }}
    >
      {children}
    </UpgradeModalContext.Provider>
  );
}

export const useUpgradeModal = () => {
  const ctx = useContext(UpgradeModalContext);
  if (!ctx) throw new Error('useUpgradeModal must be used within UpgradeModalProvider');
  return ctx;
};
