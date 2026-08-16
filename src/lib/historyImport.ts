import { kindMeta, type DivinationKind, type ReadingRecord, type ReadingResult } from './divination';

export const HISTORY_STORAGE_KEY = 'shiyue-history';
export const LEGACY_HISTORY_STORAGE_KEY = 'sydf-history';
export const LEGACY_HISTORY_MIGRATION_KEY = 'shiyue-sydf-history-migrated-v1';
// 兼容旧版可配置的最高历史容量，迁移时不静默丢弃第 101 条之后的数据。
export const HISTORY_LIMIT = 1000;

export interface LegacyTarotCard {
  name: string;
  position: string;
  reversed: boolean;
}

export interface LegacyTarotResult {
  kind: 'tarot';
  spreadName: string;
  cards: LegacyTarotCard[];
}

export interface LegacyDailyAspect {
  label: string;
  score?: number;
  description: string;
  advice: string;
}

export interface LegacyDailyResult {
  kind: 'daily';
  date: string;
  score?: number;
  luck: string;
  description: string;
  aspects: LegacyDailyAspect[];
  lucky: {
    numbers: string;
    colors: string;
    directions: string;
    time: string;
  };
}

export interface LegacyHistoryRecord {
  id: string;
  kind: 'tarot' | 'daily';
  methodLabel: string;
  question: string;
  createdAt: number;
  result: LegacyTarotResult | LegacyDailyResult;
  interpretation?: string;
  interpretationError?: string;
  legacySource: 'sydf.cc';
}

export type HistoryRecordEntry = ReadingRecord | LegacyHistoryRecord;
export type HistoryRecordCategory = 'divination' | 'oracle' | 'chart';

export interface HistoryImportResult {
  records: HistoryRecordEntry[];
  total: number;
  skipped: number;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function optionalText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function stringList(value: unknown): string {
  if (!Array.isArray(value)) return '';
  return value.filter((item): item is string | number => typeof item === 'string' || typeof item === 'number').join('、');
}

function stableLegacyId(rawId: unknown, type: string, timestamp: number, question: string): string {
  if (isNonEmptyString(rawId)) return `sydf-legacy-${rawId.trim()}`;
  const input = `${type}|${timestamp}|${question}`;
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `sydf-legacy-${timestamp}-${(hash >>> 0).toString(16)}`;
}

function resolveInterpretation(record: Record<string, unknown>, result: Record<string, unknown>): string | undefined {
  const direct = optionalText(result.aiResponse);
  if (direct) return direct;
  if (!Array.isArray(record.conversationHistory)) return undefined;
  const assistantMessages = record.conversationHistory
    .filter(isObject)
    .filter((message) => message.role === 'assistant' && message.isError !== true)
    .map((message) => optionalText(message.content))
    .filter(Boolean);
  return assistantMessages.at(-1);
}

function isSupportedModernResult(kind: DivinationKind, data: Record<string, unknown>): boolean {
  switch (kind) {
    case 'meihua':
      return isObject(data.mainHexagram)
        && Array.isArray(data.yaosDetail)
        && isObject(data.tiGua)
        && isObject(data.yongGua)
        && isObject(data.ganzhi)
        && isObject(data.analysis)
        && isObject(data.movingYao);
    case 'liuyao':
      return Array.isArray(data.yaoArray)
        && Array.isArray(data.yaosDetail)
        && Array.isArray(data.changingYaos)
        && Array.isArray(data.voidBranches)
        && isObject(data.palace)
        && isObject(data.ganzhi);
    case 'qimen':
      return Array.isArray(data.jiuGongGe)
        && data.jiuGongGe.every((palace) => isObject(palace)
          && isObject(palace.tianPan)
          && isObject(palace.diPan)
          && isObject(palace.renPan)
          && isObject(palace.shenPan))
        && isObject(data.ganzhi)
        && isObject(data.timeInfo);
    case 'ssgw':
      return optionalNumber(data.number) !== undefined && typeof data.title === 'string' && typeof data.poem === 'string';
    default:
      return false;
  }
}

function convertTarot(data: Record<string, unknown>): LegacyTarotResult | null {
  if (!Array.isArray(data.cards)) return null;
  const cards = data.cards.filter(isObject).flatMap((card) => {
    if (!isNonEmptyString(card.name)) return [];
    return [{
      name: card.name.trim(),
      position: optionalText(card.position) || '牌位',
      reversed: card.reversed === true,
    }];
  });
  return {
    kind: 'tarot',
    spreadName: optionalText(data.spreadName) || '塔罗牌阵',
    cards,
  };
}

const dailyAspectLabels: Record<string, string> = {
  career: '事业',
  wealth: '财运',
  relationship: '感情',
  health: '健康',
};

function convertDaily(data: Record<string, unknown>): LegacyDailyResult | null {
  if (!isObject(data.overall)) return null;
  const aspects = isObject(data.aspects)
    ? Object.entries(dailyAspectLabels).flatMap(([key, label]) => {
      const value = data.aspects;
      if (!isObject(value) || !isObject(value[key])) return [];
      const aspect = value[key] as Record<string, unknown>;
      return [{
        label,
        score: optionalNumber(aspect.score),
        description: optionalText(aspect.description),
        advice: optionalText(aspect.advice),
      }];
    })
    : [];
  const lucky = isObject(data.lucky) ? data.lucky : {};
  return {
    kind: 'daily',
    date: optionalText(data.date),
    score: optionalNumber(data.overall.score),
    luck: optionalText(data.overall.luck),
    description: optionalText(data.overall.description),
    aspects,
    lucky: {
      numbers: stringList(lucky.numbers),
      colors: stringList(lucky.colors),
      directions: stringList(lucky.directions),
      time: optionalText(lucky.time),
    },
  };
}

function convertLegacyRecord(value: unknown): HistoryRecordEntry | null {
  if (!isObject(value) || !isObject(value.result) || !isObject(value.result.data)) return null;
  const rawType = optionalText(value.type);
  const type = rawType === 'tarot_single' ? 'tarot' : rawType;
  const timestamp = optionalNumber(value.timestamp);
  if (!type || timestamp === undefined || typeof value.question !== 'string') return null;
  const question = value.question.trim() || '未命名记录';
  const data = value.result.data;
  const interpretation = resolveInterpretation(value, value.result);
  const id = stableLegacyId(value.id, type, timestamp, question);

  if (type === 'tarot') {
    const result = convertTarot(data);
    return result ? { id, kind: 'tarot', methodLabel: '塔罗牌', question, createdAt: timestamp, result, interpretation, legacySource: 'sydf.cc' } : null;
  }
  if (type === 'daily') {
    const result = convertDaily(data);
    return result ? { id, kind: 'daily', methodLabel: '今日运势', question, createdAt: timestamp, result, interpretation, legacySource: 'sydf.cc' } : null;
  }
  if (!(type in kindMeta)) return null;
  const kind = type as DivinationKind;
  if (!isSupportedModernResult(kind, data)) return null;
  return {
    id,
    kind,
    methodLabel: kindMeta[kind].label,
    question,
    createdAt: timestamp,
    result: data as unknown as ReadingResult,
    ...(interpretation ? { interpretation } : {}),
  };
}

export function isLegacyHistoryRecord(record: HistoryRecordEntry): record is LegacyHistoryRecord {
  return 'legacySource' in record && record.legacySource === 'sydf.cc';
}

export function getHistoryRecordCategory(record: HistoryRecordEntry): HistoryRecordCategory {
  if (record.kind === 'ssgw') return 'oracle';
  if (['bazi', 'ziwei', 'astrolabe', 'qizheng'].includes(record.kind) || record.methodLabel === '八字紫微合参') return 'chart';
  return 'divination';
}

export function isRetainedHistoryRecord(record: HistoryRecordEntry): boolean {
  return record.kind !== 'almanac' && record.kind !== 'daily';
}

export function isCurrentHistoryRecord(value: unknown): value is ReadingRecord {
  if (!isObject(value) || !isNonEmptyString(value.id) || !isNonEmptyString(value.kind)) return false;
  if (!(value.kind in kindMeta) || !isNonEmptyString(value.methodLabel) || typeof value.question !== 'string') return false;
  return optionalNumber(value.createdAt) !== undefined && isObject(value.result);
}

export function parseStoredHistory(value: unknown): HistoryRecordEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter((record): record is HistoryRecordEntry => {
    if (isCurrentHistoryRecord(record)) return record.kind !== 'almanac';
    return isObject(record)
      && record.legacySource === 'sydf.cc'
      && record.kind === 'tarot'
      && isNonEmptyString(record.id)
      && typeof record.question === 'string'
      && optionalNumber(record.createdAt) !== undefined
      && isObject(record.result)
      && record.result.kind === record.kind;
  });
}

