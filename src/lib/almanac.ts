import {
  calculateSolarTermsForYear,
  getBirthDateValidationMessage,
  LunarUtil,
  resolveTrueSolarBirthTime,
} from 'mingyu-core/calendar';
import {
  generateAlmanacSelection,
  type AlmanacCandidateEvidence,
  type AlmanacCandidateStatus,
} from 'mingyu-core/divination/almanac';
import type {
  AlmanacData,
  AlmanacDayCandidate,
  AlmanacParticipantInput,
  AlmanacTopic,
} from 'mingyu-core/types';
import type { BirthForm } from './divination';

export type AlmanacMode = 'general' | 'personal';

export interface AlmanacProfile extends BirthForm {
  id: string;
  label: string;
}

export interface LocalAlmanacRequest {
  mode: AlmanacMode;
  topic: AlmanacPurpose | 'custom';
  startDate: string;
  endDate: string;
  profile?: AlmanacProfile | null;
  profiles?: AlmanacProfile[] | null;
}

export interface AlmanacCalendarDateMeta {
  lunarLabel: string;
  eventLabel: string;
  eventType: 'festival' | 'term' | null;
}

type CoreAlmanacTopic = Exclude<AlmanacTopic, 'custom'>;

export type AlmanacPurpose =
  | 'career-interview'
  | 'career-onboarding'
  | 'career-project-launch'
  | 'career-product-launch'
  | 'property-purchase'
  | 'property-rental'
  | 'purchase-vehicle'
  | 'purchase-major'
  | 'office-relocation'
  | 'home-device-install'
  | 'home-cleaning'
  | 'home-pet-arrival'
  | 'life-family-meeting'
  | 'life-gathering'
  | 'life-haircut'
  | 'medical-checkup'
  | 'marriage-engagement'
  | 'marriage-registration'
  | 'marriage-wedding'
  | 'move-relocation'
  | 'move-entry'
  | 'move-bed'
  | 'renovation-start'
  | 'renovation-ground'
  | 'renovation-beam'
  | 'renovation-door'
  | 'opening-business'
  | 'opening-work'
  | 'contract-signing'
  | 'contract-trading'
  | 'contract-finance'
  | 'travel-trip'
  | 'travel-appointment'
  | 'study-enrollment'
  | 'study-exam'
  | 'study-training'
  | 'study-prayer'
  | 'study-worship'
  | 'study-child'
  | 'medical-visit'
  | 'medical-treatment'
  | 'medical-recovery'
  | 'burial-funeral'
  | 'burial-tomb'
  | 'burial-relocation';

export type AlmanacAuspiceLevel = '大吉' | '吉' | '小吉' | '平' | '慎用' | '不宜';

export interface AlmanacPurposeOption {
  value: AlmanacPurpose;
  label: string;
  coreTopic: AlmanacTopic;
  keywords: string[];
}

export interface AlmanacPurposeEvaluation {
  level: AlmanacAuspiceLevel;
  usable: boolean;
  reason: string;
  matchedRecommends: string[];
  matchedAvoids: string[];
  goodGodCount: number;
  badGodCount: number;
}

const solarFestivalLabels: Record<string, string> = {
  '01-01': '元旦',
  '03-08': '妇女节',
  '03-12': '植树节',
  '05-01': '劳动节',
  '05-04': '青年节',
  '06-01': '儿童节',
  '07-01': '建党节',
  '08-01': '建军节',
  '09-10': '教师节',
  '10-01': '国庆节',
};

const lunarFestivalLabels: Record<string, string> = {
  '1-1': '春节',
  '1-15': '元宵节',
  '5-5': '端午节',
  '7-7': '七夕',
  '7-15': '中元节',
  '8-15': '中秋节',
  '9-9': '重阳节',
  '12-8': '腊八节',
  '12-23': '小年',
};

const solarTermDateCache = new Map<number, Map<string, string>>();
const calendarDateMetaCache = new Map<string, AlmanacCalendarDateMeta>();

