import { describe, expect, it } from 'vitest';
import {
  getPromptSchoolChoiceOptions,
  getPromptSchoolMethod,
  normalizePromptSchoolChoices,
  resolvePromptSchoolIds,
} from './promptSchools';

describe('完整模式流派选择', () => {
  it('默认启用当前术数的全部流派', () => {
    expect(resolvePromptSchoolIds('bazi', 'master', undefined)).toEqual(['ziping', 'mangpai', 'xinpai']);
  });

  it('单一流派只传入一个选项', () => {
    expect(resolvePromptSchoolIds('liuyao', 'master', { liuyao: 'zengshanbuyi' })).toEqual(['zengshanbuyi']);
  });

  it('非完整模式不启用流派合参', () => {
    expect(resolvePromptSchoolIds('bazi', 'beginner', { bazi: 'all' })).toEqual([]);
    expect(resolvePromptSchoolIds('bazi', 'basic', { bazi: 'ziping' })).toEqual([]);
  });

  it('无效的旧存储值回退为全部流派', () => {
    expect(normalizePromptSchoolChoices({ bazi: 'unknown', liuyao: 'huozhulin' })).toEqual({ bazi: 'all', liuyao: 'huozhulin' });
    expect(resolvePromptSchoolIds('bazi', 'master', { bazi: 'unknown' })).toEqual(['ziping', 'mangpai', 'xinpai']);
  });

  it('灵签不提供流派选项', () => {
    expect(getPromptSchoolMethod('ssgw')).toBeNull();
  });

  it('单选列表把全部合参放在第一项', () => {
    const options = getPromptSchoolChoiceOptions('tarot');
    expect(options[0]?.value).toBe('all');
    expect(options[0]?.label).toContain('全部');
    expect(options.map(item => item.value)).toEqual(['all', 'rws', 'yuansu', 'narrative']);
  });
});
