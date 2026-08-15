import { computed, ref } from 'vue';

export type DivinationThemeGroup =
  | 'banner'
  | 'shengbei'
  | 'liuyao'
  | 'xiaoliuren'
  | 'fortune-status'
  | 'tarot'
  | 'lenormand'
  | 'oracle'
  | 'hexagrams'
  | 'ssgw';

interface DivinationThemeDefinitionShape {
  id: string;
  label: string;
  description: string;
  inherits?: string;
  groups: readonly DivinationThemeGroup[];
}

const allGroups: readonly DivinationThemeGroup[] = [
  'banner', 'shengbei', 'liuyao', 'xiaoliuren', 'fortune-status',
  'tarot', 'lenormand', 'oracle', 'hexagrams', 'ssgw',
];

/** 新增主题时只需在这里登记一次；主题编号类型会由本清单自动推导。 */
export const DIVINATION_THEMES = [
  { id: 'yue', label: '月', description: '清雅紫月画风', groups: allGroups },
  { id: 'shi', label: '时', description: '明亮粉彩画风', groups: allGroups },
  {
    id: 'mo',
    label: '墨',
    description: '水墨画风，未补齐的图片沿用月主题',
    inherits: 'yue',
    groups: ['xiaoliuren', 'fortune-status'],
  },
] as const satisfies readonly DivinationThemeDefinitionShape[];

export type DivinationThemeDefinition = (typeof DIVINATION_THEMES)[number];
export type DivinationThemeId = DivinationThemeDefinition['id'];

const THEME_STORAGE_KEY = 'shiyue-divination-theme-v1';
const THEME_ROOT = '/divination-themes';

function isThemeId(value: unknown): value is DivinationThemeId {
  return DIVINATION_THEMES.some(theme => theme.id === value);
}

function initialTheme(): DivinationThemeId {
  if (typeof window === 'undefined') return 'yue';
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeId(stored) ? stored : 'yue';
  } catch {
    return 'yue';
  }
}

export const activeDivinationThemeId = ref<DivinationThemeId>(initialTheme());
export const activeDivinationTheme = computed(() => (
  DIVINATION_THEMES.find(theme => theme.id === activeDivinationThemeId.value) || DIVINATION_THEMES[0]!
));
export const activeDivinationThemeLabel = computed(() => activeDivinationTheme.value.label);

export function setDivinationTheme(themeId: DivinationThemeId) {
  if (!isThemeId(themeId)) return;
  activeDivinationThemeId.value = themeId;
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, themeId);
  } catch {
    // 浏览器禁用本地存储时，主题仍在当前页面会话中生效。
  }
}

export function resolveDivinationThemeId(
  group: DivinationThemeGroup,
  requestedThemeId: DivinationThemeId = activeDivinationThemeId.value,
): DivinationThemeId {
  const visited = new Set<DivinationThemeId>();
  let themeId: DivinationThemeId | undefined = requestedThemeId;
  while (themeId && !visited.has(themeId)) {
    visited.add(themeId);
    const definition = DIVINATION_THEMES.find(theme => theme.id === themeId);
    if (!definition) break;
    if ((definition.groups as readonly DivinationThemeGroup[]).includes(group)) return definition.id;
    const inheritedThemeId = 'inherits' in definition ? definition.inherits : undefined;
    themeId = isThemeId(inheritedThemeId) ? inheritedThemeId : undefined;
  }
  return 'yue';
}

export function divinationThemeAssetUrl(group: DivinationThemeGroup, relativePath: string) {
  const themeId = resolveDivinationThemeId(group);
  return `${THEME_ROOT}/${themeId}/${relativePath.replace(/^\/+/, '')}`;
}

export function getDivinationBannerUrl() {
  return divinationThemeAssetUrl('banner', 'banner.webp');
}

export function getShengbeiImageUrl(face: 'yang' | 'yin') {
  return divinationThemeAssetUrl('shengbei', `ritual/shengbei-${face}.webp`);
}

export function getLiuyaoRitualImageUrl(asset: 'coin-heads' | 'coin-tails' | 'shell') {
  return divinationThemeAssetUrl('liuyao', `ritual/${asset}.webp`);
}

export function getXiaoliurenThemeImageUrl(fileName: string) {
  return divinationThemeAssetUrl('xiaoliuren', `xiaoliuren/${fileName}`);
}

export function getFortuneStatusThemeImageUrl(fileName: string) {
  return divinationThemeAssetUrl('fortune-status', `fortune-status/${fileName}`);
}

export function getTarotThemeImageUrl(traditionalNumber: number) {
  const normalized = Number.isInteger(traditionalNumber) && traditionalNumber >= 0 && traditionalNumber <= 77
    ? traditionalNumber
    : 0;
  return divinationThemeAssetUrl('tarot', `cards/tarot/${String(normalized).padStart(3, '0')}.webp`);
}

export function getTarotCardBackUrl() {
  return divinationThemeAssetUrl('tarot', 'cards/tarot/back.webp');
}

export function getWesternThemeCardImageUrl(deck: 'lenormand' | 'oracle', id: number) {
  const max = deck === 'lenormand' ? 36 : 60;
  if (!Number.isInteger(id) || id < 1 || id > max) return '';
  return divinationThemeAssetUrl(deck, `cards/${deck}/${String(id).padStart(2, '0')}.webp`);
}

export function getNumberedThemeCardImageUrl(group: 'hexagrams' | 'ssgw', number: number) {
  const max = group === 'hexagrams' ? 64 : 92;
  const normalized = Number.isInteger(number) && number >= 1 && number <= max ? number : 1;
  return divinationThemeAssetUrl(group, `cards/${group}/${String(normalized).padStart(2, '0')}.webp`);
}
