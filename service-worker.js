/**
 * Family Bank — service-worker.js
 *
 * This is a minimal service worker. Its only job is to make the app
 * installable to the home screen (PWA requirement).
 *
 * It does NOT cache API calls to Google Sheets — we always want
 * live data. It only caches the app shell (HTML, images) so the
 * loading screen appears instantly even on slow connections.
 */

const CACHE_NAME = 'family-bank-v2';

const SHELL_FILES = [
  '/dfb.github.io/',
  '/dfb.github.io/index.html',
  '/dfb.github.io/images/icon.png',
  '/dfb.github.io/images/logo.png',
  '/dfb.github.io/images/banner.png'
];

// Install: cache the app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Use individual requests so one missing image doesn't break install
      return Promise.allSettled(
        SHELL_FILES.map(url => cache.add(url).catch(() => {}))
      );
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: serve from cache for shell files, always network for API calls
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Always go to network for Google Apps Script API calls
  if (url.includes('script.google.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // For everything else: try network first, fall back to cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache fresh responses for shell files
        if (response.ok && !url.includes('fonts.googleapis')) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Network failed — serve from cache if available
        return caches.match(event.request);
      })
  );
});
