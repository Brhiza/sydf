import { describe, expect, it } from 'vitest';
import type { WuyunLiuqiResult } from 'mingyu-core/wuyun-liuqi';
import type { HuangjiJingshiResult } from 'mingyu-core/huangji-jingshi';
import type { BaziChartResult } from 'mingyu-core/bazi';
import { buildDivinationReadingPrompt, formatReadingSummary, runDivination } from './divination';

describe('八字新版神煞范围适配', () => {
  it('排盘保留完整神煞，交由展示层筛选', () => {
    const result = runDivination('bazi', new Date('2026-08-09T12:00:00+08:00'), {
      name: '测试案例',
      gender: 'female',
      date: '2024-11-02',
      dateType: 'solar',
      isLeapMonth: false,
      time: '16:44',
      timeBasis: 'clock',
      locationName: '北京市 东城区',
      latitude: '39.9042',
      longitude: '116.4074',
      timezone: '8',
    }) as BaziChartResult;

    expect(result.shensha.day).toContain('天官贵人');
    expect(result.shensha.day).toContain('血光杀');
  });
});

describe('五运六气前端链路', () => {
  it('使用指定公历年份生成真实年度盘面', () => {
    const result = runDivination('wuyun-liuqi', new Date('2026-08-09T12:00:00+08:00'), undefined, { wuyunYear: 2028 }) as WuyunLiuqiResult;

    expect(result.input.yearGanZhi).toBe('戊申');
    expect(result.annualMovement.name).toBe('火运');
    expect(result.movementSteps).toHaveLength(5);
    expect(result.qiSteps).toHaveLength(6);
  });

  it('为 AI 提供完整盘面并生成可读摘要', () => {
    const result = runDivination('wuyun-liuqi', new Date(), undefined, { wuyunYear: 2028 });
    const prompt = buildDivinationReadingPrompt('wuyun-liuqi', result);
    const summary = formatReadingSummary('wuyun-liuqi', result);

    expect(prompt).toContain('公历 2028 年');
    expect(prompt).toContain('五步主客运');
    expect(prompt).toContain('六步主客气');
    expect(prompt).not.toContain('【任务】');
    expect(prompt).not.toContain('【传统依据】');
    expect(summary).toContain('戊申年');
    expect(summary).toContain('司天');
  });
});

describe('皇极经世前端链路', () => {
  it('使用公历年份生成值年卦与多层周期', () => {
    const result = runDivination('huangji-jingshi', new Date('2026-08-09T12:00:00+08:00'), undefined, { huangjiYear: 2028 }) as HuangjiJingshiResult;

    expect(result.input.year).toBe(2028);
    expect(result.forecast?.hexagrams.annual.name).toBeTruthy();
    expect(result.forecast?.hexagrams.decade.hexagram.name).toBeTruthy();
    expect(result.forecast?.hexagrams.sixtyYear.hexagram.name).toBeTruthy();
  });

  it('使用核心库精简提示词并生成普通用户可读摘要', () => {
    const result = runDivination('huangji-jingshi', new Date(), undefined, { huangjiYear: 2028 });
    const prompt = buildDivinationReadingPrompt('huangji-jingshi', result);
    const summary = formatReadingSummary('huangji-jingshi', result);

    expect(prompt).toContain('目标年份：公元2028年');
    expect(prompt).toContain('值年卦：');
    expect(prompt).not.toContain('【任务】');
    expect(prompt).not.toContain('【传统依据】');
    expect(prompt).not.toContain('计算链');
    expect(summary).toContain('值年卦');
    expect(summary).toContain('十年卦');
  });
});

describe('占卜解读提示词清理', () => {
  const now = new Date('2026-08-09T12:00:00+08:00');

  it('六爻保留卦名、动爻与世应，不再展开完整证据资料', () => {
    const prompt = buildDivinationReadingPrompt('liuyao', runDivination('liuyao', now));

    expect(prompt).toContain('主卦：');
    expect(prompt).toContain('动爻：');
    expect(prompt).toContain('卦宫：');
    expect(prompt).toContain('世应：');
    expect(prompt).not.toContain('六爻明细：');
    expect(prompt).not.toContain('证据：');
    expect(prompt).not.toContain('证据链');
  });

  it('直接使用新版奇门摘要，不再展开完整判断依据', () => {
    const prompt = buildDivinationReadingPrompt('qimen', runDivination('qimen', now));

    expect(prompt).toContain('主轴：');
    expect(prompt).toContain('格局：');
    expect(prompt).not.toContain('判断依据：');
    expect(prompt).not.toContain('证据：');
    expect(prompt).not.toContain('节气交接：');
    expect(prompt).not.toContain('月相：');
  });

  it('保留大六壬课传，压缩古籍规则和神煞推导', () => {
    const prompt = buildDivinationReadingPrompt('liuren', runDivination('liuren', now));

    expect(prompt).toContain('四课：');
    expect(prompt).toContain('三传：');
    expect(prompt).toContain('神煞：');
    expect(prompt).not.toContain('古籍依据');
    expect(prompt).not.toContain('取传说明：');
    expect(prompt).not.toContain('四课关系：');
    expect(prompt).not.toContain('按“');
  });

  it('合并金口诀重复的起课与发用说明', () => {
    const prompt = buildDivinationReadingPrompt('jinkoujue', runDivination('jinkoujue', now));

    expect(prompt).toContain('四位：');
    expect(prompt).not.toContain('起课方式：');
    expect(prompt.match(/^阴阳发用：/gm)).toHaveLength(1);
  });

  it('太乙资料不附带内部模型描述', () => {
    const prompt = buildDivinationReadingPrompt('taiyi', runDivination('taiyi', now, undefined, { taiyiYear: 2026 }));

    expect(prompt).toContain('太乙在');
    expect(prompt).not.toContain('模型：');
  });

  it('小六壬只保留落宫和顺数轨迹，不重复输出起课口径', () => {
    const prompt = buildDivinationReadingPrompt('xiaoliuren', runDivination('xiaoliuren', now));

    expect(prompt).toContain('占得宫：');
    expect(prompt).toContain('顺数轨迹：');
    expect(prompt).not.toContain('起课方式：');
    expect(prompt).not.toContain('历法口径：');
  });

  it('灵签保留签号、签诗与解签内容，不混入内部依据', () => {
    const prompt = buildDivinationReadingPrompt('ssgw', runDivination('ssgw', now));

    expect(prompt).toContain('签号：第');
    expect(prompt).toContain('签题：');
    expect(prompt).toContain('签诗：');
    expect(prompt).toContain('基础解签：');
    expect(prompt).not.toContain('证据：');
    expect(prompt).not.toContain('传统依据：');
  });

  it('择日只传递事项、日期范围和候选日，不复制计算链', () => {
    const prompt = buildDivinationReadingPrompt('almanac', runDivination('almanac', now, undefined, {
      almanacTopic: 'study',
      almanacStartDate: '2026-08-09',
      almanacEndDate: '2026-08-15',
    }));

    expect(prompt).toContain('事项：');
    expect(prompt).toContain('范围：2026-08-09至2026-08-15');
    expect(prompt).toContain('2026-08-09：');
    expect(prompt).not.toContain('证据：');
    expect(prompt).not.toContain('计算链');
  });
});
