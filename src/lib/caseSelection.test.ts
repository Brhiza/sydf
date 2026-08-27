import { describe, expect, it } from 'vitest';
import { normalizeSelectedCaseId } from './caseSelection';

describe('全局案例选择', () => {
  const cases = [{ id: 'self' }, { id: 'family' }];

  it('允许明确不使用案例', () => {
    expect(normalizeSelectedCaseId('', cases)).toBe('');
  });

  it('恢复仍然存在的案例', () => {
    expect(normalizeSelectedCaseId('family', cases)).toBe('family');
  });

  it('案例已删除或存储损坏时回到不使用案例', () => {
    expect(normalizeSelectedCaseId('missing', cases)).toBe('');
    expect(normalizeSelectedCaseId(null, cases)).toBe('');
  });
});
