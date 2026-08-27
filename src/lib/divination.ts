import type { BaziChartResult } from 'mingyu-core/bazi';
import { LunarUtil, resolveTrueSolarBirthTime } from 'mingyu-core/calendar';
import type { QizhengResult } from 'mingyu-core/qizheng';
import type { WuyunLiuqiResult } from 'mingyu-core/wuyun-liuqi';
import type { HuangjiJingshiResult } from 'mingyu-core/huangji-jingshi';
import type { DecadalTimelineOption } from 'mingyu-core/ziwei/iztro';
import type {
  AlmanacData,
  AlmanacTopic,
  AstrolabeData,
  JinkoujueData,
  LiurenData,
  LiuyaoData,
  MeihuaData,
  QimenData,
  SsgwData,
  TaiyiResult,
  XiaoliurenData,
  AnalysisPayloadV1,
  ScopeType,
} from 'mingyu-core/types';
import { compactReadingPrompt } from './aiPrompt';
import { appendPromptSchoolGuidance, getPromptSchoolMethod } from './promptSchools';

export type DivinationKind =
  | 'meihua'
  | 'liuyao'
  | 'ssgw'
  | 'xiaoliuren'
  | 'jinkoujue'
  | 'qimen'
  | 'liuren'
  | 'taiyi'
  | 'wuyun-liuqi'
  | 'huangji-jingshi'
  | 'almanac'
  | 'bazi'
  | 'astrolabe'
  | 'qizheng'
  | 'ziwei';

export interface BirthCalendarInfo {
  solar: string;
  lunar: string;
  ganzhi: string;
  shichen: string;
  jieqi: string;
  trueSolar?: {
    correctedDateTime: string;
    shichen: string;
    totalCorrectionMinutes: number;
    longitudeCorrectionMinutes: number;
    equationOfTimeMinutes: number;
  };
}

export interface ZiweiChartData {
  kind: 'ziwei';
  payload: AnalysisPayloadV1;
  payloadByScope: Partial<Record<ScopeType, AnalysisPayloadV1>> & { origin: AnalysisPayloadV1 };
  decadalTimeline: DecadalTimelineOption[];
  prompt?: string;
  ziweiFortuneScope?: ZiweiFortuneRequest['scope'];
  fortuneDate?: string;
  birth: {
    name: string;
    gender: 'male' | 'female';
    date: string;
    time: string;
    locationName: string;
  };
  calendar: BirthCalendarInfo;
}

export interface ZiweiFortuneRequest {
  scope: 'origin' | 'full' | 'decadal' | 'yearly';
  year?: number;
  currentTime?: Date;
}

export interface QizhengChartData extends QizhengResult {
  kind: 'qizheng';
  birth: {
    name: string;
    gender: 'male' | 'female';
    date: string;
    time: string;
    locationName: string;
  };
  calendar: BirthCalendarInfo;
}

export type ReadingResult =
  | MeihuaData
  | LiuyaoData
  | SsgwData
  | XiaoliurenData
  | JinkoujueData
  | QimenData
  | LiurenData
  | TaiyiResult
  | WuyunLiuqiResult
  | HuangjiJingshiResult
  | AlmanacData
  | BaziChartResult
  | AstrolabeData
  | QizhengChartData
  | ZiweiChartData;

export interface BirthForm {
  name: string;
  gender: 'male' | 'female';
  date: string;
  dateType: 'solar' | 'lunar';
  isLeapMonth: boolean;
  time: string;
  timeBasis: 'clock' | 'trueSolar';
  locationName: string;
  latitude: string;
  longitude: string;
  timezone: string;
}

export interface DivinationOptions {
  almanacTopic?: AlmanacTopic;
  almanacStartDate?: string;
  almanacEndDate?: string;
  almanacWeekendPreference?: 'any' | 'prefer' | 'avoid';
  almanacTimePreferences?: Array<'work-hours' | 'morning' | 'afternoon'>;
  qimenScope?: 'hour' | 'day' | 'month' | 'year';
  qimenLayout?: 'zhuanpan' | 'feipan';
  qimenJuMethod?: 'chaibu' | 'zhirun';
  taiyiScope?: 'year' | 'month' | 'day' | 'hour';
  taiyiYear?: number;
  wuyunYear?: number;
  huangjiMode?: 'year' | 'date';
  huangjiYear?: number;
  huangjiDate?: Date;
}

export interface LiuyaoCoinThrow {
  coins: [2 | 3, 2 | 3, 2 | 3];
  total: 6 | 7 | 8 | 9;
}

