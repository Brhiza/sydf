import { describe, expect, it } from 'vitest';
import {
  getPromptSchoolChoiceOptions,
  getPromptSchoolMethod,
  isPromptSchoolChoiceEnabled,
  normalizePromptSchoolChoices,
  resolvePromptSchoolIds,
} from './promptSchools';

describe('完整模式流派选择', () => {
  it('默认启用当前术数的全部流派', () => {
    expect(resolvePromptSchoolIds('bazi', 'master', undefined)).toEqual(['ziping', 'mangpai', 'xinpai']);
  });

  it('单一流派只传入一个选项', () => {
    expect(resolvePromptSchoolIds('bazi', 'master', { bazi: 'mangpai' })).toEqual(['mangpai']);
  });

  it('非完整模式不启用流派合参', () => {
    expect(resolvePromptSchoolIds('bazi', 'beginner', { bazi: 'all' })).toEqual([]);
    expect(resolvePromptSchoolIds('bazi', 'basic', { bazi: 'ziping' })).toEqual([]);
  });

  it('无效的旧存储值回退为全部流派', () => {
    expect(normalizePromptSchoolChoices({ bazi: 'unknown', liuyao: 'huozhulin' })).toEqual({ bazi: 'all' });
    expect(resolvePromptSchoolIds('bazi', 'master', { bazi: 'unknown' })).toEqual(['ziping', 'mangpai', 'xinpai']);
  });

  it('灵签不提供流派选项', () => {
    expect(getPromptSchoolMethod('ssgw')).toBeNull();
  });

  it('只给分析框架差异明显的术式提供选择', () => {
    expect(isPromptSchoolChoiceEnabled('bazi')).toBe(true);
    expect(isPromptSchoolChoiceEnabled('ziwei')).toBe(true);
    expect(isPromptSchoolChoiceEnabled('astrolabe')).toBe(true);
    expect(isPromptSchoolChoiceEnabled('liuyao')).toBe(false);
    expect(isPromptSchoolChoiceEnabled('tarot')).toBe(false);
    expect(resolvePromptSchoolIds('liuyao', 'master', { liuyao: 'zengshanbuyi' })).toEqual([]);
    expect(getPromptSchoolChoiceOptions('tarot')).toEqual([]);
  });

  it('选择列表只保留显著不同的体系', () => {
    const options = getPromptSchoolChoiceOptions('ziwei');
    expect(options[0]?.value).toBe('all');
    expect(options[0]?.label).toContain('默认');
    expect(options.map(item => item.value)).toEqual(['all', 'sanhe', 'feixing']);
    expect(resolvePromptSchoolIds('ziwei', 'master', {})).toEqual(['sanhe', 'feixing']);
    expect(resolvePromptSchoolIds('astrolabe', 'master', {})).toEqual(['modern', 'traditional']);
  });
});
