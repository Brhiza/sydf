(function () {
  'use strict';

  var STORAGE_KEY = 'shiyue:startup-recovery';
  var RECOVERY_WINDOW_MS = 10 * 60 * 1000;
  var MAX_AUTOMATIC_ATTEMPTS = 2;
  var CLEANUP_TIMEOUT_MS = 4 * 1000;
  var RECOVERY_BRIDGE = 'https://sydf.pages.dev/api/recover';
  var recovering = false;

  function queryAttempt() {
    try {
      return Math.max(0, Number(new URL(location.href).searchParams.get('__recoveryAttempt')) || 0);
    } catch (_) {
      return 0;
    }
  }

  function readState() {
    try {
      var value = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
      if (!value || typeof value.at !== 'number' || Date.now() - value.at > RECOVERY_WINDOW_MS) {
        return { attempts: queryAttempt(), at: Date.now() };
      }
      return { attempts: Math.max(Number(value.attempts) || 0, queryAttempt()), at: value.at };
    } catch (_) {
      return { attempts: queryAttempt(), at: Date.now() };
    }
  }

  function writeState(state) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {
      // 隐私模式禁用会话存储时，地址中的次数仍能阻止自动循环。
    }
  }

  function clearState() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (_) {
      // 存储不可用不影响应用启动。
    }
  }

  function assetUrl(value) {
    try {
      var url = new URL(value, location.href);
      return url.origin === location.origin && url.pathname.indexOf('/assets/') === 0;
    } catch (_) {
      return false;
    }
  }

  function isAssetLoadError(event) {
    var target = event && event.target;
    if (target instanceof HTMLScriptElement) return assetUrl(target.src);
    if (target instanceof HTMLLinkElement) return assetUrl(target.href);
    return false;
  }

  function isDynamicImportError(reason) {
    var message = reason && typeof reason.message === 'string' ? reason.message : String(reason || '');
    return /dynamically imported module|module script|importing a module|failed to fetch.*module/i.test(message);
  }

  function renderMessage(message, withButton) {
    var app = document.getElementById('app');
    if (!app) return;
    if (!withButton && app.childElementCount) return;
    var panel = document.createElement('div');
    panel.setAttribute('role', withButton ? 'alert' : 'status');
    panel.style.cssText = 'box-sizing:border-box;max-width:420px;margin:18vh auto;padding:24px;text-align:center;font:15px/1.7 system-ui,sans-serif;color:#3d3448';
    var text = document.createElement('p');
    text.textContent = message;
    panel.appendChild(text);
    if (withButton) {
      var button = document.createElement('button');
      button.type = 'button';
      button.textContent = '重新加载';
      button.style.cssText = 'border:0;border-radius:999px;padding:10px 20px;background:#765b9e;color:white;font:inherit;cursor:pointer';
      button.addEventListener('click', function () {
        button.disabled = true;
        button.textContent = '正在重新加载…';
        clearState();
        recovering = false;
        void recover(true);
      });
      panel.appendChild(button);
    }
    app.replaceChildren(panel);
  }

  async function clearBrokenAppState() {
    if ('serviceWorker' in navigator) {
      var registrations = await navigator.serviceWorker.getRegistrations().catch(function () { return []; });
      await Promise.allSettled(registrations.map(function (registration) {
        return registration.unregister();
      }));
    }
    if ('caches' in window) {
      var names = await caches.keys().catch(function () { return []; });
      await Promise.allSettled(names
        .filter(function (name) {
          return name.indexOf('workbox-precache-') === 0 || name.indexOf('shiyue-app-assets-') === 0;
        })
        .map(function (name) { return caches.delete(name); }));
    }
  }

  function withTimeout(promise, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () { reject(new Error('recovery timeout')); }, timeoutMs);
      Promise.resolve(promise).then(function (value) {
        clearTimeout(timer);
        resolve(value);
      }, function (error) {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  function recoveryUrl(attempt) {
    var current = new URL(location.href);
    if (current.protocol === 'https:' && (current.hostname === 'sydf.cc' || current.hostname === 'www.sydf.cc')) {
      var bridge = new URL(RECOVERY_BRIDGE);
      bridge.searchParams.set('v', String(Date.now()));
      bridge.searchParams.set('attempt', String(attempt));
      return bridge;
    }
    current.searchParams.delete('__update');
    current.searchParams.delete('__recovered');
    current.searchParams.set('__recoveryAttempt', String(attempt));
    return current;
  }

  async function recover(force) {
    if (recovering) return;
    recovering = true;
    var state = force ? { attempts: 0, at: Date.now() } : readState();
    if (!force && state.attempts >= MAX_AUTOMATIC_ATTEMPTS) {
      renderMessage('页面资源更新未完成，请重新加载。', true);
      recovering = false;
      return;
    }
    var attempt = state.attempts + 1;
    writeState({ attempts: attempt, at: state.at });
    renderMessage('正在恢复最新版本…', false);
    await withTimeout(clearBrokenAppState(), CLEANUP_TIMEOUT_MS).catch(function () {});
    location.replace(recoveryUrl(attempt).toString());
  }

  window.addEventListener('error', function (event) {
    if (isAssetLoadError(event)) void recover(false);
  }, true);
  window.addEventListener('unhandledrejection', function (event) {
    if (isDynamicImportError(event.reason)) void recover(false);
  });

  window.__SHIYUE_STARTUP_RECOVERY__ = {
    markReady: function () {
      clearState();
      var url = new URL(location.href);
      var changed = false;
      ['__update', '__recover', '__recovered', '__recoveryAttempt'].forEach(function (name) {
        if (!url.searchParams.has(name)) return;
        url.searchParams.delete(name);
        changed = true;
      });
      if (changed) history.replaceState(history.state, '', url.toString());
    },
  };

  // 新版脚本即使由旧页面壳加载，也会主动完成一次迁移，不等资源先报错。
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) void recover(false);
})();
