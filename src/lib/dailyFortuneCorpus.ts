export type FortuneReadingPosture = 'advance' | 'focus' | 'cultivate' | 'resolve' | 'stabilize' | 'restore' | 'protect';

export interface FortuneReadingPhraseContext {
  lead: string;
  primaryLabel: string;
  primaryShortLabel: string;
  primaryOutcome: string;
  periodUnit: string;
  cautionLabel: string;
  bestWindow: string;
  cautionWindow: string;
  primaryAction: string;
  primaryBoundary: string;
  cautionAction: string;
  structureDiagnosis: string;
  decisionStatement: string;
}

export interface FortuneReadingCopy {
  title: string;
  summary: string;
  overviewLabel: string;
  opportunity: string;
  caution: string;
}

type PhraseTemplate = (context: FortuneReadingPhraseContext) => string;

interface FortuneReadingCorpusEntry {
  titles: PhraseTemplate[];
  overviewLabel: string;
  opportunities: PhraseTemplate[];
}

function windowLead(window: string) {
  return window ? `${window}，` : '';
}

function cautionLead(window: string) {
  return window ? `${window}，` : '';
}

function reasonedSummary(context: FortuneReadingPhraseContext) {
  const diagnosis = context.structureDiagnosis.trim().replace(/[；]+$/, '。');
  const decision = context.decisionStatement.trim().replace(/^因此/, '');
  return `${diagnosis}${diagnosis.endsWith('。') ? '' : '。'}因此${decision}`;
}

const secondaryRelationsByPrimary: Record<string, Record<string, string>> = {
  career: {
    study: '学习把工作中的做法整理成可复用步骤，减少同类任务重新摸索',
    wealth: '钱款闭合工作产生的成本、报销与付款责任，避免交付卡在结算环节',
    relationship: '沟通让工作负责人、交付标准和变更条件得到共同确认',
    travel: '出行保障见面、现场处理与交付所需的地点和结束时间',
    wellbeing: '身心状态决定工作判断、沟通与收尾能否保持连续',
  },
  study: {
    career: '工作提供可验收的应用场景，使学习成果不只停在笔记',
    wealth: '钱款限定课程、资料与试错成本，避免学习投入超过实际收益',
    relationship: '沟通通过复述与反馈检验学习理解是否准确，并暴露应用偏差',
    travel: '出行保留稳定的学习地点与完整时段，避免转场切断注意力',
    wellbeing: '身心状态决定学习输入能否沉淀为记忆与输出，并保持连续',
  },
  wealth: {
    career: '工作明确收入、交付与报销责任，使每笔钱款都有现实来源',
    study: '学习帮助理解条款、比较成本并发现钱款记录中的遗漏',
    relationship: '沟通让金额、责任与付款节点得到共同确认，避免各自留存不同版本',
    travel: '出行补齐交通、住宿与变更成本，避免钱款预算漏项',
    wellbeing: '身心状态影响钱款核对准确度，疲劳时更容易漏算或误付',
  },
  relationship: {
    career: '工作梳理分工与责任，为沟通提供能够确认的事实',
    study: '学习帮助整理资料与观点，使沟通不只停在立场',
    wealth: '钱款明确共同利益、费用与责任，减少沟通中的含糊承诺',
    travel: '出行落实会面地点、到达时间与结束安排，让沟通能够真正发生',
    wellbeing: '身心状态决定沟通时能否听清事实、控制反应并完成表达',
  },
  travel: {
    career: '工作明确出行目的、负责人和结束节点，使行程服务于实际交付',
    study: '学习明确需要携带的资料、设备与现场任务，减少无效转场',
    wealth: '钱款闭合交通、住宿与变更成本，避免行程留下后续责任',
    relationship: '沟通对齐同行人、接待方与变更信息，减少行程临时改线',
    wellbeing: '身心状态决定出行可承受的转场密度与返程余量',
  },
  wellbeing: {
    career: '工作通过交接与减量释放完整休息时间，避免恢复被临时任务切碎',
    study: '学习控制输入量与截止点，让注意力真正从持续处理信息中退出',
    wealth: '钱款先闭合持续牵动注意力的费用与责任，减少休息中的反复惦记',
    relationship: '沟通澄清最耗精力的分歧与边界，避免情绪持续占用恢复时间',
    travel: '出行减少不必要转场并确定返程，使睡眠与进食获得稳定时间',
  },
};

