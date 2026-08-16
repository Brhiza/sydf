import { computed, ref } from 'vue';

export type DivinationThemeGroup =
  | 'brand'
  | 'banner'
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
  visual: DivinationThemeVisual;
}

const themeCssVariableNames = {
  canvas: '--ds-canvas',
  surface: '--ds-surface',
  surfaceRaised: '--ds-surface-raised',
  surfaceMuted: '--ds-surface-muted',
  surfaceOverlay: '--ds-surface-overlay',
  sidebar: '--ds-sidebar',
  topbar: '--ds-topbar',
  textPrimary: '--ds-text-primary',
  textSecondary: '--ds-text-secondary',
  textTertiary: '--ds-text-tertiary',
  line: '--ds-line',
  lineStrong: '--ds-line-strong',
  accent: '--ds-accent',
  accentStrong: '--ds-accent-strong',
  accentSoft: '--ds-accent-soft',
  accentContrast: '--ds-accent-contrast',
  blue: '--ds-blue',
  blueSoft: '--ds-blue-soft',
  plum: '--ds-plum',
  plumSoft: '--ds-plum-soft',
  sage: '--ds-sage',
  sageSoft: '--ds-sage-soft',
  gold: '--ds-gold',
  themeGlow: '--theme-glow',
  themeCanvasStart: '--theme-canvas-start',
  themeCanvasEnd: '--theme-canvas-end',
  themeDot: '--theme-dot',
  themeHeroStart: '--theme-hero-start',
  themeHeroMiddle: '--theme-hero-middle',
  themeHeroEnd: '--theme-hero-end',
  themeShadow: '--theme-shadow',
} as const;

type DivinationThemePalette = {
  [Key in keyof typeof themeCssVariableNames]: readonly [light: string, dark: string];
};

interface DivinationThemeVisual {
  logoPosition: string;
  browserColor: { readonly light: string; readonly dark: string };
  cssVariables: Readonly<Record<string, string>>;
}

function visualTheme(
  logoPosition: string,
  browserColor: DivinationThemeVisual['browserColor'],
  palette: DivinationThemePalette,
): DivinationThemeVisual {
  const cssVariables: Record<string, string> = {};
  for (const key of Object.keys(themeCssVariableNames) as Array<keyof DivinationThemePalette>) {
    const [light, dark] = palette[key];
    cssVariables[themeCssVariableNames[key]] = `light-dark(${light}, ${dark})`;
  }
  return { logoPosition, browserColor, cssVariables };
}

const allGroups: readonly DivinationThemeGroup[] = [
  'brand', 'banner', 'xiaoliuren', 'fortune-status',
  'tarot', 'lenormand', 'oracle', 'hexagrams', 'ssgw',
];

