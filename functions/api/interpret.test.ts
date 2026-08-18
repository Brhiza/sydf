import { afterEach, describe, expect, it, vi } from 'vitest';
import { onRequestPost } from './interpret';

let requestSequence = 0;

function createRequest(aiConfig?: Record<string, unknown>, answerPreference?: 'chat' | 'fortune-master' | 'professional') {
  return new Request('https://example.com/api/interpret', {
    method: 'POST',
    // 各用例代表不同访客，避免共享的生产兜底限流状态让测试互相影响。
    headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': `192.0.2.${++requestSequence}` },
    body: JSON.stringify({
      mode: 'ask',
      question: '请只回复测试成功。',
      ...(aiConfig ? { aiConfig } : {}),
      ...(answerPreference ? { preferences: { answerPreference, displayLevel: 'beginner' } } : {}),
    }),
  });
}

function successfulUpstream(content = '测试成功') {
  return new Response(JSON.stringify({
    choices: [{ message: { content } }],
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('内置 AI 服务', () => {
  const builtinEnv = {
    AI_BASE_URL: 'https://primary.example/v1',
    AI_API_KEY: 'primary-key',
    AI_MODEL: 'primary-model',
  };

  it('内置 AI 未配置时直接返回明确错误', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestPost({ request: createRequest(), env: {} });
    const result = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(503);
    expect(result.error).toBe('AI 服务尚未配置，请稍后再试。');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('内置 AI 短暂 502 时只重试一次，不会调用其他渠道', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'failed' }), { status: 502 }))
      .mockResolvedValueOnce(successfulUpstream('重试成功'));
    vi.stubGlobal('fetch', fetchMock);

    const pending = onRequestPost({
      request: createRequest(),
      env: builtinEnv,
    });
    await vi.advanceTimersByTimeAsync(300);
    const response = await pending;

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ content: '重试成功' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://primary.example/v1/chat/completions');
    expect(fetchMock.mock.calls[1]?.[0]).toBe('https://primary.example/v1/chat/completions');
  });

  it('内置 AI 连续 502 时返回繁忙语义，不暴露成模糊 502', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'failed' }), { status: 502 }));
    vi.stubGlobal('fetch', fetchMock);

    const pending = onRequestPost({ request: createRequest(), env: builtinEnv });
    await vi.advanceTimersByTimeAsync(300);
    const response = await pending;

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'AI 服务当前繁忙，请稍后重试。' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('内置 AI 限流时保留重试时间且不自动放大请求', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'busy' }), {
      status: 429,
      headers: { 'Retry-After': '12' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestPost({ request: createRequest(), env: builtinEnv });

    expect(response.status).toBe(503);
    expect(response.headers.get('Retry-After')).toBe('12');
    expect(await response.json()).toEqual({ error: 'AI 服务当前请求较多，请稍后重试。' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('内置 AI 超过旧的 45 秒限制后仍可完成解读', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_input, init?: RequestInit) => new Promise<Response>((resolve, reject) => {
      const completion = setTimeout(() => resolve(successfulUpstream('较长解读完成')), 46_000);
      init?.signal?.addEventListener('abort', () => {
        clearTimeout(completion);
        reject(init.signal?.reason);
      }, { once: true });
    }));
    vi.stubGlobal('fetch', fetchMock);

    const pending = onRequestPost({ request: createRequest(), env: builtinEnv });
    await vi.advanceTimersByTimeAsync(46_000);
    const response = await pending;

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ content: '较长解读完成' });
  });

  it('达到新的上游时限后返回 504 而不是伪装成 502', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_input, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
    })));

    const pending = onRequestPost({ request: createRequest(), env: builtinEnv });
    await vi.advanceTimersByTimeAsync(90_000);
    const response = await pending;

    expect(response.status).toBe(504);
    expect(await response.json()).toEqual({ error: 'AI 解读等待超时，请稍后重试。' });
  });

  it('三种解答框架使用匹配的输出预算', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(successfulUpstream()));
    vi.stubGlobal('fetch', fetchMock);

    const expectations = [
      ['chat', 1100],
      ['fortune-master', 2000],
      ['professional', 3000],
    ] as const;
    for (const [preference, maxTokens] of expectations) {
      const response = await onRequestPost({ request: createRequest(undefined, preference), env: builtinEnv });
      expect(response.status).toBe(200);
      const call = fetchMock.mock.calls.at(-1) as [string, RequestInit] | undefined;
      const body = JSON.parse(String(call?.[1].body)) as Record<string, unknown>;
      expect(body.max_tokens).toBe(maxTokens);
    }
  });

  it('用户选择的第三方渠道失败时不会调用内置渠道', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('connection failed'));
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestPost({
      request: createRequest({
        enabled: true,
        provider: 'openai-compatible',
        apiType: 'chat',
        baseUrl: 'https://custom.example/v1',
        model: 'custom-model',
        apiKey: 'custom-key',
      }),
      env: {},
    });
    const result = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(502);
    expect(result.error).toBe('AI 服务返回了错误，请检查模型、接口地址和密钥配置。');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('正常公网 HTTPS 自定义渠道不会被额外 DNS 请求误拦', async () => {
    const fetchMock = vi.fn().mockResolvedValue(successfulUpstream());
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestPost({
      request: createRequest({
        enabled: true,
        provider: 'openai-compatible',
        apiType: 'chat',
        baseUrl: 'https://api.deepseek.com/v1',
        model: 'deepseek-chat',
        apiKey: 'custom-key',
      }),
      env: {},
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ content: '测试成功', provider: 'custom' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://api.deepseek.com/v1/chat/completions');
  });
});
