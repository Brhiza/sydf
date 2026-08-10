import { afterEach, describe, expect, it, vi } from 'vitest';
import { onRequestPost } from './interpret';

function createRequest(aiConfig?: Record<string, unknown>, answerPreference?: 'chat' | 'fortune-master' | 'professional') {
  return new Request('https://example.com/api/interpret', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('内置 AI 服务端备用渠道', () => {
  it('内置 AI 未配置时使用隐藏备用渠道且不向前端暴露配置', async () => {
    const fetchMock = vi.fn().mockResolvedValue(successfulUpstream());
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestPost({ request: createRequest(), env: {} });
    const result = await response.json() as Record<string, unknown>;
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(result).toEqual({ content: '测试成功', provider: 'builtin' });
    expect(url).toBe('https://opencode.ai/zen/v1/chat/completions');
    expect(headers['x-opencode-client']).toBe('desktop');
    expect(headers.Authorization).toBe('Bearer public');
    expect(body.model).toBe('deepseek-v4-flash-free');
  });

  it('内置 AI 请求失败后自动回退', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'failed' }), { status: 502 }))
      .mockResolvedValueOnce(successfulUpstream('备用渠道返回'));
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestPost({
      request: createRequest(),
      env: {
        AI_BASE_URL: 'https://primary.example/v1',
        AI_API_KEY: 'primary-key',
        AI_MODEL: 'primary-model',
      },
    });
    const result = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(result).toEqual({ content: '备用渠道返回', provider: 'builtin' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://primary.example/v1/chat/completions');
    expect(fetchMock.mock.calls[1]?.[0]).toBe('https://opencode.ai/zen/v1/chat/completions');
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
      const response = await onRequestPost({ request: createRequest(undefined, preference), env: {} });
      expect(response.status).toBe(200);
      const call = fetchMock.mock.calls.at(-1) as [string, RequestInit] | undefined;
      const body = JSON.parse(String(call?.[1].body)) as Record<string, unknown>;
      expect(body.max_tokens).toBe(maxTokens);
    }
  });

  it('用户选择的第三方渠道失败时不会转发到隐藏备用渠道', async () => {
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
});
