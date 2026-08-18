(function () {
  'use strict';

  var RETIREMENT_KEY = 'shiyue:sw-retirement-v2';

  function technicalUrl() {
    var url = new URL(location.href);
    ['__update', '__recover', '__recovered', '__recoveryAttempt'].forEach(function (name) {
      url.searchParams.delete(name);
    });
    return url;
  }

  async function clearOldAppState() {
    var registrations = await navigator.serviceWorker.getRegistrations().catch(function () { return []; });
    await Promise.allSettled(registrations.map(function (registration) {
      return registration.unregister();
    }));

    if (!('caches' in window)) return;
    var names = await caches.keys().catch(function () { return []; });
    await Promise.allSettled(names
      .filter(function (name) {
        return name.indexOf('workbox-precache-') === 0 || name.indexOf('shiyue-app-assets-') === 0;
      })
      .map(function (name) { return caches.delete(name); }));
  }

  async function retireOldWorker() {
    try {
      if (sessionStorage.getItem(RETIREMENT_KEY)) return;
      sessionStorage.setItem(RETIREMENT_KEY, '1');
    } catch (_) {
      // 隐私模式禁用会话存储时仍执行当前一次退役。
    }

    var registrations = await navigator.serviceWorker.getRegistrations().catch(function () { return []; });
    await Promise.allSettled(registrations.map(function (registration) {
      return registration.update();
    }));

    // 当前 /sw.js 会自行接管、清缓存并注销；短暂等待后执行同域兜底。
    await new Promise(function (resolve) { window.setTimeout(resolve, 1500); });
    await clearOldAppState();
    var url = technicalUrl();
    url.searchParams.set('__update', String(Date.now()));
    location.replace(url.toString());
  }

  window.__SHIYUE_STARTUP_RECOVERY__ = {
    markReady: function () {
      try {
        sessionStorage.removeItem(RETIREMENT_KEY);
        sessionStorage.removeItem('shiyue:startup-recovery');
      } catch (_) {
        // 存储不可用不影响应用启动。
      }
      var current = new URL(location.href);
      var clean = technicalUrl();
      if (clean.toString() !== current.toString()) {
        history.replaceState(history.state, '', clean.toString());
      }
    },
  };

  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    void retireOldWorker();
  }
})();
