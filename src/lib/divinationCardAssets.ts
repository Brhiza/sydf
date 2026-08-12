function numberedCardUrl(folder: 'ssgw' | 'hexagrams', number: number, total: number) {
  const normalized = Number.isInteger(number) && number >= 1 && number <= total ? number : 1;
  return `/cards/${folder}/${String(normalized).padStart(2, '0')}.webp`;
}

export function getSsgwCardImageUrl(signNumber: number) {
  return numberedCardUrl('ssgw', signNumber, 92);
}

export function getHexagramCardImageUrl(hexagramNumber: number) {
  return numberedCardUrl('hexagrams', hexagramNumber, 64);
}
