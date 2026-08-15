import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  activeDivinationThemeStyle,
  getNumberedThemeCardImageUrl,
  getTarotThemeImageUrl,
  getDivinationThemeLogoUrl,
  getLiuyaoRitualImageUrl,
  getShengbeiImageUrl,
  getXiaoliurenThemeImageUrl,
  resolveDivinationThemeId,
  setDivinationTheme,
} from './divinationTheme';
import { getShiyueTarotCard } from './tarotDeck';
import { getWesternDeck } from './westernDecks';

const assetPath = (url: string) => url.split('?')[0];

describe('占卜主题资源映射', () => {
  afterEach(() => {
    setDivinationTheme('yue');
    vi.unstubAllGlobals();
  });

  it('按统一目录生成完整主题路径', () => {
    setDivinationTheme('shi');
    expect(assetPath(getTarotThemeImageUrl(18))).toBe('/divination-themes/shi/cards/tarot/018.webp');
    expect(assetPath(getNumberedThemeCardImageUrl('ssgw', 92))).toBe('/divination-themes/shi/cards/ssgw/92.webp');
    expect(assetPath(getDivinationThemeLogoUrl())).toBe('/divination-themes/shi/logo.webp');
    expect(getDivinationThemeLogoUrl()).toContain('?v=');
  });

  it('墨主题使用完整的独立牌图', () => {
    setDivinationTheme('mo');
    expect(resolveDivinationThemeId('tarot')).toBe('mo');
    expect(resolveDivinationThemeId('xiaoliuren')).toBe('mo');
    expect(assetPath(getTarotThemeImageUrl(0))).toBe('/divination-themes/mo/cards/tarot/000.webp');
    expect(assetPath(getNumberedThemeCardImageUrl('hexagrams', 64))).toBe('/divination-themes/mo/cards/hexagrams/64.webp');
    expect(assetPath(getNumberedThemeCardImageUrl('ssgw', 92))).toBe('/divination-themes/mo/cards/ssgw/92.webp');
    expect(assetPath(getXiaoliurenThemeImageUrl('da-an.webp'))).toBe('/divination-themes/mo/xiaoliuren/da-an.webp');
    expect(assetPath(getDivinationThemeLogoUrl())).toBe('/divination-themes/mo/logo.webp');
  });

  it('三个主题共用同一套传统仪式素材', () => {
    const paths = (['yue', 'shi', 'mo'] as const).map((themeId) => {
      setDivinationTheme(themeId);
      return [
        assetPath(getShengbeiImageUrl('yang')),
        assetPath(getShengbeiImageUrl('yin')),
        assetPath(getLiuyaoRitualImageUrl('shell')),
        assetPath(getLiuyaoRitualImageUrl('coin-heads')),
        assetPath(getLiuyaoRitualImageUrl('coin-tails')),
      ];
    });
    expect(new Set(paths.map(path => path.join('|'))).size).toBe(1);
    expect(paths[0]).toEqual([
      '/divination-assets/ritual/shengbei-yang.webp',
      '/divination-assets/ritual/shengbei-yin.webp',
      '/divination-assets/ritual/shell.webp',
      '/divination-assets/ritual/coin-heads.webp',
      '/divination-assets/ritual/coin-tails.webp',
    ]);
  });

  it('主题切换会同步整套界面色板和页面主题标记', () => {
    const dataset: Record<string, string> = {};
    const rootVariables: Record<string, string> = {};
    vi.stubGlobal('document', {
      documentElement: {
        dataset,
        style: { setProperty: (name: string, value: string) => { rootVariables[name] = value; } },
      },
      querySelector: () => null,
    });
    const yueAccent = activeDivinationThemeStyle.value['--ds-accent'];
    setDivinationTheme('shi');
    expect(activeDivinationThemeStyle.value['--ds-accent']).not.toBe(yueAccent);
    expect(dataset.divinationTheme).toBe('shi');
    expect(rootVariables['--ds-accent']).toBe(activeDivinationThemeStyle.value['--ds-accent']);
  });

  it('已创建的牌组数据也会立即跟随主题切换', () => {
    setDivinationTheme('shi');
    expect(assetPath(getShiyueTarotCard(1)?.imageUrl || '')).toBe('/divination-themes/shi/cards/tarot/000.webp');
    expect(assetPath(getWesternDeck('lenormand')[0]?.imageUrl || '')).toBe('/divination-themes/shi/cards/lenormand/01.webp');
    expect(assetPath(getWesternDeck('shiyue-oracle')[0]?.imageUrl || '')).toBe('/divination-themes/shi/cards/oracle/01.webp');
  });
});
