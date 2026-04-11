import { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

const iconMap = {
  success: <CheckCircle2 size={17} className="text-green-400 shrink-0" />,
  error: <AlertCircle size={17} className="text-red-400 shrink-0" />,
  info: <Info size={17} className="text-blue-400 shrink-0" />,
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, visible: true }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const dismiss = id => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <ToastContext.Provider value={addToast}>
      {children}

      <div className="fixed top-5 right-5 z-[200] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center gap-3 bg-[#161d30] border border-white/12 rounded-2xl px-4 py-3 shadow-2xl shadow-black/40 min-w-[280px] max-w-sm"
            style={{ animation: 'toastIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both' }}
          >
            {iconMap[toast.type] ?? iconMap.info}
            <p className="text-sm text-white flex-1 leading-snug">{toast.message}</p>
            <button
              onClick={() => dismiss(toast.id)}
              className="text-slate-500 hover:text-white transition-colors ml-1 shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes toastIn {
          from { transform: translateX(110%) scale(0.95); opacity: 0; }
          to   { transform: translateX(0)   scale(1);    opacity: 1; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
