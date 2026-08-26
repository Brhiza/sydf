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
      .replace(/^(?:(?:同时推进|有余量再处理|同步照顾|留意)?(?:工作|学习|钱款|沟通|出行|休息)(?:先查|保留)?：)/, '')
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
        expect(item.status).toMatch(/工作|学习|钱款|沟通|出行|返程|状态|睡眠|任务|猜测/);
        expect(item.status).not.toMatch(/^(?:先做|先稳)(?:工作|学习|钱款|沟通|出行|休息)$|可落地/);
        expect(item.focus).not.toMatch(/随后安排|接着|完成后再做|稳定后再做/);
        const topics = [...item.focus.matchAll(/(?:同时推进|有余量再处理|同步照顾|留意)?(工作|学习|钱款|沟通|出行|休息)(?:先查|保留)?：/g)].map((match) => match[1]);
        expect(new Set(topics).size).toBeGreaterThanOrEqual(2);
        expect(coreFragments(item.focus).length).toBeGreaterThanOrEqual(2);
        expect(item.focus).not.toContain('不扩大范围');
        if (period === 'month') expect(item.focus).toMatch(/这段时间|阶段中途|阶段结束|下一阶段/);
        if (period === 'year') expect(item.focus).toMatch(/当月|月底|下月|整月/);
      });
      if (period !== 'today') {
        expect(result.periodTrend.map((item) => item.focus).join('')).not.toMatch(/只完成一个学习目标|先保存一份可复核的交易记录|把待确认事项清成一张清单|完成一次对账或比价|一次只谈清一个分歧|合并同方向行程，留下转场余量|先保住睡眠与实际精力/);
      }
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
