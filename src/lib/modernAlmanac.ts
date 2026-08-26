import { generateAlmanacSelection } from 'mingyu-core/divination/almanac';
import type { AlmanacDayCandidate } from 'mingyu-core/types';

export type ModernAlmanacTone = 'recommended' | 'cautious';
export type ModernAlmanacTheme =
  | 'routine'
  | 'work'
  | 'money'
  | 'relationship'
  | 'travel'
  | 'home'
  | 'wellbeing'
  | 'learning'
  | 'nature'
  | 'ritual'
  | 'memorial'
  | 'legal';

export interface ModernAlmanacItem {
  key: string;
  theme: ModernAlmanacTheme;
  title: string;
  detail: string;
  traditional: string[];
}

export interface ModernAlmanacRhythm {
  sourceLabel: string;
  title: string;
  detail: string;
}

export interface ModernAlmanacMoon {
  label: string;
  detail: string;
}

export interface ModernAlmanacResult {
  rhythm: ModernAlmanacRhythm;
  moon: ModernAlmanacMoon | null;
  recommended: ModernAlmanacItem[];
  cautious: ModernAlmanacItem[];
  traditionalRecommended: string[];
  traditionalCautious: string[];
}

export interface ModernAlmanacHour {
  name: string;
  range: string;
  title: string;
  detail: string;
  traditional: string;
  personalNote: string;
}

type PersonalConflictRelation = '冲' | '刑' | '害' | '破';

const directPersonalConflictRelations = new Set<PersonalConflictRelation>(['冲', '刑', '害', '破']);

interface ModernAlmanacRule {
  key: string;
  theme: ModernAlmanacTheme;
  priority: number;
  terms: string[];
  recommendedTitle: string;
  recommendedDetail: string;
  cautiousTitle: string;
  cautiousDetail: string;
}

interface RankedModernAlmanacItem extends ModernAlmanacItem {
  priority: number;
}

