import { useEffect, useState } from 'react';
import { Download, Share, X, Compass, Plus } from 'lucide-react';

/**
 * "Add to home screen" prompt.
 *
 * Three states, chosen by what the current browser actually supports:
 *  - "install"    Chrome / Edge / Android / installable desktop browsers fire
 *                 `beforeinstallprompt`, so we offer a one-tap "Installeren" button.
 *  - "ios-safari" iOS Safari can't be prompted, but it *can* add to the home
 *                 screen via the share sheet — so we show those steps.
 *  - "ios-other"  iOS Chrome/Firefox/Edge (all WebKit) cannot install at all;
 *                 the home-screen feature only exists in Safari. We tell the
 *                 user to open the page in Safari first.
 *
 * Nothing shows when already running standalone (installed). A dismissal is
 * remembered for 14 days so we don't nag.
 */

const DISMISS_KEY = 'ho_install_dismissed_at';
const DISMISS_DAYS = 14;

type Mode = 'install' | 'ios-safari' | 'ios-other';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt: () => Promise<void>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
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

function isIosSafari(): boolean {
  // On iOS every engine is WebKit; only real Safari lacks the other-browser tokens.
  const ua = window.navigator.userAgent;
  return isIos() && !/crios|fxios|edgios|opt\//i.test(ua);
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
  const [mode, setMode] = useState<Mode | null>(null);
  const [visible, setVisible] = useState(false);
  const [showSafariSteps, setShowSafariSteps] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    // Android / desktop Chromium: capture the install event.
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setMode('install');
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

    // iOS never fires beforeinstallprompt — decide between Safari steps and
    // "open in Safari" for the other iOS browsers.
    if (isIos()) {
      setMode(isIosSafari() ? 'ios-safari' : 'ios-other');
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
    if (outcome === 'accepted') setVisible(false);
    else dismiss();
    setDeferred(null);
  };

  if (!visible || !mode) return null;

  return (
    <div
      className="fixed inset-x-0 z-[80] flex justify-center px-4 pointer-events-none
                 bottom-[calc(var(--bottom-nav-h,4.5rem)+0.75rem)] lg:bottom-6"
      role="dialog"
      aria-label="App installeren"
    >
      <div
        className="pointer-events-auto w-full max-w-md flex items-start gap-3 rounded-2xl
                   border border-white/10 bg-[#231d3a] p-3 pr-2 shadow-2xl
                   animate-in fade-in slide-in-from-bottom-4 duration-300"
      >
        <img
          src="/icons/icon-192.png"
          alt="h-orbit"
          className="h-12 w-12 shrink-0 rounded-xl border border-white/10"
        />

        <div className="min-w-0 flex-1 py-0.5">
          <p className="text-sm font-semibold text-slate-100">Zet h-orbit op je beginscherm</p>

          {mode === 'install' && (
            <p className="mt-0.5 text-xs leading-snug text-slate-400">
              Open de app sneller — direct vanaf je scherm, op volledig scherm.
            </p>
          )}

          {mode === 'ios-safari' && (
            <p className="mt-0.5 text-xs leading-snug text-slate-400">
              Tik op{' '}
              <Share className="inline-block h-3.5 w-3.5 -translate-y-px text-violet-400" aria-label="Deel" />
              {' '}en kies <span className="font-medium text-slate-200">"Zet op beginscherm"</span>.
            </p>
          )}

          {mode === 'ios-other' && (
            <>
              <p className="mt-0.5 text-xs leading-snug text-slate-400">
                Installeren kan via Safari. Open h-orbit daar om de app toe te voegen.
              </p>

              {showSafariSteps ? (
                <ol className="mt-2 space-y-1 text-xs leading-snug text-slate-300">
                  <li>1. Tik op het menu (<span className="font-semibold">⋯</span> of <Share className="inline-block h-3.5 w-3.5 -translate-y-px text-violet-400" aria-label="Deel" />) van je browser.</li>
                  <li>2. Kies <span className="font-medium text-slate-100">"Open in Safari"</span>.</li>
                  <li>3. Tik in Safari op <Share className="inline-block h-3.5 w-3.5 -translate-y-px text-violet-400" aria-label="Deel" /> → <span className="font-medium text-slate-100">"Zet op beginscherm"</span> <Plus className="inline-block h-3.5 w-3.5 -translate-y-px text-violet-400" aria-label="Toevoegen" />.</li>
                </ol>
              ) : (
                <button
                  onClick={() => setShowSafariSteps(true)}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-1.5
                             text-xs font-semibold text-white transition-colors hover:bg-violet-500
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                >
                  <Compass className="h-3.5 w-3.5" />
                  Open in Safari
                </button>
              )}
            </>
          )}
        </div>

        {mode === 'install' && (
          <button
            onClick={install}
            className="shrink-0 mt-0.5 inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 py-2
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
