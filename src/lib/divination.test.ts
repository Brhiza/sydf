import { describe, expect, it } from 'vitest';
import type { WuyunLiuqiResult } from 'mingyu-core/wuyun-liuqi';
import type { HuangjiJingshiResult } from 'mingyu-core/huangji-jingshi';
import type { BaziChartResult } from 'mingyu-core/bazi';
import { buildDivinationReadingPrompt, formatReadingSummary, runDivination, runZiweiChart, type BirthForm } from './divination';

const testBirth: BirthForm = {
  name: '测试案例',
  gender: 'female',
  date: '1990-06-15',
  dateType: 'solar',
  isLeapMonth: false,
  time: '12:00',
  timeBasis: 'clock',
  locationName: '北京市 东城区',
  latitude: '39.9042',
  longitude: '116.4074',
  timezone: '8',
};

describe('紫微大限流年前端链路', () => {
  it('使用指定年份计算紫微流年并生成对应提示词', async () => {
    const result = await runZiweiChart(testBirth, {
      scope: 'yearly',
      year: 2028,
      currentTime: new Date('2026-08-09T12:00:00+08:00'),
    });

    expect(result.ziweiFortuneScope).toBe('yearly');
    expect(result.fortuneDate).toBe('2028-08-09');
    expect(result.payloadByScope.origin).toBeTruthy();
    expect(result.payloadByScope.decadal).toBeTruthy();
    expect(result.payloadByScope.yearly).toBeTruthy();
    expect(result.payload).toBe(result.payloadByScope.yearly);
    expect(result.prompt).toContain('2028');
    expect(result.prompt).toContain('流年');
  }, 20_000);

  it('只请求原局时不会混入大限与流年范围', async () => {
    const result = await runZiweiChart(testBirth, {
      scope: 'origin',
      currentTime: new Date('2026-08-09T12:00:00+08:00'),
    });

    expect(result.payloadByScope.origin).toBeTruthy();
    expect(result.payloadByScope.decadal).toBeUndefined();
    expect(result.payloadByScope.yearly).toBeUndefined();
    expect(result.prompt).not.toContain('【大限盘】');
    expect(result.prompt).not.toContain('【流年盘】');
  });
});

