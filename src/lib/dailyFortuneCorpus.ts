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
      ({ secondaryRole }) => `${secondaryRole}。主线结果能被下一环接住，优势才会从一次顺利变成可持续进展。`,
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
      ({ secondaryRole }) => `${secondaryRole}。主线与其他事项同时占用同一段精力时，最容易出现多项结果都没有闭合。`,
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
      ({ secondaryRole }) => `${secondaryRole}。各项差距接近时，先后次序主要用于减少互相等待和返工。`,
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
      ({ secondaryRole }) => `${secondaryRole}。连续反馈比单次顺利更能说明方法是否稳定。`,
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
      ({ secondaryRole, cautionLabel }) => `${secondaryRole}。${cautionLabel || '牵制环节'}没有闭合时，后续安排会不断重算条件。`,
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
      ({ secondaryRole }) => `${secondaryRole}。承载量下降时，遗漏、拖延和返工通常会同时增加。`,
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
      ({ secondaryRole }) => `${secondaryRole}。多项条件同时不稳时，新增承诺会把局部问题串成连锁返工。`,
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
