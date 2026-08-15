import { afterEach, describe, expect, it } from 'vitest';
import {
  getNumberedThemeCardImageUrl,
  getTarotThemeImageUrl,
  getXiaoliurenThemeImageUrl,
  resolveDivinationThemeId,
  setDivinationTheme,
} from './divinationTheme';
import { getShiyueTarotCard } from './tarotDeck';
import { getWesternDeck } from './westernDecks';

describe('占卜主题资源映射', () => {
  afterEach(() => setDivinationTheme('yue'));

  it('按统一目录生成完整主题路径', () => {
    setDivinationTheme('shi');
    expect(getTarotThemeImageUrl(18)).toBe('/divination-themes/shi/cards/tarot/018.webp');
    expect(getNumberedThemeCardImageUrl('ssgw', 92)).toBe('/divination-themes/shi/cards/ssgw/92.webp');
  });

  it('未补齐的墨主题资源回退到月主题', () => {
    setDivinationTheme('mo');
    expect(resolveDivinationThemeId('tarot')).toBe('yue');
    expect(resolveDivinationThemeId('xiaoliuren')).toBe('mo');
    expect(getTarotThemeImageUrl(0)).toBe('/divination-themes/yue/cards/tarot/000.webp');
    expect(getXiaoliurenThemeImageUrl('da-an.webp')).toBe('/divination-themes/mo/xiaoliuren/da-an.webp');
  });

  it('已创建的牌组数据也会立即跟随主题切换', () => {
    setDivinationTheme('shi');
    expect(getShiyueTarotCard(1)?.imageUrl).toBe('/divination-themes/shi/cards/tarot/000.webp');
    expect(getWesternDeck('lenormand')[0]?.imageUrl).toBe('/divination-themes/shi/cards/lenormand/01.webp');
    expect(getWesternDeck('shiyue-oracle')[0]?.imageUrl).toBe('/divination-themes/shi/cards/oracle/01.webp');
  });
});
