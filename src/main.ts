import { createApp } from 'vue';
import { registerSW } from 'virtual:pwa-register';
import App from './App.vue';
import { createAppUpdateController } from './lib/appUpdate';
import { scheduleAfterPageLoad } from './lib/deferredWork';
import './design-system/tokens.css';
import './styles.css';
import './design-system/primitives.css';

createApp(App).mount('#app');

let serviceWorkerRegistration: ServiceWorkerRegistration | undefined;

function waitForWorkerInstalled(worker: ServiceWorker) {
  if (worker.state === 'installed' || worker.state === 'activated') return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error('service worker install timeout')), 15_000);
    const handleStateChange = () => {
      if (worker.state === 'installed' || worker.state === 'activated') {
        window.clearTimeout(timeout);
        worker.removeEventListener('statechange', handleStateChange);
        resolve();
      } else if (worker.state === 'redundant') {
        window.clearTimeout(timeout);
        worker.removeEventListener('statechange', handleStateChange);
        reject(new Error('service worker install failed'));
      }
    };
    worker.addEventListener('statechange', handleStateChange);
  });
}

async function prepareWebUpdate() {
  const registration = serviceWorkerRegistration || await navigator.serviceWorker?.getRegistration();
  if (!registration) return;
  await registration.update();
  const worker = registration.installing;
  if (worker) await waitForWorkerInstalled(worker);
  const waiting = registration.waiting;
  if (!waiting) return;
  const controllerChanged = navigator.serviceWorker.controller
    ? new Promise<void>((resolve) => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }))
    : Promise.resolve();
  waiting.postMessage({ type: 'SKIP_WAITING' });
  await Promise.race([
    controllerChanged,
    new Promise<void>((resolve) => window.setTimeout(resolve, 5_000)),
  ]);
}

if (import.meta.env.PROD) scheduleAfterPageLoad(() => {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      window.dispatchEvent(new CustomEvent('shiyue:pwa-update', { detail: { updateSW } }));
    },
    onRegisteredSW(_swUrl, registration) {
      if (registration) serviceWorkerRegistration = registration;
    },
    onRegisterError(error) {
      console.error('PWA 注册失败', error);
    },
  });

  createAppUpdateController({
    currentVersion: __APP_VERSION__,
    onUpdateAvailable(latestVersion) {
      void serviceWorkerRegistration?.update();
      window.dispatchEvent(new CustomEvent('shiyue:web-update', { detail: { version: latestVersion, prepareUpdate: prepareWebUpdate } }));
    },
  });
}, {
  // 首屏和交互先完成，再开始 PWA 安装与版本检查，避免弱网下争抢连接。
  delayMs: 1_200,
  idleTimeoutMs: 5_000,
});

if (import.meta.env.PROD) scheduleAfterPageLoad(() => {
  void import('./lib/cardImageCache').then(({ startCardImageCacheWarmup }) => {
    startCardImageCacheWarmup();
  });
}, {
  // 先让页面、PWA 和用户操作稳定下来，再以单请求低优先级补齐牌面缓存。
  delayMs: 6_000,
  idleTimeoutMs: 12_000,
});
