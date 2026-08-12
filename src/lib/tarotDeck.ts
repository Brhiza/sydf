const traditionalNames = [
  '愚者', '魔术师', '女祭司', '皇后', '皇帝', '教皇', '恋人', '战车', '力量', '隐者', '命运之轮',
  '正义', '倒吊人', '死神', '节制', '恶魔', '高塔', '星星', '月亮', '太阳', '审判', '世界',
  '权杖一', '权杖二', '权杖三', '权杖四', '权杖五', '权杖六', '权杖七', '权杖八', '权杖九', '权杖十', '权杖侍者', '权杖骑士', '权杖王后', '权杖国王',
  '圣杯一', '圣杯二', '圣杯三', '圣杯四', '圣杯五', '圣杯六', '圣杯七', '圣杯八', '圣杯九', '圣杯十', '圣杯侍者', '圣杯骑士', '圣杯王后', '圣杯国王',
  '宝剑一', '宝剑二', '宝剑三', '宝剑四', '宝剑五', '宝剑六', '宝剑七', '宝剑八', '宝剑九', '宝剑十', '宝剑侍者', '宝剑骑士', '宝剑王后', '宝剑国王',
  '星币一', '星币二', '星币三', '星币四', '星币五', '星币六', '星币七', '星币八', '星币九', '星币十', '星币侍者', '星币骑士', '星币王后', '星币国王',
] as const;

const shiyueNames = [
  '随云启程', '灵机在握', '月下玄知', '万物丰生', '天阙定疆', '传灯承道', '两心缔缘', '御风前行', '柔心驭兽', '孤灯寻真', '命轮流转',
  '天衡昭正', '倒悬悟道', '蝶蜕新生', '阴阳调和', '欲念成缚', '惊雷破阁', '星河赐愿', '月影迷津', '曦光普照', '天音唤醒', '四海归圆',
  '灵焰初燃', '登楼望野', '云帆启程', '华灯同庆', '群英竞辉', '凯歌荣归', '据峰而守', '流火传讯', '历战持关', '负薪远行', '探火灵童', '驰焰行者', '丹凰御火', '炎君执杖',
  '心泉初涌', '双盏同心', '花宴同欢', '临盏倦心', '空盏惜流', '莲庭旧梦', '幻莲千境', '辞盏远行', '心愿得偿', '阖家承欢', '捧露灵童', '献月使者', '澄心月主', '沧海怀仁',
  '月刃破晓', '闭目持衡', '心雨成伤', '松风止息', '争锋失和', '轻舟渡霭', '月下潜行', '缚丝困身', '长夜忧思', '万刃终局', '听风灵童', '逐电剑使', '霜华明断', '玄刃裁决',
  '天赐玉璧', '双璧回环', '众匠共筑', '怀璧固守', '雪夜寒门', '分玉施恩', '静候花实', '匠心琢玉', '兰庭自足', '世代承泽', '寻玉灵童', '躬耕守成', '厚土养华', '山河丰藏',
] as const;

export interface ShiyueTarotCard {
  /** 牌组内部沿用 mingyu-core 的 1–78 编号。 */
  coreId: number;
  /** 牌面遵循传统顺序：愚者为 0，世界为 21。 */
  traditionalNumber: number;
  traditionalName: string;
  shiyueName: string;
  imageUrl: string;
}

const shiyueTarotAssetRoot = '/cards/tarot';

export const tarotCardBackUrl = `${shiyueTarotAssetRoot}/牌背.webp`;

export const shiyueTarotDeck: readonly ShiyueTarotCard[] = traditionalNames.map((traditionalName, index) => ({
  coreId: index + 1,
  traditionalNumber: index,
  traditionalName,
  shiyueName: shiyueNames[index]!,
  imageUrl: `${shiyueTarotAssetRoot}/${String(index).padStart(3, '0')}-${traditionalName}-${shiyueNames[index]}.webp`,
}));

export function getShiyueTarotCard(coreId: number) {
  return shiyueTarotDeck[coreId - 1];
}

export function getShiyueTarotName(coreId: number) {
  const card = getShiyueTarotCard(coreId);
  return card ? `${card.traditionalName} · ${card.shiyueName}` : '';
}
