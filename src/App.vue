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
  Copy,
  Grid2X2,
  Heart,
  HeartHandshake,
  History,
  House,
  ImageDown,
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
  FileText,
  ScrollText,
  Sparkles,
  Star,
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
import type { BaziChartResult, FortuneSelectionContext, FortuneTriggerLayer } from 'mingyu-core/bazi';
import type { WuyunLiuqiResult } from 'mingyu-core/wuyun-liuqi';
import type { HuangjiJingshiResult } from 'mingyu-core/huangji-jingshi';
import { getBirthDateValidationMessage } from 'mingyu-core/calendar';
import type {
  BirthPlaceCascadePath,
  BirthPlaceCityOption,
  BirthPlaceDistrictOption,
  BirthPlaceProvinceOption,
  ResolvedBirthPlace,
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
  getImmediateActiveDivinationSelection,
  getLocalAgentSelection,
  requestAgentToolSelection,
  shouldContinueExistingDivination,
  type AgentToolSelection,
  type AgentAstrolabeFortune,
  type AgentZiweiFortune,
} from './lib/agent';
import type { BaziFortuneRequest, ChartReadingPromptOptions } from './lib/chartPrompt';
import {
  filterCommonBaziShensha,
  formatBaziTimingBasis,
  resolveSelectedBaziFortuneGanZhi,
  summarizeBaziFortuneTriggers,
} from './lib/baziPresentation';
import {
  getPromptSchoolChoiceOptions,
  getPromptSchoolMethod,
  isPromptSchoolChoiceEnabled,
  normalizePromptSchoolChoices,
  resolvePromptSchoolIds,
  type PromptSchoolChoice,
} from './lib/promptSchools';
import type { PromptSchoolMethod } from 'mingyu-core/prompt';
import { buildUpdateReloadUrl } from './lib/appUpdate';
import {
  probeDownloadRoutes,
  selectBestDownloadRoute,
  type DownloadRouteProbe,
  type NativeDownloadRoute,
} from './lib/updateRoutes';
import {
  buildAppRouteHash,
  parseAppRoute,
  type AppRouteCasesSection,
  type AppRouteSettingsSection,
  type AppRouteView,
} from './lib/appRoute';
import { scheduleAfterPageLoad } from './lib/deferredWork';
import type { DailyHexagramResult } from './lib/dailyHexagram';
import type { TarotReadingResult, WesternInterpretationPayload, WesternReadingResult } from './lib/tarot';
import {
  createChatDocument,
  createChatShareImage,
  downloadChatFile,
  type ChatExportItem,
} from './lib/chatExport';
import AiPromptFallback from './components/AiPromptFallback.vue';
import AiReadingActions from './components/AiReadingActions.vue';
import ExternalAiShareButtons from './components/ExternalAiShareButtons.vue';
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
  UiSelect,
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
  updateHistoryInterpretationError,
  type HistoryRecordEntry,
  type LegacyHistoryRecord,
} from './lib/historyImport';
import type { DailyFortuneResult, FortunePeriod } from './lib/dailyFortune';
import type { ModernAlmanacResult } from './lib/modernAlmanac';
import {
  buildInstantAiPrompt,
  buildInstantObserver,
  formatInstantWallClock,
  instantChartNeedsObserver,
  instantChartOptions,
  instantChartSummary,
  instantTimeBasisLabel,
  runInstantChart,
  type InstantChartResponse,
  type InstantChartType,
  type InstantTimeStandard,
} from './lib/instantChart';
import { getCalendarEvents } from './lib/calendarEvents';
import { normalizeSelectedCaseId, type SelectableCaseProfile } from './lib/caseSelection';
import { normalizeStoredTimeBasis } from './lib/caseProfile';
import { parseLocalStorageJson, persistArrayWithOldestEviction } from './lib/localStorage';
import { normalizeToolPreferences, type ToolPreferences } from './lib/toolPreferences';
import {
  AI_KEY_STORAGE_KEY,
  applyStoredAiKeys,
  buildStoredAiKeys,
  normalizeStoredAiKeys,
} from './lib/aiChannelStorage';
import { buildExternalAiPrompt } from './lib/aiPrompt';
import { writeClipboardText } from './lib/clipboard';
import { applyJoytouchCompatibility, clearRememberedAndroidFallback, PREFERENCES_STORAGE_KEY, resolveCurrentJoytouchCompatibility, type JoytouchCompatibilityMode } from './lib/joytouchCompatibility';
import { isNativeAndroidApp, isNativeApp } from './lib/nativeRuntime';
import {
  DIVINATION_CARD_GROUPS,
  DIVINATION_THEMES,
  activeDivinationDeckSelections,
  activeDivinationThemeId,
  activeDivinationThemeLabel,
  activeDivinationThemeLogoPosition,
  activeDivinationThemeStyle,
  getDivinationDeckOptions,
  getDivinationThemeLogoUrl,
  setDivinationDeckSelection,
  setDivinationTheme as applyDivinationTheme,
  getDivinationDeckAssetPackageId,
  type DivinationCardGroup,
  type DivinationDeckSelection,
  type DivinationThemeId,
} from './lib/divinationTheme';
import { ensureThemeAssetPackage, packageIdForTheme, type ThemeAssetProgress } from './lib/themeAssetDownload';
import type {
  AlmanacCalendarDateMeta,
  AlmanacAuspiceLevel,
  AlmanacMode,
  AlmanacPurpose,
  AlmanacPurposeEvaluation,
} from './lib/almanac';

const ManualDivinationDialog = defineAsyncComponent(() => import('./components/ManualDivinationDialog.vue'));
const FengShuiView = defineAsyncComponent(() => import('./components/FengShuiView.vue'));
const CompatibilityView = defineAsyncComponent(() => import('./components/CompatibilityView.vue'));
const DailyHexagramView = defineAsyncComponent(() => import('./components/DailyHexagramView.vue'));
const QizhengChart = defineAsyncComponent(() => import('./components/QizhengChart.vue'));
const XiaoliurenView = defineAsyncComponent(() => import('./components/XiaoliurenView.vue'));
const OracleView = defineAsyncComponent(() => import('./components/OracleView.vue'));
const WesternDivinationView = defineAsyncComponent(() => import('./components/WesternDivinationView.vue'));
const InstantChartDetail = defineAsyncComponent(() => import('./components/InstantChartDetail.vue'));

const themeAssetDownload = reactive<{ active: boolean; label: string; progress: ThemeAssetProgress | null }>({ active: false, label: '', progress: null });
const themeAssetDownloadPercent = computed(() => themeAssetDownload.progress?.totalBytes
  ? Math.round(themeAssetDownload.progress.loadedBytes / themeAssetDownload.progress.totalBytes * 100)
  : 0);

async function downloadThemePackage(packageId: string | null, label: string) {
  if (!packageId || !isNativeApp()) return;
  themeAssetDownload.active = true;
  themeAssetDownload.label = label;
  themeAssetDownload.progress = null;
  try {
    await ensureThemeAssetPackage(packageId, progress => { themeAssetDownload.progress = progress; });
  } finally {
    themeAssetDownload.active = false;
  }
}

async function chooseDivinationTheme(themeId: DivinationThemeId) {
  try {
    const theme = DIVINATION_THEMES.find(item => item.id === themeId);
    await downloadThemePackage(packageIdForTheme(themeId), theme?.label || '主题');
    applyDivinationTheme(themeId);
  } catch (error) {
    showToast(error instanceof Error ? error.message : '主题下载失败，请稍后重试');
  }
}

async function chooseDivinationDeck(group: DivinationCardGroup, value: string | number) {
  const selection = value as DivinationDeckSelection;
  try {
    await downloadThemePackage(getDivinationDeckAssetPackageId(group, selection), '牌组');
    setDivinationDeckSelection(group, selection);
  } catch (error) {
    showToast(error instanceof Error ? error.message : '牌组下载失败，请稍后重试');
  }
}

async function prepareStoredThemeAssets() {
  try {
    await downloadThemePackage(packageIdForTheme(activeDivinationThemeId.value), activeDivinationThemeLabel.value);
    applyDivinationTheme(activeDivinationThemeId.value);
  } catch {
    applyDivinationTheme('yue');
    showToast('已恢复默认主题，其他主题可联网后重新下载。');
  }
  const prepared = new Set<string>();
  for (const group of DIVINATION_CARD_GROUPS) {
    const selection = activeDivinationDeckSelections.value[group.id];
    if (selection === 'theme') continue;
    const packageId = getDivinationDeckAssetPackageId(group.id, selection);
    if (!packageId || prepared.has(packageId)) continue;
    prepared.add(packageId);
    try {
      await downloadThemePackage(packageId, group.label);
      setDivinationDeckSelection(group.id, selection);
    } catch {
      setDivinationDeckSelection(group.id, 'theme');
      showToast(`${group.label}资源不可用，已暂时改为跟随主题。`);
    }
  }
}
const TarotSpreadBoard = defineAsyncComponent(() => import('./components/TarotSpreadBoard.vue'));
const WesternCardBoard = defineAsyncComponent(() => import('./components/WesternCardBoard.vue'));
const LegacyHistoryDetail = defineAsyncComponent(() => import('./components/LegacyHistoryDetail.vue'));

type BaziRuntime = typeof import('mingyu-core/bazi') & typeof import('mingyu-core/ganzhi');
type LocationRuntime = typeof import('mingyu-core/location');
type AlmanacRuntime = typeof import('./lib/almanac') & typeof import('./lib/modernAlmanac');

let baziRuntime: BaziRuntime | null = null;
let baziRuntimePromise: Promise<BaziRuntime> | null = null;
let locationRuntime: LocationRuntime | null = null;
let locationRuntimePromise: Promise<LocationRuntime> | null = null;
let almanacRuntime: AlmanacRuntime | null = null;
let almanacRuntimePromise: Promise<AlmanacRuntime> | null = null;
let almanacTopicGroups: typeof import('./lib/almanac')['almanacTopicGroups'] = [];
let almanacTopicOptions: typeof import('./lib/almanac')['almanacTopicOptions'] = [];

function ensureBaziRuntime() {
  if (baziRuntime) return Promise.resolve(baziRuntime);
  if (!baziRuntimePromise) {
    baziRuntimePromise = Promise.all([
      import('mingyu-core/bazi'),
      import('mingyu-core/ganzhi'),
    ]).then(([bazi, ganzhi]) => {
      baziRuntime = { ...bazi, ...ganzhi } as BaziRuntime;
      return baziRuntime;
    }).catch((error) => {
      baziRuntimePromise = null;
      throw error;
    });
  }
  return baziRuntimePromise;
}

function requireBaziRuntime() {
  if (!baziRuntime) throw new Error('八字功能仍在加载，请稍后重试。');
  return baziRuntime;
}

function ensureLocationRuntime() {
  if (locationRuntime) return Promise.resolve(locationRuntime);
  if (!locationRuntimePromise) {
    locationRuntimePromise = import('mingyu-core/location').then((module) => {
      locationRuntime = module;
      provinceOptions.value = module.getBirthPlaceProvinceOptions();
      return module;
    }).catch((error) => {
      locationRuntimePromise = null;
      throw error;
    });
  }
  return locationRuntimePromise;
}

function requireLocationRuntime() {
  if (!locationRuntime) throw new Error('地区数据仍在加载，请稍后重试。');
  return locationRuntime;
}

function ensureAlmanacRuntime() {
  if (almanacRuntime) return Promise.resolve(almanacRuntime);
  if (!almanacRuntimePromise) {
    almanacRuntimePromise = Promise.all([
      import('./lib/almanac'),
      import('./lib/modernAlmanac'),
    ]).then(([almanac, modern]) => {
      almanacRuntime = { ...almanac, ...modern } as AlmanacRuntime;
      almanacTopicGroups = almanac.almanacTopicGroups;
      almanacTopicOptions = almanac.almanacTopicOptions;
      return almanacRuntime;
    }).catch((error) => {
      almanacRuntimePromise = null;
      throw error;
    });
  }
  return almanacRuntimePromise;
}

function requireAlmanacRuntime() {
  if (!almanacRuntime) throw new Error('黄历功能仍在加载，请稍后重试。');
  return almanacRuntime;
}

function evaluateAlmanacPurposeDay(...args: Parameters<AlmanacRuntime['evaluateAlmanacPurposeDay']>) {
  return requireAlmanacRuntime().evaluateAlmanacPurposeDay(...args);
}

function generateLocalAlmanac(...args: Parameters<AlmanacRuntime['generateLocalAlmanac']>) {
  return requireAlmanacRuntime().generateLocalAlmanac(...args);
}

function getDefaultAlmanacPurpose(...args: Parameters<AlmanacRuntime['getDefaultAlmanacPurpose']>) {
  return requireAlmanacRuntime().getDefaultAlmanacPurpose(...args);
}

function getAlmanacCalendarDateMeta(...args: Parameters<AlmanacRuntime['getAlmanacCalendarDateMeta']>) {
  return requireAlmanacRuntime().getAlmanacCalendarDateMeta(...args);
}

function getAlmanacDateChunks(...args: Parameters<AlmanacRuntime['getAlmanacDateChunks']>) {
  return requireAlmanacRuntime().getAlmanacDateChunks(...args);
}

function getAlmanacMonthRange(...args: Parameters<AlmanacRuntime['getAlmanacMonthRange']>) {
  return requireAlmanacRuntime().getAlmanacMonthRange(...args);
}

function getDefaultAlmanacMonth(...args: Parameters<AlmanacRuntime['getDefaultAlmanacMonth']>) {
  return requireAlmanacRuntime().getDefaultAlmanacMonth(...args);
}

function getAlmanacPeriodRange(...args: Parameters<AlmanacRuntime['getAlmanacPeriodRange']>) {
  return requireAlmanacRuntime().getAlmanacPeriodRange(...args);
}

function shiftAlmanacMonth(...args: Parameters<AlmanacRuntime['shiftAlmanacMonth']>) {
  return requireAlmanacRuntime().shiftAlmanacMonth(...args);
}

function modernizeAlmanacDay(...args: Parameters<AlmanacRuntime['modernizeAlmanacDay']>): ModernAlmanacResult {
  return requireAlmanacRuntime().modernizeAlmanacDay(...args);
}

function getModernAlmanacHours(...args: Parameters<AlmanacRuntime['getModernAlmanacHours']>) {
  return requireAlmanacRuntime().getModernAlmanacHours(...args);
}

function getModernAlmanacPersonalNotes(...args: Parameters<AlmanacRuntime['getModernAlmanacPersonalNotes']>) {
  return requireAlmanacRuntime().getModernAlmanacPersonalNotes(...args);
}

function isAlmanacProfileComplete(profile?: BirthForm | null) {
  if (!profile || !/^\d{4}-\d{2}-\d{2}$/.test(profile.date) || !/^\d{2}:\d{2}$/.test(profile.time)) return false;
  const [year, month, day] = profile.date.split('-').map(Number);
  const [hour, minute] = profile.time.split(':').map(Number);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return false;
  return !getBirthDateValidationMessage({
    year,
    month,
    day,
    dateType: profile.dateType,
    isLeapMonth: profile.dateType === 'lunar' && profile.isLeapMonth,
  });
}

function buildFortuneSelectionContext(...args: Parameters<BaziRuntime['buildFortuneSelectionContext']>) {
  return requireBaziRuntime().buildFortuneSelectionContext(...args);
}

function analyzeFortuneTriggers(...args: Parameters<BaziRuntime['analyzeFortuneTriggers']>) {
  return requireBaziRuntime().analyzeFortuneTriggers(...args);
}

function getLifeStage(...args: Parameters<BaziRuntime['getLifeStage']>) {
  return requireBaziRuntime().getLifeStage(...args);
}

function getLuckCycleForDate(...args: Parameters<BaziRuntime['getLuckCycleForDate']>) {
  return requireBaziRuntime().getLuckCycleForDate(...args);
}

function getTenGod(...args: Parameters<BaziRuntime['getTenGod']>) {
  return requireBaziRuntime().getTenGod(...args);
}

function getNayin(...args: Parameters<BaziRuntime['getNayin']>) {
  return requireBaziRuntime().getNayin(...args);
}

function getNayinWuxing(...args: Parameters<BaziRuntime['getNayinWuxing']>) {
  return requireBaziRuntime().getNayinWuxing(...args);
}

function getBirthPlaceCityOptions(...args: Parameters<LocationRuntime['getBirthPlaceCityOptions']>) {
  return requireLocationRuntime().getBirthPlaceCityOptions(...args);
}

function getBirthPlaceDistrictOptions(...args: Parameters<LocationRuntime['getBirthPlaceDistrictOptions']>) {
  return requireLocationRuntime().getBirthPlaceDistrictOptions(...args);
}

function findBirthPlaceByRegionId(...args: Parameters<LocationRuntime['findBirthPlaceByRegionId']>) {
  return requireLocationRuntime().findBirthPlaceByRegionId(...args);
}

function findBirthPlaceByDisplayName(...args: Parameters<LocationRuntime['findBirthPlaceByDisplayName']>) {
  return requireLocationRuntime().findBirthPlaceByDisplayName(...args);
}

function searchBirthPlaces(...args: Parameters<LocationRuntime['searchBirthPlaces']>) {
  return requireLocationRuntime().searchBirthPlaces(...args);
}

function resolveBirthPlaceApproximateLatitude(...args: Parameters<LocationRuntime['resolveBirthPlaceApproximateLatitude']>) {
  return requireLocationRuntime().resolveBirthPlaceApproximateLatitude(...args);
}

type AppView = AppRouteView;
type SettingsSection = AppRouteSettingsSection;
type CasesSection = AppRouteCasesSection;
type ChartKind = 'bazi' | 'ziwei' | 'astrolabe' | 'qizheng';
type HomeChartKind = ChartKind | 'bazi-ziwei';
type HomeMode = 'divination' | 'chart' | 'instant';
type DefaultHomeTool =
  | { mode: 'divination'; kind: DivinationKind }
  | { mode: 'chart'; kind: HomeChartKind }
  | { mode: 'instant'; kind: InstantChartType };
type ChatRole = 'user' | 'assistant';
type AlmanacMonthFilter = 'all' | AlmanacPurpose;

const ONBOARDING_STORAGE_KEY = 'shiyue-onboarding-v1';
const BAZI_FORTUNE_COLUMN_STORAGE_KEY = 'shiyue-bazi-fortune-columns-v1';
const ACTIVE_CASE_STORAGE_KEY = 'shiyue-active-case-v1';
const onboardingSteps = ['偏好', '须知'] as const;
const answerPreferenceOptions: Array<{ value: AiAnswerPreference; label: string; summary: string; description: string }> = [
  { value: 'chat', label: '日常聊天', summary: '自然直说', description: '像熟悉你的朋友，用白话直接回答' },
  { value: 'fortune-master', label: '算命大师', summary: '传统断法', description: '先断主旨，再讲盘理、时机与趋避' },
  { value: 'professional', label: '专业人士', summary: '严谨推演', description: '展开结构、条件、分歧与专业判断' },
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
  { value: 'theme', label: '主题与牌组' },
  { value: 'ai', label: 'AI 与模型' },
];

type AlmanacRangeMonths = 1 | 3 | 6 | 12;
type AlmanacWeekendPreference = 'any' | 'prefer' | 'avoid';
type AlmanacTimePreference = 'any' | 'work-hours' | 'morning' | 'afternoon';

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

interface ChatTarotMessage {
  kind: 'tarot';
  role: 'assistant';
  content: '';
  reading: WesternReadingResult;
}

interface ChatInstantMessage {
  kind: 'instant';
  role: 'assistant';
  content: '';
  response: InstantChartResponse;
}

type ChatMessage = ChatTextMessage | ChatReadingMessage | ChatTarotMessage | ChatInstantMessage;

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
type BirthPickerTarget = 'create' | 'editor' | 'instant';

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

interface BirthPlaceSearchResult {
  key: string;
  label: string;
  detail: string;
  values: string[];
}

interface CachedChart {
  caseId: string;
  kind: ChartKind;
  signature: string;
  createdAt: number;
  result: ReadingResult;
}

type AstrolabeChartData = AstrolabeData & {
  fortuneScope?: AstrolabeScopeContext;
  /** 兼容旧缓存。 */
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

const provinceOptions = ref<readonly BirthPlaceProvinceOption[]>([]);
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

const chartOptions: Array<{ kind: ChartKind; label: string; icon: string; description: string }> = [
  { kind: 'bazi', label: '八字', icon: '命', description: '看四柱、日主和五行结构' },
  { kind: 'ziwei', label: '紫微', icon: '紫', description: '看命宫、星曜和十二宫' },
  { kind: 'astrolabe', label: '星盘', icon: '星', description: '看星体、上升和主要相位' },
  { kind: 'qizheng', label: '七政四余', icon: '政', description: '看传统星命与二十八宿' },
];
const chartKindTabs = chartOptions.map((item) => ({ value: item.kind, label: item.label }));
const homeChartOptions: Array<{ kind: HomeChartKind; label: string; icon: string; description: string }> = [
  ...chartOptions,
  { kind: 'bazi-ziwei', label: '八字紫微合参', icon: '合', description: '结合两种命盘交叉查看' },
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
const defaultHomeToolFallback = { mode: 'divination', kind: 'meihua' } as const satisfies DefaultHomeTool;

function normalizeDefaultHomeTool(value: unknown): DefaultHomeTool {
  if (!value || typeof value !== 'object') return { ...defaultHomeToolFallback };
  const candidate = value as { mode?: unknown; kind?: unknown };
  if (candidate.mode === 'chart' && homeChartOptions.some((item) => item.kind === candidate.kind)) {
    return { mode: 'chart', kind: candidate.kind as HomeChartKind };
  }
  if (candidate.mode === 'instant' && instantChartOptions.some((item) => item.kind === candidate.kind)) {
    return { mode: 'instant', kind: candidate.kind as InstantChartType };
  }
  if (candidate.mode === 'divination' && masterDivinationKinds.includes(candidate.kind as DivinationKind)) {
    return { mode: 'divination', kind: candidate.kind as DivinationKind };
  }
  return { ...defaultHomeToolFallback };
}
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
type InspirationMode = import('./lib/inspirationLibrary').InspirationMode;
type InspirationItem = import('./lib/inspirationLibrary').InspirationItem;
type InspirationGroup = import('./lib/inspirationLibrary').InspirationGroup;

let inspirationLibraries: Record<InspirationMode, InspirationGroup[]> = { matter: [], natal: [] };
let inspirationLibraryPromise: Promise<void> | null = null;

function ensureInspirationLibrary() {
  if (inspirationLibraries.matter.length && inspirationLibraries.natal.length) return Promise.resolve();
  if (!inspirationLibraryPromise) {
    inspirationLibraryPromise = import('./lib/inspirationLibrary').then((module) => {
      inspirationLibraries = module.inspirationLibraries;
    }).catch((error) => {
      inspirationLibraryPromise = null;
      throw error;
    });
  }
  return inspirationLibraryPromise;
}

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
    timeBasis: 'clock',
  };
}

