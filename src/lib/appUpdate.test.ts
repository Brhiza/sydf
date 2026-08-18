import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildUpdateReloadUrl, createAppUpdateController } from './appUpdate';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function stubBrowserGlobals() {
  vi.stubGlobal('navigator', { onLine: true });
  vi.stubGlobal('document', {
    visibilityState: 'visible',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  vi.stubGlobal('window', {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    setInterval,
    clearInterval,
  });
}

describe('网页版本更新', () => {
  it('正式站更新只刷新当前地址', () => {
    expect(buildUpdateReloadUrl({ href: 'https://app.example/tools?tab=ai#settings' } as Location, 'new-version'))
      .toBe('https://app.example/tools?tab=ai&__update=new-version#settings');
  });

  it('本地与预览环境仍在当前地址直接刷新', () => {
    expect(buildUpdateReloadUrl({ href: 'http://localhost:5173/tools?tab=ai#settings' } as Location, 'new-version'))
      .toBe('http://localhost:5173/tools?tab=ai&__update=new-version#settings');
  });

  it('发现不同版本时只通知一次', async () => {
    vi.useFakeTimers();
    stubBrowserGlobals();
    const onUpdateAvailable = vi.fn();
    const fetchVersion = vi.fn().mockResolvedValue('new-version');
    const controller = createAppUpdateController({
      currentVersion: 'old-version',
      checkIntervalMs: 100,
      checkThrottleMs: 0,
      fetchVersion,
      onUpdateAvailable,
    });

    await controller.check(true);
    await vi.advanceTimersByTimeAsync(300);

    expect(onUpdateAvailable).toHaveBeenCalledTimes(1);
    expect(fetchVersion).toHaveBeenCalledTimes(1);
    controller.dispose();
  });

  it('相同版本不会弹出更新提示', async () => {
    vi.useFakeTimers();
    stubBrowserGlobals();
    const onUpdateAvailable = vi.fn();
    const controller = createAppUpdateController({
      currentVersion: 'same-version',
      fetchVersion: vi.fn().mockResolvedValue('same-version'),
      onUpdateAvailable,
    });

    await controller.check(true);

    expect(onUpdateAvailable).not.toHaveBeenCalled();
    controller.dispose();
  });
});
