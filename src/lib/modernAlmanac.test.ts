import { describe, expect, it } from 'vitest';
import { generateLocalAlmanac } from './almanac';
import {
  findUnmappedAlmanacTerms,
  getModernAlmanacForDate,
  getModernAlmanacHours,
  getModernAlmanacPersonalNotes,
} from './modernAlmanac';

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

  it('同一天的关系与家庭计划合并展示，不重复占用两行', () => {
    const result = getModernAlmanacForDate('2026-08-26');
    expect(result).toBeTruthy();
    const relationshipItems = result!.recommended.filter((item) => item.theme === 'relationship');
    expect(relationshipItems).toHaveLength(1);
    expect(relationshipItems[0]).toMatchObject({ title: '关系与家庭计划' });
    expect(relationshipItems[0]?.detail).toMatch(/关系、生育、育儿与长期照护/);
    expect(relationshipItems[0]?.traditional).toContain('求嗣');
    const memorialItems = result!.recommended.filter((item) => item.key === 'ritual' || item.key === 'memorial');
    expect(memorialItems).toHaveLength(1);
    expect(memorialItems[0]?.detail).toMatch(/家属、服务机构、当地规定与习俗/);
    const homeItems = result!.cautious.filter((item) => item.key === 'home' || item.key === 'construction');
    expect(homeItems).toHaveLength(1);
    expect(homeItems[0]?.detail).toMatch(/方案、人员、许可和现场安全/);
  });

  it('全年传统事项都有具体的现代解释，不退回低信息兜底', () => {
    const ranges = [
      ['2026-01-01', '2026-04-30'],
      ['2026-05-01', '2026-08-31'],
      ['2026-09-01', '2026-12-31'],
    ] as const;
    const terms = ranges.flatMap(([startDate, endDate]) => generateLocalAlmanac({
      mode: 'general',
      topic: 'custom',
      startDate,
      endDate,
    }).days.flatMap((day) => [...day.recommends, ...day.avoids]));
    expect(findUnmappedAlmanacTerms(terms)).toEqual([]);
  });
});
