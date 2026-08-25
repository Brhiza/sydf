import { calculateSolarTermsForYear, LunarUtil, type SolarTermEvidence } from 'mingyu-core/calendar';

export type CalendarEventType = 'term' | 'festival' | 'commemoration' | 'taoist' | 'sanshan' | 'birthday';

export interface CalendarEvent {
  id: string;
  label: string;
  type: CalendarEventType;
}

export interface CalendarBirthdayProfile {
  id: string;
  label?: string;
  name?: string;
  date: string;
  dateType: 'solar' | 'lunar';
  isLeapMonth?: boolean;
}

const fixedSolarEvents: Record<string, Array<[string, CalendarEventType]>> = {
  '01-01': [['元旦', 'festival']],
  '03-05': [['学雷锋纪念日', 'commemoration']],
  '03-08': [['妇女节', 'festival']],
  '03-12': [['植树节', 'festival']],
  '04-22': [['世界地球日', 'commemoration']],
  '05-01': [['劳动节', 'festival']],
  '05-04': [['青年节', 'festival']],
  '05-12': [['国际护士节', 'commemoration'], ['全国防灾减灾日', 'commemoration']],
  '05-18': [['国际博物馆日', 'commemoration']],
  '06-01': [['儿童节', 'festival']],
  '06-05': [['世界环境日', 'commemoration']],
  '07-01': [['建党纪念日', 'commemoration']],
  '08-01': [['建军节', 'commemoration']],
  '09-03': [['中国人民抗日战争胜利纪念日', 'commemoration']],
  '09-10': [['教师节', 'festival']],
  '09-18': [['九一八事变纪念日', 'commemoration']],
  '09-30': [['烈士纪念日', 'commemoration']],
  '10-01': [['国庆节', 'festival']],
  '11-09': [['全国消防日', 'commemoration']],
  '12-04': [['国家宪法日', 'commemoration']],
  '12-13': [['南京大屠杀死难者国家公祭日', 'commemoration']],
};

const traditionalLunarEvents: Record<string, string[]> = {
  '1-1': ['春节'],
  '1-15': ['元宵节'],
  '2-2': ['龙抬头'],
  '5-5': ['端午节'],
  '7-7': ['七夕'],
  '7-15': ['中元节'],
  '8-15': ['中秋节'],
  '9-9': ['重阳节'],
  '12-8': ['腊八节'],
  '12-23': ['小年'],
};

const taoistLunarEvents: Record<string, string[]> = {
  '1-9': ['玉皇圣诞'],
  '1-15': ['上元天官圣诞'],
  '2-15': ['太上老君圣诞'],
  '3-3': ['玄天上帝圣诞'],
  '4-14': ['吕祖圣诞'],
  '6-24': ['关圣帝君圣诞'],
  '7-15': ['中元地官圣诞'],
  '9-9': ['斗姥元君圣诞'],
  '10-15': ['下元水官圣诞'],
  '11-11': ['太乙救苦天尊圣诞'],
};

const sanshanLunarEvents: Record<string, string[]> = {
  '2-25': ['大王（巾山国王）圣诞'],
  '6-25': ['二王（明山国王）圣诞'],
  '9-25': ['三王（独山国王）圣诞'],
};

const solarTermCache = new Map<number, SolarTermEvidence[]>();

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseDateKey(dateKey: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) throw new Error('日期格式不正确。');
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
  if (formatDateKey(date) !== dateKey) throw new Error('日期不存在。');
  return date;
}

function solarTermsForYear(year: number) {
  const cached = solarTermCache.get(year);
  if (cached) return cached;
  const terms = calculateSolarTermsForYear(year);
  solarTermCache.set(year, terms);
  return terms;
}

function solarTermForDate(dateKey: string, year: number) {
  return solarTermsForYear(year).find((term) => (
    new Date(term.utcTimestamp + 8 * 60 * 60 * 1000).toISOString().slice(0, 10) === dateKey
  ));
}

function addEvent(events: CalendarEvent[], id: string, label: string, type: CalendarEventType) {
  if (!label || events.some((event) => event.label === label)) return;
  events.push({ id, label, type });
}

function addBirthdayEvents(
  events: CalendarEvent[],
  dateKey: string,
  lunar: ReturnType<typeof LunarUtil.getLunar>,
  profiles: readonly CalendarBirthdayProfile[],
) {
  const monthDay = dateKey.slice(5);
  const isLeapLunarMonth = lunar.monthInChinese.startsWith('闰');
  profiles.forEach((profile) => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(profile.date);
    if (!match) return;
    const matches = profile.dateType === 'lunar'
      ? Number(match[2]) === lunar.monthNumber
        && Number(match[3]) === lunar.dayNumber
        && Boolean(profile.isLeapMonth) === isLeapLunarMonth
      : `${match[2]}-${match[3]}` === monthDay;
    if (!matches) return;
    const name = profile.label?.trim() || profile.name?.trim() || '案例';
    addEvent(events, `birthday:${profile.id}`, `${name}生日`, 'birthday');
  });
}

export function getCalendarEvents(dateKey: string, profiles: readonly CalendarBirthdayProfile[] = []) {
  const date = parseDateKey(dateKey);
  const lunar = LunarUtil.getLunar(date);
  const events: CalendarEvent[] = [];
  const term = solarTermForDate(dateKey, date.getFullYear());
  if (term) addEvent(events, `term:${term.name}`, term.name, 'term');

  (fixedSolarEvents[dateKey.slice(5)] || []).forEach(([label, type]) => {
    addEvent(events, `${type}:${dateKey.slice(5)}:${label}`, label, type);
  });

  if (!lunar.monthInChinese.startsWith('闰')) {
    const lunarKey = `${lunar.monthNumber}-${lunar.dayNumber}`;
    (traditionalLunarEvents[lunarKey] || []).forEach((label) => addEvent(events, `festival:${lunarKey}:${label}`, label, 'festival'));
    (taoistLunarEvents[lunarKey] || []).forEach((label) => addEvent(events, `taoist:${lunarKey}:${label}`, label, 'taoist'));
    (sanshanLunarEvents[lunarKey] || []).forEach((label) => addEvent(events, `sanshan:${lunarKey}:${label}`, label, 'sanshan'));
  }

  addBirthdayEvents(events, dateKey, lunar, profiles);
  return events;
}