export function parseLegacyHistory(value: unknown): HistoryImportResult {
  const payload = isObject(value) && Array.isArray(value.records) ? value.records : value;
  if (!Array.isArray(payload)) throw new Error('旧历史中没有可识别的记录。');
  const records = payload.flatMap((record) => {
    const converted = convertLegacyRecord(record);
    return converted && isRetainedHistoryRecord(converted) ? [converted] : [];
  });
  return { records, total: payload.length, skipped: payload.length - records.length };
}

export function mergeHistoryRecords(
  existing: HistoryRecordEntry[],
  imported: HistoryRecordEntry[],
  limit = HISTORY_LIMIT,
): { records: HistoryRecordEntry[]; added: number; omittedByLimit: number } {
  const retainedExisting = existing.filter(isRetainedHistoryRecord);
  const existingIds = new Set(retainedExisting.map((record) => record.id));
  const uniqueImported = imported.filter(isRetainedHistoryRecord).filter((record) => {
    if (existingIds.has(record.id)) return false;
    existingIds.add(record.id);
    return true;
  });
  const merged = [...retainedExisting, ...uniqueImported].sort((left, right) => right.createdAt - left.createdAt);
  return {
    records: merged.slice(0, limit),
    added: uniqueImported.length,
    omittedByLimit: Math.max(0, merged.length - limit),
  };
}

export function updateHistoryInterpretation(
  records: HistoryRecordEntry[],
  recordId: string | null | undefined,
  interpretation: string,
): HistoryRecordEntry[] {
  const content = interpretation.trim();
  if (!recordId || !content) return records;
  const index = records.findIndex((record) => record.id === recordId);
  if (index < 0 || records[index].interpretation === content) return records;
  const updated = [...records];
  updated[index] = { ...updated[index], interpretation: content, interpretationError: undefined };
  return updated;
}

export function updateHistoryInterpretationError(
  records: HistoryRecordEntry[],
  recordId: string | null | undefined,
  errorMessage: string,
): HistoryRecordEntry[] {
  const content = errorMessage.trim();
  if (!recordId || !content) return records;
  const index = records.findIndex((record) => record.id === recordId);
  if (index < 0 || records[index].interpretation?.trim() || records[index].interpretationError === content) return records;
  const updated = [...records];
  updated[index] = { ...updated[index], interpretationError: content };
  return updated;
}
