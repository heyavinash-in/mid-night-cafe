const CACHE_NAME = 'midnight-cafe-v14';
const ASSETS = [
    './',
    './index.html',
    './onboarding.html',
    './home.html',
    './chat.html',
    './style.css',
    './script.js',
    './onboarding.js',
    './home.js',
    './chat.js',
    './icon.jpg',
    './chat_bg.jpg',
    './manifest.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS);
        }).catch(err => console.error("SW Install Error", err))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});
