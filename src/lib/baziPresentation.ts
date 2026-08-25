import type {
  BaziChartResult,
  FortuneTriggerEvidenceResult,
  FortuneTriggerRelation,
  FortuneTriggerRelationType,
  SolarDateTimeInfo,
} from 'mingyu-core/bazi';

export function filterCommonBaziShensha(
  names: readonly string[] | null | undefined,
  commonNames: readonly string[],
): string[] {
  const uniqueNames = new Set<string>();
  for (const value of names || []) {
    const name = value.trim();
    if (name && commonNames.some((commonName) => name.includes(commonName))) uniqueNames.add(name);
  }
  return [...uniqueNames];
}

interface BaziFortuneColumnSelection {
  cycle?: { ganZhi: string; isXiaoyun?: boolean } | null;
  year?: { ganZhi: string; xiaoyun?: { ganZhi: string } } | null;
  month?: { ganZhi: string } | null;
  hour?: { ganZhi: string } | null;
}

export function resolveSelectedBaziFortuneGanZhi(selection: BaziFortuneColumnSelection) {
  const dayun = selection.cycle?.isXiaoyun
    ? selection.year?.xiaoyun?.ganZhi || selection.cycle.ganZhi
    : selection.cycle?.ganZhi || '';
  return {
    dayun,
    liunian: selection.year?.ganZhi || '',
    liuyue: selection.month?.ganZhi || '',
    liushi: selection.hour?.ganZhi || '',
  };
}

function padBaziTime(value: number): string {
  return String(value).padStart(2, '0');
}

function isSameBaziDate(left: SolarDateTimeInfo, right: SolarDateTimeInfo): boolean {
  return left.year === right.year && left.month === right.month && left.day === right.day;
}

function formatBaziDateTime(value: SolarDateTimeInfo, includeDate: boolean): string {
  const clock = `${padBaziTime(value.hour)}:${padBaziTime(value.minute)}`;
  return includeDate ? `${value.month}月${value.day}日 ${clock}` : clock;
}

function formatCorrectionMinutes(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? '+' : ''}${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}`;
}

export function formatBaziTimingBasis(result: Pick<BaziChartResult, 'timeInfo' | 'timing'>): string {
  const timing = result.timing;
  if (!timing) return `标准时间 ${padBaziTime(result.timeInfo.hour)}:${padBaziTime(result.timeInfo.minute)}`;
  const place = timing.birthPlace?.trim() ? ` · ${timing.birthPlace.trim()}` : '';
  if (!timing.enabled) return `标准时间 ${formatBaziDateTime(timing.standardTime, false)}${place}`;
  const crossesDate = !isSameBaziDate(timing.standardTime, timing.correctedTime);
  const boundaryNote = timing.evidence.status === '存在时间记录边界' ? ' · 时间记录需核验' : '';
  return `真太阳时 ${formatBaziDateTime(timing.correctedTime, crossesDate)}（标准时 ${formatBaziDateTime(timing.standardTime, crossesDate)}，校正${formatCorrectionMinutes(timing.totalCorrectionMinutes)}分钟）${place}${boundaryNote}`;
}

const baziFortuneRelationLabels: Record<FortuneTriggerRelationType, string> = {
  'pillar-fuyin': '同柱伏吟',
  'tianke-dichong': '天克地冲',
  'suiyun-binglin': '岁运并临',
  'stem-same': '天干同干',
  'stem-combine': '天干五合',
  'stem-clash': '天干相冲',
  'branch-same': '地支伏吟',
  'branch-combine': '地支六合',
  'branch-clash': '地支相冲',
  'branch-punishment': '地支相刑',
  'branch-harm': '地支相害',
  'branch-break': '地支相破',
};

const baziSupportingRelationPriority: Partial<Record<FortuneTriggerRelationType, number>> = {
  'branch-clash': 1,
  'branch-punishment': 2,
  'branch-harm': 3,
  'branch-break': 4,
  'branch-combine': 5,
  'stem-clash': 6,
  'stem-combine': 7,
  'branch-same': 8,
  'stem-same': 9,
};

function baziFortuneRelationPairKey(relation: FortuneTriggerRelation): string {
  return `${relation.sourceLayerKey}|${relation.targetLayerKey}`;
}

function formatBaziFortuneRelation(relation: FortuneTriggerRelation): string {
  return `${relation.source.label}${relation.source.ganZhi}与${relation.target.label}${relation.target.ganZhi} · ${baziFortuneRelationLabels[relation.type]}`;
}

export function summarizeBaziFortuneTriggers(
  evidence: Pick<FortuneTriggerEvidenceResult, 'primaryRelations' | 'supportingRelations' | 'formations'>,
  limit = 5,
): string[] {
  const primaryPairs = new Set(evidence.primaryRelations.map(baziFortuneRelationPairKey));
  const supportingRelations = [...evidence.supportingRelations]
    .filter((relation) => !primaryPairs.has(baziFortuneRelationPairKey(relation)))
    .sort((left, right) => (
      (baziSupportingRelationPriority[left.type] || 99) - (baziSupportingRelationPriority[right.type] || 99)
    ));
  const summaries = [
    ...evidence.primaryRelations.map(formatBaziFortuneRelation),
    ...evidence.formations.map((formation) => formation.label),
    ...supportingRelations.map(formatBaziFortuneRelation),
  ];
  return [...new Set(summaries)].slice(0, Math.max(0, limit));
}
