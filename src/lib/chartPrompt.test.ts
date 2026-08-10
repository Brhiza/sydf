import { describe, expect, it } from 'vitest';
import { baziCalculator } from 'mingyu-core/bazi';
import { buildAstrolabeScopeContext } from 'mingyu-core/divination/astrolabe-scope';
import type { AstrolabeData } from 'mingyu-core/types';
import { buildChartReadingPrompt, inferBaziFortuneRequest } from './chartPrompt';
import { runDivination, type BirthForm } from './divination';

const chart = baziCalculator.calculateBazi({
  year: 1990,
  month: 6,
  day: 15,
  timeIndex: 6,
  birthHour: 12,
  birthMinute: 0,
  gender: 'male',
  isLunar: false,
});

describe('星盘推运提示词', () => {
  it('把模型选择的目标年份写入真实年度推运资料', async () => {
    const birth: BirthForm = {
      name: '测试案例',
      gender: 'male',
      date: '1990-06-15',
      dateType: 'solar',
      isLeapMonth: false,
      time: '12:00',
      timeBasis: 'clock',
      locationName: '北京市 东城区',
      latitude: '39.9042',
      longitude: '116.4074',
      timezone: '8',
    };
    const result = await runDivination('astrolabe', new Date('2026-08-09T12:00:00+08:00'), birth) as AstrolabeData;
    const fortuneScope = buildAstrolabeScopeContext(result, 'yearly', '2028');
    const scopedResult = { ...result, fortuneScope } as AstrolabeData;
    const prompt = buildChartReadingPrompt('astrolabe', scopedResult, { question: '请看 2028 年事业行运' });

    expect(fortuneScope.dateStr).toBe('2028');
    expect(prompt).toContain('【流年2028】');
    expect(prompt).toContain('太阳返照');
    expect(prompt).toContain('次限');
    expect(prompt).toContain('太阳弧');
    expect(prompt).not.toContain('2026 年度推运');
  });
});

describe('八字岁运提示词', () => {
  it('识别明确年份、相对年份和完整岁运范围', () => {
    const now = new Date('2026-08-09T12:00:00+08:00');
    expect(inferBaziFortuneRequest('看看 2028 年流年', now)).toEqual({ scope: 'year', year: 2028 });
    expect(inferBaziFortuneRequest('明年事业整体趋势', now)).toEqual({ scope: 'year', year: 2027 });
    expect(inferBaziFortuneRequest('未来十年完整分析', now)).toEqual({ scope: 'full' });
    expect(inferBaziFortuneRequest('请完成一份完整命书', now)).toEqual({ scope: 'full' });
    expect(inferBaziFortuneRequest('现在这步大运怎么样', now)).toEqual({ scope: 'dayun' });
  });

  it('把选定流年及所属大运的核心资料写入提示词', () => {
    const prompt = buildChartReadingPrompt('bazi', chart, {
      question: '2028 年事业整体趋势如何？',
      baziFortune: { scope: 'year', year: 2028 },
      currentTime: new Date('2026-08-09T12:00:00+08:00'),
    });
    expect(prompt).toContain('2028年');
    expect(prompt).toContain('【岁运重点】');
    expect(prompt).toContain('上层岁运：');
    expect(prompt).toContain('主要触发：');
    expect(prompt).not.toContain('【大运】');
    expect(prompt).not.toContain('所属大运包含的流年');
    expect(prompt).not.toContain('该流年包含的流月');
    expect(prompt).not.toMatch(/2027年（\d+岁）/);
    expect(prompt).not.toMatch(/2029年（\d+岁）/);
    expect(prompt).not.toContain('【问题】');
    expect(prompt).not.toContain('【任务】');
    expect(prompt).not.toMatch(/【[^】]+】\s*(?=【|$)/);
  });

  it('只问本命时不附带整套大运或空章节', () => {
    const prompt = buildChartReadingPrompt('bazi', chart, {
      question: '只看本命事业格局。',
      baziFortune: { scope: 'natal' },
      currentTime: new Date('2026-08-09T12:00:00+08:00'),
    });

    expect(prompt).toContain('本命盘');
    expect(prompt).toContain('年柱：庚午（劫财）');
    expect(prompt).not.toContain('【大运】');
    expect(prompt).not.toMatch(/【[^】]+】\s*(?=【|$)/);
  });
});
