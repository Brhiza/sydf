<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import {
  ArrowUp,
  ArrowLeftRight,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Clock3,
  HeartHandshake,
  LoaderCircle,
  MapPin,
  Sparkles,
} from 'lucide-vue-next';
import {
  calculateCompatibilityBundle,
  type CompatibilityBundle,
  type CompatibilitySystem,
} from 'mingyu-core/compatibility';
import {
  buildAstrolabeSynastryPrompt,
  buildBaziCompatibilityPrompt,
  buildCombinedZiweiCompatibilityPrompt,
  type BaziCompatibilityType,
} from 'mingyu-core/prompt';
import type { BirthProfile } from 'mingyu-core/profile';
import { getBirthDateValidationMessage } from 'mingyu-core/calendar';
import {
  type AiConversationMessage,
  type AiCustomConfig,
  type AiInterpretationRequest,
  type AiInterpretationResponse,
  type AiPreferences,
  type AiReadingContext,
} from '../lib/ai';
import type { ReadingRecord, ReadingResult } from '../lib/divination';
import { compactReadingPrompt } from '../lib/aiPrompt';
import vAutoResize from '../directives/autoResizeTextarea';
import AiPromptFallback from './AiPromptFallback.vue';
import AiReadingActions from './AiReadingActions.vue';
import ChatMarkdown from './ChatMarkdown.vue';
import { UiActionBar, UiButton, UiEmptyState, UiNotice, UiPageShell, UiSegmentedControl, UiWorkspaceSurface } from './ui';

interface CompatibilityCase {
  id: string;
  label: string;
  name: string;
  gender: 'male' | 'female';
  date: string;
  dateType: 'solar' | 'lunar';
  isLeapMonth: boolean;
  time: string;
  timeBasis: 'clock' | 'trueSolar';
  locationName: string;
  latitude: string;
  longitude: string;
  timezone: string;
}

type CompatibilityPage = 'selection' | 'chat';
type CompatibilityType = 'general' | BaziCompatibilityType;

interface CompatibilityTypeOption {
  value: CompatibilityType;
  label: string;
  description: string;
  focus: string;
  baziType?: BaziCompatibilityType;
  framework: Array<{ title: string; purpose: string }>;
}

interface CompatibilityMessage extends AiConversationMessage {
  id: number;
  failed?: boolean;
}

interface CompatibilityReading extends AiReadingContext {
  method: string;
}

const compatibilityTypeOptions: CompatibilityTypeOption[] = [
  {
    value: 'general',
    label: '通用',
    description: '不预设双方关系',
    focus: '双方的互动模式、互补与摩擦，以及长期相处条件',
    framework: [
      { title: '一、关系总论', purpose: '概括关系主轴、主要优势与需要正视的核心问题' },
      { title: '二、互动底色', purpose: '说明双方自然的交流、回应和影响方式' },
      { title: '三、互补优势', purpose: '说明可以彼此补足、共同推进的部分及成立条件' },
      { title: '四、摩擦与边界', purpose: '定位冲突来源、触发方式和需要建立的边界' },
      { title: '五、长期相处条件', purpose: '说明关系稳定需要满足的现实条件和需要核对的变量' },
      { title: '六、行动建议', purpose: '给出与前述判断一一对应、双方都能执行的建议' },
    ],
  },
  {
    value: 'marriage',
    label: '合婚',
    description: '婚恋与长期伴侣',
    focus: '婚恋吸引、情感需求、生活磨合与长期伴侣关系',
    baziType: 'marriage',
    framework: [
      { title: '一、婚恋总论', purpose: '概括吸引力、稳定性与最关键的婚恋课题' },
      { title: '二、吸引与情感需求', purpose: '分析彼此被吸引的原因、亲密需求与回应差异' },
      { title: '三、沟通与冲突', purpose: '分析表达方式、冲突触发点和有效修复方式' },
      { title: '四、生活与价值观磨合', purpose: '分析日常节奏、责任分配、金钱和家庭观念的磨合' },
      { title: '五、承诺条件与风险', purpose: '说明长期承诺需要具备的条件、主要风险和现实核对项' },
      { title: '六、相处建议', purpose: '给出能提升安全感、亲密度和长期稳定性的具体建议' },
    ],
  },
  {
    value: 'career',
    label: '合伙',
    description: '事业与共同经营',
    focus: '目标协同、能力互补、权责分配、利益边界与合作风险',
    baziType: 'career',
    framework: [
      { title: '一、合作总论', purpose: '概括合作适配点、主要矛盾与合作成立条件' },
      { title: '二、目标与能力互补', purpose: '分析目标一致度、各自优势和适合承担的职责' },
      { title: '三、角色与决策机制', purpose: '分析主导方式、沟通节奏、决策权和复核机制' },
      { title: '四、利益与资源边界', purpose: '分析投入、收益、客户、信息和资源使用的边界' },
      { title: '五、风险与退出机制', purpose: '定位高风险情境，并说明分歧、止损和退出安排' },
      { title: '六、合作建议', purpose: '给出签约前、合作中和出现分歧时的具体做法' },
    ],
  },
  {
    value: 'friendship',
    label: '友情',
    description: '朋友与日常相处',
    focus: '相互理解、支持方式、相处边界与友情稳定性',
    baziType: 'friendship',
    framework: [
      { title: '一、友情总论', purpose: '概括友情基础、稳定性与主要相处课题' },
      { title: '二、连接与沟通方式', purpose: '分析自然亲近的原因、话题节奏和表达差异' },
      { title: '三、支持与互补', purpose: '说明彼此适合提供的支持以及容易形成的互补' },
      { title: '四、边界与潜在摩擦', purpose: '定位误解、消耗、比较或越界的触发点' },
      { title: '五、关系维护条件', purpose: '说明友情长期稳定需要的距离、信任和现实条件' },
      { title: '六、相处建议', purpose: '给出保持连接、表达需求和修复矛盾的具体建议' },
    ],
  },
  {
    value: 'children',
    label: '亲子',
    description: '亲子沟通与陪伴',
    focus: '亲子沟通、情绪回应、陪伴方式、期待差异与成长支持',
    baziType: 'children',
    framework: [
      { title: '一、亲子关系总论', purpose: '概括亲子互动主轴、连接优势与主要养育课题' },
      { title: '二、性格需求与回应方式', purpose: '分析双方的节奏、需求以及容易被理解的回应方式' },
      { title: '三、沟通与情绪连接', purpose: '分析表达、倾听、情绪承接和安全感建立方式' },
      { title: '四、期待、规则与自主边界', purpose: '分析期待差异、规则设置、控制感和自主空间' },
      { title: '五、成长支持与冲突修复', purpose: '说明优势培养、压力来源和冲突后的修复路径' },
      { title: '六、陪伴建议', purpose: '给出符合双方特点、可长期执行的陪伴和沟通建议' },
    ],
  },
  {
    value: 'siblings',
    label: '手足',
    description: '兄弟姐妹关系',
    focus: '手足互动、资源与责任边界、冲突来源及相互支持',
    baziType: 'siblings',
    framework: [
      { title: '一、手足关系总论', purpose: '概括手足互动主轴、支持基础与主要关系课题' },
      { title: '二、角色与互动模式', purpose: '分析各自在关系中的自然角色、沟通和影响方式' },
      { title: '三、支持、竞争与比较', purpose: '分析互相支持的方式以及竞争、比较的触发点' },
      { title: '四、资源、责任与家庭边界', purpose: '分析资源分配、照顾责任和原生家庭影响' },
      { title: '五、冲突修复与长期联系', purpose: '说明误解来源、修复方式和维持联系的条件' },
      { title: '六、相处建议', purpose: '给出协商责任、建立边界和保持支持的具体建议' },
    ],
  },
];

