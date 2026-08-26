export type FortuneReadingPosture = 'advance' | 'focus' | 'cultivate' | 'resolve' | 'stabilize' | 'restore' | 'protect';

export interface FortuneReadingPhraseContext {
  lead: string;
  primaryLabel: string;
  primaryShortLabel: string;
  primaryOutcome: string;
  periodUnit: string;
  secondaryRole: string;
  cautionLabel: string;
  bestWindow: string;
  cautionWindow: string;
  primaryAction: string;
  primaryBoundary: string;
  cautionAction: string;
  primaryReason: string;
  cautionReason: string;
  mixed: boolean;
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
  summaries: PhraseTemplate[];
  overviewLabel: string;
  opportunities: PhraseTemplate[];
}

function windowLead(window: string) {
  return window ? `${window}，` : '';
}

function cautionLead(window: string) {
  return window ? `${window}，` : '';
}

function reasonedSummary(base: string, context: FortuneReadingPhraseContext) {
  return [base.trim(), context.primaryReason.trim(), context.cautionLabel ? context.cautionReason.trim() : '']
    .filter(Boolean)
    .join('');
}

const fortuneReadingCorpus: Record<FortuneReadingPosture, FortuneReadingCorpusEntry> = {
  advance: {
    titles: [
      ({ lead, primaryShortLabel, primaryOutcome }) => `${lead}${primaryShortLabel}信号集中，先确认${primaryOutcome}`,
      ({ lead, primaryShortLabel, primaryOutcome }) => `${lead}多数信号支持${primaryShortLabel}，先形成${primaryOutcome}`,
    ],
    summaries: [
      ({ primaryLabel, primaryOutcome, secondaryRole }) => `${primaryLabel}的顺势窗口和完成条件都更集中，先形成${primaryOutcome}；${secondaryRole}。`,
      ({ primaryLabel, primaryOutcome, secondaryRole }) => `${primaryLabel}比其他主题更容易形成${primaryOutcome}，后续投入先围绕这个结果安排；${secondaryRole}。`,
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
    summaries: [
      ({ primaryLabel, primaryOutcome, secondaryRole }) => `强弱分化已经出现，${primaryLabel}先形成${primaryOutcome}，其他主题不占用同一段精力；${secondaryRole}。`,
      ({ primaryLabel, primaryOutcome, secondaryRole }) => `${primaryLabel}是当前最容易验证的一项，先看${primaryOutcome}能否成立；${secondaryRole}。`,
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
    summaries: [
      ({ primaryLabel, primaryOutcome, secondaryRole }) => `各主题的助力与牵制接近，先检查${primaryLabel}能否形成${primaryOutcome}；${secondaryRole}。`,
      ({ primaryLabel, primaryOutcome, secondaryRole }) => `当前没有单一强项，${primaryLabel}先完成${primaryOutcome}，再看其他条件能否承接；${secondaryRole}。`,
    ],
    overviewLabel: '助力与牵制接近，先看完成条件',
    opportunities: [
      ({ primaryAction, primaryBoundary, bestWindow }) => `${windowLead(bestWindow)}${primaryAction}；${primaryBoundary}。`,
    ],
  },
  cultivate: {
    titles: [
      ({ lead, primaryShortLabel, periodUnit }) => `${lead}多数${periodUnit}平稳，先稳定${primaryShortLabel}节奏`,
      ({ lead, primaryShortLabel }) => `${lead}没有持续风险，先建立${primaryShortLabel}的固定方法`,
      ({ lead, primaryShortLabel, primaryOutcome }) => `${lead}没有连续助力，先看${primaryShortLabel}能否形成${primaryOutcome}`,
    ],
    summaries: [
      ({ primaryLabel, secondaryRole }) => `没有持续性强的风险，但助力分散，先围绕${primaryLabel}积累可检查的结果；${secondaryRole}。`,
      ({ primaryLabel, secondaryRole }) => `多数窗口保持平稳，${primaryLabel}要看连续反馈，不把一次顺利当成趋势；${secondaryRole}。`,
      ({ primaryLabel, primaryOutcome, secondaryRole }) => `连续助力不足，${primaryLabel}先形成${primaryOutcome}，再判断投入是否值得继续；${secondaryRole}。`,
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
    summaries: [
      ({ primaryLabel, primaryOutcome, secondaryRole, cautionLabel }) => `${cautionLabel ? `${cautionLabel}的反复` : '待确认事项'}集中在可检查条件，并非所有主题同时受阻；${primaryLabel}先形成${primaryOutcome}，${secondaryRole}。`,
      ({ primaryLabel, primaryOutcome, cautionLabel }) => `${cautionLabel ? `${cautionLabel}的关键条件` : '最容易反复的一环'}尚未闭合，${primaryLabel}只保留能形成${primaryOutcome}的部分。`,
      ({ primaryLabel, primaryOutcome, cautionLabel }) => `${cautionLabel ? `${cautionLabel}的同类问题` : '一处牵制'}正在重复出现，${primaryLabel}只完成${primaryOutcome}，不承接依赖它的新安排。`,
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
    summaries: [
      ({ primaryLabel, primaryOutcome, secondaryRole }) => `当前承载量偏低，先删去一项非必要安排，${primaryLabel}只保留能形成${primaryOutcome}的一步；${secondaryRole}。`,
      ({ primaryLabel, primaryOutcome, secondaryRole }) => `状态波动会放大返工，${primaryLabel}只安排能独立收尾的一步，以${primaryOutcome}作为停止点；${secondaryRole}。`,
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
    summaries: [
      ({ primaryLabel, primaryOutcome, secondaryRole }) => `牵制多于助力，${primaryLabel}只保留能形成${primaryOutcome}且条件已经确认的部分；${secondaryRole}。`,
      ({ primaryLabel, primaryOutcome, secondaryRole }) => `多项条件同时不稳，先停止新增承诺，${primaryLabel}只完成${primaryOutcome}；${secondaryRole}。`,
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
  const summary = reasonedSummary(pick(corpus.summaries, context, `${seed}|summary`), context);
  return {
    title: pick(corpus.titles, context, `${seed}|title`),
    summary,
    overviewLabel: corpus.overviewLabel,
    opportunity: pick(corpus.opportunities, context, `${seed}|opportunity`),
    caution: `${cautionLead(context.cautionWindow)}${context.cautionAction}`,
  };
}
