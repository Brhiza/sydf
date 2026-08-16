import { generateLiuyao } from 'mingyu-core/divination/liuyao';
import { hexagramsData, type HexagramData } from 'mingyu-core/divination/hexagram-data';
import type { LiuyaoData } from 'mingyu-core/types';
import type { FortuneStatus } from './fortuneStatus';
import {
  DAILY_HEXAGRAM_DIRECTIONS,
  DAILY_HEXAGRAM_DIRECTION_KEYS,
  type DailyHexagramDirectionKey,
  type DailyHexagramDirections,
} from './dailyHexagramDirections';

export type DailyHexagramYaoValue = 6 | 7 | 8 | 9;

export interface DailyHexagramCoinThrow {
  coins: [2 | 3, 2 | 3, 2 | 3];
  total: DailyHexagramYaoValue;
}

export interface DailyHexagramSession {
  dateKey: string;
  startedAt: number;
  coinThrows: DailyHexagramCoinThrow[];
}

interface DailyHexagramBaseGuidance {
  status: FortuneStatus;
  theme: string;
  summary: string;
  action: string;
  caution: string;
}

export interface DailyHexagramGuidance extends DailyHexagramBaseGuidance {
  directions: DailyHexagramDirections;
}

export interface DailyHexagramDirectionReading {
  current: string;
  trend?: string;
}

export interface DailyHexagramMovingLineReading {
  position: number;
  name: string;
  type: string;
  source: string;
  meaning: string;
  advice: string;
}

export interface DailyHexagramInterpretation {
  traditionalOverview: string;
  plainOverview: string;
  situation: string;
  innerContext: string;
  trend: string;
  focus: string;
  pace: string;
  decisionRule: string;
  specialText?: string;
  directions: Record<DailyHexagramDirectionKey, DailyHexagramDirectionReading>;
  movingLines: DailyHexagramMovingLineReading[];
}

export interface DailyHexagramResult {
  chart: LiuyaoData;
  original: HexagramData;
  changed: HexagramData;
  inter: HexagramData;
  guidance: DailyHexagramGuidance;
  changedGuidance: DailyHexagramGuidance;
  interpretation: DailyHexagramInterpretation;
}

export const DAILY_HEXAGRAM_STORAGE_KEY = 'shiyue-daily-hexagram-v1';

