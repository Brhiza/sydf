import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const bridgeSource = readFileSync(new URL('../../public/api/recovery-bridge.js', import.meta.url), 'utf8');
const workerSource = readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8');

describe('旧应用壳退役', () => {
  it('跨域恢复桥只返回固定正式站，不接受外部跳转目标', () => {
    const replace = vi.fn();
    runInNewContext(bridgeSource, {
      location: {
        search: '?v=release-123&attempt=2&next=https://evil.example/',
        replace,
      },
      window: { setTimeout: (callback: () => void) => { callback(); return 1; } },
      URL,
      URLSearchParams,
      Date,
      Number,
      String,
      Math,
    });

    expect(replace).toHaveBeenCalledTimes(1);
    const target = new URL(String(replace.mock.calls[0]?.[0]));
    expect(target.origin).toBe('https://sydf.cc');
    expect(target.pathname).toBe('/');
    expect(target.searchParams.get('__recovered')).toBe('release-123');
    expect(target.searchParams.get('__recoveryAttempt')).toBe('2');
  });

  it('退役 worker 等待清理完成，只删除旧应用壳缓存并重新导航页面', async () => {
    const listeners: Record<string, (event: { waitUntil: (promise: Promise<unknown>) => void }) => void> = {};
    const skipWaiting = vi.fn().mockResolvedValue(undefined);
    const claim = vi.fn().mockResolvedValue(undefined);
    const unregister = vi.fn().mockResolvedValue(true);
    const deleteCache = vi.fn().mockResolvedValue(true);
    const navigate = vi.fn().mockResolvedValue(null);
    const self = {
      addEventListener: (type: string, listener: typeof listeners[string]) => { listeners[type] = listener; },
      skipWaiting,
      clients: {
        claim,
        matchAll: vi.fn().mockResolvedValue([{ url: 'https://sydf.cc/', navigate }]),
      },
      caches: {
        keys: vi.fn().mockResolvedValue(['workbox-precache-old', 'shiyue-app-assets-v2', 'shiyue-divination-theme-images-v6']),
        delete: deleteCache,
      },
      registration: { unregister },
    };
    runInNewContext(workerSource, { self, Promise });

    let installPromise: Promise<unknown> | undefined;
    listeners.install?.({ waitUntil: (promise) => { installPromise = promise; } });
    await installPromise;
    expect(skipWaiting).toHaveBeenCalledTimes(1);

    let activatePromise: Promise<unknown> | undefined;
    listeners.activate?.({ waitUntil: (promise) => { activatePromise = promise; } });
    await activatePromise;

    expect(claim).toHaveBeenCalledTimes(1);
    expect(unregister).toHaveBeenCalledTimes(1);
    expect(deleteCache).toHaveBeenCalledWith('workbox-precache-old');
    expect(deleteCache).toHaveBeenCalledWith('shiyue-app-assets-v2');
    expect(deleteCache).not.toHaveBeenCalledWith('shiyue-divination-theme-images-v6');
    expect(navigate).toHaveBeenCalledWith('https://sydf.cc/');
  });
});
