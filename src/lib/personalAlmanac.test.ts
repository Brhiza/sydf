import { beforeAll, describe, expect, it } from 'vitest';
import type { BaziChartResult } from 'mingyu-core/bazi';
import { SIXTY_CYCLE } from 'mingyu-core/bazi';
import type { AlmanacData } from 'mingyu-core/types';
import { generateLocalAlmanac, type AlmanacProfile } from './almanac';
import { getPersonalAlmanacChart, getPersonalAlmanacDayTheme, getPersonalAlmanacReading } from './personalAlmanac';

const profile: AlmanacProfile = {
  id: 'first', label: '测试案例', name: '测试案例', gender: 'female',
  dateType: 'solar', isLeapMonth: false, date: '1990-01-02', time: '10:30',
  timeBasis: 'trueSolar', locationName: '北京', latitude: '39.9042', longitude: '116.4074', timezone: '8',
};
let result: AlmanacData;
let chart: BaziChartResult;
beforeAll(() => {
  result = generateLocalAlmanac({ mode: 'personal', topic: 'custom', startDate: '2026-09-11', endDate: '2026-09-12', profiles: [profile] });
  chart = getPersonalAlmanacChart(profile);
});

function fixture(strength: BaziChartResult['analysis']['dayMasterStrength']['status'], ganzhi = '戊子') {
  const adjustedChart = structuredClone(chart);
  adjustedChart.dayMaster.gan = '癸';
  adjustedChart.pillars.day = { gan: '癸', zhi: '亥', ganZhi: '癸亥' };
  adjustedChart.analysis.dayMasterStrength.status = strength;
  adjustedChart.analysis.mingGe.isSpecial = false;
  adjustedChart.analysis.usefulGod.favorableWuxing = [];
  adjustedChart.analysis.usefulGod.unfavorableWuxing = [];
  const participant = { ...result.participants[0]!, dayMaster: '癸', pillars: { ...result.participants[0]!.pillars, day: '癸亥' } };
  const day = { ...result.days[0]!, ganzhi: { ...result.days[0]!.ganzhi, day: ganzhi } };
  return { day, participant, chart: adjustedChart };
}
function read(input: ReturnType<typeof fixture>) { return getPersonalAlmanacReading(input.day, input.participant, input.chart)!; }

