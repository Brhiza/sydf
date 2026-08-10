import { describe, expect, it } from 'vitest';
import {
  almanacTopicGroups,
  almanacTopicOptions,
  evaluateAlmanacPurposeDay,
  generateLocalAlmanac,
} from './almanac';

describe('择日事项与分级', () => {
  it('个人择日支持同时核对多位参与人', () => {
    const baseProfile = {
      label: '参与人',
      name: '参与人',
      gender: 'female' as const,
      dateType: 'solar' as const,
      isLeapMonth: false,
      time: '10:30',
      timeBasis: 'trueSolar' as const,
      locationName: '北京市 东城区',
      latitude: '39.9042',
      longitude: '116.4074',
      timezone: '8',
    };
    const result = generateLocalAlmanac({
      mode: 'personal',
      topic: 'marriage-wedding',
      startDate: '2026-08-08',
      endDate: '2026-08-12',
      profiles: [
        { ...baseProfile, id: 'first', name: '甲', date: '1990-01-02' },
        { ...baseProfile, id: 'second', name: '乙', date: '1992-03-04', gender: 'male' },
      ],
    });

    expect(result.participants).toHaveLength(2);
    expect(result.participants.map((item) => item.name)).toEqual(['甲', '乙']);
  });

  it('提供分组且不重复的细分事项', () => {
    expect(almanacTopicGroups.length).toBeGreaterThanOrEqual(10);
    expect(almanacTopicOptions.length).toBeGreaterThanOrEqual(40);
    expect(new Set(almanacTopicOptions.map((item) => item.value)).size).toBe(almanacTopicOptions.length);
    expect(almanacTopicOptions.every((item) => item.keywords.length > 0)).toBe(true);
  });

  it('包含普通用户熟悉的现代事项', () => {
    const labels = new Set(almanacTopicOptions.map((item) => item.label));
    expect(['求职面试', '产品或网站上线', '买房签约', '购车提车', '办公室搬迁', '体检复查']
      .every((label) => labels.has(label))).toBe(true);
  });

  it('现代事项同样按明确宜项给出可用日期', () => {
    const result = generateLocalAlmanac({
      mode: 'general',
      topic: 'career-interview',
      startDate: '2026-08-08',
      endDate: '2026-09-07',
    });
    const usable = result.days
      .map((day) => evaluateAlmanacPurposeDay(result, day, 'career-interview'))
      .filter((item) => item.usable);

    expect(usable.length).toBeGreaterThan(0);
    expect(usable.every((item) => item.matchedRecommends.some((value) => ['雇佣', '会亲友'].includes(value)))).toBe(true);
    expect(usable.every((item) => item.reason.includes('条件'))).toBe(true);
    expect(usable.every((item) => !['求职面试', '对应的传统宜项', '雇佣', '会亲友'].some((text) => item.reason.includes(text)))).toBe(true);
  });

  it('只把有明确宜项且没有强限制的日期列为可用', () => {
    const result = generateLocalAlmanac({
      mode: 'general',
      topic: 'marriage-wedding',
      startDate: '2026-08-08',
      endDate: '2026-09-07',
    });
    const evaluations = result.days.map((day) => evaluateAlmanacPurposeDay(result, day, 'marriage-wedding'));
    const usable = evaluations.filter((item) => item.usable);

    expect(usable.length).toBeGreaterThan(0);
    expect(usable.length).toBeLessThan(result.days.length);
    expect(usable.every((item) => item.matchedRecommends.length > 0 && item.matchedAvoids.length === 0)).toBe(true);
    expect(usable.every((item) => ['大吉', '吉', '小吉'].includes(item.level))).toBe(true);
    expect(new Set(usable.map((item) => item.level)).size).toBeGreaterThan(1);
  });

  it('按具体事项匹配宜忌，不用宽泛父类替代', () => {
    const result = generateLocalAlmanac({
      mode: 'general',
      topic: 'move-entry',
      startDate: '2026-08-08',
      endDate: '2026-09-07',
    });
    const usable = result.days
      .map((day) => evaluateAlmanacPurposeDay(result, day, 'move-entry'))
      .filter((item) => item.usable);

    expect(usable.length).toBeGreaterThan(0);
    expect(usable.every((item) => item.matchedRecommends.every((value) => value.includes('入宅')))).toBe(true);
  });
});