const compatibilityTypeTabs = compatibilityTypeOptions.map(({ value, label }) => ({ value, label }));

const props = defineProps<{
  cases: CompatibilityCase[];
  activeCaseId: string;
  preferences: AiPreferences;
  aiConfig: AiCustomConfig;
  historyRecord?: ReadingRecord | null;
  requestBackgroundInterpretation: (request: AiInterpretationRequest, recordId: string) => Promise<AiInterpretationResponse>;
  saveHistoryRecord: (record: ReadingRecord) => void;
}>();

const emit = defineEmits<{
  (event: 'manage-cases'): void;
  (event: 'view-case', caseId: string): void;
  (event: 'busy-change', busy: boolean): void;
}>();

const page = ref<CompatibilityPage>('selection');
const primaryCaseId = ref('');
const partnerCaseId = ref('');
const compatibilityType = ref<CompatibilityType>('general');
const loadingPhase = ref<'calculating' | 'interpreting' | 'following-up' | ''>('');
const error = ref('');
const question = ref('');
const messages = ref<CompatibilityMessage[]>([]);
const conversation = ref<AiConversationMessage[]>([]);
const reading = ref<CompatibilityReading | null>(null);
const historyRecordId = ref('');
const lastAiRequest = ref<AiInterpretationRequest | null>(null);
const pendingQuestion = ref('');
const chatEnd = ref<HTMLElement | null>(null);
let messageId = 0;
let requestId = 0;
let restoringHistory = false;

const primaryCase = computed(() => props.cases.find((item) => item.id === primaryCaseId.value) || null);
const partnerCase = computed(() => props.cases.find((item) => item.id === partnerCaseId.value) || null);
const selectedType = computed(() => compatibilityTypeOptions.find((item) => item.value === compatibilityType.value) || compatibilityTypeOptions[0]!);
const hasEnoughCases = computed(() => props.cases.length >= 2);
const loading = computed(() => Boolean(loadingPhase.value));
const canSend = computed(() => Boolean(reading.value && question.value.trim() && !loading.value && !pendingQuestion.value));
const casesSignature = computed(() => props.cases.map((item) => [
  item.id,
  item.label,
  item.gender,
  item.date,
  item.dateType,
  item.isLeapMonth,
  item.time,
  item.timeBasis,
  item.locationName,
  item.latitude,
  item.longitude,
  item.timezone,
].join('~')).join('|'));

function isFiniteLocationValue(value: string) {
  return Boolean(value.trim()) && Number.isFinite(Number(value));
}

function caseIssue(profile: CompatibilityCase | null) {
  if (!profile) return '请选择案例。';
  if (!profile.date || !profile.time) return `${profile.label}的出生日期或时间尚未完善。`;
  const [year, month, day] = profile.date.split('-').map(Number);
  if (getBirthDateValidationMessage({
    year,
    month,
    day,
    dateType: profile.dateType,
    isLeapMonth: profile.dateType === 'lunar' && profile.isLeapMonth,
  })) return `${profile.label}的出生日期无效。`;
  if (!profile.locationName.trim() || ![profile.latitude, profile.longitude, profile.timezone].every(isFiniteLocationValue)) {
    return `${profile.label}的出生地点尚未完善。`;
  }
  return '';
}

