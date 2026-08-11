<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Check, LoaderCircle, RefreshCw, RotateCcw, Sparkles } from 'lucide-vue-next';
import { requestAiInterpretation, type AiCustomConfig, type AiPreferences } from '../lib/ai';
import AiReadingActions from './AiReadingActions.vue';
import ChatMarkdown from './ChatMarkdown.vue';
import { UiButton, UiNotice, UiSegmentedControl } from './ui';

type DrawMode = 'manual' | 'auto' | 'number';
type SpreadType = 'single' | 'three' | 'love' | 'career' | 'decision' | 'celtic' | 'chakra' | 'year' | 'mindBodySpirit' | 'horseshoe';

interface TarotCardResult {
  id: number;
  name: string;
  position: string;
  reversed: boolean;
  keywords: string[];
  element?: string;
  archetype?: string;
}

interface TarotReadingResult {
  spreadType: SpreadType;
  spreadName: string;
  cards: TarotCardResult[];
  timestamp?: number;
  meta?: unknown;
  draw?: unknown;
}

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
const drawModeOptions = [
  { value: 'manual', label: '手动抽牌' },
  { value: 'auto', label: '自动抽牌' },
  { value: 'number', label: '指定数字' },
];

const question = ref('');
const spreadType = ref<SpreadType>('single');
const drawMode = ref<DrawMode>(props.castingPreference === 'auto' ? 'auto' : 'manual');
const phase = ref<'setup' | 'drawing' | 'result' | 'interpretation'>('setup');
const animationPhase = ref<'idle' | 'shuffle' | 'stack' | 'deal'>('idle');
const numberInput = ref('');
const candidateCard = ref<number | null>(null);
const confirmedNumbers = ref<number[]>([]);
const tarotReading = ref<TarotReadingResult | null>(null);
const apiPrompt = ref('');
const aiAnswer = ref('');
const flowError = ref('');
const aiError = ref('');
const isDrawing = ref(false);
const isInterpreting = ref(false);
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
let animationId = 0;
const animationTimers = new Set<number>();

const selectedSpread = computed(() => spreadOptions.find((item) => item.value === spreadType.value) ?? spreadOptions[0]!);
const requiredCards = computed(() => selectedSpread.value.count);
const remainingCards = computed(() => Math.max(0, requiredCards.value - confirmedNumbers.value.length));
const canBegin = computed(() => Boolean(question.value.trim()) && !isDrawing.value && !isInterpreting.value);
const candidateText = computed(() => candidateCard.value === null ? '' : `这是第 ${candidateCard.value} 张牌`);
const progressText = computed(() => confirmedNumbers.value.length
  ? `已确认 ${confirmedNumbers.value.length} 张，还需 ${remainingCards.value} 张`
  : `需要抽取 ${requiredCards.value} 张牌`);

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

function waitForAnimation(duration: number) {
  return new Promise<void>((resolve) => {
    const timer = window.setTimeout(() => {
      animationTimers.delete(timer);
      resolve();
    }, duration);
    animationTimers.add(timer);
  });
}

async function automaticDraw() {
  if (!validateQuestion()) return;
  const currentAnimation = ++animationId;
  confirmedNumbers.value = secureShuffle().slice(0, requiredCards.value);
  phase.value = 'drawing';
  animationPhase.value = 'shuffle';
  const readingPromise = resolveReading();
  await waitForAnimation(900);
  if (currentAnimation !== animationId || phase.value !== 'drawing') return;
  animationPhase.value = 'stack';
  await waitForAnimation(700);
  if (currentAnimation !== animationId || phase.value !== 'drawing') return;
  animationPhase.value = 'deal';
  await Promise.all([readingPromise, waitForAnimation(650)]);
  if (currentAnimation === animationId && tarotReading.value) phase.value = 'result';
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
    phase.value = 'drawing';
    animationPhase.value = 'stack';
    await resolveReading();
    if (tarotReading.value) phase.value = 'result';
  } catch (error) {
    flowError.value = error instanceof Error ? error.message : '指定数字无法识别。';
  }
}

