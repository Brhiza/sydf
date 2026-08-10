import { describe, expect, it } from 'vitest';
import {
  HISTORY_LIMIT,
  getHistoryRecordCategory,
  isLegacyHistoryRecord,
  mergeHistoryRecords,
  parseLegacyHistory,
  parseStoredHistory,
  updateHistoryInterpretation,
} from './historyImport';

function oldRecord(type: string, data: Record<string, unknown>, id = type) {
  return {
    id,
    type,
    question: `${type}问题`,
    timestamp: 1000,
    summary: '旧摘要',
    result: { type, data, aiResponse: '旧版 AI 解读' },
  };
}

describe('旧版历史导入', () => {
  it('应转换旧版导出文件中的可继续查看记录并保留 AI 解读', () => {
    const result = parseLegacyHistory({
      version: '1.0',
      records: [
        oldRecord('meihua', {
          mainHexagram: {}, yaosDetail: [], tiGua: {}, yongGua: {}, ganzhi: {}, analysis: {}, movingYao: {},
        }),
        oldRecord('ssgw', { number: 12, title: '签题', poem: '签诗' }),
      ],
    });

    expect(result.skipped).toBe(0);
    expect(result.records).toHaveLength(2);
    expect(result.records[0]).toMatchObject({
      id: 'sydf-legacy-meihua',
      kind: 'meihua',
      interpretation: '旧版 AI 解读',
    });
  });

  it('应保留旧版塔罗并直接丢弃旧版今日运势', () => {
    const result = parseLegacyHistory([
      oldRecord('tarot_single', {
        spreadName: '单牌指引',
        cards: [{ name: '愚人', position: '当下', reversed: true }],
      }, 'tarot-one'),
      oldRecord('daily', {
        date: '2026-08-08',
        overall: { score: 88, luck: '吉', description: '整体顺遂' },
        aspects: { career: { score: 90, description: '推进顺利', advice: '稳步进行' } },
        lucky: { numbers: [3, 8], colors: ['紫色'], directions: ['东南'], time: '午时' },
      }),
    ]);

    expect(result.records).toHaveLength(1);
    expect(result.skipped).toBe(1);
    expect(result.records.every(isLegacyHistoryRecord)).toBe(true);
    expect(result.records[0]).toMatchObject({ kind: 'tarot', result: { spreadName: '单牌指引' } });
  });

  it('读取本机记录时应清除择日和旧版今日运势', () => {
    const records = parseStoredHistory([
      { id: 'almanac', kind: 'almanac', methodLabel: '黄历择日', question: '择日', createdAt: 4, result: {} },
      { id: 'daily', kind: 'daily', methodLabel: '今日运势', question: '今日运势', createdAt: 3, result: { kind: 'daily' }, legacySource: 'sydf.cc' },
      { id: 'tarot', kind: 'tarot', methodLabel: '塔罗牌', question: '塔罗', createdAt: 2, result: { kind: 'tarot' }, legacySource: 'sydf.cc' },
      { id: 'ssgw', kind: 'ssgw', methodLabel: '三山国王灵签', question: '灵签', createdAt: 1, result: {} },
    ]);

    expect(records.map((record) => record.id)).toEqual(['tarot', 'ssgw']);
  });

  it('应把灵签作为独立类型，并保留可恢复的合盘记录', () => {
    const records = parseStoredHistory([
      { id: 'sign', kind: 'ssgw', methodLabel: '三山国王灵签', question: '问签', createdAt: 2, result: {} },
      {
        id: 'compatibility',
        kind: 'bazi',
        methodLabel: '合婚合盘',
        question: '双方合盘',
        createdAt: 1,
        result: {},
        compatibility: {
          type: 'marriage',
          primaryCaseId: 'one',
          partnerCaseId: 'two',
          primaryLabel: '甲',
          partnerLabel: '乙',
          reading: { summary: '合盘摘要', data: {}, prompt: '合盘资料', method: '综合合盘' },
        },
      },
    ]);

    expect(records).toHaveLength(2);
    expect(getHistoryRecordCategory(records[0])).toBe('oracle');
    expect(getHistoryRecordCategory(records[1])).toBe('chart');
    expect(!isLegacyHistoryRecord(records[1]) && records[1].compatibility).toMatchObject({
      primaryCaseId: 'one',
      partnerCaseId: 'two',
    });
  });

  it('应跳过损坏的本地旧记录', () => {
    const result = parseLegacyHistory([oldRecord('meihua', {}), { bad: true }]);
    expect(result).toMatchObject({ records: [], total: 2, skipped: 2 });
  });

  it('合并时应去重、按时间倒序并遵守历史容量', () => {
    const existing = Array.from({ length: HISTORY_LIMIT }, (_, index) => ({
      id: `current-${index}`,
      kind: 'ssgw' as const,
      methodLabel: '三山国王灵签',
      question: '问题',
      createdAt: 2000 + index,
      result: { number: 1, title: '签', poem: '诗' } as never,
    }));
    const imported = parseLegacyHistory([
      oldRecord('ssgw', { number: 2, title: '旧签', poem: '旧诗' }, 'old-one'),
    ]).records;
    const merged = mergeHistoryRecords(existing, imported);

    expect(merged.added).toBe(1);
    expect(merged.records).toHaveLength(HISTORY_LIMIT);
    expect(merged.omittedByLimit).toBe(1);
    expect(merged.records.some((record) => record.id === 'sydf-legacy-old-one')).toBe(false);
  });

  it('应按记录 ID 写回 AI 解读且不改变记录顺序和其他字段', () => {
    const records = parseLegacyHistory([
      oldRecord('ssgw', { number: 2, title: '旧签', poem: '旧诗' }, 'old-one'),
      oldRecord('ssgw', { number: 3, title: '另一签', poem: '另一诗' }, 'old-two'),
    ]).records;

    const updated = updateHistoryInterpretation(records, 'sydf-legacy-old-two', '  新的 AI 解读  ');

    expect(updated).not.toBe(records);
    expect(updated.map((record) => record.id)).toEqual(records.map((record) => record.id));
    expect(updated[0]).toBe(records[0]);
    expect(updated[1]).toMatchObject({
      id: 'sydf-legacy-old-two',
      question: 'ssgw问题',
      interpretation: '新的 AI 解读',
    });
  });

  it('记录不存在或回答为空时应保持原记录不变', () => {
    const records = parseLegacyHistory([
      oldRecord('ssgw', { number: 2, title: '旧签', poem: '旧诗' }, 'old-one'),
    ]).records;

    expect(updateHistoryInterpretation(records, 'missing', '解读')).toBe(records);
    expect(updateHistoryInterpretation(records, records[0].id, '   ')).toBe(records);
  });
});
