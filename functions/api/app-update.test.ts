import { describe, expect, it, vi } from 'vitest';
import { onRequestGet } from './app-update';

describe('APK 更新清单接口', () => {
  it('从 R2 返回版本清单并禁止缓存', async () => {
    const payload = JSON.stringify({
      version: '1.2.3',
      downloadUrl: 'https://sydf.cc/api/app-download?version=1.2.3',
      downloadRoutes: [{ id: 'github', url: 'https://github.com/example.apk', priority: 1 }],
    });
    const response = await onRequestGet({
      env: { APP_RELEASES: { get: vi.fn().mockResolvedValue({ body: new Response(payload).body! }) } },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toMatchObject({ version: '1.2.3', downloadRoutes: [{ id: 'github' }] });
  });

  it('没有正式版本时返回 404', async () => {
    const response = await onRequestGet({ env: { APP_RELEASES: { get: vi.fn().mockResolvedValue(null) } } });
    expect(response.status).toBe(404);
  });
});
