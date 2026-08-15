<script setup lang="ts">
import type { WesternCardReadingResult } from '../lib/tarot';
import { getWesternCardImageUrl } from '../lib/westernDecks';

defineProps<{
  reading: WesternCardReadingResult;
  compact?: boolean;
}>();
</script>

<template>
  <div class="western-card-board" :class="[`is-${reading.deckType}`, `spread-${reading.spreadType}`, { 'is-compact': compact }]" :style="{ '--card-count': Math.min(reading.cards.length, 9) }">
    <figure v-for="(card, index) in reading.cards" :key="`${card.position}-${card.id}`">
      <span>{{ card.position }}</span>
      <img
        :src="getWesternCardImageUrl(reading.deckType, card.id)"
        :alt="card.name"
        :loading="index < 3 ? 'eager' : 'lazy'"
        :fetchpriority="index === 0 ? 'high' : 'auto'"
        decoding="async"
      />
      <figcaption><strong>{{ card.name }}</strong><small v-if="card.subtitle">{{ card.subtitle }}</small></figcaption>
    </figure>
  </div>
</template>

<style scoped>
.western-card-board { align-items: start; display: grid; gap: clamp(12px, 2.4vw, 28px); grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); justify-content: center; margin-inline: auto; max-width: 940px; width: 100%; }
.western-card-board figure { display: grid; justify-items: center; margin: 0; min-width: 0; text-align: center; }
.western-card-board figure > span { color: var(--ds-text-tertiary); font-size: var(--ds-text-xs); margin-bottom: 7px; }
.western-card-board img { aspect-ratio: 2 / 3; border-radius: var(--ds-radius-md); box-shadow: 0 14px 32px rgba(34, 25, 48, .2); display: block; max-height: min(48dvh, 500px); object-fit: cover; width: min(100%, 260px); }
.western-card-board figcaption { display: grid; gap: 2px; margin-top: 9px; max-width: 100%; min-width: 0; width: 100%; }
.western-card-board strong { color: var(--ds-text-primary); font-size: var(--ds-text-sm); line-height: 1.35; overflow-wrap: anywhere; }
.western-card-board small { color: var(--ds-text-tertiary); font-size: var(--ds-text-xs); line-height: 1.35; overflow-wrap: anywhere; }
.western-card-board.is-lenormand:not(.is-compact) { grid-template-columns: repeat(3, minmax(0, 230px)); }
.western-card-board.spread-single { grid-template-columns: minmax(0, 260px); }
.western-card-board.spread-nine { grid-template-columns: repeat(3, minmax(0, 180px)); }
.western-card-board.spread-five { grid-template-columns: repeat(3, minmax(0, 190px)); }
.western-card-board.spread-five figure:nth-child(1) { grid-column: 2; }
.western-card-board.spread-five figure:nth-child(2) { grid-column: 1; }
.western-card-board.spread-five figure:nth-child(3) { grid-column: 2; }
.western-card-board.spread-five figure:nth-child(4) { grid-column: 3; }
.western-card-board.spread-five figure:nth-child(5) { grid-column: 2; }
.western-card-board.is-compact { grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); }
.western-card-board.is-compact img { max-height: 330px; max-width: 180px; }
@media (max-width: 720px) {
  .western-card-board, .western-card-board.is-lenormand:not(.is-compact) { gap: 9px; grid-template-columns: repeat(var(--card-count, 3), minmax(0, 1fr)); }
  .western-card-board figure > span { font-size: 9px; margin-bottom: 5px; }
  .western-card-board img { max-height: 44dvh; width: 100%; }
  .western-card-board strong { display: -webkit-box; font-size: 10px; line-clamp: 2; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
  .western-card-board small { display: -webkit-box; font-size: 9px; line-clamp: 2; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
  .western-card-board.is-shiyue-oracle.spread-single { grid-template-columns: minmax(0, 250px); }
  .western-card-board.is-lenormand.spread-five:not(.is-compact),
  .western-card-board.is-lenormand.spread-relationship:not(.is-compact),
  .western-card-board.is-lenormand.spread-decision:not(.is-compact),
  .western-card-board.is-lenormand.spread-nine:not(.is-compact) { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
</style>
