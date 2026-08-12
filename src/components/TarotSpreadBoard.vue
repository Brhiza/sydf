<script setup lang="ts">
import { computed } from 'vue';
import type { TarotCardResult, TarotReadingResult, TarotSpreadType } from '../lib/tarot';

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
}>();

const spreadLayouts: Record<TarotSpreadType, SpreadPose[]> = {
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

const denseSpread = computed(() => props.reading.cards.length >= 7);

function cardSymbol(card: TarotCardResult) {
  if (card.name.includes('权杖')) return '火';
  if (card.name.includes('圣杯')) return '水';
  if (card.name.includes('宝剑')) return '风';
  if (card.name.includes('钱币')) return '土';
  return '✦';
}

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
      :class="[`spread-${reading.spreadType}`, { 'is-dense': denseSpread }]"
      :aria-label="`${reading.spreadName}牌阵`"
    >
      <article
        v-for="(card, index) in reading.cards"
        :key="`${card.id}-${index}`"
        class="tarot-result-item"
        :style="spreadCardStyle(index)"
        :aria-label="`${card.position}，${card.name}，${card.reversed ? '逆位' : '正位'}`"
      >
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
</template>

<style scoped>
.tarot-spread-frame { --spread-card-scale: .74; min-width: 0; overflow: hidden; padding: 6px 2px 12px; width: 100%; }
.tarot-spread-board { background: color-mix(in srgb, var(--ds-surface-muted) 88%, var(--ds-accent-soft)); border: 1px solid var(--ds-line); border-radius: var(--ds-radius-lg); height: min(620px, 66dvh); margin-inline: auto; overflow: hidden; position: relative; width: 100%; }
.tarot-spread-board::before { border: 1px solid color-mix(in srgb, var(--ds-accent) 14%, transparent); border-radius: 50%; content: ''; height: 44%; left: 50%; position: absolute; top: 50%; transform: translate(-50%, -50%); width: 44%; }
.tarot-spread-board.spread-single, .tarot-spread-board.spread-three, .tarot-spread-board.spread-mindBodySpirit { height: min(340px, 42dvh); }
.tarot-spread-board.spread-single { width: min(100%, 520px); }
.tarot-spread-board.spread-love, .tarot-spread-board.spread-career, .tarot-spread-board.spread-decision { height: min(610px, 64dvh); }
.tarot-spread-board.spread-horseshoe { height: min(540px, 58dvh); }
.tarot-spread-board.spread-chakra { height: min(700px, 70dvh); width: min(100%, 560px); }
.tarot-spread-board.spread-celtic { height: min(680px, 70dvh); }
.tarot-spread-board.spread-year { height: min(720px, 70dvh); }
.tarot-result-item { align-items: center; display: flex; flex-direction: column; left: var(--spread-x); min-width: 0; position: absolute; text-align: center; top: var(--spread-y); transform: translate(-50%, -50%) scale(var(--spread-card-scale)); width: 124px; }
.tarot-position { align-items: center; color: var(--ds-accent-strong); display: flex; font-size: var(--ds-text-xs); gap: 5px; height: 32px; justify-content: center; line-height: 1.2; width: 150px; }
.tarot-position i { align-items: center; background: var(--ds-accent-soft); border-radius: var(--ds-radius-round); color: var(--ds-accent-strong); display: inline-flex; flex: 0 0 auto; font-size: 9px; font-style: normal; height: 18px; justify-content: center; width: 18px; }
.tarot-face { background: radial-gradient(circle at 50% 34%, rgba(253,236,184,.34), transparent 34%), linear-gradient(155deg, #805c73, #26264a 70%); border: 3px solid #d9c69b; border-radius: 8px; box-shadow: 0 11px 24px rgba(41,33,52,.2); height: 184px; overflow: hidden; position: relative; transform: rotate(var(--spread-rotation)); width: 112px; }
.tarot-face-frame { border: 1px solid rgba(246,225,171,.68); inset: 6px; position: absolute; }
.tarot-face-art { align-items: center; display: flex; flex-direction: column; inset: 11px; justify-content: center; position: absolute; transition: transform .3s; }
.tarot-face.is-reversed .tarot-face-art { transform: rotate(180deg); }
.tarot-face-art small { color: #f1ddb0; font-size: 10px; left: 3px; position: absolute; top: 1px; }
.tarot-face-art b { align-items: center; border: 1px solid rgba(244,224,171,.7); border-radius: 50%; color: #f6e3b5; display: flex; font-family: 'Noto Serif SC', serif; font-size: 32px; font-weight: 500; height: 67px; justify-content: center; text-shadow: 0 0 18px rgba(255,225,153,.35); width: 67px; }
.tarot-face-art i { color: #ead096; font-size: 13px; font-style: normal; margin-top: 10px; }
.tarot-result-item > strong { color: var(--ds-text-primary); font-size: var(--ds-text-sm); margin-top: 9px; }
.tarot-orientation { background: var(--ds-success-soft); border-radius: var(--ds-radius-round); color: var(--ds-success); font-size: 10px; margin-top: 5px; padding: 2px 7px; }
.tarot-orientation.reversed { background: var(--ds-danger-soft); color: var(--ds-danger); }
.tarot-result-item p { color: var(--ds-text-tertiary); font-size: 10px; line-height: 1.45; margin: 6px 0 0; }
.tarot-spread-board.is-dense .tarot-result-item p { display: none; }
.tarot-spread-board.spread-celtic .tarot-result-item:nth-child(2) { height: 270px; }
.tarot-spread-board.spread-celtic .tarot-result-item:nth-child(2) .tarot-position { left: 50%; position: absolute; top: 254px; transform: translateX(-50%); }
.tarot-spread-board.spread-celtic .tarot-result-item:nth-child(2) > strong { margin: 0; position: absolute; top: 286px; }
.tarot-spread-board.spread-celtic .tarot-result-item:nth-child(2) > .tarot-orientation { margin: 0; position: absolute; top: 310px; }
.tarot-spread-frame.is-compact { --spread-card-scale: .58; padding-block: 0 6px; }
.tarot-spread-frame.is-compact .tarot-spread-board { height: min(390px, 44dvh); }
.tarot-spread-frame.is-compact .tarot-spread-board.spread-single,
.tarot-spread-frame.is-compact .tarot-spread-board.spread-three,
.tarot-spread-frame.is-compact .tarot-spread-board.spread-mindBodySpirit { height: min(260px, 31dvh); }
.tarot-spread-frame.is-compact .tarot-spread-board.spread-chakra,
.tarot-spread-frame.is-compact .tarot-spread-board.spread-celtic,
.tarot-spread-frame.is-compact .tarot-spread-board.spread-year { height: min(450px, 48dvh); }
.tarot-spread-frame.is-compact.spread-celtic,
.tarot-spread-frame.is-compact.spread-year { --spread-card-scale: .46; }
.tarot-spread-frame.is-immersive { padding-inline: 0; }
.tarot-spread-frame.is-immersive .tarot-spread-board { background: transparent; border: 0; border-radius: 0; }
.tarot-spread-frame.is-immersive .tarot-spread-board::before { display: none; }

@media (max-width: 720px) {
  .tarot-spread-frame { --spread-card-scale: .52; }
  .tarot-spread-board { height: min(520px, 62dvh); }
  .tarot-spread-board.spread-single,
  .tarot-spread-board.spread-three,
  .tarot-spread-board.spread-mindBodySpirit { height: min(260px, 38dvh); }
  .tarot-spread-board.spread-love,
  .tarot-spread-board.spread-career,
  .tarot-spread-board.spread-decision,
  .tarot-spread-board.spread-horseshoe { height: min(430px, 54dvh); }
  .tarot-spread-board.spread-chakra,
  .tarot-spread-board.spread-celtic,
  .tarot-spread-board.spread-year { height: min(520px, 60dvh); }
  .tarot-spread-frame.spread-celtic,
  .tarot-spread-frame.spread-year { --spread-card-scale: .38; }
  .tarot-spread-frame.is-compact { --spread-card-scale: .52; }
  .tarot-spread-frame.is-compact.spread-chakra { --spread-card-scale: .45; }
  .tarot-spread-frame.is-compact.spread-celtic,
  .tarot-spread-frame.is-compact.spread-year { --spread-card-scale: .34; }
  .tarot-spread-frame.is-compact .tarot-spread-board { height: min(310px, 35dvh); }
  .tarot-spread-frame.is-compact .tarot-spread-board.spread-single,
  .tarot-spread-frame.is-compact .tarot-spread-board.spread-three,
  .tarot-spread-frame.is-compact .tarot-spread-board.spread-mindBodySpirit { height: min(210px, 25dvh); }
  .tarot-spread-frame.is-compact .tarot-spread-board.spread-chakra,
  .tarot-spread-frame.is-compact .tarot-spread-board.spread-celtic,
  .tarot-spread-frame.is-compact .tarot-spread-board.spread-year { height: min(350px, 40dvh); }
}
</style>
