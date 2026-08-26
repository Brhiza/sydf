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
    result.modernAlmanac?.rhythm.title,
    result.modernAlmanac?.rhythm.detail,
    ...(result.modernAlmanac?.recommended || []).flatMap((item) => [item.title, item.detail]),
    ...(result.modernAlmanac?.cautious || []).flatMap((item) => [item.title, item.detail]),
  ].filter(Boolean);
}

describe('今日运势批量内容质量', () => {
  it('不同案例与周期不再出现错误状态、低信息套话或高频重复', () => {
    const results = profiles.flatMap((profile) => [
      ...dates.flatMap((date) => shortPeriods.map((period) => generateDailyFortune(date, profile, period))),
      generateDailyFortune(dates[0], profile, 'year'),
    ]);
    const genericPattern = /重大决定宜多留一道复核|其余事项按既定次序跟进即可|保持弹性即可|照常核实|避免小问题累积|条件未齐时保留调整空间|不需要全面回避|确认承载条件|反复打断.+连续性|多分配一档精力|可用它配合主线|主线卡住时.+恢复进度|取决于前置条件|前置条件是否|优势存在，但仍取决|问题集中在部分条件|最需要前置核对|是较好的落点|留出复核余地|六项综合排序|由五行对应数、主线位置和盘面参数合并得出|适合作为配合项|辅助线|辅助推进项|不是(?:当天|本月|全年)主线|形成一个可复核结果|不扩大范围|方位信号不集中|整体判断的可用性更稳定|整体主线(?:顺序)?不变|主线结论仍成立|非紧急健康安排多确认|非紧急项目可复核时间与准备事项|较大的形象改变或复杂安排可多考虑一天|先确认双方意愿、健康与现实条件|把普通事情做扎实|不建议临时启动重大决定|作为配合|完成后再做|稳定后再做|配合项|为何作为第二步|(?:工作事业|学习成长|金钱合作|沟通关系|出行行动|身心状态)保持连续|逐步接上|维持稳定投入|暂作配合|只做必要维护|不增加变量|再承接已有进展|可以承接，但不抢占主线资源|身心状态(?:随后|再承接|适合接在|逐步接上|维持稳定投入|不增加变量|只做必要维护|不再加量)/;
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
          expect(item.detail).toMatch(/责任|验收|交付|学习成果|输入|专注|资料|复述|练习|输出|款项|对账|交易|付款|留痕|询价|事实|共识|沟通|关系|行程|路线|返程|完整休息|睡眠|进食|专注度/);
          expect(result.summary).toMatch(/转成明确交付|分段积累|条件可以逐项核对|先消除信息差|出发前被看见|决定其他事情能否持续/);
        } else if (item.key === 'caution') {
          expect(item.detail).toMatch(/可能打断前后衔接|不能作为后续继续加码|不同阶段重复出现/);
          expect(result.summary).toMatch(/责任交接|连续注意力|现金流|共同理解|时间链条|承载条件/);
          expect(item.detail).toMatch(/任务反复|资料越积越多|补单|同一件事反复解释|转场时间|短时仍能推进/);
        } else {
          expect(item.detail).toMatch(/承接|依赖|前序|信息差|状态|同步基础|主线事实/);
          expect(item.detail).toMatch(/责任|交付|连续注意力|费用|付款|倾听|事实|路线|返程|判断力|持续时间/);
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

  it('不同日期与剩余时段下，主线行动不会引用主线需复核窗口', () => {
    const runtimes = dates.flatMap((date) => [8, 12, 16, 20, 22].map((hour) => (
      new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, 20, 0, 0)
    )));
    runtimes.forEach((runtime) => {
      const result = generateDailyFortune(runtime, undefined, 'today', runtime);
      const primaryAction = result.actionTips.find((item) => item.tone === 'positive');
      const primaryShortLabel = primaryAction?.label.replace(/^优先/, '') || '';
      const primaryCategory = result.categories.find((item) => item.key === primaryAction?.sourceKey);
      result.timeWindows.forEach((window) => {
        const label = `${window.name} ${window.range}`;
        const referencedByPrimary = primaryAction?.text.includes(label) || primaryCategory?.detail.includes(label);
        if (!referencedByPrimary) return;
        expect(
          window.coverage,
          JSON.stringify({ runtime, primaryAction, primaryCategory, window }),
        ).toMatch(/^(?:优先|可安排)/);
        expect(window.coverage).toContain(primaryShortLabel);
        expect(window.coverage).not.toContain(`${primaryShortLabel}需复核`);
      });
    });
  }, 60_000);
});
