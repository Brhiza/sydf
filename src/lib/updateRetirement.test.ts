import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const workerSource = readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8');

describe('旧应用壳退役', () => {
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
        matchAll: vi.fn().mockResolvedValue([{ url: 'https://app.example/', navigate }]),
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
    expect(navigate).toHaveBeenCalledWith('https://app.example/');
  });
});
