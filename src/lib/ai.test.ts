import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildAiInterpretationRequestBody, requestAiInterpretation, requestAiModels, type AiInterpretationRequest } from './ai';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('AI 解读请求', () => {
  const customConfig = {
    enabled: true,
    provider: 'openai-compatible' as const,
    apiType: 'chat' as const,
    baseUrl: 'https://api.example.com/v1',
    model: 'test-model',
    apiKey: 'test-key',
  };
  const request: AiInterpretationRequest = {
    mode: 'divination',
    question: '我的项目怎么样',
    method: '梅花易数',
    profile: {
      label: '不应发送的案例',
      name: '不应发送的姓名',
      gender: 'male',
      date: '1999-06-20',
      dateType: 'solar',
      isLeapMonth: false,
      time: '06:00',
      locationName: '北京市 东城区',
      timeBasis: 'trueSolar',
    },
    reading: {
      summary: '主卦离为火，变卦火山旅。',
      data: {
        evidenceAnalysis: {
          calculationChain: ['不应发送的计算链'],
          sources: ['不应发送的依据来源'],
        },
      },
      prompt: '主卦：离为火\n变卦：火山旅\n体用关系：体用比和；体生用',
    },
  };

  it('占卜请求只发送完整提示词，移除案例、摘要、原始排盘和审计依据', () => {
    const body = buildAiInterpretationRequestBody(request);
    const serialized = JSON.stringify(body);

    expect(body.reading).toEqual({
      prompt: request.reading?.prompt,
    });
    expect(serialized).toContain('体用关系');
    expect(serialized).not.toContain('主卦离为火，变卦火山旅。');
    expect(serialized).not.toContain('不应发送的案例');
    expect(serialized).not.toContain('1999-06-20');
    expect(serialized).not.toContain('evidenceAnalysis');
    expect(serialized).not.toContain('calculationChain');
    expect(serialized).not.toContain('不应发送');
  });

  it('实际提交时只发送筛选后的盘面提示词', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ content: '项目仍可推进。' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await requestAiInterpretation(request);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const serialized = String(init.body);
    expect(serialized).toContain('体用关系');
    expect(serialized).not.toContain('evidenceAnalysis');
    expect(serialized).not.toContain('calculationChain');
  });

  it('自配 Chat 接口优先由浏览器直接请求', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      model: 'test-model',
      choices: [{ message: { content: '项目仍可推进。' } }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(requestAiInterpretation({ ...request, aiConfig: customConfig })).resolves.toEqual({
      content: '项目仍可推进。',
      model: 'test-model',
      provider: 'custom',
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    const serialized = JSON.stringify(body);
    expect(url).toBe('https://api.example.com/v1/chat/completions');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer test-key' });
    expect(body.model).toBe('test-model');
    expect(body.max_tokens).toBeUndefined();
    expect(serialized).toContain('体用关系');
    expect(serialized).not.toContain('test-key');
    expect(serialized).not.toContain('aiConfig');
    expect(serialized).not.toContain('evidenceAnalysis');
  });

  it('自配 Responses 接口使用对应地址和正文格式', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      model: 'response-model',
      output_text: 'Responses 返回内容',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await requestAiInterpretation({
      ...request,
      aiConfig: { ...customConfig, apiType: 'responses', model: 'response-model' },
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(url).toBe('https://api.example.com/v1/responses');
    expect(body.instructions).toEqual(expect.any(String));
    expect(body.input).toEqual(expect.any(Array));
    expect(body.store).toBe(false);
    expect(body.max_output_tokens).toBeUndefined();
    expect(result.content).toBe('Responses 返回内容');
  });

  it('自配 Anthropic 接口使用对应鉴权和正文格式', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      model: 'claude-test',
      content: [{ type: 'text', text: 'Anthropic 返回内容' }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await requestAiInterpretation({
      ...request,
      aiConfig: {
        ...customConfig,
        apiType: 'anthropic',
        baseUrl: 'https://api.anthropic.com/v1/messages',
        model: 'claude-test',
      },
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(headers['x-api-key']).toBe('test-key');
    expect(headers['anthropic-dangerous-direct-browser-access']).toBe('true');
    expect(body.system).toEqual(expect.any(String));
    expect(body.max_tokens).toBe(8192);
    expect(result.content).toBe('Anthropic 返回内容');
  });

  it('浏览器无法直连后记住状态，后续请求直接走站点代理', async () => {
    const blockedConfig = { ...customConfig, baseUrl: 'https://blocked.example.com/v1' };
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ content: '代理返回内容' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })));
    vi.stubGlobal('fetch', fetchMock);

    await expect(requestAiInterpretation({ ...request, aiConfig: blockedConfig })).resolves.toEqual({ content: '代理返回内容' });
    await expect(requestAiInterpretation({ ...request, aiConfig: blockedConfig })).resolves.toEqual({ content: '代理返回内容' });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://blocked.example.com/v1/chat/completions');
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/interpret');
    expect(fetchMock.mock.calls[2]?.[0]).toBe('/api/interpret');
  });

  it('第三方明确返回配置错误时不重复走代理', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: 'API Key 无效' } }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(requestAiInterpretation({ ...request, aiConfig: customConfig })).rejects.toThrow('API Key 无效');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('命盘请求仍保留案例，有提示词时不重复发送摘要', () => {
    const body = buildAiInterpretationRequestBody({ ...request, mode: 'chart' });

    expect(body.profile).toEqual(request.profile);
    expect(body.reading).toEqual({ prompt: request.reading?.prompt });
  });

  it('没有提示词时回退发送摘要', () => {
    const body = buildAiInterpretationRequestBody({
      ...request,
      reading: { summary: '仅有摘要', data: { ignored: true } },
    });

    expect(body.reading).toEqual({ summary: '仅有摘要' });
    expect(JSON.stringify(body)).not.toContain('ignored');
  });

  it('模型列表等待超时后给出明确错误', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_input, init?: RequestInit) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
    })));

    const pending = requestAiModels({
      enabled: false,
      provider: 'builtin',
      apiType: 'chat',
      baseUrl: 'https://api.example.com/v1',
      model: 'test-model',
      apiKey: 'test-key',
    });
    const assertion = expect(pending).rejects.toThrow('获取模型超时，请检查网络或接口地址后重试。');
    await vi.advanceTimersByTimeAsync(20_000);
    await assertion;
  });

  it('模型列表优先直连，浏览器无法连接时自动走代理', async () => {
    const blockedConfig = { ...customConfig, baseUrl: 'https://models-blocked.example.com/v1' };
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ models: ['model-b', 'model-a'] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(requestAiModels(blockedConfig)).resolves.toEqual(['model-b', 'model-a']);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://models-blocked.example.com/v1/models');
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/models');
  });

  it('模型列表直连成功时不请求站点代理', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: [{ id: 'model-b' }, { id: 'model-a' }, { id: 'model-a' }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(requestAiModels(customConfig)).resolves.toEqual(['model-a', 'model-b']);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.example.com/v1/models');
    expect(init.method).toBe('GET');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer test-key' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('AI 解读等待超时后给出明确错误', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_input, init?: RequestInit) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
    })));

    const pending = requestAiInterpretation(request);
    const assertion = expect(pending).rejects.toThrow('AI 解读等待超时，请稍后重试。');
    await vi.advanceTimersByTimeAsync(95_000);
    await assertion;
  });

  it('超过旧的 50 秒限制后仍等待服务端结果', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((resolve) => {
      setTimeout(() => resolve(new Response(JSON.stringify({ content: '较长解读完成' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })), 60_000);
    })));

    const pending = requestAiInterpretation(request);
    await vi.advanceTimersByTimeAsync(60_000);

    await expect(pending).resolves.toMatchObject({ content: '较长解读完成' });
  });

  it('网关错误页没有 JSON 时也显示清楚的繁忙提示', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>bad gateway</html>', {
      status: 502,
      headers: { 'Content-Type': 'text/html' },
    })));

    await expect(requestAiInterpretation(request)).rejects.toThrow('AI 服务当前繁忙，请稍后重试。');
  });
});
