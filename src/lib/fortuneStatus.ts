export type FortuneStatus = '大吉' | '吉' | '小吉' | '平' | '小凶' | '凶' | '大凶';

export interface FortuneStatusMeta {
  label: FortuneStatus;
  image: string;
  tone: 'great' | 'good' | 'slight-good' | 'neutral' | 'slight-bad' | 'bad' | 'great-bad';
}

export const fortuneStatusMeta: Record<FortuneStatus, FortuneStatusMeta> = {
  大吉: { label: '大吉', image: '/fortune-status/da-ji.png', tone: 'great' },
  吉: { label: '吉', image: '/fortune-status/ji.png', tone: 'good' },
  小吉: { label: '小吉', image: '/fortune-status/xiao-ji.png', tone: 'slight-good' },
  平: { label: '平', image: '/fortune-status/ping.png', tone: 'neutral' },
  小凶: { label: '小凶', image: '/fortune-status/xiao-xiong.png', tone: 'slight-bad' },
  凶: { label: '凶', image: '/fortune-status/xiong.png', tone: 'bad' },
  大凶: { label: '大凶', image: '/fortune-status/da-xiong.png', tone: 'great-bad' },
};

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
