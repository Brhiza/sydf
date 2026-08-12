import type { WesternCardResult } from './tarot';

const lenormandFileNames = [
  '01_骑士.png', '02_四叶草.png', '03_船.png', '04_房屋.png', '05_树.png', '06_云.png',
  '07_蛇.png', '08_棺材.png', '09_花束.png', '10_镰刀.png', '11_鞭子.png', '12_鸟.png',
  '13_孩子.png', '14_狐狸.png', '15_熊.png', '16_星星.png', '17_鹳.png', '18_狗.png',
  '19_高塔.png', '20_花园.png', '21_山.png', '22_道路.png', '23_老鼠.png', '24_心.png',
  '25_戒指.png', '26_书.png', '27_信.png', '28_男士.png', '29_女士.png', '30_百合.png',
  '31_太阳.png', '32_月亮.png', '33_钥匙.png', '34_鱼.png', '35_锚.png', '36_十字架.png',
] as const;

const shiyueOracleCards = [
  ['甲子', '海藏新生', '海中金'], ['乙丑', '厚土藏珍', '海中金'], ['丙寅', '炉火初燃', '炉中火'], ['丁卯', '心焰成光', '炉中火'],
  ['戊辰', '万木参天', '大林木'], ['己巳', '林深养息', '大林木'], ['庚午', '路土承行', '路旁土'], ['辛未', '稳步成途', '路旁土'],
  ['壬申', '剑锋破障', '剑锋金'], ['癸酉', '淬炼成器', '剑锋金'], ['甲戌', '山火照途', '山头火'], ['乙亥', '星火燎原', '山头火'],
  ['丙子', '涧水初鸣', '涧下水'], ['丁丑', '静流润物', '涧下水'], ['戊寅', '城垣初筑', '城头土'], ['己卯', '守土安家', '城头土'],
  ['庚辰', '蜡金待琢', '白蜡金'], ['辛巳', '纯光成形', '白蜡金'], ['壬午', '柳随风起', '杨柳木'], ['癸未', '柔木成荫', '杨柳木'],
  ['甲申', '泉眼觉醒', '泉中水'], ['乙酉', '清泉映心', '泉中水'], ['丙戌', '屋土庇护', '屋上土'], ['丁亥', '家园成景', '屋上土'],
  ['戊子', '惊雷破夜', '霹雳火'], ['己丑', '雷火新生', '霹雳火'], ['庚寅', '松骨凌云', '松柏木'], ['辛卯', '柏心长青', '松柏木'],
  ['壬辰', '长河开运', '长流水'], ['癸巳', '流水不息', '长流水'], ['甲午', '沙里淘光', '沙中金'], ['乙未', '细沙聚金', '沙中金'],
  ['丙申', '山火炼心', '山下火'], ['丁酉', '灯火归巢', '山下火'], ['戊戌', '平野生林', '平地木'], ['己亥', '众木成森', '平地木'],
  ['庚子', '壁土初固', '壁上土'], ['辛丑', '坚壁守成', '壁上土'], ['壬寅', '金箔点睛', '金箔金'], ['癸卯', '金辉映月', '金箔金'],
  ['甲辰', '灯启长明', '覆灯火'], ['乙巳', '守灯传光', '覆灯火'], ['丙午', '天河倾辉', '天河水'], ['丁未', '星雨润心', '天河水'],
  ['戊申', '驿路通达', '大驿土'], ['己酉', '厚土载途', '大驿土'], ['庚戌', '金钗定约', '钗钏金'], ['辛亥', '玉环相合', '钗钏金'],
  ['壬子', '桑叶育梦', '桑柘木'], ['癸丑', '柘丝成锦', '桑柘木'], ['甲寅', '溪开万壑', '大溪水'], ['乙卯', '清溪择向', '大溪水'],
  ['丙辰', '沙土塑基', '沙中土'], ['丁巳', '聚沙成塔', '沙中土'], ['戊午', '天火耀世', '天上火'], ['己未', '日光普照', '天上火'],
  ['庚申', '榴木破壳', '石榴木'], ['辛酉', '丹实盈枝', '石榴木'], ['壬戌', '海纳百川', '大海水'], ['癸亥', '沧海归一', '大海水'],
] as const;

const publicAssetUrl = (directory: string, subdirectory: string, fileName: string) =>
  `/${encodeURIComponent(directory)}/${encodeURIComponent(subdirectory)}/${encodeURIComponent(fileName)}`;

export function getLenormandImageUrl(id: number) {
  const fileName = lenormandFileNames[id - 1];
  return fileName
    ? publicAssetUrl('时月雷诺曼_Q版卡牌_36张', '时月雷诺曼_Q版卡牌_命名版', fileName)
    : '';
}

export const shiyueOracleDeck: readonly WesternCardResult[] = shiyueOracleCards.map(([ganzhi, title, nayin], index) => {
  const id = index + 1;
  const fileName = `${String(id).padStart(2, '0')}_${ganzhi}_${title}_${nayin}.png`;
  return {
    id,
    name: `${ganzhi} · ${title}`,
    subtitle: nayin,
    position: '当下指引',
    reversed: false,
    keywords: [ganzhi, title, nayin],
    imageUrl: publicAssetUrl('时月六十甲子神谕卡_Q版_60张', '时月六十甲子神谕卡_Q版_命名版', fileName),
  };
});

export function drawShiyueOracleCard() {
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  return shiyueOracleDeck[random[0]! % shiyueOracleDeck.length]!;
}
