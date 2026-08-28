import { describe, expect, it, vi } from 'vitest';
import {
  buildOfficialDownloadRoutes,
  probeDownloadRoute,
  selectBestDownloadRoute,
} from './updateRoutes';

describe('APK 多线路下载', () => {
  it('按 Release、加速线路和 R2 的顺序生成四条官方线路', () => {
    const routes = buildOfficialDownloadRoutes('0.2.0');
    expect(routes.map((route) => route.id)).toEqual([
      'github',
      'github-accelerated-1',
      'github-accelerated-2',
      'r2',
    ]);
    expect(routes[0]?.url).toBe('https://github.com/Brhiza/sydf/releases/download/v0.2.0/shiyue-dongfang-0.2.0-release.apk');
    expect(routes[1]?.url).toContain('gh-proxy.com/https://github.com/');
    expect(routes[2]?.url).toContain('ghfast.top/https://github.com/');
    expect(routes[3]?.url).toBe('https://sydf.cc/api/app-download?version=0.2.0');
  });

  it('用 HEAD 请求测速且不下载 APK', async () => {
    const route = buildOfficialDownloadRoutes('0.2.0')[0]!;
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    const times = [100, 143];
    await expect(probeDownloadRoute(route, { fetcher, now: () => times.shift()! })).resolves.toEqual({
      routeId: 'github',
      latencyMs: 43,
    });
    expect(fetcher).toHaveBeenCalledWith(route.url, expect.objectContaining({ method: 'HEAD' }));
  });

  it('自动选择延迟最低的可用线路，全部失败时回退到线路一', () => {
    const routes = buildOfficialDownloadRoutes('0.2.0');
    expect(selectBestDownloadRoute(routes, [
      { routeId: 'github', latencyMs: null },
      { routeId: 'github-accelerated-1', latencyMs: 90 },
      { routeId: 'github-accelerated-2', latencyMs: 140 },
      { routeId: 'r2', latencyMs: 180 },
    ])?.id).toBe('github-accelerated-1');
    expect(selectBestDownloadRoute(routes, [])?.id).toBe('github');
  });
});
