import { BASIC_MAPPINGS, HIDDEN_STEMS, baziCalculator } from 'mingyu-core/bazi';
import type { AlmanacDayCandidate, AlmanacParticipantProfile } from 'mingyu-core/types';
import type { BaziAnalysisResult, BaziChartResult } from 'mingyu-core/bazi';
import { createAlmanacParticipant, type AlmanacProfile } from './almanac';

export function getPersonalAlmanacChart(profile: AlmanacProfile): BaziChartResult {
  const input = createAlmanacParticipant(profile);
  return baziCalculator.calculateBazi({
    year: Number(input.year), month: Number(input.month), day: Number(input.day),
    timeIndex: Number(input.timeIndex), gender: profile.gender,
    isLunar: input.dateType === 'lunar', isLeapMonth: input.isLeapMonth,
    useTrueSolarTime: false,
  });
}

interface DayTheme {
  title: string;
  meaning: string;
  action: string;
  caution: string;
  keyword: string;
}

const themes: Record<string, DayTheme> = {
  比肩: { title: '自主推进', meaning: '比肩对应自主、同伴与平等协作。', action: '选一件自己能拍板的小事先完成；需要协作的部分，约好各自负责什么。', caution: '意见不同时先对齐目标，不把讨论变成争输赢。', keyword: '自主' },
  劫财: { title: '厘清分工', meaning: '劫财对应同伴之间的竞争与资源分配。', action: '合作前说清投入、分工与费用，口头约定补一条双方确认的记录。', caution: '不因人情或攀比临时增加支出，先看自己的预算。', keyword: '分工' },
  食神: { title: '打磨成果', meaning: '食神对应稳定输出、表达与日常滋养。', action: '留一段不被打扰的时间，把已有想法做成一份能展示的小成果。', caution: '先完成再润色，别让准备和享受挤掉真正动手的时间。', keyword: '输出' },
  伤官: { title: '表达与改进', meaning: '伤官对应表达、创新与对既有做法的质疑。', action: '挑一处不顺手的流程，带着具体例子提出一个可验证的改法。', caution: '指出问题时同时给方案；涉及规则，先确认哪些边界不能改。', keyword: '改进' },
  正财: { title: '落实与核对', meaning: '正财对应可计量的投入、回报与日常经营。', action: '核对一笔账、一项交付或一个付款节点，把待确认的金额和日期问清楚。', caution: '先算时间和成本，再答应新增任务；不把预期收入当成已到账。', keyword: '落实' },
  偏财: { title: '筛选机会', meaning: '偏财对应流动资源、外部机会与灵活调配。', action: '把一个新机会的来源、成本和退出条件问清，再决定是否投入时间。', caution: '消息多不等于机会好，不因催促或热闹仓促付款。', keyword: '筛选' },
  正官: { title: '按序推进', meaning: '正官对应规则、责任与有序履约。', action: '检查一份申请、流程或交付物，把格式、责任人和时间节点补齐。', caution: '规则与实际情况不一致时先确认例外，不靠猜测替别人作决定。', keyword: '秩序' },
  七杀: { title: '拆解压力', meaning: '七杀对应约束、挑战与应对压力。', action: '把最紧迫的任务拆成下一步，先确认期限和最低完成标准。', caution: '被催促时先核对事实；超出承受范围的要求，及时说明并协调。', keyword: '应对' },
  正印: { title: '学习与整理', meaning: '正印对应学习、支持与已有经验的吸收。', action: '围绕眼前问题查一份可靠资料，记下能立即用上的方法并试一次。', caution: '别用持续收集资料代替行动，遇到卡点就带着具体问题请教。', keyword: '学习' },
  偏印: { title: '观察与验证', meaning: '偏印对应独立观察、研究与不同角度的理解。', action: '记下一个值得追问的细节，区分已知事实和猜想，再做一次小验证。', caution: '线索不足时保留问号，不把直觉当结论，也不替别人揣测动机。', keyword: '验证' },
};

const stems = '甲乙丙丁戊己庚辛壬癸';
const branches = '子丑寅卯辰巳午未申酉戌亥';

