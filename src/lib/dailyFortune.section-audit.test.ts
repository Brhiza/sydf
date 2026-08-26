import { describe, expect, it } from 'vitest';
import { generateDailyFortune, type DailyFortuneProfile, type FortunePeriod } from './dailyFortune';

const profiles: Array<DailyFortuneProfile | undefined> = [
  undefined,
  {
    id: 'section-a', label: '区块甲', name: '区块甲', gender: 'female',
    date: '1990-05-18', dateType: 'solar', isLeapMonth: false,
    time: '08:30', timeBasis: 'clock', locationName: '北京市',
    latitude: '39.9042', longitude: '116.4074', timezone: '8',
  },
  {
    id: 'section-b', label: '区块乙', name: '区块乙', gender: 'male',
    date: '1985-11-03', dateType: 'solar', isLeapMonth: false,
    time: '21:15', timeBasis: 'clock', locationName: '广州市',
    latitude: '23.1291', longitude: '113.2644', timezone: '8',
  },
];

function normalize(value: string) {
  return value
    .replace(/(?:公历)?\d{4}年\d{1,2}月\d{1,2}日(?:—\d{1,2}月\d{1,2}日)?/g, '')
    .replace(/\d{1,2}月\d{1,2}日(?:—\d{1,2}日)?/g, '')
    .replace(/\d{1,2}:\d{2}—\d{1,2}:\d{2}/g, '')
    .replace(/[（(]周[一二三四五六日][)）]/g, '')
    .replace(/[，。；：、\s]/g, '');
}

function grams(value: string, size = 8) {
  const text = normalize(value);
  return new Set(Array.from({ length: Math.max(0, text.length - size + 1) }, (_, index) => text.slice(index, index + size)));
}

describe('运势区块职责审计', () => {
  it('行动、分项和依据不再复述同一段处理办法', () => {
    const dates = [new Date(2026, 0, 15, 12), new Date(2026, 7, 26, 12)];
    const periods: FortunePeriod[] = ['today', 'month', 'year'];
    const reports = profiles.flatMap((profile, profileIndex) => dates.flatMap((date) => periods.flatMap((period) => {
      const result = generateDailyFortune(date, profile, period, date);
      const sections = [
        ...result.actionTips.map((item, index) => ({ key: `action-${index}`, role: 'action', sourceKey: item.sourceKey, text: item.text })),
        ...result.evidenceInsights.map((item) => ({ key: `evidence-${item.key}`, role: 'evidence', sourceKey: item.sourceKey, text: item.detail })),
        ...result.categories.flatMap((item) => [
          { key: `category-${item.key}-detail`, role: 'category-detail', sourceKey: item.key, text: item.detail },
          { key: `category-${item.key}-basis`, role: 'category-basis', sourceKey: item.key, text: item.basis },
        ]).filter((item) => item.text),
      ];
      const cautionSourceKey = result.evidenceInsights.find((item) => item.key === 'caution')?.sourceKey;
      const cautionCategory = result.categories.find((item) => item.key === cautionSourceKey && item.tone !== 'favorable');
      if (cautionCategory) {
        expect(cautionCategory.detail).not.toMatch(/必须先把|仍有缺口时|等.+明确后再承诺或推进/);
        expect(cautionCategory.detail).toMatch(/收尾|进度|恢复|作息/);
      }
      const overlaps = sections.flatMap((left, leftIndex) => sections.slice(leftIndex + 1).flatMap((right) => {
        const roles = new Set([left.role, right.role]);
        const shouldCompare = roles.has('action') && (roles.has('category-detail') || roles.has('category-basis'))
          || roles.has('category-detail') && roles.has('category-basis') && left.sourceKey === right.sourceKey
          || roles.has('evidence') && (roles.has('category-detail') || roles.has('category-basis'))
            && (!left.sourceKey || !right.sourceKey || left.sourceKey === right.sourceKey || left.key === 'evidence-personal' || right.key === 'evidence-personal');
        if (!shouldCompare) return [];
        const leftGrams = grams(left.text);
        const shared = [...leftGrams].filter((item) => grams(right.text).has(item));
        return shared.length >= 4 ? [{ left: left.key, right: right.key, sample: shared[0], count: shared.length }] : [];
      })).sort((left, right) => right.count - left.count);
      return overlaps.length ? [{ profileIndex, date: date.toISOString().slice(0, 10), period, overlaps }] : [];
    })));
    expect(reports, JSON.stringify(reports)).toEqual([]);
  }, 60_000);
});
