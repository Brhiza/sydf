<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { Hash, Hand, RotateCcw, Sparkles } from 'lucide-vue-next';
import { buildDivinationPrompt } from 'mingyu-core/prompt/divination';
import { drawLenormandSpread } from 'mingyu-core/divination/lenormand';
import type { AiCustomConfig, AiPreferences } from '../lib/ai';
import type { WesternCardReadingResult, WesternDeckType, WesternInterpretationPayload, WesternSpreadType } from '../lib/tarot';
import { getWesternDeck, getWesternSpreadOptions } from '../lib/westernDecks';
import { tarotCardBackUrl } from '../lib/tarotDeck';
import WesternCardBoard from './WesternCardBoard.vue';
import { UiButton, UiNotice, UiToolPage, UiWorkspaceSurface } from './ui';

const props = defineProps<{
  deckType: Exclude<WesternDeckType, 'tarot'>;
  initialSpread: WesternSpreadType;
  initialQuestion: string;
  castingPreference?: 'auto' | 'manual';
  preferences?: AiPreferences;
  aiConfig?: AiCustomConfig;
}>();
const emit = defineEmits<{ interpret: [payload: WesternInterpretationPayload]; restart: [] }>();

type DrawMode = 'manual' | 'number';
const phase = ref<'setup' | 'shuffling' | 'drawing' | 'result'>('setup');
const drawMode = ref<DrawMode>(props.castingPreference === 'manual' ? 'manual' : 'manual');
const numberInput = ref('');
const errorMessage = ref('');
const selectedSlots = ref<number[]>([]);
const shuffledIds = ref<number[]>([]);
const candidateSlot = ref(1);
const reading = ref<WesternCardReadingResult | null>(null);
const prompt = ref('');
const deckScroller = ref<HTMLElement | null>(null);
const deckTrack = ref<HTMLElement | null>(null);
const fanPoses = ref<Record<number, { angle: number; lift: number }>>({});
let fanFrame = 0;
let resizeObserver: ResizeObserver | null = null;
let deckPositioned = false;

const deckName = computed(() => props.deckType === 'lenormand' ? '雷诺曼' : '时月神谕');
const deck = computed(() => getWesternDeck(props.deckType));
const spread = computed(() => getWesternSpreadOptions(props.deckType).find(item => item.value === props.initialSpread) || getWesternSpreadOptions(props.deckType)[0]!);
const remaining = computed(() => spread.value.count - selectedSlots.value.length);
const progressText = computed(() => remaining.value <= 0
  ? `已完成 ${selectedSlots.value.length} 张`
  : selectedSlots.value.length
    ? `已确认 ${selectedSlots.value.length} 张，还需 ${remaining.value} 张`
    : `需要抽取 ${spread.value.count} 张牌`);
const slots = computed(() => Array.from({ length: deck.value.length }, (_, index) => index + 1));
const previewReading = computed<WesternCardReadingResult | null>(() => {
  if (!selectedSlots.value.length) return null;
  const cards = selectedSlots.value.flatMap((slot, index) => {
    const id = shuffledIds.value[slot - 1];
    const card = deck.value.find(item => item.id === id);
    return card ? [{ ...card, position: spread.value.positions[index]! }] : [];
  });
  return { deckType: props.deckType, deckName: deckName.value as WesternCardReadingResult['deckName'], spreadType: spread.value.value, spreadName: spread.value.label, cards };
});

function secureShuffle() {
  const values = deck.value.map(card => card.id);
  for (let index = values.length - 1; index > 0; index -= 1) {
    const random = new Uint32Array(1); crypto.getRandomValues(random);
    const target = random[0]! % (index + 1);
    [values[index], values[target]] = [values[target]!, values[index]!];
  }
  shuffledIds.value = values;
}

function beginManual() {
  secureShuffle(); selectedSlots.value = []; candidateSlot.value = 1; errorMessage.value = ''; phase.value = 'drawing'; deckPositioned = false;
  nextTick(() => { updateFanLayout(); if (deckScroller.value) resizeObserver?.observe(deckScroller.value); });
}

function centerSlot(slot: number, behavior: ScrollBehavior = 'smooth') {
  const element = deckScroller.value?.querySelector<HTMLElement>(`[data-slot="${slot}"]`);
  const scroller = deckScroller.value;
  if (element && scroller) scroller.scrollTo({ left: element.offsetLeft + element.offsetWidth / 2 - scroller.clientWidth / 2, behavior });
}

