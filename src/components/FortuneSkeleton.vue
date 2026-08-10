<script setup lang="ts">
import type { FortunePeriod } from '../lib/dailyFortune';
import {
  UiReadingGrid,
  UiReadingSection,
  UiReadingWorkspace,
} from './ui';

const props = defineProps<{
  period: FortunePeriod;
}>();
</script>

<template>
  <UiReadingWorkspace
    class="fortune-reading fortune-skeleton"
    aria-busy="true"
    aria-label="正在整理运势"
  >
    <template #hero-media>
      <span class="fortune-skeleton__block fortune-skeleton__image" aria-hidden="true"></span>
    </template>

    <template #hero-context>
      <div class="fortune-skeleton__date" aria-hidden="true">
        <span class="fortune-skeleton__block is-label"></span>
        <div>
          <span class="fortune-skeleton__block is-number"></span>
          <p><span class="fortune-skeleton__block is-meta"></span><span class="fortune-skeleton__block is-meta-short"></span></p>
        </div>
      </div>
    </template>

    <template #hero-summary>
      <div class="fortune-skeleton__overview">
        <span class="fortune-skeleton__block is-kicker"></span>
        <span class="fortune-skeleton__block is-title"></span>
        <span class="fortune-skeleton__block is-copy"></span>
        <span class="fortune-skeleton__block is-copy"></span>
        <span class="fortune-skeleton__block is-copy-short"></span>
      </div>
    </template>

    <UiReadingSection v-if="props.period !== 'today'" class="fortune-skeleton__period" title="周期重点" aria-hidden="true">
      <div class="fortune-skeleton__period-list">
        <span v-for="index in 3" :key="index" class="fortune-skeleton__block"></span>
      </div>
    </UiReadingSection>

    <template v-else>
      <UiReadingSection class="fortune-skeleton__guidance-intro" title="今日宜忌" aria-hidden="true" />
      <UiReadingGrid ratio="equal" class="fortune-skeleton__guidance" aria-hidden="true">
        <UiReadingSection v-for="group in 2" :key="group" title="宜忌事项">
          <div v-for="index in 3" :key="index" class="fortune-skeleton__guidance-row">
            <span class="fortune-skeleton__block is-mark"></span>
            <div><span class="fortune-skeleton__block is-row-title"></span><span class="fortune-skeleton__block is-row-copy"></span></div>
          </div>
        </UiReadingSection>
      </UiReadingGrid>
    </template>

    <UiReadingGrid ratio="wide-left" aria-hidden="true">
      <UiReadingSection class="fortune-skeleton__duties" title="安排重点">
        <div v-for="index in 5" :key="index" class="fortune-skeleton__duty">
          <span class="fortune-skeleton__block is-dot"></span>
          <div><span class="fortune-skeleton__block is-row-title"></span><span class="fortune-skeleton__block is-row-copy"></span></div>
        </div>
      </UiReadingSection>

      <UiReadingSection v-if="props.period === 'today'" class="fortune-skeleton__times" title="可用时段">
        <span v-for="index in 4" :key="index" class="fortune-skeleton__block is-time-row"></span>
      </UiReadingSection>
    </UiReadingGrid>

  </UiReadingWorkspace>
</template>

