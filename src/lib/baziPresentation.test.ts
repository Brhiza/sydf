import { describe, expect, it } from 'vitest';
import {
  filterCommonBaziShensha,
  formatBaziTimingBasis,
  resolveSelectedBaziFortuneGanZhi,
  summarizeBaziFortuneTriggers,
} from './baziPresentation';

describe('八字神煞展示', () => {
  it('按常用名单筛选并保留完整名称和原有顺序', () => {
    expect(filterCommonBaziShensha([
      '天乙贵人',
      '血光杀',
      '阴阳差错',
      '天乙贵人',
      ' ',
    ], ['天乙贵人', '血光', '阴阳差错'])).toEqual(['天乙贵人', '血光杀', '阴阳差错']);
  });

  it('不显示常用名单之外的神煞', () => {
    expect(filterCommonBaziShensha(['天乙贵人', '孤鸾煞'], ['天乙贵人'])).toEqual(['天乙贵人']);
  });
});

describe('八字辅助信息展示', () => {
  it('上方岁运列使用下方当前选择，不固定在今天', () => {
    expect(resolveSelectedBaziFortuneGanZhi({
      cycle: { ganZhi: '甲戌' },
      year: { ganZhi: '乙巳' },
      month: { ganZhi: '丙午' },
      hour: { ganZhi: '丁酉' },
    })).toEqual({ dayun: '甲戌', liunian: '乙巳', liuyue: '丙午', liushi: '丁酉' });
  });

  it('小运列优先使用所选流年的小运干支', () => {
    expect(resolveSelectedBaziFortuneGanZhi({
      cycle: { ganZhi: '小运', isXiaoyun: true },
      year: { ganZhi: '乙巳', xiaoyun: { ganZhi: '庚申' } },
    }).dayun).toBe('庚申');
  });

  it('清楚显示真太阳时、标准时、校正量和地点', () => {
    const result = {
      timeInfo: { hour: 8, minute: 12 },
      timing: {
        enabled: true,
        standardTime: { year: 1990, month: 5, day: 1, hour: 8, minute: 12, second: 0 },
        correctedTime: { year: 1990, month: 5, day: 1, hour: 7, minute: 50, second: 30 },
        totalCorrectionMinutes: -21.5,
        birthPlace: '广东省潮州市',
        evidence: { status: '已计算' },
      },
    } as unknown as Parameters<typeof formatBaziTimingBasis>[0];

    expect(formatBaziTimingBasis(result)).toBe('真太阳时 07:50（标准时 08:12，校正-21.5分钟） · 广东省潮州市');
  });

  it('岁运触发优先显示主要关系和成局，且不重复同层级的弱关系', () => {
    const primary = {
      type: 'pillar-fuyin',
      sourceLayerKey: 'year',
      targetLayerKey: 'natal-day',
      source: { label: '流年', ganZhi: '甲子' },
      target: { label: '原局日柱', ganZhi: '甲子' },
    };
    const repeatedSupporting = { ...primary, type: 'branch-same' };
    const supporting = {
      type: 'branch-clash',
      sourceLayerKey: 'month',
      targetLayerKey: 'natal-month',
      source: { label: '流月', ganZhi: '丙午' },
      target: { label: '原局月柱', ganZhi: '庚子' },
    };
    const evidence = {
      primaryRelations: [primary],
      supportingRelations: [repeatedSupporting, supporting],
      formations: [{ label: '流年补全申子辰三合水' }],
    } as unknown as Parameters<typeof summarizeBaziFortuneTriggers>[0];

    expect(summarizeBaziFortuneTriggers(evidence)).toEqual([
      '流年甲子与原局日柱甲子 · 同柱伏吟',
      '流年补全申子辰三合水',
      '流月丙午与原局月柱庚子 · 地支相冲',
    ]);
  });
});
