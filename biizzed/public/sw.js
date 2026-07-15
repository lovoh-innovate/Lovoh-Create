const CACHE_NAME = 'bizzzed-v2'; // bump this on every deploy that needs a cache reset

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Delete any cache that isn't the current version
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
      await clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Never cache navigation requests (HTML) — always go to network first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // Static assets: network-first, fall back to cache, update cache on success
  event.respondWith(
    fetch(request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// push handler unchanged
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const payload = event.data.json();
    const { title = 'New notification', body = '', data = {} } = payload || {};
    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        data,
        icon: '/biizzed-logo.png',
        badge: '/biizzed-logo.png',
      })
    );
  } catch (error) {
    console.error('Push event error:', error);
  }
});