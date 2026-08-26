export type FortuneReadingPosture = 'advance' | 'focus' | 'cultivate' | 'resolve' | 'stabilize' | 'restore' | 'protect';

export interface FortuneReadingPhraseContext {
  lead: string;
  primaryLabel: string;
  secondaryLabel: string;
  cautionLabel: string;
  bestWindow: string;
  cautionWindow: string;
  primaryAction: string;
  cautionAction: string;
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
  cautions: PhraseTemplate[];
}

function windowLead(window: string) {
  return window ? `${window}是较好的落点，` : '';
}

function cautionLead(window: string) {
  return window ? `${window}这段时间尤其要留出复核余地，` : '';
}

const fortuneReadingCorpus: Record<FortuneReadingPosture, FortuneReadingCorpusEntry> = {
  advance: {
    titles: [
      ({ lead, primaryLabel }) => `${lead}气势较整，先把${primaryLabel}做实`,
      ({ lead, primaryLabel }) => `${lead}可顺势推进，重心放在${primaryLabel}`,
    ],
    summaries: [
      ({ primaryLabel, secondaryLabel, cautionLabel, mixed }) => `从整体看，主线清楚，${primaryLabel}最能带动局面，${secondaryLabel}可随之展开。先完成关键一步，再逐项扩展。${mixed && cautionLabel ? `${cautionLabel}仍要守住边界，不宜因局部顺利而省略确认。` : '没有被列为主线的事项，只维持已经开始且能按时收尾的部分。'}`,
      ({ primaryLabel, secondaryLabel, cautionLabel, mixed }) => `整体助力较集中，不需要四处试探。先以${primaryLabel}打开局面，再衔接${secondaryLabel}；动作可以明确，但仍要留有收尾空间。${mixed && cautionLabel ? `${cautionLabel}不宜同步冒进。` : ''}`,
    ],
    overviewLabel: '主线清楚，可顺势推进',
    opportunities: [
      ({ primaryAction, bestWindow }) => `${windowLead(bestWindow)}${primaryAction}，先形成一个明确成果，再考虑扩大范围。`,
      ({ primaryAction, bestWindow }) => `${windowLead(bestWindow)}${primaryAction}，把最有把握的一步落到实处。`,
    ],
    cautions: [
      ({ cautionAction, cautionWindow }) => `${cautionLead(cautionWindow)}${cautionAction}这一步检查完成前，不进入承诺或不可回退的阶段。`,
    ],
  },
  focus: {
    titles: [
      ({ lead, primaryLabel }) => `${lead}有进有守，先抓住${primaryLabel}`,
      ({ lead, primaryLabel }) => `${lead}宜择一处发力，以${primaryLabel}为先`,
    ],
    summaries: [
      ({ primaryLabel, secondaryLabel, cautionLabel }) => `这不是全面铺开的局面，而是有一处较清楚的着力点。${primaryLabel}可先行，${secondaryLabel}作为配合；先做确定性高的部分。${cautionLabel ? `${cautionLabel}不要急着定论，以免局部反复拖慢主线。` : '其他事项只保留必要维护，等主线收尾再接上。'}`,
      ({ primaryLabel, secondaryLabel, cautionLabel }) => `整体信号并不平均，真正可用的是${primaryLabel}，${secondaryLabel}次之，资源应向主线集中。${cautionLabel ? `${cautionLabel}先留后手，避免一处反复拖慢全局。` : '其余方向只做准备，不提前占用主线时间。'}`,
    ],
    overviewLabel: '有进有守，宜集中发力',
    opportunities: [
      ({ primaryAction, bestWindow }) => `${windowLead(bestWindow)}${primaryAction}，只推进最关键的一段，不同时摊开过多任务。`,
    ],
    cautions: [
      ({ cautionAction, cautionWindow }) => `${cautionLead(cautionWindow)}${cautionAction}这些条件没有确认齐全前，只保留可回退的准备动作。`,
    ],
  },
  stabilize: {
    titles: [
      ({ lead, primaryLabel }) => `${lead}先定次序，从${primaryLabel}稳住局面`,
      ({ lead }) => `${lead}宜稳中求进，不必急着求快`,
    ],
    summaries: [
      ({ primaryLabel, secondaryLabel, cautionLabel }) => `从整体看，助力与牵制相互交错，关键不在多做，而在先后次序。先以${primaryLabel}稳住节奏，${secondaryLabel}等条件明确后再接上。${cautionLabel ? `${cautionLabel}需要多看一步，不能让未确认的条件打乱主线。` : '暂时不明朗的部分不要勉强推进。'}`,
      ({ primaryLabel, secondaryLabel, cautionLabel }) => `局面没有明显偏向，过快容易把小问题放大，过慢又会错过可用之处。${primaryLabel}可作为起点，${secondaryLabel}随后跟进。${cautionLabel ? `${cautionLabel}以核实为先，再决定是否接入主线。` : '其余事项根据实际进展调整次序。'}`,
    ],
    overviewLabel: '整体平稳，次序比速度重要',
    opportunities: [
      ({ primaryAction, bestWindow }) => `${windowLead(bestWindow)}${primaryAction}，以能确认、能收尾为判断标准。`,
    ],
    cautions: [
      ({ cautionAction, cautionWindow }) => `${cautionLead(cautionWindow)}${cautionAction}把确认结果作为是否继续的分界。`,
    ],
  },
  cultivate: {
    titles: [
      ({ lead, primaryLabel }) => `${lead}宜先蓄力，把${primaryLabel}做扎实`,
      ({ lead, primaryLabel }) => `${lead}重在积累，以${primaryLabel}带动后续`,
      ({ lead }) => `${lead}没有明显阻力，适合稳步积累`,
    ],
    summaries: [
      ({ primaryLabel, secondaryLabel }) => `整体没有明显冲突，但助力尚未集中到适合大幅推进的程度。先把${primaryLabel}做扎实，${secondaryLabel}保持连续性，以积累成果和校正方向为主。`,
      ({ primaryLabel, secondaryLabel }) => `局面平顺而不张扬，最适合把已有基础往前推一层。${primaryLabel}作为长期着力点，${secondaryLabel}维持稳定投入；不求一步到位，重在形成连续进展。`,
      ({ primaryLabel, secondaryLabel }) => `当前更像培土蓄势，而不是抢快争先。先围绕${primaryLabel}完善基础，再让${secondaryLabel}逐步接上，把可重复的做法固定下来。`,
    ],
    overviewLabel: '阻力不强，适合稳步积累',
    opportunities: [
      ({ primaryAction, bestWindow }) => `${windowLead(bestWindow)}${primaryAction}，把这一步做成可以持续复用的基础。`,
      ({ primaryAction, bestWindow }) => `${windowLead(bestWindow)}${primaryAction}，先求稳定完成，再逐步提高强度。`,
    ],
    cautions: [
      ({ cautionAction, cautionWindow }) => `${cautionLead(cautionWindow)}${cautionAction}同一偏差连续出现两次，就降低这一项的安排强度。`,
    ],
  },
  resolve: {
    titles: [
      ({ lead, cautionLabel }) => `${lead}先解开${cautionLabel || '眼前牵制'}，再谈推进`,
      ({ lead, primaryLabel }) => `${lead}先处理卡点，以${primaryLabel}维持节奏`,
      ({ lead }) => `${lead}先清理一处阻力，局面自然会顺一些`,
    ],
    summaries: [
      ({ primaryLabel, secondaryLabel, cautionLabel }) => `整体并非全面受阻，真正影响节奏的是${cautionLabel || '一处尚未确认的环节'}。先用${primaryLabel}维持必要进度，${secondaryLabel}暂作配合；把卡点处理清楚后，再决定是否加速。`,
      ({ primaryLabel, secondaryLabel, cautionLabel }) => `当前不需要全面收缩，但必须先解决${cautionLabel || '最容易反复的一环'}。${primaryLabel}负责稳住进度，${secondaryLabel}保持弹性，不让局部问题扩散到其他安排。`,
      ({ primaryLabel, cautionLabel }) => `局面的关键在于先拆掉一处牵制。${primaryLabel}仍可维持，${cautionLabel || '待确认事项'}不宜绕过去；只落地确定部分，条件厘清后再继续。`,
    ],
    overviewLabel: '局部受阻，先解决关键卡点',
    opportunities: [
      ({ primaryAction, bestWindow }) => `${windowLead(bestWindow)}${primaryAction}，只维持必要进度，不额外增加变量。`,
      ({ primaryAction, bestWindow }) => `${windowLead(bestWindow)}${primaryAction}，先守住确定成果，再处理卡点。`,
    ],
    cautions: [
      ({ cautionAction, cautionWindow }) => `${cautionLead(cautionWindow)}${cautionAction}卡点没有处理清楚前，不恢复原来的推进强度。`,
    ],
  },
  restore: {
    titles: [
      ({ lead }) => `${lead}先养住状态，再安排重要事项`,
      ({ lead }) => `${lead}宜先整顿身心，不以勉强推进为先`,
    ],
    summaries: [
      ({ primaryLabel, secondaryLabel, cautionLabel }) => `整体的关键不是机会多少，而是承接能力是否稳定。先把休息、饮食和精力恢复到可用状态，再处理${primaryLabel}；${secondaryLabel}只保留必要安排。${cautionLabel ? `${cautionLabel}不宜硬撑。` : ''}`,
      ({ primaryLabel, secondaryLabel, cautionLabel }) => `当前局面容易受状态起伏牵动，先稳住人，再稳住事。${primaryLabel}可适量推进，${secondaryLabel}不要排得过满。${cautionLabel ? `${cautionLabel}先减负再判断。` : ''}`,
    ],
    overviewLabel: '先稳住状态，再处理事情',
    opportunities: [
      ({ primaryAction, bestWindow }) => `${windowLead(bestWindow)}${primaryAction}，控制任务量，并给休息和收尾留出固定时间。`,
    ],
    cautions: [
      ({ cautionAction, cautionWindow }) => `${cautionLead(cautionWindow)}${cautionAction}同时按睡眠、饮食和实际精力删减任务。`,
    ],
  },
  protect: {
    titles: [
      ({ lead }) => `${lead}宜收不宜放，先守住基本盘`,
      ({ lead, primaryLabel }) => `${lead}先避开反复，以${primaryLabel}维持节奏`,
    ],
    summaries: [
      ({ primaryLabel, secondaryLabel, cautionLabel }) => `从整体看，牵制多于助力，当前不以扩张为要。${primaryLabel}是相对可控的落点，${secondaryLabel}只做必要维护。${cautionLabel ? `${cautionLabel}宁可延后，也不要在信息不足时定局。` : '没有完成资料核对与责任确认的事项，本期不进入承诺阶段。'}`,
      ({ primaryLabel, secondaryLabel, cautionLabel }) => `眼下最重要的是减少失误，而不是追求进度。以${primaryLabel}守住日常秩序，${secondaryLabel}避免增加变量。${cautionLabel ? `${cautionLabel}先止损、再观察。` : '责任、金额或时间边界仍不清楚的事项，暂不承诺。'}`,
    ],
    overviewLabel: '牵制偏多，先守住基本盘',
    opportunities: [
      ({ primaryAction, bestWindow }) => `${windowLead(bestWindow)}${primaryAction}，只做范围清楚且随时可以收回的部分。`,
    ],
    cautions: [
      ({ cautionAction, cautionWindow }) => `${cautionLead(cautionWindow)}${cautionAction}风险没有解除前，不新增承诺或不可回退的动作。`,
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
  const summary = pick(corpus.summaries, context, `${seed}|summary`).trim();
  return {
    title: pick(corpus.titles, context, `${seed}|title`),
    summary: [summary, context.personalClause.trim()].filter(Boolean).join(' '),
    overviewLabel: corpus.overviewLabel,
    opportunity: pick(corpus.opportunities, context, `${seed}|opportunity`),
    caution: pick(corpus.cautions, context, `${seed}|caution`),
  };
}