<style scoped>
.fortune-skeleton { pointer-events: none; }
.fortune-skeleton__block {
  animation: fortune-skeleton-pulse 1.35s ease-in-out infinite;
  background: linear-gradient(100deg, var(--ds-surface-muted), color-mix(in srgb, var(--ds-accent-soft) 72%, var(--ds-surface-raised)), var(--ds-surface-muted));
  background-size: 220% 100%;
  border-radius: 6px;
  display: block;
  height: 10px;
}
.fortune-skeleton__image { aspect-ratio: 330 / 518; height: auto; width: 100%; }
.fortune-skeleton__date,
.fortune-skeleton__overview { width: 100%; }
.fortune-skeleton__date > .is-label { margin-bottom: var(--ds-space-3); width: 64px; }
.fortune-skeleton__date > div { align-items: center; display: grid; gap: var(--ds-space-4); grid-template-columns: 76px minmax(0, 1fr); }
.fortune-skeleton__date .is-number { height: 70px; }
.fortune-skeleton__date p { border-left: 1px solid var(--ds-line); display: grid; gap: var(--ds-space-2); margin: 0; padding-left: var(--ds-space-3); }
.fortune-skeleton__date .is-meta { width: 90%; }
.fortune-skeleton__date .is-meta-short { width: 64%; }
.fortune-skeleton__overview { display: grid; gap: var(--ds-space-3); }
.fortune-skeleton__overview .is-kicker { width: 58px; }
.fortune-skeleton__overview .is-title { height: 28px; width: 52%; }
.fortune-skeleton__overview .is-copy { width: 100%; }
.fortune-skeleton__overview .is-copy-short { width: 74%; }

.fortune-skeleton :deep(.ui-reading-section__heading) { visibility: hidden; }
.fortune-skeleton__period-list { display: grid; gap: var(--ds-space-4); grid-template-columns: repeat(3, minmax(0, 1fr)); }
.fortune-skeleton__period-list > span { height: 46px; }
.fortune-skeleton__guidance-row { align-items: start; display: grid; gap: var(--ds-space-3); grid-template-columns: 30px minmax(0, 1fr); padding: 12px 0; }
.fortune-skeleton__guidance-row + .fortune-skeleton__guidance-row { border-top: 1px solid var(--ds-line); }
.fortune-skeleton__guidance-row .is-mark { border-radius: 50%; height: 30px; }
.fortune-skeleton__guidance-row > div { display: grid; gap: var(--ds-space-2); }
.fortune-skeleton__guidance-row .is-row-title { width: 38%; }
.fortune-skeleton__guidance-row .is-row-copy { width: 88%; }
.fortune-skeleton__duty { align-items: start; display: grid; gap: 11px; grid-template-columns: 30px minmax(0, 1fr); padding: 12px 0; }
.fortune-skeleton__duty + .fortune-skeleton__duty { border-top: 1px solid var(--ds-line); }
.fortune-skeleton__duty .is-dot { border-radius: 50%; height: 28px; }
.fortune-skeleton__duty > div { display: grid; gap: var(--ds-space-2); }
.fortune-skeleton__duty .is-row-title { width: 34%; }
.fortune-skeleton__duty .is-row-copy { width: 88%; }
.fortune-skeleton__times .is-time-row { width: 92%; }
.fortune-skeleton__times .is-time-row + .is-time-row { margin-top: var(--ds-space-2); }
@media (max-width: 720px) {
  .fortune-skeleton__date > .is-label { margin-bottom: var(--ds-space-2); }
  .fortune-skeleton__date > div { gap: var(--ds-space-2); grid-template-columns: 58px minmax(0, 1fr); }
  .fortune-skeleton__date .is-number { height: 54px; }
  .fortune-skeleton__date p { gap: var(--ds-space-1); padding-left: var(--ds-space-2); }
  .fortune-skeleton__overview .is-title { height: 23px; width: 64%; }
  .fortune-skeleton__period-list { grid-template-columns: 1fr; }
  .fortune-skeleton__period-list > span { height: 38px; }
  .fortune-skeleton__guidance-row { gap: 10px; grid-template-columns: 28px minmax(0, 1fr); padding: 11px 0; }
  .fortune-skeleton__guidance-row .is-mark { height: 28px; }
}

@media (prefers-reduced-motion: reduce) {
  .fortune-skeleton__block { animation: none; }
}

@keyframes fortune-skeleton-pulse {
  0% { background-position: 100% 0; opacity: .68; }
  50% { opacity: 1; }
  100% { background-position: -100% 0; opacity: .68; }
}
</style>
