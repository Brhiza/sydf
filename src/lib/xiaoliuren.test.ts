import { describe, expect, it } from 'vitest';
import {
  XIAOLIUREN_PRESENTATIONS,
  calculateLocalXiaoliuren,
  formatXiaoliurenInput,
  parseXiaoliurenInput,
} from './xiaoliuren';

describe('小六壬本地时间课', () => {
  it('按北京时间解析和格式化输入', () => {
    const date = parseXiaoliurenInput('2026-08-08T10:30');
    expect(date.toISOString()).toBe('2026-08-08T02:30:00.000Z');
    expect(formatXiaoliurenInput(date)).toBe('2026-08-08T10:30');
  });

  it('生成可复核的月、日、时顺数轨迹', () => {
    const reading = calculateLocalXiaoliuren('2026-08-08T10:30');
    const { calculation, sequence, primary } = reading.data;

    expect(calculation.monthPalaceIndex).toBe((calculation.lunarMonth - 1) % 6);
    expect(calculation.dayPalaceIndex).toBe((calculation.lunarMonth + calculation.lunarDay - 2) % 6);
    expect(calculation.hourPalaceIndex).toBe((calculation.lunarMonth + calculation.lunarDay + calculation.hourNumber - 3) % 6);
    expect(primary).toEqual(sequence.hour);
    expect(reading.presentation).toBe(XIAOLIUREN_PRESENTATIONS[primary.name]);
    expect(reading.dateLabel).toBe('2026年8月8日');
    expect(reading.lunarLabel).toContain('巳时');
  });

  it('拒绝无效日期', () => {
    expect(() => parseXiaoliurenInput('2026-02-30T12:00')).toThrow('起课日期或时间无效');
    expect(() => parseXiaoliurenInput('')).toThrow('请选择完整');
  });

  it('为六宫提供完整的现代解读结构', () => {
    Object.values(XIAOLIUREN_PRESENTATIONS).forEach((presentation) => {
      expect(presentation.verdict.length).toBeGreaterThan(8);
      expect(presentation.bestFor.length).toBeGreaterThan(8);
      expect(presentation.avoidFor.length).toBeGreaterThan(8);
      expect(presentation.actions).toHaveLength(3);
      expect(presentation.insights.map((item) => item.label)).toEqual(['当前节奏', '沟通协作', '决策方式', '风险边界']);
    });
  });
});