const modernAlmanacRules: ModernAlmanacRule[] = [
  {
    key: 'routine', theme: 'routine', priority: 110,
    terms: ['馀事勿取'],
    recommendedTitle: '按计划处理日常',
    recommendedDetail: '适合完成已经排好的小事、整理和收尾，不临时给自己增加重大任务。',
    cautiousTitle: '先处理必要事项',
    cautiousDetail: '把范围收窄到必须完成的日常，其余安排不必勉强塞进今天。',
  },
  {
    key: 'health', theme: 'wellbeing', priority: 105,
    terms: ['求医', '治病', '针灸', '经络', '探病'],
    recommendedTitle: '健康检查与照护',
    recommendedDetail: '适合预约体检、复诊、治疗或探望关怀。',
    cautiousTitle: '非紧急健康安排多确认',
    cautiousDetail: '非紧急项目可复核时间与准备事项。',
  },
  {
    key: 'legal', theme: 'legal', priority: 103,
    terms: ['词讼'],
    recommendedTitle: '整理争议与证据',
    recommendedDetail: '适合梳理事实、合同和沟通记录。',
    cautiousTitle: '争议事项避免冲动定案',
    cautiousDetail: '先保留证据、核对事实，重要法律处理交由专业人士判断。',
  },
  {
    key: 'money', theme: 'money', priority: 100,
    terms: ['交易', '立券', '纳财', '出货财', '开仓', '置产'],
    recommendedTitle: '合同与钱款',
    recommendedDetail: '适合处理签约、收付款、交易或资产安排，金额、条款和风险仍要逐项核对。',
    cautiousTitle: '大额交易先缓一步',
    cautiousDetail: '涉及合同、付款或资产决定时先复核条件，不因黄历替代财务和法律判断。',
  },
  {
    key: 'work', theme: 'work', priority: 98,
    terms: ['开市', '挂匾', '雇佣'],
    recommendedTitle: '工作启动与对外发布',
    recommendedDetail: '适合安排开业、招聘、发布或启动已经准备成熟的工作。',
    cautiousTitle: '重大启动先做检查',
    cautiousDetail: '开业、招聘或正式发布前先确认资源、人员与交付条件。',
  },
  {
    key: 'learning', theme: 'learning', priority: 94,
    terms: ['入学', '习艺', '塑绘', '雕刻'],
    recommendedTitle: '学习与创作',
    recommendedDetail: '适合报名、开课、练习技能或完成一段需要专注的创作。',
    cautiousTitle: '学习计划不要铺太满',
    cautiousDetail: '先确认时间、精力和课程质量，再决定报名或开启长期计划。',
  },
  {
    key: 'cleaning', theme: 'wellbeing', priority: 92,
    terms: ['解除', '扫舍', '沐浴', '理发', '整手足甲', '裁衣'],
    recommendedTitle: '清洁整理与个人护理',
    recommendedDetail: '适合打扫、清理积压、做日常护理，顺手把不再需要的东西归位。',
    cautiousTitle: '护理与整理从简',
    cautiousDetail: '只做必要的清洁维护，较大的形象改变或复杂安排可多考虑一天。',
  },
  {
    key: 'home', theme: 'home', priority: 90,
    terms: ['入宅', '移徙', '安床', '安门', '作灶', '出火', '合帐', '修门'],
    recommendedTitle: '搬家与居住调整',
    recommendedDetail: '适合搬家、布置住处、调整卧室或处理家中基础设施，仍要提前确认安全与物业条件。',
    cautiousTitle: '搬家与居住改动先缓',
    cautiousDetail: '非必要的大型搬动或居住改造可延后；必须处理时先核对人员、路线和安全。',
  },
  {
    key: 'construction', theme: 'home', priority: 88,
    terms: ['动土', '破土', '修造', '拆卸', '上梁', '起基', '盖屋', '竖柱', '作梁', '定磉', '合脊', '开柱眼', '安机械', '安碓磑', '造仓', '造车器', '造船', '造桥', '筑堤', '开渠', '放水', '开池', '掘井', '开厕', '架马', '修饰垣墙', '补垣', '坏垣', '破屋', '平治道涂', '伐木', '谢土', '塞穴'],
    recommendedTitle: '维修、安装与施工',
    recommendedDetail: '适合安排维修、拆装或已经规划好的工程；开工前仍需确认许可、天气和施工安全。',
    cautiousTitle: '大型施工避免仓促开工',
    cautiousDetail: '装修、拆装和大型维修先复核方案与安全条件，必要抢修不必等待择日。',
  },
  {
    key: 'travel', theme: 'travel', priority: 86,
    terms: ['出行', '赴任', '乘船'],
    recommendedTitle: '外出、差旅与到岗',
    recommendedDetail: '适合安排出行、差旅或正式到岗，出发前逐项确认天气、路线、证件和返程余量。',
    cautiousTitle: '远行多留时间余量',
    cautiousDetail: '非必要远行可调整；必须出发时提前核对天气、交通和备选路线。',
  },
  {
    key: 'relationship', theme: 'relationship', priority: 84,
    terms: ['嫁娶', '纳采', '订盟', '问名', '纳婿', '会亲友', '进人口', '归宁', '分居', '冠笄'],
    recommendedTitle: '关系与家庭安排',
    recommendedDetail: '适合见家人、确认关系计划、安排重要会面或讨论家庭事务。',
    cautiousTitle: '关系决定先充分沟通',
    cautiousDetail: '订婚、结婚、分居等重要决定先听清彼此想法，不因日期替代真实沟通。',
  },
  {
    key: 'family-plan', theme: 'relationship', priority: 82,
    terms: ['求嗣'],
    recommendedTitle: '家庭计划沟通',
    recommendedDetail: '适合与伴侣讨论生育、育儿或长期照护安排。',
    cautiousTitle: '家庭计划先补足信息',
    cautiousDetail: '先确认双方意愿、健康与现实条件。',
  },
  {
    key: 'nature', theme: 'nature', priority: 72,
    terms: ['栽种', '纳畜', '牧养', '教牛马', '造畜稠', '畋猎', '捕捉', '结网', '取渔', '割蜜', '断蚁', '归岫'],
    recommendedTitle: '园艺、宠物与户外劳作',
    recommendedDetail: '适合种植、照料动物或处理户外维护，开始前核对天气、防护工具和动物安置条件。',
    cautiousTitle: '户外劳作量力而行',
    cautiousDetail: '较大的种植、捕捞或动物安置先看天气与现场条件，避免临时冒险。',
  },
  {
    key: 'ritual', theme: 'ritual', priority: 62,
    terms: ['祭祀', '祈福', '开光', '斋醮', '普渡', '安香', '造庙'],
    recommendedTitle: '纪念、静心与表达祝愿',
    recommendedDetail: '适合祭扫纪念、安静独处或向重要的人表达祝愿，不必把仪式解释成确定结果。',
    cautiousTitle: '传统仪式从简安排',
    cautiousDetail: '大型仪式可先缓，日常纪念、表达关怀和个人信仰不受影响。',
  },
  {
    key: 'memorial', theme: 'memorial', priority: 45,
    terms: ['安葬', '入殓', '移柩', '除服', '成服', '启钻', '立碑', '修坟', '行丧', '开生坟', '合寿木'],
    recommendedTitle: '纪念与丧葬事务',
    recommendedDetail: '如家中确有相关安排，可用于协调仪式与家属时间；法规、习俗和家属意愿优先。',
    cautiousTitle: '丧葬事务先协调确认',
    cautiousDetail: '先与家属和服务机构确认流程，现实需要与当地规定优先于日期参考。',
  },
];