const guidanceByName: Record<string, DailyHexagramBaseGuidance> = {
  乾为天: { status: '吉', theme: '主动精进', summary: '今天适合主动承担与持续推进，越有准备，行动越有底气。', action: '把最重要的一件事往前推进一步。', caution: '避免逞强、包揽过多或急于证明自己。' },
  天风姤: { status: '平', theme: '谨慎相遇', summary: '突然而来的消息或机会值得观察，先看清来意再决定是否接住。', action: '给新信息留出核实和缓冲时间。', caution: '不要因第一印象或一时热度仓促承诺。' },
  天山遁: { status: '小吉', theme: '适时退让', summary: '暂避锋芒不是停滞，拉开距离更容易保全精力与判断。', action: '主动退出无效争执，整理下一步。', caution: '不要把退让变成逃避应尽的责任。' },
  天地否: { status: '小凶', theme: '收敛待机', summary: '沟通与推进容易受阻，今天更适合守住边界、减少无谓消耗。', action: '先处理可独立完成的小事。', caution: '避免强推合作或反复说服无意配合的人。' },
  风地观: { status: '小吉', theme: '观察全局', summary: '先看后动能发现被忽略的细节，旁观视角比立即表态更有价值。', action: '复盘现状，听取不同位置的反馈。', caution: '不要只观察而迟迟不形成结论。' },
  山地剥: { status: '凶', theme: '止损固本', summary: '基础松动时不宜继续加码，先减负、修补和保护已有成果。', action: '删去一项非必要负担，检查薄弱处。', caution: '避免冒险扩张、情绪性投入或硬撑。' },
  火地晋: { status: '吉', theme: '稳步上升', summary: '努力更容易被看见，适合展示成果、争取支持并稳步向前。', action: '清楚表达进展与下一步诉求。', caution: '不要因顺利而忽略协作关系。' },
  火天大有: { status: '大吉', theme: '丰盛有成', summary: '资源与信心较为充足，适合完成重要事项并分享成果。', action: '集中优势做好关键交付。', caution: '避免自满、独占成果或铺张浪费。' },
  坎为水: { status: '凶', theme: '谨慎涉险', summary: '重复的难题提醒你放慢速度，先确认安全边界再继续前行。', action: '为关键决定准备备选方案。', caution: '避免赌运气、走捷径或轻视已知风险。' },
  水泽节: { status: '小吉', theme: '有度有节', summary: '清楚的时间、预算和责任边界，会让今天的安排更顺畅。', action: '给任务设定明确上限和截止点。', caution: '不要把自律变成僵化或苛责。' },
  水雷屯: { status: '小凶', theme: '起步维艰', summary: '开端容易杂乱，先建立秩序、寻找帮助，比追求速度更重要。', action: '拆小第一步，先解决最基础的阻碍。', caution: '避免同时启动太多事情。' },
  水火既济: { status: '小吉', theme: '守成防变', summary: '事情已具雏形，越接近完成越需要认真核对与维护。', action: '做一次收尾检查，补齐遗漏。', caution: '不要把阶段性完成当作万事无忧。' },
  泽火革: { status: '小吉', theme: '顺势更新', summary: '旧方法已不再合用时，可以在理由充分、准备到位后调整。', action: '先说明改变的必要性，再逐步实施。', caution: '避免只因厌倦而突然推翻现状。' },
  雷火丰: { status: '吉', theme: '把握丰盛', summary: '能见度与行动力都较强，适合在状态最好时完成关键推进。', action: '优先处理最能产生价值的事项。', caution: '不要让繁忙掩盖真正的重点。' },
  地火明夷: { status: '小凶', theme: '韬光养晦', summary: '外部环境不够友好，保留实力、低调完成比争强更稳妥。', action: '保护未成熟的计划和个人精力。', caution: '避免在情绪高点公开对抗。' },
  地水师: { status: '平', theme: '纪律协作', summary: '复杂任务需要清楚分工和统一节奏，单打独斗容易失序。', action: '确认目标、负责人和执行顺序。', caution: '不要用强硬代替沟通与规则。' },
  艮为山: { status: '平', theme: '知止安定', summary: '适时停下能让边界重新清晰，今天不必为所有事情立即作答。', action: '暂停一项消耗性活动，安静整理。', caution: '避免固执封闭或拒绝必要变化。' },
  山火贲: { status: '小吉', theme: '修饰有度', summary: '适当整理表达与外观有助沟通，但内容仍应比形式更重要。', action: '优化一份展示、文字或生活环境。', caution: '不要用漂亮包装掩盖实际问题。' },
  山天大畜: { status: '吉', theme: '积蓄实力', summary: '沉淀知识、资源与耐心，会为后续更大的行动创造条件。', action: '学习、储备并完善长期计划。', caution: '避免因暂未出手而自我怀疑。' },
  山泽损: { status: '平', theme: '减法增益', summary: '有意识地减少次要消耗，反而能保住真正重要的人与事。', action: '把资源从低价值事项移向核心。', caution: '不要牺牲健康、信用或必要保障。' },
  火泽睽: { status: '平', theme: '求同存异', summary: '观点不一致并不等于关系破裂，从小处寻找共识更现实。', action: '先确认双方都认可的部分。', caution: '避免把分歧扩大成人身对立。' },
  天泽履: { status: '小吉', theme: '谨慎履行', summary: '按规则、守分寸地推进，可以安全通过看似紧张的局面。', action: '逐项履行承诺，注意礼节与边界。', caution: '不要试探底线或轻率越级。' },
  风泽中孚: { status: '吉', theme: '真诚信任', summary: '坦诚而有依据的表达更容易获得信任，适合澄清与合作。', action: '说清真实想法，也兑现一个小承诺。', caution: '避免空口保证或迎合他人。' },
  风山渐: { status: '吉', theme: '循序渐进', summary: '稳定的小步积累正在产生变化，按节奏推进比求快更有利。', action: '完成一个可持续的小步骤。', caution: '不要因短期不显眼就频繁换方向。' },
  震为雷: { status: '平', theme: '临变不乱', summary: '突发变化先让人紧张，但镇定处理可以很快恢复秩序。', action: '先确认事实，再按优先级响应。', caution: '避免惊慌传播未经核实的信息。' },
  雷地豫: { status: '小吉', theme: '预备而乐', summary: '气氛与动力有所回升，提前准备能让愉快真正落到实处。', action: '为期待的活动做好具体安排。', caution: '不要因兴奋而过度消费或放松警惕。' },
  雷水解: { status: '吉', theme: '化解松绑', summary: '压力有机会缓和，适合解决旧问题、解除误会和释放负担。', action: '主动完成一次和解或收尾。', caution: '不要把问题缓解误认为无需善后。' },
  雷风恒: { status: '吉', theme: '持之以恒', summary: '稳定重复正确的做法，比临时冲刺更容易获得长久结果。', action: '守住已验证有效的习惯和承诺。', caution: '避免把坚持变成拒绝调整。' },
  地风升: { status: '吉', theme: '积小成高', summary: '谦逊积累会带来上升机会，今天适合争取指导并稳步进阶。', action: '向可靠的人请教并落实建议。', caution: '不要急于跳过必要的基础阶段。' },
  水风井: { status: '小吉', theme: '维护根本', summary: '稳定的基础资源值得维护，改善使用方式比频繁更换更有效。', action: '整理一个长期依赖的系统或关系。', caution: '避免只求新鲜而忽视日常养护。' },
  泽风大过: { status: '小凶', theme: '重担调整', summary: '当前负荷可能超过承受范围，需要尽快分担、加固或改变结构。', action: '识别最重的压力点并寻求支援。', caution: '不要继续独自硬扛或高估余力。' },
  泽雷随: { status: '小吉', theme: '顺势而行', summary: '观察环境并适度配合，有助于减少阻力、找到更自然的节奏。', action: '跟随有效流程，同时保留判断。', caution: '避免盲从权威或放弃原则。' },
  巽为风: { status: '小吉', theme: '柔和深入', summary: '温和、持续的沟通比强硬施压更能进入问题核心。', action: '用小而具体的方式反复推进。', caution: '不要因顾虑太多而失去立场。' },
  风天小畜: { status: '小吉', theme: '小有积蓄', summary: '条件还在聚集，先做好细节和小范围成果，时机自然会成熟。', action: '积累一项资源，完善一个细节。', caution: '避免急着把局部进展放大。' },
  风火家人: { status: '吉', theme: '各安其位', summary: '把熟悉关系中的责任与表达理顺，能为今天带来稳定支持。', action: '处理一项家庭或团队内部事务。', caution: '不要把亲近当成忽略边界的理由。' },
  风雷益: { status: '大吉', theme: '增益共进', summary: '帮助别人和改善共同条件，也会扩大自己的机会与收获。', action: '把资源用在能形成长期增益的地方。', caution: '避免只看眼前回报或贪多。' },
  天雷无妄: { status: '吉', theme: '守正自然', summary: '少一点算计、按事实和原则行动，事情反而更容易顺畅。', action: '诚实处理眼前职责，不预设结果。', caution: '避免妄求捷径或过度控制。' },
  火雷噬嗑: { status: '平', theme: '果断清障', summary: '明确规则并处理卡点，才能恢复顺畅；该面对的问题不宜再拖。', action: '解决一个具体障碍或未决事项。', caution: '不要让果断变成过度严厉。' },
  山雷颐: { status: '小吉', theme: '谨言善养', summary: '留意输入与输出，今天适合照顾身体、信息和说话方式。', action: '选择真正滋养自己的饮食与内容。', caution: '避免口舌争执、过量摄入或随意承诺。' },
  山风蛊: { status: '小凶', theme: '整治积弊', summary: '旧问题已经需要修理，追责不如先看清根因并建立新秩序。', action: '着手修复一项拖延已久的问题。', caution: '避免掩盖历史遗留或只治表面。' },
  离为火: { status: '吉', theme: '清明附丽', summary: '看清所依靠的关系与目标，持续投入会让方向更加明亮。', action: '澄清重点，用专业与热情推进。', caution: '避免浮躁、过度曝光或情绪燃烧。' },
  火山旅: { status: '平', theme: '旅途守分', summary: '身处变化或陌生环境时，轻装、礼貌和保留余地最为稳妥。', action: '简化安排，确认路线与落脚点。', caution: '不要在临时状态下作长期承诺。' },
  火风鼎: { status: '大吉', theme: '更新成器', summary: '资源经过整合能够形成新价值，适合升级方法、角色或合作。', action: '把分散资源组织成可交付成果。', caution: '避免只换形式而不改善实质。' },
  火水未济: { status: '平', theme: '谨慎收尾', summary: '离完成只差关键几步，越到最后越要稳住节奏、检查细节。', action: '明确剩余条件，一项项完成。', caution: '不要提前庆祝或在最后阶段冒进。' },
  山水蒙: { status: '平', theme: '求知启蒙', summary: '不知道并不可怕，带着具体问题学习，会比凭猜测行动更有效。', action: '向可靠来源请教一个明确问题。', caution: '避免反复询问却不实践，或不懂装懂。' },
  风水涣: { status: '小吉', theme: '疏通涣散', summary: '适合打破僵局、疏导情绪并重新凝聚共识。', action: '开启一次坦诚沟通，处理隔阂。', caution: '不要让放松演变成失去组织。' },
  天水讼: { status: '小凶', theme: '止争求明', summary: '立场冲突容易升级，尽早厘清事实和边界比争输赢更重要。', action: '保留证据，寻找中立的解决路径。', caution: '避免意气争辩、公开激化矛盾。' },
  天火同人: { status: '吉', theme: '同道协力', summary: '开放合作、寻找共同目标，容易获得志同道合者的支持。', action: '主动连接能互补的人。', caution: '不要因小圈子认同而排斥异见。' },
  坤为地: { status: '吉', theme: '厚德承载', summary: '耐心配合、稳稳承接今天的责任，会带来持久而可靠的进展。', action: '做好支持与落实，把基础铺稳。', caution: '避免一味顺从而没有自己的边界。' },
  地雷复: { status: '吉', theme: '回归正轨', summary: '偏离之后重新开始正当其时，小小回归会带来新的生机。', action: '恢复一个曾经有效的好习惯。', caution: '不要因过去失误否定重新开始。' },
  地泽临: { status: '吉', theme: '亲临担当', summary: '主动靠近现场、理解真实情况，更容易形成影响力与信任。', action: '亲自关注关键人和关键细节。', caution: '避免居高临下或只凭想象指挥。' },
  地天泰: { status: '大吉', theme: '通泰和合', summary: '上下沟通顺畅、条件彼此配合，适合推进重要合作与安排。', action: '抓住窗口完成关键协作。', caution: '不要因顺境而忽视后续维护。' },
  雷天大壮: { status: '吉', theme: '有力守正', summary: '行动能量充足，但真正的强大在于有原则、有克制地使用力量。', action: '把力量用在明确且正当的目标上。', caution: '避免冲动压人、越界或逞强。' },
  泽天夬: { status: '平', theme: '决断除患', summary: '需要明确表态和处理隐患，但公开透明比激烈对抗更重要。', action: '作出一个拖延已久的清楚决定。', caution: '不要在愤怒中决裂或采取过激手段。' },
  水天需: { status: '小吉', theme: '有备而待', summary: '等待并非空耗，利用间隙补足条件，时机来到时会更从容。', action: '准备资源、信息与备选方案。', caution: '避免焦虑催促或无期限拖延。' },
  水地比: { status: '吉', theme: '亲比互助', summary: '选择可靠伙伴并真诚互助，能够增强今天的稳定感与执行力。', action: '确认彼此承诺，完成一次有效协作。', caution: '避免为了归属感依附不合适的关系。' },
  兑为泽: { status: '吉', theme: '喜悦交流', summary: '轻松而真诚的沟通能带来共鸣，适合分享、协商与鼓励。', action: '说一句有分量的肯定，促进交流。', caution: '避免只求讨喜、口无遮拦或过度娱乐。' },
  泽水困: { status: '凶', theme: '困中守志', summary: '资源受限、表达难被理解时，守住核心并节省力量最重要。', action: '收缩战线，只保留必要事项。', caution: '避免绝望承诺、透支或与困境硬碰。' },
  泽地萃: { status: '吉', theme: '汇聚共识', summary: '人和资源正在聚集，明确共同目标能把热闹转化为成果。', action: '组织一次有明确目的的协作。', caution: '不要只聚集人气而缺少秩序。' },
  泽山咸: { status: '吉', theme: '感应相通', summary: '细腻感受与真诚回应有利于关系靠近，互动需要自然和尊重。', action: '表达真实感受，也认真倾听回应。', caution: '避免操控情绪或把好感当作承诺。' },
  水山蹇: { status: '小凶', theme: '遇阻求援', summary: '前路不顺时，调整方向并寻找有经验的帮助，比硬闯更明智。', action: '绕开明显阻碍，向可靠的人求助。', caution: '避免孤军深入或重复无效尝试。' },
  地山谦: { status: '大吉', theme: '谦逊有终', summary: '不争虚名、踏实补位，反而更容易赢得信任并把事情做成。', action: '把成绩落到行动，也给他人留空间。', caution: '不要把谦逊变成自我贬低。' },
  雷山小过: { status: '平', theme: '小事可为', summary: '今天适合处理细节与小幅调整，大动作则需要更多条件。', action: '完成一个具体、可控的小改进。', caution: '避免目标过大、承诺过头或急于跨越。' },
  雷泽归妹: { status: '小凶', theme: '名分次序', summary: '关系或安排若次序未明，越急着推进越容易留下后患。', action: '先确认角色、条件和长期影响。', caution: '避免因冲动、压力或短期诱惑仓促决定。' },
};

