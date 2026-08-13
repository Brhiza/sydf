import { describe, expect, it } from 'vitest';
import { parseLocalStorageJson, persistArrayWithOldestEviction } from './localStorage';

describe('本地数据可靠性', () => {
  it('单项 JSON 损坏时只忽略该项', () => {
    const storage = { getItem: (key: string) => key === 'broken' ? '{' : '{"ok":true}' };
    expect(parseLocalStorageJson(storage, 'broken')).toBeNull();
    expect(parseLocalStorageJson<{ ok: boolean }>(storage, 'valid')).toEqual({ ok: true });
  });

  it('浏览器拒绝读取存储时安全回退', () => {
    const storage = { getItem: () => { throw new DOMException('denied', 'SecurityError'); } };
    expect(parseLocalStorageJson(storage, 'blocked')).toBeNull();
  });

  it('容量不足时优先保留最新记录', () => {
    const writes: string[] = [];
    const storage = {
      setItem(_key: string, value: string) {
        writes.push(value);
        if (JSON.parse(value).length > 2) throw new DOMException('full', 'QuotaExceededError');
      },
    };
    const result = persistArrayWithOldestEviction(storage, 'history', [4, 3, 2, 1]);
    expect(result).toEqual({ records: [4, 3], removed: 2, saved: true });
    expect(writes.length).toBeGreaterThan(1);
  });
});
