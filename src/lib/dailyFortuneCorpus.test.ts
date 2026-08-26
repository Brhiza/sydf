import { describe, expect, it } from 'vitest';
import {
  renderFortuneReading,
  type FortuneReadingPhraseContext,
  type FortuneReadingPosture,
} from './dailyFortuneCorpus';

const postures: FortuneReadingPosture[] = [
  'advance',
  'focus',
  'cultivate',
  'resolve',
  'stabilize',
  'restore',
  'protect',
];

const cautionActions = [
  '先把负责人与完成标准写清，未确认的部分不要提前承诺。',
  '只保留一个学习目标，并用笔记或练习检验是否真正掌握。',
  '保存报价和付款记录，逐项确认金额、责任人及付款节点。',
  '先复述对方重点，再只处理一个分歧，不用猜测补齐信息。',
  '预留缓冲并准备备选路线，证件和关键物品出发前逐项确认。',
  '如果睡眠、食欲和注意力中有两项同时偏弱，删去一项非必要安排，并优先补足休息。',
];

function context(cautionAction: string): FortuneReadingPhraseContext {
  return {
    lead: '今天',
    primaryLabel: '工作事业',
    primaryShortLabel: '工作',
    primaryOutcome: '可验收结果',
    periodUnit: '时段',
    secondaryRole: '学习负责把本期经验沉淀成可复用的方法，输出比继续收集更能检验成果',
    cautionLabel: '金钱合作',
    bestWindow: '上午 09:00—10:59',
    cautionWindow: '下午 15:00—16:59',
    primaryAction: '先处理目标清楚、能直接推进的工作',
    primaryBoundary: '临时插单或责任人发生变化时，先不接新任务',
    cautionAction,
    primaryReason: '工作事业最容易把投入转成明确交付，也能在开始前划清责任。',
    cautionReason: '金钱合作同时影响现金流与合作责任，一处误差可能延续到后续结算。',
    mixed: true,
  };
}

describe('运势整体语料', () => {
  it('谨慎建议只保留主题专属动作，不再追加姿态级通用尾句', () => {
    postures.forEach((posture) => cautionActions.forEach((cautionAction) => {
      const result = renderFortuneReading(posture, context(cautionAction), `${posture}-${cautionAction}`);
      expect(result.caution).toBe(`下午 15:00—16:59，${cautionAction}`);
    }));
  });

  it('不同姿态和语料变体不再产生低信息表达', () => {
    const genericPattern = /同一偏差连续出现两次|保持弹性|先留后手|不宜硬撑|先减负再判断|先止损|局面自然会顺|需要多看一步|根据实际进展调整|留有收尾空间|重要决定.{0,4}多核对一次|不宜同步冒进|边界稳定后再考虑扩大范围|完成当前一步后再衔接其他安排|主线完成前不新开第二项|完成一次核对后再决定下一步|连续稳定后再提高强度|先保持一段稳定投入，不追求一次做满|完成当前一步后转去处理卡点|本期不追加新的承诺|是较好的落点|留出复核余地|气势较整|平顺而不张扬|培土蓄势|宜稳中求进|稳步积累|整体主线清楚|不需要四处试探|资源应集中|当前最清楚的着力点|次序比速度重要|局面没有明显偏向|整体并非全面受阻|当前不需要全面收缩|当前承接能力比机会多少更重要|局面容易受状态起伏牵动|守住基本盘|维持秩序|先处理卡点，以|先养住状态|宜先整顿身心|宜收不宜放|维持节奏|形成可重复的做法|单点突破信号|作为配合|保持连续|逐步接上|维持稳定投入|暂作配合|只做必要维护|不增加变量|再承接已有进展|可以承接，但不抢占主线资源/;
    postures.forEach((posture) => {
      Array.from({ length: 80 }, (_, index) => renderFortuneReading(posture, context(cautionActions[index % cautionActions.length]), `${posture}-${index}`))
        .forEach((result) => {
          const text = [result.title, result.summary, result.opportunity, result.caution].join('\n');
          expect(text).not.toMatch(genericPattern);
          expect(result.summary.length).toBeGreaterThan(35);
          expect(result.opportunity.length).toBeGreaterThan(20);
          expect(result.opportunity).toMatch(/^上午 09:00—10:59，/);
        });
    });
  });

  it('标题给结论，总评开场只解释承接关系与后果', () => {
    postures.forEach((posture) => {
      const phraseContext = context(cautionActions[0]);
      const result = renderFortuneReading(posture, phraseContext, `${posture}-title-summary-role`);
      const reasonStart = result.summary.indexOf(phraseContext.primaryReason);
      const opening = reasonStart >= 0 ? result.summary.slice(0, reasonStart) : result.summary;
      expect(opening).toContain(phraseContext.secondaryRole);
      expect(opening).not.toContain(phraseContext.primaryLabel);
      expect(opening).not.toContain(phraseContext.primaryOutcome);
      expect(opening).toMatch(/承接|持续|闭合|等待|返工|反馈|条件|承载量|新增承诺/);
    });
  });

  it('标题直接说明周期单位和可验证结果', () => {
    const results = Array.from({ length: 80 }, (_, index) => (
      renderFortuneReading('cultivate', context(cautionActions[index % cautionActions.length]), `cultivate-title-${index}`)
    ));
    expect(results.some((result) => result.title.includes('多数时段平稳'))).toBe(true);
    expect(results.some((result) => result.title.includes('能否形成可验收结果'))).toBe(true);
    results.forEach((result) => expect(result.title).not.toMatch(/多数阶段平稳|突破信号不集中/));
  });

  it('首要行动只讲主线，不提前复述第二主题', () => {
    const parallelContext = context(cautionActions[0]);
    (['advance', 'focus', 'stabilize', 'cultivate'] satisfies FortuneReadingPosture[]).forEach((posture) => {
      const result = renderFortuneReading(posture, parallelContext, `${posture}-parallel-wellbeing`);
      expect(result.opportunity).toContain('先处理目标清楚、能直接推进的工作');
      expect(result.opportunity).not.toMatch(/阅读|写作|复盘|休息|饮食|轻度活动/);
    });
  });

  it('身心状态作为第二主题时始终同步照顾，不排在主线完成之后', () => {
    const wellbeingContext = {
      ...context(cautionActions[0]),
      secondaryRole: '身心状态是主线能否持续的底层条件，恢复不足会让其他判断同时失真',
    };
    postures.forEach((posture) => {
      const results = Array.from({ length: 40 }, (_, index) => renderFortuneReading(posture, wellbeingContext, `${posture}-secondary-wellbeing-${index}`));
      expect(results.some((result) => result.summary.includes(wellbeingContext.secondaryRole))).toBe(true);
      results.forEach((result) => expect(result.summary).not.toMatch(/身心状态(?:随后|再承接|适合接在|逐步接上|维持稳定投入|不增加变量|只做必要维护|不再加量)/));
    });
  });
});
