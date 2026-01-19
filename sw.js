// Magic Training - Service Worker
const CACHE_NAME = 'magic-training-v1';
const VIDEO_CACHE_NAME = 'magic-training-videos-v1';

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
  console.log('[Service Worker] Установка...');
  
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
  console.log('[Service Worker] Активация...');
  
  // Очистка старых кэшей
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
  
  // Для видео используем стратегию "Cache First, затем Network"
  if (event.request.url.includes('.mp4')) {
    console.log('[Service Worker] Запрос видео:', url.pathname);
    
    event.respondWith(
      caches.open(VIDEO_CACHE_NAME).then(cache => {
        return cache.match(event.request).then(cachedResponse => {
          // Если видео есть в кэше, возвращаем его
          if (cachedResponse) {
            console.log('[Service Worker] Видео из кэша:', url.pathname);
            return cachedResponse;
          }
          
          // Если нет в кэше, загружаем из сети
          console.log('[Service Worker] Загрузка видео из сети:', url.pathname);
          return fetch(event.request).then(networkResponse => {
            // Сохраняем в кэш для будущего использования
            if (networkResponse.ok) {
              console.log('[Service Worker] Сохраняем видео в кэш:', url.pathname);
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(error => {
            console.log('[Service Worker] Ошибка загрузки видео:', url.pathname, error);
            // Возвращаем заглушку для видео
            return new Response(
              JSON.stringify({ 
                error: 'Видео недоступно',
                message: 'Проверьте подключение к интернету' 
              }),
              {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          });
        });
      })
    );
    return;
  }
  
  // Для HTML-страниц - "Network First, затем Cache"
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Обновляем кэш
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, response.clone());
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Фолбэк для офлайн-режима
            return caches.match('/MagicTraining/');
          });
        })
    );
    return;
  }
  
  // Для остальных ресурсов - "Cache First"
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then(response => {
          // Не кэшируем большие файлы или ненужные ресурсы
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Сохраняем в кэш
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          
          return response;
        });
      })
  );
});

// Фоновые задачи
self.addEventListener('message', event => {
  if (event.data.action === 'CACHE_VIDEOS') {
    const videos = event.data.videos;
    console.log('[Service Worker] Фоновое кэширование видео:', videos.length);
    
    event.waitUntil(
      caches.open(VIDEO_CACHE_NAME).then(cache => {
        return Promise.all(
          videos.map(videoUrl => {
            return fetch(videoUrl)
              .then(response => {
                if (response.ok) {
                  return cache.put(videoUrl, response);
                }
              })
              .catch(error => {
                console.log('[Service Worker] Ошибка кэширования видео:', videoUrl, error);
              });
          })
        );
      })
    );
  }
});