describe('八字新版神煞范围适配', () => {
  it('排盘保留完整神煞，交由展示层筛选', async () => {
    const result = await runDivination('bazi', new Date('2026-08-09T12:00:00+08:00'), {
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
  it('使用指定公历年份生成真实年度盘面', async () => {
    const result = await runDivination('wuyun-liuqi', new Date('2026-08-09T12:00:00+08:00'), undefined, { wuyunYear: 2028 }) as WuyunLiuqiResult;

    expect(result.input.yearGanZhi).toBe('戊申');
    expect(result.annualMovement.name).toBe('火运');
    expect(result.movementSteps).toHaveLength(5);
    expect(result.qiSteps).toHaveLength(6);
  });

  it('为 AI 提供完整盘面并生成可读摘要', async () => {
    const result = await runDivination('wuyun-liuqi', new Date(), undefined, { wuyunYear: 2028 });
    const prompt = await buildDivinationReadingPrompt('wuyun-liuqi', result);
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
  it('使用公历年份生成值年卦与多层周期', async () => {
    const result = await runDivination('huangji-jingshi', new Date('2026-08-09T12:00:00+08:00'), undefined, { huangjiYear: 2028 }) as HuangjiJingshiResult;

    expect(result.input.year).toBe(2028);
    expect(result.forecast?.hexagrams.annual.name).toBeTruthy();
    expect(result.forecast?.hexagrams.decade.hexagram.name).toBeTruthy();
    expect(result.forecast?.hexagrams.sixtyYear.hexagram.name).toBeTruthy();
  });

  it('使用核心库精简提示词并生成普通用户可读摘要', async () => {
    const result = await runDivination('huangji-jingshi', new Date(), undefined, { huangjiYear: 2028 });
    const prompt = await buildDivinationReadingPrompt('huangji-jingshi', result);
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

  it('梅花保留完整主互变卦、卦爻辞与体用，不发送起卦过程', async () => {
    const prompt = await buildDivinationReadingPrompt('meihua', await runDivination('meihua', now));

    expect(prompt).toContain('盘面干支：');
    expect(prompt).toContain('主卦（当前）：');
    expect(prompt).toContain('互卦（过程）：');
    expect(prompt).toContain('变卦（结果）：');
    expect(prompt.match(/- 卦辞：/g)).toHaveLength(3);
    expect(prompt).toContain('- 爻辞：');
    expect(prompt).toContain('主卦体用：');
    expect(prompt).toContain('过程体用：');
    expect(prompt).toContain('结果体用：');
    expect(prompt).toContain('月令旺衰：');
    expect(prompt).not.toContain('随机起卦法');
    expect(prompt).not.toContain('数字起卦法');
    expect(prompt).not.toContain('起卦数字');
    expect(prompt).not.toContain('计算链');
    expect(prompt).not.toContain('证据链');
    expect(prompt).not.toContain('evidenceAnalysis');
  });

  it('六爻按问题选取用神，并保留动变、世应和月日触发', async () => {
    const prompt = await buildDivinationReadingPrompt('liuyao', await runDivination('liuyao', now), { question: '我的项目能推进吗' });

    expect(prompt).toContain('核心结构：主卦');
    expect(prompt).toContain('用神：官鬼');
    expect(prompt).toContain('世应：');
    expect(prompt).toContain('动变：');
    expect(prompt).toContain('月日触发：');
    expect(prompt).not.toContain('证据：');
    expect(prompt).not.toContain('证据链');
  });

  it('奇门保留核心宫、值符值使、时干、旬空与马星', async () => {
    const prompt = await buildDivinationReadingPrompt('qimen', await runDivination('qimen', now));

    expect(prompt).toContain('取用主线：');
    expect(prompt).toContain('门星神干：');
    expect(prompt).toContain('值符值使与时干：');
    expect(prompt).toContain('旬空与马星：');
    expect(prompt).not.toContain('判断依据：');
    expect(prompt).not.toContain('证据：');
    expect(prompt).not.toContain('节气交接：');
    expect(prompt).not.toContain('月相：');
  });

  it('保留大六壬课传，压缩古籍规则和神煞推导', async () => {
    const prompt = await buildDivinationReadingPrompt('liuren', await runDivination('liuren', now));

    expect(prompt).toContain('四课：');
    expect(prompt).toContain('三传：');
    expect(prompt).toContain('神煞：');
    expect(prompt).not.toContain('古籍依据');
    expect(prompt).not.toContain('取传说明：');
    expect(prompt).not.toContain('四课关系：');
    expect(prompt).not.toContain('按“');
  });

  it('合并金口诀重复的起课与发用说明', async () => {
    const prompt = await buildDivinationReadingPrompt('jinkoujue', await runDivination('jinkoujue', now));

    expect(prompt).toContain('四位：');
    expect(prompt).not.toContain('起课方式：');
    expect(prompt.match(/^阴阳发用：/gm)).toHaveLength(1);
  });

  it('太乙资料不附带内部模型描述', async () => {
    const prompt = await buildDivinationReadingPrompt('taiyi', await runDivination('taiyi', now, undefined, { taiyiYear: 2026 }));

    expect(prompt).toContain('太乙：');
    expect(prompt).toContain('主客定算：');
    expect(prompt).toContain('将参：');
    expect(prompt).not.toContain('模型：');
  });

  it('小六壬保留盘面时间、落宫轨迹和最终歌诀', async () => {
    const prompt = await buildDivinationReadingPrompt('xiaoliuren', await runDivination('xiaoliuren', now));

    expect(prompt).toContain('盘面干支：');
    expect(prompt).toContain('落宫轨迹：月宫');
    expect(prompt).toContain('最终落宫：');
    expect(prompt).toContain('落宫歌诀：');
    expect(prompt).not.toContain('起课方式：');
    expect(prompt).not.toContain('历法口径：');
  });

  it('灵签保留签号、签诗与解签内容，不混入内部依据', async () => {
    const prompt = await buildDivinationReadingPrompt('ssgw', await runDivination('ssgw', now));

    expect(prompt).toContain('签号：第');
    expect(prompt).toContain('签题：');
    expect(prompt).toContain('签诗：');
    expect(prompt).toContain('基础解签：');
    expect(prompt).not.toContain('证据：');
    expect(prompt).not.toContain('传统依据：');
  });

  it('择日传递事项、日期范围、候选日课和可用时辰，不复制计算链', async () => {
    const prompt = await buildDivinationReadingPrompt('almanac', await runDivination('almanac', now, undefined, {
      almanacTopic: 'study',
      almanacStartDate: '2026-08-09',
      almanacEndDate: '2026-08-15',
    }));

    expect(prompt).toContain('择日事项：考试学习');
    expect(prompt).toContain('候选日期：2026-08-09 至 2026-08-15');
    expect(prompt).toContain('候选日期明细：');
    expect(prompt).toContain('日课：');
    expect(prompt).toContain('可用时辰');
    expect(prompt).not.toContain('证据：');
    expect(prompt).not.toContain('计算链');
  });
});
