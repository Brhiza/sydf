export function parseLocalStorageJson<T>(storage: Pick<Storage, 'getItem'>, key: string): T | null {
  try {
    const value = storage.getItem(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function isStorageQuotaError(error: unknown) {
  return error instanceof DOMException && (
    error.name === 'QuotaExceededError'
    || error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    || error.code === 22
    || error.code === 1014
  );
}

export function persistArrayWithOldestEviction<T>(
  storage: Pick<Storage, 'setItem'>,
  key: string,
  records: T[],
): { records: T[]; removed: number; saved: boolean } {
  let retained = records;
  while (true) {
    try {
      storage.setItem(key, JSON.stringify(retained));
      return { records: retained, removed: records.length - retained.length, saved: true };
    } catch (error) {
      if (!isStorageQuotaError(error) || retained.length === 0) {
        return { records, removed: 0, saved: false };
      }
      const removeCount = Math.max(1, Math.ceil(retained.length / 10));
      retained = retained.slice(0, -removeCount);
    }
  }
}
