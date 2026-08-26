import {
  analyzeFortuneTriggers,
  baziCalculator,
  buildCurrentBaziFortuneSelection,
  buildFortuneSelectionContext,
  getCalendarInfo,
  getTenGod,
  getTenGodForBranch,
  type BaziChartResult,
  type FortuneTriggerLayer,
} from 'mingyu-core/bazi';
import { calculateSolarTermsForYear, getBirthDateValidationMessage, type SolarTermEvidence } from 'mingyu-core/calendar';
import { generateQimen } from 'mingyu-core/divination/qimen';
import type { QimenData, QimenJiuGongGe, QimenScope } from 'mingyu-core/types';
import type { BirthForm } from './divination';
import { fortuneStatusFromScore, type FortuneStatus } from './fortuneStatus';
import { getModernAlmanacForDate, type ModernAlmanacResult } from './modernAlmanac';
import {
  renderFortuneReading,
  type FortuneReadingCopy,
  type FortuneReadingPosture,
} from './dailyFortuneCorpus';

export interface DailyFortuneProfile extends BirthForm {
  id: string;
  label: string;
}

export type FortunePeriod = 'today' | 'month' | 'year';
export type DailyFortuneTone = 'favorable' | 'balanced' | 'cautious';

export interface DailyFortuneCategory {
  key: string;
  icon: string;
  label: string;
  status: string;
  tone: DailyFortuneTone;
  detail: string;
  basis: string;
}

export interface DailyFortuneTimeWindow {
  name: string;
  range: string;
  coverage: string;
}

export interface DailyFortuneTrendItem {
  dateKey: string;
  label: string;
  dateLabel: string;
  status: string;
  tone: DailyFortuneTone;
  focus: string;
}

export interface DailyFortuneDirection {
  direction: string;
  detail: string;
}

export interface DailyFortuneColor {
  name: string;
  hex: string;
}

export interface DailyFortuneOverview {
  readyCount: number;
  reviewCount: number;
  slowCount: number;
  label: string;
}

export interface DailyFortuneReference {
  colors: DailyFortuneColor[];
  colorNote: string;
  numbers: number[];
  numberNote: string;
  direction: string;
  directionNote: string;
  item: string;
  itemSymbol: string;
  itemNote: string;
}

export interface DailyFortuneActionTip {
  sourceKey: string;
  label: string;
  text: string;
  tone: 'positive' | 'notice';
}

export interface DailyFortuneEvidenceInsight {
  key: string;
  sourceKey?: string;
  label: string;
  title: string;
  detail: string;
  tone: DailyFortuneTone;
}

export interface DailyFortuneResult {
  period: FortunePeriod;
  periodLabel: string;
  personalized: boolean;
  dateKey: string;
  dateLabel: string;
  rangeLabel: string;
  calendarRangeLabel: string;
  boundaryLabel: string;
  coverageLabel: string;
  windowTitle: string;
  weekday: string;
  lunarDate: string;
  ganzhi: string;
  jieqi: string;
  title: string;
  tone: DailyFortuneTone;
  grade: FortuneStatus;
  summary: string;
  previewText: string;
  overview: DailyFortuneOverview;
  reference: DailyFortuneReference;
  modernAlmanac: ModernAlmanacResult | null;
  actionTips: DailyFortuneActionTip[];
  evidenceInsights: DailyFortuneEvidenceInsight[];
  categories: DailyFortuneCategory[];
  timeWindows: DailyFortuneTimeWindow[];
  periodTrend: DailyFortuneTrendItem[];
  goodDirections: DailyFortuneDirection[];
  avoidDirections: DailyFortuneDirection[];
  directionFallback: string;
}

type FiveElement = '木' | '火' | '土' | '金' | '水';
type PersonalRelation = 'support' | 'review' | 'neutral';

interface TopicDefinition {
  key: string;
  icon: string;
  label: string;
  shortLabel: string;
  primaryDoor: string;
  supportStars: string[];
  supportGods: string[];
  action: string;
  prepare: string;
  check: string;
  outcome: string;
  cautionPattern: string;
  cautionAction: string;
  fallback: string;
  masterReason: string;
  masterRiskReason: string;
  personalSupportAction: string;
  personalSupportStop: string;
  personalReviewBoundary: string;
  statusGuard: string;
  trendActions: string[];
  trendGuards: string[];
}

interface ElementReference {
  colors: DailyFortuneColor[];
  numbers: number[];
  direction: string;
}

interface PracticalReferenceItem {
  name: string;
  symbol: string;
  note: string;
}

interface PersonalContext {
  qimenStem: string;
  dayElement: FiveElement;
  referenceSeed: string;
  birthTimestamp: number;
  favorableElements: Set<FiveElement>;
  primaryFavorableElement: FiveElement | null;
  unfavorableElements: Set<FiveElement>;
  primaryUnfavorableElement: FiveElement | null;
  birthChart: BaziChartResult;
  flowCache: Map<string, PersonalFlowEvidence>;
}

interface PersonalFlowEvidence {
  alignment: number;
  currentAlignment: number;
  triggerIntensity: number;
  formationAlignment: number;
  focusTopics: Set<string>;
  focusLabels: string[];
  triggerLevel: 'quiet' | 'active' | 'strong';
  triggerLabels: string[];
}

interface PalaceSignals {
  supportCount: number;
  softRiskCount: number;
  hardRiskCount: number;
  personalRelation: PersonalRelation;
  personalChange: boolean;
}

interface CategoryEvaluation {
  definition: TopicDefinition;
  palace: QimenJiuGongGe;
  tone: DailyFortuneTone;
  score: number;
  supportCount: number;
  riskCount: number;
  personalRelation: PersonalRelation;
  personalChange: boolean;
  personalAlignment: number;
  personalFocus: string[];
}

interface ChartAnalysis {
  date: Date;
  dateKey: string;
  chart: QimenData;
  activePalace: QimenJiuGongGe;
  activeTone: DailyFortuneTone;
  activeScore: number;
  tone: DailyFortuneTone;
  score: number;
  categories: CategoryEvaluation[];
}

interface CategoryAggregate {
  category: DailyFortuneCategory;
  evaluation: CategoryEvaluation;
  favorableCount: number;
  cautiousCount: number;
  sampleCount: number;
  bestAnalysis?: ChartAnalysis;
  worstAnalysis?: ChartAnalysis;
}

interface FortuneMasterJudgment {
  posture: FortuneReadingPosture;
  primary: CategoryAggregate;
  secondary: CategoryAggregate;
  caution: CategoryAggregate;
  bestAnalysis?: ChartAnalysis;
  cautionAnalysis?: ChartAnalysis;
  personalInsight?: {
    title: string;
    detail: string;
    clause: string;
    tone: DailyFortuneTone;
  };
  mixed: boolean;
  copy: FortuneReadingCopy;
}

interface DailyFortuneCacheEntry {
  key: string;
  createdAt: number;
  result: DailyFortuneResult;
}

const topicDefinitions: TopicDefinition[] = [
  {
    key: 'career', icon: '业', label: '工作事业', shortLabel: '工作', primaryDoor: '开门',
    supportStars: ['天心', '天辅', '天任'], supportGods: ['值符', '九天', '九地'],
    action: '先处理目标清楚、能直接推进的工作', prepare: '整理优先级和待确认事项', check: '截止时间、分工和交付标准',
    outcome: '一份写明负责人、下一步和完成标准的安排',
    cautionPattern: '任务边界、负责人或交付标准容易临时变化',
    cautionAction: '先把负责人与完成标准写清，未确认的部分不要提前承诺。',
    fallback: '负责人或截止时间未定时，先整理优先级和待确认事项',
    masterReason: '工作事业最容易把投入转成明确交付，也能在开始前划清责任。',
    masterRiskReason: '它牵涉多人之间的责任交接，一处变动就会让后续环节重新排队。',
    personalSupportAction: '留出一段不被临时插单打断的执行时间，只完成一个可验收成果',
    personalSupportStop: '临时插单或责任人发生变化时，先不接新任务',
    personalReviewBoundary: '先收完已有任务，不额外接下临时承诺',
    statusGuard: '先定边界',
    trendActions: ['先定负责人和交付标准', '把截止时间与承诺范围写清', '只保留一个可验收成果', '把待确认事项清成一张清单', '完成一个可交付的小阶段', '为下一步留下明确负责人'],
    trendGuards: ['先核对分工、截止时间与承诺范围', '未写清负责人和验收标准，就不提前承诺', '先收窄任务边界，再决定是否接下', '交付口径没有统一前，不增加任务', '时间或责任仍有空白时，先暂停承诺', '新任务进来前，先确认谁负责收尾'],
  },
  {
    key: 'study', icon: '学', label: '学习成长', shortLabel: '学习', primaryDoor: '景门',
    supportStars: ['天辅', '天心', '天任'], supportGods: ['太阴', '九地', '值符'],
    action: '集中完成一段阅读、写作或复盘', prepare: '整理资料并拆小学习目标', check: '任务量、专注时段和休息间隔',
    outcome: '可复述的要点、练习结果或一段可用产出',
    cautionPattern: '任务切换过多，容易读了很多却没有真正沉淀',
    cautionAction: '只保留一个学习目标，并用笔记或练习检验是否真正掌握。',
    fallback: '注意力不稳时，只整理资料并把学习目标拆成一段',
    masterReason: '学习成长可以分段积累，并用输出检验投入是否真正有效。',
    masterRiskReason: '它消耗的是连续注意力，切换次数增加后，投入时间并不等于真正掌握。',
    personalSupportAction: '留出一段连续专注时间，并用笔记或练习留下结果',
    personalSupportStop: '连续分心或无法复述要点时，停止增加资料和题量',
    personalReviewBoundary: '只整理现有资料，暂不继续增加课程或题量',
    statusGuard: '先稳专注',
    trendActions: ['留下一段可复述的成果', '用笔记或练习检验掌握', '只完成一个学习目标', '把零散资料整理成一页要点', '用一次输出检验理解', '复盘一个尚未掌握的环节'],
    trendGuards: ['减小任务量，避免频繁切换', '只保留一个目标，再用练习检查理解', '未形成笔记或成果前，不继续增加资料', '注意力已经分散时，先停止收集资料', '无法复述核心内容时，先回到原材料', '休息间隔没有留足时，不继续加量'],
  },
  {
    key: 'wealth', icon: '财', label: '金钱合作', shortLabel: '钱款', primaryDoor: '生门',
    supportStars: ['天任', '天心', '天辅'], supportGods: ['值符', '六合', '太阴'],
    action: '优先处理金额和条件已经明确的事项', prepare: '对账、比价并梳理必要支出', check: '金额、条款和付款节点',
    outcome: '可复核的金额、责任和付款节点记录',
    cautionPattern: '口头约定与实际金额、责任或付款条件容易出现偏差',
    cautionAction: '保存报价和付款记录，逐项确认金额、责任人及付款节点。',
    fallback: '条款未齐时只保存报价和问题清单，不进入付款',
    masterReason: '金钱合作的条件可以逐项核对，结果也便于留痕和复盘。',
    masterRiskReason: '它同时影响现金流与合作责任，一处误差可能延续到后续结算。',
    personalSupportAction: '集中完成一次对账、比价或条款确认，并保存可复核记录',
    personalSupportStop: '报价与实际付款条件出现新差异时，暂停付款和新增承诺',
    personalReviewBoundary: '只保留询价和记录，不付款也不替人担保',
    statusGuard: '先核条款',
    trendActions: ['只处理条款清楚的款项', '逐项写清金额和付款节点', '先保存一份可复核的交易记录', '把报价、金额与责任对齐', '完成一次对账或比价', '给付款条件留一份书面记录'],
    trendGuards: ['逐项核对金额、责任与付款节点', '口头约定没有落成记录，就不付款或承诺', '条款仍有空白时，只做询价和资料整理', '报价和实际付款条件不一致时，先暂停', '没有留存凭证的交易，不进入下一步', '责任边界不清时，先把问题逐项列出'],
  },
  {
    key: 'relationship', icon: '缘', label: '沟通关系', shortLabel: '沟通', primaryDoor: '休门',
    supportStars: ['天辅', '天心', '天任'], supportGods: ['六合', '太阴', '值符'],
    action: '安排一次不赶时间的沟通', prepare: '先听完对方的重点，再整理自己的表达', check: '语气、对方感受和信息差',
    outcome: '双方对事实、分歧和下一步的一致理解',
    cautionPattern: '表达语气与真实意图容易错位，猜测会放大信息差',
    cautionAction: '先复述对方重点，再只处理一个分歧，不用猜测补齐信息。',
    fallback: '信息不全时只确认事实，不急着表达立场',
    masterReason: '沟通关系能先消除信息差，减少其他安排里的猜测与返工。',
    masterRiskReason: '它依赖双方对同一事实的共同理解，误读会让后续行动建立在不同前提上。',
    personalSupportAction: '安排一次不赶时间的沟通，只确认事实、分歧和下一步',
    personalSupportStop: '同一事实出现两种说法时，先暂停定性和新的承诺',
    personalReviewBoundary: '只确认事实，不在情绪高点给关系定性',
    statusGuard: '先清信息',
    trendActions: ['一次只谈清一个分歧', '先确认事实，再商量下一步', '用一次不赶时间的沟通形成共识', '先消除一处信息差', '把事实、感受与下一步说清', '结束一场悬而未决的沟通'],
    trendGuards: ['先复述对方意思，再表达自己的判断', '语气和意图不一致时，先暂停推测', '信息没有确认前，不用猜测补齐结论', '事实与猜测混在一起时，先拆开确认', '对方还没表达完整时，不抢着定性', '同一分歧反复出现时，先暂停扩大话题'],
  },
  {
    key: 'travel', icon: '行', label: '出行行动', shortLabel: '出行', primaryDoor: '开门',
    supportStars: ['天冲', '天辅', '天心'], supportGods: ['九天', '六合', '九地'],
    action: '把需要外出的事情按路线集中处理', prepare: '提前整理路线、物品和时间余量', check: '路线、天气和临时变动',
    outcome: '明确的路线、时间余量和备选方案',
    cautionPattern: '路线、天气或前后事项的衔接时间更容易变化',
    cautionAction: '预留缓冲并准备备选路线，证件和关键物品出发前逐项确认。',
    fallback: '路线或天气未定时，先整理物品并预留转场时间',
    masterReason: '出行行动的风险大多能在出发前被看见，必要时可以改线或删减行程。',
    masterRiskReason: '它受外部条件与时间链条共同影响，一处延误会继续挤压后续行程。',
    personalSupportAction: '把同方向事项合并，并为转场和返程保留机动时间',
    personalSupportStop: '路线或返程时间改变时，取消次要行程，不继续加站',
    personalReviewBoundary: '只准备物品和备选路线，不追加新的行程',
    statusGuard: '先定路线',
    trendActions: ['预留时间并准备备选路线', '把路线、证件和关键物品一次核清', '合并同方向行程，留下转场余量', '先定路线、时间与备选方案', '把同方向事项集中完成', '为临时变化预留一段机动时间'],
    trendGuards: ['先查路线天气，给临时变化留缓冲', '证件和关键物品未核对，就不要赶着出发', '前后事项衔接过紧时，主动删减一站', '天气或交通有变时，立即启用备选路线', '时间余量不足时，主动取消次要行程', '临时加项前，先确认不会影响返程'],
  },
  {
    key: 'wellbeing', icon: '养', label: '身心状态', shortLabel: '休息', primaryDoor: '休门',
    supportStars: ['天心', '天任'], supportGods: ['太阴', '九地'],
    action: '给休息、饮食和轻度活动留出固定时间', prepare: '减少透支并安排规律休息', check: '睡眠、饮食、精力和身体感受',
    outcome: '休息后稳定恢复的精力，而不是短时兴奋',
    cautionPattern: '疲劳可能在忙碌结束后才显现，主观状态会高估承受量',
    cautionAction: '观察睡眠、食欲和注意力，连续偏弱时主动减量。',
    fallback: '精力不足时先减量，不用靠压缩休息补进度',
    masterReason: '身心状态决定其他事情能否持续，先稳住状态可以减少全局消耗。',
    masterRiskReason: '它是其他安排的承载条件，状态判断失真会让所有计划同时超量。',
    personalSupportAction: '固定一段完整休息、规律进食或轻度活动，以恢复后的专注度判断承受量',
    personalSupportStop: '休息后仍无法集中注意力时，删去一项次要任务',
    personalReviewBoundary: '先恢复一顿饭或一段睡眠，不用兴奋感判断状态',
    statusGuard: '先看精力',
    trendActions: ['先保住睡眠与实际精力', '给饮食、休息和轻度活动留固定时间', '按真实精力删减一项次要任务', '把一段无打扰休息固定下来', '先恢复睡眠、饮食与注意力', '用一次轻量活动调整状态'],
    trendGuards: ['疲劳没有恢复，就主动减量', '睡眠、食欲或注意力连续偏弱时，先减任务', '不用短时兴奋高估当天承受量', '休息后仍未恢复时，不用意志硬撑', '饮食和睡眠连续紊乱时，先暂停加量', '注意力明显下降时，先离开当前任务'],
  },
];

