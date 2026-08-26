<script setup lang="ts">
import { computed } from 'vue';
import type { DailyFortuneResult } from '../lib/dailyFortune';
import type { CalendarEvent } from '../lib/calendarEvents';
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
    events: CalendarEvent[];
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

const insightRows = computed(() => props.result.evidenceInsights.map((item) => ({
  key: item.key,
  marker: item.label.slice(0, 1),
  title: item.title,
  detail: item.detail,
  tone: readingTone(item.tone),
})));

const referenceRows = computed(() => [
  {
    key: 'colors',
    marker: '色',
    title: `助运颜色：${props.result.reference.colors.map((item) => item.name).join('、')}`,
    detail: props.result.reference.colorNote,
    tone: 'accent' as const,
  },
  {
    key: 'numbers',
    marker: '数',
    title: `助运数字：${props.result.reference.numbers.join('、')}`,
    detail: props.result.reference.numberNote,
    tone: 'accent' as const,
  },
  {
    key: 'direction',
    marker: '向',
    title: props.result.reference.direction === '不固定' ? '方位不限' : `优先${props.result.reference.direction}`,
    detail: props.result.reference.directionNote,
    tone: 'accent' as const,
  },
  {
    key: 'item',
    marker: props.result.reference.itemSymbol,
    title: props.result.reference.item,
    detail: props.result.reference.itemNote,
    tone: 'accent' as const,
  },
]);

const insightTitle = computed(() => props.result.period === 'today' ? '今日判断依据' : props.result.period === 'month' ? '本月判断依据' : '全年判断依据');
const referenceTitle = computed(() => props.result.period === 'today' ? '今日助运' : props.result.period === 'month' ? '本月助运' : '今年助运');

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

const actionRows = computed(() => props.result.actionTips.map((item) => ({
  key: `${item.sourceKey}-${item.label}`,
  marker: item.tone === 'positive' ? '先' : '查',
  title: item.label,
  detail: item.text,
  tone: item.tone === 'positive' ? 'success' as const : 'caution' as const,
})));

const actionTitle = computed(() => props.result.period === 'today'
  ? (props.currentDate ? '今天先做什么' : '当天先做什么')
  : props.result.period === 'month'
    ? '本月先做什么'
    : '今年先做什么');

const trendTitle = computed(() => props.result.period === 'today'
  ? '未来7天节奏'
  : props.result.period === 'month'
    ? (props.currentDate ? '本月后续节奏' : '该月分周节奏')
    : (props.currentDate ? '今年后续节奏' : '该年逐月节奏'));

const leadKicker = computed(() => props.result.period === 'today'
  ? (props.currentDate ? '今日解读' : '当天解读')
  : props.result.period === 'month'
    ? (props.currentDate ? '本月解读' : '该月解读')
    : (props.currentDate ? '今年解读' : '该年解读'));
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
        <p v-if="calendar.events.length" class="fortune-date-events" aria-label="当天事件">
          <span v-for="event in calendar.events" :key="event.id">{{ event.label }}</span>
        </p>
      </div>
    </template>

    <template #hero-summary>
      <UiReadingLead
        :kicker="leadKicker"
        :title="result.title"
        :summary="result.summary"
      />
    </template>

    <UiReadingSection v-if="result.period !== 'today'" class="fortune-period-section" :title="result.windowTitle">
      <div class="fortune-period-list">
        <article v-for="item in result.timeWindows" :key="item.name + item.range">
          <strong>{{ item.name }}</strong><span v-if="item.range">{{ item.range }}</span><small>{{ item.coverage }}</small>
        </article>
        <p v-if="!result.timeWindows.length">没有明显集中的优先日期，把重要事项拆成可确认的小步骤，按原计划推进。</p>
      </div>
    </UiReadingSection>

    <UiReadingSection v-if="actionRows.length" class="fortune-action-section" :title="actionTitle">
      <UiReadingRows :items="actionRows" marker-style="soft" />
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
          <p v-else class="fortune-empty-copy">没有单独列出的宜项，优先处理已有计划，不必为黄历临时增加事项。</p>
        </UiReadingSection>

        <UiReadingSection kicker="慎" title="多做确认">
          <UiReadingRows v-if="cautiousRows.length" :items="cautiousRows" marker-style="soft" />
          <p v-else class="fortune-empty-copy">没有单独列出的慎项，出行、健康和合同仍按现实条件判断。</p>
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

    <UiReadingSection v-if="result.periodTrend.length" class="fortune-trend-section" :title="trendTitle">
      <div class="fortune-trend-list" :class="`is-${result.period}`">
        <article v-for="item in result.periodTrend" :key="item.dateKey" :class="`tone-${item.tone}`">
          <header><strong>{{ item.label }}</strong><small v-if="item.dateLabel">{{ item.dateLabel }}</small></header>
          <b>{{ item.status }}</b>
          <p>{{ item.focus }}</p>
        </article>
      </div>
    </UiReadingSection>

    <UiReadingGrid ratio="equal">
      <UiReadingSection :title="insightTitle">
        <UiReadingRows :items="insightRows" marker-style="soft" />
      </UiReadingSection>

      <UiReadingSection :title="referenceTitle">
        <UiReadingRows :items="referenceRows" marker-style="soft" />
      </UiReadingSection>
    </UiReadingGrid>

  </UiReadingWorkspace>
