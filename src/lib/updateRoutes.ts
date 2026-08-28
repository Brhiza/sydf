export interface NativeDownloadRoute {
  id: 'github' | 'github-accelerated-1' | 'github-accelerated-2' | 'r2';
  label: string;
  url: string;
  priority: number;
}

export interface DownloadRouteProbe {
  routeId: NativeDownloadRoute['id'];
  latencyMs: number | null;
}

interface ProbeOptions {
  fetcher?: typeof fetch;
  timeoutMs?: number;
  now?: () => number;
}

const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:[.-][0-9A-Za-z.-]+)?$/;
const DEFAULT_PROBE_TIMEOUT_MS = 8_000;

export function buildOfficialDownloadRoutes(version: string): NativeDownloadRoute[] {
  const normalizedVersion = version.replace(/^v/i, '').trim();
  if (!VERSION_PATTERN.test(normalizedVersion)) return [];
  const fileName = `shiyue-dongfang-${normalizedVersion}-release.apk`;
  const githubUrl = `https://github.com/Brhiza/sydf/releases/download/v${normalizedVersion}/${fileName}`;
  return [
    { id: 'github', label: '线路 1 · Release 直连', url: githubUrl, priority: 1 },
    {
      id: 'github-accelerated-1',
      label: '线路 2 · Release 加速一',
      url: `https://gh-proxy.com/${githubUrl}`,
      priority: 2,
    },
    {
      id: 'github-accelerated-2',
      label: '线路 3 · Release 加速二',
      url: `https://ghfast.top/${githubUrl}`,
      priority: 3,
    },
    {
      id: 'r2',
      label: '线路 4 · R2',
      url: `https://sydf.cc/api/app-download?version=${encodeURIComponent(normalizedVersion)}`,
      priority: 4,
    },
  ];
}

export async function probeDownloadRoute(
  route: NativeDownloadRoute,
  options: ProbeOptions = {},
): Promise<DownloadRouteProbe> {
  const fetcher = options.fetcher ?? fetch;
  const now = options.now ?? (() => performance.now());
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_PROBE_TIMEOUT_MS);
  const startedAt = now();
  try {
    const response = await fetcher(route.url, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
      redirect: 'follow',
      signal: controller.signal,
    });
    if (response.type !== 'opaque' && !response.ok) return { routeId: route.id, latencyMs: null };
    return { routeId: route.id, latencyMs: Math.max(1, Math.round(now() - startedAt)) };
  } catch {
    return { routeId: route.id, latencyMs: null };
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

export function probeDownloadRoutes(
  routes: NativeDownloadRoute[],
  options: ProbeOptions = {},
): Promise<DownloadRouteProbe[]> {
  return Promise.all(routes.map((route) => probeDownloadRoute(route, options)));
}

export function selectBestDownloadRoute(
  routes: NativeDownloadRoute[],
  probes: DownloadRouteProbe[],
): NativeDownloadRoute | null {
  const latencyById = new Map(probes.map((probe) => [probe.routeId, probe.latencyMs]));
  return [...routes].sort((left, right) => {
    const leftLatency = latencyById.get(left.id);
    const rightLatency = latencyById.get(right.id);
    if (leftLatency === null || leftLatency === undefined) {
      if (rightLatency !== null && rightLatency !== undefined) return 1;
    } else if (rightLatency === null || rightLatency === undefined) {
      return -1;
    } else if (leftLatency !== rightLatency) {
      return leftLatency - rightLatency;
    }
    return left.priority - right.priority;
  })[0] ?? null;
}
