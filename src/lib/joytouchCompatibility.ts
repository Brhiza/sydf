export const PREFERENCES_STORAGE_KEY = 'shiyue-preferences';
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
  const enabled = resolveCurrentJoytouchCompatibility(mode, nativeAndroid);
  applyJoytouchCompatibility(enabled);
  return { enabled, mode };
}
