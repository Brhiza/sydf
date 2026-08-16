import { describe, expect, it, vi } from 'vitest';
import { fetchWithTimeout, guardApiRequest, readJsonBody, RequestBodyTooLargeError, validateExternalUrl } from './security';

function request(body = '{}', headers: Record<string, string> = {}) {
  return new Request('https://example.com/api/interpret', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body,
  });
}

describe('AI 接口安全边界', () => {
  it('拒绝非 JSON、超大请求和跨站来源', async () => {
    expect((await guardApiRequest(new Request('https://example.com/api/interpret', { method: 'POST', body: 'x' }), {}))?.status).toBe(415);
    expect((await guardApiRequest(request('{}', { 'Content-Length': String(65 * 1024) }), {}))?.status).toBe(413);
    expect((await guardApiRequest(request('{}', { Origin: 'https://evil.example' }), {}))?.status).toBe(403);
  });

  it('实际请求体超过限制时停止解析', async () => {
    await expect(readJsonBody(request(JSON.stringify({ value: '界'.repeat(30_000) })))).rejects.toBeInstanceOf(RequestBodyTooLargeError);
  });

  it('使用限流绑定并在超限时返回 429', async () => {
    const limiter = { limit: vi.fn().mockResolvedValue({ success: false }) };
    const response = await guardApiRequest(request(), { AI_RATE_LIMITER: limiter });
    expect(response?.status).toBe(429);
    expect(response?.headers.get('Retry-After')).toBe('60');
    expect(limiter.limit).toHaveBeenCalledWith({ key: '/api/interpret:unknown' });
  });

  it('正式环境只允许无凭据的公网 HTTPS 地址', () => {
    expect(validateExternalUrl('https://api.openai.com/v1', 'https://example.com').hostname).toBe('api.openai.com');
    expect(() => validateExternalUrl('http://api.openai.com/v1', 'https://example.com')).toThrow();
    expect(() => validateExternalUrl('https://user:pass@api.example.com/v1', 'https://example.com')).toThrow();
    expect(() => validateExternalUrl('https://127.0.0.1/v1', 'https://example.com')).toThrow();
    expect(() => validateExternalUrl('https://10.0.0.8/v1', 'https://example.com')).toThrow();
    expect(() => validateExternalUrl('https://service.internal/v1', 'https://example.com')).toThrow();
  });

  it('本地开发只额外允许本机 HTTP，不放开局域网地址', () => {
    expect(validateExternalUrl('http://127.0.0.1:11434/v1', 'http://localhost:5173').port).toBe('11434');
    expect(() => validateExternalUrl('http://192.168.1.5/v1', 'http://localhost:5173')).toThrow();
  });

  it('上游请求超时后中止', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_input, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      expect(init?.redirect).toBe('manual');
      // 模拟忽略 AbortController.reason、只返回通用 AbortError 的运行时。
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
    }));
    vi.stubGlobal('fetch', fetchMock);
    const pending = fetchWithTimeout('https://api.example.com/v1', {}, 100);
    const assertion = expect(pending).rejects.toMatchObject({ name: 'TimeoutError' });
    await vi.advanceTimersByTimeAsync(100);
    await assertion;
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('显式拒绝上游重定向，避免凭据被转发', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, {
      status: 302,
      headers: { Location: 'https://redirect.example/v1' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchWithTimeout('https://api.example.com/v1', {}, 100)).rejects.toThrow('upstream redirect not allowed');
    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/v1', expect.objectContaining({ redirect: 'manual' }));
    vi.unstubAllGlobals();
  });
});
