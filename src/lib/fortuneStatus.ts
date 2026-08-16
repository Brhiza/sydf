import { getFortuneStatusThemeImageUrl } from './divinationTheme';

export type FortuneStatus = '大吉' | '吉' | '小吉' | '平' | '小凶' | '凶' | '大凶';

export interface FortuneStatusMeta {
  label: FortuneStatus;
  tone: 'great' | 'good' | 'slight-good' | 'neutral' | 'slight-bad' | 'bad' | 'great-bad';
}

export const fortuneStatusMeta: Record<FortuneStatus, FortuneStatusMeta> = {
  大吉: { label: '大吉', tone: 'great' },
  吉: { label: '吉', tone: 'good' },
  小吉: { label: '小吉', tone: 'slight-good' },
  平: { label: '平', tone: 'neutral' },
  小凶: { label: '小凶', tone: 'slight-bad' },
  凶: { label: '凶', tone: 'bad' },
  大凶: { label: '大凶', tone: 'great-bad' },
};

const fortuneStatusImageFiles: Record<FortuneStatus, string> = {
  大吉: 'da-ji.webp',
  吉: 'ji.webp',
  小吉: 'xiao-ji.webp',
  平: 'ping.webp',
  小凶: 'xiao-xiong.webp',
  凶: 'xiong.webp',
  大凶: 'da-xiong.webp',
};

export function getFortuneStatusImageUrl(status: FortuneStatus) {
  return getFortuneStatusThemeImageUrl(fortuneStatusImageFiles[status]);
}

export function fortuneStatusFromScore(score: number): FortuneStatus {
  if (score >= 5) return '大吉';
  if (score >= 3) return '吉';
  if (score >= 1) return '小吉';
  if (score === 0) return '平';
  if (score >= -2) return '小凶';
  if (score >= -4) return '凶';
  return '大凶';
}

export function resolveSsgwFortuneStatus(details?: Record<string, string>): FortuneStatus {
  const value = Object.entries(details || {})
    .find(([key]) => key.replace(/\s+/g, '') === '吉凶')?.[1]
    ?.replace(/\s+/g, '') || '';
  if (value.includes('大凶')) return '大凶';
  if (value.includes('小凶')) return '小凶';
  if (value.includes('大吉')) return '大吉';
  if (value.includes('小吉')) return '小吉';
  if (value.includes('凶') || value.includes('下签')) return '凶';
  if (value.includes('吉') || value.includes('上签')) return '吉';
  return '平';
}