const cautionInterruptionsByPrimary: Record<string, Record<string, string>> = {
  career: {
    study: '资料持续增加却没有形成结论，会切碎工作判断，交付标准和验收遗漏随之增加',
    wealth: '金额或付款责任未闭合，会让工作结果在报价、报销或结算处反复返工',
    relationship: '共同事实未对齐，会让工作需求和验收口径出现两套版本',
    travel: '转场与返程延误会压缩工作会面、现场处理和交付时间',
    wellbeing: '恢复不足会降低工作判断准确度，错误往往集中到沟通与收尾',
  },
  study: {
    career: '临时工作与责任变化会不断插入，学习难以保留连续输入和输出时间',
    wealth: '费用与付款压力未定，会干扰学习选择，使资料投入难以按收益取舍',
    relationship: '共同事实未确认，会让学习输入和实际应用采用不同标准',
    travel: '频繁转场会切断学习注意力，资料检查、练习与输出更容易遗漏',
    wellbeing: '恢复不足会让学习停在反复阅读，记忆、复述和应用同步下降',
  },
  wealth: {
    career: '工作交付与责任变化会反复改写金额、报销和付款依据',
    study: '条款与成本信息没有真正理解，会让钱款比较停在数字表面并漏掉责任',
    relationship: '共同事实未对齐，会让金额、付款节点和责任各自保留不同版本',
    travel: '路线或行程变化会持续新增交通、住宿和取消成本',
    wellbeing: '恢复不足会降低钱款核对准确度，漏算、重复付款和冲动决定更容易出现',
  },
  relationship: {
    career: '工作分工与责任不断变化，会让沟通议题、承诺边界和下一步反复重写',
    study: '资料没有消化为共同事实，会让沟通建立在未经核实的信息上',
    wealth: '金额和付款责任含糊，会把沟通分歧进一步变成信任与承诺问题',
    travel: '会面迟到或返程压力会压缩沟通时间，容易在事实未齐时仓促定论',
    wellbeing: '恢复不足会降低倾听与判断余量，疲劳更容易被误认成立场',
  },
  travel: {
    career: '临时工作与交付变化会改写目的地、出发时间和返程节点',
    study: '资料、设备或现场任务没有核清，会让出行到达后仍无法完成目的',
    wealth: '预算或付款节点有缺口，会迫使交通、住宿和返程方案临时变更',
    relationship: '同行人与接待方信息未对齐，会让时间、地点和变更方案出现不同版本',
    wellbeing: '恢复不足会降低出行反应速度，转场、驾驶与返程安全余量一起下降',
  },
  wellbeing: {
    career: '工作插单与责任交接持续进入休息时间，会让睡眠和恢复被切成零散片段',
    study: '持续增加资料与信息输入，会让注意力无法退出工作状态并拖延入睡',
    wealth: '未解决的费用与付款责任会持续占用注意力，休息时仍反复核算',
    relationship: '未解决的分歧会维持情绪唤醒，使身体停下来后思绪仍无法退出',
    travel: '转场和返程余量不足会直接挤压睡眠、进食与完整恢复时间',
  },
};

export function summarySecondaryRelation(
  primaryKey: string,
  secondaryKey: string,
  primaryLabel: string,
  secondaryLabel: string,
) {
  return secondaryRelationsByPrimary[primaryKey]?.[secondaryKey]
    || `${secondaryLabel}负责补齐${primaryLabel}形成结果所需的现实条件`;
}

export function summaryCautionInterruption(
  primaryKey: string,
  cautionKey: string,
  primaryLabel: string,
  cautionLabel: string,
) {
  return cautionInterruptionsByPrimary[primaryKey]?.[cautionKey]
    || `${cautionLabel}的条件反复会截断${primaryLabel}形成结果的过程`;
}

