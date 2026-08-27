import { isNativeApp } from './nativeRuntime';

const ASSET_ORIGIN = 'https://sydf.cc';
// 清单随 APK 一起发布，离线启动时也能核对已经缓存的资源。
const MANIFEST_URL = '/theme-assets-manifest.json';
const CACHE_NAME = 'shiyue-theme-packages-v1';

type AssetFile = { path: string; bytes: number; hash: string };
type AssetPackage = { fingerprint: string; bytes: number; files: AssetFile[] };
type AssetManifest = { version: 1; packages: Record<string, AssetPackage> };
export type ThemeAssetProgress = { packageId: string; loadedBytes: number; totalBytes: number; completedFiles: number; totalFiles: number };

let manifestPromise: Promise<AssetManifest> | null = null;
let cleanupPromise: Promise<void> | null = null;
const assetIndex = new Map<string, AssetFile>();

export function themeAssetUrl(path: string, hash: string) {
  return `${ASSET_ORIGIN}${path}?asset=${encodeURIComponent(hash)}`;
}

async function loadManifest() {
  manifestPromise ||= fetch(MANIFEST_URL, { cache: 'no-store' }).then(async (response) => {
    if (!response.ok) throw new Error('主题资源清单暂时不可用');
    const manifest = await response.json() as AssetManifest;
    if (manifest.version !== 1 || !manifest.packages) throw new Error('主题资源清单格式错误');
    for (const assetPackage of Object.values(manifest.packages)) for (const file of assetPackage.files) assetIndex.set(file.path, file);
    return manifest;
  }).catch((error) => { manifestPromise = null; throw error; });
  return manifestPromise;
}

export function packageIdForTheme(themeId: string) { return `theme:${themeId}`; }
export function packageIdForDeck(deckId: string) { return `deck:${deckId}`; }

export function runtimeThemeAssetUrl(path: string) {
  if (!isNativeApp() || path.startsWith('/divination-themes/yue/')) return path;
  const file = assetIndex.get(path);
  return file ? themeAssetUrl(file.path, file.hash) : `${ASSET_ORIGIN}${path}`;
}

async function cleanupOutdatedAssets(cache: Cache) {
  cleanupPromise ||= (async () => {
    for (const request of await cache.keys()) {
      const url = new URL(request.url);
      const current = assetIndex.get(url.pathname);
      if (!current || url.searchParams.get('asset') !== current.hash) await cache.delete(request);
    }
  })();
  await cleanupPromise;
}

export async function ensureThemeAssetPackage(packageId: string, onProgress?: (progress: ThemeAssetProgress) => void) {
  if (!isNativeApp()) return;
  if (packageId === 'theme:yue') return;
  const manifest = await loadManifest();
  const assetPackage = manifest.packages[packageId];
  if (!assetPackage) throw new Error('没有找到对应的主题资源');
  const cache = await caches.open(CACHE_NAME);
  await cleanupOutdatedAssets(cache);
  let loadedBytes = 0;
  let completedFiles = 0;
  const pending: AssetFile[] = [];
  for (const file of assetPackage.files) {
    const url = themeAssetUrl(file.path, file.hash);
    if (await cache.match(url)) { loadedBytes += file.bytes; completedFiles += 1; }
    else pending.push(file);
  }
  if (pending.length && !navigator.onLine) throw new Error('当前处于离线状态，无法下载主题');
  const report = () => onProgress?.({ packageId, loadedBytes, totalBytes: assetPackage.bytes, completedFiles, totalFiles: assetPackage.files.length });
  report();
  let cursor = 0;
  const worker = async () => {
    while (cursor < pending.length) {
      const file = pending[cursor++];
      if (!file) return;
      const url = themeAssetUrl(file.path, file.hash);
      // 同时写入 WebView 的 HTTP 缓存与 Cache Storage；图片随后使用同一哈希 URL。
      const response = await fetch(url, { cache: 'force-cache' });
      if (!response.ok) throw new Error(`主题资源下载失败（${response.status}）`);
      await cache.put(url, response);
      loadedBytes += file.bytes;
      completedFiles += 1;
      report();
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, pending.length) }, worker));
}
