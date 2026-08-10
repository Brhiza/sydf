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
  it('内置 AI 未配置时通过隐藏备用渠道调用白名单工具', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      choices: [{ message: { tool_calls: [{ type: 'function', function: { name: 'read_bazi_ziwei', arguments: '{"fortune_scope":"full"}' } }] } }],
    }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestPost({ request: createRequest(), env: {} });
    const result = await response.json() as Record<string, unknown>;
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    const headers = init.headers as Record<string, string>;

    expect(response.status).toBe(200);
    expect(result).toEqual({ selection: { mode: 'chart', chartKind: 'bazi-ziwei', baziFortune: { scope: 'full' } } });
    expect(url).toBe('https://opencode.ai/zen/v1/chat/completions');
    expect(headers['x-opencode-client']).toBe('desktop');
    expect(body.tool_choice).toBe('required');
    expect(Array.isArray(body.tools)).toBe(true);
    expect(JSON.stringify(body.tools)).toContain('cast_liuyao');
    expect(JSON.stringify(body.tools)).toContain('calculate_wuyun_liuqi');
    expect(JSON.stringify(body.tools)).toContain('calculate_huangji_jingshi');
    expect(JSON.stringify(body.tools)).toContain('fortune_scope');
  });

  it('把五运六气工具年份传回前端', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      choices: [{ message: { tool_calls: [{ type: 'function', function: { name: 'calculate_wuyun_liuqi', arguments: '{"year":2028}' } }] } }],
    }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestPost({ request: createRequest(), env: {} });

    expect(await response.json()).toEqual({ selection: { mode: 'divination', divinationKind: 'wuyun-liuqi', wuyunYear: 2028 } });
  });

  it('把皇极经世公历年份传回前端', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      choices: [{ message: { tool_calls: [{ type: 'function', function: { name: 'calculate_huangji_jingshi', arguments: '{"year":2028}' } }] } }],
    }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestPost({ request: createRequest(), env: {} });

    expect(await response.json()).toEqual({ selection: { mode: 'divination', divinationKind: 'huangji-jingshi', huangjiYear: 2028 } });
  });

  it('把七政四余工具选择传回前端', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      choices: [{ message: { tool_calls: [{ type: 'function', function: { name: 'read_qizheng', arguments: '{}' } }] } }],
    }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await onRequestPost({ request: createRequest(), env: {} });

    expect(await response.json()).toEqual({ selection: { mode: 'chart', chartKind: 'qizheng' } });
  });

  it('兼容 Responses 工具调用结果', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      output: [{ type: 'function_call', name: 'cast_qimen', arguments: '{"scope":"month"}' }],
    }));
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
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      content: [{ type: 'tool_use', name: 'cast_liuren', input: {} }],
    }));
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

  it('自定义渠道不支持工具调用时不会转发到隐藏备用渠道', async () => {
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
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
