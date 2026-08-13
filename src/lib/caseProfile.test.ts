import { describe, expect, it } from 'vitest';
import { normalizeStoredTimeBasis } from './caseProfile';

describe('案例时间基准恢复', () => {
  it('保留用户保存的标准时选择', () => {
    expect(normalizeStoredTimeBasis('clock')).toBe('clock');
  });

  it('旧数据缺少字段时采用真太阳时默认值', () => {
    expect(normalizeStoredTimeBasis(undefined)).toBe('trueSolar');
  });
});
