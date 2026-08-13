import type { WesternCardResult, WesternDeckType, WesternSpreadType } from './tarot';
import { LENORMAND_CARDS, LENORMAND_SPREADS } from 'mingyu-core/divination/lenormand';
import { SHIYUE_ORACLE_CARDS } from './shiyueOracle';

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

const lenormandFileNames = [
  '01_骑士.png', '02_四叶草.png', '03_船.png', '04_房屋.png', '05_树.png', '06_云.png',
  '07_蛇.png', '08_棺材.png', '09_花束.png', '10_镰刀.png', '11_鞭子.png', '12_鸟.png',
  '13_孩子.png', '14_狐狸.png', '15_熊.png', '16_星星.png', '17_鹳.png', '18_狗.png',
  '19_高塔.png', '20_花园.png', '21_山.png', '22_道路.png', '23_老鼠.png', '24_心.png',
  '25_戒指.png', '26_书.png', '27_信.png', '28_男士.png', '29_女士.png', '30_百合.png',
  '31_太阳.png', '32_月亮.png', '33_钥匙.png', '34_鱼.png', '35_锚.png', '36_十字架.png',
] as const;

const publicCardUrl = (deck: 'lenormand' | 'shiyue-oracle', fileName: string) =>
  `/cards/${deck}/${encodeURIComponent(fileName)}`;

export function getLenormandImageUrl(id: number) {
  const fileName = lenormandFileNames[id - 1];
  return fileName
    ? publicCardUrl('lenormand', fileName)
    : '';
}

export const lenormandDeck: readonly WesternCardResult[] = LENORMAND_CARDS.map(card => ({
  ...card,
  position: '',
  reversed: false,
  imageUrl: getLenormandImageUrl(card.id),
}));

export const shiyueOracleDeck: readonly WesternCardResult[] = SHIYUE_ORACLE_CARDS.map(({ ganzhi, title, nayin, meaning, guidance }, index) => {
  const id = index + 1;
  const fileName = `${String(id).padStart(2, '0')}_${ganzhi}_${title}_${nayin}.png`;
  return {
    id,
    name: `${ganzhi} · ${title}`,
    subtitle: nayin,
    position: '当下指引',
    reversed: false,
    keywords: [ganzhi, title, nayin],
    meaning,
    guidance,
    imageUrl: publicCardUrl('shiyue-oracle', fileName),
  };
});

export function drawShiyueOracleCard() {
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  return shiyueOracleDeck[random[0]! % shiyueOracleDeck.length]!;
}

export function getWesternDeck(deckType: Exclude<WesternDeckType, 'tarot'>) {
  return deckType === 'lenormand' ? lenormandDeck : shiyueOracleDeck;
}
