export type FortuneReadingPosture = 'advance' | 'focus' | 'cultivate' | 'resolve' | 'stabilize' | 'restore' | 'protect';

export type FortunePeriod = 'today' | 'month' | 'year';

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

interface ScaledRelation {
  today: string;
  month: string;
  year: string;
}

const secondaryRelations: Record<string, Record<string, ScaledRelation>> = {
  career: {
    study: {
      today: '学习把工作中的做法整理成可复用步骤，减少同类任务重新摸索',
      month: '学习把本月阶段工作沉淀为可复用方法，减少后续项目重复摸索',
      year: '学习沉淀全年在核心工作中的专业方法论，支撑长期业务与能力跃升',
    },
    wealth: {
      today: '钱款闭合工作产生的成本、结算与付款责任，避免交付卡在结算环节',
      month: '钱款跟进本月工作预算、结算与资金节点，避免推进卡在资源周转',
      year: '钱款守住全年经营预算、项目投入与资金储备，保障工作长期稳定推进',
    },
    relationship: {
      today: '沟通让工作负责人、交付标准和变更条件得到共同确认',
      month: '沟通对齐本月工作分工、验收标准与责任边界，确保协作步调一致',
      year: '沟通建立全年工作协作机制与信任规则，减少长期跨部门摩擦与内耗',
    },
    travel: {
      today: '出行保障见面、现场处理与交付所需的地点和结束时间',
      month: '出行保障本月关键工作拜访、现场推进与异地交付的时间安排',
      year: '出行服务于全年工作战略布局、关键现场与重要拓展，保障交付落地',
    },
    wellbeing: {
      today: '身心状态决定工作判断、沟通与收尾能否保持连续',
      month: '身心状态保障本月工作节奏与连续交付，避免疲劳影响执行',
      year: '身心状态构筑支撑全年繁重工作与长期攻坚的体能与精力底座',
    },
  },
  study: {
    career: {
      today: '工作提供可验收的应用场景，使学习成果不只停在笔记',
      month: '工作提供本月学习成果的检验场景，使知识输入转化为实际交付',
      year: '工作提供全年重大实战场景，使长期学习体系真正转化为核心成果',
    },
    wealth: {
      today: '钱款限定课程、资料与试错成本，避免学习投入超过实际收益',
      month: '钱款限定本月学习与资料投入成本，确保支出与阶段收益相匹配',
      year: '钱款规划全年学习与研习预算，确保长期能力建设获得稳定资源支持',
    },
    relationship: {
      today: '沟通通过复述与反馈检验学习理解是否准确，并暴露应用偏差',
      month: '沟通通过交流讨论检验本月学习理解，及时发现并纠正认知偏差',
      year: '沟通拓展同行交流与深度研讨，为全年学习提供多维度的反馈与启发',
    },
    travel: {
      today: '出行保留稳定的学习地点与完整时段，避免转场切断注意力',
      month: '出行保障本月调研、考察与学习所需的现场环境与时间',
      year: '出行拓宽全年视野与跨区域研学，为长期学习获取更丰富的现实认知',
    },
    wellbeing: {
      today: '身心状态决定学习输入能否沉淀为记忆与输出，并保持连续',
      month: '身心状态决定本月学习输入能否有效消化，避免疲劳导致记忆下降',
      year: '身心状态维持健康的作息与精力，支撑全年高强度学习输入与探索的连续性',
    },
  },
  wealth: {
    career: {
      today: '工作明确收入、交付与结算责任，使每笔钱款都有现实来源',
      month: '工作明确本月业务进展与结算责任，为钱款回笼与预算执行提供保障',
      year: '工作确保全年主营业务稳定与收入来源，为长期钱款规划提供扎实底盘',
    },
    study: {
      today: '学习帮助理解条款、比较成本并发现钱款记录中的遗漏',
      month: '学习帮助理解本月财务条款与成本结构，优化钱款规划与资金使用',
      year: '学习掌握长期财务规则、合同条款与风控模型，增强钱款抗风险能力',
    },
    relationship: {
      today: '沟通让金额、责任与付款节点得到共同确认，避免各自留存不同版本',
      month: '沟通让本月钱款金额、分账规则与付款节点得到各方共同确认',
      year: '沟通维系全年重要合作伙伴的长期信任，保障钱款往来与分润机制稳定',
    },
    travel: {
      today: '出行补齐交通、住宿与变更成本，避免钱款预算漏项',
      month: '出行统筹本月交通、住宿与差旅费用，避免钱款预算出现意外缺口',
      year: '出行优化全年跨区域资产配置与考察调研，提高钱款长期投入产出比',
    },
    wellbeing: {
      today: '身心状态影响钱款核对准确度，疲劳时更容易漏算或误付',
      month: '身心状态维持本月钱款核算的专注度，避免因疲劳产生财务失误',
      year: '身心状态保障全年面对复杂局面时的定力，避免在钱款决策中焦虑失衡',
    },
  },
  relationship: {
    career: {
      today: '工作梳理分工与责任，为沟通提供能够确认的事实',
      month: '工作明确本月职责分工与协同目标，为沟通对齐提供清晰事实依据',
      year: '工作通过规范化协同与明确分工，为全年长期人际沟通奠定共赢基础',
    },
    study: {
      today: '学习帮助整理资料与观点，使沟通不只停在立场',
      month: '学习提升本月沟通表达与倾听理解，使交流更聚焦核心分歧',
      year: '学习提升长期沟通同理心与表达艺术，构建稳健成熟的协作关系网络',
    },
    wealth: {
      today: '钱款明确共同利益、费用与责任，减少沟通中的含糊承诺',
      month: '钱款厘清本月共同费用与经济责任，减少沟通协作中的利益疑虑',
      year: '钱款规范契约责任与利益机制，为全年沟通合作构筑清晰的经济底线',
    },
    travel: {
      today: '出行落实会面地点、到达时间与结束安排，让沟通能够真正发生',
      month: '出行落实本月重要拜访、会面与对接安排，让深度沟通能够面对面发生',
      year: '出行落实全年关键关系走访与面对面深度沟通，增进长期情感与互信',
    },
    wellbeing: {
      today: '身心状态决定沟通时能否听清事实、控制反应并完成表达',
      month: '身心状态保障本月沟通时的耐心与倾听余量，减少无谓的情绪摩擦',
      year: '身心状态涵养内心的包容与情绪韧性，从容应对全年复杂沟通局势',
    },
  },
  travel: {
    career: {
      today: '工作明确出行目的、负责人和结束节点，使行程服务于实际交付',
      month: '工作明确本月出行目标、任务节点与验收标准，让行程服务于实际交付',
      year: '工作统筹全年重大出行考察与战略布局，使长途行程始终围绕业务重心',
    },
    study: {
      today: '学习明确需要携带的资料、设备与现场任务，减少无效转场',
      month: '学习明确本月出行所需资料、考察要点与现场任务，提升行程质量',
      year: '学习系统规划全年考察与研学安排，使每次出行都转化为沉淀认知',
    },
    wealth: {
      today: '钱款闭合交通、住宿与变更成本，避免行程留下后续责任',
      month: '钱款闭合本月差旅支出、交通费用与后续结算，避免行程留下未清责任',
      year: '钱款严格把控全年差旅总预算与交通成本，实现出行资源的合理配置',
    },
    relationship: {
      today: '沟通对齐同行人、接待方与变更信息，减少行程临时改线',
      month: '沟通对齐本月同行人员、接待方与行程变动，减少出行现场协调损耗',
      year: '沟通巩固全年异地协作人脉与对接机制，提升跨区域出行的综合效益',
    },
    wellbeing: {
      today: '身心状态决定出行可承受的转场密度与返程余量',
      month: '身心状态决定本月出行可承受的行程密度，确保转场与返程体能充沛',
      year: '身心状态建立出行与休整的平衡机制，维持全年平稳充沛的体力状态',
    },
  },
  wellbeing: {
    career: {
      today: '工作通过交接与减量释放完整休息时间，避免恢复被临时任务切碎',
      month: '工作通过交接分工与控制负荷释放休息时间，避免恢复节奏被持续打乱',
      year: '工作建立合理的梯队分工与节奏管控，从机制上避免长期超负荷挤占休息',
    },
    study: {
      today: '学习控制输入量与截止点，让注意力真正从持续处理信息中退出',
      month: '学习设定阶段截止点与适度输入量，让大脑能从紧张中退出以保障休息',
      year: '学习保持张弛有度的输入节奏，留出充分消化与身心放空的恢复期',
    },
    wealth: {
      today: '钱款先闭合持续牵动注意力的费用与责任，减少休息中的反复惦记',
      month: '钱款理顺本月资金安排与财务责任，减少焦虑对身心睡眠的困扰',
      year: '钱款建立充足的应急与健康资金储备，筑牢抵御意外风险的身心安全网',
    },
    relationship: {
      today: '沟通澄清最耗精力的分歧与边界，避免情绪持续占用恢复时间',
      month: '沟通明确边界并化解人际分歧，避免情绪负担侵占身心恢复时间',
      year: '沟通设立清晰的心理防线与健康社交圈，维护身心长期的宁静与稳定',
    },
    travel: {
      today: '出行减少不必要转场并确定返程，使睡眠与进食获得稳定时间',
      month: '出行合理控制行程转场并预留返程缓冲，使身心作息与睡眠保持平稳',
      year: '出行适度安排深度休养与自然环境调节，为身心长远运转持续蓄力充电',
    },
  },
};

