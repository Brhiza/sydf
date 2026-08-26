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
      ({ primaryLabel, secondaryRole }) => `整体主线清楚，${primaryLabel}先形成结果；${secondaryRole}。`,
      ({ primaryLabel, secondaryRole }) => `助力集中在${primaryLabel}，不需要四处试探；${secondaryRole}。`,
    ],
    overviewLabel: '主线清楚，可顺势推进',
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
      ({ primaryLabel, secondaryRole }) => `整体信号并不平均，资源应集中在${primaryLabel}；${secondaryRole}。`,
      ({ primaryLabel, secondaryRole }) => `${primaryLabel}是当前最清楚的着力点；${secondaryRole}。`,
    ],
    overviewLabel: '有进有守，宜集中发力',
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
      ({ primaryLabel, secondaryRole }) => `助力与牵制相互交错，次序比速度重要；${primaryLabel}先行，${secondaryRole}。`,
      ({ primaryLabel, secondaryRole }) => `局面没有明显偏向，以${primaryLabel}作为起点；${secondaryRole}。`,
    ],
    overviewLabel: '整体平稳，次序比速度重要',
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
    overviewLabel: '多数窗口平稳，以积累为主',
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
      ({ primaryLabel, secondaryRole, cautionLabel }) => `整体并非全面受阻，${cautionLabel ? `${cautionLabel}里的反复` : '待确认事项'}是当前卡点；${primaryLabel}维持一个闭环，${secondaryRole}。`,
      ({ primaryLabel, cautionLabel }) => `当前不需要全面收缩，但必须先查清${cautionLabel ? `${cautionLabel}的关键条件` : '最容易反复的一环'}，${primaryLabel}只维持能够独立收尾的部分。`,
      ({ primaryLabel, cautionLabel }) => `局面的关键在于处理${cautionLabel ? `${cautionLabel}里的反复` : '一处牵制'}，${primaryLabel}只落地条件确定的部分。`,
    ],
    overviewLabel: '局部受阻，先解决关键卡点',
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
      ({ primaryLabel, secondaryRole }) => `当前承接能力比机会多少更重要，先恢复状态，再处理${primaryLabel}；${secondaryRole}。`,
      ({ primaryLabel, secondaryRole }) => `局面容易受状态起伏牵动，${primaryLabel}只安排能够独立收尾的一步；${secondaryRole}。`,
    ],
    overviewLabel: '先稳住状态，再处理事情',
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
      ({ primaryLabel, secondaryRole }) => `牵制多于助力，${primaryLabel}只保留条件已经确认的部分；${secondaryRole}。`,
      ({ primaryLabel, secondaryRole }) => `多项条件同时不稳，先减少新增承诺，${primaryLabel}以能够独立收尾为限；${secondaryRole}。`,
    ],
    overviewLabel: '牵制偏多，先守住基本盘',
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
