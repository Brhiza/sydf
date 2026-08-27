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

const shortTopicLabels: Record<string, string> = {
  career: '工作',
  study: '学习',
  wealth: '钱款',
  relationship: '沟通',
  travel: '出行',
  wellbeing: '休息',
};

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

function windowOrderValue(result: DailyFortuneResult, name: string, range: string) {
  if (result.period === 'today') return Number(range.match(/^(\d{1,2}):/)?.[1] || 0);
  const match = name.match(/^(\d{1,2})月(\d{1,2})日/);
  return Number(match?.[1] || 0) * 100 + Number(match?.[2] || 0);
}

const summaryStructurePatterns: Array<[RegExp, RegExp]> = [
  [/顺势窗口/, /支持集中/],
  [/强弱分化/, /明显高于|可用信号主要集中/],
  [/助力与牵制/, /强度接近/],
  [/连续反馈/, /六类主题大多处在平稳区/],
  [/条件反复/, /只有.+形成持续牵制/],
  [/承载能力/, /身心状态处在弱项/],
  [/收紧项/, /有\d+项主题需要收紧/],
];

function expectHolisticSummary(result: DailyFortuneResult) {
  const diagnosis = result.summary.split('。')[0] || '';
  const expectedStructure = summaryStructurePatterns.find(([overviewPattern]) => overviewPattern.test(result.overview.label));
  expect(expectedStructure, result.overview.label).toBeTruthy();
  expect(diagnosis).toMatch(expectedStructure![1]);
  expect(result.summary).toContain('因此');
  expect(result.summary.split('。').filter(Boolean)).toHaveLength(2);
  expect(result.summary.split('；').length).toBeGreaterThanOrEqual(2);
  expect(result.summary).not.toMatch(/\d+个双小时时段|\d+个日期|\d+个节气阶段|有\d+[天段]顺势|其余\d+[天段]平稳/);
  expect(result.summary).not.toMatch(/集中完成|逐项确认|复述对方|准备备选路线|出发前逐项|删去一项非必要安排|写清负责人|完成标准写清/);
}