async function beginDraw() {
  if (!validateQuestion()) return;
  if (drawMode.value === 'auto') {
    await automaticDraw();
    return;
  }
  if (drawMode.value === 'number') {
    await drawByNumbers();
    return;
  }
  phase.value = 'drawing';
  flowError.value = '';
  await nextTick();
  deckPositioned = false;
  updateFanLayout();
  if (deckRef.value) fanResizeObserver?.observe(deckRef.value);
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
  aiError.value = '';
  aiAnswer.value = '';
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

async function startInterpretation() {
  if (!tarotReading.value) return;
  phase.value = 'interpretation';
  await nextTick();
  await interpretReading();
}

async function retryReading() {
  await resolveReading();
  if (tarotReading.value) phase.value = 'result';
}

async function interpretReading(currentRequest = requestId) {
  if (!tarotReading.value || !apiPrompt.value) return;
  isInterpreting.value = true;
  aiError.value = '';
  try {
    const response = await requestAiInterpretation({
      mode: 'divination',
      question: question.value.trim(),
      method: '塔罗牌',
      reading: {
        summary: `${tarotReading.value.spreadName}：${tarotReading.value.cards.map((card) => `${card.position}${card.name}${card.reversed ? '逆位' : '正位'}`).join('；')}`,
        data: tarotReading.value,
        prompt: apiPrompt.value,
      },
      preferences: props.preferences,
      aiConfig: props.aiConfig,
    });
    if (currentRequest !== requestId) return;
    aiAnswer.value = response.content;
  } catch (error) {
    if (currentRequest !== requestId) return;
    aiError.value = error instanceof Error ? error.message : 'AI 解读暂时失败，请稍后重试。';
  } finally {
    if (currentRequest === requestId) isInterpreting.value = false;
  }
}

function resetReading() {
  requestId += 1;
  animationId += 1;
  activeController?.abort();
  activeController = null;
  candidateCard.value = null;
  confirmedNumbers.value = [];
  tarotReading.value = null;
  apiPrompt.value = '';
  aiAnswer.value = '';
  flowError.value = '';
  aiError.value = '';
  isDrawing.value = false;
  isInterpreting.value = false;
  phase.value = 'setup';
  animationPhase.value = 'idle';
  numberInput.value = '';
  sessionNonce.value = createNonce();
  deckRef.value?.scrollTo({ left: initialScrollLeft.value, behavior: 'smooth' });
}

function chooseSpread(value: string) {
  if (value === spreadType.value) return;
  spreadType.value = value as SpreadType;
}

function chooseDrawMode(value: string) {
  if (value === drawMode.value) return;
  drawMode.value = value as DrawMode;
}

function cardSymbol(card: TarotCardResult) {
  if (card.name.includes('权杖')) return '火';
  if (card.name.includes('圣杯')) return '水';
  if (card.name.includes('宝剑')) return '风';
  if (card.name.includes('钱币')) return '土';
  return '✦';
}

watch([spreadType, drawMode], resetReading);
watch(() => props.castingPreference, (preference) => {
  if (phase.value === 'setup' && !confirmedNumbers.value.length) drawMode.value = preference === 'auto' ? 'auto' : 'manual';
});

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
  animationTimers.forEach((timer) => window.clearTimeout(timer));
  animationTimers.clear();
});
</script>

