import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  activeDivinationThemeStyle,
  getNumberedThemeCardImageUrl,
  getTarotThemeImageUrl,
  getDivinationThemeLogoUrl,
  getXiaoliurenThemeImageUrl,
  resolveDivinationThemeId,
  setDivinationTheme,
} from './divinationTheme';
import { getShiyueTarotCard } from './tarotDeck';
import { getWesternDeck } from './westernDecks';

describe('占卜主题资源映射', () => {
  afterEach(() => {
    setDivinationTheme('yue');
    vi.unstubAllGlobals();
  });

  it('按统一目录生成完整主题路径', () => {
    setDivinationTheme('shi');
    expect(getTarotThemeImageUrl(18)).toBe('/divination-themes/shi/cards/tarot/018.webp');
    expect(getNumberedThemeCardImageUrl('ssgw', 92)).toBe('/divination-themes/shi/cards/ssgw/92.webp');
    expect(getDivinationThemeLogoUrl()).toBe('/divination-themes/shi/logo.webp');
  });

  it('未补齐的墨主题资源回退到月主题', () => {
    setDivinationTheme('mo');
    expect(resolveDivinationThemeId('tarot')).toBe('yue');
    expect(resolveDivinationThemeId('xiaoliuren')).toBe('mo');
    expect(getTarotThemeImageUrl(0)).toBe('/divination-themes/yue/cards/tarot/000.webp');
    expect(getXiaoliurenThemeImageUrl('da-an.webp')).toBe('/divination-themes/mo/xiaoliuren/da-an.webp');
    expect(getDivinationThemeLogoUrl()).toBe('/divination-themes/mo/logo.webp');
  });

  it('主题切换会同步整套界面色板和页面主题标记', () => {
    const dataset: Record<string, string> = {};
    vi.stubGlobal('document', {
      documentElement: { dataset },
      querySelector: () => null,
    });
    const yueAccent = activeDivinationThemeStyle.value['--ds-accent'];
    setDivinationTheme('shi');
    expect(activeDivinationThemeStyle.value['--ds-accent']).not.toBe(yueAccent);
    expect(dataset.divinationTheme).toBe('shi');
  });

  it('已创建的牌组数据也会立即跟随主题切换', () => {
    setDivinationTheme('shi');
    expect(getShiyueTarotCard(1)?.imageUrl).toBe('/divination-themes/shi/cards/tarot/000.webp');
    expect(getWesternDeck('lenormand')[0]?.imageUrl).toBe('/divination-themes/shi/cards/lenormand/01.webp');
    expect(getWesternDeck('shiyue-oracle')[0]?.imageUrl).toBe('/divination-themes/shi/cards/oracle/01.webp');
  });
});