export const almanacTopicGroups: Array<{ label: string; options: AlmanacPurposeOption[] }> = [
  { label: '职场与项目', options: [
    { value: 'career-interview', label: '求职面试', coreTopic: 'custom', keywords: ['雇佣', '会亲友'] },
    { value: 'career-onboarding', label: '入职到岗', coreTopic: 'travel', keywords: ['赴任', '出行'] },
    { value: 'career-project-launch', label: '项目启动', coreTopic: 'opening', keywords: ['开市', '祈福'] },
    { value: 'career-product-launch', label: '产品或网站上线', coreTopic: 'opening', keywords: ['开市', '挂匾'] },
  ] },
  { label: '房产与消费', options: [
    { value: 'property-purchase', label: '买房签约', coreTopic: 'contract', keywords: ['置产', '交易', '立券'] },
    { value: 'property-rental', label: '租房签约', coreTopic: 'contract', keywords: ['交易', '立券'] },
    { value: 'purchase-vehicle', label: '购车提车', coreTopic: 'contract', keywords: ['交易', '纳财'] },
    { value: 'purchase-major', label: '大额采购', coreTopic: 'contract', keywords: ['交易', '纳财'] },
  ] },
  { label: '现代居家', options: [
    { value: 'office-relocation', label: '办公室搬迁', coreTopic: 'move', keywords: ['移徙', '入宅'] },
    { value: 'home-device-install', label: '安装重要设备', coreTopic: 'custom', keywords: ['安机械'] },
    { value: 'home-cleaning', label: '搬家清洁或大扫除', coreTopic: 'custom', keywords: ['扫舍'] },
    { value: 'home-pet-arrival', label: '迎接宠物到家', coreTopic: 'custom', keywords: ['纳畜'] },
  ] },
  { label: '日常生活', options: [
    { value: 'life-family-meeting', label: '见家长', coreTopic: 'custom', keywords: ['会亲友', '归宁'] },
    { value: 'life-gathering', label: '聚会或团建', coreTopic: 'custom', keywords: ['会亲友'] },
    { value: 'life-haircut', label: '理发造型', coreTopic: 'custom', keywords: ['理发', '整手足甲', '沐浴'] },
    { value: 'medical-checkup', label: '体检复查', coreTopic: 'medical', keywords: ['求医'] },
  ] },
  { label: '婚嫁', options: [
    { value: 'marriage-engagement', label: '订婚纳采', coreTopic: 'marriage', keywords: ['纳采', '订盟'] },
    { value: 'marriage-registration', label: '登记领证', coreTopic: 'marriage', keywords: ['嫁娶'] },
    { value: 'marriage-wedding', label: '举办婚礼', coreTopic: 'marriage', keywords: ['嫁娶', '会亲友', '安床'] },
  ] },
  { label: '搬迁与修造', options: [
    { value: 'move-relocation', label: '搬家移徙', coreTopic: 'move', keywords: ['移徙'] },
    { value: 'move-entry', label: '入宅乔迁', coreTopic: 'move', keywords: ['入宅'] },
    { value: 'move-bed', label: '安床置床', coreTopic: 'move', keywords: ['安床'] },
    { value: 'renovation-start', label: '装修开工', coreTopic: 'renovation', keywords: ['修造', '拆卸'] },
    { value: 'renovation-ground', label: '动土起基', coreTopic: 'renovation', keywords: ['动土', '起基'] },
    { value: 'renovation-beam', label: '上梁盖屋', coreTopic: 'renovation', keywords: ['竖柱', '上梁', '盖屋'] },
    { value: 'renovation-door', label: '安装门户', coreTopic: 'renovation', keywords: ['安门'] },
  ] },
  { label: '事业与交易', options: [
    { value: 'opening-business', label: '开业开张', coreTopic: 'opening', keywords: ['开市', '挂匾'] },
    { value: 'opening-work', label: '开工启用', coreTopic: 'opening', keywords: ['开市', '祈福'] },
    { value: 'contract-signing', label: '签约立券', coreTopic: 'contract', keywords: ['立券'] },
    { value: 'contract-trading', label: '交易买卖', coreTopic: 'contract', keywords: ['交易'] },
    { value: 'contract-finance', label: '纳财开仓', coreTopic: 'contract', keywords: ['纳财', '开仓', '出货财'] },
  ] },
  { label: '出行与赴任', options: [
    { value: 'travel-trip', label: '出行远游', coreTopic: 'travel', keywords: ['出行'] },
    { value: 'travel-appointment', label: '上任赴职', coreTopic: 'travel', keywords: ['赴任'] },
  ] },
  { label: '学业与祈愿', options: [
    { value: 'study-enrollment', label: '入学报名', coreTopic: 'study', keywords: ['入学'] },
    { value: 'study-exam', label: '考试应试', coreTopic: 'study', keywords: ['入学', '祈福'] },
    { value: 'study-training', label: '拜师进修', coreTopic: 'study', keywords: ['入学', '会亲友'] },
    { value: 'study-prayer', label: '祈福还愿', coreTopic: 'study', keywords: ['祈福'] },
    { value: 'study-worship', label: '祭祀礼拜', coreTopic: 'study', keywords: ['祭祀'] },
    { value: 'study-child', label: '求嗣祈子', coreTopic: 'study', keywords: ['求嗣'] },
  ] },
  { label: '医疗与康复', options: [
    { value: 'medical-visit', label: '求医问诊', coreTopic: 'medical', keywords: ['求医', '治病'] },
    { value: 'medical-treatment', label: '手术治疗', coreTopic: 'medical', keywords: ['治病', '解除'] },
    { value: 'medical-recovery', label: '康复调养', coreTopic: 'medical', keywords: ['解除', '沐浴'] },
  ] },
  { label: '丧葬与修坟', options: [
    { value: 'burial-funeral', label: '入殓安葬', coreTopic: 'burial', keywords: ['入殓', '安葬', '移柩', '成服', '除服'] },
    { value: 'burial-tomb', label: '修坟立碑', coreTopic: 'burial', keywords: ['修坟', '立碑'] },
    { value: 'burial-relocation', label: '迁坟启钻', coreTopic: 'burial', keywords: ['启钻', '移柩'] },
  ] },
];

