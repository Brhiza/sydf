export interface NativeReleaseUpdate {
  version: string;
  downloadUrl: string;
}

interface GithubReleasePayload {
  tag_name?: unknown;
  html_url?: unknown;
  draft?: unknown;
  prerelease?: unknown;
  assets?: Array<{ name?: unknown; browser_download_url?: unknown }>;
}

export interface NativeAppUpdateControllerOptions {
  currentVersion: string;
  checkIntervalMs?: number;
  checkThrottleMs?: number;
  fetchLatestRelease?: () => Promise<NativeReleaseUpdate | null>;
  onUpdateAvailable: (update: NativeReleaseUpdate) => void;
}

const RELEASE_API_URL = 'https://api.github.com/repos/Brhiza/sydf/releases/latest';
const DEFAULT_CHECK_INTERVAL = 30 * 60 * 1000;
const DEFAULT_CHECK_THROTTLE = 5 * 60 * 1000;

function versionParts(version: string) {
  return version.replace(/^v/i, '').split(/[.+-]/).map((part) => {
    const value = Number.parseInt(part, 10);
    return Number.isFinite(value) ? value : 0;
  });
}

export function isNewerAppVersion(latestVersion: string, currentVersion: string) {
  const latest = versionParts(latestVersion);
  const current = versionParts(currentVersion);
  const length = Math.max(latest.length, current.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (latest[index] ?? 0) - (current[index] ?? 0);
    if (difference !== 0) return difference > 0;
  }
  return false;
}

export async function fetchLatestNativeRelease(): Promise<NativeReleaseUpdate | null> {
  const response = await fetch(RELEASE_API_URL, {
    cache: 'no-store',
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('release request failed');
  const release = await response.json() as GithubReleasePayload;
  if (release.draft || release.prerelease || typeof release.tag_name !== 'string') return null;
  const apk = release.assets?.find((asset) => (
    typeof asset.name === 'string'
    && asset.name.toLowerCase().endsWith('.apk')
    && typeof asset.browser_download_url === 'string'
  ));
  const assetDownloadUrl = apk && typeof apk.browser_download_url === 'string' ? apk.browser_download_url : '';
  const downloadUrl = assetDownloadUrl || (typeof release.html_url === 'string' ? release.html_url : '');
  if (!downloadUrl) return null;
  return { version: release.tag_name.replace(/^v/i, ''), downloadUrl };
}

export function createNativeAppUpdateController(options: NativeAppUpdateControllerOptions) {
  const checkIntervalMs = options.checkIntervalMs ?? DEFAULT_CHECK_INTERVAL;
  const checkThrottleMs = options.checkThrottleMs ?? DEFAULT_CHECK_THROTTLE;
  const fetchLatestRelease = options.fetchLatestRelease ?? fetchLatestNativeRelease;
  let lastCheckedAt = 0;
  let updateFound = false;
  let checking: Promise<void> | null = null;

  const check = (force = false) => {
    const now = Date.now();
    if (updateFound || checking || !navigator.onLine || document.visibilityState !== 'visible') return checking ?? Promise.resolve();
    if (!force && now - lastCheckedAt < checkThrottleMs) return Promise.resolve();
    lastCheckedAt = now;
    checking = fetchLatestRelease()
      .then((release) => {
        if (!release || !isNewerAppVersion(release.version, options.currentVersion)) return;
        updateFound = true;
        options.onUpdateAvailable(release);
      })
      .catch(() => undefined)
      .finally(() => { checking = null; });
    return checking;
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') void check();
  };
  const onOnline = () => void check(true);
  const interval = window.setInterval(() => void check(), checkIntervalMs);
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('online', onOnline);
  void check(true);

  return {
    check,
    dispose() {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('online', onOnline);
    },
  };
}
