import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildAiInterpretationRequestBody, requestAiInterpretation, requestAiModels, type AiInterpretationRequest } from './ai';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('AI 解读请求', () => {
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
      enabled: true,
      provider: 'openai-compatible',
      apiType: 'chat',
      baseUrl: 'https://api.example.com/v1',
      model: 'test-model',
      apiKey: 'test-key',
    });
    const assertion = expect(pending).rejects.toThrow('获取模型超时，请检查网络或接口地址后重试。');
    await vi.advanceTimersByTimeAsync(20_000);
    await assertion;
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
});
