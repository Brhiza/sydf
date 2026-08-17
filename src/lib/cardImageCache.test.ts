import { describe, expect, it } from 'vitest';
import { getActiveCardImageWarmupUrls } from './cardImageCache';

function assetPath(url: string) {
  return url.split('?')[0];
}

describe('全部牌面后台缓存', () => {
  it('覆盖当前主题的全部牌面且没有重复地址', () => {
    const urls = getActiveCardImageWarmupUrls();
    expect(urls).toHaveLength(331);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls.map(assetPath)).toContain('/divination-themes/yue/cards/tarot/back.webp');
    expect(urls.map(assetPath)).toContain('/divination-themes/yue/cards/tarot/077.webp');
    expect(urls.map(assetPath)).toContain('/divination-themes/yue/cards/lenormand/36.webp');
    expect(urls.map(assetPath)).toContain('/divination-themes/yue/cards/oracle/60.webp');
    expect(urls.map(assetPath)).toContain('/divination-themes/yue/cards/hexagrams/64.webp');
    expect(urls.map(assetPath)).toContain('/divination-themes/yue/cards/ssgw/92.webp');
  });
});
