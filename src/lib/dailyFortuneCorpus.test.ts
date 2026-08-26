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
  '观察睡眠、食欲和注意力，连续偏弱时主动减量。',
];

function context(cautionAction: string): FortuneReadingPhraseContext {
  return {
    lead: '今天',
    primaryLabel: '工作事业',
    secondaryLabel: '学习成长',
    cautionLabel: '金钱合作',
    bestWindow: '上午 09:00—10:59',
    cautionWindow: '下午 15:00—16:59',
    primaryAction: '先处理目标清楚、能直接推进的工作',
    primaryBoundary: '临时插单或责任人发生变化时，先不接新任务',
    secondaryAction: '集中完成一段阅读、写作或复盘',
    secondaryParallel: false,
    cautionAction,
    primaryReason: '工作事业最容易把投入转成明确交付，也能在开始前划清责任。',
    cautionReason: '金钱合作同时影响现金流与合作责任，一处误差可能延续到后续结算。',
    personalClause: '',
    mixed: true,
  };
}

describe('运势整体语料', () => {
  it('谨慎建议只保留主题专属动作，不再追加姿态级通用尾句', () => {
    postures.forEach((posture) => cautionActions.forEach((cautionAction) => {
      const result = renderFortuneReading(posture, context(cautionAction), `${posture}-${cautionAction}`);
      expect(result.caution).toBe(`下午 15:00—16:59这段时间尤其要留出复核余地，${cautionAction}`);
    }));
  });

  it('不同姿态和语料变体不再产生低信息表达', () => {
    const genericPattern = /同一偏差连续出现两次|保持弹性|先留后手|不宜硬撑|先减负再判断|先止损|局面自然会顺|需要多看一步|根据实际进展调整|留有收尾空间|重要决定.{0,4}多核对一次|不宜同步冒进|边界稳定后再考虑扩大范围|完成当前一步后再衔接其他安排|主线完成前不新开第二项|完成一次核对后再决定下一步|连续稳定后再提高强度|先保持一段稳定投入，不追求一次做满|完成当前一步后转去处理卡点|本期不追加新的承诺/;
    postures.forEach((posture) => {
      Array.from({ length: 80 }, (_, index) => renderFortuneReading(posture, context(cautionActions[index % cautionActions.length]), `${posture}-${index}`))
        .forEach((result) => {
          const text = [result.title, result.summary, result.opportunity, result.caution].join('\n');
          expect(text).not.toMatch(genericPattern);
          expect(result.summary.length).toBeGreaterThan(35);
          expect(result.opportunity.length).toBeGreaterThan(20);
        });
    });
  });

  it('身心状态作为第二主题时保持并行，不被排到主线完成之后', () => {
    const parallelContext: FortuneReadingPhraseContext = {
      ...context(cautionActions[0]),
      secondaryAction: '给休息、饮食和轻度活动留出固定时间',
      secondaryParallel: true,
    };
    (['advance', 'focus', 'stabilize', 'cultivate'] satisfies FortuneReadingPosture[]).forEach((posture) => {
      const result = renderFortuneReading(posture, parallelContext, `${posture}-parallel-wellbeing`);
      expect(result.opportunity).toContain('同时给休息、饮食和轻度活动留出固定时间');
      expect(result.opportunity).not.toMatch(/后，再给休息/);
    });
  });
});