export function formatDailyHexagramDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function secureRandomBit(): 0 | 1 {
  const values = new Uint8Array(1);
  globalThis.crypto.getRandomValues(values);
  return (values[0] & 1) as 0 | 1;
}

export function shakeDailyHexagramCoins(randomBit: () => 0 | 1 = secureRandomBit): DailyHexagramCoinThrow {
  const coins = [0, 1, 2].map(() => randomBit() === 1 ? 3 as const : 2 as const) as [2 | 3, 2 | 3, 2 | 3];
  const total = coins.reduce<number>((sum, coin) => sum + coin, 0) as DailyHexagramYaoValue;
  return { coins, total };
}

export function getDailyHexagramGuidance(name: string): DailyHexagramGuidance {
  const guidance = guidanceByName[name];
  const directions = DAILY_HEXAGRAM_DIRECTIONS[name];
  if (!guidance || !directions) throw new Error(`未找到每日一卦解读：${name}`);
  return { ...guidance, directions };
}

function findHexagram(name: string | undefined) {
  const hexagram = hexagramsData.find((item) => item.name === name);
  if (!hexagram) throw new Error(`未找到卦象资料：${name || '未知'}`);
  return hexagram;
}

const lineNames = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'] as const;

const lineStageMeanings = [
  '事情刚起步，基础、动机和第一步比速度更重要。',
  '事情已进入实际推进阶段，稳定的方法与可靠配合会开始产生影响。',
  '这里处在由内向外的转折处，压力、试错和取舍往往最集中。',
  '事情开始影响外部关系与环境，表达方式、分寸和边界尤其重要。',
  '这里接近核心决策位置，资源如何分配、责任由谁承担会决定走向。',
  '事情已到阶段末端，需要判断应当收束、转向，还是及时放下。',
] as const;