const selectionIssue = computed(() => {
  if (!hasEnoughCases.value) return '合盘至少需要两份案例。';
  if (!primaryCase.value || !partnerCase.value) return '请选择两份案例。';
  if (primaryCase.value.id === partnerCase.value.id) return '请选择两份不同的案例。';
  return caseIssue(primaryCase.value) || caseIssue(partnerCase.value);
});

const canInterpret = computed(() => !selectionIssue.value && !loading.value);

watch(loading, (busy) => emit('busy-change', busy), { immediate: true });

function abortActiveRequest() {
  requestId += 1;
  loadingPhase.value = '';
}

function clearConversation() {
  abortActiveRequest();
  page.value = 'selection';
  messages.value = [];
  conversation.value = [];
  reading.value = null;
  lastAiRequest.value = null;
  historyRecordId.value = '';
  pendingQuestion.value = '';
  question.value = '';
  error.value = '';
}

function syncSelectedCases() {
  const availableIds = new Set(props.cases.map((item) => item.id));
  const preferredPrimary = availableIds.has(props.activeCaseId) ? props.activeCaseId : props.cases[0]?.id || '';
  if (!availableIds.has(primaryCaseId.value)) primaryCaseId.value = preferredPrimary;
  if (!availableIds.has(partnerCaseId.value) || partnerCaseId.value === primaryCaseId.value) {
    partnerCaseId.value = props.cases.find((item) => item.id !== primaryCaseId.value)?.id || '';
  }
}

watch(casesSignature, (signature, previousSignature) => {
  if (previousSignature !== undefined && signature !== previousSignature) clearConversation();
  syncSelectedCases();
}, { immediate: true });

watch(() => props.activeCaseId, () => {
  if (!primaryCaseId.value) syncSelectedCases();
});

function restoreHistoryRecord(record: ReadingRecord | null | undefined) {
  const saved = record?.compatibility;
  if (!record || !saved) return;
  restoringHistory = true;
  abortActiveRequest();
  if (props.cases.some((item) => item.id === saved.primaryCaseId)) primaryCaseId.value = saved.primaryCaseId;
  if (props.cases.some((item) => item.id === saved.partnerCaseId)) partnerCaseId.value = saved.partnerCaseId;
  if (compatibilityTypeOptions.some((item) => item.value === saved.type)) compatibilityType.value = saved.type as CompatibilityType;
  page.value = 'chat';
  reading.value = saved.reading;
  historyRecordId.value = record.id;
  question.value = '';
  pendingQuestion.value = '';
  error.value = '';
  loadingPhase.value = '';
  messages.value = [
    { id: ++messageId, role: 'user', content: record.question },
    ...(record.interpretation ? [{ id: ++messageId, role: 'assistant' as const, content: record.interpretation }] : []),
  ];
  conversation.value = record.interpretation
    ? [{ role: 'user', content: record.question }, { role: 'assistant', content: record.interpretation }]
    : [];
  lastAiRequest.value = {
    mode: 'compatibility',
    question: record.question,
    method: saved.reading.method,
    reading: saved.reading,
    preferences: props.preferences,
    aiConfig: props.aiConfig,
  };
  void nextTick(() => { restoringHistory = false; });
}

watch(() => props.historyRecord, restoreHistoryRecord, { immediate: true });

watch([primaryCaseId, partnerCaseId, compatibilityType], () => {
  if (restoringHistory) return;
  if (page.value === 'chat' || reading.value || messages.value.length) clearConversation();
  else {
    error.value = '';
    pendingQuestion.value = '';
  }
});

function scrollConversationToEnd() {
  void nextTick(() => window.requestAnimationFrame(() => {
    chatEnd.value?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }));
}

watch(
  () => [messages.value.length, loadingPhase.value, error.value],
  scrollConversationToEnd,
  { flush: 'post' },
);

function toBirthProfile(profile: CompatibilityCase): BirthProfile {
  const [year, month, day] = profile.date.split('-').map(Number);
  const [hour, minute] = profile.time.split(':').map(Number);
  if (![year, month, day, hour, minute].every(Number.isFinite)) {
    throw new Error(`${profile.label}的出生日期或时间尚未完善。`);
  }
  const latitude = Number(profile.latitude);
  const longitude = Number(profile.longitude);
  const timezone = Number(profile.timezone);
  if (![latitude, longitude, timezone].every(Number.isFinite)) {
    throw new Error(`${profile.label}的出生地点尚未完善。`);
  }
  return {
    id: profile.id,
    name: profile.label,
    gender: profile.gender,
    calendarType: profile.dateType,
    year,
    month,
    day,
    hour,
    minute,
    isLeapMonth: profile.dateType === 'lunar' && profile.isLeapMonth,
    location: {
      name: profile.locationName,
      latitude,
      longitude,
      timezone,
    },
    useTrueSolarTime: profile.timeBasis === 'trueSolar',
    applyChinaDst: true,
  };
}

function initialQuestion(primary: CompatibilityCase, partner: CompatibilityCase, type: CompatibilityTypeOption) {
  return `请对${primary.label}与${partner.label}进行${type.label}合盘解读，重点分析${type.focus}。`;
}

