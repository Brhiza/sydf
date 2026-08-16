import { getNumberedThemeCardImageUrl } from './divinationTheme';

export function getSsgwCardImageUrl(signNumber: number) {
  return getNumberedThemeCardImageUrl('ssgw', signNumber);
}

export function getHexagramCardImageUrl(hexagramNumber: number) {
  return getNumberedThemeCardImageUrl('hexagrams', hexagramNumber);
}