const periodLabels: Record<FortunePeriod, string> = { today: '今日', month: '月运', year: '年运' };
const dailyFortuneCacheVersion = '2026-08-26-v46';
const dailyFortuneCacheStorageKey = 'shiyue-daily-fortune-cache-v1';
const dailyFortuneCacheLimit = 24;
const dailyFortuneCacheMaxAge = 1000 * 60 * 60 * 24 * 45;
const dailyFortuneMemoryCache = new Map<string, DailyFortuneCacheEntry>();
const personalContextCacheLimit = 12;
const personalFlowCacheLimit = 512;
const personalContextCache = new Map<string, PersonalContext>();
let dailyFortuneStorageLoaded = false;
const favorableDoors = new Set(['开门', '休门', '生门']);
const cautiousDoors = new Set(['伤门', '死门', '惊门']);
const supportiveGods = new Set(['值符', '太阴', '六合', '九天', '九地']);
const difficultGods = new Set(['螣蛇', '白虎', '玄武']);
const sanQiStems = new Set(['乙', '丙', '丁']);
const generating: Record<FiveElement, FiveElement> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const controlling: Record<FiveElement, FiveElement> = { 木: '土', 火: '金', 土: '水', 金: '木', 水: '火' };
const stemElements: Record<string, FiveElement> = {
  甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水',
};
const branchElements: Record<string, FiveElement> = {
  寅: '木', 卯: '木', 巳: '火', 午: '火', 辰: '土', 戌: '土', 丑: '土', 未: '土',
  申: '金', 酉: '金', 亥: '水', 子: '水',
};
const doorElements: Record<string, FiveElement> = {
  休门: '水', 生门: '土', 伤门: '木', 杜门: '木', 景门: '火', 死门: '土', 惊门: '金', 开门: '金',
};
const hiddenJiaStems: Record<string, string> = { 子: '戊', 戌: '己', 申: '庚', 午: '辛', 辰: '壬', 寅: '癸' };
const tenGodTopics: Record<string, string[]> = {
  正官: ['career', 'relationship'], 七杀: ['career', 'relationship', 'wellbeing'],
  正印: ['career', 'study', 'wellbeing'], 偏印: ['study', 'wellbeing'],
  食神: ['study', 'wealth', 'relationship', 'wellbeing'], 伤官: ['study', 'wealth', 'relationship', 'wellbeing'],
  正财: ['wealth', 'relationship'], 偏财: ['wealth', 'relationship'],
  比肩: ['career', 'relationship'], 劫财: ['career', 'wealth', 'relationship'],
};
const tenGodFocusLabels: Record<string, string> = {
  正官: '责任与规则', 七杀: '压力与突破', 正印: '支持与吸收', 偏印: '研究与调整',
  食神: '产出与分享', 伤官: '表达与变化', 正财: '稳定资源', 偏财: '流动资源',
  比肩: '自主与协作', 劫财: '竞争与分配',
};
const personalFocusNarratives: Record<string, string> = {
  '责任与规则': '责任、流程和长期安排',
  '压力与突破': '压力应对和关键突破',
  '支持与吸收': '学习吸收和外部支持',
  '研究与调整': '研究判断和策略调整',
  '产出与分享': '稳定产出和经验分享',
  '表达与变化': '表达方式和临场变化',
  '稳定资源': '稳定收入和长期资源',
  '流动资源': '外部机会和流动资源',
  '自主与协作': '自主决定和协作边界',
  '竞争与分配': '竞争压力和资源分配',
};
const flowLayerWeights: Record<QimenScope, Partial<Record<FortuneTriggerLayer['type'], number>>> = {
  year: { dayun: .35, year: .65 },
  month: { dayun: .15, year: .25, month: .6 },
  day: { dayun: .1, year: .18, month: .27, day: .45 },
  hour: { dayun: .05, year: .12, month: .18, day: .25, hour: .4 },
};

const elementReferences: Record<FiveElement, ElementReference> = {
  木: {
    colors: [{ name: '松柏绿', hex: '#6f8f72' }, { name: '米白', hex: '#f2eadb' }],
    numbers: [3, 8], direction: '正东',
  },
  火: {
    colors: [{ name: '暖珊瑚', hex: '#c96f61' }, { name: '杏色', hex: '#e6b67a' }],
    numbers: [2, 7], direction: '正南',
  },
  土: {
    colors: [{ name: '燕麦色', hex: '#c6ad86' }, { name: '陶土橙', hex: '#b87958' }],
    numbers: [0, 5], direction: '中央',
  },
  金: {
    colors: [{ name: '月白', hex: '#e8e5de' }, { name: '银灰', hex: '#aeb4bd' }],
    numbers: [4, 9], direction: '正西',
  },
  水: {
    colors: [{ name: '雾蓝', hex: '#718fae' }, { name: '墨蓝', hex: '#344b63' }],
    numbers: [1, 6], direction: '正北',
  },
};

const topicReferenceItems: Record<string, PracticalReferenceItem[]> = {
  career: [
    { name: '金属签字笔', symbol: '⌁', note: '用于确认工作清单；写下负责人、完成标准和截止时间后，再开始投入。' },
    { name: '银色夹子', symbol: '◇', note: '只夹住当前交付需要的资料，这一项没有收尾前不新增第二叠。' },
    { name: '暖色笔记本', symbol: '▥', note: '只记录本期必须交付的一件事、完成标准和收尾时间，避免任务越列越多。' },
  ],
  study: [
    { name: '木质书签', symbol: '▤', note: '夹在当前学习材料的停止位置；再次打开时先复述上次要点，再继续增加内容。' },
    { name: '暖色笔记本', symbol: '▥', note: '每次只留一页写目标、要点和练习结果，用输出检验是否真正掌握。' },
    { name: '银色夹子', symbol: '◇', note: '把当前学习材料集中成一叠，形成笔记或练习成果前不继续收集新资料。' },
  ],
  wealth: [
    { name: '米色卡套', symbol: '▣', note: '集中收好常用卡片和付款凭证，涉及金额时先核对条款、责任与付款节点。' },
    { name: '金属签字笔', symbol: '⌁', note: '只用于已经核清金额和责任的确认；口头条件没有落成记录前不签字。' },
    { name: '方形收纳盒', symbol: '□', note: '把报价、合同和付款记录集中收纳，缺少任何一项时先补资料，不急着付款。' },
  ],
  relationship: [
    { name: '圆润小挂件', symbol: '◌', note: '准备回应前先停一下，分清事实、感受和猜测，再只处理一个分歧。' },
    { name: '暖色笔记本', symbol: '▥', note: '沟通前写下要确认的事实和希望达成的下一步，避免在情绪里扩大话题。' },
    { name: '小型绿植', symbol: '🌿', note: '把它放在沟通区域，看到时提醒自己先听完对方重点，再表达判断。' },
  ],
  travel: [
    { name: '帆布袋', symbol: '◫', note: '把外出必需品集中收纳，出门前按证件、路线和返程时间逐项核对。' },
    { name: '蓝色卡套', symbol: '▣', note: '集中收好证件和常用卡片，路线变化时先确认返程，再决定是否追加行程。' },
    { name: '红色挂件', symbol: '●', note: '挂在钥匙或常用包上，出门看到它时检查物品、路线和时间余量。' },
  ],
  wellbeing: [
    { name: '陶瓷杯', symbol: '◉', note: '喝水时暂停一分钟，检查睡眠、食欲和注意力是否真的足以继续当前任务。' },
    { name: '小夜灯', symbol: '✦', note: '把亮灯当作晚间收尾信号，之后减少新任务和强刺激，为睡眠留出缓冲。' },
    { name: '小型绿植', symbol: '🌿', note: '休息时离开屏幕、看向远处并活动肩颈，用恢复后的专注度判断是否继续。' },
  ],
};

const shichenSlots = [
  { hour: 0, name: '子时', range: '23:00-00:59' },
  { hour: 2, name: '丑时', range: '01:00-02:59' },
  { hour: 4, name: '寅时', range: '03:00-04:59' },
  { hour: 6, name: '卯时', range: '05:00-06:59' },
  { hour: 8, name: '辰时', range: '07:00-08:59' },
  { hour: 10, name: '巳时', range: '09:00-10:59' },
  { hour: 12, name: '午时', range: '11:00-12:59' },
  { hour: 14, name: '未时', range: '13:00-14:59' },
  { hour: 16, name: '申时', range: '15:00-16:59' },
  { hour: 18, name: '酉时', range: '17:00-18:59' },
  { hour: 20, name: '戌时', range: '19:00-20:59' },
  { hour: 22, name: '亥时', range: '21:00-22:59' },
];

const practicalShichenHours = new Set([8, 10, 12, 14, 16, 18, 20, 22]);

function isPracticalHourAnalysis(analysis: ChartAnalysis) {
  return practicalShichenHours.has(analysis.date.getHours());
}

