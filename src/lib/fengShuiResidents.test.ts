import { describe, expect, it } from 'vitest';
import { buildFengShuiResidentBaziContext } from './fengShuiResidents';
import type { SelectableCaseProfile } from './caseSelection';

const profile = (id: string, label: string, date: string): SelectableCaseProfile => ({
  id,
  label,
  name: label,
  available: true,
  gender: 'female',
  date,
  dateType: 'solar',
  isLeapMonth: false,
  time: '10:30',
  timeBasis: 'trueSolar',
  locationName: '北京市 东城区',
  latitude: '39.9042',
  longitude: '116.4074',
  timezone: '8',
});

describe('居家风水成员八字补充', () => {
  it('为多位成员分别生成八字资料并明确补充权重', () => {
    const context = buildFengShuiResidentBaziContext([
      profile('first', '成员甲', '1990-01-02'),
      profile('second', '成员乙', '1992-03-04'),
    ]);

    expect(context.entries).toHaveLength(2);
    expect(context.prompt).toContain('【成员：成员甲】');
    expect(context.prompt).toContain('【成员：成员乙】');
    expect(context.prompt).toContain('【命盘】');
    expect(context.prompt).toContain('日元本命');
    expect(context.prompt).not.toContain('【大运】');
    expect(context.prompt).not.toContain('传统旁证');
    expect(context.prompt).toContain('住宅的真实坐向、户型、动线、采光、通风、安全与实际需求优先');
  });

  it('去重并忽略不可用案例', () => {
    const first = profile('first', '成员甲', '1990-01-02');
    const context = buildFengShuiResidentBaziContext([first, first, { ...profile('old', '旧案例', '1991-02-03'), available: false }]);
    expect(context.entries.map((entry) => entry.id)).toEqual(['first']);
  });
});
