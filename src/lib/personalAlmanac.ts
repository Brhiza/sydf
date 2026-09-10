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

export const personalAlmanacThemeGroups = [
  { key: 'peer', label: '自主协作', shortLabel: '协作' },
  { key: 'output', label: '表达产出', shortLabel: '产出' },
  { key: 'wealth', label: '资源落实', shortLabel: '落实' },
  { key: 'authority', label: '责任应对', shortLabel: '应对' },
  { key: 'resource', label: '学习整理', shortLabel: '学习' },
] as const;
type ThemeFamily = typeof personalAlmanacThemeGroups[number]['key'];
const relationFamilies: Record<string, ThemeFamily> = {
  比肩: 'peer', 劫财: 'peer', 食神: 'output', 伤官: 'output', 正财: 'wealth', 偏财: 'wealth',
  正官: 'authority', 七杀: 'authority', 正印: 'resource', 偏印: 'resource',
};
const relationScenes: Record<string, string> = {
  比肩: '自主安排与同伴配合', 劫财: '分工、费用与资源共享', 食神: '作品打磨与稳定输出',
  伤官: '观点表达与流程改进', 正财: '账目、交付与具体回报', 偏财: '机会筛选与资源调配',
  正官: '审批、履约与责任交接', 七杀: '期限、难题与临时要求', 正印: '资料学习与经验传承', 偏印: '独立研究与细节核验',
};
const strengthLenses: Record<ThemeFamily, { strong: string; weak: string }> = {
  peer: { strong: '自主与生扶已有基础，同伴加入时更需要把主张落到清楚的分工上。', weak: '同伴与协作可提供生扶，适合找支持、分担任务，承诺仍要量力。' },
  output: { strong: '食伤把日主之气转为输出，可以关注如何把已有积累变成作品、表达或改进。', weak: '食伤输出也会泄身，宜把创作和表达做小、做实，避免一次铺开太多任务。' },
  wealth: { strong: '财星对应可承接的事务与资源，重点在让投入形成实际交付，并核对成本。', weak: '财星同时意味着投入与消耗，机会出现时先看承接条件，不急着扩大责任。' },
  authority: { strong: '官杀的约束可用于收拢目标、落实规则，先把要求转成可执行的标准。', weak: '官杀的约束需要承接，宜先争取资源与合理期限，再处理新增要求。' },
  resource: { strong: '印星继续生扶，适合整理已有知识并实际运用，留意准备是否挤占了行动。', weak: '印星有生扶作用，学习、请教与借鉴经验可补足支撑，先解决眼前的卡点。' },
};

