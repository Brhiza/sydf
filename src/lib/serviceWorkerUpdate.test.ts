import { afterEach, describe, expect, it, vi } from 'vitest';
import { prepareServiceWorkerUpdate } from './serviceWorkerUpdate';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('网页离线缓存更新', () => {
  it('等待新缓存接管页面后才完成更新准备', async () => {
    vi.stubGlobal('window', { setTimeout, clearTimeout });
    const events = new EventTarget();
    const oldController = {} as ServiceWorker;
    const newController = {} as ServiceWorker;
    const serviceWorker = {
      controller: oldController,
      addEventListener: events.addEventListener.bind(events),
      removeEventListener: events.removeEventListener.bind(events),
    } as unknown as ServiceWorkerContainer;
    const waiting = {
      postMessage: vi.fn(() => {
        Object.defineProperty(serviceWorker, 'controller', { value: newController, configurable: true });
        events.dispatchEvent(new Event('controllerchange'));
      }),
    } as unknown as ServiceWorker;
    const registration = {
      update: vi.fn().mockResolvedValue(undefined),
      installing: null,
      waiting,
    } as unknown as ServiceWorkerRegistration;

    await prepareServiceWorkerUpdate(registration, serviceWorker);

    expect(registration.update).toHaveBeenCalledTimes(1);
    expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
    expect(serviceWorker.controller).toBe(newController);
  });

  it('已有旧缓存控制页面但新缓存未就绪时明确失败', async () => {
    const registration = {
      update: vi.fn().mockResolvedValue(undefined),
      installing: null,
      waiting: null,
    } as unknown as ServiceWorkerRegistration;
    const serviceWorker = { controller: {} as ServiceWorker } as ServiceWorkerContainer;

    await expect(prepareServiceWorkerUpdate(registration, serviceWorker))
      .rejects.toThrow('updated service worker is not ready');
  });
});
