export const PREFERENCES_STORAGE_KEY = 'shiyue-preferences';

export function readStoredJoytouchCompatibility(storage: Pick<Storage, 'getItem'>): boolean {
  try {
    const value = JSON.parse(storage.getItem(PREFERENCES_STORAGE_KEY) || '{}') as { joytouchCompatibility?: unknown };
    return value.joytouchCompatibility === true;
  } catch {
    return false;
  }
}

export function applyJoytouchCompatibility(enabled: boolean, root: HTMLElement = document.documentElement) {
  root.classList.toggle('joytouch-compat', enabled);
}

export function applyStoredJoytouchCompatibility() {
  const enabled = typeof localStorage !== 'undefined' && readStoredJoytouchCompatibility(localStorage);
  applyJoytouchCompatibility(enabled);
  return enabled;
}
