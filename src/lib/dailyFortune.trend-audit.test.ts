import { describe, expect, it } from 'vitest';
import { generateDailyFortune, type DailyFortuneProfile, type FortunePeriod } from './dailyFortune';

const profiles: Array<DailyFortuneProfile | undefined> = [
  undefined,
  {
    id: 'trend-a', label: '趋势甲', name: '趋势甲', gender: 'female',
    date: '1990-05-18', dateType: 'solar', isLeapMonth: false,
    time: '08:30', timeBasis: 'clock', locationName: '北京市',
    latitude: '39.9042', longitude: '116.4074', timezone: '8',
  },
  {
    id: 'trend-b', label: '趋势乙', name: '趋势乙', gender: 'male',
    date: '1985-11-03', dateType: 'solar', isLeapMonth: false,
    time: '21:15', timeBasis: 'clock', locationName: '广州市',
    latitude: '23.1291', longitude: '113.2644', timezone: '8',
  },
];

function coreFragments(focus: string) {
  return focus.split('；')
    .map((item) => item
      .replace(/^(?:(?:完成后再做|稳定后再做)?(?:工作|学习|钱款|沟通|出行|休息)(?:先查|保留)?：)/, '')
      .replace(/，不扩大范围$/, '')
      .trim())
    .filter((item) => item.length >= 6);
}

describe('运势趋势内容审计', () => {
  it('不同周期会给出具体建议，并控制同一核心建议的重复次数', () => {
    const date = new Date(2026, 7, 26, 12, 0, 0, 0);
    const periods: FortunePeriod[] = ['today', 'month', 'year'];
    const reports = profiles.flatMap((profile, profileIndex) => periods.map((period) => {
      const result = generateDailyFortune(date, profile, period, date);
      const counts = result.periodTrend
        .flatMap((item) => coreFragments(item.focus))
        .reduce((map, item) => map.set(item, (map.get(item) || 0) + 1), new Map<string, number>());
      result.periodTrend.forEach((item) => {
        expect(item.status).toMatch(/^(?:先稳|先做)?(?:工作|学习|钱款|沟通|出行|休息)(?:可落地)?$/);
        expect(item.focus).not.toMatch(/随后安排|接着/);
        const topics = [...item.focus.matchAll(/(?:完成后再做|稳定后再做)?(工作|学习|钱款|沟通|出行|休息)(?:先查|保留)?：/g)].map((match) => match[1]);
        expect(new Set(topics).size).toBeGreaterThanOrEqual(2);
        expect(coreFragments(item.focus).length).toBeGreaterThanOrEqual(2);
      });
      return {
        profileIndex,
        period,
        highestCount: Math.max(...counts.values()),
        duplicates: [...counts.entries()].filter(([, count]) => count > 2),
      };
    }));
    expect(Math.max(...reports.map((item) => item.highestCount)), JSON.stringify(reports.filter((item) => item.highestCount > 2))).toBeLessThanOrEqual(2);
  }, 60_000);
});