const dayOfficerRhythms: Record<string, Omit<ModernAlmanacRhythm, 'sourceLabel'>> = {
  建: { title: '适合建立计划', detail: '更适合明确目标、启动准备和搭好框架，第一次推进不必铺得太大。' },
  除: { title: '适合清理旧事', detail: '优先处理积压、修正问题和移除障碍，为后续安排腾出空间。' },
  满: { title: '适合补充与分享', detail: '适合沟通、庆祝和补充资源，先列清预算与承诺范围，避免兴致高时答应过量。' },
  平: { title: '适合按部就班', detail: '今天更适合稳定推进、协调关系，把普通事情做扎实。' },
  定: { title: '适合确认方案', detail: '适合把已经讨论成熟的计划定下来；临时起意的决定先补齐负责人、成本和退出条件。' },
  执: { title: '适合坚持执行', detail: '继续执行已经确认责任人和截止时间的部分，未确认的事项不在今天追加。' },
  破: { title: '适合拆解旧问题', detail: '适合止损、修正和打破无效做法，不宜在准备不足时启动重大事项。' },
  危: { title: '适合检查风险', detail: '先核对安全条件、备选方案和停止条件，三项没有写清前不启动高成本安排。' },
  成: { title: '适合收尾见成果', detail: '适合交付和确认结果，交付前核对成果内容、接收人和后续责任。' },
  收: { title: '适合归档与收拢', detail: '适合回款、整理、归档和减少分散投入，暂不追求快速扩张。' },
  开: { title: '适合开放沟通', detail: '适合启动交流、公开信息和推进新事项，发出前写清条件、责任人和回应期限。' },
  闭: { title: '适合内部整理', detail: '适合休整、复盘和处理内部事务；未完成资源清点和问题复盘前，不启动重大对外事项。' },
};

const auspiciousHourGuidance: Record<string, { title: string; detail: string }> = {
  青龙: { title: '会面与开启安排', detail: '适合沟通、见面和启动已经准备好的事情。' },
  明堂: { title: '办公与讨论方案', detail: '适合学习、办公、讨论细节和确认计划。' },
  金匮: { title: '合同与重要资料', detail: '适合核对钱款、签署文件和整理重要资料。' },
  天德: { title: '协商与解决问题', detail: '适合求助、协调分歧和处理需要耐心的事情。' },
  玉堂: { title: '社交与家庭安排', detail: '适合会友、家庭活动和需要轻松氛围的安排。' },
  司命: { title: '正式事务与定计划', detail: '适合确定计划、处理正式事项和完成收尾。' },
};

const modernAlmanacCache = new Map<string, ModernAlmanacResult | null>();

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function buildToneItems(values: string[], tone: ModernAlmanacTone): RankedModernAlmanacItem[] {
  const remaining = new Set(unique(values).filter((item) => item !== '诸事不宜'));
  const items = modernAlmanacRules.flatMap((rule) => {
    const matched = rule.terms.filter((term) => remaining.has(term));
    if (!matched.length) return [];
    matched.forEach((term) => remaining.delete(term));
    return [{
      key: rule.key,
      theme: rule.theme,
      title: tone === 'recommended' ? rule.recommendedTitle : rule.cautiousTitle,
      detail: tone === 'recommended' ? rule.recommendedDetail : rule.cautiousDetail,
      traditional: matched,
      priority: rule.priority + Math.min(4, matched.length),
    }];
  });

  return items.sort((left, right) => right.priority - left.priority || left.key.localeCompare(right.key));
}

function mergeItemPair(
  items: RankedModernAlmanacItem[],
  firstKey: string,
  secondKey: string,
  title: string,
  detail: string,
) {
  const first = items.find((item) => item.key === firstKey);
  const second = items.find((item) => item.key === secondKey);
  if (!first || !second) return items;
  const merged: RankedModernAlmanacItem = {
    ...first,
    title,
    detail,
    traditional: unique([...first.traditional, ...second.traditional]),
    priority: Math.max(first.priority, second.priority),
  };
  return [...items.filter((item) => item.key !== firstKey && item.key !== secondKey), merged]
    .sort((left, right) => right.priority - left.priority || left.key.localeCompare(right.key));
}

