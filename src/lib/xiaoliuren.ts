import { generateXiaoliuren } from 'mingyu-core/divination/xiaoliuren';
import type { XiaoliurenData, XiaoliurenPalaceDetail } from 'mingyu-core/types';

export type XiaoliurenPalaceName = XiaoliurenPalaceDetail['name'];

export interface XiaoliurenPresentation {
  image: string;
  tagline: string;
  verdict: string;
  summary: string;
  bestFor: string;
  avoidFor: string;
  actions: Array<{ title: string; detail: string }>;
  insights: Array<{ label: string; value: string }>;
}

export interface LocalXiaoliurenReading {
  data: XiaoliurenData;
  inputValue: string;
  dateLabel: string;
  lunarLabel: string;
  ganzhiLabel: string;
  presentation: XiaoliurenPresentation;
}

export const XIAOLIUREN_PRESENTATIONS: Record<XiaoliurenPalaceName, XiaoliurenPresentation> = {
  大安: {
    image: '/xiaoliuren/da-an.webp',
    tagline: '安定守成',
    verdict: '局面偏稳，按既定方向推进更合适。',
    summary: '当前更需要守住节奏，而不是临时改变方向。已经确认、准备充分的事项可以继续落实；涉及新条件的部分，仍应先核对再扩大行动。',
    bestFor: '推进已有计划、落实共识、完成确定性较高的事项',
    avoidFor: '因一时顺利跳过核对，或突然扩大范围',
    actions: [
      { title: '先完成主线', detail: '把精力放在已经确认的关键步骤，减少临时增加的支线。' },
      { title: '确认共同理解', detail: '重要沟通结束后，再确认一次目标、分工和时间点。' },
      { title: '稳步增加投入', detail: '先看当前步骤的反馈，再决定是否继续加码。' },
    ],
    insights: [
      { label: '当前节奏', value: '稳定推进比频繁调整更有利。' },
      { label: '沟通协作', value: '已有共识可继续落实，细节仍需说清。' },
      { label: '决策方式', value: '优先采用经过验证的方案。' },
      { label: '风险边界', value: '稳定是倾向，不代表可以省略复核。' },
    ],
  },
  留连: {
    image: '/xiaoliuren/liu-lian.webp',
    tagline: '缓行复核',
    verdict: '进展可能反复，先补条件再催结果。',
    summary: '当前阻力更可能来自信息不全、等待或前置条件未完成。与其强行推动，不如先找出卡点，并给沟通和审批留出合理余量。',
    bestFor: '补资料、查遗漏、复盘卡点、处理需要等待的事项',
    avoidFor: '在信息没有变化时反复催促，或仓促作最终决定',
    actions: [
      { title: '找出真正卡点', detail: '区分是资料不全、他人未回复，还是条件本身尚未成熟。' },
      { title: '补齐前置条件', detail: '先处理会影响下一步的材料、确认和依赖关系。' },
      { title: '拆成小步验证', detail: '把大决定拆成可检查、可调整的小步骤，降低反复成本。' },
    ],
    insights: [
      { label: '当前节奏', value: '偏慢且易反复，需要预留时间。' },
      { label: '沟通协作', value: '回复可能延迟，关键事项要再次确认。' },
      { label: '决策方式', value: '等新信息出现后再定案更稳妥。' },
      { label: '风险边界', value: '警惕把等待误判为默认同意。' },
    ],
  },
  速喜: {
    image: '/xiaoliuren/su-xi.webp',
    tagline: '及时把握',
    verdict: '积极信号来得较快，适合及时回应。',
    summary: '当前更适合把已经出现的机会转成明确行动。回应可以快，但关键条件仍要确认，避免把初步进展提前当作最终结果。',
    bestFor: '及时回复、推进短期事项、确认机会并安排下一步',
    avoidFor: '只凭好消息提前承诺，或为了赶进度忽略关键细节',
    actions: [
      { title: '先回应再落实', detail: '对明确机会及时表态，并马上约定下一步和完成时间。' },
      { title: '优先短期闭环', detail: '先完成能快速形成结果的事项，让进展落到实处。' },
      { title: '核对关键条件', detail: '确认金额、范围、责任或时间等不能出错的信息。' },
    ],
    insights: [
      { label: '当前节奏', value: '窗口偏短，及时处理更容易承接进展。' },
      { label: '沟通协作', value: '消息流动较快，适合主动确认。' },
      { label: '决策方式', value: '快速回应，关键条件单独复核。' },
      { label: '风险边界', value: '初步利好不等于事项已经落定。' },
    ],
  },
  赤口: {
    image: '/xiaoliuren/chi-kou.webp',
    tagline: '少争多证',
    verdict: '沟通容易产生摩擦，先厘清事实再表达。',
    summary: '当前更要控制表达强度，避免在信息不完整时争论对错。把事实、观点和情绪分开处理，重要约定尽量留下清晰记录。',
    bestFor: '澄清误解、整理证据、书面确认、为复杂沟通做准备',
    avoidFor: '情绪化回应、公开争胜，或依赖未经核实的转述',
    actions: [
      { title: '先确认事实', detail: '回应前核对原话、时间和上下文，不根据转述直接下结论。' },
      { title: '降低表达强度', detail: '只讨论当前问题和可执行方案，避免扩大到人身判断。' },
      { title: '留下清晰记录', detail: '把重要约定、责任和变更用文字再次确认。' },
    ],
    insights: [
      { label: '当前节奏', value: '越急越容易失焦，适合先停一下再回应。' },
      { label: '沟通协作', value: '措辞和转述是主要误差来源。' },
      { label: '决策方式', value: '以可核验事实为依据，不凭情绪定案。' },
      { label: '风险边界', value: '不确定的内容不要作公开判断。' },
    ],
  },
  小吉: {
    image: '/xiaoliuren/xiao-ji.webp',
    tagline: '和合可成',
    verdict: '协作条件较好，通过配合更容易推进。',
    summary: '当前适合借助沟通、互助和资源配合解决问题。先从容易形成共识的部分开始，同时把双方责任和边界说明白。',
    bestFor: '协商合作、寻求支持、整合资源、推进共同事项',
    avoidFor: '只凭好感默认对方会配合，或忽略责任与交付边界',
    actions: [
      { title: '主动连接资源', detail: '找出能补足信息、能力或渠道的人，并提出具体需求。' },
      { title: '先做共识部分', detail: '从双方都认可的事项开始，降低合作启动成本。' },
      { title: '明确合作边界', detail: '确认各自负责什么、何时完成，以及变化时如何处理。' },
    ],
    insights: [
      { label: '当前节奏', value: '通过配合推进，比单独承担更顺畅。' },
      { label: '沟通协作', value: '适合主动商量，也容易形成共识。' },
      { label: '决策方式', value: '兼顾双方条件，先确认共同收益。' },
      { label: '风险边界', value: '口头默契不能替代明确分工。' },
    ],
  },
  空亡: {
    image: '/xiaoliuren/kong-wang.webp',
    tagline: '暂缓定案',
    verdict: '关键信息仍不充分，重要决定宜暂缓。',
    summary: '当前最需要处理的是不确定性。先核验信息来源和关键假设，为可能落空的部分准备替代方案，再决定是否投入更多。',
    bestFor: '查证信息、降低投入、准备备选方案、重新评估预期',
    avoidFor: '只凭单一信号重投入，或对尚未确认的结果作承诺',
    actions: [
      { title: '核验信息来源', detail: '区分事实、推测和口头承诺，找到可以独立确认的依据。' },
      { title: '控制当前投入', detail: '在条件明确前，避免投入难以收回的时间、资金或承诺。' },
      { title: '准备替代路径', detail: '提前设定条件未满足时的下一种选择和停止点。' },
    ],
    insights: [
      { label: '当前节奏', value: '先观察和验证，不宜急着定下结论。' },
      { label: '沟通协作', value: '对方表态需要配合实际行动验证。' },
      { label: '决策方式', value: '使用多个来源交叉核验。' },
      { label: '风险边界', value: '为落空和预期差保留退出空间。' },
    ],
  },
};

