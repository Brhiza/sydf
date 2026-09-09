import { describe, expect, it, vi } from 'vitest';
import {
  buildOfficialDownloadRoutes,
  probeDownloadRoute,
  selectBestDownloadRoute,
} from './updateRoutes';

describe('APK 多线路下载', () => {
  it('按默认下载、GitHub 和 R2 的顺序生成三条官方线路', () => {
    const routes = buildOfficialDownloadRoutes('0.2.0');
    expect(routes.map((route) => route.id)).toEqual([
      'rng-cdn',
      'github',
      'r2',
    ]);
    expect(routes[0]?.url).toBe('https://download.aov.cc/apps/shiyue-dongfang/android/0.2.0/shiyue-dongfang-0.2.0-release.apk');
    expect(routes[1]?.url).toBe('https://github.com/Brhiza/sydf/releases/download/v0.2.0/shiyue-dongfang-0.2.0-release.apk');
    expect(routes[2]?.url).toBe('https://sydf.cc/api/app-download?version=0.2.0');
  });

  it('用 HEAD 请求测速且不下载 APK', async () => {
    const route = buildOfficialDownloadRoutes('0.2.0')[0]!;
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    const times = [100, 143];
    await expect(probeDownloadRoute(route, { fetcher, now: () => times.shift()! })).resolves.toEqual({
      routeId: 'rng-cdn',
      latencyMs: 43,
    });
    expect(fetcher).toHaveBeenCalledWith(route.url, expect.objectContaining({ method: 'HEAD' }));
  });

  it('自动选择延迟最低的可用线路，全部失败时回退到线路一', () => {
    const routes = buildOfficialDownloadRoutes('0.2.0');
    expect(selectBestDownloadRoute(routes, [
      { routeId: 'github', latencyMs: null },
      { routeId: 'r2', latencyMs: 180 },
    ])?.id).toBe('r2');
    expect(selectBestDownloadRoute(routes, [])?.id).toBe('rng-cdn');
  });
});
