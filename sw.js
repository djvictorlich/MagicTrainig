const CACHE_NAME = 'gym-cache-v4';

// При установке кэшируем только основные файлы
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['index.html', 'manifest.json', 'icon.png']);
    })
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Проверяем, запрашивается ли видео из папки videos
  if (url.pathname.includes('/video/')) {
    event.respondWith(handleVideo(event));
  } else {
    event.respondWith(
      caches.match(event.request).then((res) => res || fetch(event.request))
    );
  }
});

async function handleVideo(event) {
  const cache = await caches.open(CACHE_NAME);
  let response = await cache.match(event.request);

  if (!response) {
    // Если видео нет в кэше, скачиваем его
    response = await fetch(event.request);
    // Кэшируем копию
    cache.put(event.request, response.clone());
  }

  const range = event.request.headers.get('range');
  if (range) {
    const buffer = await response.arrayBuffer();
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : buffer.byteLength - 1;
    const chunk = buffer.slice(start, end + 1);

    return new Response(chunk, {
      status: 206,
      statusText: 'Partial Content',
      headers: {
        'Content-Range': `bytes ${start}-${end}/${buffer.byteLength}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunk.byteLength,
        'Content-Type': 'video/mp4'
      }
    });
  }

  return response;
}

