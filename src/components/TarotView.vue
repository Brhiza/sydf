<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Check, Hash, Hand, RotateCcw, Sparkles } from 'lucide-vue-next';
import type { AiCustomConfig, AiPreferences } from '../lib/ai';
import type { TarotCardResult, TarotInterpretationPayload, TarotReadingResult, TarotSpreadType } from '../lib/tarot';
import { UiButton, UiNotice, UiSectionHeading, UiToolPage, UiWorkspaceSurface } from './ui';

type DrawMode = 'manual' | 'number';
type SpreadType = TarotSpreadType;

interface TarotPromptResponse {
  ok: boolean;
  data?: {
    result?: TarotReadingResult;
    summary?: { title?: string; tags?: string[]; lines?: string[] };
    prompt?: string;
  };
  error?: string;
}

const props = defineProps<{
  preferences?: AiPreferences;
  aiConfig?: AiCustomConfig;
  castingPreference?: 'auto' | 'manual';
}>();

const emit = defineEmits<{
  interpret: [payload: TarotInterpretationPayload];
}>();

const TOTAL_CARDS = 78;
const DRAW_THRESHOLD = 44;
const cardNumbers = Array.from({ length: TOTAL_CARDS }, (_, index) => index + 1);
const spreadOptions: Array<{ value: SpreadType; label: string; count: number; description: string }> = [
  { value: 'single', label: '单牌指引', count: 1, description: '聚焦当下最重要的提醒' },
  { value: 'three', label: '时间流牌阵', count: 3, description: '过去、现在与未来' },
  { value: 'mindBodySpirit', label: '身心灵牌阵', count: 3, description: '思想、行动与内在状态' },
  { value: 'love', label: '爱情牌阵', count: 5, description: '双方内心与关系走向' },
  { value: 'career', label: '事业牌阵', count: 6, description: '优势、挑战、机会与建议' },
  { value: 'decision', label: '选择牌阵', count: 6, description: '比较两种选择及其结果' },
  { value: 'chakra', label: '七脉轮牌阵', count: 7, description: '观察七个层面的平衡' },
  { value: 'horseshoe', label: '马蹄铁牌阵', count: 7, description: '梳理影响、建议和结果' },
  { value: 'celtic', label: '凯尔特十字', count: 10, description: '完整分析现状与发展' },
  { value: 'year', label: '年运牌阵', count: 12, description: '全年节奏与重点领域' },
];
interface SpreadPose { x: number; y: number; rotation?: number; layer?: number }

const spreadLayouts: Record<SpreadType, SpreadPose[]> = {
  single: [{ x: 50, y: 50 }],
  three: [{ x: 18, y: 50 }, { x: 50, y: 50 }, { x: 82, y: 50 }],
  mindBodySpirit: [{ x: 18, y: 50 }, { x: 50, y: 50 }, { x: 82, y: 50 }],
  love: [{ x: 50, y: 18 }, { x: 19, y: 50 }, { x: 50, y: 50 }, { x: 81, y: 50 }, { x: 50, y: 82 }],
  career: [{ x: 20, y: 20 }, { x: 50, y: 20 }, { x: 80, y: 20 }, { x: 34, y: 53 }, { x: 66, y: 53 }, { x: 50, y: 83 }],
  decision: [{ x: 38, y: 17 }, { x: 23, y: 50 }, { x: 12, y: 84 }, { x: 62, y: 17 }, { x: 77, y: 50 }, { x: 88, y: 84 }],
  chakra: [{ x: 50, y: 7 }, { x: 50, y: 21 }, { x: 50, y: 36 }, { x: 50, y: 50 }, { x: 50, y: 64 }, { x: 50, y: 79 }, { x: 50, y: 93 }],
  horseshoe: [{ x: 9, y: 80 }, { x: 21, y: 47 }, { x: 35, y: 23 }, { x: 50, y: 15 }, { x: 65, y: 23 }, { x: 79, y: 47 }, { x: 91, y: 80 }],
  celtic: [
    { x: 38, y: 50, layer: 2 }, { x: 38, y: 50, rotation: 90, layer: 3 },
    { x: 38, y: 16 }, { x: 59, y: 50 }, { x: 38, y: 84 }, { x: 17, y: 50 },
    { x: 84, y: 86 }, { x: 84, y: 62 }, { x: 84, y: 38 }, { x: 84, y: 14 },
  ],
  year: [
    { x: 50, y: 14 }, { x: 69, y: 18 }, { x: 83, y: 31 }, { x: 89, y: 50 },
    { x: 83, y: 69 }, { x: 69, y: 82 }, { x: 50, y: 86 }, { x: 31, y: 82 },
    { x: 17, y: 69 }, { x: 11, y: 50 }, { x: 17, y: 31 }, { x: 31, y: 18 },
  ],
};