<template>
  <section class="tarot-page screen" aria-labelledby="tarot-title">
    <div class="tarot-atmosphere" aria-hidden="true"><span class="tarot-glow tarot-glow-one"></span><span class="tarot-glow tarot-glow-two"></span><span class="tarot-stars"></span></div>

    <div class="tarot-shell">
      <header class="tarot-heading">
        <span class="tarot-eyebrow">塔罗牌</span>
        <h2 id="tarot-title">{{ phase === 'setup' ? '静心想好你的问题' : phase === 'drawing' ? '专注于此刻' : phase === 'result' ? '你的牌阵' : '塔罗解读' }}</h2>
      </header>

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

        <UiSegmentedControl v-if="castingPreference !== 'auto'" class="tarot-mode-tabs" :model-value="drawMode" :items="drawModeOptions" label="抽牌方式" equal @update:model-value="chooseDrawMode" />

        <div v-if="drawMode === 'number'" class="tarot-number-draw tarot-number-setup">
          <label>
            <span>指定 {{ requiredCards }} 个数字</span>
            <input v-model="numberInput" inputmode="numeric" autocomplete="off" :placeholder="requiredCards === 1 ? '输入 1 到 78 的数字' : `用逗号分隔，例如 ${Array.from({ length: Math.min(requiredCards, 4) }, (_, index) => index + 3).join('，')}`" @input="flowError = ''" />
            <small>范围 1–78，数字不可重复</small>
          </label>
        </div>

        <UiNotice v-if="flowError" class="tarot-notice" tone="error" compact>{{ flowError }}</UiNotice>
        <div class="tarot-setup-action">
          <UiButton size="large" :disabled="!canBegin || (drawMode === 'number' && !numberInput.trim())" @click="beginDraw">
            <Sparkles v-if="drawMode === 'auto'" :size="16" />
            {{ drawMode === 'auto' ? '开始自动抽牌' : drawMode === 'number' ? '确认数字并抽牌' : '进入抽牌' }}
          </UiButton>
        </div>
      </template>

      <template v-else-if="phase === 'drawing'">
        <div class="tarot-stage-toolbar">
          <div><strong>{{ selectedSpread.label }}</strong><small>{{ question }}</small></div>
          <UiButton variant="ghost" size="small" :disabled="drawMode !== 'manual' && !flowError" @click="resetReading"><RotateCcw :size="14" />重新设置</UiButton>
        </div>

        <section v-if="drawMode === 'manual'" class="tarot-draw-workspace">
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

        <section v-else class="tarot-auto-stage" aria-live="polite">
          <div class="tarot-shuffle-stage" :class="`is-${animationPhase}`" aria-hidden="true">
            <span
              v-for="index in 14"
              :key="index"
              class="tarot-animation-card"
              :class="{ 'is-dealt': index <= requiredCards }"
              :style="{
                '--shuffle-x': `${((index * 37) % 9 - 4) * 26}px`,
                '--shuffle-y': `${((index * 23) % 7 - 3) * 17}px`,
                '--shuffle-r': `${((index * 19) % 31) - 15}deg`,
                '--stack-r': `${(index - 7) * .45}deg`,
                '--deal-x': `${(index - (requiredCards + 1) / 2) * Math.min(92, 700 / requiredCards)}px`,
                '--deal-mobile-x': `${(index - (requiredCards + 1) / 2) * Math.min(52, 330 / requiredCards)}px`,
              }"
            ><span class="tarot-card-corners"></span><span class="tarot-card-orbit"><i></i></span></span>
          </div>
          <strong>{{ animationPhase === 'shuffle' ? '正在洗牌' : animationPhase === 'stack' ? '正在收拢牌组' : '正在按牌位抽牌' }}</strong>
          <small>{{ selectedSpread.label }} · {{ requiredCards }} 张</small>
        </section>

        <UiNotice v-if="flowError" class="tarot-notice" tone="error" compact>
          {{ flowError }}
          <template #action><UiButton variant="secondary" size="small" @click="retryReading">重试排牌</UiButton></template>
        </UiNotice>
      </template>

      <template v-else>
        <section v-if="tarotReading" class="tarot-result-section" :class="{ 'is-interpretation': phase === 'interpretation' }" aria-live="polite">
          <div class="tarot-result-heading">
            <div><small>{{ tarotReading.spreadName }}</small><strong>{{ phase === 'result' ? '牌面已揭示' : question }}</strong></div>
            <UiButton v-if="phase === 'result'" variant="ghost" size="small" @click="resetReading"><RotateCcw :size="14" />重新开始</UiButton>
          </div>
          <div class="tarot-result-deck" :class="{ 'is-many': requiredCards > 7 }">
            <article v-for="(card, index) in tarotReading.cards" :key="`${card.id}-${index}`" class="tarot-result-item">
              <span class="tarot-position">{{ card.position }}</span>
              <div class="tarot-face" :class="{ 'is-reversed': card.reversed }">
                <span class="tarot-face-frame"></span>
                <div class="tarot-face-art"><small>{{ card.id }}</small><b>{{ cardSymbol(card) }}</b><i>✦</i></div>
              </div>
              <strong>{{ card.name }}</strong>
              <span class="tarot-orientation" :class="{ reversed: card.reversed }">{{ card.reversed ? '逆位' : '正位' }}</span>
              <p>{{ card.keywords.join(' · ') }}</p>
            </article>
          </div>
          <div v-if="phase === 'result'" class="tarot-result-action">
            <UiButton size="large" @click="startInterpretation"><Sparkles :size="16" />开始解读</UiButton>
          </div>
        </section>

        <section v-if="phase === 'interpretation'" class="tarot-ai-section" aria-live="polite">
          <div class="tarot-ai-heading"><span><Sparkles :size="17" />AI 解读</span><small>结合问题、牌位、正逆位与整组牌序</small></div>
          <div v-if="isInterpreting" class="tarot-ai-loading"><LoaderCircle class="spin" :size="20" /><span>正在整理这组牌给你的提示…</span></div>
          <UiNotice v-else-if="aiError" tone="error" compact>
            {{ aiError }}
            <template #action><UiButton variant="secondary" size="small" @click="interpretReading()"><RefreshCw :size="14" />重试解读</UiButton></template>
          </UiNotice>
          <AiReadingActions v-else-if="aiAnswer" :content="aiAnswer" title="塔罗牌解读"><ChatMarkdown class="tarot-ai-markdown" :content="aiAnswer" /></AiReadingActions>
        </section>
      </template>
    </div>
  </section>
