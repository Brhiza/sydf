import { describe, expect, it } from 'vitest';
import { generateDailyFortune, type DailyFortuneProfile, type FortunePeriod } from './dailyFortune';

const profiles: DailyFortuneProfile[] = [
  {
    id: 'personal-a', label: '个案甲', name: '个案甲', gender: 'female',
    date: '1990-05-18', dateType: 'solar', isLeapMonth: false,
    time: '08:30', timeBasis: 'clock', locationName: '北京市',
    latitude: '39.9042', longitude: '116.4074', timezone: '8',
  },
  {
    id: 'personal-b', label: '个案乙', name: '个案乙', gender: 'male',
    date: '1985-11-03', dateType: 'solar', isLeapMonth: false,
    time: '21:15', timeBasis: 'clock', locationName: '广州市',
    latitude: '23.1291', longitude: '113.2644', timezone: '8',
  },
];

function splitSentences(value: string) {
  return value.split(/[。！？；]/).map((item) => item.trim()).filter((item) => item.length >= 8);
}

describe('今日运势个案内容审计', () => {
  it('总评、行动和判断依据各自承担不同信息', () => {
    const date = new Date(2026, 7, 26, 12, 0, 0, 0);
    const periods: FortunePeriod[] = ['today', 'month', 'year'];
    const results = periods.flatMap((period) => [
      { period, profile: '通用', result: generateDailyFortune(date, undefined, period) },
      ...profiles.map((profile) => ({ period, profile: profile.label, result: generateDailyFortune(date, profile, period) })),
    ]);
    expect(results).toHaveLength(9);
    results.forEach(({ profile, result }) => {
      expect(result.summary).not.toMatch(/\d{1,2}:\d{2}|公历\d{1,2}月|\d{1,2}月\d{1,2}日/);
      expect(result.evidenceInsights.some((item) => item.key === 'distribution')).toBe(false);
      expect(result.evidenceInsights[0]?.label).toBe('判断主线');
      expect(result.evidenceInsights[1]?.label).toMatch(/必要检查|牵制所在|承接关系|同步基础/);
      expect(result.evidenceInsights.at(-1)?.label).toBe(profile === '通用' ? result.evidenceInsights[1]?.label : '结合案例');
      const sections = [
        result.summary,
        ...result.actionTips.map((item) => item.text),
        ...result.evidenceInsights.map((item) => item.detail),
      ];
      const sentences = sections.flatMap(splitSentences);
      const duplicates = [...new Set(sentences.filter((sentence, index) => sentences.indexOf(sentence) !== index))];
      expect(duplicates, JSON.stringify({ profile, period: result.period, duplicates })).toEqual([]);
      expect(sections.join('\n')).not.toMatch(/当前案例没有明显加减|根据真实反馈及时调整|不在信息不足时做最终决定|  {2,}/);
      if (profile !== '通用') {
        expect(result.summary).not.toMatch(/个人命盘/);
        expect(result.summary).not.toMatch(/可优先留出一段完整时间|先确认.+(?:时间|标准|节点|感受|信息差)|先收窄范围/);
        const personalInsight = result.evidenceInsights.find((item) => item.key === 'personal');
        expect(personalInsight?.label).toBe('结合案例');
        expect(personalInsight?.detail).toMatch(/结合出生资料与当前周期/);
        expect(personalInsight?.detail).toMatch(/之所以|因为/);
        expect(personalInsight?.title).not.toMatch(/个人命盘|个人支持/);
      }
    });
  }, 60_000);

  it('不同个案会形成不同的取舍，而不是给通用结论追加标签', () => {
    const date = new Date(2026, 7, 26, 12, 0, 0, 0);
    (['today', 'month', 'year'] satisfies FortunePeriod[]).forEach((period) => {
      const personalized = profiles.map((profile) => generateDailyFortune(date, profile, period));
      personalized.forEach((result) => {
        const personalInsight = result.evidenceInsights.find((item) => item.key === 'personal');
        expect(personalInsight?.detail).toMatch(/结合出生资料与当前周期/);
        expect(personalInsight?.detail).toMatch(/投入更容易形成结果|处理成本较低|额外消耗精力/);
        expect(personalInsight?.detail).toMatch(/之所以|因为/);
        expect(personalInsight?.detail).not.toMatch(/会放大.+这些议题更容易牵动后续安排/);
        expect(personalInsight?.detail).toMatch(/分工|承受量|真正吸收|推迟决定|可见成果|长期安排|连续来源|连续回报|协作边界|资源分配/);
        expect(personalInsight?.detail).not.toMatch(/个人承接|承接较好|更耗承接力|本期个人议题集中/);
        expect(personalInsight?.detail).not.toMatch(/个人盘当前|个人基础节奏|个人命盘里较稳|本期外部节奏|比通用判断|需要的能力正是|所需方法与惯常|之所以更适合投入|之所以更耗精力|没有相关事项就略过/);
        expect(personalInsight?.detail).toMatch(/梳理分工|整理信息|核对金额|倾听|规划路线|察觉疲劳/);
        expect(personalInsight?.detail).not.toMatch(/十神|喜用|忌神|相生|相克|天干|地支|宫位/);
        expect(personalInsight?.detail).not.toMatch(/主线卡住时.+恢复进度|可用它配合主线|多分配一档精力/);
        expect(result.summary).not.toMatch(/个人命盘|个人盘|本期外部节奏/);
      });
      const personalDetails = personalized.map((result) => result.evidenceInsights.find((item) => item.key === 'personal')?.detail || '');
      expect(personalDetails.every((detail) => detail.length > 60)).toBe(true);
      expect(personalDetails[0]).not.toBe(personalDetails[1]);
    });
  }, 60_000);
});