const question = ref('');
const spreadType = ref<SpreadType>('single');
const drawMode = ref<DrawMode | null>(null);
const phase = ref<'setup' | 'method' | 'drawing' | 'result'>('setup');
const numberInput = ref('');
const candidateCard = ref<number | null>(null);
const confirmedNumbers = ref<number[]>([]);
const tarotReading = ref<TarotReadingResult | null>(null);
const apiPrompt = ref('');
const flowError = ref('');
const isDrawing = ref(false);
const deckRef = ref<HTMLElement | null>(null);
const deckTrackRef = ref<HTMLElement | null>(null);
const draggingCard = ref<number | null>(null);
const dragOffset = ref(0);
const pointerId = ref<number | null>(null);
const pointerStart = ref({ x: 0, y: 0 });
const pointerMode = ref<'pending' | 'horizontal' | 'vertical'>('pending');
const fanPoses = ref<Record<number, { angle: number; lift: number }>>({});
const initialScrollLeft = ref(0);
const sessionNonce = ref(createNonce());
let fanFrame = 0;
let fanResizeObserver: ResizeObserver | null = null;
let deckPositioned = false;
let requestId = 0;
let activeController: AbortController | null = null;

const selectedSpread = computed(() => spreadOptions.find((item) => item.value === spreadType.value) ?? spreadOptions[0]!);
const requiredCards = computed(() => selectedSpread.value.count);
const remainingCards = computed(() => Math.max(0, requiredCards.value - confirmedNumbers.value.length));
const canBegin = computed(() => Boolean(question.value.trim()) && !isDrawing.value);
const candidateText = computed(() => candidateCard.value === null ? '' : `这是第 ${candidateCard.value} 张牌`);
const progressText = computed(() => confirmedNumbers.value.length
  ? `已确认 ${confirmedNumbers.value.length} 张，还需 ${remainingCards.value} 张`
  : `需要抽取 ${requiredCards.value} 张牌`);
const denseSpread = computed(() => requiredCards.value >= 7);

function createNonce() {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const values = new Uint32Array(3);
    crypto.getRandomValues(values);
    return Array.from(values).join('-');
  }
  return `${Date.now()}-${Math.random()}`;
}

function updateFanLayout() {
  const scroller = deckRef.value;
  const track = deckTrackRef.value;
  if (!scroller || !track) return;
  const cards = Array.from(track.querySelectorAll<HTMLElement>('.tarot-card'));
  if (!cards.length) return;
  const cardWidth = cards[0]!.offsetWidth;
  const edgeSpace = Math.max(28, (scroller.clientWidth - cardWidth) / 2);
  track.style.setProperty('--fan-edge-space', `${edgeSpace}px`);
  if (!deckPositioned) {
    const step = cards[1] ? cards[1]!.offsetLeft - cards[0]!.offsetLeft : cardWidth;
    const visibleCards = Math.max(1, Math.floor(scroller.clientWidth / Math.max(1, step)));
    const startingCenter = cards[Math.min(cards.length - 1, Math.floor(visibleCards / 2))]!;
    initialScrollLeft.value = Math.max(0, startingCenter.offsetLeft + startingCenter.offsetWidth / 2 - scroller.clientWidth / 2);
    scroller.scrollLeft = initialScrollLeft.value;
    deckPositioned = true;
  }
  const desktop = scroller.clientWidth >= 720;
  const viewportCenter = scroller.scrollLeft + scroller.clientWidth / 2;
  const arcHalfWidth = Math.max(desktop ? 280 : 155, scroller.clientWidth * .48);
  const poses: Record<number, { angle: number; lift: number }> = {};
  cards.forEach((element, index) => {
    const cardCenter = element.offsetLeft + element.offsetWidth / 2;
    const position = Math.max(-1.15, Math.min(1.15, (cardCenter - viewportCenter) / arcHalfWidth));
    const edgeProgress = Math.min(1, Math.abs(position));
    poses[index + 1] = {
      angle: position * (desktop ? 34 : 22),
      lift: -(desktop ? 92 : 50) * (1 - edgeProgress * edgeProgress),
    };
  });
  fanPoses.value = poses;
}

function scheduleFanUpdate() {
  cancelAnimationFrame(fanFrame);
  fanFrame = requestAnimationFrame(updateFanLayout);
}

function cardStyle(card: number) {
  const isDragging = draggingCard.value === card;
  const isCandidate = candidateCard.value === card;
  const pose = fanPoses.value[card] || { angle: 0, lift: 0 };
  const interactionLift = isCandidate ? -38 : isDragging ? Math.min(0, dragOffset.value) : 0;
  return {
    '--card-angle': `${isCandidate ? 0 : pose.angle}deg`,
    '--card-lift': `${pose.lift + interactionLift}px`,
    '--card-seed': `${(card * 17) % 47}px`,
  };
}

