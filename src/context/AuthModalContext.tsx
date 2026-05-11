import { createContext, useContext, useState, type ReactNode } from 'react';

type Tab = 'login' | 'signup';

interface AuthModalContextValue {
  isOpen: boolean;
  tab: Tab;
  open: (tab?: Tab) => void;
  close: () => void;
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('login');

  const open = (t: Tab = 'login') => {
    setTab(t);
    setIsOpen(true);
  };

  const close = () => setIsOpen(false);

  return (
    <AuthModalContext.Provider value={{ isOpen, tab, open, close }}>
      {children}
    </AuthModalContext.Provider>
  );
}

export const useAuthModal = () => {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error('useAuthModal must be used within AuthModalProvider');
  return ctx;
};