/** 新增主题时只需在这里登记一次；主题编号类型会由本清单自动推导。 */
export const DIVINATION_THEMES = [
  {
    id: 'yue',
    label: '月',
    description: '清雅紫月画风',
    groups: allGroups,
    visual: visualTheme('50% 42%', { light: '#8368ab', dark: '#201e25' }, {
      canvas: ['#f3f2f5', '#1c1a20'], surface: ['#fbfafc', '#242128'],
      surfaceRaised: ['#ffffff', '#2a272f'], surfaceMuted: ['#f0eff3', '#302d35'],
      surfaceOverlay: ['rgba(255,255,255,.96)', 'rgba(38,35,43,.97)'],
      sidebar: ['#eceaf0', '#211f25'], topbar: ['rgba(249,248,250,.9)', 'rgba(29,27,32,.92)'],
      textPrimary: ['#2e2b36', '#eeeaf2'], textSecondary: ['#746f7d', '#bbb4c2'], textTertiary: ['#9b95a3', '#8f8896'],
      line: ['#dfdce4', '#413d46'], lineStrong: ['#cbc6d0', '#55505b'],
      accent: ['#8368ab', '#aa88cc'], accentStrong: ['#694c96', '#c2a3df'], accentSoft: ['#e9e2f2', '#3b3147'], accentContrast: ['#ffffff', '#1d1823'],
      blue: ['#607c96', '#91adc1'], blueSoft: ['#e5edf2', '#293943'],
      plum: ['#956178', '#c994a9'], plumSoft: ['#f1e5ea', '#43303a'],
      sage: ['#637d75', '#91b3aa'], sageSoft: ['#e4ece9', '#2e403b'], gold: ['#a98252', '#d1ad76'],
      themeGlow: ['rgba(138,111,177,.12)', 'rgba(140,107,183,.13)'],
      themeCanvasStart: ['#f7f4fb', '#1c1921'], themeCanvasEnd: ['#efedf4', '#151219'],
      themeDot: ['rgba(105,76,150,.16)', 'rgba(202,177,232,.15)'],
      themeHeroStart: ['#67428f', '#b99ade'], themeHeroMiddle: ['#8b58b1', '#c69be7'], themeHeroEnd: ['#b778cf', '#dda9ed'],
      themeShadow: ['rgba(91,65,132,.24)', 'rgba(0,0,0,.34)'],
    }),
  },
  {
    id: 'shi',
    label: '时',
    description: '明亮粉彩画风',
    groups: allGroups,
    visual: visualTheme('50% 38%', { light: '#d97ca4', dark: '#2b1d24' }, {
      canvas: ['#fff4f8', '#21181d'], surface: ['#fffafd', '#291e24'],
      surfaceRaised: ['#ffffff', '#32242b'], surfaceMuted: ['#faeaf1', '#3b2932'],
      surfaceOverlay: ['rgba(255,250,253,.97)', 'rgba(45,31,39,.97)'],
      sidebar: ['#f8e8f0', '#271b21'], topbar: ['rgba(255,246,250,.92)', 'rgba(34,24,29,.94)'],
      textPrimary: ['#4b3340', '#f5e9ef'], textSecondary: ['#806573', '#ceb4c0'], textTertiary: ['#ad8c9b', '#9e7e8d'],
      line: ['#ebd2dd', '#4e3742'], lineStrong: ['#d9b5c5', '#684754'],
      accent: ['#d97ca4', '#ed9bbb'], accentStrong: ['#a94876', '#ffc0d8'], accentSoft: ['#f8deea', '#4b2c3a'], accentContrast: ['#ffffff', '#24171c'],
      blue: ['#7784ae', '#aab7e2'], blueSoft: ['#e9ebf5', '#30384f'],
      plum: ['#b45e87', '#e49aba'], plumSoft: ['#f7dfe9', '#49303b'],
      sage: ['#6f897b', '#9fc1ae'], sageSoft: ['#e6eee9', '#2d4037'], gold: ['#b6815e', '#e4b28e'],
      themeGlow: ['rgba(235,140,181,.18)', 'rgba(198,91,138,.16)'],
      themeCanvasStart: ['#fff8fb', '#25191f'], themeCanvasEnd: ['#fcecf3', '#171015'],
      themeDot: ['rgba(203,90,139,.17)', 'rgba(244,164,199,.16)'],
      themeHeroStart: ['#a53f70', '#ffafd0'], themeHeroMiddle: ['#d46394', '#f292ba'], themeHeroEnd: ['#ef99bc', '#ffd0df'],
      themeShadow: ['rgba(174,67,116,.24)', 'rgba(0,0,0,.36)'],
    }),
  },
  {
    id: 'mo',
    label: '墨',
    description: '水墨画风',
    inherits: 'yue',
    groups: allGroups,
    visual: visualTheme('50% 50%', { light: '#9a674d', dark: '#24211d' }, {
      canvas: ['#f2eee7', '#1d1b18'], surface: ['#faf7f1', '#25221e'],
      surfaceRaised: ['#fffdf8', '#2e2a25'], surfaceMuted: ['#eee8de', '#36312b'],
      surfaceOverlay: ['rgba(255,253,248,.96)', 'rgba(41,37,32,.97)'],
      sidebar: ['#e9e2d7', '#211e1a'], topbar: ['rgba(248,244,237,.92)', 'rgba(31,28,24,.94)'],
      textPrimary: ['#332e28', '#f0ebe2'], textSecondary: ['#71675d', '#c2b8aa'], textTertiary: ['#9a8e81', '#928679'],
      line: ['#ddd3c5', '#443f37'], lineStrong: ['#c8b9a7', '#5a5247'],
      accent: ['#a46f52', '#c99a78'], accentStrong: ['#744b38', '#e1b998'], accentSoft: ['#eee1d3', '#403329'], accentContrast: ['#ffffff', '#211b17'],
      blue: ['#657b82', '#95afb5'], blueSoft: ['#e1e9e8', '#29383a'],
      plum: ['#895f58', '#c9978c'], plumSoft: ['#eee1dc', '#3f302d'],
      sage: ['#68785f', '#a3b696'], sageSoft: ['#e5e9df', '#30392c'], gold: ['#a47948', '#d3ad78'],
      themeGlow: ['rgba(176,128,78,.14)', 'rgba(166,116,69,.12)'],
      themeCanvasStart: ['#f8f4ec', '#211e1a'], themeCanvasEnd: ['#e9e2d7', '#151411'],
      themeDot: ['rgba(112,79,54,.15)', 'rgba(218,185,145,.13)'],
      themeHeroStart: ['#694738', '#d1aa8e'], themeHeroMiddle: ['#9b684e', '#e0b991'], themeHeroEnd: ['#c18a5d', '#f0cf9f'],
      themeShadow: ['rgba(103,73,52,.22)', 'rgba(0,0,0,.38)'],
    }),
  },
] as const satisfies readonly DivinationThemeDefinitionShape[];

