const CACHE_NAME = 'midnight-cafe-v1';
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
    './manifest.json'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS);
        }).catch(err => console.error("SW Install Error", err))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});
