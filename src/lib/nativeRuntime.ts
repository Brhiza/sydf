import { Capacitor } from '@capacitor/core';

export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

export async function initializeNativeRuntime() {
  if (!isNativeApp()) return;

  document.documentElement.classList.add('native-app', `native-${Capacitor.getPlatform()}`);

  const [{ App }, { AppLauncher }, { StatusBar, Style }] = await Promise.all([
    import('@capacitor/app'),
    import('@capacitor/app-launcher'),
    import('@capacitor/status-bar'),
  ]);

  const colorScheme = window.matchMedia('(prefers-color-scheme: dark)');
  const syncSystemBars = () => Promise.allSettled([
    StatusBar.setStyle({ style: colorScheme.matches ? Style.Dark : Style.Light }),
    StatusBar.setOverlaysWebView({ overlay: false }),
    StatusBar.setBackgroundColor({ color: colorScheme.matches ? '#201e25' : '#f3f2f5' }),
  ]);
  await syncSystemBars();
  colorScheme.addEventListener('change', () => void syncSystemBars());
  await App.addListener('appStateChange', ({ isActive }) => {
    document.documentElement.classList.toggle('native-app-paused', !isActive);
    if (isActive) void syncSystemBars();
  });

  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || !(event.target instanceof Element)) return;
    const anchor = event.target.closest<HTMLAnchorElement>('a[href]');
    if (!anchor || anchor.target !== '_blank') return;
    const url = new URL(anchor.href, window.location.href);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
    event.preventDefault();
    void AppLauncher.openUrl({ url: url.toString() });
  });

  await App.addListener('backButton', () => {
    const event = new CustomEvent('shiyue:native-back', { cancelable: true });
    if (!window.dispatchEvent(event)) return;
    const rootHashes = new Set(['', '#/', '#/tools']);
    if (!rootHashes.has(window.location.hash)) window.history.back();
    else void App.exitApp();
  });
}
