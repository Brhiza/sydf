import { describe, expect, it } from 'vitest';
import { drawTarotSpread } from 'mingyu-core/divination/tarot';
import { buildDivinationPrompt } from 'mingyu-core/prompt/divination';
import { tarotSpreadOptions } from './tarot';

describe('塔罗牌阵适配', () => {
  it('同步 mingyu-core 0.1.31 的全部 18 种牌阵', () => {
    expect(tarotSpreadOptions).toHaveLength(18);
    expect(tarotSpreadOptions.map(item => item.value)).toEqual(expect.arrayContaining([
      'holyTriangle',
      'universal',
      'fourElements',
      'hexagram',
      'relationship',
      'wealth',
      'problemSolving',
      'twelveHouses',
    ]));
    expect(tarotSpreadOptions.find(item => item.value === 'twelveHouses')).toMatchObject({
      label: '十二宫牌阵',
      count: 12,
    });
  });

  it('新牌阵使用 core 提供的专属解读框架', () => {
    const reading = drawTarotSpread('holyTriangle', {
      manualCards: [
        { id: 1, reversed: false },
        { id: 2, reversed: true },
        { id: 3, reversed: false },
      ],
    });
    const prompt = buildDivinationPrompt({
      method: 'tarot',
      data: reading,
      question: '这件事接下来会如何发展？',
      isCustomQuestion: true,
    });

    expect(prompt).toContain('按问题根源、当前状况、发展结果形成简洁因果链');
    expect(prompt).toContain('说明根源如何塑造现状');
  });
});
