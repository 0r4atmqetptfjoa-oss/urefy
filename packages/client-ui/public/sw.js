// ════════════════════════════════════════════════════════════════════════════
// sw.js — UREfy · Service Worker v3
// Strategy: Cache-First Assets · SWR Navigation · Background Sync · Push
// ════════════════════════════════════════════════════════════════════════════

const VERSION = 'BUILD_VERSION';
const BOOTSTRAP_ASSETS = [];
const CACHE_CORE    = `urefy-core-${VERSION}`;
const CACHE_ASSETS  = `urefy-assets-${VERSION}`;
const CACHE_API     = `urefy-api-${VERSION}`;
const CACHE_FONTS   = `urefy-fonts-${VERSION}`;
const SYNC_QUEUE    = 'aetheris-sync-queue';

// Assets to precache on install (shell + fonts)
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
  ...BOOTSTRAP_ASSETS,
];

// Assets that are NEVER cached (live feeds, admin, push, auth endpoints, private vaults)
const NEVER_CACHE_PATTERNS = [
  /\/api\/ws/,
  /\/api\/analytics/,
  /oauth/,
  /\/api\/auth/,
  /\/api\/admin/,
  /\/api\/push/,
  /\/api\/cron-backup/,
  /\/api\/webauthn/,
  /\/api\/messages/,
  /\/api\/vault\/private/,
  /\/api\/storage/,
  /\/api\/interactions/,
  /\/api\/recovery/,
  /\/api\/report/,
  /\/admin\.html/,
];

// ─── INSTALL ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_CORE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// ─── ACTIVATE ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      // Retain one previous immutable-asset build for tabs that are still open.
      // API caches are not retained across releases (moderation/privacy freshness).
      const previousCore = keys.filter(k => k.startsWith('urefy-core-') && k !== CACHE_CORE).at(-1);
      const previousVersion = previousCore?.slice('urefy-core-'.length);
      const keep = [CACHE_CORE, CACHE_ASSETS, CACHE_API, CACHE_FONTS,
        ...(previousVersion ? [`urefy-assets-${previousVersion}`] : [])];
      return Promise.all(keys.filter(k => (k.startsWith('aetheris-') || k.startsWith('urefy-')) && !keep.includes(k)).map(k => caches.delete(k)));
    }).then(() => self.clients.claim())
  );
});

// ─── NAVIGATION PRELOAD ───────────────────────────────────────────────────────
// Parallelizes network fetch with SW boot for instant navigations
self.addEventListener('activate', (e) => {
  if (self.registration.navigationPreload) {
    e.waitUntil(self.registration.navigationPreload.enable());
  }
});