export type DivinationThemeDefinition = (typeof DIVINATION_THEMES)[number];
export type DivinationThemeId = DivinationThemeDefinition['id'];

const THEME_STORAGE_KEY = 'shiyue-divination-theme-v1';
const THEME_ROOT = '/divination-themes';
const SHARED_ASSET_ROOT = '/divination-assets';
// 仅在替换已有主题图片时递增，避免普通代码更新导致整套牌图重新下载。
export const DIVINATION_THEME_ASSET_VERSION = '20260816-optimized-v1';

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
export const activeDivinationThemeStyle = computed(() => activeDivinationTheme.value.visual.cssVariables);
export const activeDivinationThemeLogoPosition = computed(() => activeDivinationTheme.value.visual.logoPosition);

function syncDocumentTheme(themeId: DivinationThemeId) {
  if (typeof document === 'undefined') return;
  const definition = DIVINATION_THEMES.find(theme => theme.id === themeId) || DIVINATION_THEMES[0]!;
  document.documentElement.dataset.divinationTheme = definition.id;
  for (const [name, value] of Object.entries(definition.visual.cssVariables)) {
    document.documentElement.style.setProperty(name, value);
  }
  const lightMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"][media*="light"]');
  const darkMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"][media*="dark"]');
  if (lightMeta) lightMeta.content = definition.visual.browserColor.light;
  if (darkMeta) darkMeta.content = definition.visual.browserColor.dark;
}

export function setDivinationTheme(themeId: DivinationThemeId) {
  if (!isThemeId(themeId)) return;
  activeDivinationThemeId.value = themeId;
  syncDocumentTheme(themeId);
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, themeId);
  } catch {
    // 浏览器禁用本地存储时，主题仍在当前页面会话中生效。
  }
}

syncDocumentTheme(activeDivinationThemeId.value);

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
  const path = `${THEME_ROOT}/${themeId}/${relativePath.replace(/^\/+/, '')}`;
  return `${path}?v=${encodeURIComponent(DIVINATION_THEME_ASSET_VERSION)}`;
}

export function getDivinationBannerUrl() {
  return divinationThemeAssetUrl('banner', 'banner.webp');
}

export function getDivinationThemeLogoUrl() {
  return divinationThemeAssetUrl('brand', 'logo.webp');
}

export function getShengbeiImageUrl(face: 'yang' | 'yin') {
  return `${SHARED_ASSET_ROOT}/ritual/shengbei-${face}.webp?v=${encodeURIComponent(DIVINATION_THEME_ASSET_VERSION)}`;
}

export function getLiuyaoRitualImageUrl(asset: 'coin-heads' | 'coin-tails' | 'shell') {
  return `${SHARED_ASSET_ROOT}/ritual/${asset}.webp?v=${encodeURIComponent(DIVINATION_THEME_ASSET_VERSION)}`;
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
