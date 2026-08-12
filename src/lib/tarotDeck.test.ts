import { describe, expect, it } from 'vitest';
import { getShiyueTarotCard, getShiyueTarotName, shiyueTarotDeck } from './tarotDeck';

describe('时月塔罗牌组映射', () => {
  it('保留 0–77 的传统牌序并映射到 mingyu-core 的 1–78', () => {
    expect(shiyueTarotDeck).toHaveLength(78);
    expect(getShiyueTarotCard(1)).toMatchObject({
      coreId: 1,
      traditionalNumber: 0,
      traditionalName: '愚者',
      shiyueName: '随云启程',
    });
    expect(getShiyueTarotCard(78)).toMatchObject({
      coreId: 78,
      traditionalNumber: 77,
      traditionalName: '星币国王',
      shiyueName: '山河丰藏',
    });
  });

  it('牌面路径与界面名称均不包含英文名', () => {
    expect(getShiyueTarotName(11)).toBe('命运之轮 · 命轮流转');
    expect(getShiyueTarotCard(11)?.imageUrl).toBe('/tarot/shiyue/010-命运之轮-命轮流转.png');
    expect(shiyueTarotDeck.every(card => !/[A-Za-z]/.test((card.imageUrl.split('/').at(-1) || '').replace(/\.png$/, '')))).toBe(true);
  });
});