function buildCompatibilityPrompt(
  result: CompatibilityBundle,
  primary: CompatibilityCase,
  partner: CompatibilityCase,
  type: CompatibilityTypeOption,
) {
  const primaryZiwei = result.primary.ziwei;
  const partnerZiwei = result.partner.ziwei;
  if (!result.primary.bazi || !result.partner.bazi || !result.bazi) throw new Error('八字合盘资料没有生成完整。');
  if (!primaryZiwei || !partnerZiwei || !result.ziwei) throw new Error('紫微合盘资料没有生成完整。');
  if (!result.primary.astrolabe || !result.partner.astrolabe || !result.astrolabe) throw new Error('星盘合盘资料没有生成完整。');

  const currentQuestion = initialQuestion(primary, partner, type);
  const baziPrompt = buildBaziCompatibilityPrompt({
    result1: result.primary.bazi,
    result2: result.partner.bazi,
    compatibilityType: type.baziType,
    person1Name: primary.label,
    person2Name: partner.label,
    question: currentQuestion,
  });
  const ziweiPrompt = buildCombinedZiweiCompatibilityPrompt({
    primaryPayload: primaryZiwei.payloadByScope.origin,
    partnerPayload: partnerZiwei.payloadByScope.origin,
    primaryAstrolabe: primaryZiwei.astrolabe,
    partnerAstrolabe: partnerZiwei.astrolabe,
    topic: `${type.label}合盘`,
    question: currentQuestion,
    isCustomQuestion: true,
    primaryName: primary.label,
    partnerName: partner.label,
    primaryTrueSolarEvidence: primaryZiwei.trueSolarEvidence,
    partnerTrueSolarEvidence: partnerZiwei.trueSolarEvidence,
  });
  const astrolabePrompt = buildAstrolabeSynastryPrompt({
    chart1: result.primary.astrolabe,
    chart2: result.partner.astrolabe,
    synastry: result.astrolabe,
    question: currentQuestion,
  });
  return compactReadingPrompt([
    `【八字合盘资料】\n${baziPrompt}`,
    `【紫微合盘资料】\n${ziweiPrompt}`,
    `【星盘合盘资料】\n${astrolabePrompt}`,
  ].join('\n\n'));
}

function addMessage(role: AiConversationMessage['role'], content: string, failed = false) {
  const message: CompatibilityMessage = { id: ++messageId, role, content };
  if (failed) message.failed = true;
  messages.value = [...messages.value, message];
}

function markPendingMessageFailed(failed: boolean) {
  const targetId = [...messages.value].reverse().find((item) => item.role === 'user' && item.content === pendingQuestion.value)?.id;
  if (!targetId) return;
  messages.value = messages.value.map((item) => item.id === targetId ? { ...item, failed } : item);
}

async function requestCurrentQuestion(questionText: string, messageAlreadyShown: boolean) {
  if (!reading.value) return;
  const currentReading = reading.value;
  const history = [...conversation.value];
  if (!messageAlreadyShown) addMessage('user', questionText);
  pendingQuestion.value = questionText;
  markPendingMessageFailed(false);
  error.value = '';
  loadingPhase.value = history.length ? 'following-up' : 'interpreting';
  const currentRequestId = ++requestId;
  const payload: AiInterpretationRequest = {
    mode: 'compatibility',
    question: questionText,
    method: currentReading.method,
    reading: {
      summary: currentReading.summary,
      data: currentReading.data,
      prompt: currentReading.prompt,
    },
    conversation: history,
    preferences: props.preferences,
    aiConfig: props.aiConfig,
  };
  lastAiRequest.value = payload;
  try {
    const response = await props.requestBackgroundInterpretation(payload, historyRecordId.value);
    if (currentRequestId !== requestId) return;
    addMessage('assistant', response.content);
    conversation.value = [...history, { role: 'user', content: questionText }, { role: 'assistant', content: response.content }];
    pendingQuestion.value = '';
  } catch (reason) {
    if (currentRequestId === requestId && !(reason instanceof DOMException && reason.name === 'AbortError')) {
      error.value = reason instanceof Error ? reason.message : '合盘解读没有完成，请稍后再试。';
      markPendingMessageFailed(true);
    }
  } finally {
    if (currentRequestId === requestId) {
      loadingPhase.value = '';
    }
  }
}

async function generateInterpretation() {
  if (!primaryCase.value || !partnerCase.value || selectionIssue.value) {
    error.value = selectionIssue.value;
    return;
  }
  const primary = primaryCase.value;
  const partner = partnerCase.value;
  const type = selectedType.value;
  const firstQuestion = initialQuestion(primary, partner, type);
  abortActiveRequest();
  page.value = 'chat';
  messages.value = [];
  conversation.value = [];
  reading.value = null;
  question.value = '';
  error.value = '';
  pendingQuestion.value = firstQuestion;
  addMessage('user', firstQuestion);
  loadingPhase.value = 'calculating';
  const currentRequestId = ++requestId;
  try {
    const systems: CompatibilitySystem[] = ['bazi', 'ziwei', 'astrolabe'];
    const result = await calculateCompatibilityBundle(
      toBirthProfile(primary),
      toBirthProfile(partner),
      {
        systems,
        bazi: { person1Name: primary.label, person2Name: partner.label },
        ziwei: { person1Name: primary.label, person2Name: partner.label },
        astrolabe: { includeHouseOverlays: true, maxAspects: 40 },
        chart: { ziwei: { scopes: ['origin'] } },
      },
    );
    if (currentRequestId !== requestId) return;
    reading.value = {
      summary: `${primary.label}与${partner.label}的${type.label}合盘`,
      data: { primary: primary.label, partner: partner.label, type: type.value, systems },
      prompt: buildCompatibilityPrompt(result, primary, partner, type),
      method: `${type.label} · 八字、紫微与星盘综合合盘`,
    };
    if (!result.primary.bazi || !result.partner.bazi) throw new Error('八字合盘资料没有生成完整。');
    const createdAt = Date.now();
    historyRecordId.value = `${createdAt}-compatibility-${Math.random().toString(16).slice(2)}`;
    props.saveHistoryRecord({
      id: historyRecordId.value,
      kind: 'bazi',
      methodLabel: `${type.label}合盘`,
      question: firstQuestion,
      createdAt,
      result: result.primary.bazi as ReadingResult,
      relatedResults: [{ kind: 'bazi', result: result.partner.bazi as ReadingResult }],
      compatibility: {
        type: type.value,
        primaryCaseId: primary.id,
        partnerCaseId: partner.id,
        primaryLabel: primary.label,
        partnerLabel: partner.label,
        reading: reading.value,
      },
    });
    loadingPhase.value = '';
    await requestCurrentQuestion(firstQuestion, true);
  } catch (reason) {
    if (currentRequestId === requestId && !(reason instanceof DOMException && reason.name === 'AbortError')) {
      error.value = reason instanceof Error ? reason.message : '合盘解读没有完成，请稍后再试。';
      markPendingMessageFailed(true);
    }
  } finally {
    if (currentRequestId === requestId) {
      loadingPhase.value = '';
    }
  }
}

