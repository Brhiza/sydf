import { describe, expect, it } from 'vitest';
import type { ReadingRecord } from './divination';
import { updateHistoryInterpretation, updateHistoryInterpretationError } from './historyImport';

function pendingRecord(): ReadingRecord {
  return {
    id: 'reading-1',
    kind: 'meihua',
    methodLabel: '梅花易数',
    question: '这件事怎么处理？',
    createdAt: 1,
    result: {} as ReadingRecord['result'],
  };
}

describe('历史记录中的解读失败状态', () => {
  it('保存失败原因供历史页恢复操作组件', () => {
    const records = updateHistoryInterpretationError([pendingRecord()], 'reading-1', 'AI 暂时不可用');

    expect(records[0].interpretationError).toBe('AI 暂时不可用');
  });

  it('重试成功后清除失败状态', () => {
    const failed = updateHistoryInterpretationError([pendingRecord()], 'reading-1', 'AI 暂时不可用');
    const recovered = updateHistoryInterpretation(failed, 'reading-1', '新的解读结果');

    expect(recovered[0].interpretation).toBe('新的解读结果');
    expect(recovered[0].interpretationError).toBeUndefined();
  });

  it('已有成功解读时不被后续失败覆盖', () => {
    const interpreted = { ...pendingRecord(), interpretation: '已有解读' };

    expect(updateHistoryInterpretationError([interpreted], 'reading-1', '追问失败')).toEqual([interpreted]);
  });
});