const lunarMonths = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];
const lunarDays = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十',
];

function beijingParts(date: Date) {
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || '';
  return { year: value('year'), month: value('month'), day: value('day'), hour: value('hour'), minute: value('minute') };
}

export function formatXiaoliurenInput(date = new Date()) {
  const parts = beijingParts(date);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function parseXiaoliurenInput(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error('请选择完整的起课日期和时间。');
  const [, year, month, day, hour, minute] = match;
  const timestamp = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour) - 8, Number(minute));
  const parsed = new Date(timestamp);
  if (formatXiaoliurenInput(parsed) !== value) throw new Error('起课日期或时间无效。');
  return parsed;
}

export function calculateLocalXiaoliuren(input: string | Date): LocalXiaoliurenReading {
  const date = typeof input === 'string' ? parseXiaoliurenInput(input) : input;
  if (Number.isNaN(date.getTime())) throw new Error('起课日期或时间无效。');
  const data = generateXiaoliuren({ method: 'time', customDate: date });
  const parts = beijingParts(date);
  const monthLabel = lunarMonths[data.lunarMonth - 1] || String(data.lunarMonth);
  const dayLabel = lunarDays[data.lunarDay - 1] || String(data.lunarDay);
  return {
    data,
    inputValue: formatXiaoliurenInput(date),
    dateLabel: `${parts.year}年${Number(parts.month)}月${Number(parts.day)}日`,
    lunarLabel: `农历${data.isLeapMonth ? '闰' : ''}${monthLabel}月${dayLabel} · ${data.hourLabel}`,
    ganzhiLabel: `${data.ganzhi.year}年 ${data.ganzhi.month}月 ${data.ganzhi.day}日 ${data.ganzhi.hour}时`,
    presentation: XIAOLIUREN_PRESENTATIONS[data.primary.name],
  };
}
