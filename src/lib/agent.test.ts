import { afterEach, describe, expect, it, vi } from 'vitest';
import { getImmediateActiveDivinationSelection, getLocalAgentSelection, requestAgentToolSelection } from './agent';

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
  const customConfig = {
    enabled: true,
    provider: 'openai-compatible' as const,
    apiType: 'chat' as const,
    baseUrl: 'https://api.example.com/v1',
    model: 'test-model',
    apiKey: 'test-key',
  };
  it('首次对话已选梅花时直接使用当前工具', () => {
    expect(getImmediateActiveDivinationSelection('你好', 'meihua', false)).toEqual({ mode: 'divination', divinationKind: 'meihua' });
  });

  it('问题明确点名其他术式时仍交给 Agent 切换', () => {
    expect(getImmediateActiveDivinationSelection('改用紫微看看', 'meihua', false)).toBeNull();
  });

  it('0 基础没有预选术式时继续交给 Agent 自动选择', () => {
    expect(getImmediateActiveDivinationSelection('接下来十年财运怎么样', undefined, false)).toBeNull();
  });

  it('明确术式、本地择日和单件问事不请求 AI', () => {
    expect(getLocalAgentSelection({ question: '请用紫微看明年流年', hasProfile: true })).toEqual({
      mode: 'chart', chartKind: 'ziwei', ziweiFortune: { scope: 'yearly', year: new Date().getFullYear() + 1 },
    });
    expect(getLocalAgentSelection({ question: '搬家选哪个日子比较好', hasProfile: false })).toEqual({ mode: 'divination', divinationKind: 'almanac' });
    expect(getLocalAgentSelection({ question: '这次面试能不能录取', hasProfile: false })).toEqual({ mode: 'divination', divinationKind: 'liuyao' });
  });

  it('长期综合问题使用命盘，模糊问题仍交给 AI', () => {
    expect(getLocalAgentSelection({ question: '全面分析未来十年的事业、财富和婚姻', hasProfile: true })).toEqual({
      mode: 'chart', chartKind: 'bazi-ziwei', baziFortune: { scope: 'full' }, ziweiFortune: { scope: 'full' },
    });
    expect(getLocalAgentSelection({ question: '最近总觉得不太顺，帮我看看', hasProfile: true })).toBeNull();
  });

  it('命盘连续对话只在明确改年份时本地续接', () => {
    expect(getLocalAgentSelection({ question: '明年呢', hasProfile: true, previousTool: 'bazi', conversation: [{ role: 'user', content: '今年财运' }] })).toEqual({
      mode: 'chart', chartKind: 'bazi', baziFortune: { scope: 'year', year: new Date().getFullYear() + 1 },
    });
    expect(getLocalAgentSelection({ question: '为什么会这样', hasProfile: true, previousTool: 'bazi', conversation: [{ role: 'user', content: '今年财运' }] })).toBeNull();
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

  it('自配接口的工具选择优先由浏览器直接请求', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { tool_calls: [{ function: { name: 'cast_qimen', arguments: JSON.stringify({ scope: 'day' }) } }] } }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(requestAgentToolSelection({ ...baseRequest, aiConfig: customConfig })).resolves.toEqual({
      mode: 'divination',
      divinationKind: 'qimen',
      qimenScope: 'day',
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(url).toBe('https://api.example.com/v1/chat/completions');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer test-key' });
    expect(body.tools).toEqual(expect.any(Array));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('自配接口无法直连后记住状态，后续工具选择直接走代理', async () => {
    const blockedConfig = { ...customConfig, baseUrl: 'https://agent-blocked.example.com/v1' };
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ selection: { mode: 'continue' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })));
    vi.stubGlobal('fetch', fetchMock);

    await expect(requestAgentToolSelection({ ...baseRequest, aiConfig: blockedConfig })).resolves.toEqual({ mode: 'continue' });
    await expect(requestAgentToolSelection({ ...baseRequest, aiConfig: blockedConfig })).resolves.toEqual({ mode: 'continue' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://agent-blocked.example.com/v1/chat/completions');
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/agent');
    expect(fetchMock.mock.calls[2]?.[0]).toBe('/api/agent');
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