const combinedScenes: Record<ThemeFamily, Record<ThemeFamily, { meaning: string; action: string }>> = {
  peer: {
    peer: { meaning: '自主与协作是同一条主线，关键在于各自能决定什么、需要谁配合。', action: '把共同任务拆到具体负责人，约好交接时要提供的材料。' },
    output: { meaning: '有自己的主张，也要让同伴看见具体成果，协作才有共同的讨论对象。', action: '先给伙伴看一个短稿或样例，再围绕同一份内容收集反馈。' },
    wealth: { meaning: '合作会落到时间、费用和成果分配上，交情与承诺都需要明确的边界。', action: '把各方投入与成果归属写清，尚未确认的费用单独列出。' },
    authority: { meaning: '个人安排需要与团队规则衔接，先确认权限和责任，推进才不易返工。', action: '问清谁提出意见、谁最终确认，关键节点留一次书面记录。' },
    resource: { meaning: '独立判断需要资料支撑，先共享依据，再讨论各自的做法。', action: '找出意见分歧背后的信息差，用同一份资料核对事实。' },
  },
  output: {
    peer: { meaning: '表达与创作需要接收者，自己的想法能否被理解，要靠具体反馈校准。', action: '把成果交给一位相关的人试用，问清哪里好懂、哪里还需要补充。' },
    output: { meaning: '主题集中在输出与打磨，先得到一个完整版本，再逐步提高质量。', action: '设一个交稿节点，只保留一处最值得改进的问题，完成后再开新题。' },
    wealth: { meaning: '表达需要落到实际价值上，关注谁会使用成果、能解决什么问题。', action: '给作品或方案写一句具体用途，再核对交付范围和所需成本。' },
    authority: { meaning: '新想法与既有规则需要对接，提出改进时同时说明可改范围与验收方式。', action: '把建议写成“现状、改法、验证标准”，先请负责的人确认边界。' },
    resource: { meaning: '输出与学习相互衔接，遇到卡点时补一条关键知识，再立即回到实践。', action: '用可靠资料核对作品中的一个关键说法，标出依据和仍待验证的部分。' },
  },
  wealth: {
    peer: { meaning: '事务与资源牵涉多人协作，先说清谁承担成本、谁负责结果。', action: '对照现有约定核对投入与分工，避免把他人的待办默认为自己的责任。' },
    output: { meaning: '回报需要可交付的成果支撑，先看实际完成了什么，再讨论新的投入。', action: '整理一份成果清单，让对方逐项确认已收取和仍欠缺的内容。' },
    wealth: { meaning: '资源与落实是共同重点，适合把分散事项收拢成一份可核对的清单。', action: '核对一项收入或支出的金额、日期与凭证，未兑现的承诺暂列待确认。' },
    authority: { meaning: '钱款和交付需要规则保障，流程清楚才能区分承诺、义务与完成标准。', action: '检查付款或交付的前置条件，关键条款有歧义时先提出确认。' },
    resource: { meaning: '资源决定需要充分信息，先弄清依据，才能判断时间和成本值不值得投入。', action: '核对资料来源与适用范围，把缺少的信息列成问题再向对方确认。' },
  },
  authority: {
    peer: { meaning: '责任需要落实到人，规则明确之后，也要给自主判断与同伴配合留出空间。', action: '把必须遵守的要求与可自行安排的部分分开，约好需要支援时找谁。' },
    output: { meaning: '面对要求与压力，可以用具体成果回应，争论对错之前先给出可检验的进展。', action: '用一个已完成的小成果说明现状，再列出剩余问题和下一步期限。' },
    wealth: { meaning: '要求最终要落到资源与成本上，先看现有条件是否足以支撑承诺。', action: '对照期限检查预算、人员和材料，缺哪一项就先协调哪一项。' },
    authority: { meaning: '规则与责任的主题较集中，先处理最明确、最紧迫的一项要求。', action: '把任务按截止时间排序，先确认验收标准，再报告进度与待协调问题。' },
    resource: { meaning: '应对要求时可借助资料、流程与经验，先找到依据，再决定处理方式。', action: '请熟悉流程的人核对一个关键步骤，把确认后的做法留作后续参照。' },
  },
  resource: {
    peer: { meaning: '吸收知识后需要自己判断，也可以借同伴的不同视角发现理解中的遗漏。', action: '用自己的话讲一遍新方法，请对方指出不清楚或缺少依据的地方。' },
    output: { meaning: '学习的价值需要实践承接，把理解转成一个小成果，才能发现真正的疑问。', action: '用刚学到的方法完成一个小练习，记录有效之处和实际卡住的位置。' },
    wealth: { meaning: '资料与经验需要服务实际问题，选择学习内容时，也要衡量使用场景与成本。', action: '比较两个方案的适用条件与费用，只保留与当前任务有关的差异。' },
    authority: { meaning: '理解原理后还要符合操作要求，学习与办事之间需要一份可靠的执行清单。', action: '把资料中的规则整理成步骤，找出一个可能遗漏的例外条件。' },
    resource: { meaning: '主题集中在吸收、整理与核验，适合把散落的信息整理成自己的理解。', action: '为资料按问题分类，提炼一条结论并标明来源，存疑内容另列待核验。' },
  },
};
const closingQuestions: Record<ThemeFamily, string> = {
  peer: '收尾时回看：哪些事已由自己推进，哪些还需别人确认？把下一位接手的人和待补信息写清。',
  output: '收尾时留下一份能展示的版本，记住一次具体反馈；明天优先改最影响使用的那一点。',
  wealth: '收尾时区分已完成、已兑现与仍在承诺中的事项，把最关键的一笔账或一次交付核实。',
  authority: '收尾时确认一个实际进展：要求是否已落实、责任是否清楚、还有哪一步需要协调？',
  resource: '收尾时只留下一条经过验证的方法，再记一个仍没弄明白的问题，带着它继续学习。',
};
const branchSupport: Record<ThemeFamily, string> = {
  peer: '可借清楚的分工与同伴配合，减少独自承担的部分。',
  output: '可用一个具体成果回应问题，让想法得到实际反馈。',
  wealth: '可把已有资源落实到任务中，优先核对交付与兑现条件。',
  authority: '可把明确的要求转成执行标准，让责任和推进顺序更清楚。',
  resource: '可借资料、经验与请教补足准备，遇到卡点先找可靠依据。',
};

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

export function getPersonalAlmanacDayTheme(day: AlmanacDayCandidate, participant: AlmanacParticipantProfile) {
  const stem = day.ganzhi.day[0] || '';
  const master = participant.dayMaster;
  if (!stem || master.length !== 1 || !stems.includes(stem) || !stems.includes(master)) return null;
  const relation = baziCalculator.getTenGod(stem, master);
  const family = relationFamilies[relation];
  const group = personalAlmanacThemeGroups.find((item) => item.key === family);
  return group ? { ...group, relation, title: themes[relation]!.title } : null;
}

