import { describe, expect, it } from 'vitest';
import {
  summaryCautionInterruption,
  summarySecondaryRelation,
  type FortunePeriod,
} from './dailyFortuneCorpus';

const topics = ['career', 'study', 'wealth', 'relationship', 'travel', 'wellbeing'] as const;

const labels: Record<(typeof topics)[number], string> = {
  career: '工作',
  study: '学习',
  wealth: '钱款',
  relationship: '沟通',
  travel: '出行',
  wellbeing: '休息',
};

const topicMarkers: Record<(typeof topics)[number], RegExp> = {
  career: /工作|交付|验收|负责人|责任/,
  study: /学习|资料|理解|记忆|笔记|练习|输入|输出/,
  wealth: /钱款|金额|付款|成本|预算|报价|结算|费用/,
  relationship: /沟通|共同事实|承诺|会面|倾听|表达|立场|分歧|同行人|接待方/,
  travel: /出行|行程|路线|地点|转场|返程|交通|住宿/,
  wellbeing: /身心|休息|恢复|睡眠|进食|注意力|疲劳|情绪/,
};

const periods: FortunePeriod[] = ['today', 'month', 'year'];

const alarmistPatterns = /致命|不可逆|免疫|疾病|致病|倾家荡产|祸患|蒙受损失|有毒|黑洞/;

describe('运势主题关系审计', () => {
  it('所有周期下两两组合都说明第二主题怎样实际承接主线', () => {
    periods.forEach((period) => {
      const relations: string[] = [];
      topics.forEach((primary) => topics.filter((secondary) => secondary !== primary).forEach((secondary) => {
        const relation = summarySecondaryRelation(primary, secondary, labels[primary], labels[secondary], period);
        relations.push(relation);
        expect(relation, `${period}: ${primary} <- ${secondary}`).toMatch(topicMarkers[primary]);
        expect(relation, `${period}: ${primary} <- ${secondary}`).toMatch(topicMarkers[secondary]);
        expect(relation).not.toMatch(/负责补齐.+形成结果所需的现实条件|负责承接主线|主线结果/);
        expect(relation).not.toMatch(alarmistPatterns);
        expect(relation.length).toBeGreaterThan(20);
        if (period !== 'today') {
          expect(relation).not.toMatch(/报销|改退票|出门前|临时插单/);
        }
      }));
      expect(relations).toHaveLength(30);
      expect(new Set(relations).size).toBe(30);
    });

    // 验证同一主题组合在不同周期尺度下表达不雷同
    topics.forEach((primary) => topics.filter((secondary) => secondary !== primary).forEach((secondary) => {
      const todayText = summarySecondaryRelation(primary, secondary, labels[primary], labels[secondary], 'today');
      const monthText = summarySecondaryRelation(primary, secondary, labels[primary], labels[secondary], 'month');
      const yearText = summarySecondaryRelation(primary, secondary, labels[primary], labels[secondary], 'year');
      expect(todayText, `${primary}<-${secondary} today vs month`).not.toBe(monthText);
      expect(monthText, `${primary}<-${secondary} month vs year`).not.toBe(yearText);
    }));
  });

  it('所有周期下两两组合都说明牵制项会造成什么具体后果', () => {
    periods.forEach((period) => {
      const interruptions: string[] = [];
      topics.forEach((primary) => topics.filter((caution) => caution !== primary).forEach((caution) => {
        const interruption = summaryCautionInterruption(primary, caution, labels[primary], labels[caution], period);
        interruptions.push(interruption);
        expect(interruption, `${period}: ${primary} x ${caution}`).toMatch(topicMarkers[primary]);
        expect(interruption, `${period}: ${primary} x ${caution}`).toMatch(topicMarkers[caution]);
        expect(interruption).not.toMatch(/条件反复会截断.+形成结果的过程|所需的检查与收尾|增加额外成本或责任/);
        expect(interruption).not.toMatch(alarmistPatterns);
        expect(interruption.length).toBeGreaterThan(20);
        if (period !== 'today') {
          expect(interruption).not.toMatch(/报销|改退票|出门前|临时插单/);
        }
      }));
      expect(interruptions).toHaveLength(30);
      expect(new Set(interruptions).size).toBe(30);
    });

    // 验证同一牵制组合在不同周期尺度下表达不雷同
    topics.forEach((primary) => topics.filter((caution) => caution !== primary).forEach((caution) => {
      const todayText = summaryCautionInterruption(primary, caution, labels[primary], labels[caution], 'today');
      const monthText = summaryCautionInterruption(primary, caution, labels[primary], labels[caution], 'month');
      const yearText = summaryCautionInterruption(primary, caution, labels[primary], labels[caution], 'year');
      expect(todayText, `${primary}x${caution} today vs month`).not.toBe(monthText);
      expect(monthText, `${primary}x${caution} month vs year`).not.toBe(yearText);
    }));
  });
});
