import { describe, expect, it, vi } from 'vitest';
import { onRequestGet } from './app-update';

describe('APK 更新清单接口', () => {
  it('统一分发不可用时从 R2 返回版本清单并禁止缓存', async () => {
    const payload = JSON.stringify({
      version: '1.2.3',
      downloadUrl: 'https://sydf.cc/api/app-download?version=1.2.3',
      downloadRoutes: [{ id: 'github', url: 'https://github.com/example.apk', priority: 1 }],
    });
    const response = await onRequestGet({
      env: { APP_RELEASES: { get: vi.fn().mockResolvedValue({ body: new Response(payload).body! }) } },
      fetch: vi.fn().mockResolvedValue(new Response(null, { status: 503 })),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toMatchObject({ version: '1.2.3', downloadRoutes: [{ id: 'github' }] });
  });

  it('没有正式版本时返回 404', async () => {
    const response = await onRequestGet({
      env: { APP_RELEASES: { get: vi.fn().mockResolvedValue(null) } },
      fetch: vi.fn().mockResolvedValue(new Response(null, { status: 404 })),
    });
    expect(response.status).toBe(404);
  });

  it('优先返回统一 APK 分发清单', async () => {
    const payload = JSON.stringify({
      appId: 'shiyue-dongfang',
      version: '1.2.3',
      downloadUrl: 'https://download.aov.cc/apps/shiyue-dongfang/android/1.2.3/shiyue-dongfang-1.2.3-release.apk',
    });
    const bucketGet = vi.fn();
    const response = await onRequestGet({
      env: { APP_RELEASES: { get: bucketGet } },
      fetch: vi.fn().mockResolvedValue(new Response(payload, { status: 200 })),
    });
    expect(await response.json()).toMatchObject({ appId: 'shiyue-dongfang', version: '1.2.3' });
    expect(bucketGet).not.toHaveBeenCalled();
  });
});