function updateFanLayout() {
  const scroller = deckScroller.value;
  const track = deckTrack.value;
  if (!scroller || !track) return;
  const cards = Array.from(track.querySelectorAll<HTMLElement>('[data-slot]'));
  if (!cards.length) return;
  const cardWidth = cards[0]!.offsetWidth;
  track.style.setProperty('--fan-edge-space', `${Math.max(28, (scroller.clientWidth - cardWidth) / 2)}px`);
  if (!deckPositioned) {
    scroller.scrollLeft = 0;
    deckPositioned = true;
  }
  const viewportCenter = scroller.scrollLeft + scroller.clientWidth / 2;
  const desktop = scroller.clientWidth >= 720;
  const arcHalfWidth = Math.max(desktop ? 280 : 155, scroller.clientWidth * .48);
  let best = candidateSlot.value; let distance = Infinity;
  const poses: Record<number, { angle: number; lift: number }> = {};
  cards.forEach((element) => {
    const cardCenter = element.offsetLeft + element.offsetWidth / 2;
    const current = Math.abs(cardCenter - viewportCenter);
    const slot = Number(element.dataset.slot);
    if (!selectedSlots.value.includes(slot) && current < distance) { best = slot; distance = current; }
    const position = Math.max(-1.15, Math.min(1.15, (cardCenter - viewportCenter) / arcHalfWidth));
    const edgeProgress = Math.min(1, Math.abs(position));
    poses[slot] = { angle: position * (desktop ? 34 : 22), lift: -(desktop ? 76 : 42) * (1 - edgeProgress * edgeProgress) };
  });
  fanPoses.value = poses;
  candidateSlot.value = best;
}

function scheduleFanUpdate() {
  cancelAnimationFrame(fanFrame);
  fanFrame = requestAnimationFrame(updateFanLayout);
}

function cardStyle(slot: number) {
  const pose = fanPoses.value[slot] || { angle: 0, lift: 0 };
  const candidateLift = candidateSlot.value === slot ? (window.innerWidth >= 720 ? -48 : -36) : 0;
  return { '--card-angle': `${candidateSlot.value === slot ? 0 : pose.angle}deg`, '--card-lift': `${pose.lift + candidateLift}px` };
}

function activateSlot(slot: number) {
  if (selectedSlots.value.includes(slot)) return;
  if (candidateSlot.value === slot) { void confirmCandidate(); return; }
  candidateSlot.value = slot;
  centerSlot(slot);
}

async function confirmCandidate() {
  if (selectedSlots.value.includes(candidateSlot.value)) return;
  selectedSlots.value.push(candidateSlot.value);
  if (remaining.value <= 0) { await resolveReading(); return; }
  const next = slots.value.find(slot => slot > candidateSlot.value && !selectedSlots.value.includes(slot)) || slots.value.find(slot => !selectedSlots.value.includes(slot));
  if (next) { candidateSlot.value = next; centerSlot(next); }
}

function parseNumbers() {
  const values = numberInput.value.trim().split(/[\s,，、]+/).filter(Boolean).map(Number);
  if (values.length !== spread.value.count) throw new Error(`请输入 ${spread.value.count} 个数字。`);
  if (values.some(value => !Number.isInteger(value) || value < 1 || value > deck.value.length)) throw new Error(`数字需为 1 到 ${deck.value.length} 的整数。`);
  if (new Set(values).size !== values.length) throw new Error('每个数字只能使用一次。');
  return values;
}

async function drawByNumbers() {
  try { secureShuffle(); selectedSlots.value = parseNumbers(); await resolveReading(); }
  catch (error) { errorMessage.value = error instanceof Error ? error.message : '指定数字无法识别。'; }
}

async function automaticDraw() {
  secureShuffle(); phase.value = 'shuffling';
  await new Promise(resolve => window.setTimeout(resolve, 1800));
  selectedSlots.value = slots.value.slice(0, spread.value.count);
  await resolveReading(true);
}

async function begin() {
  if (props.castingPreference === 'auto') { await automaticDraw(); return; }
  if (drawMode.value === 'number') { await drawByNumbers(); return; }
  beginManual();
}

