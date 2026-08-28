import { buildOfficialDownloadRoutes, type NativeDownloadRoute } from './updateRoutes';

export interface NativeReleaseUpdate {
  version: string;
  downloadUrl: string;
  downloadRoutes: NativeDownloadRoute[];
}

interface AppUpdatePayload {
  version?: unknown;
  downloadUrl?: unknown;
}

export interface NativeAppUpdateControllerOptions {
  currentVersion: string;
  checkIntervalMs?: number;
  checkThrottleMs?: number;
  fetchLatestRelease?: () => Promise<NativeReleaseUpdate | null>;
  onUpdateAvailable: (update: NativeReleaseUpdate) => void;
}

const RELEASE_API_URL = 'https://sydf.cc/api/app-update';
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
    headers: { Accept: 'application/json' },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('release request failed');
  const release = await response.json() as AppUpdatePayload;
  if (typeof release.version !== 'string' || typeof release.downloadUrl !== 'string') return null;
  const version = release.version.replace(/^v/i, '');
  const downloadUrl = new URL(release.downloadUrl, RELEASE_API_URL);
  if (downloadUrl.protocol !== 'https:' || downloadUrl.hostname !== 'sydf.cc' || downloadUrl.pathname !== '/api/app-download') return null;
  const downloadRoutes = buildOfficialDownloadRoutes(version);
  if (!downloadRoutes.length) return null;
  return { version, downloadUrl: downloadUrl.toString(), downloadRoutes };
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
