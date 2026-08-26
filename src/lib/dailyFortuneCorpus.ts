export type FortuneReadingPosture = 'advance' | 'focus' | 'cultivate' | 'resolve' | 'stabilize' | 'restore' | 'protect';

export interface FortuneReadingPhraseContext {
  lead: string;
  primaryLabel: string;
  secondaryLabel: string;
  cautionLabel: string;
  bestWindow: string;
  cautionWindow: string;
  primaryAction: string;
  primaryBoundary: string;
  cautionAction: string;
  primaryReason: string;
  cautionReason: string;
  personalClause: string;
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
  return [base.trim(), context.primaryReason.trim(), context.cautionLabel ? context.cautionReason.trim() : '', context.personalClause.trim()]
    .filter(Boolean)
    .join('');
}

const fortuneReadingCorpus: Record<FortuneReadingPosture, FortuneReadingCorpusEntry> = {
  advance: {
    titles: [
      ({ lead, primaryLabel }) => `${lead}气势较整，先把${primaryLabel}做实`,
      ({ lead, primaryLabel }) => `${lead}可顺势推进，重心放在${primaryLabel}`,
    ],
    summaries: [
      ({ primaryLabel, secondaryLabel }) => `整体主线清楚，${primaryLabel}先形成结果，${secondaryLabel}再承接已有进展。`,
      ({ primaryLabel, secondaryLabel }) => `助力集中在${primaryLabel}，不需要四处试探；${secondaryLabel}适合接在主线之后。`,
    ],
    overviewLabel: '主线清楚，可顺势推进',
    opportunities: [
      ({ primaryAction, primaryBoundary, bestWindow }) => `${windowLead(bestWindow)}${primaryAction}；${primaryBoundary}。`,
    ],
  },
  focus: {
    titles: [
      ({ lead, primaryLabel }) => `${lead}有进有守，先抓住${primaryLabel}`,
      ({ lead, primaryLabel }) => `${lead}宜择一处发力，以${primaryLabel}为先`,
    ],
    summaries: [
      ({ primaryLabel, secondaryLabel }) => `整体信号并不平均，资源应集中在${primaryLabel}，${secondaryLabel}作为配合。`,
      ({ primaryLabel, secondaryLabel }) => `${primaryLabel}是当前最清楚的着力点，${secondaryLabel}可以承接，但不抢占主线资源。`,
    ],
    overviewLabel: '有进有守，宜集中发力',
    opportunities: [
      ({ primaryAction, primaryBoundary, bestWindow }) => `${windowLead(bestWindow)}${primaryAction}；${primaryBoundary}。`,
    ],
  },
  stabilize: {
    titles: [
      ({ lead, primaryLabel }) => `${lead}先定次序，从${primaryLabel}稳住局面`,
      ({ lead }) => `${lead}宜稳中求进，不必急着求快`,
    ],
    summaries: [
      ({ primaryLabel, secondaryLabel }) => `助力与牵制相互交错，次序比速度重要；${primaryLabel}先行，${secondaryLabel}随后。`,
      ({ primaryLabel, secondaryLabel }) => `局面没有明显偏向，以${primaryLabel}作为起点，再根据结果接上${secondaryLabel}。`,
    ],
    overviewLabel: '整体平稳，次序比速度重要',
    opportunities: [
      ({ primaryAction, primaryBoundary, bestWindow }) => `${windowLead(bestWindow)}${primaryAction}；${primaryBoundary}。`,
    ],
  },
  cultivate: {
    titles: [
      ({ lead, primaryLabel }) => `${lead}宜先蓄力，把${primaryLabel}做扎实`,
      ({ lead, primaryLabel }) => `${lead}重在积累，以${primaryLabel}带动后续`,
      ({ lead }) => `${lead}没有明显阻力，适合稳步积累`,
    ],
    summaries: [
      ({ primaryLabel, secondaryLabel }) => `阻力不强但助力分散，适合围绕${primaryLabel}积累基础，让${secondaryLabel}保持连续。`,
      ({ primaryLabel, secondaryLabel }) => `局面平顺而不张扬，${primaryLabel}适合形成可重复的做法，${secondaryLabel}维持稳定投入。`,
      ({ primaryLabel, secondaryLabel }) => `当前更像培土蓄势，以${primaryLabel}校正方向，再让${secondaryLabel}逐步接上。`,
    ],
    overviewLabel: '阻力不强，适合稳步积累',
    opportunities: [
      ({ primaryAction, primaryBoundary, bestWindow }) => `${windowLead(bestWindow)}${primaryAction}；${primaryBoundary}。`,
    ],
  },
  resolve: {
    titles: [
      ({ lead, cautionLabel }) => `${lead}先解开${cautionLabel || '眼前牵制'}，再谈推进`,
      ({ lead, primaryLabel }) => `${lead}先处理卡点，以${primaryLabel}维持节奏`,
      ({ lead }) => `${lead}先清理牵制，再恢复主线`,
    ],
    summaries: [
      ({ primaryLabel, secondaryLabel, cautionLabel }) => `整体并非全面受阻，${cautionLabel || '待确认事项'}是当前卡点；${primaryLabel}维持一个闭环，${secondaryLabel}暂作配合。`,
      ({ primaryLabel, cautionLabel }) => `当前不需要全面收缩，但必须先处理${cautionLabel || '最容易反复的一环'}，${primaryLabel}只维持能够独立收尾的部分。`,
      ({ primaryLabel, cautionLabel }) => `局面的关键在于拆掉${cautionLabel || '一处牵制'}，${primaryLabel}只落地条件确定的部分。`,
    ],
    overviewLabel: '局部受阻，先解决关键卡点',
    opportunities: [
      ({ primaryAction, primaryBoundary, bestWindow }) => `${windowLead(bestWindow)}${primaryAction}，只保留当前一条线；${primaryBoundary}。`,
      ({ primaryAction, primaryBoundary, bestWindow }) => `${windowLead(bestWindow)}${primaryAction}；${primaryBoundary}。`,
    ],
  },
  restore: {
    titles: [
      ({ lead }) => `${lead}先养住状态，再安排重要事项`,
      ({ lead }) => `${lead}宜先整顿身心，不以勉强推进为先`,
    ],
    summaries: [
      ({ primaryLabel, secondaryLabel }) => `当前承接能力比机会多少更重要，先恢复状态，再处理${primaryLabel}；${secondaryLabel}只保留必要安排。`,
      ({ primaryLabel, secondaryLabel }) => `局面容易受状态起伏牵动，${primaryLabel}只安排能够独立收尾的一步，${secondaryLabel}不再加量。`,
    ],
    overviewLabel: '先稳住状态，再处理事情',
    opportunities: [
      ({ primaryAction, primaryBoundary, bestWindow }) => `${windowLead(bestWindow)}${primaryAction}，同时删去一项非必要安排；${primaryBoundary}。`,
    ],
  },
  protect: {
    titles: [
      ({ lead }) => `${lead}宜收不宜放，先守住基本盘`,
      ({ lead, primaryLabel }) => `${lead}先避开反复，以${primaryLabel}维持节奏`,
    ],
    summaries: [
      ({ primaryLabel, secondaryLabel }) => `牵制多于助力，先以${primaryLabel}守住基本盘，${secondaryLabel}不增加变量。`,
      ({ primaryLabel, secondaryLabel }) => `当前重点是减少失误，以${primaryLabel}维持秩序，${secondaryLabel}只做必要维护。`,
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