const movingAdviceByType = {
  老阳: [
    '先验证方向，不要在起步时把话说满。',
    '保持推进，同时给协作、反馈和修正留出空间。',
    '主动减速校正，避免只凭意志硬闯。',
    '公开行动前先确认边界，以及它会影响到谁。',
    '有能力也要节制用力，让规则和责任先行。',
    '见好就收，为下一阶段腾出余地。',
  ],
  老阴: [
    '条件已有雏形，可以用一个小动作打破停滞。',
    '明确回应和分工，把支持转化成实际进展。',
    '不要继续被动等待，先处理最直接的卡点。',
    '适度表态，主动建立必要的外部连接。',
    '承担关键责任，把想法落实成可检查的决定。',
    '到了必须转向的时候，结束拖延并开启下一步。',
  ],
} as const;

function explainYaoCi(source: string) {
  const warningText = source.replaceAll('无咎', '');
  if (/勿用|不利|凶|灾|眚/.test(warningText)) return '爻辞带有明确警戒，今天应先避开风险，再考虑推进。';
  if (/厉|吝|悔|咎/.test(warningText)) return '爻辞提示过程有压力或代价，行动前要把边界与退路想清楚。';
  if (/见大人|王|公|侯/.test(source)) return '爻辞偏向借助可靠的人、规则或平台，不宜只靠自己硬撑。';
  if (/往|征|行|涉大川/.test(source)) return '爻辞涉及行动与前往，方向明确、准备充分之后再动更稳。';
  if (/吉|亨|利|无咎/.test(source)) return '爻辞整体偏支持，但顺利仍建立在守分寸、做实行动之上。';
  if (/贞/.test(source)) return '爻辞强调守住原则与持续性，不要只被眼前得失带动。';
  return '爻辞没有给出简单的吉凶结论，重点在于结合所处阶段把握分寸。';
}