export const almanacTopicOptions = almanacTopicGroups.flatMap((group) => group.options);
const almanacPurposeMap = new Map(almanacTopicOptions.map((item) => [item.value, item]));

export function getDefaultAlmanacPurpose(topic: AlmanacTopic): AlmanacPurpose {
  const defaults: Record<CoreAlmanacTopic, AlmanacPurpose> = {
    marriage: 'marriage-wedding',
    move: 'move-entry',
    opening: 'opening-business',
    contract: 'contract-signing',
    travel: 'travel-trip',
    medical: 'medical-visit',
    study: 'study-exam',
    burial: 'burial-funeral',
    renovation: 'renovation-start',
  };
  return topic === 'custom' ? 'study-exam' : defaults[topic];
}

function requireAlmanacPurpose(purpose: AlmanacPurpose) {
  const definition = almanacPurposeMap.get(purpose);
  if (!definition) throw new Error('请选择需要择日的具体事项。');
  return definition;
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getSolarTermDates(year: number) {
  const cached = solarTermDateCache.get(year);
  if (cached) return cached;
  const result = new Map<string, string>();
  if (year >= 1900 && year <= 2199) {
    for (const term of calculateSolarTermsForYear(year)) {
      const chinaDate = new Date(term.utcTimestamp + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
      result.set(chinaDate, term.name);
    }
  }
  solarTermDateCache.set(year, result);
  return result;
}

export function getAlmanacCalendarDateMeta(dateKey: string): AlmanacCalendarDateMeta {
  const cached = calendarDateMetaCache.get(dateKey);
  if (cached) return cached;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) throw new Error('日期格式不正确。');
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
  if (formatDateKey(date) !== dateKey) throw new Error('日期不存在。');

  const lunar = LunarUtil.getLunar(date);
  const term = getSolarTermDates(date.getFullYear()).get(dateKey) || '';
  const lunarFestival = lunarFestivalLabels[`${lunar.monthNumber}-${lunar.dayNumber}`] || '';
  const solarFestival = solarFestivalLabels[dateKey.slice(5)] || '';
  const eventLabel = term || lunarFestival || solarFestival;
  const meta: AlmanacCalendarDateMeta = {
    lunarLabel: `${lunar.monthInChinese}${lunar.dayInChinese}`,
    eventLabel,
    eventType: term ? 'term' : eventLabel ? 'festival' : null,
  };
  calendarDateMetaCache.set(dateKey, meta);
  return meta;
}

function parseBirth(profile: BirthForm) {
  const [year, month, day] = profile.date.split('-').map(Number);
  const [hour, minute] = profile.time.split(':').map(Number);
  if (![year, month, day, hour, minute].every(Number.isFinite)) throw new Error('当前案例的出生日期或时间不完整。');
  return { year, month, day, hour, minute };
}

function hourIndex(hour: number) {
  return Math.floor(((hour + 1) % 24) / 2);
}

export function getDefaultAlmanacMonth(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function getAlmanacMonthRange(monthKey: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!match) throw new Error('月份格式不正确。');
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (year < 1900 || year > 2100 || month < 1 || month > 12) throw new Error('请选择 1900 年至 2100 年之间的月份。');
  const start = new Date(year, month - 1, 1, 12, 0, 0, 0);
  const end = new Date(year, month, 0, 12, 0, 0, 0);
  return { startDate: formatDateKey(start), endDate: formatDateKey(end) };
}

export function getAlmanacPeriodRange(monthCount: 1 | 3 | 6 | 12, now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
  const targetMonthStart = new Date(start.getFullYear(), start.getMonth() + monthCount, 1, 12, 0, 0, 0);
  const targetMonthLastDay = new Date(targetMonthStart.getFullYear(), targetMonthStart.getMonth() + 1, 0, 12, 0, 0, 0).getDate();
  const endExclusive = new Date(
    targetMonthStart.getFullYear(),
    targetMonthStart.getMonth(),
    Math.min(start.getDate(), targetMonthLastDay),
    12,
    0,
    0,
    0,
  );
  const end = new Date(endExclusive);
  end.setDate(end.getDate() - 1);
  if (end.getFullYear() > 2100) throw new Error('查看范围不能超过 2100 年。');
  return { startDate: formatDateKey(start), endDate: formatDateKey(end) };
}

export function getAlmanacDateChunks(startDate: string, endDate: string) {
  const parseDate = (value: string) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) throw new Error('日期格式不正确。');
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
    if (formatDateKey(date) !== value) throw new Error('日期不存在。');
    return date;
  };
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (end < start) throw new Error('查看范围不正确。');
  const chunks: Array<{ startDate: string; endDate: string }> = [];
  let cursor = start;
  while (cursor <= end) {
    const chunkEnd = new Date(cursor);
    chunkEnd.setDate(chunkEnd.getDate() + 30);
    if (chunkEnd > end) chunkEnd.setTime(end.getTime());
    chunks.push({ startDate: formatDateKey(cursor), endDate: formatDateKey(chunkEnd) });
    cursor = new Date(chunkEnd);
    cursor.setDate(cursor.getDate() + 1);
  }
  return chunks;
}

