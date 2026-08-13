import { afterEach, describe, expect, it, vi } from 'vitest';
import { onRequestPost } from './agent';

function createRequest(aiConfig?: Record<string, unknown>) {
  return new Request('https://example.com/api/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: '请完整分析未来几年的事业、财富和婚姻。',
      hasProfile: true,
      castingPreference: 'auto',
      ...(aiConfig ? { aiConfig } : {}),
    }),
  });
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('0 基础 Agent 工具调用', () => {
  const builtinEnv = {
    AI_BASE_URL: 'https://primary.example/v1',
    AI_API_KEY: 'primary-key',
    AI_MODEL: 'primary-model',
  };

  it('内置 AI 未配置时不发起外部请求', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestPost({ request: createRequest(), env: {} });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'AI 服务尚未配置，请稍后再试。' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('内置 AI 通过正式配置调用白名单工具', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      choices: [{ message: { tool_calls: [{ type: 'function', function: { name: 'read_bazi_ziwei', arguments: '{"fortune_scope":"full"}' } }] } }],
    }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestPost({ request: createRequest(), env: builtinEnv });
    const result = await response.json() as Record<string, unknown>;
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    const headers = init.headers as Record<string, string>;

    expect(response.status).toBe(200);
    expect(result).toEqual({ selection: { mode: 'chart', chartKind: 'bazi-ziwei', baziFortune: { scope: 'full' }, ziweiFortune: { scope: 'full' } } });
    expect(url).toBe('https://primary.example/v1/chat/completions');
    expect(headers.Authorization).toBe('Bearer primary-key');
    expect(body.tool_choice).toBe('required');
    expect(Array.isArray(body.tools)).toBe(true);
    expect(JSON.stringify(body.tools)).toContain('cast_liuyao');
    expect(JSON.stringify(body.tools)).toContain('cast_xiaoliuren');
    expect(JSON.stringify(body.tools)).toContain('calculate_wuyun_liuqi');
    expect(JSON.stringify(body.tools)).toContain('calculate_huangji_jingshi');
    expect(JSON.stringify(body.tools)).toContain('fortune_scope');
    expect(JSON.stringify(body.tools)).toContain('target_date');
  });

  it('把紫微目标流年传回前端', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      choices: [{ message: { tool_calls: [{ type: 'function', function: { name: 'read_ziwei', arguments: '{"fortune_scope":"yearly","target_year":2028}' } }] } }],
    }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestPost({ request: createRequest(), env: builtinEnv });

    expect(await response.json()).toEqual({ selection: { mode: 'chart', chartKind: 'ziwei', ziweiFortune: { scope: 'yearly', year: 2028 } } });
  });

  it('允许模型沿用上一轮盘面继续解释', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      choices: [{ message: { tool_calls: [{ type: 'function', function: { name: 'continue_reading', arguments: '{}' } }] } }],
    }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestPost({ request: createRequest(), env: builtinEnv });

    expect(await response.json()).toEqual({ selection: { mode: 'continue' } });
  });

  it('把指定八字大运干支传回前端', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      choices: [{ message: { tool_calls: [{ type: 'function', function: { name: 'read_bazi', arguments: '{"fortune_scope":"dayun","target_dayun_ganzhi":"庚午"}' } }] } }],
    }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestPost({ request: createRequest(), env: builtinEnv });

    expect(await response.json()).toEqual({ selection: { mode: 'chart', chartKind: 'bazi', baziFortune: { scope: 'dayun', ganZhi: '庚午' } } });
  });

  it('把星盘月度推运日期传回前端', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      choices: [{ message: { tool_calls: [{ type: 'function', function: { name: 'read_astrolabe', arguments: '{"fortune_scope":"monthly","target_date":"2028-05"}' } }] } }],
    }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestPost({ request: createRequest(), env: builtinEnv });

    expect(await response.json()).toEqual({ selection: { mode: 'chart', chartKind: 'astrolabe', astrolabeFortune: { scope: 'monthly', date: '2028-05' } } });
  });

  it('把五运六气工具年份传回前端', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      choices: [{ message: { tool_calls: [{ type: 'function', function: { name: 'calculate_wuyun_liuqi', arguments: '{"year":2028}' } }] } }],
    }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestPost({ request: createRequest(), env: builtinEnv });

    expect(await response.json()).toEqual({ selection: { mode: 'divination', divinationKind: 'wuyun-liuqi', wuyunYear: 2028 } });
  });

  it('把皇极经世公历年份传回前端', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      choices: [{ message: { tool_calls: [{ type: 'function', function: { name: 'calculate_huangji_jingshi', arguments: '{"year":2028}' } }] } }],
    }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestPost({ request: createRequest(), env: builtinEnv });

    expect(await response.json()).toEqual({ selection: { mode: 'divination', divinationKind: 'huangji-jingshi', huangjiYear: 2028 } });
  });

  it('把七政四余工具选择传回前端', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      choices: [{ message: { tool_calls: [{ type: 'function', function: { name: 'read_qizheng', arguments: '{}' } }] } }],
    }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestPost({ request: createRequest(), env: builtinEnv });

    expect(await response.json()).toEqual({ selection: { mode: 'chart', chartKind: 'qizheng' } });
  });

  it('把小六壬工具选择传回前端', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      choices: [{ message: { tool_calls: [{ type: 'function', function: { name: 'cast_xiaoliuren', arguments: '{}' } }] } }],
    }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestPost({ request: createRequest(), env: builtinEnv });

    expect(await response.json()).toEqual({ selection: { mode: 'divination', divinationKind: 'xiaoliuren' } });
  });

  it('兼容 Responses 工具调用结果', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ output: [{ type: 'function_call', name: 'cast_qimen', arguments: '{"scope":"month"}' }] }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestPost({
      request: createRequest({
        enabled: true,
        provider: 'openai-compatible',
        apiType: 'responses',
        baseUrl: 'https://custom.example/v1',
        model: 'custom-model',
        apiKey: 'custom-key',
      }),
      env: {},
    });

    expect(await response.json()).toEqual({ selection: { mode: 'divination', divinationKind: 'qimen', qimenScope: 'month' } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('兼容 Anthropic 工具调用结果', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ content: [{ type: 'tool_use', name: 'cast_liuren', input: {} }] }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestPost({
      request: createRequest({
        enabled: true,
        provider: 'openai-compatible',
        apiType: 'anthropic',
        baseUrl: 'https://api.anthropic.com/v1',
        model: 'custom-model',
        apiKey: 'custom-key',
      }),
      env: {},
    });

    expect(await response.json()).toEqual({ selection: { mode: 'divination', divinationKind: 'liuren' } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('自定义渠道不支持工具调用时不会调用内置渠道', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ choices: [{ message: { content: '普通文本' } }] }));
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

    expect(response.status).toBe(502);
    expect(fetchMock.mock.calls.filter(([url]) => url === 'https://custom.example/v1/chat/completions')).toHaveLength(1);
    expect(fetchMock.mock.calls.some(([url]) => url === 'https://primary.example/v1/chat/completions')).toBe(false);
  });
});