function mergeRelatedItems(items: RankedModernAlmanacItem[], tone: ModernAlmanacTone) {
  let merged = mergeItemPair(
    items,
    'relationship',
    'family-plan',
    tone === 'recommended' ? '关系与家庭计划' : '关系与家庭计划先沟通',
    tone === 'recommended'
      ? '适合见家人、安排重要会面，或讨论关系、生育、育儿与长期照护；先确认参与人和下一步。'
      : '订婚、结婚、分居、生育或长期照护等计划，先确认双方意愿、健康与现实条件，再约定下一步。',
  );
  merged = mergeItemPair(
    merged,
    'home',
    'construction',
    tone === 'recommended' ? '居住调整、维修与施工' : '居住改动与施工先核实',
    tone === 'recommended'
      ? '适合搬家、布置住处、安装维修或推进已经规划的施工；开始前确认物业或许可、人员、天气和现场安全。'
      : '非必要搬动、改造和大型施工可延后；必须处理时先确认方案、人员、许可和现场安全，必要抢修不等待择日。',
  );
  return mergeItemPair(
    merged,
    'ritual',
    'memorial',
    tone === 'recommended' ? '纪念、静心与丧葬事务' : '纪念与丧葬事务先协调',
    tone === 'recommended'
      ? '如有祭扫、纪念或丧葬安排，先协调家属、服务机构、当地规定与习俗；个人静心和表达祝愿可从简进行。'
      : '大型仪式和非紧急流程可先缓；现实丧葬需要先协调家属、机构和当地规定，不因日期延误。',
  );
}

function hourPeriodLabel(range: string) {
  const hour = Number(range.slice(0, 2));
  if (hour < 5) return '凌晨';
  if (hour < 9) return '早晨';
  if (hour < 12) return '上午';
  if (hour < 14) return '中午';
  if (hour < 17) return '下午';
  if (hour < 19) return '傍晚';
  return '晚上';
}

function isPracticalHourRange(range: string) {
  const startHour = Number(range.slice(0, 2));
  return Number.isFinite(startHour) && startHour >= 7 && startHour < 21;
}

function formatClockHourRange(range: string) {
  const match = /^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/.exec(range);
  if (!match) return range.replace('-', '—');
  const [, startHour, startMinute, endHour, endMinute] = match;
  if (endMinute !== '00') return `${startHour}:${startMinute}—${endHour}:${endMinute}`;
  const endTotalMinutes = (Number(endHour) * 60 - 1 + 24 * 60) % (24 * 60);
  const displayHour = String(Math.floor(endTotalMinutes / 60)).padStart(2, '0');
  const displayMinute = String(endTotalMinutes % 60).padStart(2, '0');
  return `${startHour}:${startMinute}—${displayHour}:${displayMinute}`;
}

function cleanParticipantNote(note: string) {
  return note.replace(/^[^：]+：/, '').replace(/未见[^；。]*/g, '').replace(/^[；，、\s]+|[；，、\s]+$/g, '');
}

function modernPersonalConflictNote(name: string, basis: '年支' | '日支', relation: PersonalConflictRelation) {
  const subject = basis === '年支' ? `${name}的生肖` : `${name}的个人出生信息`;
  const relationLabel: Record<PersonalConflictRelation, string> = {
    冲: '相冲',
    刑: '相刑',
    害: '相害',
    破: '相破',
  };
  const guidance: Record<PersonalConflictRelation, string> = {
    冲: '重要会面、签约或出行尽量避开；无法调整时，提前确认时间、路线和资料。',
    刑: '处理手续、规则和多人协作时，逐项核对材料、责任人和截止时间，不赶时间定案。',
    害: '沟通合作中更要防止遗漏和误解，关键约定尽量说清并留记录。',
    破: '原定安排较容易被打断，涉及交付、搬动或长期决定时准备替代时间或方案。',
  };
  return `这一天与${subject}${relationLabel[relation]}。${guidance[relation]}`;
}

