<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
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

const deckName = computed(() => props.deckType === 'lenormand' ? '雷诺曼' : '时月神谕');
const deck = computed(() => getWesternDeck(props.deckType));
const spread = computed(() => getWesternSpreadOptions(props.deckType).find(item => item.value === props.initialSpread) || getWesternSpreadOptions(props.deckType)[0]!);
const remaining = computed(() => spread.value.count - selectedSlots.value.length);
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
  secureShuffle(); selectedSlots.value = []; candidateSlot.value = 1; errorMessage.value = ''; phase.value = 'drawing';
  nextTick(() => centerSlot(1));
}

function centerSlot(slot: number) {
  const element = deckScroller.value?.querySelector<HTMLElement>(`[data-slot="${slot}"]`);
  const scroller = deckScroller.value;
  if (element && scroller) scroller.scrollTo({ left: element.offsetLeft + element.offsetWidth / 2 - scroller.clientWidth / 2, behavior: 'smooth' });
}

function updateCandidate() {
  const scroller = deckScroller.value;
  if (!scroller) return;
  const center = scroller.getBoundingClientRect().left + scroller.clientWidth / 2;
  let best = candidateSlot.value; let distance = Infinity;
  scroller.querySelectorAll<HTMLElement>('[data-slot]').forEach((element) => {
    const rect = element.getBoundingClientRect(); const current = Math.abs(rect.left + rect.width / 2 - center);
    const slot = Number(element.dataset.slot);
    if (!selectedSlots.value.includes(slot) && current < distance) { best = slot; distance = current; }
  });
  candidateSlot.value = best;
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
    phase.value = 'result';
    if (animated) await nextTick();
  } catch (error) { errorMessage.value = error instanceof Error ? error.message : '排牌失败，请重试。'; }
}

function startInterpretation() {
  if (!reading.value || !prompt.value) return;
  const summary = `${reading.value.spreadName}：${reading.value.cards.map(card => `${card.position} ${card.name}`).join('；')}`;
  emit('interpret', { question: props.initialQuestion, reading: reading.value, request: { mode: 'divination', question: props.initialQuestion, method: deckName.value,
    reading: { summary, data: reading.value, prompt: prompt.value }, preferences: props.preferences, aiConfig: props.aiConfig } });
}

onMounted(() => { if (props.castingPreference === 'auto') automaticDraw(); });
</script>