const cautionInterruptions: Record<string, Record<string, ScaledRelation>> = {
  career: {
    study: {
      today: '资料持续增加却没有形成结论，会切碎工作判断，交付标准和验收遗漏随之增加',
      month: '资料与学习方向发散，会分散项目精力，导致关键工作交付延误',
      year: '缺乏系统性学习与能力沉淀，会导致工作在低水平重复中消耗资源并增加试错成本',
    },
    wealth: {
      today: '金额或付款责任未闭合，会让工作结果在报价、结算或付款处反复返工',
      month: '资金预算或付款节点脱节，会让月度工作在周转与结算处受阻返工',
      year: '年度预算失衡或资金计划脱节，会增加后续核算成本并制约全年工作布局',
    },
    relationship: {
      today: '共同事实未对齐，会让工作需求和验收口径出现两套版本',
      month: '协作规则与验收口径不清，会引发沟通分歧，导致需求反复并延误工作推进',
      year: '缺乏稳定的沟通规则与协作机制，会让工作对接反复产生理解偏差与沟通成本',
    },
    travel: {
      today: '转场与返程延误会压缩工作会面、现场处理和交付时间',
      month: '行程延误与突发变动会打乱月度排期，造成现场工作与出行脱节',
      year: '差旅与异地奔波过多，会过度分散出行精力、增加协调成本并削弱工作重点',
    },
    wellbeing: {
      today: '恢复不足会降低工作判断准确度，错误往往集中到沟通与收尾',
      month: '阶段透支会拉长恢复周期，导致月度后半程工作质量与身心状态下降',
      year: '长期透支与过度高压，会压缩身心恢复时间并动摇全年工作节奏',
    },
  },
  study: {
    career: {
      today: '临时工作与责任变化会不断插入，学习难以保留连续输入和输出时间',
      month: '突发工作与临时排期频繁挤占，会导致月度学习计划支离破碎、输出时间被压缩',
      year: '业务重压与被动应对会压缩长期研习空间，导致个人工作与学习能力提升放缓',
    },
    wealth: {
      today: '费用与付款压力未定，会干扰学习选择，使资料投入难以按收益取舍',
      month: '预算超支与资金顾虑会干扰学习投入决策，导致资料购买与课程费用付款受阻',
      year: '学习与资料预算投入不足，会限制获取优质资源并增加后续试错成本',
    },
    relationship: {
      today: '共同事实未确认，会让学习输入和实际应用采用不同标准',
      month: '共同事实未对齐或外界分歧干扰，会削弱沟通专注度并影响学习理解',
      year: '缺乏深度沟通与同行交流，会导致理解停留表面、增加后续学习试错成本',
    },
    travel: {
      today: '频繁转场会切断学习注意力，资料检查、练习与输出更容易遗漏',
      month: '频繁异地奔波会打乱月度学习节奏，导致复盘与知识内化在出行中延误',
      year: '缺乏必要的外部考察与出行视野拓宽，会压缩长期学习输出与实践空间',
    },
    wellbeing: {
      today: '恢复不足会让学习停在反复阅读，记忆、复述和应用同步下降',
      month: '作息紊乱与精力透支会导致注意力涣散，身心疲惫使学习记忆与理解下降',
      year: '长期精力透支与身心疲惫，会压缩深度学习时间并削弱探索定力',
    },
  },
  wealth: {
    career: {
      today: '工作交付与责任变化会反复改写金额、结算和付款依据',
      month: '项目进度滞后或交付争议会阻滞资金回笼，改写月度钱款与工作收支计划并引发延误',
      year: '业务进展不顺或重大交付延误，会削弱年度钱款收益并增加经营成本',
    },
    study: {
      today: '条款与成本信息没有真正理解，会让钱款比较停在数字表面并漏掉责任',
      month: '未吃透商业规则与财务条款，会导致月度预算编制遗漏关键钱款成本与学习核算',
      year: '缺乏长期的财务规则与风控学习，容易在重大钱款决策中遗漏关键风险',
    },
    relationship: {
      today: '共同事实未对齐，会让金额、付款节点和责任各自保留不同版本',
      month: '权责利益含糊与共识动摇，会引发付款与结算纠纷并恶化沟通合作',
      year: '沟通不畅与合作关系动摇，会引发长期的钱款争议并增加维系成本',
    },
    travel: {
      today: '路线或行程变化会持续新增交通、住宿和取消成本',
      month: '计划外差旅与高频异地支出会持续挤占月度钱款，打乱出行预算并增加成本',
      year: '异地出行成本与差旅开支失控，会持续挤占全年钱款预算并压缩资金余量',
    },
    wellbeing: {
      today: '恢复不足会降低钱款核对准确度，漏算、重复付款和冲动决定更容易出现',
      month: '身心疲劳与焦虑会削弱财务风控敏锐度，增加冲动钱款决策与判断遗漏',
      year: '身心长期透支与健康波动，会产生额外医疗成本并影响持续创造钱款价值的能力',
    },
  },
  relationship: {
    career: {
      today: '工作分工与责任不断变化，会让沟通需求和验收口径出现两套版本',
      month: '分工不清与责任转嫁会持续激化矛盾，让协作沟通在不同标准中相互推诿',
      year: '长期权责倒挂与工作分工不清，会让沟通诉求出现两套版本并侵蚀协作信任',
    },
    study: {
      today: '资料没有消化为共同事实，会让沟通建立在未经核实的信息上',
      month: '学习理解的偏差未经讨论校正，会让沟通缺乏共同事实基础并反复争论',
      year: '长期学习与理解形成的认知断层未弥合，会让沟通建立在不同标准上并持续偏离',
    },
    wealth: {
      today: '金额和付款责任含糊，会把沟通分歧进一步变成信任与承诺问题',
      month: '账目不清与付款争议会动摇信任基础，将日常沟通升级为钱款结算对抗',
      year: '钱款分配不公与利益机制含糊，会增加长期沟通成本并破坏合作信任',
    },
    travel: {
      today: '会面迟到或返程压力会压缩沟通时间，容易在事实未齐时仓促定论',
      month: '行程冲突与会面延误会压缩深度沟通时间，容易在出行仓促中造成误解',
      year: '长期空间隔离与沟通不足，会压缩交流频次并增加异地出行协作难度',
    },
    wellbeing: {
      today: '恢复不足会降低倾听与判断余量，疲劳更容易被误认成立场',
      month: '情绪耗竭与耐心不足会放大日常摩擦，让沟通耐心与倾听质量明显下降',
      year: '长期身心俱疲会降低沟通耐心，压缩交流意愿并导致重要关系逐步疏离',
    },
  },
  travel: {
    career: {
      today: '临时工作与交付变化会改写目的地、出发时间并造成行程延误',
      month: '项目节点调整与业务变动会迫使行程频繁重排，增加工作改线与出行时间延误',
      year: '业务重心频繁变动，会导致异地工作差旅与出行增加无谓成本',
    },
    study: {
      today: '资料、设备或现场任务没有核清，会让出行到达后仍无法完成目的',
      month: '前期学习调研与出行准备不足，会让现场任务无法完成、达不到考察目的',
      year: '考察调研与学习输入缺乏系统规划，会导致年度出行计划遗漏关键环节',
    },
    wealth: {
      today: '预算或付款节点有缺口，会迫使交通、住宿和返程方案临时变更',
      month: '差旅预算不足或费用超支，会压缩行程路线并增加额外出行成本',
      year: '年度差旅与出行管控缺失，会超额占用钱款预算并推高综合成本',
    },
    relationship: {
      today: '同行人与接待方共同事实未对齐，会让时间、地点和变更方案出现两套版本',
      month: '接待方或同行人信息脱节，会让行程方案出现两套版本并导致出行效率低下',
      year: '异地协作方沟通脱节，会让跨区域出行方案反复修改并增加协调成本',
    },
    wellbeing: {
      today: '恢复不足会降低出行反应速度，转场、驾驶与返程安全余量一起下降',
      month: '身心不适与连续舟车劳顿会明显削弱现场应变力，导致出行反应速度下降',
      year: '长年高频出行奔波，会压缩身心恢复时间并累积疲劳',
    },
  },
  wellbeing: {
    career: {
      today: '工作插单与责任交接持续进入休息时间，会让睡眠和恢复被切成零散片段',
      month: '高压任务与频繁工作加班会持续蚕食休假，导致身心恢复不足并处于疲劳状态',
      year: '长期过度加班与繁重工作责任，会持续挤占身心休息与恢复空间',
    },
    study: {
      today: '持续增加资料与信息输入，会让注意力无法退出工作状态并拖延入睡',
      month: '过度用脑与强行增加学习量会导致神经紧绷，休息时身心难以快速入睡',
      year: '长期强迫式学习输入与自我施压，会加重身心负担并压缩恢复时间',
    },
    wealth: {
      today: '未解决的费用与付款责任会持续占用注意力，休息时仍反复核算',
      month: '钱款压力与未结付款悬而未决，会在心理层面持续消耗精力、影响身心入睡',
      year: '长期的钱款压力与财务顾虑，会持续占用思绪并压缩身心深层恢复时间',
    },
    relationship: {
      today: '未解决的分歧会维持情绪唤醒，使身体停下来后思绪仍无法退出并影响恢复',
      month: '人际冷战与沟通争执会造成持续情绪内耗，使身心恢复质量严重下降',
      year: '长期处于人际矛盾或沟通内耗中，会持续抽取身心能量并压缩休整时间',
    },
    travel: {
      today: '转场和返程余量不足会直接挤压睡眠、进食与完整恢复时间',
      month: '密集转场与长途出行奔波会透支体能储备，严重压缩身心睡眠与恢复时间',
      year: '常年环境变动与长途出行奔波，会打乱身心作息并影响睡眠恢复质量',
    },
  },
};

export function summarySecondaryRelation(
  primaryKey: string,
  secondaryKey: string,
  primaryLabel: string,
  secondaryLabel: string,
  period: FortunePeriod = 'today',
) {
  return secondaryRelations[primaryKey]?.[secondaryKey]?.[period]
    || secondaryRelations[primaryKey]?.[secondaryKey]?.today
    || `${secondaryLabel}负责补齐${primaryLabel}形成结果所需的现实条件`;
}

export function summaryCautionInterruption(
  primaryKey: string,
  cautionKey: string,
  primaryLabel: string,
  cautionLabel: string,
  period: FortunePeriod = 'today',
) {
  return cautionInterruptions[primaryKey]?.[cautionKey]?.[period]
    || cautionInterruptions[primaryKey]?.[cautionKey]?.today
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
