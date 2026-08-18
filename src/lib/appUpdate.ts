export interface AppUpdateControllerOptions {
  currentVersion: string;
  checkIntervalMs?: number;
  checkThrottleMs?: number;
  fetchVersion?: () => Promise<string>;
  onUpdateAvailable: (latestVersion: string) => void;
}

const DEFAULT_CHECK_INTERVAL = 5 * 60 * 1000;
const DEFAULT_CHECK_THROTTLE = 60 * 1000;

export function buildUpdateReloadUrl(location: Pick<Location, 'href'>, version = '') {
  const url = new URL(location.href);
  url.searchParams.set('__update', version || Date.now().toString(36));
  return url.toString();
}

export function createAppUpdateController(options: AppUpdateControllerOptions) {
  const checkIntervalMs = options.checkIntervalMs ?? DEFAULT_CHECK_INTERVAL;
  const checkThrottleMs = options.checkThrottleMs ?? DEFAULT_CHECK_THROTTLE;
  const fetchVersion = options.fetchVersion ?? (async () => {
    const response = await fetch(`/version.json?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error('version request failed');
    const payload = await response.json() as { version?: unknown };
    return typeof payload.version === 'string' ? payload.version : '';
  });
  let lastCheckedAt = 0;
  let updateFound = false;
  let checking: Promise<void> | null = null;

  const check = (force = false) => {
    const now = Date.now();
    if (updateFound || checking || !navigator.onLine || document.visibilityState !== 'visible') return checking ?? Promise.resolve();
    if (!force && now - lastCheckedAt < checkThrottleMs) return Promise.resolve();
    lastCheckedAt = now;
    checking = fetchVersion()
      .then((latestVersion) => {
        if (!latestVersion || latestVersion === options.currentVersion) return;
        updateFound = true;
        options.onUpdateAvailable(latestVersion);
      })
      .catch(() => undefined)
      .finally(() => {
        checking = null;
      });
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
