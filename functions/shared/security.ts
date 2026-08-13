export interface RateLimitBinding {
  limit(input: { key: string }): Promise<{ success: boolean }>;
}

export interface ApiSecurityEnv {
  AI_RATE_LIMITER?: RateLimitBinding;
  AI_REQUESTS_PER_MINUTE?: string;
}

const MAX_REQUEST_BYTES = 64 * 1024;
const fallbackRateBuckets = new Map<string, { count: number; expiresAt: number }>();
const resolvedHostCache = new Map<string, { addresses: string[]; expiresAt: number }>();

export class RequestBodyTooLargeError extends Error {
  constructor() {
    super('request body too large');
    this.name = 'RequestBodyTooLargeError';
  }
}

function jsonError(message: string, status: number, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}

function clientAddress(request: Request) {
  return request.headers.get('CF-Connecting-IP')?.trim()
    || request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
    || 'unknown';
}

function fallbackRateLimit(key: string, limit: number) {
  const now = Date.now();
  if (fallbackRateBuckets.size > 1000) {
    for (const [bucketKey, bucket] of fallbackRateBuckets) {
      if (bucket.expiresAt <= now) fallbackRateBuckets.delete(bucketKey);
    }
  }
  const bucket = fallbackRateBuckets.get(key);
  if (!bucket || bucket.expiresAt <= now) {
    fallbackRateBuckets.set(key, { count: 1, expiresAt: now + 60_000 });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}

function configuredFallbackLimit(env: ApiSecurityEnv, route: string) {
  const configured = Number(env.AI_REQUESTS_PER_MINUTE);
  if (Number.isInteger(configured) && configured > 0) return Math.min(configured, 120);
  return route.endsWith('/interpret') ? 8 : 16;
}

export async function guardApiRequest(request: Request, env: ApiSecurityEnv): Promise<Response | null> {
  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    return jsonError('请求格式不受支持。', 415);
  }
  const contentLength = Number(request.headers.get('Content-Length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return jsonError('请求内容过大。', 413);
  }

  const requestUrl = new URL(request.url);
  const origin = request.headers.get('Origin');
  if (origin && origin !== requestUrl.origin) {
    return jsonError('请求来源不受支持。', 403);
  }

  const routeKey = requestUrl.pathname;
  const address = clientAddress(request);
  if (env.AI_RATE_LIMITER) {
    try {
      const result = await env.AI_RATE_LIMITER.limit({ key: `${routeKey}:${address}` });
      if (!result.success) return jsonError('请求过于频繁，请稍后再试。', 429, { 'Retry-After': '60' });
    } catch {
      return jsonError('请求保护服务暂时不可用，请稍后再试。', 503);
    }
  } else if (!fallbackRateLimit(`${routeKey}:${address}`, configuredFallbackLimit(env, routeKey))) {
    return jsonError('请求过于频繁，请稍后再试。', 429, { 'Retry-After': '60' });
  }
  return null;
}

export async function readJsonBody<T>(request: Request): Promise<T> {
  if (!request.body) return JSON.parse('') as T;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_REQUEST_BYTES) {
        await reader.cancel();
        throw new RequestBodyTooLargeError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split('.');
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part) || Number(part) > 255)) return false;
  const [a, b, c] = parts.map(Number);
  return a === 0 || a === 10 || a === 127 || a >= 224
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 192 && b === 0 && (c === 0 || c === 2))
    || (a === 198 && (b === 18 || b === 19))
    || (a === 198 && b === 51 && c === 100)
    || (a === 203 && b === 0 && c === 113);
}

function isPrivateHostname(hostname: string) {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.home.arpa')) return true;
  if (isPrivateIpv4(host)) return true;
  if (!host.includes(':')) return false;
  const normalized = host.replace(/^\[|\]$/g, '');
  return normalized === '::' || normalized === '::1' || normalized.startsWith('::ffff:') || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb');
}

function isLoopbackHostname(hostname: string) {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  return host === 'localhost' || host.endsWith('.localhost') || host === '127.0.0.1' || host === '[::1]';
}

export function validateExternalUrl(rawUrl: string, requestUrl: string): URL {
  const target = new URL(rawUrl);
  const localDevelopment = ['localhost', '127.0.0.1', '[::1]'].includes(new URL(requestUrl).hostname);
  if (target.username || target.password) throw new Error('credentials in url');
  if (target.protocol !== 'https:' && !(localDevelopment && target.protocol === 'http:')) throw new Error('https required');
  if (isPrivateHostname(target.hostname) && !(localDevelopment && isLoopbackHostname(target.hostname))) throw new Error('private destination');
  return target;
}

async function resolvePublicHostname(target: URL, localDevelopment: boolean) {
  if (target.hostname.includes(':') || /^\d+(?:\.\d+){3}$/.test(target.hostname)) return;
  const cached = resolvedHostCache.get(target.hostname);
  const now = Date.now();
  let addresses = cached && cached.expiresAt > now ? cached.addresses : null;
  if (!addresses) {
    const responses = await Promise.all(['A', 'AAAA'].map((type) => fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(target.hostname)}&type=${type}`, {
      headers: { Accept: 'application/dns-json' },
      redirect: 'error',
      signal: AbortSignal.timeout(5_000),
    })));
    if (responses.some((response) => !response.ok)) throw new Error('hostname resolution failed');
    const payloads = await Promise.all(responses.map((response) => response.json() as Promise<{ Answer?: Array<{ type?: number; data?: string }> }>));
    addresses = payloads.flatMap((payload) => (payload.Answer || []))
      .filter((item) => (item.type === 1 || item.type === 28) && typeof item.data === 'string')
      .map((item) => item.data!);
    if (!addresses.length) throw new Error('hostname resolution failed');
    resolvedHostCache.set(target.hostname, { addresses, expiresAt: now + 60_000 });
  }
  if (addresses.some((address) => isPrivateHostname(address)) && !(localDevelopment && isLoopbackHostname(target.hostname))) {
    throw new Error('private destination');
  }
}

export async function validateExternalUrlForRequest(rawUrl: string, requestUrl: string) {
  const target = validateExternalUrl(rawUrl, requestUrl);
  await resolvePublicHostname(target, ['localhost', '127.0.0.1', '[::1]'].includes(new URL(requestUrl).hostname));
  return target;
}

export async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const callerSignal = init.signal;
  const abortFromCaller = () => controller.abort(callerSignal?.reason);
  if (callerSignal?.aborted) abortFromCaller();
  else callerSignal?.addEventListener('abort', abortFromCaller, { once: true });
  const timeout = setTimeout(() => controller.abort(new DOMException('upstream timeout', 'TimeoutError')), timeoutMs);
  try {
    return await fetch(url, { ...init, redirect: 'error', signal: controller.signal });
  } finally {
    clearTimeout(timeout);
    callerSignal?.removeEventListener('abort', abortFromCaller);
  }
}
