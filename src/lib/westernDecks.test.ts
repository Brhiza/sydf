import { describe, expect, it } from 'vitest';
import { getLenormandImageUrl, getWesternDeck, getWesternSpreadOptions, shiyueOracleDeck } from './westernDecks';
import { buildShiyueOraclePrompt, SHIYUE_ORACLE_CARDS } from './shiyueOracle';

describe('西方牌卡素材映射', () => {
  it('完整映射 36 张雷诺曼素材', () => {
    expect(getLenormandImageUrl(1)).toBe('/divination-themes/yue/cards/lenormand/01.webp');
    expect(getLenormandImageUrl(36)).toBe('/divination-themes/yue/cards/lenormand/36.webp');
    expect(getLenormandImageUrl(37)).toBe('');
  });

  it('完整映射 60 张时月神谕素材', () => {
    expect(shiyueOracleDeck).toHaveLength(60);
    expect(shiyueOracleDeck[0]).toMatchObject({ id: 1, name: '海中金' });
    expect(shiyueOracleDeck[0]?.subtitle).toBeUndefined();
    expect(shiyueOracleDeck[59]).toMatchObject({ id: 60, name: '大海水' });
    expect(new Set(shiyueOracleDeck.map(card => card.imageUrl)).size).toBe(60);
    expect(SHIYUE_ORACLE_CARDS).toHaveLength(60);
    expect(shiyueOracleDeck.every(card => Boolean(card.meaning) && Boolean(card.guidance))).toBe(true);
    expect(new Set(SHIYUE_ORACLE_CARDS.map(card => card.ganzhi)).size).toBe(60);
    expect(new Set(SHIYUE_ORACLE_CARDS.map(card => card.title)).size).toBe(60);
  });

  it('以固定牌义生成时月神谕提示词', () => {
    const prompt = buildShiyueOraclePrompt('是否适合开始新计划？', '单牌神谕', [
      { ...shiyueOracleDeck[0]!, position: '当下指引' },
    ]);
    expect(prompt).toContain('以下资料是本次解读的唯一牌义标准');
    expect(prompt).toContain('核心牌义：力量尚藏于深处');
    expect(prompt).toContain('行动指引：先保护最初的想法与资源');
    expect(prompt).toContain('不得虚构签诗、典故、神明旨意');
  });

  it('为雷诺曼提供传统牌阵及对应牌位', () => {
    const spreads = getWesternSpreadOptions('lenormand');
    expect(spreads.map(item => [item.value, item.count])).toEqual([
      ['single', 1], ['three', 3], ['five', 5], ['relationship', 5], ['decision', 6], ['nine', 9],
    ]);
    expect(spreads.every(item => item.positions.length === item.count)).toBe(true);
    expect(getWesternDeck('lenormand')).toHaveLength(36);
    expect(getWesternDeck('lenormand')[0]).toMatchObject({ name: '骑士', subtitle: '云使传讯' });
  });

  it('为时月神谕提供单牌和三牌手动抽取所需牌位', () => {
    expect(getWesternSpreadOptions('shiyue-oracle').map(item => [item.value, item.count])).toEqual([
      ['single', 1], ['three', 3],
    ]);
    expect(getWesternDeck('shiyue-oracle')).toHaveLength(60);
  });
});
