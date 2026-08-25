import { describe, expect, it } from 'vitest';
import { LunarUtil } from 'mingyu-core/calendar';
import { getCalendarEvents } from './calendarEvents';

function labelsFor(dateKey: string) {
  return getCalendarEvents(dateKey).map((event) => event.label);
}

describe('当天节日与纪念日', () => {
  it('节气只出现在交节当天', () => {
    expect(labelsFor('2026-08-22')).not.toContain('处暑');
    expect(labelsFor('2026-08-23')).toContain('处暑');
  });

  it('包含公共节日和重要纪念日', () => {
    expect(labelsFor('2026-10-01')).toContain('国庆节');
    expect(labelsFor('2026-12-13')).toContain('南京大屠杀死难者国家公祭日');
  });

  it('包含常见道教日和三山国王三位国王的圣诞', () => {
    expect(labelsFor('2026-02-25')).toContain('玉皇圣诞');

    const sanshanDates = Array.from({ length: 365 }, (_, index) => {
      const date = new Date(2026, 0, index + 1, 12, 0, 0, 0);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const labels = labelsFor(dateKey);
      return [
        ['大王（巾山国王）圣诞', 2, 25],
        ['二王（明山国王）圣诞', 6, 25],
        ['三王（独山国王）圣诞', 9, 25],
      ].flatMap(([label, month, day]) => labels.includes(String(label)) ? [{ date, month, day }] : []);
    }).flat();

    expect(sanshanDates).toHaveLength(3);
    sanshanDates.forEach(({ date, month, day }) => {
      const lunar = LunarUtil.getLunar(date);
      expect([lunar.monthNumber, lunar.dayNumber]).toEqual([month, day]);
    });
  });

  it('按案例采用的公历或农历匹配生日', () => {
    const events = getCalendarEvents('2026-08-23', [
      { id: 'solar', label: '公历案例', date: '1990-08-23', dateType: 'solar' },
      { id: 'lunar', label: '农历案例', date: '1990-07-11', dateType: 'lunar', isLeapMonth: false },
      { id: 'other', label: '其他案例', date: '1990-08-24', dateType: 'solar' },
    ]);

    expect(events.map((event) => event.label)).toEqual(expect.arrayContaining(['公历案例生日', '农历案例生日']));
    expect(events.map((event) => event.label)).not.toContain('其他案例生日');
  });
});