// ─── FETCH ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Skip never-cache patterns
  if (NEVER_CACHE_PATTERNS.some((p) => p.test(url.pathname))) return;

  // ── 1. Immutable hashed assets → Cache-First (instant on repeat visit) ──
  if (url.pathname.startsWith('/assets/') || url.pathname.match(/^\/assets-v\d+\//)) {
    e.respondWith(cacheFirst(req, CACHE_ASSETS));
    return;
  }

  // ── 2. Font requests → Cache-First (local fonts only) ───────────────────
  if (url.pathname.match(/\.(woff2?|ttf|otf|eot)$/)) {
    e.respondWith(cacheFirst(req, CACHE_FONTS));
    return;
  }

// Whitelist of explicitly approved public read-only endpoints that can be cached
const CACHEABLE_PUBLIC_API = [
  /^\/api\/posts(\?.*)?$/,
  /^\/api\/federation\/nodeinfo$/,
  /^\/api\/stats$/,
  /^\/api\/health$/,
];

  // ── 3. API requests → Safe-By-Default Network-Only, cache ONLY explicit public whitelist ──
  if (url.pathname.startsWith('/api/')) {
    const hasAuthHeaders = req.headers.has('authorization') || req.headers.has('x-sovereign-envelope') || req.headers.has('x-admin-pin');
    const isPublicCacheable = !hasAuthHeaders && CACHEABLE_PUBLIC_API.some((pattern) => pattern.test(url.pathname));
    if (isPublicCacheable) {
      e.respondWith(networkFirst(req, CACHE_API));
    } else {
      // Network-Only default for all other APIs, private routes, and unknown endpoints
      e.respondWith(
        fetch(req, { cache: 'no-store' }).catch(() =>
          new Response(JSON.stringify({ error: 'Endpoint unreachable or offline', success: false }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      );
    }
    return;
  }

  // ── 4. Navigation requests → Navigation Preload + SWR ────────────────────
  if (req.mode === 'navigate') {
    e.respondWith(navigationHandler(e, req));
    return;
  }

  // ── 5. Everything else → Stale-While-Revalidate ───────────────────────────
  e.respondWith(staleWhileRevalidate(req, CACHE_CORE));
});

// ─── STRATEGIES ───────────────────────────────────────────────────────────────

async function cacheFirst(req, cacheName) {
  const cached = await caches.match(req, { ignoreSearch: false, ignoreVary: true });
  if (cached) return cached;
  try {
    const res = await fetch(req);
    const cc = res?.headers?.get('cache-control') || '';
    if (res && res.status === 200 && !cc.includes('no-store') && !cc.includes('private')) {
      const cache = await caches.open(cacheName);
      cache.put(req, res.clone());
    }
    return res;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(req, cacheName) {
  try {
    const res = await fetch(req);
    const cc = res?.headers?.get('cache-control') || '';
    if (res && res.status === 200 && !cc.includes('no-store') && !cc.includes('private')) {
      const cache = await caches.open(cacheName);
      cache.put(req, res.clone());
    }
    return res;
  } catch {
    const cached = await caches.match(req);
    return cached || new Response(
      JSON.stringify({ offline: true, error: 'Operating in offline sovereign mode', ts: Date.now() }),
      { status: 200, headers: { 'Content-Type': 'application/json', 'X-SW-Offline': '1' } }
    );
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req).then((res) => {
    const cc = res?.headers?.get('cache-control') || '';
    if (res && res.status === 200 && !cc.includes('no-store') && !cc.includes('private')) cache.put(req, res.clone());
    return res;
  }).catch(() => cached);
  return cached || fetchPromise;
}

async function navigationHandler(e, req) {
  try {
    // Use navigation preload response if available (parallel with SW boot)
    const preloaded = e.preloadResponse ? await e.preloadResponse : null;
    const res = preloaded || await fetch(req);
    if (res && res.status === 200) {
      const cache = await caches.open(CACHE_CORE);
      cache.put(req, res.clone());
    }
    return res;
  } catch {
    const cached = await caches.match(req) || await caches.match('/index.html') || await caches.match('/');
    return cached || new Response('Offline', { status: 503 });
  }
}

// ─── BACKGROUND SYNC — Queue failed POST/mutations ────────────────────────────
self.addEventListener('sync', (e) => {
  if (e.tag === SYNC_QUEUE) {
    e.waitUntil(flushSyncQueue());
  }
});

async function flushSyncQueue() {
  const db = await openSyncDB();
  const items = await getAll(db, 'pending');
  for (const item of items) {
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body,
      });
      if (res.ok) await remove(db, 'pending', item.id);
    } catch {
      break; // Still offline — leave in queue
    }
  }
}

// ─── PUSH NOTIFICATIONS ────────────────────────────────────────────────────────
self.addEventListener('push', (e) => {
  if (!e.data) return;
  let data = {};
  try { data = e.data.json(); } catch { data = { title: 'UREfy', body: e.data.text() }; }

  e.waitUntil(
    self.registration.showNotification(data.title || 'UREfy', {
      body: data.body || '',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: data.tag || 'aetheris-notification',
      renotify: true,
      vibrate: [100, 50, 100],
      data: { url: data.url || '/' },
      actions: [
        { action: 'open', title: 'Open' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  if (e.action === 'dismiss') return;
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url === url && 'focus' in c);
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});

// ─── MESSAGES FROM MAIN THREAD ───────────────────────────────────────────────
self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (e.data?.type === 'CACHE_URLS' && Array.isArray(e.data.urls)) {
    caches.open(CACHE_ASSETS).then((c) => c.addAll(e.data.urls).catch(() => {}));
  }
  if (e.data?.type === 'PURGE_USER_DATA' || e.data?.type === 'LOGOUT') {
    e.waitUntil(
      caches.delete(CACHE_API).catch(() => {})
    );
  }
});

// ─── MINI IndexedDB helpers for sync queue ────────────────────────────────────
function openSyncDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('aetheris-sync', 1);
    req.onupgradeneeded = (e) => e.target.result.createObjectStore('pending', { keyPath: 'id', autoIncrement: true });
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = reject;
  });
}
function getAll(db, store) {
  return new Promise((res) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => res(req.result || []);
    req.onerror = () => res([]);
  });
}
function remove(db, store, id) {
  return new Promise((res) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(id);
    tx.oncomplete = res;
  });
}
