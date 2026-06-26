// 佑安服務日誌 Service Worker v35
// 修正：iOS Safari 大檔案快取問題
// 策略：安裝不快取（確保成功），第一次成功載入頁面時才寫入快取

const CACHE_NAME = 'youan-journal-v35';
const INDEX_URL = '/youan-journal/index.html';

// ── 安裝：不做任何快取，確保 SW 一定安裝成功 ──
self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

// ── 啟動：清除舊快取，立即接管 ──
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

  // 導向佑安日誌頁面的請求
  const isAppPage =
    event.request.mode === 'navigate' ||
    url.pathname === '/youan-journal/' ||
    url.pathname === '/youan-journal/index.html';

  if (isAppPage) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // 有網路：成功後寫入快取
          if (response.ok) {
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
          // 離線：從快取取出
          return caches.match(INDEX_URL)
            .then(cached => cached || caches.match('/youan-journal/'));
        })
    );
  }
});