export function shiftAlmanacMonth(monthKey: string, amount: number) {
  const range = getAlmanacMonthRange(monthKey);
  const [year, month] = range.startDate.split('-').map(Number);
  const shifted = new Date(year, month - 1 + amount, 1, 12, 0, 0, 0);
  return getDefaultAlmanacMonth(shifted);
}

export function isAlmanacProfileComplete(profile?: AlmanacProfile | null) {
  if (!profile || !/^\d{4}-\d{2}-\d{2}$/.test(profile.date) || !/^\d{2}:\d{2}$/.test(profile.time)) return false;
  const { year, month, day, hour, minute } = parseBirth(profile);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return false;
  return !getBirthDateValidationMessage({
    year,
    month,
    day,
    dateType: profile.dateType,
    isLeapMonth: profile.dateType === 'lunar' && profile.isLeapMonth,
  });
}

export function createAlmanacParticipant(profile: AlmanacProfile): AlmanacParticipantInput {
  const original = parseBirth(profile);
  let parts = original;
  let timeIndex = hourIndex(original.hour);
  let dateType: 'solar' | 'lunar' = profile.dateType;
  let isLeapMonth = profile.dateType === 'lunar' && profile.isLeapMonth;

  if (profile.timeBasis === 'trueSolar') {
    const corrected = resolveTrueSolarBirthTime({
      dateType,
      ...original,
      isLeapMonth,
      longitude: Number(profile.longitude),
      timezone: Number(profile.timezone) || 8,
      applyChinaDst: true,
    });
    parts = corrected.correctedTime;
    timeIndex = corrected.timeIndex;
    dateType = 'solar';
    isLeapMonth = false;
  }

  return {
    id: profile.id,
    name: profile.name.trim() || profile.label,
    gender: profile.gender === 'male' ? '男' : '女',
    year: String(parts.year),
    month: String(parts.month),
    day: String(parts.day),
    timeIndex: String(timeIndex),
    dateType,
    isLeapMonth,
  };
}