function buildMovingLineReadings(chart: LiuyaoData, original: HexagramData): DailyHexagramMovingLineReading[] {
  return chart.changingYaos.map((line) => {
    const index = line.position - 1;
    const type = line.type === '老阴' ? '老阴' : '老阳';
    const source = original.yaoCi?.[index] || '此爻未列爻辞';
    const changeMeaning = type === '老阳'
      ? '阳爻发动而转阴，表示主动扩张之后要转向收敛、承接与复核。'
      : '阴爻发动而转阳，表示观察积累之后要转向表态、执行与承担。';
    return {
      position: line.position,
      name: lineNames[index],
      type,
      source,
      meaning: `${lineStageMeanings[index]}${changeMeaning}`,
      advice: `${explainYaoCi(source)}${movingAdviceByType[type][index]}`,
    };
  });
}

function buildFocus(chart: LiuyaoData, original: HexagramData, changed: HexagramData) {
  const movingPositions = chart.changingYaos.map((line) => line.position);
  const movingNames = movingPositions.map((position) => lineNames[position - 1]);
  const unchangedNames = lineNames.filter((_, index) => !movingPositions.includes(index + 1));
  switch (movingPositions.length) {
    case 0:
      return `六爻皆静，今日以本卦“${original.name}”为主，不必从细小波动中寻找转折，先把现有方向做稳。`;
    case 1:
      return `${movingNames[0]}独动，是今天最明确的转折点；先看这一爻所处的阶段，再以“${changed.name}”判断后续方向。`;
    case 2:
      return `${movingNames.join('、')}同动：较低的一爻说明变化从哪里开始，较高的一爻说明事情将怎样落到外部，后者是今日判断的重点。`;
    case 3:
      return `三爻发动，局面处在明显转换中；本卦说明现状，变卦“${changed.name}”说明走向，两边都不能只看一面。`;
    case 4:
      return `四爻发动，变化力量已强，解读以变卦“${changed.name}”为主；未动的${unchangedNames.join('、')}是仍需守住的边界。`;
    case 5:
      return `五爻发动，整体已明显转向“${changed.name}”；仅${unchangedNames[0]}未动，它代表变化中最不应丢失的立足点。`;
    default:
      return `六爻皆动，原有局面正在整体翻转；今日不宜执着本卦的旧状态，应以变卦“${changed.name}”作为后续判断重心。`;
  }
}

