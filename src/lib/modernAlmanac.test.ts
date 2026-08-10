import { describe, expect, it } from 'vitest';
import { generateLocalAlmanac } from './almanac';
import { getModernAlmanacHours, getModernAlmanacPersonalNotes } from './modernAlmanac';

describe('现代黄历时段', () => {
  it('只向普通用户推荐可实际使用的日间和晚间时段', () => {
    const result = generateLocalAlmanac({
      mode: 'general',
      topic: 'study-exam',
      startDate: '2026-08-08',
      endDate: '2026-08-08',
    });
    const hours = getModernAlmanacHours(result.days[0]!);

    expect(hours.length).toBeGreaterThan(0);
    expect(hours.length).toBeLessThanOrEqual(4);
    hours.forEach((hour) => {
      const start = Number(hour.range.slice(0, 2));
      expect(start).toBeGreaterThanOrEqual(7);
      expect(start).toBeLessThan(21);
      expect(hour.range).toMatch(/^\d{2}:\d{2}—\d{2}:59$/);
      expect(hour.title.length).toBeGreaterThan(4);
      expect(hour.detail.length).toBeGreaterThan(10);
    });
  });

  it('把个人历中的命理关系转换成可执行的现代提示', () => {
    const result = generateLocalAlmanac({
      mode: 'personal',
      topic: 'custom',
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      profiles: [{
        id: 'profile',
        label: '小林',
        name: '小林',
        gender: 'female',
        dateType: 'solar',
        isLeapMonth: false,
        date: '1990-01-02',
        time: '10:30',
        timeBasis: 'trueSolar',
        locationName: '北京市 东城区',
        latitude: '39.9042',
        longitude: '116.4074',
        timezone: '8',
      }],
    });
    const notes = result.days.flatMap(getModernAlmanacPersonalNotes);

    expect(notes.length).toBeGreaterThan(0);
    expect(notes.length).toBeLessThan(result.days.length);
    expect(notes.every((note) => note.includes('小林'))).toBe(true);
    expect(notes.some((note) => /相冲|相刑|相害|相破/.test(note))).toBe(true);
    expect(notes.some((note) => /签约|协作|沟通|交付/.test(note))).toBe(true);
    expect(notes.every((note) => !note.includes('没有明显冲突') && !note.includes('可以按计划安排'))).toBe(true);
    expect(notes.every((note) => !/候选日|地支|年支|日支|需谨慎/.test(note))).toBe(true);
  });
});