function strengthGuidance(analysis: BaziAnalysisResult, relation: string, element: string) {
  const strength = analysis.dayMasterStrength.status;
  const details = analysis.dayMasterStrength.details;
  const useful = analysis.usefulGod;
  const favorable = useful.favorableWuxing ?? useful.favorable.filter((item) => /^[木火土金水]$/.test(item));
  const unfavorable = useful.unfavorableWuxing ?? useful.unfavorable.filter((item) => /^[木火土金水]$/.test(item));
  const supported = favorable.includes(element);
  const constrained = unfavorable.includes(element);
  const special = analysis.mingGe.isSpecial || /极强|极弱/.test(strength);
  const supportRelation = ['比肩', '劫财', '正印', '偏印'].includes(relation);
  const effect = supportRelation ? '生扶日主' : ['食神', '伤官'].includes(relation) ? '泄秀输出'
    : ['正财', '偏财'].includes(relation) ? '耗身任财' : '约束日主';
  let approach: 'advance' | 'pace' | 'balanced' = 'balanced';
  let reason: string;
  if (supported && constrained) {
    reason = `当日${element}同时涉及原局喜忌，作用有取舍，先做小范围尝试。`;
  } else if (supported || constrained) {
    approach = supported ? 'advance' : 'pace';
    reason = `当日${element}落在原局${supported ? '喜用' : '忌神'}五行，${supported ? '可借当天主题推进已有计划' : '宜收窄投入，先处理必要部分'}。`;
  } else if (special) {
    reason = '需结合格局取用，当日五行未明确命中喜忌，暂不单凭强弱增加或减少安排。';
  } else if (/强/.test(strength) || /弱/.test(strength)) {
    const strong = /强/.test(strength);
    approach = strong !== supportRelation ? 'advance' : 'pace';
    reason = approach === 'advance'
      ? supportRelation ? '可把支持用在请教、学习或协作上，先补足手头任务的条件。' : '可把精力落到输出、履约或解决问题上，一次推进一件。'
      : supportRelation ? '生扶不必继续加码，把已有想法付诸行动，少做重复准备。' : '先衡量手头任务的承接量，缩小目标，避免同时追加投入与责任。';
  } else if (strength === '中和') {
    reason = '以维持平衡为主，按已有节奏推进，完成一项再看是否加量。';
  } else {
    reason = '强弱依据暂未明确，先按现有计划安排，不据此增加投入或责任。';
  }
  const actionByRelation: Record<string, string> = {
    比肩: '先完成自己负责的部分，协作事项约清接口，不另开一条任务线。',
    劫财: '只确认已有合作的分工与费用，预算未明前不追加投入。',
    食神: '把输出缩成一份短稿或一个样例，完成后再决定是否扩展。',
    伤官: '只验证一个改进点，先向相关人确认边界，再调整流程。',
    正财: '先核对已有账目与交付，确认余力后再接新增任务。',
    偏财: '先收集机会信息，问清成本与退出条件，暂不急着投入。',
    正官: '先完成必须履行的流程，新增责任先谈清资源和期限。',
    七杀: '把紧迫任务缩到最低完成标准，先协调支援，再承诺追加工作。',
    正印: '只查与当前问题直接相关的资料，找到方法就动手试一次。',
    偏印: '只核验一条关键线索，有证据再延伸，避免反复猜想。',
  };
  return {
    strength,
    approach,
    impact: `原局${strength}，${relation}有${effect}的含义。${reason}`,
    action: approach === 'pace' ? actionByRelation[relation] : themes[relation]!.action,
    favorable,
    unfavorable,
    pattern: analysis.mingGe.pattern,
    ruleBasis: [
      `月令${details.timely ? '得令' : '未得令'}，司令${details.commanderEffect}`,
      details.hasStrongRoot ? '地支有强根' : details.hasRoot ? '地支有根，强根不显' : '地支未见根气',
      `印比生扶${details.hasSupport ? '可见' : '不显'}，克泄耗约束${details.hasConstraint ? '可见' : '不显'}`,
    ],
    usefulReason: useful.primaryReason || '',
  };
}

export function getPersonalAlmanacReading(day: AlmanacDayCandidate, participant: AlmanacParticipantProfile, chart: BaziChartResult) {
  const stem = day.ganzhi.day[0] || '';
  const branch = day.ganzhi.day[1] || '';
  const master = participant.dayMaster;
  if (!stem || !branch || !master || !stems.includes(stem) || !branches.includes(branch) || master.length !== 1 || !stems.includes(master)) return null;
  if (chart.dayMaster.gan !== master || (['year', 'month', 'day', 'hour'] as const).some((key) => chart.pillars[key].ganZhi !== participant.pillars[key])) {
    throw new Error('出生信息已变化，请重新载入个人历。');
  }
  const relation = baziCalculator.getTenGod(stem, master);
  const theme = themes[relation];
  if (!theme) return null;
  const element = BASIC_MAPPINGS.STEM_WUXING[stems.indexOf(stem)]!;
  const masterElement = BASIC_MAPPINGS.STEM_WUXING[stems.indexOf(master)]!;
  const samePolarity = stems.indexOf(stem) % 2 === stems.indexOf(master) % 2;
  const interaction = element === masterElement ? `同属${element}`
    : BASIC_MAPPINGS.WUXING_SHENG[masterElement] === element ? `${masterElement}生${element}`
      : BASIC_MAPPINGS.WUXING_SHENG[element] === masterElement ? `${element}生${masterElement}`
        : BASIC_MAPPINGS.WUXING_KE[masterElement] === element ? `${masterElement}克${element}` : `${element}克${masterElement}`;
  const undertones = (HIDDEN_STEMS[branch] || []).map((hiddenStem) => {
    const hiddenRelation = baziCalculator.getTenGod(hiddenStem, master);
    return { stem: hiddenStem, relation: hiddenRelation, keyword: themes[hiddenRelation]?.keyword || hiddenRelation };
  });
  const conflicts = (day.participantRelationFacts || []).filter((fact) => fact.participantId === participant.id
    && fact.scope === '候选日' && ['年支', '日支'].includes(fact.basis) && ['冲', '刑', '害', '破'].includes(fact.relation));
  const conflictBasis = [...new Set(conflicts.map((fact) => `${fact.basis}${fact.participantValues.join('、')}与当日${fact.candidateValue}相${fact.relation}`))];
  return {
    participantId: participant.id,
    name: participant.name,
    dayGanzhi: day.ganzhi.day,
    dayMaster: `${master}${masterElement}`,
    element,
    relation,
    ...theme,
    ...strengthGuidance(chart.analysis, relation, element),
    basis: `${master}${masterElement}日主遇${stem}${element}，${interaction}，阴阳${samePolarity ? '相同' : '不同'}，形成${relation}。`,
    undertones,
    conflict: conflictBasis.length ? `${conflictBasis.join('；')}。涉及共同安排时，提前确认变更、分工和备选方案。` : '',
  };
}
