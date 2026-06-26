// 佑安服務日誌 Service Worker v34
// 修正：iOS Safari 離線快取相容性

const CACHE_NAME = 'youan-journal-v34';
const INDEX_URL = '/youan-journal/index.html';

// ── 安裝：主動抓取並快取 index.html ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // 直接 fetch index.html，同時存入兩個 key
      // 避免 iOS Safari 因 URL 不完全匹配而找不到快取
      return fetch(INDEX_URL, { cache: 'reload' })
        .then(response => {
          if (!response.ok) throw new Error('fetch failed');
          const r1 = response.clone();
          const r2 = response.clone();
          return Promise.all([
            cache.put(INDEX_URL, r1),
            cache.put('/youan-journal/', r2),
          ]);
        })
        .catch(err => {
          console.warn('[SW] install cache failed:', err);
        });
    }).then(() => self.skipWaiting())
  );
});

// ── 啟動：清除舊快取 ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── 攔截請求 ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // API / Fonts 不攔截
  if (url.hostname.includes('script.google.com')) return;
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) return;

  // 所有導向佑安日誌頁面的 navigation 請求
  const isAppPage =
    event.request.mode === 'navigate' ||
    url.pathname === '/youan-journal/' ||
    url.pathname === '/youan-journal/index.html';

  if (isAppPage) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            // 成功：更新快取，同時存兩個 key
            const r1 = response.clone();
            const r2 = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(INDEX_URL, r1);
              cache.put('/youan-journal/', r2);
            });
          }
          return response;
        })
        .catch(() => {
          // 離線：從快取取出（優先 index.html key）
          return caches.match(INDEX_URL)
            .then(cached => cached || caches.match('/youan-journal/'));
        })
    );
  }
});