export function generateLocalAlmanac(request: LocalAlmanacRequest): AlmanacData {
  const participants = request.mode === 'personal'
    ? requirePersonalProfiles(request.profiles?.length ? request.profiles : request.profile ? [request.profile] : [])
      .map(createAlmanacParticipant)
    : [];

  const purpose = request.topic === 'custom' ? null : requireAlmanacPurpose(request.topic);

  const result = generateAlmanacSelection({
    topic: purpose?.coreTopic || 'custom',
    startDate: request.startDate,
    endDate: request.endDate,
    participants,
  });
  return purpose ? { ...result, topicLabel: purpose.label } : result;
}

function requirePersonalProfile(profile?: AlmanacProfile | null): AlmanacProfile {
  if (!isAlmanacProfileComplete(profile)) throw new Error('请先添加并完善出生日期和时间，再使用个人历。');
  return profile as AlmanacProfile;
}

function requirePersonalProfiles(profiles: Array<AlmanacProfile | null | undefined>): AlmanacProfile[] {
  const uniqueProfiles = profiles
    .filter((profile): profile is AlmanacProfile => Boolean(profile))
    .filter((profile, index, all) => all.findIndex((candidate) => candidate.id === profile.id) === index)
    .map(requirePersonalProfile);
  if (!uniqueProfiles.length) throw new Error('请先选择至少一个资料完整的案例，再使用个人历。');
  return uniqueProfiles;
}

export function findAlmanacEvidence(result: AlmanacData, date: string): AlmanacCandidateEvidence | null {
  return result.evidenceAnalysis?.candidates.find((candidate) => candidate.date === date) || null;
}

export function getAlmanacCandidateStatus(result: AlmanacData, day: AlmanacDayCandidate): AlmanacCandidateStatus {
  return findAlmanacEvidence(result, day.date)?.status || (day.cautions.length ? '条件候选' : '可用候选');
}

function matchAlmanacKeywords(values: string[], keywords: string[]) {
  return [...new Set(values.filter((value) => keywords.some((keyword) => value.includes(keyword))))];
}

export function evaluateAlmanacPurposeDay(
  result: AlmanacData,
  day: AlmanacDayCandidate,
  purpose: AlmanacPurpose,
): AlmanacPurposeEvaluation {
  const definition = requireAlmanacPurpose(purpose);
  const evidence = findAlmanacEvidence(result, day.date);
  const status = getAlmanacCandidateStatus(result, day);
  const matchedRecommends = matchAlmanacKeywords(day.recommends, definition.keywords);
  const matchedAvoids = matchAlmanacKeywords(day.avoids, definition.keywords);
  const goodGodCount = evidence?.godFacts.filter((fact) => fact.classification === '吉神').length || 0;
  const badGodCount = evidence?.godFacts.filter((fact) => fact.classification === '凶神').length || 0;
  const directConflictCount = evidence?.participantConflicts.length || 0;
  const strongConstraintCount = evidence?.decisionFact.strongConstraintTexts.length || 0;

  let level: AlmanacAuspiceLevel;
  if (matchedAvoids.length || status === '慎用候选') {
    level = matchedAvoids.length > 1 || directConflictCount > 0 || strongConstraintCount > 1 ? '不宜' : '慎用';
  } else if (status === '条件候选') {
    level = '慎用';
  } else if (!matchedRecommends.length) {
    level = '平';
  } else {
    const godBalance = goodGodCount - badGodCount;
    if ((matchedRecommends.length >= 2 && godBalance > 0) || godBalance >= 4) level = '大吉';
    else if (matchedRecommends.length >= 2 || godBalance >= 0) level = '吉';
    else level = '小吉';
  }

  const reason = level === '大吉'
    ? '各项条件较协调，可优先考虑。'
    : level === '吉'
      ? '条件相符且无明显冲突，可与其他日期比较。'
      : level === '小吉'
        ? '基本条件相符，可作为备选。'
        : level === '平'
          ? '没有明显利弊，按现实安排决定。'
          : level === '慎用'
            ? '存在需要避让的条件，非必要可换一天。'
            : '不利条件较明显，不建议选择。';

  return {
    level,
    usable: level === '大吉' || level === '吉' || level === '小吉',
    reason,
    matchedRecommends,
    matchedAvoids,
    goodGodCount,
    badGodCount,
  };
}