async function resolveReading(animated = false) {
  try {
    const ids = selectedSlots.value.map(slot => shuffledIds.value[slot - 1]!).filter(Boolean);
    if (ids.length !== spread.value.count) throw new Error('抽取的牌面不完整，请重新抽牌。');
    if (props.deckType === 'lenormand') {
      const result = drawLenormandSpread(props.initialSpread as Parameters<typeof drawLenormandSpread>[0], { manualCardIds: ids });
      reading.value = { deckType: 'lenormand', deckName: '雷诺曼', spreadType: result.spreadType, spreadName: result.spreadName,
        cards: result.cards.map(card => ({ ...card, reversed: false, imageUrl: deck.value.find(item => item.id === card.id)?.imageUrl || '' })), timestamp: result.timestamp, meta: result.meta, draw: result.draw };
      prompt.value = buildDivinationPrompt({ method: 'lenormand', data: result, question: props.initialQuestion, isCustomQuestion: true }).trim();
    } else {
      const cards = ids.map((id, index) => ({ ...deck.value.find(card => card.id === id)!, position: spread.value.positions[index]! }));
      reading.value = { deckType: 'shiyue-oracle', deckName: '时月神谕', spreadType: spread.value.value, spreadName: spread.value.label, cards, timestamp: Date.now(),
        draw: { deckSize: deck.value.length, method: '用户逐张确认牌面', order: cards.map((card, index) => ({ index: index + 1, position: card.position, cardId: card.id, cardName: card.name })) } };
      prompt.value = ['请解读一次时月六十甲子神谕牌阵。', `用户问题：${props.initialQuestion}`, `牌阵：${spread.value.label}`,
        ...cards.map(card => `${card.position}：第${card.id}张，${card.name}，纳音${card.subtitle}。`),
        '请只以牌面名称、六十甲子、纳音与牌位为依据，先直接回答，再解释象意、牌位间的联系、现实提醒和可执行建议；不要虚构固定签文或吉凶等级。'].join('\n');
    }
    if (animated || drawMode.value === 'number') phase.value = 'result';
    if (animated) await nextTick();
  } catch (error) { errorMessage.value = error instanceof Error ? error.message : '排牌失败，请重试。'; }
}

function startInterpretation() {
  if (!reading.value || !prompt.value) return;
  const summary = `${reading.value.spreadName}：${reading.value.cards.map(card => `${card.position} ${card.name}`).join('；')}`;
  emit('interpret', { question: props.initialQuestion, reading: reading.value, request: { mode: 'divination', question: props.initialQuestion, method: deckName.value,
    reading: { summary, data: reading.value, prompt: prompt.value }, preferences: props.preferences, aiConfig: props.aiConfig } });
}

onMounted(() => {
  resizeObserver = new ResizeObserver(scheduleFanUpdate);
  if (deckScroller.value) resizeObserver.observe(deckScroller.value);
  if (props.castingPreference === 'auto') automaticDraw();
});
onBeforeUnmount(() => { cancelAnimationFrame(fanFrame); resizeObserver?.disconnect(); });
</script>

<template>
  <UiToolPage width="wide" class="western-draw-page" :class="{ 'is-drawing': phase === 'drawing' }">
    <UiWorkspaceSurface class="western-draw-surface" :class="{ 'is-drawing': phase === 'drawing' }" padding="standard">
      <header v-if="phase === 'drawing'" class="western-draw-head"><div><strong>{{ deckName }} · {{ spread.label }}</strong><small>{{ initialQuestion }}</small><span>{{ progressText }}</span></div><UiButton variant="ghost" size="small" @click="emit('restart')"><RotateCcw :size="14" />重新开始</UiButton></header>
      <header v-else class="western-section-head"><span>{{ deckName }}</span><h2>{{ phase === 'setup' ? '选择抽牌方式' : phase === 'shuffling' ? '正在洗牌' : '你的牌阵' }}</h2></header>

      <section v-if="phase === 'setup'" class="western-methods">
        <button type="button" :class="{ active: drawMode === 'manual' }" @click="drawMode = 'manual'; errorMessage = ''"><Hand :size="18" /><span><strong>手动抽牌</strong><small>展开牌组，逐张选择</small></span></button>
        <button type="button" :class="{ active: drawMode === 'number' }" @click="drawMode = 'number'; errorMessage = ''"><Hash :size="18" /><span><strong>指定数字</strong><small>从 1–{{ deck.length }} 中输入 {{ spread.count }} 个数字</small></span></button>
        <input v-if="drawMode === 'number'" v-model="numberInput" :placeholder="`输入 ${spread.count} 个不重复数字`" @input="errorMessage = ''" />
        <UiNotice v-if="errorMessage" tone="error" compact>{{ errorMessage }}</UiNotice>
        <UiButton size="large" @click="begin"><Sparkles :size="16" />{{ drawMode === 'number' ? '确认数字并抽牌' : '进入手动抽牌' }}</UiButton>
      </section>

      <section v-else-if="phase === 'shuffling'" class="western-shuffling"><div><img v-for="item in 7" :key="item" :src="tarotCardBackUrl" alt="" /></div><strong>静心片刻</strong><small>牌组正在洗牌，并将按牌阵依次发出</small></section>

      <template v-else-if="phase === 'drawing'">
        <section class="western-draw-workspace">
          <div class="western-live-board"><WesternCardBoard v-if="previewReading" :reading="previewReading" compact /></div>
          <div v-if="!reading" class="western-draw-controls">
            <div class="western-fan-wrap">
              <div ref="deckScroller" class="western-fan" role="group" :aria-label="`${deckName}扇形牌阵，可左右滑动`" @scroll.passive="scheduleFanUpdate">
                <div ref="deckTrack" class="western-fan-track">
                  <button v-for="slot in slots" :key="slot" type="button" :data-slot="slot" :class="{ candidate: candidateSlot === slot, selected: selectedSlots.includes(slot) }" :style="cardStyle(slot)" :disabled="selectedSlots.includes(slot)" @click="activateSlot(slot)"><span><img :src="tarotCardBackUrl" alt="" draggable="false" /></span></button>
                </div>
              </div>
              <div class="western-candidate-number"><span>{{ candidateSlot }}</span></div>
            </div>
          </div>
          <div v-else class="western-draw-complete"><UiButton size="large" :disabled="!prompt" @click="startInterpretation"><Sparkles :size="16" />开始解读</UiButton></div>
        </section>
        <UiNotice v-if="errorMessage" tone="error" compact>{{ errorMessage }}</UiNotice>
      </template>

      <template v-else-if="reading">
        <WesternCardBoard :reading="reading" />
        <UiNotice v-if="errorMessage" tone="error" compact>{{ errorMessage }}</UiNotice>
        <div class="western-result-action"><UiButton size="large" :disabled="!prompt" @click="startInterpretation"><Sparkles :size="16" />开始解读</UiButton></div>
      </template>
    </UiWorkspaceSurface>
  </UiToolPage>
