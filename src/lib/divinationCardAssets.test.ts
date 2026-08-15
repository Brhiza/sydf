import { describe, expect, it } from 'vitest';
import { getHexagramCardImageUrl, getSsgwCardImageUrl } from './divinationCardAssets';

describe('传统占卜卡图映射', () => {
  it('按签号映射九十二灵签卡图', () => {
    expect(getSsgwCardImageUrl(1)).toBe('/divination-themes/yue/cards/ssgw/01.webp');
    expect(getSsgwCardImageUrl(92)).toBe('/divination-themes/yue/cards/ssgw/92.webp');
  });

  it('按周易卦序映射六十四卦卡图', () => {
    expect(getHexagramCardImageUrl(1)).toBe('/divination-themes/yue/cards/hexagrams/01.webp');
    expect(getHexagramCardImageUrl(64)).toBe('/divination-themes/yue/cards/hexagrams/64.webp');
  });
});