describe('个人历解析', () => {
  it('真实黄历和强弱分析采用相同的四柱及喜忌', () => {
    const participant = result.participants[0]!;
    const reading = getPersonalAlmanacReading(result.days[0]!, participant, chart)!;
    expect(reading.strength).toBe(chart.analysis.dayMasterStrength.status);
    expect(reading.favorable).toEqual(participant.usefulGods);
    expect(reading.unfavorable).toEqual(participant.avoidGods);
    expect(reading.ruleBasis.length).toBeGreaterThan(0);
  });

  it.each(['clock', 'trueSolar'] as const)('%s 时间口径在跨日附近保持一致', (timeBasis) => {
    const birth = { ...profile, timeBasis, time: '00:10', longitude: '87.6168' };
    const calendar = generateLocalAlmanac({ mode: 'personal', topic: 'custom', startDate: '2026-09-11', endDate: '2026-09-11', profiles: [birth] });
    expect(getPersonalAlmanacReading(calendar.days[0]!, calendar.participants[0]!, getPersonalAlmanacChart(birth))).toBeTruthy();
  });

  it('参考图中的癸水遇戊、己分别为正官和七杀，藏干也按日主计算', () => {
    const officer = read(fixture('身弱'));
    const pressure = read(fixture('身弱', '己丑'));
    expect(officer.relation).toBe('正官');
    expect(officer.basis).toContain('土克水，阴阳不同');
    expect(officer.undertones.map((item) => item.relation)).toEqual(['比肩']);
    expect(pressure.relation).toBe('七杀');
    expect(pressure.undertones.map((item) => item.relation)).toEqual(['七杀', '比肩', '偏印']);
  });

  it.each([
    ['甲寅', '伤官'], ['乙卯', '食神'], ['丙辰', '正财'], ['丁巳', '偏财'], ['戊午', '正官'], ['己未', '七杀'],
  ])('%s 的%s区分身强与身弱的承接方式', (ganzhi, relation) => {
    const strong = read(fixture('身强', ganzhi));
    const weak = read(fixture('身弱', ganzhi));
    expect(strong.relation).toBe(relation);
    expect(strong.approach).toBe('advance');
    expect(weak.approach).toBe('pace');
    expect(strong.action).not.toBe(weak.action);
  });

  it.each(['庚申', '辛酉', '壬戌', '癸亥'])('%s 的印比生扶区分身强与身弱', (ganzhi) => {
    expect(read(fixture('偏强', ganzhi)).approach).toBe('pace');
    expect(read(fixture('偏弱', ganzhi)).approach).toBe('advance');
  });

  it('具体喜忌优先于身弱忌官杀等简单套用', () => {
    const input = fixture('身弱');
    input.chart.analysis.usefulGod.favorableWuxing = ['土'];
    expect(read(input).approach).toBe('advance');
    expect(read(input).impact).toContain('原局喜用五行');
    input.chart.analysis.usefulGod.unfavorableWuxing = ['土'];
    expect(read(input).approach).toBe('balanced');
    expect(read(input).impact).toContain('同时涉及原局喜忌');
  });

  it.each(['极强', '极弱', '中和'] as const)('%s 在喜忌未明确时不硬套普通强弱结论', (strength) => {
    expect(read(fixture(strength)).approach).toBe('balanced');
  });

  it('特殊格局在未命中喜忌时保留判断', () => {
    const input = fixture('身弱');
    input.chart.analysis.mingGe.isSpecial = true;
    expect(read(input).approach).toBe('balanced');
  });

  it('未知强弱不冒充中和结论', () => {
    const reading = read(fixture('未知'));
    expect(reading.approach).toBe('balanced');
    expect(reading.impact).toContain('强弱依据暂未明确');
    expect(reading.impact).not.toContain('维持平衡');
  });

  it('农历出生资料与已有黄历保持同盘', () => {
    const birth = { ...profile, dateType: 'lunar' as const, date: '1990-01-02' };
    const calendar = generateLocalAlmanac({ mode: 'personal', topic: 'custom', startDate: '2026-09-11', endDate: '2026-09-11', profiles: [birth] });
    expect(getPersonalAlmanacReading(calendar.days[0]!, calendar.participants[0]!, getPersonalAlmanacChart(birth))).toBeTruthy();
  });

  it('多人冲突依据只归属到对应的人，不混用另一人的出生信息', () => {
    const input = fixture('身弱');
    input.day.participantRelationFacts = [{
      key: 'other', participantId: 'other', participantName: '他人', scope: '候选日', basis: '日支',
      candidateValue: '子', participantValues: ['午'], relation: '冲', status: '限制', promptText: '', sources: [], limitation: '',
    }];
    expect(read(input).conflict).toBe('');
    input.day.participantRelationFacts[0]!.participantId = input.participant.id;
    expect(read(input).conflict).toContain('日支午与当日子相冲');
    input.chart.pillars.hour.ganZhi = '甲子';
    input.participant.pillars.hour = '乙丑';
    expect(() => read(input)).toThrow('出生信息已变化');
  });

  it('同一日干遇不同日支时给出不同的变化和第二步行动', () => {
    const peer = read(fixture('身弱', '戊子'));
    const wealth = read(fixture('身弱', '戊午'));
    expect(peer.relation).toBe(wealth.relation);
    expect(peer.dayChange).toContain('日支子的本气癸对应比肩');
    expect(wealth.dayChange).toContain('日支午的本气丁对应偏财');
    expect(peer.nextAction).not.toBe(wealth.nextAction);
    expect(peer.dayChange).toContain('责任需要落实到人');
    expect(wealth.dayChange).toContain('资源与成本');
  });

  it('日干喜用与日支忌神分别解释，副线不改变日干主题或冒充新格局', () => {
    const input = fixture('身弱', '戊子');
    input.chart.analysis.usefulGod.favorableWuxing = ['土'];
    input.chart.analysis.usefulGod.unfavorableWuxing = ['水'];
    const reading = read(input);
    expect(reading.impact).toContain('日干土落在原局喜用');
    expect(reading.branchBalance).toContain('子中本气癸水落在忌神');
    expect(reading.title).toBe('按序推进');
    expect(reading.family).toBe('authority');
  });

  it('只有存在额外藏干时才展开副线，列出的藏干与解释对应', () => {
    expect(read(fixture('身弱', '戊子')).secondaryNote).toBe('');
    const reading = read(fixture('身弱', '己丑'));
    expect(reading.secondaryNote).toContain('癸（比肩）');
    expect(reading.secondaryNote).toContain('辛（偏印）');
    expect(reading.secondaryNote).toContain('自主安排与同伴配合');
    expect(reading.secondaryNote).toContain('独立研究与细节核验');
  });

  it('喜忌相同时，强弱仍提供不同的解释视角', () => {
    const strong = fixture('身强');
    const weak = fixture('身弱');
    strong.chart.analysis.usefulGod.favorableWuxing = ['土'];
    weak.chart.analysis.usefulGod.favorableWuxing = ['土'];
    expect(read(strong).impact).toContain('官杀的约束可用于收拢目标');
    expect(read(weak).impact).toContain('先争取资源与合理期限');
  });

  it.each([...('甲乙丙丁戊己庚辛壬癸')])('%s 日主的六十甲子均有完整解析，月历标记与详情一致', (master) => {
    const input = fixture('中和');
    input.chart.dayMaster.gan = master;
    input.participant.dayMaster = master;
    for (const ganzhi of SIXTY_CYCLE) {
      input.day.ganzhi.day = ganzhi;
      const reading = read(input);
      const marker = getPersonalAlmanacDayTheme(input.day, input.participant)!;
      expect(marker.title).toBe(reading.title);
      expect(marker.key).toBe(reading.family);
      expect(reading.dayChange).toContain(reading.undertones[0]!.relation);
      expect(reading.nextAction).not.toBe(reading.action);
      expect(reading.nextAction.length).toBeGreaterThan(15);
      expect(reading.keywords.length).toBeGreaterThanOrEqual(2);
      expect(new Set(reading.keywords).size).toBe(reading.keywords.length);
      expect(reading.focus + reading.dayChange + reading.branchBalance + reading.secondaryNote).not.toMatch(/undefined|NaN|TODO/);
      expect(reading.undertones.every((item) => item.scene && item.element && item.keyword)).toBe(true);
    }
  });

  it('切换参与人时月历主题随其日主更新，缺少日主不生成标记', () => {
    const input = fixture('身弱');
    expect(getPersonalAlmanacDayTheme(input.day, input.participant)?.relation).toBe('正官');
    input.participant.dayMaster = '丁';
    expect(getPersonalAlmanacDayTheme(input.day, input.participant)?.relation).toBe('伤官');
    input.participant.dayMaster = '';
    expect(getPersonalAlmanacDayTheme(input.day, input.participant)).toBeNull();
  });
});
