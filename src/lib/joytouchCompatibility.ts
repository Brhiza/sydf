export const PREFERENCES_STORAGE_KEY = 'shiyue-preferences';
export const AUTO_FALLBACK_STORAGE_KEY = 'shiyue-android-compatibility-fallback';
export type JoytouchCompatibilityMode = 'auto' | 'standard' | 'compatibility';

type CompatibilityEnvironment = { nativeAndroid: boolean; userAgent: string; cssSupports?: (property: string, value: string) => boolean };

export function readStoredJoytouchCompatibilityMode(storage: Pick<Storage, 'getItem'>): JoytouchCompatibilityMode {
  try {
    const value = JSON.parse(storage.getItem(PREFERENCES_STORAGE_KEY) || '{}') as { joytouchCompatibility?: unknown; joytouchCompatibilityMode?: unknown };
    if (value.joytouchCompatibilityMode === 'standard' || value.joytouchCompatibilityMode === 'compatibility') return value.joytouchCompatibilityMode;
    if (value.joytouchCompatibility === true) return 'compatibility';
    if (value.joytouchCompatibility === false) return 'standard';
  } catch {
    // 损坏的偏好按自动模式处理。
  }
  return 'auto';
}

export function shouldEnableJoytouchCompatibility(mode: JoytouchCompatibilityMode, environment: CompatibilityEnvironment) {
  if (!environment.nativeAndroid || mode === 'standard') return false;
  if (mode === 'compatibility') return true;
  if (/HarmonyOS|OpenHarmony|ArkWeb|JoyTouch|Zhuoyi|DroiTong/i.test(environment.userAgent)) return true;
  const supports = environment.cssSupports;
  // 很旧的 WebView 没有可靠的 CSS.supports，本身就应进入稳定模式。
  return supports ? !supports('color', 'color-mix(in srgb, red 50%, transparent)') || (!supports('backdrop-filter', 'blur(1px)') && !supports('-webkit-backdrop-filter', 'blur(1px)')) : true;
}

export function isOpenedSidebarRenderBroken(rect: Pick<DOMRect, 'left' | 'right' | 'width'>) {
  return rect.width < 1 || rect.left < -2 || rect.right < 1;
}

export function isVisibleOverlayRenderBroken(rect: Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom' | 'width' | 'height'>, viewport: { width: number; height: number }) {
  return rect.width < 1 || rect.height < 1 || rect.right < 1 || rect.bottom < 1 || rect.left >= viewport.width || rect.top >= viewport.height;
}

export function applyJoytouchCompatibility(enabled: boolean, root: HTMLElement = document.documentElement) {
  root.classList.toggle('joytouch-compat', enabled);
}

export function resolveCurrentJoytouchCompatibility(mode: JoytouchCompatibilityMode, nativeAndroid: boolean) {
  return shouldEnableJoytouchCompatibility(mode, {
    nativeAndroid,
    userAgent: typeof navigator === 'undefined' ? '' : navigator.userAgent,
    cssSupports: typeof CSS === 'undefined' || typeof CSS.supports !== 'function' ? undefined : CSS.supports.bind(CSS),
  });
}

export function applyStoredJoytouchCompatibility(nativeAndroid: boolean) {
  const mode = typeof localStorage === 'undefined' ? 'auto' : readStoredJoytouchCompatibilityMode(localStorage);
  let rememberedFallback = false;
  try { rememberedFallback = mode === 'auto' && localStorage.getItem(AUTO_FALLBACK_STORAGE_KEY) === '1'; } catch { /* 存储不可用时只影响跨启动记忆。 */ }
  const enabled = rememberedFallback || resolveCurrentJoytouchCompatibility(mode, nativeAndroid);
  applyJoytouchCompatibility(enabled);
  return { enabled, mode };
}

export function clearRememberedAndroidFallback(storage: Pick<Storage, 'removeItem'> = localStorage) {
  try { storage.removeItem(AUTO_FALLBACK_STORAGE_KEY); } catch { /* 忽略禁用存储。 */ }
}

export function startAndroidCompatibilityMonitor(nativeAndroid: boolean) {
  if (!nativeAndroid || typeof MutationObserver === 'undefined') return () => undefined;
  const mode = readStoredJoytouchCompatibilityMode(localStorage);
  if (mode !== 'auto') return () => undefined;
  let timer = 0;
  const activate = () => {
    applyJoytouchCompatibility(true);
    try { localStorage.setItem(AUTO_FALLBACK_STORAGE_KEY, '1'); } catch { /* 当前会话仍可降级。 */ }
    window.dispatchEvent(new CustomEvent('shiyue:compatibility-change', { detail: { enabled: true } }));
  };
  const inspect = () => {
    timer = 0;
    const sidebar = document.querySelector<HTMLElement>('.sidebar.mobile-sidebar-open');
    if (sidebar && isOpenedSidebarRenderBroken(sidebar.getBoundingClientRect())) return activate();
    const overlays = document.querySelectorAll<HTMLElement>('.ui-dialog-layer > .ui-dialog, .onboarding-layer > *');
    for (const element of overlays) {
      if (isVisibleOverlayRenderBroken(element.getBoundingClientRect(), { width: window.innerWidth, height: window.innerHeight })) return activate();
    }
  };
  const schedule = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(inspect, 360);
  };
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { attributes: true, childList: true, subtree: true, attributeFilter: ['class', 'style'] });
  window.addEventListener('resize', schedule);
  return () => {
    observer.disconnect();
    window.removeEventListener('resize', schedule);
    window.clearTimeout(timer);
  };
}
