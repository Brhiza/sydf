import { afterEach, describe, expect, it, vi } from 'vitest';
import { createNativeAppUpdateController, fetchLatestNativeRelease, isNewerAppVersion } from './nativeAppUpdate';
import { buildOfficialDownloadRoutes } from './updateRoutes';

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
  it('接受统一分发和原有 sydf.cc 下载地址并生成官方线路', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      version: '0.2.0',
      downloadUrl: 'https://sydf.cc/api/app-download?version=0.2.0',
    })));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchLatestNativeRelease()).resolves.toEqual({
      version: '0.2.0',
      downloadUrl: 'https://sydf.cc/api/app-download?version=0.2.0',
      downloadRoutes: buildOfficialDownloadRoutes('0.2.0'),
    });
    expect(fetchMock).toHaveBeenCalledWith('https://sydf.cc/api/app-update', expect.any(Object));

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      version: '0.3.0',
      downloadUrl: 'https://download.aov.cc/apps/shiyue-dongfang/android/0.3.0/shiyue-dongfang-0.3.0-release.apk',
    })));
    await expect(fetchLatestNativeRelease()).resolves.toMatchObject({ version: '0.3.0' });

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      version: '0.4.0',
      downloadUrl: 'https://github.com/example/app.apk',
    })));
    await expect(fetchLatestNativeRelease()).resolves.toBeNull();
  });

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
      downloadRoutes: buildOfficialDownloadRoutes('0.2.0'),
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
