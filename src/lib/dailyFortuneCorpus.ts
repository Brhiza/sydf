export type FortuneReadingPosture = 'advance' | 'focus' | 'stabilize' | 'restore' | 'protect';

export interface FortuneReadingPhraseContext {
  lead: string;
  primaryLabel: string;
  secondaryLabel: string;
  cautionLabel: string;
  bestWindow: string;
  cautionWindow: string;
  primaryAction: string;
  cautionCheck: string;
  personalized: boolean;
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
      ({ primaryLabel, secondaryLabel, bestWindow, cautionLabel, mixed }) => `从整体看，主线清楚，${primaryLabel}最能带动局面，${secondaryLabel}可随之展开。${windowLead(bestWindow)}先完成关键一步，再逐项扩展。${mixed && cautionLabel ? `${cautionLabel}仍要守住边界，不宜因局部顺利而省略确认。` : '其余事项按既定次序跟进即可。'}`,
      ({ primaryLabel, secondaryLabel, bestWindow, cautionLabel, mixed }) => `整体助力较集中，不需要四处试探。先以${primaryLabel}打开局面，再衔接${secondaryLabel}；${windowLead(bestWindow)}动作可以明确，但仍要留有收尾空间。${mixed && cautionLabel ? `${cautionLabel}不宜同步冒进。` : ''}`,
    ],
    overviewLabel: '主线清楚，可顺势推进',
    opportunities: [
      ({ primaryAction, bestWindow }) => `${windowLead(bestWindow)}${primaryAction}，先形成一个明确成果，再考虑扩大范围。`,
      ({ primaryAction, bestWindow }) => `${windowLead(bestWindow)}${primaryAction}，把最有把握的一步落到实处。`,
    ],
    cautions: [
      ({ cautionCheck, cautionWindow }) => `${cautionLead(cautionWindow)}涉及${cautionCheck}时仍按正常流程确认，不因整体顺势而跳步。`,
    ],
  },
  focus: {
    titles: [
      ({ lead, primaryLabel }) => `${lead}有进有守，先抓住${primaryLabel}`,
      ({ lead, primaryLabel }) => `${lead}宜择一处发力，以${primaryLabel}为先`,
    ],
    summaries: [
      ({ primaryLabel, secondaryLabel, cautionLabel, bestWindow, cautionWindow }) => `这不是全面铺开的局面，而是有一处较清楚的着力点。${primaryLabel}可先行，${secondaryLabel}作为配合；${windowLead(bestWindow)}先做确定性高的部分。${cautionLabel ? `${cautionLead(cautionWindow)}${cautionLabel}不要急着定论。` : '其他事项暂不必同时加码。'}`,
      ({ primaryLabel, secondaryLabel, cautionLabel, bestWindow, cautionWindow }) => `整体信号并不平均，真正可用的是${primaryLabel}，${secondaryLabel}次之。${windowLead(bestWindow)}资源应向主线集中。${cautionLabel ? `${cautionLead(cautionWindow)}${cautionLabel}先留后手，避免一处反复拖慢全局。` : '其余方向保持弹性即可。'}`,
    ],
    overviewLabel: '有进有守，宜集中发力',
    opportunities: [
      ({ primaryAction, bestWindow }) => `${windowLead(bestWindow)}${primaryAction}，只推进最关键的一段，不同时摊开过多任务。`,
    ],
    cautions: [
      ({ cautionCheck, cautionWindow }) => `${cautionLead(cautionWindow)}先核对${cautionCheck}，条件未齐时保留调整空间。`,
    ],
  },
  stabilize: {
    titles: [
      ({ lead, primaryLabel }) => `${lead}先定次序，从${primaryLabel}稳住局面`,
      ({ lead }) => `${lead}宜稳中求进，不必急着求快`,
    ],
    summaries: [
      ({ primaryLabel, secondaryLabel, cautionLabel, bestWindow, cautionWindow }) => `从整体看，助力与牵制相互交错，关键不在多做，而在先后次序。先以${primaryLabel}稳住节奏，${secondaryLabel}等条件明确后再接上。${windowLead(bestWindow)}能落定的先落定；${cautionLabel ? `${cautionLead(cautionWindow)}${cautionLabel}需要多看一步。` : '暂时不明朗的部分不要勉强推进。'}`,
      ({ primaryLabel, secondaryLabel, cautionLabel, bestWindow, cautionWindow }) => `局面没有明显偏向，过快容易把小问题放大，过慢又会错过可用之处。${primaryLabel}可作为起点，${secondaryLabel}随后跟进。${windowLead(bestWindow)}先建立秩序，${cautionLabel ? `${cautionLead(cautionWindow)}${cautionLabel}以核实为先。` : '其余事项按实际反馈调整。'}`,
    ],
    overviewLabel: '整体平稳，次序比速度重要',
    opportunities: [
      ({ primaryAction, bestWindow }) => `${windowLead(bestWindow)}${primaryAction}，以能确认、能收尾为判断标准。`,
    ],
    cautions: [
      ({ cautionCheck, cautionWindow }) => `${cautionLead(cautionWindow)}涉及${cautionCheck}时先补齐信息，再决定是否继续。`,
    ],
  },
  restore: {
    titles: [
      ({ lead }) => `${lead}先养住状态，再安排重要事项`,
      ({ lead }) => `${lead}宜先整顿身心，不以勉强推进为先`,
    ],
    summaries: [
      ({ primaryLabel, secondaryLabel, cautionLabel, bestWindow, cautionWindow }) => `整体的关键不是机会多少，而是承接能力是否稳定。先把休息、饮食和精力恢复到可用状态，再处理${primaryLabel}；${secondaryLabel}只保留必要安排。${windowLead(bestWindow)}适合做轻量而确定的事。${cautionLabel ? `${cautionLead(cautionWindow)}${cautionLabel}不宜硬撑。` : ''}`,
      ({ primaryLabel, secondaryLabel, cautionLabel, bestWindow, cautionWindow }) => `当前局面容易受状态起伏牵动，先稳住人，再稳住事。${primaryLabel}可适量推进，${secondaryLabel}不要排得过满。${windowLead(bestWindow)}以恢复秩序为主；${cautionLabel ? `${cautionLead(cautionWindow)}${cautionLabel}先减负再判断。` : ''}`,
    ],
    overviewLabel: '先稳住状态，再处理事情',
    opportunities: [
      ({ primaryAction, bestWindow }) => `${windowLead(bestWindow)}${primaryAction}，控制任务量，并给休息和收尾留出固定时间。`,
    ],
    cautions: [
      ({ cautionCheck, cautionWindow }) => `${cautionLead(cautionWindow)}先照顾睡眠、饮食和实际精力；涉及${cautionCheck}的安排不要勉强落定。`,
    ],
  },
  protect: {
    titles: [
      ({ lead }) => `${lead}宜收不宜放，先守住基本盘`,
      ({ lead, primaryLabel }) => `${lead}先避开反复，以${primaryLabel}维持节奏`,
    ],
    summaries: [
      ({ primaryLabel, secondaryLabel, cautionLabel, bestWindow, cautionWindow }) => `从整体看，牵制多于助力，当前不以扩张为要。${primaryLabel}是相对可控的落点，${secondaryLabel}只做必要维护。${windowLead(bestWindow)}先处理能确认、能收尾的部分。${cautionLabel ? `${cautionLead(cautionWindow)}${cautionLabel}宁可延后，也不要在信息不足时定局。` : '重大决定宜多留一道复核。'}`,
      ({ primaryLabel, secondaryLabel, cautionLabel, bestWindow, cautionWindow }) => `眼下最重要的是减少失误，而不是追求进度。以${primaryLabel}守住日常秩序，${secondaryLabel}避免增加变量。${windowLead(bestWindow)}小步处理即可；${cautionLabel ? `${cautionLead(cautionWindow)}${cautionLabel}先止损、再观察。` : '不确定事项暂缓落定。'}`,
    ],
    overviewLabel: '牵制偏多，先守住基本盘',
    opportunities: [
      ({ primaryAction, bestWindow }) => `${windowLead(bestWindow)}${primaryAction}，只做范围清楚且随时可以收回的部分。`,
    ],
    cautions: [
      ({ cautionCheck, cautionWindow }) => `${cautionLead(cautionWindow)}先核对${cautionCheck}；没有把握的决定延后，不用勉强推进。`,
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
  return {
    title: pick(corpus.titles, context, `${seed}|title`),
    summary: pick(corpus.summaries, context, `${seed}|summary`),
    overviewLabel: corpus.overviewLabel,
    opportunity: pick(corpus.opportunities, context, `${seed}|opportunity`),
    caution: pick(corpus.cautions, context, `${seed}|caution`),
  };
}
