<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Hash, Hand, RotateCcw, Sparkles } from 'lucide-vue-next';
import { buildDivinationPrompt } from 'mingyu-core/prompt/divination';
import { drawTarotSpread, getCardEvidence, tarotCards, tarotSpreads } from 'mingyu-core/divination/tarot';
import type { AiCustomConfig, AiPreferences } from '../lib/ai';
import type { TarotInterpretationPayload, TarotReadingResult, TarotSpreadType } from '../lib/tarot';
import { getShiyueTarotName, tarotCardBackUrl } from '../lib/tarotDeck';
import TarotSpreadBoard from './TarotSpreadBoard.vue';
import { UiButton, UiNotice, UiSectionHeading, UiToolPage, UiWorkspaceSurface } from './ui';

type DrawMode = 'manual' | 'number';
type SpreadType = TarotSpreadType;

const props = defineProps<{
  preferences?: AiPreferences;
  aiConfig?: AiCustomConfig;
  castingPreference?: 'auto' | 'manual';
  initialQuestion?: string;
  initialSpread?: TarotSpreadType;
  hideQuestionSetup?: boolean;
  hideSpreadSetup?: boolean;
}>();

const emit = defineEmits<{
  interpret: [payload: TarotInterpretationPayload];
  restart: [];
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
const question = ref(props.initialQuestion || '');
const spreadType = ref<SpreadType>(props.initialSpread || 'single');
const drawMode = ref<DrawMode | null>(props.castingPreference === 'manual' ? 'manual' : null);
const phase = ref<'setup' | 'shuffling' | 'drawing' | 'result'>('setup');
const numberInput = ref('');
const candidateCard = ref<number | null>(null);
const confirmedNumbers = ref<number[]>([]);
const shuffledCardIds = ref<number[]>([]);
const reversedPositions = ref<boolean[]>([]);
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
let fanFrame = 0;
let fanResizeObserver: ResizeObserver | null = null;
let deckPositioned = false;
let requestId = 0;

const selectedSpread = computed(() => spreadOptions.find((item) => item.value === spreadType.value) ?? spreadOptions[0]!);
const requiredCards = computed(() => selectedSpread.value.count);
const remainingCards = computed(() => Math.max(0, requiredCards.value - confirmedNumbers.value.length));
const canBegin = computed(() => Boolean(question.value.trim()) && !isDrawing.value);
const progressText = computed(() => confirmedNumbers.value.length
  ? `已确认 ${confirmedNumbers.value.length} 张，还需 ${remainingCards.value} 张`
  : `需要抽取 ${requiredCards.value} 张牌`);
const partialReading = computed<TarotReadingResult | null>(() => {
  if (!confirmedNumbers.value.length) return null;
  return {
    spreadType: spreadType.value,
    spreadName: tarotSpreads[spreadType.value].name,
    cards: confirmedNumbers.value.flatMap((number, index) => {
      const id = shuffledCardIds.value[number - 1];
      const card = tarotCards.find((item) => item.number === id);
      if (id === undefined || !card) return [];
      const evidence = getCardEvidence(card.name);
      return [{
        id,
        position: tarotSpreads[spreadType.value].positions[index] || `牌位 ${index + 1}`,
        name: getShiyueTarotName(id) || card.name,
        reversed: reversedPositions.value[number - 1] || false,
        keywords: evidence.keywords,
        element: evidence.element,
        archetype: evidence.archetype,
      }];
    }),
  };
});

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
  let centeredCard: number | null = null;
  let centeredDistance = Number.POSITIVE_INFINITY;
  cards.forEach((element, index) => {
    const cardCenter = element.offsetLeft + element.offsetWidth / 2;
    const cardNumber = index + 1;
    const distance = Math.abs(cardCenter - viewportCenter);
    if (!confirmedNumbers.value.includes(cardNumber) && distance < centeredDistance) {
      centeredCard = cardNumber;
      centeredDistance = distance;
    }
    const position = Math.max(-1.15, Math.min(1.15, (cardCenter - viewportCenter) / arcHalfWidth));
    const edgeProgress = Math.min(1, Math.abs(position));
    poses[cardNumber] = {
      angle: position * (desktop ? 34 : 22),
      lift: -(desktop ? 76 : 42) * (1 - edgeProgress * edgeProgress),
    };
  });
  fanPoses.value = poses;
  candidateCard.value = centeredCard;
}

