<script setup lang="ts">
import { computed } from 'vue';
import type { DailyFortuneResult } from '../lib/dailyFortune';
import FortuneStatusImage from './FortuneStatusImage.vue';
import {
  UiReadingGrid,
  UiReadingLead,
  UiReadingRows,
  UiReadingSection,
  UiReadingWorkspace,
} from './ui';

const props = defineProps<{
  result: DailyFortuneResult;
  calendar: {
    heroLabel: string;
    heroValue: string;
    lunar: string;
    periodRange: string;
  };
  currentDate: boolean;
}>();

const arrangementTitle = computed(() => (
  props.result.period === 'today'
    ? (props.currentDate ? '今天怎么安排' : '当天怎么安排')
    : props.result.period === 'month'
      ? '本月重点'
      : '今年主线'
));

function readingTone(tone: string) {
  if (tone === 'favorable') return 'success' as const;
  if (tone === 'cautious') return 'caution' as const;
  return 'neutral' as const;
}

const categoryRows = computed(() => props.result.categories.map((item) => ({
  key: item.key,
  marker: item.icon,
  title: item.label,
  badge: item.status,
  detail: item.detail,
  note: item.basis || undefined,
  tone: readingTone(item.tone),
})));

const timeRows = computed(() => props.result.timeWindows.map((item) => ({
  key: item.name + item.range,
  marker: item.name.slice(0, 1),
  title: `${item.name} ${item.range}`.trim(),
  detail: item.coverage,
  tone: 'accent' as const,
})));

const recommendedRows = computed(() => (props.result.modernAlmanac?.recommended || []).map((item) => ({
  key: item.key,
  marker: item.title.slice(0, 1),
  title: item.title,
  detail: item.detail,
  tone: 'success' as const,
})));

const cautiousRows = computed(() => (props.result.modernAlmanac?.cautious || []).map((item) => ({
  key: item.key,
  marker: item.title.slice(0, 1),
  title: item.title,
  detail: item.detail,
  tone: 'caution' as const,
})));
</script>

<template>
  <UiReadingWorkspace
    class="fortune-reading"
  >
    <template #hero-media>
      <FortuneStatusImage :status="result.grade" />
    </template>

    <template #hero-context>
      <div class="fortune-date-summary">
        <span>{{ calendar.heroLabel }}</span>
        <div class="fortune-date-main">
          <strong :class="{ 'is-long': String(calendar.heroValue).length > 2 }">{{ calendar.heroValue }}</strong>
          <div>
            <template v-if="result.period === 'today'">
              <p><small>农历</small><b>{{ calendar.lunar }}</b></p>
              <p><small v-if="result.jieqi">{{ result.jieqi }}</small><small>{{ result.weekday }}</small></p>
            </template>
            <p v-else><small>公历范围</small><b>{{ calendar.periodRange }}</b></p>
          </div>
        </div>
      </div>
    </template>

    <template #hero-summary>
      <UiReadingLead
        :kicker="currentDate ? '今日解读' : '当天解读'"
        :title="result.title"
        :summary="result.summary"
      />
    </template>

    <UiReadingSection v-if="result.period !== 'today'" class="fortune-period-section" :title="result.windowTitle">
      <div class="fortune-period-list">
        <article v-for="item in result.timeWindows" :key="item.name + item.range">
          <strong>{{ item.name }}</strong><span v-if="item.range">{{ item.range }}</span><small>{{ item.coverage }}</small>
        </article>
        <p v-if="!result.timeWindows.length">没有需要特别优先的日期，按正常计划推进即可。</p>
      </div>
    </UiReadingSection>

    <template v-if="result.modernAlmanac">
      <UiReadingSection
        class="fortune-guidance-intro"
        :kicker="currentDate ? '今日宜忌' : '当天宜忌'"
        :title="result.modernAlmanac.rhythm.title"
        :description="result.modernAlmanac.rhythm.detail"
      />

      <UiReadingGrid ratio="equal" class="fortune-guidance-grid">
        <UiReadingSection kicker="宜" title="可以安排">
          <UiReadingRows v-if="recommendedRows.length" :items="recommendedRows" marker-style="soft" />
          <p v-else class="fortune-empty-copy">没有单独列出的宜项，按平常计划即可。</p>
        </UiReadingSection>

        <UiReadingSection kicker="慎" title="多做确认">
          <UiReadingRows v-if="cautiousRows.length" :items="cautiousRows" marker-style="soft" />
          <p v-else class="fortune-empty-copy">没有单独列出的慎项，照常核对重要细节即可。</p>
        </UiReadingSection>
      </UiReadingGrid>
    </template>

    <UiReadingGrid ratio="wide-left">
      <UiReadingSection class="fortune-arrangement-section" :title="arrangementTitle">
        <UiReadingRows :items="categoryRows" marker-style="soft" />
      </UiReadingSection>

      <UiReadingSection v-if="result.period === 'today'" as="aside" class="fortune-time-section" :title="result.windowTitle">
        <UiReadingRows v-if="result.timeWindows.length" :items="timeRows" />
        <p v-else class="fortune-empty-copy">按自己的作息安排即可。</p>
      </UiReadingSection>
    </UiReadingGrid>

  </UiReadingWorkspace>
