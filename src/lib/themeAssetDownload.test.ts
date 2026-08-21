import { describe, expect, it } from 'vitest';
import { packageIdForDeck, packageIdForTheme, themeAssetUrl } from './themeAssetDownload';

describe('主题资源下载地址', () => {
  it('相同内容哈希始终生成相同缓存地址', () => {
    expect(themeAssetUrl('/divination-themes/mo/logo.webp', 'abc123'))
      .toBe('https://sydf.cc/divination-themes/mo/logo.webp?asset=abc123');
  });

  it('主题和独立牌组使用不同资源包', () => {
    expect(packageIdForTheme('mo')).toBe('theme:mo');
    expect(packageIdForDeck('gg-bond')).toBe('deck:gg-bond');
  });
});
