import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { setTheme, getTheme } from '@utils/theme'

// Apply saved theme before first render to prevent flash
setTheme(getTheme());

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found in index.html');
createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register the service worker so the app is installable / works offline.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  });
}