function sendFollowUp() {
  const nextQuestion = question.value.trim();
  if (!nextQuestion || !canSend.value) return;
  question.value = '';
  void requestCurrentQuestion(nextQuestion, false);
}

function retryPendingQuestion() {
  if (!pendingQuestion.value || loading.value) return;
  if (!reading.value) {
    void generateInterpretation();
    return;
  }
  void requestCurrentQuestion(pendingQuestion.value, true);
}

function swapCases() {
  const first = primaryCaseId.value;
  primaryCaseId.value = partnerCaseId.value;
  partnerCaseId.value = first;
}

function formatCaseDate(profile: CompatibilityCase) {
  if (!profile.date) return '日期待补充';
  const [year, month, day] = profile.date.split('-');
  return profile.dateType === 'lunar'
    ? `农历${year}年${profile.isLeapMonth ? '闰' : ''}${Number(month)}月${Number(day)}日`
    : `${year}年${Number(month)}月${Number(day)}日`;
}

function genderLabel(profile: CompatibilityCase) {
  return profile.gender === 'male' ? '男' : '女';
}
</script>

<template>
  <UiPageShell :width="page === 'chat' ? 'reading' : 'standard'" class="compatibility-screen" :class="{ 'is-chat': page === 'chat' }">
    <UiWorkspaceSurface v-if="!hasEnoughCases" class="compatibility-onboarding" padding="standard">
      <UiEmptyState title="需要两份案例" description="请先在案例中保存两个人的出生资料。" compact>
        <template #icon><HeartHandshake :size="24" /></template>
        <template #action><UiButton @click="emit('manage-cases')"><BookOpen :size="15" />前往案例</UiButton></template>
      </UiEmptyState>
    </UiWorkspaceSurface>

    <template v-else-if="page === 'selection'">
      <UiWorkspaceSurface class="compatibility-selection-card" padding="standard" aria-label="选择合盘案例">
        <header class="compatibility-selection-header">
          <div>
            <h2>选择双方资料</h2>
            <span>{{ cases.length }} 份案例</span>
          </div>
          <UiButton variant="ghost" size="small" @click="emit('manage-cases')"><BookOpen :size="14" />管理案例</UiButton>
        </header>

        <div class="compatibility-pair-grid">
          <article class="compatibility-person-picker">
            <div class="compatibility-person-heading"><label for="compatibility-primary">第一位</label></div>
            <select id="compatibility-primary" v-model="primaryCaseId">
              <option v-for="profile in cases" :key="profile.id" :value="profile.id" :disabled="profile.id === partnerCaseId">{{ profile.label }}</option>
            </select>
            <div v-if="primaryCase" class="compatibility-case-summary">
              <div class="compatibility-case-identity"><span>{{ primaryCase.label.slice(0, 1) }}</span><small>{{ genderLabel(primaryCase) }}</small></div>
              <ul class="compatibility-case-meta">
                <li><CalendarDays :size="13" /><span>{{ formatCaseDate(primaryCase) }}</span></li>
                <li><Clock3 :size="13" /><span>{{ primaryCase.time || '时间待补充' }}</span></li>
                <li><MapPin :size="13" /><span>{{ primaryCase.locationName || '地点待补充' }}</span></li>
              </ul>
            </div>
          </article>

          <div class="compatibility-pair-link"><button type="button" class="compatibility-swap" aria-label="交换两个案例" title="交换案例" @click="swapCases"><ArrowLeftRight :size="17" /></button></div>

          <article class="compatibility-person-picker">
            <div class="compatibility-person-heading"><label for="compatibility-partner">第二位</label></div>
            <select id="compatibility-partner" v-model="partnerCaseId">
              <option v-for="profile in cases" :key="profile.id" :value="profile.id" :disabled="profile.id === primaryCaseId">{{ profile.label }}</option>
            </select>
            <div v-if="partnerCase" class="compatibility-case-summary">
              <div class="compatibility-case-identity"><span>{{ partnerCase.label.slice(0, 1) }}</span><small>{{ genderLabel(partnerCase) }}</small></div>
              <ul class="compatibility-case-meta">
                <li><CalendarDays :size="13" /><span>{{ formatCaseDate(partnerCase) }}</span></li>
                <li><Clock3 :size="13" /><span>{{ partnerCase.time || '时间待补充' }}</span></li>
                <li><MapPin :size="13" /><span>{{ partnerCase.locationName || '地点待补充' }}</span></li>
              </ul>
            </div>
          </article>
        </div>

        <fieldset class="compatibility-type-section">
          <legend>关系类型</legend>
          <UiSegmentedControl
            class="compatibility-type-tabs ui-tool-tabs"
            :model-value="compatibilityType"
            :items="compatibilityTypeTabs"
            label="合盘类型"
            compact
            equal
            @update:model-value="compatibilityType = $event as CompatibilityType"
          />
          <div class="compatibility-type-focus"><HeartHandshake :size="15" /><span>{{ selectedType.focus }}</span></div>
        </fieldset>

        <UiActionBar align="end">
          <UiButton :disabled="!canInterpret" @click="generateInterpretation"><Sparkles :size="15" />生成合盘解读</UiButton>
        </UiActionBar>
      </UiWorkspaceSurface>

      <UiNotice v-if="selectionIssue" class="compatibility-selection-note" tone="error" compact>{{ selectionIssue }}<template #action><UiButton variant="ghost" size="small" @click="emit('manage-cases')">完善案例</UiButton></template></UiNotice>
    </template>

    <section v-else class="compatibility-chat" aria-label="合盘解读对话">
      <header class="compatibility-chat-header">
        <div v-if="primaryCase && partnerCase" class="compatibility-case-bubbles">
          <button type="button" class="compatibility-case-bubble" :aria-label="`查看${primaryCase.label}的命盘`" @click="emit('view-case', primaryCase.id)">
            <span class="compatibility-case-avatar">{{ primaryCase.label.slice(0, 1) }}</span>
            <span class="compatibility-case-copy"><strong>{{ primaryCase.label }}</strong><small>查看命盘</small></span>
            <ChevronRight :size="14" />
          </button>
          <HeartHandshake class="compatibility-case-link-icon" :size="16" aria-hidden="true" />
          <button type="button" class="compatibility-case-bubble" :aria-label="`查看${partnerCase.label}的命盘`" @click="emit('view-case', partnerCase.id)">
            <span class="compatibility-case-avatar">{{ partnerCase.label.slice(0, 1) }}</span>
            <span class="compatibility-case-copy"><strong>{{ partnerCase.label }}</strong><small>查看命盘</small></span>
            <ChevronRight :size="14" />
          </button>
        </div>
        <span class="compatibility-chat-type">{{ selectedType.label }}合盘</span>
      </header>

      <div class="compatibility-chat-stream" aria-live="polite">
        <div
          v-for="message in messages"
          :key="message.id"
          class="compatibility-message"
          :class="[`is-${message.role}`, { 'is-failed': message.failed }]"
        >
          <span>{{ message.role === 'user' ? '你' : '时月东方' }}</span>
          <p v-if="message.role === 'user'">{{ message.content }}</p>
          <div v-else class="compatibility-answer-bubble">
            <ChatMarkdown class="compatibility-markdown" :content="message.content" />
            <AiReadingActions :content="message.content" :title="`${selectedType.label}合盘解读`" />
          </div>
        </div>

        <div v-if="loading" class="compatibility-message is-assistant">
          <span>时月东方</span>
          <p class="compatibility-typing"><LoaderCircle class="spin" :size="14" />{{ loadingPhase === 'calculating' ? '正在准备双方合盘资料……' : loadingPhase === 'following-up' ? '正在结合上文回答……' : '正在生成合盘解读……' }}</p>
        </div>

        <div v-if="error" class="compatibility-message is-assistant">
          <span>时月东方</span>
          <div class="compatibility-error-bubble" role="alert"><p>{{ error }}</p><AiPromptFallback v-if="lastAiRequest" :request="lastAiRequest" @retry="retryPendingQuestion" /></div>
        </div>
        <div ref="chatEnd" class="compatibility-chat-end" aria-hidden="true"></div>
      </div>

      <div class="chat-composer chat-composer-docked compatibility-composer">
        <textarea
          v-auto-resize
          class="composer-textarea"
          v-model="question"
          maxlength="4000"
          rows="1"
          :disabled="loading || Boolean(pendingQuestion) || !reading"
          :placeholder="error ? '请先重试上一个问题' : loading ? '正在解读，请稍候' : '继续追问这份合盘解读'"
          aria-label="继续追问合盘解读"
          @keydown.enter.exact.prevent="sendFollowUp"
        ></textarea>
        <small class="composer-shortcut-hint">Enter 发送 · Shift + Enter 换行</small>
        <div class="composer-toolbar">
          <div class="composer-tools"></div>
          <button class="chat-send-button" type="button" :disabled="!canSend" aria-label="发送追问" @click="sendFollowUp"><LoaderCircle v-if="loading" class="spin" :size="17" /><ArrowUp v-else :size="18" :stroke-width="2.4" /></button>
        </div>
      </div>
    </section>
  </UiPageShell>