function buildPace(status: FortuneStatus, movingCount: number) {
  const isRisky = status === '小凶' || status === '凶' || status === '大凶';
  if (movingCount >= 4) {
    return isRisky
      ? '变化快且风险偏高，先止损、核实和保留退路，重要决定分两步完成。'
      : '变化较强，先完成可逆的小步骤，确认反馈后再扩大投入。';
  }
  if (isRisky) return '今天宜放慢速度，先处理已知风险和必要事项，不用靠加码证明进展。';
  if (movingCount === 0) return '按原计划稳步推进即可，重在持续、收尾与维护，不必临时换方向。';
  return '适合小步推进、及时复核；有正向反馈再继续，没有把握就保留调整空间。';
}

function buildDirectionReadings(
  guidance: DailyHexagramGuidance,
  changedGuidance: DailyHexagramGuidance,
  movingCount: number,
) {
  return Object.fromEntries(DAILY_HEXAGRAM_DIRECTION_KEYS.map((key) => [
    key,
    {
      current: guidance.directions[key],
      ...(movingCount > 0 ? { trend: changedGuidance.directions[key] } : {}),
    },
  ])) as Record<DailyHexagramDirectionKey, DailyHexagramDirectionReading>;
}

function inlineSentence(text: string) {
  return text.replace(/[。！？；]+$/u, '');
}

function lineSource(original: HexagramData, position: number) {
  return inlineSentence(original.yaoCi?.[position - 1] || '此爻未列爻辞');
}

