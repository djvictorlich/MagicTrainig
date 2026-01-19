const CACHE_NAME = 'gym-cache-v3';
const ASSETS = [
  '/',
  'index.html',
  'manifest.json',
  'icon.png',
  // ДЕНЬ 1
  'videos/v1_1.mp4', 'videos/v1_2.mp4', 'videos/v1_3.mp4', 'videos/v1_4.mp4', 'videos/v1_5.mp4', 'videos/v1_6.mp4', 'videos/v1_7.mp4',
  // ДЕНЬ 2
  'videos/v2_1.mp4', 'videos/v2_2.mp4', 'videos/v2_3.mp4', 'videos/v2_4.mp4', 'videos/v2_5.mp4', 'videos/v2_6.mp4', 'videos/v2_7.mp4',
  // ДЕНЬ 3
  'videos/v3_1.mp4', 'videos/v3_2.mp4', 'videos/v3_3.mp4', 'videos/v3_4.mp4', 'videos/v3_5.mp4', 'videos/v3_6.mp4', 'videos/v3_7.mp4', 'videos/v3_8.mp4', 'videos/v3_9.mp4'
];

// При установке скачиваем всё в кэш
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Кэшируем видео и контент...');
      return cache.addAll(ASSETS);
    })
  );
});

// Отдаем файлы из кэша даже если нет сети
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});