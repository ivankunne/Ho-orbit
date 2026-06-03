import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';

/**
 * "Add to home screen" prompt.
 *
 * - On Chrome / Edge / Android (and installable desktop browsers) we capture the
 *   `beforeinstallprompt` event and offer a one-tap "Installeren" button.
 * - On iOS Safari there is no programmatic install, so we show the manual
 *   share-sheet instructions instead.
 * - Nothing is shown when the app is already running standalone (installed),
 *   and a dismissal is remembered for 14 days so we don't nag.
 */

const DISMISS_KEY = 'ho_install_dismissed_at';
const DISMISS_DAYS = 14;

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt: () => Promise<void>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  const ua = window.navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ reports as Mac, so also detect touch-capable Safari on "Mac".
  const iPadOs = /Macintosh/.test(ua) && 'ontouchend' in document;
  return iOS || iPadOs;
}

function isSafari(): boolean {
  const ua = window.navigator.userAgent;
  return /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(ua);
}

function recentlyDismissed(): boolean {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const ts = Number(raw);
  if (!ts) return false;
  return Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    // Android / desktop Chromium: capture the install event.
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      window.setTimeout(() => setVisible(true), 2500);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    // Hide for good once the app is actually installed.
    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    };
    window.addEventListener('appinstalled', onInstalled);

    // iOS Safari can't fire beforeinstallprompt — show manual instructions.
    if (isIos() && isSafari()) {
      setIosHint(true);
      window.setTimeout(() => setVisible(true), 2500);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
    } else {
      dismiss();
    }
    setDeferred(null);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-0 z-[80] flex justify-center px-4 pointer-events-none
                 bottom-[calc(7.5rem+env(safe-area-inset-bottom))] lg:bottom-6"
      role="dialog"
      aria-label="App installeren"
    >
      <div
        className="pointer-events-auto w-full max-w-md flex items-center gap-3 rounded-2xl
                   border border-white/10 bg-[#231d3a]/95 p-3 pr-2 shadow-2xl backdrop-blur-xl
                   animate-in fade-in slide-in-from-bottom-4 duration-300"
      >
        <img
          src="/icons/icon-192.png"
          alt="h-orbit"
          className="h-12 w-12 shrink-0 rounded-xl border border-white/10"
        />

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-100">Zet h-orbit op je beginscherm</p>
          {iosHint ? (
            <p className="mt-0.5 text-xs leading-snug text-slate-400">
              Tik op{' '}
              <Share className="inline-block h-3.5 w-3.5 -translate-y-px text-violet-400" aria-label="Deel" />
              {' '}en kies <span className="font-medium text-slate-200">"Zet op beginscherm"</span>.
            </p>
          ) : (
            <p className="mt-0.5 text-xs leading-snug text-slate-400">
              Open de app sneller — direct vanaf je scherm, op volledig scherm.
            </p>
          )}
        </div>

        {!iosHint && (
          <button
            onClick={install}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 py-2
                       text-sm font-semibold text-white transition-colors hover:bg-violet-500
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
          >
            <Download className="h-4 w-4" />
            Installeren
          </button>
        )}

        <button
          onClick={dismiss}
          aria-label="Sluiten"
          className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400
                     transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