function setCandidate(card: number) {
  if (!question.value.trim()) {
    flowError.value = '请先写下想问的问题。';
    return;
  }
  if (confirmedNumbers.value.includes(card) || tarotReading.value) return;
  candidateCard.value = card;
  flowError.value = '';
  nextTick(() => {
    deckRef.value?.querySelector<HTMLElement>(`[data-card="${card}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  });
}

function handleCardClick(event: MouseEvent, card: number) {
  if (event.detail === 0) setCandidate(card);
}

function handlePointerDown(event: PointerEvent, card: number) {
  if (event.button !== 0 || pointerId.value !== null || confirmedNumbers.value.includes(card) || Boolean(tarotReading.value)) return;
  pointerId.value = event.pointerId;
  pointerStart.value = { x: event.clientX, y: event.clientY };
  pointerMode.value = 'pending';
  draggingCard.value = card;
  dragOffset.value = 0;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
}

function handlePointerMove(event: PointerEvent) {
  if (pointerId.value !== event.pointerId || draggingCard.value === null) return;
  const deltaX = event.clientX - pointerStart.value.x;
  const deltaY = event.clientY - pointerStart.value.y;
  if (pointerMode.value === 'pending' && Math.max(Math.abs(deltaX), Math.abs(deltaY)) > 7) {
    pointerMode.value = Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical';
  }
  if (pointerMode.value !== 'vertical') return;
  event.preventDefault();
  dragOffset.value = Math.max(-92, Math.min(0, deltaY));
}

function finishPointer(event: PointerEvent) {
  if (pointerId.value !== event.pointerId) return;
  const card = draggingCard.value;
  const shouldChoose = card !== null && ((pointerMode.value === 'vertical' && dragOffset.value <= -DRAW_THRESHOLD) || pointerMode.value === 'pending');
  if (shouldChoose && card !== null) setCandidate(card);
  pointerId.value = null;
  pointerMode.value = 'pending';
  draggingCard.value = null;
  dragOffset.value = 0;
}

async function confirmCandidate() {
  if (candidateCard.value === null || isDrawing.value) return;
  const card = candidateCard.value;
  candidateCard.value = null;
  confirmedNumbers.value.push(card);
  if (confirmedNumbers.value.length >= requiredCards.value) {
    await resolveReading();
    if (tarotReading.value) phase.value = 'result';
  }
}

function secureShuffle() {
  const pool = [...cardNumbers];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const random = new Uint32Array(1);
    crypto.getRandomValues(random);
    const target = random[0]! % (index + 1);
    [pool[index], pool[target]] = [pool[target]!, pool[index]!];
  }
  return pool;
}

async function automaticDraw() {
  if (!validateQuestion()) return;
  confirmedNumbers.value = secureShuffle().slice(0, requiredCards.value);
  await resolveReading();
  if (tarotReading.value) phase.value = 'result';
}

function parseSpecifiedNumbers() {
  const values = numberInput.value.trim().split(/[\s,，、]+/).filter(Boolean).map(Number);
  if (values.length !== requiredCards.value) throw new Error(`请输入 ${requiredCards.value} 个数字。`);
  if (values.some((value) => !Number.isInteger(value) || value < 1 || value > TOTAL_CARDS)) throw new Error('数字需为 1 到 78 的整数。');
  if (new Set(values).size !== values.length) throw new Error('每个数字只能使用一次。');
  return values;
}

async function drawByNumbers() {
  if (!validateQuestion()) return;
  try {
    confirmedNumbers.value = parseSpecifiedNumbers();
    flowError.value = '';
    await resolveReading();
    if (tarotReading.value) phase.value = 'result';
  } catch (error) {
    flowError.value = error instanceof Error ? error.message : '指定数字无法识别。';
  }
}

async function beginDraw() {
  if (!validateQuestion()) return;
  if (props.castingPreference === 'auto') {
    await automaticDraw();
    return;
  }
  drawMode.value = null;
  phase.value = 'method';
  flowError.value = '';
}

async function beginManualDraw() {
  drawMode.value = 'manual';
  phase.value = 'drawing';
  flowError.value = '';
  await nextTick();
  deckPositioned = false;
  updateFanLayout();
  if (deckRef.value) fanResizeObserver?.observe(deckRef.value);
}

function chooseNumberDraw() {
  drawMode.value = 'number';
  flowError.value = '';
  nextTick(() => document.querySelector<HTMLInputElement>('.tarot-number-draw input')?.focus());
}

function validateQuestion() {
  if (question.value.trim()) return true;
  flowError.value = '请先写下想问的问题。';
  return false;
}

async function resolveReading() {
  if (!validateQuestion() || confirmedNumbers.value.length !== requiredCards.value) return;
  const currentRequest = ++requestId;
  activeController?.abort();
  const controller = new AbortController();
  activeController = controller;
  const timeout = window.setTimeout(() => controller.abort(), 30000);
  isDrawing.value = true;
  flowError.value = '';
  tarotReading.value = null;
  apiPrompt.value = '';
  try {
    const seed = `sydf-tarot|${sessionNonce.value}|${spreadType.value}|${confirmedNumbers.value.join('.')}`;
    const response = await fetch('https://aov.cc/api/v1/divination/tarot/prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: question.value.trim(), spreadType: spreadType.value, seed, responseMode: 'full' }),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null) as TarotPromptResponse | null;
    if (!response.ok || !payload?.ok) throw new Error(payload?.error || `塔罗排牌暂时不可用（${response.status}）。`);
    const result = payload.data?.result;
    const prompt = payload.data?.prompt?.trim();
    if (!result || result.cards.length !== requiredCards.value || !prompt) throw new Error('塔罗排牌返回的数据不完整，请重新抽牌。');
    if (currentRequest !== requestId) return;
    tarotReading.value = result;
    apiPrompt.value = prompt;
    isDrawing.value = false;
  } catch (error) {
    if (currentRequest !== requestId) return;
    flowError.value = error instanceof DOMException && error.name === 'AbortError'
      ? '排牌请求超时，请重试。'
      : error instanceof Error ? error.message : '塔罗排牌暂时失败，请稍后重试。';
  } finally {
    window.clearTimeout(timeout);
    if (currentRequest === requestId) isDrawing.value = false;
  }
}

async function retryReading() {
  await resolveReading();
  if (tarotReading.value) phase.value = 'result';
}

function startInterpretation() {
  if (!tarotReading.value || !apiPrompt.value) return;
  const summary = `${tarotReading.value.spreadName}：${tarotReading.value.cards.map((card) => `${card.position}${card.name}${card.reversed ? '逆位' : '正位'}`).join('；')}`;
  emit('interpret', {
    question: question.value.trim(),
    reading: tarotReading.value,
    request: {
      mode: 'divination',
      question: question.value.trim(),
      method: '塔罗牌',
      reading: {
        summary,
        data: tarotReading.value,
        prompt: apiPrompt.value,
      },
      preferences: props.preferences,
      aiConfig: props.aiConfig,
    },
  });
}

function resetReading() {
  requestId += 1;
  activeController?.abort();
  activeController = null;
  candidateCard.value = null;
  confirmedNumbers.value = [];
  tarotReading.value = null;
  apiPrompt.value = '';
  flowError.value = '';
  isDrawing.value = false;
  phase.value = 'setup';
  drawMode.value = null;
  numberInput.value = '';
  sessionNonce.value = createNonce();
  deckRef.value?.scrollTo({ left: initialScrollLeft.value, behavior: 'smooth' });
}

function chooseSpread(value: string) {
  if (value === spreadType.value) return;
  spreadType.value = value as SpreadType;
}

function cardSymbol(card: TarotCardResult) {
  if (card.name.includes('权杖')) return '火';
  if (card.name.includes('圣杯')) return '水';
  if (card.name.includes('宝剑')) return '风';
  if (card.name.includes('钱币')) return '土';
  return '✦';
}

function spreadCardStyle(index: number) {
  const pose = spreadLayouts[spreadType.value][index] || { x: 50, y: 50 };
  return {
    '--spread-x': `${pose.x}%`,
    '--spread-y': `${pose.y}%`,
    '--spread-rotation': `${pose.rotation || 0}deg`,
    zIndex: pose.layer || 1,
  };
}

watch(spreadType, resetReading);

onMounted(() => {
  nextTick(updateFanLayout);
  fanResizeObserver = new ResizeObserver(scheduleFanUpdate);
  if (deckRef.value) fanResizeObserver.observe(deckRef.value);
});

onBeforeUnmount(() => {
  requestId += 1;
  activeController?.abort();
  cancelAnimationFrame(fanFrame);
  fanResizeObserver?.disconnect();
});
</script>

<template>
  <UiToolPage width="wide" class="screen tarot-screen">
    <UiWorkspaceSurface as="article" class="tarot-workspace" :class="{ 'is-drawing': phase === 'drawing' }" padding="standard">
      <UiSectionHeading
        eyebrow="塔罗牌"
        :title="phase === 'setup' ? '静心想好你的问题' : phase === 'method' ? '选择抽牌方式' : phase === 'drawing' ? '专注于此刻' : '你的牌阵'"
      />

      <template v-if="phase === 'setup'">
        <section class="tarot-setup" aria-label="塔罗抽牌设置">
          <label class="tarot-question-field">
            <span>想问的问题</span>
            <textarea v-model="question" maxlength="5000" rows="3" placeholder="写下你现在最想厘清的问题" @input="flowError = ''"></textarea>
          </label>
          <label class="tarot-spread-field">
            <span>选择牌阵</span>
            <select :value="spreadType" @change="chooseSpread(($event.target as HTMLSelectElement).value)">
              <option v-for="item in spreadOptions" :key="item.value" :value="item.value">{{ item.label }} · {{ item.count }} 张</option>
            </select>
            <small>{{ selectedSpread.description }}</small>
          </label>
        </section>

        <UiNotice v-if="flowError" class="tarot-notice" tone="error" compact>{{ flowError }}</UiNotice>
        <div class="tarot-setup-action">
          <UiButton size="large" :loading="isDrawing" :disabled="!canBegin" @click="beginDraw"><Sparkles v-if="!isDrawing" :size="16" />{{ isDrawing ? '正在排牌…' : '进入抽牌' }}</UiButton>
        </div>
      </template>

      <template v-else-if="phase === 'method'">
        <div class="tarot-stage-toolbar">
          <div><strong>{{ selectedSpread.label }} · {{ requiredCards }} 张</strong><small>{{ question }}</small></div>
          <UiButton variant="ghost" size="small" @click="resetReading"><RotateCcw :size="14" />返回修改</UiButton>
        </div>

        <section class="tarot-method-chooser" aria-label="选择抽牌方式">
          <button type="button" class="tarot-method-option" @click="beginManualDraw">
            <span><Hand :size="22" /></span><strong>手动抽牌</strong><small>展开完整牌组，凭直觉逐张选择</small>
          </button>
          <button type="button" class="tarot-method-option" :class="{ active: drawMode === 'number' }" @click="chooseNumberDraw">
            <span><Hash :size="22" /></span><strong>指定数字</strong><small>输入 {{ requiredCards }} 个不重复的数字完成抽牌</small>
          </button>
        </section>

        <div v-if="drawMode === 'number'" class="tarot-number-draw">
          <label>
            <span>指定 {{ requiredCards }} 个数字</span>
            <input v-model="numberInput" inputmode="numeric" autocomplete="off" :placeholder="requiredCards === 1 ? '输入 1 到 78 的数字' : `用逗号分隔，例如 ${Array.from({ length: Math.min(requiredCards, 4) }, (_, index) => index + 3).join('，')}`" @input="flowError = ''" />
            <small>范围 1–78，数字不可重复</small>
          </label>
          <UiButton :loading="isDrawing" :disabled="!numberInput.trim() || isDrawing" @click="drawByNumbers"><Sparkles v-if="!isDrawing" :size="15" />{{ isDrawing ? '正在排牌…' : '确认数字并抽牌' }}</UiButton>
        </div>

        <UiNotice v-if="flowError" class="tarot-notice" tone="error" compact>{{ flowError }}</UiNotice>
      </template>

      <template v-else-if="phase === 'drawing'">
        <div class="tarot-stage-toolbar">
          <div><strong>{{ selectedSpread.label }}</strong><small>{{ question }}</small></div>
          <UiButton variant="ghost" size="small" @click="resetReading"><RotateCcw :size="14" />重新设置</UiButton>
        </div>

        <section class="tarot-draw-workspace">
          <div v-if="confirmedNumbers.length" class="tarot-confirmed-strip" aria-label="已确认的牌">
            <span v-for="(number, index) in confirmedNumbers" :key="number"><small>第 {{ index + 1 }} 张</small><strong>第 {{ number }} 张牌</strong></span>
          </div>
          <div class="tarot-manual-heading"><span>{{ progressText }}</span><small>左右滑动，点击或向上拖动一张牌</small></div>
          <div class="tarot-deck-region">
            <div ref="deckRef" class="tarot-deck-scroll" role="group" aria-label="塔罗牌扇形牌阵，可左右滑动" @scroll="scheduleFanUpdate">
              <div ref="deckTrackRef" class="tarot-deck">
                <button
                  v-for="card in cardNumbers"
                  :key="card"
                  type="button"
                  class="tarot-card"
                  :class="{ 'is-candidate': candidateCard === card, 'is-dragging': draggingCard === card, 'is-confirmed': confirmedNumbers.includes(card) }"
                  :style="cardStyle(card)"
                  :data-card="card"
                  :disabled="confirmedNumbers.includes(card) || isDrawing"
                  :aria-label="`查看第 ${card} 张牌`"
                  :aria-pressed="candidateCard === card"
                  @click="handleCardClick($event, card)"
                  @pointerdown="handlePointerDown($event, card)"
                  @pointermove="handlePointerMove"
                  @pointerup="finishPointer"
                  @pointercancel="finishPointer"
                >
                  <span class="tarot-card-inner" aria-hidden="true"><span class="tarot-card-corners"></span><span class="tarot-card-orbit"><i></i></span></span>
                </button>
              </div>
            </div>
            <div class="tarot-candidate-panel" aria-live="polite">
              <template v-if="candidateCard !== null">
                <strong>{{ candidateText }}</strong>
                <UiButton size="small" @click="confirmCandidate"><Check :size="15" />确定</UiButton>
              </template>
              <span v-else>{{ question.trim() ? '选择后在这里确认' : '先写下问题，再选择一张牌' }}</span>
            </div>
          </div>
        </section>

        <UiNotice v-if="flowError" class="tarot-notice" tone="error" compact>
          {{ flowError }}
          <template #action><UiButton variant="secondary" size="small" @click="retryReading">重试排牌</UiButton></template>
        </UiNotice>
      </template>

      <template v-else-if="phase === 'result'">
        <section v-if="tarotReading" class="tarot-result-section" aria-live="polite">
          <div class="tarot-result-heading">
            <div><small>{{ tarotReading.spreadName }} · {{ requiredCards }} 张</small><strong>牌面已揭示</strong><p>{{ question }}</p></div>
            <UiButton variant="ghost" size="small" @click="resetReading"><RotateCcw :size="14" />重新开始</UiButton>
          </div>
          <div class="tarot-spread-scroll">
            <div class="tarot-spread-board" :class="[`spread-${spreadType}`, { 'is-dense': denseSpread }]" :aria-label="`${tarotReading.spreadName}牌阵`">
              <article v-for="(card, index) in tarotReading.cards" :key="`${card.id}-${index}`" class="tarot-result-item" :style="spreadCardStyle(index)" :aria-label="`${card.position}，${card.name}，${card.reversed ? '逆位' : '正位'}`">
                <span class="tarot-position"><i>{{ index + 1 }}</i>{{ card.position }}</span>
                <div class="tarot-face" :class="{ 'is-reversed': card.reversed }">
                  <span class="tarot-face-frame"></span>
                  <div class="tarot-face-art"><small>{{ card.id }}</small><b>{{ cardSymbol(card) }}</b><i>✦</i></div>
                </div>
                <strong>{{ card.name }}</strong>
                <span class="tarot-orientation" :class="{ reversed: card.reversed }">{{ card.reversed ? '逆位' : '正位' }}</span>
                <p>{{ card.keywords.join(' · ') }}</p>
              </article>
            </div>
          </div>
          <div class="tarot-result-action">
            <UiButton size="large" @click="startInterpretation"><Sparkles :size="16" />开始解读</UiButton>
          </div>
        </section>
      </template>
    </UiWorkspaceSurface>
  </UiToolPage>
</template>

<style scoped>
.tarot-screen { min-width: 0; }
.tarot-workspace { min-width: 0; }
.tarot-workspace.is-drawing { display: flex; flex-direction: column; min-height: calc(100dvh - var(--ds-topbar-height) - var(--ds-space-7) - var(--ds-space-8)); }
.tarot-workspace > :first-child { margin-bottom: var(--ds-space-6); }
.tarot-setup { display: grid; gap: var(--ds-space-5); grid-template-columns: minmax(0, 1fr) 280px; margin: 0 auto var(--ds-space-4); max-width: 880px; }
.tarot-setup label { display: flex; flex-direction: column; gap: 8px; }
.tarot-setup label > span, .tarot-number-draw label > span { color: var(--ds-text-secondary); font-size: var(--ds-text-sm); font-weight: 550; }
.tarot-setup textarea, .tarot-setup select, .tarot-number-draw input { background: var(--ds-surface-muted); border: 1px solid var(--ds-line); border-radius: var(--ds-radius-sm); color: var(--ds-text-primary); font: inherit; outline: none; transition: background-color .18s ease, border-color .18s ease, box-shadow .18s ease; width: 100%; }
.tarot-setup textarea { min-height: 84px; padding: 12px 13px; resize: vertical; }
.tarot-setup select, .tarot-number-draw input { height: 44px; padding: 0 12px; }
.tarot-setup textarea:focus, .tarot-setup select:focus, .tarot-number-draw input:focus { background: var(--ds-surface-raised); border-color: var(--ds-accent); box-shadow: var(--ds-focus-ring); }
.tarot-setup textarea:disabled, .tarot-setup select:disabled { opacity: .66; }
.tarot-setup small, .tarot-number-draw small { color: var(--ds-text-tertiary); font-size: var(--ds-text-xs); }
.tarot-setup-action { display: flex; justify-content: center; margin-top: var(--ds-space-5); }
.tarot-stage-toolbar { align-items: center; background: var(--ds-surface-muted); border-radius: var(--ds-radius-md); display: flex; justify-content: space-between; margin: 0 auto var(--ds-space-4); max-width: 900px; padding: var(--ds-space-3) var(--ds-space-4); }
.tarot-stage-toolbar > div { display: grid; gap: 4px; min-width: 0; }
.tarot-stage-toolbar strong { color: var(--ds-text-primary); font-size: var(--ds-text-sm); }
.tarot-stage-toolbar small { color: var(--ds-text-tertiary); font-size: var(--ds-text-xs); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tarot-result-section { margin: 0 auto; max-width: 1080px; }
.tarot-result-heading { align-items: center; display: flex; justify-content: space-between; margin-bottom: 18px; }
.tarot-result-heading > div { display: grid; gap: 4px; }
.tarot-result-heading small { color: var(--ds-text-tertiary); font-size: var(--ds-text-xs); letter-spacing: .08em; }
.tarot-result-heading strong { color: var(--ds-text-primary); font-size: var(--ds-heading-sm); font-weight: 650; }
.tarot-result-heading p { color: var(--ds-text-secondary); font-size: var(--ds-text-sm); line-height: 1.5; margin: 3px 0 0; max-width: 720px; }
.tarot-spread-scroll { overflow-x: auto; padding: 6px 2px 16px; scrollbar-width: thin; }
.tarot-spread-board { background: color-mix(in srgb, var(--ds-surface-muted) 88%, var(--ds-accent-soft)); border: 1px solid var(--ds-line); border-radius: var(--ds-radius-lg); height: 820px; margin-inline: auto; min-width: 720px; overflow: hidden; position: relative; }
.tarot-spread-board::before { border: 1px solid color-mix(in srgb, var(--ds-accent) 14%, transparent); border-radius: 50%; content: ''; height: 44%; left: 50%; position: absolute; top: 50%; transform: translate(-50%, -50%); width: 44%; }
.tarot-spread-board.spread-single, .tarot-spread-board.spread-three, .tarot-spread-board.spread-mindBodySpirit { height: 340px; }
.tarot-spread-board.spread-single { min-width: 320px; width: min(100%, 520px); }
.tarot-spread-board.spread-three, .tarot-spread-board.spread-mindBodySpirit { min-width: 650px; }
.tarot-spread-board.spread-love { height: 920px; }
.tarot-spread-board.spread-career { height: 900px; }
.tarot-spread-board.spread-decision { height: 880px; min-width: 820px; }
.tarot-spread-board.spread-horseshoe { height: 800px; min-width: 820px; }
.tarot-spread-board.spread-chakra { height: 1950px; min-width: 360px; width: min(100%, 560px); }
.tarot-spread-board.spread-celtic { height: 1150px; min-width: 900px; }
.tarot-spread-board.spread-year { height: 1500px; min-width: 1000px; }
.tarot-result-item { align-items: center; display: flex; flex-direction: column; left: var(--spread-x); min-width: 0; position: absolute; text-align: center; top: var(--spread-y); transform: translate(-50%, -50%); width: 124px; }
.tarot-position { align-items: center; color: var(--ds-accent-strong); display: flex; font-size: var(--ds-text-xs); gap: 5px; height: 32px; justify-content: center; line-height: 1.2; width: 150px; }
.tarot-position i { align-items: center; background: var(--ds-accent-soft); border-radius: var(--ds-radius-round); color: var(--ds-accent-strong); display: inline-flex; flex: 0 0 auto; font-size: 9px; font-style: normal; height: 18px; justify-content: center; width: 18px; }
.tarot-face, .tarot-result-back { border: 3px solid #d9c69b; border-radius: 8px; box-shadow: 0 11px 24px rgba(41,33,52,.2); height: 184px; overflow: hidden; position: relative; width: 112px; }
.tarot-result-back, .tarot-card-inner { background: radial-gradient(circle at 65% 24%, rgba(255,255,255,.5) 0 1px, transparent 1.5px), radial-gradient(circle at 26% 74%, rgba(255,255,255,.42) 0 1.2px, transparent 1.7px), linear-gradient(155deg, #3d264b, #191b36 72%); }
.tarot-result-back::before, .tarot-card-inner::before { background-image: radial-gradient(circle, #efe3bb 0 1.1px, transparent 1.8px); background-position: 4px 5px; background-size: 19px 21px; content: ''; inset: 5px; opacity: .48; position: absolute; }
.tarot-face { background: radial-gradient(circle at 50% 34%, rgba(253,236,184,.34), transparent 34%), linear-gradient(155deg, #805c73, #26264a 70%); transform: rotate(var(--spread-rotation)); }
.tarot-face-frame { border: 1px solid rgba(246,225,171,.68); inset: 6px; position: absolute; }
.tarot-face-art { align-items: center; display: flex; flex-direction: column; inset: 11px; justify-content: center; position: absolute; transition: transform .3s; }
.tarot-face.is-reversed .tarot-face-art { transform: rotate(180deg); }
.tarot-face-art small { color: #f1ddb0; font-size: 10px; left: 3px; position: absolute; top: 1px; }
.tarot-face-art b { align-items: center; border: 1px solid rgba(244,224,171,.7); border-radius: 50%; color: #f6e3b5; display: flex; font-family: 'Noto Serif SC', serif; font-size: 32px; font-weight: 500; height: 67px; justify-content: center; text-shadow: 0 0 18px rgba(255,225,153,.35); width: 67px; }
.tarot-face-art i { color: #ead096; font-size: 13px; font-style: normal; margin-top: 10px; }
.tarot-card-corners { border: 1px solid rgba(231, 212, 164, .68); inset: 6px; position: absolute; }
.tarot-card-orbit { border: 1px solid rgba(232, 213, 168, .75); border-radius: 50%; height: 38px; left: 50%; position: absolute; top: 50%; transform: translate(-50%, -50%) rotate(-25deg); width: 38px; }
.tarot-card-orbit::before, .tarot-card-orbit::after { background: #e7d49f; content: ''; left: 50%; position: absolute; top: 50%; transform: translate(-50%, -50%) rotate(45deg); }
.tarot-card-orbit::before { height: 12px; width: 12px; }
.tarot-card-orbit::after { background: #2d243d; height: 7px; width: 7px; }
.tarot-card-orbit i { border: 1px solid rgba(232, 213, 168, .6); border-radius: 50%; inset: 8px; position: absolute; }
.tarot-result-item > strong { color: var(--ds-text-primary); font-size: var(--ds-text-sm); margin-top: 9px; }
.tarot-result-item > small { color: var(--ds-text-secondary); font-size: 11px; margin-top: 9px; }
.tarot-orientation { background: var(--ds-success-soft); border-radius: var(--ds-radius-round); color: var(--ds-success); font-size: 10px; margin-top: 5px; padding: 2px 7px; }
.tarot-orientation.reversed { background: var(--ds-danger-soft); color: var(--ds-danger); }
.tarot-result-item p { color: var(--ds-text-tertiary); font-size: 10px; line-height: 1.45; margin: 6px 0 0; }
.tarot-spread-board.is-dense .tarot-result-item p { display: none; }
.tarot-spread-board.spread-celtic .tarot-result-item:nth-child(2) { height: 270px; }
.tarot-spread-board.spread-celtic .tarot-result-item:nth-child(2) .tarot-position { left: 50%; position: absolute; top: 254px; transform: translateX(-50%); }
.tarot-spread-board.spread-celtic .tarot-result-item:nth-child(2) > strong { margin: 0; position: absolute; top: 286px; }
.tarot-spread-board.spread-celtic .tarot-result-item:nth-child(2) > .tarot-orientation { margin: 0; position: absolute; top: 310px; }
.tarot-result-action { display: flex; justify-content: center; padding: 18px 0 4px; }
.tarot-notice { margin: 14px auto; max-width: 880px; }
.tarot-draw-workspace { display: flex; flex: 1; flex-direction: column; margin: 16px auto 0; min-height: 0; width: 100%; }
.tarot-confirmed-strip { display: flex; gap: 9px; justify-content: center; margin: 0 auto 16px; max-width: 900px; overflow-x: auto; padding: 3px; }
.tarot-confirmed-strip > span { background: var(--ds-surface-muted); border: 1px solid var(--ds-line); border-radius: var(--ds-radius-sm); display: grid; flex: 0 0 auto; gap: 3px; min-width: 86px; padding: 8px 10px; text-align: center; }
.tarot-confirmed-strip small { color: var(--ds-text-tertiary); font-size: 9px; }
.tarot-confirmed-strip strong { color: var(--ds-accent-strong); font-size: 11px; }
.tarot-manual-heading { display: grid; gap: 5px; margin: 0 auto; max-width: 900px; text-align: center; }
.tarot-manual-heading span { color: var(--ds-text-primary); font-size: var(--ds-text-sm); font-weight: 650; }
.tarot-manual-heading small { color: var(--ds-text-tertiary); font-size: var(--ds-text-xs); }
.tarot-deck-region { background: var(--ds-surface-muted); border: 1px solid var(--ds-line); border-radius: var(--ds-radius-lg); flex: 0 0 auto; margin-top: auto; min-width: 0; padding-bottom: var(--ds-space-4); position: relative; }
.tarot-deck-scroll { cursor: grab; min-width: 0; overflow-x: auto; overflow-y: hidden; padding: 170px 0 58px; scrollbar-width: none; touch-action: pan-x; }
.tarot-deck-scroll::-webkit-scrollbar { display: none; }
.tarot-deck { --fan-edge-space: 44px; display: flex; min-width: max-content; }
.tarot-deck::before, .tarot-deck::after { content: ''; flex: 0 0 var(--fan-edge-space); }
.tarot-card { --card-angle: 0deg; --card-lift: 0px; background: transparent; border: 0; cursor: grab; flex: 0 0 88px; height: 142px; margin-left: -43px; padding: 0; position: relative; transform: translateY(var(--card-lift)) rotate(var(--card-angle)); transform-origin: 50% 145%; transition: transform .16s ease-out, filter .2s, opacity .2s; user-select: none; z-index: 1; }
.tarot-card:first-child { margin-left: 0; }
.tarot-card:hover { filter: brightness(1.13); }
.tarot-card.is-dragging { cursor: grabbing; transition: none; z-index: 90; }
.tarot-card.is-candidate { filter: brightness(1.12); z-index: 100; }
.tarot-card.is-confirmed { opacity: .2; }
.tarot-card:focus-visible { outline: none; z-index: 101; }
.tarot-card:focus-visible .tarot-card-inner { box-shadow: var(--ds-focus-ring), 0 12px 28px rgba(41,33,52,.24); }
.tarot-card-inner { border: 3px solid #d9c69b; border-radius: 7px; box-shadow: 0 9px 23px rgba(41,33,52,.24); display: block; height: 142px; overflow: hidden; position: relative; width: 88px; }
.tarot-candidate-panel { align-items: center; display: flex; gap: 14px; justify-content: center; min-height: 42px; text-align: center; }
.tarot-candidate-panel strong { color: var(--ds-accent-strong); font-size: var(--ds-text-lg); font-weight: 650; }
.tarot-candidate-panel > span { color: var(--ds-text-tertiary); font-size: var(--ds-text-xs); }
.tarot-method-chooser { display: grid; gap: var(--ds-space-4); grid-template-columns: repeat(2, minmax(0, 1fr)); margin: var(--ds-space-6) auto 0; max-width: 720px; }
.tarot-method-option { align-items: center; background: var(--ds-surface-raised); border: 1px solid var(--ds-line); border-radius: var(--ds-radius-lg); color: var(--ds-text-primary); cursor: pointer; display: flex; flex-direction: column; min-height: 180px; padding: var(--ds-space-5); text-align: center; transition: border-color .18s, box-shadow .18s, transform .18s; }
.tarot-method-option:hover, .tarot-method-option.active { border-color: var(--ds-accent); box-shadow: 0 8px 28px color-mix(in srgb, var(--ds-accent) 12%, transparent); transform: translateY(-2px); }
.tarot-method-option:focus-visible { box-shadow: var(--ds-focus-ring); outline: none; }
.tarot-method-option > span { align-items: center; background: var(--ds-accent-soft); border-radius: var(--ds-radius-round); color: var(--ds-accent-strong); display: flex; height: 48px; justify-content: center; margin-bottom: var(--ds-space-3); width: 48px; }
.tarot-method-option strong { font-size: var(--ds-text-md); }
.tarot-method-option small { color: var(--ds-text-tertiary); font-size: var(--ds-text-xs); line-height: 1.55; margin-top: 7px; }
.tarot-number-draw { align-items: stretch; background: var(--ds-surface-muted); border: 1px solid var(--ds-line); border-radius: var(--ds-radius-md); display: flex; flex-direction: column; margin: var(--ds-space-5) auto; max-width: 650px; padding: var(--ds-space-5); text-align: left; }
.tarot-number-draw label { display: flex; flex-direction: column; gap: 8px; margin-bottom: 18px; }

@media (max-width: 720px) {
  .tarot-workspace.is-drawing { min-height: calc(100dvh - var(--ds-topbar-height) - var(--ds-space-3) - var(--ds-space-7) - env(safe-area-inset-bottom)); }
  .tarot-workspace > :first-child { margin-bottom: var(--ds-space-5); }
  .tarot-setup { grid-template-columns: 1fr; }
  .tarot-question-field textarea { min-height: 76px; }
  .tarot-stage-toolbar, .tarot-result-heading { align-items: flex-start; gap: var(--ds-space-3); }
  .tarot-stage-toolbar small { max-width: 210px; }
  .tarot-method-chooser { grid-template-columns: 1fr; margin-top: var(--ds-space-4); }
  .tarot-method-option { min-height: 142px; padding: var(--ds-space-4); }
  .tarot-spread-board.spread-single { min-width: 290px; }
  .tarot-spread-board.spread-three, .tarot-spread-board.spread-mindBodySpirit { min-width: 590px; }
  .tarot-result-heading p { max-width: 230px; }
  .tarot-deck-scroll { padding-bottom: 38px; padding-top: 115px; }
  .tarot-card { flex-basis: 72px; height: 116px; margin-left: -32px; transform-origin: 50% 132%; }
  .tarot-card-inner { height: 116px; width: 72px; }
}

@media (prefers-reduced-motion: reduce) { .tarot-card, .tarot-method-option { transition: none; } }
</style>
