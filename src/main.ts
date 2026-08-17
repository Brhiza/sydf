import { createApp } from 'vue';
import { registerSW } from 'virtual:pwa-register';
import App from './App.vue';
import { createAppUpdateController } from './lib/appUpdate';
import { scheduleAfterPageLoad } from './lib/deferredWork';
import { prepareServiceWorkerUpdate } from './lib/serviceWorkerUpdate';
import './design-system/tokens.css';
import './styles.css';
import './design-system/primitives.css';

createApp(App).mount('#app');

let serviceWorkerRegistration: ServiceWorkerRegistration | undefined;

async function prepareWebUpdate() {
  const serviceWorker = navigator.serviceWorker;
  const registration = serviceWorkerRegistration || await serviceWorker?.getRegistration();
  if (!serviceWorker || !registration) throw new Error('service worker is unavailable');
  await prepareServiceWorkerUpdate(registration, serviceWorker);
}

if (import.meta.env.PROD) scheduleAfterPageLoad(() => {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      window.dispatchEvent(new CustomEvent('shiyue:pwa-update', { detail: { prepareUpdate: prepareWebUpdate } }));
    },
    // 页面会在新 Service Worker 确认接管后带版本参数刷新，避免插件过早刷新到旧缓存。
    onNeedReload() {
      // 由页面更新流程统一处理。
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