function caseNeedsLocationRuntime(raw: Partial<CaseProfile>) {
  const legacyKey = raw.regionKey || '';
  if (legacyKey === 'tokyo' || legacyKey === 'singapore' || raw.provinceId === 'overseas') return false;
  return !(raw.provinceId && raw.cityId && raw.regionId && raw.locationName && raw.latitude && raw.longitude);
}

function hydrateCase(raw: Partial<CaseProfile>, index = 0): CaseProfile {
  const storedTimeBasis = normalizeStoredTimeBasis(raw.timeBasis);
  const profile: CaseProfile = {
    ...createCase(raw.id || `case-${index}`, raw.label || `案例 ${index + 1}`, index === 0),
    ...raw,
    dateType: raw.dateType === 'lunar' ? 'lunar' : 'solar',
    isLeapMonth: raw.dateType === 'lunar' && raw.isLeapMonth === true,
    timeBasis: storedTimeBasis,
  };
  const legacyKey = raw.regionKey || '';
  if (legacyKey === 'tokyo' || legacyKey === 'singapore' || raw.provinceId === 'overseas') {
    profile.provinceId = 'overseas';
    profile.cityId = legacyKey === 'tokyo' || legacyKey === 'singapore' ? legacyKey : raw.cityId || raw.regionId || 'tokyo';
    profile.regionId = profile.cityId;
    applyExternalRegion(profile, profile.regionId);
    profile.timeBasis = storedTimeBasis;
    return profile;
  }
  if (!caseNeedsLocationRuntime(raw)) return profile;
  const regionId = raw.regionId
    || (/^\d{2,6}$/.test(legacyKey) ? legacyKey : '')
    || legacyRegionIds[legacyKey]
    || '110101';
  const path = findBirthPlaceByRegionId(regionId)
    || (raw.locationName ? findBirthPlaceByDisplayName(raw.locationName) : null)
    || findBirthPlaceByRegionId('110101');
  if (path) applyBirthPlacePath(profile, path);
  profile.timeBasis = storedTimeBasis;
  return profile;
}

const initialAlmanacDate = new Date();
const initialAlmanacMonth = `${initialAlmanacDate.getFullYear()}-${String(initialAlmanacDate.getMonth() + 1).padStart(2, '0')}`;

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
const instantChartKind = ref<InstantChartType>('bazi');
const instantTimeStandard = ref<InstantTimeStandard>('beijing');
const instantObserverDraft = ref<CaseProfile>({
  ...createCase('instant-observer', '观测地点', false),
  date: '',
  time: '',
  locationName: '',
  latitude: '',
  longitude: '',
});
const chartKind = ref<ChartKind>('bazi');
const selectedCaseId = ref('');
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
const agentZiweiFortune = ref<AgentZiweiFortune | null>(null);
const agentAstrolabeFortune = ref<AgentAstrolabeFortune | null>(null);
const selectedWuyunYear = ref(new Date().getFullYear());
const selectedTaiyiYear = ref(new Date().getFullYear());
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
  const dateKey = dailyFortune.value?.dateKey || '';
  const [year = '—', rawMonth = '—', rawDay = '—'] = dateKey.split('-');
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
    events: period === 'today' && dateKey
      ? getCalendarEvents(dateKey, cases.value).filter((event) => event.label !== dailyFortune.value?.jieqi)
      : [],
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
const almanacWeekendPreference = ref<AlmanacWeekendPreference>('any');
const almanacTimePreference = ref<AlmanacTimePreference>('any');
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
const newCaseGenderConfirmed = ref(false);
const newCaseRegionConfirmed = ref(false);
const caseGenderOptions = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
];
const caseCalendarOptions = [
  { value: 'solar', label: '公历' },
  { value: 'lunar', label: '农历' },
];
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
const showQuestionSupplementModal = ref(false);
const questionSupplement = reactive({
  background: '',
  current: '',
  timing: '',
  options: '',
  focus: '',
});
const hasQuestionSupplement = computed(() => Object.values(questionSupplement).some((value) => value.trim()));
const showBasicAiFallbackModal = ref(false);
const basicAiFallbackQuestion = ref('');
const basicAiFallbackError = ref('');
const basicAiFallbackCopyState = ref<'idle' | 'copied' | 'error'>('idle');
const basicAiFallbackPickerMode = ref<HomeMode | null>(null);
const forcedBasicAgentSelection = ref<AgentToolSelection | null>(null);
const restoreBasicAiFallbackQuestionOnHome = ref(false);
const inspirationSearch = ref('');
const inspirationMode = ref<InspirationMode>('matter');
const selectedInspirationPrompt = ref('');
const showToolPicker = ref(false);
const showAiPicker = ref(false);
const showMobileNav = ref(false);
const expandedInspirationGroups = ref<string[]>(['matter-life']);
const selectedReadingMessage = ref<ChatReadingMessage | null>(null);
const showReadingModal = ref(false);
const selectedTarotMessage = ref<ChatTarotMessage | null>(null);
const showTarotModal = ref(false);
const selectedInstantMessage = ref<ChatInstantMessage | null>(null);
const showInstantModal = ref(false);
type ManualDivinationKind = 'meihua' | 'liuyao' | 'xiaoliuren' | 'jinkoujue' | 'qimen' | 'liuren' | 'taiyi';
const pendingManualKind = ref<ManualDivinationKind | null>(null);
const pendingCastingQuestion = ref('');
const oracleInitialQuestion = ref('');
const oracleResult = ref<SsgwData | null>(null);
const chatMessages = ref<ChatMessage[]>([]);
const chatSelectionMode = ref(false);
const selectedChatMessageIndexes = ref<number[]>([]);
const selectedChatMessageSet = computed(() => new Set(selectedChatMessageIndexes.value));
const selectedChatExportItems = computed(() => selectedChatMessageIndexes.value
  .slice()
  .sort((left, right) => left - right)
  .flatMap((index) => {
    const message = chatMessages.value[index];
    return message ? [chatMessageExportItem(message)] : [];
  }));
const lastAssistantTextMessageIndex = computed(() => {
  for (let index = chatMessages.value.length - 1; index >= 0; index -= 1) {
    const message = chatMessages.value[index];
    if (message?.kind === 'text' && message.role === 'assistant') return index;
  }
  return -1;
});
const aiAnswer = ref('');
const aiError = ref('');
const lastAiRequest = ref<AiInterpretationRequest | null>(null);
const lastAiHistoryRecordId = ref<string | null>(null);
const isInterpreting = ref(false);
const toastMessage = ref('');
const pwaUpdateAvailable = ref(false);
const showPwaUpdateDialog = ref(false);
const isApplyingPwaUpdate = ref(false);
const updateError = ref('');
const nativeDownloadRoutes = ref<NativeDownloadRoute[]>([]);
const nativeRouteProbes = ref<DownloadRouteProbe[]>([]);
const selectedNativeRouteId = ref<NativeDownloadRoute['id'] | ''>('');
const isProbingNativeRoutes = ref(false);
let availableUpdateKind: 'web' | 'native' = 'web';
let availableWebVersion = '';
let prepareWebUpdate: ((downloadUrl?: string) => Promise<void>) | null = null;
let nativeRouteProbeRun = 0;
let toastTimer: number | undefined;
let basicAiFallbackCopyTimer: number | undefined;
let cancelHomePreviewWarmup: (() => void) | undefined;
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
const showAiChannelCatalog = ref(false);
const aiTestMessage = ref('');
const aiTestState = ref<'idle' | 'success' | 'error'>('idle');
const aiModelMessage = ref('');
const aiModelState = ref<'idle' | 'success' | 'error'>('idle');
const showOnboarding = ref(false);
const onboardingStep = ref(0);
const onboardingDisclaimerAccepted = ref(false);
const onboardingError = ref('');
const configuringAiChannelId = ref('builtin');
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
const birthPlaceSearchQuery = ref('');
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
  return [createBuiltinAiChannel()];
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
    const models = normalizeAiModels(channel.models, []);
    const storedModel = typeof channel.model === 'string' ? channel.model.trim() : '';
    const model = storedModel || models[0] || '';
    if (model && !models.includes(model)) models.unshift(model);
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
  const presets = normalized.filter((channel) => channel.preset);
  const custom = normalized.filter((channel) => channel.provider !== 'builtin' && !channel.preset);
  return [builtin, ...presets, ...custom];
}

const appPreferences = reactive<AiPreferences & { activeAiChannelId: string; aiChannels: AiChannel[]; castingPreference: CastingPreference; defaultHomeTool: DefaultHomeTool; joytouchCompatibilityMode: JoytouchCompatibilityMode }>({
  activeAiChannelId: 'builtin',
  aiChannels: createDefaultAiChannels(),
  answerPreference: 'fortune-master',
  displayLevel: 'beginner',
  castingPreference: 'auto',
  joytouchCompatibilityMode: 'auto',
  defaultHomeTool: { ...defaultHomeToolFallback },
  promptSchoolChoices: {},
});
const showJoytouchCompatibilitySetting = isNativeAndroidApp();
const joytouchCompatibilityActive = ref(document.documentElement.classList.contains('joytouch-compat'));
const visibleDivinationKinds = computed(() => appPreferences.displayLevel === 'master' ? masterDivinationKinds : beginnerDivinationKinds);

