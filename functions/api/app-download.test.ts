import { describe, expect, it, vi } from 'vitest';
import { onRequestGet } from './app-download';

function releaseObject(range?: { offset: number; length: number }) {
  return {
    body: new Response('apk').body!,
    size: 100,
    httpEtag: '"release-etag"',
    range,
    writeHttpMetadata: vi.fn(),
  };
}

describe('APK 国内下载接口', () => {
  it('拒绝不合法版本号', async () => {
    const response = await onRequestGet({
      request: new Request('https://sydf.cc/api/app-download?version=../secret'),
      env: {},
    });
    expect(response.status).toBe(400);
  });

  it('从固定 R2 路径返回安装包', async () => {
    const get = vi.fn().mockResolvedValue(releaseObject());
    const response = await onRequestGet({
      request: new Request('https://sydf.cc/api/app-download?version=1.2.3'),
      env: { APP_RELEASES: { get } },
    });
    expect(response.status).toBe(200);
    expect(get).toHaveBeenCalledWith('android/1.2.3/shiyue-dongfang-1.2.3.apk', expect.any(Object));
    expect(response.headers.get('content-type')).toBe('application/vnd.android.package-archive');
  });

  it('支持断点续传', async () => {
    const response = await onRequestGet({
      request: new Request('https://sydf.cc/api/app-download?version=1.2.3', { headers: { Range: 'bytes=20-29' } }),
      env: { APP_RELEASES: { get: vi.fn().mockResolvedValue(releaseObject({ offset: 20, length: 10 })) } },
    });
    expect(response.status).toBe(206);
    expect(response.headers.get('content-range')).toBe('bytes 20-29/100');
  });
});
