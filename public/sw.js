'use strict';

var APP_CACHE_PREFIXES = ['workbox-precache-', 'shiyue-app-assets-'];

self.addEventListener('install', function (event) {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', function (event) {
  event.waitUntil((async function () {
    await self.clients.claim();

    var cacheNames = await self.caches.keys().catch(function () { return []; });
    await Promise.allSettled(cacheNames
      .filter(function (name) {
        return APP_CACHE_PREFIXES.some(function (prefix) { return name.indexOf(prefix) === 0; });
      })
      .map(function (name) { return self.caches.delete(name); }));

    await self.registration.unregister().catch(function () { return false; });

    var clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    await Promise.allSettled(clients.map(function (client) {
      return client.navigate(client.url);
    }));
  })());
});
