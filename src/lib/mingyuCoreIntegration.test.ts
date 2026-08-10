import { describe, expect, it } from 'vitest';
import { baziCalculator, buildFortuneSelectionContext } from 'mingyu-core/bazi';
import { buildZiweiChartInput, calculateZiweiChart } from 'mingyu-core/ziwei/iztro';

describe('mingyu-core 0.1.28 直接集成', () => {
  it('由核心岁运上下文按真实交运时刻裁剪各层候选', () => {
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
    const cycleIndex = chart.luckInfo.cycles.findIndex((cycle) => !cycle.isXiaoyun);
    const cycleContext = buildFortuneSelectionContext(chart, { scope: 'dayun', cycleIndex });
    const yearContext = buildFortuneSelectionContext(chart, { scope: 'year', cycleIndex, year: 1997 });
    const firstMonth = yearContext?.monthBreakdown?.[0];
    const monthContext = buildFortuneSelectionContext(chart, {
      scope: 'month',
      cycleIndex,
      year: 1997,
      month: firstMonth?.month ?? 1,
    });
    const dayContext = buildFortuneSelectionContext(chart, {
      scope: 'day',
      cycleIndex,
      year: 1997,
      month: firstMonth?.month ?? 1,
      day: 3,
    });

    expect(cycleContext?.yearBreakdown?.[0]?.year).toBe(1997);
    expect(yearContext?.monthBreakdown?.[0]?.timeRange.startTimestamp).toBe(cycleContext?.cycleTimeRange.startTimestamp);
    expect(monthContext?.dayBreakdown?.[0]?.date).toBe('1997-11-09');
    expect(dayContext?.hourBreakdown?.[0]?.label).toBe('午时');
  });

  it('由核心紫微运行时完成 Vite 兼容排盘和运限资料生成', async () => {
    const input = buildZiweiChartInput({
      name: '测试案例',
      gender: 'female',
      dateType: 'solar',
      year: 2024,
      month: 11,
      day: 2,
      timeIndex: 8,
      isLeapMonth: false,
      useTrueSolarTime: true,
      birthHour: 16,
      birthMinute: 44,
      birthLongitude: '116.4074',
      timezone: 8,
      applyChinaDst: true,
    });
    const runtime = await calculateZiweiChart(input, {
      scopes: ['origin', 'decadal', 'yearly'],
      skipAnalysis: true,
      horoscopeContext: { dateStr: '2026-08-10', hourIndex: 6 },
    });

    expect(Object.keys(runtime.payloadByScope)).toEqual(['origin', 'decadal', 'yearly']);
    expect(runtime.payloadByScope.origin?.palaces).toHaveLength(12);
    expect(runtime.decadalTimeline.length).toBeGreaterThan(10);
  });
});
