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

  it('内置 AI 请求失败时不会调用其他渠道', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'failed' }), { status: 502 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestPost({
      request: createRequest(),
      env: builtinEnv,
    });
    const result = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(502);
    expect(result.error).toBe('AI 解读暂时失败，请稍后再试。');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://primary.example/v1/chat/completions');
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
