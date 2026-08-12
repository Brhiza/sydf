<script setup lang="ts">
import { computed } from 'vue';
import type { TarotCardResult, TarotReadingResult, TarotSpreadType } from '../lib/tarot';
import { getShiyueTarotCard, getShiyueTarotName } from '../lib/tarotDeck';

interface SpreadPose {
  x: number;
  y: number;
  rotation?: number;
  layer?: number;
}

const props = defineProps<{
  reading: TarotReadingResult;
  compact?: boolean;
  immersive?: boolean;
  animated?: boolean;
}>();

const spreadLayouts: Record<TarotSpreadType, SpreadPose[]> = {
  single: [{ x: 50, y: 50 }],
  three: [{ x: 18, y: 50 }, { x: 50, y: 50 }, { x: 82, y: 50 }],
  mindBodySpirit: [{ x: 18, y: 50 }, { x: 50, y: 50 }, { x: 82, y: 50 }],
  love: [{ x: 50, y: 16 }, { x: 19, y: 50 }, { x: 50, y: 50 }, { x: 81, y: 50 }, { x: 50, y: 84 }],
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

const denseSpread = computed(() => props.reading.cards.length >= 7);

function spreadCardStyle(index: number) {
  const pose = spreadLayouts[props.reading.spreadType][index] || { x: 50, y: 50 };
  return {
    '--spread-x': `${pose.x}%`,
    '--spread-y': `${pose.y}%`,
    '--spread-rotation': `${pose.rotation || 0}deg`,
    zIndex: pose.layer || 1,
  };
}
</script>

<template>
  <div class="tarot-spread-frame" :class="[`spread-${reading.spreadType}`, { 'is-compact': compact, 'is-immersive': immersive }]">
    <div
      class="tarot-spread-board"
      :class="[`spread-${reading.spreadType}`, { 'is-dense': denseSpread, 'is-small-spread': reading.cards.length <= 3, 'is-medium-spread': reading.cards.length >= 4 && reading.cards.length <= 6, 'is-dealing': animated }]"
      :aria-label="`${reading.spreadName}牌阵`"
    >
      <article
        v-for="(card, index) in reading.cards"
        :key="`${card.id}-${index}`"
        class="tarot-result-item"
        :style="{ ...spreadCardStyle(index), '--deal-index': index }"
        :aria-label="`${card.position}，${getShiyueTarotName(card.id) || card.name}，${card.reversed ? '逆位' : '正位'}`"
      >
        <span class="tarot-position"><i>{{ index + 1 }}</i>{{ card.position }}</span>
        <div class="tarot-face" :class="{ 'is-reversed': card.reversed }">
          <img :src="getShiyueTarotCard(card.id)?.imageUrl" alt="" draggable="false" />
        </div>
        <strong>{{ getShiyueTarotName(card.id) || card.name }}</strong>
        <span class="tarot-orientation" :class="{ reversed: card.reversed }">{{ card.reversed ? '逆位' : '正位' }}</span>
        <p>{{ card.keywords.join(' · ') }}</p>
      </article>
    </div>
  </div>
</template>

<style scoped>
.tarot-spread-frame { --spread-card-width: 104px; --spread-item-width: 144px; min-width: 0; overflow: hidden; padding: 6px 2px 12px; width: 100%; }
.tarot-spread-board { background: color-mix(in srgb, var(--ds-surface-muted) 88%, var(--ds-accent-soft)); border: 1px solid var(--ds-line); border-radius: var(--ds-radius-lg); height: min(620px, 66dvh); margin-inline: auto; overflow: hidden; position: relative; width: 100%; }
.tarot-spread-board::before { border: 1px solid color-mix(in srgb, var(--ds-accent) 14%, transparent); border-radius: 50%; content: ''; height: 44%; left: 50%; position: absolute; top: 50%; transform: translate(-50%, -50%); width: 44%; }
.tarot-spread-board.spread-single, .tarot-spread-board.spread-three, .tarot-spread-board.spread-mindBodySpirit { height: min(470px, 54dvh); }
.tarot-spread-board.spread-single { width: min(100%, 520px); }
.tarot-spread-board.spread-three, .tarot-spread-board.spread-mindBodySpirit { width: min(100%, 900px); }
.tarot-spread-board.spread-love, .tarot-spread-board.spread-career, .tarot-spread-board.spread-decision { height: min(610px, 64dvh); }
.tarot-spread-board.spread-horseshoe { height: min(540px, 58dvh); }
.tarot-spread-board.spread-chakra { height: min(700px, 70dvh); width: min(100%, 560px); }
.tarot-spread-board.spread-celtic { height: min(680px, 70dvh); }
.tarot-spread-board.spread-year { height: min(720px, 70dvh); }
.tarot-spread-board.is-small-spread { --spread-card-width: 150px; --spread-item-width: 190px; }
.tarot-spread-board.is-medium-spread { --spread-card-width: 104px; --spread-item-width: 144px; }
.tarot-spread-board.is-dense { --spread-card-width: 70px; --spread-item-width: 104px; }
.tarot-result-item { align-items: center; display: flex; flex-direction: column; left: var(--spread-x); min-width: 0; position: absolute; text-align: center; top: var(--spread-y); transform: translate(-50%, -50%); width: var(--spread-item-width); }
.tarot-position { align-items: center; color: var(--ds-accent-strong); display: flex; font-size: var(--ds-text-xs); gap: 5px; height: 32px; justify-content: center; line-height: 1.2; width: var(--spread-item-width); }
.tarot-position i { align-items: center; background: var(--ds-accent-soft); border-radius: var(--ds-radius-round); color: var(--ds-accent-strong); display: inline-flex; flex: 0 0 auto; font-size: 9px; font-style: normal; height: 18px; justify-content: center; width: 18px; }
.tarot-face { aspect-ratio: 2 / 3; filter: drop-shadow(0 11px 13px rgba(41,33,52,.18)); flex: 0 0 auto; overflow: visible; position: relative; transform: rotate(var(--spread-rotation)); width: var(--spread-card-width); }
.tarot-face::after { background: linear-gradient(90deg, transparent 5%, rgba(197,160,94,.74) 16%, rgba(233,211,164,.92) 50%, rgba(197,160,94,.74) 84%, transparent 95%); bottom: 1px; content: ''; height: 1px; left: 0; pointer-events: none; position: absolute; right: 0; }
.tarot-face img { display: block; height: 100%; object-fit: contain; transition: transform .3s; user-select: none; width: 100%; }
.tarot-face.is-reversed img { transform: rotate(180deg); }
.tarot-result-item > strong { color: var(--ds-text-primary); font-size: var(--ds-text-sm); margin-top: 9px; }
.tarot-orientation { background: var(--ds-success-soft); border-radius: var(--ds-radius-round); color: var(--ds-success); font-size: 10px; margin-top: 5px; padding: 2px 7px; }
.tarot-orientation.reversed { background: var(--ds-danger-soft); color: var(--ds-danger); }
.tarot-result-item p { color: var(--ds-text-tertiary); font-size: 10px; line-height: 1.45; margin: 6px 0 0; }
.tarot-spread-board.is-dense .tarot-result-item p { display: none; }
.tarot-spread-board.is-dense .tarot-result-item > strong,
.tarot-spread-board.is-dense .tarot-result-item > .tarot-orientation { display: none; }
.tarot-spread-board.is-dense .tarot-position { font-size: 10px; height: 24px; }
.tarot-spread-board.is-medium-spread .tarot-result-item p { display: none; }
.tarot-spread-board.is-medium-spread .tarot-result-item > strong { font-size: var(--ds-text-xs); line-height: 1.35; max-width: var(--spread-item-width); }
.tarot-spread-frame.is-compact { padding-block: 0 2px; }
.tarot-spread-frame.is-compact .tarot-spread-board { height: min(430px, 48dvh); }
.tarot-spread-frame.is-compact .tarot-spread-board.spread-single,
.tarot-spread-frame.is-compact .tarot-spread-board.spread-three,
.tarot-spread-frame.is-compact .tarot-spread-board.spread-mindBodySpirit { height: min(390px, 44dvh); }
.tarot-spread-frame.is-compact .tarot-spread-board.spread-three,
.tarot-spread-frame.is-compact .tarot-spread-board.spread-mindBodySpirit { width: min(100%, 760px); }
.tarot-spread-frame.is-compact .tarot-spread-board.spread-three .tarot-result-item:nth-child(1),
.tarot-spread-frame.is-compact .tarot-spread-board.spread-mindBodySpirit .tarot-result-item:nth-child(1) { --spread-x: 27% !important; }
.tarot-spread-frame.is-compact .tarot-spread-board.spread-three .tarot-result-item:nth-child(3),
.tarot-spread-frame.is-compact .tarot-spread-board.spread-mindBodySpirit .tarot-result-item:nth-child(3) { --spread-x: 73% !important; }
.tarot-spread-frame.is-compact .tarot-spread-board.spread-chakra,
.tarot-spread-frame.is-compact .tarot-spread-board.spread-celtic,
.tarot-spread-frame.is-compact .tarot-spread-board.spread-year { height: min(450px, 48dvh); }
.tarot-spread-frame.is-immersive { padding-inline: 0; }
.tarot-spread-frame.is-immersive .tarot-spread-board { background: transparent; border: 0; border-radius: 0; }
.tarot-spread-frame.is-immersive .tarot-spread-board::before { display: none; }
.tarot-spread-board.is-dealing .tarot-result-item { animation: tarot-deal-in .48s cubic-bezier(.2,.78,.28,1) both; animation-delay: calc(var(--deal-index) * 110ms); }
@keyframes tarot-deal-in { from { opacity: 0; transform: translate(-50%, -32%) scale(.72) rotate(-4deg); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }

@media (max-width: 720px) {
  .tarot-spread-frame { --spread-card-width: 70px; --spread-item-width: 94px; }
  .tarot-spread-board.is-small-spread { --spread-card-width: 92px; --spread-item-width: 118px; }
  .tarot-spread-board.is-medium-spread { --spread-card-width: 70px; --spread-item-width: 94px; }
  .tarot-spread-board.is-dense { --spread-card-width: 46px; --spread-item-width: 68px; }
  .tarot-spread-board { height: min(520px, 62dvh); }
  .tarot-spread-board.spread-single,
  .tarot-spread-board.spread-three,
  .tarot-spread-board.spread-mindBodySpirit { height: min(300px, 42dvh); }
  .tarot-spread-board.spread-love,
  .tarot-spread-board.spread-career,
  .tarot-spread-board.spread-decision,
  .tarot-spread-board.spread-horseshoe { height: min(430px, 54dvh); }
  .tarot-spread-board.spread-love { height: min(500px, 58dvh); }
  .tarot-spread-board.spread-chakra,
  .tarot-spread-board.spread-celtic,
  .tarot-spread-board.spread-year { height: min(520px, 60dvh); }
  .tarot-spread-frame.is-compact .tarot-spread-board { height: 100%; }
  .tarot-spread-frame.is-compact .tarot-spread-board.spread-single,
  .tarot-spread-frame.is-compact .tarot-spread-board.spread-three,
  .tarot-spread-frame.is-compact .tarot-spread-board.spread-mindBodySpirit { height: 100%; }
  .tarot-spread-frame.is-compact .tarot-spread-board.spread-three .tarot-result-item:nth-child(1),
  .tarot-spread-frame.is-compact .tarot-spread-board.spread-mindBodySpirit .tarot-result-item:nth-child(1) { --spread-x: 20% !important; }
  .tarot-spread-frame.is-compact .tarot-spread-board.spread-three .tarot-result-item:nth-child(3),
  .tarot-spread-frame.is-compact .tarot-spread-board.spread-mindBodySpirit .tarot-result-item:nth-child(3) { --spread-x: 80% !important; }
  .tarot-spread-frame.is-compact .tarot-spread-board.spread-chakra,
  .tarot-spread-frame.is-compact .tarot-spread-board.spread-celtic,
  .tarot-spread-frame.is-compact .tarot-spread-board.spread-year { height: 100%; }
}
@media (prefers-reduced-motion: reduce) { .tarot-spread-board.is-dealing .tarot-result-item { animation: none; } }
</style>
