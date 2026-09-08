import type { NamingBirthInput, NamingGender, NumberPurpose, Wuxing } from 'mingyu-core/name-number';
import type { BirthForm } from './divination';
import type { AiInterpretationRequest } from './ai';
import type { snapshotReadingProfile } from './readingProfile';

export const nameNumberTools = [
  { value: 'naming', label: '起名' }, { value: 'name', label: '姓名解析' },
  { value: 'characters', label: '汉字查询' }, { value: 'search', label: '选字' },
  { value: 'number', label: '数字能量' }, { value: 'zhuge', label: '诸葛神数' },
  { value: 'kongming', label: '孔明神卦' },
] as const;
export type NameNumberTool = typeof nameNumberTools[number]['value'];
export interface NameNumberInput {
  tool: NameNumberTool;
  text: string;
  surname: string;
  surnameLength: 1 | 2;
  givenNameLength: 1 | 2;
  gender: NamingGender;
  preferredCharacters: string;
  forbiddenCharacters: string;
  generationCharacter: string;
  generationPosition: 'first' | 'second';
  purpose: NumberPurpose;
  pattern: string;
  strokes: string;
  wuxing: Wuxing | '';
  question: string;
}
export interface NameNumberResult {
  title: string;
  summary: string;
  sections: Array<{ title: string; text: string }>;
  prompt: string;
}
export interface NameNumberHistoryRecord {
  id: string;
  kind: 'name-number';
  methodLabel: string;
  tool: NameNumberTool;
  question: string;
  caseId: string | null;
  caseLabel?: string;
  profile: ReturnType<typeof snapshotReadingProfile>;
  context?: { label?: string };
  result: NameNumberResult;
  createdAt: number;
  interpretation?: string;
  interpretationError?: string;
  input?: NameNumberInput;
  useBirth?: boolean;
  conversation?: AiInterpretationRequest['conversation'];
}
export function namingBirthInput(profile: BirthForm): NamingBirthInput {
  const [year, month, day] = profile.date.split('-').map(Number);
  const [hour, minute] = profile.time.split(':').map(Number);
  if (!year || !month || !day || !Number.isInteger(hour) || hour! < 0 || hour! > 23 || !Number.isInteger(minute) || minute! < 0 || minute! > 59) throw new Error('请先完善当前案例的出生日期和时间。');
  return { gender: profile.gender, year: year!, month: month!, day: day!, timeIndex: Math.floor((hour! + 1) / 2) % 12,
    dateType: profile.dateType, isLeapMonth: profile.isLeapMonth, useTrueSolarTime: profile.timeBasis === 'trueSolar',
    birthHour: hour, birthMinute: minute, birthPlace: profile.locationName, birthLongitude: profile.longitude, timezone: Number(profile.timezone) };
}
export async function calculateNameNumber(input: NameNumberInput, profile: BirthForm | null): Promise<NameNumberResult> {
  const core = await import('mingyu-core/name-number');
  const birth = profile && (input.tool === 'naming' || input.tool === 'name') ? namingBirthInput(profile) : undefined;
  const question = input.question.trim();
  if (input.tool === 'naming') {
    const options = { surname: input.surname, gender: input.gender, givenNameLength: input.givenNameLength,
      preferredCharacters: input.preferredCharacters, forbiddenCharacters: input.forbiddenCharacters,
      generationCharacter: input.generationCharacter, generationPosition: input.generationPosition, birth, limit: 20 };
    const candidates = core.generateChineseNames(options);
    if (!candidates.length) throw new Error('当前条件下没有可用候选，请调整偏好字、避用字或辈分字。');
    return { title: `${input.surname}姓起名`, summary: `${candidates.length} 个候选姓名`,
      sections: candidates.map((item) => ({ title: item.fullName, text: item.analysis.chars.map((char) => `${char.char}（${char.pinyin || '读音待考'}）：${char.definition || '字义资料暂缺'}`).join('\n') + `\n三才：${item.analysis.sancai.combo}\n${item.analysis.gridDerivations.map((grid) => `${grid.name}：${grid.value}`).join(' · ')}` })),
      prompt: core.buildChineseNamingPrompt({ ...options, candidates }) + (question ? `\n【补充问题】\n${question}` : '') };
  }
  if (input.tool === 'name') {
    const analysis = core.analyzeChineseName({ fullName: input.text, surnameLength: input.surnameLength, birth });
    return { title: `${analysis.surname}${analysis.given}`, summary: `三才：${analysis.sancai.combo}`,
      sections: [
        ...analysis.chars.map((char) => ({ title: char.char, text: `${char.surnameReading || char.pinyin || '读音待考'} · 康熙笔画 ${char.kangxiStrokes} · ${char.wuxing || '五行待考'}\n${char.definition || '字义资料暂缺'}` })),
        { title: '三才五格', text: analysis.gridDerivations.map((grid) => `${grid.name}：${grid.expression}`).join('\n') + '\n' + analysis.sancaiEvidence.relations.map((item) => item.explanation).join('\n') },
      ], prompt: core.buildChineseNameAnalysisPrompt({ analysis, question }) };
  }
  if (input.tool === 'characters' || input.tool === 'search') {
    if (input.tool === 'search' && input.strokes && (!/^\d+$/.test(input.strokes) || Number(input.strokes) < 1 || Number(input.strokes) > 64)) throw new Error('笔画数请输入 1 至 64 的整数。');
    const analysis = input.tool === 'characters' ? await core.analyzeChineseCharactersWithReferences(input.text)
      : { text: '选字结果', characters: core.selectChineseCharacters({ strokes: input.strokes ? Number(input.strokes) : undefined, wuxing: input.wuxing || undefined, pinyin: input.text.trim() || undefined, commonOnly: true, limit: 50 }).map((detail) => ({ char: detail.simplified, detail })), totalKangxiStrokes: null, unknownCharacters: [] };
    if (!analysis.characters.length) throw new Error('没有符合条件的汉字，请调整筛选条件。');
    return { title: input.tool === 'characters' ? input.text : '选字结果', summary: `${analysis.characters.length} 个字`,
      sections: analysis.characters.map(({ char, detail }) => ({ title: char, text: detail
        ? `${detail.pinyin || '读音待考'} · ${detail.radical || '部首待考'} · ${detail.wuxing || '五行待考'}\n简体笔画 ${detail.simplifiedStrokes ?? '待考'} · 康熙笔画 ${detail.kangxiStrokes}\n${detail.definition || '字义资料暂缺'}${'kangxiText' in detail && detail.kangxiText ? `\n\n康熙字典原文\n${detail.kangxiText}` : ''}` : '字典尚未收录此字。' })),
      prompt: core.buildChineseCharacterPrompt({ analysis, question }) };
  }
  if (input.tool === 'number') {
    const analysis = core.analyzeNumber(input.text, input.purpose);
    return { title: analysis.normalized, summary: `数理 ${analysis.primaryIndex}`,
      sections: [{ title: '取数', text: analysis.formula },
        ...analysis.energyPairs.map((pair) => ({ title: `${pair.span} · ${pair.name}`, text: `${pair.nature} · ${pair.keywords.join('、')}\n${pair.meaning}` })),
        ...(analysis.excludedCharacters.length ? [{ title: '未参与计算的字符', text: analysis.excludedCharacters.join('、') }] : [])],
      prompt: core.buildNumberEnergyPrompt({ analysis, question }) };
  }
  const result = input.tool === 'zhuge' ? core.calculateZhugeNumber(input.text) : core.castKongmingHexagram(input.pattern || undefined);
  const title = 'sign' in result ? `诸葛神数 · 第 ${result.number} 签` : `${result.name} · ${result.grade}`;
  const poem = 'sign' in result ? result.sign.poem : result.poem;
  const detail = result.interpretation;
  const sections = [ { title: '签诗', text: poem },
    ...('strokes' in result ? [{ title: '取数', text: result.chars.map((char, index) => `${char}：${result.strokes[index]} 画`).join(' · ') }] : [{ title: '卦象', text: result.symbol }]),
    ...(detail ? [{ title: '诗意', text: detail.imageMeaning }, { title: '解读', text: detail.interpretation }, { title: '变化条件', text: detail.condition }] : []),
  ];
  return { title, summary: poem, sections, prompt: `【术式】\n${title}\n${sections.map((section) => `【${section.title}】\n${section.text}`).join('\n\n')}\n【问题】\n${question || '请结合签诗与卦象解读当前所问之事。'}\n【解读要求】\n围绕所问事项解释诗意、发展条件和可行动建议，区分签诗原文与现代解读。` };
}
