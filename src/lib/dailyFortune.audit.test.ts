import { describe, expect, it } from 'vitest';
import {
  generateDailyFortune,
  type DailyFortuneProfile,
  type DailyFortuneResult,
  type FortunePeriod,
} from './dailyFortune';

const profiles: Array<DailyFortuneProfile | undefined> = [
  undefined,
  {
    id: 'audit-a', label: '审计甲', name: '审计甲', gender: 'female',
    date: '1990-05-18', dateType: 'solar', isLeapMonth: false,
    time: '08:30', timeBasis: 'clock', locationName: '北京市',
    latitude: '39.9042', longitude: '116.4074', timezone: '8',
  },
  {
    id: 'audit-b', label: '审计乙', name: '审计乙', gender: 'male',
    date: '1985-11-03', dateType: 'solar', isLeapMonth: false,
    time: '21:15', timeBasis: 'clock', locationName: '广州市',
    latitude: '23.1291', longitude: '113.2644', timezone: '8',
  },
];

const dates = [0, 2, 6, 9].map((month) => new Date(2026, month, 15, 12, 0, 0, 0));
const shortPeriods: FortunePeriod[] = ['today', 'month'];

function allText(result: DailyFortuneResult) {
  return [
    result.title,
    result.summary,
    ...result.actionTips.flatMap((item) => [item.label, item.text]),
    ...result.evidenceInsights.flatMap((item) => [item.title, item.detail]),
    ...result.categories.flatMap((item) => [item.status, item.detail, item.basis]),
    ...result.periodTrend.flatMap((item) => [item.status, item.focus]),
    result.reference.directionNote,
    result.reference.symbolicNote,
    result.reference.itemNote,
  ].filter(Boolean);
}

describe('今日运势批量内容质量', () => {
  it('不同案例与周期不再出现错误状态、低信息套话或高频重复', () => {
    const results = profiles.flatMap((profile) => [
      ...dates.flatMap((date) => shortPeriods.map((period) => generateDailyFortune(date, profile, period))),
      generateDailyFortune(dates[0], profile, 'year'),
    ]);
    const genericPattern = /重大决定宜多留一道复核|其余事项按既定次序跟进即可|保持弹性即可|照常核实|避免小问题累积|条件未齐时保留调整空间|不需要全面回避|确认承载条件|反复打断.+连续性|多分配一档精力|可用它配合主线|主线卡住时.+恢复进度|取决于前置条件|前置条件是否|优势存在，但仍取决|问题集中在部分条件|最需要前置核对|是较好的落点|留出复核余地|六项综合排序|由五行对应数、主线位置和盘面参数合并得出|适合作为配合项|辅助线|辅助推进项|不是(?:当天|本月|全年)主线/;
    results.forEach((result) => {
      result.categories.forEach((item) => {
        expect(item.status).not.toMatch(/按需安排|持续观察|随后安排|可作补充|暂不主攻|暂作维护/);
        if (item.key === 'wellbeing') expect(item.status).not.toBe('主线后再做');
        if (item.tone === 'cautious') expect(item.status).not.toMatch(/本期主线|主线后再做/);
        if (item.tone === 'favorable') expect(item.status).not.toMatch(/重点把关|暂不加量/);
        const preferredWindow = item.detail.match(/^(.+?)可优先安排；/)?.[1];
        const cautionWindow = item.basis.match(/^(.+)：/)?.[1];
        if (preferredWindow && cautionWindow) expect(preferredWindow).not.toBe(cautionWindow);
      });
      const unit = result.period === 'today' ? '双小时时段' : result.period === 'month' ? '日期' : '节气阶段';
      const measure = result.period === 'month' ? '天' : '段';
      result.evidenceInsights.filter((item) => ['opportunity', 'caution', 'secondary'].includes(item.key)).forEach((item) => {
        expect(item.detail).toMatch(new RegExp(`\\d+个${unit}里，.+有\\d+${measure}顺势、\\d+${measure}需要收紧，其余\\d+${measure}平稳`));
        if (item.key === 'opportunity') {
          expect(item.detail).toMatch(/重要事项仍应落在|每完成一步再判断|目标拆成能独立完成|先守住完成质量/);
          expect(result.summary).toMatch(/转成明确交付|分段积累|条件可以逐项核对|先消除信息差|出发前被看见|决定其他事情能否持续/);
        } else if (item.key === 'caution') {
          expect(item.detail).toMatch(/可能打断前后衔接|不能作为后续继续加码|不同阶段重复出现/);
          expect(result.summary).toMatch(/责任交接|连续注意力|现金流|共同理解|时间链条|承载条件/);
          expect(item.detail).toMatch(/任务反复|资料越积越多|补单|同一件事反复解释|转场时间|短时仍能推进/);
        } else {
          expect(item.detail).toMatch(/落实为|主线之后|事实基础|已经确定|并行保留/);
          expect(item.detail).toMatch(/负责人|可复述|金额|共同确认|任务边界|实际余量/);
        }
      });
      expect(allText(result).join('\n')).not.toMatch(genericPattern);
      expect(allText(result).join('\n')).not.toMatch(/没有明确风险窗口|相对优势最弱/);
      if (result.period !== 'today') {
        result.goodDirections.forEach((item) => expect(item.detail).toMatch(/\d+个(?:日期|节气阶段).*出现\d+次支持、\d+次回避/));
        result.avoidDirections.forEach((item) => expect(item.detail).toMatch(/\d+个(?:日期|节气阶段).*出现\d+次回避、\d+次支持/));
        result.goodDirections.forEach((item) => expect(item.detail).toMatch(/常见用途：.+；常见依据：/));
        result.avoidDirections.forEach((item) => expect(item.detail).toMatch(/常见限制：/));
        if (result.reference.direction !== '不固定') expect(result.reference.directionNote).toMatch(/\d+个(?:日期|节气阶段)/);
      } else {
        result.goodDirections.forEach((item) => expect(item.detail).toMatch(/适合.+；盘面依据：.+。仅用于/));
        result.avoidDirections.forEach((item) => expect(item.detail).toMatch(/盘面限制：.+。必须前往时/));
      }
      const counts = result.periodTrend.reduce((map, item) => map.set(item.focus, (map.get(item.focus) || 0) + 1), new Map<string, number>());
      expect(Math.max(...counts.values())).toBeLessThanOrEqual(2);
    });
  }, 60_000);
});
