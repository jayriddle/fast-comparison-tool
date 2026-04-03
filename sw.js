// Keep in sync with APP_VERSION in index.html
const CACHE_NAME = 'warpdiff-v3.8.4';
const ASSETS = ['./', 'index.html', 'js/audio-viz.js', 'js/scopes.js', 'js/hotkeys.js', 'js/starfield.js', 'favicon-32.png', 'icon-192.png', 'icon-512.png', 'manifest.json'];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Inject COOP/COEP headers on HTML responses so SharedArrayBuffer is available.
// Required by ffmpeg.wasm (in-browser transcoding). Works on GitHub Pages and
// basic local servers that don't support custom response headers.
function withCOI(res) {
    const ct = res.headers.get('Content-Type') || '';
    if (!ct.includes('text/html')) return res;
    const h = new Headers(res.headers);
    h.set('Cross-Origin-Opener-Policy', 'same-origin');
    h.set('Cross-Origin-Embedder-Policy', 'require-corp');
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}

self.addEventListener('fetch', e => {
    // Only cache same-origin navigation/asset requests
    if (e.request.method !== 'GET') return;
    const url = new URL(e.request.url);
    if (url.origin !== self.location.origin) return;

    // Network-first: try fresh copy, fall back to cache
    e.respondWith(
        fetch(e.request)
            .then(res => {
                const clone = res.clone();
                caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
                return withCOI(res);
            })
            .catch(() => caches.match(e.request).then(r => r ? withCOI(r) : undefined))
    );
});
