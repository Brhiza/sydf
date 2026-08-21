import {
  DIVINATION_THEME_ASSET_VERSION,
  activeDivinationDeckSelections,
  activeDivinationThemeId,
  getNumberedThemeCardImageUrl,
  getTarotCardBackUrl,
  getTarotThemeImageUrl,
  getWesternThemeCardImageUrl,
} from './divinationTheme';
import { isNativeApp } from './nativeRuntime';

const CARD_IMAGE_CACHE_NAME = 'shiyue-divination-theme-images-v7';
const LEGACY_CARD_IMAGE_CACHE_NAMES = ['shiyue-divination-theme-images-v5', 'shiyue-divination-theme-images-v6'];
const THEME_CHANGE_EVENT = 'shiyue:divination-theme-change';

type NetworkInformationLike = {
  effectiveType?: string;
  saveData?: boolean;
};

type NavigatorWithConnection = Navigator & {
  connection?: NetworkInformationLike;
  mozConnection?: NetworkInformationLike;
  webkitConnection?: NetworkInformationLike;
};

type IdleCapableWindow = Window & typeof globalThis & {
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
};

let warmupStarted = false;
let warmupController: AbortController | null = null;
let warmupThemeId = '';

export function getActiveCardImageWarmupUrls() {
  return [
    getTarotCardBackUrl(),
    ...Array.from({ length: 78 }, (_, index) => getTarotThemeImageUrl(index)),
    ...Array.from({ length: 36 }, (_, index) => getWesternThemeCardImageUrl('lenormand', index + 1)),
    ...Array.from({ length: 60 }, (_, index) => getWesternThemeCardImageUrl('oracle', index + 1)),
    ...Array.from({ length: 64 }, (_, index) => getNumberedThemeCardImageUrl('hexagrams', index + 1)),
    ...Array.from({ length: 92 }, (_, index) => getNumberedThemeCardImageUrl('ssgw', index + 1)),
  ];
}

function networkConnection() {
  const browserNavigator = navigator as NavigatorWithConnection;
  return browserNavigator.connection || browserNavigator.mozConnection || browserNavigator.webkitConnection;
}

function shouldAvoidBackgroundDownload() {
  return networkConnection()?.saveData === true || navigator.onLine === false;
}

function requestGapMs() {
  const effectiveType = networkConnection()?.effectiveType || '';
  if (effectiveType.includes('2g')) return 1_000;
  if (effectiveType === '3g') return 450;
  return 160;
}

function waitForIdle() {
  const browserWindow = window as IdleCapableWindow;
  return new Promise<void>((resolve) => {
    if (browserWindow.requestIdleCallback) {
      browserWindow.requestIdleCallback(() => resolve(), { timeout: 1_500 });
    } else {
      window.setTimeout(resolve, 60);
    }
  });
}

function waitBetweenRequests(signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const timer = window.setTimeout(resolve, requestGapMs());
    signal.addEventListener('abort', () => {
      window.clearTimeout(timer);
      resolve();
    }, { once: true });
  });
}

async function removeOutdatedCardImages(cache: Cache) {
  const requests = await cache.keys();
  await Promise.all(requests.map(async (request) => {
    const url = new URL(request.url);
    const isThemeCard = url.pathname.startsWith('/divination-themes/') && url.pathname.includes('/cards/');
    const isCustomDeckCard = url.pathname.startsWith('/card-decks/');
    if (!isThemeCard && !isCustomDeckCard) return;
    if (url.searchParams.get('v') === DIVINATION_THEME_ASSET_VERSION) return;
    await cache.delete(request);
  }));
}

async function warmActiveCardImages(signal: AbortSignal) {
  if (shouldAvoidBackgroundDownload() || typeof caches === 'undefined') return;
  await Promise.all(LEGACY_CARD_IMAGE_CACHE_NAMES.map(cacheName => caches.delete(cacheName)));
  const cache = await caches.open(CARD_IMAGE_CACHE_NAME);
  await removeOutdatedCardImages(cache);
  const urls = getActiveCardImageWarmupUrls();
  for (const relativeUrl of urls) {
    if (signal.aborted || shouldAvoidBackgroundDownload()) return;
    const url = new URL(relativeUrl, window.location.origin).href;
    if (await cache.match(url)) continue;
    await waitForIdle();
    if (signal.aborted) return;
    try {
      const response = await fetch(url, {
        cache: 'force-cache',
        credentials: 'same-origin',
        priority: 'low',
        signal,
      } as RequestInit & { priority: 'low' });
      if (response.ok) await cache.put(url, response);
    } catch {
      if (signal.aborted) return;
      // 单张下载失败不阻断其他牌面；下次页面启动会继续补齐缺失缓存。
    }
    await waitBetweenRequests(signal);
  }
}

function beginWarmup() {
  if (shouldAvoidBackgroundDownload()) return;
  const themeId = `${activeDivinationThemeId.value}:${JSON.stringify(activeDivinationDeckSelections.value)}`;
  if (warmupController && !warmupController.signal.aborted && warmupThemeId === themeId) return;
  warmupController?.abort();
  warmupThemeId = themeId;
  warmupController = new AbortController();
  void warmActiveCardImages(warmupController.signal);
}

export function startCardImageCacheWarmup() {
  // APK 由完整资源包下载器负责，避免同一批牌图进入两套缓存。
  if (warmupStarted || typeof window === 'undefined' || isNativeApp()) return;
  warmupStarted = true;
  window.addEventListener(THEME_CHANGE_EVENT, beginWarmup);
  window.addEventListener('online', beginWarmup);
  beginWarmup();
}
