// 佑安服務日誌 Service Worker v41
// 策略：網路優先 + 自動更新，員工免手動清快取
// 安裝不快取大檔（iOS 相容），第一次成功載入才快取

const CACHE_NAME = 'youan-journal-v41';
const INDEX_URL = '/youan-journal/index.html';

// ── 安裝：不快取，確保 SW 一定安裝成功 ──
self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting()); // 立即接管
});

// ── 啟動：清除所有舊快取，立即接管所有分頁 ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ── 攔截請求 ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // API / Fonts 不攔截
  if (url.hostname.includes('script.google.com')) return;
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) return;

  const isAppPage =
    event.request.mode === 'navigate' ||
    url.pathname === '/youan-journal/' ||
    url.pathname === '/youan-journal/index.html';

  if (isAppPage) {
    // 網路優先：有網路一定拿最新版，順便更新快取；沒網路才用快取
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })  // no-store：強制抓最新，不吃瀏覽器快取
        .then(response => {
          if (response && response.ok) {
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
          return caches.match(INDEX_URL)
            .then(cached => cached || caches.match('/youan-journal/'));
        })
    );
  }
});
