const CACHE_NAME = "vmax-chess-v2";
const OFFLINE_URL = "/";

self.addEventListener("install", (event) => {
  console.log("[Service Worker] Installed v2");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([OFFLINE_URL]);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[Service Worker] Activated v2");
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      ).then(() => clients.claim())
    })
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Bypass: server functions, external APIs (Lichess, Supabase, Groq, Gemini, jsDelivr)
  const bypassHosts = [
    "supabase.co", "lichess.org", "lichess.ovh",
    "groq.com", "googleapis.com", "jsdelivr.net",
    "explorer.lichess.ovh", "tablebase.lichess.ovh",
  ];
  if (
    url.pathname.startsWith("/_server") ||
    url.pathname.startsWith("/api/") ||
    bypassHosts.some((h) => url.host.includes(h))
  ) {
    return; // Let browser handle it natively — no SW interference
  }

  // Page navigation: network-first, fall back to cached shell
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(OFFLINE_URL).then(
          (res) =>
            res ||
            new Response(
              "<h1>Offline</h1><p>V-Max is unavailable without a connection.</p>",
              { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
            )
        )
      )
    );
    return;
  }

  // Stale-While-Revalidate for static assets only
  const isCacheable =
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".wasm") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".webp") ||
    url.pathname.endsWith(".woff2");

  // Pass through non-cacheable subresources without intercepting
  if (!isCacheable) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Background revalidation — MUST always resolve to a valid Response
      const networkFetch = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(
          // FIX: catch() MUST return a valid Response, not undefined
          () =>
            new Response("Resource unavailable offline.", {
              status: 503,
              headers: { "Content-Type": "text/plain" },
            })
        );

      // Serve cached version immediately; network update happens in background
      return cachedResponse || networkFetch;
    })
  );
});
