<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { RotateCcw } from 'lucide-vue-next';

const TOTAL_CARDS = 78;
const DRAW_THRESHOLD = 44;
const cardNumbers = Array.from({ length: TOTAL_CARDS }, (_, index) => index + 1);

const deckRef = ref<HTMLElement | null>(null);
const deckTrackRef = ref<HTMLElement | null>(null);
const selectedCard = ref<number | null>(null);
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

const guidance = computed(() => selectedCard.value === null
  ? '左右滑动牌阵，点击或向上拖动一张牌'
  : `你抽出了第 ${selectedCard.value} 张牌`);

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

  const viewportCenter = scroller.scrollLeft + scroller.clientWidth / 2;
  const arcHalfWidth = Math.max(150, scroller.clientWidth * .48);
  const poses: Record<number, { angle: number; lift: number }> = {};
  cards.forEach((element, index) => {
    const cardCenter = element.offsetLeft + element.offsetWidth / 2;
    const position = Math.max(-1.15, Math.min(1.15, (cardCenter - viewportCenter) / arcHalfWidth));
    const edgeProgress = Math.min(1, Math.abs(position));
    poses[index + 1] = {
      angle: position * 20,
      lift: -42 * (1 - edgeProgress * edgeProgress),
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
  const isSelected = selectedCard.value === card;
  const pose = fanPoses.value[card] || { angle: 0, lift: 0 };
  const interactionLift = isSelected ? -68 : isDragging ? Math.min(0, dragOffset.value) : 0;
  return {
    '--card-angle': `${isSelected ? 0 : pose.angle}deg`,
    '--card-lift': `${pose.lift + interactionLift}px`,
    '--card-seed': `${(card * 17) % 47}px`,
  };
}

function selectCard(card: number) {
  selectedCard.value = card;
  nextTick(() => {
    const selected = deckRef.value?.querySelector<HTMLElement>(`[data-card="${card}"]`);
    selected?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  });
}

function handleCardClick(event: MouseEvent, card: number) {
  if (event.detail === 0) selectCard(card);
}

function handlePointerDown(event: PointerEvent, card: number) {
  if (event.button !== 0 || pointerId.value !== null) return;
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
  const shouldDraw = card !== null && pointerMode.value === 'vertical' && dragOffset.value <= -DRAW_THRESHOLD;
  const shouldTap = card !== null && pointerMode.value === 'pending';
  if ((shouldDraw || shouldTap) && card !== null) selectCard(card);
  pointerId.value = null;
  pointerMode.value = 'pending';
  draggingCard.value = null;
  dragOffset.value = 0;
}

function resetSelection() {
  selectedCard.value = null;
  deckRef.value?.scrollTo({ left: initialScrollLeft.value, behavior: 'smooth' });
}

onMounted(() => {
  nextTick(updateFanLayout);
  fanResizeObserver = new ResizeObserver(scheduleFanUpdate);
  if (deckRef.value) fanResizeObserver.observe(deckRef.value);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(fanFrame);
  fanResizeObserver?.disconnect();
});
</script>

<template>
  <section class="tarot-page screen" aria-labelledby="tarot-title">
    <div class="tarot-atmosphere" aria-hidden="true">
      <span class="tarot-glow tarot-glow-one"></span>
      <span class="tarot-glow tarot-glow-two"></span>
      <span class="tarot-stars"></span>
    </div>

    <header class="tarot-heading">
      <span class="tarot-eyebrow">手动抽牌</span>
      <h2 id="tarot-title">静心想好你的问题</h2>
      <p aria-live="polite">{{ guidance }}</p>
    </header>

    <div class="tarot-moon" aria-hidden="true"><span></span></div>

    <div class="tarot-deck-region">
      <div class="tarot-deck-meta">
        <span>{{ selectedCard === null ? '共 78 张' : `第 ${selectedCard} 张` }}</span>
        <button v-if="selectedCard !== null" type="button" @click="resetSelection"><RotateCcw :size="14" />重新选择</button>
      </div>

      <div
        ref="deckRef"
        class="tarot-deck-scroll"
        role="group"
        aria-label="78 张塔罗牌，可左右滑动"
        @scroll="scheduleFanUpdate"
      >
        <div ref="deckTrackRef" class="tarot-deck">
          <button
            v-for="card in cardNumbers"
            :key="card"
            type="button"
            class="tarot-card"
            :class="{ 'is-selected': selectedCard === card, 'is-dragging': draggingCard === card }"
            :style="cardStyle(card)"
            :data-card="card"
            :aria-label="`抽出第 ${card} 张牌`"
            :aria-pressed="selectedCard === card"
            @click="handleCardClick($event, card)"
            @pointerdown="handlePointerDown($event, card)"
            @pointermove="handlePointerMove"
            @pointerup="finishPointer"
            @pointercancel="finishPointer"
          >
            <span v-if="selectedCard === card" class="tarot-card-number">第 {{ card }} 张</span>
            <span class="tarot-card-inner" aria-hidden="true">
              <span class="tarot-card-corners"></span>
              <span class="tarot-card-orbit"><i></i></span>
            </span>
          </button>
        </div>
      </div>
      <div class="tarot-swipe-cue" aria-hidden="true"><span></span></div>
    </div>
  </section>
</template>

<style scoped>
.tarot-page {
  background:
    radial-gradient(circle at 50% 46%, rgba(139, 102, 182, .28), transparent 34%),
    linear-gradient(165deg, #17111f 0%, #26162f 50%, #120f19 100%);
  color: #f8f1ff;
  display: grid;
  grid-template-rows: auto 1fr auto;
  min-height: calc(100dvh - var(--ds-topbar-height));
  overflow: hidden;
  position: relative;
}
.tarot-atmosphere { inset: 0; overflow: hidden; pointer-events: none; position: absolute; }
.tarot-glow { border-radius: 50%; filter: blur(2px); position: absolute; }
.tarot-glow-one { background: rgba(121, 79, 156, .22); height: 45vw; left: -13vw; top: 8%; width: 45vw; }
.tarot-glow-two { background: rgba(117, 77, 144, .18); bottom: 4%; height: 38vw; right: -10vw; width: 38vw; }
.tarot-stars {
  background-image:
    radial-gradient(circle, rgba(255, 246, 222, .72) 0 1px, transparent 1.5px),
    radial-gradient(circle, rgba(218, 191, 243, .45) 0 1px, transparent 1.4px);
  background-position: 0 0, 17px 19px;
  background-size: 43px 43px, 61px 61px;
  inset: 0;
  mask-image: linear-gradient(to bottom, rgba(0,0,0,.65), transparent 72%);
  opacity: .18;
  position: absolute;
}
.tarot-heading { margin: 0 auto; max-width: 620px; padding: clamp(44px, 8vh, 88px) 24px 0; position: relative; text-align: center; z-index: 1; }
.tarot-eyebrow { color: #c8aee0; display: block; font-size: 12px; letter-spacing: .28em; margin-bottom: 13px; }
.tarot-heading h2 { font-family: 'Noto Serif SC', serif; font-size: clamp(25px, 4vw, 36px); font-weight: 500; letter-spacing: .08em; margin: 0; }
.tarot-heading p { color: #cfc3d8; font-size: 13px; margin: 13px 0 0; }
.tarot-moon { align-self: center; height: 94px; justify-self: center; position: relative; width: 94px; z-index: 1; }
.tarot-moon::before {
  background: #f7de9e;
  border-radius: 50%;
  box-shadow: 0 0 18px rgba(255, 225, 153, .48), 0 0 52px rgba(221, 180, 119, .23);
  content: '';
  inset: 10px;
  position: absolute;
}
.tarot-moon::after { background: #281832; border-radius: 50%; content: ''; height: 69px; left: 8px; position: absolute; top: 3px; width: 69px; }
.tarot-moon span { border: 1px solid rgba(245, 223, 175, .28); border-radius: 50%; inset: 0; position: absolute; }
.tarot-deck-region { min-width: 0; padding-top: 12px; position: relative; z-index: 2; }
.tarot-deck-meta { align-items: center; display: flex; height: 34px; justify-content: space-between; margin: 0 auto; max-width: 980px; padding: 0 28px; }
.tarot-deck-meta > span { color: rgba(242, 226, 255, .7); font-size: 12px; letter-spacing: .08em; }
.tarot-deck-meta button { align-items: center; background: rgba(255,255,255,.08); border: 1px solid rgba(230, 210, 244, .18); border-radius: 999px; color: #eee1f8; display: inline-flex; font-size: 12px; gap: 6px; min-height: 32px; padding: 0 12px; }
.tarot-deck-meta button:hover { background: rgba(255,255,255,.14); }
.tarot-deck-scroll { cursor: grab; min-width: 0; overflow-x: auto; overflow-y: hidden; padding: 112px 0 28px; scrollbar-width: none; touch-action: pan-x; }
.tarot-deck-scroll::-webkit-scrollbar { display: none; }
.tarot-deck { --fan-edge-space: 44px; display: flex; min-width: max-content; }
.tarot-deck::before, .tarot-deck::after { content: ''; flex: 0 0 var(--fan-edge-space); }
.tarot-card {
  --card-angle: 0deg;
  --card-lift: 0px;
  background: transparent;
  cursor: grab;
  flex: 0 0 78px;
  height: 126px;
  margin-left: -37px;
  padding: 0;
  position: relative;
  transform: translateY(var(--card-lift)) rotate(var(--card-angle));
  transform-origin: 50% 118%;
  transition: transform .14s ease-out, filter .2s;
  user-select: none;
  z-index: 1;
}
.tarot-card:first-child { margin-left: 0; }
.tarot-card:hover { filter: brightness(1.12); }
.tarot-card.is-dragging { cursor: grabbing; transition: none; z-index: 90; }
.tarot-card.is-selected { filter: brightness(1.08); z-index: 100; }
.tarot-card:focus-visible { outline: none; z-index: 101; }
.tarot-card:focus-visible .tarot-card-inner { box-shadow: 0 0 0 3px #d5b8ec, 0 12px 28px rgba(0,0,0,.34); }
.tarot-card-inner {
  background:
    radial-gradient(circle at calc(50% + var(--card-seed)) 24%, rgba(255,255,255,.5) 0 1px, transparent 1.5px),
    radial-gradient(circle at 26% 74%, rgba(255,255,255,.42) 0 1.2px, transparent 1.7px),
    linear-gradient(155deg, #3d264b, #191b36 72%);
  border: 3px solid #d9c69b;
  border-radius: 7px;
  box-shadow: 0 8px 20px rgba(5, 3, 11, .32);
  display: block;
  height: 126px;
  overflow: hidden;
  position: relative;
  width: 78px;
}
.tarot-card-inner::before {
  background-image: radial-gradient(circle, #efe3bb 0 1.1px, transparent 1.8px);
  background-position: 4px 5px;
  background-size: 19px 21px;
  content: '';
  inset: 5px;
  opacity: .48;
  position: absolute;
}
.tarot-card-corners { border: 1px solid rgba(231, 212, 164, .68); inset: 6px; position: absolute; }
.tarot-card-orbit { border: 1px solid rgba(232, 213, 168, .75); border-radius: 50%; height: 38px; left: 17px; position: absolute; top: 41px; transform: rotate(-25deg); width: 38px; }
.tarot-card-orbit::before, .tarot-card-orbit::after { background: #e7d49f; content: ''; left: 50%; position: absolute; top: 50%; transform: translate(-50%, -50%) rotate(45deg); }
.tarot-card-orbit::before { height: 12px; width: 12px; }
.tarot-card-orbit::after { background: #2d243d; height: 7px; width: 7px; }
.tarot-card-orbit i { border: 1px solid rgba(232, 213, 168, .6); border-radius: 50%; inset: 8px; position: absolute; }
.tarot-card-number { background: #f1dfb8; border-radius: 999px; box-shadow: 0 5px 16px rgba(0,0,0,.3); color: #382743; font-size: 11px; font-weight: 650; left: 50%; padding: 5px 8px; position: absolute; top: 9px; transform: translateX(-50%); white-space: nowrap; z-index: 3; }
.tarot-swipe-cue { height: 18px; margin: 0 auto 18px; max-width: 160px; padding: 7px 0; }
.tarot-swipe-cue span { background: rgba(230, 214, 242, .28); border-radius: 99px; display: block; height: 3px; position: relative; }
.tarot-swipe-cue span::before { background: #d9c39b; border-radius: 50%; content: ''; height: 7px; left: 50%; position: absolute; top: -2px; transform: translateX(-50%); width: 7px; }

@media (max-width: 720px) {
  .tarot-page { min-height: calc(100dvh - var(--ds-topbar-height)); }
  .tarot-heading { padding-top: clamp(34px, 7vh, 64px); }
  .tarot-heading h2 { font-size: 25px; }
  .tarot-moon { height: 76px; width: 76px; }
  .tarot-moon::after { height: 57px; width: 57px; }
  .tarot-deck-meta { padding: 0 18px; }
  .tarot-deck-scroll { padding-bottom: 16px; padding-top: 104px; }
  .tarot-card { flex-basis: 72px; height: 116px; margin-left: -32px; }
  .tarot-card-inner { height: 116px; width: 72px; }
  .tarot-card-orbit { left: 15px; top: 38px; }
}

@media (prefers-reduced-motion: reduce) {
  .tarot-card { transition: none; }
}
</style>
