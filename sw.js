// Magic Training - Service Worker с локальным кэшированием видео
const CACHE_NAME = 'magic-training-v2';
const VIDEO_CACHE_NAME = 'magic-training-local-videos';

// Файлы для кэширования при установке
const STATIC_ASSETS = [
  '/MagicTraining/',
  '/MagicTraining/index.html',
  '/MagicTraining/manifest.json',
  '/MagicTraining/icons/icon-152.png',
  '/MagicTraining/icons/icon-192.png',
  '/MagicTraining/icons/icon-512.png'
];

// Установка Service Worker
self.addEventListener('install', event => {
  console.log('[Service Worker] Установка v2...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Кэшируем основные ресурсы');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] Установка завершена');
        return self.skipWaiting();
      })
  );
});

// Активация Service Worker
self.addEventListener('activate', event => {
  console.log('[Service Worker] Активация v2...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== VIDEO_CACHE_NAME) {
            console.log('[Service Worker] Удаляем старый кэш:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Активация завершена');
      return self.clients.claim();
    })
  );
});

// Обработка запросов
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Для локальных видео из кэша
  if (url.pathname.startsWith('/cache/')) {
    event.respondWith(handleLocalVideoRequest(event.request));
    return;
  }
  
  // Для Google Drive видео
  if (url.href.includes('drive.google.com/file/d/') && url.href.includes('/preview')) {
    event.respondWith(handleGoogleDriveRequest(event.request));
    return;
  }
  
  // Для остальных запросов
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then(response => {
          if (!response || response.status !== 200) {
            return response;
          }
          
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          
          return response;
        });
      })
  );
});

// Обработка запросов локальных видео
async function handleLocalVideoRequest(request) {
  const filename = request.url.split('/cache/')[1];
  console.log('[Service Worker] Запрос локального видео:', filename);
  
  try {
    // Пробуем получить из кэша
    const cache = await caches.open(VIDEO_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('[Service Worker] Локальное видео из кэша');
      return cachedResponse;
    }
    
    // Если нет в кэше, возвращаем 404
    return new Response('Video not found', { 
      status: 404,
      headers: { 'Content-Type': 'text/plain' }
    });
    
  } catch (error) {
    console.error('[Service Worker] Ошибка загрузки локального видео:', error);
    return new Response('Error loading video', { status: 500 });
  }
}

// Обработка Google Drive запросов
async function handleGoogleDriveRequest(request) {
  console.log('[Service Worker] Google Drive запрос:', request.url);
  
  try {
    const response = await fetch(request, {
      mode: 'no-cors',
      credentials: 'omit'
    });
    
    return response;
    
  } catch (error) {
    console.error('[Service Worker] Ошибка Google Drive:', error);
    
    return new Response(
      `
      <!DOCTYPE html>
      <html>
      <head><title>Видео недоступно</title></head>
      <body style="text-align: center; padding: 50px; background: #f2f2f7;">
        <h2 style="color: #333;">Видео временно недоступно</h2>
        <p style="color: #666;">Проверьте подключение к интернету</p>
      </body>
      </html>
      `,
      {
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}

// Обработка сообщений от клиента
self.addEventListener('message', event => {
  if (event.data.action === 'CACHE_VIDEOS') {
    console.log('[Service Worker] Получена команда кэширования видео');
    
    event.waitUntil(
      cacheVideosFromClient(event.data.videos)
    );
  }
});

// Кэширование видео от клиента
async function cacheVideosFromClient(videos) {
  console.log('[Service Worker] Кэшируем видео:', videos.length);
  
  const cache = await caches.open(VIDEO_CACHE_NAME);
  
  for (const video of videos) {
    try {
      console.log('[Service Worker] Загружаем:', video.filename);
      
      const response = await fetch(video.url);
      if (response.ok) {
        const cacheUrl = `/cache/${video.filename}`;
        await cache.put(cacheUrl, response);
        console.log('[Service Worker] Сохранено:', video.filename);
      }
    } catch (error) {
      console.error('[Service Worker] Ошибка загрузки видео:', video.filename, error);
    }
  }
  
  console.log('[Service Worker] Кэширование завершено');
}