function buildTraditionalTakingRule(
  chart: LiuyaoData,
  original: HexagramData,
  changed: HexagramData,
) {
  const movingPositions = chart.changingYaos.map((line) => line.position);
  const movingNames = movingPositions.map((position) => lineNames[position - 1]);
  const unchangedPositions = lineNames
    .map((_, index) => index + 1)
    .filter((position) => !movingPositions.includes(position));
  const unchangedNames = unchangedPositions.map((position) => lineNames[position - 1]);

  switch (movingPositions.length) {
    case 0:
      return '六爻皆静，以本卦卦辞定今日主调';
    case 1:
      return `${movingNames[0]}独动，取其爻辞“${lineSource(original, movingPositions[0])}”判断关键转折`;
    case 2: {
      const primaryPosition = movingPositions.at(-1) as number;
      return `${movingNames.join('、')}同动，以较高的${lineNames[primaryPosition - 1]}为主，爻辞“${lineSource(original, primaryPosition)}”；较低一爻补看变化起点`;
    }
    case 3:
      return `三爻齐动，兼看本卦与之卦卦辞，以本卦定当前、之卦“${changed.name}”定后势`;
    case 4: {
      const primaryPosition = unchangedPositions[0];
      return `四爻发动，取未动的${unchangedNames.join('、')}，以较低的${lineNames[primaryPosition - 1]}为主，爻辞“${lineSource(original, primaryPosition)}”`;
    }
    case 5: {
      const primaryPosition = unchangedPositions[0];
      return `五爻发动，取唯一未动的${lineNames[primaryPosition - 1]}，爻辞“${lineSource(original, primaryPosition)}”`;
    }
    default:
      return original.yongCi
        ? `六爻皆动，取用辞“${inlineSentence(original.yongCi)}”判断整体转折`
        : `六爻皆动，旧局已全变，以之卦“${changed.name}”及其卦辞“${inlineSentence(changed.description || '卦辞未载')}”判断后续`;
  }
}

function buildTraditionalOverview(
  chart: LiuyaoData,
  original: HexagramData,
  changed: HexagramData,
  inter: HexagramData,
  guidance: DailyHexagramGuidance,
  changedGuidance: DailyHexagramGuidance,
  interGuidance: DailyHexagramGuidance,
) {
  const source = inlineSentence(original.description || '卦辞未载');
  const takingRule = buildTraditionalTakingRule(chart, original, changed);
  if (!chart.changingYaos.length) {
    return `本卦“${original.name}”，卦辞“${source}”。${takingRule}：本卦主“${guidance.theme}”；互卦“${inter.name}”补看内因，落在“${interGuidance.theme}”。`;
  }
  return `本卦“${original.name}”，卦辞“${source}”。${takingRule}。本卦主眼前的“${guidance.theme}”，互卦“${inter.name}”见内因“${interGuidance.theme}”，之卦“${changed.name}”落到后势“${changedGuidance.theme}”。`;
}

function buildPlainOverview(
  chart: LiuyaoData,
  guidance: DailyHexagramGuidance,
  changedGuidance: DailyHexagramGuidance,
) {
  if (!chart.changingYaos.length) {
    return `${guidance.summary}今天先做：${inlineSentence(guidance.action)}；暂缓：${inlineSentence(guidance.caution)}。六爻不动，按这条线做到底，不必临时改计划。`;
  }
  return `${guidance.summary}今天先做：${inlineSentence(guidance.action)}；暂缓：${inlineSentence(guidance.caution)}。局面转向“${changedGuidance.theme}”后，再改为：${inlineSentence(changedGuidance.action)}。`;
}

function buildInterpretation(
  chart: LiuyaoData,
  original: HexagramData,
  changed: HexagramData,
  inter: HexagramData,
  guidance: DailyHexagramGuidance,
  changedGuidance: DailyHexagramGuidance,
): DailyHexagramInterpretation {
  const interGuidance = getDailyHexagramGuidance(inter.name);
  const movingCount = chart.changingYaos.length;
  const trend = movingCount === 0
    ? `卦中没有动爻，原有趋势会延续。重点不是另开战线，而是继续落实：${guidance.action}同时注意：${guidance.caution}`
    : `变卦为“${changed.name}”，后续主题转向“${changedGuidance.theme}”。${changedGuidance.summary}承接变化的做法是：${changedGuidance.action}需要避开的风险是：${changedGuidance.caution}`;
  return {
    traditionalOverview: buildTraditionalOverview(chart, original, changed, inter, guidance, changedGuidance, interGuidance),
    plainOverview: buildPlainOverview(chart, guidance, changedGuidance),
    situation: `本卦“${original.name}”说明今天的主要议题是“${guidance.theme}”。先把“${inlineSentence(guidance.action)}”落到一个可见步骤；若遇阻，先修正方法，不必一次解决所有问题。`,
    innerContext: `互卦“${inter.name}”揭示内在条件是“${interGuidance.theme}”。${interGuidance.summary}若外在推进不顺，先检查内在条件，并落实：${interGuidance.action}`,
    trend,
    focus: buildFocus(chart, original, changed),
    pace: buildPace(guidance.status, movingCount),
    decisionRule: movingCount >= 3
      ? '先选可验证、可回退的方案；局势尚未稳定时，不用一次把选择做死。'
      : '先确认事实、责任和代价都清楚；能推进关键事项且风险可控，再行动。',
    ...(movingCount === 6 && original.yongCi ? { specialText: original.yongCi } : {}),
    directions: buildDirectionReadings(guidance, changedGuidance, movingCount),
    movingLines: buildMovingLineReadings(chart, original),
  };
}

