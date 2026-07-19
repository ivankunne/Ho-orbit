import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { setTheme, getTheme } from '@utils/theme'

// Apply saved theme before first render to prevent flash
setTheme(getTheme());

// Na een deploy bestaan oude lazy chunks niet meer; zonder dit blijft de
// gebruiker op een foutscherm hangen tot een handmatige refresh.
window.addEventListener('vite:preloadError', (event) => {
  if (sessionStorage.getItem('horbit-chunk-retry')) return; // maximaal één herstelpoging
  sessionStorage.setItem('horbit-chunk-retry', '1');
  event.preventDefault();
  window.location.reload();
});

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found in index.html');
createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Laat de opstart-splash (index.html) uitfaden zodra de app echt gerenderd is.
// rAF-poll in plaats van een vaste timeout: de splash verdwijnt exact op het
// moment dat React iets in #root heeft gezet.
(function dismissSplash() {
  const splash = document.getElementById('boot-splash');
  if (!splash) return;
  const check = () => {
    if (rootEl.childElementCount > 0) {
      splash.classList.add('done');
      setTimeout(() => splash.remove(), 350);
    } else {
      requestAnimationFrame(check);
    }
  };
  requestAnimationFrame(check);
})();

// Register the service worker so the app is installable / works offline.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  });
}
