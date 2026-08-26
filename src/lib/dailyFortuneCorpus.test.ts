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
    cautionAction,
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
    const genericPattern = /同一偏差连续出现两次|保持弹性|先留后手|不宜硬撑|先减负再判断|先止损|局面自然会顺|需要多看一步|根据实际进展调整|留有收尾空间|重要决定.{0,4}多核对一次|不宜同步冒进/;
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
});
