import { describe, expect, it } from 'vitest';
import { hexagramsData } from 'mingyu-core/divination/hexagram-data';
import {
  buildDailyHexagramResult,
  createDailyHexagramSession,
  formatDailyHexagramAiContext,
  getDailyHexagramGuidance,
  parseDailyHexagramSession,
  shakeDailyHexagramCoins,
  type DailyHexagramCoinThrow,
} from './dailyHexagram';
import {
  DAILY_HEXAGRAM_DIRECTIONS,
  DAILY_HEXAGRAM_DIRECTION_KEYS,
} from './dailyHexagramDirections';

const youngYang: DailyHexagramCoinThrow = { coins: [3, 2, 2], total: 7 };

describe('每日一卦本地算法', () => {
  it('按三钱正背结果生成六至九的爻值', () => {
    const bits = [0, 0, 0];
    expect(shakeDailyHexagramCoins(() => bits.shift() as 0 | 1)).toEqual({ coins: [2, 2, 2], total: 6 });

    const mixedBits = [1, 0, 1];
    expect(shakeDailyHexagramCoins(() => mixedBits.shift() as 0 | 1)).toEqual({ coins: [3, 2, 3], total: 8 });
  });

  it('由初爻到上爻排出本卦、变卦和动爻', () => {
    const staticResult = buildDailyHexagramResult(Array.from({ length: 6 }, () => youngYang), new Date(2026, 7, 8, 9, 30));
    expect(staticResult.original.name).toBe('乾为天');
    expect(staticResult.changed.name).toBe('乾为天');
    expect(staticResult.chart.changingYaos).toHaveLength(0);
    expect(staticResult.interpretation.focus).toContain('六爻皆静');
    expect(staticResult.interpretation.innerContext).toContain(staticResult.inter.name);
    expect(staticResult.interpretation.traditionalOverview).toContain('六爻皆静');
    expect(staticResult.interpretation.traditionalOverview).toContain('以本卦卦辞定今日主调');
    expect(staticResult.interpretation.plainOverview).toContain('六爻不动');
    expect(staticResult.interpretation.plainOverview).toContain(staticResult.guidance.action.replace(/。$/u, ''));
    expect(staticResult.interpretation.movingLines).toHaveLength(0);
    expect(staticResult.interpretation.directions.career.trend).toBeUndefined();

    const changingResult = buildDailyHexagramResult([
      { coins: [2, 2, 2], total: 6 },
      ...Array.from({ length: 5 }, () => youngYang),
    ], new Date(2026, 7, 8, 9, 30));
    expect(changingResult.changed.name).not.toBe(changingResult.original.name);
    expect(changingResult.chart.changingYaos.map((item) => item.position)).toEqual([1]);
    expect(changingResult.interpretation.focus).toContain('初爻独动');
    expect(changingResult.interpretation.trend).toContain(changingResult.changed.name);
    expect(changingResult.interpretation.traditionalOverview).toContain(`之卦“${changingResult.changed.name}”`);
    expect(changingResult.interpretation.traditionalOverview).toContain('初爻独动');
    expect(changingResult.interpretation.traditionalOverview).toContain(changingResult.original.yaoCi?.[0] || '');
    expect(changingResult.interpretation.plainOverview).toContain(changingResult.changedGuidance.theme);
    expect(changingResult.interpretation.plainOverview).toContain(changingResult.guidance.caution.replace(/。$/u, ''));
    expect(changingResult.interpretation.movingLines[0]).toMatchObject({ name: '初爻', type: '老阴' });
    expect(changingResult.interpretation.movingLines[0].meaning.length).toBeGreaterThan(25);
    expect(changingResult.interpretation.movingLines[0].advice.length).toBeGreaterThan(25);
    expect(changingResult.interpretation.directions.career.trend?.length).toBeGreaterThan(15);
  });

  it('按动爻数量调整解读重心，并处理全动卦用辞', () => {
    const fourMoving = buildDailyHexagramResult([
      { coins: [2, 2, 2], total: 6 },
      { coins: [3, 3, 3], total: 9 },
      { coins: [2, 2, 2], total: 6 },
      { coins: [3, 3, 3], total: 9 },
      youngYang,
      youngYang,
    ], new Date(2026, 7, 8, 9, 30));
    expect(fourMoving.interpretation.focus).toContain('四爻发动');
    expect(fourMoving.interpretation.focus).toContain('未动的五爻、上爻');
    expect(fourMoving.interpretation.traditionalOverview).toContain('以较低的五爻为主');

    const allMoving = buildDailyHexagramResult(Array.from({ length: 6 }, () => ({
      coins: [3, 3, 3],
      total: 9,
    } as DailyHexagramCoinThrow)), new Date(2026, 7, 8, 9, 30));
    expect(allMoving.original.name).toBe('乾为天');
    expect(allMoving.interpretation.focus).toContain('六爻皆动');
    expect(allMoving.interpretation.specialText).toBe(allMoving.original.yongCi);
    expect(allMoving.interpretation.movingLines).toHaveLength(6);
  });

  it('为 AI 解读提供当天卦象、变化和行动语境', () => {
    const result = buildDailyHexagramResult([
      { coins: [2, 2, 2], total: 6 },
      ...Array.from({ length: 5 }, () => youngYang),
    ], new Date(2026, 7, 8, 9, 30));
    const context = formatDailyHexagramAiContext(result, '2026年8月8日');

    expect(context).toContain('日期：2026年8月8日');
    expect(context).toContain(`本卦：${result.original.name}`);
    expect(context).toContain(`互卦：${result.inter.name}`);
    expect(context).toContain(`之卦：${result.changed.name}`);
    expect(context).toContain(`今日主题：${result.guidance.theme}`);
    expect(context).toContain('初爻老阴');
    expect(context).toContain('具体行动建议和应避免的做法');
  });

  it('穷举六十四卦并为每卦提供完整的本地分项解读', () => {
    const hexagramNames = hexagramsData.map((hexagram) => hexagram.name).sort();
    expect(Object.keys(DAILY_HEXAGRAM_DIRECTIONS).sort()).toEqual(hexagramNames);

    for (const hexagram of hexagramsData) {
      const guidance = getDailyHexagramGuidance(hexagram.name);
      expect(guidance.summary.length, hexagram.name).toBeGreaterThan(10);
      expect(guidance.action.length, hexagram.name).toBeGreaterThan(5);
      expect(guidance.caution.length, hexagram.name).toBeGreaterThan(5);
      expect(Object.keys(guidance.directions).sort(), hexagram.name)
        .toEqual([...DAILY_HEXAGRAM_DIRECTION_KEYS].sort());
      for (const direction of DAILY_HEXAGRAM_DIRECTION_KEYS) {
        expect(guidance.directions[direction].length, `${hexagram.name} · ${direction}`).toBeGreaterThan(15);
      }

      const coinThrows = [
        ...hexagram.binarySymbol.slice(3, 6),
        ...hexagram.binarySymbol.slice(0, 3),
      ]
        .map((line) => line === '1'
          ? { coins: [3, 2, 2], total: 7 } as DailyHexagramCoinThrow
          : { coins: [2, 3, 3], total: 8 } as DailyHexagramCoinThrow);
      const result = buildDailyHexagramResult(coinThrows, new Date(2026, 7, 8, 9, 30));
      expect(result.original.name).toBe(hexagram.name);
      expect(result.interpretation.situation.length, hexagram.name).toBeGreaterThan(35);
      expect(result.interpretation.innerContext.length, hexagram.name).toBeGreaterThan(35);
      expect(result.interpretation.trend.length, hexagram.name).toBeGreaterThan(35);
      expect(result.interpretation.traditionalOverview.length, hexagram.name).toBeGreaterThan(35);
      expect(result.interpretation.plainOverview.length, hexagram.name).toBeGreaterThan(25);
    }

    expect(() => getDailyHexagramGuidance('不存在的卦')).toThrow('未找到每日一卦解读');
  });

  it('只恢复当天且结构完整的摇卦记录', () => {
    const today = new Date(2026, 7, 8, 12, 0);
    const session = createDailyHexagramSession(today);
    session.coinThrows = [youngYang];

    expect(parseDailyHexagramSession(JSON.stringify(session), today)?.coinThrows).toHaveLength(1);
    expect(parseDailyHexagramSession(JSON.stringify(session), new Date(2026, 7, 9, 12, 0))).toBeNull();
    expect(parseDailyHexagramSession(JSON.stringify({ ...session, coinThrows: [{ coins: [3, 3, 3], total: 6 }] }), today)).toBeNull();
    expect(parseDailyHexagramSession('{bad json', today)).toBeNull();
  });
});