export type CastingMode = 'auto' | 'manual' | 'specified';
export type CastingPreference = Exclude<CastingMode, 'specified'>;
export type CastingDivinationKind = 'meihua' | 'liuyao' | 'xiaoliuren' | 'jinkoujue' | 'qimen' | 'liuren' | 'taiyi';

export interface CompatibilityRecordData {
  type: string;
  primaryCaseId: string;
  partnerCaseId: string;
  primaryLabel: string;
  partnerLabel: string;
  reading: {
    summary: string;
    data: unknown;
    prompt?: string;
    method: string;
  };
}

export interface ReadingRecord {
  id: string;
  kind: DivinationKind;
  methodLabel: string;
  question: string;
  createdAt: number;
  result: ReadingResult;
  relatedResults?: Array<{
    kind: DivinationKind;
    result: ReadingResult;
  }>;
  context?: {
    label: string;
    date: string;
    time: string;
    locationName: string;
  };
  /** 合盘记录恢复结果页与继续追问所需的上下文。 */
  compatibility?: CompatibilityRecordData;
  /** 从旧版历史迁移而来的 AI 解读。 */
  interpretation?: string;
  /** AI 解读失败时保留错误，便于从历史记录恢复重试和外部分享入口。 */
  interpretationError?: string;
}

export interface ToolMeta {
  label: string;
  eyebrow: string;
  description: string;
  icon: string;
  accent: string;
  group: '常用' | '古法' | '命盘' | '择日';
  needsBirth?: boolean;
}

export const kindMeta: Record<DivinationKind, ToolMeta> = {
  meihua: { label: '梅花易数', eyebrow: '多法起卦', description: '从当下的时间与数字里寻找脉络。', icon: '梅', accent: 'terracotta', group: '常用' },
  liuyao: { label: '六爻', eyebrow: '手动摇卦', description: '看事情的发展、变化与可行方向。', icon: '爻', accent: 'indigo', group: '常用' },
  ssgw: { label: '三山国王灵签', eyebrow: '抽签掷杯', description: '让一支签回应此刻的犹豫。', icon: '签', accent: 'gold', group: '常用' },
  xiaoliuren: { label: '小六壬', eyebrow: '六宫掌诀', description: '以月、日、时推看眼前吉凶。', icon: '六', accent: 'green', group: '古法' },
  jinkoujue: { label: '金口诀', eyebrow: '四位起课', description: '以人元、贵神、将神、地分取象。', icon: '金', accent: 'amber', group: '古法' },
  qimen: { label: '奇门遁甲', eyebrow: '九宫排盘', description: '看时势、方位和行动节奏。', icon: '奇', accent: 'blue', group: '古法' },
  liuren: { label: '大六壬', eyebrow: '四课三传', description: '从四课三传观察事情如何推进。', icon: '壬', accent: 'teal', group: '古法' },
  taiyi: { label: '太乙神数', eyebrow: '年 · 月 · 日 · 时四计', description: '以太乙、主客定算观察不同时间层次。', icon: '乙', accent: 'plum', group: '古法' },
  'wuyun-liuqi': { label: '五运六气', eyebrow: '年度气运', description: '查看一年的中运、司天在泉与六步气候节奏。', icon: '气', accent: 'teal', group: '古法' },
  'huangji-jingshi': { label: '皇极经世', eyebrow: '值年与年月日时', description: '从值年卦及月、日、时卦观察时势层次。', icon: '皇', accent: 'gold', group: '古法' },
  almanac: { label: '黄历择日', eyebrow: '日期筛选', description: '比较未来几天适合做什么事。', icon: '历', accent: 'orange', group: '择日' },
  bazi: { label: '八字排盘', eyebrow: '出生资料', description: '查看四柱、日主和五行结构。', icon: '命', accent: 'plum', group: '命盘', needsBirth: true },
  astrolabe: { label: '西洋星盘', eyebrow: '出生资料', description: '查看星体、上升与主要相位。', icon: '星', accent: 'sky', group: '命盘', needsBirth: true },
  qizheng: { label: '七政四余', eyebrow: '传统星命', description: '查看七政四余、二十八宿与命身十二宫。', icon: '政', accent: 'indigo', group: '命盘', needsBirth: true },
  ziwei: { label: '紫微斗数', eyebrow: '十二宫盘', description: '查看命宫、星曜与十二宫结构。', icon: '紫', accent: 'plum', group: '命盘', needsBirth: true },
};

function parseBirthDate(birth: BirthForm) {
  const [year, month, day] = birth.date.split('-').map(Number);
  const [hour, minute] = birth.time.split(':').map(Number);
  if (![year, month, day, hour, minute].every(Number.isFinite)) throw new Error('请填写完整的出生日期和时间。');
  return { year, month, day, hour, minute };
}

