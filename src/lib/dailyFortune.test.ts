import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearDailyFortuneCache,
  generateDailyFortune,
  getCachedDailyFortune,
  isDailyFortuneProfileComplete,
  type DailyFortuneProfile,
  type DailyFortuneResult,
} from './dailyFortune';

const profile: DailyFortuneProfile = {
  id: 'test-profile',
  label: '测试案例',
  name: '测试案例',
  gender: 'female',
  date: '1990-05-18',
  dateType: 'solar',
  isLeapMonth: false,
  time: '08:30',
  timeBasis: 'clock',
  locationName: '北京市',
  latitude: '39.9042',
  longitude: '116.4074',
  timezone: '8',
};

function createMemoryStorage() {
  const values = new Map<string, string>();
  const storage: Storage = {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
  return { storage, values };
}

function expectToneAndGradeConsistent(result: DailyFortuneResult) {
  const positive = new Set(['大吉', '吉', '小吉']);
  const negative = new Set(['大凶', '凶', '小凶']);
  if (result.tone === 'favorable') expect(negative.has(result.grade)).toBe(false);
  if (result.tone === 'cautious') expect(positive.has(result.grade)).toBe(false);
}

function periodEvaluation(result: DailyFortuneResult) {
  return {
    tone: result.tone,
    grade: result.grade,
    summary: result.summary,
    overview: result.overview,
    categories: result.categories,
    actionTips: result.actionTips,
    evidenceInsights: result.evidenceInsights,
    periodTrend: result.periodTrend,
    reference: result.reference,
    goodDirections: result.goodDirections,
    avoidDirections: result.avoidDirections,
  };
}

describe('今日、月运、年运统一周期算法', () => {
  beforeEach(() => clearDailyFortuneCache());

  it('严格校验个人资料中的真实日期', () => {
    expect(isDailyFortuneProfileComplete(profile)).toBe(true);
    expect(isDailyFortuneProfileComplete({ ...profile, date: '2023-02-29' })).toBe(false);
    expect(isDailyFortuneProfileComplete({ ...profile, time: '24:00' })).toBe(false);
    expect(isDailyFortuneProfileComplete({ ...profile, date: '2023-02-01', dateType: 'lunar', isLeapMonth: true })).toBe(true);
    expect(isDailyFortuneProfileComplete({ ...profile, date: '2024-10-01', dateType: 'lunar', isLeapMonth: true })).toBe(false);
  });

  it('农历出生资料会按农历进入个人运势计算', () => {
    const lunarProfile: DailyFortuneProfile = { ...profile, date: '2023-02-01', dateType: 'lunar', isLeapMonth: true };
    expect(() => generateDailyFortune(new Date(2025, 7, 8, 12, 0, 0, 0), lunarProfile, 'today')).not.toThrow();
  });

  it('相同日期、案例和周期会得到完全相同的结果', () => {
    const date = new Date(2025, 7, 8, 12, 0, 0, 0);
    const first = generateDailyFortune(date, profile, 'today');
    const second = generateDailyFortune(new Date(date), { ...profile }, 'today');
    expect(second).toEqual(first);
    expect(second).toBe(first);
    expect(getCachedDailyFortune(date, profile, 'today')).toBe(first);
    const changedProfile = generateDailyFortune(date, { ...profile, time: '09:30' }, 'today');
    expect(changedProfile).not.toBe(first);
  });

  it('计算结果会写入版本化浏览器缓存，缓存键不保存明文出生资料', () => {
    const { storage, values } = createMemoryStorage();
    const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
    try {
      clearDailyFortuneCache();
      generateDailyFortune(new Date(2025, 7, 8, 12, 0, 0, 0), profile, 'today');
      expect(values.size).toBe(1);
      const serialized = [...values.values()][0] || '';
      expect(serialized).toContain('2026-08-25-v14');
      expect(serialized).not.toContain(profile.date);
    } finally {
      clearDailyFortuneCache();
      if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage);
      else Reflect.deleteProperty(globalThis, 'localStorage');
    }
  });

  it('刷新页面后仍可从浏览器缓存直接取得同一结果', async () => {
    const { storage } = createMemoryStorage();
    const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });
    try {
      clearDailyFortuneCache();
      const date = new Date(2025, 7, 8, 12, 0, 0, 0);
      const runtime = new Date(2026, 7, 8, 12, 0, 0, 0);
      const first = generateDailyFortune(date, profile, 'today', runtime);
      vi.resetModules();
      const reloaded = await import('./dailyFortune');
      expect(reloaded.getCachedDailyFortune(date, profile, 'today', runtime)).toEqual(first);
    } finally {
      clearDailyFortuneCache();
      if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage);
      else Reflect.deleteProperty(globalThis, 'localStorage');
    }
  });

  it('同一公历月和公历年内，核心总评不随查看日期漂移', () => {
    const monthStart = generateDailyFortune(new Date(2025, 7, 1, 12, 0, 0, 0), profile, 'month');
    const monthEnd = generateDailyFortune(new Date(2025, 7, 31, 12, 0, 0, 0), profile, 'month');
    expect(monthEnd.rangeLabel).toBe(monthStart.rangeLabel);
    expect(periodEvaluation(monthEnd)).toEqual(periodEvaluation(monthStart));

    const yearStart = generateDailyFortune(new Date(2025, 2, 1, 12, 0, 0, 0), profile, 'year');
    const yearEnd = generateDailyFortune(new Date(2025, 10, 1, 12, 0, 0, 0), profile, 'year');
    expect(yearEnd.rangeLabel).toBe(yearStart.rangeLabel);
    expect(periodEvaluation(yearEnd)).toEqual(periodEvaluation(yearStart));
  });

  it('日运完整计算全天变化，但只向用户显示可直接使用的公历时段', () => {
    const result = generateDailyFortune(new Date(2025, 7, 8, 12, 0, 0, 0), profile, 'today');
    expect(result.coverageLabel).toBe('综合当天节奏与具体时间变化');
    expect(result.categories).toHaveLength(6);
    expect(result.categories.map((item) => item.key)).toContain('wellbeing');
    expect(result.categories.find((item) => item.key === 'wellbeing')?.detail).toMatch(/休息|作息|睡眠/);
    result.categories.forEach((category) => {
      expect(category.basis).toMatch(/\d{2}:\d{2}—\d{2}:\d{2}/);
      expect(category.basis).not.toMatch(/\d+个(?:时辰|较顺|宜缓)/);
    });
    expect(result.evidenceInsights).toHaveLength(4);
    expect(result.evidenceInsights[0]?.title).toMatch(/\d{2}:\d{2}—\d{2}:\d{2}.*优先/);
    expect(result.evidenceInsights[0]?.title).not.toMatch(/\d+顺|\d+平|\d+缓/);
    result.evidenceInsights.forEach((insight) => {
      expect(insight.title.length).toBeGreaterThan(4);
      expect(insight.detail.length).toBeGreaterThan(12);
    });
    expect(result.actionTips[0]?.sourceKey).toBe(result.evidenceInsights.find((item) => item.key === 'opportunity')?.sourceKey);
    expect(result.actionTips[1]?.sourceKey).toBe(result.evidenceInsights.find((item) => item.key === 'caution')?.sourceKey);
    expect(result.timeWindows.length).toBeLessThanOrEqual(3);
    result.timeWindows.forEach((window) => {
      expect(window.range).toMatch(/^\d{2}:\d{2}—\d{2}:\d{2}$/);
      expect(Number(window.range.slice(0, 2))).toBeGreaterThanOrEqual(7);
      expect(window.coverage).toMatch(/适合|可安排|整理|复核/);
    });
    expect(result.periodTrend).toHaveLength(7);
    expect(result.periodTrend[0]).toMatchObject({ dateKey: '2025-08-08', label: '今天', dateLabel: '8/8' });
    expect(result.periodTrend[1]?.label).toBe('明天');
    expect(new Set(result.periodTrend.map((item) => item.dateKey)).size).toBe(7);
    result.periodTrend.forEach((item) => {
      expect(item.status).toMatch(/适合推进|稳步安排|宜放慢/);
      expect(item.focus).toMatch(/可优先|先确认|日常节奏/);
    });
    expectToneAndGradeConsistent(result);
  });

  it('节气名称只在节气当天显示', () => {
    const beforeChushu = generateDailyFortune(new Date(2026, 7, 22, 12, 0, 0, 0), undefined, 'today');
    const chushu = generateDailyFortune(new Date(2026, 7, 23, 12, 0, 0, 0), undefined, 'today');
    expect(beforeChushu.jieqi).toBe('');
    expect(chushu.jieqi).toBe('处暑');
  });

  it('当前时段按真实时辰更新，同一时辰复用缓存，跨时辰重新计算', () => {
    const date = new Date(2026, 7, 8, 12, 0, 0, 0);
    const first = generateDailyFortune(date, profile, 'today', new Date(2026, 7, 8, 21, 5, 0, 0));
    const second = generateDailyFortune(date, profile, 'today', new Date(2026, 7, 8, 21, 55, 0, 0));
    expect(second).toBe(first);
    const nextShichen = generateDailyFortune(date, profile, 'today', new Date(2026, 7, 8, 23, 5, 0, 0));
    expect(nextShichen).not.toBe(first);
    expect(nextShichen.timeWindows).toHaveLength(0);
  });

  it('月运完整计算周期内每天，并直接显示公历日期', () => {
    const result = generateDailyFortune(new Date(2025, 7, 15, 12, 0, 0, 0), profile, 'month');
    expect(result.boundaryLabel).toBe('');
    expect(result.rangeLabel).toBe('2025-08-01 至 2025-08-31');
    expect(result.calendarRangeLabel).toBe('2025年8月1日 — 2025年8月31日');
    expect(result.weekday).toMatch(/^\d+月\d+日—\d+月\d+日$/);
    expect(result.coverageLabel).toBe('综合本月每天的变化');
    expect(result.periodTrend).toHaveLength(5);
    expect(result.periodTrend[0]).toMatchObject({
      dateKey: '2025-08-w1',
      label: '第1周',
      dateLabel: '1—7日',
    });
    expect(result.periodTrend[4]).toMatchObject({
      dateKey: '2025-08-w5',
      label: '第5周',
      dateLabel: '29—31日',
    });
    result.periodTrend.forEach((item) => {
      expect(item.status).toMatch(/适合推进|稳步安排|宜放慢/);
      expect(item.focus).toMatch(/可优先|先确认|日常节奏/);
    });
    result.categories.forEach((category) => {
      expect(category.basis).toMatch(/\d+月\d+日/);
      expect(category.basis).not.toMatch(/完整日期|日家盘|较顺|宜缓/);
    });
    expectToneAndGradeConsistent(result);
  });

  it('年运完整计算全年阶段，并向用户换算为公历范围', () => {
    const result = generateDailyFortune(new Date(2025, 6, 1, 12, 0, 0, 0), profile, 'year');
    expect(result.boundaryLabel).toBe('');
    expect(result.rangeLabel).toBe('2025-01-01 至 2025-12-31');
    expect(result.calendarRangeLabel).toBe('2025年1月1日 — 2025年12月31日');
    expect(result.weekday).toMatch(/\d+月\d+日.*\d+月\d+日/);
    expect(result.coverageLabel).toBe('综合全年各阶段变化');
    expect(result.periodTrend).toHaveLength(12);
    expect(result.periodTrend[0]).toMatchObject({ dateKey: '2025-01', label: '1月', dateLabel: '' });
    expect(result.periodTrend[11]).toMatchObject({ dateKey: '2025-12', label: '12月', dateLabel: '' });
    expect(new Set(result.periodTrend.map((item) => item.dateKey)).size).toBe(12);
    result.periodTrend.forEach((item) => {
      expect(item.status).toMatch(/适合推进|稳步安排|宜放慢/);
      expect(item.focus).toMatch(/可优先|先确认|日常节奏/);
    });
    result.categories.forEach((category) => {
      expect(`${category.detail}${category.basis}`).toMatch(/公历(?:\d{4}年)?\d+月\d+日/);
      expect(category.basis).not.toMatch(/干支月|月家盘|较顺|宜缓/);
    });
    result.timeWindows.forEach((window) => {
      expect(window.name).toMatch(/^(?:\d+月\d+日—\d+日|\d+月\d+日—\d+月\d+日)$/);
      expect(window.range).toBe('');
      expect(window.name).not.toContain('2024年');
      expect(window.name).not.toContain('2026年');
    });
    expect(`${result.summary}${result.categories.map((item) => `${item.detail}${item.basis}`).join('')}`)
      .not.toMatch(/支持更集中|个人节奏|支持与吸收|压力与突破|责任与规则|研究与调整|产出与分享|表达与变化|稳定资源|流动资源/);
    expectToneAndGradeConsistent(result);
  });

  it('个人资料会进入算法，而不是只追加一段个人化文案', () => {
    const date = new Date(2025, 7, 8, 12, 0, 0, 0);
    const general = generateDailyFortune(date, undefined, 'today');
    const personal = generateDailyFortune(date, profile, 'today');
    expect(general.personalized).toBe(false);
    expect(personal.personalized).toBe(true);
    expect(personal.categories.map((item) => [item.tone, item.detail, item.basis]))
      .not.toEqual(general.categories.map((item) => [item.tone, item.detail, item.basis]));
  });

  it('同一天的不同命盘会形成稳定且可区分的个人结果', () => {
    const date = new Date(2025, 7, 8, 12, 0, 0, 0);
    const profiles: DailyFortuneProfile[] = [
      profile,
      { ...profile, id: 'profile-b', gender: 'male', date: '1984-01-01', time: '23:30' },
      { ...profile, id: 'profile-c', date: '1998-11-20', time: '16:45' },
    ];
    const results = profiles.map((item) => generateDailyFortune(date, item, 'today'));
    const signatures = results.map((result) => JSON.stringify({
      tone: result.tone,
      grade: result.grade,
      categories: result.categories.map((item) => [item.key, item.tone, item.detail]),
      reference: result.reference,
      goodDirections: result.goodDirections,
    }));
    expect(results.every((result) => result.personalized)).toBe(true);
    expect(new Set(signatures).size).toBe(results.length);
    expect(new Set(results.map((result) => JSON.stringify(result.reference))).size).toBeGreaterThan(1);
  });

  it('多项明显风险不会被普通项目平均成整体顺势', () => {
    const results = Array.from({ length: 12 }, (_, index) => (
      generateDailyFortune(new Date(2025, 7, index + 1, 12, 0, 0, 0), profile, 'today')
    ));
    const riskDays = results.filter((result) => result.categories.filter((item) => item.tone === 'cautious').length >= 2);
    expect(new Set(results.map((result) => result.grade)).size).toBeGreaterThan(1);
    expect(riskDays.length).toBeGreaterThan(0);
    expect(riskDays.every((result) => result.tone !== 'favorable')).toBe(true);
  }, 15_000);

  it('个人排盘不可用时无感降级为通用今日运势', () => {
    const date = new Date(2025, 7, 8, 12, 0, 0, 0);
    const invalidProfile = { ...profile, date: '2025-02-29' };
    const fallback = generateDailyFortune(date, invalidProfile, 'today');
    const general = generateDailyFortune(date, undefined, 'today');
    expect(fallback.personalized).toBe(false);
    expect(fallback).toEqual(general);
  });

  it('结果文案直接给出结论，不重复免责声明式提醒', () => {
    const result = generateDailyFortune(new Date(2025, 7, 8, 12, 0, 0, 0), profile, 'today');
    const text = JSON.stringify(result);
    expect(text).not.toMatch(/仅供参考|仍以实际|不构成|寻求专业帮助|不必只看时间/);
  });

  it('查询出生日前的历史周期时真正降级为通用盘', () => {
    const date = new Date(1980, 6, 1, 12, 0, 0, 0);
    const runtime = new Date(2026, 7, 8, 12, 0, 0, 0);
    const historicalPersonal = generateDailyFortune(date, profile, 'year', runtime);
    const historicalGeneral = generateDailyFortune(date, undefined, 'year', runtime);
    expect(historicalPersonal).toEqual(historicalGeneral);
  });
});