function scheduleFanUpdate() {
  cancelAnimationFrame(fanFrame);
  fanFrame = requestAnimationFrame(updateFanLayout);
}

function cardStyle(card: number) {
  const isDragging = draggingCard.value === card;
  const isCandidate = candidateCard.value === card;
  const pose = fanPoses.value[card] || { angle: 0, lift: 0 };
  const interactionLift = isCandidate ? (scrollerIsDesktop() ? -48 : -36) : isDragging ? Math.min(0, dragOffset.value) : 0;
  return {
    '--card-angle': `${isCandidate ? 0 : pose.angle}deg`,
    '--card-lift': `${pose.lift + interactionLift}px`,
    '--card-seed': `${(card * 17) % 47}px`,
  };
}

function scrollerIsDesktop() {
  return (deckRef.value?.clientWidth || window.innerWidth) >= 720;
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
  if (event.detail === 0) activateCard(card);
}

function activateCard(card: number) {
  if (candidateCard.value === card) {
    void confirmCandidate();
    return;
  }
  setCandidate(card);
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
  const isTap = pointerMode.value === 'pending';
  const shouldDraw = pointerMode.value === 'vertical' && dragOffset.value <= -DRAW_THRESHOLD;
  pointerId.value = null;
  pointerMode.value = 'pending';
  draggingCard.value = null;
  dragOffset.value = 0;
  if (card === null) return;
  if (isTap) activateCard(card);
  else if (shouldDraw) setCandidate(card);
}

