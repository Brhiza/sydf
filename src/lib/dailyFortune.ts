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
  element: string;
  colors: DailyFortuneColor[];
  numbers: number[];
  symbolicNote: string;
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
  tone: 'positive' | 'support' | 'notice';
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
  completionRule: string;
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

type PersonalRelationReason =
  | 'attention-aligned'
  | 'attention-blocked'
  | 'approach-aligned'
  | 'approach-friction'
  | 'rhythm-aligned'
  | 'rhythm-friction'
  | 'strength-aligned'
  | 'effort-friction'
  | 'period-aligned'
  | 'period-friction';

interface PersonalRelationEvidence {
  relation: PersonalRelation;
  reason?: PersonalRelationReason;
}

interface PalaceSignals {
  supportCount: number;
  softRiskCount: number;
  hardRiskCount: number;
  personalRelation: PersonalRelation;
  personalReason?: PersonalRelationReason;
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
  personalReason?: PersonalRelationReason;
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
    completionRule: '把可执行项和待确认项分开：负责人、下一步和验收标准齐全的进入正式排期，其余留在确认清单',
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
    completionRule: '能用自己的话说清要点，并在一道题或一段输出中正确应用，才从输入转为已掌握；否则不再增加资料',
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
    completionRule: '把金额、责任和付款节点留成可复核记录，记录没有闭合前不付款，也不承诺合作',
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
    completionRule: '先确认双方是否建立在同一事实基础上；事实没有对齐时不推断立场，也不增加承诺',
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
    completionRule: '路线、时间余量和备选方案三项齐全后再出发，缺一项时只做物品准备',
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
    completionRule: '完整休息后再看注意力是否恢复；仍无法集中时直接减少任务量，不用短时兴奋代替恢复',
    cautionPattern: '疲劳可能在忙碌结束后才显现，主观状态会高估承受量',
    cautionAction: '如果睡眠、食欲和注意力中有两项同时偏弱，删去一项非必要安排，并优先补足休息。',
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

type TrendScale = 'day' | 'week' | 'month';

interface ScaledTrendPhrases {
  actions: string[];
  guards: string[];
}

const scaledTrendPhrases: Record<Exclude<TrendScale, 'day'>, Record<string, ScaledTrendPhrases>> = {
  week: {
    career: {
      actions: [
        '这段时间只推进责任与验收都已确认的任务',
        '把这段时间的交付拆成阶段结束时能够验收的结果',
        '这段时间先收完已有职责，再决定是否接新增事项',
        '阶段中途复核一次负责人、实际进度和交付口径',
      ],
      guards: [
        '这段时间交接仍有空白时，不把待确认事项排进执行',
        '临时插单挤占原任务时，明确替换关系而不是直接叠加',
        '阶段中途仍无法确认验收人时，暂停后续投入',
        '同类返工再次出现时，这段时间先修口径不加任务',
      ],
    },
    study: {
      actions: [
        '这段时间围绕一个主题完成复述、练习和输出',
        '把这段时间的输入整理成一份能够检验的成果',
        '阶段中途用一个新问题检查是否真正理解',
        '这段时间只扩展已经能够独立应用的内容',
      ],
      guards: [
        '这段时间多次无法复述同一要点时，停止增加资料',
        '练习错误仍集中在同一处时，回到原理重新处理',
        '学习时段持续被切碎时，缩小这段时间的目标',
        '阶段结束时仍没有可检查的输出，不把阅读量算作进展',
      ],
    },
    wealth: {
      actions: [
        '这段时间把待收、待付和合作责任放进同一张清单',
        '阶段中途完成一次余额、凭证和到期节点的核对',
        '这段时间只处理能够说明金额去向的款项',
        '把这段时间新增的财务责任写清期限与退出条件',
      ],
      guards: [
        '这段时间余额变化无法解释时，暂停非必要付款',
        '凭证与实际金额对不上时，不进入下一笔交易',
        '合作责任仍停留在口头约定时，这段时间不签新条件',
        '到期节点会挤压必要支出时，先调整付款顺序',
      ],
    },
    relationship: {
      actions: [
        '这段时间只处理一处反复出现的信息差',
        '把这段时间达成的共识写成双方可执行的下一步',
        '阶段中途回看一次实际行动是否符合先前约定',
        '这段时间把事实、各自理解和承诺分开确认',
      ],
      guards: [
        '同一分歧再次出现时，先核对哪条事实发生变化',
        '双方对原约定理解不同，这段时间不扩大讨论范围',
        '情绪反应盖过具体问题时，暂停给关系下结论',
        '行动没有跟上共识时，先修正下一步而不是重复表态',
      ],
    },
    travel: {
      actions: [
        '这段时间把同方向外出合并，并重算每次回程余量',
        '阶段中途提前确认后续行程的路线、物品和替代方案',
        '这段时间优先完成转场较少、结束时间明确的外出',
        '把这段时间已经发生的延误记到下一次路线选择里',
      ],
      guards: [
        '前一段延误会压缩回程时，删去途中次要事项',
        '路线和天气同时变化时，这段时间不追加站点',
        '关键物品或证件没有确认时，先调整出发时间',
        '连续转场没有机动余量时，改成分次完成',
      ],
    },
    wellbeing: {
      actions: [
        '这段时间比较睡眠、进食和注意力的恢复变化',
        '把这段时间恢复最快的一种作息或轻量活动固定下来',
        '阶段中途按真实精力重新分配剩余任务量',
        '这段时间给休息设置不会被临时事项挤占的时段',
      ],
      guards: [
        '连续休息后仍无法集中时，减少这段时间剩余任务',
        '睡眠与食欲同时走低时，不用兴奋感继续加量',
        '恢复时间一天比一天长时，提前停止非必要安排',
        '阶段结束时状态仍未回升，下一阶段先降低固定负荷',
      ],
    },
  },
  month: {
    career: {
      actions: [
        '当月完成一套能在下一项任务复用的交付与验收流程',
        '用当月主要交付检验责任、节点和验收能否闭环',
        '把当月反复返工的一环改成固定检查步骤',
        '当月先收掉职责清楚的积压，再决定是否扩量',
      ],
      guards: [
        '当月规则仍随任务反复重写时，暂停扩大职责',
        '同类交接再次无人接手时，先修流程再排新任务',
        '月底仍无法说明由谁验收时，不把工作计作闭环',
        '临时事项持续挤压主线时，减少并行承诺',
      ],
    },
    study: {
      actions: [
        '当月用多个新问题验证同一套理解方法',
        '把当月输入整理成可复述、可应用的成果',
        '当月围绕一项核心能力完成学习、练习、输出和复盘',
        '比较当月前后两次输出，确认错误是否真正减少',
      ],
      guards: [
        '月底仍只能复述材料原话时，收拢下月方向',
        '当月练习没有迁移到新问题时，不继续增加课程',
        '资料增长快于成品与练习时，暂停扩展学习面',
        '同类错误贯穿整月时，先重做基础环节',
      ],
    },
    wealth: {
      actions: [
        '当月完成一次现金流、固定成本和长期付款的总核对',
        '把当月新增付款责任放进预算，确认后续月份仍能承担',
        '比较当月计划与实际余额，修正持续偏差的支出项',
        '当月只扩大已经留下凭证并按节点结清的合作',
      ],
      guards: [
        '月底现金去向仍不能追溯时，暂停新增投入',
        '固定成本挤压必要余量时，下月先减少可变支出',
        '长期付款没有进入预算时，不用单笔收益作担保',
        '同类金额偏差再次出现时，先重做记录规则',
      ],
    },
    relationship: {
      actions: [
        '当月用后续行动验证一项重要共识是否稳定',
        '把整月反复出现的分歧收拢成一套沟通约定',
        '比较月初与月底的理解差异，确认误解是否减少',
        '当月只推进事实、边界和下一步都已对齐的承诺',
      ],
      guards: [
        '同类误解贯穿整月时，下月先修沟通规则',
        '表态与实际行动持续不一致时，暂停增加承诺',
        '每次沟通都从事实确认重新开始时，不扩大议题',
        '月底仍无法执行原共识时，先重定双方下一步',
      ],
    },
    travel: {
      actions: [
        '当月整理一套能重复使用的路线与返程方案',
        '比较当月多次外出的延误位置，修正高频节点',
        '把当月常用路线、替代选择和所需余量集中记录',
        '当月用一次复杂行程检验转场安排是否可靠',
      ],
      guards: [
        '同类延误贯穿整月时，下月减少连续转场',
        '返程持续依赖临时补救时，暂停增加复杂行程',
        '常用路线仍没有替代选择时，不压缩时间余量',
        '多次外出都在同一节点受阻时，先更换路线规则',
      ],
    },
    wellbeing: {
      actions: [
        '当月确认一套经过忙闲变化仍能维持的恢复安排',
        '比较整月睡眠、进食和注意力，找出主要消耗源',
        '把当月恢复最快的习惯加入下月固定日程',
        '用月底状态检验当前任务密度是否能够持续',
      ],
      guards: [
        '整月恢复速度持续变慢时，下月先减少固定负荷',
        '忙碌一增加就挤掉睡眠时，先调整长期排期',
        '月底仍依赖临时补觉时，不恢复原有任务量',
        '注意力与食欲没有共同回升时，继续保留减量',
      ],
    },
  },
};

const periodLabels: Record<FortunePeriod, string> = { today: '今日', month: '月运', year: '年运' };
const periodCategoryCompletionRules: Record<Exclude<FortunePeriod, 'today'>, Record<string, string>> = {
  month: {
    career: '把本月反复出现的任务归到同一套责任与验收清单；负责人、下一步和完成口径能够沿用，才进入本月正式排期',
    study: '用本月多次复述、练习或输出检验理解；同一要点能够在不同问题中正确应用，才继续扩展资料和学习范围',
    wealth: '把本月多笔收支、付款义务和合作条件汇总核对；现金去向、责任人与后续节点都能追溯，才安排新的支出或承诺',
    relationship: '观察同一分歧在后续沟通和行动中是否减少；事实基础与真实意图都已对齐，形成的共识还能落实为双方共同遵守的承诺，才把问题视为真正谈清',
    travel: '把本月多次外出的路线、延误和返程余量放在一起复盘；能找到可复用的出发条件与备选方案，才继续增加行程',
    wellbeing: '以本月睡眠、饮食和专注度能否持续恢复判断负荷；只有多数安排后仍能回到稳定状态，才维持当前任务量',
  },
  year: {
    career: '建立可以跨阶段沿用的负责人、交付标准与验收规则；换一项任务仍能按同一流程排期并收尾，才算形成可复用的工作能力',
    study: '把知识整理成能迁移到新问题的理解与输出方法；课程或资料数量不能代替掌握，实际应用稳定后再扩大方向',
    wealth: '用全年现金流、固定支出和长期义务判断承受力；预算规则能覆盖金额、付款节点及不同月份的波动，才增加长期投入或合作责任',
    relationship: '形成可重复使用的事实确认、信息差处理和承诺边界；换到不同情境仍能减少误解，才说明关系基础稳定',
    travel: '从全年多次出行中沉淀可靠路线、时间缓冲和返程条件；外部变化出现时仍有替代方案，才承担更复杂的行程',
    wellbeing: '建立能够支撑全年安排的睡眠、饮食与恢复基线；忙闲变化后仍能恢复专注和体力，才把当前节奏视为可持续',
  },
};

const periodCategoryCautionPatterns: Record<Exclude<FortunePeriod, 'today'>, Record<string, string>> = {
  month: {
    career: '同类任务持续出现交接空白时，先暂停新增排期，补齐负责人和验收口径',
    study: '资料持续增加但复述与应用没有改善时，先停止扩充范围，回到尚未掌握的要点',
    wealth: '月内账目无法串起金额、责任或付款节点时，先冻结新增支出与合作承诺',
    relationship: '同一分歧在后续行动中反复出现时，先核对事实和原有共识，不把短暂和解当成解决',
    travel: '多次行程都在转场或返程处失去余量时，先合并路线并删去低优先级安排',
    wellbeing: '睡眠、食欲或专注度持续未恢复时，先下调本月任务密度，不用个别状态好的日子抵消透支',
  },
  year: {
    career: '责任或验收规则每到新阶段都要重写时，先修正流程，不把一次顺利交付当成稳定能力',
    study: '学习内容不断增加却不能迁移到新问题时，先收拢方向，不用课程数量代替真实掌握',
    wealth: '固定支出、长期义务或现金流缺口没有进入预算时，先停止扩大投入，不用单笔收益判断承受力',
    relationship: '相同误解在不同情境持续重现时，先重建沟通规则和承诺边界，不用一次表态掩盖结构性分歧',
    travel: '路线、时间缓冲和返程安排始终依赖临时补救时，先减少复杂行程，补足稳定的替代方案',
    wellbeing: '忙碌阶段反复挤占睡眠和恢复时间时，先调整全年节奏，不把短期硬撑视为可持续状态',
  },
};

interface PeriodActionGuidance {
  action: string;
  boundary: string;
  cautionAction: string;
}

interface PeriodPersonalGuidance {
  support: string;
  boundary: string;
}

interface PeriodReferenceGuidance {
  check: string;
  itemUse: string;
}

interface PeriodWindowGuidance {
  use: string[];
  caution: string[];
}

const periodActionGuidance: Record<Exclude<FortunePeriod, 'today'>, Record<string, PeriodActionGuidance>> = {
  month: {
    career: {
      action: '先盘点本月在手任务，按负责人员、截止节点和交付口径分成已就绪与待补信息两组',
      boundary: '临时事项进来时，先决定它替换哪项原计划，不直接叠加到现有工作量',
      cautionAction: '复核本月任务表；找不到接手人或验收依据的事项先移出日程。',
    },
    study: {
      action: '选一个本月核心主题，安排多轮讲解、练习和成品输出，并记录每轮卡住的位置',
      boundary: '同一知识点仍不能独立运用时，先回到原内容，不追加课程或题量',
      cautionAction: '回看本月练习与输出；错误仍集中在同一要点时，先停新资料并重新讲清原理。',
    },
    wealth: {
      action: '先做一张本月资金表，把已知收入、固定开销、待付项目和合作义务放到同一时间轴',
      boundary: '余额在某个付款点无法解释时，先取消非必要支付',
      cautionAction: '逐笔对照资金表中的金额、到期日和责任方；任一项无法追溯就暂停付款。',
    },
    relationship: {
      action: '挑出本月反复出现的一处沟通问题，分开写下已知事实、双方理解和已经同意的下一步',
      boundary: '实际行动偏离原共识时，先查哪条信息发生变化，不把话题扩到其他矛盾',
      cautionAction: '对照先前共识与最近行动；先确认变化发生在哪一步，再讨论双方立场。',
    },
    travel: {
      action: '汇总本月已确定的外出，按方向和时间合并，并标出每次换乘及回程的备用时长',
      boundary: '前一段延误会压缩回程时，优先取消途中低优先级事项',
      cautionAction: '重新计算近期行程的换乘和回程余量；连续受压的路线直接减少一站。',
    },
    wellbeing: {
      action: '记录本月睡眠、进食和注意力变化，找出哪些安排会明显拉长恢复时间',
      boundary: '休息之后仍无法连续集中时，降低随后几天的任务密度',
      cautionAction: '对照近期睡眠、食欲与注意力；恢复没有起色就减少接下来的任务。',
    },
  },
  year: {
    career: {
      action: '盘点全年重复承担的职责，找出返工最多的一段，改成固定的交接步骤和验收凭据',
      boundary: '新流程还没在另一项任务中走通前，不扩大年度承诺',
      cautionAction: '检查各阶段的接手人、交付物与验收依据；同类返工持续出现时，先修流程再接新职责。',
    },
    study: {
      action: '选定一项年度核心能力，把学习、练习、成品和复盘排成可跨阶段重复的循环',
      boundary: '方法尚不能解决陌生问题时，不用课时或收藏量判断进度',
      cautionAction: '拿一个新问题检验既有方法；不能独立解决就收拢学习方向，不再扩充课程。',
    },
    wealth: {
      action: '建立全年资金底表，分开固定成本、可调整支出、长期付款与预留资金',
      boundary: '预算还覆盖不了收入偏低的月份时，不增加持续性支出',
      cautionAction: '用低收入月份重算预算；固定成本和长期付款无法同时覆盖时，先削减新增投入。',
    },
    relationship: {
      action: '建立一套长期沟通约定，明确事实怎么核对、分歧怎么表达、承诺怎么确认',
      boundary: '相似误解仍换场景出现时，先修改约定，不用一次道歉视为解决',
      cautionAction: '抽查不同阶段的同类争议；若仍从事实确认处开始错位，先重建沟通规则。',
    },
    travel: {
      action: '复盘全年常用路线与高频延误点，为长途和多段行程分别准备固定替代路线',
      boundary: '关键路径没有回程缓冲或替代方案时，不安排连续转场',
      cautionAction: '找出反复延误的路线与时段；仍依赖临时补救的行程先降低复杂度。',
    },
    wellbeing: {
      action: '确定全年最低恢复基线，写清睡眠、规律进食和活动不能被长期挤占的底线',
      boundary: '忙碌期只能靠压缩休息维持时，先调整长期任务结构',
      cautionAction: '比较忙闲阶段的睡眠和注意力；每次忙起来都明显下滑时，先减少长期负荷。',
    },
  },
};

const periodPersonalGuidance: Record<Exclude<FortunePeriod, 'today'>, Record<string, PeriodPersonalGuidance>> = {
  month: {
    career: {
      support: '本月把精力留给责任清楚且能连续推进的任务，让梳理交接的优势用于稳定交付，而不是反复救火',
      boundary: '本月临时事项持续挤占原排期时，减少新承诺，先保护已经接下的交付',
    },
    study: {
      support: '本月把较容易进入状态的时段固定给同一主题，用连续输出积累优势，不把精力分散给过多资料',
      boundary: '本月理解屡次停在输入层时，缩小学习面，只保留能够复述和运用的内容',
    },
    wealth: {
      support: '本月把核对能力集中在少数关键账目与条款，先解决会影响现金余量的项目，不同时承接多笔复杂合作',
      boundary: '本月核对成本持续偏高时，只维护已有收支与凭证，不新增付款义务',
    },
    relationship: {
      support: '本月优先投入能够持续核对事实的一段关系或协作，让达成的共识接受后续行动检验',
      boundary: '本月沟通消耗持续偏高时，减少同时处理的关系议题，只保留最需要确认的一处信息差',
    },
    travel: {
      support: '本月优先处理路线熟悉、能够顺路完成的外出，把规划优势用于减少重复转场',
      boundary: '本月外出反复打乱原有任务时，减少跨区或多站安排，只保留必要行程',
    },
    wellbeing: {
      support: '本月把恢复较快的作息、进食或轻量活动固定下来，用个人状态较好的阶段修复承载力',
      boundary: '本月恢复速度持续变慢时，主动降低任务密度，不用偶尔精神好判断整月负荷',
    },
  },
  year: {
    career: {
      support: '全年把梳理责任与完成收尾的优势沉淀成长期工作方法，让常见任务不再依赖临时补救',
      boundary: '全年职责反复占用额外精力时，把范围收窄到能够稳定交付的部分，不继续扩大责任',
    },
    study: {
      support: '全年把容易整理信息与检验理解的优势集中到一项核心能力，形成可以迁移的个人学习方法',
      boundary: '全年投入长期停留在收集资料时，缩减方向，只保留能够进入实际应用的学习内容',
    },
    wealth: {
      support: '全年把核对金额与比较条件的优势用于守住现金流和长期资源，优先整理会持续产生影响的责任',
      boundary: '全年财务事项长期消耗过多注意力时，减少复杂合作，只保留预算能够持续覆盖的义务',
    },
    relationship: {
      support: '全年把倾听与表达边界的能力用于少数重要关系，逐步建立双方都能长期遵守的沟通方式',
      boundary: '全年同类误解在不同阶段持续消耗精力时，减少并行议题，先修复一套共同确认事实的方法',
    },
    travel: {
      support: '全年把路线规划与应变优势沉淀成常用出行方案，优先优化反复出现的路线和转场',
      boundary: '全年出行长期打乱作息或任务顺序时，减少连续转场，不承担缺少回程保障的安排',
    },
    wellbeing: {
      support: '全年把察觉疲劳和调整负荷的能力变成稳定恢复制度，让状态优势持续支撑其他计划',
      boundary: '全年恢复长期依赖临时补觉或停工时，先减少固定负荷，重建不会被忙碌挤掉的底线',
    },
  },
};

const periodReferenceGuidance: Record<Exclude<FortunePeriod, 'today'>, Record<string, PeriodReferenceGuidance>> = {
  month: {
    career: {
      check: '本月任务中哪些已有稳定交接，哪些仍在重复改动',
      itemUse: '让它作为更新本月任务表的固定提示，只补充责任变化、实际完成和未闭环事项',
    },
    study: {
      check: '本月多轮输出是否反复卡在同一要点，学习范围是否需要收拢',
      itemUse: '让它提示你把本月每次复述、练习和成品结果记在同一处，月末据此判断真实掌握',
    },
    wealth: {
      check: '本月现金余量、待付款和合作义务是否仍在预算内',
      itemUse: '让它提醒你更新本月资金表，只记录会改变余额或责任期限的事项',
    },
    relationship: {
      check: '本月共识在后续行动中是否仍成立，同一信息差是否再次出现',
      itemUse: '让它提醒你保留本月关键沟通的事实、共识和执行结果，用后续行动验证',
    },
    travel: {
      check: '本月多次行程在哪个转场或返程环节反复失去余量',
      itemUse: '让它提示你汇总本月延误位置与替代路线，下次优先修正重复出现的节点',
    },
    wellbeing: {
      check: '本月睡眠、进食和注意力是否持续恢复，哪类安排最容易造成透支',
      itemUse: '让它提醒你记录本月恢复速度而非单日情绪，据此调整后续任务密度',
    },
  },
  year: {
    career: {
      check: '全年哪些职责已经形成可重复交接，哪些仍依赖临时救火',
      itemUse: '让它提示你保留一份全年工作方法，只沉淀经过不同任务验证的交接与验收规则',
    },
    study: {
      check: '全年学习方法能否迁移到陌生问题，还是只增加了课程与资料',
      itemUse: '让它提示你维护一份全年能力记录，用新问题、成品和复盘结果证明方法确实可迁移',
    },
    wealth: {
      check: '全年现金流能否覆盖低收入月份、固定成本与长期付款',
      itemUse: '让它提示你持续更新全年资金底表，把固定责任、可调支出和预留资金分开记录',
    },
    relationship: {
      check: '全年同类误解是否逐步减少，沟通约定能否在不同情境继续使用',
      itemUse: '让它提示你记录全年关键关系中的事实确认、共同约定和执行偏差，只修正反复出现的环节',
    },
    travel: {
      check: '全年哪些路线与时段能够稳定复用，哪些延误仍在重复发生',
      itemUse: '让它提示你维护全年出行方案，保留可靠路线、常见延误点和真正可用的替代选择',
    },
    wellbeing: {
      check: '全年恢复基线能否经过忙闲变化，还是持续依赖临时补觉与停工',
      itemUse: '让它提示你维护全年恢复记录，比较忙闲阶段的睡眠、进食、活动与注意力变化',
    },
  },
};

const periodWindowGuidance: Record<FortunePeriod, Record<string, PeriodWindowGuidance>> = {
  today: {
    career: {
      use: ['交付一个可验收结果', '确认一项任务的责任与验收', '完成一次责任清楚的交接'],
      caution: ['先核责任、交付物与验收口径', '先停下边界仍在变化的承诺', '先查临时事项会替换哪项任务'],
    },
    study: {
      use: ['留下一个可复述的小结', '用一道练习检验真实理解', '完成一段可检查的输出'],
      caution: ['先停新增资料并复述已有要点', '先减少任务切换再继续输入', '先定位一道反复出错的练习'],
    },
    wealth: {
      use: ['闭合一笔金额与付款记录', '核对一项付款责任和节点', '留下一份可追溯的资金记录'],
      caution: ['先核金额、责任与付款节点', '先停无法说明去向的付款', '先查合作责任是否已经写清'],
    },
    relationship: {
      use: ['核对一处事实差异', '把一个分歧谈到下一步明确', '用一次后续行动验证共识'],
      caution: ['先分清事实、感受与推测', '先停没有共同前提的承诺', '先查双方是否在谈同一件事'],
    },
    travel: {
      use: ['确认一条出发与返程路线', '完成一次留有余量的行程', '备齐路线、物品与替代方案'],
      caution: ['先核路线、天气与返程余量', '先删时间链条过紧的一站', '先确认延误后仍有替代路线'],
    },
    wellbeing: {
      use: ['留出一段完整休息', '用休息后的专注度校准任务量', '恢复一次稳定进食与注意力'],
      caution: ['先减任务并观察恢复速度', '先停用短时兴奋判断承受量', '先把睡眠与进食恢复到基线'],
    },
  },
  month: {
    career: {
      use: ['完成一次可验收交付', '把一项任务推进到明确验收', '完成一次责任清楚的交接'],
      caution: ['先核责任变更与返工源头', '先查交付口径是否中途变化', '先确认延期来自责任还是资源'],
    },
    study: {
      use: ['产出一轮可独立应用的成果', '用一个新问题检验真实理解', '完成一轮复述、练习和输出'],
      caution: ['先查输入是否转成独立输出', '先停新增资料并复测原有要点', '先定位反复出错的同一知识点'],
    },
    wealth: {
      use: ['结清一笔可追溯款项', '完成一次账目与付款节点核对', '把一项合作责任写入完整记录'],
      caution: ['先查现金去向与持续义务', '先核金额、责任和退出条件', '先停止无法追溯用途的新增支出'],
    },
    relationship: {
      use: ['让一项共识进入后续行动', '把一个信息差谈到事实一致', '用后续行动验证一次沟通结果'],
      caution: ['先查事实偏差是否重复', '先分清事实、感受与推测', '先暂停没有共同前提的承诺'],
    },
    travel: {
      use: ['验证一条可复用路线', '完成一次留有返程余量的行程', '确认一套转场与备选路线'],
      caution: ['先查路线和返程余量', '先减少时间链条过紧的行程', '先确认延误后仍有替代方案'],
    },
    wellbeing: {
      use: ['留出完整恢复窗口', '用休息后的专注度校准任务量', '恢复一次稳定的睡眠与进食节奏'],
      caution: ['先减负并观察恢复速度', '先停用短时兴奋判断承受量', '先把睡眠与进食恢复到基线'],
    },
  },
  year: {
    career: {
      use: ['固化跨任务交接规则', '建立能够复用的验收流程', '用一次完整交付检验职责边界'],
      caution: ['先修反复失效的责任流程', '先处理跨阶段重复的返工源头', '先停止没有稳定承接人的扩张'],
    },
    study: {
      use: ['验证学习方法能否迁移', '把一项能力用到陌生问题', '沉淀能够重复使用的输出方法'],
      caution: ['先停无法迁移的资料投入', '先淘汰只增加数量的学习安排', '先修长期重复出现的理解缺口'],
    },
    wealth: {
      use: ['校准长期现金流', '建立覆盖固定责任的预算规则', '检验低收入阶段的资金承受力'],
      caution: ['先收紧没有预算承接的责任', '先修长期重复的现金流缺口', '先停止只靠单笔收益支撑的扩张'],
    },
    relationship: {
      use: ['固化分歧处理约定', '建立跨情境可用的事实确认方式', '用长期行动检验一次共同承诺'],
      caution: ['先修跨场景重复的误解', '先停止只靠表态维持的共识', '先重建长期失效的沟通边界'],
    },
    travel: {
      use: ['沉淀长期路线备选', '建立能够应对延误的行程方案', '验证复杂行程的时间承载力'],
      caution: ['先补长期缺失的替代路线', '先减少持续依赖临时补救的行程', '先修反复压缩返程余量的安排'],
    },
    wellbeing: {
      use: ['建立全年恢复基线', '验证忙闲变化后的恢复能力', '固化能够长期维持的作息边界'],
      caution: ['先修长期透支的任务密度', '先停止依赖临时补觉的节奏', '先处理跨阶段持续下降的恢复力'],
    },
  },
};

function categoryCompletionRule(definition: TopicDefinition, period: FortunePeriod) {
  return period === 'today'
    ? definition.completionRule
    : periodCategoryCompletionRules[period][definition.key] || definition.completionRule;
}

function categoryCautionPattern(definition: TopicDefinition, period: FortunePeriod) {
  return period === 'today'
    ? definition.cautionPattern
    : periodCategoryCautionPatterns[period][definition.key] || definition.cautionPattern;
}

function categoryActionGuidance(definition: TopicDefinition, period: FortunePeriod): PeriodActionGuidance {
  if (period === 'today') {
    return {
      action: definition.action,
      boundary: definition.personalSupportStop,
      cautionAction: definition.cautionAction,
    };
  }
  return periodActionGuidance[period][definition.key] || {
    action: definition.action,
    boundary: definition.personalSupportStop,
    cautionAction: definition.cautionAction,
  };
}

function personalActionGuidance(definition: TopicDefinition, period: FortunePeriod): PeriodPersonalGuidance {
  if (period === 'today') {
    return {
      support: definition.personalSupportAction,
      boundary: definition.personalReviewBoundary,
    };
  }
  return periodPersonalGuidance[period][definition.key] || {
    support: definition.personalSupportAction,
    boundary: definition.personalReviewBoundary,
  };
}

function referenceGuidance(definition: TopicDefinition, period: FortunePeriod): PeriodReferenceGuidance {
  if (period === 'today') {
    return {
      check: definition.check,
      itemUse: '',
    };
  }
  return periodReferenceGuidance[period][definition.key] || {
    check: definition.check,
    itemUse: '',
  };
}

const dailyFortuneCacheVersion = '2026-08-27-v112';
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
const personalFocusImpacts: Record<string, string> = {
  '责任与规则': '责任与流程会成为判断前提，含糊的分工更容易拖慢后续',
  '压力与突破': '压力会提高反应速度，也会压缩休息与复核时间，容易高估短期承受量',
  '支持与吸收': '信息和帮助会主动增加，但只有能复述或应用的部分才算真正吸收',
  '研究与调整': '细节和替代方案更容易被看见，但迟迟不停止比较会推迟决定',
  '产出与分享': '已有积累更容易变成可见成果，完成一项后再扩大分享更有效',
  '表达与变化': '临场表达和变化都会增加，短期反应不能直接替代长期安排',
  '稳定资源': '固定收入、预算和长期资源更值得整理，先守住连续来源再考虑扩张',
  '流动资源': '短期机会会增多，但要看能否留下记录并形成连续回报',
  '自主与协作': '自主决定与协作边界会更突出，能自行决定和需要协商的部分要分开',
  '竞争与分配': '比较压力会放大资源分配问题，照搬他人节奏更容易挤掉自己的必要事项',
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

const elementMeanings: Record<FiveElement, string> = {
  木: '延展、梳理与持续跟进',
  火: '行动、表达与及时反馈',
  土: '稳定、承接与把事情落地',
  金: '取舍、边界与形成标准',
  水: '观察、调整与保留余地',
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

function personalRelationEvidenceForPalace(
  chart: QimenData,
  palace: QimenJiuGongGe,
  personal: PersonalContext | null,
): PersonalRelationEvidence {
  if (!personal) return { relation: 'neutral' };
  const personalPalace = findStemPalace(chart, personal.qimenStem);
  let supportVotes = 0;
  let reviewVotes = 0;
  const supportReasons: Array<{ reason: PersonalRelationReason; weight: number }> = [];
  const reviewReasons: Array<{ reason: PersonalRelationReason; weight: number }> = [];
  const addSupport = (reason: PersonalRelationReason, weight: number) => {
    supportVotes += weight;
    supportReasons.push({ reason, weight });
  };
  const addReview = (reason: PersonalRelationReason, weight: number) => {
    reviewVotes += weight;
    reviewReasons.push({ reason, weight });
  };
  if (personalPalace && isFiveElement(personalPalace.element) && isFiveElement(palace.element)) {
    if (personalPalace.gong === palace.gong) {
      const isVoid = chart.voidPalaces?.some((item) => item.palace === palace.gong);
      const hasRisk = chart.palaceInsights?.some((item) => item.gong === palace.gong && item.level === '风险');
      if (isVoid || hasRisk) addReview('attention-blocked', 2);
      else addSupport('attention-aligned', 2);
    } else if (elementsSupport(personalPalace.element, palace.element)) addSupport('approach-aligned', 1);
    else if (elementsConflict(personalPalace.element, palace.element)) addReview('approach-friction', 1);
  }
  if (isFiveElement(palace.element)) {
    if (elementsSupport(personal.dayElement, palace.element)) addSupport('rhythm-aligned', 1);
    else if (elementsConflict(personal.dayElement, palace.element)) addReview('rhythm-friction', 1);
    const usefulAlignment = elementAlignment(personal, palace.element);
    if (usefulAlignment >= .65) addSupport('strength-aligned', usefulAlignment >= 1 ? 2 : 1);
    else if (usefulAlignment <= -.65) addReview('effort-friction', usefulAlignment <= -1 ? 2 : 1);
  }
  if (supportVotes > reviewVotes) {
    return { relation: 'support', reason: [...supportReasons].sort((left, right) => right.weight - left.weight)[0]?.reason };
  }
  if (reviewVotes > supportVotes) {
    return { relation: 'review', reason: [...reviewReasons].sort((left, right) => right.weight - left.weight)[0]?.reason };
  }
  return { relation: 'neutral' };
}

function personalRelationForPalace(chart: QimenData, palace: QimenJiuGongGe, personal: PersonalContext | null): PersonalRelation {
  return personalRelationEvidenceForPalace(chart, palace, personal).relation;
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

  const personalEvidence = personalRelationEvidenceForPalace(chart, palace, personal);
  const personalRelation = personalEvidence.relation;
  if (personalRelation === 'support') supportCount += 1;
  else if (personalRelation === 'review') softRiskCount += 1;

  return {
    supportCount,
    softRiskCount,
    hardRiskCount,
    personalRelation,
    personalReason: personalEvidence.reason,
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
      personalReason: signals.personalReason
        || (personalResult.personalAlignment >= .18
          ? 'period-aligned'
          : personalResult.personalAlignment <= -.18 ? 'period-friction' : undefined),
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

function timeWindowSummarizes(
  timeWindows: DailyFortuneTimeWindow[],
  analysisWindow: string,
  coverageText: string,
) {
  const normalizeWindow = (value: string) => value.replace(/^公历/, '').replace(/[（）()\s]/g, '');
  return Boolean(analysisWindow) && timeWindows.some((item) => (
    normalizeWindow(`${item.name}${item.range}`) === normalizeWindow(analysisWindow)
    && item.coverage.includes(coverageText)
  ));
}

function categoryDetailFromJudgment(
  aggregate: CategoryAggregate,
  judgment: FortuneMasterJudgment,
  period: FortunePeriod,
  timeWindows: DailyFortuneTimeWindow[] = [],
) {
  const { evaluation, bestAnalysis } = aggregate;
  const { definition, tone } = evaluation;
  const isPrimary = definition.key === judgment.primary.evaluation.definition.key;
  const isSecondary = definition.key === judgment.secondary.evaluation.definition.key;
  const isCaution = definition.key === judgment.caution.evaluation.definition.key;
  const displayBestAnalysis = isPrimary ? judgment.bestAnalysis || bestAnalysis : bestAnalysis;
  const bestWindow = displayBestAnalysis ? formatAnalysisWindow(displayBestAnalysis, period) : '';
  const windowAlreadySummarized = timeWindowSummarizes(timeWindows, bestWindow, definition.shortLabel);
  const bestLead = !isPrimary && bestWindow && !windowAlreadySummarized ? `${bestWindow}可优先安排；` : '';
  const completionRule = categoryCompletionRule(definition, period);
  if (isCaution && tone !== 'favorable') {
    return `${completionRule}。`;
  }
  if (isPrimary) {
    if (tone !== 'cautious') return `${bestLead}${completionRule}。`;
    return `${completionRule}。`;
  }
  if (isSecondary) {
    return `${bestLead}${completionRule}。`;
  }
  if (tone === 'favorable') return `${bestLead}${completionRule}。`;
  if (tone === 'cautious') {
    return period === 'today' ? `${definition.personalReviewBoundary}。` : `${completionRule}。`;
  }
  return `${bestLead}${completionRule}。`;
}

const categoryRoleStatuses: Record<string, { support: string; caution: string }> = {
  career: { support: '形成交付', caution: '收紧承诺' },
  study: { support: '形成输出', caution: '减少切换' },
  wealth: { support: '留下记录', caution: '暂停付款' },
  relationship: { support: '对齐事实', caution: '暂停定性' },
  travel: { support: '备齐路线', caution: '删减行程' },
  wellbeing: { support: '同步恢复', caution: '先减任务' },
};

function categoryStatusFromJudgment(
  aggregate: CategoryAggregate,
  judgment: FortuneMasterJudgment,
) {
  const key = aggregate.evaluation.definition.key;
  const isPrimary = key === judgment.primary.evaluation.definition.key;
  const isSecondary = key === judgment.secondary.evaluation.definition.key;
  const isCaution = key === judgment.caution.evaluation.definition.key;
  const roleStatus = categoryRoleStatuses[key] || {
    support: aggregate.evaluation.definition.statusGuard,
    caution: aggregate.evaluation.definition.statusGuard,
  };
  if (isPrimary) return aggregate.evaluation.tone === 'cautious' ? roleStatus.caution : '本期主线';
  if (isCaution) return aggregate.evaluation.tone === 'cautious' ? roleStatus.caution : aggregate.evaluation.definition.statusGuard;
  if (isSecondary) {
    return aggregate.evaluation.tone === 'cautious' ? roleStatus.caution : roleStatus.support;
  }
  if (aggregate.evaluation.tone === 'favorable') return roleStatus.support;
  if (aggregate.evaluation.tone === 'cautious') return roleStatus.caution;
  return aggregate.evaluation.definition.statusGuard;
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
  return `${formatAnalysisWindow(worstAnalysis, period)}：${categoryCautionPattern(evaluation.definition, period)}。`;
}

function categoryBasisFromJudgment(
  aggregate: CategoryAggregate,
  judgment: FortuneMasterJudgment,
  period: FortunePeriod,
  timeWindows: DailyFortuneTimeWindow[] = [],
) {
  const isOverallCaution = aggregate.evaluation.definition.key === judgment.caution.evaluation.definition.key
    && judgment.cautionAnalysis
    && aggregate.worstAnalysis?.date.getTime() === judgment.cautionAnalysis.date.getTime();
  if (isOverallCaution) return `主要风险：${categoryCautionPattern(aggregate.evaluation.definition, period)}。`;
  const worstWindow = aggregate.worstAnalysis ? formatAnalysisWindow(aggregate.worstAnalysis, period) : '';
  const cautionAlreadySummarized = timeWindowSummarizes(
    timeWindows,
    worstWindow,
    `${aggregate.evaluation.definition.shortLabel}需复核`,
  );
  if (cautionAlreadySummarized) return `注意点：${categoryCautionPattern(aggregate.evaluation.definition, period)}。`;
  return categoryBasis(aggregate.evaluation, period, aggregate.cautiousCount, aggregate.worstAnalysis);
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

const personalReasonDirection: Record<PersonalRelationReason, Exclude<PersonalRelation, 'neutral'>> = {
  'attention-aligned': 'support',
  'attention-blocked': 'review',
  'approach-aligned': 'support',
  'approach-friction': 'review',
  'rhythm-aligned': 'support',
  'rhythm-friction': 'review',
  'strength-aligned': 'support',
  'effort-friction': 'review',
  'period-aligned': 'support',
  'period-friction': 'review',
};

function aggregatePersonalReason(
  evaluations: CategoryEvaluation[],
  relation: PersonalRelation,
  alignment: number,
) {
  const direction = relation === 'neutral'
    ? alignment >= .18 ? 'support' : alignment <= -.18 ? 'review' : null
    : relation;
  if (!direction) return undefined;
  const counts = new Map<PersonalRelationReason, number>();
  evaluations.forEach((item) => {
    if (!item.personalReason || personalReasonDirection[item.personalReason] !== direction) return;
    counts.set(item.personalReason, (counts.get(item.personalReason) || 0) + 1);
  });
  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0];
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
    const personalRelation = aggregatePersonalRelation(allEvaluations);
    const personalAlignment = allEvaluations.reduce((total, item) => total + item.personalAlignment, 0) / allEvaluations.length;
    const combined: CategoryEvaluation = {
      ...deepestContext,
      tone,
      score: weightedScore,
      supportCount: Math.round(allEvaluations.reduce((total, item) => total + item.supportCount, 0) / allEvaluations.length),
      riskCount: Math.round(allEvaluations.reduce((total, item) => total + item.riskCount, 0) / allEvaluations.length),
      personalRelation,
      personalReason: aggregatePersonalReason(allEvaluations, personalRelation, personalAlignment),
      personalChange: allEvaluations.some((item) => item.personalChange),
      personalAlignment,
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
  preferCurrentWindow = false,
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
  const scoredBestAnalysis = primaryCandidates.length
    ? [...primaryCandidates].sort((left, right) => (
        (right.score * .58 + analysisTopicScore(right, primaryKey) * .42)
        - (left.score * .58 + analysisTopicScore(left, primaryKey) * .42)
        || compareAnalyses(left, right)
      ))[0]
    : undefined;
  const currentAnalysis = preferCurrentWindow
    ? [...analyses].sort((left, right) => left.date.getTime() - right.date.getTime())[0]
    : undefined;
  const currentPrimaryEvaluation = currentAnalysis?.categories.find((item) => item.definition.key === primaryKey);
  const currentHasFavorableCategory = currentAnalysis?.categories.some((item) => item.tone === 'favorable') || false;
  const currentPrimaryIsUsable = currentPrimaryEvaluation?.tone === 'favorable'
    || (!currentHasFavorableCategory && currentPrimaryEvaluation?.tone === 'balanced');
  const currentPrimaryAnalysis = currentAnalysis
    && currentPrimaryEvaluation
    && currentPrimaryIsUsable
    && isUsablePriorityAnalysis(currentAnalysis)
    ? currentAnalysis
    : undefined;
  const bestAnalysis = currentPrimaryAnalysis || scoredBestAnalysis;
  const cautionAnalysis = caution.worstAnalysis || [...analyses]
    .filter((analysis) => analysis.categories.some((item) => item.definition.key === cautionKey && item.tone === 'cautious'))
    .sort((left, right) => (
      analysisTopicScore(left, cautionKey) - analysisTopicScore(right, cautionKey)
      || left.score - right.score
      || left.date.getTime() - right.date.getTime()
    ))[0];
  return { bestAnalysis, cautionAnalysis };
}

function buildPersonalJudgmentInsight(
  aggregates: CategoryAggregate[],
  primary: CategoryAggregate,
  caution: CategoryAggregate,
  personal: PersonalContext | null,
  period: FortunePeriod,
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
  const focusScores = new Map<string, number>();
  const addFocusScores = (item: CategoryAggregate | undefined, weight: number) => {
    item?.evaluation.personalFocus.forEach((label) => {
      focusScores.set(label, (focusScores.get(label) || 0) + weight);
    });
  };
  addFocusScores(primary, 4);
  addFocusScores(supportItem, 3);
  addFocusScores(reviewItem, 3);
  addFocusScores(caution, 2);
  aggregates.forEach((item) => addFocusScores(item, 1));
  const focusImpacts = [...focusScores.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([label]) => personalFocusImpacts[label])
    .filter(Boolean)
    .slice(0, 2);
  const topicCapabilities: Record<string, string> = {
    career: '梳理分工、划定责任和完成收尾',
    study: '整理信息、提炼要点和检验理解',
    wealth: '核对金额、比较条件和保存记录',
    relationship: '倾听、确认事实和表达边界',
    travel: '规划路线、预留时间和处理临时变化',
    wellbeing: '察觉疲劳、调整任务量和恢复注意力',
  };
  const reasonClauses: Record<PersonalRelationReason, (capability: string) => string> = {
    'attention-aligned': (capability) => `注意力会自然回到${capability}这组任务上，开始后较少被其他事项拉走`,
    'attention-blocked': (capability) => `注意力会被${capability}长期占用，却常卡在等待、犹豫或反复核对上`,
    'approach-aligned': (capability) => `${capability}与惯常做事方式一致，开始、取舍和收尾较连贯`,
    'approach-friction': (capability) => `${capability}需要频繁切换做事方式，通常会多一次沟通、复核或返工`,
    'rhythm-aligned': (capability) => `${capability}较少打乱原有作息和任务顺序，连续投入成本较低`,
    'rhythm-friction': (capability) => `${capability}会挤占原有作息或其他任务，投入后更容易疲劳或漏掉后续`,
    'strength-aligned': (capability) => `${capability}更容易进入状态，完成标准也较快看清`,
    'effort-friction': (capability) => `${capability}需要额外维持，同样任务会消耗更多时间和注意力`,
    'period-aligned': (capability) => `当前周期对${capability}有连续承接，前一步结果较容易进入下一步`,
    'period-friction': (capability) => `当前周期会多次打断${capability}，投入容易停在中途或变成补救`,
  };
  const reasonFor = (item: CategoryAggregate, fallback: PersonalRelationReason) => {
    const reason = item.evaluation.personalReason || fallback;
    const capability = topicCapabilities[item.category.key] || `处理${item.category.label}`;
    return reasonClauses[reason](capability);
  };
  const focusSentence = focusImpacts.length
    ? `结合出生资料与当前周期，${focusImpacts.join('；')}。`
    : '';
  const supportGuidance = supportItem
    ? personalActionGuidance(supportItem.evaluation.definition, period)
    : null;
  const reviewGuidance = reviewItem
    ? personalActionGuidance(reviewItem.evaluation.definition, period)
    : null;
  const supportAdvice = supportItem
    ? supportItem.evaluation.definition.key === primary.evaluation.definition.key
      ? `对这个案例，${supportItem.category.label}的投入更容易形成结果，因为${reasonFor(supportItem, 'period-aligned')}。${supportGuidance!.support}。`
      : `${supportItem.category.label}不是整体主线，但处理成本较低，因为${reasonFor(supportItem, 'period-aligned')}。现实中有对应事项时，${supportGuidance!.support}；没有就不另起任务。`
    : '';
  const reviewAdvice = reviewItem
    ? `${reviewItem.category.label}会额外消耗精力，因为${reasonFor(reviewItem, 'period-friction')}。${reviewGuidance!.boundary}。`
    : '';
  const detail = `${focusSentence}${supportAdvice}${reviewAdvice}`;
  if (!detail) return undefined;
  if (tone === 'favorable') {
    const primarySupported = primaryRelation === 'support' || (primaryRelation === 'neutral' && primaryAlignment >= .18);
    return {
      tone,
      title: primarySupported
        ? `${primary.evaluation.definition.shortLabel}更容易形成结果`
        : `${supportItem?.evaluation.definition.shortLabel || '另一项'}是个案的低成本支点`,
      detail,
    };
  }
  if (tone === 'cautious') {
    const primaryNeedsReview = primaryRelation === 'review' || (primaryRelation === 'neutral' && primaryAlignment <= -.18);
    return {
      tone,
      title: primaryNeedsReview
        ? `${primary.evaluation.definition.shortLabel}要主动减量`
        : `${reviewItem?.evaluation.definition.shortLabel || '另一项'}是个案的额外消耗`,
      detail: `${focusSentence}${reviewAdvice}${supportAdvice}`,
    };
  }
  return {
    tone,
    title: supportItem && reviewItem
      ? '个案支持与消耗同时出现'
      : supportItem
        ? `${supportItem.evaluation.definition.shortLabel}较容易形成结果`
        : reviewItem
          ? `${reviewItem.evaluation.definition.shortLabel}需要主动减量`
          : '当前周期主要放大一个观察点',
    detail,
  };
}

const secondarySummaryRoles: Record<string, string> = {
  career: '工作负责把前序判断变成交付，责任边界不清会让主线成果无人接收',
  study: '学习负责把本期经验沉淀成可复用的方法，输出比继续收集更能检验成果',
  wealth: '钱款会把选择落实为成本与责任，边界不清会反过来拖慢主线',
  relationship: '沟通决定相关信息能否对齐，事实一致后下一步才不容易返工',
  travel: '出行决定安排能否按时落地，路线和返程余量会直接影响执行稳定性',
  wellbeing: '身心状态是主线能否持续的底层条件，恢复不足会让其他判断同时失真',
};

const primaryTitleOutcomes: Record<string, string> = {
  career: '可验收结果',
  study: '可检验成果',
  wealth: '闭合记录',
  relationship: '一致结论',
  travel: '可执行行程',
  wellbeing: '稳定承载',
};

const periodPrimaryReasons: Record<FortunePeriod, Record<string, string>> = {
  today: {
    career: '工作能否顺势，可以由当天任务是否同时具备负责人、交付物和验收口径直接验证，忙碌本身不算成果。',
    study: '当天学习的有效信号不是阅读时长，而是能否复述、练习并留下一个可检查的输出。',
    wealth: '当天钱款的可用性取决于金额、责任与付款节点能否一次对齐，记录闭合后才有继续空间。',
    relationship: '当天沟通的价值在于消除一处信息差，让双方基于同一事实决定下一步。',
    travel: '当天出行只有在路线、时间余量和返程方案同时成立时才能落地，缺项可以在出发前修正。',
    wellbeing: '当天身心状态会直接改变判断力与持续时间，睡眠、食欲和专注度比短时兴奋更能说明承受量。',
  },
  month: {
    career: '本月工作要看多次任务能否沿用同一责任与验收口径；口径稳定，阶段投入才会累积成可交付结果。',
    study: '本月学习适合用多次复述、练习和输出观察知识是否真正连起来，单次高投入不能代表掌握。',
    wealth: '本月钱款要把多笔收支、合作责任和付款节点放在同一张记录里看，才能判断现金流是否可承受。',
    relationship: '本月沟通要观察同一分歧是否逐步减少、共识能否在后续行动中保持，单次谈顺不等于问题结束。',
    travel: '本月出行适合合并同方向安排，并比较多次行程的延误与返程余量，找出真正稳定的路线节奏。',
    wellbeing: '本月身心状态要看睡眠、进食与专注是否连续恢复；偶尔精神好不能抵消持续透支。',
  },
  year: {
    career: '全年工作价值来自可重复的责任—交付—验收链条，只有多阶段都能闭环，投入才会沉淀成稳定成果。',
    study: '全年学习要形成可迁移的理解与输出方法，课程数量和资料规模不能替代长期掌握。',
    wealth: '全年钱款要同时看预算、固定成本与长期承诺，单笔收益不能替代对现金流和责任期限的判断。',
    relationship: '全年沟通重点是建立可重复的事实确认和分歧处理方式，让长期行动不再反复更换前提。',
    travel: '全年出行要从多次安排中识别稳定的路线、时间余量和返程条件，减少同类延误反复发生。',
    wellbeing: '全年身心状态决定其他计划能否持续，稳定作息与恢复规律比短期高强度更能支撑长期安排。',
  },
};

const periodRiskReasons: Record<FortunePeriod, Record<string, string>> = {
  today: {
    career: '当天工作风险集中在责任交接与验收口径临时变化，前一步看似完成，后续环节仍可能无人接收。',
    study: '当天学习最容易被任务切换打断连续注意力，读过内容如果不能复述或应用，就不算真正掌握。',
    wealth: '当天钱款风险会同时落到现金流和合作责任，金额或节点的一处误差就可能延续到后续结算。',
    relationship: '当天沟通一旦缺少共同理解，语气和猜测会让双方用不同前提继续行动。',
    travel: '当天出行受天气、交通和时间链条共同影响，一处延误会直接压缩后续行程。',
    wellbeing: '当天状态是其他安排的承载条件，判断失真会让所有计划在同一时段同时超量。',
  },
  month: {
    career: '本月若责任交接和验收口径反复变化，多个任务会在后续环节持续排队，返工不再是单次事件。',
    study: '本月频繁切换会持续消耗连续注意力，资料越积越多，真正掌握的内容反而难以形成。',
    wealth: '本月金额、责任或付款节点若多次偏差，会累积成现金流压力，并把问题带到后续结算。',
    relationship: '本月同一信息若反复产生不同理解，双方会持续在不同前提上行动，分歧难以自然消失。',
    travel: '本月若多次压缩转场与返程余量，时间链条中的小延误会持续挤占后续行程。',
    wellbeing: '本月恢复不足会逐步削弱承载条件，最终让所有计划一起降速，而不是只影响某一天。',
  },
  year: {
    career: '全年责任交接若没有稳定规则，后续环节会反复等待和返工，单次交付顺利也无法抵消结构问题。',
    study: '全年若长期缺少连续注意力与输出检验，投入会停留在资料规模，难以形成真正掌握。',
    wealth: '全年现金流与长期责任相互牵连，一处条款或期限误判可能跨阶段延续到后续结算。',
    relationship: '全年缺少共同理解时，同类分歧会不断换场景重现，长期行动始终建立在不同前提上。',
    travel: '全年行程若持续忽略时间链条与返程余量，同类延误会反复挤压后续行程和其他安排。',
    wellbeing: '全年恢复规律一旦失稳，承载条件会持续下降，使所有计划同时面临减量或中断。',
  },
};

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

  const { bestAnalysis, cautionAnalysis } = chooseJudgmentAnalyses(analyses, primary, caution, isCurrentPeriod);
  const bestWindow = bestAnalysis ? formatAnalysisWindow(bestAnalysis, period) : '';
  const cautionWindow = cautionAnalysis ? formatAnalysisWindow(cautionAnalysis, period) : '';
  const personalInsight = buildPersonalJudgmentInsight(aggregates, primary, caution, personal, period);
  const primaryReason = periodPrimaryReasons[period][primary.category.key]
    || primary.evaluation.definition.masterReason;
  const periodRiskReason = periodRiskReasons[period][caution.category.key];
  const cautionReason = periodRiskReason
    ? `${caution.category.label}方面，${periodRiskReason}`
    : caution.evaluation.definition.masterRiskReason.replace(/^它/, caution.category.label);
  const hasCaution = caution.cautiousCount > 0
    && caution.category.key !== primary.category.key
    && Boolean(cautionAnalysis);
  const primaryGuidance = categoryActionGuidance(primary.evaluation.definition, period);
  const cautionGuidance = categoryActionGuidance(caution.evaluation.definition, period);
  const copy = renderFortuneReading(posture, {
    lead: fortunePeriodLead(period, isCurrentPeriod),
    primaryLabel: primary.category.label,
    primaryShortLabel: primary.evaluation.definition.shortLabel,
    primaryOutcome: primaryTitleOutcomes[primary.category.key] || '明确结果',
    periodUnit: period === 'today' ? '时段' : period === 'month' ? '日期' : '阶段',
    secondaryRole: secondarySummaryRoles[secondary.category.key]
      || `${secondary.category.label}负责承接主线结果，前序条件变化会直接带来返工`,
    cautionLabel: hasCaution ? caution.category.label : '',
    bestWindow,
    cautionWindow,
    primaryAction: primaryGuidance.action,
    primaryBoundary: primaryGuidance.boundary,
    cautionAction: cautionGuidance.cautionAction,
    primaryReason,
    cautionReason: hasCaution ? cautionReason : '',
    mixed,
  }, seed);
  return { posture, primary, secondary, caution, bestAnalysis, cautionAnalysis, personalInsight, mixed, copy };
}

function categoryDistributionEvidence(aggregate: CategoryAggregate, period: FortunePeriod) {
  const unit = period === 'today' ? '双小时时段' : period === 'month' ? '日期' : '节气阶段';
  const measure = period === 'month' ? '天' : '段';
  const neutralCount = Math.max(0, aggregate.sampleCount - aggregate.favorableCount - aggregate.cautiousCount);
  return `${period === 'today' ? '当天' : period === 'month' ? '整月' : '全年'}${aggregate.sampleCount}个${unit}里，${aggregate.category.label}有${aggregate.favorableCount}${measure}顺势、${aggregate.cautiousCount}${measure}需要收紧，其余${neutralCount}${measure}平稳。`;
}

const topicEvidenceChecks: Record<string, string> = {
  career: '任务能否被明确接手，完成内容能否按同一标准验收',
  study: '输入能否被自己讲清，并在练习或输出中正确应用',
  wealth: '收支是否留有完整凭证，合作义务能否按约定节点结清',
  relationship: '双方是否在同一事实基础上处理同一分歧',
  travel: '出发、转场和回程能否在预留时间内完成',
  wellbeing: '休息后注意力与食欲是否持续回升，而不是短时兴奋',
};

const secondaryInteractionEffects: Record<string, string> = {
  career: '工作交接若失效，主线形成的结果会停在无人接收或无法验收的环节',
  study: '学习若不能沉淀成方法，同类问题下一次仍要重新判断，主线经验无法累积',
  wealth: '钱款边界若不闭合，主线选择会继续变成新增成本、付款压力或合作责任',
  relationship: '沟通若没有对齐事实，主线下一步会建立在不同前提上，执行越快返工越多',
  travel: '出行时间链若失守，主线安排会被转场和返程压缩，原有次序也会随之改变',
  wellbeing: '状态若没有恢复，主线所需的判断力与持续时间会同时下降，可用窗口也会被高估',
};

function primaryComparisonEvidence(judgment: FortuneMasterJudgment, period: FortunePeriod) {
  const primary = judgment.primary;
  const secondary = judgment.secondary;
  const difference = primary.favorableCount - primary.cautiousCount;
  const neutralCount = Math.max(0, primary.sampleCount - primary.favorableCount - primary.cautiousCount);
  const scoreGap = primary.evaluation.score - secondary.evaluation.score;
  const measure = period === 'month' ? '天' : '段';
  const windowType = period === 'today' ? '时段' : period === 'month' ? '日期' : '阶段';
  const distribution = difference >= 3
    ? `${primary.evaluation.definition.shortLabel}的优势跨过多个${windowType}，不是单点偶发，可把真正有利的窗口集中用于本期主线。`
    : difference > 0
      ? `${primary.evaluation.definition.shortLabel}只在部分${windowType}占优，${neutralCount}${measure}平稳窗口应维持正常负荷，不能跟随顺势窗口一并加量。`
      : difference === 0
        ? `${primary.evaluation.definition.shortLabel}没有净优势，${neutralCount}${measure}平稳窗口更适合维持正常负荷并逐步验证，不适合追求一次突破。`
        : `${primary.evaluation.definition.shortLabel}当前更适合纠偏而非加量；可用之处是问题边界已经显现，可以先完成一次可验证的修正。`;
  const primaryCheck = topicEvidenceChecks[primary.category.key] || `${primary.category.label}是否形成明确结果`;
  const secondaryCheck = topicEvidenceChecks[secondary.category.key] || `${secondary.category.label}是否保持稳定`;
  const interaction = secondaryInteractionEffects[secondary.category.key]
    || `${secondary.category.label}一旦失守，${primary.category.label}形成的结果也会失去后续承接`;
  const comparison = scoreGap >= .38
    ? `${primary.evaluation.definition.shortLabel}的支持更集中，主要看${primaryCheck}；${secondary.evaluation.definition.shortLabel}的信号较分散，仍要观察${secondaryCheck}。${interaction}。`
    : scoreGap >= .14
      ? `${primary.evaluation.definition.shortLabel}只略稳于${secondary.evaluation.definition.shortLabel}；前者用${primaryCheck}判断，后者用${secondaryCheck}判断。${interaction}，两项检查都通过后才适合继续加量。`
      : `${primary.evaluation.definition.shortLabel}与${secondary.evaluation.definition.shortLabel}接近；前者用${primaryCheck}判断，后者用${secondaryCheck}判断。${interaction}，不能只凭${primary.evaluation.definition.shortLabel}一项顺势就扩大安排。`;
  return `${distribution}${comparison}`;
}

const topicRiskNodes: Record<string, string> = {
  career: '责任交接和验收口径',
  study: '连续注意力和输出检验',
  wealth: '金额、责任和付款节点',
  relationship: '共同事实和承诺边界',
  travel: '路线、转场和返程余量',
  wellbeing: '睡眠、进食和专注恢复',
};

function cautionDistributionMeaning(aggregate: CategoryAggregate, period: FortunePeriod) {
  const difference = aggregate.favorableCount - aggregate.cautiousCount;
  const shortLabel = aggregate.evaluation.definition.shortLabel;
  const riskNode = topicRiskNodes[aggregate.category.key] || '关键执行条件';
  const windowType = period === 'today' ? '时段' : period === 'month' ? '日期' : '阶段';
  if (difference > 0) {
    return `${shortLabel}的风险集中在${riskNode}，这一环节若落在前后衔接处，会直接中断已有进展，不能被总体偏顺抵消。`;
  }
  if (difference === 0) {
    const check = topicEvidenceChecks[aggregate.category.key] || `${aggregate.category.label}是否形成明确结果`;
    return `${shortLabel}没有稳定优势，${check}需要在每次安排后按实际结果重新验证。`;
  }
  return `${riskNode}在多个${windowType}反复失守，应按持续性风险处理，不能归为一次偶发。`;
}

function cautionConsequence(caution: CategoryAggregate) {
  const consequences: Record<string, string> = {
    career: '责任或验收口径一旦变化，前序任务会等待交接，已经完成的内容也可能重新返工。',
    study: '注意力被切碎后，资料会持续增加，复述、练习和输出却难以完成。',
    wealth: '金额或责任未闭合，会继续演变为补单、追款、重复核算或后续责任争议。',
    relationship: '共同事实没有建立，同一件事就会反复解释，后续行动仍基于不同前提。',
    travel: '时间余量被压缩后，转场、误点和后续事项会形成连锁延误。',
    wellbeing: '承受量被高估时，短时仍能推进，随后多项安排会一起降速或返工。',
  };
  return consequences[caution.category.key] || `${caution.category.label}的条件未确认前，相关安排容易反复。`;
}

function opportunityReasonFromJudgment(judgment: FortuneMasterJudgment, period: FortunePeriod) {
  return `${categoryDistributionEvidence(judgment.primary, period)}${primaryComparisonEvidence(judgment, period)}`;
}

function cautionReasonFromJudgment(judgment: FortuneMasterJudgment, period: FortunePeriod) {
  return `${categoryDistributionEvidence(judgment.caution, period)}${cautionDistributionMeaning(judgment.caution, period)}${cautionConsequence(judgment.caution)}`;
}

const primaryMilestones: Record<string, string> = {
  career: '负责人、交付标准和下一步已经明确',
  study: '笔记或练习已经形成可检验的成果',
  wealth: '金额、责任和付款节点已经对齐',
  relationship: '事实、分歧和下一步已经形成共识',
  travel: '路线、时间余量和备选方案已经确定',
  wellbeing: '完整休息后注意力确实恢复',
};

function secondaryReasonFromJudgment(judgment: FortuneMasterJudgment, period: FortunePeriod) {
  const secondary = judgment.secondary;
  const primary = judgment.primary.evaluation.definition;
  const roles: Record<string, string> = {
    career: `工作需要把${primary.shortLabel}产生的结果转成责任与交付；主线结果仍在变化时提前排期，负责人和验收口径都可能重写。`,
    study: `学习依赖连续注意力；${primary.shortLabel}尚未闭环时频繁切换，会让阅读和练习难以形成同一条理解链。`,
    wealth: `钱款条件通常承接${primary.shortLabel}形成的费用与责任；前序结果未定，报价和付款节点也容易随之失效。`,
    relationship: primary.key === 'wellbeing'
      ? '沟通同时依赖倾听、判断和情绪余量；状态没有恢复时，更容易漏听事实并把疲劳误当成立场。'
      : `沟通用于消除${primary.shortLabel}推进后留下的信息差；主线事实尚未确定时开口，容易把暂时判断说成最终结论。`,
    travel: `路线与时间要承接${primary.shortLabel}的地点和结束节点；前序安排仍在变化时排程，转场与返程都要重复计算。`,
    wellbeing: `身心状态不是${primary.shortLabel}之后才处理的第二项，而是决定注意力、判断力和持续时间的同步基础。`,
  };
  return `${categoryDistributionEvidence(secondary, period)}${roles[secondary.category.key] || `${secondary.category.label}承接${primary.shortLabel}的实际结果，前序条件变化会直接造成返工。`}`;
}

function stripPriorityPrefix(value: string) {
  return value.replace(/^(?:先|优先)/, '');
}

function supportActionFromJudgment(judgment: FortuneMasterJudgment, period: FortunePeriod) {
  const primary = judgment.primary.evaluation.definition;
  const secondary = judgment.secondary.evaluation.definition;
  if (period !== 'today') {
    const guidance = categoryActionGuidance(secondary, period);
    if (secondary.key === 'wellbeing') {
      return `与${primary.shortLabel}并行，${guidance.action}；${guidance.boundary}。`;
    }
    const milestone = primaryMilestones[primary.key] || `${primary.shortLabel}得到明确结果`;
    return `等${milestone}后，${guidance.action}；${guidance.boundary}。`;
  }
  const action = stripPriorityPrefix(secondary.action);
  if (secondary.key === 'wellbeing') {
    return `与${primary.shortLabel}并行，${action}；用休息后的注意力判断实际承受量。`;
  }
  const preparation = stripPriorityPrefix(secondary.prepare);
  if (primary.key === 'wellbeing') {
    const preparationLead = secondary.key === 'relationship'
      ? `沟通时${preparation}`
      : secondary.key === 'travel'
        ? `出发前${preparation}`
        : `开始前${preparation}`;
    return `先留出一段完整休息；注意力恢复后，${action}；${preparationLead}。`;
  }
  const milestone = primaryMilestones[primary.key] || `${primary.shortLabel}得到明确结果`;
  const preparationLead = secondary.key === 'relationship'
    ? `沟通时${preparation}`
    : secondary.key === 'travel'
      ? `出发前${preparation}`
      : `开始前${preparation}`;
  return `等${milestone}后，${action}；${preparationLead}。`;
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

  const hasExplicitCaution = judgment.caution.cautiousCount > 0
    && judgment.caution.category.key !== judgment.primary.category.key
    && Boolean(judgment.cautionAnalysis);
  if (hasExplicitCaution) {
    insights.push({
      key: 'caution',
      sourceKey: judgment.caution.category.key,
      label: judgment.caution.evaluation.tone === 'cautious' ? '牵制所在' : '必要检查',
      title: `${judgment.caution.category.label}为何需要留意`,
      detail: cautionReasonFromJudgment(judgment, period),
      tone: judgment.caution.evaluation.tone === 'cautious' ? 'cautious' : 'balanced',
    });
  } else if (judgment.secondary.category.key !== judgment.primary.category.key) {
    const secondaryIsWellbeing = judgment.secondary.category.key === 'wellbeing';
    insights.push({
      key: 'secondary',
      sourceKey: judgment.secondary.category.key,
      label: secondaryIsWellbeing ? '同步基础' : '承接关系',
      title: secondaryIsWellbeing
        ? '身心状态为何需要同步照顾'
        : `${judgment.secondary.category.label}为何排在主线之后`,
      detail: secondaryReasonFromJudgment(judgment, period),
      tone: judgment.secondary.category.tone,
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
  开门: '启动、会面与公开事务较易展开',
  休门: '协商、休整与关系维护较顺',
  生门: '资源与后续承接条件较足',
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
  九天: '主动展开与扩大视野的动力较强',
  六合: '协作、协调与形成共识的条件较好',
  太阴: '周密筹划与安静准备较有利',
  值符: '主导性较强，适合抓住主线',
};

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

function directionSignalConclusion(
  period: 'month' | 'year',
  primaryCount: number,
  oppositeCount: number,
  totalCount: number,
  favorable: boolean,
) {
  const unit = period === 'year' ? '阶段' : '日期';
  const ratio = totalCount ? primaryCount / totalCount : 0;
  const clearLead = primaryCount - oppositeCount >= Math.max(2, Math.ceil(totalCount * .12));
  if (ratio >= .48 && clearLead) {
    return favorable
      ? `支持明显多于回避，是${period === 'year' ? '全年' : '本月'}较稳定的方向线索`
      : `限制明显多于支持，是${period === 'year' ? '全年' : '本月'}需要持续留意的方向`;
  }
  return favorable
    ? `支持虽多于回避，但只在部分${unit}成立，不宜当成固定方位`
    : `限制集中在部分${unit}，其他${unit}仍要结合具体路线与事项判断`;
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

const directionFocusUses: Record<string, string> = {
  career: '见客户、交接或需要现场处理的工作',
  study: '上课、考试、访学或选择学习地点',
  wealth: '对账、办款或现场商谈责任明确的合作',
  relationship: '会面、拜访或当面确认共同约定',
  travel: '路线、余量和返程方案已经确认的必要行程',
  wellbeing: '休息、就诊、散步或低强度恢复活动',
};

function directionFocusUse(focus: TopicDefinition) {
  return directionFocusUses[focus.key] || `${focus.shortLabel}相关外出`;
}

function buildSingleDirections(chart: QimenData, personal: PersonalContext | null, focus: TopicDefinition) {
  // 不改写核心库的吉方与避方资格，只在已经成立的候选内部做个人化排序。
  const focusUse = directionFocusUse(focus);
  const goodDirections = [...(chart.directions?.goodDirections || [])]
    .sort((left, right) => personalDirectionScore(chart, right.gong, personal) - personalDirectionScore(chart, left.gong, personal))
    .slice(0, 2).map((item) => ({
    direction: item.direction,
    detail: `今天${item.direction}更适合作为主动行程的第一段方向，当前主线是${focus.shortLabel}，尤其用于${focusUse}。只有路线时间、成本和安全条件接近时才优先，不必为了方位绕路；判断依据：${summarizeDirectionReasons(item.reasons) || '多项盘面信号共同支持'}。`,
  }));
  const avoidDirections = [...(chart.directions?.avoidDirections || [])]
    .sort((left, right) => personalDirectionScore(chart, left.gong, personal) - personalDirectionScore(chart, right.gong, personal))
    .slice(0, 2).map((item) => ({
    direction: item.direction,
    detail: `今天${item.direction}不适合主动安排与${focus.shortLabel}相关且时间紧、变数多的行程。必须前往时，先确认路线、返程和备选方案；判断依据：${summarizeDirectionReasons(item.reasons) || '多项盘面限制共同出现'}。`,
  }));
  return { goodDirections, avoidDirections };
}

function buildPeriodDirections(
  analyses: ChartAnalysis[],
  period: 'month' | 'year',
  personal: PersonalContext | null,
  focus: TopicDefinition,
) {
  const counts = new Map<string, {
    good: number;
    avoid: number;
    personal: number;
    goodReasons: Map<string, number>;
    avoidReasons: Map<string, number>;
  }>();
  const createCount = () => ({
    good: 0,
    avoid: 0,
    personal: 0,
    goodReasons: new Map<string, number>(),
    avoidReasons: new Map<string, number>(),
  });
  analyses.forEach(({ chart }) => {
    chart.directions?.goodDirections.forEach((item) => {
      const value = counts.get(item.direction) || createCount();
      value.good += 1;
      value.personal += personalDirectionScore(chart, item.gong, personal);
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
  const countUnit = period === 'year' ? '段' : '天';
  const sampleUnit = period === 'year' ? '节气阶段' : '日期';
  const focusUse = directionFocusUse(focus);
  const goodDirections = [...counts.entries()]
    .filter(([, value]) => value.good >= goodThreshold && value.good > value.avoid)
    .sort((left, right) => right[1].good - left[1].good || right[1].personal - left[1].personal || left[1].avoid - right[1].avoid)
    .slice(0, 2)
    .map(([direction, value]) => ({
      direction,
      detail: `${periodLabel}${analyses.length}个${sampleUnit}里，${direction}有${value.good}${countUnit}得到支持、${value.avoid}${countUnit}需要回避，${directionSignalConclusion(period, value.good, value.avoid, analyses.length, true)}。${period === 'year'
        ? `当地点的交通、预算和现实机会接近时，可把它作为全年${focus.shortLabel}相关地点的辅助筛选，主要用于${focusUse}；不应替代实际机会与成本判断。`
        : `当路线的时间、成本和安全条件接近时，可优先用于本月${focusUse}；普通通勤或临时小事不必迁就方位。`}判断依据主要是：${summarizeDirectionReasons(mostFrequent(value.goodReasons)) || '多项盘面信号共同支持'}。`,
    }));
  const avoidDirections = [...counts.entries()]
    .filter(([, value]) => value.avoid >= avoidThreshold && value.avoid > value.good)
    .sort((left, right) => right[1].avoid - left[1].avoid || left[1].personal - right[1].personal || left[1].good - right[1].good)
    .slice(0, 2)
    .map(([direction, value]) => ({
      direction,
      detail: `${periodLabel}${analyses.length}个${sampleUnit}里，${direction}有${value.avoid}${countUnit}表现受限、${value.good}${countUnit}得到支持，${directionSignalConclusion(period, value.avoid, value.good, analyses.length, false)}。${period === 'year'
        ? `不宜把它设为全年${focus.shortLabel}相关地点的固定偏好；必须前往时，先核对交通、返程和替代地点。`
        : `不适合主动把本月${focus.shortLabel}相关且时间紧、协调成本高的事项反复安排在该方向；必须前往时，提前确认路线、返程并留出改线余量。`}判断依据主要是：${summarizeDirectionReasons(mostFrequent(value.avoidReasons)) || '多项盘面限制共同出现'}。`,
    }));
  return { goodDirections, avoidDirections };
}

function buildWindowCoverage(
  period: FortunePeriod,
  focusCategories: CategoryEvaluation[],
  cautiousCategory?: CategoryEvaluation,
  favorable = false,
  usage = new Map<string, number[]>(),
  seed = 0,
) {
  const takePhrase = (item: CategoryEvaluation, kind: keyof PeriodWindowGuidance, offset: number) => {
    const candidates = periodWindowGuidance[period][item.definition.key]?.[kind] || [];
    if (!candidates.length) return kind === 'use' ? item.definition.action : item.definition.cautionAction;
    const usageKey = `${period}|${item.definition.key}|${kind}`;
    const counts = usage.get(usageKey) || candidates.map(() => 0);
    const leastUsed = Math.min(...counts);
    let selectedIndex = (seed + offset) % candidates.length;
    for (let index = 0; index < candidates.length; index += 1) {
      const candidateIndex = (seed + offset + index) % candidates.length;
      if (counts[candidateIndex] === leastUsed) {
        selectedIndex = candidateIndex;
        break;
      }
    }
    counts[selectedIndex] += 1;
    usage.set(usageKey, counts);
    return candidates[selectedIndex];
  };
  const focusText = focusCategories.map((item, index) => {
    return `${item.definition.shortLabel}·${takePhrase(item, 'use', index)}`;
  });
  const cautionText = cautiousCategory
    ? `${cautiousCategory.definition.shortLabel}需复核：${takePhrase(cautiousCategory, 'caution', focusCategories.length)}`
    : '';
  if (focusText.length) {
    return `${favorable ? '适合' : '可用于'}：${focusText.join('；')}${cautionText ? `；${cautionText}` : ''}`;
  }
  if (cautionText) return `只${cautionText}，暂不新增安排`;
  if (period === 'today') return '只整理当前已有事项：补齐记录与收尾结果';
  return period === 'month'
    ? '只整理本月已有事项：补齐记录、责任与收尾结果'
    : '只复盘全年已有安排：保留可复用规则，停止长期无结果的投入';
}

function buildTimeWindows(
  now: Date,
  period: FortunePeriod,
  analyses: ChartAnalysis[],
  restrictTodayHours = true,
  preferredAnalysis?: ChartAnalysis,
  primaryKey?: string,
  cautionAnalysis?: ChartAnalysis,
  cautionKey?: string,
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
  const caution = cautionAnalysis
    ? ranked.find((analysis) => analysis.date.getTime() === cautionAnalysis.date.getTime())
    : undefined;
  const selected: ChartAnalysis[] = [];
  const addUnique = (analysis?: ChartAnalysis) => {
    if (analysis && !selected.some((item) => item.date.getTime() === analysis.date.getTime())) selected.push(analysis);
  };
  addUnique(preferred);
  const reservesCautionSlot = caution && caution.date.getTime() !== preferred?.date.getTime();
  usable.forEach((analysis) => {
    if (selected.length < (reservesCautionSlot ? 2 : 3)
      && analysis.date.getTime() !== caution?.date.getTime()) addUnique(analysis);
  });
  addUnique(caution);
  if (selected.length < 3) usable.forEach((analysis) => {
    if (selected.length < 3) addUnique(analysis);
  });
  const periodWindowUsage = new Map<string, number[]>();
  return selected
    .sort((left, right) => left.date.getTime() - right.date.getTime())
    .map((analysis, analysisIndex) => {
      const rankedCategories = [...analysis.categories].sort((left, right) => categorySignalScore(right) - categorySignalScore(left));
      const favorableCategories = rankedCategories.filter((item) => item.tone === 'favorable');
      const balancedCategories = rankedCategories.filter((item) => item.tone === 'balanced');
      const cautionCategory = rankedCategories.find((item) => item.definition.key === cautionKey && item.tone === 'cautious');
      const cautiousCategory = cautionCategory || [...rankedCategories].reverse().find((item) => item.tone === 'cautious');
      const usableCategories = favorableCategories.length ? favorableCategories : balancedCategories;
      const primaryCategory = usableCategories.find((item) => item.definition.key === primaryKey);
      const focusCategories = primaryCategory
        ? [primaryCategory, ...usableCategories.filter((item) => item.definition.key !== primaryKey)].slice(0, 2)
        : usableCategories.slice(0, 2);
      const coverage = buildWindowCoverage(
        period,
        focusCategories,
        cautiousCategory,
        favorableCategories.length > 0,
        periodWindowUsage,
        analysis.date.getMonth() * 31 + analysis.date.getDate() + analysisIndex,
      );
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
  scale: TrendScale,
) {
  if (!definition) return '';
  const candidates = scale === 'day'
    ? definition[phrases]
    : scaledTrendPhrases[scale][definition.key]?.[phrases === 'trendActions' ? 'actions' : 'guards'] || definition[phrases];
  if (!candidates.length) return '';
  const phraseUsage = usage.get(definition.key) || candidates.map(() => 0);
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
  return candidates[selectedIndex];
}

function continuationAction(action: string) {
  return action.replace(/^先/, '');
}

function trendSummary(analyses: ChartAnalysis[], usage: TrendPhraseUsage, scale: TrendScale) {
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
  const primaryScore = rankedTopics[0]?.score || 0;
  const secondaryScore = rankedTopics[1]?.score || 0;
  const secondary = rankedTopics[1]?.definition;
  const primaryAction = takeTrendPhrase(primary, 'trendActions', usage.actions, phraseIndex, scale);
  const secondaryAction = takeTrendPhrase(secondary, 'trendActions', usage.actions, phraseIndex + 1, scale);
  const weakestGuard = takeTrendPhrase(weakest, 'trendGuards', usage.guards, phraseIndex, scale);
  const continuation = secondaryAction ? continuationAction(secondaryAction) : '';
  const primaryLabel = primary?.shortLabel || '主线';
  const secondaryLabel = secondary?.shortLabel || '后续';
  const weakestLabel = weakest?.shortLabel || '风险';
  const useSecondary = Boolean(continuation) && secondaryScore >= -.05;
  const continuationText = useSecondary
    ? secondary?.key === 'wellbeing'
      ? `同步照顾${secondaryLabel}：${continuation}`
      : `${primaryScore - secondaryScore <= .18 ? '同时推进' : '有余量再处理'}${secondaryLabel}：${continuation}`
    : weakestGuard
      ? `留意${weakestLabel}：${weakestGuard}`
      : '';
  const status = tone === 'cautious'
    ? `${weakestLabel}先收紧，${primaryLabel}仍可保留`
    : secondary && secondary.key !== primary?.key
      ? `${primaryLabel}${tone === 'favorable' ? '较顺' : '优先'}，${secondaryLabel}${primaryScore - secondaryScore <= .18 ? '可并行' : '可承接'}`
      : `${primaryLabel}${tone === 'favorable' ? '较顺' : '优先'}`;
  return {
    tone,
    status,
    focus: tone === 'cautious'
      ? [
          `${weakestLabel}先查：${weakestGuard || '先减少变量，再决定是否继续'}`,
          primaryAction ? `${primaryLabel}保留：${primaryAction}` : '',
        ].filter(Boolean).join('；')
      : primary
        ? `${primaryLabel}：${primaryAction}${continuationText ? `；${continuationText}` : ''}`
        : '主线：先完成已经明确的一件事',
  };
}

function buildSevenDayTrend(now: Date, personal: PersonalContext | null): DailyFortuneTrendItem[] {
  const start = createReferenceDate(now);
  const usage = createTrendPhraseUsage();
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(start, index + 1);
    const analysis = analyzeChart(date, 'day', personal);
    const trend = trendSummary([analysis], usage, 'day');
    const label = index === 0
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
  const monthStageLabels = ['月初', '上旬', '月中', '下旬', '月底'];
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
      label: currentWeek ? '本周' : monthStageLabels[week] || `第${week + 1}段`,
      dateLabel: `${startDay}—${endDay}日`,
      ...trendSummary(items, usage, 'week'),
    };
  });
}

function buildYearTrend(now: Date, personal: PersonalContext | null, runtimeNow?: Date): DailyFortuneTrendItem[] {
  const usage = createTrendPhraseUsage();
  const startMonth = runtimeNow?.getMonth() || 0;
  return Array.from({ length: 12 - startMonth }, (_, index) => {
    const month = startMonth + index;
    const date = new Date(now.getFullYear(), month, 15, 12, 0, 0, 0);
    const trend = trendSummary([analyzeChart(date, 'month', personal)], usage, 'month');
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

function directionFallbackNote(period: FortunePeriod) {
  if (period === 'today') {
    return '当天各方向的支持与限制互相抵消，没有一个方向值得为它改变路线。按距离、交通和事项条件安排；确需择向时，再结合实际出发时段判断。';
  }
  if (period === 'month') {
    return '本月各日期的方位偏好变化较大，没有一个方向在足够多日期持续占优。行程优先按距离、交通和事项条件安排；确需择向时，再看具体出发当天。';
  }
  return '全年各节气阶段的方位偏好变化较大，没有一个方向稳定到适合作为固定偏好。长期出行、拜访或地点选择仍以交通、预算和现实机会为先。';
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
  const usesPersonalElement = Boolean(personal?.primaryFavorableElement && palaceAlignment <= 0);
  const element = usesPersonalElement && personal?.primaryFavorableElement
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
  const focusName = focus.label;
  const colorNames = colors.map((color) => color.name).join('、');
  const elementBasis = usesPersonalElement
    ? `个人命盘较能承接${element}`
    : `本期${focusName}主线所落宫位偏${element}`;
  const referenceTargets: Record<string, string> = {
    career: '交付清单',
    study: '学习材料',
    wealth: '账目或付款提醒',
    relationship: '沟通备忘',
    travel: '行程与物品清单',
    wellbeing: '休息与饮食提醒',
  };
  const periodUse = period === 'today' ? '今天' : period === 'month' ? '本月' : '今年';
  const colorUse = `可任选一种标记${periodUse}的${referenceTargets[focus.key] || `${focusLabel}事项`}`;
  const guidance = referenceGuidance(focus, period);
  const itemNote = (period === 'today' ? item.note : guidance.itemUse).replace(/[。；]+$/, '');
  return {
    element,
    colors,
    numbers,
    symbolicNote: `${elementBasis}，偏向${elementMeanings[element]}。${colorNames}${colorUse}；看到标记时，检查${guidance.check}。`,
    direction,
    directionNote: goodDirections.length
      ? goodDirections[0].detail
      : directionFallbackNote(period),
    item: item.name,
    itemSymbol: item.symbol,
    itemNote: `它被选作${focusLabel}提醒物：${itemNote}。`,
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
  const directions = period === 'today'
    ? buildSingleDirections(baseAnalysis.chart, personal, judgment.primary.evaluation.definition)
    : buildPeriodDirections(sampleAnalyses, period, personal, judgment.primary.evaluation.definition);
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
    judgment.primary.evaluation.definition.key,
    judgment.cautionAnalysis,
    judgment.cautionAnalysis ? judgment.caution.evaluation.definition.key : undefined,
  );
  aggregates.forEach((aggregate) => {
    aggregate.category = {
      ...aggregate.category,
      status: categoryStatusFromJudgment(aggregate, judgment),
      detail: categoryDetailFromJudgment(aggregate, judgment, period, timeWindows),
      basis: categoryBasisFromJudgment(aggregate, judgment, period, timeWindows),
    };
  });
  const title = judgment.copy.title;
  const evidenceInsights = buildEvidenceInsights(judgment, period);
  const summary = judgment.copy.summary;
  const readyAggregate = judgment.primary;
  const hasExplicitCaution = judgment.caution.cautiousCount > 0
    && judgment.caution.category.key !== judgment.primary.category.key
    && Boolean(judgment.cautionAnalysis);
  const categoryRoleKeys = [
    judgment.primary.category.key,
    hasExplicitCaution ? judgment.caution.category.key : judgment.secondary.category.key,
    judgment.secondary.category.key,
  ].filter((key, index, items) => items.indexOf(key) === index);
  const categoryRoleOrder = new Map(categoryRoleKeys.map((key, index) => [key, index]));
  const categories = [...aggregates]
    .sort((left, right) => {
      const leftRole = categoryRoleOrder.get(left.category.key);
      const rightRole = categoryRoleOrder.get(right.category.key);
      if (leftRole !== undefined || rightRole !== undefined) {
        return (leftRole ?? Number.MAX_SAFE_INTEGER) - (rightRole ?? Number.MAX_SAFE_INTEGER);
      }
      return categorySignalScore(right.evaluation) - categorySignalScore(left.evaluation);
    })
    .map((item) => item.category);
  const readySource = readyAggregate?.category || categories[0];
  const followUpSource = hasExplicitCaution ? judgment.caution.category : judgment.secondary.category;
  const actionTips: DailyFortuneActionTip[] = [
    {
      sourceKey: readySource?.key || 'general',
      label: `优先${judgment.primary.evaluation.definition.shortLabel}`,
      text: judgment.copy.opportunity,
      tone: 'positive',
    },
    {
      sourceKey: followUpSource?.key || 'general',
      label: hasExplicitCaution
        ? `留意${judgment.caution.evaluation.definition.shortLabel}`
        : judgment.secondary.evaluation.definition.key === 'wellbeing'
          ? `同时顾好${judgment.secondary.evaluation.definition.shortLabel}`
          : `随后${judgment.secondary.evaluation.definition.shortLabel}`,
      text: hasExplicitCaution ? judgment.copy.caution : supportActionFromJudgment(judgment, period),
      tone: hasExplicitCaution ? 'notice' : 'support',
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
        ? isCurrentMonth ? '本月关键日期' : '该月关键日期'
        : isCurrentYear ? '今年关键阶段' : '该年关键阶段',
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
    directionFallback: directions.goodDirections.length ? '' : directionFallbackNote(period),
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
