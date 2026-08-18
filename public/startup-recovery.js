(function () {
  'use strict';

  var STORAGE_KEY = 'shiyue:startup-recovery';
  var RECOVERY_WINDOW_MS = 10 * 60 * 1000;
  var MAX_AUTOMATIC_ATTEMPTS = 3;
  var CLEANUP_TIMEOUT_MS = 4 * 1000;
  var NETWORK_RECOVERY_TIMEOUT_MS = 8 * 1000;
  var recovering = false;

  function readState() {
    try {
      var value = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
      if (!value || typeof value.at !== 'number' || Date.now() - value.at > RECOVERY_WINDOW_MS) {
        return { attempts: 0, at: Date.now() };
      }
      return { attempts: Number(value.attempts) || 0, at: value.at };
    } catch (_) {
      return { attempts: 0, at: Date.now() };
    }
  }

  function writeState(state) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {
      // 隐私模式禁用会话存储时仍可完成当前一次恢复。
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

  function recoveryUrl() {
    var url = new URL(location.href);
    // 旧版本号只用于触发一次更新，恢复时移除，避免问题链接被继续传播。
    url.searchParams.delete('__update');
    url.searchParams.set('__recover', String(Date.now()));
    return url;
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

  async function fetchFreshShell(url) {
    var response = await withTimeout(fetch(url.toString(), {
      cache: 'no-store',
      headers: { Accept: 'text/html' },
    }), NETWORK_RECOVERY_TIMEOUT_MS);
    if (!response.ok) throw new Error('fresh shell request failed');
    var contentType = response.headers.get('content-type') || '';
    if (contentType.indexOf('text/html') < 0) throw new Error('fresh shell is not html');
    var html = await response.text();
    if (html.indexOf('id="app"') < 0 || !/\/assets\/app-[^"']+\.js/.test(html)) {
      throw new Error('fresh shell is invalid');
    }
    return html;
  }

  async function restartFromNetwork() {
    var url = recoveryUrl();
    try {
      // 先确认网络上已有完整的新页面壳，再执行一次真正的页面导航。
      // document.write 会让当前页面继续受旧 SW 控制，模块脚本仍可能从旧缓存读取并再次触发恢复。
      await fetchFreshShell(url);
      location.replace(url.toString());
    } catch (_) {
      // 网络较差时仍保留带随机参数的导航兜底，让浏览器自己的错误页提供重试机会。
      location.replace(url.toString());
    }
  }

  async function recover(force) {
    if (recovering) return;
    recovering = true;
    var state = readState();
    if (!force && state.attempts >= MAX_AUTOMATIC_ATTEMPTS) {
      renderMessage('页面资源更新未完成，请重新加载。', true);
      recovering = false;
      return;
    }
    writeState({ attempts: state.attempts + 1, at: state.at });
    renderMessage('正在恢复最新版本…', false);
    await withTimeout(clearBrokenAppState(), CLEANUP_TIMEOUT_MS).catch(function () {});
    await restartFromNetwork();
  }

  window.addEventListener('error', function (event) {
    if (isAssetLoadError(event)) void recover();
  }, true);
  window.addEventListener('unhandledrejection', function (event) {
    if (isDynamicImportError(event.reason)) void recover();
  });

  window.__SHIYUE_STARTUP_RECOVERY__ = {
    markReady: function () {
      clearState();
      var url = new URL(location.href);
      if (!url.searchParams.has('__recover')) return;
      url.searchParams.delete('__recover');
      history.replaceState(history.state, '', url.toString());
    },
  };
})();