</template>

<style scoped>
.tarot-page { background: radial-gradient(circle at 50% 27%, rgba(139, 102, 182, .28), transparent 31%), linear-gradient(165deg, #17111f 0%, #26162f 48%, #120f19 100%); color: #f8f1ff; min-height: calc(100dvh - var(--ds-topbar-height)); overflow: hidden; position: relative; }
.tarot-atmosphere { inset: 0; overflow: hidden; pointer-events: none; position: fixed; }
.tarot-glow { border-radius: 50%; filter: blur(2px); position: absolute; }
.tarot-glow-one { background: rgba(121, 79, 156, .22); height: 45vw; left: -13vw; top: 8%; width: 45vw; }
.tarot-glow-two { background: rgba(117, 77, 144, .18); bottom: 4%; height: 38vw; right: -10vw; width: 38vw; }
.tarot-stars { background-image: radial-gradient(circle, rgba(255, 246, 222, .72) 0 1px, transparent 1.5px), radial-gradient(circle, rgba(218, 191, 243, .45) 0 1px, transparent 1.4px); background-position: 0 0, 17px 19px; background-size: 43px 43px, 61px 61px; inset: 0; mask-image: linear-gradient(to bottom, rgba(0,0,0,.75), transparent 82%); opacity: .17; position: absolute; }
.tarot-shell { margin: 0 auto; max-width: 1180px; padding: 42px 24px 76px; position: relative; z-index: 1; }
.tarot-heading { margin: 0 auto 28px; text-align: center; }
.tarot-eyebrow { color: #c8aee0; display: block; font-size: 12px; letter-spacing: .28em; margin-bottom: 10px; }
.tarot-heading h2 { font-family: 'Noto Serif SC', serif; font-size: clamp(26px, 4vw, 38px); font-weight: 500; letter-spacing: .08em; margin: 0; }
.tarot-setup { background: rgba(31, 22, 40, .76); border: 1px solid rgba(232, 213, 244, .14); border-radius: 18px; box-shadow: 0 16px 46px rgba(5, 3, 11, .18); display: grid; gap: 18px; grid-template-columns: minmax(0, 1fr) 280px; margin: 0 auto 14px; max-width: 880px; padding: 18px; }
.tarot-setup label { display: flex; flex-direction: column; gap: 8px; }
.tarot-setup label > span, .tarot-number-draw label > span { color: #e8daef; font-size: 13px; font-weight: 650; }
.tarot-setup textarea, .tarot-setup select, .tarot-number-draw input { background: rgba(255,255,255,.065); border: 1px solid rgba(232, 213, 244, .18); border-radius: 11px; color: #fff8ff; font: inherit; outline: none; }
.tarot-setup textarea { min-height: 84px; padding: 12px 13px; resize: vertical; }
.tarot-setup select, .tarot-number-draw input { height: 44px; padding: 0 12px; }
.tarot-setup select option { background: #2b1d35; }
.tarot-setup textarea:focus, .tarot-setup select:focus, .tarot-number-draw input:focus { border-color: #c6a2dd; box-shadow: 0 0 0 3px rgba(195, 155, 221, .13); }
.tarot-setup textarea:disabled, .tarot-setup select:disabled { opacity: .66; }
.tarot-setup small, .tarot-number-draw small { color: #aa9bb4; font-size: 11px; }
.tarot-mode-tabs { margin: 0 auto 22px; max-width: 570px; }
.tarot-setup-action { display: flex; justify-content: center; margin-top: 20px; }
.tarot-number-setup { margin-bottom: 0; margin-top: 18px; max-width: 570px; padding-bottom: 20px; padding-top: 20px; }
.tarot-stage-toolbar { align-items: center; background: rgba(31,22,40,.68); border: 1px solid rgba(232,213,244,.13); border-radius: 14px; display: flex; justify-content: space-between; margin: 0 auto 18px; max-width: 900px; padding: 12px 14px; }
.tarot-stage-toolbar > div { display: grid; gap: 4px; min-width: 0; }
.tarot-stage-toolbar strong { color: #eadcf1; font-size: 13px; }
.tarot-stage-toolbar small { color: #a99ab3; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tarot-result-section { background: linear-gradient(180deg, rgba(49, 32, 59, .82), rgba(24, 18, 32, .72)); border: 1px solid rgba(233, 214, 245, .16); border-radius: 20px; margin: 22px auto; max-width: 1080px; padding: 18px; }
.tarot-result-section.is-interpretation { margin-bottom: 16px; }
.tarot-result-heading { align-items: center; display: flex; justify-content: space-between; margin-bottom: 18px; }
.tarot-result-heading > div { display: grid; gap: 4px; }
.tarot-result-heading small { color: #baa9c5; font-size: 11px; letter-spacing: .08em; }
.tarot-result-heading strong { font-family: 'Noto Serif SC', serif; font-size: 18px; font-weight: 550; }
.tarot-result-deck { display: flex; gap: 18px; justify-content: center; overflow-x: auto; padding: 8px 4px 14px; scrollbar-width: thin; }
.tarot-result-deck.is-many { justify-content: flex-start; }
.tarot-result-item { align-items: center; display: flex; flex: 0 0 124px; flex-direction: column; min-width: 0; text-align: center; }
.tarot-position { color: #dac8e5; font-size: 11px; height: 32px; line-height: 1.25; }
.tarot-face, .tarot-result-back { border: 3px solid #d9c69b; border-radius: 8px; box-shadow: 0 11px 24px rgba(5,3,11,.35); height: 184px; overflow: hidden; position: relative; width: 112px; }
.tarot-result-back, .tarot-card-inner { background: radial-gradient(circle at 65% 24%, rgba(255,255,255,.5) 0 1px, transparent 1.5px), radial-gradient(circle at 26% 74%, rgba(255,255,255,.42) 0 1.2px, transparent 1.7px), linear-gradient(155deg, #3d264b, #191b36 72%); }
.tarot-result-back::before, .tarot-card-inner::before { background-image: radial-gradient(circle, #efe3bb 0 1.1px, transparent 1.8px); background-position: 4px 5px; background-size: 19px 21px; content: ''; inset: 5px; opacity: .48; position: absolute; }
.tarot-face { background: radial-gradient(circle at 50% 34%, rgba(253,236,184,.34), transparent 34%), linear-gradient(155deg, #805c73, #26264a 70%); }
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
.tarot-result-item > strong { font-size: 13px; margin-top: 9px; }
.tarot-result-item > small { color: #c6b5d0; font-size: 11px; margin-top: 9px; }
.tarot-orientation { background: rgba(118,160,113,.2); border-radius: 999px; color: #c9e0bf; font-size: 10px; margin-top: 5px; padding: 2px 7px; }
.tarot-orientation.reversed { background: rgba(191,116,129,.18); color: #efbdc8; }
.tarot-result-item p { color: #aa9ab3; font-size: 10px; line-height: 1.45; margin: 6px 0 0; }
.tarot-result-action { display: flex; justify-content: center; padding: 18px 0 4px; }
.tarot-notice { margin: 14px auto; max-width: 880px; }
.tarot-draw-workspace { margin: 16px auto 0; }
.tarot-confirmed-strip { display: flex; gap: 9px; justify-content: center; margin: 0 auto 16px; max-width: 900px; overflow-x: auto; padding: 3px; }
.tarot-confirmed-strip > span { background: rgba(53,38,65,.82); border: 1px solid rgba(230,210,242,.17); border-radius: 10px; display: grid; flex: 0 0 auto; gap: 3px; min-width: 86px; padding: 8px 10px; text-align: center; }
.tarot-confirmed-strip small { color: #a998b3; font-size: 9px; }
.tarot-confirmed-strip strong { color: #ecdcb8; font-size: 11px; }
.tarot-manual-heading { display: grid; gap: 5px; margin: 0 auto; max-width: 900px; text-align: center; }
.tarot-manual-heading span { color: #e7d7ef; font-size: 13px; font-weight: 650; }
.tarot-manual-heading small { color: #aa9ab3; font-size: 11px; }
.tarot-deck-region { min-width: 0; position: relative; }
.tarot-deck-scroll { cursor: grab; min-width: 0; overflow-x: auto; overflow-y: hidden; padding: 170px 0 58px; scrollbar-width: none; touch-action: pan-x; }
.tarot-deck-scroll::-webkit-scrollbar { display: none; }
.tarot-deck { --fan-edge-space: 44px; display: flex; min-width: max-content; }
.tarot-deck::before, .tarot-deck::after { content: ''; flex: 0 0 var(--fan-edge-space); }
.tarot-card { --card-angle: 0deg; --card-lift: 0px; background: transparent; cursor: grab; flex: 0 0 88px; height: 142px; margin-left: -43px; padding: 0; position: relative; transform: translateY(var(--card-lift)) rotate(var(--card-angle)); transform-origin: 50% 145%; transition: transform .16s ease-out, filter .2s, opacity .2s; user-select: none; z-index: 1; }
.tarot-card:first-child { margin-left: 0; }
.tarot-card:hover { filter: brightness(1.13); }
.tarot-card.is-dragging { cursor: grabbing; transition: none; z-index: 90; }
.tarot-card.is-candidate { filter: brightness(1.12); z-index: 100; }
.tarot-card.is-confirmed { opacity: .2; }
.tarot-card:focus-visible { outline: none; z-index: 101; }
.tarot-card:focus-visible .tarot-card-inner { box-shadow: 0 0 0 3px #d5b8ec, 0 12px 28px rgba(0,0,0,.34); }
.tarot-card-inner { border: 3px solid #d9c69b; border-radius: 7px; box-shadow: 0 9px 23px rgba(5,3,11,.35); display: block; height: 142px; overflow: hidden; position: relative; width: 88px; }
.tarot-candidate-panel { align-items: center; display: flex; gap: 14px; justify-content: center; min-height: 42px; text-align: center; }
.tarot-candidate-panel strong { color: #f4e2b8; font-family: 'Noto Serif SC', serif; font-size: 17px; font-weight: 550; }
.tarot-candidate-panel > span { color: #a999b2; font-size: 12px; }
.tarot-auto-stage { align-items: center; display: flex; flex-direction: column; margin: 22px auto; min-height: 430px; padding: 24px 0; text-align: center; }
.tarot-auto-stage > strong { color: #eadcf1; font-family: 'Noto Serif SC', serif; font-size: 19px; font-weight: 550; margin-top: 16px; }
.tarot-auto-stage > small { color: #ad9db7; font-size: 11px; margin-top: 6px; }
.tarot-shuffle-stage { height: 310px; max-width: 900px; position: relative; width: 100%; }
.tarot-animation-card { background: radial-gradient(circle at 65% 24%, rgba(255,255,255,.5) 0 1px, transparent 1.5px), radial-gradient(circle at 26% 74%, rgba(255,255,255,.42) 0 1.2px, transparent 1.7px), linear-gradient(155deg, #3d264b, #191b36 72%); border: 3px solid #d9c69b; border-radius: 7px; box-shadow: 0 11px 28px rgba(5,3,11,.38); height: 150px; left: 50%; margin-left: -46px; margin-top: -75px; overflow: hidden; position: absolute; top: 50%; transform: translate(0, 0); transition: transform .68s cubic-bezier(.22,.78,.24,1), opacity .4s; width: 92px; }
.tarot-animation-card::before { background-image: radial-gradient(circle, #efe3bb 0 1.1px, transparent 1.8px); background-position: 4px 5px; background-size: 19px 21px; content: ''; inset: 5px; opacity: .48; position: absolute; }
.tarot-shuffle-stage.is-shuffle .tarot-animation-card { animation: tarot-shuffle-pulse .45s ease-in-out infinite alternate; transform: translate(var(--shuffle-x), var(--shuffle-y)) rotate(var(--shuffle-r)); }
.tarot-shuffle-stage.is-stack .tarot-animation-card { animation: none; transform: translate(0, 0) rotate(var(--stack-r)); }
.tarot-shuffle-stage.is-deal .tarot-animation-card { animation: none; transform: translate(0, 16px) rotate(var(--stack-r)); }
.tarot-shuffle-stage.is-deal .tarot-animation-card.is-dealt { transform: translate(var(--deal-x), -52px) rotate(0deg); }
@keyframes tarot-shuffle-pulse { from { margin-top: -80px; } to { margin-top: -70px; } }
.tarot-number-draw { align-items: stretch; background: rgba(31,22,40,.66); border: 1px solid rgba(232,213,244,.14); border-radius: 20px; display: flex; flex-direction: column; margin: 30px auto; max-width: 650px; padding: 34px 24px; text-align: left; }
.tarot-number-draw label { display: flex; flex-direction: column; gap: 8px; margin-bottom: 18px; }
.tarot-ai-section { background: rgba(247,243,250,.96); border-radius: 20px; color: #2c2631; margin: 24px auto 0; max-width: 880px; padding: 22px; }
.tarot-ai-heading { align-items: flex-end; border-bottom: 1px solid rgba(67,53,75,.1); display: flex; justify-content: space-between; margin-bottom: 18px; padding-bottom: 13px; }
.tarot-ai-heading > span { align-items: center; display: flex; font-family: 'Noto Serif SC', serif; font-size: 18px; font-weight: 600; gap: 8px; }
.tarot-ai-heading small { color: #7d7184; font-size: 11px; }
.tarot-ai-loading { align-items: center; color: #75677d; display: flex; font-size: 13px; gap: 10px; padding: 18px 0; }
.tarot-ai-markdown { color: #39313e; font-size: 14px; line-height: 1.75; }
.spin { animation: tarot-spin 1s linear infinite; }
@keyframes tarot-spin { to { transform: rotate(360deg); } }

@media (max-width: 720px) {
  .tarot-shell { padding: 30px 14px 56px; }
  .tarot-heading { margin-bottom: 21px; }
  .tarot-heading h2 { font-size: 26px; }
  .tarot-setup { grid-template-columns: 1fr; padding: 15px; }
  .tarot-question-field textarea { min-height: 76px; }
  .tarot-mode-tabs { overflow-x: auto; }
  .tarot-result-section { margin-inline: -2px; padding: 14px 10px; }
  .tarot-stage-toolbar { align-items: flex-start; }
  .tarot-result-heading { align-items: flex-start; }
  .tarot-result-deck { justify-content: flex-start; }
  .tarot-result-item { flex-basis: 108px; }
  .tarot-face, .tarot-result-back { height: 164px; width: 100px; }
  .tarot-deck-scroll { padding-bottom: 38px; padding-top: 115px; }
  .tarot-card { flex-basis: 72px; height: 116px; margin-left: -32px; transform-origin: 50% 132%; }
  .tarot-card-inner { height: 116px; width: 72px; }
  .tarot-ai-section { padding: 18px 15px; }
  .tarot-ai-heading { align-items: flex-start; flex-direction: column; gap: 5px; }
  .tarot-auto-stage { min-height: 350px; }
  .tarot-shuffle-stage { height: 250px; }
  .tarot-animation-card { height: 126px; margin-left: -39px; margin-top: -63px; width: 78px; }
  .tarot-shuffle-stage.is-deal .tarot-animation-card.is-dealt { transform: translate(var(--deal-mobile-x), -42px) rotate(0deg); }
}

@media (prefers-reduced-motion: reduce) { .tarot-card { transition: none; } .spin { animation: none; } }
</style>
