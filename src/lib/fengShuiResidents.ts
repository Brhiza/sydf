import { baziCalculator } from 'mingyu-core/bazi';
import { buildChartReadingPrompt } from './chartPrompt';
import { caseBirthSummary, caseDisplayName, type SelectableCaseProfile } from './caseSelection';

export interface FengShuiResidentBaziEntry {
  id: string;
  name: string;
  birth: string;
  prompt: string;
}

export interface FengShuiResidentBaziContext {
  entries: FengShuiResidentBaziEntry[];
  prompt: string;
}

const MAX_ENTRY_LENGTH = 4600;
const MAX_TOTAL_LENGTH = 15000;

function compactPrompt(value: string, maxLength = MAX_ENTRY_LENGTH) {
  if (value.length <= maxLength) return value;
  const slice = value.slice(0, maxLength);
  const breakAt = slice.lastIndexOf('\n');
  return (breakAt > maxLength * .75 ? slice.slice(0, breakAt) : slice).trimEnd();
}

export function buildFengShuiResidentBaziContext(profiles: readonly SelectableCaseProfile[]): FengShuiResidentBaziContext {
  const uniqueProfiles = profiles.filter((profile, index, all) => profile.available !== false
    && all.findIndex((candidate) => candidate.id === profile.id) === index);
  const entries: FengShuiResidentBaziEntry[] = [];
  let remaining = MAX_TOTAL_LENGTH;

  for (const profile of uniqueProfiles) {
    if (remaining <= 600) break;
    try {
      const [year, month, day] = profile.date.split('-').map(Number);
      const [hour, minute] = profile.time.split(':').map(Number);
      const result = baziCalculator.calculateBazi({
        year,
        month,
        day,
        timeIndex: Math.floor(((hour + 1) % 24) / 2),
        birthHour: hour,
        birthMinute: minute,
        gender: profile.gender,
        isLunar: profile.dateType === 'lunar',
        isLeapMonth: profile.dateType === 'lunar' && profile.isLeapMonth,
        useTrueSolarTime: profile.timeBasis === 'trueSolar',
        birthPlace: profile.locationName,
        birthLongitude: Number(profile.longitude),
        timezone: Number(profile.timezone) || 8,
        shenShaScope: 'all',
      });
      const prompt = compactPrompt(buildChartReadingPrompt('bazi', result), Math.min(MAX_ENTRY_LENGTH, remaining));
      entries.push({
        id: profile.id,
        name: caseDisplayName(profile),
        birth: caseBirthSummary(profile),
        prompt,
      });
      remaining -= prompt.length;
    } catch {
      // 单个旧案例资料无法排盘时忽略该成员，其余住宅资料和成员仍可继续使用。
    }
  }

  if (!entries.length) return { entries, prompt: '' };
  const prompt = [
    '【居住成员命理补充】',
    '以下八字资料只用于补充不同居住成员的作息、空间使用和五行偏向。住宅的真实坐向、户型、动线、采光、通风、安全与实际需求优先；不得仅凭八字否定现实可用的布局。多人取向不一致时分别说明，并优先寻找公共空间与个人空间的兼容方案。',
    ...entries.map((entry) => `【成员：${entry.name}】\n${entry.birth}\n${entry.prompt}`),
  ].join('\n\n');
  return { entries, prompt };
}
