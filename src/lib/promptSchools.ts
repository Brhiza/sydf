import {
  PROMPT_SCHOOL_PROFILES,
  buildPromptSchoolSection,
  getPromptSchoolIds,
  getPromptSchoolProfiles,
  getPromptSchoolSectionTitle,
  type PromptSchoolMethod,
} from 'mingyu-core/prompt';
import type { DisplayLevel } from './ai';
import type { DivinationKind } from './divination';

export type PromptSchoolChoice = 'all' | string;
export type PromptSchoolChoices = Partial<Record<PromptSchoolMethod, PromptSchoolChoice>>;

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

export function getPromptSchoolChoiceOptions(method: PromptSchoolMethod) {
  const profiles = getPromptSchoolProfiles(method);
  const title = getPromptSchoolSectionTitle(method, getPromptSchoolIds(method));
  return [
    { value: 'all', label: `${title}（全部）` },
    ...Object.entries(profiles).map(([value, profile]) => ({ value, label: profile.label })),
  ];
}

export function normalizePromptSchoolChoices(value: unknown): PromptSchoolChoices {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const normalized: PromptSchoolChoices = {};
  for (const method of Object.keys(value) as PromptSchoolMethod[]) {
    if (!Object.prototype.hasOwnProperty.call(PROMPT_SCHOOL_PROFILES, method)) continue;
    const schoolIds = getPromptSchoolIds(method);
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
  const schoolIds = getPromptSchoolIds(method);
  const choice = choices?.[method] ?? 'all';
  return choice === 'all' || !schoolIds.includes(choice) ? schoolIds : [choice];
}

export function appendPromptSchoolGuidance(prompt: string, method: PromptSchoolMethod, schools: readonly string[]) {
  if (!schools.length) return prompt.trim();
  return [prompt.trim(), buildPromptSchoolSection(method, schools)].filter(Boolean).join('\n\n');
}