<template>
  <UiToolPage width="wide" class="western-draw-page">
    <UiWorkspaceSurface class="western-draw-surface" padding="standard">
      <header class="western-draw-head"><div><span>{{ deckName }} · {{ spread.label }}</span><h2>{{ initialQuestion }}</h2><small v-if="phase === 'drawing'">{{ selectedSlots.length ? `已确认 ${selectedSlots.length} 张，还需 ${remaining} 张` : `需要抽取 ${spread.count} 张牌` }}</small></div><UiButton variant="ghost" size="small" @click="emit('restart')"><RotateCcw :size="14" />重新开始</UiButton></header>

      <section v-if="phase === 'setup'" class="western-methods">
        <button type="button" :class="{ active: drawMode === 'manual' }" @click="drawMode = 'manual'; errorMessage = ''"><Hand :size="18" /><span><strong>手动抽牌</strong><small>展开牌组，逐张选择</small></span></button>
        <button type="button" :class="{ active: drawMode === 'number' }" @click="drawMode = 'number'; errorMessage = ''"><Hash :size="18" /><span><strong>指定数字</strong><small>从 1–{{ deck.length }} 中输入 {{ spread.count }} 个数字</small></span></button>
        <input v-if="drawMode === 'number'" v-model="numberInput" :placeholder="`输入 ${spread.count} 个不重复数字`" @input="errorMessage = ''" />
        <UiNotice v-if="errorMessage" tone="error" compact>{{ errorMessage }}</UiNotice>
        <UiButton size="large" @click="begin"><Sparkles :size="16" />{{ drawMode === 'number' ? '确认数字并抽牌' : '进入手动抽牌' }}</UiButton>
      </section>

      <section v-else-if="phase === 'shuffling'" class="western-shuffling"><div><img v-for="item in 6" :key="item" :src="tarotCardBackUrl" alt="" /></div><strong>正在洗牌</strong><small>牌组收拢后将依牌位顺序发牌</small></section>

      <template v-else-if="phase === 'drawing'">
        <div class="western-live-board"><WesternCardBoard v-if="previewReading" :reading="previewReading" compact /><div v-else class="western-empty-spread"><span v-for="item in spread.count" :key="item">{{ spread.positions[item - 1] }}</span></div></div>
        <div class="western-fan-wrap">
          <div ref="deckScroller" class="western-fan" @scroll.passive="updateCandidate">
            <button v-for="slot in slots" :key="slot" type="button" :data-slot="slot" :class="{ candidate: candidateSlot === slot, selected: selectedSlots.includes(slot) }" @click="candidateSlot === slot ? confirmCandidate() : centerSlot(slot)"><img :src="tarotCardBackUrl" alt="" /></button>
          </div><span>{{ candidateSlot }}</span>
        </div>
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
.western-draw-page { min-height: calc(100dvh - 170px); }
.western-draw-surface { min-height: min(760px, calc(100dvh - 190px)); overflow: hidden; }
.western-draw-head { align-items: flex-start; display: flex; gap: 16px; justify-content: space-between; }
.western-draw-head span, .western-draw-head small { color: var(--ds-text-tertiary); font-size: var(--ds-text-xs); }.western-draw-head small { display:block; margin-top:5px; opacity:.55; }
.western-draw-head h2 { color: var(--ds-text-primary); font-size: var(--ds-heading-sm); margin: 5px 0 0; }
.western-methods { display: grid; gap: 10px; margin: clamp(36px, 10vh, 100px) auto 0; max-width: 560px; }
.western-methods > button:not(.ui-button) { align-items: center; background: var(--ds-surface-muted); border: 1px solid var(--ds-line); border-radius: var(--ds-radius-md); color: var(--ds-text-secondary); cursor: pointer; display: flex; gap: 12px; padding: 13px 15px; text-align: left; }
.western-methods > button.active { background: var(--ds-accent-soft); border-color: color-mix(in srgb,var(--ds-accent) 45%,var(--ds-line)); color: var(--ds-accent-strong); }
.western-methods button span { display: grid; gap: 2px; }.western-methods button small { color: var(--ds-text-tertiary); }
.western-methods input { background: var(--ds-surface-raised); border: 1px solid var(--ds-line); border-radius: var(--ds-radius-sm); color: var(--ds-text-primary); font: inherit; height: 44px; padding: 0 12px; }
.western-shuffling { align-items: center; display: flex; flex-direction: column; justify-content: center; min-height: 520px; }.western-shuffling > div { height: 230px; position: relative; width: 150px; }.western-shuffling img { animation: western-shuffle 1.7s ease-in-out both; border-radius: 9px; box-shadow: 0 12px 26px rgba(41,33,52,.2); height: 230px; left: 0; object-fit: cover; position: absolute; width: 150px; }.western-shuffling img:nth-child(even) { animation-name: western-shuffle-right; }.western-shuffling strong { margin-top: 20px; }.western-shuffling small { color: var(--ds-text-tertiary); margin-top: 5px; }
@keyframes western-shuffle { 35% { transform: translateX(-70px) rotate(-7deg); } 70% { transform: translateX(20px); } } @keyframes western-shuffle-right { 35% { transform: translateX(70px) rotate(7deg); } 70% { transform: translateX(-20px); } }
.western-live-board { height: min(320px, 38dvh); margin-top: 8px; }.western-empty-spread { align-items: center; display: flex; gap: 8px; height: 100%; justify-content: center; }.western-empty-spread span { align-items: center; aspect-ratio: 2/3; border: 1px dashed color-mix(in srgb,var(--ds-line) 70%,transparent); border-radius: 6px; color: var(--ds-text-tertiary); display: flex; font-size: 10px; justify-content: center; max-width: 86px; text-align: center; width: min(12vw,86px); }
.western-fan-wrap { height: 286px; margin: 0; min-width:0; overflow:hidden; position: relative; width:100%; }.western-fan { display: flex; height: 286px; min-width:0; overflow-x: auto; overflow-y: hidden; padding: 92px calc(50% - 55px) 0; scroll-snap-type: x mandatory; scrollbar-width: none; }.western-fan::-webkit-scrollbar { display:none; }.western-fan button { background: transparent; border: 0; flex: 0 0 76px; height: 178px; margin-left: -22px; opacity: .88; padding: 0; scroll-snap-align: center; transition: transform .18s,opacity .18s; }.western-fan button:first-child { margin-left: 0; }.western-fan button.candidate { opacity: 1; transform: translateY(-46px); z-index: 3; }.western-fan button.selected { opacity: .16; pointer-events: none; }.western-fan img { border-radius: 7px; box-shadow: 0 9px 19px rgba(41,33,52,.2); height: 100%; object-fit: cover; width: 110px; }.western-fan-wrap > span { background: var(--ds-accent-soft); border-radius: 99px; bottom: 10px; color: var(--ds-accent-strong); font-size: 10px; left: 50%; min-width: 19px; padding: 3px 6px; position: absolute; text-align: center; transform: translateX(-50%); }
.western-result-action { display: flex; justify-content: center; padding-top: 18px; }
@media (max-width:720px) { .western-draw-page { height: calc(100dvh - var(--ds-topbar-height) - 2px); margin: calc(0px - var(--ds-space-3)) calc(0px - var(--ds-page-gutter)) calc(0px - var(--ds-space-7) - env(safe-area-inset-bottom)); max-width:none; min-height: 0; overflow: hidden; padding:var(--ds-space-3) 0 0; width:calc(100% + var(--ds-page-gutter) + var(--ds-page-gutter)); }.western-draw-surface { border-radius:0; height: 100%; min-height: 0; padding:0; }.western-draw-head { margin-inline:var(--ds-page-gutter); }.western-draw-head h2 { font-size: var(--ds-text-md); }.western-live-board { height: min(300px,35dvh); margin-inline:var(--ds-page-gutter); }.western-fan-wrap { height: 214px; left:50%; margin:0; transform:translateX(-50%); width:calc(100vw + 48px); }.western-fan { height: 214px; padding-top: 70px; }.western-fan button { flex-basis: 54px; height: 126px; margin-left: -15px; }.western-fan button.candidate { transform: translateY(-34px); }.western-fan img { width: 78px; }.western-empty-spread span { width: min(15vw,60px); }.western-fan-wrap > span { bottom:max(8px,env(safe-area-inset-bottom)); } }
@media (prefers-reduced-motion:reduce) { .western-shuffling img { animation:none; }.western-fan button { transition:none; } }
</style>
