import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildAiInterpretationRequestBody, requestAiInterpretation, type AiInterpretationRequest } from './ai';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('AI 解读请求', () => {
  const request: AiInterpretationRequest = {
    mode: 'divination',
    question: '我的项目怎么样',
    method: '梅花易数',
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

  it('在网络边界移除原始排盘和审计依据', () => {
    const body = buildAiInterpretationRequestBody(request);
    const serialized = JSON.stringify(body);

    expect(body.reading).toEqual({
      summary: request.reading?.summary,
      prompt: request.reading?.prompt,
    });
    expect(serialized).toContain('体用关系');
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
});
