import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestAgentToolSelection } from './agent';

const baseRequest = {
  question: '请继续看岁运',
  hasProfile: true,
  castingPreference: 'auto' as const,
};

function mockSelection(selection: unknown) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ selection }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })));
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Agent 工具结果前端校验', () => {
  it('允许普通追问沿用上一轮盘面', async () => {
    mockSelection({ mode: 'continue' });
    await expect(requestAgentToolSelection(baseRequest)).resolves.toEqual({ mode: 'continue' });
  });

  it('接收紫微目标流年与星盘目标日期', async () => {
    mockSelection({ mode: 'chart', chartKind: 'ziwei', ziweiFortune: { scope: 'yearly', year: 2032 } });
    await expect(requestAgentToolSelection(baseRequest)).resolves.toEqual({
      mode: 'chart',
      chartKind: 'ziwei',
      ziweiFortune: { scope: 'yearly', year: 2032 },
    });

    mockSelection({ mode: 'chart', chartKind: 'astrolabe', astrolabeFortune: { scope: 'daily', date: '2032-05-06' } });
    await expect(requestAgentToolSelection(baseRequest)).resolves.toEqual({
      mode: 'chart',
      chartKind: 'astrolabe',
      astrolabeFortune: { scope: 'daily', date: '2032-05-06' },
    });
  });

  it('接收指定八字大运，并丢弃无效年份和日期', async () => {
    mockSelection({ mode: 'chart', chartKind: 'bazi', baziFortune: { scope: 'dayun', ganZhi: '庚午', year: 2032 } });
    await expect(requestAgentToolSelection(baseRequest)).resolves.toEqual({
      mode: 'chart',
      chartKind: 'bazi',
      baziFortune: { scope: 'dayun', ganZhi: '庚午', year: 2032 },
    });

    mockSelection({ mode: 'chart', chartKind: 'astrolabe', astrolabeFortune: { scope: 'daily', date: '2032-02-31' } });
    await expect(requestAgentToolSelection(baseRequest)).resolves.toEqual({
      mode: 'chart',
      chartKind: 'astrolabe',
      astrolabeFortune: { scope: 'daily' },
    });
  });
});