async function confirmCandidate() {
  if (candidateCard.value === null || isDrawing.value) return;
  const card = candidateCard.value;
  candidateCard.value = null;
  confirmedNumbers.value.push(card);
  if (confirmedNumbers.value.length >= requiredCards.value) {
    await resolveReading();
    return;
  }
  const nextCard = cardNumbers.find((number) => number > card && !confirmedNumbers.value.includes(number))
    ?? cardNumbers.find((number) => !confirmedNumbers.value.includes(number));
  if (nextCard) nextTick(() => setCandidate(nextCard));
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

function prepareDeck() {
  shuffledCardIds.value = secureShuffle();
  const random = new Uint32Array(TOTAL_CARDS);
  crypto.getRandomValues(random);
  reversedPositions.value = Array.from(random, value => (value & 1) === 0);
}

async function automaticDraw() {
  if (!validateQuestion()) return;
  phase.value = 'shuffling';
  if (!shuffledCardIds.value.length) prepareDeck();
  await new Promise(resolve => window.setTimeout(resolve, 1900));
  confirmedNumbers.value = cardNumbers.slice(0, requiredCards.value);
  await resolveReading();
  if (tarotReading.value) {
    phase.value = 'result';
    await nextTick();
  }
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
  prepareDeck();
  if (props.castingPreference === 'auto') {
    await automaticDraw();
    return;
  }
  if (drawMode.value === 'number') {
    await drawByNumbers();
    return;
  }
  await beginManualDraw();
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
  nextTick(() => document.querySelector<HTMLInputElement>('.tarot-setup-numbers input')?.focus());
}

function validateQuestion() {
  if (question.value.trim()) return true;
  flowError.value = '请先写下想问的问题。';
  return false;
}

async function resolveReading() {
  if (!validateQuestion() || confirmedNumbers.value.length !== requiredCards.value) return;
  const currentRequest = ++requestId;
  isDrawing.value = true;
  flowError.value = '';
  tarotReading.value = null;
  apiPrompt.value = '';
  try {
    if (!shuffledCardIds.value.length) prepareDeck();
    const manualCards = confirmedNumbers.value.map((number) => {
      const id = shuffledCardIds.value[number - 1];
      if (!id) throw new Error('抽取的牌位无效，请重新抽牌。');
      return { id, reversed: reversedPositions.value[number - 1] || false };
    });
    const coreResult = drawTarotSpread(spreadType.value, { manualCards });
    if (coreResult.cards.length !== requiredCards.value) throw new Error('塔罗排牌返回的数据不完整，请重新抽牌。');
    const result: TarotReadingResult = {
      deckType: 'tarot',
      deckName: '塔罗牌',
      spreadType: spreadType.value,
      spreadName: coreResult.spreadName,
      cards: coreResult.cards.map(card => ({ ...card, name: getShiyueTarotName(card.id) || card.name })),
      timestamp: coreResult.timestamp,
      meta: coreResult.meta,
      draw: coreResult.draw,
    };
    const prompt = buildDivinationPrompt({
      method: 'tarot',
      data: coreResult,
      question: question.value.trim(),
      isCustomQuestion: true,
    }).trim();
    if (!prompt) throw new Error('塔罗解读资料生成失败，请重新抽牌。');
    if (currentRequest !== requestId) return;
    tarotReading.value = result;
    apiPrompt.value = prompt;
    isDrawing.value = false;
  } catch (error) {
    if (currentRequest !== requestId) return;
    flowError.value = error instanceof Error ? error.message : '塔罗排牌暂时失败，请稍后重试。';
  } finally {
    if (currentRequest === requestId) isDrawing.value = false;
  }
}

async function retryReading() {
  await resolveReading();
  if (tarotReading.value && drawMode.value !== 'manual') phase.value = 'result';
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
  candidateCard.value = null;
  confirmedNumbers.value = [];
  shuffledCardIds.value = [];
  reversedPositions.value = [];
  tarotReading.value = null;
  apiPrompt.value = '';
  flowError.value = '';
  isDrawing.value = false;
  phase.value = 'setup';
  drawMode.value = props.castingPreference === 'manual' ? 'manual' : null;
  numberInput.value = '';
  deckRef.value?.scrollTo({ left: initialScrollLeft.value, behavior: 'smooth' });
}

function chooseSpread(value: string) {
  if (value === spreadType.value) return;
  spreadType.value = value as SpreadType;
}

watch(spreadType, resetReading);

onMounted(() => {
  nextTick(updateFanLayout);
  fanResizeObserver = new ResizeObserver(scheduleFanUpdate);
  if (deckRef.value) fanResizeObserver.observe(deckRef.value);
});

onBeforeUnmount(() => {
  requestId += 1;
  cancelAnimationFrame(fanFrame);
  fanResizeObserver?.disconnect();
});
</script>

<template>
  <UiToolPage width="wide" class="screen tarot-screen" :class="{ 'is-drawing': phase === 'drawing' }">
    <UiWorkspaceSurface as="article" class="tarot-workspace" :class="{ 'is-drawing': phase === 'drawing' }" padding="standard">
      <UiSectionHeading
        v-if="phase !== 'drawing'"
        eyebrow="塔罗牌"
        :title="phase === 'setup' ? '静心想好你的问题' : phase === 'shuffling' ? '正在洗牌' : '你的牌阵'"
      />

      <template v-if="phase === 'setup'">
        <section v-if="!hideQuestionSetup || !hideSpreadSetup" class="tarot-setup" aria-label="塔罗抽牌设置">
          <label v-if="!hideQuestionSetup" class="tarot-question-field">
            <span>想问的问题</span>
            <textarea v-model="question" maxlength="5000" rows="3" placeholder="写下你现在最想厘清的问题" @input="flowError = ''"></textarea>
          </label>
          <label v-if="!hideSpreadSetup" class="tarot-spread-field">
            <span>选择牌阵</span>
            <select :value="spreadType" @change="chooseSpread(($event.target as HTMLSelectElement).value)">
              <option v-for="item in spreadOptions" :key="item.value" :value="item.value">{{ item.label }} · {{ item.count }} 张</option>
            </select>
            <small>{{ selectedSpread.description }}</small>
          </label>
        </section>

        <section v-if="castingPreference !== 'auto'" class="tarot-setup-methods" aria-label="选择抽牌方式">
          <button type="button" class="tarot-setup-method" :class="{ active: drawMode === 'manual' }" @click="drawMode = 'manual'; flowError = ''">
            <Hand :size="18" /><span><strong>手动抽牌</strong><small>凭直觉逐张选择</small></span>
          </button>
          <button type="button" class="tarot-setup-method" :class="{ active: drawMode === 'number' }" @click="chooseNumberDraw">
            <Hash :size="18" /><span><strong>指定数字</strong><small>输入 {{ requiredCards }} 个数字</small></span>
          </button>
        </section>

        <div v-if="castingPreference !== 'auto' && drawMode === 'number'" class="tarot-setup-numbers">
          <input v-model="numberInput" inputmode="numeric" autocomplete="off" :aria-label="`指定 ${requiredCards} 个数字`" :placeholder="requiredCards === 1 ? '输入 1 到 78 的数字' : `用逗号分隔 ${requiredCards} 个数字`" @input="flowError = ''" />
          <small>范围 1–78，数字不可重复</small>
        </div>

        <UiNotice v-if="flowError" class="tarot-notice" tone="error" compact>{{ flowError }}</UiNotice>
        <div class="tarot-setup-action">
          <UiButton size="large" :loading="isDrawing" :disabled="!canBegin || (castingPreference !== 'auto' && drawMode === 'number' && !numberInput.trim())" @click="beginDraw"><Sparkles v-if="!isDrawing" :size="16" />{{ isDrawing ? '正在排牌…' : castingPreference === 'auto' ? '开始抽牌' : drawMode === 'number' ? '确认数字并抽牌' : '进入手动抽牌' }}</UiButton>
        </div>
      </template>

      <template v-else-if="phase === 'shuffling'">
        <section class="tarot-shuffle-stage" aria-live="polite">
          <div class="tarot-shuffle-deck" aria-hidden="true">
            <img v-for="card in 7" :key="card" :src="tarotCardBackUrl" alt="" />
          </div>
          <strong>静心片刻</strong><small>牌组正在洗牌，并将按牌阵依次发出</small>
        </section>
      </template>

      <template v-else-if="phase === 'drawing'">
        <div class="tarot-stage-toolbar">
          <div><strong>{{ selectedSpread.label }}</strong><small>{{ question }}</small><span>{{ progressText }}</span></div>
          <UiButton variant="ghost" size="small" @click="emit('restart')"><RotateCcw :size="14" />重新开始</UiButton>
        </div>

        <section class="tarot-draw-workspace">
          <div class="tarot-live-stage">
            <TarotSpreadBoard v-if="partialReading" class="tarot-live-spread" :reading="partialReading" compact immersive />
          </div>
          <div v-if="!tarotReading" class="tarot-draw-controls">
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
                    :aria-label="candidateCard === card ? `确认牌组中的第 ${card} 张牌` : `抽出牌组中的第 ${card} 张牌`"
                    :aria-pressed="candidateCard === card"
                    @click="handleCardClick($event, card)"
                    @pointerdown="handlePointerDown($event, card)"
                    @pointermove="handlePointerMove"
                    @pointerup="finishPointer"
                    @pointercancel="finishPointer"
                  >
                    <span class="tarot-card-inner" aria-hidden="true"><img :src="tarotCardBackUrl" alt="" draggable="false" /></span>
                  </button>
                </div>
              </div>
              <div class="tarot-candidate-panel" aria-live="polite">
                <span v-if="candidateCard !== null" :aria-label="`已抽出牌组中的第 ${candidateCard} 张，再次点击这张牌确认`">{{ candidateCard }}</span>
              </div>
            </div>
          </div>
          <div v-else class="tarot-draw-complete-action">
            <UiButton size="large" @click="startInterpretation"><Sparkles :size="16" />开始解读</UiButton>
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
            <UiButton variant="ghost" size="small" @click="emit('restart')"><RotateCcw :size="14" />重新开始</UiButton>
          </div>
          <TarotSpreadBoard :reading="tarotReading" animated />
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
.tarot-screen.is-drawing { height: calc(100dvh - var(--ds-topbar-height) - 2px); margin: calc(0px - var(--ds-space-7)) calc(0px - var(--ds-page-gutter)) calc(0px - var(--ds-space-8)); max-width: none; overflow: hidden; padding: var(--ds-space-7) 0 0; width: calc(100% + var(--ds-page-gutter) + var(--ds-page-gutter)); }
.tarot-workspace { min-width: 0; }
.tarot-workspace.is-drawing { background: transparent; border: 0; border-radius: 0; box-shadow: none; display: flex; flex-direction: column; height: 100%; margin: 0; max-width: none; min-height: 0; overflow: hidden; padding-bottom: 0; width: 100%; }
.tarot-workspace > :first-child { margin-bottom: var(--ds-space-6); }
.tarot-workspace.is-drawing > .tarot-stage-toolbar { background: transparent; margin: 0 var(--ds-page-gutter); max-width: none; padding: 0; width: calc(100% - var(--ds-page-gutter) - var(--ds-page-gutter)); }
.tarot-setup { display: grid; gap: var(--ds-space-5); grid-template-columns: minmax(0, 1fr) 280px; margin: 0 auto var(--ds-space-4); max-width: 880px; }
.tarot-setup:has(.tarot-spread-field:only-child) { grid-template-columns: minmax(0, 560px); justify-content: center; }
.tarot-setup label { display: flex; flex-direction: column; gap: 8px; }
.tarot-setup label > span { color: var(--ds-text-secondary); font-size: var(--ds-text-sm); font-weight: 550; }
.tarot-setup textarea, .tarot-setup select, .tarot-setup-numbers input { background: var(--ds-surface-muted); border: 1px solid var(--ds-line); border-radius: var(--ds-radius-sm); color: var(--ds-text-primary); font: inherit; outline: none; transition: background-color .18s ease, border-color .18s ease, box-shadow .18s ease; width: 100%; }
.tarot-setup textarea { min-height: 84px; padding: 12px 13px; resize: vertical; }
.tarot-setup select, .tarot-setup-numbers input { height: 44px; padding: 0 12px; }
.tarot-setup textarea:focus, .tarot-setup select:focus, .tarot-setup-numbers input:focus { background: var(--ds-surface-raised); border-color: var(--ds-accent); box-shadow: var(--ds-focus-ring); }
.tarot-setup textarea:disabled, .tarot-setup select:disabled { opacity: .66; }
.tarot-setup small, .tarot-setup-numbers small { color: var(--ds-text-tertiary); font-size: var(--ds-text-xs); }
.tarot-setup-methods { display: grid; gap: var(--ds-space-3); grid-template-columns: repeat(2, minmax(0, 1fr)); margin: 0 auto; max-width: 560px; width: 100%; }
.tarot-setup-method { align-items: center; background: var(--ds-surface-muted); border: 1px solid var(--ds-line); border-radius: var(--ds-radius-md); color: var(--ds-text-primary); cursor: pointer; display: flex; gap: 12px; min-height: 70px; padding: 12px 14px; text-align: left; transition: background-color .18s, border-color .18s, box-shadow .18s; }
.tarot-setup-method > svg { color: var(--ds-text-tertiary); flex: 0 0 auto; }
.tarot-setup-method > span { display: grid; gap: 3px; min-width: 0; }
.tarot-setup-method strong { font-size: var(--ds-text-sm); font-weight: 600; }
.tarot-setup-method small { color: var(--ds-text-tertiary); font-size: var(--ds-text-xs); }
.tarot-setup-method:hover, .tarot-setup-method.active { background: var(--ds-surface-raised); border-color: var(--ds-accent); }
.tarot-setup-method.active { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ds-accent) 38%, transparent); }
.tarot-setup-method.active > svg { color: var(--ds-accent-strong); }
.tarot-setup-method:focus-visible { box-shadow: var(--ds-focus-ring); outline: none; }
.tarot-setup-numbers { display: grid; gap: 6px; margin: var(--ds-space-3) auto 0; max-width: 560px; width: 100%; }
.tarot-setup-action { display: flex; justify-content: center; margin-top: var(--ds-space-4); }
.tarot-stage-toolbar { align-items: center; background: var(--ds-surface-muted); border-radius: var(--ds-radius-md); display: flex; justify-content: space-between; margin: 0 auto var(--ds-space-4); max-width: 900px; padding: var(--ds-space-3) var(--ds-space-4); }
.tarot-stage-toolbar > div { display: grid; gap: 4px; min-width: 0; }
.tarot-stage-toolbar strong { color: var(--ds-text-primary); font-size: var(--ds-text-sm); }
.tarot-stage-toolbar small { color: var(--ds-text-tertiary); font-size: var(--ds-text-xs); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tarot-stage-toolbar span { color: var(--ds-text-tertiary); font-size: var(--ds-text-xs); opacity: .55; }
.tarot-result-section { margin: 0 auto; max-width: 1080px; }
.tarot-result-heading { align-items: center; display: flex; justify-content: space-between; margin-bottom: 18px; }
.tarot-result-heading > div { display: grid; gap: 4px; }
.tarot-result-heading small { color: var(--ds-text-tertiary); font-size: var(--ds-text-xs); letter-spacing: .08em; }
.tarot-result-heading strong { color: var(--ds-text-primary); font-size: var(--ds-heading-sm); font-weight: 650; }
.tarot-result-heading p { color: var(--ds-text-secondary); font-size: var(--ds-text-sm); line-height: 1.5; margin: 3px 0 0; max-width: 720px; }
.tarot-result-action { display: flex; justify-content: center; padding: 18px 0 4px; }
.tarot-notice { margin: 14px auto; max-width: 880px; }
.tarot-shuffle-stage { align-items: center; display: flex; flex-direction: column; justify-content: center; min-height: min(520px, 58dvh); text-align: center; }
.tarot-shuffle-stage > strong { color: var(--ds-text-primary); font-size: var(--ds-heading-sm); margin-top: 22px; }
.tarot-shuffle-stage > small { color: var(--ds-text-tertiary); font-size: var(--ds-text-xs); margin-top: 6px; }
.tarot-shuffle-deck { height: 230px; position: relative; width: 150px; }
.tarot-shuffle-deck img { border-radius: 9px; box-shadow: 0 12px 26px rgba(41,33,52,.2); height: 230px; left: 0; object-fit: cover; position: absolute; top: 0; width: 150px; }
.tarot-shuffle-deck img:nth-child(1) { animation: shuffle-left 1.8s ease-in-out both; }
.tarot-shuffle-deck img:nth-child(2) { animation: shuffle-right 1.8s .08s ease-in-out both; }
.tarot-shuffle-deck img:nth-child(3) { animation: shuffle-left 1.8s .16s ease-in-out both; }
.tarot-shuffle-deck img:nth-child(4) { animation: shuffle-right 1.8s .24s ease-in-out both; }
.tarot-shuffle-deck img:nth-child(5) { transform: translate(2px,-2px); }
.tarot-shuffle-deck img:nth-child(6) { transform: translate(1px,-1px); }
@keyframes shuffle-left { 0%,100% { transform: translate(0,0) rotate(0); } 26% { transform: translate(-72px,-8px) rotate(-8deg); } 50% { transform: translate(12px,-3px) rotate(2deg); } 70% { transform: translate(-54px,-6px) rotate(-6deg); } }
@keyframes shuffle-right { 0%,100% { transform: translate(0,0) rotate(0); } 26% { transform: translate(72px,-8px) rotate(8deg); } 50% { transform: translate(-12px,-3px) rotate(-2deg); } 70% { transform: translate(54px,-6px) rotate(6deg); } }
.tarot-draw-workspace { display: grid; flex: 1; grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) auto; margin: 8px auto 0; min-height: 0; min-width: 0; width: 100%; }
.tarot-live-stage { min-height: 0; overflow: hidden; }
.tarot-live-spread { height: 100%; }
.tarot-draw-controls { left: 50%; min-height: 0; min-width: 0; position: relative; transform: translateX(-50%); width: calc(100% + var(--ds-page-gutter) + var(--ds-page-gutter)); }
.tarot-draw-complete-action { display: flex; flex: 0 0 auto; justify-content: center; padding: var(--ds-space-4) 0 0; }
.tarot-deck-region { height: 322px; margin: 0; min-width: 0; overflow: hidden; position: relative; width: 100%; }
.tarot-deck-scroll { cursor: grab; height: 322px; min-width: 0; overflow-x: auto; overflow-y: hidden; padding: 132px 0 0; scrollbar-width: none; touch-action: pan-x; }
.tarot-deck-scroll::-webkit-scrollbar { display: none; }
.tarot-deck { --fan-edge-space: 44px; display: flex; min-width: max-content; }
.tarot-deck::before, .tarot-deck::after { content: ''; flex: 0 0 var(--fan-edge-space); }
.tarot-card { --card-angle: 0deg; --card-lift: 0px; background: transparent; border: 0; cursor: grab; flex: 0 0 110px; height: 178px; margin-left: -54px; padding: 0; position: relative; transform: translateY(var(--card-lift)) rotate(var(--card-angle)); transform-origin: 50% 142%; transition: transform .16s ease-out, filter .2s, opacity .2s; user-select: none; z-index: 1; }
.tarot-card:first-child { margin-left: 0; }
.tarot-card:hover { filter: brightness(1.04); }
.tarot-card.is-dragging { cursor: grabbing; transition: none; z-index: 90; }
.tarot-card.is-candidate { cursor: pointer; filter: brightness(1.01); z-index: 100; }
.tarot-card.is-confirmed { opacity: .2; }
.tarot-card:focus-visible { outline: none; z-index: 101; }
.tarot-card:focus-visible .tarot-card-inner { box-shadow: var(--ds-focus-ring), 0 12px 28px rgba(41,33,52,.24); }
.tarot-card-inner { border-radius: 8px; box-shadow: 0 8px 20px rgba(41,33,52,.2); display: block; height: 178px; overflow: hidden; position: relative; width: 110px; }
.tarot-card-inner img { display: block; height: 100%; object-fit: cover; pointer-events: none; user-select: none; width: 100%; }
.tarot-candidate-panel { bottom: 12px; display: flex; justify-content: center; left: 50%; pointer-events: none; position: absolute; text-align: center; transform: translateX(-50%); z-index: 110; }
.tarot-candidate-panel > span { align-items: center; background: var(--ds-accent-soft); border-radius: var(--ds-radius-round); color: var(--ds-accent-strong); display: inline-flex; font-size: 10px; font-weight: 650; height: 18px; justify-content: center; min-width: 18px; padding: 0 4px; }
@media (max-width: 720px) {
  .tarot-screen.is-drawing { height: calc(100dvh - var(--ds-topbar-height) - 2px); margin: calc(0px - var(--ds-space-3)) calc(0px - var(--ds-page-gutter)) calc(0px - var(--ds-space-7) - env(safe-area-inset-bottom)); overflow: hidden; padding: var(--ds-space-3) 0 0; width: calc(100% + var(--ds-page-gutter) + var(--ds-page-gutter)); }
  .tarot-workspace.is-drawing { border-radius: 0; height: 100%; margin: 0; min-height: 0; overflow: hidden; padding-bottom: 0; }
  .tarot-workspace > :first-child { margin-bottom: var(--ds-space-5); }
  .tarot-setup { grid-template-columns: 1fr; }
  .tarot-question-field textarea { min-height: 76px; }
  .tarot-setup-method { min-height: 64px; padding: 10px 11px; }
  .tarot-setup-method { gap: 9px; }
  .tarot-setup-action { margin-top: var(--ds-space-3); }
  .tarot-stage-toolbar, .tarot-result-heading { align-items: flex-start; gap: var(--ds-space-3); }
  .tarot-stage-toolbar small { max-width: 210px; }
  .tarot-result-heading p { max-width: 230px; }
  .tarot-draw-workspace { margin-top: 0; overflow: hidden; }
  .tarot-live-stage { overflow: hidden; }
  .tarot-draw-controls { width: calc(100vw + 48px); }
  .tarot-deck-region { height: 206px; }
  .tarot-deck-scroll { height: 206px; padding-bottom: 0; padding-top: 90px; }
  .tarot-card { flex-basis: 78px; height: 126px; margin-left: -36px; transform-origin: 50% 116%; }
  .tarot-card-inner { height: 126px; width: 78px; }
  .tarot-candidate-panel { bottom: max(10px, env(safe-area-inset-bottom)); }
}

@media (prefers-reduced-motion: reduce) { .tarot-card, .tarot-setup-method { transition: none; } .tarot-shuffle-deck img { animation: none !important; } }
</style>
