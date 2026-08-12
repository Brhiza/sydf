import { describe, expect, it } from 'vitest';
import { getLenormandImageUrl, getWesternDeck, getWesternSpreadOptions, shiyueOracleDeck } from './westernDecks';

describe('西方牌卡素材映射', () => {
  it('完整映射 36 张雷诺曼素材', () => {
    expect(getLenormandImageUrl(1)).toContain('01_%E9%AA%91%E5%A3%AB.png');
    expect(getLenormandImageUrl(36)).toContain('36_%E5%8D%81%E5%AD%97%E6%9E%B6.png');
    expect(getLenormandImageUrl(37)).toBe('');
  });

  it('完整映射 60 张时月神谕素材', () => {
    expect(shiyueOracleDeck).toHaveLength(60);
    expect(shiyueOracleDeck[0]).toMatchObject({ id: 1, name: '甲子 · 海藏新生', subtitle: '海中金' });
    expect(shiyueOracleDeck[59]).toMatchObject({ id: 60, name: '癸亥 · 沧海归一', subtitle: '大海水' });
    expect(new Set(shiyueOracleDeck.map(card => card.imageUrl)).size).toBe(60);
  });

  it('为雷诺曼提供传统牌阵及对应牌位', () => {
    const spreads = getWesternSpreadOptions('lenormand');
    expect(spreads.map(item => [item.value, item.count])).toEqual([
      ['single', 1], ['three', 3], ['five', 5], ['relationship', 5], ['decision', 6], ['nine', 9],
    ]);
    expect(spreads.every(item => item.positions.length === item.count)).toBe(true);
    expect(getWesternDeck('lenormand')).toHaveLength(36);
  });

  it('为时月神谕提供单牌和三牌手动抽取所需牌位', () => {
    expect(getWesternSpreadOptions('shiyue-oracle').map(item => [item.value, item.count])).toEqual([
      ['single', 1], ['three', 3],
    ]);
    expect(getWesternDeck('shiyue-oracle')).toHaveLength(60);
  });
});