const settings = reactive<{
  qimenScope: 'hour' | 'day' | 'month' | 'year';
  qimenLayout: 'zhuanpan' | 'feipan';
  qimenJuMethod: 'chaibu' | 'zhirun';
  taiyiScope: 'year' | 'month' | 'day' | 'hour';
  huangjiMode: 'year' | 'date';
  almanacTopic: AlmanacPurpose | '';
}>({
  qimenScope: 'hour',
  qimenLayout: 'zhuanpan',
  qimenJuMethod: 'chaibu',
  taiyiScope: 'year',
  huangjiMode: 'year',
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
  { key: 'tarot' as const, label: '西方占卜', icon: Sparkles },
];
const secondaryNavItems = [
  { key: 'cases' as const, label: '案例', icon: BookOpen },
  { key: 'settings' as const, label: '设置', icon: Settings },
];
const navItems = [...primaryNavItems, ...secondaryNavItems];
const fortuneEntryLabel = computed(() => {
  const result = activeView.value === 'fortune' ? dailyFortune.value : homeFortunePreview.value;
  return result?.personalized ? '个人日运' : '今日运势';
});
const activePageTitle = computed(() => activeView.value === 'fortune'
  ? fortuneEntryLabel.value
  : navItems.find((item) => item.key === activeView.value)?.label || '');
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
// 底层保留完整计算结果，排盘和岁运统一按常用名单筛选；展示时保留神煞全称。
let baziShenShaCalculator: InstanceType<BaziRuntime['ShenShaCalculator']> | null = null;

function getBaziShenShaCalculator() {
  if (!baziShenShaCalculator) baziShenShaCalculator = new (requireBaziRuntime().ShenShaCalculator)({ scope: 'all' });
  return baziShenShaCalculator;
}
const commonBaziShensha = [
  '天乙贵人', '天德贵人', '月德贵人', '太极贵人', '文昌贵人', '国印贵人', '福星贵人',
  '天官贵人', '天印贵人', '天福贵人', '天厨贵人', '文星贵', '德秀贵人', '金舆', '词馆', '学馆',
  '驿马', '桃花', '咸池', '红艳', '华盖', '将星', '禄神', '羊刃', '红鸾', '天喜',
  '孤辰', '寡宿', '孤虚', '劫煞', '亡神', '灾煞', '血刃', '血光', '飞刃', '元辰', '勾绞', '童子',
];
const selectedMeta = computed(() => kindMeta[selectedKind.value]);
const activeCase = computed(() => cases.value.find((item) => item.id === selectedCaseId.value) || null);
const currentCase = computed(() => activeCase.value || draftCase.value);
const editableCase = computed(() => caseEditorDraft.value || currentCase.value);
const activeGlobalCaseId = computed(() => activeCase.value && isAlmanacProfileComplete(activeCase.value) ? activeCase.value.id : '');
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
const activeAiModelOptions = computed(() => normalizeAiModels(activeAiChannel.value.models, []));
const configuringAiModelOptions = computed(() => normalizeAiModels(configuringAiChannel.value.models, []));
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
const managedAiChannels = computed(() => [...appPreferences.aiChannels].sort((left, right) => (
  Number(right.id === appPreferences.activeAiChannelId) - Number(left.id === appPreferences.activeAiChannelId)
  || Number(left.provider !== 'builtin') - Number(right.provider !== 'builtin')
)));
const availableAiChannelPresets = computed(() => aiChannelPresets.filter((preset) => (
  !appPreferences.aiChannels.some((channel) => channel.preset === preset.preset)
)));
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
    const shensha = getBaziShenShaCalculator().calculateAllShenSha([
      [result.pillars.year.gan, result.pillars.year.zhi],
      [result.pillars.month.gan, result.pillars.month.zhi],
      [result.pillars.day.gan, result.pillars.day.zhi],
      [gan, zhi],
    ], result.gender).hour || [];
    return filterCommonBaziShensha(shensha, commonBaziShensha);
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
  const mainHiddenStem = requireBaziRuntime().BRANCH_HIDDEN_STEMS[zhi]?.[0] || '';
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
    shensha: visibleBaziShensha(result, item.key),
  }));
  const selectedFortuneGanZhi = resolveSelectedBaziFortuneGanZhi({
    cycle: selectedBaziCycle.value,
    year: selectedBaziYearInfo.value,
    month: selectedBaziMonthInfo.value,
    hour: selectedBaziHourInfo.value,
  });
  const fortuneInputs = [
    { key: 'dayun', label: '大运', ganZhi: selectedFortuneGanZhi.dayun },
    { key: 'liunian', label: '流年', ganZhi: selectedFortuneGanZhi.liunian },
    { key: 'liuyue', label: '流月', ganZhi: selectedFortuneGanZhi.liuyue },
    { key: 'liushi', label: '流时', ganZhi: selectedFortuneGanZhi.liushi },
  ];
  const fortuneColumns = fortuneInputs.map(({ key, label, ganZhi }) => {
    const gan = ganZhi[0] || '';
    const zhi = ganZhi[1] || '';
    const validGanZhi = Boolean(baziStemElements[gan] && baziBranchElements[zhi]);
    const hiddenStems = validGanZhi ? requireBaziRuntime().BRANCH_HIDDEN_STEMS[zhi] || [] : [];
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
const selectedBaziFortuneTriggerSummary = computed(() => {
  const result = displayResult.value;
  if (!result || !isBazi(result)) return [];
  const layers: FortuneTriggerLayer[] = [];
  const appendLayer = (layer: FortuneTriggerLayer | null) => {
    if (layer?.ganZhi.length === 2) layers.push(layer);
  };
  appendLayer(selectedBaziCycle.value ? {
    id: `dayun-${selectedBaziCycleIndex.value}`,
    type: 'dayun',
    label: selectedBaziCycle.value.isXiaoyun ? '小运' : '大运',
    ganZhi: selectedBaziCycle.value.ganZhi,
  } : null);
  appendLayer(selectedBaziYearInfo.value ? {
    id: `year-${selectedBaziYearInfo.value.year}`,
    type: 'year',
    label: '流年',
    ganZhi: selectedBaziYearInfo.value.ganZhi,
  } : null);
  appendLayer(selectedBaziMonthInfo.value ? {
    id: `month-${selectedBaziYear.value}-${selectedBaziMonthInfo.value.month}`,
    type: 'month',
    label: '流月',
    ganZhi: selectedBaziMonthInfo.value.ganZhi,
  } : null);
  appendLayer(selectedBaziDayInfo.value ? {
    id: `day-${selectedBaziDayInfo.value.date}`,
    type: 'day',
    label: '流日',
    ganZhi: selectedBaziDayInfo.value.ganZhi,
  } : null);
  appendLayer(selectedBaziHourInfo.value ? {
    id: `hour-${selectedBaziDayInfo.value?.date || 'unknown'}-${selectedBaziHourIndex.value}`,
    type: 'hour',
    label: '流时',
    ganZhi: selectedBaziHourInfo.value.ganZhi,
  } : null);
  if (!layers.length) return [];
  try {
    return summarizeBaziFortuneTriggers(analyzeFortuneTriggers(result, layers));
  } catch {
    return [];
  }
});

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
function matchesAlmanacTimePreference(day: AlmanacDayCandidate) {
  if (almanacTimePreference.value === 'any') return true;
  const preferredRange = almanacTimePreference.value === 'morning' ? [0, 12]
    : almanacTimePreference.value === 'afternoon' ? [12, 18]
      : [9, 18];
  return getModernAlmanacHours(day).some((hour) => {
    const times = [...hour.range.matchAll(/(\d{1,2}):\d{2}/g)].map((match) => Number(match[1]));
    if (times.length < 2) return false;
    return times[0] < preferredRange[1] && times[1] + 1 > preferredRange[0];
  });
}
const filteredAlmanacSearchItems = computed(() => {
  const levelPriority: Record<AlmanacAuspiceLevel, number> = { 大吉: 0, 吉: 1, 小吉: 2, 平: 3, 慎用: 4, 不宜: 5 };
  const filtered = almanacSearchItems.value.filter((item) => item.evaluation.usable && matchesAlmanacTimePreference(item.day));
  const weekendRank = (item: AlmanacSearchItem) => {
    const weekend = item.day.weekday === '星期六' || item.day.weekday === '星期日';
    if (almanacWeekendPreference.value === 'prefer') return weekend ? 0 : 1;
    if (almanacWeekendPreference.value === 'avoid' || almanacTimePreference.value === 'work-hours') return weekend ? 1 : 0;
    return 0;
  };
  return [...filtered].sort((a, b) => weekendRank(a) - weekendRank(b)
    || levelPriority[a.evaluation.level] - levelPriority[b.evaluation.level]
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
const homeChartMeta = computed(() => homeChartOptions.find((item) => item.kind === homeChartKind.value) || homeChartOptions[0]!);
const instantChartMeta = computed(() => instantChartOptions.find((item) => item.kind === instantChartKind.value) || instantChartOptions[0]!);
const instantNeedsObserver = computed(() => instantChartNeedsObserver(instantChartKind.value, instantTimeStandard.value));
const instantObserver = computed(() => buildInstantObserver(instantObserverDraft.value));
const homeModeLabel = computed(() => {
  if (homeState.value === 'chat' && chatMessages.value.some((message) => message.kind === 'tarot')) return '西方占卜';
  if (homeMode.value === 'chart') return homeChartMeta.value.label;
  if (homeMode.value === 'instant') return instantChartMeta.value.fullLabel;
  return kindMeta[selectedKind.value].label;
});
const activePromptSchoolMethod = computed(() => {
  if (appPreferences.displayLevel !== 'master') return null;
  if (homeMode.value === 'instant') return null;
  if (homeMode.value === 'chart' && homeChartKind.value === 'bazi-ziwei') return null;
  const kind: DivinationKind = homeMode.value === 'chart' ? homeChartKind.value as ChartKind : selectedKind.value;
  const method = getPromptSchoolMethod(kind);
  return isPromptSchoolChoiceEnabled(method) ? method : null;
});
const activePromptSchoolOptions = computed(() => activePromptSchoolMethod.value
  ? getPromptSchoolChoiceOptions(activePromptSchoolMethod.value)
  : []);
const activePromptSchoolChoice = computed(() => activePromptSchoolMethod.value
  ? appPreferences.promptSchoolChoices?.[activePromptSchoolMethod.value] ?? 'all'
  : 'all');
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

function updateToolPickerAvailableHeight() {
  if (!showToolPicker.value || !toolPickerRef.value) return;
  const viewportTop = window.visualViewport?.offsetTop ?? 0;
  const topbarBottom = document.querySelector<HTMLElement>('.topbar')?.getBoundingClientRect().bottom ?? viewportTop;
  const safeTop = Math.max(viewportTop + 8, topbarBottom + 8);
  const pickerTop = toolPickerRef.value.getBoundingClientRect().top;
  const availableHeight = Math.max(120, Math.floor(pickerTop - safeTop - 9));
  toolPickerRef.value.style.setProperty('--tool-picker-available-height', `${availableHeight}px`);
}

function handleToolPickerViewportChange() {
  window.requestAnimationFrame(updateToolPickerAvailableHeight);
}

watch(showToolPicker, (isOpen) => {
  if (!isOpen) return;
  void nextTick(handleToolPickerViewportChange);
});

function toggleBaziFortuneColumn(key: BaziFortuneColumnKey) {
  baziFortuneColumnVisibility[key] = !baziFortuneColumnVisibility[key];
}

function restorePreferences() {
  try {
    const parsedPreferences = parseLocalStorageJson<Partial<AiPreferences> & { activeAiChannelId?: string; aiChannels?: Partial<AiChannel>[]; aiConfig?: Partial<AiCustomConfig>; castingPreference?: CastingPreference; defaultHomeTool?: unknown; toolPreferences?: unknown; joytouchCompatibility?: boolean; joytouchCompatibilityMode?: JoytouchCompatibilityMode }>(localStorage, PREFERENCES_STORAGE_KEY);
    if (!parsedPreferences) return;
    appPreferences.answerPreference = normalizeStoredAnswerPreference(parsedPreferences.answerPreference);
    if (parsedPreferences.displayLevel === 'basic' || parsedPreferences.displayLevel === 'beginner' || parsedPreferences.displayLevel === 'master') appPreferences.displayLevel = parsedPreferences.displayLevel;
    if (parsedPreferences.castingPreference === 'auto' || parsedPreferences.castingPreference === 'manual') appPreferences.castingPreference = parsedPreferences.castingPreference;
    if (parsedPreferences.joytouchCompatibilityMode === 'auto' || parsedPreferences.joytouchCompatibilityMode === 'standard' || parsedPreferences.joytouchCompatibilityMode === 'compatibility') appPreferences.joytouchCompatibilityMode = parsedPreferences.joytouchCompatibilityMode;
    else if (parsedPreferences.joytouchCompatibility === true) appPreferences.joytouchCompatibilityMode = 'compatibility';
    else if (parsedPreferences.joytouchCompatibility === false) appPreferences.joytouchCompatibilityMode = 'standard';
    appPreferences.defaultHomeTool = normalizeDefaultHomeTool(parsedPreferences.defaultHomeTool);
    appPreferences.promptSchoolChoices = normalizePromptSchoolChoices(parsedPreferences.promptSchoolChoices);
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
    const toolPreferences = normalizeToolPreferences(parsedPreferences.toolPreferences);
    instantTimeStandard.value = toolPreferences.instantTimeStandard;
    if (toolPreferences.instantObserver) Object.assign(instantObserverDraft.value, toolPreferences.instantObserver);
    settings.qimenScope = toolPreferences.qimenScope;
    settings.qimenLayout = toolPreferences.qimenLayout;
    settings.qimenJuMethod = toolPreferences.qimenJuMethod;
    settings.taiyiScope = toolPreferences.taiyiScope;
    settings.huangjiMode = toolPreferences.huangjiMode;
  } catch {
    // 偏好损坏或浏览器禁用存储时使用默认设置，不影响案例和历史。
  }
}

function restoreAiKeys() {
  let persistentKeys: Record<string, string> = {};
  let sessionKeys: Record<string, string> = {};
  try {
    persistentKeys = normalizeStoredAiKeys(parseLocalStorageJson<unknown>(localStorage, AI_KEY_STORAGE_KEY));
  } catch {
    // 本地存储不可用时继续尝试迁移旧的会话密钥。
  }
  try {
    sessionKeys = Object.fromEntries(appPreferences.aiChannels.map((channel) => (
      [channel.id, sessionStorage.getItem(`shiyue-ai-key-${channel.id}`) || '']
    )));
  } catch {
    // 会话存储不可用不影响已经持久化的密钥。
  }
  let migratedSessionKey = applyStoredAiKeys(appPreferences.aiChannels, persistentKeys, sessionKeys);
  try {
    const legacyApiKey = sessionStorage.getItem('shiyue-ai-api-key');
    const activeChannel = appPreferences.aiChannels.find((channel) => channel.id === appPreferences.activeAiChannelId);
    if (legacyApiKey && activeChannel?.provider === 'openai-compatible' && !activeChannel.apiKey) {
      activeChannel.apiKey = legacyApiKey;
      migratedSessionKey = true;
    }
  } catch {
    // 旧版会话存储不可用时跳过迁移。
  }
  if (migratedSessionKey) persistAiKeys();
  const activeChannel = appPreferences.aiChannels.find((channel) => channel.id === appPreferences.activeAiChannelId);
  if (!activeChannel || !isAiChannelReady(activeChannel)) appPreferences.activeAiChannelId = 'builtin';
  configuringAiChannelId.value = appPreferences.activeAiChannelId;
}

async function restoreCases() {
  try {
    const storedCases = parseLocalStorageJson<CaseProfile[]>(localStorage, 'shiyue-cases');
    if (Array.isArray(storedCases) && storedCases.length) {
      if (storedCases.some(caseNeedsLocationRuntime)) await ensureLocationRuntime();
      cases.value = storedCases.map((item, index) => hydrateCase(item, index));
    } else if (!localStorage.getItem('shiyue-cases')) {
      const oldBirth = parseLocalStorageJson<Partial<BirthForm>>(localStorage, 'guangxing-birth');
      if (oldBirth) {
        await ensureLocationRuntime();
        cases.value = [hydrateCase({ ...oldBirth, timeBasis: 'clock', isDefault: true }, 0)];
      }
    }
  } catch {
    cases.value = [];
  }
  try {
    selectedCaseId.value = normalizeSelectedCaseId(localStorage.getItem(ACTIVE_CASE_STORAGE_KEY), cases.value);
  } catch {
    selectedCaseId.value = '';
  }
}

function restoreHistory() {
  try {
    const primaryHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
    const storedHistoryPayload = primaryHistory
      ? parseLocalStorageJson<unknown>(localStorage, HISTORY_STORAGE_KEY)
      : parseLocalStorageJson<unknown>(localStorage, 'guangxing-history');
    if (storedHistoryPayload !== null) {
      history.value = parseStoredHistory(storedHistoryPayload);
      if (Array.isArray(storedHistoryPayload) && history.value.length !== storedHistoryPayload.length) persistHistory();
    }
  } catch {
    history.value = [];
  }
}

const selectedNativeDownloadRoute = computed(() => (
  nativeDownloadRoutes.value.find((route) => route.id === selectedNativeRouteId.value)
  ?? nativeDownloadRoutes.value[0]
  ?? null
));

const fastestNativeRouteId = computed(() => {
  const best = selectBestDownloadRoute(
    nativeDownloadRoutes.value,
    nativeRouteProbes.value.filter((probe) => probe.latencyMs !== null),
  );
  return best && nativeRouteProbes.value.some((probe) => probe.routeId === best.id && probe.latencyMs !== null)
    ? best.id
    : '';
});

function nativeRouteProbe(routeId: NativeDownloadRoute['id']) {
  return nativeRouteProbes.value.find((probe) => probe.routeId === routeId);
}

function nativeRouteProbeLabel(routeId: NativeDownloadRoute['id']) {
  const probe = nativeRouteProbe(routeId);
  if (isProbingNativeRoutes.value && !probe) return '测速中';
  if (!probe || probe.latencyMs === null) return '不可用';
  return `${probe.latencyMs} ms`;
}

async function testNativeDownloadRoutes() {
  if (!nativeDownloadRoutes.value.length) return;
  const run = ++nativeRouteProbeRun;
  nativeRouteProbes.value = [];
  isProbingNativeRoutes.value = true;
  const probes = await probeDownloadRoutes(nativeDownloadRoutes.value);
  if (run !== nativeRouteProbeRun) return;
  nativeRouteProbes.value = probes;
  isProbingNativeRoutes.value = false;
  const best = selectBestDownloadRoute(nativeDownloadRoutes.value, probes);
  selectedNativeRouteId.value = best?.id ?? nativeDownloadRoutes.value[0]?.id ?? '';
}

function handleAppUpdate(event: Event) {
  const detail = (event as CustomEvent<{
    kind?: 'web' | 'native';
    version?: string;
    downloadRoutes?: NativeDownloadRoute[];
    prepareUpdate?: (downloadUrl?: string) => Promise<void>;
  }>).detail;
  availableUpdateKind = detail?.kind === 'native' ? 'native' : 'web';
  availableWebVersion = detail?.version || '';
  prepareWebUpdate = detail?.prepareUpdate || null;
  nativeDownloadRoutes.value = availableUpdateKind === 'native' ? detail?.downloadRoutes ?? [] : [];
  nativeRouteProbes.value = [];
  selectedNativeRouteId.value = nativeDownloadRoutes.value[0]?.id ?? '';
  updateError.value = '';
  pwaUpdateAvailable.value = true;
  showPwaUpdateDialog.value = true;
  if (nativeDownloadRoutes.value.length) void testNativeDownloadRoutes();
}

function postponePwaUpdate() {
  showPwaUpdateDialog.value = false;
}

async function refreshToPwaUpdate() {
  if (isApplyingPwaUpdate.value) return;
  isApplyingPwaUpdate.value = true;
  updateError.value = '';
  try {
    if (!prepareWebUpdate) throw new Error('update preparation is unavailable');
    await prepareWebUpdate(selectedNativeDownloadRoute.value?.url);
    if (availableUpdateKind === 'native') {
      isApplyingPwaUpdate.value = false;
      return;
    }
    window.location.replace(buildUpdateReloadUrl(window.location, availableWebVersion));
  } catch {
    isApplyingPwaUpdate.value = false;
    pwaUpdateAvailable.value = true;
    showPwaUpdateDialog.value = true;
    updateError.value = '更新暂时无法打开，请检查网络后重试。';
  }
}

let applyingAppRoute = false;

function currentAppRouteHash() {
  return buildAppRouteHash({
    view: activeView.value,
    settingsSection: activeSettingsSection.value,
    casesSection: activeCasesSection.value,
    history: showHistory.value,
  });
}

function syncAppRouteToLocation() {
  if (applyingAppRoute) return;
  const hash = currentAppRouteHash();
  if (window.location.hash === hash) return;
  window.history.pushState(null, '', hash);
}

async function applyAppRouteFromLocation() {
  if (applyingAppRoute) return;
  applyingAppRoute = true;
  try {
    const route = parseAppRoute(window.location.hash);
    await goView(route.view);
    activeSettingsSection.value = route.settingsSection;
    activeCasesSection.value = route.casesSection;
    showHistory.value = route.history;
    const canonicalHash = currentAppRouteHash();
    if (window.location.hash !== canonicalHash) window.history.replaceState(null, '', canonicalHash);
  } finally {
    applyingAppRoute = false;
  }
}

function handleAppRouteNavigation() {
  void applyAppRouteFromLocation();
}

function handleCompatibilityChange(event: Event) {
  const detail = (event as CustomEvent<{ enabled?: boolean }>).detail;
  joytouchCompatibilityActive.value = detail?.enabled === true;
}

watch([activeView, activeSettingsSection, activeCasesSection, showHistory], syncAppRouteToLocation);

onMounted(() => {
  document.addEventListener('pointerdown', closeFloatingPanelsOnOutsidePointer);
  document.addEventListener('keydown', closeFloatingPanelsFromKeyboard);
  window.addEventListener('shiyue:app-update', handleAppUpdate);
  window.addEventListener('shiyue:compatibility-change', handleCompatibilityChange);
  window.addEventListener('shiyue:native-back', handleNativeBack);
  window.addEventListener('popstate', handleAppRouteNavigation);
  window.addEventListener('resize', handleToolPickerViewportChange);
  window.visualViewport?.addEventListener('resize', handleToolPickerViewportChange);
  window.visualViewport?.addEventListener('scroll', handleToolPickerViewportChange);
  window.addEventListener('hashchange', handleAppRouteNavigation);
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
  restorePreferences();
  void prepareStoredThemeAssets();
  restoreAiKeys();
  void restoreCases();
  restoreHistory();
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
  void applyAppRouteFromLocation();
  cancelHomePreviewWarmup = scheduleAfterPageLoad(() => void refreshHomeFortunePreview(), {
    delayMs: 1_500,
    idleTimeoutMs: 5_000,
  });
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', closeFloatingPanelsOnOutsidePointer);
  document.removeEventListener('keydown', closeFloatingPanelsFromKeyboard);
  window.removeEventListener('shiyue:app-update', handleAppUpdate);
  window.removeEventListener('shiyue:compatibility-change', handleCompatibilityChange);
  window.removeEventListener('shiyue:native-back', handleNativeBack);
  window.removeEventListener('popstate', handleAppRouteNavigation);
  window.removeEventListener('resize', handleToolPickerViewportChange);
  window.visualViewport?.removeEventListener('resize', handleToolPickerViewportChange);
  window.visualViewport?.removeEventListener('scroll', handleToolPickerViewportChange);
  window.removeEventListener('hashchange', handleAppRouteNavigation);
  agentAbortController?.abort();
  backgroundAiControllers.forEach((controller) => controller.abort());
  cancelHomePreviewWarmup?.();
  if (toastTimer !== undefined) window.clearTimeout(toastTimer);
  if (basicAiFallbackCopyTimer !== undefined) window.clearTimeout(basicAiFallbackCopyTimer);
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
  try {
    localStorage.setItem('shiyue-cases', JSON.stringify(cases.value));
    return true;
  } catch {
    showToast('案例无法保存，请检查浏览器存储空间或隐私设置。');
    return false;
  }
}

function persistSelectedCaseId() {
  try {
    localStorage.setItem(ACTIVE_CASE_STORAGE_KEY, selectedCaseId.value);
  } catch {
    // 浏览器禁用本地存储时，选择仍在当前页面内生效。
  }
}

function persistHistory() {
  const result = persistArrayWithOldestEviction(localStorage, HISTORY_STORAGE_KEY, history.value);
  if (result.saved && result.removed) {
    history.value = result.records;
    showToast(`存储空间不足，已移除最早的 ${result.removed} 条记录。`);
  } else if (!result.saved) {
    showToast('记录暂时无法保存，请检查浏览器存储空间或隐私设置。');
  }
  return result.saved;
}

function persistHistoryInterpretation(recordId: string | null, content: string) {
  const updatedHistory = updateHistoryInterpretation(history.value, recordId, content);
  if (updatedHistory === history.value) return;
  applyUpdatedHistory(updatedHistory, recordId);
}

function persistHistoryInterpretationError(recordId: string | null, content: string) {
  const updatedHistory = updateHistoryInterpretationError(history.value, recordId, content);
  if (updatedHistory === history.value) return;
  applyUpdatedHistory(updatedHistory, recordId);
}

function applyUpdatedHistory(updatedHistory: HistoryRecordEntry[], recordId: string | null) {
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

function chatMessageExportItem(message: ChatMessage): ChatExportItem {
  if (message.kind === 'instant') {
    return {
      role: 'reading',
      label: message.response.label,
      content: `${instantTimeBasisLabel(message.response)}\n${instantChartSummary(message.response)}`,
    };
  }
  if (message.kind === 'reading') {
    return {
      role: 'reading',
      label: kindMeta[message.method].label,
      content: `${readingDisplayTitle(message)}\n${readingDisplaySubtitle(message)}`,
    };
  }
  if (message.kind === 'tarot') {
    return {
      role: 'reading',
      label: westernReadingDeckName(message.reading),
      content: `${message.reading.spreadName}\n${message.reading.cards.map((card) => `${card.position}：${card.name}${card.reversed ? '（逆位）' : ''}`).join('\n')}`,
    };
  }
  return {
    role: message.role,
    label: message.role === 'user' ? '我' : 'AI 解答',
    content: message.content,
  };
}

function cancelChatSelection() {
  chatSelectionMode.value = false;
  selectedChatMessageIndexes.value = [];
}

function startChatSelection(index: number) {
  if (!chatMessages.value[index]) return;
  chatSelectionMode.value = true;
  selectedChatMessageIndexes.value = [index];
}

function toggleChatMessageSelection(index: number) {
  if (!chatMessages.value[index]) return;
  const selected = selectedChatMessageIndexes.value;
  selectedChatMessageIndexes.value = selected.includes(index)
    ? selected.filter((item) => item !== index)
    : [...selected, index];
}

function handleChatSelectionClick(event: MouseEvent, index: number) {
  if (!chatSelectionMode.value) return;
  event.preventDefault();
  event.stopPropagation();
  toggleChatMessageSelection(index);
}

function handleChatSelectionKey(event: KeyboardEvent, index: number) {
  if (!chatSelectionMode.value || (event.key !== 'Enter' && event.key !== ' ')) return;
  event.preventDefault();
  toggleChatMessageSelection(index);
}

function toggleSelectAllChatMessages() {
  selectedChatMessageIndexes.value = selectedChatMessageIndexes.value.length === chatMessages.value.length
    ? []
    : chatMessages.value.map((_, index) => index);
}

function deleteChatMessage(index: number) {
  if (!chatMessages.value[index]) return;
  chatMessages.value = chatMessages.value.filter((_, messageIndex) => messageIndex !== index);
  cancelChatSelection();
  showToast('消息已删除。');
}

function deleteSelectedChatMessages() {
  const count = selectedChatMessageIndexes.value.length;
  if (!count) return;
  if (!window.confirm(`删除选中的 ${count} 条消息？`)) return;
  const selected = selectedChatMessageSet.value;
  chatMessages.value = chatMessages.value.filter((_, index) => !selected.has(index));
  cancelChatSelection();
  showToast(`已删除 ${count} 条消息。`);
}

async function shareSelectedChatImage() {
  try {
    const { blob, filename } = createChatShareImage(selectedChatExportItems.value);
    const file = new File([blob], filename, { type: blob.type });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: '时月东方对话摘录', files: [file] });
      cancelChatSelection();
      showToast('分享图片已准备完成。');
      return;
    }
    downloadChatFile(blob, filename);
    cancelChatSelection();
    showToast('分享图片已下载。');
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    showToast(error instanceof Error ? error.message : '分享图片生成失败，请稍后重试。');
  }
}

function exportSelectedChatDocument() {
  try {
    const { blob, filename } = createChatDocument(selectedChatExportItems.value);
    downloadChatFile(blob, filename);
    cancelChatSelection();
    showToast('对话文档已导出。');
  } catch (error) {
    showToast(error instanceof Error ? error.message : '文档导出失败，请稍后重试。');
  }
}

function closeFloatingPanelsFromKeyboard(event: KeyboardEvent) {
  if (event.key !== 'Escape') return;
  if (showHistory.value) showHistory.value = false;
  else if (showMobileNav.value) showMobileNav.value = false;
  else if (showToolPicker.value) showToolPicker.value = false;
  else if (showAiPicker.value) showAiPicker.value = false;
  else if (showCaseSwitcher.value) {
    showCaseSwitcher.value = false;
    caseSwitcherSearch.value = '';
  } else if (showBaziColumnSettings.value) showBaziColumnSettings.value = false;
  else if (chatSelectionMode.value) cancelChatSelection();
}

function handleNativeBack(event: Event) {
  if (showOnboarding.value) showOnboarding.value = false;
  else if (showPwaUpdateDialog.value) showPwaUpdateDialog.value = false;
  else if (showInstantModal.value) showInstantModal.value = false;
  else if (showReadingModal.value) showReadingModal.value = false;
  else if (showTarotModal.value) showTarotModal.value = false;
  else if (showInspirationModal.value) showInspirationModal.value = false;
  else if (showQuestionSupplementModal.value) showQuestionSupplementModal.value = false;
  else if (showBasicAiFallbackModal.value) showBasicAiFallbackModal.value = false;
  else if (showAlmanacSearchModal.value) showAlmanacSearchModal.value = false;
  else if (showCaseEditor.value) showCaseEditor.value = false;
  else if (showHistory.value) showHistory.value = false;
  else if (showMobileNav.value) showMobileNav.value = false;
  else if (showToolPicker.value) showToolPicker.value = false;
  else if (showAiPicker.value) showAiPicker.value = false;
  else if (showCaseSwitcher.value) {
    showCaseSwitcher.value = false;
    caseSwitcherSearch.value = '';
  } else if (showBaziColumnSettings.value) showBaziColumnSettings.value = false;
  else if (chatSelectionMode.value) cancelChatSelection();
  else return;
  event.preventDefault();
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
  } catch (error) {
    if (!(error instanceof DOMException && error.name === 'AbortError')) {
      persistHistoryInterpretationError(recordId, error instanceof Error ? error.message : 'AI 解读暂时失败，请稍后再试。');
    }
    throw error;
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
  const instantObserver = buildInstantObserver(instantObserverDraft.value);
  const toolPreferences: ToolPreferences = {
    instantTimeStandard: instantTimeStandard.value,
    ...(instantObserver ? {
      instantObserver: {
        regionKey: instantObserverDraft.value.regionKey,
        provinceId: instantObserverDraft.value.provinceId,
        cityId: instantObserverDraft.value.cityId,
        regionId: instantObserverDraft.value.regionId,
        locationName: instantObserver.locationName || instantObserverDraft.value.locationName.trim(),
        latitude: String(instantObserver.latitude),
        longitude: String(instantObserver.longitude),
        timezone: String(instantObserver.timezone),
      },
    } : {}),
    qimenScope: settings.qimenScope,
    qimenLayout: settings.qimenLayout,
    qimenJuMethod: settings.qimenJuMethod,
    taiyiScope: settings.taiyiScope,
    huangjiMode: settings.huangjiMode,
  };
  const storedPreferences = {
    answerPreference: appPreferences.answerPreference,
    displayLevel: appPreferences.displayLevel,
    castingPreference: appPreferences.castingPreference,
    joytouchCompatibilityMode: appPreferences.joytouchCompatibilityMode,
    defaultHomeTool: appPreferences.defaultHomeTool,
    promptSchoolChoices: appPreferences.promptSchoolChoices,
    activeAiChannelId: appPreferences.activeAiChannelId,
    aiChannels: appPreferences.aiChannels.map(({ apiKey: _apiKey, ...channel }) => channel),
    toolPreferences,
  };
  try {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(storedPreferences));
  } catch {
    // 浏览器禁用本地存储时，偏好仍在当前页面会话中生效。
  }
  persistAiKeys();
}

function persistAiKeys() {
  try {
    localStorage.setItem(AI_KEY_STORAGE_KEY, JSON.stringify(buildStoredAiKeys(appPreferences.aiChannels)));
  } catch {
    // 浏览器禁用本地存储时，密钥仍仅在当前页面内生效。
  }
}

watch(appPreferences, persistPreferences, { deep: true });
watch([
  instantTimeStandard,
  () => instantObserverDraft.value.regionKey,
  () => instantObserverDraft.value.provinceId,
  () => instantObserverDraft.value.cityId,
  () => instantObserverDraft.value.regionId,
  () => instantObserverDraft.value.locationName,
  () => instantObserverDraft.value.latitude,
  () => instantObserverDraft.value.longitude,
  () => instantObserverDraft.value.timezone,
  () => settings.qimenScope,
  () => settings.qimenLayout,
  () => settings.qimenJuMethod,
  () => settings.taiyiScope,
  () => settings.huangjiMode,
], persistPreferences);
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

function finishOnboarding() {
  if (!onboardingDisclaimerAccepted.value) {
    onboardingError.value = '请先确认已知悉 AI 内容说明。';
    return;
  }
  completeOnboarding();
}

function skipOnboardingAsMaster() {
  appPreferences.displayLevel = 'master';
  continueOnboarding();
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
  showAiChannelCatalog.value = false;
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
  resetAiTest();
}

async function loadAiModels(channel: AiChannel) {
  if (isLoadingAiModels.value || channel.provider === 'builtin') return;
  const setError = (message: string) => {
    aiModelMessage.value = message;
    aiModelState.value = 'error';
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
  const customChannelCount = appPreferences.aiChannels.filter((channel) => channel.provider !== 'builtin' && !channel.preset).length;
  const channel = createCustomAiChannel(customChannelCount + 1);
  appPreferences.aiChannels.push(channel);
  configuringAiChannelId.value = channel.id;
  showAiChannelCatalog.value = false;
  aiModelMessage.value = '';
  aiModelState.value = 'idle';
  resetAiTest();
}

function addPresetAiChannel(preset: typeof aiChannelPresets[number]) {
  const existing = appPreferences.aiChannels.find((channel) => channel.preset === preset.preset);
  const channel = existing || createPresetAiChannel(preset);
  if (!existing) appPreferences.aiChannels.push(channel);
  selectConfiguringAiChannel(channel.id);
}

function removeAiChannel() {
  const channel = configuringAiChannel.value;
  if (channel.provider === 'builtin') return;
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

function chooseJoytouchCompatibility(mode: JoytouchCompatibilityMode) {
  appPreferences.joytouchCompatibilityMode = mode;
  clearRememberedAndroidFallback();
  const enabled = resolveCurrentJoytouchCompatibility(mode, showJoytouchCompatibilitySetting);
  applyJoytouchCompatibility(enabled);
  joytouchCompatibilityActive.value = enabled;
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
  if (selection.mode === 'continue') return;
  homeMode.value = selection.mode;
  if (selection.mode === 'instant') {
    instantChartKind.value = selection.instantChartKind;
    agentBaziFortune.value = null;
    agentZiweiFortune.value = null;
    agentAstrolabeFortune.value = null;
    return;
  }
  if (selection.mode === 'chart') {
    homeChartKind.value = selection.chartKind;
    agentBaziFortune.value = selection.baziFortune || null;
    agentZiweiFortune.value = selection.ziweiFortune || null;
    agentAstrolabeFortune.value = selection.astrolabeFortune || null;
    return;
  }
  agentBaziFortune.value = null;
  agentZiweiFortune.value = null;
  agentAstrolabeFortune.value = null;
  selectedKind.value = selection.divinationKind;
  if (selection.divinationKind === 'qimen') {
    if (selection.qimenScope) settings.qimenScope = selection.qimenScope;
    if (selection.qimenLayout) settings.qimenLayout = selection.qimenLayout;
    if (selection.qimenJuMethod) settings.qimenJuMethod = selection.qimenJuMethod;
  }
  if (selection.divinationKind === 'taiyi' && selection.taiyiScope) settings.taiyiScope = selection.taiyiScope;
  if (selection.divinationKind === 'wuyun-liuqi') selectedWuyunYear.value = selection.wuyunYear || new Date().getFullYear();
  if (selection.divinationKind === 'huangji-jingshi') {
    if (selection.huangjiMode) settings.huangjiMode = selection.huangjiMode;
    if (selection.huangjiYear) selectedHuangjiYear.value = selection.huangjiYear;
  }
  if (selectedKind.value === 'almanac') settings.almanacTopic = inferAlmanacTopic(questionText);
}

async function resolveAgentSelection(questionText: string) {
  if (appPreferences.displayLevel !== 'basic' && homeMode.value === 'instant') {
    return { mode: 'instant', instantChartKind: instantChartKind.value } as const;
  }
  const previousTool = homeState.value === 'chat' && chatMessages.value.length
    ? homeMode.value === 'chart' ? homeChartKind.value : homeMode.value === 'instant' ? instantChartKind.value : selectedKind.value
    : undefined;
  const sessionId = chatSessionId;
  agentAbortController?.abort();
  const controller = new AbortController();
  agentAbortController = controller;
  try {
    const conversation = chatMessages.value
      .filter((message): message is ChatTextMessage => message.kind === 'text')
      .slice(-6)
      .map((message) => ({ role: message.role, content: message.content }));
    const activeTool = appPreferences.displayLevel === 'basic'
      ? undefined
      : homeMode.value === 'chart' ? homeChartKind.value : homeMode.value === 'instant' ? instantChartKind.value : selectedKind.value;
    const selectionPayload = {
      question: questionText,
      hasProfile: Boolean(activeCase.value?.date && activeCase.value?.time),
      inspirationMode: selectedInspirationPrompt.value ? inspirationMode.value : undefined,
      previousTool,
      activeTool,
      castingPreference: appPreferences.castingPreference,
      conversation,
      aiConfig: activeAiRequestConfig.value,
    };
    const localSelection = getLocalAgentSelection(selectionPayload);
    if (localSelection) return localSelection;
    const immediateSelection = getImmediateActiveDivinationSelection(questionText, activeTool, chatMessages.value.length > 0);
    if (immediateSelection) return immediateSelection;
    const selection = await requestAgentToolSelection(selectionPayload, controller.signal);
    if (sessionId !== chatSessionId || controller.signal.aborted) throw new DOMException('会话已结束', 'AbortError');
    return selection;
  } finally {
    if (agentAbortController === controller) agentAbortController = null;
  }
}

function chooseDisplayLevel(level: DisplayLevel) {
  appPreferences.displayLevel = level;
  showToolPicker.value = false;
  persistPreferences();
}

function choosePromptSchool(method: PromptSchoolMethod, choice: PromptSchoolChoice) {
  const options = getPromptSchoolChoiceOptions(method);
  const normalizedChoice = options.some(item => item.value === choice) ? choice : 'all';
  appPreferences.promptSchoolChoices = {
    ...appPreferences.promptSchoolChoices,
    [method]: normalizedChoice,
  };
  persistPreferences();
}

function chooseActivePromptSchool(choice: string | number) {
  const method = activePromptSchoolMethod.value;
  if (!method) return;
  choosePromptSchool(method, String(choice));
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
  almanacWeekendPreference.value = 'any';
  almanacTimePreference.value = 'any';
  settings.almanacTopic = '';
  almanacSearchItems.value = [];
  almanacSearchError.value = '';
  almanacSearchLoading.value = false;
  showAlmanacSearchModal.value = false;
  almanacSearchRequestId += 1;
  almanacCaseIds.value = activeGlobalCaseId.value ? [activeGlobalCaseId.value] : [];
}

function closeNavigationOverlays() {
  showBasicAiFallbackModal.value = false;
  closeInspirationModal();
  closeReadingModal();
  closeTarotModal();
  closeFortuneDatePicker();
  if (!showOnboarding.value) closeBirthPicker();
}

async function goView(view: AppView, options: { preservePageState?: boolean } = {}) {
  if (view === 'almanac' || view === 'settings') {
    try {
      await ensureAlmanacRuntime();
    } catch {
      showToast('黄历数据加载失败，请检查网络后重试。');
      return;
    }
  }
  const previousView = activeView.value;
  const changedView = previousView !== view;
  const fallbackQuestionToRestore = view === 'tools' && restoreBasicAiFallbackQuestionOnHome.value
    ? basicAiFallbackQuestion.value
    : '';
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
  if (fallbackQuestionToRestore) {
    question.value = fallbackQuestionToRestore;
    restoreBasicAiFallbackQuestionOnHome.value = false;
  }
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

async function openSettingsSection(section: SettingsSection) {
  applyingAppRoute = true;
  try {
    await goView('settings');
    activeSettingsSection.value = section;
    if (section === 'ai') configuringAiChannelId.value = appPreferences.activeAiChannelId;
    contentRef.value?.scrollTo({ top: 0, behavior: 'smooth' });
  } finally {
    applyingAppRoute = false;
    syncAppRouteToLocation();
  }
}

function openBasicAiFallback(error: unknown, questionText: string) {
  basicAiFallbackQuestion.value = questionText;
  basicAiFallbackError.value = error instanceof Error ? error.message : 'AI 暂时无法选择合适的工具。';
  basicAiFallbackCopyState.value = 'idle';
  showBasicAiFallbackModal.value = true;
}

function closeBasicAiFallback() {
  showBasicAiFallbackModal.value = false;
}

function openBasicAiFallbackSettings() {
  question.value = basicAiFallbackQuestion.value;
  restoreBasicAiFallbackQuestionOnHome.value = true;
  closeBasicAiFallback();
  openSettingsSection('ai');
}

function chooseBasicAiFallbackMode(mode: HomeMode) {
  question.value = basicAiFallbackQuestion.value;
  homeMode.value = mode;
  basicAiFallbackPickerMode.value = mode;
  closeBasicAiFallback();
  showToolPicker.value = true;
}

function closeBasicAiFallbackPicker() {
  showToolPicker.value = false;
  basicAiFallbackPickerMode.value = null;
}

function retryBasicAiSelection() {
  question.value = basicAiFallbackQuestion.value;
  closeBasicAiFallback();
  void beginReading();
}

async function copyBasicAiFallbackPrompt() {
  if (!basicAiFallbackQuestion.value) return;
  if (basicAiFallbackCopyTimer !== undefined) window.clearTimeout(basicAiFallbackCopyTimer);
  try {
    await writeClipboardText(buildExternalAiPrompt({
      mode: 'ask',
      question: basicAiFallbackQuestion.value,
      conversation: currentConversationContext(),
      preferences: {
        answerPreference: appPreferences.answerPreference,
        displayLevel: appPreferences.displayLevel,
      },
    }));
    basicAiFallbackCopyState.value = 'copied';
  } catch {
    basicAiFallbackCopyState.value = 'error';
  }
  basicAiFallbackCopyTimer = window.setTimeout(() => {
    basicAiFallbackCopyState.value = 'idle';
  }, 2200);
}

async function openCasesSection(section: CasesSection = 'input') {
  applyingAppRoute = true;
  try {
    await goView('cases');
    activeCasesSection.value = section;
    caseError.value = '';
    if (section === 'records') caseSearch.value = '';
    contentRef.value?.scrollTo({ top: 0, behavior: 'smooth' });
  } finally {
    applyingAppRoute = false;
    syncAppRouteToLocation();
  }
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
  almanacWeekendPreference.value = 'any';
  almanacTimePreference.value = 'any';
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

function isDefaultDivinationTool(kind: DivinationKind) {
  return appPreferences.defaultHomeTool.mode === 'divination' && appPreferences.defaultHomeTool.kind === kind;
}

function isDefaultChartTool(kind: HomeChartKind) {
  return appPreferences.defaultHomeTool.mode === 'chart' && appPreferences.defaultHomeTool.kind === kind;
}

function isDefaultInstantTool(kind: InstantChartType) {
  return appPreferences.defaultHomeTool.mode === 'instant' && appPreferences.defaultHomeTool.kind === kind;
}

function setDefaultHomeTool(tool: DefaultHomeTool) {
  appPreferences.defaultHomeTool = tool;
  persistPreferences();
  const label = tool.mode === 'chart'
    ? homeChartOptions.find((item) => item.kind === tool.kind)?.label
    : tool.mode === 'instant'
      ? instantChartOptions.find((item) => item.kind === tool.kind)?.fullLabel
      : kindMeta[tool.kind].label;
  showToast(`已将${label || '该工具'}设为新会话默认工具`);
}

function applyDefaultHomeTool() {
  const preferred = appPreferences.defaultHomeTool;
  if (preferred.mode === 'chart') {
    homeMode.value = 'chart';
    homeChartKind.value = preferred.kind;
    return;
  }
  if (preferred.mode === 'instant') {
    homeMode.value = 'instant';
    instantChartKind.value = preferred.kind;
    return;
  }
  const availableKinds = appPreferences.displayLevel === 'master' ? masterDivinationKinds : beginnerDivinationKinds;
  homeMode.value = 'divination';
  selectedKind.value = availableKinds.includes(preferred.kind) ? preferred.kind : defaultHomeToolFallback.kind;
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
  agentZiweiFortune.value = null;
  agentAstrolabeFortune.value = null;
  showToolPicker.value = false;
  formError.value = '';
  if (basicAiFallbackPickerMode.value) {
    forcedBasicAgentSelection.value = { mode: 'divination', divinationKind: kind };
    basicAiFallbackPickerMode.value = null;
    void nextTick(() => beginReading());
  }
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

async function openInspirationModal() {
  try {
    await ensureInspirationLibrary();
  } catch {
    showToast('问题灵感加载失败，请检查网络后重试。');
    return;
  }
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

function openQuestionSupplementModal() {
  showQuestionSupplementModal.value = true;
  showToolPicker.value = false;
}

function closeQuestionSupplementModal() {
  showQuestionSupplementModal.value = false;
}

function addQuestionSupplement() {
  const supplement = [
    ['事情背景', questionSupplement.background],
    ['目前情况', questionSupplement.current],
    ['相关时间', questionSupplement.timing],
    ['可选方案或顾虑', questionSupplement.options],
    ['最想了解', questionSupplement.focus],
  ]
    .filter(([, value]) => value.trim())
    .map(([label, value]) => `${label}：${value.trim()}`)
    .join('\n');
  if (!supplement) return;
  const currentQuestion = question.value.trimEnd();
  question.value = currentQuestion ? `${currentQuestion}\n\n${supplement}` : supplement;
  selectedInspirationPrompt.value = '';
  formError.value = '';
  Object.assign(questionSupplement, { background: '', current: '', timing: '', options: '', focus: '' });
  closeQuestionSupplementModal();
}

function openReadingModal(message: ChatReadingMessage) {
  selectedReadingMessage.value = message;
  showReadingModal.value = true;
}

function openTarotModal(message: ChatTarotMessage) {
  selectedTarotMessage.value = message;
  showTarotModal.value = true;
}

function openInstantModal(message: ChatInstantMessage) {
  selectedInstantMessage.value = message;
  showInstantModal.value = true;
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
  if (huangji) return huangji.dateTimeForecast?.civilTime.dateTime || `${huangjiReadingYear(huangji)} 年值年卦`;
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

function closeTarotModal() {
  showTarotModal.value = false;
  selectedTarotMessage.value = null;
}

function closeInstantModal() {
  showInstantModal.value = false;
  selectedInstantMessage.value = null;
}

async function submitHomePrompt() {
  await beginReading();
}

function leaveChat() {
  cancelChatSelection();
  chatSessionId += 1;
  agentAbortController?.abort();
  agentAbortController = null;
  homeState.value = 'default';
  applyDefaultHomeTool();
  agentBaziFortune.value = null;
  agentZiweiFortune.value = null;
  agentAstrolabeFortune.value = null;
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
  closeTarotModal();
  closeInstantModal();
}

function chooseHomeChart(kind: HomeChartKind) {
  homeMode.value = 'chart';
  homeChartKind.value = kind;
  agentBaziFortune.value = null;
  agentZiweiFortune.value = null;
  agentAstrolabeFortune.value = null;
  showToolPicker.value = false;
  closeManualReading();
  chartError.value = '';
  aiError.value = '';
  formError.value = '';
  if (basicAiFallbackPickerMode.value) {
    forcedBasicAgentSelection.value = { mode: 'chart', chartKind: kind };
    basicAiFallbackPickerMode.value = null;
    void nextTick(() => beginReading());
  }
}

function chooseInstantChart(kind: InstantChartType) {
  homeMode.value = 'instant';
  instantChartKind.value = kind;
  agentBaziFortune.value = null;
  agentZiweiFortune.value = null;
  agentAstrolabeFortune.value = null;
  showToolPicker.value = false;
  closeManualReading();
  aiError.value = '';
  formError.value = '';
}

function chooseInstantTimeStandard(standard: string) {
  instantTimeStandard.value = standard === 'true-solar' ? 'true-solar' : 'beijing';
  formError.value = '';
}

function chooseQimenScope(scope: typeof settings.qimenScope) {
  if (settings.qimenScope === scope) return;
  settings.qimenScope = scope;
  closeManualReading();
  formError.value = '';
}

function chooseQimenLayout(layout: typeof settings.qimenLayout) {
  if (settings.qimenLayout === layout) return;
  settings.qimenLayout = layout;
  closeManualReading();
  formError.value = '';
}

function chooseQimenJuMethod(method: typeof settings.qimenJuMethod) {
  if (settings.qimenJuMethod === method) return;
  settings.qimenJuMethod = method;
  closeManualReading();
  formError.value = '';
}

function chooseTaiyiScope(scope: typeof settings.taiyiScope) {
  if (settings.taiyiScope === scope) return;
  settings.taiyiScope = scope;
  closeManualReading();
  formError.value = '';
}

function chooseHuangjiMode(mode: typeof settings.huangjiMode) {
  if (settings.huangjiMode === mode) return;
  settings.huangjiMode = mode;
  formError.value = '';
}

function updateTaiyiYear(event: Event) {
  const year = Number((event.target as HTMLInputElement).value);
  if (!Number.isInteger(year) || year < 1 || year > 9999) {
    formError.value = '请选择 1 至 9999 年之间的公历年份。';
    return;
  }
  selectedTaiyiYear.value = year;
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

async function chooseChart(kind: ChartKind) {
  showBaziColumnSettings.value = false;
  if (kind === 'bazi') {
    try {
      await ensureBaziRuntime();
    } catch {
      showToast('八字排盘加载失败，请检查网络后重试。');
      return;
    }
  }
  chartKind.value = kind;
  const cached = activeCase.value?.date && activeCase.value?.time ? getCachedChart(kind, activeCase.value) : null;
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
  showToolPicker.value = false;
  showHistory.value = false;
  showMobileNav.value = false;
}

function selectCase(id: string) {
  if (id && !cases.value.some((profile) => profile.id === id)) return;
  selectedCaseId.value = id;
  persistSelectedCaseId();
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
    ? [...provinceOptions.value, { id: 'overseas', label: '海外常用' }]
    : provinceOptions.value;
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
  if (target === 'create') return newCaseDraft.value;
  if (target === 'instant') return instantObserverDraft.value;
  return editableCase.value;
}

const birthPickerTitle = computed(() => {
  if (birthPicker.target === 'instant') return '选择观测地点';
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

function resolvedBirthPlaceValues(result: ResolvedBirthPlace) {
  return [
    result.path.province.id,
    result.path.city?.id || result.path.province.id,
    result.path.district?.id || result.path.city?.id || result.path.province.id,
  ];
}

const birthPlaceSearchResults = computed<BirthPlaceSearchResult[]>(() => {
  if (!birthPicker.open || birthPicker.kind !== 'region') return [];
  const query = birthPlaceSearchQuery.value.trim();
  if (!query || !locationRuntime) return [];
  const normalizedQuery = query.toLocaleLowerCase().replace(/[\s·-]+/g, '');
  const externalMatches = externalRegions
    .filter((region) => `${region.label}${region.locationName}${region.id}`.toLocaleLowerCase().replace(/[\s·-]+/g, '').includes(normalizedQuery))
    .map((region) => ({
      key: `overseas-${region.id}`,
      label: region.label,
      detail: '海外观测地点',
      values: ['overseas', region.id, region.id],
    }));
  const domesticMatches = searchBirthPlaces(query, { limit: 16, levels: ['district'] }).map((result) => ({
    key: `china-${result.regionId}`,
    label: result.label,
    detail: result.displayName,
    values: resolvedBirthPlaceValues(result),
  }));
  return [...externalMatches, ...domesticMatches].slice(0, 16);
});

function birthPickerFieldValue(kind: BirthPickerKind, profile: CaseProfile) {
  if (kind === 'gender') return profile.gender === 'male' ? '男' : '女';
  if (kind === 'calendar') return profile.dateType === 'lunar' ? '农历' : '公历';
  if (kind === 'date') return profile.date ? formatCaseDate(profile) : '请选择';
  if (kind === 'time') return profile.time || '请选择';
  return profile.locationName || '请选择';
}

function chooseCaseGender(profile: CaseProfile, value: string, target: BirthPickerTarget) {
  profile.gender = value === 'male' ? 'male' : 'female';
  if (target === 'create') newCaseGenderConfirmed.value = true;
  caseError.value = '';
}

function chooseCaseCalendar(profile: CaseProfile, value: string) {
  const dateType = value === 'lunar' ? 'lunar' : 'solar';
  if (profile.dateType !== dateType) profile.date = '';
  profile.dateType = dateType;
  profile.isLeapMonth = false;
  caseError.value = '';
}

async function openBirthPicker(kind: BirthPickerKind, target: BirthPickerTarget) {
  if (kind === 'region') {
    try {
      await ensureLocationRuntime();
    } catch {
      showToast('地区数据加载失败，请检查网络后重试。');
      return;
    }
  }
  const profile = profileForBirthPicker(target);
  birthPlaceSearchQuery.value = '';
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
  birthPlaceSearchQuery.value = '';
}

function selectBirthPlaceSearchResult(result: BirthPlaceSearchResult) {
  confirmBirthPicker(result.values);
}

function confirmBirthPicker(values: string[]) {
  updateBirthPickerValues(values);
  const profile = profileForBirthPicker();
  if (birthPicker.kind === 'gender') {
    profile.gender = birthPicker.values[0] === 'male' ? 'male' : 'female';
    if (birthPicker.target === 'create') newCaseGenderConfirmed.value = true;
  }
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
    if (birthPicker.target === 'create') newCaseRegionConfirmed.value = true;
  }
  if (birthPicker.target === 'instant') formError.value = '';
  else caseError.value = '';
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
  newCaseGenderConfirmed.value = false;
  newCaseRegionConfirmed.value = false;
  caseError.value = '';
}

function caseValidationMessage(profile: CaseProfile) {
  if (!profile.label.trim() && !profile.name.trim()) return '请填写备注或姓名。';
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
  if (profile.timeBasis === 'trueSolar' && (!profile.regionId || !profile.locationName)) return '请选择出生地区。';
  return '';
}

function setNewCaseError(message: string, controlId: string) {
  caseError.value = message;
  nextTick(() => document.getElementById(controlId)?.focus());
}

function saveNewCase() {
  const profile = { ...newCaseDraft.value };
  if (!profile.label.trim() && !profile.name.trim()) {
    setNewCaseError('请填写备注或姓名。', 'new-case-label');
    return;
  }
  if (!newCaseGenderConfirmed.value) {
    setNewCaseError('请选择性别。', 'new-case-gender');
    return;
  }
  const validationError = caseValidationMessage(profile);
  if (validationError) {
    setNewCaseError(validationError, validationError.includes('地区') ? 'new-case-region' : 'new-case-date');
    return;
  }
  const isFirstCase = cases.value.length === 0;
  profile.id = `case-${Date.now()}`;
  profile.label = profile.label.trim() || profile.name.trim() || `案例 ${cases.value.length + 1}`;
  profile.name = profile.name.trim() || profile.label;
  profile.isDefault = isFirstCase;
  cases.value = [...cases.value, profile];
  if (isFirstCase) {
    selectedCaseId.value = profile.id;
    persistSelectedCaseId();
  }
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
  if (selectedCaseId.value === deletedCaseId) {
    selectedCaseId.value = '';
    persistSelectedCaseId();
  }
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
    const schoolMethod = getPromptSchoolMethod(kind);
    const schools = resolvePromptSchoolIds(schoolMethod, appPreferences.displayLevel, appPreferences.promptSchoolChoices);
    const corePrompt = mode === 'divination' ? await buildDivinationReadingPrompt(kind, result, { question: questionText, schools }) : undefined;
    const chartPrompt = mode === 'chart' && isChartReading(kind)
      ? (await import('./lib/chartPrompt')).buildChartReadingPrompt(kind, result, { ...chartPromptOptions, question: questionText, schools })
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
    prompt: (await import('./lib/chartPrompt')).buildBaziZiweiCombinedPrompt(bazi, ziwei, {
      question: questionText,
      baziFortune,
      baziSchools: resolvePromptSchoolIds('bazi', appPreferences.displayLevel, appPreferences.promptSchoolChoices),
      ziweiSchools: resolvePromptSchoolIds('ziwei', appPreferences.displayLevel, appPreferences.promptSchoolChoices),
    }),
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
  if (kind === 'bazi') await ensureBaziRuntime();
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
  if (kind === 'taiyi') {
    const taiyi = result as TaiyiResult;
    settings.taiyiScope = taiyi.scope;
    selectedTaiyiYear.value = Number(taiyi.dateTime.slice(0, 4)) || new Date().getFullYear();
  }
  if (kind === 'huangji-jingshi') {
    const huangji = result as HuangjiJingshiResult;
    settings.huangjiMode = huangji.dateTimeForecast ? 'date' : 'year';
    selectedHuangjiYear.value = huangjiReadingYear(huangji);
  }
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
    const result = await runAutomaticCasting(kind, new Date(), {
      qimenScope: settings.qimenScope,
      qimenLayout: settings.qimenLayout,
      qimenJuMethod: settings.qimenJuMethod,
      taiyiScope: settings.taiyiScope,
      taiyiYear: selectedTaiyiYear.value,
    });
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

function westernReadingDeckName(reading: WesternReadingResult) {
  return reading.deckType === 'lenormand' ? '雷诺曼' : reading.deckType === 'shiyue-oracle' ? '时月神谕' : '塔罗牌';
}

function isTarotReading(reading: WesternReadingResult): reading is TarotReadingResult {
  return !reading.deckType || reading.deckType === 'tarot';
}

function startTarotInterpretation(payload: WesternInterpretationPayload) {
  goView('tools');
  const sessionId = chatSessionId;
  homeMode.value = 'divination';
  homeState.value = 'chat';
  question.value = '';
  formError.value = '';
  aiError.value = '';
  chatMessages.value = [
    { kind: 'text', role: 'user', content: payload.question },
    { kind: 'tarot', role: 'assistant', content: '', reading: payload.reading },
  ];
  void requestInterpretation(payload.request, true, sessionId, null);
}

async function startDailyHexagramInterpretation(result: DailyHexagramResult) {
  if (isInterpreting.value) return;
  const questionText = '请解读今天的卦象，说明我今天应关注的重点、变化趋势和行动建议。';
  aiAnswer.value = '';
  aiError.value = '';
  lastAiRequest.value = null;
  lastAiHistoryRecordId.value = null;
  try {
    const request = await buildAiRequest('divination', questionText, 'liuyao', result.chart);
    const dateLabel = new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric', month: 'long', day: 'numeric',
    }).format(new Date());
    request.method = '每日一卦';
    request.reading = {
      summary: `${formatReadingSummary('liuyao', result.chart)} 今日主题为“${result.guidance.theme}”。${result.guidance.summary}`,
      data: result.chart,
      prompt: [
        request.reading?.prompt,
        (await import('./lib/dailyHexagram')).formatDailyHexagramAiContext(result, dateLabel),
      ].filter((item): item is string => Boolean(item)).join('\n\n'),
    };
    await requestInterpretation(request, false, chatSessionId, null);
  } catch (error) {
    aiError.value = error instanceof Error ? error.message : '每日一卦的 AI 解读暂时没有完成。';
  }
}

async function beginReading() {
  if (isReading.value || isInterpreting.value || chartLoading.value) return;
  if (homeMode.value === 'chart' && !activeCase.value) {
    forcedBasicAgentSelection.value = null;
    formError.value = cases.value.length ? '请先在顶部选择一个案例。' : '请先添加案例。';
    showToolPicker.value = false;
    if (!cases.value.length) openCases();
    return;
  }
  formError.value = '';
  aiError.value = '';
  const requestedQuestion = question.value.trim();
  if (!requestedQuestion) {
    formError.value = '请先写下想问的事，或从问题灵感中选择。';
    return;
  }
  const sessionId = chatSessionId;
  const hasCurrentReading = homeState.value === 'chat' && chatMessages.value.some((message) => message.kind === 'reading' || message.kind === 'tarot' || message.kind === 'instant');
  const usingBasicFallbackSelection = Boolean(forcedBasicAgentSelection.value);
  isReading.value = true;
  try {
    const selection = forcedBasicAgentSelection.value || await resolveAgentSelection(requestedQuestion);
    if (sessionId !== chatSessionId) return;
    const shouldContinue = selection.mode === 'continue'
      || (hasCurrentReading && shouldContinueExistingDivination(requestedQuestion, selectedKind.value, selection));
    if (shouldContinue) {
      if (hasCurrentReading && await continueCurrentReading(requestedQuestion)) return;
      formError.value = '当前没有可继续追问的盘面，请换一种问法。';
      return;
    }
    applyAgentSelection(selection, requestedQuestion);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    if (appPreferences.displayLevel === 'basic') openBasicAiFallback(error, requestedQuestion);
    else formError.value = error instanceof Error ? error.message : 'AI 暂时无法选择合适的工具。';
    return;
  } finally {
    if (sessionId === chatSessionId) isReading.value = false;
  }
  if (homeMode.value === 'instant') {
    const observer = instantObserver.value;
    if (instantNeedsObserver.value && !observer) {
      formError.value = `${instantChartMeta.value.fullLabel}需要先选择观测地点。`;
      await openBirthPicker('region', 'instant');
      return;
    }
    if (usingBasicFallbackSelection) forcedBasicAgentSelection.value = null;
    const instantQuestion = requestedQuestion;
    const instantAiQuestion = selectedInspirationPrompt.value || instantQuestion;
    homeState.value = 'chat';
    showToolPicker.value = false;
    chatMessages.value = [...chatMessages.value, { kind: 'text', role: 'user', content: instantQuestion }];
    question.value = '';
    chartLoading.value = true;
    try {
      const response = await runInstantChart({
        type: instantChartKind.value,
        timeStandard: instantTimeStandard.value,
        ...(observer ? { observer } : {}),
      });
      if (sessionId !== chatSessionId) return;
      chatMessages.value = [...chatMessages.value, { kind: 'instant', role: 'assistant', content: '', response }];
      const request: AiInterpretationRequest = {
        mode: 'chart',
        question: instantAiQuestion,
        method: response.label,
        reading: {
          summary: instantChartSummary(response),
          data: { type: response.type, timeStandard: response.timeStandard, generatedAt: response.generatedAt },
          prompt: buildInstantAiPrompt(response, instantAiQuestion),
        },
        preferences: {
          answerPreference: appPreferences.answerPreference,
          displayLevel: appPreferences.displayLevel,
        },
        aiConfig: channelToAiConfig(activeAiChannel.value),
      };
      await requestInterpretation(request, true, sessionId, null);
      selectedInspirationPrompt.value = '';
    } catch (error) {
      formError.value = error instanceof Error ? error.message : '即时排盘没有完成，请稍后重试。';
    } finally {
      if (sessionId === chatSessionId) chartLoading.value = false;
    }
    return;
  }
  if (homeMode.value === 'chart') {
    if (!activeCase.value?.date || !activeCase.value?.time) {
      formError.value = activeCase.value ? '请先完善案例资料。' : '请先在顶部选择一个案例。';
      if (!activeCase.value && cases.value.length) toggleCaseSwitcher();
      else openCases();
      return;
    }
    if (usingBasicFallbackSelection) forcedBasicAgentSelection.value = null;
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
          agentZiweiFortune.value
            ? calculateUncachedChart('ziwei', currentCase.value, { ziweiFortune: agentZiweiFortune.value })
            : calculateCachedChart('ziwei', currentCase.value),
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
      const chartEntry = kind === 'ziwei' && agentZiweiFortune.value
        ? await calculateUncachedChart(kind, currentCase.value, { ziweiFortune: agentZiweiFortune.value })
        : kind === 'astrolabe' && agentAstrolabeFortune.value
          ? await calculateUncachedChart(kind, currentCase.value, { astrolabeFortune: agentAstrolabeFortune.value })
          : await calculateCachedChart(kind, currentCase.value);
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
  if (usingBasicFallbackSelection) forcedBasicAgentSelection.value = null;

  if (selectedKind.value === 'almanac') {
    await ensureAlmanacRuntime();
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

  if (selectedMeta.value.needsBirth && !activeCase.value?.date) {
    formError.value = activeCase.value ? '请先完善案例资料。' : '请先在顶部选择一个案例。';
    if (!activeCase.value && cases.value.length) toggleCaseSwitcher();
    else openCases();
    return;
  }
  homeState.value = 'chat';
  showToolPicker.value = false;
  question.value = '';
  isReading.value = true;
  await new Promise((resolve) => window.setTimeout(resolve, 320));
  if (sessionId !== chatSessionId) return;
  try {
    const result = await runDivination(selectedKind.value, new Date(), activeCase.value || undefined, {
      qimenScope: settings.qimenScope,
      qimenLayout: settings.qimenLayout,
      qimenJuMethod: settings.qimenJuMethod,
      taiyiScope: settings.taiyiScope,
      taiyiYear: selectedTaiyiYear.value,
      wuyunYear: selectedWuyunYear.value,
      huangjiMode: settings.huangjiMode,
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

interface AgentChartCalculationOptions {
  ziweiFortune?: AgentZiweiFortune | null;
  astrolabeFortune?: AgentAstrolabeFortune | null;
}

function localTodayKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function astrolabeTargetDate(fortune?: AgentAstrolabeFortune | null) {
  if (!fortune || fortune.scope === 'natal') return '';
  if (fortune.date) return fortune.date;
  const today = localTodayKey();
  if (fortune.scope === 'yearly') return today.slice(0, 4);
  if (fortune.scope === 'monthly') return today.slice(0, 7);
  return today;
}

async function calculateChart(kind: ChartKind, birth: CaseProfile, options: AgentChartCalculationOptions = {}): Promise<ReadingResult> {
  if (kind === 'ziwei') return await runZiweiChart(birth, options.ziweiFortune || { scope: 'full' });
  if (kind === 'bazi') await ensureBaziRuntime();
  const result = await runDivination(kind, new Date(), birth);
  if (kind === 'astrolabe' && isAstrolabe(result)) {
    const { buildAstrolabeFullScopeContexts, buildAstrolabeScopeContext } = await import('mingyu-core/divination/astrolabe-scope');
    const fortune = options.astrolabeFortune || { scope: 'yearly' as const, date: String(new Date().getFullYear()) };
    const targetDate = astrolabeTargetDate(fortune);
    let fortuneScope = buildAstrolabeScopeContext(result, fortune.scope, targetDate);
    if (fortune.scope === 'full') {
      const contexts = buildAstrolabeFullScopeContexts(result, targetDate);
      fortuneScope = {
        ...fortuneScope,
        promptText: [contexts.natal, contexts.yearly, contexts.monthly, contexts.daily]
          .map((context) => context.promptText)
          .filter(Boolean)
          .join('\n\n'),
        solarReturnEvidence: contexts.yearly.solarReturnEvidence,
        secondaryProgressionEvidence: contexts.yearly.secondaryProgressionEvidence,
        solarArcEvidence: contexts.yearly.solarArcEvidence,
      };
    }
    return {
      ...result,
      fortuneScope,
    } as AstrolabeChartData;
  }
  return result;
}

async function calculateUncachedChart(kind: ChartKind, birth: CaseProfile, options: AgentChartCalculationOptions) {
  return { result: await calculateChart(kind, birth, options), createdAt: Date.now() };
}

async function calculateCachedChart(kind: ChartKind, birth: CaseProfile) {
  if (kind === 'bazi') await ensureBaziRuntime();
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

function returnBaziFortuneToToday() {
  const result = displayResult.value;
  if (!result || !isBazi(result)) return;
  const now = new Date();
  const activeCycle = getLuckCycleForDate(result.luckInfo.cycles, now);
  const activeIndex = result.luckInfo.cycles.findIndex((cycle) => cycle === activeCycle);
  selectedBaziCycleIndex.value = activeIndex >= 0 ? activeIndex : 0;
  const years = selectedBaziYears.value;
  selectedBaziYear.value = years.some((item) => item.year === now.getFullYear())
    ? now.getFullYear()
    : years[0]?.year || null;
  resetBaziFortuneDetailSelection();
  void nextTick(() => {
    document.querySelectorAll<HTMLElement>('.bazi-fortune-board .luck-list, .bazi-fortune-board .liunian-list, .bazi-fortune-board .bazi-fortune-strip')
      .forEach((strip) => {
        const activeOption = strip.querySelector<HTMLElement>('button.active');
        if (!activeOption) return;
        strip.scrollTo({
          behavior: 'smooth',
          left: Math.max(0, activeOption.offsetLeft - (strip.clientWidth - activeOption.offsetWidth) / 2),
        });
      });
  });
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
  const context = (result as AstrolabeChartData).fortuneScope || (result as AstrolabeChartData).annualScope || null;
  return context?.scope === 'yearly' ? context : null;
}

function astroFortuneYear(result: AstrolabeData) {
  return Number(astroAnnualScope(result)?.dateStr.slice(0, 4)) || currentFortuneYear;
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
  if (!activeCase.value?.date || !activeCase.value?.time) {
    chartResult.value = null;
    chartRecord.value = null;
    chartLoading.value = false;
    chartError.value = cases.value.length ? '请先在顶部选择一个案例。' : '请先添加并完善案例资料。';
    return;
  }
  const kind = chartKind.value as ChartKind;
  const profile: CaseProfile = { ...currentCase.value };
  if (kind === 'bazi') {
    try {
      await ensureBaziRuntime();
    } catch {
      chartLoading.value = false;
      chartError.value = '八字排盘加载失败，请检查网络后重试。';
      return;
    }
  }
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
  const profile = activeCase.value;
  if (!profile || !/^\d{4}-\d{2}-\d{2}$/.test(profile.date) || !/^\d{2}:\d{2}$/.test(profile.time)) return undefined;
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

function restoredHistoryInterpretationError(record: HistoryRecordEntry) {
  return record.interpretation?.trim() ? '' : record.interpretationError?.trim() || '';
}

async function openRecord(record: HistoryRecordEntry) {
  if (isLegacyHistoryRecord(record)) {
    showHistory.value = false;
    selectedLegacyHistory.value = record;
    return;
  }
  try {
    if (record.kind === 'almanac') await ensureAlmanacRuntime();
    if (record.kind === 'bazi' || record.relatedResults?.some((item) => item.kind === 'bazi')) await ensureBaziRuntime();
  } catch {
    showToast('记录所需数据加载失败，请检查网络后重试。');
    return;
  }
  showHistory.value = false;
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
    aiError.value = restoredHistoryInterpretationError(record);
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
    aiError.value = restoredHistoryInterpretationError(record);
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
    aiError.value = restoredHistoryInterpretationError(record);
    return;
  }
  goView('tools');
  selectedKind.value = record.kind;
  if (record.kind === 'wuyun-liuqi') selectedWuyunYear.value = wuyunReadingYear(record.result as WuyunLiuqiResult);
  if (record.kind === 'taiyi') {
    const taiyi = record.result as TaiyiResult;
    settings.taiyiScope = taiyi.scope;
    selectedTaiyiYear.value = Number(taiyi.dateTime.slice(0, 4)) || new Date().getFullYear();
  }
  if (record.kind === 'huangji-jingshi') {
    const huangji = record.result as HuangjiJingshiResult;
    settings.huangjiMode = huangji.dateTimeForecast ? 'date' : 'year';
    selectedHuangjiYear.value = huangjiReadingYear(huangji);
  }
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
  aiError.value = restoredHistoryInterpretationError(record);
}

function isMeihua(result: ReadingResult): result is MeihuaData { return 'mainHexagram' in result; }
function isLiuyao(result: ReadingResult): result is LiuyaoData { return 'yaoArray' in result; }
function isSsgw(result: ReadingResult): result is SsgwData { return 'poem' in result && 'number' in result; }
function isXiaoliuren(result: ReadingResult): result is XiaoliurenData { return 'primary' in result && 'palaceOrder' in result; }
function isJinkoujue(result: ReadingResult): result is JinkoujueData { return 'positions' in result && 'mainLine' in result; }
function isQimen(result: ReadingResult): result is QimenData { return 'jiuGongGe' in result; }
function isLiuren(result: ReadingResult): result is LiurenData { return 'threeTransmissions' in result; }
function isTaiyi(result: ReadingResult): result is TaiyiResult { return 'taiyiPalace' in result && 'sixteenGods' in result; }
function taiyiReadingScopeLabel(result: TaiyiResult) { return ({ year: '年计', month: '月计', day: '日计', hour: '时计' })[result.scope]; }
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
  return filterCommonBaziShensha(result.shensha[key], commonBaziShensha);
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
  <div class="app-shell" :class="{ 'mobile-nav-open': showMobileNav }" :data-divination-theme="activeDivinationThemeId" :style="activeDivinationThemeStyle">
    <aside id="app-sidebar" class="sidebar" :class="{ 'mobile-sidebar-open': showMobileNav }">
      <div class="sidebar-header"><button class="brand" type="button" @click="goView('tools')"><img class="brand-mark" :src="getDivinationThemeLogoUrl()" :style="{ objectPosition: activeDivinationThemeLogoPosition }" alt="" aria-hidden="true" /><span><strong>时月东方</strong><small>东方术数</small></span></button><button class="mobile-sidebar-close" type="button" aria-label="关闭导航" @click="showMobileNav = false"><X :size="18" /></button></div>
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
        <button v-else class="mobile-nav-toggle" type="button" aria-label="打开导航" aria-controls="app-sidebar" :aria-expanded="showMobileNav" @click="showMobileNav = true"><Menu :size="19" /></button>
        <div v-if="activeView === 'tools'" ref="topbarAiPickerRef" class="topbar-ai-picker">
          <button type="button" class="topbar-ai-trigger" :aria-expanded="showAiPicker" aria-label="调整解答风格和 AI 模型" :title="`${activeAnswerPreference.label} · ${activeAiChannel.name} · ${activeAiModelLabel}`" @click="toggleAiPicker">
            <span class="topbar-ai-trigger-copy"><strong>{{ activeAnswerPreference.label }}</strong><small>{{ activeAiModelLabel }}</small></span>
            <ChevronDown :size="13" />
          </button>
          <div v-if="showAiPicker" class="topbar-ai-menu">
            <section class="topbar-answer-section">
              <div class="topbar-ai-menu-heading"><strong>解答偏好</strong><small>切换表达与推演方式</small></div>
              <div class="topbar-answer-options" role="group" aria-label="解答偏好">
                <button v-for="item in answerPreferenceOptions" :key="item.value" type="button" :class="{ active: appPreferences.answerPreference === item.value }" :aria-pressed="appPreferences.answerPreference === item.value" @click="chooseAnswerPreference(item.value)">
                  <span><strong>{{ item.label }}</strong><small>{{ item.summary }}</small></span>
                  <Check v-if="appPreferences.answerPreference === item.value" :size="13" />
                </button>
              </div>
            </section>
            <section class="topbar-model-section">
              <div class="topbar-ai-menu-heading"><strong>AI 模型</strong><small>{{ activeAiChannel.name }}</small></div>
              <div class="topbar-model-controls">
                <UiSelect v-if="configuredAiChannels.length > 1" :model-value="appPreferences.activeAiChannelId" aria-label="选择 AI 渠道" @change="handleTopbarAiChannelChange"><option v-for="channel in configuredAiChannels" :key="channel.id" :value="channel.id">{{ channel.name }}</option></UiSelect>
                <span v-else class="topbar-environment-model">{{ activeAiChannel.name }}</span>
                <UiSelect v-if="activeAiChannel.provider !== 'builtin'" v-model="selectedAiModel" aria-label="选择 AI 模型"><option v-for="model in activeAiModelOptions" :key="model" :value="model">{{ model }}</option></UiSelect>
              </div>
            </section>
            <UiButton class="topbar-ai-settings" variant="secondary" size="small" block @click="openSettingsSection('ai')"><Sparkles :size="13" />管理 AI 配置</UiButton>
          </div>
        </div>
        <h1 v-else class="topbar-page-title">{{ activePageTitle }}</h1>
        <div class="topbar-actions">
          <div ref="topbarCasePickerRef" class="topbar-case-picker">
            <button class="case-trigger" type="button" :aria-expanded="showCaseSwitcher" aria-haspopup="menu" :aria-label="cases.length ? `快速切换案例，当前为${activeCase?.label || '不使用案例'}` : '添加案例'" :title="cases.length ? `当前案例：${activeCase?.label || '不使用案例'}` : '添加案例'" @click="toggleCaseSwitcher"><UserRound :size="16" /><span>{{ cases.length ? activeCase?.label || '不使用案例' : '添加案例' }}</span><ChevronDown :size="13" /></button>
            <div v-if="showCaseSwitcher" class="case-switcher-menu" role="menu">
              <div class="case-switcher-heading"><strong>全局案例</strong><small v-if="cases.length">当前使用：{{ activeCase?.label || '不使用案例' }}</small><small v-else>还没有可用案例</small></div>
              <label v-if="cases.length > 6" class="case-switcher-search"><Search :size="14" /><input v-model="caseSwitcherSearch" type="search" autocomplete="off" placeholder="搜索案例" aria-label="搜索可切换案例" /></label>
              <div class="case-switcher-list">
                <button type="button" role="menuitemradio" :aria-checked="!activeCase" :class="{ active: !activeCase }" @click="selectCase('')"><span class="case-switcher-avatar is-none">无</span><span><strong>不使用案例</strong><small>占卜与通用内容不关联人物</small></span><Check v-if="!activeCase" :size="15" /></button>
                <button v-for="profile in filteredCaseSwitcherCases" :key="profile.id" type="button" role="menuitemradio" :aria-checked="activeCase?.id === profile.id" :class="{ active: activeCase?.id === profile.id }" @click="selectCase(profile.id)"><span class="case-switcher-avatar">{{ profile.label.slice(0, 1) }}</span><span><strong>{{ profile.label }}</strong><small>{{ formatCaseDate(profile) }} · {{ profile.time || '时间待补充' }}</small></span><Check v-if="activeCase?.id === profile.id" :size="15" /></button>
                <p v-if="cases.length && !filteredCaseSwitcherCases.length" class="case-switcher-empty">没有找到案例</p>
              </div>
              <button type="button" class="case-switcher-manage" @click="openCasesSection(cases.length ? 'records' : 'input')"><BookOpen :size="14" />{{ cases.length ? '管理案例' : '添加案例' }}<ChevronRight :size="14" /></button>
            </div>
          </div>
          <button class="history-trigger" type="button" aria-label="记录" title="记录" @click="openHistory"><History :size="16" /><span>记录</span></button>
        </div>
      </header>

      <button v-if="activeView === 'tools' && homeState === 'default'" class="mobile-home-fortune-strip" type="button" :aria-label="`查看${fortuneEntryLabel}`" @click="openTodayFortune">
        <span class="mobile-home-fortune-mark"><Sun :size="15" /></span>
        <span class="mobile-home-fortune-copy"><small>{{ fortuneEntryLabel }}</small><strong>{{ homeFortunePreview?.previewText || '正在加载' }}</strong></span>
        <span v-if="homeFortunePreview" class="mobile-home-fortune-color" :style="{ backgroundColor: homeFortunePreview.reference.colors[0].hex }" :title="homeFortunePreview.reference.colors[0].name"></span>
        <ChevronRight :size="15" />
      </button>

      <main ref="contentRef" class="content" :class="{ 'is-chat-view': activeView === 'tools' && homeState === 'chat' }">
        <UiPageShell v-if="activeView === 'tools'" class="screen tools-screen" :class="{ 'is-chat': homeState === 'chat' }">
          <template v-if="homeState === 'default'">
            <section class="home-default">
              <div class="default-hero"><img class="default-mark" :src="getDivinationThemeLogoUrl()" :style="{ objectPosition: activeDivinationThemeLogoPosition }" alt="时月东方" /><h1><span>探索未来</span><span class="hero-multicolor">解读术数</span></h1><a class="merit-box-button" href="https://lk.sydf.cc/" target="_blank" rel="noopener noreferrer"><Heart :size="14" />功德箱</a></div>
            </section>
          </template>

          <template v-else>
            <div ref="chatConversationRef" class="chat-conversation" aria-live="polite">
              <div v-if="!chatMessages.length" class="chat-empty"><img class="chat-empty-icon" :src="getDivinationThemeLogoUrl()" :style="{ objectPosition: activeDivinationThemeLogoPosition }" alt="" aria-hidden="true" /><strong>{{ appPreferences.displayLevel === 'basic' ? '写下你想问的事' : homeMode === 'divination' ? `把问题交给${selectedMeta.label}` : homeMode === 'instant' ? `以此刻生成${instantChartMeta.fullLabel}` : `载入${homeChartMeta.label}` }}</strong><small>{{ appPreferences.displayLevel === 'basic' ? '系统会根据问题自动选择合适的方式。' : homeMode === 'divination' ? '选择参数或完成起卦，再点击发送。' : homeMode === 'instant' ? '即时盘不读取案例，只记录点击发送时的事件时刻。' : '确认案例资料后，点击发送生成排盘。' }}</small><UiButton variant="ghost" size="small" @click="openInspirationModal"><MessageCircle :size="14" />问题灵感</UiButton></div>
              <div
                v-for="(message, index) in chatMessages"
                :key="`${message.kind}-${message.role}-${index}`"
                class="chat-message-row"
                :class="{ 'is-selection-mode': chatSelectionMode, 'is-selected': selectedChatMessageSet.has(index) }"
                :role="chatSelectionMode ? 'checkbox' : undefined"
                :tabindex="chatSelectionMode ? 0 : undefined"
                :aria-checked="chatSelectionMode ? selectedChatMessageSet.has(index) : undefined"
                @click.capture="handleChatSelectionClick($event, index)"
                @keydown="handleChatSelectionKey($event, index)"
              >
                <span v-if="chatSelectionMode" class="chat-message-check" aria-hidden="true"><Check v-if="selectedChatMessageSet.has(index)" :size="15" /></span>
                <div v-if="message.kind === 'reading'" class="chat-reading-message is-user">
                  <AiReadingActions
                    class="reading-action-host"
                    :content="chatMessageExportItem(message).content"
                    :show-inline="false"
                    selection-enabled
                    :selection-mode="chatSelectionMode"
                    deletable
                    @request-select="startChatSelection(index)"
                    @request-delete="deleteChatMessage(index)"
                  >
                    <button type="button" class="reading-bubble" @click="openReadingModal(message)"><span class="reading-bubble-icon">{{ kindMeta[message.method].icon }}</span><span class="reading-bubble-copy"><strong>{{ kindMeta[message.method].label }}</strong><small>{{ readingDisplayTitle(message) }} · 点击查看详情</small></span><ChevronRight :size="14" /></button>
                  </AiReadingActions>
                </div>
                <div v-else-if="message.kind === 'tarot'" class="chat-reading-message is-user">
                  <AiReadingActions
                    class="reading-action-host"
                    :content="chatMessageExportItem(message).content"
                    :show-inline="false"
                    selection-enabled
                    :selection-mode="chatSelectionMode"
                    deletable
                    @request-select="startChatSelection(index)"
                    @request-delete="deleteChatMessage(index)"
                  >
                    <button type="button" class="reading-bubble tarot-reading-bubble" @click="openTarotModal(message)"><span class="reading-bubble-icon">牌</span><span class="reading-bubble-copy"><strong>{{ westernReadingDeckName(message.reading) }}</strong><small>{{ message.reading.spreadName }} · 点击查看牌阵</small></span><ChevronRight :size="14" /></button>
                  </AiReadingActions>
                </div>
                <div v-else-if="message.kind === 'instant'" class="chat-reading-message is-user">
                  <AiReadingActions
                    class="reading-action-host"
                    :content="chatMessageExportItem(message).content"
                    :show-inline="false"
                    selection-enabled
                    :selection-mode="chatSelectionMode"
                    deletable
                    @request-select="startChatSelection(index)"
                    @request-delete="deleteChatMessage(index)"
                  >
                    <button type="button" class="reading-bubble instant-reading-bubble" @click="openInstantModal(message)"><span class="reading-bubble-icon">{{ instantChartOptions.find((item) => item.kind === message.response.type)?.icon || '时' }}</span><span class="reading-bubble-copy"><strong>{{ message.response.label }}</strong><small>{{ formatInstantWallClock(message.response) }} · 点击查看盘面</small></span><ChevronRight :size="14" /></button>
                  </AiReadingActions>
                </div>
                <div v-else class="chat-message" :class="`is-${message.role}`">
                  <AiReadingActions
                    :content="message.content"
                    :title="message.role === 'user' ? '我的消息' : '时月东方解读'"
                    :show-inline="message.role === 'assistant' && index === lastAssistantTextMessageIndex"
                    selection-enabled
                    :selection-mode="chatSelectionMode"
                    deletable
                    @request-select="startChatSelection(index)"
                    @request-delete="deleteChatMessage(index)"
                  >
                    <p v-if="message.role === 'user'">{{ message.content }}</p>
                    <ChatMarkdown v-else :content="message.content" />
                  </AiReadingActions>
                </div>
              </div>
              <div v-if="isInterpreting" class="chat-message is-assistant"><p class="ai-typing">正在观象……</p></div>
              <div v-if="aiError" class="chat-message is-assistant"><p class="ai-error">{{ aiError }}</p><AiPromptFallback v-if="lastAiRequest" :request="lastAiRequest" @retry="retryLastInterpretation" /></div>
            </div>

            <div v-if="chatSelectionMode" class="chat-selection-toolbar" aria-label="消息多选操作">
              <div class="chat-selection-summary"><button type="button" @click="cancelChatSelection"><X :size="16" /><span>取消</span></button><strong>已选 {{ selectedChatMessageIndexes.length }} 条</strong></div>
              <div class="chat-selection-actions"><button type="button" @click="toggleSelectAllChatMessages"><Check :size="16" /><span>{{ selectedChatMessageIndexes.length === chatMessages.length ? '取消全选' : '全选' }}</span></button><button type="button" :disabled="!selectedChatMessageIndexes.length" @click="shareSelectedChatImage"><ImageDown :size="17" /><span>分享图片</span></button><button type="button" :disabled="!selectedChatMessageIndexes.length" @click="exportSelectedChatDocument"><FileText :size="17" /><span>导出文档</span></button><button type="button" class="is-danger" :disabled="!selectedChatMessageIndexes.length" @click="deleteSelectedChatMessages"><Trash2 :size="17" /><span>删除</span></button></div>
            </div>

          </template>

          <div v-if="!chatSelectionMode" class="chat-composer chat-composer-docked" :class="{ 'home-default-composer': homeState === 'default' }">
            <div v-if="homeState === 'default' && appPreferences.displayLevel !== 'basic' && homeMode === 'divination' && selectedKind === 'qimen'" class="setting-row"><span>局式</span><button v-for="item in [{ value: 'hour', label: '时家' }, { value: 'day', label: '日家' }, { value: 'month', label: '月家' }, { value: 'year', label: '年家' }]" :key="item.value" type="button" :class="{ active: settings.qimenScope === item.value }" @click="chooseQimenScope(item.value as typeof settings.qimenScope)">{{ item.label }}</button></div>
            <div v-if="homeState === 'default' && appPreferences.displayLevel !== 'basic' && homeMode === 'divination' && selectedKind === 'qimen'" class="setting-row qimen-method-row"><span>排法</span><button type="button" :class="{ active: settings.qimenLayout === 'zhuanpan' }" @click="chooseQimenLayout('zhuanpan')">转盘</button><button type="button" :class="{ active: settings.qimenLayout === 'feipan' }" @click="chooseQimenLayout('feipan')">飞盘</button><span class="setting-inline-label">定局</span><button type="button" :class="{ active: settings.qimenJuMethod === 'chaibu' }" @click="chooseQimenJuMethod('chaibu')">拆补</button><button type="button" :class="{ active: settings.qimenJuMethod === 'zhirun' }" @click="chooseQimenJuMethod('zhirun')">置闰</button></div>
            <div v-if="homeState === 'default' && appPreferences.displayLevel !== 'basic' && homeMode === 'divination' && selectedKind === 'taiyi'" class="setting-row"><span>计式</span><button v-for="item in [{ value: 'year', label: '年计' }, { value: 'month', label: '月计' }, { value: 'day', label: '日计' }, { value: 'hour', label: '时计' }]" :key="item.value" type="button" :class="{ active: settings.taiyiScope === item.value }" @click="chooseTaiyiScope(item.value as typeof settings.taiyiScope)">{{ item.label }}</button><input v-if="settings.taiyiScope === 'year'" class="wuyun-year-input" type="number" min="1" max="9999" step="1" :value="selectedTaiyiYear" aria-label="太乙年计公历年份" @input="updateTaiyiYear" /></div>
            <label v-if="homeState === 'default' && appPreferences.displayLevel !== 'basic' && homeMode === 'divination' && selectedKind === 'wuyun-liuqi'" class="setting-row wuyun-year-row"><span>公历年份</span><input class="wuyun-year-input" type="number" min="1900" max="2199" step="1" :value="selectedWuyunYear" aria-label="五运六气公历年份" @input="updateWuyunYear" /></label>
            <div v-if="homeState === 'default' && appPreferences.displayLevel !== 'basic' && homeMode === 'divination' && selectedKind === 'huangji-jingshi'" class="setting-row"><span>起盘</span><button type="button" :class="{ active: settings.huangjiMode === 'date' }" @click="chooseHuangjiMode('date')">年月日时</button><button type="button" :class="{ active: settings.huangjiMode === 'year' }" @click="chooseHuangjiMode('year')">值年</button><input v-if="settings.huangjiMode === 'year'" class="wuyun-year-input" type="number" min="1900" max="2199" step="1" :value="selectedHuangjiYear" aria-label="皇极经世公历年份" @input="updateHuangjiYear" /></div>
            <div v-if="homeState === 'default' && homeMode === 'instant'" class="setting-row instant-setting-row"><span>时间口径</span><button type="button" :class="{ active: instantTimeStandard === 'beijing' }" @click="chooseInstantTimeStandard('beijing')">北京时间</button><button type="button" :class="{ active: instantTimeStandard === 'true-solar' }" @click="chooseInstantTimeStandard('true-solar')">真太阳时</button><button v-if="instantNeedsObserver" type="button" class="instant-location-button" @click="openBirthPicker('region', 'instant')"><MapPin :size="13" />{{ instantObserver?.locationName || '选择观测地点' }}</button></div>
            <div v-if="homeState === 'default' && activePromptSchoolMethod" class="setting-row prompt-school-row"><span>解读体系</span><UiSelect :model-value="activePromptSchoolChoice" :options="activePromptSchoolOptions" aria-label="选择解读体系" @update:model-value="chooseActivePromptSchool" /></div>
            <textarea v-auto-resize class="composer-textarea" v-model="question" maxlength="10000" :aria-label="homeState === 'chat' ? '继续对话' : undefined" :placeholder="homeState === 'chat' ? '继续追问这次结果' : appPreferences.displayLevel === 'basic' ? '写下问题，或从问题灵感开始' : homeMode === 'chart' ? '写下想重点了解的方向' : homeMode === 'instant' ? '写下所问，以点击发送的时刻起盘' : `写下问题，交给${selectedMeta.label}`" @input="clearInspirationPrompt" @keydown.enter.exact.prevent="beginReading"></textarea>
            <small class="composer-shortcut-hint">Enter 发送 · Shift + Enter 换行</small>
            <div class="composer-toolbar">
              <div class="composer-tools">
                <div v-if="appPreferences.displayLevel !== 'basic' || basicAiFallbackPickerMode" ref="toolPickerRef" class="tool-picker">
                  <button type="button" class="tool-picker-button" :aria-expanded="showToolPicker" aria-label="选择工具" @click="showToolPicker = !showToolPicker"><Plus :size="14" /><span>{{ basicAiFallbackPickerMode === 'chart' ? '选择排盘' : basicAiFallbackPickerMode === 'divination' ? '选择占卜' : homeModeLabel }}</span><ChevronDown :size="13" /></button>
                  <div v-if="showToolPicker" class="tool-picker-panel" role="dialog" aria-label="选择工具">
                    <div class="tool-panel-title"><strong>{{ basicAiFallbackPickerMode === 'chart' ? '选择一种排盘' : basicAiFallbackPickerMode === 'divination' ? '选择一种占卜' : '选择工具' }}</strong><button type="button" aria-label="关闭工具面板" @click="closeBasicAiFallbackPicker"><X :size="15" /></button></div>
                    <section v-if="basicAiFallbackPickerMode !== 'chart'" class="tool-panel-section">
                      <div class="tool-panel-section-head"><strong>占卜</strong><small>{{ basicAiFallbackPickerMode ? '选定后继续' : '点击选择，星标设为默认' }}</small></div>
                      <div class="tool-panel-grid"><div v-for="kind in visibleDivinationKinds" :key="kind" class="tool-panel-entry"><button type="button" class="tool-panel-item" :class="{ 'is-selected': homeMode === 'divination' && selectedKind === kind }" @click="chooseTool(kind)"><span class="tool-panel-icon">{{ kindMeta[kind].icon }}</span><span><strong>{{ kindMeta[kind].label }}</strong><small>{{ kindMeta[kind].description }}</small></span></button><button v-if="!basicAiFallbackPickerMode" type="button" class="tool-panel-default-button" :class="{ active: isDefaultDivinationTool(kind) }" :aria-label="isDefaultDivinationTool(kind) ? `${kindMeta[kind].label}已是默认工具` : `将${kindMeta[kind].label}设为默认工具`" :aria-pressed="isDefaultDivinationTool(kind)" @click.stop="setDefaultHomeTool({ mode: 'divination', kind })"><Star :size="13" :fill="isDefaultDivinationTool(kind) ? 'currentColor' : 'none'" /></button></div></div>
                    </section>
                    <section v-if="!basicAiFallbackPickerMode" class="tool-panel-section instant-tool-panel-section">
                      <div class="tool-panel-section-head"><strong>即时盘</strong><small>不读取案例，以发送时刻起盘</small></div>
                      <div class="tool-panel-grid instant-tools"><div v-for="item in instantChartOptions" :key="item.kind" class="tool-panel-entry"><button type="button" class="tool-panel-item" :class="{ 'is-selected': homeMode === 'instant' && instantChartKind === item.kind }" @click="chooseInstantChart(item.kind)"><span class="tool-panel-icon">{{ item.icon }}</span><span><strong>{{ item.label }}</strong><small>{{ item.description }}</small></span></button><button type="button" class="tool-panel-default-button" :class="{ active: isDefaultInstantTool(item.kind) }" :aria-label="isDefaultInstantTool(item.kind) ? `${item.fullLabel}已是默认工具` : `将${item.fullLabel}设为默认工具`" :aria-pressed="isDefaultInstantTool(item.kind)" @click.stop="setDefaultHomeTool({ mode: 'instant', kind: item.kind })"><Star :size="13" :fill="isDefaultInstantTool(item.kind) ? 'currentColor' : 'none'" /></button></div></div>
                    </section>
                    <section v-if="basicAiFallbackPickerMode !== 'divination'" class="tool-panel-section chart-tool-panel-section">
                      <div class="tool-panel-section-head"><strong>本命盘</strong><small>{{ basicAiFallbackPickerMode ? '会读取当前案例' : '读取案例，星标设为默认' }}</small></div>
                      <div class="chart-tool-grid-wrap"><div class="tool-panel-grid chart-tools"><div v-for="item in homeChartOptions" :key="item.kind" class="tool-panel-entry"><button type="button" class="tool-panel-item" :class="{ 'is-selected': homeMode === 'chart' && homeChartKind === item.kind }" :disabled="!activeCase" @click="chooseHomeChart(item.kind)"><span class="tool-panel-icon">{{ item.icon }}</span><span><strong>{{ item.label }}</strong><small>{{ item.description }}</small></span></button><button v-if="!basicAiFallbackPickerMode && activeCase" type="button" class="tool-panel-default-button" :class="{ active: isDefaultChartTool(item.kind) }" :aria-label="isDefaultChartTool(item.kind) ? `${item.label}已是默认工具` : `将${item.label}设为默认工具`" :aria-pressed="isDefaultChartTool(item.kind)" @click.stop="setDefaultHomeTool({ mode: 'chart', kind: item.kind })"><Star :size="13" :fill="isDefaultChartTool(item.kind) ? 'currentColor' : 'none'" /></button></div></div><div v-if="!activeCase" class="tool-panel-case-overlay"><button type="button" @click="cases.length ? toggleCaseSwitcher() : openCases()"><Plus :size="16" />{{ cases.length ? '选择案例' : '添加案例' }}</button></div></div>
                    </section>
                  </div>
                </div>
                <button type="button" class="ask-library-button" @click="openInspirationModal"><MessageCircle :size="14" />问题灵感</button><button type="button" class="ask-library-button" @click="openQuestionSupplementModal"><FileText :size="14" />补充信息</button>
              </div>
              <button class="chat-send-button" type="button" :disabled="isReading || isInterpreting || chartLoading" aria-label="发送" @click="beginReading"><LoaderCircle v-if="isReading || isInterpreting || chartLoading" class="spin" :size="17" /><ArrowUp v-else :size="18" :stroke-width="2.4" /></button>
            </div>
            <p v-if="formError" class="form-error">{{ formError }}</p>
          </div>
          <p class="home-ai-disclaimer" :class="{ 'is-chat': homeState === 'chat' }">生成内容完全基于 AI 模型的胡言乱语，不构成任何形式建议</p>
        </UiPageShell>

        <UiToolPage v-else-if="activeView === 'almanac'" class="screen almanac-screen" toolbar-label="黄历日期与类型" toolbar-class="almanac-immersive-header">
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
                <UiSelect v-model="almanacMonthFilter" aria-label="筛选当月择日事项">
                  <option value="all">择日</option>
                  <optgroup v-for="group in almanacTopicGroups" :key="group.label" :label="group.label">
                    <option v-for="item in group.options" :key="item.value" :value="item.value">{{ item.label }}</option>
                  </optgroup>
                </UiSelect>
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
          :preferences="{ answerPreference: appPreferences.answerPreference, displayLevel: appPreferences.displayLevel, promptSchoolChoices: appPreferences.promptSchoolChoices }"
          :ai-config="activeAiRequestConfig"
          :cases="selectableCaseProfiles"
          :selected-case-ids="fengShuiCaseIds"
          :global-case-id="activeGlobalCaseId"
          @update:selected-case-ids="updateFengShuiCaseIds"
          @manage-cases="openCases"
        />

        <OracleView
          v-else-if="activeView === 'oracle'"
          :result="oracleResult"
          :initial-question="oracleInitialQuestion"
          :ai-answer="aiAnswer"
          :ai-error="aiError"
          :ai-request="lastAiRequest"
          :interpreting="isInterpreting"
          @complete="completeOracleReading"
          @retry-interpretation="retryLastInterpretation"
        />

        <WesternDivinationView
          v-else-if="activeView === 'tarot'"
          :preferences="{ answerPreference: appPreferences.answerPreference, displayLevel: appPreferences.displayLevel, promptSchoolChoices: appPreferences.promptSchoolChoices }"
          :ai-config="activeAiRequestConfig"
          :casting-preference="appPreferences.castingPreference"
          @interpret="startTarotInterpretation"
        />

        <XiaoliurenView v-else-if="activeView === 'xiaoliuren'" />

        <DailyHexagramView
          v-else-if="activeView === 'daily-hexagram'"
          :ai-answer="aiAnswer"
          :ai-error="aiError"
          :ai-request="lastAiRequest"
          :interpreting="isInterpreting"
          @interpret="startDailyHexagramInterpretation"
          @retry-interpretation="retryLastInterpretation"
        />

        <UiToolPage v-else-if="activeView === 'fortune'" class="screen fortune-screen" toolbar-label="运势日期与周期" toolbar-class="fortune-toolbar">
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
          <UiPageShell v-if="!activeCase" class="screen charts-screen">
            <UiWorkspaceSurface padding="standard">
              <UiEmptyState :title="cases.length ? '请选择案例' : '需要一份案例'" :description="cases.length ? '本命盘需要先从顶部选择一个案例。' : '请先在案例中保存出生资料。'" compact>
                <template #icon><UserRound :size="24" /></template>
                <template #action><UiButton @click="cases.length ? toggleCaseSwitcher() : openCases()"><BookOpen :size="15" />{{ cases.length ? '选择案例' : '前往案例' }}</UiButton></template>
              </UiEmptyState>
            </UiWorkspaceSurface>
          </UiPageShell>

          <UiToolPage v-else class="screen charts-screen" toolbar-label="排盘类型" toolbar-class="chart-toolbar">
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
          :active-case-id="activeCase?.id || ''"
          :preferences="{ answerPreference: appPreferences.answerPreference, displayLevel: appPreferences.displayLevel, promptSchoolChoices: appPreferences.promptSchoolChoices }"
          :ai-config="activeAiRequestConfig"
          :history-record="compatibilityHistoryRecord"
          :request-background-interpretation="requestCompatibilityInterpretation"
          :save-history-record="addCompatibilityHistoryRecord"
          @manage-cases="openCases"
          @busy-change="compatibilityBusy = $event"
          @view-case="openCompatibilityCaseChart"
        />

        <UiPageShell v-else-if="activeView === 'cases'" class="screen cases-screen">
          <UiSegmentedControl as="nav" class="ui-subpage-tabs" :model-value="activeCasesSection" :items="casesSectionTabs" label="案例分类" variant="underline" @update:model-value="openCasesSection($event as CasesSection)" />

          <section v-if="activeCasesSection === 'input'" class="case-input-page">
            <UiWorkspaceSurface as="div" class="case-input-form" padding="standard">
              <div class="form-grid">
                <UiTextField id="new-case-label" v-model="newCaseDraft.label" label="备注" autocomplete="off" placeholder="例如：自己、家人" :aria-invalid="caseError.includes('备注') || undefined" :aria-describedby="caseError.includes('备注') ? 'new-case-error' : undefined" @update:model-value="caseError = ''" />
                <UiTextField id="new-case-name" v-model="newCaseDraft.name" label="姓名" autocomplete="off" placeholder="可选" @update:model-value="caseError = ''" />
                <div class="case-binary-fields">
                  <div class="case-binary-control"><span>性别</span><UiSegmentedControl id="new-case-gender" tabindex="-1" :aria-invalid="caseError.includes('性别') || undefined" :aria-describedby="caseError.includes('性别') ? 'new-case-error' : undefined" :model-value="newCaseGenderConfirmed ? newCaseDraft.gender : ''" :items="caseGenderOptions" label="选择性别" compact equal @update:model-value="chooseCaseGender(newCaseDraft, $event, 'create')" /></div>
                  <div class="case-binary-control"><span>出生历法</span><UiSegmentedControl :model-value="newCaseDraft.dateType" :items="caseCalendarOptions" label="选择出生历法" compact equal @update:model-value="chooseCaseCalendar(newCaseDraft, $event)" /></div>
                </div>
                <div class="birth-picker-control"><span>出生日期</span><button id="new-case-date" type="button" class="birth-picker-trigger" aria-label="选择出生日期" :aria-invalid="caseError.includes('日期') || caseError.includes('时间') || undefined" :aria-describedby="caseError.includes('日期') || caseError.includes('时间') ? 'new-case-error' : undefined" @click="openBirthPicker('date', 'create')"><CalendarDays :size="16" /><strong>{{ birthPickerFieldValue('date', newCaseDraft) }}</strong><ChevronRight :size="15" /></button></div>
                <div class="birth-picker-control"><span>出生时间</span><button type="button" class="birth-picker-trigger" aria-label="选择出生时间" @click="openBirthPicker('time', 'create')"><Clock3 :size="16" /><strong>{{ birthPickerFieldValue('time', newCaseDraft) }}</strong><ChevronRight :size="15" /></button></div>
                <div class="birth-picker-control birth-picker-region"><span>出生地区（选填）</span><button id="new-case-region" type="button" class="birth-picker-trigger" aria-label="选择出生地区，不选则按北京时间" :aria-invalid="caseError.includes('地区') || undefined" :aria-describedby="caseError.includes('地区') ? 'new-case-error' : undefined" @click="openBirthPicker('region', 'create')"><MapPin :size="16" /><strong>{{ newCaseRegionConfirmed ? birthPickerFieldValue('region', newCaseDraft) : '不选则按北京时间' }}</strong><ChevronRight :size="15" /></button></div>
              </div>
              <div v-if="newCaseCalendar" class="birth-calendar"><div><small>公历</small><strong>{{ newCaseCalendar.solar }}</strong></div><div><small>农历</small><strong>{{ newCaseCalendar.lunar }}</strong></div><div><small>干支</small><strong>{{ newCaseCalendar.ganzhi }}</strong></div><div><small>节气 / 时辰</small><strong>{{ newCaseCalendar.jieqi }} · {{ newCaseCalendar.shichen }}</strong></div></div>
              <div v-if="newCaseCalendar?.trueSolar" class="solar-details"><div><small>真太阳时</small><strong>{{ newCaseCalendar.trueSolar.correctedDateTime }}</strong></div><div><small>校正时辰</small><strong>{{ newCaseCalendar.trueSolar.shichen }}</strong></div><div><small>总修正</small><strong>{{ newCaseCalendar.trueSolar.totalCorrectionMinutes.toFixed(1) }} 分钟</strong></div></div>
              <UiActionBar><UiButton @click="saveNewCase"><Plus :size="15" />保存案例</UiButton></UiActionBar>
              <UiNotice v-if="caseError" id="new-case-error" class="case-form-notice" tone="error" compact>{{ caseError }}</UiNotice>
            </UiWorkspaceSurface>
          </section>

          <section v-else class="case-records-page">
            <label v-if="cases.length" class="case-records-search"><Search :size="16" /><input v-model="caseSearch" type="search" autocomplete="off" placeholder="搜索备注、姓名、日期或地区" aria-label="搜索案例记录" /></label>
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

        <UiPageShell v-else-if="activeView === 'settings'" class="screen settings-screen">
          <UiSegmentedControl as="nav" class="ui-subpage-tabs" :model-value="activeSettingsSection" :items="settingsSectionTabs" label="设置分类" variant="underline" @update:model-value="openSettingsSection($event as SettingsSection)" />

          <UiWorkspaceSurface v-if="activeSettingsSection === 'ai'" as="div" class="settings-workspace" padding="standard">
            <aside class="settings-channel-rail">
              <div class="settings-rail-heading"><div><h2>当前与备用</h2><small>通常保留一个主渠道，再加一个备用即可</small></div></div>
              <div class="settings-channel-list" role="group" aria-label="AI 渠道">
                <button v-for="channel in managedAiChannels" :key="channel.id" type="button" class="settings-channel-item" :class="{ active: configuringAiChannel.id === channel.id, current: activeAiChannel.id === channel.id }" :aria-pressed="configuringAiChannel.id === channel.id" @click="selectConfiguringAiChannel(channel.id)"><span class="settings-channel-icon"><Sparkles v-if="channel.provider === 'builtin'" :size="15" /><Settings v-else :size="15" /></span><span><strong>{{ channel.name }}</strong><small v-if="activeAiChannel.id === channel.id">当前使用</small><small v-else-if="isAiChannelReady(channel)">备用 · {{ channel.provider === 'builtin' ? '无需配置' : channel.model }}</small><small v-else>待完成配置</small></span><Check v-if="activeAiChannel.id === channel.id" :size="15" /></button>
              </div>
              <UiButton class="settings-add-backup" variant="secondary" size="small" :aria-expanded="showAiChannelCatalog" @click="showAiChannelCatalog = !showAiChannelCatalog"><X v-if="showAiChannelCatalog" :size="14" /><Plus v-else :size="14" />{{ showAiChannelCatalog ? '收起' : '添加备用' }}</UiButton>
              <div v-if="showAiChannelCatalog" class="settings-channel-catalog"><button v-for="preset in availableAiChannelPresets" :key="preset.id" type="button" @click="addPresetAiChannel(preset)"><span class="settings-channel-icon"><Sparkles :size="14" /></span><span><strong>{{ preset.name }}</strong><small>使用预设接口</small></span><ChevronRight :size="14" /></button><button type="button" @click="addAiChannel"><span class="settings-channel-icon"><Plus :size="14" /></span><span><strong>自定义接口</strong><small>填写兼容接口地址</small></span><ChevronRight :size="14" /></button></div>
              <div class="settings-rail-footer"><span>API Key 仅保存在当前设备的浏览器中。</span></div>
            </aside>

            <div class="settings-main-column">
              <section class="settings-channel-panel">
                <div class="settings-panel-heading"><div><h2><span v-if="configuringAiChannel.provider === 'builtin' || configuringAiChannel.preset">{{ configuringAiChannel.name }}</span><input v-else v-model="configuringAiChannel.name" class="settings-channel-name" aria-label="渠道名称" @input="resetAiTest" /></h2></div><span v-if="activeAiChannel.id === configuringAiChannel.id" class="settings-current-badge"><Check :size="13" />当前使用</span></div>
                <div class="settings-provider-line"><span class="settings-field-label">渠道类型</span><strong>{{ configuringAiChannel.provider === 'builtin' ? '内置 AI' : configuringAiChannel.preset ? '常用渠道' : '自定义接口' }}</strong><small v-if="configuringAiChannel.provider === 'builtin'">可直接使用，无需填写密钥。AI 解读时，问题、必要的出生资料和盘面摘要会发送给此服务处理。</small><small v-else-if="configuringAiChannel.preset">填好 API Key，再选择要使用的模型。</small><small v-else>填好接口信息，再选择要使用的模型。</small></div>
                <div v-if="configuringAiChannel.provider !== 'builtin'" class="settings-channel-fields">
                  <UiTextField v-if="!configuringAiChannel.preset" v-model="configuringAiChannel.baseUrl" class="settings-field-wide" label="接口地址" type="url" autocomplete="url" placeholder="https://api.example.com/v1" @input="invalidateAiModels(configuringAiChannel)" />
                  <UiSelect v-model="configuringAiChannel.apiType" class="settings-field" label="接口协议" @change="resetAiTest"><option v-for="option in aiApiTypeOptions" :key="option.value" :value="option.value">{{ option.label }}</option></UiSelect>
                  <UiTextField v-model="configuringAiChannel.apiKey" label="API Key" type="password" autocomplete="off" placeholder="仅保存在当前设备" @input="resetAiTest" />
                </div>
                <div v-if="configuringAiChannel.provider !== 'builtin'" class="settings-model-section"><div class="settings-model-heading"><span class="settings-field-label">模型</span><UiButton class="settings-fetch-models" variant="secondary" size="small" :loading="isLoadingAiModels" :disabled="!configuringAiChannel.baseUrl.trim() || !configuringAiChannel.apiKey.trim()" @click="loadAiModels(configuringAiChannel)"><RefreshCw v-if="!isLoadingAiModels" :size="14" />{{ isLoadingAiModels ? '获取中…' : '获取模型' }}</UiButton></div><UiSelect v-if="configuringAiModelOptions.length" v-model="selectedConfiguringAiModel" class="settings-model-select" aria-label="当前模型"><option v-for="model in configuringAiModelOptions" :key="model" :value="model">{{ model }}</option></UiSelect><span v-else class="settings-model-empty">请先获取模型</span><UiTextField v-if="!configuringAiChannel.preset" v-model="configuringAiModelsText" label="手动填写模型" multiline :rows="3" placeholder="无法获取列表时，可每行填写一个模型名称" /><small v-if="aiModelMessage" class="settings-note" :class="{ success: aiModelState === 'success', error: aiModelState === 'error' }">{{ aiModelMessage }}</small></div>
                <div class="settings-test-row"><UiButton v-if="activeAiChannel.id !== configuringAiChannel.id" :disabled="!isAiChannelReady(configuringAiChannel)" @click="setActiveAiChannel(configuringAiChannel.id)"><Check :size="14" />设为当前</UiButton><UiButton variant="secondary" :loading="isTestingAi" :disabled="!isAiChannelReady(configuringAiChannel)" @click="testAiConnection"><Check v-if="!isTestingAi && aiTestState === 'success'" :size="14" /><Sparkles v-else-if="!isTestingAi" :size="14" />{{ isTestingAi ? '连接中…' : '测试连接' }}</UiButton><UiButton v-if="configuringAiChannel.provider !== 'builtin'" class="settings-delete-channel" variant="danger" @click="removeAiChannel"><Trash2 :size="14" />移除渠道</UiButton><span v-if="aiTestMessage" :class="{ success: aiTestState === 'success', error: aiTestState === 'error' }">{{ aiTestMessage }}</span></div>
              </section>

            </div>
          </UiWorkspaceSurface>

          <div v-else-if="activeSettingsSection === 'theme'" class="preferences-page theme-settings-page">
            <section class="preference-section">
              <UiSectionHeading class="preference-section-heading" title="占卜主题" description="更换界面风格；各类牌组可单独设置" compact />
              <div>
                <div class="preference-option-grid is-four theme-option-grid" role="group" aria-label="占卜主题">
                  <button v-for="item in DIVINATION_THEMES" :key="item.id" type="button" class="preference-option" :class="{ active: activeDivinationThemeId === item.id }" :aria-pressed="activeDivinationThemeId === item.id" :disabled="themeAssetDownload.active" @click="chooseDivinationTheme(item.id)"><span><strong>{{ item.label }}</strong><small>{{ item.description }}</small></span><Check v-if="activeDivinationThemeId === item.id" :size="15" /></button>
                </div>
                <div v-if="themeAssetDownload.active" class="theme-download-progress" role="status" aria-live="polite"><span>正在下载{{ themeAssetDownload.label }}</span><progress :value="themeAssetDownloadPercent" max="100"></progress><strong>{{ themeAssetDownloadPercent }}%</strong></div>
                <p class="preference-active-note">当前界面使用“{{ activeDivinationThemeLabel }}”主题</p>
              </div>
            </section>

            <section v-if="showJoytouchCompatibilitySetting" class="preference-section">
              <UiSectionHeading class="preference-section-heading" title="兼容显示" description="仅用于鸿蒙卓易通中的显示异常" compact />
              <div>
                <div class="preference-option-grid is-three" role="group" aria-label="卓易通兼容显示">
                  <button type="button" class="preference-option" :class="{ active: appPreferences.joytouchCompatibilityMode === 'auto' }" :aria-pressed="appPreferences.joytouchCompatibilityMode === 'auto'" @click="chooseJoytouchCompatibility('auto')"><span><strong>自动</strong><small>异常时自动降级</small></span><Check v-if="appPreferences.joytouchCompatibilityMode === 'auto'" :size="15" /></button>
                  <button type="button" class="preference-option" :class="{ active: appPreferences.joytouchCompatibilityMode === 'standard' }" :aria-pressed="appPreferences.joytouchCompatibilityMode === 'standard'" @click="chooseJoytouchCompatibility('standard')"><span><strong>标准</strong><small>始终使用完整效果</small></span><Check v-if="appPreferences.joytouchCompatibilityMode === 'standard'" :size="15" /></button>
                  <button type="button" class="preference-option" :class="{ active: appPreferences.joytouchCompatibilityMode === 'compatibility' }" :aria-pressed="appPreferences.joytouchCompatibilityMode === 'compatibility'" @click="chooseJoytouchCompatibility('compatibility')"><span><strong>兼容</strong><small>始终使用稳定效果</small></span><Check v-if="appPreferences.joytouchCompatibilityMode === 'compatibility'" :size="15" /></button>
                </div>
                <p class="preference-active-note">{{ appPreferences.joytouchCompatibilityMode === 'auto' ? joytouchCompatibilityActive ? '已检测到兼容风险，当前自动使用稳定效果。' : '当前使用完整效果；发现异常会自动降级。' : appPreferences.joytouchCompatibilityMode === 'compatibility' ? '当前固定使用稳定效果。' : '当前固定使用完整动画和视觉效果。' }}</p>
              </div>
            </section>

            <section class="preference-section">
              <UiSectionHeading class="preference-section-heading" title="牌组" description="每种牌可跟随主题或固定选择" compact />
              <div class="preference-deck-grid">
                <UiSelect
                  v-for="group in DIVINATION_CARD_GROUPS"
                  :key="group.id"
                  :label="group.label"
                  :model-value="activeDivinationDeckSelections[group.id]"
                  :options="getDivinationDeckOptions(group.id)"
                  @update:model-value="chooseDivinationDeck(group.id, $event)"
                />
              </div>
            </section>

          </div>

          <div v-else class="preferences-page">

            <section class="preference-section">
              <UiSectionHeading class="preference-section-heading" title="解答偏好" description="选择 AI 的表达风格和解读框架" compact />
              <div>
                <div class="preference-option-grid is-three" role="group" aria-label="解答偏好">
                  <button v-for="item in answerPreferenceOptions" :key="item.value" type="button" class="preference-option" :class="{ active: appPreferences.answerPreference === item.value }" :aria-pressed="appPreferences.answerPreference === item.value" @click="chooseAnswerPreference(item.value)"><span><strong>{{ item.label }}</strong><small>{{ item.description }}</small></span><Check v-if="appPreferences.answerPreference === item.value" :size="15" /></button>
                </div>
                <p class="preference-active-note">{{ answerPreferenceOptions.find((item) => item.value === appPreferences.answerPreference)?.description }}</p>
              </div>
            </section>

            <section class="preference-section">
              <UiSectionHeading class="preference-section-heading" title="内容层级" description="决定可见术式和盘面信息" compact />
              <div>
                <div class="preference-option-grid is-three" role="group" aria-label="内容层级">
                  <button v-for="item in displayLevelOptions" :key="item.value" type="button" class="preference-option" :class="{ active: appPreferences.displayLevel === item.value }" :aria-pressed="appPreferences.displayLevel === item.value" @click="chooseDisplayLevel(item.value)"><span><strong>{{ item.label }}</strong><small>{{ item.description }}</small></span><Check v-if="appPreferences.displayLevel === item.value" :size="15" /></button>
                </div>
                <p class="preference-active-note">{{ displayLevelOptions.find((item) => item.value === appPreferences.displayLevel)?.description }}</p>
              </div>
            </section>

            <section class="preference-section">
              <UiSectionHeading class="preference-section-heading" title="起卦方式" description="设置占卜时的默认操作" compact />
              <div>
                <div class="preference-option-grid is-two" role="group" aria-label="起卦方式">
                  <button v-for="item in castingPreferenceOptions" :key="item.value" type="button" class="preference-option" :class="{ active: appPreferences.castingPreference === item.value }" :aria-pressed="appPreferences.castingPreference === item.value" @click="chooseCastingPreference(item.value)"><span><strong>{{ item.label }}</strong><small>{{ item.description }}</small></span><Check v-if="appPreferences.castingPreference === item.value" :size="15" /></button>
                </div>
                <p class="preference-active-note">{{ castingPreferenceOptions.find((item) => item.value === appPreferences.castingPreference)?.description }}</p>
              </div>
            </section>
          </div>
        </UiPageShell>

        <section v-if="activeView === 'charts' && displayResult" class="result-area ui-page" :class="{ 'display-basic': appPreferences.displayLevel === 'basic', 'display-beginner': appPreferences.displayLevel === 'beginner', 'is-bazi-result': isBazi(displayResult), 'is-ziwei-result': isZiwei(displayResult), 'is-qizheng-result': isQizheng(displayResult), 'ui-page--mobile-immersive': isBazi(displayResult) || isZiwei(displayResult) || isQizheng(displayResult) }">
          <div class="result-card traditional-result-card" :class="{ 'display-beginner': appPreferences.displayLevel === 'beginner' }">
            <div v-if="isMeihua(displayResult)" class="result-feature"><div class="result-emblem">{{ displayResult.mainHexagram.symbol }}<small>主卦</small></div><div class="result-copy"><span>{{ displayResult.mainHexagram.upper }} · {{ displayResult.mainHexagram.lower }}</span><h3>{{ displayResult.mainHexagram.name }}<b v-if="displayResult.changedHexagram"> → {{ displayResult.changedHexagram.name }}</b></h3><p>{{ displayResult.mainHexagram.description }}</p></div></div>
            <div v-else-if="isLiuyao(displayResult)" class="result-feature"><div class="result-copy"><span>{{ displayResult.palace.name }} · {{ displayResult.palaceStage }}</span><h3>{{ displayResult.originalName }}<b v-if="displayResult.changedName"> → {{ displayResult.changedName }}</b></h3><p>{{ displayResult.specialAdvice || '世应与动爻信息已纳入本次排盘。' }}</p></div><div class="yao-lines"><i v-for="yao in displayResult.yaosDetail" :key="yao.position" :class="{ broken: yao.yaoType === '阴', changing: yao.isChanging }"></i></div></div>
            <div v-else-if="isSsgw(displayResult)" class="result-feature"><div class="sign-number"><small>第</small><strong>{{ displayResult.number }}</strong><small>签</small></div><div class="result-copy"><span>三山国王 · 灵签</span><h3>{{ displayResult.title }}</h3><p>{{ displayResult.poem }}</p></div></div>
            <div v-else-if="isXiaoliuren(displayResult)" class="result-feature column-feature"><div class="primary-reading"><span>本课主象</span><strong>{{ displayResult.primary.name }}</strong><p>{{ displayResult.primary.verse }}</p></div><div class="sequence-list"><div v-for="item in [displayResult.sequence.month, displayResult.sequence.day, displayResult.sequence.hour]" :key="item.name + item.index"><small>{{ item === displayResult.sequence.month ? '月' : item === displayResult.sequence.day ? '日' : '时' }}</small><strong>{{ item.name }}</strong></div></div></div>
            <div v-else-if="isJinkoujue(displayResult)" class="result-feature column-feature"><div class="result-copy"><span>{{ displayResult.methodLabel }} · {{ displayResult.dayNight }}</span><h3>{{ displayResult.mainLine }}</h3><p>{{ displayResult.summary }}</p></div><div class="position-grid"><div v-for="position in [displayResult.positions.diFen, displayResult.positions.jiangShen, displayResult.positions.guiShen, displayResult.positions.renYuan]" :key="position.name"><small>{{ position.name }}</small><strong>{{ position.god || position.stem || position.branch }}</strong><span>{{ position.element }}</span></div></div></div>
            <div v-else-if="isQimen(displayResult)" class="qimen-result"><div class="qimen-meta"><strong>{{ displayResult.isYangDun ? '阳遁' : '阴遁' }}{{ displayResult.juShu }}局</strong><span>值符 {{ displayResult.zhiFu }} · 值使 {{ displayResult.zhiShi }}</span></div><div class="qimen-grid"><div v-for="palace in displayResult.jiuGongGe" :key="palace.gong" class="qimen-palace"><small>{{ palace.name }} · {{ palace.direction }}</small><strong>{{ palace.renPan.door }}</strong><span>{{ palace.tianPan.star }} · {{ palace.shenPan.god }}</span></div></div><div class="tag-list"><span v-for="tag in (displayResult.patternTags || []).slice(0, 6)" :key="tag">{{ tag }}</span></div></div>
            <div v-else-if="isLiuren(displayResult)" class="liuren-result"><div class="transmission-row"><div v-for="item in displayResult.threeTransmissions" :key="item.stage"><small>{{ item.stage }}</small><strong>{{ item.branch }}</strong><span>{{ item.god }}</span></div></div><p>{{ displayResult.transmissionSummary || displayResult.lessonSummary }}</p></div>
            <div v-else-if="isTaiyi(displayResult)" class="taiyi-result"><div class="taiyi-result-head"><strong>{{ displayResult.ganZhi }}{{ taiyiReadingScopeLabel(displayResult) }} · {{ displayResult.yinYang }}{{ displayResult.bureau }}局</strong><span>太乙 {{ displayResult.taiyiPosition }} · 文昌 {{ displayResult.wenChangPosition }} · 始击 {{ displayResult.shiJiPosition }}</span></div><div class="transmission-row"><div><small>主算</small><strong>{{ displayResult.lordCount }}</strong><span>将 {{ displayResult.lordGeneral }}/{{ displayResult.lordAssistant }}宫</span></div><div><small>客算</small><strong>{{ displayResult.guestCount }}</strong><span>将 {{ displayResult.guestGeneral }}/{{ displayResult.guestAssistant }}宫</span></div><div><small>定算</small><strong>{{ displayResult.setCount }}</strong><span>将 {{ displayResult.setGeneral }}/{{ displayResult.setAssistant }}宫</span></div></div></div>
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
                    <div><dt>五行旺相</dt><dd>{{ formatBaziSeasonStatus(displayResult) }} · 司令{{ displayResult.monthCommander || '—' }}</dd></div>
                    <div><dt>命卦</dt><dd>{{ displayResult.mingGua.gua }} · {{ displayResult.mingGua.star }} · {{ displayResult.mingGua.element }} · {{ displayResult.mingGua.eastWest }}</dd></div>
                    <div><dt>节令交接</dt><dd>当前{{ displayResult.seasonInfo.currentJieqi }}<template v-if="displayResult.seasonInfo.daysSincePrev !== undefined">后 {{ displayResult.seasonInfo.daysSincePrev }} 日</template> · 距{{ displayResult.seasonInfo.nextJieqi }}<template v-if="displayResult.seasonInfo.daysToNext !== undefined"> {{ displayResult.seasonInfo.daysToNext }} 日</template></dd></div>
                    <div :class="{ 'is-attention': displayResult.timing?.evidence.status === '存在时间记录边界' }"><dt>定盘时间</dt><dd>{{ formatBaziTimingBasis(displayResult) }}</dd></div>
                    <div><dt>岁运触发</dt><dd :title="selectedBaziFortuneTriggerSummary.join('；')">{{ selectedBaziFortuneTriggerSummary.join('；') || '未见当前规则列入的主要关系' }}</dd></div>
                  </dl>
                  <div class="bazi-positions"><span>命宫 <b>{{ displayResult.mingGong }}</b></span><span>身宫 <b>{{ displayResult.shenGong }}</b></span><span>胎元 <b>{{ displayResult.taiYuan }}</b></span><span>胎息 <b>{{ displayResult.taiXi }}</b></span></div>
              </section>
              <div class="bazi-fortune-board" @wheel.capture="handleBaziFortuneWheel">
                <div class="luck-section">
                <div class="subsection-title"><span>大运</span><small>{{ formatBaziStartInfo(displayResult.luckInfo.startInfo) }}</small><button class="bazi-fortune-today" type="button" title="回到今日岁运" aria-label="回到今日岁运" @click="returnBaziFortuneToToday">今</button></div>
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
                    <section v-if="astroAnnualScope(displayResult)" class="astro-side-block astro-transit-block"><div class="astro-side-heading"><span>{{ astroFortuneYear(displayResult) }} 流年</span><small>返照 · 次限 · 太阳弧</small></div><div class="astro-transit-grid"><div><span>太阳返照</span><strong>{{ formatAstroAnnualDate(astroAnnualScope(displayResult)?.solarReturnEvidence?.dateTime) || '本年无可用时刻' }}</strong><small>{{ formatAstroAnnualAspects(astroAnnualScope(displayResult)?.solarReturnEvidence?.aspects) || '主要相位待合参' }}</small></div><div><span>次限推进</span><strong>{{ formatAstroAnnualDate(astroAnnualScope(displayResult)?.secondaryProgressionEvidence?.progressedDateTime) || '本年无可用日期' }}</strong><small>{{ formatAstroAnnualAspects(astroAnnualScope(displayResult)?.secondaryProgressionEvidence?.aspects) || '主要相位待合参' }}</small></div><div><span>太阳弧</span><strong>{{ astroAnnualScope(displayResult)?.solarArcEvidence?.arcDegrees === undefined ? '本年无可用弧度' : `${astroAnnualScope(displayResult)?.solarArcEvidence?.arcDegrees?.toFixed(2)}°` }}</strong><small>{{ formatAstroAnnualAspects(astroAnnualScope(displayResult)?.solarArcEvidence?.aspects) || '主要相位待合参' }}</small></div></div></section>
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
        :qimen-layout="settings.qimenLayout"
        :qimen-ju-method="settings.qimenJuMethod"
        :taiyi-scope="settings.taiyiScope"
        :initial-mode="appPreferences.castingPreference"
        @close="closeManualReading"
        @complete="finishManualReading"
      />

      <UiDialogShell v-if="showBasicAiFallbackModal" aria-label="AI 暂时不可用" panel-class="basic-ai-fallback-modal" @close="closeBasicAiFallback">
          <UiDialogHeader
            :title="activeAiChannel.provider === 'builtin' ? '内置 AI 暂时不可用' : '当前 AI 暂时不可用'"
            eyebrow="继续完成这次提问"
            description="刚才的问题已经保留，可以换用自己的 API、手动选择方式，或复制到其他 AI。"
            close-label="关闭 AI 容灾提示"
            @close="closeBasicAiFallback"
          />
          <UiNotice tone="error" compact>{{ basicAiFallbackError }}</UiNotice>
          <div class="basic-ai-fallback-options">
            <button type="button" @click="openBasicAiFallbackSettings">
              <span><Settings :size="18" /></span>
              <strong>设置自己的 API</strong>
              <small>使用你已有的 AI 接口和模型</small>
              <ChevronRight :size="16" />
            </button>
            <button type="button" @click="chooseBasicAiFallbackMode('divination')">
              <span><Coins :size="18" /></span>
              <strong>选择占卜</strong>
              <small>自行选择一种占卜方式继续</small>
              <ChevronRight :size="16" />
            </button>
            <button type="button" @click="chooseBasicAiFallbackMode('chart')">
              <span><Orbit :size="18" /></span>
              <strong>选择排盘</strong>
              <small>使用当前案例生成命盘资料</small>
              <ChevronRight :size="16" />
            </button>
          </div>
          <p class="basic-ai-fallback-tip">现在复制只包含问题和必要上下文；选择占卜或排盘后，还会包含实际盘面资料。</p>
          <div class="basic-ai-fallback-actions">
            <UiButton variant="secondary" @click="retryBasicAiSelection"><RefreshCw :size="14" />重试</UiButton>
            <UiButton @click="copyBasicAiFallbackPrompt">
              <Check v-if="basicAiFallbackCopyState === 'copied'" :size="14" />
              <Copy v-else :size="14" />
              {{ basicAiFallbackCopyState === 'copied' ? '提示词已复制' : basicAiFallbackCopyState === 'error' ? '复制失败，请重试' : '复制提示词' }}
            </UiButton>
            <ExternalAiShareButtons :request="{
              mode: 'ask',
              question: basicAiFallbackQuestion,
              conversation: currentConversationContext(),
              preferences: {
                answerPreference: appPreferences.answerPreference,
                displayLevel: appPreferences.displayLevel,
              },
            }" />
          </div>
      </UiDialogShell>

      <UiDialogShell v-if="showReadingModal && selectedReadingMessage" aria-label="查看排盘详情" size="wide" :panel-class="{ 'reading-modal': true, 'traditional-reading-modal': ['meihua', 'liuyao', 'ssgw', 'xiaoliuren', 'jinkoujue', 'qimen', 'liuren', 'taiyi', 'wuyun-liuqi', 'huangji-jingshi'].includes(selectedReadingMessage.method), 'liuyao-reading-modal': selectedReadingMessage.method === 'liuyao' }" @close="closeReadingModal">
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

      <UiDialogShell v-if="showTarotModal && selectedTarotMessage" :aria-label="`查看${westernReadingDeckName(selectedTarotMessage.reading)}牌阵`" size="wide" :panel-class="{ 'reading-modal': true, 'tarot-reading-modal': true }" @close="closeTarotModal">
          <UiDialogHeader
            :title="selectedTarotMessage.reading.spreadName"
            :eyebrow="westernReadingDeckName(selectedTarotMessage.reading)"
            :description="`${selectedTarotMessage.reading.cards.length} 张牌`"
            close-label="关闭牌阵"
            @close="closeTarotModal"
          />
          <TarotSpreadBoard v-if="isTarotReading(selectedTarotMessage.reading)" :reading="selectedTarotMessage.reading" />
          <WesternCardBoard v-else :reading="selectedTarotMessage.reading" compact />
      </UiDialogShell>

      <UiDialogShell v-if="showInstantModal && selectedInstantMessage" :aria-label="`查看${selectedInstantMessage.response.label}`" size="wide" :panel-class="{ 'reading-modal': true, 'instant-reading-modal': true }" @close="closeInstantModal">
          <UiDialogHeader
            :title="selectedInstantMessage.response.label"
            eyebrow="当前事件时刻"
            :description="instantTimeBasisLabel(selectedInstantMessage.response)"
            close-label="关闭即时盘"
            @close="closeInstantModal"
          />
          <InstantChartDetail :response="selectedInstantMessage.response" />
      </UiDialogShell>

      <UiDialogShell v-if="showInspirationModal" aria-label="问题灵感" layer-class="inspiration-modal-layer" panel-class="inspiration-modal" @close="closeInspirationModal">
          <UiDialogHeader
            title="问题灵感"
            close-label="关闭问题灵感"
            @close="closeInspirationModal"
          />
          <UiSegmentedControl
            class="inspiration-mode-tabs"
            :model-value="inspirationMode"
            :items="[{ value: 'matter', label: '问事' }, { value: 'natal', label: '命书' }]"
            label="灵感类型"
            equal
            @update:model-value="chooseInspirationMode($event as InspirationMode)"
          />
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

      <UiDialogShell v-if="showQuestionSupplementModal" aria-label="补充信息" size="compact" panel-class="question-supplement-modal" @close="closeQuestionSupplementModal">
          <UiDialogHeader
            title="补充信息"
            eyebrow="让解读更精准"
            description="提供与问题直接相关的背景即可，不必每项都填写。"
            close-label="关闭补充信息"
            @close="closeQuestionSupplementModal"
          />
          <form class="question-supplement-form" @submit.prevent="addQuestionSupplement">
            <label><strong>事情背景</strong><textarea v-auto-resize v-model="questionSupplement.background" maxlength="1000" placeholder="涉及什么人或事，事情是怎么开始的"></textarea></label>
            <label><strong>目前情况</strong><textarea v-auto-resize v-model="questionSupplement.current" maxlength="1000" placeholder="现在进展到哪一步，有哪些已确定的信息"></textarea></label>
            <label><strong>相关时间</strong><textarea v-auto-resize v-model="questionSupplement.timing" maxlength="500" placeholder="发生时间、计划时间或希望看到结果的时间"></textarea></label>
            <label><strong>可选方案或顾虑</strong><textarea v-auto-resize v-model="questionSupplement.options" maxlength="1000" placeholder="正在权衡哪些选择，最担心什么"></textarea></label>
            <label><strong>最想了解</strong><textarea v-auto-resize v-model="questionSupplement.focus" maxlength="1000" placeholder="希望重点解读的方向或需要做出的决定"></textarea></label>
          </form>
          <div class="question-supplement-actions">
            <UiButton variant="ghost" @click="closeQuestionSupplementModal">暂不补充</UiButton>
            <UiButton :disabled="!hasQuestionSupplement" @click="addQuestionSupplement">添加到问题</UiButton>
          </div>
      </UiDialogShell>

      <UiDialogShell v-if="showAlmanacSearchModal" labelledby="almanac-search-title" panel-class="almanac-search-modal" @close="closeAlmanacSearch">
          <UiDialogHeader title="高级择日" title-id="almanac-search-title" :description="settings.almanacTopic ? `${almanacParticipantSummary} · ${activeAlmanacRangeLabel} · ${filteredAlmanacSearchItems.length} 个可用日期` : `${almanacParticipantSummary} · ${activeAlmanacRangeLabel}`" close-label="关闭高级择日" @close="closeAlmanacSearch" />
          <UiNotice v-if="almanacMode === 'general'" tone="info" compact>
            切换到个人历，可结合出生信息筛选日期。
            <template #action><UiButton variant="secondary" size="small" @click="chooseAlmanacMode('personal')">切换个人历</UiButton></template>
          </UiNotice>
          <div class="almanac-query-form">
            <UiSelect v-model="settings.almanacTopic" label="事项" placeholder="请选择事项" @change="updateAlmanacTopic"><optgroup v-for="group in almanacTopicGroups" :key="group.label" :label="group.label"><option v-for="item in group.options" :key="item.value" :value="item.value">{{ item.label }}</option></optgroup></UiSelect>
            <UiSelect v-model="almanacRangeMonths" label="范围" @change="updateAlmanacRange"><option v-for="item in almanacRangeOptions" :key="item.value" :value="item.value">{{ item.label }}</option></UiSelect>
            <UiSelect v-model="almanacWeekendPreference" label="周末"><option value="any">不限</option><option value="prefer">优先周末</option><option value="avoid">优先工作日</option></UiSelect>
            <UiSelect v-model="almanacTimePreference" label="时段"><option value="any">不限</option><option value="work-hours">工作时间</option><option value="morning">上午</option><option value="afternoon">下午</option></UiSelect>
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
        :hide-wheel="birthPicker.kind === 'region' && Boolean(birthPlaceSearchQuery.trim())"
        @update:model-value="updateBirthPickerValues"
        @cancel="closeBirthPicker"
        @confirm="confirmBirthPicker"
      >
        <template v-if="birthPicker.kind === 'region'" #before-wheel>
          <div class="location-picker-search">
            <label class="location-picker-search-field">
              <Search :size="16" aria-hidden="true" />
              <input
                v-model="birthPlaceSearchQuery"
                type="search"
                autocomplete="off"
                :placeholder="birthPicker.target === 'instant' ? '搜索观测城市或区县' : '搜索出生城市或区县'"
                aria-label="搜索城市或区县"
              />
            </label>
            <div v-if="birthPlaceSearchQuery.trim()" class="location-picker-search-results" role="listbox" aria-label="地点搜索结果">
              <button
                v-for="result in birthPlaceSearchResults"
                :key="result.key"
                type="button"
                class="location-picker-search-result"
                role="option"
                @click="selectBirthPlaceSearchResult(result)"
              >
                <MapPin :size="15" aria-hidden="true" />
                <span><strong>{{ result.label }}</strong><small>{{ result.detail }}</small></span>
                <ChevronRight :size="15" aria-hidden="true" />
              </button>
              <p v-if="!birthPlaceSearchResults.length" class="location-picker-search-empty">没有找到匹配地点，请换个名称；也可清空搜索后按省市区选择。</p>
            </div>
          </div>
        </template>
      </UIPickerView>

      <UiDialogShell v-if="showCaseEditor" aria-label="编辑案例" panel-class="case-form-card case-editor case-editor-dialog" @close="closeCaseEditor">
          <UiDialogHeader :title="editableCase.label" eyebrow="案例资料" description="出生资料" close-label="关闭编辑" @close="closeCaseEditor">
            <template v-if="!editableCase.isDefault" #action><UiButton variant="danger" size="small" icon-only aria-label="删除案例" @click="deleteCase"><Trash2 :size="16" /></UiButton></template>
          </UiDialogHeader>
          <div class="form-grid">
            <UiTextField v-model="editableCase.label" label="备注" placeholder="例如：自己、家人" />
            <UiTextField v-model="editableCase.name" label="姓名" placeholder="可选" />
            <div class="case-binary-fields">
              <div class="case-binary-control"><span>性别</span><UiSegmentedControl :model-value="editableCase.gender" :items="caseGenderOptions" label="选择性别" compact equal @update:model-value="chooseCaseGender(editableCase, $event, 'editor')" /></div>
              <div class="case-binary-control"><span>出生历法</span><UiSegmentedControl :model-value="editableCase.dateType" :items="caseCalendarOptions" label="选择出生历法" compact equal @update:model-value="chooseCaseCalendar(editableCase, $event)" /></div>
            </div>
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
            <div class="onboarding-brand"><img :src="getDivinationThemeLogoUrl()" :style="{ objectPosition: activeDivinationThemeLogoPosition }" alt="" aria-hidden="true" /><div><span>首次设置</span><h2 id="onboarding-title">{{ onboardingSteps[onboardingStep] }}</h2></div></div>
            <small>{{ onboardingStep + 1 }} / {{ onboardingSteps.length }}</small>
          </header>
          <nav class="onboarding-progress" aria-label="设置进度">
            <button v-for="(step, index) in onboardingSteps" :key="step" type="button" :class="{ active: onboardingStep === index, done: onboardingStep > index }" :disabled="index > onboardingStep" @click="goToOnboardingStep(index)"><span>{{ onboardingStep > index ? '✓' : index + 1 }}</span><b>{{ step }}</b></button>
          </nav>

          <div class="onboarding-body">
            <template v-if="onboardingStep === 0">
              <div class="onboarding-copy"><h3>选择内容层级</h3><p>控制工具选择、盘面信息和术语的显示深度。</p></div>
              <div class="onboarding-level-grid" role="group" aria-label="内容层级">
                <button v-for="item in displayLevelOptions" :key="item.value" type="button" :class="{ active: appPreferences.displayLevel === item.value }" :aria-pressed="appPreferences.displayLevel === item.value" @click="chooseDisplayLevel(item.value)"><strong>{{ item.label }}</strong><span>{{ item.description }}</span><Check v-if="appPreferences.displayLevel === item.value" :size="16" /></button>
              </div>
              <div class="onboarding-copy onboarding-preference-section"><h3>选择解读偏好</h3><p>决定 AI 回答问题时使用的表达方式和分析深度。</p></div>
              <div class="onboarding-option-grid is-three" role="group" aria-label="解读偏好">
                <button v-for="item in answerPreferenceOptions" :key="item.value" type="button" :class="{ active: appPreferences.answerPreference === item.value }" :aria-pressed="appPreferences.answerPreference === item.value" @click="chooseAnswerPreference(item.value)"><strong>{{ item.label }}</strong><span>{{ item.description }}</span><Check v-if="appPreferences.answerPreference === item.value" :size="16" /></button>
              </div>
              <div class="onboarding-copy onboarding-preference-section"><h3>选择起卦方式</h3><p>设置占卜时默认由系统完成，还是由你亲自操作。</p></div>
              <div class="onboarding-option-grid is-two" role="group" aria-label="起卦方式">
                <button v-for="item in castingPreferenceOptions" :key="item.value" type="button" :class="{ active: appPreferences.castingPreference === item.value }" :aria-pressed="appPreferences.castingPreference === item.value" @click="chooseCastingPreference(item.value)"><strong>{{ item.label }}</strong><span>{{ item.description }}</span><Check v-if="appPreferences.castingPreference === item.value" :size="16" /></button>
              </div>
              <div class="onboarding-actions"><UiButton class="onboarding-master-skip" variant="ghost" size="small" @click="skipOnboardingAsMaster">熟悉术数，使用完整模式</UiButton><div><UiButton @click="continueOnboarding">继续<ChevronRight :size="15" /></UiButton></div></div>
            </template>

            <template v-else>
              <div class="onboarding-copy"><h3>使用前请知悉</h3><p>占卜与解读不能替代事实核验和专业判断。</p></div>
              <div class="onboarding-disclaimer"><Sparkles :size="20" /><p>本产品的占卜、排盘解读及问答内容均由 AI 生成，仅供娱乐与自我观察，不代表事实判断，也不构成医疗、法律、投资、心理或其他专业建议。案例与历史默认保存在当前浏览器；使用 AI 解读时，问题、必要的出生资料和盘面摘要会发送给当前选择的 AI 服务处理。请勿据此作出重要决定。</p></div>
              <label class="onboarding-consent"><input v-model="onboardingDisclaimerAccepted" type="checkbox" /><span>我已知悉内容由 AI 生成</span></label>
              <p v-if="onboardingError" class="onboarding-error">{{ onboardingError }}</p>
              <div class="onboarding-actions"><span></span><div><UiButton variant="secondary" @click="goToOnboardingStep(0)"><ArrowLeft :size="15" />返回</UiButton><UiButton :disabled="!onboardingDisclaimerAccepted" @click="finishOnboarding"><Check :size="15" />完成设置</UiButton></div></div>
            </template>
          </div>
        </section>
      </div>

      <UiDialogShell v-if="showHistory" labelledby="history-drawer-title" layer-class="drawer-layer" panel-class="history-drawer" padding="none" @close="showHistory = false">
          <div class="drawer-title">
            <div><span class="eyebrow">本机记录</span><h2 id="history-drawer-title">记录</h2></div>
            <UiButton variant="ghost" icon-only aria-label="关闭记录" @click="showHistory = false"><X :size="18" /></UiButton>
          </div>
          <div class="search-box"><Search :size="15" /><input v-model="historySearch" type="search" placeholder="搜索问题、工具或案例" aria-label="搜索记录" autofocus /></div>
          <div class="history-filters">
            <UiSelect v-model="historyCategory" label="类型" aria-label="按记录类型筛选"><option value="all">全部类型</option><option value="divination">占卜</option><option value="oracle">灵签</option><option value="chart">排盘</option></UiSelect>
            <UiSelect v-model="historyMethod" label="工具" aria-label="按工具筛选"><option value="all">全部工具</option><option v-for="method in historyMethodOptions" :key="method" :value="method">{{ method }}</option></UiSelect>
            <UiSelect v-model="historyInterpretation" label="解读" aria-label="按 AI 解读状态筛选"><option value="all">全部状态</option><option value="interpreted">已解读</option><option value="pending">未解读</option></UiSelect>
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
                <small><span>{{ record.methodLabel }} · {{ formatReadingTime(record.createdAt) }}</span><em :class="{ ready: record.interpretation?.trim(), running: isHistoryRecordRunning(record.id) }">{{ isHistoryRecordRunning(record.id) ? '解读中' : record.interpretation?.trim() ? '已解读' : record.interpretationError?.trim() ? '解读失败' : '未解读' }}</em></small>
              </span>
              <ChevronRight :size="15" />
            </button>
          </div>
          <div v-else class="drawer-empty"><Clock3 :size="18" /><span>{{ history.length ? '没有符合条件的记录' : '还没有记录' }}</span><UiButton v-if="history.length && hasActiveHistoryFilters" variant="ghost" size="small" @click="resetHistoryFilters">清除筛选</UiButton></div>
      </UiDialogShell>
      <LegacyHistoryDetail v-if="selectedLegacyHistory" :record="selectedLegacyHistory" @close="selectedLegacyHistory = null" />

      <Transition name="app-toast">
        <div v-if="toastMessage" class="app-toast" role="status" aria-live="polite">{{ toastMessage }}</div>
      </Transition>

      <UiDialogShell v-if="pwaUpdateAvailable && showPwaUpdateDialog && !showOnboarding" labelledby="pwa-update-title" size="compact" layer-class="pwa-update-layer" panel-class="pwa-update-dialog" @close="postponePwaUpdate">
        <div class="pwa-update-dialog__icon" aria-hidden="true"><RefreshCw :size="24" /></div>
        <UiDialogHeader title="发现新版本" title-id="pwa-update-title" :description="availableUpdateKind === 'native' ? `时月东方 ${availableWebVersion} 已发布，下载后即可安装更新。` : '更新后即可使用最新功能和修复。页面会重新加载，请先完成当前操作。'" close-label="稍后更新" @close="postponePwaUpdate" />
        <div v-if="availableUpdateKind === 'native' && nativeDownloadRoutes.length" class="pwa-update-routes">
          <div class="pwa-update-routes__header">
            <strong>下载线路</strong>
            <button type="button" :disabled="isProbingNativeRoutes" @click="testNativeDownloadRoutes">{{ isProbingNativeRoutes ? '测速中…' : '重新测速' }}</button>
          </div>
          <button
            v-for="route in nativeDownloadRoutes"
            :key="route.id"
            type="button"
            class="pwa-update-route"
            :class="{ selected: selectedNativeRouteId === route.id }"
            :aria-pressed="selectedNativeRouteId === route.id"
            @click="selectedNativeRouteId = route.id"
          >
            <span>{{ route.label }}</span>
            <em :class="{ fastest: fastestNativeRouteId === route.id, unavailable: nativeRouteProbe(route.id)?.latencyMs === null }">
              {{ fastestNativeRouteId === route.id ? `最快 · ${nativeRouteProbeLabel(route.id)}` : nativeRouteProbeLabel(route.id) }}
            </em>
          </button>
          <small>已自动选择响应最快的可用线路，也可以手动切换。</small>
        </div>
        <UiNotice v-if="updateError" tone="error">{{ updateError }}</UiNotice>
        <UiActionBar mobile="stretch">
          <UiButton variant="secondary" :disabled="isApplyingPwaUpdate" @click="postponePwaUpdate">稍后更新</UiButton>
          <UiButton :loading="isApplyingPwaUpdate" @click="refreshToPwaUpdate">{{ availableUpdateKind === 'native' ? '下载更新' : '立即更新' }}</UiButton>
        </UiActionBar>
      </UiDialogShell>

    </div>
  </div>
</template>