function formatDateTimeParts(value: { year: number; month: number; day: number; hour: number; minute: number }) {
  return `${value.year}年${String(value.month).padStart(2, '0')}月${String(value.day).padStart(2, '0')}日 ${String(value.hour).padStart(2, '0')}:${String(value.minute).padStart(2, '0')}`;
}

function resolveBirthTime(birth: BirthForm) {
  const parsed = parseBirthDate(birth);
  return resolveTrueSolarBirthTime({
    dateType: birth.dateType === 'lunar' ? 'lunar' : 'solar',
    ...parsed,
    isLeapMonth: birth.dateType === 'lunar' && birth.isLeapMonth,
    longitude: Number(birth.longitude),
    timezone: Number(birth.timezone) || 8,
    applyChinaDst: true,
  });
}

export function getBirthCalendarInfo(birth: BirthForm): BirthCalendarInfo {
  const resolved = resolveBirthTime(birth);
  const { year, month, day, hour, minute } = resolved.solarClockTime;
  const info = LunarUtil.getTimeInfo(new Date(year, month - 1, day, hour, minute));
  const calendar: BirthCalendarInfo = {
    solar: formatDateTimeParts(info.solar),
    lunar: `农历${info.lunar.yearInChinese}${info.lunar.monthInChinese}${info.lunar.dayInChinese}`,
    ganzhi: info.eightChar.year + '年 ' + info.eightChar.month + '月 ' + info.eightChar.day + '日 ' + info.eightChar.hour + '时',
    shichen: info.lunar.hourInChinese,
    jieqi: info.jieQi,
  };

  if (birth.timeBasis === 'trueSolar') {
    calendar.trueSolar = {
      correctedDateTime: resolved.correctedDateTime,
      shichen: resolved.shichen.name,
      totalCorrectionMinutes: resolved.totalCorrectionMinutes,
      longitudeCorrectionMinutes: resolved.longitudeCorrectionMinutes,
      equationOfTimeMinutes: resolved.equationOfTimeMinutes,
    };
  }
  return calendar;
}

function hourIndex(hour: number) {
  return Math.floor(((hour + 1) % 24) / 2);
}

function toDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export async function runDivination(
  kind: DivinationKind,
  now = new Date(),
  birth?: BirthForm,
  options: DivinationOptions = {},
): Promise<ReadingResult> {
  switch (kind) {
    case 'meihua': return (await import('mingyu-core/divination/meihua')).generateMeihua(now, { method: 'random' });
    case 'liuyao': return (await import('mingyu-core/divination/liuyao')).generateLiuyao(now, { method: 'time' });
    case 'ssgw': return (await import('mingyu-core/divination/ssgw')).drawRandomSign(now);
    case 'xiaoliuren': return (await import('mingyu-core/divination/xiaoliuren')).generateXiaoliuren({ method: 'time', customDate: now });
    case 'jinkoujue': return (await import('mingyu-core/divination/jinkoujue')).generateJinkoujue({ method: 'time', customDate: now });
    case 'qimen': return (await import('mingyu-core/divination/qimen')).generateQimen(now, options.qimenLayout ?? 'zhuanpan', options.qimenScope ?? 'hour', options.qimenJuMethod ?? 'chaibu');
    case 'liuren': return (await import('mingyu-core/divination/liuren')).generateLiuren(now);
    case 'taiyi': {
      const scope = options.taiyiScope ?? 'year';
      const { generateTaiyi } = await import('mingyu-core/taiyi');
      return scope === 'year'
        ? generateTaiyi({ year: options.taiyiYear ?? now.getFullYear(), scope })
        : generateTaiyi({ date: now, scope });
    }
    case 'wuyun-liuqi': return (await import('mingyu-core/wuyun-liuqi')).calculateWuyunLiuqi({ year: options.wuyunYear ?? now.getFullYear() });
    case 'huangji-jingshi': {
      const { calculateHuangjiJingshi } = await import('mingyu-core/huangji-jingshi');
      return options.huangjiMode === 'date'
        ? calculateHuangjiJingshi({ date: options.huangjiDate ?? now })
        : calculateHuangjiJingshi({ year: options.huangjiYear ?? now.getFullYear() });
    }
    case 'almanac': {
      const startDate = options.almanacStartDate ?? toDateOnly(now);
      const endDate = options.almanacEndDate ?? toDateOnly(addDays(new Date(`${startDate}T12:00:00`), 6));
      const { generateAlmanacSelection } = await import('mingyu-core/divination/almanac');
      return generateAlmanacSelection({
        topic: options.almanacTopic ?? 'study',
        startDate,
        endDate,
        weekendPreference: options.almanacWeekendPreference,
        timePreferences: options.almanacTimePreferences,
      });
    }
    case 'bazi': {
      const { baziCalculator } = await import('mingyu-core/bazi');
      if (!birth) throw new Error('请先填写出生资料。');
      const { year, month, day, hour, minute } = parseBirthDate(birth);
      return baziCalculator.calculateBazi({
        year,
        month,
        day,
        timeIndex: hourIndex(hour),
        birthHour: hour,
        birthMinute: minute,
        gender: birth.gender,
        isLunar: birth.dateType === 'lunar',
        isLeapMonth: birth.dateType === 'lunar' && birth.isLeapMonth,
        useTrueSolarTime: birth.timeBasis === 'trueSolar',
        birthPlace: birth.locationName,
        birthLongitude: Number(birth.longitude),
        timezone: Number(birth.timezone) || 8,
        // 页面已有更贴合产品定位的展示筛选，底层需保留完整结果。
        shenShaScope: 'all',
      });
    }
    case 'astrolabe': {
      const { generateAstrolabe } = await import('mingyu-core/divination/astrolabe');
      if (!birth) throw new Error('请先填写出生资料。');
      const { year, month, day, hour, minute } = resolveBirthTime(birth).solarClockTime;
      return generateAstrolabe({
        name: birth.name || '未命名',
        gender: birth.gender === 'male' ? '男' : '女',
        year: String(year),
        month: String(month),
        day: String(day),
        hour: String(hour),
        minute: String(minute),
        latitude: birth.latitude,
        longitude: birth.longitude,
        timezone: birth.timezone,
        locationName: birth.locationName,
        useTrueSolarTime: birth.timeBasis === 'trueSolar',
      });
    }
    case 'qizheng': {
      const { generateQizheng } = await import('mingyu-core/qizheng');
      if (!birth) throw new Error('请先填写出生资料。');
      const { year, month, day, hour, minute } = resolveBirthTime(birth).solarClockTime;
      const latitude = Number(birth.latitude);
      const longitude = Number(birth.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error('七政四余需要完整的出生地区。');
      return {
        ...generateQizheng({
          year,
          month,
          day,
          hour,
          minute,
          latitude,
          longitude,
          timezone: Number(birth.timezone) || 8,
          useTrueSolarTime: birth.timeBasis === 'trueSolar',
        }),
        kind: 'qizheng',
        birth: {
          name: birth.name || '未命名',
          gender: birth.gender,
          date: birth.date,
          time: birth.time,
          locationName: birth.locationName,
        },
        calendar: getBirthCalendarInfo(birth),
      };
    }
    case 'ziwei': throw new Error('紫微斗数请从排盘页生成。');
  }
}

export interface DivinationReadingPromptOptions {
  question?: string;
  schools?: readonly string[];
}

function formatGanzhi(ganzhi: { year: string; month: string; day: string; hour: string }) {
  return `${ganzhi.year}年 ${ganzhi.month}月 ${ganzhi.day}日 ${ganzhi.hour}时`;
}

function formatMeihuaHexagram(
  label: string,
  hexagram: MeihuaData['mainHexagram'] | NonNullable<MeihuaData['interHexagram']> | NonNullable<MeihuaData['changedHexagram']>,
) {
  return [
    `${label}：${hexagram.name}${hexagram.symbol ? ` ${hexagram.symbol}` : ''}（上${hexagram.upper}下${hexagram.lower}）`,
    hexagram.description ? `- 卦辞：${hexagram.description}` : '',
    hexagram.yongCi ? `- 用辞：${hexagram.yongCi}` : '',
  ].filter(Boolean);
}

function formatMeihuaReadingPrompt(data: MeihuaData) {
  const interHexagram = data.interHexagram;
  const changedHexagram = data.changedHexagram;
  const timingClues = (data.analysis.yingQi ?? [])
    // 起卦方法、取数和数字索引只能复核盘面如何生成，不能帮助模型解读。
    .filter((item) => !/(?:起卦|取数|卦数|数字|随机|索引)/u.test(item));
  return [
    `盘面干支：${formatGanzhi(data.ganzhi)}`,
    ...formatMeihuaHexagram('主卦（当前）', data.mainHexagram),
    ...(interHexagram ? formatMeihuaHexagram('互卦（过程）', interHexagram) : []),
    ...(changedHexagram ? formatMeihuaHexagram('变卦（结果）', changedHexagram) : []),
    `动爻：第${data.movingYao.position}爻（${data.movingYao.yaoName}）`,
    data.mainHexagram.movingYaoCi ? `- 爻辞：${data.mainHexagram.movingYaoCi}` : '',
    `主卦体用：体卦${data.tiGua.name}（${data.tiGua.nature}，${data.tiGua.element}）；用卦${data.yongGua.name}（${data.yongGua.nature}，${data.yongGua.element}）；关系${data.analysis.tiYongRelation}`,
    data.interTiGua && data.interYongGua
      ? `过程体用：体互${data.interTiGua.name}（${data.interTiGua.nature}，${data.interTiGua.element}）；用互${data.interYongGua.name}（${data.interYongGua.nature}，${data.interYongGua.element}）；${data.analysis.inter1Relation}；${data.analysis.inter2Relation}`
      : '',
    data.changedTiGua && data.changedYongGua
      ? `结果体用：体卦${data.changedTiGua.name}（${data.changedTiGua.nature}，${data.changedTiGua.element}）；用卦${data.changedYongGua.name}（${data.changedYongGua.nature}，${data.changedYongGua.element}）；关系${data.analysis.changedTiYongRelation || data.analysis.changedRelation}`
      : `结果关系：${data.analysis.changedRelation}`,
    `月令旺衰：${data.analysis.monthBranch && data.analysis.monthElement ? `${data.analysis.monthBranch}月（${data.analysis.monthElement}令）` : `${data.analysis.season}季`}；体卦${data.analysis.tiSeasonState}；用卦${data.analysis.yongSeasonState}`,
    timingClues.length ? `应期线索：${timingClues.join('；')}` : '',
  ].filter(Boolean).join('\n');
}

function formatXiaoliurenReadingPrompt(data: XiaoliurenData) {
  return [
    `盘面干支：${formatGanzhi(data.ganzhi)}`,
    `落宫轨迹：月宫${data.sequence.month.name} → 日宫${data.sequence.day.name} → 时宫${data.sequence.hour.name}`,
    `最终落宫：${data.primary.name}`,
    `落宫歌诀：${data.primary.verse}`,
  ].join('\n');
}

function inferLiuyaoTemplate(question = ''): 'general' | 'ganqing' | 'shiye' | 'caifu' | 'guaishen' {
  if (/(?:鬼神|灵异|怪事|邪祟|闹鬼)/u.test(question)) return 'guaishen';
  if (/(?:感情|恋爱|婚姻|复合|桃花|对象|前任|伴侣|关系)/u.test(question)) return 'ganqing';
  if (/(?:财运|财富|钱|收入|收益|投资|交易|买卖|生意|回款)/u.test(question)) return 'caifu';
  if (/(?:事业|工作|求职|面试|升职|项目|创业|考试|学业)/u.test(question)) return 'shiye';
  return 'general';
}

function stripRedundantDivinationLabel(value: string) {
  return value.replace(/^占法：[^\n]+\n?/u, '').trim();
}

export async function buildDivinationReadingPrompt(
  kind: DivinationKind,
  result: ReadingResult,
  options: DivinationReadingPromptOptions = {},
) {
  if (kind === 'bazi' || kind === 'ziwei' || kind === 'astrolabe' || kind === 'qizheng') return '';
  const schools = options.schools || [];
  const schoolMethod = getPromptSchoolMethod(kind);
  if (kind === 'wuyun-liuqi') {
    const { buildWuyunLiuqiPrompt } = await import('mingyu-core/wuyun-liuqi');
    return compactReadingPrompt(buildWuyunLiuqiPrompt(result as WuyunLiuqiResult, options.question, schools as Parameters<typeof buildWuyunLiuqiPrompt>[2]));
  }
  if (kind === 'huangji-jingshi') {
    const { buildHuangjiJingshiPrompt } = await import('mingyu-core/huangji-jingshi');
    return compactReadingPrompt(buildHuangjiJingshiPrompt(result as HuangjiJingshiResult, options.question, schools as Parameters<typeof buildHuangjiJingshiPrompt>[2]));
  }
  if (kind === 'meihua') return compactReadingPrompt(appendPromptSchoolGuidance(formatMeihuaReadingPrompt(result as MeihuaData), 'meihua', schools));
  if (kind === 'xiaoliuren') return compactReadingPrompt(appendPromptSchoolGuidance(formatXiaoliurenReadingPrompt(result as XiaoliurenData), 'xiaoliuren', schools));
  const { formatEnhancedDivinationInfo } = await import('mingyu-core/prompt/divination-enhanced');
  const prompt = formatEnhancedDivinationInfo(
    kind as Parameters<typeof formatEnhancedDivinationInfo>[0],
    result as Parameters<typeof formatEnhancedDivinationInfo>[1],
    options.question,
    undefined,
    kind === 'liuyao' ? { liuyaoTemplate: inferLiuyaoTemplate(options.question) } : undefined,
  );
  const readingPrompt = stripRedundantDivinationLabel(prompt);
  return compactReadingPrompt(schoolMethod ? appendPromptSchoolGuidance(readingPrompt, schoolMethod, schools) : readingPrompt);
}

export async function runManualLiuyao(coinThrows: readonly LiuyaoCoinThrow[], now = new Date()): Promise<LiuyaoData> {
  return (await import('mingyu-core/divination/liuyao')).generateLiuyao(now, { method: 'coins', coinThrows });
}

export async function runSpecifiedLiuyao(yaos: readonly (6 | 7 | 8 | 9)[], now = new Date()): Promise<LiuyaoData> {
  if (yaos.length !== 6) throw new Error('请依初爻至上爻填写六个爻值。');
  return (await import('mingyu-core/divination/liuyao')).generateLiuyao(now, { method: 'manual', yaos });
}

export async function runConfiguredMeihua(
  method: 'time' | 'number' | 'random',
  number?: number,
  now = new Date(),
): Promise<MeihuaData> {
  return (await import('mingyu-core/divination/meihua')).generateMeihua(now, method === 'number' ? { method, number } : { method });
}

export async function runConfiguredJinkoujue(
  method: 'time' | 'branch' | 'number' | 'random',
  value?: number | string,
  now = new Date(),
): Promise<JinkoujueData> {
  const { generateJinkoujue } = await import('mingyu-core/divination/jinkoujue');
  if (method === 'number') return generateJinkoujue({ method, number: Number(value), customDate: now });
  if (method === 'branch') return generateJinkoujue({ method, branch: String(value || ''), customDate: now });
  return generateJinkoujue({ method, customDate: now });
}

export async function runAutomaticCasting(
  kind: CastingDivinationKind,
  now = new Date(),
  options: DivinationOptions = {},
): Promise<ReadingResult> {
  if (kind === 'jinkoujue') return await runConfiguredJinkoujue('random', undefined, now);
  return runDivination(kind, now, undefined, options);
}

export async function runTimeCasting(
  kind: 'xiaoliuren' | 'qimen' | 'liuren',
  now = new Date(),
  options: DivinationOptions = {},
): Promise<XiaoliurenData | QimenData | LiurenData> {
  if (kind === 'xiaoliuren') return (await import('mingyu-core/divination/xiaoliuren')).generateXiaoliuren({ method: 'time', customDate: now });
  if (kind === 'qimen') return (await import('mingyu-core/divination/qimen')).generateQimen(now, options.qimenLayout ?? 'zhuanpan', options.qimenScope ?? 'hour', options.qimenJuMethod ?? 'chaibu');
  return (await import('mingyu-core/divination/liuren')).generateLiuren(now);
}

export async function runTaiyiYear(year: number): Promise<TaiyiResult> {
  return (await import('mingyu-core/taiyi')).generateTaiyi({ year, scope: 'year' });
}

export async function runTaiyi(
  scope: 'year' | 'month' | 'day' | 'hour',
  date: Date,
  year = date.getFullYear(),
): Promise<TaiyiResult> {
  const { generateTaiyi } = await import('mingyu-core/taiyi');
  return scope === 'year' ? generateTaiyi({ year, scope }) : generateTaiyi({ date, scope });
}

export async function runSpecifiedSsgw(number: number, now = new Date()): Promise<SsgwData> {
  if (!Number.isInteger(number) || number < 1 || number > 92) throw new Error('签号应在 1 至 92 之间。');
  return (await import('mingyu-core/divination/ssgw')).resolveSignByNumber(number, now);
}

export async function previewInteractiveSsgw(signSample: number, now = new Date()): Promise<SsgwData> {
  if (!Number.isFinite(signSample) || signSample < 0 || signSample >= 1) throw new Error('抽签随机样本无效。');
  return (await import('mingyu-core/divination/ssgw')).resolveSignByNumber(Math.floor(signSample * 92) + 1, now);
}

export async function finishInteractiveSsgw(
  signSample: number,
  cupSamples: readonly number[],
  now = new Date(),
): Promise<SsgwData> {
  if (cupSamples.length % 2 !== 0) throw new Error('每次掷杯必须包含两枚杯面。');
  return (await import('mingyu-core/divination/ssgw')).drawRandomSign(now, { replay: [signSample, ...cupSamples] });
}

function ziweiTargetDate(currentTime: Date, targetYear?: number) {
  const year = Number.isInteger(targetYear) && targetYear! >= 1900 && targetYear! <= 2199
    ? targetYear!
    : currentTime.getFullYear();
  const month = currentTime.getMonth();
  const day = Math.min(currentTime.getDate(), new Date(year, month + 1, 0).getDate());
  return new Date(year, month, day, currentTime.getHours(), currentTime.getMinutes(), 0, 0);
}

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export async function runZiweiChart(birth: BirthForm, options: ZiweiFortuneRequest = { scope: 'full' }): Promise<ZiweiChartData> {
  const [{ buildZiweiChartInput, calculateZiweiChart }, { buildZiweiPrompt, getZiweiPromptCalculationScopes }] = await Promise.all([
    import('mingyu-core/ziwei/iztro'),
    import('mingyu-core/prompt'),
  ]);
  const { year, month, day, hour, minute } = parseBirthDate(birth);
  const input = buildZiweiChartInput({
    name: birth.name || '未命名',
    gender: birth.gender,
    dateType: birth.dateType === 'lunar' ? 'lunar' : 'solar',
    year,
    month,
    day,
    timeIndex: hourIndex(hour),
    isLeapMonth: birth.dateType === 'lunar' && birth.isLeapMonth,
    useTrueSolarTime: birth.timeBasis === 'trueSolar',
    birthHour: hour,
    birthMinute: minute,
    birthLongitude: birth.longitude,
    timezone: Number(birth.timezone) || 8,
    applyChinaDst: true,
  });
  const currentTime = options.currentTime ?? new Date();
  const targetTime = ziweiTargetDate(currentTime, options.year);
  const horoscopeDate = localDateKey(targetTime);
  const horoscopeTimeIndex = hourIndex(targetTime.getHours());
  const scopes: ScopeType[] = options.scope === 'origin'
    ? ['origin']
    : options.scope === 'decadal'
      ? ['origin', 'decadal']
      : options.scope === 'yearly'
        ? ['origin', 'decadal', 'yearly']
        : getZiweiPromptCalculationScopes(options.scope);
  const runtime = await calculateZiweiChart(input, {
    scopes,
    skipAnalysis: true,
    horoscopeContext: {
      dateStr: horoscopeDate,
      hourIndex: horoscopeTimeIndex,
    },
  });
  const payloadByScope = runtime.payloadByScope as ZiweiChartData['payloadByScope'];
  const requestedPayload = options.scope === 'decadal' || options.scope === 'yearly'
    ? payloadByScope[options.scope]
    : undefined;
  const payload = requestedPayload || payloadByScope.origin;

  return {
    kind: 'ziwei',
    payload,
    payloadByScope,
    decadalTimeline: runtime.decadalTimeline,
    prompt: compactReadingPrompt(buildZiweiPrompt({
      runtime,
      scope: options.scope,
      currentTime: targetTime,
    })),
    ziweiFortuneScope: options.scope,
    fortuneDate: horoscopeDate,
    birth: {
      name: birth.name || '未命名',
      gender: birth.gender,
      date: birth.date,
      time: birth.time,
      locationName: birth.locationName,
    },
    calendar: getBirthCalendarInfo(birth),
  };
}

export function formatReadingSummary(kind: DivinationKind, result: ReadingResult): string {
  if (kind === 'meihua') {
    const reading = result as MeihuaData;
    return `主卦「${reading.mainHexagram.name}」${reading.changedHexagram ? `变「${reading.changedHexagram.name}」` : ''}，体用关系为${reading.analysis.tiYongRelation}。${reading.mainHexagram.description}`;
  }
  if (kind === 'liuyao') {
    const reading = result as LiuyaoData;
    return `本卦「${reading.originalName}」${reading.changedName ? `，动而化「${reading.changedName}」` : '，此卦暂无动爻'}。${reading.specialAdvice || '世爻与动爻信息已纳入本次排盘。'}`;
  }
  if (kind === 'ssgw') {
    const reading = result as SsgwData;
    return `第 ${reading.number} 签 · ${reading.title}。${reading.poem}`;
  }
  if (kind === 'xiaoliuren') {
    const reading = result as XiaoliurenData;
    return `月宫${reading.sequence.month.name}、日宫${reading.sequence.day.name}、时宫${reading.sequence.hour.name}，以${reading.primary.name}为本课主象。${reading.primary.verse}`;
  }
  if (kind === 'jinkoujue') {
    return (result as JinkoujueData).summary;
  }
  if (kind === 'qimen') {
    const reading = result as QimenData;
    const tags = reading.patternTags?.slice(0, 2).join('、');
    return `${reading.isYangDun ? '阳遁' : '阴遁'}${reading.juShu}局，值符${reading.zhiFu}、值使${reading.zhiShi}${tags ? `，盘面见${tags}` : ''}。${reading.yingQi?.description || '先看用神宫与方位建议，再决定行动节奏。'}`;
  }
  if (kind === 'liuren') {
    const reading = result as LiurenData;
    return `${reading.transmissionRule || '四课三传'}：${reading.threeTransmissions.map((item) => `${item.stage}${item.branch}`).join('、')}。${reading.transmissionSummary || reading.lessonSummary || '从初传到末传观察事情的推进层次。'}`;
  }
  if (kind === 'taiyi') {
    const reading = result as TaiyiResult;
    const conditions = reading.judgments.slice(0, 2).map((item) => item.split('；')[0]).join('；');
    const scopeLabel = { year: '年计', month: '月计', day: '日计', hour: '时计' }[reading.scope];
    return `${reading.ganZhi}${scopeLabel}太乙${reading.yinYang}第${reading.bureau}局，太乙在${reading.taiyiPosition}，文昌在${reading.wenChangPosition}，始击在${reading.shiJiPosition}。主算${reading.lordCount}、客算${reading.guestCount}、定算${reading.setCount}${conditions ? `；${conditions}` : ''}。`;
  }
  if (kind === 'wuyun-liuqi') {
    const reading = result as WuyunLiuqiResult;
    const conformities = reading.annualConformities.names.join('、');
    return `${reading.input.yearGanZhi}年中运${reading.annualMovement.name}${reading.annualMovement.strength}，${reading.sitian.name}司天、${reading.zaiquan.name}在泉，气运关系为${reading.annualRelation.kind}${conformities ? `，岁气见${conformities}` : ''}。`;
  }
  if (kind === 'huangji-jingshi') {
    const reading = result as HuangjiJingshiResult;
    const forecast = reading.forecast;
    if (!forecast) return `${reading.input.year} 年位于本元第 ${reading.position.hui.indexInYuan} 会、第 ${reading.position.yun.indexInYuan} 运、第 ${reading.position.shi.indexInYuan} 世。`;
    if (reading.dateTimeForecast) {
      const dateTime = reading.dateTimeForecast;
      return `${dateTime.civilTime.dateTime}以${dateTime.hexagrams.annual.name}为值年卦，月经卦${dateTime.hexagrams.monthJing.name}、日卦${dateTime.hexagrams.daily.name}、时经卦${dateTime.hexagrams.hourJing.name}。`;
    }
    return `${reading.input.year}年（${forecast.hexagrams.annual.ganzhi}）值年卦为${forecast.hexagrams.annual.name}，当前处于${forecast.hexagrams.decade.hexagram.shortName}十年卦、${forecast.hexagrams.sixtyYear.hexagram.shortName}六十年统卦与${forecast.hexagrams.yun.hexagram.shortName}运卦周期。`;
  }
  if (kind === 'almanac') {
    const reading = result as AlmanacData;
    const first = reading.days[0];
    return first ? `${reading.topicLabel}可优先看 ${first.date}（${first.weekday}），${first.highlights.slice(0, 2).join('；') || '宜结合当天宜忌与个人安排判断。'}` : '这段日期内没有可展示的择日结果。';
  }
  if (kind === 'bazi') {
    const reading = result as BaziChartResult;
    const missing = reading.wuxingStrength.missing.length ? `，五行缺${reading.wuxingStrength.missing.join('、')}` : '';
    return `四柱为${reading.pillars.year.ganZhi} ${reading.pillars.month.ganZhi} ${reading.pillars.day.ganZhi} ${reading.pillars.hour.ganZhi}，日主属${reading.dayMaster.element}${missing}。`;
  }
  if (kind === 'ziwei') {
    const reading = result as ZiweiChartData;
    const basic = reading.payload.basic_info;
    return `${reading.birth.name}为${basic.gender}，命宫在${basic.soul_palace_branch || '本命'}，身宫在${basic.body_palace_branch || '身命'}，十二宫盘已完成。`;
  }
  if (kind === 'qizheng') {
    const reading = result as QizhengChartData;
    const emphasized = reading.stars.filter((star) => star.dignity && star.dignity !== '平' && star.dignity !== '—');
    return `${reading.birth.name}的七政四余盘已完成，命主${reading.mingZhu}，十一星分布于二十八宿与十二宫${emphasized.length ? `，其中${emphasized.slice(0, 3).map((star) => `${star.name}${star.dignity}`).join('、')}` : ''}。`;
  }
  const reading = result as AstrolabeData;
  const sun = reading.planets.find((point) => point.label === '太阳');
  const rising = reading.angles.find((point) => point.label === '上升');
  return `${reading.birth.name}的太阳位于${sun?.sign || '未知'}，上升位于${rising?.sign || '未知'}，本命盘共计算 ${reading.aspects.length} 个主要相位。`;
}

export function getReadingTimestamp(result: ReadingResult, fallback = Date.now()) {
  return 'timestamp' in result && typeof result.timestamp === 'number' ? result.timestamp : fallback;
}

export function formatReadingTime(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}
