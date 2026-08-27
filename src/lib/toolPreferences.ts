export type StoredInstantTimeStandard = 'beijing' | 'true-solar';
export type StoredQimenScope = 'hour' | 'day' | 'month' | 'year';
export type StoredQimenLayout = 'zhuanpan' | 'feipan';
export type StoredQimenJuMethod = 'chaibu' | 'zhirun';
export type StoredTaiyiScope = 'year' | 'month' | 'day' | 'hour';
export type StoredHuangjiMode = 'year' | 'date';

export interface StoredObserverLocation {
  regionKey: string;
  provinceId: string;
  cityId: string;
  regionId: string;
  locationName: string;
  latitude: string;
  longitude: string;
  timezone: string;
}

export interface ToolPreferences {
  instantTimeStandard: StoredInstantTimeStandard;
  instantObserver?: StoredObserverLocation;
  qimenScope: StoredQimenScope;
  qimenLayout: StoredQimenLayout;
  qimenJuMethod: StoredQimenJuMethod;
  taiyiScope: StoredTaiyiScope;
  huangjiMode: StoredHuangjiMode;
}

export const defaultToolPreferences: ToolPreferences = {
  instantTimeStandard: 'beijing',
  qimenScope: 'hour',
  qimenLayout: 'zhuanpan',
  qimenJuMethod: 'chaibu',
  taiyiScope: 'year',
  huangjiMode: 'year',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function allowedValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? value as T : fallback;
}

function normalizeObserverLocation(value: unknown): StoredObserverLocation | undefined {
  if (!isRecord(value)) return undefined;
  const locationName = typeof value.locationName === 'string' ? value.locationName.trim() : '';
  const latitude = typeof value.latitude === 'string' || typeof value.latitude === 'number' ? String(value.latitude) : '';
  const longitude = typeof value.longitude === 'string' || typeof value.longitude === 'number' ? String(value.longitude) : '';
  const timezone = typeof value.timezone === 'string' || typeof value.timezone === 'number' ? String(value.timezone) : '';
  if (!locationName || !Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude)) || !Number.isFinite(Number(timezone))) return undefined;
  const text = (key: keyof StoredObserverLocation) => typeof value[key] === 'string' ? value[key].trim() : '';
  return {
    regionKey: text('regionKey'),
    provinceId: text('provinceId'),
    cityId: text('cityId'),
    regionId: text('regionId'),
    locationName,
    latitude,
    longitude,
    timezone,
  };
}

export function normalizeToolPreferences(value: unknown): ToolPreferences {
  const raw = isRecord(value) ? value : {};
  const instantObserver = normalizeObserverLocation(raw.instantObserver);
  return {
    instantTimeStandard: allowedValue(raw.instantTimeStandard, ['beijing', 'true-solar'], defaultToolPreferences.instantTimeStandard),
    ...(instantObserver ? { instantObserver } : {}),
    qimenScope: allowedValue(raw.qimenScope, ['hour', 'day', 'month', 'year'], defaultToolPreferences.qimenScope),
    qimenLayout: allowedValue(raw.qimenLayout, ['zhuanpan', 'feipan'], defaultToolPreferences.qimenLayout),
    qimenJuMethod: allowedValue(raw.qimenJuMethod, ['chaibu', 'zhirun'], defaultToolPreferences.qimenJuMethod),
    taiyiScope: allowedValue(raw.taiyiScope, ['year', 'month', 'day', 'hour'], defaultToolPreferences.taiyiScope),
    huangjiMode: allowedValue(raw.huangjiMode, ['year', 'date'], defaultToolPreferences.huangjiMode),
  };
}
