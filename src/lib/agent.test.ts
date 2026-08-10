import { afterEach, describe, expect, it, vi } from 'vitest';
import { getImmediateActiveDivinationSelection, requestAgentToolSelection } from './agent';

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
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Agent 工具结果前端校验', () => {
  it('首次对话已选梅花时直接使用当前工具', () => {
    expect(getImmediateActiveDivinationSelection('你好', 'meihua', false)).toEqual({ mode: 'divination', divinationKind: 'meihua' });
  });

  it('问题明确点名其他术式时仍交给 Agent 切换', () => {
    expect(getImmediateActiveDivinationSelection('改用紫微看看', 'meihua', false)).toBeNull();
  });

  it('0 基础没有预选术式时继续交给 Agent 自动选择', () => {
    expect(getImmediateActiveDivinationSelection('接下来十年财运怎么样', undefined, false)).toBeNull();
  });

  it('识别小六壬工具调用结果', async () => {
    mockSelection({ mode: 'divination', divinationKind: 'xiaoliuren' });
    await expect(requestAgentToolSelection(baseRequest)).resolves.toEqual({ mode: 'divination', divinationKind: 'xiaoliuren' });
  });

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

  it('工具选择超时后结束等待并提示重试', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url: string, init?: RequestInit) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
    })));
    const request = requestAgentToolSelection(baseRequest, undefined, 100);
    const expectation = expect(request).rejects.toThrow('AI 选择工具等待超时，请重试。');
    await vi.advanceTimersByTimeAsync(100);
    await expectation;
  });
});