</template>

<style scoped>
.fortune-date-summary { min-width: 0; width: 100%; }
.fortune-date-summary > span { color: var(--ds-text-secondary); display: block; font-size: var(--ds-text-xs); font-weight: 600; margin-bottom: var(--ds-space-3); }
.fortune-date-main { align-items: center; display: grid; gap: var(--ds-space-4); grid-template-columns: auto minmax(0, 1fr); }
.fortune-date-main > strong {
  color: var(--ds-accent);
  font-family: 'Arial Narrow', 'DIN Alternate', 'Segoe UI', sans-serif;
  font-size: 76px;
  font-variant-numeric: tabular-nums;
  font-weight: 800;
  letter-spacing: -.06em;
  line-height: .85;
}
.fortune-date-main > strong.is-long { font-size: 38px; letter-spacing: -.03em; line-height: 1; }
.fortune-date-main > div { border-left: 1px solid var(--ds-line); display: grid; gap: var(--ds-space-2); min-width: 0; padding-left: var(--ds-space-3); }
.fortune-date-main p { display: grid; gap: 2px; margin: 0; }
.fortune-date-main small { color: var(--ds-text-secondary); font-size: var(--ds-text-xs); line-height: 1.4; }
.fortune-date-main b { color: var(--ds-text-primary); font-size: var(--ds-text-sm); line-height: 1.4; overflow-wrap: anywhere; }
.fortune-period-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.fortune-period-list article { display: grid; gap: 4px; padding: 10px 14px; }
.fortune-period-list article + article { border-left: 1px solid var(--ds-line); }
.fortune-period-list strong { color: var(--ds-text-primary); font-size: 13px; }
.fortune-period-list span,
.fortune-period-list small { color: var(--ds-text-secondary); font-size: var(--ds-text-xs); }

.fortune-empty-copy { color: var(--ds-text-secondary); font-size: var(--ds-text-sm); line-height: 1.6; margin: 0; }

@media (max-width: 720px) {
  .fortune-date-summary > span { margin-bottom: 8px; }
  .fortune-date-main { gap: 8px; }
  .fortune-date-main > strong { font-size: 58px; }
  .fortune-date-main > strong.is-long { font-size: 25px; }
  .fortune-date-main > div { gap: 4px; padding-left: 8px; }
  .fortune-period-list { grid-template-columns: 1fr; }
  .fortune-period-list article { grid-template-columns: auto auto minmax(0, 1fr); padding: 9px 0; }
  .fortune-period-list article + article { border-left: 0; border-top: 1px solid var(--ds-line); }
  .fortune-period-list small { text-align: right; }
}
</style>