function strengthGuidance(analysis: BaziAnalysisResult, relation: string, element: string, layer = '日干') {
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
    reason = `${layer}${element}同时涉及原局喜忌，作用有取舍，先做小范围尝试。`;
  } else if (supported || constrained) {
    approach = supported ? 'advance' : 'pace';
    reason = `${layer}${element}落在原局${supported ? '喜用' : '忌神'}五行，${supported ? '可借当天主题推进已有计划' : '宜收窄投入，先处理必要部分'}。`;
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
  const family = relationFamilies[relation]!;
  const strengthNote = special ? `按${analysis.mingGe.pattern}的取用理解当天作用，不单独套用一般强弱规则。`
    : /强/.test(strength) ? strengthLenses[family].strong
      : /弱/.test(strength) ? strengthLenses[family].weak : '';
  return {
    strength,
    approach,
    impact: `原局${strength}，${relation}有${effect}的含义。${strengthNote}${reason}`,
    preference: supported && constrained ? 'mixed' : supported ? 'favorable' : constrained ? 'unfavorable' : 'unmatched',
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
    return {
      stem: hiddenStem, relation: hiddenRelation, keyword: themes[hiddenRelation]?.keyword || hiddenRelation,
      element: BASIC_MAPPINGS.STEM_WUXING[stems.indexOf(hiddenStem)]!, scene: relationScenes[hiddenRelation]!,
    };
  });
  const conflicts = (day.participantRelationFacts || []).filter((fact) => fact.participantId === participant.id
    && fact.scope === '候选日' && ['年支', '日支'].includes(fact.basis) && ['冲', '刑', '害', '破'].includes(fact.relation));
  const conflictBasis = [...new Set(conflicts.map((fact) => `${fact.basis}${fact.participantValues.join('、')}与当日${fact.candidateValue}相${fact.relation}`))];
  const conflictGuidance: Record<string, string> = {
    冲: '安排变动时先确认新的时间与接手人，重要行程留出缓冲。',
    刑: '规则与协作事项逐项核对材料、责任和期限，遇到争议先确认事实。',
    害: '口头理解可能有遗漏，关键约定复述一次并留下双方确认的记录。',
    破: '交付和衔接处多做一次检查，为依赖他人完成的步骤准备替代方案。',
  };
  const guidance = strengthGuidance(chart.analysis, relation, element);
  const mainHidden = undertones[0];
  const family = relationFamilies[relation]!;
  const hiddenFamily = mainHidden ? relationFamilies[mainHidden.relation]! : null;
  const combination = hiddenFamily ? combinedScenes[family][hiddenFamily] : null;
  const branchGuidance = mainHidden ? strengthGuidance(chart.analysis, mainHidden.relation, mainHidden.element, '日支本气') : null;
  const branchBalance = mainHidden && branchGuidance
    ? branchGuidance.preference === 'mixed'
      ? `${branch}中本气${mainHidden.stem}${mainHidden.element}同时涉及喜忌，先观察实际反馈，再决定是否加量。`
      : branchGuidance.preference === 'unfavorable'
        ? `${branch}中本气${mainHidden.stem}${mainHidden.element}落在忌神五行，处理${mainHidden.scene}时宜留余量，避免仓促承诺。`
        : branchGuidance.preference === 'favorable'
          ? `${branch}中本气${mainHidden.stem}${mainHidden.element}属于喜用五行，${branchSupport[hiddenFamily!]}`
          : `日支本气未明确命中原局喜忌，${mainHidden.scene}可作观察线索，以实际进展决定投入。`
    : '';
  const secondary = undertones.slice(1).filter((item) => item.relation !== relation && item.relation !== mainHidden?.relation);
  const paceWord = guidance.approach === 'advance' ? '推进' : guidance.approach === 'pace' ? '收拢' : '核验';
  return {
    participantId: participant.id,
    name: participant.name,
    dayGanzhi: day.ganzhi.day,
    dayMaster: `${master}${masterElement}`,
    element,
    relation,
    ...theme,
    ...guidance,
    family,
    focus: `围绕${relationScenes[relation]}安排一天，${guidance.approach === 'advance' ? '把已有准备落实到一个明确进展' : guidance.approach === 'pace' ? '先完成必要部分，给新增要求留出判断余地' : '先试一小步，再根据反馈调整'}。`,
    basis: `${master}${masterElement}日主遇${stem}${element}，${interaction}，阴阳${samePolarity ? '相同' : '不同'}，形成${relation}。`,
    undertones,
    dayChange: mainHidden && combination ? `${relation === mainHidden.relation ? `日干${stem}与${branch}中本气${mainHidden.stem}同为${relation}` : `日干${stem}以${relation}为主线，日支${branch}的本气${mainHidden.stem}对应${mainHidden.relation}`}。${combination.meaning}` : '',
    branchBalance,
    secondaryNote: secondary.length ? `此外，${branch}中还藏${secondary.map((item) => `${item.stem}（${item.relation}）`).join('、')}，带入${secondary.map((item) => item.scene).join('、')}的副线；只在实际遇到相关事项时参考，不必额外增加安排。` : '',
    nextAction: combination?.action || '',
    keywords: [...new Set([theme.keyword, mainHidden?.keyword, paceWord].filter((item): item is string => Boolean(item)))],
    closing: closingQuestions[family],
    conflict: conflictBasis.length ? `${conflictBasis.join('；')}。${[...new Set(conflicts.map((fact) => conflictGuidance[fact.relation]))].join('')}` : '',
  };
}