function currentShichenCenterHour(hour: number) {
  if (hour === 23) return 24;
  if (hour === 0) return 0;
  return hour % 2 === 1 ? hour + 1 : hour;
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function createReferenceDate(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

interface FortunePeriodRange {
  start: Date;
  end: Date;
  anchor: Date;
  startBoundary?: SolarTermEvidence;
  endBoundary?: SolarTermEvidence;
}

const solarTermCache = new Map<number, SolarTermEvidence[]>();

function solarTermsForYear(year: number) {
  const cached = solarTermCache.get(year);
  if (cached) return cached;
  const terms = calculateSolarTermsForYear(year);
  solarTermCache.set(year, terms);
  return terms;
}

function solarTermsAround(date: Date) {
  const year = date.getFullYear();
  return [year - 1, year, year + 1]
    .flatMap((item) => solarTermsForYear(item))
    .sort((left, right) => left.utcTimestamp - right.utcTimestamp);
}

function solarTermOnDate(date: Date) {
  const dateKey = formatDateKey(date);
  return solarTermsAround(date).find((term) => (
    new Date(term.utcTimestamp + 8 * 60 * 60 * 1000).toISOString().slice(0, 10) === dateKey
  ))?.name || '';
}

function getCalendarPeriodRange(now: Date, period: 'month' | 'year'): FortunePeriodRange {
  const start = period === 'month'
    ? new Date(now.getFullYear(), now.getMonth(), 1, 12, 0, 0, 0)
    : new Date(now.getFullYear(), 0, 1, 12, 0, 0, 0);
  const end = period === 'month'
    ? new Date(now.getFullYear(), now.getMonth() + 1, 0, 12, 0, 0, 0)
    : new Date(now.getFullYear(), 11, 31, 12, 0, 0, 0);
  return {
    start,
    end,
    anchor: new Date(start.getTime() + (end.getTime() - start.getTime()) / 2),
  };
}

function getPeriodRange(now: Date, period: FortunePeriod): FortunePeriodRange {
  const today = createReferenceDate(now);
  if (period === 'today') return { start: today, end: today, anchor: today };
  return getCalendarPeriodRange(now, period);
}

function getDailyFortuneStorage() {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function isCachedDailyFortuneResult(value: unknown): value is DailyFortuneResult {
  if (!value || typeof value !== 'object') return false;
  const result = value as Partial<DailyFortuneResult>;
  return (result.period === 'today' || result.period === 'month' || result.period === 'year')
    && typeof result.dateKey === 'string'
    && typeof result.summary === 'string'
    && Array.isArray(result.categories)
    && Array.isArray(result.evidenceInsights)
    && Array.isArray(result.timeWindows)
    && Array.isArray(result.periodTrend);
}

function trimDailyFortuneMemoryCache() {
  while (dailyFortuneMemoryCache.size > dailyFortuneCacheLimit) {
    const oldestKey = dailyFortuneMemoryCache.keys().next().value;
    if (!oldestKey) break;
    dailyFortuneMemoryCache.delete(oldestKey);
  }
}

function loadDailyFortuneStorageCache() {
  if (dailyFortuneStorageLoaded) return;
  dailyFortuneStorageLoaded = true;
  const storage = getDailyFortuneStorage();
  if (!storage) return;
  try {
    const raw = storage.getItem(dailyFortuneCacheStorageKey);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { version?: string; entries?: DailyFortuneCacheEntry[] };
    if (parsed.version !== dailyFortuneCacheVersion || !Array.isArray(parsed.entries)) {
      storage.removeItem(dailyFortuneCacheStorageKey);
      return;
    }
    const minimumCreatedAt = Date.now() - dailyFortuneCacheMaxAge;
    parsed.entries.forEach((entry) => {
      if (typeof entry?.key !== 'string' || typeof entry.createdAt !== 'number' || entry.createdAt < minimumCreatedAt) return;
      if (!isCachedDailyFortuneResult(entry.result)) return;
      dailyFortuneMemoryCache.set(entry.key, entry);
    });
    trimDailyFortuneMemoryCache();
  } catch {
    try {
      storage.removeItem(dailyFortuneCacheStorageKey);
    } catch {
      // 浏览器禁用本地存储时直接退回内存缓存。
    }
  }
}

function persistDailyFortuneCache() {
  const storage = getDailyFortuneStorage();
  if (!storage) return;
  const entries = [...dailyFortuneMemoryCache.values()].slice(-dailyFortuneCacheLimit);
  try {
    storage.setItem(dailyFortuneCacheStorageKey, JSON.stringify({ version: dailyFortuneCacheVersion, entries }));
  } catch {
    try {
      storage.setItem(dailyFortuneCacheStorageKey, JSON.stringify({
        version: dailyFortuneCacheVersion,
        entries: entries.slice(-Math.ceil(dailyFortuneCacheLimit / 2)),
      }));
    } catch {
      // 缓存空间不足不会影响本次本地计算结果。
    }
  }
}

function profileCacheSignature(profile?: DailyFortuneProfile) {
  if (!profile || !isDailyFortuneProfileComplete(profile)) return 'general';
  const signature = [
    profile.gender,
    profile.date,
    profile.dateType,
    profile.isLeapMonth ? '1' : '0',
    profile.time,
    profile.timeBasis,
    profile.locationName,
    profile.latitude,
    profile.longitude,
    profile.timezone,
  ].join('|');
  const reversed = [...signature].reverse().join('');
  return `${stableSeed(signature).toString(36)}-${stableSeed(reversed).toString(36)}-${signature.length}`;
}

function runtimeCacheSignature(now: Date, period: FortunePeriod, runtimeNow: Date) {
  if (period === 'today') {
    return formatDateKey(now) === formatDateKey(runtimeNow)
      ? `current-shichen-${formatDateKey(runtimeNow)}-${currentShichenCenterHour(runtimeNow.getHours())}`
      : 'fixed';
  }
  const selectedRange = getPeriodRange(now, period);
  const currentRange = getPeriodRange(runtimeNow, period);
  if (formatDateKey(selectedRange.start) !== formatDateKey(currentRange.start)) return 'fixed';
  if (period === 'month') return `current-day-${formatDateKey(runtimeNow)}`;
  return `current-month-${formatDateKey(runtimeNow).slice(0, 7)}`;
}

function dailyFortuneCacheKey(now: Date, profile: DailyFortuneProfile | undefined, period: FortunePeriod, runtimeNow: Date) {
  const periodKey = period === 'today' ? formatDateKey(now) : formatDateKey(getPeriodRange(now, period).start);
  return [
    dailyFortuneCacheVersion,
    period,
    periodKey,
    profileCacheSignature(profile),
    runtimeCacheSignature(now, period, runtimeNow),
  ].join('|');
}

function readDailyFortuneCache(key: string) {
  loadDailyFortuneStorageCache();
  const entry = dailyFortuneMemoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > dailyFortuneCacheMaxAge) {
    dailyFortuneMemoryCache.delete(key);
    persistDailyFortuneCache();
    return null;
  }
  dailyFortuneMemoryCache.delete(key);
  dailyFortuneMemoryCache.set(key, entry);
  return entry.result;
}

function writeDailyFortuneCache(key: string, result: DailyFortuneResult) {
  dailyFortuneMemoryCache.set(key, { key, createdAt: Date.now(), result });
  trimDailyFortuneMemoryCache();
  persistDailyFortuneCache();
}

export function clearDailyFortuneCache() {
  dailyFortuneMemoryCache.clear();
  dailyFortuneStorageLoaded = true;
  try {
    getDailyFortuneStorage()?.removeItem(dailyFortuneCacheStorageKey);
  } catch {
    // 清理持久缓存失败不影响后续重新计算。
  }
}

function enumerateDates(start: Date, end: Date) {
  const dates: Date[] = [];
  for (let cursor = createReferenceDate(start); cursor <= end; cursor = addDays(cursor, 1)) {
    if (cursor >= start) dates.push(cursor);
  }
  return dates;
}

function enumerateQimenMonths(range: FortunePeriodRange, minimumDate?: Date) {
  const boundaries = solarTermsAround(range.anchor)
    .filter((term) => term.isJie);
  return boundaries.flatMap((boundary, index) => {
    const nextBoundary = boundaries[index + 1];
    if (!nextBoundary) return [];
    if (nextBoundary.utcTimestamp <= range.start.getTime() || boundary.utcTimestamp > range.end.getTime()) return [];
    const segmentStart = new Date(Math.max(boundary.utcTimestamp, range.start.getTime()));
    const segmentEnd = new Date(Math.min(nextBoundary.utcTimestamp, range.end.getTime() + 1));
    if (minimumDate && segmentEnd <= minimumDate) return [];
    const effectiveStart = minimumDate && minimumDate > segmentStart ? minimumDate : segmentStart;
    return [new Date(effectiveStart.getTime() + (segmentEnd.getTime() - effectiveStart.getTime()) / 2)];
  });
}

function formatFullDate(date: Date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatShortDate(value: Date | string) {
  const date = typeof value === 'string' ? new Date(`${value}T12:00:00`) : value;
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function formatWeekday(date: Date) {
  return new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(date);
}

function formatTimeRange(range: string) {
  return range.replace('-', '—');
}

function dayPartForHour(hour: number) {
  if (hour <= 4) return '凌晨';
  if (hour <= 8) return '早晨';
  if (hour <= 10) return '上午';
  if (hour <= 12) return '中午';
  if (hour <= 16) return '下午';
  if (hour <= 18) return '傍晚';
  return '晚上';
}

function qimenMonthRangeForDate(date: Date) {
  const boundaries = solarTermsAround(date).filter((term) => term.isJie);
  const index = boundaries.findLastIndex((term) => term.utcTimestamp <= date.getTime());
  const start = boundaries[index];
  const end = boundaries[index + 1];
  if (!start || !end) return null;
  return {
    start: new Date(start.utcTimestamp),
    end: new Date(end.utcTimestamp - 1),
  };
}

function qimenMonthRangeWithinGregorianYear(date: Date) {
  const range = qimenMonthRangeForDate(date);
  if (!range) return null;
  const yearStart = new Date(date.getFullYear(), 0, 1, 0, 0, 0, 0);
  const yearEnd = new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
  return {
    start: new Date(Math.max(range.start.getTime(), yearStart.getTime())),
    end: new Date(Math.min(range.end.getTime(), yearEnd.getTime())),
  };
}

function formatDateSpan(start: Date, end: Date) {
  const startLabel = formatShortDate(start);
  const endLabel = formatShortDate(end);
  return start.getFullYear() === end.getFullYear()
    ? `${startLabel}—${endLabel}`
    : `${start.getFullYear()}年${startLabel}—${end.getFullYear()}年${endLabel}`;
}

function formatPeriodStageSpan(start: Date, end: Date) {
  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
    return `${start.getMonth() + 1}月${start.getDate()}日—${end.getDate()}日`;
  }
  return formatDateSpan(start, end);
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

export function isDailyFortuneProfileComplete(profile?: DailyFortuneProfile | null) {
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

function isFiveElement(value: string | undefined): value is FiveElement {
  return value === '木' || value === '火' || value === '土' || value === '金' || value === '水';
}

function createPersonalContext(profile: DailyFortuneProfile | undefined): PersonalContext | null {
  if (!profile || !isDailyFortuneProfileComplete(profile)) return null;
  const cacheKey = profileCacheSignature(profile);
  const cached = personalContextCache.get(cacheKey);
  if (cached) {
    personalContextCache.delete(cacheKey);
    personalContextCache.set(cacheKey, cached);
    return cached;
  }
  try {
    const birth = parseBirth(profile);
    const chart = baziCalculator.calculateBazi({
      year: birth.year,
      month: birth.month,
      day: birth.day,
      timeIndex: hourIndex(birth.hour),
      birthHour: birth.hour,
      birthMinute: birth.minute,
      gender: profile.gender,
      isLunar: profile.dateType === 'lunar',
      isLeapMonth: profile.dateType === 'lunar' && profile.isLeapMonth,
      useTrueSolarTime: profile.timeBasis === 'trueSolar',
      birthPlace: profile.locationName,
      birthLongitude: Number(profile.longitude),
      timezone: Number(profile.timezone) || 8,
    });
    const yearGan = chart.pillars.year.gan;
    const yearZhi = chart.pillars.year.zhi;
    const qimenStem = yearGan === '甲' ? hiddenJiaStems[yearZhi] || '戊' : yearGan;
    const usefulGod = chart.analysis.usefulGod;
    const favorable = [
      ...(usefulGod.primaryFavorableWuxing || []),
      ...(usefulGod.secondaryFavorableWuxing || []),
      ...(usefulGod.favorableWuxing || []),
    ].filter(isFiveElement);
    const unfavorable = [
      ...(usefulGod.primaryUnfavorableWuxing ? [usefulGod.primaryUnfavorableWuxing] : []),
      ...(usefulGod.secondaryUnfavorableWuxing || []),
      ...(usefulGod.unfavorableWuxing || []),
    ].filter(isFiveElement);
    const context: PersonalContext = {
      qimenStem,
      dayElement: isFiveElement(chart.dayMaster.element) ? chart.dayMaster.element : '土',
      referenceSeed: [chart.pillars.year, chart.pillars.month, chart.pillars.day, chart.pillars.hour].map((pillar) => pillar.ganZhi).join('|'),
      birthTimestamp: new Date(
        chart.solarDate.year,
        chart.solarDate.month - 1,
        chart.solarDate.day,
        birth.hour,
        birth.minute,
      ).getTime(),
      favorableElements: new Set(favorable),
      primaryFavorableElement: isFiveElement(usefulGod.primaryFavorableWuxing) ? usefulGod.primaryFavorableWuxing : favorable[0] || null,
      unfavorableElements: new Set(unfavorable),
      primaryUnfavorableElement: isFiveElement(usefulGod.primaryUnfavorableWuxing) ? usefulGod.primaryUnfavorableWuxing : unfavorable[0] || null,
      birthChart: chart,
      flowCache: new Map<string, PersonalFlowEvidence>(),
    };
    personalContextCache.set(cacheKey, context);
    while (personalContextCache.size > personalContextCacheLimit) {
      const oldestKey = personalContextCache.keys().next().value;
      if (!oldestKey) break;
      personalContextCache.delete(oldestKey);
    }
    return context;
  } catch {
    return null;
  }
}

function cachePersonalFlow(personal: PersonalContext, key: string, evidence: PersonalFlowEvidence) {
  personal.flowCache.set(key, evidence);
  while (personal.flowCache.size > personalFlowCacheLimit) {
    const oldestKey = personal.flowCache.keys().next().value;
    if (!oldestKey) break;
    personal.flowCache.delete(oldestKey);
  }
}

function neutralPersonalFlow(): PersonalFlowEvidence {
  return {
    alignment: 0,
    currentAlignment: 0,
    triggerIntensity: 0,
    formationAlignment: 0,
    focusTopics: new Set<string>(),
    focusLabels: [],
    triggerLevel: 'quiet',
    triggerLabels: [],
  };
}

function clampSignal(value: number, minimum = -1, maximum = 1) {
  return Math.max(minimum, Math.min(maximum, value));
}

function triggerRelationIntensity(type: string) {
  // 干支关系只表示触发强弱；吉凶方向仍由本命喜忌与当层五行决定。
  if (type === 'tianke-dichong' || type === 'suiyun-binglin') return 1;
  if (type === 'pillar-fuyin') return .9;
  if (type === 'branch-clash' || type === 'branch-punishment') return .78;
  if (type === 'stem-clash' || type === 'branch-harm') return .68;
  if (type === 'branch-break') return .56;
  if (type === 'stem-combine' || type === 'branch-combine') return .5;
  return .38;
}

function formationElementAlignment(personal: PersonalContext, groups: string[]) {
  const alignments = groups
    .map((group) => [...group].find(isFiveElement))
    .filter((element): element is FiveElement => Boolean(element))
    .map((element) => elementAlignment(personal, element));
  return alignments.length
    ? alignments.reduce<number>((total, value) => total + value, 0) / alignments.length
    : 0;
}

function normalizeGanZhi(value: string | undefined) {
  const match = value?.match(/[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]/);
  return match?.[0] || '';
}

function elementAlignment(personal: PersonalContext, element: FiveElement | undefined) {
  if (!element) return 0;
  if (element === personal.primaryFavorableElement) return 1;
  if (element === personal.primaryUnfavorableElement) return -1;
  if (personal.favorableElements.has(element)) return .65;
  if (personal.unfavorableElements.has(element)) return -.65;
  return 0;
}

function ganZhiAlignment(personal: PersonalContext, ganZhi: string) {
  const normalized = normalizeGanZhi(ganZhi);
  if (!normalized) return 0;
  const stemAlignment = elementAlignment(personal, stemElements[normalized[0]]);
  const branchAlignment = elementAlignment(personal, branchElements[normalized[1]]);
  return stemAlignment * .58 + branchAlignment * .42;
}

function createFortuneLayer(id: string, type: FortuneTriggerLayer['type'], label: string, ganZhi: string): FortuneTriggerLayer | null {
  const normalized = normalizeGanZhi(ganZhi);
  return normalized ? { id, type, label, ganZhi: normalized } : null;
}

function currentFlowContext(personal: PersonalContext, date: Date, scope: QimenScope) {
  const current = buildCurrentBaziFortuneSelection(personal.birthChart, date);
  if (!current) return null;
  const selection = scope === 'year'
    ? { ...current, scope: 'year' as const }
    : scope === 'month'
      ? { ...current, scope: 'month' as const }
      : current;
  return buildFortuneSelectionContext(personal.birthChart, selection);
}

function buildPersonalFlowEvidence(
  personal: PersonalContext | null,
  date: Date,
  scope: QimenScope,
  chart: QimenData,
): PersonalFlowEvidence {
  if (!personal) return neutralPersonalFlow();
  const cacheKey = `${scope}|${formatDateKey(date)}|${scope === 'hour' ? date.getHours() : ''}`;
  const cached = personal.flowCache.get(cacheKey);
  if (cached) return cached;
  try {
    const context = currentFlowContext(personal, date, scope);
    if (!context) return neutralPersonalFlow();
    const layerCandidates = [
      createFortuneLayer('dayun', 'dayun', context.cycleLabel, context.cycleGanZhi),
      createFortuneLayer('year', 'year', `${context.year || date.getFullYear()}年流年`, context.yearGanZhi || chart.ganzhi.year),
      scope !== 'year' ? createFortuneLayer('month', 'month', context.monthLabel || '流月', context.monthGanZhi || chart.ganzhi.month) : null,
      scope === 'day' || scope === 'hour' ? createFortuneLayer('day', 'day', '流日', chart.ganzhi.day) : null,
      scope === 'hour' ? createFortuneLayer('hour', 'hour', '流时', chart.ganzhi.hour) : null,
    ];
    const layers = layerCandidates.filter((item): item is FortuneTriggerLayer => Boolean(item));
    const weights = flowLayerWeights[scope];
    const weightedLayers = layers.map((layer) => ({
      layer,
      weight: weights[layer.type] || 0,
      alignment: ganZhiAlignment(personal, layer.ganZhi),
    })).filter((item) => item.weight > 0);
    const totalWeight = weightedLayers.reduce((total, item) => total + item.weight, 0) || 1;
    const alignment = weightedLayers.reduce((total, item) => total + item.alignment * item.weight, 0) / totalWeight;
    const currentLayer = [...layers].reverse().find((item) => item.type === scope) || layers[layers.length - 1];
    const currentAlignment = currentLayer ? ganZhiAlignment(personal, currentLayer.ganZhi) : alignment;
    const currentGanZhi = currentLayer?.ganZhi || '';
    const tenGods = currentGanZhi
      ? [getTenGod(currentGanZhi[0], personal.birthChart.dayMaster.gan), getTenGodForBranch(currentGanZhi[1], personal.birthChart.dayMaster.gan)]
      : [];
    const focusTopics = new Set(tenGods.flatMap((item) => tenGodTopics[item] || []));
    const focusLabels = [...new Set(tenGods.map((item) => tenGodFocusLabels[item]).filter(Boolean))];
    const triggers = analyzeFortuneTriggers(personal.birthChart, layers);
    const resolvedCurrentLayer = triggers.layers.find((item) => item.type === currentLayer?.type && item.id === currentLayer?.id);
    const currentRelations = triggers.relations.filter((item) => item.source.type === currentLayer?.type);
    const currentPrimary = triggers.primaryRelations.filter((item) => item.source.type === currentLayer?.type);
    const currentFormations = triggers.formations.filter((item) => item.triggerLayerKeys.includes(resolvedCurrentLayer?.key || ''));
    const triggerIntensity = Math.max(
      0,
      ...currentRelations.map((item) => triggerRelationIntensity(item.type)),
      ...currentFormations.map(() => .72),
    );
    const formationAlignment = formationElementAlignment(personal, currentFormations.map((item) => item.group));
    const triggerLabels = [...currentPrimary, ...currentRelations]
      .map((item) => item.label)
      .concat(currentFormations.map((item) => item.label))
      .filter((item, index, values) => values.indexOf(item) === index)
      .slice(0, 2);
    const evidence: PersonalFlowEvidence = {
      alignment,
      currentAlignment,
      triggerIntensity,
      formationAlignment,
      focusTopics,
      focusLabels,
      triggerLevel: currentPrimary.length || currentFormations.length ? 'strong' : currentRelations.length ? 'active' : 'quiet',
      triggerLabels,
    };
    cachePersonalFlow(personal, cacheKey, evidence);
    return evidence;
  } catch {
    const neutral = neutralPersonalFlow();
    cachePersonalFlow(personal, cacheKey, neutral);
    return neutral;
  }
}

function findStemPalace(chart: QimenData, stem: string) {
  return chart.jiuGongGe.find((palace) => palace.tianPan.stem === stem || palace.tianPan.companionStem === stem)
    || chart.jiuGongGe.find((palace) => palace.diPan.stem === stem)
    || null;
}

function findDoorPalace(chart: QimenData, door: string) {
  return chart.jiuGongGe.find((palace) => palace.renPan.door === door && palace.gong !== 5) || null;
}

function elementsSupport(left: FiveElement, right: FiveElement) {
  return left === right || generating[left] === right || generating[right] === left;
}

function elementsConflict(left: FiveElement, right: FiveElement) {
  return controlling[left] === right || controlling[right] === left;
}

function structuralRiskKind(name: string) {
  if (name.includes('门迫')) return '门迫';
  if (name.includes('击刑')) return '击刑';
  if (name.includes('入墓')) return '入墓';
  if (name.includes('五不遇')) return '五不遇';
  return '';
}

function personalRelationForPalace(chart: QimenData, palace: QimenJiuGongGe, personal: PersonalContext | null): PersonalRelation {
  if (!personal) return 'neutral';
  const personalPalace = findStemPalace(chart, personal.qimenStem);
  let supportVotes = 0;
  let reviewVotes = 0;
  if (personalPalace && isFiveElement(personalPalace.element) && isFiveElement(palace.element)) {
    if (personalPalace.gong === palace.gong) {
      const isVoid = chart.voidPalaces?.some((item) => item.palace === palace.gong);
      const hasRisk = chart.palaceInsights?.some((item) => item.gong === palace.gong && item.level === '风险');
      if (isVoid || hasRisk) reviewVotes += 2;
      else supportVotes += 2;
    } else if (elementsSupport(personalPalace.element, palace.element)) supportVotes += 1;
    else if (elementsConflict(personalPalace.element, palace.element)) reviewVotes += 1;
  }
  if (isFiveElement(palace.element)) {
    if (elementsSupport(personal.dayElement, palace.element)) supportVotes += 1;
    else if (elementsConflict(personal.dayElement, palace.element)) reviewVotes += 1;
    const usefulAlignment = elementAlignment(personal, palace.element);
    if (usefulAlignment >= .65) supportVotes += usefulAlignment >= 1 ? 2 : 1;
    else if (usefulAlignment <= -.65) reviewVotes += usefulAlignment <= -1 ? 2 : 1;
  }
  if (supportVotes > reviewVotes) return 'support';
  if (reviewVotes > supportVotes) return 'review';
  return 'neutral';
}

function evaluatePalaceSignals(
  chart: QimenData,
  palace: QimenJiuGongGe,
  definition: TopicDefinition | null,
  personal: PersonalContext | null,
  personalFlow: PersonalFlowEvidence,
): PalaceSignals {
  const insights = chart.palaceInsights?.filter((item) => item.gong === palace.gong) || [];
  const patterns = chart.classicPatterns?.filter((item) => item.palaces.includes(palace.gong)) || [];
  const structuralRisks = new Set(patterns.filter((item) => item.type === 'bad').map((item) => structuralRiskKind(item.name)).filter(Boolean));
  let hardRiskCount = structuralRisks.size;
  if (chart.voidPalaces?.some((item) => item.palace === palace.gong)) hardRiskCount += 1;
  if (chart.scope === 'hour' && chart.specialConditions?.isWuBuYuShi) hardRiskCount += 1;

  let supportCount = 0;
  let softRiskCount = 0;
  if (insights.some((item) => item.level === '有利')) supportCount += 1;
  if (insights.some((item) => item.level === '风险')) softRiskCount += 1;
  if (patterns.some((item) => item.type === 'good')) supportCount += 1;
  if (patterns.some((item) => item.type === 'bad' && !structuralRiskKind(item.name))) softRiskCount += 1;
  if (supportiveGods.has(palace.shenPan.god)) supportCount += 1;
  if (difficultGods.has(palace.shenPan.god)) softRiskCount += 1;
  if (sanQiStems.has(palace.tianPan.stem) || (palace.tianPan.companionStem && sanQiStems.has(palace.tianPan.companionStem))) supportCount += 1;
  if (chart.zhiShi === palace.renPan.door) supportCount += 1;
  if (definition?.supportStars.includes(palace.tianPan.star) || (palace.tianPan.companionStar && definition?.supportStars.includes(palace.tianPan.companionStar))) supportCount += 1;
  if (definition?.supportGods.includes(palace.shenPan.god)) supportCount += 1;
  if (definition?.key === 'travel' && chart.horseStar?.palace === palace.gong) supportCount += 1;
  if (definition?.key === 'wellbeing' && (palace.tianPan.star === '天芮' || palace.tianPan.companionStar === '天芮')) softRiskCount += 1;

  const doorElement = doorElements[palace.renPan.door];
  const seasonElement = chart.seasonality?.seasonalElement;
  if (doorElement && isFiveElement(seasonElement)) {
    if (doorElement === seasonElement || generating[seasonElement] === doorElement) supportCount += 1;
    else if (controlling[seasonElement] === doorElement) softRiskCount += 1;
  }

  const personalRelation = personalRelationForPalace(chart, palace, personal);
  if (personalRelation === 'support') supportCount += 1;
  else if (personalRelation === 'review') softRiskCount += 1;

  return {
    supportCount,
    softRiskCount,
    hardRiskCount,
    personalRelation,
    personalChange: personalFlow.triggerLevel !== 'quiet',
  };
}

function toneFromScore(score: number, threshold = .5): DailyFortuneTone {
  if (score >= threshold) return 'favorable';
  if (score <= -threshold) return 'cautious';
  return 'balanced';
}

function structuralSignal(signals: PalaceSignals) {
  // 单个辅助信号只轻量参与；明确风险叠加时非线性增强，避免被普通吉项平均掉。
  const supportTable = [0, .12, .34, .68, .9, 1.05];
  const softRiskTable = [0, .12, .38, .72, 1.05];
  const support = supportTable[Math.min(signals.supportCount, supportTable.length - 1)];
  const softRisk = softRiskTable[Math.min(signals.softRiskCount, softRiskTable.length - 1)];
  const hardRisk = signals.hardRiskCount * .72;
  return clampSignal(support - softRisk - hardRisk, -1.35, 1.15);
}

function activeDoorScore(chart: QimenData, signals: PalaceSignals) {
  const doorSignal = favorableDoors.has(chart.zhiShi) ? .55 : cautiousDoors.has(chart.zhiShi) ? -.55 : 0;
  let score = doorSignal + structuralSignal(signals) * .58;
  if (signals.hardRiskCount >= 2) score = Math.min(score, -.78);
  else if (signals.hardRiskCount === 1) score = Math.min(score, .12);
  return clampSignal(score, -1.3, 1.15);
}

function categoryToneWithPersonalFlow(
  qimenScore: number,
  signals: PalaceSignals,
  definition: TopicDefinition,
  flow: PersonalFlowEvidence,
) {
  const topicActive = flow.focusTopics.has(definition.key);
  const baseAlignment = flow.alignment * .62 + flow.currentAlignment * .38;
  const triggerFactor = 1 + flow.triggerIntensity * (topicActive ? .32 : .1);
  const focusFactor = topicActive ? 1 : .32;
  const personalAlignment = clampSignal(
    (baseAlignment * triggerFactor + flow.formationAlignment * .28) * focusFactor,
  );
  let score = qimenScore + personalAlignment * .48;
  if (signals.hardRiskCount >= 2) score = Math.min(score, -.62);
  else if (signals.hardRiskCount === 1) score = Math.min(score, .18);
  score = clampSignal(score, -1.35, 1.25);
  return { tone: toneFromScore(score), score, personalAlignment };
}

function analyzeChart(date: Date, scope: QimenScope, personal: PersonalContext | null): ChartAnalysis {
  const chart = generateQimen(date, 'zhuanpan', scope, 'chaibu');
  const dateKey = formatDateKey(date);
  const personalFlow = buildPersonalFlowEvidence(personal, date, scope, chart);
  const activePalace = findDoorPalace(chart, chart.zhiShi) || chart.jiuGongGe.find((item) => item.gong !== 5)!;
  const activeSignals = evaluatePalaceSignals(chart, activePalace, null, personal, personalFlow);
  const activeScore = activeDoorScore(chart, activeSignals);
  const activeTone = toneFromScore(activeScore);
  const categories = topicDefinitions.map((definition) => {
    const palace = findDoorPalace(chart, definition.primaryDoor) || activePalace;
    const signals = evaluatePalaceSignals(chart, palace, definition, personal, personalFlow);
    const personalResult = categoryToneWithPersonalFlow(structuralSignal(signals), signals, definition, personalFlow);
    return {
      definition,
      palace,
      tone: personalResult.tone,
      score: personalResult.score,
      supportCount: signals.supportCount,
      riskCount: signals.hardRiskCount * 2 + signals.softRiskCount,
      personalRelation: signals.personalRelation,
      personalChange: signals.personalChange,
      personalAlignment: personalResult.personalAlignment,
      personalFocus: personalFlow.focusTopics.has(definition.key) ? personalFlow.focusLabels : [],
    } satisfies CategoryEvaluation;
  });
  const favorableCount = categories.filter((item) => item.tone === 'favorable').length;
  const cautiousCount = categories.filter((item) => item.tone === 'cautious').length;
  const categoryAverage = categories.reduce((total, item) => total + item.score, 0) / categories.length;
  const strongestRisk = Math.min(...categories.map((item) => item.score));
  let score = categoryAverage * .68 + activeScore * .32;
  if (strongestRisk <= -.9) score = Math.min(score, -.3);
  if (cautiousCount >= 3 || (activeTone === 'cautious' && cautiousCount >= 2)) score = Math.min(score, -.5);
  if (favorableCount >= 3 && cautiousCount === 0 && activeTone === 'favorable') score = Math.max(score, .5);
  score = clampSignal(score, -1.25, 1.15);
  const tone = toneFromScore(score);
  return { date, dateKey, chart, activePalace, activeTone, activeScore, tone, score, categories };
}

function toneRank(tone: DailyFortuneTone) {
  return tone === 'favorable' ? 2 : tone === 'balanced' ? 1 : 0;
}

function compareAnalyses(left: ChartAnalysis, right: ChartAnalysis) {
  const leftFavorable = left.categories.filter((item) => item.tone === 'favorable').length;
  const rightFavorable = right.categories.filter((item) => item.tone === 'favorable').length;
  const leftCautious = left.categories.filter((item) => item.tone === 'cautious').length;
  const rightCautious = right.categories.filter((item) => item.tone === 'cautious').length;
  const leftSupport = left.categories.reduce((total, item) => total + item.supportCount - item.riskCount, 0);
  const rightSupport = right.categories.reduce((total, item) => total + item.supportCount - item.riskCount, 0);
  return right.score - left.score
    || toneRank(right.tone) - toneRank(left.tone)
    || rightFavorable - leftFavorable
    || leftCautious - rightCautious
    || rightSupport - leftSupport
    || left.date.getTime() - right.date.getTime();
}

function statusMeta(tone: DailyFortuneTone) {
  if (tone === 'favorable') return { label: '适合推进', tone };
  if (tone === 'cautious') return { label: '暂缓决定', tone };
  return { label: '先确认', tone };
}

function friendlyCategoryDetail(
  evaluation: CategoryEvaluation,
  period: FortunePeriod,
  bestAnalysis?: ChartAnalysis,
) {
  const { definition, tone } = evaluation;
  const bestWindow = bestAnalysis ? formatAnalysisWindow(bestAnalysis, period) : '';
  const dateLead = bestWindow ? `${bestWindow}更适合安排：` : '';
  if (definition.key === 'wellbeing') {
    return tone === 'favorable'
      ? `${dateLead}${definition.action}，优先恢复精力。`
      : tone === 'cautious'
        ? `${definition.prepare}，先观察${definition.check}。`
        : `${dateLead}保持规律作息和饮食，按真实精力调整强度。`;
  }
  return tone === 'favorable'
    ? `${dateLead}${definition.action}，把最重要的一步先完成。`
    : tone === 'cautious'
      ? `${definition.prepare}，涉及${definition.check}的决定先别急着定。`
      : `${dateLead}${definition.action}，但先确认${definition.check}。`;
}

function categoryDetailFromJudgment(
  aggregate: CategoryAggregate,
  judgment: FortuneMasterJudgment,
  period: FortunePeriod,
) {
  const { evaluation, bestAnalysis } = aggregate;
  const { definition, tone } = evaluation;
  const bestWindow = bestAnalysis ? formatAnalysisWindow(bestAnalysis, period) : '';
  const bestLead = bestWindow ? `${bestWindow}可优先安排；` : '';
  const isPrimary = definition.key === judgment.primary.evaluation.definition.key;
  const isSecondary = definition.key === judgment.secondary.evaluation.definition.key;
  const isCaution = definition.key === judgment.caution.evaluation.definition.key;
  const preparation = definition.prepare.replace(/^先/, '');
  // 月内或年内偶有谨慎样本，只用于安排复核日期；只有综合评价本身偏谨慎，
  // 才把它上升为整段周期的牵制，避免把局部波动误写成整体短板。
  const hasActualCaution = tone === 'cautious';
  const scopeLabel = period === 'today' ? '当天' : period === 'month' ? '本月' : '全年';
  const controlledGoal = period === 'today'
    ? '以能确认、能收尾为准'
    : period === 'month' ? '在条件较齐的日期推进一段' : '放在支持较集中的阶段逐步经营';

  if (isCaution && tone !== 'favorable') {
    if (!hasActualCaution) {
      return definition.key === 'wellbeing'
        ? `身心状态不会直接阻断${scopeLabel}安排，但会决定其他事情能持续多久。若休息后仍无法恢复专注，先删去次要任务。`
        : `${definition.label}可以正常安排，但必须先把${definition.check}确认到能执行的程度。仍有缺口时，先${preparation}，不提前扩大范围。`;
    }
    if (definition.key === 'wellbeing') {
      return `这是${scopeLabel}牵动整体节奏的短板。先把任务量降到不影响基本作息，再用一段完整休息后的恢复程度决定是否继续。`;
    }
    return `这是${scopeLabel}最需要把关的一环，不适合边做边补条件。先${preparation}，等${definition.check}明确后再承诺或推进。`;
  }
  if (isPrimary) {
    if (tone === 'favorable' && definition.key === 'wellbeing') return `这是${scopeLabel}最值得优先照顾的一项。以休息后能稳定恢复的精力作为继续安排其他事情的前提，不用短时兴奋代替真实恢复。`;
    if (tone === 'favorable') return `这是${scopeLabel}整体判断中的主线。以${definition.outcome}作为实际成果，完成后再决定是否扩展。`;
    if (tone === 'balanced') return `这是${scopeLabel}相对稳定的主线。以${definition.outcome}作为本阶段成果；${controlledGoal}。`;
    return `眼下没有明显顺势项，这一项只是相对可控。先${preparation}，不以扩大进度为目标。`;
  }
  if (isSecondary) {
    if (tone === 'favorable') return `可作为${scopeLabel}主线之后的第二步。${bestLead}${definition.action}，形成${definition.outcome}即可收尾，不必与主线同时铺开。`;
    if (definition.key === 'wellbeing') return `${bestLead}保持规律作息和饮食，让状态能够承接后续安排。`;
    return period === 'today'
      ? `适合作为配合项，等主线稳定后再处理。先${preparation}，形成${definition.outcome}后便转回主线。`
      : `这是${scopeLabel}的辅助线，不必与主线同时用力。放在条件较齐的阶段处理，并以${definition.outcome}作为收尾。`;
  }
  if (definition.key === 'wellbeing') {
    return tone === 'favorable'
      ? `${bestLead}状态可以承接日常安排，但仍要给休息、饮食和轻度活动留出固定时间。`
      : `${definition.prepare}，按睡眠、饮食和真实精力调整任务量。`;
  }
  if (tone === 'favorable') return `${bestLead}${definition.action}，以${definition.outcome}作为收尾；这是${scopeLabel}的辅助推进项，不必抢在主线之前。`;
  if (tone === 'cautious') return `${definition.fallback}；等${definition.check}重新明确后再评估。`;
  return period === 'today'
    ? `${bestLead}${definition.action}，并留下${definition.outcome}；${definition.fallback}。`
    : `${bestLead}${definition.action}，以${definition.outcome}作为阶段成果。`;
}

function categoryStatusFromJudgment(
  aggregate: CategoryAggregate,
  judgment: FortuneMasterJudgment,
) {
  const key = aggregate.evaluation.definition.key;
  const isPrimary = key === judgment.primary.evaluation.definition.key;
  const isSecondary = key === judgment.secondary.evaluation.definition.key;
  const isCaution = key === judgment.caution.evaluation.definition.key;
  if (isPrimary) return aggregate.evaluation.tone === 'cautious' ? '守住基本盘' : '本期主线';
  if (isCaution) return aggregate.evaluation.tone === 'cautious' ? '重点把关' : aggregate.evaluation.definition.statusGuard;
  if (isSecondary) return aggregate.evaluation.tone === 'cautious' ? '只作维护' : '主线后再做';
  if (aggregate.evaluation.tone === 'favorable') return '主线后补充';
  if (aggregate.evaluation.tone === 'cautious') return '暂不加量';
  return aggregate.cautiousCount > 0 ? aggregate.evaluation.definition.statusGuard : '维持基本量';
}

function formatAnalysisWindow(analysis: ChartAnalysis, period: FortunePeriod) {
  if (period === 'today') {
    const slot = shichenSlots.find((item) => item.hour === analysis.date.getHours());
    return slot ? `${dayPartForHour(slot.hour)} ${formatTimeRange(slot.range)}` : `${analysis.date.getHours()}:00`;
  }
  if (period === 'year') {
    const monthRange = qimenMonthRangeWithinGregorianYear(analysis.date);
    return monthRange ? `公历${formatPeriodStageSpan(monthRange.start, monthRange.end)}` : `${analysis.date.getMonth() + 1}月`;
  }
  return `${formatShortDate(analysis.date)}（${formatWeekday(analysis.date)}）`;
}

function categoryBasis(
  evaluation: CategoryEvaluation,
  period: FortunePeriod,
  cautiousCount: number,
  worstAnalysis?: ChartAnalysis,
) {
  if (!worstAnalysis || !cautiousCount) return '';
  return `${formatAnalysisWindow(worstAnalysis, period)}：${evaluation.definition.cautionPattern}。`;
}

function categoryFromEvaluation(
  evaluation: CategoryEvaluation,
  period: FortunePeriod,
  stats: Pick<CategoryAggregate, 'sampleCount' | 'favorableCount' | 'cautiousCount' | 'bestAnalysis' | 'worstAnalysis'>,
): DailyFortuneCategory {
  const meta = statusMeta(evaluation.tone);
  const basis = categoryBasis(evaluation, period, stats.cautiousCount, stats.worstAnalysis);
  return {
    key: evaluation.definition.key,
    icon: evaluation.definition.icon,
    label: evaluation.definition.label,
    status: meta.label,
    tone: meta.tone,
    detail: friendlyCategoryDetail(evaluation, period, stats.bestAnalysis),
    basis,
  };
}

function categorySignalScore(evaluation: CategoryEvaluation) {
  return evaluation.score;
}

function aggregatePersonalRelation(evaluations: CategoryEvaluation[]): PersonalRelation {
  const support = evaluations.filter((item) => item.personalRelation === 'support').length;
  const review = evaluations.filter((item) => item.personalRelation === 'review').length;
  if (support > review) return 'support';
  if (review > support) return 'review';
  return 'neutral';
}

function aggregatePeriodCategories(
  contextAnalyses: ChartAnalysis[],
  sampleAnalyses: ChartAnalysis[],
  period: FortunePeriod,
): CategoryAggregate[] {
  const contextWeights: Record<FortunePeriod, Partial<Record<QimenScope, number>>> = {
    today: { year: .12, month: .2, day: .4 },
    month: { year: .18, month: .42 },
    year: { year: .55 },
  };
  const sampleWeight: Record<FortunePeriod, number> = { today: .28, month: .4, year: .45 };
  return topicDefinitions.map((definition) => {
    const contexts = contextAnalyses
      .map((analysis) => ({ analysis, evaluation: analysis.categories.find((item) => item.definition.key === definition.key)! }))
      .filter((item) => Boolean(item.evaluation));
    const samples = sampleAnalyses
      .map((analysis) => ({ analysis, evaluation: analysis.categories.find((item) => item.definition.key === definition.key)! }))
      .filter((item) => Boolean(item.evaluation));
    const deepestContext = contexts[contexts.length - 1]?.evaluation || samples[0]?.evaluation;
    if (!deepestContext) throw new Error(`缺少${definition.label}的周期分析。`);
    const sampleAverage = samples.length
      ? samples.reduce((total, item) => total + categorySignalScore(item.evaluation), 0) / samples.length
      : categorySignalScore(deepestContext);
    const scopeCounts = contexts.reduce((counts, item) => {
      const scope = item.analysis.chart.scope || 'day';
      counts.set(scope, (counts.get(scope) || 0) + 1);
      return counts;
    }, new Map<QimenScope, number>());
    const contextScore = contexts.reduce((total, item) => {
      const scope = item.analysis.chart.scope || 'day';
      const count = scopeCounts.get(scope) || 1;
      return total + categorySignalScore(item.evaluation) * (contextWeights[period][scope] || 0) / count;
    }, 0);
    const weightedScore = contextScore + sampleAverage * sampleWeight[period];
    const favorableRatio = samples.filter((item) => item.evaluation.tone === 'favorable').length / Math.max(1, samples.length);
    const cautiousRatio = samples.filter((item) => item.evaluation.tone === 'cautious').length / Math.max(1, samples.length);
    const tone: DailyFortuneTone = cautiousRatio >= .5 && deepestContext.tone !== 'favorable'
      ? 'cautious'
      : favorableRatio >= .5 && cautiousRatio <= .2 && deepestContext.tone !== 'cautious'
        ? 'favorable'
        : weightedScore >= .58 && (favorableRatio >= .16 || (deepestContext.tone === 'favorable' && cautiousRatio === 0))
          ? 'favorable'
          : weightedScore <= -.58 && (cautiousRatio >= .16 || (deepestContext.tone === 'cautious' && favorableRatio === 0))
            ? 'cautious'
            : 'balanced';
    const displaySamples = period === 'today'
      ? samples.filter((item) => isPracticalHourAnalysis(item.analysis))
      : samples;
    const displayCandidates = displaySamples.length ? displaySamples : samples;
    const best = [...displayCandidates].filter((item) => item.evaluation.tone !== 'cautious').sort((left, right) => categorySignalScore(right.evaluation) - categorySignalScore(left.evaluation)
      || left.analysis.date.getTime() - right.analysis.date.getTime())[0];
    const worst = [...(displaySamples.length ? displaySamples : samples)].sort((left, right) => categorySignalScore(left.evaluation) - categorySignalScore(right.evaluation)
      || left.analysis.date.getTime() - right.analysis.date.getTime())[0];
    const allEvaluations = [...contexts.map((item) => item.evaluation), ...samples.map((item) => item.evaluation)];
    const focusCounts = new Map<string, number>();
    allEvaluations.flatMap((item) => item.personalFocus).forEach((label) => focusCounts.set(label, (focusCounts.get(label) || 0) + 1));
    const combined: CategoryEvaluation = {
      ...deepestContext,
      tone,
      score: weightedScore,
      supportCount: Math.round(allEvaluations.reduce((total, item) => total + item.supportCount, 0) / allEvaluations.length),
      riskCount: Math.round(allEvaluations.reduce((total, item) => total + item.riskCount, 0) / allEvaluations.length),
      personalRelation: aggregatePersonalRelation(allEvaluations),
      personalChange: allEvaluations.some((item) => item.personalChange),
      personalAlignment: allEvaluations.reduce((total, item) => total + item.personalAlignment, 0) / allEvaluations.length,
      personalFocus: [...focusCounts.entries()].sort((left, right) => right[1] - left[1]).slice(0, 2).map(([label]) => label),
    };
    const favorableCount = samples.filter((item) => item.evaluation.tone === 'favorable').length;
    const cautiousCount = samples.filter((item) => item.evaluation.tone === 'cautious').length;
    const stats = {
      sampleCount: samples.length,
      favorableCount,
      cautiousCount,
      bestAnalysis: best?.analysis,
      worstAnalysis: worst?.evaluation.tone === 'cautious' ? worst.analysis : undefined,
    };
    return {
      category: categoryFromEvaluation(combined, period, stats),
      evaluation: combined,
      ...stats,
    };
  });
}

function updateAggregateWindowsForRemainingPeriod(
  aggregates: CategoryAggregate[],
  analyses: ChartAnalysis[],
) {
  aggregates.forEach((aggregate) => {
    const candidates = analyses.map((analysis) => ({
      analysis,
      evaluation: analysis.categories.find((item) => item.definition.key === aggregate.evaluation.definition.key),
    })).filter((item): item is { analysis: ChartAnalysis; evaluation: CategoryEvaluation } => Boolean(item.evaluation));
    aggregate.bestAnalysis = [...candidates].filter((item) => item.evaluation.tone !== 'cautious')
      .sort((left, right) => categorySignalScore(right.evaluation) - categorySignalScore(left.evaluation) || compareAnalyses(left.analysis, right.analysis))[0]?.analysis;
    const worst = [...candidates]
      .sort((left, right) => categorySignalScore(left.evaluation) - categorySignalScore(right.evaluation) || left.analysis.date.getTime() - right.analysis.date.getTime())[0];
    aggregate.worstAnalysis = worst?.evaluation.tone === 'cautious' ? worst.analysis : undefined;
  });
}

function fortunePeriodLead(period: FortunePeriod, isCurrentPeriod: boolean) {
  if (period === 'today') return isCurrentPeriod ? '今天' : '这一天';
  if (period === 'month') return isCurrentPeriod ? '本月' : '这个月';
  return isCurrentPeriod ? '今年' : '这一年';
}

function analysisTopicScore(analysis: ChartAnalysis, topicKey: string) {
  return analysis.categories.find((item) => item.definition.key === topicKey)?.score || 0;
}

function isUsablePriorityAnalysis(analysis: ChartAnalysis) {
  return analysis.tone !== 'cautious'
    || analysis.categories.filter((item) => item.tone === 'favorable').length >= 2;
}

function chooseJudgmentAnalyses(
  analyses: ChartAnalysis[],
  primary: CategoryAggregate,
  caution: CategoryAggregate,
) {
  const primaryKey = primary.evaluation.definition.key;
  const cautionKey = caution.evaluation.definition.key;
  const usableAnalyses = analyses.filter(isUsablePriorityAnalysis);
  const primaryCandidates = usableAnalyses.filter((analysis) => {
    const rankedCategories = [...analysis.categories].sort((left, right) => categorySignalScore(right) - categorySignalScore(left));
    const favorableCategories = rankedCategories.filter((item) => item.tone === 'favorable');
    const balancedCategories = rankedCategories.filter((item) => item.tone === 'balanced');
    const focusCategories = (favorableCategories.length ? favorableCategories : balancedCategories).slice(0, 3);
    return focusCategories.some((item) => item.definition.key === primaryKey);
  });
  const bestAnalysis = [...(primaryCandidates.length ? primaryCandidates : usableAnalyses)].sort((left, right) => (
    (right.score * .58 + analysisTopicScore(right, primaryKey) * .42)
    - (left.score * .58 + analysisTopicScore(left, primaryKey) * .42)
    || compareAnalyses(left, right)
  ))[0];
  const cautionAnalysis = [...analyses]
    .filter((analysis) => analysis.date.getTime() !== bestAnalysis?.date.getTime())
    .sort((left, right) => (
      (left.score * .45 + analysisTopicScore(left, cautionKey) * .55)
      - (right.score * .45 + analysisTopicScore(right, cautionKey) * .55)
      || left.date.getTime() - right.date.getTime()
    ))[0];
  return { bestAnalysis, cautionAnalysis };
}

function buildPersonalJudgmentInsight(
  aggregates: CategoryAggregate[],
  primary: CategoryAggregate,
  caution: CategoryAggregate,
  personal: PersonalContext | null,
) {
  if (!personal) return undefined;
  const personalAlignment = aggregates.reduce((total, item) => total + item.evaluation.personalAlignment, 0) / Math.max(1, aggregates.length);
  const primaryAlignment = primary.evaluation.personalAlignment;
  const primaryRelation = primary.evaluation.personalRelation;
  const tone: DailyFortuneTone = primaryRelation === 'support'
    ? 'favorable'
    : primaryRelation === 'review'
      ? 'cautious'
      : primaryAlignment >= .18
        ? 'favorable'
        : primaryAlignment <= -.18
          ? 'cautious'
          : personalAlignment >= .22
            ? 'favorable'
            : personalAlignment <= -.22 ? 'cautious' : 'balanced';
  const focusNarratives = [...new Set(aggregates.flatMap((item) => item.evaluation.personalFocus))]
    .map((label) => personalFocusNarratives[label] || label)
    .slice(0, 2);
  const supportedItems = aggregates
    .filter((item) => item.evaluation.personalRelation === 'support')
    .sort((left, right) => categorySignalScore(right.evaluation) - categorySignalScore(left.evaluation));
  const reviewItems = aggregates
    .filter((item) => item.evaluation.personalRelation === 'review')
    .sort((left, right) => categorySignalScore(left.evaluation) - categorySignalScore(right.evaluation));
  const supportItem = primaryRelation === 'support' || (primaryRelation === 'neutral' && primaryAlignment >= .18)
    ? primary
    : supportedItems[0];
  const reviewItem = primaryRelation === 'review' || (primaryRelation === 'neutral' && primaryAlignment <= -.18)
    ? primary
    : reviewItems[0];
  const focusSentence = focusNarratives.length
    ? `本期个人议题集中在${focusNarratives.join('、')}。`
    : '个人命盘没有显示需要额外放大的单一议题。';
  const supportAdvice = supportItem
    ? supportItem.evaluation.definition.key === primary.evaluation.definition.key
      ? `${supportItem.category.label}的个人承接较好；${supportItem.evaluation.definition.personalSupportAction}。`
      : `${supportItem.category.label}是个人层面较稳的一项；若本期确有相关事项，${supportItem.evaluation.definition.personalSupportAction}。没有相关事项就不额外增加任务，也不改变${primary.category.label}的整体顺序。`
    : '';
  const reviewAdvice = reviewItem
    ? `${reviewItem.category.label}更耗承接力；${reviewItem.evaluation.definition.personalReviewBoundary}。`
    : '';
  if (tone === 'favorable') {
    const primarySupported = primaryRelation === 'support' || (primaryRelation === 'neutral' && primaryAlignment >= .18);
    return {
      tone,
      title: primarySupported ? '主线也得到个人节奏支持' : '个人层面另有借力点',
      clause: primarySupported
        ? `个人层面也支持${primary.category.label}，可优先留出一段完整时间。`
        : `个人层面的助力更多落在${supportItem?.category.label || primary.category.label}，可单独安排，但不替代整体主线。`,
      detail: `${focusSentence}${supportAdvice}${reviewAdvice || (primarySupported
        ? ''
        : `${primary.category.label}仍按${primary.evaluation.definition.check}是否齐全决定推进范围。`)}`,
    };
  }
  if (tone === 'cautious') {
    const primaryNeedsReview = primaryRelation === 'review' || (primaryRelation === 'neutral' && primaryAlignment <= -.18);
    return {
      tone,
      title: primaryNeedsReview ? '主线可用，但个人承接偏紧' : '个人层面先处理消耗点',
      clause: primaryNeedsReview
        ? `整体仍以${primary.category.label}为主，但个人层面不宜加量，先确认${primary.evaluation.definition.check}。`
        : `个人层面的消耗更多落在${reviewItem?.category.label || caution.category.label}，这项先收窄范围。`,
      detail: `${focusSentence}${reviewAdvice}${supportAdvice || `${caution.category.label}先把${caution.evaluation.definition.check}逐项确认清楚，没有确认结果前不追加投入。`}`,
    };
  }
  return {
    tone,
    title: supportItem || reviewItem ? '个人层面有进有守' : '个人层面没有额外加减',
    clause: supportItem
      ? `个人层面可单独安排${supportItem.category.label}${reviewItem ? `，${reviewItem.category.label}则先控制投入` : ''}。`
      : reviewItem
        ? `个人层面暂不放大${reviewItem.category.label}，其余事项按整体主线推进。`
        : '个人层面没有额外加减信号，直接按整体主线安排。',
    detail: `${focusSentence}${supportAdvice}${reviewAdvice || (supportAdvice
      ? `${primary.category.label}仍按${primary.evaluation.definition.check}是否齐全决定推进范围。`
      : `${primary.evaluation.definition.check}确认清楚后再推进，未确认的部分只做准备。`)}`,
  };
}

function buildFortuneMasterJudgment(
  aggregates: CategoryAggregate[],
  analyses: ChartAnalysis[],
  overallSignal: number,
  tone: DailyFortuneTone,
  period: FortunePeriod,
  isCurrentPeriod: boolean,
  personal: PersonalContext | null,
  seed: string,
): FortuneMasterJudgment {
  const ranked = [...aggregates].sort((left, right) => categorySignalScore(right.evaluation) - categorySignalScore(left.evaluation));
  const reversed = [...ranked].reverse();
  const primary = ranked[0];
  const secondary = ranked[1] || primary;
  const caution = reversed.find((item) => item.evaluation.tone === 'cautious') || reversed[0] || primary;
  const favorableCount = ranked.filter((item) => item.evaluation.tone === 'favorable').length;
  const cautiousCount = ranked.filter((item) => item.evaluation.tone === 'cautious').length;
  const spread = categorySignalScore(primary.evaluation) - categorySignalScore(caution.evaluation);
  const mixed = (favorableCount > 0 && cautiousCount > 0) || spread >= .72;
  const wellbeing = ranked.find((item) => item.evaluation.definition.key === 'wellbeing');

  let posture: FortuneReadingPosture;
  if (overallSignal <= -.52 || cautiousCount >= 3) posture = 'protect';
  else if (wellbeing?.evaluation.tone === 'cautious' && (cautiousCount >= 2 || overallSignal <= .05)) posture = 'restore';
  else if (tone === 'favorable' && cautiousCount === 0 && overallSignal >= .42) posture = 'advance';
  else if (tone === 'favorable' || (favorableCount > 0 && mixed)) posture = 'focus';
  else if (cautiousCount === 1 && favorableCount === 0) posture = 'resolve';
  else if (cautiousCount === 0 && favorableCount === 0) posture = 'cultivate';
  else posture = 'stabilize';

  const { bestAnalysis, cautionAnalysis } = chooseJudgmentAnalyses(analyses, primary, caution);
  const bestWindow = bestAnalysis ? formatAnalysisWindow(bestAnalysis, period) : '';
  const cautionWindow = cautionAnalysis ? formatAnalysisWindow(cautionAnalysis, period) : '';
  const personalInsight = buildPersonalJudgmentInsight(aggregates, primary, caution, personal);
  const copy = renderFortuneReading(posture, {
    lead: fortunePeriodLead(period, isCurrentPeriod),
    primaryLabel: primary.category.label,
    secondaryLabel: secondary.category.label,
    cautionLabel: caution.category.key === primary.category.key ? '' : caution.category.label,
    bestWindow,
    cautionWindow,
    primaryAction: primary.evaluation.definition.action,
    primaryBoundary: primary.evaluation.definition.personalSupportStop,
    cautionAction: caution.evaluation.definition.cautionAction,
    personalClause: personalInsight?.clause || '',
    mixed,
  }, seed);
  return { posture, primary, secondary, caution, bestAnalysis, cautionAnalysis, personalInsight, mixed, copy };
}

function categoryDistributionEvidence(aggregate: CategoryAggregate, period: FortunePeriod) {
  const unit = period === 'today' ? '时段盘' : period === 'month' ? '日盘' : '阶段盘';
  const neutralCount = Math.max(0, aggregate.sampleCount - aggregate.favorableCount - aggregate.cautiousCount);
  return `${period === 'today' ? '当天' : period === 'month' ? '整月' : '全年'}${aggregate.sampleCount}个${unit}中，${aggregate.category.label}有${aggregate.favorableCount}个明确支持、${aggregate.cautiousCount}个需要复核、${neutralCount}个保持平稳。`;
}

function primaryDistributionMeaning(aggregate: CategoryAggregate) {
  const difference = aggregate.favorableCount - aggregate.cautiousCount;
  if (difference >= 3) return `明确支持比需要复核多${difference}个，可执行窗口相对集中。`;
  if (difference > 0) return `明确支持比需要复核多${difference}个，优势存在，但仍取决于前置条件是否落实。`;
  if (difference === 0) return '明确支持与需要复核数量相同，结果更依赖前置条件是否落实。';
  return `需要复核比明确支持多${Math.abs(difference)}个；它只是六项中相对可控的落点，不能当作无条件顺势。`;
}

function cautionDistributionMeaning(aggregate: CategoryAggregate) {
  const difference = aggregate.favorableCount - aggregate.cautiousCount;
  if (difference > 0) return `支持虽比复核多${difference}个，但仍有${aggregate.cautiousCount}个复核窗口；问题集中在部分条件，并非全期受阻。`;
  if (difference === 0) return '支持与复核数量相同，能否落地取决于前置条件是否先被确认。';
  return `需要复核比明确支持多${Math.abs(difference)}个，风险已经跨越多个窗口，不是偶发单点。`;
}

function cautionConsequence(caution: CategoryAggregate) {
  const consequences: Record<string, string> = {
    career: '结果通常表现为任务反复、等待交接，或做完后仍无法验收。',
    study: '结果通常表现为资料越积越多，却没有可复述、可练习或可检验的产出。',
    wealth: '结果通常表现为补单、追款、重复核算，或后续责任争议。',
    relationship: '结果通常表现为同一件事反复解释，行动仍建立在不同前提上。',
    travel: '结果通常表现为转场时间被压缩、误点，或后续事项被连带推迟。',
    wellbeing: '结果通常表现为短时仍能推进，随后多项安排同时降速或返工。',
  };
  return consequences[caution.category.key] || `${caution.category.label}的条件未确认前，相关安排容易反复。`;
}

function opportunityReasonFromJudgment(judgment: FortuneMasterJudgment, period: FortunePeriod) {
  const reason = judgment.primary.evaluation.definition.masterReason;
  const primaryLabel = judgment.primary.category.label;
  return `${categoryDistributionEvidence(judgment.primary, period)}在六项主题中，${primaryLabel}的综合信号最高。${primaryDistributionMeaning(judgment.primary)}${reason}`;
}

function cautionReasonFromJudgment(judgment: FortuneMasterJudgment, period: FortunePeriod) {
  const cautionLabel = judgment.caution.category.label;
  const riskReason = judgment.caution.evaluation.definition.masterRiskReason;
  if (judgment.caution.cautiousCount === 0) {
    const check = judgment.caution.evaluation.definition.check;
    return `${categoryDistributionEvidence(judgment.caution, period)}${cautionLabel}没有明确风险窗口，只是综合信号在六项中最低。${riskReason}这类风险本期没有集中出现；只有${check}发生变化时才需要重新评估。`;
  }
  const role = judgment.caution.evaluation.tone === 'cautious'
    ? `${cautionLabel}已经是本期明确牵制。`
    : `${cautionLabel}不是全面阻断，但在六项中最需要前置核对。`;
  return `${categoryDistributionEvidence(judgment.caution, period)}${role}${cautionDistributionMeaning(judgment.caution)}${riskReason}${cautionConsequence(judgment.caution)}`;
}

function buildEvidenceInsights(judgment: FortuneMasterJudgment, period: FortunePeriod): DailyFortuneEvidenceInsight[] {
  const insights: DailyFortuneEvidenceInsight[] = [];

  insights.push({
    key: 'opportunity',
    sourceKey: judgment.primary.category.key,
    label: '判断主线',
    title: `${judgment.primary.category.label}为何是主线`,
    detail: opportunityReasonFromJudgment(judgment, period),
    tone: judgment.primary.category.tone,
  });

  if (judgment.caution.category.key !== judgment.primary.category.key) {
    insights.push({
      key: 'caution',
      sourceKey: judgment.caution.category.key,
      label: judgment.caution.evaluation.tone === 'cautious' ? '牵制所在' : '必要检查',
      title: `${judgment.caution.category.label}为何需要留意`,
      detail: cautionReasonFromJudgment(judgment, period),
      tone: judgment.caution.evaluation.tone === 'cautious' ? 'cautious' : 'balanced',
    });
  }

  if (judgment.personalInsight) {
    insights.push({
      key: 'personal',
      label: '结合案例',
      title: judgment.personalInsight.title,
      detail: judgment.personalInsight.detail,
      tone: judgment.personalInsight.tone,
    });
  }

  return insights;
}

function personalDirectionScore(chart: QimenData, gong: number, personal: PersonalContext | null) {
  if (!personal) return 0;
  const palace = chart.jiuGongGe.find((item) => item.gong === gong);
  if (!palace) return 0;
  const relation = personalRelationForPalace(chart, palace, personal);
  const relationScore = relation === 'support' ? 1 : relation === 'review' ? -1 : 0;
  const usefulScore = isFiveElement(palace.element) ? elementAlignment(personal, palace.element) : 0;
  return relationScore + usefulScore * .45;
}

const directionReasonMeanings: Record<string, string> = {
  开门: '利启动、会面与公开事务',
  休门: '利协商、休整与关系维护',
  生门: '利求财、合作与稳步增长',
  伤门: '冲突或损耗风险偏高',
  杜门: '信息闭塞，推进容易受阻',
  死门: '不利新增和主动推进',
  惊门: '突发、口舌或焦虑增多',
  玄武: '需防信息不实或关键遗漏',
  白虎: '冲突和损耗风险偏高',
  螣蛇: '反复、疑虑和误判增多',
  空亡: '计划容易落空或难以落实',
  门迫: '事情受阻，推进费力反复',
  九地: '宜稳健落地，不宜求快',
  九天: '利主动展开与扩大视野',
  六合: '利协作、协调与形成共识',
  太阴: '利周密筹划与隐蔽准备',
  值符: '主导性较强，适合抓住主线',
};

function normalizeDirectionUse(value: string) {
  const modernUse = value.includes('求官')
    ? '洽谈职位、面试或推进职责明确的工作'
    : value.includes('求财')
      ? '对账、询价、商谈合作或复核投资资料'
      : value.includes('休养')
        ? '休息恢复、安排安静事务或关系沟通'
        : value.replace(/\//g, '、').replace(/宜用于?/g, '').trim();
  return value.includes('急难见贵')
    ? `${modernUse}，或在急事中寻求有经验者协助`
    : modernUse;
}

function directionReasonText(reason: string) {
  const isFavorablePattern = /^吉格:/.test(reason);
  const isCautiousPattern = /^凶格:/.test(reason);
  const normalized = reason.replace(/^(?:吉格|凶格):/, '').replace(/^值(?=九地|九天|六合|太阴|值符)/, '');
  const directMeaning = directionReasonMeanings[normalized];
  const matchedKey = Object.keys(directionReasonMeanings).find((key) => normalized.includes(key));
  const meaning = directMeaning || (matchedKey
    ? directionReasonMeanings[matchedKey]
    : isFavorablePattern
      ? '形成有利格局'
      : isCautiousPattern ? '形成受限格局' : '构成盘面判断依据');
  return `${normalized}（${meaning}）`;
}

function summarizeDirectionReasons(reasons: string[], limit = 2) {
  return [...new Set(reasons)].slice(0, limit).map(directionReasonText).join('、');
}

function incrementFrequency(values: Map<string, number>, key: string) {
  if (!key) return;
  values.set(key, (values.get(key) || 0) + 1);
}

function mostFrequent(values: Map<string, number>, limit = 2) {
  return [...values.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], 'zh-CN'))
    .slice(0, limit)
    .map(([value]) => value);
}

function buildSingleDirections(chart: QimenData, personal: PersonalContext | null) {
  // 不改写核心库的吉方与避方资格，只在已经成立的候选内部做个人化排序。
  const goodDirections = [...(chart.directions?.goodDirections || [])]
    .sort((left, right) => personalDirectionScore(chart, right.gong, personal) - personalDirectionScore(chart, left.gong, personal))
    .slice(0, 2).map((item) => ({
    direction: item.direction,
    detail: `适合${normalizeDirectionUse(item.use) || '主动推进'}；盘面依据：${summarizeDirectionReasons(item.reasons)}。仅用于第一段行程、拜访或主动沟通的方向参考，不必为普通行程绕路。`,
  }));
  const avoidDirections = [...(chart.directions?.avoidDirections || [])]
    .sort((left, right) => personalDirectionScore(chart, left.gong, personal) - personalDirectionScore(chart, right.gong, personal))
    .slice(0, 2).map((item) => ({
    direction: item.direction,
    detail: `盘面限制：${summarizeDirectionReasons(item.reasons)}。必须前往时提前确认路线、返程与备选方案。`,
  }));
  return { goodDirections, avoidDirections };
}

function buildPeriodDirections(analyses: ChartAnalysis[], period: 'month' | 'year', personal: PersonalContext | null) {
  const counts = new Map<string, {
    good: number;
    avoid: number;
    personal: number;
    uses: Map<string, number>;
    goodReasons: Map<string, number>;
    avoidReasons: Map<string, number>;
  }>();
  const createCount = () => ({
    good: 0,
    avoid: 0,
    personal: 0,
    uses: new Map<string, number>(),
    goodReasons: new Map<string, number>(),
    avoidReasons: new Map<string, number>(),
  });
  analyses.forEach(({ chart }) => {
    chart.directions?.goodDirections.forEach((item) => {
      const value = counts.get(item.direction) || createCount();
      value.good += 1;
      value.personal += personalDirectionScore(chart, item.gong, personal);
      incrementFrequency(value.uses, normalizeDirectionUse(item.use));
      item.reasons.forEach((reason) => incrementFrequency(value.goodReasons, reason));
      counts.set(item.direction, value);
    });
    chart.directions?.avoidDirections.forEach((item) => {
      const value = counts.get(item.direction) || createCount();
      value.avoid += 1;
      value.personal += personalDirectionScore(chart, item.gong, personal);
      item.reasons.forEach((reason) => incrementFrequency(value.avoidReasons, reason));
      counts.set(item.direction, value);
    });
  });
  const goodThreshold = Math.max(2, Math.ceil(analyses.length * .28));
  const avoidThreshold = Math.max(2, Math.ceil(analyses.length * .34));
  const periodLabel = period === 'year' ? '今年' : '本月';
  const goodDirections = [...counts.entries()]
    .filter(([, value]) => value.good >= goodThreshold && value.good > value.avoid)
    .sort((left, right) => right[1].good - left[1].good || right[1].personal - left[1].personal || left[1].avoid - right[1].avoid)
    .slice(0, 2)
    .map(([direction, value]) => ({
      direction,
      detail: `${periodLabel}${analyses.length}个${period === 'year' ? '阶段盘' : '日盘'}中，${direction}出现${value.good}次支持、${value.avoid}次回避；常见用途：${mostFrequent(value.uses, 1)[0] || '主动推进'}；常见依据：${summarizeDirectionReasons(mostFrequent(value.goodReasons))}。`,
    }));
  const avoidDirections = [...counts.entries()]
    .filter(([, value]) => value.avoid >= avoidThreshold && value.avoid > value.good)
    .sort((left, right) => right[1].avoid - left[1].avoid || left[1].personal - right[1].personal || left[1].good - right[1].good)
    .slice(0, 2)
    .map(([direction, value]) => ({
      direction,
      detail: `${periodLabel}${analyses.length}个${period === 'year' ? '阶段盘' : '日盘'}中，${direction}出现${value.avoid}次回避、${value.good}次支持；常见限制：${summarizeDirectionReasons(mostFrequent(value.avoidReasons))}。必须前往时先确认路线和返程，并留出改线余量。`,
    }));
  return { goodDirections, avoidDirections };
}

function buildTimeWindows(
  now: Date,
  period: FortunePeriod,
  analyses: ChartAnalysis[],
  restrictTodayHours = true,
  preferredAnalysis?: ChartAnalysis,
) {
  const practicalAnalyses = period === 'today' ? analyses.filter(isPracticalHourAnalysis) : analyses;
  const candidates = period === 'today'
    ? restrictTodayHours
      ? practicalAnalyses.filter((analysis) => analysis.date.getHours() >= currentShichenCenterHour(now.getHours()))
      : practicalAnalyses
    : analyses;
  if (period === 'today' && restrictTodayHours && !candidates.length) return [];
  const ranked = [...(candidates.length ? candidates : practicalAnalyses)].sort(compareAnalyses);
  const usable = ranked.filter(isUsablePriorityAnalysis);
  const preferred = preferredAnalysis
    ? usable.find((analysis) => analysis.date.getTime() === preferredAnalysis.date.getTime())
    : undefined;
  const selected = preferred
    ? [preferred, ...usable.filter((analysis) => analysis.date.getTime() !== preferred.date.getTime())].slice(0, 3)
    : usable.slice(0, 3);
  return selected.map((analysis) => {
    const rankedCategories = [...analysis.categories].sort((left, right) => categorySignalScore(right) - categorySignalScore(left));
    const favorableCategories = rankedCategories.filter((item) => item.tone === 'favorable');
    const balancedCategories = rankedCategories.filter((item) => item.tone === 'balanced');
    const focusCategories = (favorableCategories.length ? favorableCategories : balancedCategories).slice(0, 3);
    const focusLabels = focusCategories.map((item) => item.definition.shortLabel);
    const coverage = focusLabels.length
      ? `${favorableCategories.length ? '适合' : '可安排'}${focusLabels.join('、')}`
      : '只宜整理、复核';
    if (period === 'today') {
      const slot = shichenSlots.find((item) => item.hour === analysis.date.getHours()) || shichenSlots[0];
      return { name: dayPartForHour(slot.hour), range: formatTimeRange(slot.range), coverage };
    }
    if (period === 'year') {
      const monthRange = qimenMonthRangeWithinGregorianYear(analysis.date);
      return {
        name: monthRange ? formatPeriodStageSpan(monthRange.start, monthRange.end) : `${analysis.date.getMonth() + 1}月`,
        range: '',
        coverage,
      };
    }
    return {
      name: formatShortDate(analysis.date),
      range: new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(analysis.date),
      coverage,
    };
  });
}

interface TrendPhraseUsage {
  actions: Map<string, number[]>;
  guards: Map<string, number[]>;
}

function createTrendPhraseUsage(): TrendPhraseUsage {
  return {
    actions: new Map<string, number[]>(),
    guards: new Map<string, number[]>(),
  };
}

function takeTrendPhrase(
  definition: TopicDefinition | undefined,
  phrases: 'trendActions' | 'trendGuards',
  usage: Map<string, number[]>,
  fallbackIndex: number,
) {
  if (!definition || !definition[phrases].length) return '';
  const phraseUsage = usage.get(definition.key) || definition[phrases].map(() => 0);
  const leastUsed = Math.min(...phraseUsage);
  let selectedIndex = fallbackIndex % phraseUsage.length;
  for (let offset = 0; offset < phraseUsage.length; offset += 1) {
    const candidateIndex = (fallbackIndex + offset) % phraseUsage.length;
    if (phraseUsage[candidateIndex] === leastUsed) {
      selectedIndex = candidateIndex;
      break;
    }
  }
  phraseUsage[selectedIndex] += 1;
  usage.set(definition.key, phraseUsage);
  return definition[phrases][selectedIndex];
}

function continuationAction(action: string) {
  return action.replace(/^先/, '');
}

function trendSummary(analyses: ChartAnalysis[], usage: TrendPhraseUsage) {
  const averageScore = analyses.reduce((total, item) => total + item.score, 0) / Math.max(1, analyses.length);
  const favorableCount = analyses.filter((item) => item.tone === 'favorable').length;
  const cautiousCount = analyses.filter((item) => item.tone === 'cautious').length;
  const tone: DailyFortuneTone = cautiousCount >= Math.ceil(analyses.length * .45) || averageScore <= -.28
    ? 'cautious'
    : favorableCount >= Math.ceil(analyses.length * .35) && averageScore >= .2
      ? 'favorable'
      : 'balanced';
  const rankedTopics = topicDefinitions.map((definition, index) => ({
    definition,
    score: analyses.reduce((total, item) => total + (item.categories[index]?.score || 0), 0) / Math.max(1, analyses.length),
  })).sort((left, right) => right.score - left.score);
  const primary = rankedTopics[0]?.definition;
  const weakest = rankedTopics[rankedTopics.length - 1]?.definition;
  const phraseDate = analyses[0]?.date;
  const phraseIndex = phraseDate
    ? (phraseDate.getFullYear() * 13 + (phraseDate.getMonth() + 1) * 7 + phraseDate.getDate() + analyses.length) % 3
    : 0;
  const primaryUsedCount = primary
    ? (usage.actions.get(primary.key) || []).reduce((total, count) => total + count, 0)
    : 0;
  const secondaryCandidates = rankedTopics.slice(1, Math.min(4, rankedTopics.length));
  const secondary = secondaryCandidates.length
    ? secondaryCandidates[primaryUsedCount % secondaryCandidates.length]?.definition
    : undefined;
  const primaryAction = takeTrendPhrase(primary, 'trendActions', usage.actions, phraseIndex);
  const secondaryAction = takeTrendPhrase(secondary, 'trendActions', usage.actions, phraseIndex + 1);
  const weakestGuard = takeTrendPhrase(weakest, 'trendGuards', usage.guards, phraseIndex);
  const continuation = secondaryAction ? continuationAction(secondaryAction) : '';
  const primaryLabel = primary?.shortLabel || '主线';
  const secondaryLabel = secondary?.shortLabel || '后续';
  const weakestLabel = weakest?.shortLabel || '风险';
  return {
    tone,
    status: tone === 'favorable' ? `${primaryLabel}可落地` : tone === 'cautious' ? `先稳${weakestLabel}` : `先做${primaryLabel}`,
    focus: tone === 'cautious'
      ? [
          `${weakestLabel}先查：${weakestGuard || '先减少变量，再决定是否继续'}`,
          primaryAction ? `${primaryLabel}保留：${primaryAction}，不扩大范围` : '',
          continuation ? `稳定后再做${secondaryLabel}：${continuation}` : '',
        ].filter(Boolean).join('；')
      : primary
        ? `${primaryLabel}：${primaryAction}${continuation ? `；完成后再做${secondaryLabel}：${continuation}` : ''}`
        : '主线：先完成已经明确的一件事',
  };
}

function buildSevenDayTrend(now: Date, personal: PersonalContext | null): DailyFortuneTrendItem[] {
  const start = createReferenceDate(now);
  const usage = createTrendPhraseUsage();
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index);
    const analysis = analyzeChart(date, 'day', personal);
    const trend = trendSummary([analysis], usage);
    const label = index === 0
      ? '今天'
      : index === 1
        ? '明天'
        : new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(date);
    return {
      dateKey: analysis.dateKey,
      label,
      dateLabel: `${date.getMonth() + 1}/${date.getDate()}`,
      ...trend,
    };
  });
}

function buildMonthTrend(now: Date, analyses: ChartAnalysis[], runtimeNow?: Date): DailyFortuneTrendItem[] {
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const groups = new Map<number, ChartAnalysis[]>();
  const usage = createTrendPhraseUsage();
  const availableAnalyses = runtimeNow
    ? analyses.filter((analysis) => analysis.dateKey >= formatDateKey(runtimeNow))
    : analyses;
  availableAnalyses.forEach((analysis) => {
    const week = Math.floor((analysis.date.getDate() - 1) / 7);
    groups.set(week, [...(groups.get(week) || []), analysis]);
  });
  return [...groups.entries()].sort(([left], [right]) => left - right).map(([week, items]) => {
    const weekStartDay = week * 7 + 1;
    const currentWeek = runtimeNow && week === Math.floor((runtimeNow.getDate() - 1) / 7);
    const startDay = currentWeek ? runtimeNow.getDate() : weekStartDay;
    const endDay = Math.min(monthEnd, weekStartDay + 6);
    return {
      dateKey: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-w${week + 1}`,
      label: currentWeek ? '本周' : `第${week + 1}周`,
      dateLabel: `${startDay}—${endDay}日`,
      ...trendSummary(items, usage),
    };
  });
}

function buildYearTrend(now: Date, personal: PersonalContext | null, runtimeNow?: Date): DailyFortuneTrendItem[] {
  const usage = createTrendPhraseUsage();
  const startMonth = runtimeNow?.getMonth() || 0;
  return Array.from({ length: 12 - startMonth }, (_, index) => {
    const month = startMonth + index;
    const date = new Date(now.getFullYear(), month, 15, 12, 0, 0, 0);
    const trend = trendSummary([analyzeChart(date, 'month', personal)], usage);
    return {
      dateKey: `${now.getFullYear()}-${String(month + 1).padStart(2, '0')}`,
      label: runtimeNow && month === runtimeNow.getMonth() ? '本月' : `${month + 1}月`,
      dateLabel: '',
      ...trend,
    };
  });
}

function buildPeriodTrend(
  period: FortunePeriod,
  now: Date,
  sampleAnalyses: ChartAnalysis[],
  personal: PersonalContext | null,
  runtimeNow: Date,
  isCurrentPeriod: boolean,
) {
  if (period === 'today') return buildSevenDayTrend(now, personal);
  if (period === 'month') return buildMonthTrend(now, sampleAnalyses, isCurrentPeriod ? runtimeNow : undefined);
  return buildYearTrend(now, personal, isCurrentPeriod ? runtimeNow : undefined);
}

function stableSeed(value: string) {
  return [...value].reduce((total, character) => (total * 31 + character.charCodeAt(0)) >>> 0, 2166136261);
}

function uniqueNumbers(values: number[]) {
  return [...new Set(values.map((value) => ((value % 10) + 10) % 10))].slice(0, 3);
}

function chooseReferencePalace(analysis: ChartAnalysis, goodDirections: DailyFortuneDirection[]) {
  const directionPalace = goodDirections[0]
    ? analysis.chart.jiuGongGe.find((palace) => palace.direction === goodDirections[0].direction)
    : null;
  if (directionPalace) return directionPalace;
  const bestCategory = [...analysis.categories].sort((left, right) => right.score - left.score
    || toneRank(right.tone) - toneRank(left.tone)
    || right.supportCount - left.supportCount
    || left.riskCount - right.riskCount)[0];
  return bestCategory?.palace || analysis.activePalace;
}

function buildReference(
  period: FortunePeriod,
  analysis: ChartAnalysis,
  goodDirections: DailyFortuneDirection[],
  personal: PersonalContext | null,
  focus: TopicDefinition,
): DailyFortuneReference {
  const palace = chooseReferencePalace(analysis, goodDirections);
  const palaceElement = isFiveElement(palace.element) ? palace.element : '土';
  const palaceAlignment = personal ? elementAlignment(personal, palaceElement) : 0;
  const element = personal?.primaryFavorableElement && palaceAlignment <= 0
    ? personal.primaryFavorableElement
    : palaceElement;
  const elementReference = elementReferences[element];
  const seed = stableSeed(`${period}|${analysis.chart.zhiShi}|${analysis.chart.zhiFu}|${analysis.chart.juShu}|${palace.gong}|${personal?.referenceSeed || ''}`);
  const colors = seed % 2 ? [...elementReference.colors].reverse() : [...elementReference.colors];
  const referenceNumbers = personal && seed % 2 ? [...elementReference.numbers].reverse() : elementReference.numbers;
  const numbers = uniqueNumbers([palace.gong, ...referenceNumbers, analysis.chart.juShu]);
  const practicalItems = topicReferenceItems[focus.key] || topicReferenceItems.career;
  const item = practicalItems[seed % practicalItems.length];
  const direction = goodDirections[0]?.direction || '不固定';
  const focusLabel = focus.shortLabel;
  return {
    colors,
    colorNote: period === 'today'
      ? `可从中选一种标记今天的${focusLabel}清单，看到颜色时回到当前主线，不需要整套穿戴。`
      : period === 'month'
        ? `选一种固定用于本月${focusLabel}相关的文件标签或提醒，帮助在多项事务间识别主线。`
        : `可作为全年${focusLabel}计划的视觉标记，用来区分主线与临时事项，不必长期限定穿着或环境配色。`,
    numbers,
    numberNote: period === 'today'
      ? '仅作当天清单排序或提醒符号，不用于金额、投注和结果判断。'
      : period === 'month'
        ? '仅作本月清单分组或复盘编号，不替代日期、预算和现实条件。'
        : '仅作年度目标分组的象征编号，不用于投资、开奖或重要日期推断。',
    direction,
    directionNote: goodDirections.length
      ? goodDirections[0].detail
      : '方位信号不集中，不设优先方向。',
    item: item.name,
    itemSymbol: item.symbol,
    itemNote: item.note,
  };
}

function calculateDailyFortune(
  now: Date,
  profile: DailyFortuneProfile | undefined,
  period: FortunePeriod,
  runtimeNow: Date,
): DailyFortuneResult {
  const range = getPeriodRange(now, period);
  const periodDates = enumerateDates(range.start, range.end);
  const personalCandidate = createPersonalContext(profile);
  const applicabilityEnd = period === 'today'
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    : range.end;
  const personal = personalCandidate && applicabilityEnd.getTime() >= personalCandidate.birthTimestamp
    ? personalCandidate
    : null;
  const isCurrentDay = formatDateKey(now) === formatDateKey(runtimeNow);
  const isCurrentMonth = period === 'month'
    && now.getFullYear() === runtimeNow.getFullYear()
    && now.getMonth() === runtimeNow.getMonth();
  const isCurrentYear = period === 'year' && now.getFullYear() === runtimeNow.getFullYear();
  const isCurrentPeriod = period === 'today' ? isCurrentDay : period === 'month' ? isCurrentMonth : isCurrentYear;

  let contextAnalyses: ChartAnalysis[];
  let sampleAnalyses: ChartAnalysis[];

  if (period === 'today') {
    contextAnalyses = [
      analyzeChart(range.anchor, 'year', personal),
      analyzeChart(range.anchor, 'month', personal),
      analyzeChart(range.anchor, 'day', personal),
    ];
    sampleAnalyses = shichenSlots.map((slot) => analyzeChart(new Date(now.getFullYear(), now.getMonth(), now.getDate(), slot.hour, 0, 0, 0), 'hour', personal));
  } else if (period === 'month') {
    const yearContexts = [range.start, range.anchor, range.end]
      .map((date) => analyzeChart(date, 'year', personal))
      .filter((analysis, index, items) => items.findIndex((item) => item.chart.ganzhi.year === analysis.chart.ganzhi.year) === index);
    const monthContexts = enumerateQimenMonths(range)
      .map((date) => analyzeChart(date, 'month', personal));
    contextAnalyses = [...yearContexts, ...monthContexts];
    sampleAnalyses = periodDates.map((date) => analyzeChart(date, 'day', personal));
  } else {
    contextAnalyses = [range.start, range.anchor, range.end]
      .map((date) => analyzeChart(date, 'year', personal))
      .filter((analysis, index, items) => items.findIndex((item) => item.chart.ganzhi.year === analysis.chart.ganzhi.year) === index);
    sampleAnalyses = enumerateQimenMonths(range).map((date) => analyzeChart(date, 'month', personal));
  }

  const baseAnalysis = contextAnalyses[contextAnalyses.length - 1];
  const aggregates = aggregatePeriodCategories(contextAnalyses, sampleAnalyses, period);
  const categoryAverage = aggregates.reduce((total, item) => total + item.evaluation.score, 0) / aggregates.length;
  const sampleAverage = sampleAnalyses.length
    ? sampleAnalyses.reduce((total, item) => total + item.score, 0) / sampleAnalyses.length
    : baseAnalysis.score;
  const parentAverage = contextAnalyses.reduce((total, item) => total + item.score, 0) / contextAnalyses.length;
  let overallSignal = categoryAverage * .62 + sampleAverage * .23 + parentAverage * .15;
  const sortedCategoryScores = aggregates.map((item) => item.evaluation.score).sort((left, right) => left - right);
  const strongestRisk = sortedCategoryScores[0] || 0;
  const pairedRisk = ((sortedCategoryScores[0] || 0) + (sortedCategoryScores[1] || 0)) / 2;
  if (strongestRisk <= -.9) overallSignal = Math.min(overallSignal, -.3);
  if (pairedRisk <= -.58) overallSignal = Math.min(overallSignal, -.42);
  overallSignal = clampSignal(overallSignal, -1.15, 1.1);
  const tone: DailyFortuneTone = overallSignal >= .28 ? 'favorable' : overallSignal <= -.28 ? 'cautious' : 'balanced';

  let windowAnalyses = sampleAnalyses;
  if (period === 'month' && isCurrentMonth) {
    const currentDateKey = formatDateKey(runtimeNow);
    windowAnalyses = sampleAnalyses.filter((analysis) => analysis.dateKey >= currentDateKey);
  } else if (period === 'year' && isCurrentYear) {
    const currentMonthChart = generateQimen(runtimeNow, 'zhuanpan', 'month', 'chaibu');
    const currentMonthGanZhi = normalizeGanZhi(currentMonthChart.ganzhi.month);
    windowAnalyses = sampleAnalyses.filter((analysis) => (
      normalizeGanZhi(analysis.chart.ganzhi.month) === currentMonthGanZhi || analysis.date >= runtimeNow
    ));
  }

  const directions = period === 'today'
    ? buildSingleDirections(baseAnalysis.chart, personal)
    : buildPeriodDirections(sampleAnalyses, period, personal);
  const periodTrend = buildPeriodTrend(period, now, sampleAnalyses, personal, runtimeNow, isCurrentPeriod);
  const preferredCount = aggregates.filter((item) => item.evaluation.tone === 'favorable').length;
  const cautionCount = aggregates.filter((item) => item.evaluation.tone === 'cautious').length;
  const reviewCount = aggregates.length - preferredCount - cautionCount;
  const gradeScore = Math.round(overallSignal * 6);
  const grade = fortuneStatusFromScore(gradeScore);
  const displaySampleAnalyses = period === 'today'
    ? sampleAnalyses.filter(isPracticalHourAnalysis)
    : sampleAnalyses;
  const judgmentAnalyses = period === 'today'
    ? isCurrentDay
      ? displaySampleAnalyses.filter((analysis) => analysis.date.getHours() >= currentShichenCenterHour(runtimeNow.getHours()))
      : displaySampleAnalyses
    : windowAnalyses;
  if (isCurrentPeriod) updateAggregateWindowsForRemainingPeriod(aggregates, judgmentAnalyses);
  const judgment = buildFortuneMasterJudgment(
    aggregates,
    judgmentAnalyses,
    overallSignal,
    tone,
    period,
    isCurrentPeriod,
    personal,
    `${formatDateKey(now)}|${period}|${personal?.referenceSeed || 'general'}`,
  );
  const reference = buildReference(
    period,
    baseAnalysis,
    directions.goodDirections,
    personal,
    judgment.primary.evaluation.definition,
  );
  const timeWindows = buildTimeWindows(
    isCurrentDay ? runtimeNow : now,
    period,
    period === 'today' ? sampleAnalyses : windowAnalyses,
    isCurrentDay,
    judgment.bestAnalysis,
  );
  aggregates.forEach((aggregate) => {
    aggregate.category = {
      ...aggregate.category,
      status: categoryStatusFromJudgment(aggregate, judgment),
      detail: categoryDetailFromJudgment(aggregate, judgment, period),
      basis: categoryBasis(aggregate.evaluation, period, aggregate.cautiousCount, aggregate.worstAnalysis),
    };
  });
  const categories = aggregates.map((item) => item.category);
  const title = judgment.copy.title;
  const evidenceInsights = buildEvidenceInsights(judgment, period);
  const summary = judgment.copy.summary;
  const readyAggregate = judgment.primary;
  const slowAggregate = judgment.caution;
  const readySource = readyAggregate?.category || categories[0];
  const slowSource = slowAggregate?.category;
  const actionTips: DailyFortuneActionTip[] = [
    {
      sourceKey: readySource?.key || 'general',
      label: '优先安排',
      text: judgment.copy.opportunity,
      tone: 'positive',
    },
    {
      sourceKey: slowSource?.key || 'general',
      label: '记得检查',
      text: judgment.copy.caution,
      tone: 'notice',
    },
  ];
  const overview: DailyFortuneOverview = {
    readyCount: preferredCount,
    reviewCount,
    slowCount: cautionCount,
    label: judgment.copy.overviewLabel,
  };

  const calendar = getCalendarInfo(createReferenceDate(now));
  const startDateKey = formatDateKey(range.start);
  const endDateKey = formatDateKey(range.end);
  const dateKey = formatDateKey(now);
  const modernAlmanac = period === 'today' ? getModernAlmanacForDate(dateKey) : null;
  const chartDate = baseAnalysis.chart.ganzhi;
  const weekday = period === 'today'
    ? new Intl.DateTimeFormat('zh-CN', { weekday: 'long' }).format(now)
    : period === 'month'
      ? formatDateSpan(range.start, range.end)
      : formatDateSpan(range.start, range.end);
  const dateLabel = period === 'today'
    ? `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`
    : period === 'month'
      ? `${now.getFullYear()}年${now.getMonth() + 1}月运势`
      : `${now.getFullYear()}年运势`;
  const calendarRangeLabel = period === 'today'
    ? dateLabel
    : `${formatFullDate(range.start)} — ${formatFullDate(range.end)}`;
  const boundaryLabel = '';
  const previewText = `${grade} · ${title} · ${readySource?.label || '日常安排'}优先`;
  const ganzhi = period === 'today'
    ? `${chartDate.year}年 ${chartDate.month}月 ${chartDate.day}日`
    : period === 'month'
      ? `${chartDate.year}年 ${chartDate.month}月`
      : `${chartDate.year}年`;

  return {
    period,
    periodLabel: periodLabels[period],
    personalized: Boolean(personal),
    dateKey,
    dateLabel,
    rangeLabel: startDateKey === endDateKey ? startDateKey : `${startDateKey} 至 ${endDateKey}`,
    calendarRangeLabel,
    boundaryLabel,
    coverageLabel: period === 'today'
      ? '综合当天节奏与具体时间变化'
      : period === 'month'
        ? '综合本月每天的变化'
        : '综合全年各阶段变化',
    windowTitle: period === 'today'
      ? isCurrentDay ? '今天优先时段' : '当天优先时段'
      : period === 'month'
        ? isCurrentMonth ? '本月优先日期' : '该月优先日期'
        : isCurrentYear ? '今年重点阶段' : '该年重点阶段',
    weekday,
    lunarDate: calendar.lunarDate,
    ganzhi,
    jieqi: period === 'today' ? solarTermOnDate(now) : '',
    title,
    tone,
    grade,
    summary,
    previewText,
    overview,
    reference,
    modernAlmanac,
    actionTips,
    evidenceInsights,
    categories,
    timeWindows,
    periodTrend,
    goodDirections: directions.goodDirections,
    avoidDirections: directions.avoidDirections,
    directionFallback: directions.goodDirections.length ? '' : `${periodLabels[period]}方位信号不集中，不设优先方向。`,
  };
}

export function getCachedDailyFortune(
  now = new Date(),
  profile?: DailyFortuneProfile,
  period: FortunePeriod = 'today',
  runtimeNow = new Date(),
) {
  return readDailyFortuneCache(dailyFortuneCacheKey(now, profile, period, runtimeNow));
}

export function generateDailyFortune(
  now = new Date(),
  profile?: DailyFortuneProfile,
  period: FortunePeriod = 'today',
  runtimeNow = new Date(),
): DailyFortuneResult {
  const cacheKey = dailyFortuneCacheKey(now, profile, period, runtimeNow);
  const cached = readDailyFortuneCache(cacheKey);
  if (cached) return cached;
  const result = calculateDailyFortune(now, profile, period, runtimeNow);
  writeDailyFortuneCache(cacheKey, result);
  return result;
}
