import { describe, expect, it } from 'vitest';
import { formatBirthDateTimeInput, parseBirthDateTimeInput } from './birthDateTimeInput';

describe('出生日期时间快捷输入', () => {
  it('解析连续的年月日时分', () => {
    expect(parseBirthDateTimeInput('199001201220')).toEqual({
      year: 1990,
      month: 1,
      day: 20,
      hour: 12,
      minute: 20,
    });
  });

  it('兼容常见分隔符与非补零写法', () => {
    expect(parseBirthDateTimeInput('1990-1-20 12:20')).toEqual({
      year: 1990,
      month: 1,
      day: 20,
      hour: 12,
      minute: 20,
    });
    expect(parseBirthDateTimeInput('1990年1月20日 12时20分')).toEqual({
      year: 1990,
      month: 1,
      day: 20,
      hour: 12,
      minute: 20,
    });
    expect(parseBirthDateTimeInput('1990-01-20T12:20:30')).toEqual({
      year: 1990,
      month: 1,
      day: 20,
      hour: 12,
      minute: 20,
    });
  });

  it('仅输入日期时沿用当前时间', () => {
    expect(parseBirthDateTimeInput('19900120', '08:05')).toEqual({
      year: 1990,
      month: 1,
      day: 20,
      hour: 8,
      minute: 5,
    });
  });

  it('拒绝无法完整识别的内容', () => {
    expect(parseBirthDateTimeInput('1990012012')).toBeNull();
    expect(parseBirthDateTimeInput('明天中午')).toBeNull();
    expect(parseBirthDateTimeInput('19900120122099')).toBeNull();
  });

  it('把滚轮值格式化为紧凑输入', () => {
    expect(formatBirthDateTimeInput(['1990', '01', '20', '12', '20'])).toBe('199001201220');
  });
});
