import {
  PROMPT_SCHOOL_PROFILES,
  buildPromptSchoolSection,
  getPromptSchoolProfiles,
  type PromptSchoolMethod,
} from 'mingyu-core/prompt';
import type { DisplayLevel } from './ai';
import type { DivinationKind } from './divination';

export type PromptSchoolChoice = 'all' | string;
export type PromptSchoolChoices = Partial<Record<PromptSchoolMethod, PromptSchoolChoice>>;

const SELECTABLE_PROMPT_SCHOOL_IDS: Partial<Record<PromptSchoolMethod, readonly string[]>> = {
  bazi: ['ziping', 'mangpai', 'xinpai'],
  ziwei: ['sanhe', 'feixing'],
  astrolabe: ['modern', 'traditional'],
};

const DIVINATION_PROMPT_METHODS: Partial<Record<DivinationKind, PromptSchoolMethod>> = {
  meihua: 'meihua',
  liuyao: 'liuyao',
  xiaoliuren: 'xiaoliuren',
  jinkoujue: 'jinkoujue',
  qimen: 'qimen',
  liuren: 'liuren',
  taiyi: 'taiyi',
  'wuyun-liuqi': 'wuyun-liuqi',
  'huangji-jingshi': 'huangji-jingshi',
  almanac: 'almanac',
  bazi: 'bazi',
  ziwei: 'ziwei',
  astrolabe: 'astrolabe',
  qizheng: 'qizheng',
};

export function getPromptSchoolMethod(kind: DivinationKind): PromptSchoolMethod | null {
  return DIVINATION_PROMPT_METHODS[kind] ?? null;
}

export function isPromptSchoolChoiceEnabled(method: PromptSchoolMethod | null): method is PromptSchoolMethod {
  return Boolean(method && (SELECTABLE_PROMPT_SCHOOL_IDS[method]?.length ?? 0) > 1);
}

export function getPromptSchoolChoiceOptions(method: PromptSchoolMethod) {
  const selectableIds = SELECTABLE_PROMPT_SCHOOL_IDS[method] ?? [];
  if (!selectableIds.length) return [];
  const profiles = getPromptSchoolProfiles(method);
  return [
    { value: 'all', label: '综合解读（默认）' },
    ...selectableIds.map((value) => ({ value, label: profiles[value as keyof typeof profiles].label })),
  ];
}

export function normalizePromptSchoolChoices(value: unknown): PromptSchoolChoices {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const normalized: PromptSchoolChoices = {};
  for (const method of Object.keys(value) as PromptSchoolMethod[]) {
    if (!Object.prototype.hasOwnProperty.call(PROMPT_SCHOOL_PROFILES, method)) continue;
    const schoolIds = SELECTABLE_PROMPT_SCHOOL_IDS[method] ?? [];
    if (!schoolIds.length) continue;
    const choice = (value as Record<string, unknown>)[method];
    normalized[method] = choice === 'all' || (typeof choice === 'string' && schoolIds.includes(choice)) ? choice : 'all';
  }
  return normalized;
}

export function resolvePromptSchoolIds(
  method: PromptSchoolMethod | null,
  displayLevel: DisplayLevel | undefined,
  choices: PromptSchoolChoices | undefined,
): string[] {
  if (!method || displayLevel !== 'master') return [];
  if (!isPromptSchoolChoiceEnabled(method)) return [];
  const selectableIds = SELECTABLE_PROMPT_SCHOOL_IDS[method] ?? [];
  const choice = choices?.[method] ?? 'all';
  return choice === 'all' || !selectableIds.includes(choice) ? [...selectableIds] : [choice];
}

export function appendPromptSchoolGuidance(prompt: string, method: PromptSchoolMethod, schools: readonly string[]) {
  if (!schools.length) return prompt.trim();
  return [prompt.trim(), buildPromptSchoolSection(method, schools)].filter(Boolean).join('\n\n');
}