</template>

<style scoped>
.compatibility-screen { width: 100%; }
.compatibility-onboarding { margin: 0 auto; max-width: 720px; }

.compatibility-selection-card { background: var(--ds-surface-raised); }
.compatibility-selection-header { align-items: center; display: flex; justify-content: space-between; margin-bottom: var(--ds-space-5); min-width: 0; }
.compatibility-selection-header > div { align-items: baseline; display: flex; gap: var(--ds-space-3); min-width: 0; }
.compatibility-selection-header h2 { color: var(--ds-text-primary); font-size: var(--ds-text-lg); font-weight: 650; letter-spacing: .02em; margin: 0; }
.compatibility-selection-header span { color: var(--ds-text-tertiary); font-size: var(--ds-text-xs); white-space: nowrap; }

.compatibility-pair-grid { align-items: stretch; background: var(--ds-surface-muted); border: 1px solid var(--ds-line); border-radius: var(--ds-radius-lg); display: grid; grid-template-columns: minmax(0, 1fr) 54px minmax(0, 1fr); overflow: hidden; }
.compatibility-person-picker { background: var(--ds-surface-raised); min-width: 0; padding: var(--ds-space-5); }
.compatibility-person-heading { align-items: center; display: flex; gap: var(--ds-space-2); margin-bottom: var(--ds-space-3); }
.compatibility-person-heading > label, .compatibility-type-section legend { color: var(--ds-text-secondary); font-size: var(--ds-text-sm); font-weight: 600; }
.compatibility-person-picker > select { appearance: auto; background: var(--ds-surface-muted); border: 1px solid var(--ds-line); border-radius: var(--ds-radius-sm); color: var(--ds-text-primary); font-size: var(--ds-text-md); font-weight: 600; min-height: var(--ds-control-lg); padding: 10px 13px; width: 100%; }
.compatibility-person-picker > select:focus { background: var(--ds-surface-raised); border-color: var(--ds-accent); outline: none; }
.compatibility-case-summary { align-items: stretch; display: grid; gap: var(--ds-space-3); grid-template-columns: 42px minmax(0, 1fr); margin-top: var(--ds-space-4); min-width: 0; }
.compatibility-case-identity { align-items: center; align-self: start; display: grid; gap: 4px; justify-items: center; }
.compatibility-case-identity > span { align-items: center; background: var(--ds-accent-soft); border: 1px solid color-mix(in srgb, var(--ds-accent) 20%, transparent); border-radius: var(--ds-radius-sm); color: var(--ds-accent-strong); display: inline-flex; font-family: 'Noto Serif SC', serif; font-size: var(--ds-text-lg); height: 38px; justify-content: center; width: 38px; }
.compatibility-case-identity > small { color: var(--ds-text-tertiary); font-size: var(--ds-text-xs); line-height: 1; }
.compatibility-case-meta { display: grid; gap: 6px; list-style: none; margin: 0; min-width: 0; padding: 0; }
.compatibility-case-meta li { align-items: center; color: var(--ds-text-secondary); display: flex; font-size: var(--ds-text-xs); gap: 7px; line-height: 1.35; min-width: 0; }
.compatibility-case-meta svg { color: var(--ds-text-tertiary); flex: 0 0 auto; }
.compatibility-case-meta span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.compatibility-pair-link { align-items: center; display: flex; justify-content: center; position: relative; }
.compatibility-pair-link::before { background: var(--ds-line); content: ''; height: 1px; left: 0; position: absolute; right: 0; }
.compatibility-swap { align-items: center; background: var(--ds-surface-raised); border: 1px solid color-mix(in srgb, var(--ds-accent) 28%, var(--ds-line)); border-radius: 50%; box-shadow: var(--ds-shadow-sm); color: var(--ds-accent-strong); display: inline-flex; height: 38px; justify-content: center; position: relative; transition: transform .2s ease, background .2s ease, border-color .2s ease; width: 38px; z-index: 1; }
.compatibility-swap:hover { background: var(--ds-accent-soft); border-color: var(--ds-accent); transform: rotate(180deg); }