</template>

<style scoped>
.fortune-date-summary { min-width: 0; width: 100%; }
.fortune-date-summary > span { color: var(--ds-text-secondary); display: block; font-size: var(--ds-text-xs); font-weight: 600; margin-bottom: var(--ds-space-3); }
.fortune-date-main { align-items: center; display: grid; gap: var(--ds-space-4); grid-template-columns: auto minmax(0, 1fr); }
.fortune-date-main > strong {
  color: var(--ds-accent-strong);
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
.fortune-date-events { color: var(--ds-accent-strong); display: flex; flex-wrap: wrap; font-size: var(--ds-text-xs); gap: 3px 7px; line-height: 1.45; margin: var(--ds-space-3) 0 0; }
.fortune-date-events span + span::before { color: var(--ds-text-tertiary); content: '·'; margin-right: 7px; }
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

.fortune-trend-list { display: grid; }
.fortune-trend-list.is-today { grid-template-columns: repeat(7, minmax(0, 1fr)); }
.fortune-trend-list.is-month { grid-template-columns: repeat(5, minmax(0, 1fr)); }
.fortune-trend-list.is-year { grid-template-columns: repeat(6, minmax(0, 1fr)); }
.fortune-trend-list article { display: grid; gap: 5px; min-width: 0; padding: 9px 11px; }
.fortune-trend-list article + article { border-left: 1px solid var(--ds-line); }
.fortune-trend-list.is-year article:nth-child(7) { border-left: 0; }
.fortune-trend-list.is-year article:nth-child(n + 7) { border-top: 1px solid var(--ds-line); }
.fortune-trend-list header { align-items: baseline; display: flex; gap: 5px; justify-content: space-between; min-width: 0; }
.fortune-trend-list strong { color: var(--ds-text-primary); font-size: var(--ds-text-sm); }
.fortune-trend-list small { color: var(--ds-text-tertiary); font-size: var(--ds-text-xs); }
.fortune-trend-list b { color: var(--ds-text-secondary); font-size: var(--ds-text-xs); font-weight: 650; }
.fortune-trend-list .tone-favorable b { color: var(--ds-success); }
.fortune-trend-list .tone-cautious b { color: color-mix(in srgb, var(--ds-gold) 70%, var(--ds-text-primary)); }
.fortune-trend-list p { color: var(--ds-text-secondary); font-size: var(--ds-text-xs); line-height: 1.45; margin: 0; }

@media (max-width: 720px) {
  .fortune-trend-list.is-today,
  .fortune-trend-list.is-month,
  .fortune-trend-list.is-year { grid-template-columns: minmax(0, 1fr); }
  .fortune-trend-list article {
    align-items: start;
    gap: 8px;
    grid-template-columns: 58px 62px minmax(0, 1fr);
    padding: 10px 0;
  }
  .fortune-trend-list article + article { border-left: 0; border-top: 1px solid var(--ds-line); }
  .fortune-trend-list.is-year article:nth-child(7) { border-left: 0; }
  .fortune-trend-list header { align-items: flex-start; flex-direction: column; gap: 2px; }
  .fortune-trend-list b { padding-top: 1px; }
  .fortune-trend-list p { line-height: 1.55; }
}
</style>
