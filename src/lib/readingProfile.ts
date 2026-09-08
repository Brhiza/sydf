import type { AiProfileContext } from './ai';
import type { ReadingRecord } from './divination';

export function snapshotReadingProfile(profile: AiProfileContext | null): AiProfileContext | null {
  if (!profile) return null;
  const { label, name, gender, date, dateType, isLeapMonth, time, locationName, timeBasis } = profile;
  return { label, name, gender, date, dateType, isLeapMonth, time, locationName, timeBasis };
}

export function historyReadingProfile(record: ReadingRecord): Partial<AiProfileContext> | null {
  if (record.profile !== undefined) return record.profile ? { ...record.profile } : null;
  // 旧记录只使用当时保存的信息，不从当前案例补齐缺失资料。
  return record.context ? { ...record.context } : null;
}