describe('今日运势批量内容质量', () => {
  it('不同案例与周期不再出现错误状态、低信息套话或高频重复', () => {
    const results = profiles.flatMap((profile) => [
      ...dates.flatMap((date) => shortPeriods.map((period) => generateDailyFortune(date, profile, period))),
      generateDailyFortune(dates[0], profile, 'year'),
    ]);
    const correctionDetails: string[] = [];
    const genericPattern = /重大决定宜多留一道复核|其余事项按既定次序跟进即可|保持弹性即可|照常核实|避免小问题累积|条件未齐时保留调整空间|不需要全面回避|确认承载条件|反复打断.+连续性|多分配一档精力|可用它配合主线|主线卡住时.+恢复进度|取决于前置条件|前置条件是否|优势存在，但仍取决|问题集中在部分条件|最需要前置核对|是较好的落点|留出复核余地|六项综合排序|由五行对应数、主线位置和盘面参数合并得出|综合基础盘与各阶段强度后|列为主线只用于排定先后|不代表第二主题失效|主线代表先分配注意力|资源不必平均分配|它成为主线是因为|结果通常表现为|个人盘当前|个人基础节奏|个人命盘里较稳|本期外部节奏与个人|本期外部节奏更多|比通用判断|需要的能力正是|所需方法与惯常|之所以更适合投入|之所以更耗精力|没有相关事项就略过|整体主线清楚|不需要四处试探|资源应集中|当前最清楚的着力点|次序比速度重要|局面没有明显偏向|整体并非全面受阻|当前不需要全面收缩|当前承接能力比机会多少更重要|局面容易受状态起伏牵动|守住基本盘|维持秩序|先处理卡点，以|先养住状态|宜先整顿身心|宜收不宜放|维持节奏|形成可重复的做法|单点突破信号|适合作为配合项|辅助线|辅助推进项|不是(?:当天|本月|全年)主线|形成一个可复核结果|不扩大范围|方位信号不集中|整体判断的可用性更稳定|整体主线(?:顺序)?不变|主线结论仍成立|非紧急健康安排多确认|非紧急项目可复核时间与准备事项|较大的形象改变或复杂安排可多考虑一天|先确认双方意愿、健康与现实条件|把普通事情做扎实|不建议临时启动重大决定|气势较整|平顺而不张扬|培土蓄势|宜稳中求进|稳步积累|作为配合|完成后再做|稳定后再做|配合项|为何作为第二步|主线后再做|主线后补充|只作维护|维持基本量|暂不加量|后续工作只接|后续学习只留|钱款只处理费用|沟通只推进双方|出行只保留有返程余量|睡眠、进食和恢复时间同步保留|(?:工作事业|学习成长|金钱合作|沟通关系|出行行动|身心状态)保持连续|逐步接上|维持稳定投入|暂作配合|只做必要维护|不增加变量|再承接已有进展|可以承接，但不抢占主线资源|身心状态(?:随后|再承接|适合接在|逐步接上|维持稳定投入|不增加变量|只做必要维护|不再加量)|单看一项会高估局面的可用程度|同类风险在多个阶段重现|整体仍有优势，但风险窗口|顺势与收紧数量相同，结果高度依赖执行条件|顺势窗口只比收紧窗口|有\d+[天段]反复在|这一环节若落在前后衔接处|本期最容易形成连锁影响的节点|本期价值在于问题边界已经显现|一次可验证的修正/;
    results.forEach((result) => {
      expectHolisticSummary(result);
      const primaryShortLabel = shortTopicLabels[result.actionTips[0]?.sourceKey || ''];
      [...result.goodDirections, ...result.avoidDirections].forEach((item) => {
        expect(item.detail).toContain(primaryShortLabel);
      });
      result.categories.forEach((item) => {
        expect(item.status).not.toMatch(/按需安排|持续观察|随后安排|可作补充|暂不主攻|暂作维护/);
        if (item.key === 'wellbeing') expect(item.status).not.toBe('主线后再做');
        if (item.tone === 'cautious') expect(item.status).not.toMatch(/本期主线|主线后再做/);
        if (item.tone === 'favorable') expect(item.status).not.toMatch(/重点把关|暂不加量/);
        const preferredWindow = item.detail.match(/^(.+?)可优先安排；/)?.[1];
        const cautionWindow = item.basis.match(/^(.+)：/)?.[1];
        if (preferredWindow && cautionWindow) expect(preferredWindow).not.toBe(cautionWindow);
      });
      const standalonePreferredWindows = result.categories
        .map((item) => item.detail.match(/^(.+?)可优先安排；/)?.[1])
        .filter((window): window is string => Boolean(window));
      expect(new Set(standalonePreferredWindows).size).toBe(standalonePreferredWindows.length);
      expect(result.summary).toContain(result.period === 'today' ? '当天' : result.period === 'month' ? '本月' : '全年');
      const windowOrder = result.timeWindows.map((item) => windowOrderValue(result, item.name, item.range));
      expect(windowOrder).toEqual([...windowOrder].sort((left, right) => left - right));
      const unit = result.period === 'today' ? '双小时时段' : result.period === 'month' ? '日期' : '节气阶段';
      const measure = result.period === 'month' ? '天' : '段';
      result.evidenceInsights.filter((item) => ['opportunity', 'caution', 'secondary'].includes(item.key)).forEach((item) => {
        expect(item.detail).toMatch(new RegExp(`\\d+个${unit}里，.+有\\d+${measure}顺势、\\d+${measure}需要收紧，其余\\d+${measure}平稳`));
        expect(item.detail.match(new RegExp(`\\d+个${unit}里`, 'g'))).toHaveLength(1);
        expect(item.detail).not.toMatch(/\d+[天段]平稳窗口|不是单点偶发|不能只凭.+扩大安排|不能归为一次偶发/);
        if (item.key === 'opportunity') {
          expect(item.detail).toMatch(/责任|验收|交付|任务|接手|学习成果|输入|专注|资料|复述|练习|输出|款项|对账|交易|付款|留痕|询价|收支|凭证|义务|结清|事实|共识|沟通|关系|行程|路线|返程|出发|转场|回程|完整休息|睡眠|进食|专注度|注意力|食欲|兴奋/);
          if (item.detail.includes('仍排在主线')) {
            correctionDetails.push(item.detail);
            expect(item.detail).toMatch(/责任与验收缺口|注意力与输出检验的断点|金额、责任或付款节点的缺口|双方事实基础的分歧|路线、转场或返程余量的缺口|睡眠、进食或专注恢复的缺口/);
          }
          expect(item.detail).toMatch(/支持相对连续|优势没有覆盖(?:全天|整月|全年)|单个(?:时段|日期|阶段)不能代表(?:全天|整月|全年)|仍排在主线/);
          expect(result.summary).toMatch(/责任清楚|能够验收|理解与应用|金额、凭证与责任链|共同事实|一致的下一步|完整时间链|必要行程|注意力|承受量/);
        } else if (item.key === 'caution') {
          expect(item.detail).toMatch(/风险(?:仍)?集中在|顺势与收紧相抵|在多个.+反复失守/);
          expect(result.summary).toMatch(/返工|两套版本|不同标准|压缩|遗漏|下降|付款|成本|延误|核算|入睡|恢复|输出时间|现场任务|共同事实/);
          const primaryLabel = shortTopicLabels[result.actionTips[0]?.sourceKey || ''];
          expect(result.summary).toContain(primaryLabel);
          expect(result.summary).not.toMatch(/可执行行程停在输入|闭合记录停在输入|一致结论停在输入|稳定承载停在输入|可检验成果停在无人接手|可执行行程停在无人接手/);
          expect(item.detail).toMatch(/前序任务|注意力被切碎|金额或责任未闭合|共同事实没有建立|时间余量被压缩|承受量被高估/);
        } else {
          expect(item.detail).toMatch(/是否接得上|要同时看/);
          expect(item.detail).toMatch(/责任|交付|连续注意力|费用|付款|倾听|事实|路线|返程|判断力|持续时间/);
        }
      });
      expect(allText(result).join('\n')).not.toMatch(genericPattern);
      expect(allText(result).join('\n')).not.toMatch(/有利窗口可集中用于本期主线|其他安排保持原定负荷|先按实际结果验证|不随单个窗口加量/);
      expect(allText(result).join('\n')).not.toMatch(/没有明确风险窗口|相对优势最弱/);
      expect(result.summary).not.toMatch(/只承担主线|只沉淀主线|只闭合主线|只对齐主线|只安排主线|暂不增加|暂不进入|不扩大承诺|不增加会压缩|不按短时兴奋继续加量/);
      if (result.period !== 'today') {
        result.goodDirections.forEach((item) => expect(item.detail).toMatch(/\d+个(?:日期|节气阶段)里.+有\d+(?:天|段)得到支持、\d+(?:天|段)需要回避/));
        result.avoidDirections.forEach((item) => expect(item.detail).toMatch(/\d+个(?:日期|节气阶段)里.+有\d+(?:天|段)表现受限、\d+(?:天|段)得到支持/));
        result.goodDirections.forEach((item) => expect(item.detail).toMatch(/若候选(?:路线|地点)的现实条件接近.+作为本期.+次级筛选.+判断依据主要是：/));
        result.avoidDirections.forEach((item) => expect(item.detail).toMatch(/本期不把.+作为.+相关外出的首选.+判断依据主要是：/));
        [...result.goodDirections, ...result.avoidDirections].forEach((item) => {
          expect(item.detail).not.toMatch(/常见用途：|常见依据：|常见限制：|出现\d+次/);
        });
        if (result.reference.direction !== '不固定') expect(result.reference.directionNote).toMatch(/\d+个(?:日期|节气阶段)/);
      } else {
        result.goodDirections.forEach((item) => expect(item.detail).toMatch(/若候选地点的距离、成本和安全条件接近.+现实差异明显时不为方位绕路。盘面依据：/));
        result.avoidDirections.forEach((item) => expect(item.detail).toMatch(/不作为本期.+相关外出的首选。必须前往时.+盘面依据：/));
      }
      expect(result.reference.symbolicNote).not.toMatch(/看到标记时|检查/);
      expect(result.reference.itemNote).toContain(result.reference.item);
      const counts = result.periodTrend.reduce((map, item) => map.set(item.focus, (map.get(item.focus) || 0) + 1), new Map<string, number>());
      expect(Math.max(...counts.values())).toBeLessThanOrEqual(2);
      const statusCounts = result.periodTrend.reduce((map, item) => map.set(item.status, (map.get(item.status) || 0) + 1), new Map<string, number>());
      expect(Math.max(...statusCounts.values())).toBeLessThanOrEqual(2);
    });
    expect(correctionDetails.length).toBeGreaterThan(0);
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
        ).toMatch(/^(?:适合|可用于)/);
        expect(window.coverage).toContain(primaryShortLabel);
        expect(window.coverage).not.toContain(`${primaryShortLabel}需复核`);
      });
    });
  }, 60_000);
});
