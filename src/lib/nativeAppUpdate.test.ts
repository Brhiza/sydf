import { afterEach, describe, expect, it, vi } from 'vitest';
import { createNativeAppUpdateController, isNewerAppVersion } from './nativeAppUpdate';

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

describe('APK 版本更新', () => {
  it('只把更高的正式版本视为更新', () => {
    expect(isNewerAppVersion('0.2.0', '0.1.321')).toBe(true);
    expect(isNewerAppVersion('0.1.2', '0.1.321')).toBe(false);
    expect(isNewerAppVersion('v1.0.0', '1.0.0')).toBe(false);
  });

  it('发现更新后只弹出一次', async () => {
    vi.useFakeTimers();
    stubBrowserGlobals();
    const onUpdateAvailable = vi.fn();
    const fetchLatestRelease = vi.fn().mockResolvedValue({
      version: '0.2.0',
      downloadUrl: 'https://example.com/app.apk',
    });
    const controller = createNativeAppUpdateController({
      currentVersion: '0.1.0',
      checkIntervalMs: 100,
      checkThrottleMs: 0,
      fetchLatestRelease,
      onUpdateAvailable,
    });

    await controller.check(true);
    await vi.advanceTimersByTimeAsync(300);

    expect(onUpdateAvailable).toHaveBeenCalledTimes(1);
    expect(fetchLatestRelease).toHaveBeenCalledTimes(1);
    controller.dispose();
  });
});