export function buildDailyHexagramResult(
  coinThrows: readonly DailyHexagramCoinThrow[],
  castTime = new Date(),
): DailyHexagramResult {
  if (coinThrows.length !== 6) throw new Error('请依初爻至上爻摇满六次。');
  const chart = generateLiuyao(castTime, { method: 'coins', coinThrows }) as LiuyaoData;
  const original = findHexagram(chart.originalName);
  const changed = findHexagram(chart.changedName);
  const inter = findHexagram(chart.interName);
  const guidance = getDailyHexagramGuidance(original.name);
  const changedGuidance = getDailyHexagramGuidance(changed.name);
  return {
    chart,
    original,
    changed,
    inter,
    guidance,
    changedGuidance,
    interpretation: buildInterpretation(chart, original, changed, inter, guidance, changedGuidance),
  };
}

export function formatDailyHexagramAiContext(result: DailyHexagramResult, dateLabel: string) {
  const movingLineSummary = result.interpretation.movingLines.length
    ? result.interpretation.movingLines
      .map((line) => `${line.name}${line.type}：${line.source}；${line.meaning}；${line.advice}`)
      .join('\n')
    : '六爻皆静，以本卦为今日主要依据。';
  const changedHexagram = result.chart.changingYaos.length
    ? `之卦：${result.changed.name}（后续主题：${result.changedGuidance.theme}）`
    : '之卦：无（六爻皆静）';

  return [
    '以下是本次“每日一卦”的当天语境，请在六爻盘面基础上结合这些资料解读，不要把它当作长期命运定论。',
    `日期：${dateLabel}`,
    `本卦：${result.original.name}`,
    `互卦：${result.inter.name}`,
    changedHexagram,
    `今日主题：${result.guidance.theme}`,
    `今日提要：${result.guidance.summary}`,
    `宜采取：${result.guidance.action}`,
    `需留意：${result.guidance.caution}`,
    `解读重心：${result.interpretation.focus}`,
    `内在条件：${result.interpretation.innerContext}`,
    `后续走势：${result.interpretation.trend}`,
    `行动节奏：${result.interpretation.pace}`,
    `判断原则：${result.interpretation.decisionRule}`,
    `动爻资料：\n${movingLineSummary}`,
    '请用清楚、克制的中文，依次说明今天最值得关注的重点、可能出现的变化、具体行动建议和应避免的做法。',
  ].join('\n');
}

function isCoinThrow(value: unknown): value is DailyHexagramCoinThrow {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<DailyHexagramCoinThrow>;
  if (!Array.isArray(candidate.coins) || candidate.coins.length !== 3) return false;
  if (!candidate.coins.every((coin) => coin === 2 || coin === 3)) return false;
  const expectedTotal = candidate.coins.reduce<number>((sum, coin) => sum + coin, 0);
  return candidate.total === expectedTotal && [6, 7, 8, 9].includes(candidate.total);
}

export function parseDailyHexagramSession(raw: string | null, today = new Date()): DailyHexagramSession | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<DailyHexagramSession>;
    if (value.dateKey !== formatDailyHexagramDateKey(today)) return null;
    if (!Number.isFinite(value.startedAt) || (value.startedAt as number) <= 0) return null;
    if (!Array.isArray(value.coinThrows) || value.coinThrows.length > 6 || !value.coinThrows.every(isCoinThrow)) return null;
    return {
      dateKey: value.dateKey,
      startedAt: value.startedAt as number,
      coinThrows: value.coinThrows.map((item) => ({ coins: [...item.coins] as [2 | 3, 2 | 3, 2 | 3], total: item.total })),
    };
  } catch {
    return null;
  }
}

export function createDailyHexagramSession(now = new Date()): DailyHexagramSession {
  return { dateKey: formatDailyHexagramDateKey(now), startedAt: now.getTime(), coinThrows: [] };
}

export function dailyHexagramYaoLabel(total: DailyHexagramYaoValue) {
  return ({ 6: '老阴', 7: '少阳', 8: '少阴', 9: '老阳' } as const)[total];
}