</template>

<style scoped>
.western-draw-page { min-height: calc(100dvh - 170px); min-width: 0; }
.western-draw-page.is-drawing { height: calc(100dvh - var(--ds-topbar-height) - 2px); margin: calc(0px - var(--ds-space-7)) calc(0px - var(--ds-page-gutter)) calc(0px - var(--ds-space-8)); max-width: none; overflow: hidden; padding: var(--ds-space-7) 0 0; width: calc(100% + var(--ds-page-gutter) + var(--ds-page-gutter)); }
.western-draw-surface { min-height: min(760px, calc(100dvh - 190px)); overflow: hidden; }
.western-draw-surface.is-drawing { background: transparent; border: 0; border-radius: 0; box-shadow: none; display: flex; flex-direction: column; height: 100%; margin: 0; max-width: none; min-height: 0; overflow: hidden; padding-bottom: 0; width: 100%; }
.western-section-head { margin-bottom: var(--ds-space-6); text-align: center; }
.western-section-head span { color: var(--ds-accent); font-size: var(--ds-text-xs); letter-spacing: .12em; }
.western-section-head h2 { color: var(--ds-text-primary); font-size: var(--ds-heading-sm); margin: 7px 0 0; }
.western-draw-head { align-items: center; display: flex; gap: 16px; justify-content: space-between; margin: 0 var(--ds-page-gutter); width: calc(100% - var(--ds-page-gutter) - var(--ds-page-gutter)); }
.western-draw-head > div { display: grid; gap: 4px; min-width: 0; }
.western-draw-head strong { color: var(--ds-text-primary); font-size: var(--ds-text-sm); }
.western-draw-head small { color: var(--ds-text-tertiary); font-size: var(--ds-text-xs); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.western-draw-head span { color: var(--ds-text-tertiary); font-size: var(--ds-text-xs); opacity: .55; }
.western-methods { display: grid; gap: 10px; margin: clamp(36px, 10vh, 100px) auto 0; max-width: 560px; }
.western-methods > button:not(.ui-button) { align-items: center; background: var(--ds-surface-muted); border: 1px solid var(--ds-line); border-radius: var(--ds-radius-md); color: var(--ds-text-secondary); cursor: pointer; display: flex; gap: 12px; min-height: 70px; padding: 12px 14px; text-align: left; }
.western-methods > button.active { background: var(--ds-accent-soft); border-color: color-mix(in srgb,var(--ds-accent) 45%,var(--ds-line)); color: var(--ds-accent-strong); }
.western-methods button span { display: grid; gap: 2px; }.western-methods button small { color: var(--ds-text-tertiary); }
.western-methods input { background: var(--ds-surface-raised); border: 1px solid var(--ds-line); border-radius: var(--ds-radius-sm); color: var(--ds-text-primary); font: inherit; height: 44px; padding: 0 12px; }
.western-shuffling { align-items: center; display: flex; flex-direction: column; justify-content: center; min-height: min(520px,58dvh); }.western-shuffling > div { height: 230px; position: relative; width: 150px; }.western-shuffling img { animation: western-shuffle 1.7s ease-in-out both; border-radius: 9px; box-shadow: 0 12px 26px rgba(41,33,52,.2); height: 230px; left: 0; object-fit: cover; position: absolute; width: 150px; }.western-shuffling img:nth-child(even) { animation-name: western-shuffle-right; }.western-shuffling strong { margin-top: 22px; }.western-shuffling small { color: var(--ds-text-tertiary); margin-top: 6px; }
@keyframes western-shuffle { 35% { transform: translateX(-70px) rotate(-7deg); } 70% { transform: translateX(20px); } } @keyframes western-shuffle-right { 35% { transform: translateX(70px) rotate(7deg); } 70% { transform: translateX(-20px); } }
.western-draw-workspace { display: grid; flex: 1; grid-template-rows: minmax(0,1fr) auto; margin-top: 8px; min-height: 0; min-width: 0; width: 100%; }
.western-live-board { min-height: 0; overflow: hidden; padding: 0 var(--ds-page-gutter); }.western-live-board :deep(.western-card-board) { height: 100%; }
.western-draw-controls { left: 50%; min-width: 0; position: relative; transform: translateX(-50%); width: calc(100% + var(--ds-page-gutter) + var(--ds-page-gutter)); }
.western-fan-wrap { height: 322px; margin: 0; min-width: 0; overflow: hidden; position: relative; width: 100%; }
.western-fan { cursor: grab; height: 322px; min-width: 0; overflow-x: auto; overflow-y: hidden; padding: 132px 0 0; scrollbar-width: none; touch-action: pan-x; }.western-fan::-webkit-scrollbar { display:none; }
.western-fan-track { --fan-edge-space: 44px; display: flex; min-width: max-content; }.western-fan-track::before,.western-fan-track::after { content:''; flex:0 0 var(--fan-edge-space); }
.western-fan button { --card-angle:0deg; --card-lift:0px; background: transparent; border: 0; cursor: grab; flex: 0 0 110px; height: 178px; margin-left: -54px; opacity: .88; padding: 0; position: relative; transform: translateY(var(--card-lift)) rotate(var(--card-angle)); transform-origin: 50% 142%; transition: transform .16s ease-out,filter .2s,opacity .2s; user-select:none; z-index:1; }.western-fan button:first-of-type { margin-left: 0; }.western-fan button.candidate { cursor:pointer; filter:brightness(1.01); opacity:1; z-index:100; }.western-fan button.selected { opacity: .2; }.western-fan button > span { border-radius:8px; box-shadow:0 8px 20px rgba(41,33,52,.2); display:block; height:178px; overflow:hidden; width:110px; }.western-fan img { display:block; height:100%; object-fit:cover; pointer-events:none; width:100%; }
.western-candidate-number { bottom:12px; display:flex; justify-content:center; left:50%; pointer-events:none; position:absolute; transform:translateX(-50%); z-index:110; }.western-candidate-number span { align-items:center; background:var(--ds-accent-soft); border-radius:99px; color:var(--ds-accent-strong); display:inline-flex; font-size:10px; font-weight:650; height:18px; justify-content:center; min-width:18px; padding:0 4px; }
.western-draw-complete { display:flex; justify-content:center; padding:var(--ds-space-4) 0 0; }
.western-result-action { display: flex; justify-content: center; padding-top: 18px; }
@media (max-width:720px) { .western-draw-page.is-drawing { height:calc(100dvh - var(--ds-topbar-height) - 2px); margin:calc(0px - var(--ds-space-3)) calc(0px - var(--ds-page-gutter)) calc(0px - var(--ds-space-7) - env(safe-area-inset-bottom)); padding:var(--ds-space-3) 0 0; }.western-draw-surface.is-drawing { border-radius:0; padding-bottom:0; }.western-draw-head { align-items:flex-start; }.western-draw-head small { max-width:210px; }.western-draw-workspace { margin-top:0; overflow:visible; }.western-live-board { padding:0 var(--ds-page-gutter); }.western-draw-controls { width:100vw; }.western-fan-wrap,.western-fan { height:206px; }.western-fan { padding-top:90px; }.western-fan button { flex-basis:78px; height:126px; margin-left:-36px; transform-origin:50% 116%; }.western-fan button > span { height:126px; width:78px; }.western-candidate-number { bottom:max(10px,env(safe-area-inset-bottom)); } }
@media (prefers-reduced-motion:reduce) { .western-shuffling img { animation:none; }.western-fan button { transition:none; } }
</style>
