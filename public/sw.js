/* h-orbit service worker — enables installability + light offline app-shell caching.
   Keep it conservative: only same-origin GET requests are touched so Supabase
   API/auth/storage calls (and any other cross-origin traffic) pass straight through. */

const CACHE = 'horbit-v4';

self.addEventListener('install', (event) => {
  // Precache the app shell so navigations have an offline fallback to serve.
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.add('/index.html')).catch(() => {})
  );
  // Activate this worker as soon as it finishes installing.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle same-origin GET. Everything else (POST, Supabase, etc.) is untouched.
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // SPA navigations: network-first, fall back to cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(CACHE);
          cache.put('/index.html', fresh.clone()).catch(() => {});
          return fresh;
        } catch {
          const cache = await caches.open(CACHE);
          return (await cache.match(request)) || (await cache.match('/index.html')) || Response.error();
        }
      })()
    );
    return;
  }

  // Static assets: stale-while-revalidate. Always resolve to a real Response —
  // never undefined (which would throw "Failed to convert value to 'Response'").
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request);
      if (cached) {
        // Refresh in the background; ignore failures.
        fetch(request)
          .then((res) => {
            if (res && res.ok && res.type === 'basic') cache.put(request, res.clone()).catch(() => {});
          })
          .catch(() => {});
        return cached;
      }
      try {
        const res = await fetch(request);
        if (res && res.ok && res.type === 'basic') cache.put(request, res.clone()).catch(() => {});
        return res;
      } catch {
        return Response.error();
      }
    })()
  );
});

/* ── Web Push ─────────────────────────────────────────────────────────────
   The `notify` Edge Function sends an encrypted JSON payload:
     { title, body, url?, tag? }
   We surface it as an OS notification and, on tap, focus an existing tab
   (navigating it to `url`) or open a new one. */

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'h-orbit';
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    lang: 'nl',
    data: { url: data.url || '/' },
    // A tag collapses repeat notifications from the same source (e.g. one
    // conversation) instead of stacking; renotify still alerts the user.
    tag: data.tag || undefined,
    renotify: data.tag ? true : undefined,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';
  const absolute = new URL(target, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of all) {
        if ('focus' in client) {
          await client.focus();
          if ('navigate' in client) {
            try { await client.navigate(absolute); } catch { /* cross-origin guard */ }
          }
          return;
        }
      }
      if (self.clients.openWindow) await self.clients.openWindow(absolute);
    })()
  );
});