.compatibility-type-section { border: 0; margin: var(--ds-space-6) 0 0; padding: 0; }
.compatibility-type-section legend { margin: 0 0 var(--ds-space-3); padding: 0; }
.compatibility-type-tabs { clear: both; width: 100% !important; }
.compatibility-type-tabs.ui-segmented-control > button { min-height: var(--ds-control-md); min-width: 0; }
.compatibility-type-focus { align-items: center; color: var(--ds-text-secondary); display: flex; font-size: var(--ds-text-xs); gap: var(--ds-space-2); line-height: 1.45; margin-top: var(--ds-space-3); min-width: 0; }
.compatibility-type-focus svg { color: var(--ds-accent); flex: 0 0 auto; }
.compatibility-selection-note { margin-top: var(--ds-space-3); }
.compatibility-selection-note button { background: transparent; color: currentColor; font-size: var(--ds-text-xs); padding: 3px 0; text-decoration: underline; text-underline-offset: 3px; }

.compatibility-chat { display: flex; flex-direction: column; gap: 18px; height: calc(100dvh - 132px); min-height: 0; overflow: hidden; width: 100%; }
.compatibility-chat-header { align-items: center; border-bottom: 1px solid var(--ds-line); display: flex; gap: var(--ds-space-3); justify-content: space-between; padding: 2px 2px var(--ds-space-3); }
.compatibility-case-bubbles { align-items: center; display: flex; gap: 7px; min-width: 0; }
.compatibility-case-bubble { align-items: center; background: var(--ds-surface-muted); border: 1px solid var(--ds-line); border-radius: 999px; color: var(--ds-text-primary); display: flex; gap: 8px; max-width: 220px; min-width: 0; padding: 5px 8px 5px 5px; text-align: left; transition: background .18s ease, border-color .18s ease; }
.compatibility-case-bubble:hover { background: var(--ds-accent-soft); border-color: color-mix(in srgb, var(--ds-accent) 36%, var(--ds-line)); }
.compatibility-case-avatar { align-items: center; background: var(--ds-accent-soft); border-radius: 50%; color: var(--ds-accent-strong); display: inline-flex; flex: 0 0 auto; font-family: 'Noto Serif SC', serif; font-size: var(--ds-text-sm); height: 32px; justify-content: center; width: 32px; }
.compatibility-case-copy { display: grid; line-height: 1.15; min-width: 0; }
.compatibility-case-copy strong { font-size: var(--ds-text-sm); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.compatibility-case-copy small { color: var(--ds-text-tertiary); font-size: var(--ds-text-xs); margin-top: 3px; }
.compatibility-case-bubble > svg { color: var(--ds-text-tertiary); flex: 0 0 auto; }
.compatibility-case-link-icon { color: var(--ds-accent); flex: 0 0 auto; }
.compatibility-chat-type { background: var(--ds-accent-soft); border-radius: 999px; color: var(--ds-accent-strong); flex: 0 0 auto; font-size: var(--ds-text-xs); padding: 4px 9px; }
.compatibility-chat-stream { align-content: start; display: grid; flex: 1 1 auto; gap: 17px; min-height: 0; overflow-y: auto; padding: 7px 2px 18px; scroll-padding-bottom: 18px; scrollbar-width: none; width: 100%; }
.compatibility-chat-stream::-webkit-scrollbar { display: none; }
.compatibility-message { max-width: min(700px, 88%); }
.compatibility-message > span { color: var(--ds-text-tertiary); display: block; font-size: var(--ds-text-xs); margin: 0 8px 5px; }
.compatibility-message > p, .compatibility-answer-bubble, .compatibility-error-bubble { background: var(--ds-surface-muted); border-radius: 4px var(--ds-radius-md) var(--ds-radius-md) var(--ds-radius-md); color: var(--ds-text-secondary); font-size: var(--ds-text-sm); line-height: 1.75; margin: 0; padding: 12px 14px; }
.compatibility-answer-bubble :deep(.compatibility-markdown) { color: inherit; }
.compatibility-message > p { white-space: pre-wrap; }
.compatibility-message.is-user { justify-self: end; }
.compatibility-message.is-user > span { text-align: right; }
.compatibility-message.is-user > p { background: var(--ds-accent-soft); border-radius: var(--ds-radius-md) 4px var(--ds-radius-md) var(--ds-radius-md); color: var(--ds-text-primary); }
.compatibility-message.is-failed > p { border: 1px solid color-mix(in srgb, var(--ds-danger) 35%, var(--ds-line)); opacity: .78; }
.compatibility-typing { align-items: center; display: flex; gap: 8px; }
.compatibility-error-bubble { background: var(--ds-danger-soft); border: 1px solid color-mix(in srgb, var(--ds-danger) 35%, var(--ds-line)); color: var(--ds-danger); white-space: normal; }
.compatibility-error-bubble p { line-height: 1.7; margin: 0; }
.compatibility-chat-end { height: 1px; }
.compatibility-composer { bottom: auto; flex: 0 0 auto; margin: 0; max-width: none; position: static; width: 100%; }
.compatibility-composer :deep(.composer-textarea:disabled) { cursor: not-allowed; opacity: .72; }

@media (max-width: 720px) {
  .compatibility-selection-header { margin-bottom: var(--ds-space-4); }
  .compatibility-pair-grid { grid-template-columns: minmax(0, 1fr) 44px minmax(0, 1fr); }
  .compatibility-person-picker { padding: var(--ds-space-4); }
  .compatibility-person-picker > select { font-size: var(--ds-text-sm); padding-left: var(--ds-space-2); padding-right: var(--ds-space-2); }
  .compatibility-case-summary { gap: 8px; grid-template-columns: 36px minmax(0, 1fr); }
  .compatibility-case-identity > span { font-size: var(--ds-text-md); height: 34px; width: 34px; }
  .compatibility-swap { height: 34px; width: 34px; }
  .compatibility-chat { height: calc(100dvh - 94px); }
}

@media (max-width: 460px) {
  .compatibility-selection-card { border-radius: var(--ds-radius-md); }
  .compatibility-selection-header h2 { font-size: var(--ds-text-md); }
  .compatibility-selection-header > div { gap: var(--ds-space-2); }
  .compatibility-selection-header .ui-button { padding-inline: 8px; }
  .compatibility-pair-grid { border-radius: var(--ds-radius-md); grid-template-columns: minmax(0, 1fr) 38px minmax(0, 1fr); }
  .compatibility-person-picker { padding: 11px 10px 12px; }
  .compatibility-person-heading { gap: 6px; margin-bottom: 8px; }
  .compatibility-person-heading > label { font-size: var(--ds-text-xs); }
  .compatibility-person-picker > select { min-height: 38px; }
  .compatibility-case-summary { display: block; margin-top: 10px; }
  .compatibility-case-identity { display: none; }
  .compatibility-case-meta { gap: 5px; }
  .compatibility-case-meta li { gap: 5px; }
  .compatibility-case-meta svg { height: 12px; width: 12px; }
  .compatibility-swap { height: 32px; width: 32px; }
  .compatibility-type-section { margin-top: var(--ds-space-5); }
  .compatibility-type-tabs.ui-segmented-control > button { font-size: var(--ds-text-xs); padding-inline: 4px; }
  .compatibility-type-focus { align-items: flex-start; }
  .compatibility-chat-header { align-items: center; gap: 7px; }
  .compatibility-case-bubbles { flex: 1 1 auto; gap: 4px; }
  .compatibility-case-bubble { flex: 1 1 0; gap: 5px; max-width: none; padding: 4px 6px 4px 4px; }
  .compatibility-case-avatar { font-size: var(--ds-text-xs); height: 28px; width: 28px; }
  .compatibility-case-copy small, .compatibility-case-bubble > svg { display: none; }
  .compatibility-case-copy strong { font-size: 12px; }
  .compatibility-case-link-icon { height: 14px; width: 14px; }
  .compatibility-chat-type { font-size: 11px; padding: 4px 7px; }
  .compatibility-chat-stream { padding-top: 3px; }
  .compatibility-message { max-width: 92%; }
}

@media (prefers-color-scheme: dark) {
  .compatibility-person-picker { background: var(--ds-surface-muted); }
}
</style>
