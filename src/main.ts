import { createApp } from 'vue';
import App from './App.vue';
import { createAppUpdateController } from './lib/appUpdate';
import { scheduleAfterPageLoad } from './lib/deferredWork';
import { initializeNativeRuntime, isNativeAndroidApp, isNativeApp } from './lib/nativeRuntime';
import { applyStoredJoytouchCompatibility, startAndroidCompatibilityMonitor } from './lib/joytouchCompatibility';
import './design-system/tokens.css';
import './styles.css';
import './design-system/primitives.css';

applyStoredJoytouchCompatibility(isNativeAndroidApp());
createApp(App).mount('#app');
startAndroidCompatibilityMonitor(isNativeAndroidApp());
void initializeNativeRuntime();

type StartupRecoveryBridge = { markReady?: () => void };
(window as Window & { __SHIYUE_STARTUP_RECOVERY__?: StartupRecoveryBridge })
  .__SHIYUE_STARTUP_RECOVERY__?.markReady?.();

async function prepareWebUpdate() {
  const cleanup = (async () => {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.allSettled(registrations.map((registration) => registration.unregister()));
    }
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.allSettled(names
        .filter((name) => name.startsWith('workbox-precache-') || name.startsWith('shiyue-app-assets-'))
        .map((name) => caches.delete(name)));
    }
  })();
  await Promise.race([
    cleanup.catch(() => undefined),
    new Promise<void>((resolve) => window.setTimeout(resolve, 4_000)),
  ]);
}

if (import.meta.env.PROD) scheduleAfterPageLoad(() => {
  if (isNativeApp()) {
    void Promise.all([
      import('@capacitor/app'),
      import('@capacitor/app-launcher'),
      import('./lib/nativeAppUpdate'),
    ]).then(async ([{ App }, { AppLauncher }, { createNativeAppUpdateController }]) => {
      const info = await App.getInfo();
      createNativeAppUpdateController({
        currentVersion: info.version,
        onUpdateAvailable(update) {
          window.dispatchEvent(new CustomEvent('shiyue:app-update', {
            detail: {
              kind: 'native',
              version: update.version,
              downloadRoutes: update.downloadRoutes,
              prepareUpdate: (downloadUrl?: string) => AppLauncher.openUrl({ url: downloadUrl || update.downloadUrl }),
            },
          }));
        },
      });
    }).catch(() => undefined);
    return;
  }
  createAppUpdateController({
    currentVersion: __APP_VERSION__,
    onUpdateAvailable(latestVersion) {
      window.dispatchEvent(new CustomEvent('shiyue:app-update', { detail: { kind: 'web', version: latestVersion, prepareUpdate: prepareWebUpdate } }));
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
