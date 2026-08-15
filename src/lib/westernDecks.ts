import type { WesternCardResult, WesternDeckType, WesternSpreadType } from './tarot';
import { LENORMAND_CARDS, LENORMAND_SPREADS } from 'mingyu-core/divination/lenormand';
import { SHI_ORACLE_CARDS, SHIYUE_ORACLE_CARDS } from './shiyueOracle';
import { getWesternThemeCardImageUrl, resolveDivinationThemeId } from './divinationTheme';

export interface WesternSpreadOption {
  value: WesternSpreadType;
  label: string;
  count: number;
  description: string;
  positions: string[];
}

const oracleSpreads: Partial<Record<WesternSpreadType, { name: string; positions: string[] }>> = {
  single: { name: '单牌神谕', positions: ['当下指引'] },
  three: { name: '三牌时间流', positions: ['过往根源', '当下课题', '后续指引'] },
};

const spreadDescriptions: Record<WesternSpreadType, string> = {
  single: '聚焦当下最重要的线索', three: '梳理起因、现状与走向', five: '从五个位置看完整进展',
  relationship: '看双方状态与关系走向', decision: '比较两种选择的后续发展', nine: '以中心牌为主轴观察全局',
};

export function getWesternSpreadOptions(deckType: Exclude<WesternDeckType, 'tarot'>): WesternSpreadOption[] {
  const values: WesternSpreadType[] = deckType === 'lenormand'
    ? ['single', 'three', 'five', 'relationship', 'decision', 'nine']
    : ['single', 'three'];
  return values.map((value) => {
    const spread = deckType === 'lenormand' ? LENORMAND_SPREADS[value] : oracleSpreads[value]!;
    return { value, label: spread.name, count: spread.positions.length, description: spreadDescriptions[value], positions: [...spread.positions] };
  });
}

const lenormandShiyueNames = [
  '云使传讯', '幸运初绽', '远帆启程', '灯火归心', '根深长青', '迷雾未明',
  '曲径藏机', '旧章终结', '花信赐福', '一刃决断', '回响交锋', '双语纷飞',
  '新芽初生', '慧眼谋局', '厚力守护', '星途指引', '迁变新生', '忠伴同行',
  '独立远观', '众缘相逢', '重岭阻途', '岔路择行', '暗耗渐侵', '真情相契',
  '缔约成环', '秘卷待启', '书信将至', '君影入局', '卿影入局', '静雅长宁',
  '曦光盛放', '月辉映心', '灵钥开门', '丰流汇聚', '定锚守成', '命题承重',
] as const;

export function getLenormandImageUrl(id: number) {
  return getWesternThemeCardImageUrl('lenormand', id);
}

export const lenormandDeck: readonly WesternCardResult[] = LENORMAND_CARDS.map((card, index) => ({
  ...card,
  subtitle: lenormandShiyueNames[index],
  position: '',
  reversed: false,
  get imageUrl() {
    return getLenormandImageUrl(card.id);
  },
}));

export const shiyueOracleDeck: readonly WesternCardResult[] = SHIYUE_ORACLE_CARDS.map(({ ganzhi, title, nayin, meaning, guidance }, index) => {
  const id = index + 1;
  return {
    id,
    name: title,
    subtitle: `${ganzhi} · ${nayin}`,
    position: '当下指引',
    reversed: false,
    keywords: [ganzhi, title, nayin],
    meaning,
    guidance,
    get imageUrl() {
      return getWesternThemeCardImageUrl('oracle', id);
    },
  };
});

export const shiOracleDeck: readonly WesternCardResult[] = SHI_ORACLE_CARDS.map(({ title, category }, index) => {
  const id = index + 1;
  return {
    id,
    name: title,
    subtitle: category,
    position: '当下指引',
    reversed: false,
    keywords: [category, title],
    get imageUrl() {
      return getWesternThemeCardImageUrl('oracle', id);
    },
  };
});

function getShiyueOracleDeck() {
  return resolveDivinationThemeId('oracle') === 'shi' ? shiOracleDeck : shiyueOracleDeck;
}

export function getWesternCardImageUrl(deckType: Exclude<WesternDeckType, 'tarot'>, id: number) {
  return getWesternThemeCardImageUrl(deckType === 'lenormand' ? 'lenormand' : 'oracle', id);
}

export function drawShiyueOracleCard() {
  const deck = getShiyueOracleDeck();
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  return deck[random[0]! % deck.length]!;
}

export function getWesternDeck(deckType: Exclude<WesternDeckType, 'tarot'>) {
  return deckType === 'lenormand' ? lenormandDeck : getShiyueOracleDeck();
}