const fortuneReadingCorpus: Record<FortuneReadingPosture, FortuneReadingCorpusEntry> = {
  advance: {
    titles: [
      ({ lead, primaryShortLabel, primaryOutcome }) => `${lead}${primaryShortLabel}信号集中，先确认${primaryOutcome}`,
      ({ lead, primaryShortLabel, primaryOutcome }) => `${lead}多数信号支持${primaryShortLabel}，先形成${primaryOutcome}`,
    ],
    overviewLabel: '顺势窗口集中，先形成结果',
    opportunities: [
      ({ primaryAction, primaryBoundary, bestWindow }) => `${windowLead(bestWindow)}${primaryAction}；${primaryBoundary}。`,
    ],
  },
  focus: {
    titles: [
      ({ lead, primaryShortLabel, primaryOutcome }) => `${lead}强弱分化，先用${primaryShortLabel}形成${primaryOutcome}`,
      ({ lead, primaryShortLabel, primaryOutcome }) => `${lead}重心在${primaryShortLabel}，先确认${primaryOutcome}`,
    ],
    overviewLabel: '强弱分化，先完成一项',
    opportunities: [
      ({ primaryAction, primaryBoundary, bestWindow }) => `${windowLead(bestWindow)}${primaryAction}；${primaryBoundary}。`,
    ],
  },
  stabilize: {
    titles: [
      ({ lead, primaryShortLabel, primaryOutcome }) => `${lead}先定次序，用${primaryShortLabel}确认${primaryOutcome}`,
      ({ lead, primaryShortLabel, primaryOutcome }) => `${lead}各项信号接近，先看${primaryShortLabel}能否形成${primaryOutcome}`,
    ],
    overviewLabel: '助力与牵制接近，先看完成条件',
    opportunities: [
      ({ primaryAction, primaryBoundary, bestWindow }) => `${windowLead(bestWindow)}${primaryAction}；${primaryBoundary}。`,
    ],
  },
  cultivate: {
    titles: [
      ({ lead, primaryShortLabel, primaryOutcome, periodUnit }) => `${lead}多数${periodUnit}平稳，先看${primaryShortLabel}能否形成${primaryOutcome}`,
      ({ lead, primaryShortLabel, primaryOutcome }) => `${lead}没有持续风险，先用${primaryShortLabel}验证${primaryOutcome}`,
      ({ lead, primaryShortLabel, primaryOutcome }) => `${lead}没有连续助力，先看${primaryShortLabel}能否形成${primaryOutcome}`,
    ],
    overviewLabel: '多数窗口平稳，用连续反馈判断',
    opportunities: [
      ({ primaryAction, primaryBoundary, bestWindow }) => `${windowLead(bestWindow)}${primaryAction}；${primaryBoundary}。`,
    ],
  },
  resolve: {
    titles: [
      ({ lead, cautionLabel }) => `${lead}${cautionLabel || '局部条件'}反复较多，先查关键条件`,
      ({ lead, cautionLabel, primaryShortLabel, primaryOutcome }) => `${lead}先收紧${cautionLabel || '反复项'}，${primaryShortLabel}只确认${primaryOutcome}`,
      ({ lead, cautionLabel, primaryShortLabel }) => `${lead}${cautionLabel || '局部条件'}反复较多，${primaryShortLabel}只做可收尾部分`,
    ],
    overviewLabel: '局部条件反复，先查清再投入',
    opportunities: [
      ({ primaryAction, primaryBoundary, bestWindow }) => `${windowLead(bestWindow)}${primaryAction}，只保留当前一条线；${primaryBoundary}。`,
      ({ primaryAction, primaryBoundary, bestWindow }) => `${windowLead(bestWindow)}${primaryAction}；${primaryBoundary}。`,
    ],
  },
  restore: {
    titles: [
      ({ lead }) => `${lead}恢复信号偏弱，先补足休息`,
      ({ lead }) => `${lead}承载能力不足，先减少任务量`,
    ],
    overviewLabel: '承载能力偏弱，先减少任务',
    opportunities: [
      ({ primaryAction, primaryBoundary, bestWindow }) => `${windowLead(bestWindow)}${primaryAction}；${primaryBoundary}。`,
    ],
  },
  protect: {
    titles: [
      ({ lead }) => `${lead}收紧项偏多，先减少新增承诺`,
      ({ lead, primaryShortLabel, primaryOutcome }) => `${lead}先避开反复，${primaryShortLabel}只保留${primaryOutcome}`,
    ],
    overviewLabel: '收紧项偏多，只保留可收尾事项',
    opportunities: [
      ({ primaryAction, primaryBoundary, bestWindow }) => `${windowLead(bestWindow)}${primaryAction}；${primaryBoundary}。`,
    ],
  },
};

function stableIndex(seed: string, length: number) {
  const value = [...seed].reduce((total, character) => (total * 33 + character.charCodeAt(0)) >>> 0, 5381);
  return value % length;
}

function pick(templates: PhraseTemplate[], context: FortuneReadingPhraseContext, seed: string) {
  return templates[stableIndex(seed, templates.length)](context);
}

export function renderFortuneReading(
  posture: FortuneReadingPosture,
  context: FortuneReadingPhraseContext,
  seed: string,
): FortuneReadingCopy {
  const corpus = fortuneReadingCorpus[posture];
  const summary = reasonedSummary(context);
  return {
    title: pick(corpus.titles, context, `${seed}|title`),
    summary,
    overviewLabel: corpus.overviewLabel,
    opportunity: pick(corpus.opportunities, context, `${seed}|opportunity`),
    caution: `${cautionLead(context.cautionWindow)}${context.cautionAction}`,
  };
}
