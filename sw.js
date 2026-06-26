// 佑安服務日誌 Service Worker v33
// 功能：快取 index.html，讓照服員沒網路時也能開啟頁面

const CACHE_NAME = 'youan-journal-v33';
const CACHED_URLS = [
  '/youan-journal/',
  '/youan-journal/index.html',
];

// ── 安裝：快取 index.html ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CACHED_URLS);
    }).then(() => {
      // 立刻接管，不等舊 SW 過期
      return self.skipWaiting();
    })
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

  // Google Apps Script API 不快取（每次都要打後端）
  if (url.hostname.includes('script.google.com')) {
    return; // 讓瀏覽器正常處理
  }

  // Google Fonts 不快取
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    return;
  }

  // index.html：網路優先，失敗則用快取（Stale-While-Revalidate 概念）
  if (url.pathname === '/youan-journal/' || url.pathname === '/youan-journal/index.html') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // 更新快取（背景靜默更新）
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          // 網路失敗，回傳快取
          return caches.match(event.request);
        })
    );
    return;
  }

  // 其他請求：正常走網路
});
