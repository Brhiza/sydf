<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import {
  ArrowLeft,
  ArrowUp,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coins,
  Grid2X2,
  Heart,
  HeartHandshake,
  History,
  House,
  LoaderCircle,
  MapPin,
  Menu,
  MessageCircle,
  Moon,
  Orbit,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ScrollText,
  Sparkles,
  Sun,
  Trash2,
  UserRound,
  X,
} from 'lucide-vue-next';
import type {
  AlmanacData,
  AlmanacDayCandidate,
  AstrolabeAspect,
  AstrolabeData,
  AstrolabePoint,
  JinkoujueData,
  LiurenData,
  LiuyaoData,
  MeihuaData,
  QimenData,
  SsgwData,
  TaiyiResult,
  XiaoliurenData,
} from 'mingyu-core/types';
import {
  buildCurrentBaziFortuneSelection,
  buildFortuneSelectionContext,
  getLifeStage,
  getLuckCycleForDate,
  getTenGod,
  ShenShaCalculator,
  type BaziChartResult,
  type FortuneSelectionContext,
} from 'mingyu-core/bazi';
import { BRANCH_HIDDEN_STEMS, getNayin, getNayinWuxing } from 'mingyu-core/ganzhi';
import type { WuyunLiuqiResult } from 'mingyu-core/wuyun-liuqi';
import type { HuangjiJingshiResult } from 'mingyu-core/huangji-jingshi';
import { getBirthDateValidationMessage } from 'mingyu-core/calendar';
import {
  findBirthPlaceByDisplayName,
  findBirthPlaceByRegionId,
  getBirthPlaceCityOptions,
  getBirthPlaceDistrictOptions,
  getBirthPlaceProvinceOptions,
  resolveBirthPlaceApproximateLatitude,
  type BirthPlaceCascadePath,
  type BirthPlaceCityOption,
  type BirthPlaceDistrictOption,
} from 'mingyu-core/location';
import type { AstrolabeScopeContext } from 'mingyu-core/divination/astrolabe-scope';
import {
  buildDivinationReadingPrompt,
  formatReadingSummary,
  formatReadingTime,
  getBirthCalendarInfo,
  kindMeta,
  runAutomaticCasting,
  runDivination,
  runZiweiChart,
  type BirthForm,
  type CastingMode,
  type CastingPreference,
  type DivinationKind,
  type ReadingRecord,
  type ReadingResult,
  type QizhengChartData,
  type ZiweiChartData,
} from './lib/divination';
import {
  requestAiModels,
  requestAiInterpretation,
  type AiApiType,
  type AiAnswerPreference,
  type AiChannel,
  type AiChannelPreset,
  type AiChannelProvider,
  type AiCustomConfig,
  type AiInterpretationRequest,
  type AiInterpretationResponse,
  type AiPreferences,
  type DisplayLevel,
} from './lib/ai';
import {
  requestAgentToolSelection,
  selectLocalAgentTool,
  type AgentToolSelection,
} from './lib/agent';
import type { BaziFortuneRequest, ChartReadingPromptOptions } from './lib/chartPrompt';
import AiPromptFallback from './components/AiPromptFallback.vue';
import AiReadingActions from './components/AiReadingActions.vue';
import ChatMarkdown from './components/ChatMarkdown.vue';
import CaseMultiSelect from './components/CaseMultiSelect.vue';
import ChartCoreFacts from './components/ChartCoreFacts.vue';
import ChartIdentityBar from './components/ChartIdentityBar.vue';
import FortuneSkeleton from './components/FortuneSkeleton.vue';
import FortuneResultView from './components/FortuneResultView.vue';
import TraditionalReading from './components/TraditionalReading.vue';
import UIPickerView from './components/UIPickerView.vue';
import vAutoResize from './directives/autoResizeTextarea';
import {
  UiActionBar,
  UiButton,
  UiDateNavigator,
  UiDialogHeader,
  UiDialogShell,
  UiEmptyState,
  UiNotice,
  UiPageShell,
  UiSectionHeading,
  UiSegmentedControl,
  UiToolPage,
  UiTextField,
  UiWorkspaceSurface,
} from './components/ui';
import {
  HISTORY_LIMIT,
  HISTORY_STORAGE_KEY,
  LEGACY_HISTORY_MIGRATION_KEY,
  LEGACY_HISTORY_STORAGE_KEY,
  getHistoryRecordCategory,
  isLegacyHistoryRecord,
  mergeHistoryRecords,
  parseLegacyHistory,
  parseStoredHistory,
  updateHistoryInterpretation,
  type HistoryRecordEntry,
  type LegacyHistoryRecord,
} from './lib/historyImport';
import type { DailyFortuneResult, FortunePeriod } from './lib/dailyFortune';
import { getModernAlmanacHours, getModernAlmanacPersonalNotes, modernizeAlmanacDay } from './lib/modernAlmanac';
import type { SelectableCaseProfile } from './lib/caseSelection';
import {
  almanacTopicGroups,
  almanacTopicOptions,
  evaluateAlmanacPurposeDay,
  generateLocalAlmanac,
  getDefaultAlmanacPurpose,
  getAlmanacCalendarDateMeta,
  getAlmanacDateChunks,
  getAlmanacMonthRange,
  getDefaultAlmanacMonth,
  getAlmanacPeriodRange,
  isAlmanacProfileComplete,
  shiftAlmanacMonth,
  type AlmanacCalendarDateMeta,
  type AlmanacAuspiceLevel,
  type AlmanacMode,
  type AlmanacPurpose,
  type AlmanacPurposeEvaluation,
} from './lib/almanac';

const ManualDivinationDialog = defineAsyncComponent(() => import('./components/ManualDivinationDialog.vue'));
const FengShuiView = defineAsyncComponent(() => import('./components/FengShuiView.vue'));
const CompatibilityView = defineAsyncComponent(() => import('./components/CompatibilityView.vue'));
const DailyHexagramView = defineAsyncComponent(() => import('./components/DailyHexagramView.vue'));
const QizhengChart = defineAsyncComponent(() => import('./components/QizhengChart.vue'));
const XiaoliurenView = defineAsyncComponent(() => import('./components/XiaoliurenView.vue'));
const OracleView = defineAsyncComponent(() => import('./components/OracleView.vue'));
const LegacyHistoryDetail = defineAsyncComponent(() => import('./components/LegacyHistoryDetail.vue'));

type AppView = 'tools' | 'fortune' | 'xiaoliuren' | 'daily-hexagram' | 'almanac' | 'fengshui' | 'oracle' | 'charts' | 'compatibility' | 'cases' | 'settings';
type SettingsSection = 'preferences' | 'ai';
type CasesSection = 'input' | 'records';
type ChartKind = 'bazi' | 'ziwei' | 'astrolabe' | 'qizheng';
type HomeChartKind = ChartKind | 'bazi-ziwei';
type HomeMode = 'divination' | 'chart';
type ChatRole = 'user' | 'assistant';
type AlmanacMonthFilter = 'all' | AlmanacPurpose;

const ONBOARDING_STORAGE_KEY = 'shiyue-onboarding-v1';
const BAZI_FORTUNE_COLUMN_STORAGE_KEY = 'shiyue-bazi-fortune-columns-v1';
const onboardingSteps = ['案例', '回答', '内容', '起卦', 'AI', '须知'] as const;
const answerPreferenceOptions: Array<{ value: AiAnswerPreference; label: string; mark: string; summary: string; description: string }> = [
  { value: 'chat', label: '日常聊天', mark: '聊', summary: '自然直说', description: '像熟悉你的朋友，用白话直接回答' },
  { value: 'fortune-master', label: '算命大师', mark: '命', summary: '传统断法', description: '先断主旨，再讲盘理、时机与趋避' },
  { value: 'professional', label: '专业人士', mark: '研', summary: '严谨推演', description: '展开结构、条件、分歧与专业判断' },
];
const displayLevelOptions: Array<{ value: DisplayLevel; label: string; description: string }> = [
  { value: 'basic', label: '0 基础', description: 'AI 自动选择术式，只显示易懂解答' },
  { value: 'beginner', label: '小白', description: '开放核心术式，保留少量必要术语' },
  { value: 'master', label: '完整', description: '开放全部术式、盘面与推演信息' },
];

function normalizeStoredAnswerPreference(value: unknown): AiAnswerPreference {
  if (value === 'chat' || value === 'fortune-master' || value === 'professional') return value;
  if (value === 'concise') return 'chat';
  if (value === 'detailed') return 'professional';
  return 'fortune-master';
}
const castingPreferenceOptions: Array<{ value: CastingPreference; label: string; description: string }> = [
  { value: 'auto', label: '自动起卦', description: '默认由电脑完成起卦' },
  { value: 'manual', label: '手动起卦', description: '默认亲自取数、摇卦或确认起课' },
];
const fortunePeriods: Array<{ key: FortunePeriod; label: string }> = [
  { key: 'today', label: '今日' },
  { key: 'month', label: '月运' },
  { key: 'year', label: '年运' },
];
const fortunePeriodTabs = fortunePeriods.map((item) => ({ value: item.key, label: item.label }));
const almanacModeTabs: Array<{ value: AlmanacMode; label: string }> = [
  { value: 'general', label: '黄历' },
  { value: 'personal', label: '个人' },
];
const casesSectionTabs: Array<{ value: CasesSection; label: string }> = [
  { value: 'input', label: '输入案例' },
  { value: 'records', label: '案例记录' },
];
const settingsSectionTabs: Array<{ value: SettingsSection; label: string }> = [
  { value: 'preferences', label: '偏好设置' },
  { value: 'ai', label: 'AI 与模型' },
];

type AlmanacRangeMonths = 1 | 3 | 6 | 12;

interface AlmanacSearchItem {
  day: AlmanacDayCandidate;
  evaluation: AlmanacPurposeEvaluation;
}

interface AlmanacCalendarCell extends AlmanacCalendarDateMeta {
  key: string;
  date: string;
  dayNumber: number;
  weekdayIndex: number;
  isCurrentMonth: boolean;
  isNavigable: boolean;
  day: AlmanacDayCandidate | null;
}

const almanacRangeOptions: Array<{ value: AlmanacRangeMonths; label: string }> = [
  { value: 1, label: '一个月' },
  { value: 3, label: '三个月' },
  { value: 6, label: '半年' },
  { value: 12, label: '一年' },
];
interface ChatTextMessage {
  kind: 'text';
  role: ChatRole;
  content: string;
}

interface ChatReadingMessage {
  kind: 'reading';
  role: 'assistant';
  content: '';
  reading: ReadingResult;
  method: DivinationKind;
  context?: {
    label: string;
    date: string;
    time: string;
    locationName: string;
  };
}

type ChatMessage = ChatTextMessage | ChatReadingMessage;

interface ReadingDetailRow {
  label: string;
  value: string;
}

interface CaseProfile extends BirthForm {
  id: string;
  label: string;
  regionKey: string;
  provinceId: string;
  cityId: string;
  regionId: string;
  isDefault: boolean;
}

type BirthPickerKind = 'gender' | 'calendar' | 'date' | 'time' | 'region';
type BirthPickerTarget = 'create' | 'editor' | 'onboarding';

interface PickerOption {
  value: string;
  label: string;
}

interface PickerColumn {
  key: string;
  label: string;
  options: ReadonlyArray<PickerOption>;
  flex?: number;
}

interface CachedChart {
  caseId: string;
  kind: ChartKind;
  signature: string;
  createdAt: number;
  result: ReadingResult;
}

type AstrolabeChartData = AstrolabeData & {
  annualScope?: AstrolabeScopeContext;
};

interface AstroOverviewItem {
  key: string;
  label: string;
  meaning: string;
  symbol: string;
  point: AstrolabePoint;
}

type ZiweiScope = 'origin' | 'decadal' | 'yearly';

const CHART_CACHE_STORAGE_KEY = 'shiyue-chart-cache-v1';
const CHART_CACHE_LIMIT = 12;

const provinceOptions = getBirthPlaceProvinceOptions();
const legacyRegionIds: Record<string, string> = {
  beijing: '110101',
  shanghai: '310101',
  guangzhou: '440106',
  chengdu: '510107',
  wuhan: '420106',
  xian: '610103',
  hongkong: '810000',
  taipei: '710101',
};

const chartOptions: Array<{ kind: ChartKind; label: string; icon: string }> = [
  { kind: 'bazi', label: '八字', icon: '命' },
  { kind: 'ziwei', label: '紫微', icon: '紫' },
  { kind: 'astrolabe', label: '星盘', icon: '星' },
  { kind: 'qizheng', label: '七政四余', icon: '政' },
];
const chartKindTabs = chartOptions.map((item) => ({ value: item.kind, label: item.label }));
const homeChartOptions: Array<{ kind: HomeChartKind; label: string; icon: string }> = [
  ...chartOptions,
  { kind: 'bazi-ziwei', label: '八字紫微合参', icon: '合' },
];
const ziweiScopeOptions: Array<{ value: ZiweiScope; label: string }> = [
  { value: 'origin', label: '本命' },
  { value: 'decadal', label: '大限' },
  { value: 'yearly', label: '流年' },
];

const zodiacSigns = ['白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '处女座', '天秤座', '天蝎座', '射手座', '摩羯座', '水瓶座', '双鱼座'];
const earthlyBranches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const currentFortuneYear = new Date().getFullYear();
const zodiacSymbols = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
const astroPlanetSymbols: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂', Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇', Chiron: '⚷',
  NorthNode: '☊', SouthNode: '☋', 北交点: '☊', 南交点: '☋', 太阳: '☉', 月亮: '☽', 水星: '☿', 金星: '♀', 火星: '♂', 木星: '♃', 土星: '♄', 天王星: '♅', 海王星: '♆', 冥王星: '♇', 凯龙星: '⚷',
};
const astroAspectColors: Record<string, string> = { 合相: '#9675b7', 六合: '#6f9b9a', 刑相: '#b8839c', 拱相: '#718ab1', 冲相: '#aa788e' };
const astroMajorBodyAliases: Record<string, string[]> = {
  Sun: ['Sun', '太阳'], Moon: ['Moon', '月亮'], Mercury: ['Mercury', '水星'], Venus: ['Venus', '金星'], Mars: ['Mars', '火星'], Jupiter: ['Jupiter', '木星'], Saturn: ['Saturn', '土星'], Uranus: ['Uranus', '天王星'], Neptune: ['Neptune', '海王星'], Pluto: ['Pluto', '冥王星'], Chiron: ['Chiron', '凯龙星'], NorthNode: ['NorthNode', 'North Node', '北交点'], SouthNode: ['SouthNode', 'South Node', '南交点'],
};

const beginnerDivinationKinds: DivinationKind[] = ['qimen', 'liuren', 'taiyi', 'liuyao', 'meihua'];
const masterDivinationKinds: DivinationKind[] = ['qimen', 'liuren', 'taiyi', 'wuyun-liuqi', 'huangji-jingshi', 'liuyao', 'meihua', 'jinkoujue'];
const aiApiTypeOptions: Array<{ value: AiApiType; label: string }> = [
  { value: 'chat', label: 'Chat Completions' },
  { value: 'responses', label: 'Responses' },
  { value: 'anthropic', label: 'Anthropic Messages' },
];
const aiChannelPresets: Array<{ preset: AiChannelPreset; id: string; name: string; baseUrl: string; apiType: AiApiType }> = [
  { preset: 'deepseek', id: 'preset-deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', apiType: 'chat' },
  { preset: 'openai', id: 'preset-openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', apiType: 'responses' },
  { preset: 'qwen', id: 'preset-qwen', name: '通义千问', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', apiType: 'chat' },
  { preset: 'kimi', id: 'preset-kimi', name: 'Kimi', baseUrl: 'https://api.moonshot.cn/v1', apiType: 'chat' },
  { preset: 'zhipu', id: 'preset-zhipu', name: '智谱 GLM', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', apiType: 'chat' },
  { preset: 'anthropic', id: 'preset-anthropic', name: 'Anthropic', baseUrl: 'https://api.anthropic.com/v1', apiType: 'anthropic' },
];
type InspirationMode = 'matter' | 'natal';
type InspirationItem = { label: string; text: string; prompt?: string; keywords?: string };
type InspirationGroup = { key: string; label: string; icon: string; description: string; questions: InspirationItem[] };

const q = (label: string, text: string, keywords = ''): InspirationItem => ({ label, text, keywords });
const n = (label: string, text: string, scope: string, keywords = ''): InspirationItem => ({
  label,
  text,
  keywords,
  prompt: `请完整解读“${label}”，重点覆盖：${scope}。结合本命、当前大运和相关流年，先给明确结论，再说明现实表现、时间节奏、风险边界与可调整部分。只引用少量真正影响结论的盘面信息，不列分析步骤，不把传统象意写成已经发生的事实。`,
});

const matterInspirationGroups: InspirationGroup[] = [
  { key: 'matter-life', label: '人生方向与重大选择', icon: '途', description: '去留、转折、优先级与长期方向', questions: [
    q('方向判断', '我现在走的方向值得继续坚持，还是应该及时调整？'),
    q('阶段重点', '我接下来最应该把时间和精力放在哪件事上？'),
    q('机会取舍', '眼前这个机会适合抓住吗，代价和风险在哪里？'),
    q('二选一', '这两个选择分别会带来什么，我更适合哪一个？'),
    q('主动或等待', '这件事我应该主动推进，还是先观察等待？'),
    q('止损判断', '这件事应该继续投入，还是已经到了止损的时候？'),
    q('重新开始', '我现在适合重新开始一条路吗，第一步应该做什么？'),
    q('未来重点', '未来半年最可能改变我生活重心的事情是什么？'),
  ] },
  { key: 'matter-single', label: '单身、桃花与相识', icon: '遇', description: '新缘分、暧昧、表白与对象判断', questions: [
    q('近期桃花', '我近期有遇到合适对象的机会吗，可能出现在哪里？'),
    q('新认识的人', '我刚认识的这个人值得继续了解吗？'),
    q('对方态度', '对方现在怎样看待我和这段关系？'),
    q('暧昧走向', '这段暧昧会自然推进，还是会逐渐淡下来？'),
    q('主动联系', '我现在适合主动联系或约对方见面吗？'),
    q('是否表白', '现在适合表达心意吗，需要注意什么？'),
    q('相亲对象', '这次相亲认识的人适合继续接触吗？'),
    q('网恋异地', '这段网络或异地关系值得投入并走向现实吗？'),
  ] },
  { key: 'matter-relationship', label: '恋爱、伴侣与婚姻', icon: '缘', description: '推进、磨合、承诺、婚姻与边界', questions: [
    q('关系走向', '我和对方接下来一段时间的关系会怎样发展？'),
    q('关系推进', '这段关系现在适合更进一步吗？'),
    q('长期可能', '我们适合长期相处或进入婚姻吗？'),
    q('沟通矛盾', '这次矛盾真正的症结是什么，怎样沟通更有效？'),
    q('信任问题', '这段关系中的不安来自哪里，应该如何建立信任？'),
    q('承诺婚期', '近期适合谈婚论嫁、订婚或确定婚期吗？'),
    q('家庭阻力', '双方家庭对这段关系的影响该怎样处理？'),
    q('现实条件', '距离、工作或经济问题会怎样影响这段关系？'),
    q('婚姻危机', '我们的婚姻目前主要问题在哪里，还有修复空间吗？'),
    q('分居离婚', '面对分居或离婚的选择，我最需要评估什么？', '婚变 婚姻去留'),
    q('第三方影响', '关系受到第三方影响时，我应该先确认什么并建立怎样的边界？', '第三者 出轨 外遇'),
    q('再婚家庭', '这段再婚关系或重组家庭需要提前磨合什么？'),
    q('相处边界', '我在这段关系里最需要建立什么边界？'),
    q('关系取舍', '这段关系值得继续投入吗，我最该看清什么？'),
  ] },
  { key: 'matter-breakup', label: '冷战、分手与复合', icon: '合', description: '联系时机、复合条件与关系收尾', questions: [
    q('冷战破冰', '现在适合主动打破冷战吗，怎样开口更合适？'),
    q('分手原因', '这次分开的核心原因是什么，还有修复空间吗？'),
    q('复合可能', '我们还有重新开始的可能吗，需要满足什么条件？'),
    q('联系时机', '我应该现在联系对方，还是再给彼此一些时间？'),
    q('对方近况', '对方目前对这段关系还保留怎样的态度？'),
    q('旧人新缘', '我更适合等待旧关系，还是向新的缘分开放？'),
    q('是否放下', '这段关系是否已经到了应该真正放下的时候？'),
    q('体面收尾', '我应该怎样结束这段关系，减少反复和消耗？'),
  ] },
  { key: 'matter-career', label: '求职、工作与职场', icon: '业', description: '面试、入职、升迁、离职与职场关系', questions: [
    q('求职机会', '我近期的求职机会怎样，应该重点投什么方向？'),
    q('面试结果', '这次面试或考核的进展如何，我还应补足什么？'),
    q('录用选择', '这份工作或录用机会适合我吗？'),
    q('试用转正', '试用期能否顺利推进，我需要重点改善什么？'),
    q('升职加薪', '近期适合争取升职、加薪或更大职责吗？'),
    q('换岗调动', '我适合申请转岗、调动或改变职责吗？'),
    q('离职时机', '我现在适合离职吗，怎样安排风险更小？', '辞职 裸辞 跳槽'),
    q('裁员变动', '面对裁员、降薪或组织调整，我应该提前准备什么？', '失业 优化 劝退'),
    q('工作选择', '稳定但普通的工作和更有风险的新机会，我该怎样取舍？'),
    q('留下发展', '当前公司还有值得我继续积累的发展空间吗？'),
    q('上下级关系', '我该怎样处理与领导、下属或同事的关系？'),
    q('职场冲突', '眼前的职场冲突应该正面处理还是暂时回避？'),
  ] },
  { key: 'matter-retirement', label: '退休、返聘与人生转型', icon: '休', description: '退休时机、收入安排、生活重心与第二职业', questions: [
    q('退休时机', '我现阶段适合按计划退休、延后退休，还是提前做过渡安排？'),
    q('返聘选择', '这次返聘、顾问或兼职机会适合接受吗，边界应该怎样约定？'),
    q('第二职业', '退休或离开原行业后，我适合发展怎样的第二职业？', '再就业 退休创业 顾问 兼职'),
    q('收入衔接', '从工作收入转向养老金和储蓄后，我最需要先调整什么？'),
    q('生活重心', '退休后的生活重心应该放在家庭、兴趣、社交还是继续工作？'),
    q('退休居所', '退休后继续留在当前城市、回乡还是换一个地方生活更合适？'),
    q('家庭协商', '退休安排会怎样影响伴侣与家人，哪些现实问题需要提前谈清楚？'),
    q('照护准备', '进入退休阶段前，我应怎样准备健康管理、长期照护和紧急支持？'),
  ] },
  { key: 'matter-business', label: '创业、项目与经营', icon: '商', description: '立项、合伙、客户、团队与经营节奏', questions: [
    q('是否创业', '我现在适合开始创业或独立经营吗？'),
    q('项目立项', '这个项目值得立项推进吗，关键风险是什么？'),
    q('项目成败', '当前项目的阻力在哪里，怎样提高落地机会？'),
    q('合伙判断', '这个合伙人适合长期合作吗，权责应怎样划分？'),
    q('客户合作', '这个客户或订单值得接吗，需要防范什么？'),
    q('合同谈判', '这次商务谈判应该坚持什么、让步什么？'),
    q('团队用人', '这个人适合加入团队或承担关键职位吗？'),
    q('扩大经营', '现在适合扩店、扩团队或增加投入吗？'),
    q('收缩转型', '当前业务应该继续、收缩还是转型？'),
    q('产品发布', '这个产品或服务现在适合发布吗，应该先验证什么？'),
    q('推广获客', '当前推广和获客的突破口可能在哪里？', '营销 流量 销售'),
    q('开业选址', '这个开业时间和经营地点是否合适？'),
  ] },
  { key: 'matter-money', label: '收入、投资与交易', icon: '财', description: '收入、借贷、买卖、回款与风险控制', questions: [
    q('收入机会', '我近期增加收入的机会主要来自哪里？'),
    q('副业选择', '这项副业值得开始吗，适合怎样投入？'),
    q('投资风险', '这项投资当前最大的风险是什么，我该怎样控制投入？'),
    q('买入卖出', '这项资产现在更适合买入、持有还是退出？'),
    q('借钱给人', '这笔钱适合借给对方吗，回收风险如何？'),
    q('借款融资', '我现在适合借款、贷款或引入资金吗？'),
    q('债务处理', '当前债务应该优先处理哪一部分？'),
    q('回款到账', '这笔款项的回收会遇到什么阻力，如何推进？'),
    q('大额消费', '这笔大额支出现在值得做吗？'),
    q('交易签约', '这次买卖或交易适合成交吗，需要核对什么？'),
  ] },
  { key: 'matter-protection', label: '保险、社保与长期保障', icon: '保', description: '投保理赔、医保社保、养老金与家庭保障', questions: [
    q('投保判断', '这份保险是否符合我的实际保障缺口，投保前最需要核对什么？'),
    q('险种取舍', '面对几种保障方案，我应该优先覆盖哪类风险？', '医疗险 重疾险 意外险 寿险'),
    q('理赔进展', '这次保险理赔可能卡在哪个环节，我应该补齐哪些现实材料？'),
    q('医保社保', '当前医保、社保或灵活就业参保安排最需要先处理什么？'),
    q('公积金安排', '这次公积金提取、贷款或账户转移应该怎样安排更稳妥？'),
    q('养老储备', '现阶段的养老金和长期储蓄准备是否需要调整重点？'),
    q('家庭保障', '家庭成员之间应该怎样分配保障预算和紧急备用金？'),
    q('受益人安排', '保单受益人和家庭财务安排有哪些关系需要提前说明？'),
  ] },
  { key: 'matter-study', label: '学业、考试与进修', icon: '学', description: '择校、专业、考试、考证与深造', questions: [
    q('专业选择', '我更适合选择哪个专业或学习方向？'),
    q('择校判断', '这所学校或这个培养项目适合我吗？'),
    q('考试趋势', '这次考试的准备状态如何，薄弱点在哪里？', '高考 中考 考研 考公 考编 考证 教资'),
    q('复试面试', '复试、答辩或学业面试需要重点准备什么？'),
    q('考证进修', '现在准备这项证书或进修计划时机合适吗？'),
    q('升学深造', '我适合继续读研、读博或出国深造吗？'),
    q('转学转专业', '我现在适合转学、转专业或改变研究方向吗？'),
    q('导师合作', '我与导师或研究团队的合作该怎样推进？'),
    q('学习瓶颈', '我目前学习效率低的关键原因是什么？'),
  ] },
  { key: 'matter-family', label: '父母、手足与家庭', icon: '家', description: '家庭沟通、照护、共同决定与亲属关系', questions: [
    q('父母沟通', '我和父母之间当前最需要改善的沟通是什么？'),
    q('手足关系', '我与兄弟姐妹的矛盾应该怎样处理？'),
    q('亲属往来', '这段亲属关系应该亲近、保持距离还是重新协商边界？'),
    q('家庭决定', '这项家庭共同决定怎样推进更稳妥？'),
    q('婆媳姻亲', '我该怎样处理伴侣家庭或姻亲关系？'),
    q('家庭分歧', '家人意见不一致时，我应该怎样促成共识？'),
    q('家庭边界', '面对家人的期待和责任，我应该承担到什么程度？'),
    q('家庭变动', '近期家庭结构、成员关系或共同生活会出现什么变化？'),
  ] },
  { key: 'matter-elder', label: '长辈、养老与家产', icon: '承', description: '长辈健康、照护安排、祖业继承与家庭资源', questions: [
    q('长辈健康', '从传统盘面看，家中长辈近期更需要留意哪些健康与安全问题，现实中应先做哪些检查？'),
    q('照护安排', '家中长辈的照护、陪诊与生活支持怎样协调更合适？'),
    q('养老选择', '居家养老、与子女同住或机构照护，应该重点比较哪些现实条件？'),
    q('重大治疗', '面对长辈的重大治疗与照护决定，家庭应该先统一哪些信息和底线？'),
    q('临终准备', '当长辈进入生命末期或长期重病阶段，家人应怎样安排陪伴、照护与未尽事项？', '终末期 安宁疗护 后事'),
    q('家庭财务', '这项家庭共同财务安排最需要先解决什么？'),
    q('祖业家产', '祖业、房产或家庭资源应该怎样管理和延续更稳妥？'),
    q('遗产分配', '涉及遗嘱、家产或继承协商时，我最需要注意什么？'),
    q('家族责任', '这项家族责任应该由谁承担，怎样避免长期失衡？'),
  ] },
  { key: 'matter-children', label: '子女、备孕、孕产与教育', icon: '子', description: '子息缘、备孕孕产、亲子沟通与成长选择', questions: [
    q('家庭准备', '我们现阶段适合开始准备迎接孩子吗？'),
    q('生育决定', '我们是否适合在现阶段进入养育孩子的人生阶段？', '怀孕 要孩子 生育 二胎'),
    q('子息缘分', '从传统术数角度看，我们当前的子息缘、主要阻力与可把握的条件是什么？', '子女缘 子嗣'),
    q('备孕时机', '当前备孕计划处在怎样的节奏，哪些时间窗口更值得积极准备？'),
    q('生育结果', '从传统盘面看，这次备孕计划的趋势、阻力与可能转折在哪里？'),
    q('辅助生殖', '这次辅助生殖或医学助孕计划应怎样安排节奏、资源和心理准备？', '试管 人工授精 IVF'),
    q('孕期关注', '当前孕期更需要重视哪些身心状态、家庭支持与现实检查？', '怀孕 保胎 产检'),
    q('分娩安排', '临近分娩时，家庭、医疗与时间安排最需要提前准备什么？', '生产 剖腹产 顺产'),
    q('再育选择', '我们现阶段适合准备二胎或继续扩大家庭吗，主要压力在哪里？', '二胎 三胎 再生育'),
    q('子女数量象意', '传统盘面中的子女缘厚薄、数量象意与养育承载如何理解？', '几个孩子 子女数量'),
    q('亲子关系', '我和孩子之间最需要改善的互动是什么？'),
    q('教育方向', '孩子当前更需要培养哪方面能力？'),
    q('学校选择', '这个学校、班级或教育环境适合孩子吗？'),
    q('兴趣培养', '这项兴趣或特长值得孩子继续投入吗？'),
    q('青春期沟通', '面对孩子当前的反抗或沉默，我该怎样沟通？'),
    q('家庭分工', '围绕孩子的照护和教育，家庭分工怎样调整更好？'),
  ] },
  { key: 'matter-home', label: '租房、买房与居住', icon: '宅', description: '选房、搬家、装修、室友与居住环境', questions: [
    q('买房时机', '我现在适合买房吗，应该优先考虑什么？'),
    q('房源选择', '这个房源适合长期居住或持有吗？'),
    q('卖房时机', '这套房现在适合出售吗，怎样安排更顺利？'),
    q('租房判断', '这套出租房或租约适合签下吗？'),
    q('搬家安排', '我近期适合搬家吗，怎样选择时间和方向？'),
    q('装修动工', '这次装修或动工怎样安排更稳妥？'),
    q('室友相处', '这位室友或合租安排是否合适？'),
    q('邻里问题', '当前邻里或居住纠纷应该怎样处理？'),
    q('空间调整', '我最需要先调整家中哪个空间或生活动线？'),
  ] },
  { key: 'matter-vehicle', label: '车辆、驾考与交通工具', icon: '车', description: '买卖车辆、驾考上路、维修事故与长途出行', questions: [
    q('买车选择', '我现阶段适合买车吗，应该优先考虑预算、用途还是使用成本？'),
    q('车辆判断', '这辆新车或二手车值得购买吗，现实中最需要检查什么？'),
    q('卖车换车', '当前适合出售或更换车辆吗，怎样安排损失更小？'),
    q('驾考安排', '这次驾考的准备重点在哪里，考试前怎样调整更稳？'),
    q('新手上路', '我近期开始独立驾驶最需要注意哪些安全与心理问题？'),
    q('维修取舍', '这辆车更适合继续维修、处理后出售还是直接更换？'),
    q('事故处理', '发生交通事故后，我应先按什么顺序处理安全、证据、保险和沟通？'),
    q('牌照过户', '这次上牌、过户、年检或手续办理会卡在哪里？'),
    q('长途自驾', '这次长途自驾是否适合按原计划进行，应重点检查哪些车辆与路线条件？'),
  ] },
  { key: 'matter-travel', label: '出行、换城与远行', icon: '行', description: '旅行、差旅、迁居、留学与异地发展', questions: [
    q('近期出行', '这次出行适合按原计划进行吗？'),
    q('旅行时间', '这趟旅行现在出发合适，还是应该改期？'),
    q('差旅任务', '这次出差能否达到目的，需要注意什么？'),
    q('换城发展', '我适合去这座城市生活或工作吗？'),
    q('长期定居', '这个地区适合我长期定居吗？'),
    q('海外发展', '我现阶段适合留学、外派或海外发展吗？'),
    q('同行关系', '这次和对方同行是否顺利，分工要注意什么？'),
    q('行程变化', '面对行程延误或临时变化，我应该怎样调整？'),
  ] },
  { key: 'matter-social', label: '朋友、人际与合作', icon: '友', description: '友情、贵人、团队、信任与边界', questions: [
    q('友情去留', '这段友情值得继续投入和维护吗？'),
    q('重新和好', '我适合主动修复这段朋友关系吗？'),
    q('对方可信度', '这个人是否值得信任，我需要观察哪些现实信号？'),
    q('贵人机会', '近期谁或哪类关系可能给我带来帮助？'),
    q('社交圈层', '我是否应该进入这个圈子或参加这项社交活动？'),
    q('团队合作', '这个团队的合作前景怎样，我适合承担什么角色？'),
    q('人情往来', '这次人情往来应该怎样把握分寸？'),
    q('借物借钱', '对方提出的借物或借钱请求应该怎样处理？'),
    q('关系边界', '面对这段消耗我的关系，我该怎样建立边界？'),
  ] },
  { key: 'matter-competition', label: '竞赛、竞标与竞争结果', icon: '竞', description: '比赛、评选、投标、竞聘与公开竞争', questions: [
    q('比赛准备', '这次比赛或竞技活动的胜算和短板在哪里？'),
    q('评选入围', '这次评选、申报或评奖我应该重点准备什么？'),
    q('投标竞标', '这次投标或竞标值得投入吗，竞争关键在哪里？'),
    q('竞聘岗位', '这次竞聘或内部选拔我应该怎样提高机会？'),
    q('竞争对手', '面对当前竞争者，我应该正面竞争还是调整策略？'),
    q('结果等待', '这项竞争结果尚未公布，我还可以补做什么？'),
  ] },
  { key: 'matter-creative', label: '创作、发布与个人影响力', icon: '创', description: '作品、内容、自媒体、曝光与个人品牌', questions: [
    q('创作方向', '我现在最值得长期投入的创作方向是什么？'),
    q('作品发布', '这件作品现在适合发布吗，还需要补足什么？'),
    q('内容选题', '我接下来做什么内容更容易形成稳定积累？'),
    q('自媒体发展', '这个自媒体或个人账号值得继续经营吗？'),
    q('合作创作', '这次联合创作或内容合作适合推进吗？'),
    q('公开表达', '我现在适合公开表达这个观点或经历吗？'),
    q('个人品牌', '我应该怎样确立自己的专业形象和个人定位？'),
  ] },
  { key: 'matter-reputation', label: '名誉、舆情与公众形象', icon: '名', description: '公开表达、隐私泄露、争议回应与声誉修复', questions: [
    q('名誉趋势', '这件事会怎样影响我的名誉、信用或公众评价？'),
    q('公开回应', '面对当前争议，我适合公开回应、私下沟通还是暂时沉默？'),
    q('舆情风险', '这次发布、直播或公开行动可能引发什么误读与舆情风险？'),
    q('隐私泄露', '面对隐私泄露、偷拍视频或信息扩散，我应该先完成哪些现实止损？'),
    q('举报投诉', '遭遇举报、投诉或平台处罚时，怎样准备证据和回应更稳妥？'),
    q('谣言诽谤', '面对谣言、诽谤或恶意评价，我应该怎样判断回应边界？'),
    q('信用修复', '当前受损的个人信用、职业评价或合作信任应怎样逐步修复？'),
    q('危机公关', '这次公众形象危机的核心矛盾是什么，处理顺序应该怎样安排？'),
  ] },
  { key: 'matter-image', label: '外貌、改名与个人呈现', icon: '形', description: '形象调整、医美健身、姓名与对外风格', questions: [
    q('形象调整', '我现阶段最值得调整的个人形象、穿搭或表达风格是什么？'),
    q('减重塑形', '这次减重、增肌或体态改善计划怎样安排更容易长期坚持？'),
    q('医美选择', '在确认医疗风险与资质后，这项医美或外形调整是否符合我的真实需求？'),
    q('改名取名', '我现在是否有必要改名、使用艺名或调整常用称呼？'),
    q('职业形象', '怎样的专业形象更符合我的优势并有利于当前发展？'),
    q('上镜曝光', '近期适合拍摄、上镜、演出或进行重要公开展示吗？'),
  ] },
  { key: 'matter-wellbeing', label: '健康、疾病、治疗与恢复', icon: '养', description: '体质风险、检查治疗、康复与生活节奏', questions: [
    q('近期状态', '我近期的身心状态最需要留意和调整什么？'),
    q('寿元长短', '按传统术数的寿元判断，我的先天生命力、寿元长短倾向与影响寿元的关键因素是什么？请同时指出哪些部分不能只凭盘面确定。', '寿命 寿元 阳寿 长寿 夭寿'),
    q('生命关口', '哪些年龄段或年份在传统盘面中属于健康与安全压力较高的生命关口，应提前做哪些现实检查和防护？', '生死关 大限 关煞'),
    q('疾病倾向', '从传统术数角度看，我当前更容易出现哪些失衡或疾病风险，可能在哪些阶段显现？', '疾厄 病灶 患病'),
    q('病情趋势', '这段健康问题目前处在怎样的发展阶段，我应优先完成哪些检查和现实处理？', '病情 好转 恶化'),
    q('检查结果', '这次检查或复查前后最需要关注什么，后续恢复节奏如何？', '体检 化验 影像 复查'),
    q('求医选择', '当前更适合继续原有诊疗、寻求第二意见，还是先补齐检查信息？', '医生 医院 转院'),
    q('治疗取舍', '面对不同治疗方案，我应重点比较哪些现实条件、风险与承受能力？', '用药 治疗方案'),
    q('手术时机', '在医生确认手术必要性的前提下，怎样安排手术与恢复节奏更稳妥？'),
    q('康复转折', '当前康复过程的主要阻力、可能转折和需要长期坚持的部分是什么？'),
    q('复发风险', '从传统节律看哪些阶段更需要防范旧疾反复，并提前做好医学随访？'),
    q('压力来源', '我反复感到压力或疲惫的主要来源是什么？'),
    q('情绪循环', '我为什么总在同一种情绪里反复，突破口在哪里？'),
    q('作息习惯', '我当前最需要先改变哪项生活习惯？'),
    q('休息恢复', '我现在更需要休息恢复，还是适度行动起来？'),
    q('检查准备', '这次检查或就医前该怎样准备，重点关注哪些环节？'),
    q('低谷应对', '我该怎样度过目前的低谷，先恢复哪一部分生活？'),
    q('自我边界', '我怎样减少内耗，同时保持对现实负责？'),
  ] },
  { key: 'matter-safety', label: '灾关、安全与突发风险', icon: '安', description: '事故隐患、冲突风险、防骗与应急准备', questions: [
    q('近期风险', '我近期是否处在更需要谨慎的阶段，最该排查哪些现实风险？', '灾关 劫数 关口'),
    q('出行安全', '这次出行有哪些安全隐患需要提前规避，是否应调整路线或时间？'),
    q('事故隐患', '当前生活、工作或居住环境中，哪类事故隐患最值得优先检查？'),
    q('冲突升级', '眼前的矛盾是否有升级风险，我应怎样保护自己并减少正面冲突？'),
    q('诈骗骗局', '这件事是否存在诈骗、隐瞒或诱导风险，我应核验哪些现实证据？', '被骗 资金盘 杀猪盘'),
    q('财物损失', '近期怎样降低破财、盗损、遗失或错误付款的风险？'),
    q('应急准备', '面对当前不确定情况，我最需要准备哪些备用方案、联系人和现实资源？'),
  ] },
  { key: 'matter-contract', label: '合同、手续与维权', icon: '契', description: '签约、审批、纠纷、证据与协商，不代替法律意见', questions: [
    q('合同签署', '这份合同适合签吗，最需要核对哪些条款和风险？'),
    q('手续审批', '这项申请、审批或手续会卡在哪里？'),
    q('纠纷协商', '当前纠纷更适合协商、调解还是准备正式程序？'),
    q('维权节奏', '在咨询专业人士的前提下，我该怎样安排维权步骤？'),
    q('证据准备', '这件事最需要先保留和整理哪些现实证据？'),
    q('投诉申诉', '这次投诉、申诉或复议应该怎样组织重点？'),
    q('诉讼判断', '在获得法律意见后，这件事推进诉讼还需权衡什么？', '官司 起诉 应诉 仲裁'),
    q('和解条件', '什么样的和解条件对我更稳妥？'),
  ] },
  { key: 'matter-admin', label: '证件、申请与行政事务', icon: '申', description: '签证、户籍、许可、申报、审核与办理进度', questions: [
    q('签证申请', '这次签证或出入境申请最需要准备什么？', '护照 移民 留学签 工作签'),
    q('户籍手续', '这项户籍、居住证或身份手续应该怎样推进？'),
    q('资格许可', '这项资质、牌照或许可申请会卡在哪里？'),
    q('材料审核', '这次材料审核最容易遗漏什么，我该怎样补足？'),
    q('申报审批', '这项申报或审批近期会怎样推进？'),
    q('申诉复核', '这次复核、申诉或重新申请应该调整什么？'),
    q('办理时机', '这项手续现在办理合适，还是换一个时间更顺？'),
  ] },
  { key: 'matter-digital', label: '数码、账号与平台事务', icon: '网', description: '账号申诉、数据设备、网购纠纷与线上合作', questions: [
    q('账号申诉', '账号被限制、封禁或误判后，我应该怎样准备材料并推进申诉？', '封号 限流 平台处罚'),
    q('数据恢复', '面对文件、照片或聊天记录丢失，我应该先采取哪些安全的恢复措施？'),
    q('设备更换', '这台手机、电脑或数码设备适合维修、升级还是更换？'),
    q('网购纠纷', '这次网购、二手交易或平台纠纷应该怎样保留证据并推进处理？'),
    q('线上合作', '这次远程合作、网络签约或线上接单值得推进吗，怎样明确交付边界？'),
    q('隐私处置', '发现账号或个人信息可能泄露后，我应该先完成哪些止损和安全设置？'),
    q('网络骗局', '这个链接、客服、投资或兼职信息是否可疑，我应核验哪些证据再行动？', '钓鱼 盗号 刷单 虚假客服'),
    q('平台变现', '当前平台上的内容、店铺或服务适合继续投入并尝试变现吗？'),
  ] },
  { key: 'matter-timing', label: '日期、时机与行动安排', icon: '时', description: '婚礼、搬家、开业、签约与重要行动', questions: [
    q('结婚领证', '结婚、领证或办婚礼应该怎样选择日期？'),
    q('搬家入宅', '搬家或入宅应该怎样选择合适时间？'),
    q('开业开张', '开业、开店或发布项目应该怎样择日？'),
    q('签约交易', '签约、交割或重要交易哪段时间更合适？'),
    q('出行启程', '远行、出差或启程应该怎样安排日期？'),
    q('考试面试', '考试、面试或答辩前后怎样安排节奏更顺？'),
    q('装修动工', '装修、动工或安装应该怎样选择时间？'),
    q('重要会面', '谈判、表白或重要会面什么时候推进更合适？'),
  ] },
  { key: 'matter-daily', label: '日常琐事与即时决定', icon: '事', description: '联系、见面、购物、安排与临时变化', questions: [
    q('今天提醒', '今天最值得留意的事情和行动提醒是什么？'),
    q('是否联系', '我现在适合主动联系对方，还是再等一等？'),
    q('是否见面', '今天或近期适合安排这场见面吗？'),
    q('信息回复', '这条消息应该现在回复吗，语气要注意什么？'),
    q('临时邀约', '这个临时邀约值得参加吗？'),
    q('购买决定', '这件东西现在值得买吗，还是再等等？'),
    q('退换处理', '这件商品更适合保留、退换还是转卖？'),
    q('维修更换', '这个物品应该继续维修还是直接更换？'),
    q('预约安排', '这个预约或办事时间是否合适？'),
    q('临时变化', '面对突然出现的变化，我应该先做什么？'),
    q('等待结果', '这件正在等待结果的事情近期会有怎样的进展？'),
    q('今晚行动', '我今天剩下的时间最适合处理什么？'),
  ] },
  { key: 'matter-lost', label: '失物、宠物与寻找', icon: '寻', description: '寻找方向、行动顺序与现实线索', questions: [
    q('寻找失物', '丢失的物品还有机会找回吗，应该先去哪里找？'),
    q('失物方位', '这件失物可能在哪个方向或环境中？'),
    q('寻找时机', '现在应该立刻寻找，还是等待线索出现？'),
    q('宠物走失', '走失的宠物可能往哪里去，我应优先采取什么行动？'),
    q('领养宠物', '这只宠物适合进入我的家庭吗，需要准备什么？'),
    q('宠物照护', '近期怎样调整宠物的照护安排更稳妥？'),
    q('联系失联者', '面对暂时失联的人，我该按什么顺序确认情况？'),
    q('快递物件', '这件延误或遗失的快递该怎样推进处理？'),
  ] },
  { key: 'matter-tradition', label: '梦境、祈福与传统习俗', icon: '祈', description: '梦境象意、祭祖祈愿、还愿与民俗安排', questions: [
    q('反复梦境', '这个反复出现的梦在传统象意与现实心理层面分别可能提醒什么？'),
    q('异常梦象', '这个印象强烈的梦更像近期情绪、生活线索还是传统象意，我应怎样验证？'),
    q('祈福许愿', '围绕当前愿望，我适合怎样安排祈福、许愿与现实行动？'),
    q('还愿履愿', '这项还愿、履愿或答谢应该怎样安排才真诚且量力而行？'),
    q('祭祖追思', '近期适合怎样安排祭祖、追思或家族纪念活动？'),
    q('居所不安', '最近在居所中感到不安，我应先排查哪些环境、睡眠与安全因素，再怎样理解传统象意？'),
    q('传统仪式', '这项传统仪式是否适合进行，怎样避免铺张、迷信消费或影响正常生活？'),
    q('心灵方向', '我近期对宗教、玄学或修行的兴趣来自什么需求，适合怎样理性探索？'),
  ] },
];

const natalInspirationGroups: InspirationGroup[] = [
  { key: 'natal-overview', label: '完整命书', icon: '命', description: '从命局根基到一生运势的全景解读', questions: [
    n('完整命书', '请为我完成一份完整命书', '命局主轴与承载、外貌性格与天赋、家庭六亲、学业事业与财富、田宅名望、婚恋子息、健康寿元、灾关官非、人际迁移、精神世界与晚年归宿，以及一生主要阶段和近期时间窗口', '综合 全盘 一生命运 人生总论 寿元 疾病 生育 灾关'),
  ] },
  { key: 'natal-structure', label: '命局结构', icon: '衡', description: '旺衰、喜忌、体用、格局与盘面骨架', questions: [
    n('命局结构', '请完整解读我的命局结构', '核心力量的强弱与承载、整体流通和平衡、格局体用与喜忌、主导结构和辅助因素，以及这些结构对性格、事业、财富、关系和健康的影响', '旺衰 身强 身弱 喜忌 用神 十神 体用 格局 调候 宫位 星曜 相位'),
  ] },
  { key: 'natal-appearance', label: '外貌与气质', icon: '形', description: '体貌特征、气质辨识度、审美与年龄变化', questions: [
    n('外貌与气质', '请完整解读我的外貌、气质与个人呈现', '体态轮廓、五官与神态、声音表达、第一印象、审美和穿搭倾向、可强化的形象优势，以及不同人生阶段的气质变化；区分稳定倾向与无法从盘面确认的细节', '外貌 长相 五官 身材 气质 形象 穿搭'),
  ] },
  { key: 'natal-character', label: '性格与天赋', icon: '性', description: '人格底色、能力优势、盲点与成长路线', questions: [
    n('性格与天赋', '请完整解读我的性格、天赋与成长课题', '内在驱动力、思维情绪与沟通方式、决策和压力反应、稳定天赋与可迁移能力、容易过度使用的优势、认知和关系盲点，以及成长和环境选择', '性格 天赋 优势 盲点 成长 人格 能力'),
  ] },
  { key: 'natal-emotion', label: '情绪模式与心理韧性', icon: '心', description: '安全感、压力反应、内耗来源与恢复方式', questions: [
    n('情绪模式与心理韧性', '请完整解读我的情绪模式、内在安全感与心理韧性', '情绪感受和表达方式、安全感来源、压力与冲突反应、反复内耗的触发条件、独处和关系中的恢复方式、可依赖的心理资源，以及容易失衡和逐渐成熟的阶段', '情绪 心理 安全感 内耗 焦虑 压力 韧性 恢复'),
  ] },
  { key: 'natal-creativity', label: '才艺、创作与表达能力', icon: '艺', description: '审美灵感、语言表演、作品路线与长期积累', questions: [
    n('才艺、创作与表达能力', '请完整解读我的才艺、创作与表达能力', '审美和灵感来源、文字语言、音乐表演、视觉设计或手工实作等倾向，创作纪律、公开表达和被看见的方式，兴趣与职业化的边界，以及作品积累、突破和形成影响力的阶段', '才艺 艺术 创作 写作 音乐 表演 设计 表达 灵感 作品'),
  ] },
  { key: 'natal-family', label: '祖业、父母与家庭起点', icon: '亲', description: '家境根基、父母关系、祖业资源与早年塑造', questions: [
    n('祖业、父母与家庭起点', '请完整解读我的祖业、父母与原生家庭', '家庭资源与文化氛围、祖业和迁徙背景、父母各自的角色及亲疏模式、早年支持和限制、代际影响、离家独立、继承分配与后续照护责任', '祖业 父母 家境 原生家庭 长辈 家族 祖荫'),
  ] },
  { key: 'natal-siblings', label: '手足与同辈关系', icon: '同', description: '兄弟姐妹、同辈竞争、互助与资源边界', questions: [
    n('手足与同辈关系', '请完整解读我的手足、同辈与资源竞争', '兄弟姐妹或同辈缘分、亲疏互助和资源竞争、成年后的责任边界、利益协作与冲突条件，以及关系变化和共同事务的阶段', '兄弟 姐妹 手足 同辈 比劫 竞争 伙伴'),
  ] },
  { key: 'natal-study', label: '学历、考试与学习能力', icon: '学', description: '认知方式、学历层次、考试节奏与终身学习', questions: [
    n('学历、考试与学习能力', '请完整解读我的学业、考试与学习路线', '理解、记忆、表达、研究、实作和应试能力，适合的学科与评价方式，学历和专业路线、师生关系、留学进修与证书积累，以及重要学习阶段和可验证的学习策略', '学业 学历 考试 高考 考研 读博 留学 专业 学习能力'),
  ] },
  { key: 'natal-career', label: '事业、权责与社会成就', icon: '业', description: '职业赛道、组织位置、权力责任与成就上限', questions: [
    n('事业、权责与社会成就', '请完整解读我的事业格局与社会成就', '适合的行业、职能、组织和工作方式，技术、管理、顾问、创作、运营或自由职业的适配度，领导执行与资源整合能力，职位和成就条件，以及入行、升迁、跳槽、转型和收获阶段', '事业 职业 工作 行业 升迁 权力 地位 成就 官禄'),
  ] },
  { key: 'natal-career-fit', label: '适合行业与工作方式', icon: '职', description: '行业选择、岗位角色、组织环境与职业适配', questions: [
    n('适合行业与工作方式', '请具体解读我适合的行业、岗位与工作方式', '更能发挥优势的行业属性和职能角色，适合技术、管理、销售、顾问、创作、运营或自由职业的条件，大组织与小团队、稳定路径与高变化环境的适配度，容易消耗的工作模式，以及择业和转型的验证标准', '适合行业 职业方向 岗位 工作方式 上班 创业 自由职业 转行'),
  ] },
  { key: 'natal-business', label: '创业、经营与合伙', icon: '商', description: '商业能力、经营模式、团队合伙与成败条件', questions: [
    n('创业、经营与合伙', '请完整解读我的创业、经营与合伙格局', '适合承担的创业角色、产品和客户判断、获客品牌、现金流与成本纪律、团队和控制权、适合的经营模式、常见合伙及扩张风险，以及立项、融资、开业、转型和退出节奏', '创业 经商 生意 经营 合伙 公司 团队 商业模式'),
  ] },
  { key: 'natal-wealth', label: '财富与资产', icon: '财', description: '收入结构、守财能力、经营投资与积累周期', questions: [
    n('财富与资产', '请完整解读我的财富结构与资产运势', '主要收入来源及稳定性、赚钱和守财方式、消费储蓄、现金流、杠杆借贷、共同财务与投资风险，以及收入增长、资产积累、债务压力、破财和收缩阶段', '财富 财运 收入 资产 投资 守财 财库 破财 现金流'),
  ] },
  { key: 'natal-wealth-style', label: '财库、守财与风险偏好', icon: '库', description: '财富留存、消费习惯、投资边界与破财条件', questions: [
    n('财库、守财与风险偏好', '请具体解读我的财库、守财能力与风险偏好', '收入留存和现金流习惯、消费与储蓄驱动力、适合主动经营还是稳健积累、投资和杠杆的承受边界、共同财务及人情借贷风险、容易破财的情境，以及改善财富纪律和积累效率的阶段', '财库 守财 存钱 消费 投资 风险偏好 破财 借贷 现金流'),
  ] },
  { key: 'natal-property', label: '田宅、置业与家产', icon: '宅', description: '房产缘、居住环境、继承分配与不动产周期', questions: [
    n('田宅、置业与家产', '请完整解读我的田宅、置业与家产运势', '稳定居所和不动产倾向、置业与持有方式、居住环境、家庭出资和共同产权、祖宅继承与分配争议，以及购置、出售、搬迁、装修和资产重组阶段', '田宅 房产 买房 卖房 置业 祖宅 家产 继承 居住'),
  ] },
  { key: 'natal-reputation', label: '名望、公众形象与评价', icon: '名', description: '社会声誉、曝光表达、口碑与影响力形成', questions: [
    n('名望、公众形象与评价', '请完整解读我的名望、公众形象与社会评价', '在组织、行业和公众中的形象、被认可的方式、适合的表达与曝光路线、名望形成条件、隐私舆情和声誉风险，以及口碑增长、争议放大和形象修复阶段', '名望 名气 声誉 公众形象 影响力 成名 舆情 口碑'),
  ] },
  { key: 'natal-love', label: '婚恋与伴侣', icon: '缘', description: '情感模式、适配对象、婚缘节奏与婚后课题', questions: [
    n('婚恋与伴侣', '请完整解读我的婚恋、伴侣与亲密关系', '吸引和依恋模式、情绪沟通与亲密边界、适配伴侣的性格及生活条件、短期吸引和长期适配、婚期婚后分工、家庭经济与异地影响，以及相识、承诺、危机、分合和再婚倾向', '婚恋 感情 伴侣 婚姻 桃花 配偶 夫妻宫 早婚 晚婚 离婚 再婚'),
  ] },
  { key: 'natal-partner-profile', label: '正缘画像与婚恋时机', icon: '侣', description: '对象特征、相识环境、关系识别与婚期窗口', questions: [
    n('正缘画像与婚恋时机', '请具体解读我的适配伴侣、相识方式与婚恋时机', '长期适配对象的性格、价值观、生活方式和现实条件，容易相识的环境与关系路径，短期吸引和稳定关系的识别信号，关系中的互补与冲突，以及较适合相识、确认、结婚和重新选择的阶段', '正缘 配偶画像 对象特征 相识 桃花 婚期 结婚 早婚 晚婚'),
  ] },
  { key: 'natal-children', label: '生育、子息与传承', icon: '子', description: '子息缘、孕育节律、数量象意、亲子教育与传承', questions: [
    n('生育、子息与传承', '请完整解读我的生育、子息与家庭传承', '子息缘和生育意愿、孕育承载与阻力、数量和性别的传统象意、晚育再育或收养等可能、备孕孕产的现实配合、亲子关系和教育方式，以及孕育养育和关系变化阶段', '子女 子息 生育 怀孕 备孕 数量 性别 晚育 流产 亲子 传承'),
  ] },
  { key: 'natal-health', label: '疾厄、体质与疾病风险', icon: '疾', description: '易感系统、疾病象意、情绪身心与恢复能力', questions: [
    n('疾厄、体质与疾病风险', '请完整解读我的体质、疾厄与疾病风险', '先天体质与恢复倾向、主要和次要易感系统、慢性急性、外伤手术、睡眠情绪与压力反应，以及容易失衡、反复和恢复的阶段与现实检查方向', '健康 疾病 病灶 体质 脏腑 慢性病 手术 心理 疾厄'),
  ] },
  { key: 'natal-lifestyle', label: '饮食、作息与生活方式', icon: '养', description: '精力节律、饮食睡眠、运动习惯与环境调整', questions: [
    n('饮食、作息与生活方式', '请完整解读适合我的饮食、作息与生活方式', '精力高低和恢复节律、饮食偏好与容易失衡的习惯、睡眠压力、运动和体重管理、工作休息边界、适合的居住及自然环境，以及不同年龄阶段需要优先调整的生活方式；不替代医学诊断和营养建议', '饮食 作息 睡眠 运动 生活习惯 养生 精力 体重 环境'),
  ] },
  { key: 'natal-longevity', label: '寿元与生命节律', icon: '寿', description: '生命力、寿元层次、健康承载与关键关口', questions: [
    n('寿元与生命节律', '请按传统体系完整解读我的寿元与生命节律', '先天生命力、恢复力与寿元层次的传统倾向，童年到晚年的生命节律，健康和安全压力较高的阶段、保护因素和可调整条件；资料不足时不确定具体死亡年龄', '寿命 寿元 阳寿 长寿 短寿 夭寿 生死关 生命力'),
  ] },
  { key: 'natal-safety', label: '灾关、意外与高风险阶段', icon: '安', description: '伤灾事故、手术冲突、破财官非与风险窗口', questions: [
    n('灾关、意外与高风险阶段', '请完整解读我的灾关、意外与高风险阶段', '外伤手术、交通、水火电器、运动高处、冲突、工作事故、被骗盗损和突发破财等传统风险象意，区分低频高损、日常可控与纯象征，并给出高风险阶段、触发条件、保护因素和现实防护', '灾关 意外 事故 伤灾 手术 车关 水火 破财 劫数'),
  ] },
  { key: 'natal-legal', label: '官非、口舌与规则风险', icon: '法', description: '合同诉讼、权力冲突、是非争议与守法边界', questions: [
    n('官非、口舌与规则风险', '请完整解读我的官非、口舌与规则风险', '与制度、权威、合同和组织规则的互动，误会口舌、劳动合同、税务合规、知识产权、投诉处罚、诉讼仲裁和权力冲突的风险场景，以及易发、协商和解决阶段', '官非 官司 诉讼 口舌 纠纷 合同 举报 处罚 法律'),
  ] },
  { key: 'natal-social', label: '人际、贵人与合作', icon: '交', description: '社交圈层、贵人小人、合作角色与利益边界', questions: [
    n('人际、贵人与合作', '请完整解读我的人际、贵人与合作格局', '社交需求、信任沟通与人情边界，贵人和消耗型关系的特征，团队中的适合角色、授权协商、利益分配、朋友借贷与长期合作风险，以及圈层变化和合作成败阶段', '人际 贵人 小人 合作 团队 社交 朋友 圈层 信任'),
  ] },
  { key: 'natal-support-network', label: '贵人、小人与关键人脉', icon: '助', description: '助力来源、消耗型关系、识人边界与合作年份', questions: [
    n('贵人、小人与关键人脉', '请具体解读我的贵人、小人与关键人脉', '容易提供机会、资源或保护的贵人特征和相识场景，消耗型、竞争型或失信关系的识别信号，自己在关系中的盲点，适合的社交圈层与合作边界，以及贵人出现、关系洗牌和合作风险较高的阶段', '贵人 小人 人脉 圈层 朋友 合作 助力 背叛 识人'),
  ] },
  { key: 'natal-migration', label: '迁移、海外与环境适配', icon: '迁', description: '离乡发展、城市选择、远行海外与安居条件', questions: [
    n('迁移、海外与环境适配', '请完整解读我的迁移、异地与环境发展', '留乡、换城、跨区域、留学外派或海外发展的适配条件，迁移对事业、财富、关系和身心的影响，不同城市环境与生活节奏的选择，以及远行、搬迁、定居和回流阶段', '迁移 换城 异地 海外 留学 移民 外派 定居 环境 驿马'),
  ] },
  { key: 'natal-location-fit', label: '适合城市、方位与气候', icon: '方', description: '地域属性、生活节奏、气候环境与长期定居', questions: [
    n('适合城市、方位与气候', '请具体解读我适合的城市、方位与生活环境', '更适配的地域属性、城市规模、产业结构、生活节奏、气候湿燥寒热和自然环境，留乡与离乡、内陆与沿海、国内与海外的现实取舍，环境对事业关系和身心的影响，以及迁居和定居的有利阶段', '城市 方位 地域 气候 沿海 内陆 南方 北方 定居 环境'),
  ] },
  { key: 'natal-spiritual', label: '精神世界与玄学缘分', icon: '玄', description: '直觉梦境、信仰修行、艺术灵感与内在安顿', questions: [
    n('精神世界与玄学缘分', '请完整解读我的精神世界、信仰与玄学缘分', '直觉梦境、想象和艺术感受，独处与意义追问，对宗教哲学、传统文化、心理学或术数的亲近方式，洞察和焦虑投射的区别，以及适合的学习边界和精神转折阶段', '玄学 宗教 信仰 修行 灵性 梦境 直觉 华盖 偏印'),
  ] },
  { key: 'natal-fortune', label: '福德、享受与生活品质', icon: '福', description: '满足感、福分承载、休闲方式与精神富足', questions: [
    n('福德、享受与生活品质', '请完整解读我的福德、满足感与生活品质', '感受幸福和放松的方式、物质享受与精神满足的平衡、兴趣休闲和独处能力、获得支持与承接好运的条件、容易空耗或过度追逐的部分，以及生活品质提升、内在安定和福分积累的阶段', '福德 福气 享受 幸福感 生活品质 兴趣 休闲 精神富足'),
  ] },
  { key: 'natal-later-life', label: '晚年、养老与人生收束', icon: '归', description: '晚景质量、养老资源、子女支持与精神归宿', questions: [
    n('晚年、养老与人生收束', '请完整解读我的晚年、养老与人生归宿', '中晚年的物质和居住基础、伴侣子女与社交支持、健康照护和自主能力、适合的生活形态、孤独与代际边界，以及退休转换、资产收束、养老地点、照护预案和传承安排', '晚年 晚景 养老 退休 归宿 子女照护 遗嘱 传承'),
  ] },
  { key: 'natal-retirement', label: '退休转型与第二人生', icon: '休', description: '退出职场、角色转换、第二事业与生活重建', questions: [
    n('退休转型与第二人生', '请完整解读我的退休转型与第二人生', '适合离开主职或降低工作强度的条件，退休前后的身份和收入转换，返聘、顾问、兴趣事业或公益参与的适配度，伴侣家庭和社交关系的重新分配，以及退休准备、第二成长和生活稳定的阶段', '退休 返聘 第二职业 第二人生 顾问 兴趣事业 生活转型'),
  ] },
  { key: 'natal-timing', label: '关键年份与重要应期', icon: '期', description: '人生转折、事件触发、验证线索与提前准备', questions: [
    n('关键年份与重要应期', '请梳理我的关键年份、人生转折与重要应期', '学业、事业、财富、婚恋、家庭、迁移和健康安全等领域的重要阶段，事件被触发的盘面条件、前兆与现实验证线索，区分机会窗口、压力测试和结果落地，并重点说明已经历阶段、当前阶段和未来可准备的年份', '关键年份 应期 转折点 大事 时间节点 过去验证 未来阶段'),
  ] },
  { key: 'natal-decadal', label: '大运与人生阶段', icon: '运', description: '十年周期、阶段主线、转折与资源变化', questions: [
    n('大运与人生阶段', '请完整解读我的大运与人生阶段', '每一主要人生周期的核心主题、身份和资源变化，事业财富、关系家庭、健康安全与迁移重点，起步、上升、转换、压力、收获和休整阶段，并详解当前与下一阶段的转折和行动重点', '大运 十年运 人生阶段 转折 起伏 当前大运 下一大运'),
  ] },
  { key: 'natal-annual', label: '流年与近期运势', icon: '年', description: '当年主题、未来趋势、关键月份与行动窗口', questions: [
    n('流年与近期运势', '请完整解读我的流年与近期运势', '今年的核心主题、机会压力和行动顺序，事业财富、关系家庭、健康安全、人际迁移等领域，明年及未来三年的承接关系，以及未来十二个月适合推进、沟通、签约、修复、检查和谨慎决策的窗口', '流年 今年 明年 未来三年 流月 近期运势 时间窗口'),
  ] },
];
const inspirationLibraries: Record<InspirationMode, InspirationGroup[]> = {
  matter: matterInspirationGroups,
  natal: natalInspirationGroups,
};

function createCase(id = 'default-case', label = '时月', isDefault = true): CaseProfile {
  return {
    id,
    label,
    isDefault,
    regionKey: '110101',
    provinceId: '11',
    cityId: '1101',
    regionId: '110101',
    name: '',
    gender: 'female',
    date: '2024-11-02',
    dateType: 'solar',
    isLeapMonth: false,
    time: '16:44',
    timeBasis: 'trueSolar',
    locationName: '北京市 东城区',
    latitude: '39.9042',
    longitude: '116.4074',
    timezone: '8',
  };
}

function createNewCaseDraft(): CaseProfile {
  return {
    ...createCase('new-case-draft', '', false),
    label: '',
    name: '',
    date: '',
    time: '',
  };
}

function hydrateCase(raw: Partial<CaseProfile>, index = 0): CaseProfile {
  const profile: CaseProfile = {
    ...createCase(raw.id || `case-${index}`, raw.label || `案例 ${index + 1}`, index === 0),
    ...raw,
    dateType: raw.dateType === 'lunar' ? 'lunar' : 'solar',
    isLeapMonth: raw.dateType === 'lunar' && raw.isLeapMonth === true,
    timeBasis: 'trueSolar',
  };
  const legacyKey = raw.regionKey || '';
  if (legacyKey === 'tokyo' || legacyKey === 'singapore' || raw.provinceId === 'overseas') {
    profile.provinceId = 'overseas';
    profile.cityId = legacyKey === 'tokyo' || legacyKey === 'singapore' ? legacyKey : raw.cityId || raw.regionId || 'tokyo';
    profile.regionId = profile.cityId;
    applyExternalRegion(profile, profile.regionId);
    return profile;
  }
  const regionId = raw.regionId
    || (/^\d{2,6}$/.test(legacyKey) ? legacyKey : '')
    || legacyRegionIds[legacyKey]
    || '110101';
  const path = findBirthPlaceByRegionId(regionId)
    || (raw.locationName ? findBirthPlaceByDisplayName(raw.locationName) : null)
    || findBirthPlaceByRegionId('110101');
  if (path) applyBirthPlacePath(profile, path);
  return profile;
}

const initialAlmanacMonth = getDefaultAlmanacMonth();

const activeView = ref<AppView>('tools');
const activeSettingsSection = ref<SettingsSection>('preferences');
const activeCasesSection = ref<CasesSection>('input');
const contentRef = ref<HTMLElement | null>(null);
const chatConversationRef = ref<HTMLElement | null>(null);
const ziweiChartScrollRef = ref<HTMLElement | null>(null);
const homeState = ref<'default' | 'chat'>('default');
const homeMode = ref<HomeMode>('divination');
const selectedKind = ref<DivinationKind>('meihua');
const homeChartKind = ref<HomeChartKind>('bazi');
const chartKind = ref<ChartKind>('bazi');
const selectedCaseId = ref('draft-case');
const question = ref('');
const isReading = ref(false);
const chartLoading = ref(false);
const currentResult = ref<ReadingResult | null>(null);
const currentRecord = ref<ReadingRecord | null>(null);
const chartResult = ref<ReadingResult | null>(null);
const chartRecord = ref<ReadingRecord | null>(null);
const chartCache = ref<Record<string, CachedChart>>({});
const compatibilityHistoryRecord = ref<ReadingRecord | null>(null);
const compatibilityBusy = ref(false);
const selectedBaziCycleIndex = ref(0);
const selectedBaziYear = ref<number | null>(null);
const selectedBaziMonth = ref<number | null>(null);
const selectedBaziDayIndex = ref<number | null>(null);
const selectedBaziHourIndex = ref(0);
type BaziFortuneColumnKey = 'dayun' | 'liunian' | 'liuyue' | 'liushi';
const baziFortuneColumnOptions: Array<{ key: BaziFortuneColumnKey; label: string }> = [
  { key: 'dayun', label: '大运' },
  { key: 'liunian', label: '流年' },
  { key: 'liuyue', label: '流月' },
  { key: 'liushi', label: '流时' },
];
const baziFortuneColumnVisibility = reactive<Record<BaziFortuneColumnKey, boolean>>({
  dayun: true,
  liunian: true,
  liuyue: true,
  liushi: true,
});
const showBaziColumnSettings = ref(false);
const baziColumnSettingsRef = ref<HTMLElement | null>(null);
const topbarAiPickerRef = ref<HTMLElement | null>(null);
const topbarCasePickerRef = ref<HTMLElement | null>(null);
const toolPickerRef = ref<HTMLElement | null>(null);
const selectedZiweiScope = ref<ZiweiScope>('origin');
const selectedZiweiPalaceIndex = ref(0);
const dailyFortune = ref<DailyFortuneResult | null>(null);
const agentBaziFortune = ref<BaziFortuneRequest | null>(null);
const selectedWuyunYear = ref(new Date().getFullYear());
const selectedHuangjiYear = ref(new Date().getFullYear());
let chatSessionId = 1;
let agentAbortController: AbortController | null = null;

function formatFortuneDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseFortuneDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

const selectedFortuneDate = ref(formatFortuneDateKey(new Date()));
const selectedFortunePeriod = ref<FortunePeriod>('today');
const isCurrentFortuneDate = computed(() => {
  const selected = parseFortuneDate(selectedFortuneDate.value);
  const current = new Date();
  if (selectedFortunePeriod.value === 'year') return selected.getFullYear() === current.getFullYear();
  if (selectedFortunePeriod.value === 'month') {
    return selected.getFullYear() === current.getFullYear() && selected.getMonth() === current.getMonth();
  }
  return formatFortuneDateKey(selected) === formatFortuneDateKey(current);
});
const selectedFortuneDateLabel = computed(() => {
  const date = parseFortuneDate(selectedFortuneDate.value);
  if (selectedFortunePeriod.value === 'year') return `${date.getFullYear()}年`;
  if (selectedFortunePeriod.value === 'month') return `${date.getFullYear()}年${date.getMonth() + 1}月`;
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
});
const fortuneDatePickerTitle = computed(() => (
  selectedFortunePeriod.value === 'year'
    ? '选择年份'
    : selectedFortunePeriod.value === 'month'
      ? '选择月份'
      : '选择日期'
));
const fortuneCalendarParts = computed(() => {
  const [year = '—', rawMonth = '—', rawDay = '—'] = (dailyFortune.value?.dateKey || '').split('-');
  const monthNumber = Number(rawMonth);
  const dayNumber = Number(rawDay);
  const month = Number.isFinite(monthNumber) && monthNumber > 0 ? String(monthNumber) : rawMonth;
  const day = Number.isFinite(dayNumber) && dayNumber > 0 ? String(dayNumber) : rawDay;
  const period = dailyFortune.value?.period || 'today';
  return {
    year,
    month,
    day,
    lunar: dailyFortune.value?.lunarDate.replace(/^\d{4}年/, '') || '—',
    periodRange: dailyFortune.value?.calendarRangeLabel.replace(/\s\d{2}:\d{2}/g, '') || '—',
    heroValue: period === 'today' ? day : period === 'month' ? month : year,
    heroLabel: period === 'today' ? `${year}年${month}月` : period === 'month' ? `${year}年` : '公历',
  };
});
const homeFortunePreview = ref<DailyFortuneResult | null>(null);
const fortuneLoading = ref(false);
const fortuneError = ref('');
const almanacMode = ref<AlmanacMode>('general');
const almanacMonthFilter = ref<AlmanacMonthFilter>('all');
const almanacMonth = ref(initialAlmanacMonth);
const almanacResult = ref<AlmanacData | null>(null);
const selectedAlmanacDate = ref('');
const almanacError = ref('');
const almanacRangeMonths = ref<AlmanacRangeMonths>(1);
const almanacSearchItems = ref<AlmanacSearchItem[]>([]);
const almanacSearchLoading = ref(false);
const almanacSearchError = ref('');
const showAlmanacSearchModal = ref(false);
const almanacCalendarPanel = ref<HTMLElement | null>(null);
const history = ref<HistoryRecordEntry[]>([]);
const selectedLegacyHistory = ref<LegacyHistoryRecord | null>(null);
const draftCase = ref<CaseProfile>({ ...createCase('draft-case', '新案例', false), date: '', time: '' });
const cases = ref<CaseProfile[]>([]);
const almanacCaseIds = ref<string[]>([]);
const fengShuiCaseIds = ref<string[]>([]);
const newCaseDraft = ref<CaseProfile>(createNewCaseDraft());
const caseEditorDraft = ref<CaseProfile | null>(null);
const showHistory = ref(false);
const showCaseEditor = ref(false);
const showCaseSwitcher = ref(false);
const caseSearch = ref('');
const caseSwitcherSearch = ref('');
const historySearch = ref('');
type HistoryCategoryFilter = 'all' | 'divination' | 'oracle' | 'chart';
type HistoryInterpretationFilter = 'all' | 'interpreted' | 'pending';
const historyCategory = ref<HistoryCategoryFilter>('all');
const historyMethod = ref('all');
const historyInterpretation = ref<HistoryInterpretationFilter>('all');
const formError = ref('');
const chartError = ref('');
const caseError = ref('');
const showInspirationModal = ref(false);
const inspirationSearch = ref('');
const inspirationMode = ref<InspirationMode>('matter');
const selectedInspirationPrompt = ref('');
const showToolPicker = ref(false);
const showAiPicker = ref(false);
const showMobileNav = ref(false);
const expandedInspirationGroups = ref<string[]>(['matter-life']);
const selectedReadingMessage = ref<ChatReadingMessage | null>(null);
const showReadingModal = ref(false);
type ManualDivinationKind = 'meihua' | 'liuyao' | 'xiaoliuren' | 'jinkoujue' | 'qimen' | 'liuren' | 'taiyi';
const pendingManualKind = ref<ManualDivinationKind | null>(null);
const pendingCastingQuestion = ref('');
const oracleInitialQuestion = ref('');
const oracleResult = ref<SsgwData | null>(null);
const chatMessages = ref<ChatMessage[]>([]);
const aiAnswer = ref('');
const aiError = ref('');
const lastAiRequest = ref<AiInterpretationRequest | null>(null);
const lastAiHistoryRecordId = ref<string | null>(null);
const isInterpreting = ref(false);
const toastMessage = ref('');
let toastTimer: number | undefined;
interface RunningAiTask {
  id: string;
  recordId: string | null;
  sourceView: AppView;
}
const runningAiTasks = reactive(new Map<string, RunningAiTask>());
const backgroundAiControllers = new Map<string, AbortController>();
const notifiedBackgroundTaskIds = new Set<string>();
let backgroundAiTaskSequence = 0;
const isTestingAi = ref(false);
const isLoadingAiModels = ref(false);
const aiTestMessage = ref('');
const aiTestState = ref<'idle' | 'success' | 'error'>('idle');
const aiModelMessage = ref('');
const aiModelState = ref<'idle' | 'success' | 'error'>('idle');
const showOnboarding = ref(false);
const onboardingStep = ref(0);
const onboardingDisclaimerAccepted = ref(false);
const onboardingError = ref('');
const configuringAiChannelId = ref('builtin');
const onboardingAiChannelId = ref('builtin');
const onboardingCase = reactive<CaseProfile>({
  ...createCase('onboarding-case', '我的案例', true),
  date: '',
  time: '',
});
const birthPicker = reactive<{
  open: boolean;
  kind: BirthPickerKind;
  target: BirthPickerTarget;
  values: string[];
}>({
  open: false,
  kind: 'date',
  target: 'editor',
  values: [],
});
const fortuneDatePicker = reactive<{
  open: boolean;
  values: string[];
}>({
  open: false,
  values: [],
});
function createBuiltinAiChannel(): AiChannel {
  return {
    id: 'builtin',
    name: '内置 AI',
    provider: 'builtin',
    apiType: 'chat',
    baseUrl: '',
    model: '',
    models: [],
    apiKey: '',
  };
}

function createPresetAiChannel(preset: typeof aiChannelPresets[number]): AiChannel {
  return {
    id: preset.id,
    name: preset.name,
    provider: 'openai-compatible',
    preset: preset.preset,
    apiType: preset.apiType,
    baseUrl: preset.baseUrl,
    model: '',
    models: [],
    apiKey: '',
  };
}

function createDefaultAiChannels() {
  return [createBuiltinAiChannel(), ...aiChannelPresets.map(createPresetAiChannel)];
}

function createCustomAiChannel(index: number): AiChannel {
  return {
    id: `channel-${Date.now()}-${index}`,
    name: `自定义渠道 ${index}`,
    provider: 'openai-compatible',
    apiType: 'chat',
    baseUrl: 'https://api.openai.com/v1',
    model: '',
    models: [],
    apiKey: '',
  };
}

function normalizeAiModels(models: unknown, fallback: string[]) {
  const source = Array.isArray(models) ? models : fallback;
  const values = source.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean);
  return [...new Set(values)].length ? [...new Set(values)] : [...fallback];
}

function normalizeAiApiType(value: unknown, fallback: AiApiType = 'chat'): AiApiType {
  return value === 'responses' || value === 'anthropic' || value === 'chat' ? value : fallback;
}

function normalizeAiChannel(channel: Partial<AiChannel>, index: number): AiChannel {
  const id = typeof channel.id === 'string' && channel.id.trim() ? channel.id : `channel-${index}`;
  const preset = aiChannelPresets.find((item) => item.id === id || item.preset === channel.preset);
  if (preset) {
    const models = typeof channel.modelsFetchedAt === 'number' ? normalizeAiModels(channel.models, []) : [];
    const model = typeof channel.model === 'string' && models.includes(channel.model) ? channel.model : models[0] || '';
    return { ...createPresetAiChannel(preset), apiType: normalizeAiApiType(channel.apiType, preset.apiType), model, models, modelsFetchedAt: channel.modelsFetchedAt };
  }
  const provider: AiChannelProvider = channel.provider === 'builtin' ? 'builtin' : 'openai-compatible';
  if (provider === 'builtin') return createBuiltinAiChannel();
  const fallback: string[] = [];
  const models = normalizeAiModels(channel.models, fallback);
  const model = typeof channel.model === 'string' && channel.model.trim() ? channel.model.trim() : models[0];
  return {
    id,
    name: typeof channel.name === 'string' && channel.name.trim() ? channel.name.trim() : `自定义渠道 ${index}`,
    provider,
    apiType: normalizeAiApiType(channel.apiType),
    baseUrl: typeof channel.baseUrl === 'string' ? channel.baseUrl : 'https://api.openai.com/v1',
    model: model || '',
    models: model && !models.includes(model) ? [model, ...models] : models,
    modelsFetchedAt: channel.modelsFetchedAt,
    apiKey: '',
  };
}

function mergeDefaultAiChannels(channels: Partial<AiChannel>[]) {
  const normalized = channels.map((channel, index) => normalizeAiChannel(channel, index));
  const builtin = normalized.find((channel) => channel.provider === 'builtin') || createBuiltinAiChannel();
  const presets = aiChannelPresets.map((preset) => normalized.find((channel) => channel.preset === preset.preset) || createPresetAiChannel(preset));
  const custom = normalized.filter((channel) => channel.provider !== 'builtin' && !channel.preset);
  return [builtin, ...presets, ...custom];
}

const appPreferences = reactive<AiPreferences & { activeAiChannelId: string; aiChannels: AiChannel[]; castingPreference: CastingPreference }>({
  activeAiChannelId: 'builtin',
  aiChannels: createDefaultAiChannels(),
  answerPreference: 'fortune-master',
  displayLevel: 'beginner',
  castingPreference: 'manual',
});
const visibleDivinationKinds = computed(() => appPreferences.displayLevel === 'master' ? masterDivinationKinds : beginnerDivinationKinds);

const settings = reactive<{
  qimenScope: 'hour' | 'day' | 'month' | 'year';
  almanacTopic: AlmanacPurpose | '';
}>({
  qimenScope: 'hour',
  almanacTopic: '',
});

const primaryNavItems = [
  { key: 'tools' as const, label: '首页', icon: Grid2X2 },
  { key: 'charts' as const, label: '排盘', icon: Orbit },
  { key: 'compatibility' as const, label: '合盘', icon: HeartHandshake },
  { key: 'oracle' as const, label: '灵签', icon: ScrollText },
  { key: 'xiaoliuren' as const, label: '小六壬', icon: Moon },
  { key: 'daily-hexagram' as const, label: '每日一卦', icon: Coins },
  { key: 'fortune' as const, label: '今日运势', icon: Sun },
  { key: 'almanac' as const, label: '传统黄历', icon: CalendarDays },
  { key: 'fengshui' as const, label: '居家风水', icon: House },
];
const secondaryNavItems = [
  { key: 'cases' as const, label: '案例', icon: BookOpen },
  { key: 'settings' as const, label: '设置', icon: Settings },
];
const navItems = [...primaryNavItems, ...secondaryNavItems];
const activePageTitle = computed(() => navItems.find((item) => item.key === activeView.value)?.label || '');
const pillarItems: Array<{ key: keyof BaziChartResult['pillars']; label: string }> = [
  { key: 'year', label: '年柱' },
  { key: 'month', label: '月柱' },
  { key: 'day', label: '日柱' },
  { key: 'hour', label: '时柱' },
];
const baziStemElements: Record<string, string> = {
  甲: 'wood', 乙: 'wood',
  丙: 'fire', 丁: 'fire',
  戊: 'earth', 己: 'earth',
  庚: 'metal', 辛: 'metal',
  壬: 'water', 癸: 'water',
};
const baziBranchElements: Record<string, string> = {
  寅: 'wood', 卯: 'wood',
  巳: 'fire', 午: 'fire',
  辰: 'earth', 戌: 'earth', 丑: 'earth', 未: 'earth',
  申: 'metal', 酉: 'metal',
  亥: 'water', 子: 'water',
};
const baziWuxingElements: Record<string, string> = {
  木: 'wood', 火: 'fire', 土: 'earth', 金: 'metal', 水: 'water',
};
const baziHeavenlyStems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const baziEarthlyBranches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
// 底层保留全部神煞，再由当前页面的常用名单统一决定展示范围，避免重复筛选。
const baziShenShaCalculator = new ShenShaCalculator({ scope: 'all' });
const commonBaziShensha = [
  '天乙贵人', '天德贵人', '月德贵人', '太极贵人', '文昌贵人', '国印贵人', '福星贵人',
  '天官贵人', '天印贵人', '天福贵人', '天厨贵人', '文星贵', '德秀贵人', '金舆', '词馆', '学馆',
  '驿马', '桃花', '咸池', '红艳', '华盖', '将星', '禄神', '羊刃', '红鸾', '天喜',
  '孤辰', '寡宿', '孤虚', '劫煞', '亡神', '灾煞', '血刃', '血光', '飞刃', '元辰', '勾绞', '童子',
];
const baziShenshaAliases: Record<string, string> = {
  天乙贵人: '天乙', 天德贵人: '天德', 月德贵人: '月德', 太极贵人: '太极',
  文昌贵人: '文昌', 国印贵人: '国印', 福星贵人: '福星', 天官贵人: '天官',
  天印贵人: '天印', 天福贵人: '天福', 天厨贵人: '天厨', 文星贵: '文星',
  德秀贵人: '德秀', 官贵学馆: '学馆', 天喜神: '天喜', 红艳煞: '红艳',
  童子煞: '童子', 血光杀: '血光',
};
const selectedMeta = computed(() => kindMeta[selectedKind.value]);
const currentCase = computed(() => cases.value.find((item) => item.id === selectedCaseId.value) || cases.value[0] || draftCase.value);
const editableCase = computed(() => caseEditorDraft.value || currentCase.value);
const defaultCase = computed(() => cases.value.find((item) => item.isDefault) || cases.value[0] || draftCase.value);
const activeGlobalCaseId = computed(() => cases.value.some((item) => item.id === currentCase.value.id) && isAlmanacProfileComplete(currentCase.value) ? currentCase.value.id : '');
const sortedCases = computed(() => [...cases.value].sort((left, right) => (
  Number(right.isDefault) - Number(left.isDefault)
  || left.label.localeCompare(right.label, 'zh-CN')
)));
const filteredCases = computed(() => sortedCases.value.filter((profile) => matchesCaseSearch(profile, caseSearch.value)));
const filteredCaseSwitcherCases = computed(() => sortedCases.value.filter((profile) => matchesCaseSearch(profile, caseSwitcherSearch.value)));
const selectableCaseProfiles = computed<SelectableCaseProfile[]>(() => sortedCases.value.map((profile) => ({
  ...profile,
  available: isAlmanacProfileComplete(profile),
})));
const activeAiChannel = computed(() => appPreferences.aiChannels.find((channel) => channel.id === appPreferences.activeAiChannelId) || appPreferences.aiChannels[0] || createBuiltinAiChannel());
const activeAiRequestConfig = computed<AiCustomConfig>(() => channelToAiConfig(activeAiChannel.value));
const configuringAiChannel = computed(() => appPreferences.aiChannels.find((channel) => channel.id === configuringAiChannelId.value) || activeAiChannel.value);
const onboardingAiChannel = computed(() => appPreferences.aiChannels.find((channel) => channel.id === onboardingAiChannelId.value) || activeAiChannel.value);
const activeAiModelOptions = computed(() => normalizeAiModels(activeAiChannel.value.models, []));
const configuringAiModelOptions = computed(() => normalizeAiModels(configuringAiChannel.value.models, []));
const onboardingAiModelOptions = computed(() => normalizeAiModels(onboardingAiChannel.value.models, []));
const activeAiModelLabel = computed(() => activeAiChannel.value.provider === 'builtin' ? '内置 AI' : activeAiChannel.value.model || activeAiChannel.value.name);
const activeAnswerPreference = computed(() => answerPreferenceOptions.find((item) => item.value === appPreferences.answerPreference) || answerPreferenceOptions[1]);
function channelToAiConfig(channel: AiChannel): AiCustomConfig {
  return {
    enabled: channel.provider === 'openai-compatible',
    provider: channel.provider,
    apiType: channel.apiType,
    baseUrl: channel.provider === 'builtin' ? '' : channel.baseUrl,
    model: channel.provider === 'builtin' ? '' : channel.model,
    apiKey: channel.provider === 'builtin' ? '' : channel.apiKey,
  };
}
function isAiChannelReady(channel: AiChannel) {
  if (channel.provider === 'builtin') return true;
  return Boolean(channel.baseUrl.trim() && channel.apiKey.trim() && channel.model.trim());
}
const configuredAiChannels = computed(() => appPreferences.aiChannels.filter(isAiChannelReady));
const isOnboardingAiReady = computed(() => isAiChannelReady(onboardingAiChannel.value));
const selectedAiModel = computed({
  get: () => activeAiChannel.value.model,
  set: (model: string) => {
    if (activeAiChannel.value.provider === 'builtin') return;
    activeAiChannel.value.model = model;
    if (!activeAiChannel.value.models.includes(model)) activeAiChannel.value.models = [model, ...activeAiChannel.value.models];
    resetAiTest();
  },
});
const selectedConfiguringAiModel = computed({
  get: () => configuringAiChannel.value.model,
  set: (model: string) => {
    if (configuringAiChannel.value.provider === 'builtin') return;
    configuringAiChannel.value.model = model;
    if (!configuringAiChannel.value.models.includes(model)) configuringAiChannel.value.models = [model, ...configuringAiChannel.value.models];
    resetAiTest();
  },
});
const selectedOnboardingAiModel = computed({
  get: () => onboardingAiChannel.value.model,
  set: (model: string) => {
    if (onboardingAiChannel.value.provider === 'builtin') return;
    onboardingAiChannel.value.model = model;
    if (!onboardingAiChannel.value.models.includes(model)) onboardingAiChannel.value.models = [model, ...onboardingAiChannel.value.models];
    onboardingError.value = '';
  },
});
const configuringAiModelsText = computed({
  get: () => configuringAiChannel.value.models.join('\n'),
  set: (value: string) => {
    const models = normalizeAiModels(value.split(/[\n,，]/), []);
    configuringAiChannel.value.models = models;
    if (!models.includes(configuringAiChannel.value.model)) configuringAiChannel.value.model = models[0] || '';
    resetAiTest();
  },
});
const filteredInspirationGroups = computed(() => {
  const query = inspirationSearch.value.trim().toLocaleLowerCase();
  const groups = inspirationLibraries[inspirationMode.value];
  if (!query) return groups;
  return groups
    .map((group) => {
      const groupMatched = `${group.label}${group.description}`.toLocaleLowerCase().includes(query);
      return {
        ...group,
        questions: groupMatched
          ? group.questions
          : group.questions.filter((item) => `${item.label}${item.text}${item.prompt || ''}${item.keywords || ''}`.toLocaleLowerCase().includes(query)),
      };
    })
    .filter((group) => group.questions.length);
});
const readingModalRows = computed<ReadingDetailRow[]>(() => {
  const message = selectedReadingMessage.value;
  if (!message) return [];
  const result = message.reading;
  if (isMeihua(result)) {
    return [
      { label: '主卦', value: `${result.mainHexagram.name} · ${result.mainHexagram.upper}${result.mainHexagram.lower}` },
      { label: '互卦', value: result.interHexagram?.name || result.interName || '—' },
      { label: '变卦', value: result.changedHexagram?.name || result.changedName || '无变卦' },
      { label: '体用', value: `${result.tiGua.name}（${result.tiGua.element}）／${result.yongGua.name}（${result.yongGua.element}）` },
      { label: '动爻', value: `${result.movingYao.position}爻 · ${result.movingYao.description}` },
      { label: '卦辞', value: result.mainHexagram.description },
    ];
  }
  if (isLiuyao(result)) {
    return [
      { label: '本卦', value: result.originalName },
      { label: '变卦', value: result.changedName || '无变卦' },
      { label: '卦宫', value: `${result.palace.name} · ${result.palace.wuxing}` },
      { label: '世应', value: result.worldAndResponse.join(' · ') || '—' },
      { label: '动爻', value: result.yaosDetail.filter((item) => item.isChanging).map((item) => `${item.position}爻`).join('、') || '静卦' },
      { label: '六神', value: result.sixGods.join(' · ') },
      { label: '卦意', value: result.specialAdvice || '世应、六亲与动爻已纳入本次排盘。' },
    ];
  }
  if (isSsgw(result)) {
    return [
      { label: '签号', value: `第${result.number}签` },
      { label: '签题', value: result.title },
      { label: '签诗', value: result.poem },
      ...(result.story ? [{ label: '典故', value: result.story }] : []),
    ];
  }
  if (isQimen(result)) {
    return [
      { label: '局式', value: `${result.isYangDun ? '阳遁' : '阴遁'} ${result.juShu}局 · ${result.scope === 'day' ? '日家' : result.scope === 'month' ? '月家' : result.scope === 'year' ? '年家' : '时家'}` },
      { label: '值符／值使', value: `${result.zhiFu} ／ ${result.zhiShi}` },
      { label: '四柱', value: `${result.ganzhi.year} ${result.ganzhi.month} ${result.ganzhi.day} ${result.ganzhi.hour}` },
      { label: '九宫', value: result.jiuGongGe.map((palace) => `${palace.name}${palace.renPan.door}·${palace.tianPan.star}`).join('　') },
      { label: '格局', value: result.patternTags?.join(' · ') || '以九宫、八门、九星合参' },
    ];
  }
  if (isJinkoujue(result)) {
    return [
      { label: '起课', value: `${result.methodLabel} · ${result.dayNight}` },
      { label: '主线', value: result.mainLine },
      { label: '四位', value: [result.positions.diFen, result.positions.jiangShen, result.positions.guiShen, result.positions.renYuan].map((item) => `${item.name}：${item.god || item.stem || item.branch}`).join(' · ') },
      { label: '课断', value: result.summary },
    ];
  }
  if (isLiuren(result)) {
    return [
      { label: '课式', value: result.transmissionRule || '四课三传' },
      { label: '三传', value: result.threeTransmissions.map((item) => `${item.stage}：${item.branch}·${item.god}`).join('　') },
      { label: '课意', value: result.transmissionSummary || result.lessonSummary || '从初传到末传观察事情的推进层次。' },
    ];
  }
  if (isTaiyi(result)) {
    return [
      { label: '局式', value: `${result.ganZhi}年 · ${result.yinYang}第${result.bureau}局` },
      { label: '核心宫位', value: `太乙${result.taiyiPosition} · 文昌${result.wenChangPosition} · 始击${result.shiJiPosition} · 计神${result.jiShenPosition}` },
      { label: '主客定算', value: `主算${result.lordCount} · 客算${result.guestCount} · 定算${result.setCount}` },
      { label: '将参', value: `主将${result.lordGeneral}/${result.lordAssistant}宫 · 客将${result.guestGeneral}/${result.guestAssistant}宫 · 定将${result.setGeneral}/${result.setAssistant}宫` },
      { label: '盘面判断', value: result.judgments.join('；') },
    ];
  }
  if (isAlmanac(result)) {
    return [
      { label: '事项', value: result.topicLabel },
      { label: '日期建议', value: result.days.slice(0, 4).map((day) => `${day.date}：${day.highlights[0] || day.recommends[0] || '结合当日宜忌判断'}`).join('；') },
    ];
  }
  if (isBazi(result)) {
    return [
      { label: '四柱', value: `${result.pillars.year.gan}${result.pillars.year.zhi}　${result.pillars.month.gan}${result.pillars.month.zhi}　${result.pillars.day.gan}${result.pillars.day.zhi}　${result.pillars.hour.gan}${result.pillars.hour.zhi}` },
      { label: '日主', value: `${result.dayMaster.gan}日主 · ${result.dayMaster.element}` },
      { label: '农历', value: `${result.lunarDate.monthName}${result.lunarDate.dayName}` },
      { label: '节气', value: result.seasonInfo.currentJieqi },
      { label: '盘面摘要', value: formatReadingSummary(message.method, result) },
    ];
  }
  if (isZiwei(result)) {
    return [
      { label: '命造', value: `${result.payload.basic_info.gender} · ${result.birth.name}` },
      { label: '公历', value: result.payload.basic_info.solar_date },
      { label: '农历', value: result.payload.basic_info.lunar_date },
      { label: '四柱', value: [result.payload.basic_info.four_pillars?.year_pillar, result.payload.basic_info.four_pillars?.month_pillar, result.payload.basic_info.four_pillars?.day_pillar, result.payload.basic_info.four_pillars?.hour_pillar].filter(Boolean).join('　') },
      { label: '盘面摘要', value: formatReadingSummary(message.method, result) },
    ];
  }
  if (isQizheng(result)) {
    return [
      { label: '命造', value: `${result.birth.name} · ${result.birth.gender === 'male' ? '男命' : '女命'}` },
      { label: '公历', value: result.calendar.solar },
      { label: '农历', value: result.calendar.lunar },
      { label: '命身', value: `命主${result.mingZhu} · 命宫第${result.mingGong + 1}宫 · 身宫第${result.shenGong + 1}宫` },
      { label: '星曜', value: result.stars.map((star) => `${star.name}${star.xiu}宿`).join(' · ') },
      { label: '主要吊照', value: [...result.aspects].sort((left, right) => left.orbRatio - right.orbRatio).slice(0, 8).map((aspect) => `${aspect.star1}${aspect.type}${aspect.star2}`).join(' · ') || '—' },
    ];
  }
  if (isAstrolabe(result)) {
    return [
      { label: '出生资料', value: `${result.birth.dateTime} · ${result.birth.location}` },
      { label: '太阳', value: result.planets.find((point) => point.name === 'Sun' || point.label === '太阳')?.formatted || '—' },
      { label: '月亮', value: result.planets.find((point) => point.name === 'Moon' || point.label === '月亮')?.formatted || '—' },
      { label: '上升', value: result.angles.find((point) => point.name === 'Ascendant' || point.label === '上升')?.formatted || '—' },
      { label: '主要相位', value: result.aspects.slice(0, 8).map((aspect) => `${aspect.body1}${aspect.symbol}${aspect.body2}`).join(' · ') || '—' },
    ];
  }
  return [{ label: '盘面摘要', value: formatReadingSummary(message.method, result) }];
});
function historyRecordCategory(record: HistoryRecordEntry): Exclude<HistoryCategoryFilter, 'all'> {
  return getHistoryRecordCategory(record);
}

function isHistoryRecordRunning(recordId: string) {
  return Array.from(runningAiTasks.values()).some((task) => task.recordId === recordId);
}

const historyMethodOptions = computed(() => Array.from(new Set(history.value.map((record) => record.methodLabel)))
  .sort((left, right) => left.localeCompare(right, 'zh-CN')));
const hasActiveHistoryFilters = computed(() => Boolean(
  historySearch.value.trim()
  || historyCategory.value !== 'all'
  || historyMethod.value !== 'all'
  || historyInterpretation.value !== 'all',
));
const filteredHistory = computed(() => {
  const query = historySearch.value.trim().toLocaleLowerCase('zh-CN');
  return history.value.filter((item) => {
    const contextLabel = !isLegacyHistoryRecord(item) ? item.context?.label || '' : '';
    const matchesSearch = !query || [item.question, item.methodLabel, contextLabel]
      .some((value) => value.toLocaleLowerCase('zh-CN').includes(query));
    const matchesCategory = historyCategory.value === 'all' || historyRecordCategory(item) === historyCategory.value;
    const matchesMethod = historyMethod.value === 'all' || item.methodLabel === historyMethod.value;
    const hasInterpretation = Boolean(item.interpretation?.trim());
    const matchesInterpretation = historyInterpretation.value === 'all'
      || (historyInterpretation.value === 'interpreted' ? hasInterpretation : !hasInterpretation);
    return matchesSearch && matchesCategory && matchesMethod && matchesInterpretation;
  });
});
const displayResult = computed<ReadingResult | null>(() => activeView.value === 'charts' ? chartResult.value : null);
const selectedBaziCycle = computed(() => {
  const result = displayResult.value;
  return result && isBazi(result) ? result.luckInfo.cycles[selectedBaziCycleIndex.value] || result.luckInfo.cycles[0] || null : null;
});
const selectedBaziCycleContext = computed<FortuneSelectionContext | null>(() => {
  const result = displayResult.value;
  if (!result || !isBazi(result) || !selectedBaziCycle.value) return null;
  try {
    return buildFortuneSelectionContext(result, {
      scope: 'dayun',
      cycleIndex: selectedBaziCycleIndex.value,
    });
  } catch {
    return null;
  }
});
const selectedBaziYears = computed(() => {
  const result = displayResult.value;
  if (!result || !isBazi(result)) return [];
  const cycle = selectedBaziCycle.value;
  const years = cycle?.years?.length ? cycle.years : result.liunian || [];
  const availableYears = new Set((selectedBaziCycleContext.value?.yearBreakdown || []).map((item) => item.year));
  return availableYears.size ? years.filter((item) => availableYears.has(item.year)) : years;
});
const selectedBaziYearInfo = computed(() => selectedBaziYears.value.find((item) => item.year === selectedBaziYear.value) || selectedBaziYears.value[0] || null);
const currentBaziCycle = computed(() => {
  const result = displayResult.value;
  return result && isBazi(result) ? getLuckCycleForDate(result.luckInfo.cycles, new Date()) : null;
});
const currentBaziYearInfo = computed(() => {
  const result = displayResult.value;
  if (!result || !isBazi(result)) return null;
  const cycle = currentBaziCycle.value;
  const cycleYears = cycle?.resolvedYears?.length ? cycle.resolvedYears : cycle?.years || [];
  return cycleYears.find((item) => item.year === currentFortuneYear)
    || (result.liunian || []).find((item) => item.year === currentFortuneYear)
    || null;
});
const currentBaziCycleGanZhi = computed(() => {
  const cycle = currentBaziCycle.value;
  if (!cycle) return '';
  return cycle.isXiaoyun ? currentBaziYearInfo.value?.xiaoyun?.ganZhi || cycle.ganZhi : cycle.ganZhi;
});
const currentBaziFortuneContext = computed<FortuneSelectionContext | null>(() => {
  const result = displayResult.value;
  if (!result || !isBazi(result)) return null;
  try {
    const selection = buildCurrentBaziFortuneSelection(result, new Date());
    const cycleIndex = result.luckInfo.cycles.findIndex((cycle) => cycle === currentBaziCycle.value);
    return selection && cycleIndex >= 0
      ? buildFortuneSelectionContext(result, { ...selection, cycleIndex })
      : null;
  } catch {
    return null;
  }
});
const currentBaziHourInfo = computed(() => {
  const hours = currentBaziFortuneContext.value?.hourBreakdown || [];
  const hour = new Date().getHours();
  const index = hour === 23 ? 0 : hour === 0 ? 1 : Math.min(12, Math.floor((hour + 1) / 2) + 1);
  return hours[index] || hours[0] || null;
});
interface BaziTraditionalColumn {
  key: string;
  label: string;
  scope: 'natal' | 'fortune';
  gan: string;
  zhi: string;
  tenGod: string;
  hiddenPairs: Array<{ stem: string; tenGod: string }>;
  nayin: string;
  nayinElement: string;
  lifeStage: string;
  ziZuo: string;
  kongWang: string[];
  shensha: string[];
}
function calculateBaziKongWang(gan: string, zhi: string) {
  const ganIndex = baziHeavenlyStems.indexOf(gan);
  const zhiIndex = baziEarthlyBranches.indexOf(zhi);
  if (ganIndex < 0 || zhiIndex < 0) return [];
  const xunStartBranchIndex = (zhiIndex - ganIndex + 12) % 12;
  return [
    baziEarthlyBranches[(xunStartBranchIndex + 10) % 12]!,
    baziEarthlyBranches[(xunStartBranchIndex + 11) % 12]!,
  ];
}

function calculateBaziFortuneShensha(result: BaziChartResult, gan: string, zhi: string) {
  if (!baziStemElements[gan] || !baziBranchElements[zhi]) return [];
  try {
    const shensha = baziShenShaCalculator.calculateAllShenSha([
      [result.pillars.year.gan, result.pillars.year.zhi],
      [result.pillars.month.gan, result.pillars.month.zhi],
      [result.pillars.day.gan, result.pillars.day.zhi],
      [gan, zhi],
    ], result.gender).hour || [];
    return Array.from(new Set(shensha.filter((name) => (
      commonBaziShensha.some((common) => name.includes(common))
    )))).map(baziShenshaLabel);
  } catch {
    return [];
  }
}

function shortBaziTenGod(name: string) {
  return ({
    比肩: '比',
    劫财: '劫',
    食神: '食',
    伤官: '伤',
    偏财: '才',
    正财: '财',
    七杀: '杀',
    正官: '官',
    偏印: '枭',
    正印: '印',
  } as Record<string, string>)[name] || name.slice(0, 1) || '—';
}

function baziGanTenGodShort(ganZhi: string, dayMaster: string) {
  const gan = ganZhi.slice(0, 1);
  return baziStemElements[gan] ? shortBaziTenGod(getTenGod(gan, dayMaster)) : '—';
}

function baziZhiTenGodShort(ganZhi: string, dayMaster: string) {
  const zhi = ganZhi.slice(1, 2);
  const mainHiddenStem = BRANCH_HIDDEN_STEMS[zhi]?.[0] || '';
  return mainHiddenStem ? shortBaziTenGod(getTenGod(mainHiddenStem, dayMaster)) : '—';
}

const baziLunarDayLabels = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十',
];
const baziLunarDayFormatter = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
  day: 'numeric',
  timeZone: 'Asia/Shanghai',
});

function baziLunarDayLabel(date: string) {
  const lunarDay = Number(baziLunarDayFormatter.format(new Date(`${date}T12:00:00+08:00`)).replace(/\D/g, ''));
  return baziLunarDayLabels[lunarDay - 1] || date.slice(8, 10);
}

const baziTraditionalColumns = computed<BaziTraditionalColumn[]>(() => {
  const result = displayResult.value;
  if (!result || !isBazi(result)) return [];
  const natalColumns = pillarItems.map((item) => ({
    key: item.key,
    label: item.label,
    scope: 'natal' as const,
    gan: result.pillars[item.key].gan,
    zhi: result.pillars[item.key].zhi,
    tenGod: item.key === 'day' ? (result.gender === 'male' ? '元男' : '元女') : result.tenGods[item.key],
    hiddenPairs: result.hiddenStems[item.key].map((stem, index) => ({ stem, tenGod: result.hiddenTenGods[item.key][index] || '—' })),
    nayin: result.nayin[item.key],
    nayinElement: getNayinWuxing(`${result.pillars[item.key].gan}${result.pillars[item.key].zhi}`),
    lifeStage: result.pillarLifeStages[item.key],
    ziZuo: result.ziZuo[item.key],
    kongWang: result.kongWang[item.key],
    shensha: visibleBaziShensha(result, item.key).map(baziShenshaLabel),
  }));
  const fortuneContext = currentBaziFortuneContext.value;
  const fortuneInputs = [
    { key: 'dayun', label: '大运', ganZhi: currentBaziCycleGanZhi.value },
    { key: 'liunian', label: '流年', ganZhi: currentBaziYearInfo.value?.ganZhi || '' },
    { key: 'liuyue', label: '流月', ganZhi: fortuneContext?.monthGanZhi || '' },
    { key: 'liushi', label: '流时', ganZhi: currentBaziHourInfo.value?.ganZhi || '' },
  ];
  const fortuneColumns = fortuneInputs.map(({ key, label, ganZhi }) => {
    const gan = ganZhi[0] || '';
    const zhi = ganZhi[1] || '';
    const validGanZhi = Boolean(baziStemElements[gan] && baziBranchElements[zhi]);
    const hiddenStems = validGanZhi ? BRANCH_HIDDEN_STEMS[zhi] || [] : [];
    return {
      key,
      label,
      scope: 'fortune' as const,
      gan,
      zhi,
      tenGod: validGanZhi ? getTenGod(gan, result.dayMaster.gan) : '—',
      hiddenPairs: hiddenStems.map((stem) => ({ stem, tenGod: getTenGod(stem, result.dayMaster.gan) })),
      nayin: validGanZhi ? getNayin(ganZhi) : '—',
      nayinElement: validGanZhi ? getNayinWuxing(ganZhi) : '',
      lifeStage: validGanZhi ? getLifeStage(result.dayMaster.gan, zhi) : '—',
      ziZuo: validGanZhi ? getLifeStage(gan, zhi) : '—',
      kongWang: validGanZhi ? calculateBaziKongWang(gan, zhi) : [],
      shensha: validGanZhi ? calculateBaziFortuneShensha(result, gan, zhi) : [],
    };
  });
  return [...natalColumns, ...fortuneColumns];
});
const visibleBaziTraditionalColumns = computed(() => baziTraditionalColumns.value.filter((column) => (
  column.scope === 'natal' || baziFortuneColumnVisibility[column.key as BaziFortuneColumnKey]
)));
const firstVisibleBaziFortuneColumnKey = computed(() => (
  visibleBaziTraditionalColumns.value.find((column) => column.scope === 'fortune')?.key || ''
));
const baziTraditionalTableStyle = computed(() => ({
  '--bazi-column-count': visibleBaziTraditionalColumns.value.length,
  '--bazi-table-min-width': `${68 + visibleBaziTraditionalColumns.value.length * 84}px`,
  '--bazi-mobile-table-min-width': `${40 + visibleBaziTraditionalColumns.value.length * 54}px`,
  '--bazi-small-mobile-table-min-width': `${34 + visibleBaziTraditionalColumns.value.length * 46}px`,
}));
function formatBaziStartInfo(value: string): string {
  return value.replace(/[（(]\s*按实际节气时刻计算，三日折一年\s*[）)]/g, '').trim();
}
function formatBaziUsefulElements(value: { primaryFavorableWuxing?: string; secondaryFavorableWuxing?: string[]; favorableWuxing?: string[]; useful?: string }): string {
  const elements = [value.primaryFavorableWuxing, ...(value.secondaryFavorableWuxing || []), ...(value.favorableWuxing || [])].filter(Boolean);
  return [...new Set(elements)].join('、') || value.useful || '随局取用';
}
function getBaziFortuneContext(scope: 'year' | 'month' | 'day'): FortuneSelectionContext | null {
  const result = displayResult.value;
  if (!result || !isBazi(result) || selectedBaziYear.value === null) return null;
  try {
    return buildFortuneSelectionContext(result, {
      scope,
      cycleIndex: selectedBaziCycleIndex.value,
      year: selectedBaziYear.value,
      ...(scope === 'year' ? {} : { month: selectedBaziMonth.value ?? undefined }),
      ...(scope === 'day' ? { day: selectedBaziDayIndex.value ?? undefined } : {}),
    });
  } catch {
    return null;
  }
}
const selectedBaziYearContext = computed(() => getBaziFortuneContext('year'));
const selectedBaziMonths = computed(() => selectedBaziYearContext.value?.monthBreakdown || []);
const selectedBaziMonthInfo = computed(() => selectedBaziMonths.value.find((item) => item.month === selectedBaziMonth.value) || selectedBaziMonths.value[0] || null);
const selectedBaziMonthContext = computed(() => getBaziFortuneContext('month'));
const selectedBaziDays = computed(() => {
  const monthStartDate = selectedBaziMonthInfo.value?.startDate;
  const monthStart = monthStartDate ? new Date(`${monthStartDate}T12:00:00`).getTime() : Number.NaN;
  return (selectedBaziMonthContext.value?.dayBreakdown || []).map((day, index) => {
    const dayTimestamp = new Date(`${day.date}T12:00:00`).getTime();
    const dateOffset = Number.isFinite(monthStart) && Number.isFinite(dayTimestamp)
      ? Math.round((dayTimestamp - monthStart) / 86_400_000)
      : index;
    return { ...day, selectionIndex: dateOffset + 1 };
  });
});
const selectedBaziDayInfo = computed(() => selectedBaziDays.value.find((day) => day.selectionIndex === selectedBaziDayIndex.value) || null);
const selectedBaziDayContext = computed(() => getBaziFortuneContext('day'));
const selectedBaziHours = computed(() => selectedBaziDayContext.value?.hourBreakdown || []);
const selectedBaziHourInfo = computed(() => selectedBaziHours.value[selectedBaziHourIndex.value] || selectedBaziHours.value[0] || null);

function formatBaziHourLabel(label: string) {
  return label.replace('早子时', '子时').replace('早子', '子');
}

const baziHourTimeRanges: Record<string, string> = {
  '子': '23:00-01:00',
  '丑': '01:00-03:00',
  '寅': '03:00-05:00',
  '卯': '05:00-07:00',
  '辰': '07:00-09:00',
  '巳': '09:00-11:00',
  '午': '11:00-13:00',
  '未': '13:00-15:00',
  '申': '15:00-17:00',
  '酉': '17:00-19:00',
  '戌': '19:00-21:00',
  '亥': '21:00-23:00',
};

function formatBaziHourTimeRange(label: string) {
  return baziHourTimeRanges[formatBaziHourLabel(label).slice(0, 1)] || '';
}

function formatBaziHourStartTime(label: string) {
  return formatBaziHourTimeRange(label).split('-')[0] || formatBaziHourLabel(label);
}

const selectedZiweiPalace = computed(() => {
  const result = displayResult.value;
  if (!result || !isZiwei(result)) return null;
  return result.payload.palaces.find((palace) => palace.index === selectedZiweiPalaceIndex.value) || result.payload.palaces[0] || null;
});
const selectedZiweiRelations = computed(() => {
  const result = displayResult.value;
  const palace = selectedZiweiPalace.value;
  if (!result || !isZiwei(result) || !palace) return { sanfang: '', opposite: '' };
  const relation = ziweiSanfangIndexes(result);
  const nameByIndex = (index: number) => result.payload.palaces.find((item) => item.index === index)?.name || '';
  return {
    sanfang: relation.triangle.filter((index) => index !== palace.index).map(nameByIndex).filter(Boolean).join('、'),
    opposite: relation.opposite === null ? '' : nameByIndex(relation.opposite),
  };
});

function ziweiYearlyAges(palace: ZiweiChartData['payload']['palaces'][number], result: ZiweiChartData) {
  const birthYearPillar = result.payload.basic_info.four_pillars?.year_pillar || '';
  const birthBranchIndex = earthlyBranches.indexOf(birthYearPillar.slice(-1));
  const palaceBranchIndex = earthlyBranches.indexOf(palace.earthly_branch);
  if (birthBranchIndex < 0 || palaceBranchIndex < 0) return [];
  const firstAge = ((palaceBranchIndex - birthBranchIndex + earthlyBranches.length) % earthlyBranches.length) + 1;
  return Array.from({ length: 10 }, (_, index) => firstAge + index * earthlyBranches.length).filter((age) => age <= 120);
}
const almanacWeekdays = ['日', '一', '二', '三', '四', '五', '六'];
const almanacToday = formatAlmanacDate(new Date());
const almanacMonthLabel = computed(() => {
  const [year, month] = almanacMonth.value.split('-').map(Number);
  return `${year}年${month}月`;
});
const almanacDaysByDate = computed(() => new Map((almanacResult.value?.days || []).map((day) => [day.date, day])));
const almanacCalendarCells = computed<AlmanacCalendarCell[]>(() => {
  const [year, month] = almanacMonth.value.split('-').map(Number);
  const firstWeekday = new Date(year, month - 1, 1, 12, 0, 0, 0).getDay();
  return Array.from({ length: 42 }, (_, index) => {
    const calendarDate = new Date(year, month - 1, index - firstWeekday + 1, 12, 0, 0, 0);
    const date = formatAlmanacDate(calendarDate);
    const meta = getAlmanacCalendarDateMeta(date);
    return {
      key: date,
      date,
      dayNumber: calendarDate.getDate(),
      weekdayIndex: index % 7,
      isCurrentMonth: calendarDate.getFullYear() === year && calendarDate.getMonth() === month - 1,
      isNavigable: calendarDate.getFullYear() >= 1900 && calendarDate.getFullYear() <= 2100,
      day: almanacDaysByDate.value.get(date) || null,
      ...meta,
    };
  });
});
const activeAlmanacRangeLabel = computed(() => almanacRangeOptions.find((item) => item.value === almanacRangeMonths.value)?.label || '一个月');
const filteredAlmanacSearchItems = computed(() => {
  const levelPriority: Record<AlmanacAuspiceLevel, number> = { 大吉: 0, 吉: 1, 小吉: 2, 平: 3, 慎用: 4, 不宜: 5 };
  const filtered = almanacSearchItems.value.filter((item) => item.evaluation.usable);
  return [...filtered].sort((a, b) => levelPriority[a.evaluation.level] - levelPriority[b.evaluation.level]
    || b.evaluation.matchedRecommends.length - a.evaluation.matchedRecommends.length
    || a.day.date.localeCompare(b.day.date));
});
const almanacDayEvaluations = computed(() => {
  const result = almanacResult.value;
  const purpose = almanacMonthFilter.value;
  if (!result || almanacMode.value !== 'personal' || purpose === 'all') return new Map<string, AlmanacPurposeEvaluation>();
  return new Map(result.days.map((day) => [day.date, evaluateAlmanacPurposeDay(result, day, purpose)]));
});
const hasAlmanacMonthFilter = computed(() => almanacMode.value === 'personal' && almanacMonthFilter.value !== 'all');
const almanacLevelCounts = computed(() => {
  const counts: Record<AlmanacAuspiceLevel, number> = { 大吉: 0, 吉: 0, 小吉: 0, 平: 0, 慎用: 0, 不宜: 0 };
  for (const evaluation of almanacDayEvaluations.value.values()) counts[evaluation.level] += 1;
  return counts;
});
const selectedAlmanacDay = computed<AlmanacDayCandidate | null>(() => almanacResult.value?.days.find((day) => day.date === selectedAlmanacDate.value) || almanacResult.value?.days[0] || null);
const selectedAlmanacCalendarMeta = computed(() => selectedAlmanacDay.value ? getAlmanacCalendarDateMeta(selectedAlmanacDay.value.date) : null);
const selectedModernAlmanac = computed(() => selectedAlmanacDay.value ? modernizeAlmanacDay(selectedAlmanacDay.value) : null);
const selectedModernAlmanacHours = computed(() => selectedAlmanacDay.value ? getModernAlmanacHours(selectedAlmanacDay.value) : []);
const almanacClashGuidance = computed(() => {
  const clash = selectedAlmanacDay.value?.clash || '';
  const zodiacMap: Record<string, string> = { 子: '鼠', 丑: '牛', 寅: '虎', 卯: '兔', 辰: '龙', 巳: '蛇', 午: '马', 未: '羊', 申: '猴', 酉: '鸡', 戌: '狗', 亥: '猪' };
  const zodiac = zodiacMap[/冲([子丑寅卯辰巳午未申酉戌亥])/.exec(clash)?.[1] || ''];
  const direction = /煞([东南西北])/.exec(clash)?.[1] || '';
  const subjects = [zodiac ? `属${zodiac}者` : '', direction ? `向${direction}出行` : ''].filter(Boolean);
  return {
    title: subjects.length ? subjects.join('、') : '重要行程',
    detail: subjects.length
      ? `${subjects.join('或')}如有重要安排，建议多留时间并复核路线；日常行程照常。`
      : '重要行程建议提前核对路线和时间，日常安排照常。',
  };
});
const activeAlmanacProfiles = computed(() => almanacCaseIds.value
  .map((id) => cases.value.find((profile) => profile.id === id))
  .filter((profile): profile is CaseProfile => Boolean(profile) && isAlmanacProfileComplete(profile)));
const activeAlmanacProfile = computed(() => activeAlmanacProfiles.value[0] || null);
const almanacParticipantSummary = computed(() => {
  if (!activeAlmanacProfiles.value.length) return '未选择参与人';
  if (activeAlmanacProfiles.value.length === 1) return activeAlmanacProfiles.value[0]!.label;
  return `${activeAlmanacProfiles.value[0]!.label}等 ${activeAlmanacProfiles.value.length} 人`;
});
const currentCalendar = computed(() => {
  const profile = editableCase.value;
  if (!profile?.date || !profile?.time) return null;
  try {
    return getBirthCalendarInfo(profile);
  } catch {
    return null;
  }
});
const newCaseCalendar = computed(() => {
  const profile = newCaseDraft.value;
  if (!profile.date || !profile.time) return null;
  try {
    return getBirthCalendarInfo(profile);
  } catch {
    return null;
  }
});
const onboardingCalendar = computed(() => {
  if (!onboardingCase.date || !onboardingCase.time) return null;
  try {
    return getBirthCalendarInfo(onboardingCase);
  } catch {
    return null;
  }
});
const homeChartMeta = computed(() => homeChartOptions.find((item) => item.kind === homeChartKind.value) || homeChartOptions[0]!);
const homeModeLabel = computed(() => homeMode.value === 'chart' ? homeChartMeta.value.label : kindMeta[selectedKind.value].label);
const manualDivinationKinds: ManualDivinationKind[] = ['meihua', 'liuyao', 'xiaoliuren', 'jinkoujue', 'qimen', 'liuren', 'taiyi'];
const isManualDivinationKind = (kind: DivinationKind): kind is ManualDivinationKind => manualDivinationKinds.includes(kind as ManualDivinationKind);

function closeFloatingPanelsOnOutsidePointer(event: PointerEvent) {
  const target = event.target;
  if (!(target instanceof Node)) return;
  if (showBaziColumnSettings.value && !baziColumnSettingsRef.value?.contains(target)) showBaziColumnSettings.value = false;
  if (showAiPicker.value && !topbarAiPickerRef.value?.contains(target)) showAiPicker.value = false;
  if (showCaseSwitcher.value && !topbarCasePickerRef.value?.contains(target)) {
    showCaseSwitcher.value = false;
    caseSwitcherSearch.value = '';
  }
  if (showToolPicker.value && !toolPickerRef.value?.contains(target)) showToolPicker.value = false;
}

function toggleBaziFortuneColumn(key: BaziFortuneColumnKey) {
  baziFortuneColumnVisibility[key] = !baziFortuneColumnVisibility[key];
}

onMounted(() => {
  document.addEventListener('pointerdown', closeFloatingPanelsOnOutsidePointer);
  try {
    const storedBaziColumns = localStorage.getItem(BAZI_FORTUNE_COLUMN_STORAGE_KEY);
    if (storedBaziColumns) {
      const parsed = JSON.parse(storedBaziColumns) as Partial<Record<BaziFortuneColumnKey, boolean>>;
      baziFortuneColumnOptions.forEach(({ key }) => {
        if (typeof parsed[key] === 'boolean') baziFortuneColumnVisibility[key] = parsed[key];
      });
    }
  } catch {
    // 栏目偏好损坏时使用默认全显，不影响排盘与其他本地数据。
  }
  try {
    const storedPreferences = localStorage.getItem('shiyue-preferences');
    if (storedPreferences) {
      const parsedPreferences = JSON.parse(storedPreferences) as Partial<AiPreferences> & { activeAiChannelId?: string; aiChannels?: Partial<AiChannel>[]; aiConfig?: Partial<AiCustomConfig>; castingPreference?: CastingPreference };
      appPreferences.answerPreference = normalizeStoredAnswerPreference(parsedPreferences.answerPreference);
      if (parsedPreferences.displayLevel === 'basic' || parsedPreferences.displayLevel === 'beginner' || parsedPreferences.displayLevel === 'master') appPreferences.displayLevel = parsedPreferences.displayLevel;
      if (parsedPreferences.castingPreference === 'auto' || parsedPreferences.castingPreference === 'manual') appPreferences.castingPreference = parsedPreferences.castingPreference;
      if (Array.isArray(parsedPreferences.aiChannels) && parsedPreferences.aiChannels.length) {
        const channels = mergeDefaultAiChannels(parsedPreferences.aiChannels);
        appPreferences.aiChannels = channels;
        if (typeof parsedPreferences.activeAiChannelId === 'string' && channels.some((channel) => channel.id === parsedPreferences.activeAiChannelId)) appPreferences.activeAiChannelId = parsedPreferences.activeAiChannelId;
      } else if (parsedPreferences.aiConfig) {
        const legacyConfig = parsedPreferences.aiConfig;
        const builtin = createBuiltinAiChannel();
        if (legacyConfig.enabled) {
          const custom = createCustomAiChannel(1);
          custom.baseUrl = typeof legacyConfig.baseUrl === 'string' && legacyConfig.baseUrl.trim() ? legacyConfig.baseUrl : custom.baseUrl;
          custom.model = typeof legacyConfig.model === 'string' && legacyConfig.model.trim() ? legacyConfig.model : custom.model;
          custom.models = [custom.model];
          appPreferences.aiChannels = mergeDefaultAiChannels([builtin, custom]);
          appPreferences.activeAiChannelId = custom.id;
        } else {
          appPreferences.aiChannels = createDefaultAiChannels();
        }
      }
    }
    appPreferences.aiChannels.forEach((channel) => {
      channel.apiKey = sessionStorage.getItem(`shiyue-ai-key-${channel.id}`) || '';
    });
    const legacyApiKey = sessionStorage.getItem('shiyue-ai-api-key');
    const activeChannel = appPreferences.aiChannels.find((channel) => channel.id === appPreferences.activeAiChannelId);
    if (legacyApiKey && activeChannel?.provider === 'openai-compatible' && !activeChannel.apiKey) activeChannel.apiKey = legacyApiKey;
    if (!activeChannel || !isAiChannelReady(activeChannel)) appPreferences.activeAiChannelId = 'builtin';
    configuringAiChannelId.value = appPreferences.activeAiChannelId;
    onboardingAiChannelId.value = appPreferences.activeAiChannelId;
    const storedCases = localStorage.getItem('shiyue-cases');
    if (storedCases) {
      const parsed = JSON.parse(storedCases) as CaseProfile[];
      if (parsed.length) cases.value = parsed.map((item, index) => hydrateCase(item, index));
    } else {
      const oldBirth = localStorage.getItem('guangxing-birth');
      if (oldBirth) cases.value = [hydrateCase({ ...(JSON.parse(oldBirth) as Partial<BirthForm>), timeBasis: 'clock', isDefault: true }, 0)];
    }
    selectedCaseId.value = defaultCase.value.id;
    const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY) || localStorage.getItem('guangxing-history');
    if (storedHistory) {
      const storedHistoryPayload = JSON.parse(storedHistory) as unknown;
      history.value = parseStoredHistory(storedHistoryPayload);
      if (Array.isArray(storedHistoryPayload) && history.value.length !== storedHistoryPayload.length) persistHistory();
    }
  } catch {
    cases.value = [];
    selectedCaseId.value = draftCase.value.id;
    history.value = [];
  }
  try {
    const legacyHistory = localStorage.getItem(LEGACY_HISTORY_STORAGE_KEY);
    const alreadyMigrated = localStorage.getItem(LEGACY_HISTORY_MIGRATION_KEY) === 'complete';
    if (legacyHistory && !alreadyMigrated) {
      const migration = parseLegacyHistory(JSON.parse(legacyHistory) as unknown);
      const merged = mergeHistoryRecords(history.value, migration.records);
      history.value = merged.records;
      persistHistory();
      localStorage.setItem(LEGACY_HISTORY_MIGRATION_KEY, 'complete');
    }
  } catch {
    // 旧数据损坏或存储空间不足时保留原数据，后续启动仍可重试迁移。
  }
  try {
    const storedChartCache = localStorage.getItem(CHART_CACHE_STORAGE_KEY);
    if (storedChartCache) {
      const parsed = JSON.parse(storedChartCache) as Record<string, CachedChart>;
      chartCache.value = Object.fromEntries(Object.entries(parsed).filter(([, entry]) => entry && typeof entry.createdAt === 'number' && entry.result));
    }
  } catch {
    chartCache.value = {};
  }
  try {
    showOnboarding.value = localStorage.getItem(ONBOARDING_STORAGE_KEY) !== 'complete';
  } catch {
    showOnboarding.value = true;
  }
  // 页面每次启动都创建空白会话；历史只保留在记录页，不恢复到聊天输入区。
  leaveChat();
  void refreshHomeFortunePreview();
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', closeFloatingPanelsOnOutsidePointer);
  agentAbortController?.abort();
  backgroundAiControllers.forEach((controller) => controller.abort());
  if (toastTimer !== undefined) window.clearTimeout(toastTimer);
});

function scrollChatToLatest(behavior: ScrollBehavior = 'smooth') {
  void nextTick(() => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      const conversation = chatConversationRef.value;
      if (!conversation) return;
      conversation.scrollTo({ top: conversation.scrollHeight, behavior });
    }));
  });
}

watch(
  () => [chatMessages.value.length, isInterpreting.value, aiError.value] as const,
  () => scrollChatToLatest(),
);

function persistCases() {
  localStorage.setItem('shiyue-cases', JSON.stringify(cases.value));
}

function persistHistory() {
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.value));
}

function persistHistoryInterpretation(recordId: string | null, content: string) {
  const updatedHistory = updateHistoryInterpretation(history.value, recordId, content);
  if (updatedHistory === history.value) return;
  history.value = updatedHistory;
  const updatedRecord = updatedHistory.find((record) => record.id === recordId);
  if (updatedRecord && !isLegacyHistoryRecord(updatedRecord)) {
    if (currentRecord.value?.id === updatedRecord.id) currentRecord.value = updatedRecord;
    if (chartRecord.value?.id === updatedRecord.id) chartRecord.value = updatedRecord;
    if (compatibilityHistoryRecord.value?.id === updatedRecord.id) compatibilityHistoryRecord.value = updatedRecord;
  }
  persistHistory();
}

function showToast(message: string) {
  toastMessage.value = message;
  if (toastTimer !== undefined) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toastMessage.value = '';
    toastTimer = undefined;
  }, 4200);
}

function notifyBackgroundTasksForView(view: AppView) {
  const tasks = Array.from(runningAiTasks.values()).filter((task) => task.sourceView === view && !notifiedBackgroundTaskIds.has(task.id));
  const isPreparingCompatibility = view === 'compatibility' && compatibilityBusy.value;
  if (!tasks.length && !isPreparingCompatibility) return;
  tasks.forEach((task) => notifiedBackgroundTaskIds.add(task.id));
  showToast('AI 解读将在后台继续，完成后可在历史记录中查看。');
}

async function runBackgroundInterpretation(
  payload: AiInterpretationRequest,
  recordId: string | null,
  sourceView: AppView,
): Promise<AiInterpretationResponse> {
  const id = `ai-${Date.now()}-${++backgroundAiTaskSequence}`;
  const controller = new AbortController();
  runningAiTasks.set(id, { id, recordId, sourceView });
  backgroundAiControllers.set(id, controller);
  try {
    const response = await requestAiInterpretation(payload, controller.signal);
    persistHistoryInterpretation(recordId, response.content);
    return response;
  } finally {
    runningAiTasks.delete(id);
    backgroundAiControllers.delete(id);
    notifiedBackgroundTaskIds.delete(id);
  }
}

function requestCompatibilityInterpretation(payload: AiInterpretationRequest, recordId: string) {
  return runBackgroundInterpretation(payload, recordId || null, 'compatibility');
}

function addCompatibilityHistoryRecord(record: ReadingRecord) {
  const existingIndex = history.value.findIndex((item) => item.id === record.id);
  if (existingIndex >= 0) return;
  history.value = [record, ...history.value].slice(0, HISTORY_LIMIT);
  persistHistory();
}

function chartSignature(profile: CaseProfile) {
  return [
    profile.date,
    profile.dateType,
    profile.isLeapMonth,
    profile.time,
    profile.gender,
    profile.timeBasis,
    profile.regionId,
    profile.locationName,
    profile.latitude,
    profile.longitude,
    profile.timezone,
    new Date().getFullYear(),
  ].join('|');
}

function chartCacheKey(kind: ChartKind, profile: CaseProfile) {
  return `${profile.id}:${kind}:${chartSignature(profile)}`;
}

function persistChartCache() {
  const entries = Object.entries(chartCache.value).sort(([, left], [, right]) => right.createdAt - left.createdAt).slice(0, CHART_CACHE_LIMIT);
  for (let count = entries.length; count >= 0; count -= 1) {
    try {
      const compact = Object.fromEntries(entries.slice(0, count));
      localStorage.setItem(CHART_CACHE_STORAGE_KEY, JSON.stringify(compact));
      chartCache.value = compact;
      return;
    } catch {
      // localStorage 空间不足时依次淘汰较旧盘面；缓存失败不影响本次排盘。
    }
  }
}

function getCachedChart(kind: ChartKind, profile: CaseProfile) {
  return chartCache.value[chartCacheKey(kind, profile)] || null;
}

function cacheChart(kind: ChartKind, profile: CaseProfile, result: ReadingResult, createdAt: number) {
  Object.entries(chartCache.value).forEach(([key, entry]) => {
    if (entry.caseId === profile.id && entry.kind === kind) delete chartCache.value[key];
  });
  const key = chartCacheKey(kind, profile);
  chartCache.value[key] = { caseId: profile.id, kind, signature: chartSignature(profile), createdAt, result };
  persistChartCache();
}

function clearCaseChartCache(caseId: string, keepSignature?: string) {
  let changed = false;
  Object.entries(chartCache.value).forEach(([key, entry]) => {
    if (entry.caseId === caseId && (!keepSignature || entry.signature !== keepSignature)) {
      delete chartCache.value[key];
      changed = true;
    }
  });
  if (changed) persistChartCache();
}

function persistPreferences() {
  const storedPreferences = {
    answerPreference: appPreferences.answerPreference,
    displayLevel: appPreferences.displayLevel,
    castingPreference: appPreferences.castingPreference,
    activeAiChannelId: appPreferences.activeAiChannelId,
    aiChannels: appPreferences.aiChannels.map(({ apiKey: _apiKey, ...channel }) => channel),
  };
  localStorage.setItem('shiyue-preferences', JSON.stringify(storedPreferences));
  appPreferences.aiChannels.forEach((channel) => {
    const key = `shiyue-ai-key-${channel.id}`;
    if (channel.apiKey) sessionStorage.setItem(key, channel.apiKey);
    else sessionStorage.removeItem(key);
  });
}

watch(appPreferences, persistPreferences, { deep: true });
watch(baziFortuneColumnVisibility, () => {
  try {
    localStorage.setItem(BAZI_FORTUNE_COLUMN_STORAGE_KEY, JSON.stringify(baziFortuneColumnVisibility));
  } catch {
    // 浏览器禁用本地存储时仍保留当前会话内的显示选择。
  }
}, { deep: true });

let previousFeatureGlobalCaseId = '';

function normalizeFeatureCaseIds(ids: string[], globalCaseId = activeGlobalCaseId.value, previousGlobalCaseId = '') {
  const availableIds = new Set(selectableCaseProfiles.value.filter((profile) => profile.available !== false).map((profile) => profile.id));
  const additionalIds = ids.filter((id, index, all) => availableIds.has(id)
    && id !== globalCaseId
    && id !== previousGlobalCaseId
    && all.indexOf(id) === index);
  return globalCaseId && availableIds.has(globalCaseId) ? [globalCaseId, ...additionalIds] : additionalIds;
}

watch([
  activeGlobalCaseId,
  () => selectableCaseProfiles.value.map((profile) => `${profile.id}:${profile.available === false ? '0' : '1'}`).join('|'),
], ([globalCaseId]) => {
  almanacCaseIds.value = normalizeFeatureCaseIds(almanacCaseIds.value, globalCaseId, previousFeatureGlobalCaseId);
  fengShuiCaseIds.value = normalizeFeatureCaseIds(fengShuiCaseIds.value, globalCaseId, previousFeatureGlobalCaseId);
  previousFeatureGlobalCaseId = globalCaseId;
}, { immediate: true });

function updateAlmanacCaseIds(ids: string[]) {
  almanacCaseIds.value = normalizeFeatureCaseIds(ids);
  if (almanacMode.value === 'personal') {
    refreshAlmanac();
    if (showAlmanacSearchModal.value) void refreshAlmanacSearch();
  }
}

function updateFengShuiCaseIds(ids: string[]) {
  fengShuiCaseIds.value = normalizeFeatureCaseIds(ids);
}

function goToOnboardingStep(step: number) {
  if (step < 0 || step >= onboardingSteps.length || step > onboardingStep.value) return;
  onboardingError.value = '';
  onboardingStep.value = step;
}

function continueOnboarding() {
  onboardingError.value = '';
  onboardingStep.value = Math.min(onboardingStep.value + 1, onboardingSteps.length - 1);
}

function continueOnboardingAi() {
  const channel = onboardingAiChannel.value;
  if (!isAiChannelReady(channel)) {
    if (!channel.baseUrl.trim()) onboardingError.value = '请先填写接口地址。';
    else if (!channel.apiKey.trim()) onboardingError.value = '请先填写 API Key。';
    else onboardingError.value = '请先获取并选择一个模型。';
    return;
  }
  appPreferences.activeAiChannelId = channel.id;
  continueOnboarding();
}

function skipOnboardingCase() {
  continueOnboarding();
}

function saveOnboardingCase() {
  const validationError = caseValidationMessage(onboardingCase);
  if (validationError) {
    onboardingError.value = validationError;
    return;
  }
  const id = `case-${Date.now()}`;
  const label = onboardingCase.label.trim() || '我的案例';
  applyRegion(onboardingCase);
  const profile: CaseProfile = {
    ...onboardingCase,
    id,
    label,
    name: onboardingCase.name.trim() || label,
    isDefault: cases.value.length === 0,
  };
  cases.value = [...cases.value, profile];
  selectedCaseId.value = id;
  persistCases();
  continueOnboarding();
}

function finishOnboarding() {
  if (!onboardingDisclaimerAccepted.value) {
    onboardingError.value = '请先确认已知悉 AI 内容说明。';
    return;
  }
  completeOnboarding();
}

function skipOnboardingAsMaster() {
  appPreferences.displayLevel = 'master';
  completeOnboarding();
}

function completeOnboarding() {
  try {
    persistPreferences();
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'complete');
    onboardingError.value = '';
    showOnboarding.value = false;
  } catch {
    onboardingError.value = '浏览器无法保存设置，请检查隐私或存储权限后重试。';
  }
}

function resetAiTest() {
  aiTestMessage.value = '';
  aiTestState.value = 'idle';
}

function selectConfiguringAiChannel(id: string) {
  if (!appPreferences.aiChannels.some((channel) => channel.id === id)) return;
  configuringAiChannelId.value = id;
  aiModelMessage.value = '';
  aiModelState.value = 'idle';
  resetAiTest();
}

function setActiveAiChannel(id: string) {
  const channel = appPreferences.aiChannels.find((item) => item.id === id);
  if (!channel || !isAiChannelReady(channel)) return false;
  appPreferences.activeAiChannelId = channel.id;
  configuringAiChannelId.value = channel.id;
  resetAiTest();
  return true;
}

function handleTopbarAiChannelChange(event: Event) {
  setActiveAiChannel((event.target as HTMLSelectElement).value);
}

function invalidateAiModels(channel: AiChannel) {
  if (channel.provider === 'builtin') return;
  channel.models = [];
  channel.model = '';
  channel.modelsFetchedAt = undefined;
  aiModelMessage.value = '';
  aiModelState.value = 'idle';
  onboardingError.value = '';
  resetAiTest();
}

async function loadAiModels(channel: AiChannel, source: 'settings' | 'onboarding' = 'settings') {
  if (isLoadingAiModels.value || channel.provider === 'builtin') return;
  const setError = (message: string) => {
    if (source === 'onboarding') onboardingError.value = message;
    else {
      aiModelMessage.value = message;
      aiModelState.value = 'error';
    }
  };
  if (!channel.baseUrl.trim()) {
    setError('请先填写接口地址。');
    return;
  }
  if (!channel.apiKey.trim()) {
    setError('请先填写 API Key。');
    return;
  }
  isLoadingAiModels.value = true;
  aiModelMessage.value = '';
  aiModelState.value = 'idle';
  if (source === 'onboarding') onboardingError.value = '';
  try {
    const models = await requestAiModels({
      enabled: true,
      provider: channel.provider,
      apiType: channel.apiType,
      baseUrl: channel.baseUrl,
      model: channel.model,
      apiKey: channel.apiKey,
    });
    channel.models = models;
    channel.model = models.includes(channel.model) ? channel.model : models[0];
    channel.modelsFetchedAt = Date.now();
    aiModelMessage.value = `已获取 ${models.length} 个模型`;
    aiModelState.value = 'success';
  } catch (error) {
    setError(error instanceof Error ? error.message : '获取模型失败，请检查接口和密钥。');
  } finally {
    isLoadingAiModels.value = false;
  }
}

function addAiChannel() {
  const channel = createCustomAiChannel(appPreferences.aiChannels.length);
  appPreferences.aiChannels.push(channel);
  configuringAiChannelId.value = channel.id;
  aiModelMessage.value = '';
  aiModelState.value = 'idle';
  resetAiTest();
}

function removeAiChannel() {
  const channel = configuringAiChannel.value;
  if (channel.provider === 'builtin' || channel.preset) return;
  appPreferences.aiChannels = appPreferences.aiChannels.filter((item) => item.id !== channel.id);
  if (appPreferences.activeAiChannelId === channel.id) appPreferences.activeAiChannelId = 'builtin';
  configuringAiChannelId.value = appPreferences.activeAiChannelId;
  aiModelMessage.value = '';
  aiModelState.value = 'idle';
  resetAiTest();
}

function chooseAnswerPreference(preference: AiAnswerPreference) {
  appPreferences.answerPreference = preference;
  persistPreferences();
}

function chooseCastingPreference(preference: CastingPreference) {
  appPreferences.castingPreference = preference;
  persistPreferences();
}

function containsAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function inferAlmanacTopic(text: string): AlmanacPurpose | '' {
  if (containsAny(text, ['面试', '求职', '应聘'])) return 'career-interview';
  if (containsAny(text, ['入职', '到岗', '报道上班'])) return 'career-onboarding';
  if (containsAny(text, ['产品上线', '网站上线', '应用上线', '发布产品'])) return 'career-product-launch';
  if (containsAny(text, ['项目启动', '启动项目', '项目开工'])) return 'career-project-launch';
  if (containsAny(text, ['买房', '购房', '置业'])) return 'property-purchase';
  if (containsAny(text, ['租房', '租约', '签租'])) return 'property-rental';
  if (containsAny(text, ['购车', '买车', '提车'])) return 'purchase-vehicle';
  if (containsAny(text, ['大额采购', '大额购物', '采购设备'])) return 'purchase-major';
  if (containsAny(text, ['办公室搬迁', '搬办公室', '公司搬迁'])) return 'office-relocation';
  if (containsAny(text, ['安装设备', '设备安装', '重要设备'])) return 'home-device-install';
  if (containsAny(text, ['大扫除', '搬家清洁', '全屋清洁'])) return 'home-cleaning';
  if (containsAny(text, ['领养宠物', '接宠物', '宠物到家'])) return 'home-pet-arrival';
  if (containsAny(text, ['见家长'])) return 'life-family-meeting';
  if (containsAny(text, ['聚会', '团建', '宴请'])) return 'life-gathering';
  if (containsAny(text, ['理发', '剪发', '做发型'])) return 'life-haircut';
  if (containsAny(text, ['体检', '复查'])) return 'medical-checkup';
  if (containsAny(text, ['订婚', '纳采', '订盟'])) return 'marriage-engagement';
  if (containsAny(text, ['领证', '登记结婚'])) return 'marriage-registration';
  if (containsAny(text, ['结婚', '婚礼', '嫁娶'])) return 'marriage-wedding';
  if (containsAny(text, ['安床', '置床'])) return 'move-bed';
  if (containsAny(text, ['入宅', '乔迁'])) return 'move-entry';
  if (containsAny(text, ['搬家', '移徙', '迁居'])) return 'move-relocation';
  if (containsAny(text, ['上梁', '盖屋', '竖柱'])) return 'renovation-beam';
  if (containsAny(text, ['动土', '起基'])) return 'renovation-ground';
  if (containsAny(text, ['安门', '装门'])) return 'renovation-door';
  if (containsAny(text, ['装修', '动工', '修造', '拆卸'])) return 'renovation-start';
  if (containsAny(text, ['开业', '开张', '开店'])) return 'opening-business';
  if (containsAny(text, ['开工', '启用'])) return 'opening-work';
  if (containsAny(text, ['纳财', '开仓', '收款'])) return 'contract-finance';
  if (containsAny(text, ['交易', '买卖'])) return 'contract-trading';
  if (containsAny(text, ['签约', '合同', '协议'])) return 'contract-signing';
  if (containsAny(text, ['赴任', '上任', '履新'])) return 'travel-appointment';
  if (containsAny(text, ['出行', '旅行', '远行'])) return 'travel-trip';
  if (containsAny(text, ['手术', '治疗'])) return 'medical-treatment';
  if (containsAny(text, ['康复', '疗养'])) return 'medical-recovery';
  if (containsAny(text, ['就医', '求医', '看病', '问诊'])) return 'medical-visit';
  if (containsAny(text, ['迁坟', '启钻'])) return 'burial-relocation';
  if (containsAny(text, ['修坟', '立碑'])) return 'burial-tomb';
  if (containsAny(text, ['安葬', '下葬', '入殓'])) return 'burial-funeral';
  if (containsAny(text, ['求嗣', '求子', '祈子'])) return 'study-child';
  if (containsAny(text, ['祭祀', '礼拜'])) return 'study-worship';
  if (containsAny(text, ['祈福', '还愿'])) return 'study-prayer';
  if (containsAny(text, ['拜师', '进修'])) return 'study-training';
  if (containsAny(text, ['入学', '报名'])) return 'study-enrollment';
  if (containsAny(text, ['考试', '应试', '考证'])) return 'study-exam';
  return '';
}

function applyAgentSelection(selection: AgentToolSelection, questionText: string) {
  homeMode.value = selection.mode;
  if (selection.mode === 'chart') {
    homeChartKind.value = selection.chartKind;
    agentBaziFortune.value = selection.baziFortune || null;
    return;
  }
  agentBaziFortune.value = null;
  selectedKind.value = selection.divinationKind;
  if (selection.divinationKind === 'qimen' && selection.qimenScope) settings.qimenScope = selection.qimenScope;
  if (selection.divinationKind === 'wuyun-liuqi') selectedWuyunYear.value = selection.wuyunYear || new Date().getFullYear();
  if (selection.divinationKind === 'huangji-jingshi') selectedHuangjiYear.value = selection.huangjiYear || new Date().getFullYear();
  if (selectedKind.value === 'almanac') settings.almanacTopic = inferAlmanacTopic(questionText);
}

async function resolveAgentSelection(questionText: string) {
  const localSelection = selectLocalAgentTool(questionText);
  const sessionId = chatSessionId;
  agentAbortController?.abort();
  const controller = new AbortController();
  agentAbortController = controller;
  try {
    const previousTool = homeState.value === 'chat' && chatMessages.value.length
      ? homeMode.value === 'chart' ? homeChartKind.value : selectedKind.value
      : undefined;
    const conversation = chatMessages.value
      .filter((message): message is ChatTextMessage => message.kind === 'text')
      .slice(-6)
      .map((message) => ({ role: message.role, content: message.content }));
    const selection = await requestAgentToolSelection({
      question: questionText,
      hasProfile: Boolean(cases.value.length && currentCase.value?.date && currentCase.value?.time),
      inspirationMode: selectedInspirationPrompt.value ? inspirationMode.value : undefined,
      previousTool,
      castingPreference: appPreferences.castingPreference,
      conversation,
      aiConfig: activeAiRequestConfig.value,
    }, controller.signal);
    if (sessionId !== chatSessionId || controller.signal.aborted) throw new DOMException('会话已结束', 'AbortError');
    return selection;
  } catch (error) {
    if (sessionId !== chatSessionId || controller.signal.aborted) throw error;
    return localSelection;
  } finally {
    if (agentAbortController === controller) agentAbortController = null;
  }
}

function chooseDisplayLevel(level: DisplayLevel) {
  appPreferences.displayLevel = level;
  showToolPicker.value = false;
  persistPreferences();
}

function clearTransientAiState() {
  aiRequestId += 1;
  aiAnswer.value = '';
  aiError.value = '';
  lastAiRequest.value = null;
  lastAiHistoryRecordId.value = null;
  isInterpreting.value = false;
}

function resetOraclePageState() {
  oracleInitialQuestion.value = '';
  oracleResult.value = null;
  if (currentResult.value && isSsgw(currentResult.value)) {
    currentResult.value = null;
    currentRecord.value = null;
  }
  isReading.value = false;
  clearTransientAiState();
}

function resetAlmanacPageState() {
  almanacMode.value = 'general';
  almanacMonth.value = getDefaultAlmanacMonth();
  almanacResult.value = null;
  selectedAlmanacDate.value = '';
  almanacError.value = '';
  almanacRangeMonths.value = 1;
  settings.almanacTopic = '';
  almanacSearchItems.value = [];
  almanacSearchError.value = '';
  almanacSearchLoading.value = false;
  showAlmanacSearchModal.value = false;
  almanacSearchRequestId += 1;
  almanacCaseIds.value = activeGlobalCaseId.value ? [activeGlobalCaseId.value] : [];
}

function closeNavigationOverlays() {
  closeInspirationModal();
  closeReadingModal();
  closeFortuneDatePicker();
  if (!showOnboarding.value) closeBirthPicker();
}

function goView(view: AppView, options: { preservePageState?: boolean } = {}) {
  const previousView = activeView.value;
  const changedView = previousView !== view;
  if (changedView) notifyBackgroundTasksForView(previousView);
  const shouldRefreshCurrentFortune = view === 'fortune'
    && previousView === 'fortune'
    && (selectedFortunePeriod.value !== 'today' || !isCurrentFortuneDate.value);
  if (changedView) closeNavigationOverlays();
  if (previousView === 'oracle' && view !== 'oracle') resetOraclePageState();
  if (view === 'oracle' && previousView !== 'oracle') resetOraclePageState();
  if (view === 'almanac' && previousView !== 'almanac' && !options.preservePageState) resetAlmanacPageState();
  if (view === 'fortune') {
    selectedFortunePeriod.value = 'today';
    selectedFortuneDate.value = formatFortuneDateKey(new Date());
  }
  if (previousView === 'tools' && view !== 'tools' && homeState.value === 'chat') leaveChat();
  if (view === 'tools' && (previousView !== 'tools' || homeState.value === 'chat')) leaveChat();
  activeView.value = view;
  showMobileNav.value = false;
  showToolPicker.value = false;
  showAiPicker.value = false;
  showCaseSwitcher.value = false;
  if (view !== 'almanac') showAlmanacSearchModal.value = false;
  if (view !== 'tools') closeManualReading();
  if (view !== 'cases') showCaseEditor.value = false;
  showHistory.value = false;
  if (view === 'cases' && previousView !== 'cases') {
    activeCasesSection.value = 'input';
    resetNewCaseDraft();
  }
  if (view === 'settings' && previousView !== 'settings') activeSettingsSection.value = 'preferences';
  if (view === 'compatibility' && previousView !== 'compatibility') compatibilityHistoryRecord.value = null;
  contentRef.value?.scrollTo({ top: 0, behavior: 'smooth' });
  if (shouldRefreshCurrentFortune) void refreshDailyFortune();
}

function openSettingsSection(section: SettingsSection) {
  goView('settings');
  activeSettingsSection.value = section;
  if (section === 'ai') configuringAiChannelId.value = appPreferences.activeAiChannelId;
  contentRef.value?.scrollTo({ top: 0, behavior: 'smooth' });
}

function openCasesSection(section: CasesSection = 'input') {
  goView('cases');
  activeCasesSection.value = section;
  caseError.value = '';
  if (section === 'records') caseSearch.value = '';
  contentRef.value?.scrollTo({ top: 0, behavior: 'smooth' });
}

function chooseAlmanacMode(mode: AlmanacMode) {
  if (almanacMode.value === mode && almanacResult.value) return;
  almanacMode.value = mode;
  if (mode === 'personal') almanacMonthFilter.value = 'all';
  selectedAlmanacDate.value = '';
  refreshAlmanac();
  if (showAlmanacSearchModal.value) void refreshAlmanacSearch();
}

function updateAlmanacTopic() {
  void refreshAlmanacSearch();
}

function updateAlmanacRange() {
  void refreshAlmanacSearch();
}

function openAlmanacSearch() {
  settings.almanacTopic = '';
  almanacSearchItems.value = [];
  almanacSearchError.value = '';
  almanacSearchLoading.value = false;
  almanacSearchRequestId += 1;
  showAlmanacSearchModal.value = true;
}

function closeAlmanacSearch() {
  showAlmanacSearchModal.value = false;
}

function selectAlmanacDay(day: AlmanacDayCandidate) {
  selectedAlmanacDate.value = day.date;
}

function selectAlmanacCalendarCell(cell: AlmanacCalendarCell) {
  if (!cell.isNavigable) return;
  if (cell.day) {
    selectAlmanacDay(cell.day);
    return;
  }
  const month = cell.date.slice(0, 7);
  if (month === almanacMonth.value) return;
  almanacMonth.value = month;
  selectedAlmanacDate.value = cell.date;
  almanacResult.value = null;
  refreshAlmanac();
}

function updateAlmanacMonthFromPicker() {
  almanacResult.value = null;
  selectedAlmanacDate.value = '';
  refreshAlmanac();
}

function scrollToAlmanacCalendar() {
  void nextTick(() => almanacCalendarPanel.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
}

function selectAlmanacSearchDay(item: AlmanacSearchItem) {
  showAlmanacSearchModal.value = false;
  const month = item.day.date.slice(0, 7);
  selectedAlmanacDate.value = item.day.date;
  if (almanacMonth.value !== month) {
    almanacMonth.value = month;
    almanacResult.value = null;
    refreshAlmanac();
  }
  scrollToAlmanacCalendar();
}

function changeAlmanacMonth(amount: number) {
  const nextMonth = shiftAlmanacMonth(almanacMonth.value, amount);
  const nextYear = Number(nextMonth.slice(0, 4));
  if (nextYear < 1900 || nextYear > 2100) return;
  almanacMonth.value = nextMonth;
  almanacResult.value = null;
  selectedAlmanacDate.value = '';
  refreshAlmanac();
}

function showCurrentAlmanacMonth() {
  const currentMonth = getDefaultAlmanacMonth();
  if (almanacMonth.value === currentMonth && almanacResult.value) {
    if (almanacDaysByDate.value.has(almanacToday)) selectedAlmanacDate.value = almanacToday;
    return;
  }
  almanacMonth.value = currentMonth;
  almanacResult.value = null;
  selectedAlmanacDate.value = '';
  refreshAlmanac();
}

function almanacDayLevel(day: AlmanacDayCandidate): AlmanacAuspiceLevel {
  return almanacDayEvaluations.value.get(day.date)?.level || '平';
}

function almanacDayRhythm(day: AlmanacDayCandidate) {
  return modernizeAlmanacDay(day).rhythm.title;
}

function almanacSearchHourLabel(day: AlmanacDayCandidate) {
  const ranges = getModernAlmanacHours(day).slice(0, 3).map((item) => item.range);
  return ranges.length ? `优先时段 ${ranges.join('、')}` : '';
}

function almanacLevelClass(level: AlmanacAuspiceLevel) {
  if (level === '大吉') return 'is-excellent';
  if (level === '吉') return 'is-auspicious';
  if (level === '小吉') return 'is-small-auspicious';
  if (level === '慎用') return 'is-caution';
  if (level === '不宜') return 'is-inauspicious';
  return 'is-neutral';
}

function almanacDateParts(date: string) {
  const [, month, day] = date.split('-');
  return { month: `${Number(month)}月`, day: String(Number(day)) };
}

function almanacLevelShort(level: AlmanacAuspiceLevel) {
  if (level === '大吉') return '大吉';
  if (level === '小吉') return '小吉';
  return level;
}

function formatAlmanacDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function almanacLunarLabel(lunarDate: string) {
  return lunarDate.replace(/^农历[^年]+年/, '');
}

function almanacLunarDayLabel(lunarDate: string) {
  const label = almanacLunarLabel(lunarDate);
  const dayMatch = label.match(/(初[一二三四五六七八九十]|十[一二三四五六七八九]?|二十|廿[一二三四五六七八九]?|三十)$/);
  return dayMatch?.[1] || label.replace(/^(?:闰)?[正一二三四五六七八九十冬腊]+月/, '') || label;
}

function almanacDateTitle(date: string) {
  const [, month, day] = date.split('-').map(Number);
  return `${month}月${day}日`;
}

function almanacPersonalNotes(day: AlmanacDayCandidate) {
  return getModernAlmanacPersonalNotes(day);
}

function chooseTool(kind: DivinationKind) {
  if (selectedKind.value !== kind) {
    currentResult.value = null;
    currentRecord.value = null;
    closeManualReading();
  }
  selectedKind.value = kind;
  homeMode.value = 'divination';
  agentBaziFortune.value = null;
  showToolPicker.value = false;
  formError.value = '';
}

function openOracle(questionText = '') {
  goView('oracle');
  oracleInitialQuestion.value = questionText;
  oracleResult.value = null;
  question.value = '';
}

function chooseInspirationMode(mode: InspirationMode) {
  inspirationMode.value = mode;
  inspirationSearch.value = '';
  expandedInspirationGroups.value = [inspirationLibraries[mode][0]?.key || ''];
}

async function chooseInspiration(item: InspirationItem) {
  question.value = item.text;
  selectedInspirationPrompt.value = item.prompt || '';
  homeMode.value = inspirationMode.value === 'natal' ? 'chart' : 'divination';
  formError.value = '';
  aiError.value = '';
  closeInspirationModal();
  if (appPreferences.displayLevel === 'basic') await beginReading();
}

async function chooseNatalInspiration(group: InspirationGroup) {
  const item = group.questions[0];
  if (item) await chooseInspiration(item);
}

function clearInspirationPrompt() {
  selectedInspirationPrompt.value = '';
}

function toggleInspirationGroup(key: string) {
  expandedInspirationGroups.value = expandedInspirationGroups.value.includes(key)
    ? expandedInspirationGroups.value.filter((item) => item !== key)
    : [...expandedInspirationGroups.value, key];
}

function openInspirationModal() {
  showInspirationModal.value = true;
  showToolPicker.value = false;
  inspirationMode.value = homeMode.value === 'chart' ? 'natal' : 'matter';
  expandedInspirationGroups.value = [inspirationLibraries[inspirationMode.value][0]?.key || ''];
  inspirationSearch.value = '';
  formError.value = '';
  aiError.value = '';
}

function closeInspirationModal() {
  showInspirationModal.value = false;
  inspirationSearch.value = '';
  formError.value = '';
}

function openReadingModal(message: ChatReadingMessage) {
  selectedReadingMessage.value = message;
  showReadingModal.value = true;
}

function wuyunReading(message: ChatReadingMessage) {
  return message.method === 'wuyun-liuqi' ? message.reading as WuyunLiuqiResult : null;
}

function wuyunReadingYear(reading: WuyunLiuqiResult) {
  return reading.input.year ?? new Date().getFullYear();
}

function huangjiReading(message: ChatReadingMessage) {
  return message.method === 'huangji-jingshi' ? message.reading as HuangjiJingshiResult : null;
}

function huangjiReadingYear(reading: HuangjiJingshiResult) {
  return reading.input.year ?? new Date().getFullYear();
}

function readingDisplayTitle(message: ChatReadingMessage) {
  const reading = wuyunReading(message);
  if (reading) return `${wuyunReadingYear(reading)} 年度气运`;
  const huangji = huangjiReading(message);
  if (huangji) return `${huangjiReadingYear(huangji)} 年值年卦`;
  return message.context?.label || '当下起卦';
}

function readingDisplaySubtitle(message: ChatReadingMessage) {
  const reading = wuyunReading(message);
  if (reading) return `${reading.input.yearGanZhi}年 · 中运、司天在泉与五运六气`;
  const huangji = huangjiReading(message);
  if (huangji?.forecast) return `${huangji.forecast.hexagrams.annual.ganzhi}年 · ${huangji.forecast.hexagrams.annual.name} · 十年与六十年周期`;
  if (message.context) return `${message.context.date} ${message.context.time} · ${message.context.locationName}`;
  return '本次起卦结果';
}

function closeReadingModal() {
  showReadingModal.value = false;
  selectedReadingMessage.value = null;
}

async function submitHomePrompt() {
  await beginReading();
}

function leaveChat() {
  chatSessionId += 1;
  agentAbortController?.abort();
  agentAbortController = null;
  homeState.value = 'default';
  homeMode.value = 'divination';
  agentBaziFortune.value = null;
  question.value = '';
  currentResult.value = null;
  currentRecord.value = null;
  chatMessages.value = [];
  isReading.value = false;
  chartLoading.value = false;
  clearTransientAiState();
  formError.value = '';
  showToolPicker.value = false;
  closeManualReading();
  closeReadingModal();
}

function chooseHomeChart(kind: HomeChartKind) {
  homeMode.value = 'chart';
  homeChartKind.value = kind;
  agentBaziFortune.value = null;
  showToolPicker.value = false;
  closeManualReading();
  chartError.value = '';
  aiError.value = '';
  formError.value = '';
}

function chooseQimenScope(scope: typeof settings.qimenScope) {
  if (settings.qimenScope === scope) return;
  settings.qimenScope = scope;
  closeManualReading();
  formError.value = '';
}

function updateWuyunYear(event: Event) {
  const year = Number((event.target as HTMLInputElement).value);
  if (!Number.isInteger(year) || year < 1900 || year > 2199) {
    formError.value = '请选择 1900 至 2199 年之间的公历年份。';
    return;
  }
  selectedWuyunYear.value = year;
  formError.value = '';
}

function updateHuangjiYear(event: Event) {
  const year = Number((event.target as HTMLInputElement).value);
  if (!Number.isInteger(year) || year < 1900 || year > 2199) {
    formError.value = '请选择 1900 至 2199 年之间的公历年份。';
    return;
  }
  selectedHuangjiYear.value = year;
  formError.value = '';
}

function chooseChart(kind: ChartKind) {
  showBaziColumnSettings.value = false;
  chartKind.value = kind;
  const cached = currentCase.value?.date && currentCase.value?.time ? getCachedChart(kind, currentCase.value) : null;
  if (cached) {
    applyChartResult(kind, cached.result, cached.createdAt);
  } else {
    chartResult.value = null;
    chartRecord.value = null;
  }
  chartError.value = '';
  aiAnswer.value = '';
  aiError.value = '';
}

function openHistory() {
  showMobileNav.value = false;
  showAiPicker.value = false;
  showCaseSwitcher.value = false;
  showHistory.value = true;
  resetHistoryFilters();
}

function resetHistoryFilters() {
  historySearch.value = '';
  historyCategory.value = 'all';
  historyMethod.value = 'all';
  historyInterpretation.value = 'all';
}

function openCases() {
  showMobileNav.value = false;
  showHistory.value = false;
  showCaseSwitcher.value = false;
  showCaseEditor.value = false;
  openCasesSection('input');
}

function toggleAiPicker() {
  showAiPicker.value = !showAiPicker.value;
  showCaseSwitcher.value = false;
  showMobileNav.value = false;
}

function toggleCaseSwitcher() {
  showCaseSwitcher.value = !showCaseSwitcher.value;
  caseSwitcherSearch.value = '';
  showAiPicker.value = false;
  showHistory.value = false;
  showMobileNav.value = false;
}

function selectCase(id: string) {
  if (!cases.value.some((profile) => profile.id === id)) return;
  selectedCaseId.value = id;
  showCaseSwitcher.value = false;
  caseSwitcherSearch.value = '';
  formError.value = '';
  chartError.value = '';
}

async function openCompatibilityCaseChart(caseId: string) {
  const profile = cases.value.find((item) => item.id === caseId);
  if (!profile) return;
  try {
    const entry = await calculateCachedChart('bazi', profile);
    if (!isBazi(entry.result)) throw new Error('命盘数据无法识别。');
    openReadingModal({
      kind: 'reading',
      role: 'assistant',
      content: '',
      reading: entry.result,
      method: 'bazi',
      context: {
        label: profile.label,
        date: profile.date,
        time: profile.time,
        locationName: profile.locationName,
      },
    });
  } catch (error) {
    showToast(error instanceof Error ? error.message : '命盘暂时无法打开，请稍后再试。');
  }
}

const externalRegions = [
  { id: 'tokyo', label: '东京', locationName: '东京', latitude: '35.6762', longitude: '139.6503', timezone: '9' },
  { id: 'singapore', label: '新加坡', locationName: '新加坡', latitude: '1.3521', longitude: '103.8198', timezone: '8' },
] as const;

function selectableProvinceOptions(profile: CaseProfile) {
  return profile.provinceId === 'overseas'
    ? [...provinceOptions, { id: 'overseas', label: '海外常用' }]
    : provinceOptions;
}

function cityOptionsFor(profile: CaseProfile): ReadonlyArray<{ id: string; label: string }> {
  if (profile.provinceId === 'overseas') return externalRegions;
  return getBirthPlaceCityOptions(profile.provinceId);
}

function districtOptionsFor(profile: CaseProfile): ReadonlyArray<{ id: string; label: string }> {
  if (profile.provinceId === 'overseas') {
    const region = externalRegions.find((item) => item.id === profile.cityId) || externalRegions[0];
    return region ? [{ id: region.id, label: region.label }] : [];
  }
  return getBirthPlaceDistrictOptions(profile.cityId);
}

function pathCoordinate(path: BirthPlaceCascadePath, key: 'latitude' | 'longitude') {
  const nodes = [path.district, path.city, path.province];
  for (const node of nodes) {
    const value = node?.[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return null;
}

function applyBirthPlacePath(profile: CaseProfile, path: BirthPlaceCascadePath) {
  const finalNode = path.district || path.city || path.province;
  profile.provinceId = path.province.id;
  profile.cityId = path.city?.id || '';
  profile.regionId = finalNode.id;
  profile.regionKey = finalNode.id;
  profile.locationName = path.district?.displayName || path.city?.displayName || path.province.displayName || path.province.label;
  profile.longitude = String(pathCoordinate(path, 'longitude') ?? profile.longitude);
  profile.latitude = String(pathCoordinate(path, 'latitude') ?? resolveBirthPlaceApproximateLatitude(finalNode.id));
  profile.timezone = '8';
  profile.timeBasis = 'trueSolar';
}

function applyExternalRegion(profile: CaseProfile, regionId = profile.regionId || profile.cityId) {
  const region = externalRegions.find((item) => item.id === regionId) || externalRegions[0];
  if (!region) return;
  profile.provinceId = 'overseas';
  profile.cityId = region.id;
  profile.regionId = region.id;
  profile.regionKey = region.id;
  profile.locationName = region.locationName;
  profile.latitude = region.latitude;
  profile.longitude = region.longitude;
  profile.timezone = region.timezone;
  profile.timeBasis = 'trueSolar';
}

function applyRegion(profile: CaseProfile) {
  if (profile.provinceId === 'overseas') {
    applyExternalRegion(profile);
    return;
  }
  const path = findBirthPlaceByRegionId(profile.regionId || profile.regionKey)
    || findBirthPlaceByDisplayName(profile.locationName);
  if (path) applyBirthPlacePath(profile, path);
}

function changeProvince(profile: CaseProfile) {
  if (profile.provinceId === 'overseas') {
    applyExternalRegion(profile);
    return;
  }
  const city = getBirthPlaceCityOptions(profile.provinceId)[0];
  const district = city ? getBirthPlaceDistrictOptions(city.id)[0] : undefined;
  const path = findBirthPlaceByRegionId(district?.id || city?.id || profile.provinceId);
  if (path) applyBirthPlacePath(profile, path);
}

function changeCity(profile: CaseProfile) {
  if (profile.provinceId === 'overseas') {
    profile.regionId = profile.cityId;
    applyExternalRegion(profile);
    return;
  }
  const district = getBirthPlaceDistrictOptions(profile.cityId)[0];
  const path = findBirthPlaceByRegionId(district?.id || profile.cityId);
  if (path) applyBirthPlacePath(profile, path);
}

function changeDistrict(profile: CaseProfile) {
  if (profile.provinceId === 'overseas') applyExternalRegion(profile);
  else applyRegion(profile);
}

function numberPickerOptions(start: number, end: number, suffix: string, padding = 0): PickerOption[] {
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => {
    const number = start + index;
    const value = padding ? String(number).padStart(padding, '0') : String(number);
    return { value, label: `${number}${suffix}` };
  });
}

function normalizeDatePickerValues(values: string[]) {
  const fallback = ['2000', '01', '01'];
  const year = /^\d{4}$/.test(values[0] || '') ? values[0] : fallback[0];
  const monthNumber = Number(values[1]);
  const month = String(monthNumber >= 1 && monthNumber <= 12 ? monthNumber : Number(fallback[1])).padStart(2, '0');
  const maxDay = new Date(Number(year), Number(month), 0).getDate();
  const dayNumber = Math.max(1, Math.min(maxDay, Number(values[2]) || Number(fallback[2])));
  return [year, month, String(dayNumber).padStart(2, '0')];
}

function lunarMonthDayCount(year: number, month: number, isLeapMonth: boolean) {
  const day30Error = getBirthDateValidationMessage({ year, month, day: 30, dateType: 'lunar', isLeapMonth });
  if (!day30Error) return 30;
  const day29Error = getBirthDateValidationMessage({ year, month, day: 29, dateType: 'lunar', isLeapMonth });
  return day29Error ? 0 : 29;
}

function normalizeBirthDatePickerValues(values: string[], profile: CaseProfile) {
  const fallback = ['2000', '01', '01'];
  const year = /^\d{4}$/.test(values[0] || '') ? values[0] : fallback[0];
  const monthNumber = Number(values[1]);
  const month = String(monthNumber >= 1 && monthNumber <= 12 ? monthNumber : Number(fallback[1])).padStart(2, '0');
  if (profile.dateType !== 'lunar') return normalizeDatePickerValues([year, month, values[2] || fallback[2]]);
  const canUseLeapMonth = lunarMonthDayCount(Number(year), Number(month), true) > 0;
  const monthMode = values[3] === 'leap' && canUseLeapMonth ? 'leap' : 'regular';
  const maxDay = lunarMonthDayCount(Number(year), Number(month), monthMode === 'leap') || 29;
  const dayNumber = Math.max(1, Math.min(maxDay, Number(values[2]) || Number(fallback[2])));
  const normalized = [year, month, String(dayNumber).padStart(2, '0')];
  return canUseLeapMonth ? [...normalized, monthMode] : normalized;
}

const fortuneDatePickerColumns = computed<PickerColumn[]>(() => {
  const [year, month] = normalizeDatePickerValues([
    fortuneDatePicker.values[0] || '2000',
    fortuneDatePicker.values[1] || '01',
    fortuneDatePicker.values[2] || '01',
  ]);
  const maxDay = new Date(Number(year), Number(month), 0).getDate();
  const yearColumn: PickerColumn = { key: 'year', label: '年份', options: numberPickerOptions(1900, 2100, '年'), flex: 1.25 };
  if (selectedFortunePeriod.value === 'year') return [yearColumn];
  const monthColumn: PickerColumn = { key: 'month', label: '月份', options: numberPickerOptions(1, 12, '月', 2) };
  if (selectedFortunePeriod.value === 'month') return [yearColumn, monthColumn];
  return [yearColumn, monthColumn, { key: 'day', label: '日期', options: numberPickerOptions(1, maxDay, '日', 2) }];
});

function normalizeTimePickerValues(values: string[]) {
  const hourNumber = Math.max(0, Math.min(23, Number(values[0]) || 0));
  const minuteNumber = Math.max(0, Math.min(59, Number(values[1]) || 0));
  return [String(hourNumber).padStart(2, '0'), String(minuteNumber).padStart(2, '0')];
}

function normalizeRegionPickerValues(values: string[], profile: CaseProfile) {
  const provinces = selectableProvinceOptions(profile);
  const requestedProvince = values[0] || profile.provinceId;
  const provinceId = provinces.some((option) => option.id === requestedProvince)
    ? requestedProvince
    : provinces[0]?.id || '';
  const cities = provinceId === 'overseas' ? externalRegions : getBirthPlaceCityOptions(provinceId);
  const requestedCity = values[1] || profile.cityId;
  const cityId = cities.some((option) => option.id === requestedCity)
    ? requestedCity
    : cities[0]?.id || '';
  const districts = provinceId === 'overseas'
    ? cities.filter((option) => option.id === cityId)
    : getBirthPlaceDistrictOptions(cityId);
  const requestedDistrict = values[2] || profile.regionId;
  const regionId = districts.some((option) => option.id === requestedDistrict)
    ? requestedDistrict
    : districts[0]?.id || cityId || provinceId;
  return [provinceId, cityId, regionId];
}

function profileForBirthPicker(target = birthPicker.target) {
  if (target === 'onboarding') return onboardingCase;
  if (target === 'create') return newCaseDraft.value;
  return editableCase.value;
}

const birthPickerTitle = computed(() => {
  if (birthPicker.kind === 'date') return `选择${profileForBirthPicker().dateType === 'lunar' ? '农历' : '公历'}出生日期`;
  return ({
    gender: '选择性别',
    calendar: '选择出生历法',
    time: '选择出生时间',
    region: '选择出生地区',
  } as const)[birthPicker.kind];
});

const birthPickerColumns = computed<PickerColumn[]>(() => {
  const profile = profileForBirthPicker();
  if (birthPicker.kind === 'gender') {
    return [{
      key: 'gender',
      label: '性别',
      options: [{ value: 'female', label: '女' }, { value: 'male', label: '男' }],
    }];
  }
  if (birthPicker.kind === 'calendar') {
    return [{
      key: 'calendar',
      label: '历法',
      options: [{ value: 'solar', label: '公历' }, { value: 'lunar', label: '农历' }],
    }];
  }
  if (birthPicker.kind === 'date') {
    const normalized = normalizeBirthDatePickerValues(birthPicker.values, profile);
    const [year, month] = normalized;
    const currentYear = new Date().getFullYear();
    const minimumYear = Math.min(1900, Number(year));
    const maximumYear = Math.max(currentYear, Number(year));
    const isLunar = profile.dateType === 'lunar';
    const hasLeapMonth = isLunar && lunarMonthDayCount(Number(year), Number(month), true) > 0;
    const isLeapMonth = hasLeapMonth && normalized[3] === 'leap';
    const maxDay = isLunar
      ? lunarMonthDayCount(Number(year), Number(month), isLeapMonth) || 29
      : new Date(Number(year), Number(month), 0).getDate();
    const columns: PickerColumn[] = [
      { key: 'year', label: '年份', options: numberPickerOptions(minimumYear, maximumYear, '年'), flex: 1.25 },
      { key: 'month', label: '月份', options: numberPickerOptions(1, 12, '月', 2) },
      { key: 'day', label: '日期', options: numberPickerOptions(1, maxDay, '日', 2) },
    ];
    if (hasLeapMonth) columns.push({ key: 'monthMode', label: '月份类型', options: [{ value: 'regular', label: '本月' }, { value: 'leap', label: '闰月' }] });
    return columns;
  }
  if (birthPicker.kind === 'time') {
    return [
      { key: 'hour', label: '小时', options: numberPickerOptions(0, 23, '时', 2) },
      { key: 'minute', label: '分钟', options: numberPickerOptions(0, 59, '分', 2) },
    ];
  }
  const [provinceId, cityId] = normalizeRegionPickerValues(birthPicker.values, profile);
  const provinces = selectableProvinceOptions(profile);
  const cities = provinceId === 'overseas' ? externalRegions : getBirthPlaceCityOptions(provinceId);
  const districts = provinceId === 'overseas'
    ? cities.filter((option) => option.id === cityId)
    : getBirthPlaceDistrictOptions(cityId);
  return [
    { key: 'province', label: '省份', options: provinces.map((option) => ({ value: option.id, label: option.label })), flex: 1.12 },
    { key: 'city', label: '城市', options: cities.map((option) => ({ value: option.id, label: option.label })) },
    { key: 'district', label: '区县', options: districts.map((option) => ({ value: option.id, label: option.label })) },
  ];
});

function birthPickerFieldValue(kind: BirthPickerKind, profile: CaseProfile) {
  if (kind === 'gender') return profile.gender === 'male' ? '男' : '女';
  if (kind === 'calendar') return profile.dateType === 'lunar' ? '农历' : '公历';
  if (kind === 'date') return profile.date ? formatCaseDate(profile) : '请选择';
  if (kind === 'time') return profile.time || '请选择';
  return profile.locationName || '请选择';
}

function openBirthPicker(kind: BirthPickerKind, target: BirthPickerTarget) {
  const profile = profileForBirthPicker(target);
  birthPicker.kind = kind;
  birthPicker.target = target;
  if (kind === 'gender') birthPicker.values = [profile.gender || 'female'];
  else if (kind === 'calendar') birthPicker.values = [profile.dateType === 'lunar' ? 'lunar' : 'solar'];
  else if (kind === 'date') birthPicker.values = normalizeBirthDatePickerValues([...(profile.date || '2000-01-01').split('-'), profile.isLeapMonth ? 'leap' : 'regular'], profile);
  else if (kind === 'time') birthPicker.values = normalizeTimePickerValues((profile.time || '12:00').split(':'));
  else birthPicker.values = normalizeRegionPickerValues([profile.provinceId, profile.cityId, profile.regionId], profile);
  birthPicker.open = true;
}

function updateBirthPickerValues(values: string[]) {
  const profile = profileForBirthPicker();
  if (birthPicker.kind === 'date') birthPicker.values = normalizeBirthDatePickerValues(values, profile);
  else if (birthPicker.kind === 'time') birthPicker.values = normalizeTimePickerValues(values);
  else if (birthPicker.kind === 'region') birthPicker.values = normalizeRegionPickerValues(values, profile);
  else if (birthPicker.kind === 'calendar') birthPicker.values = [values[0] === 'lunar' ? 'lunar' : 'solar'];
  else birthPicker.values = [values[0] === 'male' ? 'male' : 'female'];
}

function closeBirthPicker() {
  birthPicker.open = false;
  birthPicker.values = [];
}

function confirmBirthPicker(values: string[]) {
  updateBirthPickerValues(values);
  const profile = profileForBirthPicker();
  if (birthPicker.kind === 'gender') profile.gender = birthPicker.values[0] === 'male' ? 'male' : 'female';
  else if (birthPicker.kind === 'calendar') {
    const dateType = birthPicker.values[0] === 'lunar' ? 'lunar' : 'solar';
    if (profile.dateType !== dateType) profile.date = '';
    profile.dateType = dateType;
    profile.isLeapMonth = false;
  } else if (birthPicker.kind === 'date') {
    profile.date = birthPicker.values.slice(0, 3).join('-');
    profile.isLeapMonth = profile.dateType === 'lunar' && birthPicker.values[3] === 'leap';
  } else if (birthPicker.kind === 'time') profile.time = birthPicker.values.join(':');
  else {
    const [provinceId, cityId, regionId] = birthPicker.values;
    profile.provinceId = provinceId;
    profile.cityId = cityId;
    profile.regionId = regionId;
    profile.regionKey = regionId;
    if (provinceId === 'overseas') applyExternalRegion(profile, regionId);
    else {
      const path = findBirthPlaceByRegionId(regionId || cityId || provinceId);
      if (path) applyBirthPlacePath(profile, path);
    }
  }
  closeBirthPicker();
}

function openFortuneDatePicker() {
  const values = normalizeDatePickerValues(selectedFortuneDate.value.split('-'));
  fortuneDatePicker.values = selectedFortunePeriod.value === 'year'
    ? values.slice(0, 1)
    : selectedFortunePeriod.value === 'month'
      ? values.slice(0, 2)
      : values;
  fortuneDatePicker.open = true;
}

function updateFortuneDatePickerValues(values: string[]) {
  if (selectedFortunePeriod.value === 'year') {
    fortuneDatePicker.values = [/^\d{4}$/.test(values[0] || '') ? values[0] : '2000'];
    return;
  }
  if (selectedFortunePeriod.value === 'month') {
    fortuneDatePicker.values = normalizeDatePickerValues([values[0], values[1], '15']).slice(0, 2);
    return;
  }
  fortuneDatePicker.values = normalizeDatePickerValues(values);
}

function closeFortuneDatePicker() {
  fortuneDatePicker.open = false;
  fortuneDatePicker.values = [];
}

function setFortuneDate(date: Date) {
  if (date.getFullYear() < 1900 || date.getFullYear() > 2100) return;
  const nextDate = formatFortuneDateKey(date);
  if (selectedFortuneDate.value === nextDate) return;
  selectedFortuneDate.value = nextDate;
  void refreshDailyFortune();
}

function confirmFortuneDatePicker(values: string[]) {
  const [currentYear, currentMonth, currentDay] = normalizeDatePickerValues(selectedFortuneDate.value.split('-')).map(Number);
  const year = Number(values[0]) || currentYear;
  const month = selectedFortunePeriod.value === 'year' ? 7 : Number(values[1]) || currentMonth;
  const day = selectedFortunePeriod.value === 'today' ? Number(values[2]) || currentDay : selectedFortunePeriod.value === 'month' ? 15 : 1;
  closeFortuneDatePicker();
  setFortuneDate(new Date(year, month - 1, day, 12, 0, 0, 0));
}

function shiftFortuneDate(amount: number) {
  const current = parseFortuneDate(selectedFortuneDate.value);
  if (selectedFortunePeriod.value === 'today') {
    current.setDate(current.getDate() + amount);
  } else if (selectedFortunePeriod.value === 'month') {
    current.setDate(15);
    current.setMonth(current.getMonth() + amount);
  } else {
    current.setDate(1);
    current.setMonth(6);
    current.setFullYear(current.getFullYear() + amount);
  }
  setFortuneDate(current);
}

function resetFortuneDate() {
  const current = new Date();
  if (selectedFortunePeriod.value === 'month') current.setDate(15);
  else if (selectedFortunePeriod.value === 'year') {
    current.setMonth(6);
    current.setDate(1);
  }
  setFortuneDate(current);
}

function uniqueCaseName(profile: CaseProfile) {
  const name = (profile.name || '').trim();
  return name && name !== (profile.label || '').trim() ? name : '';
}

function formatCaseDate(profile: CaseProfile) {
  const [year, month, day] = (profile.date || '').split('-');
  if (!year || !month || !day) return '日期待补充';
  const date = `${year}年${Number(month)}月${Number(day)}日`;
  return profile.dateType === 'lunar' ? `农历${year}年${profile.isLeapMonth ? '闰' : ''}${Number(month)}月${Number(day)}日` : date;
}

function matchesCaseSearch(profile: CaseProfile, search: string) {
  const query = search.trim().toLocaleLowerCase('zh-CN');
  if (!query) return true;
  return [
    profile.label,
    profile.name,
    profile.locationName,
    profile.date,
    profile.time,
    profile.gender === 'male' ? '男' : '女',
  ].some((value) => String(value || '').toLocaleLowerCase('zh-CN').includes(query));
}

function resetNewCaseDraft() {
  newCaseDraft.value = createNewCaseDraft();
  caseError.value = '';
}

function caseValidationMessage(profile: CaseProfile) {
  if (!profile.label.trim() && !profile.name.trim()) return '请填写案例名称。';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(profile.date) || !/^\d{2}:\d{2}$/.test(profile.time)) return '请选择出生日期和时间。';
  const [year, month, day] = profile.date.split('-').map(Number);
  const [hour, minute] = profile.time.split(':').map(Number);
  if (getBirthDateValidationMessage({
    year,
    month,
    day,
    dateType: profile.dateType,
    isLeapMonth: profile.dateType === 'lunar' && profile.isLeapMonth,
  }) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return '出生日期或时间无效，请重新选择。';
  try {
    getBirthCalendarInfo(profile);
  } catch {
    return '出生日期或时间无效，请重新选择。';
  }
  if (!profile.regionId || !profile.locationName) return '请选择出生地区。';
  return '';
}

function saveNewCase() {
  const profile = { ...newCaseDraft.value };
  const validationError = caseValidationMessage(profile);
  if (validationError) {
    caseError.value = validationError;
    return;
  }
  const isFirstCase = cases.value.length === 0;
  profile.id = `case-${Date.now()}`;
  profile.label = profile.label.trim() || profile.name.trim() || `案例 ${cases.value.length + 1}`;
  profile.name = profile.name.trim() || profile.label;
  profile.isDefault = isFirstCase;
  applyRegion(profile);
  cases.value = [...cases.value, profile];
  if (isFirstCase) selectedCaseId.value = profile.id;
  persistCases();
  resetNewCaseDraft();
  caseSearch.value = '';
  activeCasesSection.value = 'records';
}

function editCase(id: string) {
  const profile = cases.value.find((item) => item.id === id);
  if (!profile) return;
  caseEditorDraft.value = { ...profile };
  caseError.value = '';
  showCaseEditor.value = true;
}

function closeCaseEditor() {
  caseEditorDraft.value = null;
  showCaseEditor.value = false;
  caseError.value = '';
}

function deleteCase() {
  const profile = caseEditorDraft.value;
  if (!profile || cases.value.length === 1) {
    caseError.value = '至少保留一个案例。';
    return;
  }
  const deletedCaseId = profile.id;
  const remaining = cases.value.filter((item) => item.id !== deletedCaseId);
  if (profile.isDefault && remaining[0]) remaining[0] = { ...remaining[0], isDefault: true };
  cases.value = remaining;
  if (selectedCaseId.value === deletedCaseId) selectedCaseId.value = defaultCase.value.id;
  caseEditorDraft.value = null;
  showCaseEditor.value = false;
  persistCases();
  clearCaseChartCache(deletedCaseId);
}

function saveCurrentCase() {
  if (!caseEditorDraft.value) return;
  const profile = { ...caseEditorDraft.value };
  const validationError = caseValidationMessage(profile);
  if (validationError) {
    caseError.value = validationError;
    return;
  }
  if (!profile.name.trim()) profile.name = profile.label;
  if (!profile.label.trim()) profile.label = profile.name || '未命名案例';
  if (cases.value.length === 1) {
    profile.isDefault = true;
  }
  applyRegion(profile);
  cases.value = cases.value.map((item) => item.id === profile.id ? profile : item);
  clearCaseChartCache(profile.id, chartSignature(profile));
  caseEditorDraft.value = null;
  persistCases();
  caseError.value = '';
  showCaseEditor.value = false;
}

async function buildAiRequest(
  mode: AiInterpretationRequest['mode'],
  questionText: string,
  kind?: DivinationKind,
  result?: ReadingResult,
  channel: AiChannel = activeAiChannel.value,
  chartPromptOptions: ChartReadingPromptOptions = {},
): Promise<AiInterpretationRequest> {
  const profile = currentCase.value;
  const request: AiInterpretationRequest = {
    mode,
    question: questionText,
    method: kind ? kindMeta[kind].label : undefined,
    ...(mode === 'chart' ? {
      profile: {
        label: profile.label,
        name: profile.name,
        gender: profile.gender,
        date: profile.date,
        dateType: profile.dateType,
        isLeapMonth: profile.isLeapMonth,
        time: profile.time,
        locationName: profile.locationName,
        timeBasis: profile.timeBasis,
      },
    } : {}),
    preferences: {
      answerPreference: appPreferences.answerPreference,
      displayLevel: appPreferences.displayLevel,
    },
    aiConfig: channelToAiConfig(channel),
  };
  if (result && kind) {
    const corePrompt = mode === 'divination' ? await buildDivinationReadingPrompt(kind, result, { question: questionText }) : undefined;
    const chartPrompt = mode === 'chart' && isChartReading(kind)
      ? (await import('./lib/chartPrompt')).buildChartReadingPrompt(kind, result, { ...chartPromptOptions, question: questionText })
      : undefined;
    request.reading = {
      summary: formatReadingSummary(kind, result),
      data: result,
      prompt: chartPrompt ?? corePrompt,
    };
  }
  return request;
}

async function buildCombinedChartAiRequest(
  questionText: string,
  bazi: BaziChartResult,
  ziwei: ZiweiChartData,
  baziFortune?: BaziFortuneRequest | null,
) {
  const request = await buildAiRequest('chart', questionText);
  request.method = '八字紫微合参';
  request.reading = {
    summary: `八字：${formatReadingSummary('bazi', bazi)}；紫微：${formatReadingSummary('ziwei', ziwei)}`,
    data: { kind: 'bazi-ziwei' },
    prompt: (await import('./lib/chartPrompt')).buildBaziZiweiCombinedPrompt(bazi, ziwei, { question: questionText, baziFortune }),
  };
  return request;
}

let aiRequestId = 0;

async function requestInterpretation(
  payload: AiInterpretationRequest,
  appendToChat = true,
  sessionId = chatSessionId,
  historyRecordId: string | null = null,
) {
  const requestId = ++aiRequestId;
  const sourceView = activeView.value;
  lastAiRequest.value = payload;
  lastAiHistoryRecordId.value = historyRecordId;
  isInterpreting.value = true;
  aiError.value = '';
  aiAnswer.value = '';
  try {
    const response = await runBackgroundInterpretation(payload, historyRecordId, sourceView);
    if (requestId !== aiRequestId || sessionId !== chatSessionId) return;
    aiAnswer.value = response.content;
    if (appendToChat && homeState.value === 'chat') chatMessages.value = [...chatMessages.value, { kind: 'text', role: 'assistant', content: response.content }];
  } catch (error) {
    if (requestId !== aiRequestId || sessionId !== chatSessionId) return;
    aiError.value = error instanceof Error ? error.message : 'AI 解读暂时失败，请稍后再试。';
  } finally {
    if (requestId === aiRequestId && sessionId === chatSessionId) isInterpreting.value = false;
  }
}

function retryLastInterpretation() {
  if (!lastAiRequest.value || isInterpreting.value) return;
  void requestInterpretation(lastAiRequest.value, true, chatSessionId, lastAiHistoryRecordId.value);
}

function currentConversationContext() {
  return chatMessages.value
    .filter((message): message is ChatTextMessage => message.kind === 'text')
    .slice(-10)
    .map((message) => ({ role: message.role, content: message.content }));
}

async function continueCurrentReading(questionText: string) {
  const baseRequest = lastAiRequest.value;
  if (!baseRequest?.reading) return false;
  const sessionId = chatSessionId;
  const conversation = currentConversationContext();
  chatMessages.value = [...chatMessages.value, { kind: 'text', role: 'user', content: questionText }];
  question.value = '';
  formError.value = '';
  await requestInterpretation({
    ...baseRequest,
    question: questionText,
    conversation,
    preferences: {
      answerPreference: appPreferences.answerPreference,
      displayLevel: appPreferences.displayLevel,
    },
    aiConfig: activeAiRequestConfig.value,
  }, true, sessionId, lastAiHistoryRecordId.value);
  return true;
}

async function testAiConnection() {
  if (isTestingAi.value) return;
  const channel = configuringAiChannel.value;
  if (!isAiChannelReady(channel)) {
    aiTestState.value = 'error';
    aiTestMessage.value = '请先完成接口、密钥和模型配置。';
    return;
  }
  resetAiTest();
  isTestingAi.value = true;
  try {
    const response = await requestAiInterpretation(await buildAiRequest('ask', '请只回复“连接成功”，不要补充其他内容。', undefined, undefined, channel));
    aiTestState.value = 'success';
    aiTestMessage.value = `连接成功 · ${response.model || '当前模型'}`;
  } catch (error) {
    aiTestState.value = 'error';
    aiTestMessage.value = error instanceof Error ? error.message : '连接失败，请检查配置。';
  } finally {
    isTestingAi.value = false;
  }
}

async function completeDivination(
  kind: DivinationKind,
  result: ReadingResult,
  userQuestion: string,
  appendToChat = true,
  sessionId = chatSessionId,
) {
  if (sessionId !== chatSessionId) return;
  const createdAt = Date.now();
  const record: ReadingRecord = {
    id: `${createdAt}-${Math.random().toString(16).slice(2)}`,
    kind,
    methodLabel: kindMeta[kind].label,
    question: userQuestion,
    createdAt,
    result,
  };
  selectedKind.value = kind;
  if (kind === 'wuyun-liuqi') selectedWuyunYear.value = wuyunReadingYear(result as WuyunLiuqiResult);
  if (kind === 'huangji-jingshi') selectedHuangjiYear.value = huangjiReadingYear(result as HuangjiJingshiResult);
  currentResult.value = result;
  currentRecord.value = record;
  if (appendToChat) {
    chatMessages.value = [
      ...chatMessages.value,
      { kind: 'text', role: 'user', content: userQuestion },
      { kind: 'reading', role: 'assistant', content: '', reading: result, method: kind },
    ];
  }
  const shouldStoreHistory = kind !== 'almanac';
  if (shouldStoreHistory) {
    history.value = [record, ...history.value].slice(0, HISTORY_LIMIT);
    persistHistory();
  }
  await requestInterpretation(
    await buildAiRequest('divination', userQuestion, kind, result),
    appendToChat,
    sessionId,
    shouldStoreHistory ? record.id : null,
  );
}

function startManualReading(kind: ManualDivinationKind, userQuestion: string) {
  pendingManualKind.value = kind;
  pendingCastingQuestion.value = userQuestion;
  formError.value = '';
}

function closeManualReading() {
  pendingManualKind.value = null;
  pendingCastingQuestion.value = '';
}

async function finishManualReading(payload: { result: ReadingResult; mode: CastingMode }) {
  const kind = pendingManualKind.value;
  const userQuestion = pendingCastingQuestion.value.trim();
  if (!kind || selectedKind.value !== kind || !userQuestion) return;
  const sessionId = chatSessionId;
  closeManualReading();
  homeState.value = 'chat';
  showToolPicker.value = false;
  question.value = '';
  isReading.value = true;
  formError.value = '';
  try {
    await completeDivination(kind, payload.result, userQuestion, true, sessionId);
    if (sessionId === chatSessionId) selectedInspirationPrompt.value = '';
  } catch (error) {
    if (sessionId === chatSessionId) formError.value = error instanceof Error ? error.message : '占卜结果没有完成。';
  } finally {
    if (sessionId === chatSessionId) isReading.value = false;
  }
}

async function finishAutomaticReading(kind: ManualDivinationKind, userQuestion: string) {
  const sessionId = chatSessionId;
  homeState.value = 'chat';
  showToolPicker.value = false;
  question.value = '';
  isReading.value = true;
  formError.value = '';
  try {
    const result = await runAutomaticCasting(kind, new Date(), { qimenScope: settings.qimenScope });
    await completeDivination(kind, result, userQuestion, true, sessionId);
    if (sessionId === chatSessionId) selectedInspirationPrompt.value = '';
  } catch (error) {
    if (sessionId === chatSessionId) formError.value = error instanceof Error ? error.message : '自动起卦没有完成。';
  } finally {
    if (sessionId === chatSessionId) isReading.value = false;
  }
}

async function completeOracleReading(payload: { result: SsgwData; question: string }) {
  isReading.value = true;
  aiAnswer.value = '';
  aiError.value = '';
  oracleResult.value = payload.result;
  try {
    await completeDivination('ssgw', payload.result, payload.question, false);
  } catch (error) {
    aiError.value = error instanceof Error ? error.message : '解签暂时没有完成。';
  } finally {
    isReading.value = false;
  }
}

async function beginReading() {
  if (isReading.value || isInterpreting.value || chartLoading.value) return;
  formError.value = '';
  aiError.value = '';
  const requestedQuestion = question.value.trim();
  if (!requestedQuestion) {
    formError.value = '请先写下想问的事，或从问题灵感中选择。';
    return;
  }
  if (homeState.value === 'chat' && chatMessages.value.some((message) => message.kind === 'reading')) {
    if (await continueCurrentReading(requestedQuestion)) return;
  }
  const sessionId = chatSessionId;
  if (appPreferences.displayLevel === 'basic') {
    isReading.value = true;
    try {
      const selection = await resolveAgentSelection(requestedQuestion);
      if (sessionId !== chatSessionId) return;
      applyAgentSelection(selection, requestedQuestion);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) throw error;
      return;
    } finally {
      if (sessionId === chatSessionId) isReading.value = false;
    }
  }
  if (homeMode.value === 'chart') {
    if (!cases.value.length || !currentCase.value?.date || !currentCase.value?.time) {
      formError.value = '请先完善案例资料。';
      openCases();
      return;
    }
    const kind = homeChartKind.value;
    const chartQuestion = requestedQuestion;
    const chartAiQuestion = selectedInspirationPrompt.value || chartQuestion;
    homeState.value = 'chat';
    showToolPicker.value = false;
    chatMessages.value = [...chatMessages.value, { kind: 'text', role: 'user', content: chartQuestion }];
    question.value = '';
    chartLoading.value = true;
    chartError.value = '';
    await new Promise((resolve) => window.setTimeout(resolve, 260));
    if (sessionId !== chatSessionId) return;
    try {
      if (kind === 'bazi-ziwei') {
        const [baziEntry, ziweiEntry] = await Promise.all([
          calculateCachedChart('bazi', currentCase.value),
          calculateCachedChart('ziwei', currentCase.value),
        ]);
        if (!isBazi(baziEntry.result) || !isZiwei(ziweiEntry.result)) throw new Error('合参盘面数据无法识别，请稍后重试。');
        const context = {
          label: currentCase.value.label,
          date: currentCase.value.date,
          time: currentCase.value.time,
          locationName: currentCase.value.locationName,
        };
        const createdAt = Date.now();
        const record: ReadingRecord = {
          id: `${createdAt}-combined-chart-chat`,
          kind: 'bazi',
          methodLabel: '八字紫微合参',
          question: chartQuestion,
          createdAt,
          result: baziEntry.result,
          relatedResults: [{ kind: 'ziwei', result: ziweiEntry.result }],
          context,
        };
        chatMessages.value = [
          ...chatMessages.value,
          { kind: 'reading', role: 'assistant', content: '', reading: baziEntry.result, method: 'bazi', context },
          { kind: 'reading', role: 'assistant', content: '', reading: ziweiEntry.result, method: 'ziwei', context },
        ];
        history.value = [record, ...history.value].slice(0, HISTORY_LIMIT);
        persistHistory();
        if (sessionId !== chatSessionId) return;
        await requestInterpretation(await buildCombinedChartAiRequest(
          chartAiQuestion,
          baziEntry.result,
          ziweiEntry.result,
          agentBaziFortune.value,
        ), true, sessionId, record.id);
        selectedInspirationPrompt.value = '';
        return;
      }
      const chartEntry = await calculateCachedChart(kind, currentCase.value);
      if (sessionId !== chatSessionId) return;
      const result = chartEntry.result;
      const createdAt = Date.now();
      chartResult.value = result;
      chartRecord.value = {
        id: `${createdAt}-chart-chat`,
        kind,
        methodLabel: kindMeta[kind].label,
        question: `${currentCase.value.label} · ${kindMeta[kind].label}`,
        createdAt,
        result,
        context: {
          label: currentCase.value.label,
          date: currentCase.value.date,
          time: currentCase.value.time,
          locationName: currentCase.value.locationName,
        },
      };
      chatMessages.value = [...chatMessages.value, {
        kind: 'reading',
        role: 'assistant',
        content: '',
        reading: result,
        method: kind,
        context: {
          label: currentCase.value.label,
          date: currentCase.value.date,
          time: currentCase.value.time,
          locationName: currentCase.value.locationName,
        },
      }];
      history.value = [chartRecord.value, ...history.value].slice(0, HISTORY_LIMIT);
      persistHistory();
      await requestInterpretation(await buildAiRequest(
        'chart',
        chartAiQuestion,
        kind,
        result,
        activeAiChannel.value,
        kind === 'bazi' ? { baziFortune: agentBaziFortune.value } : {},
      ), true, sessionId, chartRecord.value?.id || null);
      selectedInspirationPrompt.value = '';
    } catch (error) {
      chartError.value = error instanceof Error ? error.message : '排盘没有完成，请检查案例资料。';
      formError.value = chartError.value;
    } finally {
      if (sessionId === chatSessionId) chartLoading.value = false;
    }
    return;
  }

  const userQuestion = requestedQuestion;

  if (selectedKind.value === 'almanac') {
    settings.almanacTopic = inferAlmanacTopic(userQuestion);
    almanacMode.value = activeAlmanacProfile.value ? 'personal' : 'general';
    almanacMonth.value = getDefaultAlmanacMonth();
    almanacResult.value = null;
    selectedAlmanacDate.value = '';
    question.value = '';
    goView('almanac', { preservePageState: true });
    return;
  }

  if (selectedKind.value === 'ssgw') {
    openOracle(userQuestion);
    return;
  }
  if (isManualDivinationKind(selectedKind.value)) {
    const manualKind = selectedKind.value;
    if (appPreferences.castingPreference === 'auto') {
      await finishAutomaticReading(manualKind, userQuestion);
      return;
    }
    startManualReading(manualKind, userQuestion);
    return;
  }

  if (selectedMeta.value.needsBirth && !currentCase.value?.date) {
    formError.value = '请先完善案例资料。';
    openCases();
    return;
  }
  homeState.value = 'chat';
  showToolPicker.value = false;
  question.value = '';
  isReading.value = true;
  await new Promise((resolve) => window.setTimeout(resolve, 320));
  if (sessionId !== chatSessionId) return;
  try {
    const result = await runDivination(selectedKind.value, new Date(), currentCase.value, {
      qimenScope: settings.qimenScope,
      wuyunYear: selectedWuyunYear.value,
      huangjiYear: selectedHuangjiYear.value,
    });
    await completeDivination(selectedKind.value, result, userQuestion, true, sessionId);
  } catch (error) {
    formError.value = error instanceof Error ? error.message : '计算没有完成，请检查案例资料。';
  } finally {
    if (sessionId === chatSessionId) isReading.value = false;
  }
}

let chartRequestId = 0;

async function calculateChart(kind: ChartKind, birth: CaseProfile): Promise<ReadingResult> {
  if (kind === 'ziwei') return await runZiweiChart(birth);
  const result = await runDivination(kind, new Date(), birth);
  if (kind === 'astrolabe' && isAstrolabe(result)) {
    const { buildAstrolabeScopeContext } = await import('mingyu-core/divination/astrolabe-scope');
    return {
      ...result,
      annualScope: buildAstrolabeScopeContext(result, 'yearly', String(new Date().getFullYear())),
    } as AstrolabeChartData;
  }
  return result;
}

async function calculateCachedChart(kind: ChartKind, birth: CaseProfile) {
  const cached = getCachedChart(kind, birth);
  if (cached) return { result: cached.result, createdAt: cached.createdAt };
  const result = await calculateChart(kind, birth);
  const createdAt = Date.now();
  cacheChart(kind, birth, result, createdAt);
  return { result, createdAt };
}

function resetBaziFortuneDetailSelection() {
  const now = new Date();
  const today = formatFortuneDateKey(now);
  const monthOptions = selectedBaziMonths.value;
  const currentMonth = selectedBaziYear.value === now.getFullYear()
    ? monthOptions.find((item) => {
      const timestamp = now.getTime();
      return timestamp >= item.timeRange.startTimestamp && timestamp < item.timeRange.endTimestamp;
    })
    : null;
  selectedBaziMonth.value = currentMonth?.month ?? monthOptions[0]?.month ?? null;

  const dayOptions = selectedBaziDays.value;
  const currentDay = selectedBaziYear.value === now.getFullYear()
    ? dayOptions.find((item) => item.date === today)
    : null;
  selectedBaziDayIndex.value = currentDay?.selectionIndex ?? dayOptions[0]?.selectionIndex ?? null;

  const currentHourIndex = currentDay ? selectedBaziHours.value.findIndex((hour) => (
    now.getTime() >= hour.interval.startTimestamp && now.getTime() < hour.interval.endTimestamp
  )) : -1;
  selectedBaziHourIndex.value = currentHourIndex >= 0 ? currentHourIndex : 0;
}

function applyChartResult(kind: ChartKind, result: ReadingResult, createdAt: number) {
  chartResult.value = result;
  chartRecord.value = {
    id: `${createdAt}-chart`,
    kind,
    methodLabel: kindMeta[kind].label,
    question: `${currentCase.value.label} · ${kindMeta[kind].label}`,
    createdAt,
    result,
    context: {
      label: currentCase.value.label,
      date: currentCase.value.date,
      time: currentCase.value.time,
      locationName: currentCase.value.locationName,
    },
  };
  if (isBazi(result)) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const activeCycle = getLuckCycleForDate(result.luckInfo.cycles, now);
    const activeIndex = result.luckInfo.cycles.findIndex((cycle) => cycle === activeCycle);
    selectedBaziCycleIndex.value = activeIndex >= 0 ? activeIndex : 0;
    const activeYears = selectedBaziYears.value;
    selectedBaziYear.value = activeYears.some((item) => item.year === currentYear) ? currentYear : activeYears[0]?.year || null;
    resetBaziFortuneDetailSelection();
  }
  if (isZiwei(result)) {
    selectedZiweiScope.value = 'origin';
    if (result.payloadByScope?.origin) result.payload = result.payloadByScope.origin;
    selectedZiweiPalaceIndex.value = result.payload.palaces.find((palace) => palace.name === '命宫')?.index ?? result.payload.palaces[0]?.index ?? 0;
    void nextTick(centerZiweiChart);
  }
}

function chooseBaziCycle(index: number) {
  const result = displayResult.value;
  if (!result || !isBazi(result) || !result.luckInfo.cycles[index]) return;
  selectedBaziCycleIndex.value = index;
  const years = selectedBaziYears.value;
  const currentYear = new Date().getFullYear();
  selectedBaziYear.value = years.some((item) => item.year === currentYear) ? currentYear : years[0]?.year || null;
  resetBaziFortuneDetailSelection();
}

function chooseBaziYear(year: number) {
  selectedBaziYear.value = year;
  resetBaziFortuneDetailSelection();
}

function chooseBaziMonth(month: number) {
  selectedBaziMonth.value = month;
  const dayOptions = selectedBaziDays.value;
  const today = formatFortuneDateKey(new Date());
  const currentDay = dayOptions.find((item) => item.date === today);
  selectedBaziDayIndex.value = currentDay?.selectionIndex ?? dayOptions[0]?.selectionIndex ?? null;
  selectedBaziHourIndex.value = 0;
}

function chooseBaziDay(index: number) {
  selectedBaziDayIndex.value = index;
  selectedBaziHourIndex.value = 0;
}

function handleBaziFortuneWheel(event: WheelEvent) {
  if (!event.deltaX || Math.abs(event.deltaX) < Math.abs(event.deltaY)) return;
  const pointedElement = document.elementFromPoint(event.clientX, event.clientY);
  const strip = pointedElement?.closest<HTMLElement>('.bazi-fortune-board .luck-list, .bazi-fortune-board .liunian-list, .bazi-fortune-board .bazi-fortune-strip');
  if (!strip) return;
  const maxScrollLeft = strip.scrollWidth - strip.clientWidth;
  if (maxScrollLeft <= 0) return;
  const nextScrollLeft = Math.max(0, Math.min(maxScrollLeft, strip.scrollLeft + event.deltaX));
  if (nextScrollLeft === strip.scrollLeft) return;
  event.preventDefault();
  strip.scrollLeft = nextScrollLeft;
}

async function interpretSelectedBaziFortune(scope: 'dayun' | 'year') {
  const result = displayResult.value;
  if (!result || !isBazi(result) || isInterpreting.value) return;
  const cycle = result.luckInfo.cycles[selectedBaziCycleIndex.value];
  if (!cycle) return;
  if (scope === 'year' && !selectedBaziYear.value) return;
  const fortune: BaziFortuneRequest = scope === 'year'
    ? { scope, cycleIndex: selectedBaziCycleIndex.value, year: selectedBaziYear.value! }
    : { scope, cycleIndex: selectedBaziCycleIndex.value };
  const questionText = scope === 'year'
    ? `请解读${selectedBaziYear.value}年流年，并结合所属${cycle.ganZhi}大运说明主要变化、触发条件和现实建议。`
    : `请解读${cycle.ganZhi}大运的整体主题、阶段变化、关键领域和现实建议。`;
  await requestInterpretation(await buildAiRequest(
    'chart',
    questionText,
    'bazi',
    result,
    activeAiChannel.value,
    { baziFortune: fortune },
  ), false, chatSessionId, chartRecord.value?.id || null);
}

function chooseZiweiScope(scope: ZiweiScope) {
  const result = displayResult.value;
  if (!result || !isZiwei(result) || !result.payloadByScope?.[scope]) return;
  selectedZiweiScope.value = scope;
  result.payload = result.payloadByScope[scope];
  selectedZiweiPalaceIndex.value = result.payload.active_scope.palace_index
    ?? result.payload.palaces.find((palace) => palace.name === '命宫')?.index
    ?? result.payload.palaces[0]?.index
    ?? 0;
}

function selectZiweiPalace(index: number) {
  selectedZiweiPalaceIndex.value = index;
}

function centerZiweiChart() {
  const scroller = ziweiChartScrollRef.value;
  if (!scroller || !window.matchMedia('(max-width: 720px)').matches) return;
  scroller.scrollLeft = Math.max(0, (scroller.scrollWidth - scroller.clientWidth) / 2);
}

function astroAnnualScope(result: AstrolabeData) {
  return (result as AstrolabeChartData).annualScope || null;
}

function formatAstroAnnualDate(value?: string) {
  if (!value) return '';
  return value.replace('T', ' ').replace(/\.\d{3}Z$/, '').slice(0, 16);
}

function formatAstroAnnualAspects(values?: string[]) {
  return values?.slice(0, 2).map((item) => item.split('（')[0]).join(' · ') || '';
}

async function runChart(shouldRecord = true) {
  const requestId = ++chartRequestId;
  chartError.value = '';
  aiError.value = '';
  aiAnswer.value = '';
  if (!cases.value.length || !currentCase.value?.date || !currentCase.value?.time) {
    chartResult.value = null;
    chartRecord.value = null;
    chartLoading.value = false;
    chartError.value = '请先添加并完善案例资料。';
    return;
  }
  const kind = chartKind.value as ChartKind;
  const profile: CaseProfile = { ...currentCase.value };
  const cached = getCachedChart(kind, profile);
  if (cached) {
    applyChartResult(kind, cached.result, cached.createdAt);
    chartLoading.value = false;
    return;
  }
  chartResult.value = null;
  chartRecord.value = null;
  chartLoading.value = true;
  try {
    const result = await calculateChart(kind, profile);
    if (requestId !== chartRequestId) return;
    const createdAt = Date.now();
    cacheChart(kind, profile, result, createdAt);
    applyChartResult(kind, result, createdAt);
    if (shouldRecord && chartRecord.value) {
      history.value = [chartRecord.value, ...history.value].slice(0, HISTORY_LIMIT);
      persistHistory();
    }
    if (appPreferences.displayLevel === 'basic') {
      await requestInterpretation(
        await buildAiRequest('chart', `请用最容易理解的方式解读${currentCase.value.label}的${kindMeta[chartKind.value].label}。`, chartKind.value, result),
        true,
        chatSessionId,
        shouldRecord ? `${createdAt}-chart` : null,
      );
    }
  } catch (error) {
    chartError.value = error instanceof Error ? error.message : '排盘没有完成，请检查案例资料。';
  } finally {
    if (requestId === chartRequestId) chartLoading.value = false;
  }
}

let fortuneRequestId = 0;
let homeFortuneRequestId = 0;

function activeFortuneProfile() {
  const profile = currentCase.value;
  if (!cases.value.length || !/^\d{4}-\d{2}-\d{2}$/.test(profile.date) || !/^\d{2}:\d{2}$/.test(profile.time)) return undefined;
  const [year, month, day] = profile.date.split('-').map(Number);
  const [hour, minute] = profile.time.split(':').map(Number);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return undefined;
  return getBirthDateValidationMessage({
    year,
    month,
    day,
    dateType: profile.dateType,
    isLeapMonth: profile.dateType === 'lunar' && profile.isLeapMonth,
  }) ? undefined : profile;
}

async function refreshHomeFortunePreview() {
  const requestId = ++homeFortuneRequestId;
  const now = new Date();
  const profile = activeFortuneProfile();
  try {
    const { generateDailyFortune, getCachedDailyFortune } = await import('./lib/dailyFortune');
    const cached = getCachedDailyFortune(now, profile, 'today');
    if (cached) {
      if (requestId === homeFortuneRequestId) homeFortunePreview.value = cached;
      return;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 60));
    const result = generateDailyFortune(now, profile, 'today');
    if (requestId === homeFortuneRequestId) homeFortunePreview.value = result;
  } catch {
    if (requestId === homeFortuneRequestId) homeFortunePreview.value = null;
  }
}

async function refreshDailyFortune() {
  const requestId = ++fortuneRequestId;
  fortuneError.value = '';
  const referenceDate = parseFortuneDate(selectedFortuneDate.value);
  const profile = activeFortuneProfile();
  const period = selectedFortunePeriod.value;
  try {
    const { generateDailyFortune, getCachedDailyFortune } = await import('./lib/dailyFortune');
    const cached = getCachedDailyFortune(referenceDate, profile, period);
    if (cached) {
      if (requestId === fortuneRequestId) {
        dailyFortune.value = cached;
        if (period === 'today' && isCurrentFortuneDate.value) homeFortunePreview.value = cached;
      }
      return;
    }
    dailyFortune.value = null;
    fortuneLoading.value = true;
    await new Promise((resolve) => window.setTimeout(resolve, 80));
    const result = generateDailyFortune(referenceDate, profile, period);
    if (requestId === fortuneRequestId) {
      dailyFortune.value = result;
      if (period === 'today' && isCurrentFortuneDate.value) homeFortunePreview.value = result;
    }
  } catch (error) {
    if (requestId === fortuneRequestId) fortuneError.value = error instanceof Error ? error.message : '今日运势计算没有完成，请稍后重试。';
  } finally {
    if (requestId === fortuneRequestId) fortuneLoading.value = false;
  }
}

function refreshAlmanac() {
  almanacError.value = '';
  try {
    if (almanacMode.value === 'personal' && !activeAlmanacProfiles.value.length) throw new Error('请先选择至少一个资料完整的案例。');
    const range = getAlmanacMonthRange(almanacMonth.value);
    const result = generateLocalAlmanac({
      mode: almanacMode.value,
      topic: 'custom',
      startDate: range.startDate,
      endDate: range.endDate,
      profiles: activeAlmanacProfiles.value,
    });
    almanacResult.value = result;
    const selectedDate = selectedAlmanacDate.value;
    selectedAlmanacDate.value = result.days.some((day) => day.date === selectedDate)
      ? selectedDate
      : result.days.some((day) => day.date === almanacToday)
        ? almanacToday
        : result.days.find((day) => day.date === range.startDate)?.date || result.days[0]?.date || '';
  } catch (error) {
    almanacResult.value = null;
    selectedAlmanacDate.value = '';
    almanacError.value = error instanceof Error ? error.message : '黄历计算没有完成，请重新选择月份。';
  }
}

let almanacSearchRequestId = 0;

async function refreshAlmanacSearch() {
  const requestId = ++almanacSearchRequestId;
  almanacSearchItems.value = [];
  almanacSearchError.value = '';
  const topic = settings.almanacTopic;
  if (!topic) {
    almanacSearchLoading.value = false;
    return;
  }
  if (almanacMode.value === 'personal' && !activeAlmanacProfiles.value.length) {
    almanacSearchError.value = '请先选择至少一个资料完整的案例，再使用个人择日。';
    almanacSearchLoading.value = false;
    return;
  }
  almanacSearchLoading.value = true;
  try {
    const range = getAlmanacPeriodRange(almanacRangeMonths.value);
    const chunks = getAlmanacDateChunks(range.startDate, range.endDate);
    const items: AlmanacSearchItem[] = [];
    for (const chunk of chunks) {
      if (requestId !== almanacSearchRequestId) return;
      const result = generateLocalAlmanac({
        mode: almanacMode.value,
        topic,
        startDate: chunk.startDate,
        endDate: chunk.endDate,
        profiles: activeAlmanacProfiles.value,
      });
      for (const day of result.days) {
        items.push({
          day,
          evaluation: evaluateAlmanacPurposeDay(result, day, topic),
        });
      }
      await new Promise<void>((resolve) => window.setTimeout(resolve, 0));
    }
    if (requestId === almanacSearchRequestId) almanacSearchItems.value = items;
  } catch (error) {
    if (requestId === almanacSearchRequestId) {
      almanacSearchItems.value = [];
      almanacSearchError.value = error instanceof Error ? error.message : '筛选没有完成，请稍后重试。';
    }
  } finally {
    if (requestId === almanacSearchRequestId) almanacSearchLoading.value = false;
  }
}

function chooseFortunePeriod(period: FortunePeriod) {
  if (selectedFortunePeriod.value === period) return;
  selectedFortunePeriod.value = period;
  const referenceDate = parseFortuneDate(selectedFortuneDate.value);
  if (period === 'month') referenceDate.setDate(15);
  else if (period === 'year') {
    referenceDate.setMonth(6);
    referenceDate.setDate(1);
  }
  selectedFortuneDate.value = formatFortuneDateKey(referenceDate);
  void refreshDailyFortune();
}

function openTodayFortune() {
  goView('fortune');
}

watch([activeView, chartKind, selectedCaseId, () => currentCase.value?.date, () => currentCase.value?.dateType, () => currentCase.value?.isLeapMonth, () => currentCase.value?.time, () => currentCase.value?.timeBasis, () => currentCase.value?.regionId], ([view], [previousView]) => {
  if (view === 'charts') void runChart(false);
  if (view === 'fortune') void refreshDailyFortune();
  if (view === 'tools') void refreshHomeFortunePreview();
  if (view === 'almanac' && (previousView !== 'almanac' || almanacMode.value === 'personal')) {
    refreshAlmanac();
    if (showAlmanacSearchModal.value) void refreshAlmanacSearch();
  }
});

function historyRecordMeta(record: HistoryRecordEntry) {
  if (record.kind === 'tarot') return { icon: '牌', label: '塔罗牌' };
  if (record.kind === 'daily') return { icon: '运', label: '今日运势' };
  return kindMeta[record.kind];
}

async function openRecord(record: HistoryRecordEntry) {
  showHistory.value = false;
  if (isLegacyHistoryRecord(record)) {
    selectedLegacyHistory.value = record;
    return;
  }
  if (record.compatibility) {
    goView('compatibility');
    compatibilityHistoryRecord.value = record;
    return;
  }
  const relatedZiwei = record.relatedResults?.find((item) => item.kind === 'ziwei' && isZiwei(item.result));
  if (record.kind === 'bazi' && isBazi(record.result) && relatedZiwei && isZiwei(relatedZiwei.result)) {
    goView('tools');
    homeMode.value = 'chart';
    homeChartKind.value = 'bazi-ziwei';
    homeState.value = 'chat';
    question.value = '';
    aiAnswer.value = '';
    aiError.value = '';
    chatMessages.value = [
      { kind: 'text', role: 'user', content: record.question },
      { kind: 'reading', role: 'assistant', content: '', reading: record.result, method: 'bazi', context: record.context },
      { kind: 'reading', role: 'assistant', content: '', reading: relatedZiwei.result, method: 'ziwei', context: record.context },
      ...(record.interpretation ? [{ kind: 'text' as const, role: 'assistant' as const, content: record.interpretation }] : []),
    ];
    lastAiRequest.value = await buildCombinedChartAiRequest(record.question, record.result, relatedZiwei.result);
    lastAiHistoryRecordId.value = record.id;
    return;
  }
  if (record.kind === 'almanac' && isAlmanac(record.result)) {
    const savedAlmanac = record.result as AlmanacData;
    const savedAlmanacTopic = almanacTopicOptions.find((item) => item.label === savedAlmanac.topicLabel)?.value
      || getDefaultAlmanacPurpose(savedAlmanac.topic);
    settings.almanacTopic = savedAlmanacTopic;
    almanacMonth.value = savedAlmanac.startDate.slice(0, 7);
    almanacMode.value = savedAlmanac.participants.length ? 'personal' : 'general';
    almanacMonthFilter.value = savedAlmanac.participants.length ? savedAlmanacTopic : 'all';
    almanacResult.value = null;
    selectedAlmanacDate.value = '';
    goView('almanac', { preservePageState: true });
    return;
  }
  if (['bazi', 'ziwei', 'astrolabe', 'qizheng'].includes(record.kind)) {
    const savedKind = record.kind as ChartKind;
    goView('tools');
    homeMode.value = 'chart';
    homeChartKind.value = savedKind;
    homeState.value = 'chat';
    question.value = '';
    formError.value = '';
    currentResult.value = record.result;
    currentRecord.value = record;
    chartKind.value = savedKind;
    chartResult.value = record.result;
    chartRecord.value = record;
    aiAnswer.value = '';
    aiError.value = '';
    chatMessages.value = [
      { kind: 'text', role: 'user', content: record.question },
      { kind: 'reading', role: 'assistant', content: '', reading: record.result, method: savedKind, context: record.context },
      ...(record.interpretation ? [{ kind: 'text' as const, role: 'assistant' as const, content: record.interpretation }] : []),
    ];
    lastAiRequest.value = await buildAiRequest('chart', record.question, record.kind, record.result);
    lastAiHistoryRecordId.value = record.id;
    return;
  }
  if (record.kind === 'ssgw' && isSsgw(record.result)) {
    goView('oracle');
    selectedKind.value = 'ssgw';
    currentResult.value = record.result;
    currentRecord.value = record;
    oracleResult.value = record.result;
    aiAnswer.value = record.interpretation || '';
    aiError.value = '';
    lastAiRequest.value = await buildAiRequest('divination', record.question, record.kind, record.result);
    lastAiHistoryRecordId.value = record.id;
    return;
  }
  goView('tools');
  selectedKind.value = record.kind;
  if (record.kind === 'wuyun-liuqi') selectedWuyunYear.value = wuyunReadingYear(record.result as WuyunLiuqiResult);
  if (record.kind === 'huangji-jingshi') selectedHuangjiYear.value = huangjiReadingYear(record.result as HuangjiJingshiResult);
  currentResult.value = record.result;
  currentRecord.value = record;
  homeState.value = 'chat';
  question.value = '';
  chatMessages.value = [
    { kind: 'text', role: 'user', content: record.question },
    { kind: 'reading', role: 'assistant', content: '', reading: record.result, method: record.kind },
    ...(record.interpretation ? [{ kind: 'text' as const, role: 'assistant' as const, content: record.interpretation }] : []),
  ];
  lastAiRequest.value = await buildAiRequest(
    isChartReading(record.kind) ? 'chart' : 'divination',
    record.question,
    record.kind,
    record.result,
  );
  lastAiHistoryRecordId.value = record.id;
}

function isMeihua(result: ReadingResult): result is MeihuaData { return 'mainHexagram' in result; }
function isLiuyao(result: ReadingResult): result is LiuyaoData { return 'yaoArray' in result; }
function isSsgw(result: ReadingResult): result is SsgwData { return 'poem' in result && 'number' in result; }
function isXiaoliuren(result: ReadingResult): result is XiaoliurenData { return 'primary' in result && 'palaceOrder' in result; }
function isJinkoujue(result: ReadingResult): result is JinkoujueData { return 'positions' in result && 'mainLine' in result; }
function isQimen(result: ReadingResult): result is QimenData { return 'jiuGongGe' in result; }
function isLiuren(result: ReadingResult): result is LiurenData { return 'threeTransmissions' in result; }
function isTaiyi(result: ReadingResult): result is TaiyiResult { return 'taiyiPalace' in result && 'sixteenGods' in result; }
function isChartReading(kind: DivinationKind): kind is ChartKind { return kind === 'bazi' || kind === 'ziwei' || kind === 'astrolabe' || kind === 'qizheng'; }
function isAlmanac(result: ReadingResult): result is AlmanacData { return 'days' in result && 'topicLabel' in result; }
function isBazi(result: ReadingResult): result is BaziChartResult { return 'pillars' in result && 'dayMaster' in result; }
function isAstrolabe(result: ReadingResult): result is AstrolabeData { return 'planets' in result && 'angles' in result; }
function isZiwei(result: ReadingResult): result is ZiweiChartData { return 'payload' in result && 'palaces' in result.payload; }
function isQizheng(result: ReadingResult): result is QizhengChartData { return 'kind' in result && result.kind === 'qizheng' && 'stars' in result && 'twelvePalaces' in result; }

function formatBaziRelations(result: BaziChartResult) {
  return [
    ...result.pillarRelations.fuxin,
    ...result.pillarRelations.fanyin,
    ...result.pillarRelations.xingChong,
  ].join(' · ') || '原局未见主要伏吟、反吟及合冲刑害破';
}

function formatBaziSeasonStatus(result: BaziChartResult) {
  return ['木', '火', '土', '金', '水']
    .map((element) => result.wuxingSeasonStatus[element] ? `${element}${result.wuxingSeasonStatus[element]}` : '')
    .filter(Boolean)
    .join(' · ');
}

function baziElementClass(value: string) {
  return `is-${baziStemElements[value] || baziBranchElements[value] || baziWuxingElements[value] || 'neutral'}`;
}

function visibleBaziShensha(result: BaziChartResult, key: keyof BaziChartResult['pillars']) {
  return Array.from(new Set((result.shensha[key] || []).filter((name) => (
    commonBaziShensha.some((common) => name.includes(common))
  ))));
}

function baziShenshaLabel(name: string) {
  return baziShenshaAliases[name] || name;
}

function astroAscendant(result: AstrolabeData) {
  return result.angles.find((point) => point.name.toLowerCase().includes('asc') || point.label.includes('上升')) || result.houses.find((point) => point.house === 1);
}

function astroPolar(longitude: number, radius: number, result: AstrolabeData) {
  const ascendant = astroAscendant(result)?.longitude ?? 0;
  const angle = ((ascendant - longitude + 180) * Math.PI) / 180;
  return { x: 250 + radius * Math.cos(angle), y: 250 + radius * Math.sin(angle) };
}

function astroSignPosition(index: number, result: AstrolabeData) {
  return astroPolar(index * 30 + 15, 214, result);
}

function astroHouseMidLongitude(index: number, result: AstrolabeData) {
  const current = result.houses[index]?.longitude ?? index * 30;
  const next = result.houses[(index + 1) % result.houses.length]?.longitude ?? current + 30;
  const span = (next - current + 360) % 360 || 30;
  return (current + span / 2) % 360;
}

function astroPointSymbol(point: AstrolabePoint) {
  return astroPlanetSymbols[point.name] || astroPlanetSymbols[point.label] || astroPlanetSymbols[point.name.replace(/\s+/g, '')] || '•';
}

function astroAxisLabel(point: AstrolabePoint) {
  const key = `${point.name} ${point.label}`.toLowerCase();
  if (key.includes('asc') || point.label.includes('上升')) return 'ASC';
  if (key.includes('desc') || point.label.includes('下降')) return 'DSC';
  if (key.includes('mc') || point.label.includes('天顶')) return 'MC';
  if (key.includes('ic') || point.label.includes('天底')) return 'IC';
  return point.label;
}

function astroAngleByAxis(result: AstrolabeData, axis: 'ASC' | 'MC') {
  return result.angles.find((point) => astroAxisLabel(point) === axis);
}

function astroDegreeText(point: AstrolabePoint) {
  const formatted = point.formatted?.trim() || '';
  if (!formatted) return '';
  return formatted.replace(point.sign, '').replace(/^[\s·・,，:：-]+/, '').trim();
}

function astroPointPosition(point: AstrolabePoint, includeHouse = true) {
  const degree = astroDegreeText(point);
  const signPosition = `${point.sign}${degree ? ` ${degree}` : ''}`;
  return includeHouse && point.house ? `${signPosition} · 第${point.house}宫` : signPosition;
}

function astroPointDetail(point: AstrolabePoint, includeHouse = true) {
  const degree = astroDegreeText(point);
  return includeHouse && point.house ? `${degree} · 第${point.house}宫` : degree;
}

function astroOverviewPoints(result: AstrolabeData) {
  const entries: Array<AstroOverviewItem | null> = [
    astroPointByBody(result, 'Sun') ? { key: 'sun', label: '太阳', meaning: '核心自我', symbol: '☉', point: astroPointByBody(result, 'Sun')! } : null,
    astroPointByBody(result, 'Moon') ? { key: 'moon', label: '月亮', meaning: '情绪需求', symbol: '☽', point: astroPointByBody(result, 'Moon')! } : null,
    astroAngleByAxis(result, 'ASC') ? { key: 'asc', label: '上升', meaning: '外在表现', symbol: 'ASC', point: astroAngleByAxis(result, 'ASC')! } : null,
    astroAngleByAxis(result, 'MC') ? { key: 'mc', label: '天顶', meaning: '事业方向', symbol: 'MC', point: astroAngleByAxis(result, 'MC')! } : null,
  ];
  return entries.filter((item): item is AstroOverviewItem => Boolean(item));
}

function astroCoreFacts(result: AstrolabeData) {
  return astroOverviewPoints(result).map((item) => ({
    key: item.key,
    symbol: item.symbol,
    label: item.meaning,
    value: `${item.label} · ${item.point.sign}`,
    detail: astroPointDetail(item.point, item.key === 'sun' || item.key === 'moon'),
  }));
}

function astroSupportingPlanets(result: AstrolabeData) {
  const definitions = [
    { body: 'Mercury', meaning: '思考沟通' },
    { body: 'Venus', meaning: '关系审美' },
    { body: 'Mars', meaning: '行动方式' },
    { body: 'Jupiter', meaning: '成长方式' },
    { body: 'Saturn', meaning: '责任课题' },
  ];
  return definitions.flatMap(({ body, meaning }) => {
    const point = astroPointByBody(result, body);
    return point ? [{ point, meaning }] : [];
  });
}

function astroAspectBodyLabel(result: AstrolabeData, body: string) {
  return astroPointByBody(result, body)?.label || body;
}

function astroChartPlanets(result: AstrolabeData) {
  const allowed = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'chiron', 'northnode', 'southnode', '太阳', '月亮', '水星', '金星', '火星', '木星', '土星', '天王星', '海王星', '冥王星', '凯龙星', '北交点', '南交点'];
  return result.planets.filter((point) => allowed.includes(point.name.replace(/\s+/g, '').toLowerCase()) || allowed.includes(point.label.replace(/\s+/g, '').toLowerCase()));
}

function astroPointByBody(result: AstrolabeData, body: string) {
  const normalized = body.replace(/\s+/g, '').toLowerCase();
  return astroChartPlanets(result).find((point) => {
    const candidates = [point.name, point.label].map((value) => value.replace(/\s+/g, '').toLowerCase());
    if (candidates.includes(normalized)) return true;
    return Object.values(astroMajorBodyAliases).some((aliases) => aliases.map((value) => value.replace(/\s+/g, '').toLowerCase()).includes(normalized) && aliases.some((alias) => candidates.includes(alias.replace(/\s+/g, '').toLowerCase())));
  });
}

function astroMajorAspects(result: AstrolabeData) {
  return result.aspects.filter((aspect) => Object.prototype.hasOwnProperty.call(astroAspectColors, aspect.type) && astroPointByBody(result, aspect.body1) && astroPointByBody(result, aspect.body2)).slice(0, 16);
}

function astroAspectLine(aspect: AstrolabeAspect, result: AstrolabeData) {
  const point1 = astroPointByBody(result, aspect.body1);
  const point2 = astroPointByBody(result, aspect.body2);
  if (!point1 || !point2) return null;
  return { from: astroPolar(point1.longitude, 108, result), to: astroPolar(point2.longitude, 108, result) };
}

function astroAspectColor(type: string) { return astroAspectColors[type] || '#a58fb7'; }
function astroAspectDash(type: string) { return type === '六合' || type === '刑相' ? '4 4' : undefined; }
function astroPlanetRadius(index: number) { return 168 + (index % 3) * 17; }

function ziweiGridStyle(index: number) {
  const slots = [0, 1, 2, 3, 7, 11, 15, 14, 13, 12, 8, 4];
  const slot = slots[index] ?? index;
  return { gridColumn: String((slot % 4) + 1), gridRow: String(Math.floor(slot / 4) + 1) };
}

function ziweiPalaceCenter(index: number) {
  const slots = [0, 1, 2, 3, 7, 11, 15, 14, 13, 12, 8, 4];
  const slot = slots[index] ?? index;
  return { x: ((slot % 4) + 0.5) * 25, y: (Math.floor(slot / 4) + 0.5) * 25 };
}

function ziweiSanfangIndexes(result: ZiweiChartData) {
  const palaces = result.payload.palaces;
  const target = palaces.find((palace) => palace.index === selectedZiweiPalaceIndex.value)
    || palaces.find((palace) => palace.is_original_palace)
    || palaces[0];
  if (!target) return { triangle: [], opposite: null as number | null };
  const availableIndexes = new Set(palaces.map((palace) => palace.index));
  const surrounding = (target.surrounded_palace_indexes || []).filter((index) => index !== target.opposite_palace_index && availableIndexes.has(index));
  const fallback = [target.index + 4, target.index + 8].map((index) => index % 12).filter((index) => availableIndexes.has(index));
  const triangle = [target.index, ...(surrounding.length >= 2 ? surrounding : fallback)].filter((index, position, indexes) => indexes.indexOf(index) === position).slice(0, 3);
  return { triangle, opposite: availableIndexes.has(target.opposite_palace_index) ? target.opposite_palace_index : null };
}

function ziweiSanfangPoints(result: ZiweiChartData) {
  return ziweiSanfangIndexes(result).triangle.map((index) => ziweiPalaceCenter(index));
}

function ziweiOppositeLine(result: ZiweiChartData) {
  const relation = ziweiSanfangIndexes(result);
  if (relation.triangle.length === 0 || relation.opposite === null) return null;
  return { from: ziweiPalaceCenter(relation.triangle[0]), to: ziweiPalaceCenter(relation.opposite) };
}
</script>

<template>
  <div class="app-shell" :class="{ 'mobile-nav-open': showMobileNav }">
    <aside class="sidebar" :class="{ 'mobile-sidebar-open': showMobileNav }">
      <div class="sidebar-header"><button class="brand" type="button" @click="goView('tools')"><img class="brand-mark" src="/logo.webp" alt="" aria-hidden="true" /><span><strong>时月东方</strong><small>东方术数</small></span></button><button class="mobile-sidebar-close" type="button" aria-label="关闭导航" @click="showMobileNav = false"><X :size="18" /></button></div>
      <nav class="main-nav main-nav-primary" aria-label="主要功能">
        <button v-for="item in primaryNavItems" :key="item.key" type="button" :title="item.label" :class="{ active: activeView === item.key }" @click="goView(item.key)"><component :is="item.icon" :size="17" /><span>{{ item.label }}</span><ChevronRight v-if="activeView === item.key" :size="14" class="nav-arrow" /></button>
      </nav>
      <nav class="main-nav main-nav-secondary" aria-label="个人与设置">
        <button v-for="item in secondaryNavItems" :key="item.key" type="button" :title="item.label" :class="{ active: activeView === item.key }" @click="goView(item.key)"><component :is="item.icon" :size="17" /><span>{{ item.label }}</span><ChevronRight v-if="activeView === item.key" :size="14" class="nav-arrow" /></button>
      </nav>
    </aside>
    <button v-if="showMobileNav" class="mobile-nav-scrim" type="button" aria-label="关闭导航" @click="showMobileNav = false"></button>

    <div class="app-main">
      <header class="topbar" :class="{ 'is-page': activeView !== 'tools' }">
        <button v-if="activeView === 'tools' && homeState === 'chat'" class="topbar-back" type="button" @click="leaveChat"><ArrowLeft :size="17" /><span>返回</span></button>
        <button v-else class="mobile-nav-toggle" type="button" aria-label="打开导航" @click="showMobileNav = true"><Menu :size="19" /></button>
        <div v-if="activeView === 'tools'" ref="topbarAiPickerRef" class="topbar-ai-picker">
          <button type="button" class="topbar-ai-trigger" :aria-expanded="showAiPicker" aria-label="调整解答风格和 AI 模型" :title="`${activeAnswerPreference.label} · ${activeAiChannel.name} · ${activeAiModelLabel}`" @click="toggleAiPicker">
            <span class="topbar-ai-trigger-copy"><strong>{{ activeAnswerPreference.label }}</strong><small>{{ activeAiModelLabel }}</small></span>
            <ChevronDown :size="13" />
          </button>
          <div v-if="showAiPicker" class="topbar-ai-menu">
            <section class="topbar-answer-section">
              <div class="topbar-ai-menu-heading"><strong>解答偏好</strong><small>切换表达与推演方式</small></div>
              <div class="topbar-answer-options">
                <button v-for="item in answerPreferenceOptions" :key="item.value" type="button" :class="{ active: appPreferences.answerPreference === item.value }" @click="chooseAnswerPreference(item.value)">
                  <span><strong>{{ item.label }}</strong><small>{{ item.summary }}</small></span>
                  <Check v-if="appPreferences.answerPreference === item.value" :size="13" />
                </button>
              </div>
            </section>
            <section class="topbar-model-section">
              <div class="topbar-ai-menu-heading"><strong>AI 模型</strong><small>{{ activeAiChannel.name }}</small></div>
              <div class="topbar-model-controls">
                <select v-if="configuredAiChannels.length > 1" :value="appPreferences.activeAiChannelId" aria-label="选择 AI 渠道" @change="handleTopbarAiChannelChange"><option v-for="channel in configuredAiChannels" :key="channel.id" :value="channel.id">{{ channel.name }}</option></select>
                <span v-else class="topbar-environment-model">{{ activeAiChannel.name }}</span>
                <select v-if="activeAiChannel.provider !== 'builtin'" v-model="selectedAiModel" aria-label="选择 AI 模型"><option v-for="model in activeAiModelOptions" :key="model" :value="model">{{ model }}</option></select>
              </div>
            </section>
            <UiButton class="topbar-ai-settings" variant="secondary" size="small" block @click="openSettingsSection('ai')"><Sparkles :size="13" />管理 AI 配置</UiButton>
          </div>
        </div>
        <h1 v-else class="topbar-page-title">{{ activePageTitle }}</h1>
        <div class="topbar-actions">
          <div ref="topbarCasePickerRef" class="topbar-case-picker">
            <button class="case-trigger" type="button" :aria-expanded="showCaseSwitcher" aria-haspopup="menu" :aria-label="cases.length ? `快速切换案例，当前为${currentCase.label}` : '添加案例'" :title="cases.length ? `当前案例：${currentCase.label}` : '添加案例'" @click="toggleCaseSwitcher"><UserRound :size="16" /><span>{{ cases.length ? currentCase.label : '添加案例' }}</span><ChevronDown :size="13" /></button>
            <div v-if="showCaseSwitcher" class="case-switcher-menu" role="menu">
              <div class="case-switcher-heading"><strong>快速切换</strong><small v-if="cases.length">当前使用：{{ currentCase.label }}</small><small v-else>还没有可用案例</small></div>
              <label v-if="cases.length > 6" class="case-switcher-search"><Search :size="14" /><input v-model="caseSwitcherSearch" type="search" autocomplete="off" placeholder="搜索案例" aria-label="搜索可切换案例" /></label>
              <div v-if="cases.length" class="case-switcher-list">
                <button v-for="profile in filteredCaseSwitcherCases" :key="profile.id" type="button" role="menuitemradio" :aria-checked="currentCase.id === profile.id" :class="{ active: currentCase.id === profile.id }" @click="selectCase(profile.id)"><span class="case-switcher-avatar">{{ profile.label.slice(0, 1) }}</span><span><strong>{{ profile.label }}</strong><small>{{ formatCaseDate(profile) }} · {{ profile.time || '时间待补充' }}</small></span><Check v-if="currentCase.id === profile.id" :size="15" /></button>
                <p v-if="!filteredCaseSwitcherCases.length" class="case-switcher-empty">没有找到案例</p>
              </div>
              <button type="button" class="case-switcher-manage" @click="openCasesSection(cases.length ? 'records' : 'input')"><BookOpen :size="14" />{{ cases.length ? '管理案例' : '添加案例' }}<ChevronRight :size="14" /></button>
            </div>
          </div>
          <button class="history-trigger" type="button" aria-label="记录" title="记录" @click="openHistory"><History :size="16" /><span>记录</span></button>
        </div>
      </header>

      <button v-if="activeView === 'tools' && homeState === 'default'" class="mobile-home-fortune-strip" type="button" aria-label="查看今日运势" @click="openTodayFortune">
        <span class="mobile-home-fortune-mark"><Sun :size="15" /></span>
        <span class="mobile-home-fortune-copy"><small>今日运势</small><strong>{{ homeFortunePreview?.previewText || '正在准备今天的本地参考' }}</strong></span>
        <span v-if="homeFortunePreview" class="mobile-home-fortune-color" :style="{ backgroundColor: homeFortunePreview.reference.colors[0].hex }" :title="homeFortunePreview.reference.colors[0].name"></span>
        <ChevronRight :size="15" />
      </button>

      <main ref="contentRef" class="content">
        <UiPageShell v-if="activeView === 'tools'" width="reading" class="screen tools-screen" :class="{ 'is-chat': homeState === 'chat' }">
          <template v-if="homeState === 'default'">
            <section class="home-default">
              <div class="default-hero"><img class="default-mark" src="/logo.webp" alt="时月东方" /><h1><span>探索未来</span><span class="hero-multicolor">解读术数</span></h1><a class="merit-box-button" href="https://lk.sydf.cc/" target="_blank" rel="noopener noreferrer"><Heart :size="14" />功德箱</a></div>
              <div class="chat-composer chat-composer-docked home-default-composer">
                <div v-if="appPreferences.displayLevel !== 'basic' && homeMode === 'divination' && selectedKind === 'qimen'" class="setting-row"><span>局</span><button v-for="item in [{ value: 'hour', label: '时家' }, { value: 'day', label: '日家' }, { value: 'month', label: '月家' }, { value: 'year', label: '年家' }]" :key="item.value" type="button" :class="{ active: settings.qimenScope === item.value }" @click="chooseQimenScope(item.value as typeof settings.qimenScope)">{{ item.label }}</button></div>
                <label v-if="appPreferences.displayLevel !== 'basic' && homeMode === 'divination' && selectedKind === 'wuyun-liuqi'" class="setting-row wuyun-year-row"><span>公历年份</span><input class="wuyun-year-input" type="number" min="1900" max="2199" step="1" :value="selectedWuyunYear" aria-label="五运六气公历年份" @input="updateWuyunYear" /></label>
                <label v-if="appPreferences.displayLevel !== 'basic' && homeMode === 'divination' && selectedKind === 'huangji-jingshi'" class="setting-row wuyun-year-row"><span>公历年份</span><input class="wuyun-year-input" type="number" min="1900" max="2199" step="1" :value="selectedHuangjiYear" aria-label="皇极经世公历年份" @input="updateHuangjiYear" /></label>
                <textarea v-auto-resize class="composer-textarea" v-model="question" maxlength="10000" :placeholder="appPreferences.displayLevel === 'basic' ? '写下问题，或从问题灵感开始' : homeMode === 'chart' ? '写下想重点了解的方向' : `写下问题，交给${selectedMeta.label}`" @input="clearInspirationPrompt" @keydown.enter.exact.prevent="submitHomePrompt"></textarea>
                <small class="composer-shortcut-hint">Enter 发送 · Shift + Enter 换行</small>
                <div class="composer-toolbar"><div class="composer-tools"><div v-if="appPreferences.displayLevel !== 'basic'" ref="toolPickerRef" class="tool-picker"><button type="button" class="tool-picker-button" :aria-expanded="showToolPicker" aria-label="选择工具" @click="showToolPicker = !showToolPicker"><Plus :size="14" /><span>{{ homeModeLabel }}</span><ChevronDown :size="13" /></button><div v-if="showToolPicker" class="tool-picker-panel" role="dialog" aria-label="选择工具"><div class="tool-panel-title"><strong>选择工具</strong><button type="button" aria-label="关闭工具面板" @click="showToolPicker = false"><X :size="15" /></button></div><section class="tool-panel-section"><div class="tool-panel-section-head"><strong>占卜</strong><small>选择后开始</small></div><div class="tool-panel-grid"><button v-for="kind in visibleDivinationKinds" :key="kind" type="button" class="tool-panel-item" @click="chooseTool(kind)"><span class="tool-panel-icon">{{ kindMeta[kind].icon }}</span><span><strong>{{ kindMeta[kind].label }}</strong><small>{{ kindMeta[kind].eyebrow }}</small></span></button></div></section><section class="tool-panel-section"><div class="tool-panel-section-head"><strong>排盘</strong><small>读取当前案例</small></div><div class="tool-panel-grid chart-tools"><button v-for="item in homeChartOptions" :key="item.kind" type="button" class="tool-panel-item" @click="chooseHomeChart(item.kind)"><span class="tool-panel-icon">{{ item.icon }}</span><span><strong>{{ item.label }}</strong><small>{{ cases.length ? currentCase.label : '当前案例' }}</small></span></button></div></section></div></div><button type="button" class="ask-library-button" @click="openInspirationModal"><MessageCircle :size="14" />问题灵感</button></div><button class="chat-send-button" type="button" :disabled="isReading || isInterpreting || chartLoading" aria-label="发送" @click="submitHomePrompt"><LoaderCircle v-if="isReading || isInterpreting || chartLoading" class="spin" :size="17" /><ArrowUp v-else :size="18" :stroke-width="2.4" /></button></div>
                <p v-if="formError" class="form-error">{{ formError }}</p>
              </div>
            </section>
          </template>

          <template v-else>
            <div ref="chatConversationRef" class="chat-conversation" aria-live="polite">
              <div v-if="!chatMessages.length" class="chat-empty"><img class="chat-empty-icon" src="/logo.webp" alt="" aria-hidden="true" /><strong>{{ appPreferences.displayLevel === 'basic' ? '写下你想问的事' : homeMode === 'divination' ? `把问题交给${selectedMeta.label}` : `载入${homeChartMeta.label}` }}</strong><small>{{ appPreferences.displayLevel === 'basic' ? '系统会根据问题自动选择合适的方式。' : homeMode === 'divination' ? '选择参数或完成起卦，再点击发送。' : '确认案例资料后，点击发送生成排盘。' }}</small><UiButton variant="ghost" size="small" @click="openInspirationModal"><MessageCircle :size="14" />问题灵感</UiButton></div>
              <template v-for="(message, index) in chatMessages" :key="`${message.kind}-${message.role}-${index}`">
                <div v-if="message.kind === 'reading'" class="chat-reading-message is-user"><button type="button" class="reading-bubble" @click="openReadingModal(message)"><span class="reading-bubble-icon">{{ kindMeta[message.method].icon }}</span><span class="reading-bubble-copy"><strong>{{ kindMeta[message.method].label }}</strong><small>{{ readingDisplayTitle(message) }} · 点击查看详情</small></span><ChevronRight :size="14" /></button></div>
                <div v-else-if="message.kind === 'text'" class="chat-message" :class="`is-${message.role}`">
                  <span>{{ message.role === 'user' ? '你' : '时月东方' }}</span>
                  <p v-if="message.role === 'user'">{{ message.content }}</p>
                  <template v-else><ChatMarkdown :content="message.content" /><AiReadingActions :content="message.content" title="时月东方解读" /></template>
                </div>
              </template>
              <div v-if="isInterpreting" class="chat-message is-assistant"><span>时月东方</span><p class="ai-typing">正在观象……</p></div>
              <div v-if="aiError" class="chat-message is-assistant"><span>时月东方</span><p class="ai-error">{{ aiError }}</p><AiPromptFallback v-if="lastAiRequest" :request="lastAiRequest" @retry="retryLastInterpretation" /></div>
            </div>

            <div class="chat-composer chat-composer-docked">
              <div v-if="appPreferences.displayLevel !== 'basic' && homeMode === 'divination' && selectedKind === 'qimen'" class="setting-row"><span>局</span><button v-for="item in [{ value: 'hour', label: '时家' }, { value: 'day', label: '日家' }, { value: 'month', label: '月家' }, { value: 'year', label: '年家' }]" :key="item.value" type="button" :class="{ active: settings.qimenScope === item.value }" @click="chooseQimenScope(item.value as typeof settings.qimenScope)">{{ item.label }}</button></div>
              <label v-if="appPreferences.displayLevel !== 'basic' && homeMode === 'divination' && selectedKind === 'wuyun-liuqi'" class="setting-row wuyun-year-row"><span>公历年份</span><input class="wuyun-year-input" type="number" min="1900" max="2199" step="1" :value="selectedWuyunYear" aria-label="五运六气公历年份" @input="updateWuyunYear" /></label>
              <label v-if="appPreferences.displayLevel !== 'basic' && homeMode === 'divination' && selectedKind === 'huangji-jingshi'" class="setting-row wuyun-year-row"><span>公历年份</span><input class="wuyun-year-input" type="number" min="1900" max="2199" step="1" :value="selectedHuangjiYear" aria-label="皇极经世公历年份" @input="updateHuangjiYear" /></label>
              <textarea v-auto-resize class="composer-textarea" v-model="question" maxlength="10000" aria-label="继续对话" placeholder="继续追问这次结果" @input="clearInspirationPrompt" @keydown.enter.exact.prevent="beginReading"></textarea>
              <small class="composer-shortcut-hint">Enter 发送 · Shift + Enter 换行</small>
               <div class="composer-toolbar"><div class="composer-tools"><div v-if="appPreferences.displayLevel !== 'basic'" ref="toolPickerRef" class="tool-picker"><button type="button" class="tool-picker-button" :aria-expanded="showToolPicker" aria-label="选择工具" @click="showToolPicker = !showToolPicker"><Plus :size="14" /><span>{{ homeModeLabel }}</span><ChevronDown :size="13" /></button><div v-if="showToolPicker" class="tool-picker-panel" role="dialog" aria-label="选择工具"><div class="tool-panel-title"><strong>选择工具</strong><button type="button" aria-label="关闭工具面板" @click="showToolPicker = false"><X :size="15" /></button></div><section class="tool-panel-section"><div class="tool-panel-section-head"><strong>占卜</strong><small>选定后配置</small></div><div class="tool-panel-grid"><button v-for="kind in visibleDivinationKinds" :key="kind" type="button" class="tool-panel-item" @click="chooseTool(kind)"><span class="tool-panel-icon">{{ kindMeta[kind].icon }}</span><span><strong>{{ kindMeta[kind].label }}</strong><small>{{ kindMeta[kind].eyebrow }}</small></span></button></div></section><section class="tool-panel-section"><div class="tool-panel-section-head"><strong>排盘</strong><small>读取当前案例</small></div><div class="tool-panel-grid chart-tools"><button v-for="item in homeChartOptions" :key="item.kind" type="button" class="tool-panel-item" @click="chooseHomeChart(item.kind)"><span class="tool-panel-icon">{{ item.icon }}</span><span><strong>{{ item.label }}</strong><small>{{ cases.length ? currentCase.label : '当前案例' }}</small></span></button></div></section></div></div><button type="button" class="ask-library-button" @click="openInspirationModal"><MessageCircle :size="14" />问题灵感</button></div><button class="chat-send-button" type="button" :disabled="isReading || isInterpreting || chartLoading" aria-label="发送" @click="beginReading"><LoaderCircle v-if="isReading || isInterpreting || chartLoading" class="spin" :size="17" /><ArrowUp v-else :size="18" :stroke-width="2.4" /></button></div>
              <p v-if="formError" class="form-error">{{ formError }}</p>
            </div>
          </template>
          <p class="home-ai-disclaimer" :class="{ 'is-chat': homeState === 'chat' }">生成内容完全基于 AI 模型的胡言乱语，不构成任何形式建议</p>
        </UiPageShell>

        <UiToolPage v-else-if="activeView === 'almanac'" width="standard" class="screen almanac-screen" toolbar-label="黄历日期与类型" toolbar-class="almanac-immersive-header">
            <template #toolbar-primary>
              <UiDateNavigator
                class="almanac-month-navigator"
                :label="almanacMonthLabel"
                variant="plain"
                previous-label="查看上个月"
                next-label="查看下个月"
                @previous="changeAlmanacMonth(-1)"
                @next="changeAlmanacMonth(1)"
              >
                <template #trigger>
                  <label class="almanac-month-picker"><span>{{ almanacMonthLabel }}</span><input v-model="almanacMonth" type="month" min="1900-01" max="2100-12" aria-label="选择月份" @change="updateAlmanacMonthFromPicker" /></label>
                </template>
              </UiDateNavigator>
            </template>
            <template #toolbar-secondary>
              <div class="almanac-toolbar-secondary">
                <div class="almanac-immersive-topline">
                  <UiSegmentedControl class="almanac-mode-tabs ui-tool-tabs" :model-value="almanacMode" :items="almanacModeTabs" label="黄历类型" compact @update:model-value="chooseAlmanacMode($event as AlmanacMode)" />
                </div>
                <div class="almanac-header-actions">
                  <CaseMultiSelect
                    v-if="almanacMode === 'personal'"
                    :cases="selectableCaseProfiles"
                    :model-value="almanacCaseIds"
                    :required-ids="activeGlobalCaseId ? [activeGlobalCaseId] : []"
                    label="参与案例"
                    title="选择择日参与人"
                    compact
                    @update:model-value="updateAlmanacCaseIds"
                    @manage="openCases"
                  />
                  <button type="button" class="almanac-pick-button" aria-haspopup="dialog" aria-label="打开择日" @click="openAlmanacSearch">择</button>
                  <button type="button" class="almanac-today-button" aria-label="回到今天" @click="showCurrentAlmanacMonth">今</button>
                </div>
              </div>
            </template>

          <UiWorkspaceSurface as="article" class="almanac-immersive-card">

          <section ref="almanacCalendarPanel" class="almanac-calendar-panel">
            <UiNotice v-if="almanacError" class="almanac-error-row" tone="error" compact>
              {{ almanacError }}
              <template v-if="almanacMode === 'personal' && !activeAlmanacProfile" #action><UiButton variant="secondary" size="small" @click="openCases">前往案例页 <ChevronRight :size="13" /></UiButton></template>
            </UiNotice>

            <div v-if="almanacResult && almanacMode === 'personal'" class="almanac-calendar-legend">
              <label class="almanac-month-filter">
                <span>当月</span>
                <select v-model="almanacMonthFilter" aria-label="筛选当月择日事项">
                  <option value="all">择日</option>
                  <optgroup v-for="group in almanacTopicGroups" :key="group.label" :label="group.label">
                    <option v-for="item in group.options" :key="item.value" :value="item.value">{{ item.label }}</option>
                  </optgroup>
                </select>
              </label>
              <template v-if="hasAlmanacMonthFilter">
                <span class="is-excellent"><i></i>大吉 {{ almanacLevelCounts.大吉 }}</span>
                <span class="is-auspicious"><i></i>吉 {{ almanacLevelCounts.吉 }}</span>
                <span class="is-small-auspicious"><i></i>小吉 {{ almanacLevelCounts.小吉 }}</span>
                <span class="is-neutral"><i></i>平 {{ almanacLevelCounts.平 }}</span>
                <span class="is-caution"><i></i>慎用 {{ almanacLevelCounts.慎用 }}</span>
                <span class="is-inauspicious"><i></i>不宜 {{ almanacLevelCounts.不宜 }}</span>
              </template>
            </div>
            <div class="almanac-week-row" aria-hidden="true"><span v-for="(weekday, index) in almanacWeekdays" :key="weekday" :class="{ weekend: index === 0 || index === 6 }">{{ weekday }}</span></div>
            <div class="almanac-calendar-grid" role="grid" :aria-label="`${almanacMonthLabel}黄历`">
              <button
                v-for="cell in almanacCalendarCells"
                :key="cell.key"
                type="button"
                role="gridcell"
                class="almanac-calendar-cell"
                :class="[
                  { active: selectedAlmanacDay?.date === cell.date, 'is-today': cell.date === almanacToday, 'is-outside': !cell.isCurrentMonth, weekend: cell.weekdayIndex === 0 || cell.weekdayIndex === 6, 'has-personal-details': almanacMode === 'personal' && Boolean(cell.day) },
                  cell.day && hasAlmanacMonthFilter ? almanacLevelClass(almanacDayLevel(cell.day)) : '',
                ]"
                :disabled="!cell.isNavigable"
                :aria-selected="selectedAlmanacDay?.date === cell.date"
                :aria-label="`${cell.date} 星期${almanacWeekdays[cell.weekdayIndex]} 农历${cell.lunarLabel}${cell.eventLabel ? ` ${cell.eventLabel}` : ''}${cell.day && hasAlmanacMonthFilter ? ` ${almanacDayLevel(cell.day)}` : ''}`"
                @click="selectAlmanacCalendarCell(cell)"
              >
                <span class="almanac-cell-solar"><strong>{{ cell.dayNumber }}</strong><em v-if="cell.date === almanacToday">今</em></span>
                <small class="almanac-cell-label" :class="cell.eventType ? `is-${cell.eventType}` : ''">
                  <span class="almanac-cell-label-text">{{ cell.eventLabel || almanacLunarDayLabel(cell.lunarLabel) }}</span>
                  <span v-if="cell.day && hasAlmanacMonthFilter" class="almanac-cell-level">{{ almanacLevelShort(almanacDayLevel(cell.day)) }}</span>
                </small>
              </button>
            </div>
          </section>

          <template v-if="almanacResult && selectedAlmanacDay">
            <section class="almanac-detail-panel">
              <div class="almanac-day-hero">
                <div class="almanac-day-title">
                  <h2>{{ almanacDateTitle(selectedAlmanacDay.date) }}</h2>
                  <p>{{ selectedAlmanacDay.weekday }} · 农历{{ almanacLunarLabel(selectedAlmanacDay.lunarDate) }} · {{ selectedAlmanacDay.dayOfficer }}日 · {{ almanacDayRhythm(selectedAlmanacDay) }}</p>
                  <span v-if="selectedAlmanacCalendarMeta?.eventLabel" class="almanac-day-event" :class="selectedAlmanacCalendarMeta.eventType ? `is-${selectedAlmanacCalendarMeta.eventType}` : ''">{{ selectedAlmanacCalendarMeta.eventLabel }}</span>
                </div>
                <b v-if="hasAlmanacMonthFilter" class="almanac-status-pill" :class="almanacLevelClass(almanacDayLevel(selectedAlmanacDay))">{{ almanacDayLevel(selectedAlmanacDay) }}</b>
              </div>

              <div v-if="selectedModernAlmanac" class="almanac-advice-grid is-modern">
                <section><div class="almanac-advice-title is-good"><b>宜</b><small>可以安排</small></div><div class="almanac-modern-advice-list"><article v-for="item in selectedModernAlmanac.recommended" :key="item.key"><strong>{{ item.title }}</strong><p>{{ item.detail }}</p></article><p v-if="!selectedModernAlmanac.recommended.length" class="almanac-empty-copy">没有需要特别优先的事项，按平常计划即可。</p></div></section>
                <section><div class="almanac-advice-title is-bad"><b>慎</b><small>多做确认</small></div><div class="almanac-modern-advice-list"><article v-for="item in selectedModernAlmanac.cautious" :key="item.key"><strong>{{ item.title }}</strong><p>{{ item.detail }}</p></article><p v-if="!selectedModernAlmanac.cautious.length" class="almanac-empty-copy">没有需要特别避开的事项，重要细节照常核对即可。</p></div></section>
              </div>

              <section v-if="almanacMode === 'personal' && almanacPersonalNotes(selectedAlmanacDay).length" class="almanac-personal-detail">
                <div class="almanac-subheading"><h3>个人历提示</h3></div>
                <div class="almanac-note-list"><p v-for="note in almanacPersonalNotes(selectedAlmanacDay)" :key="note"><UserRound :size="13" />{{ note }}</p></div>
              </section>

              <section class="almanac-secondary">
                <header class="almanac-secondary-heading"><strong>当天优先时段</strong></header>
                <div class="almanac-secondary-body">
                  <section class="almanac-hours-section">
                    <div v-if="selectedModernAlmanacHours.length" class="almanac-hour-list"><article v-for="hour in selectedModernAlmanacHours" :key="hour.traditional + hour.range"><span><strong>{{ hour.name }}</strong><small>{{ hour.range }}</small></span><b>{{ hour.title }}</b><p>{{ hour.detail }}</p><em v-if="hour.personalNote">{{ hour.personalNote }}</em><small v-if="appPreferences.displayLevel === 'master'" class="almanac-hour-traditional">{{ hour.traditional }}</small></article></div>
                    <p v-else class="almanac-empty-copy">没有需要特别优先的时间，按自己的作息安排即可。</p>
                  </section>
                  <div v-if="selectedModernAlmanac" class="almanac-fact-grid is-compact">
                    <div><small>日子节奏</small><strong>{{ selectedModernAlmanac.rhythm.title }}</strong><span class="almanac-fact-explanation">{{ selectedModernAlmanac.rhythm.detail }}</span></div>
                    <div v-if="appPreferences.displayLevel === 'master'"><small>传统依据</small><strong>{{ selectedAlmanacDay.dayOfficer }}日 · {{ selectedAlmanacDay.twelveStar }}</strong></div>
                    <div><small>出行提醒</small><strong>{{ almanacClashGuidance.title }}</strong><span class="almanac-fact-explanation">{{ almanacClashGuidance.detail }}</span></div>
                  </div>
                </div>
              </section>

            </section>
          </template>

          </UiWorkspaceSurface>
        </UiToolPage>

        <FengShuiView
          v-else-if="activeView === 'fengshui'"
          :preferences="{ answerPreference: appPreferences.answerPreference, displayLevel: appPreferences.displayLevel }"
          :ai-config="activeAiRequestConfig"
          :cases="selectableCaseProfiles"
          :selected-case-ids="fengShuiCaseIds"
          :global-case-id="activeGlobalCaseId"
          @update:selected-case-ids="updateFengShuiCaseIds"
          @manage-cases="openCases"
        />

        <OracleView
          v-else-if="activeView === 'oracle'"
          class="ui-page ui-page--reading"
          :result="oracleResult"
          :initial-question="oracleInitialQuestion"
          :ai-answer="aiAnswer"
          :ai-error="aiError"
          :ai-request="lastAiRequest"
          :interpreting="isInterpreting"
          @complete="completeOracleReading"
          @retry-interpretation="retryLastInterpretation"
        />

        <XiaoliurenView v-else-if="activeView === 'xiaoliuren'" />

        <DailyHexagramView v-else-if="activeView === 'daily-hexagram'" />

        <UiToolPage v-else-if="activeView === 'fortune'" width="standard" class="screen fortune-screen" toolbar-label="运势日期与周期" toolbar-class="fortune-toolbar">
            <template #toolbar-primary>
              <UiDateNavigator
                :label="selectedFortuneDateLabel"
                :previous-label="`查看前${selectedFortunePeriod === 'today' ? '一天' : selectedFortunePeriod === 'month' ? '一月' : '一年'}`"
                :next-label="`查看后${selectedFortunePeriod === 'today' ? '一天' : selectedFortunePeriod === 'month' ? '一月' : '一年'}`"
                :reset-label="!isCurrentFortuneDate ? selectedFortunePeriod === 'today' ? '今天' : selectedFortunePeriod === 'month' ? '本月' : '今年' : ''"
                select-label="选择运势日期"
                @previous="shiftFortuneDate(-1)"
                @next="shiftFortuneDate(1)"
                @select="openFortuneDatePicker"
                @reset="resetFortuneDate"
              />
            </template>
            <template #toolbar-secondary>
              <UiSegmentedControl class="fortune-period-tabs ui-tool-tabs" :model-value="selectedFortunePeriod" :items="fortunePeriodTabs" label="运势周期" compact @update:model-value="chooseFortunePeriod($event as FortunePeriod)" />
            </template>

          <UiNotice v-if="fortuneError" class="fortune-notice" tone="error" compact>{{ fortuneError }}</UiNotice>
          <FortuneSkeleton v-if="fortuneLoading && !dailyFortune" :period="selectedFortunePeriod" />

          <FortuneResultView
            v-else-if="dailyFortune"
            :result="dailyFortune"
            :calendar="fortuneCalendarParts"
            :current-date="isCurrentFortuneDate"
          />
        </UiToolPage>

        <template v-else-if="activeView === 'charts'">
          <UiPageShell v-if="!cases.length" width="standard" class="screen charts-screen">
            <UiWorkspaceSurface padding="standard">
              <UiEmptyState title="需要一份案例" description="请先在案例中保存出生资料。" compact>
                <template #icon><UserRound :size="24" /></template>
                <template #action><UiButton @click="openCases"><BookOpen :size="15" />前往案例</UiButton></template>
              </UiEmptyState>
            </UiWorkspaceSurface>
          </UiPageShell>

          <UiToolPage v-else width="wide" class="screen charts-screen" toolbar-label="排盘类型" toolbar-class="chart-toolbar">
            <template #toolbar-primary>
              <UiSegmentedControl class="chart-mode-tabs ui-tool-tabs" :model-value="chartKind" :items="chartKindTabs" label="排盘类型" compact @update:model-value="chooseChart($event as ChartKind)" />
            </template>
            <template v-if="chartKind === 'bazi'" #toolbar-secondary>
              <div ref="baziColumnSettingsRef" class="chart-column-settings">
                <button type="button" class="chart-column-settings-trigger" :class="{ active: showBaziColumnSettings }" :aria-expanded="showBaziColumnSettings" aria-haspopup="menu" aria-label="设置传统盘显示栏目" title="设置传统盘显示栏目" @click.stop="showBaziColumnSettings = !showBaziColumnSettings"><Settings :size="16" /></button>
                <div v-if="showBaziColumnSettings" class="chart-column-settings-menu" role="menu" aria-label="传统盘显示栏目">
                  <strong>显示栏目</strong>
                  <button v-for="item in baziFortuneColumnOptions" :key="item.key" type="button" role="menuitemcheckbox" :aria-checked="baziFortuneColumnVisibility[item.key]" @click="toggleBaziFortuneColumn(item.key)"><span>{{ item.label }}</span><Check v-if="baziFortuneColumnVisibility[item.key]" :size="15" /></button>
                </div>
              </div>
            </template>
            <UiNotice v-if="chartError" class="chart-notice" tone="error" compact>{{ chartError }}</UiNotice>
            <UiEmptyState v-if="!chartResult && chartLoading" class="chart-empty" title="正在生成传统盘面" description="请稍候" busy compact><template #icon><Moon :size="22" /></template></UiEmptyState>
          </UiToolPage>
        </template>

        <CompatibilityView
          v-else-if="activeView === 'compatibility'"
          :cases="cases"
          :active-case-id="currentCase.id"
          :preferences="{ answerPreference: appPreferences.answerPreference, displayLevel: appPreferences.displayLevel }"
          :ai-config="activeAiRequestConfig"
          :history-record="compatibilityHistoryRecord"
          :request-background-interpretation="requestCompatibilityInterpretation"
          :save-history-record="addCompatibilityHistoryRecord"
          @manage-cases="openCases"
          @busy-change="compatibilityBusy = $event"
          @view-case="openCompatibilityCaseChart"
        />

        <UiPageShell v-else-if="activeView === 'cases'" width="standard" class="screen cases-screen">
          <UiSegmentedControl as="nav" class="ui-subpage-tabs" :model-value="activeCasesSection" :items="casesSectionTabs" label="案例分类" variant="underline" @update:model-value="openCasesSection($event as CasesSection)" />

          <section v-if="activeCasesSection === 'input'" class="case-input-page">
            <UiWorkspaceSurface as="div" class="case-input-form" padding="standard">
              <div class="form-grid">
                <UiTextField v-model="newCaseDraft.label" label="案例名称" autocomplete="off" placeholder="例如：自己、家人" @update:model-value="caseError = ''" />
                <UiTextField v-model="newCaseDraft.name" label="姓名" autocomplete="off" placeholder="可选" @update:model-value="caseError = ''" />
                <div class="birth-picker-control"><span>性别</span><button type="button" class="birth-picker-trigger" aria-label="选择性别" @click="openBirthPicker('gender', 'create')"><UserRound :size="16" /><strong>{{ birthPickerFieldValue('gender', newCaseDraft) }}</strong><ChevronRight :size="15" /></button></div>
                <div class="birth-picker-control"><span>出生历法</span><button type="button" class="birth-picker-trigger" aria-label="选择出生历法" @click="openBirthPicker('calendar', 'create')"><CalendarDays :size="16" /><strong>{{ birthPickerFieldValue('calendar', newCaseDraft) }}</strong><ChevronRight :size="15" /></button></div>
                <div class="birth-picker-control"><span>出生日期</span><button type="button" class="birth-picker-trigger" aria-label="选择出生日期" @click="openBirthPicker('date', 'create')"><CalendarDays :size="16" /><strong>{{ birthPickerFieldValue('date', newCaseDraft) }}</strong><ChevronRight :size="15" /></button></div>
                <div class="birth-picker-control"><span>出生时间</span><button type="button" class="birth-picker-trigger" aria-label="选择出生时间" @click="openBirthPicker('time', 'create')"><Clock3 :size="16" /><strong>{{ birthPickerFieldValue('time', newCaseDraft) }}</strong><ChevronRight :size="15" /></button></div>
                <div class="birth-picker-control birth-picker-region"><span>出生地区</span><button type="button" class="birth-picker-trigger" aria-label="选择出生地区" @click="openBirthPicker('region', 'create')"><MapPin :size="16" /><strong>{{ birthPickerFieldValue('region', newCaseDraft) }}</strong><ChevronRight :size="15" /></button></div>
              </div>
              <div v-if="newCaseCalendar" class="birth-calendar"><div><small>公历</small><strong>{{ newCaseCalendar.solar }}</strong></div><div><small>农历</small><strong>{{ newCaseCalendar.lunar }}</strong></div><div><small>干支</small><strong>{{ newCaseCalendar.ganzhi }}</strong></div><div><small>节气 / 时辰</small><strong>{{ newCaseCalendar.jieqi }} · {{ newCaseCalendar.shichen }}</strong></div></div>
              <div v-if="newCaseCalendar?.trueSolar" class="solar-details"><div><small>真太阳时</small><strong>{{ newCaseCalendar.trueSolar.correctedDateTime }}</strong></div><div><small>校正时辰</small><strong>{{ newCaseCalendar.trueSolar.shichen }}</strong></div><div><small>总修正</small><strong>{{ newCaseCalendar.trueSolar.totalCorrectionMinutes.toFixed(1) }} 分钟</strong></div></div>
              <UiActionBar><UiButton @click="saveNewCase"><Plus :size="15" />保存案例</UiButton></UiActionBar>
              <UiNotice v-if="caseError" class="case-form-notice" tone="error" compact>{{ caseError }}</UiNotice>
            </UiWorkspaceSurface>
          </section>

          <section v-else class="case-records-page">
            <label v-if="cases.length" class="case-records-search"><Search :size="16" /><input v-model="caseSearch" type="search" autocomplete="off" placeholder="搜索名称、日期或地区" aria-label="搜索案例记录" /></label>
            <div v-if="filteredCases.length" class="case-records-list">
              <button v-for="profile in filteredCases" :key="profile.id" class="case-record-row" type="button" :aria-label="`编辑${profile.label}`" @click="editCase(profile.id)">
                <span class="case-avatar">{{ profile.label.slice(0, 1) }}</span>
                <span class="case-list-main"><strong>{{ profile.label }}<b v-if="profile.isDefault">默认</b></strong><small v-if="uniqueCaseName(profile)">{{ uniqueCaseName(profile) }}</small></span>
                <span class="case-list-meta"><strong>{{ formatCaseDate(profile) }} · {{ profile.time || '时间待补充' }}</strong><small>{{ profile.locationName }} · {{ profile.gender === 'male' ? '男' : '女' }}</small></span>
                <ChevronRight :size="16" />
              </button>
            </div>
            <UiEmptyState v-else class="case-record-empty" :title="cases.length ? '没有找到案例' : '还没有案例'" :description="cases.length ? '换个关键词试试' : ''" compact>
              <template #icon><UserRound :size="21" /></template>
              <template v-if="!cases.length" #action><UiButton @click="openCasesSection('input')">输入第一份案例</UiButton></template>
            </UiEmptyState>
          </section>
        </UiPageShell>

        <UiPageShell v-else-if="activeView === 'settings'" width="standard" class="screen settings-screen">
          <UiSegmentedControl as="nav" class="ui-subpage-tabs" :model-value="activeSettingsSection" :items="settingsSectionTabs" label="设置分类" variant="underline" @update:model-value="openSettingsSection($event as SettingsSection)" />

          <UiWorkspaceSurface v-if="activeSettingsSection === 'ai'" as="div" class="settings-workspace" padding="standard">
            <aside class="settings-channel-rail">
              <div class="settings-rail-heading"><div><h2>AI 渠道</h2></div><UiButton variant="secondary" size="small" icon-only aria-label="添加 AI 渠道" @click="addAiChannel"><Plus :size="15" /></UiButton></div>
              <div class="settings-channel-list">
                <button v-for="channel in appPreferences.aiChannels" :key="channel.id" type="button" class="settings-channel-item" :class="{ active: configuringAiChannel.id === channel.id, current: activeAiChannel.id === channel.id }" @click="selectConfiguringAiChannel(channel.id)"><span class="settings-channel-icon"><Sparkles v-if="channel.provider === 'builtin'" :size="15" /><Settings v-else :size="15" /></span><span><strong>{{ channel.name }}</strong><small v-if="channel.provider === 'builtin'">无需配置</small><small v-else-if="isAiChannelReady(channel)">{{ channel.model }}</small><small v-else>待配置</small></span><Check v-if="activeAiChannel.id === channel.id" :size="15" /></button>
              </div>
              <div class="settings-rail-footer"><span>API Key 仅保存在当前浏览器会话。</span><UiButton variant="ghost" size="small" @click="addAiChannel"><Plus :size="13" />添加渠道</UiButton></div>
            </aside>

            <div class="settings-main-column">
              <section class="settings-channel-panel">
                <div class="settings-panel-heading"><div><h2><span v-if="configuringAiChannel.provider === 'builtin' || configuringAiChannel.preset">{{ configuringAiChannel.name }}</span><input v-else v-model="configuringAiChannel.name" class="settings-channel-name" aria-label="渠道名称" @input="resetAiTest" /></h2></div><span v-if="activeAiChannel.id === configuringAiChannel.id" class="settings-current-badge"><Check :size="13" />当前使用</span></div>
                <div class="settings-provider-line"><span class="settings-field-label">渠道类型</span><strong>{{ configuringAiChannel.provider === 'builtin' ? '内置 AI' : configuringAiChannel.preset ? '常用渠道' : '自定义接口' }}</strong><small v-if="configuringAiChannel.provider === 'builtin'">可直接使用，无需填写密钥。</small><small v-else-if="configuringAiChannel.preset">填写 Key 后获取并选择模型。</small><small v-else>填写服务地址、协议与密钥后获取模型。</small></div>
                <div v-if="configuringAiChannel.provider !== 'builtin'" class="settings-channel-fields">
                  <UiTextField v-if="!configuringAiChannel.preset" v-model="configuringAiChannel.baseUrl" class="settings-field-wide" label="接口地址" type="url" autocomplete="url" placeholder="https://api.example.com/v1" @input="invalidateAiModels(configuringAiChannel)" />
                  <label class="settings-field"><span>接口协议</span><select v-model="configuringAiChannel.apiType" @change="resetAiTest"><option v-for="option in aiApiTypeOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select></label>
                  <UiTextField v-model="configuringAiChannel.apiKey" label="API Key" type="password" autocomplete="off" placeholder="仅保存在当前会话" @input="resetAiTest" />
                </div>
                <div v-if="configuringAiChannel.provider !== 'builtin'" class="settings-model-section"><div class="settings-model-heading"><span class="settings-field-label">模型</span><UiButton class="settings-fetch-models" variant="secondary" size="small" :loading="isLoadingAiModels" :disabled="!configuringAiChannel.baseUrl.trim() || !configuringAiChannel.apiKey.trim()" @click="loadAiModels(configuringAiChannel)"><RefreshCw v-if="!isLoadingAiModels" :size="14" />{{ isLoadingAiModels ? '获取中…' : '获取模型' }}</UiButton></div><select v-if="configuringAiModelOptions.length" v-model="selectedConfiguringAiModel" class="settings-model-select" aria-label="当前模型"><option v-for="model in configuringAiModelOptions" :key="model" :value="model">{{ model }}</option></select><span v-else class="settings-model-empty">请先获取模型</span><UiTextField v-if="!configuringAiChannel.preset" v-model="configuringAiModelsText" label="手动填写模型" multiline :rows="3" placeholder="无法获取列表时，可每行填写一个模型名称" /><small v-if="aiModelMessage" class="settings-note" :class="{ success: aiModelState === 'success', error: aiModelState === 'error' }">{{ aiModelMessage }}</small></div>
                <div class="settings-test-row"><UiButton v-if="activeAiChannel.id !== configuringAiChannel.id" :disabled="!isAiChannelReady(configuringAiChannel)" @click="setActiveAiChannel(configuringAiChannel.id)"><Check :size="14" />设为当前</UiButton><UiButton variant="secondary" :loading="isTestingAi" :disabled="!isAiChannelReady(configuringAiChannel)" @click="testAiConnection"><Check v-if="!isTestingAi && aiTestState === 'success'" :size="14" /><Sparkles v-else-if="!isTestingAi" :size="14" />{{ isTestingAi ? '连接中…' : '测试连接' }}</UiButton><UiButton v-if="configuringAiChannel.provider !== 'builtin' && !configuringAiChannel.preset" class="settings-delete-channel" variant="danger" @click="removeAiChannel"><Trash2 :size="14" />删除渠道</UiButton><span v-if="aiTestMessage" :class="{ success: aiTestState === 'success', error: aiTestState === 'error' }">{{ aiTestMessage }}</span></div>
              </section>

            </div>
          </UiWorkspaceSurface>

          <div v-else class="preferences-page">
            <section class="preference-section">
              <UiSectionHeading class="preference-section-heading" title="解答偏好" description="选择 AI 的表达风格和解读框架" compact />
              <div>
                <div class="preference-option-grid is-three">
                  <button v-for="item in answerPreferenceOptions" :key="item.value" type="button" class="preference-option" :class="{ active: appPreferences.answerPreference === item.value }" @click="chooseAnswerPreference(item.value)"><span><strong>{{ item.label }}</strong><small>{{ item.description }}</small></span><Check v-if="appPreferences.answerPreference === item.value" :size="15" /></button>
                </div>
                <p class="preference-active-note">{{ answerPreferenceOptions.find((item) => item.value === appPreferences.answerPreference)?.description }}</p>
              </div>
            </section>

            <section class="preference-section">
              <UiSectionHeading class="preference-section-heading" title="内容层级" description="决定可见术式和盘面信息" compact />
              <div>
                <div class="preference-option-grid is-three">
                  <button v-for="item in displayLevelOptions" :key="item.value" type="button" class="preference-option" :class="{ active: appPreferences.displayLevel === item.value }" @click="chooseDisplayLevel(item.value)"><span><strong>{{ item.label }}</strong><small>{{ item.description }}</small></span><Check v-if="appPreferences.displayLevel === item.value" :size="15" /></button>
                </div>
                <p class="preference-active-note">{{ displayLevelOptions.find((item) => item.value === appPreferences.displayLevel)?.description }}</p>
              </div>
            </section>

            <section class="preference-section">
              <UiSectionHeading class="preference-section-heading" title="起卦方式" description="设置占卜时的默认操作" compact />
              <div>
                <div class="preference-option-grid is-two">
                  <button v-for="item in castingPreferenceOptions" :key="item.value" type="button" class="preference-option" :class="{ active: appPreferences.castingPreference === item.value }" @click="chooseCastingPreference(item.value)"><span><strong>{{ item.label }}</strong><small>{{ item.description }}</small></span><Check v-if="appPreferences.castingPreference === item.value" :size="15" /></button>
                </div>
                <p class="preference-active-note">{{ castingPreferenceOptions.find((item) => item.value === appPreferences.castingPreference)?.description }}</p>
              </div>
            </section>
          </div>
        </UiPageShell>

        <section v-if="activeView === 'charts' && displayResult" class="result-area ui-page ui-page--wide" :class="{ 'display-basic': appPreferences.displayLevel === 'basic', 'display-beginner': appPreferences.displayLevel === 'beginner', 'is-bazi-result': isBazi(displayResult), 'is-ziwei-result': isZiwei(displayResult), 'is-qizheng-result': isQizheng(displayResult), 'ui-page--mobile-immersive': isBazi(displayResult) || isZiwei(displayResult) || isQizheng(displayResult) }">
          <div class="result-card traditional-result-card" :class="{ 'display-beginner': appPreferences.displayLevel === 'beginner' }">
            <div v-if="isMeihua(displayResult)" class="result-feature"><div class="result-emblem">{{ displayResult.mainHexagram.symbol }}<small>主卦</small></div><div class="result-copy"><span>{{ displayResult.mainHexagram.upper }} · {{ displayResult.mainHexagram.lower }}</span><h3>{{ displayResult.mainHexagram.name }}<b v-if="displayResult.changedHexagram"> → {{ displayResult.changedHexagram.name }}</b></h3><p>{{ displayResult.mainHexagram.description }}</p></div></div>
            <div v-else-if="isLiuyao(displayResult)" class="result-feature"><div class="result-copy"><span>{{ displayResult.palace.name }} · {{ displayResult.palaceStage }}</span><h3>{{ displayResult.originalName }}<b v-if="displayResult.changedName"> → {{ displayResult.changedName }}</b></h3><p>{{ displayResult.specialAdvice || '世应与动爻信息已纳入本次排盘。' }}</p></div><div class="yao-lines"><i v-for="yao in displayResult.yaosDetail" :key="yao.position" :class="{ broken: yao.yaoType === '阴', changing: yao.isChanging }"></i></div></div>
            <div v-else-if="isSsgw(displayResult)" class="result-feature"><div class="sign-number"><small>第</small><strong>{{ displayResult.number }}</strong><small>签</small></div><div class="result-copy"><span>三山国王 · 灵签</span><h3>{{ displayResult.title }}</h3><p>{{ displayResult.poem }}</p></div></div>
            <div v-else-if="isXiaoliuren(displayResult)" class="result-feature column-feature"><div class="primary-reading"><span>本课主象</span><strong>{{ displayResult.primary.name }}</strong><p>{{ displayResult.primary.verse }}</p></div><div class="sequence-list"><div v-for="item in [displayResult.sequence.month, displayResult.sequence.day, displayResult.sequence.hour]" :key="item.name + item.index"><small>{{ item === displayResult.sequence.month ? '月' : item === displayResult.sequence.day ? '日' : '时' }}</small><strong>{{ item.name }}</strong></div></div></div>
            <div v-else-if="isJinkoujue(displayResult)" class="result-feature column-feature"><div class="result-copy"><span>{{ displayResult.methodLabel }} · {{ displayResult.dayNight }}</span><h3>{{ displayResult.mainLine }}</h3><p>{{ displayResult.summary }}</p></div><div class="position-grid"><div v-for="position in [displayResult.positions.diFen, displayResult.positions.jiangShen, displayResult.positions.guiShen, displayResult.positions.renYuan]" :key="position.name"><small>{{ position.name }}</small><strong>{{ position.god || position.stem || position.branch }}</strong><span>{{ position.element }}</span></div></div></div>
            <div v-else-if="isQimen(displayResult)" class="qimen-result"><div class="qimen-meta"><strong>{{ displayResult.isYangDun ? '阳遁' : '阴遁' }}{{ displayResult.juShu }}局</strong><span>值符 {{ displayResult.zhiFu }} · 值使 {{ displayResult.zhiShi }}</span></div><div class="qimen-grid"><div v-for="palace in displayResult.jiuGongGe" :key="palace.gong" class="qimen-palace"><small>{{ palace.name }} · {{ palace.direction }}</small><strong>{{ palace.renPan.door }}</strong><span>{{ palace.tianPan.star }} · {{ palace.shenPan.god }}</span></div></div><div class="tag-list"><span v-for="tag in (displayResult.patternTags || []).slice(0, 6)" :key="tag">{{ tag }}</span></div></div>
            <div v-else-if="isLiuren(displayResult)" class="liuren-result"><div class="transmission-row"><div v-for="item in displayResult.threeTransmissions" :key="item.stage"><small>{{ item.stage }}</small><strong>{{ item.branch }}</strong><span>{{ item.god }}</span></div></div><p>{{ displayResult.transmissionSummary || displayResult.lessonSummary }}</p></div>
            <div v-else-if="isTaiyi(displayResult)" class="taiyi-result"><div class="taiyi-result-head"><strong>{{ displayResult.ganZhi }}年 · {{ displayResult.yinYang }}{{ displayResult.bureau }}局</strong><span>太乙 {{ displayResult.taiyiPosition }} · 文昌 {{ displayResult.wenChangPosition }} · 始击 {{ displayResult.shiJiPosition }}</span></div><div class="transmission-row"><div><small>主算</small><strong>{{ displayResult.lordCount }}</strong><span>将 {{ displayResult.lordGeneral }}/{{ displayResult.lordAssistant }}宫</span></div><div><small>客算</small><strong>{{ displayResult.guestCount }}</strong><span>将 {{ displayResult.guestGeneral }}/{{ displayResult.guestAssistant }}宫</span></div><div><small>定算</small><strong>{{ displayResult.setCount }}</strong><span>将 {{ displayResult.setGeneral }}/{{ displayResult.setAssistant }}宫</span></div></div></div>
            <div v-else-if="isAlmanac(displayResult)" class="almanac-result"><div v-for="day in displayResult.days.slice(0, 4)" :key="day.date" class="day-card"><small>{{ day.weekday }} · {{ day.lunarDate }}</small><strong>{{ day.date.slice(5) }}</strong><span>{{ day.dayOfficer }} · {{ day.twelveStar }}</span><em>{{ day.highlights[0] || day.recommends[0] || '宜结合当天安排判断' }}</em></div></div>
            <div v-else-if="isBazi(displayResult)" class="bazi-result">
              <section class="bazi-overview" aria-label="命局概览">
                <header class="bazi-overview-head">
                  <div class="bazi-overview-identity"><strong>{{ displayResult.gender === 'male' ? '男命' : '女命' }} · {{ displayResult.dayMaster.gan }}日主</strong><span>{{ displayResult.dayMaster.yinYang }}{{ displayResult.dayMaster.element }} · 命卦{{ displayResult.mingGua.gua }} · {{ displayResult.mingGua.eastWest }}</span></div>
                  <div class="bazi-overview-calendar"><strong>{{ displayResult.solarDate.year }}年{{ displayResult.solarDate.month }}月{{ displayResult.solarDate.day }}日 · {{ displayResult.timeInfo.name }}</strong><span>农历{{ displayResult.lunarDate.monthName }}{{ displayResult.lunarDate.dayName }} · {{ displayResult.timeInfo.range }} · {{ displayResult.seasonInfo.currentJieqi }}后{{ displayResult.seasonInfo.daysSincePrev }}日</span></div>
                  <div class="bazi-overview-keyfacts"><span>旺衰 <b>{{ displayResult.analysis.dayMasterStrength.status }}</b></span><span>格局 <b>{{ displayResult.analysis.mingGe.pattern }}</b></span><span>喜用 <b>{{ formatBaziUsefulElements(displayResult.analysis.usefulGod) }}</b></span></div>
                </header>
              </section>
              <div class="bazi-table bazi-extended-table" :style="baziTraditionalTableStyle" aria-label="命式与当前岁运">
                <div class="bazi-row bazi-row-label"><span>盘柱</span><strong v-for="column in visibleBaziTraditionalColumns" :key="column.key" class="bazi-column-heading" :class="{ 'is-fortune-start': column.key === firstVisibleBaziFortuneColumnKey }"><span>{{ column.label }}</span></strong></div>
                <div class="bazi-row bazi-row-pillar"><span>干支</span><strong v-for="column in visibleBaziTraditionalColumns" :key="column.key" class="bazi-pillar-cell" :class="{ 'is-fortune-start': column.key === firstVisibleBaziFortuneColumnKey }"><small>{{ column.tenGod }}</small><span v-if="column.gan && column.zhi" class="bazi-pillar-ganzhi"><b class="bazi-wuxing" :class="baziElementClass(column.gan)">{{ column.gan }}</b><b class="bazi-wuxing" :class="baziElementClass(column.zhi)">{{ column.zhi }}</b></span><span v-else class="bazi-current-empty">—</span></strong></div>
                <div class="bazi-row bazi-row-detail bazi-row-hidden-stems"><span>藏干</span><strong v-for="column in visibleBaziTraditionalColumns" :key="column.key" class="bazi-stacked-values" :class="{ 'is-fortune-start': column.key === firstVisibleBaziFortuneColumnKey }"><template v-if="column.hiddenPairs.length"><span v-for="(pair, index) in column.hiddenPairs" :key="`${column.key}-${pair.stem}-${index}`" class="bazi-hidden-pair"><b class="bazi-wuxing" :class="baziElementClass(pair.stem)">{{ pair.stem }}</b><em>{{ pair.tenGod }}</em></span></template><em v-else>—</em></strong></div>
                <div class="bazi-row bazi-row-detail"><span>纳音</span><strong v-for="column in visibleBaziTraditionalColumns" :key="column.key" :class="{ 'is-fortune-start': column.key === firstVisibleBaziFortuneColumnKey }"><span class="bazi-wuxing bazi-nayin-value" :class="baziElementClass(column.nayinElement)">{{ column.nayin }}</span></strong></div>
                <div class="bazi-row bazi-row-detail"><span>长生</span><strong v-for="column in visibleBaziTraditionalColumns" :key="column.key" :class="{ 'is-fortune-start': column.key === firstVisibleBaziFortuneColumnKey }">{{ column.lifeStage }}</strong></div>
                <div class="bazi-row bazi-row-detail"><span>自坐</span><strong v-for="column in visibleBaziTraditionalColumns" :key="column.key" :class="{ 'is-fortune-start': column.key === firstVisibleBaziFortuneColumnKey }">{{ column.ziZuo }}</strong></div>
                <div class="bazi-row bazi-row-detail"><span>空亡</span><strong v-for="column in visibleBaziTraditionalColumns" :key="column.key" :class="{ 'is-fortune-start': column.key === firstVisibleBaziFortuneColumnKey }">{{ column.kongWang.join(' ') || '—' }}</strong></div>
                <div class="bazi-row bazi-row-shensha"><span>神煞</span><strong v-for="column in visibleBaziTraditionalColumns" :key="column.key" class="bazi-stacked-values" :class="{ 'is-fortune-start': column.key === firstVisibleBaziFortuneColumnKey }" :title="column.shensha.join('、')"><template v-if="column.shensha.length"><span v-for="(name, index) in column.shensha" :key="`${column.key}-${name}-${index}`">{{ name }}</span></template><em v-else>—</em></strong></div>
              </div>
              <section class="bazi-overview-content bazi-analysis-section" aria-label="命局分析">
                  <dl class="bazi-extra-list">
                    <div><dt>原局关系</dt><dd>{{ formatBaziRelations(displayResult) }}</dd></div>
                    <div><dt>五行旺相</dt><dd>{{ formatBaziSeasonStatus(displayResult) }}</dd></div>
                    <div><dt>命卦</dt><dd>{{ displayResult.mingGua.gua }} · {{ displayResult.mingGua.star }} · {{ displayResult.mingGua.element }} · {{ displayResult.mingGua.eastWest }}</dd></div>
                    <div><dt>节令交接</dt><dd>当前{{ displayResult.seasonInfo.currentJieqi }}<template v-if="displayResult.seasonInfo.daysSincePrev !== undefined">后 {{ displayResult.seasonInfo.daysSincePrev }} 日</template> · 距{{ displayResult.seasonInfo.nextJieqi }}<template v-if="displayResult.seasonInfo.daysToNext !== undefined"> {{ displayResult.seasonInfo.daysToNext }} 日</template></dd></div>
                  </dl>
                  <div class="bazi-positions"><span>命宫 <b>{{ displayResult.mingGong }}</b></span><span>身宫 <b>{{ displayResult.shenGong }}</b></span><span>胎元 <b>{{ displayResult.taiYuan }}</b></span><span>胎息 <b>{{ displayResult.taiXi }}</b></span></div>
              </section>
              <div class="bazi-fortune-board" @wheel.capture="handleBaziFortuneWheel">
                <div class="luck-section">
                <div class="subsection-title"><span>大运</span><small>{{ formatBaziStartInfo(displayResult.luckInfo.startInfo) }}</small></div>
                <div class="luck-list"><button v-for="(cycle, index) in displayResult.luckInfo.cycles" :key="`${cycle.age}-${cycle.ganZhi}`" type="button" :class="{ active: selectedBaziCycleIndex === index }" @click="chooseBaziCycle(index)"><small>{{ cycle.age }}岁</small><span class="bazi-fortune-year">{{ cycle.startSolarTime ? cycle.startSolarTime.year : cycle.year }}</span><strong v-if="cycle.isXiaoyun">小运</strong><strong v-else class="bazi-fortune-ganzhi"><span><b class="bazi-wuxing" :class="baziElementClass(cycle.ganZhi.slice(0, 1))">{{ cycle.ganZhi.slice(0, 1) }}</b><em>{{ baziGanTenGodShort(cycle.ganZhi, displayResult.dayMaster.gan) }}</em></span><span><b class="bazi-wuxing" :class="baziElementClass(cycle.ganZhi.slice(1, 2))">{{ cycle.ganZhi.slice(1, 2) }}</b><em>{{ baziZhiTenGodShort(cycle.ganZhi, displayResult.dayMaster.gan) }}</em></span></strong></button></div>
                </div>
                <div v-if="selectedBaziYears.length" class="liunian-section">
                  <div class="subsection-title"><span>流年</span><small v-if="selectedBaziYearInfo">{{ selectedBaziYearInfo.year }}年 · {{ selectedBaziYearInfo.age }}岁 · {{ selectedBaziYearInfo.tenGod }} / {{ selectedBaziYearInfo.tenGodZhi }}</small></div>
                  <div class="liunian-list"><button v-for="year in selectedBaziYears" :key="year.year" type="button" :class="{ active: selectedBaziYear === year.year, current: year.year === currentFortuneYear }" @click="chooseBaziYear(year.year)"><small>{{ year.age }}岁</small><span class="bazi-fortune-year">{{ year.year }}</span><strong class="bazi-fortune-ganzhi"><span><b class="bazi-wuxing" :class="baziElementClass(year.ganZhi.slice(0, 1))">{{ year.ganZhi.slice(0, 1) }}</b><em>{{ shortBaziTenGod(year.tenGod) }}</em></span><span><b class="bazi-wuxing" :class="baziElementClass(year.ganZhi.slice(1, 2))">{{ year.ganZhi.slice(1, 2) }}</b><em>{{ shortBaziTenGod(year.tenGodZhi) }}</em></span></strong></button></div>
                </div>
                <div v-if="selectedBaziMonths.length" class="bazi-fortune-section">
                  <div class="subsection-title"><span>流月</span><small v-if="selectedBaziMonthInfo">{{ selectedBaziMonthInfo.label }} · {{ selectedBaziMonthInfo.startDate.slice(0, 10) }}—{{ selectedBaziMonthInfo.endDate.slice(0, 10) }}</small></div>
                  <div class="bazi-fortune-strip bazi-month-list"><button v-for="month in selectedBaziMonths" :key="month.month" type="button" :class="{ active: selectedBaziMonth === month.month }" @click="chooseBaziMonth(month.month)"><small>{{ month.startDate.slice(5, 10).replace('-', '.') }}</small><span class="bazi-fortune-period-label">{{ month.label.replace('月', '') }}</span><strong class="bazi-fortune-ganzhi"><span><b class="bazi-wuxing" :class="baziElementClass(month.ganZhi.slice(0, 1))">{{ month.ganZhi.slice(0, 1) }}</b><em>{{ baziGanTenGodShort(month.ganZhi, displayResult.dayMaster.gan) }}</em></span><span><b class="bazi-wuxing" :class="baziElementClass(month.ganZhi.slice(1, 2))">{{ month.ganZhi.slice(1, 2) }}</b><em>{{ baziZhiTenGodShort(month.ganZhi, displayResult.dayMaster.gan) }}</em></span></strong></button></div>
                </div>
                <div v-if="selectedBaziDays.length" class="bazi-fortune-section">
                  <div class="subsection-title"><span>流日</span><small v-if="selectedBaziDayInfo">{{ selectedBaziDayInfo.date }} · {{ selectedBaziDayInfo.ganZhi }}</small></div>
                  <div class="bazi-fortune-strip bazi-day-list"><button v-for="day in selectedBaziDays" :key="day.date" type="button" :class="{ active: selectedBaziDayIndex === day.selectionIndex }" @click="chooseBaziDay(day.selectionIndex)"><small>{{ Number(day.date.slice(8, 10)) }}</small><span class="bazi-fortune-period-label">{{ baziLunarDayLabel(day.date) }}</span><strong class="bazi-fortune-ganzhi"><span><b class="bazi-wuxing" :class="baziElementClass(day.ganZhi.slice(0, 1))">{{ day.ganZhi.slice(0, 1) }}</b><em>{{ baziGanTenGodShort(day.ganZhi, displayResult.dayMaster.gan) }}</em></span><span><b class="bazi-wuxing" :class="baziElementClass(day.ganZhi.slice(1, 2))">{{ day.ganZhi.slice(1, 2) }}</b><em>{{ baziZhiTenGodShort(day.ganZhi, displayResult.dayMaster.gan) }}</em></span></strong></button></div>
                </div>
                <div v-if="selectedBaziHours.length" class="bazi-fortune-section">
                  <div class="subsection-title"><span>流时</span><small v-if="selectedBaziHourInfo">{{ formatBaziHourTimeRange(selectedBaziHourInfo.label) }} · {{ selectedBaziHourInfo.ganZhi }}</small></div>
                  <div class="bazi-fortune-strip bazi-hour-list"><button v-for="(hour, index) in selectedBaziHours" :key="`${hour.label}-${hour.ganZhi}`" type="button" :class="{ active: selectedBaziHourIndex === index }" @click="selectedBaziHourIndex = index"><small>{{ formatBaziHourStartTime(hour.label) }}</small><span class="bazi-fortune-period-label">{{ formatBaziHourLabel(hour.label).replace('时', '') }}</span><strong class="bazi-fortune-ganzhi"><span><b class="bazi-wuxing" :class="baziElementClass(hour.ganZhi.slice(0, 1))">{{ hour.ganZhi.slice(0, 1) }}</b><em>{{ baziGanTenGodShort(hour.ganZhi, displayResult.dayMaster.gan) }}</em></span><span><b class="bazi-wuxing" :class="baziElementClass(hour.ganZhi.slice(1, 2))">{{ hour.ganZhi.slice(1, 2) }}</b><em>{{ baziZhiTenGodShort(hour.ganZhi, displayResult.dayMaster.gan) }}</em></span></strong></button></div>
                </div>
                <div class="bazi-fortune-actions">
                  <UiButton variant="secondary" size="small" :disabled="isInterpreting || !selectedBaziCycle" @click="interpretSelectedBaziFortune('dayun')"><Sparkles :size="14" />解读大运</UiButton>
                  <UiButton variant="secondary" size="small" :disabled="isInterpreting || !selectedBaziYear" @click="interpretSelectedBaziFortune('year')"><Sparkles :size="14" />解读流年</UiButton>
                </div>
              </div>
              <div v-if="displayResult.warnings.length" class="chart-warnings"><span v-for="warning in displayResult.warnings" :key="warning">{{ warning }}</span></div>
            </div>
            <div v-else-if="isZiwei(displayResult)" class="ziwei-result">
              <div ref="ziweiChartScrollRef" class="ziwei-chart-scroll">
                <div class="ziwei-chart-grid">
                  <div v-if="selectedZiweiPalace" class="ziwei-center">
                    <div class="ziwei-center-intro">
                      <div class="ziwei-center-profile">
                        <strong>{{ displayResult.birth.name }} · {{ displayResult.payload.basic_info.gender }}</strong>
                        <span>{{ displayResult.payload.basic_info.solar_date }} · {{ displayResult.payload.basic_info.birth_time_label }}</span>
                        <small>{{ displayResult.payload.basic_info.lunar_date }}</small>
                        <small>{{ displayResult.payload.basic_info.four_pillars?.year_pillar }} {{ displayResult.payload.basic_info.four_pillars?.month_pillar }} {{ displayResult.payload.basic_info.four_pillars?.day_pillar }} {{ displayResult.payload.basic_info.four_pillars?.hour_pillar }}</small>
                        <em>{{ displayResult.payload.basic_info.five_elements_class }} · 命主{{ displayResult.payload.basic_info.soul }} · 身主{{ displayResult.payload.basic_info.body }}</em>
                      </div>
                      <div class="ziwei-center-scope">
                        <div class="ziwei-scope-switcher"><button v-for="scope in ziweiScopeOptions" :key="scope.value" type="button" :class="{ active: selectedZiweiScope === scope.value }" @click="chooseZiweiScope(scope.value)">{{ scope.label }}</button></div>
                        <div class="ziwei-active-fortune"><strong>{{ displayResult.payload.active_scope.label }}</strong><span v-if="displayResult.payload.active_scope.nominal_age">{{ displayResult.payload.active_scope.nominal_age }}岁</span><span v-if="displayResult.payload.active_scope.palace_name">{{ displayResult.payload.active_scope.palace_name }}</span><small v-if="displayResult.payload.active_scope.solar_date">{{ displayResult.payload.active_scope.solar_date }}</small></div>
                      </div>
                    </div>
                    <div class="ziwei-center-periods" aria-label="大限"><i v-for="period in displayResult.decadalTimeline" :key="`${period.startAge}-${period.endAge}`" :class="{ active: displayResult.payload.active_scope.nominal_age >= period.startAge && displayResult.payload.active_scope.nominal_age <= period.endAge }"><b>{{ period.startAge }}—{{ period.endAge }}</b><small>{{ period.palaceName || period.label }}</small></i></div>
                    <section class="ziwei-center-palace">
                      <header><span>{{ displayResult.payload.active_scope.label }} · {{ selectedZiweiPalace.heavenly_stem }}{{ selectedZiweiPalace.earthly_branch }}</span><strong>{{ selectedZiweiPalace.name }}<i v-if="selectedZiweiPalace.dynamic_scope_name">{{ selectedZiweiPalace.dynamic_scope_name }}</i></strong><small><template v-if="selectedZiweiPalace.is_original_palace">来因宫 · </template><template v-if="selectedZiweiPalace.is_body_palace">身宫 · </template>{{ selectedZiweiPalace.decadal_range[0] }}—{{ selectedZiweiPalace.decadal_range[1] }}岁</small></header>
                      <div class="ziwei-center-stars">
                        <p v-if="selectedZiweiPalace.major_stars.length"><b>主星</b><span v-for="star in selectedZiweiPalace.major_stars" :key="`center-major-${star.name}`">{{ star.name }}<em v-if="star.brightness">{{ star.brightness }}</em><i v-if="star.birth_mutagen || star.active_scope_mutagen">{{ star.active_scope_mutagen || star.birth_mutagen }}</i></span></p>
                        <p v-if="selectedZiweiPalace.minor_stars.length"><b>辅星</b><span v-for="star in selectedZiweiPalace.minor_stars" :key="`center-minor-${star.name}`">{{ star.name }}<em v-if="star.brightness">{{ star.brightness }}</em><i v-if="star.birth_mutagen || star.active_scope_mutagen">{{ star.active_scope_mutagen || star.birth_mutagen }}</i></span></p>
                        <p v-if="selectedZiweiPalace.other_stars.length"><b>杂曜</b><span v-for="star in selectedZiweiPalace.other_stars" :key="`center-other-${star.name}`">{{ star.name }}<i v-if="star.birth_mutagen || star.active_scope_mutagen">{{ star.active_scope_mutagen || star.birth_mutagen }}</i></span></p>
                        <p v-if="selectedZiweiPalace.scope_stars.length"><b>运曜</b><span v-for="star in selectedZiweiPalace.scope_stars" :key="`center-scope-${star.name}`">{{ star.name }}<em v-if="star.brightness">{{ star.brightness }}</em><i v-if="star.active_scope_mutagen">{{ star.active_scope_mutagen }}</i></span></p>
                      </div>
                      <div class="ziwei-center-facts"><span>三方 <b>{{ selectedZiweiRelations.sanfang || '—' }}</b></span><span>对宫 <b>{{ selectedZiweiRelations.opposite || '—' }}</b></span><span>流年 <b>{{ ziweiYearlyAges(selectedZiweiPalace, displayResult).join('、') }}</b></span><span>小限 <b>{{ selectedZiweiPalace.ages.join('、') }}</b></span><span>长生 <b>{{ selectedZiweiPalace.changsheng12 }}</b></span><span>博士 <b>{{ selectedZiweiPalace.boshi12 }}</b></span><span>将前 <b>{{ selectedZiweiPalace.yearly_jiangqian12 || selectedZiweiPalace.base_jiangqian12 }}</b></span><span>岁前 <b>{{ selectedZiweiPalace.yearly_suiqian12 || selectedZiweiPalace.base_suiqian12 }}</b></span></div>
                      <div v-if="(selectedZiweiPalace.mutaged_palaces || []).some((item) => item.palace_name)" class="ziwei-center-flight"><span>四化飞宫</span><b v-for="item in (selectedZiweiPalace.mutaged_palaces || [])" :key="`flight-${selectedZiweiPalace.index}-${item.mutagen}`">{{ item.mutagen }}<small>{{ item.palace_name || '—' }}</small></b></div>
                      <div v-if="displayResult.payload.active_scope.mutagen_map.length" class="ziwei-center-mutagens"><span v-for="item in displayResult.payload.active_scope.mutagen_map" :key="`${item.mutagen}-${item.star}`"><b>{{ item.mutagen }}</b>{{ item.star }}<small v-if="item.palace_name">{{ item.palace_name }}</small></span></div>
                      <p v-if="selectedZiweiPalace.summary_tags.length" class="ziwei-center-tags">{{ selectedZiweiPalace.summary_tags.join(' · ') }}</p>
                    </section>
                    <div class="ziwei-center-guide"><span><i class="sanfang-key-line"></i>三方</span><span><i class="opposite-key-line"></i>对宫</span><small>点选宫位切换</small></div>
                  </div>
                  <button v-for="palace in displayResult.payload.palaces" :key="palace.index" type="button" class="ziwei-palace" :class="{ selected: selectedZiweiPalaceIndex === palace.index }" :style="ziweiGridStyle(palace.index)" @click="selectZiweiPalace(palace.index)">
                    <div class="palace-head"><strong>{{ palace.name }}</strong><span v-if="palace.dynamic_scope_name">{{ palace.dynamic_scope_name }}</span><b>{{ palace.heavenly_stem }}{{ palace.earthly_branch }}</b></div>
                    <div class="palace-badges"><i v-if="palace.is_original_palace">来因</i><i v-if="palace.is_body_palace">身宫</i><i v-for="mutagen in (palace.self_mutagens || [])" :key="`${palace.index}-self-${mutagen}`">自化{{ mutagen }}</i><i v-for="hit in palace.scope_hits" :key="`${palace.index}-${hit}`" class="scope-hit">{{ hit }}</i><small v-if="palace.decadal_range?.length">大限 {{ palace.decadal_range[0] }}—{{ palace.decadal_range[1] }}</small></div>
                    <div class="palace-star-groups">
                      <div v-if="palace.major_stars.length" class="palace-star-group is-major"><small>主</small><span v-for="star in palace.major_stars" :key="`${palace.index}-${star.name}`">{{ star.name }}<em v-if="star.brightness">{{ star.brightness }}</em><i v-if="star.birth_mutagen || star.active_scope_mutagen">{{ star.active_scope_mutagen || star.birth_mutagen }}</i></span></div>
                      <div v-if="palace.minor_stars.length" class="palace-star-group is-minor"><small>辅</small><span v-for="star in palace.minor_stars" :key="`${palace.index}-minor-${star.name}`">{{ star.name }}<em v-if="star.brightness">{{ star.brightness }}</em><i v-if="star.birth_mutagen || star.active_scope_mutagen">{{ star.active_scope_mutagen || star.birth_mutagen }}</i></span></div>
                      <div v-if="palace.other_stars.length" class="palace-star-group is-other"><small>杂</small><span v-for="star in palace.other_stars" :key="`${palace.index}-other-${star.name}`">{{ star.name }}<i v-if="star.birth_mutagen || star.active_scope_mutagen">{{ star.active_scope_mutagen || star.birth_mutagen }}</i></span></div>
                      <div v-if="palace.scope_stars.length" class="palace-star-group is-scope"><small>运</small><span v-for="star in palace.scope_stars" :key="`${palace.index}-scope-${star.name}`">{{ star.name }}<i v-if="star.active_scope_mutagen">{{ star.active_scope_mutagen }}</i></span></div>
                    </div>
                    <div class="palace-age-lines"><div><small>流年</small><span>{{ ziweiYearlyAges(palace, displayResult).join(' ') }}</span></div><div><small>小限</small><span>{{ palace.ages.join(' ') }}</span></div></div>
                    <div class="palace-cycle-grid"><span><small>长生</small>{{ palace.changsheng12 }}</span><span><small>博士</small>{{ palace.boshi12 }}</span><span><small>将前</small>{{ palace.yearly_jiangqian12 || palace.base_jiangqian12 }}</span><span><small>岁前</small>{{ palace.yearly_suiqian12 || palace.base_suiqian12 }}</span></div>
                  </button>
                  <svg v-if="ziweiSanfangPoints(displayResult).length === 3" class="ziwei-sanfang-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="所选宫位三方四正"><title>所选宫位三方四正</title><polygon :points="ziweiSanfangPoints(displayResult).map((point) => `${point.x},${point.y}`).join(' ')" /><circle v-for="(point, index) in ziweiSanfangPoints(displayResult)" :key="`sanfang-point-${index}`" :cx="point.x" :cy="point.y" r="0.58" /></svg>
                  <svg v-if="ziweiOppositeLine(displayResult)" class="ziwei-opposite-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><line :x1="ziweiOppositeLine(displayResult)?.from.x" :y1="ziweiOppositeLine(displayResult)?.from.y" :x2="ziweiOppositeLine(displayResult)?.to.x" :y2="ziweiOppositeLine(displayResult)?.to.y" /></svg>
                </div>
              </div>
            </div>
            <QizhengChart v-else-if="isQizheng(displayResult)" :result="displayResult" />
              <div v-else-if="isAstrolabe(displayResult)" class="astrolabe-result">
                <ChartIdentityBar
                  class="astrolabe-identity"
                  :name="displayResult.birth.name"
                  :subtitle="`${displayResult.birth.dateTime} · ${displayResult.birth.location.replace(/（[^）]+）/g, '')}`"
                  :badge="displayResult.birth.isTrueSolarTime ? '真太阳时' : '标准时'"
                />
                <div class="astro-chart-layout">
                  <ChartCoreFacts class="astro-overview" title="核心四要素" hint="先从这里认识这张盘" :items="astroCoreFacts(displayResult)" aria-label="星盘核心信息" />
                  <section class="astro-wheel-panel" aria-label="标准西洋占星本命盘">
                    <div class="astro-wheel-heading"><span>本命盘</span><small>黄道 · 宫位 · 相位</small></div>
                    <div class="astro-wheel">
                      <svg class="astro-wheel-svg" viewBox="0 0 500 500" role="img" aria-label="标准星盘盘面">
                        <circle class="astro-wheel-paper" cx="250" cy="250" r="236" />
                        <circle class="astro-wheel-ring outer" cx="250" cy="250" r="228" />
                        <circle class="astro-wheel-ring zodiac" cx="250" cy="250" r="205" />
                        <circle class="astro-wheel-ring houses" cx="250" cy="250" r="151" />
                        <circle class="astro-wheel-ring aspects" cx="250" cy="250" r="108" />
                        <g class="astro-zodiac-boundaries">
                          <line v-for="(sign, index) in zodiacSigns" :key="`sign-${sign}`" :x1="astroPolar(index * 30, 205, displayResult).x" :y1="astroPolar(index * 30, 205, displayResult).y" :x2="astroPolar(index * 30, 228, displayResult).x" :y2="astroPolar(index * 30, 228, displayResult).y" :class="{ strong: index % 3 === 0 }" />
                        </g>
                        <g class="astro-house-lines">
                          <line v-for="house in displayResult.houses" :key="`house-line-${house.house}`" :x1="250" :y1="250" :x2="astroPolar(house.longitude, 151, displayResult).x" :y2="astroPolar(house.longitude, 151, displayResult).y" :class="{ angular: house.house === 1 || house.house === 4 || house.house === 7 || house.house === 10 }" />
                        </g>
                        <g class="astro-axis-lines">
                          <line v-for="angle in displayResult.angles" :key="`axis-line-${angle.name}`" :x1="250" :y1="250" :x2="astroPolar(angle.longitude, 228, displayResult).x" :y2="astroPolar(angle.longitude, 228, displayResult).y" />
                        </g>
                        <g class="astro-aspect-lines">
                          <template v-for="aspect in astroMajorAspects(displayResult)" :key="`aspect-line-${aspect.body1}-${aspect.body2}-${aspect.type}`"><line v-if="astroAspectLine(aspect, displayResult)" :x1="astroAspectLine(aspect, displayResult)?.from.x" :y1="astroAspectLine(aspect, displayResult)?.from.y" :x2="astroAspectLine(aspect, displayResult)?.to.x" :y2="astroAspectLine(aspect, displayResult)?.to.y" :stroke="astroAspectColor(aspect.type)" :stroke-dasharray="astroAspectDash(aspect.type)" /></template>
                        </g>
                        <g class="astro-zodiac-labels">
                          <text v-for="(sign, index) in zodiacSigns" :key="`sign-label-${sign}`" :x="astroSignPosition(index, displayResult).x" :y="astroSignPosition(index, displayResult).y" text-anchor="middle"><title>{{ sign }}</title>{{ zodiacSymbols[index] }}</text>
                        </g>
                        <g class="astro-house-numbers">
                          <text v-for="(house, index) in displayResult.houses" :key="`house-number-${house.house}`" :x="astroPolar(astroHouseMidLongitude(index, displayResult), 128, displayResult).x" :y="astroPolar(astroHouseMidLongitude(index, displayResult), 128, displayResult).y" text-anchor="middle">{{ house.house }}</text>
                        </g>
                        <g class="astro-axis-labels">
                          <text v-for="angle in displayResult.angles" :key="`axis-label-${angle.name}`" :x="astroPolar(angle.longitude, 236, displayResult).x" :y="astroPolar(angle.longitude, 236, displayResult).y" text-anchor="middle">{{ astroAxisLabel(angle) }}</text>
                        </g>
                        <g class="astro-planet-markers">
                          <template v-for="(point, index) in astroChartPlanets(displayResult)" :key="`planet-${point.name}`"><line class="astro-planet-leader" :x1="astroPolar(point.longitude, 151, displayResult).x" :y1="astroPolar(point.longitude, 151, displayResult).y" :x2="astroPolar(point.longitude, astroPlanetRadius(index), displayResult).x" :y2="astroPolar(point.longitude, astroPlanetRadius(index), displayResult).y" /><g class="astro-planet-marker"><circle :cx="astroPolar(point.longitude, astroPlanetRadius(index), displayResult).x" :cy="astroPolar(point.longitude, astroPlanetRadius(index), displayResult).y" r="11" /><text :x="astroPolar(point.longitude, astroPlanetRadius(index), displayResult).x" :y="astroPolar(point.longitude, astroPlanetRadius(index), displayResult).y + 4" text-anchor="middle"><title>{{ point.label }} · {{ point.formatted }}{{ point.retrograde ? ' · 逆行' : '' }}</title>{{ astroPointSymbol(point) }}</text></g></template>
                        </g>
                        <text class="astro-wheel-center" x="250" y="246" text-anchor="middle">{{ zodiacSymbols[Math.floor((astroAscendant(displayResult)?.longitude ?? 0) / 30) % 12] }}</text>
                        <text class="astro-wheel-center-caption" x="250" y="266" text-anchor="middle">{{ displayResult.birth.name || '本命盘' }}</text>
                      </svg>
                    </div>
                    <div class="astro-wheel-key"><span><i class="aspect-dot conjunction"></i>合相</span><span><i class="aspect-dot supportive"></i>和谐相位</span><span><i class="aspect-dot tense"></i>张力相位</span></div>
                  </section>
                  <aside class="astro-chart-side">
                    <section class="astro-side-block astro-planet-block"><div class="astro-side-heading"><span>行星重点</span><small>水星至土星</small></div><div class="astro-planet-grid"><div v-for="item in astroSupportingPlanets(displayResult)" :key="`support-${item.point.name}`"><b>{{ astroPointSymbol(item.point) }}</b><span><small>{{ item.meaning }}</small><strong>{{ item.point.label }} · {{ astroPointPosition(item.point) }}</strong></span><em v-if="item.point.retrograde">逆行</em></div></div></section>
                    <section v-if="astroAnnualScope(displayResult)" class="astro-side-block astro-transit-block"><div class="astro-side-heading"><span>{{ currentFortuneYear }} 流年</span><small>返照 · 次限 · 太阳弧</small></div><div class="astro-transit-grid"><div><span>太阳返照</span><strong>{{ formatAstroAnnualDate(astroAnnualScope(displayResult)?.solarReturnEvidence?.dateTime) || '本年无可用时刻' }}</strong><small>{{ formatAstroAnnualAspects(astroAnnualScope(displayResult)?.solarReturnEvidence?.aspects) || '主要相位待合参' }}</small></div><div><span>次限推进</span><strong>{{ formatAstroAnnualDate(astroAnnualScope(displayResult)?.secondaryProgressionEvidence?.progressedDateTime) || '本年无可用日期' }}</strong><small>{{ formatAstroAnnualAspects(astroAnnualScope(displayResult)?.secondaryProgressionEvidence?.aspects) || '主要相位待合参' }}</small></div><div><span>太阳弧</span><strong>{{ astroAnnualScope(displayResult)?.solarArcEvidence?.arcDegrees === undefined ? '本年无可用弧度' : `${astroAnnualScope(displayResult)?.solarArcEvidence?.arcDegrees?.toFixed(2)}°` }}</strong><small>{{ formatAstroAnnualAspects(astroAnnualScope(displayResult)?.solarArcEvidence?.aspects) || '主要相位待合参' }}</small></div></div></section>
                    <section class="astro-side-block astro-axis-block"><div class="astro-side-heading"><span>四轴定位</span><small>上升 · 天底 · 下降 · 天顶</small></div><div class="astro-axis-compact"><div v-for="angle in displayResult.angles" :key="angle.name"><span>{{ astroAxisLabel(angle) }} · {{ angle.label }}</span><strong>{{ astroPointPosition(angle, false) }}</strong></div></div></section>
                    <details class="astro-data-fold"><summary><span>完整落点与宫位</span><small>{{ displayResult.planets.length + displayResult.houses.length }} 项</small><ChevronDown :size="14" /></summary><div class="astro-detail-list"><div v-for="point in displayResult.planets" :key="`detail-planet-${point.name}`"><span>{{ astroPointSymbol(point) }} {{ point.label }}<i v-if="point.retrograde">逆</i></span><strong>{{ astroPointPosition(point) }}</strong></div><div v-for="house in displayResult.houses" :key="`detail-house-${house.name}`"><span>第{{ house.house }}宫</span><strong>{{ astroPointPosition(house, false) }}</strong></div></div></details>
                    <details class="astro-data-fold"><summary><span>主要相位</span><small>{{ astroMajorAspects(displayResult).length }} 组</small><ChevronDown :size="14" /></summary><div class="astro-aspect-list"><div v-for="aspect in astroMajorAspects(displayResult)" :key="`aspect-${aspect.body1}-${aspect.body2}-${aspect.type}`"><span>{{ astroAspectBodyLabel(displayResult, aspect.body1) }} {{ aspect.symbol }} {{ astroAspectBodyLabel(displayResult, aspect.body2) }}</span><small :style="{ color: astroAspectColor(aspect.type) }">{{ aspect.type }} · 容许度 {{ aspect.orb.toFixed(1) }}°</small></div></div></details>
                  </aside>
                </div>
              </div>
           </div>
           <div v-if="aiAnswer || aiError || isInterpreting" class="ai-reading-card">
             <div class="ai-reading-title"><Sparkles :size="15" /><strong>AI 解读</strong></div>
             <p v-if="isInterpreting" class="ai-typing">正在观象……</p>
             <template v-else-if="aiError"><p class="ai-error">{{ aiError }}</p><AiPromptFallback v-if="lastAiRequest" :request="lastAiRequest" @retry="retryLastInterpretation" /></template>
             <template v-else><ChatMarkdown :content="aiAnswer" /><AiReadingActions :content="aiAnswer" title="排盘解读" /></template>
           </div>
        </section>
      </main>

      <ManualDivinationDialog
        v-if="pendingManualKind"
        :kind="pendingManualKind"
        :qimen-scope="settings.qimenScope"
        :initial-mode="appPreferences.castingPreference"
        @close="closeManualReading"
        @complete="finishManualReading"
      />

      <UiDialogShell v-if="showReadingModal && selectedReadingMessage" aria-label="查看排盘详情" size="wide" :panel-class="{ 'reading-modal': true, 'traditional-reading-modal': ['meihua', 'liuyao', 'ssgw', 'xiaoliuren', 'jinkoujue', 'qimen', 'liuren', 'taiyi', 'wuyun-liuqi', 'huangji-jingshi'].includes(selectedReadingMessage.method) }" @close="closeReadingModal">
          <UiDialogHeader
            :title="readingDisplayTitle(selectedReadingMessage)"
            :eyebrow="kindMeta[selectedReadingMessage.method].label"
            :description="readingDisplaySubtitle(selectedReadingMessage)"
            close-label="关闭排盘详情"
            @close="closeReadingModal"
          />
          <TraditionalReading
            v-if="['meihua', 'liuyao', 'ssgw', 'xiaoliuren', 'jinkoujue', 'qimen', 'liuren', 'taiyi', 'wuyun-liuqi', 'huangji-jingshi'].includes(selectedReadingMessage.method)"
            :method="selectedReadingMessage.method"
            :result="selectedReadingMessage.reading"
          />
          <template v-else>
            <div class="reading-modal-summary"><Sparkles :size="15" /><span>{{ formatReadingSummary(selectedReadingMessage.method, selectedReadingMessage.reading) }}</span></div>
            <div class="reading-detail-grid"><div v-for="row in readingModalRows" :key="row.label" class="reading-detail-row"><span>{{ row.label }}</span><strong>{{ row.value }}</strong></div></div>
          </template>
      </UiDialogShell>

      <UiDialogShell v-if="showInspirationModal" aria-label="问题灵感" panel-class="inspiration-modal" @close="closeInspirationModal">
          <UiDialogHeader
            :title="inspirationMode === 'matter' ? '问事' : '命书'"
            eyebrow="问题灵感"
            :description="inspirationMode === 'matter' ? '从人生大事到日常琐碎，都可以找到具体问法' : '选择一个主题，系统会在解读时自动展开完整专业框架'"
            close-label="关闭问题灵感"
            @close="closeInspirationModal"
          />
          <UiSegmentedControl
            class="inspiration-mode-tabs"
            :model-value="inspirationMode"
            :items="[{ value: 'matter', label: '问事', description: '具体事情与当下选择' }, { value: 'natal', label: '命书', description: '命盘结构与运势周期' }]"
            label="灵感类型"
            equal
            @update:model-value="chooseInspirationMode($event as InspirationMode)"
          />
          <p class="inspiration-mode-guide">{{ inspirationMode === 'matter' ? '可问趋势、关系、选择、时机、行动与风险。选择一个相近的问题后，还可以在输入框里补充你的实际情况。' : '选择一个完整专题。界面只显示简洁主题，发送时会自动加入一整套高密度分析框架。' }}</p>
          <label class="inspiration-search"><Search :size="15" /><input v-model="inspirationSearch" type="search" :aria-label="`搜索${inspirationMode === 'matter' ? '问事' : '命书'}灵感`" :placeholder="inspirationMode === 'matter' ? '搜索想问的事情' : '搜索命盘主题或专业术语'" /></label>
          <div v-if="inspirationMode === 'natal' && filteredInspirationGroups.length" class="inspiration-natal-list">
            <button v-for="group in filteredInspirationGroups" :key="group.key" type="button" class="inspiration-natal-item" :class="{ selected: question === group.questions[0]?.text }" @click="chooseNatalInspiration(group)"><span class="inspiration-group-icon">{{ group.icon }}</span><span class="inspiration-group-copy"><strong>{{ group.label }}</strong><small>{{ group.description }}</small></span><ChevronRight :size="15" /></button>
          </div>
          <div v-else-if="inspirationMode === 'matter' && filteredInspirationGroups.length" class="inspiration-tree">
            <section v-for="group in filteredInspirationGroups" :key="group.key" class="inspiration-group" :class="{ expanded: inspirationSearch.trim() || expandedInspirationGroups.includes(group.key) }">
              <button type="button" class="inspiration-group-toggle" :aria-expanded="Boolean(inspirationSearch.trim()) || expandedInspirationGroups.includes(group.key)" @click="toggleInspirationGroup(group.key)"><span class="inspiration-group-icon">{{ group.icon }}</span><span class="inspiration-group-copy"><strong>{{ group.label }}</strong><small>{{ group.description }}</small></span><ChevronDown :size="15" /></button>
              <div v-if="inspirationSearch.trim() || expandedInspirationGroups.includes(group.key)" class="inspiration-leaves"><button v-for="item in group.questions" :key="item.text" type="button" class="inspiration-leaf" :class="{ selected: question === item.text }" @click="chooseInspiration(item)"><span>{{ item.label }}</span><strong>{{ item.text }}</strong><ChevronRight :size="14" /></button></div>
            </section>
          </div>
          <div v-if="!filteredInspirationGroups.length" class="inspiration-empty"><Search :size="17" /><span>没有找到相关问题</span></div>
      </UiDialogShell>

      <UiDialogShell v-if="showAlmanacSearchModal" labelledby="almanac-search-title" panel-class="almanac-search-modal" @close="closeAlmanacSearch">
          <UiDialogHeader title="高级择日" title-id="almanac-search-title" :description="settings.almanacTopic ? `${almanacParticipantSummary} · ${activeAlmanacRangeLabel} · ${filteredAlmanacSearchItems.length} 个可用日期` : `${almanacParticipantSummary} · ${activeAlmanacRangeLabel}`" close-label="关闭高级择日" @close="closeAlmanacSearch" />
          <UiNotice v-if="almanacMode === 'general'" tone="info" compact>
            切换到个人历，可结合出生信息筛选日期。
            <template #action><UiButton variant="secondary" size="small" @click="chooseAlmanacMode('personal')">切换个人历</UiButton></template>
          </UiNotice>
          <div class="almanac-query-form">
            <label>事项<select v-model="settings.almanacTopic" @change="updateAlmanacTopic"><option value="" disabled>请选择事项</option><optgroup v-for="group in almanacTopicGroups" :key="group.label" :label="group.label"><option v-for="item in group.options" :key="item.value" :value="item.value">{{ item.label }}</option></optgroup></select></label>
            <label>范围<select v-model="almanacRangeMonths" @change="updateAlmanacRange"><option v-for="item in almanacRangeOptions" :key="item.value" :value="item.value">{{ item.label }}</option></select></label>
          </div>
          <div class="almanac-search-modal-body">
            <p v-if="!settings.almanacTopic" class="almanac-search-message">请选择要安排的事项</p>
            <p v-else-if="almanacSearchLoading" class="almanac-search-message"><LoaderCircle class="spin" :size="14" />正在筛选日期…</p>
            <UiNotice v-else-if="almanacSearchError" tone="error" compact>{{ almanacSearchError }}</UiNotice>
            <div v-else-if="filteredAlmanacSearchItems.length" class="almanac-search-list">
              <button v-for="item in filteredAlmanacSearchItems" :key="item.day.date" type="button" class="almanac-search-item" :class="[almanacLevelClass(item.evaluation.level), { active: selectedAlmanacDay?.date === item.day.date }]" @click="selectAlmanacSearchDay(item)">
                <span><strong>{{ almanacDateTitle(item.day.date) }}</strong><small>{{ item.day.weekday }}</small></span>
                <small class="almanac-search-reason">{{ item.evaluation.reason }}</small>
                <em v-if="almanacSearchHourLabel(item.day)">{{ almanacSearchHourLabel(item.day) }}</em>
                <b>{{ item.evaluation.level }}</b>
              </button>
            </div>
            <p v-else class="almanac-search-message">当前范围没有明确适合此事项的日期，可以扩大范围再看。</p>
          </div>
      </UiDialogShell>

      <UIPickerView
        v-if="fortuneDatePicker.open"
        :title="fortuneDatePickerTitle"
        :columns="fortuneDatePickerColumns"
        :model-value="fortuneDatePicker.values"
        @update:model-value="updateFortuneDatePickerValues"
        @cancel="closeFortuneDatePicker"
        @confirm="confirmFortuneDatePicker"
      />

      <UIPickerView
        v-if="birthPicker.open"
        :title="birthPickerTitle"
        :columns="birthPickerColumns"
        :model-value="birthPicker.values"
        @update:model-value="updateBirthPickerValues"
        @cancel="closeBirthPicker"
        @confirm="confirmBirthPicker"
      />

      <UiDialogShell v-if="showCaseEditor" aria-label="编辑案例" panel-class="case-form-card case-editor case-editor-dialog" @close="closeCaseEditor">
          <UiDialogHeader :title="editableCase.label" eyebrow="案例资料" description="出生资料" close-label="关闭编辑" @close="closeCaseEditor">
            <template v-if="!editableCase.isDefault" #action><UiButton variant="danger" size="small" icon-only aria-label="删除案例" @click="deleteCase"><Trash2 :size="16" /></UiButton></template>
          </UiDialogHeader>
          <div class="form-grid">
            <UiTextField v-model="editableCase.label" label="案例名称" placeholder="例如：家人案例" />
            <UiTextField v-model="editableCase.name" label="姓名" placeholder="可选" />
            <div class="birth-picker-control"><span>性别</span><button type="button" class="birth-picker-trigger" aria-label="选择性别" @click="openBirthPicker('gender', 'editor')"><UserRound :size="16" /><strong>{{ birthPickerFieldValue('gender', editableCase) }}</strong><ChevronRight :size="15" /></button></div>
            <div class="birth-picker-control"><span>出生历法</span><button type="button" class="birth-picker-trigger" aria-label="选择出生历法" @click="openBirthPicker('calendar', 'editor')"><CalendarDays :size="16" /><strong>{{ birthPickerFieldValue('calendar', editableCase) }}</strong><ChevronRight :size="15" /></button></div>
            <div class="birth-picker-control"><span>出生日期</span><button type="button" class="birth-picker-trigger" aria-label="选择出生日期" @click="openBirthPicker('date', 'editor')"><CalendarDays :size="16" /><strong>{{ birthPickerFieldValue('date', editableCase) }}</strong><ChevronRight :size="15" /></button></div>
            <div class="birth-picker-control"><span>出生时间</span><button type="button" class="birth-picker-trigger" aria-label="选择出生时间" @click="openBirthPicker('time', 'editor')"><Clock3 :size="16" /><strong>{{ birthPickerFieldValue('time', editableCase) }}</strong><ChevronRight :size="15" /></button></div>
            <div class="birth-picker-control birth-picker-region"><span>出生地区</span><button type="button" class="birth-picker-trigger" aria-label="选择出生地区" @click="openBirthPicker('region', 'editor')"><MapPin :size="16" /><strong>{{ birthPickerFieldValue('region', editableCase) }}</strong><ChevronRight :size="15" /></button></div>
          </div>
          <div v-if="currentCalendar" class="birth-calendar"><div><small>公历</small><strong>{{ currentCalendar.solar }}</strong></div><div><small>农历</small><strong>{{ currentCalendar.lunar }}</strong></div><div><small>干支</small><strong>{{ currentCalendar.ganzhi }}</strong></div><div><small>节气 / 时辰</small><strong>{{ currentCalendar.jieqi }} · {{ currentCalendar.shichen }}</strong></div></div>
          <div v-if="currentCalendar?.trueSolar" class="solar-details"><div><small>真太阳时</small><strong>{{ currentCalendar.trueSolar.correctedDateTime }}</strong></div><div><small>校正时辰</small><strong>{{ currentCalendar.trueSolar.shichen }}</strong></div><div><small>经度修正</small><strong>{{ currentCalendar.trueSolar.longitudeCorrectionMinutes.toFixed(1) }} 分钟</strong></div><div><small>均时差</small><strong>{{ currentCalendar.trueSolar.equationOfTimeMinutes.toFixed(1) }} 分钟</strong></div><div><small>总修正</small><strong>{{ currentCalendar.trueSolar.totalCorrectionMinutes.toFixed(1) }} 分钟</strong></div></div>
          <UiActionBar><UiButton @click="saveCurrentCase"><Check :size="15" />保存案例</UiButton></UiActionBar>
          <UiNotice v-if="caseError" class="case-form-notice" tone="error" compact>{{ caseError }}</UiNotice>
      </UiDialogShell>

      <div v-if="showOnboarding" class="onboarding-layer">
        <section class="onboarding-dialog" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
          <header class="onboarding-header">
            <div class="onboarding-brand"><img src="/logo.webp" alt="" aria-hidden="true" /><div><span>首次设置</span><h2 id="onboarding-title">{{ onboardingSteps[onboardingStep] }}</h2></div></div>
            <small>{{ onboardingStep + 1 }} / {{ onboardingSteps.length }}</small>
          </header>
          <nav class="onboarding-progress" aria-label="设置进度">
            <button v-for="(step, index) in onboardingSteps" :key="step" type="button" :class="{ active: onboardingStep === index, done: onboardingStep > index }" :disabled="index > onboardingStep" @click="goToOnboardingStep(index)"><span>{{ onboardingStep > index ? '✓' : index + 1 }}</span><b>{{ step }}</b></button>
          </nav>

          <div class="onboarding-body">
            <template v-if="onboardingStep === 0">
              <div class="onboarding-copy"><h3>添加常用案例</h3><p>出生资料只保存在当前浏览器，用于排盘时自动载入。</p></div>
              <div v-if="cases.length" class="onboarding-case-ready"><span class="case-avatar">{{ defaultCase.label.slice(0, 1) }}</span><span><strong>{{ defaultCase.label }}</strong><small>{{ formatCaseDate(defaultCase) }} · {{ defaultCase.time }} · {{ defaultCase.locationName }}</small></span><Check :size="17" /></div>
              <template v-else>
                <div class="onboarding-case-grid">
                  <UiTextField v-model="onboardingCase.label" label="案例名称" autocomplete="off" placeholder="例如：我的案例" />
                  <div class="birth-picker-control"><span>性别</span><button type="button" class="birth-picker-trigger" aria-label="选择性别" @click="openBirthPicker('gender', 'onboarding')"><UserRound :size="16" /><strong>{{ birthPickerFieldValue('gender', onboardingCase) }}</strong><ChevronRight :size="15" /></button></div>
                  <div class="birth-picker-control"><span>出生历法</span><button type="button" class="birth-picker-trigger" aria-label="选择出生历法" @click="openBirthPicker('calendar', 'onboarding')"><CalendarDays :size="16" /><strong>{{ birthPickerFieldValue('calendar', onboardingCase) }}</strong><ChevronRight :size="15" /></button></div>
                  <div class="birth-picker-control"><span>出生日期</span><button type="button" class="birth-picker-trigger" aria-label="选择出生日期" @click="openBirthPicker('date', 'onboarding')"><CalendarDays :size="16" /><strong>{{ birthPickerFieldValue('date', onboardingCase) }}</strong><ChevronRight :size="15" /></button></div>
                  <div class="birth-picker-control"><span>出生时间</span><button type="button" class="birth-picker-trigger" aria-label="选择出生时间" @click="openBirthPicker('time', 'onboarding')"><Clock3 :size="16" /><strong>{{ birthPickerFieldValue('time', onboardingCase) }}</strong><ChevronRight :size="15" /></button></div>
                  <div class="birth-picker-control birth-picker-region"><span>出生地区</span><button type="button" class="birth-picker-trigger" aria-label="选择出生地区" @click="openBirthPicker('region', 'onboarding')"><MapPin :size="16" /><strong>{{ birthPickerFieldValue('region', onboardingCase) }}</strong><ChevronRight :size="15" /></button></div>
                </div>
                <div v-if="onboardingCalendar?.trueSolar" class="onboarding-solar-result"><span>真太阳时</span><strong>{{ onboardingCalendar.trueSolar.correctedDateTime }}</strong><small>{{ onboardingCalendar.trueSolar.shichen }} · 共修正 {{ onboardingCalendar.trueSolar.totalCorrectionMinutes.toFixed(1) }} 分钟</small></div>
              </template>
              <p v-if="onboardingError" class="onboarding-error">{{ onboardingError }}</p>
              <div class="onboarding-actions"><UiButton class="onboarding-master-skip" variant="ghost" size="small" @click="skipOnboardingAsMaster">熟悉术数，直接跳过</UiButton><div><UiButton v-if="!cases.length" variant="secondary" @click="skipOnboardingCase">暂不添加</UiButton><UiButton @click="cases.length ? continueOnboarding() : saveOnboardingCase()">{{ cases.length ? '继续' : '保存并继续' }}<ChevronRight :size="15" /></UiButton></div></div>
            </template>

            <template v-else-if="onboardingStep === 1">
              <div class="onboarding-copy"><h3>选择解答风格</h3><p>决定 AI 如何组织判断和表达结果，之后可以在设置中修改。</p></div>
              <div class="onboarding-choice-list">
                <button v-for="item in answerPreferenceOptions" :key="item.value" type="button" :class="{ active: appPreferences.answerPreference === item.value }" @click="chooseAnswerPreference(item.value)"><span>{{ item.mark }}</span><div><strong>{{ item.label }}</strong><small>{{ item.description }}</small></div><Check v-if="appPreferences.answerPreference === item.value" :size="16" /></button>
              </div>
              <div class="onboarding-actions"><UiButton class="onboarding-master-skip" variant="ghost" size="small" @click="skipOnboardingAsMaster">熟悉术数，直接跳过</UiButton><div><UiButton variant="secondary" @click="goToOnboardingStep(0)"><ArrowLeft :size="15" />返回</UiButton><UiButton @click="continueOnboarding">继续<ChevronRight :size="15" /></UiButton></div></div>
            </template>

            <template v-else-if="onboardingStep === 2">
              <div class="onboarding-copy"><h3>选择内容层级</h3><p>控制工具选择、盘面信息和术语的显示深度。</p></div>
              <div class="onboarding-level-grid">
                <button type="button" :class="{ active: appPreferences.displayLevel === 'basic' }" @click="chooseDisplayLevel('basic')"><strong>0 基础</strong><span>AI 自动选择方式，只看易懂解答</span><Check v-if="appPreferences.displayLevel === 'basic'" :size="16" /></button>
                <button type="button" :class="{ active: appPreferences.displayLevel === 'beginner' }" @click="chooseDisplayLevel('beginner')"><strong>小白</strong><span>可选核心术式，保留少量术语</span><Check v-if="appPreferences.displayLevel === 'beginner'" :size="16" /></button>
                <button type="button" :class="{ active: appPreferences.displayLevel === 'master' }" @click="chooseDisplayLevel('master')"><strong>完整</strong><span>全部工具、盘面和推演信息</span><Check v-if="appPreferences.displayLevel === 'master'" :size="16" /></button>
              </div>
              <div class="onboarding-actions"><UiButton class="onboarding-master-skip" variant="ghost" size="small" @click="skipOnboardingAsMaster">熟悉术数，直接跳过</UiButton><div><UiButton variant="secondary" @click="goToOnboardingStep(1)"><ArrowLeft :size="15" />返回</UiButton><UiButton @click="continueOnboarding">继续<ChevronRight :size="15" /></UiButton></div></div>
            </template>

            <template v-else-if="onboardingStep === 3">
              <div class="onboarding-copy"><h3>选择默认起法</h3><p>自动起卦会直接进入解读；手动起卦可亲自取数、摇卦或指定结果。</p></div>
              <div class="onboarding-choice-list">
                <button type="button" :class="{ active: appPreferences.castingPreference === 'auto' }" @click="chooseCastingPreference('auto')"><span>自</span><div><strong>自动起卦</strong><small>默认由电脑完成起卦</small></div><Check v-if="appPreferences.castingPreference === 'auto'" :size="16" /></button>
                <button type="button" :class="{ active: appPreferences.castingPreference === 'manual' }" @click="chooseCastingPreference('manual')"><span>手</span><div><strong>手动起卦</strong><small>默认亲自取数、摇卦或确认起课</small></div><Check v-if="appPreferences.castingPreference === 'manual'" :size="16" /></button>
              </div>
              <div class="onboarding-actions"><UiButton class="onboarding-master-skip" variant="ghost" size="small" @click="skipOnboardingAsMaster">熟悉术数，直接跳过</UiButton><div><UiButton variant="secondary" @click="goToOnboardingStep(2)"><ArrowLeft :size="15" />返回</UiButton><UiButton @click="continueOnboarding">继续<ChevronRight :size="15" /></UiButton></div></div>
            </template>

            <template v-else-if="onboardingStep === 4">
              <div class="onboarding-copy"><h3>选择 AI</h3><p>选择负责生成解答的渠道和模型。</p></div>
              <div class="onboarding-ai-fields">
                <label><span>AI 渠道</span><select v-model="onboardingAiChannelId" @change="onboardingError = ''"><option v-for="channel in appPreferences.aiChannels" :key="channel.id" :value="channel.id">{{ channel.name }}</option></select></label>
                <label v-if="onboardingAiChannel.provider !== 'builtin'"><span>接口协议</span><select v-model="onboardingAiChannel.apiType" @change="onboardingError = ''"><option v-for="option in aiApiTypeOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select></label>
                <UiTextField v-if="onboardingAiChannel.provider !== 'builtin' && !onboardingAiChannel.preset" v-model="onboardingAiChannel.baseUrl" class="onboarding-ai-key" label="接口地址" type="url" autocomplete="url" placeholder="https://api.example.com/v1" @update:model-value="invalidateAiModels(onboardingAiChannel)" />
                <UiTextField v-if="onboardingAiChannel.provider !== 'builtin'" v-model="onboardingAiChannel.apiKey" class="onboarding-ai-key" label="API Key" type="password" autocomplete="off" placeholder="填写对应渠道的 Key" @update:model-value="onboardingError = ''" />
                <div v-if="onboardingAiChannel.provider !== 'builtin'" class="onboarding-model-row"><UiButton variant="secondary" :loading="isLoadingAiModels" :disabled="!onboardingAiChannel.baseUrl.trim() || !onboardingAiChannel.apiKey.trim()" @click="loadAiModels(onboardingAiChannel, 'onboarding')"><RefreshCw v-if="!isLoadingAiModels" :size="14" />{{ isLoadingAiModels ? '获取中…' : '获取模型' }}</UiButton><label><span>模型</span><select v-if="onboardingAiModelOptions.length" v-model="selectedOnboardingAiModel"><option v-for="model in onboardingAiModelOptions" :key="model" :value="model">{{ model }}</option></select><span v-else class="onboarding-model-empty">请先获取模型</span></label></div>
              </div>
              <div class="onboarding-ai-current"><span><strong>{{ onboardingAiChannel.name }}</strong><small>{{ onboardingAiChannel.provider === 'builtin' ? '内置 AI' : onboardingAiChannel.model || '尚未选择模型' }}</small></span><Check v-if="isOnboardingAiReady" :size="17" /></div>
              <p class="onboarding-note">{{ onboardingAiChannel.provider === 'builtin' ? '使用站点提供的默认解答服务。' : '第三方渠道完成接口、密钥和模型配置后才能继续。' }}</p>
              <p v-if="onboardingError" class="onboarding-error">{{ onboardingError }}</p>
              <div class="onboarding-actions"><UiButton class="onboarding-master-skip" variant="ghost" size="small" @click="skipOnboardingAsMaster">熟悉术数，直接跳过</UiButton><div><UiButton variant="secondary" @click="goToOnboardingStep(3)"><ArrowLeft :size="15" />返回</UiButton><UiButton :disabled="isLoadingAiModels" @click="continueOnboardingAi">继续<ChevronRight :size="15" /></UiButton></div></div>
            </template>

            <template v-else>
              <div class="onboarding-copy"><h3>使用前请知悉</h3><p>占卜与解读不能替代事实核验和专业判断。</p></div>
              <div class="onboarding-disclaimer"><Sparkles :size="20" /><p>本产品的占卜、排盘解读及问答内容均由 AI 生成，仅供娱乐与自我观察，不代表事实判断，也不构成医疗、法律、投资、心理或其他专业建议。请勿据此作出重要决定。</p></div>
              <label class="onboarding-consent"><input v-model="onboardingDisclaimerAccepted" type="checkbox" /><span>我已知悉内容由 AI 生成</span></label>
              <p v-if="onboardingError" class="onboarding-error">{{ onboardingError }}</p>
              <div class="onboarding-actions"><UiButton class="onboarding-master-skip" variant="ghost" size="small" @click="skipOnboardingAsMaster">熟悉术数，直接跳过</UiButton><div><UiButton variant="secondary" @click="goToOnboardingStep(4)"><ArrowLeft :size="15" />返回</UiButton><UiButton :disabled="!onboardingDisclaimerAccepted" @click="finishOnboarding"><Check :size="15" />完成设置</UiButton></div></div>
            </template>
          </div>
        </section>
      </div>

      <div v-if="showHistory" class="drawer-layer" @click.self="showHistory = false">
        <aside class="history-drawer">
          <div class="drawer-title">
            <div><span class="eyebrow">本机记录</span><h2>记录</h2></div>
            <UiButton variant="ghost" icon-only aria-label="关闭记录" @click="showHistory = false"><X :size="18" /></UiButton>
          </div>
          <div class="search-box"><Search :size="15" /><input v-model="historySearch" type="search" placeholder="搜索问题、工具或案例" /></div>
          <div class="history-filters">
            <label><span>类型</span><select v-model="historyCategory" aria-label="按记录类型筛选"><option value="all">全部类型</option><option value="divination">占卜</option><option value="oracle">灵签</option><option value="chart">排盘</option></select></label>
            <label><span>工具</span><select v-model="historyMethod" aria-label="按工具筛选"><option value="all">全部工具</option><option v-for="method in historyMethodOptions" :key="method" :value="method">{{ method }}</option></select></label>
            <label><span>解读</span><select v-model="historyInterpretation" aria-label="按 AI 解读状态筛选"><option value="all">全部状态</option><option value="interpreted">已解读</option><option value="pending">未解读</option></select></label>
          </div>
          <div class="history-filter-summary">
            <span>{{ filteredHistory.length }} 条<span v-if="hasActiveHistoryFilters"> / 共 {{ history.length }} 条</span></span>
            <UiButton v-if="hasActiveHistoryFilters" variant="ghost" size="small" @click="resetHistoryFilters">清除筛选</UiButton>
          </div>
          <div v-if="filteredHistory.length" class="record-list">
            <button v-for="record in filteredHistory" :key="record.id" class="record-row" type="button" @click="openRecord(record)">
              <span class="record-icon">{{ historyRecordMeta(record).icon }}</span>
              <span class="record-main">
                <strong>{{ record.question }}</strong>
                <small><span>{{ record.methodLabel }} · {{ formatReadingTime(record.createdAt) }}</span><em :class="{ ready: record.interpretation?.trim(), running: isHistoryRecordRunning(record.id) }">{{ isHistoryRecordRunning(record.id) ? '解读中' : record.interpretation?.trim() ? '已解读' : '未解读' }}</em></small>
              </span>
              <ChevronRight :size="15" />
            </button>
          </div>
          <div v-else class="drawer-empty"><Clock3 :size="18" /><span>{{ history.length ? '没有符合条件的记录' : '还没有记录' }}</span><UiButton v-if="history.length && hasActiveHistoryFilters" variant="ghost" size="small" @click="resetHistoryFilters">清除筛选</UiButton></div>
        </aside>
      </div>
      <LegacyHistoryDetail v-if="selectedLegacyHistory" :record="selectedLegacyHistory" @close="selectedLegacyHistory = null" />

      <Transition name="app-toast">
        <div v-if="toastMessage" class="app-toast" role="status" aria-live="polite">{{ toastMessage }}</div>
      </Transition>

    </div>
  </div>
</template>
