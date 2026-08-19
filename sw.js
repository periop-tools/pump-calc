/* Pump 速算 service worker
   ⚠️ 改了 index.html / app.js / icons 之後，一定要把下面版本號 +1 再 push，
      否則使用者手機會被舊快取蓋住，看不到新版。 */
const CACHE = 'pump-calc-v6';

const ASSETS = [
  './',
  './index.html',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-512-maskable.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* network-first：有網路時拿最新版並更新快取，沒網路時用快取（開刀房訊號差也能用）
   ⚠️ 一定要帶 cache:'no-cache'：GitHub Pages 回 Cache-Control: max-age=600，
      不強制回源驗證的話，修正版推上去後使用者最多 10 分鐘仍在跑舊程式碼。
      這是劑量計算工具，不能容忍「已經修好但手機還在用舊版」。 */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
