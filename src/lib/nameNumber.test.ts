import { describe, expect, it } from 'vitest';
import { calculateNameNumber, type NameNumberInput } from './nameNumber';

const input: NameNumberInput = { tool: 'naming', text: '', surname: '林', surnameLength: 1, givenNameLength: 2, gender: '通用', preferredCharacters: '', forbiddenCharacters: '', generationCharacter: '', generationPosition: 'first', purpose: 'general', pattern: '', strokes: '', wuxing: '', question: '如何理解这个结果？' };

describe('姓名与数字工具真实核心计算', () => {
  it('起名遵守姓氏、辈分字和避用字', async () => {
    const result = await calculateNameNumber({ ...input, generationCharacter: '文', forbiddenCharacters: '明' }, null);
    expect(result.sections.length).toBeGreaterThan(0);
    for (const candidate of result.sections) {
      expect(candidate.title.startsWith('林文')).toBe(true);
      expect(candidate.title).not.toContain('明');
    }
    expect(result.prompt).toContain(result.sections[0]!.title);
  });
  it('复姓解析保留真实姓名与笔画依据', async () => {
    const result = await calculateNameNumber({ ...input, tool: 'name', text: '欧阳文清', surnameLength: 2 }, null);
    expect(result.title).toBe('欧阳文清');
    expect(result.sections).toHaveLength(5);
    expect(result.sections[4]!.text).toContain('=');
    expect(result.prompt).toContain('欧阳');
  });
  it('汉字查询载入字义与原文', async () => {
    const result = await calculateNameNumber({ ...input, tool: 'characters', text: '明' }, null);
    expect(result.sections[0]!.title).toBe('明');
    expect(result.sections[0]!.text).toContain('康熙字典原文');
    expect(result.prompt).toContain('明');
  });
  it('选字遵守笔画条件', async () => {
    const result = await calculateNameNumber({ ...input, tool: 'search', strokes: '8' }, null);
    expect(result.sections.length).toBeGreaterThan(0);
    expect(result.sections.every((section) => section.text.includes('康熙笔画 8'))).toBe(true);
  });
  it('号码结果包含实际取数和数对', async () => {
    const result = await calculateNameNumber({ ...input, tool: 'number', text: '13812345678', purpose: 'phone' }, null);
    expect(result.title).toBe('13812345678');
    expect(result.sections.length).toBeGreaterThan(1);
    expect(result.prompt).toContain('13812345678');
  });
  it('诸葛取数与孔明指定卦象可重复', async () => {
    const zhuge = await calculateNameNumber({ ...input, tool: 'zhuge', text: '天地人' }, null);
    expect(zhuge.title).toContain('诸葛神数');
    expect(zhuge.sections[1]!.text).toContain('天');
    const kongming = await calculateNameNumber({ ...input, tool: 'kongming', pattern: '10101' }, null);
    expect(kongming.sections[1]!.text).toContain('●');
    expect(await calculateNameNumber({ ...input, tool: 'kongming', pattern: '10101' }, null)).toEqual(kongming);
  });
  it('无效输入明确报错', async () => {
    await expect(calculateNameNumber({ ...input, tool: 'search', strokes: '-1' }, null)).rejects.toThrow('笔画');
    await expect(calculateNameNumber({ ...input, tool: 'zhuge', text: '天' }, null)).rejects.toThrow();
    await expect(calculateNameNumber({ ...input, tool: 'kongming', pattern: '10' }, null)).rejects.toThrow();
  });
});
