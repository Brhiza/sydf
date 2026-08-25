import { describe, expect, it } from 'vitest';
import {
  buildInstantAiPrompt,
  buildInstantObserver,
  instantChartNeedsObserver,
  runInstantChart,
} from './instantChart';

describe('即时盘前端适配', () => {
  it('北京时间八字即时盘不读取案例和性别资料', async () => {
    const response = await runInstantChart({
      type: 'bazi',
      timeStandard: 'beijing',
      now: new Date('2026-08-24T08:30:00.000Z'),
    });

    expect(response.type).toBe('bazi');
    expect(response.wallClock).toMatchObject({ year: 2026, month: 8, day: 24, hour: 16, minute: 30 });
    expect(response.result).not.toHaveProperty('gender');
    expect(response.result).not.toHaveProperty('luckInfo');
    const prompt = buildInstantAiPrompt(response, '这件事现在是否适合推进？');
    expect(prompt).toContain('当前时刻的事件盘');
    expect(prompt).toContain('不要当作个人出生盘');
    expect(prompt).not.toContain('出生性别');
  });

  it('只在所选即时盘确实需要时要求观测地点', () => {
    expect(instantChartNeedsObserver('bazi', 'beijing')).toBe(false);
    expect(instantChartNeedsObserver('bazi', 'true-solar')).toBe(true);
    expect(instantChartNeedsObserver('astrolabe', 'beijing')).toBe(true);
    expect(buildInstantObserver({ locationName: '', longitude: '', latitude: '', timezone: 8 })).toBeUndefined();
    expect(buildInstantObserver({ locationName: '北京市 东城区', longitude: '116.4074', latitude: '39.9042', timezone: '8' })).toEqual({
      locationName: '北京市 东城区',
      longitude: 116.4074,
      latitude: 39.9042,
      timezone: 8,
    });
  });
});
