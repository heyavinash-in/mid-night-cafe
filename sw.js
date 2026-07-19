const CACHE_NAME = 'midnight-cafe-v3';
const ASSETS = [
    './',
    './index.html',
    './home.html',
    './chat.html',
    './style.css',
    './onboarding.js',
    './home.js',
    './chat.js',
    './crypto.js',
    './icon.jpg',
    './chat_bg.jpg',
    './manifest.json',
    './script.js'
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