export function getModernAlmanacPersonalNotes(day: AlmanacDayCandidate): string[] {
  const conflictFacts = (day.participantRelationFacts || []).filter((fact) => (
    fact.scope === '候选日'
    && (fact.basis === '年支' || fact.basis === '日支')
    && directPersonalConflictRelations.has(fact.relation as PersonalConflictRelation)
  ));
  if (conflictFacts.length) {
    return unique(conflictFacts.map((fact) => modernPersonalConflictNote(
      fact.participantName,
      fact.basis as '年支' | '日支',
      fact.relation as PersonalConflictRelation,
    )));
  }

  return day.participantNotes.flatMap((note) => {
    const separator = note.indexOf('：');
    const name = separator >= 0 ? note.slice(0, separator).trim() : '当前参与人';
    const detail = separator >= 0 ? note.slice(separator + 1) : note;
    if (!detail.trim() || detail.includes('未见')) return [];
    return [...detail.matchAll(/([冲刑害破])(生肖\/年支|日支)/g)].map((match) => modernPersonalConflictNote(
      name || '当前参与人',
      match[2] === '生肖/年支' ? '年支' : '日支',
      match[1] as PersonalConflictRelation,
    ));
  });
}

export function getModernAlmanacHours(day: AlmanacDayCandidate): ModernAlmanacHour[] {
  const hours = day.hours || [];
  return hours.flatMap((hour) => {
    const guidance = auspiciousHourGuidance[hour.twelveStar];
    if (!guidance || !isPracticalHourRange(hour.range)) return [];
    const personalNote = hour.participantNotes.map(cleanParticipantNote).filter(Boolean).join('；');
    if (/冲|刑|破|害|不利|慎/.test(personalNote)) return [];
    return [{
      name: hourPeriodLabel(hour.range),
      range: formatClockHourRange(hour.range),
      title: guidance.title,
      detail: guidance.detail,
      traditional: `${hour.name} · ${hour.twelveStar}`,
      personalNote,
    }];
  }).slice(0, 4);
}

function createMoon(day: AlmanacDayCandidate): ModernAlmanacMoon | null {
  const evidence = day.moonPhaseEvidence;
  if (!evidence) return null;
  const percent = Math.round(evidence.illuminationPercent);
  return {
    label: `${evidence.eightPhaseName} · 月面照明约 ${percent}%`,
    detail: evidence.waxing ? '月面亮度正在增加。' : '月面亮度正在减少。',
  };
}

export function modernizeAlmanacDay(day: AlmanacDayCandidate): ModernAlmanacResult {
  const traditionalRecommended = unique(day.recommends);
  const traditionalCautious = unique(day.avoids);
  const cautiousItems = mergeRelatedItems(buildToneItems(traditionalCautious, 'cautious'), 'cautious');
  if (traditionalRecommended.includes('诸事不宜') || traditionalCautious.includes('诸事不宜')) {
    cautiousItems.unshift({
      key: 'major-decisions',
      theme: 'routine',
      title: '重大事项先缓',
      detail: '除当天明确列出的少数事项外，不建议临时启动重大决定；必要事务仍按现实需要处理。',
      traditional: ['诸事不宜'],
      priority: 200,
    });
  }
  const cautiousKeys = new Set(cautiousItems.map((item) => item.key));
  const recommendedItems = mergeRelatedItems(buildToneItems(traditionalRecommended, 'recommended'), 'recommended')
    .filter((item) => !cautiousKeys.has(item.key));
  const officer = day.dayOfficer.replace(/日$/, '');
  const rhythm = dayOfficerRhythms[officer] || {
    title: '按现实条件安排',
    detail: '今天不设额外节奏限制，直接按已有优先级和现实条件安排。',
  };

  return {
    rhythm: { sourceLabel: `${officer || day.dayOfficer}日`, ...rhythm },
    moon: createMoon(day),
    recommended: recommendedItems.slice(0, 5).map(({ priority: _priority, ...item }) => item),
    cautious: cautiousItems.slice(0, 5).map(({ priority: _priority, ...item }) => item),
    traditionalRecommended,
    traditionalCautious,
  };
}

export function getModernAlmanacForDate(dateKey: string): ModernAlmanacResult | null {
  if (modernAlmanacCache.has(dateKey)) return modernAlmanacCache.get(dateKey) || null;
  try {
    const result = generateAlmanacSelection({
      topic: 'custom',
      startDate: dateKey,
      endDate: dateKey,
      participants: [],
    });
    const day = result.days.find((item) => item.date === dateKey) || result.days[0];
    const modern = day ? modernizeAlmanacDay(day) : null;
    modernAlmanacCache.set(dateKey, modern);
    return modern;
  } catch {
    modernAlmanacCache.set(dateKey, null);
    return null;
  }
}

export function findUnmappedAlmanacTerms(values: string[]) {
  const known = new Set(modernAlmanacRules.flatMap((rule) => rule.terms).concat('诸事不宜'));
  return unique(values).filter((item) => !known.has(item));
}
